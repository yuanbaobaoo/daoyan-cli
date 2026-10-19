/** ollama 适配器 —— /api/ps 发现已加载模型，/api/generate 卸载（keep_alive=0）与重载。 */
import { fetchWithTimeout } from "../../../shared/net.mts";

// 默认端口（写在代码里，用户无感）
const BASE = "http://127.0.0.1:11434";

/**
 * 探测已加载到 GPU 的模型；服务不可达返回 null。
 */
export async function detect(): Promise<string[] | null> {
  try {
    // /api/ps 响应
    const res = await fetchWithTimeout(`${BASE}/api/ps`, {}, 2_000);
    if (!res.ok) return null;
    // 响应体
    const data = (await res.json()) as { models?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.models)) return [];
    // 已加载模型名
    const names: string[] = [];
    for (const m of data.models) {
      // 模型名（兼容 name / model）
      const name = typeof m.name === "string" ? m.name : typeof m.model === "string" ? m.model : "";
      if (name === "") continue;
      // size_vram 为 0 表示未在 GPU 上
      if (typeof m.size_vram === "number" && m.size_vram <= 0) continue;
      names.push(name);
    }
    return names;
  } catch {
    return null;
  }
}

/**
 * 卸载模型（保留 ollama 进程）。
 */
export async function unload(models: string[]): Promise<{ ok: string[]; errors: string[] }> {
  // 结果
  const ok: string[] = [];
  const errors: string[] = [];
  for (const model of models) {
    try {
      // keep_alive=0 立即卸载
      const res = await fetchWithTimeout(
        `${BASE}/api/generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, keep_alive: 0, stream: false }),
        },
        15_000,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ok.push(model);
    } catch (e) {
      errors.push(`ollama:${model} 卸载失败（${e instanceof Error ? e.message : String(e)}）`);
    }
  }
  return { ok, errors };
}

/**
 * 重新加载模型（空 prompt + keep_alive）。
 */
export async function load(models: string[]): Promise<{ restored: string[]; errors: string[] }> {
  // 结果
  const restored: string[] = [];
  const errors: string[] = [];
  for (const model of models) {
    try {
      // 空 prompt 触发加载，不产生实际生成
      const res = await fetchWithTimeout(
        `${BASE}/api/generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, prompt: "", stream: false, keep_alive: "5m" }),
        },
        60_000,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      restored.push(model);
    } catch (e) {
      errors.push(`ollama:${model} 重载失败（${e instanceof Error ? e.message : String(e)}）`);
    }
  }
  return { restored, errors };
}
