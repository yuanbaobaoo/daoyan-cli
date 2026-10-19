/** run 执行器 —— 预检 → 上传 → 提交 → 轮询 → 下载 → 落 run.json。
 *  引擎生命周期由 EngineSession 负责；本模块只关心一次 run 的业务流程。
 *  失败也写 run.json（保留错误与 prompt id），产物下载成功后才通知 scratch 清理。 */
import { existsSync, readFileSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { basename, join } from "node:path";
import { DaoyanCliError, asCliError, isDaoyanCliError } from "../../shared/errors.mts";
import { nowIso } from "../../shared/fs.mts";
import { sleep } from "../../shared/net.mts";
import { ComfyClient, type HistoryEntry } from "../comfy/client.mts";
import type { MachineConfig, ProjectConfig, RunRecord, RunOutput } from "../project/types.mts";
import { LOG_DIR } from "../project/types.mts";
import {
  copyRunInput,
  createRunDir,
  writeInputsSnapshot,
  writeRun,
  writeRunOutput,
  writeWorkflowSnapshot,
} from "./store.mts";
import type { RunPlan } from "../task/plans.mts";
import type { EngineSession } from "../engine/session.mts";
import { runPreflight } from "../workflow/preflight.mts";
import { validateGraphWithCatalog, throwOnErrors } from "../workflow/load.mts";
import type { NodeCatalog } from "../workflow/catalog.mts";
import { graphSha256, type WorkflowGraph } from "../workflow/graph.mts";

// 轮询 interval（1s）
const POLL_INTERVAL_MS = 1_000;
// 长任务进度事件间隔（60s）
const HEARTBEAT_MS = 60_000;

/**
 * 会话级累积状态（跨多个 run 共用，cleanup 时需要）。
 */
export interface SessionAccumulator {
  /**
   * 是否提交过 prompt（决定 /free）。
   */
  submitted: boolean;
  /**
   * 已上传的引擎侧文件名。
   */
  uploaded: string[];
  /**
   * 已下载的引擎产物（local 清理 scratch 用）。
   */
  scratchOutputs: Array<{ filename: string; subfolder: string }>;
  /**
   * 是否需要 interrupt（取消 / 超时 / OOM）。
   */
  interruptNeeded: boolean;
}

/**
 * 任务被用户取消。
 */
export class RunCancelledError extends Error {
  /**
   * 固定错误名。
   */
  constructor() {
    super("task cancelled");
    this.name = "RunCancelledError";
  }
}

/**
 * 单个 run 的执行上下文。
 */
export interface ExecuteRunOptions {
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
   * 引擎会话。
   */
  session: EngineSession;
  /**
   * 执行计划。
   */
  plan: RunPlan;
  /**
   * run id。
   */
  runId: string;
  /**
   * task id。
   */
  taskId: string;
  /**
   * 机器标签。
   */
  machineId: string;
  /**
   * 幂等键。
   */
  requestId: string | null;
  /**
   * 等待上限（毫秒）。
   */
  timeoutMs: number;
  /**
   * 取消信号。
   */
  signal: AbortSignal;
  /**
   * 会话累积状态。
   */
  accumulator: SessionAccumulator;
  /**
   * 节点目录（任务级预检结果）；缺省时本 run 自行预检。
   */
  catalog?: NodeCatalog;
  /**
   * 日志回调。
   */
  log: (m: string) => void;
  /**
   * 事件回调。
   */
  event: (type: string, data: Record<string, unknown>) => void;
}

/**
 * 从 history 中收集可下载产物。
 */
function collectOutputItems(
  outputs: Record<string, Record<string, unknown>>,
): Array<{ filename: string; subfolder: string; type: string }> {
  // 收集结果
  const out: Array<{ filename: string; subfolder: string; type: string }> = [];
  for (const nodeOutputs of Object.values(outputs)) {
    for (const key of ["videos", "gifs", "images"]) {
      // 当前分类的条目
      const arr = nodeOutputs[key];
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (typeof item !== "object" || item === null) continue;
        // 条目宽松视图
        const o = item as Record<string, unknown>;
        if (typeof o.filename !== "string" || o.filename === "") continue;
        out.push({
          filename: o.filename,
          subfolder: typeof o.subfolder === "string" ? o.subfolder : "",
          type: typeof o.type === "string" ? o.type : "output",
        });
      }
    }
  }
  return out;
}

/**
 * 读取文件尾部内容（OOM 分类辅助）。
 */
function readTailText(file: string, lines: number): string {
  if (!existsSync(file)) return "";
  // 文件大小
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return "";
  }
  // 读取窗口
  const window = Math.min(size, lines * 400 + 65_536);
  // 尾部缓冲
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
    return "";
  }
  return buf
    .toString("utf8")
    .split(/[\r\n]+/)
    .filter((l) => l !== "")
    .slice(-lines)
    .join("\n");
}

/**
 * OOM 判定：history 消息或引擎日志。
 */
function detectOom(entry: HistoryEntry, root: string, taskId: string): boolean {
  // history 状态消息
  const statusText = JSON.stringify(entry.status?.messages ?? []);
  if (/out of memory|OutOfMemory|CUDA error|allocation on device|\bOOM\b/i.test(statusText)) return true;
  // local 引擎日志
  const logText = readTailText(join(root, LOG_DIR, `engine-${taskId}.log`), 30);
  return /out of memory|OutOfMemory|CUDA error: out of memory|allocation on device|\bOOM\b/i.test(logText);
}

/**
 * 把错误 message 里的绝对路径替换成相对/占位，保证记录可进 Git。
 */
export function sanitizeMessage(message: string, root: string): string {
  // 项目根 + 分隔符
  const prefixes = [`${root}/`, `${root}\\`, root];
  // 依次替换
  let out = message;
  for (const p of prefixes) out = out.split(p).join("");
  return out;
}

/**
 * 递归清洗 details 中的项目绝对路径（字符串 / 数组 / 对象）。
 */
export function sanitizeDetails(value: unknown, root: string): unknown {
  if (typeof value === "string") return sanitizeMessage(value, root);
  if (Array.isArray(value)) return value.map((v) => sanitizeDetails(v, root));
  if (value !== null && typeof value === "object") {
    // 对象宽松视图
    const src = value as Record<string, unknown>;
    // 清洗后的对象
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      out[sanitizeMessage(k, root)] = sanitizeDetails(v, root);
    }
    return out;
  }
  return value;
}

/**
 * 记录一个失败的 run（写 run.json）。
 */
function writeFailedRun(opts: {
  root: string;
  runId: string;
  taskId: string;
  machineId: string;
  requestId: string | null;
  plan: RunPlan;
  session: EngineSession;
  startedAt: string;
  promptId: string | null;
  status: "failed" | "cancelled" | "interrupted";
  error: RunRecord["error"];
}): RunRecord {
  // 引擎信息
  const info = opts.session.info();
  // 失败记录
  const rec: RunRecord = {
    run_id: opts.runId,
    task_id: opts.taskId,
    machine_id: opts.machineId,
    request_id: opts.requestId,
    label: opts.plan.label,
    workflow: { path: opts.plan.workflowRel, sha256: graphSha256(opts.plan.graph) },
    inputs: opts.plan.inputs,
    overrides: opts.plan.overrides,
    engine: {
      mode: info.mode,
      comfyui_version: info.comfyui_version,
      url: info.url,
      pid: info.pid,
      ready_ms: info.ready_ms,
      cleanup: null,
    },
    status: opts.status,
    prompt_id: opts.promptId,
    started_at: opts.startedAt,
    finished_at: nowIso(),
    outputs: [],
    error: opts.error,
  };
  writeRun(opts.root, rec);
  return rec;
}

/**
 * 执行单个 run；失败时写 run.json 后抛出结构化错误。
 */
export async function executeRun(opts: ExecuteRunOptions): Promise<RunRecord> {
  // 起始时间
  const startedAt = nowIso();
  // 开始时间戳（超时基准）
  const startedMs = Date.now();
  // run 目录
  createRunDir(opts.root, opts.runId);
  // 本轮实际提交的图（拷贝，防止上传注入污染计划）
  const graph: WorkflowGraph = JSON.parse(JSON.stringify(opts.plan.graph)) as WorkflowGraph;
  // 输入文件记录
  const files: Array<{ name: string; sha256: string; bytes: number }> = [];
  // 已提交 prompt
  let submitted = false;
  // prompt id
  let promptId: string | null = null;

  try {
    // 空图不能执行（分步编辑期间允许存在，但提交前必须失败）
    if (Object.keys(graph).length === 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `workflow ${opts.plan.workflowRel} 是空图；先用 workflow apply/set 添加节点`,
      });
    }
    // 1) 上传输入文件并注入图
    for (const up of opts.plan.uploads) {
      opts.event("upload_started", { run_id: opts.runId, logical: up.logical });
      // 源文件字节
      const bytes = new Uint8Array(readFileSync(up.source));
      // 写入 run inputs（Git 可追溯）
      files.push(copyRunInput(opts.root, opts.runId, up.source, up.desiredName));
      // 引擎侧唯一文件名
      const engineName = `dycli_${opts.runId}_${basename(up.desiredName).replace(/[^A-Za-z0-9._-]/g, "_")}`;
      // 上传
      const name = await opts.session.client.uploadImage(engineName, bytes, true);
      opts.accumulator.uploaded.push(name);
      // 注入节点
      const target = graph[up.target.node];
      if (target === undefined) {
        throw new DaoyanCliError({
          code: "workflow_invalid",
          message: `first_frame 绑定指向不存在的节点 ${up.target.node}`,
        });
      }
      target.inputs[up.target.input] = name;
      opts.event("upload_finished", { run_id: opts.runId, logical: up.logical, name });
    }

    // 2) 快照（实际提交的图 + 输入；预检失败也保留失败记录的可追溯性）
    writeWorkflowSnapshot(opts.root, opts.runId, graph);
    writeInputsSnapshot(opts.root, opts.runId, opts.plan.inputs, files);

    // 3) 预检（任务级 catalog 优先；上传后的图才是最终图）
    if (opts.catalog === undefined) {
      // 本 run 自行预检
      const pf = await runPreflight(opts.root, opts.session.client, graph, opts.log);
      throwOnErrors(pf.issues, "预检失败");
    } else {
      throwOnErrors(validateGraphWithCatalog(graph, opts.catalog), "预检失败");
    }

    // 4) 提交
    opts.event("run_started", { run_id: opts.runId, label: opts.plan.label });
    // 提交回执
    const receipt = await opts.session.client.submit(graph, `daoyan-${opts.runId}`);
    if (receipt.node_errors !== undefined && Object.keys(receipt.node_errors).length > 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: "引擎拒绝 workflow（node_errors）",
        details: { node_errors: receipt.node_errors },
      });
    }
    promptId = receipt.prompt_id;
    submitted = true;
    opts.accumulator.submitted = true;
    opts.event("submitted", { run_id: opts.runId, prompt_id: promptId });
    opts.log(`run ${opts.runId} 已提交（prompt ${promptId.slice(0, 8)}…）`);

    // 5) 轮询
    // 截止时间
    const deadline = startedMs + opts.timeoutMs;
    // 上次心跳
    let lastBeat = Date.now();
    for (;;) {
      if (opts.signal.aborted) {
        opts.accumulator.interruptNeeded = true;
        throw new RunCancelledError();
      }
      if (Date.now() > deadline) {
        opts.accumulator.interruptNeeded = true;
        throw new DaoyanCliError({
          code: "run_timeout",
          message: `run ${opts.runId} 等待超时（${Math.round(opts.timeoutMs / 60_000)} 分钟）`,
          details: { prompt_id: promptId },
        });
      }
      // local 进程健康
      if (opts.session.health() === "dead") {
        opts.accumulator.interruptNeeded = false;
        throw new DaoyanCliError({
          code: "engine_crashed",
          message: "引擎进程在执行中退出",
          details: { prompt_id: promptId },
        });
      }
      // history 查询
      let entry: HistoryEntry | undefined;
      try {
        // 当前 prompt 的 history
        const hist = await opts.session.client.history(promptId);
        entry = hist[promptId];
      } catch {
        entry = undefined;
      }
      if (entry !== undefined) {
        // 终态字符串
        const statusStr = entry.status?.status_str;
        if (statusStr === "error" || statusStr === "cancelled") {
          // OOM 优先分类
          const oom = detectOom(entry, opts.root, opts.taskId);
          if (oom) opts.accumulator.interruptNeeded = true;
          throw new DaoyanCliError({
            code: oom ? "engine_oom" : "run_failed",
            message: oom
              ? "显存不足（OOM）：引擎执行失败"
              : `引擎执行失败（status=${statusStr}）`,
            details: {
              prompt_id: promptId,
              status: entry.status ?? {},
            },
          });
        }
        // 完成判定
        const outputs = entry.outputs ?? {};
        if ((entry.status?.completed ?? false) || Object.keys(outputs).length > 0) {
          // 产物条目
          const items = collectOutputItems(outputs);
          if (items.length === 0) {
            throw new DaoyanCliError({
              code: "run_failed",
              message: "引擎标记完成但没有输出文件",
              details: { prompt_id: promptId },
            });
          }
          // 下载产物
          const downloaded: RunOutput[] = [];
          for (const item of items) {
            if (item.type !== "output") continue;
            try {
              // /view 字节
              const res = await opts.session.client.view(item);
              const rec = writeRunOutput(opts.root, opts.runId, item.filename, res.bytes);
              downloaded.push(rec);
              opts.accumulator.scratchOutputs.push({
                filename: item.filename,
                subfolder: item.subfolder,
              });
            } catch (e) {
              throw new DaoyanCliError({
                code: "artifact_download_failed",
                message: `产物下载失败 ${item.filename}：${e instanceof Error ? e.message : String(e)}`,
                details: { prompt_id: promptId, filename: item.filename },
              });
            }
          }
          if (downloaded.length === 0) {
            throw new DaoyanCliError({
              code: "run_failed",
              message: "产物全部不是 output 类型（临时输出），没有可落位文件",
              details: { prompt_id: promptId },
            });
          }
          // 成功记录
          const info = opts.session.info();
          const rec: RunRecord = {
            run_id: opts.runId,
            task_id: opts.taskId,
            machine_id: opts.machineId,
            request_id: opts.requestId,
            label: opts.plan.label,
            workflow: { path: opts.plan.workflowRel, sha256: graphSha256(graph) },
            inputs: opts.plan.inputs,
            overrides: opts.plan.overrides,
            engine: {
              mode: info.mode,
              comfyui_version: info.comfyui_version,
              url: info.url,
              pid: info.pid,
              ready_ms: info.ready_ms,
              cleanup: null,
            },
            status: "succeeded",
            prompt_id: promptId,
            started_at: startedAt,
            finished_at: nowIso(),
            outputs: downloaded,
            error: null,
          };
          writeRun(opts.root, rec);
          opts.event("run_succeeded", {
            run_id: opts.runId,
            outputs: downloaded.map((o) => o.path),
          });
          opts.log(`run ${opts.runId} 完成：${downloaded.map((o) => o.path).join(", ")}`);
          return rec;
        }
      }
      if (Date.now() - lastBeat >= HEARTBEAT_MS) {
        opts.log(`run ${opts.runId} 进行中... 已 ${Math.round((Date.now() - startedMs) / 60_000)} 分钟`);
        opts.event("progress", { run_id: opts.runId, elapsed_ms: Date.now() - startedMs });
        lastBeat = Date.now();
      }
      try {
        await sleep(POLL_INTERVAL_MS, opts.signal);
      } catch {
        // 中断会在下一轮抛 RunCancelledError
      }
    }
  } catch (e) {
    // 取消是独立状态
    if (e instanceof RunCancelledError) {
      writeFailedRun({
        root: opts.root,
        runId: opts.runId,
        taskId: opts.taskId,
        machineId: opts.machineId,
        requestId: opts.requestId,
        plan: opts.plan,
        session: opts.session,
        startedAt,
        promptId,
        status: "cancelled",
        error: null,
      });
      throw e;
    }
    // 结构化错误
    const err = isDaoyanCliError(e)
      ? e
      : asCliError(e, submitted ? "run_failed" : "workflow_invalid");
    // 记录失败（message 去绝对路径）
    writeFailedRun({
      root: opts.root,
      runId: opts.runId,
      taskId: opts.taskId,
      machineId: opts.machineId,
      requestId: opts.requestId,
      plan: opts.plan,
      session: opts.session,
      startedAt,
      promptId,
      status: "failed",
      error: {
        code: err.code,
        message: sanitizeMessage(err.message, opts.root),
        ...(err.details !== undefined ? { details: sanitizeDetails(err.details, opts.root) as Record<string, unknown> } : {}),
      },
    });
    throw new DaoyanCliError({
      code: err.code,
      message: err.message,
      details: err.details,
      taskId: opts.taskId,
      runId: opts.runId,
    });
  }
}

/**
 * task 结束后回填 cleanup 与 GPU 恢复信息到 run.json。
 */
export function patchRunCleanup(opts: {
  root: string;
  runIds: string[];
  cleanup: RunRecord["engine"]["cleanup"];
  gpu?: RunRecord["gpu"];
  restored: string[];
}): void {
  // 首个 run 承载 gpu 段
  let first = true;
  for (const runId of opts.runIds) {
    // run.json 路径
    const file = join(opts.root, "runs", runId, "run.json");
    if (!existsSync(file)) continue;
    try {
      // 现有记录
      const rec = JSON.parse(readFileSync(file, "utf8")) as RunRecord;
      rec.engine.cleanup = opts.cleanup;
      if (opts.gpu !== undefined) {
        // 合并恢复结果
        const gpu = { ...opts.gpu, restored: opts.restored };
        if (first) rec.gpu = gpu;
        first = false;
      }
      // 原子回写
      writeRun(opts.root, rec);
    } catch {
      // run 记录损坏时不阻塞任务收尾
    }
  }
}
