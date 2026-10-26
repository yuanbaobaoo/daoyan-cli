/** 项目生产模式 —— single（单视频）/ series（多集）与音频开关。
 *  - 模式与音频写入 project.json 的 production 段；
 *  - 已有 story 项目缺少 production 时按 series + audio=true 兼容；
 *  - single 要求恰好一集；series 允许 1..N 集。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import { readProjectAt, saveProjectAt } from "../project/config.mts";
import { productionOf, type ProductionSettings } from "../project/production.mts";
import type { ProductionMode, ProjectConfig } from "../project/types.mts";
import { listEpisodeMetas } from "./paths.mts";

/**
 * 读取生产配置；项目配置缺失抛 project_not_found。
 */
export function readProduction(root: string): ProductionSettings {
    // 项目配置
    const project = readProjectAt(root);
    if (project === null) {
        throw new DaoyanCliError({
            code: "project_not_found",
            message: "未找到 project.json",
            hint: "在项目目录内运行，或先执行 daoyan init。",
        });
    }
    return productionOf(project);
}

/**
 * 校验能否切换到目标模式。
 */
export function assertModeSwitch(root: string, mode: ProductionMode): void {
    // 当前剧集
    const metas = listEpisodeMetas(root);
    if (mode === "series") return;
    if (metas.length === 0) {
        throw new DaoyanCliError({
            code: "story_invalid",
            message: "项目没有有效剧集，不能切换为单视频模式",
            hint: "先创建第一集。",
        });
    }
    if (metas.length > 1) {
        throw new DaoyanCliError({
            code: "mode_conflict",
            message: `项目当前有 ${metas.length} 集，只有一集时才能切换为单视频模式`,
            details: { episodes: metas.map((meta) => meta.id) },
            hint: "用 daoyan story episode remove <id> 删除多余剧集后重试。",
        });
    }
}

/**
 * 写入生产配置。
 */
function saveProduction(root: string, next: ProductionSettings): ProjectConfig {
    // 当前项目
    const project = readProjectAt(root);
    if (project === null) {
        throw new DaoyanCliError({
            code: "project_not_found",
            message: "未找到 project.json",
            hint: "在项目目录内运行，或先执行 daoyan init。",
        });
    }
    // 合并后的项目
    const updated: ProjectConfig = {
        ...project,
        production: { mode: next.mode, audio: next.audio },
    };
    saveProjectAt(root, updated);
    return updated;
}

/**
 * 设置生产模式。
 */
export function setProductionMode(root: string, mode: ProductionMode): ProjectConfig {
    assertModeSwitch(root, mode);
    // 当前配置
    const current = readProduction(root);
    return saveProduction(root, { mode, audio: current.audio });
}

/**
 * 同时更新模式与音频。
 */
export function updateProduction(root: string, patch: { mode?: ProductionMode; audio?: boolean }): ProjectConfig {
    // 当前配置
    const current = readProduction(root);
    // 目标模式
    const mode = patch.mode ?? current.mode;
    if (patch.mode !== undefined) assertModeSwitch(root, patch.mode);
    return saveProduction(root, { mode, audio: patch.audio ?? current.audio });
}

/**
 * 设置音频开关。
 */
export function setAudioEnabled(root: string, enabled: boolean): ProjectConfig {
    // 当前配置
    const current = readProduction(root);
    return saveProduction(root, { mode: current.mode, audio: enabled });
}
