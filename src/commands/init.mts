/** init —— 在当前目录立项：local 部署项目专属 ComfyUI，remote 绑定外部服务。
 *  规则：
 *  - 必须显式 --mode=local|remote；
 *  - 不接收项目名；无 project.json 时用目录名创建 v2 骨架，已有则只更新本机配置；
 *  - 默认维护 .gitignore 受管块并 git init（--no-git 跳过仓库初始化）；
 *  - local 可选 --modelpath（外部模型根目录），只部署不启动；
 *  - remote 必须 --url；
 *  - 默认生成 .agents/skills/daoyan/ 与 AGENTS.md 管理块，--no-skill 跳过；
 *  - local 部署期间持有 machine lock，避免改动正在使用的引擎。 */
import { basename, isAbsolute, join, resolve } from "node:path";
import { existsSync, statSync } from "node:fs";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { isHttpUrl } from "../shared/fs.mts";
import {
    defaultMachineId,
    findProject,
    loadMachineIfExists,
    readProjectAt,
    saveMachine,
} from "../core/project/config.mts";
import type { MachineConfig, MachineLocalEngine, ProductionMode, ProjectConfig } from "../core/project/types.mts";
import { storyEnabled } from "../core/story/paths.mts";
import {
    allocatePort,
    assertLocalPrereqs,
    deployLocalEngine,
    latestComfyTag,
    scaffoldProject,
    writeExtraModelPaths,
    type ToolchainSummary,
} from "../core/provision/init-flow.mts";
import {
    ensureGitignore,
    ensureGitRepo,
    type GitRepoResult,
    type GitignoreResult,
    type GitignoreStatus,
} from "../core/project/git.mts";
import {
    applyToolchainFlag,
    hasToolchainOptions,
    resolveToolchainOptions,
    type ToolchainOptions,
} from "../core/provision/options.mts";
import { acquireMachineLock, type AcquiredLock } from "../core/machine/lock.mts";
import { VERSION } from "../shared/version.mts";
import { writeSkill } from "../core/agent/skill.mts";

/**
 * init 解析出的参数。
 */
interface InitFlags {
    /**
     * --mode（必填）。
     */
    mode?: "local" | "remote";
    /**
     * local：外部模型根目录。
     */
    modelpath?: string;
    /**
     * remote：引擎 URL。
     */
    url?: string;
    /**
     * local：ComfyUI 版本 tag。
     */
    version?: string;
    /**
     * local：pip / torch 工具链参数。
     */
    toolchain: ToolchainOptions;
    /**
     * --no-skill：不生成项目内 Skill / AGENTS.md。
     */
    noSkill: boolean;
    /**
     * --no-git：不初始化 Git 仓库（.gitignore 仍维护）。
     */
    noGit: boolean;
    /**
     * --production：single（默认）/ series。
     */
    production: ProductionMode;
}

/**
 * 解析 init 参数（不接受位置参数）。
 */
function parseArgs(args: string[]): InitFlags {
    // 解析结果
    const flags: InitFlags = { noSkill: false, noGit: false, toolchain: {}, production: "single" };
    for (let i = 0; i < args.length; i++) {
        // 当前参数
        const a = args[i];
        if (a === undefined) break;
        // 内联 flag
        const { name, inline } = splitInlineFlag(a);
        if (name === "--no-skill") {
            flags.noSkill = true;
            continue;
        }
        if (name === "--no-git") {
            flags.noGit = true;
            continue;
        }
        if (name === "--production") {
            // 生产模式取值
            const { value, skip } = takeValue(args, i, inline, "--production");
            if (value !== "single" && value !== "series") {
                usageError(`--production 仅接受 single / series（收到 ${value}）`);
            }
            flags.production = value;
            i += skip;
            continue;
        }
        if (name === "--mode") {
            // 模式取值
            const { value, skip } = takeValue(args, i, inline, "--mode");
            if (value !== "local" && value !== "remote") {
                usageError(`--mode 仅接受 local / remote（收到 ${value}）`);
            }
            flags.mode = value;
            i += skip;
            continue;
        }
        if (name === "--modelpath") {
            const { value, skip } = takeValue(args, i, inline, "--modelpath");
            flags.modelpath = value;
            i += skip;
            continue;
        }
        if (name === "--url") {
            const { value, skip } = takeValue(args, i, inline, "--url");
            flags.url = value;
            i += skip;
            continue;
        }
        if (name === "--version") {
            const { value, skip } = takeValue(args, i, inline, "--version");
            flags.version = value;
            i += skip;
            continue;
        }
        // 工具链参数（--mirror / --fallback-mirror / --torch-index / --torch-cuda / --torch-cpu / --no-cache）
        const toolchainFlag = applyToolchainFlag(flags.toolchain, name, args, i, inline);
        if (toolchainFlag.handled) {
            i += toolchainFlag.skip;
            continue;
        }
        if (name.startsWith("-")) usageError(`未知参数 ${name}`);
        usageError(`init 不接收位置参数（收到 ${name}）；请在目标目录内直接运行 daoyan init --mode=...`);
    }
    // 必填模式
    if (flags.mode === undefined) {
        usageError("init 必须显式指定 --mode=local|remote");
    }
    // 参数与模式匹配
    if (flags.mode === "local") {
        if (flags.url !== undefined) usageError("local 模式不接受 --url（远端连接请用 --mode=remote）");
        // 在创建任何项目文件前校验依赖参数（非法 URL / tag 立即失败）
        resolveToolchainOptions(flags.toolchain);
    } else {
        if (flags.url === undefined || flags.url === "") usageError("remote 模式必须提供 --url <http(s)://...>");
        if (flags.modelpath !== undefined) usageError("remote 模式不接受 --modelpath（模型由远端管理）");
        if (flags.version !== undefined) usageError("remote 模式不接受 --version（远端引擎版本由外部管理）");
        if (hasToolchainOptions(flags.toolchain)) {
            usageError("remote 模式不接受依赖安装参数（不部署引擎）");
        }
    }
    return flags;
}

/**
 * 解析模型目录为绝对路径并校验存在。
 */
function resolveModelPath(raw: string): string {
    // 绝对路径
    const abs = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `--modelpath 必须是已存在的目录（收到 ${raw}）`,
        });
    }
    return abs;
}

/**
 * Git 层的人类可读状态。
 */
function gitLogLine(git: GitRepoResult, ignore: GitignoreStatus): string {
    // .gitignore 状态文案
    const ignoreText = ignore === "created" ? "已生成" : ignore === "updated" ? "已更新" : "无变化";
    switch (git.status) {
        case "initialized":
            return `Git 仓库已初始化（${git.branch ?? "unknown"}），.gitignore ${ignoreText}`;
        case "existing":
            return `已在 Git 仓库内（${git.branch ?? "detached HEAD"}），.gitignore ${ignoreText}`;
        case "inside_parent":
            return `位于父级 Git 仓库（${git.top_level ?? "unknown"}），跳过嵌套初始化；.gitignore ${ignoreText}`;
        case "skipped":
            return `${git.reason ?? "跳过 Git 初始化"}；.gitignore ${ignoreText}`;
        case "disabled":
            return `--no-git：跳过 Git 仓库初始化；.gitignore ${ignoreText}`;
    }
}

/**
 * init 命令入口。
 */
export async function runInit(ctx: CliContext, args: string[]): Promise<void> {
    // 解析参数
    const flags = parseArgs(args);
    // 当前目录（init 不接收项目名）
    const root = process.cwd();
    // 是否位于已有项目的子目录（避免误建嵌套项目）
    const parent = findProject(root);
    if (parent !== null && resolve(parent.root) !== resolve(root)) {
        throw new DaoyanCliError({
            code: "usage",
            message: `当前目录位于已有项目内：${parent.root}。请在项目根运行 init，或换一个空目录`,
            exit: 2,
        });
    }
    // local 依赖前置检查（git/python/ensurepip，任何文件落盘前）
    if (flags.mode === "local") {
        await assertLocalPrereqs(say);
    }
    // 是否已有项目
    const existingProject = readProjectAt(root);
    // 项目配置
    let project: ProjectConfig;
    // 是否创建新项目
    let projectCreated = false;
    if (existingProject === null) {
        say(`在 ${root} 创建新项目（v2 story 骨架，${flags.production}）`);
        // 目录名作为项目名
        scaffoldProject(root, basename(root), flags.production);
        project = readProjectAt(root) as ProjectConfig;
        projectCreated = true;
    } else {
        if (!storyEnabled(root)) {
            throw new DaoyanCliError({
                code: "story_not_found",
                message: "旧项目结构不再支持（缺少 story/series.json）",
                hint: "请在一个新目录重新执行 daoyan init --mode=local|remote。",
            });
        }
        project = existingProject;
        say(`复用已有 project.json（不覆盖共享文件）：${root}`);
    }

    // .gitignore 受管块（--no-git 也维护）
    const gitignore: GitignoreResult = ensureGitignore(root);
    // Git 仓库状态
    let git: GitRepoResult;
    if (flags.noGit) {
        git = { status: "disabled", branch: null, top_level: null, reason: "--no-git" };
    } else {
        git = await ensureGitRepo(root);
    }
    say(gitLogLine(git, gitignore.status));

    // 已有机器配置（保留 machine_id / overrides）
    const previous = loadMachineIfExists(root);
    // 机器标签
    const machineId = previous?.machine_id ?? defaultMachineId();
    // 锁句柄（local 部署期间）
    let lock: AcquiredLock | null = null;
    // 部署结果
    let installed = false;
    // 实际 ComfyUI 版本
    let comfyVersion: string | null = null;
    // 本机端口（remote 为 null）
    let port: number | null = null;
    // 工具链摘要（remote / 复用自定义引擎时为 null）
    let toolchain: ToolchainSummary | null = null;

    try {
        if (flags.mode === "local") {
            // 部署期间禁止其他 generation task（避免改动正在使用的引擎）
            lock = await acquireMachineLock({
                taskId: `metadata-init-${process.pid}`,
                project: root,
                mode: "local",
                command: "init --mode=local",
                kind: "metadata",
            });
            // 上一份 local 配置（保留模型路径/目录/启动参数）
            const prevLocal = previous?.engine.mode === "local" ? previous.engine : null;
            // 模型目录：显式参数优先，否则保留上次配置
            const modelpath = flags.modelpath !== undefined ? resolveModelPath(flags.modelpath) : prevLocal?.modelpath;
            // 目标版本：显式 --version > project pin > GitHub 最新
            const version = flags.version ?? project.comfyui?.version ?? (await latestComfyTag());
            // 将 pin 写回 project.json（新项目或显式版本）
            if (projectCreated || flags.version !== undefined) {
                project = {
                    ...project,
                    comfyui: { ...(project.comfyui ?? {}), version },
                };
                const { writeJsonAtomic } = await import("../shared/fs.mts");
                writeJsonAtomic(resolve(root, "project.json"), project);
            }
            // 已通过 engine use 选定其他引擎目录时，re-init 不重复部署默认引擎
            const prevComfyAbs =
                prevLocal?.comfyui_dir !== undefined
                    ? isAbsolute(prevLocal.comfyui_dir)
                        ? prevLocal.comfyui_dir
                        : resolve(root, prevLocal.comfyui_dir)
                    : null;
            const reuseCustomEngine =
                flags.version === undefined &&
                prevLocal?.comfyui_dir !== undefined &&
                prevLocal.comfyui_dir !== "engine/ComfyUI" &&
                prevComfyAbs !== null &&
                existsSync(join(prevComfyAbs, "main.py"));
            if (reuseCustomEngine) {
                say(`复用 engine use 选定的引擎目录：${prevLocal?.comfyui_dir}`);
                comfyVersion = prevLocal?.comfyui_version ?? version;
            } else {
                // 部署（幂等）
                say(`部署项目专属 ComfyUI ${version} ...`);
                const deployed = await deployLocalEngine({
                    root,
                    project,
                    version,
                    toolchain: flags.toolchain,
                    log: say,
                });
                installed = deployed.installed;
                comfyVersion = version;
                toolchain = deployed.toolchain;
            }
            // 端口
            port = await allocatePort(prevLocal?.port);
            // extra_model_paths
            const modelsConfig = writeExtraModelPaths(root, modelpath);
            if (modelsConfig !== null) say(`外部模型目录：${modelpath}（${modelsConfig}）`);
            // 本机配置（尽量保留已有选择）
            const engine: MachineLocalEngine = {
                mode: "local",
                ...(modelpath !== undefined ? { modelpath } : {}),
                models_config: flags.modelpath !== undefined ? null : (prevLocal?.models_config ?? null),
                port,
                launch_extra: prevLocal?.launch_extra ?? [],
                comfyui_version: flags.version ?? prevLocal?.comfyui_version ?? version,
                comfyui_dir:
                    flags.version !== undefined ? "engine/ComfyUI" : (prevLocal?.comfyui_dir ?? "engine/ComfyUI"),
                venv_dir: flags.version !== undefined ? "engine/.venv" : (prevLocal?.venv_dir ?? "engine/.venv"),
            };
            const machine: MachineConfig = {
                machine_id: machineId,
                engine,
                ...(previous?.overrides !== undefined ? { overrides: previous.overrides } : {}),
            };
            saveMachine(root, machine);
            say(`本机配置已写入 .dycli/machine.json（port ${port}）`);
        } else {
            // remote 模式
            const url = flags.url as string;
            if (!isHttpUrl(url)) usageError(`--url 必须是 http(s) URL（收到 ${url}）`);
            const machine: MachineConfig = {
                machine_id: machineId,
                engine: {
                    mode: "remote",
                    url,
                    free_after_task:
                        previous?.engine.mode === "remote"
                            ? (previous.engine.free_after_task ?? "when_idle")
                            : "when_idle",
                },
                ...(previous?.overrides !== undefined ? { overrides: previous.overrides } : {}),
            };
            saveMachine(root, machine);
            say(`remote 模式：${url}（不部署、不启动远端引擎）`);
        }
    } finally {
        lock?.release();
    }

    // 项目内 Agent Skill（默认生成）
    let skill: { dir: string; hash: string; files: number } | null = null;
    if (!flags.noSkill) {
        // 动态导入 registry，避免静态循环依赖
        const { COMMANDS } = await import("./registry.mts");
        skill = writeSkill(root, VERSION, COMMANDS);
        say(`Agent Skill 已生成：.agents/skills/daoyan/（${skill.files} 个文件），并更新 AGENTS.md`);
    }

    // 输出
    const data = {
        root,
        mode: flags.mode,
        project_created: projectCreated,
        production: {
            mode: project.production?.mode ?? flags.production,
            audio: project.production?.audio ?? true,
        },
        git: {
            repo: git.status,
            branch: git.branch,
            top_level: git.top_level,
            gitignore: gitignore.status,
        },
        engine_installed: installed,
        comfyui_version: comfyVersion,
        toolchain,
        port,
        url: flags.mode === "remote" ? (flags.url ?? null) : null,
        modelpath: flags.mode === "local" ? (flags.modelpath ?? null) : null,
        skill: skill === null ? null : { path: ".agents/skills/daoyan/", files: skill.files, hash: skill.hash },
        next_actions:
            flags.mode === "local"
                ? [
                      "workflow nodes --refresh --json",
                      "workflow import <api.json> --name t2v",
                      "workflow validate t2v --json",
                      "run t2v --json",
                  ]
                : ["workflow nodes --refresh --json", "run <workflow> --json"],
    };
    if (ctx.json) {
        emitData(data);
        return;
    }
    say("下一步：");
    say("  1. daoyan workflow nodes --refresh（拉取节点目录）");
    say("  2. daoyan workflow import <ComfyUI API JSON> --name t2v");
    say("  3. daoyan workflow validate t2v");
    say("  4. daoyan run t2v --label shot:01 --json");
}
