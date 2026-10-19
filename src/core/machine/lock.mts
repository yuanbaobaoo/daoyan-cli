/** 机器级单任务锁 —— ~/.dycli/machine.lock（按 OS 用户隔离）。
 *  硬约束：同一台设备同一时刻只允许一个 generation task（local/remote 共用）。
 *  - 原子创建（open wx）；已有锁时探活 owner PID；
 *  - owner 存活 -> machine_busy（带 owner 与 retry_after_ms）；
 *  - owner 已死 -> stale 恢复（task 标记 interrupted、停残留引擎、恢复 GPU 租约）后接管；
 *  - 锁损坏 -> machine_lock_corrupt，不盲目接管。
 *  metadata session（workflow nodes --refresh）也使用这把锁。 */
import { closeSync, existsSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, nowIso, randomSuffix } from "../../shared/fs.mts";

/**
 * 锁的用途：generation（任务）或 metadata（节点目录刷新）。
 */
export type LockKind = "generation" | "metadata";

/**
 * machine.lock 内容。
 */
export interface MachineLockRecord {
    /**
     * 随机令牌：只有持有者能更新/释放。
     */
    token: string;
    /**
     * 用途。
     */
    kind: LockKind;
    /**
     * 关联 task id（metadata 使用伪 id）。
     */
    task_id: string;
    /**
     * 项目根绝对路径。
     */
    project: string;
    /**
     * 执行模式。
     */
    mode: "local" | "remote";
    /**
     * 触发命令（展示用）。
     */
    command: string;
    /**
     * owner PID（CLI 预留后 handoff 给 worker）。
     */
    pid: number;
    /**
     * 获取时间（ISO）。
     */
    started_at: string;
}

/**
 * 拿到锁后返回的句柄。
 */
export interface AcquiredLock {
    /**
     * 锁文件路径。
     */
    path: string;
    /**
     * 当前锁记录。
     */
    record: MachineLockRecord;
    /**
     * worker 接管：原子更新 pid（token 校验）。
     */
    handoff: (pid: number) => void;
    /**
     * 释放（token 校验；不是 owner 则不动）。
     */
    release: () => void;
}

/**
 * 锁的读取结果。
 */
export type LockInspection =
    | { status: "absent"; path: string }
    | { status: "ok"; path: string; record: MachineLockRecord }
    | { status: "corrupt"; path: string; message: string };

/**
 * 锁文件路径（每 OS 用户一份）。
 */
export function machineLockPath(): string {
    return join(homedir(), ".dycli", "machine.lock");
}

/**
 * PID 探活：进程存在返回 true（EPERM 视为存在）。
 */
export function pidAlive(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return (e as NodeJS.ErrnoException).code === "EPERM";
    }
}

/**
 * 读取锁文件并探活（不修改）。
 */
export function inspectMachineLock(path = machineLockPath()): LockInspection {
    if (!existsSync(path)) return { status: "absent", path };
    // 原始内容
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
        return {
            status: "corrupt",
            path,
            message: e instanceof Error ? e.message : String(e),
        };
    }
    if (!isLockRecord(raw)) {
        return { status: "corrupt", path, message: "锁字段不完整或类型非法" };
    }
    return { status: "ok", path, record: raw };
}

/**
 * 校验锁记录结构。
 */
function isLockRecord(v: unknown): v is MachineLockRecord {
    if (typeof v !== "object" || v === null) return false;
    // 锁的宽松视图
    const o = v as Record<string, unknown>;
    return (
        typeof o.token === "string" &&
        (o.kind === "generation" || o.kind === "metadata") &&
        typeof o.task_id === "string" &&
        typeof o.project === "string" &&
        (o.mode === "local" || o.mode === "remote") &&
        typeof o.command === "string" &&
        typeof o.pid === "number" &&
        typeof o.started_at === "string"
    );
}

/**
 * 写入锁（原子创建或覆盖）。
 */
function writeLock(path: string, record: MachineLockRecord): void {
    ensureDir(dirname(path));
    // 预留阶段用 wx 原子创建；handoff 用覆盖写
    writeFileSync(path, JSON.stringify(record, null, 2) + "\n", { mode: 0o600 });
}

/**
 * 构造 machine_busy 错误（携带 owner 与重试间隔）。
 */
export function machineBusyError(owner: MachineLockRecord): DaoyanCliError {
    return new DaoyanCliError({
        code: "machine_busy",
        message:
            `同一设备已有${owner.kind === "metadata" ? "操作" : "任务"}在进行：${owner.command}（task ${owner.task_id}，pid ${owner.pid}，` +
            `mode ${owner.mode}，始于 ${owner.started_at}）`,
        retryAfterMs: 5_000,
        taskId: owner.task_id,
        details: {
            owner: {
                task_id: owner.task_id,
                pid: owner.pid,
                project: owner.project,
                mode: owner.mode,
                command: owner.command,
                kind: owner.kind,
                started_at: owner.started_at,
            },
            retry_after_ms: 5_000,
        },
        nextActions: [`status --task ${owner.task_id}`, `run cancel ${owner.task_id}`],
    });
}

/**
 * 获取锁的选项。
 */
export interface AcquireLockOptions {
    /**
     * 关联 task id。
     */
    taskId: string;
    /**
     * 项目根。
     */
    project: string;
    /**
     * 执行模式。
     */
    mode: "local" | "remote";
    /**
     * 命令展示。
     */
    command: string;
    /**
     * 用途（默认 generation）。
     */
    kind?: LockKind;
    /**
     * 预留 owner PID（默认当前进程）。
     */
    pid?: number;
    /**
     * 自定义锁路径（测试用）。
     */
    path?: string;
}

/**
 * 获取机器锁；忙则抛 machine_busy，陈旧锁自动恢复。
 */
export async function acquireMachineLock(opts: AcquireLockOptions): Promise<AcquiredLock> {
    // 锁路径
    const path = opts.path ?? machineLockPath();
    // 令牌
    const token = randomSuffix(16);
    // 待写入记录
    const record: MachineLockRecord = {
        token,
        kind: opts.kind ?? "generation",
        task_id: opts.taskId,
        project: opts.project,
        mode: opts.mode,
        command: opts.command,
        pid: opts.pid ?? process.pid,
        started_at: nowIso(),
    };

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            ensureDir(dirname(path));
            // wx：文件已存在即失败，保证原子性
            const fd = openSync(path, "wx", 0o600);
            try {
                writeFileSync(fd, JSON.stringify(record, null, 2) + "\n");
            } finally {
                closeSync(fd);
            }
            return handleFor(path, record);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        }

        // 已有锁：检查 owner
        const cur = inspectMachineLock(path);
        if (cur.status === "corrupt") {
            throw new DaoyanCliError({
                code: "machine_lock_corrupt",
                message: `机器锁损坏（${path}）：${cur.message}。确认没有任务在跑后删除该文件`,
                details: { path },
            });
        }
        if (cur.status === "absent") continue; // 对方刚释放，重试
        if (pidAlive(cur.record.pid)) throw machineBusyError(cur.record);

        // owner 已死：陈旧锁恢复
        await recoverStaleLock(cur.record, path);
    }

    throw new DaoyanCliError({
        code: "machine_busy",
        message: "机器锁竞争失败（重试两次仍被占用）",
        details: { path },
    });
}

/**
 * worker 接管 CLI 预留的锁：校验 task_id + token，更新 pid。
 */
export function attachMachineLock(opts: { taskId: string; token: string; pid?: number; path?: string }): AcquiredLock {
    // 锁路径
    const path = opts.path ?? machineLockPath();
    // 当前锁
    const cur = inspectMachineLock(path);
    if (cur.status === "absent") {
        throw new DaoyanCliError({
            code: "worker_start_failed",
            message: "machine lock 不存在（CLI 预留已被释放）",
            details: { path },
        });
    }
    if (cur.status === "corrupt") {
        throw new DaoyanCliError({
            code: "machine_lock_corrupt",
            message: `机器锁损坏（${path}）：${cur.message}`,
        });
    }
    if (cur.record.task_id !== opts.taskId || cur.record.token !== opts.token) {
        throw new DaoyanCliError({
            code: "machine_busy",
            message: "machine lock 已被其他 task 持有，worker 拒绝接管",
            details: { expected_task: opts.taskId, actual_task: cur.record.task_id },
        });
    }
    // 更新 owner PID
    const record: MachineLockRecord = { ...cur.record, pid: opts.pid ?? process.pid };
    writeLock(path, record);
    return handleFor(path, record);
}

/**
 * 恢复陈旧锁：标记 task interrupted、停残留引擎、恢复 GPU 租约、删除锁。
 */
export async function recoverStaleLock(record: MachineLockRecord, path = machineLockPath()): Promise<void> {
    // 动态导入避免模块环（task store / engine / gpu 都依赖本模块的错误类型）
    try {
        if (record.kind === "generation" && existsSync(join(record.project, "project.json"))) {
            const store = await import("../task/store.mts");
            // 当前 task 记录
            const task = store.readTask(record.project, record.task_id);
            if (task !== null && (task.status === "queued" || task.status === "running")) {
                store.updateTask(record.project, record.task_id, {
                    status: "interrupted",
                    finished_at: nowIso(),
                    error: {
                        code: "worker_crashed",
                        message: `worker（pid ${record.pid}）已退出；任务被标记为 interrupted`,
                    },
                    next_actions: [`logs --task ${record.task_id} --json`, "status --json"],
                });
            }
        }
    } catch {
        // 恢复尽力而为，不阻塞新任务
    }

    try {
        if (record.mode === "local" && existsSync(join(record.project, "project.json"))) {
            const local = await import("../engine/local-session.mts");
            await local.stopResidualEngine(record.project, () => {});
        }
    } catch {
        // 引擎可能已退出
    }

    try {
        const takeover = await import("../gpu/takeover.mts");
        await takeover.restoreLeaseIfAny(() => {});
    } catch {
        // GPU 租约恢复失败时保留文件，下一次任务会重试；锁仍需释放
    }

    rmSync(path, { force: true });
}

/**
 * 生成锁句柄（handoff / release）。
 */
function handleFor(path: string, initial: MachineLockRecord): AcquiredLock {
    // 当前记录（handoff 后更新）
    let record = initial;
    return {
        path,
        get record() {
            return record;
        },
        handoff(pid: number): void {
            // 重新读取，确认 token 未被夺走
            const cur = inspectMachineLock(path);
            if (cur.status !== "ok" || cur.record.token !== record.token) {
                throw new DaoyanCliError({
                    code: "machine_lock_corrupt",
                    message: "machine lock handoff 失败：令牌不匹配（锁被其他进程替换）",
                    details: { path },
                });
            }
            record = { ...record, pid };
            writeLock(path, record);
        },
        release(): void {
            const cur = inspectMachineLock(path);
            if (cur.status === "ok" && cur.record.token === record.token) {
                try {
                    unlinkSync(path);
                } catch {
                    // 已被删除
                }
            }
        },
    };
}
