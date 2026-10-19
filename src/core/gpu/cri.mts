/** CRI / containerd 本地端点探测 —— crictl 未配置 runtime-endpoint 时也能工作。
 *  不依赖 kubectl；k8s 节点只需要 crictl 或 ctr/nerdctl 之一，或 nsenter 权限。 */
import { existsSync } from "node:fs";
import { tryExecCapture } from "../../shared/exec.mts";

/**
 * 常见 CRI socket。
 */
export const CRI_ENDPOINTS = [
    "unix:///run/containerd/containerd.sock",
    "unix:///var/run/containerd/containerd.sock",
    "unix:///run/k3s/containerd/containerd.sock",
    "unix:///var/run/k3s/containerd/containerd.sock",
    "unix:///run/crio/crio.sock",
    "unix:///var/run/crio/crio.sock",
    "unix:///var/run/cri-dockerd.sock",
    "unix:///var/snap/microk8s/common/run/containerd.sock",
];

/**
 * 常见 containerd socket（ctr / nerdctl）。
 */
export const CONTAINERD_SOCKETS = [
    "/run/containerd/containerd.sock",
    "/var/run/containerd/containerd.sock",
    "/run/k3s/containerd/containerd.sock",
    "/var/run/k3s/containerd/containerd.sock",
    "/var/snap/microk8s/common/run/containerd.sock",
];

/**
 * 常见 containerd namespace。
 */
export const CONTAINERD_NAMESPACES = ["k8s.io", "default", "moby"];

// crictl 是否可用（进程内缓存）
let crictlChecked: boolean | null = null;

/**
 * 检查 crictl 是否安装。
 */
export async function crictlAvailable(): Promise<boolean> {
    if (crictlChecked !== null) return crictlChecked;
    const r = await tryExecCapture("crictl", ["--version"], { timeoutMs: 5_000 });
    crictlChecked = r !== null && r.code === 0;
    return crictlChecked;
}

/**
 * 构造 crictl 参数（端点必须放在子命令前）。
 */
export function crictlArgs(endpoint: string | undefined, args: string[]): string[] {
    return endpoint !== undefined ? ["--runtime-endpoint", endpoint, ...args] : args;
}

/**
 * 本机实际存在的 CRI socket。
 */
export function availableCriEndpoints(): string[] {
    return CRI_ENDPOINTS.filter((ep) => existsSync(ep.replace(/^unix:\/\//, "")));
}

/**
 * crictl 端点尝试顺序：已记录端点 -> 默认配置 -> 本机常见 socket。
 */
export function crictlEndpointCandidates(recorded?: string): Array<string | undefined> {
    const out: Array<string | undefined> = recorded !== undefined ? [recorded, undefined] : [undefined];
    for (const ep of availableCriEndpoints()) {
        if (!out.includes(ep)) out.push(ep);
    }
    return out;
}

/**
 * 本机实际存在的 containerd socket。
 */
export function availableContainerdSockets(): string[] {
    return CONTAINERD_SOCKETS.filter((p) => existsSync(p));
}

/**
 * 判断 stderr 是否像“端点不可用”而不是“容器内命令失败”。
 * 只有端点错误才值得换 socket/namespace 重试。
 */
export function isEndpointError(stderr: string): boolean {
    return /connect|connection|no such file|refused|socket|failed to connect|code = Unavailable/i.test(stderr);
}
