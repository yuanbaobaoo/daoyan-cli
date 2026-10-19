/** LM Studio 适配器 —— 优先使用 `lms` CLI（ps / unload / load），保留服务和容器。
 *  host 通道调用宿主机 lms；exec 通道调用容器内 lms；netns 通道不支持（由 exec 兜底）。 */
import { tryExecCapture } from "../../../shared/exec.mts";
import { containerExec } from "../container-exec.mts";
import type { ProviderChannel } from "../targets.mts";

// 默认端口
const BASE = "http://127.0.0.1:1234";

/**
 * 宿主机默认通道。
 */
export const HOST_CHANNEL: ProviderChannel = { kind: "host", base_url: BASE };

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
 * 宿主机 lms 参数；非默认 host 时附加 --host。
 */
function hostArgs(baseUrl: string, args: string[]): string[] {
    return baseUrl === BASE ? args : [...args, "--host", baseUrl];
}

/**
 * 探测已加载模型；lms 不存在/失败返回 null。
 */
export async function detect(channel: ProviderChannel): Promise<string[] | null> {
    // 容器内执行
    if (channel.kind === "exec") {
        const r = await containerExec(channel, ["lms", "ps", "--json"], 10_000);
        if (r === null || r.code !== 0) return null;
        try {
            return extractModels(JSON.parse(r.stdout) as unknown);
        } catch {
            return null;
        }
    }
    // netns 不单独支持，交给 exec 通道
    if (channel.kind === "netns") return null;
    // 宿主机 CLI
    const r = await tryExecCapture("lms", hostArgs(channel.base_url, ["ps", "--json"]), {
        timeoutMs: 10_000,
    });
    if (r === null || r.code !== 0) return null;
    try {
        return extractModels(JSON.parse(r.stdout) as unknown);
    } catch {
        return null;
    }
}

/**
 * 卸载模型（保留 LM Studio 进程/容器）。
 */
export async function unload(channel: ProviderChannel, models: string[]): Promise<{ ok: string[]; errors: string[] }> {
    // 结果
    const ok: string[] = [];
    const errors: string[] = [];
    for (const model of models) {
        const r =
            channel.kind === "exec"
                ? await containerExec(channel, ["lms", "unload", model], 30_000)
                : channel.kind === "host"
                  ? await tryExecCapture("lms", hostArgs(channel.base_url, ["unload", model]), {
                        timeoutMs: 30_000,
                    })
                  : null;
        if (r !== null && r.code === 0) ok.push(model);
        else {
            errors.push(
                `lmstudio:${model} 卸载失败（${
                    r === null ? "lms 不可用或通道不支持" : r.stderr.trim().slice(0, 200)
                }）`,
            );
        }
    }
    return { ok, errors };
}

/**
 * 重新加载模型（保留 LM Studio 进程/容器）。
 */
export async function load(
    channel: ProviderChannel,
    models: string[],
): Promise<{ restored: string[]; errors: string[] }> {
    // 结果
    const restored: string[] = [];
    const errors: string[] = [];
    for (const model of models) {
        const r =
            channel.kind === "exec"
                ? await containerExec(channel, ["lms", "load", model], 130_000)
                : channel.kind === "host"
                  ? await tryExecCapture("lms", hostArgs(channel.base_url, ["load", model]), {
                        timeoutMs: 130_000,
                    })
                  : null;
        if (r !== null && r.code === 0) restored.push(model);
        else {
            errors.push(
                `lmstudio:${model} 重载失败（${
                    r === null ? "lms 不可用或通道不支持" : r.stderr.trim().slice(0, 200)
                }）`,
            );
        }
    }
    return { restored, errors };
}
