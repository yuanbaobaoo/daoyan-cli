/** 工作流加载与解析 —— API JSON、bindings、machine overrides、--set 的优先级合成。
 *  优先级：workflow 文件 < machine overrides < --set。run 快照记录最终图。 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { writeFileAtomic } from "../../shared/fs.mts";
import type { Bindings, JsonValue, MachineConfig } from "../project/types.mts";
import { BINDINGS_SUFFIX } from "../project/types.mts";
import { cloneGraph, graphSha256, hasGraphErrors, parseGraph, type GraphIssue, type WorkflowGraph } from "./graph.mts";
import { extractNodeDef, type NodeCatalog } from "./catalog.mts";

/**
 * 工作流加载结果。
 */
export interface LoadedWorkflow {
    /**
     * 工作流绝对路径。
     */
    abs: string;
    /**
     * 项目内相对路径（unix 分隔符）。
     */
    rel: string;
    /**
     * 解析后的图。
     */
    graph: WorkflowGraph;
    /**
     * 图哈希。
     */
    sha256: string;
}

/**
 * 统一抛工作流错误。
 */
function workflowError(message: string, details?: Record<string, unknown>): never {
    throw new DaoyanCliError({ code: "workflow_invalid", message, details });
}

/**
 * 读取工作流文件并做结构校验。
 */
export function loadGraphFile(abs: string, rel: string): LoadedWorkflow {
    if (!existsSync(abs)) {
        workflowError(`workflow 文件不存在：${rel}`, { path: rel });
    }
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(abs, "utf8"));
    } catch (e) {
        workflowError(`${rel} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`, { path: rel });
    }
    // 解析与结构校验
    const parsed = parseGraph(raw);
    if (hasGraphErrors(parsed.issues)) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: `${rel} 结构非法`,
            details: { path: rel, issues: parsed.issues },
        });
    }
    return { abs, rel, graph: parsed.graph, sha256: graphSha256(parsed.graph) };
}

/**
 * 原子保存工作流图。
 */
export function saveGraphFile(abs: string, graph: WorkflowGraph): void {
    writeFileAtomic(abs, JSON.stringify(graph, null, 2) + "\n");
}

/**
 * bindings 文件路径：<name>.json -> <name>.bindings.json。
 */
export function bindingsPathOf(workflowAbs: string): string {
    return workflowAbs.endsWith(".json")
        ? workflowAbs.slice(0, -".json".length) + BINDINGS_SUFFIX
        : workflowAbs + BINDINGS_SUFFIX;
}

/**
 * 读取 bindings；不存在返回 null。
 */
export function loadBindings(workflowAbs: string): Bindings | null {
    // bindings 文件路径
    const file = bindingsPathOf(workflowAbs);
    if (!existsSync(file)) return null;
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: `${file} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
            details: { path: file },
        });
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: `${file} 必须是对象：{ "<logical>": "<nodeId>.<input>" }`,
        });
    }
    // 逐项校验映射值
    for (const [logical, target] of Object.entries(raw)) {
        if (typeof target !== "string" || !/^[^.]+\.\S+$/.test(target)) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: `${file} 的 "${logical}" 必须是 "nodeId.input"（收到 ${JSON.stringify(target)}）`,
            });
        }
    }
    return raw as Bindings;
}

/**
 * 校验 bindings 的目标节点/输入是否存在于图。
 */
export function validateBindings(graph: WorkflowGraph, bindings: Bindings | null, path = "bindings"): GraphIssue[] {
    if (bindings === null) return [];
    // 收集到的问题
    const issues: GraphIssue[] = [];
    // 已占用的输入（检测重复映射）
    const seen = new Map<string, string>();
    for (const [logical, target] of Object.entries(bindings)) {
        // 拆分 nodeId.input
        const dot = target.indexOf(".");
        // 目标节点 ID
        const nodeId = target.slice(0, dot);
        // 目标输入名
        const input = target.slice(dot + 1);
        // 目标节点
        const node = graph[nodeId];
        if (node === undefined) {
            issues.push({
                path: `${path}.${logical}`,
                code: "binding_node_missing",
                severity: "error",
                message: `binding "${logical}" 指向不存在的节点 ${nodeId}`,
                hint: `当前节点：${Object.keys(graph).sort().join(", ") || "（空图）"}`,
            });
            continue;
        }
        if (input === "") {
            issues.push({
                path: `${path}.${logical}`,
                code: "binding_input_invalid",
                severity: "error",
                message: `binding "${logical}" 缺少输入名`,
                hint: "格式：nodeId.input",
            });
            continue;
        }
        if (seen.has(target)) {
            issues.push({
                path: `${path}.${logical}`,
                code: "binding_duplicate",
                severity: "warning",
                message: `"${logical}" 与 "${seen.get(target)}" 指向同一输入 ${target}`,
                hint: "后写入的逻辑值会覆盖前一个。",
            });
        } else {
            seen.set(target, logical);
        }
    }
    return issues;
}

/**
 * 拆分 "nodeId.input"（在第一个点处切分）。
 */
export function splitNodeInput(key: string): { node: string; input: string } {
    // 第一个点的位置
    const dot = key.indexOf(".");
    if (dot <= 0 || dot === key.length - 1) {
        workflowError(`非法输入键 "${key}"（应为 nodeId.input）`, { key });
    }
    return { node: key.slice(0, dot), input: key.slice(dot + 1) };
}

/**
 * 对图应用 machine overrides（修改传入的副本）。
 */
export function applyMachineOverrides(
    graph: WorkflowGraph,
    machine: MachineConfig | null,
    workflowRel: string,
): { graph: WorkflowGraph; applied: Record<string, JsonValue>; issues: GraphIssue[] } {
    // 工作副本
    const work = cloneGraph(graph);
    // 命中的覆盖项
    const applied: Record<string, JsonValue> = {};
    // 问题列表
    const issues: GraphIssue[] = [];
    // 本 workflow 的覆盖表
    const overrides = machine?.overrides?.[workflowRel];
    if (overrides === undefined) return { graph: work, applied, issues };
    for (const [key, value] of Object.entries(overrides)) {
        // 拆分 nodeId.input
        const { node, input } = splitNodeInput(key);
        // 目标节点
        const target = work[node];
        if (target === undefined) {
            issues.push({
                path: `${workflowRel}:${key}`,
                code: "override_node_missing",
                severity: "error",
                message: `machine overrides 指向不存在的节点 ${node}`,
                hint: "修正 .dycli/machine.json 的 overrides。",
            });
            continue;
        }
        target.inputs[input] = value;
        applied[key] = value;
    }
    return { graph: work, applied, issues };
}

/**
 * 解析 --set 键：优先 nodeId.input，其次 bindings 逻辑名。
 */
export function resolveSetKey(
    graph: WorkflowGraph,
    bindings: Bindings | null,
    key: string,
): { node: string; input: string; logical: string | null } {
    // 第一个点之前的部分
    const dot = key.indexOf(".");
    if (dot > 0) {
        // 候选节点 ID
        const nodeId = key.slice(0, dot);
        if (graph[nodeId] !== undefined) {
            return { node: nodeId, input: key.slice(dot + 1), logical: null };
        }
    }
    // bindings 逻辑名
    const target = bindings?.[key];
    if (target !== undefined) {
        const { node, input } = splitNodeInput(target);
        return { node, input, logical: key };
    }
    workflowError(`--set 的键 "${key}" 既不是已有节点输入，也不是 bindings 逻辑名`, {
        key,
        nodes: Object.keys(graph).sort(),
        logical_inputs: Object.keys(bindings ?? {}),
    });
}

/**
 * 应用 --set 覆盖。
 */
export function applySets(
    graph: WorkflowGraph,
    bindings: Bindings | null,
    sets: Record<string, JsonValue>,
): { graph: WorkflowGraph; applied: Record<string, JsonValue>; issues: GraphIssue[] } {
    // 工作副本
    const work = cloneGraph(graph);
    // 已应用项
    const applied: Record<string, JsonValue> = {};
    // 问题列表
    const issues: GraphIssue[] = [];
    for (const [key, value] of Object.entries(sets)) {
        // 解析键
        const { node, input } = resolveSetKey(work, bindings, key);
        // 目标节点
        const target = work[node];
        if (target === undefined) {
            issues.push({
                path: `--set ${key}`,
                code: "set_node_missing",
                severity: "error",
                message: `--set 指向不存在的节点 ${node}`,
                hint: "先用 workflow show 查看节点 ID。",
            });
            continue;
        }
        target.inputs[input] = value;
        applied[key] = value;
    }
    return { graph: work, applied, issues };
}

/**
 * 把逻辑输入值写入图（shot recipe 用）：只写 bindings 中存在的逻辑名。
 */
export function applyLogicalValues(
    graph: WorkflowGraph,
    bindings: Bindings | null,
    values: Record<string, JsonValue>,
): { graph: WorkflowGraph; applied: Record<string, JsonValue>; unmapped: string[]; issues: GraphIssue[] } {
    // 工作副本
    const work = cloneGraph(graph);
    // 已应用项
    const applied: Record<string, JsonValue> = {};
    // bindings 未覆盖的逻辑名
    const unmapped: string[] = [];
    // 问题列表
    const issues: GraphIssue[] = [];
    for (const [logical, value] of Object.entries(values)) {
        if (value === undefined) continue;
        // binding 目标
        const target = bindings?.[logical];
        if (target === undefined) {
            unmapped.push(logical);
            continue;
        }
        // 拆分 nodeId.input
        const { node, input } = splitNodeInput(target);
        // 目标节点
        const dest = work[node];
        if (dest === undefined) {
            issues.push({
                path: `bindings.${logical}`,
                code: "binding_node_missing",
                severity: "error",
                message: `binding "${logical}" 指向不存在的节点 ${node}`,
                hint: "修正 bindings 文件。",
            });
            continue;
        }
        dest.inputs[input] = value;
        applied[logical] = value;
    }
    return { graph: work, applied, unmapped, issues };
}

/**
 * 合成最终提交图：workflow < machine overrides < sets。
 */
export function composeGraph(opts: {
    graph: WorkflowGraph;
    bindings: Bindings | null;
    machine: MachineConfig | null;
    workflowRel: string;
    sets?: Record<string, JsonValue>;
}): { graph: WorkflowGraph; overrides: Record<string, JsonValue>; issues: GraphIssue[]; sha256: string } {
    // 先套 machine overrides
    const over = applyMachineOverrides(opts.graph, opts.machine, opts.workflowRel);
    // 再套 --set
    const set = applySets(over.graph, opts.bindings, opts.sets ?? {});
    // 合并后的覆盖记录（--set 覆盖同名键）
    const overrides: Record<string, JsonValue> = { ...over.applied, ...set.applied };
    // 合并问题
    const issues = [...over.issues, ...set.issues];
    return { graph: set.graph, overrides, issues, sha256: graphSha256(set.graph) };
}

/**
 * bindings 覆盖的输入集合（"nodeId.input"），用于 validate 避免误报必填缺失。
 */
export function bindingTargets(bindings: Bindings | null): Set<string> {
    return new Set(Object.values(bindings ?? {}));
}

/**
 * 用节点目录做在线图校验（validate 与 preflight 共用）：
 *  - 节点类是否存在于 /object_info；
 *  - 必填输入是否齐全（bindings 会注入的输入视为已提供）；
 *  - loader 类输入的值是否在枚举中（model_not_found；bindings 覆盖的输入跳过）。
 */
export function validateGraphWithCatalog(
    graph: WorkflowGraph,
    catalog: NodeCatalog,
    provided: ReadonlySet<string> = new Set(),
): GraphIssue[] {
    // 收集到的问题
    const issues: GraphIssue[] = [];
    for (const [nodeId, node] of Object.entries(graph)) {
        // 节点定义（缺失 = 引擎没有该节点类）
        const def = extractNodeDef(catalog.raw, node.class_type);
        if (def === null) {
            issues.push({
                path: nodeId,
                code: "node_missing",
                severity: "error",
                message: `引擎缺少节点类 ${node.class_type}`,
                hint: "安装对应 custom node，或把该节点替换为已有节点。",
            });
            continue;
        }
        for (const input of def.inputs) {
            // 该输入是否由 bindings / --set 在执行时注入
            const injected = provided.has(`${nodeId}.${input.name}`);
            // 当前输入值
            const value = node.inputs[input.name];
            if (input.required && value === undefined && !injected) {
                issues.push({
                    path: `${nodeId}.inputs.${input.name}`,
                    code: "graph_required_input_missing",
                    severity: "error",
                    message: `${node.class_type}.${input.name} 是必填输入但未设置`,
                    hint: "用 workflow set / apply 补上该输入，或连接上游节点。",
                });
                continue;
            }
            // loader 枚举检查：只检查字面量字符串；bindings 覆盖的输入跳过
            if (
                !injected &&
                input.options !== undefined &&
                typeof value === "string" &&
                isLoaderInput(input.name) &&
                !input.options.includes(value)
            ) {
                issues.push({
                    path: `${nodeId}.inputs.${input.name}`,
                    code: "model_not_found",
                    severity: "error",
                    message: `${node.class_type}.${input.name} = "${value}" 不在引擎可见的模型列表中`,
                    hint: `可用值（前 8 个）：${input.options.slice(0, 8).join(", ")}；检查 modelpath / 文件名。`,
                });
            }
        }
    }
    return issues;
}

/**
 * 是否是模型加载类输入（用于 model_not_found 的精准提示）。
 */
function isLoaderInput(name: string): boolean {
    return /(^|_)(ckpt|unet|clip|vae|lora|controlnet|upscale|style_model|gligen|photomaker)_name$/.test(name);
}

/**
 * 把问题列表转成执行前的错误（取第一条 error）。
 */
export function throwOnErrors(issues: readonly GraphIssue[], fallbackMessage: string): void {
    // 首个 error
    const first = issues.find((i) => i.severity === "error");
    if (first === undefined) return;
    throw new DaoyanCliError({
        code: first.code === "node_missing" || first.code === "model_not_found" ? first.code : "workflow_invalid",
        message: `${fallbackMessage}：${first.message}`,
        details: { issues },
    });
}

/**
 * 工作流相对路径推导（从绝对路径回到项目相对路径）。
 */
export function relWorkflow(root: string, abs: string): string {
    return abs.startsWith(root)
        ? abs
              .slice(root.length + 1)
              .split("\\")
              .join("/")
        : abs;
}

/**
 * bindings 文件相对项目根的位置（用于错误提示）。
 */
export function bindingsRel(root: string, workflowAbs: string): string {
    // bindings 文件的绝对路径
    const file = bindingsPathOf(workflowAbs);
    return dirname(relWorkflow(root, join(file))) === "." ? relWorkflow(root, file) : relWorkflow(root, file);
}
