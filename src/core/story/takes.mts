/** 镜头定稿台账 —— 一镜最多一份定稿稿件，供接力首帧与合片选段消费。
 *  只持久化「决定」（run + 稿件名），候选清单永远从 runs/ 实时推导；
 *  未定稿的产出是附加产物，strict 门禁下不得进入下游工作流。 */
import { existsSync } from "node:fs";
import { DaoyanCliError } from "../../shared/errors.mts";
import { nowIso, readJsonIfExists, toPosixRelative, writeJsonAtomic } from "../../shared/fs.mts";
import { RUNS_DIR, type RunOutput, type RunRecord, type ShotsFile } from "../project/types.mts";
import {
    isVideoOutput,
    listRuns,
    pickPrimaryOutput,
    readRun,
    requireRun,
    runOutputAbs,
    runsByLabel,
} from "../run/store.mts";
import { takesPath } from "./paths.mts";
import type {
    EpisodeContext,
    FinalizedTake,
    ShotTakeRecord,
    TakeHistoryEntry,
    TakeSourceKind,
    TakesFile,
} from "./types.mts";

// 每镜保留的历史条数
const TAKE_HISTORY_LIMIT = 10;

/**
 * 定稿稿件的失效原因。
 */
export type TakeStaleReason =
    "run_missing" | "run_not_succeeded" | "label_mismatch" | "output_missing" | "artifact_missing";

/**
 * 定稿查询结果。
 */
export type FinalizedLookup =
    | { kind: "finalized"; run: RunRecord; output: RunOutput; entry: FinalizedTake }
    | { kind: "stale"; run_id: string; reason: TakeStaleReason; message: string }
    | { kind: "none" };

/**
 * 下游选稿结果：定稿优先，其次回退最新成功 run。
 */
export interface ShotTakePick {
    /**
     * 稿件来源：定稿 / 回退最新成功 run / 无可用产出。
     */
    source: "finalized" | "latest" | "none";
    /**
     * 选中的 run。
     */
    run: RunRecord | null;
    /**
     * 选中的稿件。
     */
    output: RunOutput | null;
    /**
     * 定稿记录存在但已失效时的原因。
     */
    stale: { run_id: string; reason: TakeStaleReason; message: string } | null;
}

/**
 * 一镜的候选稿件。
 */
export interface TakeCandidate {
    /**
     * run id。
     */
    run_id: string;
    /**
     * run 终态。
     */
    status: RunRecord["status"];
    /**
     * 开始时间。
     */
    started_at: string;
    /**
     * 结束时间。
     */
    finished_at: string;
    /**
     * 使用的 workflow 相对路径。
     */
    workflow: string;
    /**
     * 种子（bindings 未映射时为 null）。
     */
    seed: number | string | null;
    /**
     * 提示词（bindings 未映射时为 null）。
     */
    prompt: string | null;
    /**
     * 候选稿件列表。
     */
    outputs: Array<{ name: string; path: string; bytes: number; sha256: string; present: boolean; video: boolean }>;
    /**
     * 是否当前定稿稿件。
     */
    finalized: boolean;
    /**
     * 定稿时的记录（仅定稿 run 有）。
     */
    note: string | null;
}

/**
 * 一镜的定稿看板。
 */
export interface ShotTakeBoard {
    /**
     * 镜号。
     */
    shot_id: string;
    /**
     * 镜头标题。
     */
    title: string | null;
    /**
     * 状态：已定稿 / 待定稿 / 无产出。
     */
    state: "finalized" | "pending" | "empty";
    /**
     * 定稿稿件（未定稿为 null）。
     */
    finalized: FinalizedTake | null;
    /**
     * 定稿记录失效原因。
     */
    stale: { run_id: string; reason: TakeStaleReason; message: string } | null;
    /**
     * 成功产出条数。
     */
    succeeded_count: number;
    /**
     * 全部 run 条数。
     */
    runs_count: number;
    /**
     * 候选稿件（按 run 时间倒序）。
     */
    candidates: TakeCandidate[];
    /**
     * 下一步命令。
     */
    next_actions: string[];
}

/**
 * 整集定稿进度。
 */
export interface TakeCounts {
    /**
     * 镜头总数。
     */
    total: number;
    /**
     * 已定稿数。
     */
    finalized: number;
    /**
     * 有产出但未定稿的镜号。
     */
    pending: string[];
    /**
     * 定稿记录已失效的镜号。
     */
    stale: string[];
    /**
     * 尚无任何成功产出的镜号。
     */
    unshot: string[];
}

/**
 * 台账项目内相对路径（提示与文档用）。
 */
export function takesRelPath(root: string, context: EpisodeContext): string {
    return toPosixRelative(root, takesPath(root, context.episode_id));
}

/**
 * 空台账。
 */
export function emptyTakes(episodeId: string | null): TakesFile {
    return { version: 1, episode_id: episodeId, updated_at: "", shots: [] };
}

/**
 * 镜头 label（legacy: shot:<id>；多集: ep:<id>:shot:<id>）。
 */
export function shotLabelOf(context: EpisodeContext, shotId: string): string {
    return `${context.label_prefix}${shotId}`;
}

/**
 * 读取台账；不存在返回空表。
 */
export function loadTakes(root: string, context: EpisodeContext): TakesFile {
    // 台账文件
    const file = takesPath(root, context.episode_id);
    // 已落盘内容
    const raw = readJsonIfExists<TakesFile>(file);
    if (raw === null) return emptyTakes(context.episode_id);
    return {
        version: 1,
        episode_id: context.episode_id,
        updated_at: raw.updated_at ?? "",
        shots: Array.isArray(raw.shots) ? raw.shots : [],
    };
}

/**
 * 原子写台账。
 */
export function saveTakes(root: string, context: EpisodeContext, file: TakesFile): void {
    // 写入内容（时间戳在写前刷新）
    const next: TakesFile = { ...file, episode_id: context.episode_id, updated_at: nowIso() };
    writeJsonAtomic(takesPath(root, context.episode_id), next);
}

/**
 * 取某镜台账记录；不存在返回 null。
 */
export function shotTakeRecord(file: TakesFile, shotId: string): ShotTakeRecord | null {
    return file.shots.find((s) => s.shot_id === shotId) ?? null;
}

/**
 * 定位或新建某镜台账记录。
 */
function upsertShotRecord(file: TakesFile, shotId: string): ShotTakeRecord {
    // 已有记录
    const existing = shotTakeRecord(file, shotId);
    if (existing !== null) return existing;
    // 新记录
    const created: ShotTakeRecord = { shot_id: shotId, finalized: null, history: [] };
    file.shots.push(created);
    return created;
}

/**
 * 追加历史并截断到上限。
 */
function pushHistory(record: ShotTakeRecord, entry: TakeHistoryEntry): void {
    // 合并后的历史
    const merged = [...record.history, entry];
    record.history = merged.slice(-TAKE_HISTORY_LIMIT);
}

/**
 * 校验一条稿件能否定稿；返回选中的稿件。
 */
export function validateTakeTarget(
    root: string,
    context: EpisodeContext,
    shotId: string,
    run: RunRecord,
    outputName?: string,
): RunOutput {
    // 本镜 label
    const label = shotLabelOf(context, shotId);
    if (run.label !== label) {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `run ${run.run_id} 的 label 是 ${String(run.label ?? "空")}，不是镜 ${shotId} 的 ${label}`,
            details: { run_id: run.run_id, shot_id: shotId, expected_label: label, actual_label: run.label },
        });
    }
    if (!context.legacy && run.episode_id !== context.episode_id) {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `run ${run.run_id} 属于剧集 ${String(run.episode_id ?? "未归属")}，不是 ${String(context.episode_id)}`,
            details: { run_id: run.run_id, episode_id: run.episode_id ?? null },
        });
    }
    if (run.status !== "succeeded") {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `run ${run.run_id} 状态是 ${run.status}，未定稿的失败产出不可选为定稿稿件`,
            details: { run_id: run.run_id, status: run.status },
        });
    }
    // 视频稿件集合
    const videos = run.outputs.filter((o) => isVideoOutput(o.name));
    // 指定稿件
    if (outputName !== undefined && outputName !== "") {
        // 命中产物
        const hit = run.outputs.find((o) => o.name === outputName);
        if (hit === undefined) {
            throw new DaoyanCliError({
                code: "take_invalid",
                message: `run ${run.run_id} 没有产物 ${outputName}`,
                details: { run_id: run.run_id, outputs: run.outputs.map((o) => o.name) },
            });
        }
        if (!isVideoOutput(hit.name)) {
            throw new DaoyanCliError({
                code: "take_invalid",
                message: `定稿稿件必须是视频片段，${outputName} 不是`,
                details: { run_id: run.run_id, outputs: videos.map((o) => o.name) },
                hint: "从视频产物里选择，或去掉 --output 用默认主产物。",
            });
        }
        return requireArtifact(root, run, hit);
    }
    // 默认主产物
    const primary = pickPrimaryOutput(run);
    if (primary === null) {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `run ${run.run_id} 没有可定稿的产物`,
            details: { run_id: run.run_id },
        });
    }
    if (!isVideoOutput(primary.name)) {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `run ${run.run_id} 的主产物 ${primary.name} 不是视频片段`,
            details: { run_id: run.run_id, outputs: run.outputs.map((o) => o.name) },
            hint: "用 --output <视频产物名> 显式指定定稿稿件。",
        });
    }
    return requireArtifact(root, run, primary);
}

/**
 * 校验稿件在工作区存在。
 */
function requireArtifact(root: string, run: RunRecord, output: RunOutput): RunOutput {
    // 绝对路径
    const abs = runOutputAbs(root, run, output);
    if (!existsSync(abs)) {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `稿件文件不在工作区：${run.run_id}/${output.path}`,
            details: { run_id: run.run_id, output: output.name },
            hint: "先 git lfs pull 拉回产物，或改选其他稿件。",
        });
    }
    return output;
}

/**
 * 定稿某镜（重复定稿同一稿件只更新时间戳，换稿件记 replace）。
 */
export function finalizeTake(opts: {
    root: string;
    context: EpisodeContext;
    shotId: string;
    runId: string;
    output?: string;
    note?: string;
    source: TakeSourceKind;
}): { record: ShotTakeRecord; entry: FinalizedTake; changed: boolean; replaced: boolean } {
    // run 记录
    const run = requireRun(opts.root, opts.runId);
    // 选中的稿件
    const output = validateTakeTarget(opts.root, opts.context, opts.shotId, run, opts.output);
    // 当前台账
    const file = loadTakes(opts.root, opts.context);
    // 本镜记录
    const record = upsertShotRecord(file, opts.shotId);
    // 前一份定稿
    const prior = record.finalized;
    // 同一稿件的重复定稿
    if (prior !== null && prior.run_id === run.run_id && prior.output === output.name) {
        // 时间戳
        const at = nowIso();
        // 更新后的记录
        record.finalized = {
            ...prior,
            note: opts.note !== undefined && opts.note !== "" ? opts.note : prior.note,
            source: opts.source,
            finalized_at: at,
        };
        saveTakes(opts.root, opts.context, file);
        return { record, entry: record.finalized, changed: false, replaced: false };
    }
    // 新的定稿记录
    const entry: FinalizedTake = {
        run_id: run.run_id,
        output: output.name,
        sha256: output.sha256,
        ...(opts.note !== undefined && opts.note !== "" ? { note: opts.note } : {}),
        source: opts.source,
        finalized_at: nowIso(),
    };
    record.finalized = entry;
    pushHistory(record, {
        action: prior === null ? "finalize" : "replace",
        run_id: run.run_id,
        output: output.name,
        source: opts.source,
        at: entry.finalized_at,
        ...(opts.note !== undefined && opts.note !== "" ? { note: opts.note } : {}),
    });
    saveTakes(opts.root, opts.context, file);
    return { record, entry, changed: true, replaced: prior !== null };
}

/**
 * 撤销某镜定稿；本就未定稿时是幂等空操作。
 */
export function revokeTake(opts: { root: string; context: EpisodeContext; shotId: string; source: TakeSourceKind }): {
    record: ShotTakeRecord | null;
    revoked: FinalizedTake | null;
    changed: boolean;
} {
    // 当前台账
    const file = loadTakes(opts.root, opts.context);
    // 本镜记录
    const record = shotTakeRecord(file, opts.shotId);
    if (record === null || record.finalized === null) return { record, revoked: null, changed: false };
    // 被撤销的定稿
    const prior = record.finalized;
    record.finalized = null;
    pushHistory(record, {
        action: "revoke",
        run_id: prior.run_id,
        output: prior.output,
        source: opts.source,
        at: nowIso(),
    });
    saveTakes(opts.root, opts.context, file);
    return { record, revoked: prior, changed: true };
}

/**
 * 查询某镜的定稿稿件，并校验它仍然可用。
 */
export function finalizedTakeOf(root: string, context: EpisodeContext, shotId: string): FinalizedLookup {
    // 台账记录
    const record = shotTakeRecord(loadTakes(root, context), shotId);
    // 定稿条目
    const entry = record?.finalized ?? null;
    if (entry === null) return { kind: "none" };
    // 指向的 run
    const run = readRun(root, entry.run_id);
    if (run === null) {
        return {
            kind: "stale",
            run_id: entry.run_id,
            reason: "run_missing",
            message: `定稿记录的 run ${entry.run_id} 已不存在`,
        };
    }
    if (run.label !== shotLabelOf(context, shotId)) {
        return {
            kind: "stale",
            run_id: entry.run_id,
            reason: "label_mismatch",
            message: `定稿记录的 run ${entry.run_id} 的 label 已不是 ${shotLabelOf(context, shotId)}`,
        };
    }
    if (run.status !== "succeeded") {
        return {
            kind: "stale",
            run_id: entry.run_id,
            reason: "run_not_succeeded",
            message: `定稿记录的 run ${entry.run_id} 状态是 ${run.status}`,
        };
    }
    // 稿件
    const output = run.outputs.find((o) => o.name === entry.output);
    if (output === undefined) {
        return {
            kind: "stale",
            run_id: entry.run_id,
            reason: "output_missing",
            message: `定稿稿件 ${entry.output} 不在 run ${entry.run_id} 的产物里`,
        };
    }
    if (!existsSync(runOutputAbs(root, run, output))) {
        return {
            kind: "stale",
            run_id: entry.run_id,
            reason: "artifact_missing",
            message: `定稿稿件 ${entry.run_id}/${entry.output} 不在工作区（可能未 git lfs pull）`,
        };
    }
    return { kind: "finalized", run, output, entry };
}

/**
 * 下游选稿：定稿优先，否则回退最新成功 run（由调用方决定 strict 是否放行）。
 */
export function pickShotTake(root: string, context: EpisodeContext, shotId: string, pool?: RunRecord[]): ShotTakePick {
    // 定稿查询
    const lookup = finalizedTakeOf(root, context, shotId);
    if (lookup.kind === "finalized") {
        return { source: "finalized", run: lookup.run, output: lookup.output, stale: null };
    }
    // 失效原因
    const stale =
        lookup.kind === "stale" ? { run_id: lookup.run_id, reason: lookup.reason, message: lookup.message } : null;
    // 候选 run 池
    const runs = pool ?? listRuns(root);
    // 最新成功 run
    const latest = runs.find((r) => r.label === shotLabelOf(context, shotId) && r.status === "succeeded") ?? null;
    if (latest === null) return { source: "none", run: null, output: null, stale };
    return { source: "latest", run: latest, output: pickPrimaryOutput(latest), stale };
}

/**
 * 构建某镜的定稿看板（候选稿件 + 定稿标记）。
 */
export function shotTakeBoard(
    root: string,
    context: EpisodeContext,
    shotId: string,
    title: string | null,
): ShotTakeBoard {
    // 本镜全部 run
    const runs = runsByLabel(root, shotLabelOf(context, shotId));
    // 定稿查询
    const lookup = finalizedTakeOf(root, context, shotId);
    // 定稿条目
    const entry = lookup.kind === "finalized" ? lookup.entry : null;
    // 候选稿件
    const candidates: TakeCandidate[] = runs.map((run) => ({
        run_id: run.run_id,
        status: run.status,
        started_at: run.started_at,
        finished_at: run.finished_at,
        workflow: run.workflow.path,
        seed: typeof run.inputs.seed === "number" || typeof run.inputs.seed === "string" ? run.inputs.seed : null,
        prompt: typeof run.inputs.prompt === "string" ? run.inputs.prompt : null,
        outputs: run.outputs.map((o) => ({
            name: o.name,
            path: `${RUNS_DIR}/${run.run_id}/${o.path}`,
            bytes: o.bytes,
            sha256: o.sha256,
            present: existsSync(runOutputAbs(root, run, o)),
            video: isVideoOutput(o.name),
        })),
        finalized: entry !== null && entry.run_id === run.run_id,
        note: entry !== null && entry.run_id === run.run_id ? (entry.note ?? null) : null,
    }));
    // 成功条数
    const succeeded = runs.filter((r) => r.status === "succeeded").length;
    // 未定稿时建议的第一条可定稿稿件
    const suggestion = candidates.find((c) => c.status === "succeeded")?.outputs.find((o) => o.video) ?? null;
    return {
        shot_id: shotId,
        title,
        state: entry !== null ? "finalized" : succeeded > 0 ? "pending" : "empty",
        finalized: entry,
        stale:
            lookup.kind === "stale" ? { run_id: lookup.run_id, reason: lookup.reason, message: lookup.message } : null,
        succeeded_count: succeeded,
        runs_count: runs.length,
        candidates,
        next_actions: buildBoardActions(shotId, entry !== null, suggestion),
    };
}

/**
 * 看板下一步命令。
 */
function buildBoardActions(shotId: string, finalized: boolean, suggestion: { name: string } | null): string[] {
    if (finalized) return [`take revoke ${shotId} --json`, "wrap --json"];
    if (suggestion !== null) return [`take finalize ${shotId} --run <run_id> --output ${suggestion.name} --json`];
    return [`shot ${shotId} --wait --json`];
}

/**
 * 整集定稿进度。
 */
export function takeCounts(root: string, context: EpisodeContext, shots: ShotsFile): TakeCounts {
    // 候选 run 池（一次读取，逐镜复用）
    const pool = listRuns(root);
    // 有产出未定稿
    const pending: string[] = [];
    // 定稿记录失效
    const stale: string[] = [];
    // 无成功产出
    const unshot: string[] = [];
    // 已定稿数
    let finalized = 0;
    for (const shot of shots.shots) {
        // 本镜选稿结果
        const pick = pickShotTake(root, context, shot.id, pool);
        if (pick.source === "finalized") {
            finalized++;
            continue;
        }
        if (pick.stale !== null) stale.push(shot.id);
        if (pick.source === "none") unshot.push(shot.id);
        else pending.push(shot.id);
    }
    return { total: shots.shots.length, finalized, pending, stale, unshot };
}
