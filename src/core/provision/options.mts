/** 依赖安装参数 —— CLI > 环境变量 > 默认值。
 *  供 init / engine install 共用；URL 与 CUDA tag 在进入安装流程前完成校验。
 *  默认普通依赖走阿里云 PyPI，失败时回退官方 PyPI；torch wheel 默认走 PyTorch 官方 index。 */
import { takeValue, usageError } from "../../shared/args.mts";
import { isHttpUrl } from "../../shared/fs.mts";
import { DEFAULT_TORCH_INDEX, parseCudaTag } from "./toolchain.mts";

// 默认普通依赖主源（阿里云 PyPI，国内网络更稳）
export const DEFAULT_PIP_MIRROR = "https://mirrors.aliyun.com/pypi/simple/";
// 默认普通依赖 fallback（官方 PyPI）
export const DEFAULT_PIP_FALLBACK_MIRROR = "https://pypi.org/simple/";
// 关闭 fallback 的特殊取值
const DISABLE_VALUE = "none";

/**
 * 安装参数（CLI 原样值；未指定的字段由环境变量/默认值补齐）。
 */
export interface ToolchainOptions {
    /**
     * 普通依赖主源。
     */
    mirror?: string;
    /**
     * 普通依赖 fallback；none 表示关闭。
     */
    fallbackMirror?: string;
    /**
     * PyTorch wheel index 根。
     */
    torchIndex?: string;
    /**
     * 强制 CUDA tag（cuXXX）。
     */
    torchCuda?: string;
    /**
     * 显式 CPU 模式。
     */
    torchCpu?: boolean;
    /**
     * 禁用 pip cache。
     */
    noCache?: boolean;
}

/**
 * 解析后的安装参数（全部字段已确定）。
 */
export interface ResolvedToolchainOptions {
    /**
     * 普通依赖主源。
     */
    mirror: string;
    /**
     * 普通依赖 fallback；null 表示关闭。
     */
    fallbackMirror: string | null;
    /**
     * PyTorch wheel index 根。
     */
    torchIndex: string;
    /**
     * 强制 CUDA tag；null 表示自动探测。
     */
    torchCuda: string | null;
    /**
     * 是否显式 CPU 模式。
     */
    torchCpu: boolean;
    /**
     * 是否禁用 pip cache。
     */
    noCache: boolean;
}

/**
 * 去空白；空字符串返回 undefined。
 */
function nonEmpty(raw: string | undefined): string | undefined {
    if (raw === undefined) return undefined;
    // 去空白后的值
    const value = raw.trim();
    return value === "" ? undefined : value;
}

/**
 * 校验并规范化 index URL。
 * @param stripSlash 是否去掉末尾斜杠（torch index 需要拼接 tag 路径时使用）。
 */
function normalizeIndexUrl(raw: string, label: string, stripSlash = false): string {
    // 去空白后的值
    const value = raw.trim();
    if (value === "") usageError(`${label} 不能为空`);
    if (!isHttpUrl(value)) usageError(`${label} 必须是 http(s) URL（收到 ${value}）`);
    return stripSlash ? value.replace(/\/+$/, "") : value;
}

/**
 * 去掉末尾斜杠，仅用于比较两个 index 是否相同。
 */
function trimSlash(url: string): string {
    return url.replace(/\/+$/, "");
}

/**
 * 判断环境变量是否为真。
 */
function isTruthy(raw: string | undefined): boolean {
    if (raw === undefined) return false;
    return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

/**
 * 解析安装参数：CLI > 环境变量 > 默认值。
 */
export function resolveToolchainOptions(
    cli: ToolchainOptions | undefined,
    env: NodeJS.ProcessEnv = process.env,
): ResolvedToolchainOptions {
    // 普通依赖主源
    const mirrorRaw = cli?.mirror ?? nonEmpty(env.DYCLI_PIP_MIRROR) ?? DEFAULT_PIP_MIRROR;
    // 主源 URL
    const mirror = normalizeIndexUrl(mirrorRaw, "--mirror");
    // fallback 原始值
    const fallbackRaw = cli?.fallbackMirror ?? nonEmpty(env.DYCLI_PIP_FALLBACK_MIRROR) ?? DEFAULT_PIP_FALLBACK_MIRROR;
    // fallback URL（none/与主源相同则关闭）
    let fallbackMirror: string | null = null;
    if (fallbackRaw.trim().toLowerCase() !== DISABLE_VALUE) {
        // 规范化后的 fallback
        const fallback = normalizeIndexUrl(fallbackRaw, "--fallback-mirror");
        fallbackMirror = trimSlash(fallback) === trimSlash(mirror) ? null : fallback;
    }
    // PyTorch index 根（拼接 tag 路径，去掉末尾斜杠）
    const torchIndex = normalizeIndexUrl(
        cli?.torchIndex ?? nonEmpty(env.DYCLI_TORCH_INDEX) ?? DEFAULT_TORCH_INDEX,
        "--torch-index",
        true,
    );
    // 强制 CUDA tag
    const torchCudaRaw = cli?.torchCuda ?? nonEmpty(env.DYCLI_TORCH_CUDA);
    // 规范化后的 CUDA tag
    const torchCuda =
        torchCudaRaw !== undefined && torchCudaRaw.toLowerCase() !== DISABLE_VALUE ? torchCudaRaw.toLowerCase() : null;
    if (torchCuda !== null && parseCudaTag(torchCuda) === null) {
        usageError(`--torch-cuda 需要形如 cu130 的 tag（收到 ${torchCuda}）`);
    }
    // 显式 CPU 模式
    const torchCpu = cli?.torchCpu === true || isTruthy(nonEmpty(env.DYCLI_TORCH_CPU));
    if (torchCpu && torchCuda !== null) {
        usageError("--torch-cpu 与 --torch-cuda / DYCLI_TORCH_CUDA 不能同时使用");
    }
    return {
        mirror,
        fallbackMirror,
        torchIndex,
        torchCuda,
        torchCpu,
        noCache: cli?.noCache === true,
    };
}

/**
 * 是否显式设置过任何工具链参数（用于 remote 模式拒绝）。
 */
export function hasToolchainOptions(opts: ToolchainOptions): boolean {
    return Object.values(opts).some((v) => v !== undefined && v !== false);
}

/**
 * 解析结果（是否本模块处理、需要跳过的参数数）。
 */
export interface ToolchainFlagResult {
    /**
     * 是否已处理。
     */
    handled: boolean;
    /**
     * 需要额外跳过的参数数。
     */
    skip: number;
}

// 取值型 flag -> ToolchainOptions 字段
const VALUE_FLAGS: Record<string, "mirror" | "fallbackMirror" | "torchIndex" | "torchCuda"> = {
    "--mirror": "mirror",
    "--fallback-mirror": "fallbackMirror",
    "--torch-index": "torchIndex",
    "--torch-cuda": "torchCuda",
};

/**
 * 处理一个工具链 flag（init / engine install 共用）。
 */
export function applyToolchainFlag(
    target: ToolchainOptions,
    name: string,
    args: readonly string[],
    index: number,
    inline: string | undefined,
): ToolchainFlagResult {
    if (name === "--torch-cpu") {
        if (inline !== undefined) usageError("--torch-cpu 不接受参数");
        target.torchCpu = true;
        return { handled: true, skip: 0 };
    }
    if (name === "--no-cache") {
        if (inline !== undefined) usageError("--no-cache 不接受参数");
        target.noCache = true;
        return { handled: true, skip: 0 };
    }
    // 取值型字段
    const key = VALUE_FLAGS[name];
    if (key === undefined) return { handled: false, skip: 0 };
    // 参数值
    const { value, skip } = takeValue(args, index, inline, name);
    target[key] = value;
    return { handled: true, skip };
}
