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
import type { ProjectConfig, ShotSpec, ShotsFile } from "../project/types.mts";

const POLL_INTERVAL_MS = 15_000;
const HEARTBEAT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 3 * 60 * 60 * 1000;
const VIDEO_RE = /\.(mp4|webm|mkv|mov|gif)$/i;

export interface ResolvedFirstFrame {
  kind: "anchor" | "relay" | "t2v";
  /** 注入引擎 input 的文件名（kind=t2v 时缺省） */
  inputName?: string;
  /** 来源说明（锚点 key 或上游镜号） */
  source?: string;
}

export interface GenerateResult {
  shotId: string;
  /** 产物绝对路径 */
  output: string;
  seconds: number;
  promptId: string;
}

/** local 模式引擎输出目录；remote 模式不可见远端文件系统，返回 null。 */
export function engineOutputDir(root: string, cfg: ProjectConfig): string | null {
  if (cfg.engine.mode !== "local") return null;
  return join(cfg.engine.comfyui_dir, "output");
}

function engineInputDir(cfg: ProjectConfig): string {
  if (cfg.engine.mode !== "local") {
    throw new DaoyanCliError({ code: "not_implemented", message: "remote 模式的首帧上传在 M2 交付" });
  }
  return join(cfg.engine.comfyui_dir, "input");
}

/** 复制进引擎 input（目标不存在或比源旧才复制——mtime 缓存）。 */
function ensureInputCopy(src: string, cfg: ProjectConfig, name: string): void {
  const dst = join(engineInputDir(cfg), name);
  mkdirSync(engineInputDir(cfg), { recursive: true });
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

/** 递归收集目录下所有文件。 */
function walkFiles(dir: string, acc: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else if (e.isFile()) acc.push(p);
  }
  return acc;
}

/** 断点续跑判定：按输出前缀找该镜已有产物（最新 mtime）。 */
export function findClip(root: string, cfg: ProjectConfig, shot: ShotSpec): string | null {
  const out = engineOutputDir(root, cfg);
  if (out === null) return null;
  const dir = join(out, cfg.output_prefix);
  if (!existsSync(dir)) return null;
  const namePrefix = `${shot.id}_${shot.slug}`;
  let best: { p: string; m: number } | null = null;
  for (const f of walkFiles(dir)) {
    const b = basename(f);
    if (!b.startsWith(namePrefix) || !VIDEO_RE.test(b)) continue;
    const m = statSync(f).mtimeMs;
    if (best === null || m > best.m) best = { p: f, m };
  }
  return best?.p ?? null;
}

/** 首帧解析三形态。 */
export async function resolveFirstFrame(
  root: string,
  cfg: ProjectConfig,
  shots: ShotsFile,
  shot: ShotSpec,
  log: (m: string) => void,
): Promise<ResolvedFirstFrame> {
  const ff = shot.first_frame;
  if (ff === undefined) {
    log(`镜 ${shot.id}：纯文生（T2V），无首帧注入`);
    return { kind: "t2v" };
  }
  if (typeof ff === "string") {
    const rel = shots.meta.anchors[ff];
    if (rel === undefined) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `镜 ${shot.id} 的 first_frame 引用了未知锚点 key "${ff}"（meta.anchors 中不存在）`,
      });
    }
    const src = join(root, rel);
    if (!existsSync(src)) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `锚点图片不存在：${src}`,
        details: { key: ff, path: src },
      });
    }
    const inputName = `anchor_${ff}_${shot.id}${extOf(src)}`;
    ensureInputCopy(src, cfg, inputName);
    log(`镜 ${shot.id}：首帧注入（锚点 ${ff}）`);
    return { kind: "anchor", inputName, source: ff };
  }
  // relay
  const upstream = shots.shots.find((s) => s.id === ff.relay);
  if (upstream === undefined) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `镜 ${shot.id} 接力的上游镜号 ${ff.relay} 不存在于分镜表`,
    });
  }
  const clip = findClip(root, cfg, upstream);
  if (clip === null) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `镜 ${shot.id} 接力的上游 ${upstream.id} 尚无成片，请先拍摄：daoyan-cli shot ${upstream.id}`,
    });
  }
  const relayDir = join(root, "relay_frames");
  mkdirSync(relayDir, { recursive: true });
  const relayPng = join(relayDir, `relay_${upstream.id}_to_${shot.id}.png`);
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
    const n = await countFrames(clip);
    if (n < 1) throw new DaoyanCliError({ code: "shot_failed", message: `上游成片无帧：${clip}` });
    await extractLastFrame(clip, relayPng);
  } else {
    log(`镜 ${shot.id}：接力帧缓存命中（relay_frames/）`);
  }
  const inputName = `relay_${upstream.id}_${shot.id}.png`;
  ensureInputCopy(relayPng, cfg, inputName);
  return { kind: "relay", inputName, source: upstream.id };
}

function extOf(p: string): string {
  const b = basename(p);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i) : ".png";
}

/** workflow 填充：模板节点键约定见 docs/DATA-MODEL.md。 */
export function buildWorkflow(
  root: string,
  cfg: ProjectConfig,
  shots: ShotsFile,
  shot: ShotSpec,
  firstFrame?: ResolvedFirstFrame,
  stepsOverride?: number,
): Record<string, unknown> {
  const tplFile = join(root, cfg.workflow);
  let wf: Record<string, unknown>;
  try {
    wf = JSON.parse(readFileSync(tplFile, "utf8")) as Record<string, unknown>;
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `workflow 模板不可读：${tplFile}（${e instanceof Error ? e.message : String(e)}）`,
    });
  }
  const node = (key: string): Record<string, unknown> => {
    const n = wf[key];
    if (typeof n !== "object" || n === null) {
      throw new DaoyanCliError({
        code: "config_invalid",
        message: `workflow 模板缺少约定的节点键 "${key}"（命名约定见 docs/DATA-MODEL.md）`,
      });
    }
    return n as Record<string, unknown>;
  };
  const inputsOf = (n: Record<string, unknown>): Record<string, unknown> => {
    const i = n.inputs;
    if (typeof i !== "object" || i === null) {
      throw new DaoyanCliError({ code: "config_invalid", message: "workflow 节点缺少 inputs 对象" });
    }
    return i as Record<string, unknown>;
  };

  const d = shots.defaults;
  const neg = inputsOf(node("4_negative"));
  neg.text = d.negative;

  const cond = inputsOf(node("5_cond"));
  cond.prompt = shots.style_prefix !== "" ? `${shots.style_prefix}。${shot.prompt}` : shot.prompt;
  cond.width = shots.meta.width;
  cond.height = shots.meta.height;
  cond.length = shot.length ?? d.length;
  if (firstFrame?.inputName !== undefined) {
    wf["0_load"] = { class_type: "LoadImage", inputs: { image: firstFrame.inputName } };
    cond.first_frame = ["0_load", 0];
  }

  const shift = inputsOf(node("6_shift"));
  shift.shift_video = d.shift_video;
  shift.shift_audio = d.shift_audio;

  const sample = inputsOf(node("7_sample"));
  sample.seed = shot.seed;
  sample.steps = stepsOverride ?? shot.steps ?? d.steps;
  sample.cfg = shot.cfg ?? d.cfg;
  sample.sampler_name = d.sampler_name;
  sample.scheduler = d.scheduler;

  const save = inputsOf(node("9_save"));
  save.filename_prefix = `${cfg.output_prefix}${shot.id}_${shot.slug}`;
  return wf;
}

interface HistoryOutputItem {
  filename?: string;
  subfolder?: string;
}

/** 从 history entry 收集产物（含 subfolder，避免产物路径丢子目录）。 */
function collectOutputs(
  entryOutputs: Record<string, Record<string, unknown>>,
): Array<{ filename: string; subfolder: string }> {
  const files: Array<{ filename: string; subfolder: string }> = [];
  for (const nodeOutputs of Object.values(entryOutputs)) {
    for (const [k, v] of Object.entries(nodeOutputs)) {
      if (k !== "videos" && k !== "gifs" && k !== "images") continue;
      if (!Array.isArray(v)) continue;
      for (const item of v) {
        const it = item as HistoryOutputItem;
        if (typeof it?.filename === "string" && it.filename !== "") {
          files.push({ filename: it.filename, subfolder: it.subfolder ?? "" });
        }
      }
    }
  }
  return files;
}

export interface GenerateOptions {
  root: string;
  cfg: ProjectConfig;
  shots: ShotsFile;
  shot: ShotSpec;
  client: ComfyClient;
  log: (m: string) => void;
  firstFrame?: ResolvedFirstFrame;
  stepsOverride?: number;
  timeoutMs?: number;
}

/** 单镜生成：提交 → 15s 轮询 /history → 产物落位 → manifest。 */
export async function generateShot(opts: GenerateOptions): Promise<GenerateResult> {
  const { root, cfg, shots, shot, client, log } = opts;
  const wf = buildWorkflow(root, cfg, shots, shot, opts.firstFrame, opts.stepsOverride);
  const started = new Date();
  const receipt = await client.submit(wf);
  if (receipt.node_errors !== undefined && Object.keys(receipt.node_errors).length > 0) {
    throw new DaoyanCliError({
      code: "shot_failed",
      message: "引擎拒绝 workflow（node_errors），见 details",
      details: { node_errors: receipt.node_errors },
    });
  }
  const pid = receipt.prompt_id;
  log(`镜 ${shot.id} 已提交（prompt ${pid.slice(0, 8)}…），轮询中...`);

  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeout;
  let lastBeat = Date.now();
  for (;;) {
    if (Date.now() > deadline) {
      throw new DaoyanCliError({
        code: "shot_timeout",
        message: `镜 ${shot.id} 等待超时（${Math.round(timeout / 60000)} 分钟）`,
        details: { prompt_id: pid },
      });
    }
    let entry;
    try {
      const hist = await client.history(pid);
      entry = hist[pid];
    } catch {
      entry = undefined;
    }
    if (entry !== undefined) {
      const statusStr = entry.status?.status_str;
      if (statusStr === "error" || statusStr === "cancelled") {
        throw new DaoyanCliError({
          code: "shot_failed",
          message: `镜 ${shot.id} 生成失败（引擎 ${statusStr}）`,
          details: { status: entry.status ?? {} },
        });
      }
      const outputs = entry.outputs ?? {};
      if ((entry.status?.completed ?? false) || Object.keys(outputs).length > 0) {
        const files = collectOutputs(outputs);
        const first = files[0];
        if (first === undefined) {
          throw new DaoyanCliError({
            code: "shot_failed",
            message: `镜 ${shot.id}：history 标记完成但没有输出文件（prompt ${pid.slice(0, 8)}…）`,
          });
        }
        const outDir = engineOutputDir(root, cfg);
        if (outDir === null) {
          throw new DaoyanCliError({ code: "not_implemented", message: "remote 模式产物落位在 M2 交付" });
        }
        const output = join(outDir, first.subfolder, first.filename);
        const seconds = Math.round((Date.now() - started.getTime()) / 1000);
        writeManifest(root, cfg, shots, shot, wf, { pid, output, started, seconds });
        return { shotId: shot.id, output, seconds, promptId: pid };
      }
    }
    if (Date.now() - lastBeat >= HEARTBEAT_MS) {
      const min = Math.round((Date.now() - started.getTime()) / 60000);
      log(`镜 ${shot.id} 进行中... 已 ${min} 分钟`);
      lastBeat = Date.now();
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

function writeManifest(
  root: string,
  cfg: ProjectConfig,
  shots: ShotsFile,
  shot: ShotSpec,
  wf: Record<string, unknown>,
  meta: { pid: string; output: string; started: Date; seconds: number },
): void {
  const dir = join(root, "manifests");
  mkdirSync(dir, { recursive: true });
  let shotsHash = "";
  try {
    shotsHash = sha256File(join(root, "shots.json"));
  } catch {
    shotsHash = "";
  }
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

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function sha256File(f: string): string {
  return createHash("sha256").update(readFileSync(f)).digest("hex");
}
