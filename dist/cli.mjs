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
  "update_failed"
];
var DaoyanCliError = class extends Error {
  code;
  details;
  exit;
  constructor(init) {
    super(init.message);
    this.name = "DaoyanCliError";
    this.code = init.code;
    this.details = init.details;
    this.exit = init.exit ?? 1;
  }
};

// src/shared/version.mts
var VERSION = "0.1.0";

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

// src/commands/discover.mts
function buildDiscovery(version, commands) {
  return {
    name: "daoyan-cli",
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
function runDiscover(ctx2, _args, commands, version) {
  const doc = buildDiscovery(version, commands);
  if (ctx2.json) {
    emitData(doc);
    return;
  }
  process.stdout.write(`daoyan-cli v${doc.version} \u2014\u2014 ${doc.tagline}

`);
  for (const g of Object.keys(GROUP_LABEL)) {
    process.stdout.write(`${GROUP_LABEL[g]}\uFF1A
`);
    for (const c of doc.commands.filter((x) => x.group === g)) {
      const mark = c.implemented ? "\u2705" : "\u2B1C";
      process.stdout.write(`  ${mark} ${c.usage}
      ${c.summary}
`);
    }
    process.stdout.write("\n");
  }
  process.stdout.write(`\u9000\u51FA\u7801\uFF1A${JSON.stringify(doc.exitCodes)}
`);
  process.stdout.write(`\u9519\u8BEF\u7801\uFF1A${doc.errorCodes.join(", ")}\uFF08\u8BED\u4E49\u89C1 docs/ERROR-CODES.md\uFF09
`);
}

// src/commands/update.mts
import { spawn } from "child_process";

// src/shared/log.mts
var sinks = [];
var ts = () => (/* @__PURE__ */ new Date()).toTimeString().slice(0, 8);
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
async function runUpdate(_ctx) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  say("\u81EA\u5347\u7EA7\uFF1Anpm install -g daoyan-cli@latest ...");
  const exit = await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(npm, ["install", "-g", "daoyan-cli@latest"], { stdio: "inherit" });
    child.on("error", (e) => {
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `\u65E0\u6CD5\u542F\u52A8 npm\uFF1A${e.message}` })
      );
    });
    child.on("close", (code) => resolvePromise(code ?? 1));
  });
  if (exit !== 0) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `npm \u9000\u51FA\u7801 ${exit}\u3002\u82E5\u4E3A EACCES\uFF1A\u5168\u5C40\u76EE\u5F55\u4E0D\u53EF\u5199\uFF0C\u8003\u8651 nvm \u6216\u81EA\u5B9A\u4E49 npm prefix \u540E\u91CD\u8BD5\u3002`,
      details: { exit }
    });
  }
  say("\u5347\u7EA7\u5B8C\u6210\u3002\u67E5\u770B\u7248\u672C\uFF1Adaoyan-cli --version");
}

// src/commands/registry.mts
var planned = (milestone) => (_ctx, _args) => {
  throw new DaoyanCliError({
    code: "not_implemented",
    message: `\u8BE5\u547D\u4EE4\u8BA1\u5212\u5728 ${milestone} \u4EA4\u4ED8\uFF08docs/PLAN.md \xA78 \u91CC\u7A0B\u7891\uFF09\u3002`
  });
};
var COMMANDS = [
  // ---- 项目 ----
  {
    name: "init",
    group: "project",
    summary: "\u7ACB\u9879\uFF1A\u672C\u5730\u6A21\u5F0F\u88C5\u5F15\u64CE\uFF08venv/clone\uFF09\u6216 --remote \u76F4\u8FDE\u8FDC\u7AEF ComfyUI",
    usage: "daoyan-cli init <\u540D\u79F0> [--version <tag>] [--use-existing <\u8DEF\u5F84>] [--remote <url>] [--mirror <\u955C\u50CF>]",
    detail: [
      "ComfyUI \u662F\u5916\u90E8\u7EC4\u4EF6\uFF1Ainit \u53EA\u7F16\u6392\uFF08clone / \u88C5\u4F9D\u8D56\uFF09\uFF0C\u4E0D\u6346\u7ED1\u3002",
      "--use-existing \u63A5\u7BA1\u65E2\u6709\u5B89\u88C5\uFF0C\u8DF3\u8FC7\u5F15\u64CE\u5B89\u88C5\u6B65\u9AA4\u3002",
      "--remote <url> \u8FDC\u7AEF\u6A21\u5F0F\uFF1A\u4E0D\u5B89\u88C5\u5F15\u64CE\uFF0Cproject.json \u5199 engine.mode=remote \u76F4\u8FDE\uFF08\u540E\u7EED\u91CC\u7A0B\u7891\u7EC6\u5316\uFF09\u3002"
    ],
    run: planned("M3")
  },
  {
    name: "validate",
    group: "project",
    summary: "\u9879\u76EE\u89C4\u5219\u5168\u91CF\u6821\u9A8C\uFF08\u63A5\u529B\u95ED\u5408/\u951A\u70B9\u5B58\u5728/\u5C3A\u5BF8 32 \u500D\u6570/seed \u51B2\u7A81\uFF09",
    usage: "daoyan-cli validate [--json]",
    run: planned("M2")
  },
  // ---- 生产 ----
  {
    name: "shot",
    group: "production",
    summary: "\u62CD\u6307\u5B9A\u955C\u5934\uFF08\u81EA\u52A8 up\u2192\u6821\u9A8C\u2192GPU \u8BA9\u8DEF\u2192\u63D0\u4EA4\u2192\u8F6E\u8BE2\u2192\u843D\u4F4D\u2192\u6062\u590D\uFF09",
    usage: "daoyan-cli shot <\u955C\u53F7...> [--steps N] [--timeout \u5C0F\u65F6] [--no-evict] [--no-up]",
    run: planned("M1")
  },
  {
    name: "retake",
    group: "production",
    summary: "\u91CD\u62CD\uFF08\u7B49\u4EF7 shot --force\uFF09",
    usage: "daoyan-cli retake <\u955C\u53F7...>",
    run: planned("M1")
  },
  {
    name: "batch",
    group: "production",
    summary: "\u8FDE\u62CD\u5168\u90E8\u672A\u5B8C\u6210\u955C\u5934\uFF08\u65AD\u70B9\u7EED\u8DD1\uFF09",
    usage: "daoyan-cli batch [--no-evict] [--timeout \u5C0F\u65F6]",
    run: planned("M1")
  },
  {
    name: "wrap",
    group: "production",
    summary: "\u6740\u9752\uFF1Affmpeg \u5408\u7247\u4EA4\u4ED8\u5230 final/",
    usage: "daoyan-cli wrap",
    run: planned("M1")
  },
  // ---- 引擎 ----
  {
    name: "up",
    group: "engine",
    summary: "\u5F15\u64CE\u5C31\u4F4D\uFF08local\uFF1A\u62C9\u8D77\u8FDB\u7A0B+\u5C31\u7EEA\u63A2\u6D4B\uFF1Bremote\uFF1A\u8FDE\u901A\u4E0E\u8282\u70B9\u6CE8\u518C\u63A2\u6D4B\uFF09",
    usage: "daoyan-cli up",
    run: planned("M1")
  },
  {
    name: "down",
    group: "engine",
    summary: "\u505C\u6B62\u5F15\u64CE\uFF08local \u6A21\u5F0F\uFF1Bremote \u6A21\u5F0F\u5F15\u64CE\u7531\u8FDC\u7AEF\u7BA1\u7406\uFF0C\u672C\u547D\u4EE4\u4E0D\u9002\u7528\uFF09",
    usage: "daoyan-cli down [--force]",
    run: planned("M1")
  },
  {
    name: "engine install",
    group: "engine",
    summary: "\u5B89\u88C5\u6307\u5B9A\u7248\u672C\u7684 ComfyUI\uFF08\u5916\u90E8\u7EC4\u4EF6\uFF0Clocal \u6A21\u5F0F\uFF09",
    usage: "daoyan-cli engine install <\u7248\u672C tag>",
    run: planned("M3")
  },
  {
    name: "engine use",
    group: "engine",
    summary: "\u5207\u6362\u9879\u76EE\u4F7F\u7528\u7684 ComfyUI \u7248\u672C\uFF08local \u6A21\u5F0F\uFF09",
    usage: "daoyan-cli engine use <\u7248\u672C tag|\u8DEF\u5F84>",
    run: planned("M3")
  },
  {
    name: "engine ls",
    group: "engine",
    summary: "\u5217\u51FA\u53EF\u7528 ComfyUI \u7248\u672C\uFF08\u672C\u5730\u4E0E GitHub releases\uFF09",
    usage: "daoyan-cli engine ls",
    run: planned("M3")
  },
  // ---- 运维 ----
  {
    name: "status",
    group: "ops",
    summary: "\u573A\u8BB0\u6C47\u62A5\uFF1A\u4EFB\u52A1/\u8FDB\u5EA6/GPU/\u5185\u5B58/\u955C\u5934\u5B8C\u6210\u5EA6",
    usage: "daoyan-cli status [--json]",
    run: planned("M1")
  },
  {
    name: "logs",
    group: "ops",
    summary: "\u67E5\u770B\u65E5\u5FD7\uFF08docker logs \u8BED\u4E49\uFF0C-f \u8DDF\u968F\uFF09",
    usage: "daoyan-cli logs [-f] [-n N] [--src daoyan-cli|engine|all]",
    run: planned("M1")
  },
  {
    name: "list",
    group: "ops",
    summary: "\u6253\u5370\u5206\u955C\u8868",
    usage: "daoyan-cli list [--json]",
    run: planned("M1")
  },
  {
    name: "doctor",
    group: "ops",
    summary: "\u73AF\u5883\u81EA\u68C0\uFF08local\uFF1A\u5F15\u64CE/venv/\u6A21\u578B/ffmpeg\uFF1Bremote\uFF1A\u8FDE\u901A/\u8282\u70B9/\u6A21\u578B\u53EF\u89C1\u6027\uFF09",
    usage: "daoyan-cli doctor [--json]",
    run: planned("M1")
  },
  {
    name: "gpu status",
    group: "ops",
    summary: "GPU \u4E0E\u5BB9\u5668\u6A21\u578B\u5360\u7528\u4E00\u89C8",
    usage: "daoyan-cli gpu status",
    run: planned("M1")
  },
  {
    name: "gpu evict",
    group: "ops",
    summary: "\u624B\u52A8\u5F39\u51FA\u5BB9\u5668\u6A21\u578B\uFF08\u901A\u5E38\u7531 shot \u81EA\u52A8\u6267\u884C\uFF09",
    usage: "daoyan-cli gpu evict",
    run: planned("M1")
  },
  {
    name: "gpu restore",
    group: "ops",
    summary: "\u6062\u590D\u88AB\u5F39\u51FA\u7684\u5BB9\u5668\u6A21\u578B",
    usage: "daoyan-cli gpu restore",
    run: planned("M1")
  },
  // ---- 元 ----
  {
    name: "discover",
    group: "meta",
    summary: "agent \u81EA\u63CF\u8FF0\uFF1A\u547D\u4EE4\u6811/\u4FE1\u5C01/\u9519\u8BEF\u7801/\u9000\u51FA\u7801",
    usage: "daoyan-cli discover [--json]",
    implemented: true,
    run: (ctx2, args) => runDiscover(ctx2, args, COMMANDS, VERSION)
  },
  {
    name: "update",
    group: "meta",
    summary: "\u81EA\u5347\u7EA7\uFF08npm install -g daoyan-cli@latest\uFF09",
    usage: "daoyan-cli update",
    implemented: true,
    run: (ctx2, _args) => runUpdate(ctx2)
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
function printHelp() {
  const lines = [
    "daoyan-cli \u2014\u2014 \u5267\u672C\u8FDB\uFF0C\u6210\u7247\u51FA\u3002You prepare the story. The director shoots it.",
    "",
    "\u7528\u6CD5: daoyan-cli [\u5168\u5C40\u53C2\u6570] <\u547D\u4EE4> [\u53C2\u6570...]\uFF08dyc \u4E0E daoyan-cli \u5B8C\u5168\u7B49\u4EF7\uFF09",
    "",
    "\u5168\u5C40\u53C2\u6570:",
    "  --json            \u673A\u5668\u53EF\u8BFB\u8F93\u51FA\uFF08\u4FE1\u5C01\u683C\u5F0F\u89C1 daoyan-cli discover\uFF09",
    "  --project <\u8DEF\u5F84>   \u6307\u5B9A\u9879\u76EE\u76EE\u5F55\uFF08\u9ED8\u8BA4\u81EA\u5F53\u524D\u4F4D\u7F6E\u5411\u4E0A\u5BFB\u627E project.json\uFF09",
    "  --no-color        \u5173\u95ED\u5F69\u8272\u8F93\u51FA",
    "  -h, --help        \u5E2E\u52A9\uFF1Bdaoyan-cli help <\u547D\u4EE4> \u67E5\u770B\u5355\u547D\u4EE4\u8BE6\u60C5",
    "  -v, --version     \u7248\u672C",
    ""
  ];
  for (const g of Object.keys(GROUP_LABEL)) {
    lines.push(`${GROUP_LABEL[g]}:`);
    for (const c of COMMANDS.filter((x) => x.group === g)) {
      lines.push(`  ${c.usage}`);
      lines.push(`    ${c.summary}`);
    }
    lines.push("");
  }
  lines.push(`daoyan-cli v${VERSION} \xB7 ComfyUI \u662F\u5916\u90E8\u7EC4\u4EF6 \xB7 \u6587\u6863\u89C1 docs/`);
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
async function main(ctx2, argv) {
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === void 0) break;
    switch (a) {
      case "--json":
        ctx2.json = true;
        break;
      case "--no-color":
        ctx2.noColor = true;
        break;
      case "--project": {
        const v = argv[i + 1];
        if (v === void 0 || v === "") {
          throw new DaoyanCliError({ code: "usage", message: "--project \u9700\u8981\u4E00\u4E2A\u8DEF\u5F84\u53C2\u6570", exit: 2 });
        }
        ctx2.projectPath = v;
        i++;
        break;
      }
      case "-h":
      case "--help":
        printHelp();
        return 0;
      case "-v":
      case "--version":
        process.stdout.write(`daoyan-cli v${VERSION}
`);
        return 0;
      default:
        if (a.startsWith("-")) {
          throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u53C2\u6570 ${a}`, exit: 2 });
        }
        rest.push(a);
    }
  }
  const [name, ...cmdArgs] = rest;
  if (name === void 0) {
    printHelp();
    return 0;
  }
  if (name === "help") {
    const target = cmdArgs.join(" ");
    if (target === "") {
      printHelp();
      return 0;
    }
    const hit = COMMANDS.find((c) => c.name === target);
    if (hit === void 0) {
      throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u547D\u4EE4 ${target}\uFF1Bdaoyan-cli --help \u67E5\u770B\u5168\u90E8`, exit: 2 });
    }
    printCommandHelp(hit);
    return 0;
  }
  const found = findCommand(name, cmdArgs);
  if (found === null) {
    throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u547D\u4EE4 ${name}\uFF1Bdaoyan-cli --help \u67E5\u770B\u5168\u90E8`, exit: 2 });
  }
  await found.meta.run(ctx2, found.rest);
  return 0;
}
var ctx = { json: false, noColor: false };
main(ctx, process.argv.slice(2)).then(
  (code) => {
    process.exit(code);
  },
  (e) => {
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
);
//# sourceMappingURL=cli.mjs.map