/** task 事件与 run store 测试：seq 递增、事件增量读取、产物命名与相对路径。 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, readEvents } from "../src/core/task/events.mts";
import { createRunDir, writeInputsSnapshot, writeRunOutput, writeWorkflowSnapshot } from "../src/core/run/store.mts";

test("events.jsonl 追加与增量读取", () => {
  const dir = mkdtempSync(join(tmpdir(), "dycli-events-"));
  try {
    appendEvent(dir, "queued", { kind: "run" });
    appendEvent(dir, "engine_started", { pid: 123 });
    appendEvent(dir, "submitted", { prompt_id: "p1" });
    const all = readEvents(dir);
    assert.deepEqual(all.map((e) => e.seq), [1, 2, 3]);
    assert.equal(all[1]?.type, "engine_started");
    const tail = readEvents(dir, 1);
    assert.deepEqual(tail.map((e) => e.seq), [2, 3]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("run store：快照与产物写入，路径相对", () => {
  const root = mkdtempSync(join(tmpdir(), "dycli-run-"));
  try {
    createRunDir(root, "r_1");
    writeWorkflowSnapshot(root, "r_1", { "1": { class_type: "X", inputs: {} } });
    writeInputsSnapshot(root, "r_1", { seed: 1 }, [{ name: "a.png", sha256: "h", bytes: 1 }]);
    const out = writeRunOutput(root, "r_1", "clip.mp4", new Uint8Array([1, 2, 3]));
    assert.deepEqual(out, { name: "clip.mp4", path: "outputs/clip.mp4", sha256: out.sha256, bytes: 3 });
    assert.equal(existsSync(join(root, "runs", "r_1", "outputs", "clip.mp4")), true);
    const inputs = JSON.parse(readFileSync(join(root, "runs", "r_1", "inputs.json"), "utf8")) as {
      files: Array<{ name: string }>;
    };
    assert.equal(inputs.files[0]?.name, "a.png");
    // 重名自动加后缀
    const second = writeRunOutput(root, "r_1", "clip.mp4", new Uint8Array([4]));
    assert.equal(second.name, "clip_1.mp4");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
