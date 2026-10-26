/** init 编排 —— local 模式部署项目专属 ComfyUI；remote 只写本机配置。
 *  步骤：venv（pip 健康检查 + ensurepip 预检）→ clone/checkout ComfyUI（pin 版本）
 *        → 探测驱动并安装匹配 CUDA 的 torch/torchvision → pip 依赖（主源/fallback）
 *        → custom nodes → pip check + CUDA smoke test → 写工具链 marker
 *        → extra_model_paths.yaml；项目骨架（project.json v2 / shots / workflows / LFS）。
 *  init 只部署，不启动引擎。全程 spawn 数组传参，不经 shell。 */
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { execCapture, execInherit, execStream, tryExecCapture, type ExecResult } from "../../shared/exec.mts";
import { ensureDir, sha256, sha256File } from "../../shared/fs.mts";
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
    type ProductionMode,
    type ProjectConfig,
} from "../project/types.mts";
import { initStory } from "../story/store.mts";
import { episodeDir } from "../story/paths.mts";
import {
    DEFAULT_PIP_MIRROR,
    resolveToolchainOptions,
    type ResolvedToolchainOptions,
    type ToolchainOptions,
} from "./options.mts";
import {
    TOOLCHAIN_MARKER_FILE,
    buildToolchainMarker,
    inspectTorchPlan,
    markerMismatchReason,
    parsePythonVersion,
    readToolchainMarker,
    resolveTorchPlan,
    runPipCheck,
    runSmokeTest,
    torchPlanForTag,
    writeToolchainMarker,
    type PythonInfo,
    type SmokeResult,
    type ToolchainMarker,
    type TorchPlan,
} from "./toolchain.mts";

export {
    DEFAULT_PIP_FALLBACK_MIRROR,
    DEFAULT_PIP_MIRROR,
    resolveToolchainOptions,
    type ResolvedToolchainOptions,
    type ToolchainOptions,
} from "./options.mts";

// ComfyUI 官方仓库（custom nodes 各自 repo 覆盖）
const COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git";
// ComfyUI tags 查询接口
export const COMFY_TAGS_API = "https://api.github.com/repos/comfyanonymous/ComfyUI/tags";
// 最低 Python 版本
const MIN_PYTHON = "3.10";
// venv 创建超时
const VENV_TIMEOUT_MS = 180_000;
// pip 安装超时（大 wheel 可能很慢；到点杀进程并给出可操作的错误）
const PIP_INSTALL_TIMEOUT_MS = 3_600_000;
// pip 网络重试次数
const PIP_RETRIES = "5";
// pip 单次网络超时（秒）
const PIP_TIMEOUT_SECONDS = "60";

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
 * 工具链摘要（进入 init / engine install 的 JSON 输出）。
 */
export interface ToolchainSummary {
    /**
     * venv Python 版本。
     */
    python: string;
    /**
     * 平台标签。
     */
    platform: string;
    /**
     * 驱动版本。
     */
    driver: string | null;
    /**
     * 驱动支持的最高 CUDA 版本。
     */
    cuda_max: string | null;
    /**
     * compute capability。
     */
    compute_cap: string | null;
    /**
     * torch 后端。
     */
    torch_backend: "cuda" | "cpu";
    /**
     * 使用的 CUDA tag。
     */
    torch_tag: string | null;
    /**
     * 实际 torch 版本。
     */
    torch: string | null;
    /**
     * 实际 torchvision 版本。
     */
    torchvision: string | null;
    /**
     * 是否复用了已有安装。
     */
    reused: boolean;
}

/**
 * 生成 project.json v2 骨架内容。
 */
export function projectTemplate(name: string, mode: ProductionMode): ProjectConfig {
    return {
        name,
        version: 2,
        production: { mode, audio: true },
        gpu: { takeover: false },
        comfyui: {
            custom_nodes: [],
        },
    };
}

/**
 * 创建新项目骨架（不覆盖已有文件）。
 */
export function scaffoldProject(root: string, name: string, mode: ProductionMode): { created: string[] } {
    // 已创建文件
    const created: string[] = [];
    // 目录
    for (const d of [WORKFLOWS_DIR, INPUTS_DIR, FINAL_DIR, LOG_DIR, RELAY_DIR]) {
        ensureDir(join(root, d));
    }
    // project.json
    const projectFile = join(root, PROJECT_FILE);
    if (!existsSync(projectFile)) {
        writeFileAtomically(projectFile, JSON.stringify(projectTemplate(name, mode), null, 2) + "\n");
        created.push(PROJECT_FILE);
    }
    // story 骨架（含默认 ep01）
    const story = initStory(root, name);
    created.push(...story.created);
    // 首集分镜模板（只填充空分镜）
    const firstShots = join(episodeDir(root, "ep01"), SHOTS_FILE);
    if (existsSync(firstShots)) {
        try {
            // 当前分镜
            const current = JSON.parse(readFileSync(firstShots, "utf8")) as { shots?: unknown[] };
            if (!Array.isArray(current.shots) || current.shots.length === 0) {
                writeFileAtomically(firstShots, JSON.stringify(shotsTemplate(), null, 2) + "\n");
                created.push(`episodes/ep01/${SHOTS_FILE}`);
            }
        } catch {
            // 坏文件留给 story validate 报错
        }
    }
    // 空 workflow 占位（workflow new/import 可直接替换空图）
    const wf = join(root, WORKFLOWS_DIR, "t2v.json");
    if (!existsSync(wf)) {
        writeFileAtomically(wf, "{}\n");
        created.push(`${WORKFLOWS_DIR}/t2v.json`);
    }
    // .gitattributes（LFS）
    const attrs = join(root, ".gitattributes");
    if (!existsSync(attrs)) {
        writeFileAtomically(
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
export async function detectPython(log: Logger): Promise<PythonInfo> {
    // python3 --version
    const r = await execCapture("python3", ["--version"], { timeoutMs: 15_000 });
    if (r.code !== 0) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message:
                "未找到可用的 python3（ComfyUI 依赖安装需要 ≥3.10）。Ubuntu：apt install python3 python3-venv；macOS：brew install python",
        });
    }
    // 版本信息
    const info = parsePythonVersion(r.stdout);
    if (info === null) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message: `无法解析 python3 版本：${r.stdout.trim()}`,
        });
    }
    if (info.major < 3 || (info.major === 3 && info.minor < 10)) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message: `python3 版本过低（${r.stdout.trim()}，要求 ≥${MIN_PYTHON}）`,
        });
    }
    log(`python3 就绪：${r.stdout.trim()}`);
    return info;
}

/**
 * local 模式前置检查：git、python3 >= 3.10、ensurepip。
 * 在创建项目骨架与部署之前调用，避免失败后留下半成品。
 */
export async function assertLocalPrereqs(log: Logger): Promise<void> {
    // Git 探测结果
    const git = await tryExecCapture("git", ["--version"], { timeoutMs: 15_000 });
    // Python 探测结果
    const python = await tryExecCapture("python3", ["--version"], { timeoutMs: 15_000 });
    // Python 版本信息
    const pythonInfo = python !== null && python.code === 0 ? parsePythonVersion(python.stdout) : null;
    // ensurepip 探测结果（Python 不可用时不重复探测）
    const ensurepip =
        python !== null && python.code === 0
            ? await tryExecCapture("python3", ["-c", "import ensurepip"], { timeoutMs: 20_000 })
            : null;
    // 缺失或不满足的依赖
    const missing: Array<{ tool: string; reason: string }> = [];
    if (git === null || git.code !== 0) {
        missing.push({ tool: "git", reason: "未找到或不可用" });
    }
    if (python === null || python.code !== 0) {
        missing.push({ tool: "python3", reason: "未找到或不可用" });
    } else if (pythonInfo === null) {
        missing.push({ tool: "python3", reason: `无法解析版本：${python.stdout.trim()}` });
    } else if (pythonInfo.major < 3 || (pythonInfo.major === 3 && pythonInfo.minor < 10)) {
        missing.push({ tool: "python3", reason: `版本 ${pythonInfo.version} 过低（要求 >= ${MIN_PYTHON}）` });
    } else if (ensurepip === null || ensurepip.code !== 0) {
        missing.push({ tool: "ensurepip", reason: "python3 缺少 ensurepip，无法创建带 pip 的 venv" });
    }
    if (missing.length > 0) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message: `local 模式依赖检查未通过：${missing.map((m) => `${m.tool}（${m.reason}）`).join("；")}`,
            hint: "按 next_actions 安装缺失依赖后重试；只连接远端请使用 init --mode=remote",
            details: {
                stage: "preflight",
                missing,
                git: git !== null && git.code === 0 ? git.stdout.trim() : null,
                python: pythonInfo?.version ?? null,
            },
            nextActions: localPrereqActions(),
        });
    }
    log(`前置检查通过：${git !== null ? git.stdout.trim() : "git"}，Python ${pythonInfo?.version ?? "unknown"}`);
}

/**
 * 平台化 local 依赖安装命令。
 */
function localPrereqActions(): string[] {
    switch (process.platform) {
        case "darwin":
            return ["brew install git python", "重跑 daoyan init --mode=local"];
        case "win32":
            return [
                "winget install --id Git.Git -e",
                "winget install --id Python.Python.3.12 -e",
                "重跑 daoyan init --mode=local",
            ];
        default:
            return ["sudo apt-get install -y git python3 python3-venv", "重跑 daoyan init --mode=local"];
    }
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
 * ensurepip 预检：缺少时给出与 Python 版本匹配的安装命令，不自动执行 apt。
 */
async function ensurepipPreflight(system: PythonInfo, venvDir: string): Promise<void> {
    // ensurepip 导入检测
    const r = await execCapture("python3", ["-c", "import ensurepip"], { timeoutMs: 20_000 });
    if (r.code === 0) return;
    // 与版本匹配的 Debian/Ubuntu 包名
    const aptPackage = `python${system.major}.${system.minor}-venv`;
    // 平台提示
    const platformHint =
        process.platform === "linux"
            ? `Ubuntu/Debian 请安装：apt-get install -y ${aptPackage}（或元包 python3-venv）`
            : process.platform === "darwin"
              ? "macOS 请执行：brew install python"
              : `请安装带 ensurepip 的 Python ${system.major}.${system.minor}`;
    // 建议的后续命令
    const nextActions =
        process.platform === "darwin"
            ? ["brew install python", "rm -rf engine/.venv", "daoyan init --mode=local"]
            : [`apt-get install -y ${aptPackage}`, "rm -rf engine/.venv", "daoyan init --mode=local"];
    throw new DaoyanCliError({
        code: "provision_failed",
        message:
            `当前 Python ${system.version} 缺少 ensurepip，无法创建带 pip 的 venv。\n` +
            `${platformHint}\n` +
            "安装后删除 engine/.venv，再重跑 daoyan init。",
        hint: "dycli 不自动执行 apt（可能触发系统服务重启）；安装 venv 包后重试。",
        details: {
            stage: "ensurepip",
            python: system.version,
            venv_dir: venvDir,
            last_error: (r.stderr || r.stdout).trim().slice(-2000),
            ...(process.platform === "linux"
                ? { apt_packages: [aptPackage, "python3-venv"] }
                : { brew_package: "python" }),
            next_actions: nextActions,
        },
        nextActions,
    });
}

/**
 * 读取 venv Python 版本；不可用返回 null。
 */
async function venvPythonInfo(venvDir: string): Promise<PythonInfo | null> {
    // venv Python
    const python = join(venvDir, "bin", "python");
    if (!existsSync(python)) return null;
    // 版本查询结果
    const r = await execCapture(python, ["-c", "import sys; print('%d.%d.%d' % sys.version_info[:3])"], {
        timeoutMs: 15_000,
    });
    if (r.code !== 0) return null;
    return parsePythonVersion(r.stdout);
}

/**
 * venv 是否可用：bin/python + bin/pip 且 `python -m pip --version` 成功。
 */
export async function venvReady(venvDir: string): Promise<boolean> {
    // venv Python 信息
    const info = await venvPythonInfo(venvDir);
    if (info === null) return false;
    if (!existsSync(join(venvDir, "bin", "pip"))) return false;
    // pip 自检
    const r = await execCapture(join(venvDir, "bin", "python"), ["-m", "pip", "--version"], { timeoutMs: 60_000 });
    return r.code === 0;
}

/**
 * 创建/修复 Python venv；返回 venv 的 Python 版本。
 * 已存在但 pip 不可用时删除重建；系统缺少 ensurepip 时给出准确的 apt 提示。
 */
export async function createVenv(root: string, venvDir: string, log: Logger): Promise<PythonInfo> {
    if (existsSync(join(venvDir, "bin", "python"))) {
        // 已有 venv 的 Python 信息
        const existing = await venvPythonInfo(venvDir);
        // pip 是否可用
        let pipOk = false;
        if (existing !== null) {
            // pip 自检结果
            const pip = await execCapture(join(venvDir, "bin", "python"), ["-m", "pip", "--version"], {
                timeoutMs: 60_000,
            });
            pipOk = pip.code === 0 && existsSync(join(venvDir, "bin", "pip"));
        }
        if (existing !== null && pipOk) {
            log(`复用已有 venv：${venvDir}（Python ${existing.version}）`);
            return existing;
        }
        log(`检测到不完整的 venv（缺少可用 pip），删除后重建：${venvDir}`);
        rmSync(venvDir, { recursive: true, force: true });
    }
    // 系统 Python 版本
    const system = await detectPython(log);
    await ensurepipPreflight(system, venvDir);
    log(`创建虚拟环境 ${venvDir} ...`);
    // venv 创建结果
    const r = await execCapture("python3", ["-m", "venv", venvDir], {
        cwd: root,
        timeoutMs: VENV_TIMEOUT_MS,
    });
    if (r.code !== 0) {
        rmSync(venvDir, { recursive: true, force: true });
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `python3 -m venv 失败（退出码 ${r.code}）。Ubuntu 需 python3-venv 包`,
            details: {
                stage: "venv",
                python: system.version,
                venv_dir: venvDir,
                last_error: (r.stderr || r.stdout).trim().slice(-2000),
            },
        });
    }
    // 创建后的 venv Python
    const info = await venvPythonInfo(venvDir);
    if (info === null || !existsSync(join(venvDir, "bin", "pip"))) {
        rmSync(venvDir, { recursive: true, force: true });
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `venv 创建完成但缺少 python/pip：${venvDir}`,
            details: { stage: "venv", python: system.version, venv_dir: venvDir },
        });
    }
    log(`venv 就绪：Python ${info.version}`);
    return info;
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
    if (existsSync(target)) {
        // 空目录（上次 clone 失败）：删除后重新 clone
        if (readdirSync(target).length === 0) {
            rmSync(target, { recursive: true, force: true });
        } else {
            // 已存在的非 git 目录（用户自装 ComfyUI / custom node）不覆盖、不 clone
            log(`目录已存在且不是 git 检出，保留现有内容：${target}`);
            return;
        }
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
 * 单次 pip install（不判定失败，交给调用方决定是否回退）。
 */
async function runPipAttempt(opts: {
    root: string;
    venvDir: string;
    packageArgs: string[];
    indexUrl: string;
    extraArgs?: string[];
    noCache: boolean;
}): Promise<ExecResult> {
    // pip 可执行文件
    const pip = join(opts.venvDir, "bin", "pip");
    // pip 参数
    const args = [
        "install",
        ...opts.packageArgs,
        ...pipIndexArgs(opts.indexUrl),
        "--retries",
        PIP_RETRIES,
        "--timeout",
        PIP_TIMEOUT_SECONDS,
        ...(opts.noCache ? ["--no-cache-dir"] : []),
        ...(opts.extraArgs ?? []),
    ];
    return execStream(pip, args, { cwd: opts.root, timeoutMs: PIP_INSTALL_TIMEOUT_MS });
}

/**
 * pip install：先主源，失败后回退 fallback（若配置）。
 */
async function pipInstallWithFallback(opts: {
    root: string;
    venvDir: string;
    packageArgs: string[];
    options: ResolvedToolchainOptions;
    log: Logger;
    label: string;
    stage: string;
}): Promise<string> {
    // 依次尝试的源
    const mirrors = [opts.options.mirror];
    if (opts.options.fallbackMirror !== null) mirrors.push(opts.options.fallbackMirror);
    // 最后一次失败结果
    let last: ExecResult | null = null;
    // 最后一次使用的源
    let lastMirror = opts.options.mirror;
    for (let i = 0; i < mirrors.length; i++) {
        // 当前源
        const mirror = mirrors[i] as string;
        opts.log(`${opts.label}：使用${i === 0 ? "主源" : " fallback 源"} ${mirror} ...`);
        // 当前尝试结果
        const r = await runPipAttempt({
            root: opts.root,
            venvDir: opts.venvDir,
            packageArgs: opts.packageArgs,
            indexUrl: mirror,
            noCache: opts.options.noCache,
        });
        if (r.code === 0) return mirror;
        last = r;
        lastMirror = mirror;
        if (i < mirrors.length - 1) {
            opts.log(`${opts.label} 主源失败（退出码 ${r.code}），回退 ${mirrors[i + 1]} 重试 ...`);
        }
    }
    throw new DaoyanCliError({
        code: "provision_failed",
        message: `${opts.label}安装失败（退出码 ${last !== null ? last.code : -1}，最后使用的源 ${lastMirror}）`,
        hint: "已尝试主源与 fallback；可用 --mirror / --fallback-mirror 指定可达镜像，或加 --no-cache 重试",
        details: {
            stage: opts.stage,
            mirrors,
            exit_code: last !== null ? last.code : -1,
            last_error: last !== null ? last.stderr.trim().slice(-4000) : null,
        },
    });
}

/**
 * 在 venv 内安装 ComfyUI 依赖（主源失败自动回退）。
 */
export async function pipInstall(
    root: string,
    venvDir: string,
    options: ResolvedToolchainOptions,
    log: Logger,
    requirements?: string,
): Promise<string> {
    // 依赖清单
    const req = requirements ?? join(root, "engine", "ComfyUI", "requirements.txt");
    if (!existsSync(req)) {
        throw new DaoyanCliError({ code: "provision_failed", message: `缺少 ${req}（clone 未完成？）` });
    }
    log(`安装 ComfyUI 依赖（pip install -r ${req}，可能需要下载 torch，耗时较长）...`);
    // 实际使用的源
    const used = await pipInstallWithFallback({
        root,
        venvDir,
        packageArgs: ["-r", req],
        options,
        log,
        label: "ComfyUI 依赖",
        stage: "requirements",
    });
    log(`ComfyUI 依赖安装完成（源：${used}）`);
    return used;
}

/**
 * 安装 custom nodes（repo + ref）。
 */
export async function installCustomNodes(
    root: string,
    venvDir: string,
    nodes: CustomNodeSpec[],
    options: ResolvedToolchainOptions,
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
            // 实际使用的源
            const used = await pipInstallWithFallback({
                root,
                venvDir,
                packageArgs: ["-r", req],
                options,
                log,
                label: `custom node ${node.name} 依赖`,
                stage: `custom_node:${node.name}`,
            });
            log(`${node.name} 依赖安装完成（源：${used}）`);
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
 * custom nodes 规格 + 已安装目录/requirements 的稳定哈希。
 * 目录缺失或 requirements 变化都会让 marker 失效。
 */
function customNodesHash(nodes: CustomNodeSpec[], comfyDir: string): string {
    return sha256(
        JSON.stringify(
            nodes.map((n) => {
                // node 安装目录
                const dir = join(comfyDir, "custom_nodes", n.name);
                // node requirements
                const req = join(dir, "requirements.txt");
                return {
                    name: n.name,
                    repo: n.repo,
                    ref: n.ref ?? null,
                    present: existsSync(dir),
                    requirements_sha256: existsSync(req) ? sha256File(req) : null,
                };
            }),
        ),
    );
}

/**
 * 读取 pip show 的版本；未安装返回 null。
 */
async function pipShowVersion(venvDir: string, pkg: string): Promise<string | null> {
    // pip show 结果
    const r = await execCapture(join(venvDir, "bin", "pip"), ["show", pkg], { timeoutMs: 60_000 });
    if (r.code !== 0) return null;
    // Version 行
    const m = /^Version:\s*(.+)$/m.exec(r.stdout);
    return m !== null ? (m[1] as string).trim() : null;
}

/**
 * requirements.txt 中显式固定的 torch / torchvision 版本。
 */
function torchPinsInFile(file: string): Array<{ package: "torch" | "torchvision"; version: string }> {
    // 解析结果
    const out: Array<{ package: "torch" | "torchvision"; version: string }> = [];
    for (const line of readFileSync(file, "utf8").split("\n")) {
        // 去掉注释后的行
        const trimmed = (line.split("#")[0] ?? "").trim();
        // pin 匹配
        const m = /^(torch|torchvision)\s*==\s*([^\s;]+)/.exec(trimmed);
        if (m !== null) {
            out.push({ package: m[1] as "torch" | "torchvision", version: m[2] as string });
        }
    }
    return out;
}

/**
 * requirements 若把 torch pin 到与所选 CUDA wheel 不同的版本，提前失败而不是静默覆盖。
 */
async function assertRequirementsCompatible(reqFile: string, venvDir: string, plan: TorchPlan): Promise<void> {
    if (plan.backend === "cpu" && plan.cpuSource !== "forced") return;
    // requirements 中的 torch pin
    const pins = torchPinsInFile(reqFile);
    if (pins.length === 0) return;
    // 冲突项
    const conflicts: Array<{ package: string; pin: string; installed: string }> = [];
    for (const pin of pins) {
        // 已安装版本
        const installed = await pipShowVersion(venvDir, pin.package);
        if (installed === null) continue;
        // 忽略 local version（+cuXXX）
        const installedBase = installed.split("+")[0] ?? installed;
        // pin 的公共版本
        const pinBase = pin.version.split("+")[0] ?? pin.version;
        if (installedBase !== pinBase) conflicts.push({ package: pin.package, pin: pin.version, installed });
    }
    if (conflicts.length === 0) return;
    throw new DaoyanCliError({
        code: "provision_failed",
        message: "requirements.txt 固定了与所选 CUDA torch 不一致的版本，已停止以避免覆盖",
        hint: "修改 requirements.txt 的 torch/torchvision pin，或使用 --torch-cpu 显式安装 CPU 版",
        details: {
            stage: "requirements_conflict",
            torch_tag: plan.tag,
            torch_index: plan.indexRoot,
            conflicts,
        },
    });
}

/**
 * 安装 torch/torchvision（CUDA tag 或显式 CPU index）。
 */
async function installTorch(opts: {
    root: string;
    venvDir: string;
    plan: TorchPlan;
    options: ResolvedToolchainOptions;
    log: Logger;
    forceReinstall: boolean;
}): Promise<void> {
    // 平台默认 torch：不预装，交给 requirements
    if (opts.plan.installIndexUrl === null) {
        opts.log("使用平台默认 torch（不预装独立 wheel）");
        return;
    }
    // 展示标签
    const label = opts.plan.backend === "cuda" ? `torch（${opts.plan.tag}）` : "torch（CPU）";
    opts.log(`安装 ${label}：index ${opts.plan.installIndexUrl}${opts.forceReinstall ? "（强制重装）" : ""} ...`);
    // 安装结果
    const r = await runPipAttempt({
        root: opts.root,
        venvDir: opts.venvDir,
        packageArgs: ["torch", "torchvision"],
        indexUrl: opts.plan.installIndexUrl,
        ...(opts.forceReinstall ? { extraArgs: ["--force-reinstall"] } : {}),
        noCache: opts.options.noCache,
    });
    if (r.code !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `${label} 安装失败（退出码 ${r.code}）`,
            hint: "检查 --torch-index 是否可达，或改用 --torch-cpu；也可是驱动与 wheel 不匹配",
            details: {
                stage: "torch",
                driver: opts.plan.gpu?.driver ?? null,
                cuda_max: opts.plan.gpu?.cudaMax ?? null,
                compute_cap: opts.plan.gpu?.computeCap ?? null,
                python: opts.plan.python.version,
                platform: opts.plan.platform,
                torch_tag: opts.plan.tag,
                torch_index: opts.plan.installIndexUrl,
                last_error: r.stderr.trim().slice(-4000),
                next_actions: [
                    "daoyan init --mode=local --torch-index <镜像> ...",
                    "升级 NVIDIA 驱动后重试",
                    "daoyan init --mode=local --torch-cpu ...",
                ],
            },
        });
    }
}

/**
 * 构造 smoke test 失败错误（含可操作的 details）。
 */
function smokeFailureError(
    plan: TorchPlan,
    smoke: SmokeResult,
    opts: { stage: string; attemptedTags: string[]; offendingNodes?: string[] },
): DaoyanCliError {
    return new DaoyanCliError({
        code: "provision_failed",
        message: `torch 安装后自检失败：${smoke.error ?? "未知错误"}`,
        hint: "按 details 判断是驱动/CUDA 不匹配还是 custom node 覆盖了 torch；不要手工猜版本",
        details: {
            stage: opts.stage,
            driver: plan.gpu?.driver ?? null,
            cuda_max: plan.gpu?.cudaMax ?? null,
            compute_cap: plan.gpu?.computeCap ?? null,
            python: plan.python.version,
            platform: plan.platform,
            torch_tag: plan.tag,
            torch: smoke.torch,
            torch_cuda: smoke.torchCuda,
            torchvision: smoke.torchvision,
            available: smoke.available,
            error_class: smoke.errorClass,
            attempted_tags: opts.attemptedTags,
            offending_nodes: opts.offendingNodes ?? [],
            next_actions: [
                "daoyan init --mode=local --torch-cuda cu124 ...",
                "daoyan init --mode=local --torch-index <镜像> ...",
                "升级 NVIDIA 驱动后重试",
                "daoyan init --mode=local --torch-cpu ...",
            ],
        },
    });
}

/**
 * 安装 torch 并做一次真实 CUDA 自检；失败时最多换一个更低 tag 重试一次。
 */
async function installTorchAndVerify(opts: {
    root: string;
    venvDir: string;
    plan: TorchPlan;
    options: ResolvedToolchainOptions;
    log: Logger;
}): Promise<{ plan: TorchPlan; smoke: SmokeResult | null }> {
    // 无 GPU 的自动 CPU 模式：不预装 torch，等 requirements 安装后由最终自检覆盖
    if (opts.plan.backend === "cpu" && opts.plan.cpuSource !== "forced") {
        opts.log("未检测到 NVIDIA GPU：跳过 torch 预安装，由 requirements 安装平台默认版本");
        return { plan: opts.plan, smoke: null };
    }
    // 显式 CPU 模式：从 CPU index 安装后做 import 自检，不重试
    if (opts.plan.backend === "cpu") {
        await installTorch({ ...opts, forceReinstall: false });
        // 当前计划对应的自检
        const smoke = await runSmokeTest(opts.venvDir, "cpu");
        if (!smoke.ok) throw smokeFailureError(opts.plan, smoke, { stage: "smoke", attemptedTags: [] });
        return { plan: opts.plan, smoke };
    }
    // CUDA：按候选 tag 依次尝试
    for (let i = 0; i < opts.plan.candidates.length; i++) {
        // 当前 tag
        const tag = opts.plan.candidates[i] as string;
        // 当前计划
        const plan = torchPlanForTag(opts.plan, tag);
        await installTorch({ ...opts, plan, forceReinstall: i > 0 });
        // CUDA 自检
        const smoke = await runSmokeTest(opts.venvDir, "cuda");
        if (smoke.ok) return { plan, smoke };
        // 可重试的错误类型
        const retryable =
            smoke.errorClass === "driver" || smoke.errorClass === "kernel" || smoke.errorClass === "device_function";
        if (!retryable || i === opts.plan.candidates.length - 1) {
            throw smokeFailureError(plan, smoke, {
                stage: "smoke",
                attemptedTags: opts.plan.candidates.slice(0, i + 1),
            });
        }
        opts.log(`CUDA 自检失败（${smoke.errorClass}），改用更低 tag ${opts.plan.candidates[i + 1]} 重试一次 ...`);
    }
    // 理论上不可达
    throw smokeFailureError(
        opts.plan,
        {
            ok: false,
            torch: null,
            torchvision: null,
            torchCuda: null,
            available: null,
            device: null,
            error: "没有可用的 CUDA 候选 tag",
            errorClass: "unknown",
        },
        { stage: "smoke", attemptedTags: opts.plan.candidates },
    );
}

/**
 * 找出可能覆盖 torch 的 custom nodes（仅用于失败详情）。
 */
function offendingNodes(nodes: CustomNodeSpec[], comfyDir: string, installedTorch: string | null): string[] {
    if (installedTorch === null) return [];
    // 已安装 torch 的公共版本
    const installedBase = installedTorch.split("+")[0] ?? installedTorch;
    // 冲突的 node
    const out: string[] = [];
    for (const node of nodes) {
        // node requirements
        const req = join(comfyDir, "custom_nodes", node.name, "requirements.txt");
        if (!existsSync(req)) continue;
        // torch pin
        const conflicts = torchPinsInFile(req).some(
            (p) => p.package === "torch" && (p.version.split("+")[0] ?? p.version) !== installedBase,
        );
        if (conflicts) out.push(node.name);
    }
    return out;
}

/**
 * 输出工具链探测结果（不涉及 index 选择）。
 */
function logToolchainPlan(plan: TorchPlan, log: Logger): void {
    if (plan.backend === "cuda") {
        log(
            `工具链：驱动 ${plan.gpu?.driver ?? "unknown"}，CUDA ≤ ${plan.gpu?.cudaMax ?? "unknown"}，` +
                `compute ${plan.gpu?.computeCap ?? "unknown"}${plan.tag !== null ? ` → ${plan.tag}` : ""}`,
        );
        return;
    }
    // CPU 原因
    const reason =
        plan.cpuSource === "forced"
            ? "显式 --torch-cpu"
            : plan.cpuSource === "platform"
              ? "非 Linux 平台"
              : "未检测到 NVIDIA GPU";
    log(`工具链：CPU 模式（${reason}）`);
}

/**
 * 生成工具链摘要。
 */
function summarizeToolchain(marker: ToolchainMarker, reused: boolean): ToolchainSummary {
    return {
        python: marker.python,
        platform: marker.platform,
        driver: marker.driver,
        cuda_max: marker.cuda_max,
        compute_cap: marker.compute_cap,
        torch_backend: marker.torch_backend,
        torch_tag: marker.torch_tag,
        torch: marker.torch,
        torchvision: marker.torchvision,
        reused,
    };
}

/**
 * 部署（或复用）一个 ComfyUI 安装，并保证工具链可用。
 */
async function provisionEngine(opts: {
    root: string;
    baseDir: string;
    version: string;
    project: ProjectConfig;
    toolchain?: ToolchainOptions;
    log: Logger;
}): Promise<{ installed: boolean; marker: ToolchainMarker; summary: ToolchainSummary }> {
    // venv 与 ComfyUI 目录
    const venvDir = join(opts.baseDir, ".venv");
    // ComfyUI 源码目录
    const comfyDir = join(opts.baseDir, "ComfyUI");
    // 1. clone / checkout（先保证源码版本正确，再决定依赖是否可复用）
    await cloneRepo(opts.root, COMFY_REPO, comfyDir, opts.version, opts.log);
    // 是否切换了版本
    let switched = false;
    if (existsSync(join(comfyDir, ".git"))) {
        switched = await checkoutComfyVersion(comfyDir, opts.version, opts.log);
    } else if (!existsSync(join(comfyDir, "main.py"))) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `ComfyUI 目录无效：${comfyDir}（缺少 main.py）`,
        });
    } else {
        opts.log("ComfyUI 目录不是 git 检出，跳过版本切换（可用 engine use 指向其他目录）");
    }
    // requirements
    const reqFile = join(comfyDir, "requirements.txt");
    if (!existsSync(reqFile)) {
        throw new DaoyanCliError({ code: "provision_failed", message: `缺少 ${reqFile}（clone 未完成？）` });
    }
    // requirements 哈希
    const requirementsSha = sha256File(reqFile);
    // custom nodes 规格
    const nodes = opts.project.comfyui?.custom_nodes ?? [];
    // custom nodes 哈希（复用判定；缺失目录/requirements 变化会让 marker 失效）
    const nodesSha = customNodesHash(nodes, comfyDir);
    // 安装参数
    const options = resolveToolchainOptions(opts.toolchain);
    // venv 是否健康
    const healthy = await venvReady(venvDir);
    // venv Python
    let python: PythonInfo;
    if (healthy) {
        // 复用时的 Python 信息
        const info = await venvPythonInfo(venvDir);
        if (info === null) {
            throw new DaoyanCliError({ code: "provision_failed", message: `无法读取 venv Python：${venvDir}` });
        }
        python = info;
        opts.log(`复用已有 venv：${venvDir}（Python ${python.version}）`);
    } else {
        python = await createVenv(opts.root, venvDir, opts.log);
    }
    // 2. 工具链上下文：只探测驱动，不访问 wheel index（离线也能判断复用）
    const context = await inspectTorchPlan({
        python,
        forceCpu: options.torchCpu,
        forcedCuda: options.torchCuda,
        indexRoot: options.torchIndex,
    });
    logToolchainPlan(context, opts.log);
    // 3. 复用判定
    // 已存在的 marker
    const existingMarker = readToolchainMarker(venvDir);
    // 不可复用原因
    let mismatch: string | null = null;
    if (switched) mismatch = "ComfyUI 版本已切换";
    else if (!healthy) mismatch = "venv 已重建";
    else if (existingMarker === null) mismatch = "缺少工具链标记";
    else {
        mismatch = markerMismatchReason(existingMarker, {
            python: python.version,
            platform: context.platform,
            comfyuiTag: opts.version,
            requirementsSha256: requirementsSha,
            customNodesSha256: nodesSha,
            plan: context,
        });
    }
    if (mismatch === null && existingMarker !== null) {
        // 依赖一致性
        const check = await runPipCheck(venvDir);
        if (!check.ok) {
            mismatch = `pip check 失败：${check.output}`;
        } else {
            // 真实自检（CUDA 模式会分配显存）
            const smoke = await runSmokeTest(venvDir, context.backend);
            if (!smoke.ok) {
                mismatch = `自检失败：${smoke.error ?? "未知错误"}`;
            } else if (smoke.torch !== existingMarker.torch || smoke.torchvision !== existingMarker.torchvision) {
                mismatch = `torch 版本已变化（marker ${existingMarker.torch ?? "unknown"} → 实际 ${smoke.torch ?? "unknown"}）`;
            } else {
                opts.log("引擎已安装（工具链校验通过），复用现有目录");
                return { installed: false, marker: existingMarker, summary: summarizeToolchain(existingMarker, true) };
            }
        }
    }
    if (mismatch !== null) opts.log(`重新安装依赖：${mismatch}`);
    // 4. 需要重装时再访问 index，选择与驱动匹配的 CUDA tag
    const plan = await resolveTorchPlan({
        python,
        forceCpu: options.torchCpu,
        forcedCuda: options.torchCuda,
        indexRoot: options.torchIndex,
        log: opts.log,
    });
    if (plan.tag !== null && plan.tag !== context.tag) {
        opts.log(`工具链：选择 ${plan.tag}（候选 ${plan.candidates.join(" / ")}）`);
    }
    // 5. 清除旧 marker（成功后再写）
    rmSync(join(venvDir, TOOLCHAIN_MARKER_FILE), { force: true });
    // 6. 安装 torch 并做 CUDA 自检
    const torchResult = await installTorchAndVerify({
        root: opts.root,
        venvDir,
        plan,
        options,
        log: opts.log,
    });
    // 7. 冲突检查（requirements 不得静默覆盖已选 torch）
    await assertRequirementsCompatible(reqFile, venvDir, torchResult.plan);
    // 8. ComfyUI 依赖 + custom nodes
    await pipInstall(opts.root, venvDir, options, opts.log, reqFile);
    await installCustomNodes(opts.root, venvDir, nodes, options, opts.log, comfyDir);
    // 9. 最终一致性检查（custom node 可能替换 torch）
    const finalCheck = await runPipCheck(venvDir);
    if (!finalCheck.ok) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: "依赖一致性检查失败（pip check）",
            hint: "按 details.output 修复冲突的包；custom node 可能固定了不兼容版本",
            details: {
                stage: "pip_check",
                output: finalCheck.output,
                custom_nodes: nodes.map((n) => n.name),
            },
        });
    }
    // 10. 最终自检
    const finalSmoke = await runSmokeTest(venvDir, torchResult.plan.backend);
    if (!finalSmoke.ok) {
        // 已安装 torch 版本
        const installedTorch = await pipShowVersion(venvDir, "torch");
        throw smokeFailureError(torchResult.plan, finalSmoke, {
            stage: "smoke_final",
            attemptedTags: torchResult.plan.candidates,
            offendingNodes: offendingNodes(nodes, comfyDir, installedTorch),
        });
    }
    // 11. 写 marker（custom nodes 安装完成后重新计算哈希）
    // 最终 custom nodes 哈希
    const finalNodesSha = customNodesHash(nodes, comfyDir);
    // 工具链标记
    const marker = buildToolchainMarker({
        plan: torchResult.plan,
        smoke: finalSmoke,
        comfyuiTag: opts.version,
        requirementsSha256: requirementsSha,
        customNodesSha256: finalNodesSha,
    });
    writeToolchainMarker(venvDir, marker);
    return { installed: true, marker, summary: summarizeToolchain(marker, false) };
}

/**
 * 部署 local 引擎（幂等：marker + pip check + smoke test 全部通过才复用）。
 */
export async function deployLocalEngine(opts: {
    root: string;
    project: ProjectConfig;
    version: string;
    toolchain?: ToolchainOptions;
    log: Logger;
}): Promise<{ installed: boolean; version: string; toolchain: ToolchainSummary }> {
    // 部署结果
    const result = await provisionEngine({
        root: opts.root,
        baseDir: join(opts.root, "engine"),
        version: opts.version,
        project: opts.project,
        ...(opts.toolchain !== undefined ? { toolchain: opts.toolchain } : {}),
        log: opts.log,
    });
    return { installed: result.installed, version: opts.version, toolchain: result.summary };
}

/**
 * 在指定目录安装一个版本的 ComfyUI（engine/versions/<tag> 等）。
 */
export async function installEngineAt(opts: {
    root: string;
    baseDir: string;
    version: string;
    project: ProjectConfig;
    toolchain?: ToolchainOptions;
    log: Logger;
}): Promise<{ comfyDir: string; venvDir: string; toolchain: ToolchainSummary }> {
    // 部署结果
    const result = await provisionEngine({
        root: opts.root,
        baseDir: opts.baseDir,
        version: opts.version,
        project: opts.project,
        ...(opts.toolchain !== undefined ? { toolchain: opts.toolchain } : {}),
        log: opts.log,
    });
    return {
        comfyDir: join(opts.baseDir, "ComfyUI"),
        venvDir: join(opts.baseDir, ".venv"),
        toolchain: result.summary,
    };
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
