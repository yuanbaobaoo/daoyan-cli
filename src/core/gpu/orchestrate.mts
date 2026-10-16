/** GPU 编排契约（evict / restore）——
 *  evict:  k3s crictl 动态发现 Pod IP（宿主机端口不通）→ ollama(/api/ps → keep_alive=0)
 *          与 xinference(DELETE /v1/models/{uid}) 卸载已加载模型 → gpu_state.json 存档；
 *  restore（任务 finally 中调用）: 按存档预热回载 ollama(keep_alive=-1)、重新 launch xinference。
 *  需要 root；非 root 警告降级（--no-evict 显式跳过）。实现在 M1。 */
import { DaoyanCliError } from "../../shared/errors.mts";

export interface OllamaEvictRecord {
  ip: string;
  names: string[];
}

export interface XinfEvictRecord {
  ip: string;
  uid: string;
  model_name?: string;
  model_type?: string;
}

/** gpu_state.json 的形状 */
export interface EvictState {
  time: string;
  ollama: OllamaEvictRecord | null;
  xinference: XinfEvictRecord[];
}

export type EvictTarget = "ollama" | "xinference";

export async function gpuEvict(_targets: readonly EvictTarget[]): Promise<EvictState> {
  throw new DaoyanCliError({ code: "not_implemented", message: "GPU 编排在 M1 交付（docs/PLAN.md §6.2）。" });
}

export async function gpuRestore(_statePath?: string): Promise<void> {
  throw new DaoyanCliError({ code: "not_implemented", message: "GPU 编排在 M1 交付（docs/PLAN.md §6.2）。" });
}
