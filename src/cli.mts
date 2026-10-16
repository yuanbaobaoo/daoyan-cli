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

/**
 * 解析全局参数并分发到命令；返回进程退出码。
 */
async function main(ctx: CliContext, argv: string[]): Promise<number> {
  // 剥离全局参数后的剩余参数（命令名 + 命令级参数）
  const rest: string[] = [];
  // 是否已遇到命令名（决定 -h 等参数归属全局还是命令）
  let sawCommand = false;
  // 顺序扫描全部参数
  for (let i = 0; i < argv.length; i++) {
    // 当前参数
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
      // --project 的取值
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
      process.stdout.write(`daoyan v${VERSION}\n`);
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

  // 命令名与命令级参数
  const [name, ...cmdArgs] = rest;
  if (name === undefined) {
    printMainHelp(COMMANDS, VERSION);
    return 0;
  }
  if (name === "help") {
    runHelp(ctx, cmdArgs, COMMANDS, VERSION);
    return 0;
  }

  // 命中的命令（含子命令解析）
  const found = findCommand(name, cmdArgs);
  if (found === null) {
    throw new DaoyanCliError({ code: "usage", message: `未知命令 ${name}；daoyan help 查看全部`, exit: 2 });
  }
  await found.meta.run(ctx, found.rest);
  return 0;
}

// 单次运行共享的命令上下文（全局参数解析后填充）
const ctx: CliContext = { json: false, noColor: false };

// 退出码约定：130 = 被 Ctrl-C 中断
process.on("SIGINT", () => {
  process.exit(130);
});

// 顶层直接 await：结构化错误按信封 / 退出码输出，其余按致命错误处理
try {
  process.exit(await main(ctx, process.argv.slice(2)));
} catch (e: unknown) {
  if (e instanceof DaoyanCliError) {
    if (ctx.json) emitError(e);
    else process.stderr.write(`ERROR[${e.code}] ${e.message}\n`);
    process.exit(e.exit);
  }
  process.stderr.write(
    `FATAL ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`,
  );
  process.exit(1);
}
