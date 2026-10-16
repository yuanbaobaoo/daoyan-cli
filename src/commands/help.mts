/** help —— 帮助与 agent 自描述（替代早期的 discover 命令）：
 *  - daoyan-cli help            人类可读总览
 *  - daoyan-cli help <命令>     单命令详情
 *  - daoyan-cli help --json     机器可读自描述（命令树/信封/退出码/错误码）
 *  接收注册表与版本作为参数，避免与 registry 形成运行时循环依赖。 */
import { GROUP_LABEL, type CommandGroup } from "../shared/groups.mts";
import { ERROR_CODES, DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import type { CliContext } from "../shared/context.mts";
import type { CommandMeta } from "./registry.mts";

export interface AgentDoc {
  name: string;
  version: string;
  tagline: string;
  commands: Array<{
    name: string;
    group: CommandGroup;
    summary: string;
    usage: string;
    implemented: boolean;
  }>;
  outputEnvelope: { success: unknown; failure: unknown };
  exitCodes: Record<string, string>;
  errorCodes: readonly string[];
}

export function buildAgentDoc(version: string, commands: readonly CommandMeta[]): AgentDoc {
  return {
    name: "daoyan-cli",
    version,
    tagline: "剧本进，成片出。You prepare the story. The director shoots it.",
    commands: commands.map((c) => ({
      name: c.name,
      group: c.group,
      summary: c.summary,
      usage: c.usage,
      implemented: c.implemented ?? false,
    })),
    outputEnvelope: {
      success: { ok: true, data: "…" },
      failure: { ok: false, error: { code: "shot_timeout", message: "…", details: {} } },
    },
    exitCodes: { "0": "成功", "1": "业务失败", "2": "用法错误", "130": "被中断" },
    errorCodes: ERROR_CODES,
  };
}

export function printMainHelp(commands: readonly CommandMeta[], version: string): void {
  const lines: string[] = [
    "daoyan-cli —— 剧本进，成片出。You prepare the story. The director shoots it.",
    "",
    "用法: daoyan-cli [全局参数] <命令> [参数...]（dyc 与 daoyan-cli 完全等价）",
    "",
    "全局参数:",
    "  --json            机器可读输出（信封格式见 daoyan-cli help --json）",
    "  --project <路径>   指定项目目录（默认自当前位置向上寻找 project.json）",
    "  --no-color        关闭彩色输出",
    "  -h, --help        帮助；daoyan-cli help <命令> 查看单命令详情",
    "  -v, --version     版本",
    "",
  ];
  for (const g of Object.keys(GROUP_LABEL) as CommandGroup[]) {
    lines.push(`${GROUP_LABEL[g]}:`);
    for (const c of commands.filter((x) => x.group === g)) {
      lines.push(`  ${c.usage}`);
      lines.push(`    ${c.summary}`);
    }
    lines.push("");
  }
  lines.push(`daoyan-cli v${version} · ComfyUI 是外部组件 · 文档见 docs/`);
  process.stdout.write(lines.join("\n") + "\n");
}

export function printCommandHelp(meta: CommandMeta): void {
  const lines: string[] = [meta.usage, `  ${meta.summary}`];
  if (meta.detail !== undefined) {
    lines.push("");
    for (const d of meta.detail) lines.push(`  ${d}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

export function runHelp(
  ctx: CliContext,
  args: string[],
  commands: readonly CommandMeta[],
  version: string,
): void {
  const target = args.filter((a) => !a.startsWith("-")).join(" ");
  if (target === "") {
    if (ctx.json) {
      emitData(buildAgentDoc(version, commands));
      return;
    }
    printMainHelp(commands, version);
    return;
  }
  const hit = commands.find((c) => c.name === target);
  if (hit === undefined) {
    throw new DaoyanCliError({
      code: "usage",
      message: `未知命令 ${target}；daoyan-cli help 查看全部`,
      exit: 2,
    });
  }
  printCommandHelp(hit);
}
