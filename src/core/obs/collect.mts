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
import type { ProjectConfig, ShotsFile } from "../project/types.mts";

export interface StatusData {
  engine: { up: boolean; mode: string; pid: number | null; server: string };
  queue: { running: number | null; pending: number | null };
  task: { desc: string; pid: number; started: string } | null;
  gpu: { usedMib?: number; totalMib?: number; utilPct?: number; error?: string };
  mem: { totalGb?: number; availGb?: number };
  shots: Array<{ id: string; slug: string; done: boolean; path: string | null }>;
}

export async function collectStatus(root: string, cfg: ProjectConfig, shots: ShotsFile): Promise<StatusData> {
  const probe = await probeEngine(root, cfg);

  let running: number | null = null;
  let pending: number | null = null;
  if (probe.up) {
    try {
      const q = await clientFromEngine(cfg.engine).queue();
      running = q.queue_running.length;
      pending = q.queue_pending.length;
    } catch {
      /* 保持 null */
    }
  }

  const lockInfo = readLock(join(root, "logs", "task.lock"));
  const task =
    lockInfo !== null && !lockInfo.stale
      ? { desc: lockInfo.desc, pid: lockInfo.pid, started: lockInfo.started }
      : null;

  const shotList = shots.shots.map((s) => {
    if (cfg.engine.mode === "local") {
      const p = findClip(root, cfg, s);
      return { id: s.id, slug: s.slug, done: p !== null, path: p };
    }
    const m = join(root, "manifests", `${s.id}.json`);
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

/** nvidia-smi 摘要；无 GPU / 无命令时给出 error 字段（单 GPU 口径）。 */
async function gpuSummary(): Promise<StatusData["gpu"]> {
  const r = await tryExecCapture(
    "nvidia-smi",
    ["--query-gpu=memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
    { timeoutMs: 10_000 },
  );
  if (r === null || r.code !== 0) {
    return { error: r === null ? "nvidia-smi 不可用" : `nvidia-smi 退出码 ${r.code}` };
  }
  const parts = r.stdout.trim().split("\n")[0]?.split(",").map((x) => x.trim()) ?? [];
  const used = Number(parts[0]);
  const total = Number(parts[1]);
  const util = Number(parts[2]);
  if (!Number.isFinite(used) || !Number.isFinite(total)) return { error: "nvidia-smi 输出无法解析" };
  return {
    usedMib: used,
    totalMib: total,
    utilPct: Number.isFinite(util) ? util : undefined,
  };
}

/** /proc/meminfo（Linux）；其他平台留空。 */
function memSummary(): StatusData["mem"] {
  try {
    const txt = readFileSync("/proc/meminfo", "utf8");
    const get = (key: string): number | undefined => {
      const m = new RegExp(`^${key}:\\s+(\\d+) kB`, "m").exec(txt);
      return m !== null ? Number(m[1]) / 1_048_576 : undefined;
    };
    const total = get("MemTotal");
    const avail = get("MemAvailable");
    return total === undefined ? {} : { totalGb: round1(total), availGb: avail === undefined ? undefined : round1(avail) };
  } catch {
    return {};
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 供 logs/status 展示：manifests 目录列表（remote 模式下完成度依据）。 */
export function listManifests(root: string): string[] {
  const dir = join(root, "manifests");
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}
