/** Story 校验、阶段计算与拍摄门禁。
 *  - validateStory：结构 / 引用 / 资产覆盖 / stale 的完整检查；
 *  - computeEpisodeStoryStatus：单集 stage、blockers、next_actions；
 *  - computeSeriesStoryStatus：系列概览；
 *  - episodeGateBlockers：供 shot / batch / retake 在执行前阻断。 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveWorkflowRef, readProjectAt } from "../project/config.mts";
import {
    BREAKDOWN_FILE,
    EPISODE_META_FILE,
    FINAL_DIR,
    RUN_FILE,
    SCRIPT_FILE,
    SHOTS_FILE,
    type ProjectConfig,
    type ShotsFile,
} from "../project/types.mts";
import { bindingsPathOf } from "../workflow/load.mts";
import { readJsonIfExists, sha256 } from "../../shared/fs.mts";
import { isDaoyanCliError } from "../../shared/errors.mts";
import { resolveWorkflowAssets } from "./workflow-assets.mts";
import { listAssets, isLfsPointerFile } from "./assets.mts";
import {
    charactersPath,
    episodeDir,
    listEpisodeMetas,
    readSeries,
    scenesPath,
    seriesPath,
    STORY_ID_RE,
    storyEnabled,
    voicesPath,
} from "./paths.mts";
import {
    loadBreakdown,
    loadCharacters,
    loadEpisodeShots,
    loadScenes,
    loadScriptMeta,
    loadScriptText,
    loadVoices,
} from "./store.mts";
import type {
    BreakdownFile,
    EpisodeStoryStatus,
    SeriesStoryStatus,
    StoryBlocker,
    StoryCharactersFile,
    StoryIssue,
    StoryScenesFile,
    StoryVoicesFile,
} from "./types.mts";

// 允许的资产 MIME
const ALLOWED_ASSET_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "audio/wav",
    "audio/mpeg",
    "audio/flac",
    "audio/ogg",
]);
// 资产路径前缀
const STORY_ASSET_PREFIX = "story/assets/";

/**
 * 构造校验问题。
 */
function issue(
    episodeId: string | null,
    path: string,
    code: string,
    severity: StoryIssue["severity"],
    message: string,
    hint: string,
): StoryIssue {
    return { episode_id: episodeId, path, code, severity, message, hint };
}

/**
 * 构造 blocker。
 */
function blocker(code: string, message: string, ref?: string, shots?: string[]): StoryBlocker {
    return { code, message, ...(ref !== undefined ? { ref } : {}), ...(shots !== undefined ? { shots } : {}) };
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
    // 去空白
    const text = value.trim();
    return text === "" ? null : text;
}

/**
 * 检查 id 格式。
 */
function validId(value: string): boolean {
    return STORY_ID_RE.test(value);
}

/**
 * 检查资产记录的文件。
 */
function checkAssetFile(
    root: string,
    asset: { path: string; sha256: string; content_type: string },
    episodeId: string | null,
    label: string,
    verifyHashes: boolean,
    issues: StoryIssue[],
): boolean {
    if (!asset.path.startsWith(STORY_ASSET_PREFIX) || asset.path.includes("..")) {
        issues.push(
            issue(
                episodeId,
                label,
                "asset_path_invalid",
                "error",
                `资产路径不在 ${STORY_ASSET_PREFIX}：${asset.path}`,
                "重新入库资产。",
            ),
        );
        return false;
    }
    if (!ALLOWED_ASSET_TYPES.has(asset.content_type)) {
        issues.push(
            issue(
                episodeId,
                label,
                "asset_type_invalid",
                "error",
                `不支持的资产类型：${asset.content_type}`,
                "使用 PNG / JPEG / WebP / WAV / MP3 / FLAC / OGG。",
            ),
        );
        return false;
    }
    // 绝对路径
    const abs = join(root, asset.path);
    if (!existsSync(abs)) {
        issues.push(
            issue(
                episodeId,
                label,
                "asset_file_missing",
                "error",
                `资产文件不存在：${asset.path}`,
                "重新入库，或 git lfs pull。",
            ),
        );
        return false;
    }
    if (isLfsPointerFile(abs)) {
        issues.push(
            issue(
                episodeId,
                label,
                "asset_lfs_pointer",
                "error",
                `资产仍是 Git LFS pointer：${asset.path}`,
                "运行 git lfs pull。",
            ),
        );
        return false;
    }
    if (verifyHashes) {
        try {
            // 文件内容
            const content = readFileSync(abs);
            if (sha256(content) !== asset.sha256) {
                issues.push(
                    issue(
                        episodeId,
                        label,
                        "asset_hash_mismatch",
                        "error",
                        `资产哈希不匹配：${asset.path}`,
                        "重新入库资产。",
                    ),
                );
                return false;
            }
        } catch {
            issues.push(
                issue(
                    episodeId,
                    label,
                    "asset_hash_read_failed",
                    "warning",
                    `无法校验资产哈希：${asset.path}`,
                    "检查文件权限。",
                ),
            );
        }
    }
    return true;
}

/**
 * 资产 id 列表检查。
 */
function validateAssets(
    root: string,
    assets: Array<{ id: string; path: string; sha256: string; content_type: string }>,
    episodeId: string | null,
    label: string,
    verifyHashes: boolean,
    issues: StoryIssue[],
): void {
    // 已见 id
    const seen = new Set<string>();
    for (const asset of assets) {
        // 当前路径
        const current = `${label}.assets.${asset.id}`;
        if (!validId(asset.id)) {
            issues.push(
                issue(
                    episodeId,
                    current,
                    "asset_id_invalid",
                    "error",
                    `资产 id 非法：${asset.id}`,
                    "使用小写字母 / 数字 / -。",
                ),
            );
        }
        if (asset.id === "reference") {
            issues.push(
                issue(
                    episodeId,
                    current,
                    "asset_id_reserved",
                    "error",
                    "资产 id 不能是保留字 reference",
                    "换一个 id。",
                ),
            );
        }
        if (seen.has(asset.id)) {
            issues.push(
                issue(
                    episodeId,
                    current,
                    "asset_id_duplicate",
                    "error",
                    `资产 id 重复：${asset.id}`,
                    "资产 id 必须唯一。",
                ),
            );
        }
        seen.add(asset.id);
        checkAssetFile(root, asset, episodeId, current, verifyHashes, issues);
    }
}

/**
 * 校验全局角色文件。
 */
function validateCharacters(
    root: string,
    doc: StoryCharactersFile,
    voices: StoryVoicesFile,
    episodeIds: Set<string>,
    verifyHashes: boolean,
    issues: StoryIssue[],
): void {
    if (doc.version !== 1) {
        issues.push(
            issue(
                null,
                "story/characters.json",
                "characters_version_invalid",
                "error",
                "characters.json version 必须为 1",
                "重新 story init 或修正 version。",
            ),
        );
    }
    // 已见角色
    const seen = new Set<string>();
    // 音色 id
    const voiceIds = new Set(voices.voices.map((v) => v.id));
    for (const character of doc.characters) {
        // 定位
        const label = `story/characters.json:${character.id}`;
        if (!validId(character.id)) {
            issues.push(
                issue(
                    null,
                    label,
                    "character_id_invalid",
                    "error",
                    `角色 id 非法：${character.id}`,
                    "使用小写字母 / 数字 / -。",
                ),
            );
        }
        if (seen.has(character.id)) {
            issues.push(
                issue(
                    null,
                    label,
                    "character_id_duplicate",
                    "error",
                    `角色 id 重复：${character.id}`,
                    "角色 id 必须唯一。",
                ),
            );
        }
        seen.add(character.id);
        if (stringOf(character.name) === null) {
            issues.push(issue(null, label, "character_name_missing", "error", "角色 name 为空", "填写展示名。"));
        }
        if (character.introduced_in !== undefined && !episodeIds.has(character.introduced_in)) {
            issues.push(
                issue(
                    null,
                    label,
                    "character_introduced_in_missing",
                    "error",
                    `introduced_in 指向不存在的剧集：${character.introduced_in}`,
                    "修正或删除该字段。",
                ),
            );
        }
        // 形态
        if (!Array.isArray(character.forms) || character.forms.length === 0) {
            issues.push(issue(null, label, "forms_empty", "error", "角色至少需要一个形态", "添加 forms。"));
            continue;
        }
        // 已见形态
        const formIds = new Set<string>();
        for (const form of character.forms) {
            // 形态定位
            const formLabel = `${label}.forms.${form.id}`;
            if (!validId(form.id)) {
                issues.push(
                    issue(
                        null,
                        formLabel,
                        "form_id_invalid",
                        "error",
                        `形态 id 非法：${form.id}`,
                        "使用小写字母 / 数字 / -。",
                    ),
                );
            }
            if (formIds.has(form.id)) {
                issues.push(
                    issue(
                        null,
                        formLabel,
                        "form_id_duplicate",
                        "error",
                        `形态 id 重复：${form.id}`,
                        "形态 id 在角色内唯一。",
                    ),
                );
            }
            formIds.add(form.id);
            validateAssets(root, form.assets ?? [], null, formLabel, verifyHashes, issues);
            // 主参考
            if (form.reference_asset !== undefined && form.reference_asset !== null && form.reference_asset !== "") {
                if (!form.assets.some((a) => a.id === form.reference_asset)) {
                    issues.push(
                        issue(
                            null,
                            formLabel,
                            "reference_asset_missing",
                            "error",
                            `reference_asset 指向不存在的资产：${form.reference_asset}`,
                            "先用 story asset set-reference 指定。",
                        ),
                    );
                }
            }
        }
        if (!formIds.has(character.default_form)) {
            issues.push(
                issue(
                    null,
                    label,
                    "default_form_missing",
                    "error",
                    `default_form 指向不存在的形态：${character.default_form}`,
                    "修正 default_form。",
                ),
            );
        }
        for (const voiceId of character.voice_ids ?? []) {
            if (!voiceIds.has(voiceId)) {
                issues.push(
                    issue(
                        null,
                        label,
                        "voice_id_missing",
                        "error",
                        `voice_ids 引用不存在的音色：${voiceId}`,
                        "先登记音色。",
                    ),
                );
            }
        }
    }
}

/**
 * 校验全局场景文件。
 */
function validateScenes(
    root: string,
    doc: StoryScenesFile,
    episodeIds: Set<string>,
    verifyHashes: boolean,
    issues: StoryIssue[],
): void {
    if (doc.version !== 1) {
        issues.push(
            issue(
                null,
                "story/scenes.json",
                "scenes_version_invalid",
                "error",
                "scenes.json version 必须为 1",
                "修正 version。",
            ),
        );
    }
    // 已见场景
    const seen = new Set<string>();
    for (const scene of doc.scenes) {
        // 定位
        const label = `story/scenes.json:${scene.id}`;
        if (!validId(scene.id)) {
            issues.push(
                issue(
                    null,
                    label,
                    "scene_id_invalid",
                    "error",
                    `场景 id 非法：${scene.id}`,
                    "使用小写字母 / 数字 / -。",
                ),
            );
        }
        if (seen.has(scene.id)) {
            issues.push(
                issue(null, label, "scene_id_duplicate", "error", `场景 id 重复：${scene.id}`, "场景 id 必须唯一。"),
            );
        }
        seen.add(scene.id);
        if (stringOf(scene.name) === null) {
            issues.push(issue(null, label, "scene_name_missing", "error", "场景 name 为空", "填写展示名。"));
        }
        if (scene.introduced_in !== undefined && !episodeIds.has(scene.introduced_in)) {
            issues.push(
                issue(
                    null,
                    label,
                    "scene_introduced_in_missing",
                    "error",
                    `introduced_in 指向不存在的剧集：${scene.introduced_in}`,
                    "修正或删除。",
                ),
            );
        }
        validateAssets(root, scene.assets ?? [], null, label, verifyHashes, issues);
        if (scene.reference_asset !== undefined && scene.reference_asset !== null && scene.reference_asset !== "") {
            if (!scene.assets.some((a) => a.id === scene.reference_asset)) {
                issues.push(
                    issue(
                        null,
                        label,
                        "reference_asset_missing",
                        "error",
                        `reference_asset 指向不存在的资产：${scene.reference_asset}`,
                        "先用 set-reference 指定。",
                    ),
                );
            }
        }
    }
}

/**
 * 校验全局音色文件。
 */
function validateVoices(
    root: string,
    doc: StoryVoicesFile,
    characters: StoryCharactersFile,
    verifyHashes: boolean,
    issues: StoryIssue[],
): void {
    if (doc.version !== 1) {
        issues.push(
            issue(
                null,
                "story/voices.json",
                "voices_version_invalid",
                "error",
                "voices.json version 必须为 1",
                "修正 version。",
            ),
        );
    }
    // 角色 id
    const characterIds = new Set(characters.characters.map((c) => c.id));
    // 已见音色
    const seen = new Set<string>();
    for (const voice of doc.voices) {
        // 定位
        const label = `story/voices.json:${voice.id}`;
        if (!validId(voice.id)) {
            issues.push(
                issue(
                    null,
                    label,
                    "voice_id_invalid",
                    "error",
                    `音色 id 非法：${voice.id}`,
                    "使用小写字母 / 数字 / -。",
                ),
            );
        }
        if (seen.has(voice.id)) {
            issues.push(
                issue(null, label, "voice_id_duplicate", "error", `音色 id 重复：${voice.id}`, "音色 id 必须唯一。"),
            );
        }
        seen.add(voice.id);
        if (!characterIds.has(voice.character_id)) {
            issues.push(
                issue(
                    null,
                    label,
                    "voice_character_missing",
                    "error",
                    `音色所属角色不存在：${voice.character_id}`,
                    "先登记角色。",
                ),
            );
        }
        if (voice.mode !== "reference" && voice.mode !== "text") {
            issues.push(
                issue(
                    null,
                    label,
                    "voice_mode_invalid",
                    "error",
                    `音色 mode 非法：${voice.mode}`,
                    "使用 reference / text。",
                ),
            );
        }
        validateAssets(root, voice.assets ?? [], null, label, verifyHashes, issues);
        if (
            voice.mode === "reference" &&
            (voice.reference_asset === undefined || voice.reference_asset === null || voice.reference_asset === "")
        ) {
            issues.push(
                issue(
                    null,
                    label,
                    "voice_reference_missing",
                    "warning",
                    "reference 模式音色尚未指定参考音频",
                    "入库音频后 story asset set-reference。",
                ),
            );
        } else if (
            voice.reference_asset !== undefined &&
            voice.reference_asset !== null &&
            voice.reference_asset !== ""
        ) {
            if (!voice.assets.some((a) => a.id === voice.reference_asset)) {
                issues.push(
                    issue(
                        null,
                        label,
                        "reference_asset_missing",
                        "error",
                        `reference_asset 指向不存在的资产：${voice.reference_asset}`,
                        "先用 set-reference 指定。",
                    ),
                );
            }
        }
        if (voice.mode === "text" && stringOf(voice.description) === null) {
            issues.push(
                issue(
                    null,
                    label,
                    "voice_text_description_missing",
                    "warning",
                    "text 模式音色缺少 description",
                    "补充文本描述。",
                ),
            );
        }
    }
}

/**
 * 剧集 id 集合。
 */
function episodeIdSet(root: string): Set<string> {
    return new Set(listEpisodeMetas(root).map((e) => e.id));
}

/**
 * 校验剧本元数据。
 */
function validateScript(root: string, episodeId: string, issues: StoryIssue[]): void {
    // 元数据
    const meta = loadScriptMeta(root, episodeId);
    // 定位
    const label = `episodes/${episodeId}/${SCRIPT_FILE}`;
    if (meta.version !== 1) {
        issues.push(
            issue(
                episodeId,
                label,
                "script_version_invalid",
                "error",
                "script.json version 必须为 1",
                "修正 version。",
            ),
        );
    }
    if (!Number.isInteger(meta.revision) || meta.revision < 0) {
        issues.push(
            issue(
                episodeId,
                label,
                "script_revision_invalid",
                "error",
                "script revision 必须是非负整数",
                "重新同步剧本。",
            ),
        );
    }
    if (meta.revision === 0) return;
    // 正文
    const text = loadScriptText(root, episodeId);
    if (text === "") {
        issues.push(
            issue(
                episodeId,
                `episodes/${episodeId}/script.md`,
                "script_text_missing",
                "error",
                "剧本正文缺失",
                "重新 story script sync。",
            ),
        );
        return;
    }
    if (sha256(text) !== meta.sha256) {
        issues.push(
            issue(
                episodeId,
                `episodes/${episodeId}/script.md`,
                "script_hash_mismatch",
                "error",
                "剧本正文与 script.json 哈希不一致",
                "重新 story script sync。",
            ),
        );
    }
    if (meta.status === "approved" && meta.approved_at === null) {
        issues.push(
            issue(
                episodeId,
                label,
                "script_approved_at_missing",
                "warning",
                "approved 状态缺少 approved_at",
                "重新 approve。",
            ),
        );
    }
    if (meta.status === "draft" && meta.approved_at !== null) {
        issues.push(
            issue(
                episodeId,
                label,
                "script_draft_has_approved_at",
                "warning",
                "draft 状态仍带 approved_at",
                "重新 sync 或 approve。",
            ),
        );
    }
}

/**
 * 校验拆解。
 */
function checkBreakdownDoc(
    root: string,
    episodeId: string,
    doc: BreakdownFile,
    scriptRevision: number,
    scriptSha: string,
    characters: StoryCharactersFile,
    scenes: StoryScenesFile,
    voices: StoryVoicesFile,
    issues: StoryIssue[],
): void {
    // 标签
    const label = `episodes/${episodeId}/${BREAKDOWN_FILE}`;
    if (doc.version !== 1) {
        issues.push(
            issue(
                episodeId,
                label,
                "breakdown_version_invalid",
                "error",
                "breakdown version 必须为 1",
                "修正 version。",
            ),
        );
    }
    if (doc.episode_id !== episodeId) {
        issues.push(
            issue(
                episodeId,
                label,
                "breakdown_episode_mismatch",
                "error",
                `episode_id=${doc.episode_id} 与目录不一致`,
                "修正 episode_id。",
            ),
        );
    }
    if (!Number.isInteger(doc.source_revision) || doc.source_revision < 0 || doc.source_revision > scriptRevision) {
        issues.push(
            issue(
                episodeId,
                label,
                "breakdown_revision_invalid",
                "error",
                `source_revision=${doc.source_revision} 非法（当前 ${scriptRevision}）`,
                "重新拆解。",
            ),
        );
    } else if (doc.source_revision < scriptRevision) {
        issues.push(
            issue(episodeId, label, "breakdown_stale", "warning", "拆解基于旧剧本", "重新拆解或更新 source_revision。"),
        );
    } else if (doc.source_sha256 !== scriptSha) {
        issues.push(
            issue(
                episodeId,
                label,
                "breakdown_hash_mismatch",
                "error",
                "拆解 source_sha256 与当前剧本不一致",
                "重新拆解。",
            ),
        );
    }
    // beat id
    const beatIds = new Set<string>();
    for (const beat of doc.beats ?? []) {
        if (!validId(beat.id)) {
            issues.push(
                issue(
                    episodeId,
                    `${label}:beats.${beat.id}`,
                    "beat_id_invalid",
                    "error",
                    `beat id 非法：${beat.id}`,
                    "使用小写字母 / 数字 / -。",
                ),
            );
        }
        if (beatIds.has(beat.id)) {
            issues.push(
                issue(
                    episodeId,
                    `${label}:beats.${beat.id}`,
                    "beat_id_duplicate",
                    "error",
                    `beat id 重复：${beat.id}`,
                    "beat id 必须唯一。",
                ),
            );
        }
        beatIds.add(beat.id);
    }
    // 角色 / 形态
    const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
    // 允许形态
    const allowedForms = new Map<string, Set<string>>();
    for (const item of doc.characters) {
        // 定位
        const itemLabel = `${label}:characters.${item.id}`;
        // 角色
        const character = characterMap.get(item.id);
        if (character === undefined) {
            issues.push(
                issue(
                    episodeId,
                    itemLabel,
                    "breakdown_character_missing",
                    "error",
                    `角色不存在：${item.id}`,
                    "先加入全局设定集。",
                ),
            );
            continue;
        }
        if (!Array.isArray(item.forms) || item.forms.length === 0) {
            issues.push(
                issue(
                    episodeId,
                    itemLabel,
                    "breakdown_forms_empty",
                    "error",
                    `角色 ${item.id} 没有声明形态`,
                    "至少声明一个形态。",
                ),
            );
            continue;
        }
        // 允许形态
        const forms = new Set<string>();
        for (const formId of item.forms) {
            if (!character.forms.some((f) => f.id === formId)) {
                issues.push(
                    issue(
                        episodeId,
                        itemLabel,
                        "breakdown_form_missing",
                        "error",
                        `形态不存在：${item.id}/${formId}`,
                        "先加入全局设定集。",
                    ),
                );
                continue;
            }
            forms.add(formId);
        }
        allowedForms.set(item.id, forms);
    }
    // 场景
    const sceneIds = new Set(scenes.scenes.map((s) => s.id));
    for (const sceneId of doc.scenes) {
        if (!sceneIds.has(sceneId)) {
            issues.push(
                issue(
                    episodeId,
                    `${label}:scenes.${sceneId}`,
                    "breakdown_scene_missing",
                    "error",
                    `场景不存在：${sceneId}`,
                    "先加入全局设定集。",
                ),
            );
        }
    }
    // 音色
    const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
    for (const voiceId of doc.voices) {
        // 音色
        const voice = voiceMap.get(voiceId);
        if (voice === undefined) {
            issues.push(
                issue(
                    episodeId,
                    `${label}:voices.${voiceId}`,
                    "breakdown_voice_missing",
                    "error",
                    `音色不存在：${voiceId}`,
                    "先加入全局设定集。",
                ),
            );
            continue;
        }
        if (!characterMap.has(voice.character_id) || !doc.characters.some((c) => c.id === voice.character_id)) {
            issues.push(
                issue(
                    episodeId,
                    `${label}:voices.${voiceId}`,
                    "breakdown_voice_character_missing",
                    "error",
                    `音色所属角色不在本集拆解：${voice.character_id}`,
                    "把角色加入本集拆解。",
                ),
            );
        }
    }
}

/**
 * 从镜头引用解析角色 / 形态。
 */
function castRefOf(value: unknown): { id: string; form: string | null } | null {
    if (typeof value === "string") {
        // 形态分隔符
        const slash = value.indexOf("/");
        if (slash > 0) return { id: value.slice(0, slash), form: value.slice(slash + 1) };
        return { id: value, form: null };
    }
    // 对象视图
    const record = recordOf(value);
    if (record === null) return null;
    // id
    const id = stringOf(record.id);
    if (id === null) return null;
    // 形态
    const form = stringOf(record.form);
    return { id, form };
}

/**
 * 场景引用。
 */
function sceneRefOf(value: unknown): string | null {
    if (typeof value === "string") return stringOf(value);
    // 对象视图
    const record = recordOf(value);
    return record !== null ? stringOf(record.id) : null;
}

/**
 * 校验单集分镜。
 */
function checkEpisodeShotsDoc(
    root: string,
    episodeId: string,
    project: ProjectConfig | null,
    shots: ShotsFile,
    breakdown: BreakdownFile | null,
    characters: StoryCharactersFile,
    scenes: StoryScenesFile,
    voices: StoryVoicesFile,
    scriptRevision: number,
    scriptSha: string,
    issues: StoryIssue[],
): void {
    // 标签
    const label = `episodes/${episodeId}/${SHOTS_FILE}`;
    // meta
    if (shots.meta.episode_id !== episodeId) {
        issues.push(
            issue(
                episodeId,
                `${label}:meta.episode_id`,
                "shots_episode_mismatch",
                "error",
                `meta.episode_id=${String(shots.meta.episode_id)} 与目录不一致`,
                "修正 meta.episode_id。",
            ),
        );
    }
    // revision
    const rev = shots.meta.script_revision;
    if (typeof rev !== "number" || !Number.isInteger(rev) || rev < 0) {
        issues.push(
            issue(
                episodeId,
                `${label}:meta.script_revision`,
                "shots_script_revision_invalid",
                "error",
                "meta.script_revision 缺失或非法",
                "用 story shots set 写入。",
            ),
        );
    } else if (rev > scriptRevision) {
        issues.push(
            issue(
                episodeId,
                `${label}:meta.script_revision`,
                "shots_script_revision_future",
                "error",
                `meta.script_revision=${rev} 大于当前剧本 ${scriptRevision}`,
                "修正 meta。",
            ),
        );
    } else if (rev < scriptRevision) {
        issues.push(issue(episodeId, label, "shots_stale", "warning", "分镜基于旧剧本", "更新分镜。"));
    } else if (shots.meta.script_sha256 !== scriptSha) {
        issues.push(
            issue(
                episodeId,
                `${label}:meta.script_sha256`,
                "shots_hash_mismatch",
                "error",
                "meta.script_sha256 与当前剧本不一致",
                "更新分镜。",
            ),
        );
    }
    // 空分镜（剧本已同步后不允许）
    if (scriptRevision > 0 && shots.shots.length === 0) {
        issues.push(issue(episodeId, `${label}:shots`, "shots_empty", "error", "分镜表为空", "添加至少一个镜头。"));
    }
    // 尺寸
    if (!Number.isFinite(shots.meta.width) || shots.meta.width <= 0) {
        issues.push(
            issue(
                episodeId,
                `${label}:meta.width`,
                "shots_width_invalid",
                "error",
                "meta.width 必须是正数",
                "填写生成宽度。",
            ),
        );
    }
    if (!Number.isFinite(shots.meta.height) || shots.meta.height <= 0) {
        issues.push(
            issue(
                episodeId,
                `${label}:meta.height`,
                "shots_height_invalid",
                "error",
                "meta.height 必须是正数",
                "填写生成高度。",
            ),
        );
    }
    // 角色索引
    const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
    // 场景索引
    const sceneMap = new Map(scenes.scenes.map((s) => [s.id, s]));
    // 音色索引
    const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
    // 拆解角色 / 形态
    const breakdownCharacters = new Map((breakdown?.characters ?? []).map((c) => [c.id, new Set(c.forms)]));
    // 局部值
    const breakdownScenes = new Set(breakdown?.scenes ?? []);
    // 局部值
    const breakdownVoices = new Set(breakdown?.voices ?? []);
    // beat
    const beatIds = new Set((breakdown?.beats ?? []).map((b) => b.id));
    // 已见镜号
    const shotIds = new Set<string>();
    for (const shot of shots.shots) {
        // 定位
        const shotLabel = `${label}:shots.${shot.id}`;
        if (shotIds.has(shot.id)) {
            issues.push(
                issue(episodeId, shotLabel, "shot_id_duplicate", "error", `镜号重复：${shot.id}`, "镜号必须唯一。"),
            );
        }
        shotIds.add(shot.id);
        if (typeof shot.seed !== "number") {
            issues.push(issue(episodeId, shotLabel, "shot_seed_invalid", "error", "缺少数值 seed", "填写 seed。"));
        }
        if (typeof shot.prompt !== "string" || shot.prompt.trim() === "") {
            issues.push(issue(episodeId, shotLabel, "shot_prompt_empty", "error", "prompt 为空", "填写提示词。"));
        }
        // 角色
        for (const ref of shot.characters ?? []) {
            // 解析引用
            const cast = castRefOf(ref);
            if (cast === null) {
                issues.push(
                    issue(
                        episodeId,
                        `${shotLabel}.characters`,
                        "cast_invalid",
                        "error",
                        "角色引用非法",
                        "使用 id 或 {id, form}。",
                    ),
                );
                continue;
            }
            // 角色
            const character = characterMap.get(cast.id);
            if (character === undefined) {
                issues.push(
                    issue(
                        episodeId,
                        `${shotLabel}.characters`,
                        "cast_character_missing",
                        "error",
                        `角色不存在：${cast.id}`,
                        "先加入全局设定集。",
                    ),
                );
                continue;
            }
            // 形态
            const form = cast.form ?? character.default_form;
            if (!character.forms.some((f) => f.id === form)) {
                issues.push(
                    issue(
                        episodeId,
                        `${shotLabel}.characters`,
                        "cast_form_missing",
                        "error",
                        `形态不存在：${cast.id}/${form}`,
                        "先加入全局设定集。",
                    ),
                );
            }
            // 拆解允许
            const allowed = breakdownCharacters.get(cast.id);
            if (allowed === undefined || !allowed.has(form)) {
                issues.push(
                    issue(
                        episodeId,
                        `${shotLabel}.characters`,
                        "entity_not_in_breakdown",
                        "error",
                        `镜头使用了本集拆解未声明的角色形态：${cast.id}/${form}`,
                        "先更新本集拆解。",
                    ),
                );
            }
        }
        // 场景
        const sceneId = sceneRefOf(shot.scene);
        if (sceneId === null) {
            issues.push(
                issue(episodeId, `${shotLabel}.scene`, "scene_missing", "error", "场景为空或非法", "填写场景 id。"),
            );
        } else if (!sceneMap.has(sceneId)) {
            issues.push(
                issue(
                    episodeId,
                    `${shotLabel}.scene`,
                    "scene_not_found",
                    "error",
                    `场景不存在：${sceneId}`,
                    "先加入全局设定集。",
                ),
            );
        } else if (!breakdownScenes.has(sceneId)) {
            issues.push(
                issue(
                    episodeId,
                    `${shotLabel}.scene`,
                    "entity_not_in_breakdown",
                    "error",
                    `场景未在本集拆解声明：${sceneId}`,
                    "先更新本集拆解。",
                ),
            );
        }
        // scene_asset
        const sceneAsset = (shot as unknown as Record<string, unknown>).scene_asset;
        if (typeof sceneAsset === "string" && sceneAsset !== "" && sceneId !== null) {
            // 场景
            const scene = sceneMap.get(sceneId);
            if (scene !== undefined && !scene.assets.some((a) => a.id === sceneAsset)) {
                issues.push(
                    issue(
                        episodeId,
                        `${shotLabel}.scene_asset`,
                        "scene_asset_missing",
                        "error",
                        `场景资产不存在：${sceneId}/${sceneAsset}`,
                        "修正 scene_asset。",
                    ),
                );
            }
        }
        // 台词
        for (const line of shot.dialogue ?? []) {
            // 台词定位
            const lineLabel = `${shotLabel}.dialogue.${line.character}`;
            // 角色引用
            const cast = breakdownCharacters.get(line.character);
            if (cast === undefined) {
                issues.push(
                    issue(
                        episodeId,
                        lineLabel,
                        "dialogue_character_missing",
                        "error",
                        `台词角色不在本集拆解：${line.character}`,
                        "先更新本集拆解。",
                    ),
                );
                continue;
            }
            // 角色
            const character = characterMap.get(line.character);
            if (character === undefined) continue;
            // 音色
            const voiceId = line.voice !== undefined && line.voice !== "" ? line.voice : (character.voice_ids ?? [])[0];
            if (voiceId === undefined) {
                issues.push(
                    issue(
                        episodeId,
                        lineLabel,
                        "dialogue_voice_missing",
                        "error",
                        "台词没有可用音色",
                        "登记音色并显式引用。",
                    ),
                );
                continue;
            }
            if ((character.voice_ids ?? []).length > 1 && (line.voice === undefined || line.voice === "")) {
                issues.push(
                    issue(
                        episodeId,
                        lineLabel,
                        "dialogue_voice_ambiguous",
                        "error",
                        `角色 ${line.character} 有多个音色，台词必须显式 voice`,
                        "填写 dialogue.voice。",
                    ),
                );
            }
            // 音色
            const voice = voiceMap.get(voiceId);
            if (voice === undefined) {
                issues.push(
                    issue(
                        episodeId,
                        lineLabel,
                        "dialogue_voice_not_found",
                        "error",
                        `音色不存在：${voiceId}`,
                        "先加入全局设定集。",
                    ),
                );
            } else if (voice.character_id !== line.character) {
                issues.push(
                    issue(
                        episodeId,
                        lineLabel,
                        "dialogue_voice_mismatch",
                        "error",
                        `音色 ${voiceId} 不属于 ${line.character}`,
                        "修正 dialogue.voice。",
                    ),
                );
            } else if (!breakdownVoices.has(voiceId)) {
                issues.push(
                    issue(
                        episodeId,
                        lineLabel,
                        "entity_not_in_breakdown",
                        "error",
                        `音色未在本集拆解声明：${voiceId}`,
                        "先更新本集拆解。",
                    ),
                );
            }
        }
        // beat 引用
        for (const ref of shot.script_refs ?? []) {
            if (beatIds.size > 0 && !beatIds.has(ref)) {
                issues.push(
                    issue(
                        episodeId,
                        `${shotLabel}.script_refs`,
                        "script_ref_missing",
                        "error",
                        `beat 不存在：${ref}`,
                        "修正 script_refs。",
                    ),
                );
            }
        }
        // 显式资产槽位只能引用本集拆解内的角色形态 / 音色
        for (const [slotName, mapping] of Object.entries(shot.asset_slots ?? {})) {
            if (typeof mapping !== "string" || mapping.trim() === "") {
                issues.push(
                    issue(
                        episodeId,
                        `${shotLabel}.asset_slots.${slotName}`,
                        "asset_slot_invalid",
                        "error",
                        "asset_slots 的值必须是非空字符串",
                        "使用 owner 或 owner@asset。",
                    ),
                );
                continue;
            }
            // owner（去掉 @asset）
            const at = mapping.lastIndexOf("@");
            const owner = at > 0 ? mapping.slice(0, at) : mapping;
            // 角色 / 形态分隔
            const slash = owner.indexOf("/");
            const ownerId = slash > 0 ? owner.slice(0, slash) : owner;
            const ownerForm = slash > 0 ? owner.slice(slash + 1) : null;
            const allowed = breakdownCharacters.get(ownerId);
            if (allowed !== undefined) {
                // 默认形态也必须在本集允许清单内
                const form = ownerForm ?? characterMap.get(ownerId)?.default_form ?? null;
                if (form !== null && !allowed.has(form)) {
                    issues.push(
                        issue(
                            episodeId,
                            `${shotLabel}.asset_slots.${slotName}`,
                            "entity_not_in_breakdown",
                            "error",
                            `资产槽位引用了拆解未声明的形态：${ownerId}/${form}`,
                            "先更新本集拆解。",
                        ),
                    );
                }
                continue;
            }
            if (breakdownVoices.has(ownerId)) continue;
            issues.push(
                issue(
                    episodeId,
                    `${shotLabel}.asset_slots.${slotName}`,
                    "entity_not_in_breakdown",
                    "error",
                    `资产槽位引用了拆解未声明的对象：${owner}`,
                    "先更新本集拆解，或修正 asset_slots。",
                ),
            );
        }
        // workflow
        const wfRef = shot.workflow ?? shots.workflow ?? project?.default_workflow ?? null;
        if (wfRef === null) {
            issues.push(
                issue(
                    episodeId,
                    shotLabel,
                    "shot_workflow_missing",
                    "error",
                    "镜头没有可用 workflow",
                    "设置 project.default_workflow / shots.workflow / 单镜 workflow。",
                ),
            );
        } else {
            try {
                // 工作流路径
                const wf = resolveWorkflowRef(root, wfRef);
                if (!existsSync(wf.abs)) {
                    issues.push(
                        issue(
                            episodeId,
                            shotLabel,
                            "shot_workflow_missing",
                            "error",
                            `workflow 不存在：${wf.rel}`,
                            "先创建 / 导入 workflow。",
                        ),
                    );
                } else {
                    // bindings 是 shot/batch 的必需输入
                    if (!existsSync(bindingsPathOf(wf.abs))) {
                        issues.push(
                            issue(
                                episodeId,
                                shotLabel,
                                "shot_bindings_missing",
                                "error",
                                `workflow 缺少 bindings：${wf.rel}`,
                                "shot/batch 需要 bindings 注入 prompt/seed。",
                            ),
                        );
                    }
                    // 剧情资产槽位（文件不存在时自动跳过）
                    try {
                        resolveWorkflowAssets({ root, shot, workflowAbs: wf.abs });
                    } catch (e) {
                        issues.push(
                            issue(
                                episodeId,
                                shotLabel,
                                isDaoyanCliError(e) ? e.code : "asset_slot_invalid",
                                "error",
                                e instanceof Error ? e.message : String(e),
                                "补齐资产 / 主参考，或修正 workflow assets 槽位。",
                            ),
                        );
                    }
                }
            } catch {
                issues.push(
                    issue(
                        episodeId,
                        shotLabel,
                        "shot_workflow_invalid",
                        "error",
                        `workflow 引用非法：${wfRef}`,
                        "修正 workflow 引用。",
                    ),
                );
            }
        }
    }
}

/**
 * 覆盖检查：拆解声明的形态 / 场景 / 音色是否有可用主参考。
 */
function coverageBlockers(
    root: string,
    breakdown: BreakdownFile | null,
    characters: StoryCharactersFile,
    scenes: StoryScenesFile,
    voices: StoryVoicesFile,
    shots: ShotsFile | null,
): StoryBlocker[] {
    if (breakdown === null) return [];
    // 结果
    const out: StoryBlocker[] = [];
    // 角色索引
    const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
    // 场景索引
    const sceneMap = new Map(scenes.scenes.map((s) => [s.id, s]));
    // 音色索引
    const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
    // 镜头用途
    const shotIds = shots?.shots.map((s) => s.id) ?? [];
    for (const item of breakdown.characters) {
        // 角色
        const character = characterMap.get(item.id);
        if (character === undefined) continue;
        for (const formId of item.forms) {
            // 形态
            const form = character.forms.find((f) => f.id === formId);
            if (form === undefined) continue;
            if (!form.reference_asset) {
                out.push(
                    blocker(
                        "missing_reference",
                        `角色 ${item.id}/${formId} 没有显式主参考图`,
                        `character:${item.id}/form:${formId}`,
                        shotIds.filter((id) => {
                            // 镜头
                            const shot = shots?.shots.find((s) => s.id === id);
                            return (shot?.characters ?? []).some((ref) => {
                                // 角色引用
                                const cast = castRefOf(ref);
                                return cast?.id === item.id && (cast.form ?? character.default_form) === formId;
                            });
                        }),
                    ),
                );
                continue;
            }
            // 参考资产
            const asset = form.assets.find((a) => a.id === form.reference_asset);
            if (asset === undefined || !usableAsset(root, asset)) {
                out.push(
                    blocker(
                        "missing_reference",
                        `角色 ${item.id}/${formId} 的主参考图不可用`,
                        `character:${item.id}/form:${formId}`,
                    ),
                );
            }
        }
    }
    for (const sceneId of breakdown.scenes) {
        // 场景
        const scene = sceneMap.get(sceneId);
        if (scene === undefined) continue;
        if (!scene.reference_asset) {
            out.push(blocker("missing_reference", `场景 ${sceneId} 没有显式主参考图`, `scene:${sceneId}`));
            continue;
        }
        // 资产
        const asset = scene.assets.find((a) => a.id === scene.reference_asset);
        if (asset === undefined || !usableAsset(root, asset)) {
            out.push(blocker("missing_reference", `场景 ${sceneId} 的主参考图不可用`, `scene:${sceneId}`));
        }
    }
    for (const voiceId of breakdown.voices) {
        // 音色
        const voice = voiceMap.get(voiceId);
        if (voice === undefined) continue;
        if (voice.mode === "text") {
            if (stringOf(voice.description) === null) {
                out.push(blocker("voice_not_ready", `音色 ${voiceId} 缺少文本描述`, `voice:${voiceId}`));
            }
            continue;
        }
        if (!voice.reference_asset) {
            out.push(blocker("voice_not_ready", `音色 ${voiceId} 没有显式参考音频`, `voice:${voiceId}`));
            continue;
        }
        // 资产
        const asset = voice.assets.find((a) => a.id === voice.reference_asset);
        if (asset === undefined || !usableAsset(root, asset)) {
            out.push(blocker("voice_not_ready", `音色 ${voiceId} 的参考音频不可用`, `voice:${voiceId}`));
        }
    }
    return out;
}

/**
 * 资产是否可用（文件存在且不是 LFS pointer）。
 */
function usableAsset(root: string, asset: { path: string }): boolean {
    // 绝对路径
    const abs = join(root, asset.path);
    return existsSync(abs) && !isLfsPointerFile(abs);
}

/**
 * 统计拆解涉及的资产数。
 */
function breakdownAssetCount(
    breakdown: BreakdownFile | null,
    characters: StoryCharactersFile,
    scenes: StoryScenesFile,
    voices: StoryVoicesFile,
): number {
    if (breakdown === null) return 0;
    // 计数
    let count = 0;
    // 角色索引
    const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
    for (const item of breakdown.characters) {
        // 角色
        const character = characterMap.get(item.id);
        if (character === undefined) continue;
        for (const formId of item.forms) {
            // 形态
            const form = character.forms.find((f) => f.id === formId);
            if (form !== undefined) count += form.assets.length;
        }
    }
    // 场景索引
    const sceneMap = new Map(scenes.scenes.map((s) => [s.id, s]));
    for (const sceneId of breakdown.scenes) count += sceneMap.get(sceneId)?.assets.length ?? 0;
    // 音色索引
    const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
    for (const voiceId of breakdown.voices) count += voiceMap.get(voiceId)?.assets.length ?? 0;
    return count;
}

/**
 * 校验单集成片 manifest。
 */
function validateEpisodeFinals(root: string, episodeId: string, issues: StoryIssue[]): void {
    // 成片目录
    const dir = join(root, FINAL_DIR, episodeId);
    if (!existsSync(dir)) return;
    // manifest
    let entries: string[] = [];
    try {
        entries = readdirSync(dir).filter((name) => name.endsWith(".json"));
    } catch {
        return;
    }
    for (const name of entries) {
        // manifest 内容
        const manifest = readJsonIfExists<{
            episode_id?: string | null;
            cut?: string;
            clips?: Array<{ run_id?: string }>;
        }>(join(dir, name));
        if (manifest === null) continue;
        const label = `${FINAL_DIR}/${episodeId}/${name}`;
        if (manifest.episode_id !== episodeId) {
            issues.push(
                issue(
                    episodeId,
                    label,
                    "final_episode_mismatch",
                    "error",
                    `manifest episode_id=${String(manifest.episode_id)} 与目录不一致`,
                    "重新 wrap --episode。",
                ),
            );
        }
        for (const clip of manifest.clips ?? []) {
            if (typeof clip.run_id !== "string" || clip.run_id === "") continue;
            // run 记录
            const run = readJsonIfExists<{ episode_id?: string | null }>(join(root, "runs", clip.run_id, RUN_FILE));
            if (run !== null && run.episode_id !== episodeId) {
                issues.push(
                    issue(
                        episodeId,
                        label,
                        "final_run_episode_mismatch",
                        "error",
                        `manifest 引用了其它剧集的 run ${clip.run_id}`,
                        "重新合片或修正 manifest。",
                    ),
                );
            }
        }
    }
}

/**
 * 是否有成片。
 */
function hasFinal(root: string, episodeId: string): boolean {
    // 成片目录
    const dir = join(root, FINAL_DIR, episodeId);
    if (!existsSync(dir)) return false;
    try {
        return readdirSync(dir).some((name) => /^cut-.*\.(mp4|webm|mov|mkv)$/i.test(name));
    } catch {
        return false;
    }
}

/**
 * 计算单集阶段与 blockers。
 */
export function computeEpisodeStoryStatus(
    root: string,
    episodeId: string,
    project?: ProjectConfig | null,
): EpisodeStoryStatus {
    // 剧集元数据
    const episodes = listEpisodeMetas(root);
    // 元数据
    const meta = episodes.find((e) => e.id === episodeId);
    if (meta === undefined) {
        throw new Error(`episode not found: ${episodeId}`);
    }
    // 文档
    const script = loadScriptMeta(root, episodeId);
    // 拆解
    const breakdown = loadBreakdown(root, episodeId);
    // 分镜
    const shots = loadEpisodeShots(root, episodeId);
    // 角色列表
    const characters = loadCharacters(root);
    // 场景列表
    const scenes = loadScenes(root);
    // 音色列表
    const voices = loadVoices(root);
    // 有效项目配置
    const effectiveProject = project === undefined ? readProjectAt(root) : project;
    // 拆解 stale
    const breakdownStale = breakdown !== null && breakdown.source_revision < script.revision;
    // 分镜 stale
    const shotsRevision = shots?.meta.script_revision;
    // 局部值
    const shotsStale = typeof shotsRevision === "number" && shotsRevision < script.revision;
    // blockers
    const blockers: StoryBlocker[] = [];
    if (script.revision <= 0 || !existsSync(join(episodeDir(root, episodeId), "script.md"))) {
        blockers.push(blocker("script_missing", "本集剧本尚未同步"));
    } else if (script.status !== "approved") {
        blockers.push(blocker("script_draft", "本集剧本未确认"));
    }
    if (breakdown === null) {
        blockers.push(blocker("breakdown_missing", "本集拆解不存在"));
    } else if (breakdownStale) {
        blockers.push(
            blocker(
                "breakdown_stale",
                `拆解基于 script revision ${breakdown.source_revision}，当前为 ${script.revision}`,
            ),
        );
    }
    if (breakdown !== null) blockers.push(...coverageBlockers(root, breakdown, characters, scenes, voices, shots));
    if (shots === null) {
        blockers.push(blocker("shots_missing", "本集分镜不存在"));
    } else if (shots.shots.length === 0) {
        blockers.push(blocker("shots_missing", "本集分镜为空"));
    } else if (shotsStale) {
        blockers.push(
            blocker("shots_stale", `分镜基于 script revision ${String(shotsRevision)}，当前为 ${script.revision}`),
        );
    }
    // workflow 解析
    if (shots !== null) {
        for (const shot of shots.shots) {
            // workflow 引用
            const wfRef = shot.workflow ?? shots.workflow ?? effectiveProject?.default_workflow ?? null;
            if (wfRef === null) {
                blockers.push(blocker("workflow_unresolved", `镜头 ${shot.id} 没有可用 workflow`));
                break;
            }
            try {
                // 工作流路径
                const wf = resolveWorkflowRef(root, wfRef);
                if (!existsSync(wf.abs)) {
                    blockers.push(blocker("workflow_unresolved", `镜头 ${shot.id} 的 workflow 不存在：${wf.rel}`));
                    break;
                }
                // bindings 必需
                if (!existsSync(bindingsPathOf(wf.abs))) {
                    blockers.push(
                        blocker("workflow_unresolved", `镜头 ${shot.id} 的 workflow 缺少 bindings：${wf.rel}`),
                    );
                    break;
                }
                // 资产槽位解析
                try {
                    resolveWorkflowAssets({ root, shot, workflowAbs: wf.abs });
                } catch (e) {
                    // 结构化 blocker
                    const details = isDaoyanCliError(e) ? e.details : undefined;
                    // 嵌套 blockers
                    const nested = details?.blockers;
                    if (Array.isArray(nested) && nested.length > 0) {
                        for (const item of nested) {
                            // 记录
                            const record = recordOf(item);
                            if (record !== null) {
                                blockers.push(
                                    blocker(
                                        String(record.code ?? "missing_reference"),
                                        String(record.message ?? "资产不可用"),
                                        String(record.ref ?? ""),
                                    ),
                                );
                            }
                        }
                    } else {
                        blockers.push(
                            blocker(
                                "workflow_unresolved",
                                `镜头 ${shot.id}：${e instanceof Error ? e.message : String(e)}`,
                            ),
                        );
                    }
                    break;
                }
            } catch {
                blockers.push(blocker("workflow_unresolved", `镜头 ${shot.id} 的 workflow 引用非法：${wfRef}`));
                break;
            }
        }
    }
    // 阶段
    let stage: EpisodeStoryStatus["stage"] = "ready";
    if (blockers.some((b) => b.code === "script_missing" || b.code === "script_draft")) stage = "script";
    else if (blockers.some((b) => b.code === "breakdown_missing" || b.code === "breakdown_stale")) stage = "breakdown";
    else if (blockers.some((b) => b.code === "missing_reference" || b.code === "voice_not_ready")) stage = "assets";
    else if (blockers.some((b) => b.code === "shots_missing" || b.code === "shots_stale")) stage = "storyboard";
    else if (blockers.some((b) => b.code === "workflow_unresolved")) stage = "workflow";
    else if (hasFinal(root, episodeId)) stage = "wrapped";
    // 计数
    const counts = {
        characters: breakdown?.characters.length ?? 0,
        forms: breakdown?.characters.reduce((sum, c) => sum + c.forms.length, 0) ?? 0,
        scenes: breakdown?.scenes.length ?? 0,
        voices: breakdown?.voices.length ?? 0,
        shots: shots?.shots.length ?? 0,
        assets: breakdownAssetCount(breakdown, characters, scenes, voices),
    };
    // next actions
    const nextActions = nextActionsForEpisode(stage, episodeId, blockers);
    return {
        enabled: true,
        episode: { id: meta.id, number: meta.number, title: meta.title },
        stage,
        script: {
            revision: script.revision,
            status: script.status,
            sha256: script.sha256,
            synced_at: script.synced_at,
            approved_at: script.approved_at,
        },
        documents: {
            breakdown: {
                source_revision: breakdown?.source_revision ?? 0,
                stale: breakdownStale,
                present: breakdown !== null,
            },
            shots: {
                source_revision: typeof shotsRevision === "number" ? shotsRevision : 0,
                stale: shotsStale,
                present: shots !== null,
            },
        },
        counts,
        blockers,
        warnings: [],
        next_actions: nextActions,
    };
}

/**
 * 单集下一步命令。
 */
function nextActionsForEpisode(
    stage: EpisodeStoryStatus["stage"],
    episodeId: string,
    blockers: StoryBlocker[],
): string[] {
    // 首个 blocker
    const first = blockers[0];
    if (stage === "script") {
        return first?.code === "script_draft"
            ? [`daoyan story script approve --episode ${episodeId} --json`]
            : [`daoyan story script sync --episode ${episodeId} --file <script.md> --json`];
    }
    if (stage === "breakdown") {
        return [`daoyan story breakdown set --episode ${episodeId} --file <breakdown.json> --json`];
    }
    if (stage === "assets") {
        // 资产 blocker
        const assetBlocker = blockers.find((b) => b.code === "missing_reference" || b.code === "voice_not_ready");
        // 资产缺失引用
        const ref = assetBlocker?.ref ?? "";
        if (ref.startsWith("character:")) {
            // 角色 / 形态
            const body = ref.slice("character:".length);
            // 分隔符位置
            const slash = body.indexOf("/form:");
            // 角色 id
            const characterId = slash >= 0 ? body.slice(0, slash) : body;
            // 形态 id
            const formId = slash >= 0 ? body.slice(slash + "/form:".length) : "<form>";
            return [
                `daoyan story asset add --owner character:${characterId} --form ${formId} --id <asset> --from <图片> --set-reference --json`,
                `daoyan story status --episode ${episodeId} --json`,
            ];
        }
        if (ref.startsWith("scene:")) {
            return [
                `daoyan story asset add --owner ${ref} --id <asset> --from <图片> --set-reference --json`,
                `daoyan story status --episode ${episodeId} --json`,
            ];
        }
        if (ref.startsWith("voice:")) {
            return [
                `daoyan story asset add --owner ${ref} --id <asset> --from <音频> --set-reference --json`,
                `daoyan story status --episode ${episodeId} --json`,
            ];
        }
        return ["补齐本集拆解声明的参考资产", `daoyan story status --episode ${episodeId} --json`];
    }
    if (stage === "storyboard") {
        return [`daoyan story shots set --episode ${episodeId} --file <shots.json> --json`];
    }
    if (stage === "workflow") {
        return [`daoyan workflow validate <name> --json`, `daoyan story status --episode ${episodeId} --json`];
    }
    return [`daoyan shot <镜号> --episode ${episodeId} --json`];
}

/**
 * 系列概览。
 */
export function computeSeriesStoryStatus(root: string, project?: ProjectConfig | null): SeriesStoryStatus {
    // 系列
    const series = readSeries(root);
    // 全部剧集
    const metas = listEpisodeMetas(root);
    // 每集状态
    const episodes = metas.map((meta) => {
        // 单集状态
        const status = computeEpisodeStoryStatus(root, meta.id, project);
        return {
            id: meta.id,
            number: meta.number,
            title: meta.title,
            stage: status.stage,
            script: { revision: status.script.revision, status: status.script.status },
            blockers: status.blockers,
        };
    });
    // 全局设定
    const characters = loadCharacters(root);
    // 场景列表
    const scenes = loadScenes(root);
    // 音色列表
    const voices = loadVoices(root);
    // 资产列表
    const assets = listAssets(root);
    // 全部镜头
    const shots = metas.reduce((sum, meta) => sum + (loadEpisodeShots(root, meta.id)?.shots.length ?? 0), 0);
    // 可拍摄 / 已合片
    const ready = episodes.filter((e) => e.stage === "ready" || e.stage === "wrapped").length;
    // 被阻断
    const blocked = episodes.filter((e) => e.blockers.length > 0).length;
    return {
        enabled: true,
        series: {
            title: series?.title ?? "",
            episodes_total: metas.length,
            episodes_ready: ready,
            episodes_blocked: blocked,
        },
        episodes,
        counts: {
            episodes: metas.length,
            characters: characters.characters.length,
            forms: characters.characters.reduce((sum, c) => sum + c.forms.length, 0),
            scenes: scenes.scenes.length,
            voices: voices.voices.length,
            shots,
            assets: assets.length,
        },
        next_actions: episodes
            .filter((e) => e.blockers.length > 0)
            .slice(0, 5)
            .map((e) => `${e.id}: ${e.blockers[0]?.message ?? "需要处理"}`),
    };
}

/**
 * 完整 story 校验。
 */
export function validateStory(root: string, episodeId?: string, verifyHashes = false): StoryIssue[] {
    // 问题
    const issues: StoryIssue[] = [];
    if (!storyEnabled(root)) {
        issues.push(issue(null, "story/", "story_not_found", "error", "story 模式未启用", "运行 daoyan story init。"));
        return issues;
    }
    // 系列
    const series = readSeries(root);
    if (series === null || !existsSync(seriesPath(root))) {
        issues.push(
            issue(null, "story/series.json", "series_missing", "error", "系列元数据不存在", "重新 story init。"),
        );
    } else if (stringOf(series.title) === null) {
        issues.push(
            issue(
                null,
                "story/series.json",
                "series_title_missing",
                "error",
                "系列 title 为空",
                "用 story series set 填写。",
            ),
        );
    }
    // 剧集目录
    const metas = listEpisodeMetas(root);
    // 剧集 id 集合
    const episodeIds = new Set(metas.map((m) => m.id));
    // 集数集合
    const numbers = new Set<number>();
    for (const meta of metas) {
        if (numbers.has(meta.number)) {
            issues.push(
                issue(
                    meta.id,
                    `episodes/${meta.id}/${EPISODE_META_FILE}`,
                    "episode_number_duplicate",
                    "error",
                    `集数重复：${meta.number}`,
                    "修正 number。",
                ),
            );
        }
        numbers.add(meta.number);
        if (!existsSync(join(episodeDir(root, meta.id), EPISODE_META_FILE))) {
            issues.push(
                issue(
                    meta.id,
                    `episodes/${meta.id}`,
                    "episode_meta_missing",
                    "error",
                    "episode.json 缺失",
                    "重新 episode add。",
                ),
            );
        }
    }
    // 全局设定
    const characters = loadCharacters(root);
    // 场景列表
    const scenes = loadScenes(root);
    // 音色列表
    const voices = loadVoices(root);
    if (!existsSync(charactersPath(root))) {
        issues.push(
            issue(null, "story/characters.json", "characters_missing", "error", "角色设定不存在", "重新 story init。"),
        );
    }
    if (!existsSync(scenesPath(root))) {
        issues.push(issue(null, "story/scenes.json", "scenes_missing", "error", "场景设定不存在", "重新 story init。"));
    }
    if (!existsSync(voicesPath(root))) {
        issues.push(issue(null, "story/voices.json", "voices_missing", "error", "音色设定不存在", "重新 story init。"));
    }
    validateCharacters(root, characters, voices, episodeIds, verifyHashes, issues);
    validateScenes(root, scenes, episodeIds, verifyHashes, issues);
    validateVoices(root, voices, characters, verifyHashes, issues);
    // 目标剧集
    const targets = episodeId !== undefined ? metas.filter((m) => m.id === episodeId) : metas;
    if (episodeId !== undefined && targets.length === 0) {
        issues.push(
            issue(
                episodeId,
                `episodes/${episodeId}`,
                "episode_not_found",
                "error",
                `剧集不存在：${episodeId}`,
                "用 story episode list 查看。",
            ),
        );
        return issues;
    }
    for (const meta of targets) {
        validateScript(root, meta.id, issues);
        // 剧本
        const script = loadScriptMeta(root, meta.id);
        // 拆解
        const breakdown = loadBreakdown(root, meta.id);
        if (breakdown === null) {
            issues.push(
                issue(
                    meta.id,
                    `episodes/${meta.id}/${BREAKDOWN_FILE}`,
                    "breakdown_missing",
                    "warning",
                    "拆解不存在",
                    "运行 story breakdown set。",
                ),
            );
        } else {
            checkBreakdownDoc(
                root,
                meta.id,
                breakdown,
                script.revision,
                script.sha256,
                characters,
                scenes,
                voices,
                issues,
            );
        }
        // 分镜
        const shots = loadEpisodeShots(root, meta.id);
        if (shots === null) {
            issues.push(
                issue(
                    meta.id,
                    `episodes/${meta.id}/${SHOTS_FILE}`,
                    "shots_missing",
                    "warning",
                    "分镜不存在",
                    "运行 story shots set。",
                ),
            );
        } else {
            checkEpisodeShotsDoc(
                root,
                meta.id,
                readProjectAt(root),
                shots,
                breakdown,
                characters,
                scenes,
                voices,
                script.revision,
                script.sha256,
                issues,
            );
        }
        // 覆盖检查（拆解使用时缺主参考 -> error）
        for (const item of coverageBlockers(root, breakdown, characters, scenes, voices, shots)) {
            issues.push(
                issue(
                    meta.id,
                    `episodes/${meta.id}/${BREAKDOWN_FILE}`,
                    item.code,
                    "error",
                    item.message,
                    "入库资产并用 story asset set-reference 指定主参考。",
                ),
            );
        }
        // 成片 manifest
        validateEpisodeFinals(root, meta.id, issues);
    }
    return issues;
}

/**
 * 写入前检查角色文件。
 */
export function checkCharactersDocForWrite(root: string, doc: StoryCharactersFile, verifyHashes = false): StoryIssue[] {
    // 问题
    const issues: StoryIssue[] = [];
    validateCharacters(root, doc, loadVoices(root), episodeIdSet(root), verifyHashes, issues);
    // 允许先写角色、后写音色：写入阶段把未解析的 voice_ids 降为 warning，story validate 仍会报错
    return issues.map((item) => (item.code === "voice_id_missing" ? { ...item, severity: "warning" as const } : item));
}

/**
 * 写入前检查场景文件。
 */
export function checkScenesDocForWrite(root: string, doc: StoryScenesFile, verifyHashes = false): StoryIssue[] {
    // 问题
    const issues: StoryIssue[] = [];
    validateScenes(root, doc, episodeIdSet(root), verifyHashes, issues);
    return issues;
}

/**
 * 写入前检查音色文件。
 */
export function checkVoicesDocForWrite(root: string, doc: StoryVoicesFile, verifyHashes = false): StoryIssue[] {
    // 问题
    const issues: StoryIssue[] = [];
    validateVoices(root, doc, loadCharacters(root), verifyHashes, issues);
    return issues;
}

/**
 * 写入前检查拆解。
 */
export function checkBreakdownForWrite(root: string, episodeId: string, doc: BreakdownFile): StoryIssue[] {
    // 剧本
    const script = loadScriptMeta(root, episodeId);
    // 问题
    const issues: StoryIssue[] = [];
    checkBreakdownDoc(
        root,
        episodeId,
        doc,
        script.revision,
        script.sha256,
        loadCharacters(root),
        loadScenes(root),
        loadVoices(root),
        issues,
    );
    return issues;
}

/**
 * 写入前检查单集分镜。
 */
export function checkShotsForWrite(root: string, episodeId: string, shots: ShotsFile): StoryIssue[] {
    // 剧本
    const script = loadScriptMeta(root, episodeId);
    // 问题
    const issues: StoryIssue[] = [];
    checkEpisodeShotsDoc(
        root,
        episodeId,
        readProjectAt(root),
        shots,
        loadBreakdown(root, episodeId),
        loadCharacters(root),
        loadScenes(root),
        loadVoices(root),
        script.revision,
        script.sha256,
        issues,
    );
    return issues;
}

/**
 * 拍摄门禁 blockers。
 */
export function episodeGateBlockers(root: string, episodeId: string): StoryBlocker[] {
    return computeEpisodeStoryStatus(root, episodeId).blockers;
}
