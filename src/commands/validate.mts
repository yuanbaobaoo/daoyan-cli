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

/**
 * 单条校验结果（错误或警告）。
 */
interface Issue {
  /**
   * 严重级别。
   */
  level: "error" | "warning";
  /**
   * 问题定位项（字段名或镜号）。
   */
  item: string;
  /**
   * 人类可读说明。
   */
  message: string;
}

/**
 * validate 命令的 --json 数据（也进入失败信封的 details）。
 */
export interface ValidateReport {
  /**
   * 是否通过（无 error）。
   */
  ok: boolean;
  /**
   * 错误列表。
   */
  errors: Issue[];
  /**
   * 警告列表。
   */
  warnings: Issue[];
}

// workflow 模板必须包含的约定节点键（见 docs/DATA-MODEL.md）
const REQUIRED_WF_KEYS = ["4_negative", "5_cond", "6_shift", "7_sample", "9_save"];
// 生成尺寸必须为 32 的倍数（宽 / 高各自校验）
const DIM_MULTIPLE = 32;
// 帧网格步长：length 应为 17k+5
const FRAME_GRID_STEP = 17;
// 帧网格偏移（17k+5 的 +5）
const FRAME_GRID_OFFSET = 5;

/**
 * validate 命令入口：全量校验并汇总输出。
 */
export async function runValidate(ctx: CliContext): Promise<void> {
  // 项目定位结果
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json；用 --project 指定或在项目目录内运行" });
  }
  // 项目根与配置
  const { root, config: cfg } = found;
  // 待校验的分镜表
  const shots = loadShotsFile(root);
  // 收集到的错误
  const errors: Issue[] = [];
  // 收集到的警告
  const warnings: Issue[] = [];

  // --- 分镜表基础 ---
  if (shots.shots.length === 0) errors.push({ level: "error", item: "shots", message: "分镜表为空" });
  if (shots.meta.width <= 0 || shots.meta.width % DIM_MULTIPLE !== 0) {
    errors.push({ level: "error", item: "meta.width", message: `${shots.meta.width} 不是 32 的倍数` });
  }
  if (shots.meta.height <= 0 || shots.meta.height % DIM_MULTIPLE !== 0) {
    errors.push({ level: "error", item: "meta.height", message: `${shots.meta.height} 不是 32 的倍数` });
  }
  // 逐个校验必需默认参数
  for (const key of ["length", "steps", "cfg", "negative"] as const) {
    if (shots.defaults[key] === undefined) {
      errors.push({ level: "error", item: `defaults.${key}`, message: "缺少默认参数" });
    }
  }

  // 已出现的镜号（查重）
  const seenId = new Set<string>();
  // 已出现的 seed（查重）
  const seenSeed = new Set<string>();
  // 镜号 -> 分镜（接力链解析用）
  const byId = new Map(shots.shots.map((s) => [s.id, s]));
  // 逐镜校验基础字段
  for (const s of shots.shots) {
    // 本条问题的定位标签
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
    // 该镜实际生效的帧数
    const len = s.length ?? shots.defaults.length;
    if (typeof len === "number" && len % FRAME_GRID_STEP !== FRAME_GRID_OFFSET) {
      // MiniMax H3 帧网格 17k+5；非对齐值会被引擎静默取整，仅提示
      warnings.push({ level: "warning", item: tag, message: `length ${len} 不符合 17k+5 帧网格（将被对齐）` });
    }
  }

  // --- 首帧：锚点 / 接力 ---
  for (const s of shots.shots) {
    // 该镜声明的首帧
    const ff: FirstFrame = s.first_frame;
    if (ff === undefined) continue;
    // 本条问题的定位标签
    const tag = `镜 ${s.id}`;
    if (typeof ff === "string") {
      // 锚点相对路径（未登记为 undefined）
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
    // 本链路上已访问的镜号
    const seen = new Set<string>([s.id]);
    // 沿接力链前进的游标
    let cur = s;
    for (;;) {
      // 游标镜的首帧
      const ff = cur.first_frame;
      if (typeof ff !== "object" || ff === undefined) break;
      // 上游分镜（不存在即断链，前面已单独报错）
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
  // workflow 模板文件的绝对路径
  const wfFile = join(root, cfg.workflow);
  if (!existsSync(wfFile)) {
    errors.push({ level: "error", item: cfg.workflow, message: "workflow 模板文件不存在" });
  } else {
    try {
      // 解析后的模板（宽松视图）
      const wf = JSON.parse(readFileSync(wfFile, "utf8")) as Record<string, unknown>;
      // 逐个校验约定节点键
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
      warnings.push({ level: "warning", item: "engine.comfyui_dir", message: `目录不存在（${cfg.engine.comfyui_dir}）——引擎未安装？运行 daoyan init` });
    }
    if (!existsSync(cfg.engine.venv_dir)) {
      warnings.push({ level: "warning", item: "engine.venv_dir", message: `目录不存在（${cfg.engine.venv_dir}）——引擎未安装？运行 daoyan init` });
    }
  }

  // 是否通过（无错误即通过）
  const ok = errors.length === 0;
  if (!ctx.json) {
    // 逐条输出错误
    for (const e of errors) say(`✗ [${e.item}] ${e.message}`);
    // 逐条输出警告
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
