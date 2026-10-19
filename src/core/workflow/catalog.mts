/** 节点目录 —— 从 ComfyUI `/object_info` 提取节点定义，缓存到 `.dycli/node_catalog.json`。
 *  目录是机器相关的（custom nodes 不同），workflow 文件仍可跨机器共享；
 *  任务预检会刷新缓存，离线编辑默认读缓存。 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { nowIso, readJsonIfExists, sha256, stableStringify, writeJsonAtomic } from "../../shared/fs.mts";
import type { JsonValue } from "../project/types.mts";
import { CATALOG_FILE } from "../project/types.mts";

/**
 * 单个节点输入定义。
 */
export interface NodeInputDef {
    /**
     * 输入名（如 text / seed / ckpt_name）。
     */
    name: string;
    /**
     * 可接受的类型名（INT / STRING / MODEL …）。
     */
    types: string[];
    /**
     * 是否必填。
     */
    required: boolean;
    /**
     * 默认值（若引擎提供）。
     */
    default?: JsonValue;
    /**
     * 枚举值（下拉框 / combo）。
     */
    options?: string[];
}

/**
 * 单个节点定义（catalog 的对外视图）。
 */
export interface NodeDefinition {
    /**
     * 节点类名。
     */
    class_type: string;
    /**
     * 展示名。
     */
    display_name: string;
    /**
     * 分类（如 sampling / loaders）。
     */
    category: string;
    /**
     * 描述。
     */
    description: string;
    /**
     * 输入定义（required + optional）。
     */
    inputs: NodeInputDef[];
    /**
     * 输出类型名。
     */
    outputs: string[];
    /**
     * 输出名。
     */
    output_names: string[];
    /**
     * 是否为输出节点。
     */
    output_node: boolean;
    /**
     * 原始定义（高级用途）。
     */
    raw: unknown;
}

/**
 * 节点目录缓存文件结构。
 */
export interface NodeCatalog {
    /**
     * 拉取时间（ISO）。
     */
    generated_at: string;
    /**
     * 引擎指纹：object_info 哈希 + ComfyUI 版本。
     */
    fingerprint: {
        /**
         * /object_info 稳定序列化后的 sha256。
         */
        object_info_sha256: string;
        /**
         * /system_stats 报告的 ComfyUI 版本（可空）。
         */
        comfyui_version: string | null;
    };
    /**
     * 原始 /object_info 响应。
     */
    raw: Record<string, unknown>;
}

// 常见 ComfyUI 类型名（用于区分多类型声明与 combo 枚举）
const KNOWN_TYPES = new Set([
    "INT",
    "FLOAT",
    "STRING",
    "BOOLEAN",
    "IMAGE",
    "MASK",
    "LATENT",
    "MODEL",
    "CLIP",
    "VAE",
    "CONDITIONING",
    "CONTROL_NET",
    "STYLE_MODEL",
    "CLIP_VISION",
    "CLIP_VISION_OUTPUT",
    "UPSCALE_MODEL",
    "SAMPLER",
    "SIGMAS",
    "NOISE",
    "GUIDER",
    "AUDIO",
    "VIDEO",
    "WAV",
    "ANY",
]);

/**
 * 从 /object_info 原始响应提取单节点定义；未找到返回 null。
 */
export function extractNodeDef(raw: Record<string, unknown>, classType: string): NodeDefinition | null {
    // 原始节点定义
    const nodeRaw = raw[classType];
    if (typeof nodeRaw !== "object" || nodeRaw === null || Array.isArray(nodeRaw)) return null;
    // 节点的宽松视图
    const n = nodeRaw as Record<string, unknown>;
    // input 段
    const input = typeof n.input === "object" && n.input !== null ? (n.input as Record<string, unknown>) : {};
    // required / optional 输入段
    const required = readInputSection(input.required, true);
    const optional = readInputSection(input.optional, false);
    return {
        class_type: classType,
        display_name: typeof n.display_name === "string" ? n.display_name : classType,
        category: typeof n.category === "string" ? n.category : "",
        description: typeof n.description === "string" ? n.description : "",
        inputs: [...required, ...optional],
        outputs: readStringArray(n.output),
        output_names: readStringArray(n.output_name),
        output_node: n.output_node === true,
        raw: nodeRaw,
    };
}

/**
 * 读取 required/optional 输入段。
 */
function readInputSection(section: unknown, required: boolean): NodeInputDef[] {
    if (typeof section !== "object" || section === null || Array.isArray(section)) return [];
    // 输入表
    const table = section as Record<string, unknown>;
    // 解析结果
    const out: NodeInputDef[] = [];
    for (const [name, specRaw] of Object.entries(table)) {
        // 输入声明
        const spec = Array.isArray(specRaw) ? specRaw : [specRaw];
        // 类型/枚举声明
        const typeSpec = spec[0];
        // 选项对象
        const opts = typeof spec[1] === "object" && spec[1] !== null ? (spec[1] as Record<string, unknown>) : {};
        // 解析出的类型名
        const types: string[] = [];
        // 解析出的枚举值
        let options: string[] | undefined;
        if (typeof typeSpec === "string") {
            types.push(typeSpec);
        } else if (Array.isArray(typeSpec)) {
            // 字符串数组：可能是多类型，也可能是 combo 选项
            const strings = typeSpec.filter((x): x is string => typeof x === "string");
            if (strings.length > 0) {
                if (strings.every((s) => KNOWN_TYPES.has(s))) {
                    types.push(...strings);
                } else {
                    options = strings;
                    types.push("COMBO");
                }
            }
        }
        // 部分引擎把 options 单独放在 opts.options
        if (Array.isArray(opts.options)) {
            // 显式 options 优先
            const explicit = opts.options.filter((x): x is string => typeof x === "string");
            if (explicit.length > 0) options = explicit;
        }
        // 默认值
        const def = opts.default;
        out.push({
            name,
            types,
            required,
            ...(def !== undefined ? { default: def as JsonValue } : {}),
            ...(options !== undefined ? { options } : {}),
        });
    }
    return out;
}

/**
 * 把任意值读成字符串数组。
 */
function readStringArray(v: unknown): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/**
 * 从原始响应构建目录（计算指纹）。
 */
export function buildCatalog(raw: Record<string, unknown>, comfyuiVersion: string | null): NodeCatalog {
    return {
        generated_at: nowIso(),
        fingerprint: {
            object_info_sha256: sha256(stableStringify(raw)),
            comfyui_version: comfyuiVersion,
        },
        raw,
    };
}

/**
 * 从 /system_stats 的宽松响应里提取 ComfyUI 版本。
 */
export function comfyVersionOf(stats: unknown): string | null {
    if (typeof stats !== "object" || stats === null) return null;
    // system 段
    const system = (stats as Record<string, unknown>).system;
    if (typeof system !== "object" || system === null) return null;
    // system 的宽松视图
    const s = system as Record<string, unknown>;
    for (const key of ["comfyui_version", "comfy_version", "version"]) {
        if (typeof s[key] === "string" && (s[key] as string) !== "") return s[key] as string;
    }
    return null;
}

/**
 * 读取缓存；不存在返回 null。
 */
export function readCatalog(root: string): NodeCatalog | null {
    // 缓存文件路径
    const file = join(root, CATALOG_FILE);
    if (!existsSync(file)) return null;
    // 解析后的缓存
    const cat = readJsonIfExists<NodeCatalog>(file);
    if (cat === null || typeof cat !== "object" || typeof cat.raw !== "object" || cat.raw === null) {
        throw new DaoyanCliError({
            code: "config_invalid",
            message: `${file} 结构非法；运行 daoyan workflow nodes --refresh 重建`,
        });
    }
    return cat;
}

/**
 * 原子写入目录缓存。
 */
export function writeCatalog(root: string, catalog: NodeCatalog): void {
    writeJsonAtomic(join(root, CATALOG_FILE), catalog);
}

/**
 * 删除缓存（测试 / 强制刷新用）。
 */
export function clearCatalog(root: string): void {
    rmSync(join(root, CATALOG_FILE), { force: true });
}

/**
 * 目录中的节点类名计数。
 */
export function catalogSize(catalog: NodeCatalog): number {
    return Object.keys(catalog.raw).length;
}

/**
 * 列出节点（紧凑视图，支持过滤/分页/字段选择）。
 */
export function listNodes(
    catalog: NodeCatalog,
    opts: { filter?: string; limit?: number; cursor?: number; fields?: string[] },
): { nodes: Array<Record<string, unknown>>; total: number; next_cursor: string | null } {
    // 过滤词（大小写不敏感）
    const filter = (opts.filter ?? "").toLowerCase();
    // 全量紧凑列表
    const all = Object.keys(catalog.raw)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => {
            // 完整定义（缺失按 null）
            const def = extractNodeDef(catalog.raw, name);
            return {
                name,
                display_name: def?.display_name ?? name,
                category: def?.category ?? "",
                output_node: def?.output_node ?? false,
            };
        })
        .filter(
            (n) =>
                filter === "" ||
                n.name.toLowerCase().includes(filter) ||
                n.display_name.toLowerCase().includes(filter) ||
                n.category.toLowerCase().includes(filter),
        );
    // 分页起点与上限
    const start = Math.max(0, opts.cursor ?? 0);
    const limit = Math.max(1, Math.min(opts.limit ?? 100, 1000));
    // 本页数据
    const page = all.slice(start, start + limit);
    // 字段选择（缺省全部紧凑字段）
    const fields = opts.fields !== undefined && opts.fields.length > 0 ? opts.fields : undefined;
    // 按字段裁剪
    const nodes =
        fields === undefined
            ? page
            : page.map((n) => {
                  // 裁剪后的单行
                  const out: Record<string, unknown> = {};
                  // 行数据的宽松视图
                  const row = n as Record<string, unknown>;
                  for (const f of fields) if (f in row) out[f] = row[f];
                  return out;
              });
    // 下一页游标
    const next = start + page.length;
    return { nodes, total: all.length, next_cursor: next < all.length ? String(next) : null };
}
