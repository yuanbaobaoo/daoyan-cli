/** Story 生产接入 —— 剧集 shots 加载与拍摄门禁。
 *  legacy 项目不启用门禁；story 项目按 project.story.enforce 执行。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import { loadShotsFile } from "../project/config.mts";
import type { ProjectConfig, ShotsFile } from "../project/types.mts";
import type { EpisodeContext, EpisodeStoryStatus, StoryBlocker } from "./types.mts";
import { computeEpisodeStoryStatus } from "./validate.mts";
import { loadEpisodeShots } from "./store.mts";

/**
 * 门禁策略。
 */
export type StoryEnforce = "strict" | "warn" | "off";

/**
 * 门禁检查结果。
 */
export interface StoryGateResult {
    /**
     * 策略。
     */
    mode: StoryEnforce;
    /**
     * 阻断项。
     */
    blockers: StoryBlocker[];
    /**
     * 当前阶段。
     */
    stage: EpisodeStoryStatus["stage"] | null;
}

/**
 * 读取剧集上下文的分镜。
 */
export function loadContextShots(root: string, context: EpisodeContext): ShotsFile {
    if (context.legacy) return loadShotsFile(root);
    if (context.episode_id === null) {
        throw new DaoyanCliError({ code: "story_invalid", message: "缺少 episode_id" });
    }
    // 分镜
    const shots = loadEpisodeShots(root, context.episode_id);
    if (shots === null) {
        throw new DaoyanCliError({
            code: "story_gate_failed",
            message: `剧集 ${context.episode_id} 没有 shots.json`,
            details: {
                episode_id: context.episode_id,
                stage: "storyboard",
                blockers: [{ code: "shots_missing", message: "本集分镜不存在" }],
            },
        });
    }
    return shots;
}

/**
 * 计算门禁策略。
 */
export function storyEnforceOf(project: ProjectConfig): StoryEnforce {
    return project.story?.enforce ?? "strict";
}

/**
 * 检查剧集门禁。
 */
export function checkStoryGate(root: string, context: EpisodeContext, project: ProjectConfig): StoryGateResult {
    // 模式
    const mode = storyEnforceOf(project);
    if (context.legacy || context.episode_id === null || mode === "off") {
        return { mode, blockers: [], stage: null };
    }
    // 单集状态
    const status = computeEpisodeStoryStatus(root, context.episode_id, project);
    return { mode, blockers: status.blockers, stage: status.stage };
}

/**
 * 门禁失败错误。
 */
export function gateError(
    context: EpisodeContext,
    blockers: StoryBlocker[],
    stage: EpisodeStoryStatus["stage"] | null = null,
): DaoyanCliError {
    return new DaoyanCliError({
        code: "story_gate_failed",
        message: `剧集 ${String(context.episode_id)} 拍摄门禁未通过（${blockers.length} 项阻断）`,
        details: {
            episode_id: context.episode_id,
            stage: stage ?? "unknown",
            blockers,
            warnings: [],
            next_actions: [`daoyan story status --episode ${String(context.episode_id)} --json`],
        },
    });
}
