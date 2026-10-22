/** story：多集剧本 / 拆解 / 设定资产 / 门禁 / 工作流资产槽位。 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { addAsset, parseAssetOwner, removeAsset, setReferenceAsset } from "../src/core/story/assets.mts";
import {
    addEpisode,
    approveScript,
    initStory,
    loadCharacters,
    loadEpisodeShots,
    saveBreakdown,
    saveCharacters,
    saveEpisodeShots,
    saveScenes,
    saveVoices,
    syncScript,
} from "../src/core/story/store.mts";
import { resolveEpisodeContext } from "../src/core/story/paths.mts";
import {
    checkBreakdownForWrite,
    checkShotsForWrite,
    computeEpisodeStoryStatus,
    computeSeriesStoryStatus,
    validateStory,
} from "../src/core/story/validate.mts";
import { planShotRuns } from "../src/core/task/plans.mts";
import type { MachineConfig, ProjectConfig, ShotsFile } from "../src/core/project/types.mts";
import type { BreakdownFile, StoryCharactersFile, StoryScenesFile, StoryVoicesFile } from "../src/core/story/types.mts";

// 1x1 PNG
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1xkAAAAASUVORK5CYII=",
    "base64",
);
// 最小 WAV（16k / mono / 100ms 静音）
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
    const root = mkdtempSync(join(tmpdir(), "dycli-story-"));
    writeFileSync(join(root, "project.json"), JSON.stringify({ name: "测试短剧", version: 2 }) + "\n");
    initStory(root, "测试短剧");
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
 * 建立完整 ep01 数据。
 */
function buildEpisode(root: string): void {
    // 剧本
    syncScript({
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
                voice_ids: ["lin-mo-default"],
            },
        ],
    };
    saveCharacters(root, characters);
    // 场景
    const scenes: StoryScenesFile = {
        version: 1,
        updated_at: "",
        scenes: [{ id: "rain-city", name: "雨夜城市", assets: [] }],
    };
    saveScenes(root, scenes);
    // 音色
    const voices: StoryVoicesFile = {
        version: 1,
        updated_at: "",
        voices: [
            {
                id: "lin-mo-default",
                character_id: "lin-mo",
                name: "林默·常态",
                mode: "reference",
                assets: [],
            },
        ],
    };
    saveVoices(root, voices);
    // 资产
    const sources = writeSources(root);
    const character = parseAssetOwner("character:lin-mo", "default");
    const night = parseAssetOwner("character:lin-mo", "night");
    const scene = parseAssetOwner("scene:rain-city");
    const voice = parseAssetOwner("voice:lin-mo-default");
    addAsset({ root, owner: character, assetId: "front", from: sources.image, setReference: true, replace: false });
    addAsset({ root, owner: night, assetId: "front", from: sources.image, setReference: true, replace: false });
    addAsset({ root, owner: scene, assetId: "establishing", from: sources.image, setReference: true, replace: false });
    addAsset({ root, owner: voice, assetId: "sample", from: sources.audio, setReference: true, replace: false });
    // 拆解
    const script = syncScript({
        root,
        episodeId: "ep01",
        text: "# 第一集\n\n林默在雨夜发现一封信。\n",
        source: "ai",
        summary: "初稿",
    });
    const breakdown: BreakdownFile = {
        version: 1,
        episode_id: "ep01",
        source_revision: script.meta.revision,
        source_sha256: script.meta.sha256,
        beats: [{ id: "s01", summary: "电话亭发现信" }],
        characters: [{ id: "lin-mo", forms: ["default", "night"] }],
        scenes: ["rain-city"],
        voices: ["lin-mo-default"],
    };
    assert.equal(checkBreakdownForWrite(root, "ep01", breakdown).filter((i) => i.severity === "error").length, 0);
    saveBreakdown(root, "ep01", breakdown);
    // 工作流（分镜校验前必须存在）
    writeFileSync(
        join(root, "workflows", "t2v.json"),
        JSON.stringify({
            "5": { class_type: "CLIPTextEncode", inputs: { text: "" } },
            "7": { class_type: "KSampler", inputs: { seed: 1 } },
            "10": { class_type: "LoadImage", inputs: { image: "x.png" } },
            "20": { class_type: "LoadImage", inputs: { image: "x.png" } },
            "30": { class_type: "LoadAudio", inputs: { audio: "x.wav" } },
        }) + "\n",
    );
    writeFileSync(
        join(root, "workflows", "t2v.bindings.json"),
        JSON.stringify({ prompt: "5.text", seed: "7.seed" }) + "\n",
    );
    writeFileSync(
        join(root, "workflows", "t2v.assets.json"),
        JSON.stringify({
            version: 1,
            slots: [
                { name: "hero", kind: "character", asset: "reference", target: "10.image", required: true },
                { name: "scene", kind: "scene", asset: "reference", target: "20.image", required: true },
                { name: "voice", kind: "voice", asset: "reference", target: "30.audio", required: true },
            ],
        }) + "\n",
    );
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
                summary: "发现信",
                script_refs: ["s01"],
                characters: [{ id: "lin-mo", form: "night" }],
                scene: "rain-city",
                dialogue: [{ character: "lin-mo", text: "这不是写给我的。", voice: "lin-mo-default" }],
                seed: 1101,
                length: 48,
                prompt: "雨夜电话亭，林默发现信",
            },
        ],
    };
    assert.equal(checkShotsForWrite(root, "ep01", shots).filter((i) => i.severity === "error").length, 0);
    saveEpisodeShots(root, "ep01", shots);
    // 工作流
    const graph = {
        "5": { class_type: "CLIPTextEncode", inputs: { text: "" } },
        "7": { class_type: "KSampler", inputs: { seed: 1 } },
        "10": { class_type: "LoadImage", inputs: { image: "x.png" } },
        "20": { class_type: "LoadImage", inputs: { image: "x.png" } },
        "30": { class_type: "LoadAudio", inputs: { audio: "x.wav" } },
    };
    writeFileSync(join(root, "workflows", "t2v.json"), JSON.stringify(graph) + "\n");
    writeFileSync(
        join(root, "workflows", "t2v.bindings.json"),
        JSON.stringify({ prompt: "5.text", seed: "7.seed" }) + "\n",
    );
    writeFileSync(
        join(root, "workflows", "t2v.assets.json"),
        JSON.stringify({
            version: 1,
            slots: [
                { name: "hero", kind: "character", asset: "reference", target: "10.image", required: true },
                { name: "scene", kind: "scene", asset: "reference", target: "20.image", required: true },
                { name: "voice", kind: "voice", asset: "reference", target: "30.audio", required: true },
            ],
        }) + "\n",
    );
}

test("story：初始化、剧本 revision 与同内容幂等", () => {
    const root = setup();
    try {
        // 初始状态
        assert.equal(loadCharacters(root).characters.length, 0);
        // 首次同步
        const first = syncScript({ root, episodeId: "ep01", text: "a\r\nb", source: "ai", summary: "初稿" });
        assert.equal(first.changed, true);
        assert.equal(first.meta.revision, 1);
        assert.equal(first.meta.sha256, first.meta.sha256.toLowerCase());
        // 同内容
        const again = syncScript({ root, episodeId: "ep01", text: "a\nb", source: "ai", summary: "无变化" });
        assert.equal(again.changed, false);
        assert.equal(again.meta.revision, 1);
        // 变化后 draft
        approveScript(root, "ep01");
        const next = syncScript({ root, episodeId: "ep01", text: "a\nc", source: "ai", summary: "第二稿" });
        assert.equal(next.meta.revision, 2);
        assert.equal(next.meta.status, "draft");
        assert.equal(next.meta.approved_at, null);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story：完整单集可 ready，缺主参考会阻断", () => {
    const root = setup();
    try {
        buildEpisode(root);
        // 状态
        const status = computeEpisodeStoryStatus(root, "ep01", { name: "测试短剧", version: 2 });
        assert.equal(status.stage, "ready");
        assert.equal(status.blockers.length, 0);
        assert.equal(status.counts.assets, 4);
        // 校验
        const issues = validateStory(root);
        assert.equal(issues.filter((i) => i.severity === "error").length, 0);
        // 清除主参考
        const doc = loadCharacters(root);
        doc.characters[0].forms[1].reference_asset = null;
        saveCharacters(root, doc);
        const blocked = computeEpisodeStoryStatus(root, "ep01", { name: "测试短剧", version: 2 });
        assert.equal(blocked.stage, "assets");
        assert.ok(blocked.blockers.some((b) => b.code === "missing_reference"));
        // 恢复
        setReferenceAsset(root, parseAssetOwner("character:lin-mo", "night"), "front");
        assert.equal(computeEpisodeStoryStatus(root, "ep01", { name: "测试短剧", version: 2 }).stage, "ready");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story：多集缺 --episode 返回 episode_required", () => {
    const root = setup();
    try {
        addEpisode(root, { id: "ep02", number: 2, title: "第二集" });
        assert.throws(
            () => resolveEpisodeContext(root),
            (e: unknown) => e instanceof Error && (e as { code?: string }).code === "episode_required",
        );
        const context = resolveEpisodeContext(root, "ep01");
        assert.equal(context.episode_id, "ep01");
        assert.equal(context.label_prefix, "ep:ep01:shot:");
        const series = computeSeriesStoryStatus(root, { name: "测试短剧", version: 2 });
        assert.equal(series.series.episodes_total, 2);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story：工作流资产槽位解析与 label 前缀", async () => {
    const root = setup();
    try {
        buildEpisode(root);
        // 机器与项目
        const project: ProjectConfig = { name: "测试短剧", version: 2 };
        const machine: MachineConfig = {
            machine_id: "test",
            engine: { mode: "remote", url: "http://127.0.0.1:9" },
        };
        // 分镜
        const shots = loadEpisodeShots(root, "ep01");
        assert.ok(shots !== null);
        const planned = await planShotRuns({
            root,
            project,
            machine,
            shots,
            shotIds: ["01"],
            force: true,
            context: resolveEpisodeContext(root, "ep01"),
            log: () => {},
        });
        assert.equal(planned.plans.length, 1);
        // 计划
        const plan = planned.plans[0];
        assert.ok(plan !== undefined);
        assert.equal(plan.label, "ep:ep01:shot:01");
        assert.deepEqual(plan.uploads.map((u) => u.logical).sort(), ["asset:hero", "asset:scene", "asset:voice"]);
        assert.equal(Array.isArray(plan.inputs.assets), true);
        assert.equal((plan.inputs.assets as unknown[]).length, 3);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story：引用资产主参考必须显式指定，删除需 force", () => {
    const root = setup();
    try {
        buildEpisode(root);
        // 新形态草稿：只入库不指定主参考
        const doc = loadCharacters(root);
        doc.characters[0].forms.push({ id: "draft", name: "草稿", assets: [] });
        saveCharacters(root, doc);
        const sources = writeSources(root);
        const draft = parseAssetOwner("character:lin-mo", "draft");
        const added = addAsset({
            root,
            owner: draft,
            assetId: "front",
            from: sources.image,
            setReference: false,
            replace: false,
        });
        assert.equal(added.reference_set, false);
        assert.ok(added.warning !== null);
        assert.equal(
            loadCharacters(root).characters[0].forms.find((f) => f.id === "draft")?.reference_asset,
            undefined,
        );
        // 删除主参考需要 force
        assert.throws(
            () => removeAsset(root, parseAssetOwner("character:lin-mo", "default"), "front", false),
            (e: unknown) => e instanceof Error && (e as { code?: string }).code === "story_invalid",
        );
        const removed = removeAsset(root, parseAssetOwner("character:lin-mo", "default"), "front", true);
        assert.equal(removed.id, "front");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story：分镜不能使用拆解未声明的形态", () => {
    const root = setup();
    try {
        buildEpisode(root);
        const shots = loadEpisodeShots(root, "ep01");
        assert.ok(shots !== null);
        // 拆解只允许 default
        const breakdown: BreakdownFile = {
            version: 1,
            episode_id: "ep01",
            source_revision: 1,
            source_sha256: "",
            characters: [{ id: "lin-mo", forms: ["default"] }],
            scenes: ["rain-city"],
            voices: ["lin-mo-default"],
        };
        saveBreakdown(root, "ep01", breakdown);
        const issues = checkShotsForWrite(root, "ep01", shots);
        assert.ok(issues.some((i) => i.code === "entity_not_in_breakdown"));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
