#!/usr/bin/env node

// src/shared/errors.mts
var ERROR_CODES = [
  "usage",
  "not_implemented",
  "project_not_found",
  "config_invalid",
  "validation_failed",
  "anchor_not_found",
  "relay_upstream_missing",
  "engine_not_ready",
  "engine_start_failed",
  "engine_busy",
  "lock_held",
  "gpu_evict_failed",
  "shot_failed",
  "shot_timeout",
  "external_tool_missing",
  "update_failed",
  "provision_failed",
  "wrap_failed"
];
var DaoyanCliError = class extends Error {
  /**
   * 稳定的错误码。
   */
  code;
  /**
   * 结构化补充信息（可空）。
   */
  details;
  /**
   * 进程退出码。
   */
  exit;
  /**
   * 创建错误实例（message 由 Error 基类承载）。
   */
  constructor(init) {
    super(init.message);
    this.name = "DaoyanCliError";
    this.code = init.code;
    this.details = init.details;
    this.exit = init.exit ?? 1;
  }
};

// src/shared/version.mts
var VERSION = "0.0.1";

// src/shared/groups.mts
var GROUP_LABEL = {
  project: "\u9879\u76EE",
  production: "\u751F\u4EA7",
  engine: "\u5F15\u64CE",
  ops: "\u8FD0\u7EF4",
  meta: "\u5143"
};

// src/shared/json.mts
function emitData(data) {
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
}
function emitError(err) {
  const error = { code: err.code, message: err.message };
  if (err.details !== void 0) error.details = err.details;
  process.stdout.write(JSON.stringify({ ok: false, error }) + "\n");
}

// src/commands/help.mts
function buildAgentDoc(version, commands) {
  return {
    name: "daoyan",
    version,
    tagline: "\u5267\u672C\u8FDB\uFF0C\u6210\u7247\u51FA\u3002You prepare the story. The director shoots it.",
    commands: commands.map((c) => ({
      name: c.name,
      group: c.group,
      summary: c.summary,
      usage: c.usage,
      implemented: c.implemented ?? false
    })),
    outputEnvelope: {
      success: { ok: true, data: "\u2026" },
      failure: { ok: false, error: { code: "shot_timeout", message: "\u2026", details: {} } }
    },
    exitCodes: { "0": "\u6210\u529F", "1": "\u4E1A\u52A1\u5931\u8D25", "2": "\u7528\u6CD5\u9519\u8BEF", "130": "\u88AB\u4E2D\u65AD" },
    errorCodes: ERROR_CODES
  };
}
function printMainHelp(commands, version) {
  const lines = [
    "daoyan \u2014\u2014 \u5267\u672C\u8FDB\uFF0C\u6210\u7247\u51FA\u3002You prepare the story. The director shoots it.",
    "",
    "\u7528\u6CD5: daoyan [\u5168\u5C40\u53C2\u6570] <\u547D\u4EE4> [\u53C2\u6570...]\uFF08dycli \u4E0E daoyan \u5B8C\u5168\u7B49\u4EF7\uFF09",
    "",
    "\u5168\u5C40\u53C2\u6570:",
    "  --json            \u673A\u5668\u53EF\u8BFB\u8F93\u51FA\uFF08\u4FE1\u5C01\u683C\u5F0F\u89C1 daoyan help --json\uFF09",
    "  --project <\u8DEF\u5F84>   \u6307\u5B9A\u9879\u76EE\u76EE\u5F55\uFF08\u9ED8\u8BA4\u81EA\u5F53\u524D\u4F4D\u7F6E\u5411\u4E0A\u5BFB\u627E project.json\uFF09",
    "  --no-color        \u5173\u95ED\u5F69\u8272\u8F93\u51FA",
    "  -h, --help        \u5E2E\u52A9\uFF1Bdaoyan help <\u547D\u4EE4> \u67E5\u770B\u5355\u547D\u4EE4\u8BE6\u60C5",
    "  -v, --version     \u7248\u672C",
    ""
  ];
  for (const g of Object.keys(GROUP_LABEL)) {
    lines.push(`${GROUP_LABEL[g]}:`);
    for (const c of commands.filter((x) => x.group === g)) {
      lines.push(`  ${c.usage}`);
      lines.push(`    ${c.summary}`);
    }
    lines.push("");
  }
  lines.push(`daoyan v${version} \xB7 ComfyUI \u662F\u5916\u90E8\u7EC4\u4EF6 \xB7 \u6587\u6863\u89C1 docs/`);
  process.stdout.write(lines.join("\n") + "\n");
}
function printCommandHelp(meta) {
  const lines = [meta.usage, `  ${meta.summary}`];
  if (meta.detail !== void 0) {
    lines.push("");
    for (const d of meta.detail) lines.push(`  ${d}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}
function runHelp(ctx2, args, commands, version) {
  const target = args.filter((a) => !a.startsWith("-")).join(" ");
  if (target === "") {
    if (ctx2.json) {
      emitData(buildAgentDoc(version, commands));
      return;
    }
    printMainHelp(commands, version);
    return;
  }
  const hit = commands.find((c) => c.name === target);
  if (hit === void 0) {
    throw new DaoyanCliError({
      code: "usage",
      message: `\u672A\u77E5\u547D\u4EE4 ${target}\uFF1Bdaoyan help \u67E5\u770B\u5168\u90E8`,
      exit: 2
    });
  }
  printCommandHelp(hit);
}

// src/commands/update.mts
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawn as spawn2 } from "child_process";

// src/shared/exec.mts
import { spawn } from "child_process";
function execCapture(cmd, args, opts = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = opts.timeoutMs !== void 0 ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs) : void 0;
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      if (timer !== void 0) clearTimeout(timer);
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `\u65E0\u6CD5\u542F\u52A8 ${cmd}\uFF1A${e.message}` })
      );
    });
    child.on("close", (code) => {
      if (timer !== void 0) clearTimeout(timer);
      resolvePromise({ code: code ?? -1, stdout: out, stderr: err });
    });
  });
}
function execInherit(cmd, args, opts = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: "inherit" });
    child.on(
      "error",
      (e) => rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `\u65E0\u6CD5\u542F\u52A8 ${cmd}\uFF1A${e.message}` })
      )
    );
    child.on("close", (code) => resolvePromise(code ?? -1));
  });
}
async function tryExecCapture(cmd, args, opts = {}) {
  try {
    return await execCapture(cmd, args, opts);
  } catch {
    return null;
  }
}

// src/shared/log.mts
import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";
var sinks = [];
function ts() {
  return (/* @__PURE__ */ new Date()).toTimeString().slice(0, 8);
}
function attachFileSink(file) {
  mkdirSync(dirname(file), { recursive: true });
  sinks.push((line) => {
    appendFileSync(file, line + "\n");
  });
}
function say(msg) {
  const line = `[${ts()}] ${msg}`;
  process.stdout.write(line + "\n");
  for (const s of sinks) {
    try {
      s(line);
    } catch {
    }
  }
}

// src/commands/update.mts
var REPO_URL = "https://github.com/yuanbaobaoo/daoyan-cli.git";
function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v);
  return m !== null ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function newer(a, b) {
  return a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
}
async function latestTag() {
  try {
    const res = await fetch("https://api.github.com/repos/yuanbaobaoo/daoyan-cli/tags", {
      headers: { "user-agent": "daoyan-cli-update", accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15e3)
    });
    if (!res.ok) return { tag: null, note: `GitHub API ${res.status}` };
    const tags = await res.json();
    let best = null;
    for (const t of tags) {
      const v = t.name !== void 0 ? parseSemver(t.name) : null;
      if (v === null) continue;
      if (best === null || newer(v, best.v)) best = { tag: t.name, v };
    }
    return best === null ? { tag: null, note: "\u4ED3\u5E93\u5C1A\u65E0\u8BED\u4E49\u5316 tag\uFF08vX.Y.Z\uFF09" } : { tag: best.tag, note: "" };
  } catch (e) {
    return { tag: null, note: `GitHub \u4E0D\u53EF\u8FBE\uFF1A${e instanceof Error ? e.message : String(e)}` };
  }
}
function spawnCapture(cmd, args, opts) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn2(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    child.stdout?.on("data", (d) => {
      out += d.toString();
    });
    child.on(
      "error",
      (e) => rejectPromise(new DaoyanCliError({ code: "external_tool_missing", message: `\u65E0\u6CD5\u542F\u52A8 ${cmd}\uFF1A${e.message}` }))
    );
    child.on("close", (code) => resolvePromise({ code: code ?? -1, stdout: out }));
  });
}
async function runUpdate(ctx2, args) {
  const checkOnly = args.includes("--check");
  const { tag, note } = await latestTag();
  const current = parseSemver(VERSION);
  const currentStr = `v${VERSION}`;
  if (tag === null) {
    if (ctx2.json) {
      emitData({ current: currentStr, latest: null, note });
      return;
    }
    say(`\u5F53\u524D ${currentStr}\uFF1B\u65E0\u6CD5\u786E\u5B9A\u6700\u65B0\u7248\uFF08${note}\uFF09`);
    return;
  }
  const latestV = parseSemver(tag);
  const hasUpdate = current !== null && latestV !== null && newer(latestV, current);
  if (checkOnly || !hasUpdate) {
    if (ctx2.json) {
      emitData({ current: currentStr, latest: tag, updateAvailable: hasUpdate });
      return;
    }
    if (hasUpdate) say(`\u6709\u65B0\u7248\u672C ${tag}\uFF08\u5F53\u524D ${currentStr}\uFF09\u3002\u8FD0\u884C daoyan update \u5347\u7EA7`);
    else say(`\u5DF2\u662F\u6700\u65B0\uFF08\u5F53\u524D ${currentStr}\uFF0CGitHub \u6700\u65B0 tag ${tag}\uFF09`);
    return;
  }
  say(`\u68C0\u6D4B\u5230\u65B0\u7248\u672C ${tag}\uFF08\u5F53\u524D ${currentStr}\uFF09\uFF0C\u5F00\u59CB\u81EA\u5347\u7EA7...`);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const tmp = mkdtempSync(join(tmpdir(), "daoyan-cli-update-"));
  try {
    const pack = await spawnCapture(npm, ["pack", "--silent", `git+${REPO_URL}#${tag}`], { cwd: tmp });
    if (pack.code !== 0) {
      throw new DaoyanCliError({
        code: "update_failed",
        message: `npm pack \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${pack.code}\uFF09\u3002\u68C0\u67E5\u7F51\u7EDC\u4E0E GitHub \u53EF\u8FBE\u6027`
      });
    }
    const tgz = pack.stdout.trim().split("\n").filter((l) => l !== "").pop();
    if (tgz === void 0) {
      throw new DaoyanCliError({ code: "update_failed", message: "npm pack \u672A\u4EA7\u51FA tarball" });
    }
    const code = await execInherit(npm, ["install", "-g", join(tmp, tgz)]);
    if (code !== 0) {
      throw new DaoyanCliError({
        code: "update_failed",
        message: `npm install -g \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${code}\uFF09\u3002EACCES \u65F6\u8003\u8651 nvm \u6216\u81EA\u5B9A\u4E49 npm prefix`,
        details: { exit: code }
      });
    }
    say(`\u5347\u7EA7\u5B8C\u6210\uFF1A${tag}\u3002\u9A8C\u8BC1\uFF1Adaoyan --version`);
    if (ctx2.json) emitData({ updated: tag, previous: currentStr });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// src/commands/init.mts
import { existsSync as existsSync2, mkdirSync as mkdirSync3, readdirSync } from "fs";
import { join as join3, resolve as resolve2 } from "path";

// src/core/provision/init-flow.mts
import { copyFileSync, existsSync, mkdirSync as mkdirSync2, readFileSync, writeFileSync } from "fs";
import { dirname as dirname2, join as join2, resolve } from "path";
import { fileURLToPath } from "url";

// src/core/project/types.mts
var PROJECT_FILE = "project.json";
var SHOTS_FILE = "shots.json";
var LOG_DIR = "logs";
var TOOL_LOG_FILE = "daoyan-cli.log";
var ENGINE_LOG_FILE = "engine.log";
var ENGINE_PID_FILE = "engine.pid";
var TASK_LOCK_FILE = "task.lock";
var MANIFESTS_DIR = "manifests";

// src/core/provision/init-flow.mts
var COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git";
var COMFY_TAGS_API = "https://api.github.com/repos/comfyanonymous/ComfyUI/tags";
async function detectPython(log) {
  const r = await execCapture("python3", ["--version"], { timeoutMs: 15e3 });
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: "\u672A\u627E\u5230\u53EF\u7528\u7684 python3\uFF08ComfyUI \u4F9D\u8D56\u5B89\u88C5\u9700\u8981 \u22653.10\uFF09\u3002Ubuntu\uFF1Aapt install python3 python3-venv\uFF1BmacOS\uFF1Abrew install python"
    });
  }
  const m = /Python\s+(\d+)\.(\d+)/.exec(r.stdout.trim());
  const major = m !== null ? Number(m[1]) : 0;
  const minor = m !== null ? Number(m[2]) : 0;
  if (major < 3 || major === 3 && minor < 10) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: `python3 \u7248\u672C\u8FC7\u4F4E\uFF08${r.stdout.trim()}\uFF0C\u8981\u6C42 \u22653.10\uFF09`
    });
  }
  log(`python3 \u5C31\u7EEA\uFF1A${r.stdout.trim()}`);
}
async function latestComfyTag() {
  const res = await fetch(COMFY_TAGS_API, {
    headers: { "user-agent": "daoyan-cli-init", accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(15e3)
  });
  if (!res.ok) throw new DaoyanCliError({ code: "provision_failed", message: `GitHub API ${res.status}\uFF08\u53EF\u7528 --version \u56FA\u5B9A\u7248\u672C\u7ED5\u8FC7\uFF09` });
  const tags = await res.json();
  for (const t of tags) {
    if (t.name !== void 0 && /^v?\d+\.\d+/.test(t.name)) return t.name;
  }
  throw new DaoyanCliError({ code: "provision_failed", message: "GitHub tags \u4E2D\u672A\u627E\u5230\u53EF\u7528\u7248\u672C\uFF08\u53EF\u7528 --version \u56FA\u5B9A\u7248\u672C\u7ED5\u8FC7\uFF09" });
}
async function createVenv(root, venvDir, log) {
  log(`\u521B\u5EFA\u865A\u62DF\u73AF\u5883 ${venvDir} ...`);
  const r = await execInherit("python3", ["-m", "venv", venvDir], { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `python3 -m venv \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r}\uFF09\u3002Ubuntu \u9700 python3-venv \u5305`
    });
  }
}
async function cloneComfyUI(root, targetDir, ref, log) {
  log(`\u514B\u9686 ComfyUI\uFF08${ref}\uFF0C--depth 1\uFF09\u2192 ${targetDir} ...`);
  const r = await execInherit(
    "git",
    ["clone", "--depth", "1", "--branch", ref, COMFY_REPO, targetDir],
    { cwd: root }
  );
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `git clone \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r}\uFF09\u3002\u68C0\u67E5\u7F51\u7EDC / tag \u662F\u5426\u5B58\u5728\uFF08--version \u6307\u5B9A\uFF09`
    });
  }
}
async function pipInstall(root, venvDir, mirror, log) {
  const pip = join2(venvDir, "bin", "pip");
  const req = "engine/ComfyUI/requirements.txt";
  if (!existsSync(join2(root, req))) {
    throw new DaoyanCliError({ code: "provision_failed", message: `\u7F3A\u5C11 ${req}\uFF08clone \u672A\u5B8C\u6210\uFF1F\uFF09` });
  }
  log(`\u5B89\u88C5\u4F9D\u8D56\uFF08pip install -r ${req}\uFF0C\u53EF\u80FD\u9700\u8981\u4E0B\u8F7D torch\uFF0C\u8017\u65F6\u8F83\u957F\uFF09...`);
  const args = ["install", "-r", req];
  if (mirror !== void 0) args.push("--index-url", mirror);
  const r = await execInherit(pip, args, { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `pip install \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r}\uFF09\u3002\u53EF\u7528 --mirror \u6307\u5B9A\u955C\u50CF\u6E90\u91CD\u8BD5`
    });
  }
  log("\u4F9D\u8D56\u5B89\u88C5\u5B8C\u6210");
}
function locateTemplates() {
  let dir = dirname2(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const cand = join2(dir, "templates", "project.template.json");
    if (existsSync(cand)) return join2(dir, "templates");
    dir = dirname2(dir);
  }
  throw new DaoyanCliError({ code: "config_invalid", message: "\u627E\u4E0D\u5230\u5185\u7F6E templates/ \u76EE\u5F55\uFF08\u5B89\u88C5\u5305\u635F\u574F\uFF1F\uFF09" });
}
function slugOf(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name) ? name : "mydrama";
}
function scaffoldProject(root, name, engine) {
  const tpls = locateTemplates();
  copyFileSync(join2(tpls, "shots.template.json"), join2(root, SHOTS_FILE));
  copyFileSync(join2(tpls, "workflow.api.template.json"), join2(root, "workflow.api.json"));
  for (const d of ["anchors", "assets", "logs", "relay_frames", "manifests", "final"]) {
    mkdirSync2(join2(root, d), { recursive: true });
  }
  writeFileSync(
    join2(root, ".gitignore"),
    ["engine/", "logs/", "relay_frames/", "final/", "concat_list.txt", "*.log", ".DS_Store", ""].join("\n")
  );
  const tpl = JSON.parse(
    readFileSync(join2(tpls, "project.template.json"), "utf8")
  );
  tpl.name = name;
  tpl.output_prefix = `${slugOf(name)}/`;
  const eng = tpl.engine;
  eng.mode = engine.mode;
  if (engine.mode === "remote") {
    delete eng.comfyui_dir;
    delete eng.venv_dir;
    delete eng.repo_url;
    delete eng.launch_extra;
    delete eng.run_user;
    if (engine.url !== void 0) {
      eng.url = engine.url;
    }
    if (engine.port !== void 0) eng.port = engine.port;
  } else {
    eng.comfyui_dir = engine.comfyui_dir ?? "engine/ComfyUI";
    eng.venv_dir = engine.venv_dir ?? "engine/.venv";
    if (engine.version !== void 0) eng.version = engine.version;
  }
  writeFileSync(join2(root, PROJECT_FILE), JSON.stringify(tpl, null, 2) + "\n");
}

// src/commands/init.mts
function parseArgs(args) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === void 0) break;
    const need = (label) => {
      const v = args[i + 1];
      if (v === void 0 || v === "") {
        throw new DaoyanCliError({ code: "usage", message: `${label} \u9700\u8981\u53C2\u6570`, exit: 2 });
      }
      i++;
      return v;
    };
    if (a === "--version") flags.version = need("--version");
    else if (a === "--use-existing") flags.useExisting = need("--use-existing");
    else if (a === "--remote") flags.remoteUrl = need("--remote");
    else if (a === "--mirror") flags.mirror = need("--mirror");
    else if (a.startsWith("-")) {
      throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u53C2\u6570 ${a}`, exit: 2 });
    } else pos.push(a);
  }
  const name = pos[0];
  if (name === void 0 || name === "") {
    throw new DaoyanCliError({ code: "usage", message: "\u7528\u6CD5\uFF1Adaoyan init <\u540D\u79F0> [--version <tag>] [--use-existing <\u8DEF\u5F84>] [--remote <url>] [--mirror <\u955C\u50CF>]", exit: 2 });
  }
  return { name, flags };
}
async function runInit(ctx2, args) {
  const { name, flags } = parseArgs(args);
  const root = resolve2(process.cwd(), name);
  if (existsSync2(root) && readdirSync(root).length > 0) {
    throw new DaoyanCliError({ code: "usage", message: `\u76EE\u6807\u76EE\u5F55\u975E\u7A7A\uFF1A${root}`, exit: 2 });
  }
  mkdirSync3(root, { recursive: true });
  let engine;
  if (flags.remoteUrl !== void 0) {
    say(`\u8FDC\u7AEF\u6A21\u5F0F\uFF1A\u76F4\u8FDE ${flags.remoteUrl}\uFF08\u4E0D\u5B89\u88C5\u5F15\u64CE\uFF09`);
    engine = { mode: "remote", url: flags.remoteUrl };
    scaffoldProject(root, name, engine);
    say(`\u9879\u76EE\u9AA8\u67B6\u5DF2\u751F\u6210\uFF1A${root}`);
  } else if (flags.useExisting !== void 0) {
    const p = resolve2(process.cwd(), flags.useExisting);
    const comfy = existsSync2(join3(p, "ComfyUI", "main.py")) ? join3(p, "ComfyUI") : existsSync2(join3(p, "main.py")) ? p : null;
    const venv = [join3(p, "env"), join3(p, "engine", ".venv"), join3(p, ".venv")].find(
      (v) => existsSync2(join3(v, "bin", "python"))
    );
    if (comfy === null) {
      throw new DaoyanCliError({ code: "config_invalid", message: `\u63A5\u7BA1\u8DEF\u5F84\u4E0B\u672A\u627E\u5230 ComfyUI\uFF08\u671F\u671B ${join3(p, "ComfyUI", "main.py")} \u6216 ${join3(p, "main.py")}\uFF09` });
    }
    if (venv === void 0) {
      throw new DaoyanCliError({ code: "config_invalid", message: `\u63A5\u7BA1\u8DEF\u5F84\u4E0B\u672A\u627E\u5230 venv\uFF08\u671F\u671B ${join3(p, "env", "bin", "python")} \u7B49\u5E03\u5C40\uFF09` });
    }
    say(`\u63A5\u7BA1\u65E2\u6709\u5B89\u88C5\uFF1AComfyUI=${comfy}\uFF0Cvenv=${venv}`);
    engine = { mode: "local", comfyui_dir: comfy, venv_dir: venv };
    scaffoldProject(root, name, engine);
    say(`\u9879\u76EE\u9AA8\u67B6\u5DF2\u751F\u6210\uFF1A${root}`);
  } else {
    await detectPython(say);
    const version = flags.version ?? await latestComfyTag();
    say(`ComfyUI \u7248\u672C\uFF1A${version}`);
    await createVenv(root, "engine/.venv", say);
    await cloneComfyUI(root, "engine/ComfyUI", version, say);
    await pipInstall(root, "engine/.venv", flags.mirror, say);
    engine = { mode: "local", comfyui_dir: "engine/ComfyUI", venv_dir: "engine/.venv", version };
    scaffoldProject(root, name, engine);
    say(`\u9879\u76EE\u9AA8\u67B6\u5DF2\u751F\u6210\uFF1A${root}`);
  }
  say("\u4E0B\u4E00\u6B65\uFF1A");
  say("  1. \u7F16\u8F91 project.json\uFF08models \u4E09\u4EF6\u5957\u6307\u5411\u4F60\u7684\u6A21\u578B\u6587\u4EF6\u540D\uFF09");
  say("  2. \u7F16\u8F91 shots.json\uFF08\u5206\u955C\u8868\uFF09\u4E0E workflow.api.json\uFF08\u5F15\u64CE\u5BFC\u51FA\u540E\u6309\u8282\u70B9\u547D\u540D\u7EA6\u5B9A\u91CD\u547D\u540D\uFF09");
  say("  3. daoyan validate \u6821\u9A8C \u2192 daoyan shot 01 \u5F00\u62CD");
  if (ctx2.json) {
    emitData({ root, engine: { mode: engine.mode, version: engine.version ?? null } });
  }
}

// src/commands/validate.mts
import { existsSync as existsSync4, readFileSync as readFileSync3 } from "fs";
import { join as join5 } from "path";

// src/core/project/config.mts
import { existsSync as existsSync3, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "fs";
import { dirname as dirname3, isAbsolute, join as join4, resolve as resolve3 } from "path";
function findProject(start) {
  let dir = resolve3(start);
  for (; ; ) {
    const candidate = join4(dir, PROJECT_FILE);
    if (existsSync3(candidate)) {
      let raw;
      try {
        raw = JSON.parse(readFileSync2(candidate, "utf8"));
      } catch (e) {
        throw new DaoyanCliError({
          code: "config_invalid",
          message: `${candidate} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`
        });
      }
      const cfg = defaultEngineMode(raw);
      if (!isProjectConfig(cfg)) {
        throw new DaoyanCliError({
          code: "config_invalid",
          message: `${candidate} \u7F3A\u5C11\u6216\u975E\u6CD5\u7684\u5FC5\u586B\u5B57\u6BB5\uFF08name / engine / models\uFF1Bengine.mode \u7F3A\u7701\u6309 local \u5904\u7406\uFF0C\u6B64\u65F6\u9700\u8981 comfyui_dir \u4E0E venv_dir\uFF1Bmode \u4EC5\u63A5\u53D7 local / remote\uFF09\uFF0C\u89C1 docs/DATA-MODEL.md`
        });
      }
      return { root: dir, config: absolutize(cfg, dir) };
    }
    const parent = dirname3(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function defaultEngineMode(raw) {
  if (typeof raw !== "object" || raw === null) return raw;
  const o = raw;
  if (typeof o.engine !== "object" || o.engine === null) return raw;
  const e = o.engine;
  if (e.mode !== void 0) return raw;
  return { ...o, engine: { ...e, mode: "local" } };
}
function isProjectConfig(v) {
  if (typeof v !== "object" || v === null) return false;
  const o = v;
  if (typeof o.name !== "string" || typeof o.engine !== "object" || o.engine === null || typeof o.models !== "object" || o.models === null) {
    return false;
  }
  const e = o.engine;
  if (typeof e.host !== "string" || typeof e.port !== "number") return false;
  if (e.mode === "local") {
    return typeof e.comfyui_dir === "string" && typeof e.venv_dir === "string";
  }
  return e.mode === "remote";
}
function absolutize(cfg, root) {
  const fix = (p) => isAbsolute(p) ? p : join4(root, p);
  return {
    ...cfg,
    engine: cfg.engine.mode === "local" ? {
      ...cfg.engine,
      comfyui_dir: fix(cfg.engine.comfyui_dir),
      venv_dir: fix(cfg.engine.venv_dir)
    } : cfg.engine
  };
}
function projectFromContext(ctx2) {
  return findProject(ctx2.projectPath ?? process.cwd());
}
function loadShotsFile(root) {
  const file = join4(root, SHOTS_FILE);
  if (!existsSync3(file)) {
    throw new DaoyanCliError({ code: "config_invalid", message: `\u7F3A\u5C11 ${file}\uFF08init \u751F\u6210\u6216\u624B\u5DE5\u521B\u5EFA\uFF09` });
  }
  try {
    const raw = JSON.parse(readFileSync2(file, "utf8"));
    if (typeof raw !== "object" || raw === null) throw new Error("\u9876\u5C42\u4E0D\u662F\u5BF9\u8C61");
    return raw;
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5\u7684 shots.json\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
}
function saveProjectConfig(root, cfg) {
  writeFileSync2(join4(root, PROJECT_FILE), JSON.stringify(cfg, null, 2) + "\n");
}

// src/commands/validate.mts
var REQUIRED_WF_KEYS = ["4_negative", "5_cond", "6_shift", "7_sample", "9_save"];
var DIM_MULTIPLE = 32;
var FRAME_GRID_STEP = 17;
var FRAME_GRID_OFFSET = 5;
async function runValidate(ctx2) {
  const found = projectFromContext(ctx2);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "\u672A\u627E\u5230 project.json\uFF1B\u7528 --project \u6307\u5B9A\u6216\u5728\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C" });
  }
  const { root, config: cfg } = found;
  const shots = loadShotsFile(root);
  const errors = [];
  const warnings = [];
  if (shots.shots.length === 0) errors.push({ level: "error", item: "shots", message: "\u5206\u955C\u8868\u4E3A\u7A7A" });
  if (shots.meta.width <= 0 || shots.meta.width % DIM_MULTIPLE !== 0) {
    errors.push({ level: "error", item: "meta.width", message: `${shots.meta.width} \u4E0D\u662F 32 \u7684\u500D\u6570` });
  }
  if (shots.meta.height <= 0 || shots.meta.height % DIM_MULTIPLE !== 0) {
    errors.push({ level: "error", item: "meta.height", message: `${shots.meta.height} \u4E0D\u662F 32 \u7684\u500D\u6570` });
  }
  for (const key of ["length", "steps", "cfg", "negative"]) {
    if (shots.defaults[key] === void 0) {
      errors.push({ level: "error", item: `defaults.${key}`, message: "\u7F3A\u5C11\u9ED8\u8BA4\u53C2\u6570" });
    }
  }
  const seenId = /* @__PURE__ */ new Set();
  const seenSeed = /* @__PURE__ */ new Set();
  const byId = new Map(shots.shots.map((s) => [s.id, s]));
  for (const s of shots.shots) {
    const tag = `\u955C ${s.id}`;
    if (seenId.has(s.id)) errors.push({ level: "error", item: tag, message: "\u955C\u53F7\u91CD\u590D" });
    seenId.add(s.id);
    if (typeof s.seed !== "number") errors.push({ level: "error", item: tag, message: "\u7F3A\u5C11\u6570\u503C seed" });
    else if (seenSeed.has(String(s.seed))) errors.push({ level: "error", item: tag, message: `seed ${s.seed} \u4E0E\u5176\u4ED6\u955C\u51B2\u7A81` });
    seenSeed.add(String(s.seed));
    if (typeof s.prompt !== "string" || s.prompt.trim() === "") {
      errors.push({ level: "error", item: tag, message: "prompt \u4E3A\u7A7A" });
    }
    if (typeof s.slug !== "string" || s.slug === "") errors.push({ level: "error", item: tag, message: "\u7F3A\u5C11 slug" });
    const len = s.length ?? shots.defaults.length;
    if (typeof len === "number" && len % FRAME_GRID_STEP !== FRAME_GRID_OFFSET) {
      warnings.push({ level: "warning", item: tag, message: `length ${len} \u4E0D\u7B26\u5408 17k+5 \u5E27\u7F51\u683C\uFF08\u5C06\u88AB\u5BF9\u9F50\uFF09` });
    }
  }
  for (const s of shots.shots) {
    const ff = s.first_frame;
    if (ff === void 0) continue;
    const tag = `\u955C ${s.id}`;
    if (typeof ff === "string") {
      const rel = shots.meta.anchors[ff];
      if (rel === void 0) {
        errors.push({ level: "error", item: tag, message: `\u951A\u70B9 key "${ff}" \u4E0D\u5728 meta.anchors` });
      } else if (!existsSync4(join5(root, rel))) {
        errors.push({ level: "error", item: tag, message: `\u951A\u70B9\u56FE\u7247\u4E0D\u5B58\u5728\uFF1A${rel}` });
      }
    } else if (typeof ff === "object" && typeof ff.relay === "string") {
      if (!byId.has(ff.relay)) {
        errors.push({ level: "error", item: tag, message: `\u63A5\u529B\u4E0A\u6E38 ${ff.relay} \u4E0D\u5B58\u5728` });
      }
    } else {
      errors.push({ level: "error", item: tag, message: 'first_frame \u975E\u6CD5\uFF08\u5E94\u4E3A\u951A\u70B9\u5B57\u7B26\u4E32\u6216 {"relay":"id"}\uFF09' });
    }
  }
  for (const s of shots.shots) {
    const seen = /* @__PURE__ */ new Set([s.id]);
    let cur = s;
    for (; ; ) {
      const ff = cur.first_frame;
      if (typeof ff !== "object" || ff === void 0) break;
      const next = byId.get(ff.relay);
      if (next === void 0) break;
      if (seen.has(next.id)) {
        errors.push({ level: "error", item: `\u955C ${s.id}`, message: `\u63A5\u529B\u94FE\u6210\u73AF\uFF08\u7ECF\u8FC7 ${next.id}\uFF09` });
        break;
      }
      seen.add(next.id);
      cur = next;
    }
  }
  const wfFile = join5(root, cfg.workflow);
  if (!existsSync4(wfFile)) {
    errors.push({ level: "error", item: cfg.workflow, message: "workflow \u6A21\u677F\u6587\u4EF6\u4E0D\u5B58\u5728" });
  } else {
    try {
      const wf = JSON.parse(readFileSync3(wfFile, "utf8"));
      for (const k of REQUIRED_WF_KEYS) {
        if (typeof wf[k] !== "object" || wf[k] === null) {
          errors.push({ level: "error", item: cfg.workflow, message: `\u7F3A\u5C11\u7EA6\u5B9A\u8282\u70B9\u952E "${k}"\uFF08\u89C1 docs/DATA-MODEL.md\uFF09` });
        }
      }
    } catch (e) {
      errors.push({ level: "error", item: cfg.workflow, message: `\u4E0D\u662F\u5408\u6CD5 JSON\uFF08${e instanceof Error ? e.message : String(e)}\uFF09` });
    }
  }
  if (cfg.engine.mode === "local") {
    if (!existsSync4(cfg.engine.comfyui_dir)) {
      warnings.push({ level: "warning", item: "engine.comfyui_dir", message: `\u76EE\u5F55\u4E0D\u5B58\u5728\uFF08${cfg.engine.comfyui_dir}\uFF09\u2014\u2014\u5F15\u64CE\u672A\u5B89\u88C5\uFF1F\u8FD0\u884C daoyan init` });
    }
    if (!existsSync4(cfg.engine.venv_dir)) {
      warnings.push({ level: "warning", item: "engine.venv_dir", message: `\u76EE\u5F55\u4E0D\u5B58\u5728\uFF08${cfg.engine.venv_dir}\uFF09\u2014\u2014\u5F15\u64CE\u672A\u5B89\u88C5\uFF1F\u8FD0\u884C daoyan init` });
    }
  }
  const ok = errors.length === 0;
  if (!ctx2.json) {
    for (const e of errors) say(`\u2717 [${e.item}] ${e.message}`);
    for (const w of warnings) say(`! [${w.item}] ${w.message}`);
    say(ok ? `\u6821\u9A8C\u901A\u8FC7\uFF08${warnings.length} \u6761\u8B66\u544A\uFF09` : `\u6821\u9A8C\u5931\u8D25\uFF1A${errors.length} \u9879\u9519\u8BEF`);
  }
  if (!ok) {
    throw new DaoyanCliError({
      code: "validation_failed",
      message: `\u9879\u76EE\u6821\u9A8C\u672A\u901A\u8FC7\uFF08${errors.length} \u9879\u9519\u8BEF\uFF0C\u89C1 details\uFF09`,
      details: { errors, warnings }
    });
  }
  if (ctx2.json) {
    emitData({ ok, errors, warnings });
  }
}

// src/commands/shot.mts
import { appendFileSync as appendFileSync2, mkdirSync as mkdirSync6 } from "fs";
import { join as join8 } from "path";

// src/core/lock/task-lock.mts
import { existsSync as existsSync5, readFileSync as readFileSync4, rmSync as rmSync2, writeFileSync as writeFileSync3 } from "fs";
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
function readLock(path) {
  if (!existsSync5(path)) return null;
  let info;
  try {
    info = JSON.parse(readFileSync4(path, "utf8"));
  } catch {
    return { pid: -1, desc: "\u9501\u6587\u4EF6\u635F\u574F", started: "?", stale: true };
  }
  if (typeof info.pid !== "number" || alive(info.pid)) return info;
  return { ...info, stale: true };
}
function acquireLock(path, desc) {
  const cur = readLock(path);
  if (cur && !cur.stale) {
    throw new DaoyanCliError({
      code: "lock_held",
      message: `\u5DF2\u6709\u4EFB\u52A1\u8FD0\u884C\u4E2D\uFF1A${cur.desc}\uFF08pid ${cur.pid}\uFF0C\u59CB\u4E8E ${cur.started}\uFF09\u3002\u770B\u65E5\u5FD7\uFF1Adaoyan logs -f`,
      details: { pid: cur.pid, desc: cur.desc, started: cur.started }
    });
  }
  writeFileSync3(
    path,
    JSON.stringify({ pid: process.pid, desc, started: (/* @__PURE__ */ new Date()).toISOString() }, null, 2)
  );
}
function releaseLock(path) {
  rmSync2(path, { force: true });
}

// src/core/comfy/lifecycle.mts
import { spawn as spawn3 } from "child_process";
import { closeSync, existsSync as existsSync6, openSync, readFileSync as readFileSync5, readSync, statSync, writeFileSync as writeFileSync4, mkdirSync as mkdirSync4 } from "fs";
import { join as join6 } from "path";

// src/core/comfy/client.mts
var ComfyClient = class {
  /**
   * 引擎 base URL（如 http://127.0.0.1:8188）。
   */
  base;
  /**
   * 以 base URL 构造客户端。
   */
  constructor(base) {
    this.base = base;
  }
  /**
   * GET 请求并解析 JSON；非 2xx 抛普通 Error。
   */
  async get(path) {
    const res = await fetch(`${this.base}${path}`);
    if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
    return await res.json();
  }
  /**
   * 引擎系统状态（显存 / 设备等）。
   */
  systemStats() {
    return this.get("/system_stats");
  }
  /**
   * 节点定义表（doctor 校验节点注册用）。
   */
  objectInfo() {
    return this.get("/object_info");
  }
  /**
   * 队列快照（执行中 / 等待中）。
   */
  queue() {
    return this.get("/queue");
  }
  /**
   * 引擎执行中任务数；不可达返回 null。
   */
  async queueRunningLen() {
    try {
      return (await this.queue()).queue_running.length;
    } catch {
      return null;
    }
  }
  /**
   * 查询单次执行的 history（按 prompt id）。
   */
  history(promptId) {
    return this.get(`/history/${promptId}`);
  }
  /**
   * 提交 workflow（API 格式）并返回受理回执。
   */
  async submit(workflow, clientId = "daoyan-cli") {
    const res = await fetch(`${this.base}/prompt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: clientId })
    });
    if (!res.ok) {
      throw new Error(`POST /prompt -> HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    return await res.json();
  }
  /** 上传首帧图片到引擎 input（remote 模式的必经之路；local 模式也可统一走它）。
   *  返回引擎侧文件名，填入 LoadImage 节点的 image 输入。 */
  async uploadImage(filename, bytes, overwrite = true) {
    const form = new FormData();
    form.append("image", new Blob([bytes]), filename);
    form.append("overwrite", String(overwrite));
    const res = await fetch(`${this.base}/upload/image`, { method: "POST", body: form });
    if (!res.ok) {
      throw new Error(`POST /upload/image -> HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const data = await res.json();
    return data.name ?? filename;
  }
};
function engineBaseUrl(engine) {
  return engine.url ?? `http://${engine.host}:${engine.port}`;
}
function clientFromEngine(engine) {
  return new ComfyClient(engineBaseUrl(engine));
}

// src/core/comfy/lifecycle.mts
var READY_TIMEOUT_MS = 18e4;
var READY_INTERVAL_MS = 3e3;
var PROBE_TIMEOUT_MS = 5e3;
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
function enginePid(root) {
  const file = join6(root, LOG_DIR, ENGINE_PID_FILE);
  if (!existsSync6(file)) return null;
  try {
    const n = Number.parseInt(readFileSync5(file, "utf8").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
async function probeEngine(root, cfg) {
  const client = clientFromEngine(cfg.engine);
  const pidRaw = cfg.engine.mode === "local" ? enginePid(root) : null;
  const pid = pidRaw !== null && pidAlive(pidRaw) ? pidRaw : null;
  const baseUrl = clientBaseUrl(client);
  try {
    await withTimeout(client.systemStats(), PROBE_TIMEOUT_MS);
    return { up: true, pid, baseUrl };
  } catch {
    return { up: false, pid, baseUrl };
  }
}
function clientBaseUrl(client) {
  return client.base;
}
function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
  ]);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function ensureEngine(root, cfg, log) {
  const client = clientFromEngine(cfg.engine);
  if (await reachable(client)) return client;
  if (cfg.engine.mode !== "local") {
    throw new DaoyanCliError({
      code: "engine_not_ready",
      message: `\u8FDC\u7AEF\u5F15\u64CE\u4E0D\u53EF\u8FBE\uFF08${clientBaseUrl(client)}\uFF09\uFF1A\u8BF7\u786E\u8BA4\u8FDC\u7AEF ComfyUI \u5DF2\u542F\u52A8\uFF0C\u6216\u68C0\u67E5 engine.url/host \u914D\u7F6E`
    });
  }
  const eng = cfg.engine;
  const python = join6(eng.venv_dir, "bin", "python");
  if (!existsSync6(python)) {
    throw new DaoyanCliError({
      code: "engine_start_failed",
      message: `venv \u4E0D\u5B58\u5728\uFF1A${python}\u3002\u5148\u8FD0\u884C daoyan init\uFF08\u6216\u68C0\u67E5 project.json \u7684 engine.venv_dir\uFF09`
    });
  }
  if (!existsSync6(join6(eng.comfyui_dir, "main.py"))) {
    throw new DaoyanCliError({
      code: "engine_start_failed",
      message: `ComfyUI \u76EE\u5F55\u65E0\u6548\uFF1A${eng.comfyui_dir}\uFF08\u7F3A\u5C11 main.py\uFF09`
    });
  }
  log(`\u5F15\u64CE\u672A\u8FD0\u884C\uFF0C\u6B63\u5728\u62C9\u8D77\uFF08${eng.comfyui_dir}\uFF09...`);
  const logDir = join6(root, LOG_DIR);
  mkdirSync4(logDir, { recursive: true });
  const engineLog = join6(logDir, ENGINE_LOG_FILE);
  const fd = openSync(engineLog, "a");
  const args = ["-u", "main.py", "--port", String(eng.port), ...eng.launch_extra ?? []];
  let spawnError = null;
  const child = spawn3(python, args, {
    cwd: eng.comfyui_dir,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: process.env
  });
  child.on("error", (e) => {
    spawnError = e.message;
  });
  child.unref();
  if (child.pid !== void 0) writeFileSync4(join6(logDir, ENGINE_PID_FILE), `${child.pid}
`);
  const startedAt = Date.now();
  log(`\u5F15\u64CE\u8FDB\u7A0B pid=${child.pid ?? "?"}\uFF0C\u65E5\u5FD7 logs/engine.log\uFF0C\u7B49\u5F85\u5C31\u7EEA...`);
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (spawnError !== null) {
      throw new DaoyanCliError({
        code: "engine_start_failed",
        message: `\u5F15\u64CE\u8FDB\u7A0B\u542F\u52A8\u5931\u8D25\uFF1A${spawnError}\uFF08python=${python}\uFF09`
      });
    }
    if (await reachable(client)) return client;
    if (child.pid !== void 0 && !pidAlive(child.pid) && Date.now() - startedAt > 2e4) {
      throw new DaoyanCliError({
        code: "engine_start_failed",
        message: "\u5F15\u64CE\u8FDB\u7A0B\u63D0\u524D\u9000\u51FA\uFF0C\u65E5\u5FD7\u5C3E\uFF08logs/engine.log\uFF09\uFF1A\n" + tailFile(engineLog, 5)
      });
    }
    await sleep(READY_INTERVAL_MS);
  }
  throw new DaoyanCliError({
    code: "engine_start_failed",
    message: `\u5F15\u64CE ${READY_TIMEOUT_MS / 1e3}s \u5185\u672A\u5C31\u7EEA\uFF0C\u67E5\u770B logs/engine.log`
  });
}
async function reachable(client) {
  try {
    await withTimeout(client.systemStats(), PROBE_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}
function tailFile(file, lines) {
  if (!existsSync6(file)) return "(\u6587\u4EF6\u4E0D\u5B58\u5728)";
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return "(\u4E0D\u53EF\u8BFB)";
  }
  const window = Math.min(size, Math.max(lines * 400 + 65536, 0));
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
  }
  return buf.toString("utf8").split(/[\r\n]+/).filter((l) => l !== "").slice(-lines).join("\n");
}

// src/core/pipeline/generate.mts
import { createHash } from "crypto";
import {
  copyFileSync as copyFileSync2,
  existsSync as existsSync7,
  mkdirSync as mkdirSync5,
  readFileSync as readFileSync6,
  readdirSync as readdirSync2,
  statSync as statSync2,
  writeFileSync as writeFileSync5
} from "fs";
import { basename, join as join7 } from "path";

// src/core/media/ffmpeg.mts
import { spawn as spawn4 } from "child_process";
function run(argv) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn4(argv[0] ?? "", argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `\u7F3A\u5C11\u5916\u90E8\u5DE5\u5177 ${argv[0]}\uFF1A${e.message}` })
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolvePromise(out);
      else rejectPromise(new Error(`${argv[0]} \u9000\u51FA\u7801 ${code}\uFF1A${err.slice(0, 500)}`));
    });
  });
}
async function countFrames(video) {
  const out = await run([
    "ffprobe",
    "-v",
    "error",
    "-count_frames",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=nb_read_frames",
    "-of",
    "csv=p=0",
    video
  ]);
  const n = Number.parseInt((out.trim().split("\n")[0] ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) throw new Error(`\u89C6\u9891\u6CA1\u6709\u5E27\uFF1A${video}`);
  return n;
}
async function extractLastFrame(video, outPng) {
  const n = await countFrames(video);
  await run([
    "ffmpeg",
    "-y",
    "-v",
    "error",
    "-i",
    video,
    "-vf",
    `select=eq(n\\,${n - 1})`,
    "-frames:v",
    "1",
    outPng
  ]);
}

// src/core/pipeline/generate.mts
var POLL_INTERVAL_MS = 15e3;
var HEARTBEAT_MS = 6e4;
var DEFAULT_TIMEOUT_MS = 3 * 60 * 60 * 1e3;
var VIDEO_RE = /\.(mp4|webm|mkv|mov|gif)$/i;
function engineOutputDir(root, cfg) {
  if (cfg.engine.mode !== "local") return null;
  return join7(cfg.engine.comfyui_dir, "output");
}
function engineInputDir(cfg) {
  if (cfg.engine.mode !== "local") {
    throw new DaoyanCliError({ code: "not_implemented", message: "remote \u6A21\u5F0F\u7684\u9996\u5E27\u4E0A\u4F20\u5728 M2 \u4EA4\u4ED8" });
  }
  return join7(cfg.engine.comfyui_dir, "input");
}
function ensureInputCopy(src, cfg, name) {
  const dst = join7(engineInputDir(cfg), name);
  mkdirSync5(engineInputDir(cfg), { recursive: true });
  let need = true;
  if (existsSync7(dst)) {
    try {
      need = statSync2(dst).mtimeMs < statSync2(src).mtimeMs;
    } catch {
      need = true;
    }
  }
  if (need) copyFileSync2(src, dst);
}
function walkFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync2(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = join7(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else if (e.isFile()) acc.push(p);
  }
  return acc;
}
function findClip(root, cfg, shot) {
  const out = engineOutputDir(root, cfg);
  if (out === null) return null;
  const dir = join7(out, cfg.output_prefix);
  if (!existsSync7(dir)) return null;
  const namePrefix = `${shot.id}_${shot.slug}`;
  let best = null;
  for (const f of walkFiles(dir)) {
    const b = basename(f);
    if (!b.startsWith(namePrefix) || !VIDEO_RE.test(b)) continue;
    const m = statSync2(f).mtimeMs;
    if (best === null || m > best.m) best = { p: f, m };
  }
  return best?.p ?? null;
}
async function resolveFirstFrame(root, cfg, shots, shot, log) {
  const ff = shot.first_frame;
  if (ff === void 0) {
    log(`\u955C ${shot.id}\uFF1A\u7EAF\u6587\u751F\uFF08T2V\uFF09\uFF0C\u65E0\u9996\u5E27\u6CE8\u5165`);
    return { kind: "t2v" };
  }
  if (typeof ff === "string") {
    const rel = shots.meta.anchors[ff];
    if (rel === void 0) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `\u955C ${shot.id} \u7684 first_frame \u5F15\u7528\u4E86\u672A\u77E5\u951A\u70B9 key "${ff}"\uFF08meta.anchors \u4E2D\u4E0D\u5B58\u5728\uFF09`
      });
    }
    const src = join7(root, rel);
    if (!existsSync7(src)) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `\u951A\u70B9\u56FE\u7247\u4E0D\u5B58\u5728\uFF1A${src}`,
        details: { key: ff, path: src }
      });
    }
    const inputName2 = `anchor_${ff}_${shot.id}${extOf(src)}`;
    ensureInputCopy(src, cfg, inputName2);
    log(`\u955C ${shot.id}\uFF1A\u9996\u5E27\u6CE8\u5165\uFF08\u951A\u70B9 ${ff}\uFF09`);
    return { kind: "anchor", inputName: inputName2, source: ff };
  }
  const upstream = shots.shots.find((s) => s.id === ff.relay);
  if (upstream === void 0) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `\u955C ${shot.id} \u63A5\u529B\u7684\u4E0A\u6E38\u955C\u53F7 ${ff.relay} \u4E0D\u5B58\u5728\u4E8E\u5206\u955C\u8868`
    });
  }
  const clip = findClip(root, cfg, upstream);
  if (clip === null) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `\u955C ${shot.id} \u63A5\u529B\u7684\u4E0A\u6E38 ${upstream.id} \u5C1A\u65E0\u6210\u7247\uFF0C\u8BF7\u5148\u62CD\u6444\uFF1Adaoyan shot ${upstream.id}`
    });
  }
  const relayDir = join7(root, "relay_frames");
  mkdirSync5(relayDir, { recursive: true });
  const relayPng = join7(relayDir, `relay_${upstream.id}_to_${shot.id}.png`);
  let needExtract = true;
  if (existsSync7(relayPng)) {
    try {
      needExtract = statSync2(relayPng).mtimeMs < statSync2(clip).mtimeMs;
    } catch {
      needExtract = true;
    }
  }
  if (needExtract) {
    log(`\u955C ${shot.id}\uFF1A\u62BD\u53D6\u4E0A\u6E38 ${upstream.id} \u5C3E\u5E27\uFF08\u63A5\u529B\uFF09`);
    const n = await countFrames(clip);
    if (n < 1) throw new DaoyanCliError({ code: "shot_failed", message: `\u4E0A\u6E38\u6210\u7247\u65E0\u5E27\uFF1A${clip}` });
    await extractLastFrame(clip, relayPng);
  } else {
    log(`\u955C ${shot.id}\uFF1A\u63A5\u529B\u5E27\u7F13\u5B58\u547D\u4E2D\uFF08relay_frames/\uFF09`);
  }
  const inputName = `relay_${upstream.id}_${shot.id}.png`;
  ensureInputCopy(relayPng, cfg, inputName);
  return { kind: "relay", inputName, source: upstream.id };
}
function extOf(p) {
  const b = basename(p);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i) : ".png";
}
function buildWorkflow(root, cfg, shots, shot, firstFrame, stepsOverride) {
  const tplFile = join7(root, cfg.workflow);
  let wf;
  try {
    wf = JSON.parse(readFileSync6(tplFile, "utf8"));
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `workflow \u6A21\u677F\u4E0D\u53EF\u8BFB\uFF1A${tplFile}\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`
    });
  }
  const node = (key) => {
    const n = wf[key];
    if (typeof n !== "object" || n === null) {
      throw new DaoyanCliError({
        code: "config_invalid",
        message: `workflow \u6A21\u677F\u7F3A\u5C11\u7EA6\u5B9A\u7684\u8282\u70B9\u952E "${key}"\uFF08\u547D\u540D\u7EA6\u5B9A\u89C1 docs/DATA-MODEL.md\uFF09`
      });
    }
    return n;
  };
  const inputsOf = (n) => {
    const i = n.inputs;
    if (typeof i !== "object" || i === null) {
      throw new DaoyanCliError({ code: "config_invalid", message: "workflow \u8282\u70B9\u7F3A\u5C11 inputs \u5BF9\u8C61" });
    }
    return i;
  };
  const d = shots.defaults;
  const neg = inputsOf(node("4_negative"));
  neg.text = d.negative;
  const cond = inputsOf(node("5_cond"));
  cond.prompt = shots.style_prefix !== "" ? `${shots.style_prefix}\u3002${shot.prompt}` : shot.prompt;
  cond.width = shots.meta.width;
  cond.height = shots.meta.height;
  cond.length = shot.length ?? d.length;
  if (firstFrame?.inputName !== void 0) {
    wf["0_load"] = { class_type: "LoadImage", inputs: { image: firstFrame.inputName } };
    cond.first_frame = ["0_load", 0];
  }
  const shift = inputsOf(node("6_shift"));
  shift.shift_video = d.shift_video;
  shift.shift_audio = d.shift_audio;
  const sample = inputsOf(node("7_sample"));
  sample.seed = shot.seed;
  sample.steps = stepsOverride ?? shot.steps ?? d.steps;
  sample.cfg = shot.cfg ?? d.cfg;
  sample.sampler_name = d.sampler_name;
  sample.scheduler = d.scheduler;
  const save = inputsOf(node("9_save"));
  save.filename_prefix = `${cfg.output_prefix}${shot.id}_${shot.slug}`;
  return wf;
}
function collectOutputs(entryOutputs) {
  const files = [];
  for (const nodeOutputs of Object.values(entryOutputs)) {
    for (const [k, v] of Object.entries(nodeOutputs)) {
      if (k !== "videos" && k !== "gifs" && k !== "images") continue;
      if (!Array.isArray(v)) continue;
      for (const item of v) {
        const it = item;
        if (typeof it?.filename === "string" && it.filename !== "") {
          files.push({ filename: it.filename, subfolder: it.subfolder ?? "" });
        }
      }
    }
  }
  return files;
}
async function generateShot(opts) {
  const { root, cfg, shots, shot, client, log } = opts;
  const wf = buildWorkflow(root, cfg, shots, shot, opts.firstFrame, opts.stepsOverride);
  const started = /* @__PURE__ */ new Date();
  const receipt = await client.submit(wf);
  if (receipt.node_errors !== void 0 && Object.keys(receipt.node_errors).length > 0) {
    throw new DaoyanCliError({
      code: "shot_failed",
      message: "\u5F15\u64CE\u62D2\u7EDD workflow\uFF08node_errors\uFF09\uFF0C\u89C1 details",
      details: { node_errors: receipt.node_errors }
    });
  }
  const pid = receipt.prompt_id;
  log(`\u955C ${shot.id} \u5DF2\u63D0\u4EA4\uFF08prompt ${pid.slice(0, 8)}\u2026\uFF09\uFF0C\u8F6E\u8BE2\u4E2D...`);
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeout;
  let lastBeat = Date.now();
  for (; ; ) {
    if (Date.now() > deadline) {
      throw new DaoyanCliError({
        code: "shot_timeout",
        message: `\u955C ${shot.id} \u7B49\u5F85\u8D85\u65F6\uFF08${Math.round(timeout / 6e4)} \u5206\u949F\uFF09`,
        details: { prompt_id: pid }
      });
    }
    let entry;
    try {
      const hist = await client.history(pid);
      entry = hist[pid];
    } catch {
      entry = void 0;
    }
    if (entry !== void 0) {
      const statusStr = entry.status?.status_str;
      if (statusStr === "error" || statusStr === "cancelled") {
        throw new DaoyanCliError({
          code: "shot_failed",
          message: `\u955C ${shot.id} \u751F\u6210\u5931\u8D25\uFF08\u5F15\u64CE ${statusStr}\uFF09`,
          details: { status: entry.status ?? {} }
        });
      }
      const outputs = entry.outputs ?? {};
      if ((entry.status?.completed ?? false) || Object.keys(outputs).length > 0) {
        const files = collectOutputs(outputs);
        const first = files[0];
        if (first === void 0) {
          throw new DaoyanCliError({
            code: "shot_failed",
            message: `\u955C ${shot.id}\uFF1Ahistory \u6807\u8BB0\u5B8C\u6210\u4F46\u6CA1\u6709\u8F93\u51FA\u6587\u4EF6\uFF08prompt ${pid.slice(0, 8)}\u2026\uFF09`
          });
        }
        const outDir = engineOutputDir(root, cfg);
        if (outDir === null) {
          throw new DaoyanCliError({ code: "not_implemented", message: "remote \u6A21\u5F0F\u4EA7\u7269\u843D\u4F4D\u5728 M2 \u4EA4\u4ED8" });
        }
        const output = join7(outDir, first.subfolder, first.filename);
        const seconds = Math.round((Date.now() - started.getTime()) / 1e3);
        writeManifest(root, cfg, shots, shot, wf, { pid, output, started, seconds });
        return { shotId: shot.id, output, seconds, promptId: pid };
      }
    }
    if (Date.now() - lastBeat >= HEARTBEAT_MS) {
      const min = Math.round((Date.now() - started.getTime()) / 6e4);
      log(`\u955C ${shot.id} \u8FDB\u884C\u4E2D... \u5DF2 ${min} \u5206\u949F`);
      lastBeat = Date.now();
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}
function writeManifest(root, cfg, shots, shot, wf, meta) {
  const dir = join7(root, MANIFESTS_DIR);
  mkdirSync5(dir, { recursive: true });
  let shotsHash = "";
  try {
    shotsHash = sha256File(join7(root, SHOTS_FILE));
  } catch {
    shotsHash = "";
  }
  const manifest = {
    shot: shot.id,
    prompt_id: meta.pid,
    shots_hash: shotsHash,
    workflow_hash: sha256(JSON.stringify(wf)),
    seed: shot.seed,
    steps: shot.steps ?? shots.defaults.steps,
    models: cfg.models,
    engine: {
      mode: cfg.engine.mode,
      version: cfg.engine.mode === "local" ? cfg.engine.version ?? null : null,
      base: cfg.engine.url ?? `${cfg.engine.host}:${cfg.engine.port}`
    },
    started: meta.started.toISOString(),
    seconds: meta.seconds,
    output: meta.output
  };
  writeFileSync5(join7(dir, `${shot.id}.json`), JSON.stringify(manifest, null, 2) + "\n");
}
function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}
function sha256File(f) {
  return createHash("sha256").update(readFileSync6(f)).digest("hex");
}

// src/commands/shot.mts
function parseFlags(args) {
  const ids = [];
  const flags = { noEvict: false, noUp: false, force: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === void 0) break;
    if (a === "--force") flags.force = true;
    else if (a === "--no-evict") flags.noEvict = true;
    else if (a === "--no-up") flags.noUp = true;
    else if (a === "--steps") {
      const v = args[i + 1];
      if (v === void 0) throw new DaoyanCliError({ code: "usage", message: "--steps \u9700\u8981\u6570\u503C", exit: 2 });
      flags.steps = Number(v);
      i++;
    } else if (a === "--timeout") {
      const v = args[i + 1];
      if (v === void 0) throw new DaoyanCliError({ code: "usage", message: "--timeout \u9700\u8981\u5C0F\u65F6\u6570", exit: 2 });
      flags.timeoutHours = Number(v);
      i++;
    } else if (a.startsWith("-")) {
      throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u53C2\u6570 ${a}`, exit: 2 });
    } else ids.push(a);
  }
  if (ids.length === 0) throw new DaoyanCliError({ code: "usage", message: "\u7F3A\u5C11\u955C\u53F7\uFF0C\u5982 daoyan shot 01 02", exit: 2 });
  return { ids, flags };
}
async function runShot(ctx2, args, presetForce = false) {
  const { ids, flags } = parseFlags(args);
  const force = presetForce || flags.force;
  const found = projectFromContext(ctx2);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "\u672A\u627E\u5230 project.json\uFF08\u81EA\u5F53\u524D\u4F4D\u7F6E\u5411\u4E0A\u5BFB\u627E\uFF09\u3002\u7528 --project \u6307\u5B9A\u6216\u5728\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C" });
  }
  const { root, config: cfg } = found;
  attachFileSink(join8(root, LOG_DIR, TOOL_LOG_FILE));
  const shots = loadShotsFile(root);
  if (cfg.engine.mode === "remote") {
    throw new DaoyanCliError({
      code: "not_implemented",
      message: "remote \u6A21\u5F0F\u7684\u751F\u6210\uFF08\u9996\u5E27\u4E0A\u4F20 / \u4EA7\u7269\u843D\u4F4D\uFF09\u5728 M2 \u4EA4\u4ED8\uFF1B\u5F53\u524D\u8BF7\u7528 local \u6A21\u5F0F"
    });
  }
  const targets = [];
  for (const id of ids) {
    const s = shots.shots.find((x) => x.id === id);
    if (s === void 0) {
      throw new DaoyanCliError({
        code: "usage",
        message: `\u672A\u77E5\u955C\u53F7 ${id}\uFF1B\u53EF\u7528\uFF1A${shots.shots.map((x) => x.id).join(" ")}`,
        exit: 2
      });
    }
    targets.push(s);
  }
  const lockPath = join8(root, LOG_DIR, TASK_LOCK_FILE);
  acquireLock(lockPath, `shot ${ids.join(" ")}`);
  const results = [];
  const skipped = [];
  const failed = [];
  try {
    let client = clientFromEngine(cfg.engine);
    if (!flags.noUp) {
      client = await ensureEngine(root, cfg, say);
    }
    const running = await client.queueRunningLen();
    if (running !== null && running > 0) {
      throw new DaoyanCliError({
        code: "engine_busy",
        message: `\u5F15\u64CE\u961F\u5217\u5DF2\u6709 ${running} \u4E2A\u6267\u884C\u4E2D\u4EFB\u52A1\uFF08\u53EF\u80FD\u6765\u81EA\u7F51\u9875\u6216\u5176\u4ED6\u63D0\u4EA4\uFF09\uFF0C\u62D2\u7EDD\u5E76\u884C`
      });
    }
    for (const shot of targets) {
      const existing = findClip(root, cfg, shot);
      if (existing !== null && !force) {
        say(`\u955C ${shot.id} \u5DF2\u6709\u4EA7\u7269\uFF0C\u8DF3\u8FC7\uFF08\u91CD\u62CD\u7528 retake\uFF09\uFF1A${existing}`);
        skipped.push(shot.id);
        continue;
      }
      try {
        const genLog = genLogPath(root, shot.id);
        const log = (m) => {
          say(m);
          try {
            appendFileSync2(genLog, `[${(/* @__PURE__ */ new Date()).toTimeString().slice(0, 8)}] ${m}
`);
          } catch {
          }
        };
        const ff = await resolveFirstFrame(root, cfg, shots, shot, log);
        const r = await generateShot({
          root,
          cfg,
          shots,
          shot,
          client,
          log,
          firstFrame: ff,
          stepsOverride: flags.steps,
          timeoutMs: flags.timeoutHours !== void 0 ? flags.timeoutHours * 36e5 : void 0
        });
        results.push(r);
        say(`\u955C ${shot.id} \u5B8C\u6210\uFF08${r.seconds}s\uFF09\uFF1A${r.output}`);
      } catch (e) {
        if (e instanceof DaoyanCliError) {
          failed.push({ id: shot.id, code: e.code, error: e.message });
          say(`\u955C ${shot.id} \u5931\u8D25[${e.code}]\uFF1A${e.message}`);
        } else {
          failed.push({ id: shot.id, code: "shot_failed", error: e instanceof Error ? e.message : String(e) });
          say(`\u955C ${shot.id} \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } finally {
    releaseLock(lockPath);
  }
  if (failed.length > 0) {
    throw new DaoyanCliError({
      code: "shot_failed",
      message: `\u5B8C\u6210 ${results.length}\uFF0C\u8DF3\u8FC7 ${skipped.length}\uFF0C\u5931\u8D25 ${failed.length}\uFF1A${failed.map((f) => f.id).join(" ")}`,
      details: { done: results, skipped, failed }
    });
  }
  if (ctx2.json) {
    emitData({ done: results, skipped });
    return;
  }
  say(`\u5168\u90E8\u5B8C\u6210\uFF1A${results.map((r) => r.shotId).join(" ") || "\uFF08\u65E0\u65B0\u62CD\uFF09"}`);
}
function genLogPath(root, id) {
  const dir = join8(root, LOG_DIR);
  mkdirSync6(dir, { recursive: true });
  const ts2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return join8(dir, `gen_${id}_${ts2}.log`);
}

// src/commands/wrap.mts
import { mkdirSync as mkdirSync7, writeFileSync as writeFileSync6 } from "fs";
import { join as join9 } from "path";
async function runWrap(ctx2) {
  const found = projectFromContext(ctx2);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "\u672A\u627E\u5230 project.json\uFF1B\u7528 --project \u6307\u5B9A\u6216\u5728\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C" });
  }
  const { root, config: cfg } = found;
  attachFileSink(join9(root, LOG_DIR, TOOL_LOG_FILE));
  const shots = loadShotsFile(root);
  if (cfg.engine.mode === "remote") {
    throw new DaoyanCliError({ code: "not_implemented", message: "remote \u6A21\u5F0F\u7684\u4EA7\u7269\u62C9\u53D6\u5728 M2 \u4EA4\u4ED8\uFF0Cwrap \u6682\u4EC5\u652F\u6301 local \u6A21\u5F0F" });
  }
  const clips = [];
  const missing = [];
  for (const s of shots.shots) {
    const p = findClip(root, cfg, s);
    if (p !== null) clips.push(p);
    else missing.push(s.id);
  }
  if (clips.length < 2) {
    throw new DaoyanCliError({
      code: "wrap_failed",
      message: `\u53EF\u7528\u4E8E\u5408\u7247\u7684\u955C\u5934\u4E0D\u8DB3 2 \u6BB5\uFF08\u5F53\u524D ${clips.length}/${shots.shots.length}\uFF1B\u7F3A ${missing.join(" ") || "\u65E0"}\uFF09\u3002\u5148\u5B8C\u6210\u62CD\u6444\uFF1Adaoyan batch/shot`
    });
  }
  const finalDir = join9(root, "final");
  mkdirSync7(finalDir, { recursive: true });
  const prefixName = cfg.output_prefix.replace(/\/+$/, "") || "drama";
  const outPath = join9(finalDir, `${prefixName}.mp4`);
  const listFile = join9(root, "concat_list.txt");
  writeFileSync6(listFile, clips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  say(`\u5408\u7247 ${clips.length} \u6BB5 \u2192 ${outPath}\uFF08libx264 / crf18 / faststart\uFF09...`);
  const r = await execCapture("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    outPath
  ]);
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "wrap_failed",
      message: `ffmpeg \u9000\u51FA\u7801 ${r.code}\uFF1A${r.stderr.slice(-500)}`
    });
  }
  if (missing.length > 0) say(`\u6CE8\u610F\uFF1A\u6709 ${missing.length} \u955C\u672A\u5B8C\u6210\u672A\u7EB3\u5165\uFF08${missing.join(" ")}\uFF09`);
  say(`\u5408\u7247\u5B8C\u6210\uFF1A${outPath}`);
  if (ctx2.json) {
    emitData({ output: outPath, clips, missing });
  }
}

// src/commands/logs.mts
import { existsSync as existsSync8, openSync as openSync2, readSync as readSync2, statSync as statSync3, closeSync as closeSync2 } from "fs";
import { join as join10 } from "path";
var ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
var TQDM_RE = /^\s*\d+%.{0,40}\|\s*(\d+)\/(\d+) \[/;
function parseArgs2(args) {
  const out = { follow: false, n: 100, src: "all" };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === void 0) break;
    if (a === "-f" || a === "--follow") out.follow = true;
    else if (a === "-n") {
      const v = args[i + 1];
      if (v === void 0 || !/^\d+$/.test(v)) {
        throw new DaoyanCliError({ code: "usage", message: "-n \u9700\u8981\u884C\u6570", exit: 2 });
      }
      out.n = Number(v);
      i++;
    } else if (a === "--src") {
      const v = args[i + 1];
      if (v !== "daoyan-cli" && v !== "engine" && v !== "all") {
        throw new DaoyanCliError({ code: "usage", message: `--src \u4EC5\u63A5\u53D7 daoyan-cli|engine|all\uFF08\u6536\u5230 ${v ?? "\u7A7A"}\uFF09`, exit: 2 });
      }
      out.src = v;
      i++;
    } else throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u53C2\u6570 ${a}`, exit: 2 });
  }
  return out;
}
function sources(root, src) {
  const all = [
    { name: "daoyan-cli", file: join10(root, LOG_DIR, TOOL_LOG_FILE) },
    { name: "engine", file: join10(root, LOG_DIR, ENGINE_LOG_FILE) }
  ];
  return src === "all" ? all : all.filter((s) => s.name === src);
}
function cleanLines(raw) {
  const lines = raw.replace(ANSI_RE, "").split(/[\r\n]+/).filter((l) => l !== "");
  const out = [];
  let lastKey = null;
  for (const l of lines) {
    const m = TQDM_RE.exec(l);
    if (m !== null) {
      const key = `${m[1]}/${m[2]}`;
      if (key === lastKey && out.length > 0) {
        out[out.length - 1] = l;
        continue;
      }
      lastKey = key;
      out.push(l);
      continue;
    }
    lastKey = null;
    out.push(l);
  }
  return out;
}
function readTail(file, n) {
  if (!existsSync8(file)) return [];
  let size = 0;
  try {
    size = statSync3(file).size;
  } catch {
    return [];
  }
  const window = Math.min(size, n * 400 + 65536);
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync2(file, "r");
    readSync2(fd, buf, 0, window, size - window);
    closeSync2(fd);
  } catch {
  }
  return cleanLines(buf.toString("utf8").replace(/\ufffd/g, "")).slice(-n);
}
async function runLogs(ctx2, args) {
  const { follow, n, src } = parseArgs2(args);
  const found = projectFromContext(ctx2);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "\u672A\u627E\u5230 project.json\uFF1B\u7528 --project \u6307\u5B9A\u6216\u5728\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C" });
  }
  const files = sources(found.root, src);
  const existing = files.filter((s) => existsSync8(s.file));
  if (existing.length === 0) {
    const names = files.map((s) => s.file).join("\u3001");
    if (ctx2.json) {
      emitData({ sources: {}, note: "\u6682\u65E0\u65E5\u5FD7\u6587\u4EF6" });
      return;
    }
    process.stdout.write(`\u6682\u65E0\u65E5\u5FD7\u6587\u4EF6\uFF08${names}\uFF09\u3002\u8FD0\u884C\u8FC7 shot/status \u540E\u624D\u4F1A\u4EA7\u751F\u3002
`);
    return;
  }
  if (!follow) {
    const data = {};
    for (const s of existing) {
      const lines = readTail(s.file, n);
      data[s.name] = lines;
      if (!ctx2.json) {
        for (const l of lines) process.stdout.write(`${l}
`);
      }
    }
    if (ctx2.json) emitData({ sources: data });
    return;
  }
  const offsets = /* @__PURE__ */ new Map();
  for (const s of existing) {
    const tail = readTail(s.file, n);
    for (const l of tail) process.stdout.write(`${l}
`);
    offsets.set(s.file, statSync3(s.file).size);
  }
  for (; ; ) {
    await new Promise((r) => setTimeout(r, 500));
    for (const s of existing) {
      if (!existsSync8(s.file)) continue;
      let size = 0;
      try {
        size = statSync3(s.file).size;
      } catch {
        continue;
      }
      const prev = offsets.get(s.file) ?? 0;
      if (size === prev) continue;
      if (size < prev) {
        offsets.set(s.file, 0);
        continue;
      }
      const chunk = Buffer.alloc(size - prev);
      try {
        const fd = openSync2(s.file, "r");
        readSync2(fd, chunk, 0, size - prev, prev);
        closeSync2(fd);
      } catch {
        continue;
      }
      for (const l of cleanLines(chunk.toString("utf8").replace(/\ufffd/g, ""))) {
        process.stdout.write(`${l}
`);
      }
      offsets.set(s.file, size);
    }
  }
}

// src/commands/status.mts
import { join as join12 } from "path";

// src/core/obs/collect.mts
import { existsSync as existsSync9, readFileSync as readFileSync7, readdirSync as readdirSync3 } from "fs";
import { join as join11 } from "path";
async function collectStatus(root, cfg, shots) {
  const probe = await probeEngine(root, cfg);
  let running = null;
  let pending = null;
  if (probe.up) {
    try {
      const q = await clientFromEngine(cfg.engine).queue();
      running = q.queue_running.length;
      pending = q.queue_pending.length;
    } catch {
    }
  }
  const lockInfo = readLock(join11(root, LOG_DIR, TASK_LOCK_FILE));
  const task = lockInfo !== null && !lockInfo.stale ? { desc: lockInfo.desc, pid: lockInfo.pid, started: lockInfo.started } : null;
  const shotList = shots.shots.map((s) => {
    if (cfg.engine.mode === "local") {
      const p = findClip(root, cfg, s);
      return { id: s.id, slug: s.slug, done: p !== null, path: p };
    }
    const m = join11(root, MANIFESTS_DIR, `${s.id}.json`);
    return { id: s.id, slug: s.slug, done: existsSync9(m), path: null };
  });
  return {
    engine: { up: probe.up, mode: cfg.engine.mode, pid: probe.pid, server: probe.baseUrl },
    queue: { running, pending },
    task,
    gpu: await gpuSummary(),
    mem: memSummary(),
    shots: shotList
  };
}
async function gpuSummary() {
  const r = await tryExecCapture(
    "nvidia-smi",
    ["--query-gpu=memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
    { timeoutMs: 1e4 }
  );
  if (r === null || r.code !== 0) {
    return { error: r === null ? "nvidia-smi \u4E0D\u53EF\u7528" : `nvidia-smi \u9000\u51FA\u7801 ${r.code}` };
  }
  const parts = r.stdout.trim().split("\n")[0]?.split(",").map((x) => x.trim()) ?? [];
  const used = Number(parts[0]);
  const total = Number(parts[1]);
  const util = Number(parts[2]);
  if (!Number.isFinite(used) || !Number.isFinite(total)) return { error: "nvidia-smi \u8F93\u51FA\u65E0\u6CD5\u89E3\u6790" };
  return {
    usedMib: used,
    totalMib: total,
    utilPct: Number.isFinite(util) ? util : void 0
  };
}
function memSummary() {
  try {
    const txt = readFileSync7("/proc/meminfo", "utf8");
    const get = (key) => {
      const m = new RegExp(`^${key}:\\s+(\\d+) kB`, "m").exec(txt);
      return m !== null ? Number(m[1]) / 1048576 : void 0;
    };
    const total = get("MemTotal");
    const avail = get("MemAvailable");
    return total === void 0 ? {} : { totalGb: round1(total), availGb: avail === void 0 ? void 0 : round1(avail) };
  } catch {
    return {};
  }
}
function round1(n) {
  return Math.round(n * 10) / 10;
}

// src/commands/status.mts
async function runStatus(ctx2) {
  const found = projectFromContext(ctx2);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "\u672A\u627E\u5230 project.json\uFF1B\u7528 --project \u6307\u5B9A\u6216\u5728\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C" });
  }
  const { root, config: cfg } = found;
  attachFileSink(join12(root, LOG_DIR, TOOL_LOG_FILE));
  const shots = loadShotsFile(root);
  const data = await collectStatus(root, cfg, shots);
  if (ctx2.json) {
    emitData(data);
    return;
  }
  say(`\u9879\u76EE ${cfg.name} \xB7 \u5F15\u64CE ${data.engine.mode} \u6A21\u5F0F`);
  say(
    `\u5F15\u64CE\uFF1A${data.engine.up ? "\u8FD0\u884C\u4E2D" : "\u672A\u8FD0\u884C"}\uFF08${data.engine.server}${data.engine.pid !== null ? `\uFF0Cpid ${data.engine.pid}` : ""}\uFF09` + (data.queue.running !== null ? ` \xB7 \u961F\u5217 \u6267\u884C\u4E2D ${data.queue.running} / \u7B49\u5F85 ${data.queue.pending ?? 0}` : "")
  );
  say(
    data.task !== null ? `\u4EFB\u52A1\uFF1A${data.task.desc}\uFF08pid ${data.task.pid}\uFF0C\u59CB\u4E8E ${data.task.started}\uFF09` : "\u4EFB\u52A1\uFF1A\u7A7A\u95F2\uFF08\u65E0\u6D3B\u52A8\u4EFB\u52A1\u9501\uFF09"
  );
  if (data.gpu.error !== void 0) say(`GPU\uFF1A${data.gpu.error}`);
  else say(`GPU\uFF1A${data.gpu.usedMib}MiB / ${data.gpu.totalMib}MiB\uFF0C\u5229\u7528\u7387 ${data.gpu.utilPct ?? "?"}%`);
  if (data.mem.totalGb !== void 0) {
    say(`\u5185\u5B58\uFF1A\u53EF\u7528 ${data.mem.availGb ?? "?"}G / \u5171 ${data.mem.totalGb}G`);
  }
  const done = data.shots.filter((s) => s.done).length;
  say(`\u955C\u5934\u8FDB\u5EA6\uFF1A${done}/${data.shots.length}`);
  for (const s of data.shots) {
    say(`  ${s.done ? "\u2705" : "\u2B1C"} ${s.id} ${s.slug}`);
  }
}

// src/commands/engine.mts
import { existsSync as existsSync10, readdirSync as readdirSync4 } from "fs";
import { join as join13, resolve as resolve4 } from "path";
async function comfyTags(limit) {
  try {
    const res = await fetch(COMFY_TAGS_API, {
      headers: { "user-agent": "daoyan-cli-engine", accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15e3)
    });
    if (!res.ok) return [];
    const tags = await res.json();
    return tags.map((t) => t.name ?? "").filter((n) => /^v?\d+\.\d+/.test(n)).slice(0, limit);
  } catch {
    return [];
  }
}
function localVersions(root) {
  const dir = join13(root, "engine", "versions");
  try {
    return readdirSync4(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}
async function runEngine(ctx2, args) {
  const sub = args[0];
  if (sub === void 0) {
    throw new DaoyanCliError({ code: "usage", message: "\u7528\u6CD5\uFF1Adaoyan engine <ls|install|use> ...", exit: 2 });
  }
  const rest = args.slice(1);
  if (sub === "ls") {
    const remote = await comfyTags(15);
    let local = [];
    let current = "";
    const found2 = projectFromContext(ctx2);
    if (found2 !== null) {
      local = localVersions(found2.root);
      current = found2.config.engine.mode === "local" ? found2.config.engine.version ?? "" : "(remote \u6A21\u5F0F)";
    }
    if (ctx2.json) {
      emitData({ local, remote, current });
      return;
    }
    say("\u672C\u5730\u5DF2\u5B89\u88C5\uFF08engine/versions/\uFF09\uFF1A");
    for (const v of local) say(`  ${v}${v === current ? "  \u2190 \u5F53\u524D" : ""}`);
    if (local.length === 0) say("  \uFF08\u65E0\uFF09");
    say("GitHub \u53EF\u7528\u7248\u672C\uFF08\u524D 15\uFF09\uFF1A");
    for (const v of remote) say(`  ${v}`);
    if (remote.length === 0) say("  \uFF08GitHub \u4E0D\u53EF\u8FBE\uFF0C\u4EC5\u663E\u793A\u672C\u5730\uFF09");
    return;
  }
  const found = projectFromContext(ctx2);
  if (found === null) {
    throw new DaoyanCliError({ code: "project_not_found", message: "engine install/use \u9700\u5728\u9879\u76EE\u5185\u8FD0\u884C\uFF08\u672A\u627E\u5230 project.json\uFF09" });
  }
  const { root, config: cfg } = found;
  if (sub === "install") {
    const tag = rest[0];
    if (tag === void 0 || tag === "") {
      throw new DaoyanCliError({ code: "usage", message: "\u7528\u6CD5\uFF1Adaoyan engine install <\u7248\u672C tag>", exit: 2 });
    }
    if (cfg.engine.mode !== "local") {
      throw new DaoyanCliError({ code: "usage", message: "remote \u6A21\u5F0F\u4E0D\u7BA1\u7406\u5F15\u64CE\u5B89\u88C5\uFF08engine.mode=remote\uFF09", exit: 2 });
    }
    const vDir = join13("engine", "versions", tag);
    await createVenv(root, join13(vDir, ".venv"), say);
    await cloneComfyUI(root, join13(vDir, "ComfyUI"), tag, say);
    await pipInstall(root, join13(vDir, ".venv"), void 0, say);
    say(`\u7248\u672C ${tag} \u5B89\u88C5\u5B8C\u6210\uFF08${vDir}\uFF09\u3002\u5207\u6362\u4F7F\u7528\uFF1Adaoyan engine use ${tag}`);
    if (ctx2.json) emitData({ installed: tag, dir: vDir });
    return;
  }
  if (sub === "use") {
    const target = rest[0];
    if (target === void 0 || target === "") {
      throw new DaoyanCliError({ code: "usage", message: "\u7528\u6CD5\uFF1Adaoyan engine use <\u7248\u672C tag|\u8DEF\u5F84>", exit: 2 });
    }
    let comfyDir;
    let venvDir;
    let version;
    const asPath = resolve4(root, target);
    if (existsSync10(join13(asPath, "main.py"))) {
      comfyDir = asPath;
      if (existsSync10(join13(asPath, ".venv", "bin", "python"))) venvDir = join13(asPath, ".venv");
    } else {
      const vDir = join13(root, "engine", "versions", target);
      comfyDir = join13(vDir, "ComfyUI");
      const venv = join13(vDir, ".venv");
      if (!existsSync10(join13(comfyDir, "main.py"))) {
        throw new DaoyanCliError({
          code: "provision_failed",
          message: `\u672A\u627E\u5230\u7248\u672C ${target}\uFF08${comfyDir}\uFF09\u3002\u5148\u5B89\u88C5\uFF1Adaoyan engine install ${target}`
        });
      }
      if (existsSync10(join13(venv, "bin", "python"))) venvDir = venv;
      version = target;
    }
    const prevVenv = cfg.engine.mode === "local" ? cfg.engine.venv_dir : void 0;
    const prevVersion = cfg.engine.mode === "local" ? cfg.engine.version : void 0;
    cfg.engine = {
      mode: "local",
      comfyui_dir: comfyDir,
      venv_dir: venvDir ?? prevVenv ?? join13(comfyDir, ".venv"),
      ...version !== void 0 || prevVersion !== void 0 ? { version: version ?? prevVersion } : {},
      host: cfg.engine.host,
      port: cfg.engine.port
    };
    saveProjectConfig(root, cfg);
    say(`\u5DF2\u5207\u6362\u5F15\u64CE\uFF1A${comfyDir}${venvDir !== void 0 ? `\uFF08venv ${venvDir}\uFF09` : ""}`);
    if (ctx2.json) emitData({ comfyui_dir: comfyDir, venv_dir: venvDir ?? null, version: version ?? null });
    return;
  }
  throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u5B50\u547D\u4EE4 ${sub}\uFF08\u53EF\u7528\uFF1Als / install / use\uFF09`, exit: 2 });
}

// src/commands/registry.mts
function planned(milestone) {
  return (_ctx, _args) => {
    throw new DaoyanCliError({
      code: "not_implemented",
      message: `\u8BE5\u547D\u4EE4\u8BA1\u5212\u5728 ${milestone} \u4EA4\u4ED8\uFF08docs/PLAN.md \xA710 \u91CC\u7A0B\u7891\uFF09\u3002`
    });
  };
}
var COMMANDS = [
  // ---- 项目 ----
  {
    name: "init",
    group: "project",
    summary: "\u7ACB\u9879\uFF1A\u672C\u5730\u88C5\u5F15\u64CE\uFF08venv/clone\uFF09\u6216 --remote \u76F4\u8FDE\u8FDC\u7AEF ComfyUI",
    usage: "daoyan init <\u540D\u79F0> [--version <tag>] [--use-existing <\u8DEF\u5F84>] [--remote <url>] [--mirror <\u955C\u50CF>]",
    detail: [
      "ComfyUI \u662F\u5916\u90E8\u7EC4\u4EF6\uFF1Ainit \u53EA\u7F16\u6392\uFF08clone / \u88C5\u4F9D\u8D56\uFF09\uFF0C\u4E0D\u6346\u7ED1\u3002",
      "--use-existing \u63A5\u7BA1\u65E2\u6709\u5B89\u88C5\uFF0C\u8DF3\u8FC7\u5F15\u64CE\u5B89\u88C5\u6B65\u9AA4\u3002",
      "--remote <url> \u8FDC\u7AEF\u6A21\u5F0F\uFF1A\u4E0D\u5B89\u88C5\u5F15\u64CE\uFF0Cproject.json \u5199 engine.mode=remote \u76F4\u8FDE\u3002"
    ],
    implemented: true,
    run: (ctx2, args) => runInit(ctx2, args)
  },
  {
    name: "validate",
    group: "project",
    summary: "\u9879\u76EE\u89C4\u5219\u5168\u91CF\u6821\u9A8C\uFF08\u63A5\u529B\u95ED\u5408/\u951A\u70B9\u5B58\u5728/\u5C3A\u5BF8 32 \u500D\u6570/seed \u51B2\u7A81\uFF09",
    usage: "daoyan validate [--json]",
    implemented: true,
    run: (ctx2) => runValidate(ctx2)
  },
  // ---- 生产 ----
  {
    name: "shot",
    group: "production",
    summary: "\u62CD\u6307\u5B9A\u955C\u5934\uFF08\u81EA\u52A8 up\u2192\u9996\u5E27\u6CE8\u5165\u2192\u63D0\u4EA4\u2192\u8F6E\u8BE2\u2192\u843D\u4F4D\uFF1B\u5DF2\u6709\u4EA7\u7269\u8DF3\u8FC7\uFF09",
    usage: "daoyan shot <\u955C\u53F7...> [--steps N] [--timeout \u5C0F\u65F6] [--no-evict] [--no-up]",
    detail: ["--no-evict \u5F53\u524D\u4E3A\u9ED8\u8BA4\u884C\u4E3A\uFF08GPU \u7F16\u6392\u672A\u63A5\u5165\uFF0C\u53C2\u6570\u4EC5\u4E3A\u517C\u5BB9\u4FDD\u7559\uFF09\u3002"],
    implemented: true,
    run: (ctx2, args) => runShot(ctx2, args)
  },
  {
    name: "retake",
    group: "production",
    summary: "\u91CD\u62CD\uFF08\u7B49\u4EF7 shot --force\uFF09",
    usage: "daoyan retake <\u955C\u53F7...>",
    implemented: true,
    run: (ctx2, args) => runShot(ctx2, args, true)
  },
  {
    name: "batch",
    group: "production",
    summary: "\u8FDE\u62CD\u5168\u90E8\u672A\u5B8C\u6210\u955C\u5934\uFF08\u65AD\u70B9\u7EED\u8DD1\uFF09",
    usage: "daoyan batch [--no-evict] [--timeout \u5C0F\u65F6]",
    run: planned("M1")
  },
  {
    name: "wrap",
    group: "production",
    summary: "\u6740\u9752\uFF1Affmpeg \u5408\u7247\u4EA4\u4ED8\u5230 final/\uFF08libx264/crf18/faststart\uFF09",
    usage: "daoyan wrap",
    implemented: true,
    run: (ctx2) => runWrap(ctx2)
  },
  // ---- 引擎 ----
  {
    name: "up",
    group: "engine",
    summary: "\u5F15\u64CE\u5C31\u4F4D\uFF08local\uFF1A\u62C9\u8D77\u8FDB\u7A0B+\u5C31\u7EEA\u63A2\u6D4B\uFF1Bshot \u4F1A\u81EA\u52A8\u6267\u884C\uFF09",
    usage: "daoyan up",
    run: planned("M1")
  },
  {
    name: "down",
    group: "engine",
    summary: "\u505C\u6B62\u5F15\u64CE\uFF08local \u6A21\u5F0F\uFF1Bremote \u6A21\u5F0F\u5F15\u64CE\u7531\u8FDC\u7AEF\u7BA1\u7406\uFF0C\u672C\u547D\u4EE4\u4E0D\u9002\u7528\uFF09",
    usage: "daoyan down [--force]",
    run: planned("M1")
  },
  {
    name: "engine ls",
    group: "engine",
    summary: "\u5217\u51FA\u53EF\u7528 ComfyUI \u7248\u672C\uFF08\u672C\u5730 engine/versions/ + GitHub tags\uFF09",
    usage: "daoyan engine ls",
    implemented: true,
    run: (ctx2, args) => runEngine(ctx2, ["ls", ...args])
  },
  {
    name: "engine install",
    group: "engine",
    summary: "\u5B89\u88C5\u6307\u5B9A\u7248\u672C\u7684 ComfyUI\uFF08\u5916\u90E8\u7EC4\u4EF6\uFF0Clocal \u6A21\u5F0F\uFF09",
    usage: "daoyan engine install <\u7248\u672C tag>",
    implemented: true,
    run: (ctx2, args) => runEngine(ctx2, ["install", ...args])
  },
  {
    name: "engine use",
    group: "engine",
    summary: "\u5207\u6362\u9879\u76EE\u4F7F\u7528\u7684 ComfyUI \u7248\u672C\uFF08local \u6A21\u5F0F\uFF09",
    usage: "daoyan engine use <\u7248\u672C tag|\u8DEF\u5F84>",
    implemented: true,
    run: (ctx2, args) => runEngine(ctx2, ["use", ...args])
  },
  // ---- 运维 ----
  {
    name: "status",
    group: "ops",
    summary: "\u573A\u8BB0\u6C47\u62A5\uFF1A\u5F15\u64CE/\u961F\u5217/\u4EFB\u52A1\u9501/GPU/\u5185\u5B58/\u955C\u5934\u5B8C\u6210\u5EA6",
    usage: "daoyan status [--json]",
    implemented: true,
    run: (ctx2) => runStatus(ctx2)
  },
  {
    name: "logs",
    group: "ops",
    summary: "\u67E5\u770B\u65E5\u5FD7\uFF08docker logs \u8BED\u4E49\uFF0C-f \u8DDF\u968F\uFF1B\u6E05\u6D17 ANSI \u4E0E tqdm \u5237\u5C4F\uFF09",
    usage: "daoyan logs [-f] [-n N] [--src daoyan-cli|engine|all]",
    implemented: true,
    run: (ctx2, args) => runLogs(ctx2, args)
  },
  {
    name: "list",
    group: "ops",
    summary: "\u6253\u5370\u5206\u955C\u8868",
    usage: "daoyan list [--json]",
    run: planned("M1")
  },
  {
    name: "doctor",
    group: "ops",
    summary: "\u73AF\u5883\u81EA\u68C0\uFF08local\uFF1A\u5F15\u64CE/venv/\u6A21\u578B/ffmpeg\uFF1Bremote\uFF1A\u8FDE\u901A/\u8282\u70B9/\u6A21\u578B\u53EF\u89C1\u6027\uFF09",
    usage: "daoyan doctor [--json]",
    run: planned("M1")
  },
  {
    name: "gpu status",
    group: "ops",
    summary: "GPU \u4E0E\u5BB9\u5668\u6A21\u578B\u5360\u7528\u4E00\u89C8",
    usage: "daoyan gpu status",
    run: planned("M1")
  },
  {
    name: "gpu evict",
    group: "ops",
    summary: "\u624B\u52A8\u5F39\u51FA\u5BB9\u5668\u6A21\u578B\uFF08\u901A\u5E38\u7531 shot \u81EA\u52A8\u6267\u884C\uFF09",
    usage: "daoyan gpu evict",
    run: planned("M1")
  },
  {
    name: "gpu restore",
    group: "ops",
    summary: "\u6062\u590D\u88AB\u5F39\u51FA\u7684\u5BB9\u5668\u6A21\u578B",
    usage: "daoyan gpu restore",
    run: planned("M1")
  },
  // ---- 元 ----
  {
    name: "help",
    group: "meta",
    summary: "\u5E2E\u52A9\u4E0E agent \u81EA\u63CF\u8FF0\uFF1Ahelp [\u547D\u4EE4]\uFF1B--json \u8F93\u51FA\u547D\u4EE4\u6811/\u4FE1\u5C01/\u9519\u8BEF\u7801",
    usage: "daoyan help [\u547D\u4EE4] [--json]",
    implemented: true,
    run: (ctx2, args) => runHelp(ctx2, args, COMMANDS, VERSION)
  },
  {
    name: "update",
    group: "meta",
    summary: "\u81EA\u5347\u7EA7\uFF08\u68C0\u6D4B GitHub \u6700\u65B0 tag\uFF1B--check \u4EC5\u68C0\u6D4B\uFF09",
    usage: "daoyan update [--check]",
    implemented: true,
    run: (ctx2, args) => runUpdate(ctx2, args)
  }
];
function findCommand(name, args) {
  if (args.length > 0) {
    const sub = COMMANDS.find((c) => c.name === `${name} ${args[0]}`);
    if (sub) return { meta: sub, rest: args.slice(1) };
  }
  const main2 = COMMANDS.find((c) => c.name === name);
  return main2 ? { meta: main2, rest: [...args] } : null;
}

// src/cli.mts
async function main(ctx2, argv) {
  const rest = [];
  let sawCommand = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === void 0) break;
    if (a === "--json") {
      ctx2.json = true;
      continue;
    }
    if (a === "--no-color") {
      ctx2.noColor = true;
      continue;
    }
    if (a === "--project") {
      const v = argv[i + 1];
      if (v === void 0 || v === "") {
        throw new DaoyanCliError({ code: "usage", message: "--project \u9700\u8981\u4E00\u4E2A\u8DEF\u5F84\u53C2\u6570", exit: 2 });
      }
      ctx2.projectPath = v;
      i++;
      continue;
    }
    if ((a === "-h" || a === "--help") && !sawCommand) {
      printMainHelp(COMMANDS, VERSION);
      return 0;
    }
    if ((a === "-v" || a === "--version") && !sawCommand) {
      process.stdout.write(`daoyan v${VERSION}
`);
      return 0;
    }
    if (a.startsWith("-")) {
      if (!sawCommand) {
        throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u53C2\u6570 ${a}`, exit: 2 });
      }
      rest.push(a);
      continue;
    }
    sawCommand = true;
    rest.push(a);
  }
  const [name, ...cmdArgs] = rest;
  if (name === void 0) {
    printMainHelp(COMMANDS, VERSION);
    return 0;
  }
  if (name === "help") {
    runHelp(ctx2, cmdArgs, COMMANDS, VERSION);
    return 0;
  }
  const found = findCommand(name, cmdArgs);
  if (found === null) {
    throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u547D\u4EE4 ${name}\uFF1Bdaoyan help \u67E5\u770B\u5168\u90E8`, exit: 2 });
  }
  await found.meta.run(ctx2, found.rest);
  return 0;
}
var ctx = { json: false, noColor: false };
process.on("SIGINT", () => {
  process.exit(130);
});
try {
  process.exit(await main(ctx, process.argv.slice(2)));
} catch (e) {
  if (e instanceof DaoyanCliError) {
    if (ctx.json) emitError(e);
    else process.stderr.write(`ERROR[${e.code}] ${e.message}
`);
    process.exit(e.exit);
  }
  process.stderr.write(
    `FATAL ${e instanceof Error ? e.stack ?? e.message : String(e)}
`
  );
  process.exit(1);
}
//# sourceMappingURL=cli.mjs.map