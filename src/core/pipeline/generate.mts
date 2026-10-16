/** 生成管线 —— 首帧解析（锚点/接力/纯文生）、workflow 填充、提交轮询、断点续跑、manifest。
 *  首帧/接力规则：first_frame = "S1" → 复制锚点进引擎 input；
 *               = {"relay":"02"} → ffmpeg 抽上游尾帧到 relay_frames/（mtime 缓存）再入 input；
 *               = 缺省 → 纯文生（T2V）。
 *  上游成片缺失 → relay_upstream_missing（validate 阶段即应拦截）。 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { countFrames, extractLastFrame } from "../media/ffmpeg.mts";
import type { ComfyClient } from "../comfy/client.mts";
import { MANIFESTS_DIR, SHOTS_FILE, type ProjectConfig, type ShotSpec, type ShotsFile } from "../project/types.mts";

// 轮询引擎 /history 的间隔（15s）
const POLL_INTERVAL_MS = 15_000;
// 长任务的进度心跳间隔（60s）
const HEARTBEAT_MS = 60_000;
// 单镜等待上限（3 小时，--timeout 可覆盖）
const DEFAULT_TIMEOUT_MS = 3 * 60 * 60 * 1000;
// 判定为产物的视频扩展名（断点续跑 / 合片依据）
const VIDEO_RE = /\.(mp4|webm|mkv|mov|gif)$/i;

/**
 * 首帧解析结果（resolveFirstFrame 的返回）。
 */
export interface ResolvedFirstFrame {
  /**
   * 首帧形态：锚点 / 接力 / 纯文生。
   */
  kind: "anchor" | "relay" | "t2v";
  /**
   * 注入引擎 input 的文件名（kind=t2v 时缺省）
   */
  inputName?: string;
  /**
   * 来源说明（锚点 key 或上游镜号）
   */
  source?: string;
}

/**
 * 单镜生成结果（写入 manifest 并回给 shot 命令）。
 */
export interface GenerateResult {
  /**
   * 镜号。
   */
  shotId: string;
  /**
   * 产物绝对路径
   */
  output: string;
  /**
   * 生成耗时（秒）。
   */
  seconds: number;
  /**
   * 引擎 prompt id。
   */
  promptId: string;
}

/**
 * local 模式引擎输出目录；remote 模式不可见远端文件系统，返回 null。
 */
export function engineOutputDir(root: string, cfg: ProjectConfig): string | null {
  if (cfg.engine.mode !== "local") return null;
  return join(cfg.engine.comfyui_dir, "output");
}

/**
 * local 模式引擎 input 目录（remote 模式无本地文件系统，M2 前不支持）。
 */
function engineInputDir(cfg: ProjectConfig): string {
  if (cfg.engine.mode !== "local") {
    throw new DaoyanCliError({ code: "not_implemented", message: "remote 模式的首帧上传在 M2 交付" });
  }
  return join(cfg.engine.comfyui_dir, "input");
}

/**
 * 复制进引擎 input（目标不存在或比源旧才复制——mtime 缓存）。
 */
function ensureInputCopy(src: string, cfg: ProjectConfig, name: string): void {
  // 引擎 input 内的目标路径
  const dst = join(engineInputDir(cfg), name);
  mkdirSync(engineInputDir(cfg), { recursive: true });
  // 是否需要复制（目标缺失或比源旧）
  let need = true;
  if (existsSync(dst)) {
    try {
      need = statSync(dst).mtimeMs < statSync(src).mtimeMs;
    } catch {
      need = true;
    }
  }
  if (need) copyFileSync(src, dst);
}

/**
 * 递归收集目录下所有文件。
 */
function walkFiles(dir: string, acc: string[] = []): string[] {
  // 目录项列表（读失败按空处理）
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  // 递归收集目录内文件
  for (const e of entries) {
    // 当前目录项的完整路径
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else if (e.isFile()) acc.push(p);
  }
  return acc;
}

/**
 * 断点续跑判定：按输出前缀找该镜已有产物（最新 mtime）。
 */
export function findClip(root: string, cfg: ProjectConfig, shot: ShotSpec): string | null {
  // 引擎输出根目录（remote 模式为 null）
  const out = engineOutputDir(root, cfg);
  if (out === null) return null;
  // 输出前缀子目录
  const dir = join(out, cfg.output_prefix);
  if (!existsSync(dir)) return null;
  // 产物文件名前缀（镜号_短名）
  const namePrefix = `${shot.id}_${shot.slug}`;
  // 最新 mtime 的候选产物
  let best: { p: string; m: number } | null = null;
  // 在候选文件中找最新产物
  for (const f of walkFiles(dir)) {
    // 当前文件名
    const b = basename(f);
    if (!b.startsWith(namePrefix) || !VIDEO_RE.test(b)) continue;
    // 当前文件的修改时间
    const m = statSync(f).mtimeMs;
    if (best === null || m > best.m) best = { p: f, m };
  }
  return best?.p ?? null;
}

/**
 * 首帧解析三形态。
 */
export async function resolveFirstFrame(
  root: string,
  cfg: ProjectConfig,
  shots: ShotsFile,
  shot: ShotSpec,
  log: (m: string) => void,
): Promise<ResolvedFirstFrame> {
  // 镜头声明的首帧（缺省 = 纯文生）
  const ff = shot.first_frame;
  if (ff === undefined) {
    log(`镜 ${shot.id}：纯文生（T2V），无首帧注入`);
    return { kind: "t2v" };
  }
  if (typeof ff === "string") {
    // 锚点相对路径（未登记为 undefined）
    const rel = shots.meta.anchors[ff];
    if (rel === undefined) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `镜 ${shot.id} 的 first_frame 引用了未知锚点 key "${ff}"（meta.anchors 中不存在）`,
      });
    }
    // 锚点图片的绝对路径
    const src = join(root, rel);
    if (!existsSync(src)) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `锚点图片不存在：${src}`,
        details: { key: ff, path: src },
      });
    }
    // 注入引擎 input 时的文件名（锚点 key + 镜号 + 原扩展名）
    const inputName = `anchor_${ff}_${shot.id}${extOf(src)}`;
    ensureInputCopy(src, cfg, inputName);
    log(`镜 ${shot.id}：首帧注入（锚点 ${ff}）`);
    return { kind: "anchor", inputName, source: ff };
  }
  // 接力：抽上游尾帧作为首帧
  const upstream = shots.shots.find((s) => s.id === ff.relay);
  if (upstream === undefined) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `镜 ${shot.id} 接力的上游镜号 ${ff.relay} 不存在于分镜表`,
    });
  }
  // 上游成片（断点续跑同口径查找）
  const clip = findClip(root, cfg, upstream);
  if (clip === null) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `镜 ${shot.id} 接力的上游 ${upstream.id} 尚无成片，请先拍摄：daoyan shot ${upstream.id}`,
    });
  }
  // 接力帧缓存目录
  const relayDir = join(root, "relay_frames");
  mkdirSync(relayDir, { recursive: true });
  // 本对镜头的接力帧路径
  const relayPng = join(relayDir, `relay_${upstream.id}_to_${shot.id}.png`);
  // 是否需要重新抽帧（缓存缺失或比上游成片旧）
  let needExtract = true;
  if (existsSync(relayPng)) {
    try {
      needExtract = statSync(relayPng).mtimeMs < statSync(clip).mtimeMs;
    } catch {
      needExtract = true;
    }
  }
  if (needExtract) {
    log(`镜 ${shot.id}：抽取上游 ${upstream.id} 尾帧（接力）`);
    // 上游成片总帧数
    const n = await countFrames(clip);
    if (n < 1) throw new DaoyanCliError({ code: "shot_failed", message: `上游成片无帧：${clip}` });
    await extractLastFrame(clip, relayPng);
  } else {
    log(`镜 ${shot.id}：接力帧缓存命中（relay_frames/）`);
  }
  // 注入引擎 input 时的文件名
  const inputName = `relay_${upstream.id}_${shot.id}.png`;
  ensureInputCopy(relayPng, cfg, inputName);
  return { kind: "relay", inputName, source: upstream.id };
}

/**
 * 取路径的扩展名（无扩展名回退 .png）。
 */
function extOf(p: string): string {
  // 文件名
  const b = basename(p);
  // 最后一个点的位置
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i) : ".png";
}

/**
 * workflow 填充：模板节点键约定见 docs/DATA-MODEL.md。
 */
export function buildWorkflow(
  root: string,
  cfg: ProjectConfig,
  shots: ShotsFile,
  shot: ShotSpec,
  firstFrame?: ResolvedFirstFrame,
  stepsOverride?: number,
): Record<string, unknown> {
  // workflow 模板文件路径
  const tplFile = join(root, cfg.workflow);
  // 解析后的模板（就地修改后提交给引擎）
  let wf: Record<string, unknown>;
  try {
    wf = JSON.parse(readFileSync(tplFile, "utf8")) as Record<string, unknown>;
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `workflow 模板不可读：${tplFile}（${e instanceof Error ? e.message : String(e)}）`,
    });
  }
  // 取模板节点（缺失即报错）
  const node = (key: string): Record<string, unknown> => {
    // 该键对应的节点定义
    const n = wf[key];
    if (typeof n !== "object" || n === null) {
      throw new DaoyanCliError({
        code: "config_invalid",
        message: `workflow 模板缺少约定的节点键 "${key}"（命名约定见 docs/DATA-MODEL.md）`,
      });
    }
    return n as Record<string, unknown>;
  };

  // 取节点的 inputs 段（缺失即报错）
  const inputsOf = (n: Record<string, unknown>): Record<string, unknown> => {
    // 节点的 inputs 对象
    const i = n.inputs;
    if (typeof i !== "object" || i === null) {
      throw new DaoyanCliError({ code: "config_invalid", message: "workflow 节点缺少 inputs 对象" });
    }
    return i as Record<string, unknown>;
  };

  // 全片默认参数
  const d = shots.defaults;
  // 负向提示词节点
  const neg = inputsOf(node("4_negative"));
  neg.text = d.negative;

  // 正向条件节点
  const cond = inputsOf(node("5_cond"));
  cond.prompt = shots.style_prefix !== "" ? `${shots.style_prefix}。${shot.prompt}` : shot.prompt;
  cond.width = shots.meta.width;
  cond.height = shots.meta.height;
  cond.length = shot.length ?? d.length;
  if (firstFrame?.inputName !== undefined) {
    wf["0_load"] = { class_type: "LoadImage", inputs: { image: firstFrame.inputName } };
    cond.first_frame = ["0_load", 0];
  }

  // 偏移量节点
  const shift = inputsOf(node("6_shift"));
  shift.shift_video = d.shift_video;
  shift.shift_audio = d.shift_audio;

  // 采样节点
  const sample = inputsOf(node("7_sample"));
  sample.seed = shot.seed;
  sample.steps = stepsOverride ?? shot.steps ?? d.steps;
  sample.cfg = shot.cfg ?? d.cfg;
  sample.sampler_name = d.sampler_name;
  sample.scheduler = d.scheduler;

  // 保存节点
  const save = inputsOf(node("9_save"));
  save.filename_prefix = `${cfg.output_prefix}${shot.id}_${shot.slug}`;
  return wf;
}

/**
 * history 产物条目（引擎 outputs 里的单个文件项）。
 */
interface HistoryOutputItem {
  /**
   * 产物文件名。
   */
  filename?: string;
  /**
   * 产物子目录（相对输出根）。
   */
  subfolder?: string;
}

/**
 * 从 history entry 收集产物（含 subfolder，避免产物路径丢子目录）。
 */
function collectOutputs(
  entryOutputs: Record<string, Record<string, unknown>>,
): Array<{ filename: string; subfolder: string }> {
  // 收集到的产物列表
  const files: Array<{ filename: string; subfolder: string }> = [];
  // 逐节点扫描产物
  for (const nodeOutputs of Object.values(entryOutputs)) {
    // 只收 videos / gifs / images 三类
    for (const [k, v] of Object.entries(nodeOutputs)) {
      if (k !== "videos" && k !== "gifs" && k !== "images") continue;
      if (!Array.isArray(v)) continue;
      // 逐条收集文件名
      for (const item of v) {
        // 当前条目的宽松视图
        const it = item as HistoryOutputItem;
        if (typeof it?.filename === "string" && it.filename !== "") {
          files.push({ filename: it.filename, subfolder: it.subfolder ?? "" });
        }
      }
    }
  }
  return files;
}

/**
 * generateShot 的调用参数。
 */
export interface GenerateOptions {
  /**
   * 项目根目录。
   */
  root: string;
  /**
   * 项目配置。
   */
  cfg: ProjectConfig;
  /**
   * 分镜表。
   */
  shots: ShotsFile;
  /**
   * 目标镜头。
   */
  shot: ShotSpec;
  /**
   * 引擎客户端。
   */
  client: ComfyClient;
  /**
   * 日志回调（stdout + 单镜日志文件）。
   */
  log: (m: string) => void;
  /**
   * 已解析的首帧（可空 = 纯文生）。
   */
  firstFrame?: ResolvedFirstFrame;
  /**
   * 覆盖采样步数。
   */
  stepsOverride?: number;
  /**
   * 等待超时（毫秒；缺省 DEFAULT_TIMEOUT_MS）。
   */
  timeoutMs?: number;
}

/**
 * 单镜生成：提交 → 15s 轮询 /history → 产物落位 → manifest。
 */
export async function generateShot(opts: GenerateOptions): Promise<GenerateResult> {
  // 解构常用参数
  const { root, cfg, shots, shot, client, log } = opts;
  // 填充完成的 workflow
  const wf = buildWorkflow(root, cfg, shots, shot, opts.firstFrame, opts.stepsOverride);
  // 生成起始时间（耗时统计基准）
  const started = new Date();
  // 引擎受理回执
  const receipt = await client.submit(wf);
  if (receipt.node_errors !== undefined && Object.keys(receipt.node_errors).length > 0) {
    throw new DaoyanCliError({
      code: "shot_failed",
      message: "引擎拒绝 workflow（node_errors），见 details",
      details: { node_errors: receipt.node_errors },
    });
  }
  // 本次执行的 prompt id
  const pid = receipt.prompt_id;
  log(`镜 ${shot.id} 已提交（prompt ${pid.slice(0, 8)}…），轮询中...`);

  // 等待上限（参数优先）
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // 超时截止时间戳
  const deadline = Date.now() + timeout;
  // 上次心跳输出时间
  let lastBeat = Date.now();
  for (;;) {
    if (Date.now() > deadline) {
      throw new DaoyanCliError({
        code: "shot_timeout",
        message: `镜 ${shot.id} 等待超时（${Math.round(timeout / 60000)} 分钟）`,
        details: { prompt_id: pid },
      });
    }
    // 本次轮询查到的 history 记录
    let entry;
    try {
      // 引擎 history 响应（按 prompt id）
      const hist = await client.history(pid);
      entry = hist[pid];
    } catch {
      entry = undefined;
    }
    if (entry !== undefined) {
      // 引擎终态字符串
      const statusStr = entry.status?.status_str;
      if (statusStr === "error" || statusStr === "cancelled") {
        throw new DaoyanCliError({
          code: "shot_failed",
          message: `镜 ${shot.id} 生成失败（引擎 ${statusStr}）`,
          details: { status: entry.status ?? {} },
        });
      }
      // 节点产物表
      const outputs = entry.outputs ?? {};
      if ((entry.status?.completed ?? false) || Object.keys(outputs).length > 0) {
        // 全部产物条目
        const files = collectOutputs(outputs);
        // 取第一条作为交付产物
        const first = files[0];
        if (first === undefined) {
          throw new DaoyanCliError({
            code: "shot_failed",
            message: `镜 ${shot.id}：history 标记完成但没有输出文件（prompt ${pid.slice(0, 8)}…）`,
          });
        }
        // 引擎输出根目录
        const outDir = engineOutputDir(root, cfg);
        if (outDir === null) {
          throw new DaoyanCliError({ code: "not_implemented", message: "remote 模式产物落位在 M2 交付" });
        }
        // 产物绝对路径（含 subfolder）
        const output = join(outDir, first.subfolder, first.filename);
        // 生成耗时（秒）
        const seconds = Math.round((Date.now() - started.getTime()) / 1000);
        writeManifest(root, cfg, shots, shot, wf, { pid, output, started, seconds });
        return { shotId: shot.id, output, seconds, promptId: pid };
      }
    }
    if (Date.now() - lastBeat >= HEARTBEAT_MS) {
      // 已等待分钟数
      const min = Math.round((Date.now() - started.getTime()) / 60000);
      log(`镜 ${shot.id} 进行中... 已 ${min} 分钟`);
      lastBeat = Date.now();
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

/**
 * 落盘单镜 manifest（可复现快照：输入哈希 / seed / 模型 / 耗时 / 产物路径）。
 */
function writeManifest(
  root: string,
  cfg: ProjectConfig,
  shots: ShotsFile,
  shot: ShotSpec,
  wf: Record<string, unknown>,
  meta: { pid: string; output: string; started: Date; seconds: number },
): void {
  // manifests 目录（不存在则建）
  const dir = join(root, MANIFESTS_DIR);
  mkdirSync(dir, { recursive: true });
  // 分镜表内容哈希（空串 = 读取失败）
  let shotsHash = "";
  try {
    shotsHash = sha256File(join(root, SHOTS_FILE));
  } catch {
    shotsHash = "";
  }
  // manifest 记录体
  const manifest = {
    shot: shot.id,
    prompt_id: meta.pid,
    shots_hash: shotsHash,
    workflow_hash: sha256(JSON.stringify(wf)),
    seed: shot.seed,
    steps: shot.steps ?? shots.defaults.steps,
    models: cfg.models,
    engine: {
      mode: cfg.engine.mode,
      version: cfg.engine.mode === "local" ? cfg.engine.version ?? null : null,
      base: cfg.engine.url ?? `${cfg.engine.host}:${cfg.engine.port}`,
    },
    started: meta.started.toISOString(),
    seconds: meta.seconds,
    output: meta.output,
  };
  writeFileSync(join(dir, `${shot.id}.json`), JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * 字符串的 sha256 十六进制摘要。
 */
function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/**
 * 文件内容的 sha256 十六进制摘要。
 */
function sha256File(f: string): string {
  return createHash("sha256").update(readFileSync(f)).digest("hex");
}
