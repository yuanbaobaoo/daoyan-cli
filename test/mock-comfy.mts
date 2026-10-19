/** 假 ComfyUI HTTP server —— 集成测试与本地冒烟用。
 *  覆盖本 CLI 使用的全部端点：system_stats / object_info / queue / prompt /
 *  history / upload/image / view / free / interrupt。 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * mock 的节点定义（带一个 loader 枚举，便于测试 model_not_found）。
 */
export const MOCK_OBJECT_INFO: Record<string, unknown> = {
    MockLoader: {
        input: {
            required: {
                ckpt_name: [["a.safetensors", "b.safetensors"], { default: "a.safetensors" }],
            },
        },
        output: ["MODEL"],
        output_name: ["MODEL"],
        name: "MockLoader",
        display_name: "Mock Loader",
        category: "loaders",
        output_node: false,
    },
    MockSampler: {
        input: {
            required: {
                seed: ["INT", { default: 0 }],
                steps: ["INT", { default: 20 }],
            },
        },
        output: ["LATENT"],
        output_name: ["LATENT"],
        name: "MockSampler",
        display_name: "Mock Sampler",
        category: "sampling",
        output_node: false,
    },
    MockSave: {
        input: {
            required: {
                filename_prefix: ["STRING", { default: "out" }],
            },
        },
        output: [],
        output_name: [],
        name: "MockSave",
        display_name: "Mock Save",
        category: "output",
        output_node: true,
    },
    LoadImage: {
        input: {
            required: {
                image: ["STRING", { default: "" }],
            },
        },
        output: ["IMAGE", "MASK"],
        output_name: ["IMAGE", "MASK"],
        name: "LoadImage",
        display_name: "Load Image",
        category: "image",
        output_node: false,
    },
};

/**
 * mock server 配置。
 */
export interface MockComfyOptions {
    /**
     * 监听端口（默认 0 = 随机）。
     */
    port?: number;
    /**
     * /object_info 返回。
     */
    objectInfo?: Record<string, unknown>;
    /**
     * 队列是否忙（true 时 remote session 应返回 engine_busy）。
     */
    busy?: boolean;
    /**
     * /prompt 是否返回 node_errors。
     */
    rejectPrompt?: boolean;
    /**
     * 执行终态：success / error（OOM）。
     */
    result?: "success" | "oom";
    /**
     * 完成延迟（毫秒）。
     */
    completionDelayMs?: number;
    /**
     * /view 返回的字节。
     */
    outputBytes?: Uint8Array;
    /**
     * 产物文件名。
     */
    outputFilename?: string;
}

/**
 * mock server 句柄。
 */
export interface MockComfy {
    /**
     * base URL。
     */
    url: string;
    /**
     * 收到的请求路径（按顺序）。
     */
    calls: string[];
    /**
     * /free 调用次数。
     */
    freeCount: number;
    /**
     * /interrupt 调用次数。
     */
    interruptCount: number;
    /**
     * 上传文件名列表。
     */
    uploads: string[];
    /**
     * 最近一次提交的图。
     */
    lastPrompt: Record<string, unknown> | null;
    /**
     * 关闭 server。
     */
    close: () => Promise<void>;
}

/**
 * 读取请求体。
 */
function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolvePromise, rejectPromise) => {
        let data = "";
        req.on("data", (d: Buffer) => {
            data += d.toString();
        });
        req.on("end", () => resolvePromise(data));
        req.on("error", rejectPromise);
    });
}

/**
 * 发送 JSON。
 */
function json(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
}

/**
 * 启动 mock ComfyUI。
 */
export async function startMockComfy(opts: MockComfyOptions = {}): Promise<MockComfy> {
    // 请求记录
    const calls: string[] = [];
    const uploads: string[] = [];
    // 状态
    let freeCount = 0;
    let interruptCount = 0;
    let lastPrompt: Record<string, unknown> | null = null;
    // prompt id
    const promptId = "p_mock_1";
    // 完成时间（null = 未完成）
    let completedAt: number | null = null;
    // 提交时间
    let submittedAt = 0;
    // 产物文件名
    const outputFilename = opts.outputFilename ?? "mock-output.mp4";
    // 产物字节
    const outputBytes = opts.outputBytes ?? new TextEncoder().encode("mock-video-bytes");

    // HTTP server
    const server: Server = createServer((req, res) => {
        void (async () => {
            try {
                // 请求路径
                const url = new URL(req.url ?? "/", "http://127.0.0.1");
                const path = url.pathname;
                calls.push(path);
                if (path === "/system_stats") {
                    json(res, 200, {
                        system: { comfyui_version: "mock-1.0" },
                        devices: [{ name: "mock", vram_total: 24 * 1024 * 1024 * 1024 }],
                    });
                    return;
                }
                if (path === "/object_info") {
                    json(res, 200, opts.objectInfo ?? MOCK_OBJECT_INFO);
                    return;
                }
                if (path === "/queue") {
                    json(res, 200, {
                        queue_running: opts.busy === true ? [{}] : [],
                        queue_pending: [],
                    });
                    return;
                }
                if (path === "/prompt" && req.method === "POST") {
                    // 提交体
                    const body = JSON.parse(await readBody(req)) as { prompt?: Record<string, unknown> };
                    lastPrompt = body.prompt ?? null;
                    if (opts.rejectPrompt === true) {
                        json(res, 400, { error: "invalid prompt", node_errors: { "1": { errors: ["bad"] } } });
                        return;
                    }
                    submittedAt = Date.now();
                    completedAt = Date.now() + (opts.completionDelayMs ?? 50);
                    json(res, 200, { prompt_id: promptId, number: 1 });
                    return;
                }
                if (path === `/history/${promptId}`) {
                    if (completedAt === null || Date.now() < completedAt) {
                        json(res, 200, {});
                        return;
                    }
                    if (opts.result === "oom") {
                        json(res, 200, {
                            [promptId]: {
                                outputs: {},
                                status: {
                                    completed: false,
                                    status_str: "error",
                                    messages: [["execution_error", { exception_message: "CUDA out of memory" }]],
                                },
                            },
                        });
                        return;
                    }
                    json(res, 200, {
                        [promptId]: {
                            outputs: {
                                "9": {
                                    gifs: [{ filename: outputFilename, subfolder: "", type: "output" }],
                                },
                            },
                            status: { completed: true, status_str: "success", messages: [] },
                        },
                    });
                    return;
                }
                if (path === "/upload/image" && req.method === "POST") {
                    // multipart 解析仅用于记录文件名
                    const body = await readBody(req);
                    const m = /filename="([^"]+)"/.exec(body);
                    const name = m?.[1] ?? "uploaded.bin";
                    uploads.push(name);
                    json(res, 200, { name, subfolder: "", type: "input" });
                    return;
                }
                if (path === "/view") {
                    res.writeHead(200, { "content-type": "video/mp4" });
                    res.end(Buffer.from(outputBytes));
                    return;
                }
                if (path === "/free" && req.method === "POST") {
                    freeCount++;
                    json(res, 200, {});
                    return;
                }
                if (path === "/interrupt" && req.method === "POST") {
                    interruptCount++;
                    json(res, 200, {});
                    return;
                }
                json(res, 404, { error: `not found: ${path}` });
            } catch (e) {
                json(res, 500, { error: e instanceof Error ? e.message : String(e) });
            }
        })();
    });

    // 监听随机端口
    await new Promise<void>((resolvePromise, rejectPromise) => {
        server.once("error", rejectPromise);
        server.listen(opts.port ?? 0, "127.0.0.1", () => resolvePromise());
    });
    // 端口
    const addr = server.address() as AddressInfo;
    return {
        url: `http://127.0.0.1:${addr.port}`,
        calls,
        get freeCount() {
            return freeCount;
        },
        get interruptCount() {
            return interruptCount;
        },
        uploads,
        get lastPrompt() {
            return lastPrompt;
        },
        close: () =>
            new Promise<void>((resolvePromise) => {
                server.close(() => resolvePromise());
            }),
    };
}
