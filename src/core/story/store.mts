/** Story 存储 —— 系列、剧集、剧本、拆解、设定集与分镜的读取 / 原子写入。
 *  结构校验与业务门禁在 validate.mts；本模块只负责确定性的文件操作。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, nowIso, readJsonIfExists, sha256, writeFileAtomic, writeJsonAtomic } from "../../shared/fs.mts";
import {
    BREAKDOWN_FILE,
    EPISODES_DIR,
    EPISODE_META_FILE,
    LOG_DIR,
    SCRIPT_FILE,
    SCRIPT_TEXT_FILE,
    SHOTS_FILE,
    STORY_ASSETS_DIR,
    STORY_DIR,
    WORKFLOWS_DIR,
} from "../project/types.mts";
import type { ShotsFile } from "../project/types.mts";
import {
    charactersPath,
    episodeDir,
    episodesRoot,
    listEpisodeMetas,
    readEpisodeMeta,
    readSeries,
    scenesPath,
    seriesPath,
    STORY_ID_RE,
    storyAssetsDir,
    voicesPath,
} from "./paths.mts";
import type {
    BreakdownFile,
    ScriptChangelogEntry,
    ScriptMeta,
    StoryCharactersFile,
    StoryEpisodeMeta,
    StoryScenesFile,
    StorySeriesFile,
    StoryVoicesFile,
} from "./types.mts";

// 剧本最大字节数（2 MiB）
export const MAX_SCRIPT_BYTES = 2 * 1024 * 1024;
// 最近变更记录条数
const SCRIPT_CHANGELOG_LIMIT = 20;
// 空剧本 revision
const EMPTY_REVISION = 0;

/**
 * 空角色文件。
 */
export function emptyCharactersFile(): StoryCharactersFile {
    return { version: 1, updated_at: nowIso(), characters: [] };
}

/**
 * 空场景文件。
 */
export function emptyScenesFile(): StoryScenesFile {
    return { version: 1, updated_at: nowIso(), scenes: [] };
}

/**
 * 空音色文件。
 */
export function emptyVoicesFile(): StoryVoicesFile {
    return { version: 1, updated_at: nowIso(), voices: [] };
}

/**
 * 空剧本元数据（未同步）。
 */
export function emptyScriptMeta(): ScriptMeta {
    return {
        version: 1,
        revision: EMPTY_REVISION,
        sha256: "",
        status: "draft",
        source: "ai",
        synced_by: "agent",
        synced_at: "",
        approved_at: null,
        changelog: [],
    };
}

/**
 * 空拆解。
 */
export function emptyBreakdown(episodeId: string): BreakdownFile {
    return {
        version: 1,
        episode_id: episodeId,
        source_revision: EMPTY_REVISION,
        source_sha256: "",
        beats: [],
        characters: [],
        scenes: [],
        voices: [],
        notes: "",
    };
}

/**
 * 新剧集分镜模板。
 */
export function emptyShots(episodeId: string): ShotsFile {
    return {
        workflow: "t2v",
        meta: {
            episode_id: episodeId,
            title: "",
            synopsis: "",
            script_revision: EMPTY_REVISION,
            script_sha256: "",
            width: 768,
            height: 1344,
            fps: 24,
            anchors: {},
        },
        defaults: {
            length: 48,
            steps: 30,
            cfg: 4,
            negative: "低质量，模糊，噪点，变形，水印",
        },
        style_prefix: "",
        shots: [],
    };
}

/**
 * 读取角色文件；不存在返回空表。
 */
export function loadCharacters(root: string): StoryCharactersFile {
    return readJsonIfExists<StoryCharactersFile>(charactersPath(root)) ?? emptyCharactersFile();
}

/**
 * 读取场景文件；不存在返回空表。
 */
export function loadScenes(root: string): StoryScenesFile {
    return readJsonIfExists<StoryScenesFile>(scenesPath(root)) ?? emptyScenesFile();
}

/**
 * 读取音色文件；不存在返回空表。
 */
export function loadVoices(root: string): StoryVoicesFile {
    return readJsonIfExists<StoryVoicesFile>(voicesPath(root)) ?? emptyVoicesFile();
}

/**
 * 读取剧本元数据；不存在返回空模板。
 */
export function loadScriptMeta(root: string, episodeId: string): ScriptMeta {
    // 剧本元数据路径
    const file = join(episodeDir(root, episodeId), SCRIPT_FILE);
    // 原始值
    const raw = readJsonIfExists<ScriptMeta>(file);
    return raw ?? emptyScriptMeta();
}

/**
 * 读取剧本正文；不存在返回空串。
 */
export function loadScriptText(root: string, episodeId: string): string {
    // 剧本文本路径
    const file = join(episodeDir(root, episodeId), SCRIPT_TEXT_FILE);
    if (!existsSync(file)) return "";
    return readFileSync(file, "utf8");
}

/**
 * 读取拆解；不存在返回 null。
 */
export function loadBreakdown(root: string, episodeId: string): BreakdownFile | null {
    return readJsonIfExists<BreakdownFile>(join(episodeDir(root, episodeId), BREAKDOWN_FILE));
}

/**
 * 读取剧集分镜；不存在返回 null。
 */
export function loadEpisodeShots(root: string, episodeId: string): ShotsFile | null {
    return readJsonIfExists<ShotsFile>(join(episodeDir(root, episodeId), SHOTS_FILE));
}

/**
 * 写入角色文件（更新 updated_at）。
 */
export function saveCharacters(root: string, doc: StoryCharactersFile): void {
    writeJsonAtomic(charactersPath(root), { ...doc, version: 1, updated_at: nowIso() });
}

/**
 * 写入场景文件（更新 updated_at）。
 */
export function saveScenes(root: string, doc: StoryScenesFile): void {
    writeJsonAtomic(scenesPath(root), { ...doc, version: 1, updated_at: nowIso() });
}

/**
 * 写入音色文件（更新 updated_at）。
 */
export function saveVoices(root: string, doc: StoryVoicesFile): void {
    writeJsonAtomic(voicesPath(root), { ...doc, version: 1, updated_at: nowIso() });
}

/**
 * 写入剧本元数据。
 */
export function saveScriptMeta(root: string, episodeId: string, meta: ScriptMeta): void {
    writeJsonAtomic(join(episodeDir(root, episodeId), SCRIPT_FILE), meta);
}

/**
 * 写入拆解。
 */
export function saveBreakdown(root: string, episodeId: string, doc: BreakdownFile): void {
    writeJsonAtomic(join(episodeDir(root, episodeId), BREAKDOWN_FILE), doc);
}

/**
 * 写入剧集分镜。
 */
export function saveEpisodeShots(root: string, episodeId: string, shots: ShotsFile): void {
    writeJsonAtomic(join(episodeDir(root, episodeId), SHOTS_FILE), shots);
}

/**
 * 归一化剧本文本：去 BOM、统一 LF。
 */
export function normalizeScriptText(text: string): string {
    return text
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
}

/**
 * 追加缺失的 LFS 规则（保留用户已有内容）。
 */
export function appendStoryLfsRules(root: string): boolean {
    // .gitattributes 路径
    const file = join(root, ".gitattributes");
    // 现有内容
    const current = existsSync(file) ? readFileSync(file, "utf8") : "";
    // 必需规则
    const required = [
        "story/assets/**        filter=lfs diff=lfs merge=lfs -text",
        "episodes/**/anchors/** filter=lfs diff=lfs merge=lfs -text",
    ];
    // 现有行
    const lines = current.split("\n").filter((line) => line !== "");
    // 缺失规则
    const missing = required.filter((rule) => !lines.some((line) => line.trim() === rule.trim()));
    if (missing.length === 0) return false;
    // 合并后的内容
    const next = [...lines, ...missing].join("\n") + "\n";
    writeFileAtomic(file, next);
    return true;
}

/**
 * 初始化 story 骨架（幂等）。
 */
export function initStory(root: string, projectName: string): { created: string[] } {
    // 已创建文件 / 目录
    const created: string[] = [];
    // 目录
    for (const dir of [
        STORY_DIR,
        STORY_ASSETS_DIR,
        join(STORY_ASSETS_DIR, "characters"),
        join(STORY_ASSETS_DIR, "scenes"),
        join(STORY_ASSETS_DIR, "voices"),
        EPISODES_DIR,
        LOG_DIR,
        WORKFLOWS_DIR,
    ]) {
        ensureDir(join(root, dir));
    }
    // 系列元数据
    if (!existsSync(seriesPath(root))) {
        // 当前时间
        const now = nowIso();
        // 系列文件
        const series: StorySeriesFile = {
            version: 1,
            title: projectName,
            created_at: now,
            updated_at: now,
        };
        writeJsonAtomic(seriesPath(root), series);
        created.push("story/series.json");
    }
    // 全局设定集
    if (!existsSync(charactersPath(root))) {
        writeJsonAtomic(charactersPath(root), emptyCharactersFile());
        created.push("story/characters.json");
    }
    if (!existsSync(scenesPath(root))) {
        writeJsonAtomic(scenesPath(root), emptyScenesFile());
        created.push("story/scenes.json");
    }
    if (!existsSync(voicesPath(root))) {
        writeJsonAtomic(voicesPath(root), emptyVoicesFile());
        created.push("story/voices.json");
    }
    // LFS 规则
    if (appendStoryLfsRules(root)) created.push(".gitattributes");
    // 默认 ep01
    if (listEpisodeMetas(root).length === 0) {
        // 系列标题（init 刚写入）
        const series = readSeries(root);
        // 默认标题
        const title = series?.title !== undefined && series.title !== "" ? series.title : "第 1 集";
        addEpisode(root, { id: "ep01", number: 1, title });
        created.push("episodes/ep01");
    }
    // 修复已有剧集缺失的骨架文件
    for (const meta of listEpisodeMetas(root)) {
        // 剧集目录
        const dir = episodeDir(root, meta.id);
        if (!existsSync(join(dir, SCRIPT_FILE))) {
            writeJsonAtomic(join(dir, SCRIPT_FILE), emptyScriptMeta());
            created.push(`episodes/${meta.id}/script.json`);
        }
        if (!existsSync(join(dir, BREAKDOWN_FILE))) {
            writeJsonAtomic(join(dir, BREAKDOWN_FILE), emptyBreakdown(meta.id));
            created.push(`episodes/${meta.id}/breakdown.json`);
        }
        if (!existsSync(join(dir, SHOTS_FILE))) {
            writeJsonAtomic(join(dir, SHOTS_FILE), emptyShots(meta.id));
            created.push(`episodes/${meta.id}/shots.json`);
        }
    }
    return { created };
}

/**
 * 新增剧集。
 */
export function addEpisode(
    root: string,
    init: { id: string; number: number; title: string; summary?: string },
): StoryEpisodeMeta {
    if (!STORY_ID_RE.test(init.id)) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `剧集 id 非法：${init.id}`,
            hint: "使用小写字母 / 数字 / -，例如 ep02。",
        });
    }
    if (!Number.isInteger(init.number) || init.number <= 0) {
        throw new DaoyanCliError({ code: "story_invalid", message: "剧集 number 必须是正整数" });
    }
    if (init.title.trim() === "") {
        throw new DaoyanCliError({ code: "story_invalid", message: "剧集标题不能为空" });
    }
    // 现有剧集
    const metas = listEpisodeMetas(root);
    if (metas.some((m) => m.id === init.id)) {
        throw new DaoyanCliError({ code: "story_invalid", message: `剧集 ${init.id} 已存在` });
    }
    if (metas.some((m) => m.number === init.number)) {
        throw new DaoyanCliError({ code: "story_invalid", message: `集数 ${init.number} 已被占用` });
    }
    // 目录
    const dir = episodeDir(root, init.id);
    ensureDir(dir);
    // 时间
    const now = nowIso();
    // 元数据
    const meta: StoryEpisodeMeta = {
        version: 1,
        id: init.id,
        number: init.number,
        title: init.title.trim(),
        ...(init.summary !== undefined && init.summary !== "" ? { summary: init.summary } : {}),
        created_at: now,
        updated_at: now,
    };
    // 骨架文件（只写缺失）
    if (!existsSync(join(dir, EPISODE_META_FILE))) writeJsonAtomic(join(dir, EPISODE_META_FILE), meta);
    if (!existsSync(join(dir, SCRIPT_FILE))) writeJsonAtomic(join(dir, SCRIPT_FILE), emptyScriptMeta());
    if (!existsSync(join(dir, BREAKDOWN_FILE))) writeJsonAtomic(join(dir, BREAKDOWN_FILE), emptyBreakdown(init.id));
    if (!existsSync(join(dir, SHOTS_FILE))) writeJsonAtomic(join(dir, SHOTS_FILE), emptyShots(init.id));
    ensureDir(join(root, LOG_DIR));
    return meta;
}

/**
 * 更新剧集元数据（id 不变）。
 */
export function updateEpisode(
    root: string,
    episodeId: string,
    patch: { number?: number; title?: string; summary?: string },
): StoryEpisodeMeta {
    // 当前元数据
    const cur = readEpisodeMeta(root, episodeId);
    if (cur === null) {
        throw new DaoyanCliError({ code: "episode_not_found", message: `未找到剧集 ${episodeId}` });
    }
    // 全部剧集（number 唯一）
    const metas = listEpisodeMetas(root);
    if (patch.number !== undefined) {
        if (!Number.isInteger(patch.number) || patch.number <= 0) {
            throw new DaoyanCliError({ code: "story_invalid", message: "剧集 number 必须是正整数" });
        }
        if (metas.some((m) => m.id !== episodeId && m.number === patch.number)) {
            throw new DaoyanCliError({ code: "story_invalid", message: `集数 ${patch.number} 已被占用` });
        }
    }
    if (patch.title !== undefined && patch.title.trim() === "") {
        throw new DaoyanCliError({ code: "story_invalid", message: "剧集标题不能为空" });
    }
    // 合并后的元数据
    const next: StoryEpisodeMeta = {
        ...cur,
        ...(patch.number !== undefined ? { number: patch.number } : {}),
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
        updated_at: nowIso(),
    };
    writeJsonAtomic(join(episodeDir(root, episodeId), EPISODE_META_FILE), next);
    return next;
}

/**
 * 同步剧本正文；返回同步后的元数据与是否变化。
 */
export function syncScript(opts: {
    root: string;
    episodeId: string;
    text: string;
    source: "ai" | "user" | "import";
    summary: string;
    syncedBy?: string;
    baseRevision?: number;
}): { meta: ScriptMeta; changed: boolean } {
    // 剧集必须存在
    if (readEpisodeMeta(opts.root, opts.episodeId) === null) {
        throw new DaoyanCliError({ code: "episode_not_found", message: `未找到剧集 ${opts.episodeId}` });
    }
    // 归一化正文
    const text = normalizeScriptText(opts.text);
    if (text.trim() === "") {
        throw new DaoyanCliError({ code: "story_invalid", message: "剧本正文为空" });
    }
    // 字节上限
    const bytes = Buffer.byteLength(text, "utf8");
    if (bytes > MAX_SCRIPT_BYTES) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `剧本超过 ${MAX_SCRIPT_BYTES} 字节上限`,
            details: { bytes, limit: MAX_SCRIPT_BYTES },
        });
    }
    // 当前元数据
    const cur = loadScriptMeta(opts.root, opts.episodeId);
    if (opts.baseRevision !== undefined && cur.revision !== opts.baseRevision) {
        throw new DaoyanCliError({
            code: "story_conflict",
            message: `剧本 revision 已变为 ${cur.revision}（期望 ${opts.baseRevision}）`,
            details: { current: cur.revision, expected: opts.baseRevision },
        });
    }
    // 内容哈希
    const hash = sha256(text);
    if (cur.revision > 0 && cur.sha256 === hash) {
        return { meta: cur, changed: false };
    }
    // 新 revision
    const revision = cur.revision + 1;
    // 变更记录
    const entry: ScriptChangelogEntry = {
        revision,
        at: nowIso(),
        source: opts.source,
        summary: opts.summary.trim() === "" ? "同步剧本" : opts.summary.trim(),
    };
    // 合并后的元数据
    const meta: ScriptMeta = {
        version: 1,
        revision,
        sha256: hash,
        status: "draft",
        source: opts.source,
        synced_by: opts.syncedBy ?? "agent",
        synced_at: entry.at,
        approved_at: null,
        changelog: [...cur.changelog, entry].slice(-SCRIPT_CHANGELOG_LIMIT),
    };
    // 先写正文，再写元数据
    writeFileAtomic(join(episodeDir(opts.root, opts.episodeId), SCRIPT_TEXT_FILE), text);
    saveScriptMeta(opts.root, opts.episodeId, meta);
    return { meta, changed: true };
}

/**
 * 确认当前剧本 revision。
 */
export function approveScript(root: string, episodeId: string): ScriptMeta {
    // 当前元数据
    const cur = loadScriptMeta(root, episodeId);
    if (cur.revision <= 0) {
        throw new DaoyanCliError({ code: "story_invalid", message: "剧本尚未同步，不能确认" });
    }
    // 正文必须存在
    const textFile = join(episodeDir(root, episodeId), SCRIPT_TEXT_FILE);
    if (!existsSync(textFile)) {
        throw new DaoyanCliError({ code: "story_invalid", message: "剧本正文不存在，不能确认" });
    }
    // 已确认
    if (cur.status === "approved") return cur;
    // 更新后的元数据
    const next: ScriptMeta = { ...cur, status: "approved", approved_at: nowIso() };
    saveScriptMeta(root, episodeId, next);
    return next;
}
