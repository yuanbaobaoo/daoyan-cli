/** 单视频 / 多集与音频开关测试。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffoldProject } from "../src/core/provision/init-flow.mts";
import { addEpisode, initStory, saveBreakdown, saveCharacters, saveEpisodeShots } from "../src/core/story/store.mts";
import { setProductionMode, updateProduction } from "../src/core/story/mode.mts";
import { productionOf } from "../src/core/project/production.mts";
import { resolveEpisodeContext } from "../src/core/story/paths.mts";
import { planWorkflowAssets } from "../src/core/story/workflow-assets.mts";
import { computeEpisodeStoryStatus, validateStory } from "../src/core/story/validate.mts";
import { DaoyanCliError } from "../src/shared/errors.mts";
import type { ProjectConfig } from "../src/core/project/types.mts";

/**
 * 捕获错误码。
 */
function errorCodeOf(fn: () => unknown): string {
    try {
        fn();
    } catch (e) {
        if (e instanceof DaoyanCliError) return e.code;
        throw e;
    }
    return "no_error";
}

/**
 * 创建最小 story 项目。
 */
function setup(mode: "single" | "series", audio = true): string {
    // 项目根
    const root = mkdtempSync(join(tmpdir(), "dycli-production-"));
    writeFileSync(
        join(root, "project.json"),
        JSON.stringify({ name: "production-test", version: 2, production: { mode, audio } }, null, 2) + "\n",
    );
    initStory(root, "production-test");
    return root;
}

test("scaffoldProject：按 --production 生成单视频 / 多集 story 骨架", () => {
    for (const mode of ["single", "series"] as const) {
        // 新项目
        const root = mkdtempSync(join(tmpdir(), "dycli-scaffold-"));
        try {
            scaffoldProject(root, "scaffold", mode);
            // 项目配置
            const project = JSON.parse(readFileSync(join(root, "project.json"), "utf8")) as ProjectConfig;
            assert.equal(productionOf(project).mode, mode);
            assert.equal(productionOf(project).audio, true);
            // story 骨架
            assert.ok(readFileSync(join(root, "story", "series.json"), "utf8").includes("scaffold"));
            assert.ok(readFileSync(join(root, "episodes", "ep01", "episode.json"), "utf8").includes("ep01"));
            // 根 shots.json 不再生成
            assert.equal(
                (() => {
                    try {
                        readFileSync(join(root, "shots.json"), "utf8");
                        return true;
                    } catch {
                        return false;
                    }
                })(),
                false,
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }
});

test("模式切换：只有一集才能切单视频", () => {
    const root = setup("series");
    try {
        // 一集可切
        assert.equal(productionOf(setProductionMode(root, "single")).mode, "single");
        assert.equal(productionOf(setProductionMode(root, "series")).mode, "series");
        // 增加第二集后阻塞
        addEpisode(root, { id: "ep02", number: 2, title: "第二集" });
        assert.equal(
            errorCodeOf(() => setProductionMode(root, "single")),
            "mode_conflict",
        );
        // 单视频状态下的多集数据会被上下文拒绝
        const project = JSON.parse(readFileSync(join(root, "project.json"), "utf8")) as ProjectConfig;
        writeFileSync(
            join(root, "project.json"),
            JSON.stringify({ ...project, production: { mode: "single", audio: true } }, null, 2) + "\n",
        );
        assert.equal(
            errorCodeOf(() => resolveEpisodeContext(root)),
            "mode_conflict",
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("音频关闭：忽略音色 blocker 与音色槽位", () => {
    const root = setup("single", false);
    try {
        // 角色引用不存在的音色
        saveCharacters(root, {
            version: 1,
            updated_at: "",
            characters: [
                {
                    id: "lin",
                    name: "林默",
                    default_form: "default",
                    forms: [{ id: "default", name: "日常", assets: [] }],
                    voice_ids: ["missing-voice"],
                },
            ],
        });
        // 拆解声明音色
        saveBreakdown(root, "ep01", {
            version: 1,
            episode_id: "ep01",
            source_revision: 0,
            source_sha256: "",
            beats: [],
            characters: [{ id: "lin", forms: ["default"] }],
            scenes: [],
            voices: ["missing-voice"],
            notes: "",
        });
        // 分镜
        saveEpisodeShots(root, "ep01", {
            workflow: "t2v",
            meta: { episode_id: "ep01", width: 64, height: 64, anchors: {} },
            defaults: {},
            shots: [
                {
                    id: "01",
                    seed: 1,
                    prompt: "a",
                    dialogue: [{ character: "lin", text: "hi", voice: "missing-voice" }],
                },
            ],
        });
        // 工作流
        writeFileSync(
            join(root, "workflows", "t2v.json"),
            JSON.stringify({ "10": { class_type: "LoadImage", inputs: {} } }) + "\n",
        );
        writeFileSync(
            join(root, "workflows", "t2v.assets.json"),
            JSON.stringify({
                version: 1,
                slots: [{ name: "voice", kind: "voice", asset: "reference", target: "10.audio" }],
            }) + "\n",
        );
        // 项目配置
        const project = JSON.parse(readFileSync(join(root, "project.json"), "utf8")) as ProjectConfig;
        // 状态与校验
        const status = computeEpisodeStoryStatus(root, "ep01", project);
        assert.equal(
            status.blockers.some((item) => /voice/i.test(item.code)),
            false,
        );
        assert.equal(
            validateStory(root, "ep01").some((item) => /voice/i.test(item.code)),
            false,
        );
        // 槽位规划
        const plan = planWorkflowAssets({
            root,
            shot: {
                id: "01",
                seed: 1,
                prompt: "a",
                dialogue: [{ character: "lin", text: "hi", voice: "missing-voice" }],
            },
            workflowAbs: join(root, "workflows", "t2v.json"),
            audio: false,
        });
        assert.equal(plan.slots.length, 0);
        assert.equal(
            plan.gaps.some((gap) => gap.code === "voice_disabled"),
            true,
        );
        // 重新开启后音色问题重新出现
        updateProduction(root, { audio: true });
        assert.equal(
            validateStory(root, "ep01").some((item) => /voice/i.test(item.code)),
            true,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
