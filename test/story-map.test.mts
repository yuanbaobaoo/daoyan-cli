/** 剧情图谱：事实推导、生成上下文、缺口、标注合并与骨架生成。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planWorkflowAssets, resolveWorkflowAssets } from "../src/core/story/workflow-assets.mts";
import { buildStoryMap, materializeStoryMap, normalizeStoryMapDoc, storyMapSource } from "../src/core/story/map.mts";
import { addAsset, parseAssetOwner } from "../src/core/story/assets.mts";
import {
    approveScript,
    initStory,
    loadCharacters,
    loadEpisodeShots,
    loadScenes,
    loadScriptMeta,
    saveBreakdown,
    saveCharacters,
    saveEpisodeShots,
    saveScenes,
    saveStoryMap,
    saveVoices,
    syncScript,
} from "../src/core/story/store.mts";
import type { ProjectConfig, ShotsFile } from "../src/core/project/types.mts";
import type {
    BreakdownFile,
    StoryCharactersFile,
    StoryMapFile,
    StoryScenesFile,
    StoryVoicesFile,
} from "../src/core/story/types.mts";

// 1x1 PNG
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=",
    "base64",
);
// 最小 WAV
const WAV = (() => {
    // 采样数据
    const data = Buffer.alloc(3_200);
    // 头
    const head = Buffer.alloc(44);
    head.write("RIFF", 0, "ascii");
    head.writeUInt32LE(36 + data.length, 4);
    head.write("WAVEfmt ", 8, "ascii");
    head.writeUInt32LE(16, 16);
    head.writeUInt16LE(1, 20);
    head.writeUInt16LE(1, 22);
    head.writeUInt32LE(16_000, 24);
    head.writeUInt32LE(32_000, 28);
    head.writeUInt16LE(2, 32);
    head.writeUInt16LE(16, 34);
    head.write("data", 36, "ascii");
    head.writeUInt32LE(data.length, 40);
    return Buffer.concat([head, data]);
})();

/**
 * 创建测试项目。
 */
function setup(): string {
    // 临时目录
    const root = mkdtempSync(join(tmpdir(), "dycli-story-map-"));
    writeFileSync(
        join(root, "project.json"),
        JSON.stringify({ name: "图谱测试", version: 2, default_workflow: "t2v" }) + "\n",
    );
    initStory(root, "图谱测试");
    return root;
}

/**
 * 写测试素材。
 */
function writeSources(root: string): { image: string; audio: string } {
    // 图片
    const image = join(root, "ref.png");
    writeFileSync(image, PNG);
    // 音频
    const audio = join(root, "ref.wav");
    writeFileSync(audio, WAV);
    return { image, audio };
}

/**
 * 写工作流。
 */
function writeWorkflow(root: string, name: string, slots: unknown[]): void {
    writeFileSync(
        join(root, "workflows", `${name}.json`),
        JSON.stringify({
            "5": { class_type: "CLIPTextEncode", inputs: { text: "" } },
            "7": { class_type: "KSampler", inputs: { seed: 1 } },
            "10": { class_type: "LoadImage", inputs: { image: "x.png" } },
            "20": { class_type: "LoadImage", inputs: { image: "x.png" } },
        }) + "\n",
    );
    writeFileSync(
        join(root, "workflows", `${name}.bindings.json`),
        JSON.stringify({ prompt: "5.text", seed: "7.seed" }) + "\n",
    );
    if (slots.length > 0) {
        writeFileSync(join(root, "workflows", `${name}.assets.json`), JSON.stringify({ version: 1, slots }) + "\n");
    }
}

/**
 * 建立完整剧集。
 */
function buildEpisode(root: string): void {
    // 剧本
    const script = syncScript({
        root,
        episodeId: "ep01",
        text: "# 第一集\n\n林默在雨夜发现一封信。\n",
        source: "ai",
        summary: "初稿",
    });
    approveScript(root, "ep01");
    // 角色
    const characters: StoryCharactersFile = {
        version: 1,
        updated_at: "",
        characters: [
            {
                id: "lin-mo",
                name: "林默",
                default_form: "default",
                forms: [
                    { id: "default", name: "日常", assets: [] },
                    { id: "night", name: "夜行", assets: [] },
                ],
                voice_ids: ["lin-voice"],
            },
            {
                id: "a-lan",
                name: "阿岚",
                default_form: "default",
                forms: [{ id: "default", name: "日常", assets: [] }],
            },
        ],
    };
    saveCharacters(root, characters);
    // 场景
    const scenes: StoryScenesFile = {
        version: 1,
        updated_at: "",
        scenes: [{ id: "rain-city", name: "雨夜城市", time_of_day: "night", assets: [] }],
    };
    saveScenes(root, scenes);
    // 音色
    const voices: StoryVoicesFile = {
        version: 1,
        updated_at: "",
        voices: [
            {
                id: "lin-voice",
                character_id: "lin-mo",
                name: "林默音色",
                mode: "reference",
                assets: [],
            },
        ],
    };
    saveVoices(root, voices);
    // 资产
    const sources = writeSources(root);
    addAsset({
        root,
        owner: parseAssetOwner("character:lin-mo", "default"),
        assetId: "front",
        from: sources.image,
        setReference: true,
        replace: false,
    });
    addAsset({
        root,
        owner: parseAssetOwner("character:lin-mo", "night"),
        assetId: "front",
        from: sources.image,
        setReference: true,
        replace: false,
    });
    addAsset({
        root,
        owner: parseAssetOwner("character:a-lan", "default"),
        assetId: "front",
        from: sources.image,
        setReference: true,
        replace: false,
    });
    addAsset({
        root,
        owner: parseAssetOwner("scene:rain-city"),
        assetId: "establishing",
        from: sources.image,
        setReference: true,
        replace: false,
    });
    addAsset({
        root,
        owner: parseAssetOwner("voice:lin-voice"),
        assetId: "sample",
        from: sources.audio,
        setReference: true,
        replace: false,
    });
    // 拆解
    const breakdown: BreakdownFile = {
        version: 1,
        episode_id: "ep01",
        source_revision: script.meta.revision,
        source_sha256: script.meta.sha256,
        beats: [{ id: "b1", summary: "发现信" }],
        characters: [
            { id: "lin-mo", forms: ["default", "night"] },
            { id: "a-lan", forms: ["default"] },
        ],
        scenes: ["rain-city"],
        voices: ["lin-voice"],
    };
    saveBreakdown(root, "ep01", breakdown);
    // 工作流
    writeWorkflow(root, "i2v", [
        { name: "hero", kind: "character", asset: "reference", target: "10.image", required: true },
        { name: "scene", kind: "scene", asset: "reference", target: "20.image", required: true },
    ]);
    writeWorkflow(root, "t2v", []);
    // 分镜
    const shots: ShotsFile = {
        workflow: "t2v",
        meta: {
            episode_id: "ep01",
            title: "第一集",
            script_revision: script.meta.revision,
            script_sha256: script.meta.sha256,
            width: 768,
            height: 1344,
            fps: 24,
            anchors: {},
        },
        defaults: { length: 48, steps: 30, cfg: 4 },
        shots: [
            {
                id: "01",
                title: "雨夜来信",
                summary: "林默发现信",
                script_refs: ["b1"],
                characters: [{ id: "lin-mo", form: "night" }],
                scene: "rain-city",
                dialogue: [{ character: "lin-mo", text: "这不是写给我的。", voice: "lin-voice" }],
                workflow: "i2v",
                seed: 1101,
                length: 48,
                prompt: "雨夜电话亭，林默发现信",
            },
            {
                id: "02",
                title: "阿岚出现",
                summary: "阿岚赶来",
                characters: [
                    { id: "lin-mo", form: "night" },
                    { id: "a-lan", form: "default" },
                ],
                scene: "rain-city",
                dialogue: [{ character: "lin-mo", text: "你来晚了。", voice: "lin-voice" }],
                workflow: "i2v",
                first_frame: { relay: "01" },
                seed: 1102,
                length: 48,
                prompt: "两人在雨夜碰面",
            },
            {
                id: "03",
                title: "空镜",
                summary: "雨落空街",
                characters: [{ id: "a-lan", form: "default" }],
                scene: "rain-city",
                seed: 1103,
                length: 48,
                prompt: "雨夜空街",
            },
        ],
    };
    saveEpisodeShots(root, "ep01", shots);
}

/**
 * 写标注。
 */
function writeAnnotations(root: string): void {
    // 剧本
    const script = loadScriptMeta(root, "ep01");
    // 标注
    const doc: StoryMapFile = {
        version: 1,
        episode_id: "ep01",
        author: "ai",
        updated_at: "2026-10-21T12:00:00.000Z",
        source: storyMapSource(root, "ep01", script),
        events: [
            {
                shot_id: "01",
                title: "徽章上的编号",
                summary: "林默在积水里捡到徽章。",
                importance: "major",
                story_time: "第一夜 21:40",
            },
        ],
        relations: [{ from: "lin-mo", to: "a-lan", kind: "ally", label: "旧识" }],
    };
    saveStoryMap(root, "ep01", doc);
}

const PROJECT: ProjectConfig = { name: "图谱测试", version: 2, default_workflow: "t2v" };

test("story map：推导事件、形态、资产、workflow 与缺口", () => {
    const root = setup();
    try {
        buildEpisode(root);
        const map = buildStoryMap(root, "ep01", PROJECT);
        assert.notEqual(map, null);
        if (map === null) return;
        assert.equal(map.events.length, 3);
        assert.equal(map.events[0]?.characters[0]?.form, "night");
        assert.equal(map.events[0]?.scene?.id, "rain-city");
        assert.equal(map.events[0]?.beats[0]?.summary, "发现信");
        assert.equal(map.generation.workflows.length, 2);
        assert.equal(map.generation.events[0]?.assigned_workflow, "i2v");
        assert.equal(map.generation.events[0]?.workflow?.slots.length, 2);
        assert.equal(map.generation.events[0]?.ready, true);
        assert.equal(map.generation.events[1]?.continuity.relay_from, "01");
        assert.equal(map.generation.events[0]?.continuity.relay_targets[0], "02");
        assert.equal(
            map.generation.events[1]?.gaps.some((gap) => gap.code === "slot_ambiguous"),
            true,
        );
        assert.equal(map.generation.events[2]?.assigned_workflow, "t2v");
        assert.equal(map.generation.readiness.counts.shots, 3);
        assert.equal(map.generation.readiness.counts.ready, 3);
        assert.equal(map.graph.character_scene_edges.length > 0, true);
        assert.equal(map.catalog.characters.length, 2);
        assert.equal(map.catalog.voices[0]?.used, true);
        assert.equal(map.time.basis, "screen");
        assert.equal(map.time.duration_seconds, 6);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story map：叙事标注覆盖标题 / 重要度 / 关系", () => {
    const root = setup();
    try {
        buildEpisode(root);
        writeAnnotations(root);
        const map = buildStoryMap(root, "ep01", PROJECT);
        assert.notEqual(map, null);
        if (map === null) return;
        assert.equal(map.origin.annotated, true);
        assert.equal(map.origin.author, "ai");
        assert.equal(map.events[0]?.title, "徽章上的编号");
        assert.equal(map.events[0]?.title_source, "annotation");
        assert.equal(map.events[0]?.importance, "major");
        assert.equal(map.events[0]?.story_time, "第一夜 21:40");
        assert.equal(map.relations.length, 1);
        assert.equal(map.relations[0]?.label, "旧识");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story map：缺参考资产产生缺口并阻塞", () => {
    const root = setup();
    try {
        buildEpisode(root);
        // 移除场景主参考
        const scenes = loadScenes(root);
        scenes.scenes[0].reference_asset = null;
        saveScenes(root, scenes);
        const map = buildStoryMap(root, "ep01", PROJECT);
        assert.notEqual(map, null);
        if (map === null) return;
        const event = map.generation.events[0];
        assert.equal(event?.ready, false);
        assert.equal(
            event?.gaps.some((gap) => gap.severity === "blocker"),
            true,
        );
        assert.equal(
            map.warnings.some((warning) => warning.code === "missing_reference"),
            true,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story map：资产槽位预检与严格执行同源", () => {
    const root = setup();
    try {
        buildEpisode(root);
        const shots = loadEpisodeShots(root, "ep01");
        assert.notEqual(shots, null);
        if (shots === null) return;
        // 工作流绝对路径
        const workflowAbs = join(root, "workflows", "i2v.json");
        const shot = shots.shots[0];
        assert.notEqual(shot, undefined);
        if (shot === undefined) return;
        // 预检
        const plan = planWorkflowAssets({ root, shot, workflowAbs });
        assert.equal(plan.gaps.filter((gap) => gap.severity === "blocker").length, 0);
        const resolved = resolveWorkflowAssets({ root, shot, workflowAbs });
        assert.equal(resolved.uploads.length, 2);
        assert.equal(resolved.records.length, 2);
        // 移除场景主参考后，预检报 blocker，严格执行抛错
        const scenes = loadScenes(root);
        scenes.scenes[0].reference_asset = null;
        saveScenes(root, scenes);
        const blocked = planWorkflowAssets({ root, shot, workflowAbs });
        assert.equal(
            blocked.gaps.some((gap) => gap.severity === "blocker"),
            true,
        );
        assert.throws(() => resolveWorkflowAssets({ root, shot, workflowAbs }));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story map：骨架保留叙事字段并删除已移除镜头", () => {
    const root = setup();
    try {
        buildEpisode(root);
        writeAnnotations(root);
        // 删除第三个镜头
        const shots = loadEpisodeShots(root, "ep01");
        assert.notEqual(shots, null);
        if (shots === null) return;
        shots.shots = shots.shots.slice(0, 2);
        saveEpisodeShots(root, "ep01", shots);
        const result = materializeStoryMap(root, "ep01", { force: false });
        assert.deepEqual(result.dropped, []);
        assert.equal(result.preserved, 1);
        assert.equal(result.doc.events.length, 2);
        assert.equal(result.doc.events[0]?.title, "徽章上的编号");
        assert.equal(result.doc.author, "ai");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story map：写入校验拒绝未知镜头与未知关系", () => {
    const root = setup();
    try {
        buildEpisode(root);
        const script = loadScriptMeta(root, "ep01");
        const shots = loadEpisodeShots(root, "ep01");
        assert.notEqual(shots, null);
        if (shots === null) return;
        const characters = loadCharacters(root);
        assert.throws(
            () =>
                normalizeStoryMapDoc(
                    {
                        version: 1,
                        events: [{ shot_id: "99", title: "x" }],
                        relations: [],
                    },
                    "ep01",
                    "ai",
                    storyMapSource(root, "ep01", script),
                    shots,
                    characters,
                ),
            (error: unknown) => {
                // 错误明细
                const issues = (error as { details?: { issues?: string[] } }).details?.issues ?? [];
                return issues.some((issue) => issue.includes("不存在的镜头"));
            },
        );
        assert.throws(
            () =>
                normalizeStoryMapDoc(
                    {
                        version: 1,
                        events: [],
                        relations: [{ from: "lin-mo", to: "nobody", label: "x" }],
                    },
                    "ep01",
                    "ai",
                    storyMapSource(root, "ep01", script),
                    shots,
                    characters,
                ),
            (error: unknown) => {
                // 错误明细
                const issues = (error as { details?: { issues?: string[] } }).details?.issues ?? [];
                return issues.some((issue) => issue.includes("终点角色不存在"));
            },
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
