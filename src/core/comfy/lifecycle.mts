/** 引擎生命周期（local 模式）：spawn 拉起 + PID 文件 + 就绪探测。
 *  remote 模式不适用（进程由远端管理），ensureEngine 只做连通探测。
 *  spawn 采用数组传参（不经 shell），根治引号/环境继承问题。 */
import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { clientFromEngine, type ComfyClient } from "./client.mts";
import { ENGINE_LOG_FILE, ENGINE_PID_FILE, LOG_DIR, type ProjectConfig } from "../project/types.mts";
import { DaoyanCliError } from "../../shared/errors.mts";

// 引擎就绪等待上限（180s）
const READY_TIMEOUT_MS = 180_000;
// 就绪探测间隔（3s）
const READY_INTERVAL_MS = 3_000;
// REST 连通探测超时（system_stats）
const PROBE_TIMEOUT_MS = 5_000;

/**
 * 引擎探测快照（probeEngine 的返回）。
 */
export interface EngineProbe {
  /**
   * REST 是否可达。
   */
  up: boolean;
  /**
   * PID 文件记录且存活的引擎进程（仅 local）
   */
  pid: number | null;
  /**
   * 引擎 base URL（展示用）。
   */
  baseUrl: string;
}

/**
 * pid 探活：进程存在返回 true（EPERM 视为存在）。
 */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * 读取 PID 文件里的引擎进程号（无文件 / 非法内容返回 null）。
 */
export function enginePid(root: string): number | null {
  // logs/engine.pid 的绝对路径
  const file = join(root, LOG_DIR, ENGINE_PID_FILE);
  if (!existsSync(file)) return null;
  try {
    // 文件内容解析出的 pid
    const n = Number.parseInt(readFileSync(file, "utf8").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * 探测引擎是否可达（5s 超时），附 PID 文件里的存活 pid。
 */
export async function probeEngine(root: string, cfg: ProjectConfig): Promise<EngineProbe> {
  // 按配置构造的客户端（local / remote 同构）
  const client = clientFromEngine(cfg.engine);
  // PID 文件里的原始 pid（仅 local 模式读）
  const pidRaw = cfg.engine.mode === "local" ? enginePid(root) : null;
  // 经存活校验后的 pid（不存活归 null）
  const pid = pidRaw !== null && pidAlive(pidRaw) ? pidRaw : null;
  // 展示用 base URL
  const baseUrl = clientBaseUrl(client);
  try {
    await withTimeout(client.systemStats(), PROBE_TIMEOUT_MS);
    return { up: true, pid, baseUrl };
  } catch {
    return { up: false, pid, baseUrl };
  }
}

/**
 * ComfyClient 的 base（供展示用）。
 */
export function clientBaseUrl(client: ComfyClient): string {
  return client.base;
}

/**
 * 给 Promise 加超时：超时以 Error("timeout") 拒绝。
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

/**
 * 等待指定毫秒。
 */
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
  // 按配置构造的客户端
  const client = clientFromEngine(cfg.engine);
  if (await reachable(client)) return client;

  if (cfg.engine.mode !== "local") {
    throw new DaoyanCliError({
      code: "engine_not_ready",
      message: `远端引擎不可达（${clientBaseUrl(client)}）：请确认远端 ComfyUI 已启动，或检查 engine.url/host 配置`,
    });
  }
  // local 模式引擎配置
  const eng = cfg.engine;
  // venv 内的 python 解释器路径
  const python = join(eng.venv_dir, "bin", "python");
  if (!existsSync(python)) {
    throw new DaoyanCliError({
      code: "engine_start_failed",
      message: `venv 不存在：${python}。先运行 daoyan init（或检查 project.json 的 engine.venv_dir）`,
    });
  }
  if (!existsSync(join(eng.comfyui_dir, "main.py"))) {
    throw new DaoyanCliError({
      code: "engine_start_failed",
      message: `ComfyUI 目录无效：${eng.comfyui_dir}（缺少 main.py）`,
    });
  }
  log(`引擎未运行，正在拉起（${eng.comfyui_dir}）...`);
  // 日志目录（不存在则建）
  const logDir = join(root, LOG_DIR);
  mkdirSync(logDir, { recursive: true });
  // 引擎日志文件（子进程 stdout/stderr 追加到这里）
  const engineLog = join(logDir, ENGINE_LOG_FILE);
  // 引擎日志的文件描述符（直接交给子进程 stdio）
  const fd = openSync(engineLog, "a");
  // 引擎启动参数（-u 关缓冲；launch_extra 透传）
  const args = ["-u", "main.py", "--port", String(eng.port), ...(eng.launch_extra ?? [])];
  // 子进程启动失败信息（error 事件异步回填）
  let spawnError: string | null = null;
  // 引擎子进程句柄（detached，父进程退出后仍存活）
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
  if (child.pid !== undefined) writeFileSync(join(logDir, ENGINE_PID_FILE), `${child.pid}\n`);
  // 拉起起始时间（进程死亡检测的计时基准）
  const startedAt = Date.now();
  log(`引擎进程 pid=${child.pid ?? "?"}，日志 logs/engine.log，等待就绪...`);

  // 就绪探测截止时间
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

/**
 * 单次 REST 连通性探测（5s 超时，不抛出）。
 */
async function reachable(client: ComfyClient): Promise<boolean> {
  try {
    await withTimeout(client.systemStats(), PROBE_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取文件尾部 N 行（字节窗口近似，容忍多字节截断）。
 */
export function tailFile(file: string, lines: number): string {
  if (!existsSync(file)) return "(文件不存在)";
  // 文件大小（读取窗口的上界）
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return "(不可读)";
  }
  // 读取窗口（按 400 字节/行估算 + 64KiB 余量）
  const window = Math.min(size, Math.max(lines * 400 + 65_536, 0));
  // 尾部字节缓冲
  const buf = Buffer.alloc(window);
  try {
    // 只读最后 window 字节
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
    // 忽略：读取失败按空处理
  }
  return buf
    .toString("utf8")
    .split(/[\r\n]+/)
    .filter((l) => l !== "")
    .slice(-lines)
    .join("\n");
}
