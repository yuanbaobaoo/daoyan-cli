/** project.json 加载：自起始目录向上寻找（类似 git 寻找 .git）。
 *  - 找不到返回 null（调用方决定报 project_not_found 还是静默）；
 *  - 找到但非法抛 config_invalid；
 *  - 相对路径一律锚到项目根（项目内相对布局的直觉）。 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import type { CliContext } from "../../shared/context.mts";
import { PROJECT_FILE, SHOTS_FILE, type ProjectConfig, type ShotsFile } from "./types.mts";

/**
 * 项目定位结果：根目录 + 已过解析的配置。
 */
export interface FoundProject {
  /**
   * 项目根目录（绝对路径）。
   */
  root: string;
  /**
   * project.json 解析结果（相对路径已锚到 root）。
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
      // 解析出的原始 JSON（尚未做字段校验）
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(candidate, "utf8"));
      } catch (e) {
        throw new DaoyanCliError({
          code: "config_invalid",
          message: `${candidate} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
        });
      }
      // 补默认 engine.mode 后的配置
      const cfg = defaultEngineMode(raw);
      if (!isProjectConfig(cfg)) {
        throw new DaoyanCliError({
          code: "config_invalid",
          message: `${candidate} 缺少或非法的必填字段（name / engine / models；engine.mode 缺省按 local 处理，此时需要 comfyui_dir 与 venv_dir；mode 仅接受 local / remote），见 docs/DATA-MODEL.md`,
        });
      }
      return { root: dir, config: absolutize(cfg, dir) };
    }
    // 上一级目录（到达文件系统根时 parent === dir，停止）
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * engine.mode 缺省时按 local 加载（remote 为既定设计，后续里程碑细化）。
 */
function defaultEngineMode(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  // 原始对象的宽松视图
  const o = raw as Record<string, unknown>;
  if (typeof o.engine !== "object" || o.engine === null) return raw;
  // engine 段的宽松视图
  const e = o.engine as Record<string, unknown>;
  if (e.mode !== undefined) return raw;
  return { ...o, engine: { ...e, mode: "local" } };
}

/**
 * 校验对象是否为合法的 ProjectConfig（按接入模式分别校验必填字段）。
 */
function isProjectConfig(v: unknown): v is ProjectConfig {
  if (typeof v !== "object" || v === null) return false;
  // 顶层字段的宽松视图
  const o = v as Record<string, unknown>;
  if (
    typeof o.name !== "string" ||
    typeof o.engine !== "object" ||
    o.engine === null ||
    typeof o.models !== "object" ||
    o.models === null
  ) {
    return false;
  }
  // engine 段的宽松视图
  const e = o.engine as Record<string, unknown>;
  if (typeof e.host !== "string" || typeof e.port !== "number") return false;
  // 按接入模式校验：local 必须声明本地引擎路径；remote 不需要（也不应使用）它们。
  if (e.mode === "local") {
    return typeof e.comfyui_dir === "string" && typeof e.venv_dir === "string";
  }
  return e.mode === "remote";
}

/**
 * 把配置里的相对路径锚定到项目根（comfyui_dir / venv_dir）。
 */
function absolutize(cfg: ProjectConfig, root: string): ProjectConfig {
  // 单路径锚定：绝对路径原样，相对路径拼到 root
  const fix = (p: string): string => (isAbsolute(p) ? p : join(root, p));
  return {
    ...cfg,
    engine:
      cfg.engine.mode === "local"
        ? {
            ...cfg.engine,
            comfyui_dir: fix(cfg.engine.comfyui_dir),
            venv_dir: fix(cfg.engine.venv_dir),
          }
        : cfg.engine,
  };
}

/**
 * 从命令上下文解析项目：--project 指定，否则自 cwd 向上寻找。
 */
export function projectFromContext(ctx: CliContext): FoundProject | null {
  return findProject(ctx.projectPath ?? process.cwd());
}

/**
 * 加载项目根下的 shots.json（解析失败抛 config_invalid）。
 */
export function loadShotsFile(root: string): ShotsFile {
  // 分镜表的绝对路径
  const file = join(root, SHOTS_FILE);
  if (!existsSync(file)) {
    throw new DaoyanCliError({ code: "config_invalid", message: `缺少 ${file}（init 生成或手工创建）` });
  }
  try {
    // 解析出的原始 JSON
    const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (typeof raw !== "object" || raw === null) throw new Error("顶层不是对象");
    return raw as ShotsFile;
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} 不是合法的 shots.json：${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

/**
 * 回写 project.json（engine use 等命令用）。
 */
export function saveProjectConfig(root: string, cfg: ProjectConfig): void {
  writeFileSync(join(root, PROJECT_FILE), JSON.stringify(cfg, null, 2) + "\n");
}
