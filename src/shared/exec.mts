/**
 * 子进程执行小工具 —— 统一错误映射与输出收集（体内零依赖）。
 */
import { spawn } from "node:child_process";
import { DaoyanCliError } from "./errors.mts";

/**
 * 子进程执行选项。
 */
export interface ExecOptions {
  /**
   * 工作目录。
   */
  cwd?: string;
  /**
   * 超时（毫秒）。
   */
  timeoutMs?: number;
  /**
   * 额外环境变量（与当前环境合并）；用于代理等不进入 argv 的配置。
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * 子进程执行结果快照。
 */
export interface ExecResult {
  /**
   * 退出码（被信号杀死时 close 事件给 null，归一到 -1）。
   */
  code: number;
  /**
   * 收集到的 stdout。
   */
  stdout: string;
  /**
   * 收集到的 stderr。
   */
  stderr: string;
}

/**
 * 运行并收集 stdout/stderr；ENOENT 映射为 external_tool_missing。
 */
export function execCapture(
  cmd: string,
  args: readonly string[],
  opts: ExecOptions = {},
): Promise<ExecResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    // 子进程句柄（stdout/stderr 走管道手动收集）
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env !== undefined ? { ...process.env, ...opts.env } : undefined,
      stdio: ["ignore", "pipe", "pipe"],
    });
    // stdout 累计
    let out = "";
    // stderr 累计
    let err = "";
    // 超时定时器（到点 SIGKILL；未配置时为 undefined）
    const timer =
      opts.timeoutMs !== undefined ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs) : undefined;
    child.stdout.on("data", (d: Buffer) => {
      out += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      if (timer !== undefined) clearTimeout(timer);
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `无法启动 ${cmd}：${e.message}` }),
      );
    });
    child.on("close", (code) => {
      if (timer !== undefined) clearTimeout(timer);
      resolvePromise({ code: code ?? -1, stdout: out, stderr: err });
    });
  });
}

/**
 * 运行并直连终端（npm install 等长输出场景）。
 */
export function execInherit(
  cmd: string,
  args: readonly string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    // 子进程句柄（stdio 直接继承当前终端）
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env !== undefined ? { ...process.env, ...opts.env } : undefined,
      stdio: "inherit",
    });
    child.on("error", (e) =>
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `无法启动 ${cmd}：${e.message}` }),
      ),
    );
    child.on("close", (code) => resolvePromise(code ?? -1));
  });
}

/**
 * 仅在命令存在时执行；不存在返回 null（探测类场景）。
 */
export async function tryExecCapture(
  cmd: string,
  args: readonly string[],
  opts: ExecOptions = {},
): Promise<ExecResult | null> {
  try {
    return await execCapture(cmd, args, opts);
  } catch {
    return null;
  }
}
