/** xinference 适配器 —— 卸载/重载模型实例，保留服务与容器。
 *  host/netns 走 /v1/models；exec 通道用容器内 Python 调用 127.0.0.1:9997。 */
import { channelFetch } from "../channel.mts";
import { containerExec } from "../container-exec.mts";
import type { ExecResult } from "../../../shared/exec.mts";
import type { ProviderChannel } from "../targets.mts";

// 默认端口（容器内与宿主机一致）
const BASE = "http://127.0.0.1:9997";

/**
 * 宿主机默认通道。
 */
export const HOST_CHANNEL: ProviderChannel = { kind: "host", base_url: BASE };

/**
 * 解析 /v1/models 响应。
 */
function parseModels(raw: unknown): string[] {
  // 条目数组
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw !== null && Array.isArray((raw as Record<string, unknown>).data)
      ? ((raw as Record<string, unknown>).data as unknown[])
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
}

/**
 * 在容器内运行 Python；python3 不存在时回退 python。
 */
async function runPython(
  channel: Extract<ProviderChannel, { kind: "exec" }>,
  code: string,
  args: string[],
  timeoutMs: number,
): Promise<ExecResult | null> {
  // 最后一次结果
  let last: ExecResult | null = null;
  for (const python of ["python3", "python"]) {
    const r = await containerExec(channel, [python, "-c", code, ...args], timeoutMs);
    if (r === null) continue;
    if (r.code === 0) return r;
    // 解释器不存在时换下一个
    if (r.code === 127 || /not found|No such file|executable file not found/i.test(r.stderr)) {
      last = r;
      continue;
    }
    return r;
  }
  return last;
}

// 容器内 Python：GET /v1/models
const PY_DETECT = [
  "import sys, urllib.request",
  "base = sys.argv[1]",
  "with urllib.request.urlopen(base + '/v1/models', timeout=3) as r:",
  "    sys.stdout.write(r.read().decode())",
].join("\n");

// 容器内 Python：DELETE /v1/models/<id>
const PY_DELETE = [
  "import sys, urllib.parse, urllib.request",
  "base, model_id = sys.argv[1], sys.argv[2]",
  "url = base + '/v1/models/' + urllib.parse.quote(model_id, safe='')",
  "req = urllib.request.Request(url, method='DELETE')",
  "with urllib.request.urlopen(req, timeout=30) as r:",
  "    sys.stdout.write(r.read().decode())",
].join("\n");

// 容器内 Python：POST /v1/models
const PY_CREATE = [
  "import json, sys, urllib.request",
  "base, model_id = sys.argv[1], sys.argv[2]",
  "data = json.dumps({'model_name': model_id, 'model_type': 'LLM'}).encode()",
  "req = urllib.request.Request(base + '/v1/models', data=data, method='POST', headers={'Content-Type': 'application/json'})",
  "with urllib.request.urlopen(req, timeout=120) as r:",
  "    sys.stdout.write(r.read().decode())",
].join("\n");

/**
 * 探测已加载模型；不可达返回 null。
 */
export async function detect(channel: ProviderChannel): Promise<string[] | null> {
  if (channel.kind === "exec") {
    const r = await runPython(channel, PY_DETECT, [BASE], 10_000);
    if (r === null || r.code !== 0) return null;
    try {
      return parseModels(JSON.parse(r.stdout) as unknown);
    } catch {
      return null;
    }
  }
  const res = await channelFetch(channel, { path: "/v1/models", timeoutMs: 2_000 });
  if (res === null || !res.ok) return null;
  try {
    return parseModels(JSON.parse(res.text) as unknown);
  } catch {
    return null;
  }
}

/**
 * 卸载模型实例（保留 xinference 进程/容器）。
 */
export async function unload(
  channel: ProviderChannel,
  models: string[],
): Promise<{ ok: string[]; errors: string[] }> {
  // 结果
  const ok: string[] = [];
  const errors: string[] = [];
  for (const id of models) {
    if (channel.kind === "exec") {
      const r = await runPython(channel, PY_DELETE, [BASE, id], 40_000);
      if (r !== null && r.code === 0) ok.push(id);
      else {
        errors.push(
          `xinference:${id} 卸载失败（${r === null ? "容器内 Python 不可用" : r.stderr.trim().slice(0, 200)}）`,
        );
      }
      continue;
    }
    const res = await channelFetch(channel, {
      path: `/v1/models/${encodeURIComponent(id)}`,
      method: "DELETE",
      timeoutMs: 30_000,
    });
    if (res === null) errors.push(`xinference:${id} 卸载失败（通道不可达）`);
    else if (!res.ok) errors.push(`xinference:${id} 卸载失败（HTTP ${res.status}）`);
    else ok.push(id);
  }
  return { ok, errors };
}

/**
 * 重新加载模型实例（保留 xinference 进程/容器）。
 */
export async function load(
  channel: ProviderChannel,
  models: string[],
): Promise<{ restored: string[]; errors: string[] }> {
  // 结果
  const restored: string[] = [];
  const errors: string[] = [];
  for (const id of models) {
    if (channel.kind === "exec") {
      const r = await runPython(channel, PY_CREATE, [BASE, id], 130_000);
      if (r !== null && r.code === 0) restored.push(id);
      else {
        errors.push(
          `xinference:${id} 重载失败（${r === null ? "容器内 Python 不可用" : r.stderr.trim().slice(0, 200)}）`,
        );
      }
      continue;
    }
    const res = await channelFetch(channel, {
      path: "/v1/models",
      method: "POST",
      body: { model_name: id, model_type: "LLM" },
      timeoutMs: 120_000,
    });
    if (res === null) errors.push(`xinference:${id} 重载失败（通道不可达）`);
    else if (!res.ok) errors.push(`xinference:${id} 重载失败（HTTP ${res.status}）`);
    else restored.push(id);
  }
  return { restored, errors };
}
