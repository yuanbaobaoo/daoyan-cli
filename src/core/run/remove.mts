/** run 产物删除 —— 删除单个产物文件并同步 run.json；被定稿引用时先撤销定稿。 */
import { existsSync, rmSync } from "node:fs";
import { DaoyanCliError } from "../../shared/errors.mts";
import { revokeTakesUsingOutput } from "../story/takes.mts";
import { requireRun, runOutputAbs, writeRun } from "./store.mts";

/**
 * 删除结果。
 */
export interface RemoveRunOutputResult {
    /**
     * run id。
     */
    run_id: string;
    /**
     * 产物文件名。
     */
    output: string;
    /**
     * 相对 run 目录的路径。
     */
    path: string;
    /**
     * 记录中的字节数。
     */
    bytes: number;
    /**
     * 因该产物删除而撤销定稿的镜号。
     */
    revoked_shots: string[];
}

/**
 * 删除 run 的一个产物。
 */
export function removeRunOutput(root: string, runId: string, outputName: string): RemoveRunOutputResult {
    // run 记录
    const run = requireRun(root, runId);
    // 产物记录
    const output = run.outputs.find((o) => o.name === outputName);
    if (output === undefined) {
        throw new DaoyanCliError({
            code: "asset_not_found",
            message: `run ${runId} 没有产物 ${outputName}`,
            hint: "用 daoyan status --task <id> 或 Web 产出物列表确认产物名。",
        });
    }
    // 定稿台账先撤销，避免指向已删除文件
    const revoked = revokeTakesUsingOutput(root, runId, output.name);
    // 文件
    const abs = runOutputAbs(root, run, output);
    if (existsSync(abs)) rmSync(abs, { force: true });
    // 记录（显式例外：产物删除后同步移除 run.json 中的条目）
    run.outputs = run.outputs.filter((o) => o.name !== output.name);
    writeRun(root, run);
    return { run_id: runId, output: output.name, path: output.path, bytes: output.bytes, revoked_shots: revoked };
}
