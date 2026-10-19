/** vLLM 适配器 —— 只使用 sleep mode 卸载/恢复模型，不停止服务或容器。
 *  host/netns 走 /is_sleeping、/sleep?level=1、/wake_up；
 *  exec 通道用容器内 Python 调同一组接口。
 *  需要服务启动时开启 --enable-sleep-mode 与 VLLM_SERVER_DEV_MODE=1，否则视为不支持。 */
import { channelFetch } from "../channel.mts";
import { containerExec } from "../container-exec.mts";
import type { ExecResult } from "../../../shared/exec.mts";
import type { ProviderChannel } from "../targets.mts";

// 默认端口
const BASE = "http://127.0.0.1:8000";

/**
 * 宿主机默认通道。
 */
export const HOST_CHANNEL: ProviderChannel = { kind: "host", base_url: BASE };

/**
 * 解析 /is_sleeping 响应。
 */
function parseSleeping(text: string): boolean | null {
    // 纯文本 true/false
    const raw = text.trim().toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
    try {
        // JSON 对象
        const data = JSON.parse(text) as unknown;
        if (typeof data === "boolean") return data;
        if (typeof data === "object" && data !== null) {
            const o = data as Record<string, unknown>;
            if (typeof o.is_sleeping === "boolean") return o.is_sleeping;
            if (typeof o.sleeping === "boolean") return o.sleeping;
        }
    } catch {
        // 非 JSON
    }
    return null;
}

// 容器内 Python：通用 HTTP 请求，输出状态码 + 响应文本
const PY_HTTP = [
    "import sys, urllib.request, urllib.error",
    "method, url, body = sys.argv[1], sys.argv[2], sys.argv[3]",
    "data = body.encode() if body else None",
    "req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})",
    "try:",
    "    with urllib.request.urlopen(req, timeout=5) as r:",
    "        print(r.status)",
    "        sys.stdout.write(r.read().decode())",
    "except urllib.error.HTTPError as e:",
    "    print(e.code)",
    "    sys.stdout.write(e.read().decode())",
    "except Exception as e:",
    "    sys.stderr.write(str(e))",
    "    sys.exit(1)",
].join("\n");

/**
 * 在容器内执行 Python；python3 不存在时回退 python。
 */
async function runPython(
    channel: Extract<ProviderChannel, { kind: "exec" }>,
    args: string[],
    timeoutMs: number,
): Promise<ExecResult | null> {
    // 最后一次结果
    let last: ExecResult | null = null;
    for (const python of ["python3", "python"]) {
        const r = await containerExec(channel, [python, "-c", PY_HTTP, ...args], timeoutMs);
        if (r === null) continue;
        if (r.code === 0) return r;
        if (r.code === 127 || /not found|No such file|executable file not found/i.test(r.stderr)) {
            last = r;
            continue;
        }
        return r;
    }
    return last;
}

/**
 * 容器内 HTTP。
 */
async function pythonHttp(
    channel: Extract<ProviderChannel, { kind: "exec" }>,
    method: string,
    path: string,
    body: unknown,
    timeoutMs: number,
): Promise<{ status: number; text: string } | null> {
    // body 参数
    const bodyArg = body !== undefined ? JSON.stringify(body) : "";
    const r = await runPython(channel, [method, `${BASE}${path}`, bodyArg], timeoutMs + 5_000);
    if (r === null || r.code !== 0) return null;
    // 第一行状态码，其余为响应文本
    const nl = r.stdout.indexOf("\n");
    const statusLine = nl >= 0 ? r.stdout.slice(0, nl) : r.stdout;
    const text = nl >= 0 ? r.stdout.slice(nl + 1) : "";
    const status = Number(statusLine.trim());
    if (!Number.isFinite(status)) return null;
    return { status, text };
}

/**
 * 探测 sleep 能力与当前状态。
 * 返回 ["sleep"] 表示可 sleep 且当前未 sleep；[] 表示已经 sleep；null 表示不支持/不可达。
 */
export async function detect(channel: ProviderChannel): Promise<string[] | null> {
    if (channel.kind === "exec") {
        const res = await pythonHttp(channel, "GET", "/is_sleeping", undefined, 5_000);
        if (res === null || res.status === 404 || res.status === 400) return null;
        if (res.status < 200 || res.status >= 300) return null;
        const sleeping = parseSleeping(res.text);
        if (sleeping === null) return null;
        return sleeping ? [] : ["sleep"];
    }
    const res = await channelFetch(channel, { path: "/is_sleeping", timeoutMs: 3_000 });
    if (res === null || res.status === 404 || res.status === 400) return null;
    if (!res.ok) return null;
    const sleeping = parseSleeping(res.text);
    if (sleeping === null) return null;
    return sleeping ? [] : ["sleep"];
}

/**
 * 进入 sleep（卸载模型权重/显存）；不停止服务或容器。
 */
export async function unload(channel: ProviderChannel, models: string[]): Promise<{ ok: string[]; errors: string[] }> {
    // 没有模型列表，sleep 一次即可
    if (models.length === 0) return { ok: [], errors: [] };
    if (channel.kind === "exec") {
        const res = await pythonHttp(channel, "POST", "/sleep?level=1", {}, 30_000);
        if (res !== null && res.status >= 200 && res.status < 300) return { ok: models, errors: [] };
        return {
            ok: [],
            errors: [
                `vllm 卸载失败（${
                    res === null
                        ? "容器内 Python 不可用"
                        : `HTTP ${res.status}；需 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1`
                }）`,
            ],
        };
    }
    const res = await channelFetch(channel, {
        path: "/sleep?level=1",
        method: "POST",
        body: {},
        timeoutMs: 30_000,
    });
    if (res !== null && res.ok) return { ok: models, errors: [] };
    return {
        ok: [],
        errors: [
            `vllm 卸载失败（${
                res === null ? "通道不可达" : `HTTP ${res.status}；需 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1`
            }）`,
        ],
    };
}

/**
 * wake_up（恢复显存/权重）；不停止服务或容器。
 */
export async function load(
    channel: ProviderChannel,
    models: string[],
): Promise<{ restored: string[]; errors: string[] }> {
    if (models.length === 0) return { restored: [], errors: [] };
    if (channel.kind === "exec") {
        const res = await pythonHttp(channel, "POST", "/wake_up", {}, 120_000);
        if (res !== null && res.status >= 200 && res.status < 300) return { restored: models, errors: [] };
        return {
            restored: [],
            errors: [`vllm 恢复失败（${res === null ? "容器内 Python 不可用" : `HTTP ${res.status}`}）`],
        };
    }
    const res = await channelFetch(channel, {
        path: "/wake_up",
        method: "POST",
        body: {},
        timeoutMs: 120_000,
    });
    if (res !== null && res.ok) return { restored: models, errors: [] };
    return {
        restored: [],
        errors: [`vllm 恢复失败（${res === null ? "通道不可达" : `HTTP ${res.status}`}）`],
    };
}
