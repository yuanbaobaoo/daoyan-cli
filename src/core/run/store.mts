/** run store —— 每次执行生成不可变快照：runs/<run_id>/
 *  ├── run.json        终态记录（无绝对路径）
 *  ├── workflow.json   实际提交给引擎的图
 *  ├── inputs.json     逻辑输入与输入文件哈希
 *  ├── inputs/         输入副本（锚点/接力帧）
 *  └── outputs/        引擎产物下载
 *  重拍不覆盖：run_id 唯一。 */
import { copyFileSync, existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { ensureDir, makeId, nowIso, readJsonIfExists, sha256, writeJsonAtomic } from "../../shared/fs.mts";
import {
    INPUTS_DIR,
    RUN_FILE,
    RUN_INPUTS_FILE,
    RUN_WORKFLOW_FILE,
    RUNS_DIR,
    type JsonValue,
    type RunOutput,
    type RunRecord,
} from "../project/types.mts";

/**
 * 生成 run id：<timestamp>-<machine>-<suffix>。
 */
export function newRunId(machineId: string): string {
    return makeId(machineId);
}

/**
 * run 目录绝对路径。
 */
export function runDir(root: string, runId: string): string {
    return join(root, RUNS_DIR, runId);
}

/**
 * run 目录内的相对路径（记录用）。
 */
export function runRel(runId: string, ...parts: string[]): string {
    return [RUNS_DIR, runId, ...parts].join("/");
}

/**
 * 创建 run 目录骨架。
 */
export function createRunDir(root: string, runId: string): string {
    // run 根目录
    const dir = runDir(root, runId);
    ensureDir(join(dir, INPUTS_DIR));
    ensureDir(join(dir, "outputs"));
    return dir;
}

/**
 * 写入工作流快照。
 */
export function writeWorkflowSnapshot(root: string, runId: string, graph: unknown): void {
    writeJsonAtomic(join(runDir(root, runId), RUN_WORKFLOW_FILE), graph);
}

/**
 * 写入逻辑输入与输入文件清单。
 */
export function writeInputsSnapshot(
    root: string,
    runId: string,
    inputs: Record<string, JsonValue>,
    files: Array<{ name: string; sha256: string; bytes: number }>,
): void {
    writeJsonAtomic(join(runDir(root, runId), RUN_INPUTS_FILE), { inputs, files });
}

/**
 * 复制输入文件进 run 目录（保留安全文件名）。
 */
export function copyRunInput(
    root: string,
    runId: string,
    source: string,
    desiredName?: string,
): { name: string; sha256: string; bytes: number } {
    if (!existsSync(source)) {
        throw new DaoyanCliError({ code: "config_invalid", message: `输入文件不存在：${source}` });
    }
    // 安全文件名（去目录，避免路径穿越）
    const name = basename(desiredName ?? source).replace(/[^A-Za-z0-9._-]/g, "_");
    // run inputs 目录
    const dir = join(runDir(root, runId), INPUTS_DIR);
    ensureDir(dir);
    // 目标路径
    const dest = join(dir, name);
    copyFileSync(source, dest);
    // 文件字节
    const bytes = new Uint8Array(readFileSync(dest));
    return { name, sha256: sha256(bytes), bytes: bytes.byteLength };
}

/**
 * 写入一个产物文件，返回记录。
 */
export function writeRunOutput(root: string, runId: string, filename: string, bytes: Uint8Array): RunOutput {
    // 安全文件名
    const safe = basename(filename).replace(/[^A-Za-z0-9._-]/g, "_") || "output.bin";
    // 输出目录
    const dir = join(runDir(root, runId), "outputs");
    ensureDir(dir);
    // 处理重名（同一 run 内极少见）
    let name = safe;
    for (let i = 1; existsSync(join(dir, name)); i++) {
        // 扩展名位置
        const dot = safe.lastIndexOf(".");
        name = dot > 0 ? `${safe.slice(0, dot)}_${i}${safe.slice(dot)}` : `${safe}_${i}`;
    }
    // 落盘
    writeFileAtomicBytes(join(dir, name), bytes);
    return { name, path: `outputs/${name}`, sha256: sha256(bytes), bytes: bytes.byteLength };
}

/**
 * 字节原子写（内部工具）。
 */
function writeFileAtomicBytes(file: string, bytes: Uint8Array): void {
    // 写临时文件再 rename
    const tmp = `${file}.tmp-${process.pid}`;
    writeFileSync(tmp, bytes);
    renameSync(tmp, file);
}

/**
 * 写入终态 run.json。
 */
export function writeRun(root: string, record: RunRecord): void {
    writeJsonAtomic(join(runDir(root, record.run_id), RUN_FILE), record);
}

/**
 * 读取 run.json。
 */
export function readRun(root: string, runId: string): RunRecord | null {
    return readJsonIfExists<RunRecord>(join(root, RUNS_DIR, runId, RUN_FILE));
}

/**
 * 读取 run.json；缺失抛 run_not_found。
 */
export function requireRun(root: string, runId: string): RunRecord {
    // 读取结果
    const rec = readRun(root, runId);
    if (rec === null) {
        throw new DaoyanCliError({ code: "run_not_found", message: `未找到 run ${runId}` });
    }
    return rec;
}

/**
 * 列出全部 run（按目录名倒序 = 时间倒序）。
 */
export function listRuns(root: string): RunRecord[] {
    // runs 根目录
    const dir = join(root, RUNS_DIR);
    if (!existsSync(dir)) return [];
    // 记录列表
    const out: RunRecord[] = [];
    // 逐个目录读取 run.json
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        // 当前 run 记录
        const rec = readRun(root, ent.name);
        if (rec !== null) out.push(rec);
    }
    // 按开始时间倒序（同一 timestamp 再按 run_id）
    return out.sort((a, b) => b.started_at.localeCompare(a.started_at) || b.run_id.localeCompare(a.run_id));
}

/**
 * 找某 label 的最新成功 run。
 */
export function latestSucceededRun(root: string, label: string): RunRecord | null {
    // 命中 label 的成功 run
    const hits = listRuns(root).filter((r) => r.label === label && r.status === "succeeded");
    return hits[0] ?? null;
}

/**
 * 找某 label 的任意状态最新 run（断点续跑跳过判定用）。
 */
export function latestRunByLabel(root: string, label: string): RunRecord | null {
    return listRuns(root).filter((r) => r.label === label)[0] ?? null;
}

/**
 * 产物绝对路径（供 wrap / relay 使用，不写入记录）。
 */
export function runOutputAbs(root: string, record: RunRecord, output: RunOutput): string {
    return join(runDir(root, record.run_id), output.path);
}

/**
 * run 创建时间（run 目录名可作为 fallback）。
 */
export function runStartedAt(record: RunRecord): string {
    return record.started_at !== "" ? record.started_at : nowIso();
}
