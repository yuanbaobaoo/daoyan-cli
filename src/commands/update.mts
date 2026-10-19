/** update —— 自升级：支持 GitHub 默认源，也支持用户自建 manifest / tgz 源与代理。
 *  - 默认：GitHub tags + `npm pack git+…`（与 install.sh 同一条路径）；
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
        const args = ["-fsSL", "--max-time", String(Math.ceil(timeoutMs / 1000))];
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
 * 读取/下载 manifest。
 */
async function loadManifest(
    source: string,
    proxy: string | undefined,
): Promise<{ manifest: UpdateManifest; source: string }> {
    const remote = isHttpUrl(source);
    // 规范化后的清单地址
    const normalized = remote ? source : resolve(expandHome(source));
    let text: string;
    if (remote) {
        text = await fetchText(normalized, proxy, 15_000);
    } else {
        let st;
        try {
            st = statSync(normalized);
        } catch {
            throw new DaoyanCliError({ code: "update_failed", message: `更新清单不存在：${normalized}` });
        }
        if (!st.isFile()) {
            throw new DaoyanCliError({ code: "update_failed", message: `更新清单不是文件：${normalized}` });
        }
        text = readFileSync(normalized, "utf8");
    }
    // 解析 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(text) as unknown;
    } catch (e) {
        throw new DaoyanCliError({
            code: "update_failed",
            message: `更新清单不是合法 JSON：${remote ? redactUrl(normalized) : normalized}（${
                e instanceof Error ? e.message : String(e)
            }）`,
        });
    }
    return { manifest: parseUpdateManifest(raw), source: normalized };
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
 * 运行命令并只收集 stdout（stderr 直连终端，便于看 npm 进度）。
 */
function spawnCapture(
    cmd: string,
    args: readonly string[],
    opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ code: number; stdout: string }> {
    return new Promise((resolvePromise, rejectPromise) => {
        // 子进程句柄（stdout 管道收集；stderr 继承终端）
        const child = spawn(cmd, args, {
            cwd: opts.cwd,
            env: opts.env !== undefined ? { ...process.env, ...opts.env } : undefined,
            stdio: ["ignore", "pipe", "inherit"],
        });
        // stdout 累计
        let out = "";
        child.stdout?.on("data", (d: Buffer) => {
            out += d.toString();
        });
        child.on("error", (e) =>
            rejectPromise(
                new DaoyanCliError({ code: "external_tool_missing", message: `无法启动 ${cmd}：${e.message}` }),
            ),
        );
        child.on("close", (code) => resolvePromise({ code: code ?? -1, stdout: out }));
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
    return { kind: "github", ...proxyField };
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
 */
async function materializeTgz(
    resolved: { location: string; remote: boolean },
    sha256: string | undefined,
    proxy: string | undefined,
    version: string,
    tmp: string,
): Promise<string> {
    // 本地 tgz 路径
    let path: string;
    if (resolved.remote) {
        const fallback = `daoyan-cli-${version.replace(/^v/i, "")}.tgz`;
        path = join(tmp, tgzName(resolved.location, fallback));
        await downloadToFile(resolved.location, path, proxy, 120_000);
    } else {
        path = resolve(expandHome(resolved.location));
        let st;
        try {
            st = statSync(path);
        } catch {
            throw new DaoyanCliError({ code: "update_failed", message: `tgz 不存在：${path}` });
        }
        if (!st.isFile()) throw new DaoyanCliError({ code: "update_failed", message: `tgz 不是文件：${path}` });
    }
    // 校验
    if (sha256 !== undefined) {
        const actual = sha256File(path);
        if (actual !== sha256) {
            throw new DaoyanCliError({
                code: "update_failed",
                message: `SHA-256 校验失败（期望 ${sha256} / 实际 ${actual}）`,
                hint: "确认下载源与清单是否对应同一版本",
            });
        }
    }
    return path;
}

/**
 * 用清单升级。
 */
async function updateFromManifest(
    ctx: CliContext,
    source: Extract<UpdateSource, { kind: "manifest" }>,
    checkOnly: boolean,
): Promise<void> {
    // 清单
    let loaded: { manifest: UpdateManifest; source: string };
    try {
        loaded = await loadManifest(source.manifest, source.proxy);
    } catch (e) {
        // --check 不因源不可用而失败
        if (!checkOnly) throw e;
        const note = e instanceof Error ? e.message : String(e);
        if (ctx.json) {
            emitData({
                current: `v${VERSION}`,
                latest: null,
                updateAvailable: false,
                source: "manifest",
                manifest: isHttpUrl(source.manifest) ? redactUrl(source.manifest) : source.manifest,
                note,
                ...(source.proxy !== undefined ? { proxy: redactProxy(source.proxy) } : {}),
            });
            return;
        }
        say(`当前 v${VERSION}；无法读取更新源（${note}）`);
        return;
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
        const tgzPath = await materializeTgz(
            resolved,
            loaded.manifest.sha256,
            source.proxy,
            loaded.manifest.version,
            tmp,
        );
        await installTgz(tgzPath);
        say(`升级完成：${loaded.manifest.tag}。验证：daoyan --version`);
        if (ctx.json) {
            emitData({
                updated: loaded.manifest.tag,
                previous: currentStr,
                source: "manifest",
                manifest: manifestLabel,
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
async function updateFromTgz(ctx: CliContext, source: Extract<UpdateSource, { kind: "from" }>): Promise<void> {
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
        const tgzPath = await materializeTgz({ location, remote }, source.sha256, source.proxy, VERSION, tmp);
        await installTgz(tgzPath);
        say("安装完成。验证：daoyan --version");
        if (ctx.json) {
            emitData({
                installed: true,
                source: "from",
                file: remote ? redactUrl(location) : location,
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
            throw new DaoyanCliError({
                code: "update_failed",
                message: `npm pack 失败（退出码 ${pack.code}）。检查网络与 GitHub 可达性`,
                hint: "可改用 daoyan update --manifest 或 --from 指定镜像",
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
                : "更新源：默认 GitHub（用 daoyan update source <manifest> 更换）",
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
        say("更新源已恢复为默认 GitHub");
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
    if (flags.check && source.kind === "from") {
        usageError("--check 不能与 --from / DYCLI_UPDATE_FROM 一起使用");
    }
    if (source.kind === "from") {
        await updateFromTgz(ctx, source);
        return;
    }
    if (source.kind === "manifest") {
        await updateFromManifest(ctx, source, flags.check);
        return;
    }
    await updateFromGitHub(ctx, flags.check, source.proxy);
}
