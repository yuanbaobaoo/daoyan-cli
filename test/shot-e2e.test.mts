/** shot 多 run + 首帧/接力测试：共享一次引擎会话，接力能看到上游刚完成的 run。
 *  需要本机 ffmpeg/ffprobe；缺失时跳过。 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startMockComfy } from "./mock-comfy.mts";
import { planShotRuns } from "../src/core/task/plans.mts";
import { RemoteSession } from "../src/core/engine/remote-session.mts";
import { fetchCatalog, runPreflight } from "../src/core/workflow/preflight.mts";
import { executeRun } from "../src/core/run/executor.mts";
import { loadShotsFile } from "../src/core/project/config.mts";
import type { ProjectConfig, MachineConfig, RunRecord } from "../src/core/project/types.mts";

/**
 * 是否具备 ffmpeg/ffprobe。
 */
function hasFfmpeg(): boolean {
    try {
        execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
        execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

test("shot 01 02：一个会话、两 run、接力首帧", async (t) => {
    if (!hasFfmpeg()) {
        t.skip("ffmpeg/ffprobe 不可用");
        return;
    }
    // 生成一段有效 mp4 作为 mock 产物
    const clip = join(tmpdir(), `dycli-clip-${process.pid}.mp4`);
    execFileSync("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=red:s=64x64:r=10:d=1",
        "-pix_fmt",
        "yuv420p",
        clip,
    ]);
    // mock server
    const mock = await startMockComfy({
        completionDelayMs: 10,
        outputBytes: new Uint8Array(readFileSync(clip)),
        outputFilename: "shot.mp4",
    });
    const root = mkdtempSync(join(tmpdir(), "dycli-shot-e2e-"));
    try {
        const project: ProjectConfig = { name: "shot-test", version: 2, gpu: { takeover: false } };
        const machine: MachineConfig = {
            machine_id: "shot-machine",
            engine: { mode: "remote", url: mock.url, free_after_task: "always" },
        };
        mkdirSync(join(root, ".dycli"), { recursive: true });
        mkdirSync(join(root, "workflows"), { recursive: true });
        mkdirSync(join(root, "anchors"), { recursive: true });
        writeFileSync(join(root, "project.json"), JSON.stringify(project, null, 2));
        writeFileSync(join(root, ".dycli", "machine.json"), JSON.stringify(machine, null, 2));
        writeFileSync(join(root, "anchors", "start.png"), "fake-png");
        writeFileSync(
            join(root, "workflows", "t2v.json"),
            JSON.stringify(
                {
                    "0": { class_type: "LoadImage", inputs: { image: "placeholder.png" } },
                    "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
                    "2": { class_type: "MockSampler", inputs: { seed: 1, steps: 20 } },
                    "9": { class_type: "MockSave", inputs: { filename_prefix: "out" } },
                },
                null,
                2,
            ),
        );
        writeFileSync(
            join(root, "workflows", "t2v.bindings.json"),
            JSON.stringify(
                {
                    prompt: "2.prompt",
                    seed: "2.seed",
                    steps: "2.steps",
                    first_frame: "0.image",
                    filename_prefix: "9.filename_prefix",
                },
                null,
                2,
            ),
        );
        writeFileSync(
            join(root, "shots.json"),
            JSON.stringify(
                {
                    workflow: "t2v",
                    meta: { width: 64, height: 64, anchors: { S1: "anchors/start.png" } },
                    defaults: { steps: 20, negative: "bad" },
                    style_prefix: "film",
                    shots: [
                        { id: "01", seed: 1, first_frame: "S1", prompt: "opening" },
                        { id: "02", seed: 2, first_frame: { relay: "01" }, prompt: "relay" },
                    ],
                },
                null,
                2,
            ),
        );

        const shots = loadShotsFile(root);
        const session = new RemoteSession(mock.url, "always");
        await session.ensureReady(() => {});
        const accumulator = {
            submitted: false,
            uploaded: [],
            scratchOutputs: [],
            interruptNeeded: false,
        };
        // 先规划第一镜，取目录
        const firstPlanned = await planShotRuns({
            root,
            project,
            machine,
            shots,
            shotIds: ["01"],
            force: true,
            log: () => {},
        });
        const first = firstPlanned.plans[0];
        assert.ok(first);
        const catalog = (await fetchCatalog(root, session.client, () => {})).catalog;
        const runs: RunRecord[] = [];
        runs.push(
            await executeRun({
                root,
                project,
                machine,
                session,
                plan: first,
                runId: "r_shot_01",
                taskId: "t_shot",
                machineId: machine.machine_id,
                requestId: null,
                timeoutMs: 15_000,
                signal: new AbortController().signal,
                accumulator,
                catalog,
                log: () => {},
                event: () => {},
            }),
        );
        // 第二镜：此时上游 run 已存在，规划应能抽尾帧
        const secondPlanned = await planShotRuns({
            root,
            project,
            machine,
            shots,
            shotIds: ["02"],
            force: true,
            log: () => {},
        });
        const second = secondPlanned.plans[0];
        assert.ok(second);
        runs.push(
            await executeRun({
                root,
                project,
                machine,
                session,
                plan: second,
                runId: "r_shot_02",
                taskId: "t_shot",
                machineId: machine.machine_id,
                requestId: null,
                timeoutMs: 15_000,
                signal: new AbortController().signal,
                accumulator,
                catalog,
                log: () => {},
                event: () => {},
            }),
        );
        // 两个 run 都成功
        assert.deepEqual(
            runs.map((r) => r.status),
            ["succeeded", "succeeded"],
        );
        // 两次上传：锚点 + 接力帧
        assert.equal(mock.uploads.length, 2);
        assert.equal(existsSync(join(root, "runs", "r_shot_01", "inputs", "anchor_S1_01.png")), true);
        assert.equal(existsSync(join(root, "runs", "r_shot_02", "inputs", "relay_01_02.png")), true);
        // 共享一次引擎会话：release 一次
        const rel = await session.release(
            { submitted: true, interrupt: false, uploaded: [], scratch_outputs: [] },
            () => {},
        );
        assert.equal(rel.cleanup.free, "ok");
        assert.equal(mock.freeCount, 1);
    } finally {
        await mock.close();
        rmSync(root, { recursive: true, force: true });
        rmSync(clip, { force: true });
    }
});
