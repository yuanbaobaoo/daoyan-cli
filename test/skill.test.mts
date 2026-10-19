/** Agent Skill / AGENTS.md 生成测试：哈希稳定、幂等、保留用户内容、stale 检测。 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSkillFiles, skillHash, skillState, writeSkill, type SkillCommand } from "../src/core/agent/skill.mts";
import { upsertBlockContent } from "../src/core/agent/agents-md.mts";

// 最小命令文档
const COMMANDS: SkillCommand[] = [
  {
    name: "run",
    group: "production",
    summary: "执行 workflow",
    usage: "daoyan run <workflow> [--wait]",
    args: [{ name: "workflow", type: "string", required: true, description: "工作流" }],
    flags: [{ name: "--wait", type: "boolean", description: "等待终态" }],
    examples: ["daoyan run t2v --json"],
    implemented: true,
  },
];

test("Skill 生成哈希稳定且文件齐全", () => {
  const a = generateSkillFiles("0.1.0", COMMANDS);
  const b = generateSkillFiles("0.1.0", COMMANDS);
  assert.equal(skillHash(a), skillHash(b));
  assert.equal(a.has("SKILL.md"), true);
  assert.equal(a.has("reference/protocol.md"), true);
  assert.equal(a.has("reference/errors.md"), true);
  // 命令索引进入 SKILL.md
  assert.equal(a.get("SKILL.md")?.includes("daoyan run <workflow>"), true);
  // init venv 故障的排查说明必须进入 Skill
  assert.match(a.get("SKILL.md") ?? "", /ensurepip/);
  assert.match(a.get("reference/lifecycle.md") ?? "", /python3\.12-venv/);
  assert.match(a.get("reference/errors.md") ?? "", /ensurepip/);
});

test("writeSkill 幂等，AGENTS.md 保留用户内容且不重复块", () => {
  const root = mkdtempSync(join(tmpdir(), "dycli-skill-"));
  try {
    writeFileSync(join(root, "AGENTS.md"), "# 用户内容\n\n不要删除我。\n");
    const first = writeSkill(root, "0.1.0", COMMANDS);
    assert.equal(existsSync(join(root, ".agents/skills/daoyan/SKILL.md")), true);
    assert.equal(existsSync(join(root, ".agents/skills/daoyan/VERSION")), true);
    const content = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.equal(content.includes("不要删除我。"), true);
    assert.equal(content.split("<!-- daoyan:skill:start -->").length, 2);
    // 第二次执行
    const second = writeSkill(root, "0.1.0", COMMANDS);
    assert.equal(second.hash, first.hash);
    const content2 = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.equal(content2.split("<!-- daoyan:skill:start -->").length, 2);
    // 状态：fresh
    const state = skillState(root, "0.1.0", COMMANDS);
    assert.equal(state.present, true);
    assert.equal(state.stale, false);
    assert.equal(state.agents_block, true);
    // 版本变化 -> stale
    assert.equal(skillState(root, "0.2.0", COMMANDS).stale, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("upsertBlockContent 没有标记时追加，有标记时替换", () => {
  const empty = upsertBlockContent("");
  assert.equal(empty.includes("<!-- daoyan:skill:start -->"), true);
  const user = "# Notes\n\nhello\n";
  const appended = upsertBlockContent(user);
  assert.equal(appended.startsWith("# Notes"), true);
  const replaced = upsertBlockContent(appended + "\nuser tail\n");
  assert.equal(replaced.split("<!-- daoyan:skill:start -->").length, 2);
  assert.equal(replaced.includes("user tail"), true);
});
