/** 日志 —— stdout 即时输出 + 可挂载的文件 sink。
 *  任务流落盘：attachFileSink(logs/daoyan-cli.log)；单镜 gen_*.log 由 pipeline 挂载。 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

type Sink = (line: string) => void;

const sinks: Sink[] = [];
const ts = (): string => new Date().toTimeString().slice(0, 8);

export function attachSink(fn: Sink): void {
  sinks.push(fn);
}

/** 追加写文件 sink（自动建目录）。 */
export function attachFileSink(file: string): void {
  mkdirSync(dirname(file), { recursive: true });
  sinks.push((line) => {
    appendFileSync(file, line + "\n");
  });
}

export function detachSinks(): void {
  sinks.length = 0;
}

export function say(msg: string): void {
  const line = `[${ts()}] ${msg}`;
  process.stdout.write(line + "\n");
  // 日志尽力而为：sink 失败不影响主流程
  for (const s of sinks) {
    try {
      s(line);
    } catch {
      /* ignore */
    }
  }
}

export function warn(msg: string): void {
  process.stderr.write(`[${ts()}] WARN ${msg}\n`);
}
