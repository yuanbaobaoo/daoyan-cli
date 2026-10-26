/** web 服务测试：静态页、只读 API、媒体 Range、路径穿越与优雅关闭。 */
import test from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startWebServer } from "../src/core/web/server.mts";
import { parseRange } from "../src/core/web/media.mts";

/**
 * 写 JSON 文件。
 */
function writeJson(file: string, value: unknown): void {
    writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

/**
 * 测试分镜（含人物、场景、简介、时长）。
 */
function makeShots() {
    return {
        workflow: "t2v",
        meta: {
            title: "测试片",
            synopsis: "一个关于测试的故事",
            width: 640,
            height: 360,
            fps: 24,
            anchors: { S1: "anchors/start.png" },
            characters: [
                { id: "lin", name: "林默", description: "调查员" },
                { id: "lan", name: "阿岚", description: "飞行员" },
            ],
            scenes: [{ id: "city", name: "雨夜街道", description: "霓虹与积水" }],
        },
        defaults: { steps: 20, length: 48, fps: 24 },
        style_prefix: "film",
        shots: [
            {
                id: "01",
                slug: "opening",
                title: "开场",
                summary: "林默在雨夜发现线索",
                seed: 1,
                first_frame: "S1",
                prompt: "opening shot",
                characters: ["lin"],
                scene: "city",
                length: 48,
            },
            {
                id: "02",
                seed: 2,
                first_frame: { relay: "01" },
                prompt: "second shot",
                characters: [{ name: "阿岚" }],
                scene: "city",
                length: 24,
            },
        ],
    };
}

/**
 * 创建测试项目。
 */
function createFixture(): string {
    // 临时项目根
    const root = mkdtempSync(join(tmpdir(), "dycli-web-"));
    mkdirSync(join(root, ".dycli"), { recursive: true });
    mkdirSync(join(root, "workflows"), { recursive: true });
    mkdirSync(join(root, "runs", "r_test", "outputs"), { recursive: true });
    mkdirSync(join(root, "runs", "r_test2", "outputs"), { recursive: true });
    mkdirSync(join(root, "tasks", "t_test"), { recursive: true });
    mkdirSync(join(root, "final"), { recursive: true });

    writeJson(join(root, "project.json"), {
        name: "web-test",
        version: 2,
        default_workflow: "workflows/t2v.json",
    });
    writeJson(join(root, "shots.json"), makeShots());
    writeJson(join(root, "workflows", "t2v.json"), {
        "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
        "2": { class_type: "MockSampler", inputs: { seed: 1, steps: 20 } },
    });
    writeJson(join(root, "workflows", "t2v.bindings.json"), { prompt: "2.prompt", seed: "2.seed" });

    writeJson(join(root, "runs", "r_test", "run.json"), {
        run_id: "r_test",
        task_id: "t_test",
        machine_id: "test-machine",
        request_id: "req-1",
        label: "shot:01",
        workflow: { path: "workflows/t2v.json", sha256: "workflow-sha" },
        inputs: { prompt: "opening shot", seed: 1 },
        overrides: { "2.steps": 20 },
        engine: {
            mode: "remote",
            comfyui_version: "test",
            url: "http://127.0.0.1:1",
            pid: null,
            ready_ms: null,
            cleanup: null,
        },
        status: "succeeded",
        prompt_id: "p1",
        started_at: "2026-01-01T00:00:00.000Z",
        finished_at: "2026-01-01T00:00:02.000Z",
        outputs: [
            {
                name: "clip.mp4",
                path: "outputs/clip.mp4",
                sha256: "0123456789abcdef",
                bytes: 10,
            },
        ],
        error: null,
    });
    writeFileSync(join(root, "runs", "r_test", "outputs", "clip.mp4"), "0123456789");
    writeJson(join(root, "runs", "r_test", "inputs.json"), {
        inputs: { prompt: "opening shot", seed: 1 },
        files: [{ name: "start.png", sha256: "input-sha", bytes: 3 }],
    });
    writeJson(join(root, "runs", "r_test", "workflow.json"), { "1": { class_type: "MockLoader" } });

    writeJson(join(root, "runs", "r_test2", "run.json"), {
        run_id: "r_test2",
        task_id: "t_test",
        machine_id: "test-machine",
        request_id: "req-2",
        label: "shot:01",
        workflow: { path: "workflows/t2v.json", sha256: "workflow-sha-2" },
        inputs: { prompt: "opening shot v2", seed: 11 },
        overrides: { "2.steps": 24 },
        engine: {
            mode: "remote",
            comfyui_version: "test",
            url: "http://127.0.0.1:1",
            pid: null,
            ready_ms: null,
            cleanup: null,
        },
        status: "succeeded",
        prompt_id: "p2",
        started_at: "2026-01-01T00:05:00.000Z",
        finished_at: "2026-01-01T00:05:03.000Z",
        outputs: [
            {
                name: "clip-v2.mp4",
                path: "outputs/clip-v2.mp4",
                sha256: "fedcba9876543210",
                bytes: 12,
            },
        ],
        error: null,
    });
    writeFileSync(join(root, "runs", "r_test2", "outputs", "clip-v2.mp4"), "0123456789ab");

    writeJson(join(root, "tasks", "t_test", "task.json"), {
        task_id: "t_test",
        kind: "run",
        machine_id: "test-machine",
        request_id: "req-1",
        status: "succeeded",
        mode: "remote",
        command: "run t2v",
        runs: ["r_test", "r_test2"],
        worker: null,
        created_at: "2026-01-01T00:00:00.000Z",
        started_at: "2026-01-01T00:00:00.000Z",
        finished_at: "2026-01-01T00:05:03.000Z",
        error: null,
        next_actions: [],
        options: { workflow: "t2v" },
    });
    writeFileSync(
        join(root, "tasks", "t_test", "events.jsonl"),
        `${JSON.stringify({ seq: 1, ts: "2026-01-01T00:00:00.000Z", type: "queued", data: {} })}\n` +
            `${JSON.stringify({ seq: 2, ts: "2026-01-01T00:00:01.000Z", type: "run_succeeded", data: { run_id: "r_test" } })}\n` +
            `${JSON.stringify({ seq: 3, ts: "2026-01-01T00:05:03.000Z", type: "run_succeeded", data: { run_id: "r_test2" } })}\n`,
    );

    writeFileSync(join(root, "final", "cut-20260101T000000.mp4"), "final-cut-bytes");
    writeJson(join(root, "final", "cut-20260101T000000.json"), {
        cut: "cut-20260101T000000.mp4",
        created_at: "2026-01-01T00:00:03.000Z",
        clips: [{ shot: "01", run_id: "r_test", artifact: "outputs/clip.mp4" }],
        missing: [],
        ffmpeg: { codec: "libx264" },
    });
    return root;
}

/**
 * 测试静态页与 API。
 */
test("web：静态页、只读 API、媒体 Range 与关闭", async () => {
    // 测试项目
    const root = createFixture();
    // 服务句柄
    const handle = await startWebServer({
        root,
        project: { name: "web-test", version: 2, default_workflow: "workflows/t2v.json" },
        machine: null,
        shots: makeShots(),
        assets: { index_html: "<!doctype html><title>test</title>", app_js: "console.log(1);", style_css: "body{}" },
        host: "127.0.0.1",
        port: 0,
    });
    try {
        // 本机地址与 handle.url 一致
        assert.deepEqual(handle.urls.local, [handle.url]);
        assert.deepEqual(handle.urls.network, []);
        // 静态页
        const page = await fetch(`${handle.url}/`);
        assert.equal(page.status, 200);
        assert.match(await page.text(), /test/);
        assert.match(page.headers.get("content-security-policy") ?? "", /default-src/);

        // 概览（machine 为 null，不探测引擎）
        const overview = await fetch(`${handle.url}/api/overview`);
        assert.equal(overview.status, 200);
        const overviewData = (await overview.json()) as {
            ok: boolean;
            data: Record<string, unknown>;
        };
        assert.equal(overviewData.ok, true);
        assert.equal((overviewData.data.project as Record<string, unknown>).name, "web-test");
        assert.equal(overviewData.data.mode, null);
        const overviewStoryboard = overviewData.data.storyboard as Record<string, unknown>;
        assert.equal((overviewStoryboard.summary as Record<string, unknown>).shots_total, 2);
        assert.equal((overviewStoryboard.summary as Record<string, unknown>).characters_total, 2);
        const overviewStats = overviewData.data.stats as Record<string, unknown>;
        assert.equal(overviewStats.characters_total, 2);
        assert.equal(overviewStats.scenes_total, 1);

        // 分镜
        const shots = await fetch(`${handle.url}/api/shots`);
        assert.equal(shots.status, 200);
        const shotsData = (await shots.json()) as {
            data: {
                synopsis: string;
                characters: Array<Record<string, unknown>>;
                scenes: Array<Record<string, unknown>>;
                summary: Record<string, unknown>;
                shots: Array<Record<string, unknown>>;
            };
        };
        assert.equal(shotsData.data.synopsis, "一个关于测试的故事");
        assert.equal(shotsData.data.characters.length, 2);
        assert.equal(shotsData.data.scenes.length, 1);
        assert.equal(shotsData.data.summary.shots_total, 2);
        assert.equal(shotsData.data.summary.characters_total, 2);
        assert.equal(shotsData.data.summary.scenes_total, 1);
        assert.equal(shotsData.data.summary.artifacts_total, 2);
        assert.equal(shotsData.data.summary.total_frames, 72);
        assert.equal(shotsData.data.summary.total_duration_seconds, 3);
        const firstShot = shotsData.data.shots[0] as Record<string, unknown>;
        assert.equal(firstShot.done, true);
        assert.equal(firstShot.title, "开场");
        assert.equal(firstShot.summary, "林默在雨夜发现线索");
        assert.equal((firstShot.characters as Array<Record<string, unknown>>)[0]?.name, "林默");
        assert.equal((firstShot.scene as Record<string, unknown>).name, "雨夜街道");
        assert.equal(firstShot.length, 48);
        assert.equal(firstShot.duration_seconds, 2);
        assert.equal((firstShot.artifacts as unknown[]).length, 2);
        assert.equal((firstShot.runs as unknown[]).length, 2);
        assert.equal(shotsData.data.shots[1]?.first_frame, "接力 01");
        assert.equal((shotsData.data.shots[1]?.characters as Array<Record<string, unknown>>)[0]?.name, "阿岚");

        // 产物
        const artifacts = await fetch(`${handle.url}/api/artifacts`);
        assert.equal(artifacts.status, 200);
        const artifactsData = (await artifacts.json()) as {
            data: { items: Array<Record<string, unknown>>; total: number };
        };
        assert.equal(artifactsData.data.total, 2);
        const item = artifactsData.data.items.find(
            (entry) => (entry.output as Record<string, unknown>).name === "clip.mp4",
        ) as Record<string, unknown>;
        assert.equal((item.output as Record<string, unknown>).kind, "video");
        assert.match(
            String((item.output as Record<string, unknown>).media_url),
            /^\/media\/run\/r_test\/clip\.mp4(\?|$)/,
        );

        // run 详情：不能泄露绝对路径
        const run = await fetch(`${handle.url}/api/runs/r_test`);
        assert.equal(run.status, 200);
        const runText = await run.text();
        assert.equal(runText.includes(root), false);
        assert.match(runText, /clip\.mp4/);

        // task 详情
        const task = await fetch(`${handle.url}/api/tasks/t_test`);
        assert.equal(task.status, 200);
        const taskData = (await task.json()) as {
            data: {
                runs_detail: unknown[];
                events: unknown[];
                progress: { phase: string; label: string; event_count: number; run_id: string | null };
            };
        };
        assert.equal(taskData.data.runs_detail.length, 2);
        assert.equal(taskData.data.events.length, 3);
        assert.equal(taskData.data.progress.phase, "run_succeeded");
        assert.equal(taskData.data.progress.label, "镜头成功");
        assert.equal(taskData.data.progress.event_count, 3);
        assert.equal(taskData.data.progress.run_id, "r_test2");

        // 成片与工作流
        const finals = await fetch(`${handle.url}/api/finals`);
        assert.equal(finals.status, 200);
        const finalsData = (await finals.json()) as { data: Array<Record<string, unknown>> };
        assert.equal(finalsData.data.length, 1);
        assert.equal(finalsData.data[0]?.name, "cut-20260101T000000.mp4");

        const workflows = await fetch(`${handle.url}/api/workflows`);
        assert.equal(workflows.status, 200);
        const workflowsData = (await workflows.json()) as { data: Array<Record<string, unknown>> };
        assert.equal(workflowsData.data.length, 1);
        assert.equal(workflowsData.data[0]?.default, true);

        // 媒体完整读取
        const media = await fetch(`${handle.url}/media/run/r_test/clip.mp4`);
        assert.equal(media.status, 200);
        assert.equal(await media.text(), "0123456789");
        assert.equal(media.headers.get("accept-ranges"), "bytes");

        // Range
        const partial = await fetch(`${handle.url}/media/run/r_test/clip.mp4`, {
            headers: { Range: "bytes=2-5" },
        });
        assert.equal(partial.status, 206);
        assert.equal(partial.headers.get("content-range"), "bytes 2-5/10");
        assert.equal(await partial.text(), "2345");

        // HEAD
        const head = await fetch(`${handle.url}/media/run/r_test/clip.mp4`, { method: "HEAD" });
        assert.equal(head.status, 200);
        assert.equal(await head.text(), "");

        // 路径穿越不返回文件
        const traversal = await fetch(`${handle.url}/media/run/r_test/..%2F..%2Fproject.json`);
        assert.notEqual(traversal.status, 200);
        assert.equal((await traversal.text()).includes("web-test"), false);

        // 方法限制
        const post = await fetch(`${handle.url}/api/overview`, { method: "POST" });
        assert.equal(post.status, 405);
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});

/**
 * 起服务并请求 JSON 信封。
 */
async function jsonOf(response: Response): Promise<Record<string, unknown>> {
    return (await response.json()) as Record<string, unknown>;
}

/**
 * 镜头定稿写接口默认开放（唯一的写能力）。
 */
test("web：镜头定稿写接口与写约束", async () => {
    // 测试项目
    const root = createFixture();
    // 服务
    const handle = await startWebServer({
        root,
        project: { name: "web-test", version: 2 },
        machine: null,
        shots: makeShots(),
        assets: { index_html: "<!doctype html>", app_js: "", style_css: "" },
        host: "127.0.0.1",
        port: 0,
    });
    try {
        // 定稿前没有台账
        assert.equal(existsSync(join(root, "takes.json")), false);
        // 非 JSON 内容类型
        const wrongType = await fetch(`${handle.url}/api/takes/finalize`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: "shot=01",
        });
        assert.equal(wrongType.status, 415);
        // 跨源请求
        const crossOrigin = await fetch(`${handle.url}/api/takes/finalize`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "http://evil.example" },
            body: JSON.stringify({ shot_id: "01", run_id: "r_test" }),
        });
        assert.equal(crossOrigin.status, 403);
        // POST 只用于镜头定稿路径
        assert.equal(
            (
                await fetch(`${handle.url}/api/takes/nope`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                })
            ).status,
            405,
        );
        // 非 GET/HEAD/POST 仍拒绝
        assert.equal((await fetch(`${handle.url}/api/overview`, { method: "PUT" })).status, 405);
        // 缺少 run_id
        assert.equal(
            (
                await fetch(`${handle.url}/api/takes/finalize`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ shot_id: "01" }),
                })
            ).status,
            400,
        );
        // 不存在的 run
        assert.equal(
            (
                await fetch(`${handle.url}/api/takes/finalize`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ shot_id: "01", run_id: "r_ghost" }),
                })
            ).status,
            404,
        );
        // 不属于本镜的 run（label 是 shot:02）
        const wrongShot = await fetch(`${handle.url}/api/takes/finalize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shot_id: "02", run_id: "r_test" }),
        });
        assert.equal(wrongShot.status, 400);
        // 定稿较早的一条产出
        const done = await fetch(`${handle.url}/api/takes/finalize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shot_id: "01", run_id: "r_test", output: "clip.mp4", note: "就用这版" }),
        });
        assert.equal(done.status, 200);
        // 响应体
        const doneData = (await jsonOf(done)).data as Record<string, unknown>;
        assert.equal(doneData.changed, true);
        assert.equal(doneData.output, "clip.mp4");
        assert.equal(doneData.takes_file, "takes.json");
        assert.equal(existsSync(join(root, "takes.json")), true);
        // 分镜 DTO 反映定稿
        const shotsData = (await jsonOf(await fetch(`${handle.url}/api/shots`))).data as Record<string, unknown>;
        // 镜头列表
        const items = shotsData.shots as Array<Record<string, unknown>>;
        assert.equal(items[0]?.finalized_run, "r_test");
        assert.equal(items[0]?.finalized_output, "clip.mp4");
        assert.equal(items[0]?.take_source, "finalized");
        assert.equal(items[1]?.take_source, "none");
        assert.equal((shotsData.summary as Record<string, unknown>).shots_finalized, 1);
        // 产物行标记
        const marked = (items[0]?.artifacts as Array<Record<string, unknown>>).filter((a) => a.finalized === true);
        assert.equal(marked.length, 1);
        assert.equal((marked[0]?.output as Record<string, unknown>).name, "clip.mp4");
        // 撤销定稿
        const revoked = await fetch(`${handle.url}/api/takes/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shot_id: "01" }),
        });
        assert.equal(revoked.status, 200);
        assert.equal(((await jsonOf(revoked)).data as Record<string, unknown>).changed, true);
        // 撤销后回到未定稿
        const afterData = (await jsonOf(await fetch(`${handle.url}/api/shots`))).data as Record<string, unknown>;
        assert.equal((afterData.shots as Array<Record<string, unknown>>)[0]?.finalized_run, null);
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});

/**
 * 概览不泄露本机绝对路径。
 */
test("web：概览不泄露本机绝对路径", async () => {
    // 测试项目
    const root = createFixture();
    // 服务句柄（local 模式带 modelpath）
    const handle = await startWebServer({
        root,
        project: { name: "web-test", version: 2, default_workflow: "workflows/t2v.json" },
        machine: {
            machine_id: "test-machine",
            engine: { mode: "local", port: 1, modelpath: "/tmp/dycli-secret-models" },
        },
        shots: makeShots(),
        assets: { index_html: "<!doctype html>", app_js: "", style_css: "" },
        host: "127.0.0.1",
        port: 0,
    });
    try {
        const response = await fetch(`${handle.url}/api/overview`);
        const text = await response.text();
        assert.equal(response.status, 200);
        assert.equal(text.includes(root), false);
        assert.equal(text.includes("/tmp/dycli-secret-models"), false);
        assert.match(text, /"mode":"local"/);
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});

/**
 * Range 解析边界。
 */
test("web：Range 解析边界", () => {
    assert.deepEqual(parseRange(undefined, 10), { kind: "none" });
    assert.deepEqual(parseRange("bytes=2-5", 10), { kind: "ok", start: 2, end: 5 });
    assert.deepEqual(parseRange("bytes=2-", 10), { kind: "ok", start: 2, end: 9 });
    assert.deepEqual(parseRange("bytes=-3", 10), { kind: "ok", start: 7, end: 9 });
    assert.deepEqual(parseRange("bytes=0-99", 10), { kind: "ok", start: 0, end: 9 });
    assert.equal(parseRange("bytes=10-", 10).kind, "invalid");
    assert.equal(parseRange("bytes=5-2", 10).kind, "invalid");
    assert.equal(parseRange("bytes=0-1,3-4", 10).kind, "none");
});

/**
 * 轮询等待条件成立。
 */
async function waitFor(condition: () => Promise<boolean>, timeoutMs = 5_000): Promise<void> {
    // 截止时间
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await condition()) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("等待条件超时");
}

test("web：项目变更免重启生效，并通过 SSE 推送", async () => {
    // 测试项目
    const root = createFixture();
    // 服务
    const handle = await startWebServer({
        root,
        project: { name: "web-test", version: 2 },
        machine: null,
        shots: makeShots(),
        assets: { index_html: "<!doctype html>", app_js: "", style_css: "" },
        host: "127.0.0.1",
        port: 0,
    });
    // SSE 中止控制器
    const abort = new AbortController();
    try {
        // 订阅变更
        const sse = await fetch(`${handle.url}/api/events`, { signal: abort.signal });
        assert.equal(sse.status, 200);
        assert.match(String(sse.headers.get("content-type")), /text\/event-stream/);
        const reader = sse.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        const readyDeadline = Date.now() + 3_000;
        while (!text.includes("event: ready") && Date.now() < readyDeadline) {
            const chunk = await reader.read();
            if (chunk.done) break;
            text += decoder.decode(chunk.value, { stream: true });
        }
        assert.match(text, /event: ready/);
        // 项目名变更（不重启）
        writeJson(join(root, "project.json"), { name: "web-test-live", version: 2 });
        await waitFor(async () => {
            const payload = (await (await fetch(`${handle.url}/api/health`)).json()) as {
                data: { project: string };
            };
            return payload.data.project === "web-test-live";
        });
        // 分镜变更（不重启）
        const nextShots = makeShots();
        nextShots.shots[0].prompt = "hot reload prompt";
        writeJson(join(root, "shots.json"), nextShots);
        await waitFor(async () => {
            const payload = (await (await fetch(`${handle.url}/api/shots`)).json()) as {
                data: { shots: Array<{ prompt: string }> };
            };
            return payload.data.shots[0]?.prompt === "hot reload prompt";
        });
        // SSE 推送 revision
        text = "";
        const deadline = Date.now() + 5_000;
        while (!text.includes("event: revision") && Date.now() < deadline) {
            const chunk = await reader.read();
            if (chunk.done) break;
            text += decoder.decode(chunk.value, { stream: true });
        }
        assert.match(text, /event: revision/);
        // revision 接口递增
        const revision = (await (await fetch(`${handle.url}/api/revision`)).json()) as {
            data: { revision: number };
        };
        assert.ok(revision.data.revision > 0);
        // 任务事件写入后实时可见
        const taskFile = join(root, "tasks", "t_test", "task.json");
        const taskRecord = JSON.parse(readFileSync(taskFile, "utf8")) as Record<string, unknown>;
        writeJson(taskFile, { ...taskRecord, status: "running", finished_at: null });
        appendFileSync(
            join(root, "tasks", "t_test", "events.jsonl"),
            `${JSON.stringify({
                seq: 4,
                ts: new Date().toISOString(),
                type: "progress",
                data: { run_id: "r_test2", elapsed_ms: 1000 },
            })}\n`,
        );
        await waitFor(async () => {
            const next = (await (await fetch(`${handle.url}/api/revision`)).json()) as {
                data: { revision: number };
            };
            return next.data.revision > revision.data.revision;
        });
        await waitFor(async () => {
            const payload = (await (await fetch(`${handle.url}/api/tasks`)).json()) as {
                data: {
                    items: Array<{
                        task_id: string;
                        active: boolean;
                        progress: { label: string; event_count: number };
                    }>;
                };
            };
            const item = payload.data.items.find((entry) => entry.task_id === "t_test");
            return item?.active === true && item.progress.label === "生成中" && item.progress.event_count === 4;
        });
        await reader.cancel().catch(() => undefined);
    } finally {
        abort.abort();
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});

test("web：镜头生成 / 重新生成接口", async () => {
    // 测试项目
    const root = createFixture();
    // 本机配置
    writeJson(join(root, ".dycli", "machine.json"), {
        machine_id: "test-machine",
        engine: { mode: "remote", url: "http://127.0.0.1:9" },
    });
    // 捕获的任务参数
    let captured: Record<string, unknown> | null = null;
    // 服务（注入任务启动器，避免真的 spawn worker）
    const handle = await startWebServer({
        root,
        project: { name: "web-test", version: 2, default_workflow: "workflows/t2v.json" },
        machine: null,
        shots: makeShots(),
        assets: { index_html: "<!doctype html>", app_js: "", style_css: "" },
        host: "127.0.0.1",
        port: 0,
        taskStarter: async (opts) => {
            captured = opts as unknown as Record<string, unknown>;
            return { task_id: "t_web", status: "queued", deduplicated: false };
        },
    });
    try {
        // 重新生成
        const regenerate = await fetch(`${handle.url}/api/shots/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shot_id: "01", regenerate: true }),
        });
        assert.equal(regenerate.status, 202);
        const regenerateData = (await regenerate.json()) as {
            data: { task_id: string; kind: string; shot_id: string };
        };
        assert.equal(regenerateData.data.task_id, "t_web");
        assert.equal(regenerateData.data.kind, "retake");
        assert.equal(regenerateData.data.shot_id, "01");
        assert.equal(captured?.kind, "retake");
        assert.deepEqual((captured?.options as Record<string, unknown>).shots, ["01"]);
        assert.equal((captured?.options as Record<string, unknown>).force, true);
        assert.equal(captured?.episodeId, null);
        // 首次生成
        captured = null;
        const generate = await fetch(`${handle.url}/api/shots/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shot_id: "02" }),
        });
        assert.equal(generate.status, 202);
        assert.equal(captured?.kind, "shot");
        assert.equal((captured?.options as Record<string, unknown>).force, false);
        // 非法镜号
        const unknown = await fetch(`${handle.url}/api/shots/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shot_id: "99" }),
        });
        assert.equal(unknown.status, 400);
        // 跨源写请求
        const crossOrigin = await fetch(`${handle.url}/api/shots/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "http://evil.example" },
            body: JSON.stringify({ shot_id: "01" }),
        });
        assert.equal(crossOrigin.status, 403);
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});
