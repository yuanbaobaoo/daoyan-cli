/** take —— 镜头定稿台账：把某镜的一次产出选为该镜的定稿稿件。
 *  未定稿的产出只是附加产物；strict 门禁下只有定稿稿件能进入下游接力与合片。 */
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { parseFlags, requireFlag, strFlag, usageError } from "../shared/args.mts";
import { requireProject } from "../core/project/config.mts";
import { resolveEpisodeContext } from "../core/story/paths.mts";
import { loadContextShots, storyEnforceOf } from "../core/story/production.mts";
import {
    finalizeTake,
    pickShotTake,
    revokeTake,
    shotTakeBoard,
    takeCounts,
    takesRelPath,
} from "../core/story/takes.mts";
import type { ShotTakeBoard } from "../core/story/takes.mts";
import type { TakeSourceKind } from "../core/story/types.mts";
import type { ShotsFile } from "../core/project/types.mts";

/**
 * take 命令入口。
 */
export async function runTake(ctx: CliContext, args: string[]): Promise<number> {
    // 子命令
    const [action, ...rest] = args;
    if (action === "list") return takeList(ctx, rest);
    if (action === "finalize") return takeFinalize(ctx, rest);
    if (action === "revoke") return takeRevoke(ctx, rest);
    usageError("用法：daoyan take list|finalize|revoke（见 daoyan help take）");
}

/**
 * 解析 --source（定稿者来源，默认 ai）。
 */
function takeSource(parsed: ReturnType<typeof parseFlags>): TakeSourceKind {
    // 原始值
    const value = strFlag(parsed, "--source") ?? "ai";
    if (value !== "ai" && value !== "user") usageError("--source 必须是 ai|user");
    return value;
}

/**
 * 确认镜号存在于本集分镜；空列表表示全部镜头。
 */
function requireShotIds(shots: ShotsFile, ids: string[]): string[] {
    if (ids.length === 0) return shots.shots.map((s) => s.id);
    for (const id of ids) {
        if (!shots.shots.some((s) => s.id === id)) {
            throw new DaoyanCliError({
                code: "usage",
                message: `未知镜号 ${id}；可用：${shots.shots.map((s) => s.id).join(" ")}`,
                exit: 2,
            });
        }
    }
    return ids;
}

/**
 * 镜头标题（展示用，回退 slug）。
 */
function shotTitle(shots: ShotsFile, shotId: string): string | null {
    // 目标镜头
    const shot = shots.shots.find((s) => s.id === shotId);
    if (shot === undefined) return null;
    return shot.title ?? shot.slug ?? null;
}

/**
 * take list [镜号...] —— 各镜候选稿件与定稿状态。
 */
async function takeList(ctx: CliContext, args: string[]): Promise<number> {
    // 解析结果
    const parsed = parseFlags(args, { "--episode": "string" });
    const { root, config: project } = requireProject(ctx);
    // 剧集上下文
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    // 本集分镜
    const shots = loadContextShots(root, context);
    // 目标镜号
    const ids = requireShotIds(shots, parsed.positionals);
    // 看板列表
    const boards = ids.map((id) => shotTakeBoard(root, context, id, shotTitle(shots, id)));
    // 整集进度
    const counts = takeCounts(root, context, shots);
    // 数据信封
    const data = {
        episode_id: context.episode_id,
        takes_file: takesRelPath(root, context),
        enforce: storyEnforceOf(project),
        summary: {
            total: counts.total,
            finalized: counts.finalized,
            pending: counts.pending.length,
            stale: counts.stale.length,
            unshot: counts.unshot.length,
            pending_ids: counts.pending,
            stale_ids: counts.stale,
            unshot_ids: counts.unshot,
        },
        shots: boards,
    };
    if (ctx.json) {
        emitData(data);
        return 0;
    }
    for (const board of boards) say(renderBoardLine(board));
    say(
        `定稿进度 ${counts.finalized}/${counts.total}（有产出未定稿 ${counts.pending.length}，待拍摄 ${counts.unshot.length}）`,
    );
    if (counts.stale.length > 0) say(`定稿记录失效：${counts.stale.join(" ")}（需重新定稿）`);
    return 0;
}

/**
 * 一行看板文本。
 */
function renderBoardLine(board: ShotTakeBoard): string {
    // 定稿条目
    const entry = board.finalized;
    if (entry !== null)
        return `镜 ${board.shot_id}  已定稿  ${entry.run_id}  ${entry.output}  （共 ${board.succeeded_count} 条产出）`;
    if (board.state === "pending") return `镜 ${board.shot_id}  待定稿  ${board.succeeded_count} 条产出可选`;
    return `镜 ${board.shot_id}  无产出  需拍摄`;
}

/**
 * take finalize <镜号> --run <run_id> —— 定稿某镜。
 */
async function takeFinalize(ctx: CliContext, args: string[]): Promise<number> {
    // 解析结果
    const parsed = parseFlags(args, {
        "--run": "string",
        "--output": "string",
        "--note": "string",
        "--source": "string",
        "--episode": "string",
    });
    // 镜号
    const shotId = parsed.positionals[0];
    if (shotId === undefined || shotId === "") usageError("缺少镜号，如 daoyan take finalize 03 --run <run_id>");
    if (parsed.positionals.length > 1) usageError(`未知参数 ${parsed.positionals.slice(1).join(" ")}`);
    const { root } = requireProject(ctx);
    // 剧集上下文
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    // 本集分镜
    const shots = loadContextShots(root, context);
    requireShotIds(shots, [shotId]);
    // 定稿结果
    const result = finalizeTake({
        root,
        context,
        shotId,
        runId: requireFlag(parsed, "--run"),
        ...(strFlag(parsed, "--output") !== undefined ? { output: strFlag(parsed, "--output") as string } : {}),
        ...(strFlag(parsed, "--note") !== undefined ? { note: strFlag(parsed, "--note") as string } : {}),
        source: takeSource(parsed),
    });
    // 该镜看板（取下一步命令）
    const board = shotTakeBoard(root, context, shotId, shotTitle(shots, shotId));
    // 数据信封
    const data = {
        episode_id: context.episode_id,
        shot_id: shotId,
        run_id: result.entry.run_id,
        output: result.entry.output,
        changed: result.changed,
        replaced: result.replaced,
        take: result.entry,
        takes_file: takesRelPath(root, context),
        next_actions: board.next_actions,
    };
    if (ctx.json) {
        emitData(data);
        return 0;
    }
    say(
        result.changed
            ? `镜 ${shotId} 已定稿：${result.entry.run_id} / ${result.entry.output}`
            : `镜 ${shotId} 已是该定稿稿件（${result.entry.run_id} / ${result.entry.output}）`,
    );
    say(`台账：${takesRelPath(root, context)}`);
    return 0;
}

/**
 * take revoke <镜号> —— 撤销定稿（本就未定稿时是幂等空操作）。
 */
async function takeRevoke(ctx: CliContext, args: string[]): Promise<number> {
    // 解析结果
    const parsed = parseFlags(args, { "--source": "string", "--episode": "string" });
    // 镜号
    const shotId = parsed.positionals[0];
    if (shotId === undefined || shotId === "") usageError("缺少镜号，如 daoyan take revoke 03");
    if (parsed.positionals.length > 1) usageError(`未知参数 ${parsed.positionals.slice(1).join(" ")}`);
    const { root } = requireProject(ctx);
    // 剧集上下文
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    // 本集分镜
    const shots = loadContextShots(root, context);
    requireShotIds(shots, [shotId]);
    // 撤销结果
    const result = revokeTake({ root, context, shotId, source: takeSource(parsed) });
    // 撤销后的回退选稿
    const pick = pickShotTake(root, context, shotId);
    // 数据信封
    const data = {
        episode_id: context.episode_id,
        shot_id: shotId,
        changed: result.changed,
        revoked: result.revoked,
        fallback:
            pick.run !== null
                ? { source: pick.source, run_id: pick.run.run_id, output: pick.output?.name ?? null }
                : null,
    };
    if (ctx.json) {
        emitData(data);
        return 0;
    }
    if (!result.changed) {
        say(`镜 ${shotId} 本就未定稿`);
        return 0;
    }
    say(`镜 ${shotId} 已撤销定稿：${String(result.revoked?.run_id ?? "")}`);
    if (pick.run !== null) say(`下游回退到最新成功 run ${pick.run.run_id}（未定稿）`);
    return 0;
}
