/** status —— 被动状态快照（唯一状态入口，不启动引擎）。
 *  - 默认：项目/模式/引擎探测/机器锁/active task/同步来的其他机器任务/队列/GPU/租约/Skill/镜头进度；
 *  - --task <id> [--wait]：任务详情、run 列表、最近事件；
 *  - --run <id> [--wait]：单个 run 详情。 */
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { loadMachine, loadShotsIfExists, requireProject } from "../core/project/config.mts";
import { isTerminalStatus, type RunRecord, type TaskRecord } from "../core/project/types.mts";
import { listRuns, readRun } from "../core/run/store.mts";
import { runSummary } from "../core/run/summary.mts";
import { listTasks, readTask, taskSummary } from "../core/task/store.mts";
import { readEvents } from "../core/task/events.mts";
import { taskDir } from "../core/task/store.mts";
import { taskExitCode, taskRuns, waitForTask } from "../core/task/create.mts";
import { buildStatusSnapshot } from "../core/status/snapshot.mts";
import { resolveEpisodeContext, storyEnabled } from "../core/story/paths.mts";
import { loadContextShots } from "../core/story/production.mts";
import { computeEpisodeStoryStatus, computeSeriesStoryStatus } from "../core/story/validate.mts";
import type { EpisodeContext, EpisodeStoryStatus, SeriesStoryStatus } from "../core/story/types.mts";

/**
 * status 解析结果。
 */
interface StatusFlags {
    /**
     * --task。
     */
    taskId?: string;
    /**
     * --run。
     */
    runId?: string;
    /**
     * --wait。
     */
    wait: boolean;
    /**
     * --timeout（秒）。
     */
    timeoutSec?: number;
    /**
     * --episode。
     */
    episode?: string;
}

/**
 * 解析 status 参数。
 */
function parseArgs(args: string[]): StatusFlags {
    // 结果
    const out: StatusFlags = { wait: false };
    for (let i = 0; i < args.length; i++) {
        const { name, inline } = splitInlineFlag(args[i] ?? "");
        if (name === "--task") {
            const v = takeValue(args, i, inline, "--task");
            out.taskId = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--run") {
            const v = takeValue(args, i, inline, "--run");
            out.runId = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--wait") {
            out.wait = true;
            continue;
        }
        if (name === "--timeout") {
            const v = takeValue(args, i, inline, "--timeout");
            out.timeoutSec = Number(v.value);
            if (!Number.isFinite(out.timeoutSec) || out.timeoutSec <= 0) usageError("--timeout 需要正数（秒）");
            i += v.skip;
            continue;
        }
        if (name === "--episode") {
            // --episode 取值
            const v = takeValue(args, i, inline, "--episode");
            out.episode = v.value;
            i += v.skip;
            continue;
        }
        usageError(`未知参数 ${name}`);
    }
    if (out.taskId !== undefined && out.runId !== undefined) usageError("--task 与 --run 只能二选一");
    return out;
}

/**
 * status 命令入口。
 */
export async function runStatus(ctx: CliContext, args: string[]): Promise<number> {
    const flags = parseArgs(args);
    const { root, config: project } = requireProject(ctx);
    const machine = loadMachine(root);
    // 分镜（story 模式在 --task/--run 分支之后再解析）
    let shots = loadShotsIfExists(root);

    // --task
    if (flags.taskId !== undefined) {
        // 初始任务
        let task = readTask(root, flags.taskId);
        if (task === null) {
            throw new DaoyanCliError({ code: "task_not_found", message: `未找到 task ${flags.taskId}` });
        }
        let interrupted = false;
        let timedOut = false;
        let foreign = false;
        if (flags.wait && !isTerminalStatus(task.status)) {
            const waited = await waitForTask({
                root,
                taskId: flags.taskId,
                ...(flags.timeoutSec !== undefined ? { timeoutMs: flags.timeoutSec * 1_000 } : {}),
            });
            task = waited.task;
            interrupted = waited.interrupted;
            timedOut = waited.timedOut;
            foreign = waited.foreign === true;
        }
        // run 列表
        const runs = taskRuns(root, task);
        // 最近事件
        const events = readEvents(taskDir(root, task.task_id)).slice(-20);
        const data = {
            ...taskSummary(task),
            state: task.status,
            options: task.options,
            runs_detail: runs.map((r) => runSummary(root, r)),
            events,
            interrupted,
            timed_out: timedOut,
            foreign,
        };
        if (ctx.json) {
            emitData(data);
        } else {
            say(`task ${task.task_id} · ${task.kind} · ${task.status}（${task.mode}，machine ${task.machine_id}）`);
            if (task.error !== null) say(`错误：${task.error.code} ${task.error.message}`);
            for (const r of runs) {
                say(`  ${r.run_id} ${r.label ?? ""} ${r.status}`);
                for (const o of r.outputs) say(`    → runs/${r.run_id}/${o.path}`);
            }
            for (const e of events) say(`  [${e.ts}] ${e.type} ${JSON.stringify(e.data)}`);
            if (foreign) say(`task 属于机器 ${task.machine_id}；本机只返回快照`);
            else if (interrupted) say("已停止等待；task 仍在运行（run cancel 才会取消）");
        }
        if (foreign) return 0;
        if (interrupted) return 130;
        if (timedOut) return 0;
        return flags.wait ? taskExitCode(task) : 0;
    }

    // --run
    if (flags.runId !== undefined) {
        // 初始 run
        let run = readRun(root, flags.runId);
        if (run === null) {
            // 可能仍在执行：找包含该 run 的 task
            const owner = listTasks(root).find((t) => t.runs.includes(flags.runId as string));
            if (owner === undefined || !flags.wait) {
                throw new DaoyanCliError({ code: "run_not_found", message: `未找到 run ${flags.runId}` });
            }
            const waited = await waitForTask({
                root,
                taskId: owner.task_id,
                ...(flags.timeoutSec !== undefined ? { timeoutMs: flags.timeoutSec * 1_000 } : {}),
            });
            run = readRun(root, flags.runId);
            if (run === null) {
                throw new DaoyanCliError({
                    code: "run_not_found",
                    message: `task ${waited.task.task_id} 已结束（${waited.task.status}），但没有 run ${flags.runId}`,
                    details: { task: taskSummary(waited.task) },
                });
            }
        }
        const data = runSummary(root, run);
        if (ctx.json) emitData(data);
        else {
            say(`run ${run.run_id} · ${run.label ?? ""} · ${run.status}`);
            say(`workflow：${run.workflow.path}（${run.workflow.sha256.slice(0, 12)}…）`);
            for (const o of run.outputs) say(`  → runs/${run.run_id}/${o.path}`);
            if (run.error !== null) say(`错误：${run.error.code} ${run.error.message}`);
            if (run.engine.cleanup !== null) say(`cleanup：${JSON.stringify(run.engine.cleanup)}`);
        }
        return flags.wait ? (run.status === "succeeded" ? 0 : 1) : 0;
    }

    // story 模式：系列概览或单集视图
    const storyOn = storyEnabled(root);
    // 单集上下文
    let episodeContext: EpisodeContext | null = null;
    // 单集剧情状态
    let episodeStatus: EpisodeStoryStatus | null = null;
    // 系列剧情概览
    let seriesStatus: SeriesStoryStatus | null = null;
    if (storyOn) {
        if (flags.episode !== undefined) {
            episodeContext = resolveEpisodeContext(root, flags.episode);
            shots = loadContextShots(root, episodeContext);
            episodeStatus = computeEpisodeStoryStatus(root, flags.episode, project);
        } else {
            shots = null;
            seriesStatus = computeSeriesStoryStatus(root, project);
        }
    } else if (flags.episode !== undefined) {
        // legacy 不接受 --episode
        resolveEpisodeContext(root, flags.episode);
    }

    // 当前命令注册表（Skill stale 判定）
    const { COMMANDS } = await import("./registry.mts");
    // 默认快照
    const data = await buildStatusSnapshot(root, project, machine, shots, {
        commands: COMMANDS,
        ...(episodeContext !== null
            ? { labelPrefix: episodeContext.label_prefix, episodeId: episodeContext.episode_id }
            : {}),
    });
    if (seriesStatus !== null) {
        data.story = seriesStatus;
        data.series = seriesStatus.series;
        data.episodes = seriesStatus.episodes;
        data.next_actions = seriesStatus.next_actions;
    }
    if (episodeStatus !== null) {
        data.story = episodeStatus;
        data.episode = episodeStatus.episode;
        data.next_actions = episodeStatus.next_actions;
    }
    if (ctx.json) {
        emitData(data);
        return 0;
    }
    // 人类输出
    say(`项目 ${project.name} · ${machine.engine.mode} 模式 · machine ${machine.machine_id}`);
    // 引擎段
    const eng = data.engine as Record<string, unknown>;
    say(
        `引擎：${eng.up === true ? "可达" : "不可达"}（${String(eng.url)}${eng.pid !== null ? `，pid ${String(eng.pid)}` : ""}）`,
    );
    const q = eng.queue as Record<string, number> | null;
    if (q !== null) say(`队列：执行中 ${q.running} / 等待 ${q.pending}`);
    // 锁 / 任务
    const lockData = data.machine_lock as Record<string, unknown>;
    if (lockData.status === "held") {
        const owner = lockData.owner as Record<string, unknown>;
        say(`机器锁：${String(owner.command)}（task ${String(owner.task_id)}，pid ${String(owner.pid)}）`);
    } else if (lockData.status === "stale") {
        say("机器锁：陈旧（owner 已退出，下一次任务会回收）");
    } else {
        say(`机器锁：${lockData.status === "corrupt" ? "损坏" : "空闲"}`);
    }
    const activeTask = data.active_task as Record<string, unknown> | null;
    say(
        activeTask === null
            ? "本机任务：空闲"
            : `本机任务：${String(activeTask.command)}（${String(activeTask.status)}）`,
    );
    const synced = data.synced_running_tasks as unknown[];
    if (synced.length > 0) say(`其他机器任务（Git 同步）：${synced.length} 个运行中`);
    // GPU
    const gpu = data.gpu as Record<string, unknown>;
    const devices = gpu.devices as Array<Record<string, number>>;
    if (gpu.supported === true && devices[0] !== undefined) {
        say(`GPU：${devices[0].usedMb}MiB / ${devices[0].totalMb}MiB`);
    } else {
        say(`GPU：${String(gpu.reason ?? "不可用")}`);
    }
    // Skill
    const skill = data.skill as Record<string, unknown>;
    if (skill.present !== true) say("Skill：缺失（daoyan skill update）");
    else if (skill.stale === true) say("Skill：需要更新（daoyan skill update）");
    else say("Skill：已就绪");
    // 剧情 / 镜头
    if (episodeStatus !== null) {
        say(
            `剧集 ${episodeStatus.episode.id} 第 ${episodeStatus.episode.number} 集：${episodeStatus.episode.title}（${episodeStatus.stage}）`,
        );
        for (const b of episodeStatus.blockers) say(`  ! [${b.code}] ${b.message}`);
        for (const a of episodeStatus.next_actions) say(`  next: ${a}`);
    } else if (seriesStatus !== null) {
        say(
            `系列 ${seriesStatus.series.title}：${seriesStatus.series.episodes_total} 集，可拍 ${seriesStatus.series.episodes_ready}，阻断 ${seriesStatus.series.episodes_blocked}`,
        );
        for (const e of seriesStatus.episodes) say(`  ${e.id} 第 ${e.number} 集 ${e.title}：${e.stage}`);
    } else {
        // 镜头
        const shotsData = data.shots as Array<Record<string, unknown>>;
        if (shotsData.length > 0) {
            const done = shotsData.filter((s) => s.done === true).length;
            say(`镜头进度：${done}/${shotsData.length}`);
            for (const s of shotsData)
                say(`  ${s.done === true ? "✅" : "⬜"} ${String(s.id)} ${String(s.slug ?? "")}`);
        }
    }
    return 0;
}

/**
 * 读取一个 task 记录（导出给测试/扩展）。
 */
export function taskOf(root: string, taskId: string): TaskRecord | null {
    return readTask(root, taskId);
}

/**
 * 读取全部 run（导出）。
 */
export function runsOf(root: string): RunRecord[] {
    return listRuns(root);
}
