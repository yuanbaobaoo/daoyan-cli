/** Web story 视图 —— 系列 / 剧集 / 全局设定 / 资产 DTO。
 *  DTO 不含绝对路径；媒体只给 /media/story/... URL。 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ProjectConfig, ShotsFile, StoryEntityRef } from "../project/types.mts";
import { classifyArtifact, buildShotsView, listArtifacts, listFinals, listRunsView, listTasksView } from "./data.mts";
import { listAssets, isLfsPointerFile } from "../story/assets.mts";
import { episodeDir, listEpisodeMetas, readEpisodeMeta, readSeries } from "../story/paths.mts";
import {
    loadBreakdown,
    loadCharacters,
    loadEpisodeShots,
    loadScenes,
    loadScriptMeta,
    loadScriptText,
    loadVoices,
} from "../story/store.mts";
import { computeEpisodeStoryStatus, computeSeriesStoryStatus } from "../story/validate.mts";
import type { StoryAsset } from "../story/types.mts";

// story 媒体前缀
const STORY_MEDIA_PREFIX = "/media/story";

/**
 * story 资产媒体地址。
 */
export function storyMediaUrl(path: string): string {
    // 去掉 story/assets/ 前缀，URL 只保留 owner 相对路径
    const prefix = "story/assets/";
    // 局部值
    const rel = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    return `${STORY_MEDIA_PREFIX}/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * 资产 DTO。
 */
function assetView(root: string, asset: StoryAsset): Record<string, unknown> {
    // 绝对路径（仅 stat，不进入 DTO）
    const abs = join(root, asset.path);
    // 是否存在
    const present = existsSync(abs);
    // 字节与 LFS
    let bytes = asset.bytes;
    // 局部值
    let lfsPointer = false;
    if (present) {
        try {
            // 文件状态
            const stat = statSync(abs);
            bytes = stat.size;
            lfsPointer = isLfsPointerFile(abs);
        } catch {
            // 保留记录值
        }
    }
    // 媒体地址
    const mediaUrl = storyMediaUrl(asset.path);
    return {
        id: asset.id,
        role: asset.role ?? null,
        path: asset.path,
        kind: classifyArtifact(asset.path),
        content_type: asset.content_type,
        sha256: asset.sha256,
        bytes,
        width: asset.width ?? null,
        height: asset.height ?? null,
        source_run: asset.source_run,
        source_output: asset.source_output,
        source_episode_id: asset.source_episode_id,
        created_at: asset.created_at,
        present,
        lfs_pointer: lfsPointer,
        media_url: mediaUrl,
        download_url: `${mediaUrl}?download=1`,
    };
}

/**
 * 角色视图。
 */
export function listStoryCharactersView(root: string): unknown[] {
    // 角色
    const doc = loadCharacters(root);
    return doc.characters.map((character) => ({
        id: character.id,
        name: character.name,
        aliases: character.aliases ?? [],
        role: character.role ?? null,
        introduced_in: character.introduced_in ?? null,
        summary: character.summary ?? null,
        appearance: character.appearance ?? null,
        default_form: character.default_form,
        voice_ids: character.voice_ids ?? [],
        forms: character.forms.map((form) => ({
            id: form.id,
            name: form.name,
            description: form.description ?? null,
            outfit: form.outfit ?? null,
            reference_asset: form.reference_asset ?? null,
            assets: form.assets.map((asset) => assetView(root, asset)),
        })),
    }));
}

/**
 * 场景视图。
 */
export function listStoryScenesView(root: string): unknown[] {
    // 场景
    const doc = loadScenes(root);
    return doc.scenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        description: scene.description ?? null,
        time_of_day: scene.time_of_day ?? null,
        interior_exterior: scene.interior_exterior ?? null,
        mood: scene.mood ?? null,
        introduced_in: scene.introduced_in ?? null,
        reference_asset: scene.reference_asset ?? null,
        assets: scene.assets.map((asset) => assetView(root, asset)),
    }));
}

/**
 * 音色视图。
 */
export function listStoryVoicesView(root: string): unknown[] {
    // 音色
    const doc = loadVoices(root);
    return doc.voices.map((voice) => ({
        id: voice.id,
        character_id: voice.character_id,
        name: voice.name,
        mode: voice.mode,
        description: voice.description ?? null,
        sample_text: voice.sample_text ?? null,
        reference_asset: voice.reference_asset ?? null,
        assets: voice.assets.map((asset) => assetView(root, asset)),
    }));
}

/**
 * 资产列表视图。
 */
export function listStoryAssetsView(root: string): unknown[] {
    return listAssets(root).map((item) => ({
        owner_kind: item.owner_kind,
        owner_id: item.owner_id,
        owner_name: item.owner_name,
        form_id: item.form_id,
        reference: item.reference,
        asset: assetView(root, item.asset),
    }));
}

/**
 * 系列视图。
 */
export function buildStorySeriesView(root: string, project: ProjectConfig): Record<string, unknown> {
    // 系列元数据
    const series = readSeries(root);
    // 系列状态
    const status = computeSeriesStoryStatus(root, project);
    return { series, status, episodes: status.episodes, counts: status.counts };
}

/**
 * 构造 story 剧集的分镜视图（用全局设定集替代 shots.meta 展示字段）。
 */
function buildEpisodeShotsView(root: string, episodeId: string): ReturnType<typeof buildShotsView> {
    // 分镜
    const shots = loadEpisodeShots(root, episodeId);
    if (shots === null) return null;
    // 角色
    const characters = loadCharacters(root);
    // 角色展示定义
    const characterDefs: StoryEntityRef[] = characters.characters.map((character) => {
        // 默认形态
        const form = character.forms.find((f) => f.id === character.default_form) ?? character.forms[0];
        // 主参考
        const asset = form?.reference_asset ? form.assets.find((a) => a.id === form.reference_asset) : undefined;
        return {
            id: character.id,
            name: character.name,
            description: character.summary ?? form?.description ?? "",
            ...(asset !== undefined ? { reference: asset.path } : {}),
        };
    });
    // 场景
    const scenes = loadScenes(root);
    // 场景展示定义
    const sceneDefs: StoryEntityRef[] = scenes.scenes.map((scene) => {
        // 主参考
        const asset = scene.reference_asset ? scene.assets.find((a) => a.id === scene.reference_asset) : undefined;
        return {
            id: scene.id,
            name: scene.name,
            description: scene.description ?? "",
            ...(asset !== undefined ? { reference: asset.path } : {}),
        };
    });
    // 元数据
    const meta = shots.meta;
    // 合成视图
    const synthetic: ShotsFile = {
        ...shots,
        meta: {
            ...meta,
            characters: characterDefs,
            scenes: sceneDefs,
        },
    };
    return buildShotsView(root, synthetic, `ep:${episodeId}:shot:`);
}

/**
 * 剧集视图。
 */
export function buildStoryEpisodeView(
    root: string,
    episodeId: string,
    project: ProjectConfig,
): Record<string, unknown> | null {
    // 剧集元数据
    const meta = readEpisodeMeta(root, episodeId);
    if (meta === null) return null;
    // 剧情状态
    const status = computeEpisodeStoryStatus(root, episodeId, project);
    // 剧本
    const script = loadScriptMeta(root, episodeId);
    // 内容
    const content = loadScriptText(root, episodeId);
    // 拆解
    const breakdown = loadBreakdown(root, episodeId);
    // 分镜
    const shots = buildEpisodeShotsView(root, episodeId);
    // 任务 / run / 产物 / 成片
    const tasks = listTasksView(root, episodeId);
    // 局部值
    const runs = listRunsView(root, episodeId);
    // 产物
    const artifacts = listArtifacts(root, { episode: episodeId, limit: 200 });
    // 局部值
    const finals = listFinals(root, episodeId);
    // 文件状态
    const dir = episodeDir(root, episodeId);
    return {
        episode: meta,
        status,
        script: { meta: script, content },
        breakdown,
        shots,
        tasks: tasks.items,
        runs,
        artifacts: artifacts.items,
        finals,
        files: {
            script_md: existsSync(join(dir, "script.md")),
            script_json: existsSync(join(dir, "script.json")),
            breakdown: existsSync(join(dir, "breakdown.json")),
            shots: existsSync(join(dir, "shots.json")),
        },
        episodes: listEpisodeMetas(root),
    };
}
