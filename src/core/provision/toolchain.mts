/** Python/torch 工具链 —— 探测驱动与 CUDA 能力，选择匹配的 torch wheel，并验证安装结果。
 *  约束：不执行 apt、不升级驱动、不触碰系统 Python；所有命令只读探测或在 venv 内安装。
 *  marker 放在 venv 内，删除/重建 venv 时自动失效。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { execCapture, tryExecCapture } from "../../shared/exec.mts";
import { nowIso, writeJsonAtomic } from "../../shared/fs.mts";

// PyTorch 官方 wheel index 根
export const DEFAULT_TORCH_INDEX = "https://download.pytorch.org/whl";
// index 不可达时的候选 tag（按新到旧）；真实可用性仍以 wheel 页面为准
export const FALLBACK_CUDA_TAGS: readonly string[] = ["cu130", "cu129", "cu128", "cu126", "cu124", "cu121", "cu118"];
// venv 内的工具链标记文件名
export const TOOLCHAIN_MARKER_FILE = ".dycli-toolchain.json";
// 标记 schema 版本
export const TOOLCHAIN_MARKER_SCHEMA = 1;
// 最多验证多少个候选 tag（第一个用于安装，其余用于一次重试）
const MAX_CANDIDATE_CHECKS = 3;
// CUDA 13 要求的最低 compute capability（Maxwell/Pascal/Volta 不再支持）
const CUDA13_MIN_COMPUTE = 7.5;
// wheel index 请求超时
const INDEX_TIMEOUT_MS = 20_000;
// nvidia-smi 探测超时
const PROBE_TIMEOUT_MS = 20_000;
// smoke test 超时（首次 CUDA 上下文初始化可能较慢）
const SMOKE_TIMEOUT_MS = 180_000;
// pip check 超时
const PIP_CHECK_TIMEOUT_MS = 120_000;
// smoke test 结果前缀
const SMOKE_PREFIX = "DYCLI_SMOKE ";
// wheel index 响应大小上限（8 MiB）
const INDEX_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Python 版本信息。
 */
export interface PythonInfo {
    /**
     * 规范化版本号（X.Y.Z）。
     */
    version: string;
    /**
     * 主版本。
     */
    major: number;
    /**
     * 次版本。
     */
    minor: number;
    /**
     * 补丁版本。
     */
    patch: number;
}

/**
 * CUDA 版本（major.minor）。
 */
export interface CudaVersion {
    /**
     * 主版本。
     */
    major: number;
    /**
     * 次版本。
     */
    minor: number;
}

/**
 * 单块 NVIDIA GPU 的探测结果。
 */
export interface GpuDevice {
    /**
     * 设备名称。
     */
    name: string;
    /**
     * 驱动版本。
     */
    driver: string;
    /**
     * 驱动支持的最高 CUDA 版本。
     */
    cuda: string | null;
    /**
     * compute capability（如 8.6）。
     */
    computeCap: string | null;
}

/**
 * 主机 GPU 汇总（多卡取最低 compute capability）。
 */
export interface GpuInfo {
    /**
     * 驱动版本（主机级）。
     */
    driver: string;
    /**
     * 驱动支持的最高 CUDA 版本。
     */
    cudaMax: string | null;
    /**
     * 最低 compute capability。
     */
    computeCap: string | null;
    /**
     * 全部设备。
     */
    devices: GpuDevice[];
}

/**
 * torch 安装计划。
 */
export interface TorchPlan {
    /**
     * 后端：CUDA 或 CPU。
     */
    backend: "cuda" | "cpu";
    /**
     * CPU 模式的来源（cuda 时为 null）。
     */
    cpuSource: "forced" | "no-gpu" | "platform" | null;
    /**
     * 选中的 CUDA tag（如 cu130）；CPU 模式为 null。
     */
    tag: string | null;
    /**
     * PyTorch index 根。
     */
    indexRoot: string;
    /**
     * 实际传给 pip --index-url 的地址（含 tag）。
     */
    installIndexUrl: string | null;
    /**
     * venv 的 Python 版本。
     */
    python: PythonInfo;
    /**
     * 平台标签（linux-x64）。
     */
    platform: string;
    /**
     * CPU 架构（x64 / arm64）。
     */
    arch: string;
    /**
     * GPU 探测结果（CPU 模式可能为 null）。
     */
    gpu: GpuInfo | null;
    /**
     * 已验证有可用 wheel 的候选 tag（按优先级）。
     */
    candidates: string[];
    /**
     * 实际检查过的 tag（含因 wheel 缺失被跳过的）。
     */
    attemptedTags: string[];
    /**
     * 是否由用户显式指定 CUDA tag。
     */
    forced: boolean;
}

/**
 * 工具链标记（engine/.venv/.dycli-toolchain.json）。
 */
export interface ToolchainMarker {
    /**
     * 标记 schema。
     */
    schema_version: number;
    /**
     * 写入时间。
     */
    installed_at: string;
    /**
     * venv Python 版本。
     */
    python: string;
    /**
     * 平台标签。
     */
    platform: string;
    /**
     * ComfyUI tag。
     */
    comfyui_tag: string;
    /**
     * requirements.txt 的 SHA-256。
     */
    requirements_sha256: string;
    /**
     * custom nodes 规格的 SHA-256。
     */
    custom_nodes_sha256: string;
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
     * 安装时使用的 CUDA tag。
     */
    torch_tag: string | null;
    /**
     * 安装时使用的 PyTorch index 根。
     */
    torch_index: string | null;
    /**
     * 实际 torch 版本。
     */
    torch: string | null;
    /**
     * 实际 torchvision 版本。
     */
    torchvision: string | null;
}

/**
 * smoke test 结果。
 */
export interface SmokeResult {
    /**
     * 是否通过。
     */
    ok: boolean;
    /**
     * torch 版本。
     */
    torch: string | null;
    /**
     * torchvision 版本。
     */
    torchvision: string | null;
    /**
     * torch 编译时的 CUDA 版本。
     */
    torchCuda: string | null;
    /**
     * torch.cuda.is_available()。
     */
    available: boolean | null;
    /**
     * GPU 设备名。
     */
    device: string | null;
    /**
     * 错误文本（失败时）。
     */
    error: string | null;
    /**
     * 错误分类（用于决定是否换更低 CUDA tag 重试）。
     */
    errorClass: "driver" | "kernel" | "device_function" | "oom" | "unknown" | null;
}

/**
 * tag 筛选结果。
 */
export interface TagSelection {
    /**
     * 通过筛选的 tag（按 CUDA 版本从高到低）。
     */
    candidates: string[];
    /**
     * 被跳过的 tag 与原因。
     */
    skipped: Array<{ tag: string; reason: string }>;
}

/**
 * wheel 可用性检查结果。
 */
export interface WheelCheck {
    /**
     * 被检查的 tag。
     */
    tag: string;
    /**
     * torch 与 torchvision wheel 是否都存在。
     */
    ok: boolean;
    /**
     * 缺失的包名。
     */
    missing: string[];
    /**
     * 网络/解析错误（若有）。
     */
    error: string | null;
}

/**
 * 文本抓取函数（测试可注入）。
 */
export type FetchText = (url: string) => Promise<string>;

/**
 * 解析 Python 版本（接受 `Python 3.12.3` 或 `3.12.3`）。
 */
export function parsePythonVersion(raw: string): PythonInfo | null {
    // 版本匹配结果
    const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(raw.trim());
    if (m === null) return null;
    // 主版本
    const major = Number(m[1]);
    // 次版本
    const minor = Number(m[2]);
    // 补丁版本（缺省 0）
    const patch = m[3] !== undefined ? Number(m[3]) : 0;
    if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;
    return { version: `${major}.${minor}.${patch}`, major, minor, patch };
}

/**
 * 解析 CUDA 版本（`13.0` / `13`）。
 */
export function parseCudaVersion(raw: string | null | undefined): CudaVersion | null {
    if (raw === null || raw === undefined) return null;
    // 版本匹配结果
    const m = /^(\d+)(?:\.(\d+))?$/.exec(raw.trim());
    if (m === null) return null;
    // 主版本
    const major = Number(m[1]);
    // 次版本（缺省 0）
    const minor = m[2] !== undefined ? Number(m[2]) : 0;
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
    return { major, minor };
}

/**
 * 解析 PyTorch CUDA tag（cu118 -> 11.8，cu130 -> 13.0）。
 */
export function parseCudaTag(tag: string): { tag: string; cuda: CudaVersion } | null {
    // tag 匹配结果
    const m = /^cu(\d{2,4})$/i.exec(tag.trim());
    if (m === null) return null;
    // 去掉 cu 后的数字
    const digits = m[1] as string;
    // 最后一位为次版本（cu118 -> 11.8）
    const minor = Number(digits.slice(-1));
    // 其余为主版本
    const major = Number(digits.slice(0, -1));
    // CUDA 实际主版本从 7 开始（cu75 起）；过滤 cu13 这类歧义输入
    if (!Number.isFinite(major) || !Number.isFinite(minor) || major < 7) return null;
    return { tag: `cu${digits}`, cuda: { major, minor } };
}

/**
 * CUDA 版本格式化为 X.Y。
 */
export function formatCudaVersion(v: CudaVersion): string {
    return `${v.major}.${v.minor}`;
}

/**
 * CUDA 版本比较：a<b 返回负数，相等 0，a>b 正数。
 */
export function compareCuda(a: CudaVersion, b: CudaVersion): number {
    return a.major !== b.major ? a.major - b.major : a.minor - b.minor;
}

/**
 * 解析 compute capability（8.6 -> 8.6）。
 */
export function parseComputeCap(raw: string | null | undefined): number | null {
    if (raw === null || raw === undefined) return null;
    // compute capability 匹配结果
    const m = /^(\d+)\.(\d+)$/.exec(raw.trim());
    if (m === null) return null;
    // 主版本
    const major = Number(m[1]);
    // 次版本
    const minor = Number(m[2]);
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
    return major + minor / 10;
}

/**
 * CUDA 13 的架构护栏：compute capability < 7.5 时跳过所有 cu13x。
 */
export function tagSupportsArch(tag: { cuda: CudaVersion }, computeCap: string | null): boolean {
    // compute capability 数值
    const cc = parseComputeCap(computeCap);
    if (cc === null) return true;
    return !(tag.cuda.major >= 13 && cc < CUDA13_MIN_COMPUTE);
}

/**
 * 过滤并排序候选 CUDA tag。
 */
export function selectTorchTags(input: {
    available: readonly string[];
    cudaMax: CudaVersion;
    computeCap: string | null;
}): TagSelection {
    // 通过筛选的 tag
    const candidates: string[] = [];
    // 被跳过的 tag
    const skipped: Array<{ tag: string; reason: string }> = [];
    // 已处理的 tag（去重）
    const seen = new Set<string>();
    for (const raw of input.available) {
        // 解析后的 tag
        const parsed = parseCudaTag(raw);
        if (parsed === null) {
            skipped.push({ tag: raw, reason: "不是合法的 cuXXX tag" });
            continue;
        }
        if (seen.has(parsed.tag)) continue;
        seen.add(parsed.tag);
        if (compareCuda(parsed.cuda, input.cudaMax) > 0) {
            skipped.push({
                tag: parsed.tag,
                reason: `需要 CUDA ${formatCudaVersion(parsed.cuda)}，驱动最高 ${formatCudaVersion(input.cudaMax)}`,
            });
            continue;
        }
        if (!tagSupportsArch(parsed, input.computeCap)) {
            skipped.push({
                tag: parsed.tag,
                reason: `CUDA ${parsed.cuda.major} 不支持 compute capability ${input.computeCap ?? "未知"}`,
            });
            continue;
        }
        candidates.push(parsed.tag);
    }
    candidates.sort((a, b) => {
        // 左侧 CUDA 版本
        const left = parseCudaTag(a);
        // 右侧 CUDA 版本
        const right = parseCudaTag(b);
        if (left === null || right === null) return 0;
        return compareCuda(right.cuda, left.cuda);
    });
    return { candidates, skipped };
}

/**
 * 从 wheel index HTML 中提取 .whl 文件名。
 */
export function extractWheelFiles(html: string): string[] {
    // 输出文件名
    const out: string[] = [];
    // href 匹配
    const re = /href\s*=\s*["']([^"']+\.whl)(?:#[^"']*)?["']/gi;
    // 当前匹配
    let m: RegExpExecArray | null = re.exec(html);
    while (m !== null) {
        // 原始 href
        const href = m[1] as string;
        try {
            out.push(decodeURIComponent(href));
        } catch {
            out.push(href);
        }
        m = re.exec(html);
    }
    return out;
}

/**
 * 判断单个 wheel 文件名是否匹配包名 / Python ABI / 平台。
 */
export function wheelMatchesFile(
    file: string,
    kind: "torch" | "torchvision",
    python: PythonInfo,
    arch: string,
): boolean {
    // 文件名（去掉目录）
    const base = (file.split("/").pop() ?? file).toLowerCase();
    // 平台 token
    const token = arch === "x64" ? "x86_64" : arch === "arm64" ? "aarch64" : arch.toLowerCase();
    if (!base.startsWith(`${kind}-`)) return false;
    if (!base.includes(`-cp${python.major}${python.minor}-`)) return false;
    return new RegExp(`(?:manylinux[^/]*|linux)_${token}\\.whl$`).test(base);
}

/**
 * 判断 index HTML 中是否存在匹配的 wheel。
 */
export function wheelHtmlMatches(
    html: string,
    kind: "torch" | "torchvision",
    python: PythonInfo,
    arch: string,
): boolean {
    // 全部 wheel 文件
    const files = extractWheelFiles(html);
    return files.some((f) => wheelMatchesFile(f, kind, python, arch));
}

/**
 * 读取代理环境变量（大小写兼容；Node fetch 默认不读代理环境变量）。
 */
function proxyFromEnv(): string | undefined {
    return (
        process.env.HTTPS_PROXY ??
        process.env.https_proxy ??
        process.env.ALL_PROXY ??
        process.env.all_proxy ??
        process.env.HTTP_PROXY ??
        process.env.http_proxy
    );
}

/**
 * 代理注入子进程环境（不进入 argv）。
 */
function proxyEnv(proxy: string): NodeJS.ProcessEnv {
    return {
        HTTPS_PROXY: proxy,
        HTTP_PROXY: proxy,
        ALL_PROXY: proxy,
        https_proxy: proxy,
        http_proxy: proxy,
        all_proxy: proxy,
    };
}

/**
 * 通过 curl 抓取 index（配置代理时使用）。
 */
async function fetchTextViaCurl(url: string, proxy: string): Promise<string> {
    // 超时秒数
    const seconds = String(Math.ceil(INDEX_TIMEOUT_MS / 1000));
    // curl 结果
    const r = await tryExecCapture(
        "curl",
        ["-fsSL", "--max-time", seconds, "-H", "user-agent: daoyan-cli-toolchain", url],
        { timeoutMs: INDEX_TIMEOUT_MS + 5_000, env: proxyEnv(proxy) },
    );
    if (r === null) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message: "检测到代理环境变量，但缺少 curl；安装 curl 或取消代理后重试",
            details: { stage: "index", url },
        });
    }
    if (r.code !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `无法访问 ${url}（curl 退出码 ${r.code}）`,
            details: { stage: "index", url, last_error: r.stderr.trim().slice(-2000) },
        });
    }
    if (r.stdout.length > INDEX_MAX_BYTES) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `wheel index 响应过大（${r.stdout.length} bytes）：${url}`,
            details: { stage: "index", url },
        });
    }
    return r.stdout;
}

/**
 * 默认文本抓取（带超时与大小上限；有代理时走 curl）。
 */
async function fetchTextWithTimeout(url: string): Promise<string> {
    // 代理地址
    const proxy = proxyFromEnv();
    if (proxy !== undefined) return fetchTextViaCurl(url, proxy);
    // HTTP 响应
    let res: Response;
    try {
        res = await fetch(url, {
            headers: { "user-agent": "daoyan-cli-toolchain", accept: "text/html" },
            signal: AbortSignal.timeout(INDEX_TIMEOUT_MS),
        });
    } catch (e) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `无法访问 ${url}（${e instanceof Error ? e.message : String(e)}）`,
            details: { stage: "index", url },
        });
    }
    if (!res.ok) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `无法访问 ${url}（HTTP ${res.status}）`,
            details: { stage: "index", url, status: res.status },
        });
    }
    // 响应文本
    const text = await res.text();
    if (text.length > INDEX_MAX_BYTES) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `wheel index 响应过大（${text.length} bytes）：${url}`,
            details: { stage: "index", url },
        });
    }
    return text;
}

/**
 * 发现 index 中提供的 CUDA tag；不可达时返回空列表与错误文本。
 */
export async function discoverCudaTags(
    indexRoot: string,
    fetchText: FetchText = fetchTextWithTimeout,
): Promise<{ tags: string[]; error: string | null }> {
    // index 根地址
    const root = indexRoot.replace(/\/+$/, "");
    // 页面内容
    let html: string;
    try {
        html = await fetchText(`${root}/`);
    } catch (e) {
        return { tags: [], error: e instanceof Error ? e.message : String(e) };
    }
    // 页面中的 tag
    const found = new Set<string>();
    // tag 匹配
    const re = /\bcu\d{2,4}\b/gi;
    // 当前匹配
    let m: RegExpExecArray | null = re.exec(html);
    while (m !== null) {
        // 解析后的 tag
        const parsed = parseCudaTag(m[0]);
        if (parsed !== null) found.add(parsed.tag);
        m = re.exec(html);
    }
    return { tags: [...found], error: null };
}

/**
 * 检查某个 tag 下 torch / torchvision 是否有匹配当前 Python/平台的 wheel。
 */
export async function checkTagWheels(
    tag: string,
    python: PythonInfo,
    arch: string,
    indexRoot: string,
    fetchText: FetchText = fetchTextWithTimeout,
): Promise<WheelCheck> {
    // index 根地址
    const root = indexRoot.replace(/\/+$/, "");
    // 缺失的包
    const missing: string[] = [];
    // 最后一次错误
    let error: string | null = null;
    for (const kind of ["torch", "torchvision"] as const) {
        // 包页面地址
        const url = `${root}/${tag}/${kind}/`;
        try {
            // 包页面内容
            const html = await fetchText(url);
            if (!wheelHtmlMatches(html, kind, python, arch)) missing.push(kind);
        } catch (e) {
            missing.push(kind);
            error = e instanceof Error ? e.message : String(e);
        }
    }
    return { tag, ok: missing.length === 0, missing, error };
}

/**
 * 解析 nvidia-smi 结构化查询输出。
 */
export function parseNvidiaSmiQuery(stdout: string): GpuDevice[] {
    // 解析出的设备
    const devices: GpuDevice[] = [];
    for (const line of stdout.split("\n")) {
        // 去空白
        const trimmed = line.trim();
        if (trimmed === "") continue;
        // CSV 字段
        const fields = trimmed.split(",").map((f) => f.trim());
        if (fields.length < 2) continue;
        // 设备名
        const name = fields[0] as string;
        // 驱动版本
        const driver = fields[1] as string;
        // compute capability（老驱动可能不支持）
        const computeRaw = fields[2] !== undefined && fields[2] !== "[N/A]" ? fields[2] : null;
        // CUDA 版本（老驱动可能不支持）
        const cudaRaw = fields[3] !== undefined && fields[3] !== "[N/A]" ? fields[3] : null;
        devices.push({
            name: name === "" ? "NVIDIA GPU" : name,
            driver,
            cuda: cudaRaw !== null && parseCudaVersion(cudaRaw) !== null ? cudaRaw : null,
            computeCap: computeRaw !== null && parseComputeCap(computeRaw) !== null ? computeRaw : null,
        });
    }
    return devices;
}

/**
 * 从普通 nvidia-smi 输出解析驱动与 CUDA 版本。
 */
export function parseNvidiaSmiText(stdout: string): { driver: string | null; cuda: string | null } {
    // 驱动版本
    const driver = /Driver Version:\s*([\d.]+)/.exec(stdout);
    // CUDA 版本
    const cuda = /CUDA Version:\s*([\d.]+)/.exec(stdout);
    return { driver: driver !== null ? (driver[1] as string) : null, cuda: cuda !== null ? (cuda[1] as string) : null };
}

/**
 * 根据 GPU 名称推断 compute capability（仅用于架构护栏，最终以 smoke test 为准）。
 */
export function inferComputeCap(name: string): string | null {
    // 名称大写
    const n = name.toUpperCase();
    // 已知架构表（顺序敏感：先匹配更具体的型号）
    const table: Array<{ re: RegExp; cap: string }> = [
        { re: /H100|H200|H800|B100|B200|GB200/, cap: "9.0" },
        { re: /RTX\s*50/, cap: "12.0" },
        { re: /RTX\s*40|L40|L4\b/, cap: "8.9" },
        { re: /A100|A30\b/, cap: "8.0" },
        { re: /A10\b|A40|A6000|A5000|RTX\s*30/, cap: "8.6" },
        { re: /RTX\s*20|T4\b|GTX\s*16/, cap: "7.5" },
        { re: /V100/, cap: "7.0" },
        { re: /P100/, cap: "6.0" },
        { re: /P40|P4\b|P6\b|GTX\s*10/, cap: "6.1" },
        { re: /M40|M60/, cap: "5.2" },
    ];
    for (const row of table) {
        if (row.re.test(n)) return row.cap;
    }
    return null;
}

/**
 * 多卡取最低 compute capability。
 */
export function lowestComputeCap(values: Array<string | null>): string | null {
    // 最小 capability 数值
    let best: number | null = null;
    // 对应文本
    let bestText: string | null = null;
    for (const raw of values) {
        // 数值
        const cc = parseComputeCap(raw);
        if (cc === null) continue;
        if (best === null || cc < best) {
            best = cc;
            bestText = raw;
        }
    }
    return bestText;
}

// 完整结构化查询字段
const NVIDIA_QUERY_FIELDS = "name,driver_version,compute_cap,cuda_version";
// 兼容老驱动的精简字段
const NVIDIA_QUERY_BASIC = "name,driver_version";

/**
 * 探测 NVIDIA GPU。
 * 没有 nvidia-smi 时返回 null；命令存在但所有查询失败时返回空设备信息（避免静默装 CPU 版）。
 */
export async function probeNvidiaGpu(): Promise<GpuInfo | null> {
    // 完整查询
    const full = await tryExecCapture(
        "nvidia-smi",
        [`--query-gpu=${NVIDIA_QUERY_FIELDS}`, "--format=csv,noheader,nounits"],
        { timeoutMs: PROBE_TIMEOUT_MS },
    );
    // 是否检测到 nvidia-smi（命令存在但执行失败也算）
    let sawCommand = full !== null;
    // 解析出的设备
    let devices = full !== null && full.code === 0 ? parseNvidiaSmiQuery(full.stdout) : [];
    if (devices.length === 0) {
        // 精简查询（compute_cap / cuda_version 字段不可用）
        const basic = await tryExecCapture(
            "nvidia-smi",
            [`--query-gpu=${NVIDIA_QUERY_BASIC}`, "--format=csv,noheader,nounits"],
            { timeoutMs: PROBE_TIMEOUT_MS },
        );
        sawCommand = sawCommand || basic !== null;
        devices = basic !== null && basic.code === 0 ? parseNvidiaSmiQuery(basic.stdout) : [];
    }
    // 普通输出（补驱动/CUDA/设备名）
    const raw = await tryExecCapture("nvidia-smi", [], { timeoutMs: PROBE_TIMEOUT_MS });
    sawCommand = sawCommand || raw !== null;
    // 普通输出解析结果
    const rawInfo = raw !== null && raw.code === 0 ? parseNvidiaSmiText(raw.stdout) : { driver: null, cuda: null };
    if (devices.length === 0) {
        if (rawInfo.driver === null && rawInfo.cuda === null) {
            // 命令存在但所有查询都失败：返回空 GPU 信息，让上层要求显式 --torch-cuda，而不是静默装 CPU 版
            return sawCommand ? { driver: "unknown", cudaMax: null, computeCap: null, devices: [] } : null;
        }
        return { driver: rawInfo.driver ?? "unknown", cudaMax: rawInfo.cuda, computeCap: null, devices: [] };
    }
    // CUDA 上限（设备字段优先）
    const cudaMax = devices.find((d) => d.cuda !== null)?.cuda ?? rawInfo.cuda;
    // 补全后的设备
    const normalized = devices.map((d) => ({
        ...d,
        cuda: d.cuda ?? rawInfo.cuda,
        computeCap: d.computeCap ?? inferComputeCap(d.name),
    }));
    // 驱动版本
    const driver = normalized.find((d) => d.driver !== "")?.driver ?? rawInfo.driver ?? "unknown";
    // 最低 compute capability
    const computeCap = lowestComputeCap(normalized.map((d) => d.computeCap));
    return { driver, cudaMax, computeCap, devices: normalized };
}

/**
 * 生成工具链上下文：只探测驱动/CUDA/GPU，不访问 wheel index。
 * 用于复用判定（离线也能判断 marker 是否兼容），以及 resolveTorchPlan 的共同前置。
 */
export async function inspectTorchPlan(opts: {
    python: PythonInfo;
    platform?: NodeJS.Platform;
    arch?: string;
    forceCpu?: boolean;
    forcedCuda?: string | null;
    indexRoot?: string;
    gpu?: GpuInfo | null;
}): Promise<TorchPlan> {
    // 平台
    const platform = opts.platform ?? process.platform;
    // 架构
    const arch = opts.arch ?? process.arch;
    // 平台标签
    const platformLabel = `${platform}-${arch}`;
    // PyTorch index 根
    const indexRoot = (opts.indexRoot ?? DEFAULT_TORCH_INDEX).replace(/\/+$/, "");
    if (opts.forceCpu === true) {
        return {
            backend: "cpu",
            cpuSource: "forced",
            tag: null,
            indexRoot,
            installIndexUrl: platform === "linux" ? `${indexRoot}/cpu` : null,
            python: opts.python,
            platform: platformLabel,
            arch,
            gpu: null,
            candidates: [],
            attemptedTags: [],
            forced: false,
        };
    }
    if (platform !== "linux") {
        return {
            backend: "cpu",
            cpuSource: "platform",
            tag: null,
            indexRoot,
            installIndexUrl: null,
            python: opts.python,
            platform: platformLabel,
            arch,
            gpu: null,
            candidates: [],
            attemptedTags: [],
            forced: false,
        };
    }
    // GPU 探测结果（显式 tag 时仅用于记录，不参与选择）
    const gpu = opts.gpu !== undefined ? opts.gpu : await probeNvidiaGpu();
    // 显式指定 tag：跳过自动选择（即使 nvidia-smi 不可用也按 CUDA 安装）
    if (opts.forcedCuda !== null && opts.forcedCuda !== undefined && opts.forcedCuda !== "") {
        // 解析后的 tag
        const parsed = parseCudaTag(opts.forcedCuda);
        if (parsed === null) {
            throw new DaoyanCliError({
                code: "provision_failed",
                message: `--torch-cuda 不是合法 tag：${opts.forcedCuda}（示例 cu130）`,
                details: { stage: "select", tag: opts.forcedCuda },
            });
        }
        return {
            backend: "cuda",
            cpuSource: null,
            tag: parsed.tag,
            indexRoot,
            installIndexUrl: null,
            python: opts.python,
            platform: platformLabel,
            arch,
            gpu,
            candidates: [],
            attemptedTags: [],
            forced: true,
        };
    }
    if (gpu === null) {
        return {
            backend: "cpu",
            cpuSource: "no-gpu",
            tag: null,
            indexRoot,
            installIndexUrl: null,
            python: opts.python,
            platform: platformLabel,
            arch,
            gpu: null,
            candidates: [],
            attemptedTags: [],
            forced: false,
        };
    }
    return {
        backend: "cuda",
        cpuSource: null,
        tag: null,
        indexRoot,
        installIndexUrl: null,
        python: opts.python,
        platform: platformLabel,
        arch,
        gpu,
        candidates: [],
        attemptedTags: [],
        forced: false,
    };
}

/**
 * 解析 torch 工具链计划：驱动/CUDA/架构 -> 可用 CUDA tag。
 * `gpu` / `fetchText` 可注入，便于单测。
 */
export async function resolveTorchPlan(opts: {
    python: PythonInfo;
    platform?: NodeJS.Platform;
    arch?: string;
    forceCpu?: boolean;
    forcedCuda?: string | null;
    indexRoot?: string;
    gpu?: GpuInfo | null;
    fetchText?: FetchText;
    log?: (m: string) => void;
}): Promise<TorchPlan> {
    // 工具链上下文（不访问 index）
    const context = await inspectTorchPlan(opts);
    // 文本抓取
    const fetchText = opts.fetchText ?? fetchTextWithTimeout;
    // CPU 模式：无需访问 index
    if (context.backend === "cpu") return context;
    // 显式 tag：只验证该 tag 的 wheel
    if (context.forced && context.tag !== null) {
        // wheel 检查
        const check = await checkTagWheels(context.tag, opts.python, context.arch, context.indexRoot, fetchText);
        if (!check.ok) {
            throw new DaoyanCliError({
                code: "provision_failed",
                message: `指定的 ${context.tag} 没有匹配 Python ${opts.python.version} / ${context.platform} 的 wheel`,
                hint: "检查 --torch-index 是否包含该 tag，或改用自动选择",
                details: {
                    stage: "select",
                    tag: context.tag,
                    missing: check.missing,
                    python: opts.python.version,
                    platform: context.platform,
                    torch_index: context.indexRoot,
                    last_error: check.error,
                },
            });
        }
        return {
            ...context,
            installIndexUrl: `${context.indexRoot}/${context.tag}`,
            candidates: [context.tag],
            attemptedTags: [context.tag],
        };
    }
    // 自动选择需要 GPU 信息
    const gpu = context.gpu;
    if (gpu === null) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: "工具链上下文缺少 GPU 信息",
            details: { stage: "probe" },
        });
    }
    // 驱动 CUDA 上限
    const cudaMax = parseCudaVersion(gpu.cudaMax);
    if (cudaMax === null) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `无法从驱动 ${gpu.driver} 获取 CUDA 版本，无法选择 torch wheel`,
            hint: "用 --torch-cuda cuXXX 显式指定，或升级 NVIDIA 驱动后重试",
            details: {
                stage: "probe",
                driver: gpu.driver,
                compute_cap: gpu.computeCap,
                python: opts.python.version,
                platform: context.platform,
                next_actions: [
                    "daoyan init --mode=local --torch-cuda cu124 ...",
                    "升级 NVIDIA 驱动后重试",
                    "daoyan init --mode=local --torch-cpu ...",
                ],
            },
        });
    }
    // 从 index 发现 tag
    const discovery = await discoverCudaTags(context.indexRoot, fetchText);
    // 候选池（index 不可达时用内置列表，wheel 检查仍会给出真实结果）
    const pool = discovery.tags.length > 0 ? discovery.tags : FALLBACK_CUDA_TAGS;
    // 过滤与排序
    const selection = selectTorchTags({ available: pool, cudaMax, computeCap: gpu.computeCap });
    if (selection.candidates.length === 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `驱动 ${gpu.driver}（CUDA ${formatCudaVersion(cudaMax)}）没有可用的 CUDA torch tag`,
            hint: "用 --torch-cuda 显式指定，或升级驱动后重试",
            details: {
                stage: "select",
                driver: gpu.driver,
                cuda_max: formatCudaVersion(cudaMax),
                compute_cap: gpu.computeCap,
                python: opts.python.version,
                platform: context.platform,
                skipped: selection.skipped,
                torch_index: context.indexRoot,
                index_error: discovery.error,
                next_actions: [
                    "daoyan init --mode=local --torch-cuda cu118 ...",
                    "升级 NVIDIA 驱动后重试",
                    "daoyan init --mode=local --torch-cpu ...",
                ],
            },
        });
    }
    // 已验证有 wheel 的 tag
    const verified: string[] = [];
    // 检查过的 tag
    const attempted: string[] = [];
    // 最后一次 wheel 检查结果
    let lastCheck: WheelCheck | null = null;
    for (const tag of selection.candidates.slice(0, MAX_CANDIDATE_CHECKS)) {
        attempted.push(tag);
        // 当前 tag 的 wheel 检查
        const check = await checkTagWheels(tag, opts.python, context.arch, context.indexRoot, fetchText);
        lastCheck = check;
        if (check.ok) {
            verified.push(tag);
        } else {
            opts.log?.(
                `跳过 ${tag}：缺少 ${check.missing.join(" / ")} 的 ${opts.python.version}/${context.platform} wheel`,
            );
        }
    }
    if (verified.length === 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `无法找到与驱动 ${gpu.driver} / Python ${opts.python.version} 匹配的 torch wheel`,
            hint: "可指定 --torch-index 镜像，或改用 --torch-cpu；详见 details.attempted_tags",
            details: {
                stage: "select",
                driver: gpu.driver,
                cuda_max: formatCudaVersion(cudaMax),
                compute_cap: gpu.computeCap,
                python: opts.python.version,
                platform: context.platform,
                attempted_tags: attempted,
                missing: lastCheck?.missing ?? [],
                torch_index: context.indexRoot,
                index_error: discovery.error,
                last_error: lastCheck?.error ?? null,
                next_actions: [
                    "daoyan init --mode=local --torch-index <镜像> ...",
                    "daoyan init --mode=local --torch-cuda cu124 ...",
                    "升级 NVIDIA 驱动后重试",
                    "daoyan init --mode=local --torch-cpu ...",
                ],
            },
        });
    }
    // 首选 tag
    const tag = verified[0] as string;
    return {
        ...context,
        tag,
        installIndexUrl: `${context.indexRoot}/${tag}`,
        candidates: verified,
        attemptedTags: attempted,
    };
}

/**
 * 基于同一计划切换到另一个已验证 tag（用于 smoke test 失败后重试一次）。
 */
export function torchPlanForTag(plan: TorchPlan, tag: string): TorchPlan {
    if (plan.tag === tag) return plan;
    return { ...plan, tag, installIndexUrl: `${plan.indexRoot}/${tag}` };
}

/**
 * 可选字符串字段（空字符串视为 null）。
 */
function asOptionalString(v: unknown): string | null {
    return typeof v === "string" && v !== "" ? v : null;
}

/**
 * 读取工具链标记；缺失或结构非法返回 null。
 */
export function readToolchainMarker(venvDir: string): ToolchainMarker | null {
    // 标记文件
    const file = join(venvDir, TOOLCHAIN_MARKER_FILE);
    if (!existsSync(file)) return null;
    // 原始内容
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    } catch {
        return null;
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    // 宽松视图
    const o = raw as Record<string, unknown>;
    if (o.schema_version !== TOOLCHAIN_MARKER_SCHEMA) return null;
    if (o.torch_backend !== "cuda" && o.torch_backend !== "cpu") return null;
    // 必填字符串
    const required = [
        "installed_at",
        "python",
        "platform",
        "comfyui_tag",
        "requirements_sha256",
        "custom_nodes_sha256",
        "torch",
    ] as const;
    for (const key of required) {
        if (typeof o[key] !== "string") return null;
    }
    return {
        schema_version: TOOLCHAIN_MARKER_SCHEMA,
        installed_at: o.installed_at as string,
        python: o.python as string,
        platform: o.platform as string,
        comfyui_tag: o.comfyui_tag as string,
        requirements_sha256: o.requirements_sha256 as string,
        custom_nodes_sha256: o.custom_nodes_sha256 as string,
        driver: asOptionalString(o.driver),
        cuda_max: asOptionalString(o.cuda_max),
        compute_cap: asOptionalString(o.compute_cap),
        torch_backend: o.torch_backend,
        torch_tag: asOptionalString(o.torch_tag),
        torch_index: asOptionalString(o.torch_index),
        torch: asOptionalString(o.torch),
        torchvision: asOptionalString(o.torchvision),
    };
}

/**
 * 写入工具链标记（原子写）。
 */
export function writeToolchainMarker(venvDir: string, marker: ToolchainMarker): void {
    writeJsonAtomic(join(venvDir, TOOLCHAIN_MARKER_FILE), marker);
}

/**
 * 生成工具链标记。
 */
export function buildToolchainMarker(input: {
    plan: TorchPlan;
    smoke: SmokeResult;
    comfyuiTag: string;
    requirementsSha256: string;
    customNodesSha256: string;
}): ToolchainMarker {
    // 计划
    const plan = input.plan;
    return {
        schema_version: TOOLCHAIN_MARKER_SCHEMA,
        installed_at: nowIso(),
        python: plan.python.version,
        platform: plan.platform,
        comfyui_tag: input.comfyuiTag,
        requirements_sha256: input.requirementsSha256,
        custom_nodes_sha256: input.customNodesSha256,
        driver: plan.gpu?.driver ?? null,
        cuda_max: plan.gpu?.cudaMax ?? null,
        compute_cap: plan.gpu?.computeCap ?? null,
        torch_backend: plan.backend,
        torch_tag: plan.backend === "cuda" ? plan.tag : null,
        torch_index: plan.backend === "cuda" ? plan.indexRoot : null,
        torch: input.smoke.torch,
        torchvision: input.smoke.torchvision,
    };
}

/**
 * 校验 marker 是否仍可复用；返回 null 表示可复用，否则返回原因。
 */
export function markerMismatchReason(
    marker: ToolchainMarker,
    expected: {
        python: string;
        platform: string;
        comfyuiTag: string;
        requirementsSha256: string;
        customNodesSha256: string;
        plan: TorchPlan;
    },
): string | null {
    if (marker.schema_version !== TOOLCHAIN_MARKER_SCHEMA) return "工具链标记 schema 已变化";
    if (marker.python !== expected.python) return `Python 已变化（${marker.python} → ${expected.python}）`;
    if (marker.platform !== expected.platform) return `平台已变化（${marker.platform} → ${expected.platform}）`;
    if (marker.comfyui_tag !== expected.comfyuiTag) {
        return `ComfyUI 版本已变化（${marker.comfyui_tag} → ${expected.comfyuiTag}）`;
    }
    if (marker.requirements_sha256 !== expected.requirementsSha256) return "requirements.txt 已变化";
    if (marker.custom_nodes_sha256 !== expected.customNodesSha256) return "custom nodes 配置已变化";
    if (marker.torch_backend !== expected.plan.backend) {
        return `torch 后端已变化（${marker.torch_backend} → ${expected.plan.backend}）`;
    }
    if (expected.plan.backend === "cuda") {
        // 标记中的 tag
        const markerTag = marker.torch_tag !== null ? parseCudaTag(marker.torch_tag) : null;
        if (markerTag === null) return "工具链标记缺少 CUDA tag";
        if (expected.plan.forced) {
            // 显式 tag 不依赖驱动探测，兼容性由复用前的 smoke test 兜底
            if (marker.torch_tag !== expected.plan.tag) {
                return `显式指定的 CUDA tag 已变化（${marker.torch_tag} → ${expected.plan.tag}）`;
            }
        } else {
            // 当前驱动 CUDA 上限
            const cudaMax = parseCudaVersion(expected.plan.gpu?.cudaMax ?? null);
            if (cudaMax === null) return "无法确认当前驱动的 CUDA 版本";
            if (compareCuda(markerTag.cuda, cudaMax) > 0) {
                return `torch tag ${marker.torch_tag} 需要 CUDA ${formatCudaVersion(markerTag.cuda)}，驱动仅支持 ${formatCudaVersion(cudaMax)}`;
            }
            if (!tagSupportsArch(markerTag, expected.plan.gpu?.computeCap ?? null)) {
                return `torch tag ${marker.torch_tag} 与当前 compute capability ${expected.plan.gpu?.computeCap ?? "未知"} 不兼容`;
            }
        }
    }
    if (marker.torch === null) return "工具链标记缺少 torch 版本";
    return null;
}

/**
 * 运行 pip check。
 */
export async function runPipCheck(venvDir: string): Promise<{ ok: boolean; output: string }> {
    // pip 可执行文件
    const pip = join(venvDir, "bin", "pip");
    // 执行结果
    const r = await execCapture(pip, ["check"], { timeoutMs: PIP_CHECK_TIMEOUT_MS });
    // 合并输出（截断尾部）
    const output = `${r.stdout}${r.stderr}`.trim().slice(-4000);
    return { ok: r.code === 0, output };
}

/**
 * 生成 smoke test 脚本（CUDA 模式会真实分配一次显存）。
 */
export function buildSmokeScript(backend: "cuda" | "cpu"): string {
    if (backend === "cpu") {
        return [
            "import json",
            'info = {"ok": False, "torch": None, "torchvision": None, "torch_cuda": None, "available": None, "device": None, "error": None}',
            "try:",
            "    import torch",
            '    info["torch"] = torch.__version__',
            '    info["torch_cuda"] = torch.version.cuda',
            "    try:",
            "        import torchvision",
            '        info["torchvision"] = torchvision.__version__',
            "    except Exception as e:",
            '        info["torchvision_error"] = str(e)',
            '    info["ok"] = True',
            "except Exception as e:",
            '    info["error"] = str(e)',
            'print("DYCLI_SMOKE " + json.dumps(info))',
        ].join("\n");
    }
    return [
        "import json",
        'info = {"ok": False, "torch": None, "torchvision": None, "torch_cuda": None, "available": None, "device": None, "error": None}',
        "try:",
        "    import torch",
        '    info["torch"] = torch.__version__',
        '    info["torch_cuda"] = torch.version.cuda',
        "    try:",
        "        import torchvision",
        '        info["torchvision"] = torchvision.__version__',
        "    except Exception as e:",
        '        info["torchvision_error"] = str(e)',
        '    info["available"] = bool(torch.cuda.is_available())',
        '    if not info["available"]:',
        '        raise RuntimeError("torch.cuda.is_available() == False")',
        '    x = torch.zeros(1, device="cuda")',
        "    x.add_(1)",
        "    torch.cuda.synchronize()",
        '    info["device"] = torch.cuda.get_device_name(0)',
        '    info["ok"] = True',
        "except Exception as e:",
        '    info["error"] = str(e)',
        'print("DYCLI_SMOKE " + json.dumps(info))',
    ].join("\n");
}

/**
 * CUDA 错误分类（决定是否换更低 tag 重试）。
 */
export function classifyCudaError(text: string): SmokeResult["errorClass"] {
    // 小写文本
    const lower = text.toLowerCase();
    if (lower.includes("driver version is insufficient")) return "driver";
    if (lower.includes("is_available() == false")) return "driver";
    if (lower.includes("no cuda gpus are available") || lower.includes("no cuda-capable device")) return "driver";
    if (lower.includes("no kernel image is available")) return "kernel";
    if (lower.includes("invalid device function")) return "device_function";
    if (lower.includes("out of memory")) return "oom";
    return "unknown";
}

/**
 * 执行 smoke test。
 */
export async function runSmokeTest(venvDir: string, backend: "cuda" | "cpu"): Promise<SmokeResult> {
    // venv Python
    const python = join(venvDir, "bin", "python");
    // 执行结果
    const r = await execCapture(python, ["-c", buildSmokeScript(backend)], { timeoutMs: SMOKE_TIMEOUT_MS });
    // 结果行
    const line = r.stdout
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith(SMOKE_PREFIX));
    if (line === undefined) {
        return {
            ok: false,
            torch: null,
            torchvision: null,
            torchCuda: null,
            available: null,
            device: null,
            error: (r.stderr || r.stdout).trim().slice(-2000) || `python 退出码 ${r.code}`,
            errorClass: backend === "cuda" ? classifyCudaError(r.stderr) : "unknown",
        };
    }
    // 解析 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(line.slice(SMOKE_PREFIX.length)) as unknown;
    } catch {
        return {
            ok: false,
            torch: null,
            torchvision: null,
            torchCuda: null,
            available: null,
            device: null,
            error: `smoke test 输出不是 JSON：${line.slice(0, 300)}`,
            errorClass: "unknown",
        };
    }
    // 宽松视图
    const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
    // 错误文本
    const error = asOptionalString(o.error);
    // 是否通过
    const ok = o.ok === true;
    return {
        ok,
        torch: asOptionalString(o.torch),
        torchvision: asOptionalString(o.torchvision),
        torchCuda: asOptionalString(o.torch_cuda),
        available: typeof o.available === "boolean" ? o.available : null,
        device: asOptionalString(o.device),
        error,
        errorClass: ok ? null : backend === "cuda" ? classifyCudaError(error ?? "") : "unknown",
    };
}
