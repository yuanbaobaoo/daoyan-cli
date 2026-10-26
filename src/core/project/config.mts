/** 项目与机器配置加载 —— project.json 自 cwd 向上寻找（类似 git 找 .git）；
 *  .dycli/machine.json 只存在于项目根，是本机层配置（gitignored）。
 *  - 找不到 project 返回 null（调用方决定报 project_not_found）；
 *  - 找到但非法抛 config_invalid；
 *  - 共享层不允许绝对路径；本机路径只出现在 machine.json。 */
import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { writeJsonAtomic } from "../../shared/fs.mts";
import type { CliContext } from "../../shared/context.mts";
import {
    MACHINE_FILE,
    PROJECT_FILE,
    WORKFLOWS_DIR,
    type MachineConfig,
    type MachineLocalEngine,
    type MachineRemoteEngine,
    type ProjectConfig,
} from "./types.mts";

/**
 * 项目定位结果：根目录 + 已解析的共享配置。
 */
export interface FoundProject {
    /**
     * 项目根目录（绝对路径）。
     */
    root: string;
    /**
     * project.json 解析结果。
     */
    config: ProjectConfig;
}

/**
 * 自起始目录向上寻找 project.json，返回项目根与配置。
 */
export function findProject(start: string): FoundProject | null {
    // 从起始目录开始逐级向上
    let dir = resolve(start);
    for (;;) {
        // 当前层级的 project.json 候选路径
        const candidate = join(dir, PROJECT_FILE);
        if (existsSync(candidate)) {
            return { root: dir, config: readProject(candidate) };
        }
        // 上一级目录（到达文件系统根时 parent === dir，停止）
        const parent = dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

/**
 * 只读取指定根目录下的 project.json（不向上寻找）。
 */
export function readProjectAt(root: string): ProjectConfig | null {
    // 项目配置的绝对路径
    const file = join(root, PROJECT_FILE);
    if (!existsSync(file)) return null;
    return readProject(file);
}

/**
 * 写回项目根 project.json。
 */
export function saveProjectAt(root: string, project: ProjectConfig): void {
    writeJsonAtomic(join(root, PROJECT_FILE), project);
}

/**
 * 解析并校验 project.json v2。
 */
function readProject(file: string): ProjectConfig {
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `${file} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
        });
    }
    if (!isProjectConfig(raw)) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message:
                `${file} 不是合法的 project.json v2（需要 name / version:2；` +
                `可选 default_workflow / gpu.takeover / comfyui.version / comfyui.custom_nodes），` +
                "见 docs/DATA-MODEL.md。旧版项目不兼容，请重新 init。",
        });
    }
    return raw;
}

/**
 * 校验 ProjectConfig v2 的最小结构。
 */
function isProjectConfig(v: unknown): v is ProjectConfig {
    if (typeof v !== "object" || v === null) return false;
    // 顶层字段的宽松视图
    const o = v as Record<string, unknown>;
    if (typeof o.name !== "string" || o.name.trim() === "") return false;
    if (o.version !== 2) return false;
    if (o.default_workflow !== undefined && typeof o.default_workflow !== "string") return false;
    if (o.production !== undefined) {
        if (typeof o.production !== "object" || o.production === null) return false;
        // 生产配置宽松视图
        const p = o.production as Record<string, unknown>;
        if (p.mode !== undefined && p.mode !== "single" && p.mode !== "series") return false;
        if (p.audio !== undefined && typeof p.audio !== "boolean") return false;
    }
    if (o.story !== undefined) {
        if (typeof o.story !== "object" || o.story === null) return false;
        // story 段宽松视图
        const s = o.story as Record<string, unknown>;
        if (s.enforce !== undefined && s.enforce !== "strict" && s.enforce !== "warn" && s.enforce !== "off") {
            return false;
        }
    }
    if (o.gpu !== undefined) {
        if (typeof o.gpu !== "object" || o.gpu === null) return false;
        // gpu 段的宽松视图
        const g = o.gpu as Record<string, unknown>;
        if (g.takeover !== undefined && typeof g.takeover !== "boolean") return false;
    }
    if (o.comfyui !== undefined) {
        if (typeof o.comfyui !== "object" || o.comfyui === null) return false;
        // comfyui 段的宽松视图
        const c = o.comfyui as Record<string, unknown>;
        if (c.version !== undefined && typeof c.version !== "string") return false;
        if (c.custom_nodes !== undefined) {
            if (!Array.isArray(c.custom_nodes)) return false;
            for (const n of c.custom_nodes) {
                if (typeof n !== "object" || n === null) return false;
                // 单个 custom node 的宽松视图
                const cn = n as Record<string, unknown>;
                if (typeof cn.name !== "string" || typeof cn.repo !== "string") return false;
                if (cn.ref !== undefined && typeof cn.ref !== "string") return false;
            }
        }
    }
    return true;
}

/**
 * 机器配置的绝对路径。
 */
export function machinePath(root: string): string {
    return join(root, MACHINE_FILE);
}

/**
 * 项目是否已经绑定本机（machine.json 存在）。
 */
export function hasMachine(root: string): boolean {
    return existsSync(machinePath(root));
}

/**
 * 加载本机机器配置；缺失/非法抛 config_invalid。
 */
export function loadMachine(root: string): MachineConfig {
    // machine.json 的绝对路径
    const file = machinePath(root);
    if (!existsSync(file)) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `本机尚未初始化（缺少 ${MACHINE_FILE}）。运行 daoyan init --mode=local|remote 绑定本机`,
        });
    }
    // 原始 JSON
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `${file} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
        });
    }
    if (!isMachineConfig(raw)) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `${file} 结构非法；需要 machine_id 与 engine.mode（local 需要 port，remote 需要 url）`,
        });
    }
    return raw;
}

/**
 * 加载机器配置；不存在返回 null（status/validate 用）。
 */
export function loadMachineIfExists(root: string): MachineConfig | null {
    return hasMachine(root) ? loadMachine(root) : null;
}

/**
 * 校验 MachineConfig 的最小结构。
 */
export function isMachineConfig(v: unknown): v is MachineConfig {
    if (typeof v !== "object" || v === null) return false;
    // 顶层字段的宽松视图
    const o = v as Record<string, unknown>;
    if (typeof o.machine_id !== "string" || o.machine_id === "") return false;
    if (typeof o.engine !== "object" || o.engine === null) return false;
    // engine 段的宽松视图
    const e = o.engine as Record<string, unknown>;
    if (e.mode === "local") {
        if (!Number.isInteger(e.port) || (e.port as number) <= 0 || (e.port as number) > 65535) return false;
        if (e.modelpath !== undefined && typeof e.modelpath !== "string") return false;
        if (e.comfyui_dir !== undefined && typeof e.comfyui_dir !== "string") return false;
        if (e.venv_dir !== undefined && typeof e.venv_dir !== "string") return false;
        if (e.models_config !== undefined && e.models_config !== null && typeof e.models_config !== "string") {
            return false;
        }
        if (e.launch_extra !== undefined) {
            if (!Array.isArray(e.launch_extra) || e.launch_extra.some((x) => typeof x !== "string")) return false;
        }
        return true;
    }
    if (e.mode === "remote") {
        if (typeof e.url !== "string" || !/^https?:\/\//i.test(e.url)) return false;
        if (
            e.free_after_task !== undefined &&
            e.free_after_task !== "always" &&
            e.free_after_task !== "when_idle" &&
            e.free_after_task !== "never"
        ) {
            return false;
        }
        return true;
    }
    return false;
}

/**
 * 回写 .dycli/machine.json（init / engine use 用）。
 */
export function saveMachine(root: string, machine: MachineConfig): void {
    writeJsonAtomic(machinePath(root), machine);
}

/**
 * 从命令上下文解析项目：--project 指定，否则自 cwd 向上寻找。
 */
export function projectFromContext(ctx: CliContext): FoundProject | null {
    return findProject(ctx.projectPath ?? process.cwd());
}

/**
 * 从命令上下文解析项目；不存在直接抛 project_not_found。
 */
export function requireProject(ctx: CliContext): FoundProject {
    // 项目定位结果
    const found = projectFromContext(ctx);
    if (found === null) {
        throw new DaoyanCliError({
            code: "project_not_found",
            message: "未找到 project.json（自当前位置向上寻找）。用 --project 指定或在项目目录内运行",
        });
    }
    return found;
}

/**
 * 把 workflow 引用解析为项目内绝对路径与相对路径：
 *  - 含 `/` 或以 .json 结尾：按项目根相对路径；
 *  - 其他：workflows/<name>.json。
 */
export function resolveWorkflowRef(root: string, ref: string): { abs: string; rel: string } {
    // 用户引用清洗（去首尾空白）
    const clean = ref.trim();
    if (clean === "") {
        throw new DaoyanCliError({ code: "workflow_invalid", message: "workflow 引用为空" });
    }
    if (clean.startsWith("/") || clean.includes("..")) {
        throw new DaoyanCliError({
            code: "workflow_invalid",
            message: `workflow 引用必须是项目内相对路径（收到 ${ref}）`,
        });
    }
    // 短名 -> workflows/<name>.json
    const rel = clean.includes("/") || clean.endsWith(".json") ? clean : join(WORKFLOWS_DIR, `${clean}.json`);
    return { abs: join(root, rel), rel: rel.split("\\").join("/") };
}

/**
 * workflow 短名（列表展示 / bindings 命名用）。
 */
export function workflowNameOf(rel: string): string {
    // 文件名
    const base = rel.split("/").pop() ?? rel;
    return base.endsWith(".json") ? base.slice(0, -".json".length) : base;
}

/**
 * 默认 machine_id：hostname（非法字符清理在 slugify 层处理）。
 */
export function defaultMachineId(): string {
    try {
        return hostname() || "machine";
    } catch {
        return "machine";
    }
}

/**
 * 判断 machine 是否为 local（类型收窄）。
 */
export function isLocalEngine(engine: MachineConfig["engine"]): engine is MachineLocalEngine {
    return engine.mode === "local";
}

/**
 * 判断 machine 是否为 remote（类型收窄）。
 */
export function isRemoteEngine(engine: MachineConfig["engine"]): engine is MachineRemoteEngine {
    return engine.mode === "remote";
}

/**
 * 把相对路径锚定到项目根（machine overrides 的 key 统一用项目内相对路径）。
 */
export function anchorPath(root: string, p: string): string {
    return isAbsolute(p) ? p : join(root, p);
}
