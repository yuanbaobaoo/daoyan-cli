/** logs —— 日志查看（docker logs 语义）：-n 尾部行数、-f 跟随、--src 数据源过滤。
 *  清洗 ANSI 转义与 tqdm 刷屏（连续同进度只留最后一条）。 */
import { existsSync, openSync, readSync, statSync, closeSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import type { CliContext } from "../shared/context.mts";
import { projectFromContext } from "../core/project/config.mts";

type Src = "daoyan-cli" | "engine" | "all";

const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
const TQDM_RE = /^\s*\d+%.{0,40}\|\s*(\d+)\/(\d+) \[/;

interface ParsedArgs {
  follow: boolean;
  n: number;
  src: Src;
}

function parseArgs(args: string[]): ParsedArgs {
  const out: ParsedArgs = { follow: false, n: 100, src: "all" };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === undefined) break;
    if (a === "-f" || a === "--follow") out.follow = true;
    else if (a === "-n") {
      const v = args[i + 1];
      if (v === undefined || !/^\d+$/.test(v)) {
        throw new DaoyanCliError({ code: "usage", message: "-n 需要行数", exit: 2 });
      }
      out.n = Number(v);
      i++;
    } else if (a === "--src") {
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

function sources(root: string, src: Src): Array<{ name: string; file: string }> {
  const all = [
    { name: "daoyan-cli", file: join(root, "logs", "daoyan-cli.log") },
    { name: "engine", file: join(root, "logs", "engine.log") },
  ];
  return src === "all" ? all : all.filter((s) => s.name === src);
}

function cleanLines(raw: string): string[] {
  const lines = raw
    .replace(ANSI_RE, "")
    .split(/[\r\n]+/)
    .filter((l) => l !== "");
  // tqdm 压缩：连续相同的 (cur,total) 刷新行只留最后一条
  const out: string[] = [];
  let lastKey: string | null = null;
  for (const l of lines) {
    const m = TQDM_RE.exec(l);
    if (m !== null) {
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

function readTail(file: string, n: number): string[] {
  if (!existsSync(file)) return [];
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return [];
  }
  const window = Math.min(size, n * 400 + 65_536);
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
    /* ignore */
  }
  return cleanLines(buf.toString("utf8").replace(/\ufffd/g, "")).slice(-n);
}

export async function runLogs(ctx: CliContext, args: string[]): Promise<void> {
  const { follow, n, src } = parseArgs(args);
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json；用 --project 指定或在项目目录内运行" });
  }
  const files = sources(found.root, src);
  const existing = files.filter((s) => existsSync(s.file));
  if (existing.length === 0) {
    const names = files.map((s) => s.file).join("、");
    if (ctx.json) {
      emitData({ sources: {}, note: "暂无日志文件" });
      return;
    }
    process.stdout.write(`暂无日志文件（${names}）。运行过 shot/status 后才会产生。\n`);
    return;
  }

  if (!follow) {
    const data: Record<string, string[]> = {};
    for (const s of existing) {
      const lines = readTail(s.file, n);
      data[s.name] = lines;
      if (!ctx.json) {
        for (const l of lines) process.stdout.write(`${l}\n`);
      }
    }
    if (ctx.json) emitData({ sources: data });
    return;
  }

  // 跟随模式：dump 最近 n 行后按 offset 增量轮询（0.5s）；文件截断时重置
  const offsets = new Map<string, number>();
  for (const s of existing) {
    const tail = readTail(s.file, n);
    for (const l of tail) process.stdout.write(`${l}\n`);
    offsets.set(s.file, statSync(s.file).size);
  }
  for (;;) {
    await new Promise((r) => setTimeout(r, 500));
    for (const s of existing) {
      if (!existsSync(s.file)) continue;
      let size = 0;
      try {
        size = statSync(s.file).size;
      } catch {
        continue;
      }
      const prev = offsets.get(s.file) ?? 0;
      if (size === prev) continue;
      if (size < prev) {
        offsets.set(s.file, 0); // 截断/重建，重跟
        continue;
      }
      const chunk = Buffer.alloc(size - prev);
      try {
        const fd = openSync(s.file, "r");
        readSync(fd, chunk, 0, size - prev, prev);
        closeSync(fd);
      } catch {
        continue;
      }
      for (const l of cleanLines(chunk.toString("utf8").replace(/\ufffd/g, ""))) {
        process.stdout.write(`${l}\n`);
      }
      offsets.set(s.file, size);
    }
  }
}
