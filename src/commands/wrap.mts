/** wrap —— 杀青合片：按分镜表顺序收集已完成的镜头产物，
 *  ffmpeg concat（libx264 / yuv420p / crf18 / faststart）交付到 final/。 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say, attachFileSink } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { loadShotsFile, projectFromContext } from "../core/project/config.mts";
import { LOG_DIR, TOOL_LOG_FILE } from "../core/project/types.mts";
import { findClip } from "../core/pipeline/generate.mts";
import { execCapture } from "../shared/exec.mts";

/**
 * wrap 命令入口：收集产物 → ffmpeg concat 合片 → 交付 final/。
 */
export async function runWrap(ctx: CliContext): Promise<void> {
  // 项目定位结果
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json；用 --project 指定或在项目目录内运行" });
  }
  // 项目根与配置
  const { root, config: cfg } = found;
  attachFileSink(join(root, LOG_DIR, TOOL_LOG_FILE));
  // 分镜表（决定合片顺序）
  const shots = loadShotsFile(root);

  if (cfg.engine.mode === "remote") {
    throw new DaoyanCliError({ code: "not_implemented", message: "remote 模式的产物拉取在 M2 交付，wrap 暂仅支持 local 模式" });
  }

  // 按分镜顺序收集到的成片路径
  const clips: string[] = [];
  // 尚无成片的镜号
  const missing: string[] = [];
  // 逐镜收集产物
  for (const s of shots.shots) {
    // 该镜已有产物（无则 null）
    const p = findClip(root, cfg, s);
    if (p !== null) clips.push(p);
    else missing.push(s.id);
  }
  if (clips.length < 2) {
    throw new DaoyanCliError({
      code: "wrap_failed",
      message: `可用于合片的镜头不足 2 段（当前 ${clips.length}/${shots.shots.length}；缺 ${missing.join(" ") || "无"}）。先完成拍摄：daoyan batch/shot`,
    });
  }

  // 交付目录
  const finalDir = join(root, "final");
  mkdirSync(finalDir, { recursive: true });
  // 输出文件名前缀（去尾斜杠，空则 drama）
  const prefixName = cfg.output_prefix.replace(/\/+$/, "") || "drama";
  // 成片输出路径
  const outPath = join(finalDir, `${prefixName}.mp4`);

  // concat list：单引号按 ffmpeg concat demuxer 约定转义
  const listFile = join(root, "concat_list.txt");
  writeFileSync(listFile, clips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n");

  say(`合片 ${clips.length} 段 → ${outPath}（libx264 / crf18 / faststart）...`);
  // ffmpeg 合片结果
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
    });
  }
  if (missing.length > 0) say(`注意：有 ${missing.length} 镜未完成未纳入（${missing.join(" ")}）`);
  say(`合片完成：${outPath}`);

  if (ctx.json) {
    emitData({ output: outPath, clips, missing });
  }
}
