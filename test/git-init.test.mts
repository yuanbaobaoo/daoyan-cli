/** Git 初始化与 .gitignore 受管块测试：幂等、边界保护、忽略规则生效。 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "../src/commands/init.mts";
import { setLogJsonMode } from "../src/shared/log.mts";
import {
    GITIGNORE_BLOCK_END,
    GITIGNORE_BLOCK_START,
    ensureGitignore,
    ensureGitRepo,
    upsertGitignoreContent,
} from "../src/core/project/git.mts";

/**
 * 在指定目录运行 init 并解析 JSON 信封的 data。
 */
async function runInitCaptured(root: string, args: string[]): Promise<Record<string, unknown>> {
    // 原始 stdout 写入
    const originalStdoutWrite = process.stdout.write;
    // 原始 stderr 写入
    const originalStderrWrite = process.stderr.write;
    // 原始工作目录
    const originalCwd = process.cwd();
    // stdout 片段
    const stdout: string[] = [];
    setLogJsonMode(true);
    process.chdir(root);
    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
    }) as typeof process.stdout.write;
    process.stderr.write = (() => true) as typeof process.stderr.write;
    try {
        await runInit({ json: true, noColor: true }, args);
    } finally {
        process.chdir(originalCwd);
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
        setLogJsonMode(false);
    }
    // 成功信封（测试运行器自己也会写 stdout，这里只取 JSON 行）
    const envelopeText = stdout.find((chunk) => chunk.startsWith('{"ok":true'));
    assert.notEqual(envelopeText, undefined);
    const envelope = JSON.parse(envelopeText as string) as { ok: boolean; data: Record<string, unknown> };
    assert.equal(envelope.ok, true);
    return envelope.data;
}

/**
 * git check-ignore 判断（0 = 被忽略）。
 */
function isIgnored(root: string, path: string): boolean {
    try {
        execFileSync("git", ["-C", root, "check-ignore", "-q", path], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

test("upsertGitignoreContent：空文件、追加、原地替换、缺失结束标记", () => {
    // 空文件
    const empty = upsertGitignoreContent("");
    assert.equal(empty.includes(GITIGNORE_BLOCK_START), true);
    assert.equal(empty.includes(GITIGNORE_BLOCK_END), true);
    assert.equal(empty.includes("engine/"), true);
    // 已有用户内容：追加在末尾
    const appended = upsertGitignoreContent("node_modules/\n# user\n");
    assert.equal(appended.startsWith("node_modules/\n# user\n"), true);
    assert.equal(appended.split(GITIGNORE_BLOCK_START).length, 2);
    // 幂等
    assert.equal(upsertGitignoreContent(appended), appended);
    // 已有旧块：原地替换，保留块外内容
    const oldBlock = `${GITIGNORE_BLOCK_START}\nold-rule/\n${GITIGNORE_BLOCK_END}`;
    const replaced = upsertGitignoreContent(`before\n${oldBlock}\nafter\n`);
    assert.equal(replaced.includes("before"), true);
    assert.equal(replaced.includes("after"), true);
    assert.equal(replaced.includes("old-rule/"), false);
    assert.equal(replaced.includes("relay_frames/"), true);
    // 结束标记缺失：按块延续到文件末尾处理
    const broken = `before\n${GITIGNORE_BLOCK_START}\nold-rule/\n`;
    const fixed = upsertGitignoreContent(broken);
    assert.equal(fixed.includes("before"), true);
    assert.equal(fixed.includes("old-rule/"), false);
    assert.equal(fixed.split(GITIGNORE_BLOCK_START).length, 2);
});

test("ensureGitignore：created / updated / unchanged 且保留用户内容", () => {
    const root = mkdtempSync(join(tmpdir(), "dycli-gitignore-"));
    try {
        // 目标文件
        const file = join(root, ".gitignore");
        // 首次创建
        const created = ensureGitignore(root);
        assert.equal(created.status, "created");
        assert.equal(existsSync(file), true);
        // 已有用户内容：更新并保留
        writeFileSync(file, "node_modules/\n# user\n");
        const updated = ensureGitignore(root);
        assert.equal(updated.status, "updated");
        // 合并后的内容
        const content = readFileSync(file, "utf8");
        assert.equal(content.startsWith("node_modules/\n# user\n"), true);
        assert.equal(content.includes("engine/"), true);
        // 再次执行不变
        assert.equal(ensureGitignore(root).status, "unchanged");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("ensureGitRepo：空目录初始化、二次调用复用、父仓库内不嵌套", async () => {
    const root = mkdtempSync(join(tmpdir(), "dycli-gitinit-"));
    try {
        // 空目录初始化
        const first = await ensureGitRepo(root);
        assert.equal(first.status, "initialized");
        assert.equal(existsSync(join(root, ".git")), true);
        assert.equal(typeof first.branch, "string");
        // 二次调用复用
        const second = await ensureGitRepo(root);
        assert.equal(second.status, "existing");
        // 父仓库内的子目录
        const parent = mkdtempSync(join(tmpdir(), "dycli-gitparent-"));
        try {
            execFileSync("git", ["init", "-q"], { cwd: parent, stdio: "ignore" });
            // 子目录
            const child = join(parent, "child");
            mkdirSync(child);
            // 嵌套检测
            const nested = await ensureGitRepo(child);
            assert.equal(nested.status, "inside_parent");
            assert.equal(existsSync(join(child, ".git")), false);
        } finally {
            rmSync(parent, { recursive: true, force: true });
        }
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("init 默认创建 Git 仓库与受管 .gitignore，忽略规则生效", async () => {
    const root = mkdtempSync(join(tmpdir(), "dycli-init-git-"));
    try {
        // init 输出
        const data = await runInitCaptured(root, ["--mode=remote", "--url", "http://127.0.0.1:8188", "--no-skill"]);
        // Git 段
        const git = data.git as { repo: string; branch: string | null; gitignore: string };
        assert.equal(git.repo, "initialized");
        assert.equal(git.gitignore, "created");
        assert.equal(existsSync(join(root, ".git")), true);
        // 默认忽略规则
        assert.equal(isIgnored(root, "engine/ComfyUI/main.py"), true);
        assert.equal(isIgnored(root, "engine/.venv/bin/python"), true);
        assert.equal(isIgnored(root, ".dycli/machine.json"), true);
        assert.equal(isIgnored(root, "logs/worker.log"), true);
        assert.equal(isIgnored(root, ".venv/bin/python"), true);
        assert.equal(isIgnored(root, "__pycache__/x.pyc"), true);
        // 共享产物不能被忽略
        assert.equal(isIgnored(root, "runs/r1/run.json"), false);
        assert.equal(isIgnored(root, "tasks/t1/task.json"), false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("init --no-git 跳过仓库初始化但保留 .gitignore", async () => {
    const root = mkdtempSync(join(tmpdir(), "dycli-init-nogit-"));
    try {
        // init 输出
        const data = await runInitCaptured(root, [
            "--mode=remote",
            "--url",
            "http://127.0.0.1:8188",
            "--no-skill",
            "--no-git",
        ]);
        // Git 段
        const git = data.git as { repo: string; branch: string | null; gitignore: string };
        assert.equal(git.repo, "disabled");
        assert.equal(git.branch, null);
        assert.equal(git.gitignore, "created");
        assert.equal(existsSync(join(root, ".git")), false);
        assert.equal(existsSync(join(root, ".gitignore")), true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
