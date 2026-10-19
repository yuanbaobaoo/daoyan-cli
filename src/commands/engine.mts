/** engine —— ComfyUI 版本管理（local 模式）：
 *  ls 列当前安装 / engine/versions 与 GitHub tags；install <tag> 安装到版本目录；
 *  use <tag|路径> 切换本机 machine.json 的 comfyui_dir / venv_dir。
 *  不启动引擎；install/use 会持有 machine lock，避免改动正在使用的引擎。 */
import { existsSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import {
    loadMachine,
    loadMachineIfExists,
    projectFromContext,
    requireProject,
    saveMachine,
} from "../core/project/config.mts";
import type { MachineLocalEngine } from "../core/project/types.mts";
import { COMFY_TAGS_API, installEngineAt } from "../core/provision/init-flow.mts";
import { acquireMachineLock } from "../core/machine/lock.mts";

/**
 * 查询 GitHub 最新 tags（失败返回空）。
 */
async function comfyTags(limit: number): Promise<string[]> {
    try {
        const res = await fetch(COMFY_TAGS_API, {
            headers: { "user-agent": "daoyan-cli-engine", accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return [];
        const tags = (await res.json()) as Array<{ name?: string }>;
        return tags
            .map((t) => t.name ?? "")
            .filter((n) => /^v?\d+\.\d+/.test(n))
            .slice(0, limit);
    } catch {
        return [];
    }
}

/**
 * 列出本地版本目录（engine/versions/*）。
 */
function localVersions(root: string): string[] {
    const dir = join(root, "engine", "versions");
    try {
        return readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort();
    } catch {
        return [];
    }
}

/**
 * 当前引擎目录（相对/绝对）。
 */
function currentDirs(root: string, engine: MachineLocalEngine): { comfyDir: string; venvDir: string } {
    const anchor = (p: string | undefined, fallback: string): string => {
        if (p === undefined || p === "") return join(root, fallback);
        return isAbsolute(p) ? p : join(root, p);
    };
    return {
        comfyDir: anchor(engine.comfyui_dir, join("engine", "ComfyUI")),
        venvDir: anchor(engine.venv_dir, join("engine", ".venv")),
    };
}

/**
 * 路径在项目内时存相对路径，否则存绝对路径。
 */
function portablePath(root: string, abs: string): string {
    const rel = relative(root, abs);
    return rel === "" || rel.startsWith("..") || isAbsolute(rel) ? abs : rel.split("\\").join("/");
}

/**
 * engine 命令入口。
 */
export async function runEngine(ctx: CliContext, args: string[]): Promise<number> {
    const sub = args[0];
    if (sub === undefined) {
        throw new DaoyanCliError({
            code: "usage",
            message: "用法：daoyan engine <ls|install|use> ...",
            exit: 2,
        });
    }
    const rest = args.slice(1);

    if (sub === "ls") {
        const remote = await comfyTags(15);
        const found = projectFromContext(ctx);
        let local: string[] = [];
        let current: Record<string, unknown> | null = null;
        if (found !== null) {
            local = localVersions(found.root);
            // 本机配置（可能缺失）
            const machine = loadMachineIfExists(found.root);
            if (machine !== null && machine.engine.mode === "local") {
                const dirs = currentDirs(found.root, machine.engine);
                current = {
                    mode: "local",
                    comfyui_dir: portablePath(found.root, dirs.comfyDir),
                    venv_dir: portablePath(found.root, dirs.venvDir),
                    installed: existsSync(join(dirs.comfyDir, "main.py")),
                    version: machine.engine.comfyui_version ?? found.config.comfyui?.version ?? null,
                };
            } else if (machine !== null && machine.engine.mode === "remote") {
                current = { mode: "remote", url: machine.engine.url };
            }
        }
        if (ctx.json) {
            emitData({ local, remote, current });
            return 0;
        }
        say("本地版本（engine/versions/）：");
        for (const v of local) say(`  ${v}`);
        if (local.length === 0) say("  （无）");
        if (current !== null) {
            if (current.mode === "local") {
                say(`当前引擎：${String(current.comfyui_dir)}${current.installed === true ? "" : "（未安装）"}`);
                say(`版本：${String(current.version ?? "unknown")}`);
            } else {
                say(`当前模式：remote（${String(current.url)}）`);
            }
        }
        say("GitHub 可用版本（前 15）：");
        for (const v of remote) say(`  ${v}`);
        if (remote.length === 0) say("  （GitHub 不可达，仅显示本地）");
        return 0;
    }

    // install / use 需要项目与 local 模式
    const { root, config: project } = requireProject(ctx);
    const machine = loadMachine(root);
    if (machine.engine.mode !== "local") {
        throw new DaoyanCliError({
            code: "usage",
            message: "remote 模式不管理引擎安装/切换（engine.mode=remote）",
            exit: 2,
        });
    }

    if (sub === "install") {
        // 版本 tag + 可选 pip 源
        let tag: string | undefined;
        let mirror: string | undefined;
        for (let i = 0; i < rest.length; i++) {
            const a = rest[i];
            if (a === undefined) break;
            const { name, inline } = splitInlineFlag(a);
            if (name === "--mirror") {
                const v = takeValue(rest, i, inline, "--mirror");
                mirror = v.value;
                i += v.skip;
                continue;
            }
            if (name.startsWith("-")) usageError(`未知参数 ${name}`);
            if (tag !== undefined) usageError(`engine install 只接受一个版本 tag（多余：${a}）`);
            tag = a;
        }
        if (tag === undefined || tag === "") {
            usageError("用法：daoyan engine install <版本 tag> [--mirror <url>]");
        }
        // 持锁安装
        const lock = await acquireMachineLock({
            taskId: `metadata-engine-install-${process.pid}`,
            project: root,
            mode: "local",
            command: `engine install ${tag}`,
            kind: "metadata",
        });
        try {
            const base = join(root, "engine", "versions", tag);
            // 已安装则直接返回
            if (existsSync(join(base, "ComfyUI", "main.py")) && existsSync(join(base, ".venv", "bin", "python"))) {
                say(`版本 ${tag} 已安装：${portablePath(root, base)}`);
            } else {
                say(`安装 ComfyUI ${tag} → engine/versions/${tag} ...`);
                await installEngineAt({
                    root,
                    baseDir: base,
                    version: tag,
                    project,
                    log: say,
                    ...(mirror !== undefined ? { mirror } : {}),
                });
            }
            if (ctx.json) {
                emitData({
                    installed: tag,
                    dir: portablePath(root, base),
                    next_actions: [`engine use ${tag}`],
                });
                return 0;
            }
            say(`切换：daoyan engine use ${tag}`);
            return 0;
        } finally {
            lock.release();
        }
    }

    if (sub === "use") {
        const target = rest[0];
        if (target === undefined || target === "") usageError("用法：daoyan engine use <版本 tag|路径>");
        // 持锁切换
        const lock = await acquireMachineLock({
            taskId: `metadata-engine-use-${process.pid}`,
            project: root,
            mode: "local",
            command: `engine use ${target}`,
            kind: "metadata",
        });
        try {
            // 解析目标目录
            const asPath = resolve(root, target);
            let comfyDir: string;
            let venvDir: string;
            let version: string | undefined;
            if (existsSync(join(asPath, "main.py"))) {
                comfyDir = asPath;
                venvDir = join(asPath, ".venv");
                if (!existsSync(join(venvDir, "bin", "python"))) {
                    throw new DaoyanCliError({
                        code: "config_invalid",
                        message: `路径下缺少 venv：${join(venvDir, "bin", "python")}`,
                    });
                }
            } else {
                const base = join(root, "engine", "versions", target);
                comfyDir = join(base, "ComfyUI");
                venvDir = join(base, ".venv");
                if (!existsSync(join(comfyDir, "main.py"))) {
                    throw new DaoyanCliError({
                        code: "provision_failed",
                        message: `未找到版本 ${target}（${portablePath(root, comfyDir)}）。先安装：daoyan engine install ${target}`,
                    });
                }
                if (!existsSync(join(venvDir, "bin", "python"))) {
                    throw new DaoyanCliError({
                        code: "provision_failed",
                        message: `版本 ${target} 缺少 venv：${portablePath(root, venvDir)}`,
                    });
                }
                version = target;
            }
            // 更新本机配置
            const engine: MachineLocalEngine = {
                ...machine.engine,
                comfyui_dir: portablePath(root, comfyDir),
                venv_dir: portablePath(root, venvDir),
                ...(version !== undefined ? { comfyui_version: version } : {}),
            };
            saveMachine(root, { ...machine, engine });
            if (ctx.json) {
                emitData({
                    mode: "local",
                    comfyui_dir: engine.comfyui_dir,
                    venv_dir: engine.venv_dir,
                    version: engine.comfyui_version ?? null,
                });
                return 0;
            }
            say(`已切换引擎：${String(engine.comfyui_dir)}（venv ${String(engine.venv_dir)}）`);
            return 0;
        } finally {
            lock.release();
        }
    }

    throw new DaoyanCliError({
        code: "usage",
        message: `未知子命令 ${sub}（可用：ls / install / use）`,
        exit: 2,
    });
}
