/**
 * 命令分组（帮助输出共用的标签）。
 */
export type CommandGroup = "project" | "production" | "engine" | "ops" | "meta";

// 分组 → 中文标签（help 输出用）
export const GROUP_LABEL: Record<CommandGroup, string> = {
  project: "项目",
  production: "生产",
  engine: "引擎",
  ops: "运维",
  meta: "元",
};
