/** Web 只读数据层 —— 把项目/任务/run/分镜/成片整理成浏览器可直接消费的 DTO。
 *  约束：
 *  - DTO 不包含绝对路径，只给项目内相对路径与 /media URL；
 *  - 单个坏记录不拖垮整个列表（跳过并继续）；
 *  - 只读，不写任何文件、不占 machine lock。 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import {
    FINAL_DIR,
    RUNS_DIR,
    RUN_FILE,
    RUN_INPUTS_FILE,
    RUN_WORKFLOW_FILE,
    TASK_FILE,
    TASKS_DIR,
    WORKFLOWS_DIR,
    isTerminalStatus,
    type MachineConfig,
    type ProjectConfig,
    type RunOutput,
    type RunRecord,
    type ShotsFile,
    type StoryEntityRef,
    type TaskEvent,
    type TaskRecord,
} from "../project/types.mts";
import { nowIso, readJsonIfExists } from "../../shared/fs.mts";
import type { SkillCommand } from "../agent/skill.mts";
import { buildStatusSnapshot, shotProgress } from "../status/snapshot.mts";
import { readEvents } from "../task/events.mts";
import { taskDir } from "../task/store.mts";
import { runDir } from "../run/store.mts";
import { resolveEpisodeContext, storyEnabled } from "../story/paths.mts";
import { pickShotTake } from "../story/takes.mts";
import { computeSeriesStoryStatus } from "../story/validate.mts";
import type { EpisodeContext, SeriesStoryStatus } from "../story/types.mts";

/**
 * 产物类型。
 */
export type ArtifactKind = "video" | "image" | "audio" | "json" | "text" | "other";

/**
 * Web 产物 DTO。
 */
export interface WebArtifact {
    /**
     * 所属 run id。
     */
    run_id: string;
    /**
     * 文件名。
     */
    name: string;
    /**
     * run 内相对路径（outputs/<name>）。
     */
    path: string;
    /**
     * 展示类型。
     */
    kind: ArtifactKind;
    /**
     * 实际字节数（文件缺失时回退记录值）。
     */
    bytes: number;
    /**
     * 内容 sha256（记录值）。
     */
    sha256: string;
    /**
     * 文件是否存在。
     */
    present: boolean;
    /**
     * 是否是 Git LFS pointer。
     */
    lfs_pointer: boolean;
    /**
     * 浏览器播放/预览地址。
     */
    media_url: string;
    /**
     * 下载地址。
     */
    download_url: string;
}

/**
 * run 摘要 DTO。
 */
export interface WebRunSummary {
    /**
     * run id。
     */
    run_id: string;
    /**
     * 所属 task。
     */
    task_id: string;
    /**
     * 机器标签。
     */
    machine_id: string;
    /**
     * 所属剧集。
     */
    episode_id: string | null;
    /**
     * 幂等键。
     */
    request_id: string | null;
    /**
     * 展示 label。
     */
    label: string | null;
    /**
     * 终态。
     */
    status: RunRecord["status"];
    /**
     * workflow 相对路径与快照哈希。
     */
    workflow: RunRecord["workflow"];
    /**
     * 提示词（若 inputs 中有）。
     */
    prompt: string | null;
    /**
     * 引擎 prompt id。
     */
    prompt_id: string | null;
    /**
     * 引擎信息。
     */
    engine: RunRecord["engine"];
    /**
     * GPU 接管信息（可选）。
     */
    gpu?: RunRecord["gpu"];
    /**
     * 开始时间。
     */
    started_at: string;
    /**
     * 结束时间。
     */
    finished_at: string;
    /**
     * 耗时（毫秒）。
     */
    duration_ms: number;
    /**
     * 终态错误。
     */
    error: RunRecord["error"];
    /**
     * 产物列表。
     */
    outputs: WebArtifact[];
}

/**
 * 扁平化产物条目（画廊用）。
 */
export interface WebArtifactItem {
    /**
     * run id。
     */
    run_id: string;
    /**
     * task id。
     */
    task_id: string;
    /**
     * 机器标签。
     */
    machine_id: string;
    /**
     * 所属剧集。
     */
    episode_id: string | null;
    /**
     * run label。
     */
    label: string | null;
    /**
     * run 状态。
     */
    run_status: RunRecord["status"];
    /**
     * 开始时间。
     */
    started_at: string;
    /**
     * 结束时间。
     */
    finished_at: string;
    /**
     * workflow 相对路径。
     */
    workflow: string;
    /**
     * 提示词。
     */
    prompt: string | null;
    /**
     * 单个产物。
     */
    output: WebArtifact;
    /**
     * 是否为该镜的定稿稿件。
     */
    finalized: boolean;
}

/**
 * 产物查询参数。
 */
export interface ArtifactQuery {
    /**
     * label 精确过滤（如 shot:01）。
     */
    label?: string;
    /**
     * run 状态过滤。
     */
    status?: string;
    /**
     * 产物类型过滤。
     */
    kind?: string;
    /**
     * 文本搜索（run_id / label / prompt / 文件名）。
     */
    search?: string;
    /**
     * 剧集 id 过滤（story 模式）。
     */
    episode?: string;
    /**
     * 返回条数上限。
     */
    limit?: number;
}

/**
 * 产物列表结果。
 */
export interface WebArtifactList {
    /**
     * 当前页条目。
     */
    items: WebArtifactItem[];
    /**
     * 过滤后的总数。
     */
    total: number;
    /**
     * 可选 label 列表。
     */
    labels: string[];
    /**
     * 可选类型列表。
     */
    kinds: ArtifactKind[];
}

/**
 * run 详情 DTO。
 */
export interface WebRunDetail extends WebRunSummary {
    /**
     * 逻辑输入。
     */
    inputs: Record<string, unknown>;
    /**
     * 命中的覆盖项。
     */
    overrides: Record<string, unknown>;
    /**
     * 输入文件清单。
     */
    input_files: Array<{ name: string; sha256: string; bytes: number }>;
    /**
     * task 事件（截断尾部）。
     */
    events: TaskEvent[];
    /**
     * 是否保留 workflow 快照。
     */
    workflow_snapshot: boolean;
}

/**
 * 任务实时进度。
 */
export interface WebTaskProgress {
    /**
     * 最近事件类型（无事件时回退 task.status）。
     */
    phase: string;
    /**
     * 阶段展示文案。
     */
    label: string;
    /**
     * 当前 run id（事件带有时）。
     */
    run_id: string | null;
    /**
     * 事件总数（最大 seq）。
     */
    event_count: number;
    /**
     * 最近事件时间。
     */
    updated_at: string | null;
}

/**
 * 任务列表项。
 */
export interface WebTaskItem {
    /**
     * task id。
     */
    task_id: string;
    /**
     * 任务类型。
     */
    kind: TaskRecord["kind"];
    /**
     * 状态。
     */
    status: TaskRecord["status"];
    /**
     * 执行模式。
     */
    mode: TaskRecord["mode"];
    /**
     * 机器标签。
     */
    machine_id: string;
    /**
     * 所属剧集。
     */
    episode_id: string | null;
    /**
     * 幂等键。
     */
    request_id: string | null;
    /**
     * run id 列表。
     */
    runs: string[];
    /**
     * 触发命令。
     */
    command: string;
    /**
     * 创建时间。
     */
    created_at: string;
    /**
     * 开始时间。
     */
    started_at: string | null;
    /**
     * 结束时间。
     */
    finished_at: string | null;
    /**
     * 终态错误。
     */
    error: TaskRecord["error"];
    /**
     * 下一步动作。
     */
    next_actions: string[];
    /**
     * run 数量。
     */
    run_count: number;
    /**
     * 是否仍在运行。
     */
    active: boolean;
    /**
     * 实时进度。
     */
    progress: WebTaskProgress;
}

/**
 * 任务详情 DTO。
 */
export interface WebTaskDetail extends WebTaskItem {
    /**
     * 该 task 的 run 摘要。
     */
    runs_detail: WebRunSummary[];
    /**
     * 事件流（截断尾部）。
     */
    events: TaskEvent[];
}

/**
 * Web 人物 / 场景设定。
 */
export interface WebStoryEntity {
    /**
     * 稳定 id（可空）。
     */
    id: string | null;
    /**
     * 展示名。
     */
    name: string;
    /**
     * 设定描述。
     */
    description: string | null;
    /**
     * 参考图（项目内相对路径）。
     */
    reference: string | null;
    /**
     * 出场镜号。
     */
    shots: string[];
    /**
     * 出场镜头数。
     */
    count: number;
}

/**
 * 单镜历史 run。
 */
export interface WebShotRun {
    /**
     * run id。
     */
    run_id: string;
    /**
     * 终态。
     */
    status: RunRecord["status"];
    /**
     * 开始时间。
     */
    started_at: string;
    /**
     * 结束时间。
     */
    finished_at: string;
    /**
     * 耗时（毫秒）。
     */
    duration_ms: number;
    /**
     * 终态错误。
     */
    error: RunRecord["error"];
    /**
     * 该 run 的产物。
     */
    outputs: WebArtifact[];
    /**
     * 该 run 是否为定稿 run。
     */
    finalized: boolean;
}

/**
 * 镜头参考资产。
 */
export interface WebShotAssetRef {
    /**
     * 资产 id。
     */
    id: string;
    /**
     * 项目内相对路径。
     */
    path: string;
    /**
     * 同源媒体地址。
     */
    media_url: string;
    /**
     * 展示类型。
     */
    kind: ArtifactKind;
    /**
     * MIME 类型。
     */
    content_type: string;
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
}

/**
 * 镜头参考图 / 参考音频。
 */
export interface WebShotReference {
    /**
     * 资产类型。
     */
    kind: "character" | "scene" | "voice";
    /**
     * owner 引用（角色为 id/form）。
     */
    owner: string | null;
    /**
     * 展示名。
     */
    name: string;
    /**
     * 形态 id。
     */
    form: string | null;
    /**
     * 形态名。
     */
    form_name: string | null;
    /**
     * 解析到的资产（缺主参考时为 null）。
     */
    asset: WebShotAssetRef | null;
    /**
     * 工作流槽位名（未接入时为 null）。
     */
    slot: string | null;
    /**
     * 注入的节点输入（未接入时为 null）。
     */
    target: string | null;
    /**
     * 槽位是否必填（未接入时为 null）。
     */
    required: boolean | null;
    /**
     * 槽位映射来源（未接入时为 null）。
     */
    mapping_source: string | null;
    /**
     * ready = 已注入；unwired = 有图但 workflow 未声明槽位；missing = 缺主参考。
     */
    status: "ready" | "unwired" | "missing";
}

/**
 * 镜头当前活动任务。
 */
export interface WebShotActiveTask {
    /**
     * task id。
     */
    task_id: string;
    /**
     * 任务类型。
     */
    kind: TaskRecord["kind"];
    /**
     * 任务状态。
     */
    status: TaskRecord["status"];
    /**
     * 当前阶段文案。
     */
    label: string;
}

/**
 * 镜头展示项。
 */
export interface WebShotItem {
    /**
     * 镜号。
     */
    id: string;
    /**
     * 短名。
     */
    slug: string | null;
    /**
     * 镜头标题。
     */
    title: string | null;
    /**
     * 内容摘要（缺省为 prompt）。
     */
    summary: string;
    /**
     * 随机种子。
     */
    seed: number;
    /**
     * 提示词。
     */
    prompt: string;
    /**
     * 出场人物。
     */
    characters: WebStoryEntity[];
    /**
     * 场景。
     */
    scene: WebStoryEntity | null;
    /**
     * 首帧展示文本。
     */
    first_frame: string | null;
    /**
     * 首帧类型。
     */
    first_frame_kind: "anchor" | "relay" | "none";
    /**
     * 该镜 workflow（未覆盖时为文件级）。
     */
    workflow: string | null;
    /**
     * 是否已有成功 run。
     */
    done: boolean;
    /**
     * 最新 run（任意状态）。
     */
    latest_run: string | null;
    /**
     * 最新 run 状态。
     */
    latest_status: RunRecord["status"] | null;
    /**
     * 最新成功 run 的展示产物。
     */
    latest_artifact: WebArtifact | null;
    /**
     * 定稿稿件所在 run（未定稿为 null）。
     */
    finalized_run: string | null;
    /**
     * 定稿稿件名（未定稿为 null）。
     */
    finalized_output: string | null;
    /**
     * 下游选稿来源（无剧集上下文时为 null）。
     */
    take_source: "finalized" | "latest" | "none" | null;
    /**
     * 定稿记录失效原因。
     */
    take_stale: string | null;
    /**
     * 全部历史产物（按 run 时间倒序）。
     */
    artifacts: WebArtifactItem[];
    /**
     * 全部历史 run。
     */
    runs: WebShotRun[];
    /**
     * run 总数。
     */
    runs_count: number;
    /**
     * 成功 run 数。
     */
    succeeded_count: number;
    /**
     * 帧数（镜头覆盖或全片默认）。
     */
    length: number | null;
    /**
     * 时长（秒；显式 duration 或 length/fps）。
     */
    duration_seconds: number | null;
    /**
     * 宽度。
     */
    width: number;
    /**
     * 高度。
     */
    height: number;
    /**
     * 采样步数。
     */
    steps: number | null;
    /**
     * 引导强度。
     */
    cfg: number | null;
    /**
     * 制作备注。
     */
    notes: string | null;
    /**
     * 镜头额外参数。
     */
    params: Record<string, unknown> | null;
    /**
     * 参考图 / 参考音频（story 模式解析 workflow 槽位后填充）。
     */
    references?: WebShotReference[];
    /**
     * 当前活动任务（生成 / 重拍中）。
     */
    active_task?: WebShotActiveTask | null;
}

/**
 * 分镜统计。
 */
export interface WebShotsSummary {
    /**
     * 镜头总数。
     */
    shots_total: number;
    /**
     * 已有成功 run 的镜头数。
     */
    shots_done: number;
    /**
     * 已定稿镜头数。
     */
    shots_finalized: number;
    /**
     * 人物数。
     */
    characters_total: number;
    /**
     * 场景数。
     */
    scenes_total: number;
    /**
     * 产物总数。
     */
    artifacts_total: number;
    /**
     * 总帧数。
     */
    total_frames: number;
    /**
     * 总时长（秒；只有全部镜头可推导时给出）。
     */
    total_duration_seconds: number | null;
    /**
     * 分辨率展示文本。
     */
    resolution: string;
    /**
     * 帧率。
     */
    fps: number | null;
}

/**
 * 分镜视图。
 */
export interface WebShotsView {
    /**
     * 片名。
     */
    title: string | null;
    /**
     * 剧情简介。
     */
    synopsis: string | null;
    /**
     * 文件级 workflow。
     */
    workflow: string | null;
    /**
     * 风格前缀。
     */
    style_prefix: string | null;
    /**
     * 分镜元信息。
     */
    meta: ShotsFile["meta"];
    /**
     * 全片默认参数。
     */
    defaults: ShotsFile["defaults"];
    /**
     * 帧率。
     */
    fps: number | null;
    /**
     * 全部人物（含未出场设定）。
     */
    characters: WebStoryEntity[];
    /**
     * 全部场景（含未使用设定）。
     */
    scenes: WebStoryEntity[];
    /**
     * 统计。
     */
    summary: WebShotsSummary;
    /**
     * 镜头列表。
     */
    shots: WebShotItem[];
}

/**
 * 成片条目。
 */
export interface WebFinalItem {
    /**
     * 所属剧集（legacy 为 null）。
     */
    episode_id: string | null;
    /**
     * 成片文件名。
     */
    name: string;
    /**
     * manifest 文件名（无则为 null）。
     */
    manifest: string | null;
    /**
     * 播放地址。
     */
    media_url: string;
    /**
     * 下载地址。
     */
    download_url: string;
    /**
     * 字节数。
     */
    bytes: number;
    /**
     * 文件是否存在。
     */
    present: boolean;
    /**
     * 是否 LFS pointer。
     */
    lfs_pointer: boolean;
    /**
     * 创建时间。
     */
    created_at: string | null;
    /**
     * 合片片段列表。
     */
    clips: Array<{ shot: string; run_id: string; artifact: string }>;
    /**
     * 未纳入的镜号。
     */
    missing: string[];
}

/**
 * 工作流列表项。
 */
export interface WebWorkflowItem {
    /**
     * 短名。
     */
    name: string;
    /**
     * 项目内相对路径。
     */
    path: string;
    /**
     * 节点数。
     */
    nodes: number;
    /**
     * 是否有 bindings。
     */
    bindings: boolean;
    /**
     * 是否默认 workflow。
     */
    default: boolean;
    /**
     * JSON 是否可解析。
     */
    valid: boolean;
}

// 视频扩展名
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"]);
// 图片扩展名（SVG 按普通文件处理，避免同源脚本执行）
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"]);
// 音频扩展名
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus"]);
// JSON 扩展名
const JSON_EXTENSIONS = new Set([".json"]);
// 文本扩展名
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".log", ".csv", ".yaml", ".yml"]);
// Git LFS pointer 文件头
const LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec/v1";
// 媒体 URL 前缀
const MEDIA_PREFIX = "/media";
// 默认产物条数
const DEFAULT_ARTIFACT_LIMIT = 200;
// 产物条数上限
const MAX_ARTIFACT_LIMIT = 500;
// 事件截断条数
const MAX_EVENT_ROWS = 300;
// Web 概览的引擎探测超时（毫秒）
const OVERVIEW_ENGINE_TIMEOUT_MS = 1_500;
// 概览中最近产物数量
const OVERVIEW_ARTIFACT_LIMIT = 8;
// 文件扩展名分隔符
const EXTENSION_SEPARATOR = ".";
// 人物字段别名
const CHARACTER_KEYS = ["characters", "cast", "roles"] as const;
// 场景引用字段别名
const SCENE_KEYS = ["scene", "location", "set"] as const;
// 场景定义字段别名
const SCENE_DEF_KEYS = ["scenes", "locations", "sets"] as const;
// 简介字段别名
const SYNOPSIS_KEYS = ["synopsis", "summary", "description", "intro"] as const;
// 内容字段别名
const CONTENT_KEYS = ["content", "summary", "description"] as const;
// 设定 id 别名
const ENTITY_ID_KEYS = ["id", "key"] as const;
// 设定名称别名
const ENTITY_NAME_KEYS = ["name", "title"] as const;
// 设定描述别名
const ENTITY_DESC_KEYS = ["description", "desc", "profile", "intro"] as const;
// 设定参考图别名
const ENTITY_REF_KEYS = ["reference", "image", "ref", "portrait", "anchor"] as const;

/**
 * 扩展名（小写，含点）。
 */
function extensionOf(name: string): string {
    // 最后一个点位置
    const dot = name.lastIndexOf(EXTENSION_SEPARATOR);
    return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/**
 * 判断产物展示类型。
 */
export function classifyArtifact(name: string): ArtifactKind {
    // 文件扩展名
    const ext = extensionOf(name);
    if (VIDEO_EXTENSIONS.has(ext)) return "video";
    if (IMAGE_EXTENSIONS.has(ext)) return "image";
    if (AUDIO_EXTENSIONS.has(ext)) return "audio";
    if (JSON_EXTENSIONS.has(ext)) return "json";
    if (TEXT_EXTENSIONS.has(ext)) return "text";
    return "other";
}

/**
 * 判断文件是否是 Git LFS pointer（只检查小文件）。
 */
function isLfsPointer(file: string, size: number): boolean {
    if (size > 1_024) return false;
    try {
        return readFileSync(file, "utf8").startsWith(LFS_POINTER_PREFIX);
    } catch {
        return false;
    }
}

/**
 * 追加媒体版本参数（同名文件替换后强制换 URL）。
 */
export function withMediaVersion(url: string, version: string | null | undefined): string {
    if (version === undefined || version === null || version === "") return url;
    return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

/**
 * 媒体下载地址。
 */
export function mediaDownloadUrl(url: string): string {
    return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

/**
 * run 产物媒体地址。
 */
function runMediaUrl(runId: string, name: string): string {
    return `${MEDIA_PREFIX}/run/${encodeURIComponent(runId)}/${encodeURIComponent(name)}`;
}

/**
 * 成片媒体地址。
 */
function finalMediaUrl(name: string, episodeId?: string): string {
    if (episodeId !== undefined && episodeId !== "") {
        return `${MEDIA_PREFIX}/final/${encodeURIComponent(episodeId)}/${encodeURIComponent(name)}`;
    }
    return `${MEDIA_PREFIX}/final/${encodeURIComponent(name)}`;
}

/**
 * 构造 Web 产物。
 */
function artifactOf(root: string, run: RunRecord, output: RunOutput): WebArtifact {
    // run 目录
    const base = runDir(root, run.run_id);
    // 绝对路径（只用于 stat / 读取，不进入 DTO）
    const abs = resolve(base, output.path);
    // 必须仍在 run 目录内
    const within = abs !== base && abs.startsWith(base + sep);
    // 是否存在
    const present = within && existsSync(abs);
    // 实际字节数
    let bytes = output.bytes;
    // LFS pointer 标记
    let lfsPointer = false;
    // 媒体版本
    let version: string = output.sha256;
    if (present) {
        try {
            // 文件状态
            const stat = statSync(abs);
            bytes = stat.size;
            version = `${stat.size}-${stat.mtimeMs}`;
            lfsPointer = isLfsPointer(abs, stat.size);
        } catch {
            // stat 失败按记录值展示
        }
    }
    // 媒体地址
    const mediaUrl = withMediaVersion(runMediaUrl(run.run_id, output.name), version);
    return {
        run_id: run.run_id,
        name: output.name,
        path: output.path,
        kind: classifyArtifact(output.name),
        bytes,
        sha256: output.sha256,
        present,
        lfs_pointer: lfsPointer,
        media_url: mediaUrl,
        download_url: mediaDownloadUrl(mediaUrl),
    };
}

/**
 * 读取 run；坏记录返回 null。
 */
function safeReadRun(root: string, runId: string): RunRecord | null {
    if (basename(runId) !== runId || runId.includes("/") || runId.includes("\\") || runId === "." || runId === "..") {
        return null;
    }
    try {
        return readJsonIfExists<RunRecord>(join(runDir(root, runId), RUN_FILE));
    } catch {
        return null;
    }
}

/**
 * 列出 run；跳过损坏记录，按开始时间倒序。
 */
function safeListRuns(root: string): RunRecord[] {
    // runs 根目录
    const dir = join(root, RUNS_DIR);
    if (!existsSync(dir)) return [];
    // 收集到的记录
    const out: RunRecord[] = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        // 当前 run
        const rec = safeReadRun(root, ent.name);
        if (rec !== null) out.push(rec);
    }
    return out.sort((a, b) => b.started_at.localeCompare(a.started_at) || b.run_id.localeCompare(a.run_id));
}

/**
 * 读取 task；坏记录返回 null。
 */
function safeReadTask(root: string, taskId: string): TaskRecord | null {
    if (
        basename(taskId) !== taskId ||
        taskId.includes("/") ||
        taskId.includes("\\") ||
        taskId === "." ||
        taskId === ".."
    ) {
        return null;
    }
    try {
        return readJsonIfExists<TaskRecord>(join(taskDir(root, taskId), TASK_FILE));
    } catch {
        return null;
    }
}

/**
 * 列出 task；跳过损坏记录，按创建时间倒序。
 */
function safeListTasks(root: string): TaskRecord[] {
    // tasks 根目录
    const dir = join(root, TASKS_DIR);
    if (!existsSync(dir)) return [];
    // 收集到的记录
    const out: TaskRecord[] = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        // 当前 task
        const rec = safeReadTask(root, ent.name);
        if (rec !== null) out.push(rec);
    }
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * 计算耗时（毫秒）。
 */
function durationMs(startedAt: string, finishedAt: string): number {
    // 开始时间
    const start = Date.parse(startedAt);
    // 结束时间
    const end = Date.parse(finishedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
    return end - start;
}

/**
 * 从 run inputs 中取提示词。
 */
function promptOf(run: RunRecord): string | null {
    // 提示词候选
    const value = run.inputs.prompt;
    return typeof value === "string" ? value : null;
}

/**
 * run 摘要。
 */
export function runSummaryDto(root: string, run: RunRecord): WebRunSummary {
    return {
        run_id: run.run_id,
        task_id: run.task_id,
        machine_id: run.machine_id,
        episode_id: run.episode_id ?? null,
        request_id: run.request_id,
        label: run.label,
        status: run.status,
        workflow: run.workflow,
        prompt: promptOf(run),
        prompt_id: run.prompt_id,
        engine: run.engine,
        ...(run.gpu !== undefined ? { gpu: run.gpu } : {}),
        started_at: run.started_at,
        finished_at: run.finished_at,
        duration_ms: durationMs(run.started_at, run.finished_at),
        error: run.error,
        outputs: run.outputs.map((o) => artifactOf(root, run, o)),
    };
}

/**
 * 扁平化全部产物。
 */
function flattenArtifacts(root: string, runs: RunRecord[]): WebArtifactItem[] {
    // 结果
    const out: WebArtifactItem[] = [];
    for (const run of runs) {
        for (const output of run.outputs) {
            out.push({
                run_id: run.run_id,
                task_id: run.task_id,
                machine_id: run.machine_id,
                episode_id: run.episode_id ?? null,
                label: run.label,
                run_status: run.status,
                started_at: run.started_at,
                finished_at: run.finished_at,
                workflow: run.workflow.path,
                prompt: promptOf(run),
                output: artifactOf(root, run, output),
                finalized: false,
            });
        }
    }
    return out;
}

/**
 * 产物列表。
 */
export function listArtifacts(root: string, query: ArtifactQuery = {}): WebArtifactList {
    // 全部 run（可按集过滤）
    const runs = safeListRuns(root).filter(
        (r) => query.episode === undefined || query.episode === "" || r.episode_id === query.episode,
    );
    // label 候选
    const labels = Array.from(new Set(runs.map((r) => r.label).filter((x): x is string => x !== null))).sort();
    // 全部产物
    const all = flattenArtifacts(root, runs);
    // 类型候选
    const kinds = Array.from(new Set(all.map((x) => x.output.kind))).sort() as ArtifactKind[];
    // 搜索词
    const search = (query.search ?? "").trim().toLowerCase();
    // 过滤后的产物
    const filtered = all.filter((item) => {
        if (query.label !== undefined && query.label !== "" && item.label !== query.label) return false;
        if (query.status !== undefined && query.status !== "" && item.run_status !== query.status) return false;
        if (query.kind !== undefined && query.kind !== "" && item.output.kind !== query.kind) return false;
        if (search !== "") {
            // 搜索文本
            const haystack =
                `${item.run_id} ${item.label ?? ""} ${item.prompt ?? ""} ${item.output.name}`.toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
    // 条数上限
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_ARTIFACT_LIMIT, 1), MAX_ARTIFACT_LIMIT);
    return { items: filtered.slice(0, limit), total: filtered.length, labels, kinds };
}

/**
 * run 详情。
 */
export function getRunDetail(root: string, runId: string): WebRunDetail | null {
    // run 记录
    const run = safeReadRun(root, runId);
    if (run === null) return null;
    // inputs 快照（坏文件不影响详情）
    let inputsSnapshot: {
        inputs?: Record<string, unknown>;
        files?: Array<{ name: string; sha256: string; bytes: number }>;
    } | null = null;
    try {
        inputsSnapshot = readJsonIfExists<{
            inputs?: Record<string, unknown>;
            files?: Array<{ name: string; sha256: string; bytes: number }>;
        }>(join(runDir(root, run.run_id), RUN_INPUTS_FILE));
    } catch {
        inputsSnapshot = null;
    }
    // 事件
    let events: TaskEvent[] = [];
    try {
        events = readEvents(taskDir(root, run.task_id)).slice(-MAX_EVENT_ROWS);
    } catch {
        events = [];
    }
    return {
        ...runSummaryDto(root, run),
        inputs: inputsSnapshot?.inputs ?? run.inputs,
        overrides: run.overrides,
        input_files: inputsSnapshot?.files ?? [],
        events,
        workflow_snapshot: existsSync(join(runDir(root, run.run_id), RUN_WORKFLOW_FILE)),
    };
}

/**
 * run 列表（可按集过滤）。
 */
export function listRunsView(root: string, episodeId?: string): WebRunSummary[] {
    return safeListRuns(root)
        .filter((r) => episodeId === undefined || episodeId === "" || r.episode_id === episodeId)
        .map((r) => runSummaryDto(root, r));
}

// 任务阶段文案
const TASK_PHASE_LABELS: Record<string, string> = {
    queued: "排队中",
    worker_started: "已领取任务",
    machine_lock_acquired: "已获取机器锁",
    engine_starting: "引擎启动中",
    engine_started: "引擎已启动",
    engine_ready: "引擎就绪",
    gpu_takeover_started: "GPU 接管中",
    gpu_takeover_finished: "GPU 接管完成",
    run_started: "开始执行",
    upload_started: "上传输入",
    upload_finished: "输入已上传",
    submitted: "已提交引擎",
    progress: "生成中",
    run_succeeded: "镜头成功",
    run_failed: "镜头失败",
    cleanup_started: "清理中",
    cleanup_finished: "清理完成",
    cancel_requested: "正在取消",
    finished: "已结束",
};

/**
 * 从事件流推导任务进度。
 */
function taskProgressOf(root: string, rec: TaskRecord): WebTaskProgress {
    // 事件
    let events: TaskEvent[] = [];
    try {
        events = readEvents(taskDir(root, rec.task_id));
    } catch {
        events = [];
    }
    // 最近事件
    const latest = events[events.length - 1] ?? null;
    // 阶段
    const phase = latest?.type ?? rec.status;
    return {
        phase,
        label: TASK_PHASE_LABELS[phase] ?? phase,
        run_id:
            latest !== null && typeof latest.data.run_id === "string" && latest.data.run_id !== ""
                ? latest.data.run_id
                : null,
        event_count: latest?.seq ?? 0,
        updated_at: latest?.ts ?? null,
    };
}

/**
 * 任务列表项。
 */
function taskItem(root: string, rec: TaskRecord): WebTaskItem {
    return {
        task_id: rec.task_id,
        kind: rec.kind,
        status: rec.status,
        mode: rec.mode,
        machine_id: rec.machine_id,
        episode_id: rec.episode_id ?? null,
        request_id: rec.request_id,
        runs: rec.runs,
        command: rec.command,
        created_at: rec.created_at,
        started_at: rec.started_at,
        finished_at: rec.finished_at,
        error: rec.error,
        next_actions: rec.next_actions,
        run_count: rec.runs.length,
        active: !isTerminalStatus(rec.status),
        progress: taskProgressOf(root, rec),
    };
}

/**
 * 任务列表。
 */
export function listTasksView(root: string, episodeId?: string): { items: WebTaskItem[]; total: number } {
    // 全部 task（可按集过滤）
    const tasks = safeListTasks(root).filter(
        (t) => episodeId === undefined || episodeId === "" || t.episode_id === episodeId,
    );
    return { items: tasks.map((task) => taskItem(root, task)), total: tasks.length };
}

/**
 * 任务详情。
 */
export function getTaskDetail(root: string, taskId: string): WebTaskDetail | null {
    // task 记录
    const task = safeReadTask(root, taskId);
    if (task === null) return null;
    // run 摘要
    const runs = task.runs
        .map((id) => safeReadRun(root, id))
        .filter((x): x is RunRecord => x !== null)
        .map((run) => runSummaryDto(root, run));
    // 事件
    let events: TaskEvent[] = [];
    try {
        events = readEvents(taskDir(root, taskId)).slice(-MAX_EVENT_ROWS);
    } catch {
        events = [];
    }
    return { ...taskItem(root, task), runs_detail: runs, events };
}

/**
 * 宽松对象视图。
 */
function recordOf(value: unknown): Record<string, unknown> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

/**
 * 非空字符串。
 */
function stringOf(value: unknown): string | null {
    if (typeof value !== "string") return null;
    // 去空白后的文本
    const text = value.trim();
    return text === "" ? null : text;
}

/**
 * 有限数字。
 */
function numberOf(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * 按别名顺序取第一个非空字段。
 */
function firstField(record: Record<string, unknown> | null, keys: readonly string[]): unknown {
    if (record === null) return undefined;
    for (const key of keys) {
        // 当前候选值
        const value = record[key];
        if (value !== undefined && value !== null && value !== "") return value;
    }
    return undefined;
}

/**
 * 按别名顺序取第一个非空字符串。
 */
function firstString(record: Record<string, unknown> | null, keys: readonly string[]): string | null {
    return stringOf(firstField(record, keys));
}

/**
 * 把单值或数组统一成数组。
 */
function arrayOf(value: unknown): unknown[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}

/**
 * 归一化后的角色 / 场景设定。
 */
interface RawEntity {
    /**
     * 稳定 id（可空）。
     */
    id: string | null;
    /**
     * 名称。
     */
    name: string;
    /**
     * 描述。
     */
    description: string | null;
    /**
     * 参考图。
     */
    reference: string | null;
}

/**
 * 把字符串 / 对象统一成设定。
 */
function entityFromRaw(value: unknown): RawEntity | null {
    if (typeof value === "string") {
        // 字符串名称
        const name = stringOf(value);
        return name !== null ? { id: null, name, description: null, reference: null } : null;
    }
    // 对象视图
    const record = recordOf(value);
    if (record === null) return null;
    // 稳定 id
    const id = firstString(record, ENTITY_ID_KEYS);
    // 展示名（缺省用 id）
    const name = firstString(record, ENTITY_NAME_KEYS) ?? id;
    if (name === null) return null;
    return {
        id,
        name,
        description: firstString(record, ENTITY_DESC_KEYS),
        reference: firstString(record, ENTITY_REF_KEYS),
    };
}

/**
 * 设定去重键。
 */
function entityKeyOf(entity: RawEntity): string {
    return entity.id !== null ? `id:${entity.id}` : `name:${entity.name}`;
}

/**
 * 读取 meta 中的人物 / 场景定义。
 */
function definitionsFrom(meta: Record<string, unknown>, keys: readonly string[]): RawEntity[] {
    // 定义候选
    const raw = firstField(meta, keys);
    // 归一化结果
    const out: RawEntity[] = [];
    // 已见 key
    const seen = new Set<string>();
    for (const item of arrayOf(raw)) {
        // 当前定义
        const entity = entityFromRaw(item);
        if (entity === null) continue;
        // 去重键
        const key = entityKeyOf(entity);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(entity);
    }
    return out;
}

/**
 * 把镜头引用解析成设定（优先补全定义中的描述/参考图）。
 */
function resolveEntities(refs: unknown, definitions: RawEntity[]): WebStoryEntity[] {
    // id 索引
    const byId = new Map<string, RawEntity>();
    // 名称索引
    const byName = new Map<string, RawEntity>();
    for (const def of definitions) {
        if (def.id !== null) byId.set(def.id, def);
        byName.set(def.name, def);
    }
    // 结果
    const out: WebStoryEntity[] = [];
    // 已见 key
    const seen = new Set<string>();
    for (const item of arrayOf(refs)) {
        // 引用自身
        const parsed = entityFromRaw(item);
        if (parsed === null) continue;
        // 匹配到的定义（字符串引用可能是 id，也可能是名称）
        const def =
            (parsed.id !== null ? byId.get(parsed.id) : undefined) ?? byName.get(parsed.name) ?? byId.get(parsed.name);
        // 合并后的设定
        const entity: WebStoryEntity = {
            id: parsed.id ?? def?.id ?? null,
            name: def?.name ?? parsed.name,
            description: parsed.description ?? def?.description ?? null,
            reference: parsed.reference ?? def?.reference ?? null,
            shots: [],
            count: 0,
        };
        // 去重键
        const key = entity.id !== null ? `id:${entity.id}` : `name:${entity.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(entity);
    }
    return out;
}

/**
 * 把 meta 中声明的设定放进聚合表（未出场也保留）。
 */
function seedEntities(map: Map<string, WebStoryEntity>, definitions: RawEntity[]): void {
    for (const def of definitions) {
        // 去重键
        const key = entityKeyOf(def);
        if (map.has(key)) continue;
        map.set(key, { ...def, shots: [], count: 0 });
    }
}

/**
 * 合并一个出场镜头到聚合表。
 */
function mergeEntity(map: Map<string, WebStoryEntity>, entity: WebStoryEntity, shotId: string): void {
    // 去重键
    const key = entity.id !== null ? `id:${entity.id}` : `name:${entity.name}`;
    // 已有聚合项
    const existing = map.get(key);
    if (existing === undefined) {
        map.set(key, { ...entity, shots: [shotId], count: 1 });
        return;
    }
    if (!existing.shots.includes(shotId)) existing.shots.push(shotId);
    existing.count = existing.shots.length;
    if (existing.description === null && entity.description !== null) existing.description = entity.description;
    if (existing.reference === null && entity.reference !== null) existing.reference = entity.reference;
}

/**
 * 按出场数倒序排列。
 */
function sortEntities(list: WebStoryEntity[]): WebStoryEntity[] {
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * 最新成功 run 的首个展示产物。
 */
function latestArtifactOf(root: string, run: RunRecord | null): WebArtifact | null {
    if (run === null || run.outputs.length === 0) return null;
    // 优先视频，其次第一个产物
    const output = run.outputs.find((o) => classifyArtifact(o.name) === "video") ?? run.outputs[0];
    return output !== undefined ? artifactOf(root, run, output) : null;
}

/**
 * 分镜视图。
 */
export function buildShotsView(
    root: string,
    shots: ShotsFile | null,
    labelPrefix = "shot:",
    context?: EpisodeContext,
): WebShotsView | null {
    if (shots === null) return null;
    // meta 宽松视图
    const metaRecord = shots.meta as unknown as Record<string, unknown>;
    // defaults 宽松视图
    const defaultsRecord = shots.defaults as unknown as Record<string, unknown>;
    // 帧率
    const fps = numberOf(metaRecord.fps) ?? numberOf(defaultsRecord.fps);
    // 人物定义
    const characterDefs = definitionsFrom(metaRecord, CHARACTER_KEYS);
    // 场景定义
    const sceneDefs = definitionsFrom(metaRecord, SCENE_DEF_KEYS);
    // 人物聚合表
    const characterMap = new Map<string, WebStoryEntity>();
    // 场景聚合表
    const sceneMap = new Map<string, WebStoryEntity>();
    seedEntities(characterMap, characterDefs);
    seedEntities(sceneMap, sceneDefs);
    // 全部 run
    const runs = safeListRuns(root);
    // 活动任务（镜头生成 / 重拍中）
    const activeTaskByShot = new Map<string, TaskRecord>();
    const episodeId = context?.episode_id ?? null;
    for (const task of safeListTasks(root)) {
        if (isTerminalStatus(task.status)) continue;
        if ((task.episode_id ?? null) !== episodeId) continue;
        for (const shotId of task.options.shots ?? []) activeTaskByShot.set(shotId, task);
    }
    // label -> runs
    const byLabel = new Map<string, RunRecord[]>();
    for (const run of runs) {
        if (run.label === null) continue;
        // 当前 label 的列表
        const list = byLabel.get(run.label) ?? [];
        list.push(run);
        byLabel.set(run.label, list);
    }
    // 镜头列表
    const items = shots.shots.map((shot): WebShotItem => {
        // 该镜 run
        const shotRuns = byLabel.get(`${labelPrefix}${shot.id}`) ?? [];
        // 最新 run
        const latest = shotRuns[0] ?? null;
        // 最新成功 run
        const latestSuccess = shotRuns.find((r) => r.status === "succeeded") ?? null;
        // 本镜选稿（提供剧集上下文时定稿优先）
        const take = context === undefined ? null : pickShotTake(root, context, shot.id, runs);
        // 定稿 run
        const finalizedRun = take?.source === "finalized" ? (take.run?.run_id ?? null) : null;
        // 定稿稿件名
        const finalizedOutput = take?.source === "finalized" ? (take.output?.name ?? null) : null;
        // 镜头宽松视图
        const record = shot as unknown as Record<string, unknown>;
        // params 宽松视图
        const params = recordOf(shot.params);
        // 人物引用（镜头字段优先，其次 params）
        const characterRefs = firstField(record, CHARACTER_KEYS) ?? firstField(params, CHARACTER_KEYS);
        // 场景引用（镜头字段优先，其次 params）
        const sceneRef = firstField(record, SCENE_KEYS) ?? firstField(params, SCENE_KEYS);
        // 本镜人物
        const shotCharacters = resolveEntities(characterRefs, characterDefs);
        // 本镜场景
        const shotScene = resolveEntities(sceneRef, sceneDefs)[0] ?? null;
        for (const entity of shotCharacters) {
            entity.shots = [shot.id];
            entity.count = 1;
            mergeEntity(characterMap, entity, shot.id);
        }
        if (shotScene !== null) {
            shotScene.shots = [shot.id];
            shotScene.count = 1;
            mergeEntity(sceneMap, shotScene, shot.id);
        }
        // 首帧展示
        let firstFrame: string | null = null;
        // 首帧类型
        let firstFrameKind: WebShotItem["first_frame_kind"] = "none";
        if (typeof shot.first_frame === "string") {
            firstFrame = shot.first_frame;
            firstFrameKind = "anchor";
        } else if (shot.first_frame !== undefined && typeof shot.first_frame === "object") {
            firstFrame = `接力 ${shot.first_frame.relay}`;
            firstFrameKind = "relay";
        }
        // 帧数
        const length = shot.length ?? shots.defaults.length ?? null;
        // 时长（秒）
        const durationSeconds =
            numberOf(shot.duration) ?? (length !== null && fps !== null && fps > 0 ? length / fps : null);
        // 全部历史 run
        const runViews = shotRuns.map((run): WebShotRun => {
            return {
                run_id: run.run_id,
                status: run.status,
                started_at: run.started_at,
                finished_at: run.finished_at,
                duration_ms: durationMs(run.started_at, run.finished_at),
                error: run.error,
                outputs: run.outputs.map((o) => artifactOf(root, run, o)),
                finalized: run.run_id === finalizedRun,
            };
        });
        // 全部历史产物
        const artifacts = shotRuns.flatMap((run) => flattenArtifacts(root, [run]));
        for (const item of artifacts) {
            item.finalized = item.run_id === finalizedRun && item.output.name === finalizedOutput;
        }
        // 活动任务
        const activeTask = activeTaskByShot.get(shot.id) ?? null;
        return {
            id: shot.id,
            slug: shot.slug ?? null,
            title: shot.title ?? shot.slug ?? null,
            summary: shot.summary ?? shot.description ?? firstString(record, CONTENT_KEYS) ?? shot.prompt,
            seed: shot.seed,
            prompt: shot.prompt,
            characters: shotCharacters,
            scene: shotScene,
            first_frame: firstFrame,
            first_frame_kind: firstFrameKind,
            workflow: shot.workflow ?? shots.workflow ?? null,
            done: latestSuccess !== null,
            latest_run: latest?.run_id ?? null,
            latest_status: latest?.status ?? null,
            latest_artifact: latestArtifactOf(root, latestSuccess),
            finalized_run: finalizedRun,
            finalized_output: finalizedOutput,
            take_source: take?.source ?? null,
            take_stale: take?.stale?.reason ?? null,
            artifacts,
            runs: runViews,
            runs_count: shotRuns.length,
            succeeded_count: shotRuns.filter((r) => r.status === "succeeded").length,
            length,
            duration_seconds: durationSeconds,
            width: shot.width ?? shots.meta.width,
            height: shot.height ?? shots.meta.height,
            steps: shot.steps ?? shots.defaults.steps ?? null,
            cfg: shot.cfg ?? shots.defaults.cfg ?? null,
            notes: shot.notes ?? null,
            params: shot.params ?? null,
            active_task:
                activeTask !== null
                    ? {
                          task_id: activeTask.task_id,
                          kind: activeTask.kind,
                          status: activeTask.status,
                          label: taskProgressOf(root, activeTask).label,
                      }
                    : null,
        };
    });
    // 人物聚合
    const characters = sortEntities(Array.from(characterMap.values()));
    // 场景聚合
    const scenes = sortEntities(Array.from(sceneMap.values()));
    // 产物总数
    const artifactsTotal = items.reduce((sum, item) => sum + item.artifacts.length, 0);
    // 总帧数
    const totalFrames = items.reduce((sum, item) => sum + (item.length ?? 0), 0);
    // 镜头时长
    const durations = items.map((item) => item.duration_seconds);
    // 总时长（全部镜头都可推导时才给出）
    const totalDuration =
        items.length > 0 && durations.every((value) => value !== null)
            ? durations.reduce((sum, value) => sum + (value ?? 0), 0)
            : null;
    return {
        title: shots.meta.title ?? null,
        synopsis: firstString(metaRecord, SYNOPSIS_KEYS),
        workflow: shots.workflow ?? null,
        style_prefix: shots.style_prefix ?? null,
        meta: shots.meta,
        defaults: shots.defaults,
        fps,
        characters,
        scenes,
        summary: {
            shots_total: items.length,
            shots_done: items.filter((item) => item.done).length,
            shots_finalized: items.filter((item) => item.finalized_run !== null).length,
            characters_total: characters.length,
            scenes_total: scenes.length,
            artifacts_total: artifactsTotal,
            total_frames: totalFrames,
            total_duration_seconds: totalDuration,
            resolution: `${shots.meta.width}x${shots.meta.height}`,
            fps,
        },
        shots: items,
    };
}

/**
 * 成片列表。
 */
export function listFinals(root: string, episodeId: string): WebFinalItem[] {
    // 单集成片目录
    const dir = join(root, FINAL_DIR, episodeId);
    if (!existsSync(dir)) return [];
    // 目录项
    const entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile());
    // 已引用的成片
    const referenced = new Set<string>();
    // 结果
    const out: WebFinalItem[] = [];
    for (const entry of entries) {
        if (!entry.name.endsWith(".json")) continue;
        try {
            // manifest 内容
            const manifest = JSON.parse(readFileSync(join(dir, entry.name), "utf8")) as Record<string, unknown>;
            // 成片文件名
            const cut = typeof manifest.cut === "string" ? manifest.cut : "";
            if (cut === "" || basename(cut) !== cut || cut.includes("/") || cut.includes("\\")) continue;
            if (!existsSync(join(dir, cut))) continue;
            referenced.add(cut);
            // 文件状态
            const stat = statSync(join(dir, cut));
            // 媒体地址
            const mediaUrl = withMediaVersion(finalMediaUrl(cut, episodeId), `${stat.size}-${stat.mtimeMs}`);
            // 片段列表
            const clips = Array.isArray(manifest.clips)
                ? manifest.clips
                      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
                      .map((x) => ({
                          shot: String(x.shot ?? ""),
                          run_id: String(x.run_id ?? ""),
                          artifact: String(x.artifact ?? ""),
                      }))
                : [];
            out.push({
                episode_id: episodeId,
                name: cut,
                manifest: entry.name,
                media_url: mediaUrl,
                download_url: mediaDownloadUrl(mediaUrl),
                bytes: stat.size,
                present: true,
                lfs_pointer: isLfsPointer(join(dir, cut), stat.size),
                created_at: typeof manifest.created_at === "string" ? manifest.created_at : null,
                clips,
                missing: Array.isArray(manifest.missing) ? manifest.missing.map((x) => String(x)) : [],
            });
        } catch {
            // 坏 manifest 跳过
        }
    }
    // 未带 manifest 的成片
    for (const entry of entries) {
        if (referenced.has(entry.name)) continue;
        if (!/^cut-.*\.(mp4|webm|mov|mkv)$/i.test(entry.name)) continue;
        try {
            // 文件状态
            const stat = statSync(join(dir, entry.name));
            // 媒体地址
            const mediaUrl = withMediaVersion(finalMediaUrl(entry.name, episodeId), `${stat.size}-${stat.mtimeMs}`);
            out.push({
                episode_id: episodeId,
                name: entry.name,
                manifest: null,
                media_url: mediaUrl,
                download_url: mediaDownloadUrl(mediaUrl),
                bytes: stat.size,
                present: true,
                lfs_pointer: isLfsPointer(join(dir, entry.name), stat.size),
                created_at: null,
                clips: [],
                missing: [],
            });
        } catch {
            // 文件消失时跳过
        }
    }
    return out.sort((a, b) => b.name.localeCompare(a.name));
}

/**
 * 工作流列表。
 */
export function listWorkflows(root: string, project: ProjectConfig): WebWorkflowItem[] {
    // workflows 目录
    const dir = join(root, WORKFLOWS_DIR);
    if (!existsSync(dir)) return [];
    // 默认 workflow 引用
    const defaultRef = (project.default_workflow ?? "").trim();
    // 结果
    const out: WebWorkflowItem[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.endsWith(".bindings.json")) continue;
        // 短名
        const name = entry.name.slice(0, -".json".length);
        // 图内容
        let graph: unknown = null;
        try {
            graph = JSON.parse(readFileSync(join(dir, entry.name), "utf8"));
        } catch {
            graph = null;
        }
        // 节点数
        const nodes =
            graph !== null && typeof graph === "object" && !Array.isArray(graph) ? Object.keys(graph).length : 0;
        out.push({
            name,
            path: `${WORKFLOWS_DIR}/${entry.name}`,
            nodes,
            bindings: existsSync(join(dir, `${name}.bindings.json`)),
            default:
                defaultRef === name || defaultRef === `workflows/${name}` || defaultRef === `workflows/${name}.json`,
            valid: graph !== null && typeof graph === "object",
        });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 统计块。
 */
function buildStats(
    shots: ShotsFile | null,
    runs: RunRecord[],
    tasks: TaskRecord[],
    storyboard: WebShotsView | null = null,
): Record<string, unknown> {
    // 产物总数
    const outputCount = runs.reduce((sum, r) => sum + r.outputs.length, 0);
    // 产物总字节
    const outputBytes = runs.reduce((sum, r) => sum + r.outputs.reduce((s, o) => s + o.bytes, 0), 0);
    // 已完成镜头
    const doneShots =
        storyboard?.summary.shots_done ??
        (shots === null
            ? 0
            : shots.shots.filter((s) => runs.some((r) => r.label === `shot:${s.id}` && r.status === "succeeded"))
                  .length);
    return {
        runs_total: runs.length,
        runs_succeeded: runs.filter((r) => r.status === "succeeded").length,
        runs_failed: runs.filter((r) => r.status === "failed").length,
        tasks_total: tasks.length,
        tasks_active: tasks.filter((t) => !isTerminalStatus(t.status)).length,
        outputs_total: outputCount,
        outputs_bytes: outputBytes,
        shots_total: shots?.shots.length ?? 0,
        shots_done: doneShots,
        characters_total: storyboard?.summary.characters_total ?? 0,
        scenes_total: storyboard?.summary.scenes_total ?? 0,
        total_frames: storyboard?.summary.total_frames ?? 0,
        total_duration_seconds: storyboard?.summary.total_duration_seconds ?? null,
    };
}

/**
 * 把 story 计数并入概览统计。
 */
function withStoryStats(stats: Record<string, unknown>, story: SeriesStoryStatus): Record<string, unknown> {
    return {
        ...stats,
        episodes_total: story.counts.episodes,
        characters_total: story.counts.characters,
        forms_total: story.counts.forms,
        scenes_total: story.counts.scenes,
        voices_total: story.counts.voices,
        shots_total: story.counts.shots,
        assets_total: story.counts.assets,
    };
}

/**
 * story 模式概览字段。
 */
function storyOverviewFields(
    root: string,
    project: ProjectConfig,
): {
    story: SeriesStoryStatus;
    series: SeriesStoryStatus["series"];
    episodes: SeriesStoryStatus["episodes"];
} | null {
    if (!storyEnabled(root)) return null;
    // 系列状态
    const story = computeSeriesStoryStatus(root, project);
    return { story, series: story.series, episodes: story.episodes };
}

/**
 * 无本机配置时的共享数据概览。
 */
function buildSharedOverview(root: string, project: ProjectConfig): Record<string, unknown> {
    // 全部 run
    const runs = safeListRuns(root);
    // 全部 task
    const tasks = safeListTasks(root);
    // story 字段
    const storyFields = storyOverviewFields(root, project);
    // 基础统计
    const stats = buildStats(null, runs, tasks, null);
    return {
        project: { name: project.name, version: project.version },
        mode: null,
        machine_id: null,
        machine: null,
        engine: null,
        machine_lock: null,
        active_task: null,
        active_tasks: [],
        synced_running_tasks: [],
        recent_tasks: tasks.slice(0, 10).map((task) => taskItem(root, task)),
        gpu: null,
        skill: null,
        shots: [],
        storyboard: null,
        ...(storyFields !== null ? storyFields : {}),
        next_actions: storyFields !== null ? storyFields.story.next_actions : [],
        stats: storyFields !== null ? withStoryStats(stats, storyFields.story) : stats,
        recent_artifacts: flattenArtifacts(root, runs).slice(0, OVERVIEW_ARTIFACT_LIMIT),
        generated_at: nowIso(),
    };
}

/**
 * 移除本机绝对路径后的 machine 视图。
 */
function machineViewOf(machine: unknown): Record<string, unknown> | null {
    if (machine === null || typeof machine !== "object") return null;
    // 原始 machine
    const m = machine as Record<string, unknown>;
    // 引擎段
    const engine = m.engine;
    if (engine === null || typeof engine !== "object") {
        return { id: m.id, engine: null, override_workflows: m.override_workflows };
    }
    // 原始引擎
    const e = engine as Record<string, unknown>;
    return {
        id: m.id,
        engine:
            e.mode === "local"
                ? { mode: "local", port: e.port, comfyui_version: e.comfyui_version }
                : { mode: "remote", free_after_task: e.free_after_task },
        override_workflows: m.override_workflows,
    };
}

/**
 * 概览数据。
 */
export async function buildOverview(
    root: string,
    project: ProjectConfig,
    machine: MachineConfig | null,
    commands: readonly SkillCommand[] = [],
): Promise<Record<string, unknown>> {
    if (machine === null) return buildSharedOverview(root, project);
    // story 字段
    const storyFields = storyOverviewFields(root, project);
    // 复用 status 快照
    const base = await buildStatusSnapshot(root, project, machine, null, {
        commands,
        engineTimeoutMs: OVERVIEW_ENGINE_TIMEOUT_MS,
    });
    // 全部 run
    const runs = safeListRuns(root);
    // 全部 task
    const tasks = safeListTasks(root);
    // 基础统计
    const stats = buildStats(null, runs, tasks, null);
    return {
        ...base,
        machine: machineViewOf(base.machine),
        storyboard: null,
        ...(storyFields !== null ? storyFields : {}),
        next_actions: storyFields !== null ? storyFields.story.next_actions : base.next_actions,
        stats: storyFields !== null ? withStoryStats(stats, storyFields.story) : stats,
        recent_artifacts: flattenArtifacts(root, runs).slice(0, OVERVIEW_ARTIFACT_LIMIT),
        recent_tasks: tasks.slice(0, 10).map((task) => taskItem(root, task)),
        generated_at: nowIso(),
    };
}
