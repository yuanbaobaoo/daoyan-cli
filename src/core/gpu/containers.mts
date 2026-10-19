/** 容器内模型服务发现 —— 只做“卸载/重载模型”，永不停止容器或进程。
 *  识别：nvidia-smi 宿主 PID -> /proc/<pid>/cgroup -> 容器 ID；再通过 docker/podman/crictl/nerdctl
 *  inspect 或 /proc/<pid>/cmdline 匹配内置目标。
 *  访问：host（端口映射）/ netns（nsenter + 本机 Node）/ exec（容器内 CLI/Python）。
 *  不依赖 kubectl；k8s 节点没有 kubectl 时可用 crictl/ctr/nerdctl 或 nsenter 权限。
 *  不读取、不记录容器环境变量。 */
import { readFileSync } from "node:fs";
import { tryExecCapture } from "../../shared/exec.mts";
import type { GpuComputeApp } from "./detect.mts";
import {
  CONTAINERD_NAMESPACES,
  crictlArgs,
  crictlAvailable,
  crictlEndpointCandidates,
} from "./cri.mts";
import {
  GPU_CONTAINER_TARGETS,
  type ContainerRuntimeKind,
  type ContainerTargetRule,
  type ProviderChannel,
  type ProviderId,
} from "./targets.mts";

/**
 * cgroup 中识别出的容器信息。
 */
export interface ContainerCgroupInfo {
  /**
   * 容器 ID（64 位十六进制）。
   */
  id: string;
  /**
   * 运行时类型的提示（cgroup 前缀推断）。
   */
  runtime: ContainerRuntimeKind;
  /**
   * cgroup 是否位于 kubepods 下（k8s 托管）。
   */
  kubernetes: boolean;
}

/**
 * Docker / Podman / nerdctl inspect 解析后的容器信息。
 */
export interface ContainerInfo {
  /**
   * 实际 inspect 成功的运行时。
   */
  runtime: ContainerRuntimeKind;
  /**
   * 容器 ID（完整）。
   */
  id: string;
  /**
   * 容器名。
   */
  name: string;
  /**
   * 镜像名。
   */
  image: string;
  /**
   * 启动命令（crictl 无法提供时为空）。
   */
  command: string[];
  /**
   * 当前是否运行。
   */
  running: boolean;
  /**
   * 宿主 PID（容器 init 进程）。
   */
  hostPid: number | null;
  /**
   * crictl 运行时端点（非默认端点时记录）。
   */
  crictlEndpoint?: string;
  /**
   * containerd namespace（ctr / nerdctl 使用）。
   */
  ctrNamespace?: string;
  /**
   * Docker/Podman 端口映射：容器端口 -> 宿主端口。
   */
  portBindings?: Array<{ containerPort: number; hostPort: number }>;
  /**
   * 网络模式（host 时可直接用默认端口）。
   */
  networkMode?: string;
}

/**
 * 一个可卸载模型的容器服务。
 */
export interface ContainerService {
  /**
   * 命中的内置目标。
   */
  target: ContainerTargetRule;
  /**
   * 模型服务 id。
   */
  provider: ProviderId;
  /**
   * 占用 GPU 的宿主 PID。
   */
  pid: number;
  /**
   * 该 PID 的显存（MiB，未知为 null）。
   */
  usedMb: number | null;
  /**
   * 容器信息。
   */
  info: ContainerInfo;
  /**
   * 候选访问通道（host/netns/exec 顺序）。
   */
  channels: ProviderChannel[];
}

/**
 * 容器服务发现结果。
 */
export interface ContainerDiscovery {
  /**
   * 可卸载的模型服务。
   */
  services: ContainerService[];
  /**
   * 无法无停机处理的目标（不阻断任务）。
   */
  issues: string[];
}

/**
 * 从 cgroup 文本中提取容器 ID / 运行时提示 / 是否 k8s。
 * 覆盖 systemd 与 cgroupfs 两种驱动：docker、podman/libpod、containerd CRI、CRI-O、kubepods。
 */
export function containerIdFromCgroup(cgroup: string): ContainerCgroupInfo | null {
  // kubepods 路径（systemd 的 kubepods.slice 或 cgroupfs 的 /kubepods/）
  const kubernetes = /kubepods(?:[\/.]|$)/i.test(cgroup);
  // 已知前缀（顺序：越具体越靠前）
  const patterns: Array<{ re: RegExp; runtime: ContainerRuntimeKind }> = [
    { re: /(?:^|[\/-])cri-containerd-([0-9a-f]{64})(?:\.scope)?/i, runtime: "crictl" },
    { re: /(?:^|[\/-])crio-([0-9a-f]{64})(?:\.scope)?/i, runtime: "crictl" },
    { re: /(?:^|[\/-])docker-([0-9a-f]{64})(?:\.scope)?/i, runtime: "docker" },
    { re: /(?:^|[\/])docker\/([0-9a-f]{64})(?:[\/]|$)/i, runtime: "docker" },
    { re: /(?:^|[\/-])libpod-([0-9a-f]{64})(?:\.scope)?/i, runtime: "podman" },
    { re: /(?:^|[\/])libpod\/([0-9a-f]{64})(?:[\/]|$)/i, runtime: "podman" },
    { re: /(?:^|[\/-])containerd-([0-9a-f]{64})(?:\.scope)?/i, runtime: "crictl" },
    { re: /(?:^|[\/])containerd\/([0-9a-f]{64})(?:[\/]|$)/i, runtime: "crictl" },
  ];
  for (const p of patterns) {
    // 正则命中
    const m = p.re.exec(cgroup);
    if (m?.[1] !== undefined) {
      return { id: m[1].toLowerCase(), runtime: p.runtime, kubernetes };
    }
  }
  // k8s cgroupfs 驱动下容器 ID 可能没有运行时前缀（/kubepods/.../<id>）
  if (kubernetes) {
    const m = /([0-9a-f]{64})(?:\.scope)?(?:[\/]|$)/i.exec(cgroup);
    if (m?.[1] !== undefined) {
      return { id: m[1].toLowerCase(), runtime: "crictl", kubernetes };
    }
  }
  return null;
}

/**
 * 读取某个宿主 PID 的容器信息；非容器进程 / 无权限返回 null。
 */
export function readContainerInfo(pid: number): ContainerCgroupInfo | null {
  if (process.platform !== "linux") return null;
  try {
    return containerIdFromCgroup(readFileSync(`/proc/${pid}/cgroup`, "utf8"));
  } catch {
    return null;
  }
}

/**
 * 宽松对象视图。
 */
function asObject(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * 字符串数组视图（过滤非字符串）。
 */
function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/**
 * 命令字段视图（字符串或字符串数组）。
 */
function commandArray(v: unknown): string[] {
  if (typeof v === "string") return [v];
  return stringArray(v);
}

/**
 * 读取进程命令行。
 */
function readProcessCmdline(pid: number): string[] {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8")
      .split("\0")
      .filter((x) => x !== "");
  } catch {
    return [];
  }
}

/**
 * 读取父 PID（/proc/<pid>/stat 的 ppid 字段）。
 */
function readParentPid(pid: number): number | null {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    // comm 可能包含空格/括号，取最后一个 ")" 之后再解析
    const close = stat.lastIndexOf(")");
    if (close < 0) return null;
    const rest = stat.slice(close + 2).split(/\s+/);
    // rest: state ppid pgrp ...
    const ppid = Number(rest[1]);
    return Number.isInteger(ppid) && ppid > 0 ? ppid : null;
  } catch {
    return null;
  }
}

/**
 * 读取祖先进程命令行（最多 64 层）。
 * 用于没有运行时 inspect 时识别被包装/多进程模型的容器服务。
 */
function readAncestorCmdlines(pid: number): string[] {
  // 祖先命令行
  const out: string[] = [];
  // 父 PID 游标
  let cur = readParentPid(pid);
  for (let i = 0; i < 64 && cur !== null && cur > 1; i++) {
    const args = readProcessCmdline(cur);
    if (args.length > 0) out.push(...args);
    cur = readParentPid(cur);
  }
  return out;
}

/**
 * 解析 Docker/Podman/nerdctl inspect 的端口映射。
 * 同时兼容 NetworkSettings.Ports 与 HostConfig.PortBindings。
 */
function parsePortBindings(
  networkSettings: Record<string, unknown> | null,
  hostConfig: Record<string, unknown> | null,
): Array<{ containerPort: number; hostPort: number }> {
  // 结果
  const out: Array<{ containerPort: number; hostPort: number }> = [];
  // NetworkSettings.Ports
  const ports = asObject(networkSettings?.Ports);
  if (ports !== null) {
    for (const [key, value] of Object.entries(ports)) {
      const m = /^(\d+)\/tcp$/i.exec(key);
      if (m?.[1] === undefined) continue;
      // 容器端口
      const containerPort = Number(m[1]);
      if (!Number.isInteger(containerPort)) continue;
      for (const binding of Array.isArray(value) ? value : []) {
        const o = asObject(binding);
        const hostPort = Number(o?.HostPort);
        if (Number.isInteger(hostPort) && hostPort > 0) out.push({ containerPort, hostPort });
      }
    }
  }
  // HostConfig.PortBindings
  const bindings = asObject(hostConfig?.PortBindings);
  if (bindings !== null) {
    for (const [key, value] of Object.entries(bindings)) {
      const m = /^(\d+)\/tcp$/i.exec(key);
      if (m?.[1] === undefined) continue;
      const containerPort = Number(m[1]);
      if (!Number.isInteger(containerPort)) continue;
      for (const binding of Array.isArray(value) ? value : []) {
        const o = asObject(binding);
        const hostPort = Number(o?.HostPort);
        if (Number.isInteger(hostPort) && hostPort > 0) out.push({ containerPort, hostPort });
      }
    }
  }
  // 去重
  const seen = new Set<string>();
  return out.filter((b) => {
    const key = `${b.containerPort}:${b.hostPort}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 解析 `docker inspect` / `podman inspect` / `nerdctl inspect` 的 JSON。
 */
export function parseDockerInspect(
  raw: unknown,
  runtime: "docker" | "podman" | "nerdctl",
): ContainerInfo | null {
  // inspect 返回数组
  const first = Array.isArray(raw) ? raw[0] : raw;
  const o = asObject(first);
  if (o === null) return null;
  // 完整 ID（podman 字段为 Id）
  const idRaw = typeof o.Id === "string" ? o.Id : typeof o.ID === "string" ? o.ID : "";
  if (!/^[0-9a-f]{64}$/i.test(idRaw)) return null;
  // 状态与配置
  const state = asObject(o.State);
  const config = asObject(o.Config);
  const hostConfig = asObject(o.HostConfig);
  const networkSettings = asObject(o.NetworkSettings);
  const name = typeof o.Name === "string" ? o.Name.replace(/^\//, "") : "";
  const image =
    typeof config?.Image === "string" ? config.Image : typeof o.Image === "string" ? o.Image : "";
  // 命令由 entrypoint + cmd + path/args 组成
  const command = [
    ...commandArray(config?.Entrypoint),
    ...commandArray(config?.Cmd),
    typeof o.Path === "string" ? o.Path : "",
    ...stringArray(o.Args),
  ].filter((x) => x !== "");
  // 宿主 PID
  const pidRaw = state?.Pid;
  const hostPid = typeof pidRaw === "number" && Number.isInteger(pidRaw) && pidRaw > 0 ? pidRaw : null;
  // 运行状态
  const running = state?.Running === true;
  // 网络模式
  const networkModeRaw = hostConfig?.NetworkMode ?? networkSettings?.NetworkMode;
  const networkMode = typeof networkModeRaw === "string" ? networkModeRaw : undefined;
  // 端口映射
  const portBindings = parsePortBindings(networkSettings, hostConfig);
  return {
    runtime,
    id: idRaw.toLowerCase(),
    name,
    image,
    command,
    running,
    hostPid,
    ...(portBindings.length > 0 ? { portBindings } : {}),
    ...(networkMode !== undefined ? { networkMode } : {}),
  };
}

/**
 * 解析 `crictl inspect` 的 JSON。
 */
export function parseCrictlInspect(raw: unknown): ContainerInfo | null {
  const o = asObject(raw);
  const status = asObject(o?.status);
  if (status === null) return null;
  // 容器 ID
  const idRaw = typeof status.id === "string" ? status.id : "";
  if (!/^[0-9a-f]{64}$/i.test(idRaw)) return null;
  // 名称与镜像
  const metadata = asObject(status.metadata);
  const name = typeof metadata?.name === "string" ? metadata.name : "";
  const imageObj = asObject(status.image);
  const image =
    typeof imageObj?.image === "string"
      ? imageObj.image
      : typeof status.imageName === "string"
        ? status.imageName
        : typeof status.imageRef === "string"
          ? status.imageRef
          : "";
  // CRI 状态字符串
  const state = typeof status.state === "string" ? status.state : "";
  const running = state.toLowerCase().includes("running");
  // 宿主 PID（部分 CRI 实现可能不返回）
  const pidRaw = status.pid;
  const hostPid = typeof pidRaw === "number" && Number.isInteger(pidRaw) && pidRaw > 0 ? pidRaw : null;
  // 运行时 info 中只取 command/args（不读取、不记录 env）
  const infoConfig = asObject(asObject(o?.info)?.config);
  const command = [
    ...commandArray(infoConfig?.command),
    ...commandArray(infoConfig?.args),
  ].filter((x) => x !== "");
  return { runtime: "crictl", id: idRaw.toLowerCase(), name, image, command, running, hostPid };
}

/**
 * 在镜像名 / 容器名 / 启动命令中匹配内置目标。
 */
export function matchContainerTarget(text: string): ContainerTargetRule | undefined {
  return GPU_CONTAINER_TARGETS.find((r) => r.pattern.test(text));
}

/**
 * 判断目标 id 是否为模型服务。
 */
function isProviderTargetId(id: string): id is ProviderId {
  return id === "ollama" || id === "lmstudio" || id === "xinference" || id === "vllm";
}

/**
 * 单次运行时 inspect。
 */
async function inspectWith(
  runtime: ContainerRuntimeKind,
  id: string,
  crictlEndpoint?: string,
): Promise<ContainerInfo | null> {
  if (runtime === "crictl") {
    if (!(await crictlAvailable())) return null;
    for (const ep of crictlEndpointCandidates(crictlEndpoint)) {
      const r = await tryExecCapture("crictl", crictlArgs(ep, ["inspect", id]), {
        timeoutMs: 10_000,
      });
      if (r === null || r.code !== 0) continue;
      try {
        const info = parseCrictlInspect(JSON.parse(r.stdout) as unknown);
        if (info !== null) {
          return ep !== undefined ? { ...info, crictlEndpoint: ep } : info;
        }
      } catch {
        // 继续尝试下一个端点
      }
    }
    return null;
  }
  if (runtime === "nerdctl") {
    // 默认 namespace + 常见 containerd namespace
    for (const ns of [undefined, ...CONTAINERD_NAMESPACES]) {
      const args = ns !== undefined ? ["--namespace", ns, "inspect", id] : ["inspect", id];
      const r = await tryExecCapture("nerdctl", args, { timeoutMs: 10_000 });
      if (r === null || r.code !== 0) continue;
      try {
        const info = parseDockerInspect(JSON.parse(r.stdout) as unknown, "nerdctl");
        if (info !== null) {
          return ns !== undefined ? { ...info, ctrNamespace: ns } : info;
        }
      } catch {
        // 继续
      }
    }
    return null;
  }
  if (runtime === "ctr") {
    // ctr inspect 输出不是稳定 JSON；不在 inspect 阶段使用
    return null;
  }
  // docker / podman
  const r = await tryExecCapture(runtime, ["inspect", id], { timeoutMs: 10_000 });
  if (r === null || r.code !== 0) return null;
  try {
    return parseDockerInspect(JSON.parse(r.stdout) as unknown, runtime);
  } catch {
    return null;
  }
}

/**
 * 依次尝试 docker / podman / crictl / nerdctl inspect。
 */
export async function inspectContainer(
  id: string,
  hint: ContainerRuntimeKind,
  crictlEndpoint?: string,
): Promise<ContainerInfo | null> {
  // 尝试顺序
  const order: ContainerRuntimeKind[] = [hint];
  for (const r of ["docker", "podman", "crictl", "nerdctl"] as const) {
    if (!order.includes(r)) order.push(r);
  }
  for (const runtime of order) {
    const info = await inspectWith(
      runtime,
      id,
      runtime === "crictl" ? crictlEndpoint : undefined,
    );
    if (info === null) continue;
    if (info.id !== id.toLowerCase()) continue;
    // 本地性校验：init PID 的 cgroup 应指向同一容器
    if (info.hostPid !== null) {
      const local = readContainerInfo(info.hostPid);
      if (local !== null && local.id !== info.id) continue;
    }
    return info;
  }
  return null;
}

/**
 * 模型服务默认端口。
 */
function providerPort(provider: ProviderId): number {
  if (provider === "ollama") return 11434;
  if (provider === "lmstudio") return 1234;
  if (provider === "vllm") return 8000;
  return 9997;
}

/**
 * 查找容器端口对应的宿主端口。
 */
function mappedHostPort(info: ContainerInfo, containerPort: number): number | undefined {
  for (const b of info.portBindings ?? []) {
    if (b.containerPort === containerPort) return b.hostPort;
  }
  return undefined;
}

/**
 * 构造 exec 通道。
 */
function execChannel(
  runtime: ContainerRuntimeKind,
  info: ContainerInfo,
  kubernetes: boolean,
): ProviderChannel {
  // containerd namespace：优先 inspect 结果，其次 k8s / moby
  const namespace =
    info.ctrNamespace ??
    (kubernetes ? "k8s.io" : runtime === "docker" ? "moby" : undefined);
  return {
    kind: "exec",
    runtime,
    container_id: info.id,
    ...(info.name !== "" ? { container_name: info.name } : {}),
    ...(info.crictlEndpoint !== undefined ? { crictl_endpoint: info.crictlEndpoint } : {}),
    ...(namespace !== undefined ? { ctr_namespace: namespace } : {}),
  };
}

/**
 * 为 provider 构造候选访问通道。
 * LM Studio 优先 exec（lms CLI），其余优先 host / netns。
 */
function channelsForProvider(
  provider: ProviderId,
  info: ContainerInfo,
  pid: number,
  kubernetes: boolean,
): ProviderChannel[] {
  // 默认端口与容器内 URL
  const port = providerPort(provider);
  const base = `http://127.0.0.1:${port}`;
  // host 通道
  const host: ProviderChannel[] = [];
  const mapped = mappedHostPort(info, port);
  if (mapped !== undefined) host.push({ kind: "host", base_url: `http://127.0.0.1:${mapped}` });
  else if (info.networkMode === "host") host.push({ kind: "host", base_url: base });
  // netns 通道
  const netns: ProviderChannel[] = [
    { kind: "netns", pid: info.hostPid ?? pid, base_url: base, container_id: info.id },
  ];
  // exec 通道
  const exec: ProviderChannel[] = [];
  const seenRuntime = new Set<ContainerRuntimeKind>();
  const addExec = (runtime: ContainerRuntimeKind): void => {
    if (seenRuntime.has(runtime)) return;
    seenRuntime.add(runtime);
    exec.push(execChannel(runtime, info, kubernetes));
  };
  // 首选 inspect 成功的运行时
  addExec(info.runtime);
  // containerd/k8s 相关兜底：crictl、ctr、nerdctl
  if (kubernetes || info.runtime === "crictl" || info.runtime === "nerdctl" || info.runtime === "docker") {
    addExec("crictl");
    addExec("ctr");
    addExec("nerdctl");
  }
  // LM Studio 主要靠容器内 lms，exec 放最前
  if (provider === "lmstudio") return [...exec, ...host, ...netns];
  return [...host, ...netns, ...exec];
}

/**
 * 容器内进程目标的提示（不停止容器）。
 */
function unsupportedProcessMessage(target: ContainerTargetRule): string {
  if (target.id === "llama.cpp") {
    return "容器内 llama.cpp server 未自动处理（不会停止容器）；router 模式可使用 /models/unload";
  }
  if (target.id === "sglang") {
    return "容器内 SGLang 未自动处理（不会停止容器）；可用 --enable-memory-saver + release_memory_occupation";
  }
  return "容器内 TGI 没有标准模型卸载 API；未处理（不会停止容器）";
}

/**
 * 找出占用 GPU 的模型服务容器，并给出候选访问通道。
 * 容器内进程服务（vLLM/TGI/llama.cpp/SGLang）只记录提示，不停止容器。
 */
export async function findContainerServices(opts: {
  /**
   * nvidia-smi 计算进程快照。
   */
  apps: GpuComputeApp[];
}): Promise<ContainerDiscovery> {
  // 可卸载服务
  const services: ContainerService[] = [];
  // 无法处理的原因（去重）
  const issues: string[] = [];
  const seenIssues = new Set<string>();
  // 已处理容器 + provider
  const seenServices = new Set<string>();
  // 容器 inspect 缓存
  const inspected = new Map<string, ContainerInfo | null>();

  for (const app of opts.apps) {
    // cgroup
    const cg = readContainerInfo(app.pid);
    if (cg === null) continue;
    // inspect（缓存）
    let info = inspected.get(cg.id);
    if (info === undefined) {
      info = await inspectContainer(cg.id, cg.runtime);
      inspected.set(cg.id, info);
    }
    // 拿不到 inspect 时用命令行做最小识别
    const procArgs = readProcessCmdline(app.pid);
    if (info === null) {
      info = {
        runtime: cg.runtime,
        id: cg.id,
        name: "",
        image: "",
        // 自身 + 祖先进程命令行：识别被包装/多进程服务
        command: [...procArgs, ...readAncestorCmdlines(app.pid)],
        running: true,
        hostPid: app.pid,
      };
    }
    if (!info.running) continue;
    // 目标匹配：镜像 / 名称 / inspect 命令 / 进程命令行（补充 crictl 缺失 command 的情况）
    const rule = matchContainerTarget(
      [info.image, info.name, ...info.command, ...procArgs].join(" "),
    );
    if (rule === undefined) continue;
    // 容器内进程服务：没有通用卸载 API，不停止容器
    if (rule.kind === "process") {
      const message = `容器 ${info.name !== "" ? info.name : info.id.slice(0, 12)}：${unsupportedProcessMessage(rule)}`;
      if (!seenIssues.has(message)) {
        seenIssues.add(message);
        issues.push(message);
      }
      continue;
    }
    // provider
    if (!isProviderTargetId(rule.id)) continue;
    const key = `${info.id}:${rule.id}`;
    if (seenServices.has(key)) continue;
    seenServices.add(key);
    const channels = channelsForProvider(rule.id, info, app.pid, cg.kubernetes);
    if (channels.length === 0) {
      const message = `容器 ${info.name !== "" ? info.name : info.id.slice(0, 12)} 内的 ${rule.id} 占用 GPU，但没有可用的访问通道；未卸载（容器保持运行）`;
      if (!seenIssues.has(message)) {
        seenIssues.add(message);
        issues.push(message);
      }
      continue;
    }
    services.push({
      target: rule,
      provider: rule.id,
      pid: app.pid,
      usedMb: app.usedMb,
      info,
      channels,
    });
  }
  return { services, issues };
}
