/**
 * status —— 场记汇报：引擎 / 队列 / 任务锁 / GPU / 内存 / 镜头完成度。
 */
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say, attachFileSink } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { join } from "node:path";
import { loadShotsFile, projectFromContext } from "../core/project/config.mts";
import { LOG_DIR, TOOL_LOG_FILE } from "../core/project/types.mts";
import { collectStatus } from "../core/obs/collect.mts";

/**
 * status 命令入口：采集并输出人读摘要或 --json 数据。
 */
export async function runStatus(ctx: CliContext): Promise<void> {
  // 项目定位结果
  const found = projectFromContext(ctx);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "未找到 project.json；用 --project 指定或在项目目录内运行" });
  }
  // 项目根与配置
  const { root, config: cfg } = found;
  attachFileSink(join(root, LOG_DIR, TOOL_LOG_FILE));
  // 分镜表（用于完成度统计）
  const shots = loadShotsFile(root);
  // 采集到的完整状态
  const data = await collectStatus(root, cfg, shots);

  if (ctx.json) {
    emitData(data);
    return;
  }

  say(`项目 ${cfg.name} · 引擎 ${data.engine.mode} 模式`);
  say(
    `引擎：${data.engine.up ? "运行中" : "未运行"}（${data.engine.server}${data.engine.pid !== null ? `，pid ${data.engine.pid}` : ""}）` +
      (data.queue.running !== null ? ` · 队列 执行中 ${data.queue.running} / 等待 ${data.queue.pending ?? 0}` : ""),
  );
  say(
    data.task !== null
      ? `任务：${data.task.desc}（pid ${data.task.pid}，始于 ${data.task.started}）`
      : "任务：空闲（无活动任务锁）",
  );
  if (data.gpu.error !== undefined) say(`GPU：${data.gpu.error}`);
  else say(`GPU：${data.gpu.usedMib}MiB / ${data.gpu.totalMib}MiB，利用率 ${data.gpu.utilPct ?? "?"}%`);
  if (data.mem.totalGb !== undefined) {
    say(`内存：可用 ${data.mem.availGb ?? "?"}G / 共 ${data.mem.totalGb}G`);
  }
  // 已完成镜头数
  const done = data.shots.filter((s) => s.done).length;
  say(`镜头进度：${done}/${data.shots.length}`);
  // 逐镜输出完成度
  for (const s of data.shots) {
    say(`  ${s.done ? "✅" : "⬜"} ${s.id} ${s.slug}`);
  }
}
