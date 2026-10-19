/** init 编排 —— local 模式部署项目专属 ComfyUI；remote 只写本机配置。
 *  步骤：python3 检测 → venv → clone ComfyUI（pin 版本）→ pip 依赖 → custom nodes
 *        → extra_model_paths.yaml；项目骨架（project.json v2 / shots / workflows / LFS）。
 *  init 只部署，不启动引擎。全程 spawn 数组传参，不经 shell。 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { execCapture, execInherit } from "../../shared/exec.mts";
import { ensureDir, writeFileAtomic } from "../../shared/fs.mts";
import { freePort } from "../../shared/net.mts";
import {
    EXTRA_MODELS_FILE,
    FINAL_DIR,
    INPUTS_DIR,
    LOG_DIR,
    PROJECT_FILE,
    RELAY_DIR,
    SHOTS_FILE,
    WORKFLOWS_DIR,
    type CustomNodeSpec,
    type ProjectConfig,
} from "../project/types.mts";

// ComfyUI 官方仓库（custom nodes 各自 repo 覆盖）
const COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git";
// ComfyUI tags 查询接口
export const COMFY_TAGS_API = "https://api.github.com/repos/comfyanonymous/ComfyUI/tags";
// 最低 Python 版本
const MIN_PYTHON = "3.10";
// 默认 pip 源（阿里云 PyPI，国内网络更稳）
export const DEFAULT_PIP_MIRROR = "https://mirrors.aliyun.com/pypi/simple/";

/**
 * pip index 参数：未显式指定 --mirror 时默认阿里云 PyPI。
 */
export function pipIndexArgs(mirror?: string): string[] {
    // 空字符串按未指定处理
    const index = mirror !== undefined && mirror.trim() !== "" ? mirror.trim() : DEFAULT_PIP_MIRROR;
    return ["--index-url", index];
}

/**
 * 进度日志回调。
 */
export interface Logger {
    (m: string): void;
}

/**
 * 生成 project.json v2 骨架内容。
 */
export function projectTemplate(name: string): ProjectConfig {
    return {
        name,
        version: 2,
        gpu: { takeover: false },
        comfyui: {
            custom_nodes: [],
        },
    };
}

/**
 * 创建新项目骨架（不覆盖已有文件）。
 */
export function scaffoldProject(root: string, name: string): { created: string[] } {
    // 已创建文件
    const created: string[] = [];
    // 目录
    for (const d of [WORKFLOWS_DIR, INPUTS_DIR, FINAL_DIR, LOG_DIR, RELAY_DIR]) {
        ensureDir(join(root, d));
    }
    // project.json
    const projectFile = join(root, PROJECT_FILE);
    if (!existsSync(projectFile)) {
        writeFileAtomic(projectFile, JSON.stringify(projectTemplate(name), null, 2) + "\n");
        created.push(PROJECT_FILE);
    }
    // shots.json
    const shotsFile = join(root, SHOTS_FILE);
    if (!existsSync(shotsFile)) {
        writeFileAtomic(shotsFile, JSON.stringify(shotsTemplate(), null, 2) + "\n");
        created.push(SHOTS_FILE);
    }
    // 空 workflow 占位（workflow new/import 可直接替换空图）
    const wf = join(root, WORKFLOWS_DIR, "t2v.json");
    if (!existsSync(wf)) {
        writeFileAtomic(wf, "{}\n");
        created.push(`${WORKFLOWS_DIR}/t2v.json`);
    }
    // .gitignore（保留用户已有内容；缺失才写）
    const ignore = join(root, ".gitignore");
    if (!existsSync(ignore)) {
        writeFileAtomic(
            ignore,
            ["engine/", "logs/", ".dycli/", "relay_frames/", "concat_list.txt", "*.log", ".DS_Store", ""].join("\n"),
        );
        created.push(".gitignore");
    }
    // .gitattributes（LFS）
    const attrs = join(root, ".gitattributes");
    if (!existsSync(attrs)) {
        writeFileAtomic(
            attrs,
            [
                "runs/**/outputs/** filter=lfs diff=lfs merge=lfs -text",
                "runs/**/inputs/**  filter=lfs diff=lfs merge=lfs -text",
                "inputs/**          filter=lfs diff=lfs merge=lfs -text",
                "final/**           filter=lfs diff=lfs merge=lfs -text",
                "",
            ].join("\n"),
        );
        created.push(".gitattributes");
    }
    return { created };
}

/**
 * shots.json 模板（recipe；bindings 由 Agent 按 workflow 建立）。
 */
function shotsTemplate(): Record<string, unknown> {
    return {
        workflow: "t2v",
        meta: {
            title: "示例分镜表（init 后替换）",
            width: 768,
            height: 1344,
            anchors: {},
        },
        defaults: {
            length: 243,
            steps: 30,
            cfg: 4,
            sampler_name: "euler",
            scheduler: "simple",
            shift_video: 12,
            shift_audio: 3,
            negative: "低质量，模糊，噪点，变形，水印",
        },
        style_prefix: "写实电影感",
        shots: [
            { id: "01", slug: "opening", seed: 1101, prompt: "示例：开场镜头提示词" },
            { id: "02", slug: "relay", seed: 1102, first_frame: { relay: "01" }, prompt: "示例：接力镜头提示词" },
        ],
    };
}

/**
 * 检测宿主 python3 ≥ 3.10。
 */
export async function detectPython(log: Logger): Promise<void> {
    // python3 --version
    const r = await execCapture("python3", ["--version"], { timeoutMs: 15_000 });
    if (r.code !== 0) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message:
                "未找到可用的 python3（ComfyUI 依赖安装需要 ≥3.10）。Ubuntu：apt install python3 python3-venv；macOS：brew install python",
        });
    }
    // 版本匹配
    const m = /Python\s+(\d+)\.(\d+)/.exec(r.stdout.trim());
    // 主版本
    const major = m !== null ? Number(m[1]) : 0;
    // 次版本
    const minor = m !== null ? Number(m[2]) : 0;
    if (major < 3 || (major === 3 && minor < 10)) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message: `python3 版本过低（${r.stdout.trim()}，要求 ≥${MIN_PYTHON}）`,
        });
    }
    log(`python3 就绪：${r.stdout.trim()}`);
}

/**
 * 查询 ComfyUI 最新 tag。
 */
export async function latestComfyTag(): Promise<string> {
    // tags API
    const res = await fetch(COMFY_TAGS_API, {
        headers: { "user-agent": "daoyan-cli-init", accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `GitHub API ${res.status}（可用 --version 固定版本绕过）`,
        });
    }
    // tags 列表
    const tags = (await res.json()) as Array<{ name?: string }>;
    for (const t of tags) {
        if (t.name !== undefined && /^v?\d+\.\d+/.test(t.name)) return t.name;
    }
    throw new DaoyanCliError({
        code: "provision_failed",
        message: "GitHub tags 中未找到可用版本（可用 --version 固定版本绕过）",
    });
}

/**
 * 创建 Python venv（已存在则复用）。
 */
export async function createVenv(root: string, venvDir: string, log: Logger): Promise<void> {
    if (existsSync(join(venvDir, "bin", "python"))) {
        log(`复用已有 venv：${venvDir}`);
        return;
    }
    log(`创建虚拟环境 ${venvDir} ...`);
    // venv 创建退出码
    const r = await execInherit("python3", ["-m", "venv", venvDir], { cwd: root });
    if (r !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `python3 -m venv 失败（退出码 ${r}）。Ubuntu 需 python3-venv 包`,
        });
    }
}

/**
 * 通用 git clone（--depth 1，可选 ref）。
 */
async function cloneRepo(
    root: string,
    repo: string,
    target: string,
    ref: string | undefined,
    log: Logger,
): Promise<void> {
    if (existsSync(join(target, ".git"))) {
        log(`复用已有仓库：${target}`);
        return;
    }
    // clone 参数
    const args = ["clone", "--depth", "1"];
    if (ref !== undefined && ref !== "") args.push("--branch", ref);
    args.push(repo, target);
    log(`克隆 ${repo}${ref !== undefined ? `（${ref}）` : ""} → ${target} ...`);
    // clone 退出码
    const r = await execInherit("git", args, { cwd: root });
    if (r !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `git clone 失败（退出码 ${r}）：${repo}${ref !== undefined ? `#${ref}` : ""}`,
        });
    }
}

/**
 * 在 venv 内安装 ComfyUI 依赖。
 */
export async function pipInstall(
    root: string,
    venvDir: string,
    mirror: string | undefined,
    log: Logger,
    requirements?: string,
): Promise<void> {
    // pip 可执行文件
    const pip = join(venvDir, "bin", "pip");
    // 依赖清单
    const req = requirements ?? join(root, "engine", "ComfyUI", "requirements.txt");
    if (!existsSync(req)) {
        throw new DaoyanCliError({ code: "provision_failed", message: `缺少 ${req}（clone 未完成？）` });
    }
    // pip 源（默认阿里云）
    const indexArgs = pipIndexArgs(mirror);
    const sourceLabel = mirror !== undefined && mirror.trim() !== "" ? "自定义镜像" : "阿里云（默认）";
    log(`安装 ComfyUI 依赖（pip install -r ${req}，源：${sourceLabel}，可能需要下载 torch，耗时较长）...`);
    // pip 参数
    const args = ["install", "-r", req, ...indexArgs];
    // pip 退出码
    const r = await execInherit(pip, args, { cwd: root });
    if (r !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `pip install 失败（退出码 ${r}）。默认使用阿里云 PyPI；可用 --mirror 切换官方源或其他镜像重试`,
        });
    }
    log("ComfyUI 依赖安装完成");
}

/**
 * 安装 custom nodes（repo + ref）。
 */
export async function installCustomNodes(
    root: string,
    venvDir: string,
    nodes: CustomNodeSpec[],
    mirror: string | undefined,
    log: Logger,
    comfyDir = join(root, "engine", "ComfyUI"),
): Promise<void> {
    if (nodes.length === 0) return;
    // custom_nodes 目录
    const base = join(comfyDir, "custom_nodes");
    ensureDir(base);
    for (const node of nodes) {
        // 目标目录
        const target = join(base, node.name);
        await cloneRepo(root, node.repo, target, node.ref, log);
        // 可选 requirements
        const req = join(target, "requirements.txt");
        if (existsSync(req)) {
            log(`安装 ${node.name} 依赖...`);
            // pip 参数（默认阿里云源）
            const args = ["install", "-r", req, ...pipIndexArgs(mirror)];
            // pip 退出码
            const r = await execInherit(join(venvDir, "bin", "pip"), args, { cwd: root });
            if (r !== 0) {
                throw new DaoyanCliError({
                    code: "provision_failed",
                    message: `custom node ${node.name} 依赖安装失败（退出码 ${r}）。默认使用阿里云 PyPI；可用 --mirror 覆盖`,
                });
            }
        }
    }
    log(`custom nodes 安装完成：${nodes.map((n) => n.name).join(", ")}`);
}

/**
 * 把已有 ComfyUI 目录切到指定版本（fetch + checkout）。
 */
async function checkoutComfyVersion(comfyDir: string, version: string, log: Logger): Promise<boolean> {
    // 当前精确 tag（非 tag 检出会失败）
    const desc = await execCapture("git", ["-C", comfyDir, "describe", "--tags", "--exact-match"], {
        timeoutMs: 15_000,
    });
    if (desc.code === 0 && desc.stdout.trim() === version) return false;
    log(`切换 ComfyUI 目录到 ${version} ...`);
    // 拉取目标 ref
    const fetch = await execCapture("git", ["-C", comfyDir, "fetch", "--depth", "1", "origin", version], {
        timeoutMs: 180_000,
    });
    if (fetch.code !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `git fetch ${version} 失败：${fetch.stderr.slice(0, 300)}`,
            hint: "检查 tag 是否存在，或使用 daoyan engine install/use。",
        });
    }
    // 强制检出
    const co = await execCapture("git", ["-C", comfyDir, "checkout", "--force", version], {
        timeoutMs: 120_000,
    });
    if (co.code !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `git checkout ${version} 失败：${co.stderr.slice(0, 300)}`,
        });
    }
    return true;
}

/**
 * 部署 local 引擎（幂等：已有目录复用；版本不同会 checkout）。
 */
export async function deployLocalEngine(opts: {
    root: string;
    project: ProjectConfig;
    version: string;
    mirror?: string;
    log: Logger;
}): Promise<{ installed: boolean; version: string }> {
    // venv 与 ComfyUI 目录
    const venvDir = join(opts.root, "engine", ".venv");
    const comfyDir = join(opts.root, "engine", "ComfyUI");
    // 是否已完整安装
    const already = existsSync(join(venvDir, "bin", "python")) && existsSync(join(comfyDir, "main.py"));
    if (already) {
        opts.log("引擎已安装，复用现有目录");
        // 版本不同则切换（有 .git 才能切）
        let switched = false;
        if (existsSync(join(comfyDir, ".git"))) {
            switched = await checkoutComfyVersion(comfyDir, opts.version, opts.log);
        } else if (existsSync(join(comfyDir, "main.py"))) {
            opts.log("ComfyUI 目录不是 git 检出，跳过版本切换（可用 engine use 指向其他目录）");
        }
        if (switched) {
            await pipInstall(opts.root, venvDir, opts.mirror, opts.log, join(comfyDir, "requirements.txt"));
        }
        await installCustomNodes(
            opts.root,
            venvDir,
            opts.project.comfyui?.custom_nodes ?? [],
            opts.mirror,
            opts.log,
            comfyDir,
        );
        return { installed: false, version: opts.version };
    }
    await detectPython(opts.log);
    await createVenv(opts.root, venvDir, opts.log);
    await cloneRepo(opts.root, COMFY_REPO, comfyDir, opts.version, opts.log);
    await pipInstall(opts.root, venvDir, opts.mirror, opts.log);
    await installCustomNodes(
        opts.root,
        venvDir,
        opts.project.comfyui?.custom_nodes ?? [],
        opts.mirror,
        opts.log,
        comfyDir,
    );
    return { installed: true, version: opts.version };
}

/**
 * 在指定目录安装一个版本的 ComfyUI（engine/versions/<tag> 等）。
 */
export async function installEngineAt(opts: {
    root: string;
    baseDir: string;
    version: string;
    project: ProjectConfig;
    mirror?: string;
    log: Logger;
}): Promise<{ comfyDir: string; venvDir: string }> {
    // 目标目录
    const comfyDir = join(opts.baseDir, "ComfyUI");
    const venvDir = join(opts.baseDir, ".venv");
    await detectPython(opts.log);
    await createVenv(opts.root, venvDir, opts.log);
    await cloneRepo(opts.root, COMFY_REPO, comfyDir, opts.version, opts.log);
    await pipInstall(opts.root, venvDir, opts.mirror, opts.log, join(comfyDir, "requirements.txt"));
    await installCustomNodes(
        opts.root,
        venvDir,
        opts.project.comfyui?.custom_nodes ?? [],
        opts.mirror,
        opts.log,
        comfyDir,
    );
    return { comfyDir, venvDir };
}

/**
 * 生成 extra_model_paths.yaml（外部模型目录）。
 * 返回写入路径；未指定 modelpath 时返回 null（使用 ComfyUI 默认 models/）。
 */
export function writeExtraModelPaths(root: string, modelpath: string | undefined): string | null {
    if (modelpath === undefined || modelpath === "") return null;
    // 单引号转义（YAML 标量）
    const base = modelpath.replace(/'/g, "''");
    // 常见模型子目录映射
    const yaml = [
        "daoyan:",
        `  base_path: '${base}'`,
        "  checkpoints: checkpoints",
        "  clip: text_encoders",
        "  clip_vision: clip_vision",
        "  configs: configs",
        "  controlnet: controlnet",
        "  diffusion_models: diffusion_models",
        "  embeddings: embeddings",
        "  gligen: gligen",
        "  hypernetworks: hypernetworks",
        "  loras: loras",
        "  style_models: style_models",
        "  text_encoders: text_encoders",
        "  unet: diffusion_models",
        "  upscale_models: upscale_models",
        "  vae: vae",
        "",
    ].join("\n");
    // 写入 .dycli/extra_model_paths.yaml
    const file = join(root, EXTRA_MODELS_FILE);
    ensureDir(join(root, ".dycli"));
    writeFileAtomically(file, yaml);
    return file;
}

/**
 * 小写原子写（本模块内联，避免额外依赖）。
 */
function writeFileAtomically(file: string, content: string): void {
    // 临时文件
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, content);
    renameSync(tmp, file);
}

/**
 * 分配项目端口（优先保留已有端口）。
 */
export async function allocatePort(existing?: number): Promise<number> {
    if (existing !== undefined && existing > 0) return existing;
    return freePort("127.0.0.1");
}

/**
 * 读取文件内容（测试/诊断用）。
 */
export function readText(file: string): string {
    return readFileSync(file, "utf8");
}
