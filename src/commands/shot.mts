/** shot / retake —— 拍摄命令：锁 → 引擎就位 → 首帧解析 → 生成 → 落位。
 *  断点续跑：已有产物跳过（retake = 强制重拍）。GPU 编排（evict/restore）尚未接入。 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say, attachFileSink } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { loadShotsFile, projectFromContext } from "../core/project/config.mts";
import { acquireLock, releaseLock } from "../core/lock/task-lock.mts";
import { ensureEngine } from "../core/comfy/lifecycle.mts";
import { clientFromEngine } from "../core/comfy/client.mts";
import { findClip, generateShot, resolveFirstFrame, type GenerateResult } from "../core/pipeline/generate.mts";
import { LOG_DIR, TASK_LOCK_FILE, TOOL_LOG_FILE, type ShotSpec } from "../core/project/types.mts";

/**
 * shot 命令解析出的开关。
 */
interface ShotFlags {
  /**
   * --steps：覆盖采样步数。
   */
  steps?: number;
  /**
   * --timeout：等待超时（小时）。
   */
  timeoutHours?: number;
  /**
   * --no-evict：跳过 GPU 让路（当前为默认行为）。
   */
  noEvict: boolean;
  /**
   * --no-up：不自动拉起引擎。
   */
  noUp: boolean;
  /**
   * --force：忽略已有产物强制重拍。
   */
  force: boolean;
}

/**
 * 解析 shot 的镜号与开关（镜号必填）。
 */
function parseFlags(args: string[]): { ids: string[]; flags: ShotFlags } {
  // 位置参数：目标镜号
  const ids: string[] = [];
  // 各开关的解析结果
  const flags: ShotFlags = { noEvict: false, noUp: false, force: false };
  // 顺序扫描全部参数
  for (let i = 0; i < args.length; i++) {
    // 当前参数
    const a = args[i];
    if (a === undefined) break;
    if (a === "--force") flags.force = true;
    else if (a === "--no-evict") flags.noEvict = true;
    else if (a === "--no-up") flags.noUp = true;
    else if (a === "--steps") {
      // --steps 的取值
      const v = args[i + 1];
      if (v === undefined) throw new DaoyanCliError({ code: "usage", message: "--steps 需要数值", exit: 2 });
      flags.steps = Number(v);
      i++;
    } else if (a === "--timeout") {
      // --timeout 的取值
      const v = args[i + 1];
      if (v === undefined) throw new DaoyanCliError({ code: "usage", message: "--timeout 需要小时数", exit: 2 });
      flags.timeoutHours = Number(v);
      i++;
    } else if (a.startsWith("-")) {
      throw new DaoyanCliError({ code: "usage", message: `未知参数 ${a}`, exit: 2 });
    } else ids.push(a);
  }
  if (ids.length === 0) throw new DaoyanCliError({ code: "usage", message: "缺少镜号，如 daoyan shot 01 02", exit: 2 });
  return { ids, flags };
}

/**
 * shot / retake 命令入口：逐镜执行 锁 → 就位 → 生成 → 落位。
 */
export async function runShot(ctx: CliContext, args: string[], presetForce = false): Promise<void> {
  // 解析出的镜号与开关
  const { ids, flags } = parseFlags(args);
  // 是否强制重拍（retake 命令或 --force）
  const force = presetForce || flags.force;
  // 项目定位结果
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json（自当前位置向上寻找）。用 --project 指定或在项目目录内运行" });
  }
  // 项目根与配置
  const { root, config: cfg } = found;
  attachFileSink(join(root, LOG_DIR, TOOL_LOG_FILE));
  // 分镜表（镜号解析与首帧规则的数据源）
  const shots = loadShotsFile(root);

  if (cfg.engine.mode === "remote") {
    throw new DaoyanCliError({
      code: "not_implemented",
      message: "remote 模式的生成（首帧上传 / 产物落位）在 M2 交付；当前请用 local 模式",
    });
  }

  // 解析镜号 → 分镜对象
  const targets: ShotSpec[] = [];
  // 逐个解析为分镜对象
  for (const id of ids) {
    // 当前镜号对应的分镜
    const s = shots.shots.find((x) => x.id === id);
    if (s === undefined) {
      throw new DaoyanCliError({
        code: "usage",
        message: `未知镜号 ${id}；可用：${shots.shots.map((x) => x.id).join(" ")}`,
        exit: 2,
      });
    }
    targets.push(s);
  }

  // 任务锁文件路径
  const lockPath = join(root, LOG_DIR, TASK_LOCK_FILE);
  acquireLock(lockPath, `shot ${ids.join(" ")}`);
  // 本次成功的生成结果
  const results: GenerateResult[] = [];
  // 因已有产物跳过的镜号
  const skipped: string[] = [];
  // 失败镜号与原因
  const failed: Array<{ id: string; error: string; code: string }> = [];
  try {
    // 引擎客户端（--no-up 时直接连，否则确保就位）
    let client = clientFromEngine(cfg.engine);
    if (!flags.noUp) {
      client = await ensureEngine(root, cfg, say);
    }
    // 引擎队列执行中任务数
    const running = await client.queueRunningLen();
    if (running !== null && running > 0) {
      throw new DaoyanCliError({
        code: "engine_busy",
        message: `引擎队列已有 ${running} 个执行中任务（可能来自网页或其他提交），拒绝并行`,
      });
    }

    // 逐镜拍摄（已有产物跳过）
    for (const shot of targets) {
      // 断点续跑：已有产物跳过
      const existing = findClip(root, cfg, shot);
      if (existing !== null && !force) {
        say(`镜 ${shot.id} 已有产物，跳过（重拍用 retake）：${existing}`);
        skipped.push(shot.id);
        continue;
      }
      try {
        // 本镜的流水日志文件
        const genLog = genLogPath(root, shot.id);
        // 本镜日志输出（stdout + 落盘）
        const log = (m: string): void => {
          say(m);
          try {
            appendFileSync(genLog, `[${new Date().toTimeString().slice(0, 8)}] ${m}\n`);
          } catch {
            // 忽略：单镜日志写入失败不影响主流程
          }
        };

        // 解析出的首帧（锚点 / 接力 / 纯文生）
        const ff = await resolveFirstFrame(root, cfg, shots, shot, log);
        // 本镜生成结果
        const r = await generateShot({
          root,
          cfg,
          shots,
          shot,
          client,
          log,
          firstFrame: ff,
          stepsOverride: flags.steps,
          timeoutMs: flags.timeoutHours !== undefined ? flags.timeoutHours * 3600_000 : undefined,
        });
        results.push(r);
        say(`镜 ${shot.id} 完成（${r.seconds}s）：${r.output}`);
      } catch (e) {
        if (e instanceof DaoyanCliError) {
          failed.push({ id: shot.id, code: e.code, error: e.message });
          say(`镜 ${shot.id} 失败[${e.code}]：${e.message}`);
        } else {
          failed.push({ id: shot.id, code: "shot_failed", error: e instanceof Error ? e.message : String(e) });
          say(`镜 ${shot.id} 失败：${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } finally {
    releaseLock(lockPath);
  }

  if (failed.length > 0) {
    throw new DaoyanCliError({
      code: "shot_failed",
      message: `完成 ${results.length}，跳过 ${skipped.length}，失败 ${failed.length}：${failed.map((f) => f.id).join(" ")}`,
      details: { done: results, skipped, failed },
    });
  }
  if (ctx.json) {
    emitData({ done: results, skipped });
    return;
  }
  say(`全部完成：${results.map((r) => r.shotId).join(" ") || "（无新拍）"}`);
}

/**
 * 生成单镜日志路径（logs/gen_<镜号>_<时间戳>.log）。
 */
function genLogPath(root: string, id: string): string {
  // logs 目录（不存在则建）
  const dir = join(root, LOG_DIR);
  mkdirSync(dir, { recursive: true });
  // 紧凑时间戳（YYYYMMDDHHMMSS）
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return join(dir, `gen_${id}_${ts}.log`);
}
