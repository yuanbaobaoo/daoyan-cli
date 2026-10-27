/** Web story 模式：系列 / 剧集 API、设定资产与媒体白名单。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startWebServer } from "../src/core/web/server.mts";
import { addAsset, parseAssetOwner } from "../src/core/story/assets.mts";
import {
    addEpisode,
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
    addAsset({
        root,
        owner: parseAssetOwner("character:lin", "default"),
        assetId: "pose",
        from: image,
        setReference: false,
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
        // 旧 /api/shots 已移除
        const legacyShots = await fetch(`${handle.url}/api/shots`);
        assert.equal(legacyShots.status, 404);
        // 设定
        const characters = await fetch(`${handle.url}/api/story/characters`);
        const charactersData = (await characters.json()) as {
            data: {
                items: Array<{
                    forms: Array<{ reference_asset: string | null; assets: Array<{ id: string; media_url: string }> }>;
                }>;
            };
        };
        const formView = charactersData.data.items[0]?.forms[0];
        assert.equal(formView?.reference_asset, "front");
        const mediaUrl = charactersData.data.items[0]?.forms[0]?.assets[0]?.media_url;
        assert.match(String(mediaUrl), /^\/media\/story\/characters\/lin\/default\/front\.png(\?|$)/);
        // 媒体
        const media = await fetch(`${handle.url}${String(mediaUrl)}`);
        assert.equal(media.status, 200);
        assert.equal(media.headers.get("content-type"), "image/png");
        // 可重验证：同名图片替换后浏览器会重新校验
        assert.match(String(media.headers.get("cache-control")), /no-cache/);
        const etag = media.headers.get("etag");
        assert.ok(etag);
        const revalidated = await fetch(`${handle.url}${String(mediaUrl)}`, {
            headers: { "If-None-Match": String(etag) },
        });
        assert.equal(revalidated.status, 304);
        // 切换角色形态主参考
        const setReference = await fetch(`${handle.url}/api/story/reference`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character_id: "lin", form: "default", asset_id: "pose" }),
        });
        assert.equal(setReference.status, 200);
        assert.equal(
            ((await setReference.json()) as { data: { reference_asset: string } }).data.reference_asset,
            "pose",
        );
        const switched = (await (await fetch(`${handle.url}/api/story/characters`)).json()) as {
            data: { items: Array<{ forms: Array<{ reference_asset: string | null }> }> };
        };
        assert.equal(switched.data.items[0]?.forms[0]?.reference_asset, "pose");
        // 未知资产 / 跨源拒绝
        const unknownReference = await fetch(`${handle.url}/api/story/reference`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character_id: "lin", form: "default", asset_id: "missing" }),
        });
        assert.equal(unknownReference.status, 404);
        const crossOriginReference = await fetch(`${handle.url}/api/story/reference`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "http://evil.example" },
            body: JSON.stringify({ character_id: "lin", form: "default", asset_id: "front" }),
        });
        assert.equal(crossOriginReference.status, 403);
        // 项目设置
        const projectInfo = await fetch(`${handle.url}/api/project`);
        assert.equal(projectInfo.status, 200);
        const projectData = (await projectInfo.json()) as {
            data: { mode: string; audio: boolean; episode_count: number };
        };
        assert.equal(projectData.data.mode, "series");
        assert.equal(projectData.data.audio, true);
        assert.equal(projectData.data.episode_count, 1);
        // 关闭音频
        const audioOff = await fetch(`${handle.url}/api/project/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: false }),
        });
        assert.equal(audioOff.status, 200);
        assert.equal(((await audioOff.json()) as { data: { audio: boolean } }).data.audio, false);
        // 一集时可切单视频
        const single = await fetch(`${handle.url}/api/project/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "single" }),
        });
        assert.equal(single.status, 200);
        assert.equal(((await single.json()) as { data: { mode: string } }).data.mode, "single");
        // 多集时禁止切单视频
        addEpisode(root, { id: "ep02", number: 2, title: "第二集" });
        const conflict = await fetch(`${handle.url}/api/project/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "single" }),
        });
        assert.equal(conflict.status, 409);
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
        assert.match(
            String(references[0]?.asset?.media_url),
            /^\/media\/story\/characters\/lin\/default\/front\.png(\?|$)/,
        );
        assert.equal(references[1]?.kind, "scene");
        assert.equal(references[1]?.slot, "scene");
        assert.equal(references[1]?.target, "20.image");
        assert.match(String(references[1]?.asset?.media_url), /^\/media\/story\/scenes\/city\/establishing\.png(\?|$)/);
        // 合片候选：尚无定稿
        const candidates = await fetch(`${handle.url}/api/finals/candidates?episode=ep01`);
        assert.equal(candidates.status, 200);
        const candidatesData = (await candidates.json()) as {
            data: { episode_id: string; shots: Array<{ id: string; finalized: boolean }> };
        };
        assert.equal(candidatesData.data.episode_id, "ep01");
        assert.equal(candidatesData.data.shots.length, 1);
        assert.equal(candidatesData.data.shots[0]?.finalized, false);
        // 合片至少 2 镜
        const tooFew = await fetch(`${handle.url}/api/finals/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ episode_id: "ep01", shots: ["01"] }),
        });
        assert.equal(tooFew.status, 400);
        // 产物删除：run 不存在
        const missingOutput = await fetch(`${handle.url}/api/runs/outputs/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ run_id: "missing-run", output: "01.mp4" }),
        });
        assert.equal(missingOutput.status, 404);
        // 角色有两张图：删除主参考并自动切换
        const removedFront = await fetch(`${handle.url}/api/story/assets/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owner_kind: "character", owner_id: "lin", form: "default", asset_id: "front" }),
        });
        assert.equal(removedFront.status, 200);
        assert.equal(
            ((await removedFront.json()) as { data: { reference_asset: string | null } }).data.reference_asset,
            "pose",
        );
        // 仅剩一张且仍被分镜引用：拒绝删空
        const guardedLast = await fetch(`${handle.url}/api/story/assets/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owner_kind: "character", owner_id: "lin", form: "default", asset_id: "pose" }),
        });
        assert.equal(guardedLast.status, 400);
        // 场景唯一图：拒绝
        const guardedScene = await fetch(`${handle.url}/api/story/assets/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owner_kind: "scene", owner_id: "city", asset_id: "establishing" }),
        });
        assert.equal(guardedScene.status, 400);
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

test("web story：确认剧本", async () => {
    const root = fixture();
    // 改回待确认
    const scriptFile = join(root, "episodes", "ep01", "script.json");
    const meta = JSON.parse(readFileSync(scriptFile, "utf8")) as Record<string, unknown>;
    writeFileSync(scriptFile, JSON.stringify({ ...meta, status: "draft", approved_at: null }, null, 2) + "\n");
    const project: ProjectConfig = { name: "story-web", version: 2 };
    const handle = await startWebServer({
        root,
        project,
        machine: null,
        commands: [],
        assets: { index_html: "<!doctype html>", app_js: "", style_css: "" },
    });
    try {
        // 跨源拒绝
        const crossOrigin = await fetch(`${handle.url}/api/script/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "http://evil.example" },
            body: JSON.stringify({ episode_id: "ep01" }),
        });
        assert.equal(crossOrigin.status, 403);
        // 确认
        const approved = await fetch(`${handle.url}/api/script/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ episode_id: "ep01" }),
        });
        assert.equal(approved.status, 200);
        const approvedData = (await approved.json()) as { data: { script: { status: string; approved_at: string } } };
        assert.equal(approvedData.data.script.status, "approved");
        assert.equal(typeof approvedData.data.script.approved_at, "string");
        // 剧集视图同步
        const detail = await fetch(`${handle.url}/api/episodes/ep01`);
        const detailData = (await detail.json()) as { data: { script: { meta: { status: string } } } };
        assert.equal(detailData.data.script.meta.status, "approved");
    } finally {
        await handle.close();
        rmSync(root, { recursive: true, force: true });
    }
});
