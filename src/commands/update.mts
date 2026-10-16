/** update —— 自升级：检测 GitHub 最新 tag（本仓库以 git 分发，不依赖 npm registry）。
 *  有新版本时执行两步安装：npm pack git+<repo>#<tag> → npm install -g <tgz>
 *  （绕开 npm 11 全局安装 git 依赖的提取缺陷，与 install.sh 同一条路径）。
 *  --check 仅检测不安装。 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say } from "../shared/log.mts";
import { VERSION } from "../shared/version.mts";
import type { CliContext } from "../shared/context.mts";

const REPO_URL = "https://github.com/yuanbaobaoo/daoyan-cli.git";

function parseSemver(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v);
  return m !== null ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function newer(a: [number, number, number], b: [number, number, number]): boolean {
  return a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
}

/** GitHub tags 里找最新稳定版；无 tag / 不可达返回 null（note 附原因）。 */
async function latestTag(): Promise<{ tag: string | null; note: string }> {
  try {
    const res = await fetch("https://api.github.com/repos/yuanbaobaoo/daoyan-cli/tags", {
      headers: { "user-agent": "daoyan-cli-update", accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { tag: null, note: `GitHub API ${res.status}` };
    const tags = (await res.json()) as Array<{ name?: string }>;
    let best: { tag: string; v: [number, number, number] } | null = null;
    for (const t of tags) {
      const v = t.name !== undefined ? parseSemver(t.name) : null;
      if (v === null) continue;
      if (best === null || newer(v, best.v)) best = { tag: t.name as string, v };
    }
    return best === null
      ? { tag: null, note: "仓库尚无语义化 tag（vX.Y.Z）" }
      : { tag: best.tag, note: "" };
  } catch (e) {
    return { tag: null, note: `GitHub 不可达：${e instanceof Error ? e.message : String(e)}` };
  }
}

function spawnCapture(cmd: string, args: readonly string[], opts: { cwd?: string }): Promise<{ code: number; stdout: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    child.stdout?.on("data", (d: Buffer) => {
      out += d.toString();
    });
    child.on("error", (e) =>
      rejectPromise(new DaoyanCliError({ code: "external_tool_missing", message: `无法启动 ${cmd}：${e.message}` })),
    );
    child.on("close", (code) => resolvePromise({ code: code ?? -1, stdout: out }));
  });
}

function spawnInherit(cmd: string, args: readonly string[]): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", (e) =>
      rejectPromise(new DaoyanCliError({ code: "external_tool_missing", message: `无法启动 ${cmd}：${e.message}` })),
    );
    child.on("close", (code) => resolvePromise(code ?? -1));
  });
}

export async function runUpdate(ctx: CliContext, args: string[]): Promise<void> {
  const checkOnly = args.includes("--check");
  const { tag, note } = await latestTag();
  const current = parseSemver(VERSION);
  const currentStr = `v${VERSION}`;

  if (tag === null) {
    if (ctx.json) {
      emitData({ current: currentStr, latest: null, note });
      return;
    }
    say(`当前 ${currentStr}；无法确定最新版（${note}）`);
    return;
  }
  const latestV = parseSemver(tag);
  const hasUpdate = current !== null && latestV !== null && newer(latestV, current);

  if (checkOnly || !hasUpdate) {
    if (ctx.json) {
      emitData({ current: currentStr, latest: tag, updateAvailable: hasUpdate });
      return;
    }
    if (hasUpdate) say(`有新版本 ${tag}（当前 ${currentStr}）。运行 daoyan-cli update 升级`);
    else say(`已是最新（当前 ${currentStr}，GitHub 最新 tag ${tag}）`);
    return;
  }

  say(`检测到新版本 ${tag}（当前 ${currentStr}），开始自升级...`);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const tmp = mkdtempSync(join(tmpdir(), "daoyan-cli-update-"));
  try {
    // 两步法：npm pack（生成 tgz）→ npm install -g tgz
    const pack = await spawnCapture(npm, ["pack", "--silent", `git+${REPO_URL}#${tag}`], { cwd: tmp });
    if (pack.code !== 0) {
      throw new DaoyanCliError({
        code: "update_failed",
        message: `npm pack 失败（退出码 ${pack.code}）。检查网络与 GitHub 可达性`,
      });
    }
    const tgz = pack.stdout.trim().split("\n").filter((l) => l !== "").pop();
    if (tgz === undefined) {
      throw new DaoyanCliError({ code: "update_failed", message: "npm pack 未产出 tarball" });
    }
    const code = await spawnInherit(npm, ["install", "-g", join(tmp, tgz)]);
    if (code !== 0) {
      throw new DaoyanCliError({
        code: "update_failed",
        message: `npm install -g 失败（退出码 ${code}）。EACCES 时考虑 nvm 或自定义 npm prefix`,
        details: { exit: code },
      });
    }
    say(`升级完成：${tag}。验证：daoyan-cli --version`);
    if (ctx.json) emitData({ updated: tag, previous: currentStr });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
