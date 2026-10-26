/** run 归属迁移测试 —— 未归属 run 迁到某集某镜后才能定稿。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRunDir, readRun, writeRun, writeRunOutput } from "../src/core/run/store.mts";
import { reassignRunToEpisode } from "../src/core/run/reassign.mts";
import { finalizeTake, pickShotTake } from "../src/core/story/takes.mts";
import { resolveEpisodeContext } from "../src/core/story/paths.mts";
import { DaoyanCliError } from "../src/shared/errors.mts";
import type { RunRecord } from "../src/core/project/types.mts";

/**
 * 写 JSON 文件。
 */
function writeJson(file: string, value: unknown): void {
    writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

/**
 * story 项目骨架（ep01 有 01 / 02 两镜）。
 */
function setupStory(): string {
    // 项目根
    const root = mkdtempSync(join(tmpdir(), "dycli-reassign-"));
    mkdirSync(join(root, ".dycli"), { recursive: true });
    mkdirSync(join(root, "story"), { recursive: true });
    mkdirSync(join(root, "episodes", "ep01"), { recursive: true });
    mkdirSync(join(root, "episodes", "ep02"), { recursive: true });
    writeJson(join(root, "project.json"), { name: "迁移测试", version: 2 });
    writeJson(join(root, ".dycli", "machine.json"), {
        machine_id: "m",
        engine: { mode: "remote", url: "http://127.0.0.1:9" },
    });
    writeJson(join(root, "story", "series.json"), {
        version: 1,
        title: "迁移测试",
        created_at: "",
        updated_at: "",
    });
    for (const [id, number] of [
        ["ep01", 1],
        ["ep02", 2],
    ] as const) {
        writeJson(join(root, "episodes", id, "episode.json"), {
            version: 1,
            id,
            number,
            title: `第 ${number} 集`,
            created_at: "",
            updated_at: "",
        });
    }
    writeJson(join(root, "episodes", "ep01", "shots.json"), {
        workflow: "t2v",
        meta: { episode_id: "ep01", width: 64, height: 64, anchors: {} },
        defaults: {},
        shots: [
            { id: "01", seed: 1, prompt: "a" },
            { id: "02", seed: 2, prompt: "b" },
        ],
    });
    return root;
}

/**
 * 落一条 run 记录。
 */
function seedRun(
    root: string,
    opts: { runId: string; label: string | null; episodeId?: string | null; startedAt?: string },
): RunRecord {
    // run 目录
    createRunDir(root, opts.runId);
    // 产物
    const outputs = [writeRunOutput(root, opts.runId, "clip.mp4", new Uint8Array([1, 2, 3]))];
    // 记录
    const record: RunRecord = {
        run_id: opts.runId,
        task_id: "t_seed",
        machine_id: "m",
        episode_id: opts.episodeId ?? null,
        request_id: null,
        label: opts.label,
        workflow: { path: "workflows/t2v.json", sha256: "seed" },
        inputs: { seed: 1, prompt: "a" },
        overrides: {},
        engine: {
            mode: "remote",
            comfyui_version: null,
            url: "http://127.0.0.1:9",
            pid: null,
            ready_ms: null,
            cleanup: null,
        },
        status: "succeeded",
        prompt_id: "p",
        started_at: opts.startedAt ?? "2026-10-20T05:09:03.000Z",
        finished_at: opts.startedAt ?? "2026-10-20T05:09:03.000Z",
        outputs,
        error: null,
    };
    writeRun(root, record);
    return record;
}

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

test("未归属 run 迁移到某集后可以直接定稿", () => {
    // 项目根
    const root = setupStory();
    try {
        // story 化之前的产出
        seedRun(root, { runId: "r_legacy", label: "shot:01" });
        // 上下文
        const context = resolveEpisodeContext(root, "ep01");
        // 迁移前：该镜无可用稿件
        assert.equal(pickShotTake(root, context, "01").source, "none");
        // 迁移
        const done = reassignRunToEpisode({ root, episodeId: "ep01", runId: "r_legacy" });
        assert.equal(done.changed, true);
        assert.equal(done.label, "ep:ep01:shot:01");
        assert.equal(done.prior_label, "shot:01");
        assert.equal(done.prior_episode_id, null);
        // 落盘记录
        const stored = readRun(root, "r_legacy");
        assert.equal(stored?.episode_id, "ep01");
        assert.equal(stored?.label, "ep:ep01:shot:01");
        assert.equal(stored?.reassigned?.from_label, "shot:01");
        assert.equal(stored?.reassigned?.by, "ai");
        // 现在可以定稿
        const take = finalizeTake({ root, context, shotId: "01", runId: "r_legacy", source: "user" });
        assert.equal(take.entry.output, "clip.mp4");
        assert.equal(pickShotTake(root, context, "01").source, "finalized");
        // 幂等
        assert.equal(reassignRunToEpisode({ root, episodeId: "ep01", runId: "r_legacy" }).changed, false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("迁移约束：已归属、镜号缺失与自定义 label", () => {
    // 项目根
    const root = setupStory();
    try {
        // 已归属 ep02
        seedRun(root, { runId: "r_ep02", label: "ep:ep02:shot:01", episodeId: "ep02" });
        assert.equal(
            errorCodeOf(() => reassignRunToEpisode({ root, episodeId: "ep01", runId: "r_ep02" })),
            "run_assigned",
        );
        // 手工 run：label 是 workflow 名，推不出镜号
        seedRun(root, { runId: "r_manual", label: "minimax_h3" });
        assert.equal(
            errorCodeOf(() => reassignRunToEpisode({ root, episodeId: "ep01", runId: "r_manual" })),
            "usage",
        );
        // 显式 --shot 可以归属
        assert.equal(
            reassignRunToEpisode({ root, episodeId: "ep01", runId: "r_manual", shotId: "02" }).label,
            "ep:ep01:shot:02",
        );
        // 目标集没有该镜号
        seedRun(root, { runId: "r_ghost_shot", label: "shot:09" });
        assert.equal(
            errorCodeOf(() => reassignRunToEpisode({ root, episodeId: "ep01", runId: "r_ghost_shot" })),
            "story_invalid",
        );
        // 不存在的 run
        assert.equal(
            errorCodeOf(() => reassignRunToEpisode({ root, episodeId: "ep01", runId: "r_none" })),
            "run_not_found",
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
