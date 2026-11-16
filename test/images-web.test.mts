/** Web 图片页数据与媒体：/api/images、图片库媒体、绝对路径不泄漏。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startWebServer, type WebTaskStartOptions } from "../src/core/web/server.mts";
import { initStory, loadCharacters, saveCharacters, saveScenes } from "../src/core/story/store.mts";
import { addStill, addStillRef, initStills, loadStills } from "../src/core/story/stills.mts";
import type { ProjectConfig } from "../src/core/project/types.mts";

// 1x1 PNG
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=",
    "base64",
);

/**
 * 写 JSON 文件。
 */
function writeJson(file: string, value: unknown): void {
    writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

/**
 * 创建图片 Web 测试项目。
 */
function createFixture(): string {
    // 临时目录
    const root = mkdtempSync(join(tmpdir(), "dycli-images-web-"));
    mkdirSync(join(root, "workflows"), { recursive: true });
    // 项目配置
    const project: ProjectConfig = {
        name: "图片 Web",
        version: 2,
        production: { mode: "series", audio: true },
        image: { ops: { t2i: { workflow: "workflows/image-t2i.json" } } },
    };
    writeJson(join(root, "project.json"), project);
    initStory(root, "图片 Web");
    initStills(root);
    saveCharacters(root, {
        version: 1,
        updated_at: "",
        characters: [
            {
                id: "lin",
                name: "林默",
                default_form: "base",
                forms: [{ id: "base", name: "基础", assets: [] }],
            },
        ],
    });
    saveScenes(root, { version: 1, updated_at: "", scenes: [{ id: "city", name: "雨夜城市", assets: [] }] });
    writeJson(join(root, "workflows", "image-t2i.json"), { "1": { class_type: "Mock", inputs: {} } });
    writeJson(join(root, "workflows", "image-t2i.bindings.json"), { prompt: "1.prompt", seed: "1.seed" });
    // 图片库 + 图片单元
    const file = join(root, "mood.png");
    writeFileSync(file, PNG);
    const ref = addStillRef({ root, file, id: "mood-01", role: "reference", title: "氛围参考" });
    addStill(root, {
        id: "lin-base-front",
        owner: "character:lin",
        form: "base",
        set: "character-sheet",
        prompt: "正面全身，白底",
        seed: 42,
        width: 1024,
        height: 1024,
        source: `ref:${ref.id}`,
    });
    return root;
}

test("web 图片页：/api/images 与图片库媒体", async () => {
    const root = createFixture();
    const handle = await startWebServer({
        root,
        project: {
            name: "图片 Web",
            version: 2,
            production: { mode: "series", audio: true },
            image: { ops: { t2i: { workflow: "workflows/image-t2i.json" } } },
        },
        machine: null,
        assets: { index_html: "<!doctype html><title>images</title>", app_js: "", style_css: "" },
        host: "127.0.0.1",
        port: 0,
    });
    try {
        const response = await fetch(`${handle.url}/api/images`);
        assert.equal(response.status, 200);
        const text = await response.text();
        assert.equal(text.includes(root), false);
        const payload = JSON.parse(text) as {
            ok: boolean;
            data: {
                stills: Array<Record<string, unknown>>;
                refs: Array<Record<string, unknown>>;
                sets: Array<Record<string, unknown>>;
                ops: Array<Record<string, unknown>>;
                summary: Record<string, unknown>;
            };
        };
        assert.equal(payload.ok, true);
        assert.equal(payload.data.stills.length, 1);
        const still = payload.data.stills[0] as Record<string, unknown>;
        assert.equal(still.prompt, "正面全身，白底");
        assert.equal((still.owner as Record<string, unknown>).name, "林默");
        assert.equal((still.source as Record<string, unknown>).present, true);
        assert.match(
            String((still.source as Record<string, unknown>).media_url),
            /^\/media\/stills\/refs\/mood-01\.png/,
        );
        assert.equal(payload.data.refs.length, 1);
        assert.equal((payload.data.ops[0] as Record<string, unknown>).ready, true);
        assert.equal(payload.data.sets[0]?.id, "character-sheet");

        // 图片库媒体
        const media = await fetch(`${handle.url}/media/stills/refs/mood-01.png`);
        assert.equal(media.status, 200);
        assert.equal(media.headers.get("content-type"), "image/png");
        const bytes = new Uint8Array(await media.arrayBuffer());
        assert.equal(bytes.byteLength, PNG.byteLength);

        // 路径穿越被拒绝
        const traversal = await fetch(`${handle.url}/media/stills/../project.json`);
        assert.notEqual(traversal.status, 200);
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});

test("web 图片写接口：生成 / 定稿 / 提示词 / 遮罩 / 入库", async () => {
    const root = createFixture();
    // 已成功的图片 run
    mkdirSync(join(root, "runs", "r_img", "outputs"), { recursive: true });
    writeFileSync(join(root, "runs", "r_img", "outputs", "out.png"), PNG);
    writeJson(join(root, "runs", "r_img", "run.json"), {
        run_id: "r_img",
        task_id: "t_old",
        machine_id: "image-machine",
        request_id: null,
        episode_id: null,
        label: "img:lin-base-front",
        op: "t2i",
        workflow: { path: "workflows/image-t2i.json", sha256: "workflow-sha" },
        inputs: { prompt: "正面全身，白底", seed: 42 },
        overrides: {},
        engine: {
            mode: "remote",
            comfyui_version: "mock",
            url: "http://127.0.0.1:1",
            pid: null,
            ready_ms: null,
            cleanup: null,
        },
        status: "succeeded",
        prompt_id: "p_img",
        started_at: "2026-01-01T00:00:00.000Z",
        finished_at: "2026-01-01T00:00:01.000Z",
        outputs: [{ name: "out.png", path: "outputs/out.png", sha256: "img-sha", bytes: PNG.byteLength }],
        error: null,
    });
    const started: WebTaskStartOptions[] = [];
    const handle = await startWebServer({
        root,
        project: {
            name: "图片 Web",
            version: 2,
            production: { mode: "series", audio: true },
            image: { ops: { t2i: { workflow: "workflows/image-t2i.json" } } },
        },
        machine: {
            machine_id: "image-machine",
            engine: { mode: "remote", url: "http://127.0.0.1:1" },
        },
        assets: { index_html: "<!doctype html><title>images</title>", app_js: "", style_css: "" },
        host: "127.0.0.1",
        port: 0,
        taskStarter: async (opts) => {
            started.push(opts);
            return { task_id: "t_img", status: "queued", deduplicated: false };
        },
    });
    try {
        // POST 辅助
        const post = (path: string, body: unknown): Promise<Response> =>
            fetch(`${handle.url}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        // 生成
        const gen = await post("/api/images/lin-base-front/generate", { op: "t2i" });
        assert.equal(gen.status, 202);
        assert.equal(started[0]?.kind, "image");
        assert.deepEqual(started[0]?.options.stills, ["lin-base-front"]);
        assert.equal(started[0]?.options.op, "t2i");
        // 未配置的操作被拒绝
        assert.equal((await post("/api/images/lin-base-front/generate", { op: "inpaint" })).status, 400);
        // 定稿
        const fin = await post("/api/images/lin-base-front/take/finalize", {
            run_id: "r_img",
            output: "out.png",
        });
        assert.equal(fin.status, 200);
        const finData = (await fin.json()) as { data: { take: { output: string } } };
        assert.equal(finData.data.take.output, "out.png");
        // 提示词
        const prompt = await post("/api/images/lin-base-front/prompt", { text: "正面全身，纯白背景" });
        assert.equal(prompt.status, 200);
        const promptData = (await prompt.json()) as {
            data: { still: { prompt: string; prompt_revisions: Array<{ source: string }> } };
        };
        assert.equal(promptData.data.still.prompt, "正面全身，纯白背景");
        assert.equal(promptData.data.still.prompt_revisions.at(-1)?.source, "user");
        // 未配置 LLM：返回 Agent 上下文
        const opt = await post("/api/images/lin-base-front/prompt/optimize", {});
        assert.equal(opt.status, 200);
        const optData = (await opt.json()) as { data: { mode: string; context: string } };
        assert.equal(optData.data.mode, "agent");
        assert.match(optData.data.context, /正面全身/);
        // 遮罩
        const mask = await post("/api/images/lin-base-front/mask", {
            data_url: `data:image/png;base64,${Buffer.from(PNG).toString("base64")}`,
        });
        assert.equal(mask.status, 200);
        const maskData = (await mask.json()) as { data: { ref: { role: string; id: string } } };
        assert.equal(maskData.data.ref.role, "mask");
        assert.equal(loadStills(root).stills[0]?.mask, `ref:${maskData.data.ref.id}`);
        // 入库
        const promote = await post("/api/images/lin-base-front/promote", {
            asset_id: "front",
            set_reference: true,
        });
        assert.equal(promote.status, 200);
        const form = loadCharacters(root).characters[0]?.forms[0];
        assert.equal(form?.reference_asset, "front");
        assert.equal(
            form?.assets.some((asset) => asset.id === "front"),
            true,
        );
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});
