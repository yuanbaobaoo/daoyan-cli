/** Story 数据模型 —— 系列级设定集、分集剧本/拆解、资产与状态。
 *  共享记录不含绝对路径；所有文件写入都经 story/store 的原子写。 */

/**
 * 资产 owner 类型。
 */
export type StoryOwnerKind = "character" | "scene" | "voice";

/**
 * 一个参考资产（图片 / 音频）。
 */
export interface StoryAsset {
    /**
     * owner 内唯一资产 id（不能是保留字 reference）。
     */
    id: string;
    /**
     * 描述性角色（front / side / establishing / reference_audio 等）。
     */
    role?: string;
    /**
     * 项目内相对路径（POSIX）。
     */
    path: string;
    /**
     * 内容 SHA-256。
     */
    sha256: string;
    /**
     * 字节数。
     */
    bytes: number;
    /**
     * MIME 类型。
     */
    content_type: string;
    /**
     * 图片宽度（可选）。
     */
    width?: number;
    /**
     * 图片高度（可选）。
     */
    height?: number;
    /**
     * 来源 run id（可空）。
     */
    source_run: string | null;
    /**
     * 来源 run 产物名（可空）。
     */
    source_output: string | null;
    /**
     * 来源剧集 id（可空）。
     */
    source_episode_id: string | null;
    /**
     * 入库时间。
     */
    created_at: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 角色形态。
 */
export interface StoryForm {
    /**
     * 形态 id（角色内唯一）。
     */
    id: string;
    /**
     * 展示名。
     */
    name: string;
    /**
     * 形态描述。
     */
    description?: string;
    /**
     * 服装 / 外观补充。
     */
    outfit?: string;
    /**
     * 主参考图资产 id；由 AI / 用户显式指定。
     */
    reference_asset?: string | null;
    /**
     * 该形态的参考资产。
     */
    assets: StoryAsset[];
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 全局角色。
 */
export interface StoryCharacter {
    /**
     * 系列级稳定 id。
     */
    id: string;
    /**
     * 展示名。
     */
    name: string;
    /**
     * 别名。
     */
    aliases?: string[];
    /**
     * 角色定位（protagonist / antagonist / supporting / extra）。
     */
    role?: string;
    /**
     * 首次出现剧集（可选）。
     */
    introduced_in?: string;
    /**
     * 简介。
     */
    summary?: string;
    /**
     * 外观基线。
     */
    appearance?: string;
    /**
     * 默认形态 id。
     */
    default_form: string;
    /**
     * 形态列表。
     */
    forms: StoryForm[];
    /**
     * 音色 id。
     */
    voice_ids?: string[];
    /**
     * 制作备注。
     */
    notes?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 全局场景。
 */
export interface StoryScene {
    /**
     * 全局稳定 id。
     */
    id: string;
    /**
     * 展示名。
     */
    name: string;
    /**
     * 场景描述。
     */
    description?: string;
    /**
     * 时间（day / night / dusk 等）。
     */
    time_of_day?: string;
    /**
     * 内外景（interior / exterior）。
     */
    interior_exterior?: string;
    /**
     * 氛围。
     */
    mood?: string;
    /**
     * 首次出现剧集（可选）。
     */
    introduced_in?: string;
    /**
     * 主参考图资产 id；由 AI / 用户显式指定。
     */
    reference_asset?: string | null;
    /**
     * 参考资产。
     */
    assets: StoryAsset[];
    /**
     * 制作备注。
     */
    notes?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 全局音色。
 */
export interface StoryVoice {
    /**
     * 全局稳定 id。
     */
    id: string;
    /**
     * 所属角色 id。
     */
    character_id: string;
    /**
     * 展示名。
     */
    name: string;
    /**
     * reference = 参考音频；text = 文本描述。
     */
    mode: "reference" | "text";
    /**
     * 音色描述。
     */
    description?: string;
    /**
     * 示例台词。
     */
    sample_text?: string;
    /**
     * 主参考音频资产 id；由 AI / 用户显式指定。
     */
    reference_asset?: string | null;
    /**
     * 参考资产。
     */
    assets: StoryAsset[];
    /**
     * 引擎 / 工作流提示（free text）。
     */
    engine_hint?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 角色设定文件。
 */
export interface StoryCharactersFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 最后更新时间。
     */
    updated_at: string;
    /**
     * 角色列表。
     */
    characters: StoryCharacter[];
}

/**
 * 场景设定文件。
 */
export interface StoryScenesFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 最后更新时间。
     */
    updated_at: string;
    /**
     * 场景列表。
     */
    scenes: StoryScene[];
}

/**
 * 音色设定文件。
 */
export interface StoryVoicesFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 最后更新时间。
     */
    updated_at: string;
    /**
     * 音色列表。
     */
    voices: StoryVoice[];
}

/**
 * 系列元数据。
 */
export interface StorySeriesFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 系列标题。
     */
    title: string;
    /**
     * 系列简介。
     */
    synopsis?: string;
    /**
     * 类型。
     */
    genre?: string;
    /**
     * 创建时间。
     */
    created_at: string;
    /**
     * 最后更新时间。
     */
    updated_at: string;
}

/**
 * 剧集元数据。
 */
export interface StoryEpisodeMeta {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 剧集 id（目录名）。
     */
    id: string;
    /**
     * 集数（全系列唯一）。
     */
    number: number;
    /**
     * 标题。
     */
    title: string;
    /**
     * 简介。
     */
    summary?: string;
    /**
     * 创建时间。
     */
    created_at: string;
    /**
     * 最后更新时间。
     */
    updated_at: string;
}

/**
 * 一条剧本变更记录。
 */
export interface ScriptChangelogEntry {
    /**
     * 变更后的 revision。
     */
    revision: number;
    /**
     * 时间。
     */
    at: string;
    /**
     * 来源。
     */
    source: "ai" | "user" | "import";
    /**
     * 变更摘要。
     */
    summary: string;
}

/**
 * 剧本元数据。
 */
export interface ScriptMeta {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 剧本 revision（从 1 开始；0 表示未同步）。
     */
    revision: number;
    /**
     * 归一化正文 SHA-256（revision 0 为空串）。
     */
    sha256: string;
    /**
     * 确认状态。
     */
    status: "draft" | "approved";
    /**
     * 来源。
     */
    source: "ai" | "user" | "import";
    /**
     * 同步者。
     */
    synced_by: string;
    /**
     * 同步时间。
     */
    synced_at: string;
    /**
     * 当前 revision 的确认时间。
     */
    approved_at: string | null;
    /**
     * 最近变更摘要。
     */
    changelog: ScriptChangelogEntry[];
}

/**
 * 拆解中的角色允许项。
 */
export interface BreakdownCharacter {
    /**
     * 全局角色 id。
     */
    id: string;
    /**
     * 本集允许的角色形态 id。
     */
    forms: string[];
    /**
     * 本集备注。
     */
    notes?: string;
}

/**
 * 拆解中的 beat。
 */
export interface BreakdownBeat {
    /**
     * beat id（集内唯一）。
     */
    id: string;
    /**
     * 摘要。
     */
    summary: string;
    /**
     * 剧本段落引用。
     */
    script_refs?: string[];
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 单集拆解。
 */
export interface BreakdownFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 剧集 id。
     */
    episode_id: string;
    /**
     * 基于的剧本 revision。
     */
    source_revision: number;
    /**
     * 基于的剧本 sha256。
     */
    source_sha256: string;
    /**
     * beat 列表（可选）。
     */
    beats?: BreakdownBeat[];
    /**
     * 本集角色与允许形态。
     */
    characters: BreakdownCharacter[];
    /**
     * 本集场景 id。
     */
    scenes: string[];
    /**
     * 本集音色 id。
     */
    voices: string[];
    /**
     * 本集备注。
     */
    notes?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 剧情图谱重要度。
 */
export type StoryMapImportance = "major" | "normal" | "minor";

/**
 * 剧情图谱事件标注（仅叙事字段）。
 */
export interface StoryMapEvent {
    /**
     * 镜头 id。
     */
    shot_id: string;
    /**
     * 事件标题覆盖。
     */
    title?: string;
    /**
     * 事件摘要覆盖。
     */
    summary?: string;
    /**
     * 重要度覆盖。
     */
    importance?: StoryMapImportance;
    /**
     * 故事时间标签。
     */
    story_time?: string;
    /**
     * 备注。
     */
    note?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 剧情图谱角色关系标注。
 */
export interface StoryMapRelation {
    /**
     * 起点角色 id。
     */
    from: string;
    /**
     * 终点角色 id。
     */
    to: string;
    /**
     * 关系类型（自由文本）。
     */
    kind?: string;
    /**
     * 关系标签。
     */
    label: string;
    /**
     * 备注。
     */
    note?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 剧情图谱叙事标注文件。
 */
export interface StoryMapFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 剧集 id。
     */
    episode_id: string;
    /**
     * 最后写入者。
     */
    author: "dycli" | "ai" | "user" | "import";
    /**
     * 最后更新时间。
     */
    updated_at: string;
    /**
     * 生成 / 写入时的事实快照。
     */
    source: {
        /**
         * 剧本 revision。
         */
        script_revision: number;
        /**
         * 剧本 sha256。
         */
        script_sha256: string;
        /**
         * 拆解文件 sha256。
         */
        breakdown_sha256: string;
        /**
         * 分镜文件 sha256。
         */
        shots_sha256: string;
    };
    /**
     * 事件标注。
     */
    events: StoryMapEvent[];
    /**
     * 角色关系标注。
     */
    relations: StoryMapRelation[];
    /**
     * 整集备注。
     */
    notes?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 剧集执行上下文。
 */
export interface EpisodeContext {
    /**
     * 剧集 id。
     */
    episode_id: string;
    /**
     * 剧集目录绝对路径。
     */
    dir: string;
    /**
     * 剧集目录相对路径。
     */
    rel_dir: string;
    /**
     * 本集 shots.json 绝对路径。
     */
    shots_path: string;
    /**
     * 本集成片目录绝对路径。
     */
    final_dir: string;
    /**
     * 本集成片目录相对路径。
     */
    final_rel: string;
    /**
     * 本集 label 前缀。
     */
    label_prefix: string;
    /**
     * 剧本元数据路径。
     */
    script_meta_path: string;
    /**
     * 剧本文本路径。
     */
    script_text_path: string;
    /**
     * 拆解路径。
     */
    breakdown_path: string;
    /**
     * 剧集元数据路径。
     */
    episode_meta_path: string;
}

/**
 * 校验问题。
 */
export interface StoryIssue {
    /**
     * 所属剧集（全局问题为 null）。
     */
    episode_id: string | null;
    /**
     * 定位路径。
     */
    path: string;
    /**
     * 问题码。
     */
    code: string;
    /**
     * 严重级别。
     */
    severity: "error" | "warning" | "info";
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
 * 门禁阻断项。
 */
export interface StoryBlocker {
    /**
     * 稳定 code（script_missing / script_draft / missing_reference 等）。
     */
    code: string;
    /**
     * 说明。
     */
    message: string;
    /**
     * 相关引用（如 character:lin-mo/form:night）。
     */
    ref?: string;
    /**
     * 相关镜头。
     */
    shots?: string[];
}

/**
 * 单个文档的 stale 状态。
 */
export interface StoryDocumentStatus {
    /**
     * 基于的剧本 revision。
     */
    source_revision: number;
    /**
     * 是否基于旧剧本。
     */
    stale: boolean;
    /**
     * 文件是否存在。
     */
    present: boolean;
}

/**
 * 单集剧情状态。
 */
export interface EpisodeStoryStatus {
    /**
     * 是否启用 story 模式。
     */
    enabled: true;
    /**
     * 剧集元数据。
     */
    episode: {
        /**
         * 剧集 id。
         */
        id: string;
        /**
         * 集数。
         */
        number: number;
        /**
         * 标题。
         */
        title: string;
    };
    /**
     * 当前阶段。
     */
    stage: "script" | "breakdown" | "assets" | "storyboard" | "workflow" | "ready" | "wrapped";
    /**
     * 剧本元数据摘要。
     */
    script: {
        /**
         * revision。
         */
        revision: number;
        /**
         * 状态。
         */
        status: "draft" | "approved";
        /**
         * 哈希。
         */
        sha256: string;
        /**
         * 同步时间。
         */
        synced_at: string;
        /**
         * 确认时间。
         */
        approved_at: string | null;
    };
    /**
     * 拆解 / 分镜 stale 状态。
     */
    documents: {
        /**
         * 拆解状态。
         */
        breakdown: StoryDocumentStatus;
        /**
         * 分镜状态。
         */
        shots: StoryDocumentStatus;
    };
    /**
     * 本集计数。
     */
    counts: {
        /**
         * 角色数。
         */
        characters: number;
        /**
         * 形态数。
         */
        forms: number;
        /**
         * 场景数。
         */
        scenes: number;
        /**
         * 音色数。
         */
        voices: number;
        /**
         * 镜头数。
         */
        shots: number;
        /**
         * 资产数。
         */
        assets: number;
        /**
         * 已定稿镜头数。
         */
        finalized_shots: number;
    };
    /**
     * 定稿进度；无分镜时为 null。
     */
    takes: {
        /**
         * 镜头总数。
         */
        total: number;
        /**
         * 已定稿数。
         */
        finalized: number;
        /**
         * 未定稿镜号。
         */
        pending: string[];
        /**
         * 定稿记录已失效的镜号。
         */
        stale: string[];
        /**
         * 尚无任何成功产出的镜号。
         */
        unshot: string[];
    } | null;
    /**
     * 阻断项。
     */
    blockers: StoryBlocker[];
    /**
     * 警告。
     */
    warnings: StoryBlocker[];
    /**
     * 下一步命令。
     */
    next_actions: string[];
}

/**
 * 系列级剧情概览。
 */
export interface SeriesStoryStatus {
    /**
     * 是否启用 story 模式。
     */
    enabled: true;
    /**
     * 系列摘要。
     */
    series: {
        /**
         * 标题。
         */
        title: string;
        /**
         * 总集数。
         */
        episodes_total: number;
        /**
         * 可拍摄 / 已合片集数。
         */
        episodes_ready: number;
        /**
         * 有阻断项的集数。
         */
        episodes_blocked: number;
    };
    /**
     * 每集摘要。
     */
    episodes: Array<{
        /**
         * 剧集 id。
         */
        id: string;
        /**
         * 集数。
         */
        number: number;
        /**
         * 标题。
         */
        title: string;
        /**
         * 当前阶段。
         */
        stage: EpisodeStoryStatus["stage"];
        /**
         * 剧本摘要。
         */
        script: {
            /**
             * revision。
             */
            revision: number;
            /**
             * 状态。
             */
            status: "draft" | "approved";
        };
        /**
         * 阻断项。
         */
        blockers: StoryBlocker[];
        /**
         * 定稿进度（已定稿数 / 镜头数）。
         */
        takes: { finalized: number; total: number } | null;
    }>;
    /**
     * 系列级计数。
     */
    counts: {
        /**
         * 集数。
         */
        episodes: number;
        /**
         * 角色数。
         */
        characters: number;
        /**
         * 形态数。
         */
        forms: number;
        /**
         * 场景数。
         */
        scenes: number;
        /**
         * 音色数。
         */
        voices: number;
        /**
         * 分镜数。
         */
        shots: number;
        /**
         * 资产数。
         */
        assets: number;
        /**
         * 已定稿分镜数。
         */
        finalized_shots: number;
    };
    /**
     * 下一步命令。
     */
    next_actions: string[];
}

/**
 * 工作流资产槽位。
 */
export interface WorkflowAssetSlot {
    /**
     * 槽位名。
     */
    name: string;
    /**
     * 资产类型。
     */
    kind: StoryOwnerKind;
    /**
     * "reference" 或具体 asset id。
     */
    asset: string;
    /**
     * 目标节点输入（nodeId.input）。
     */
    target: string;
    /**
     * 是否必填。
     */
    required?: boolean;
}

/**
 * 工作流资产槽位文件。
 */
export interface WorkflowAssetsFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 槽位列表。
     */
    slots: WorkflowAssetSlot[];
}

/**
 * 解析后的 run 资产记录。
 */
export interface RunAssetRecord {
    /**
     * 槽位名。
     */
    slot: string;
    /**
     * 资产类型。
     */
    kind: StoryOwnerKind;
    /**
     * owner 引用（角色 id/form、场景 id、音色 id）。
     */
    owner: string;
    /**
     * 资产 id。
     */
    asset_id: string;
    /**
     * 项目内相对路径。
     */
    path: string;
    /**
     * 内容哈希。
     */
    sha256: string;
    /**
     * 字节数。
     */
    bytes: number;
}

/**
 * 资产定位结果。
 */
export interface StoryAssetRef {
    /**
     * owner 类型。
     */
    kind: StoryOwnerKind;
    /**
     * owner id（角色 / 场景 / 音色）。
     */
    owner_id: string;
    /**
     * 角色形态 id（仅角色）。
     */
    form_id: string | null;
    /**
     * 资产记录。
     */
    asset: StoryAsset;
}

/**
 * 定稿来源（Agent 写入 / 用户在 Web 或 CLI 显式指定）。
 */
export type TakeSourceKind = "ai" | "user";

/**
 * 一镜的定稿稿件（至多一份）。
 */
export interface FinalizedTake {
    /**
     * 定稿的 run id。
     */
    run_id: string;
    /**
     * 稿件文件名（run 的 outputs/<name>，不是绝对路径）。
     */
    output: string;
    /**
     * 定稿时记录的产物 sha256（用于检测产物漂移）。
     */
    sha256: string;
    /**
     * 定稿备注（为什么用这一条）。
     */
    note?: string;
    /**
     * 定稿者来源。
     */
    source: TakeSourceKind;
    /**
     * 定稿时间。
     */
    finalized_at: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 定稿台账的一条变更历史。
 */
export interface TakeHistoryEntry {
    /**
     * 动作：定稿 / 换稿 / 撤销。
     */
    action: "finalize" | "replace" | "revoke";
    /**
     * 涉及的 run id。
     */
    run_id: string;
    /**
     * 涉及的稿件名（撤销时可为空）。
     */
    output?: string;
    /**
     * 操作者来源。
     */
    source: TakeSourceKind;
    /**
     * 时间。
     */
    at: string;
    /**
     * 备注。
     */
    note?: string;
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 单镜定稿记录。
 */
export interface ShotTakeRecord {
    /**
     * 镜号（shots.json 的 shot id）。
     */
    shot_id: string;
    /**
     * 当前定稿稿件；null 表示未定稿。
     */
    finalized: FinalizedTake | null;
    /**
     * 变更历史（尾部追加，条数有上限）。
     */
    history: TakeHistoryEntry[];
    /**
     * 允许扩展字段。
     */
    [k: string]: unknown;
}

/**
 * 定稿台账文件（episodes/<id>/takes.json；legacy 为项目根 takes.json）。
 * 只保存「决定」，候选稿件永远从 runs/ 推导。
 */
export interface TakesFile {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 所属剧集 id；legacy 为 null。
     */
    episode_id: string | null;
    /**
     * 最后更新时间。
     */
    updated_at: string;
    /**
     * 各镜定稿记录（只保留有历史或有定稿的镜号）。
     */
    shots: ShotTakeRecord[];
}
