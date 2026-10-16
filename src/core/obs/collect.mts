/** 状态采集契约 —— 目标形态即 status --json 的 data 部分。
 *  数据源：引擎 REST(/queue /system_stats)、引擎日志（tqdm 解析 + mtime 外推，M1）、
 *  nvidia-smi、/proc/<pid>/status、/proc/meminfo、k3s crictl（容器模型清单）。
 *  WS 实时进度在 M2 接入后，日志外推降级为兜底。 */
export interface StatusData {
  engine: { up: boolean; pid: number | null; server: string };
  task: { desc: string; pid: number; started: string; alive: true } | null;
  progress: {
    step: number;
    steps: number;
    sPerIt: number;
    remainMin: number;
    eta: string;
    /** 外推值（日志兜底路径）为 true */
    estimated: boolean;
  } | null;
  gpu: { usedMib?: number; totalMib?: number; freeMib?: number; utilPct?: number; error?: string };
  mem: { totalGb?: number; availGb?: number };
  shots: Array<{ id: string; slug: string; done: boolean; path: string | null }>;
}

export async function collectStatus(): Promise<StatusData> {
  // M1：按上述数据源逐项实现；形状一旦发布即冻结（agent 依赖）
  throw new Error("not_implemented: 状态采集在 M1 交付（docs/PLAN.md §6）");
}
