/** Web 查看器 HTTP 服务 —— 零依赖 node:http，服务内嵌 SPA 与 JSON API。
 *  - 默认只监听 loopback；静态资源与 API 同源，不开放 CORS；
 *  - 业务数据通过 core/web/data.mts 组装，媒体通过 core/web/media.mts 白名单读取；
 *  - 不启动引擎、不占 machine lock、不改工作流；
 *  - 写能力：镜头定稿（takes.json）、确认剧本（script.json）、创建镜头生成任务。 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { MachineConfig, ProjectConfig, ShotsFile, TaskOptions } from "../project/types.mts";
import { loadMachineIfExists, loadShotsIfExists, readProjectAt } from "../project/config.mts";
import { buildAccessUrls, isLoopbackHost, normalizeHost, type AccessUrls } from "./addresses.mts";
import type { SkillCommand } from "../agent/skill.mts";
import { SCHEMA_VERSION } from "../../shared/json.mts";
import { DaoyanCliError, isDaoyanCliError } from "../../shared/errors.mts";
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
import {
    resolveEpisodeFinalMedia,
    resolveFinalMedia,
    resolveRunMedia,
    resolveStoryMedia,
    serveMedia,
} from "./media.mts";
import {
    buildStoryEpisodeView,
    buildStorySeriesView,
    listStoryAssetsView,
    listStoryCharactersView,
    listStoryScenesView,
    listStoryVoicesView,
} from "./story-data.mts";
import { listEpisodeMetas, resolveEpisodeContext, storyEnabled } from "../story/paths.mts";
import { checkStoryGate, gateError, loadContextShots } from "../story/production.mts";
import { approveScript } from "../story/store.mts";
import { finalizeTake, revokeTake, takesRelPath } from "../story/takes.mts";
import { createAndStartTask } from "../task/create.mts";

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
 * Web 触发的镜头任务参数。
 */
export interface WebTaskStartOptions {
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
    machine: MachineConfig;
    /**
     * 任务类型。
     */
    kind: "shot" | "retake";
    /**
     * 触发命令（展示用）。
     */
    command: string;
    /**
     * 剧集 id（legacy 为 null）。
     */
    episodeId: string | null;
    /**
     * 执行选项。
     */
    options: TaskOptions;
}

/**
 * Web 任务创建结果。
 */
export interface WebTaskStartResult {
    /**
     * task id。
     */
    task_id: string;
    /**
     * 初始状态。
     */
    status: string;
    /**
     * 是否命中 request_id 幂等。
     */
    deduplicated: boolean;
}

/**
 * Web 任务启动器（测试可注入）。
 */
export type WebTaskStarter = (opts: WebTaskStartOptions) => Promise<WebTaskStartResult>;

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
    /**
     * 任务启动器（测试注入；默认创建 detached worker）。
     */
    taskStarter?: WebTaskStarter;
}

/**
 * Web 服务句柄。
 */
export interface WebServerHandle {
    /**
     * 可访问地址（本机优先）。
     */
    url: string;
    /**
     * 全部可访问地址。
     */
    urls: AccessUrls;
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
     * 任务启动器。
     */
    taskStarter: WebTaskStarter;
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

/**
 * 实时变更状态。
 */
interface RealtimeState {
    /**
     * 项目变更序号。
     */
    revision: number;
    /**
     * 最近一次变更时间。
     */
    changed_at: string;
    /**
     * SSE 客户端。
     */
    clients: Set<ServerResponse>;
}

// 默认监听地址
const DEFAULT_HOST = "127.0.0.1";
// 概览缓存时间（毫秒）
const OVERVIEW_CACHE_MS = 2_000;
// 静态 JS 缓存时间（秒）
const ASSET_CACHE_SECONDS = 300;
// 项目变更扫描间隔（毫秒）
const REVISION_POLL_MS = 1_000;
// SSE 心跳间隔（毫秒）
const SSE_HEARTBEAT_MS = 25_000;
// 变更扫描忽略的目录
const REVISION_IGNORED_DIRS = new Set([".git", "node_modules", ".idea", "dist", "log", "logs", "tmp"]);
// 变更扫描的根文件
const REVISION_ROOT_FILES = ["project.json", "shots.json", "takes.json", ".dycli/machine.json"];
// 变更扫描的目录
const REVISION_WATCH_DIRS = ["story", "episodes", "workflows", "final"];
// run / task 记录浅扫描
const REVISION_RECORD_FILES: ReadonlyArray<readonly [string, string]> = [
    ["runs", "run.json"],
    ["tasks", "task.json"],
    ["tasks", "events.jsonl"],
];
// URL 解析基准
const URL_BASE = "http://127.0.0.1";
// 允许的 HTTP 方法（POST 仅镜头定稿两个路径）
const ALLOWED_METHODS = "GET, HEAD, POST";
// 定稿写接口路径
const TAKE_WRITE_PATHS = new Set(["/api/takes/finalize", "/api/takes/revoke"]);
// 剧本确认路径
const SCRIPT_APPROVE_PATH = "/api/script/approve";
// legacy 镜头生成路径
const SHOT_GENERATE_PATH = "/api/shots/generate";
// story 镜头生成路径
const EPISODE_SHOT_GENERATE_RE = /^\/api\/episodes\/([^/]+)\/shots\/([^/]+)\/generate$/;
// 写接口请求体上限（64 KiB）
const MAX_WRITE_BODY_BYTES = 64 * 1024;
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
 * 记录单个文件签名。
 */
function recordFileSignature(out: string[], abs: string, rel: string): void {
    try {
        // 文件状态（写入过程中可能被原子替换）
        const stat = statSync(abs);
        if (!stat.isFile()) return;
        out.push(`${rel}\u0000${stat.size}\u0000${stat.mtimeMs}`);
    } catch {
        // 扫描瞬间文件不存在：忽略
    }
}

/**
 * 递归收集目录内文件签名。
 */
function walkProjectTree(out: string[], dir: string, rel: string): void {
    // 目录项
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (REVISION_IGNORED_DIRS.has(entry.name)) continue;
            walkProjectTree(out, join(dir, entry.name), `${rel}/${entry.name}`);
            continue;
        }
        if (entry.isFile()) recordFileSignature(out, join(dir, entry.name), `${rel}/${entry.name}`);
    }
}

/**
 * 项目文件指纹（只扫项目源文件与 run/task 记录，不扫产物内容）。
 */
function projectFingerprint(root: string): string {
    // 签名列表
    const out: string[] = [];
    for (const rel of REVISION_ROOT_FILES) recordFileSignature(out, join(root, rel), rel);
    for (const rel of REVISION_WATCH_DIRS) walkProjectTree(out, join(root, rel), rel);
    for (const [dirName, fileName] of REVISION_RECORD_FILES) {
        // 记录目录
        let entries;
        try {
            entries = readdirSync(join(root, dirName), { withFileTypes: true });
        } catch {
            continue;
        }
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            recordFileSignature(out, join(root, dirName, entry.name, fileName), `${dirName}/${entry.name}/${fileName}`);
        }
    }
    return out.join("\n");
}

/**
 * 每个 API 请求前刷新磁盘上下文（project / machine / shots）。
 */
function refreshContext(ctx: RouteContext): void {
    try {
        // 项目配置
        const project = readProjectAt(ctx.root);
        if (project !== null) ctx.project = project;
    } catch {
        // 文件正在写入时保留上一次有效配置
    }
    try {
        // 本机配置只在文件存在时覆盖
        const machine = loadMachineIfExists(ctx.root);
        if (machine !== null) ctx.machine = machine;
    } catch {
        // 保留上一次有效配置
    }
    try {
        // 分镜
        const shots = loadShotsIfExists(ctx.root);
        if (shots !== null) ctx.shots = shots;
    } catch {
        // 保留上一次有效分镜
    }
}

/**
 * 推送一次变更事件。
 */
function broadcastRevision(realtime: RealtimeState): void {
    // 事件体
    const chunk = `event: revision\ndata: ${JSON.stringify({
        revision: realtime.revision,
        at: realtime.changed_at,
    })}\n\n`;
    for (const client of realtime.clients) {
        try {
            client.write(chunk);
        } catch {
            realtime.clients.delete(client);
        }
    }
}

/**
 * 建立 SSE 订阅。
 */
function streamRevision(res: ServerResponse, realtime: RealtimeState): void {
    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write("retry: 2000\n\n");
    // 当前版本，客户端用它建立基线
    res.write(`event: ready\ndata: ${JSON.stringify({ revision: realtime.revision, at: realtime.changed_at })}\n\n`);
    realtime.clients.add(res);
    // 心跳，避免代理 / 浏览器回收空闲连接
    const heartbeat = setInterval(() => {
        try {
            res.write(": ping\n\n");
        } catch {
            realtime.clients.delete(res);
        }
    }, SSE_HEARTBEAT_MS);
    heartbeat.unref();
    // 连接关闭
    const cleanup = (): void => {
        clearInterval(heartbeat);
        realtime.clients.delete(res);
    };
    res.on("close", cleanup);
    res.on("error", cleanup);
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
 * 写请求的参数错误（带 HTTP 状态码）。
 */
class WriteRequestError extends Error {
    /**
     * HTTP 状态码。
     */
    readonly status: number;
    /**
     * 错误码。
     */
    readonly code: string;

    /**
     * 创建写请求错误。
     */
    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "WriteRequestError";
        this.status = status;
        this.code = code;
    }
}

/**
 * 取字符串字段。
 */
function stringField(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * 请求体是否为 JSON。
 */
function isJsonRequest(req: IncomingMessage): boolean {
    // 内容类型
    const header = Array.isArray(req.headers["content-type"])
        ? req.headers["content-type"][0]
        : req.headers["content-type"];
    return (header ?? "").split(";")[0].trim().toLowerCase() === "application/json";
}

/**
 * 写请求必须来自同一 Host（浏览器跨源 POST 会带上 Origin/Referer）。
 */
function sameOriginWrite(req: IncomingMessage): boolean {
    // 请求 Host
    const host = req.headers.host ?? "";
    // 来源头
    const source = typeof req.headers.origin === "string" ? req.headers.origin : req.headers.referer;
    if (typeof source !== "string" || source === "") return true;
    try {
        return new URL(source).host === host;
    } catch {
        return false;
    }
}

/**
 * 读取受限长度的请求体。
 */
async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
    // 分块
    const chunks: Buffer[] = [];
    // 累计字节
    let size = 0;
    for await (const part of req) {
        // 当前块
        const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part as Uint8Array);
        size += chunk.byteLength;
        if (size > limit) throw new WriteRequestError(413, "payload_too_large", `请求体超过 ${limit} 字节`);
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * 输出写请求错误（结构化错误映射到状态码）。
 */
function sendWriteError(res: ServerResponse, error: unknown): void {
    if (error instanceof WriteRequestError) {
        sendJsonError(res, error.status, error.code, error.message);
        return;
    }
    if (isDaoyanCliError(error)) {
        // 状态码按错误码分类
        const status =
            error.code === "run_not_found" || error.code === "take_not_found"
                ? 404
                : error.code === "machine_busy" || error.code === "story_gate_failed"
                  ? 409
                  : error.code === "episode_required" || error.code === "episode_not_found"
                    ? 400
                    : error.exit === 2
                      ? 400
                      : error.code === "take_invalid" || error.code === "take_pending" || error.code === "story_invalid"
                        ? 400
                        : 500;
        // 响应体
        const body = Buffer.from(
            JSON.stringify({
                ok: false,
                schema_version: SCHEMA_VERSION,
                error: {
                    code: error.code,
                    message: error.message,
                    ...(error.hint !== "" ? { hint: error.hint } : {}),
                    ...(error.nextActions !== undefined ? { next_actions: error.nextActions } : {}),
                },
            }),
            "utf8",
        );
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Length", String(body.byteLength));
        res.end(body);
        return;
    }
    process.stderr.write(`[web] ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    sendJsonError(res, 500, "internal_error", "服务内部错误");
}

/**
 * 定稿写接口：POST /api/takes/finalize 与 /api/takes/revoke。
 * 只接受 JSON 与同源请求，字段仅 shot_id / episode_id / run_id / output / note；
 * 稿件路径一律从 run 记录反查，不接受外部路径。 */
async function handleTakeWrite(
    req: IncomingMessage,
    res: ServerResponse,
    ctx: RouteContext,
    cache: OverviewCache,
    pathname: string,
): Promise<void> {
    try {
        if (!isJsonRequest(req))
            throw new WriteRequestError(415, "unsupported_media_type", "只接受 Content-Type: application/json");
        if (!sameOriginWrite(req)) throw new WriteRequestError(403, "forbidden", "写请求必须同源");
        // 请求体
        const body = await parseJsonBody(req);
        // 镜号
        const shotId = stringField(body.shot_id);
        if (shotId === undefined) throw new WriteRequestError(400, "bad_request", "缺少 shot_id");
        // 剧集上下文
        const context = resolveEpisodeContext(ctx.root, stringField(body.episode_id));
        // 本集分镜（镜号必须存在）
        const shots = loadContextShots(ctx.root, context);
        if (!shots.shots.some((s) => s.id === shotId)) {
            throw new WriteRequestError(400, "invalid_shot", `镜 ${shotId} 不在本集分镜`);
        }
        // 是否定稿请求
        const isFinalize = pathname.endsWith("/finalize");
        // 结果数据
        let data: Record<string, unknown>;
        if (isFinalize) {
            // run id
            const runId = stringField(body.run_id);
            if (runId === undefined) throw new WriteRequestError(400, "bad_request", "缺少 run_id");
            // 定稿结果
            const result = finalizeTake({
                root: ctx.root,
                context,
                shotId,
                runId,
                ...(stringField(body.output) !== undefined ? { output: stringField(body.output) as string } : {}),
                ...(stringField(body.note) !== undefined ? { note: stringField(body.note) as string } : {}),
                source: "user",
            });
            data = {
                changed: result.changed,
                replaced: result.replaced,
                run_id: result.entry.run_id,
                output: result.entry.output,
                take: result.entry,
            };
        } else {
            // 撤销结果
            const result = revokeTake({ root: ctx.root, context, shotId, source: "user" });
            data = { changed: result.changed, revoked: result.revoked };
        }
        // 概览缓存立即失效，页面刷新即见最新定稿
        cache.at = 0;
        cache.data = null;
        sendJson(res, 200, {
            episode_id: context.episode_id,
            shot_id: shotId,
            takes_file: takesRelPath(ctx.root, context),
            ...data,
        });
    } catch (e) {
        sendWriteError(res, e);
    }
}

/**
 * 写请求的通用校验（JSON + 同源），返回请求体。
 */
async function requireWriteBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    if (!isJsonRequest(req))
        throw new WriteRequestError(415, "unsupported_media_type", "只接受 Content-Type: application/json");
    if (!sameOriginWrite(req)) throw new WriteRequestError(403, "forbidden", "写请求必须同源");
    return parseJsonBody(req);
}

/**
 * 解码路径段；非法返回 null。
 */
function decodePathSegment(value: string | undefined): string | null {
    return value === undefined ? null : decodeSegment(value);
}

/**
 * 确认剧本。
 */
async function handleScriptApprove(
    req: IncomingMessage,
    res: ServerResponse,
    ctx: RouteContext,
    cache: OverviewCache,
): Promise<void> {
    try {
        // 请求体
        const body = await requireWriteBody(req);
        // 剧集 id
        const episodeId = stringField(body.episode_id);
        if (episodeId === undefined) throw new WriteRequestError(400, "bad_request", "缺少 episode_id");
        // 确认
        const script = approveScript(ctx.root, episodeId);
        // 概览缓存失效
        cache.at = 0;
        cache.data = null;
        sendJson(res, 200, { episode_id: episodeId, script });
    } catch (e) {
        sendWriteError(res, e);
    }
}

/**
 * 解析镜头生成请求（story 路径或 legacy 请求体）。
 */
function parseShotGenerateTarget(
    pathname: string,
    body: Record<string, unknown>,
): { episodeId: string | undefined; shotId: string } | null {
    // story 路径
    const matched = EPISODE_SHOT_GENERATE_RE.exec(pathname);
    if (matched !== null) {
        const episodeId = decodePathSegment(matched[1]);
        const shotId = decodePathSegment(matched[2]);
        if (episodeId === null || shotId === null) return null;
        return { episodeId, shotId };
    }
    // legacy 路径
    if (pathname === SHOT_GENERATE_PATH) {
        const shotId = stringField(body.shot_id);
        return shotId === undefined ? null : { episodeId: undefined, shotId };
    }
    return null;
}

/**
 * 生成 / 重新生成一个镜头。
 */
async function handleShotGenerate(
    req: IncomingMessage,
    res: ServerResponse,
    ctx: RouteContext,
    cache: OverviewCache,
    pathname: string,
): Promise<void> {
    try {
        // 请求体
        const body = await requireWriteBody(req);
        // 目标
        const target = parseShotGenerateTarget(pathname, body);
        if (target === null) throw new WriteRequestError(400, "bad_request", "缺少有效的剧集 / 镜号");
        // 是否重拍
        const regenerate = body.regenerate === true;
        // 剧集上下文
        const context = resolveEpisodeContext(ctx.root, target.episodeId);
        // 本集分镜
        const shots = loadContextShots(ctx.root, context);
        if (!shots.shots.some((shot) => shot.id === target.shotId)) {
            throw new WriteRequestError(400, "invalid_shot", `镜 ${target.shotId} 不在本集分镜`);
        }
        // 本机配置
        const machine = loadMachineIfExists(ctx.root);
        if (machine === null) {
            throw new WriteRequestError(400, "machine_missing", "本机未初始化：先执行 daoyan init --mode=local|remote");
        }
        // 剧情门禁
        const gate = checkStoryGate(ctx.root, context, ctx.project);
        if (gate.mode === "strict" && gate.blockers.length > 0) throw gateError(context, gate.blockers, gate.stage);
        // 任务类型
        const kind: "shot" | "retake" = regenerate ? "retake" : "shot";
        // 触发命令
        const command = `${kind} ${target.shotId}${context.episode_id !== null ? ` --episode ${context.episode_id}` : ""}`;
        // 创建任务
        const created = await ctx.taskStarter({
            root: ctx.root,
            project: ctx.project,
            machine,
            kind,
            command,
            episodeId: context.episode_id,
            options: {
                shots: [target.shotId],
                force: regenerate,
                ...(gate.blockers.length > 0 ? { story_gate_warnings: gate.blockers } : {}),
            },
        });
        // 概览缓存失效
        cache.at = 0;
        cache.data = null;
        sendJson(res, 202, {
            episode_id: context.episode_id,
            shot_id: target.shotId,
            kind,
            task_id: created.task_id,
            status: created.status,
            deduplicated: created.deduplicated,
        });
    } catch (e) {
        sendWriteError(res, e);
    }
}

/**
 * 读取并解析 JSON 请求体。
 */
async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    // 原始文本
    const text = (await readBody(req, MAX_WRITE_BODY_BYTES)).toString("utf8");
    try {
        // 解析结果
        const parsed = JSON.parse(text) as unknown;
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new WriteRequestError(400, "bad_request", "请求体必须是 JSON 对象");
        }
        return parsed as Record<string, unknown>;
    } catch (e) {
        if (e instanceof WriteRequestError) throw e;
        throw new WriteRequestError(400, "bad_request", "请求体不是合法 JSON");
    }
}

/**
 * 分发请求。
 */
async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    ctx: RouteContext,
    cache: OverviewCache,
    realtime: RealtimeState,
): Promise<void> {
    try {
        // 统一安全头
        setSecurityHeaders(res);
        // 请求方法
        const method = req.method ?? "GET";
        // 是否只取响应头
        const headOnly = method === "HEAD";
        // 是否为写请求
        const isWrite = method === "POST";
        // 只接受 GET / HEAD / POST；POST 仅用于镜头定稿
        if (!isWrite && method !== "GET" && method !== "HEAD") {
            res.setHeader("Allow", ALLOWED_METHODS);
            sendJsonError(res, 405, "method_not_allowed", "只支持 GET / HEAD / POST（镜头定稿）", headOnly);
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

        // API 请求先刷新磁盘上的项目上下文（免重启）
        if (pathname.startsWith(API_PREFIX)) refreshContext(ctx);

        // 写接口（定稿 / 剧本确认 / 镜头生成）
        if (isWrite) {
            if (TAKE_WRITE_PATHS.has(pathname)) {
                await handleTakeWrite(req, res, ctx, cache, pathname);
                return;
            }
            if (pathname === SCRIPT_APPROVE_PATH) {
                await handleScriptApprove(req, res, ctx, cache);
                return;
            }
            if (pathname === SHOT_GENERATE_PATH || EPISODE_SHOT_GENERATE_RE.test(pathname)) {
                await handleShotGenerate(req, res, ctx, cache, pathname);
                return;
            }
            res.setHeader("Allow", ALLOWED_METHODS);
            sendJsonError(res, 405, "method_not_allowed", "POST 仅用于镜头定稿 / 剧本确认 / 镜头生成", headOnly);
            return;
        }

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

        // 实时变更（SSE）
        if (pathname === "/api/events") {
            if (headOnly) {
                sendJson(res, 200, { revision: realtime.revision, at: realtime.changed_at }, true);
                return;
            }
            streamRevision(res, realtime);
            return;
        }

        // 实时变更（轮询兜底）
        if (pathname === "/api/revision") {
            sendJson(res, 200, { revision: realtime.revision, at: realtime.changed_at }, headOnly);
            return;
        }

        // 概览
        if (pathname === "/api/overview") {
            sendJson(res, 200, await overviewOf(ctx, cache), headOnly);
            return;
        }

        // 系列 / 剧集（story 模式）
        if (pathname === "/api/episodes") {
            if (!storyEnabled(ctx.root)) {
                sendJson(res, 200, { episodes: [] }, headOnly);
                return;
            }
            // 系列视图
            const view = buildStorySeriesView(ctx.root, ctx.project);
            sendJson(res, 200, { episodes: view.episodes, series: view.series, status: view.status }, headOnly);
            return;
        }
        if (pathname.startsWith("/api/episodes/")) {
            if (!storyEnabled(ctx.root)) {
                sendJsonError(res, 404, "not_found", "story 模式未启用", headOnly);
                return;
            }
            // 路径段
            const segments = pathname.split("/");
            // 剧集 id
            const episodeId = decodeSegment(segments[3] ?? "");
            if (episodeId === null) {
                sendJsonError(res, 400, "bad_request", "剧集 id 非法", headOnly);
                return;
            }
            // 剧集视图
            const view = buildStoryEpisodeView(ctx.root, episodeId, ctx.project);
            if (view === null) {
                sendJsonError(res, 404, "not_found", `未找到剧集 ${episodeId}`, headOnly);
                return;
            }
            // 子资源
            const action = segments[4];
            if (action === undefined) {
                sendJson(res, 200, view, headOnly);
                return;
            }
            // 子资源字段
            const fields: Record<string, unknown> = {
                script: view.script,
                breakdown: view.breakdown,
                shots: view.shots,
                map: view.map,
                tasks: view.tasks,
                runs: view.runs,
                artifacts: view.artifacts,
                finals: view.finals,
                status: view.status,
            };
            if (!(action in fields)) {
                sendJsonError(res, 404, "not_found", "接口不存在", headOnly);
                return;
            }
            sendJson(res, 200, fields[action], headOnly);
            return;
        }

        // 全局设定 / 资产（story 模式）
        if (pathname === "/api/story/characters") {
            sendJson(res, 200, { items: listStoryCharactersView(ctx.root) }, headOnly);
            return;
        }
        if (pathname === "/api/story/scenes") {
            sendJson(res, 200, { items: listStoryScenesView(ctx.root) }, headOnly);
            return;
        }
        if (pathname === "/api/story/voices") {
            sendJson(res, 200, { items: listStoryVoicesView(ctx.root) }, headOnly);
            return;
        }
        if (pathname === "/api/story/assets") {
            sendJson(res, 200, { items: listStoryAssetsView(ctx.root) }, headOnly);
            return;
        }

        // 分镜
        if (pathname === "/api/shots") {
            if (storyEnabled(ctx.root)) {
                sendJsonError(res, 410, "use_episode_api", "story 模式请使用 /api/episodes/<id>/shots", headOnly);
                return;
            }
            sendJson(res, 200, buildShotsView(ctx.root, ctx.shots, "shot:", resolveEpisodeContext(ctx.root)), headOnly);
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
                    episode: url.searchParams.get("episode") ?? undefined,
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
            sendJson(res, 200, listTasksView(ctx.root, url.searchParams.get("episode") ?? undefined), headOnly);
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
            // 指定剧集
            const episode = url.searchParams.get("episode") ?? undefined;
            if (episode === undefined && storyEnabled(ctx.root)) {
                // story 模式聚合每集成片
                const items = listEpisodeMetas(ctx.root).flatMap((meta) => listFinals(ctx.root, meta.id));
                sendJson(res, 200, items, headOnly);
                return;
            }
            sendJson(res, 200, listFinals(ctx.root, episode), headOnly);
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

        // story 资产媒体
        if (pathname.startsWith(`${MEDIA_PREFIX}/story/`)) {
            // 路径段
            const segments = pathname.split("/").slice(3);
            // 相对路径
            const decoded: string[] = [];
            for (const segment of segments) {
                // 解码后的路径段
                const value = decodeSegment(segment);
                if (value === null) {
                    sendJsonError(res, 400, "bad_request", "媒体路径非法", headOnly);
                    return;
                }
                decoded.push(value);
            }
            // 媒体目标
            const target = resolveStoryMedia(ctx.root, decoded.join("/"));
            if (target === null) {
                sendJsonError(res, 404, "not_found", "媒体不存在", headOnly);
                return;
            }
            await serveMedia(req, res, target, url.searchParams.get("download") === "1");
            return;
        }

        // 成片媒体（按集 / legacy）
        if (pathname.startsWith(`${MEDIA_PREFIX}/final/`)) {
            // 路径段
            const segments = pathname.split("/");
            if (segments.length === 5) {
                // 剧集 id / 文件名
                const episodeId = decodeSegment(segments[3] ?? "");
                // 文件名
                const name = decodeSegment(segments[4] ?? "");
                if (episodeId === null || name === null) {
                    sendJsonError(res, 400, "bad_request", "媒体路径非法", headOnly);
                    return;
                }
                // 媒体目标
                const target = resolveEpisodeFinalMedia(ctx.root, episodeId, name);
                if (target === null) {
                    sendJsonError(res, 404, "not_found", "媒体不存在", headOnly);
                    return;
                }
                await serveMedia(req, res, target, url.searchParams.get("download") === "1");
                return;
            }
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
    const host = normalizeHost(options.host ?? DEFAULT_HOST);
    // 监听端口
    const port = options.port ?? 0;
    // 概览缓存
    const cache: OverviewCache = { at: 0, data: null };
    // 实时变更状态
    const realtime: RealtimeState = { revision: 0, changed_at: new Date().toISOString(), clients: new Set() };
    // 任务启动器
    const taskStarter: WebTaskStarter =
        options.taskStarter ??
        (async (opts) => {
            const created = await createAndStartTask({
                root: opts.root,
                project: opts.project,
                machine: opts.machine,
                kind: opts.kind,
                command: opts.command,
                episodeId: opts.episodeId,
                options: opts.options,
            });
            return {
                task_id: created.task.task_id,
                status: created.task.status,
                deduplicated: created.deduplicated,
            };
        });
    // 启动时指纹
    let fingerprint = projectFingerprint(options.root);
    // 路由上下文（实际 host/port 在 listen 后回填）
    const ctx: RouteContext = {
        root: options.root,
        project: options.project,
        machine: options.machine,
        shots: options.shots,
        commands: options.commands ?? [],
        assets: options.assets,
        taskStarter,
        host,
        port,
    };
    // 项目变更扫描（不做递归 watch，跨平台且避免编辑器临时文件噪声）
    const revisionTimer = setInterval(() => {
        // 当前指纹
        const next = projectFingerprint(options.root);
        if (next === fingerprint) return;
        fingerprint = next;
        realtime.revision += 1;
        realtime.changed_at = new Date().toISOString();
        // 概览缓存立即失效
        cache.at = 0;
        cache.data = null;
        broadcastRevision(realtime);
    }, REVISION_POLL_MS);
    revisionTimer.unref();
    // HTTP 服务
    const server: Server = createServer((req, res) => {
        void handleRequest(req, res, ctx, cache, realtime);
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
    // 实际监听协议族
    const family = (address as AddressInfo).family === "IPv6" ? "IPv6" : "IPv4";
    // 全部可访问地址
    const urls = buildAccessUrls({ host, port: actualPort, family });
    // 可访问 URL（本机优先）
    const url = urls.local[0] ?? urls.network[0] ?? `http://${host}:${actualPort}`;

    // 关闭 Promise（幂等）
    let closePromise: Promise<void> | null = null;
    /**
     * 关闭服务。
     */
    function close(): Promise<void> {
        if (closePromise !== null) return closePromise;
        closePromise = new Promise<void>((resolve) => {
            clearInterval(revisionTimer);
            for (const client of realtime.clients) client.end();
            realtime.clients.clear();
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
        urls,
        host,
        port: actualPort,
        close,
        closed,
    };
}
