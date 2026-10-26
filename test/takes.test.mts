/** 镜头定稿台账测试 —— 校验、选稿优先级、失效降级、合片与接力门禁。
 *  需要 ffmpeg 的用例在缺失时跳过。 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRunDir, writeRun, writeRunOutput } from "../src/core/run/store.mts";
import {
    finalizedTakeOf,
    finalizeTake,
    pickShotTake,
    revokeTake,
    shotTakeBoard,
    takeCounts,
    takesRelPath,
} from "../src/core/story/takes.mts";
import { resolveEpisodeContext } from "../src/core/story/paths.mts";
import { initStory, loadEpisodeShots } from "../src/core/story/store.mts";
import { runWrap } from "../src/commands/wrap.mts";
import { planShotRuns } from "../src/core/task/plans.mts";
import { DaoyanCliError } from "../src/shared/errors.mts";
import type { CliContext } from "../src/shared/context.mts";
import type { EpisodeContext } from "../src/core/story/types.mts";
import type { MachineConfig, ProjectConfig, RunRecord, ShotsFile } from "../src/core/project/types.mts";

/**
 * 命令上下文（--project 指向临时项目；文本模式避免整段 JSON 信封刷屏）。
 */
function commandContext(root: string): CliContext {
    return { json: false, noColor: true, projectPath: root };
}

/**
 * 是否具备 ffmpeg。
 */
function hasFfmpeg(): boolean {
    try {
        execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

/**
 * 生成一段有效 mp4 字节（合片与抽帧需要真视频）。
 */
function makeClipBytes(color: string): Uint8Array {
    // 临时文件
    const file = join(tmpdir(), `dycli-take-clip-${color}-${process.pid}.mp4`);
    execFileSync("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=64x64:r=10:d=1`,
        "-pix_fmt",
        "yuv420p",
        file,
    ]);
    // 字节
    const bytes = new Uint8Array(readFileSync(file));
    rmSync(file, { force: true });
    return bytes;
}

/**
 * 落一条 run 记录（产物真实写盘）。
 */
function seedRun(
    root: string,
    opts: {
        runId: string;
        label: string;
        startedAt: string;
        episodeId?: string | null;
        status?: RunRecord["status"];
        outputs?: Array<{ name: string; bytes: Uint8Array }>;
    },
): RunRecord {
    // run 目录
    createRunDir(root, opts.runId);
    // 产物记录
    const outputs = (opts.outputs ?? []).map((o) => writeRunOutput(root, opts.runId, o.name, o.bytes));
    // 记录
    const record: RunRecord = {
        run_id: opts.runId,
        task_id: "t_seed",
        machine_id: "take-machine",
        episode_id: opts.episodeId ?? "ep01",
        request_id: null,
        label: opts.label,
        workflow: { path: "workflows/t2v.json", sha256: "seed" },
        inputs: { seed: 1, prompt: "seed" },
        overrides: {},
        engine: {
            mode: "remote",
            comfyui_version: null,
            url: "http://127.0.0.1:9",
            pid: null,
            ready_ms: null,
            cleanup: null,
        },
        status: opts.status ?? "succeeded",
        prompt_id: "p_seed",
        started_at: opts.startedAt,
        finished_at: opts.startedAt,
        outputs,
        error: null,
    };
    writeRun(root, record);
    return record;
}

/**
 * 机器配置。
 */
function machineConfig(): MachineConfig {
    return { machine_id: "take-machine", engine: { mode: "remote", url: "http://127.0.0.1:9" } };
}

/**
 * story 项目骨架（两镜，02 接力 01）。
 */
function setupStory(project: ProjectConfig): string {
    // 项目根
    const root = mkdtempSync(join(tmpdir(), "dycli-takes-"));
    mkdirSync(join(root, ".dycli"), { recursive: true });
    writeFileSync(
        join(root, "project.json"),
        JSON.stringify({ ...project, production: { mode: "single", audio: true } }, null, 2),
    );
    writeFileSync(join(root, ".dycli", "machine.json"), JSON.stringify(machineConfig(), null, 2));
    // story 骨架
    initStory(root, "takes");
    writeFileSync(
        join(root, "episodes", "ep01", "shots.json"),
        JSON.stringify(
            {
                workflow: "t2v",
                meta: { episode_id: "ep01", title: "测试", width: 64, height: 64, anchors: {} },
                defaults: {},
                shots: [
                    { id: "01", title: "开场", seed: 1, prompt: "a" },
                    { id: "02", title: "接力", seed: 2, first_frame: { relay: "01" }, prompt: "b" },
                ],
            },
            null,
            2,
        ),
    );
    return root;
}

/**
 * 捕获 DaoyanCliError 的错误码。
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
 * 捕获异步命令的 DaoyanCliError 错误码。
 */
async function asyncErrorCode(fn: () => Promise<unknown>): Promise<string> {
    try {
        await fn();
    } catch (e) {
        if (e instanceof DaoyanCliError) return e.code;
        throw e;
    }
    return "no_error";
}

/**
 * 合片清单里关心的字段。
 */
interface CutManifest {
    /**
     * 选中片段。
     */
    clips: Array<{ shot: string; run_id: string; artifact: string; source: string }>;
    /**
     * 未纳入镜号。
     */
    missing: string[];
    /**
     * 回退警告。
     */
    warnings: Array<{ shot: string; code: string }>;
}

/**
 * 最近一次合片清单。
 */
function lastManifest(root: string): CutManifest {
    // 成片目录
    const dir = join(root, "final", "ep01");
    // 清单文件
    const files = readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .sort();
    assert.ok(files.length > 0, "没有合片清单");
    return JSON.parse(readFileSync(join(dir, files[files.length - 1] as string), "utf8")) as CutManifest;
}

test("定稿稿件优先于最新成功 run，台账只存决定", () => {
    // 项目根
    const root = setupStory({ name: "takes", version: 2 });
    try {
        // 上下文
        const context = resolveEpisodeContext(root);
        // 旧 run（将被定稿）
        seedRun(root, {
            runId: "r_old",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "01_old.mp4", bytes: new Uint8Array([1]) }],
        });
        // 新 run（最新成功）
        seedRun(root, {
            runId: "r_new",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-22T10:00:00.000Z",
            outputs: [{ name: "01_new.mp4", bytes: new Uint8Array([2]) }],
        });
        // 未定稿时回退最新
        const before = pickShotTake(root, context, "01");
        assert.equal(before.source, "latest");
        assert.equal(before.run?.run_id, "r_new");
        // 定稿旧稿件
        const done = finalizeTake({ root, context, shotId: "01", runId: "r_old", source: "user" });
        assert.equal(done.changed, true);
        assert.equal(done.entry.output, "01_old.mp4");
        // 选稿改为定稿
        const after = pickShotTake(root, context, "01");
        assert.equal(after.source, "finalized");
        assert.equal(after.run?.run_id, "r_old");
        assert.equal(after.output?.name, "01_old.mp4");
        // 台账位置
        assert.equal(takesRelPath(root, context), "episodes/ep01/takes.json");
        assert.equal(existsSync(join(root, "episodes", "ep01", "takes.json")), true);
        // 重复定稿同一稿件 = 幂等
        const again = finalizeTake({ root, context, shotId: "01", runId: "r_old", source: "user" });
        assert.equal(again.changed, false);
        assert.equal(again.replaced, false);
        // 换稿件记 replace
        const moved = finalizeTake({ root, context, shotId: "01", runId: "r_new", note: "改这条", source: "ai" });
        assert.equal(moved.replaced, true);
        assert.deepEqual(
            moved.record.history.map((h) => h.action),
            ["finalize", "replace"],
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("定稿校验：状态、归属与稿件类型", () => {
    // 项目根
    const root = setupStory({ name: "takes", version: 2 });
    try {
        // 上下文
        const context = resolveEpisodeContext(root);
        // 成功 run（视频 + 图片）
        seedRun(root, {
            runId: "r_ok",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [
                { name: "01.mp4", bytes: new Uint8Array([1]) },
                { name: "01.png", bytes: new Uint8Array([2]) },
            ],
        });
        // 失败 run
        seedRun(root, {
            runId: "r_bad",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T11:00:00.000Z",
            status: "failed",
        });
        // 别的镜头
        seedRun(root, {
            runId: "r_other",
            label: "ep:ep01:shot:02",
            startedAt: "2026-10-20T12:00:00.000Z",
            outputs: [{ name: "02.mp4", bytes: new Uint8Array([3]) }],
        });
        assert.equal(
            errorCodeOf(() => finalizeTake({ root, context, shotId: "01", runId: "r_x", source: "ai" })),
            "run_not_found",
        );
        assert.equal(
            errorCodeOf(() => finalizeTake({ root, context, shotId: "01", runId: "r_bad", source: "ai" })),
            "take_invalid",
        );
        assert.equal(
            errorCodeOf(() => finalizeTake({ root, context, shotId: "01", runId: "r_other", source: "ai" })),
            "take_invalid",
        );
        assert.equal(
            errorCodeOf(() =>
                finalizeTake({ root, context, shotId: "01", runId: "r_ok", output: "01.png", source: "ai" }),
            ),
            "take_invalid",
        );
        assert.equal(
            errorCodeOf(() =>
                finalizeTake({ root, context, shotId: "01", runId: "r_ok", output: "nope.mp4", source: "ai" }),
            ),
            "take_invalid",
        );
        // 默认主产物取视频，不会选中 png
        const done = finalizeTake({ root, context, shotId: "01", runId: "r_ok", source: "ai" });
        assert.equal(done.entry.output, "01.mp4");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("定稿记录失效时降级回退并给出原因", () => {
    // 项目根
    const root = setupStory({ name: "takes", version: 2 });
    try {
        // 上下文
        const context = resolveEpisodeContext(root);
        seedRun(root, {
            runId: "r_keep",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: new Uint8Array([1]) }],
        });
        seedRun(root, {
            runId: "r_drop",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-22T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: new Uint8Array([2]) }],
        });
        finalizeTake({ root, context, shotId: "01", runId: "r_keep", source: "ai" });
        assert.equal(finalizedTakeOf(root, context, "01").kind, "finalized");
        // 稿件文件丢失
        rmSync(join(root, "runs", "r_keep", "outputs", "01.mp4"), { force: true });
        const pick = pickShotTake(root, context, "01");
        assert.equal(pick.source, "latest");
        assert.equal(pick.run?.run_id, "r_drop");
        assert.equal(pick.stale?.reason, "artifact_missing");
        // run 记录也没了
        rmSync(join(root, "runs", "r_keep"), { recursive: true, force: true });
        assert.equal(pickShotTake(root, context, "01").stale?.reason, "run_missing");
        // 撤销后不再报失效
        assert.equal(revokeTake({ root, context, shotId: "01", source: "ai" }).changed, true);
        assert.equal(pickShotTake(root, context, "01").stale, null);
        // 本就未定稿 -> 幂等空操作
        assert.equal(revokeTake({ root, context, shotId: "01", source: "ai" }).changed, false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("定稿进度区分有产出未定稿与待拍摄", () => {
    // 项目根
    const root = setupStory({ name: "takes", version: 2 });
    try {
        // 上下文
        const context = resolveEpisodeContext(root);
        seedRun(root, {
            runId: "r_01",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: new Uint8Array([1]) }],
        });
        // 进度
        const counts = takeCounts(root, context, loadEpisodeShots(root, "ep01"));
        assert.equal(counts.total, 2);
        assert.deepEqual(counts.pending, ["01"]);
        assert.deepEqual(counts.unshot, ["02"]);
        assert.equal(counts.finalized, 0);
        // 看板
        const board = shotTakeBoard(root, context, "01", "开场");
        assert.equal(board.state, "pending");
        assert.equal(board.candidates.length, 1);
        assert.match(board.next_actions[0] ?? "", /take finalize 01 --run <run_id> --output 01.mp4/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("story 模式：定稿台账落在剧集目录", () => {
    // 项目根
    const root = setupStory({ name: "takes", version: 2 });
    try {
        // 系列与剧集
        mkdirSync(join(root, "story"), { recursive: true });
        mkdirSync(join(root, "episodes", "ep01"), { recursive: true });
        writeFileSync(
            join(root, "story", "series.json"),
            JSON.stringify({ version: 1, title: "测试系列", created_at: "", updated_at: "" }, null, 2),
        );
        writeFileSync(
            join(root, "episodes", "ep01", "episode.json"),
            JSON.stringify(
                { version: 1, id: "ep01", number: 1, title: "第一集", created_at: "", updated_at: "" },
                null,
                2,
            ),
        );
        writeFileSync(
            join(root, "episodes", "ep01", "shots.json"),
            JSON.stringify(
                {
                    workflow: "t2v",
                    meta: { episode_id: "ep01", width: 64, height: 64, anchors: {} },
                    defaults: {},
                    shots: [{ id: "07", seed: 1, prompt: "a" }],
                },
                null,
                2,
            ),
        );
        // 上下文
        const context = resolveEpisodeContext(root, "ep01");
        // 跨集 run 不能定稿到本集
        seedRun(root, {
            runId: "r_wrong_ep",
            label: "ep:ep02:shot:07",
            episodeId: "ep02",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "07.mp4", bytes: new Uint8Array([1]) }],
        });
        assert.equal(
            errorCodeOf(() => finalizeTake({ root, context, shotId: "07", runId: "r_wrong_ep", source: "ai" })),
            "take_invalid",
        );
        // 本集 run
        seedRun(root, {
            runId: "r_ep",
            label: "ep:ep01:shot:07",
            episodeId: "ep01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "07.mp4", bytes: new Uint8Array([2]) }],
        });
        finalizeTake({ root, context, shotId: "07", runId: "r_ep", source: "ai" });
        assert.equal(takesRelPath(root, context), "episodes/ep01/takes.json");
        assert.equal(pickShotTake(root, context, "07").run?.run_id, "r_ep");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("合片：strict 下未定稿阻断，绕过时回退并警告", async (t) => {
    if (!hasFfmpeg()) {
        t.skip("ffmpeg/ffprobe 不可用");
        return;
    }
    // 项目根（默认 strict）
    const root = setupStory({ name: "takes", version: 2 });
    try {
        // 上下文
        const context = resolveEpisodeContext(root);
        seedRun(root, {
            runId: "w_01_old",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: makeClipBytes("red") }],
        });
        seedRun(root, {
            runId: "w_01_new",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-22T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: makeClipBytes("blue") }],
        });
        seedRun(root, {
            runId: "w_02",
            label: "ep:ep01:shot:02",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "02.mp4", bytes: makeClipBytes("green") }],
        });
        finalizeTake({ root, context, shotId: "02", runId: "w_02", source: "ai" });
        // 01 有产出但未定稿 -> 阻断
        assert.equal(await asyncErrorCode(() => runWrap(commandContext(root), [])), "take_pending");
        // 显式绕过后用最新成功 run 合片
        assert.equal(await runWrap(commandContext(root), ["--allow-incomplete"]), 0);
        // 清单：01 回退，02 定稿
        const manifest = lastManifest(root);
        assert.deepEqual(
            manifest.clips.map((c) => [c.shot, c.run_id, c.source]),
            [
                ["01", "w_01_new", "latest"],
                ["02", "w_02", "finalized"],
            ],
        );
        assert.deepEqual(
            manifest.warnings.map((w) => [w.shot, w.code]),
            [["01", "take_pending"]],
        );
        // 定稿 01 的旧稿件后，合片改选它
        finalizeTake({ root, context, shotId: "01", runId: "w_01_old", source: "ai" });
        assert.equal(await runWrap(commandContext(root), []), 0);
        assert.deepEqual(
            lastManifest(root).clips.map((c) => [c.shot, c.run_id, c.source]),
            [
                ["01", "w_01_old", "finalized"],
                ["02", "w_02", "finalized"],
            ],
        );
        // --select 临时改选，不落台账
        assert.equal(await runWrap(commandContext(root), ["--select", "01=w_01_new"]), 0);
        assert.deepEqual(
            lastManifest(root).clips.map((c) => [c.shot, c.run_id, c.source]),
            [
                ["01", "w_01_new", "explicit"],
                ["02", "w_02", "finalized"],
            ],
        );
        assert.equal(pickShotTake(root, context, "01").run?.run_id, "w_01_old");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("warn 模式不阻断合片，只用最新成功 run 并警告", async (t) => {
    if (!hasFfmpeg()) {
        t.skip("ffmpeg/ffprobe 不可用");
        return;
    }
    // 项目根（warn）
    const root = setupStory({ name: "takes", version: 2, story: { enforce: "warn" } });
    try {
        seedRun(root, {
            runId: "l_01",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: makeClipBytes("red") }],
        });
        seedRun(root, {
            runId: "l_02",
            label: "ep:ep01:shot:02",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "02.mp4", bytes: makeClipBytes("green") }],
        });
        assert.equal(await runWrap(commandContext(root), []), 0);
        // 全部回退
        assert.deepEqual(
            lastManifest(root).clips.map((c) => c.source),
            ["latest", "latest"],
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("接力首帧使用上游定稿稿件；strict 未定稿时阻断", async (t) => {
    if (!hasFfmpeg()) {
        t.skip("ffmpeg/ffprobe 不可用");
        return;
    }
    // 项目根
    const root = setupStory({ name: "takes", version: 2 });
    try {
        // workflow 与 bindings
        mkdirSync(join(root, "workflows"), { recursive: true });
        writeFileSync(
            join(root, "workflows", "t2v.json"),
            JSON.stringify(
                {
                    "0": { class_type: "LoadImage", inputs: { image: "placeholder.png" } },
                    "2": { class_type: "MockSampler", inputs: { seed: 1, steps: 20 } },
                },
                null,
                2,
            ),
        );
        writeFileSync(
            join(root, "workflows", "t2v.bindings.json"),
            JSON.stringify({ prompt: "2.prompt", seed: "2.seed", first_frame: "0.image" }, null, 2),
        );
        // 上下文与分镜
        const context = resolveEpisodeContext(root);
        // 分镜
        const shots: ShotsFile = loadEpisodeShots(root, "ep01");
        seedRun(root, {
            runId: "relay_old",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-20T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: makeClipBytes("red") }],
        });
        seedRun(root, {
            runId: "relay_new",
            label: "ep:ep01:shot:01",
            startedAt: "2026-10-22T10:00:00.000Z",
            outputs: [{ name: "01.mp4", bytes: makeClipBytes("blue") }],
        });
        // strict：上游未定稿 -> 阻断
        assert.equal(await planErrorCode(root, shots, context, true), "take_pending");
        // 定稿旧稿件
        finalizeTake({ root, context, shotId: "01", runId: "relay_old", source: "ai" });
        // 计划应改为抽定稿稿件的尾帧
        const planned = await planShotRuns({
            root,
            project: { name: "takes", version: 2 },
            machine: machineConfig(),
            shots,
            shotIds: ["02"],
            force: true,
            context,
            enforceTakes: true,
            log: () => {},
        });
        // 首帧上传
        const upload = planned.plans[0]?.uploads[0];
        assert.ok(upload);
        assert.equal(upload.logical, "first_frame");
        assert.equal(existsSync(upload.source), true);
        // 缓存名带来源 run：换稿件不会复用旧尾帧
        assert.match(upload.source, /relay_frames\/relay_01_relay_old_to_02\.png$/);
        // 非 strict 时回退最新成功 run
        revokeTake({ root, context, shotId: "01", source: "ai" });
        const loose = await planShotRuns({
            root,
            project: { name: "takes", version: 2 },
            machine: machineConfig(),
            shots,
            shotIds: ["02"],
            force: true,
            context,
            enforceTakes: false,
            log: () => {},
        });
        assert.match(loose.plans[0]?.uploads[0]?.source ?? "", /relay_01_relay_new_to_02\.png$/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

/**
 * strict 下规划接力镜头，返回错误码。
 */
async function planErrorCode(
    root: string,
    shots: ShotsFile,
    context: EpisodeContext,
    enforce: boolean,
): Promise<string> {
    try {
        await planShotRuns({
            root,
            project: { name: "takes", version: 2 },
            machine: machineConfig(),
            shots,
            shotIds: ["02"],
            force: true,
            context,
            enforceTakes: enforce,
            log: () => {},
        });
    } catch (e) {
        if (e instanceof DaoyanCliError) return e.code;
        throw e;
    }
    return "no_error";
}
