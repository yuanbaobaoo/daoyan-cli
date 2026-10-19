/** local 引擎会话 —— 任务开始 spawn、就绪探测、PID 管理、残留回收、停止与 scratch 清理。
 *  ComfyUI 是项目内托管进程，但访问一律走 HTTP（/upload/image、/view、/free）。 */
import {
    closeSync,
    existsSync,
    openSync,
    readFileSync,
    readSync,
    rmSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, nowIso, readJsonIfExists } from "../../shared/fs.mts";
import { portInUse, sleep } from "../../shared/net.mts";
import { tryExecCapture } from "../../shared/exec.mts";
import { ComfyClient, probeComfy } from "../comfy/client.mts";
import { comfyVersionOf } from "../workflow/catalog.mts";
import {
    ENGINE_PID_FILE,
    EXTRA_MODELS_FILE,
    LOG_DIR,
    type CleanupRecord,
    type RunGpuRecord,
} from "../project/types.mts";
import type {
    CreateSessionOptions,
    EngineSession,
    EngineSessionInfo,
    ReleaseInputs,
    ReleaseResult,
} from "./session.mts";
import { takeoverGpu, takeoverEnabled, restoreLeaseIfAny, type TakeoverIssue } from "../gpu/takeover.mts";

// 就绪等待上限（180s）
const READY_TIMEOUT_MS = 180_000;
// 就绪探测间隔（1s；ComfyUI 通常 10–60s）
const READY_INTERVAL_MS = 1_000;
// 引擎停止等待（SIGTERM 后 15s SIGKILL）
const STOP_TIMEOUT_MS = 15_000;

/**
 * engine.pid 文件内容（JSON；兼容旧版纯数字）。
 */
export interface EnginePidRecord {
    /**
     * 引擎进程 pid。
     */
    pid: number;
    /**
     * 引擎端口。
     */
    port: number;
    /**
     * ComfyUI 目录（校验归属）。
     */
    comfyui_dir: string;
    /**
     * 关联 task id。
     */
    task_id: string;
    /**
     * 启动时间（ISO）。
     */
    started_at: string;
}

/**
 * engine.pid 的绝对路径。
 */
export function enginePidFile(root: string): string {
    return join(root, LOG_DIR, ENGINE_PID_FILE);
}

/**
 * 读取 PID 文件；不存在/损坏返回 null。
 */
export function readEnginePid(root: string): EnginePidRecord | null {
    // PID 文件
    const file = enginePidFile(root);
    if (!existsSync(file)) return null;
    try {
        // 文件文本
        const text = readFileSync(file, "utf8").trim();
        if (/^\d+$/.test(text)) {
            return { pid: Number(text), port: 0, comfyui_dir: "", task_id: "", started_at: "" };
        }
        // JSON 记录
        const raw = readJsonIfExists<EnginePidRecord>(file);
        return raw !== null && typeof raw.pid === "number" ? raw : null;
    } catch {
        return null;
    }
}

/**
 * 写入 PID 文件。
 */
function writeEnginePid(root: string, rec: EnginePidRecord): void {
    ensureDir(join(root, LOG_DIR));
    writeFileSync(enginePidFile(root), JSON.stringify(rec, null, 2) + "\n", { mode: 0o600 });
}

/**
 * PID 探活。
 */
export function pidAlive(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return (e as NodeJS.ErrnoException).code === "EPERM";
    }
}

/**
 * 校验 PID 是否属于本项目的 ComfyUI（cmdline 含 main.py 且含 comfyui_dir）。
 */
async function verifyOwnEngine(rec: EnginePidRecord): Promise<boolean> {
    if (rec.pid <= 0) return false;
    // ps 命令行
    const r = await tryExecCapture("ps", ["-p", String(rec.pid), "-o", "args="], { timeoutMs: 3_000 });
    if (r === null || r.code !== 0) return false;
    // 命令行文本
    const cmd = r.stdout.trim();
    if (!cmd.includes("main.py")) return false;
    if (rec.comfyui_dir !== "" && !cmd.includes(rec.comfyui_dir)) {
        // ps 可能截断/规范化路径；只要包含 main.py 且端口匹配也接受
        if (rec.port <= 0 || !cmd.includes(String(rec.port))) return false;
    }
    return true;
}

/**
 * 停止一组进程（负 pid = 进程组）。
 */
async function stopPid(pid: number, log: (m: string) => void): Promise<boolean> {
    if (!pidAlive(pid)) return true;
    log(`停止引擎进程 pid=${pid}（SIGTERM）...`);
    try {
        process.kill(-pid, "SIGTERM");
    } catch {
        try {
            process.kill(pid, "SIGTERM");
        } catch {
            return true;
        }
    }
    // 等待退出
    const deadline = Date.now() + STOP_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (!pidAlive(pid)) return true;
        await sleep(300);
    }
    log(`引擎未在 ${STOP_TIMEOUT_MS / 1000}s 内退出，SIGKILL`);
    try {
        process.kill(-pid, "SIGKILL");
    } catch {
        try {
            process.kill(pid, "SIGKILL");
        } catch {
            // 已退出
        }
    }
    await sleep(500);
    return !pidAlive(pid);
}

/**
 * 回收残留 local 引擎（无活动 task 时调用）：/free → SIGTERM → SIGKILL → 删除 PID。
 */
export async function stopResidualEngine(root: string, log: (m: string) => void): Promise<void> {
    // PID 记录
    const rec = readEnginePid(root);
    if (rec === null) return;
    if (!pidAlive(rec.pid)) {
        unlinkSync(enginePidFile(root));
        return;
    }
    // 归属校验：不 kill 不属于本项目的进程
    if (!(await verifyOwnEngine(rec))) {
        log(`PID ${rec.pid} 不属于本项目 ComfyUI；删除过期 PID 文件，不 kill`);
        rmSync(enginePidFile(root), { force: true });
        return;
    }
    // 先 best-effort /free
    if (rec.port > 0) {
        try {
            await new ComfyClient(`http://127.0.0.1:${rec.port}`).free();
        } catch {
            // 引擎可能已卡死
        }
    }
    await stopPid(rec.pid, log);
    rmSync(enginePidFile(root), { force: true });
}

/**
 * 读取文件尾部 N 行（日志尾提示）。
 */
function tailFile(file: string, lines: number): string {
    if (!existsSync(file)) return "(文件不存在)";
    // 文件大小
    let size = 0;
    try {
        size = statSync(file).size;
    } catch {
        return "(不可读)";
    }
    // 读取窗口
    const window = Math.min(size, lines * 400 + 65_536);
    // 尾部字节缓冲
    const buf = Buffer.alloc(window);
    try {
        const fd = openSync(file, "r");
        readSync(fd, buf, 0, window, size - window);
        closeSync(fd);
    } catch {
        return "(不可读)";
    }
    return buf
        .toString("utf8")
        .split(/[\r\n]+/)
        .filter((l) => l !== "")
        .slice(-lines)
        .join("\n");
}

/**
 * local 引擎会话。
 */
export class LocalSession implements EngineSession {
    /**
     * 共用 HTTP 客户端。
     */
    readonly client: ComfyClient;
    // 创建参数
    private readonly opts: CreateSessionOptions;
    // 就绪信息
    private infoState: EngineSessionInfo;
    // 上一次接管记录
    private gpuRecord: RunGpuRecord | undefined;
    // 接管警告
    private gpuIssues: TakeoverIssue[] = [];

    /**
     * 构造会话（不启动引擎）。
     */
    constructor(opts: CreateSessionOptions) {
        this.opts = opts;
        if (opts.machine.engine.mode !== "local") {
            throw new DaoyanCliError({ code: "config_invalid", message: "LocalSession 需要 local machine 配置" });
        }
        // 端口
        const port = opts.machine.engine.port;
        this.client = new ComfyClient(`http://127.0.0.1:${port}`);
        this.infoState = {
            mode: "local",
            url: `http://127.0.0.1:${port}`,
            comfyui_version: null,
            pid: null,
            ready_ms: null,
        };
    }

    /**
     * 当前会话信息。
     */
    info(): EngineSessionInfo {
        return { ...this.infoState };
    }

    /**
     * 进程健康。
     */
    health(): "alive" | "dead" | "unknown" {
        const pid = this.infoState.pid;
        if (pid === null) return "unknown";
        return pidAlive(pid) ? "alive" : "dead";
    }

    /**
     * 确保 local 引擎就绪（回收残留 → 恢复租约 → GPU 接管 → spawn → 等 /system_stats）。
     */
    async ensureReady(log: (m: string) => void, signal?: AbortSignal): Promise<void> {
        if (this.opts.machine.engine.mode !== "local") return;
        // 取消判定（避免 TS 对属性做窄化）
        const isAborted = (): boolean => signal !== undefined && signal.aborted;
        // 已取消：不启动
        if (isAborted()) throw new Error("cancelled");
        // 引擎配置
        const eng = this.opts.machine.engine;
        // 1) 回收残留引擎（worker 已持有 machine lock，因此看到的就是残留）
        await stopResidualEngine(this.opts.root, log);

        // 2) 恢复上一轮 GPU 租约（metadata session 不碰 GPU）
        if (!this.opts.metadataOnly) {
            try {
                // 恢复结果
                const restored = await restoreLeaseIfAny(log);
                for (const e of restored.errors) {
                    log(`GPU 恢复失败：${e.message}`);
                }
            } catch (e) {
                if (e instanceof DaoyanCliError && e.code === "gpu_lease_corrupt") throw e;
                log(`GPU 租约恢复异常：${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // 3) GPU 接管（只在显式开启时；metadata session 不接管）
        if (!this.opts.metadataOnly && takeoverEnabled(this.opts.project)) {
            // 接管结果
            const outcome = await takeoverGpu({
                project: this.opts.project,
                taskId: this.opts.taskId,
                projectRoot: this.opts.root,
                log,
            });
            this.gpuRecord = outcome.record;
            this.gpuIssues = outcome.issues;
            for (const issue of outcome.issues) log(issue.message);
        }

        // 4) 启动
        const started = Date.now();
        // 兼容 machine.json 只存端口、engine 目录固定的布局
        const comfyDir = this.comfyDir();
        const venvPython = join(this.venvDir(), "bin", "python");
        if (!existsSync(venvPython)) {
            throw new DaoyanCliError({
                code: "engine_start_failed",
                message: `venv 不存在：${venvPython}。运行 daoyan init --mode=local 部署引擎`,
            });
        }
        if (!existsSync(join(comfyDir, "main.py"))) {
            throw new DaoyanCliError({
                code: "engine_start_failed",
                message: `ComfyUI 目录无效：${comfyDir}（缺少 main.py）。运行 daoyan init --mode=local`,
            });
        }
        // 端口占用检查：worker 已持有机器锁，任何监听者都是未知进程
        if (await portInUse(eng.port)) {
            throw new DaoyanCliError({
                code: "engine_start_failed",
                message: `端口 ${eng.port} 已被其他进程占用（不是本项目刚回收的引擎）；请释放端口或修改 machine.json`,
            });
        }

        // 日志文件
        const logDir = join(this.opts.root, LOG_DIR);
        ensureDir(logDir);
        // 本次引擎日志
        const logFile = join(logDir, `engine-${this.opts.taskId}.log`);
        // 日志 fd 交给子进程
        const fd = openSync(logFile, "a");
        // extra_model_paths 配置
        const modelsConfig = this.modelsConfigPath();
        // 启动参数
        const args = ["-u", "main.py", "--port", String(eng.port)];
        if (modelsConfig !== null) args.push("--extra-model-paths-config", modelsConfig);
        args.push(...(eng.launch_extra ?? []));
        log(`启动 local 引擎：${venvPython} ${args.join(" ")}`);
        // 子进程启动错误
        let spawnError: string | null = null;
        // 引擎子进程（detached，独立进程组便于整组停止）
        const child = spawn(venvPython, args, {
            cwd: comfyDir,
            detached: true,
            stdio: ["ignore", fd, fd],
            env: process.env,
        });
        child.on("error", (e) => {
            spawnError = e.message;
        });
        child.unref();
        // 未拿到 pid 视为启动失败
        if (child.pid === undefined) {
            closeSync(fd);
            throw new DaoyanCliError({
                code: "engine_start_failed",
                message: `无法 spawn 引擎：${spawnError ?? "unknown"}`,
            });
        }
        // 先记录 pid（即使 PID 文件写入失败，release 也能停掉进程）
        this.infoState = { ...this.infoState, pid: child.pid };
        // 写入 PID 记录（陈旧引擎回收依赖它）
        try {
            writeEnginePid(this.opts.root, {
                pid: child.pid,
                port: eng.port,
                comfyui_dir: comfyDir,
                task_id: this.opts.taskId,
                started_at: nowIso(),
            });
        } catch (e) {
            await stopPid(child.pid, log);
            throw new DaoyanCliError({
                code: "engine_start_failed",
                message: `无法写 logs/engine.pid：${e instanceof Error ? e.message : String(e)}`,
            });
        }
        log(`引擎进程 pid=${child.pid}，日志 ${LOG_DIR}/engine-${this.opts.taskId}.log，等待就绪...`);

        // 5) 等待就绪
        const deadline = Date.now() + READY_TIMEOUT_MS;
        while (Date.now() < deadline) {
            if (isAborted()) throw new Error("cancelled");
            if (spawnError !== null) {
                throw new DaoyanCliError({
                    code: "engine_start_failed",
                    message: `引擎启动失败：${spawnError}`,
                });
            }
            if (await probeComfy(this.client.base, 3_000)) {
                // 读取版本
                let version: string | null = null;
                try {
                    version = comfyVersionOf(await this.client.systemStats(10_000));
                } catch {
                    version = null;
                }
                this.infoState = {
                    ...this.infoState,
                    comfyui_version: version,
                    ready_ms: Date.now() - started,
                };
                log(`引擎就绪（${Date.now() - started}ms，ComfyUI ${version ?? "unknown"}）`);
                return;
            }
            if (!pidAlive(child.pid) && Date.now() - started > 10_000) {
                throw new DaoyanCliError({
                    code: "engine_start_failed",
                    message: `引擎进程提前退出。日志尾（${LOG_DIR}/engine-${this.opts.taskId}.log）：\n${tailFile(logFile, 8)}`,
                });
            }
            await sleep(READY_INTERVAL_MS);
        }
        throw new DaoyanCliError({
            code: "engine_start_failed",
            message: `引擎 ${READY_TIMEOUT_MS / 1000}s 内未就绪；查看 ${LOG_DIR}/engine-${this.opts.taskId}.log\n${tailFile(logFile, 8)}`,
        });
    }

    /**
     * 任务结束清理。
     */
    async release(inputs: ReleaseInputs, log: (m: string) => void): Promise<ReleaseResult> {
        // cleanup 各环节
        const cleanup: CleanupRecord = {
            interrupt: "not_needed",
            free: "not_needed",
            stop: "not_needed",
            scratch: "not_needed",
            gpu_restore: "not_needed",
        };
        // 附加错误
        const errors: Array<{ code: string; message: string }> = [];

        // 1) interrupt
        if (inputs.interrupt) {
            try {
                await this.client.interrupt();
                cleanup.interrupt = "ok";
            } catch {
                cleanup.interrupt = "failed";
            }
        }
        // 2) /free（只有提交过 prompt 才可能加载过模型）
        if (inputs.submitted) {
            try {
                await this.client.free();
                cleanup.free = "ok";
            } catch (e) {
                cleanup.free = "failed";
                errors.push({
                    code: "cleanup_failed",
                    message: `free 失败：${e instanceof Error ? e.message : String(e)}`,
                });
            }
        }
        // 3) 停止进程
        const pid = this.infoState.pid;
        if (pid !== null) {
            // 停止结果
            const stopped = await stopPid(pid, log);
            cleanup.stop = stopped ? "ok" : "failed";
            if (stopped) rmSync(enginePidFile(this.opts.root), { force: true });
            else errors.push({ code: "engine_stop_failed", message: `引擎进程 pid=${pid} 未能退出` });
        }
        // 4) scratch 清理（只删本次上传/已下载的文件）
        if (inputs.uploaded.length > 0 || inputs.scratch_outputs.length > 0) {
            cleanup.scratch = this.cleanupScratch(inputs);
        }
        // 5) GPU 恢复（metadata session 不碰 GPU）
        // 恢复结果
        let restored: string[] = [];
        if (this.opts.metadataOnly) {
            cleanup.gpu_restore = "not_needed";
        } else {
            try {
                // 恢复旧租约（含本次写下的）
                const r = await restoreLeaseIfAny(log);
                restored = r.restored;
                for (const e of r.errors) errors.push({ code: e.code, message: e.message });
                if (r.restored.length > 0 || r.errors.length === 0) cleanup.gpu_restore = "ok";
                if (r.errors.length > 0) cleanup.gpu_restore = "failed";
            } catch (e) {
                cleanup.gpu_restore = "failed";
                errors.push({
                    code: "gpu_restore_failed",
                    message: e instanceof Error ? e.message : String(e),
                });
            }
        }

        return {
            cleanup,
            restored,
            errors,
            ...(this.gpuRecord !== undefined ? { gpu: this.gpuRecord } : {}),
        };
    }

    /**
     * ComfyUI 目录：machine.json 显式路径优先，否则约定 engine/ComfyUI。
     */
    private comfyDir(): string {
        // 显式配置（相对路径锚到项目根）
        const configured = this.opts.machine.engine.mode === "local" ? this.opts.machine.engine.comfyui_dir : undefined;
        if (configured !== undefined && configured !== "") {
            return configured.startsWith("/") ? configured : join(this.opts.root, configured);
        }
        return join(this.opts.root, "engine", "ComfyUI");
    }

    /**
     * venv 目录：machine.json 显式路径优先，否则约定 engine/.venv。
     */
    private venvDir(): string {
        const configured = this.opts.machine.engine.mode === "local" ? this.opts.machine.engine.venv_dir : undefined;
        if (configured !== undefined && configured !== "") {
            return configured.startsWith("/") ? configured : join(this.opts.root, configured);
        }
        return join(this.opts.root, "engine", ".venv");
    }

    /**
     * extra_model_paths 配置路径（machine.models_config 优先）。
     */
    private modelsConfigPath(): string | null {
        if (this.opts.machine.engine.mode !== "local") return null;
        // 显式配置
        const explicit = this.opts.machine.engine.models_config;
        if (explicit !== undefined && explicit !== null && explicit !== "") return explicit;
        // 自动生成的文件
        const auto = join(this.opts.root, EXTRA_MODELS_FILE);
        return existsSync(auto) ? auto : null;
    }

    /**
     * 清理本次 run 的 scratch 文件（local 拥有引擎文件系统）。
     */
    private cleanupScratch(inputs: ReleaseInputs): string {
        if (this.opts.machine.engine.mode !== "local") return "not_needed";
        try {
            // 引擎目录
            const comfyDir = this.comfyDir();
            for (const name of inputs.uploaded) {
                // 引擎侧文件名可能带 subfolder
                rmSync(join(comfyDir, "input", name), { force: true });
            }
            for (const out of inputs.scratch_outputs) {
                rmSync(join(comfyDir, "output", out.subfolder, out.filename), { force: true });
            }
            return "ok";
        } catch {
            return "kept";
        }
    }
}
