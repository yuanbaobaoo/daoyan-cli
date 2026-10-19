/**
 * 命令运行上下文 —— cli.mts 解析全局参数后传入每个命令。
 */
export interface CliContext {
  /**
   * 输出 JSON 信封。非 TTY 默认 true；`--json` / `DYCLI_OUTPUT=json` 可强制，
   * `DYCLI_OUTPUT=text` / `--no-json` 可关闭。
   */
  json: boolean;
  /**
   * --no-color
   */
  noColor: boolean;
  /**
   * --project 显式指定的项目目录；未指定为 undefined（由各命令自行向上寻找 project.json）
   */
  projectPath?: string;
}

/**
 * 根据环境与参数决定默认输出模式：非 TTY 默认 JSON，Agent 不需要额外 flag。
 */
export function defaultJsonMode(isTTY: boolean, env: NodeJS.ProcessEnv): boolean {
  if (env.DYCLI_OUTPUT === "json") return true;
  if (env.DYCLI_OUTPUT === "text") return false;
  return !isTTY;
}
