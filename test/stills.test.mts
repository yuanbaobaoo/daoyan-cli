/** 图片单元：存储、提示词修订、图片库、描述符、操作状态与校验。 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { initStory, saveCharacters, saveScenes } from "../src/core/story/store.mts";
import { listEpisodeMetas, resolveEpisodeContext } from "../src/core/story/paths.mts";
import {
    addStill,
    addStillRef,
    imageOpsStatus,
    initStills,
    loadStills,
    parseImageSource,
    removeStill,
    removeStillRef,
    resolveImageSource,
    updateStill,
} from "../src/core/story/stills.mts";
import { validateStills } from "../src/core/story/stills-validate.mts";
import { scaffoldProject } from "../src/core/provision/init-flow.mts";
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
 * 创建测试项目。
 */
function setup(): string {
    // 临时目录
    const root = mkdtempSync(join(tmpdir(), "dycli-stills-"));
    // 项目配置
    const project: ProjectConfig = {
        name: "图片测试",
        version: 2,
        production: { mode: "series", audio: true },
        image: {
            ops: {
                t2i: { workflow: "workflows/image-t2i.json" },
                i2i: { workflow: "workflows/image-i2i.json" },
                upscale: { workflow: "workflows/image-upscale.json" },
                inpaint: { workflow: "workflows/image-inpaint.json" },
                prompt: { backend: "agent" },
            },
        },
    };
    writeJson(join(root, "project.json"), project);
    initStory(root, "图片测试");
    initStills(root);
    // 角色 / 场景
    saveCharacters(root, {
        version: 1,
        updated_at: "",
        characters: [
            {
                id: "lin",
                name: "林默",
                default_form: "base",
                forms: [
                    { id: "base", name: "基础", assets: [] },
                    { id: "night", name: "夜行", assets: [] },
                ],
            },
        ],
    });
    saveScenes(root, {
        version: 1,
        updated_at: "",
        scenes: [{ id: "city", name: "雨夜城市", assets: [] }],
    });
    // 工作流占位与 bindings
    writeJson(join(root, "workflows", "image-t2i.json"), { "1": { class_type: "Mock", inputs: {} } });
    writeJson(join(root, "workflows", "image-t2i.bindings.json"), { prompt: "1.prompt", seed: "1.seed" });
    writeJson(join(root, "workflows", "image-i2i.json"), { "1": { class_type: "Mock", inputs: {} } });
    writeJson(join(root, "workflows", "image-i2i.bindings.json"), {
        prompt: "1.prompt",
        seed: "1.seed",
        source: "1.image",
    });
    writeJson(join(root, "workflows", "image-upscale.json"), { "1": { class_type: "Mock", inputs: {} } });
    writeJson(join(root, "workflows", "image-upscale.bindings.json"), { source: "1.image" });
    writeJson(join(root, "workflows", "image-inpaint.json"), { "1": { class_type: "Mock", inputs: {} } });
    writeJson(join(root, "workflows", "image-inpaint.bindings.json"), { source: "1.image", mask: "1.mask" });
    return root;
}

test("stills：新建、提示词修订与图片集自动创建", () => {
    const root = setup();
    try {
        // 新建
        const still = addStill(root, {
            id: "lin-base-front",
            owner: "character:lin",
            form: "base",
            set: "character-sheet",
            setTitle: "角色设定",
            prompt: "正面全身，白底",
            seed: 42,
            width: 1024,
            height: 1024,
        });
        assert.equal(still.owner, "character:lin");
        assert.equal(still.form, "base");
        assert.equal(still.prompt_revisions?.length, 1);
        assert.equal(still.prompt_revisions?.[0]?.source, "agent");
        // 图片集自动创建
        const doc = loadStills(root);
        assert.equal(doc.sets[0]?.id, "character-sheet");
        assert.equal(doc.sets[0]?.title, "角色设定");
        // 提示词变化追加修订
        const updated = updateStill(
            root,
            "lin-base-front",
            { prompt: "正面全身，纯白背景，柔和光" },
            { source: "user" },
        );
        assert.equal(updated.prompt_revisions?.length, 2);
        assert.equal(updated.prompt_revisions?.[1]?.source, "user");
        assert.equal(updated.prompt_revisions?.[1]?.revision, 2);
        // 相同提示词不追加
        const same = updateStill(root, "lin-base-front", { prompt: "正面全身，纯白背景，柔和光" }, { source: "user" });
        assert.equal(same.prompt_revisions?.length, 2);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("stills：owner / 尺寸 / 描述符校验", () => {
    const root = setup();
    try {
        assert.throws(
            () => addStill(root, { id: "bad", owner: "character:lin", form: "missing", prompt: "x" }),
            /没有形态/,
        );
        assert.throws(() => addStill(root, { id: "bad", width: 0, prompt: "x" }), /正整数/);
        assert.throws(() => addStill(root, { id: "bad", source: "unknown:x", prompt: "x" }), /未知图片输入类型/);
        // 场景
        const scene = addStill(root, { id: "city-wide", owner: "scene:city", prompt: "全景" });
        assert.equal(scene.owner, "scene:city");
        assert.equal(scene.form, null);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("stills：描述符解析与图片库引用保护", () => {
    const root = setup();
    try {
        // 描述符
        assert.deepEqual(parseImageSource("asset:character:lin/base@front"), {
            raw: "asset:character:lin/base@front",
            kind: "asset",
            owner_kind: "character",
            owner_id: "lin",
            form: "base",
            asset_id: "front",
        });
        assert.equal(parseImageSource("ref:mood-01").ref_id, "mood-01");
        assert.equal(parseImageSource("still:lin-base-front").still_id, "lin-base-front");
        assert.equal(parseImageSource("run:r_1/out.png").output, "out.png");
        assert.throws(() => parseImageSource("asset:character:lin"), /需要 <id>\/<form>/);
        // 图片库
        const file = join(root, "mask.png");
        writeFileSync(file, PNG);
        const ref = addStillRef({ root, file, id: "fix-mask", role: "mask" });
        assert.equal(ref.role, "mask");
        assert.equal(ref.content_type, "image/png");
        assert.equal(existsSync(join(root, ref.path)), true);
        // 被引用时禁止删除
        addStill(root, { id: "fix", prompt: "修复", mask: "ref:fix-mask" });
        assert.throws(() => removeStillRef(root, "fix-mask", false), /被图片单元引用/);
        // 单元被引用时禁止删除
        addStill(root, { id: "source-a", prompt: "a" });
        addStill(root, { id: "source-b", prompt: "b", source: "still:source-a" });
        assert.throws(() => removeStill(root, "source-a", false), /被其他单元引用/);
        assert.equal(removeStill(root, "source-a", true).id, "source-a");
        assert.equal(resolveImageSource(root, "ref:fix-mask").present, true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("stills：操作就绪状态与校验", () => {
    const root = setup();
    try {
        // 读取项目配置
        const project = JSON.parse(readFileSync(join(root, "project.json"), "utf8")) as ProjectConfig;
        const statuses = imageOpsStatus(root, project);
        assert.equal(statuses.find((item) => item.op === "t2i")?.ready, true);
        assert.equal(statuses.find((item) => item.op === "i2i")?.ready, true);
        assert.equal(statuses.find((item) => item.op === "prompt")?.ready, true);
        // 正常单元无错误
        addStill(root, { id: "ok", prompt: "示例" });
        assert.deepEqual(
            validateStills(root, project).filter((item) => item.severity === "error"),
            [],
        );
        // 缺 binding
        writeJson(join(root, "workflows", "image-i2i.bindings.json"), { prompt: "1.prompt", seed: "1.seed" });
        const broken = imageOpsStatus(root, project).find((item) => item.op === "i2i");
        assert.equal(broken?.ready, false);
        assert.match(broken?.issues.join(" ") ?? "", /bindings 缺少 "source"/);
        // 不存在的镜号
        addStill(root, { id: "bad-shot", prompt: "x", episode_id: "ep01", shot_id: "99" });
        assert.equal(
            validateStills(root, project).some((item) => item.code === "image_invalid" && /没有镜/.test(item.message)),
            true,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("stills：纯图片项目骨架", () => {
    const root = mkdtempSync(join(tmpdir(), "dycli-stills-project-"));
    try {
        scaffoldProject(root, "纯图片", "stills");
        // 无剧集
        assert.equal(listEpisodeMetas(root).length, 0);
        assert.throws(() => resolveEpisodeContext(root), /纯图片项目没有剧集/);
        // 图片骨架
        assert.equal(existsSync(join(root, "stills", "stills.json")), true);
        assert.equal(existsSync(join(root, "stills", "takes.json")), true);
        assert.equal(existsSync(join(root, "workflows", "image-t2i.json")), true);
        // 项目配置
        const project = JSON.parse(readFileSync(join(root, "project.json"), "utf8")) as ProjectConfig;
        assert.equal(project.production?.mode, "stills");
        assert.equal(project.production?.audio, false);
        // 操作配置留空，等 Agent / 用户导入 workflow 后再写 ops
        assert.deepEqual(project.image?.ops, {});
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
