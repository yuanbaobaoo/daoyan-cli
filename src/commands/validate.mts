/** validate —— 项目级离线校验：
 *  project/machine 配置、workflows 结构、bindings、machine overrides、
 *  shots（锚点/接力/seed/尺寸）、local 引擎目录与模型目录、Skill stale。
 *  在线权威校验（节点类/模型枚举）在任务预检执行；有节点目录缓存时这里也做一遍。 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { loadMachineIfExists, loadShotsIfExists, requireProject, resolveWorkflowRef } from "../core/project/config.mts";
import {
    BINDINGS_SUFFIX,
    WORKFLOWS_DIR,
    type FirstFrame,
    type MachineConfig,
    type ShotsFile,
} from "../core/project/types.mts";
import { parseGraph, hasGraphErrors, type GraphIssue } from "../core/workflow/graph.mts";
import {
    applyMachineOverrides,
    bindingTargets,
    bindingsPathOf,
    loadBindings,
    validateBindings,
    validateGraphWithCatalog,
} from "../core/workflow/load.mts";
import { readCatalog } from "../core/workflow/catalog.mts";
import { loadWorkflowAssets, validateWorkflowAssetsGraph } from "../core/story/workflow-assets.mts";
import { skillState } from "../core/agent/skill.mts";
import { inspectMachineLock } from "../core/machine/lock.mts";
import { VERSION } from "../shared/version.mts";
import { storyEnabled } from "../core/story/paths.mts";
import { validateStory } from "../core/story/validate.mts";

// 尺寸建议（warning，不阻断）
const DIM_MULTIPLE = 32;
// 帧网格 17k+5（warning）
const FRAME_GRID_STEP = 17;
const FRAME_GRID_OFFSET = 5;

/**
 * 校验问题（与 workflow validate 的 issues[] 同构）。
 */
export interface ValidationIssue {
    /**
     * 定位路径（文件/字段/镜号）。
     */
    path: string;
    /**
     * 所属剧集（story 模式；全局为 null）。
     */
    episode_id?: string | null;
    /**
     * 稳定问题码。
     */
    code: string;
    /**
     * error 阻断；warning 提示。
     */
    severity: "error" | "warning";
    /**
     * 说明。
     */
    message: string;
    /**
     * 修复建议。
     */
    hint: string;
}

/**
 * 图问题 -> 校验问题。
 */
function fromGraphIssue(prefix: string, i: GraphIssue): ValidationIssue {
    return {
        path: `${prefix}:${i.path}`,
        code: i.code,
        severity: i.severity,
        message: i.message,
        hint: i.hint,
    };
}

/**
 * 校验 workflows 目录中的全部图。
 */
function validateWorkflows(root: string, machine: MachineConfig | null, issues: ValidationIssue[]): void {
    // workflows 目录
    const dir = join(root, WORKFLOWS_DIR);
    if (!existsSync(dir)) {
        issues.push({
            path: WORKFLOWS_DIR,
            code: "workflows_dir_missing",
            severity: "warning",
            message: "workflows/ 目录不存在",
            hint: "daoyan workflow new <name> 创建第一个工作流。",
        });
        return;
    }
    // 图文件
    const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith(BINDINGS_SUFFIX));
    if (files.length === 0) {
        issues.push({
            path: WORKFLOWS_DIR,
            code: "workflows_empty",
            severity: "warning",
            message: "workflows/ 下没有工作流",
            hint: "daoyan workflow new <name> 或 workflow import <api.json> --name <name>。",
        });
    }
    // 节点目录缓存（可选）
    const catalog = readCatalog(root);
    for (const f of files) {
        // 相对路径
        const rel = `${WORKFLOWS_DIR}/${f}`;
        // 绝对路径
        const abs = join(dir, f);
        // 原始 JSON
        let raw: unknown;
        try {
            raw = JSON.parse(readFileSync(abs, "utf8"));
        } catch (e) {
            issues.push({
                path: rel,
                code: "graph_json_invalid",
                severity: "error",
                message: `不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
                hint: "修正 JSON 语法。",
            });
            continue;
        }
        const parsed = parseGraph(raw);
        for (const i of parsed.issues) issues.push(fromGraphIssue(rel, i));
        // 剧情资产槽位
        try {
            // 工作流资产槽位
            const assets = loadWorkflowAssets(abs);
            if (assets !== null) {
                for (const i of validateWorkflowAssetsGraph(assets, parsed.graph, `${rel}.assets`)) {
                    issues.push({ ...i, path: i.path });
                }
            }
        } catch (e) {
            issues.push({
                path: `${rel}.assets`,
                code: e instanceof DaoyanCliError ? e.code : "asset_slot_invalid",
                severity: "error",
                message: e instanceof Error ? e.message : String(e),
                hint: "修正 workflows/<name>.assets.json。",
            });
        }
        // bindings
        let bindings = null;
        try {
            bindings = loadBindings(abs);
            for (const i of validateBindings(parsed.graph, bindings, `${rel}.bindings`)) {
                issues.push(fromGraphIssue(rel, i));
            }
        } catch (e) {
            issues.push({
                path: bindingsPathOf(abs).slice(root.length + 1),
                code: "bindings_invalid",
                severity: "error",
                message: e instanceof Error ? e.message : String(e),
                hint: 'bindings 必须是 { "logical": "nodeId.input" }。',
            });
        }
        // machine overrides
        if (machine !== null) {
            const over = applyMachineOverrides(parsed.graph, machine, rel);
            for (const i of over.issues) issues.push(fromGraphIssue(rel, i));
        }
        // 在线校验（有缓存时；bindings 会注入的输入不判缺）
        if (catalog !== null && !hasGraphErrors(parsed.issues)) {
            for (const i of validateGraphWithCatalog(parsed.graph, catalog, bindingTargets(bindings))) {
                issues.push(fromGraphIssue(rel, i));
            }
        }
    }
}

/**
 * 校验 shots.json。
 */
function validateShots(root: string, shots: ShotsFile | null, issues: ValidationIssue[]): void {
    if (shots === null) {
        issues.push({
            path: "shots.json",
            code: "shots_missing",
            severity: "warning",
            message: "没有 shots.json（单 run 模式可忽略）",
            hint: "需要 shot/batch 时创建 shots.json。",
        });
        return;
    }
    // 尺寸
    if (!Number.isFinite(shots.meta.width) || shots.meta.width <= 0) {
        issues.push({
            path: "shots.meta.width",
            code: "shots_width_invalid",
            severity: "error",
            message: "meta.width 必须是正数",
            hint: "填写生成宽度。",
        });
    } else if (shots.meta.width % DIM_MULTIPLE !== 0) {
        issues.push({
            path: "shots.meta.width",
            code: "shots_width_not_aligned",
            severity: "warning",
            message: `meta.width=${shots.meta.width} 不是 32 的倍数`,
            hint: "某些模型会对齐到 32/64，建议主动对齐。",
        });
    }
    if (!Number.isFinite(shots.meta.height) || shots.meta.height <= 0) {
        issues.push({
            path: "shots.meta.height",
            code: "shots_height_invalid",
            severity: "error",
            message: "meta.height 必须是正数",
            hint: "填写生成高度。",
        });
    } else if (shots.meta.height % DIM_MULTIPLE !== 0) {
        issues.push({
            path: "shots.meta.height",
            code: "shots_height_not_aligned",
            severity: "warning",
            message: `meta.height=${shots.meta.height} 不是 32 的倍数`,
            hint: "建议对齐到 32 的倍数。",
        });
    }
    if (shots.shots.length === 0) {
        issues.push({
            path: "shots.shots",
            code: "shots_empty",
            severity: "error",
            message: "分镜表为空",
            hint: "添加至少一个镜头。",
        });
    }
    // 镜号 / seed / prompt
    const seenId = new Set<string>();
    const seenSeed = new Set<string>();
    const byId = new Map(shots.shots.map((s) => [s.id, s]));
    for (const s of shots.shots) {
        // 定位标签
        const tag = `shots.${s.id}`;
        if (seenId.has(s.id)) {
            issues.push({
                path: tag,
                code: "shot_id_duplicate",
                severity: "error",
                message: `镜号 ${s.id} 重复`,
                hint: "镜号必须唯一。",
            });
        }
        seenId.add(s.id);
        if (typeof s.seed !== "number") {
            issues.push({
                path: tag,
                code: "shot_seed_invalid",
                severity: "error",
                message: "缺少数值 seed",
                hint: "为每个镜头设置 seed。",
            });
        } else if (seenSeed.has(String(s.seed))) {
            issues.push({
                path: tag,
                code: "shot_seed_duplicate",
                severity: "warning",
                message: `seed ${s.seed} 与其他镜头重复`,
                hint: "重复 seed 可能产生相似结果（并非错误）。",
            });
        }
        if (typeof s.seed === "number") seenSeed.add(String(s.seed));
        if (typeof s.prompt !== "string" || s.prompt.trim() === "") {
            issues.push({
                path: tag,
                code: "shot_prompt_empty",
                severity: "error",
                message: "prompt 为空",
                hint: "填写镜头提示词。",
            });
        }
        // 帧网格
        const len = s.length ?? shots.defaults.length;
        if (typeof len === "number" && len % FRAME_GRID_STEP !== FRAME_GRID_OFFSET) {
            issues.push({
                path: tag,
                code: "shot_length_not_aligned",
                severity: "warning",
                message: `length ${len} 不符合 17k+5 帧网格`,
                hint: "引擎可能静默对齐；建议使用 17k+5。",
            });
        }
        // workflow 文件
        const ref = s.workflow ?? shots.workflow ?? null;
        if (ref !== null) {
            const wf = resolveWorkflowRef(root, ref);
            if (!existsSync(wf.abs)) {
                issues.push({
                    path: tag,
                    code: "shot_workflow_missing",
                    severity: "error",
                    message: `workflow 文件不存在：${wf.rel}`,
                    hint: "先创建/导入该 workflow。",
                });
            } else if (!existsSync(bindingsPathOf(wf.abs))) {
                issues.push({
                    path: tag,
                    code: "shot_bindings_missing",
                    severity: "warning",
                    message: `workflow 缺少 bindings：${wf.rel.replace(/\.json$/, ".bindings.json")}`,
                    hint: "shot/batch 需要 bindings 注入 prompt/seed。",
                });
            }
        }
    }
    // 首帧与接力
    for (const s of shots.shots) {
        // 首帧
        const ff: FirstFrame = s.first_frame;
        if (ff === undefined) continue;
        // 定位标签
        const tag = `shots.${s.id}.first_frame`;
        if (typeof ff === "string") {
            const rel = shots.meta.anchors[ff];
            if (rel === undefined) {
                issues.push({
                    path: tag,
                    code: "anchor_missing_key",
                    severity: "error",
                    message: `锚点 key "${ff}" 不在 meta.anchors`,
                    hint: "在 meta.anchors 登记或改用存在的 key。",
                });
            } else if (!existsSync(join(root, rel))) {
                issues.push({
                    path: tag,
                    code: "anchor_file_missing",
                    severity: "error",
                    message: `锚点图片不存在：${rel}`,
                    hint: "放入锚点文件，或修正 meta.anchors 路径。",
                });
            }
        } else if (typeof ff === "object" && typeof ff.relay === "string") {
            if (!byId.has(ff.relay)) {
                issues.push({
                    path: tag,
                    code: "relay_upstream_missing",
                    severity: "error",
                    message: `接力上游 ${ff.relay} 不存在`,
                    hint: "修正 relay 镜号。",
                });
            }
        } else {
            issues.push({
                path: tag,
                code: "first_frame_invalid",
                severity: "error",
                message: 'first_frame 非法（应为锚点字符串或 {"relay":"id"}）',
                hint: "修正 first_frame。",
            });
        }
    }
    // 接力环
    for (const s of shots.shots) {
        const seen = new Set<string>([s.id]);
        let cur = s;
        for (;;) {
            const ff = cur.first_frame;
            if (typeof ff !== "object" || ff === undefined) break;
            const next = byId.get(ff.relay);
            if (next === undefined) break;
            if (seen.has(next.id)) {
                issues.push({
                    path: `shots.${s.id}`,
                    code: "relay_cycle",
                    severity: "error",
                    message: `接力链成环（经过 ${next.id}）`,
                    hint: "打断接力环。",
                });
                break;
            }
            seen.add(next.id);
            cur = next;
        }
    }
}

/**
 * 校验本机引擎与模型目录。
 */
function validateMachine(root: string, machine: MachineConfig | null, issues: ValidationIssue[]): void {
    if (machine === null) {
        issues.push({
            path: ".dycli/machine.json",
            code: "machine_missing",
            severity: "error",
            message: "本机尚未初始化",
            hint: "运行 daoyan init --mode=local|remote。",
        });
        return;
    }
    if (machine.engine.mode !== "local") return;
    // ComfyUI 目录
    const comfyDir =
        machine.engine.comfyui_dir !== undefined
            ? isAbsolute(machine.engine.comfyui_dir)
                ? machine.engine.comfyui_dir
                : join(root, machine.engine.comfyui_dir)
            : join(root, "engine", "ComfyUI");
    if (!existsSync(join(comfyDir, "main.py"))) {
        issues.push({
            path: ".dycli/machine.json",
            code: "engine_not_installed",
            severity: "warning",
            message: `ComfyUI 未安装：${comfyDir}`,
            hint: "运行 daoyan init --mode=local 部署引擎。",
        });
    }
    // 模型目录
    if (machine.engine.modelpath !== undefined && !existsSync(machine.engine.modelpath)) {
        issues.push({
            path: ".dycli/machine.json",
            code: "modelpath_missing",
            severity: "warning",
            message: `模型目录不存在：${machine.engine.modelpath}`,
            hint: "重新 init --modelpath，或挂载该目录。",
        });
    }
    // models_config
    if (
        machine.engine.models_config !== null &&
        machine.engine.models_config !== undefined &&
        !existsSync(machine.engine.models_config)
    ) {
        issues.push({
            path: ".dycli/machine.json",
            code: "models_config_missing",
            severity: "warning",
            message: `models_config 不存在：${machine.engine.models_config}`,
            hint: "修正路径或设为 null 使用自动生成配置。",
        });
    }
}

/**
 * validate 命令入口。
 */
export async function runValidate(ctx: CliContext): Promise<number> {
    const { root, config: project } = requireProject(ctx);
    const machine = loadMachineIfExists(root);
    const shots = loadShotsIfExists(root);
    // 问题列表
    const issues: ValidationIssue[] = [];

    // 项目配置已由 requireProject 校验
    if (project.default_workflow !== undefined) {
        const wf = resolveWorkflowRef(root, project.default_workflow);
        if (!existsSync(wf.abs)) {
            issues.push({
                path: "project.default_workflow",
                code: "default_workflow_missing",
                severity: "warning",
                message: `default_workflow 不存在：${wf.rel}`,
                hint: "创建该 workflow，或修改 project.json。",
            });
        }
    }

    validateMachine(root, machine, issues);
    validateWorkflows(root, machine, issues);
    if (storyEnabled(root)) {
        // story 模式：根 shots.json 被忽略，校验分集剧本 / 设定集 / 拆解 / 分镜
        for (const item of validateStory(root)) {
            issues.push({
                path: item.path,
                episode_id: item.episode_id,
                code: item.code,
                severity: item.severity === "error" ? "error" : "warning",
                message: item.message,
                hint: item.hint,
            });
        }
    } else {
        validateShots(root, shots, issues);
    }

    // 机器锁
    const lock = inspectMachineLock();
    if (lock.status === "corrupt") {
        issues.push({
            path: "~/.dycli/machine.lock",
            code: "machine_lock_corrupt",
            severity: "warning",
            message: "机器锁文件损坏",
            hint: "确认没有任务在跑后删除 ~/.dycli/machine.lock。",
        });
    }

    // Skill stale
    const { COMMANDS } = await import("./registry.mts");
    const skill = skillState(root, VERSION, COMMANDS);
    if (!skill.present) {
        issues.push({
            path: ".agents/skills/daoyan",
            code: "skill_missing",
            severity: "warning",
            message: "项目内 Agent Skill 不存在",
            hint: "daoyan skill update（或 init 时不要 --no-skill）。",
        });
    } else if (skill.stale) {
        issues.push({
            path: ".agents/skills/daoyan",
            code: "skill_stale",
            severity: "warning",
            message: "项目内 Agent Skill 与当前 CLI 不一致",
            hint: "daoyan skill update。",
        });
    }

    // 汇总
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    if (!ctx.json) {
        for (const i of errors) say(`✗ [${i.path}] ${i.message}`);
        for (const i of warnings) say(`! [${i.path}] ${i.message}`);
        say(errors.length === 0 ? `校验通过（${warnings.length} 条警告）` : `校验失败：${errors.length} 项错误`);
    }
    if (errors.length > 0) {
        throw new DaoyanCliError({
            code: "validation_failed",
            message: `项目校验未通过（${errors.length} 项错误）`,
            details: { issues },
        });
    }
    if (ctx.json) {
        emitData({ ok: true, issues });
    }
    return 0;
}
