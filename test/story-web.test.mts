/** Web story 模式：系列 / 剧集 API、设定资产与媒体白名单。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startWebServer } from "../src/core/web/server.mts";
import { addAsset, parseAssetOwner } from "../src/core/story/assets.mts";
import {
    approveScript,
    initStory,
    saveCharacters,
    saveEpisodeShots,
    saveScenes,
    saveVoices,
    syncScript,
} from "../src/core/story/store.mts";
import type { ProjectConfig, ShotsFile } from "../src/core/project/types.mts";
import type { StoryCharactersFile, StoryScenesFile, StoryVoicesFile } from "../src/core/story/types.mts";

// 1x1 PNG
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=",
    "base64",
);

/**
 * 创建 story Web 测试项目。
 */
function fixture(): string {
    // 临时根
    const root = mkdtempSync(join(tmpdir(), "dycli-story-web-"));
    writeFileSync(join(root, "project.json"), JSON.stringify({ name: "story-web", version: 2 }) + "\n");
    initStory(root, "story-web");
    // 剧本
    syncScript({ root, episodeId: "ep01", text: "# 第一集\n\n测试。\n", source: "ai", summary: "初稿" });
    approveScript(root, "ep01");
    // 角色 / 场景 / 音色
    const characters: StoryCharactersFile = {
        version: 1,
        updated_at: "",
        characters: [
            {
                id: "lin",
                name: "林默",
                default_form: "default",
                forms: [{ id: "default", name: "日常", assets: [] }],
                voice_ids: ["lin-voice"],
            },
        ],
    };
    saveCharacters(root, characters);
    const scenes: StoryScenesFile = {
        version: 1,
        updated_at: "",
        scenes: [{ id: "city", name: "雨夜城市", assets: [] }],
    };
    saveScenes(root, scenes);
    const voices: StoryVoicesFile = {
        version: 1,
        updated_at: "",
        voices: [
            { id: "lin-voice", character_id: "lin", name: "林默音色", mode: "text", description: "低沉", assets: [] },
        ],
    };
    saveVoices(root, voices);
    // 资产
    const image = join(root, "ref.png");
    writeFileSync(image, PNG);
    addAsset({
        root,
        owner: parseAssetOwner("character:lin", "default"),
        assetId: "front",
        from: image,
        setReference: true,
        replace: false,
    });
    return root;
}

test("web story：系列 / 剧集 / 设定资产 / 媒体", async () => {
    const root = fixture();
    const project: ProjectConfig = { name: "story-web", version: 2 };
    const handle = await startWebServer({
        root,
        project,
        machine: null,
        shots: null,
        commands: [],
        assets: { index_html: "<!doctype html>", app_js: "", style_css: "" },
    });
    try {
        // 概览
        const overview = await fetch(`${handle.url}/api/overview`);
        assert.equal(overview.status, 200);
        const overviewText = await overview.text();
        assert.equal(overviewText.includes(root), false);
        const overviewData = JSON.parse(overviewText) as {
            data: { story?: { episodes: unknown[] }; series?: { title: string } };
        };
        assert.equal(overviewData.data.story?.episodes.length, 1);
        assert.equal(overviewData.data.series?.title, "story-web");
        // 剧集
        const episodes = await fetch(`${handle.url}/api/episodes`);
        assert.equal(episodes.status, 200);
        const episodeList = (await episodes.json()) as { data: { episodes: Array<{ id: string }> } };
        assert.equal(episodeList.data.episodes[0]?.id, "ep01");
        const detail = await fetch(`${handle.url}/api/episodes/ep01`);
        assert.equal(detail.status, 200);
        const detailData = (await detail.json()) as {
            data: { episode: { id: string }; script: { content: string }; map: { episode_id: string } };
        };
        assert.equal(detailData.data.episode.id, "ep01");
        assert.match(detailData.data.script.content, /第一集/);
        assert.equal(detailData.data.map.episode_id, "ep01");
        // 生成上下文
        const mapResponse = await fetch(`${handle.url}/api/episodes/ep01/map`);
        assert.equal(mapResponse.status, 200);
        const mapData = (await mapResponse.json()) as {
            data: {
                episode_id: string;
                events: unknown[];
                generation: { readiness: { counts: { shots: number } } };
            };
        };
        assert.equal(mapData.data.episode_id, "ep01");
        assert.equal(mapData.data.events.length, 0);
        assert.equal(mapData.data.generation.readiness.counts.shots, 0);
        // legacy shots API 在 story 模式不可用
        const legacyShots = await fetch(`${handle.url}/api/shots`);
        assert.equal(legacyShots.status, 410);
        // 设定
        const characters = await fetch(`${handle.url}/api/story/characters`);
        const charactersData = (await characters.json()) as {
            data: { items: Array<{ forms: Array<{ assets: Array<{ media_url: string }> }> }> };
        };
        const mediaUrl = charactersData.data.items[0]?.forms[0]?.assets[0]?.media_url;
        assert.match(String(mediaUrl), /^\/media\/story\/characters\/lin\/default\/front\.png$/);
        // 媒体
        const media = await fetch(`${handle.url}${String(mediaUrl)}`);
        assert.equal(media.status, 200);
        assert.equal(media.headers.get("content-type"), "image/png");
        // 穿越
        const traversal = await fetch(`${handle.url}/media/story/..%2F..%2Fproject.json`);
        assert.notEqual(traversal.status, 200);
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});

test("web story：镜头卡参考图与 workflow 槽位", async () => {
    const root = fixture();
    // 场景参考图
    const sceneImage = join(root, "city.png");
    writeFileSync(sceneImage, PNG);
    addAsset({
        root,
        owner: parseAssetOwner("scene:city"),
        assetId: "establishing",
        from: sceneImage,
        setReference: true,
        replace: false,
    });
    // 分镜
    const shots: ShotsFile = {
        workflow: "t2v",
        meta: { width: 768, height: 1344, anchors: {} },
        defaults: { length: 48, steps: 20, cfg: 4, sampler_name: "euler", scheduler: "simple", negative: "" },
        shots: [
            {
                id: "01",
                seed: 1,
                prompt: "林默走进雨夜城市，霓虹映在积水上",
                characters: [{ id: "lin", form: "default" }],
                scene: "city",
            },
        ],
    };
    saveEpisodeShots(root, "ep01", shots);
    // 工作流与槽位
    const workflows = join(root, "workflows");
    mkdirSync(workflows, { recursive: true });
    writeFileSync(
        join(workflows, "t2v.json"),
        JSON.stringify({
            "10": { class_type: "LoadImage", inputs: { image: "" } },
            "20": { class_type: "LoadImage", inputs: { image: "" } },
            "30": { class_type: "EmptyLatentVideo", inputs: {} },
        }) + "\n",
    );
    writeFileSync(
        join(workflows, "t2v.bindings.json"),
        JSON.stringify({ prompt: "30.prompt", seed: "30.seed" }) + "\n",
    );
    const assetsFile = join(workflows, "t2v.assets.json");
    writeFileSync(
        assetsFile,
        JSON.stringify({
            version: 1,
            slots: [
                { name: "hero", kind: "character", asset: "reference", target: "10.image", required: true },
                { name: "scene", kind: "scene", asset: "reference", target: "20.image", required: true },
            ],
        }) + "\n",
    );
    const project: ProjectConfig = { name: "story-web", version: 2 };
    const handle = await startWebServer({
        root,
        project,
        machine: null,
        shots: null,
        commands: [],
        assets: { index_html: "<!doctype html>", app_js: "", style_css: "" },
    });
    try {
        // 已接入 workflow
        const wired = await fetch(`${handle.url}/api/episodes/ep01`);
        assert.equal(wired.status, 200);
        const wiredData = (await wired.json()) as {
            data: {
                shots: {
                    shots: Array<{
                        id: string;
                        references: Array<{
                            kind: string;
                            name: string;
                            slot: string | null;
                            target: string | null;
                            status: string;
                            asset: { media_url: string; present: boolean } | null;
                        }>;
                    }>;
                };
            };
        };
        const references = wiredData.data.shots.shots[0]?.references ?? [];
        assert.equal(references.length, 2);
        assert.equal(references[0]?.kind, "character");
        assert.equal(references[0]?.slot, "hero");
        assert.equal(references[0]?.target, "10.image");
        assert.equal(references[0]?.status, "ready");
        assert.match(String(references[0]?.asset?.media_url), /^\/media\/story\/characters\/lin\/default\/front\.png$/);
        assert.equal(references[1]?.kind, "scene");
        assert.equal(references[1]?.slot, "scene");
        assert.equal(references[1]?.target, "20.image");
        assert.match(String(references[1]?.asset?.media_url), /^\/media\/story\/scenes\/city\/establishing\.png$/);
        // 移除槽位后：有图但未接入
        rmSync(assetsFile);
        const unwired = await fetch(`${handle.url}/api/episodes/ep01`);
        const unwiredData = (await unwired.json()) as {
            data: {
                shots: {
                    shots: Array<{
                        references: Array<{ slot: string | null; status: string; asset: { present: boolean } | null }>;
                    }>;
                };
            };
        };
        const unwiredRefs = unwiredData.data.shots.shots[0]?.references ?? [];
        assert.equal(unwiredRefs.length, 2);
        assert.equal(
            unwiredRefs.every((ref) => ref.status === "unwired" && ref.slot === null),
            true,
        );
        assert.equal(
            unwiredRefs.every((ref) => ref.asset?.present === true),
            true,
        );
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});
