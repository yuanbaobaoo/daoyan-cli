/** GPU 接管编排 —— 只在 local 任务、且 project.json 的 gpu.takeover=true 时生效。
 *  流程：恢复旧租约 → 卸载内置模型服务（含容器内服务）→ 驱逐裸机进程服务 → 写租约；
 *  任务结束：重载模型/重启进程 → 清租约。单项失败不中止任务，记录 warning/error。
 *  容器内的服务只卸载模型，不停止容器或进程；裸机进程服务仍按内置规则 SIGTERM/SIGKILL。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import { sleep } from "../../shared/net.mts";
import type { ProjectConfig, RunGpuRecord } from "../project/types.mts";
import { gpuComputeApps, gpuSnapshot, totalVram } from "./detect.mts";
import { clearLease, inspectLease, newLease, writeLease, type GpuLease } from "./lease.mts";
import {
  GPU_PROVIDER_IDS,
  type GpuLeaseEntry,
  type ProviderChannel,
  type ProviderId,
} from "./targets.mts";
import * as ollama from "./providers/ollama.mts";
import * as lmstudio from "./providers/lmstudio.mts";
import * as xinference from "./providers/xinference.mts";
import * as vllm from "./providers/vllm.mts";
import { evictProcesses, findTargetProcesses, restartProcesses } from "./providers/process.mts";
import { findContainerServices } from "./containers.mts";

/**
 * 模型服务适配器。
 */
interface ProviderAdapter {
  /**
   * 探测已加载模型；不可达返回 null。
   */
  detect: (channel: ProviderChannel) => Promise<string[] | null>;
  /**
   * 卸载模型。
   */
  unload: (
    channel: ProviderChannel,
    models: string[],
  ) => Promise<{ ok: string[]; errors: string[] }>;
  /**
   * 重载模型。
   */
  load: (
    channel: ProviderChannel,
    models: string[],
  ) => Promise<{ restored: string[]; errors: string[] }>;
}

// 内置适配器表（用户不可配置）
const PROVIDERS: Record<ProviderId, ProviderAdapter> = {
  ollama,
  lmstudio,
  xinference,
  vllm,
};

// 宿主机默认通道（旧租约没有 channel 时也用它恢复）
const HOST_CHANNELS: Record<ProviderId, ProviderChannel> = {
  ollama: ollama.HOST_CHANNEL,
  lmstudio: lmstudio.HOST_CHANNEL,
  xinference: xinference.HOST_CHANNEL,
  vllm: vllm.HOST_CHANNEL,
};

/**
 * 接管警告 / 部分失败。
 */
export interface TakeoverIssue {
  /**
   * 错误码（gpu_unsupported / gpu_takeover_failed / gpu_restore_failed）。
   */
  code: string;
  /**
   * 说明。
   */
  message: string;
}

/**
 * 接管结果。
 */
export interface TakeoverOutcome {
  /**
   * 是否实际请求了接管（开关 + 平台条件）。
   */
  enabled: boolean;
  /**
   * 写入 run.json 的 gpu 段（takeover=false 时也应记录一次尝试）。
   */
  record: RunGpuRecord;
  /**
   * 警告 / 部分失败。
   */
  issues: TakeoverIssue[];
}

/**
 * 项目是否开启 GPU 接管。
 */
export function takeoverEnabled(project: ProjectConfig): boolean {
  return project.gpu?.takeover === true;
}

/**
 * 执行接管；调用方必须已持有 machine task lock。
 */
export async function takeoverGpu(opts: {
  project: ProjectConfig;
  taskId: string;
  projectRoot: string;
  log: (m: string) => void;
}): Promise<TakeoverOutcome> {
  // 未开启：不产生任何动作
  if (!takeoverEnabled(opts.project)) {
    return {
      enabled: false,
      record: { takeover: false, evicted: [], restored: [], errors: [] },
      issues: [],
    };
  }

  // 平台 / 驱动探测
  const snapshot = await gpuSnapshot();
  if (!snapshot.supported) {
    // 非 Linux/NVIDIA 只警告，任务继续
    return {
      enabled: false,
      record: { takeover: false, evicted: [], restored: [], errors: [] },
      issues: [
        {
          code: "gpu_unsupported",
          message: `GPU 接管不可用（${snapshot.reason ?? "未知原因"}）；任务继续，未驱逐任何进程`,
        },
      ],
    };
  }

  // 接管前显存
  const before = totalVram(snapshot);
  // 租约条目
  const entries: GpuLeaseEntry[] = [];
  // 租约先落盘（空），随后每成功一项就更新，保证崩溃后可恢复
  const lease = newLease(opts.taskId, opts.projectRoot);
  writeLease(lease);
  // 部分失败
  const issues: TakeoverIssue[] = [];
  // run.json 的 evicted 摘要
  const evicted: Array<Record<string, unknown>> = [];

  // 1) 宿主机模型服务：API/CLI 卸载模型，保留进程
  for (const id of GPU_PROVIDER_IDS) {
    // 适配器
    const adapter = PROVIDERS[id];
    // 宿主机通道
    const channel = HOST_CHANNELS[id];
    // 已加载模型
    const models = await adapter.detect(channel);
    if (models === null || models.length === 0) continue;
    opts.log(`GPU 接管：卸载 ${id} 模型 ${models.join(", ")}`);
    // 卸载结果
    const result = await adapter.unload(channel, models);
    if (result.ok.length > 0) {
      entries.push({ kind: "provider", provider: id, models: result.ok, channel });
      lease.entries.push({ kind: "provider", provider: id, models: result.ok, channel });
      writeLease(lease);
      evicted.push({ kind: "provider", provider: id, models: result.ok, via: "host" });
    }
    for (const e of result.errors) {
      issues.push({ code: "gpu_takeover_failed", message: e });
    }
  }

  // 模型卸载是异步释放显存，短暂等待后再采样
  if (entries.length > 0) await sleep(500);

  // 模型卸载后重新采样：容器内服务只处理仍占用 GPU 的
  const apps = await gpuComputeApps();
  // 本次接管可安全处理的 GPU PID
  const gpuPids = apps !== null ? new Set(apps.map((a) => a.pid)) : new Set<number>();
  if (apps === null) {
    issues.push({
      code: "gpu_takeover_failed",
      message: "nvidia-smi 无法读取计算进程，跳过容器/进程接管",
    });
  }

  // 2) 容器内模型服务：host / netns / exec 通道卸载模型，不停止容器
  const discovery = await findContainerServices({ apps: apps ?? [] });
  for (const issue of discovery.issues) {
    issues.push({ code: "gpu_takeover_failed", message: issue });
  }
  for (const service of discovery.services) {
    // 适配器
    const adapter = PROVIDERS[service.provider];
    // 是否已经访问成功（含“没有已加载模型”）
    let accessed = false;
    for (const channel of service.channels) {
      // 当前通道是否能访问服务
      const models = await adapter.detect(channel);
      if (models === null) continue;
      accessed = true;
      // 通道可用但没有模型：无需卸载
      if (models.length === 0) break;
      // 容器名（日志用）
      const name =
        service.info.name !== "" ? service.info.name : service.info.id.slice(0, 12);
      opts.log(
        `GPU 接管：卸载容器内 ${service.provider} 模型 ${models.join(", ")}（${name}，${channel.kind} 通道）`,
      );
      // 卸载结果
      const result = await adapter.unload(channel, models);
      if (result.ok.length > 0) {
        // 备用通道：任务期间主通道可能失效（如容器 PID 退出）
        const fallbacks = service.channels.filter((c) => c !== channel);
        const providerEntry: GpuLeaseEntry = {
          kind: "provider",
          provider: service.provider,
          models: result.ok,
          channel,
          ...(fallbacks.length > 0 ? { fallbacks } : {}),
        };
        entries.push(providerEntry);
        lease.entries.push(providerEntry);
        writeLease(lease);
        evicted.push({
          kind: "provider",
          provider: service.provider,
          models: result.ok,
          via: channel.kind,
          container: name,
        });
      }
      for (const e of result.errors) {
        issues.push({ code: "gpu_takeover_failed", message: e });
      }
      break;
    }
    if (!accessed) {
      // 容器名
      const name = service.info.name !== "" ? service.info.name : service.info.id.slice(0, 12);
      const why =
        service.provider === "vllm"
          ? "未启用 sleep mode（需要 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1）"
          : "无法访问（host/netns/exec 均不可用）";
      issues.push({
        code: "gpu_takeover_failed",
        message: `容器内 ${service.provider} ${why}；未卸载，容器保持运行（${name}）`,
      });
    }
  }

  // 3) 裸机进程服务：SIGTERM/SIGKILL，记录重启信息
  // 容器内进程已在上面排除，不会被裸杀
  const targets = await findTargetProcesses({ gpuPids });
  if (targets.length > 0) {
    opts.log(`GPU 接管：驱逐裸机进程 ${targets.map((t) => `${t.target}(pid ${t.pid})`).join(", ")}`);
  }
  // 驱逐结果
  const killed = await evictProcesses(targets);
  for (const t of killed.evicted) {
    entries.push({ kind: "process", process: t });
    lease.entries.push({ kind: "process", process: t });
    evicted.push({ kind: "process", target: t.target, pid: t.pid });
  }
  if (killed.evicted.length > 0) writeLease(lease);
  for (const e of killed.errors) {
    issues.push({ code: "gpu_takeover_failed", message: e });
  }

  // 没有实际接管则删除空租约
  if (entries.length === 0) clearLease();

  // 接管后显存（重新采样）
  const afterSnapshot = await gpuSnapshot();
  const after = afterSnapshot.supported ? totalVram(afterSnapshot) : null;

  return {
    enabled: true,
    record: {
      takeover: true,
      before: { used_mb: before.usedMb, free_mb: before.freeMb },
      evicted,
      ...(after !== null ? { after: { used_mb: after.usedMb, free_mb: after.freeMb } } : {}),
      restored: [],
      errors: issues.map((i) => ({ code: i.code, message: i.message })),
    },
    issues,
  };
}

/**
 * 按租约重载模型、重启裸机进程；全部成功才清租约。
 * 容器不会被停止，因此恢复只需按通道重载模型。
 */
export async function restoreLease(
  lease: GpuLease,
  log: (m: string) => void,
): Promise<{ restored: string[]; errors: TakeoverIssue[] }> {
  // 已恢复对象
  const restored: string[] = [];
  // 失败项
  const errors: TakeoverIssue[] = [];

  // 模型服务重载
  for (const entry of lease.entries) {
    if (entry.kind !== "provider") continue;
    // 租约字段校验（损坏的租约不执行恢复动作）
    if (!Array.isArray(entry.models)) {
      errors.push({ code: "gpu_restore_failed", message: "GPU 租约中的模型记录无效；跳过" });
      continue;
    }
    // 适配器
    const adapter = PROVIDERS[entry.provider];
    if (adapter === undefined) {
      errors.push({
        code: "gpu_restore_failed",
        message: `GPU 租约中的 provider ${String(entry.provider)} 未知；跳过`,
      });
      continue;
    }
    // 访问通道（旧租约没有 channel 时走宿主机默认端口）
    const primary = entry.channel ?? HOST_CHANNELS[entry.provider];
    // 主通道 + 备用通道
    const candidates = [
      primary,
      ...(Array.isArray(entry.fallbacks) ? entry.fallbacks : []),
    ];
    // 选第一个可达通道；同时拿到当前已加载模型
    let channel: ProviderChannel | null = null;
    let current: string[] | null = null;
    for (const c of candidates) {
      const det = await adapter.detect(c);
      if (det !== null) {
        channel = c;
        current = det;
        break;
      }
    }
    // 全部不可达：仍尝试主通道，由 load 返回明确错误
    if (channel === null) {
      channel = primary;
      current = null;
    }
    // 只恢复缺失的模型
    const missing =
      current === null ? entry.models : entry.models.filter((m) => !current.includes(m));
    if (missing.length === 0) {
      restored.push(`${entry.provider}:已加载（跳过）`);
      continue;
    }
    optsLog(
      log,
      `GPU 恢复：重载 ${entry.provider} 模型 ${missing.join(", ")}（${channel.kind} 通道）`,
    );
    // 重载结果
    const r = await adapter.load(channel, missing);
    for (const m of r.restored) restored.push(`${entry.provider}:${m}`);
    for (const e of r.errors) errors.push({ code: "gpu_restore_failed", message: e });
  }

  // 裸机进程服务重启
  const procs = lease.entries.filter(
    (e): e is Extract<GpuLeaseEntry, { kind: "process" }> => e.kind === "process",
  );
  if (procs.length > 0) {
    optsLog(
      log,
      `GPU 恢复：重启裸机进程 ${procs.map((p) => `${p.process.target}(pid ${p.process.pid})`).join(", ")}`,
    );
  }
  // 重启结果
  const r = await restartProcesses(procs.map((p) => p.process));
  restored.push(...r.restored);
  for (const e of r.errors) errors.push({ code: "gpu_restore_failed", message: e });

  if (errors.length === 0) clearLease();
  return { restored, errors };
}

/**
 * 如果存在租约则恢复；损坏的租约抛 gpu_lease_corrupt。
 */
export async function restoreLeaseIfAny(
  log: (m: string) => void = () => {},
): Promise<{ restored: string[]; errors: TakeoverIssue[] }> {
  // 租约状态
  const cur = inspectLease();
  if (cur.status === "absent") return { restored: [], errors: [] };
  if (cur.status === "corrupt") {
    throw new DaoyanCliError({
      code: "gpu_lease_corrupt",
      message: `GPU 租约损坏（${cur.path}）：${cur.message}。确认没有任务在跑后手动处理`,
    });
  }
  log(`发现旧 GPU 租约（task ${cur.lease.task_id}），先恢复再开始新任务`);
  return restoreLease(cur.lease, log);
}

/**
 * 日志小包装（统一前缀）。
 */
function optsLog(log: (m: string) => void, msg: string): void {
  log(msg);
}
