/** 合片 —— 从定稿台账 / 显式选稿取片段，按分镜顺序 ffmpeg concat 交付 final/。
 *  全量模式沿用 wrap 的 strict / warn 语义；subset 模式只接受选中镜头的定稿稿件。 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { sha256File } from "../../shared/fs.mts";
import { execCapture } from "../../shared/exec.mts";
import { CONCAT_LIST_FILE, type ProjectConfig, type RunOutput, type RunRecord } from "../project/types.mts";
import { listRuns, pickPrimaryOutput, requireRun, runOutputAbs } from "../run/store.mts";
import { loadContextShots, storyEnforceOf } from "./production.mts";
import { pickShotTake, takesRelPath } from "./takes.mts";
import type { EpisodeContext } from "./types.mts";

/**
 * 选中的片段。
 */
export interface SelectedClip {
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
     * 稿件来源：定稿稿件 / 回退最新成功 run / 本次显式选择。
     */
    source: "finalized" | "latest" | "explicit";
}

/**
 * 合片参数。
 */
export interface BuildFinalOptions {
    /**
     * 项目根。
     */
    root: string;
    /**
     * 项目配置。
     */
    project: ProjectConfig;
    /**
     * 剧集上下文。
     */
    context: EpisodeContext;
    /**
     * 只合这些镜号；省略表示整集。
     */
    shots?: readonly string[];
    /**
     * 显式选稿：镜号 -> run_id。
     */
    selects?: ReadonlyMap<string, string>;
    /**
     * 绕过 strict 定稿门禁（仅全量模式）。
     */
    allowIncomplete?: boolean;
    /**
     * 进度日志。
     */
    log?: (message: string) => void;
}

/**
 * 合片结果。
 */
export interface BuildFinalResult {
    /**
     * 剧集 id。
     */
    episode_id: string | null;
    /**
     * 成片相对路径。
     */
    output: string;
    /**
     * 成片绝对路径。
     */
    abs_path: string;
    /**
     * 清单相对路径。
     */
    manifest: string;
    /**
     * 成片 sha256。
     */
    sha256: string;
    /**
     * 片段。
     */
    clips: Array<{ shot: string; run_id: string; artifact: string; source: SelectedClip["source"] }>;
    /**
     * 未纳入的镜号。
     */
    missing: string[];
    /**
     * 回退 / 失效警告。
     */
    warnings: Array<{ shot: string; code: string; message: string }>;
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
 * 校验显式选稿并把片段加入结果。
 */
function appendExplicit(
    root: string,
    context: EpisodeContext,
    shotId: string,
    runId: string,
    clips: SelectedClip[],
): void {
    // run 记录
    const rec = requireRun(root, runId);
    if (rec.status !== "succeeded") {
        throw new DaoyanCliError({
            code: "wrap_failed",
            message: `--select ${shotId}=${runId} 的 run 不是 succeeded（${rec.status}）`,
        });
    }
    if (context.episode_id !== null && rec.episode_id !== context.episode_id) {
        throw new DaoyanCliError({
            code: "wrap_failed",
            message: `--select ${shotId}=${runId} 的 run 属于 ${String(rec.episode_id ?? "未归属")}，不是 ${context.episode_id}`,
        });
    }
    // 视频产物
    const pick = pickVideoAt(root, rec);
    if (pick === null) {
        throw new DaoyanCliError({
            code: "wrap_failed",
            message: `--select ${shotId}=${runId} 的 run 没有视频产物`,
        });
    }
    clips.push({ shot: shotId, run_id: rec.run_id, artifact: pick.path, abs: pick.abs, source: "explicit" });
}

/**
 * 合片子集：只接受选中镜头的定稿稿件。
 */
function collectSubsetClips(
    opts: BuildFinalOptions,
    allShotIds: readonly string[],
    pool: RunRecord[],
): { clips: SelectedClip[]; pending: string[]; missing: string[] } {
    // 请求的镜号
    const wanted = [...new Set(opts.shots ?? [])];
    // 不存在的镜号
    const unknown = wanted.filter((id) => !allShotIds.includes(id));
    if (unknown.length > 0) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `分镜不存在：${unknown.join(" ")}`,
            hint: "刷新剧集详情确认镜号后再合片。",
        });
    }
    // 片段
    const clips: SelectedClip[] = [];
    // 未定稿 / 产物缺失
    const pending: string[] = [];
    // 无产出
    const missing: string[] = [];
    // 按分镜顺序
    for (const shotId of allShotIds) {
        if (!wanted.includes(shotId)) continue;
        // 显式选稿
        const explicitId = opts.selects?.get(shotId);
        if (explicitId !== undefined) {
            appendExplicit(opts.root, opts.context, shotId, explicitId, clips);
            continue;
        }
        // 定稿稿件
        const take = pickShotTake(opts.root, opts.context, shotId, pool);
        if (take.source === "none") {
            missing.push(shotId);
            continue;
        }
        if (take.source !== "finalized" || take.run === null || take.output === null) {
            pending.push(shotId);
            continue;
        }
        // 产物文件
        const abs = runOutputAbs(opts.root, take.run, take.output);
        if (!existsSync(abs)) {
            pending.push(shotId);
            continue;
        }
        clips.push({
            shot: shotId,
            run_id: take.run.run_id,
            artifact: take.output.path,
            abs,
            source: "finalized",
        });
    }
    return { clips, pending, missing };
}

/**
 * 合片。
 */
export async function buildFinal(opts: BuildFinalOptions): Promise<BuildFinalResult> {
    // 本集分镜
    const shots = loadContextShots(opts.root, opts.context);
    // 候选 run 池
    const pool = listRuns(opts.root);
    // 选中片段
    let clips: SelectedClip[];
    // 无任何可用产出的镜号
    const missing: string[] = [];
    // 回退警告
    const warnings: Array<{ shot: string; code: string; message: string }> = [];

    if (opts.shots !== undefined && opts.shots.length > 0) {
        // 子集模式
        const subset = collectSubsetClips(
            opts,
            shots.shots.map((shot) => shot.id),
            pool,
        );
        if (subset.pending.length > 0 || subset.missing.length > 0) {
            const failed = [...subset.pending, ...subset.missing];
            throw new DaoyanCliError({
                code: "take_pending",
                message: `合片门禁：${failed.length} 个镜头未定稿或产物缺失（${failed.join(" ")}）`,
                details: {
                    shots: failed,
                    episode_id: opts.context.episode_id,
                    takes_file: takesRelPath(opts.root, opts.context),
                },
                nextActions: [`take list ${failed.join(" ")} --json`],
            });
        }
        clips = subset.clips;
    } else {
        // 整集模式
        // 定稿门禁是否为 strict
        const strict = storyEnforceOf(opts.project) === "strict";
        // 有产出但未定稿的镜号
        const unfinalized: string[] = [];
        const collected: SelectedClip[] = [];
        for (const shot of shots.shots) {
            // 显式选择
            const explicitId = opts.selects?.get(shot.id);
            if (explicitId !== undefined) {
                appendExplicit(opts.root, opts.context, shot.id, explicitId, collected);
                continue;
            }
            // 本镜选稿（定稿优先）
            const take = pickShotTake(opts.root, opts.context, shot.id, pool);
            if (take.source === "none") {
                missing.push(shot.id);
                continue;
            }
            if (take.source === "latest") {
                if (strict && opts.allowIncomplete !== true) {
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
            // 定稿稿件按记录文件名取，避免误选同 run 的其他产物
            if (take.run === null) {
                missing.push(shot.id);
                continue;
            }
            const pick =
                take.output !== null
                    ? { path: take.output.path, abs: runOutputAbs(opts.root, take.run, take.output) }
                    : pickVideoAt(opts.root, take.run);
            if (pick === null || !existsSync(pick.abs)) {
                missing.push(shot.id);
                continue;
            }
            collected.push({
                shot: shot.id,
                run_id: take.run.run_id,
                artifact: pick.path,
                abs: pick.abs,
                source: take.source,
            });
        }
        if (unfinalized.length > 0) {
            throw new DaoyanCliError({
                code: "take_pending",
                message: `合片门禁：${unfinalized.length} 个镜头有产出但未定稿（${unfinalized.join(" ")}）`,
                details: {
                    shots: unfinalized,
                    episode_id: opts.context.episode_id,
                    takes_file: takesRelPath(opts.root, opts.context),
                },
                nextActions: [
                    `take list ${unfinalized.join(" ")} --json`,
                    ...unfinalized.map((id) => `take finalize ${id} --run <run_id> --json`),
                ],
            });
        }
        clips = collected;
    }

    if (clips.length < 2) {
        throw new DaoyanCliError({
            code: "wrap_failed",
            message: `可用于合片的镜头不足 2 段（当前 ${clips.length}/${shots.shots.length}；缺 ${missing.join(" ") || "无"}）`,
            details: { clips, missing },
        });
    }

    // 交付目录
    const finalDir = opts.context.final_dir;
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
    const listFile = join(opts.root, CONCAT_LIST_FILE);
    writeFileSync(listFile, clips.map((c) => `file '${c.abs.replace(/'/g, "'\\''")}'`).join("\n") + "\n");

    opts.log?.(`合片 ${clips.length} 段 → ${opts.context.final_rel}/${outName}（libx264 / crf18 / faststart）...`);
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
        episode_id: opts.context.episode_id,
        created_at: new Date().toISOString(),
        clips: clips.map((c) => ({
            shot: c.shot,
            run_id: c.run_id,
            artifact: c.artifact,
            source: c.source,
        })),
        selected: opts.shots !== undefined && opts.shots.length > 0 ? [...opts.shots] : null,
        missing,
        warnings,
        ffmpeg: { codec: "libx264", crf: 18, pix_fmt: "yuv420p", faststart: true },
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    return {
        episode_id: opts.context.episode_id,
        output: `${opts.context.final_rel}/${outName}`,
        abs_path: outPath,
        manifest: `${opts.context.final_rel}/${manifestName}`,
        sha256: sha256File(outPath),
        clips: clips.map((c) => ({ shot: c.shot, run_id: c.run_id, artifact: c.artifact, source: c.source })),
        missing,
        warnings,
    };
}
