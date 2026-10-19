/** task store —— tasks/<task_id>/{task.json,events.jsonl}。
 *  状态：queued → running → succeeded / failed / cancelled / interrupted。
 *  request_id 扫描 tasks 目录做幂等（任务数量有限，不额外维护索引）。 */
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, makeId, nowIso, readJsonIfExists, writeJsonAtomic } from "../../shared/fs.mts";
import {
    CANCEL_FILE,
    TASKS_DIR,
    TASK_FILE,
    isTerminalStatus,
    type TaskOptions,
    type TaskRecord,
    type TaskStatus,
} from "../project/types.mts";

/**
 * 生成 task id：t_<timestamp>-<machine>-<suffix>。
 */
export function newTaskId(machineId: string): string {
    return `t_${makeId(machineId)}`;
}

/**
 * task 目录绝对路径。
 */
export function taskDir(root: string, taskId: string): string {
    return join(root, TASKS_DIR, taskId);
}

/**
 * task.json 绝对路径。
 */
export function taskFile(root: string, taskId: string): string {
    return join(taskDir(root, taskId), TASK_FILE);
}

/**
 * 创建 task 目录与 task.json。
 */
export function createTask(root: string, record: TaskRecord): TaskRecord {
    // task 目录
    const dir = taskDir(root, record.task_id);
    if (existsSync(join(dir, TASK_FILE))) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `task ${record.task_id} 已存在（id 冲突，请重试）`,
        });
    }
    ensureDir(dir);
    writeJsonAtomic(join(dir, TASK_FILE), record);
    return record;
}

/**
 * 读取 task；不存在返回 null。
 */
export function readTask(root: string, taskId: string): TaskRecord | null {
    return readJsonIfExists<TaskRecord>(taskFile(root, taskId));
}

/**
 * 读取 task；缺失抛 task_not_found。
 */
export function requireTask(root: string, taskId: string): TaskRecord {
    // 读取结果
    const rec = readTask(root, taskId);
    if (rec === null) {
        throw new DaoyanCliError({ code: "task_not_found", message: `未找到 task ${taskId}` });
    }
    return rec;
}

/**
 * 原子更新 task（读-改-写）。
 */
export function updateTask(root: string, taskId: string, patch: Partial<TaskRecord>): TaskRecord {
    // 现有记录
    const cur = requireTask(root, taskId);
    // 合并后的记录
    const next: TaskRecord = { ...cur, ...patch, task_id: cur.task_id };
    writeJsonAtomic(taskFile(root, taskId), next);
    return next;
}

/**
 * 设置 task 终态（幂等：已终态不再覆盖）。
 */
export function finishTask(
    root: string,
    taskId: string,
    status: Exclude<TaskStatus, "queued" | "running">,
    error: TaskRecord["error"] = null,
): TaskRecord {
    // 当前记录
    const cur = requireTask(root, taskId);
    if (isTerminalStatus(cur.status)) return cur;
    return updateTask(root, taskId, {
        status,
        finished_at: nowIso(),
        error,
        next_actions: nextActionsFor(taskId, status),
    });
}

/**
 * 给 Agent 的默认下一步动作。
 */
export function nextActionsFor(taskId: string, status: TaskStatus): string[] {
    if (status === "queued" || status === "running") {
        return [`status --task ${taskId} --wait`, `logs --task ${taskId} -f`, `run cancel ${taskId}`];
    }
    if (status === "succeeded") return [`status --task ${taskId} --json`];
    return [`logs --task ${taskId} --json`, `status --json`];
}

/**
 * 列出全部 task（按 created_at 倒序）。
 */
export function listTasks(root: string): TaskRecord[] {
    // tasks 根目录
    const dir = join(root, TASKS_DIR);
    if (!existsSync(dir)) return [];
    // 收集到的任务
    const out: TaskRecord[] = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        // 当前 task 记录
        const rec = readTask(root, ent.name);
        if (rec !== null) out.push(rec);
    }
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * 按 request_id 查找已有 task（幂等）；不存在返回 null。
 */
export function findTaskByRequestId(root: string, requestId: string): TaskRecord | null {
    if (requestId === "") return null;
    // 从新到旧取第一个匹配
    return listTasks(root).find((t) => t.request_id === requestId) ?? null;
}

/**
 * 未终态任务（queued/running）。
 */
export function activeTasks(root: string): TaskRecord[] {
    return listTasks(root).filter((t) => !isTerminalStatus(t.status));
}

/**
 * 写入取消请求（worker 轮询/信号读取）。
 */
export function requestCancel(root: string, taskId: string): void {
    ensureDir(taskDir(root, taskId));
    writeJsonAtomic(join(taskDir(root, taskId), CANCEL_FILE), {
        requested_at: nowIso(),
        by_pid: process.pid,
    });
}

/**
 * 是否已请求取消。
 */
export function isCancelRequested(root: string, taskId: string): boolean {
    return existsSync(join(taskDir(root, taskId), CANCEL_FILE));
}

/**
 * 清理取消请求（新 task 不会复用目录，主要用于测试）。
 */
export function clearCancelRequest(root: string, taskId: string): void {
    // 取消请求文件
    const file = join(taskDir(root, taskId), CANCEL_FILE);
    if (existsSync(file)) {
        rmSync(file, { force: true });
    }
}

/**
 * 记录一个 run id 到 task。
 */
export function appendTaskRun(root: string, taskId: string, runId: string): TaskRecord {
    // 当前记录
    const cur = requireTask(root, taskId);
    if (cur.runs.includes(runId)) return cur;
    return updateTask(root, taskId, { runs: [...cur.runs, runId] });
}

/**
 * 创建 task 记录的工厂：填充默认值。
 */
export function makeTaskRecord(init: {
    taskId: string;
    kind: TaskRecord["kind"];
    machineId: string;
    requestId: string | null;
    mode: TaskRecord["mode"];
    command: string;
    options: TaskOptions;
}): TaskRecord {
    return {
        task_id: init.taskId,
        kind: init.kind,
        machine_id: init.machineId,
        request_id: init.requestId,
        status: "queued",
        mode: init.mode,
        command: init.command,
        runs: [],
        worker: null,
        created_at: nowIso(),
        started_at: null,
        finished_at: null,
        error: null,
        next_actions: nextActionsFor(init.taskId, "queued"),
        options: init.options,
    };
}

/**
 * 任务摘要（CLI 返回 / status 展示）。
 */
export function taskSummary(rec: TaskRecord): Record<string, unknown> {
    return {
        task_id: rec.task_id,
        kind: rec.kind,
        status: rec.status,
        mode: rec.mode,
        machine_id: rec.machine_id,
        request_id: rec.request_id,
        runs: rec.runs,
        command: rec.command,
        created_at: rec.created_at,
        started_at: rec.started_at,
        finished_at: rec.finished_at,
        error: rec.error,
        next_actions: rec.next_actions,
        events_path: `${TASKS_DIR}/${rec.task_id}/events.jsonl`,
    };
}
