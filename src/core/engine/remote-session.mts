/** remote 引擎会话 —— 只走 HTTP：探测、队列检查、按策略 /free。
 *  永不启动、停止或杀远端进程。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import { sleep } from "../../shared/net.mts";
import { ComfyClient } from "../comfy/client.mts";
import { comfyVersionOf } from "../workflow/catalog.mts";
import type { FreeStrategy } from "../project/types.mts";
import type { EngineSession, EngineSessionInfo, ReleaseInputs, ReleaseResult } from "./session.mts";

/**
 * remote 引擎会话。
 */
export class RemoteSession implements EngineSession {
    /**
     * 共用 HTTP 客户端。
     */
    readonly client: ComfyClient;
    // 释放策略
    private readonly freeStrategy: FreeStrategy;
    // 会话信息
    private infoState: EngineSessionInfo;

    /**
     * 构造会话。
     */
    constructor(url: string, freeStrategy: FreeStrategy) {
        // 去掉尾部斜杠，保留路径前缀
        const base = url.replace(/\/+$/, "");
        this.client = new ComfyClient(base);
        this.freeStrategy = freeStrategy;
        this.infoState = {
            mode: "remote",
            url: base,
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
     * remote 不管理进程，健康状态未知。
     */
    health(): "alive" | "dead" | "unknown" {
        return "unknown";
    }

    /**
     * 探测可达性并检查队列；忙则 engine_busy，不提交。
     */
    async ensureReady(log: (m: string) => void, signal?: AbortSignal): Promise<void> {
        // 取消判定（避免 TS 对属性做窄化）
        const isAborted = (): boolean => signal !== undefined && signal.aborted;
        if (isAborted()) throw new Error("cancelled");
        // 连通探测（重试两次，容忍瞬时网络抖动）
        let stats: unknown = null;
        for (let i = 0; i < 2; i++) {
            if (isAborted()) throw new Error("cancelled");
            try {
                stats = await this.client.systemStats(10_000);
                break;
            } catch (e) {
                if (i === 1) {
                    throw new DaoyanCliError({
                        code: "engine_unreachable",
                        message: `远端引擎不可达（${this.infoState.url}）：${e instanceof Error ? e.message : String(e)}`,
                    });
                }
                await sleep(1_000);
            }
        }
        // 队列检查
        let queue: { queue_running: unknown[]; queue_pending: unknown[] };
        try {
            queue = await this.client.queue();
        } catch (e) {
            throw new DaoyanCliError({
                code: "engine_unreachable",
                message: `远端引擎队列不可读：${e instanceof Error ? e.message : String(e)}`,
            });
        }
        // 执行中 + 等待中
        const busy = queue.queue_running.length + queue.queue_pending.length;
        if (busy > 0) {
            throw new DaoyanCliError({
                code: "engine_busy",
                message: `远端队列已有 ${busy} 个任务（执行中 ${queue.queue_running.length} / 等待 ${queue.queue_pending.length}）；不提交`,
                details: { running: queue.queue_running.length, pending: queue.queue_pending.length },
            });
        }
        // 版本
        const version = comfyVersionOf(stats);
        this.infoState = { ...this.infoState, comfyui_version: version };
        log(`remote 引擎就绪：${this.infoState.url}（ComfyUI ${version ?? "unknown"}，队列空闲）`);
    }

    /**
     * 任务结束：按 free_after_task 策略卸载模型；不碰进程。
     */
    async release(inputs: ReleaseInputs, log: (m: string) => void): Promise<ReleaseResult> {
        // cleanup 记录
        const cleanup = {
            interrupt: "not_needed",
            free: "not_needed",
            stop: "not_needed",
            scratch: "not_needed",
            gpu_restore: "not_needed",
        };
        // 未提交过 prompt：没有加载模型，不 /free、不 interrupt
        if (!inputs.submitted) {
            return { cleanup, restored: [], errors: [] };
        }
        // 取消 / 超时 / OOM：仍走 HTTP /interrupt（不碰远端进程）
        if (inputs.interrupt) {
            try {
                await this.client.interrupt();
                cleanup.interrupt = "ok";
            } catch (e) {
                cleanup.interrupt = "failed";
                log(`remote /interrupt 失败：${e instanceof Error ? e.message : String(e)}`);
            }
        }
        // 释放策略
        if (this.freeStrategy === "never") {
            cleanup.free = "skipped";
            log("remote 释放策略 never：跳过 /free");
            return { cleanup, restored: [], errors: [] };
        }
        if (this.freeStrategy === "when_idle") {
            // 队列空闲判定
            const idle = await this.client.queueIdle();
            if (idle !== true) {
                cleanup.free = idle === false ? "skipped" : "skipped";
                log(idle === false ? "remote 队列仍有任务：跳过 /free" : "remote 队列不可读：跳过 /free");
                return { cleanup, restored: [], errors: [] };
            }
        }
        try {
            await this.client.free();
            cleanup.free = "ok";
        } catch (e) {
            cleanup.free = "failed";
            log(`remote /free 失败（不影响任务状态）：${e instanceof Error ? e.message : String(e)}`);
        }
        return { cleanup, restored: [], errors: [] };
    }
}
