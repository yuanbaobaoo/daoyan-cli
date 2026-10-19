/** LM Studio 适配器 —— 优先使用 `lms` CLI（ps / unload / load）。
 *  CLI 不存在或输出不兼容时返回 null，代表该目标不可接管（不报错）。 */
import { tryExecCapture } from "../../../shared/exec.mts";

/**
 * 从 lms ps 的 JSON 输出里提取已加载模型标识。
 */
function extractModels(raw: unknown): string[] {
  // 数组或 {models: []}
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw !== null && Array.isArray((raw as Record<string, unknown>).models)
      ? ((raw as Record<string, unknown>).models as unknown[])
      : null;
  if (arr === null) return [];
  // 模型标识
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    // 条目宽松视图
    const o = item as Record<string, unknown>;
    const id =
      (typeof o.identifier === "string" && o.identifier) ||
      (typeof o.modelKey === "string" && o.modelKey) ||
      (typeof o.model === "string" && o.model) ||
      (typeof o.path === "string" && o.path) ||
      "";
    if (id !== "") out.push(id);
  }
  return out;
}

/**
 * 探测已加载模型；lms 不存在/失败返回 null。
 */
export async function detect(): Promise<string[] | null> {
  // lms ps --json
  const r = await tryExecCapture("lms", ["ps", "--json"], { timeoutMs: 5_000 });
  if (r === null || r.code !== 0) return null;
  try {
    return extractModels(JSON.parse(r.stdout));
  } catch {
    return null;
  }
}

/**
 * 卸载模型（保留 LM Studio 进程）。
 */
export async function unload(models: string[]): Promise<{ ok: string[]; errors: string[] }> {
  // 结果
  const ok: string[] = [];
  const errors: string[] = [];
  for (const model of models) {
    // lms unload <model>
    const r = await tryExecCapture("lms", ["unload", model], { timeoutMs: 20_000 });
    if (r !== null && r.code === 0) ok.push(model);
    else errors.push(`lmstudio:${model} 卸载失败（${r === null ? "lms 不可用" : r.stderr.slice(0, 200)}）`);
  }
  return { ok, errors };
}

/**
 * 重新加载模型。
 */
export async function load(models: string[]): Promise<{ restored: string[]; errors: string[] }> {
  // 结果
  const restored: string[] = [];
  const errors: string[] = [];
  for (const model of models) {
    // lms load <model>
    const r = await tryExecCapture("lms", ["load", model], { timeoutMs: 120_000 });
    if (r !== null && r.code === 0) restored.push(model);
    else errors.push(`lmstudio:${model} 重载失败（${r === null ? "lms 不可用" : r.stderr.slice(0, 200)}）`);
  }
  return { restored, errors };
}
