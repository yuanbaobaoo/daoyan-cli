/** AGENTS.md 管理块 —— 只维护 daoyan:skill 标记块，保留用户内容；重复执行幂等。 */
import { existsSync, readFileSync } from "node:fs";
import { DaoyanCliError } from "../../shared/errors.mts";
import { writeFileAtomic } from "../../shared/fs.mts";
import { AGENTS_BLOCK_BODY, AGENTS_BLOCK_END, AGENTS_BLOCK_START } from "./contract.mts";

/**
 * 完整管理块文本。
 */
export function agentsBlock(): string {
  return [AGENTS_BLOCK_START, AGENTS_BLOCK_BODY, AGENTS_BLOCK_END].join("\n");
}

/**
 * 计算写入后的 AGENTS.md 内容（纯函数，便于测试）。
 */
export function upsertBlockContent(current: string): string {
  // 已有块（含标记）
  const start = current.indexOf(AGENTS_BLOCK_START);
  const end = current.indexOf(AGENTS_BLOCK_END);
  if (start >= 0 && end > start) {
    // 替换整个标记块
    return current.slice(0, start) + agentsBlock() + current.slice(end + AGENTS_BLOCK_END.length);
  }
  if (current.trim() === "") return agentsBlock() + "\n";
  // 没有标记：追加，保留用户内容
  return `${current.replace(/\s*$/, "")}\n\n${agentsBlock()}\n`;
}

/**
 * 写入/更新 AGENTS.md 管理块。
 */
export function upsertAgentsBlock(file: string): void {
  try {
    // 现有内容（不存在按空）
    const current = existsSync(file) ? readFileSync(file, "utf8") : "";
    writeFileAtomic(file, upsertBlockContent(current));
  } catch (e) {
    if (e instanceof DaoyanCliError) throw e;
    throw new DaoyanCliError({
      code: "skill_write_failed",
      message: `写入 AGENTS.md 失败：${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
