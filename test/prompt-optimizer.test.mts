/** 提示词优化：Agent 回退、LLM 调用与应用；遮罩 PNG 尺寸。 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initStory, saveCharacters } from "../src/core/story/store.mts";
import { addStill, initStills, loadStills } from "../src/core/story/stills.mts";
import { buildPromptContext, optimizePrompt } from "../src/core/story/prompt-optimizer.mts";
import { boxMaskPng } from "../src/core/media/png.mts";
import { imageSizeOf } from "../src/core/media/image-size.mts";
import type { MachineConfig, ProjectConfig } from "../src/core/project/types.mts";

/**
 * 创建测试项目。
 */
function setup(): string {
    const root = mkdtempSync(join(tmpdir(), "dycli-prompt-"));
    const project: ProjectConfig = { name: "提示词测试", version: 2, production: { mode: "series", audio: true } };
    writeFileSync(join(root, "project.json"), JSON.stringify(project, null, 2) + "\n");
    initStory(root, "提示词测试");
    initStills(root);
    saveCharacters(root, {
        version: 1,
        updated_at: "",
        characters: [
            {
                id: "lin",
                name: "林默",
                default_form: "base",
                appearance: "短黑发，灰色风衣",
                forms: [{ id: "base", name: "日常", description: "冷静克制", assets: [] }],
            },
        ],
    });
    return root;
}

test("提示词优化：未配置 LLM 返回 Agent 上下文", async () => {
    const root = setup();
    try {
        addStill(root, { id: "cover", owner: "character:lin", form: "base", prompt: "雨夜城市" });
        const still = loadStills(root).stills[0];
        assert.ok(still);
        assert.match(buildPromptContext(root, still), /林默/);
        const result = await optimizePrompt({ root, stillId: "cover", machine: null, apply: false });
        assert.equal(result.mode, "agent");
        assert.match(result.context ?? "", /雨夜城市/);
        await assert.rejects(
            () => optimizePrompt({ root, stillId: "cover", machine: null, apply: true }),
            /未配置本机 LLM/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("提示词优化：LLM 建议并可应用", async () => {
    const root = setup();
    // fake OpenAI 兼容服务
    const server = createServer((req, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                choices: [{ message: { content: "雨夜城市，霓虹倒影，低机位广角，电影感" } }],
            }),
        );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as AddressInfo).port;
    try {
        addStill(root, { id: "cover", owner: "character:lin", form: "base", prompt: "雨夜城市" });
        const machine: MachineConfig = {
            machine_id: "m",
            engine: { mode: "remote", url: "http://127.0.0.1:1" },
            prompt_optimizer: { base_url: `http://127.0.0.1:${port}/v1`, model: "test-model" },
        };
        const suggest = await optimizePrompt({ root, stillId: "cover", machine, apply: false });
        assert.equal(suggest.mode, "llm");
        assert.match(suggest.proposed_prompt ?? "", /霓虹/);
        // 未应用
        assert.equal(loadStills(root).stills[0]?.prompt, "雨夜城市");
        const applied = await optimizePrompt({ root, stillId: "cover", machine, apply: true });
        assert.equal(applied.applied, true);
        const updated = loadStills(root).stills[0];
        assert.equal(updated?.prompt, "雨夜城市，霓虹倒影，低机位广角，电影感");
        const last = updated?.prompt_revisions?.[updated.prompt_revisions.length - 1];
        assert.equal(last?.source, "llm");
    } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        rmSync(root, { recursive: true, force: true });
    }
});

test("遮罩：矩形 PNG 与尺寸解析", () => {
    const bytes = boxMaskPng(64, 32, { x: 8, y: 4, width: 16, height: 12 });
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes[1], 0x50);
    assert.deepEqual(imageSizeOf(bytes), { width: 64, height: 32 });
});
