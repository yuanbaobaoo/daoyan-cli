/** init 编排 —— ComfyUI 是外部组件，init 只做脚本化编排（docs/PLAN.md §8）：
 *  1 检测宿主 python3(≥3.10) → 2 python3 -m venv engine/.venv → 3 版本选择（GitHub tags）
 *  → 4 git clone --branch <tag> --depth 1 → 5 venv pip 装依赖（--mirror 可配源）
 *  → 6 生成项目骨架(templates/) → 7 写 project.json → 8 提示 validate 收尾。
 *  --use-existing <path>：跳过 1–5，仅对齐配置与骨架（接管既有安装）。
 *  全程 spawn 数组传参 + 显式 env（不经 shell）。 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DaoyanCliError } from "../../shared/errors.mts";
import { execCapture, execInherit } from "../../shared/exec.mts";
import { PROJECT_FILE, SHOTS_FILE } from "../project/types.mts";

// ComfyUI 官方仓库（clone 源；project.json 可覆盖为镜像 / 内网 fork）
const COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git";
// ComfyUI tags 查询接口（版本选择与 engine ls 共用）
export const COMFY_TAGS_API = "https://api.github.com/repos/comfyanonymous/ComfyUI/tags";

/**
 * 立项时用户可指定的选项（来自 init 命令的参数）。
 */
export interface ProvisionOptions {
  /**
   * 项目名（兼作目录名）。
   */
  name: string;
  /**
   * 固定 ComfyUI 版本 tag；缺省取 GitHub 最新 release tag
   */
  comfyVersion?: string;
  /**
   * 接管既有安装的路径（既有项目迁移路径）
   */
  useExisting?: string;
  /**
   * remote 模式：直连已在别处运行的 ComfyUI
   */
  remoteUrl?: string;
  /**
   * pip 镜像（--index-url）
   */
  mirror?: string;
}

/**
 * init 的执行步骤（纯数据，供预览与测试）。
 */
export type ProvisionStep =
  // 检测宿主 python3（minVersion：最低版本要求）
  | { id: "detect-python"; minVersion: string }
  // 创建虚拟环境（venvDir：相对项目根）
  | { id: "create-venv"; venvDir: string }
  // 确定 ComfyUI 版本（version：tag 或 latest）
  | { id: "pick-version"; version: string }
  // 克隆 ComfyUI 仓库（repoUrl + ref）
  | { id: "clone-comfyui"; repoUrl: string; ref: string }
  // 安装依赖（requirements 路径 + 可选 torch 源）
  | { id: "install-deps"; requirements: string; torchIndex?: string }
  // 生成项目骨架（templates/ 复制）
  | { id: "scaffold-project" }
  // 写 project.json
  | { id: "write-config" }
  // 提示 validate 收尾
  | { id: "validate-hint" };

/**
 * 纯数据：生成执行计划（无副作用），供预览与测试。
 */
export function planProvision(opts: ProvisionOptions): ProvisionStep[] {
  if (opts.useExisting !== undefined || opts.remoteUrl !== undefined) {
    return [{ id: "scaffold-project" }, { id: "write-config" }, { id: "validate-hint" }];
  }
  // 目标版本（未指定先按 latest，实施时再查 GitHub）
  const version = opts.comfyVersion ?? "latest";
  return [
    { id: "detect-python", minVersion: "3.10" },
    { id: "create-venv", venvDir: "engine/.venv" },
    { id: "pick-version", version },
    { id: "clone-comfyui", repoUrl: COMFY_REPO, ref: version },
    {
      id: "install-deps",
      requirements: "engine/ComfyUI/requirements.txt",
      ...(opts.mirror !== undefined ? { torchIndex: opts.mirror } : {}),
    },
    { id: "scaffold-project" },
    { id: "write-config" },
    { id: "validate-hint" },
  ];
}

/**
 * 进度日志回调（init-flow 各步骤用它向用户汇报）。
 */
export interface Logger {
  (m: string): void;
}

/**
 * 检测宿主 python3 ≥ 3.10（绝不捆绑 Python）。
 */
export async function detectPython(log: Logger): Promise<void> {
  // python3 --version 的执行结果
  const r = await execCapture("python3", ["--version"], { timeoutMs: 15_000 });
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: "未找到可用的 python3（ComfyUI 依赖安装需要 ≥3.10）。Ubuntu：apt install python3 python3-venv；macOS：brew install python",
    });
  }
  // 版本号匹配结果
  const m = /Python\s+(\d+)\.(\d+)/.exec(r.stdout.trim());
  // 主版本号（解析失败按 0）
  const major = m !== null ? Number(m[1]) : 0;
  // 次版本号（解析失败按 0）
  const minor = m !== null ? Number(m[2]) : 0;
  if (major < 3 || (major === 3 && minor < 10)) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: `python3 版本过低（${r.stdout.trim()}，要求 ≥3.10）`,
    });
  }
  log(`python3 就绪：${r.stdout.trim()}`);
}

/**
 * GitHub tags 里取 ComfyUI 最新版本号（形如 v0.3.x）。
 */
export async function latestComfyTag(): Promise<string> {
  // tags 接口响应
  const res = await fetch(COMFY_TAGS_API, {
    headers: { "user-agent": "daoyan-cli-init", accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new DaoyanCliError({ code: "provision_failed", message: `GitHub API ${res.status}（可用 --version 固定版本绕过）` });
  // tags 列表（按 GitHub 返回顺序，首个语义化版本即最新）
  const tags = (await res.json()) as Array<{ name?: string }>;
  // 取首个语义化 tag（GitHub 按时间倒序返回）
  for (const t of tags) {
    if (t.name !== undefined && /^v?\d+\.\d+/.test(t.name)) return t.name;
  }
  throw new DaoyanCliError({ code: "provision_failed", message: "GitHub tags 中未找到可用版本（可用 --version 固定版本绕过）" });
}

/**
 * 在项目内创建 Python 虚拟环境（python3 -m venv）。
 */
export async function createVenv(root: string, venvDir: string, log: Logger): Promise<void> {
  log(`创建虚拟环境 ${venvDir} ...`);
  // venv 创建命令的退出码
  const r = await execInherit("python3", ["-m", "venv", venvDir], { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `python3 -m venv 失败（退出码 ${r}）。Ubuntu 需 python3-venv 包`,
    });
  }
}

/**
 * 克隆 ComfyUI 仓库到项目内（--depth 1，指定 tag / 分支）。
 */
export async function cloneComfyUI(root: string, targetDir: string, ref: string, log: Logger): Promise<void> {
  log(`克隆 ComfyUI（${ref}，--depth 1）→ ${targetDir} ...`);
  // git clone 的退出码
  const r = await execInherit(
    "git",
    ["clone", "--depth", "1", "--branch", ref, COMFY_REPO, targetDir],
    { cwd: root },
  );
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `git clone 失败（退出码 ${r}）。检查网络 / tag 是否存在（--version 指定）`,
    });
  }
}

/**
 * 在 venv 内安装 ComfyUI 依赖（可选 --index-url 镜像）。
 */
export async function pipInstall(root: string, venvDir: string, mirror: string | undefined, log: Logger): Promise<void> {
  // venv 内的 pip 可执行文件
  const pip = join(venvDir, "bin", "pip");
  // 依赖清单（ComfyUI 仓库内相对路径）
  const req = "engine/ComfyUI/requirements.txt";
  if (!existsSync(join(root, req))) {
    throw new DaoyanCliError({ code: "provision_failed", message: `缺少 ${req}（clone 未完成？）` });
  }
  log(`安装依赖（pip install -r ${req}，可能需要下载 torch，耗时较长）...`);
  // pip 参数（镜像存在时追加 --index-url）
  const args = ["install", "-r", req];
  if (mirror !== undefined) args.push("--index-url", mirror);
  // pip install 的退出码
  const r = await execInherit(pip, args, { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `pip install 失败（退出码 ${r}）。可用 --mirror 指定镜像源重试`,
    });
  }
  log("依赖安装完成");
}

/**
 * 定位打包内的 templates/ 目录（dist/../templates 或 src/../templates）。
 */
export function locateTemplates(): string {
  // 自本模块所在目录向上逐级探测
  let dir = dirname(fileURLToPath(import.meta.url));
  // 向上逐级探测（最多 5 层）
  for (let i = 0; i < 5; i++) {
    // 当前层级的模板探测点
    const cand = join(dir, "templates", "project.template.json");
    if (existsSync(cand)) return join(dir, "templates");
    dir = dirname(dir);
  }
  throw new DaoyanCliError({ code: "config_invalid", message: "找不到内置 templates/ 目录（安装包损坏？）" });
}

/**
 * 项目骨架：shots.json / workflow.api.json / anchors 等目录 + project.json。
 */
export interface ScaffoldEngine {
  /**
   * 接入模式。
   */
  mode: "local" | "remote";
  /**
   * ComfyUI 仓库路径（local）。
   */
  comfyui_dir?: string;
  /**
   * venv 路径（local）。
   */
  venv_dir?: string;
  /**
   * ComfyUI 版本 tag（local）。
   */
  version?: string;
  /**
   * 远端 base URL（remote）。
   */
  url?: string;
  /**
   * 引擎地址（模板占位，url 优先）。
   */
  host?: string;
  /**
   * 引擎端口（remote 时覆盖模板值）。
   */
  port?: number;
}

/**
 * 由项目名推导安全的 slug（不合法回退 mydrama）。
 */
export function slugOf(name: string): string {
  return /^[a-zA-Z0-9_-]+$/.test(name) ? name : "mydrama";
}

/**
 * 生成项目骨架：复制模板 + 建目录 + 写 .gitignore 与 project.json。
 */
export function scaffoldProject(root: string, name: string, engine: ScaffoldEngine): void {
  // 内置模板目录
  const tpls = locateTemplates();
  copyFileSync(join(tpls, "shots.template.json"), join(root, SHOTS_FILE));
  copyFileSync(join(tpls, "workflow.api.template.json"), join(root, "workflow.api.json"));
  // 建齐全部工作目录
  for (const d of ["anchors", "assets", "logs", "relay_frames", "manifests", "final"]) {
    mkdirSync(join(root, d), { recursive: true });
  }
  writeFileSync(
    join(root, ".gitignore"),
    ["engine/", "logs/", "relay_frames/", "final/", "concat_list.txt", "*.log", ".DS_Store", ""].join("\n"),
  );

  // project.json 模板内容（就地改写后落盘）
  const tpl = JSON.parse(
    readFileSync(join(tpls, "project.template.json"), "utf8"),
  ) as Record<string, unknown>;
  tpl.name = name;
  tpl.output_prefix = `${slugOf(name)}/`;
  // 模板里的 engine 段（宽松视图）
  const eng = tpl.engine as Record<string, unknown>;
  eng.mode = engine.mode;
  if (engine.mode === "remote") {
    delete eng.comfyui_dir;
    delete eng.venv_dir;
    delete eng.repo_url;
    delete eng.launch_extra;
    delete eng.run_user;
    if (engine.url !== undefined) {
      eng.url = engine.url;
      // host/port 保留模板占位（url 优先）
    }
    if (engine.port !== undefined) eng.port = engine.port;
  } else {
    eng.comfyui_dir = engine.comfyui_dir ?? "engine/ComfyUI";
    eng.venv_dir = engine.venv_dir ?? "engine/.venv";
    if (engine.version !== undefined) eng.version = engine.version;
  }
  writeFileSync(join(root, PROJECT_FILE), JSON.stringify(tpl, null, 2) + "\n");
}

/**
 * 供 engine use 等场景解析相对/绝对路径。
 */
export function absFrom(root: string, p: string): string {
  return resolve(root, p);
}
