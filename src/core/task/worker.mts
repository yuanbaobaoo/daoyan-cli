/** detached task worker —— 持有机器锁，负责引擎/GPU 生命周期、run 展开、cleanup 与事件。
 *  由 CLI 以 detached 进程启动；不需要常驻 daemon。
 *  - shot/batch 的多个 run 串行执行，共用一次引擎会话；
 *  - 用户取消通过 SIGTERM 或 cancel.request 触发 abort，执行 interrupt → free → stop → restore；
 *  - worker 被 SIGKILL 时无法清理：锁/租约保留，下一次 task 获取锁前做 stale 恢复。 */
import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { DaoyanCliError, asCliError, isDaoyanCliError } from "../../shared/errors.mts";
import { nowIso } from "../../shared/fs.mts";
import { say, warn } from "../../shared/log.mts";
import { onSignal } from "../../shared/signals.mts";
import { loadMachine, readProjectAt } from "../project/config.mts";
import { LOG_DIR, isTerminalStatus, type MachineConfig, type ProjectConfig } from "../project/types.mts";
import { resolveEpisodeContext } from "../story/paths.mts";
import { storyEnforceOf } from "../story/production.mts";
import { loadEpisodeShots } from "../story/store.mts";
import type { EpisodeContext } from "../story/types.mts";
import { attachMachineLock, type AcquiredLock } from "../machine/lock.mts";
import {
    appendTaskRun,
    finishTask,
    isCancelRequested,
    nextActionsFor,
    readTask,
    requireTask,
    updateTask,
} from "./store.mts";
import { appendEvent } from "./events.mts";
import { planShotRuns, planSingleRun, type RunPlan } from "./plans.mts";
import { createEngineSession, type EngineSession } from "../engine/session.mts";
import { fetchCatalog } from "../workflow/preflight.mts";
import {
    RunCancelledError,
    executeRun,
    patchRunCleanup,
    sanitizeDetails,
    sanitizeMessage,
    type SessionAccumulator,
} from "../run/executor.mts";
import { latestSucceededRun, newRunId } from "../run/store.mts";

// 默认单任务等待上限（3 小时）
const DEFAULT_TIMEOUT_MS = 3 * 60 * 60 * 1000;

/**
 * worker 启动选项。
 */
export interface WorkerOptions {
    /**
     * task 目录（tasks/<task_id>）。
     */
    taskDir: string;
    /**
     * 锁文件路径（测试用）。
     */
    lockPath?: string;
    /**
     * 锁令牌（CLI 通过 env 传入）。
     */
    token: string;
}

/**
 * 判断错误是否会中断整个任务（其余为单 run 业务错误，可继续后续镜头）。
 */
export function isFatalRunError(code: string): boolean {
    return (
        code === "engine_oom" ||
        code === "engine_crashed" ||
        code === "engine_unreachable" ||
        code === "engine_busy" ||
        code === "engine_start_failed" ||
        code === "engine_stop_failed" ||
        code === "gpu_lease_corrupt" ||
        code === "machine_busy" ||
        code === "machine_lock_corrupt" ||
        code === "worker_start_failed"
    );
}

/**
 * 计算 shot/batch 需要执行的镜号（已有成功 run 的跳过）。
 */
function shotTargets(
    root: string,
    shots: import("../project/types.mts").ShotsFile,
    task: ReturnType<typeof requireTask>,
    labelPrefix: string,
): { execute: string[]; skipped: string[] } {
    // 任务选项
    const o = task.options;
    // 目标镜号
    const ids =
        o.shots === undefined
            ? shots.shots.map((s) => s.id)
            : o.shots.map((id) => {
                  if (!shots.shots.some((s) => s.id === id)) {
                      throw new DaoyanCliError({
                          code: "usage",
                          message: `未知镜号 ${id}；可用：${shots.shots.map((s) => s.id).join(" ")}`,
                          exit: 2,
                      });
                  }
                  return id;
              });
    // 是否强制重拍
    const force = o.force === true;
    // 结果
    const execute: string[] = [];
    const skipped: string[] = [];
    for (const id of ids) {
        if (!force && latestSucceededRun(root, `${labelPrefix}${id}`) !== null) skipped.push(id);
        else execute.push(id);
    }
    return { execute, skipped };
}

/**
 * 汇总失败 run（task error details 用）。
 */
function aggregateFailure(
    kind: string,
    failures: Array<{ run_id: string; code: string; message: string }>,
    completed: number,
): { code: DaoyanCliError["code"]; message: string; details: Record<string, unknown> } {
    if (failures.length === 0) {
        return { code: "run_failed", message: "任务失败", details: {} };
    }
    // 单 run 直接透传首个错误
    if (kind === "run" && failures.length === 1) {
        // 首个失败
        const f = failures[0] as { run_id: string; code: string; message: string };
        return {
            code: f.code as DaoyanCliError["code"],
            message: f.message,
            details: { run_id: f.run_id },
        };
    }
    return {
        code: kind === "run" ? "run_failed" : "shot_failed",
        message: `完成 ${completed} 个 run，失败 ${failures.length} 个`,
        details: { failures, completed },
    };
}

/**
 * 执行 worker 主流程，返回进程退出码。
 */
export async function runWorker(opts: WorkerOptions): Promise<number> {
    // task 目录与项目根
    const taskDir = resolve(opts.taskDir);
    const root = dirname(dirname(taskDir));
    // task id
    const taskId = basename(taskDir);
    // 初始 task
    let task = requireTask(root, taskId);
    if (isTerminalStatus(task.status)) return 0;

    // 机器锁句柄
    let lock: AcquiredLock | null = null;
    // 引擎会话
    let session: EngineSession | null = null;
    // 取消控制器
    const controller = new AbortController();
    // 是否收到取消
    let cancelled = false;
    // 取消触发
    const requestCancel = (): void => {
        if (cancelled) return;
        cancelled = true;
        appendEvent(taskDir, "cancel_requested", { pid: process.pid });
        controller.abort(new Error("cancel requested"));
    };
    // worker 信号（走共享 handler，避免被 CLI 全局 SIGTERM 直接 exit）
    const onWorkerSignal = (): void => requestCancel();
    const offSignal = onSignal(onWorkerSignal);
    // cancel.request 轮询
    const cancelTimer = setInterval(() => {
        try {
            if (isCancelRequested(root, taskId)) requestCancel();
        } catch {
            // 忽略瞬时读失败
        }
    }, 1_000);

    // 会话累积状态
    const accumulator: SessionAccumulator = {
        submitted: false,
        uploaded: [],
        scratchOutputs: [],
        interruptNeeded: false,
    };
    // 失败 run
    const failures: Array<{ run_id: string; code: string; message: string }> = [];
    // 已完成 run 数
    let completed = 0;
    // 成功 run ids
    const runIds: string[] = [];

    try {
        // 1) 接管机器锁
        lock = attachMachineLock({
            taskId,
            token: opts.token,
            ...(opts.lockPath !== undefined ? { path: opts.lockPath } : {}),
        });
        appendEvent(taskDir, "worker_started", { pid: process.pid });
        appendEvent(taskDir, "machine_lock_acquired", { pid: process.pid });
        task = updateTask(root, taskId, {
            status: "running",
            started_at: nowIso(),
            worker: { pid: process.pid, started_at: nowIso() },
            next_actions: nextActionsFor(taskId, "running"),
        });

        // 2) 读取配置与执行目标（不启动引擎）
        const project = readProjectAt(root);
        if (project === null) {
            throw new DaoyanCliError({ code: "project_not_found", message: `项目根缺少 project.json：${root}` });
        }
        const machine = loadMachine(root);
        if (task.mode !== machine.engine.mode && task.options.engine_url === undefined) {
            warn(
                `task 创建时的 mode=${task.mode} 与 machine.json 当前 mode=${machine.engine.mode} 不一致；以 machine.json 为准`,
            );
        }
        say(`task ${taskId}（${task.kind}）开始，mode=${machine.engine.mode}`);

        // 超时与任务级截止时间
        const timeoutMs = task.options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
        const deadline = Date.now() + timeoutMs;
        // 单 run 计划（启动引擎前解析，尽早暴露 workflow 错误）
        let runPlan: RunPlan | null = null;
        // shot 队列（逐镜构建计划，接力镜头依赖上游刚完成的 run）
        let shotsFile: import("../project/types.mts").ShotsFile | null = null;
        let shotQueue: string[] = [];
        let skippedShots: string[] = [];
        // 单集 label 前缀（legacy: shot:；多集: ep:<id>:shot:）
        let labelPrefix = "shot:";
        // 剧集上下文（接力选稿需要）
        let episodeContext: EpisodeContext | null = null;
        // 接力是否必须用上游定稿稿件
        let enforceTakes = false;
        if (task.kind === "run") {
            const o = task.options;
            if (o.workflow === undefined || o.workflow === "") {
                throw new DaoyanCliError({ code: "usage", message: "run task 缺少 workflow", exit: 2 });
            }
            runPlan = planSingleRun({
                root,
                project,
                machine,
                workflowRef: o.workflow,
                sets: o.sets ?? {},
                ...(o.label !== undefined ? { label: o.label } : {}),
            });
        } else {
            // 剧集上下文；story 模式必须已有 episode_id
            const context = resolveEpisodeContext(root, task.episode_id ?? undefined);
            labelPrefix = context.label_prefix;
            // 接力选稿上下文；--allow-incomplete 绕过时不强制定稿
            episodeContext = context;
            enforceTakes = storyEnforceOf(project) === "strict" && task.options.story_gate_bypassed !== true;
            shotsFile = loadEpisodeShots(root, context.episode_id);
            if (shotsFile === null) {
                throw new DaoyanCliError({
                    code: "story_invalid",
                    message: `剧集 ${String(context.episode_id)} 的分镜不存在`,
                });
            }
            // 目标镜头
            const targets = shotTargets(root, shotsFile, task, context.label_prefix);
            shotQueue = targets.execute;
            skippedShots = targets.skipped;
            for (const id of skippedShots) appendEvent(taskDir, "run_skipped", { shot_id: id });
            if (shotQueue.length === 0) {
                // 全部跳过：不启动引擎
                say("没有需要执行的 run（全部已有成功产物）");
                appendEvent(taskDir, "finished", { status: "succeeded", skipped: skippedShots });
                finishTask(root, taskId, "succeeded");
                return 0;
            }
        }

        // 3) 创建会话并确保引擎就绪
        appendEvent(taskDir, "engine_starting", { mode: machine.engine.mode });
        session = await createEngineSession({
            root,
            project,
            machine,
            taskId,
            ...(task.options.engine_url !== undefined ? { engineUrlOverride: task.options.engine_url } : {}),
        });
        await session.ensureReady(say, controller.signal);
        if (controller.signal.aborted) throw new RunCancelledError();
        const info = session.info();
        appendEvent(taskDir, "engine_ready", {
            mode: info.mode,
            url: info.url,
            comfyui_version: info.comfyui_version,
            pid: info.pid,
            ready_ms: info.ready_ms,
        });

        // 4) 节点目录：一次 /object_info，供所有 run 复用；每个 run 在上传后做图校验
        const fetched = await fetchCatalog(root, session.client, say);
        if (controller.signal.aborted) throw new RunCancelledError();

        // 5) 串行执行 run
        // 执行单个 plan（错误按 fatal / 非 fatal 分类）
        const executeOne = async (plan: RunPlan): Promise<void> => {
            if (controller.signal.aborted) throw new RunCancelledError();
            if (Date.now() > deadline) {
                throw new DaoyanCliError({
                    code: "run_timeout",
                    message: `task 等待超时（${Math.round(timeoutMs / 60_000)} 分钟）`,
                });
            }
            // 新 run id
            const runId = newRunId(machine.machine_id);
            appendTaskRun(root, taskId, runId);
            runIds.push(runId);
            // 计划阶段 warning（未绑定的逻辑输入等）
            for (const w of plan.warnings) {
                appendEvent(taskDir, "run_warning", { run_id: runId, code: w.code, message: w.message });
            }
            say(`执行 run ${runId}${plan.label !== null ? `（${plan.label}）` : ""}`);
            try {
                // 单 run 执行
                await executeRun({
                    root,
                    project,
                    machine,
                    session: session as EngineSession,
                    plan,
                    runId,
                    taskId,
                    machineId: machine.machine_id,
                    episodeId: task.episode_id ?? null,
                    requestId: task.request_id,
                    timeoutMs: Math.max(1_000, deadline - Date.now()),
                    signal: controller.signal,
                    accumulator,
                    catalog: fetched.catalog,
                    log: say,
                    event: (type, data) => appendEvent(taskDir, type, data),
                });
                completed++;
            } catch (e) {
                // 用户取消：立即停止后续 run
                if (e instanceof RunCancelledError) throw e;
                // 结构化错误
                const err = isDaoyanCliError(e) ? e : asCliError(e, "run_failed");
                failures.push({
                    run_id: runId,
                    code: err.code,
                    message: sanitizeMessage(err.message, root),
                });
                appendEvent(taskDir, "run_failed", {
                    run_id: runId,
                    code: err.code,
                    message: sanitizeMessage(err.message, root),
                });
                // 致命错误中断整个 task
                if (isFatalRunError(err.code)) throw err;
                say(`run ${runId} 失败[${err.code}]：${err.message}`);
            }
        };

        if (runPlan !== null) {
            await executeOne(runPlan);
        } else {
            // shot / retake / batch：逐镜构建计划（接力可看到上游刚完成的 run）
            for (const id of shotQueue) {
                if (controller.signal.aborted) throw new RunCancelledError();
                if (Date.now() > deadline) {
                    throw new DaoyanCliError({
                        code: "run_timeout",
                        message: `task 等待超时（${Math.round(timeoutMs / 60_000)} 分钟）`,
                    });
                }
                let plan: RunPlan;
                try {
                    const planned = await planShotRuns({
                        root,
                        project,
                        machine,
                        shots: shotsFile as import("../project/types.mts").ShotsFile,
                        shotIds: [id],
                        force: true,
                        ...(episodeContext !== null ? { context: episodeContext } : {}),
                        enforceTakes,
                        ...(task.options.steps !== undefined ? { stepsOverride: task.options.steps } : {}),
                        log: say,
                    });
                    const first = planned.plans[0];
                    if (first === undefined) {
                        appendEvent(taskDir, "run_skipped", { shot_id: id });
                        continue;
                    }
                    plan = first;
                } catch (e) {
                    // 计划阶段的业务错误：记录后继续后续镜头
                    const err = isDaoyanCliError(e) ? e : asCliError(e, "shot_failed");
                    failures.push({ run_id: "", code: err.code, message: sanitizeMessage(err.message, root) });
                    appendEvent(taskDir, "run_failed", {
                        shot_id: id,
                        run_id: null,
                        code: err.code,
                        message: sanitizeMessage(err.message, root),
                    });
                    if (isFatalRunError(err.code)) throw err;
                    say(`镜 ${id} 计划失败[${err.code}]：${err.message}`);
                    continue;
                }
                await executeOne(plan);
            }
        }

        // 6) 清理（即使部分 run 失败也要执行）
        appendEvent(taskDir, "cleanup_started", {});
        // cleanup 结果
        const rel = await session.release(
            {
                submitted: accumulator.submitted,
                interrupt: accumulator.interruptNeeded || controller.signal.aborted,
                uploaded: accumulator.uploaded,
                scratch_outputs: accumulator.scratchOutputs,
            },
            say,
        );
        patchRunCleanup({
            root,
            runIds,
            cleanup: rel.cleanup,
            ...(rel.gpu !== undefined ? { gpu: rel.gpu } : {}),
            restored: rel.restored,
        });
        appendEvent(taskDir, "cleanup_finished", {
            cleanup: rel.cleanup,
            restored: rel.restored,
            errors: rel.errors,
        });

        // 7) 终态
        if (cancelled) {
            appendEvent(taskDir, "finished", { status: "cancelled", completed });
            finishTask(root, taskId, "cancelled", null);
            say("task 已取消，cleanup 完成");
            return 130;
        }
        if (failures.length > 0) {
            // 汇总失败
            const agg = aggregateFailure(task.kind, failures, completed);
            appendEvent(taskDir, "finished", { status: "failed", code: agg.code, completed, failures });
            finishTask(root, taskId, "failed", {
                code: agg.code,
                message: sanitizeMessage(agg.message, root),
                details: {
                    ...agg.details,
                    ...(rel.errors.length > 0 ? { cleanup: rel.errors } : {}),
                },
            });
            say(`task 失败：完成 ${completed}，失败 ${failures.length}`);
            return 1;
        }
        appendEvent(taskDir, "finished", { status: "succeeded", completed, runs: runIds });
        finishTask(root, taskId, "succeeded", null);
        say(`task 完成：${completed} 个 run`);
        return 0;
    } catch (e) {
        // 取消路径
        if (e instanceof RunCancelledError || cancelled) {
            if (session !== null) {
                try {
                    // 取消清理
                    const rel = await session.release(
                        {
                            submitted: accumulator.submitted,
                            interrupt: true,
                            uploaded: accumulator.uploaded,
                            scratch_outputs: accumulator.scratchOutputs,
                        },
                        say,
                    );
                    patchRunCleanup({
                        root,
                        runIds,
                        cleanup: rel.cleanup,
                        ...(rel.gpu !== undefined ? { gpu: rel.gpu } : {}),
                        restored: rel.restored,
                    });
                    appendEvent(taskDir, "cleanup_finished", {
                        cleanup: rel.cleanup,
                        restored: rel.restored,
                        errors: rel.errors,
                    });
                } catch (cleanupError) {
                    warn(
                        `取消清理失败：${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
                    );
                }
            }
            appendEvent(taskDir, "finished", { status: "cancelled", completed });
            finishTask(root, taskId, "cancelled", null);
            return 130;
        }

        // 普通失败：尽量清理已启动的引擎
        const err = isDaoyanCliError(e) ? e : asCliError(e, "worker_crashed");
        // 清理阶段的附加错误（不覆盖主错误）
        let cleanupErrors: Array<{ code: string; message: string }> = [];
        if (session !== null) {
            appendEvent(taskDir, "cleanup_started", {});
            try {
                // 失败清理
                const rel = await session.release(
                    {
                        submitted: accumulator.submitted,
                        interrupt: accumulator.interruptNeeded,
                        uploaded: accumulator.uploaded,
                        scratch_outputs: accumulator.scratchOutputs,
                    },
                    say,
                );
                patchRunCleanup({
                    root,
                    runIds,
                    cleanup: rel.cleanup,
                    ...(rel.gpu !== undefined ? { gpu: rel.gpu } : {}),
                    restored: rel.restored,
                });
                cleanupErrors = rel.errors;
                appendEvent(taskDir, "cleanup_finished", {
                    cleanup: rel.cleanup,
                    restored: rel.restored,
                    errors: rel.errors,
                });
            } catch (cleanupError) {
                warn(`失败清理异常：${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
                appendEvent(taskDir, "cleanup_finished", {
                    cleanup: null,
                    error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
                });
            }
        }
        const message = sanitizeMessage(err.message, root);
        appendEvent(taskDir, "finished", { status: "failed", code: err.code, message });
        // 汇总 details：主错误 + cleanup 附加错误
        const errorDetails: Record<string, unknown> =
            err.details !== undefined ? (sanitizeDetails(err.details, root) as Record<string, unknown>) : {};
        if (cleanupErrors.length > 0) errorDetails.cleanup = sanitizeDetails(cleanupErrors, root);
        finishTask(root, taskId, "failed", {
            code: err.code,
            message,
            ...(Object.keys(errorDetails).length > 0 ? { details: errorDetails } : {}),
        });
        warn(`task ${taskId} 失败[${err.code}]：${message}`);
        return 1;
    } finally {
        clearInterval(cancelTimer);
        offSignal();
        lock?.release();
    }
}

/**
 * 读取 worker 启动所需的 task 目录列表（调试用）。
 */
export function listTaskDirs(root: string): string[] {
    // tasks 目录
    const dir = join(root, "tasks");
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(dir, d.name));
}

/**
 * worker 日志路径（CLI spawn 时使用）。
 */
export function workerLogPath(root: string, taskId: string): string {
    return join(root, LOG_DIR, `worker-${taskId}.log`);
}

/**
 * 计算等待上限（任务选项 -> 默认）。
 */
export function timeoutOf(task: { options: { timeout_ms?: number } }): number {
    return task.options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
}
