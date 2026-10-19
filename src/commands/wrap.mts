/** wrap —— 杀青合片：按分镜顺序从 runs 选取成功产物，ffmpeg concat 交付 final/。
 *  CPU 后处理，不占 machine lock；重拍不覆盖（cut-<timestamp>.mp4 + manifest）。 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { sha256File } from "../shared/fs.mts";
import { execCapture } from "../shared/exec.mts";
import { loadShotsFile, requireProject } from "../core/project/config.mts";
import {
  CONCAT_LIST_FILE,
  FINAL_DIR,
  type RunRecord,
} from "../core/project/types.mts";
import { latestSucceededRun, requireRun, runOutputAbs } from "../core/run/store.mts";

/**
 * 选中的片段。
 */
interface SelectedClip {
  /**
   * 镜号。
   */
  shot: string;
  /**
   * 选中的 run。
   */
  run_id: string;
  /**
   * 产物相对 run 目录的路径。
   */
  artifact: string;
  /**
   * 运行时绝对路径。
   */
  abs: string;
}

/**
 * 从 run 中选视频产物（运行时补绝对路径）。
 */
function pickVideoAt(root: string, rec: RunRecord): { path: string; abs: string } | null {
  const chosen = rec.outputs.find((o) => /\.(mp4|webm|mkv|mov|gif)$/i.test(o.name)) ?? rec.outputs[0];
  if (chosen === undefined) return null;
  return { path: chosen.path, abs: runOutputAbs(root, rec, chosen) };
}

/**
 * wrap 命令入口。
 */
export async function runWrap(ctx: CliContext, args: string[]): Promise<number> {
  // --select 镜号=run_id
  const explicit = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const { name, inline } = splitInlineFlag(args[i] ?? "");
    if (name === "--select") {
      const v = takeValue(args, i, inline, "--select");
      const eq = v.value.indexOf("=");
      if (eq <= 0) usageError(`--select 需要 <镜号>=<run_id>（收到 ${v.value}）`);
      explicit.set(v.value.slice(0, eq), v.value.slice(eq + 1));
      i += v.skip;
      continue;
    }
    usageError(`未知参数 ${name}`);
  }

  const { root } = requireProject(ctx);
  const shots = loadShotsFile(root);
  // 选中片段
  const clips: SelectedClip[] = [];
  // 缺失镜号
  const missing: string[] = [];
  for (const shot of shots.shots) {
    // 显式选择或最新成功 run
    const explicitId = explicit.get(shot.id);
    let rec: RunRecord | null;
    if (explicitId !== undefined) {
      rec = requireRun(root, explicitId);
      if (rec.status !== "succeeded") {
        throw new DaoyanCliError({
          code: "wrap_failed",
          message: `--select ${shot.id}=${explicitId} 的 run 不是 succeeded（${rec.status}）`,
        });
      }
    } else {
      rec = latestSucceededRun(root, `shot:${shot.id}`);
    }
    if (rec === null) {
      missing.push(shot.id);
      continue;
    }
    // 视频产物
    const pick = pickVideoAt(root, rec);
    if (pick === null || !existsSync(pick.abs)) {
      missing.push(shot.id);
      continue;
    }
    clips.push({ shot: shot.id, run_id: rec.run_id, artifact: pick.path, abs: pick.abs });
  }

  if (clips.length < 2) {
    throw new DaoyanCliError({
      code: "wrap_failed",
      message: `可用于合片的镜头不足 2 段（当前 ${clips.length}/${shots.shots.length}；缺 ${missing.join(" ") || "无"}）`,
      details: { clips, missing },
    });
  }

  // 交付目录
  const finalDir = join(root, FINAL_DIR);
  mkdirSync(finalDir, { recursive: true });
  // 时间戳（含毫秒，避免同秒覆盖）
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\.(\d{3})Z$/, "$1");
  // 成片路径
  const outName = `cut-${ts}.mp4`;
  const outPath = join(finalDir, outName);
  const manifestName = `cut-${ts}.json`;
  const manifestPath = join(finalDir, manifestName);

  // concat list
  const listFile = join(root, CONCAT_LIST_FILE);
  writeFileSync(
    listFile,
    clips.map((c) => `file '${c.abs.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );

  say(`合片 ${clips.length} 段 → final/${outName}（libx264 / crf18 / faststart）...`);
  // ffmpeg 合片
  const r = await execCapture("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    outPath,
  ]);
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "wrap_failed",
      message: `ffmpeg 退出码 ${r.code}：${r.stderr.slice(-500)}`,
      details: { clips },
    });
  }

  // cut manifest
  const manifest = {
    cut: outName,
    created_at: new Date().toISOString(),
    clips: clips.map((c) => ({
      shot: c.shot,
      run_id: c.run_id,
      artifact: c.artifact,
    })),
    missing,
    ffmpeg: { codec: "libx264", crf: 18, pix_fmt: "yuv420p", faststart: true },
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  const data = {
    output: `${FINAL_DIR}/${outName}`,
    abs_path: outPath,
    manifest: `${FINAL_DIR}/${manifestName}`,
    sha256: sha256File(outPath),
    clips: clips.map((c) => ({ shot: c.shot, run_id: c.run_id, artifact: c.artifact })),
    missing,
  };
  if (ctx.json) {
    emitData(data);
    return 0;
  }
  if (missing.length > 0) say(`注意：${missing.length} 镜未完成未纳入（${missing.join(" ")}）`);
  say(`合片完成：final/${outName}`);
  say(`清单：final/${manifestName}`);
  return 0;
}
