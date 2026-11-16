/** 图片执行链路：t2i / i2i / inpaint 计划、上传、定稿与视频首帧引用。 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startMockComfy } from "./mock-comfy.mts";
import { RemoteSession } from "../src/core/engine/remote-session.mts";
import { fetchCatalog } from "../src/core/workflow/preflight.mts";
import { executeRun } from "../src/core/run/executor.mts";
import { planImageRuns, planShotRuns } from "../src/core/task/plans.mts";
import { initStory, loadEpisodeShots } from "../src/core/story/store.mts";
import { addStill, addStillRefBytes, initStills, loadStills, stillTakeOf } from "../src/core/story/stills.mts";
import { finalizeStillTake, stillTakeSummary } from "../src/core/story/image-takes.mts";
import { boxMaskPng } from "../src/core/media/png.mts";
import type { MachineConfig, ProjectConfig, RunRecord } from "../src/core/project/types.mts";

// 1x1 PNG
const PNG = new Uint8Array(
    Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=",
        "base64",
    ),
);

/**
 * 写 JSON 文件。
 */
function writeJson(file: string, value: unknown): void {
    writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

test("图片链路：t2i / i2i / inpaint、定稿与首帧引用", async () => {
    // mock ComfyUI（输出 PNG）
    const mock = await startMockComfy({
        completionDelayMs: 5,
        outputBytes: PNG,
        outputFilename: "out.png",
    });
    const root = mkdtempSync(join(tmpdir(), "dycli-image-e2e-"));
    try {
        // 项目
        const project: ProjectConfig = {
            name: "image-e2e",
            version: 2,
            production: { mode: "single", audio: false },
            image: {
                ops: {
                    t2i: { workflow: "workflows/image.json" },
                    i2i: { workflow: "workflows/image.json" },
                    upscale: { workflow: "workflows/image.json" },
                    inpaint: { workflow: "workflows/image.json" },
                },
            },
        };
        const machine: MachineConfig = {
            machine_id: "image-machine",
            engine: { mode: "remote", url: mock.url, free_after_task: "always" },
        };
        mkdirSync(join(root, ".dycli"), { recursive: true });
        mkdirSync(join(root, "workflows"), { recursive: true });
        writeJson(join(root, "project.json"), project);
        writeJson(join(root, ".dycli", "machine.json"), machine);
        initStory(root, "image-e2e");
        initStills(root);
        // 工作流与 bindings
        writeJson(join(root, "workflows", "image.json"), {
            "0": { class_type: "LoadImage", inputs: { image: "placeholder.png" } },
            "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
            "2": { class_type: "MockSampler", inputs: { seed: 1, steps: 20 } },
            "3": { class_type: "LoadImage", inputs: { image: "placeholder-mask.png" } },
            "4": { class_type: "LoadImage", inputs: { image: "placeholder-first.png" } },
            "9": { class_type: "MockSave", inputs: { filename_prefix: "out" } },
        });
        writeJson(join(root, "workflows", "image.bindings.json"), {
            prompt: "2.prompt",
            seed: "2.seed",
            steps: "2.steps",
            source: "0.image",
            mask: "3.image",
            first_frame: "4.image",
            filename_prefix: "9.filename_prefix",
        });
        // 参考图 / 遮罩
        const sourceRef = addStillRefBytes({ root, bytes: PNG, id: "source-ref", role: "reference" });
        const maskRef = addStillRefBytes({
            root,
            bytes: boxMaskPng(4, 4, { x: 1, y: 1, width: 2, height: 2 }),
            id: "mask-ref",
            role: "mask",
        });
        // 图片单元
        addStill(root, { id: "cover", prompt: "雨夜主视觉", seed: 1, width: 4, height: 4 });
        addStill(root, { id: "variant", prompt: "变体", seed: 2, width: 4, height: 4, source: `ref:${sourceRef.id}` });
        addStill(root, {
            id: "repair",
            prompt: "修复",
            seed: 3,
            width: 4,
            height: 4,
            source: `ref:${sourceRef.id}`,
            mask: `ref:${maskRef.id}`,
        });
        // 会话
        const session = new RemoteSession(mock.url, "always");
        await session.ensureReady(() => {});
        const catalog = (await fetchCatalog(root, session.client, () => {})).catalog;
        const accumulator = { submitted: false, uploaded: [], scratchOutputs: [], interruptNeeded: false };
        // 逐 op 执行
        const runOf = async (stillId: string, op: "t2i" | "i2i" | "inpaint", runId: string): Promise<RunRecord> => {
            const planned = planImageRuns({
                root,
                project,
                machine,
                stillIds: [stillId],
                op,
                log: () => {},
            });
            const plan = planned.plans[0];
            assert.ok(plan);
            assert.equal(plan.label, `img:${stillId}`);
            assert.equal(plan.op, op);
            return executeRun({
                root,
                project,
                machine,
                session,
                plan,
                runId,
                taskId: "t_image",
                machineId: machine.machine_id,
                requestId: null,
                timeoutMs: 15_000,
                signal: new AbortController().signal,
                accumulator,
                catalog,
                log: () => {},
                event: () => {},
            });
        };
        const t2i = await runOf("cover", "t2i", "r_t2i");
        assert.equal(t2i.status, "succeeded");
        assert.equal(t2i.op, "t2i");
        assert.equal(t2i.outputs[0]?.name, "out.png");
        // t2i 不上传
        assert.equal(mock.uploads.length, 0);
        const i2i = await runOf("variant", "i2i", "r_i2i");
        assert.equal(i2i.status, "succeeded");
        const i2iPlanned = planImageRuns({
            root,
            project,
            machine,
            stillIds: ["variant"],
            op: "i2i",
            log: () => {},
        });
        assert.equal(i2iPlanned.plans[0]?.uploads.length, 1);
        const inpaint = await runOf("repair", "inpaint", "r_inpaint");
        assert.equal(inpaint.status, "succeeded");
        const inpaintPlanned = planImageRuns({
            root,
            project,
            machine,
            stillIds: ["repair"],
            op: "inpaint",
            log: () => {},
        });
        assert.equal(inpaintPlanned.plans[0]?.uploads.length, 2);
        // 定稿
        const finalized = finalizeStillTake({
            root,
            stillId: "cover",
            runId: "r_t2i",
            source: "ai",
        });
        assert.equal(finalized.changed, true);
        assert.equal(stillTakeOf(root, "cover")?.finalized?.output, "out.png");
        assert.equal(stillTakeSummary(root, "cover").candidates.length, 1);
        // 视频首帧引用图片定稿
        writeJson(join(root, "episodes", "ep01", "shots.json"), {
            workflow: "workflows/image.json",
            meta: { episode_id: "ep01", width: 4, height: 4, anchors: {} },
            defaults: { steps: 20 },
            shots: [{ id: "01", seed: 9, prompt: "首帧", first_frame: { image: "cover" } }],
        });
        const shots = loadEpisodeShots(root, "ep01");
        assert.ok(shots);
        const shotPlan = await planShotRuns({
            root,
            project,
            machine,
            shots,
            shotIds: ["01"],
            force: true,
            log: () => {},
        });
        const first = shotPlan.plans[0];
        assert.ok(first);
        assert.equal(first.uploads.length, 1);
        assert.equal(first.uploads[0]?.logical, "first_frame");
        assert.equal(first.inputs.first_frame, "image:cover");
        assert.equal(first.uploads[0]?.source.endsWith("out.png"), true);
        assert.equal(existsSync(first.uploads[0]?.source ?? ""), true);
        // stills 文件仍可读
        assert.equal(loadStills(root).stills.length, 3);
        const rel = await session.release(
            { submitted: true, interrupt: false, uploaded: [], scratch_outputs: [] },
            () => {},
        );
        assert.equal(rel.cleanup.free, "ok");
        // 参考图 / 遮罩文件存在
        assert.equal(existsSync(join(root, sourceRef.path)), true);
        assert.equal(existsSync(join(root, maskRef.path)), true);
        assert.equal(readFileSync(join(root, sourceRef.path)).byteLength > 0, true);
    } finally {
        await mock.close();
        rmSync(root, { recursive: true, force: true });
    }
});
