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
import type { ShotSpec } from "../core/project/types.mts";

interface ShotFlags {
  steps?: number;
  timeoutHours?: number;
  noEvict: boolean;
  noUp: boolean;
  force: boolean;
}

function parseFlags(args: string[]): { ids: string[]; flags: ShotFlags } {
  const ids: string[] = [];
  const flags: ShotFlags = { noEvict: false, noUp: false, force: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === undefined) break;
    if (a === "--force") flags.force = true;
    else if (a === "--no-evict") flags.noEvict = true;
    else if (a === "--no-up") flags.noUp = true;
    else if (a === "--steps") {
      const v = args[i + 1];
      if (v === undefined) throw new DaoyanCliError({ code: "usage", message: "--steps 需要数值", exit: 2 });
      flags.steps = Number(v);
      i++;
    } else if (a === "--timeout") {
      const v = args[i + 1];
      if (v === undefined) throw new DaoyanCliError({ code: "usage", message: "--timeout 需要小时数", exit: 2 });
      flags.timeoutHours = Number(v);
      i++;
    } else if (a.startsWith("-")) {
      throw new DaoyanCliError({ code: "usage", message: `未知参数 ${a}`, exit: 2 });
    } else ids.push(a);
  }
  if (ids.length === 0) throw new DaoyanCliError({ code: "usage", message: "缺少镜号，如 daoyan-cli shot 01 02", exit: 2 });
  return { ids, flags };
}

export async function runShot(ctx: CliContext, args: string[], presetForce = false): Promise<void> {
  const { ids, flags } = parseFlags(args);
  const force = presetForce || flags.force;

  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json（自当前位置向上寻找）。用 --project 指定或在项目目录内运行" });
  }
  const { root, config: cfg } = found;
  attachFileSink(join(root, "logs", "daoyan-cli.log"));
  const shots = loadShotsFile(root);

  if (cfg.engine.mode === "remote") {
    throw new DaoyanCliError({
      code: "not_implemented",
      message: "remote 模式的生成（首帧上传 / 产物落位）在 M2 交付；当前请用 local 模式",
    });
  }

  // 解析镜号 → 分镜对象
  const targets: ShotSpec[] = [];
  for (const id of ids) {
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

  const lockPath = join(root, "logs", "task.lock");
  acquireLock(lockPath, `shot ${ids.join(" ")}`);
  const results: GenerateResult[] = [];
  const skipped: string[] = [];
  const failed: Array<{ id: string; error: string; code: string }> = [];
  try {
    let client = clientFromEngine(cfg.engine);
    if (!flags.noUp) {
      client = await ensureEngine(root, cfg, say);
    }
    const running = await client.queueRunningLen();
    if (running !== null && running > 0) {
      throw new DaoyanCliError({
        code: "engine_busy",
        message: `引擎队列已有 ${running} 个执行中任务（可能来自网页或其他提交），拒绝并行`,
      });
    }

    for (const shot of targets) {
      // 断点续跑：已有产物跳过
      const existing = findClip(root, cfg, shot);
      if (existing !== null && !force) {
        say(`镜 ${shot.id} 已有产物，跳过（重拍用 retake）：${existing}`);
        skipped.push(shot.id);
        continue;
      }
      try {
        const genLog = genLogPath(root, shot.id);
        const log = (m: string): void => {
          say(m);
          try {
            appendFileSync(genLog, `[${new Date().toTimeString().slice(0, 8)}] ${m}\n`);
          } catch {
            /* ignore */
          }
        };
        const ff = await resolveFirstFrame(root, cfg, shots, shot, log);
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

function genLogPath(root: string, id: string): string {
  const dir = join(root, "logs");
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return join(dir, `gen_${id}_${ts}.log`);
}
