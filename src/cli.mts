/** daoyan-cli 入口 —— 零依赖参数解析 + 命令分发 + 统一信封。
 *  非 TTY 默认 JSON；`--json` / `--no-json` / DYCLI_OUTPUT 可覆盖。
 *  `__worker` 是 detached task worker 的内部入口（不写入 help）。 */
import { COMMANDS, findCommand } from "./commands/registry.mts";
import { DaoyanCliError } from "./shared/errors.mts";
import { emitError } from "./shared/json.mts";
import { printMainHelp, runHelp } from "./commands/help.mts";
import { defaultJsonMode, type CliContext } from "./shared/context.mts";
import { setLogJsonMode } from "./shared/log.mts";
import { VERSION } from "./shared/version.mts";
import { installSignalHandlers } from "./shared/signals.mts";
import { runWorker } from "./core/task/worker.mts";

/**
 * 解析全局参数并分发到命令；返回进程退出码。
 */
async function main(ctx: CliContext, argv: string[]): Promise<number> {
  // 命令名 + 命令级参数
  const rest: string[] = [];
  // 是否已遇到命令名
  let sawCommand = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) break;
    if (a === "--json") {
      ctx.json = true;
      setLogJsonMode(true);
      continue;
    }
    if (a === "--no-json") {
      ctx.json = false;
      setLogJsonMode(false);
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
      runHelp(ctx, [], COMMANDS, VERSION);
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
      rest.push(a);
      continue;
    }
    sawCommand = true;
    rest.push(a);
  }

  // 命令名与命令级参数
  const [name, ...cmdArgs] = rest;
  // 后续日志按最终输出模式选择 stdout/stderr
  setLogJsonMode(ctx.json);
  if (name === undefined) {
    runHelp(ctx, [], COMMANDS, VERSION);
    return 0;
  }

  // 内部 worker 入口（detached 进程）
  if (name === "__worker") {
    // task 目录
    const taskDir = process.env.DYCLI_TASK_DIR;
    // 锁令牌
    const token = process.env.DYCLI_LOCK_TOKEN;
    if (taskDir === undefined || taskDir === "" || token === undefined || token === "") {
      throw new DaoyanCliError({
        code: "worker_start_failed",
        message: "__worker 缺少 DYCLI_TASK_DIR / DYCLI_LOCK_TOKEN",
      });
    }
    return runWorker({ taskDir, token });
  }

  if (name === "help") {
    runHelp(ctx, cmdArgs, COMMANDS, VERSION);
    return 0;
  }

  // 命中的命令
  const found = findCommand(name, cmdArgs);
  if (found === null) {
    throw new DaoyanCliError({ code: "usage", message: `未知命令 ${name}；daoyan help 查看全部`, exit: 2 });
  }
  // 命令可返回退出码（run/status --wait）
  const code = await found.meta.run(ctx, found.rest);
  return typeof code === "number" ? code : 0;
}

// 单次运行共享的命令上下文（非 TTY 默认 JSON）
const ctx: CliContext = {
  json: defaultJsonMode(Boolean(process.stdout.isTTY), process.env),
  noColor: false,
};

// 前台信号：命令注册处理器时自行决定退出；否则 130
installSignalHandlers();

// 顶层执行：结构化错误按信封/退出码输出
try {
  process.exitCode = await main(ctx, process.argv.slice(2));
} catch (e: unknown) {
  if (e instanceof DaoyanCliError) {
    if (ctx.json) emitError(e);
    else {
      process.stderr.write(`ERROR[${e.code}] ${e.message}\n`);
      if (e.hint !== "") process.stderr.write(`hint: ${e.hint}\n`);
      if (e.nextActions !== undefined) process.stderr.write(`next: ${e.nextActions.join(" | ")}\n`);
    }
    process.exitCode = e.exit;
  } else {
    process.stderr.write(`FATAL ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
    process.exitCode = 1;
  }
}
