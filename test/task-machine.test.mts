/** task 跨机器语义：本机不等待/不取消其他机器的 task；本机死 worker 自动 interrupted。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cancelTask, waitForTask } from "../src/core/task/create.mts";
import { createTask, makeTaskRecord, readTask } from "../src/core/task/store.mts";

/**
 * 建一个最小项目。
 */
function makeRoot(machineId: string): string {
    const root = mkdtempSync(join(tmpdir(), "dycli-task-"));
    writeFileSync(join(root, "project.json"), JSON.stringify({ name: "t", version: 2 }));
    mkdirSync(join(root, ".dycli"), { recursive: true });
    writeFileSync(
        join(root, ".dycli", "machine.json"),
        JSON.stringify({
            machine_id: machineId,
            engine: { mode: "remote", url: "http://127.0.0.1:9" },
        }),
    );
    return root;
}

test("其他机器的 task：wait 返回 foreign，cancel 被拒绝", async () => {
    const root = makeRoot("machine-a");
    try {
        const rec = makeTaskRecord({
            taskId: "t_foreign",
            kind: "run",
            machineId: "machine-b",
            requestId: null,
            mode: "remote",
            command: "run",
            options: { workflow: "t2v" },
        });
        createTask(root, {
            ...rec,
            status: "running",
            worker: { pid: 999_999, started_at: new Date().toISOString() },
        });
        const waited = await waitForTask({ root, taskId: "t_foreign", timeoutMs: 100 });
        assert.equal(waited.foreign, true);
        assert.equal(waited.task.status, "running");
        assert.equal(readTask(root, "t_foreign")?.status, "running");
        await assert.rejects(
            cancelTask(root, "t_foreign"),
            (e: unknown) => (e as { code?: string }).code === "config_invalid",
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("本机 task 的 worker 已死：wait 标记 interrupted", async () => {
    const root = makeRoot("machine-a");
    try {
        const rec = makeTaskRecord({
            taskId: "t_dead",
            kind: "run",
            machineId: "machine-a",
            requestId: null,
            mode: "remote",
            command: "run",
            options: { workflow: "t2v" },
        });
        createTask(root, {
            ...rec,
            status: "running",
            worker: { pid: 999_999, started_at: new Date().toISOString() },
        });
        const waited = await waitForTask({ root, taskId: "t_dead", timeoutMs: 100 });
        assert.equal(waited.foreign, undefined);
        assert.equal(waited.task.status, "interrupted");
        assert.equal(waited.task.error?.code, "worker_crashed");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
