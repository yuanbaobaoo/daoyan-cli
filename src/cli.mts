/** daoyan-cli —— 面向 AI Agent 的 ComfyUI 生产编排 CLI · 入口
 *  零依赖手写参数解析（保持轻量）。
 *  解析规则：全局参数（--json/--no-color/--project）可出现在任意位置；
 *  命令名之后出现的其余 - 开头参数一律透传给命令自行解析。 */
import { COMMANDS, findCommand } from "./commands/registry.mts";
import { DaoyanCliError } from "./shared/errors.mts";
import { emitError } from "./shared/json.mts";
import { printMainHelp, runHelp } from "./commands/help.mts";
import type { CliContext } from "./shared/context.mts";
import { VERSION } from "./shared/version.mts";

async function main(ctx: CliContext, argv: string[]): Promise<number> {
  const rest: string[] = [];
  let sawCommand = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) break;
    if (a === "--json") {
      ctx.json = true;
      continue;
    }
    if (a === "--no-color") {
      ctx.noColor = true;
      continue;
    }
    if (a === "--project") {
      const v = argv[i + 1];
      if (v === undefined || v === "") {
        throw new DaoyanCliError({ code: "usage", message: "--project 需要一个路径参数", exit: 2 });
      }
      ctx.projectPath = v;
      i++;
      continue;
    }
    if ((a === "-h" || a === "--help") && !sawCommand) {
      printMainHelp(COMMANDS, VERSION);
      return 0;
    }
    if ((a === "-v" || a === "--version") && !sawCommand) {
      process.stdout.write(`daoyan-cli v${VERSION}\n`);
      return 0;
    }
    if (a.startsWith("-")) {
      if (!sawCommand) {
        throw new DaoyanCliError({ code: "usage", message: `未知参数 ${a}`, exit: 2 });
      }
      rest.push(a); // 命令级参数透传
      continue;
    }
    sawCommand = true;
    rest.push(a);
  }

  const [name, ...cmdArgs] = rest;
  if (name === undefined) {
    printMainHelp(COMMANDS, VERSION);
    return 0;
  }
  if (name === "help") {
    runHelp(ctx, cmdArgs, COMMANDS, VERSION);
    return 0;
  }

  const found = findCommand(name, cmdArgs);
  if (found === null) {
    throw new DaoyanCliError({ code: "usage", message: `未知命令 ${name}；daoyan-cli help 查看全部`, exit: 2 });
  }
  await found.meta.run(ctx, found.rest);
  return 0;
}

const ctx: CliContext = { json: false, noColor: false };

// 退出码约定：130 = 被 Ctrl-C 中断
process.on("SIGINT", () => {
  process.exit(130);
});

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
