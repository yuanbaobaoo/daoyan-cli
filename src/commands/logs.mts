/** logs —— 日志查看（docker logs 语义）：-n 尾部行数、-f 跟随、--src 数据源过滤。
 *  清洗 ANSI 转义与 tqdm 刷屏（连续同进度只留最后一条）。 */
import { existsSync, openSync, readSync, statSync, closeSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import type { CliContext } from "../shared/context.mts";
import { projectFromContext } from "../core/project/config.mts";
import { ENGINE_LOG_FILE, LOG_DIR, TOOL_LOG_FILE } from "../core/project/types.mts";

/**
 * 日志数据源标识（--src 的取值）。
 */
type Src = "daoyan-cli" | "engine" | "all";

// ANSI 转义序列（日志清洗用）
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
// tqdm 进度行形如 " 45%|██ | 12/26 [<00:03]"（清洗时压缩连续刷新）
const TQDM_RE = /^\s*\d+%.{0,40}\|\s*(\d+)\/(\d+) \[/;

/**
 * logs 命令解析出的参数。
 */
interface ParsedArgs {
  /**
   * -f：是否跟随追加。
   */
  follow: boolean;
  /**
   * -n：显示尾部行数。
   */
  n: number;
  /**
   * --src：数据源过滤。
   */
  src: Src;
}

/**
 * 解析 logs 的参数（-f / -n / --src，其余报用法错误）。
 */
function parseArgs(args: string[]): ParsedArgs {
  // 解析结果（含缺省值）
  const out: ParsedArgs = { follow: false, n: 100, src: "all" };
  // 顺序扫描全部参数
  for (let i = 0; i < args.length; i++) {
    // 当前参数
    const a = args[i];
    if (a === undefined) break;
    if (a === "-f" || a === "--follow") out.follow = true;
    else if (a === "-n") {
      // -n 的取值
      const v = args[i + 1];
      if (v === undefined || !/^\d+$/.test(v)) {
        throw new DaoyanCliError({ code: "usage", message: "-n 需要行数", exit: 2 });
      }
      out.n = Number(v);
      i++;
    } else if (a === "--src") {
      // --src 的取值
      const v = args[i + 1];
      if (v !== "daoyan-cli" && v !== "engine" && v !== "all") {
        throw new DaoyanCliError({ code: "usage", message: `--src 仅接受 daoyan-cli|engine|all（收到 ${v ?? "空"}）`, exit: 2 });
      }
      out.src = v;
      i++;
    } else throw new DaoyanCliError({ code: "usage", message: `未知参数 ${a}`, exit: 2 });
  }
  return out;
}

/**
 * 按 --src 过滤出待读的日志文件（name 供 --json 分组用）。
 */
function sources(root: string, src: Src): Array<{ name: string; file: string }> {
  // 全部可用数据源（项目日志 + 引擎日志）
  const all = [
    { name: "daoyan-cli", file: join(root, LOG_DIR, TOOL_LOG_FILE) },
    { name: "engine", file: join(root, LOG_DIR, ENGINE_LOG_FILE) },
  ];
  return src === "all" ? all : all.filter((s) => s.name === src);
}

/**
 * 清洗日志行：去 ANSI 转义、压掉连续重复的 tqdm 进度行。
 */
function cleanLines(raw: string): string[] {
  // 清洗后的行列表
  const lines = raw
    .replace(ANSI_RE, "")
    .split(/[\r\n]+/)
    .filter((l) => l !== "");
  // 输出行（挤压 tqdm 用）
  const out: string[] = [];
  // 上一条 tqdm 的 "cur/total" 键
  let lastKey: string | null = null;
  // 逐行挤压连续 tqdm 刷新
  for (const l of lines) {
    // 当前行是否命中 tqdm 形态
    const m = TQDM_RE.exec(l);
    if (m !== null) {
      // 当前进度键
      const key = `${m[1]}/${m[2]}`;
      if (key === lastKey && out.length > 0) {
        out[out.length - 1] = l;
        continue;
      }
      lastKey = key;
      out.push(l);
      continue;
    }
    lastKey = null;
    out.push(l);
  }
  return out;
}

/**
 * 读取文件尾部 n 行（字节窗口近似；文件缺失 / 不可读返回空）。
 */
function readTail(file: string, n: number): string[] {
  if (!existsSync(file)) return [];
  // 文件大小（读取窗口上界）
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return [];
  }
  // 读取窗口（按 400 字节/行估算 + 64KiB 余量）
  const window = Math.min(size, n * 400 + 65_536);
  // 尾部字节缓冲
  const buf = Buffer.alloc(window);
  try {
    // 只读最后 window 字节
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
    // 忽略：读取失败按空输出处理
  }
  return cleanLines(buf.toString("utf8").replace(/\ufffd/g, "")).slice(-n);
}

/**
 * logs 命令入口：一次性 dump 或 -f 跟随轮询。
 */
export async function runLogs(ctx: CliContext, args: string[]): Promise<void> {
  // 解析出的开关与数据源
  const { follow, n, src } = parseArgs(args);
  // 项目定位结果
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json；用 --project 指定或在项目目录内运行" });
  }
  // 过滤后的数据源
  const files = sources(found.root, src);
  // 实际存在的日志文件
  const existing = files.filter((s) => existsSync(s.file));
  if (existing.length === 0) {
    // 缺失文件清单（提示用）
    const names = files.map((s) => s.file).join("、");
    if (ctx.json) {
      emitData({ sources: {}, note: "暂无日志文件" });
      return;
    }
    process.stdout.write(`暂无日志文件（${names}）。运行过 shot/status 后才会产生。\n`);
    return;
  }

  if (!follow) {
    // --json 的分组数据（name -> 行数组）
    const data: Record<string, string[]> = {};
    // 逐源输出尾部行
    for (const s of existing) {
      // 当前源的尾部行
      const lines = readTail(s.file, n);
      data[s.name] = lines;
      if (!ctx.json) {
        // 逐行输出（人读模式）
        for (const l of lines) process.stdout.write(`${l}\n`);
      }
    }
    if (ctx.json) emitData({ sources: data });
    return;
  }

  // 跟随模式：dump 最近 n 行后按 offset 增量轮询（0.5s）；文件截断时重置
  const offsets = new Map<string, number>();
  // 逐源先输出最近的 n 行并记录偏移
  for (const s of existing) {
    // 先输出的尾部行
    const tail = readTail(s.file, n);
    // 逐行输出尾部内容
    for (const l of tail) process.stdout.write(`${l}\n`);
    offsets.set(s.file, statSync(s.file).size);
  }
  for (;;) {
    await new Promise((r) => setTimeout(r, 500));
    // 逐源轮询增量
    for (const s of existing) {
      if (!existsSync(s.file)) continue;
      // 当前文件大小
      let size = 0;
      try {
        size = statSync(s.file).size;
      } catch {
        continue;
      }
      // 上次读取到的偏移
      const prev = offsets.get(s.file) ?? 0;
      if (size === prev) continue;
      if (size < prev) {
        offsets.set(s.file, 0); // 截断/重建，重跟
        continue;
      }
      // 新增区间的字节缓冲
      const chunk = Buffer.alloc(size - prev);
      try {
        // 从上次偏移继续读
        const fd = openSync(s.file, "r");
        readSync(fd, chunk, 0, size - prev, prev);
        closeSync(fd);
      } catch {
        continue;
      }
      // 逐行输出清洗后的新增内容
      for (const l of cleanLines(chunk.toString("utf8").replace(/\ufffd/g, ""))) {
        process.stdout.write(`${l}\n`);
      }
      offsets.set(s.file, size);
    }
  }
}
