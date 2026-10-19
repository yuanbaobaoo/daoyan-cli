/** shot / retake / batch —— 分镜 recipe 执行。
 *  一个 task 包含多个 run，由同一个 worker 串行执行，共用一次引擎会话与一把机器锁。
 *  默认异步；--wait 才阻塞。已有成功 run 的镜头默认跳过（retake 强制）。 */
import { DaoyanCliError } from "../shared/errors.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { loadMachine, loadShotsFile, requireProject } from "../core/project/config.mts";
import { enqueueRunTask } from "./run.mts";

/**
 * shot / retake 解析结果。
 */
interface ShotFlags {
  /**
   * 目标镜号。
   */
  ids: string[];
  /**
   * --steps 覆盖。
   */
  steps?: number;
  /**
   * --timeout（小时）。
   */
  timeoutHours?: number;
  /**
   * --request-id。
   */
  requestId?: string;
  /**
   * --wait。
   */
  wait: boolean;
  /**
   * --force（hidden；retake 默认 true）。
   */
  force: boolean;
}

/**
 * 解析 shot / retake 参数。
 */
function parseShotArgs(args: string[], presetForce: boolean): ShotFlags {
  // 结果
  const out: ShotFlags = { ids: [], wait: false, force: presetForce };
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name === "--steps") {
      const v = takeValue(args, i, inline, "--steps");
      out.steps = Number(v.value);
      if (!Number.isInteger(out.steps) || out.steps <= 0) usageError("--steps 需要正整数");
      i += v.skip;
      continue;
    }
    if (name === "--timeout") {
      const v = takeValue(args, i, inline, "--timeout");
      out.timeoutHours = Number(v.value);
      if (!Number.isFinite(out.timeoutHours) || out.timeoutHours <= 0) usageError("--timeout 需要正数（小时）");
      i += v.skip;
      continue;
    }
    if (name === "--request-id") {
      const v = takeValue(args, i, inline, "--request-id");
      out.requestId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--wait") {
      out.wait = true;
      continue;
    }
    if (name === "--force") {
      out.force = true;
      continue;
    }
    if (name === "--no-evict" || name === "--no-up") {
      // 旧参数已删除，给出明确提示而不是静默接受
      usageError(`${name} 已删除：引擎生命周期由 task worker 管理，GPU 接管由 project.json 的 gpu.takeover 控制`);
    }
    if (name.startsWith("-")) usageError(`未知参数 ${name}`);
    out.ids.push(name);
  }
  if (out.ids.length === 0) usageError("缺少镜号，如 daoyan shot 01 02");
  return out;
}

/**
 * shot / retake 入口。
 */
export async function runShot(ctx: CliContext, args: string[], presetForce = false): Promise<number> {
  const flags = parseShotArgs(args, presetForce);
  const { root, config: project } = requireProject(ctx);
  const machine = loadMachine(root);
  // 分镜表（提前校验镜号，避免创建无效 task）
  const shots = loadShotsFile(root);
  for (const id of flags.ids) {
    if (!shots.shots.some((s) => s.id === id)) {
      throw new DaoyanCliError({
        code: "usage",
        message: `未知镜号 ${id}；可用：${shots.shots.map((s) => s.id).join(" ")}`,
        exit: 2,
      });
    }
  }
  return enqueueRunTask({
    ctx,
    root,
    project,
    machine,
    command: `${presetForce ? "retake" : "shot"} ${flags.ids.join(" ")}`,
    kind: presetForce ? "retake" : "shot",
    ...(flags.requestId !== undefined ? { requestId: flags.requestId } : {}),
    options: {
      shots: flags.ids,
      force: flags.force,
      ...(flags.steps !== undefined ? { steps: flags.steps } : {}),
      ...(flags.timeoutHours !== undefined ? { timeout_ms: Math.round(flags.timeoutHours * 3_600_000) } : {}),
    },
    wait: flags.wait,
  });
}

/**
 * batch：执行全部未完成镜头（已有成功 run 的镜头跳过）。
 */
export async function runBatch(ctx: CliContext, args: string[]): Promise<number> {
  let timeoutHours: number | undefined;
  let requestId: string | undefined;
  let wait = false;
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name === "--timeout") {
      const v = takeValue(args, i, inline, "--timeout");
      timeoutHours = Number(v.value);
      if (!Number.isFinite(timeoutHours) || timeoutHours <= 0) usageError("--timeout 需要正数（小时）");
      i += v.skip;
      continue;
    }
    if (name === "--request-id") {
      const v = takeValue(args, i, inline, "--request-id");
      requestId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--wait") {
      wait = true;
      continue;
    }
    if (name === "--no-evict" || name === "--no-up") {
      usageError(`${name} 已删除：生命周期由 worker 管理`);
    }
    usageError(`未知参数 ${name}`);
  }
  const { root, config: project } = requireProject(ctx);
  const machine = loadMachine(root);
  // 提前校验分镜表存在且非空
  const shots = loadShotsFile(root);
  if (shots.shots.length === 0) throw new DaoyanCliError({ code: "config_invalid", message: "shots.json 没有镜头" });
  return enqueueRunTask({
    ctx,
    root,
    project,
    machine,
    command: "batch",
    kind: "batch",
    ...(requestId !== undefined ? { requestId } : {}),
    options: {
      force: false,
      ...(timeoutHours !== undefined ? { timeout_ms: Math.round(timeoutHours * 3_600_000) } : {}),
    },
    wait,
  });
}
