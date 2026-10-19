/** GPU 租约 —— ~/.dycli/gpu/lease.json（本机，不进仓库）。
 *  记录被卸载的模型与被驱逐的进程，任务异常退出后下一次 local 任务据此恢复。
 *  写权限 0600；不记录环境变量等可能含密钥的内容。 */
import { chmodSync, existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { ensureDir, nowIso, readJsonIfExists, writeJsonAtomic } from "../../shared/fs.mts";
import type { GpuLeaseEntry } from "./targets.mts";

/**
 * GPU 租约文件结构。
 */
export interface GpuLease {
    /**
     * schema 版本。
     */
    version: 1;
    /**
     * 归属 task。
     */
    task_id: string;
    /**
     * 项目根（绝对路径，仅本机文件）。
     */
    project: string;
    /**
     * 创建时间（ISO）。
     */
    created_at: string;
    /**
     * 待恢复条目。
     */
    entries: GpuLeaseEntry[];
}

/**
 * 租约读取结果。
 */
export type LeaseInspection =
    | { status: "absent"; path: string }
    | { status: "ok"; path: string; lease: GpuLease }
    | { status: "corrupt"; path: string; message: string };

/**
 * 租约文件路径（每 OS 用户一份）。
 */
export function leasePath(): string {
    return join(homedir(), ".dycli", "gpu", "lease.json");
}

/**
 * 校验租约结构（最小字段）。
 */
function isLease(v: unknown): v is GpuLease {
    if (typeof v !== "object" || v === null) return false;
    // 宽松视图
    const o = v as Record<string, unknown>;
    return (
        o.version === 1 &&
        typeof o.task_id === "string" &&
        typeof o.project === "string" &&
        typeof o.created_at === "string" &&
        Array.isArray(o.entries)
    );
}

/**
 * 读取租约。
 */
export function inspectLease(path = leasePath()): LeaseInspection {
    if (!existsSync(path)) return { status: "absent", path };
    try {
        // 解析结果
        const raw = readJsonIfExists<unknown>(path);
        if (raw === null) return { status: "absent", path };
        if (!isLease(raw)) return { status: "corrupt", path, message: "租约字段不完整" };
        return { status: "ok", path, lease: raw };
    } catch (e) {
        return { status: "corrupt", path, message: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * 写入租约（0600）。
 */
export function writeLease(lease: GpuLease, path = leasePath()): void {
    ensureDir(dirname(path));
    writeJsonAtomic(path, lease);
    try {
        chmodSync(path, 0o600);
    } catch {
        // 非 POSIX 平台忽略
    }
}

/**
 * 创建空租约记录。
 */
export function newLease(taskId: string, project: string): GpuLease {
    return { version: 1, task_id: taskId, project, created_at: nowIso(), entries: [] };
}

/**
 * 删除租约。
 */
export function clearLease(path = leasePath()): void {
    if (existsSync(path)) {
        rmSync(path, { force: true });
    }
}
