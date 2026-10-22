/** wrap —— 杀青合片：按分镜顺序从定稿台账选取稿件，ffmpeg concat 交付 final/。
 *  未定稿镜头按 project.story.enforce 决定阻断或回退最新成功 run；
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
import { requireProject } from "../core/project/config.mts";
import { CONCAT_LIST_FILE, type RunOutput, type RunRecord } from "../core/project/types.mts";
import { listRuns, pickPrimaryOutput, requireRun, runOutputAbs } from "../core/run/store.mts";
import { resolveEpisodeContext } from "../core/story/paths.mts";
import { loadContextShots, storyEnforceOf } from "../core/story/production.mts";
import { pickShotTake, takesRelPath } from "../core/story/takes.mts";

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
    /**
     * 稿件来源：定稿稿件 / 回退最新成功 run / 本次 --select。
     */
    source: "finalized" | "latest" | "explicit";
}

/**
 * 从 run 中选视频产物（运行时补绝对路径）。
 */
function pickVideoAt(root: string, rec: RunRecord): { path: string; abs: string } | null {
    // 主产物
    const chosen: RunOutput | null = pickPrimaryOutput(rec);
    if (chosen === null) return null;
    return { path: chosen.path, abs: runOutputAbs(root, rec, chosen) };
}

/**
 * wrap 命令入口。
 */
export async function runWrap(ctx: CliContext, args: string[]): Promise<number> {
    // --select 镜号=run_id
    const explicit = new Map<string, string>();
    // --episode
    let episode: string | undefined;
    // 是否显式绕过定稿门禁
    let allowIncomplete = false;
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
        if (name === "--episode") {
            // --episode 取值
            const v = takeValue(args, i, inline, "--episode");
            episode = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--allow-incomplete") {
            allowIncomplete = true;
            continue;
        }
        usageError(`未知参数 ${name}`);
    }

    const { root, config: project } = requireProject(ctx);
    // 剧集上下文
    const context = resolveEpisodeContext(root, episode);
    // 本集分镜
    const shots = loadContextShots(root, context);
    // 候选 run 池（一次读取，逐镜复用）
    const pool = listRuns(root);
    // 定稿门禁是否为 strict
    const strict = storyEnforceOf(project) === "strict";
    // 选中片段
    const clips: SelectedClip[] = [];
    // 无任何可用产出的镜号
    const missing: string[] = [];
    // 有产出但未定稿的镜号
    const unfinalized: string[] = [];
    // 回退警告
    const warnings: Array<{ shot: string; code: string; message: string }> = [];
    for (const shot of shots.shots) {
        // 显式选择或定稿稿件
        const explicitId = explicit.get(shot.id);
        let rec: RunRecord | null = null;
        let pick: { path: string; abs: string } | null = null;
        // 稿件来源
        let source: SelectedClip["source"] = "explicit";
        if (explicitId !== undefined) {
            rec = requireRun(root, explicitId);
            if (rec.status !== "succeeded") {
                throw new DaoyanCliError({
                    code: "wrap_failed",
                    message: `--select ${shot.id}=${explicitId} 的 run 不是 succeeded（${rec.status}）`,
                });
            }
            if (context.episode_id !== null && rec.episode_id !== context.episode_id) {
                throw new DaoyanCliError({
                    code: "wrap_failed",
                    message: `--select ${shot.id}=${explicitId} 的 run 属于 ${String(rec.episode_id ?? "未归属")}，不是 ${context.episode_id}`,
                });
            }
            pick = pickVideoAt(root, rec);
            source = "explicit";
        } else {
            // 本镜选稿（定稿优先）
            const take = pickShotTake(root, context, shot.id, pool);
            if (take.source === "none") {
                missing.push(shot.id);
                continue;
            }
            if (take.source === "latest") {
                if (strict && !allowIncomplete) {
                    unfinalized.push(shot.id);
                    continue;
                }
                warnings.push({
                    shot: shot.id,
                    code: take.stale !== null ? "take_stale" : "take_pending",
                    message:
                        take.stale !== null
                            ? `镜 ${shot.id} 定稿记录已失效（${take.stale.message}），回退最新成功 run`
                            : `镜 ${shot.id} 未定稿，回退最新成功 run ${String(take.run?.run_id ?? "")}`,
                });
            }
            rec = take.run;
            // 定稿稿件按记录文件名取，避免误选同 run 的其他产物
            if (rec !== null && take.output !== null) {
                pick = { path: take.output.path, abs: runOutputAbs(root, rec, take.output) };
            }
            source = take.source;
        }
        if (rec === null || pick === null) {
            missing.push(shot.id);
            continue;
        }
        if (!existsSync(pick.abs)) {
            missing.push(shot.id);
            continue;
        }
        clips.push({ shot: shot.id, run_id: rec.run_id, artifact: pick.path, abs: pick.abs, source });
    }

    if (unfinalized.length > 0) {
        throw new DaoyanCliError({
            code: "take_pending",
            message: `合片门禁：${unfinalized.length} 个镜头有产出但未定稿（${unfinalized.join(" ")}）`,
            details: { shots: unfinalized, episode_id: context.episode_id, takes_file: takesRelPath(root, context) },
            nextActions: [
                `take list ${unfinalized.join(" ")} --json`,
                ...unfinalized.map((id) => `take finalize ${id} --run <run_id> --json`),
            ],
        });
    }

    if (clips.length < 2) {
        throw new DaoyanCliError({
            code: "wrap_failed",
            message: `可用于合片的镜头不足 2 段（当前 ${clips.length}/${shots.shots.length}；缺 ${missing.join(" ") || "无"}）`,
            details: { clips, missing },
        });
    }

    // 交付目录
    const finalDir = context.final_dir;
    mkdirSync(finalDir, { recursive: true });
    // 时间戳（含毫秒，避免同秒覆盖）
    const ts = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.(\d{3})Z$/, "$1");
    // 成片路径
    const outName = `cut-${ts}.mp4`;
    const outPath = join(finalDir, outName);
    const manifestName = `cut-${ts}.json`;
    const manifestPath = join(finalDir, manifestName);

    // concat list
    const listFile = join(root, CONCAT_LIST_FILE);
    writeFileSync(listFile, clips.map((c) => `file '${c.abs.replace(/'/g, "'\\''")}'`).join("\n") + "\n");

    say(`合片 ${clips.length} 段 → ${context.final_rel}/${outName}（libx264 / crf18 / faststart）...`);
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
        episode_id: context.episode_id,
        created_at: new Date().toISOString(),
        clips: clips.map((c) => ({
            shot: c.shot,
            run_id: c.run_id,
            artifact: c.artifact,
            source: c.source,
        })),
        missing,
        warnings,
        ffmpeg: { codec: "libx264", crf: 18, pix_fmt: "yuv420p", faststart: true },
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const data = {
        episode_id: context.episode_id,
        output: `${context.final_rel}/${outName}`,
        abs_path: outPath,
        manifest: `${context.final_rel}/${manifestName}`,
        sha256: sha256File(outPath),
        clips: clips.map((c) => ({ shot: c.shot, run_id: c.run_id, artifact: c.artifact, source: c.source })),
        missing,
        warnings,
    };
    if (ctx.json) {
        emitData(data);
        return 0;
    }
    if (missing.length > 0) say(`注意：${missing.length} 镜未完成未纳入（${missing.join(" ")}）`);
    for (const w of warnings) say(`注意：${w.message}`);
    say(`合片完成：${context.final_rel}/${outName}`);
    say(`清单：${context.final_rel}/${manifestName}`);
    return 0;
}
