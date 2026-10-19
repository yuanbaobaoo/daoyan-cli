/** 模型服务访问通道 —— host / 容器网络命名空间（nsenter）。
 *  exec 通道由各 provider 自己执行容器内 CLI/Python，不经过这里的 HTTP 封装。
 *  这里只发本地 HTTP 请求，不读取或记录容器环境变量。 */
import { tryExecCapture } from "../../shared/exec.mts";
import { fetchWithTimeout } from "../../shared/net.mts";
import { inspectContainer, readContainerInfo } from "./containers.mts";
import type { ProviderChannel } from "./targets.mts";

/**
 * 通道 HTTP 请求。
 */
export interface ChannelHttpRequest {
  /**
   * 路径（以 / 开头）。
   */
  path: string;
  /**
   * HTTP 方法（默认 GET）。
   */
  method?: string;
  /**
   * JSON body。
   */
  body?: unknown;
  /**
   * 超时（毫秒）。
   */
  timeoutMs?: number;
}

/**
 * 通道 HTTP 响应（只保留状态码与文本）。
 */
export interface ChannelHttpResponse {
  /**
   * 是否 2xx。
   */
  ok: boolean;
  /**
   * 状态码。
   */
  status: number;
  /**
   * 响应文本。
   */
  text: string;
}

/**
 * 在宿主机上直接请求。
 */
async function fetchDirect(
  baseUrl: string,
  req: ChannelHttpRequest,
): Promise<ChannelHttpResponse | null> {
  try {
    // 请求头与 body
    const headers: Record<string, string> = {};
    let body: string | undefined;
    if (req.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(req.body);
    }
    // 超时
    const timeoutMs = req.timeoutMs ?? 10_000;
    const res = await fetchWithTimeout(
      `${baseUrl}${req.path}`,
      {
        method: req.method ?? "GET",
        headers,
        ...(body !== undefined ? { body } : {}),
      },
      timeoutMs,
    );
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch {
    return null;
  }
}

/**
 * 在容器网络命名空间里执行本机 Node 发请求（不需要 curl/python/kubectl）。
 * 需要 nsenter 权限（通常是 root 或 CAP_SYS_ADMIN）。
 */
const NETNS_SCRIPT = [
  "const r = JSON.parse(process.argv[1]);",
  "const ac = new AbortController();",
  "const timer = setTimeout(() => ac.abort(), r.timeout_ms);",
  "timer.unref();",
  "fetch(r.url, { method: r.method, headers: r.headers, body: r.body, signal: ac.signal })",
  "  .then(async (res) => {",
  "    clearTimeout(timer);",
  "    process.stdout.write(JSON.stringify({ status: res.status, text: await res.text() }));",
  "  })",
  "  .catch((e) => {",
  "    clearTimeout(timer);",
  "    process.stderr.write(String(e));",
  "    process.exit(1);",
  "  });",
].join("\n");

/**
 * 进入目标进程的 netns，用本机 Node 调用 127.0.0.1。
 */
async function fetchViaNetns(
  pid: number,
  baseUrl: string,
  req: ChannelHttpRequest,
): Promise<ChannelHttpResponse | null> {
  // 超时
  const timeoutMs = req.timeoutMs ?? 10_000;
  // 请求体
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (req.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(req.body);
  }
  // 传给 Node 脚本的 JSON
  const payload = JSON.stringify({
    url: `${baseUrl}${req.path}`,
    method: req.method ?? "GET",
    headers,
    body,
    timeout_ms: timeoutMs,
  });
  // nsenter -t <pid> -n <host node> -e <script> <payload>
  const r = await tryExecCapture(
    "nsenter",
    ["-t", String(pid), "-n", process.execPath, "-e", NETNS_SCRIPT, payload],
    { timeoutMs: timeoutMs + 3_000 },
  );
  if (r === null || r.code !== 0) return null;
  try {
    // Node 脚本输出
    const parsed = JSON.parse(r.stdout) as { status?: unknown; text?: unknown };
    if (typeof parsed.status !== "number" || typeof parsed.text !== "string") return null;
    return {
      ok: parsed.status >= 200 && parsed.status < 300,
      status: parsed.status,
      text: parsed.text,
    };
  } catch {
    return null;
  }
}

/**
 * 通过 host / netns 通道发 HTTP 请求；exec 通道返回 null（由 provider 处理）。
 */
export async function channelFetch(
  channel: ProviderChannel,
  req: ChannelHttpRequest,
): Promise<ChannelHttpResponse | null> {
  if (channel.kind === "host") return fetchDirect(channel.base_url, req);
  if (channel.kind === "netns") {
    // PID 可能退出或被复用：必要时重新 inspect 容器，拿当前 init PID
    let pid = channel.pid;
    if (channel.container_id !== undefined) {
      let cg = readContainerInfo(pid);
      if (cg === null || cg.id !== channel.container_id) {
        const info = await inspectContainer(channel.container_id, "docker");
        if (info === null || info.hostPid === null) return null;
        pid = info.hostPid;
        cg = readContainerInfo(pid);
        if (cg === null || cg.id !== channel.container_id) return null;
      }
    }
    return fetchViaNetns(pid, channel.base_url, req);
  }
  return null;
}
