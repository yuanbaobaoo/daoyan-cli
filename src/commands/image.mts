/** image 命令族 —— 图片单元、图片库与操作配置。
 *  写入统一走 story/stills；校验走 story/stills-validate。 */
import { readFileSync } from "node:fs";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import {
    boolFlag,
    parseFlags,
    parseJsonValue,
    splitInlineFlag,
    strFlag,
    takeValue,
    usageError,
} from "../shared/args.mts";
import { loadMachine, loadMachineIfExists, requireProject } from "../core/project/config.mts";
import type { ImageOp, JsonValue } from "../core/project/types.mts";
import { enqueueRunTask } from "./run.mts";
import {
    addStill,
    addStillRef,
    addStillRefBytes,
    imageOpsStatus,
    imageSourceAbsPath,
    loadStills,
    parseImageSource,
    parseStillOwner,
    removeStill,
    removeStillRef,
    requireStillRef,
    resolveImageSource,
    updateStill,
    type StillPatch,
} from "../core/story/stills.mts";
import { finalizeStillTake, pickStillSource, revokeStillTake, stillTakeSummary } from "../core/story/image-takes.mts";
import { addAsset, parseAssetOwner } from "../core/story/assets.mts";
import { optimizePrompt } from "../core/story/prompt-optimizer.mts";
import { boxMaskPng } from "../core/media/png.mts";
import { imageSizeOf } from "../core/media/image-size.mts";
import type { StillRefRole, StillSpec } from "../core/story/types.mts";

/**
 * 读取文本输入（- = stdin）。
 */
function readTextInput(file: string | undefined, label: string): string {
    if (file === undefined || file === "") usageError(`需要 ${label}`);
    try {
        return readFileSync(file === "-" ? 0 : file, "utf8");
    } catch (e) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `读取 ${file} 失败：${e instanceof Error ? e.message : String(e)}`,
        });
    }
}

/**
 * 输出数据或人类文本。
 */
function output(ctx: CliContext, data: Record<string, unknown>, lines: string[]): void {
    if (ctx.json) {
        emitData(data);
        return;
    }
    for (const line of lines) say(line);
}

/**
 * 解析非负整数 flag。
 */
function nonNegativeInt(parsed: ReturnType<typeof parseFlags>, name: string): number | undefined {
    // 原始值
    const raw = strFlag(parsed, name);
    if (raw === undefined) return undefined;
    // 数值
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) usageError(`${name} 需要非负整数（收到 ${raw}）`);
    return value;
}

/**
 * 解析正整数 flag。
 */
function positiveInt(parsed: ReturnType<typeof parseFlags>, name: string): number | undefined {
    // 原始值
    const raw = strFlag(parsed, name);
    if (raw === undefined) return undefined;
    // 数值
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) usageError(`${name} 需要正整数（收到 ${raw}）`);
    return value;
}

/**
 * 从 set --file 读取补丁。
 */
function patchFromFile(file: string | undefined): StillPatch {
    // 空补丁
    if (file === undefined || file === "") return {};
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(readTextInput(file, "--file"));
    } catch (e) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `${file} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
        });
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        usageError("--file 必须是 JSON 对象");
    }
    // 允许的字段
    const allowed = new Set([
        "title",
        "set",
        "owner",
        "form",
        "episode_id",
        "shot_id",
        "prompt",
        "negative",
        "seed",
        "width",
        "height",
        "workflow",
        "source",
        "mask",
        "asset_slots",
        "params",
        "notes",
    ]);
    // 未知字段
    const unknown = Object.keys(raw).filter((key) => !allowed.has(key));
    if (unknown.length > 0) usageError(`--file 含未知字段：${unknown.join(", ")}`);
    return raw as StillPatch;
}

/**
 * 图片输入的展示视图。
 */
function sourceView(root: string, raw: string | null | undefined): Record<string, unknown> | null {
    if (raw === undefined || raw === null || raw === "") return null;
    try {
        return { ...resolveImageSource(root, raw), raw };
    } catch (e) {
        return { raw, error: e instanceof Error ? e.message : String(e), present: false };
    }
}

/**
 * 图片单元展示视图。
 */
function stillView(root: string, still: StillSpec): Record<string, unknown> {
    // 候选与定稿摘要
    const take = stillTakeSummary(root, still.id);
    return {
        ...still,
        source_view: sourceView(root, still.source),
        mask_view: sourceView(root, still.mask),
        slots: Object.entries(still.asset_slots ?? {}).map(([slot, value]) => ({
            slot,
            value,
            resolved: sourceView(root, `asset:${value}`),
        })),
        take: {
            finalized: take.finalized,
            stale: take.stale,
            candidates: take.candidates.map((item) => ({
                run_id: item.run.run_id,
                op: item.run.op ?? null,
                output: item.output.name,
                selected: item.selected,
                bytes: item.output.bytes,
                started_at: item.run.started_at,
            })),
        },
    };
}

/**
 * image new。
 */
function imageNew(ctx: CliContext, root: string, rest: string[]): number {
    // 参数
    const parsed = parseFlags(rest, {
        "--title": "string",
        "--set": "string",
        "--set-title": "string",
        "--owner": "string",
        "--form": "string",
        "--episode": "string",
        "--shot": "string",
        "--prompt": "string",
        "--prompt-file": "string",
        "--negative": "string",
        "--seed": "string",
        "--width": "string",
        "--height": "string",
        "--workflow": "string",
        "--source": "string",
        "--mask": "string",
        "--notes": "string",
    });
    // 单元 id
    const id = parsed.positionals[0];
    if (id === undefined || parsed.positionals.length > 1) usageError("用法：daoyan image new <id> [flags]");
    // 提示词
    const promptFlag = strFlag(parsed, "--prompt");
    const promptFile = strFlag(parsed, "--prompt-file");
    if (promptFlag !== undefined && promptFile !== undefined) usageError("--prompt 与 --prompt-file 只能二选一");
    const prompt = promptFlag ?? (promptFile !== undefined ? readTextInput(promptFile, "--prompt-file") : undefined);
    // 新建
    const still = addStill(
        root,
        {
            id,
            ...(strFlag(parsed, "--title") !== undefined ? { title: strFlag(parsed, "--title") as string } : {}),
            ...(strFlag(parsed, "--set") !== undefined ? { set: strFlag(parsed, "--set") as string } : {}),
            ...(strFlag(parsed, "--set-title") !== undefined
                ? { setTitle: strFlag(parsed, "--set-title") as string }
                : {}),
            ...(strFlag(parsed, "--owner") !== undefined ? { owner: strFlag(parsed, "--owner") as string } : {}),
            ...(strFlag(parsed, "--form") !== undefined ? { form: strFlag(parsed, "--form") as string } : {}),
            ...(strFlag(parsed, "--episode") !== undefined
                ? { episode_id: strFlag(parsed, "--episode") as string }
                : {}),
            ...(strFlag(parsed, "--shot") !== undefined ? { shot_id: strFlag(parsed, "--shot") as string } : {}),
            ...(prompt !== undefined ? { prompt } : {}),
            ...(strFlag(parsed, "--negative") !== undefined
                ? { negative: strFlag(parsed, "--negative") as string }
                : {}),
            ...(nonNegativeInt(parsed, "--seed") !== undefined ? { seed: nonNegativeInt(parsed, "--seed") } : {}),
            ...(positiveInt(parsed, "--width") !== undefined ? { width: positiveInt(parsed, "--width") } : {}),
            ...(positiveInt(parsed, "--height") !== undefined ? { height: positiveInt(parsed, "--height") } : {}),
            ...(strFlag(parsed, "--workflow") !== undefined
                ? { workflow: strFlag(parsed, "--workflow") as string }
                : {}),
            ...(strFlag(parsed, "--source") !== undefined ? { source: strFlag(parsed, "--source") as string } : {}),
            ...(strFlag(parsed, "--mask") !== undefined ? { mask: strFlag(parsed, "--mask") as string } : {}),
            ...(strFlag(parsed, "--notes") !== undefined ? { notes: strFlag(parsed, "--notes") as string } : {}),
        },
        "ai",
    );
    output(ctx, { still, stills_file: "stills/stills.json" }, [`图片单元已创建：${still.id}`]);
    return 0;
}

/**
 * image list。
 */
function imageList(ctx: CliContext, root: string, rest: string[]): number {
    // 参数
    const parsed = parseFlags(rest, {
        "--set": "string",
        "--owner": "string",
        "--episode": "string",
        "--shot": "string",
    });
    if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
    // 过滤
    const doc = loadStills(root);
    const setFilter = strFlag(parsed, "--set");
    const ownerFilter = strFlag(parsed, "--owner");
    const episodeFilter = strFlag(parsed, "--episode");
    const shotFilter = strFlag(parsed, "--shot");
    const stills = doc.stills.filter((still) => {
        if (setFilter !== undefined && still.set !== setFilter) return false;
        if (ownerFilter !== undefined && still.owner !== ownerFilter) return false;
        if (episodeFilter !== undefined && still.episode_id !== episodeFilter) return false;
        if (shotFilter !== undefined && still.shot_id !== shotFilter) return false;
        return true;
    });
    output(ctx, { stills, total: stills.length, sets: doc.sets, refs: doc.refs, updated_at: doc.updated_at }, [
        `图片单元 ${stills.length} / ${doc.stills.length}（图片集 ${doc.sets.length}，图片库 ${doc.refs.length}）`,
        ...stills.map(
            (still) =>
                `${still.id}  ${still.set ?? "-"}  ${still.owner ?? "独立"}  ${still.episode_id ?? ""}${still.shot_id !== null && still.shot_id !== undefined ? `/${still.shot_id}` : ""}  ${still.title ?? ""}`,
        ),
    ]);
    return 0;
}

/**
 * image show。
 */
function imageShow(ctx: CliContext, root: string, rest: string[]): number {
    // 参数
    const parsed = parseFlags(rest, {});
    const id = parsed.positionals[0];
    if (id === undefined || parsed.positionals.length > 1) usageError("用法：daoyan image show <id>");
    // 注册表
    const doc = loadStills(root);
    const still = doc.stills.find((item) => item.id === id);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
    }
    // 视图
    const view = stillView(root, still);
    output(ctx, { still: view, stills_file: "stills/stills.json", updated_at: doc.updated_at }, [
        `图片单元：${still.id}${still.title !== undefined ? `（${still.title}）` : ""}`,
        `提示词：${still.prompt ?? ""}`,
        `归属：${still.owner ?? "独立"}${still.form !== null && still.form !== undefined ? `/${still.form}` : ""}`,
        `来源：${still.source ?? "无"}  遮罩：${still.mask ?? "无"}`,
    ]);
    return 0;
}

/**
 * image set。
 */
function imageSet(ctx: CliContext, root: string, rest: string[]): number {
    // 参数
    const parsed = parseFlags(rest, {
        "--title": "string",
        "--set": "string",
        "--owner": "string",
        "--form": "string",
        "--episode": "string",
        "--shot": "string",
        "--prompt": "string",
        "--prompt-file": "string",
        "--negative": "string",
        "--seed": "string",
        "--width": "string",
        "--height": "string",
        "--workflow": "string",
        "--source": "string",
        "--mask": "string",
        "--clear-source": "boolean",
        "--clear-mask": "boolean",
        "--notes": "string",
        "--file": "string",
        "--base-updated-at": "string",
        "--by": "string",
    });
    const id = parsed.positionals[0];
    if (id === undefined || parsed.positionals.length > 1) usageError("用法：daoyan image set <id> [flags]");
    // 提示词
    const promptFlag = strFlag(parsed, "--prompt");
    const promptFile = strFlag(parsed, "--prompt-file");
    if (promptFlag !== undefined && promptFile !== undefined) usageError("--prompt 与 --prompt-file 只能二选一");
    const prompt = promptFlag ?? (promptFile !== undefined ? readTextInput(promptFile, "--prompt-file") : undefined);
    // 补丁
    const patch: StillPatch = {
        ...patchFromFile(strFlag(parsed, "--file")),
        ...(strFlag(parsed, "--title") !== undefined ? { title: strFlag(parsed, "--title") as string } : {}),
        ...(strFlag(parsed, "--set") !== undefined ? { set: strFlag(parsed, "--set") as string } : {}),
        ...(strFlag(parsed, "--owner") !== undefined ? { owner: strFlag(parsed, "--owner") as string } : {}),
        ...(strFlag(parsed, "--form") !== undefined ? { form: strFlag(parsed, "--form") as string } : {}),
        ...(strFlag(parsed, "--episode") !== undefined ? { episode_id: strFlag(parsed, "--episode") as string } : {}),
        ...(strFlag(parsed, "--shot") !== undefined ? { shot_id: strFlag(parsed, "--shot") as string } : {}),
        ...(prompt !== undefined ? { prompt } : {}),
        ...(strFlag(parsed, "--negative") !== undefined ? { negative: strFlag(parsed, "--negative") as string } : {}),
        ...(nonNegativeInt(parsed, "--seed") !== undefined ? { seed: nonNegativeInt(parsed, "--seed") } : {}),
        ...(positiveInt(parsed, "--width") !== undefined ? { width: positiveInt(parsed, "--width") } : {}),
        ...(positiveInt(parsed, "--height") !== undefined ? { height: positiveInt(parsed, "--height") } : {}),
        ...(strFlag(parsed, "--workflow") !== undefined ? { workflow: strFlag(parsed, "--workflow") as string } : {}),
        ...(strFlag(parsed, "--source") !== undefined ? { source: strFlag(parsed, "--source") as string } : {}),
        ...(strFlag(parsed, "--mask") !== undefined ? { mask: strFlag(parsed, "--mask") as string } : {}),
        ...(boolFlag(parsed, "--clear-source") ? { source: null } : {}),
        ...(boolFlag(parsed, "--clear-mask") ? { mask: null } : {}),
        ...(strFlag(parsed, "--notes") !== undefined ? { notes: strFlag(parsed, "--notes") as string } : {}),
    };
    if (boolFlag(parsed, "--clear-source") && strFlag(parsed, "--source") !== undefined) {
        usageError("--source 与 --clear-source 只能二选一");
    }
    if (boolFlag(parsed, "--clear-mask") && strFlag(parsed, "--mask") !== undefined) {
        usageError("--mask 与 --clear-mask 只能二选一");
    }
    // 操作者来源
    const sourceBy = strFlag(parsed, "--by") ?? "ai";
    if (sourceBy !== "ai" && sourceBy !== "user") usageError("--by 只接受 ai / user");
    // 更新
    const still = updateStill(root, id, patch, {
        source: sourceBy,
        ...(strFlag(parsed, "--base-updated-at") !== undefined
            ? { baseUpdatedAt: strFlag(parsed, "--base-updated-at") as string }
            : {}),
    });
    output(ctx, { still, stills_file: "stills/stills.json" }, [`图片单元已更新：${still.id}`]);
    return 0;
}

/**
 * image remove。
 */
function imageRemove(ctx: CliContext, root: string, rest: string[]): number {
    // 参数
    const parsed = parseFlags(rest, { "--force": "boolean" });
    const id = parsed.positionals[0];
    if (id === undefined || parsed.positionals.length > 1) usageError("用法：daoyan image remove <id> [--force]");
    // 删除
    const still = removeStill(root, id, boolFlag(parsed, "--force"));
    output(ctx, { removed: still }, [`图片单元已删除：${still.id}`]);
    return 0;
}

/**
 * image ref add/list/remove。
 */
function imageRef(ctx: CliContext, root: string, args: string[]): number {
    // 子命令
    const [action, ...rest] = args;
    if (action === "add") {
        // 参数
        const parsed = parseFlags(rest, {
            "--id": "string",
            "--role": "string",
            "--title": "string",
        });
        const file = parsed.positionals[0];
        if (file === undefined || parsed.positionals.length > 1) {
            usageError("用法：daoyan image ref add <file> [--id <id>] [--role reference|mask] [--title <t>]");
        }
        // 角色
        const role = strFlag(parsed, "--role") ?? "reference";
        if (role !== "reference" && role !== "mask") usageError("--role 只接受 reference / mask");
        // 入库
        const ref = addStillRef({
            root,
            file,
            ...(strFlag(parsed, "--id") !== undefined ? { id: strFlag(parsed, "--id") as string } : {}),
            role: role as StillRefRole,
            ...(strFlag(parsed, "--title") !== undefined ? { title: strFlag(parsed, "--title") as string } : {}),
        });
        output(ctx, { ref }, [`图片已入库：${ref.id}（${ref.role}）`, ref.path]);
        return 0;
    }
    if (action === "list") {
        // 参数
        const parsed = parseFlags(rest, {});
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 列表
        const doc = loadStills(root);
        output(ctx, { refs: doc.refs, total: doc.refs.length }, [
            `图片库 ${doc.refs.length} 项`,
            ...doc.refs.map((ref) => `${ref.id}  ${ref.role}  ${ref.path}`),
        ]);
        return 0;
    }
    if (action === "remove") {
        // 参数
        const parsed = parseFlags(rest, { "--force": "boolean" });
        const id = parsed.positionals[0];
        if (id === undefined || parsed.positionals.length > 1) {
            usageError("用法：daoyan image ref remove <id> [--force]");
        }
        // 删除
        const ref = removeStillRef(root, id, boolFlag(parsed, "--force"));
        output(ctx, { removed: ref }, [`图片库条目已删除：${ref.id}`]);
        return 0;
    }
    // 只读确认（避免未使用导入）
    if (action === "show") {
        const parsed = parseFlags(rest, {});
        const id = parsed.positionals[0];
        if (id === undefined) usageError("用法：daoyan image ref show <id>");
        output(ctx, { ref: requireStillRef(root, id) }, [`图片库条目：${id}`]);
        return 0;
    }
    usageError("用法：daoyan image ref add|list|remove");
}

/**
 * image gen。
 */
async function imageGen(ctx: CliContext, root: string, rest: string[]): Promise<number> {
    const { config: project } = requireProject(ctx);
    const machine = loadMachine(root);
    // 目标 / 操作 / 覆盖
    const ids: string[] = [];
    const sets: Record<string, JsonValue> = {};
    let op: string | undefined;
    let source: string | undefined;
    let mask: string | undefined;
    let requestId: string | undefined;
    let engineUrl: string | undefined;
    let timeoutHours: number | undefined;
    let wait = false;
    for (let i = 0; i < rest.length; i++) {
        const raw = rest[i] ?? "";
        const { name, inline } = splitInlineFlag(raw);
        if (name === "--op") {
            const value = takeValue(rest, i, inline, "--op");
            op = value.value;
            i += value.skip;
            continue;
        }
        if (name === "--source") {
            const value = takeValue(rest, i, inline, "--source");
            source = value.value;
            i += value.skip;
            continue;
        }
        if (name === "--mask") {
            const value = takeValue(rest, i, inline, "--mask");
            mask = value.value;
            i += value.skip;
            continue;
        }
        if (name === "--set") {
            const value = takeValue(rest, i, inline, "--set");
            const eq = value.value.indexOf("=");
            if (eq <= 0) usageError(`--set 需要 key=value（收到 ${value.value}）`);
            sets[value.value.slice(0, eq)] = parseJsonValue(value.value.slice(eq + 1)) as JsonValue;
            i += value.skip;
            continue;
        }
        if (name === "--steps") {
            const value = takeValue(rest, i, inline, "--steps");
            const steps = Number(value.value);
            if (!Number.isInteger(steps) || steps <= 0) usageError("--steps 需要正整数");
            sets.steps = steps;
            i += value.skip;
            continue;
        }
        if (name === "--request-id") {
            const value = takeValue(rest, i, inline, "--request-id");
            requestId = value.value;
            i += value.skip;
            continue;
        }
        if (name === "--engine") {
            const value = takeValue(rest, i, inline, "--engine");
            engineUrl = value.value;
            i += value.skip;
            continue;
        }
        if (name === "--timeout") {
            const value = takeValue(rest, i, inline, "--timeout");
            timeoutHours = Number(value.value);
            if (!Number.isFinite(timeoutHours) || timeoutHours <= 0) usageError("--timeout 需要正数（小时）");
            i += value.skip;
            continue;
        }
        if (name === "--wait") {
            wait = true;
            continue;
        }
        if (name.startsWith("-")) usageError(`未知参数 ${name}`);
        ids.push(name);
    }
    if (ids.length === 0) usageError("缺少图片单元 id，如 daoyan image gen cover-main --op t2i");
    if (op === undefined) usageError("需要 --op t2i|i2i|upscale|inpaint");
    if (op !== "t2i" && op !== "i2i" && op !== "upscale" && op !== "inpaint") {
        usageError("--op 只接受 t2i / i2i / upscale / inpaint");
    }
    // 提前校验 id
    const doc = loadStills(root);
    for (const id of ids) {
        if (!doc.stills.some((still) => still.id === id)) {
            throw new DaoyanCliError({
                code: "image_not_found",
                message: `未找到图片单元 ${id}`,
                details: { stills: doc.stills.map((still) => still.id) },
            });
        }
    }
    return enqueueRunTask({
        ctx,
        root,
        project,
        machine,
        command: `image gen ${ids.join(" ")} --op ${op}`,
        kind: "image",
        episodeId: null,
        ...(requestId !== undefined ? { requestId } : {}),
        options: {
            stills: ids,
            op: op as ImageOp,
            force: true,
            sets,
            ...(source !== undefined ? { image_source: source } : {}),
            ...(mask !== undefined ? { image_mask: mask } : {}),
            ...(timeoutHours !== undefined ? { timeout_ms: Math.round(timeoutHours * 3_600_000) } : {}),
            ...(engineUrl !== undefined ? { engine_url: engineUrl } : {}),
        },
        wait,
    });
}

/**
 * image take list/finalize/revoke。
 */
function imageTake(ctx: CliContext, root: string, args: string[]): number {
    const [action, ...rest] = args;
    if (action === "list") {
        const parsed = parseFlags(rest, {});
        const ids = parsed.positionals;
        const doc = loadStills(root);
        const targets = ids.length > 0 ? ids : doc.stills.map((still) => still.id);
        const items = targets.map((id) => {
            if (!doc.stills.some((still) => still.id === id)) {
                throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
            }
            const summary = stillTakeSummary(root, id);
            return {
                still_id: id,
                finalized: summary.finalized,
                stale: summary.stale,
                candidates: summary.candidates.map((item) => ({
                    run_id: item.run.run_id,
                    op: item.run.op ?? null,
                    output: item.output.name,
                    selected: item.selected,
                    bytes: item.output.bytes,
                    started_at: item.run.started_at,
                })),
            };
        });
        output(ctx, { stills: items, total: items.length }, [
            `图片定稿：${items.filter((item) => item.finalized !== null).length}/${items.length}`,
            ...items.map(
                (item) =>
                    `${item.finalized !== null ? "✓" : " "} ${item.still_id}  候选 ${item.candidates.length}  ${
                        item.finalized !== null ? `${item.finalized.run_id}/${item.finalized.output}` : "未定稿"
                    }`,
            ),
        ]);
        return 0;
    }
    if (action === "finalize") {
        const parsed = parseFlags(rest, {
            "--run": "string",
            "--output": "string",
            "--note": "string",
            "--by": "string",
        });
        const id = parsed.positionals[0];
        if (id === undefined || parsed.positionals.length > 1) {
            usageError("用法：daoyan image take finalize <id> --run <run_id> [--output <产物>]");
        }
        const runId = strFlag(parsed, "--run");
        if (runId === undefined) usageError("缺少 --run");
        const by = strFlag(parsed, "--by") ?? "ai";
        if (by !== "ai" && by !== "user") usageError("--by 只接受 ai / user");
        const result = finalizeStillTake({
            root,
            stillId: id,
            runId,
            ...(strFlag(parsed, "--output") !== undefined ? { output: strFlag(parsed, "--output") as string } : {}),
            ...(strFlag(parsed, "--note") !== undefined ? { note: strFlag(parsed, "--note") as string } : {}),
            source: by,
        });
        output(
            ctx,
            {
                still_id: id,
                run_id: result.entry.run_id,
                output: result.entry.output,
                changed: result.changed,
                replaced: result.replaced,
                take: result.entry,
            },
            [`图片定稿：${id} → ${result.entry.run_id}/${result.entry.output}`],
        );
        return 0;
    }
    if (action === "revoke") {
        const parsed = parseFlags(rest, { "--by": "string" });
        const id = parsed.positionals[0];
        if (id === undefined || parsed.positionals.length > 1) {
            usageError("用法：daoyan image take revoke <id> [--by ai|user]");
        }
        const by = strFlag(parsed, "--by") ?? "ai";
        if (by !== "ai" && by !== "user") usageError("--by 只接受 ai / user");
        const result = revokeStillTake({ root, stillId: id, source: by });
        output(ctx, { still_id: id, changed: result.changed, revoked: result.revoked }, [
            result.changed ? `已撤销图片定稿：${id}` : `图片单元 ${id} 本就没有定稿`,
        ]);
        return 0;
    }
    usageError("用法：daoyan image take list|finalize|revoke");
}

/**
 * image prompt optimize/set/list。
 */
async function imagePrompt(ctx: CliContext, root: string, args: string[]): Promise<number> {
    const [action, ...rest] = args;
    if (action === "optimize") {
        const parsed = parseFlags(rest, { "--apply": "boolean", "--all": "boolean" });
        const doc = loadStills(root);
        const ids = boolFlag(parsed, "--all") ? doc.stills.map((still) => still.id) : parsed.positionals;
        if (ids.length === 0) usageError("缺少图片单元 id，或加 --all");
        if (boolFlag(parsed, "--all") && parsed.positionals.length > 0) {
            usageError("--all 与显式 id 只能二选一");
        }
        const machine = loadMachineIfExists(root);
        const results = [];
        for (const id of ids) {
            results.push(
                await optimizePrompt({
                    root,
                    stillId: id,
                    machine,
                    apply: boolFlag(parsed, "--apply"),
                }),
            );
        }
        output(
            ctx,
            { results, total: results.length },
            results.map((item) =>
                item.mode === "agent"
                    ? `${item.still_id}：未配置 LLM，已返回 Agent 改写上下文`
                    : `${item.still_id}：${item.applied ? "已应用" : "建议"} ${item.proposed_prompt ?? ""}`,
            ),
        );
        return 0;
    }
    if (action === "set") {
        const parsed = parseFlags(rest, { "--text": "string", "--file": "string", "--by": "string" });
        const id = parsed.positionals[0];
        if (id === undefined || parsed.positionals.length > 1) {
            usageError("用法：daoyan image prompt set <id> (--text <文本>|--file <file|->) [--by ai|user]");
        }
        const textFlag = strFlag(parsed, "--text");
        const fileFlag = strFlag(parsed, "--file");
        if (textFlag !== undefined && fileFlag !== undefined) usageError("--text 与 --file 只能二选一");
        if (textFlag === undefined && fileFlag === undefined) usageError("需要 --text 或 --file");
        const text = textFlag ?? readTextInput(fileFlag, "--file");
        const by = strFlag(parsed, "--by") ?? "ai";
        if (by !== "ai" && by !== "user") usageError("--by 只接受 ai / user");
        const still = updateStill(root, id, { prompt: text }, { source: by });
        output(ctx, { still, revision: still.prompt_revisions?.[still.prompt_revisions.length - 1] ?? null }, [
            `提示词已更新：${id}`,
        ]);
        return 0;
    }
    if (action === "list") {
        const parsed = parseFlags(rest, {});
        const id = parsed.positionals[0];
        if (id === undefined || parsed.positionals.length > 1) usageError("用法：daoyan image prompt list <id>");
        const still = loadStills(root).stills.find((item) => item.id === id);
        if (still === undefined) {
            throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
        }
        const revisions = still.prompt_revisions ?? [];
        output(ctx, { still_id: id, prompt: still.prompt ?? "", revisions, total: revisions.length }, [
            `提示词修订 ${revisions.length} 条`,
            ...revisions.map((item) => `v${item.revision} [${item.source}] ${item.text}`),
        ]);
        return 0;
    }
    usageError("用法：daoyan image prompt optimize|set|list");
}

/**
 * image promote —— 把定稿图入库为角色 / 场景资产。
 */
function imagePromote(ctx: CliContext, root: string, rest: string[]): number {
    const parsed = parseFlags(rest, {
        "--asset": "string",
        "--set-reference": "boolean",
        "--replace": "boolean",
    });
    const id = parsed.positionals[0];
    if (id === undefined || parsed.positionals.length > 1) {
        usageError("用法：daoyan image promote <id> --asset <asset-id> [--set-reference] [--replace]");
    }
    const assetId = strFlag(parsed, "--asset");
    if (assetId === undefined) usageError("缺少 --asset");
    // 图片单元
    const still = loadStills(root).stills.find((item) => item.id === id);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
    }
    if (still.owner === undefined || still.owner === null || still.owner === "") {
        usageError("图片单元没有 owner；先 image set <id> --owner character:<id> --form <form> 或 scene:<id>");
    }
    const summary = stillTakeSummary(root, id);
    if (summary.finalized === null || summary.stale !== null) {
        throw new DaoyanCliError({
            code: "take_pending",
            message: `图片单元 ${id} 尚未定稿，不能入库`,
            nextActions: [`image take finalize ${id} --run <run_id> --json`],
        });
    }
    // owner
    const parsedOwner = parseStillOwner(still.owner, still.form);
    const owner = parseAssetOwner(`${parsedOwner.kind}:${parsedOwner.id}`, parsedOwner.form ?? undefined);
    const result = addAsset({
        root,
        owner,
        assetId,
        fromRun: summary.finalized.run_id,
        output: summary.finalized.output,
        setReference: boolFlag(parsed, "--set-reference"),
        replace: boolFlag(parsed, "--replace"),
    });
    output(
        ctx,
        { asset: result.asset, reference_set: result.reference_set, warning: result.warning },
        [
            `已入库：${result.asset.path}`,
            result.reference_set ? "已设为主参考" : "未设为主参考（用 story asset set-reference 指定）",
            result.warning ?? "",
        ].filter((line) => line !== ""),
    );
    return 0;
}

/**
 * image mask add —— 生成矩形遮罩并登记到图片库。
 */
function imageMask(ctx: CliContext, root: string, args: string[]): number {
    const [action, ...rest] = args;
    if (action !== "add") usageError("用法：daoyan image mask add <still> --box x,y,w,h [--width W --height H]");
    const parsed = parseFlags(rest, { "--box": "string", "--width": "string", "--height": "string" });
    const id = parsed.positionals[0];
    if (id === undefined || parsed.positionals.length > 1) {
        usageError("用法：daoyan image mask add <still> --box x,y,w,h [--width W --height H]");
    }
    const boxText = strFlag(parsed, "--box");
    if (boxText === undefined) usageError("缺少 --box x,y,w,h");
    const parts = boxText.split(",").map((item) => Number(item.trim()));
    if (parts.length !== 4 || parts.some((item) => !Number.isFinite(item))) {
        usageError("--box 需要 x,y,w,h（数字）");
    }
    // 图片单元
    const still = loadStills(root).stills.find((item) => item.id === id);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${id}` });
    }
    // 显式尺寸
    let width = strFlag(parsed, "--width") !== undefined ? Number(strFlag(parsed, "--width")) : undefined;
    let height = strFlag(parsed, "--height") !== undefined ? Number(strFlag(parsed, "--height")) : undefined;
    if (width !== undefined && (!Number.isInteger(width) || width <= 0)) usageError("--width 需要正整数");
    if (height !== undefined && (!Number.isInteger(height) || height <= 0)) usageError("--height 需要正整数");
    // 从输入图推断尺寸
    if (width === undefined || height === undefined) {
        const descriptor =
            still.source !== undefined && still.source !== null && still.source !== ""
                ? still.source
                : (() => {
                      try {
                          const picked = pickStillSource(root, id, false);
                          return `run:${picked.run.run_id}/${picked.output.name}`;
                      } catch {
                          return null;
                      }
                  })();
        if (descriptor === null) {
            usageError("图片单元没有输入图；请传 --width/--height");
        }
        const resolved = resolveImageSource(root, descriptor as string);
        const abs = imageSourceAbsPath(root, resolved);
        if (abs === null) {
            usageError("无法定位输入图；请传 --width/--height");
        }
        const size = imageSizeOf(new Uint8Array(readFileSync(abs as string)));
        if (size === null) usageError("无法读取输入图尺寸；请传 --width/--height");
        width = width ?? size.width;
        height = height ?? size.height;
    }
    // 遮罩
    const bytes = boxMaskPng(width as number, height as number, {
        x: parts[0] as number,
        y: parts[1] as number,
        width: parts[2] as number,
        height: parts[3] as number,
    });
    const ref = addStillRefBytes({
        root,
        bytes,
        id: `mask-${id}-${Date.now().toString(36)}`,
        role: "mask",
        title: `${id} 遮罩`,
    });
    updateStill(root, id, { mask: `ref:${ref.id}` }, { source: "ai" });
    output(ctx, { ref, still_id: id, mask: `ref:${ref.id}`, width, height }, [
        `遮罩已生成：${ref.path}（${width}×${height}）`,
        `已设为图片单元 ${id} 的默认遮罩`,
    ]);
    return 0;
}

/**
 * image ops。
 */
function imageOps(ctx: CliContext, root: string, rest: string[]): number {
    // 参数
    const parsed = parseFlags(rest, {});
    if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
    // 项目
    const project = requireProject(ctx).config;
    // 状态
    const ops = imageOpsStatus(root, project, loadMachineIfExists(root));
    output(
        ctx,
        { ops, ready: ops.filter((item) => item.ready).length, total: ops.length },
        ops.map(
            (item) =>
                `${item.ready ? "✓" : "✗"} ${item.op}  ${item.workflow ?? item.backend ?? ""}${
                    item.issues.length > 0 ? `  ${item.issues.join("；")}` : ""
                }`,
        ),
    );
    return 0;
}

/**
 * image 命令入口。
 */
export async function runImage(ctx: CliContext, args: string[]): Promise<number> {
    // 子命令
    const [action, ...rest] = args;
    // 项目
    const { root } = requireProject(ctx);
    if (action === "new") return imageNew(ctx, root, rest);
    if (action === "list") return imageList(ctx, root, rest);
    if (action === "show") return imageShow(ctx, root, rest);
    if (action === "set") return imageSet(ctx, root, rest);
    if (action === "remove") return imageRemove(ctx, root, rest);
    if (action === "ref") return imageRef(ctx, root, rest);
    if (action === "gen") return imageGen(ctx, root, rest);
    if (action === "take") return imageTake(ctx, root, rest);
    if (action === "prompt") return imagePrompt(ctx, root, rest);
    if (action === "promote") return imagePromote(ctx, root, rest);
    if (action === "mask") return imageMask(ctx, root, rest);
    if (action === "ops") return imageOps(ctx, root, rest);
    usageError("用法：daoyan image new|list|show|set|remove|ref|gen|take|prompt|promote|mask|ops");
}
