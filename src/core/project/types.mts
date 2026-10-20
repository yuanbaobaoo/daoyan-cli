/** 项目数据模型 —— project.json v2（共享层）、.dycli/machine.json（本机层）、
 *  task / run 记录与 shots recipe 的类型定义。完整文档见 docs/DATA-MODEL.md。
 *  原则：共享记录不写绝对路径；本机路径只出现在 machine.json。 */

// —— 项目布局常量：文件名 / 目录名（全仓唯一声明处，其余位置一律引用） ——
// 共享：项目配置（自 cwd 向上寻找的锚点）
export const PROJECT_FILE = "project.json";
// 共享：视频 recipe
export const SHOTS_FILE = "shots.json";
// 共享：系列级剧本与设定集
export const STORY_DIR = "story";
// 共享：系列元数据
export const STORY_SERIES_FILE = "story/series.json";
// 共享：全局角色
export const STORY_CHARACTERS_FILE = "story/characters.json";
// 共享：全局场景
export const STORY_SCENES_FILE = "story/scenes.json";
// 共享：全局音色
export const STORY_VOICES_FILE = "story/voices.json";
// 共享：设定资产根目录
export const STORY_ASSETS_DIR = "story/assets";
// 共享：分集根目录
export const EPISODES_DIR = "episodes";
// 分集：元数据文件名
export const EPISODE_META_FILE = "episode.json";
// 分集：剧本文本
export const SCRIPT_TEXT_FILE = "script.md";
// 分集：剧本元数据
export const SCRIPT_FILE = "script.json";
// 分集：拆解
export const BREAKDOWN_FILE = "breakdown.json";
// 共享：工作流目录
export const WORKFLOWS_DIR = "workflows";
// 共享：逻辑输入映射（<name>.bindings.json 与同目录）
export const BINDINGS_SUFFIX = ".bindings.json";
// 共享：原始素材
export const INPUTS_DIR = "inputs";
// 共享：任务记录
export const TASKS_DIR = "tasks";
// 共享：运行记录与产物
export const RUNS_DIR = "runs";
// 共享：最终合片
export const FINAL_DIR = "final";
// 共享：Agent Skill
export const AGENTS_DIR = ".agents";
export const SKILL_DIR = ".agents/skills/daoyan";
export const AGENTS_FILE = "AGENTS.md";
// 本机：项目级私有目录（gitignored）
export const LOCAL_DIR = ".dycli";
export const MACHINE_FILE = ".dycli/machine.json";
export const CATALOG_FILE = ".dycli/node_catalog.json";
export const EXTRA_MODELS_FILE = ".dycli/extra_model_paths.yaml";
// 本机：引擎与日志
export const ENGINE_DIR = "engine";
export const LOG_DIR = "logs";
export const ENGINE_PID_FILE = "engine.pid";
// 任务事件文件（位于 tasks/<task_id>/）
export const TASK_FILE = "task.json";
export const EVENTS_FILE = "events.jsonl";
// run 目录内文件
export const RUN_FILE = "run.json";
export const RUN_WORKFLOW_FILE = "workflow.json";
export const RUN_INPUTS_FILE = "inputs.json";
// 任务取消请求文件（位于 tasks/<task_id>/）
export const CANCEL_FILE = "cancel.request";
// 合片 ffmpeg 列表临时文件（项目根，gitignored）
export const CONCAT_LIST_FILE = "concat_list.txt";
// 中间接力帧缓存（项目根，gitignored）
export const RELAY_DIR = "relay_frames";

/**
 * 可写入 JSON 的标量/复合值（工作流输入）。
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

/**
 * 自定义节点安装声明（共享层，repo + ref 可跨机器复现）。
 */
export interface CustomNodeSpec {
    /**
     * 目录名（安装到 engine/ComfyUI/custom_nodes/<name>）。
     */
    name: string;
    /**
     * Git clone 地址。
     */
    repo: string;
    /**
     * 分支 / tag / commit。
     */
    ref?: string;
}

/**
 * project.json（共享，进 Git，不含绝对路径与机器差异）。
 */
export interface ProjectConfig {
    /**
     * 项目名（init 用目录名生成，仅展示用）。
     */
    name: string;
    /**
     * schema 版本（当前固定 2）。
     */
    version: 2;
    /**
     * 默认 workflow（相对项目根，如 workflows/t2v.json）。
     */
    default_workflow?: string;
    /**
     * 剧本 / 设定集门禁策略（story 模式）。
     */
    story?: {
        /**
         * strict（默认）/ warn / off。
         */
        enforce?: "strict" | "warn" | "off";
    };
    /**
     * GPU 接管开关（项目级策略，remote 忽略）。
     */
    gpu?: {
        /**
         * 默认 false；true = local 任务前自动接管内置目标，任务后恢复。
         */
        takeover?: boolean;
    };
    /**
     * ComfyUI 版本与 custom nodes pin（local 模式 init 使用）。
     */
    comfyui?: {
        /**
         * ComfyUI tag（如 v0.3.40）。
         */
        version?: string;
        /**
         * 需要安装的自定义节点。
         */
        custom_nodes?: CustomNodeSpec[];
    };
}

/**
 * remote 模式的模型释放策略。
 */
export type FreeStrategy = "always" | "when_idle" | "never";

/**
 * .dycli/machine.json 的 local 引擎段。
 */
export interface MachineLocalEngine {
    /**
     * 固定 local。
     */
    mode: "local";
    /**
     * 外部模型根目录（绝对路径）；省略时使用 engine/ComfyUI/models。
     */
    modelpath?: string;
    /**
     * 自定义 extra_model_paths.yaml（绝对路径）；设置后忽略自动生成。
     */
    models_config?: string | null;
    /**
     * 项目专属端口。
     */
    port: number;
    /**
     * 透传 ComfyUI 参数（如 --lowvram）。
     */
    launch_extra?: string[];
    /**
     * 本机覆盖的 ComfyUI 版本（默认用 project.json 的 pin）。
     */
    comfyui_version?: string;
    /**
     * ComfyUI 目录（相对项目根或绝对路径）；默认 engine/ComfyUI。
     */
    comfyui_dir?: string;
    /**
     * venv 目录（相对项目根或绝对路径）；默认 engine/.venv。
     */
    venv_dir?: string;
}

/**
 * .dycli/machine.json 的 remote 引擎段。
 */
export interface MachineRemoteEngine {
    /**
     * 固定 remote。
     */
    mode: "remote";
    /**
     * 外部 ComfyUI base URL（可含路径前缀）。
     */
    url: string;
    /**
     * 任务结束后的释放策略；默认 when_idle。
     */
    free_after_task?: FreeStrategy;
}

/**
 * 机器配置（本机，gitignored）：mode、模型路径、端口、覆盖项。
 */
export interface MachineConfig {
    /**
     * 本机标签（默认 hostname），写入 task/run 记录。
     */
    machine_id: string;
    /**
     * 引擎接入配置。
     */
    engine: MachineLocalEngine | MachineRemoteEngine;
    /**
     * 本机节点输入覆盖：workflow 相对路径 -> { "nodeId.input": value }。
     * 优先级：workflow < machine overrides < --set。
     */
    overrides?: Record<string, Record<string, JsonValue>>;
}

/**
 * first_frame 三形态：锚点 key / 接力 / 纯 T2V。
 */
export type FirstFrame = string | { relay: string } | undefined;

/**
 * 角色 / 场景等可复用设定（仅展示与复用，不直接注入 workflow）。
 */
/**
 * 镜头台词（story 模式；音色引用可省略的前提是该角色只有一个音色）。
 */
export interface ShotDialogue {
    /**
     * 说话角色 id。
     */
    character: string;
    /**
     * 台词文本。
     */
    text: string;
    /**
     * 音色 id。
     */
    voice?: string;
    /**
     * 情绪 / 表演提示。
     */
    emotion?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 角色 / 场景等可复用设定（仅展示与复用，不直接注入 workflow）。
 */
export interface StoryEntity {
    /**
     * 稳定 id（镜头通过 id 引用）。
     */
    id?: string;
    /**
     * 展示名（老字段；story 模式引用可使用 id + form）。
     */
    name?: string;
    /**
     * 角色形态 id（仅角色引用使用）。
     */
    form?: string;
    /**
     * 设定描述。
     */
    description?: string;
    /**
     * 参考图（项目内相对路径）。
     */
    reference?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 设定引用：字符串（id 或名称）或完整对象。
 */
export type StoryEntityRef = string | StoryEntity;

/**
 * 分镜表中的单个镜头（recipe）。
 */
export interface ShotSpec {
    /**
     * 镜号（如 "01"；run label 为 shot:<id>）。
     */
    id: string;
    /**
     * 镜头短名（产物命名 / 展示用）。
     */
    slug?: string;
    /**
     * 镜头标题（展示用，缺省用 slug / 镜号）。
     */
    title?: string;
    /**
     * 内容摘要（展示用；缺省用 prompt）。
     */
    summary?: string;
    /**
     * 内容描述（summary 的别名）。
     */
    description?: string;
    /**
     * 出场人物（id/名称或对象）。
     */
    characters?: StoryEntityRef[];
    /**
     * 场景（id/名称或对象）。
     */
    scene?: StoryEntityRef;
    /**
     * 场景别名（与 scene 二选一）。
     */
    location?: string;
    /**
     * 期望时长（秒；缺省可按 length / fps 推导）。
     */
    duration?: number;
    /**
     * 制作备注。
     */
    notes?: string;
    /**
     * 剧本 beat 引用（拆解提供 beats 时校验）。
     */
    script_refs?: string[];
    /**
     * 台词与音色引用。
     */
    dialogue?: ShotDialogue[];
    /**
     * 工作流资产槽位显式映射（slot -> owner 或 owner@asset）。
     */
    asset_slots?: Record<string, string>;
    /**
     * 随机种子（通过 bindings 的 seed 注入）。
     */
    seed: number;
    /**
     * 正向提示词（与 style_prefix 拼接后通过 bindings 注入）。
     */
    prompt: string;
    /**
     * 首帧来源（缺省 = 纯文生）。
     */
    first_frame?: FirstFrame;
    /**
     * 覆盖采样步数。
     */
    steps?: number;
    /**
     * 覆盖引导强度。
     */
    cfg?: number;
    /**
     * 覆盖帧数。
     */
    length?: number;
    /**
     * 覆盖宽度。
     */
    width?: number;
    /**
     * 覆盖高度。
     */
    height?: number;
    /**
     * 该镜使用的 workflow（短名或相对路径）；缺省用文件级 / project.default_workflow。
     */
    workflow?: string;
    /**
     * 额外的逻辑输入（键必须出现在 bindings 中）。
     */
    params?: Record<string, JsonValue>;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 分镜表元信息。
 */
export interface ShotsMeta {
    /**
     * 片名（可选，仅展示用）。
     */
    title?: string;
    /**
     * 所属剧集 id（story 模式）。
     */
    episode_id?: string;
    /**
     * 本集剧本 revision（story 模式）。
     */
    script_revision?: number;
    /**
     * 本集剧本 sha256（story 模式）。
     */
    script_sha256?: string;
    /**
     * 剧情简介（展示用）。
     */
    synopsis?: string;
    /**
     * 全片人物设定。
     */
    characters?: StoryEntityRef[];
    /**
     * 全片场景设定。
     */
    scenes?: StoryEntityRef[];
    /**
     * 帧率（用于 length -> 时长展示）。
     */
    fps?: number;
    /**
     * 生成宽度（建议为 32 的倍数）。
     */
    width: number;
    /**
     * 生成高度（建议为 32 的倍数）。
     */
    height: number;
    /**
     * 锚点 key -> 相对项目根的图片路径。
     */
    anchors: Record<string, string>;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 全片默认参数（镜头未覆盖时生效；通过 bindings 注入）。
 */
export interface ShotsDefaults {
    /**
     * 默认帧数。
     */
    length?: number;
    /**
     * 默认帧率（用于时长展示）。
     */
    fps?: number;
    /**
     * 默认采样步数。
     */
    steps?: number;
    /**
     * 默认引导强度。
     */
    cfg?: number;
    /**
     * 采样器名称。
     */
    sampler_name?: string;
    /**
     * 调度器名称。
     */
    scheduler?: string;
    /**
     * 视频偏移量。
     */
    shift_video?: number;
    /**
     * 音频偏移量。
     */
    shift_audio?: number;
    /**
     * 默认负向提示词。
     */
    negative?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * shots.json 的完整结构（视频 recipe，跨机器共享）。
 */
export interface ShotsFile {
    /**
     * 文件级默认 workflow（可被单镜覆盖）。
     */
    workflow?: string;
    /**
     * 全片级元信息。
     */
    meta: ShotsMeta;
    /**
     * 全片默认生成参数。
     */
    defaults: ShotsDefaults;
    /**
     * 风格前缀（与每镜 prompt 拼接）。
     */
    style_prefix?: string;
    /**
     * 镜头列表（顺序即合片顺序）。
     */
    shots: ShotSpec[];
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * bindings 文件：逻辑输入名 -> "nodeId.input"。
 */
export interface Bindings {
    /**
     * 逻辑名到节点输入的映射。
     */
    [logical: string]: string;
}

/**
 * task 生命周期状态。
 */
export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "interrupted";

/**
 * task 类型（决定 worker 如何展开 runs）。
 */
export type TaskKind = "run" | "shot" | "retake" | "batch" | "metadata";

/**
 * task worker 信息。
 */
export interface TaskWorkerInfo {
    /**
     * worker 进程 pid。
     */
    pid: number;
    /**
     * worker 启动时间（ISO）。
     */
    started_at: string;
}

/**
 * task.json 里的执行选项（worker 快照）。
 */
export interface TaskOptions {
    /**
     * 目标 workflow（短名或项目内相对路径）；run 必填。
     */
    workflow?: string;
    /**
     * 节点/逻辑输入覆盖（--set）。
     */
    sets?: Record<string, JsonValue>;
    /**
     * run label（默认 shot:<id> / 用户 --label）。
     */
    label?: string;
    /**
     * shot/retake 的目标镜号。
     */
    shots?: string[];
    /**
     * 覆盖采样步数（shot）。
     */
    steps?: number;
    /**
     * 等待上限（毫秒）。
     */
    timeout_ms?: number;
    /**
     * 单次 remote 覆盖 URL。
     */
    engine_url?: string;
    /**
     * 忽略已有成功 run（retake）。
     */
    force?: boolean;
    /**
     * 是否显式绕过了剧情门禁（--allow-incomplete）。
     */
    story_gate_bypassed?: boolean;
    /**
     * 门禁警告（warn 模式或绕过时写入 task）。
     */
    story_gate_warnings?: Array<{ code: string; message: string; ref?: string; shots?: string[] }>;
}

/**
 * task 记录（tasks/<task_id>/task.json）。
 */
export interface TaskRecord {
    /**
     * task id（t_<timestamp>-<machine>-<suffix>）。
     */
    task_id: string;
    /**
     * 任务类型。
     */
    kind: TaskKind;
    /**
     * 机器标签（区分 Git 同步来的其他机器任务）。
     */
    machine_id: string;
    /**
     * 所属剧集 id；legacy / 系列级为 null。
     */
    episode_id?: string | null;
    /**
     * 幂等键（可空）。
     */
    request_id: string | null;
    /**
     * 当前状态。
     */
    status: TaskStatus;
    /**
     * 执行模式。
     */
    mode: "local" | "remote";
    /**
     * 创建该 task 的命令（展示用）。
     */
    command: string;
    /**
     * 本次 task 产生的 run id 列表（按执行顺序）。
     */
    runs: string[];
    /**
     * worker 信息（未启动为 null）。
     */
    worker: TaskWorkerInfo | null;
    /**
     * 创建时间（ISO）。
     */
    created_at: string;
    /**
     * 开始时间（ISO）。
     */
    started_at: string | null;
    /**
     * 结束时间（ISO）。
     */
    finished_at: string | null;
    /**
     * 终态错误（成功为 null）。
     */
    error: { code: string; message: string; details?: Record<string, unknown> } | null;
    /**
     * 给 Agent 的下一步动作。
     */
    next_actions: string[];
    /**
     * 执行选项快照。
     */
    options: TaskOptions;
}

/**
 * task events.jsonl 的单个事件。
 */
export interface TaskEvent {
    /**
     * 递增序号（从 1 开始）。
     */
    seq: number;
    /**
     * 事件时间（ISO）。
     */
    ts: string;
    /**
     * 事件类型（queued / engine_started / submitted / run_succeeded / cleanup_finished …）。
     */
    type: string;
    /**
     * 事件数据（不含绝对路径与密钥）。
     */
    data: Record<string, unknown>;
}

/**
 * run 产物记录。
 */
export interface RunOutput {
    /**
     * 文件名（outputs/ 下）。
     */
    name: string;
    /**
     * 相对 run 目录的路径（outputs/<name>）。
     */
    path: string;
    /**
     * 内容 sha256。
     */
    sha256: string;
    /**
     * 字节数。
     */
    bytes: number;
}

/**
 * cleanup 结果（每个环节的简短状态）。
 */
export interface CleanupRecord {
    /**
     * interrupt：ok / failed / not_needed。
     */
    interrupt: string;
    /**
     * free：ok / failed / skipped / not_needed。
     */
    free: string;
    /**
     * stop：ok / failed / not_needed。
     */
    stop: string;
    /**
     * scratch：ok / kept / not_needed。
     */
    scratch: string;
    /**
     * gpu_restore：ok / failed / not_needed。
     */
    gpu_restore: string;
}

/**
 * run 的引擎段。
 */
export interface RunEngineRecord {
    /**
     * local / remote。
     */
    mode: "local" | "remote";
    /**
     * ComfyUI 版本（可空）。
     */
    comfyui_version: string | null;
    /**
     * 引擎 URL（local 为 localhost，remote 为用户 URL）。
     */
    url: string;
    /**
     * local 进程 pid（remote 为 null）。
     */
    pid: number | null;
    /**
     * 从启动到就绪的毫秒数（remote 为 null）。
     */
    ready_ms: number | null;
    /**
     * cleanup 结果（task 结束后回填）。
     */
    cleanup: CleanupRecord | null;
}

/**
 * run 的 GPU 接管段（仅 local 且发生接管时出现）。
 */
export interface RunGpuRecord {
    /**
     * 是否请求了接管。
     */
    takeover: boolean;
    /**
     * 接管前显存（MiB）。
     */
    before?: { used_mb: number; free_mb: number };
    /**
     * 被卸载/驱逐的对象。
     */
    evicted: Array<Record<string, unknown>>;
    /**
     * 接管后显存（MiB）。
     */
    after?: { used_mb?: number; free_mb?: number };
    /**
     * 已恢复的对象。
     */
    restored: string[];
    /**
     * 部分失败记录（如 gpu_takeover_failed）。
     */
    errors: Array<{ code: string; message: string }>;
}

/**
 * run 记录（runs/<run_id>/run.json，不可变快照）。
 */
export interface RunRecord {
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
     * 所属剧集 id；legacy / 系列级为 null。
     */
    episode_id?: string | null;
    /**
     * 幂等键（可空）。
     */
    request_id: string | null;
    /**
     * label（legacy: shot:<id>；多集: ep:<id>:shot:<id>）。
     */
    label: string | null;
    /**
     * workflow 快照信息。
     */
    workflow: {
        /**
         * 项目内相对路径。
         */
        path: string;
        /**
         * 提交给引擎的图哈希。
         */
        sha256: string;
    };
    /**
     * 逻辑输入（不含绝对路径与上传文件名）。
     */
    inputs: Record<string, JsonValue>;
    /**
     * 命中的覆盖项（machine overrides / --set 合并后）。
     */
    overrides: Record<string, JsonValue>;
    /**
     * 引擎信息。
     */
    engine: RunEngineRecord;
    /**
     * GPU 接管信息（仅 local）。
     */
    gpu?: RunGpuRecord;
    /**
     * 终态。
     */
    status: "succeeded" | "failed" | "cancelled" | "interrupted";
    /**
     * 引擎 prompt id（未提交为 null）。
     */
    prompt_id: string | null;
    /**
     * 开始时间（ISO）。
     */
    started_at: string;
    /**
     * 结束时间（ISO）。
     */
    finished_at: string;
    /**
     * 产物列表。
     */
    outputs: RunOutput[];
    /**
     * 终态错误（成功为 null）。
     */
    error: { code: string; message: string; details?: Record<string, unknown> } | null;
}

/**
 * 任务终态判断。
 */
export function isTerminalStatus(status: TaskStatus): boolean {
    return status === "succeeded" || status === "failed" || status === "cancelled" || status === "interrupted";
}
