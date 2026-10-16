/** 状态采集 —— status --json 的 data 部分。
 *  数据源：引擎 REST（/system_stats /queue）、任务锁、nvidia-smi、/proc/meminfo（Linux）。
 *  完成度：local 模式扫描引擎 output；remote 模式依据 manifests/。
 *  WS 实时进度在 M2 接入（progress 字段届时填充）。 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { clientFromEngine } from "../comfy/client.mts";
import { probeEngine } from "../comfy/lifecycle.mts";
import { findClip } from "../pipeline/generate.mts";
import { readLock } from "../lock/task-lock.mts";
import { tryExecCapture } from "../../shared/exec.mts";
import { LOG_DIR, MANIFESTS_DIR, TASK_LOCK_FILE, type ProjectConfig, type ShotsFile } from "../project/types.mts";

/**
 * status 命令的输出数据（--json 的 data 部分）。
 */
export interface StatusData {
  /**
   * 引擎段：可达性 / 模式 / pid / base URL。
   */
  engine: { up: boolean; mode: string; pid: number | null; server: string };
  /**
   * 队列段：执行中 / 等待中的任务数（不可达为 null）。
   */
  queue: { running: number | null; pending: number | null };
  /**
   * 任务锁段（无活动任务为 null）。
   */
  task: { desc: string; pid: number; started: string } | null;
  /**
   * GPU 段（抽样失败时给出 error 字段）。
   */
  gpu: { usedMib?: number; totalMib?: number; utilPct?: number; error?: string };
  /**
   * 内存段（非 Linux 平台留空）。
   */
  mem: { totalGb?: number; availGb?: number };
  /**
   * 逐镜完成度（local 看产物文件，remote 看 manifest）。
   */
  shots: Array<{ id: string; slug: string; done: boolean; path: string | null }>;
}

/**
 * 采集项目当前状态（status 命令的数据源）。
 */
export async function collectStatus(root: string, cfg: ProjectConfig, shots: ShotsFile): Promise<StatusData> {
  // 引擎探测快照
  const probe = await probeEngine(root, cfg);
  // 执行中任务数（探测失败保持 null）
  let running: number | null = null;
  // 等待中任务数（探测失败保持 null）
  let pending: number | null = null;
  if (probe.up) {
    try {
      // 队列快照
      const q = await clientFromEngine(cfg.engine).queue();
      running = q.queue_running.length;
      pending = q.queue_pending.length;
    } catch {
      /* 保持 null */
    }
  }

  // 任务锁内容（无锁为 null）
  const lockInfo = readLock(join(root, LOG_DIR, TASK_LOCK_FILE));
  // 活动任务摘要（陈旧锁不算）
  const task =
    lockInfo !== null && !lockInfo.stale
      ? { desc: lockInfo.desc, pid: lockInfo.pid, started: lockInfo.started }
      : null;

  // 逐镜完成度
  const shotList = shots.shots.map((s) => {
    if (cfg.engine.mode === "local") {
      // 该镜已有产物（无则 null）
      const p = findClip(root, cfg, s);
      return { id: s.id, slug: s.slug, done: p !== null, path: p };
    }
    // remote 模式以 manifest 是否存在为准
    const m = join(root, MANIFESTS_DIR, `${s.id}.json`);
    return { id: s.id, slug: s.slug, done: existsSync(m), path: null };
  });

  return {
    engine: { up: probe.up, mode: cfg.engine.mode, pid: probe.pid, server: probe.baseUrl },
    queue: { running, pending },
    task,
    gpu: await gpuSummary(),
    mem: memSummary(),
    shots: shotList,
  };
}

/**
 * nvidia-smi 摘要；无 GPU / 无命令时给出 error 字段（单 GPU 口径）。
 */
async function gpuSummary(): Promise<StatusData["gpu"]> {
  // nvidia-smi 抽样结果（命令缺失为 null）
  const r = await tryExecCapture(
    "nvidia-smi",
    ["--query-gpu=memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
    { timeoutMs: 10_000 },
  );
  if (r === null || r.code !== 0) {
    return { error: r === null ? "nvidia-smi 不可用" : `nvidia-smi 退出码 ${r.code}` };
  }
  // csv 首行的三个字段
  const parts = r.stdout.trim().split("\n")[0]?.split(",").map((x) => x.trim()) ?? [];
  // 已用显存（MiB）
  const used = Number(parts[0]);
  // 总显存（MiB）
  const total = Number(parts[1]);
  // GPU 利用率（%）
  const util = Number(parts[2]);
  if (!Number.isFinite(used) || !Number.isFinite(total)) return { error: "nvidia-smi 输出无法解析" };
  return {
    usedMib: used,
    totalMib: total,
    utilPct: Number.isFinite(util) ? util : undefined,
  };
}

/**
 * /proc/meminfo（Linux）；其他平台留空。
 */
function memSummary(): StatusData["mem"] {
  try {
    // /proc/meminfo 全文
    const txt = readFileSync("/proc/meminfo", "utf8");
    // 按 key 取 kB 数值并换算成 GB
    const get = (key: string): number | undefined => {
      // 该 key 的匹配结果
      const m = new RegExp(`^${key}:\\s+(\\d+) kB`, "m").exec(txt);
      return m !== null ? Number(m[1]) / 1_048_576 : undefined;
    };

    // 总内存（GB）
    const total = get("MemTotal");
    // 可用内存（GB）
    const avail = get("MemAvailable");
    return total === undefined ? {} : { totalGb: round1(total), availGb: avail === undefined ? undefined : round1(avail) };
  } catch {
    return {};
  }
}

/**
 * 保留一位小数。
 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 供 logs/status 展示：manifests 目录列表（remote 模式下完成度依据）。
 */
export function listManifests(root: string): string[] {
  // manifests 目录的绝对路径
  const dir = join(root, MANIFESTS_DIR);
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}
