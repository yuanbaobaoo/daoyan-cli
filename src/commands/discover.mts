/** discover —— agent 自描述文档（借鉴 comfy-cli 的 discover 思想）：
 *  一次输出命令树 / 输出信封 / 退出码 / 错误码，agent 无需读源码即可驱动 daoyan-cli。
 *  接收注册表与版本作为参数，避免与 registry 形成运行时循环依赖。 */
import { GROUP_LABEL, type CommandGroup } from "../shared/groups.mts";
import { ERROR_CODES } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import type { CliContext } from "../shared/context.mts";
import type { CommandMeta } from "./registry.mts";

export interface DiscoveryDoc {
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

export function buildDiscovery(version: string, commands: readonly CommandMeta[]): DiscoveryDoc {
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

export function runDiscover(
  ctx: CliContext,
  _args: string[],
  commands: readonly CommandMeta[],
  version: string,
): void {
  const doc = buildDiscovery(version, commands);
  if (ctx.json) {
    emitData(doc);
    return;
  }
  process.stdout.write(`daoyan-cli v${doc.version} —— ${doc.tagline}\n\n`);
  for (const g of Object.keys(GROUP_LABEL) as CommandGroup[]) {
    process.stdout.write(`${GROUP_LABEL[g]}：\n`);
    for (const c of doc.commands.filter((x) => x.group === g)) {
      const mark = c.implemented ? "✅" : "⬜";
      process.stdout.write(`  ${mark} ${c.usage}\n      ${c.summary}\n`);
    }
    process.stdout.write("\n");
  }
  process.stdout.write(`退出码：${JSON.stringify(doc.exitCodes)}\n`);
  process.stdout.write(`错误码：${doc.errorCodes.join(", ")}（语义见 docs/ERROR-CODES.md）\n`);
}
