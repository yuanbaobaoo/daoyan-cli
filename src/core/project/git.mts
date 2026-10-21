/** 项目 Git 层 —— init 幂等初始化仓库，并维护受管 .gitignore。
 *  原则：只执行 git init，不 add / 不 commit；受管块之外的用户内容一律保留。 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { execCapture, tryExecCapture } from "../../shared/exec.mts";
import { writeFileAtomic } from "../../shared/fs.mts";
import { GITIGNORE_FILE } from "./types.mts";

// 受管块起始标记
export const GITIGNORE_BLOCK_START = "# daoyan:gitignore:start";
// 受管块结束标记
export const GITIGNORE_BLOCK_END = "# daoyan:gitignore:end";
// 受管块说明（仍是注释，不影响 gitignore 语义）
const GITIGNORE_BLOCK_NOTE = "# 本块由 daoyan 维护，下次 init 会重写；自定义规则请写在块外";

/**
 * 默认忽略规则（受管块内容）。
 */
export const GITIGNORE_DEFAULTS: readonly string[] = [
    "# Python / 缓存",
    ".venv/",
    "venv/",
    "__pycache__/",
    "*.py[cod]",
    "*.egg-info/",
    ".pytest_cache/",
    ".mypy_cache/",
    ".ruff_cache/",
    "",
    "# ComfyUI 引擎（engine/ 覆盖默认本体、venv、custom nodes）",
    "engine/",
    "ComfyUI/",
    "",
    "# daoyan 本机状态 / 运行缓存",
    ".dycli/",
    "logs/",
    "relay_frames/",
    "concat_list.txt",
    "*.log",
    "",
    "# 临时 / 系统文件",
    "*.tmp",
    "*.temp",
    "*.swp",
    "*~",
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
];

/**
 * Git 仓库初始化结果状态（失败直接抛错，不返回状态）。
 */
export type GitRepoStatus = "initialized" | "existing" | "inside_parent" | "skipped" | "disabled";

/**
 * git init 结果。
 */
export interface GitRepoResult {
    /**
     * 初始化状态。
     */
    status: GitRepoStatus;
    /**
     * 当前分支（无法读取时为 null）。
     */
    branch: string | null;
    /**
     * 所在仓库根目录（未建仓时为 null）。
     */
    top_level: string | null;
    /**
     * 跳过原因（正常初始化/复用时为 null）。
     */
    reason: string | null;
}

/**
 * .gitignore 写入状态。
 */
export type GitignoreStatus = "created" | "updated" | "unchanged";

/**
 * .gitignore 维护结果。
 */
export interface GitignoreResult {
    /**
     * 文件绝对路径。
     */
    path: string;
    /**
     * 写入状态。
     */
    status: GitignoreStatus;
}

/**
 * 受管块完整文本。
 */
export function gitignoreBlock(): string {
    return [GITIGNORE_BLOCK_START, GITIGNORE_BLOCK_NOTE, "", ...GITIGNORE_DEFAULTS, "", GITIGNORE_BLOCK_END].join("\n");
}

/**
 * 计算写入后的 .gitignore 内容（纯函数，便于测试）。
 *  - 已有受管块：原地替换，保留块外内容；
 *  - 没有受管块：追加到末尾，保留全部用户内容；
 *  - 空文件：只写受管块。
 */
export function upsertGitignoreContent(current: string): string {
    // 受管块文本
    const block = gitignoreBlock();
    // 现有块起点
    const start = current.indexOf(GITIGNORE_BLOCK_START);
    // 现有块终点
    const end = current.indexOf(GITIGNORE_BLOCK_END);
    if (start >= 0) {
        // 结束标记缺失时按“块延续到文件末尾”处理，避免出现重复起始标记
        const tail = end > start ? current.slice(end + GITIGNORE_BLOCK_END.length) : "";
        return current.slice(0, start) + block + tail;
    }
    if (current.trim() === "") return block + "\n";
    return `${current.replace(/\s*$/, "")}\n\n${block}\n`;
}

/**
 * 写入/更新项目 .gitignore 受管块。
 */
export function ensureGitignore(root: string): GitignoreResult {
    // 目标文件
    const file = join(root, GITIGNORE_FILE);
    // 是否已存在
    const existed = existsSync(file);
    // 现有内容（不存在按空）
    const current = existed ? readFileSync(file, "utf8") : "";
    // 合并后的内容
    const next = upsertGitignoreContent(current);
    if (existed && next === current) {
        return { path: file, status: "unchanged" };
    }
    try {
        writeFileAtomic(file, next);
    } catch (e) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `写入 ${GITIGNORE_FILE} 失败：${e instanceof Error ? e.message : String(e)}`,
            hint: "检查项目目录写权限后重试",
            details: { stage: "gitignore" },
        });
    }
    return { path: file, status: existed ? "updated" : "created" };
}

/**
 * 确保目录位于 Git 仓库内；不在时执行 git init（幂等）。
 *  - 当前目录是仓库根：existing；
 *  - 位于父级仓库内：inside_parent，不创建嵌套仓库；
 *  - 用户主目录 / 文件系统根：skipped；
 *  - Git 缺失或 git init 失败：抛错。
 */
export async function ensureGitRepo(root: string): Promise<GitRepoResult> {
    // 绝对路径
    const absRoot = resolve(root);
    // Git 可用性（--no-git 由调用方在调用前处理）
    const gitVersion = await tryExecCapture("git", ["--version"], { timeoutMs: 15_000 });
    if (gitVersion === null || gitVersion.code !== 0) {
        throw new DaoyanCliError({
            code: "external_tool_missing",
            message: "未找到可用的 git（init 需要它初始化仓库；local 模式还用于 clone ComfyUI）",
            hint: gitInstallHint(),
            nextActions: ["安装 Git 后重试", "或使用 --no-git 跳过仓库初始化"],
        });
    }
    // 最近的 Git 仓库根（含当前目录）
    const top = findGitRoot(absRoot);
    if (top === absRoot) {
        return { status: "existing", branch: await gitBranch(absRoot), top_level: top, reason: null };
    }
    if (top !== null) {
        return {
            status: "inside_parent",
            branch: await gitBranch(absRoot),
            top_level: top,
            reason: "当前目录位于已有 Git 仓库内，跳过嵌套初始化",
        };
    }
    // 高风险目录不自动建仓
    if (isProtectedRoot(absRoot)) {
        return {
            status: "skipped",
            branch: null,
            top_level: null,
            reason: "拒绝在用户主目录或文件系统根目录自动初始化 Git 仓库",
        };
    }
    // 初始化仓库
    const init = await execCapture("git", ["init"], { cwd: absRoot, timeoutMs: 60_000 });
    if (init.code !== 0) {
        throw new DaoyanCliError({
            code: "provision_failed",
            message: `git init 失败（退出码 ${init.code}）`,
            hint: "检查目录权限与 Git 安装",
            details: {
                stage: "git_init",
                exit_code: init.code,
                last_error: (init.stderr || init.stdout).trim().slice(-2000),
            },
        });
    }
    return { status: "initialized", branch: await gitBranch(absRoot), top_level: absRoot, reason: null };
}

/**
 * 自起始目录向上查找 .git（目录或 worktree/submodule 的 .git 文件）。
 */
function findGitRoot(start: string): string | null {
    // 当前层级
    let dir = start;
    for (;;) {
        if (existsSync(join(dir, ".git"))) return dir;
        // 上一级目录（到达文件系统根时 parent === dir，停止）
        const parent = dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

/**
 * 读取当前分支；空仓库与普通分支均可用，detached HEAD 返回 null。
 */
async function gitBranch(root: string): Promise<string | null> {
    // symbolic-ref 不依赖已有 commit
    const r = await tryExecCapture("git", ["-C", root, "symbolic-ref", "--short", "HEAD"], {
        timeoutMs: 15_000,
    });
    if (r === null || r.code !== 0) return null;
    // 分支名
    const branch = r.stdout.trim();
    return branch === "" ? null : branch;
}

/**
 * 主目录与文件系统根目录不自动建仓。
 */
function isProtectedRoot(root: string): boolean {
    if (dirname(root) === root) return true;
    try {
        return root === resolve(homedir());
    } catch {
        return false;
    }
}

/**
 * 平台化 Git 安装提示。
 */
function gitInstallHint(): string {
    switch (process.platform) {
        case "darwin":
            return "安装 Git：brew install git（或 https://git-scm.com/downloads）";
        case "win32":
            return "安装 Git：winget install --id Git.Git -e（或 https://git-scm.com/download/win）";
        default:
            return "安装 Git：sudo apt-get install -y git（或 https://git-scm.com/downloads）";
    }
}
