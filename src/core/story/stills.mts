/** 图片单元存储 —— stills/stills.json、图片库与定稿台账的确定性读写。
 *  - 一个 still 是图片主题，t2i / i2i / upscale / inpaint / prompt 都是它的操作；
 *  - 共享记录只存项目内相对路径与描述符，不存绝对路径；
 *  - 定稿台账与视频 takes 同语义：只记决定，候选从 runs/ 实时推导。 */
import { existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, nowIso, readJsonIfExists, sha256, slugify, writeJsonAtomic } from "../../shared/fs.mts";
import {
    STILLS_DIR,
    STILLS_FILE,
    STILLS_REFS_DIR,
    STILL_TAKES_FILE,
    type ImageOp,
    type MachineConfig,
    type ProjectConfig,
} from "../project/types.mts";
import { resolveWorkflowRef } from "../project/config.mts";
import { readRun, runOutputAbs } from "../run/store.mts";
import { bindingsPathOf, loadBindings } from "../workflow/load.mts";
import { detectAssetType, isLfsPointerFile } from "./assets.mts";
import { STORY_ID_RE } from "./paths.mts";
import { loadCharacters, loadScenes } from "./store.mts";
import type {
    PromptRevision,
    StillRefRole,
    StillReference,
    StillSpec,
    StillTakeRecord,
    StillTakesFile,
    StoryAsset,
    StillsFile,
} from "./types.mts";
import type { StoryOwnerKind as StillOwnerKind } from "./types.mts";

// 单张图片库文件大小上限（200 MiB）
const MAX_STILL_REF_BYTES = 200 * 1024 * 1024;
// 每个 still 保留的提示词修订条数
const PROMPT_REVISION_LIMIT = 10;
// 图片操作全集（help / ops 展示顺序）
export const IMAGE_OPS: readonly ImageOp[] = ["t2i", "i2i", "upscale", "inpaint", "prompt"];
// 出图操作需要的 bindings 逻辑输入
const OP_REQUIRED_BINDINGS: Record<Exclude<ImageOp, "prompt">, readonly string[]> = {
    t2i: ["prompt", "seed"],
    i2i: ["prompt", "seed", "source"],
    upscale: ["source"],
    inpaint: ["source", "mask"],
};

/**
 * 图片单元注册表绝对路径。
 */
export function stillsPath(root: string): string {
    return join(root, STILLS_FILE);
}

/**
 * 图片定稿台账绝对路径。
 */
export function stillTakesPath(root: string): string {
    return join(root, STILL_TAKES_FILE);
}

/**
 * 图片库根目录绝对路径。
 */
export function stillsRefsDir(root: string): string {
    return join(root, STILLS_REFS_DIR);
}

/**
 * 空图片注册表。
 */
export function emptyStillsFile(): StillsFile {
    return { version: 1, updated_at: nowIso(), sets: [], refs: [], stills: [] };
}

/**
 * 空图片定稿台账。
 */
export function emptyStillTakes(): StillTakesFile {
    return { version: 1, updated_at: nowIso(), stills: [] };
}

/**
 * 读取图片注册表；缺失返回空表。
 */
export function loadStills(root: string): StillsFile {
    // 磁盘记录
    const doc = readJsonIfExists<StillsFile>(stillsPath(root));
    if (doc === null) return emptyStillsFile();
    return {
        version: 1,
        updated_at: typeof doc.updated_at === "string" ? doc.updated_at : nowIso(),
        ...(typeof doc.workflow === "string" && doc.workflow !== "" ? { workflow: doc.workflow } : {}),
        sets: Array.isArray(doc.sets) ? doc.sets : [],
        refs: Array.isArray(doc.refs) ? doc.refs : [],
        stills: Array.isArray(doc.stills) ? doc.stills : [],
    };
}

/**
 * 写入图片注册表（更新 updated_at）。
 */
export function saveStills(root: string, doc: StillsFile): void {
    writeJsonAtomic(stillsPath(root), { ...doc, version: 1, updated_at: nowIso() });
}

/**
 * 读取图片定稿台账；缺失返回空表。
 */
export function loadStillTakes(root: string): StillTakesFile {
    // 磁盘记录
    const doc = readJsonIfExists<StillTakesFile>(stillTakesPath(root));
    if (doc === null) return emptyStillTakes();
    return {
        version: 1,
        updated_at: typeof doc.updated_at === "string" ? doc.updated_at : nowIso(),
        stills: Array.isArray(doc.stills) ? doc.stills : [],
    };
}

/**
 * 写入图片定稿台账（更新 updated_at）。
 */
export function saveStillTakes(root: string, doc: StillTakesFile): void {
    writeJsonAtomic(stillTakesPath(root), { ...doc, version: 1, updated_at: nowIso() });
}

/**
 * 初始化图片目录与空文件（幂等）。
 */
export function initStills(root: string): { created: string[] } {
    // 已创建文件
    const created: string[] = [];
    for (const dir of [STILLS_DIR, STILLS_REFS_DIR]) ensureDir(join(root, dir));
    if (!existsSync(stillsPath(root))) {
        writeJsonAtomic(stillsPath(root), emptyStillsFile());
        created.push(STILLS_FILE);
    }
    if (!existsSync(stillTakesPath(root))) {
        writeJsonAtomic(stillTakesPath(root), emptyStillTakes());
        created.push(STILL_TAKES_FILE);
    }
    return { created };
}

/**
 * 校验 still / 图片集 id。
 */
export function assertStillId(id: string, label = "图片单元 id"): void {
    if (!STORY_ID_RE.test(id)) {
        throw new DaoyanCliError({
            code: "image_invalid",
            message: `${label}非法：${id}`,
            hint: "使用小写字母 / 数字 / -，例如 lin-base-front。",
        });
    }
}

/**
 * 图片 owner 解析结果。
 */
export interface ParsedStillOwner {
    /**
     * owner 类型（图片只支持角色 / 场景）。
     */
    kind: StillOwnerKind;
    /**
     * owner id。
     */
    id: string;
    /**
     * 角色形态 id。
     */
    form: string | null;
}

/**
 * 解析图片 owner（character:<id> / scene:<id>）。
 */
export function parseStillOwner(owner: string, form?: string | null): ParsedStillOwner {
    // 分隔符
    const colon = owner.indexOf(":");
    if (colon <= 0 || colon === owner.length - 1) {
        throw new DaoyanCliError({
            code: "usage",
            message: `--owner 需要 character:<id> 或 scene:<id>（收到 ${owner}）`,
            exit: 2,
        });
    }
    // owner 类型
    const kind = owner.slice(0, colon);
    // owner id
    const id = owner.slice(colon + 1);
    if (kind !== "character" && kind !== "scene") {
        throw new DaoyanCliError({
            code: "usage",
            message: `图片 owner 只支持 character / scene（收到 ${kind}）`,
            exit: 2,
        });
    }
    if (!STORY_ID_RE.test(id)) {
        throw new DaoyanCliError({ code: "image_invalid", message: `owner id 非法：${id}` });
    }
    if (kind === "character") {
        if (form === undefined || form === null || form === "") {
            throw new DaoyanCliError({ code: "usage", message: "角色图片需要 --form <form-id>", exit: 2 });
        }
        if (!STORY_ID_RE.test(form)) {
            throw new DaoyanCliError({ code: "image_invalid", message: `形态 id 非法：${form}` });
        }
        return { kind: "character", id, form };
    }
    if (form !== undefined && form !== null && form !== "") {
        throw new DaoyanCliError({ code: "usage", message: "场景图片不接受 --form", exit: 2 });
    }
    return { kind: "scene", id, form: null };
}

/**
 * 校验 owner 引用的角色 / 场景确实存在。
 */
function assertOwnerExists(root: string, owner: ParsedStillOwner): void {
    if (owner.kind === "scene") {
        const scenes = loadScenes(root);
        if (!scenes.scenes.some((scene) => scene.id === owner.id)) {
            throw new DaoyanCliError({
                code: "image_invalid",
                message: `未找到场景 ${owner.id}`,
                hint: "先在 story/scenes.json 中登记该场景。",
            });
        }
        return;
    }
    const characters = loadCharacters(root);
    // 目标角色
    const character = characters.characters.find((item) => item.id === owner.id);
    if (character === undefined) {
        throw new DaoyanCliError({
            code: "image_invalid",
            message: `未找到角色 ${owner.id}`,
            hint: "先在 story/characters.json 中登记该角色。",
        });
    }
    if (!character.forms.some((item) => item.id === owner.form)) {
        throw new DaoyanCliError({
            code: "image_invalid",
            message: `角色 ${owner.id} 没有形态 ${owner.form ?? ""}`,
        });
    }
}

/**
 * 确保图片集存在（不存在时按 id 建一个）。
 */
function ensureSet(doc: StillsFile, id: string, title?: string): void {
    assertStillId(id, "图片集 id");
    if (doc.sets.some((item) => item.id === id)) return;
    doc.sets.push({ id, title: title !== undefined && title !== "" ? title : id });
}

/**
 * 图片输入描述符解析结果。
 */
export type ImageSourceKind = "asset" | "ref" | "still" | "run";

/**
 * 解析后的图片输入描述符。
 */
export interface ParsedImageSource {
    /**
     * 原始文本。
     */
    raw: string;
    /**
     * 描述符类型。
     */
    kind: ImageSourceKind;
    /**
     * 资产 owner 类型。
     */
    owner_kind?: StillOwnerKind;
    /**
     * 资产 owner id。
     */
    owner_id?: string;
    /**
     * 角色形态 id。
     */
    form?: string | null;
    /**
     * 资产 id（asset 描述符可选）。
     */
    asset_id?: string | null;
    /**
     * 图片库条目 id。
     */
    ref_id?: string;
    /**
     * 图片单元 id。
     */
    still_id?: string;
    /**
     * run id。
     */
    run_id?: string;
    /**
     * run 产物文件名。
     */
    output?: string;
}

/**
 * 解析图片输入描述符。
 * 支持 asset:<owner>[@asset] / ref:<id> / still:<id> / run:<run>/<output>。
 */
export function parseImageSource(raw: string): ParsedImageSource {
    // 归一化文本
    const value = raw.trim();
    const colon = value.indexOf(":");
    if (colon <= 0) {
        throw new DaoyanCliError({
            code: "image_source_invalid",
            message: `图片输入描述符非法：${raw}`,
            hint: "使用 asset:<owner>@<asset> / ref:<id> / still:<id> / run:<run>/<output>。",
        });
    }
    // 描述符类型
    const kind = value.slice(0, colon);
    // 描述符主体
    const body = value.slice(colon + 1);
    if (body === "") {
        throw new DaoyanCliError({ code: "image_source_invalid", message: `图片输入描述符缺少主体：${raw}` });
    }
    if (kind === "ref") return { raw, kind: "ref", ref_id: assertDescriptorId(body, raw) };
    if (kind === "still") return { raw, kind: "still", still_id: assertDescriptorId(body, raw) };
    if (kind === "run") {
        // run / 产物分隔符
        const slash = body.indexOf("/");
        if (slash <= 0 || slash === body.length - 1) {
            throw new DaoyanCliError({
                code: "image_source_invalid",
                message: `run 描述符需要 <run_id>/<output>：${raw}`,
            });
        }
        return { raw, kind: "run", run_id: body.slice(0, slash), output: body.slice(slash + 1) };
    }
    if (kind === "asset") {
        // 资产 id 分隔符
        const at = body.lastIndexOf("@");
        // owner 文本
        const ownerText = at > 0 ? body.slice(0, at) : body;
        // 资产 id
        const assetId = at > 0 ? body.slice(at + 1) : null;
        // owner 冒号
        const ownerColon = ownerText.indexOf(":");
        if (ownerColon <= 0 || ownerColon === ownerText.length - 1) {
            throw new DaoyanCliError({
                code: "image_source_invalid",
                message: `asset 描述符需要 <character|scene>:<id>：${raw}`,
            });
        }
        // owner 类型
        const ownerKind = ownerText.slice(0, ownerColon);
        if (ownerKind !== "character" && ownerKind !== "scene") {
            throw new DaoyanCliError({
                code: "image_source_invalid",
                message: `asset owner 只支持 character / scene：${raw}`,
            });
        }
        // owner id / 形态
        const ownerBody = ownerText.slice(ownerColon + 1);
        const slash = ownerBody.indexOf("/");
        // owner id
        const ownerId = slash > 0 ? ownerBody.slice(0, slash) : ownerBody;
        if (!STORY_ID_RE.test(ownerId)) {
            throw new DaoyanCliError({ code: "image_source_invalid", message: `asset owner id 非法：${raw}` });
        }
        // 形态 id
        const form = slash > 0 ? ownerBody.slice(slash + 1) : null;
        if (form !== null && !STORY_ID_RE.test(form)) {
            throw new DaoyanCliError({ code: "image_source_invalid", message: `asset 形态 id 非法：${raw}` });
        }
        if (ownerKind === "character" && (form === null || form === "")) {
            throw new DaoyanCliError({ code: "image_source_invalid", message: `角色 asset 需要 <id>/<form>：${raw}` });
        }
        if (assetId !== null && !STORY_ID_RE.test(assetId)) {
            throw new DaoyanCliError({ code: "image_source_invalid", message: `asset id 非法：${raw}` });
        }
        return {
            raw,
            kind: "asset",
            owner_kind: ownerKind,
            owner_id: ownerId,
            form,
            asset_id: assetId,
        };
    }
    throw new DaoyanCliError({
        code: "image_source_invalid",
        message: `未知图片输入类型 ${kind}`,
        hint: "支持 asset / ref / still / run。",
    });
}

/**
 * 描述符内的 id 校验。
 */
function assertDescriptorId(value: string, raw: string): string {
    if (!STORY_ID_RE.test(value)) {
        throw new DaoyanCliError({ code: "image_source_invalid", message: `描述符 id 非法：${raw}` });
    }
    return value;
}

/**
 * 解析后的图片输入详情。
 */
export interface ResolvedImageSource {
    /**
     * 原始描述符。
     */
    raw: string;
    /**
     * 描述符类型。
     */
    kind: ImageSourceKind;
    /**
     * 展示名。
     */
    label: string;
    /**
     * 文件是否存在。
     */
    present: boolean;
    /**
     * 解析错误（present=false 时）。
     */
    error: string | null;
    /**
     * 资产 / 图片库条目的项目内相对路径。
     */
    relative_path: string | null;
    /**
     * run id（run / still）。
     */
    run_id: string | null;
    /**
     * run 产物名（run / still）。
     */
    output: string | null;
    /**
     * MIME 类型。
     */
    content_type: string | null;
    /**
     * 内容 sha256。
     */
    sha256: string | null;
    /**
     * 字节数。
     */
    bytes: number | null;
    /**
     * 图片宽度。
     */
    width: number | null;
    /**
     * 图片高度。
     */
    height: number | null;
}

/**
 * 解析资产 owner 对应的资产。
 */
function resolveOwnerAsset(
    root: string,
    parsed: ParsedImageSource,
): { label: string; asset: StoryAsset | null; error: string | null } {
    if (parsed.owner_kind === "scene") {
        // 场景
        const scene = loadScenes(root).scenes.find((item) => item.id === parsed.owner_id);
        if (scene === undefined) return { label: `scene:${parsed.owner_id ?? ""}`, asset: null, error: "场景不存在" };
        // 资产 id
        const assetId = parsed.asset_id ?? scene.reference_asset ?? null;
        if (assetId === null) return { label: scene.name, asset: null, error: "场景未指定参考资产" };
        // 命中资产
        const asset = scene.assets.find((item) => item.id === assetId);
        return {
            label: `${scene.name}@${assetId}`,
            asset: asset ?? null,
            error: asset === undefined ? `未找到场景资产 ${assetId}` : null,
        };
    }
    // 角色
    const character = loadCharacters(root).characters.find((item) => item.id === parsed.owner_id);
    if (character === undefined) {
        return { label: `character:${parsed.owner_id ?? ""}`, asset: null, error: "角色不存在" };
    }
    // 形态 id
    const formId = parsed.form ?? character.default_form;
    // 形态
    const form = character.forms.find((item) => item.id === formId);
    if (form === undefined) return { label: `${character.name}/${formId}`, asset: null, error: "形态不存在" };
    // 资产 id
    const assetId = parsed.asset_id ?? form.reference_asset ?? null;
    if (assetId === null) return { label: `${character.name}/${formId}`, asset: null, error: "形态未指定参考资产" };
    // 命中资产
    const asset = form.assets.find((item) => item.id === assetId);
    return {
        label: `${character.name}/${formId}@${assetId}`,
        asset: asset ?? null,
        error: asset === undefined ? `未找到形态资产 ${assetId}` : null,
    };
}

/**
 * 解析图片输入描述符并检查文件是否存在。
 */
export function resolveImageSource(root: string, raw: string): ResolvedImageSource {
    // 解析结果
    const parsed = parseImageSource(raw);
    // 基础结果
    const base: ResolvedImageSource = {
        raw,
        kind: parsed.kind,
        label: raw,
        present: false,
        error: null,
        relative_path: null,
        run_id: null,
        output: null,
        content_type: null,
        sha256: null,
        bytes: null,
        width: null,
        height: null,
    };
    if (parsed.kind === "asset") {
        // 资产
        const found = resolveOwnerAsset(root, parsed);
        if (found.asset === null) return { ...base, label: found.label, error: found.error };
        // 绝对路径
        const abs = join(root, found.asset.path);
        // 文件状态
        const stat = existsSync(abs) ? statSync(abs) : null;
        return {
            ...base,
            label: found.label,
            present: stat !== null,
            error: stat === null ? "资产文件不在工作区" : null,
            relative_path: found.asset.path,
            content_type: found.asset.content_type,
            sha256: found.asset.sha256,
            bytes: stat?.size ?? found.asset.bytes,
            width: found.asset.width ?? null,
            height: found.asset.height ?? null,
        };
    }
    if (parsed.kind === "ref") {
        // 图片库
        const ref = loadStills(root).refs.find((item) => item.id === parsed.ref_id);
        if (ref === undefined) return { ...base, label: `ref:${parsed.ref_id ?? ""}`, error: "图片库条目不存在" };
        // 绝对路径
        const abs = join(root, ref.path);
        // 文件状态
        const stat = existsSync(abs) ? statSync(abs) : null;
        return {
            ...base,
            label: ref.title ?? ref.id,
            present: stat !== null,
            error: stat === null ? "图片库文件不在工作区" : null,
            relative_path: ref.path,
            content_type: ref.content_type,
            sha256: ref.sha256,
            bytes: stat?.size ?? ref.bytes,
            width: ref.width ?? null,
            height: ref.height ?? null,
        };
    }
    if (parsed.kind === "still") {
        // 图片单元
        const still = loadStills(root).stills.find((item) => item.id === parsed.still_id);
        if (still === undefined) return { ...base, label: `still:${parsed.still_id ?? ""}`, error: "图片单元不存在" };
        // 定稿记录
        const record = loadStillTakes(root).stills.find((item) => item.still_id === parsed.still_id);
        if (record === undefined || record.finalized === null) {
            return { ...base, label: still.title ?? still.id, error: "图片尚未定稿" };
        }
        return {
            ...base,
            label: still.title ?? still.id,
            run_id: record.finalized.run_id,
            output: record.finalized.output,
            sha256: record.finalized.sha256,
            present: stillTakePresent(root, record.finalized.run_id, record.finalized.output),
        };
    }
    // run 产物
    try {
        const run = readRun(root, parsed.run_id ?? "");
        const output = run?.outputs.find((item) => item.name === parsed.output);
        if (run === null || output === undefined) {
            return { ...base, label: raw, error: "run 产物不存在" };
        }
        return {
            ...base,
            label: `${run.run_id}/${output.name}`,
            run_id: run.run_id,
            output: output.name,
            sha256: output.sha256,
            bytes: output.bytes,
            present: existsSync(runOutputAbs(root, run, output)),
        };
    } catch (e) {
        return { ...base, label: raw, error: e instanceof Error ? e.message : "run 读取失败" };
    }
}

/**
 * 图片输入的实际文件路径（仅计划/执行期使用，不写入记录）。
 */
export function imageSourceAbsPath(root: string, resolved: ResolvedImageSource): string | null {
    if (!resolved.present) return null;
    if (resolved.relative_path !== null) return join(root, resolved.relative_path);
    if (resolved.run_id !== null && resolved.output !== null) {
        const run = readRun(root, resolved.run_id);
        if (run === null) return null;
        const output = run.outputs.find((item) => item.name === resolved.output);
        if (output === undefined) return null;
        return runOutputAbs(root, run, output);
    }
    return null;
}

/**
 * 判断 still 定稿产物是否在工作区。
 */
function stillTakePresent(root: string, runId: string, output: string): boolean {
    try {
        const run = readRun(root, runId);
        if (run === null) return false;
        const hit = run.outputs.find((item) => item.name === output);
        return hit !== undefined && existsSync(runOutputAbs(root, run, hit));
    } catch {
        return false;
    }
}

/**
 * 出图操作需要的 bindings 逻辑输入。
 */
export function requiredBindingsOf(op: ImageOp): readonly string[] {
    if (op === "prompt") return [];
    return OP_REQUIRED_BINDINGS[op];
}

/**
 * 图片操作就绪状态。
 */
export interface ImageOpStatus {
    /**
     * 操作。
     */
    op: ImageOp;
    /**
     * 是否在 project.json 中配置。
     */
    configured: boolean;
    /**
     * 配置的 workflow（prompt 操作可为空）。
     */
    workflow: string | null;
    /**
     * prompt 操作后端。
     */
    backend: string | null;
    /**
     * 是否具备执行条件。
     */
    ready: boolean;
    /**
     * 未就绪原因 / 提示。
     */
    issues: string[];
}

/**
 * 读取图片操作配置并检查就绪状态。
 */
export function imageOpsStatus(root: string, project: ProjectConfig, machine?: MachineConfig | null): ImageOpStatus[] {
    // 操作配置
    const ops = project.image?.ops ?? {};
    return IMAGE_OPS.map((op) => {
        // 当前配置
        const config = ops[op];
        // 未配置
        if (config === undefined) {
            return {
                op,
                configured: false,
                workflow: null,
                backend: null,
                ready: false,
                issues: [`未配置 project.image.ops.${op}`],
            };
        }
        if (op === "prompt") {
            // prompt 优化后端
            const backend = config.backend ?? "agent";
            const issues: string[] = [];
            if (
                backend === "llm" &&
                machine !== undefined &&
                machine !== null &&
                machine.prompt_optimizer === undefined
            ) {
                issues.push("本机未配置 prompt_optimizer");
            }
            return {
                op,
                configured: true,
                workflow: config.workflow ?? null,
                backend,
                ready: issues.length === 0,
                issues,
            };
        }
        // 出图操作
        const issues: string[] = [];
        if (config.workflow === undefined || config.workflow === "") {
            issues.push("缺少 workflow");
        }
        // workflow 状态
        let workflow: string | null = config.workflow ?? null;
        if (config.workflow !== undefined && config.workflow !== "") {
            try {
                const ref = resolveWorkflowRef(root, config.workflow);
                workflow = ref.rel;
                if (!existsSync(ref.abs)) {
                    issues.push(`workflow 不存在：${ref.rel}`);
                } else {
                    // bindings
                    const bindings = loadBindings(ref.abs);
                    if (bindings === null) {
                        issues.push(`缺少 bindings：${bindingsPathOf(ref.abs).slice(root.length + 1)}`);
                    } else {
                        const required = OP_REQUIRED_BINDINGS[op as Exclude<ImageOp, "prompt">];
                        for (const key of required) {
                            if (bindings[key] === undefined) issues.push(`bindings 缺少 "${key}"`);
                        }
                    }
                }
            } catch (e) {
                issues.push(e instanceof Error ? e.message : "workflow 解析失败");
            }
        }
        return { op, configured: true, workflow, backend: null, ready: issues.length === 0, issues };
    });
}

/**
 * 新建图片单元的输入。
 */
export interface StillInput {
    /**
     * 单元 id。
     */
    id: string;
    /**
     * 展示名。
     */
    title?: string;
    /**
     * 图片集 id。
     */
    set?: string | null;
    /**
     * 图片集标题（集合不存在时使用）。
     */
    setTitle?: string;
    /**
     * 归属。
     */
    owner?: string | null;
    /**
     * 角色形态。
     */
    form?: string | null;
    /**
     * 关联剧集。
     */
    episode_id?: string | null;
    /**
     * 关联镜号。
     */
    shot_id?: string | null;
    /**
     * 提示词。
     */
    prompt?: string;
    /**
     * 负向提示词。
     */
    negative?: string;
    /**
     * 种子。
     */
    seed?: number;
    /**
     * 宽度。
     */
    width?: number;
    /**
     * 高度。
     */
    height?: number;
    /**
     * workflow。
     */
    workflow?: string;
    /**
     * 输入图片描述符。
     */
    source?: string | null;
    /**
     * 遮罩描述符。
     */
    mask?: string | null;
    /**
     * 资产槽位。
     */
    asset_slots?: Record<string, string>;
    /**
     * 额外逻辑输入。
     */
    params?: Record<string, unknown>;
    /**
     * 备注。
     */
    notes?: string;
}

/**
 * 图片单元补丁（undefined = 不改）。
 */
export type StillPatch = Partial<Omit<StillInput, "id" | "setTitle">>;

/**
 * 校验数字字段。
 */
function assertSize(value: number | undefined, label: string): void {
    if (value === undefined) return;
    if (!Number.isInteger(value) || value <= 0) {
        throw new DaoyanCliError({ code: "image_invalid", message: `${label} 必须是正整数` });
    }
}

/**
 * 附加一条提示词修订。
 */
function appendPromptRevision(still: StillSpec, text: string, source: PromptRevision["source"]): void {
    // 现有修订
    const revisions = Array.isArray(still.prompt_revisions) ? still.prompt_revisions : [];
    // 上一条
    const last = revisions[revisions.length - 1];
    // 修订号
    const revision = (last?.revision ?? 0) + 1;
    still.prompt_revisions = [...revisions, { revision, text, source, at: nowIso() }].slice(-PROMPT_REVISION_LIMIT);
}

/**
 * 新建图片单元。
 */
export function addStill(root: string, input: StillInput, source: "ai" | "user" = "ai"): StillSpec {
    // 注册表
    const doc = loadStills(root);
    assertStillId(input.id);
    if (doc.stills.some((item) => item.id === input.id)) {
        throw new DaoyanCliError({ code: "image_invalid", message: `图片单元 ${input.id} 已存在` });
    }
    if (input.set !== undefined && input.set !== null && input.set !== "") {
        ensureSet(doc, input.set, input.setTitle);
    }
    // 归属
    let owner: string | null = null;
    let form: string | null = null;
    if (input.owner !== undefined && input.owner !== null && input.owner !== "") {
        const parsed = parseStillOwner(input.owner, input.form);
        assertOwnerExists(root, parsed);
        owner = `${parsed.kind}:${parsed.id}`;
        form = parsed.form;
    }
    assertSize(input.width, "width");
    assertSize(input.height, "height");
    if (input.seed !== undefined && (!Number.isInteger(input.seed) || input.seed < 0)) {
        throw new DaoyanCliError({ code: "image_invalid", message: "seed 必须是非负整数" });
    }
    if (input.source !== undefined && input.source !== null && input.source !== "") parseImageSource(input.source);
    if (input.mask !== undefined && input.mask !== null && input.mask !== "") parseImageSource(input.mask);
    // 新单元
    const still: StillSpec = {
        id: input.id,
        ...(input.title !== undefined && input.title !== "" ? { title: input.title } : {}),
        set: input.set ?? null,
        owner,
        form,
        episode_id: input.episode_id ?? null,
        shot_id: input.shot_id ?? null,
        ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
        ...(input.negative !== undefined ? { negative: input.negative } : {}),
        ...(input.seed !== undefined ? { seed: input.seed } : {}),
        ...(input.width !== undefined ? { width: input.width } : {}),
        ...(input.height !== undefined ? { height: input.height } : {}),
        ...(input.workflow !== undefined ? { workflow: input.workflow } : {}),
        source: input.source ?? null,
        mask: input.mask ?? null,
        ...(input.asset_slots !== undefined ? { asset_slots: input.asset_slots } : {}),
        ...(input.params !== undefined ? { params: input.params as StillSpec["params"] } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        prompt_revisions: [],
    };
    if (input.prompt !== undefined && input.prompt.trim() !== "") {
        appendPromptRevision(still, input.prompt, source === "ai" ? "agent" : "user");
    }
    doc.stills.push(still);
    saveStills(root, doc);
    return still;
}

/**
 * 更新图片单元（undefined 字段保持不变）。
 */
export function updateStill(
    root: string,
    id: string,
    patch: StillPatch,
    opts: { source: "ai" | "user"; baseUpdatedAt?: string },
): StillSpec {
    // 注册表
    const doc = loadStills(root);
    if (opts.baseUpdatedAt !== undefined && opts.baseUpdatedAt !== doc.updated_at) {
        throw new DaoyanCliError({
            code: "image_conflict",
            message: `图片注册表已更新（当前 ${doc.updated_at}，期望 ${opts.baseUpdatedAt}）`,
            details: { current: doc.updated_at, expected: opts.baseUpdatedAt },
        });
    }
    // 目标单元
    const still = doc.stills.find((item) => item.id === id);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
    }
    if (patch.set !== undefined) {
        if (patch.set === null || patch.set === "") {
            still.set = null;
        } else {
            ensureSet(doc, patch.set);
            still.set = patch.set;
        }
    }
    if (patch.owner !== undefined) {
        if (patch.owner === null || patch.owner === "") {
            still.owner = null;
            still.form = null;
        } else {
            const parsed = parseStillOwner(patch.owner, patch.form !== undefined ? patch.form : still.form);
            assertOwnerExists(root, parsed);
            still.owner = `${parsed.kind}:${parsed.id}`;
            still.form = parsed.form;
        }
    } else if (patch.form !== undefined && still.owner !== null && still.owner !== undefined) {
        const parsed = parseStillOwner(still.owner, patch.form);
        assertOwnerExists(root, parsed);
        still.form = parsed.form;
    }
    if (patch.episode_id !== undefined) still.episode_id = patch.episode_id;
    if (patch.shot_id !== undefined) still.shot_id = patch.shot_id;
    if (patch.seed !== undefined) {
        if (!Number.isInteger(patch.seed) || patch.seed < 0) {
            throw new DaoyanCliError({ code: "image_invalid", message: "seed 必须是非负整数" });
        }
        still.seed = patch.seed;
    }
    assertSize(patch.width, "width");
    assertSize(patch.height, "height");
    if (patch.width !== undefined) still.width = patch.width;
    if (patch.height !== undefined) still.height = patch.height;
    if (patch.negative !== undefined) still.negative = patch.negative;
    if (patch.workflow !== undefined) {
        if (patch.workflow === "") delete still.workflow;
        else still.workflow = patch.workflow;
    }
    if (patch.source !== undefined) {
        if (patch.source === null || patch.source === "") still.source = null;
        else {
            parseImageSource(patch.source);
            still.source = patch.source;
        }
    }
    if (patch.mask !== undefined) {
        if (patch.mask === null || patch.mask === "") still.mask = null;
        else {
            parseImageSource(patch.mask);
            still.mask = patch.mask;
        }
    }
    if (patch.asset_slots !== undefined) {
        still.asset_slots = patch.asset_slots;
    }
    if (patch.params !== undefined) still.params = patch.params as StillSpec["params"];
    if (patch.notes !== undefined) still.notes = patch.notes;
    if (patch.title !== undefined) {
        if (patch.title === "") delete still.title;
        else still.title = patch.title;
    }
    if (patch.prompt !== undefined) {
        if (patch.prompt !== (still.prompt ?? "")) {
            still.prompt = patch.prompt;
            appendPromptRevision(still, patch.prompt, opts.source === "ai" ? "agent" : "user");
        }
    }
    saveStills(root, doc);
    return still;
}

/**
 * 直接设置提示词并追加修订（LLM / 工作流来源）。
 */
export function setStillPrompt(
    root: string,
    id: string,
    text: string,
    source: PromptRevision["source"],
    runId?: string | null,
): StillSpec {
    // 注册表
    const doc = loadStills(root);
    // 目标单元
    const still = doc.stills.find((item) => item.id === id);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
    }
    still.prompt = text;
    appendPromptRevision(still, text, source);
    if (runId !== undefined && runId !== null && still.prompt_revisions !== undefined) {
        const last = still.prompt_revisions[still.prompt_revisions.length - 1];
        if (last !== undefined) last.run_id = runId;
    }
    saveStills(root, doc);
    return still;
}

/**
 * 删除图片单元。
 */
export function removeStill(root: string, id: string, force: boolean): StillSpec {
    // 注册表
    const doc = loadStills(root);
    // 目标单元
    const still = doc.stills.find((item) => item.id === id);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
    }
    // 被其他单元引用
    const dependents = doc.stills.filter(
        (item) => item.id !== id && (item.source === `still:${id}` || item.mask === `still:${id}`),
    );
    if (dependents.length > 0 && !force) {
        throw new DaoyanCliError({
            code: "image_invalid",
            message: `图片单元 ${id} 被其他单元引用：${dependents.map((item) => item.id).join(", ")}`,
            hint: "先改掉引用，或加 --force 强制删除。",
        });
    }
    doc.stills = doc.stills.filter((item) => item.id !== id);
    saveStills(root, doc);
    // 定稿台账
    const takes = loadStillTakes(root);
    const nextStills = takes.stills.filter((item) => item.still_id !== id);
    if (nextStills.length !== takes.stills.length) {
        saveStillTakes(root, { ...takes, stills: nextStills });
    }
    return still;
}

/**
 * 读取单张图片库条目。
 */
export function requireStillRef(root: string, id: string): StillReference {
    // 条目
    const ref = loadStills(root).refs.find((item) => item.id === id);
    if (ref === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片库条目 ${id}` });
    }
    return ref;
}

/**
 * 字节原子写。
 */
function writeBytesAtomic(file: string, bytes: Uint8Array): void {
    ensureDir(dirname(file));
    // 临时文件
    const tmp = `${file}.tmp-${process.pid}`;
    writeFileSync(tmp, bytes);
    renameSync(tmp, file);
}

/**
 * 图片库入库（从文件）。
 */
export function addStillRef(opts: {
    root: string;
    file: string;
    id?: string;
    role?: StillRefRole;
    title?: string;
}): StillReference {
    if (!existsSync(opts.file)) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `源文件不存在：${opts.file}` });
    }
    if (isLfsPointerFile(opts.file)) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `源文件是 Git LFS pointer：${opts.file}`,
            hint: "先运行 git lfs pull。",
        });
    }
    return addStillRefBytes({
        root: opts.root,
        bytes: new Uint8Array(readFileSync(opts.file)),
        ...(opts.id !== undefined && opts.id !== ""
            ? { id: opts.id }
            : { id: slugify(basename(opts.file, extname(opts.file)), "ref") }),
        ...(opts.role !== undefined ? { role: opts.role } : {}),
        ...(opts.title !== undefined ? { title: opts.title } : {}),
        source_label: opts.file,
    });
}

/**
 * 图片库入库（从字节，Web 遮罩上传使用）。
 */
export function addStillRefBytes(opts: {
    root: string;
    bytes: Uint8Array;
    id?: string;
    role?: StillRefRole;
    title?: string;
    source_label?: string;
}): StillReference {
    // 注册表
    const doc = loadStills(opts.root);
    // 条目 id
    const id = opts.id !== undefined && opts.id !== "" ? opts.id : `ref-${Date.now()}`;
    assertStillId(id, "图片库 id");
    if (doc.refs.some((item) => item.id === id)) {
        throw new DaoyanCliError({ code: "image_invalid", message: `图片库条目 ${id} 已存在` });
    }
    // 大小
    if (opts.bytes.byteLength > MAX_STILL_REF_BYTES) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `图片超过 ${MAX_STILL_REF_BYTES} 字节上限`,
            details: { bytes: opts.bytes.byteLength, limit: MAX_STILL_REF_BYTES },
        });
    }
    // 内容类型
    const detected = detectAssetType(opts.bytes);
    if (detected === null || !detected.content_type.startsWith("image/")) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `图片库只接受 PNG / JPEG / WebP：${opts.source_label ?? id}`,
        });
    }
    // 相对路径
    const relative = `${STILLS_REFS_DIR}/${id}.${detected.ext}`;
    // 落盘
    writeBytesAtomic(join(opts.root, relative), opts.bytes);
    // 条目
    const ref: StillReference = {
        id,
        path: relative,
        role: opts.role ?? "reference",
        ...(opts.title !== undefined && opts.title !== "" ? { title: opts.title } : {}),
        sha256: sha256(opts.bytes),
        bytes: opts.bytes.byteLength,
        content_type: detected.content_type,
        created_at: nowIso(),
    };
    doc.refs.push(ref);
    saveStills(opts.root, doc);
    return ref;
}

/**
 * 删除图片库条目。
 */
export function removeStillRef(root: string, id: string, force: boolean): StillReference {
    // 注册表
    const doc = loadStills(root);
    // 目标条目
    const ref = doc.refs.find((item) => item.id === id);
    if (ref === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片库条目 ${id}` });
    }
    // 被引用的单元
    const dependents = doc.stills.filter((item) => item.source === `ref:${id}` || item.mask === `ref:${id}`);
    if (dependents.length > 0 && !force) {
        throw new DaoyanCliError({
            code: "image_invalid",
            message: `图片库条目 ${id} 被图片单元引用：${dependents.map((item) => item.id).join(", ")}`,
            hint: "先改掉引用，或加 --force 强制删除。",
        });
    }
    // 删除文件
    rmSync(join(root, ref.path), { force: true });
    doc.refs = doc.refs.filter((item) => item.id !== id);
    saveStills(root, doc);
    return ref;
}

/**
 * 读取图片单元的定稿记录。
 */
export function stillTakeOf(root: string, stillId: string): StillTakeRecord | null {
    return loadStillTakes(root).stills.find((item) => item.still_id === stillId) ?? null;
}
