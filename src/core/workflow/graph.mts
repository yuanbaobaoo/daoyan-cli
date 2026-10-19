/** 工作流图模型 —— 直接使用 ComfyUI API JSON：{ "<nodeId>": { class_type, inputs } }。
 *  连线编码为 [sourceNodeId, outputIndex]；不包装、不重命名节点，保证与 ComfyUI 导出兼容。 */
import { sha256, stableStringify } from "../../shared/fs.mts";
import type { JsonValue } from "../project/types.mts";

/**
 * 单个节点（ComfyUI API 格式）。
 */
export interface WorkflowNode {
  /**
   * 节点类名（必须存在于 /object_info）。
   */
  class_type: string;
  /**
   * 输入表：字面量或连线 [nodeId, outputIndex]。
   */
  inputs: Record<string, JsonValue>;
}

/**
 * 完整工作流图。
 */
export type WorkflowGraph = Record<string, WorkflowNode>;

/**
 * 一条连线引用。
 */
export type LinkRef = [string, number];

/**
 * 校验问题（结构与图级检查共用）。
 */
export interface GraphIssue {
  /**
   * JSON 路径，如 "6.inputs.clip"。
   */
  path: string;
  /**
   * 稳定问题码（graph_node_invalid / graph_link_invalid / graph_missing_input …）。
   */
  code: string;
  /**
   * 严重级别；error 阻断执行，warning 仅提示。
   */
  severity: "error" | "warning";
  /**
   * 人类可读说明。
   */
  message: string;
  /**
   * 修复建议。
   */
  hint: string;
}

/**
 * 类型守卫：判断值是否为连线引用 [nodeId, outputIndex]。
 */
export function isLink(v: unknown): v is LinkRef {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "string" &&
    typeof v[1] === "number" &&
    Number.isInteger(v[1]) &&
    v[1] >= 0
  );
}

/**
 * 解析并结构校验工作流图；返回图与问题列表（不抛异常，便于 validate 汇总）。
 */
export function parseGraph(raw: unknown): { graph: WorkflowGraph; issues: GraphIssue[] } {
  // 收集到的问题
  const issues: GraphIssue[] = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      graph: {},
      issues: [
        {
          path: "$",
          code: "graph_invalid",
          severity: "error",
          message: "工作流顶层必须是对象（nodeId -> { class_type, inputs }）",
          hint: "使用 ComfyUI 的 Save (API Format) 导出，或 workflow new 创建空图。",
        },
      ],
    };
  }
  // 校验通过的节点表
  const graph: WorkflowGraph = {};
  for (const [nodeId, nodeRaw] of Object.entries(raw)) {
    // 当前节点的定位路径
    const path = nodeId;
    if (nodeId.trim() === "") {
      issues.push({
        path: "$",
        code: "graph_node_id_invalid",
        severity: "error",
        message: "节点 ID 不能为空",
        hint: "节点 ID 使用非空字符串（如 \"4\"）。",
      });
      continue;
    }
    if (typeof nodeRaw !== "object" || nodeRaw === null || Array.isArray(nodeRaw)) {
      issues.push({
        path,
        code: "graph_node_invalid",
        severity: "error",
        message: "节点必须是对象 { class_type, inputs }",
        hint: "检查该节点结构。",
      });
      continue;
    }
    // 节点的宽松视图
    const node = nodeRaw as Record<string, unknown>;
    if (typeof node.class_type !== "string" || node.class_type.trim() === "") {
      issues.push({
        path: `${path}.class_type`,
        code: "graph_node_class_missing",
        severity: "error",
        message: "缺少 class_type",
        hint: "填写 ComfyUI 节点类名（用 workflow nodes 查询）。",
      });
      continue;
    }
    if (node.inputs !== undefined && (typeof node.inputs !== "object" || node.inputs === null || Array.isArray(node.inputs))) {
      issues.push({
        path: `${path}.inputs`,
        code: "graph_node_inputs_invalid",
        severity: "error",
        message: "inputs 必须是对象",
        hint: "inputs 形如 { \"text\": \"a cat\" }。",
      });
      continue;
    }
    graph[nodeId] = {
      class_type: node.class_type,
      inputs: (node.inputs as Record<string, JsonValue> | undefined) ?? {},
    };
  }

  // 第二遍：校验连线端点与输出索引
  for (const [nodeId, node] of Object.entries(graph)) {
    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (!isLink(value)) continue;
      // 连线源节点
      const source = graph[value[0]];
      if (source === undefined) {
        issues.push({
          path: `${nodeId}.inputs.${inputName}`,
          code: "graph_link_source_missing",
          severity: "error",
          message: `连线源节点 ${value[0]} 不存在`,
          hint: "修正连线，或删除该输入后重新连接。",
        });
      }
      if (!Number.isInteger(value[1]) || value[1] < 0) {
        issues.push({
          path: `${nodeId}.inputs.${inputName}`,
          code: "graph_link_output_invalid",
          severity: "error",
          message: `连线输出索引非法：${String(value[1])}`,
          hint: "输出索引从 0 开始，使用整数。",
        });
      }
    }
  }
  return { graph, issues };
}

/**
 * 判断图是否有 error 级问题。
 */
export function hasGraphErrors(issues: readonly GraphIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/**
 * 图的稳定哈希（key 排序后 sha256）。
 */
export function graphSha256(graph: WorkflowGraph): string {
  return sha256(stableStringify(graph));
}

/**
 * 深拷贝图（防止 ops 修改原对象）。
 */
export function cloneGraph(graph: WorkflowGraph): WorkflowGraph {
  return JSON.parse(JSON.stringify(graph)) as WorkflowGraph;
}

/**
 * 统计节点数 / 连线数。
 */
export function graphStats(graph: WorkflowGraph): { nodes: number; links: number } {
  // 连线计数
  let links = 0;
  for (const node of Object.values(graph)) {
    for (const v of Object.values(node.inputs)) {
      if (isLink(v)) links++;
    }
  }
  return { nodes: Object.keys(graph).length, links };
}

/**
 * 节点类名摘要（show 的紧凑输出）。
 */
export function nodeSummaries(graph: WorkflowGraph): Array<{ id: string; class_type: string; inputs: number }> {
  return Object.entries(graph)
    .map(([id, n]) => ({ id, class_type: n.class_type, inputs: Object.keys(n.inputs).length }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/**
 * 找出引用某节点的全部位置。
 */
export function referencesTo(graph: WorkflowGraph, nodeId: string): Array<{ node: string; input: string }> {
  // 收集到的引用位置
  const refs: Array<{ node: string; input: string }> = [];
  for (const [id, node] of Object.entries(graph)) {
    for (const [input, value] of Object.entries(node.inputs)) {
      if (isLink(value) && value[0] === nodeId) refs.push({ node: id, input });
    }
  }
  return refs;
}

/**
 * 节点 ID 按数值/字典序排序（展示用）。
 */
export function sortedNodeIds(graph: WorkflowGraph): string[] {
  return Object.keys(graph).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
