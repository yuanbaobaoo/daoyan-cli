/** 提示词优化 —— 本机 OpenAI 兼容 LLM 或 Agent 改写两种路径。
 *  只产出新的提示词修订，不自动替换；Web 与 CLI 共用。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import type { MachineConfig } from "../project/types.mts";
import { loadCharacters, loadScenes } from "./store.mts";
import { loadStills, setStillPrompt } from "./stills.mts";
import type { PromptRevision, StoryScene, StillSpec } from "./types.mts";

// 默认 LLM 超时（60 秒）
const DEFAULT_OPTIMIZER_TIMEOUT_MS = 60_000;
// 提示词最大长度（8 KiB）
const MAX_PROMPT_BYTES = 8 * 1024;

/**
 * 提示词优化器状态（不含密钥）。
 */
export interface PromptOptimizerStatus {
    /**
     * 是否已配置 LLM。
     */
    configured: boolean;
    /**
     * 模型名。
     */
    model: string | null;
    /**
     * base URL。
     */
    base_url: string | null;
}

/**
 * 读取提示词优化器状态。
 */
export function promptOptimizerStatus(machine: MachineConfig | null): PromptOptimizerStatus {
    const config = machine?.prompt_optimizer;
    if (config === undefined) return { configured: false, model: null, base_url: null };
    return { configured: true, model: config.model, base_url: config.base_url };
}

/**
 * 组装提示词上下文（当前提示词 + 角色 / 场景设定）。
 */
export function buildPromptContext(root: string, still: StillSpec): string {
    // 上下文行
    const lines: string[] = [];
    lines.push(`当前提示词：${still.prompt ?? ""}`);
    if (still.negative !== undefined && still.negative !== "") lines.push(`负向提示词：${still.negative}`);
    if (still.width !== undefined && still.height !== undefined) {
        lines.push(`目标尺寸：${still.width}x${still.height}`);
    }
    if (still.owner !== undefined && still.owner !== null && still.owner !== "") {
        const colon = still.owner.indexOf(":");
        // owner 类型 / id
        const kind = colon > 0 ? still.owner.slice(0, colon) : "";
        const id = colon > 0 ? still.owner.slice(colon + 1) : still.owner;
        if (kind === "character") {
            // 角色
            const character = loadCharacters(root).characters.find((item) => item.id === id);
            if (character !== undefined) {
                // 形态
                const form = character.forms.find((item) => item.id === (still.form ?? character.default_form));
                lines.push(`角色：${character.name}${form !== undefined ? `（${form.name}）` : ""}`);
                if (character.appearance !== undefined) lines.push(`外观基线：${character.appearance}`);
                if (character.summary !== undefined) lines.push(`角色简介：${character.summary}`);
                if (form?.description !== undefined) lines.push(`形态描述：${form.description}`);
                if (form?.outfit !== undefined) lines.push(`服装：${form.outfit}`);
            }
        } else if (kind === "scene") {
            // 场景
            const scene = loadScenes(root).scenes.find((item) => item.id === id);
            if (scene !== undefined) lines.push(...sceneLines(scene));
        }
    }
    if (still.notes !== undefined && still.notes !== "") lines.push(`制作备注：${still.notes}`);
    return lines.join("\n");
}

/**
 * 场景设定行。
 */
function sceneLines(scene: StoryScene): string[] {
    // 行
    const lines = [`场景：${scene.name}`];
    if (scene.description !== undefined) lines.push(`场景描述：${scene.description}`);
    if (scene.time_of_day !== undefined) lines.push(`时间：${scene.time_of_day}`);
    if (scene.mood !== undefined) lines.push(`氛围：${scene.mood}`);
    return lines;
}

/**
 * 提示词优化结果。
 */
export interface PromptOptimizationResult {
    /**
     * 执行路径。
     */
    mode: "llm" | "agent";
    /**
     * 图片单元 id。
     */
    still_id: string;
    /**
     * 当前提示词。
     */
    current_prompt: string;
    /**
     * LLM 建议的新提示词（agent 模式为 null）。
     */
    proposed_prompt: string | null;
    /**
     * Agent 改写所需的上下文。
     */
    context: string | null;
    /**
     * 是否已应用。
     */
    applied: boolean;
    /**
     * 应用后产生的修订。
     */
    revision: PromptRevision | null;
}

/**
 * 调用本机 OpenAI 兼容 LLM 优化提示词。
 */
async function callLlm(opts: { machine: MachineConfig; context: string; current: string }): Promise<string> {
    const config = opts.machine.prompt_optimizer;
    if (config === undefined) {
        throw new DaoyanCliError({ code: "config_invalid", message: "本机未配置 prompt_optimizer" });
    }
    // 请求头
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.api_key_env !== undefined && config.api_key_env !== "") {
        const key = process.env[config.api_key_env];
        if (key === undefined || key === "") {
            throw new DaoyanCliError({
                code: "config_invalid",
                message: `环境变量 ${config.api_key_env} 为空，无法调用提示词优化器`,
            });
        }
        headers.Authorization = `Bearer ${key}`;
    }
    // 超时
    const timeoutMs = config.timeout_ms ?? DEFAULT_OPTIMIZER_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        // 请求
        const response = await fetch(`${config.base_url.replace(/\/$/, "")}/chat/completions`, {
            method: "POST",
            headers,
            signal: controller.signal,
            body: JSON.stringify({
                model: config.model,
                temperature: 0.7,
                messages: [
                    {
                        role: "system",
                        content:
                            "你是电影 / 游戏美术的提示词编辑。只输出优化后的提示词正文，不要解释、不要加引号或列表。" +
                            "保持原意，补足镜头、光线、构图、材质、氛围等可执行细节；不要新增设定中不存在的角色或物体。",
                    },
                    {
                        role: "user",
                        content: `设定上下文：\n${opts.context}\n\n当前提示词：\n${opts.current}\n\n请输出一版更具体、可直接用于文生图的提示词。`,
                    },
                ],
            }),
        });
        if (!response.ok) {
            throw new DaoyanCliError({
                code: "image_failed",
                message: `提示词优化器返回 HTTP ${response.status}`,
            });
        }
        // 响应
        const payload = (await response.json()) as {
            choices?: Array<{ message?: { content?: unknown } }>;
        };
        const text = payload.choices?.[0]?.message?.content;
        if (typeof text !== "string" || text.trim() === "") {
            throw new DaoyanCliError({ code: "image_failed", message: "提示词优化器没有返回文本" });
        }
        return text.trim();
    } catch (e) {
        if (e instanceof DaoyanCliError) throw e;
        throw new DaoyanCliError({
            code: "image_failed",
            message: `提示词优化失败：${e instanceof Error ? e.message : String(e)}`,
        });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 优化一个图片单元的提示词。
 * LLM 已配置时直接产出建议；未配置时返回 Agent 改写所需的上下文。
 */
export async function optimizePrompt(opts: {
    root: string;
    stillId: string;
    machine: MachineConfig | null;
    apply: boolean;
}): Promise<PromptOptimizationResult> {
    // 图片单元
    const still = loadStills(opts.root).stills.find((item) => item.id === opts.stillId);
    if (still === undefined) {
        throw new DaoyanCliError({ code: "image_not_found", message: `未找到图片单元 ${opts.stillId}` });
    }
    // 当前提示词
    const current = still.prompt ?? "";
    if (Buffer.byteLength(current, "utf8") > MAX_PROMPT_BYTES) {
        throw new DaoyanCliError({ code: "image_invalid", message: `提示词超过 ${MAX_PROMPT_BYTES} 字节上限` });
    }
    // 上下文
    const context = buildPromptContext(opts.root, still);
    const status = promptOptimizerStatus(opts.machine);
    if (!status.configured || opts.machine === null) {
        if (opts.apply) {
            throw new DaoyanCliError({
                code: "config_invalid",
                message: "未配置本机 LLM，--apply 不可用；Agent 改写后请用 image prompt set",
                hint: "在 .dycli/machine.json 配置 prompt_optimizer，或让 Agent 直接改写提示词。",
            });
        }
        return {
            mode: "agent",
            still_id: opts.stillId,
            current_prompt: current,
            proposed_prompt: null,
            context,
            applied: false,
            revision: null,
        };
    }
    // LLM 建议
    const proposed = await callLlm({ machine: opts.machine, context, current });
    if (!opts.apply) {
        return {
            mode: "llm",
            still_id: opts.stillId,
            current_prompt: current,
            proposed_prompt: proposed,
            context,
            applied: false,
            revision: null,
        };
    }
    // 应用（无变化时不追加修订）
    if (proposed === current) {
        return {
            mode: "llm",
            still_id: opts.stillId,
            current_prompt: current,
            proposed_prompt: proposed,
            context,
            applied: false,
            revision: null,
        };
    }
    const updated = setStillPrompt(opts.root, opts.stillId, proposed, "llm");
    const revision = updated.prompt_revisions?.[updated.prompt_revisions.length - 1] ?? null;
    return {
        mode: "llm",
        still_id: opts.stillId,
        current_prompt: current,
        proposed_prompt: proposed,
        context,
        applied: true,
        revision,
    };
}
