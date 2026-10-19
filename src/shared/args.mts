/** 参数解析小工具 —— 各命令共享的开关取值、数字与 JSON 字面量解析。
 *  CLI 保持零依赖手写解析；这里只抽公共部分，避免每个命令重复写错误分支。 */
import { DaoyanCliError } from "./errors.mts";

/**
 * 拆分 `--flag=value` 形式；不带等号时 inline 为 undefined。
 */
export function splitInlineFlag(arg: string): { name: string; inline?: string } {
  if (!arg.startsWith("--")) return { name: arg };
  // 等号位置（-1 表示没有内联值）
  const i = arg.indexOf("=");
  if (i < 0) return { name: arg };
  return { name: arg.slice(0, i), inline: arg.slice(i + 1) };
}

/**
 * 取开关值：支持下一参数或 `--flag=value`；返回取值与需要跳过的额外下标数。
 */
export function takeValue(
  args: readonly string[],
  index: number,
  inline: string | undefined,
  label: string,
): { value: string; skip: number } {
  if (inline !== undefined) {
    if (inline === "") usageError(`${label} 需要参数`);
    return { value: inline, skip: 0 };
  }
  // 下一参数作为取值
  const v = args[index + 1];
  if (v === undefined || v === "" || v.startsWith("--")) {
    usageError(`${label} 需要参数`);
  }
  return { value: v, skip: 1 };
}

/**
 * 解析正整数开关。
 */
export function parsePositiveInt(raw: string, label: string): number {
  // 数值化结果
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) usageError(`${label} 需要正整数（收到 ${raw}）`);
  return n;
}

/**
 * 解析正数开关（允许小数，如小时数）。
 */
export function parsePositiveNumber(raw: string, label: string): number {
  // 数值化结果
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) usageError(`${label} 需要正数（收到 ${raw}）`);
  return n;
}

/**
 * 把命令行值按 JSON 解析：42 -> number，true -> boolean，[1,2] -> array；
 * 解析失败按字符串处理（提示词等场景）。
 */
export function parseJsonValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

/**
 * 用法错误快捷函数（exit 2）。
 */
export function usageError(message: string): never {
  throw new DaoyanCliError({ code: "usage", message, exit: 2 });
}

/**
 * 读取一个必填位置参数。
 */
export function requiredPositional(value: string | undefined, label: string): string {
  if (value === undefined || value === "") usageError(`缺少${label}`);
  return value;
}
