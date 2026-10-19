/** 日志 —— stdout 即时输出 + 可挂载的文件 sink。
 *  JSON 模式下 say 自动改走 stderr，保证 stdout 只有信封；人类模式仍走 stdout。
 *  任务流落盘：attachFileSink(logs/daoyan-cli.log)；worker 日志由 spawn 的 fd 承接。 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 落盘回调：say 每输出一行（含时间戳），就把它交给 sink。
 */
type Sink = (line: string) => void;

// 已挂载的落盘 sink（即时输出之外的附加通道）
const sinks: Sink[] = [];
// JSON 模式：say 走 stderr，避免污染 stdout 信封
let jsonMode = false;

/**
 * 设置输出模式（cli.mts 解析全局参数后调用）。
 */
export function setLogJsonMode(enabled: boolean): void {
    jsonMode = enabled;
}

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
 * 输出一行日志：JSON 模式写 stderr，人类模式写 stdout；都尽力写入 sink。
 */
export function say(msg: string): void {
    // 已带时间戳的完整行
    const line = `[${ts()}] ${msg}`;
    if (jsonMode) process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
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
