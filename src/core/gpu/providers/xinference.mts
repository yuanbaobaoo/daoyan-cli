/** xinference 适配器 —— GET /v1/models 发现模型实例，DELETE 卸载，POST 重载。
 *  默认端口 9997（内置，用户无感）；不可达返回 null。 */
import { fetchWithTimeout } from "../../../shared/net.mts";

// 默认端口（写在代码里）
const BASE = "http://127.0.0.1:9997";

/**
 * 探测已加载模型；服务不可达返回 null。
 */
export async function detect(): Promise<string[] | null> {
  try {
    // /v1/models 响应
    const res = await fetchWithTimeout(`${BASE}/v1/models`, {}, 2_000);
    if (!res.ok) return null;
    // 响应体（OpenAI 兼容或数组）
    const data = (await res.json()) as unknown;
    // 条目数组
    const arr = Array.isArray(data)
      ? data
      : typeof data === "object" && data !== null && Array.isArray((data as Record<string, unknown>).data)
        ? ((data as Record<string, unknown>).data as unknown[])
        : [];
    // 解析结果（优先实例 id，其次模型名）
    const out: string[] = [];
    for (const item of arr) {
      if (typeof item !== "object" || item === null) continue;
      // 条目宽松视图
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const name = typeof o.model_name === "string" ? o.model_name : id;
      if (id !== "") out.push(id);
      else if (name !== "") out.push(name);
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * 卸载模型实例（保留 xinference 进程）。
 */
export async function unload(models: string[]): Promise<{ ok: string[]; errors: string[] }> {
  // 结果
  const ok: string[] = [];
  const errors: string[] = [];
  for (const id of models) {
    try {
      // DELETE 实例
      const res = await fetchWithTimeout(
        `${BASE}/v1/models/${encodeURIComponent(id)}`,
        { method: "DELETE" },
        30_000,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ok.push(id);
    } catch (e) {
      errors.push(`xinference:${id} 卸载失败（${e instanceof Error ? e.message : String(e)}）`);
    }
  }
  return { ok, errors };
}

/**
 * 重新加载模型实例（model_type 未知时按 LLM 提交，best-effort）。
 */
export async function load(models: string[]): Promise<{ restored: string[]; errors: string[] }> {
  // 结果
  const restored: string[] = [];
  const errors: string[] = [];
  for (const id of models) {
    try {
      // POST 创建实例
      const res = await fetchWithTimeout(
        `${BASE}/v1/models`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model_name: id, model_type: "LLM" }),
        },
        120_000,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      restored.push(id);
    } catch (e) {
      errors.push(`xinference:${id} 重载失败（${e instanceof Error ? e.message : String(e)}）`);
    }
  }
  return { restored, errors };
}
