/** 图片单元校验 —— 结构、操作配置、引用与定稿台账。
 *  与 story validate 共用 StoryIssue 形状；只读，不修复。 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { MachineConfig, ProjectConfig } from "../project/types.mts";
import { resolveWorkflowRef } from "../project/config.mts";
import { productionOf } from "../project/production.mts";
import { readRun, runOutputAbs } from "../run/store.mts";
import { listEpisodeMetas, readEpisodeMeta, STORY_ID_RE } from "./paths.mts";
import { loadEpisodeShots, loadCharacters, loadScenes } from "./store.mts";
import {
    IMAGE_OPS,
    imageOpsStatus,
    loadStills,
    loadStillTakes,
    parseImageSource,
    parseStillOwner,
    resolveImageSource,
} from "./stills.mts";
import type { StoryIssue } from "./types.mts";

/**
 * 校验图片操作配置。
 */
function validateOps(root: string, project: ProjectConfig, machine: MachineConfig | null, issues: StoryIssue[]): void {
    // 操作状态
    const statuses = imageOpsStatus(root, project, machine);
    for (const status of statuses) {
        if (!status.configured) continue;
        for (const message of status.issues) {
            // 提示词 LLM 未配置只告警
            const warning = status.op === "prompt" && /未配置 prompt_optimizer/.test(message);
            issues.push({
                episode_id: null,
                path: `project.image.ops.${status.op}`,
                code: "image_op_invalid",
                severity: warning ? "warning" : "error",
                message,
                hint: "修正 project.json 的 image.ops 或补齐对应 workflow / bindings。",
            });
        }
    }
    // 重复 op（对象 key 不会重复，这里只校验未知后端）
    for (const op of IMAGE_OPS) {
        // 当前配置
        const config = project.image?.ops?.[op];
        if (config === undefined) continue;
        if (op === "prompt" && config.backend !== undefined) {
            if (config.backend !== "llm" && config.backend !== "agent" && config.backend !== "workflow") {
                issues.push({
                    episode_id: null,
                    path: `project.image.ops.${op}.backend`,
                    code: "image_op_invalid",
                    severity: "error",
                    message: `未知 prompt 后端：${String(config.backend)}`,
                    hint: "backend 取 llm / agent / workflow。",
                });
            }
        }
    }
}

/**
 * 校验图片单元与图片库引用。
 */
function validateStillsData(root: string, issues: StoryIssue[]): void {
    // 注册表
    const doc = loadStills(root);
    // id 集合
    const ids = new Set<string>();
    // 图片集
    const sets = new Set(doc.sets.map((item) => item.id));
    for (const still of doc.stills) {
        // 路径前缀
        const prefix = `stills/stills.json#${still.id}`;
        if (!STORY_ID_RE.test(still.id)) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "image_invalid",
                severity: "error",
                message: `图片单元 id 非法：${still.id}`,
                hint: "使用小写字母 / 数字 / -。",
            });
            continue;
        }
        if (ids.has(still.id)) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "image_invalid",
                severity: "error",
                message: `图片单元 id 重复：${still.id}`,
                hint: "每个 still id 项目内唯一。",
            });
        }
        ids.add(still.id);
        // 图片集
        if (still.set !== undefined && still.set !== null && !sets.has(still.set)) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "image_invalid",
                severity: "error",
                message: `图片集 ${still.set} 不存在`,
                hint: "用 image set --set 自动建集，或修正 still.set。",
            });
        }
        // 归属
        if (still.owner !== undefined && still.owner !== null && still.owner !== "") {
            try {
                // 解析 owner
                const parsed = parseStillOwner(still.owner, still.form ?? undefined);
                if (parsed.kind === "character") {
                    // 角色 / 形态
                    const character = loadCharacters(root).characters.find((item) => item.id === parsed.id);
                    if (character === undefined) {
                        throw new Error(`未找到角色 ${parsed.id}`);
                    }
                    if (!character.forms.some((item) => item.id === parsed.form)) {
                        throw new Error(`角色 ${parsed.id} 没有形态 ${parsed.form ?? ""}`);
                    }
                } else {
                    // 场景
                    const scene = loadScenes(root).scenes.find((item) => item.id === parsed.id);
                    if (scene === undefined) throw new Error(`未找到场景 ${parsed.id}`);
                }
            } catch (e) {
                issues.push({
                    episode_id: null,
                    path: `${prefix}.owner`,
                    code: "image_invalid",
                    severity: "error",
                    message: e instanceof Error ? e.message : String(e),
                    hint: "先在 story/characters.json 或 story/scenes.json 中登记。",
                });
            }
        }
        // 剧集 / 镜号
        if (still.episode_id !== undefined && still.episode_id !== null && still.episode_id !== "") {
            const episode = readEpisodeMeta(root, still.episode_id);
            if (episode === null) {
                issues.push({
                    episode_id: still.episode_id,
                    path: `${prefix}.episode_id`,
                    code: "image_invalid",
                    severity: "error",
                    message: `剧集 ${still.episode_id} 不存在`,
                    hint: "修正 episode_id，或先创建剧集。",
                });
            }
            if (still.shot_id !== undefined && still.shot_id !== null && still.shot_id !== "") {
                const shots = loadEpisodeShots(root, still.episode_id);
                if (shots === null || !shots.shots.some((item) => item.id === still.shot_id)) {
                    issues.push({
                        episode_id: still.episode_id,
                        path: `${prefix}.shot_id`,
                        code: "image_invalid",
                        severity: "error",
                        message: `剧集 ${still.episode_id} 中没有镜 ${still.shot_id}`,
                        hint: "修正 shot_id，或在 shots.json 中登记该镜。",
                    });
                }
            }
        } else if (still.shot_id !== undefined && still.shot_id !== null && still.shot_id !== "") {
            issues.push({
                episode_id: null,
                path: `${prefix}.shot_id`,
                code: "image_invalid",
                severity: "error",
                message: "设置 shot_id 前必须先设置 episode_id",
                hint: "补上 episode_id，或清空 shot_id。",
            });
        }
        // 提示词
        if ((still.prompt ?? "").trim() === "") {
            issues.push({
                episode_id: null,
                path: `${prefix}.prompt`,
                code: "image_prompt_missing",
                severity: "warning",
                message: "图片单元没有提示词（纯放大任务可以忽略）",
                hint: "用 daoyan image set <id> --prompt <文本> 补充。",
            });
        }
        // 尺寸 / 种子
        if (still.seed !== undefined && (!Number.isInteger(still.seed) || still.seed < 0)) {
            issues.push({
                episode_id: null,
                path: `${prefix}.seed`,
                code: "image_invalid",
                severity: "error",
                message: "seed 必须是非负整数",
                hint: "用 image set --seed 修正。",
            });
        }
        for (const key of ["width", "height"] as const) {
            // 尺寸
            const value = still[key];
            if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
                issues.push({
                    episode_id: null,
                    path: `${prefix}.${key}`,
                    code: "image_invalid",
                    severity: "error",
                    message: `${key} 必须是正整数`,
                    hint: "用 image set 修正。",
                });
            }
        }
        // workflow
        if (still.workflow !== undefined && still.workflow !== "") {
            try {
                // 引用
                const ref = resolveWorkflowRef(root, still.workflow);
                if (!existsSync(ref.abs)) {
                    issues.push({
                        episode_id: null,
                        path: `${prefix}.workflow`,
                        code: "workflow_invalid",
                        severity: "error",
                        message: `workflow 不存在：${ref.rel}`,
                        hint: "创建该 workflow 或修正 still.workflow。",
                    });
                }
            } catch (e) {
                issues.push({
                    episode_id: null,
                    path: `${prefix}.workflow`,
                    code: "workflow_invalid",
                    severity: "error",
                    message: e instanceof Error ? e.message : String(e),
                    hint: "workflow 使用短名或 workflows/<name>.json。",
                });
            }
        }
        // 输入 / 遮罩
        for (const key of ["source", "mask"] as const) {
            // 描述符
            const value = still[key];
            if (value === undefined || value === null || value === "") continue;
            try {
                parseImageSource(value);
                // 解析结果
                const resolved = resolveImageSource(root, value);
                if (resolved.error !== null || !resolved.present) {
                    issues.push({
                        episode_id: null,
                        path: `${prefix}.${key}`,
                        code: "image_source_invalid",
                        severity: "error",
                        message: resolved.error ?? `${key} 文件不在工作区`,
                        hint: "检查描述符与对应资产 / 图片库 / run 产物。",
                    });
                }
                if (key === "mask" && resolved.kind === "ref") {
                    // 遮罩角色
                    const ref = doc.refs.find((item) => item.id === value.slice("ref:".length));
                    if (ref !== undefined && ref.role !== "mask") {
                        issues.push({
                            episode_id: null,
                            path: `${prefix}.mask`,
                            code: "image_source_invalid",
                            severity: "warning",
                            message: `图片库条目 ${ref.id} 不是遮罩（role=reference）`,
                            hint: "用 image ref add --role mask 入库遮罩。",
                        });
                    }
                }
            } catch (e) {
                issues.push({
                    episode_id: null,
                    path: `${prefix}.${key}`,
                    code: "image_source_invalid",
                    severity: "error",
                    message: e instanceof Error ? e.message : String(e),
                    hint: "使用 asset:<owner>@<asset> / ref:<id> / still:<id> / run:<run>/<output>。",
                });
            }
        }
        // 资产槽位
        if (still.asset_slots !== undefined) {
            for (const [slot, value] of Object.entries(still.asset_slots)) {
                try {
                    // 槽位值等价于 asset:<owner>@<asset>
                    const resolved = resolveImageSource(root, `asset:${value}`);
                    if (resolved.error !== null || !resolved.present) {
                        issues.push({
                            episode_id: null,
                            path: `${prefix}.asset_slots.${slot}`,
                            code: "image_source_invalid",
                            severity: "error",
                            message: resolved.error ?? `槽位 ${slot} 的资产不在工作区`,
                            hint: "检查 owner / asset 是否存在。",
                        });
                    }
                } catch (e) {
                    issues.push({
                        episode_id: null,
                        path: `${prefix}.asset_slots.${slot}`,
                        code: "image_source_invalid",
                        severity: "error",
                        message: e instanceof Error ? e.message : String(e),
                        hint: "槽位值写成 owner 或 owner@asset。",
                    });
                }
            }
        }
    }
    // 图片库
    const refIds = new Set<string>();
    for (const ref of doc.refs) {
        // 路径前缀
        const prefix = `stills/stills.json#refs/${ref.id}`;
        if (!STORY_ID_RE.test(ref.id)) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "image_invalid",
                severity: "error",
                message: `图片库 id 非法：${ref.id}`,
                hint: "使用小写字母 / 数字 / -。",
            });
        }
        if (refIds.has(ref.id)) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "image_invalid",
                severity: "error",
                message: `图片库 id 重复：${ref.id}`,
                hint: "每个 ref id 项目内唯一。",
            });
        }
        refIds.add(ref.id);
        if (ref.role !== "reference" && ref.role !== "mask") {
            issues.push({
                episode_id: null,
                path: `${prefix}.role`,
                code: "image_invalid",
                severity: "error",
                message: `未知图片库角色：${String(ref.role)}`,
                hint: "role 取 reference / mask。",
            });
        }
        if (!existsSync(join(root, ref.path))) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "image_source_invalid",
                severity: "error",
                message: `图片库文件不在工作区：${ref.path}`,
                hint: "git lfs pull，或重新 image ref add。",
            });
        }
    }
}

/**
 * 校验图片定稿台账。
 */
function validateStillTakes(root: string, issues: StoryIssue[]): void {
    // 注册表 / 台账
    const doc = loadStills(root);
    const takes = loadStillTakes(root);
    for (const record of takes.stills) {
        // 路径前缀
        const prefix = `stills/takes.json#${record.still_id}`;
        if (!doc.stills.some((item) => item.id === record.still_id)) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "image_invalid",
                severity: "error",
                message: `定稿台账指向不存在的图片单元 ${record.still_id}`,
                hint: "用 image remove 清理，或恢复该 still。",
            });
            continue;
        }
        if (record.finalized === null) continue;
        // run
        let run = null;
        try {
            run = readRun(root, record.finalized.run_id);
        } catch {
            run = null;
        }
        if (run === null) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "take_invalid",
                severity: "error",
                message: `定稿 run 不存在：${record.finalized.run_id}`,
                hint: "重新定稿，或撤销该记录。",
            });
            continue;
        }
        if (run.status !== "succeeded") {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "take_invalid",
                severity: "error",
                message: `定稿 run 状态是 ${run.status}`,
                hint: "成功产出才能定稿。",
            });
            continue;
        }
        // 产物
        const output = run.outputs.find((item) => item.name === record.finalized?.output);
        if (output === undefined) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "take_invalid",
                severity: "error",
                message: `定稿产物不在 run 记录中：${record.finalized.output}`,
                hint: "产物改名或删除后需要重新定稿。",
            });
            continue;
        }
        if (!existsSync(runOutputAbs(root, run, output))) {
            issues.push({
                episode_id: null,
                path: prefix,
                code: "take_invalid",
                severity: "error",
                message: `定稿产物不在工作区：${output.path}`,
                hint: "git lfs pull，或重新定稿。",
            });
        }
    }
}

/**
 * 校验图片单元 / 图片库 / 操作配置 / 定稿台账。
 */
export function validateStills(
    root: string,
    project: ProjectConfig,
    machine: MachineConfig | null = null,
): StoryIssue[] {
    // 问题列表
    const issues: StoryIssue[] = [];
    validateOps(root, project, machine, issues);
    validateStillsData(root, issues);
    validateStillTakes(root, issues);
    // 纯图片项目不应有剧集
    if (productionOf(project).mode === "stills" && listEpisodeMetas(root).length > 0) {
        issues.push({
            episode_id: null,
            path: "episodes",
            code: "mode_conflict",
            severity: "warning",
            message: "纯图片项目（production.mode=stills）仍存在剧集目录",
            hint: "移除剧集，或把模式切回 single / series。",
        });
    }
    return issues;
}
