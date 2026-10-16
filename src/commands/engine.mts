/** engine —— ComfyUI 外部组件的版本管理（local 模式）：
 *  ls 列本地 engine/versions/* 与 GitHub tags；install <tag> 克隆+建 venv+装依赖；use 切换。 */
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { projectFromContext, saveProjectConfig } from "../core/project/config.mts";
import { COMFY_TAGS_API, cloneComfyUI, createVenv, pipInstall } from "../core/provision/init-flow.mts";

/**
 * 取 GitHub 上 ComfyUI 的最新 tags（失败返回空数组，命令降级只显示本地）。
 */
async function comfyTags(limit: number): Promise<string[]> {
  try {
    // tags 接口响应
    const res = await fetch(COMFY_TAGS_API, {
      headers: { "user-agent": "daoyan-cli-engine", accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    // tags 列表（按 GitHub 返回顺序）
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
 * 列出本地已安装的 ComfyUI 版本（engine/versions/ 下的目录名）。
 */
function localVersions(root: string): string[] {
  // 版本目录（不存在按空处理）
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
 * engine 命令入口：ls / install / use 三个子命令。
 */
export async function runEngine(ctx: CliContext, args: string[]): Promise<void> {
  // 子命令名（ls / install / use）
  const sub = args[0];
  if (sub === undefined) {
    throw new DaoyanCliError({ code: "usage", message: "用法：daoyan engine <ls|install|use> ...", exit: 2 });
  }
  // 子命令之后的参数
  const rest = args.slice(1);

  if (sub === "ls") {
    // GitHub 远端版本（前 15）
    const remote = await comfyTags(15);
    // 本地已安装版本
    let local: string[] = [];
    // 当前使用的版本（remote 模式标注）
    let current = "";
    // 项目定位结果（可在项目外运行）
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
    // 逐个输出本地版本（标注当前使用）
    for (const v of local) say(`  ${v}${v === current ? "  ← 当前" : ""}`);
    if (local.length === 0) say("  （无）");
    say("GitHub 可用版本（前 15）：");
    // 逐个输出远端版本
    for (const v of remote) say(`  ${v}`);
    if (remote.length === 0) say("  （GitHub 不可达，仅显示本地）");
    return;
  }

  // install / use 需要项目
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "engine install/use 需在项目内运行（未找到 project.json）" });
  }
  // 项目根与配置
  const { root, config: cfg } = found;

  if (sub === "install") {
    // 目标版本 tag
    const tag = rest[0];
    if (tag === undefined || tag === "") {
      throw new DaoyanCliError({ code: "usage", message: "用法：daoyan engine install <版本 tag>", exit: 2 });
    }
    if (cfg.engine.mode !== "local") {
      throw new DaoyanCliError({ code: "usage", message: "remote 模式不管理引擎安装（engine.mode=remote）", exit: 2 });
    }
    // 版本安装目录（engine/versions/<tag>/）
    const vDir = join("engine", "versions", tag);
    await createVenv(root, join(vDir, ".venv"), say);
    await cloneComfyUI(root, join(vDir, "ComfyUI"), tag, say);
    await pipInstall(root, join(vDir, ".venv"), undefined, say);
    say(`版本 ${tag} 安装完成（${vDir}）。切换使用：daoyan engine use ${tag}`);
    if (ctx.json) emitData({ installed: tag, dir: vDir });
    return;
  }

  if (sub === "use") {
    // 目标版本 tag 或路径
    const target = rest[0];
    if (target === undefined || target === "") {
      throw new DaoyanCliError({ code: "usage", message: "用法：daoyan engine use <版本 tag|路径>", exit: 2 });
    }
    // 解析出的 ComfyUI 目录
    let comfyDir: string;
    // 解析出的 venv 目录（可空，缺省沿用既有配置）
    let venvDir: string | undefined;
    // 解析出的版本号（路径形态时为空）
    let version: string | undefined;
    // 目标按路径解析的绝对路径
    const asPath = resolve(root, target);
    if (existsSync(join(asPath, "main.py"))) {
      comfyDir = asPath;
      if (existsSync(join(asPath, ".venv", "bin", "python"))) venvDir = join(asPath, ".venv");
    } else {
      // 按 tag 解析到 engine/versions/<tag>/
      const vDir = join(root, "engine", "versions", target);
      comfyDir = join(vDir, "ComfyUI");
      // 该版本的 venv 目录
      const venv = join(vDir, ".venv");
      if (!existsSync(join(comfyDir, "main.py"))) {
        throw new DaoyanCliError({
          code: "provision_failed",
          message: `未找到版本 ${target}（${comfyDir}）。先安装：daoyan engine install ${target}`,
        });
      }
      if (existsSync(join(venv, "bin", "python"))) venvDir = venv;
      version = target;
    }
    // 切换前的 venv 配置（用于缺省回退）
    const prevVenv = cfg.engine.mode === "local" ? cfg.engine.venv_dir : undefined;
    // 切换前的版本号（用于缺省回退）
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
