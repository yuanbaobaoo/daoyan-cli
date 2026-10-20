/** workflow 命令族 —— Agent 的程序化节点编辑器。
 *  new / import / list / show / nodes / node / apply / set / validate。
 *  默认离线（读写文件 + 节点目录缓存）；只有 `nodes --refresh` 会启动 metadata session。 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { parseJsonValue, requiredPositional, splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { ensureDir } from "../shared/fs.mts";
import { loadMachine, loadMachineIfExists, requireProject, resolveWorkflowRef } from "../core/project/config.mts";
import {
    BINDINGS_SUFFIX,
    WORKFLOWS_DIR,
    type JsonValue,
    type MachineConfig,
    type ProjectConfig,
} from "../core/project/types.mts";
import {
    buildCatalog,
    catalogSize,
    comfyVersionOf,
    extractNodeDef,
    listNodes,
    readCatalog,
    writeCatalog,
    type NodeCatalog,
} from "../core/workflow/catalog.mts";
import { graphSha256, graphStats, hasGraphErrors, nodeSummaries, parseGraph } from "../core/workflow/graph.mts";
import {
    applyMachineOverrides,
    bindingTargets,
    bindingsPathOf,
    loadBindings,
    loadGraphFile,
    saveGraphFile,
    validateBindings,
    validateGraphWithCatalog,
} from "../core/workflow/load.mts";
import { applyOps, parseOpsPayload, type GraphOp } from "../core/workflow/ops.mts";
import { loadWorkflowAssets, validateWorkflowAssetsGraph } from "../core/story/workflow-assets.mts";
import { ComfyClient } from "../core/comfy/client.mts";
import { createEngineSession } from "../core/engine/session.mts";
import { acquireMachineLock, type AcquiredLock } from "../core/machine/lock.mts";

/**
 * 读取 stdin 全部内容。
 */
function readStdin(): string {
    try {
        return readFileSync(0, "utf8");
    } catch (e) {
        throw new DaoyanCliError({
            code: "usage",
            message: `读取 stdin 失败：${e instanceof Error ? e.message : String(e)}`,
            exit: 2,
        });
    }
}

/**
 * 获取节点目录：缓存优先；refresh 时按模式重新拉取。
 *  - remote：直接 GET /object_info；
 *  - local：metadata session（machine lock，不加载模型，取完即停）。
 */
export async function ensureCatalog(opts: {
    root: string;
    project: ProjectConfig;
    machine: MachineConfig;
    refresh: boolean;
    log: (m: string) => void;
}): Promise<NodeCatalog> {
    // 现有缓存
    const cached = readCatalog(opts.root);
    if (cached !== null && !opts.refresh) return cached;

    if (opts.machine.engine.mode === "remote") {
        // remote：直接 HTTP
        const client = new ComfyClient(opts.machine.engine.url);
        try {
            const stats = await client.systemStats(15_000);
            const raw = await client.objectInfo(120_000);
            const catalog = buildCatalog(raw, comfyVersionOf(stats));
            writeCatalog(opts.root, catalog);
            opts.log(`节点目录已刷新：${catalogSize(catalog)} 个节点（remote）`);
            return catalog;
        } catch (e) {
            throw new DaoyanCliError({
                code: "engine_unreachable",
                message: `无法从 remote 引擎读取 /object_info：${e instanceof Error ? e.message : String(e)}`,
            });
        }
    }

    // local 且未要求 refresh：不自动启动引擎
    if (!opts.refresh) {
        if (cached !== null) return cached;
        throw new DaoyanCliError({
            code: "config_invalid",
            message:
                "本地节点目录缓存缺失。运行 daoyan workflow nodes --refresh 启动一次 metadata session（不加载模型）",
            hint: "workflow nodes --refresh --json",
        });
    }

    // local metadata session
    let lock: AcquiredLock | null = null;
    try {
        lock = await acquireMachineLock({
            taskId: `metadata-catalog-${process.pid}`,
            project: opts.root,
            mode: "local",
            command: "workflow nodes --refresh",
            kind: "metadata",
        });
        const session = await createEngineSession({
            root: opts.root,
            project: opts.project,
            machine: opts.machine,
            taskId: `metadata-catalog-${process.pid}`,
            metadataOnly: true,
        });
        try {
            await session.ensureReady(opts.log);
            const stats = await session.client.systemStats(15_000);
            const raw = await session.client.objectInfo(120_000);
            const catalog = buildCatalog(raw, comfyVersionOf(stats));
            writeCatalog(opts.root, catalog);
            opts.log(`节点目录已刷新：${catalogSize(catalog)} 个节点（local metadata session）`);
            return catalog;
        } finally {
            // 不提交 prompt：不 /free，直接停止
            await session.release({ submitted: false, interrupt: false, uploaded: [], scratch_outputs: [] }, opts.log);
        }
    } finally {
        lock?.release();
    }
}

/**
 * 读取 --ops 文件或 stdin。
 */
function readOpsFile(path: string): GraphOp[] {
    // 内容
    const text = path === "-" ? readStdin() : readFileSync(path, "utf8");
    try {
        return parseOpsPayload(JSON.parse(text));
    } catch (e) {
        if (e instanceof DaoyanCliError) throw e;
        throw new DaoyanCliError({
            code: "usage",
            message: `ops JSON 解析失败：${e instanceof Error ? e.message : String(e)}`,
            exit: 2,
        });
    }
}

/**
 * 是否为 init 生成的空图占位（允许 new/import 覆盖）。
 */
function isEmptyPlaceholder(abs: string): boolean {
    if (!existsSync(abs)) return false;
    try {
        const parsed = parseGraph(JSON.parse(readFileSync(abs, "utf8")) as unknown);
        return !hasGraphErrors(parsed.issues) && Object.keys(parsed.graph).length === 0;
    } catch {
        return false;
    }
}

/**
 * workflow 命令入口（按子命令分发）。
 */
export async function runWorkflow(ctx: CliContext, args: string[]): Promise<void> {
    // 子命令
    const sub = args[0];
    if (sub === undefined) {
        throw new DaoyanCliError({
            code: "usage",
            message: "用法：daoyan workflow <new|import|list|show|nodes|node|apply|set|validate> ...",
            exit: 2,
        });
    }
    // 子命令参数
    const rest = args.slice(1);

    if (sub === "new") {
        // 名称
        const name = requiredPositional(rest[0], "workflow 名称");
        if (!/^[A-Za-z0-9._-]+$/.test(name)) usageError(`workflow 名称只允许字母数字 . _ -（收到 ${name}）`);
        // 使用项目根
        const { root } = requireProject(ctx);
        // 目标路径
        const target = resolveWorkflowRef(root, name);
        // 已存在：只允许覆盖 init 生成的空图占位
        const replaced = isEmptyPlaceholder(target.abs);
        if (existsSync(target.abs) && !replaced) {
            throw new DaoyanCliError({ code: "usage", message: `workflow ${name} 已存在：${target.rel}`, exit: 2 });
        }
        ensureDir(join(root, WORKFLOWS_DIR));
        saveGraphFile(target.abs, {});
        if (ctx.json)
            emitData({ name, path: target.rel, replaced_placeholder: replaced, graph_sha256: graphSha256({}) });
        else say(replaced ? `已重置空图：${target.rel}` : `已创建 ${target.rel}（空图）`);
        return;
    }

    if (sub === "import") {
        // 源文件
        const source = requiredPositional(rest[0], "待导入的 API JSON 路径");
        // --name
        let name: string | undefined;
        for (let i = 1; i < rest.length; i++) {
            const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
            if (flag === "--name") {
                const v = takeValue(rest, i, inline, "--name");
                name = v.value;
                i += v.skip;
            } else if (flag.startsWith("-")) usageError(`未知参数 ${flag}`);
            else usageError(`多余的位置参数 ${flag}`);
        }
        if (name === undefined) usageError("workflow import 需要 --name <name>");
        const { root } = requireProject(ctx);
        const target = resolveWorkflowRef(root, name);
        // 已存在：只允许覆盖 init 生成的空图占位
        const replaced = isEmptyPlaceholder(target.abs);
        if (existsSync(target.abs) && !replaced) {
            throw new DaoyanCliError({ code: "usage", message: `workflow ${name} 已存在`, exit: 2 });
        }
        // 解析源图（结构化错误直接抛出）
        const loaded = loadGraphFile(resolve(process.cwd(), source), basename(source));
        saveGraphFile(target.abs, loaded.graph);
        if (ctx.json) emitData({ name, path: target.rel, replaced_placeholder: replaced, graph_sha256: loaded.sha256 });
        else say(`已导入 ${target.rel}`);
        return;
    }

    if (sub === "list") {
        const { root } = requireProject(ctx);
        // workflows 目录
        const dir = join(root, WORKFLOWS_DIR);
        // 列表
        const items = existsSync(dir)
            ? readdirSync(dir)
                  .filter((f) => f.endsWith(".json") && !f.endsWith(BINDINGS_SUFFIX))
                  .sort()
                  .map((f) => {
                      // 工作流绝对路径
                      const abs = join(dir, f);
                      try {
                          // 结构解析
                          const parsed = parseGraph(JSON.parse(readFileSync(abs, "utf8")) as unknown);
                          // 统计
                          const stats = graphStats(parsed.graph);
                          return {
                              name: f.slice(0, -".json".length),
                              path: `${WORKFLOWS_DIR}/${f}`,
                              nodes: stats.nodes,
                              links: stats.links,
                              valid: !hasGraphErrors(parsed.issues),
                          };
                      } catch {
                          return {
                              name: f.slice(0, -".json".length),
                              path: `${WORKFLOWS_DIR}/${f}`,
                              nodes: 0,
                              links: 0,
                              valid: false,
                          };
                      }
                  })
            : [];
        if (ctx.json) {
            emitData({ workflows: items });
            return;
        }
        for (const it of items) say(`${it.valid ? "✅" : "✗"} ${it.path}（${it.nodes} 节点 / ${it.links} 连线）`);
        if (items.length === 0) say("（workflows/ 下暂无 workflow）");
        return;
    }

    if (sub === "show") {
        const name = requiredPositional(rest[0], "workflow 名称");
        let full = false;
        let nodeId: string | undefined;
        for (let i = 1; i < rest.length; i++) {
            const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
            if (flag === "--full") {
                full = true;
            } else if (flag === "--node") {
                const v = takeValue(rest, i, inline, "--node");
                nodeId = v.value;
                i += v.skip;
            } else if (flag.startsWith("-")) usageError(`未知参数 ${flag}`);
            else usageError(`多余的位置参数 ${flag}`);
        }
        const { root } = requireProject(ctx);
        const ref = resolveWorkflowRef(root, name);
        const loaded = loadGraphFile(ref.abs, ref.rel);
        const stats = graphStats(loaded.graph);
        if (nodeId !== undefined) {
            // 单节点
            const node = loaded.graph[nodeId];
            if (node === undefined)
                throw new DaoyanCliError({ code: "workflow_invalid", message: `节点 ${nodeId} 不存在` });
            const data = { name, node: { id: nodeId, class_type: node.class_type, inputs: node.inputs } };
            if (ctx.json) emitData(data);
            else process.stdout.write(JSON.stringify(data.node, null, 2) + "\n");
            return;
        }
        const data = {
            name,
            path: ref.rel,
            nodes: stats.nodes,
            links: stats.links,
            graph_sha256: loaded.sha256,
            bindings: existsSync(bindingsPathOf(ref.abs)) ? bindingsPathOf(ref.abs).slice(root.length + 1) : null,
            ...(full ? { graph: loaded.graph } : { node_list: nodeSummaries(loaded.graph) }),
        };
        if (ctx.json) {
            emitData(data);
            return;
        }
        say(`${ref.rel} · ${stats.nodes} 节点 / ${stats.links} 连线 · ${loaded.sha256.slice(0, 12)}…`);
        for (const n of nodeSummaries(loaded.graph)) say(`  ${n.id} ${n.class_type}（${n.inputs} 输入）`);
        return;
    }

    if (sub === "nodes") {
        let filter: string | undefined;
        let refresh = false;
        let limit = 100;
        let cursor = 0;
        let fields: string[] | undefined;
        for (let i = 0; i < rest.length; i++) {
            const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
            if (flag === "--filter") {
                const v = takeValue(rest, i, inline, "--filter");
                filter = v.value;
                i += v.skip;
            } else if (flag === "--refresh") {
                refresh = true;
            } else if (flag === "--limit") {
                const v = takeValue(rest, i, inline, "--limit");
                limit = Number(v.value);
                if (!Number.isInteger(limit) || limit <= 0) usageError("--limit 需要正整数");
                i += v.skip;
            } else if (flag === "--cursor") {
                const v = takeValue(rest, i, inline, "--cursor");
                cursor = Number(v.value);
                if (!Number.isInteger(cursor) || cursor < 0) usageError("--cursor 需要非负整数");
                i += v.skip;
            } else if (flag === "--fields") {
                const v = takeValue(rest, i, inline, "--fields");
                fields = v.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s !== "");
                i += v.skip;
            } else usageError(`未知参数 ${flag}`);
        }
        const { root, config } = requireProject(ctx);
        const machine = loadMachine(root);
        const catalog = await ensureCatalog({ root, project: config, machine, refresh, log: say });
        const result = listNodes(catalog, {
            ...(filter !== undefined ? { filter } : {}),
            limit,
            cursor,
            ...(fields !== undefined ? { fields } : {}),
        });
        if (ctx.json) {
            emitData({
                ...result,
                fingerprint: catalog.fingerprint,
                generated_at: catalog.generated_at,
            });
            return;
        }
        for (const n of result.nodes)
            say(`${String(n.name)}  ${String(n.display_name ?? "")}  ${String(n.category ?? "")}`.trim());
        if (result.next_cursor !== null) say(`… 下一页：--cursor ${result.next_cursor}`);
        return;
    }

    if (sub === "node") {
        const classType = requiredPositional(rest[0], "节点类名");
        const { root, config } = requireProject(ctx);
        const machine = loadMachine(root);
        const catalog = await ensureCatalog({ root, project: config, machine, refresh: false, log: say });
        const def = extractNodeDef(catalog.raw, classType);
        if (def === null) {
            throw new DaoyanCliError({
                code: "node_missing",
                message: `节点目录中没有 ${classType}`,
                hint: "workflow nodes --filter <文本> 查找可用节点；必要时安装 custom node 后 --refresh",
            });
        }
        if (ctx.json) {
            emitData({ node: def, fingerprint: catalog.fingerprint });
            return;
        }
        say(`${def.class_type}（${def.display_name}，${def.category}）`);
        for (const i of def.inputs) {
            say(
                `  ${i.required ? "*" : "-"} ${i.name}: ${i.types.join("|")}${i.options !== undefined ? ` [${i.options.slice(0, 6).join(", ")}…]` : ""}`,
            );
        }
        say(`输出：${def.outputs.map((t, idx) => `${idx}:${t}`).join(" ")}`);
        return;
    }

    if (sub === "apply") {
        const name = requiredPositional(rest[0], "workflow 名称");
        let opsPath: string | undefined;
        for (let i = 1; i < rest.length; i++) {
            const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
            if (flag === "--ops") {
                const v = takeValue(rest, i, inline, "--ops");
                opsPath = v.value;
                i += v.skip;
            } else usageError(`未知参数 ${flag}`);
        }
        if (opsPath === undefined) usageError("workflow apply 需要 --ops <file|->");
        const { root } = requireProject(ctx);
        const ref = resolveWorkflowRef(root, name);
        const loaded = loadGraphFile(ref.abs, ref.rel);
        const catalog = readCatalog(root);
        const ops = readOpsFile(opsPath);
        const result = applyOps(loaded.graph, ops, catalog);
        saveGraphFile(ref.abs, result.graph);
        if (ctx.json) {
            emitData({
                workflow: name,
                path: ref.rel,
                applied: result.applied,
                assigned_ids: result.assigned_ids,
                changed_nodes: result.changed_nodes,
                removed_links: result.removed_links,
                warnings: result.warnings,
                graph_sha256: result.graph_sha256,
            });
            return;
        }
        say(`应用 ${result.applied} 个 op：${ref.rel}（${result.graph_sha256.slice(0, 12)}…）`);
        for (const w of result.warnings) say(`! ${w.message}`);
        return;
    }

    if (sub === "set") {
        const name = requiredPositional(rest[0], "workflow 名称");
        const key = requiredPositional(rest[1], "输入键（nodeId.input）");
        const rawValue = requiredPositional(rest[2], "值");
        const dot = key.indexOf(".");
        if (dot <= 0 || dot === key.length - 1) usageError(`workflow set 的键必须是 nodeId.input（收到 ${key}）`);
        const { root } = requireProject(ctx);
        const ref = resolveWorkflowRef(root, name);
        const loaded = loadGraphFile(ref.abs, ref.rel);
        const catalog = readCatalog(root);
        const value = parseJsonValue(rawValue) as JsonValue;
        const result = applyOps(
            loaded.graph,
            [{ op: "set_input", node: key.slice(0, dot), input: key.slice(dot + 1), value }],
            catalog,
        );
        saveGraphFile(ref.abs, result.graph);
        if (ctx.json) {
            emitData({
                workflow: name,
                set: key,
                value,
                changed_nodes: result.changed_nodes,
                warnings: result.warnings,
                graph_sha256: result.graph_sha256,
            });
            return;
        }
        say(`已设置 ${name} ${key} = ${JSON.stringify(value)}`);
        for (const w of result.warnings) say(`! ${w.message}`);
        return;
    }

    if (sub === "validate") {
        const name = requiredPositional(rest[0], "workflow 名称");
        const { root } = requireProject(ctx);
        const ref = resolveWorkflowRef(root, name);
        // 原始 JSON（保留结构问题而不是直接抛）
        let raw: unknown;
        try {
            raw = JSON.parse(readFileSync(ref.abs, "utf8"));
        } catch (e) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: `${ref.rel} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
                details: {
                    issues: [
                        {
                            path: ref.rel,
                            code: "graph_json_invalid",
                            severity: "error",
                            message: e instanceof Error ? e.message : String(e),
                            hint: "修正 JSON 语法。",
                        },
                    ],
                },
            });
        }
        const parsed = parseGraph(raw);
        // bindings
        const bindings = loadBindings(ref.abs);
        const issues = [...parsed.issues, ...validateBindings(parsed.graph, bindings, `${ref.rel}.bindings`)];
        // 剧情资产槽位
        try {
            // 工作流资产槽位
            const assets = loadWorkflowAssets(ref.abs);
            if (assets !== null) issues.push(...validateWorkflowAssetsGraph(assets, parsed.graph, `${ref.rel}.assets`));
        } catch (e) {
            issues.push({
                path: `${ref.rel}.assets`,
                code: e instanceof DaoyanCliError ? e.code : "asset_slot_invalid",
                severity: "error",
                message: e instanceof Error ? e.message : String(e),
                hint: "修正 workflows/<name>.assets.json。",
            });
        }
        // machine overrides（未绑定本机时跳过）
        const machine = loadMachineIfExists(root);
        if (machine !== null) {
            const over = applyMachineOverrides(parsed.graph, machine, ref.rel);
            issues.push(...over.issues);
        }
        // 目录可用时做在线校验（bindings 会注入的输入不判缺）
        const catalog = readCatalog(root);
        if (catalog !== null) {
            issues.push(...validateGraphWithCatalog(parsed.graph, catalog, bindingTargets(bindings)));
        }
        const errors = issues.filter((i) => i.severity === "error");
        if (ctx.json) {
            if (errors.length > 0) {
                throw new DaoyanCliError({
                    code: "workflow_invalid",
                    message: `${ref.rel} 校验未通过（${errors.length} 项错误）`,
                    details: { issues },
                });
            }
            emitData({ workflow: name, path: ref.rel, ok: true, issues });
            return;
        }
        for (const i of issues) say(`${i.severity === "error" ? "✗" : "!"} [${i.path}] ${i.message}`);
        if (errors.length > 0) {
            throw new DaoyanCliError({
                code: "workflow_invalid",
                message: `${ref.rel} 校验未通过（${errors.length} 项错误）`,
                details: { issues },
            });
        }
        say(`校验通过：${ref.rel}${issues.length > 0 ? `（${issues.length} 条警告）` : ""}`);
        return;
    }

    throw new DaoyanCliError({
        code: "usage",
        message: `未知 workflow 子命令 ${sub}（可用：new/import/list/show/nodes/node/apply/set/validate）`,
        exit: 2,
    });
}
