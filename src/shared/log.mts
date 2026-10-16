/** 日志 —— M0 简化版：stdout 即时输出 + 可挂载的文件 sink。
 *  三路日志（stdout + 任务流 daoyan-cli.log + 单镜 gen_*.log）在 M1 的 obs 模块挂载。 */
type Sink = (line: string) => void;

const sinks: Sink[] = [];
const ts = (): string => new Date().toTimeString().slice(0, 8);

export function attachSink(fn: Sink): void {
  sinks.push(fn);
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

export function die(msg: string, code = 1): never {
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(code);
}
