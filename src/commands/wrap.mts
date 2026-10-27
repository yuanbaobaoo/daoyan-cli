/** wrap —— 杀青合片：按分镜顺序从定稿台账选取稿件，ffmpeg concat 交付 final/。
 *  --shots 只合指定镜号；未定稿镜头按 project.story.enforce 决定阻断或回退最新成功 run；
 *  CPU 后处理，不占 machine lock；重拍不覆盖（cut-<timestamp>.mp4 + manifest）。 */
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { requireProject } from "../core/project/config.mts";
import { resolveEpisodeContext } from "../core/story/paths.mts";
import { buildFinal } from "../core/story/final.mts";

/**
 * wrap 命令入口。
 */
export async function runWrap(ctx: CliContext, args: string[]): Promise<number> {
    // --select 镜号=run_id
    const explicit = new Map<string, string>();
    // --episode
    let episode: string | undefined;
    // 是否显式绕过定稿门禁
    let allowIncomplete = false;
    // --shots 镜号子集
    const shotFilter: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const { name, inline } = splitInlineFlag(args[i] ?? "");
        if (name === "--select") {
            const v = takeValue(args, i, inline, "--select");
            const eq = v.value.indexOf("=");
            if (eq <= 0) usageError(`--select 需要 <镜号>=<run_id>（收到 ${v.value}）`);
            explicit.set(v.value.slice(0, eq), v.value.slice(eq + 1));
            i += v.skip;
            continue;
        }
        if (name === "--episode") {
            // --episode 取值
            const v = takeValue(args, i, inline, "--episode");
            episode = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--shots") {
            // --shots 逗号分隔
            const v = takeValue(args, i, inline, "--shots");
            const ids = v.value
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id !== "");
            if (ids.length === 0) usageError("--shots 需要至少一个镜号");
            for (const id of ids) if (!shotFilter.includes(id)) shotFilter.push(id);
            i += v.skip;
            continue;
        }
        if (name === "--allow-incomplete") {
            allowIncomplete = true;
            continue;
        }
        usageError(`未知参数 ${name}`);
    }

    const { root, config: project } = requireProject(ctx);
    // 剧集上下文
    const context = resolveEpisodeContext(root, episode);
    // 合片结果
    const result = await buildFinal({
        root,
        project,
        context,
        ...(shotFilter.length > 0 ? { shots: shotFilter } : {}),
        selects: explicit,
        allowIncomplete,
        log: (message) => {
            if (!ctx.json) say(message);
        },
    });
    if (ctx.json) {
        emitData(result);
        return 0;
    }
    if (result.missing.length > 0) say(`注意：${result.missing.length} 镜未完成未纳入（${result.missing.join(" ")}）`);
    for (const w of result.warnings) say(`注意：${w.message}`);
    say(`合片完成：${result.output}`);
    say(`清单：${result.manifest}`);
    return 0;
}
