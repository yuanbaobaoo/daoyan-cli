/** 单任务锁 —— JSON 内容 + pid 探活判陈旧。
 *  同一时刻只允许一个生成任务（shot/batch）；引擎队列另有 engine_busy 双保险。 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { DaoyanCliError } from "../../shared/errors.mts";

export interface LockInfo {
  pid: number;
  desc: string;
  started: string;
  /** pid 已死 → true（可安全清理） */
  stale?: boolean;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM：进程存在但属他人（root 场景常见）——视为存活
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function readLock(path: string): LockInfo | null {
  if (!existsSync(path)) return null;
  let info: LockInfo;
  try {
    info = JSON.parse(readFileSync(path, "utf8")) as LockInfo;
  } catch {
    return { pid: -1, desc: "锁文件损坏", started: "?", stale: true };
  }
  if (typeof info.pid !== "number" || alive(info.pid)) return info;
  return { ...info, stale: true };
}

export function acquireLock(path: string, desc: string): void {
  const cur = readLock(path);
  if (cur && !cur.stale) {
    throw new DaoyanCliError({
      code: "lock_held",
      message: `已有任务运行中：${cur.desc}（pid ${cur.pid}，始于 ${cur.started}）。看日志：daoyan-cli logs -f`,
      details: { pid: cur.pid, desc: cur.desc, started: cur.started },
    });
  }
  writeFileSync(
    path,
    JSON.stringify({ pid: process.pid, desc, started: new Date().toISOString() }, null, 2),
  );
}

export function releaseLock(path: string): void {
  rmSync(path, { force: true });
}
