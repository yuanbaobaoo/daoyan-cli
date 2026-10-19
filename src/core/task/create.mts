/** CLI 侧任务创建与等待 —— 幂等检查 → 机器锁预留 → 写 task.json → spawn detached worker。
 *  默认异步：返回 task_id；--wait 才前台等待到终态（SIGINT 只停止等待，不取消任务）。 */
import { closeSync, openSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, nowIso } from "../../shared/fs.mts";
import { tryExecCapture } from "../../shared/exec.mts";
import { onSignal } from "../../shared/signals.mts";
import { sleep } from "../../shared/net.mts";
import {
  CANCEL_FILE,
  LOG_DIR,
  RUN_FILE,
  TASKS_DIR,
  isTerminalStatus,
  type MachineConfig,
  type ProjectConfig,
  type RunRecord,
  type TaskKind,
  type TaskOptions,
  type TaskRecord,
} from "../project/types.mts";
import { createRunDir } from "../run/store.mts";
import { loadMachineIfExists } from "../project/config.mts";
import { acquireMachineLock, inspectMachineLock, pidAlive, recoverStaleLock } from "../machine/lock.mts";
import type { AcquiredLock } from "../machine/lock.mts";
import {
  appendTaskRun,
  createTask,
  findTaskByRequestId,
  finishTask,
  makeTaskRecord,
  newTaskId,
  readTask,
  requestCancel,
  taskDir,
  taskSummary,
} from "./store.mts";
import { appendEvent } from "./events.mts";
import { workerLogPath } from "./worker.mts";

/**
 * 创建任务的结果。
 */
export interface CreatedTask {
  /**
   * 任务记录。
   */
  task: TaskRecord;
  /**
   * 是否命中 request_id 幂等（未创建新任务）。
   */
  deduplicated: boolean;
}

/**
 * 创建任务的参数。
 */
export interface CreateTaskOptions {
  /**
   * 项目根。
   */
  root: string;
  /**
   * 共享配置。
   */
  project: ProjectConfig;
  /**
   * 本机配置。
   */
  machine: MachineConfig;
  /**
   * 任务类型。
   */
  kind: TaskKind;
  /**
   * 触发命令（展示用）。
   */
  command: string;
  /**
   * 幂等键。
   */
  requestId?: string;
  /**
   * 执行选项。
   */
  options: TaskOptions;
}

/**
 * 睡眠工具（本模块专用）。
 */
function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 创建 task 并启动 detached worker。
 */
export async function createAndStartTask(opts: CreateTaskOptions): Promise<CreatedTask> {
  // 幂等：同一 request_id 直接返回已有 task
  if (opts.requestId !== undefined && opts.requestId !== "") {
    // 已有任务
    const existing = findTaskByRequestId(opts.root, opts.requestId);
    if (existing !== null) return { task: existing, deduplicated: true };
  }

  // 本次执行模式（--engine 单次覆盖 = remote）
  const mode: "local" | "remote" =
    opts.options.engine_url !== undefined ? "remote" : opts.machine.engine.mode;
  // task id
  const taskId = newTaskId(opts.machine.machine_id);
  // 任务记录
  const record = makeTaskRecord({
    taskId,
    kind: opts.kind,
    machineId: opts.machine.machine_id,
    requestId: opts.requestId !== undefined && opts.requestId !== "" ? opts.requestId : null,
    mode,
    command: opts.command,
    options: opts.options,
  });

  // 1) 机器锁预留（原子创建；忙则 machine_busy）
  let lock: AcquiredLock;
  try {
    lock = await acquireMachineLock({
      taskId,
      project: opts.root,
      mode,
      command: opts.command,
      kind: "generation",
    });
  } catch (e) {
    // 并发使用同一 request_id：另一个进程可能刚创建完 task
    if (
      opts.requestId !== undefined &&
      opts.requestId !== "" &&
      e instanceof DaoyanCliError &&
      e.code === "machine_busy"
    ) {
      const existing = findTaskByRequestId(opts.root, opts.requestId);
      if (existing !== null) return { task: existing, deduplicated: true };
    }
    throw e;
  }

  try {
    // 2) 落 task.json
    createTask(opts.root, record);
    appendEvent(taskDir(opts.root, taskId), "queued", {
      kind: record.kind,
      command: record.command,
    });

    // 3) spawn detached worker
    // CLI 入口（dist/cli.mjs 或开发期 tsx 入口）
    const entry = process.argv[1];
    if (entry === undefined || entry === "") {
      throw new DaoyanCliError({
        code: "worker_start_failed",
        message: "无法定位 CLI 入口（process.argv[1] 为空）",
      });
    }
    // worker 日志
    const logFile = workerLogPath(opts.root, taskId);
    ensureDir(join(opts.root, LOG_DIR));
    // 日志 fd 交给子进程
    const fd = openSync(logFile, "a");
    // 子进程
    const child = spawn(process.execPath, [entry, "__worker"], {
      cwd: opts.root,
      detached: true,
      stdio: ["ignore", fd, fd],
      env: {
        ...process.env,
        DYCLI_TASK_DIR: taskDir(opts.root, taskId),
        DYCLI_LOCK_TOKEN: lock.record.token,
      },
    });
    // 清理日志 fd（子进程已继承）
    closeSync(fd);
    // 等待 spawn 成功/失败
    await new Promise<void>((resolvePromise, rejectPromise) => {
      child.once("spawn", () => resolvePromise());
      child.once("error", (e) => rejectPromise(e));
    });
    // worker pid 已知：先 handoff，关闭 CLI 退出与 worker 接管的竞态窗口
    if (child.pid === undefined) {
      throw new DaoyanCliError({ code: "worker_start_failed", message: "worker 未获得 pid" });
    }
    lock.handoff(child.pid);
    child.unref();
    // 不在 CLI 侧回写 task.json，避免与 worker 的 running 更新竞态；
    // 返回值合并 worker 信息即可，worker 会自行落盘。
    const baseline = readTask(opts.root, taskId) ?? record;
    return {
      task: {
        ...baseline,
        worker: { pid: child.pid, started_at: nowIso() },
        next_actions: [
          `status --task ${taskId} --wait`,
          `logs --task ${taskId} -f`,
          `run cancel ${taskId}`,
        ],
      },
      deduplicated: false,
    };
  } catch (e) {
    // 启动失败：task 标记 failed、释放锁预留
    const err = e instanceof DaoyanCliError ? e : null;
    try {
      const cur = readTask(opts.root, taskId);
      if (cur !== null && !isTerminalStatus(cur.status)) {
        // 记录里去掉项目绝对路径
        const rawMessage = err?.message ?? (e instanceof Error ? e.message : String(e));
        finishTask(opts.root, taskId, "failed", {
          code: "worker_start_failed",
          message: rawMessage.split(`${opts.root}/`).join("").split(opts.root).join(""),
        });
      }
    } catch {
      // 忽略收尾失败
    }
    lock.release();
    if (err !== null) throw err;
    throw new DaoyanCliError({
      code: "worker_start_failed",
      message: `worker 启动失败：${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

/**
 * 等待结果。
 */
export interface WaitResult {
  /**
   * 终态任务（超时/中断时仍可能是运行态）。
   */
  task: TaskRecord;
  /**
   * 任务对应的 run 记录。
   */
  runs: RunRecord[];
  /**
   * 前台等待被 SIGINT 打断。
   */
  interrupted: boolean;
  /**
   * 是否等待超时。
   */
  timedOut: boolean;
  /**
   * task 属于其他机器（Git 同步来的运行），本机不等待、不判定 stale。
   */
  foreign?: boolean;
}

/**
 * 读取任务关联的 run 记录。
 */
export function taskRuns(root: string, task: TaskRecord): RunRecord[] {
  // run 记录列表
  const out: RunRecord[] = [];
  for (const id of task.runs) {
    try {
      // run.json
      const raw = JSON.parse(readFileSync(join(root, "runs", id, RUN_FILE), "utf8")) as RunRecord;
      out.push(raw);
    } catch {
      // 尚未落盘
    }
  }
  return out;
}

/**
 * 等待 task 到终态；SIGINT 只停止等待。
 */
export async function waitForTask(opts: {
  root: string;
  taskId: string;
  timeoutMs?: number;
  pollMs?: number;
  onTick?: (task: TaskRecord) => void;
}): Promise<WaitResult> {
  // 是否为 SIGINT 打断
  let interrupted = false;
  // 本机 machine id（缺失则不判定 foreign）
  const localMachine = loadMachineIfExists(opts.root);
  // 注销信号处理器
  const off = onSignal(() => {
    interrupted = true;
  });
  // 截止时间
  const deadline = opts.timeoutMs !== undefined ? Date.now() + opts.timeoutMs : undefined;
  try {
    for (;;) {
      // 当前 task
      const task = readTask(opts.root, opts.taskId);
      if (task === null) {
        throw new DaoyanCliError({ code: "task_not_found", message: `未找到 task ${opts.taskId}` });
      }
      opts.onTick?.(task);
      // 其他机器同步来的 task：只返回当前快照，不在本机做 stale 恢复
      if (localMachine !== null && task.machine_id !== localMachine.machine_id) {
        return { task, runs: taskRuns(opts.root, task), interrupted: false, timedOut: false, foreign: true };
      }
      if (isTerminalStatus(task.status)) {
        return { task, runs: taskRuns(opts.root, task), interrupted: false, timedOut: false };
      }
      // worker 已死但 task 未终态：执行 stale 恢复，避免前台永久等待
      if (task.status === "running" || task.status === "queued") {
        // 本机锁 owner（worker 接管后 pid 即 worker）
        const lock = inspectMachineLock();
        const lockPid =
          lock.status === "ok" && lock.record.task_id === task.task_id ? lock.record.pid : null;
        // 已知 worker pid
        const workerPid = task.worker?.pid ?? lockPid;
        // queued 且长时间没有 worker：也视为异常
        const orphanedQueued =
          task.status === "queued" &&
          workerPid === null &&
          Date.now() - Date.parse(task.created_at) > 5_000;
        if ((workerPid !== null && !pidAlive(workerPid)) || orphanedQueued) {
          if (lock.status === "ok" && lock.record.task_id === task.task_id) {
            await recoverStaleLock(lock.record, lock.path);
          } else {
            finishTask(opts.root, task.task_id, "interrupted", {
              code: "worker_crashed",
              message:
                workerPid !== null
                  ? `worker（pid ${workerPid}）已退出；任务标记为 interrupted`
                  : "任务未启动 worker；标记为 interrupted",
            });
          }
          const cur = readTask(opts.root, opts.taskId) ?? task;
          return { task: cur, runs: taskRuns(opts.root, cur), interrupted: false, timedOut: false };
        }
      }
      if (interrupted) {
        return { task, runs: taskRuns(opts.root, task), interrupted: true, timedOut: false };
      }
      if (deadline !== undefined && Date.now() > deadline) {
        return { task, runs: taskRuns(opts.root, task), interrupted: false, timedOut: true };
      }
      await sleepMs(opts.pollMs ?? 500);
    }
  } finally {
    off();
  }
}

/**
 * 任务终态映射退出码：成功 0、失败 1、取消 130、中断 1。
 */
export function taskExitCode(task: TaskRecord): number {
  if (task.status === "succeeded") return 0;
  if (task.status === "cancelled") return 130;
  return 1;
}

/**
 * 把任务终态转成 CLI 错误（--wait 失败时保留机器契约）。
 */
export function throwTaskFailure(task: TaskRecord): void {
  if (task.status === "succeeded") return;
  // task 错误
  const err = task.error;
  if (task.status === "cancelled") {
    throw new DaoyanCliError({
      code: "run_failed",
      message: "任务已取消",
      exit: 130,
      retryable: false,
      hint: "需要重新执行时使用新的 request_id。",
      taskId: task.task_id,
      details: { task: taskSummary(task) },
    });
  }
  throw new DaoyanCliError({
    code: (err?.code as DaoyanCliError["code"] | undefined) ?? "run_failed",
    message: err?.message ?? `task ${task.task_id} ${task.status}`,
    taskId: task.task_id,
    details: { task: taskSummary(task), ...(err?.details ?? {}) },
  });
}

/**
 * 判断 pid 是否确实是 worker 进程（避免 PID 复用误杀）。
 */
async function isWorkerProcess(pid: number): Promise<boolean> {
  // ps 命令行
  const r = await tryExecCapture("ps", ["-p", String(pid), "-o", "args="], { timeoutMs: 3_000 });
  return r !== null && r.code === 0 && r.stdout.includes("__worker");
}

/**
 * 取消任务：worker 存活则发 SIGTERM + cancel.request；worker 已死则 stale 恢复。
 */
export async function cancelTask(root: string, taskId: string): Promise<TaskRecord> {
  // 当前 task
  const task = readTask(root, taskId);
  if (task === null) {
    throw new DaoyanCliError({ code: "task_not_found", message: `未找到 task ${taskId}` });
  }
  if (isTerminalStatus(task.status)) return task;
  // 其他机器的 task 不能在本机取消
  const localMachine = loadMachineIfExists(root);
  if (localMachine !== null && task.machine_id !== localMachine.machine_id) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `task ${taskId} 属于机器 ${task.machine_id}，不能在本机取消`,
      details: { task_machine: task.machine_id, local_machine: localMachine.machine_id },
      hint: `在 ${task.machine_id} 上运行 daoyan run cancel ${taskId}。`,
    });
  }
  // 取消请求文件（worker 轮询）
  requestCancel(root, taskId);
  // 当前机器锁（worker 接管后 owner pid 即 worker）
  const lock = inspectMachineLock();
  const lockPid =
    lock.status === "ok" && lock.record.task_id === taskId ? lock.record.pid : 0;
  // worker pid（task 尚未回写时取锁 owner）
  const pid = task.worker?.pid ?? lockPid;
  // task 已回写 worker pid 时，先确认该 pid 仍是 worker（防 PID 复用误杀）
  const reportedWorker = task.worker !== null && task.worker.pid === pid;
  const verified = !reportedWorker || (await isWorkerProcess(pid));
  if (pid > 0 && pidAlive(pid) && verified) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // worker 可能刚退出
    }
    // 给 cleanup 一点时间
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const cur = readTask(root, taskId);
      if (cur !== null && isTerminalStatus(cur.status)) return cur;
      await sleep(500);
    }
    return readTask(root, taskId) ?? task;
  }

  // worker 已死：尝试 stale 恢复
  if (lock.status === "ok" && lock.record.task_id === taskId) {
    await recoverStaleLock(lock.record, lock.path);
  }
  // 若没有锁，直接标记 interrupted
  const cur = readTask(root, taskId);
  if (cur !== null && !isTerminalStatus(cur.status)) {
    return finishTask(root, taskId, "interrupted", {
      code: "worker_crashed",
      message: `worker（pid ${pid}）已退出；任务标记为 interrupted`,
    });
  }
  return cur ?? task;
}

/**
 * 取消请求文件路径（测试/诊断用）。
 */
export function cancelRequestPath(root: string, taskId: string): string {
  return join(taskDir(root, taskId), CANCEL_FILE);
}

/**
 * 预留一个 task 目录（dry-run / 调试）。
 */
export function taskRunIds(root: string, taskId: string): string[] {
  // task 记录
  const task = readTask(root, taskId);
  return task?.runs ?? [];
}

/**
 * 创建 task 的 run 目录（worker 内部用；保留导出便于测试）。
 */
export function ensureRunDir(root: string, runId: string): void {
  createRunDir(root, runId);
}

/**
 * 任务路径展示。
 */
export function taskRelativeDir(taskId: string): string {
  return join(TASKS_DIR, taskId);
}

/**
 * 任务锁 owner 是否本机（status 分类用）。
 */
export function isLocalMachine(machineId: string, machine: MachineConfig): boolean {
  return machineId === machine.machine_id;
}

/**
 * 追加 run 到 task（worker 内层使用）。
 */
export function addRunToTask(root: string, taskId: string, runId: string): TaskRecord {
  return appendTaskRun(root, taskId, runId);
}

/**
 * 生成 worker 日志路径（预留导出）。
 */
export function taskLogPath(root: string, taskId: string): string {
  return join(root, LOG_DIR, `worker-${taskId}.log`);
}
