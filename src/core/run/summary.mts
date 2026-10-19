/** run 摘要 —— CLI / status 共用的稳定输出结构。
 *  记录里只有相对路径；这里按运行时补 abs_path（不写回记录）。 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { RunRecord } from "../project/types.mts";
import { runDir } from "./store.mts";

/**
 * 产物摘要（含运行时绝对路径）。
 */
export function outputSummaries(root: string, rec: RunRecord): Array<Record<string, unknown>> {
    return rec.outputs.map((o) => {
        // 产物绝对路径
        const abs = join(runDir(root, rec.run_id), o.path);
        return {
            name: o.name,
            path: `runs/${rec.run_id}/${o.path}`,
            abs_path: abs,
            sha256: o.sha256,
            bytes: o.bytes,
            present: existsSync(abs),
        };
    });
}

/**
 * run 摘要。
 */
export function runSummary(root: string, rec: RunRecord): Record<string, unknown> {
    return {
        run_id: rec.run_id,
        task_id: rec.task_id,
        machine_id: rec.machine_id,
        label: rec.label,
        status: rec.status,
        workflow: rec.workflow,
        prompt_id: rec.prompt_id,
        engine: rec.engine,
        ...(rec.gpu !== undefined ? { gpu: rec.gpu } : {}),
        started_at: rec.started_at,
        finished_at: rec.finished_at,
        outputs: outputSummaries(root, rec),
        error: rec.error,
    };
}
