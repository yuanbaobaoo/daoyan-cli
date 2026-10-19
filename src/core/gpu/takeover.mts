/** GPU 接管编排 —— 只在 local 任务、且 project.json 的 gpu.takeover=true 时生效。
 *  流程：恢复旧租约 → 探测内置模型服务/进程服务 → 卸载/驱逐 → 写租约；
 *  任务结束：恢复模型/进程 → 清租约。单项失败不中止任务，记录 warning/error。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import type { ProjectConfig, RunGpuRecord } from "../project/types.mts";
import { gpuSnapshot, totalVram } from "./detect.mts";
import { clearLease, inspectLease, newLease, writeLease, type GpuLease } from "./lease.mts";
import { GPU_PROVIDER_IDS, type GpuLeaseEntry, type ProviderId } from "./targets.mts";
import * as ollama from "./providers/ollama.mts";
import * as lmstudio from "./providers/lmstudio.mts";
import * as xinference from "./providers/xinference.mts";
import { evictProcesses, findTargetProcesses, restartProcesses } from "./providers/process.mts";

/**
 * 模型服务适配器。
 */
interface ProviderAdapter {
  /**
   * 探测已加载模型；不可达返回 null。
   */
  detect: () => Promise<string[] | null>;
  /**
   * 卸载模型。
   */
  unload: (models: string[]) => Promise<{ ok: string[]; errors: string[] }>;
  /**
   * 重载模型。
   */
  load: (models: string[]) => Promise<{ restored: string[]; errors: string[] }>;
}

// 内置适配器表（用户不可配置）
const PROVIDERS: Record<ProviderId, ProviderAdapter> = {
  ollama,
  lmstudio,
  xinference,
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

  // 1) 模型服务优先：只卸载模型，保留进程
  for (const id of GPU_PROVIDER_IDS) {
    // 适配器
    const adapter = PROVIDERS[id];
    // 已加载模型
    const models = await adapter.detect();
    if (models === null || models.length === 0) continue;
    opts.log(`GPU 接管：卸载 ${id} 模型 ${models.join(", ")}`);
    // 卸载结果
    const result = await adapter.unload(models);
    if (result.ok.length > 0) {
      entries.push({ kind: "provider", provider: id, models: result.ok });
      lease.entries.push({ kind: "provider", provider: id, models: result.ok });
      writeLease(lease);
      evicted.push({ kind: "provider", provider: id, models: result.ok });
    }
    for (const e of result.errors) {
      issues.push({ code: "gpu_takeover_failed", message: e });
    }
  }

  // 2) 内置进程服务：SIGTERM/SIGKILL，记录重启信息
  const targets = await findTargetProcesses();
  if (targets.length > 0) {
    opts.log(`GPU 接管：驱逐进程 ${targets.map((t) => `${t.target}(pid ${t.pid})`).join(", ")}`);
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
 * 按租约恢复模型与进程；全部成功才清租约。
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
    optsLog(log, `GPU 恢复：重载 ${entry.provider} 模型 ${entry.models.join(", ")}`);
    // 适配器
    const adapter = PROVIDERS[entry.provider];
    // 重载结果
    const r = await adapter.load(entry.models);
    for (const m of r.restored) restored.push(`${entry.provider}:${m}`);
    for (const e of r.errors) errors.push({ code: "gpu_restore_failed", message: e });
  }

  // 进程服务重启
  const procs = lease.entries.filter((e): e is Extract<GpuLeaseEntry, { kind: "process" }> => e.kind === "process");
  if (procs.length > 0) {
    optsLog(log, `GPU 恢复：重启进程 ${procs.map((p) => `${p.process.target}(pid ${p.process.pid})`).join(", ")}`);
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
