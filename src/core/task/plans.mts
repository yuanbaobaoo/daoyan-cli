/** run 计划构建 —— 把 `run` / `shot` / `batch` 的输入解析成待执行计划：
 *  workflow + bindings + machine overrides + 逻辑输入 + 首帧上传。
 *  计划阶段不启动引擎；只有首帧接力需要 ffmpeg（抽上游尾帧）。 */
import { existsSync, mkdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import type { Bindings, JsonValue, MachineConfig, ProjectConfig, ShotSpec, ShotsFile } from "../project/types.mts";
import { RELAY_DIR } from "../project/types.mts";
import { resolveWorkflowRef } from "../project/config.mts";
import { extractLastFrame } from "../media/ffmpeg.mts";
import { latestRunByLabel, latestSucceededRun, runOutputAbs } from "../run/store.mts";
import {
    applyLogicalValues,
    applyMachineOverrides,
    loadBindings,
    loadGraphFile,
    validateBindings,
} from "../workflow/load.mts";
import type { WorkflowGraph } from "../workflow/graph.mts";

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
 * 选择上游 run 的产物文件（优先视频）。
 */
function pickRelaySource(root: string, upstreamId: string): string {
    // 上游最新成功 run
    const rec = latestSucceededRun(root, `shot:${upstreamId}`);
    if (rec === null) {
        throw new DaoyanCliError({
            code: "relay_upstream_missing",
            message: `接力上游镜 ${upstreamId} 还没有成功 run；先拍上游：daoyan shot ${upstreamId} --wait`,
        });
    }
    // 视频产物优先
    const video = rec.outputs.find((o) => /\.(mp4|webm|mkv|mov|gif)$/i.test(o.name));
    // 兜底取第一个产物
    const chosen = video ?? rec.outputs[0];
    if (chosen === undefined) {
        throw new DaoyanCliError({
            code: "relay_upstream_missing",
            message: `接力上游镜 ${upstreamId} 的 run ${rec.run_id} 没有产物`,
        });
    }
    // 产物绝对路径
    const abs = runOutputAbs(root, rec, chosen);
    if (!existsSync(abs)) {
        throw new DaoyanCliError({
            code: "relay_upstream_missing",
            message: `接力上游产物不在工作区（可能未 git lfs pull）：${rec.run_id}/${chosen.path}`,
            details: { run_id: rec.run_id, path: chosen.path },
        });
    }
    return abs;
}

/**
 * 解析首帧（锚点 / 接力 / 纯文生），返回上传计划。
 */
function firstFrameUpload(opts: { root: string; shots: ShotsFile; shot: ShotSpec; bindings: Bindings | null }): {
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
    // 接力
    const upstream = opts.shots.shots.find((s) => s.id === ff.relay);
    if (upstream === undefined) {
        throw new DaoyanCliError({
            code: "relay_upstream_missing",
            message: `镜 ${opts.shot.id} 接力的上游镜号 ${ff.relay} 不存在于分镜表`,
        });
    }
    // 上游产物
    const sourceClip = pickRelaySource(opts.root, upstream.id);
    // 接力帧缓存目录
    const relayDir = join(opts.root, RELAY_DIR);
    mkdirSync(relayDir, { recursive: true });
    // 缓存路径
    const cache = join(relayDir, `relay_${upstream.id}_to_${opts.shot.id}.png`);
    // 是否需要重新抽帧
    let needExtract = true;
    if (existsSync(cache)) {
        try {
            needExtract = statSync(cache).mtimeMs < statSync(sourceClip).mtimeMs;
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
                source: `__RELAY_EXTRACT__:${sourceClip}=>${cache}`,
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
 * 构建 shot / retake / batch 的计划列表。
 */
export async function planShotRuns(opts: {
    root: string;
    project: ProjectConfig;
    machine: MachineConfig;
    shots: ShotsFile;
    shotIds?: string[];
    stepsOverride?: number;
    force: boolean;
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
    for (const shot of targets) {
        // 已有成功 run：跳过（retake 强制重拍）
        if (!opts.force) {
            // 该镜最新 run
            const existing = latestRunByLabel(opts.root, `shot:${shot.id}`);
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
        const ff = firstFrameUpload({ root: opts.root, shots: opts.shots, shot, bindings });
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
            label: `shot:${shot.id}`,
            workflowAbs: wf.abs,
            workflowRel: wf.rel,
            graph: applied.graph,
            inputs: { ...applied.applied, ...(ff.descriptor !== undefined ? { first_frame: ff.descriptor } : {}) },
            overrides: over.applied,
            uploads: ff.upload !== null ? [ff.upload] : [],
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
