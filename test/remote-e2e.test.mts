/** remote 端到端：mock ComfyUI + 真实 executor/session。
 *  覆盖成功、OOM、队列忙、预检失败、/free 策略与 run.json 相对路径。 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startMockComfy } from "./mock-comfy.mts";
import { planSingleRun } from "../src/core/task/plans.mts";
import { RemoteSession } from "../src/core/engine/remote-session.mts";
import { runPreflight } from "../src/core/workflow/preflight.mts";
import { executeRun } from "../src/core/run/executor.mts";
import { readRun } from "../src/core/run/store.mts";
import type { ProjectConfig, MachineConfig } from "../src/core/project/types.mts";

/**
 * 创建临时项目。
 */
function makeProject(url: string): { root: string; project: ProjectConfig; machine: MachineConfig } {
  const root = mkdtempSync(join(tmpdir(), "dycli-e2e-"));
  const project: ProjectConfig = { name: "test", version: 2, gpu: { takeover: false } };
  const machine: MachineConfig = {
    machine_id: "test-machine",
    engine: { mode: "remote", url, free_after_task: "always" },
  };
  const workflow = {
    "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
    "2": { class_type: "MockSampler", inputs: { seed: 1, steps: 20 } },
    "9": { class_type: "MockSave", inputs: { filename_prefix: "out" } },
  };
  writeFileSync(join(root, "project.json"), JSON.stringify(project, null, 2));
  // .dycli/machine.json
  const localDir = join(root, ".dycli");
  mkdirSync(localDir, { recursive: true });
  writeFileSync(join(localDir, "machine.json"), JSON.stringify(machine, null, 2));
  // workflows
  const wfDir = join(root, "workflows");
  mkdirSync(wfDir, { recursive: true });
  writeFileSync(join(wfDir, "t.json"), JSON.stringify(workflow, null, 2));
  writeFileSync(join(wfDir, "t.bindings.json"), JSON.stringify({ seed: "2.seed" }, null, 2));
  return { root, project, machine };
}

test("remote 成功：提交、下载、/free，run.json 不含绝对路径", async () => {
  const mock = await startMockComfy({ result: "success", completionDelayMs: 10 });
  const { root, project, machine } = makeProject(mock.url);
  try {
    const plan = planSingleRun({
      root,
      project,
      machine,
      workflowRef: "t",
      sets: { "2.seed": 42 },
      label: "shot:01",
    });
    const session = new RemoteSession(mock.url, "always");
    await session.ensureReady(() => {});
    const preflight = await runPreflight(root, session.client, plan.graph, () => {});
    assert.equal(preflight.issues.length, 0);
    const accumulator = {
      submitted: false,
      uploaded: [],
      scratchOutputs: [],
      interruptNeeded: false,
    };
    const record = await executeRun({
      root,
      project,
      machine,
      session,
      plan,
      runId: "r_test",
      taskId: "t_test",
      machineId: machine.machine_id,
      requestId: "req-1",
      timeoutMs: 10_000,
      signal: new AbortController().signal,
      accumulator,
      catalog: preflight.catalog,
      log: () => {},
      event: () => {},
    });
    assert.equal(record.status, "succeeded");
    assert.equal(record.outputs.length, 1);
    assert.equal(record.engine.comfyui_version, "mock-1.0");
    assert.equal(accumulator.submitted, true);
    // 产物落盘
    const outputFile = join(root, "runs", "r_test", "outputs", "mock-output.mp4");
    assert.equal(existsSync(outputFile), true);
    assert.equal(readFileSync(outputFile, "utf8"), "mock-video-bytes");
    // cleanup：/free
    const released = await session.release(
      { submitted: true, interrupt: false, uploaded: [], scratch_outputs: [] },
      () => {},
    );
    assert.equal(released.cleanup.free, "ok");
    assert.equal(mock.freeCount, 1);
    // 提交的 seed 被覆盖
    const submitted = mock.lastPrompt as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(submitted["2"]?.inputs.seed, 42);
    // run.json 无绝对路径
    const runJson = readFileSync(join(root, "runs", "r_test", "run.json"), "utf8");
    assert.equal(runJson.includes(root), false);
    assert.equal(readRun(root, "r_test")?.workflow.path, "workflows/t.json");
  } finally {
    await mock.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("remote OOM：engine_oom，失败 run 落盘，cleanup 仍 /free", async () => {
  const mock = await startMockComfy({ result: "oom", completionDelayMs: 10 });
  const { root, project, machine } = makeProject(mock.url);
  try {
    const plan = planSingleRun({ root, project, machine, workflowRef: "t", sets: {} });
    const session = new RemoteSession(mock.url, "always");
    await session.ensureReady(() => {});
    const preflight = await runPreflight(root, session.client, plan.graph, () => {});
    const accumulator = {
      submitted: false,
      uploaded: [],
      scratchOutputs: [],
      interruptNeeded: false,
    };
    await assert.rejects(
      executeRun({
        root,
        project,
        machine,
        session,
        plan,
        runId: "r_oom",
        taskId: "t_oom",
        machineId: machine.machine_id,
        requestId: null,
        timeoutMs: 10_000,
        signal: new AbortController().signal,
        accumulator,
        catalog: preflight.catalog,
        log: () => {},
        event: () => {},
      }),
      (e: unknown) => (e as { code?: string }).code === "engine_oom",
    );
    assert.equal(accumulator.interruptNeeded, true);
    const failed = readRun(root, "r_oom");
    assert.equal(failed?.status, "failed");
    assert.equal(failed?.error?.code, "engine_oom");
    await session.release(
      { submitted: true, interrupt: true, uploaded: [], scratch_outputs: [] },
      () => {},
    );
    assert.equal(mock.freeCount, 1);
  } finally {
    await mock.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("remote 队列忙：engine_busy，不提交、不 /free", async () => {
  const mock = await startMockComfy({ busy: true });
  const { root, project, machine } = makeProject(mock.url);
  try {
    const plan = planSingleRun({ root, project, machine, workflowRef: "t", sets: {} });
    const session = new RemoteSession(mock.url, "always");
    await assert.rejects(
      session.ensureReady(() => {}),
      (e: unknown) => (e as { code?: string }).code === "engine_busy",
    );
    assert.equal(mock.calls.includes("/prompt"), false);
    assert.equal(mock.freeCount, 0);
    assert.equal(plan.graph["2"] !== undefined, true);
  } finally {
    await mock.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("预检 model_not_found：不提交 prompt", async () => {
  const mock = await startMockComfy();
  const { root, project, machine } = makeProject(mock.url);
  try {
    const plan = planSingleRun({
      root,
      project,
      machine,
      workflowRef: "t",
      sets: { "1.ckpt_name": "missing.safetensors" },
    });
    const session = new RemoteSession(mock.url, "always");
    await session.ensureReady(() => {});
    const pf = await runPreflight(root, session.client, plan.graph, () => {});
    assert.equal(pf.issues.some((i) => i.code === "model_not_found"), true);
    assert.equal(mock.calls.includes("/prompt"), false);
  } finally {
    await mock.close();
    rmSync(root, { recursive: true, force: true });
  }
});
