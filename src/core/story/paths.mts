/** Story 路径与剧集上下文 —— 让所有单集命令共用同一套路径解析规则。
 *  - 所有项目都使用 story 布局；
 *  - single：恰好一集，--episode 可省略；
 *  - series：多集时必须显式 --episode，否则 episode_required。 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { readJson } from "../../shared/fs.mts";
import {
    BREAKDOWN_FILE,
    EPISODES_DIR,
    EPISODE_META_FILE,
    FINAL_DIR,
    SCRIPT_FILE,
    SCRIPT_TEXT_FILE,
    SHOTS_FILE,
    STORY_ASSETS_DIR,
    STORY_MAP_FILE,
    STORY_CHARACTERS_FILE,
    STORY_DIR,
    STORY_SCENES_FILE,
    STORY_SERIES_FILE,
    STORY_VOICES_FILE,
    TAKES_FILE,
} from "../project/types.mts";
import { readProjectAt } from "../project/config.mts";
import { productionOf } from "../project/production.mts";
import type { EpisodeContext, StoryEpisodeMeta, StorySeriesFile } from "./types.mts";

/**
 * 剧集 / 角色 / 场景 / 形态 / 音色 / 资产 id 的合法格式。
 */
export const STORY_ID_RE = /^[a-z][a-z0-9-]{1,63}$/;

/**
 * 资产 id 保留字（工作流槽位用它表示主参考）。
 */
export const REFERENCE_ASSET_RESERVED = "reference";

/**
 * 系列元数据绝对路径。
 */
export function seriesPath(root: string): string {
    return join(root, STORY_SERIES_FILE);
}

/**
 * 全局角色文件绝对路径。
 */
export function charactersPath(root: string): string {
    return join(root, STORY_CHARACTERS_FILE);
}

/**
 * 全局场景文件绝对路径。
 */
export function scenesPath(root: string): string {
    return join(root, STORY_SCENES_FILE);
}

/**
 * 全局音色文件绝对路径。
 */
export function voicesPath(root: string): string {
    return join(root, STORY_VOICES_FILE);
}

/**
 * 设定资产根目录绝对路径。
 */
export function storyAssetsDir(root: string): string {
    return join(root, STORY_ASSETS_DIR);
}

/**
 * 分集根目录绝对路径。
 */
export function episodesRoot(root: string): string {
    return join(root, EPISODES_DIR);
}

/**
 * 单集目录绝对路径。
 */
export function episodeDir(root: string, episodeId: string): string {
    return join(root, EPISODES_DIR, episodeId);
}

/**
 * 单集剧情图谱标注文件绝对路径。
 */
export function storyMapPath(root: string, episodeId: string): string {
    return join(episodeDir(root, episodeId), STORY_MAP_FILE);
}

/**
 * 镜头定稿台账绝对路径。
 */
export function takesPath(root: string, episodeId: string): string {
    if (!STORY_ID_RE.test(episodeId)) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `剧集 id 非法：${episodeId}`,
            details: { episode_id: episodeId },
        });
    }
    return join(episodeDir(root, episodeId), TAKES_FILE);
}

/**
 * 项目是否已初始化 story 结构。
 */
export function storyEnabled(root: string): boolean {
    return existsSync(seriesPath(root));
}

/**
 * 旧项目 / 未初始化 story 时统一报错。
 */
export function requireStory(root: string): void {
    if (storyEnabled(root)) return;
    throw new DaoyanCliError({
        code: "story_not_found",
        message: "项目缺少 story/series.json：旧项目结构不再支持",
        hint: "请在新目录重新执行 daoyan init --mode=local|remote。",
    });
}

/**
 * 读取系列元数据；不存在返回 null。
 */
export function readSeries(root: string): StorySeriesFile | null {
    // 系列文件
    const file = seriesPath(root);
    if (!existsSync(file)) return null;
    return readJson<StorySeriesFile>(file);
}

/**
 * 读取剧集元数据；不存在返回 null。
 */
export function readEpisodeMeta(root: string, episodeId: string): StoryEpisodeMeta | null {
    if (!STORY_ID_RE.test(episodeId)) return null;
    // 元数据文件
    const file = join(episodeDir(root, episodeId), EPISODE_META_FILE);
    if (!existsSync(file)) return null;
    return readJson<StoryEpisodeMeta>(file);
}

/**
 * 读取剧集元数据；缺失抛 episode_not_found。
 */
export function requireEpisodeMeta(root: string, episodeId: string): StoryEpisodeMeta {
    // 元数据
    const meta = readEpisodeMeta(root, episodeId);
    if (meta === null) {
        throw new DaoyanCliError({
            code: "episode_not_found",
            message: `未找到剧集 ${episodeId}`,
            details: { episode_id: episodeId },
        });
    }
    return meta;
}

/**
 * 列出全部剧集，按 number 升序。
 */
export function listEpisodeMetas(root: string): StoryEpisodeMeta[] {
    // 分集根目录
    const dir = episodesRoot(root);
    if (!existsSync(dir)) return [];
    // 剧集列表
    const out: StoryEpisodeMeta[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        // 目录名必须符合 id 规则
        if (!STORY_ID_RE.test(entry.name)) continue;
        try {
            // 当前剧集元数据
            const meta = readEpisodeMeta(root, entry.name);
            if (meta !== null && meta.id === entry.name) out.push(meta);
        } catch {
            // 坏记录由 story validate 报告；这里跳过
        }
    }
    return out.sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));
}

/**
 * 构造剧集上下文。
 */
function storyContext(root: string, meta: StoryEpisodeMeta): EpisodeContext {
    // 剧集目录
    const dir = episodeDir(root, meta.id);
    // 相对目录
    const relDir = `${EPISODES_DIR}/${meta.id}`;
    // 成片相对目录
    const finalRel = `${FINAL_DIR}/${meta.id}`;
    return {
        episode_id: meta.id,
        dir,
        rel_dir: relDir,
        shots_path: join(dir, SHOTS_FILE),
        final_dir: join(root, finalRel),
        final_rel: finalRel,
        label_prefix: `ep:${meta.id}:shot:`,
        script_meta_path: join(dir, SCRIPT_FILE),
        script_text_path: join(dir, SCRIPT_TEXT_FILE),
        breakdown_path: join(dir, BREAKDOWN_FILE),
        episode_meta_path: join(dir, EPISODE_META_FILE),
    };
}

/**
 * 解析剧集上下文。
 * - single：可省略 --episode；
 * - series 单集：可省略；
 * - series 多集：必须显式 --episode。
 */
export function resolveEpisodeContext(root: string, episodeId?: string): EpisodeContext {
    requireStory(root);
    // 项目配置
    const project = readProjectAt(root);
    if (project === null) {
        throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json" });
    }
    // 生产模式
    const production = productionOf(project);
    // 全部剧集
    const metas = listEpisodeMetas(root);
    if (metas.length === 0) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: "项目没有有效剧集",
            hint: "运行 daoyan init 初始化第一集。",
        });
    }
    if (production.mode === "single" && metas.length > 1) {
        throw new DaoyanCliError({
            code: "mode_conflict",
            message: `单视频项目只能有一集，当前有 ${metas.length} 集`,
            details: { episodes: metas.map((m) => m.id) },
            hint: "删除多余剧集，或在项目管理切换为多集模式。",
        });
    }
    if (episodeId !== undefined && episodeId !== "") {
        // 目标剧集
        const target = metas.find((m) => m.id === episodeId);
        if (target === undefined) {
            throw new DaoyanCliError({
                code: "episode_not_found",
                message: `未找到剧集 ${episodeId}`,
                details: { episode_id: episodeId, episodes: metas.map((m) => m.id) },
            });
        }
        return storyContext(root, target);
    }
    if (metas.length > 1) {
        throw new DaoyanCliError({
            code: "episode_required",
            message: `当前项目有 ${metas.length} 集，请用 --episode <id> 指定剧集`,
            details: { episodes: metas.map((m) => m.id) },
        });
    }
    return storyContext(root, metas[0] as StoryEpisodeMeta);
}

/**
 * 判断 story 目录是否已存在（用于 init 幂等）。
 */
export function storyDirExists(root: string): boolean {
    return existsSync(join(root, STORY_DIR));
}
