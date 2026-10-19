/** 在容器内执行命令 —— 用于卸载/重载模型，不停止容器。
 *  支持 docker / podman / crictl / ctr / nerdctl；所有命令使用参数数组，不经过 shell。 */
import { tryExecCapture, type ExecResult } from "../../shared/exec.mts";
import {
  CONTAINERD_NAMESPACES,
  availableContainerdSockets,
  crictlArgs,
  crictlAvailable,
  crictlEndpointCandidates,
  isEndpointError,
} from "./cri.mts";
import type { ProviderChannel } from "./targets.mts";

/**
 * exec 通道。
 */
type ExecChannel = Extract<ProviderChannel, { kind: "exec" }>;

/**
 * crictl exec。
 */
async function crictlExec(channel: ExecChannel, args: string[], timeoutMs: number): Promise<ExecResult | null> {
  if (!(await crictlAvailable())) return null;
  // 最后一个端点错误（用于诊断）
  let last: ExecResult | null = null;
  for (const ep of crictlEndpointCandidates(channel.crictl_endpoint)) {
    const r = await tryExecCapture(
      "crictl",
      crictlArgs(ep, ["exec", channel.container_id, ...args]),
      { timeoutMs },
    );
    if (r === null) continue;
    if (r.code === 0) return r;
    // 容器内命令失败时不再换端点
    if (!isEndpointError(r.stderr)) return r;
    last = r;
  }
  return last;
}

/**
 * ctr task exec。
 */
async function ctrExec(channel: ExecChannel, args: string[], timeoutMs: number): Promise<ExecResult | null> {
  // 地址 / 命名空间组合
  const addresses: Array<string | undefined> =
    channel.ctr_address !== undefined
      ? [channel.ctr_address]
      : (() => {
          const found = availableContainerdSockets();
          return found.length > 0 ? found : [undefined];
        })();
  const namespaces =
    channel.ctr_namespace !== undefined ? [channel.ctr_namespace] : CONTAINERD_NAMESPACES;
  // 最后一个错误
  let last: ExecResult | null = null;
  for (const address of addresses) {
    for (const namespace of namespaces) {
      // 每次 exec 需要唯一 id
      const execId = `dycli-${process.pid}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      // 全局参数必须在 task 前
      const prefix = ["--namespace", namespace, ...(address !== undefined ? ["--address", address] : [])];
      const r = await tryExecCapture(
        "ctr",
        [
          ...prefix,
          "task",
          "exec",
          "--exec-id",
          execId,
          channel.container_id,
          ...args,
        ],
        { timeoutMs },
      );
      if (r === null) continue;
      if (r.code === 0) return r;
      if (!isEndpointError(r.stderr)) return r;
      last = r;
    }
  }
  return last;
}

/**
 * nerdctl exec。
 */
async function nerdctlExec(
  channel: ExecChannel,
  args: string[],
  timeoutMs: number,
): Promise<ExecResult | null> {
  const namespaces =
    channel.ctr_namespace !== undefined ? [channel.ctr_namespace] : CONTAINERD_NAMESPACES;
  let last: ExecResult | null = null;
  for (const namespace of namespaces) {
    const r = await tryExecCapture(
      "nerdctl",
      ["--namespace", namespace, "exec", channel.container_id, ...args],
      { timeoutMs },
    );
    if (r === null) continue;
    if (r.code === 0) return r;
    if (!isEndpointError(r.stderr)) return r;
    last = r;
  }
  return last;
}

/**
 * 在容器内执行命令。
 * 返回 null 表示运行时不可用 / 容器不可达；返回 code != 0 表示容器内命令失败。
 */
export async function containerExec(
  channel: ExecChannel,
  args: string[],
  timeoutMs: number,
): Promise<ExecResult | null> {
  if (channel.runtime === "docker" || channel.runtime === "podman") {
    return tryExecCapture(channel.runtime, ["exec", channel.container_id, ...args], { timeoutMs });
  }
  if (channel.runtime === "crictl") return crictlExec(channel, args, timeoutMs);
  if (channel.runtime === "ctr") return ctrExec(channel, args, timeoutMs);
  return nerdctlExec(channel, args, timeoutMs);
}
