/** 内置进程服务接管 —— 只处理当前用户、非关键、且匹配内置规则的进程。
 *  记录 cmdline/cwd 用于 best-effort 重启；不记录环境变量（可能含密钥）。
 *  永不处理 PID 1、dycli 自身及祖先、显示管理器、sshd/systemd、内核线程、其他用户进程。 */
import { readFileSync, readlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import { tryExecCapture } from "../../../shared/exec.mts";
import { nowIso } from "../../../shared/fs.mts";
import { sleep } from "../../../shared/net.mts";
import { GPU_PROCESS_TARGETS, PROTECTED_COMMS } from "../targets.mts";
import { gpuProcessPids } from "../detect.mts";
import { readContainerInfo } from "../containers.mts";

/**
 * 单个进程快照。
 */
export interface ProcessInfo {
  /**
   * 进程号。
   */
  pid: number;
  /**
   * 用户 uid。
   */
  uid: number;
  /**
   * 可执行名。
   */
  comm: string;
  /**
   * 命令行（单行）。
   */
  args: string;
}

/**
 * 被接管进程的重启记录。
 */
export interface ProcessTargetRecord {
  /**
   * 内置目标 id（vllm / tgi / llama.cpp / sglang）。
   */
  target: string;
  /**
   * 原 PID。
   */
  pid: number;
  /**
   * argv（已拆分）。
   */
  cmdline: string[];
  /**
   * 工作目录（可空）。
   */
  cwd: string | null;
  /**
   * 接管时间。
   */
  started_at: string;
}

/**
 * 列出进程（ps 快照）。
 */
export async function listProcesses(): Promise<ProcessInfo[]> {
  // ps 输出（uid + comm + args）
  const r = await tryExecCapture("ps", ["-eo", "pid=,uid=,comm=,args="], { timeoutMs: 10_000 });
  if (r === null || r.code !== 0) return [];
  // 解析结果
  const out: ProcessInfo[] = [];
  for (const line of r.stdout.split("\n")) {
    // 前四列：pid uid comm rest(args)
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/.exec(line);
    if (m === null) continue;
    // 字段值
    const pid = Number(m[1]);
    const uid = Number(m[2]);
    const comm = m[3] ?? "";
    const args = m[4] ?? "";
    if (!Number.isFinite(pid) || pid <= 0) continue;
    out.push({ pid, uid, comm, args });
  }
  return out;
}

/**
 * 当前进程的全部祖先 PID（含父进程链）。
 */
export async function ancestorPids(): Promise<Set<number>> {
  // 祖先集合
  const out = new Set<number>();
  // 当前游标
  let pid = process.ppid;
  // 防御性上限
  for (let i = 0; i < 64 && pid > 1; i++) {
    out.add(pid);
    // 父 PID
    const r = await tryExecCapture("ps", ["-o", "ppid=", "-p", String(pid)], { timeoutMs: 3_000 });
    if (r === null || r.code !== 0) break;
    // 解析出的父进程
    const ppid = Number(r.stdout.trim());
    if (!Number.isFinite(ppid) || ppid <= 1) break;
    pid = ppid;
  }
  return out;
}

/**
 * 读取进程 argv（Linux 用 /proc 精确解析，其他平台按空白拆分）。
 */
function cmdlineOf(info: ProcessInfo): string[] {
  if (process.platform === "linux") {
    try {
      // NUL 分隔的 argv
      const parts = readFileSync(`/proc/${info.pid}/cmdline`, "utf8")
        .split("\0")
        .filter((x) => x !== "");
      if (parts.length > 0) return parts;
    } catch {
      // 回退到 ps
    }
  }
  return info.args.split(/\s+/).filter((x) => x !== "");
}

/**
 * 读取进程工作目录（仅 Linux）。
 */
function cwdOf(pid: number): string | null {
  try {
    return readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return null;
  }
}

/**
 * 进程根目录是否指向容器/其他 mount namespace（不是 "/"）。
 * cgroup 解析失败时的兜底：读不到也按容器处理，避免裸杀。
 */
function hasForeignRoot(pid: number): boolean {
  try {
    return readlinkSync(`/proc/${pid}/root`) !== "/";
  } catch {
    return true;
  }
}

/**
 * 找出可接管的宿主进程（内置规则 + 当前用户 + 非保护进程）。
 * 容器内进程一律排除：它们由容器运行时接管层处理，裸杀会破坏容器且无法正确恢复。
 */
export async function findTargetProcesses(opts: {
  /**
   * 已获取的 GPU 计算进程集合；省略时内部重新查询。
   */
  gpuPids?: ReadonlySet<number>;
} = {}): Promise<ProcessTargetRecord[]> {
  // 当前用户（无法获取 uid 时不接管）
  const uid = typeof process.getuid === "function" ? process.getuid() : -1;
  if (uid < 0) return [];
  // 仅接管 nvidia-smi 报告的实际 GPU 计算进程；拿不到列表则不接管
  const gpuPids = opts.gpuPids ?? (await gpuProcessPids());
  if (gpuPids === null || gpuPids.size === 0) return [];
  // 保护进程集合
  const ancestors = await ancestorPids();
  // 全部进程
  const procs = await listProcesses();
  // 命中的目标
  const hits: ProcessTargetRecord[] = [];
  for (const p of procs) {
    if (p.uid !== uid) continue;
    if (!gpuPids.has(p.pid)) continue;
    if (p.pid === 1 || p.pid === process.pid || ancestors.has(p.pid)) continue;
    if (PROTECTED_COMMS.has(p.comm)) continue;
    // 容器内进程交给容器层（只卸载模型）；即使运行时不可用也不裸杀
    if (readContainerInfo(p.pid) !== null) continue;
    // cgroup 未识别但根目录不是 "/"：同样视为容器/隔离进程
    if (hasForeignRoot(p.pid)) continue;
    // 命中规则（comm 与 args 都看）
    const rule = GPU_PROCESS_TARGETS.find((r) => r.pattern.test(p.comm) || r.pattern.test(p.args));
    if (rule === undefined) continue;
    // argv（空则不接管）
    const cmdline = cmdlineOf(p);
    if (cmdline.length === 0) continue;
    hits.push({ target: rule.id, pid: p.pid, cmdline, cwd: cwdOf(p.pid), started_at: nowIso() });
  }
  return hits;
}

/**
 * 等待进程退出。
 */
async function waitExit(pid: number, timeoutMs: number): Promise<boolean> {
  // 截止时间
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await sleep(200);
  }
  return false;
}

/**
 * 驱逐一族内置进程（SIGTERM → SIGKILL）。
 */
export async function evictProcesses(targets: ProcessTargetRecord[]): Promise<{
  evicted: ProcessTargetRecord[];
  errors: string[];
}> {
  // 成功驱逐
  const evicted: ProcessTargetRecord[] = [];
  // 失败信息
  const errors: string[] = [];
  for (const t of targets) {
    try {
      process.kill(t.pid, "SIGTERM");
      if (!(await waitExit(t.pid, 5_000))) {
        process.kill(t.pid, "SIGKILL");
        if (!(await waitExit(t.pid, 2_000))) {
          errors.push(`${t.target}(pid ${t.pid}) 未能退出`);
          continue;
        }
      }
      evicted.push(t);
    } catch (e) {
      errors.push(`${t.target}(pid ${t.pid}) 驱逐失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { evicted, errors };
}

/**
 * best-effort 重启被接管的进程（等待 spawn 成功/失败）。
 */
export async function restartProcesses(
  records: ProcessTargetRecord[],
): Promise<{ restored: string[]; errors: string[] }> {
  // 成功重启
  const restored: string[] = [];
  // 失败信息
  const errors: string[] = [];
  for (const r of records) {
    // argv 首项
    const bin = r.cmdline[0];
    if (bin === undefined) {
      errors.push(`${r.target}: 缺少 argv`);
      continue;
    }
    try {
      // 分离进程，任务结束后继续运行
      const child = spawn(bin, r.cmdline.slice(1), {
        cwd: r.cwd ?? undefined,
        detached: true,
        stdio: "ignore",
        env: process.env,
      });
      // 等待真正 spawn 成功
      await new Promise<void>((resolvePromise, rejectPromise) => {
        child.once("spawn", () => resolvePromise());
        child.once("error", (e) => rejectPromise(e));
      });
      child.unref();
      restored.push(`${r.target}:pid${r.pid}`);
    } catch (e) {
      errors.push(`${r.target}: 重启失败（${e instanceof Error ? e.message : String(e)}）`);
    }
  }
  return { restored, errors };
}
