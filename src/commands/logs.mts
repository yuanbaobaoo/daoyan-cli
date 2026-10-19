/** logs —— 结构化事件流优先，引擎/worker 文本日志兜底。
 *  - `--task <id>`：tasks/<id>/events.jsonl（-f 跟随到终态）；
 *  - `--run <id>`：该 run 相关事件；
 *  - 默认：logs/ 下 engine-*.log / worker-*.log / daoyan-cli.log 尾部；
 *  - --json：一次性返回事件数组；-f 时每行一个成功信封（JSONL）。 */
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData, SCHEMA_VERSION } from "../shared/json.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { loadMachineIfExists, requireProject } from "../core/project/config.mts";
import { LOG_DIR, isTerminalStatus, type TaskEvent } from "../core/project/types.mts";
import { readTask, taskSummary } from "../core/task/store.mts";
import { readEvents } from "../core/task/events.mts";
import { taskDir } from "../core/task/store.mts";
import { readRun } from "../core/run/store.mts";
import { listTasks } from "../core/task/store.mts";
import { onSignal } from "../shared/signals.mts";

/**
 * 文件日志数据源。
 */
type Src = "daoyan-cli" | "engine" | "worker" | "all";

/**
 * logs 解析结果。
 */
interface LogsFlags {
  /**
   * --task。
   */
  taskId?: string;
  /**
   * --run。
   */
  runId?: string;
  /**
   * -f。
   */
  follow: boolean;
  /**
   * -n。
   */
  n: number;
  /**
   * --src。
   */
  src: Src;
}

// ANSI 转义
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
// tqdm 形态
const TQDM_RE = /^\s*\d+%.{0,40}\|\s*(\d+)\/(\d+) \[/;

/**
 * 解析 logs 参数。
 */
function parseArgs(args: string[]): LogsFlags {
  // 结果
  const out: LogsFlags = { follow: false, n: 100, src: "all" };
  for (let i = 0; i < args.length; i++) {
    const { name, inline } = splitInlineFlag(args[i] ?? "");
    if (name === "-f" || name === "--follow") {
      out.follow = true;
      continue;
    }
    if (name === "-n") {
      const v = takeValue(args, i, inline, "-n");
      if (!/^\d+$/.test(v.value)) usageError("-n 需要行数");
      out.n = Number(v.value);
      i += v.skip;
      continue;
    }
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
    if (name === "--src") {
      const v = takeValue(args, i, inline, "--src");
      if (v.value !== "daoyan-cli" && v.value !== "engine" && v.value !== "worker" && v.value !== "all") {
        usageError(`--src 仅接受 daoyan-cli|engine|worker|all（收到 ${v.value}）`);
      }
      out.src = v.value;
      i += v.skip;
      continue;
    }
    usageError(`未知参数 ${name}`);
  }
  if (out.taskId !== undefined && out.runId !== undefined) usageError("--task 与 --run 只能二选一");
  return out;
}

/**
 * 清洗文本日志行。
 */
function cleanLines(raw: string): string[] {
  // 去 ANSI
  const lines = raw
    .replace(ANSI_RE, "")
    .split(/[\r\n]+/)
    .filter((l) => l !== "");
  // 输出行
  const out: string[] = [];
  // 上一条 tqdm 键
  let lastKey: string | null = null;
  for (const l of lines) {
    const m = TQDM_RE.exec(l);
    if (m !== null) {
      const key = `${m[1]}/${m[2]}`;
      if (key === lastKey && out.length > 0) {
        out[out.length - 1] = l;
        continue;
      }
      lastKey = key;
      out.push(l);
      continue;
    }
    lastKey = null;
    out.push(l);
  }
  return out;
}

/**
 * 读取文件尾部 n 行。
 */
function readTail(file: string, n: number): string[] {
  if (!existsSync(file)) return [];
  // 文件大小
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return [];
  }
  // 读取窗口
  const window = Math.min(size, n * 400 + 65_536);
  // 尾部缓冲
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
    return [];
  }
  return cleanLines(buf.toString("utf8").replace(/\ufffd/g, "")).slice(-n);
}

/**
 * 默认数据源（logs/ 下最新 engine/worker 日志 + 工具日志）。
 */
function fileSources(root: string, src: Src): Array<{ name: string; file: string }> {
  // logs 目录
  const dir = join(root, LOG_DIR);
  // 最新 engine 日志
  const engines = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /^engine-.*\.log$/.test(f))
        .sort()
        .reverse()
    : [];
  // 最新 worker 日志
  const workers = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /^worker-.*\.log$/.test(f))
        .sort()
        .reverse()
    : [];
  // 数据源列表
  const all = [
    ...(workers[0] !== undefined ? [{ name: "worker", file: join(dir, workers[0]) }] : []),
    ...(engines[0] !== undefined ? [{ name: "engine", file: join(dir, engines[0]) }] : []),
    { name: "daoyan-cli", file: join(dir, "daoyan-cli.log") },
  ];
  if (src === "all") return all;
  return all.filter((s) => s.name === src);
}

/**
 * 事件的人类可读行。
 */
function renderEvent(ev: TaskEvent): string {
  return `[${ev.ts}] ${ev.type} ${JSON.stringify(ev.data)}`;
}

/**
 * 输出一批事件（--json 用信封，人读用行）。
 */
function printEvents(ctx: CliContext, events: TaskEvent[], stream: boolean): void {
  if (ctx.json) {
    if (stream) {
      for (const ev of events) {
        process.stdout.write(
          JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data: { event: ev } }) + "\n",
        );
      }
    } else {
      emitData({ events });
    }
    return;
  }
  for (const ev of events) process.stdout.write(renderEvent(ev) + "\n");
}

/**
 * 任务事件输出（支持 -f 跟随到终态）。
 */
async function taskEvents(ctx: CliContext, root: string, taskId: string, flags: LogsFlags): Promise<number> {
  // 任务存在性
  const task = readTask(root, taskId);
  if (task === null) {
    throw new DaoyanCliError({ code: "task_not_found", message: `未找到 task ${taskId}` });
  }
  // 事件目录
  const dir = taskDir(root, taskId);
  // 其他机器同步来的 task：-f 不跟随（本机不会收到新事件）
  const localMachine = loadMachineIfExists(root);
  const foreign = localMachine !== null && task.machine_id !== localMachine.machine_id;
  // 初始事件
  let events = readEvents(dir);
  // --run 过滤
  if (flags.runId !== undefined) {
    events = events.filter((e) => e.data.run_id === flags.runId);
  }
  // -n 截断
  events = events.slice(-flags.n);

  if (!flags.follow || foreign) {
    if (ctx.json) emitData({ task_id: taskId, events, foreign });
    else {
      for (const ev of events) process.stdout.write(renderEvent(ev) + "\n");
      if (events.length === 0) process.stdout.write("（暂无事件）\n");
      if (foreign) process.stdout.write(`（task 属于机器 ${task.machine_id}；本机不跟随）\n`);
    }
    return 0;
  }

  // 跟随：先输出现有，再轮询到终态
  printEvents(ctx, events, true);
  // 已输出的最大 seq
  let seen = events.length > 0 ? (events[events.length - 1]?.seq ?? 0) : 0;
  // SIGINT 停止跟随
  let stop = false;
  const off = onSignal(() => {
    stop = true;
  });
  try {
    for (;;) {
      await new Promise((r) => setTimeout(r, 500));
      // 新增事件
      const next = readEvents(dir, seen);
      if (next.length > 0) {
        printEvents(ctx, next, true);
        seen = next[next.length - 1]?.seq ?? seen;
      }
      // 终态
      const cur = readTask(root, taskId);
      if (cur !== null && isTerminalStatus(cur.status)) {
        // 补读尾部事件
        const tail = readEvents(dir, seen);
        if (tail.length > 0) printEvents(ctx, tail, true);
        if (!ctx.json) process.stdout.write(`（task ${taskId} ${cur.status}）\n`);
        return 0;
      }
      if (stop) return 130;
    }
  } finally {
    off();
  }
}

/**
 * logs 命令入口。
 */
export async function runLogs(ctx: CliContext, args: string[]): Promise<number> {
  const flags = parseArgs(args);
  const { root } = requireProject(ctx);

  // --task
  if (flags.taskId !== undefined) {
    return taskEvents(ctx, root, flags.taskId, flags);
  }

  // --run：先找 run 所属 task
  if (flags.runId !== undefined) {
    const run = readRun(root, flags.runId);
    // 所属 task id
    const taskId =
      run?.task_id ??
      listTasks(root).find((t) => t.runs.includes(flags.runId as string))?.task_id;
    if (taskId === undefined) {
      throw new DaoyanCliError({
        code: "run_not_found",
        message: `未找到 run ${flags.runId} 的所属 task`,
      });
    }
    return taskEvents(ctx, root, taskId, flags);
  }

  // 默认：文件日志
  const sources = fileSources(root, flags.src);
  const existing = sources.filter((s) => existsSync(s.file));
  if (existing.length === 0) {
    if (ctx.json) {
      emitData({ sources: {}, note: "暂无日志文件；运行任务后可用 logs --task <id>" });
      return 0;
    }
    process.stdout.write("暂无日志文件。运行任务后可用：daoyan logs --task <task_id>\n");
    return 0;
  }

  if (!flags.follow) {
    // 分组数据
    const data: Record<string, string[]> = {};
    for (const s of existing) {
      const lines = readTail(s.file, flags.n);
      data[s.name] = lines;
      if (!ctx.json) for (const l of lines) process.stdout.write(`${l}\n`);
    }
    if (ctx.json) emitData({ sources: data });
    return 0;
  }

  // 跟随文件（0.5s 轮询；截断重置）
  const offsets = new Map<string, number>();
  for (const s of existing) {
    for (const l of readTail(s.file, flags.n)) process.stdout.write(`${l}\n`);
    offsets.set(s.file, statSync(s.file).size);
  }
  let stop = false;
  const off = onSignal(() => {
    stop = true;
  });
  try {
    while (!stop) {
      await new Promise((r) => setTimeout(r, 500));
      for (const s of existing) {
        if (!existsSync(s.file)) continue;
        // 当前大小
        let size = 0;
        try {
          size = statSync(s.file).size;
        } catch {
          continue;
        }
        const prev = offsets.get(s.file) ?? 0;
        if (size === prev) continue;
        if (size < prev) {
          offsets.set(s.file, 0);
          continue;
        }
        // 增量缓冲
        const chunk = Buffer.alloc(size - prev);
        try {
          const fd = openSync(s.file, "r");
          readSync(fd, chunk, 0, size - prev, prev);
          closeSync(fd);
        } catch {
          continue;
        }
        for (const l of cleanLines(chunk.toString("utf8").replace(/\ufffd/g, ""))) {
          process.stdout.write(`${l}\n`);
        }
        offsets.set(s.file, size);
      }
    }
    return 130;
  } finally {
    off();
  }
}

/**
 * 任务摘要（调试导出）。
 */
export function logTaskSummary(root: string, taskId: string): Record<string, unknown> | null {
  const task = readTask(root, taskId);
  return task === null ? null : taskSummary(task);
}
