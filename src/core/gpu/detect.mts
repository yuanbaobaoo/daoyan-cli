/** GPU 能力与占用探测 —— 首版目标平台 Linux + NVIDIA。
 *  其他平台只返回 supported=false，不报错；接管开关打开时给 gpu_unsupported 警告。 */
import { tryExecCapture } from "../../shared/exec.mts";

/**
 * 单张 GPU 的显存快照（MiB）。
 */
export interface GpuDeviceSnapshot {
  /**
   * 设备序号。
   */
  index: number;
  /**
   * 已用显存（MiB）。
   */
  usedMb: number;
  /**
   * 总显存（MiB）。
   */
  totalMb: number;
  /**
   * 空闲显存（MiB）。
   */
  freeMb: number;
  /**
   * GPU 利用率（%）。
   */
  utilPct?: number;
}

/**
 * GPU 快照结果。
 */
export interface GpuSnapshot {
  /**
   * 是否支持接管（Linux + nvidia-smi）。
   */
  supported: boolean;
  /**
   * 不支持原因。
   */
  reason?: string;
  /**
   * 设备列表（多卡）。
   */
  devices: GpuDeviceSnapshot[];
}

/**
 * 探测平台与 nvidia-smi，读取显存快照。
 */
export async function gpuSnapshot(): Promise<GpuSnapshot> {
  if (process.platform !== "linux") {
    return { supported: false, reason: `platform ${process.platform}`, devices: [] };
  }
  // nvidia-smi 抽样结果（命令缺失为 null）
  const r = await tryExecCapture(
    "nvidia-smi",
    ["--query-gpu=index,memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
    { timeoutMs: 10_000 },
  );
  if (r === null || r.code !== 0) {
    return { supported: false, reason: "nvidia-smi 不可用", devices: [] };
  }
  // 解析出的设备
  const devices: GpuDeviceSnapshot[] = [];
  for (const line of r.stdout.trim().split("\n")) {
    // csv 字段
    const parts = line.split(",").map((x) => x.trim());
    if (parts.length < 3) continue;
    // 设备序号
    const index = Number(parts[0]);
    // 已用显存
    const used = Number(parts[1]);
    // 总显存
    const total = Number(parts[2]);
    // 利用率
    const util = Number(parts[3]);
    if (!Number.isFinite(index) || !Number.isFinite(used) || !Number.isFinite(total) || total <= 0) continue;
    devices.push({
      index,
      usedMb: used,
      totalMb: total,
      freeMb: Math.max(0, total - used),
      ...(Number.isFinite(util) ? { utilPct: util } : {}),
    });
  }
  if (devices.length === 0) {
    return { supported: false, reason: "nvidia-smi 无可解析设备", devices: [] };
  }
  return { supported: true, devices };
}

/**
 * 汇总显存（所有设备的合计）。
 */
export function totalVram(snapshot: GpuSnapshot): { usedMb: number; totalMb: number; freeMb: number } {
  return snapshot.devices.reduce(
    (acc, d) => ({
      usedMb: acc.usedMb + d.usedMb,
      totalMb: acc.totalMb + d.totalMb,
      freeMb: acc.freeMb + d.freeMb,
    }),
    { usedMb: 0, totalMb: 0, freeMb: 0 },
  );
}

/**
 * 单个 GPU 计算进程快照。
 */
export interface GpuComputeApp {
  /**
   * 宿主 PID（容器内进程也以宿主 PID 出现）。
   */
  pid: number;
  /**
   * 该进程占用的显存（MiB）；驱动不提供时为 null。
   */
  usedMb: number | null;
}

/**
 * 当前占用 GPU 计算的进程（PID + 显存）。
 * 返回 null 表示无法获取（此时进程/容器接管必须放弃，避免误杀普通进程）。
 */
export async function gpuComputeApps(): Promise<GpuComputeApp[] | null> {
  if (process.platform !== "linux") return null;
  // nvidia-smi 计算进程查询（同一进程可能出现在多张卡上）
  let r = await tryExecCapture(
    "nvidia-smi",
    ["--query-compute-apps=pid,used_memory", "--format=csv,noheader,nounits"],
    { timeoutMs: 10_000 },
  );
  // 旧驱动可能不支持 used_memory：退回只查 PID
  let withMemory = true;
  if (r === null || r.code !== 0) {
    r = await tryExecCapture("nvidia-smi", ["--query-compute-apps=pid", "--format=csv,noheader,nounits"], {
      timeoutMs: 10_000,
    });
    withMemory = false;
  }
  if (r === null || r.code !== 0) return null;
  // PID -> 显存合计；null 表示驱动未给出数值
  const byPid = new Map<number, number | null>();
  for (const line of r.stdout.split("\n")) {
    // CSV 字段：pid[, used_memory]
    const parts = line.split(",").map((x) => x.trim());
    if (parts.length < 1) continue;
    // 宿主 PID
    const pid = Number(parts[0]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    // 显存（[N/A] 等不可解析值归 null）
    const usedRaw = Number(parts[1]);
    const used = withMemory && Number.isFinite(usedRaw) ? usedRaw : null;
    // 同一进程多卡时累加；任一未知则保持未知
    if (!byPid.has(pid)) {
      byPid.set(pid, used);
      continue;
    }
    const prev = byPid.get(pid);
    byPid.set(pid, prev === null || used === null ? null : (prev ?? 0) + used);
  }
  return [...byPid.entries()].map(([pid, usedMb]) => ({ pid, usedMb }));
}

/**
 * 当前占用 GPU 计算的进程 PID 集合（nvidia-smi compute-apps）。
 * 返回 null 表示无法获取（此时进程接管必须放弃，避免误杀普通进程）。
 */
export async function gpuProcessPids(): Promise<Set<number> | null> {
  const apps = await gpuComputeApps();
  if (apps === null) return null;
  return new Set(apps.map((a) => a.pid));
}
