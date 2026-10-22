/** 剧情图谱与生成上下文 —— 从全局设定、拆解、分镜、workflow 与 runs 推导。
 *  - 事实层每次实时推导，不落盘；
 *  - story-map.json 只保存叙事标注（标题 / 重要度 / 故事时间 / 关系）；
 *  - 生成上下文明确定位到参考资产、workflow 槽位、连续性与缺口，供 AI 决策。 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { asCliError, DaoyanCliError } from "../../shared/errors.mts";
import { nowIso, sha256File } from "../../shared/fs.mts";
import {
    BREAKDOWN_FILE,
    PROJECT_FILE,
    SHOTS_FILE,
    WORKFLOWS_DIR,
    type ProjectConfig,
    type RunRecord,
    type ShotSpec,
    type ShotsFile,
} from "../project/types.mts";
import { resolveWorkflowRef, workflowNameOf } from "../project/config.mts";
import { loadBindings, loadGraphFile } from "../workflow/load.mts";
import { listRuns } from "../run/store.mts";
import { isLfsPointerFile, storyMediaUrl } from "./assets.mts";
import { episodeDir, readEpisodeMeta, resolveEpisodeContext, storyMapPath } from "./paths.mts";
import { pickShotTake } from "./takes.mts";
import {
    loadBreakdown,
    loadCharacters,
    loadEpisodeShots,
    loadScenes,
    loadScriptMeta,
    loadStoryMap,
    loadVoices,
} from "./store.mts";
import { loadWorkflowAssets, planWorkflowAssets, type WorkflowAssetMappingSource } from "./workflow-assets.mts";
import type {
    ScriptMeta,
    StoryAsset,
    StoryCharacter,
    StoryCharactersFile,
    StoryForm,
    StoryMapEvent,
    StoryMapFile,
    StoryMapImportance,
    StoryMapRelation,
    StoryOwnerKind,
    WorkflowAssetSlot,
} from "./types.mts";

// 生成上下文不可用时的严重级别
const BLOCKER = "blocker";
// 提示级别
const WARNING = "warning";
// run 媒体前缀
const RUN_MEDIA_PREFIX = "/media/run";
// 最多展示的节点类名
const MAX_NODE_CLASSES = 20;
// 视频扩展名
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".mkv"]);
// 图片扩展名
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
// 音频扩展名
const AUDIO_EXTENSIONS = new Set([".wav", ".mp3", ".flac", ".ogg", ".m4a"]);
// JSON 扩展名
const JSON_EXTENSIONS = new Set([".json"]);
// 文本扩展名
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".log", ".csv", ".yaml", ".yml"]);
// 最大标题长度
const MAX_TITLE_LENGTH = 120;
// 最大摘要长度
const MAX_SUMMARY_LENGTH = 500;
// 最大故事时间长度
const MAX_STORY_TIME_LENGTH = 80;
// 最大备注长度
const MAX_NOTE_LENGTH = 500;

/**
 * 资产引用（进入 Web / CLI JSON 的只读快照）。
 */
export interface StoryMapAssetRef {
    /**
     * 资产 id。
     */
    id: string;
    /**
     * 资产角色。
     */
    role: string | null;
    /**
     * 项目内相对路径。
     */
    path: string;
    /**
     * 同源媒体地址。
     */
    media_url: string;
    /**
     * 文件是否存在。
     */
    present: boolean;
    /**
     * 是否仍是 Git LFS pointer。
     */
    lfs_pointer: boolean;
    /**
     * 宽度（已知时）。
     */
    width: number | null;
    /**
     * 高度（已知时）。
     */
    height: number | null;
    /**
     * MIME 类型。
     */
    content_type: string;
    /**
     * 字节数。
     */
    bytes: number;
}

/**
 * 地图缺口。
 */
export interface StoryMapGap {
    /**
     * 稳定 code。
     */
    code: string;
    /**
     * 严重级别。
     */
    severity: "blocker" | "warning";
    /**
     * 关联镜头。
     */
    shot_id: string | null;
    /**
     * 关联引用。
     */
    ref: string | null;
    /**
     * 说明。
     */
    message: string;
    /**
     * 修复建议。
     */
    hint: string;
}

/**
 * 事件角色视图。
 */
export interface StoryMapCharacterView {
    /**
     * 角色 id。
     */
    id: string;
    /**
     * 角色名。
     */
    name: string;
    /**
     * 形态 id。
     */
    form: string;
    /**
     * 形态名。
     */
    form_name: string;
    /**
     * 形态来源。
     */
    form_source: "explicit" | "default" | "fallback" | "unknown";
    /**
     * 主参考资产 id。
     */
    reference_asset_id: string | null;
    /**
     * 主参考是否可用。
     */
    reference_present: boolean;
    /**
     * 该形态全部资产 id。
     */
    asset_ids: string[];
}

/**
 * 事件场景视图。
 */
export interface StoryMapSceneView {
    /**
     * 场景 id。
     */
    id: string;
    /**
     * 场景名。
     */
    name: string;
    /**
     * 主参考资产 id。
     */
    reference_asset_id: string | null;
    /**
     * 主参考是否可用。
     */
    reference_present: boolean;
    /**
     * 场景全部资产 id。
     */
    asset_ids: string[];
}

/**
 * 事件音色视图。
 */
export interface StoryMapVoiceView {
    /**
     * 角色 id。
     */
    character_id: string;
    /**
     * 音色 id。
     */
    voice_id: string;
    /**
     * 音色模式。
     */
    mode: string;
    /**
     * 主参考资产 id。
     */
    reference_asset_id: string | null;
    /**
     * 主参考是否可用。
     */
    reference_present: boolean;
}

/**
 * 形态变化。
 */
export interface StoryMapFormChange {
    /**
     * 角色 id。
     */
    character_id: string;
    /**
     * 变化前形态。
     */
    from: string;
    /**
     * 变化后形态。
     */
    to: string;
}

/**
 * 首帧锚点。
 */
export interface StoryMapAnchor {
    /**
     * anchor key。
     */
    key: string;
    /**
     * 项目内相对路径。
     */
    path: string;
    /**
     * 文件是否存在。
     */
    present: boolean;
}

/**
 * 连续性。
 */
export interface StoryMapContinuity {
    /**
     * 是否发生场景切换。
     */
    scene_changed: boolean;
    /**
     * 是否与上一镜同场景。
     */
    same_scene_as_prev: boolean;
    /**
     * 形态变化。
     */
    form_changes: StoryMapFormChange[];
    /**
     * relay 上游镜头。
     */
    relay_from: string | null;
    /**
     * relay 下游镜头。
     */
    relay_targets: string[];
    /**
     * 首帧锚点。
     */
    anchor: StoryMapAnchor | null;
}

/**
 * 渲染产物。
 */
export interface StoryMapRenderOutput {
    /**
     * 产物名。
     */
    name: string;
    /**
     * 产物类型。
     */
    kind: "video" | "image" | "audio" | "json" | "text" | "other";
    /**
     * 媒体地址。
     */
    media_url: string;
    /**
     * 字节数。
     */
    bytes: number;
}

/**
 * 渲染状态。
 */
export interface StoryMapRender {
    /**
     * run 总数。
     */
    runs_count: number;
    /**
     * 成功 run 数。
     */
    succeeded_count: number;
    /**
     * 最新 run id。
     */
    latest_run_id: string | null;
    /**
     * 最新 run 状态。
     */
    latest_status: "succeeded" | "failed" | "cancelled" | "interrupted" | null;
    /**
     * 最新产物。
     */
    latest_outputs: StoryMapRenderOutput[];
    /**
     * 定稿稿件所在 run（未定稿为 null）。
     */
    finalized_run_id: string | null;
    /**
     * 定稿稿件（未定稿为空数组）。
     */
    finalized_outputs: StoryMapRenderOutput[];
    /**
     * 最新完成时间。
     */
    latest_finished_at: string | null;
    /**
     * 最新错误。
     */
    latest_error: string | null;
}

/**
 * 事件视图。
 */
export interface StoryMapEventView {
    /**
     * 镜头 id。
     */
    shot_id: string;
    /**
     * 起始秒数。
     */
    at_seconds: number;
    /**
     * 起始时间是否为估算。
     */
    at_estimated: boolean;
    /**
     * 时长（秒）。
     */
    duration_seconds: number | null;
    /**
     * 事件标题。
     */
    title: string;
    /**
     * 标题来源。
     */
    title_source: "annotation" | "shot";
    /**
     * 事件摘要。
     */
    summary: string;
    /**
     * 摘要来源。
     */
    summary_source: "annotation" | "shot";
    /**
     * 重要度。
     */
    importance: StoryMapImportance;
    /**
     * 重要度来源。
     */
    importance_source: "annotation" | "derived";
    /**
     * 故事时间。
     */
    story_time: string | null;
    /**
     * 场景。
     */
    scene: StoryMapSceneView | null;
    /**
     * 出场角色。
     */
    characters: StoryMapCharacterView[];
    /**
     * beat id。
     */
    beat_ids: string[];
    /**
     * beat 摘要。
     */
    beats: Array<{ id: string; summary: string }>;
    /**
     * 台词数。
     */
    dialogue_count: number;
    /**
     * 备注。
     */
    note: string | null;
}

/**
 * 工作流槽位明细。
 */
export interface StoryMapWorkflowSlot {
    /**
     * 槽位名。
     */
    slot: string;
    /**
     * 资产类型。
     */
    kind: StoryOwnerKind;
    /**
     * 是否必填。
     */
    required: boolean;
    /**
     * 目标节点输入。
     */
    target: string;
    /**
     * owner 引用。
     */
    owner: string | null;
    /**
     * 映射来源。
     */
    mapping_source: WorkflowAssetMappingSource;
    /**
     * 解析到的资产。
     */
    asset: StoryMapAssetRef | null;
    /**
     * 状态。
     */
    status: "ready" | "blocker" | "optional";
}

/**
 * 当前指派 workflow 的解析结果。
 */
export interface StoryMapWorkflowResolution {
    /**
     * workflow 短名。
     */
    name: string;
    /**
     * 项目内相对路径。
     */
    path: string;
    /**
     * 图是否合法。
     */
    valid: boolean;
    /**
     * 是否有 bindings。
     */
    has_bindings: boolean;
    /**
     * 槽位明细。
     */
    slots: StoryMapWorkflowSlot[];
    /**
     * 缺失槽位。
     */
    missing_slots: string[];
    /**
     * 缺口。
     */
    gaps: StoryMapGap[];
}

/**
 * workflow 候选。
 */
export interface StoryMapWorkflowCandidate {
    /**
     * workflow 短名。
     */
    name: string;
    /**
     * 项目内相对路径。
     */
    path: string;
    /**
     * 是否默认 workflow。
     */
    default: boolean;
    /**
     * 图是否合法。
     */
    valid: boolean;
    /**
     * 是否有 bindings。
     */
    has_bindings: boolean;
    /**
     * bindings 逻辑输入。
     */
    bindings: string[];
    /**
     * 节点数。
     */
    node_count: number;
    /**
     * 节点类名。
     */
    node_classes: string[];
    /**
     * 资产槽位声明。
     */
    asset_slots: WorkflowAssetSlot[];
    /**
     * 不可用原因。
     */
    unusable_reasons: string[];
}

/**
 * 候选适配结果。
 */
export interface StoryMapCandidateFit {
    /**
     * workflow 短名。
     */
    name: string;
    /**
     * 适配状态。
     */
    fit: "ready" | "needs_assets" | "unusable";
    /**
     * 原因。
     */
    reasons: string[];
}

/**
 * 事件生成上下文。
 */
export interface StoryMapGenerationEvent {
    /**
     * 镜头 id。
     */
    shot_id: string;
    /**
     * 当前指派 workflow。
     */
    assigned_workflow: string | null;
    /**
     * workflow 来源。
     */
    workflow_source: "shot" | "shots" | "project" | "none";
    /**
     * workflow 解析结果。
     */
    workflow: StoryMapWorkflowResolution | null;
    /**
     * 出场角色。
     */
    cast: StoryMapCharacterView[];
    /**
     * 场景。
     */
    scene: StoryMapSceneView | null;
    /**
     * 音色。
     */
    voices: StoryMapVoiceView[];
    /**
     * 连续性。
     */
    continuity: StoryMapContinuity;
    /**
     * 渲染状态。
     */
    render: StoryMapRender;
    /**
     * 候选适配。
     */
    candidate_workflows: StoryMapCandidateFit[];
    /**
     * 缺口。
     */
    gaps: StoryMapGap[];
    /**
     * 是否可生成。
     */
    ready: boolean;
}

/**
 * 就绪统计。
 */
export interface StoryMapReadiness {
    /**
     * 计数。
     */
    counts: {
        /**
         * 镜头数。
         */
        shots: number;
        /**
         * 可生成数。
         */
        ready: number;
        /**
         * 阻塞数。
         */
        blocked: number;
        /**
         * 已生成数。
         */
        rendered: number;
        /**
         * 失败数。
         */
        failed: number;
    };
    /**
     * 可生成镜头。
     */
    ready_shots: string[];
    /**
     * 阻塞镜头。
     */
    blocked_shots: string[];
    /**
     * 已生成镜头。
     */
    rendered_shots: string[];
    /**
     * 失败镜头。
     */
    failed_shots: string[];
}

/**
 * 生成上下文。
 */
export interface StoryMapGeneration {
    /**
     * workflow 候选目录。
     */
    workflows: StoryMapWorkflowCandidate[];
    /**
     * 就绪统计。
     */
    readiness: StoryMapReadiness;
    /**
     * 每镜上下文。
     */
    events: StoryMapGenerationEvent[];
    /**
     * 全部缺口。
     */
    gaps: StoryMapGap[];
}

/**
 * 数据来源。
 */
export interface StoryMapOrigin {
    /**
     * 是否来自自动推导。
     */
    derived: boolean;
    /**
     * 是否有叙事标注。
     */
    annotated: boolean;
    /**
     * 最后写入者。
     */
    author: "dycli" | "ai" | "user" | "import";
    /**
     * 标注更新时间。
     */
    updated_at: string | null;
    /**
     * 标注是否基于旧分镜 / 剧本。
     */
    stale: boolean;
    /**
     * stale 原因。
     */
    stale_reasons: string[];
}

/**
 * 时间轴信息。
 */
export interface StoryMapTime {
    /**
     * 时间基准。
     */
    basis: "screen" | "order";
    /**
     * 已知时长总和。
     */
    duration_seconds: number | null;
    /**
     * 时长未知的镜头。
     */
    unknown_duration_shots: string[];
}

/**
 * 目录项。
 */
export interface StoryMapCatalogForm {
    /**
     * 形态 id。
     */
    id: string;
    /**
     * 形态名。
     */
    name: string;
    /**
     * 描述。
     */
    description: string | null;
    /**
     * 本集是否使用。
     */
    used: boolean;
    /**
     * 使用次数。
     */
    event_count: number;
    /**
     * 主参考。
     */
    reference_asset: StoryMapAssetRef | null;
    /**
     * 全部资产。
     */
    assets: StoryMapAssetRef[];
}

/**
 * 角色目录项。
 */
export interface StoryMapCatalogCharacter {
    /**
     * 角色 id。
     */
    id: string;
    /**
     * 角色名。
     */
    name: string;
    /**
     * 角色定位。
     */
    role: string | null;
    /**
     * 默认形态。
     */
    default_form: string;
    /**
     * 是否未知引用。
     */
    unknown: boolean;
    /**
     * 形态列表。
     */
    forms: StoryMapCatalogForm[];
}

/**
 * 场景目录项。
 */
export interface StoryMapCatalogScene {
    /**
     * 场景 id。
     */
    id: string;
    /**
     * 场景名。
     */
    name: string;
    /**
     * 描述。
     */
    description: string | null;
    /**
     * 时间。
     */
    time_of_day: string | null;
    /**
     * 内外景。
     */
    interior_exterior: string | null;
    /**
     * 氛围。
     */
    mood: string | null;
    /**
     * 本集是否使用。
     */
    used: boolean;
    /**
     * 使用次数。
     */
    event_count: number;
    /**
     * 是否未知引用。
     */
    unknown: boolean;
    /**
     * 主参考。
     */
    reference_asset: StoryMapAssetRef | null;
    /**
     * 全部资产。
     */
    assets: StoryMapAssetRef[];
}

/**
 * 音色目录项。
 */
export interface StoryMapCatalogVoice {
    /**
     * 音色 id。
     */
    id: string;
    /**
     * 角色 id。
     */
    character_id: string;
    /**
     * 音色名。
     */
    name: string;
    /**
     * 模式。
     */
    mode: string;
    /**
     * 描述。
     */
    description: string | null;
    /**
     * 本集是否使用。
     */
    used: boolean;
    /**
     * 主参考。
     */
    reference_asset: StoryMapAssetRef | null;
    /**
     * 全部资产。
     */
    assets: StoryMapAssetRef[];
}

/**
 * beat 目录项。
 */
export interface StoryMapCatalogBeat {
    /**
     * beat id。
     */
    id: string;
    /**
     * 摘要。
     */
    summary: string;
}

/**
 * 目录。
 */
export interface StoryMapCatalog {
    /**
     * 角色。
     */
    characters: StoryMapCatalogCharacter[];
    /**
     * 场景。
     */
    scenes: StoryMapCatalogScene[];
    /**
     * 音色。
     */
    voices: StoryMapCatalogVoice[];
    /**
     * beat。
     */
    beats: StoryMapCatalogBeat[];
}

/**
 * 图谱节点 / 边（宽松结构，Web 直接渲染）。
 */
export interface StoryMapGraph {
    /**
     * 角色节点。
     */
    characters: Array<Record<string, unknown>>;
    /**
     * 场景节点。
     */
    scenes: Array<Record<string, unknown>>;
    /**
     * 角色-场景边。
     */
    character_scene_edges: Array<Record<string, unknown>>;
    /**
     * 形态-场景边。
     */
    form_scene_edges: Array<Record<string, unknown>>;
    /**
     * 共现边。
     */
    cooccurrence_edges: Array<Record<string, unknown>>;
}

/**
 * 解析后的完整剧情图谱。
 */
export interface StoryMapResolved {
    /**
     * 剧集 id。
     */
    episode_id: string;
    /**
     * 数据来源。
     */
    origin: StoryMapOrigin;
    /**
     * 时间轴。
     */
    time: StoryMapTime;
    /**
     * 目录。
     */
    catalog: StoryMapCatalog;
    /**
     * 事件。
     */
    events: StoryMapEventView[];
    /**
     * 图谱。
     */
    graph: StoryMapGraph;
    /**
     * 生成上下文。
     */
    generation: StoryMapGeneration;
    /**
     * 叙事关系。
     */
    relations: StoryMapRelation[];
    /**
     * 警告。
     */
    warnings: StoryMapGap[];
}

/**
 * 解析后的角色。
 */
interface ResolvedCast {
    /**
     * 角色 id。
     */
    id: string;
    /**
     * 角色名。
     */
    name: string;
    /**
     * 形态 id。
     */
    form: string;
    /**
     * 形态名。
     */
    form_name: string;
    /**
     * 形态来源。
     */
    form_source: "explicit" | "default" | "fallback" | "unknown";
    /**
     * 主参考资产 id。
     */
    reference_asset_id: string | null;
    /**
     * 主参考是否可用。
     */
    reference_present: boolean;
    /**
     * 形态全部资产。
     */
    assets: StoryMapAssetRef[];
    /**
     * 是否未知角色。
     */
    unknown: boolean;
}

/**
 * 解析后的场景。
 */
interface ResolvedScene {
    /**
     * 场景 id。
     */
    id: string;
    /**
     * 场景名。
     */
    name: string;
    /**
     * 主参考资产 id。
     */
    reference_asset_id: string | null;
    /**
     * 主参考是否可用。
     */
    reference_present: boolean;
    /**
     * 全部资产。
     */
    assets: StoryMapAssetRef[];
    /**
     * 是否未知场景。
     */
    unknown: boolean;
    /**
     * 时间。
     */
    time_of_day: string | null;
    /**
     * 内外景。
     */
    interior_exterior: string | null;
}

/**
 * 解析后的音色。
 */
interface ResolvedVoice {
    /**
     * 角色 id。
     */
    character_id: string;
    /**
     * 音色 id。
     */
    voice_id: string;
    /**
     * 模式。
     */
    mode: string;
    /**
     * 主参考资产 id。
     */
    reference_asset_id: string | null;
    /**
     * 主参考是否可用。
     */
    reference_present: boolean;
    /**
     * 全部资产。
     */
    assets: StoryMapAssetRef[];
}

/**
 * 叙事标注读取结果。
 */
export interface StoryMapAnnotationRead {
    /**
     * 标注文档。
     */
    doc: StoryMapFile | null;
    /**
     * 读取警告。
     */
    warnings: StoryMapGap[];
}

/**
 * 单个镜头的事实输入。
 */
interface EventFacts {
    /**
     * 镜头。
     */
    shot: ShotSpec;
    /**
     * 起始秒数。
     */
    at_seconds: number;
    /**
     * 起始是否估算。
     */
    at_estimated: boolean;
    /**
     * 时长。
     */
    duration_seconds: number | null;
    /**
     * 角色。
     */
    cast: ResolvedCast[];
    /**
     * 场景。
     */
    scene: ResolvedScene | null;
    /**
     * 音色。
     */
    voices: ResolvedVoice[];
    /**
     * beat id。
     */
    beat_ids: string[];
    /**
     * 台词数。
     */
    dialogue_count: number;
    /**
     * relay 上游。
     */
    relay_from: string | null;
    /**
     * 首帧锚点。
     */
    anchor: StoryMapAnchor | null;
    /**
     * 缺口。
     */
    gaps: StoryMapGap[];
}

/**
 * 计算文件 sha256；不存在返回空串。
 */
function hashIfExists(file: string): string {
    return existsSync(file) ? sha256File(file) : "";
}

/**
 * 读取项目配置（缺失返回 null）。
 */
function projectOf(root: string): ProjectConfig | null {
    // 项目文件
    const file = join(root, PROJECT_FILE);
    if (!existsSync(file)) return null;
    try {
        return JSON.parse(readFileSync(file, "utf8")) as ProjectConfig;
    } catch {
        return null;
    }
}

/**
 * 宽松记录视图。
 */
function recordOf(value: unknown): Record<string, unknown> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

/**
 * 宽松数组视图。
 */
function arrayOf(value: unknown): unknown[] {
    if (value === null || value === undefined) return [];
    return Array.isArray(value) ? value : [value];
}

/**
 * 字符串字段。
 */
function stringOf(value: unknown): string | null {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * 判断产物类型。
 */
function outputKind(name: string): StoryMapRenderOutput["kind"] {
    // 小写扩展名
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    if (VIDEO_EXTENSIONS.has(ext)) return "video";
    if (IMAGE_EXTENSIONS.has(ext)) return "image";
    if (AUDIO_EXTENSIONS.has(ext)) return "audio";
    if (JSON_EXTENSIONS.has(ext)) return "json";
    if (TEXT_EXTENSIONS.has(ext)) return "text";
    return "other";
}

/**
 * 构造资产引用。
 */
function assetRefOf(root: string, asset: StoryAsset): StoryMapAssetRef {
    // 绝对路径
    const abs = join(root, asset.path);
    // 是否存在
    const present = existsSync(abs);
    // 实际字节数
    let bytes = asset.bytes;
    // LFS pointer
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
    return {
        id: asset.id,
        role: asset.role ?? null,
        path: asset.path,
        media_url: storyMediaUrl(asset.path),
        present,
        lfs_pointer: lfsPointer,
        width: asset.width ?? null,
        height: asset.height ?? null,
        content_type: asset.content_type,
        bytes,
    };
}

/**
 * 主参考资产。
 */
function referenceAssetOf(
    root: string,
    assets: StoryAsset[],
    referenceId: string | null | undefined,
): StoryMapAssetRef | null {
    if (referenceId === undefined || referenceId === null || referenceId === "") return null;
    // 资产
    const asset = assets.find((item) => item.id === referenceId);
    return asset !== undefined ? assetRefOf(root, asset) : null;
}

/**
 * 解析角色引用。
 */
function parseCastRef(value: unknown): { id: string | null; name: string | null; form: string | null } | null {
    if (typeof value === "string") {
        // 斜杠
        const slash = value.indexOf("/");
        if (slash > 0) return { id: value.slice(0, slash), name: null, form: value.slice(slash + 1) };
        return { id: value, name: null, form: null };
    }
    // 对象视图
    const record = recordOf(value);
    if (record === null) return null;
    // 标识
    const id = stringOf(record.id);
    // 名称
    const name = stringOf(record.name);
    // 形态
    const form = stringOf(record.form);
    if (id === null && name === null) return null;
    return { id, name, form };
}

/**
 * 匹配角色。
 */
function matchCharacter(
    characters: StoryCharactersFile,
    ref: { id: string | null; name: string | null },
): StoryCharacter | null {
    if (ref.id !== null) {
        // id 精确匹配
        const byId = characters.characters.find((item) => item.id === ref.id);
        if (byId !== undefined) return byId;
    }
    if (ref.name !== null) {
        // 名称 / 别名匹配
        const byName = characters.characters.find(
            (item) => item.name === ref.name || (item.aliases ?? []).includes(ref.name as string),
        );
        if (byName !== undefined) return byName;
    }
    return null;
}

/**
 * 解析一个角色引用。
 */
function resolveCast(
    root: string,
    value: unknown,
    characters: StoryCharactersFile,
    shotId: string,
    gaps: StoryMapGap[],
): ResolvedCast | null {
    // 引用
    const ref = parseCastRef(value);
    if (ref === null) return null;
    // 角色
    const character = matchCharacter(characters, ref);
    if (character === null) {
        // 未知角色
        const id = ref.id ?? ref.name ?? "unknown";
        gaps.push({
            code: "unknown_character",
            severity: BLOCKER,
            shot_id: shotId,
            ref: `character:${id}`,
            message: `镜头 ${shotId} 引用了不存在的角色 ${id}`,
            hint: "修正 shots.json，或在 story/characters.json 中补角色。",
        });
        return {
            id,
            name: ref.name ?? id,
            form: ref.form ?? "default",
            form_name: ref.form ?? "default",
            form_source: "unknown",
            reference_asset_id: null,
            reference_present: false,
            assets: [],
            unknown: true,
        };
    }
    // 形态
    const explicitForm = ref.form;
    // 默认形态
    const defaultForm = character.forms.find((item) => item.id === character.default_form) ?? character.forms[0];
    // 形态
    let form: StoryForm | null;
    // 形态来源
    let formSource: ResolvedCast["form_source"];
    if (explicitForm !== null) {
        form = character.forms.find((item) => item.id === explicitForm) ?? null;
        if (form === null) {
            form = defaultForm ?? null;
            formSource = "fallback";
            gaps.push({
                code: "unknown_form",
                severity: WARNING,
                shot_id: shotId,
                ref: `character:${character.id}/form:${explicitForm}`,
                message: `角色 ${character.id} 没有形态 ${explicitForm}，已回退默认形态`,
                hint: "修正 shots.json 的形态引用，或补全局形态。",
            });
        } else {
            formSource = "explicit";
        }
    } else {
        form = defaultForm ?? null;
        formSource = "default";
        if (character.forms.length > 1) {
            gaps.push({
                code: "form_ambiguous",
                severity: WARNING,
                shot_id: shotId,
                ref: `character:${character.id}`,
                message: `镜头 ${shotId} 未指定 ${character.id} 的形态，已使用默认形态 ${character.default_form}`,
                hint: "在 shots.json 中显式写 form。",
            });
        }
    }
    // 资产
    const assets = (form?.assets ?? []).map((asset) => assetRefOf(root, asset));
    // 主参考
    const reference = referenceAssetOf(root, form?.assets ?? [], form?.reference_asset);
    return {
        id: character.id,
        name: character.name,
        form: form?.id ?? "",
        form_name: form?.name ?? form?.id ?? "",
        form_source: formSource,
        reference_asset_id: reference?.id ?? null,
        reference_present: reference !== null && reference.present && !reference.lfs_pointer,
        assets,
        unknown: false,
    };
}

/**
 * 解析场景引用。
 */
function parseSceneRef(value: unknown): string | null {
    if (typeof value === "string") return value.trim() === "" ? null : value.trim();
    // 对象视图
    const record = recordOf(value);
    if (record === null) return null;
    return stringOf(record.id) ?? stringOf(record.name);
}

/**
 * 解析场景。
 */
function resolveScene(
    root: string,
    value: unknown,
    shots: ShotsFile,
    shotId: string,
    gaps: StoryMapGap[],
): ResolvedScene | null {
    // 引用
    const ref = parseSceneRef(value);
    if (ref === null) return null;
    // 全局场景
    const scenes = loadScenes(root);
    // 场景
    const scene = scenes.scenes.find((item) => item.id === ref || item.name === ref);
    if (scene === undefined) {
        gaps.push({
            code: "unknown_scene",
            severity: WARNING,
            shot_id: shotId,
            ref: `scene:${ref}`,
            message: `镜头 ${shotId} 引用了不存在的场景 ${ref}`,
            hint: "修正 shots.json，或在 story/scenes.json 中补场景。",
        });
        return {
            id: ref,
            name: ref,
            reference_asset_id: null,
            reference_present: false,
            assets: [],
            unknown: true,
            time_of_day: null,
            interior_exterior: null,
        };
    }
    // 资产
    const assets = scene.assets.map((asset) => assetRefOf(root, asset));
    // 主参考
    const reference = referenceAssetOf(root, scene.assets, scene.reference_asset);
    return {
        id: scene.id,
        name: scene.name,
        reference_asset_id: reference?.id ?? null,
        reference_present: reference !== null && reference.present && !reference.lfs_pointer,
        assets,
        unknown: false,
        time_of_day: scene.time_of_day ?? null,
        interior_exterior: scene.interior_exterior ?? null,
    };
}

/**
 * 解析台词音色。
 */
function resolveVoices(
    root: string,
    shot: ShotSpec,
    characters: StoryCharactersFile,
    shotId: string,
    gaps: StoryMapGap[],
): ResolvedVoice[] {
    // 音色文件
    const voicesFile = loadVoices(root);
    // 结果
    const out: ResolvedVoice[] = [];
    for (const line of shot.dialogue ?? []) {
        // 角色
        const character = characters.characters.find((item) => item.id === line.character);
        // 音色 id
        let voiceId = line.voice;
        if (voiceId === undefined || voiceId === "") {
            // 角色音色
            const ids = character?.voice_ids ?? [];
            if (ids.length > 1) {
                gaps.push({
                    code: "voice_ambiguous",
                    severity: WARNING,
                    shot_id: shotId,
                    ref: `character:${line.character}`,
                    message: `角色 ${line.character} 有多个音色，但台词未指定 voice`,
                    hint: "在 shots.json 的 dialogue[] 中显式写 voice。",
                });
                continue;
            }
            voiceId = ids[0];
        }
        if (voiceId === undefined || voiceId === "") continue;
        if (out.some((item) => item.voice_id === voiceId)) continue;
        // 音色
        const voice = voicesFile.voices.find((item) => item.id === voiceId);
        if (voice === undefined) {
            gaps.push({
                code: "unknown_voice",
                severity: WARNING,
                shot_id: shotId,
                ref: `voice:${voiceId}`,
                message: `镜头 ${shotId} 引用了不存在的音色 ${voiceId}`,
                hint: "修正 shots.json 的 dialogue，或补全局音色。",
            });
            continue;
        }
        // 主参考
        const reference = referenceAssetOf(root, voice.assets, voice.reference_asset);
        out.push({
            character_id: line.character,
            voice_id: voice.id,
            mode: voice.mode,
            reference_asset_id: reference?.id ?? null,
            reference_present: reference !== null && reference.present && !reference.lfs_pointer,
            assets: voice.assets.map((asset) => assetRefOf(root, asset)),
        });
    }
    return out;
}

/**
 * 角色视图。
 */
function castView(cast: ResolvedCast): StoryMapCharacterView {
    return {
        id: cast.id,
        name: cast.name,
        form: cast.form,
        form_name: cast.form_name,
        form_source: cast.form_source,
        reference_asset_id: cast.reference_asset_id,
        reference_present: cast.reference_present,
        asset_ids: cast.assets.map((asset) => asset.id),
    };
}

/**
 * 场景视图。
 */
function sceneView(scene: ResolvedScene | null): StoryMapSceneView | null {
    if (scene === null) return null;
    return {
        id: scene.id,
        name: scene.name,
        reference_asset_id: scene.reference_asset_id,
        reference_present: scene.reference_present,
        asset_ids: scene.assets.map((asset) => asset.id),
    };
}

/**
 * 音色视图。
 */
function voiceView(voice: ResolvedVoice): StoryMapVoiceView {
    return {
        character_id: voice.character_id,
        voice_id: voice.voice_id,
        mode: voice.mode,
        reference_asset_id: voice.reference_asset_id,
        reference_present: voice.reference_present,
    };
}

/**
 * 读取叙事标注（宽松；损坏时返回警告）。
 */
export function readStoryMapAnnotations(root: string, episodeId: string): StoryMapAnnotationRead {
    // 标注路径
    const file = storyMapPath(root, episodeId);
    if (!existsSync(file)) return { doc: null, warnings: [] };
    // 原始文档
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
        return {
            doc: null,
            warnings: [
                {
                    code: "story_map_invalid",
                    severity: WARNING,
                    shot_id: null,
                    ref: "story-map.json",
                    message: `story-map.json 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
                    hint: "修正文件，或删除它回到纯自动推导。",
                },
            ],
        };
    }
    // 对象视图
    const record = recordOf(raw);
    if (record === null) {
        return {
            doc: null,
            warnings: [
                {
                    code: "story_map_invalid",
                    severity: WARNING,
                    shot_id: null,
                    ref: "story-map.json",
                    message: "story-map.json 必须是对象",
                    hint: "修正文件，或删除它回到纯自动推导。",
                },
            ],
        };
    }
    if (record.version !== 1 || record.episode_id !== episodeId) {
        return {
            doc: null,
            warnings: [
                {
                    code: "story_map_invalid",
                    severity: WARNING,
                    shot_id: null,
                    ref: "story-map.json",
                    message: "story-map.json 的 version / episode_id 不匹配",
                    hint: "重新执行 story map build，或修正文件。",
                },
            ],
        };
    }
    // 警告
    const warnings: StoryMapGap[] = [];
    // 事件
    const events: StoryMapEvent[] = [];
    for (const item of arrayOf(record.events)) {
        // 事件视图
        const event = recordOf(item);
        // 镜头 id
        const shotId = event !== null ? stringOf(event.shot_id) : null;
        if (event === null || shotId === null) {
            warnings.push({
                code: "story_map_event_invalid",
                severity: WARNING,
                shot_id: null,
                ref: "story-map.json",
                message: "忽略缺少 shot_id 的事件标注",
                hint: "每个事件必须包含 shot_id。",
            });
            continue;
        }
        events.push(narrativeEventOf({ ...(event as unknown as StoryMapEvent), shot_id: shotId }));
    }
    // 关系
    const relations: StoryMapRelation[] = [];
    for (const item of arrayOf(record.relations)) {
        // 关系视图
        const relation = recordOf(item);
        // 端点
        const from = relation !== null ? stringOf(relation.from) : null;
        const to = relation !== null ? stringOf(relation.to) : null;
        // 标签
        const label = relation !== null ? stringOf(relation.label) : null;
        if (relation === null || from === null || to === null || label === null) {
            warnings.push({
                code: "story_map_relation_invalid",
                severity: WARNING,
                shot_id: null,
                ref: "story-map.json",
                message: "忽略缺少 from / to / label 的关系标注",
                hint: "关系必须包含 from / to / label。",
            });
            continue;
        }
        relations.push({
            ...(relation as unknown as StoryMapRelation),
            from,
            to,
            label,
        });
    }
    return {
        doc: {
            ...(record as unknown as StoryMapFile),
            version: 1,
            episode_id: episodeId,
            events,
            relations,
        },
        warnings,
    };
}

/**
 * 当前事实哈希。
 */
export function storyMapSource(root: string, episodeId: string, script: ScriptMeta): StoryMapFile["source"] {
    return {
        script_revision: script.revision,
        script_sha256: script.sha256,
        breakdown_sha256: hashIfExists(join(episodeDir(root, episodeId), BREAKDOWN_FILE)),
        shots_sha256: hashIfExists(join(episodeDir(root, episodeId), SHOTS_FILE)),
    };
}

/**
 * 重要度推导。
 */
function importanceOf(
    index: number,
    previousSceneId: string | null,
    sceneId: string | null,
    cast: ResolvedCast[],
    dialogueCount: number,
): StoryMapImportance {
    if (index === 0 || sceneId !== previousSceneId) return "major";
    if (cast.length === 0 && dialogueCount === 0) return "minor";
    return "normal";
}

/**
 * 构造图谱。
 */
function buildGraph(events: StoryMapEventView[]): StoryMapGraph {
    // 角色聚合
    const characters = new Map<string, Record<string, unknown>>();
    // 场景聚合
    const scenes = new Map<string, Record<string, unknown>>();
    // 角色-场景边
    const characterSceneEdges = new Map<string, Record<string, unknown>>();
    // 形态-场景边
    const formSceneEdges = new Map<string, Record<string, unknown>>();
    // 共现边
    const cooccurrenceEdges = new Map<string, Record<string, unknown>>();
    for (const event of events) {
        // 场景
        const scene = event.scene;
        // 时长
        const duration = event.duration_seconds ?? 0;
        if (scene !== null) {
            // 场景节点
            const sceneNode = scenes.get(scene.id) ?? {
                id: scene.id,
                name: scene.name,
                time_of_day: null,
                interior_exterior: null,
                event_count: 0,
                duration_seconds: 0,
                character_ids: [],
            };
            sceneNode.event_count = Number(sceneNode.event_count) + 1;
            sceneNode.duration_seconds = Number(sceneNode.duration_seconds) + duration;
            scenes.set(scene.id, sceneNode);
        }
        // 角色对
        const pairs = new Set<string>();
        for (const character of event.characters) {
            // 角色节点
            const characterNode = characters.get(character.id) ?? {
                id: character.id,
                name: character.name,
                role: null,
                event_count: 0,
                duration_seconds: 0,
                scene_ids: [],
                forms: [],
            };
            characterNode.event_count = Number(characterNode.event_count) + 1;
            characterNode.duration_seconds = Number(characterNode.duration_seconds) + duration;
            // 场景 id
            if (scene !== null && !(characterNode.scene_ids as string[]).includes(scene.id)) {
                (characterNode.scene_ids as string[]).push(scene.id);
            }
            // 形态
            const forms = characterNode.forms as Array<Record<string, unknown>>;
            const formNode = forms.find((item) => item.id === character.form) ?? {
                id: character.form,
                name: character.form_name,
                event_count: 0,
                scene_ids: [],
            };
            formNode.event_count = Number(formNode.event_count) + 1;
            if (scene !== null && !(formNode.scene_ids as string[]).includes(scene.id)) {
                (formNode.scene_ids as string[]).push(scene.id);
            }
            if (!forms.includes(formNode)) forms.push(formNode);
            characters.set(character.id, characterNode);
            if (scene !== null) {
                // 角色-场景边
                const key = `${character.id}|${scene.id}`;
                const edge = characterSceneEdges.get(key) ?? {
                    character_id: character.id,
                    scene_id: scene.id,
                    event_count: 0,
                    duration_seconds: 0,
                    form_ids: [],
                    event_ids: [],
                };
                edge.event_count = Number(edge.event_count) + 1;
                edge.duration_seconds = Number(edge.duration_seconds) + duration;
                if (!(edge.form_ids as string[]).includes(character.form))
                    (edge.form_ids as string[]).push(character.form);
                if (!(edge.event_ids as string[]).includes(event.shot_id))
                    (edge.event_ids as string[]).push(event.shot_id);
                characterSceneEdges.set(key, edge);
                // 形态-场景边
                const formKey = `${character.id}/${character.form}|${scene.id}`;
                const formEdge = formSceneEdges.get(formKey) ?? {
                    character_id: character.id,
                    form_id: character.form,
                    scene_id: scene.id,
                    event_count: 0,
                    duration_seconds: 0,
                    event_ids: [],
                };
                formEdge.event_count = Number(formEdge.event_count) + 1;
                formEdge.duration_seconds = Number(formEdge.duration_seconds) + duration;
                if (!(formEdge.event_ids as string[]).includes(event.shot_id))
                    (formEdge.event_ids as string[]).push(event.shot_id);
                formSceneEdges.set(formKey, formEdge);
            }
            for (const other of event.characters) {
                if (other.id === character.id) continue;
                const pair = [character.id, other.id].sort();
                pairs.add(pair.join("|"));
            }
        }
        for (const pair of pairs) {
            const [a, b] = pair.split("|");
            if (a === undefined || b === undefined) continue;
            const edge = cooccurrenceEdges.get(pair) ?? {
                a,
                b,
                event_count: 0,
                event_ids: [],
            };
            edge.event_count = Number(edge.event_count) + 1;
            if (!(edge.event_ids as string[]).includes(event.shot_id)) (edge.event_ids as string[]).push(event.shot_id);
            cooccurrenceEdges.set(pair, edge);
        }
    }
    // 场景角色列表
    for (const edge of characterSceneEdges.values()) {
        // 场景节点
        const sceneNode = scenes.get(String(edge.scene_id));
        if (sceneNode === undefined) continue;
        // 角色 id
        const characterId = String(edge.character_id);
        const ids = sceneNode.character_ids as string[];
        if (!ids.includes(characterId)) ids.push(characterId);
    }
    return {
        characters: Array.from(characters.values()).sort(
            (a, b) => Number(b.event_count) - Number(a.event_count) || String(a.name).localeCompare(String(b.name)),
        ),
        scenes: Array.from(scenes.values()).sort(
            (a, b) => Number(b.event_count) - Number(a.event_count) || String(a.name).localeCompare(String(b.name)),
        ),
        character_scene_edges: Array.from(characterSceneEdges.values()).sort(
            (a, b) => Number(b.event_count) - Number(a.event_count),
        ),
        form_scene_edges: Array.from(formSceneEdges.values()).sort(
            (a, b) => Number(b.event_count) - Number(a.event_count),
        ),
        cooccurrence_edges: Array.from(cooccurrenceEdges.values()).sort(
            (a, b) => Number(b.event_count) - Number(a.event_count),
        ),
    };
}

/**
 * 构造角色目录。
 */
function buildCatalog(
    root: string,
    characters: StoryCharactersFile,
    events: StoryMapEventView[],
    usedVoiceIds: Set<string>,
    beats: StoryMapCatalogBeat[],
): { catalog: StoryMapCatalog; warnings: StoryMapGap[] } {
    // 角色使用次数
    const characterCounts = new Map<string, number>();
    // 形态使用次数
    const formCounts = new Map<string, number>();
    // 场景使用次数
    const sceneCounts = new Map<string, number>();
    // 角色目录表
    const characterMap = new Map<string, StoryMapCatalogCharacter>();
    // 场景目录表
    const sceneMap = new Map<string, StoryMapCatalogScene>();
    // 警告
    const warnings: StoryMapGap[] = [];
    for (const event of events) {
        // 场景
        if (event.scene !== null) {
            sceneCounts.set(event.scene.id, (sceneCounts.get(event.scene.id) ?? 0) + 1);
        }
        for (const character of event.characters) {
            characterCounts.set(character.id, (characterCounts.get(character.id) ?? 0) + 1);
            formCounts.set(
                `${character.id}/${character.form}`,
                (formCounts.get(`${character.id}/${character.form}`) ?? 0) + 1,
            );
        }
    }
    // 全局角色
    for (const character of characters.characters) {
        // 形态
        const forms: StoryMapCatalogForm[] = character.forms.map((form) => {
            // 资产
            const assets = form.assets.map((asset) => assetRefOf(root, asset));
            // 主参考
            const reference = referenceAssetOf(root, form.assets, form.reference_asset);
            // 使用次数
            const eventCount = formCounts.get(`${character.id}/${form.id}`) ?? 0;
            if (eventCount > 0 && reference === null) {
                warnings.push({
                    code: "missing_reference",
                    severity: WARNING,
                    shot_id: null,
                    ref: `character:${character.id}/form:${form.id}`,
                    message: `角色形态 ${character.id}/${form.id} 没有显式主参考图`,
                    hint: "story asset set-reference --owner character:<id> --form <form> --id <asset>",
                });
            }
            return {
                id: form.id,
                name: form.name,
                description: form.description ?? null,
                used: eventCount > 0,
                event_count: eventCount,
                reference_asset: reference,
                assets,
            };
        });
        characterMap.set(character.id, {
            id: character.id,
            name: character.name,
            role: character.role ?? null,
            default_form: character.default_form,
            unknown: false,
            forms,
        });
    }
    // 未知角色补目录
    for (const event of events) {
        for (const character of event.characters) {
            if (characterMap.has(character.id)) continue;
            characterMap.set(character.id, {
                id: character.id,
                name: character.name,
                role: null,
                default_form: character.form,
                unknown: true,
                forms: [
                    {
                        id: character.form,
                        name: character.form_name,
                        description: null,
                        used: true,
                        event_count: characterCounts.get(character.id) ?? 0,
                        reference_asset: null,
                        assets: [],
                    },
                ],
            });
        }
    }
    // 全局场景
    const scenes = loadScenes(root);
    for (const scene of scenes.scenes) {
        // 资产
        const assets = scene.assets.map((asset) => assetRefOf(root, asset));
        // 主参考
        const reference = referenceAssetOf(root, scene.assets, scene.reference_asset);
        // 使用次数
        const eventCount = sceneCounts.get(scene.id) ?? 0;
        if (eventCount > 0 && reference === null) {
            warnings.push({
                code: "missing_reference",
                severity: WARNING,
                shot_id: null,
                ref: `scene:${scene.id}`,
                message: `场景 ${scene.id} 没有显式主参考图`,
                hint: "story asset set-reference --owner scene:<id> --id <asset>",
            });
        }
        sceneMap.set(scene.id, {
            id: scene.id,
            name: scene.name,
            description: scene.description ?? null,
            time_of_day: scene.time_of_day ?? null,
            interior_exterior: scene.interior_exterior ?? null,
            mood: scene.mood ?? null,
            used: eventCount > 0,
            event_count: eventCount,
            unknown: false,
            reference_asset: reference,
            assets,
        });
    }
    // 未知场景补目录
    for (const event of events) {
        if (event.scene === null || sceneMap.has(event.scene.id)) continue;
        sceneMap.set(event.scene.id, {
            id: event.scene.id,
            name: event.scene.name,
            description: null,
            time_of_day: null,
            interior_exterior: null,
            mood: null,
            used: true,
            event_count: sceneCounts.get(event.scene.id) ?? 0,
            unknown: true,
            reference_asset: null,
            assets: [],
        });
    }
    // 音色
    const voicesFile = loadVoices(root);
    const voices: StoryMapCatalogVoice[] = voicesFile.voices.map((voice) => {
        // 资产
        const assets = voice.assets.map((asset) => assetRefOf(root, asset));
        // 主参考
        const reference = referenceAssetOf(root, voice.assets, voice.reference_asset);
        if (usedVoiceIds.has(voice.id) && voice.mode === "reference" && reference === null) {
            warnings.push({
                code: "missing_reference",
                severity: WARNING,
                shot_id: null,
                ref: `voice:${voice.id}`,
                message: `音色 ${voice.id} 是 reference 模式，但没有显式参考音频`,
                hint: "story asset set-reference --owner voice:<id> --id <asset>",
            });
        }
        return {
            id: voice.id,
            character_id: voice.character_id,
            name: voice.name,
            mode: voice.mode,
            description: voice.description ?? null,
            used: usedVoiceIds.has(voice.id),
            reference_asset: reference,
            assets,
        };
    });
    return {
        catalog: {
            characters: Array.from(characterMap.values()).sort(
                (a, b) =>
                    (characterCounts.get(b.id) ?? 0) - (characterCounts.get(a.id) ?? 0) || a.name.localeCompare(b.name),
            ),
            scenes: Array.from(sceneMap.values()).sort(
                (a, b) => (sceneCounts.get(b.id) ?? 0) - (sceneCounts.get(a.id) ?? 0) || a.name.localeCompare(b.name),
            ),
            voices,
            beats,
        },
        warnings,
    };
}

/**
 * 需要读取的角色。
 */
function shotCastRefs(shot: ShotSpec): unknown[] {
    // 镜头字段
    const direct = (shot as unknown as Record<string, unknown>).characters;
    if (direct !== undefined) return arrayOf(direct);
    // params 字段
    const params = recordOf(shot.params);
    return arrayOf(params?.characters);
}

/**
 * 需要读取的场景。
 */
function shotSceneRef(shot: ShotSpec): unknown {
    // 镜头字段
    const record = shot as unknown as Record<string, unknown>;
    // params
    const params = recordOf(shot.params);
    return record.scene ?? record.location ?? record.set ?? params?.scene ?? params?.location ?? params?.set;
}

/**
 * relay 上游。
 */
function relayOf(shot: ShotSpec): string | null {
    // 首帧
    const first = shot.first_frame;
    if (first === undefined || typeof first === "string") return null;
    return typeof first.relay === "string" && first.relay !== "" ? first.relay : null;
}

/**
 * anchor。
 */
function anchorOf(root: string, shot: ShotSpec, shots: ShotsFile): StoryMapAnchor | null {
    // 首帧
    const first = shot.first_frame;
    if (typeof first !== "string" || first === "") return null;
    // 路径
    const path = shots.meta.anchors[first];
    if (path === undefined || path === "") return null;
    return { key: first, path, present: existsSync(join(root, path)) };
}

/**
 * 构造事件事实。
 */
function buildEventFacts(
    root: string,
    shots: ShotsFile,
    characters: StoryCharactersFile,
    fps: number | null,
    beats: Map<string, string>,
): EventFacts[] {
    // 事实列表
    const facts: EventFacts[] = [];
    // 时间游标
    let cursor = 0;
    // 是否已出现未知时长
    let estimated = false;
    for (const shot of shots.shots) {
        // 缺口
        const gaps: StoryMapGap[] = [];
        // 时长
        const length = shot.length ?? shots.defaults.length ?? null;
        const duration =
            typeof shot.duration === "number"
                ? shot.duration
                : length !== null && fps !== null && fps > 0
                  ? length / fps
                  : null;
        // 起始时间
        const atSeconds = cursor;
        // 起始是否估算
        const atEstimated = estimated || duration === null;
        if (duration !== null) cursor += duration;
        else estimated = true;
        // 角色
        const cast: ResolvedCast[] = [];
        for (const ref of shotCastRefs(shot)) {
            // 角色
            const resolved = resolveCast(root, ref, characters, shot.id, gaps);
            if (resolved !== null && !cast.some((item) => item.id === resolved.id)) cast.push(resolved);
        }
        // 场景
        const scene = resolveScene(root, shotSceneRef(shot), shots, shot.id, gaps);
        // 音色
        const voices = resolveVoices(root, shot, characters, shot.id, gaps);
        // beat
        const beatIds = (shot.script_refs ?? []).filter((id) => typeof id === "string");
        for (const beatId of beatIds) {
            if (!beats.has(beatId)) {
                gaps.push({
                    code: "unknown_beat",
                    severity: WARNING,
                    shot_id: shot.id,
                    ref: `beat:${beatId}`,
                    message: `镜头 ${shot.id} 引用了不存在的 beat ${beatId}`,
                    hint: "修正 shots.json 的 script_refs，或补拆解 beats。",
                });
            }
        }
        // relay
        const relayFrom = relayOf(shot);
        if (relayFrom !== null && !shots.shots.some((item) => item.id === relayFrom)) {
            gaps.push({
                code: "relay_upstream_missing",
                severity: BLOCKER,
                shot_id: shot.id,
                ref: `shot:${relayFrom}`,
                message: `镜头 ${shot.id} 的 relay 上游 ${relayFrom} 不存在`,
                hint: "修正 first_frame.relay，或先补上游镜头。",
            });
        }
        // anchor
        const anchor = anchorOf(root, shot, shots);
        if (typeof shot.first_frame === "string" && shot.first_frame !== "" && anchor === null) {
            gaps.push({
                code: "anchor_not_found",
                severity: BLOCKER,
                shot_id: shot.id,
                ref: shot.first_frame,
                message: `镜头 ${shot.id} 的 anchor ${shot.first_frame} 未在 meta.anchors 中定义`,
                hint: "修正 shots.json 的 first_frame 或 meta.anchors。",
            });
        } else if (anchor !== null && !anchor.present) {
            gaps.push({
                code: "anchor_not_found",
                severity: BLOCKER,
                shot_id: shot.id,
                ref: anchor.path,
                message: `镜头 ${shot.id} 的 anchor 文件不存在：${anchor.path}`,
                hint: "补齐 anchor 文件。",
            });
        }
        facts.push({
            shot,
            at_seconds: atSeconds,
            at_estimated: atEstimated,
            duration_seconds: duration,
            cast,
            scene,
            voices,
            beat_ids: beatIds,
            dialogue_count: shot.dialogue?.length ?? 0,
            relay_from: relayFrom,
            anchor,
            gaps,
        });
    }
    return facts;
}

/**
 * 数字字段。
 */
function numberOf(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * 构造单个 workflow 候选。
 */
function buildWorkflowCandidate(
    root: string,
    name: string,
    rel: string,
    abs: string,
    project: ProjectConfig | null,
): StoryMapWorkflowCandidate {
    // 图合法
    let valid = false;
    // 节点数
    let nodeCount = 0;
    // 节点类名
    let nodeClasses: string[] = [];
    // 图错误
    let graphError: string | null = null;
    try {
        // 工作流
        const loaded = loadGraphFile(abs, rel);
        valid = true;
        // 节点列表
        const nodes = Object.values(loaded.graph);
        nodeCount = nodes.length;
        // 类名集合
        const classes = new Set<string>();
        for (const node of nodes) {
            // 节点视图
            const record = recordOf(node);
            // 类名
            const cls = stringOf(record?.class_type);
            if (cls !== null) classes.add(cls);
        }
        nodeClasses = Array.from(classes).slice(0, MAX_NODE_CLASSES);
    } catch (e) {
        graphError = e instanceof Error ? e.message : String(e);
    }
    // bindings
    let bindings: string[] = [];
    // 是否有 bindings
    let hasBindings = false;
    try {
        // bindings 文件
        const parsed = loadBindings(abs);
        if (parsed !== null) {
            bindings = Object.keys(parsed);
            hasBindings = true;
        }
    } catch {
        // bindings 损坏按缺失处理
    }
    // 资产槽位
    let assetSlots: WorkflowAssetSlot[] = [];
    // 槽位错误
    let slotError: string | null = null;
    try {
        // 槽位文件
        const file = loadWorkflowAssets(abs);
        assetSlots = file?.slots ?? [];
    } catch (e) {
        slotError = e instanceof Error ? e.message : String(e);
    }
    // 不可用原因
    const reasons: string[] = [];
    if (!valid) reasons.push(graphError ?? "工作流图非法");
    if (slotError !== null) reasons.push(`资产槽位文件非法：${slotError}`);
    if (!hasBindings) reasons.push("缺少 bindings 文件");
    else {
        if (!bindings.includes("prompt")) reasons.push("bindings 缺少 prompt");
        if (!bindings.includes("seed")) reasons.push("bindings 缺少 seed");
    }
    // 默认引用
    const defaultRef = (project?.default_workflow ?? "").trim();
    // 是否默认
    const isDefault = defaultRef === name || defaultRef === rel || defaultRef === `${WORKFLOWS_DIR}/${name}.json`;
    return {
        name,
        path: rel,
        default: isDefault,
        valid,
        has_bindings: hasBindings,
        bindings,
        node_count: nodeCount,
        node_classes: nodeClasses,
        asset_slots: assetSlots,
        unusable_reasons: reasons,
    };
}

/**
 * 扫描工作流候选。
 */
function collectWorkflowCatalog(root: string, project: ProjectConfig | null): StoryMapWorkflowCandidate[] {
    // 工作流目录
    const dir = join(root, WORKFLOWS_DIR);
    if (!existsSync(dir)) return [];
    // 结果
    const out: StoryMapWorkflowCandidate[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
        if (entry.name.endsWith(".bindings.json") || entry.name.endsWith(".assets.json")) continue;
        // 短名
        const name = entry.name.slice(0, -".json".length);
        // 相对路径
        const rel = `${WORKFLOWS_DIR}/${entry.name}`;
        out.push(buildWorkflowCandidate(root, name, rel, join(dir, entry.name), project));
    }
    return out.sort((a, b) => Number(b.default) - Number(a.default) || a.name.localeCompare(b.name));
}

/**
 * workflow 缺口转地图缺口。
 */
function mapWorkflowGap(
    gap: {
        code: string;
        severity: "blocker" | "warning";
        slot: string | null;
        owner: string | null;
        message: string;
        hint: string;
    },
    shotId: string,
): StoryMapGap {
    return {
        code: gap.code,
        severity: gap.severity,
        shot_id: shotId,
        ref: gap.slot !== null ? `${gap.slot}:${gap.owner ?? ""}` : gap.owner,
        message: gap.message,
        hint: gap.hint,
    };
}

/**
 * 判断候选 workflow 对镜头的适配度（轻量预检）。
 */
function candidateFit(candidate: StoryMapWorkflowCandidate, fact: EventFacts): StoryMapCandidateFit {
    if (candidate.unusable_reasons.length > 0) {
        return { name: candidate.name, fit: "unusable", reasons: [...candidate.unusable_reasons] };
    }
    // 必填槽位
    const required = candidate.asset_slots.filter((slot) => slot.required !== false);
    // 角色槽位
    const characterSlots = required.filter((slot) => slot.kind === "character");
    // 场景槽位
    const sceneSlots = required.filter((slot) => slot.kind === "scene");
    // 音色槽位
    const voiceSlots = required.filter((slot) => slot.kind === "voice");
    // 不可用原因
    const reasons: string[] = [];
    if (characterSlots.length > fact.cast.length)
        reasons.push(`需要 ${characterSlots.length} 个角色，镜头只有 ${fact.cast.length} 个`);
    if (sceneSlots.length > 0 && fact.scene === null) reasons.push("需要场景，但镜头没有场景");
    if (voiceSlots.length > 0 && fact.voices.length === 0) reasons.push("需要音色，但镜头没有台词音色");
    if (reasons.length > 0) return { name: candidate.name, fit: "unusable", reasons };
    // 缺失资产
    const missing: string[] = [];
    for (const [index, slot] of characterSlots.entries()) {
        // 角色
        const cast = fact.cast[index];
        if (cast === undefined) {
            missing.push(`${slot.name} 缺少角色`);
            continue;
        }
        if (slot.asset === "reference") {
            if (!cast.reference_present) missing.push(`${cast.id}/${cast.form} 缺少可用主参考`);
        } else {
            // 指定资产
            const asset = cast.assets.find((item) => item.id === slot.asset);
            if (asset === undefined || !asset.present || asset.lfs_pointer)
                missing.push(`${cast.id}/${cast.form} 缺少资产 ${slot.asset}`);
        }
    }
    for (const slot of sceneSlots) {
        if (fact.scene === null) continue;
        if (slot.asset === "reference") {
            if (!fact.scene.reference_present) missing.push(`场景 ${fact.scene.id} 缺少可用主参考`);
        } else {
            // 指定资产
            const asset = fact.scene.assets.find((item) => item.id === slot.asset);
            if (asset === undefined || !asset.present || asset.lfs_pointer)
                missing.push(`场景 ${fact.scene.id} 缺少资产 ${slot.asset}`);
        }
    }
    for (const [index, slot] of voiceSlots.entries()) {
        // 音色
        const voice = fact.voices[index];
        if (voice === undefined) {
            missing.push(`${slot.name} 缺少音色`);
            continue;
        }
        if (slot.asset === "reference") {
            if (!voice.reference_present) missing.push(`音色 ${voice.voice_id} 缺少可用参考音频`);
        } else {
            // 指定资产
            const asset = voice.assets.find((item) => item.id === slot.asset);
            if (asset === undefined || !asset.present || asset.lfs_pointer)
                missing.push(`音色 ${voice.voice_id} 缺少资产 ${slot.asset}`);
        }
    }
    if (missing.length > 0) return { name: candidate.name, fit: "needs_assets", reasons: missing };
    return { name: candidate.name, fit: "ready", reasons: [] };
}

/**
 * 构造渲染索引。
 */
function buildRenderIndex(root: string, episodeId: string): Map<string, StoryMapRender> {
    // label 前缀
    const prefix = `ep:${episodeId}:shot:`;
    // 剧集上下文（定稿稿件查询）
    const context = resolveEpisodeContext(root, episodeId);
    // 全部 run（一次读取）
    const allRuns = listRuns(root);
    // 分组
    const groups = new Map<string, RunRecord[]>();
    for (const run of allRuns) {
        if (run.label === null || !run.label.startsWith(prefix)) continue;
        // 镜头 id
        const shotId = run.label.slice(prefix.length);
        // 当前列表
        const list = groups.get(shotId) ?? [];
        list.push(run);
        groups.set(shotId, list);
    }
    // 索引
    const index = new Map<string, StoryMapRender>();
    for (const [shotId, runs] of groups) {
        // 最新 run
        const latest = runs[0] ?? null;
        // 本镜选稿（定稿优先）
        const take = pickShotTake(root, context, shotId, allRuns);
        // 定稿 run
        const finalized = take.source === "finalized" ? take.run : null;
        // 定稿稿件
        const finalizedOutput = take.source === "finalized" ? take.output : null;
        index.set(shotId, {
            runs_count: runs.length,
            succeeded_count: runs.filter((run) => run.status === "succeeded").length,
            latest_run_id: latest?.run_id ?? null,
            latest_status: latest?.status ?? null,
            latest_outputs: (latest?.outputs ?? []).map((output) => ({
                name: output.name,
                kind: outputKind(output.name),
                media_url: `${RUN_MEDIA_PREFIX}/${encodeURIComponent(latest?.run_id ?? "")}/${encodeURIComponent(output.name)}`,
                bytes: output.bytes,
            })),
            finalized_run_id: finalized?.run_id ?? null,
            finalized_outputs:
                finalized !== null && finalizedOutput !== null
                    ? [
                          {
                              name: finalizedOutput.name,
                              kind: outputKind(finalizedOutput.name),
                              media_url: `${RUN_MEDIA_PREFIX}/${encodeURIComponent(finalized.run_id)}/${encodeURIComponent(finalizedOutput.name)}`,
                              bytes: finalizedOutput.bytes,
                          },
                      ]
                    : [],
            latest_finished_at: latest?.finished_at ?? null,
            latest_error: latest?.error?.message ?? null,
        });
    }
    return index;
}

/**
 * 构造单个镜头的生成上下文。
 */
function buildGenerationEvent(
    root: string,
    event: StoryMapEventView,
    fact: EventFacts,
    shots: ShotsFile,
    project: ProjectConfig | null,
    workflows: StoryMapWorkflowCandidate[],
    renderIndex: Map<string, StoryMapRender>,
    previous: EventFacts | null,
    relayTargets: Map<string, string[]>,
): StoryMapGenerationEvent {
    // workflow 引用
    let workflowRef: string | null = null;
    // workflow 来源
    let workflowSource: StoryMapGenerationEvent["workflow_source"] = "none";
    if (typeof fact.shot.workflow === "string" && fact.shot.workflow.trim() !== "") {
        workflowRef = fact.shot.workflow.trim();
        workflowSource = "shot";
    } else if (typeof shots.workflow === "string" && shots.workflow.trim() !== "") {
        workflowRef = shots.workflow.trim();
        workflowSource = "shots";
    } else if (project?.default_workflow !== undefined && project.default_workflow.trim() !== "") {
        workflowRef = project.default_workflow.trim();
        workflowSource = "project";
    }
    // 缺口
    const gaps: StoryMapGap[] = [...fact.gaps];
    // workflow 解析
    let workflow: StoryMapWorkflowResolution | null = null;
    if (workflowRef === null) {
        gaps.push({
            code: "missing_workflow",
            severity: BLOCKER,
            shot_id: event.shot_id,
            ref: null,
            message: `镜头 ${event.shot_id} 没有可用 workflow`,
            hint: "设置 project.default_workflow、shots.workflow 或单镜 workflow。",
        });
    } else {
        try {
            // 引用解析
            const resolved = resolveWorkflowRef(root, workflowRef);
            // 候选
            const candidate =
                workflows.find((item) => item.path === resolved.rel || item.name === workflowRef) ??
                buildWorkflowCandidate(root, workflowNameOf(resolved.rel), resolved.rel, resolved.abs, project);
            if (candidate.unusable_reasons.length > 0) {
                gaps.push({
                    code: "workflow_unresolved",
                    severity: BLOCKER,
                    shot_id: event.shot_id,
                    ref: resolved.rel,
                    message: `workflow ${candidate.name} 不可用：${candidate.unusable_reasons.join("；")}`,
                    hint: "修正 workflow / bindings / assets 声明，或换一个候选。",
                });
            }
            // 槽位规划
            const plan = planWorkflowAssets({ root, shot: fact.shot, workflowAbs: resolved.abs });
            // 槽位明细
            const slots: StoryMapWorkflowSlot[] = plan.slots.map((slot) => ({
                slot: slot.slot,
                kind: slot.kind,
                required: slot.required,
                target: slot.target,
                owner: slot.owner,
                mapping_source: slot.mapping_source,
                asset: slot.asset !== null ? assetRefOf(root, slot.asset) : null,
                status: slot.status,
            }));
            // 槽位缺口
            const workflowGaps = plan.gaps.map((gap) => mapWorkflowGap(gap, event.shot_id));
            gaps.push(...workflowGaps);
            workflow = {
                name: candidate.name,
                path: resolved.rel,
                valid: candidate.valid,
                has_bindings: candidate.has_bindings,
                slots,
                missing_slots: slots.filter((slot) => slot.status === "blocker").map((slot) => slot.slot),
                gaps: workflowGaps,
            };
        } catch (e) {
            // 错误
            const err = asCliError(e, "workflow_invalid");
            gaps.push({
                code: "workflow_unresolved",
                severity: BLOCKER,
                shot_id: event.shot_id,
                ref: workflowRef,
                message: err.message,
                hint: err.hint,
            });
        }
    }
    // 连续性
    const previousSceneId = previous?.scene?.id ?? null;
    // 场景变化
    const sceneChanged = previous !== null && fact.scene?.id !== previousSceneId;
    // 同场景
    const sameSceneAsPrev = previous !== null && fact.scene?.id !== null && fact.scene?.id === previousSceneId;
    // 形态变化
    const formChanges: StoryMapFormChange[] = [];
    for (const cast of fact.cast) {
        // 上一镜角色
        const before = previous?.cast.find((item) => item.id === cast.id);
        if (before !== undefined && before.form !== cast.form) {
            formChanges.push({ character_id: cast.id, from: before.form, to: cast.form });
        }
    }
    return {
        shot_id: event.shot_id,
        assigned_workflow: workflow?.name ?? null,
        workflow_source: workflowSource,
        workflow,
        cast: fact.cast.map((cast) => castView(cast)),
        scene: sceneView(fact.scene),
        voices: fact.voices.map((voice) => voiceView(voice)),
        continuity: {
            scene_changed: sceneChanged,
            same_scene_as_prev: sameSceneAsPrev,
            form_changes: formChanges,
            relay_from: fact.relay_from,
            relay_targets: relayTargets.get(fact.shot.id) ?? [],
            anchor: fact.anchor,
        },
        render: renderIndex.get(fact.shot.id) ?? {
            runs_count: 0,
            succeeded_count: 0,
            latest_run_id: null,
            latest_status: null,
            latest_outputs: [],
            finalized_run_id: null,
            finalized_outputs: [],
            latest_finished_at: null,
            latest_error: null,
        },
        candidate_workflows: workflows.map((candidate) => candidateFit(candidate, fact)),
        gaps,
        ready: gaps.every((gap) => gap.severity !== BLOCKER),
    };
}

/**
 * 构造剧情图谱与生成上下文。
 */
export function buildStoryMap(
    root: string,
    episodeId: string,
    project?: ProjectConfig | null,
): StoryMapResolved | null {
    // 剧集元数据
    const meta = readEpisodeMeta(root, episodeId);
    if (meta === null) return null;
    // 项目配置
    const projectConfig = project ?? projectOf(root);
    // 全局角色
    const characters = loadCharacters(root);
    // 分镜
    const shots = loadEpisodeShots(root, episodeId);
    // 拆解
    const breakdown = loadBreakdown(root, episodeId);
    // 剧本
    const script = loadScriptMeta(root, episodeId);
    // 标注
    const annotations = readStoryMapAnnotations(root, episodeId);
    // 标注索引
    const annotationMap = new Map((annotations.doc?.events ?? []).map((event) => [event.shot_id, event]));
    // beat 索引
    const beatMap = new Map((breakdown?.beats ?? []).map((beat) => [beat.id, beat.summary]));
    // beat 列表
    const beatList = (breakdown?.beats ?? []).map((beat) => ({ id: beat.id, summary: beat.summary }));
    // 帧率
    const fps = shots !== null ? (numberOf(shots.meta.fps) ?? numberOf(shots.defaults.fps)) : null;
    // 事件事实
    const facts = shots !== null ? buildEventFacts(root, shots, characters, fps, beatMap) : [];
    // 事件视图
    const events: StoryMapEventView[] = [];
    // 上一场景
    let previousSceneId: string | null = null;
    for (const [index, fact] of facts.entries()) {
        // 标注
        const annotation = annotationMap.get(fact.shot.id);
        // 推导重要度
        const derivedImportance = importanceOf(
            index,
            previousSceneId,
            fact.scene?.id ?? null,
            fact.cast,
            fact.dialogue_count,
        );
        // 标题
        const title =
            typeof annotation?.title === "string" && annotation.title.trim() !== ""
                ? annotation.title.trim()
                : (fact.shot.title ?? fact.shot.slug ?? `镜头 ${fact.shot.id}`);
        // 摘要
        const summary =
            typeof annotation?.summary === "string" && annotation.summary.trim() !== ""
                ? annotation.summary.trim()
                : (fact.shot.summary ?? fact.shot.description ?? fact.shot.prompt);
        events.push({
            shot_id: fact.shot.id,
            at_seconds: fact.at_seconds,
            at_estimated: fact.at_estimated,
            duration_seconds: fact.duration_seconds,
            title,
            title_source:
                typeof annotation?.title === "string" && annotation.title.trim() !== "" ? "annotation" : "shot",
            summary,
            summary_source:
                typeof annotation?.summary === "string" && annotation.summary.trim() !== "" ? "annotation" : "shot",
            importance: annotation?.importance ?? derivedImportance,
            importance_source: annotation?.importance !== undefined ? "annotation" : "derived",
            story_time:
                typeof annotation?.story_time === "string" && annotation.story_time.trim() !== ""
                    ? annotation.story_time.trim()
                    : null,
            scene: sceneView(fact.scene),
            characters: fact.cast.map((cast) => castView(cast)),
            beat_ids: fact.beat_ids,
            beats: fact.beat_ids.map((id) => ({ id, summary: beatMap.get(id) ?? "" })),
            dialogue_count: fact.dialogue_count,
            note: typeof annotation?.note === "string" && annotation.note.trim() !== "" ? annotation.note.trim() : null,
        });
        previousSceneId = fact.scene?.id ?? null;
    }
    // 镜头 id
    const shotIds = new Set(facts.map((fact) => fact.shot.id));
    // 警告
    const warnings: StoryMapGap[] = [...annotations.warnings];
    if (shots === null) {
        warnings.push({
            code: "shots_missing",
            severity: WARNING,
            shot_id: null,
            ref: "shots.json",
            message: `剧集 ${episodeId} 还没有 shots.json`,
            hint: `先执行 story shots set --episode ${episodeId} --file <shots.json>。`,
        });
    }
    // 孤儿标注
    for (const annotation of annotations.doc?.events ?? []) {
        if (shotIds.has(annotation.shot_id)) continue;
        warnings.push({
            code: "story_map_orphan_shot",
            severity: WARNING,
            shot_id: annotation.shot_id,
            ref: "story-map.json",
            message: `标注引用了不存在的镜头 ${annotation.shot_id}`,
            hint: "重新执行 story map build 刷新骨架。",
        });
    }
    // 已知角色
    const knownCharacters = new Set(characters.characters.map((character) => character.id));
    for (const fact of facts) for (const cast of fact.cast) knownCharacters.add(cast.id);
    // 关系
    const relations: StoryMapRelation[] = [];
    for (const relation of annotations.doc?.relations ?? []) {
        if (relation.from === relation.to) {
            warnings.push({
                code: "story_map_relation_invalid",
                severity: WARNING,
                shot_id: null,
                ref: "story-map.json",
                message: `关系不能自引用：${relation.from}`,
                hint: "修正关系端点。",
            });
            continue;
        }
        if (!knownCharacters.has(relation.from) || !knownCharacters.has(relation.to)) {
            warnings.push({
                code: "story_map_relation_unknown",
                severity: WARNING,
                shot_id: null,
                ref: "story-map.json",
                message: `关系引用了本集不存在的角色：${relation.from} → ${relation.to}`,
                hint: "修正关系，或补全局角色。",
            });
            continue;
        }
        relations.push(relation);
    }
    // 使用中的音色
    const usedVoiceIds = new Set(facts.flatMap((fact) => fact.voices.map((voice) => voice.voice_id)));
    // 目录
    const catalogResult = buildCatalog(root, characters, events, usedVoiceIds, beatList);
    warnings.push(...catalogResult.warnings);
    // 图谱
    const graph = buildGraph(events);
    // 角色目录
    const characterCatalog = new Map(catalogResult.catalog.characters.map((character) => [character.id, character]));
    // 场景目录
    const sceneCatalog = new Map(catalogResult.catalog.scenes.map((scene) => [scene.id, scene]));
    for (const node of graph.characters) {
        // 目录项
        const item = characterCatalog.get(String(node.id));
        if (item !== undefined) node.role = item.role;
    }
    for (const node of graph.scenes) {
        // 目录项
        const item = sceneCatalog.get(String(node.id));
        if (item !== undefined) {
            node.time_of_day = item.time_of_day;
            node.interior_exterior = item.interior_exterior;
        }
    }
    // workflow 候选
    const workflows = collectWorkflowCatalog(root, projectConfig);
    // 渲染索引
    const renderIndex = buildRenderIndex(root, episodeId);
    // relay 下游
    const relayTargets = new Map<string, string[]>();
    for (const fact of facts) {
        if (fact.relay_from === null) continue;
        // 下游列表
        const list = relayTargets.get(fact.relay_from) ?? [];
        list.push(fact.shot.id);
        relayTargets.set(fact.relay_from, list);
    }
    // 生成上下文事件
    const generationEvents =
        shots === null
            ? []
            : facts.map((fact, index) =>
                  buildGenerationEvent(
                      root,
                      events[index] as StoryMapEventView,
                      fact,
                      shots,
                      projectConfig,
                      workflows,
                      renderIndex,
                      index > 0 ? (facts[index - 1] as EventFacts) : null,
                      relayTargets,
                  ),
              );
    // 就绪镜头
    const readyShots = generationEvents.filter((event) => event.ready).map((event) => event.shot_id);
    // 阻塞镜头
    const blockedShots = generationEvents.filter((event) => !event.ready).map((event) => event.shot_id);
    // 已生成镜头
    const renderedShots = generationEvents
        .filter((event) => event.render.succeeded_count > 0)
        .map((event) => event.shot_id);
    // 失败镜头
    const failedShots = generationEvents
        .filter((event) => event.render.latest_status === "failed")
        .map((event) => event.shot_id);
    // 全部缺口
    const generationGaps = generationEvents.flatMap((event) => event.gaps);
    // 时间基准
    const unknownDurationShots = facts.filter((fact) => fact.duration_seconds === null).map((fact) => fact.shot.id);
    // 是否全部未知
    const allUnknown = facts.length > 0 && unknownDurationShots.length === facts.length;
    if (allUnknown) {
        for (const [index, event] of events.entries()) {
            event.at_seconds = index;
            event.at_estimated = true;
        }
    }
    // 已知总时长
    const duration = facts.some((fact) => fact.duration_seconds !== null)
        ? facts.reduce((sum, fact) => sum + (fact.duration_seconds ?? 0), 0)
        : null;
    // 当前事实
    const source = storyMapSource(root, episodeId, script);
    // stale 原因
    const staleReasons: string[] = [];
    if (annotations.doc !== null) {
        if (annotations.doc.source.script_revision !== source.script_revision)
            staleReasons.push("剧本 revision 已变化");
        if (annotations.doc.source.breakdown_sha256 !== source.breakdown_sha256) staleReasons.push("breakdown 已变化");
        if (annotations.doc.source.shots_sha256 !== source.shots_sha256) staleReasons.push("shots 已变化");
    }
    return {
        episode_id: episodeId,
        origin: {
            derived: true,
            annotated: annotations.doc !== null,
            author: annotations.doc?.author ?? "dycli",
            updated_at: annotations.doc?.updated_at ?? null,
            stale: staleReasons.length > 0,
            stale_reasons: staleReasons,
        },
        time: {
            basis: allUnknown ? "order" : "screen",
            duration_seconds: duration,
            unknown_duration_shots: unknownDurationShots,
        },
        catalog: catalogResult.catalog,
        events,
        graph,
        generation: {
            workflows,
            readiness: {
                counts: {
                    shots: generationEvents.length,
                    ready: readyShots.length,
                    blocked: blockedShots.length,
                    rendered: renderedShots.length,
                    failed: failedShots.length,
                },
                ready_shots: readyShots,
                blocked_shots: blockedShots,
                rendered_shots: renderedShots,
                failed_shots: failedShots,
            },
            events: generationEvents,
            gaps: generationGaps,
        },
        relations,
        warnings: dedupeGaps(warnings),
    };
}

/**
 * 缺口去重。
 */
function dedupeGaps(gaps: StoryMapGap[]): StoryMapGap[] {
    // 已见
    const seen = new Set<string>();
    // 结果
    const out: StoryMapGap[] = [];
    for (const gap of gaps) {
        // 去重键
        const key = `${gap.code}|${gap.shot_id ?? ""}|${gap.ref ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(gap);
    }
    return out;
}

/**
 * 归一化叙事事件（只保留叙事字段）。
 */
function narrativeEventOf(event: StoryMapEvent): StoryMapEvent {
    // 结果
    const out: StoryMapEvent = { shot_id: event.shot_id };
    if (typeof event.title === "string") out.title = event.title;
    if (typeof event.summary === "string") out.summary = event.summary;
    if (event.importance === "major" || event.importance === "normal" || event.importance === "minor")
        out.importance = event.importance;
    if (typeof event.story_time === "string") out.story_time = event.story_time;
    if (typeof event.note === "string") out.note = event.note;
    return out;
}

/**
 * 校验并归一化叙事标注（严格模式，用于 story map set）。
 */
export function normalizeStoryMapDoc(
    raw: unknown,
    episodeId: string,
    author: StoryMapFile["author"],
    source: StoryMapFile["source"],
    shots: ShotsFile,
    characters: StoryCharactersFile,
): StoryMapFile {
    // 文档视图
    const record = recordOf(raw);
    if (record === null) {
        throw new DaoyanCliError({ code: "story_invalid", message: "story-map 必须是 JSON 对象" });
    }
    // 问题
    const issues: string[] = [];
    if (record.version !== 1) issues.push("version 必须为 1");
    if (typeof record.episode_id === "string" && record.episode_id !== episodeId)
        issues.push("episode_id 与当前剧集不一致");
    // 镜头 id
    const shotIds = new Set(shots.shots.map((shot) => shot.id));
    // 事件
    const events: StoryMapEvent[] = [];
    // 已见镜头
    const seen = new Set<string>();
    for (const item of arrayOf(record.events)) {
        // 事件视图
        const event = recordOf(item);
        // 镜头 id
        const shotId = event !== null ? stringOf(event.shot_id) : null;
        if (event === null || shotId === null) {
            issues.push("事件缺少 shot_id");
            continue;
        }
        if (!shotIds.has(shotId)) {
            issues.push(`事件引用了不存在的镜头 ${shotId}`);
            continue;
        }
        if (seen.has(shotId)) {
            issues.push(`事件 shot_id 重复：${shotId}`);
            continue;
        }
        seen.add(shotId);
        // 归一化
        const normalized = narrativeEventOf({ ...(event as unknown as StoryMapEvent), shot_id: shotId });
        if (typeof event.title === "string" && event.title.length > MAX_TITLE_LENGTH)
            issues.push(`事件 ${shotId} 的 title 超过 ${MAX_TITLE_LENGTH} 字符`);
        if (typeof event.summary === "string" && event.summary.length > MAX_SUMMARY_LENGTH)
            issues.push(`事件 ${shotId} 的 summary 超过 ${MAX_SUMMARY_LENGTH} 字符`);
        if (typeof event.story_time === "string" && event.story_time.length > MAX_STORY_TIME_LENGTH)
            issues.push(`事件 ${shotId} 的 story_time 超过 ${MAX_STORY_TIME_LENGTH} 字符`);
        if (typeof event.note === "string" && event.note.length > MAX_NOTE_LENGTH)
            issues.push(`事件 ${shotId} 的 note 超过 ${MAX_NOTE_LENGTH} 字符`);
        if (
            event.importance !== undefined &&
            event.importance !== "major" &&
            event.importance !== "normal" &&
            event.importance !== "minor"
        )
            issues.push(`事件 ${shotId} 的 importance 非法`);
        events.push(normalized);
    }
    // 关系
    const relations: StoryMapRelation[] = [];
    for (const item of arrayOf(record.relations)) {
        // 关系视图
        const relation = recordOf(item);
        // 端点
        const from = relation !== null ? stringOf(relation.from) : null;
        const to = relation !== null ? stringOf(relation.to) : null;
        // 标签
        const label = relation !== null ? stringOf(relation.label) : null;
        if (relation === null || from === null || to === null || label === null) {
            issues.push("关系缺少 from / to / label");
            continue;
        }
        if (from === to) issues.push(`关系不能自引用：${from}`);
        if (!characters.characters.some((character) => character.id === from))
            issues.push(`关系起点角色不存在：${from}`);
        if (!characters.characters.some((character) => character.id === to)) issues.push(`关系终点角色不存在：${to}`);
        // 归一化
        relations.push({
            from,
            to,
            label,
            ...(typeof relation.kind === "string" && relation.kind !== "" ? { kind: relation.kind } : {}),
            ...(typeof relation.note === "string" && relation.note !== "" ? { note: relation.note } : {}),
        });
    }
    if (issues.length > 0) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `story-map 校验失败（${issues.length} 项错误）`,
            details: { issues },
        });
    }
    return {
        version: 1,
        episode_id: episodeId,
        author,
        updated_at: nowIso(),
        source,
        events,
        relations,
        ...(typeof record.notes === "string" && record.notes !== "" ? { notes: record.notes } : {}),
    };
}

/**
 * 生成标注骨架（保留已有叙事字段）。
 */
export function materializeStoryMap(
    root: string,
    episodeId: string,
    options: { force: boolean },
): { doc: StoryMapFile; dropped: string[]; preserved: number; warnings: StoryMapGap[] } {
    // 分镜
    const shots = loadEpisodeShots(root, episodeId);
    if (shots === null) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `剧集 ${episodeId} 没有 shots.json，无法生成图谱骨架`,
            hint: `先执行 story shots set --episode ${episodeId} --file <shots.json>。`,
        });
    }
    // 已有标注
    const existingRead = readStoryMapAnnotations(root, episodeId);
    if (!options.force && existingRead.doc === null && existsSync(storyMapPath(root, episodeId))) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: "现有 story-map.json 无法解析",
            hint: "修正文件，或使用 --force 丢弃旧标注。",
        });
    }
    // 已有文档
    const existing = options.force ? null : existingRead.doc;
    // 已有事件
    const existingEvents = new Map((existing?.events ?? []).map((event) => [event.shot_id, event]));
    // 镜头 id
    const shotIds = new Set(shots.shots.map((shot) => shot.id));
    // 新事件
    const events = shots.shots.map((shot) => {
        // 已有标注
        const current = existingEvents.get(shot.id);
        return current !== undefined ? narrativeEventOf(current) : { shot_id: shot.id };
    });
    // 丢弃的镜头
    const dropped = (existing?.events ?? [])
        .filter((event) => !shotIds.has(event.shot_id))
        .map((event) => event.shot_id);
    // 保留的标注
    const preserved = events.filter((event) => Object.keys(event).length > 1).length;
    // 全局角色
    const characters = loadCharacters(root);
    // 关系
    const relations: StoryMapRelation[] = [];
    // 警告
    const warnings: StoryMapGap[] = [...existingRead.warnings];
    for (const relation of existing?.relations ?? []) {
        if (
            !characters.characters.some((character) => character.id === relation.from) ||
            !characters.characters.some((character) => character.id === relation.to)
        ) {
            warnings.push({
                code: "story_map_relation_unknown",
                severity: WARNING,
                shot_id: null,
                ref: "story-map.json",
                message: `丢弃关系 ${relation.from} → ${relation.to}：角色不存在`,
                hint: "补全局角色，或删除该关系。",
            });
            continue;
        }
        relations.push(relation);
    }
    // 剧本
    const script = loadScriptMeta(root, episodeId);
    return {
        doc: {
            version: 1,
            episode_id: episodeId,
            author: existing?.author ?? "dycli",
            updated_at: nowIso(),
            source: storyMapSource(root, episodeId, script),
            events,
            relations,
        },
        dropped,
        preserved,
        warnings,
    };
}
