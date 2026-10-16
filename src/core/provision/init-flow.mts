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

export interface ProvisionOptions {
  name: string;
  /** 固定 ComfyUI 版本 tag；缺省取 GitHub 最新 release tag */
  comfyVersion?: string;
  /** 接管既有安装的路径（既有项目迁移路径） */
  useExisting?: string;
  /** remote 模式：直连已在别处运行的 ComfyUI */
  remoteUrl?: string;
  /** pip 镜像（--index-url） */
  mirror?: string;
}

export type ProvisionStep =
  | { id: "detect-python"; minVersion: string }
  | { id: "create-venv"; venvDir: string }
  | { id: "pick-version"; version: string }
  | { id: "clone-comfyui"; repoUrl: string; ref: string }
  | { id: "install-deps"; requirements: string; torchIndex?: string }
  | { id: "scaffold-project" }
  | { id: "write-config" }
  | { id: "validate-hint" };

/** 纯数据：生成执行计划（无副作用），供预览与测试。 */
export function planProvision(opts: ProvisionOptions): ProvisionStep[] {
  if (opts.useExisting !== undefined || opts.remoteUrl !== undefined) {
    return [{ id: "scaffold-project" }, { id: "write-config" }, { id: "validate-hint" }];
  }
  const version = opts.comfyVersion ?? "latest";
  return [
    { id: "detect-python", minVersion: "3.10" },
    { id: "create-venv", venvDir: "engine/.venv" },
    { id: "pick-version", version },
    { id: "clone-comfyui", repoUrl: "https://github.com/comfyanonymous/ComfyUI.git", ref: version },
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

const COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git";

export interface Logger {
  (m: string): void;
}

/** 检测宿主 python3 ≥ 3.10（绝不捆绑 Python）。 */
export async function detectPython(log: Logger): Promise<void> {
  const r = await execCapture("python3", ["--version"], { timeoutMs: 15_000 });
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: "未找到可用的 python3（ComfyUI 依赖安装需要 ≥3.10）。Ubuntu：apt install python3 python3-venv；macOS：brew install python",
    });
  }
  const m = /Python\s+(\d+)\.(\d+)/.exec(r.stdout.trim());
  const major = m !== null ? Number(m[1]) : 0;
  const minor = m !== null ? Number(m[2]) : 0;
  if (major < 3 || (major === 3 && minor < 10)) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: `python3 版本过低（${r.stdout.trim()}，要求 ≥3.10）`,
    });
  }
  log(`python3 就绪：${r.stdout.trim()}`);
}

/** GitHub tags 里取 ComfyUI 最新版本号（形如 v0.3.x）。 */
export async function latestComfyTag(): Promise<string> {
  const res = await fetch("https://api.github.com/repos/comfyanonymous/ComfyUI/tags", {
    headers: { "user-agent": "daoyan-cli-init", accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new DaoyanCliError({ code: "provision_failed", message: `GitHub API ${res.status}（可用 --version 固定版本绕过）` });
  const tags = (await res.json()) as Array<{ name?: string }>;
  for (const t of tags) {
    if (t.name !== undefined && /^v?\d+\.\d+/.test(t.name)) return t.name;
  }
  throw new DaoyanCliError({ code: "provision_failed", message: "GitHub tags 中未找到可用版本（可用 --version 固定版本绕过）" });
}

export async function createVenv(root: string, venvDir: string, log: Logger): Promise<void> {
  log(`创建虚拟环境 ${venvDir} ...`);
  const r = await execInherit("python3", ["-m", "venv", venvDir], { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `python3 -m venv 失败（退出码 ${r}）。Ubuntu 需 python3-venv 包`,
    });
  }
}

export async function cloneComfyUI(root: string, targetDir: string, ref: string, log: Logger): Promise<void> {
  log(`克隆 ComfyUI（${ref}，--depth 1）→ ${targetDir} ...`);
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

export async function pipInstall(root: string, venvDir: string, mirror: string | undefined, log: Logger): Promise<void> {
  const pip = join(venvDir, "bin", "pip");
  const req = "engine/ComfyUI/requirements.txt";
  if (!existsSync(join(root, req))) {
    throw new DaoyanCliError({ code: "provision_failed", message: `缺少 ${req}（clone 未完成？）` });
  }
  log(`安装依赖（pip install -r ${req}，可能需要下载 torch，耗时较长）...`);
  const args = ["install", "-r", req];
  if (mirror !== undefined) args.push("--index-url", mirror);
  const r = await execInherit(pip, args, { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `pip install 失败（退出码 ${r}）。可用 --mirror 指定镜像源重试`,
    });
  }
  log("依赖安装完成");
}

/** 定位打包内的 templates/ 目录（dist/../templates 或 src/../templates）。 */
export function locateTemplates(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const cand = join(dir, "templates", "project.template.json");
    if (existsSync(cand)) return join(dir, "templates");
    dir = dirname(dir);
  }
  throw new DaoyanCliError({ code: "config_invalid", message: "找不到内置 templates/ 目录（安装包损坏？）" });
}

/** 项目骨架：shots.json / workflow.api.json / anchors 等目录 + project.json。 */
export interface ScaffoldEngine {
  mode: "local" | "remote";
  comfyui_dir?: string;
  venv_dir?: string;
  version?: string;
  url?: string;
  host?: string;
  port?: number;
}

export function slugOf(name: string): string {
  return /^[a-zA-Z0-9_-]+$/.test(name) ? name : "mydrama";
}

export function scaffoldProject(root: string, name: string, engine: ScaffoldEngine): void {
  const tpls = locateTemplates();
  copyFileSync(join(tpls, "shots.template.json"), join(root, "shots.json"));
  copyFileSync(join(tpls, "workflow.api.template.json"), join(root, "workflow.api.json"));
  for (const d of ["anchors", "assets", "logs", "relay_frames", "manifests", "final"]) {
    mkdirSync(join(root, d), { recursive: true });
  }
  writeFileSync(
    join(root, ".gitignore"),
    ["engine/", "logs/", "relay_frames/", "final/", "concat_list.txt", "*.log", ".DS_Store", ""].join("\n"),
  );

  const tpl = JSON.parse(
    readFileSync(join(tpls, "project.template.json"), "utf8"),
  ) as Record<string, unknown>;
  tpl.name = name;
  tpl.output_prefix = `${slugOf(name)}/`;
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
  writeFileSync(join(root, "project.json"), JSON.stringify(tpl, null, 2) + "\n");
}

/** 供 engine use 等场景解析相对/绝对路径。 */
export function absFrom(root: string, p: string): string {
  return resolve(root, p);
}
