/** 引擎会话接口 —— local / remote 的差异只在这里：进程生命周期与 GPU 接管。
 *  提交、上传、轮询、下载、/free 全部共用 ComfyClient。 */
import type { ProjectConfig, CleanupRecord, MachineConfig } from "../project/types.mts";
import type { ComfyClient } from "../comfy/client.mts";

/**
 * 引擎会话的静态信息（写入 run.json）。
 */
export interface EngineSessionInfo {
    /**
     * local / remote。
     */
    mode: "local" | "remote";
    /**
     * 引擎 base URL。
     */
    url: string;
    /**
     * ComfyUI 版本（就绪后填充）。
     */
    comfyui_version: string | null;
    /**
     * local 进程 pid（remote 为 null）。
     */
    pid: number | null;
    /**
     * 从启动到就绪的毫秒数（remote 为 null）。
     */
    ready_ms: number | null;
}

/**
 * 会话释放所需的执行信息。
 */
export interface ReleaseInputs {
    /**
     * 是否已经提交过 prompt（决定是否 /free）。
     */
    submitted: boolean;
    /**
     * 是否需要 interrupt（取消 / 超时 / OOM）。
     */
    interrupt: boolean;
    /**
     * 通过 /upload/image 上传的引擎侧文件名（local 用于清理）。
     */
    uploaded: string[];
    /**
     * 已成功下载的引擎产物（local 用于清理 scratch）。
     */
    scratch_outputs: Array<{ filename: string; subfolder: string }>;
}

/**
 * 会话释放结果。
 */
export interface ReleaseResult {
    /**
     * cleanup 记录（写入每个 run）。
     */
    cleanup: CleanupRecord;
    /**
     * GPU 恢复的对象。
     */
    restored: string[];
    /**
     * GPU / cleanup 部分失败（不覆盖主错误）。
     */
    errors: Array<{ code: string; message: string }>;
    /**
     * 会话产生的 GPU 接管记录（local 且开启时）。
     */
    gpu?: import("../project/types.mts").RunGpuRecord;
}

/**
 * 引擎会话。
 */
export interface EngineSession {
    /**
     * 共用 HTTP 客户端。
     */
    readonly client: ComfyClient;
    /**
     * 当前会话信息。
     */
    info: () => EngineSessionInfo;
    /**
     * 确保引擎可用（local 启动 / remote 探测 + 队列检查）。
     * signal 用于取消时尽快退出启动等待。
     */
    ensureReady: (log: (m: string) => void, signal?: AbortSignal) => Promise<void>;
    /**
     * 任务结束清理（interrupt → free → stop → GPU 恢复）。
     */
    release: (inputs: ReleaseInputs, log: (m: string) => void) => Promise<ReleaseResult>;
    /**
     * 进程健康（local: alive/dead；remote: unknown）。
     */
    health: () => "alive" | "dead" | "unknown";
}

/**
 * 创建会话的参数。
 */
export interface CreateSessionOptions {
    /**
     * 项目根。
     */
    root: string;
    /**
     * 共享项目配置。
     */
    project: ProjectConfig;
    /**
     * 本机配置。
     */
    machine: MachineConfig;
    /**
     * 当前 task id。
     */
    taskId: string;
    /**
     * 单次 remote URL 覆盖（--engine）。
     */
    engineUrlOverride?: string;
    /**
     * metadata session（只取 /object_info）：不加载模型、不做 GPU 接管。
     */
    metadataOnly?: boolean;
}

/**
 * 根据模式创建会话（工厂）。
 */
export async function createEngineSession(opts: CreateSessionOptions): Promise<EngineSession> {
    if (opts.engineUrlOverride !== undefined) {
        const { RemoteSession } = await import("./remote-session.mts");
        return new RemoteSession(opts.engineUrlOverride, "when_idle");
    }
    if (opts.machine.engine.mode === "remote") {
        const { RemoteSession } = await import("./remote-session.mts");
        return new RemoteSession(opts.machine.engine.url, opts.machine.engine.free_after_task ?? "when_idle");
    }
    const { LocalSession } = await import("./local-session.mts");
    return new LocalSession(opts);
}
