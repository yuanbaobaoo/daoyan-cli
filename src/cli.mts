/** daoyan-cli —— 面向 AI Agent 的 ComfyUI 生产编排 CLI · 入口
 *  零依赖手写参数解析（保持轻量）。
 *  全局参数：--json --project <路径> --no-color -h/--help -v/--version
 *  命令查找支持两级（"engine install"），见 commands/registry.mts。 */
import { COMMANDS, findCommand } from "./commands/registry.mts";
import type { CommandMeta } from "./commands/registry.mts";
import { GROUP_LABEL, type CommandGroup } from "./shared/groups.mts";
import { DaoyanCliError } from "./shared/errors.mts";
import { emitError } from "./shared/json.mts";
import type { CliContext } from "./shared/context.mts";
import { VERSION } from "./shared/version.mts";

function printHelp(): void {
  const lines: string[] = [
    "daoyan-cli —— 剧本进，成片出。You prepare the story. The director shoots it.",
    "",
    "用法: daoyan-cli [全局参数] <命令> [参数...]（dyc 与 daoyan-cli 完全等价）",
    "",
    "全局参数:",
    "  --json            机器可读输出（信封格式见 daoyan-cli discover）",
    "  --project <路径>   指定项目目录（默认自当前位置向上寻找 project.json）",
    "  --no-color        关闭彩色输出",
    "  -h, --help        帮助；daoyan-cli help <命令> 查看单命令详情",
    "  -v, --version     版本",
    "",
  ];
  for (const g of Object.keys(GROUP_LABEL) as CommandGroup[]) {
    lines.push(`${GROUP_LABEL[g]}:`);
    for (const c of COMMANDS.filter((x) => x.group === g)) {
      lines.push(`  ${c.usage}`);
      lines.push(`    ${c.summary}`);
    }
    lines.push("");
  }
  lines.push(`daoyan-cli v${VERSION} · ComfyUI 是外部组件 · 文档见 docs/`);
  process.stdout.write(lines.join("\n") + "\n");
}

function printCommandHelp(meta: CommandMeta): void {
  const lines: string[] = [meta.usage, `  ${meta.summary}`];
  if (meta.detail !== undefined) {
    lines.push("");
    for (const d of meta.detail) lines.push(`  ${d}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

async function main(ctx: CliContext, argv: string[]): Promise<number> {
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) break;
    switch (a) {
      case "--json":
        ctx.json = true;
        break;
      case "--no-color":
        ctx.noColor = true;
        break;
      case "--project": {
        const v = argv[i + 1];
        if (v === undefined || v === "") {
          throw new DaoyanCliError({ code: "usage", message: "--project 需要一个路径参数", exit: 2 });
        }
        ctx.projectPath = v;
        i++;
        break;
      }
      case "-h":
      case "--help":
        printHelp();
        return 0;
      case "-v":
      case "--version":
        process.stdout.write(`daoyan-cli v${VERSION}\n`);
        return 0;
      default:
        if (a.startsWith("-")) {
          throw new DaoyanCliError({ code: "usage", message: `未知参数 ${a}`, exit: 2 });
        }
        rest.push(a);
    }
  }

  const [name, ...cmdArgs] = rest;
  if (name === undefined) {
    printHelp();
    return 0;
  }
  if (name === "help") {
    const target = cmdArgs.join(" ");
    if (target === "") {
      printHelp();
      return 0;
    }
    const hit = COMMANDS.find((c) => c.name === target);
    if (hit === undefined) {
      throw new DaoyanCliError({ code: "usage", message: `未知命令 ${target}；daoyan-cli --help 查看全部`, exit: 2 });
    }
    printCommandHelp(hit);
    return 0;
  }

  const found = findCommand(name, cmdArgs);
  if (found === null) {
    throw new DaoyanCliError({ code: "usage", message: `未知命令 ${name}；daoyan-cli --help 查看全部`, exit: 2 });
  }
  await found.meta.run(ctx, found.rest);
  return 0;
}

const ctx: CliContext = { json: false, noColor: false };

main(ctx, process.argv.slice(2)).then(
  (code) => {
    process.exit(code);
  },
  (e: unknown) => {
    if (e instanceof DaoyanCliError) {
      if (ctx.json) emitError(e);
      else process.stderr.write(`ERROR[${e.code}] ${e.message}\n`);
      process.exit(e.exit);
    }
    process.stderr.write(
      `FATAL ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`,
    );
    process.exit(1);
  },
);
