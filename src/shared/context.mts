/**
 * 命令运行上下文 —— cli.mts 解析全局参数后传入每个命令。
 */
export interface CliContext {
  /**
   * --json：信封输出（{"ok":true,data} / {"ok":false,error{code,message,details}}）
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
