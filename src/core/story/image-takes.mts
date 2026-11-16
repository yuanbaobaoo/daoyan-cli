/** 图片定稿台账 —— 候选从 runs/ 推导，takes.json 只保存“选哪一张”。
 *  与视频 take 同语义：一图至多一份定稿；定稿产物失效时按门禁回退或阻断。 */
import { existsSync } from "node:fs";
import { DaoyanCliError } from "../../shared/errors.mts";
import { nowIso } from "../../shared/fs.mts";
import type { RunOutput, RunRecord } from "../project/types.mts";
import { isImageOutput, listRuns, pickImageOutput, requireRun, runOutputAbs } from "../run/store.mts";
import { loadStills, loadStillTakes, saveStillTakes, stillTakeOf } from "./stills.mts";
import type { FinalizedTake, StillSpec, StillTakeRecord, TakeHistoryEntry, TakeSourceKind } from "./types.mts";

// 每个图片单元保留的定稿历史条数
const STILL_HISTORY_LIMIT = 10;

/**
 * 图片候选（一次 run 的一张图）。
 */
export interface StillCandidate {
    /**
     * run 记录。
     */
    run: RunRecord;
    /**
     * 图片产物。
     */
    output: RunOutput;
    /**
     * 是否当前定稿。
     */
    selected: boolean;
}

/**
 * 图片单元的候选与定稿摘要。
 */
export interface StillTakeSummary {
    /**
     * 定稿记录。
     */
    finalized: FinalizedTake | null;
    /**
     * 候选列表（时间倒序）。
     */
    candidates: StillCandidate[];
    /**
     * 定稿记录是否已失效。
     */
    stale: { reason: string } | null;
}

/**
 * 校验图片产物在工作区。
 */
function requireImageArtifact(root: string, run: RunRecord, output: RunOutput): RunOutput {
    if (!existsSync(runOutputAbs(root, run, output))) {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `图片产物不在工作区：${run.run_id}/${output.path}`,
            hint: "先 git lfs pull，或改选其他候选。",
        });
    }
    return output;
}

/**
 * 判断定稿是否仍有效。
 */
function finalizedStale(root: string, finalized: FinalizedTake | null): { reason: string } | null {
    if (finalized === null) return null;
    let run: RunRecord | null = null;
    try {
        run = requireRun(root, finalized.run_id);
    } catch {
        return { reason: "run_missing" };
    }
    if (run.status !== "succeeded") return { reason: "run_not_succeeded" };
    const output = run.outputs.find((item) => item.name === finalized.output);
    if (output === undefined) return { reason: "output_missing" };
    if (!isImageOutput(output.name)) return { reason: "not_image" };
    if (!existsSync(runOutputAbs(root, run, output))) return { reason: "file_missing" };
    return null;
}

/**
 * 某图片单元的全部成功图片候选。
 */
export function listStillCandidates(root: string, stillId: string): StillCandidate[] {
    // label
    const label = `img:${stillId}`;
    // 定稿
    const finalized = stillTakeOf(root, stillId)?.finalized ?? null;
    // 候选
    const out: StillCandidate[] = [];
    for (const run of listRuns(root)) {
        if (run.label !== label || run.status !== "succeeded") continue;
        const output = pickImageOutput(run);
        if (output === null) continue;
        out.push({
            run,
            output,
            selected: finalized !== null && finalized.run_id === run.run_id && finalized.output === output.name,
        });
    }
    return out;
}

/**
 * 图片单元的候选与定稿摘要。
 */
export function stillTakeSummary(root: string, stillId: string): StillTakeSummary {
    // 定稿记录
    const finalized = stillTakeOf(root, stillId)?.finalized ?? null;
    return {
        finalized,
        candidates: listStillCandidates(root, stillId),
        stale: finalizedStale(root, finalized),
    };
}

/**
 * 定稿一张图片。
 */
export function finalizeStillTake(opts: {
    root: string;
    stillId: string;
    runId: string;
    output?: string;
    note?: string;
    source: TakeSourceKind;
}): { entry: FinalizedTake; changed: boolean; replaced: boolean } {
    // 图片单元必须存在
    const still = loadStills(opts.root).stills.find((item) => item.id === opts.stillId);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${opts.stillId}` });
    }
    // run
    const run = requireRun(opts.root, opts.runId);
    if (run.label !== `img:${opts.stillId}`) {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `run ${opts.runId} 的 label 是 ${String(run.label ?? "空")}，不是图片单元 ${opts.stillId}`,
            details: { run_id: opts.runId, still_id: opts.stillId, expected_label: `img:${opts.stillId}` },
        });
    }
    if (run.status !== "succeeded") {
        throw new DaoyanCliError({
            code: "take_invalid",
            message: `run ${opts.runId} 状态是 ${run.status}，失败产出不能定稿`,
            details: { run_id: opts.runId, status: run.status },
        });
    }
    // 产物
    let output: RunOutput | null = null;
    if (opts.output !== undefined && opts.output !== "") {
        const hit = run.outputs.find((item) => item.name === opts.output);
        if (hit === undefined) {
            throw new DaoyanCliError({
                code: "take_invalid",
                message: `run ${opts.runId} 没有产物 ${opts.output}`,
                details: { run_id: opts.runId, outputs: run.outputs.map((item) => item.name) },
            });
        }
        if (!isImageOutput(hit.name)) {
            throw new DaoyanCliError({
                code: "take_invalid",
                message: `图片定稿只能选图片产物，${opts.output} 不是`,
                details: { outputs: run.outputs.filter((item) => isImageOutput(item.name)).map((item) => item.name) },
            });
        }
        output = requireImageArtifact(opts.root, run, hit);
    } else {
        output = pickImageOutput(run);
        if (output === null) {
            throw new DaoyanCliError({ code: "take_invalid", message: `run ${opts.runId} 没有图片产物` });
        }
        requireImageArtifact(opts.root, run, output);
    }
    // 台账
    const doc = loadStillTakes(opts.root);
    const record: StillTakeRecord = doc.stills.find((item) => item.still_id === opts.stillId) ?? {
        still_id: opts.stillId,
        finalized: null,
        history: [],
    };
    if (!doc.stills.some((item) => item.still_id === opts.stillId)) doc.stills.push(record);
    // 已有定稿
    const prior = record.finalized;
    const same = prior !== null && prior.run_id === run.run_id && prior.output === output.name;
    // 定稿条目
    const entry: FinalizedTake = {
        run_id: run.run_id,
        output: output.name,
        sha256: output.sha256,
        ...(opts.note !== undefined && opts.note !== "" ? { note: opts.note } : {}),
        source: opts.source,
        finalized_at: same && prior !== null ? prior.finalized_at : nowIso(),
    };
    record.finalized = entry;
    // 历史
    if (!same) {
        // 历史条目
        const historyEntry: TakeHistoryEntry = {
            action: prior === null ? "finalize" : "replace",
            run_id: run.run_id,
            output: output.name,
            source: opts.source,
            at: nowIso(),
            ...(opts.note !== undefined && opts.note !== "" ? { note: opts.note } : {}),
        };
        record.history = [...record.history, historyEntry].slice(-STILL_HISTORY_LIMIT);
    }
    saveStillTakes(opts.root, doc);
    return { entry, changed: !same, replaced: prior !== null && !same };
}

/**
 * 撤销图片定稿。
 */
export function revokeStillTake(opts: { root: string; stillId: string; source: TakeSourceKind }): {
    changed: boolean;
    revoked: FinalizedTake | null;
} {
    // 台账
    const doc = loadStillTakes(opts.root);
    const record = doc.stills.find((item) => item.still_id === opts.stillId);
    if (record === undefined || record.finalized === null) return { changed: false, revoked: null };
    // 被撤销的定稿
    const revoked = record.finalized;
    record.finalized = null;
    record.history = [
        ...record.history,
        {
            action: "revoke",
            run_id: revoked.run_id,
            output: revoked.output,
            source: opts.source,
            at: nowIso(),
        } satisfies TakeHistoryEntry,
    ].slice(-STILL_HISTORY_LIMIT);
    saveStillTakes(opts.root, doc);
    return { changed: true, revoked };
}

/**
 * 撤销所有引用该 run 产物的图片定稿（产物删除前调用）。
 */
export function revokeStillTakesUsingOutput(root: string, runId: string, output: string): string[] {
    // 台账
    const doc = loadStillTakes(root);
    const revoked: string[] = [];
    for (const record of doc.stills) {
        if (record.finalized === null) continue;
        if (record.finalized.run_id !== runId || record.finalized.output !== output) continue;
        const finalized = record.finalized;
        record.finalized = null;
        record.history = [
            ...record.history,
            {
                action: "revoke",
                run_id: finalized.run_id,
                output: finalized.output,
                source: "ai",
                at: nowIso(),
            } satisfies TakeHistoryEntry,
        ].slice(-STILL_HISTORY_LIMIT);
        revoked.push(record.still_id);
    }
    if (revoked.length > 0) saveStillTakes(root, doc);
    return revoked;
}

/**
 * 选择一张图片作为下游输入（定稿优先）。
 */
export function pickStillSource(
    root: string,
    stillId: string,
    enforceFinalized: boolean,
): { run: RunRecord; output: RunOutput; source: "finalized" | "latest"; stale: { reason: string } | null } {
    // 图片单元
    const still: StillSpec | undefined = loadStills(root).stills.find((item) => item.id === stillId);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${stillId}` });
    }
    // 摘要
    const summary = stillTakeSummary(root, stillId);
    if (summary.finalized !== null && summary.stale === null) {
        // 定稿 run
        const run = requireRun(root, summary.finalized.run_id);
        const output = run.outputs.find((item) => item.name === summary.finalized?.output);
        if (output !== undefined) return { run, output, source: "finalized", stale: null };
    }
    // 有定稿但失效 / 未定稿
    if (enforceFinalized && summary.candidates.length > 0) {
        throw new DaoyanCliError({
            code: "take_pending",
            message: `图片单元 ${stillId} 尚未定稿${summary.stale !== null ? "（定稿记录已失效）" : ""}`,
            details: { still_id: stillId, reason: summary.stale?.reason ?? "unfinalized" },
            nextActions: [`image take finalize ${stillId} --run <run_id> --json`, `image take list ${stillId} --json`],
        });
    }
    // 最新成功候选
    const latest = summary.candidates[0];
    if (latest === undefined) {
        throw new DaoyanCliError({
            code: "image_source_invalid",
            message: `图片单元 ${stillId} 还没有成功图片候选`,
            hint: "先执行 daoyan image gen <id> --op t2i --wait。",
        });
    }
    return { run: latest.run, output: latest.output, source: "latest", stale: summary.stale };
}
