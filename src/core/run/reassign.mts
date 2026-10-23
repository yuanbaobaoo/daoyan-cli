/** run 归属迁移 —— 把 story 化之前（或手工 run）产出的 run 归到某一集的某个镜头。
 *  run 记录默认不可变；这是唯一的显式例外：只改 episode_id 与 label，
 *  并写 reassigned 审计段。task 记录属于历史执行事实，不改写。 */
import { existsSync } from "node:fs";
import { DaoyanCliError } from "../../shared/errors.mts";
import { nowIso, readJsonIfExists } from "../../shared/fs.mts";
import type { RunRecord } from "../project/types.mts";
import { requireRun, writeRun } from "./store.mts";
import { readTask } from "../task/store.mts";
import { resolveEpisodeContext, takesPath } from "../story/paths.mts";
import { loadEpisodeShots } from "../story/store.mts";
import type { TakeSourceKind, TakesFile } from "../story/types.mts";

// legacy 镜头 label：shot:<镜号>
const LEGACY_SHOT_LABEL_RE = /^shot:(.+)$/;
// story 镜头 label：ep:<剧集>:shot:<镜号>
const EPISODE_SHOT_LABEL_RE = /^ep:[^:]+:shot:(.+)$/;

/**
 * 迁移结果。
 */
export interface ReassignResult {
    /**
     * 迁移后的 run 记录。
     */
    record: RunRecord;
    /**
     * 是否实际改写。
     */
    changed: boolean;
    /**
     * 迁移前的 label。
     */
    prior_label: string | null;
    /**
     * 迁移前的剧集 id。
     */
    prior_episode_id: string | null;
    /**
     * 目标 label。
     */
    label: string;
    /**
     * 需要人工注意的事项。
     */
    warnings: string[];
}

/**
 * 把未归属的 run 迁移到某集某镜。
 */
export function reassignRunToEpisode(opts: {
    root: string;
    episodeId: string;
    runId: string;
    shotId?: string;
    by?: TakeSourceKind;
}): ReassignResult {
    // 现有记录
    const run = requireRun(opts.root, opts.runId);
    // 迁移前归属
    const priorLabel = run.label;
    // 迁移前剧集
    const priorEpisode = run.episode_id ?? null;
    // 目标剧集上下文
    const context = resolveEpisodeContext(opts.root, opts.episodeId);
    if (context.episode_id === null) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `目标 ${opts.episodeId} 不是有效剧集`,
            details: { episode_id: opts.episodeId },
        });
    }
    // 已归属同一集同一镜时是幂等空操作（两种 label 前缀都识别）
    const labeledShot =
        opts.shotId ??
        LEGACY_SHOT_LABEL_RE.exec(priorLabel ?? "")?.[1] ??
        EPISODE_SHOT_LABEL_RE.exec(priorLabel ?? "")?.[1];
    if (
        priorEpisode === context.episode_id &&
        labeledShot !== undefined &&
        priorLabel === `${context.label_prefix}${labeledShot}`
    ) {
        return {
            record: run,
            changed: false,
            prior_label: priorLabel,
            prior_episode_id: priorEpisode,
            label: priorLabel,
            warnings: [],
        };
    }
    if (priorEpisode !== null) {
        throw new DaoyanCliError({
            code: "run_assigned",
            message: `run ${opts.runId} 已归属剧集 ${priorEpisode}，reassign 只迁移未归属的 run`,
            details: { run_id: opts.runId, label: priorLabel, episode_id: priorEpisode },
        });
    }
    // 未归属：镜号来自 --shot，或从 legacy label shot:<n> 推导
    const shotId = opts.shotId ?? LEGACY_SHOT_LABEL_RE.exec(priorLabel ?? "")?.[1];
    if (shotId === undefined) {
        throw new DaoyanCliError({
            code: "usage",
            message: `run ${opts.runId} 的 label 是 ${String(priorLabel ?? "空")}，推不出镜号；请用 --shot <镜号> 指定`,
            exit: 2,
            details: { run_id: opts.runId, label: priorLabel },
        });
    }
    // 目标 label
    const label = `${context.label_prefix}${shotId}`;
    // 目标集分镜必须存在该镜号
    const shots = loadEpisodeShots(opts.root, context.episode_id);
    if (shots === null) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `剧集 ${context.episode_id} 没有 shots.json，无法归属镜头 ${shotId}`,
            details: { episode_id: context.episode_id },
        });
    }
    if (!shots.shots.some((s) => s.id === shotId)) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `镜 ${shotId} 不在 ${context.episode_id} 的分镜里`,
            details: { episode_id: context.episode_id, available: shots.shots.map((s) => s.id).join(" ") },
        });
    }
    // 迁移后记录
    const next: RunRecord = {
        ...run,
        episode_id: context.episode_id,
        label,
        reassigned: {
            from_label: priorLabel,
            from_episode_id: priorEpisode,
            at: nowIso(),
            by: opts.by ?? "ai",
        },
    };
    writeRun(opts.root, next);
    // 注意事项
    const warnings: string[] = [];
    // legacy 台账引用
    if (legacyTakeReferences(opts.root, opts.runId)) {
        warnings.push(
            `根目录 takes.json 里有指向该 run 的定稿记录；迁移后该记录会判为失效，需要在 ${context.episode_id} 重新 take finalize。`,
        );
    }
    // task 归属保持原样
    const task = readTask(opts.root, run.task_id);
    if (task !== null && (task.episode_id ?? null) !== context.episode_id) {
        warnings.push(
            `所属 task ${run.task_id} 的 episode_id 仍为 ${String(task.episode_id ?? "未归属")}（执行记录不改写）。`,
        );
    }
    return { record: next, changed: true, prior_label: priorLabel, prior_episode_id: priorEpisode, label, warnings };
}

/**
 * 判断 legacy 台账是否引用了该 run。
 */
function legacyTakeReferences(root: string, runId: string): boolean {
    // 根目录台账
    const file = takesPath(root, null);
    if (!existsSync(file)) return false;
    // 台账内容
    const takes = readJsonIfExists<TakesFile>(file);
    if (takes === null || !Array.isArray(takes.shots)) return false;
    return takes.shots.some((s) => s.finalized !== null && s.finalized !== undefined && s.finalized.run_id === runId);
}
