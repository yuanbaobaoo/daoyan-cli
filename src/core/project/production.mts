/** 项目生产配置 —— 单视频 / 多集与音频开关的纯配置读取。
 *  不依赖 story 路径，避免与 paths 形成循环依赖。 */
import type { ProductionMode, ProjectConfig } from "./types.mts";

/**
 * 旧 story 项目默认模式。
 */
export const DEFAULT_PRODUCTION_MODE: ProductionMode = "series";

/**
 * 默认音频开关。
 */
export const DEFAULT_AUDIO_ENABLED = true;

/**
 * 生产配置快照。
 */
export interface ProductionSettings {
    /**
     * 单视频 / 多集。
     */
    mode: ProductionMode;
    /**
     * 是否需要音频。
     */
    audio: boolean;
}

/**
 * 读取生产配置（带默认值）。
 */
export function productionOf(project: ProjectConfig): ProductionSettings {
    return {
        mode: project.production?.mode ?? DEFAULT_PRODUCTION_MODE,
        audio: project.production?.audio ?? DEFAULT_AUDIO_ENABLED,
    };
}

/**
 * 是否启用音频。
 */
export function audioEnabledOf(project: ProjectConfig | null | undefined): boolean {
    if (project === null || project === undefined) return DEFAULT_AUDIO_ENABLED;
    return productionOf(project).audio;
}
