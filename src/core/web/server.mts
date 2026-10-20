/** Web 只读 HTTP 服务 —— 零依赖 node:http，服务内嵌 SPA 与只读 JSON API。
 *  - 默认只监听 loopback；静态资源与 API 同源，不开放 CORS；
 *  - 业务数据通过 core/web/data.mts 组装，媒体通过 core/web/media.mts 白名单读取；
 *  - 不启动引擎、不占 machine lock、不写项目文件。 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { MachineConfig, ProjectConfig, ShotsFile } from "../project/types.mts";
import type { SkillCommand } from "../agent/skill.mts";
import { SCHEMA_VERSION } from "../../shared/json.mts";
import { VERSION } from "../../shared/version.mts";
import {
    buildOverview,
    buildShotsView,
    getRunDetail,
    getTaskDetail,
    listArtifacts,
    listFinals,
    listTasksView,
    listWorkflows,
} from "./data.mts";
import { resolveFinalMedia, resolveRunMedia, serveMedia } from "./media.mts";

/**
 * 内嵌前端资源。
 */
export interface WebAssets {
    /**
     * 页面骨架。
     */
    index_html: string;
    /**
     * 客户端脚本。
     */
    app_js: string;
    /**
     * 样式表。
     */
    style_css: string;
}

/**
 * Web 服务启动参数。
 */
export interface WebServerOptions {
    /**
     * 项目根绝对路径。
     */
    root: string;
    /**
     * 项目配置。
     */
    project: ProjectConfig;
    /**
     * 本机配置；缺失时只展示共享数据。
     */
    machine: MachineConfig | null;
    /**
     * 分镜配置。
     */
    shots: ShotsFile | null;
    /**
     * 当前命令注册表（Skill stale 判定）。
     */
    commands?: readonly SkillCommand[];
    /**
     * 前端资源。
     */
    assets: WebAssets;
    /**
     * 监听地址。
     */
    host?: string;
    /**
     * 监听端口；0 表示系统分配。
     */
    port?: number;
}

/**
 * Web 服务句柄。
 */
export interface WebServerHandle {
    /**
     * 可访问地址。
     */
    url: string;
    /**
     * 实际监听地址。
     */
    host: string;
    /**
     * 实际监听端口。
     */
    port: number;
    /**
     * 关闭服务（幂等）。
     */
    close: () => Promise<void>;
    /**
     * 服务关闭时 resolve。
     */
    closed: Promise<void>;
}

/**
 * 路由上下文。
 */
interface RouteContext {
    /**
     * 项目根。
     */
    root: string;
    /**
     * 项目配置。
     */
    project: ProjectConfig;
    /**
     * 本机配置。
     */
    machine: MachineConfig | null;
    /**
     * 分镜配置。
     */
    shots: ShotsFile | null;
    /**
     * 当前命令注册表（Skill stale 判定）。
     */
    commands: readonly SkillCommand[];
    /**
     * 前端资源。
     */
    assets: WebAssets;
    /**
     * 实际监听地址。
     */
    host: string;
    /**
     * 实际监听端口。
     */
    port: number;
}

/**
 * 概览缓存。
 */
interface OverviewCache {
    /**
     * 缓存时间戳（毫秒）。
     */
    at: number;
    /**
     * 缓存数据。
     */
    data: Record<string, unknown> | null;
}

// 默认监听地址
const DEFAULT_HOST = "127.0.0.1";
// 概览缓存时间（毫秒）
const OVERVIEW_CACHE_MS = 2_000;
// 静态 JS 缓存时间（秒）
const ASSET_CACHE_SECONDS = 300;
// URL 解析基准
const URL_BASE = "http://127.0.0.1";
// 允许的 HTTP 方法
const ALLOWED_METHODS = "GET, HEAD";
// API 路径前缀
const API_PREFIX = "/api";
// 媒体路径前缀
const MEDIA_PREFIX = "/media";
// 内容安全策略
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "img-src 'self' data:",
    "media-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
].join("; ");

/**
 * 判断是否 loopback 地址。
 */
function isLoopbackHost(host: string): boolean {
    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
}

/**
 * 计算浏览器访问地址里的 host。
 */
function displayHost(host: string): string {
    if (host === "0.0.0.0") return "127.0.0.1";
    if (host === "::" || host === "::1") return "[::1]";
    if (host.includes(":") && !host.startsWith("[")) return `[${host}]`;
    return host;
}

/**
 * 写入统一安全响应头。
 */
function setSecurityHeaders(res: ServerResponse): void {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
}

/**
 * 输出 JSON 成功信封。
 */
function sendJson(res: ServerResponse, status: number, data: unknown, headOnly = false): void {
    // 响应体
    const body = Buffer.from(JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data }), "utf8");
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", String(body.byteLength));
    if (headOnly) res.end();
    else res.end(body);
}

/**
 * 输出 JSON 错误信封。
 */
function sendJsonError(res: ServerResponse, status: number, code: string, message: string, headOnly = false): void {
    // 响应体
    const body = Buffer.from(
        JSON.stringify({ ok: false, schema_version: SCHEMA_VERSION, error: { code, message } }),
        "utf8",
    );
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", String(body.byteLength));
    if (headOnly) res.end();
    else res.end(body);
}

/**
 * 输出纯文本响应。
 */
function sendText(
    res: ServerResponse,
    status: number,
    body: string,
    contentType = "text/plain; charset=utf-8",
    headOnly = false,
): void {
    // 响应字节
    const payload = Buffer.from(body, "utf8");
    res.statusCode = status;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", String(payload.byteLength));
    if (headOnly) res.end();
    else res.end(payload);
}

/**
 * 输出静态资源。
 */
function sendAsset(res: ServerResponse, body: string, contentType: string, headOnly: boolean): void {
    // 响应字节
    const payload = Buffer.from(body, "utf8");
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", `public, max-age=${ASSET_CACHE_SECONDS}`);
    res.setHeader("Content-Length", String(payload.byteLength));
    if (headOnly) res.end();
    else res.end(payload);
}

/**
 * 校验 Host 头，降低 DNS rebinding 风险；非 loopback 监听跳过。
 */
function hostAllowed(req: IncomingMessage, host: string, port: number): boolean {
    if (!isLoopbackHost(host)) return true;
    // Host 头
    const header = req.headers.host;
    if (typeof header !== "string" || header === "") return false;
    // 允许的 Host 集合
    const allowed = new Set([
        `127.0.0.1:${port}`,
        `localhost:${port}`,
        `[::1]:${port}`,
        "127.0.0.1",
        "localhost",
        "[::1]",
    ]);
    return allowed.has(header.toLowerCase());
}

/**
 * 解析整数查询参数。
 */
function intQuery(value: string | null, fallback: number): number {
    if (value === null || value === "") return fallback;
    // 解析结果
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
}

/**
 * 解析 URL 路径中的单段。
 */
function decodeSegment(value: string): string | null {
    try {
        // 解码后的段
        const decoded = decodeURIComponent(value);
        if (decoded === "" || decoded.includes("/") || decoded.includes("\\")) return null;
        return decoded;
    } catch {
        return null;
    }
}

/**
 * 处理概览请求（带短缓存）。
 */
async function overviewOf(ctx: RouteContext, cache: OverviewCache): Promise<Record<string, unknown>> {
    // 当前时间
    const now = Date.now();
    if (cache.data !== null && now - cache.at < OVERVIEW_CACHE_MS) return cache.data;
    // 重新构建
    const data = await buildOverview(ctx.root, ctx.project, ctx.machine, ctx.shots, ctx.commands);
    cache.at = now;
    cache.data = data;
    return data;
}

/**
 * 分发请求。
 */
async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    ctx: RouteContext,
    cache: OverviewCache,
): Promise<void> {
    try {
        // 统一安全头
        setSecurityHeaders(res);
        // 请求方法是否 HEAD
        const headOnly = req.method === "HEAD";
        // 仅 GET / HEAD
        if (req.method !== "GET" && req.method !== "HEAD") {
            res.setHeader("Allow", ALLOWED_METHODS);
            sendJsonError(res, 405, "method_not_allowed", "只支持 GET / HEAD", headOnly);
            return;
        }
        // Host 校验
        if (!hostAllowed(req, ctx.host, ctx.port)) {
            sendJsonError(res, 403, "forbidden", "Host 不在允许列表", headOnly);
            return;
        }
        // 请求 URL
        let url: URL;
        try {
            url = new URL(req.url ?? "/", URL_BASE);
        } catch {
            sendJsonError(res, 400, "bad_request", "URL 非法", headOnly);
            return;
        }
        // 路径
        const pathname = url.pathname;

        // 静态页面
        if (pathname === "/" || pathname === "/index.html") {
            sendAsset(res, ctx.assets.index_html, "text/html; charset=utf-8", headOnly);
            return;
        }
        if (pathname === "/assets/app.js") {
            sendAsset(res, ctx.assets.app_js, "text/javascript; charset=utf-8", headOnly);
            return;
        }
        if (pathname === "/assets/style.css") {
            sendAsset(res, ctx.assets.style_css, "text/css; charset=utf-8", headOnly);
            return;
        }
        if (pathname === "/favicon.ico") {
            res.statusCode = 204;
            res.end();
            return;
        }

        // 健康检查
        if (pathname === "/api/health") {
            sendJson(
                res,
                200,
                {
                    status: "ok",
                    version: VERSION,
                    project: ctx.project.name,
                    mode: ctx.machine?.engine.mode ?? null,
                },
                headOnly,
            );
            return;
        }

        // 概览
        if (pathname === "/api/overview") {
            sendJson(res, 200, await overviewOf(ctx, cache), headOnly);
            return;
        }

        // 分镜
        if (pathname === "/api/shots") {
            sendJson(res, 200, buildShotsView(ctx.root, ctx.shots), headOnly);
            return;
        }

        // 产物
        if (pathname === "/api/artifacts") {
            sendJson(
                res,
                200,
                listArtifacts(ctx.root, {
                    label: url.searchParams.get("label") ?? undefined,
                    status: url.searchParams.get("status") ?? undefined,
                    kind: url.searchParams.get("kind") ?? undefined,
                    search: url.searchParams.get("search") ?? undefined,
                    limit: intQuery(url.searchParams.get("limit"), 200),
                }),
                headOnly,
            );
            return;
        }

        // run 详情
        if (pathname.startsWith("/api/runs/")) {
            // 路径段
            const segments = pathname.split("/");
            if (segments.length !== 4) {
                sendJsonError(res, 404, "not_found", "接口不存在", headOnly);
                return;
            }
            // run id
            const runId = decodeSegment(segments[3] ?? "");
            if (runId === null) {
                sendJsonError(res, 400, "bad_request", "run id 非法", headOnly);
                return;
            }
            // run 详情
            const detail = getRunDetail(ctx.root, runId);
            if (detail === null) {
                sendJsonError(res, 404, "not_found", `未找到 run ${runId}`, headOnly);
                return;
            }
            sendJson(res, 200, detail, headOnly);
            return;
        }

        // 任务列表
        if (pathname === "/api/tasks") {
            sendJson(res, 200, listTasksView(ctx.root), headOnly);
            return;
        }

        // 任务详情
        if (pathname.startsWith("/api/tasks/")) {
            // 路径段
            const segments = pathname.split("/");
            if (segments.length !== 4) {
                sendJsonError(res, 404, "not_found", "接口不存在", headOnly);
                return;
            }
            // task id
            const taskId = decodeSegment(segments[3] ?? "");
            if (taskId === null) {
                sendJsonError(res, 400, "bad_request", "task id 非法", headOnly);
                return;
            }
            // task 详情
            const detail = getTaskDetail(ctx.root, taskId);
            if (detail === null) {
                sendJsonError(res, 404, "not_found", `未找到 task ${taskId}`, headOnly);
                return;
            }
            sendJson(res, 200, detail, headOnly);
            return;
        }

        // 成片
        if (pathname === "/api/finals") {
            sendJson(res, 200, listFinals(ctx.root), headOnly);
            return;
        }

        // 工作流
        if (pathname === "/api/workflows") {
            sendJson(res, 200, listWorkflows(ctx.root, ctx.project), headOnly);
            return;
        }

        // run 媒体
        if (pathname.startsWith(`${MEDIA_PREFIX}/run/`)) {
            // 路径段
            const segments = pathname.split("/");
            if (segments.length !== 5) {
                sendJsonError(res, 404, "not_found", "媒体不存在", headOnly);
                return;
            }
            // run id / 文件名
            const runId = decodeSegment(segments[3] ?? "");
            // 产物文件名
            const name = decodeSegment(segments[4] ?? "");
            if (runId === null || name === null) {
                sendJsonError(res, 400, "bad_request", "媒体路径非法", headOnly);
                return;
            }
            // 媒体目标
            const target = resolveRunMedia(ctx.root, runId, name);
            if (target === null) {
                sendJsonError(res, 404, "not_found", "媒体不存在", headOnly);
                return;
            }
            await serveMedia(req, res, target, url.searchParams.get("download") === "1");
            return;
        }

        // 成片媒体
        if (pathname.startsWith(`${MEDIA_PREFIX}/final/`)) {
            // 路径段
            const segments = pathname.split("/");
            if (segments.length !== 4) {
                sendJsonError(res, 404, "not_found", "媒体不存在", headOnly);
                return;
            }
            // 文件名
            const name = decodeSegment(segments[3] ?? "");
            if (name === null) {
                sendJsonError(res, 400, "bad_request", "媒体路径非法", headOnly);
                return;
            }
            // 媒体目标
            const target = resolveFinalMedia(ctx.root, name);
            if (target === null) {
                sendJsonError(res, 404, "not_found", "媒体不存在", headOnly);
                return;
            }
            await serveMedia(req, res, target, url.searchParams.get("download") === "1");
            return;
        }

        // 未命中
        if (pathname.startsWith(API_PREFIX) || pathname.startsWith(MEDIA_PREFIX)) {
            sendJsonError(res, 404, "not_found", "接口不存在", headOnly);
            return;
        }
        sendText(res, 404, "Not Found", "text/plain; charset=utf-8", headOnly);
    } catch (e) {
        // 服务端异常只进 stderr，不回传内部路径
        process.stderr.write(`[web] ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
        if (!res.headersSent) {
            sendJsonError(res, 500, "internal_error", "服务内部错误", req.method === "HEAD");
        } else {
            res.destroy();
        }
    }
}

/**
 * 启动 Web 服务。
 */
export async function startWebServer(options: WebServerOptions): Promise<WebServerHandle> {
    // 监听地址
    const host = options.host ?? DEFAULT_HOST;
    // 监听端口
    const port = options.port ?? 0;
    // 概览缓存
    const cache: OverviewCache = { at: 0, data: null };
    // 路由上下文（实际 host/port 在 listen 后回填）
    const ctx: RouteContext = {
        root: options.root,
        project: options.project,
        machine: options.machine,
        shots: options.shots,
        commands: options.commands ?? [],
        assets: options.assets,
        host,
        port,
    };
    // HTTP 服务
    const server: Server = createServer((req, res) => {
        void handleRequest(req, res, ctx, cache);
    });
    // 关闭事件
    let resolveClosed: (() => void) | null = null;
    // 关闭 Promise
    const closed = new Promise<void>((resolve) => {
        resolveClosed = resolve;
    });
    server.once("close", () => {
        resolveClosed?.();
    });

    // 监听
    await new Promise<void>((resolve, reject) => {
        // 监听成功
        const onListening = (): void => {
            server.off("error", onError);
            resolve();
        };
        // 监听失败
        const onError = (e: Error): void => {
            server.off("listening", onListening);
            reject(e);
        };
        server.once("listening", onListening);
        server.once("error", onError);
        server.listen(port, host);
    });

    // 实际地址
    const address = server.address();
    if (address === null || typeof address === "string") {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        throw new Error("无法获取 Web 服务监听地址");
    }
    // 实际端口
    const actualPort = (address as AddressInfo).port;
    ctx.port = actualPort;
    // 展示地址
    const urlHost = displayHost(host);
    // 可访问 URL
    const url = `http://${urlHost}:${actualPort}`;

    // 关闭 Promise（幂等）
    let closePromise: Promise<void> | null = null;
    /**
     * 关闭服务。
     */
    function close(): Promise<void> {
        if (closePromise !== null) return closePromise;
        closePromise = new Promise<void>((resolve) => {
            if (!server.listening) {
                resolveClosed?.();
                resolve();
                return;
            }
            server.close(() => {
                resolveClosed?.();
                resolve();
            });
            server.closeAllConnections();
        });
        return closePromise;
    }

    return {
        url,
        host,
        port: actualPort,
        close,
        closed,
    };
}
