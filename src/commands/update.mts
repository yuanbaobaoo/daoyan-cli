/** update —— 自升级：默认走 GitHub Release 的 latest.json，也支持自定义 manifest / tgz 源与代理。
 *  - 默认：Release `latest.json` + 预构建 tgz（可访问 github.com 即可，不依赖 raw/npm git）；
 *  - 直连 GitHub 失败时默认尝试内置加速源（仅 github.com URL；可用 --github-proxy none 关闭）；
 *  - 兜底：默认 manifest 不可达时回退 GitHub tags + `npm pack git+…`；
 *  - 自定义：`latest.json` + 预构建 tgz，校验 SHA-256 后 `npm install -g --ignore-scripts`；
 *  - `daoyan update proxy|source` 持久化到 ~/.dycli/update.json（用户级，不进项目）；
 *  - `--check` 只检测不安装。 */
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { DaoyanCliError } from "../shared/errors.mts";
import { tryExecCapture } from "../shared/exec.mts";
import { isHttpUrl, sha256File, writeJsonAtomic } from "../shared/fs.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import { VERSION } from "../shared/version.mts";
import type { CliContext } from "../shared/context.mts";

// 默认 GitHub 源（仅默认模式使用）
const REPO_URL = "https://github.com/yuanbaobaoo/daoyan-cli.git";
const GITHUB_TAGS_API = "https://api.github.com/repos/yuanbaobaoo/daoyan-cli/tags";
// 默认更新清单：GitHub Release 资产，避免 npm 的 HTTPS→SSH 回退
export const DEFAULT_UPDATE_MANIFEST = "https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/latest.json";
// 内置 GitHub 加速源：仅在直连 GitHub 网络失败时使用（按顺序尝试）
export const DEFAULT_GITHUB_PROXIES: readonly string[] = ["https://gh-proxy.com", "https://gh.llkk.cc"];
// 关闭内置加速源的取值
const DISABLE_GITHUB_PROXY = "none";
// 经加速源读取清单的超时
const MIRROR_MANIFEST_TIMEOUT_MS = 15_000;
// 直连下载前的可达性探测超时（避免网络不通时卡满整个下载超时）
const DIRECT_PROBE_TIMEOUT_MS = 10_000;
// 单次更新下载上限（50 MiB）
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

/**
 * 用户级更新配置（~/.dycli/update.json）。
 */
export interface UpdateConfig {
    /**
     * 自定义 manifest 地址（http(s) URL 或本地路径）。
     */
    manifest?: string;
    /**
     * 更新下载代理（http/https/socks5/socks5h）。
     */
    proxy?: string;
}

/**
 * latest.json 结构。
 */
export interface UpdateManifest {
    /**
     * 清单 schema（当前 1）。
     */
    schema_version?: number;
    /**
     * 版本号（0.0.4 或 v0.0.4）。
     */
    version: string;
    /**
     * 展示用 tag（默认 v<version>）。
     */
    tag: string;
    /**
     * tgz 地址：http(s) 绝对 URL，或相对 manifest 的路径/文件名。
     */
    tgz: string;
    /**
     * tgz 的 SHA-256（远程 tgz 必填）。
     */
    sha256?: string;
}

/**
 * 更新源解析结果。
 */
export type UpdateSource =
    | {
          kind: "github";
          proxy?: string;
      }
    | {
          kind: "manifest";
          manifest: string;
          proxy?: string;
          /**
           * 默认 Release manifest 不可达时，是否回退 GitHub tags + git。
           */
          fallbackToGithub?: boolean;
      }
    | {
          kind: "from";
          from: string;
          sha256?: string;
          proxy?: string;
      };

/**
 * update 命令 flags。
 */
export interface UpdateFlags {
    check: boolean;
    manifest?: string;
    from?: string;
    sha256?: string;
    proxy?: string;
    /**
     * GitHub 加速源：http(s) 基址、逗号分隔列表，或 none 关闭。
     */
    githubProxy?: string;
}

/**
 * 解析 vX.Y.Z 语义化版本（不合法返回 null）。
 */
function parseSemver(v: string): [number, number, number] | null {
    // 版本号匹配结果
    const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v);
    return m !== null ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * 版本比较：a 是否比 b 新（按 major/minor/patch 依次比较）。
 */
function newer(a: [number, number, number], b: [number, number, number]): boolean {
    return a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
}

/**
 * 空字符串按未设置处理。
 */
function nonEmpty(v: string | undefined): string | undefined {
    if (v === undefined) return undefined;
    // 去空白后的值
    const t = v.trim();
    return t === "" ? undefined : t;
}

/**
 * 展开 ~ / ~/ 前缀。
 */
function expandHome(p: string): string {
    if (p === "~") return homedir();
    if (p.startsWith("~/")) return join(homedir(), p.slice(2));
    return p;
}

/**
 * 用户级更新配置路径。
 */
export function updateConfigPath(): string {
    return join(homedir(), ".dycli", "update.json");
}

/**
 * 读取更新配置；非法结构抛 config_invalid。
 */
export function readUpdateConfig(): UpdateConfig {
    // 配置路径
    const path = updateConfigPath();
    if (!existsSync(path)) return {};
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    } catch (e) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `更新配置不是合法 JSON：${path}（${e instanceof Error ? e.message : String(e)}）`,
        });
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new DaoyanCliError({ code: "config_invalid", message: `更新配置必须是 JSON 对象：${path}` });
    }
    // 宽松视图
    const o = raw as Record<string, unknown>;
    if (o.manifest !== undefined && typeof o.manifest !== "string") {
        throw new DaoyanCliError({ code: "config_invalid", message: `更新配置 manifest 必须是字符串：${path}` });
    }
    if (o.proxy !== undefined && typeof o.proxy !== "string") {
        throw new DaoyanCliError({ code: "config_invalid", message: `更新配置 proxy 必须是字符串：${path}` });
    }
    // 只保留非空字段
    const manifest = typeof o.manifest === "string" ? nonEmpty(o.manifest) : undefined;
    const proxy = typeof o.proxy === "string" ? nonEmpty(o.proxy) : undefined;
    return {
        ...(manifest !== undefined ? { manifest } : {}),
        ...(proxy !== undefined ? { proxy } : {}),
    };
}

/**
 * 写入更新配置（0600；代理可能包含用户名/密码）。
 */
function saveUpdateConfig(config: UpdateConfig): void {
    // 配置路径
    const path = updateConfigPath();
    writeJsonAtomic(path, {
        ...(config.manifest !== undefined ? { manifest: config.manifest } : {}),
        ...(config.proxy !== undefined ? { proxy: config.proxy } : {}),
    });
    try {
        chmodSync(path, 0o600);
    } catch {
        // 非 POSIX 平台忽略
    }
}

/**
 * 校验代理 URL；支持 http/https/socks5/socks5h。
 */
export function normalizeProxy(raw: string): string {
    // 去空白
    const value = raw.trim();
    if (value === "") usageError("proxy 不能为空");
    // 解析 URL
    const u = (() => {
        try {
            return new URL(value);
        } catch {
            usageError(`proxy 不是合法 URL：${value}`);
        }
    })();
    if (!["http:", "https:", "socks5:", "socks5h:"].includes(u.protocol)) {
        usageError(`proxy 仅支持 http/https/socks5/socks5h（收到 ${u.protocol}）`);
    }
    if (u.hostname === "") usageError("proxy 缺少主机名");
    return value;
}

/**
 * 展示用代理（隐藏用户名/密码）。
 */
export function redactProxy(proxy: string): string {
    try {
        // 解析代理
        const u = new URL(proxy);
        if (u.username === "" && u.password === "") return proxy;
        u.username = "***";
        u.password = "";
        return u.toString().replace(/\/$/, "");
    } catch {
        return "***";
    }
}

/**
 * 展示/错误用 URL（隐藏 userinfo）。
 */
function redactUrl(raw: string): string {
    try {
        const u = new URL(raw);
        if (u.username === "" && u.password === "") return raw;
        u.username = "***";
        u.password = "";
        return u.toString();
    } catch {
        return raw;
    }
}

/**
 * 是否为 github.com 的 URL（只有这类 URL 才套加速源）。
 */
export function isGithubUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return u.hostname === "github.com" || u.hostname === "www.github.com";
    } catch {
        return false;
    }
}

/**
 * 生成加速源 URL：<base>/<原始 GitHub URL>（gh-proxy 系服务的通用格式）。
 */
export function githubMirrorUrl(base: string, url: string): string {
    return `${base.replace(/\/+$/, "")}/${url}`;
}

/**
 * 解析 --github-proxy / DYCLI_UPDATE_GITHUB_PROXY：逗号分隔，none 关闭。
 */
export function parseGithubProxyList(raw: string): string[] {
    // 规范化后的原始值
    const normalized = raw.trim();
    if (normalized.toLowerCase() === DISABLE_GITHUB_PROXY) return [];
    // 解析结果
    const out: string[] = [];
    for (const part of normalized.split(",")) {
        // 去空白与末尾斜杠
        const value = part.trim().replace(/\/+$/, "");
        if (value === "") continue;
        if (!isHttpUrl(value)) usageError(`--github-proxy 必须是 http(s) URL（收到 ${value}）`);
        if (!out.includes(value)) out.push(value);
    }
    if (out.length === 0) usageError("--github-proxy 需要至少一个 http(s) URL，或使用 none 关闭");
    return out;
}

/**
 * 解析本次更新使用的 GitHub 加速源。
 * 显式 CLI/环境变量优先；否则仅在未配置 HTTP 代理时启用内置列表。
 */
export function resolveGithubProxies(
    flags: UpdateFlags,
    env: NodeJS.ProcessEnv,
    httpProxy: string | undefined,
): string[] {
    // 显式值：CLI > 环境变量
    const raw = nonEmpty(flags.githubProxy) ?? nonEmpty(env.DYCLI_UPDATE_GITHUB_PROXY);
    if (raw !== undefined) return parseGithubProxyList(raw);
    // 已配置 HTTP 代理时，不默认叠加第三方加速源
    if (httpProxy !== undefined) return [];
    return [...DEFAULT_GITHUB_PROXIES];
}

/**
 * 判断两个清单是否描述同一版本（多加速源一致性校验）。
 */
export function sameUpdateManifest(a: UpdateManifest, b: UpdateManifest): boolean {
    // 版本（忽略 v 前缀）
    const va = a.version.replace(/^v/i, "");
    // 对侧版本
    const vb = b.version.replace(/^v/i, "");
    return va === vb && a.tgz === b.tgz && (a.sha256 ?? null) === (b.sha256 ?? null);
}

/**
 * 代理注入到子进程环境（不进入 argv）。
 */
function proxyEnv(proxy: string): NodeJS.ProcessEnv {
    return {
        HTTPS_PROXY: proxy,
        HTTP_PROXY: proxy,
        ALL_PROXY: proxy,
        https_proxy: proxy,
        http_proxy: proxy,
        all_proxy: proxy,
    };
}

/**
 * 清理 curl 错误文本中的 URL/代理凭据。
 */
function safeCurlDetail(stderr: string, url: string, proxy?: string): string {
    // 去敏后的文本
    let out = stderr.replaceAll(url, redactUrl(url));
    if (proxy !== undefined) out = out.replaceAll(proxy, redactProxy(proxy));
    return (out.trim().split("\n")[0] ?? "").slice(0, 200);
}

/**
 * HTTP 文本请求：无代理走 Node fetch；有代理走 curl（Node fetch 默认不读代理环境）。
 */
async function fetchText(
    url: string,
    proxy: string | undefined,
    timeoutMs: number,
    headers: Record<string, string> = {},
): Promise<string> {
    if (proxy !== undefined) {
        // curl 参数
        const args = ["-fsSL", "--connect-timeout", "8", "--max-time", String(Math.ceil(timeoutMs / 1000))];
        for (const [k, v] of Object.entries(headers)) args.push("-H", `${k}: ${v}`);
        args.push(url);
        const r = await tryExecCapture("curl", args, {
            timeoutMs: timeoutMs + 5_000,
            env: proxyEnv(proxy),
        });
        if (r === null) {
            throw new DaoyanCliError({
                code: "external_tool_missing",
                message: "配置代理后更新需要 curl；请安装 curl，或改用本地 --from 文件",
            });
        }
        if (r.code !== 0) {
            throw new DaoyanCliError({
                code: "update_failed",
                message: `请求失败：${redactUrl(url)}（curl 退出码 ${r.code}）`,
                retryable: true,
                hint: safeCurlDetail(r.stderr, url, proxy),
            });
        }
        return r.stdout.replace(/^\uFEFF/, "");
    }
    // 无代理
    let res: Response;
    try {
        res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `请求失败：${redactUrl(url)}（${e instanceof Error ? e.message : String(e)}）`,
            retryable: true,
        });
    }
    if (!res.ok) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `请求失败：${redactUrl(url)}（HTTP ${res.status}）`,
            retryable: true,
        });
    }
    return (await res.text()).replace(/^\uFEFF/, "");
}

/**
 * 下载文件：无代理走 fetch；有代理走 curl。
 */
async function downloadToFile(url: string, dest: string, proxy: string | undefined, timeoutMs: number): Promise<void> {
    if (proxy !== undefined) {
        const r = await tryExecCapture(
            "curl",
            [
                "-fsSL",
                "--connect-timeout",
                "8",
                "--max-time",
                String(Math.ceil(timeoutMs / 1000)),
                "--max-filesize",
                String(MAX_DOWNLOAD_BYTES),
                "-o",
                dest,
                url,
            ],
            { timeoutMs: timeoutMs + 5_000, env: proxyEnv(proxy) },
        );
        if (r === null) {
            throw new DaoyanCliError({
                code: "external_tool_missing",
                message: "配置代理后更新需要 curl；请安装 curl，或改用本地 --from 文件",
            });
        }
        if (r.code !== 0) {
            throw new DaoyanCliError({
                code: "update_failed",
                message: `下载失败：${redactUrl(url)}（curl 退出码 ${r.code}）`,
                retryable: true,
                hint: safeCurlDetail(r.stderr, url, proxy),
            });
        }
        return;
    }
    // 无代理
    let res: Response;
    try {
        res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `下载失败：${redactUrl(url)}（${e instanceof Error ? e.message : String(e)}）`,
            retryable: true,
        });
    }
    if (!res.ok) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `下载失败：${redactUrl(url)}（HTTP ${res.status}）`,
            retryable: true,
        });
    }
    // 大小上限（能拿到 Content-Length 时）
    const len = Number(res.headers.get("content-length"));
    if (Number.isFinite(len) && len > MAX_DOWNLOAD_BYTES) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `tgz 超过大小上限（${len} bytes）`,
        });
    }
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * 直连可达性探测：HEAD 成功（或 405 不允许 HEAD）才走直连下载，
 * 避免网络不通时卡满整个下载超时。
 */
async function probeDownloadUrl(url: string): Promise<void> {
    // HEAD 响应
    let res: Response;
    try {
        res = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            headers: { "user-agent": "daoyan-cli-update" },
            signal: AbortSignal.timeout(DIRECT_PROBE_TIMEOUT_MS),
        });
    } catch (e) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `直连探测失败：${redactUrl(url)}（${e instanceof Error ? e.message : String(e)}）`,
            retryable: true,
        });
    }
    if (!res.ok && res.status !== 405) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `直连探测失败：${redactUrl(url)}（HTTP ${res.status}）`,
            retryable: true,
        });
    }
}

/**
 * 解析 latest.json（供测试与 update 共用）。
 */
export function parseUpdateManifest(raw: unknown): UpdateManifest {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new DaoyanCliError({ code: "update_failed", message: "更新清单必须是 JSON 对象" });
    }
    // 宽松视图
    const o = raw as Record<string, unknown>;
    if (o.schema_version !== undefined && o.schema_version !== 1) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `不支持的更新清单 schema_version：${String(o.schema_version)}`,
        });
    }
    // 版本
    const versionRaw = typeof o.version === "string" ? o.version.trim() : "";
    if (parseSemver(versionRaw) === null) {
        throw new DaoyanCliError({ code: "update_failed", message: "更新清单缺少合法 version（X.Y.Z）" });
    }
    // tag（展示用）
    const tagRaw =
        typeof o.tag === "string" && o.tag.trim() !== "" ? o.tag.trim() : `v${versionRaw.replace(/^v/i, "")}`;
    // tgz（支持 tgz / asset 两种字段）
    const tgzRaw =
        typeof o.tgz === "string" && o.tgz.trim() !== ""
            ? o.tgz.trim()
            : typeof o.asset === "string"
              ? o.asset.trim()
              : "";
    if (tgzRaw === "") {
        throw new DaoyanCliError({ code: "update_failed", message: "更新清单缺少 tgz" });
    }
    // sha256
    const shaRaw = typeof o.sha256 === "string" ? o.sha256.trim().toLowerCase() : undefined;
    if (shaRaw !== undefined && !/^[0-9a-f]{64}$/.test(shaRaw)) {
        throw new DaoyanCliError({ code: "update_failed", message: "更新清单 sha256 必须是 64 位十六进制" });
    }
    return {
        schema_version: 1,
        version: versionRaw,
        tag: tagRaw,
        tgz: tgzRaw,
        ...(shaRaw !== undefined ? { sha256: shaRaw } : {}),
    };
}

/**
 * 解析清单中的 tgz 地址：远程返回 URL，本地返回绝对路径。
 */
export function resolveTgz(source: string, tgz: string): { location: string; remote: boolean } {
    if (isHttpUrl(tgz)) return { location: tgz, remote: true };
    if (isHttpUrl(source)) {
        // 相对 URL 基于 manifest 解析
        let u: URL;
        try {
            u = new URL(tgz, source);
        } catch {
            throw new DaoyanCliError({ code: "update_failed", message: "无法解析清单中的 tgz 地址" });
        }
        if (u.protocol !== "http:" && u.protocol !== "https:") {
            throw new DaoyanCliError({ code: "update_failed", message: "远程清单只允许 http(s) tgz" });
        }
        return { location: u.toString(), remote: true };
    }
    // 本地清单：相对路径基于清单目录
    return {
        location: isAbsolute(tgz) ? tgz : resolve(dirname(resolve(source)), tgz),
        remote: false,
    };
}

/**
 * 解析清单文本（JSON + 结构校验）。
 */
function parseManifestText(text: string, label: string): UpdateManifest {
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(text) as unknown;
    } catch (e) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `更新清单不是合法 JSON：${label}（${e instanceof Error ? e.message : String(e)}）`,
        });
    }
    return parseUpdateManifest(raw);
}

/**
 * 读取/下载 manifest。
 * 直连失败时（仅 GitHub URL）依次读取内置加速源；多个源结果必须一致。
 */
async function loadManifest(
    source: string,
    proxy: string | undefined,
    githubProxies: string[],
): Promise<{ manifest: UpdateManifest; source: string; via_proxy: string | null }> {
    const remote = isHttpUrl(source);
    // 规范化后的清单地址
    const normalized = remote ? source : resolve(expandHome(source));
    if (!remote) {
        let st;
        try {
            st = statSync(normalized);
        } catch {
            throw new DaoyanCliError({ code: "update_failed", message: `更新清单不存在：${normalized}` });
        }
        if (!st.isFile()) {
            throw new DaoyanCliError({ code: "update_failed", message: `更新清单不是文件：${normalized}` });
        }
        return {
            manifest: parseManifestText(readFileSync(normalized, "utf8"), normalized),
            source: normalized,
            via_proxy: null,
        };
    }
    // 直连（或用户配置的 HTTP 代理）
    let directError: unknown = null;
    try {
        const text = await fetchText(normalized, proxy, 15_000);
        return { manifest: parseManifestText(text, redactUrl(normalized)), source: normalized, via_proxy: null };
    } catch (e) {
        directError = e;
    }
    // 非 GitHub 或未启用加速源：保留原始错误
    if (githubProxies.length === 0 || !isGithubUrl(normalized)) throw directError;
    // 依次读取加速源
    const results: Array<{ manifest: UpdateManifest; via: string }> = [];
    // 各加速源错误
    const errors: string[] = [];
    for (const base of githubProxies) {
        try {
            const text = await fetchText(githubMirrorUrl(base, normalized), proxy, MIRROR_MANIFEST_TIMEOUT_MS);
            results.push({ manifest: parseManifestText(text, redactUrl(base)), via: base });
        } catch (e) {
            errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    if (results.length === 0) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `直连与 GitHub 加速源均不可用：${redactUrl(normalized)}`,
            retryable: true,
            hint: "可用 --github-proxy <url> 指定可达加速源，或用 --manifest 指向镜像清单",
            details: {
                direct_error: directError instanceof Error ? directError.message : String(directError),
                mirror_errors: errors,
            },
        });
    }
    // 首选结果
    const first = results[0] as { manifest: UpdateManifest; via: string };
    for (const other of results.slice(1)) {
        if (!sameUpdateManifest(first.manifest, other.manifest)) {
            throw new DaoyanCliError({
                code: "update_failed",
                message: "多个 GitHub 加速源返回的清单不一致，已拒绝安装",
                hint: "用 --github-proxy 指定可信加速源，或用 --manifest 指向官方镜像",
                details: {
                    mirror_mismatch: true,
                    mirrors: results.map((r) => r.via),
                    versions: results.map((r) => r.manifest.version),
                },
            });
        }
    }
    return { manifest: first.manifest, source: normalized, via_proxy: first.via };
}

/**
 * 探测 GitHub 最新 tag；不可达返回 note。
 */
async function latestTag(proxy?: string): Promise<{ tag: string | null; note: string }> {
    try {
        // tags 接口响应
        const text = await fetchText(GITHUB_TAGS_API, proxy, 15_000, {
            "user-agent": "daoyan-cli-update",
            accept: "application/vnd.github+json",
        });
        // tags 列表
        const tags = JSON.parse(text) as unknown;
        if (!Array.isArray(tags)) return { tag: null, note: "GitHub tags 响应格式异常" };
        // 已扫描到的最新版本
        let best: { tag: string; v: [number, number, number] } | null = null;
        for (const t of tags) {
            if (typeof t !== "object" || t === null) continue;
            // 当前 tag
            const name = (t as Record<string, unknown>).name;
            if (typeof name !== "string") continue;
            const v = parseSemver(name);
            if (v === null) continue;
            if (best === null || newer(v, best.v)) best = { tag: name, v };
        }
        return best === null ? { tag: null, note: "仓库尚无语义化 tag（vX.Y.Z）" } : { tag: best.tag, note: "" };
    } catch (e) {
        return { tag: null, note: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * 运行命令：stdout 收集（用于 npm pack 文件名），stderr 转发终端并保留尾部。
 */
function spawnCapture(
    cmd: string,
    args: readonly string[],
    opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolvePromise, rejectPromise) => {
        // 子进程句柄（stdout 管道收集；stderr 管道转发 + 保留尾部）
        const child = spawn(cmd, args, {
            cwd: opts.cwd,
            env: opts.env !== undefined ? { ...process.env, ...opts.env } : undefined,
            stdio: ["ignore", "pipe", "pipe"],
        });
        // stdout 累计
        let out = "";
        // stderr 尾部
        let errTail = "";
        child.stdout?.on("data", (d: Buffer) => {
            out += d.toString();
        });
        child.stderr?.on("data", (d: Buffer) => {
            process.stderr.write(d);
            // 拼接后的 stderr
            const next = errTail + d.toString();
            errTail = next.length > 8_000 ? next.slice(-8_000) : next;
        });
        child.on("error", (e) =>
            rejectPromise(
                new DaoyanCliError({ code: "external_tool_missing", message: `无法启动 ${cmd}：${e.message}` }),
            ),
        );
        child.on("close", (code) => resolvePromise({ code: code ?? -1, stdout: out, stderr: errTail }));
    });
}

/**
 * 解析 update flags。
 */
export function parseUpdateFlags(args: string[]): UpdateFlags {
    // 结果
    const out: UpdateFlags = { check: false };
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === undefined) break;
        // 参数名/内联值
        const { name, inline } = splitInlineFlag(a);
        if (name === "--check") {
            if (inline !== undefined) usageError("--check 不接受参数");
            out.check = true;
            continue;
        }
        if (name === "--manifest") {
            const v = takeValue(args, i, inline, "--manifest");
            out.manifest = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--from") {
            const v = takeValue(args, i, inline, "--from");
            out.from = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--sha256") {
            const v = takeValue(args, i, inline, "--sha256");
            const sha = v.value.trim().toLowerCase();
            if (!/^[0-9a-f]{64}$/.test(sha)) usageError("--sha256 需要 64 位十六进制");
            out.sha256 = sha;
            i += v.skip;
            continue;
        }
        if (name === "--github-proxy") {
            const v = takeValue(args, i, inline, "--github-proxy");
            out.githubProxy = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--proxy") {
            const v = takeValue(args, i, inline, "--proxy");
            out.proxy = normalizeProxy(v.value);
            i += v.skip;
            continue;
        }
        if (name.startsWith("-")) usageError(`未知参数 ${name}`);
        usageError(`update 不接受位置参数：${a}`);
    }
    if (out.from !== undefined && out.manifest !== undefined) {
        usageError("--from 与 --manifest 不能同时使用");
    }
    if (out.check && out.from !== undefined) {
        usageError("--check 不能与 --from 一起使用");
    }
    if (out.sha256 !== undefined && out.from === undefined) {
        usageError("--sha256 只能与 --from 一起使用");
    }
    return out;
}

/**
 * 按优先级解析更新源：CLI > DYCLI_* 环境变量 > 用户配置 > GitHub。
 */
export function resolveUpdateSource(flags: UpdateFlags, env: NodeJS.ProcessEnv, config: UpdateConfig): UpdateSource {
    // DYCLI 代理优先；也兼容标准代理环境变量
    const envProxyRaw = nonEmpty(env.DYCLI_UPDATE_PROXY);
    const envProxy = envProxyRaw !== undefined ? normalizeProxy(envProxyRaw) : undefined;
    const standardProxy =
        nonEmpty(env.HTTPS_PROXY) ?? nonEmpty(env.https_proxy) ?? nonEmpty(env.ALL_PROXY) ?? nonEmpty(env.all_proxy);
    // 最终代理
    const proxy = flags.proxy ?? envProxy ?? config.proxy ?? standardProxy;
    // 代理字段
    const proxyField = proxy !== undefined ? { proxy } : {};
    if (flags.from !== undefined) {
        return {
            kind: "from",
            from: flags.from,
            ...(flags.sha256 !== undefined ? { sha256: flags.sha256 } : {}),
            ...proxyField,
        };
    }
    if (flags.manifest !== undefined) return { kind: "manifest", manifest: flags.manifest, ...proxyField };
    // 环境变量：直接 tgz 优先于 manifest
    const envFrom = nonEmpty(env.DYCLI_UPDATE_FROM);
    if (envFrom !== undefined) {
        const envShaRaw = nonEmpty(env.DYCLI_UPDATE_SHA256);
        const envSha = envShaRaw !== undefined ? envShaRaw.toLowerCase() : undefined;
        if (envSha !== undefined && !/^[0-9a-f]{64}$/.test(envSha)) {
            throw new DaoyanCliError({
                code: "config_invalid",
                message: "DYCLI_UPDATE_SHA256 需要 64 位十六进制",
            });
        }
        return {
            kind: "from",
            from: envFrom,
            ...(envSha !== undefined ? { sha256: envSha } : {}),
            ...proxyField,
        };
    }
    const envManifest = nonEmpty(env.DYCLI_UPDATE_MANIFEST);
    if (envManifest !== undefined) return { kind: "manifest", manifest: envManifest, ...proxyField };
    if (config.manifest !== undefined) return { kind: "manifest", manifest: config.manifest, ...proxyField };
    return { kind: "manifest", manifest: DEFAULT_UPDATE_MANIFEST, fallbackToGithub: true, ...proxyField };
}

/**
 * 安装本地 tgz（已校验），禁用生命周期脚本与网络审计。
 */
async function installTgz(tgzPath: string): Promise<void> {
    // npm 可执行文件（Windows 下为 npm.cmd）
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    // 捕获 stdout，避免 JSON 模式被 npm 输出污染；stderr 正常显示
    const r = await spawnCapture(npm, ["install", "-g", "--ignore-scripts", "--no-audit", "--no-fund", tgzPath]);
    if (r.code !== 0) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `npm install -g 失败（退出码 ${r.code}）`,
            hint: "EACCES 时考虑 nvm 或自定义 npm prefix",
            details: { exit: r.code },
        });
    }
}

/**
 * 远端 tgz 文件名；异常时使用版本号兜底。
 */
function tgzName(location: string, fallback: string): string {
    try {
        // URL 路径最后一段
        const u = new URL(location);
        const raw = decodeURIComponent(u.pathname.split("/").pop() ?? "");
        const name = basename(raw);
        return /\.(tgz|tar\.gz)$/i.test(name) ? name : fallback;
    } catch {
        const name = basename(location);
        return /\.(tgz|tar\.gz)$/i.test(name) ? name : fallback;
    }
}

/**
 * 把 tgz 落到本地（下载或校验本地文件），并校验 SHA-256。
 * 直连失败时（仅 GitHub URL）依次尝试加速源；每个来源都必须通过 SHA-256。
 */
async function materializeTgz(
    resolved: { location: string; remote: boolean },
    sha256: string | undefined,
    proxy: string | undefined,
    version: string,
    tmp: string,
    githubProxies: string[],
    skipDirect = false,
): Promise<{ path: string; via_proxy: string | null }> {
    // 本地 tgz
    if (!resolved.remote) {
        // 本地文件路径
        const localPath = resolve(expandHome(resolved.location));
        let st;
        try {
            st = statSync(localPath);
        } catch {
            throw new DaoyanCliError({ code: "update_failed", message: `tgz 不存在：${localPath}` });
        }
        if (!st.isFile()) throw new DaoyanCliError({ code: "update_failed", message: `tgz 不是文件：${localPath}` });
        if (sha256 !== undefined) {
            // 实际哈希
            const actual = sha256File(localPath);
            if (actual !== sha256) {
                throw new DaoyanCliError({
                    code: "update_failed",
                    message: `SHA-256 校验失败（期望 ${sha256} / 实际 ${actual}）`,
                    hint: "确认下载源与清单是否对应同一版本",
                });
            }
        }
        return { path: localPath, via_proxy: null };
    }
    // 本地下载路径
    const fallback = `daoyan-cli-${version.replace(/^v/i, "")}.tgz`;
    const path = join(tmp, tgzName(resolved.location, fallback));
    // 候选地址：直连 + GitHub 加速源
    const candidates: Array<{ url: string; via: string | null }> = [];
    if (!skipDirect) candidates.push({ url: resolved.location, via: null });
    if (githubProxies.length > 0 && isGithubUrl(resolved.location)) {
        for (const base of githubProxies) {
            candidates.push({ url: githubMirrorUrl(base, resolved.location), via: base });
        }
    }
    // 各来源错误
    const errors: string[] = [];
    if (candidates.length === 0) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: "没有可用的 tgz 下载地址",
            hint: "检查 --github-proxy / 更新清单配置",
        });
    }
    for (const candidate of candidates) {
        try {
            // 直连先做 HEAD 探测，避免网络不通时卡满下载超时
            if (candidate.via === null && proxy === undefined) {
                await probeDownloadUrl(candidate.url);
            }
            // 清理上一次失败留下的文件
            rmSync(path, { force: true });
            await downloadToFile(candidate.url, path, proxy, 120_000);
            if (sha256 !== undefined) {
                // 实际哈希
                const actual = sha256File(path);
                if (actual !== sha256) {
                    throw new DaoyanCliError({
                        code: "update_failed",
                        message: `SHA-256 校验失败（期望 ${sha256} / 实际 ${actual}）`,
                    });
                }
            }
            return { path, via_proxy: candidate.via };
        } catch (e) {
            errors.push(`${candidate.via ?? "直连"}: ${e instanceof Error ? e.message : String(e)}`);
            rmSync(path, { force: true });
        }
    }
    throw new DaoyanCliError({
        code: "update_failed",
        message: `下载 tgz 失败（已尝试 ${candidates.length} 个地址）`,
        retryable: true,
        hint: "可用 --github-proxy <url> 指定加速源，或用 --from 指定本地/其他来源的 tgz",
        details: { errors, sha256 },
    });
}

/**
 * 用清单升级。
 */
async function updateFromManifest(
    ctx: CliContext,
    source: Extract<UpdateSource, { kind: "manifest" }>,
    checkOnly: boolean,
    githubProxies: string[],
): Promise<void> {
    // 清单
    let loaded: { manifest: UpdateManifest; source: string; via_proxy: string | null };
    try {
        loaded = await loadManifest(source.manifest, source.proxy, githubProxies);
    } catch (e) {
        // 失败原因
        const note = e instanceof Error ? e.message : String(e);
        // 加速源清单互相矛盾：不可回退 git，直接失败
        const mismatch =
            e instanceof DaoyanCliError && typeof e.details === "object" && e.details !== null
                ? e.details.mirror_mismatch === true
                : false;
        // 默认 Release manifest 不可达：回退 GitHub tags + git（旧版本兼容路径）
        if (!checkOnly && source.fallbackToGithub === true && !mismatch) {
            if (!ctx.json) say(`默认更新源不可达（${note}），回退 GitHub tags 安装 ...`);
            await updateFromGitHub(ctx, checkOnly, source.proxy);
            return;
        }
        // 加速源清单互相矛盾属于完整性问题，--check 也直接失败
        if (checkOnly && mismatch) throw e;
        // --check 不因源不可用而失败
        if (!checkOnly) throw e;
        if (ctx.json) {
            emitData({
                current: `v${VERSION}`,
                latest: null,
                updateAvailable: false,
                source: "manifest",
                manifest: isHttpUrl(source.manifest) ? redactUrl(source.manifest) : source.manifest,
                via_proxy: null,
                note,
                ...(source.proxy !== undefined ? { proxy: redactProxy(source.proxy) } : {}),
            });
            return;
        }
        say(`当前 v${VERSION}；无法读取更新源（${note}）`);
        return;
    }
    // 本次实际使用的加速源（清单或 tgz）
    let viaProxy = loaded.via_proxy;
    if (viaProxy !== null && !ctx.json) {
        say(`GitHub 直连失败，本次清单来自加速源 ${viaProxy}`);
    }
    // 版本比较
    const currentStr = `v${VERSION}`;
    const currentV = parseSemver(VERSION);
    const latestV = parseSemver(loaded.manifest.version);
    const hasUpdate = currentV !== null && latestV !== null && newer(latestV, currentV);
    // JSON 公共字段
    const manifestLabel = isHttpUrl(loaded.source) ? redactUrl(loaded.source) : loaded.source;
    const proxyField = source.proxy !== undefined ? { proxy: redactProxy(source.proxy) } : {};
    if (checkOnly || !hasUpdate) {
        if (ctx.json) {
            emitData({
                current: currentStr,
                latest: loaded.manifest.tag,
                updateAvailable: hasUpdate,
                source: "manifest",
                manifest: manifestLabel,
                via_proxy: viaProxy,
                ...proxyField,
            });
            return;
        }
        if (hasUpdate) say(`有新版本 ${loaded.manifest.tag}（当前 ${currentStr}）。运行 daoyan update 升级`);
        else say(`已是最新（当前 ${currentStr}，更新源最新 ${loaded.manifest.tag}）`);
        return;
    }
    // tgz 地址
    const resolved = resolveTgz(loaded.source, loaded.manifest.tgz);
    if (resolved.remote && loaded.manifest.sha256 === undefined) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: "更新清单缺少 sha256；远程 tgz 必须校验",
            hint: "在 latest.json 中加入 sha256，或使用 daoyan update --from 本地文件",
        });
    }
    say(`检测到新版本 ${loaded.manifest.tag}（当前 ${currentStr}），开始自升级...`);
    // 临时目录
    const tmp = mkdtempSync(join(tmpdir(), "daoyan-cli-update-"));
    try {
        const tgz = await materializeTgz(
            resolved,
            loaded.manifest.sha256,
            source.proxy,
            loaded.manifest.version,
            tmp,
            githubProxies,
            loaded.via_proxy !== null,
        );
        if (tgz.via_proxy !== null) {
            viaProxy = tgz.via_proxy;
            if (!ctx.json) say(`tgz 下载走加速源 ${tgz.via_proxy}`);
        }
        await installTgz(tgz.path);
        say(`升级完成：${loaded.manifest.tag}。验证：daoyan --version`);
        if (ctx.json) {
            emitData({
                updated: loaded.manifest.tag,
                previous: currentStr,
                source: "manifest",
                manifest: manifestLabel,
                via_proxy: viaProxy,
                ...proxyField,
            });
        }
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

/**
 * 直接从指定 tgz 安装。
 */
async function updateFromTgz(
    ctx: CliContext,
    source: Extract<UpdateSource, { kind: "from" }>,
    githubProxies: string[],
): Promise<void> {
    const remote = isHttpUrl(source.from);
    if (remote && source.sha256 === undefined) {
        throw new DaoyanCliError({
            code: "usage",
            message: "远程 --from 需要 --sha256",
            hint: "从发布页的 SHA256SUMS 获取校验值；本地 tgz 可省略",
            exit: 2,
        });
    }
    const location = remote ? source.from : resolve(expandHome(source.from));
    say(`从 ${remote ? redactUrl(location) : location} 安装...`);
    // 临时目录
    const tmp = mkdtempSync(join(tmpdir(), "daoyan-cli-update-"));
    try {
        const tgz = await materializeTgz(
            { location, remote },
            source.sha256,
            source.proxy,
            VERSION,
            tmp,
            githubProxies,
        );
        if (tgz.via_proxy !== null) {
            if (!ctx.json) say(`tgz 下载走加速源 ${tgz.via_proxy}`);
        }
        await installTgz(tgz.path);
        say("安装完成。验证：daoyan --version");
        if (ctx.json) {
            emitData({
                installed: true,
                source: "from",
                file: remote ? redactUrl(location) : location,
                via_proxy: tgz.via_proxy,
            });
        }
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

/**
 * 默认 GitHub 源升级（保留原有行为）。
 */
async function updateFromGitHub(ctx: CliContext, checkOnly: boolean, proxy: string | undefined): Promise<void> {
    // 最新 tag 与备注
    const { tag, note } = await latestTag(proxy);
    // 当前版本
    const current = parseSemver(VERSION);
    const currentStr = `v${VERSION}`;
    // 代理展示
    const proxyField = proxy !== undefined ? { proxy: redactProxy(proxy) } : {};
    if (tag === null) {
        if (ctx.json) {
            emitData({ current: currentStr, latest: null, note, source: "github", ...proxyField });
            return;
        }
        say(`当前 ${currentStr}；无法确定最新版（${note}）`);
        return;
    }
    // 最新版本
    const latestV = parseSemver(tag);
    const hasUpdate = current !== null && latestV !== null && newer(latestV, current);
    if (checkOnly || !hasUpdate) {
        if (ctx.json) {
            emitData({ current: currentStr, latest: tag, updateAvailable: hasUpdate, source: "github", ...proxyField });
            return;
        }
        if (hasUpdate) say(`有新版本 ${tag}（当前 ${currentStr}）。运行 daoyan update 升级`);
        else say(`已是最新（当前 ${currentStr}，GitHub 最新 tag ${tag}）`);
        return;
    }
    say(`检测到新版本 ${tag}（当前 ${currentStr}），开始自升级...`);
    // npm 可执行文件
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    // 临时目录
    const tmp = mkdtempSync(join(tmpdir(), "daoyan-cli-update-"));
    try {
        // 两步法：npm pack → npm install -g
        const pack = await spawnCapture(npm, ["pack", "--silent", `git+${REPO_URL}#${tag}`], {
            cwd: tmp,
            ...(proxy !== undefined ? { env: proxyEnv(proxy) } : {}),
        });
        if (pack.code !== 0) {
            // 是否为 npm 从 HTTPS 静默回退 SSH 的典型错误
            const sshFallback = /permission denied|publickey|ssh/i.test(pack.stderr);
            throw new DaoyanCliError({
                code: "update_failed",
                message: `npm pack 失败（退出码 ${pack.code}）${sshFallback ? "：npm 可能在 HTTPS 失败后回退 SSH" : ""}`,
                hint: sshFallback
                    ? `改用 Release 清单绕过 npm git：daoyan update --manifest ${DEFAULT_UPDATE_MANIFEST}`
                    : "可改用 daoyan update --manifest 或 --from 指定镜像",
                details: { exit: pack.code, last_error: pack.stderr.trim().slice(-4000) },
            });
        }
        // tgz 文件名（最后一行）
        const tgz = pack.stdout
            .trim()
            .split("\n")
            .filter((l) => l !== "")
            .pop();
        if (tgz === undefined) {
            throw new DaoyanCliError({ code: "update_failed", message: "npm pack 未产出 tarball" });
        }
        await installTgz(join(tmp, tgz));
        say(`升级完成：${tag}。验证：daoyan --version`);
        if (ctx.json) emitData({ updated: tag, previous: currentStr, source: "github", ...proxyField });
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

/**
 * `daoyan update proxy`：查看/设置/清除更新代理。
 */
function runProxyCommand(ctx: CliContext, args: string[]): void {
    // 当前配置
    const config = readUpdateConfig();
    if (args.length === 0) {
        const proxy = config.proxy ?? null;
        if (ctx.json) {
            emitData({ proxy: proxy !== null ? redactProxy(proxy) : null, path: updateConfigPath() });
            return;
        }
        say(proxy !== null ? `更新代理：${redactProxy(proxy)}` : "更新代理：未设置");
        return;
    }
    if (args.length === 1 && args[0] === "--unset") {
        delete config.proxy;
        saveUpdateConfig(config);
        if (ctx.json) {
            emitData({ proxy: null, path: updateConfigPath() });
            return;
        }
        say("更新代理已清除");
        return;
    }
    if (args.length !== 1) usageError("用法：daoyan update proxy [<url>|--unset]");
    // 新代理
    const proxy = normalizeProxy(args[0] ?? "");
    config.proxy = proxy;
    saveUpdateConfig(config);
    if (ctx.json) {
        emitData({ proxy: redactProxy(proxy), path: updateConfigPath() });
        return;
    }
    say(`更新代理已设置：${redactProxy(proxy)}`);
}

/**
 * `daoyan update source`：查看/设置/清除更新源。
 */
function runSourceCommand(ctx: CliContext, args: string[]): void {
    // 当前配置
    const config = readUpdateConfig();
    if (args.length === 0) {
        const manifest = config.manifest ?? null;
        if (ctx.json) {
            emitData({ manifest: manifest !== null ? redactUrl(manifest) : null, path: updateConfigPath() });
            return;
        }
        say(
            manifest !== null
                ? `更新源：${redactUrl(manifest)}`
                : `更新源：默认 Release 清单（${DEFAULT_UPDATE_MANIFEST}）`,
        );
        return;
    }
    if (args.length === 1 && args[0] === "--unset") {
        delete config.manifest;
        saveUpdateConfig(config);
        if (ctx.json) {
            emitData({ manifest: null, path: updateConfigPath() });
            return;
        }
        say("更新源已恢复为默认 Release 清单");
        return;
    }
    if (args.length !== 1) usageError("用法：daoyan update source [<manifest>|--unset]");
    // URL 或本地清单
    const raw = args[0] ?? "";
    const manifest = isHttpUrl(raw) ? raw : resolve(expandHome(raw));
    if (!isHttpUrl(manifest)) {
        let st;
        try {
            st = statSync(manifest);
        } catch {
            usageError(`更新清单不存在：${manifest}`);
        }
        if (!st.isFile()) usageError(`更新清单不是文件：${manifest}`);
    }
    config.manifest = manifest;
    saveUpdateConfig(config);
    if (ctx.json) {
        emitData({ manifest: redactUrl(manifest), path: updateConfigPath() });
        return;
    }
    say(`更新源已设置：${redactUrl(manifest)}`);
}

/**
 * update 命令入口：查询/设置源与代理、检查更新、执行升级。
 */
export async function runUpdate(ctx: CliContext, args: string[]): Promise<void> {
    // 子命令：proxy / source
    if (args[0] === "proxy") {
        runProxyCommand(ctx, args.slice(1));
        return;
    }
    if (args[0] === "source") {
        runSourceCommand(ctx, args.slice(1));
        return;
    }
    // flags
    const flags = parseUpdateFlags(args);
    const config = readUpdateConfig();
    const source = resolveUpdateSource(flags, process.env, config);
    // 本次更新的 GitHub 加速源（直连失败时使用）
    const githubProxies = resolveGithubProxies(flags, process.env, source.proxy);
    if (flags.check && source.kind === "from") {
        usageError("--check 不能与 --from / DYCLI_UPDATE_FROM 一起使用");
    }
    if (source.kind === "from") {
        await updateFromTgz(ctx, source, githubProxies);
        return;
    }
    if (source.kind === "manifest") {
        await updateFromManifest(ctx, source, flags.check, githubProxies);
        return;
    }
    await updateFromGitHub(ctx, flags.check, source.proxy);
}
