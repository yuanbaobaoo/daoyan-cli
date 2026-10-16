/** init —— 立项：本地模式装引擎（python3 venv → clone ComfyUI → pip 依赖）
 *  或 --use-existing 接管既有安装，或 --remote 直连远端引擎；随后生成项目骨架。 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import {
  cloneComfyUI,
  createVenv,
  detectPython,
  latestComfyTag,
  pipInstall,
  scaffoldProject,
  type ScaffoldEngine,
} from "../core/provision/init-flow.mts";

/**
 * init 命令解析出的参数。
 */
interface InitFlags {
  /**
   * --version：固定的 ComfyUI 版本 tag。
   */
  version?: string;
  /**
   * --use-existing：接管既有安装的路径。
   */
  useExisting?: string;
  /**
   * --remote：远端引擎 base URL。
   */
  remoteUrl?: string;
  /**
   * --mirror：pip 镜像源。
   */
  mirror?: string;
}

/**
 * 解析 init 的位置参数与开关（首个位置参数为项目名）。
 */
function parseArgs(args: string[]): { name: string; flags: InitFlags } {
  // 各开关的解析结果
  const flags: InitFlags = {};
  // 位置参数（首个即项目名）
  const pos: string[] = [];
  // 顺序扫描全部参数
  for (let i = 0; i < args.length; i++) {
    // 当前参数
    const a = args[i];
    if (a === undefined) break;
    // 取下一参数作为开关值（缺失即报错）
    const need = (label: string): string => {
      // 开关的取值
      const v = args[i + 1];
      if (v === undefined || v === "") {
        throw new DaoyanCliError({ code: "usage", message: `${label} 需要参数`, exit: 2 });
      }
      i++;
      return v;
    };
    if (a === "--version") flags.version = need("--version");
    else if (a === "--use-existing") flags.useExisting = need("--use-existing");
    else if (a === "--remote") flags.remoteUrl = need("--remote");
    else if (a === "--mirror") flags.mirror = need("--mirror");
    else if (a.startsWith("-")) {
      throw new DaoyanCliError({ code: "usage", message: `未知参数 ${a}`, exit: 2 });
    } else pos.push(a);
  }
  // 项目名（首个位置参数）
  const name = pos[0];
  if (name === undefined || name === "") {
    throw new DaoyanCliError({ code: "usage", message: "用法：daoyan init <名称> [--version <tag>] [--use-existing <路径>] [--remote <url>] [--mirror <镜像>]", exit: 2 });
  }
  return { name, flags };
}

/**
 * init 命令入口：建目录 → 装引擎（或接管 / 远端）→ 生成骨架 → 提示下一步。
 */
export async function runInit(ctx: CliContext, args: string[]): Promise<void> {
  // 解析出的项目名与开关
  const { name, flags } = parseArgs(args);
  // 新项目根目录（cwd 下以项目名建）
  const root = resolve(process.cwd(), name);
  if (existsSync(root) && readdirSync(root).length > 0) {
    throw new DaoyanCliError({ code: "usage", message: `目标目录非空：${root}`, exit: 2 });
  }
  mkdirSync(root, { recursive: true });

  // 写入 project.json 的引擎配置
  let engine: ScaffoldEngine;

  if (flags.remoteUrl !== undefined) {
    say(`远端模式：直连 ${flags.remoteUrl}（不安装引擎）`);
    engine = { mode: "remote", url: flags.remoteUrl };
    scaffoldProject(root, name, engine);
    say(`项目骨架已生成：${root}`);
  } else if (flags.useExisting !== undefined) {
    // 接管路径的绝对形式
    const p = resolve(process.cwd(), flags.useExisting);
    // 识别出的 ComfyUI 目录（ComfyUI/ 子目录或自身）
    const comfy = existsSync(join(p, "ComfyUI", "main.py"))
      ? join(p, "ComfyUI")
      : existsSync(join(p, "main.py"))
        ? p
        : null;
    // 识别出的 venv 目录（兼容 env / engine/.venv / .venv 布局）
    const venv = [join(p, "env"), join(p, "engine", ".venv"), join(p, ".venv")].find((v) =>
      existsSync(join(v, "bin", "python")),
    );
    if (comfy === null) {
      throw new DaoyanCliError({ code: "config_invalid", message: `接管路径下未找到 ComfyUI（期望 ${join(p, "ComfyUI", "main.py")} 或 ${join(p, "main.py")}）` });
    }
    if (venv === undefined) {
      throw new DaoyanCliError({ code: "config_invalid", message: `接管路径下未找到 venv（期望 ${join(p, "env", "bin", "python")} 等布局）` });
    }
    say(`接管既有安装：ComfyUI=${comfy}，venv=${venv}`);
    engine = { mode: "local", comfyui_dir: comfy, venv_dir: venv };
    scaffoldProject(root, name, engine);
    say(`项目骨架已生成：${root}`);
  } else {
    // 本地完整安装
    await detectPython(say);
    // 目标 ComfyUI 版本（未指定查 GitHub 最新）
    const version = flags.version ?? (await latestComfyTag());
    say(`ComfyUI 版本：${version}`);
    await createVenv(root, "engine/.venv", say);
    await cloneComfyUI(root, "engine/ComfyUI", version, say);
    await pipInstall(root, "engine/.venv", flags.mirror, say);
    engine = { mode: "local", comfyui_dir: "engine/ComfyUI", venv_dir: "engine/.venv", version };
    scaffoldProject(root, name, engine);
    say(`项目骨架已生成：${root}`);
  }

  say("下一步：");
  say("  1. 编辑 project.json（models 三件套指向你的模型文件名）");
  say("  2. 编辑 shots.json（分镜表）与 workflow.api.json（引擎导出后按节点命名约定重命名）");
  say("  3. daoyan validate 校验 → daoyan shot 01 开拍");

  if (ctx.json) {
    emitData({ root, engine: { mode: engine.mode, version: engine.version ?? null } });
  }
}
