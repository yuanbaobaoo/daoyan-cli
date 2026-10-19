/** skill update —— 重新生成项目内 `.agents/skills/daoyan/` 与 AGENTS.md 管理块。
 *  不启动引擎、不修改工作流、不执行 Git；项目外运行报 project_not_found。 */
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { requireProject } from "../core/project/config.mts";
import { skillState, writeSkill } from "../core/agent/skill.mts";
import { VERSION } from "../shared/version.mts";

/**
 * skill 命令入口（当前只有 update 子命令）。
 */
export async function runSkill(ctx: CliContext, args: string[]): Promise<void> {
  // 子命令（registry 分发 "skill update" 时会剥离 "update"）
  const sub = args[0] ?? "update";
  if (sub !== "update") {
    throw new DaoyanCliError({
      code: "usage",
      message: "用法：daoyan skill update",
      exit: 2,
    });
  }
  // 项目
  const { root } = requireProject(ctx);
  // 动态导入 registry，避免静态循环依赖
  const { COMMANDS } = await import("./registry.mts");
  // 重新生成（幂等）
  const result = writeSkill(root, VERSION, COMMANDS);
  // 生成后的状态
  const state = skillState(root, VERSION, COMMANDS);
  if (ctx.json) {
    emitData({
      path: ".agents/skills/daoyan/",
      files: result.files,
      hash: result.hash,
      stale: state.stale,
      agents_md: "AGENTS.md",
    });
    return;
  }
  say(`Skill 已更新：.agents/skills/daoyan/（${result.files} 个文件）`);
  say("AGENTS.md 管理块已同步（未覆盖其他内容）");
}
