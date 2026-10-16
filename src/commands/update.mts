/** update —— 自升级：spawn `npm install -g daoyan-cli@latest`。
 *  EACCES（全局目录不可写）时给出 nvm / 自定义 prefix 指引。 */
import { spawn } from "node:child_process";
import { DaoyanCliError } from "../shared/errors.mts";
import { say } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";

export async function runUpdate(_ctx: CliContext): Promise<void> {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  say("自升级：npm install -g daoyan-cli@latest ...");
  const exit = await new Promise<number>((resolvePromise, rejectPromise) => {
    const child = spawn(npm, ["install", "-g", "daoyan-cli@latest"], { stdio: "inherit" });
    child.on("error", (e) => {
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `无法启动 npm：${e.message}` }),
      );
    });
    child.on("close", (code) => resolvePromise(code ?? 1));
  });
  if (exit !== 0) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `npm 退出码 ${exit}。若为 EACCES：全局目录不可写，考虑 nvm 或自定义 npm prefix 后重试。`,
      details: { exit },
    });
  }
  say("升级完成。查看版本：daoyan-cli --version");
}
