/** status —— 被动状态快照（唯一状态入口，不启动引擎）。
 *  - 默认：项目/模式/引擎探测/机器锁/active task/同步来的其他机器任务/队列/GPU/租约/Skill/镜头进度；
 *  - --task <id> [--wait]：任务详情、run 列表、最近事件；
 *  - --run <id> [--wait]：单个 run 详情。 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import {
  loadMachine,
  loadShotsIfExists,
  requireProject,
} from "../core/project/config.mts";
import {
  RUNS_DIR,
  isTerminalStatus,
  type MachineConfig,
  type ProjectConfig,
  type RunRecord,
  type ShotsFile,
  type TaskRecord,
} from "../core/project/types.mts";
import { ComfyClient, probeComfy } from "../core/comfy/client.mts";
import { pidAlive, readEnginePid } from "../core/engine/local-session.mts";
import { inspectMachineLock } from "../core/machine/lock.mts";
import { latestSucceededRun, listRuns, readRun } from "../core/run/store.mts";
import { runSummary } from "../core/run/summary.mts";
import { listTasks, readTask, taskSummary } from "../core/task/store.mts";
import { readEvents } from "../core/task/events.mts";
import { taskDir } from "../core/task/store.mts";
import { taskExitCode, taskRuns, waitForTask } from "../core/task/create.mts";
import { gpuSnapshot } from "../core/gpu/detect.mts";
import { inspectLease } from "../core/gpu/lease.mts";
import { skillState } from "../core/agent/skill.mts";
import { VERSION } from "../shared/version.mts";

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
    usageError(`未知参数 ${name}`);
  }
  if (out.taskId !== undefined && out.runId !== undefined) usageError("--task 与 --run 只能二选一");
  return out;
}

/**
 * 探测引擎（不启动）。
 */
async function probeEngine(root: string, machine: MachineConfig): Promise<Record<string, unknown>> {
  if (machine.engine.mode === "remote") {
    // remote
    const url = machine.engine.url;
    const up = await probeComfy(url, 3_000);
    const queue = up ? await safeQueue(new ComfyClient(url)) : null;
    return { mode: "remote", url, up, pid: null, queue };
  }
  // local
  const pidRec = readEnginePid(root);
  const pid = pidRec !== null && pidAlive(pidRec.pid) ? pidRec.pid : null;
  const url = `http://127.0.0.1:${machine.engine.port}`;
  const up = await probeComfy(url, 3_000);
  const queue = up ? await safeQueue(new ComfyClient(url)) : null;
  return {
    mode: "local",
    url,
    up,
    pid,
    queue,
    log: pid !== null ? `logs/engine-${pidRec?.task_id ?? "*"}.log` : null,
  };
}

/**
 * 队列快照（失败返回 null）。
 */
async function safeQueue(client: ComfyClient): Promise<Record<string, number> | null> {
  try {
    const q = await client.queue();
    return { running: q.queue_running.length, pending: q.queue_pending.length };
  } catch {
    return null;
  }
}

/**
 * 镜头进度（从 runs 推导）。
 */
function shotProgress(
  root: string,
  shots: ShotsFile | null,
): Array<Record<string, unknown>> {
  if (shots === null) return [];
  return shots.shots.map((s) => {
    // 最新成功 run
    const rec = latestSucceededRun(root, `shot:${s.id}`);
    // 第一个产物是否存在
    const present =
      rec !== null &&
      rec.outputs.some((o) => existsSync(join(root, RUNS_DIR, rec.run_id, o.path)));
    return {
      id: s.id,
      slug: s.slug ?? null,
      done: rec !== null,
      latest_run: rec?.run_id ?? null,
      artifact_present: present,
    };
  });
}

/**
 * 默认快照。
 */
async function snapshot(
  root: string,
  project: ProjectConfig,
  machine: MachineConfig,
  shots: ShotsFile | null,
): Promise<Record<string, unknown>> {
  // 引擎探测
  const engine = await probeEngine(root, machine);
  // 机器锁
  const lock = inspectMachineLock();
  // 任务列表
  const tasks = listTasks(root);
  // 本机 active task
  const active = tasks.filter(
    (t) => !isTerminalStatus(t.status) && t.machine_id === machine.machine_id,
  );
  // 其他机器同步来的运行中任务
  const synced = tasks.filter(
    (t) => !isTerminalStatus(t.status) && t.machine_id !== machine.machine_id,
  );
  // GPU
  const gpu = await gpuSnapshot();
  const lease = inspectLease();
  // Skill
  const { COMMANDS } = await import("./registry.mts");
  const skill = skillState(root, VERSION, COMMANDS);
  // 镜头
  const shot = shotProgress(root, shots);
  return {
    project: { name: project.name, version: project.version },
    mode: machine.engine.mode,
    machine_id: machine.machine_id,
    machine: {
      id: machine.machine_id,
      engine:
        machine.engine.mode === "local"
          ? {
              mode: "local",
              port: machine.engine.port,
              modelpath: machine.engine.modelpath ?? null,
              models_config: machine.engine.models_config ?? null,
              launch_extra: machine.engine.launch_extra ?? [],
              comfyui_version: machine.engine.comfyui_version ?? null,
              comfyui_dir: machine.engine.comfyui_dir ?? "engine/ComfyUI",
              venv_dir: machine.engine.venv_dir ?? "engine/.venv",
            }
          : {
              mode: "remote",
              url: machine.engine.url,
              free_after_task: machine.engine.free_after_task ?? "when_idle",
            },
      override_workflows: Object.keys(machine.overrides ?? {}),
    },
    engine,
    machine_lock:
      lock.status === "ok"
        ? {
            status: pidAlive(lock.record.pid) ? "held" : "stale",
            owner_alive: pidAlive(lock.record.pid),
            owner: {
              task_id: lock.record.task_id,
              pid: lock.record.pid,
              mode: lock.record.mode,
              command: lock.record.command,
              kind: lock.record.kind,
              started_at: lock.record.started_at,
            },
          }
        : { status: lock.status },
    active_task: active[0] !== undefined ? taskSummary(active[0]) : null,
    active_tasks: active.map(taskSummary),
    synced_running_tasks: synced.map(taskSummary),
    recent_tasks: tasks.slice(0, 10).map(taskSummary),
    gpu: {
      supported: gpu.supported,
      ...(gpu.reason !== undefined ? { reason: gpu.reason } : {}),
      devices: gpu.devices,
      lease:
        lease.status === "ok"
          ? {
              status: "held",
              task_id: lease.lease.task_id,
              entries: lease.lease.entries.length,
              created_at: lease.lease.created_at,
            }
          : { status: lease.status },
    },
    skill: {
      present: skill.present,
      version: skill.version,
      generated_at: skill.generated_at,
      stale: skill.stale,
      path: skill.path,
    },
    shots: shot,
    next_actions:
      active.length > 0
        ? [`status --task ${active[0]?.task_id} --wait`, `run cancel ${active[0]?.task_id}`]
        : ["workflow nodes --refresh --json", "run <workflow> --json"],
  };
}

/**
 * status 命令入口。
 */
export async function runStatus(ctx: CliContext, args: string[]): Promise<number> {
  const flags = parseArgs(args);
  const { root, config: project } = requireProject(ctx);
  const machine = loadMachine(root);
  const shots = loadShotsIfExists(root);

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

  // 默认快照
  const data = await snapshot(root, project, machine, shots);
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
  say(activeTask === null ? "本机任务：空闲" : `本机任务：${String(activeTask.command)}（${String(activeTask.status)}）`);
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
  // 镜头
  const shotsData = data.shots as Array<Record<string, unknown>>;
  if (shotsData.length > 0) {
    const done = shotsData.filter((s) => s.done === true).length;
    say(`镜头进度：${done}/${shotsData.length}`);
    for (const s of shotsData) say(`  ${s.done === true ? "✅" : "⬜"} ${String(s.id)} ${String(s.slug ?? "")}`);
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
