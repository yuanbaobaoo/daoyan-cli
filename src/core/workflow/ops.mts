/** 图操作 —— Agent 的批量编辑接口：add_node / set_input / connect / disconnect /
 *  remove_node / replace_graph。语义：先全量校验，再返回新图；任何一条失败都不修改原图。
 *  写盘由调用方在成功后一次性原子完成。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import type { JsonValue } from "../project/types.mts";
import {
  cloneGraph,
  graphSha256,
  hasGraphErrors,
  isLink,
  parseGraph,
  referencesTo,
  type WorkflowGraph,
  type WorkflowNode,
} from "./graph.mts";
import { extractNodeDef, type NodeCatalog, type NodeDefinition } from "./catalog.mts";

/**
 * 支持的 op 名称。
 */
export type GraphOpKind =
  | "add_node"
  | "set_input"
  | "connect"
  | "disconnect"
  | "remove_node"
  | "replace_graph";

/**
 * add_node 操作。
 */
export interface AddNodeOp {
  /**
   * 固定操作名。
   */
  op: "add_node";
  /**
   * 指定节点 ID；省略时自动分配。
   */
  id?: string;
  /**
   * ComfyUI 节点类名。
   */
  class_type: string;
}

/**
 * set_input 操作。
 */
export interface SetInputOp {
  /**
   * 固定操作名。
   */
  op: "set_input";
  /**
   * 目标节点。
   */
  node: string;
  /**
   * 输入名。
   */
  input: string;
  /**
   * 字面量值（null 合法）。
   */
  value: JsonValue;
}

/**
 * connect 操作。
 */
export interface ConnectOp {
  /**
   * 固定操作名。
   */
  op: "connect";
  /**
   * 连线源。
   */
  from: { node: string; output: number };
  /**
   * 连线目标。
   */
  to: { node: string; input: string };
}

/**
 * disconnect 操作。
 */
export interface DisconnectOp {
  /**
   * 固定操作名。
   */
  op: "disconnect";
  /**
   * 目标节点。
   */
  node: string;
  /**
   * 输入名。
   */
  input: string;
}

/**
 * remove_node 操作。
 */
export interface RemoveNodeOp {
  /**
   * 固定操作名。
   */
  op: "remove_node";
  /**
   * 目标节点。
   */
  node: string;
  /**
   * 删除被引用节点时同时删除关联连线。
   */
  force?: boolean;
}

/**
 * replace_graph 操作。
 */
export interface ReplaceGraphOp {
  /**
   * 固定操作名。
   */
  op: "replace_graph";
  /**
   * 新的完整图。
   */
  graph: WorkflowGraph;
}

/**
 * 单个图操作。
 */
export type GraphOp = AddNodeOp | SetInputOp | ConnectOp | DisconnectOp | RemoveNodeOp | ReplaceGraphOp;

/**
 * 被删除的连线记录。
 */
export interface RemovedLink {
  /**
   * 源节点。
   */
  from_node: string;
  /**
   * 源输出索引。
   */
  output: number;
  /**
   * 目标节点。
   */
  to_node: string;
  /**
   * 目标输入名。
   */
  input: string;
}

/**
 * applyOps 的结果。
 */
export interface ApplyOpsResult {
  /**
   * 应用后的新图（原图未修改）。
   */
  graph: WorkflowGraph;
  /**
   * 成功应用的 op 数。
   */
  applied: number;
  /**
   * 自动分配的节点 ID。
   */
  assigned_ids: Array<{ id: string; class_type: string }>;
  /**
   * 被覆盖/清理的连线。
   */
  removed_links: RemovedLink[];
  /**
   * 非致命提示。
   */
  warnings: Array<{ code: string; message: string; path?: string }>;
  /**
   * 发生变化的节点 ID。
   */
  changed_nodes: string[];
  /**
   * 结果图哈希。
   */
  graph_sha256: string;
}

/**
 * 抛出一条 op 级工作流错误。
 */
function opError(index: number, message: string, details: Record<string, unknown> = {}): never {
  throw new DaoyanCliError({
    code: "workflow_invalid",
    message: `ops[${index}]: ${message}`,
    details: { op_index: index, ...details },
  });
}

/**
 * 读取节点（不存在即抛 op 错误）。
 */
function nodeOf(graph: WorkflowGraph, nodeId: unknown, index: number, label: string): WorkflowNode {
  if (typeof nodeId !== "string" || nodeId === "") opError(index, `${label} 必须是节点 ID 字符串`);
  // 命中的节点
  const node = graph[nodeId];
  if (node === undefined) {
    opError(index, `节点 ${nodeId} 不存在`, {
      hint: `当前节点：${Object.keys(graph).sort().join(", ") || "（空图）"}`,
    });
  }
  return node;
}

/**
 * 校验输入名非空。
 */
function inputNameOf(input: unknown, index: number): string {
  if (typeof input !== "string" || input === "") opError(index, "input 必须是非空字符串");
  return input;
}

/**
 * 枚举/类型提示检查（只产生 warning）。
 */
function checkInputValue(
  def: NodeDefinition | null,
  input: string,
  value: JsonValue,
  index: number,
  warnings: ApplyOpsResult["warnings"],
): void {
  if (def === null) return;
  // 输入定义
  const spec = def.inputs.find((i) => i.name === input);
  if (spec === undefined) {
    warnings.push({
      code: "node_input_unknown",
      message: `${def.class_type} 的输入 "${input}" 不在 /object_info 中；ComfyUI 将最终裁决`,
      path: `ops[${index}]`,
    });
    return;
  }
  if (spec.options !== undefined && typeof value === "string" && !spec.options.includes(value)) {
    warnings.push({
      code: "input_value_not_in_options",
      message: `${def.class_type}.${input} = "${value}" 不在枚举中（${spec.options.slice(0, 8).join(", ")}…）`,
      path: `ops[${index}]`,
    });
  }
  if (spec.types.includes("INT") && (typeof value !== "number" || !Number.isInteger(value))) {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} 期望 INT（收到 ${JSON.stringify(value)}）`,
      path: `ops[${index}]`,
    });
  } else if (spec.types.includes("FLOAT") && typeof value !== "number") {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} 期望 FLOAT（收到 ${JSON.stringify(value)}）`,
      path: `ops[${index}]`,
    });
  } else if (spec.types.includes("BOOLEAN") && typeof value !== "boolean") {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} 期望 BOOLEAN（收到 ${JSON.stringify(value)}）`,
      path: `ops[${index}]`,
    });
  } else if (spec.types.includes("STRING") && typeof value !== "string") {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} 期望 STRING（收到 ${JSON.stringify(value)}）`,
      path: `ops[${index}]`,
    });
  }
}

/**
 * 从目录里取节点定义（无目录返回 null）。
 */
function defOf(catalog: NodeCatalog | null, classType: string): NodeDefinition | null {
  return catalog === null ? null : extractNodeDef(catalog.raw, classType);
}

/**
 * 自动分配一个最小可用数字 ID。
 */
function assignNodeId(graph: WorkflowGraph): string {
  // 已用数字 ID
  const used = new Set(
    Object.keys(graph)
      .filter((k) => /^\d+$/.test(k))
      .map((k) => Number(k)),
  );
  for (let i = 1; ; i++) {
    if (!used.has(i)) return String(i);
  }
}

/**
 * 应用一批图操作；返回新图与变更摘要（原图保持不变）。
 */
export function applyOps(
  graph: WorkflowGraph,
  ops: readonly GraphOp[],
  catalog: NodeCatalog | null = null,
): ApplyOpsResult {
  // 工作副本（先全量校验，成功后才交给调用方写盘）
  let work = cloneGraph(graph);
  // 自动分配的 ID
  const assignedIds: Array<{ id: string; class_type: string }> = [];
  // 被覆盖/删除的连线
  const removedLinks: RemovedLink[] = [];
  // 非致命提示
  const warnings: ApplyOpsResult["warnings"] = [];
  // 变化节点集合
  const changed = new Set<string>();

  for (let index = 0; index < ops.length; index++) {
    // 当前 op
    const op = ops[index];
    if (op === undefined) continue;
    switch (op.op) {
      case "add_node": {
        if (typeof op.class_type !== "string" || op.class_type === "") {
          opError(index, "class_type 必须是非空字符串");
        }
        // 目标 ID（未指定则自动分配）
        const id = op.id !== undefined && op.id !== "" ? op.id : assignNodeId(work);
        if (work[id] !== undefined) opError(index, `节点 ${id} 已存在`);
        work[id] = { class_type: op.class_type, inputs: {} };
        if (op.id === undefined || op.id === "") assignedIds.push({ id, class_type: op.class_type });
        changed.add(id);
        // 目录存在时提示未知节点类（不阻断分步编辑）
        if (catalog !== null && defOf(catalog, op.class_type) === null) {
          warnings.push({
            code: "node_class_unknown",
            message: `节点类 ${op.class_type} 不在节点目录中；安装对应 custom node 后再执行`,
            path: `ops[${index}]`,
          });
        }
        break;
      }
      case "set_input": {
        // 目标节点
        const node = nodeOf(work, op.node, index, "node");
        // 输入名
        const input = inputNameOf(op.input, index);
        if (op.value === undefined) opError(index, "缺少 value");
        node.inputs[input] = op.value;
        changed.add(op.node);
        checkInputValue(defOf(catalog, node.class_type), input, op.value, index, warnings);
        break;
      }
      case "connect": {
        if (typeof op.from !== "object" || op.from === null) opError(index, "缺少 from");
        if (typeof op.to !== "object" || op.to === null) opError(index, "缺少 to");
        if (typeof op.from.output !== "number" || !Number.isInteger(op.from.output) || op.from.output < 0) {
          opError(index, "from.output 必须是非负整数");
        }
        // 源 / 目标节点
        const from = nodeOf(work, op.from.node, index, "from.node");
        const to = nodeOf(work, op.to.node, index, "to.node");
        // 目标输入名
        const input = inputNameOf(op.to.input, index);
        // 源输出索引提示
        const fromDef = defOf(catalog, from.class_type);
        if (fromDef !== null && op.from.output >= fromDef.outputs.length) {
          warnings.push({
            code: "output_index_unknown",
            message: `${from.class_type} 只有 ${fromDef.outputs.length} 个输出（索引从 0 开始）`,
            path: `ops[${index}]`,
          });
        }
        // 目标已有连线 -> 替换并记录
        const prev = to.inputs[input];
        if (isLink(prev)) {
          removedLinks.push({ from_node: prev[0], output: prev[1], to_node: op.to.node, input });
          warnings.push({
            code: "connection_replaced",
            message: `${op.to.node}.${input} 原有连线 [${prev[0]}, ${prev[1]}] 已被替换`,
            path: `ops[${index}]`,
          });
        }
        to.inputs[input] = [op.from.node, op.from.output];
        changed.add(op.to.node);
        break;
      }
      case "disconnect": {
        // 目标节点
        const node = nodeOf(work, op.node, index, "node");
        // 输入名
        const input = inputNameOf(op.input, index);
        // 当前值
        const cur = node.inputs[input];
        if (cur === undefined) {
          warnings.push({
            code: "disconnect_noop",
            message: `${op.node}.${input} 没有值`,
            path: `ops[${index}]`,
          });
          break;
        }
        if (!isLink(cur)) {
          warnings.push({
            code: "disconnect_not_link",
            message: `${op.node}.${input} 是字面量而非连线；未删除`,
            path: `ops[${index}]`,
          });
          break;
        }
        removedLinks.push({ from_node: cur[0], output: cur[1], to_node: op.node, input });
        delete node.inputs[input];
        changed.add(op.node);
        break;
      }
      case "remove_node": {
        // 目标节点
        nodeOf(work, op.node, index, "node");
        // 指向该节点的引用
        const refs = referencesTo(work, op.node);
        if (refs.length > 0 && op.force !== true) {
          opError(
            index,
            `节点 ${op.node} 仍被 ${refs.length} 处引用；设置 force:true 同时删除关联连线`,
            { references: refs },
          );
        }
        if (op.force === true) {
          for (const ref of refs) {
            // 引用所在节点
            const holder = work[ref.node];
            // 当前连线值
            const value = holder?.inputs[ref.input];
            if (isLink(value)) {
              removedLinks.push({ from_node: value[0], output: value[1], to_node: ref.node, input: ref.input });
            }
            if (holder !== undefined) {
              delete holder.inputs[ref.input];
              changed.add(ref.node);
            }
          }
        }
        delete work[op.node];
        changed.add(op.node);
        break;
      }
      case "replace_graph": {
        // 整图替换（重新走结构校验）
        const parsed = parseGraph(op.graph);
        if (hasGraphErrors(parsed.issues)) {
          opError(index, "replace_graph 的图结构非法", { issues: parsed.issues });
        }
        work = cloneGraph(parsed.graph);
        for (const id of Object.keys(work)) changed.add(id);
        break;
      }
      default: {
        // 未知 op 名（类型层已收窄，这里兜底 JSON 输入）
        opError(index, `未知 op ${String((op as { op?: unknown }).op)}`);
      }
    }
  }

  // 最终结构校验：任何断链都视为失败
  const finalParsed = parseGraph(work);
  if (hasGraphErrors(finalParsed.issues)) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: "图操作后结构非法（已回滚，文件未修改）",
      details: { issues: finalParsed.issues },
    });
  }

  return {
    graph: finalParsed.graph,
    applied: ops.length,
    assigned_ids: assignedIds,
    removed_links: removedLinks,
    warnings,
    changed_nodes: [...changed].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    graph_sha256: graphSha256(finalParsed.graph),
  };
}

/**
 * 解析 ops 文件的 JSON（支持 `{ "ops": [...] }` 或裸数组）。
 */
export function parseOpsPayload(raw: unknown): GraphOp[] {
  // ops 数组（裸数组或包装对象）
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw !== null && Array.isArray((raw as Record<string, unknown>).ops)
      ? ((raw as Record<string, unknown>).ops as unknown[])
      : null;
  if (arr === null) {
    throw new DaoyanCliError({
      code: "usage",
      message: "ops 文件必须是数组或 { \"ops\": [...] }",
      exit: 2,
    });
  }
  // 逐条校验最小形状
  return arr.map((item, i) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      opError(i, "op 必须是对象");
    }
    // 单条 op 的宽松视图
    const o = item as Record<string, unknown>;
    if (typeof o.op !== "string") opError(i, "缺少 op 字段");
    return o as unknown as GraphOp;
  });
}
