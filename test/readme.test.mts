/** README 覆盖测试：registry 中的每个命令都必须出现在 README 中。 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 仓库根目录（测试文件位于 test/）
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 从 registry 源码提取命令名（命令对象缩进为 8 空格，flags 更深）。
 */
function registryCommandNames(): string[] {
    // registry 源码
    const source = readFileSync(join(ROOT, "src/commands/registry.mts"), "utf8");
    // 命令名列表
    const names: string[] = [];
    for (const match of source.matchAll(/^ {8}name: "([^"]+)",$/gm)) {
        names.push(match[1] as string);
    }
    return names;
}

test("README 覆盖全部命令", () => {
    // README 内容
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    // registry 命令名
    const names = registryCommandNames();
    assert.equal(names.length > 0, true);
    // 缺失的命令
    const missing = names.filter((name) => !readme.includes(`daoyan ${name}`));
    assert.deepEqual(missing, []);
});

test("README 只包含安装与命令章节", () => {
    // README 内容
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    // 一级标题
    const headings = readme
        .split("\n")
        .filter((line) => line.startsWith("## "))
        .map((line) => line.slice(3).trim());
    assert.deepEqual(headings, ["安装", "命令"]);
});
