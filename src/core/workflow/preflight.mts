/** 任务预检 —— 提交前用 /object_info 做在线权威校验，并刷新节点目录缓存。
 *  检查：节点类存在、必填输入齐全、loader 枚举值可见。
 *  不预测显存；显存不足由 ComfyUI 实际加载结果决定（engine_oom）。 */
import type { ComfyClient } from "../comfy/client.mts";
import { DaoyanCliError } from "../../shared/errors.mts";
import type { GraphIssue, WorkflowGraph } from "./graph.mts";
import type { RunRecord } from "../project/types.mts";
import { buildCatalog, comfyVersionOf, writeCatalog, type NodeCatalog } from "./catalog.mts";
import { validateGraphWithCatalog } from "./load.mts";

/**
 * 预检结果。
 */
export interface PreflightResult {
  /**
   * 刷新后的节点目录。
   */
  catalog: NodeCatalog;
  /**
   * 图级在线问题（error 阻断执行）。
   */
  issues: GraphIssue[];
  /**
   * ComfyUI 版本。
   */
  comfyuiVersion: string | null;
  /**
   * /system_stats 的宽松快照。
   */
  systemStats: unknown;
}

/**
 * 拉取 /object_info 并刷新缓存（不做图校验）。
 */
export async function fetchCatalog(
  root: string,
  client: ComfyClient,
  log: (m: string) => void,
): Promise<{
  catalog: NodeCatalog;
  comfyuiVersion: string | null;
  systemStats: unknown;
}> {
  // 系统状态（版本 / 显存快照）；失败不阻断，object_info 才是权威
  let stats: unknown = null;
  try {
    stats = await client.systemStats(30_000);
  } catch {
    stats = null;
  }
  // 节点定义（大响应，超时放宽）
  let raw: Record<string, unknown>;
  try {
    raw = await client.objectInfo(120_000);
  } catch (e) {
    throw new DaoyanCliError({
      code: "engine_unreachable",
      message: `预检失败：无法读取 /object_info（${e instanceof Error ? e.message : String(e)}）`,
    });
  }
  // ComfyUI 版本
  const version = comfyVersionOf(stats);
  // 目录（写缓存供后续离线编辑）
  const catalog = buildCatalog(raw, version);
  writeCatalog(root, catalog);
  log(`预检：节点目录 ${Object.keys(raw).length} 个节点（ComfyUI ${version ?? "unknown"}）`);
  return { catalog, comfyuiVersion: version, systemStats: stats };
}

/**
 * 拉取 /object_info、刷新缓存并校验图。
 */
export async function runPreflight(
  root: string,
  client: ComfyClient,
  graph: WorkflowGraph,
  log: (m: string) => void,
): Promise<PreflightResult> {
  // 目录
  const fetched = await fetchCatalog(root, client, log);
  // 在线图校验
  const issues = validateGraphWithCatalog(graph, fetched.catalog);
  return { ...fetched, issues };
}

/**
 * 从 run record 的 engine 段提炼 cleanup 占位（执行前）。
 */
export function cleanupPending(): RunRecord["engine"]["cleanup"] {
  return null;
}
