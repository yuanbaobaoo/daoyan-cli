/** 引擎生命周期（local 模式）：spawn 拉起 + PID 文件 + 就绪探测。
 *  remote 模式不适用（进程由远端管理），ensureEngine 只做连通探测。
 *  spawn 采用数组传参（不经 shell），根治引号/环境继承问题。 */
import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { clientFromEngine, type ComfyClient } from "./client.mts";
import type { ProjectConfig } from "../project/types.mts";
import { DaoyanCliError } from "../../shared/errors.mts";

const READY_TIMEOUT_MS = 180_000;
const READY_INTERVAL_MS = 3_000;

export interface EngineProbe {
  up: boolean;
  /** PID 文件记录且存活的引擎进程（仅 local） */
  pid: number | null;
  baseUrl: string;
}

export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function enginePid(root: string): number | null {
  const file = join(root, "logs", "engine.pid");
  if (!existsSync(file)) return null;
  try {
    const n = Number.parseInt(readFileSync(file, "utf8").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** 探测引擎是否可达（5s 超时），附 PID 文件里的存活 pid。 */
export async function probeEngine(root: string, cfg: ProjectConfig): Promise<EngineProbe> {
  const client = clientFromEngine(cfg.engine);
  const pidRaw = cfg.engine.mode === "local" ? enginePid(root) : null;
  const pid = pidRaw !== null && pidAlive(pidRaw) ? pidRaw : null;
  const baseUrl = clientBaseUrl(client);
  try {
    await withTimeout(client.systemStats(), 5_000);
    return { up: true, pid, baseUrl };
  } catch {
    return { up: false, pid, baseUrl };
  }
}

/** ComfyClient 的 base（供展示用）。 */
export function clientBaseUrl(client: ComfyClient): string {
  return client.base;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 确保引擎可用并返回客户端：
 *  - 已可达 → 直接返回；
 *  - local 且不可达 → spawn venv/bin/python -u main.py --port <port> [+ launch_extra]
 *    （日志追加 logs/engine.log，PID 落 logs/engine.pid），就绪探测最长 180s；
 *  - remote 且不可达 → engine_not_ready（无法代管远端进程）。 */
export async function ensureEngine(
  root: string,
  cfg: ProjectConfig,
  log: (m: string) => void,
): Promise<ComfyClient> {
  const client = clientFromEngine(cfg.engine);
  if (await reachable(client)) return client;

  if (cfg.engine.mode !== "local") {
    throw new DaoyanCliError({
      code: "engine_not_ready",
      message: `远端引擎不可达（${clientBaseUrl(client)}）：请确认远端 ComfyUI 已启动，或检查 engine.url/host 配置`,
    });
  }
  const eng = cfg.engine;
  const python = join(eng.venv_dir, "bin", "python");
  if (!existsSync(python)) {
    throw new DaoyanCliError({
      code: "engine_start_failed",
      message: `venv 不存在：${python}。先运行 daoyan-cli init（或检查 project.json 的 engine.venv_dir）`,
    });
  }
  if (!existsSync(join(eng.comfyui_dir, "main.py"))) {
    throw new DaoyanCliError({
      code: "engine_start_failed",
      message: `ComfyUI 目录无效：${eng.comfyui_dir}（缺少 main.py）`,
    });
  }

  log(`引擎未运行，正在拉起（${eng.comfyui_dir}）...`);
  const logDir = join(root, "logs");
  mkdirSync(logDir, { recursive: true });
  const engineLog = join(logDir, "engine.log");
  const fd = openSync(engineLog, "a");
  const args = ["-u", "main.py", "--port", String(eng.port), ...(eng.launch_extra ?? [])];
  let spawnError: string | null = null;
  const child = spawn(python, args, {
    cwd: eng.comfyui_dir,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: process.env,
  });
  child.on("error", (e) => {
    spawnError = e.message;
  });
  child.unref();
  if (child.pid !== undefined) writeFileSync(join(logDir, "engine.pid"), `${child.pid}\n`);
  const startedAt = Date.now();
  log(`引擎进程 pid=${child.pid ?? "?"}，日志 logs/engine.log，等待就绪...`);

  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (spawnError !== null) {
      throw new DaoyanCliError({
        code: "engine_start_failed",
        message: `引擎进程启动失败：${spawnError}（python=${python}）`,
      });
    }
    if (await reachable(client)) return client;
    // 进程死亡检测：启动 20s 后 pid 消失 → 失败并给出日志尾
    if (child.pid !== undefined && !pidAlive(child.pid) && Date.now() - startedAt > 20_000) {
      throw new DaoyanCliError({
        code: "engine_start_failed",
        message: "引擎进程提前退出，日志尾（logs/engine.log）：\n" + tailFile(engineLog, 5),
      });
    }
    await sleep(READY_INTERVAL_MS);
  }
  throw new DaoyanCliError({
    code: "engine_start_failed",
    message: `引擎 ${READY_TIMEOUT_MS / 1000}s 内未就绪，查看 logs/engine.log`,
  });
}

async function reachable(client: ComfyClient): Promise<boolean> {
  try {
    await withTimeout(client.systemStats(), 5_000);
    return true;
  } catch {
    return false;
  }
}

/** 读取文件尾部 N 行（字节窗口近似，容忍多字节截断）。 */
export function tailFile(file: string, lines: number): string {
  if (!existsSync(file)) return "(文件不存在)";
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return "(不可读)";
  }
  const window = Math.min(size, Math.max(lines * 400 + 65_536, 0));
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
    /* ignore */
  }
  return buf
    .toString("utf8")
    .split(/[\r\n]+/)
    .filter((l) => l !== "")
    .slice(-lines)
    .join("\n");
}
