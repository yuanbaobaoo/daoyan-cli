/** Web 媒体服务 —— 只从 run.outputs / final 白名单读取文件，支持 HTTP Range。
 *  安全要点：
 *  - URL 不能直接拼文件系统路径，必须先命中记录；
 *  - realpath 必须仍在允许目录内，防止符号链接逃逸；
 *  - 大文件流式输出，不整体读入内存。 */
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { basename, extname, join, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pipeline } from "node:stream/promises";
import { FINAL_DIR, RUNS_DIR, STORY_ASSETS_DIR } from "../project/types.mts";
import { readRun, runDir } from "../run/store.mts";
import { STORY_ID_RE } from "../story/paths.mts";

/**
 * 可服务的媒体目标。
 */
export interface MediaTarget {
    /**
     * 文件绝对路径。
     */
    abs: string;
    /**
     * 文件名。
     */
    name: string;
    /**
     * 字节数。
     */
    bytes: number;
    /**
     * 内容类型。
     */
    content_type: string;
    /**
     * ETag（优先 sha256）。
     */
    etag: string;
}

/**
 * Range 解析结果。
 */
export type RangeParseResult = { kind: "none" } | { kind: "ok"; start: number; end: number } | { kind: "invalid" };

// 媒体 MIME 表
const MIME_TYPES: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".m4v": "video/x-m4v",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".opus": "audio/opus",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".log": "text/plain; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
};
// 默认 MIME
const DEFAULT_MIME = "application/octet-stream";
// 媒体缓存时间（秒）
const MEDIA_CACHE_SECONDS = 31_536_000;
// 路径分隔符
const PATH_SEPARATOR = sep;
// 文件名非法字符
const UNSAFE_FILENAME_CHARS = /["\\\r\n]/g;

/**
 * 文件内容类型。
 */
export function contentTypeOf(name: string): string {
    return MIME_TYPES[extname(name).toLowerCase()] ?? DEFAULT_MIME;
}

/**
 * 判断 target 是否在 base 目录内。
 */
function isWithin(base: string, target: string): boolean {
    return target === base || target.startsWith(base.endsWith(PATH_SEPARATOR) ? base : base + PATH_SEPARATOR);
}

/**
 * 安全的 realpath；失败返回 null。
 */
function safeRealpath(file: string): string | null {
    try {
        return realpathSync(file);
    } catch {
        return null;
    }
}

/**
 * 构造媒体目标。
 */
function makeTarget(abs: string, name: string, etag: string): MediaTarget | null {
    if (!existsSync(abs)) return null;
    try {
        // 文件状态
        const stat = statSync(abs);
        if (!stat.isFile()) return null;
        return {
            abs,
            name,
            bytes: stat.size,
            content_type: contentTypeOf(name),
            etag,
        };
    } catch {
        return null;
    }
}

/**
 * 解析 run 产物。
 */
export function resolveRunMedia(root: string, runId: string, name: string): MediaTarget | null {
    // run id 必须是单段文件名
    if (basename(runId) !== runId || runId.includes("/") || runId.includes("\\") || runId === "." || runId === "..") {
        return null;
    }
    // run 记录（坏记录/不存在返回 null）
    let rec: ReturnType<typeof readRun> = null;
    try {
        rec = readRun(root, runId);
    } catch {
        return null;
    }
    if (rec === null) return null;
    // 项目根真实路径
    const projectRoot = safeRealpath(root);
    if (projectRoot === null) return null;
    // 命中的产物（只接受记录中的文件名）
    const output = rec.outputs.find((o) => o.name === name);
    if (output === undefined) return null;
    // 允许目录的真实路径
    const base = safeRealpath(join(root, RUNS_DIR, runId));
    if (base === null || !isWithin(projectRoot, base)) return null;
    // 文件真实路径
    const abs = safeRealpath(join(runDir(root, runId), output.path));
    if (abs === null || !isWithin(base, abs)) return null;
    return makeTarget(abs, output.name, `"${output.sha256}"`);
}

/**
 * 解析成片文件。
 */
export function resolveFinalMedia(root: string, name: string): MediaTarget | null {
    // final 目录
    const dir = join(root, FINAL_DIR);
    // 项目根真实路径
    const projectRoot = safeRealpath(root);
    if (projectRoot === null) return null;
    // 目录真实路径
    const base = safeRealpath(dir);
    if (base === null || !isWithin(projectRoot, base)) return null;
    // 只允许 basename，杜绝路径分隔符
    if (basename(name) !== name || name.includes("/") || name.includes("\\")) return null;
    // 文件真实路径
    const abs = safeRealpath(join(dir, name));
    if (abs === null || !isWithin(base, abs)) return null;
    try {
        // 文件状态
        const stat = statSync(abs);
        if (!stat.isFile()) return null;
        return makeTarget(abs, name, `"${stat.size}-${Math.floor(stat.mtimeMs)}"`);
    } catch {
        return null;
    }
}

/**
 * 解析 story 资产文件（story/assets/...）。
 */
export function resolveStoryMedia(root: string, relPath: string): MediaTarget | null {
    if (relPath === "" || relPath.startsWith("/") || relPath.includes("..") || relPath.includes("\\")) return null;
    // 项目根真实路径
    const projectRoot = safeRealpath(root);
    if (projectRoot === null) return null;
    // 资产根真实路径
    const base = safeRealpath(join(root, STORY_ASSETS_DIR));
    if (base === null || !isWithin(projectRoot, base)) return null;
    // 文件真实路径
    const abs = safeRealpath(join(root, STORY_ASSETS_DIR, relPath));
    if (abs === null || !isWithin(base, abs)) return null;
    try {
        // 文件状态
        const stat = statSync(abs);
        if (!stat.isFile()) return null;
        return makeTarget(abs, basename(abs), `"${stat.size}-${Math.floor(stat.mtimeMs)}"`);
    } catch {
        return null;
    }
}

/**
 * 解析某集成片文件。
 */
export function resolveEpisodeFinalMedia(root: string, episodeId: string, name: string): MediaTarget | null {
    if (!STORY_ID_RE.test(episodeId)) return null;
    // 成片目录
    const dir = join(root, FINAL_DIR, episodeId);
    // 项目根真实路径
    const projectRoot = safeRealpath(root);
    if (projectRoot === null) return null;
    // 目录真实路径
    const base = safeRealpath(dir);
    if (base === null || !isWithin(projectRoot, base)) return null;
    // 只允许 basename
    if (basename(name) !== name || name.includes("/") || name.includes("\\")) return null;
    // 文件真实路径
    const abs = safeRealpath(join(dir, name));
    if (abs === null || !isWithin(base, abs)) return null;
    try {
        // 文件状态
        const stat = statSync(abs);
        if (!stat.isFile()) return null;
        return makeTarget(abs, name, `"${stat.size}-${Math.floor(stat.mtimeMs)}"`);
    } catch {
        return null;
    }
}

/**
 * 解析单区间 Range；多区间按完整文件处理。
 */
export function parseRange(header: string | undefined, size: number): RangeParseResult {
    if (header === undefined || header.trim() === "") return { kind: "none" };
    // 仅处理单区间
    const value = header.trim();
    if (!value.startsWith("bytes=")) return { kind: "invalid" };
    // 多区间回退完整响应（浏览器播放器使用单区间）
    if (value.includes(",")) return { kind: "none" };
    // 区间匹配
    const match = /^bytes=(\d*)-(\d*)$/.exec(value);
    if (match === null) return { kind: "invalid" };
    // 起止文本
    const startText = match[1] ?? "";
    // 结束文本
    const endText = match[2] ?? "";
    if (startText === "" && endText === "") return { kind: "invalid" };
    if (size <= 0) return { kind: "invalid" };
    if (startText === "") {
        // 后缀区间
        const suffix = Number(endText);
        if (!Number.isInteger(suffix) || suffix <= 0) return { kind: "invalid" };
        return { kind: "ok", start: Math.max(size - suffix, 0), end: size - 1 };
    }
    // 起始位置
    const start = Number(startText);
    if (!Number.isInteger(start) || start < 0 || start >= size) return { kind: "invalid" };
    if (endText === "") return { kind: "ok", start, end: size - 1 };
    // 结束位置
    const end = Number(endText);
    if (!Number.isInteger(end) || end < start) return { kind: "invalid" };
    return { kind: "ok", start, end: Math.min(end, size - 1) };
}

/**
 * 输出媒体响应。
 */
export async function serveMedia(
    req: IncomingMessage,
    res: ServerResponse,
    target: MediaTarget,
    download: boolean,
): Promise<void> {
    // Range
    const range = parseRange(typeof req.headers.range === "string" ? req.headers.range : undefined, target.bytes);
    if (range.kind === "invalid") {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${target.bytes}`);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Range Not Satisfiable");
        return;
    }
    // 是否变化
    const ifNoneMatch = req.headers["if-none-match"];
    if (range.kind === "none" && typeof ifNoneMatch === "string" && ifNoneMatch === target.etag) {
        res.statusCode = 304;
        res.setHeader("ETag", target.etag);
        res.end();
        return;
    }
    // 公共响应头
    res.setHeader("Content-Type", target.content_type);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", `private, max-age=${MEDIA_CACHE_SECONDS}, immutable`);
    res.setHeader("ETag", target.etag);
    // 下载文件名
    const filename = target.name.replace(UNSAFE_FILENAME_CHARS, "_");
    res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${filename}"`);
    // 空文件直接结束
    if (range.kind === "none" && target.bytes === 0) {
        res.statusCode = 200;
        res.setHeader("Content-Length", "0");
        res.end();
        return;
    }
    // 206 或 200
    if (range.kind === "ok") {
        // 响应字节数
        const length = range.end - range.start + 1;
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${target.bytes}`);
        res.setHeader("Content-Length", String(length));
        if (req.method === "HEAD") {
            res.end();
            return;
        }
        await streamFile(target.abs, res, range.start, range.end);
        return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Length", String(target.bytes));
    if (req.method === "HEAD") {
        res.end();
        return;
    }
    await streamFile(target.abs, res, 0, Math.max(target.bytes - 1, 0));
}

/**
 * 流式发送文件片段。
 */
async function streamFile(abs: string, res: ServerResponse, start: number, end: number): Promise<void> {
    if (end < start) {
        res.end();
        return;
    }
    try {
        // 文件流
        const stream = createReadStream(abs, { start, end });
        await pipeline(stream, res);
    } catch {
        // 客户端中断或读失败；已发头时直接断开
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Internal Server Error");
        } else {
            res.destroy();
        }
    }
}
