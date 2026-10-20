/** 工作流资产槽位 —— 把分镜里的角色 / 场景 / 音色解析成可上传的具体资产。
 *  规则：
 *  - 槽位 asset 只能是 "reference" 或具体 asset id；
 *  - 不存在的 reference / asset 直接报错，不回退到第一张；
 *  - 显式 asset_slots 映射可写成 owner 或 owner@asset。 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import type { ShotSpec, ShotsFile } from "../project/types.mts";
import type { UploadSpec } from "../task/plans.mts";
import { loadGraphFile } from "../workflow/load.mts";
import { loadCharacters, loadScenes, loadVoices } from "./store.mts";
import { isLfsPointerFile } from "./assets.mts";
import type {
    RunAssetRecord,
    StoryAsset,
    StoryCharacter,
    StoryForm,
    StoryOwnerKind,
    WorkflowAssetSlot,
    WorkflowAssetsFile,
} from "./types.mts";

/**
 * 工作流资产槽位文件路径。
 */
export function workflowAssetsPath(workflowAbs: string): string {
    return workflowAbs.replace(/\.json$/i, ".assets.json");
}

/**
 * 解析后的槽位资产。
 */
export interface ResolvedSlotAsset {
    /**
     * 槽位。
     */
    slot: WorkflowAssetSlot;
    /**
     * 资产记录。
     */
    asset: StoryAsset;
    /**
     * owner 引用。
     */
    owner: string;
}

/**
 * 解析结果。
 */
export interface ResolvedWorkflowAssets {
    /**
     * 待上传文件。
     */
    uploads: UploadSpec[];
    /**
     * run 记录。
     */
    records: RunAssetRecord[];
}

/**
 * 读取工作流资产槽位文件；不存在返回 null。
 */
export function loadWorkflowAssets(workflowAbs: string): WorkflowAssetsFile | null {
    // 槽位文件
    const file = workflowAssetsPath(workflowAbs);
    if (!existsSync(file)) return null;
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `${file} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
        });
    }
    return parseWorkflowAssets(raw, file);
}

/**
 * 解析并校验槽位文件结构。
 */
export function parseWorkflowAssets(raw: unknown, label: string): WorkflowAssetsFile {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new DaoyanCliError({ code: "story_invalid", message: `${label} 必须是 JSON 对象` });
    }
    // 宽松视图
    const record = raw as Record<string, unknown>;
    if (record.version !== 1) {
        throw new DaoyanCliError({ code: "story_invalid", message: `${label} version 必须为 1` });
    }
    if (!Array.isArray(record.slots)) {
        throw new DaoyanCliError({ code: "story_invalid", message: `${label} 缺少 slots 数组` });
    }
    // 已见 slot
    const seen = new Set<string>();
    // 槽位
    const slots: WorkflowAssetSlot[] = [];
    for (const item of record.slots) {
        if (typeof item !== "object" || item === null || Array.isArray(item)) {
            throw new DaoyanCliError({ code: "story_invalid", message: `${label} 的 slot 必须是对象` });
        }
        // 当前槽位
        const slot = item as Record<string, unknown>;
        // 名称
        const name = typeof slot.name === "string" ? slot.name.trim() : "";
        if (name === "") throw new DaoyanCliError({ code: "story_invalid", message: `${label} 的 slot.name 为空` });
        if (seen.has(name)) {
            throw new DaoyanCliError({ code: "story_invalid", message: `${label} 的 slot 名重复：${name}` });
        }
        seen.add(name);
        // 类型
        const kind = slot.kind;
        if (kind !== "character" && kind !== "scene" && kind !== "voice") {
            throw new DaoyanCliError({ code: "story_invalid", message: `${label} 的 slot ${name} kind 非法` });
        }
        // 资产
        const asset = typeof slot.asset === "string" ? slot.asset.trim() : "";
        if (asset === "") {
            throw new DaoyanCliError({ code: "story_invalid", message: `${label} 的 slot ${name} 缺少 asset` });
        }
        // 目标
        const target = typeof slot.target === "string" ? slot.target.trim() : "";
        if (target === "" || !target.includes(".")) {
            throw new DaoyanCliError({
                code: "story_invalid",
                message: `${label} 的 slot ${name} target 必须是 nodeId.input`,
            });
        }
        if (slot.required !== undefined && typeof slot.required !== "boolean") {
            throw new DaoyanCliError({
                code: "story_invalid",
                message: `${label} 的 slot ${name} required 必须是 boolean`,
            });
        }
        slots.push({
            name,
            kind,
            asset,
            target,
            ...(slot.required !== undefined ? { required: slot.required } : {}),
        });
    }
    return { version: 1, slots };
}

/**
 * 拆分目标节点输入。
 */
function splitTarget(target: string): { node: string; input: string } {
    // 第一个点
    const dot = target.indexOf(".");
    return { node: target.slice(0, dot), input: target.slice(dot + 1) };
}

/**
 * 文件扩展名。
 */
function extOf(path: string): string {
    // 文件名
    const name = basename(path);
    // 最后一个点
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot) : "";
}

/**
 * 解析角色引用。
 */
function parseCastRef(value: unknown): { id: string; form: string | null } | null {
    if (typeof value === "string") {
        // 斜杠
        const slash = value.indexOf("/");
        if (slash > 0) return { id: value.slice(0, slash), form: value.slice(slash + 1) };
        return { id: value, form: null };
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    // 对象视图
    const record = value as Record<string, unknown>;
    // 标识
    const id = typeof record.id === "string" && record.id.trim() !== "" ? record.id.trim() : null;
    if (id === null) return null;
    // 形态
    const form = typeof record.form === "string" && record.form.trim() !== "" ? record.form.trim() : null;
    return { id, form };
}

/**
 * 解析场景引用。
 */
function parseSceneRef(value: unknown): string | null {
    if (typeof value === "string") return value.trim() === "" ? null : value.trim();
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    // 对象视图
    const record = value as Record<string, unknown>;
    return typeof record.id === "string" && record.id.trim() !== "" ? record.id.trim() : null;
}

/**
 * 解析映射值 owner@asset。
 */
function parseSlotMapping(value: string): { owner: string; asset: string | null } {
    // 最后一个 @
    const at = value.lastIndexOf("@");
    if (at > 0 && at < value.length - 1) {
        return { owner: value.slice(0, at), asset: value.slice(at + 1) };
    }
    return { owner: value, asset: null };
}

/**
 * 选择 owner 的资产。
 */
function selectAsset(
    assets: StoryAsset[],
    referenceAsset: string | null | undefined,
    selector: string,
    label: string,
): StoryAsset {
    // 主参考
    if (selector === "reference") {
        if (referenceAsset === undefined || referenceAsset === null || referenceAsset === "") {
            throw new DaoyanCliError({
                code: "story_gate_failed",
                message: `${label} 没有显式 reference_asset`,
                details: { blockers: [{ code: "missing_reference", message: `${label} 没有显式主参考` }] },
            });
        }
        // 资产
        const asset = assets.find((a) => a.id === referenceAsset);
        if (asset === undefined) {
            throw new DaoyanCliError({
                code: "asset_not_found",
                message: `${label} 的 reference_asset 指向不存在的资产：${referenceAsset}`,
            });
        }
        return asset;
    }
    // 具体资产
    const asset = assets.find((a) => a.id === selector);
    if (asset === undefined) {
        throw new DaoyanCliError({
            code: "asset_not_found",
            message: `${label} 没有资产 ${selector}`,
        });
    }
    return asset;
}

/**
 * 检查资产文件可用。
 */
function ensureAssetFile(root: string, asset: StoryAsset, label: string): string {
    // 绝对路径
    const abs = join(root, asset.path);
    if (!existsSync(abs)) {
        throw new DaoyanCliError({
            code: "asset_not_found",
            message: `${label} 的资产文件不存在：${asset.path}`,
            hint: "git lfs pull 或重新入库。",
        });
    }
    if (isLfsPointerFile(abs)) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `${label} 的资产仍是 Git LFS pointer：${asset.path}`,
            hint: "先运行 git lfs pull。",
        });
    }
    return abs;
}

/**
 * 角色槽位解析。
 */
function resolveCharacterAsset(
    root: string,
    slot: WorkflowAssetSlot,
    owner: string,
    explicitAsset: string | null,
    characters: ReturnType<typeof loadCharacters>,
    shot: ShotSpec,
): ResolvedSlotAsset {
    // 角色 / 形态
    const parsed = parseCastRef(owner);
    if (parsed === null) {
        throw new DaoyanCliError({ code: "story_invalid", message: `槽位 ${slot.name} 的 owner 非法：${owner}` });
    }
    // 角色
    const character = characters.characters.find((c) => c.id === parsed.id);
    if (character === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `槽位 ${slot.name} 的角色不存在：${parsed.id}` });
    }
    // 形态
    const formId = parsed.form ?? character.default_form;
    // 形态
    const form = character.forms.find((f) => f.id === formId);
    if (form === undefined) {
        throw new DaoyanCliError({
            code: "asset_not_found",
            message: `槽位 ${slot.name} 的形态不存在：${parsed.id}/${formId}`,
        });
    }
    // 选择
    const selector = explicitAsset ?? slot.asset;
    // 资产
    const asset = selectAsset(form.assets, form.reference_asset, selector, `角色 ${parsed.id}/${formId}`);
    return { slot, asset, owner: `${parsed.id}/${formId}` };
}

/**
 * 场景槽位解析。
 */
function resolveSceneAsset(root: string, slot: WorkflowAssetSlot, shot: ShotSpec): ResolvedSlotAsset {
    // 场景 id
    const sceneId = parseSceneRef(shot.scene);
    if (sceneId === null) {
        throw new DaoyanCliError({ code: "story_gate_failed", message: "镜头缺少场景，无法解析场景资产槽位" });
    }
    // 场景
    const scenes = loadScenes(root);
    // 场景
    const scene = scenes.scenes.find((s) => s.id === sceneId);
    if (scene === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `场景不存在：${sceneId}` });
    }
    // 明确场景资产
    const explicit = (shot as unknown as Record<string, unknown>).scene_asset;
    // 选择器
    const selector = typeof explicit === "string" && explicit !== "" ? explicit : slot.asset;
    // 资产
    const asset = selectAsset(scene.assets, scene.reference_asset, selector, `场景 ${sceneId}`);
    return { slot, asset, owner: sceneId };
}

/**
 * 镜头台词中出现的音色（去重、保持顺序）。
 */
function dialogueVoices(root: string, shot: ShotSpec): string[] {
    // 角色
    const characters = loadCharacters(root);
    // 结果
    const out: string[] = [];
    for (const line of shot.dialogue ?? []) {
        // 音色
        let voice = line.voice;
        if (voice === undefined || voice === "") {
            // 角色
            const character = characters.characters.find((c) => c.id === line.character);
            // 音色列表
            const voices = character?.voice_ids ?? [];
            if (voices.length !== 1) continue;
            voice = voices[0];
        }
        if (voice !== undefined && voice !== "" && !out.includes(voice)) out.push(voice);
    }
    return out;
}

/**
 * 音色槽位解析。
 */
function resolveVoiceAsset(
    root: string,
    slot: WorkflowAssetSlot,
    owner: string,
    explicitAsset: string | null,
): ResolvedSlotAsset {
    // 音色
    const voices = loadVoices(root);
    // 音色
    const voice = voices.voices.find((v) => v.id === owner);
    if (voice === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `槽位 ${slot.name} 的音色不存在：${owner}` });
    }
    // 选择
    const selector = explicitAsset ?? slot.asset;
    // 资产
    const asset = selectAsset(voice.assets, voice.reference_asset, selector, `音色 ${owner}`);
    return { slot, asset, owner };
}

/**
 * 解析一个镜头的资产槽位。
 */
export function resolveWorkflowAssets(opts: {
    root: string;
    shot: ShotSpec;
    workflowAbs: string;
}): ResolvedWorkflowAssets {
    // 槽位文件
    const file = loadWorkflowAssets(opts.workflowAbs);
    if (file === null) return { uploads: [], records: [] };
    // 图（用于校验目标节点）
    const loaded = loadGraphFile(opts.workflowAbs, opts.workflowAbs);
    // 目标节点检查
    for (const slot of file.slots) {
        // 节点 id
        const node = slot.target.slice(0, slot.target.indexOf("."));
        if (loaded.graph[node] === undefined) {
            throw new DaoyanCliError({
                code: "story_gate_failed",
                message: `资产槽位 ${slot.name} 指向不存在的节点 ${node}`,
                details: { blockers: [{ code: "workflow_unresolved", message: `槽位 ${slot.name} 节点不存在` }] },
            });
        }
    }
    // 全局设定
    const characters = loadCharacters(opts.root);
    // 角色槽位按 cast 顺序取
    let characterIndex = 0;
    // 音色槽位按台词顺序取
    const voices = dialogueVoices(opts.root, opts.shot);
    // 音色序号
    let voiceIndex = 0;
    // 结果
    const uploads: UploadSpec[] = [];
    // 资产记录
    const records: RunAssetRecord[] = [];
    for (const slot of file.slots) {
        // 显式映射
        const mapping = opts.shot.asset_slots?.[slot.name];
        // 解析结果
        let resolved: ResolvedSlotAsset | null = null;
        if (slot.kind === "character") {
            // 角色 owner
            let owner: string | null = null;
            // 显式资产
            let explicitAsset: string | null = null;
            if (mapping !== undefined && mapping !== "") {
                // 解析结果
                const parsed = parseSlotMapping(mapping);
                owner = parsed.owner;
                explicitAsset = parsed.asset;
            } else {
                // 下一个 cast
                const cast = opts.shot.characters ?? [];
                // 引用
                const ref = cast[characterIndex];
                characterIndex++;
                // 解析结果
                const parsed = castRefOf(ref);
                if (parsed !== null) {
                    // 角色 / 形态
                    const character = characters.characters.find((c) => c.id === parsed.id);
                    owner = `${parsed.id}/${parsed.form ?? character?.default_form ?? ""}`;
                }
            }
            if (owner === null || owner === "") {
                if (slot.required === false) continue;
                throw new DaoyanCliError({
                    code: "story_gate_failed",
                    message: `槽位 ${slot.name} 没有可用的角色`,
                });
            }
            resolved = resolveCharacterAsset(opts.root, slot, owner, explicitAsset, characters, opts.shot);
        } else if (slot.kind === "scene") {
            resolved = resolveSceneAsset(opts.root, slot, opts.shot);
        } else {
            // 音色 owner
            let owner: string | null = null;
            // 显式资产
            let explicitAsset: string | null = null;
            if (mapping !== undefined && mapping !== "") {
                // 解析结果
                const parsed = parseSlotMapping(mapping);
                owner = parsed.owner;
                explicitAsset = parsed.asset;
            } else {
                owner = voices[voiceIndex] ?? null;
                voiceIndex++;
            }
            if (owner === null || owner === "") {
                if (slot.required === false) continue;
                throw new DaoyanCliError({
                    code: "story_gate_failed",
                    message: `槽位 ${slot.name} 没有可用的音色`,
                });
            }
            resolved = resolveVoiceAsset(opts.root, slot, owner, explicitAsset);
        }
        // 文件
        const abs = ensureAssetFile(opts.root, resolved.asset, `槽位 ${slot.name}`);
        // 记录
        records.push({
            slot: slot.name,
            kind: slot.kind,
            owner: resolved.owner,
            asset_id: resolved.asset.id,
            path: resolved.asset.path,
            sha256: resolved.asset.sha256,
            bytes: resolved.asset.bytes,
        });
        // 上传
        uploads.push({
            logical: `asset:${slot.name}`,
            source: abs,
            desiredName: `${slot.name}_${resolved.asset.id}${extOf(resolved.asset.path)}`,
            target: splitTarget(slot.target),
        });
    }
    return { uploads, records };
}

/**
 * 校验槽位目标节点存在于图中。
 */
export function validateWorkflowAssetsGraph(
    file: WorkflowAssetsFile,
    graph: Record<string, unknown>,
    label: string,
): Array<{ path: string; code: string; severity: "error" | "warning"; message: string; hint: string }> {
    // 问题
    const issues: Array<{ path: string; code: string; severity: "error" | "warning"; message: string; hint: string }> =
        [];
    for (const slot of file.slots) {
        // 目标节点
        const node = slot.target.slice(0, slot.target.indexOf("."));
        if (graph[node] === undefined) {
            issues.push({
                path: `${label}:${slot.name}`,
                code: "asset_slot_node_missing",
                severity: "error",
                message: `资产槽位 ${slot.name} 指向不存在的节点 ${node}`,
                hint: "修正 target 或先添加节点。",
            });
        }
    }
    return issues;
}

/**
 * 兼容：角色引用解析（与 validate 的规则保持一致）。
 */
function castRefOf(value: unknown): { id: string; form: string | null } | null {
    return parseCastRef(value);
}
