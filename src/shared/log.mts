/** 日志 —— stdout 即时输出 + 可挂载的文件 sink。
 *  任务流落盘：attachFileSink(logs/daoyan-cli.log)；单镜 gen_*.log 由 pipeline 挂载。 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 落盘回调：say 每输出一行（含时间戳），就把它交给 sink。
 */
type Sink = (line: string) => void;

// 已挂载的落盘 sink（stdout 之外的附加输出通道）
const sinks: Sink[] = [];

/**
 * 当前时间 HH:MM:SS（日志行前缀）。
 */
function ts(): string {
  return new Date().toTimeString().slice(0, 8);
}

/**
 * 挂载自定义 sink（测试与扩展用）。
 */
export function attachSink(fn: Sink): void {
  sinks.push(fn);
}

/**
 * 追加写文件 sink（自动建目录）。
 */
export function attachFileSink(file: string): void {
  mkdirSync(dirname(file), { recursive: true });
  sinks.push((line) => {
    appendFileSync(file, line + "\n");
  });
}

/**
 * 清空全部 sink（测试隔离用）。
 */
export function detachSinks(): void {
  sinks.length = 0;
}

/**
 * 输出一行日志：stdout 即时可见，并尽力写入全部挂载的 sink。
 */
export function say(msg: string): void {
  // 已带时间戳的完整行
  const line = `[${ts()}] ${msg}`;
  process.stdout.write(line + "\n");
  // 日志尽力而为：sink 失败不影响主流程
  for (const s of sinks) {
    try {
      s(line);
    } catch {
      // 忽略单次落盘失败
    }
  }
}

/**
 * 输出警告行（stderr，WARN 前缀）。
 */
export function warn(msg: string): void {
  process.stderr.write(`[${ts()}] WARN ${msg}\n`);
}
