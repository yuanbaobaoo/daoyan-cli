/** story 命令族 —— 多集剧本、全局设定集、拆解、资产、分镜与门禁状态。
 *  写入统一走 story/store / story/assets；校验统一走 story/validate。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { nowIso, sha256File, writeJsonAtomic } from "../shared/fs.mts";
import { requireProject } from "../core/project/config.mts";
import type { ShotsFile } from "../core/project/types.mts";
import {
    episodeDir,
    listEpisodeMetas,
    readEpisodeMeta,
    readSeries,
    resolveEpisodeContext,
    seriesPath,
    storyEnabled,
} from "../core/story/paths.mts";
import {
    addEpisode,
    approveScript,
    initStory,
    loadBreakdown,
    loadCharacters,
    loadScenes,
    loadScriptMeta,
    loadScriptText,
    loadVoices,
    saveBreakdown,
    saveCharacters,
    saveEpisodeShots,
    saveScenes,
    saveVoices,
    syncScript,
    updateEpisode,
} from "../core/story/store.mts";
import {
    checkBreakdownForWrite,
    checkCharactersDocForWrite,
    checkScenesDocForWrite,
    checkShotsForWrite,
    checkVoicesDocForWrite,
    computeEpisodeStoryStatus,
    computeSeriesStoryStatus,
    validateStory,
} from "../core/story/validate.mts";
import {
    addAsset as addStoryAsset,
    listAssets,
    parseAssetOwner,
    removeAsset,
    setReferenceAsset,
} from "../core/story/assets.mts";
import type { BreakdownFile, StoryCharactersFile, StoryScenesFile, StoryVoicesFile } from "../core/story/types.mts";

/**
 * 解析后的 flag。
 */
interface ParsedArgs {
    /**
     * 位置参数。
     */
    positionals: string[];
    /**
     * flag 值（boolean 为 true）。
     */
    values: Record<string, string | boolean>;
}

/**
 * 通用 flag 解析。
 */
function parseFlags(args: string[], spec: Record<string, "string" | "boolean">): ParsedArgs {
    // 结果
    const out: ParsedArgs = { positionals: [], values: {} };
    for (let i = 0; i < args.length; i++) {
        // 原始参数
        const raw = args[i] ?? "";
        // 解构值
        const { name, inline } = splitInlineFlag(raw);
        if (name.startsWith("-")) {
            // 期望类型
            const kind = spec[name];
            if (kind === undefined) usageError(`未知参数 ${name}`);
            if (kind === "boolean") {
                if (inline !== undefined) usageError(`${name} 不接受值`);
                out.values[name] = true;
                continue;
            }
            // 字符串值
            const v = takeValue(args, i, inline, name);
            out.values[name] = v.value;
            i += v.skip;
            continue;
        }
        out.positionals.push(name);
    }
    return out;
}

/**
 * 取字符串 flag。
 */
function strFlag(parsed: ParsedArgs, name: string): string | undefined {
    // 值
    const value = parsed.values[name];
    return typeof value === "string" ? value : undefined;
}

/**
 * 取 boolean flag。
 */
function boolFlag(parsed: ParsedArgs, name: string): boolean {
    return parsed.values[name] === true;
}

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
 * 读取 JSON 输入（- = stdin）。
 */
function readJsonInput(file: string | undefined, label: string): unknown {
    // 原始文本
    const text = readTextInput(file, label);
    try {
        return JSON.parse(text) as unknown;
    } catch (e) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: `${file} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
        });
    }
}

/**
 * 要求对象。
 */
function requireRecord(value: unknown, label: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new DaoyanCliError({ code: "story_invalid", message: `${label} 必须是 JSON 对象` });
    }
    return value as Record<string, unknown>;
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
 * 校验错误转 story_invalid。
 */
function throwIssues(issues: Array<{ severity: string; message: string }>, label: string): void {
    // 错误
    const errors = issues.filter((i) => i.severity === "error");
    if (errors.length === 0) return;
    throw new DaoyanCliError({
        code: "story_invalid",
        message: `${label} 校验失败（${errors.length} 项错误）`,
        details: { issues },
    });
}

/**
 * story init。
 */
async function storyInit(ctx: CliContext, args: string[]): Promise<number> {
    // 解析结果
    const parsed = parseFlags(args, { "--json": "boolean" });
    if (parsed.positionals.length > 0) usageError(`story init 不接受参数：${parsed.positionals.join(" ")}`);
    // 解构值
    const { root, config } = requireProject(ctx);
    // 结果
    const result = initStory(root, config.name);
    output(ctx, { ...result, episodes: listEpisodeMetas(root).map((e) => e.id) }, [
        `story 已就绪：${result.created.length} 个新文件 / 目录`,
        `剧集：${listEpisodeMetas(root)
            .map((e) => `${e.id} ${e.title}`)
            .join("，")}`,
        "下一步：story script sync --episode ep01 --file <script.md>",
    ]);
    return 0;
}

/**
 * story series show/set。
 */
async function storySeries(ctx: CliContext, args: string[]): Promise<number> {
    // 解构值
    const [action, ...rest] = args;
    // 解构值
    const { root, config } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    if (action === "show") {
        // 系列
        const series = readSeries(root);
        output(ctx, { series }, [`系列：${series?.title ?? ""}`, series?.synopsis ?? ""]);
        return 0;
    }
    if (action === "set") {
        // 解析结果
        const parsed = parseFlags(rest, { "--title": "string", "--synopsis": "string", "--genre": "string" });
        if (parsed.positionals.length > 0)
            usageError(`story series set 不接受位置参数：${parsed.positionals.join(" ")}`);
        // 当前系列
        const cur = readSeries(root) ?? {
            version: 1 as const,
            title: config.name,
            created_at: nowIso(),
            updated_at: nowIso(),
        };
        // 新系列
        const next = {
            ...cur,
            ...(strFlag(parsed, "--title") !== undefined ? { title: strFlag(parsed, "--title") as string } : {}),
            ...(strFlag(parsed, "--synopsis") !== undefined
                ? { synopsis: strFlag(parsed, "--synopsis") as string }
                : {}),
            ...(strFlag(parsed, "--genre") !== undefined ? { genre: strFlag(parsed, "--genre") as string } : {}),
            updated_at: nowIso(),
        };
        if (next.title.trim() === "") throw new DaoyanCliError({ code: "story_invalid", message: "系列标题不能为空" });
        writeJsonAtomic(seriesPath(root), next);
        output(ctx, { series: next }, [`系列已更新：${next.title}`]);
        return 0;
    }
    usageError("用法：daoyan story series show|set");
}

/**
 * story episode add/list/show/set。
 */
async function storyEpisode(ctx: CliContext, args: string[]): Promise<number> {
    // 解构值
    const [action, ...rest] = args;
    // 解构值
    const { root } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    if (action === "add") {
        // 解析结果
        const parsed = parseFlags(rest, {
            "--id": "string",
            "--number": "string",
            "--title": "string",
            "--summary": "string",
        });
        // id / number / title
        const id = strFlag(parsed, "--id");
        // 集数文本
        const numberText = strFlag(parsed, "--number");
        // 标题
        const title = strFlag(parsed, "--title");
        if (id === undefined || numberText === undefined || title === undefined) {
            usageError("usage: story episode add --id <id> --number <n> --title <title>");
        }
        // 集数
        const number = Number(numberText);
        // 元数据
        const meta = addEpisode(root, {
            id,
            number,
            title,
            ...(strFlag(parsed, "--summary") !== undefined ? { summary: strFlag(parsed, "--summary") as string } : {}),
        });
        output(ctx, { episode: meta }, [`已新增剧集 ${meta.id}（第 ${meta.number} 集）：${meta.title}`]);
        return 0;
    }
    if (action === "list") {
        // 局部值
        const metas = listEpisodeMetas(root);
        output(
            ctx,
            { episodes: metas },
            metas.map((m) => `${m.id}  第 ${m.number} 集  ${m.title}`),
        );
        return 0;
    }
    if (action === "show") {
        // 剧集 id
        const id = rest.find((x) => !x.startsWith("-"));
        if (id === undefined) usageError("usage: story episode show <episode-id>");
        // 元数据
        const meta = readEpisodeMeta(root, id);
        if (meta === null) {
            throw new DaoyanCliError({ code: "episode_not_found", message: `未找到剧集 ${id}` });
        }
        // 目录
        const dir = episodeDir(root, id);
        output(
            ctx,
            {
                episode: meta,
                files: {
                    script_md: existsSync(join(dir, "script.md")),
                    script_json: existsSync(join(dir, "script.json")),
                    breakdown: existsSync(join(dir, "breakdown.json")),
                    shots: existsSync(join(dir, "shots.json")),
                },
            },
            [`${meta.id}  第 ${meta.number} 集  ${meta.title}`, meta.summary ?? ""],
        );
        return 0;
    }
    if (action === "set") {
        // 剧集 id
        const id = rest.find((x) => !x.startsWith("-"));
        if (id === undefined)
            usageError("usage: story episode set <episode-id> [--number N] [--title T] [--summary S]");
        // 解析结果
        const parsed = parseFlags(
            rest.filter((x) => x !== id),
            { "--number": "string", "--title": "string", "--summary": "string" },
        );
        // 集数
        const numberText = strFlag(parsed, "--number");
        // 元数据
        const meta = updateEpisode(root, id, {
            ...(numberText !== undefined ? { number: Number(numberText) } : {}),
            ...(strFlag(parsed, "--title") !== undefined ? { title: strFlag(parsed, "--title") as string } : {}),
            ...(strFlag(parsed, "--summary") !== undefined ? { summary: strFlag(parsed, "--summary") as string } : {}),
        });
        output(ctx, { episode: meta }, [`剧集已更新：${meta.id} 第 ${meta.number} 集 ${meta.title}`]);
        return 0;
    }
    usageError("用法：daoyan story episode add|list|show|set");
}

/**
 * story script sync/show/approve。
 */
async function storyScript(ctx: CliContext, args: string[]): Promise<number> {
    // 解构值
    const [action, ...rest] = args;
    // 解构值
    const { root } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    if (action === "sync") {
        // 解析结果
        const parsed = parseFlags(rest, {
            "--episode": "string",
            "--file": "string",
            "--summary": "string",
            "--source": "string",
            "--base-revision": "string",
            "--synced-by": "string",
        });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 剧集上下文
        const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
        if (context.legacy || context.episode_id === null) {
            throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
        }
        // 来源
        const source = strFlag(parsed, "--source") ?? "ai";
        if (source !== "ai" && source !== "user" && source !== "import") {
            usageError("--source 必须是 ai|user|import");
        }
        // 正文
        const text = readTextInput(strFlag(parsed, "--file"), "--file <script.md|->");
        // base revision
        const baseText = strFlag(parsed, "--base-revision");
        if (baseText !== undefined && (!Number.isInteger(Number(baseText)) || Number(baseText) < 0)) {
            usageError("--base-revision 需要非负整数");
        }
        // 同步
        const result = syncScript({
            root,
            episodeId: context.episode_id,
            text,
            source,
            summary: strFlag(parsed, "--summary") ?? "同步剧本",
            ...(strFlag(parsed, "--synced-by") !== undefined
                ? { syncedBy: strFlag(parsed, "--synced-by") as string }
                : {}),
            ...(baseText !== undefined ? { baseRevision: Number(baseText) } : {}),
        });
        // stale 文档
        const stale = ["breakdown", "shots"].filter((name) =>
            existsSync(join(context.dir, name === "breakdown" ? "breakdown.json" : "shots.json")),
        );
        output(
            ctx,
            {
                episode_id: context.episode_id,
                changed: result.changed,
                revision: result.meta.revision,
                sha256: result.meta.sha256,
                status: result.meta.status,
                stale_documents: stale,
                next_actions: [
                    `daoyan story breakdown set --episode ${context.episode_id} --file <breakdown.json> --json`,
                ],
            },
            [
                `剧本 ${context.episode_id} revision ${result.meta.revision}（${result.changed ? "已更新" : "无变化"}）`,
                result.changed
                    ? `下一步：story breakdown set --episode ${context.episode_id} --file <breakdown.json>`
                    : "",
            ].filter((x) => x !== ""),
        );
        return 0;
    }
    if (action === "show") {
        // 解析结果
        const parsed = parseFlags(rest, { "--episode": "string", "--raw": "boolean" });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 上下文
        const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
        if (context.legacy || context.episode_id === null) {
            throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
        }
        // 内容
        const meta = loadScriptMeta(root, context.episode_id);
        // 内容
        const content = loadScriptText(root, context.episode_id);
        if (boolFlag(parsed, "--raw")) {
            process.stdout.write(content);
            return 0;
        }
        output(ctx, { episode_id: context.episode_id, meta, content }, [
            `剧本 ${context.episode_id} revision ${meta.revision}（${meta.status}）`,
            content,
        ]);
        return 0;
    }
    if (action === "approve") {
        // 解析结果
        const parsed = parseFlags(rest, { "--episode": "string" });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 上下文
        const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
        if (context.legacy || context.episode_id === null) {
            throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
        }
        // 确认
        const meta = approveScript(root, context.episode_id);
        output(ctx, { episode_id: context.episode_id, meta }, [
            `剧本 ${context.episode_id} revision ${meta.revision} 已确认`,
        ]);
        return 0;
    }
    usageError("用法：daoyan story script sync|show|approve");
}

/**
 * story breakdown set/show。
 */
async function storyBreakdown(ctx: CliContext, args: string[]): Promise<number> {
    // 解构值
    const [action, ...rest] = args;
    // 解构值
    const { root } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    if (action === "set") {
        // 解析结果
        const parsed = parseFlags(rest, {
            "--episode": "string",
            "--file": "string",
            "--source-revision": "string",
            "--base-sha256": "string",
        });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 上下文
        const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
        if (context.legacy || context.episode_id === null) {
            throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
        }
        // 剧本
        const script = loadScriptMeta(root, context.episode_id);
        if (script.revision <= 0) {
            throw new DaoyanCliError({
                code: "story_invalid",
                message: "剧本尚未同步，不能写拆解",
                hint: `先 story script sync --episode ${context.episode_id}。`,
            });
        }
        // 现有文件 hash
        const baseSha = strFlag(parsed, "--base-sha256");
        if (baseSha !== undefined && existsSync(context.breakdown_path ?? "")) {
            if (sha256File(context.breakdown_path as string) !== baseSha) {
                throw new DaoyanCliError({ code: "story_conflict", message: "breakdown 已被其它修改" });
            }
        }
        // 输入
        const raw = requireRecord(readJsonInput(strFlag(parsed, "--file"), "--file <breakdown.json|->"), "breakdown");
        // source revision
        const sourceText = strFlag(parsed, "--source-revision");
        // 局部值
        const sourceRevision = sourceText !== undefined ? Number(sourceText) : script.revision;
        if (!Number.isInteger(sourceRevision) || sourceRevision < 0 || sourceRevision > script.revision) {
            usageError("--source-revision 必须是 0..当前剧本 revision 的整数");
        }
        // 归一化
        const doc: BreakdownFile = {
            ...(raw as unknown as BreakdownFile),
            version: 1,
            episode_id: context.episode_id,
            source_revision: sourceRevision,
            source_sha256:
                sourceRevision === script.revision
                    ? script.sha256
                    : typeof raw.source_sha256 === "string"
                      ? raw.source_sha256
                      : "",
            characters: Array.isArray(raw.characters) ? (raw.characters as BreakdownFile["characters"]) : [],
            scenes: Array.isArray(raw.scenes) ? (raw.scenes as string[]) : [],
            voices: Array.isArray(raw.voices) ? (raw.voices as string[]) : [],
        };
        // 校验
        const issues = checkBreakdownForWrite(root, context.episode_id, doc);
        throwIssues(issues, "breakdown");
        saveBreakdown(root, context.episode_id, doc);
        output(ctx, { episode_id: context.episode_id, breakdown: doc }, [
            `拆解已写入 ${context.episode_id}（source revision ${doc.source_revision}）`,
            `角色 ${doc.characters.length} / 场景 ${doc.scenes.length} / 音色 ${doc.voices.length}`,
            `下一步：daoyan story asset add / story shots set --episode ${context.episode_id}`,
        ]);
        return 0;
    }
    if (action === "show") {
        // 解析结果
        const parsed = parseFlags(rest, { "--episode": "string" });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 上下文
        const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
        if (context.legacy || context.episode_id === null) {
            throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
        }
        // 拆解
        const doc = loadBreakdown(root, context.episode_id);
        if (doc === null) {
            throw new DaoyanCliError({ code: "story_invalid", message: "拆解不存在" });
        }
        output(ctx, { episode_id: context.episode_id, breakdown: doc }, [
            `拆解 ${context.episode_id}：source revision ${doc.source_revision}`,
            `角色 ${doc.characters.length} / 场景 ${doc.scenes.length} / 音色 ${doc.voices.length}`,
        ]);
        return 0;
    }
    usageError("用法：daoyan story breakdown set|show");
}

/**
 * 全局设定集 set/show。
 */
async function storyGlobal(ctx: CliContext, kind: "characters" | "scenes" | "voices", args: string[]): Promise<number> {
    // 解构值
    const [action, ...rest] = args;
    // 解构值
    const { root } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    if (action === "show") {
        // 解析结果
        const parsed = parseFlags(rest, { "--id": "string" });
        if (kind === "characters") {
            // 角色
            const doc = loadCharacters(root);
            // 列表项
            const items =
                strFlag(parsed, "--id") !== undefined
                    ? doc.characters.filter((c) => c.id === strFlag(parsed, "--id"))
                    : doc.characters;
            output(
                ctx,
                { characters: items },
                items.map((c) => `${c.id}  ${c.name}  ${c.forms.length} 形态`),
            );
            return 0;
        }
        if (kind === "scenes") {
            // 场景
            const doc = loadScenes(root);
            // 列表项
            const items =
                strFlag(parsed, "--id") !== undefined
                    ? doc.scenes.filter((s) => s.id === strFlag(parsed, "--id"))
                    : doc.scenes;
            output(
                ctx,
                { scenes: items },
                items.map((s) => `${s.id}  ${s.name}`),
            );
            return 0;
        }
        // 音色
        const doc = loadVoices(root);
        // 列表项
        const items =
            strFlag(parsed, "--id") !== undefined
                ? doc.voices.filter((v) => v.id === strFlag(parsed, "--id"))
                : doc.voices;
        output(
            ctx,
            { voices: items },
            items.map((v) => `${v.id}  ${v.name}  ${v.mode}`),
        );
        return 0;
    }
    if (action === "set") {
        // 解析结果
        const parsed = parseFlags(rest, { "--file": "string", "--base-sha256": "string" });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 目标文件
        const target =
            kind === "characters"
                ? join(root, "story/characters.json")
                : kind === "scenes"
                  ? join(root, "story/scenes.json")
                  : join(root, "story/voices.json");
        // 并发检查
        const baseSha = strFlag(parsed, "--base-sha256");
        if (baseSha !== undefined && existsSync(target) && sha256File(target) !== baseSha) {
            throw new DaoyanCliError({ code: "story_conflict", message: `${kind} 已被其它修改` });
        }
        // 输入
        const raw = requireRecord(readJsonInput(strFlag(parsed, "--file"), "--file <json|->"), kind);
        if (kind === "characters") {
            // 角色文件
            const doc: StoryCharactersFile = {
                ...(raw as unknown as StoryCharactersFile),
                version: 1,
                updated_at: nowIso(),
                characters: Array.isArray(raw.characters) ? (raw.characters as StoryCharactersFile["characters"]) : [],
            };
            throwIssues(checkCharactersDocForWrite(root, doc), "characters");
            saveCharacters(root, doc);
            output(ctx, { characters: doc.characters }, [`角色设定已写入：${doc.characters.length} 个角色`]);
            return 0;
        }
        if (kind === "scenes") {
            // 场景文件
            const doc: StoryScenesFile = {
                ...(raw as unknown as StoryScenesFile),
                version: 1,
                updated_at: nowIso(),
                scenes: Array.isArray(raw.scenes) ? (raw.scenes as StoryScenesFile["scenes"]) : [],
            };
            throwIssues(checkScenesDocForWrite(root, doc), "scenes");
            saveScenes(root, doc);
            output(ctx, { scenes: doc.scenes }, [`场景设定已写入：${doc.scenes.length} 个场景`]);
            return 0;
        }
        // 音色文件
        const doc: StoryVoicesFile = {
            ...(raw as unknown as StoryVoicesFile),
            version: 1,
            updated_at: nowIso(),
            voices: Array.isArray(raw.voices) ? (raw.voices as StoryVoicesFile["voices"]) : [],
        };
        throwIssues(checkVoicesDocForWrite(root, doc), "voices");
        saveVoices(root, doc);
        output(ctx, { voices: doc.voices }, [`音色设定已写入：${doc.voices.length} 个音色`]);
        return 0;
    }
    usageError(`用法：daoyan story ${kind} set|show`);
}

/**
 * story asset add/set-reference/remove/list。
 */
async function storyAsset(ctx: CliContext, args: string[]): Promise<number> {
    // 解构值
    const [action, ...rest] = args;
    // 解构值
    const { root } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    if (action === "add") {
        // 解析结果
        const parsed = parseFlags(rest, {
            "--owner": "string",
            "--form": "string",
            "--id": "string",
            "--role": "string",
            "--from": "string",
            "--from-run": "string",
            "--output": "string",
            "--set-reference": "boolean",
            "--replace": "boolean",
        });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // owner
        const ownerText = strFlag(parsed, "--owner");
        // 标识
        const id = strFlag(parsed, "--id");
        if (ownerText === undefined || id === undefined) usageError("需要 --owner 与 --id");
        // owner
        const owner = parseAssetOwner(ownerText, strFlag(parsed, "--form"));
        // 入库
        const result = addStoryAsset({
            root,
            owner,
            assetId: id,
            ...(strFlag(parsed, "--role") !== undefined ? { role: strFlag(parsed, "--role") as string } : {}),
            ...(strFlag(parsed, "--from") !== undefined ? { from: strFlag(parsed, "--from") as string } : {}),
            ...(strFlag(parsed, "--from-run") !== undefined
                ? { fromRun: strFlag(parsed, "--from-run") as string }
                : {}),
            ...(strFlag(parsed, "--output") !== undefined ? { output: strFlag(parsed, "--output") as string } : {}),
            setReference: boolFlag(parsed, "--set-reference"),
            replace: boolFlag(parsed, "--replace"),
        });
        output(
            ctx,
            {
                asset: result.asset,
                reference_set: result.reference_set,
                warning: result.warning,
                next_actions:
                    result.warning !== null ? ["story asset set-reference --owner <owner> --id <asset> --json"] : [],
            },
            [
                `资产已入库：${result.asset.path}`,
                result.reference_set ? "已设为主参考" : "未设为主参考（用 set-reference 显式指定）",
                result.warning ?? "",
            ].filter((x) => x !== ""),
        );
        return 0;
    }
    if (action === "set-reference") {
        // 解析结果
        const parsed = parseFlags(rest, {
            "--owner": "string",
            "--form": "string",
            "--id": "string",
        });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // owner / id
        const ownerText = strFlag(parsed, "--owner");
        // 标识
        const id = strFlag(parsed, "--id");
        if (ownerText === undefined || id === undefined) usageError("需要 --owner 与 --id");
        // owner
        const owner = parseAssetOwner(ownerText, strFlag(parsed, "--form"));
        // 设置
        const asset = setReferenceAsset(root, owner, id);
        output(ctx, { asset, reference_set: true }, [`主参考已设置：${asset.path}`]);
        return 0;
    }
    if (action === "remove") {
        // 解析结果
        const parsed = parseFlags(rest, {
            "--owner": "string",
            "--form": "string",
            "--id": "string",
            "--force": "boolean",
        });
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // owner / id
        const ownerText = strFlag(parsed, "--owner");
        // 标识
        const id = strFlag(parsed, "--id");
        if (ownerText === undefined || id === undefined) usageError("需要 --owner 与 --id");
        // owner
        const owner = parseAssetOwner(ownerText, strFlag(parsed, "--form"));
        // 删除
        const asset = removeAsset(root, owner, id, boolFlag(parsed, "--force"));
        output(ctx, { removed: asset }, [`资产已删除：${asset.path}`]);
        return 0;
    }
    if (action === "list") {
        // 解析结果
        const parsed = parseFlags(rest, {});
        if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
        // 资产
        const assets = listAssets(root);
        output(
            ctx,
            { assets, total: assets.length },
            assets.map(
                (a) =>
                    `${a.reference ? "*" : " "} ${a.owner_kind}:${a.owner_id}${a.form_id !== null ? `/${a.form_id}` : ""}  ${a.asset.id}  ${a.asset.path}`,
            ),
        );
        return 0;
    }
    usageError("用法：daoyan story asset add|set-reference|remove|list");
}

/**
 * story shots set。
 */
async function storyShots(ctx: CliContext, args: string[]): Promise<number> {
    // 解构值
    const [action, ...rest] = args;
    if (action !== "set") usageError("用法：daoyan story shots set --episode <id> --file <shots.json>");
    // 解构值
    const { root } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    // 解析结果
    const parsed = parseFlags(rest, {
        "--episode": "string",
        "--file": "string",
        "--source-revision": "string",
        "--base-sha256": "string",
    });
    if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
    // 上下文
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    if (context.legacy || context.episode_id === null) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    // 剧本
    const script = loadScriptMeta(root, context.episode_id);
    if (script.revision <= 0) {
        throw new DaoyanCliError({ code: "story_invalid", message: "剧本尚未同步，不能写分镜" });
    }
    if (loadBreakdown(root, context.episode_id) === null) {
        throw new DaoyanCliError({ code: "story_invalid", message: "拆解不存在，不能写分镜" });
    }
    // 并发检查
    const baseSha = strFlag(parsed, "--base-sha256");
    if (baseSha !== undefined && existsSync(context.shots_path) && sha256File(context.shots_path) !== baseSha) {
        throw new DaoyanCliError({ code: "story_conflict", message: "shots.json 已被其它修改" });
    }
    // 输入
    const raw = requireRecord(readJsonInput(strFlag(parsed, "--file"), "--file <shots.json|->"), "shots");
    // 元数据
    const meta = requireRecord(raw.meta, "shots.meta");
    // source revision
    const sourceText = strFlag(parsed, "--source-revision");
    // 局部值
    const sourceRevision = sourceText !== undefined ? Number(sourceText) : script.revision;
    if (!Number.isInteger(sourceRevision) || sourceRevision < 0 || sourceRevision > script.revision) {
        usageError("--source-revision 必须是 0..当前剧本 revision 的整数");
    }
    // 归一化
    const shots: ShotsFile = {
        ...(raw as unknown as ShotsFile),
        meta: {
            ...(meta as unknown as ShotsFile["meta"]),
            episode_id: context.episode_id,
            script_revision: sourceRevision,
            script_sha256:
                sourceRevision === script.revision
                    ? script.sha256
                    : typeof meta.script_sha256 === "string"
                      ? meta.script_sha256
                      : "",
        },
        shots: Array.isArray(raw.shots) ? (raw.shots as ShotsFile["shots"]) : [],
    };
    // 校验
    const issues = checkShotsForWrite(root, context.episode_id, shots);
    throwIssues(issues, "shots");
    saveEpisodeShots(root, context.episode_id, shots);
    output(ctx, { episode_id: context.episode_id, shots: shots.shots.length, script_revision: sourceRevision }, [
        `分镜已写入 ${context.episode_id}：${shots.shots.length} 镜（script revision ${sourceRevision}）`,
        `下一步：daoyan status --episode ${context.episode_id} --json`,
    ]);
    return 0;
}

/**
 * story status。
 */
async function storyStatus(ctx: CliContext, args: string[]): Promise<number> {
    // 解析结果
    const parsed = parseFlags(args, { "--episode": "string" });
    if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
    // 解构值
    const { root, config } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    // 单集
    const episode = strFlag(parsed, "--episode");
    if (episode !== undefined) {
        if (readEpisodeMeta(root, episode) === null) {
            throw new DaoyanCliError({ code: "episode_not_found", message: `未找到剧集 ${episode}` });
        }
        // 状态
        const status = computeEpisodeStoryStatus(root, episode, config);
        output(ctx, status as unknown as Record<string, unknown>, [
            `${status.episode.id} 第 ${status.episode.number} 集 ${status.episode.title}：${status.stage}`,
            `剧本 revision ${status.script.revision}（${status.script.status}）`,
            `blockers：${status.blockers.length}`,
            ...status.blockers.map((b) => `  - [${b.code}] ${b.message}`),
            ...status.next_actions.map((a) => `next: ${a}`),
        ]);
        return 0;
    }
    // 系列
    const status = computeSeriesStoryStatus(root, config);
    output(ctx, status as unknown as Record<string, unknown>, [
        `系列 ${status.series.title}：${status.series.episodes_total} 集，可拍 ${status.series.episodes_ready}，阻断 ${status.series.episodes_blocked}`,
        ...status.episodes.map((e) => `  ${e.id} 第 ${e.number} 集 ${e.title}：${e.stage}`),
    ]);
    return 0;
}

/**
 * story validate。
 */
async function storyValidate(ctx: CliContext, args: string[]): Promise<number> {
    // 解析结果
    const parsed = parseFlags(args, { "--episode": "string", "--verify-hashes": "boolean" });
    if (parsed.positionals.length > 0) usageError(`未知参数 ${parsed.positionals.join(" ")}`);
    // 解构值
    const { root } = requireProject(ctx);
    if (!storyEnabled(root)) {
        throw new DaoyanCliError({ code: "story_not_found", message: "story 模式未启用" });
    }
    // 问题
    const issues = validateStory(root, strFlag(parsed, "--episode"), boolFlag(parsed, "--verify-hashes"));
    // 错误
    const errors = issues.filter((i) => i.severity === "error");
    if (!ctx.json) {
        for (const i of issues)
            say(`${i.severity === "error" ? "✗" : i.severity === "warning" ? "!" : "·"} [${i.path}] ${i.message}`);
        say(
            errors.length === 0
                ? `story 校验通过（${issues.length} 条提示）`
                : `story 校验失败：${errors.length} 项错误`,
        );
    }
    if (errors.length > 0) {
        throw new DaoyanCliError({
            code: "validation_failed",
            message: `story 校验未通过（${errors.length} 项错误）`,
            details: { issues },
        });
    }
    if (ctx.json) emitData({ ok: true, issues });
    return 0;
}

/**
 * story 命令入口。
 */
export async function runStory(ctx: CliContext, args: string[]): Promise<number> {
    // 解构值
    const [sub, ...rest] = args;
    if (sub === "init") return storyInit(ctx, rest);
    if (sub === "series") return storySeries(ctx, rest);
    if (sub === "episode") return storyEpisode(ctx, rest);
    if (sub === "script") return storyScript(ctx, rest);
    if (sub === "breakdown") return storyBreakdown(ctx, rest);
    if (sub === "characters") return storyGlobal(ctx, "characters", rest);
    if (sub === "scenes") return storyGlobal(ctx, "scenes", rest);
    if (sub === "voices") return storyGlobal(ctx, "voices", rest);
    if (sub === "asset") return storyAsset(ctx, rest);
    if (sub === "shots") return storyShots(ctx, rest);
    if (sub === "status") return storyStatus(ctx, rest);
    if (sub === "validate") return storyValidate(ctx, rest);
    usageError(
        "用法：daoyan story init|series|episode|script|breakdown|characters|scenes|voices|asset|shots|status|validate",
    );
}
