/** machine lock 单元测试：忙、陈旧恢复、损坏、令牌释放。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireMachineLock } from "../src/core/machine/lock.mts";

test("同一时间只允许一个 owner；忙返回 machine_busy", async () => {
  const root = mkdtempSync(join(tmpdir(), "dycli-lock-"));
  try {
    const path = join(root, "machine.lock");
    // 第一个 task
    const first = await acquireMachineLock({
      taskId: "t_1",
      project: root,
      mode: "remote",
      command: "run t2v",
      path,
    });
    // 第二个 task
    const err = await acquireMachineLock({
      taskId: "t_2",
      project: root,
      mode: "local",
      command: "shot 01",
      path,
    }).then(
      () => null,
      (e: unknown) => e as { code: string; details: { owner: { task_id: string } }; retryAfterMs?: number },
    );
    assert.ok(err);
    assert.equal(err.code, "machine_busy");
    assert.equal(err.details.owner.task_id, "t_1");
    assert.equal(err.retryAfterMs, 5000);
    // 释放后可获取
    first.release();
    const second = await acquireMachineLock({
      taskId: "t_2",
      project: root,
      mode: "local",
      command: "shot 01",
      path,
    });
    second.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("owner 已死时陈旧锁自动恢复", async () => {
  const root = mkdtempSync(join(tmpdir(), "dycli-lock-stale-"));
  try {
    const path = join(root, "machine.lock");
    // 先拿锁，再把 pid 改成不存在的进程
    const first = await acquireMachineLock({
      taskId: "t_dead",
      project: root,
      mode: "remote",
      command: "run",
      path,
    });
    first.handoff(999_999);
    // 新 task 应能恢复并获取
    const second = await acquireMachineLock({
      taskId: "t_new",
      project: root,
      mode: "remote",
      command: "run",
      path,
    });
    assert.equal(second.record.task_id, "t_new");
    second.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("损坏的锁文件返回 machine_lock_corrupt", async () => {
  const root = mkdtempSync(join(tmpdir(), "dycli-lock-corrupt-"));
  try {
    const path = join(root, "machine.lock");
    writeFileSync(path, "{not-json");
    await assert.rejects(
      acquireMachineLock({
        taskId: "t_1",
        project: root,
        mode: "remote",
        command: "run",
        path,
      }),
      (e: unknown) => (e as { code?: string }).code === "machine_lock_corrupt",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
