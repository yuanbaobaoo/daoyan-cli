/** help —— 帮助与 agent 自描述（替代早期的 discover 命令）：
 *  - daoyan help            人类可读总览
 *  - daoyan help <命令>     单命令详情
 *  - daoyan help --json     机器可读自描述（命令树/信封/退出码/错误码）
 *  接收注册表与版本作为参数，避免与 registry 形成运行时循环依赖。 */
import { GROUP_LABEL, type CommandGroup } from "../shared/groups.mts";
import { ERROR_CODES, DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import type { CliContext } from "../shared/context.mts";
import type { CommandMeta } from "./registry.mts";

/**
 * help --json 的自描述文档结构（公开契约，agent 依赖它盲操作）。
 */
export interface AgentDoc {
  /**
   * 可执行入口名。
   */
  name: string;
  /**
   * CLI 版本（与 package.json 同步）。
   */
  version: string;
  /**
   * 一句话定位。
   */
  tagline: string;
  /**
   * 全部命令的元信息列表。
   */
  commands: Array<{
    /**
     * 命令名（含子命令）。
     */
    name: string;
    /**
     * 分组。
     */
    group: CommandGroup;
    /**
     * 一句话说明。
     */
    summary: string;
    /**
     * 用法字符串。
     */
    usage: string;
    /**
     * 是否已实现。
     */
    implemented: boolean;
  }>;
  /**
   * --json 输出信封的两种形状示例。
   */
  outputEnvelope: { success: unknown; failure: unknown };
  /**
   * 退出码含义表。
   */
  exitCodes: Record<string, string>;
  /**
   * 全部错误码（errors.mts 的枚举）。
   */
  errorCodes: readonly string[];
}

/**
 * 构造 agent 自描述文档（help --json 的 data）。
 */
export function buildAgentDoc(version: string, commands: readonly CommandMeta[]): AgentDoc {
  return {
    name: "daoyan",
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

/**
 * 打印人类可读总览（无参数 help）。
 */
export function printMainHelp(commands: readonly CommandMeta[], version: string): void {
  // 输出的全部行（末尾一次写出）
  const lines: string[] = [
    "daoyan —— 剧本进，成片出。You prepare the story. The director shoots it.",
    "",
    "用法: daoyan [全局参数] <命令> [参数...]（dycli 与 daoyan 完全等价）",
    "",
    "全局参数:",
    "  --json            机器可读输出（信封格式见 daoyan help --json）",
    "  --project <路径>   指定项目目录（默认自当前位置向上寻找 project.json）",
    "  --no-color        关闭彩色输出",
    "  -h, --help        帮助；daoyan help <命令> 查看单命令详情",
    "  -v, --version     版本",
    "",
  ];
  // 按注册顺序逐组输出
  for (const g of Object.keys(GROUP_LABEL) as CommandGroup[]) {
    lines.push(`${GROUP_LABEL[g]}:`);
    // 输出组内每个命令的用法与说明
    for (const c of commands.filter((x) => x.group === g)) {
      lines.push(`  ${c.usage}`);
      lines.push(`    ${c.summary}`);
    }
    lines.push("");
  }
  lines.push(`daoyan v${version} · ComfyUI 是外部组件 · 文档见 docs/`);
  process.stdout.write(lines.join("\n") + "\n");
}

/**
 * 打印单命令详情（help <命令>）。
 */
export function printCommandHelp(meta: CommandMeta): void {
  // 输出的行：用法 + 说明 + 可选补充
  const lines: string[] = [meta.usage, `  ${meta.summary}`];
  if (meta.detail !== undefined) {
    lines.push("");
    // 逐条输出补充说明
    for (const d of meta.detail) lines.push(`  ${d}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

/**
 * help 命令入口：无参出总览，带命令名出详情，--json 出自描述。
 */
export function runHelp(
  ctx: CliContext,
  args: string[],
  commands: readonly CommandMeta[],
  version: string,
): void {
  // 目标命令名（忽略 - 开头的参数）
  const target = args.filter((a) => !a.startsWith("-")).join(" ");
  if (target === "") {
    if (ctx.json) {
      emitData(buildAgentDoc(version, commands));
      return;
    }
    printMainHelp(commands, version);
    return;
  }
  // 命中的命令（未命中为 undefined）
  const hit = commands.find((c) => c.name === target);
  if (hit === undefined) {
    throw new DaoyanCliError({
      code: "usage",
      message: `未知命令 ${target}；daoyan help 查看全部`,
      exit: 2,
    });
  }
  printCommandHelp(hit);
}
