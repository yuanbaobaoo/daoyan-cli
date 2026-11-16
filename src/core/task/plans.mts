/** run 计划构建 —— 把 `run` / `shot` / `batch` 的输入解析成待执行计划：
 *  workflow + bindings + machine overrides + 逻辑输入 + 首帧上传。
 *  计划阶段不启动引擎；只有首帧接力需要 ffmpeg（抽上游尾帧）。 */
import { existsSync, mkdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import type {
    Bindings,
    ImageOp,
    JsonValue,
    MachineConfig,
    ProjectConfig,
    ShotSpec,
    ShotsFile,
} from "../project/types.mts";
import { RELAY_DIR } from "../project/types.mts";
import { resolveWorkflowRef } from "../project/config.mts";
import { extractLastFrame } from "../media/ffmpeg.mts";
import { latestRunByLabel, runOutputAbs } from "../run/store.mts";
import { resolveEpisodeContext } from "../story/paths.mts";
import { pickShotTake } from "../story/takes.mts";
import { pickStillSource } from "../story/image-takes.mts";
import {
    imageSourceAbsPath,
    loadStills,
    requiredBindingsOf,
    resolveImageSource,
    type ResolvedImageSource,
} from "../story/stills.mts";
import type { EpisodeContext, StillSpec, StillsFile } from "../story/types.mts";
import {
    applyLogicalValues,
    applyMachineOverrides,
    loadBindings,
    loadGraphFile,
    validateBindings,
} from "../workflow/load.mts";
import type { WorkflowGraph } from "../workflow/graph.mts";
import { resolveWorkflowAssets } from "../story/workflow-assets.mts";
import { audioEnabledOf } from "../project/production.mts";

/**
 * 一个待上传的输入文件。
 */
export interface UploadSpec {
    /**
     * 逻辑名（如 first_frame）。
     */
    logical: string;
    /**
     * 源文件绝对路径（只存在于计划/执行期，不写入记录）。
     */
    source: string;
    /**
     * 期望的引擎侧文件名（executor 会加 run 前缀避免冲突）。
     */
    desiredName: string;
    /**
     * 注入的节点输入。
     */
    target: { node: string; input: string };
}

/**
 * 单个 run 的执行计划。
 */
export interface RunPlan {
    /**
     * run label（shot:<id> 或用户指定）。
     */
    label: string | null;
    /**
     * workflow 绝对路径。
     */
    workflowAbs: string;
    /**
     * workflow 项目内相对路径。
     */
    workflowRel: string;
    /**
     * 最终图（已应用 machine overrides + 逻辑输入；首帧在上传后注入）。
     */
    graph: WorkflowGraph;
    /**
     * 逻辑输入记录（写入 run.json）。
     */
    inputs: Record<string, JsonValue>;
    /**
     * 节点级覆盖记录（machine overrides）。
     */
    overrides: Record<string, JsonValue>;
    /**
     * 待上传文件。
     */
    uploads: UploadSpec[];
    /**
     * 构建期发现的问题（warning 级）。
     */
    warnings: Array<{ code: string; message: string }>;
    /**
     * 目标镜头（shot/batch 用）。
     */
    shotId: string | null;
    /**
     * 目标图片单元（image 用）。
     */
    stillId?: string | null;
    /**
     * 图片操作（image 用）。
     */
    op?: ImageOp | null;
}

/**
 * 计划构建结果。
 */
export interface PlannedRuns {
    /**
     * 待执行 run。
     */
    plans: RunPlan[];
    /**
     * 已有成功 run 而跳过的镜号。
     */
    skipped: string[];
}

/**
 * 把绑定的 "nodeId.input" 拆开。
 */
function splitTarget(target: string): { node: string; input: string } {
    // 第一个点
    const dot = target.indexOf(".");
    return { node: target.slice(0, dot), input: target.slice(dot + 1) };
}

/**
 * 取文件扩展名（无扩展名回退 .png）。
 */
function extOf(p: string): string {
    // 文件名
    const b = basename(p);
    // 最后一个点
    const i = b.lastIndexOf(".");
    return i > 0 ? b.slice(i) : ".png";
}

/**
 * 校验图 + bindings 的静态问题（error 直接抛）。
 */
function ensureBindingsValid(graph: WorkflowGraph, bindings: Bindings | null, workflowRel: string): void {
    // bindings 结构问题
    const issues = validateBindings(graph, bindings, `${workflowRel}.bindings`);
    // 首个 error
    const first = issues.find((i) => i.severity === "error");
    if (first !== undefined) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: `${workflowRel} 的 bindings 非法：${first.message}`,
            details: { issues },
        });
    }
}

/**
 * 构建单次 `run` 的计划。
 */
export function planSingleRun(opts: {
    root: string;
    project: ProjectConfig;
    machine: MachineConfig;
    workflowRef: string;
    sets: Record<string, JsonValue>;
    label?: string;
}): RunPlan {
    // 解析 workflow 路径
    const ref = resolveWorkflowRef(opts.root, opts.workflowRef);
    // 加载图
    const loaded = loadGraphFile(ref.abs, ref.rel);
    // bindings（可选）
    const bindings = loadBindings(ref.abs);
    ensureBindingsValid(loaded.graph, bindings, loaded.rel);
    // machine overrides
    const over = applyMachineOverrides(loaded.graph, opts.machine, loaded.rel);
    // 结构错误
    const overError = over.issues.find((i) => i.severity === "error");
    if (overError !== undefined) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: overError.message,
            details: { issues: over.issues },
        });
    }
    // --set：逻辑名仍可用 bindings 解析
    const applied = applyLogicalValues(over.graph, bindings, opts.sets);
    // 逻辑名未映射时退回 nodeId.input 直接写入
    let graph = applied.graph;
    const inputs: Record<string, JsonValue> = {};
    // 节点级覆盖记录（machine overrides + --set）
    const overrides: Record<string, JsonValue> = { ...over.applied };
    const warnings: Array<{ code: string; message: string }> = [];
    for (const [key, value] of Object.entries(opts.sets)) {
        if (!applied.unmapped.includes(key)) {
            inputs[key] = value;
            // bindings 逻辑名 -> 记录实际节点输入
            const target = bindings?.[key];
            if (target !== undefined) overrides[target] = value;
            continue;
        }
        // 尝试 nodeId.input
        const dot = key.indexOf(".");
        const nodeId = dot > 0 ? key.slice(0, dot) : "";
        const node = nodeId === "" ? undefined : graph[nodeId];
        if (node === undefined) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: `--set 的键 "${key}" 既不是 bindings 逻辑名，也不是已有节点输入`,
                details: { logical_inputs: Object.keys(bindings ?? {}), nodes: Object.keys(graph).sort() },
            });
        }
        node.inputs[key.slice(dot + 1)] = value;
        inputs[key] = value;
        overrides[key] = value;
    }
    // set 应用中的结构错误
    const setError = applied.issues.find((i) => i.severity === "error");
    if (setError !== undefined) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: setError.message,
            details: { issues: applied.issues },
        });
    }
    return {
        label: opts.label ?? opts.workflowRef,
        workflowAbs: ref.abs,
        workflowRel: ref.rel,
        graph,
        inputs,
        overrides,
        uploads: [],
        warnings,
        shotId: null,
    };
}

/**
 * 从 shots.json 的镜头计算逻辑输入。
 */
function shotLogicalValues(shots: ShotsFile, shot: ShotSpec, stepsOverride?: number): Record<string, JsonValue> {
    // 全片默认值
    const d = shots.defaults;
    // 风格前缀
    const prefix = shots.style_prefix ?? "";
    // 逻辑输入表
    const values: Record<string, JsonValue> = {
        prompt: prefix !== "" ? `${prefix}。${shot.prompt}` : shot.prompt,
        seed: shot.seed,
        width: shot.width ?? shots.meta.width,
        height: shot.height ?? shots.meta.height,
    };
    // 可选字段（存在才写）
    const optional: Array<[string, JsonValue | undefined]> = [
        ["negative", d.negative],
        ["steps", stepsOverride ?? shot.steps ?? d.steps],
        ["cfg", shot.cfg ?? d.cfg],
        ["length", shot.length ?? d.length],
        ["sampler_name", d.sampler_name],
        ["scheduler", d.scheduler],
        ["shift_video", d.shift_video],
        ["shift_audio", d.shift_audio],
        ["filename_prefix", `${shot.id}${shot.slug !== undefined ? `_${shot.slug}` : ""}`],
    ];
    for (const [key, value] of optional) {
        if (value !== undefined) values[key] = value;
    }
    // 镜头自定义参数
    for (const [key, value] of Object.entries(shot.params ?? {})) values[key] = value;
    return values;
}

/**
 * 选择上游镜头的定稿稿件作为接力源；未定稿时按门禁策略回退或阻断。
 */
function pickRelaySource(
    root: string,
    context: EpisodeContext,
    upstreamId: string,
    enforceTakes: boolean,
): { abs: string; run_id: string } {
    // 上游选稿结果
    const take = pickShotTake(root, context, upstreamId);
    if (take.source === "none" || take.run === null || take.output === null) {
        throw new DaoyanCliError({
            code: "relay_upstream_missing",
            message: `接力上游镜 ${upstreamId} 还没有成功 run；先拍上游：daoyan shot ${upstreamId} --wait`,
        });
    }
    if (enforceTakes && take.source !== "finalized") {
        throw new DaoyanCliError({
            code: "take_pending",
            message: `接力上游镜 ${upstreamId} 尚未定稿${take.stale !== null ? "（定稿记录已失效）" : ""}`,
            details: {
                shot_id: upstreamId,
                run_id: take.run.run_id,
                reason: take.stale?.reason ?? "unfinalized",
            },
            nextActions: [`take finalize ${upstreamId} --run <run_id> --json`],
        });
    }
    // 产物绝对路径
    const abs = runOutputAbs(root, take.run, take.output);
    if (!existsSync(abs)) {
        throw new DaoyanCliError({
            code: "relay_upstream_missing",
            message: `接力上游产物不在工作区（可能未 git lfs pull）：${take.run.run_id}/${take.output.path}`,
            details: { run_id: take.run.run_id, path: take.output.path },
        });
    }
    return { abs, run_id: take.run.run_id };
}

/**
 * 解析首帧（锚点 / 接力 / 纯文生），返回上传计划。
 */
function firstFrameUpload(opts: {
    root: string;
    shots: ShotsFile;
    shot: ShotSpec;
    bindings: Bindings | null;
    context: EpisodeContext;
    enforceTakes: boolean;
}): {
    upload: UploadSpec | null;
    descriptor: JsonValue | undefined;
} {
    // 无首帧 = 纯文生
    if (opts.shot.first_frame === undefined) return { upload: null, descriptor: undefined };
    // 目标绑定
    const target = opts.bindings?.first_frame;
    if (target === undefined) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: `镜 ${opts.shot.id} 需要首帧，但 bindings 缺少 "first_frame" 映射`,
            details: { bindings: opts.bindings },
        });
    }
    // 首帧值
    const ff = opts.shot.first_frame;
    if (typeof ff === "string") {
        // 锚点
        const rel = opts.shots.meta.anchors[ff];
        if (rel === undefined) {
            throw new DaoyanCliError({
                code: "anchor_not_found",
                message: `镜 ${opts.shot.id} 的锚点 key "${ff}" 不在 shots.json meta.anchors`,
            });
        }
        // 锚点绝对路径
        const src = join(opts.root, rel);
        if (!existsSync(src)) {
            throw new DaoyanCliError({
                code: "anchor_not_found",
                message: `锚点图片不存在：${rel}`,
                details: { key: ff, path: rel },
            });
        }
        // 扩展名
        const ext = extOf(src);
        return {
            upload: {
                logical: "first_frame",
                source: src,
                desiredName: `anchor_${ff}_${opts.shot.id}${ext}`,
                target: splitTarget(target),
            },
            descriptor: `anchor:${ff}`,
        };
    }
    // 图片单元首帧
    if (typeof ff === "object" && "image" in ff) {
        // 图片单元
        const stillId = ff.image;
        // 定稿优先的图片产物
        const picked = pickStillSource(opts.root, stillId, opts.enforceTakes);
        // 产物路径
        const source = runOutputAbs(opts.root, picked.run, picked.output);
        if (!existsSync(source)) {
            throw new DaoyanCliError({
                code: "image_source_invalid",
                message: `图片单元 ${stillId} 的产物不在工作区`,
                details: { run_id: picked.run.run_id, output: picked.output.name },
            });
        }
        return {
            upload: {
                logical: "first_frame",
                source,
                desiredName: `${stillId}_keyframe_${opts.shot.id}${extOf(source)}`,
                target: splitTarget(target),
            },
            descriptor: `image:${stillId}`,
        };
    }
    // 接力
    const upstream = opts.shots.shots.find((s) => s.id === ff.relay);
    if (upstream === undefined) {
        throw new DaoyanCliError({
            code: "relay_upstream_missing",
            message: `镜 ${opts.shot.id} 接力的上游镜号 ${ff.relay} 不存在于分镜表`,
        });
    }
    // 上游产物（定稿稿件优先）
    const source = pickRelaySource(opts.root, opts.context, upstream.id, opts.enforceTakes);
    // 接力帧缓存目录
    const relayDir = join(opts.root, RELAY_DIR);
    mkdirSync(relayDir, { recursive: true });
    // 缓存路径（带来源 run id，换稿件不会复用旧尾帧）
    const cache = join(relayDir, `relay_${upstream.id}_${source.run_id}_to_${opts.shot.id}.png`);
    // 是否需要重新抽帧
    let needExtract = true;
    if (existsSync(cache)) {
        try {
            needExtract = statSync(cache).mtimeMs < statSync(source.abs).mtimeMs;
        } catch {
            needExtract = true;
        }
    }
    // 抽帧是异步的，由 buildShotPlans 统一前置处理（这里用同步占位会阻塞事件循环）
    if (needExtract) {
        // 标记供上层执行
        return {
            upload: {
                logical: "first_frame",
                source: `__RELAY_EXTRACT__:${source.abs}=>${cache}`,
                desiredName: `relay_${upstream.id}_${opts.shot.id}.png`,
                target: splitTarget(target),
            },
            descriptor: `relay:${upstream.id}`,
        };
    }
    return {
        upload: {
            logical: "first_frame",
            source: cache,
            desiredName: `relay_${upstream.id}_${opts.shot.id}.png`,
            target: splitTarget(target),
        },
        descriptor: `relay:${upstream.id}`,
    };
}

/**
 * 图片单元的逻辑输入（只写 bindings 里存在的键）。
 */
function imageLogicalValues(still: StillSpec, project: ProjectConfig, bindings: Bindings): Record<string, JsonValue> {
    // 默认值
    const defaults = project.image?.defaults;
    // 逻辑输入
    const values: Record<string, JsonValue> = {};
    if (bindings.prompt !== undefined) values.prompt = still.prompt ?? "";
    if (bindings.seed !== undefined) values.seed = still.seed ?? 0;
    // 尺寸 / 负向提示词
    const width = still.width ?? defaults?.width;
    const height = still.height ?? defaults?.height;
    const negative = still.negative ?? defaults?.negative;
    if (bindings.width !== undefined && width !== undefined) values.width = width;
    if (bindings.height !== undefined && height !== undefined) values.height = height;
    if (bindings.negative !== undefined && negative !== undefined) values.negative = negative;
    // 自定义参数
    for (const [key, value] of Object.entries(still.params ?? {})) values[key] = value;
    return values;
}

/**
 * 图片单元的资产槽位伪分镜（复用 story 槽位解析）。
 */
function stillAsShot(still: StillSpec): ShotSpec {
    // 伪分镜
    const shot: ShotSpec = {
        id: still.id,
        seed: still.seed ?? 0,
        prompt: still.prompt ?? "",
        ...(still.asset_slots !== undefined ? { asset_slots: still.asset_slots } : {}),
    };
    if (still.owner !== undefined && still.owner !== null && still.owner !== "") {
        const colon = still.owner.indexOf(":");
        // owner 类型
        const kind = colon > 0 ? still.owner.slice(0, colon) : "";
        // owner id
        const id = colon > 0 ? still.owner.slice(colon + 1) : still.owner;
        if (kind === "character") {
            shot.characters = [`${id}/${still.form ?? ""}`];
        } else if (kind === "scene") {
            shot.scene = id;
        }
    }
    return shot;
}

/**
 * 解析图片输入（显式覆盖 > still 字段 > 当前定稿/最新候选）。
 */
function imageInputDescriptor(opts: {
    root: string;
    still: StillSpec;
    op: ImageOp;
    override?: string;
    field: "source" | "mask";
}): string | null {
    // 显式覆盖
    if (opts.override !== undefined && opts.override !== "") return opts.override;
    // still 字段
    const stored = opts.field === "source" ? opts.still.source : opts.still.mask;
    if (stored !== undefined && stored !== null && stored !== "") return stored;
    // 遮罩必须显式提供
    if (opts.field === "mask") return null;
    // 文生图不需要输入
    if (opts.op === "t2i") return null;
    // 优化默认作用于当前定稿 / 最新候选
    try {
        const picked = pickStillSource(opts.root, opts.still.id, false);
        return `run:${picked.run.run_id}/${picked.output.name}`;
    } catch {
        return null;
    }
}

/**
 * 构建 image 任务的上传计划。
 */
function imageUpload(opts: {
    root: string;
    descriptor: string;
    logical: "source" | "mask";
    desiredName: string;
    bindings: Bindings;
}): UploadSpec {
    // 目标绑定
    const target = opts.bindings[opts.logical];
    if (target === undefined) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: `bindings 缺少 "${opts.logical}" 映射，无法注入${opts.logical === "mask" ? "遮罩" : "输入图"}`,
            details: { bindings: opts.bindings },
        });
    }
    // 解析结果
    const resolved: ResolvedImageSource = resolveImageSource(opts.root, opts.descriptor);
    if (!resolved.present) {
        throw new DaoyanCliError({
            code: "image_source_invalid",
            message: `${opts.logical === "mask" ? "遮罩" : "输入图"}不可用：${resolved.error ?? opts.descriptor}`,
            details: { descriptor: opts.descriptor },
        });
    }
    // 绝对路径
    const abs = imageSourceAbsPath(opts.root, resolved);
    if (abs === null) {
        throw new DaoyanCliError({
            code: "image_source_invalid",
            message: `无法定位输入文件：${opts.descriptor}`,
        });
    }
    return {
        logical: opts.logical,
        source: abs,
        desiredName: `${opts.desiredName}${extOf(abs)}`,
        target: splitTarget(target),
    };
}

/**
 * 构建 image 任务的计划列表。
 */
export function planImageRuns(opts: {
    root: string;
    project: ProjectConfig;
    machine: MachineConfig;
    stillIds: string[];
    op: ImageOp;
    source?: string;
    mask?: string;
    sets?: Record<string, JsonValue>;
    log: (m: string) => void;
}): PlannedRuns {
    // prompt 优化不是出图任务
    if (opts.op === "prompt") {
        throw new DaoyanCliError({ code: "usage", message: "prompt 优化请使用 daoyan image prompt optimize", exit: 2 });
    }
    // 注册表
    const doc: StillsFile = loadStills(opts.root);
    // 目标单元
    const targets = opts.stillIds.map((id) => {
        const still = doc.stills.find((item) => item.id === id);
        if (still === undefined) {
            throw new DaoyanCliError({
                code: "image_not_found",
                message: `未找到图片单元 ${id}`,
                details: { stills: doc.stills.map((item) => item.id) },
            });
        }
        return still;
    });
    if (targets.length === 0) {
        throw new DaoyanCliError({ code: "usage", message: "缺少图片单元 id", exit: 2 });
    }
    // 操作配置
    const opConfig = opts.project.image?.ops?.[opts.op];
    const plans: RunPlan[] = [];
    for (const still of targets) {
        // 工作流
        const ref = still.workflow ?? doc.workflow ?? opConfig?.workflow;
        if (ref === undefined || ref === "") {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: `图片单元 ${still.id} 没有可用 workflow：配置 project.image.ops.${opts.op}.workflow、stills.json 的 workflow，或单图 workflow`,
            });
        }
        // 路径 / 图 / bindings
        const wf = resolveWorkflowRef(opts.root, ref);
        const loaded = loadGraphFile(wf.abs, wf.rel);
        const bindings = loadBindings(wf.abs);
        if (bindings === null) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: `图片操作需要 bindings 文件：${wf.rel.replace(/\.json$/, ".bindings.json")}`,
                details: { workflow: wf.rel },
            });
        }
        ensureBindingsValid(loaded.graph, bindings, wf.rel);
        // 必备逻辑输入
        for (const key of requiredBindingsOf(opts.op)) {
            if (bindings[key] === undefined) {
                throw new DaoyanCliError({
                    code: "workflow_invalid",
                    message: `bindings 缺少 "${key}" 映射；${opts.op} 无法注入该值`,
                    details: { workflow: wf.rel },
                });
            }
        }
        // machine overrides
        const over = applyMachineOverrides(loaded.graph, opts.machine, wf.rel);
        const overError = over.issues.find((i) => i.severity === "error");
        if (overError !== undefined) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: overError.message,
                details: { issues: over.issues },
            });
        }
        // 逻辑值 + --set
        const values = { ...imageLogicalValues(still, opts.project, bindings), ...(opts.sets ?? {}) };
        const applied = applyLogicalValues(over.graph, bindings, values);
        const applyError = applied.issues.find((i) => i.severity === "error");
        if (applyError !== undefined) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: applyError.message,
                details: { issues: applied.issues },
            });
        }
        // nodeId.input 形式的 --set
        const overrides: Record<string, JsonValue> = { ...over.applied };
        const inputs: Record<string, JsonValue> = { ...applied.applied };
        for (const [key, value] of Object.entries(opts.sets ?? {})) {
            if (!applied.unmapped.includes(key)) {
                const target = bindings[key];
                if (target !== undefined) overrides[target] = value;
                continue;
            }
            const dot = key.indexOf(".");
            const nodeId = dot > 0 ? key.slice(0, dot) : "";
            const node = nodeId === "" ? undefined : applied.graph[nodeId];
            if (node === undefined) {
                throw new DaoyanCliError({
                    code: "workflow_invalid",
                    message: `--set 的键 "${key}" 既不是 bindings 逻辑名，也不是已有节点输入`,
                    details: { logical_inputs: Object.keys(bindings), nodes: Object.keys(applied.graph).sort() },
                });
            }
            node.inputs[key.slice(dot + 1)] = value;
            inputs[key] = value;
            overrides[key] = value;
        }
        // 输入图 / 遮罩
        const uploads: UploadSpec[] = [];
        const warnings: Array<{ code: string; message: string }> = [];
        if (opts.op !== "t2i") {
            // 输入图
            const sourceDescriptor = imageInputDescriptor({
                root: opts.root,
                still,
                op: opts.op,
                ...(opts.source !== undefined ? { override: opts.source } : {}),
                field: "source",
            });
            if (sourceDescriptor === null) {
                throw new DaoyanCliError({
                    code: "image_invalid",
                    message: `图片单元 ${still.id} 执行 ${opts.op} 需要输入图`,
                    hint: "用 --source 指定，或先 t2i 生成一张并定稿。",
                });
            }
            uploads.push(
                imageUpload({
                    root: opts.root,
                    descriptor: sourceDescriptor,
                    logical: "source",
                    desiredName: `${still.id}_source`,
                    bindings,
                }),
            );
            inputs.source = sourceDescriptor;
        }
        if (opts.op === "inpaint") {
            // 遮罩
            const maskDescriptor = imageInputDescriptor({
                root: opts.root,
                still,
                op: opts.op,
                ...(opts.mask !== undefined ? { override: opts.mask } : {}),
                field: "mask",
            });
            if (maskDescriptor === null) {
                throw new DaoyanCliError({
                    code: "image_invalid",
                    message: `图片单元 ${still.id} 执行 inpaint 需要遮罩`,
                    hint: "用 --mask 指定，或 daoyan image mask add <still> --box x,y,w,h。",
                });
            }
            // 遮罩角色提醒
            if (maskDescriptor.startsWith("ref:")) {
                const refId = maskDescriptor.slice("ref:".length);
                const ref = doc.refs.find((item) => item.id === refId);
                if (ref !== undefined && ref.role !== "mask") {
                    warnings.push({
                        code: "mask_role_not_mask",
                        message: `图片库条目 ${refId} 的 role 是 ${ref.role}，仍按遮罩使用`,
                    });
                }
            }
            uploads.push(
                imageUpload({
                    root: opts.root,
                    descriptor: maskDescriptor,
                    logical: "mask",
                    desiredName: `${still.id}_mask`,
                    bindings,
                }),
            );
            inputs.mask = maskDescriptor;
        }
        // 剧情 / 设定资产槽位
        const assetPlan = resolveWorkflowAssets({
            root: opts.root,
            shot: stillAsShot(still),
            workflowAbs: wf.abs,
            audio: false,
        });
        uploads.push(...assetPlan.uploads);
        if (assetPlan.records.length > 0) inputs.assets = assetPlan.records as unknown as JsonValue;
        // seed 缺省提示
        if (still.seed === undefined) {
            warnings.push({ code: "image_seed_default", message: "未设置 seed，使用 0" });
        }
        warnings.push(
            ...applied.unmapped.map((key) => ({
                code: "binding_not_found",
                message: `逻辑输入 "${key}" 没有 binding，已忽略`,
            })),
        );
        plans.push({
            label: `img:${still.id}`,
            workflowAbs: wf.abs,
            workflowRel: wf.rel,
            graph: applied.graph,
            inputs,
            overrides,
            uploads,
            warnings,
            shotId: null,
            stillId: still.id,
            op: opts.op,
        });
    }
    opts.log(`图片计划：${plans.length} 个 run（${opts.op}）`);
    return { plans, skipped: [] };
}

export async function planShotRuns(opts: {
    root: string;
    project: ProjectConfig;
    machine: MachineConfig;
    shots: ShotsFile;
    shotIds?: string[];
    stepsOverride?: number;
    force: boolean;
    context?: EpisodeContext;
    enforceTakes?: boolean;
    log: (m: string) => void;
}): Promise<PlannedRuns> {
    // 目标镜头
    const targets =
        opts.shotIds === undefined
            ? opts.shots.shots
            : opts.shotIds.map((id) => {
                  // 按 id 查找
                  const s = opts.shots.shots.find((x) => x.id === id);
                  if (s === undefined) {
                      throw new DaoyanCliError({
                          code: "usage",
                          message: `未知镜号 ${id}；可用：${opts.shots.shots.map((x) => x.id).join(" ")}`,
                          exit: 2,
                      });
                  }
                  return s;
              });
    if (targets.length === 0) {
        throw new DaoyanCliError({ code: "config_invalid", message: "shots.json 没有镜头" });
    }
    // 结果
    const plans: RunPlan[] = [];
    const skipped: string[] = [];
    // 剧集上下文（省略时按 legacy 解析）
    const context = opts.context ?? resolveEpisodeContext(opts.root);
    // label 前缀
    const labelPrefix = context.label_prefix;
    // strict 门禁下接力只吃上游定稿稿件
    const enforceTakes = opts.enforceTakes ?? false;
    for (const shot of targets) {
        // 已有成功 run：跳过（retake 强制重拍）
        if (!opts.force) {
            // 该镜最新 run
            const existing = latestRunByLabel(opts.root, `${labelPrefix}${shot.id}`);
            if (existing !== null && existing.status === "succeeded") {
                skipped.push(shot.id);
                opts.log(`镜 ${shot.id} 已有成功 run ${existing.run_id}，跳过（retake 强制重拍）`);
                continue;
            }
        }
        // 解析 workflow 引用
        const ref =
            shot.workflow ??
            opts.shots.workflow ??
            opts.project.default_workflow ??
            (() => {
                throw new DaoyanCliError({
                    code: "workflow_invalid",
                    message: `镜 ${shot.id} 没有可用 workflow：设置 project.json 的 default_workflow、shots.json 的 workflow，或单镜 workflow`,
                });
            })();
        // 解析路径
        const wf = resolveWorkflowRef(opts.root, ref);
        // 加载图
        const loaded = loadGraphFile(wf.abs, wf.rel);
        // bindings（shot 必须有）
        const bindings = loadBindings(wf.abs);
        if (bindings === null) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: `shot 需要 bindings 文件：${wf.rel.replace(/\.json$/, ".bindings.json")}`,
                details: { workflow: wf.rel },
            });
        }
        ensureBindingsValid(loaded.graph, bindings, wf.rel);
        // 必备逻辑输入
        for (const required of ["prompt", "seed"] as const) {
            if (bindings[required] === undefined) {
                throw new DaoyanCliError({
                    code: "workflow_invalid",
                    message: `bindings 缺少 "${required}" 映射；shot recipe 无法注入该值`,
                    details: { workflow: wf.rel },
                });
            }
        }
        // machine overrides
        const over = applyMachineOverrides(loaded.graph, opts.machine, wf.rel);
        const overError = over.issues.find((i) => i.severity === "error");
        if (overError !== undefined) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: overError.message,
                details: { issues: over.issues },
            });
        }
        // 逻辑输入
        const values = shotLogicalValues(opts.shots, shot, opts.stepsOverride);
        // 首帧
        const ff = firstFrameUpload({ root: opts.root, shots: opts.shots, shot, bindings, context, enforceTakes });
        // 剧情资产槽位
        const assetPlan = resolveWorkflowAssets({
            root: opts.root,
            shot,
            workflowAbs: wf.abs,
            audio: audioEnabledOf(opts.project),
        });
        // 应用逻辑值
        const applied = applyLogicalValues(over.graph, bindings, values);
        const applyError = applied.issues.find((i) => i.severity === "error");
        if (applyError !== undefined) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: applyError.message,
                details: { issues: applied.issues },
            });
        }
        // 待执行计划
        const plan: RunPlan = {
            label: `${labelPrefix}${shot.id}`,
            workflowAbs: wf.abs,
            workflowRel: wf.rel,
            graph: applied.graph,
            inputs: {
                ...applied.applied,
                ...(ff.descriptor !== undefined ? { first_frame: ff.descriptor } : {}),
                ...(assetPlan.records.length > 0 ? { assets: assetPlan.records as unknown as JsonValue } : {}),
            },
            overrides: over.applied,
            uploads: [...(ff.upload !== null ? [ff.upload] : []), ...assetPlan.uploads],
            warnings: applied.unmapped.map((k) => ({
                code: "binding_not_found",
                message: `逻辑输入 "${k}" 没有 binding，已忽略`,
            })),
            shotId: shot.id,
        };
        // 接力帧抽帧（异步）
        for (const up of plan.uploads) {
            if (up.source.startsWith("__RELAY_EXTRACT__:")) {
                // 编码的 source/cache
                const spec = up.source.slice("__RELAY_EXTRACT__:".length);
                const arrow = spec.indexOf("=>");
                const from = spec.slice(0, arrow);
                const to = spec.slice(arrow + 2);
                opts.log(`镜 ${shot.id}：抽取上游尾帧 → ${RELAY_DIR}/`);
                await extractLastFrame(from, to);
                up.source = to;
            }
        }
        plans.push(plan);
    }
    return { plans, skipped };
}
