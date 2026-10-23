/** run —— 执行一个 workflow（异步 task；--wait 才阻塞）。
 *  Agent 默认拿到 task_id，用 status --task 观测；`run cancel` 显式取消；
 *  `run reassign` 把未归属的 legacy run 迁到某一集某镜头。 */
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import {
    parseFlags,
    parseJsonValue,
    requireFlag,
    splitInlineFlag,
    strFlag,
    takeValue,
    usageError,
} from "../shared/args.mts";
import { isHttpUrl } from "../shared/fs.mts";
import { loadMachine, requireProject, resolveWorkflowRef } from "../core/project/config.mts";
import { resolveEpisodeContext } from "../core/story/paths.mts";
import { reassignRunToEpisode } from "../core/run/reassign.mts";
import type { TakeSourceKind } from "../core/story/types.mts";
import type { JsonValue } from "../core/project/types.mts";
import { planSingleRun } from "../core/task/plans.mts";
import { cancelTask, createAndStartTask, taskExitCode, taskRuns, waitForTask } from "../core/task/create.mts";
import { taskSummary } from "../core/task/store.mts";
import { runSummary } from "../core/run/summary.mts";
import { graphSha256 } from "../core/workflow/graph.mts";

/**
 * run 解析出的参数。
 */
interface RunFlags {
    /**
     * 目标 workflow。
     */
    workflow: string;
    /**
     * --set 覆盖。
     */
    sets: Record<string, JsonValue>;
    /**
     * --label。
     */
    label?: string;
    /**
     * --engine 单次 remote URL。
     */
    engineUrl?: string;
    /**
     * --request-id 幂等键。
     */
    requestId?: string;
    /**
     * --wait 前台等待。
     */
    wait: boolean;
    /**
     * --dry-run 只出计划。
     */
    dryRun: boolean;
    /**
     * --timeout（小时）。
     */
    timeoutHours?: number;
    /**
     * --episode：把 run 归属到某集（可选）。
     */
    episode?: string;
}

/**
 * 解析 run 参数。
 */
function parseRunArgs(args: string[]): RunFlags {
    // workflow 位置参数
    const pos: string[] = [];
    // --set 集合
    const sets: Record<string, JsonValue> = {};
    // 结果
    const out: RunFlags = { workflow: "", sets, wait: false, dryRun: false };
    for (let i = 0; i < args.length; i++) {
        const raw = args[i] ?? "";
        const { name, inline } = splitInlineFlag(raw);
        if (name === "--set") {
            const v = takeValue(args, i, inline, "--set");
            const eq = v.value.indexOf("=");
            if (eq <= 0) usageError(`--set 需要 key=value（收到 ${v.value}）`);
            sets[v.value.slice(0, eq)] = parseJsonValue(v.value.slice(eq + 1)) as JsonValue;
            i += v.skip;
            continue;
        }
        if (name === "--label") {
            const v = takeValue(args, i, inline, "--label");
            out.label = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--engine") {
            const v = takeValue(args, i, inline, "--engine");
            if (!isHttpUrl(v.value)) usageError(`--engine 必须是 http(s) URL（收到 ${v.value}）`);
            out.engineUrl = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--request-id") {
            const v = takeValue(args, i, inline, "--request-id");
            out.requestId = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--wait") {
            out.wait = true;
            continue;
        }
        if (name === "--dry-run") {
            out.dryRun = true;
            continue;
        }
        if (name === "--timeout") {
            const v = takeValue(args, i, inline, "--timeout");
            const n = Number(v.value);
            if (!Number.isFinite(n) || n <= 0) usageError("--timeout 需要正数（小时）");
            out.timeoutHours = n;
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
        if (name.startsWith("-")) usageError(`未知参数 ${name}`);
        pos.push(name);
    }
    if (pos.length === 0) usageError("缺少 workflow：daoyan run <workflow.json|name>");
    if (pos.length > 1) usageError(`run 只接受一个 workflow（收到 ${pos.join(" ")}）`);
    out.workflow = pos[0] as string;
    return out;
}

/**
 * 构造任务结果数据（--wait / status 共用）。
 */
export function runWaitData(
    root: string,
    task: import("../core/project/types.mts").TaskRecord,
    runs: import("../core/project/types.mts").RunRecord[],
    extra: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        ...taskSummary(task),
        state: task.status,
        runs_detail: runs.map((r) => runSummary(root, r)),
        ...extra,
    };
}

/**
 * run 命令入口。
 */
export async function runRun(ctx: CliContext, args: string[]): Promise<number> {
    // 防御：subcommand 未命中时也支持 run cancel / run reassign
    if (args[0] === "cancel") return runCancel(ctx, args.slice(1));
    if (args[0] === "reassign") return runReassign(ctx, args.slice(1));

    // 解析参数
    const flags = parseRunArgs(args);
    // 项目与本机配置
    const { root, config: project } = requireProject(ctx);
    const machine = loadMachine(root);
    // 可选剧集归属
    const episodeContext = flags.episode !== undefined ? resolveEpisodeContext(root, flags.episode) : null;
    // 记录用剧集 id
    const episodeId = episodeContext?.episode_id ?? null;

    // dry-run：只解析计划，不占锁、不启动引擎
    if (flags.dryRun) {
        const plan = planSingleRun({
            root,
            project,
            machine,
            workflowRef: flags.workflow,
            sets: flags.sets,
            ...(flags.label !== undefined ? { label: flags.label } : {}),
        });
        const ref = resolveWorkflowRef(root, flags.workflow);
        const data = {
            mode: flags.engineUrl !== undefined ? "remote" : machine.engine.mode,
            episode_id: episodeId,
            workflow: ref.rel,
            graph_sha256: graphSha256(plan.graph),
            inputs: plan.inputs,
            overrides: plan.overrides,
            uploads: plan.uploads.map((u) => ({ logical: u.logical, desired_name: u.desiredName })),
            gpu_takeover:
                machine.engine.mode === "local" && project.gpu?.takeover === true && flags.engineUrl === undefined,
            engine:
                flags.engineUrl !== undefined
                    ? { mode: "remote", url: flags.engineUrl }
                    : machine.engine.mode === "local"
                      ? { mode: "local", port: machine.engine.port }
                      : { mode: "remote", url: machine.engine.url },
            warnings: plan.warnings,
        };
        if (ctx.json) {
            emitData(data);
            return 0;
        }
        say(`dry-run：${ref.rel}（${data.mode}，${data.graph_sha256.slice(0, 12)}…）`);
        say(`inputs：${JSON.stringify(plan.inputs)}`);
        return 0;
    }

    // 创建 task（默认异步）
    const created = await createAndStartTask({
        root,
        project,
        machine,
        kind: "run",
        command: `run ${flags.workflow}`,
        episodeId,
        ...(flags.requestId !== undefined ? { requestId: flags.requestId } : {}),
        options: {
            workflow: flags.workflow,
            sets: flags.sets,
            ...(flags.label !== undefined ? { label: flags.label } : {}),
            ...(flags.timeoutHours !== undefined ? { timeout_ms: Math.round(flags.timeoutHours * 3_600_000) } : {}),
            ...(flags.engineUrl !== undefined ? { engine_url: flags.engineUrl } : {}),
        },
    });

    // 异步返回
    if (!flags.wait) {
        const data = {
            ...taskSummary(created.task),
            state: created.task.status,
            deduplicated: created.deduplicated,
        };
        if (ctx.json) {
            emitData(data);
            return 0;
        }
        say(`task ${created.task.task_id} 已创建（${created.task.status}）`);
        say(`查看：daoyan status --task ${created.task.task_id} --wait`);
        say(`取消：daoyan run cancel ${created.task.task_id}`);
        return 0;
    }

    // --wait：前台等待（SIGINT 只停止等待）
    let lastStatus = "";
    const waited = await waitForTask({
        root,
        taskId: created.task.task_id,
        onTick: (task) => {
            if (task.status !== lastStatus) {
                lastStatus = task.status;
                if (!ctx.json) say(`task ${task.task_id}：${task.status}`);
            }
        },
    });
    const data = runWaitData(root, waited.task, waited.runs, {
        interrupted: waited.interrupted,
        timed_out: waited.timedOut,
        foreign: waited.foreign === true,
        deduplicated: created.deduplicated,
    });
    if (ctx.json) {
        emitData(data);
    } else if (waited.foreign === true) {
        say(`task ${waited.task.task_id} 属于机器 ${waited.task.machine_id}；本机只返回快照，不等待`);
    } else if (waited.interrupted) {
        say(`已停止等待；task ${waited.task.task_id} 仍在运行（取消用 daoyan run cancel ${waited.task.task_id}）`);
    } else if (waited.timedOut) {
        say(`等待超时；task ${waited.task.task_id} 当前状态 ${waited.task.status}`);
    } else {
        say(`task ${waited.task.task_id}：${waited.task.status}`);
        for (const r of waited.runs) {
            for (const o of r.outputs) say(`  ${r.run_id} → runs/${r.run_id}/${o.path}`);
        }
        if (waited.task.error !== null) say(`错误：${waited.task.error.code} ${waited.task.error.message}`);
    }
    if (waited.foreign === true) return 0;
    if (waited.interrupted) return 130;
    if (waited.timedOut) return 0;
    return taskExitCode(waited.task);
}

/**
 * run cancel 命令入口。
 */
export async function runCancel(ctx: CliContext, args: string[]): Promise<number> {
    const taskId = args[0];
    if (taskId === undefined || taskId === "" || taskId.startsWith("-")) {
        usageError("用法：daoyan run cancel <task_id>");
    }
    const { root } = requireProject(ctx);
    const task = await cancelTask(root, taskId);
    const runs = taskRuns(root, task);
    if (ctx.json) {
        emitData({
            ...runWaitData(root, task, runs),
            cancel_requested: true,
        });
    } else {
        say(`task ${task.task_id}：${task.status}`);
        if (task.status === "running" || task.status === "queued") {
            say("取消请求已发送；查看：daoyan status --task " + task.task_id);
        }
    }
    return 0;
}

/**
 * run reassign <run_id> —— 把未归属的 legacy run 迁到某集某镜。
 */
export async function runReassign(ctx: CliContext, args: string[]): Promise<number> {
    // 解析结果
    const parsed = parseFlags(args, {
        "--episode": "string",
        "--shot": "string",
        "--source": "string",
    });
    // run id
    const runId = parsed.positionals[0];
    if (runId === undefined || runId === "" || runId.startsWith("-")) {
        usageError("缺少 run_id：daoyan run reassign <run_id> --episode <id> [--shot <镜号>]");
    }
    if (parsed.positionals.length > 1) usageError(`未知参数 ${parsed.positionals.slice(1).join(" ")}`);
    // 来源
    const source = strFlag(parsed, "--source") ?? "ai";
    if (source !== "ai" && source !== "user") usageError("--source 必须是 ai|user");
    const { root } = requireProject(ctx);
    // 迁移结果
    const result = reassignRunToEpisode({
        root,
        runId,
        episodeId: requireFlag(parsed, "--episode"),
        ...(strFlag(parsed, "--shot") !== undefined ? { shotId: strFlag(parsed, "--shot") as string } : {}),
        by: source as TakeSourceKind,
    });
    // 数据信封
    const data = {
        run_id: result.record.run_id,
        episode_id: result.record.episode_id ?? null,
        label: result.label,
        changed: result.changed,
        prior_label: result.prior_label,
        prior_episode_id: result.prior_episode_id,
        warnings: result.warnings,
        next_actions: result.changed ? [`daoyan take list --episode ${String(result.record.episode_id)} --json`] : [],
    };
    if (ctx.json) {
        emitData(data);
        return 0;
    }
    if (!result.changed) {
        say(`run ${result.record.run_id} 已归属 ${result.label}，无需迁移`);
        return 0;
    }
    say(
        `run ${result.record.run_id} 归属迁移：${String(result.prior_label ?? "无 label")} / ${String(
            result.prior_episode_id ?? "未归属",
        )} → ${result.label}`,
    );
    for (const w of result.warnings) say(`注意：${w}`);
    return 0;
}

/**
 * 创建 run 任务（供 shot 复用）。
 */
export async function enqueueRunTask(opts: {
    ctx: CliContext;
    root: string;
    project: import("../core/project/types.mts").ProjectConfig;
    machine: import("../core/project/types.mts").MachineConfig;
    command: string;
    kind: import("../core/project/types.mts").TaskKind;
    episodeId?: string | null;
    requestId?: string;
    options: import("../core/project/types.mts").TaskOptions;
    wait: boolean;
}): Promise<number> {
    const created = await createAndStartTask({
        root: opts.root,
        project: opts.project,
        machine: opts.machine,
        kind: opts.kind,
        episodeId: opts.episodeId ?? null,
        command: opts.command,
        ...(opts.requestId !== undefined ? { requestId: opts.requestId } : {}),
        options: opts.options,
    });
    if (!opts.wait) {
        const data = {
            ...taskSummary(created.task),
            state: created.task.status,
            deduplicated: created.deduplicated,
        };
        if (opts.ctx.json) {
            emitData(data);
            return 0;
        }
        say(`task ${created.task.task_id} 已创建（${created.task.status}）`);
        say(`查看：daoyan status --task ${created.task.task_id} --wait`);
        return 0;
    }
    let lastStatus = "";
    const waited = await waitForTask({
        root: opts.root,
        taskId: created.task.task_id,
        onTick: (task) => {
            if (task.status !== lastStatus) {
                lastStatus = task.status;
                if (!opts.ctx.json) say(`task ${task.task_id}：${task.status}`);
            }
        },
    });
    const data = runWaitData(opts.root, waited.task, waited.runs, {
        interrupted: waited.interrupted,
        timed_out: waited.timedOut,
        foreign: waited.foreign === true,
        deduplicated: created.deduplicated,
    });
    if (opts.ctx.json) emitData(data);
    else if (waited.foreign === true) {
        say(`task ${waited.task.task_id} 属于机器 ${waited.task.machine_id}；本机只返回快照`);
    } else if (!waited.interrupted) {
        say(`task ${waited.task.task_id}：${waited.task.status}`);
        if (waited.task.error !== null) say(`错误：${waited.task.error.code} ${waited.task.error.message}`);
    }
    if (waited.foreign === true) return 0;
    if (waited.interrupted) return 130;
    return taskExitCode(waited.task);
}
