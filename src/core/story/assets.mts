/** Story 资产入库 / 主参考 / 删除 —— 参考图与参考音频的确定性管理。
 *  - 只允许图片与音频；按魔数识别，不信任扩展名；
 *  - 复制到 story/assets/ 规范路径，记录 sha256 / bytes / 来源；
 *  - 主参考必须由 AI / 用户显式 set-reference，不存在自动取第一张。 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, nowIso, sha256 } from "../../shared/fs.mts";
import { requireRun, runOutputAbs } from "../run/store.mts";
import { STORY_ASSETS_DIR } from "../project/types.mts";
import { charactersPath, scenesPath, voicesPath, STORY_ID_RE, REFERENCE_ASSET_RESERVED } from "./paths.mts";
import { loadCharacters, loadScenes, loadVoices, saveCharacters, saveScenes, saveVoices } from "./store.mts";
import type {
    StoryAsset,
    StoryCharacter,
    StoryCharactersFile,
    StoryForm,
    StoryOwnerKind,
    StoryScene,
    StoryScenesFile,
    StoryVoice,
    StoryVoicesFile,
} from "./types.mts";

// 单资产大小上限（200 MiB）
const MAX_ASSET_BYTES = 200 * 1024 * 1024;
// Git LFS pointer 文件头
const LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec/v1";
// 文件头读取长度
const MAGIC_READ_BYTES = 64;
// Story 媒体 URL 前缀
const STORY_MEDIA_PREFIX = "/media/story";

/**
 * story 资产媒体地址。
 */
export function storyMediaUrl(path: string, version?: string | null): string {
    // 资产根前缀
    const prefix = `${STORY_ASSETS_DIR}/`;
    // owner 相对路径
    const rel = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    // 基础地址
    const url = `${STORY_MEDIA_PREFIX}/${rel.split("/").map(encodeURIComponent).join("/")}`;
    // 内容版本（同名文件替换后强制换 URL）
    return version !== undefined && version !== null && version !== ""
        ? `${url}?v=${encodeURIComponent(version)}`
        : url;
}

/**
 * 资产 owner 解析结果。
 */
export interface ParsedAssetOwner {
    /**
     * owner 类型。
     */
    kind: StoryOwnerKind;
    /**
     * owner id。
     */
    id: string;
    /**
     * 角色形态 id（仅角色）。
     */
    form: string | null;
}

/**
 * 资产入库结果。
 */
export interface AddAssetResult {
    /**
     * 资产记录。
     */
    asset: StoryAsset;
    /**
     * 是否设置为主参考。
     */
    reference_set: boolean;
    /**
     * 是否需要提醒设置主参考。
     */
    warning: string | null;
}

/**
 * 解析 owner 字符串。
 */
export function parseAssetOwner(owner: string, form?: string): ParsedAssetOwner {
    // 分隔符
    const colon = owner.indexOf(":");
    if (colon <= 0 || colon === owner.length - 1) {
        throw new DaoyanCliError({
            code: "usage",
            message: `--owner 需要 <character|scene|voice>:<id>（收到 ${owner}）`,
            exit: 2,
        });
    }
    // owner 类型
    const kind = owner.slice(0, colon) as StoryOwnerKind;
    // owner id
    const id = owner.slice(colon + 1);
    if (kind !== "character" && kind !== "scene" && kind !== "voice") {
        throw new DaoyanCliError({ code: "usage", message: `未知 owner 类型 ${kind}`, exit: 2 });
    }
    if (!STORY_ID_RE.test(id)) {
        throw new DaoyanCliError({ code: "story_invalid", message: `owner id 非法：${id}` });
    }
    if (kind === "character") {
        if (form === undefined || form === "") {
            throw new DaoyanCliError({ code: "usage", message: "角色资产需要 --form <form-id>", exit: 2 });
        }
        if (!STORY_ID_RE.test(form)) {
            throw new DaoyanCliError({ code: "story_invalid", message: `形态 id 非法：${form}` });
        }
        return { kind, id, form };
    }
    return { kind, id, form: null };
}

/**
 * 读取文件头。
 */
function magicBytes(bytes: Uint8Array): Uint8Array {
    return bytes.slice(0, Math.min(bytes.byteLength, MAGIC_READ_BYTES));
}

/**
 * ASCII 片段。
 */
function ascii(bytes: Uint8Array, start: number, end: number): string {
    return Buffer.from(bytes.slice(start, end)).toString("ascii");
}

/**
 * 按魔数识别内容类型。
 */
export function detectAssetType(bytes: Uint8Array): { content_type: string; ext: string } | null {
    // 文件头
    const head = magicBytes(bytes);
    if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
        return { content_type: "image/png", ext: "png" };
    }
    if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
        return { content_type: "image/jpeg", ext: "jpg" };
    }
    if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") {
        return { content_type: "image/webp", ext: "webp" };
    }
    if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WAVE") {
        return { content_type: "audio/wav", ext: "wav" };
    }
    if (head.length >= 4 && ascii(head, 0, 4) === "fLaC") {
        return { content_type: "audio/flac", ext: "flac" };
    }
    if (head.length >= 4 && ascii(head, 0, 4) === "OggS") {
        return { content_type: "audio/ogg", ext: "ogg" };
    }
    if (head.length >= 3 && ascii(head, 0, 3) === "ID3") {
        return { content_type: "audio/mpeg", ext: "mp3" };
    }
    if (head.length >= 2 && head[0] === 0xff && (head[1] === 0xfb || head[1] === 0xf3 || head[1] === 0xf2)) {
        return { content_type: "audio/mpeg", ext: "mp3" };
    }
    return null;
}

/**
 * 判断源文件是否是 Git LFS pointer。
 */
export function isLfsPointerFile(file: string): boolean {
    try {
        if (statSync(file).size > 1_024) return false;
        return readFileSync(file, "utf8").startsWith(LFS_POINTER_PREFIX);
    } catch {
        return false;
    }
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
 * 读取资产源文件。
 */
function readSource(path: string): Uint8Array {
    if (!existsSync(path)) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `源文件不存在：${path}` });
    }
    if (isLfsPointerFile(path)) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `源文件是 Git LFS pointer：${path}`,
            hint: "先运行 git lfs pull。",
        });
    }
    // 文件大小
    const size = statSync(path).size;
    if (size > MAX_ASSET_BYTES) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `资产超过 ${MAX_ASSET_BYTES} 字节上限`,
            details: { bytes: size, limit: MAX_ASSET_BYTES },
        });
    }
    return new Uint8Array(readFileSync(path));
}

/**
 * 资产规范相对路径。
 */
export function assetRelPath(owner: ParsedAssetOwner, assetId: string, ext: string): string {
    if (owner.kind === "character" && owner.form !== null) {
        return `${STORY_ASSETS_DIR}/characters/${owner.id}/${owner.form}/${assetId}.${ext}`;
    }
    if (owner.kind === "scene") return `${STORY_ASSETS_DIR}/scenes/${owner.id}/${assetId}.${ext}`;
    return `${STORY_ASSETS_DIR}/voices/${owner.id}/${assetId}.${ext}`;
}

/**
 * 在角色文件中定位形态。
 */
export function findCharacterForm(
    doc: StoryCharactersFile,
    characterId: string,
    formId: string,
): { character: StoryCharacter; form: StoryForm } {
    // 角色
    const character = doc.characters.find((c) => c.id === characterId);
    if (character === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `未找到角色 ${characterId}` });
    }
    // 形态
    const form = character.forms.find((f) => f.id === formId);
    if (form === undefined) {
        throw new DaoyanCliError({
            code: "asset_not_found",
            message: `角色 ${characterId} 没有形态 ${formId}`,
        });
    }
    return { character, form };
}

/**
 * 在场景文件中定位场景。
 */
export function findScene(doc: StoryScenesFile, sceneId: string): StoryScene {
    // 场景
    const scene = doc.scenes.find((s) => s.id === sceneId);
    if (scene === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `未找到场景 ${sceneId}` });
    }
    return scene;
}

/**
 * 在音色文件中定位音色。
 */
export function findVoice(doc: StoryVoicesFile, voiceId: string): StoryVoice {
    // 音色
    const voice = doc.voices.find((v) => v.id === voiceId);
    if (voice === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `未找到音色 ${voiceId}` });
    }
    return voice;
}

/**
 * 解析 run 产物来源。
 */
function sourceFromRun(
    root: string,
    runId: string,
    outputName: string,
): {
    source: string;
    sourceRun: string;
    sourceOutput: string;
    sourceEpisodeId: string | null;
} {
    // run 记录
    const run = requireRun(root, runId);
    // 产物
    const output = run.outputs.find((o) => o.name === outputName);
    if (output === undefined) {
        throw new DaoyanCliError({
            code: "asset_not_found",
            message: `run ${runId} 没有产物 ${outputName}`,
            details: { outputs: run.outputs.map((o) => o.name) },
        });
    }
    // 绝对路径
    const source = runOutputAbs(root, run, output);
    if (!existsSync(source)) {
        throw new DaoyanCliError({
            code: "asset_not_found",
            message: `run 产物不在工作区（可能未 git lfs pull）：${runId}/${output.path}`,
        });
    }
    return {
        source,
        sourceRun: run.run_id,
        sourceOutput: output.name,
        sourceEpisodeId: run.episode_id ?? null,
    };
}

/**
 * 资产入库。
 */
export function addAsset(opts: {
    root: string;
    owner: ParsedAssetOwner;
    assetId: string;
    role?: string;
    from?: string;
    fromRun?: string;
    output?: string;
    setReference: boolean;
    replace: boolean;
}): AddAssetResult {
    if (!STORY_ID_RE.test(opts.assetId)) {
        throw new DaoyanCliError({ code: "story_invalid", message: `资产 id 非法：${opts.assetId}` });
    }
    if (opts.assetId === REFERENCE_ASSET_RESERVED) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `资产 id "${REFERENCE_ASSET_RESERVED}" 是工作流槽位保留字`,
        });
    }
    // 来源
    let source: string;
    // 局部值
    let sourceRun: string | null = null;
    // 局部值
    let sourceOutput: string | null = null;
    // 局部值
    let sourceEpisodeId: string | null = null;
    if (opts.fromRun !== undefined && opts.fromRun !== "") {
        if (opts.output === undefined || opts.output === "") {
            throw new DaoyanCliError({ code: "usage", message: "--from-run 需要 --output <产物名>", exit: 2 });
        }
        // run 产物
        const runSource = sourceFromRun(opts.root, opts.fromRun, opts.output);
        source = runSource.source;
        sourceRun = runSource.sourceRun;
        sourceOutput = runSource.sourceOutput;
        sourceEpisodeId = runSource.sourceEpisodeId;
    } else if (opts.from !== undefined && opts.from !== "") {
        // 相对路径按项目根解析
        source = isAbsolute(opts.from) ? opts.from : join(opts.root, opts.from);
    } else {
        throw new DaoyanCliError({
            code: "usage",
            message: "需要 --from <文件> 或 --from-run <run_id> --output <name>",
            exit: 2,
        });
    }
    // 源字节
    const bytes = readSource(source);
    // 类型
    const type = detectAssetType(bytes);
    if (type === null) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `无法识别的资产类型：${source}`,
            hint: "支持 PNG / JPEG / WebP / WAV / MP3 / FLAC / OGG。",
        });
    }
    // 规范路径
    const rel = assetRelPath(opts.owner, opts.assetId, type.ext);
    // 绝对路径
    const abs = join(opts.root, rel);
    // 资产记录
    const asset: StoryAsset = {
        id: opts.assetId,
        ...(opts.role !== undefined && opts.role !== "" ? { role: opts.role } : {}),
        path: rel,
        sha256: sha256(bytes),
        bytes: bytes.byteLength,
        content_type: type.content_type,
        source_run: sourceRun,
        source_output: sourceOutput,
        source_episode_id: sourceEpisodeId,
        created_at: nowIso(),
    };
    // 文件写入（replace 或不覆盖）
    if (existsSync(abs) && !opts.replace) {
        throw new DaoyanCliError({
            code: "asset_invalid",
            message: `资产已存在：${rel}`,
            hint: "使用 --replace 覆盖，或换一个 --id。",
        });
    }
    writeBytesAtomic(abs, bytes);

    // owner 文档更新
    if (opts.owner.kind === "character") {
        // 角色文件
        const doc = loadCharacters(opts.root);
        // 定位形态
        const { form } = findCharacterForm(doc, opts.owner.id, opts.owner.form ?? "");
        upsertAsset(form.assets, asset, opts.replace);
        if (opts.setReference) form.reference_asset = asset.id;
        saveCharacters(opts.root, doc);
        return {
            asset,
            reference_set: opts.setReference,
            warning:
                form.reference_asset === undefined || form.reference_asset === null || form.reference_asset === ""
                    ? "尚未指定 reference_asset；用 story asset set-reference 选择主参考"
                    : null,
        };
    }
    if (opts.owner.kind === "scene") {
        // 场景文件
        const doc = loadScenes(opts.root);
        // 场景
        const scene = findScene(doc, opts.owner.id);
        upsertAsset(scene.assets, asset, opts.replace);
        if (opts.setReference) scene.reference_asset = asset.id;
        saveScenes(opts.root, doc);
        return {
            asset,
            reference_set: opts.setReference,
            warning:
                scene.reference_asset === undefined || scene.reference_asset === null || scene.reference_asset === ""
                    ? "尚未指定 reference_asset；用 story asset set-reference 选择主参考"
                    : null,
        };
    }
    // 音色文件
    const doc = loadVoices(opts.root);
    // 音色
    const voice = findVoice(doc, opts.owner.id);
    upsertAsset(voice.assets, asset, opts.replace);
    if (opts.setReference) voice.reference_asset = asset.id;
    saveVoices(opts.root, doc);
    return {
        asset,
        reference_set: opts.setReference,
        warning:
            voice.mode === "reference" &&
            (voice.reference_asset === undefined || voice.reference_asset === null || voice.reference_asset === "")
                ? "音色尚未指定 reference_asset；用 story asset set-reference 选择参考音频"
                : null,
    };
}

/**
 * 插入或替换资产记录。
 */
function upsertAsset(list: StoryAsset[], asset: StoryAsset, replace: boolean): void {
    // 已有位置
    const index = list.findIndex((a) => a.id === asset.id);
    if (index >= 0) {
        if (!replace) {
            throw new DaoyanCliError({ code: "asset_invalid", message: `资产 ${asset.id} 已存在` });
        }
        list[index] = asset;
        return;
    }
    list.push(asset);
}

/**
 * 显式设置主参考。
 */
export function setReferenceAsset(root: string, owner: ParsedAssetOwner, assetId: string): StoryAsset {
    // 资产记录
    let asset: StoryAsset | undefined;
    if (owner.kind === "character") {
        // 角色文件
        const doc = loadCharacters(root);
        // 形态
        const { form } = findCharacterForm(doc, owner.id, owner.form ?? "");
        asset = form.assets.find((a) => a.id === assetId);
        if (asset === undefined) {
            throw new DaoyanCliError({ code: "asset_not_found", message: `角色形态没有资产 ${assetId}` });
        }
        form.reference_asset = assetId;
        saveCharacters(root, doc);
        return asset;
    }
    if (owner.kind === "scene") {
        // 场景文件
        const doc = loadScenes(root);
        // 场景
        const scene = findScene(doc, owner.id);
        asset = scene.assets.find((a) => a.id === assetId);
        if (asset === undefined) {
            throw new DaoyanCliError({ code: "asset_not_found", message: `场景没有资产 ${assetId}` });
        }
        scene.reference_asset = assetId;
        saveScenes(root, doc);
        return asset;
    }
    // 音色文件
    const doc = loadVoices(root);
    // 音色
    const voice = findVoice(doc, owner.id);
    asset = voice.assets.find((a) => a.id === assetId);
    if (asset === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `音色没有资产 ${assetId}` });
    }
    voice.reference_asset = assetId;
    saveVoices(root, doc);
    return asset;
}

/**
 * 删除资产。
 */
export function removeAsset(root: string, owner: ParsedAssetOwner, assetId: string, force: boolean): StoryAsset {
    // 删除实现按 owner 分支
    if (owner.kind === "character") {
        // 角色文件
        const doc = loadCharacters(root);
        // 形态
        const { form } = findCharacterForm(doc, owner.id, owner.form ?? "");
        // 局部值
        const removed = removeFromList(root, form.assets, form, assetId, force);
        saveCharacters(root, doc);
        return removed;
    }
    if (owner.kind === "scene") {
        // 场景文件
        const doc = loadScenes(root);
        // 场景
        const scene = findScene(doc, owner.id);
        // 局部值
        const removed = removeFromList(root, scene.assets, scene, assetId, force);
        saveScenes(root, doc);
        return removed;
    }
    // 音色文件
    const doc = loadVoices(root);
    // 音色
    const voice = findVoice(doc, owner.id);
    // 局部值
    const removed = removeFromList(root, voice.assets, voice, assetId, force);
    saveVoices(root, doc);
    return removed;
}

/**
 * 从 owner 列表删除资产并回写。
 */
function removeFromList(
    root: string,
    list: StoryAsset[],
    holder: { reference_asset?: string | null },
    assetId: string,
    force: boolean,
): StoryAsset {
    // 资产
    const asset = list.find((a) => a.id === assetId);
    if (asset === undefined) {
        throw new DaoyanCliError({ code: "asset_not_found", message: `未找到资产 ${assetId}` });
    }
    if (holder.reference_asset === assetId && !force) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `资产 ${assetId} 是当前主参考，不能直接删除`,
            hint: "先用 story asset set-reference 指向另一资产，或 --force 删除并接受 missing_reference。",
        });
    }
    // 文件
    const abs = join(root, asset.path);
    if (existsSync(abs)) rmSync(abs, { force: true });
    // 记录
    const index = list.findIndex((a) => a.id === assetId);
    if (index >= 0) list.splice(index, 1);
    if (holder.reference_asset === assetId) holder.reference_asset = null;
    return asset;
}

/**
 * 查找 owner 的主参考资产。
 */
export function referenceAssetOf(root: string, owner: ParsedAssetOwner): StoryAsset | null {
    if (owner.kind === "character") {
        // 角色文件
        const doc = loadCharacters(root);
        // 形态
        const { form } = findCharacterForm(doc, owner.id, owner.form ?? "");
        // 标识
        const id = form.reference_asset;
        return id !== undefined && id !== null && id !== "" ? (form.assets.find((a) => a.id === id) ?? null) : null;
    }
    if (owner.kind === "scene") {
        // 场景文件
        const doc = loadScenes(root);
        // 场景
        const scene = findScene(doc, owner.id);
        // 标识
        const id = scene.reference_asset;
        return id !== undefined && id !== null && id !== "" ? (scene.assets.find((a) => a.id === id) ?? null) : null;
    }
    // 音色文件
    const doc = loadVoices(root);
    // 音色
    const voice = findVoice(doc, owner.id);
    // 标识
    const id = voice.reference_asset;
    return id !== undefined && id !== null && id !== "" ? (voice.assets.find((a) => a.id === id) ?? null) : null;
}

/**
 * 资产列表项（Web / status 用）。
 */
export interface StoryAssetListItem {
    /**
     * owner 类型。
     */
    owner_kind: StoryOwnerKind;
    /**
     * owner id。
     */
    owner_id: string;
    /**
     * owner 展示名。
     */
    owner_name: string;
    /**
     * 角色形态 id。
     */
    form_id: string | null;
    /**
     * 是否主参考。
     */
    reference: boolean;
    /**
     * 资产记录。
     */
    asset: StoryAsset;
}

/**
 * 列出全部资产。
 */
export function listAssets(root: string): StoryAssetListItem[] {
    // 结果
    const out: StoryAssetListItem[] = [];
    // 角色
    const characters = loadCharacters(root);
    for (const character of characters.characters) {
        for (const form of character.forms) {
            for (const asset of form.assets) {
                out.push({
                    owner_kind: "character",
                    owner_id: character.id,
                    owner_name: character.name,
                    form_id: form.id,
                    reference: form.reference_asset === asset.id,
                    asset,
                });
            }
        }
    }
    // 场景
    const scenes = loadScenes(root);
    for (const scene of scenes.scenes) {
        for (const asset of scene.assets) {
            out.push({
                owner_kind: "scene",
                owner_id: scene.id,
                owner_name: scene.name,
                form_id: null,
                reference: scene.reference_asset === asset.id,
                asset,
            });
        }
    }
    // 音色
    const voices = loadVoices(root);
    for (const voice of voices.voices) {
        for (const asset of voice.assets) {
            out.push({
                owner_kind: "voice",
                owner_id: voice.id,
                owner_name: voice.name,
                form_id: null,
                reference: voice.reference_asset === asset.id,
                asset,
            });
        }
    }
    return out;
}
