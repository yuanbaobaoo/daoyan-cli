/** task events.jsonl —— 结构化事件流：Agent 轮询/跟随它，不需要解析引擎文本日志。
 *  写入是追加式；读取按 seq 过滤，容忍最后一行未写完。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendFileSync } from "node:fs";
import { ensureDir, nowIso } from "../../shared/fs.mts";
import { EVENTS_FILE, type TaskEvent } from "../project/types.mts";

/**
 * 已知事件类型（文档与 Skill 用；允许扩展）。
 */
export type TaskEventType =
  | "queued"
  | "worker_started"
  | "machine_lock_acquired"
  | "engine_starting"
  | "engine_started"
  | "engine_ready"
  | "gpu_takeover_started"
  | "gpu_takeover_finished"
  | "run_started"
  | "upload_started"
  | "upload_finished"
  | "submitted"
  | "progress"
  | "run_succeeded"
  | "run_failed"
  | "cleanup_started"
  | "cleanup_finished"
  | "cancel_requested"
  | "finished";

/**
 * 事件文件绝对路径。
 */
export function eventsPath(taskDir: string): string {
  return join(taskDir, EVENTS_FILE);
}

/**
 * 读取全部事件（跳过损坏行）。
 */
export function readEvents(taskDir: string, fromSeq = 0): TaskEvent[] {
  // 事件文件路径
  const file = eventsPath(taskDir);
  if (!existsSync(file)) return [];
  // 逐行解析
  const out: TaskEvent[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      // 单行事件
      const ev = JSON.parse(line) as TaskEvent;
      if (typeof ev.seq === "number" && typeof ev.type === "string" && ev.seq > fromSeq) out.push(ev);
    } catch {
      // 容忍最后一行未写完
    }
  }
  return out;
}

/**
 * 当前最大 seq。
 */
export function lastSeq(taskDir: string): number {
  // 已有事件
  const evs = readEvents(taskDir);
  return evs.length === 0 ? 0 : (evs[evs.length - 1]?.seq ?? 0);
}

/**
 * 追加一个事件，返回写入的事件（seq 自动递增）。
 */
export function appendEvent(
  taskDir: string,
  type: TaskEventType | string,
  data: Record<string, unknown> = {},
): TaskEvent {
  ensureDir(taskDir);
  // 下一个序号
  const seq = lastSeq(taskDir) + 1;
  // 事件对象
  const ev: TaskEvent = { seq, ts: nowIso(), type, data };
  appendFileSync(eventsPath(taskDir), JSON.stringify(ev) + "\n");
  return ev;
}
