/** validate —— 项目规则全量校验：分镜表字段 / 锚点存在 / 接力链闭合无环 /
 *  尺寸 32 倍数 / seed 冲突 / prompt 非空 / workflow 节点命名约定 / 引擎目录。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { loadShotsFile, projectFromContext } from "../core/project/config.mts";
import type { FirstFrame } from "../core/project/types.mts";

interface Issue {
  level: "error" | "warning";
  item: string;
  message: string;
}

export interface ValidateReport {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
}

const REQUIRED_WF_KEYS = ["4_negative", "5_cond", "6_shift", "7_sample", "9_save"];

export async function runValidate(ctx: CliContext): Promise<void> {
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json；用 --project 指定或在项目目录内运行" });
  }
  const { root, config: cfg } = found;
  const shots = loadShotsFile(root);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  // --- 分镜表基础 ---
  if (shots.shots.length === 0) errors.push({ level: "error", item: "shots", message: "分镜表为空" });
  if (shots.meta.width <= 0 || shots.meta.width % 32 !== 0) {
    errors.push({ level: "error", item: "meta.width", message: `${shots.meta.width} 不是 32 的倍数` });
  }
  if (shots.meta.height <= 0 || shots.meta.height % 32 !== 0) {
    errors.push({ level: "error", item: "meta.height", message: `${shots.meta.height} 不是 32 的倍数` });
  }
  for (const key of ["length", "steps", "cfg", "negative"] as const) {
    if (shots.defaults[key] === undefined) {
      errors.push({ level: "error", item: `defaults.${key}`, message: "缺少默认参数" });
    }
  }

  const seenId = new Set<string>();
  const seenSeed = new Set<string>();
  const byId = new Map(shots.shots.map((s) => [s.id, s]));
  for (const s of shots.shots) {
    const tag = `镜 ${s.id}`;
    if (seenId.has(s.id)) errors.push({ level: "error", item: tag, message: "镜号重复" });
    seenId.add(s.id);
    if (typeof s.seed !== "number") errors.push({ level: "error", item: tag, message: "缺少数值 seed" });
    else if (seenSeed.has(String(s.seed))) errors.push({ level: "error", item: tag, message: `seed ${s.seed} 与其他镜冲突` });
    seenSeed.add(String(s.seed));
    if (typeof s.prompt !== "string" || s.prompt.trim() === "") {
      errors.push({ level: "error", item: tag, message: "prompt 为空" });
    }
    if (typeof s.slug !== "string" || s.slug === "") errors.push({ level: "error", item: tag, message: "缺少 slug" });
    const len = s.length ?? shots.defaults.length;
    if (typeof len === "number" && len % 17 !== 5) {
      // MiniMax H3 帧网格 17k+5；非对齐值会被引擎静默取整，仅提示
      warnings.push({ level: "warning", item: tag, message: `length ${len} 不符合 17k+5 帧网格（将被对齐）` });
    }
  }

  // --- 首帧：锚点 / 接力 ---
  for (const s of shots.shots) {
    const ff: FirstFrame = s.first_frame;
    if (ff === undefined) continue;
    const tag = `镜 ${s.id}`;
    if (typeof ff === "string") {
      const rel = shots.meta.anchors[ff];
      if (rel === undefined) {
        errors.push({ level: "error", item: tag, message: `锚点 key "${ff}" 不在 meta.anchors` });
      } else if (!existsSync(join(root, rel))) {
        errors.push({ level: "error", item: tag, message: `锚点图片不存在：${rel}` });
      }
    } else if (typeof ff === "object" && typeof ff.relay === "string") {
      if (!byId.has(ff.relay)) {
        errors.push({ level: "error", item: tag, message: `接力上游 ${ff.relay} 不存在` });
      }
    } else {
      errors.push({ level: "error", item: tag, message: "first_frame 非法（应为锚点字符串或 {\"relay\":\"id\"}）" });
    }
  }
  // 接力环检测
  for (const s of shots.shots) {
    const seen = new Set<string>([s.id]);
    let cur = s;
    for (;;) {
      const ff = cur.first_frame;
      if (typeof ff !== "object" || ff === undefined) break;
      const next = byId.get(ff.relay);
      if (next === undefined) break;
      if (seen.has(next.id)) {
        errors.push({ level: "error", item: `镜 ${s.id}`, message: `接力链成环（经过 ${next.id}）` });
        break;
      }
      seen.add(next.id);
      cur = next;
    }
  }

  // --- workflow 模板 ---
  const wfFile = join(root, cfg.workflow);
  if (!existsSync(wfFile)) {
    errors.push({ level: "error", item: cfg.workflow, message: "workflow 模板文件不存在" });
  } else {
    try {
      const wf = JSON.parse(readFileSync(wfFile, "utf8")) as Record<string, unknown>;
      for (const k of REQUIRED_WF_KEYS) {
        if (typeof wf[k] !== "object" || wf[k] === null) {
          errors.push({ level: "error", item: cfg.workflow, message: `缺少约定节点键 "${k}"（见 docs/DATA-MODEL.md）` });
        }
      }
    } catch (e) {
      errors.push({ level: "error", item: cfg.workflow, message: `不是合法 JSON（${e instanceof Error ? e.message : String(e)}）` });
    }
  }

  // --- 引擎目录（local） ---
  if (cfg.engine.mode === "local") {
    if (!existsSync(cfg.engine.comfyui_dir)) {
      warnings.push({ level: "warning", item: "engine.comfyui_dir", message: `目录不存在（${cfg.engine.comfyui_dir}）——引擎未安装？运行 daoyan-cli init` });
    }
    if (!existsSync(cfg.engine.venv_dir)) {
      warnings.push({ level: "warning", item: "engine.venv_dir", message: `目录不存在（${cfg.engine.venv_dir}）——引擎未安装？运行 daoyan-cli init` });
    }
  }

  const ok = errors.length === 0;
  if (!ctx.json) {
    for (const e of errors) say(`✗ [${e.item}] ${e.message}`);
    for (const w of warnings) say(`! [${w.item}] ${w.message}`);
    say(ok ? `校验通过（${warnings.length} 条警告）` : `校验失败：${errors.length} 项错误`);
  }
  if (!ok) {
    throw new DaoyanCliError({
      code: "validation_failed",
      message: `项目校验未通过（${errors.length} 项错误，见 details）`,
      details: { errors, warnings },
    });
  }
  if (ctx.json) {
    emitData({ ok, errors, warnings } satisfies ValidateReport);
  }
}
