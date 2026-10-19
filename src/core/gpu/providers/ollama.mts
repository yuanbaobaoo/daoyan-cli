/** ollama 适配器 —— 卸载/重载模型，保留服务与容器。
 *  host/netns 走 /api/ps + /api/generate；exec 通道走容器内 `ollama ps` / `ollama stop` / `ollama run`。 */
import { channelFetch } from "../channel.mts";
import { containerExec } from "../container-exec.mts";
import type { ProviderChannel } from "../targets.mts";

// 默认端口（容器内与宿主机一致）
const BASE = "http://127.0.0.1:11434";

/**
 * 宿主机默认通道。
 */
export const HOST_CHANNEL: ProviderChannel = { kind: "host", base_url: BASE };

/**
 * 解析 /api/ps 响应。
 */
function parsePs(raw: unknown): string[] {
    const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
    if (!Array.isArray(data.models)) return [];
    // 已加载模型名
    const names: string[] = [];
    for (const m of data.models) {
        if (typeof m !== "object" || m === null) continue;
        // 条目
        const o = m as Record<string, unknown>;
        const name = typeof o.name === "string" ? o.name : typeof o.model === "string" ? o.model : "";
        if (name === "") continue;
        // size_vram 为 0 表示未在 GPU 上
        if (typeof o.size_vram === "number" && o.size_vram <= 0) continue;
        names.push(name);
    }
    return names;
}

/**
 * 通过 /api/ps 探测已加载模型。
 */
async function detectHttp(channel: ProviderChannel): Promise<string[] | null> {
    const res = await channelFetch(channel, { path: "/api/ps", timeoutMs: 2_000 });
    if (res === null || !res.ok) return null;
    try {
        return parsePs(JSON.parse(res.text) as unknown);
    } catch {
        return null;
    }
}

/**
 * 通过容器内 `ollama ps` 探测已加载模型。
 */
async function detectExec(channel: Extract<ProviderChannel, { kind: "exec" }>): Promise<string[] | null> {
    const r = await containerExec(channel, ["ollama", "ps"], 10_000);
    if (r === null || r.code !== 0) return null;
    // 表格输出：NAME ID SIZE PROCESSOR CONTEXT UNTIL
    const names: string[] = [];
    for (const rawLine of r.stdout.split("\n")) {
        const line = rawLine.trim();
        if (line === "" || /^NAME\b/i.test(line) || /^No models/i.test(line)) continue;
        const name = line.split(/\s+/)[0];
        if (name !== undefined && name !== "") names.push(name);
    }
    return names;
}

/**
 * 探测已加载模型；不可达返回 null。
 */
export async function detect(channel: ProviderChannel): Promise<string[] | null> {
    if (channel.kind === "exec") return detectExec(channel);
    return detectHttp(channel);
}

/**
 * 卸载模型（保留 ollama 进程/容器）。
 */
export async function unload(channel: ProviderChannel, models: string[]): Promise<{ ok: string[]; errors: string[] }> {
    // 结果
    const ok: string[] = [];
    const errors: string[] = [];
    for (const model of models) {
        if (channel.kind === "exec") {
            // 容器内 CLI
            const r = await containerExec(channel, ["ollama", "stop", model], 20_000);
            if (r !== null && r.code === 0) ok.push(model);
            else {
                errors.push(
                    `ollama:${model} 卸载失败（${r === null ? "容器内 ollama 不可用" : r.stderr.trim().slice(0, 200)}）`,
                );
            }
            continue;
        }
        // host / netns HTTP
        const res = await channelFetch(channel, {
            path: "/api/generate",
            method: "POST",
            body: { model, keep_alive: 0, stream: false },
            timeoutMs: 15_000,
        });
        if (res === null) errors.push(`ollama:${model} 卸载失败（通道不可达）`);
        else if (!res.ok) errors.push(`ollama:${model} 卸载失败（HTTP ${res.status}）`);
        else ok.push(model);
    }
    return { ok, errors };
}

/**
 * 重新加载模型（保留 ollama 进程/容器）。
 */
export async function load(
    channel: ProviderChannel,
    models: string[],
): Promise<{ restored: string[]; errors: string[] }> {
    // 结果
    const restored: string[] = [];
    const errors: string[] = [];
    for (const model of models) {
        if (channel.kind === "exec") {
            // 容器内 CLI：空 prompt 触发加载，keep_alive 5m
            const r = await containerExec(channel, ["ollama", "run", model, "--keepalive", "5m", ""], 120_000);
            if (r !== null && r.code === 0) restored.push(model);
            else {
                errors.push(
                    `ollama:${model} 重载失败（${r === null ? "容器内 ollama 不可用" : r.stderr.trim().slice(0, 200)}）`,
                );
            }
            continue;
        }
        // host / netns HTTP
        const res = await channelFetch(channel, {
            path: "/api/generate",
            method: "POST",
            body: { model, prompt: "", stream: false, keep_alive: "5m" },
            timeoutMs: 60_000,
        });
        if (res === null) errors.push(`ollama:${model} 重载失败（通道不可达）`);
        else if (!res.ok) errors.push(`ollama:${model} 重载失败（HTTP ${res.status}）`);
        else restored.push(model);
    }
    return { restored, errors };
}
