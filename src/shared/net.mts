/** 网络小工具 —— 分配空闲端口、探测 TCP 端口占用、带超时 fetch。 */
import { Socket, createServer } from "node:net";

/**
 * 从系统申请一个空闲端口（绑定 127.0.0.1:0 后立即释放）。
 */
export function freePort(host = "127.0.0.1"): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    // 临时监听器（拿系统分配的端口）
    const srv = createServer();
    srv.once("error", rejectPromise);
    srv.listen(0, host, () => {
      // 系统分配的端口
      const addr = srv.address();
      // 端口号（监听成功时必有）
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      srv.close(() => {
        if (port <= 0) rejectPromise(new Error("无法分配空闲端口"));
        else resolvePromise(port);
      });
    });
  });
}

/**
 * TCP 端口是否有进程监听（true = 被占用）。
 */
export function portInUse(port: number, host = "127.0.0.1", timeoutMs = 800): Promise<boolean> {
  return new Promise((resolvePromise) => {
    // 探测连接
    const socket = new Socket();
    // 是否已得出结论
    let settled = false;
    // 结论收口
    const done = (v: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(v);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

/**
 * 带超时的 fetch；超时抛 Error("timeout")。
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  // 组合外部 signal 与超时 signal
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal !== undefined && init.signal !== null
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  return fetch(url, { ...init, signal });
}

/**
 * 等待指定毫秒（可被 AbortSignal 提前打断）。
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    if (signal?.aborted === true) {
      rejectPromise(signal.reason ?? new Error("aborted"));
      return;
    }
    // 定时器句柄
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolvePromise();
    }, ms);
    // 中断处理（清理定时器并拒绝）
    const onAbort = (): void => {
      clearTimeout(timer);
      rejectPromise(signal?.reason ?? new Error("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
