/** project.json 加载：自起始目录向上寻找（类似 git 寻找 .git）。
 *  - 找不到返回 null（调用方决定报 project_not_found 还是静默）；
 *  - 找到但非法抛 config_invalid；
 *  - 相对路径一律锚到项目根（项目内相对布局的直觉）。 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { PROJECT_FILE, type ProjectConfig } from "./types.mts";

export interface FoundProject {
  root: string;
  config: ProjectConfig;
}

export function findProject(start: string): FoundProject | null {
  let dir = resolve(start);
  for (;;) {
    const candidate = join(dir, PROJECT_FILE);
    if (existsSync(candidate)) {
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(candidate, "utf8"));
      } catch (e) {
        throw new DaoyanCliError({
          code: "config_invalid",
          message: `${candidate} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
        });
      }
      const cfg = defaultEngineMode(raw);
      if (!isProjectConfig(cfg)) {
        throw new DaoyanCliError({
          code: "config_invalid",
          message: `${candidate} 缺少或非法的必填字段（name / engine / models；engine.mode 缺省按 local 处理，此时需要 comfyui_dir 与 venv_dir；mode 仅接受 local / remote），见 docs/DATA-MODEL.md`,
        });
      }
      return { root: dir, config: absolutize(cfg, dir) };
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** engine.mode 缺省时按 local 加载（remote 为既定设计，后续里程碑细化）。 */
function defaultEngineMode(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const o = raw as Record<string, unknown>;
  if (typeof o.engine !== "object" || o.engine === null) return raw;
  const e = o.engine as Record<string, unknown>;
  if (e.mode !== undefined) return raw;
  return { ...o, engine: { ...e, mode: "local" } };
}

function isProjectConfig(v: unknown): v is ProjectConfig {
  if (typeof v !== "object" || v === null) return false;
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
  const e = o.engine as Record<string, unknown>;
  if (typeof e.host !== "string" || typeof e.port !== "number") return false;
  // 按接入模式校验：local 必须声明本地引擎路径；remote 不需要（也不应使用）它们。
  if (e.mode === "local") {
    return typeof e.comfyui_dir === "string" && typeof e.venv_dir === "string";
  }
  return e.mode === "remote";
}

function absolutize(cfg: ProjectConfig, root: string): ProjectConfig {
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
