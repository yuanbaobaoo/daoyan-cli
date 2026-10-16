/** 单任务锁 —— JSON 内容 + pid 探活判陈旧。
 *  同一时刻只允许一个生成任务（shot/batch）；引擎队列另有 engine_busy 双保险。 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { DaoyanCliError } from "../../shared/errors.mts";

/**
 * 锁文件的内容结构。
 */
export interface LockInfo {
  /**
   * 持锁进程的 pid。
   */
  pid: number;
  /**
   * 任务描述（如 "shot 01 02"，用于提示）。
   */
  desc: string;
  /**
   * 持锁开始时间（ISO 字符串）。
   */
  started: string;
  /**
   * pid 已死 → true（可安全清理）
   */
  stale?: boolean;
}

/**
 * pid 探活：进程存在返回 true；返回 false 表示可判定为死进程。
 */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM：进程存在但属他人（root 场景常见）——视为存活
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * 读取锁文件；不存在返回 null，损坏视为陈旧锁（stale=true）。
 */
export function readLock(path: string): LockInfo | null {
  if (!existsSync(path)) return null;
  // 锁内容（解析成功后回填 stale）
  let info: LockInfo;
  try {
    info = JSON.parse(readFileSync(path, "utf8")) as LockInfo;
  } catch {
    return { pid: -1, desc: "锁文件损坏", started: "?", stale: true };
  }
  if (typeof info.pid !== "number" || alive(info.pid)) return info;
  return { ...info, stale: true };
}

/**
 * 获取任务锁：已有活动锁时抛 lock_held；陈旧锁直接覆盖。
 */
export function acquireLock(path: string, desc: string): void {
  // 当前锁状态（null = 无锁）
  const cur = readLock(path);
  if (cur && !cur.stale) {
    throw new DaoyanCliError({
      code: "lock_held",
      message: `已有任务运行中：${cur.desc}（pid ${cur.pid}，始于 ${cur.started}）。看日志：daoyan logs -f`,
      details: { pid: cur.pid, desc: cur.desc, started: cur.started },
    });
  }
  writeFileSync(
    path,
    JSON.stringify({ pid: process.pid, desc, started: new Date().toISOString() }, null, 2),
  );
}

/**
 * 释放任务锁（force 删除，不存在不报错）。
 */
export function releaseLock(path: string): void {
  rmSync(path, { force: true });
}
