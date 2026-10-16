/** GPU 编排契约（evict / restore）——
 *  evict:  k3s crictl 动态发现 Pod IP（宿主机端口不通）→ ollama(/api/ps → keep_alive=0)
 *          与 xinference(DELETE /v1/models/{uid}) 卸载已加载模型 → gpu_state.json 存档；
 *  restore（任务 finally 中调用）: 按存档预热回载 ollama(keep_alive=-1)、重新 launch xinference。
 *  需要 root；非 root 警告降级（--no-evict 显式跳过）。实现在 M1。 */
import { DaoyanCliError } from "../../shared/errors.mts";

/**
 * ollama 一侧的卸载存档（按 Pod IP 记录模型名）。
 */
export interface OllamaEvictRecord {
  /**
   * ollama 容器的 Pod IP。
   */
  ip: string;
  /**
   * 被卸载的模型名列表（restore 时按此回载）。
   */
  names: string[];
}

/**
 * xinference 一侧的卸载存档（按模型 uid 记录）。
 */
export interface XinfEvictRecord {
  /**
   * xinference 容器的 Pod IP。
   */
  ip: string;
  /**
   * 模型 uid（DELETE /v1/models/{uid} 的目标）。
   */
  uid: string;
  /**
   * 模型名（展示用，可空）。
   */
  model_name?: string;
  /**
   * 模型类型（展示用，可空）。
   */
  model_type?: string;
}

/**
 * gpu_state.json 的形状
 */
export interface EvictState {
  /**
   * 存档时间（ISO 字符串）。
   */
  time: string;
  /**
   * ollama 卸载记录（无则 null）。
   */
  ollama: OllamaEvictRecord | null;
  /**
   * xinference 卸载记录（可能多实例）。
   */
  xinference: XinfEvictRecord[];
}

/**
 * 可编排的容器目标。
 */
export type EvictTarget = "ollama" | "xinference";

/**
 * 生成前让路：卸载指定目标的已加载模型并存档（M1 实现）。
 */
export async function gpuEvict(_targets: readonly EvictTarget[]): Promise<EvictState> {
  throw new DaoyanCliError({ code: "not_implemented", message: "GPU 编排在 M1 交付（docs/PLAN.md §6.2）。" });
}

/**
 * 任务后恢复：按存档回载模型（M1 实现）。
 */
export async function gpuRestore(_statePath?: string): Promise<void> {
  throw new DaoyanCliError({ code: "not_implemented", message: "GPU 编排在 M1 交付（docs/PLAN.md §6.2）。" });
}
