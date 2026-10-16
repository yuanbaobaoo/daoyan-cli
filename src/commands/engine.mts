/** engine —— ComfyUI 外部组件的版本管理（local 模式）：
 *  ls 列本地 engine/versions/* 与 GitHub tags；install <tag> 克隆+建 venv+装依赖；use 切换。 */
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { projectFromContext, saveProjectConfig } from "../core/project/config.mts";
import { cloneComfyUI, createVenv, pipInstall } from "../core/provision/init-flow.mts";

async function comfyTags(limit: number): Promise<string[]> {
  try {
    const res = await fetch("https://api.github.com/repos/comfyanonymous/ComfyUI/tags", {
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

export async function runEngine(ctx: CliContext, args: string[]): Promise<void> {
  const sub = args[0];
  if (sub === undefined) {
    throw new DaoyanCliError({ code: "usage", message: "用法：daoyan-cli engine <ls|install|use> ...", exit: 2 });
  }
  const rest = args.slice(1);

  if (sub === "ls") {
    const remote = await comfyTags(15);
    let local: string[] = [];
    let current = "";
    const found = projectFromContext(ctx);
    if (found !== null) {
      local = localVersions(found.root);
      current = found.config.engine.mode === "local" ? found.config.engine.version ?? "" : "(remote 模式)";
    }
    if (ctx.json) {
      emitData({ local, remote, current });
      return;
    }
    say("本地已安装（engine/versions/）：");
    for (const v of local) say(`  ${v}${v === current ? "  ← 当前" : ""}`);
    if (local.length === 0) say("  （无）");
    say("GitHub 可用版本（前 15）：");
    for (const v of remote) say(`  ${v}`);
    if (remote.length === 0) say("  （GitHub 不可达，仅显示本地）");
    return;
  }

  // install / use 需要项目
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "engine install/use 需在项目内运行（未找到 project.json）" });
  }
  const { root, config: cfg } = found;

  if (sub === "install") {
    const tag = rest[0];
    if (tag === undefined || tag === "") {
      throw new DaoyanCliError({ code: "usage", message: "用法：daoyan-cli engine install <版本 tag>", exit: 2 });
    }
    if (cfg.engine.mode !== "local") {
      throw new DaoyanCliError({ code: "usage", message: "remote 模式不管理引擎安装（engine.mode=remote）", exit: 2 });
    }
    const vDir = join("engine", "versions", tag);
    await createVenv(root, join(vDir, ".venv"), say);
    await cloneComfyUI(root, join(vDir, "ComfyUI"), tag, say);
    await pipInstall(root, join(vDir, ".venv"), undefined, say);
    say(`版本 ${tag} 安装完成（${vDir}）。切换使用：daoyan-cli engine use ${tag}`);
    if (ctx.json) emitData({ installed: tag, dir: vDir });
    return;
  }

  if (sub === "use") {
    const target = rest[0];
    if (target === undefined || target === "") {
      throw new DaoyanCliError({ code: "usage", message: "用法：daoyan-cli engine use <版本 tag|路径>", exit: 2 });
    }
    let comfyDir: string;
    let venvDir: string | undefined;
    let version: string | undefined;
    const asPath = resolve(root, target);
    if (existsSync(join(asPath, "main.py"))) {
      comfyDir = asPath;
      if (existsSync(join(asPath, ".venv", "bin", "python"))) venvDir = join(asPath, ".venv");
    } else {
      const vDir = join(root, "engine", "versions", target);
      comfyDir = join(vDir, "ComfyUI");
      const venv = join(vDir, ".venv");
      if (!existsSync(join(comfyDir, "main.py"))) {
        throw new DaoyanCliError({
          code: "provision_failed",
          message: `未找到版本 ${target}（${comfyDir}）。先安装：daoyan-cli engine install ${target}`,
        });
      }
      if (existsSync(join(venv, "bin", "python"))) venvDir = venv;
      version = target;
    }
    const prevVenv = cfg.engine.mode === "local" ? cfg.engine.venv_dir : undefined;
    const prevVersion = cfg.engine.mode === "local" ? cfg.engine.version : undefined;
    cfg.engine = {
      mode: "local",
      comfyui_dir: comfyDir,
      venv_dir: venvDir ?? prevVenv ?? join(comfyDir, ".venv"),
      ...(version !== undefined || prevVersion !== undefined ? { version: version ?? prevVersion } : {}),
      host: cfg.engine.host,
      port: cfg.engine.port,
    };
    saveProjectConfig(root, cfg);
    say(`已切换引擎：${comfyDir}${venvDir !== undefined ? `（venv ${venvDir}）` : ""}`);
    if (ctx.json) emitData({ comfyui_dir: comfyDir, venv_dir: venvDir ?? null, version: version ?? null });
    return;
  }

  throw new DaoyanCliError({ code: "usage", message: `未知子命令 ${sub}（可用：ls / install / use）`, exit: 2 });
}
