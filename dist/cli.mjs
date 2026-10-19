#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/shared/version.mts
var VERSION;
var init_version = __esm({
  "src/shared/version.mts"() {
    "use strict";
    VERSION = "0.0.4";
  }
});

// src/shared/groups.mts
var GROUP_LABEL;
var init_groups = __esm({
  "src/shared/groups.mts"() {
    "use strict";
    GROUP_LABEL = {
      project: "\u9879\u76EE",
      workflow: "\u5DE5\u4F5C\u6D41",
      production: "\u751F\u4EA7",
      engine: "\u5F15\u64CE",
      ops: "\u8FD0\u7EF4",
      meta: "\u5143"
    };
  }
});

// src/shared/errors.mts
function isDaoyanCliError(e) {
  return e instanceof DaoyanCliError;
}
function asCliError(e, fallback = "run_failed") {
  if (isDaoyanCliError(e)) return e;
  return new DaoyanCliError({
    code: fallback,
    message: e instanceof Error ? e.message : String(e)
  });
}
var ERROR_CODES, ERROR_META, DaoyanCliError;
var init_errors = __esm({
  "src/shared/errors.mts"() {
    "use strict";
    ERROR_CODES = [
      // 通用
      "usage",
      "not_implemented",
      "project_not_found",
      "config_invalid",
      "validation_failed",
      "workflow_invalid",
      "skill_write_failed",
      "external_tool_missing",
      "update_failed",
      "provision_failed",
      "artifact_download_failed",
      // 引擎
      "engine_not_ready",
      "engine_start_failed",
      "engine_stop_failed",
      "engine_unreachable",
      "engine_busy",
      "engine_crashed",
      "engine_oom",
      "cleanup_failed",
      // 任务 / 机器
      "machine_busy",
      "machine_lock_corrupt",
      "task_not_found",
      "run_not_found",
      "worker_start_failed",
      "worker_crashed",
      // 运行
      "run_failed",
      "run_timeout",
      "shot_failed",
      "shot_timeout",
      "anchor_not_found",
      "relay_upstream_missing",
      "model_not_found",
      "node_missing",
      // GPU
      "gpu_unsupported",
      "gpu_takeover_failed",
      "gpu_restore_failed",
      "gpu_lease_corrupt",
      // 旧命令保留（wrap 等）
      "wrap_failed"
    ];
    ERROR_META = {
      usage: { retryable: false, hint: "\u8FD0\u884C daoyan help --json \u67E5\u770B\u6B63\u786E\u7528\u6CD5\u3002" },
      not_implemented: { retryable: false, hint: "\u8BE5\u80FD\u529B\u5C1A\u672A\u4EA4\u4ED8\uFF1B\u67E5\u770B docs/REFACTOR.md \u7684\u91CC\u7A0B\u7891\u3002" },
      project_not_found: {
        retryable: false,
        hint: "\u5728\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C\uFF0C\u6216\u7528 --project \u6307\u5B9A\u9879\u76EE\u6839\uFF1B\u65B0\u9879\u76EE\u6267\u884C daoyan init --mode=local|remote\u3002",
        nextActions: ["init --mode=local", "init --mode=remote --url <url>"]
      },
      config_invalid: { retryable: false, hint: "\u4FEE\u6B63 project.json / .dycli/machine.json \u540E\u91CD\u8BD5\u3002" },
      validation_failed: { retryable: false, hint: "\u6309 details.issues \u4FEE\u6B63\u540E\u91CD\u8BD5\u3002" },
      workflow_invalid: { retryable: false, hint: "\u7528 workflow validate \u5B9A\u4F4D\u95EE\u9898\uFF1B\u4FEE\u6B63\u56FE\u6216 bindings \u540E\u91CD\u8BD5\u3002" },
      skill_write_failed: { retryable: false, hint: "\u68C0\u67E5\u9879\u76EE\u76EE\u5F55\u5199\u6743\u9650\uFF1B\u4FEE\u590D\u540E\u91CD\u65B0\u8FD0\u884C daoyan skill update\u3002" },
      external_tool_missing: { retryable: false, hint: "\u5B89\u88C5\u7F3A\u5931\u7684\u5916\u90E8\u5DE5\u5177\uFF08python3 / git / ffmpeg \u7B49\uFF09\u540E\u91CD\u8BD5\u3002" },
      update_failed: { retryable: true, hint: "\u68C0\u67E5\u7F51\u7EDC\u4E0E npm \u6743\u9650\u540E\u91CD\u8BD5\u3002" },
      provision_failed: { retryable: true, hint: "\u68C0\u67E5\u7F51\u7EDC\u3001\u78C1\u76D8\u4E0E Python \u73AF\u5883\uFF1B\u53EF\u7528 --mirror \u5207\u6362 pip \u6E90\u3002" },
      artifact_download_failed: {
        retryable: true,
        hint: "\u5F15\u64CE\u4EA7\u7269\u4ECD\u5728 scratch \u4E2D\uFF1B\u68C0\u67E5 /view \u53EF\u8FBE\u6027\u540E\u91CD\u8BD5\uFF0C\u6216\u624B\u52A8\u53D6\u56DE\u3002"
      },
      engine_not_ready: { retryable: true, retryAfterMs: 5e3, hint: "\u786E\u8BA4\u5F15\u64CE\u53EF\u8FBE\u540E\u518D\u6267\u884C\u4EFB\u52A1\u3002" },
      engine_start_failed: {
        retryable: false,
        hint: "\u67E5\u770B logs/engine-*.log \u4E0E daoyan engine ls\uFF1B\u4FEE\u590D\u5F15\u64CE\u5B89\u88C5\u540E\u91CD\u65B0\u6267\u884C\u4EFB\u52A1\u3002"
      },
      engine_stop_failed: { retryable: true, retryAfterMs: 1e4, hint: "\u6B8B\u7559\u8FDB\u7A0B\u4F1A\u5728\u4E0B\u4E00\u6B21\u4EFB\u52A1\u5F00\u59CB\u65F6\u56DE\u6536\u3002" },
      engine_unreachable: {
        retryable: true,
        retryAfterMs: 1e4,
        hint: "remote \u6A21\u5F0F\u4E0D\u4F1A\u542F\u52A8\u8FDC\u7AEF\u5F15\u64CE\uFF1B\u786E\u8BA4 URL / \u7F51\u7EDC / \u670D\u52A1\u72B6\u6001\u540E\u91CD\u8BD5\u3002"
      },
      engine_busy: {
        retryable: true,
        retryAfterMs: 1e4,
        hint: "\u8FDC\u7AEF\u961F\u5217\u5DF2\u6709\u4EFB\u52A1\uFF1B\u7B49\u961F\u5217\u7A7A\u95F2\u540E\u91CD\u8BD5\uFF0C\u6216\u6539\u7528\u4E13\u7528\u5B9E\u4F8B\u3002"
      },
      engine_crashed: { retryable: true, hint: "\u5F15\u64CE\u8FDB\u7A0B\u5F02\u5E38\u9000\u51FA\uFF1B\u67E5\u770B logs/engine-*.log \u540E\u91CD\u8BD5\u3002" },
      engine_oom: {
        retryable: true,
        hint: "\u663E\u5B58\u4E0D\u8DB3\uFF1A\u964D\u4F4E\u5206\u8FA8\u7387 / \u5E27\u6570 / \u6B65\u6570\uFF0C\u5F00\u542F gpu.takeover\uFF0C\u6216\u6362\u66F4\u5927\u663E\u5B58\u673A\u5668\u540E\u91CD\u8BD5\u3002",
        nextActions: ["status --json", "workflow set <name> <node>.<input> <value>"]
      },
      cleanup_failed: { retryable: false, hint: "\u4E3B\u9519\u8BEF\u4F18\u5148\uFF1Bcleanup \u8BE6\u60C5\u89C1 details.cleanup\u3002\u6B8B\u7559\u7531\u4E0B\u4E00\u6B21\u4EFB\u52A1\u56DE\u6536\u3002" },
      machine_busy: {
        retryable: true,
        retryAfterMs: 5e3,
        hint: "\u540C\u4E00\u8BBE\u5907\u540C\u4E00\u65F6\u523B\u53EA\u5141\u8BB8\u4E00\u4E2A generation task\uFF1B\u7B49\u5F85 owner \u7ED3\u675F\u540E\u91CD\u8BD5\uFF0C\u6216\u5148\u53D6\u6D88\u5B83\u3002",
        nextActions: ["status --json", "status --task <task_id>", "run cancel <task_id>"]
      },
      machine_lock_corrupt: {
        retryable: false,
        hint: "machine.lock \u635F\u574F\uFF1B\u786E\u8BA4\u6CA1\u6709\u4EFB\u52A1\u5728\u8DD1\u540E\u624B\u52A8\u5220\u9664 ~/.dycli/machine.lock\u3002"
      },
      task_not_found: { retryable: false, hint: "\u68C0\u67E5 task_id\uFF1B\u7528 status --json \u67E5\u770B\u6700\u8FD1\u4EFB\u52A1\u3002" },
      run_not_found: { retryable: false, hint: "\u68C0\u67E5 run_id\uFF1B\u7528 status --json \u67E5\u770B\u6700\u8FD1\u8FD0\u884C\u3002" },
      worker_start_failed: { retryable: true, hint: "\u68C0\u67E5\u9879\u76EE\u76EE\u5F55\u5199\u6743\u9650\u4E0E Node \u53EF\u6267\u884C\u6587\u4EF6\u540E\u91CD\u8BD5\u3002" },
      worker_crashed: {
        retryable: true,
        hint: "task \u5DF2\u6807\u8BB0 interrupted\uFF1B\u4E0B\u4E00\u6B21\u4EFB\u52A1\u4F1A\u81EA\u52A8\u56DE\u6536\u6B8B\u7559\u5F15\u64CE/\u9501/GPU \u79DF\u7EA6\u3002"
      },
      run_failed: { retryable: false, hint: "\u67E5\u770B status --task \u7684 error \u4E0E logs --task \u540E\u4FEE\u6B63\u3002" },
      run_timeout: { retryable: true, hint: "\u4EFB\u52A1\u8D85\u65F6\uFF1B\u63D0\u9AD8 --timeout \u6216\u7F29\u5C0F\u4EFB\u52A1\u540E\u91CD\u8BD5\u3002" },
      shot_failed: { retryable: false, hint: "\u67E5\u770B\u8BE5\u955C\u7684 run \u8BB0\u5F55\u4E0E\u65E5\u5FD7\u540E\u4FEE\u6B63\u3002" },
      shot_timeout: { retryable: true, hint: "\u63D0\u9AD8 --timeout \u6216\u7F29\u5C0F\u4EFB\u52A1\u540E\u91CD\u8BD5\u3002" },
      anchor_not_found: { retryable: false, hint: "\u68C0\u67E5 shots.json \u7684 meta.anchors \u4E0E\u6587\u4EF6\u662F\u5426\u5B58\u5728\u3002" },
      relay_upstream_missing: { retryable: false, hint: "\u5148\u5B8C\u6210\u4E0A\u6E38\u955C\u5934\u7684\u6210\u529F run\uFF0C\u518D\u62CD\u63A5\u529B\u955C\u5934\u3002" },
      model_not_found: {
        retryable: false,
        hint: "workflow \u7684 loader \u8F93\u5165\u503C\u4E0E /object_info \u679A\u4E3E\u4E0D\u5339\u914D\uFF1B\u68C0\u67E5 modelpath / \u6587\u4EF6\u540D\u3002"
      },
      node_missing: {
        retryable: false,
        hint: "\u5F15\u64CE\u7F3A\u5C11 workflow \u4F7F\u7528\u7684\u8282\u70B9\u7C7B\uFF1B\u5B89\u88C5\u5BF9\u5E94 custom node \u6216\u6539\u7528\u5DF2\u6709\u8282\u70B9\u3002"
      },
      gpu_unsupported: {
        retryable: false,
        hint: "\u5F53\u524D\u5E73\u53F0\u4E0D\u652F\u6301 GPU \u63A5\u7BA1\uFF08\u9700\u8981 Linux + NVIDIA\uFF09\uFF1B\u4EFB\u52A1\u7EE7\u7EED\uFF0C\u4E0D\u4F1A\u9A71\u9010\u4EFB\u4F55\u8FDB\u7A0B\u3002"
      },
      gpu_takeover_failed: {
        retryable: false,
        hint: "\u90E8\u5206\u5185\u7F6E\u76EE\u6807\u5378\u8F7D/\u9A71\u9010\u5931\u8D25\uFF1B\u4EFB\u52A1\u7EE7\u7EED\uFF0C\u6700\u7EC8\u53EF\u80FD OOM\u3002\u8BE6\u89C1 run.json \u7684 gpu.errors\u3002"
      },
      gpu_restore_failed: {
        retryable: true,
        hint: "\u6062\u590D\u88AB\u63A5\u7BA1\u7684\u6A21\u578B/\u8FDB\u7A0B\u5931\u8D25\uFF1B\u79DF\u7EA6\u4FDD\u7559\uFF0C\u4E0B\u4E00\u6B21 local \u4EFB\u52A1\u4F1A\u91CD\u8BD5\u3002"
      },
      gpu_lease_corrupt: {
        retryable: false,
        hint: "GPU \u79DF\u7EA6\u635F\u574F\uFF1B\u786E\u8BA4\u6CA1\u6709\u4EFB\u52A1\u5728\u8DD1\u540E\u624B\u52A8\u5904\u7406 ~/.dycli/gpu/lease.json\u3002"
      },
      wrap_failed: { retryable: false, hint: "\u68C0\u67E5\u662F\u5426\u6709\u8DB3\u591F\u7684\u6210\u529F run \u4E0E ffmpeg \u5B89\u88C5\u3002" }
    };
    DaoyanCliError = class extends Error {
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
       * 是否可通过重试解决。
       */
      retryable;
      /**
       * 建议重试间隔（毫秒）。
       */
      retryAfterMs;
      /**
       * Agent 恢复建议。
       */
      hint;
      /**
       * 建议的后续动作。
       */
      nextActions;
      /**
       * 关联 task id。
       */
      taskId;
      /**
       * 关联 run id。
       */
      runId;
      /**
       * 创建错误实例（message 由 Error 基类承载）。
       */
      constructor(init) {
        super(init.message);
        this.name = "DaoyanCliError";
        this.code = init.code;
        this.details = init.details;
        this.exit = init.exit ?? 1;
        const meta = ERROR_META[init.code];
        this.retryable = init.retryable ?? meta.retryable;
        this.retryAfterMs = init.retryAfterMs ?? meta.retryAfterMs;
        this.hint = init.hint ?? meta.hint;
        this.nextActions = init.nextActions ?? meta.nextActions;
        this.taskId = init.taskId;
        this.runId = init.runId;
      }
    };
  }
});

// src/shared/json.mts
function emitData(data) {
  process.stdout.write(JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data }) + "\n");
}
function emitError(err) {
  const error = {
    code: err.code,
    message: err.message,
    retryable: err.retryable
  };
  if (err.retryAfterMs !== void 0) error.retry_after_ms = err.retryAfterMs;
  if (err.hint !== "") error.hint = err.hint;
  if (err.taskId !== void 0) error.task_id = err.taskId;
  if (err.runId !== void 0) error.run_id = err.runId;
  if (err.nextActions !== void 0) error.next_actions = err.nextActions;
  if (err.details !== void 0) error.details = err.details;
  process.stdout.write(
    JSON.stringify({ ok: false, schema_version: SCHEMA_VERSION, error }) + "\n"
  );
}
var SCHEMA_VERSION;
var init_json = __esm({
  "src/shared/json.mts"() {
    "use strict";
    SCHEMA_VERSION = 1;
  }
});

// src/shared/fs.mts
var fs_exports = {};
__export(fs_exports, {
  ensureDir: () => ensureDir,
  idTimestamp: () => idTimestamp,
  isHttpUrl: () => isHttpUrl,
  makeId: () => makeId,
  nowIso: () => nowIso,
  randomSuffix: () => randomSuffix,
  readJson: () => readJson,
  readJsonIfExists: () => readJsonIfExists,
  sha256: () => sha256,
  sha256File: () => sha256File,
  shortHash: () => shortHash,
  slugify: () => slugify,
  stableStringify: () => stableStringify,
  toPosixRelative: () => toPosixRelative,
  writeFileAtomic: () => writeFileAtomic,
  writeJsonAtomic: () => writeJsonAtomic
});
import { createHash, randomBytes } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "fs";
import { dirname, sep } from "path";
function writeFileAtomic(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  try {
    writeFileSync(tmp, content);
    renameSync(tmp, file);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}
function writeJsonAtomic(file, value) {
  writeFileAtomic(file, JSON.stringify(value, null, 2) + "\n");
}
function readJson(file, code = "config_invalid") {
  if (!existsSync(file)) {
    throw new DaoyanCliError({ code, message: `\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${file}` });
  }
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new DaoyanCliError({
      code,
      message: `${file} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
}
function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return readJson(file);
}
function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}
function sha256File(file) {
  return sha256(readFileSync(file));
}
function shortHash(data, len = 4) {
  return sha256(data).slice(0, len);
}
function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const o = value;
    const out = {};
    for (const k of Object.keys(o).sort()) out[k] = sortValue(o[k]);
    return out;
  }
  return value;
}
function slugify(input, fallback = "machine") {
  const s = input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return s === "" ? fallback : s.slice(0, 24);
}
function idTimestamp(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "");
}
function randomSuffix(len = 4) {
  return randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function makeId(machineId, date = /* @__PURE__ */ new Date()) {
  return `${idTimestamp(date)}-${slugify(machineId)}-${randomSuffix(4)}`;
}
function toPosixRelative(root, file) {
  let rel = file;
  if (file.startsWith(root + sep) || file === root) rel = file.slice(root.length + 1);
  return rel.split(sep).join("/");
}
function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}
function isHttpUrl(v) {
  return /^https?:\/\/[^\s]+$/i.test(v);
}
var init_fs = __esm({
  "src/shared/fs.mts"() {
    "use strict";
    init_errors();
  }
});

// src/core/project/types.mts
function isTerminalStatus(status) {
  return status === "succeeded" || status === "failed" || status === "cancelled" || status === "interrupted";
}
var PROJECT_FILE, SHOTS_FILE, WORKFLOWS_DIR, BINDINGS_SUFFIX, INPUTS_DIR, TASKS_DIR, RUNS_DIR, FINAL_DIR, SKILL_DIR, AGENTS_FILE, MACHINE_FILE, CATALOG_FILE, EXTRA_MODELS_FILE, LOG_DIR, ENGINE_PID_FILE, TASK_FILE, EVENTS_FILE, RUN_FILE, RUN_WORKFLOW_FILE, RUN_INPUTS_FILE, CANCEL_FILE, CONCAT_LIST_FILE, RELAY_DIR;
var init_types = __esm({
  "src/core/project/types.mts"() {
    "use strict";
    PROJECT_FILE = "project.json";
    SHOTS_FILE = "shots.json";
    WORKFLOWS_DIR = "workflows";
    BINDINGS_SUFFIX = ".bindings.json";
    INPUTS_DIR = "inputs";
    TASKS_DIR = "tasks";
    RUNS_DIR = "runs";
    FINAL_DIR = "final";
    SKILL_DIR = ".agents/skills/daoyan";
    AGENTS_FILE = "AGENTS.md";
    MACHINE_FILE = ".dycli/machine.json";
    CATALOG_FILE = ".dycli/node_catalog.json";
    EXTRA_MODELS_FILE = ".dycli/extra_model_paths.yaml";
    LOG_DIR = "logs";
    ENGINE_PID_FILE = "engine.pid";
    TASK_FILE = "task.json";
    EVENTS_FILE = "events.jsonl";
    RUN_FILE = "run.json";
    RUN_WORKFLOW_FILE = "workflow.json";
    RUN_INPUTS_FILE = "inputs.json";
    CANCEL_FILE = "cancel.request";
    CONCAT_LIST_FILE = "concat_list.txt";
    RELAY_DIR = "relay_frames";
  }
});

// src/core/project/config.mts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import { hostname } from "os";
import { dirname as dirname2, isAbsolute, join, resolve } from "path";
function findProject(start) {
  let dir = resolve(start);
  for (; ; ) {
    const candidate = join(dir, PROJECT_FILE);
    if (existsSync2(candidate)) {
      return { root: dir, config: readProject(candidate) };
    }
    const parent = dirname2(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function readProjectAt(root) {
  const file = join(root, PROJECT_FILE);
  if (!existsSync2(file)) return null;
  return readProject(file);
}
function readProject(file) {
  let raw;
  try {
    raw = JSON.parse(readFileSync2(file, "utf8"));
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
  if (!isProjectConfig(raw)) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5\u7684 project.json v2\uFF08\u9700\u8981 name / version:2\uFF1B\u53EF\u9009 default_workflow / gpu.takeover / comfyui.version / comfyui.custom_nodes\uFF09\uFF0C\u89C1 docs/DATA-MODEL.md\u3002\u65E7\u7248\u9879\u76EE\u4E0D\u517C\u5BB9\uFF0C\u8BF7\u91CD\u65B0 init\u3002`
    });
  }
  return raw;
}
function isProjectConfig(v) {
  if (typeof v !== "object" || v === null) return false;
  const o = v;
  if (typeof o.name !== "string" || o.name.trim() === "") return false;
  if (o.version !== 2) return false;
  if (o.default_workflow !== void 0 && typeof o.default_workflow !== "string") return false;
  if (o.gpu !== void 0) {
    if (typeof o.gpu !== "object" || o.gpu === null) return false;
    const g = o.gpu;
    if (g.takeover !== void 0 && typeof g.takeover !== "boolean") return false;
  }
  if (o.comfyui !== void 0) {
    if (typeof o.comfyui !== "object" || o.comfyui === null) return false;
    const c = o.comfyui;
    if (c.version !== void 0 && typeof c.version !== "string") return false;
    if (c.custom_nodes !== void 0) {
      if (!Array.isArray(c.custom_nodes)) return false;
      for (const n of c.custom_nodes) {
        if (typeof n !== "object" || n === null) return false;
        const cn = n;
        if (typeof cn.name !== "string" || typeof cn.repo !== "string") return false;
        if (cn.ref !== void 0 && typeof cn.ref !== "string") return false;
      }
    }
  }
  return true;
}
function machinePath(root) {
  return join(root, MACHINE_FILE);
}
function hasMachine(root) {
  return existsSync2(machinePath(root));
}
function loadMachine(root) {
  const file = machinePath(root);
  if (!existsSync2(file)) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `\u672C\u673A\u5C1A\u672A\u521D\u59CB\u5316\uFF08\u7F3A\u5C11 ${MACHINE_FILE}\uFF09\u3002\u8FD0\u884C daoyan init --mode=local|remote \u7ED1\u5B9A\u672C\u673A`
    });
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync2(file, "utf8"));
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
  if (!isMachineConfig(raw)) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} \u7ED3\u6784\u975E\u6CD5\uFF1B\u9700\u8981 machine_id \u4E0E engine.mode\uFF08local \u9700\u8981 port\uFF0Cremote \u9700\u8981 url\uFF09`
    });
  }
  return raw;
}
function loadMachineIfExists(root) {
  return hasMachine(root) ? loadMachine(root) : null;
}
function isMachineConfig(v) {
  if (typeof v !== "object" || v === null) return false;
  const o = v;
  if (typeof o.machine_id !== "string" || o.machine_id === "") return false;
  if (typeof o.engine !== "object" || o.engine === null) return false;
  const e = o.engine;
  if (e.mode === "local") {
    if (!Number.isInteger(e.port) || e.port <= 0 || e.port > 65535) return false;
    if (e.modelpath !== void 0 && typeof e.modelpath !== "string") return false;
    if (e.comfyui_dir !== void 0 && typeof e.comfyui_dir !== "string") return false;
    if (e.venv_dir !== void 0 && typeof e.venv_dir !== "string") return false;
    if (e.models_config !== void 0 && e.models_config !== null && typeof e.models_config !== "string") {
      return false;
    }
    if (e.launch_extra !== void 0) {
      if (!Array.isArray(e.launch_extra) || e.launch_extra.some((x) => typeof x !== "string")) return false;
    }
    return true;
  }
  if (e.mode === "remote") {
    if (typeof e.url !== "string" || !/^https?:\/\//i.test(e.url)) return false;
    if (e.free_after_task !== void 0 && e.free_after_task !== "always" && e.free_after_task !== "when_idle" && e.free_after_task !== "never") {
      return false;
    }
    return true;
  }
  return false;
}
function saveMachine(root, machine) {
  writeJsonAtomic(machinePath(root), machine);
}
function projectFromContext(ctx2) {
  return findProject(ctx2.projectPath ?? process.cwd());
}
function requireProject(ctx2) {
  const found = projectFromContext(ctx2);
  if (found === null) {
    throw new DaoyanCliError({
      code: "project_not_found",
      message: "\u672A\u627E\u5230 project.json\uFF08\u81EA\u5F53\u524D\u4F4D\u7F6E\u5411\u4E0A\u5BFB\u627E\uFF09\u3002\u7528 --project \u6307\u5B9A\u6216\u5728\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C"
    });
  }
  return found;
}
function loadShotsFile(root) {
  const file = join(root, SHOTS_FILE);
  if (!existsSync2(file)) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `\u7F3A\u5C11 ${file}\uFF08init \u751F\u6210\u6216\u624B\u5DE5\u521B\u5EFA\uFF09`
    });
  }
  try {
    const raw = JSON.parse(readFileSync2(file, "utf8"));
    if (typeof raw !== "object" || raw === null) throw new Error("\u9876\u5C42\u4E0D\u662F\u5BF9\u8C61");
    const o = raw;
    if (typeof o.meta !== "object" || o.meta === null) throw new Error("\u7F3A\u5C11 meta");
    if (!Array.isArray(o.shots)) throw new Error("\u7F3A\u5C11 shots \u6570\u7EC4");
    return raw;
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5\u7684 shots.json\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
}
function loadShotsIfExists(root) {
  return existsSync2(join(root, SHOTS_FILE)) ? loadShotsFile(root) : null;
}
function resolveWorkflowRef(root, ref) {
  const clean = ref.trim();
  if (clean === "") {
    throw new DaoyanCliError({ code: "workflow_invalid", message: "workflow \u5F15\u7528\u4E3A\u7A7A" });
  }
  if (clean.startsWith("/") || clean.includes("..")) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: `workflow \u5F15\u7528\u5FC5\u987B\u662F\u9879\u76EE\u5185\u76F8\u5BF9\u8DEF\u5F84\uFF08\u6536\u5230 ${ref}\uFF09`
    });
  }
  const rel = clean.includes("/") || clean.endsWith(".json") ? clean : join(WORKFLOWS_DIR, `${clean}.json`);
  return { abs: join(root, rel), rel: rel.split("\\").join("/") };
}
function defaultMachineId() {
  try {
    return hostname() || "machine";
  } catch {
    return "machine";
  }
}
var init_config = __esm({
  "src/core/project/config.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
  }
});

// src/core/agent/contract.mts
function capabilities() {
  return {
    schema_version: SCHEMA_VERSION,
    modes: ["local", "remote"],
    async_tasks: true,
    machine_lock: true,
    gpu_takeover: "opt-in",
    workflow_editing: true,
    node_catalog: true,
    bindings: true,
    git_friendly_records: true,
    project_skill: true,
    user_level_skill: false,
    http_api: [
      "/system_stats",
      "/object_info",
      "/upload/image",
      "/prompt",
      "/history/{id}",
      "/queue",
      "/view",
      "/free",
      "/interrupt"
    ]
  };
}
function errorCatalog() {
  return ERROR_CODES.map((code) => {
    const meta = ERROR_META[code];
    return {
      code,
      retryable: meta.retryable,
      ...meta.retryAfterMs !== void 0 ? { retry_after_ms: meta.retryAfterMs } : {},
      hint: meta.hint,
      ...meta.nextActions !== void 0 ? { next_actions: meta.nextActions } : {}
    };
  });
}
var AGENTS_BLOCK_START, AGENTS_BLOCK_END, AGENTS_BLOCK_BODY, PROJECT_SCHEMA, MACHINE_SCHEMA, WORKFLOW_SCHEMA, BINDINGS_SCHEMA, GRAPH_OPS_SCHEMA, TASK_SCHEMA, RUN_SCHEMA;
var init_contract = __esm({
  "src/core/agent/contract.mts"() {
    "use strict";
    init_json();
    init_errors();
    AGENTS_BLOCK_START = "<!-- daoyan:skill:start -->";
    AGENTS_BLOCK_END = "<!-- daoyan:skill:end -->";
    AGENTS_BLOCK_BODY = [
      "This project uses dycli/daoyan for ComfyUI workflows.",
      "Before creating or running workflows, read `.agents/skills/daoyan/SKILL.md`.",
      "Use `daoyan` commands with `--json`; do not edit `engine/`, `logs/`, or `.dycli/`.",
      "Only one generation task runs per machine; if you get `machine_busy`, inspect the owner and retry later."
    ].join("\n");
    PROJECT_SCHEMA = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "project.json",
      type: "object",
      required: ["name", "version"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        version: { const: 2 },
        default_workflow: { type: "string" },
        gpu: {
          type: "object",
          additionalProperties: false,
          properties: { takeover: { type: "boolean", default: false } }
        },
        comfyui: {
          type: "object",
          additionalProperties: false,
          properties: {
            version: { type: "string" },
            custom_nodes: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "repo"],
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  repo: { type: "string" },
                  ref: { type: "string" }
                }
              }
            }
          }
        }
      }
    };
    MACHINE_SCHEMA = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: ".dycli/machine.json",
      type: "object",
      required: ["machine_id", "engine"],
      properties: {
        machine_id: { type: "string", minLength: 1 },
        engine: {
          oneOf: [
            {
              type: "object",
              required: ["mode", "port"],
              properties: {
                mode: { const: "local" },
                modelpath: { type: "string" },
                models_config: { type: ["string", "null"] },
                port: { type: "integer", minimum: 1, maximum: 65535 },
                launch_extra: { type: "array", items: { type: "string" } },
                comfyui_version: { type: "string" },
                comfyui_dir: { type: "string" },
                venv_dir: { type: "string" }
              }
            },
            {
              type: "object",
              required: ["mode", "url"],
              properties: {
                mode: { const: "remote" },
                url: { type: "string", pattern: "^https?://" },
                free_after_task: { enum: ["always", "when_idle", "never"], default: "when_idle" }
              }
            }
          ]
        },
        overrides: {
          type: "object",
          additionalProperties: {
            type: "object",
            additionalProperties: true
          },
          description: 'workflow \u76F8\u5BF9\u8DEF\u5F84 -> { "nodeId.input": value }'
        }
      }
    };
    WORKFLOW_SCHEMA = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "workflow (ComfyUI API JSON)",
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["class_type"],
        properties: {
          class_type: { type: "string", minLength: 1 },
          inputs: { type: "object", additionalProperties: true }
        }
      }
    };
    BINDINGS_SCHEMA = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "<name>.bindings.json",
      type: "object",
      additionalProperties: { type: "string", pattern: "^[^.]+\\.\\S+$" },
      description: '\u903B\u8F91\u8F93\u5165\u540D -> "nodeId.input"'
    };
    GRAPH_OPS_SCHEMA = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "workflow apply ops",
      oneOf: [
        {
          type: "object",
          required: ["ops"],
          properties: { ops: { type: "array", items: { $ref: "#/$defs/op" } } }
        },
        { type: "array", items: { $ref: "#/$defs/op" } }
      ],
      $defs: {
        op: {
          oneOf: [
            {
              type: "object",
              required: ["op", "class_type"],
              properties: {
                op: { const: "add_node" },
                id: { type: "string" },
                class_type: { type: "string" }
              }
            },
            {
              type: "object",
              required: ["op", "node", "input", "value"],
              properties: {
                op: { const: "set_input" },
                node: { type: "string" },
                input: { type: "string" },
                value: {}
              }
            },
            {
              type: "object",
              required: ["op", "from", "to"],
              properties: {
                op: { const: "connect" },
                from: {
                  type: "object",
                  required: ["node", "output"],
                  properties: { node: { type: "string" }, output: { type: "integer", minimum: 0 } }
                },
                to: {
                  type: "object",
                  required: ["node", "input"],
                  properties: { node: { type: "string" }, input: { type: "string" } }
                }
              }
            },
            {
              type: "object",
              required: ["op", "node", "input"],
              properties: {
                op: { const: "disconnect" },
                node: { type: "string" },
                input: { type: "string" }
              }
            },
            {
              type: "object",
              required: ["op", "node"],
              properties: {
                op: { const: "remove_node" },
                node: { type: "string" },
                force: { type: "boolean" }
              }
            },
            {
              type: "object",
              required: ["op", "graph"],
              properties: { op: { const: "replace_graph" }, graph: { type: "object" } }
            }
          ]
        }
      }
    };
    TASK_SCHEMA = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "tasks/<task_id>/task.json",
      type: "object",
      required: [
        "task_id",
        "kind",
        "machine_id",
        "status",
        "mode",
        "runs",
        "created_at",
        "next_actions",
        "options"
      ],
      properties: {
        task_id: { type: "string" },
        kind: { enum: ["run", "shot", "retake", "batch", "metadata"] },
        machine_id: { type: "string" },
        request_id: { type: ["string", "null"] },
        status: { enum: ["queued", "running", "succeeded", "failed", "cancelled", "interrupted"] },
        mode: { enum: ["local", "remote"] },
        command: { type: "string" },
        runs: { type: "array", items: { type: "string" } },
        worker: {
          type: ["object", "null"],
          properties: { pid: { type: "integer" }, started_at: { type: "string" } }
        },
        created_at: { type: "string" },
        started_at: { type: ["string", "null"] },
        finished_at: { type: ["string", "null"] },
        error: { type: ["object", "null"] },
        next_actions: { type: "array", items: { type: "string" } },
        options: {
          type: "object",
          properties: {
            workflow: { type: "string" },
            sets: { type: "object" },
            label: { type: "string" },
            shots: { type: "array", items: { type: "string" } },
            steps: { type: "integer" },
            timeout_ms: { type: "integer" },
            engine_url: { type: "string" },
            force: { type: "boolean" }
          }
        }
      }
    };
    RUN_SCHEMA = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "runs/<run_id>/run.json",
      type: "object",
      required: [
        "run_id",
        "task_id",
        "machine_id",
        "workflow",
        "inputs",
        "overrides",
        "engine",
        "status",
        "started_at",
        "finished_at",
        "outputs",
        "error"
      ],
      properties: {
        run_id: { type: "string" },
        task_id: { type: "string" },
        machine_id: { type: "string" },
        request_id: { type: ["string", "null"] },
        label: { type: ["string", "null"] },
        workflow: {
          type: "object",
          required: ["path", "sha256"],
          properties: { path: { type: "string" }, sha256: { type: "string" } }
        },
        inputs: { type: "object" },
        overrides: { type: "object" },
        engine: { type: "object" },
        gpu: { type: "object" },
        status: { enum: ["succeeded", "failed", "cancelled", "interrupted"] },
        prompt_id: { type: ["string", "null"] },
        started_at: { type: "string" },
        finished_at: { type: "string" },
        outputs: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "path", "sha256", "bytes"],
            properties: {
              name: { type: "string" },
              path: { type: "string" },
              sha256: { type: "string" },
              bytes: { type: "integer" }
            }
          }
        },
        error: { type: ["object", "null"] }
      },
      description: "\u8BB0\u5F55\u4E0D\u542B\u7EDD\u5BF9\u8DEF\u5F84\uFF1Bworkflow/inputs \u5FEB\u7167\u4F4D\u4E8E\u540C\u76EE\u5F55\u3002"
    };
  }
});

// src/core/agent/agents-md.mts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "fs";
function agentsBlock() {
  return [AGENTS_BLOCK_START, AGENTS_BLOCK_BODY, AGENTS_BLOCK_END].join("\n");
}
function upsertBlockContent(current) {
  const start = current.indexOf(AGENTS_BLOCK_START);
  const end = current.indexOf(AGENTS_BLOCK_END);
  if (start >= 0 && end > start) {
    return current.slice(0, start) + agentsBlock() + current.slice(end + AGENTS_BLOCK_END.length);
  }
  if (current.trim() === "") return agentsBlock() + "\n";
  return `${current.replace(/\s*$/, "")}

${agentsBlock()}
`;
}
function upsertAgentsBlock(file) {
  try {
    const current = existsSync3(file) ? readFileSync3(file, "utf8") : "";
    writeFileAtomic(file, upsertBlockContent(current));
  } catch (e) {
    if (e instanceof DaoyanCliError) throw e;
    throw new DaoyanCliError({
      code: "skill_write_failed",
      message: `\u5199\u5165 AGENTS.md \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
}
var init_agents_md = __esm({
  "src/core/agent/agents-md.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_contract();
  }
});

// src/core/agent/skill.mts
import { existsSync as existsSync4, readdirSync, readFileSync as readFileSync4, rmSync as rmSync2 } from "fs";
import { join as join2 } from "path";
function renderArgs(args) {
  if (args === void 0 || args.length === 0) return "\uFF08\u65E0\uFF09";
  return args.map(
    (a) => `- \`${a.name}\`\uFF08${a.type}${a.required === true ? "\uFF0C\u5FC5\u586B" : ""}${a.variadic === true ? "\uFF0C\u53EF\u591A\u4E2A" : ""}\uFF09\uFF1A${a.description}`
  ).join("\n");
}
function renderFlags(flags) {
  if (flags === void 0 || flags.length === 0) return "\uFF08\u65E0\uFF09";
  return flags.map((f) => {
    const bits = [f.type];
    if (f.required === true) bits.push("\u5FC5\u586B");
    if (f.enum !== void 0) bits.push(`\u679A\u4E3E ${f.enum.join("|")}`);
    if (f.default !== void 0) bits.push(`\u9ED8\u8BA4 ${JSON.stringify(f.default)}`);
    return `- \`${f.name}\`\uFF08${bits.join("\uFF0C")}\uFF09\uFF1A${f.description}`;
  }).join("\n");
}
function skillMd(version, commands) {
  const index = commands.filter((c) => c.implemented !== false).map((c) => `- \`${c.usage}\` \u2014 ${c.summary}`).join("\n");
  return [
    "---",
    "name: daoyan",
    "description: Agent \u9A71\u52A8\u7684 ComfyUI \u8282\u70B9\u7F16\u8F91\u5668\u4E0E\u6267\u884C\u8FD0\u884C\u65F6\u3002\u9700\u8981\u521B\u5EFA/\u4FEE\u6539 ComfyUI \u5DE5\u4F5C\u6D41\u3001\u67E5\u8BE2\u8282\u70B9\u3001\u6267\u884C\u56FE\u7247/\u89C6\u9891\u751F\u6210\u3001\u5206\u955C\uFF08shot/batch/wrap\uFF09\u3001\u67E5\u770B\u751F\u6210\u4EFB\u52A1\u72B6\u6001\u65F6\u4F7F\u7528\u3002\u6240\u6709\u64CD\u4F5C\u901A\u8FC7 daoyan/dycli \u547D\u4EE4\u5B8C\u6210\uFF0C\u4E0D\u8981\u76F4\u63A5\u8C03\u7528 ComfyUI HTTP\u3002",
    "---",
    "",
    "# daoyan\uFF08dycli\uFF09",
    "",
    `> \u751F\u6210\u7248\u672C\uFF1Av${version}\u3002\u672C\u6587\u4EF6\u7531 \`daoyan skill update\` \u7EF4\u62A4\uFF1B\u547D\u4EE4\u7EC6\u8282\u4EE5 \`daoyan help --json\` \u4E3A\u6700\u7EC8\u6743\u5A01\u3002`,
    "",
    "## \u5B9A\u4F4D",
    "",
    "dycli \u662F**\u7A0B\u5E8F\u5316 ComfyUI \u8282\u70B9\u7F16\u8F91\u5668\u517C\u6267\u884C\u8FD0\u884C\u65F6**\uFF1A",
    "",
    "- \u67E5\u8BE2\u8282\u70B9\u76EE\u5F55\u3001\u589E\u5220\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u3001\u8BBE\u7F6E\u53C2\u6570\u3001\u6821\u9A8C\u5DE5\u4F5C\u6D41\uFF1B",
    "- `run` / `shot` / `batch` \u6267\u884C\u751F\u6210\uFF0C\u7BA1\u7406\u5F15\u64CE\u751F\u547D\u5468\u671F\u4E0E\u4EA7\u7269\uFF1B",
    "- \u5DE5\u4F5C\u6D41\u3001\u4EFB\u52A1\u3001\u8FD0\u884C\u8BB0\u5F55\u90FD\u5728\u9879\u76EE\u5185\uFF0C\u53EF\u76F4\u63A5\u8FDB Git\u3002",
    "",
    "## \u94C1\u5F8B",
    "",
    "1. **\u4E0D\u8981\u76F4\u63A5\u8C03\u7528 ComfyUI HTTP\uFF0C\u4E5F\u4E0D\u8981\u624B\u5DE5\u542F\u52A8/\u505C\u6B62\u5F15\u64CE**\uFF1Blocal \u5F15\u64CE\u7531 task worker \u6309\u9700\u62C9\u8D77\u4E0E\u505C\u6B62\u3002",
    "2. **\u4E0D\u8981\u7F16\u8F91** `engine/`\u3001`logs/`\u3001`.dycli/`\uFF1B\u672C\u673A\u914D\u7F6E\u7531 `daoyan init` \u7BA1\u7406\u3002",
    "3. **\u673A\u5668\u51B3\u7B56\u4E00\u5F8B\u52A0 `--json`**\uFF1B\u975E TTY \u9ED8\u8BA4\u5C31\u662F JSON\u3002",
    "4. **\u540C\u4E00\u8BBE\u5907\u540C\u4E00\u65F6\u523B\u53EA\u5141\u8BB8\u4E00\u4E2A generation task**\uFF1B\u62FF\u5230 `machine_busy` \u65F6\u67E5\u770B owner\uFF0C\u7B49\u5F85\u6216 `run cancel`\uFF0C\u4E0D\u8981\u5E76\u53D1\u91CD\u8BD5\u3002",
    "5. **`run` \u9ED8\u8BA4\u5F02\u6B65**\uFF1A\u8FD4\u56DE `task_id` \u4E0D\u4EE3\u8868\u6210\u529F\uFF1B\u7528 `status --task <id> --wait` \u6216\u8F6E\u8BE2 `status --task <id>`\u3002",
    "6. \u4E0D\u786E\u5B9A\u53C2\u6570\u65F6\u5148\u8FD0\u884C `daoyan help --json`\uFF0C\u4E0D\u8981\u731C\u6D4B\u3002",
    "",
    "## \u5FEB\u901F\u5F00\u59CB",
    "",
    "```bash",
    "# \u65B0\u9879\u76EE\uFF08\u5F53\u524D\u76EE\u5F55\uFF09",
    "daoyan init --mode=local --modelpath /data/models",
    "# \u6216\u8FDE\u63A5\u5DF2\u6709 ComfyUI",
    "daoyan init --mode=remote --url http://gpu-box:8188",
    "",
    "# \u67E5\u8282\u70B9",
    "daoyan workflow nodes --filter KSampler --json",
    "daoyan workflow node KSampler --json",
    "```",
    "",
    "## \u6838\u5FC3\u95ED\u73AF",
    "",
    "```text",
    "workflow nodes \u2192 workflow apply / set \u2192 workflow validate \u2192 run \u2192 status --task --wait \u2192 runs/<id>/outputs",
    "```",
    "",
    "```bash",
    "daoyan workflow new t2v",
    "daoyan workflow import ./from-comfyui.json --name t2v",
    "daoyan workflow apply t2v --ops ./ops.json --json",
    "daoyan workflow validate t2v --json",
    "daoyan run t2v --set seed=42 --label shot:01 --request-id shot-01 --json",
    "daoyan status --task <task_id> --wait --json",
    "```",
    "",
    "## \u5F02\u6B65\u534F\u8BAE\uFF08\u6458\u8981\uFF09",
    "",
    "- \u521B\u5EFA task\uFF1A`run/shot/retake/batch` \u9ED8\u8BA4\u5F02\u6B65\uFF0C\u8FD4\u56DE `task_id`\u3001`status`\u3001`events_path`\u3001`next_actions`\uFF1B",
    "- \u7B49\u5F85\uFF1A`status --task <id> --wait`\uFF1BSIGINT \u53EA\u505C\u6B62\u7B49\u5F85\uFF0C\u4E0D\u53D6\u6D88 worker\uFF1B",
    "- \u53D6\u6D88\uFF1A`run cancel <id>`\uFF1B",
    "- \u5E42\u7B49\uFF1A`--request-id <id>`\uFF0C\u91CD\u8BD5\u8FD4\u56DE\u540C\u4E00\u4E2A task\uFF1B",
    "- \u4E8B\u4EF6\uFF1A`logs --task <id> -f --json`\u3002",
    "",
    "## \u751F\u547D\u5468\u671F",
    "",
    "- local\uFF1A\u4EFB\u52A1\u5F00\u59CB\u62C9\u8D77\u9879\u76EE\u5185 ComfyUI\uFF0C\u4EFB\u52A1\u7ED3\u675F\uFF08\u6210\u529F/\u5931\u8D25/OOM/\u53D6\u6D88\uFF09`/free` + \u505C\u6B62\uFF1B",
    "- remote\uFF1A\u53EA\u8D70 HTTP\uFF0C\u4E0D\u78B0\u8FDC\u7AEF\u8FDB\u7A0B\uFF1B\u4EFB\u52A1\u7ED3\u675F\u6309 `free_after_task` \u7B56\u7565 `/free`\uFF1B",
    "- GPU \u63A5\u7BA1\uFF1A`project.json` \u7684 `gpu.takeover=true` \u65F6\u81EA\u52A8\u5378\u8F7D/\u9A71\u9010\u5185\u7F6E\u76EE\u6807\uFF0C\u4EFB\u52A1\u540E\u6062\u590D\uFF1B\u9ED8\u8BA4\u5173\u95ED\u3002",
    "",
    "## \u7248\u672C\u4E0E Git",
    "",
    "- \u5DE5\u4F5C\u6D41\u771F\u6E90\uFF1A`workflows/*.json`\uFF1B\u6BCF\u6B21 run \u5FEB\u7167\u5230 `runs/<run_id>/`\uFF0C\u4E0D\u53EF\u53D8\uFF1B",
    "- \u4E8C\u8FDB\u5236\u4EA7\u7269\u8D70 Git LFS\uFF1B\u8BB0\u5F55\u4E0D\u542B\u7EDD\u5BF9\u8DEF\u5F84\uFF1B",
    "- \u4E0D\u63D0\u4F9B\u81EA\u5B9A\u4E49 revision/tag\uFF1A\u7528 Git\u3002",
    "",
    "## \u9519\u8BEF\u6062\u590D",
    "",
    "- `machine_busy`\uFF1A\u7B49\u5F85 owner \u6216\u53D6\u6D88\uFF1B\u4E0D\u8981\u5E76\u53D1\u3002",
    "- `engine_oom`\uFF1A\u964D\u4F4E\u5206\u8FA8\u7387/\u5E27\u6570/\u6B65\u6570\uFF0C\u6216\u5F00\u542F `gpu.takeover`\u3002",
    "- `model_not_found` / `node_missing`\uFF1A\u68C0\u67E5 `modelpath` / custom nodes\uFF0C\u4FEE\u6B63\u540E\u91CD\u8BD5\u3002",
    "- `workflow_invalid`\uFF1A`workflow validate <name> --json` \u6309 `issues[]` \u4FEE\u6B63\u3002",
    "- `engine_unreachable`\uFF1Aremote \u6A21\u5F0F\u4E0D\u4F1A\u4EE3\u4E3A\u542F\u52A8\uFF1B\u68C0\u67E5 URL/\u7F51\u7EDC\u3002",
    "",
    "\u5B8C\u6574\u9519\u8BEF\u7801\u89C1 `reference/errors.md`\u3002",
    "",
    "## \u547D\u4EE4\u7D22\u5F15",
    "",
    index,
    "",
    "## \u53C2\u8003",
    "",
    "- `reference/commands.md`\uFF1A\u5168\u90E8\u547D\u4EE4\u3001\u53C2\u6570\u3001flag\u3001JSON",
    "- `reference/config.md`\uFF1Aproject.json / machine.json / task / run \u8BB0\u5F55",
    "- `reference/workflow.md`\uFF1A\u56FE\u6A21\u578B\u3001graph ops\u3001bindings\u3001\u8282\u70B9\u76EE\u5F55",
    "- `reference/lifecycle.md`\uFF1Alocal/remote\u3001\u673A\u5668\u9501\u3001GPU \u63A5\u7BA1\u3001cleanup",
    "- `reference/errors.md`\uFF1A\u9519\u8BEF\u7801\u4E0E\u6062\u590D\u77E9\u9635",
    "- `reference/protocol.md`\uFF1AAgent \u5F02\u6B65\u534F\u8BAE\uFF08start/poll/wait/cancel/retry\uFF09",
    "- `reference/recipes.md`\uFF1Ashot / batch / wrap / \u9996\u5E27\u4E0E\u63A5\u529B",
    ""
  ].join("\n");
}
function commandsMd(commands) {
  const blocks = commands.map((c) => {
    const examples = c.examples !== void 0 && c.examples.length > 0 ? `
\u793A\u4F8B\uFF1A
${c.examples.map((e) => `\`\`\`bash
${e}
\`\`\``).join("\n")}` : "";
    return `## ${c.name}

${c.summary}

\`\`\`text
${c.usage}
\`\`\`

\u53C2\u6570\uFF1A
${renderArgs(c.args)}

Flags\uFF1A
${renderFlags(c.flags)}
${examples}
`;
  });
  return `# \u547D\u4EE4\u53C2\u8003

> \u751F\u6210\u6587\u4EF6\u3002\u6743\u5A01\u5B9A\u4E49\uFF1A\`daoyan help --json\`\u3002

${blocks.join("\n---\n\n")}
`;
}
function configMd() {
  return `# \u914D\u7F6E\u4E0E\u8BB0\u5F55

## project.json\uFF08\u5171\u4EAB\uFF0C\u8FDB Git\uFF09

\`\`\`json
{
  "name": "demo",
  "version": 2,
  "default_workflow": "workflows/t2v.json",
  "gpu": { "takeover": false },
  "comfyui": {
    "version": "v0.3.40",
    "custom_nodes": [
      { "name": "ComfyUI-VideoHelperSuite", "repo": "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git", "ref": "v1.7.4" }
    ]
  }
}
\`\`\`

- \u4E0D\u542B\u7EDD\u5BF9\u8DEF\u5F84\u3001\u4E0D\u542B\u673A\u5668\u5DEE\u5F02\uFF1B
- \`gpu.takeover\` \u662F\u9879\u76EE\u7EA7\u7B56\u7565\uFF0C\u9ED8\u8BA4 false\uFF1Bremote \u5FFD\u7565\u3002

JSON Schema\uFF1A

\`\`\`json
${JSON.stringify(PROJECT_SCHEMA, null, 2)}
\`\`\`

## .dycli/machine.json\uFF08\u672C\u673A\uFF0Cgitignored\uFF09

local\uFF1A

\`\`\`json
{
  "machine_id": "mac-studio",
  "engine": {
    "mode": "local",
    "modelpath": "/data/models",
    "models_config": null,
    "port": 8188,
    "launch_extra": ["--lowvram"]
  },
  "overrides": {
    "workflows/t2v.json": { "5.width": 512, "5.height": 768, "7.steps": 20 }
  }
}
\`\`\`

remote\uFF1A

\`\`\`json
{
  "machine_id": "mac-studio",
  "engine": { "mode": "remote", "url": "http://gpu-box:8188", "free_after_task": "when_idle" }
}
\`\`\`

\u4F18\u5148\u7EA7\uFF1Aworkflow \u6587\u4EF6 < machine overrides < \`--set\`\u3002

JSON Schema\uFF1A

\`\`\`json
${JSON.stringify(MACHINE_SCHEMA, null, 2)}
\`\`\`

## tasks/<task_id>/task.json

\`\`\`json
{
  "task_id": "t_20261019T153012-mac-7f3a",
  "kind": "run",
  "machine_id": "mac-studio",
  "request_id": "agent-7f3a-001",
  "status": "queued",
  "mode": "local",
  "runs": ["r_..."],
  "worker": { "pid": 12345, "started_at": "..." },
  "created_at": "...",
  "started_at": null,
  "finished_at": null,
  "error": null,
  "next_actions": ["status --task <id> --wait"],
  "options": { "workflow": "workflows/t2v.json", "sets": { "7.seed": 1101 } }
}
\`\`\`

\`events.jsonl\` \u6BCF\u884C\u4E00\u4E2A\u4E8B\u4EF6\uFF1A\`{seq, ts, type, data}\`\u3002

## runs/<run_id>/run.json

- \u4E0D\u542B\u7EDD\u5BF9\u8DEF\u5F84\uFF1B
- \`workflow.json\` \u662F\u5B9E\u9645\u63D0\u4EA4\u7684\u56FE\u5FEB\u7167\uFF1B
- \`inputs.json\` \u8BB0\u5F55\u903B\u8F91\u8F93\u5165\u4E0E\u8F93\u5165\u6587\u4EF6\u54C8\u5E0C\uFF1B
- \`outputs/\` \u662F\u4E0B\u8F7D\u540E\u7684\u4EA7\u7269\uFF1B
- \`engine.cleanup\` \u8BB0\u5F55 interrupt/free/stop/scratch/gpu_restore\uFF1B
- \`gpu\` \u4EC5\u5728 local \u4E14\u53D1\u751F\u63A5\u7BA1\u65F6\u51FA\u73B0\u3002

JSON Schema\uFF1A

\`\`\`json
${JSON.stringify(RUN_SCHEMA, null, 2)}
\`\`\`
`;
}
function workflowMd() {
  return `# \u5DE5\u4F5C\u6D41\u7F16\u8F91

## \u56FE\u6A21\u578B

\u5DE5\u4F5C\u6D41\u5C31\u662F ComfyUI API JSON\uFF1A

\`\`\`json
{
  "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "sdxl.safetensors" } },
  "6": { "class_type": "CLIPTextEncode", "inputs": { "text": "a cat", "clip": ["4", 1] } }
}
\`\`\`

- \u9876\u5C42 key \u662F\u8282\u70B9 ID\uFF1B
- \u8FDE\u7EBF\u662F \`[sourceNodeId, outputIndex]\`\uFF1B
- \u8282\u70B9 ID \u4E00\u65E6\u521B\u5EFA\u4FDD\u6301\u7A33\u5B9A\u3002

JSON Schema\uFF1A

\`\`\`json
${JSON.stringify(WORKFLOW_SCHEMA, null, 2)}
\`\`\`

## \u8282\u70B9\u76EE\u5F55

- \u6570\u636E\u6E90\uFF1AComfyUI \`/object_info\`\uFF1B
- \u7F13\u5B58\uFF1A\`.dycli/node_catalog.json\`\uFF1B
- \`workflow nodes\` \u9ED8\u8BA4\u8BFB\u7F13\u5B58\uFF1B\u7F3A\u5931\u65F6 remote \u76F4\u63A5\u62C9\u53D6\uFF0Clocal \u9700\u8981 \`--refresh\`\uFF08metadata session\uFF0C\u4E0D\u52A0\u8F7D\u6A21\u578B\uFF0C\u53D6\u5B8C\u5373\u505C\uFF09\uFF1B
- \u4EFB\u52A1\u9884\u68C0\u4F1A\u5F3A\u5236\u5237\u65B0\u7F13\u5B58\u3002

\`\`\`bash
daoyan workflow nodes --filter KSampler --limit 20 --json
daoyan workflow node KSampler --json
daoyan workflow nodes --refresh --json
\`\`\`

## graph ops

\`\`\`bash
daoyan workflow apply t2v --ops ./ops.json --json
\`\`\`

\`\`\`json
{
  "ops": [
    { "op": "add_node", "id": "4", "class_type": "CheckpointLoaderSimple" },
    { "op": "set_input", "node": "4", "input": "ckpt_name", "value": "sdxl.safetensors" },
    { "op": "add_node", "id": "6", "class_type": "CLIPTextEncode" },
    { "op": "connect", "from": { "node": "4", "output": 1 }, "to": { "node": "6", "input": "clip" } },
    { "op": "set_input", "node": "6", "input": "text", "value": "a cat" }
  ]
}
\`\`\`

\u8BED\u4E49\uFF1A

- **\u5148\u5168\u91CF\u6821\u9A8C\uFF0C\u518D\u539F\u5B50\u5199\u76D8**\uFF1B\u5931\u8D25\u6587\u4EF6\u4E0D\u53D8\uFF1B
- \`connect\` \u8986\u76D6\u5DF2\u6709\u8FDE\u7EBF\u65F6\u8FD4\u56DE warning\uFF1B
- \`remove_node\` \u88AB\u5F15\u7528\u65F6\u9ED8\u8BA4\u62D2\u7EDD\uFF0C\`force:true\` \u540C\u65F6\u5220\u9664\u5173\u8054\u8FDE\u7EBF\uFF1B
- \u7ED3\u679C\u542B \`assigned_ids\`\u3001\`changed_nodes\`\u3001\`removed_links\`\u3001\`graph_sha256\`\u3002

JSON Schema\uFF1A

\`\`\`json
${JSON.stringify(GRAPH_OPS_SCHEMA, null, 2)}
\`\`\`

## bindings

\`workflows/<name>.bindings.json\`\uFF1A

\`\`\`json
{
  "prompt": "5.prompt",
  "negative": "4.text",
  "seed": "7.seed",
  "steps": "7.steps",
  "first_frame": "0.image",
  "width": "5.width",
  "height": "5.height"
}
\`\`\`

- \`run\` \u4E0D\u9700\u8981 bindings\uFF1B\`shot/batch\` \u5FC5\u987B\u6709 bindings\uFF0C\u4E14\u81F3\u5C11\u6620\u5C04 \`prompt\` \u4E0E \`seed\`\uFF1B
- JSON Schema\uFF1A

\`\`\`json
${JSON.stringify(BINDINGS_SCHEMA, null, 2)}
\`\`\`

## \u6821\u9A8C

- \`workflow validate <name>\`\uFF1A\u79BB\u7EBF\u7ED3\u6784 + bindings + overrides +\uFF08\u6709\u7F13\u5B58\u65F6\uFF09\u8282\u70B9\u7C7B/\u679A\u4E3E\uFF1B
- \u4EFB\u52A1\u9884\u68C0\uFF1A\`/object_info\` \u5728\u7EBF\u6743\u5A01\u6821\u9A8C\uFF0C\u7F3A\u8282\u70B9 \`node_missing\`\uFF0C\u7F3A\u6A21\u578B \`model_not_found\`\u3002

## \u5BFC\u5165 ComfyUI \u5BFC\u51FA

\`workflow import\` \u63A5\u53D7 Save (API Format) \u7684 JSON\uFF0C\u4E0D\u91CD\u547D\u540D\u8282\u70B9\uFF1B\u76F4\u63A5\u53EF\u6267\u884C\u3002
`;
}
function lifecycleMd() {
  return `# \u5F15\u64CE\u751F\u547D\u5468\u671F

## local

\`\`\`text
task start \u2192 machine lock \u2192 \u56DE\u6536\u6B8B\u7559\u5F15\u64CE \u2192 \u6062\u590D\u65E7 GPU \u79DF\u7EA6
  \u2192 GPU \u63A5\u7BA1\uFF08gpu.takeover=true\uFF09
  \u2192 spawn ComfyUI \u2192 /system_stats \u5C31\u7EEA
  \u2192 \u9884\u68C0 \u2192 \u4E0A\u4F20 \u2192 \u63D0\u4EA4 \u2192 \u8F6E\u8BE2
  \u2192 \u4E0B\u8F7D\u4EA7\u7269
  \u2192 cleanup\uFF1Ainterrupt\uFF08\u5982\u9700\uFF09\u2192 /free \u2192 SIGTERM/SIGKILL \u2192 GPU \u6062\u590D \u2192 \u91CA\u653E\u9501
\`\`\`

- \u4EFB\u52A1\u4E4B\u5916\u6CA1\u6709\u5E38\u9A7B\u5F15\u64CE\uFF1B\`status\` \u4E0D\u62C9\u8D77\u5F15\u64CE\uFF1B
- \u552F\u4E00\u4F8B\u5916\uFF1A\`workflow nodes --refresh\` \u7684 metadata session\uFF08\u4E0D\u52A0\u8F7D\u6A21\u578B\uFF0C\u53D6\u5B8C /object_info \u7ACB\u5373\u505C\u6B62\uFF09\u3002

## remote

- \u4E0D\u542F\u52A8\u3001\u4E0D\u505C\u6B62\u3001\u4E0D\u6740\u8FDC\u7AEF\u8FDB\u7A0B\uFF1B
- \u4EFB\u52A1\u5F00\u59CB\u63A2\u6D4B URL \u4E0E\u961F\u5217\uFF1B\u961F\u5217\u5FD9\u8FD4\u56DE \`engine_busy\`\uFF0C\u4E0D\u63D0\u4EA4\uFF1B
- \u4EFB\u52A1\u7ED3\u675F\u6309 \`free_after_task\`\uFF1A
  - \`always\`\uFF1A\u7ACB\u5373 \`/free\`\uFF1B
  - \`when_idle\`\uFF08\u9ED8\u8BA4\uFF09\uFF1A\u961F\u5217\u7A7A\u95F2\u624D \`/free\`\uFF1B
  - \`never\`\uFF1A\u4E0D\u91CA\u653E\u3002

## \u673A\u5668\u7EA7\u5355\u4EFB\u52A1\u9501

- \u9501\u6587\u4EF6 \`~/.dycli/machine.lock\`\uFF0C\u6309 OS \u7528\u6237\u9694\u79BB\uFF1B
- \u540C\u4E00\u8BBE\u5907\u540C\u4E00\u65F6\u523B\u53EA\u5141\u8BB8\u4E00\u4E2A generation task\uFF1Blocal \u4E0E remote \u5171\u7528\uFF1B
- \u7B2C\u4E8C\u4E2A\u4EFB\u52A1\u7ACB\u5373 \`machine_busy\`\uFF0C\u4E0D\u6392\u961F\uFF1B
- \u9501\u8BB0\u5F55 owner\uFF08task_id / pid / project / mode / command / started_at\uFF09\uFF1B
- owner \u5DF2\u6B7B\uFF1A\u4E0B\u4E00\u6B21\u4EFB\u52A1\u81EA\u52A8\u505A stale \u6062\u590D\uFF08task \u2192 interrupted\u3001\u505C\u6B8B\u7559\u5F15\u64CE\u3001\u6062\u590D GPU \u79DF\u7EA6\uFF09\u3002

## GPU \u63A5\u7BA1\uFF08\u9ED8\u8BA4\u5173\u95ED\uFF09

- \u5F00\u5173\uFF1A\`project.json\` \u7684 \`gpu.takeover\`\uFF1B
- \u5E73\u53F0\uFF1ALinux + NVIDIA\uFF1B\u5176\u4ED6\u5E73\u53F0\u7ED9 \`gpu_unsupported\` \u8B66\u544A\uFF0C\u4EFB\u52A1\u7EE7\u7EED\uFF1B
- \u5185\u7F6E\u6A21\u578B\u670D\u52A1\uFF1Aollama\u3001LM Studio\u3001xinference \u2014\u2014 \u5378\u8F7D\u6A21\u578B\uFF0C\u4FDD\u7559\u8FDB\u7A0B\uFF0C\u4EFB\u52A1\u540E\u91CD\u8F7D\uFF1B
- \u5185\u7F6E\u8FDB\u7A0B\u670D\u52A1\uFF1AvLLM\u3001TGI\u3001llama.cpp server\u3001SGLang \u2014\u2014 SIGTERM/SIGKILL\uFF0C\u4EFB\u52A1\u540E best-effort \u91CD\u542F\uFF1B
- \u5BB9\u5668\uFF1A\u901A\u8FC7 cgroup \u8BC6\u522B Docker / Podman / containerd / k8s \u5185\u7684 ollama/xinference/LM Studio/vLLM\uFF1B\u53EA\u5378\u8F7D\u6A21\u578B\uFF0C\u4E0D\u505C\u6B62\u5BB9\u5668\u6216\u8FDB\u7A0B\uFF1B\u901A\u8FC7\u7AEF\u53E3\u6620\u5C04\u3001nsenter \u6216\u5BB9\u5668\u5185 CLI/Python \u8BBF\u95EE\uFF0C\u4E0D\u9700\u8981 kubectl\uFF1B
- \u5BB9\u5668\u5185 vLLM \u4EC5\u5728\u542F\u7528 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1 \u65F6\u81EA\u52A8 sleep\uFF1B\u88F8\u673A vLLM \u4ECD\u8D70\u8FDB\u7A0B\u63A5\u7BA1\uFF1B\u5BB9\u5668\u5185 TGI/llama.cpp/SGLang \u6CA1\u6709\u901A\u7528\u65E0\u505C\u673A\u5378\u8F7D\u80FD\u529B\u65F6\u53EA\u63D0\u793A\uFF0C\u4E0D\u505C\u6B62\u5BB9\u5668\uFF1B
- \u672A\u77E5\u8FDB\u7A0B/\u5BB9\u5668\u6C38\u4E0D\u5904\u7406\uFF1B
- \u79DF\u7EA6\uFF1A\`~/.dycli/gpu/lease.json\`\uFF0C\u5F02\u5E38\u9000\u51FA\u540E\u4E0B\u4E00\u6B21 local \u4EFB\u52A1\u5148\u6062\u590D\uFF1B
- \u6062\u590D\u5931\u8D25\uFF1A\`gpu_restore_failed\`\uFF0C\u79DF\u7EA6\u4FDD\u7559\u91CD\u8BD5\u3002

## \u53D6\u6D88\u4E0E\u4FE1\u53F7

- \`run cancel <task_id>\`\uFF1Aworker \u6267\u884C interrupt \u2192 free \u2192 stop \u2192 restore\uFF0C\u5199 \`cancelled\`\uFF1B
- \`--wait\` \u524D\u53F0 SIGINT\uFF1A\u53EA\u505C\u6B62\u7B49\u5F85\uFF0C\u4E0D\u53D6\u6D88 task\uFF1B
- worker \u88AB SIGKILL\uFF1A\u9501/\u79DF\u7EA6\u4FDD\u7559\uFF0C\u4E0B\u4E00\u6B21\u4EFB\u52A1 stale \u6062\u590D\u3002
`;
}
function errorsMd() {
  const rows = errorCatalog().map(
    (e) => `| \`${String(e.code)}\` | ${e.retryable === true ? "\u53EF\u91CD\u8BD5" : "\u4E0D\u53EF\u91CD\u8BD5"} | ${String(
      e.retry_after_ms ?? "-"
    )} | ${String(e.hint)} |`
  ).join("\n");
  return `# \u9519\u8BEF\u7801

\u9519\u8BEF\u4FE1\u5C01\uFF1A

\`\`\`json
{
  "ok": false,
  "schema_version": 1,
  "error": {
    "code": "machine_busy",
    "message": "...",
    "retryable": true,
    "retry_after_ms": 5000,
    "hint": "...",
    "task_id": "...",
    "run_id": null,
    "next_actions": ["status --task <id>", "run cancel <id>"],
    "details": {}
  }
}
\`\`\`

| code | \u91CD\u8BD5 | retry_after_ms | hint |
|---|---|---|---|
${rows}

## \u6062\u590D\u77E9\u9635

- \`machine_busy\`\uFF1A\u7B49\u5F85 owner \u6216 \`run cancel\`\uFF1B\u4E0D\u8981\u5E76\u53D1\u3002
- \`engine_busy\`\uFF08remote\uFF09\uFF1A\u7B49\u8FDC\u7AEF\u961F\u5217\u7A7A\u95F2\u3002
- \`engine_oom\`\uFF1A\u964D\u5206\u8FA8\u7387/\u5E27\u6570/\u6B65\u6570\uFF0C\u6216\u5F00\u542F GPU \u63A5\u7BA1\u3002
- \`model_not_found\` / \`node_missing\`\uFF1A\u4FEE modelpath / custom nodes\u3002
- \`workflow_invalid\`\uFF1A\u6309 \`issues[]\` \u4FEE\u56FE\u6216 bindings\u3002
- \`engine_unreachable\`\uFF1Aremote \u4E0D\u4EE3\u542F\uFF1B\u68C0\u67E5 URL/\u7F51\u7EDC\u3002
- \`worker_crashed\` / \`machine_lock_corrupt\`\uFF1A\u4E0B\u4E00\u6B21\u4EFB\u52A1\u4F1A\u505A stale \u6062\u590D\uFF1B\u9501\u635F\u574F\u9700\u4EBA\u5DE5\u786E\u8BA4\u540E\u5220\u9664\u3002

\u9000\u51FA\u7801\uFF1A0 \u6210\u529F\uFF1B1 \u4E1A\u52A1\u5931\u8D25\uFF1B2 \u7528\u6CD5\u9519\u8BEF\uFF1B130 \u53D6\u6D88/\u4E2D\u65AD\u3002
`;
}
function protocolMd() {
  return `# Agent \u5F02\u6B65\u534F\u8BAE

## \u542F\u52A8

\`\`\`bash
daoyan run t2v --set seed=42 --label shot:01 --request-id agent-001 --json
\`\`\`

\u8FD4\u56DE\uFF1A

\`\`\`json
{
  "ok": true,
  "schema_version": 1,
  "data": {
    "task_id": "t_...",
    "run_id": null,
    "state": "queued",
    "events_path": "tasks/t_.../events.jsonl",
    "next_actions": ["status --task t_... --wait", "logs --task t_... -f", "run cancel t_..."]
  }
}
\`\`\`

\u9000\u51FA\u7801 0 \u53EA\u4EE3\u8868 task \u521B\u5EFA\u6210\u529F\uFF0C**\u4E0D\u4EE3\u8868\u751F\u6210\u6210\u529F**\u3002

## \u8F6E\u8BE2

\`\`\`bash
daoyan status --task <task_id> --json
daoyan status --task <task_id> --wait --json
\`\`\`

- \u7EC8\u6001\uFF1A\`succeeded|failed|cancelled|interrupted\`\uFF1B
- \`--wait\` \u7684 SIGINT \u53EA\u505C\u6B62\u7B49\u5F85\uFF1Btask \u7EE7\u7EED\uFF0C\u7528 \`run cancel\` \u624D\u53D6\u6D88\uFF1B
- \u4E8B\u4EF6\u6D41\uFF1A\`daoyan logs --task <task_id> -f --json\`\u3002

## \u53D6\u6D88

\`\`\`bash
daoyan run cancel <task_id> --json
\`\`\`

worker \u6267\u884C interrupt \u2192 free \u2192 stop \u2192 restore\uFF0C\u7136\u540E\u5199\u7EC8\u6001\u3002

## \u5E42\u7B49

- \`--request-id <id>\` \u5199\u5165 task\uFF1B\u540C\u4E00 id \u91CD\u8BD5\u8FD4\u56DE\u539F task\uFF1B
- \u5DF2 failed/cancelled \u7684\u4EFB\u52A1\u91CD\u8BD5\u4ECD\u8FD4\u56DE\u539F\u7ED3\u679C\uFF1B\u4FEE\u590D\u540E\u6362\u65B0 id\u3002

## machine_busy

\u540C\u4E00\u8BBE\u5907\u53EA\u5141\u8BB8\u4E00\u4E2A generation task\uFF1A

\`\`\`json
{
  "code": "machine_busy",
  "retryable": true,
  "retry_after_ms": 5000,
  "details": { "owner": { "task_id": "...", "pid": 123, "project": "..." } },
  "next_actions": ["status --task ...", "run cancel ..."]
}
\`\`\`

\u5904\u7406\uFF1A\u7B49\u5F85 \`retry_after_ms\` \u91CD\u8BD5\uFF0C\u6216\u68C0\u67E5 owner / \u53D6\u6D88\u3002

## \u89C2\u6D4B run

\`\`\`bash
daoyan status --run <run_id> --json
daoyan logs --run <run_id> --json
\`\`\`

\u4EA7\u7269\u5728 \`runs/<run_id>/outputs/\`\uFF1B\`run.json\` \u8BB0\u5F55 workflow \u54C8\u5E0C\u3001inputs\u3001engine\u3001cleanup\u3001error\u3002
`;
}
function recipesMd() {
  return `# Recipe\uFF1Ashot / batch / wrap

## \u524D\u7F6E

- \`shots.json\` \u63CF\u8FF0\u955C\u5934\uFF1B
- \u6BCF\u4E2A\u955C\u5934\u4F7F\u7528 \`workflow\`\uFF08\u5355\u955C / \u6587\u4EF6\u7EA7 / project.default_workflow\uFF09\uFF1B
- workflow \u5FC5\u987B\u6709 \`<name>.bindings.json\`\uFF0C\u81F3\u5C11\u6620\u5C04 \`prompt\` \u4E0E \`seed\`\u3002

\`\`\`json
{
  "workflow": "t2v",
  "meta": { "width": 768, "height": 1344, "anchors": { "S1": "anchors/scene.png" } },
  "defaults": { "steps": 30, "cfg": 4.0, "negative": "\u4F4E\u8D28\u91CF" },
  "style_prefix": "\u7535\u5F71\u611F",
  "shots": [
    { "id": "01", "seed": 1101, "first_frame": "S1", "prompt": "..." },
    { "id": "02", "seed": 1102, "first_frame": { "relay": "01" }, "prompt": "..." }
  ]
}
\`\`\`

## \u62CD\u6444

\`\`\`bash
daoyan shot 01 02 --json
daoyan status --task <task_id> --wait --json
daoyan retake 02 --json
daoyan batch --json
\`\`\`

- \u4E00\u4E2A task \u5305\u542B\u591A\u4E2A run\uFF0C\u5171\u7528\u4E00\u4E2A\u5F15\u64CE\u4F1A\u8BDD\u3001\u4E00\u628A\u673A\u5668\u9501\uFF1B
- \u5DF2\u6709\u6210\u529F run \u7684\u955C\u5934\u9ED8\u8BA4\u8DF3\u8FC7\uFF08retake \u5F3A\u5236\uFF09\uFF1B
- \u4E2D\u9014 OOM / \u5F15\u64CE\u5D29\u6E83\uFF1A\u4E2D\u65AD\u6574\u4E2A task\uFF1B\u666E\u901A\u4E1A\u52A1\u9519\u8BEF\u7EE7\u7EED\u540E\u7EED\u955C\u5934\uFF0Ctask \u6700\u7EC8 failed\u3002

## \u9996\u5E27\u4E0E\u63A5\u529B

- \`first_frame\`: \u951A\u70B9 key -> \`meta.anchors\` \u6587\u4EF6\uFF1B
- \`{"relay":"01"}\`: \u53D6\u4E0A\u6E38\u955C\u5934\u6700\u65B0\u6210\u529F run \u7684\u4EA7\u7269\u5C3E\u5E27\uFF08\`relay_frames/\` \u7F13\u5B58\uFF09\uFF1B
- bindings \u5FC5\u987B\u6709 \`first_frame\` \u6620\u5C04\uFF08LoadImage.image \u7B49\uFF09\uFF1B
- \u4E0A\u4F20\u8D70 \`/upload/image\`\uFF0C\u4E0D\u5199\u5F15\u64CE input \u76EE\u5F55\u3002

## \u5408\u7247

\`\`\`bash
daoyan wrap --json
daoyan wrap --select 01=<run_id> --select 02=<run_id> --json
\`\`\`

- \u9ED8\u8BA4\u6309\u955C\u5934\u987A\u5E8F\u9009\u6BCF\u955C\u6700\u65B0\u6210\u529F run\uFF1B
- \u8F93\u51FA \`final/cut-<timestamp>.mp4\` + \`cut-<timestamp>.json\`\uFF08\u8BB0\u5F55\u9009\u4E2D\u7684 run/artifact\uFF09\uFF1B
- wrap \u662F CPU \u540E\u5904\u7406\uFF0C\u4E0D\u5360\u673A\u5668\u9501\u3002

## \u56DE\u6EDA / \u590D\u8DD1

\`\`\`bash
daoyan run runs/<run_id>/workflow.json --set seed=999 --wait
\`\`\`

Git \u7BA1\u7406\u5DE5\u4F5C\u6D41\u5386\u53F2\uFF1Brun \u5FEB\u7167\u4E0D\u53EF\u53D8\uFF0C\u91CD\u62CD\u4E0D\u8986\u76D6\u3002
`;
}
function generateSkillFiles(version, commands) {
  const files = /* @__PURE__ */ new Map();
  files.set("SKILL.md", skillMd(version, commands));
  files.set("reference/commands.md", commandsMd(commands));
  files.set("reference/config.md", configMd());
  files.set("reference/workflow.md", workflowMd());
  files.set("reference/lifecycle.md", lifecycleMd());
  files.set("reference/errors.md", errorsMd());
  files.set("reference/protocol.md", protocolMd());
  files.set("reference/recipes.md", recipesMd());
  return files;
}
function skillHash(files) {
  const parts = [...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([p, c]) => `${p}
${c}`);
  return sha256(parts.join("\n\0\n"));
}
function skillDir(root) {
  return join2(root, SKILL_DIR);
}
function writeSkill(root, version, commands) {
  const files = generateSkillFiles(version, commands);
  const hash = skillHash(files);
  const dir = skillDir(root);
  try {
    for (const [rel, content] of files) {
      writeFileAtomic(join2(dir, rel), content);
    }
    const refDir = join2(dir, "reference");
    if (existsSync4(refDir)) {
      for (const name of readdirSync(refDir)) {
        if (!name.endsWith(".md")) continue;
        if (!files.has(`reference/${name}`)) rmSync2(join2(refDir, name), { force: true });
      }
    }
    const versionFile = {
      generated_by: `daoyan v${version}`,
      generated_at: nowIso(),
      hash,
      files: files.size
    };
    writeFileAtomic(join2(dir, "VERSION"), JSON.stringify(versionFile, null, 2) + "\n");
    upsertAgentsBlock(join2(root, AGENTS_FILE));
  } catch (e) {
    if (e instanceof DaoyanCliError) throw e;
    throw new DaoyanCliError({
      code: "skill_write_failed",
      message: `\u751F\u6210\u9879\u76EE\u5185 Skill \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
  return { dir, hash, files: files.size };
}
function skillState(root, version, commands) {
  const dir = skillDir(root);
  const expected = generateSkillFiles(version, commands);
  const expectedHash = skillHash(expected);
  const versionFile = join2(dir, "VERSION");
  const missing = [];
  for (const rel of expected.keys()) {
    if (!existsSync4(join2(dir, rel))) missing.push(rel);
  }
  if (!existsSync4(versionFile)) missing.push("VERSION");
  const agentsFile = join2(root, AGENTS_FILE);
  const agentsOk = existsSync4(agentsFile) && readFileSync4(agentsFile, "utf8").includes("<!-- daoyan:skill:start -->");
  if (!existsSync4(join2(dir, "SKILL.md"))) {
    return {
      present: false,
      path: SKILL_DIR,
      version: null,
      generated_at: null,
      stale: true,
      missing_files: missing,
      agents_block: agentsOk,
      expected_hash: expectedHash
    };
  }
  let generatedAt = null;
  let generatedBy = null;
  let hash = null;
  try {
    const raw = JSON.parse(readFileSync4(versionFile, "utf8"));
    generatedAt = raw.generated_at ?? null;
    generatedBy = raw.generated_by ?? null;
    hash = raw.hash ?? null;
  } catch {
  }
  const expectedBy = `daoyan v${version}`;
  return {
    present: true,
    path: SKILL_DIR,
    version: generatedBy,
    generated_at: generatedAt,
    stale: hash !== expectedHash || generatedBy !== expectedBy || missing.length > 0 || !agentsOk,
    missing_files: missing,
    agents_block: agentsOk,
    expected_hash: expectedHash
  };
}
var init_skill = __esm({
  "src/core/agent/skill.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
    init_contract();
    init_agents_md();
  }
});

// src/commands/help.mts
function buildAgentDoc(version, commands, root = null) {
  let skill = null;
  if (root !== null) {
    try {
      const state = skillState(root, version, commands);
      skill = {
        path: state.path,
        present: state.present,
        version: state.version,
        stale: state.stale,
        agents_block: state.agents_block
      };
    } catch {
      skill = null;
    }
  }
  return {
    name: "daoyan",
    version,
    tagline: "Agent-driven ComfyUI node editor and execution runtime",
    schema_version: 1,
    capabilities: capabilities(),
    modes: {
      local: "\u9879\u76EE\u4E13\u5C5E ComfyUI\uFF1Btask \u5F00\u59CB\u62C9\u8D77\uFF0C\u7ED3\u675F /free + \u505C\u6B62\uFF1B\u53EF\u5F00\u542F GPU \u63A5\u7BA1",
      remote: "\u5916\u90E8 ComfyUI\uFF1B\u53EA\u8D70 HTTP\uFF0C\u4E0D\u542F\u52A8/\u505C\u6B62/\u6740\u8FDB\u7A0B\uFF1B\u4EFB\u52A1\u7ED3\u675F\u6309\u7B56\u7565 /free"
    },
    commands: commands.map((c) => ({
      name: c.name,
      group: c.group,
      summary: c.summary,
      usage: c.usage,
      implemented: c.implemented ?? false,
      args: c.args ?? [],
      flags: c.flags ?? [],
      examples: c.examples ?? [],
      ...c.jsonShape !== void 0 ? { output: c.jsonShape } : {}
    })),
    output_envelope: {
      success: { ok: true, schema_version: 1, data: "\u2026" },
      failure: {
        ok: false,
        schema_version: 1,
        error: {
          code: "machine_busy",
          message: "another task is running",
          retryable: true,
          retry_after_ms: 5e3,
          hint: "\u2026",
          task_id: "t_\u2026",
          run_id: null,
          next_actions: ["status --task <id>", "run cancel <id>"],
          details: {}
        }
      }
    },
    exit_codes: {
      "0": "\u6210\u529F / task \u5DF2\u521B\u5EFA\uFF08\u9ED8\u8BA4\u5F02\u6B65\u4E0D\u4EE3\u8868\u751F\u6210\u6210\u529F\uFF09",
      "1": "\u4E1A\u52A1\u5931\u8D25 / task \u5931\u8D25",
      "2": "\u7528\u6CD5\u9519\u8BEF",
      "130": "\u53D6\u6D88\u6216\u524D\u53F0\u7B49\u5F85\u88AB SIGINT \u4E2D\u65AD"
    },
    errors: errorCatalog(),
    schemas: {
      project: PROJECT_SCHEMA,
      machine: MACHINE_SCHEMA,
      workflow: WORKFLOW_SCHEMA,
      bindings: BINDINGS_SCHEMA,
      graph_ops: GRAPH_OPS_SCHEMA,
      task: TASK_SCHEMA,
      run: RUN_SCHEMA
    },
    skill
  };
}
function printMainHelp(commands, version) {
  const lines = [
    "daoyan \u2014\u2014 Agent \u9A71\u52A8\u7684 ComfyUI \u8282\u70B9\u7F16\u8F91\u5668 + \u6267\u884C\u8FD0\u884C\u65F6\uFF08dycli \u7B49\u4EF7\uFF09",
    "",
    "\u7528\u6CD5: daoyan [\u5168\u5C40\u53C2\u6570] <\u547D\u4EE4> [\u53C2\u6570...]",
    "",
    "\u5168\u5C40\u53C2\u6570:",
    "  --json            \u673A\u5668\u53EF\u8BFB\u4FE1\u5C01\uFF08\u975E TTY \u9ED8\u8BA4\u5F00\u542F\uFF09",
    "  --no-json         \u5F3A\u5236\u4EBA\u7C7B\u6587\u672C",
    "  --project <\u8DEF\u5F84>   \u6307\u5B9A\u9879\u76EE\u76EE\u5F55\uFF08\u9ED8\u8BA4\u5411\u4E0A\u5BFB\u627E project.json\uFF09",
    "  --no-color        \u5173\u95ED\u5F69\u8272\u8F93\u51FA",
    "  -h, --help        \u5E2E\u52A9\uFF1Bdaoyan help <\u547D\u4EE4>",
    "  -v, --version     \u7248\u672C",
    "",
    "\u6838\u5FC3\u7EA6\u5B9A:",
    "  - generation task \u9ED8\u8BA4\u5F02\u6B65\uFF1B\u7528 status --task <id> --wait \u7B49\u7EC8\u6001",
    "  - \u540C\u4E00\u8BBE\u5907\u540C\u4E00\u65F6\u523B\u53EA\u5141\u8BB8\u4E00\u4E2A task\uFF1B\u5FD9\u65F6\u8FD4\u56DE machine_busy",
    "  - local \u5F15\u64CE\u53EA\u5728\u4EFB\u52A1\u671F\u95F4\u5B58\u5728\uFF1Bremote \u53EA\u8D70 HTTP",
    ""
  ];
  for (const g of Object.keys(GROUP_LABEL)) {
    const groupCommands = commands.filter((x) => x.group === g && x.implemented !== false);
    if (groupCommands.length === 0) continue;
    lines.push(`${GROUP_LABEL[g]}:`);
    for (const c of groupCommands) {
      lines.push(`  ${c.usage.split("\n")[0]}`);
      lines.push(`    ${c.summary}`);
    }
    lines.push("");
  }
  lines.push(`daoyan v${version} \xB7 \u673A\u5668\u5951\u7EA6: daoyan help --json`);
  process.stdout.write(lines.join("\n") + "\n");
}
function printCommandHelp(meta) {
  const lines = [meta.usage, `  ${meta.summary}`];
  if (meta.args !== void 0 && meta.args.length > 0) {
    lines.push("", "\u53C2\u6570:");
    for (const a of meta.args) {
      lines.push(`  ${a.name} (${a.type}${a.required === true ? "\uFF0C\u5FC5\u586B" : ""}${a.variadic === true ? "\uFF0C\u53EF\u591A\u4E2A" : ""}) \u2014 ${a.description}`);
    }
  }
  if (meta.flags !== void 0 && meta.flags.length > 0) {
    lines.push("", "Flags:");
    for (const f of meta.flags) {
      const bits = [f.type];
      if (f.required === true) bits.push("\u5FC5\u586B");
      if (f.enum !== void 0) bits.push(f.enum.join("|"));
      if (f.default !== void 0) bits.push(`\u9ED8\u8BA4 ${JSON.stringify(f.default)}`);
      lines.push(`  ${f.name} (${bits.join("\uFF0C")}) \u2014 ${f.description}`);
    }
  }
  if (meta.examples !== void 0 && meta.examples.length > 0) {
    lines.push("", "\u793A\u4F8B:");
    for (const e of meta.examples) lines.push(`  ${e}`);
  }
  if (meta.detail !== void 0) {
    lines.push("", "\u8BF4\u660E:");
    for (const d of meta.detail) lines.push(`  ${d}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}
function runHelp(ctx2, args, commands, version) {
  const target = args.filter((a) => !a.startsWith("-")).join(" ");
  let root = null;
  try {
    root = findProject(ctx2.projectPath ?? process.cwd())?.root ?? null;
  } catch {
    root = null;
  }
  if (target === "") {
    if (ctx2.json) {
      emitData(buildAgentDoc(version, commands, root));
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
  if (ctx2.json) {
    emitData({
      name: hit.name,
      group: hit.group,
      summary: hit.summary,
      usage: hit.usage,
      implemented: hit.implemented ?? false,
      args: hit.args ?? [],
      flags: hit.flags ?? [],
      examples: hit.examples ?? [],
      ...hit.jsonShape !== void 0 ? { output: hit.jsonShape } : {},
      detail: hit.detail ?? []
    });
    return;
  }
  printCommandHelp(hit);
}
var init_help = __esm({
  "src/commands/help.mts"() {
    "use strict";
    init_groups();
    init_errors();
    init_json();
    init_config();
    init_skill();
    init_contract();
  }
});

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
var init_exec = __esm({
  "src/shared/exec.mts"() {
    "use strict";
    init_errors();
  }
});

// src/shared/log.mts
import { appendFileSync, mkdirSync as mkdirSync2 } from "fs";
import { dirname as dirname3 } from "path";
function setLogJsonMode(enabled) {
  jsonMode = enabled;
}
function ts() {
  return (/* @__PURE__ */ new Date()).toTimeString().slice(0, 8);
}
function say(msg) {
  const line = `[${ts()}] ${msg}`;
  if (jsonMode) process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
  for (const s of sinks) {
    try {
      s(line);
    } catch {
    }
  }
}
function warn(msg) {
  process.stderr.write(`[${ts()}] WARN ${msg}
`);
}
var sinks, jsonMode;
var init_log = __esm({
  "src/shared/log.mts"() {
    "use strict";
    sinks = [];
    jsonMode = false;
  }
});

// src/commands/update.mts
import { mkdtempSync, rmSync as rmSync3 } from "fs";
import { tmpdir } from "os";
import { join as join3 } from "path";
import { spawn as spawn2 } from "child_process";
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
  const tmp = mkdtempSync(join3(tmpdir(), "daoyan-cli-update-"));
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
    const code = await execInherit(npm, ["install", "-g", join3(tmp, tgz)]);
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
    rmSync3(tmp, { recursive: true, force: true });
  }
}
var REPO_URL;
var init_update = __esm({
  "src/commands/update.mts"() {
    "use strict";
    init_errors();
    init_exec();
    init_json();
    init_log();
    init_version();
    REPO_URL = "https://github.com/yuanbaobaoo/daoyan-cli.git";
  }
});

// src/shared/args.mts
function splitInlineFlag(arg) {
  if (!arg.startsWith("--")) return { name: arg };
  const i = arg.indexOf("=");
  if (i < 0) return { name: arg };
  return { name: arg.slice(0, i), inline: arg.slice(i + 1) };
}
function takeValue(args, index, inline, label) {
  if (inline !== void 0) {
    if (inline === "") usageError(`${label} \u9700\u8981\u53C2\u6570`);
    return { value: inline, skip: 0 };
  }
  const v = args[index + 1];
  if (v === void 0 || v === "" || v.startsWith("--")) {
    usageError(`${label} \u9700\u8981\u53C2\u6570`);
  }
  return { value: v, skip: 1 };
}
function parseJsonValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
function usageError(message) {
  throw new DaoyanCliError({ code: "usage", message, exit: 2 });
}
function requiredPositional(value, label) {
  if (value === void 0 || value === "") usageError(`\u7F3A\u5C11${label}`);
  return value;
}
var init_args = __esm({
  "src/shared/args.mts"() {
    "use strict";
    init_errors();
  }
});

// src/shared/net.mts
import { Socket, createServer } from "net";
function freePort(host = "127.0.0.1") {
  return new Promise((resolvePromise, rejectPromise) => {
    const srv = createServer();
    srv.once("error", rejectPromise);
    srv.listen(0, host, () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      srv.close(() => {
        if (port <= 0) rejectPromise(new Error("\u65E0\u6CD5\u5206\u914D\u7A7A\u95F2\u7AEF\u53E3"));
        else resolvePromise(port);
      });
    });
  });
}
function portInUse(port, host = "127.0.0.1", timeoutMs = 800) {
  return new Promise((resolvePromise) => {
    const socket = new Socket();
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(v);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}
async function fetchWithTimeout(url, init = {}, timeoutMs = 1e4) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal !== void 0 && init.signal !== null ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(url, { ...init, signal });
}
function sleep(ms, signal) {
  return new Promise((resolvePromise, rejectPromise) => {
    if (signal?.aborted === true) {
      rejectPromise(signal.reason ?? new Error("aborted"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolvePromise();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      rejectPromise(signal?.reason ?? new Error("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
var init_net = __esm({
  "src/shared/net.mts"() {
    "use strict";
  }
});

// src/core/provision/init-flow.mts
import { existsSync as existsSync5, readFileSync as readFileSync5, renameSync as renameSync2, writeFileSync as writeFileSync2 } from "fs";
import { join as join4 } from "path";
function projectTemplate(name) {
  return {
    name,
    version: 2,
    gpu: { takeover: false },
    comfyui: {
      custom_nodes: []
    }
  };
}
function scaffoldProject(root, name) {
  const created = [];
  for (const d of [WORKFLOWS_DIR, INPUTS_DIR, FINAL_DIR, LOG_DIR, RELAY_DIR]) {
    ensureDir(join4(root, d));
  }
  const projectFile = join4(root, PROJECT_FILE);
  if (!existsSync5(projectFile)) {
    writeFileAtomic(projectFile, JSON.stringify(projectTemplate(name), null, 2) + "\n");
    created.push(PROJECT_FILE);
  }
  const shotsFile = join4(root, SHOTS_FILE);
  if (!existsSync5(shotsFile)) {
    writeFileAtomic(shotsFile, JSON.stringify(shotsTemplate(), null, 2) + "\n");
    created.push(SHOTS_FILE);
  }
  const wf = join4(root, WORKFLOWS_DIR, "t2v.json");
  if (!existsSync5(wf)) {
    writeFileAtomic(wf, "{}\n");
    created.push(`${WORKFLOWS_DIR}/t2v.json`);
  }
  const ignore = join4(root, ".gitignore");
  if (!existsSync5(ignore)) {
    writeFileAtomic(
      ignore,
      [
        "engine/",
        "logs/",
        ".dycli/",
        "relay_frames/",
        "concat_list.txt",
        "*.log",
        ".DS_Store",
        ""
      ].join("\n")
    );
    created.push(".gitignore");
  }
  const attrs = join4(root, ".gitattributes");
  if (!existsSync5(attrs)) {
    writeFileAtomic(
      attrs,
      [
        "runs/**/outputs/** filter=lfs diff=lfs merge=lfs -text",
        "runs/**/inputs/**  filter=lfs diff=lfs merge=lfs -text",
        "inputs/**          filter=lfs diff=lfs merge=lfs -text",
        "final/**           filter=lfs diff=lfs merge=lfs -text",
        ""
      ].join("\n")
    );
    created.push(".gitattributes");
  }
  return { created };
}
function shotsTemplate() {
  return {
    workflow: "t2v",
    meta: {
      title: "\u793A\u4F8B\u5206\u955C\u8868\uFF08init \u540E\u66FF\u6362\uFF09",
      width: 768,
      height: 1344,
      anchors: {}
    },
    defaults: {
      length: 243,
      steps: 30,
      cfg: 4,
      sampler_name: "euler",
      scheduler: "simple",
      shift_video: 12,
      shift_audio: 3,
      negative: "\u4F4E\u8D28\u91CF\uFF0C\u6A21\u7CCA\uFF0C\u566A\u70B9\uFF0C\u53D8\u5F62\uFF0C\u6C34\u5370"
    },
    style_prefix: "\u5199\u5B9E\u7535\u5F71\u611F",
    shots: [
      { id: "01", slug: "opening", seed: 1101, prompt: "\u793A\u4F8B\uFF1A\u5F00\u573A\u955C\u5934\u63D0\u793A\u8BCD" },
      { id: "02", slug: "relay", seed: 1102, first_frame: { relay: "01" }, prompt: "\u793A\u4F8B\uFF1A\u63A5\u529B\u955C\u5934\u63D0\u793A\u8BCD" }
    ]
  };
}
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
      message: `python3 \u7248\u672C\u8FC7\u4F4E\uFF08${r.stdout.trim()}\uFF0C\u8981\u6C42 \u2265${MIN_PYTHON}\uFF09`
    });
  }
  log(`python3 \u5C31\u7EEA\uFF1A${r.stdout.trim()}`);
}
async function latestComfyTag() {
  const res = await fetch(COMFY_TAGS_API, {
    headers: { "user-agent": "daoyan-cli-init", accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(15e3)
  });
  if (!res.ok) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `GitHub API ${res.status}\uFF08\u53EF\u7528 --version \u56FA\u5B9A\u7248\u672C\u7ED5\u8FC7\uFF09`
    });
  }
  const tags = await res.json();
  for (const t of tags) {
    if (t.name !== void 0 && /^v?\d+\.\d+/.test(t.name)) return t.name;
  }
  throw new DaoyanCliError({
    code: "provision_failed",
    message: "GitHub tags \u4E2D\u672A\u627E\u5230\u53EF\u7528\u7248\u672C\uFF08\u53EF\u7528 --version \u56FA\u5B9A\u7248\u672C\u7ED5\u8FC7\uFF09"
  });
}
async function createVenv(root, venvDir, log) {
  if (existsSync5(join4(venvDir, "bin", "python"))) {
    log(`\u590D\u7528\u5DF2\u6709 venv\uFF1A${venvDir}`);
    return;
  }
  log(`\u521B\u5EFA\u865A\u62DF\u73AF\u5883 ${venvDir} ...`);
  const r = await execInherit("python3", ["-m", "venv", venvDir], { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `python3 -m venv \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r}\uFF09\u3002Ubuntu \u9700 python3-venv \u5305`
    });
  }
}
async function cloneRepo(root, repo, target, ref, log) {
  if (existsSync5(join4(target, ".git"))) {
    log(`\u590D\u7528\u5DF2\u6709\u4ED3\u5E93\uFF1A${target}`);
    return;
  }
  const args = ["clone", "--depth", "1"];
  if (ref !== void 0 && ref !== "") args.push("--branch", ref);
  args.push(repo, target);
  log(`\u514B\u9686 ${repo}${ref !== void 0 ? `\uFF08${ref}\uFF09` : ""} \u2192 ${target} ...`);
  const r = await execInherit("git", args, { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `git clone \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r}\uFF09\uFF1A${repo}${ref !== void 0 ? `#${ref}` : ""}`
    });
  }
}
async function pipInstall(root, venvDir, mirror, log, requirements) {
  const pip = join4(venvDir, "bin", "pip");
  const req = requirements ?? join4(root, "engine", "ComfyUI", "requirements.txt");
  if (!existsSync5(req)) {
    throw new DaoyanCliError({ code: "provision_failed", message: `\u7F3A\u5C11 ${req}\uFF08clone \u672A\u5B8C\u6210\uFF1F\uFF09` });
  }
  log(`\u5B89\u88C5 ComfyUI \u4F9D\u8D56\uFF08pip install -r ${req}\uFF0C\u53EF\u80FD\u9700\u8981\u4E0B\u8F7D torch\uFF0C\u8017\u65F6\u8F83\u957F\uFF09...`);
  const args = ["install", "-r", req];
  if (mirror !== void 0) args.push("--index-url", mirror);
  const r = await execInherit(pip, args, { cwd: root });
  if (r !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `pip install \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r}\uFF09\u3002\u53EF\u7528 --mirror \u6307\u5B9A\u955C\u50CF\u6E90\u91CD\u8BD5`
    });
  }
  log("ComfyUI \u4F9D\u8D56\u5B89\u88C5\u5B8C\u6210");
}
async function installCustomNodes(root, venvDir, nodes, mirror, log, comfyDir = join4(root, "engine", "ComfyUI")) {
  if (nodes.length === 0) return;
  const base = join4(comfyDir, "custom_nodes");
  ensureDir(base);
  for (const node of nodes) {
    const target = join4(base, node.name);
    await cloneRepo(root, node.repo, target, node.ref, log);
    const req = join4(target, "requirements.txt");
    if (existsSync5(req)) {
      log(`\u5B89\u88C5 ${node.name} \u4F9D\u8D56...`);
      const args = ["install", "-r", req];
      if (mirror !== void 0) args.push("--index-url", mirror);
      const r = await execInherit(join4(venvDir, "bin", "pip"), args, { cwd: root });
      if (r !== 0) {
        throw new DaoyanCliError({
          code: "provision_failed",
          message: `custom node ${node.name} \u4F9D\u8D56\u5B89\u88C5\u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r}\uFF09`
        });
      }
    }
  }
  log(`custom nodes \u5B89\u88C5\u5B8C\u6210\uFF1A${nodes.map((n) => n.name).join(", ")}`);
}
async function checkoutComfyVersion(comfyDir, version, log) {
  const desc = await execCapture("git", ["-C", comfyDir, "describe", "--tags", "--exact-match"], {
    timeoutMs: 15e3
  });
  if (desc.code === 0 && desc.stdout.trim() === version) return false;
  log(`\u5207\u6362 ComfyUI \u76EE\u5F55\u5230 ${version} ...`);
  const fetch2 = await execCapture("git", ["-C", comfyDir, "fetch", "--depth", "1", "origin", version], {
    timeoutMs: 18e4
  });
  if (fetch2.code !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `git fetch ${version} \u5931\u8D25\uFF1A${fetch2.stderr.slice(0, 300)}`,
      hint: "\u68C0\u67E5 tag \u662F\u5426\u5B58\u5728\uFF0C\u6216\u4F7F\u7528 daoyan engine install/use\u3002"
    });
  }
  const co = await execCapture("git", ["-C", comfyDir, "checkout", "--force", version], {
    timeoutMs: 12e4
  });
  if (co.code !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `git checkout ${version} \u5931\u8D25\uFF1A${co.stderr.slice(0, 300)}`
    });
  }
  return true;
}
async function deployLocalEngine(opts) {
  const venvDir = join4(opts.root, "engine", ".venv");
  const comfyDir = join4(opts.root, "engine", "ComfyUI");
  const already = existsSync5(join4(venvDir, "bin", "python")) && existsSync5(join4(comfyDir, "main.py"));
  if (already) {
    opts.log("\u5F15\u64CE\u5DF2\u5B89\u88C5\uFF0C\u590D\u7528\u73B0\u6709\u76EE\u5F55");
    let switched = false;
    if (existsSync5(join4(comfyDir, ".git"))) {
      switched = await checkoutComfyVersion(comfyDir, opts.version, opts.log);
    } else if (existsSync5(join4(comfyDir, "main.py"))) {
      opts.log("ComfyUI \u76EE\u5F55\u4E0D\u662F git \u68C0\u51FA\uFF0C\u8DF3\u8FC7\u7248\u672C\u5207\u6362\uFF08\u53EF\u7528 engine use \u6307\u5411\u5176\u4ED6\u76EE\u5F55\uFF09");
    }
    if (switched) {
      await pipInstall(opts.root, venvDir, opts.mirror, opts.log, join4(comfyDir, "requirements.txt"));
    }
    await installCustomNodes(
      opts.root,
      venvDir,
      opts.project.comfyui?.custom_nodes ?? [],
      opts.mirror,
      opts.log,
      comfyDir
    );
    return { installed: false, version: opts.version };
  }
  await detectPython(opts.log);
  await createVenv(opts.root, venvDir, opts.log);
  await cloneRepo(opts.root, COMFY_REPO, comfyDir, opts.version, opts.log);
  await pipInstall(opts.root, venvDir, opts.mirror, opts.log);
  await installCustomNodes(
    opts.root,
    venvDir,
    opts.project.comfyui?.custom_nodes ?? [],
    opts.mirror,
    opts.log,
    comfyDir
  );
  return { installed: true, version: opts.version };
}
async function installEngineAt(opts) {
  const comfyDir = join4(opts.baseDir, "ComfyUI");
  const venvDir = join4(opts.baseDir, ".venv");
  await detectPython(opts.log);
  await createVenv(opts.root, venvDir, opts.log);
  await cloneRepo(opts.root, COMFY_REPO, comfyDir, opts.version, opts.log);
  await pipInstall(opts.root, venvDir, opts.mirror, opts.log, join4(comfyDir, "requirements.txt"));
  await installCustomNodes(
    opts.root,
    venvDir,
    opts.project.comfyui?.custom_nodes ?? [],
    opts.mirror,
    opts.log,
    comfyDir
  );
  return { comfyDir, venvDir };
}
function writeExtraModelPaths(root, modelpath) {
  if (modelpath === void 0 || modelpath === "") return null;
  const base = modelpath.replace(/'/g, "''");
  const yaml = [
    "daoyan:",
    `  base_path: '${base}'`,
    "  checkpoints: checkpoints",
    "  clip: text_encoders",
    "  clip_vision: clip_vision",
    "  configs: configs",
    "  controlnet: controlnet",
    "  diffusion_models: diffusion_models",
    "  embeddings: embeddings",
    "  gligen: gligen",
    "  hypernetworks: hypernetworks",
    "  loras: loras",
    "  style_models: style_models",
    "  text_encoders: text_encoders",
    "  unet: diffusion_models",
    "  upscale_models: upscale_models",
    "  vae: vae",
    ""
  ].join("\n");
  const file = join4(root, EXTRA_MODELS_FILE);
  ensureDir(join4(root, ".dycli"));
  writeFileAtomically(file, yaml);
  return file;
}
function writeFileAtomically(file, content) {
  const tmp = `${file}.tmp`;
  writeFileSync2(tmp, content);
  renameSync2(tmp, file);
}
async function allocatePort(existing) {
  if (existing !== void 0 && existing > 0) return existing;
  return freePort("127.0.0.1");
}
var COMFY_REPO, COMFY_TAGS_API, MIN_PYTHON;
var init_init_flow = __esm({
  "src/core/provision/init-flow.mts"() {
    "use strict";
    init_errors();
    init_exec();
    init_fs();
    init_net();
    init_types();
    COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git";
    COMFY_TAGS_API = "https://api.github.com/repos/comfyanonymous/ComfyUI/tags";
    MIN_PYTHON = "3.10";
  }
});

// src/core/task/store.mts
var store_exports = {};
__export(store_exports, {
  activeTasks: () => activeTasks,
  appendTaskRun: () => appendTaskRun,
  clearCancelRequest: () => clearCancelRequest,
  createTask: () => createTask,
  findTaskByRequestId: () => findTaskByRequestId,
  finishTask: () => finishTask,
  isCancelRequested: () => isCancelRequested,
  listTasks: () => listTasks,
  makeTaskRecord: () => makeTaskRecord,
  newTaskId: () => newTaskId,
  nextActionsFor: () => nextActionsFor,
  readTask: () => readTask,
  requestCancel: () => requestCancel,
  requireTask: () => requireTask,
  taskDir: () => taskDir,
  taskFile: () => taskFile,
  taskSummary: () => taskSummary,
  updateTask: () => updateTask
});
import { existsSync as existsSync6, readdirSync as readdirSync2, rmSync as rmSync4 } from "fs";
import { join as join5 } from "path";
function newTaskId(machineId) {
  return `t_${makeId(machineId)}`;
}
function taskDir(root, taskId) {
  return join5(root, TASKS_DIR, taskId);
}
function taskFile(root, taskId) {
  return join5(taskDir(root, taskId), TASK_FILE);
}
function createTask(root, record) {
  const dir = taskDir(root, record.task_id);
  if (existsSync6(join5(dir, TASK_FILE))) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `task ${record.task_id} \u5DF2\u5B58\u5728\uFF08id \u51B2\u7A81\uFF0C\u8BF7\u91CD\u8BD5\uFF09`
    });
  }
  ensureDir(dir);
  writeJsonAtomic(join5(dir, TASK_FILE), record);
  return record;
}
function readTask(root, taskId) {
  return readJsonIfExists(taskFile(root, taskId));
}
function requireTask(root, taskId) {
  const rec = readTask(root, taskId);
  if (rec === null) {
    throw new DaoyanCliError({ code: "task_not_found", message: `\u672A\u627E\u5230 task ${taskId}` });
  }
  return rec;
}
function updateTask(root, taskId, patch) {
  const cur = requireTask(root, taskId);
  const next = { ...cur, ...patch, task_id: cur.task_id };
  writeJsonAtomic(taskFile(root, taskId), next);
  return next;
}
function finishTask(root, taskId, status, error = null) {
  const cur = requireTask(root, taskId);
  if (isTerminalStatus(cur.status)) return cur;
  return updateTask(root, taskId, {
    status,
    finished_at: nowIso(),
    error,
    next_actions: nextActionsFor(taskId, status)
  });
}
function nextActionsFor(taskId, status) {
  if (status === "queued" || status === "running") {
    return [`status --task ${taskId} --wait`, `logs --task ${taskId} -f`, `run cancel ${taskId}`];
  }
  if (status === "succeeded") return [`status --task ${taskId} --json`];
  return [`logs --task ${taskId} --json`, `status --json`];
}
function listTasks(root) {
  const dir = join5(root, TASKS_DIR);
  if (!existsSync6(dir)) return [];
  const out = [];
  for (const ent of readdirSync2(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const rec = readTask(root, ent.name);
    if (rec !== null) out.push(rec);
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
function findTaskByRequestId(root, requestId) {
  if (requestId === "") return null;
  return listTasks(root).find((t) => t.request_id === requestId) ?? null;
}
function activeTasks(root) {
  return listTasks(root).filter((t) => !isTerminalStatus(t.status));
}
function requestCancel(root, taskId) {
  ensureDir(taskDir(root, taskId));
  writeJsonAtomic(join5(taskDir(root, taskId), CANCEL_FILE), {
    requested_at: nowIso(),
    by_pid: process.pid
  });
}
function isCancelRequested(root, taskId) {
  return existsSync6(join5(taskDir(root, taskId), CANCEL_FILE));
}
function clearCancelRequest(root, taskId) {
  const file = join5(taskDir(root, taskId), CANCEL_FILE);
  if (existsSync6(file)) {
    rmSync4(file, { force: true });
  }
}
function appendTaskRun(root, taskId, runId) {
  const cur = requireTask(root, taskId);
  if (cur.runs.includes(runId)) return cur;
  return updateTask(root, taskId, { runs: [...cur.runs, runId] });
}
function makeTaskRecord(init) {
  return {
    task_id: init.taskId,
    kind: init.kind,
    machine_id: init.machineId,
    request_id: init.requestId,
    status: "queued",
    mode: init.mode,
    command: init.command,
    runs: [],
    worker: null,
    created_at: nowIso(),
    started_at: null,
    finished_at: null,
    error: null,
    next_actions: nextActionsFor(init.taskId, "queued"),
    options: init.options
  };
}
function taskSummary(rec) {
  return {
    task_id: rec.task_id,
    kind: rec.kind,
    status: rec.status,
    mode: rec.mode,
    machine_id: rec.machine_id,
    request_id: rec.request_id,
    runs: rec.runs,
    command: rec.command,
    created_at: rec.created_at,
    started_at: rec.started_at,
    finished_at: rec.finished_at,
    error: rec.error,
    next_actions: rec.next_actions,
    events_path: `${TASKS_DIR}/${rec.task_id}/events.jsonl`
  };
}
var init_store = __esm({
  "src/core/task/store.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
  }
});

// src/core/comfy/client.mts
async function probeComfy(base, timeoutMs = 5e3) {
  try {
    await new ComfyClient(base, timeoutMs).systemStats(timeoutMs);
    return true;
  } catch {
    return false;
  }
}
var ComfyClient;
var init_client = __esm({
  "src/core/comfy/client.mts"() {
    "use strict";
    init_net();
    ComfyClient = class {
      /**
       * 引擎 base URL（如 http://127.0.0.1:8188，可含路径前缀）。
       */
      base;
      /**
       * 单请求默认超时（毫秒）。
       */
      timeoutMs;
      /**
       * 以 base URL 构造客户端。
       */
      constructor(base, timeoutMs = 15e3) {
        this.base = base.replace(/\/+$/, "");
        this.timeoutMs = timeoutMs;
      }
      /**
       * 拼接带路径前缀的 URL。
       */
      url(path, query) {
        const u = new URL(`${this.base}${path}`);
        if (query !== void 0) {
          for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
        }
        return u.toString();
      }
      /**
       * GET JSON；非 2xx 抛 Error。
       */
      async getJson(path, timeoutMs = this.timeoutMs) {
        const res = await fetchWithTimeout(this.url(path), { headers: { accept: "application/json" } }, timeoutMs);
        if (!res.ok) {
          throw new Error(`GET ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        }
        return await res.json();
      }
      /**
       * POST JSON；非 2xx 抛 Error。
       */
      async postJson(path, body, timeoutMs = this.timeoutMs) {
        const res = await fetchWithTimeout(
          this.url(path),
          {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify(body)
          },
          timeoutMs
        );
        if (!res.ok) {
          throw new Error(`POST ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        }
        const text = await res.text();
        return text === "" ? {} : JSON.parse(text);
      }
      /**
       * 引擎系统状态（显存 / 版本 / 设备）。
       */
      systemStats(timeoutMs = this.timeoutMs) {
        return this.getJson("/system_stats", timeoutMs);
      }
      /**
       * 节点定义表。
       */
      objectInfo(timeoutMs = 6e4) {
        return this.getJson("/object_info", timeoutMs);
      }
      /**
       * 队列快照（执行中 / 等待中）。
       */
      queue() {
        return this.getJson("/queue");
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
       * 队列是否空闲（执行中 + 等待中均为 0）；不可达返回 null。
       */
      async queueIdle() {
        try {
          const q = await this.queue();
          return q.queue_running.length + q.queue_pending.length === 0;
        } catch {
          return null;
        }
      }
      /**
       * 查询单次执行的 history（按 prompt id）。
       */
      history(promptId) {
        return this.getJson(`/history/${encodeURIComponent(promptId)}`);
      }
      /**
       * 提交 workflow（API 格式）并返回受理回执。
       */
      submit(workflow, clientId = "daoyan-cli") {
        return this.postJson("/prompt", { prompt: workflow, client_id: clientId }, 6e4);
      }
      /**
       * 上传图片到引擎 input，返回引擎侧文件名。
       */
      async uploadImage(filename, bytes, overwrite = true) {
        const form = new FormData();
        form.append("image", new Blob([new Uint8Array(bytes)]), filename);
        form.append("overwrite", String(overwrite));
        const res = await fetchWithTimeout(
          this.url("/upload/image"),
          { method: "POST", body: form },
          6e4
        );
        if (!res.ok) {
          throw new Error(`POST /upload/image -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        }
        const data = await res.json();
        const name = data.name ?? filename;
        return data.subfolder !== void 0 && data.subfolder !== "" ? `${data.subfolder}/${name}` : name;
      }
      /**
       * 卸载模型并释放显存（POST /free）。
       */
      async free() {
        await this.postJson("/free", { unload_models: true, free_memory: true }, 1e4);
      }
      /**
       * 中断当前执行（POST /interrupt）。
       */
      async interrupt() {
        await this.postJson("/interrupt", {}, 1e4);
      }
      /**
       * 下载产物（GET /view）。
       */
      async view(params) {
        const query = { filename: params.filename, type: params.type ?? "output" };
        if (params.subfolder !== void 0 && params.subfolder !== "") query.subfolder = params.subfolder;
        const res = await fetchWithTimeout(this.url("/view", query), {}, 12e4);
        if (!res.ok) {
          throw new Error(`GET /view -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        return { bytes: buf, contentType: res.headers.get("content-type") };
      }
    };
  }
});

// src/core/workflow/catalog.mts
import { existsSync as existsSync7, rmSync as rmSync5 } from "fs";
import { join as join6 } from "path";
function extractNodeDef(raw, classType) {
  const nodeRaw = raw[classType];
  if (typeof nodeRaw !== "object" || nodeRaw === null || Array.isArray(nodeRaw)) return null;
  const n = nodeRaw;
  const input = typeof n.input === "object" && n.input !== null ? n.input : {};
  const required = readInputSection(input.required, true);
  const optional = readInputSection(input.optional, false);
  return {
    class_type: classType,
    display_name: typeof n.display_name === "string" ? n.display_name : classType,
    category: typeof n.category === "string" ? n.category : "",
    description: typeof n.description === "string" ? n.description : "",
    inputs: [...required, ...optional],
    outputs: readStringArray(n.output),
    output_names: readStringArray(n.output_name),
    output_node: n.output_node === true,
    raw: nodeRaw
  };
}
function readInputSection(section, required) {
  if (typeof section !== "object" || section === null || Array.isArray(section)) return [];
  const table = section;
  const out = [];
  for (const [name, specRaw] of Object.entries(table)) {
    const spec = Array.isArray(specRaw) ? specRaw : [specRaw];
    const typeSpec = spec[0];
    const opts = typeof spec[1] === "object" && spec[1] !== null ? spec[1] : {};
    const types = [];
    let options;
    if (typeof typeSpec === "string") {
      types.push(typeSpec);
    } else if (Array.isArray(typeSpec)) {
      const strings = typeSpec.filter((x) => typeof x === "string");
      if (strings.length > 0) {
        if (strings.every((s) => KNOWN_TYPES.has(s))) {
          types.push(...strings);
        } else {
          options = strings;
          types.push("COMBO");
        }
      }
    }
    if (Array.isArray(opts.options)) {
      const explicit = opts.options.filter((x) => typeof x === "string");
      if (explicit.length > 0) options = explicit;
    }
    const def = opts.default;
    out.push({
      name,
      types,
      required,
      ...def !== void 0 ? { default: def } : {},
      ...options !== void 0 ? { options } : {}
    });
  }
  return out;
}
function readStringArray(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function buildCatalog(raw, comfyuiVersion) {
  return {
    generated_at: nowIso(),
    fingerprint: {
      object_info_sha256: sha256(stableStringify(raw)),
      comfyui_version: comfyuiVersion
    },
    raw
  };
}
function comfyVersionOf(stats) {
  if (typeof stats !== "object" || stats === null) return null;
  const system = stats.system;
  if (typeof system !== "object" || system === null) return null;
  const s = system;
  for (const key of ["comfyui_version", "comfy_version", "version"]) {
    if (typeof s[key] === "string" && s[key] !== "") return s[key];
  }
  return null;
}
function readCatalog(root) {
  const file = join6(root, CATALOG_FILE);
  if (!existsSync7(file)) return null;
  const cat = readJsonIfExists(file);
  if (cat === null || typeof cat !== "object" || typeof cat.raw !== "object" || cat.raw === null) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `${file} \u7ED3\u6784\u975E\u6CD5\uFF1B\u8FD0\u884C daoyan workflow nodes --refresh \u91CD\u5EFA`
    });
  }
  return cat;
}
function writeCatalog(root, catalog) {
  writeJsonAtomic(join6(root, CATALOG_FILE), catalog);
}
function catalogSize(catalog) {
  return Object.keys(catalog.raw).length;
}
function listNodes(catalog, opts) {
  const filter = (opts.filter ?? "").toLowerCase();
  const all = Object.keys(catalog.raw).sort((a, b) => a.localeCompare(b)).map((name) => {
    const def = extractNodeDef(catalog.raw, name);
    return {
      name,
      display_name: def?.display_name ?? name,
      category: def?.category ?? "",
      output_node: def?.output_node ?? false
    };
  }).filter(
    (n) => filter === "" || n.name.toLowerCase().includes(filter) || n.display_name.toLowerCase().includes(filter) || n.category.toLowerCase().includes(filter)
  );
  const start = Math.max(0, opts.cursor ?? 0);
  const limit = Math.max(1, Math.min(opts.limit ?? 100, 1e3));
  const page = all.slice(start, start + limit);
  const fields = opts.fields !== void 0 && opts.fields.length > 0 ? opts.fields : void 0;
  const nodes = fields === void 0 ? page : page.map((n) => {
    const out = {};
    const row = n;
    for (const f of fields) if (f in row) out[f] = row[f];
    return out;
  });
  const next = start + page.length;
  return { nodes, total: all.length, next_cursor: next < all.length ? String(next) : null };
}
var KNOWN_TYPES;
var init_catalog = __esm({
  "src/core/workflow/catalog.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
    KNOWN_TYPES = /* @__PURE__ */ new Set([
      "INT",
      "FLOAT",
      "STRING",
      "BOOLEAN",
      "IMAGE",
      "MASK",
      "LATENT",
      "MODEL",
      "CLIP",
      "VAE",
      "CONDITIONING",
      "CONTROL_NET",
      "STYLE_MODEL",
      "CLIP_VISION",
      "CLIP_VISION_OUTPUT",
      "UPSCALE_MODEL",
      "SAMPLER",
      "SIGMAS",
      "NOISE",
      "GUIDER",
      "AUDIO",
      "VIDEO",
      "WAV",
      "ANY"
    ]);
  }
});

// src/core/gpu/detect.mts
async function gpuSnapshot() {
  if (process.platform !== "linux") {
    return { supported: false, reason: `platform ${process.platform}`, devices: [] };
  }
  const r = await tryExecCapture(
    "nvidia-smi",
    ["--query-gpu=index,memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
    { timeoutMs: 1e4 }
  );
  if (r === null || r.code !== 0) {
    return { supported: false, reason: "nvidia-smi \u4E0D\u53EF\u7528", devices: [] };
  }
  const devices = [];
  for (const line of r.stdout.trim().split("\n")) {
    const parts = line.split(",").map((x) => x.trim());
    if (parts.length < 3) continue;
    const index = Number(parts[0]);
    const used = Number(parts[1]);
    const total = Number(parts[2]);
    const util = Number(parts[3]);
    if (!Number.isFinite(index) || !Number.isFinite(used) || !Number.isFinite(total) || total <= 0) continue;
    devices.push({
      index,
      usedMb: used,
      totalMb: total,
      freeMb: Math.max(0, total - used),
      ...Number.isFinite(util) ? { utilPct: util } : {}
    });
  }
  if (devices.length === 0) {
    return { supported: false, reason: "nvidia-smi \u65E0\u53EF\u89E3\u6790\u8BBE\u5907", devices: [] };
  }
  return { supported: true, devices };
}
function totalVram(snapshot2) {
  return snapshot2.devices.reduce(
    (acc, d) => ({
      usedMb: acc.usedMb + d.usedMb,
      totalMb: acc.totalMb + d.totalMb,
      freeMb: acc.freeMb + d.freeMb
    }),
    { usedMb: 0, totalMb: 0, freeMb: 0 }
  );
}
async function gpuComputeApps() {
  if (process.platform !== "linux") return null;
  let r = await tryExecCapture(
    "nvidia-smi",
    ["--query-compute-apps=pid,used_memory", "--format=csv,noheader,nounits"],
    { timeoutMs: 1e4 }
  );
  let withMemory = true;
  if (r === null || r.code !== 0) {
    r = await tryExecCapture("nvidia-smi", ["--query-compute-apps=pid", "--format=csv,noheader,nounits"], {
      timeoutMs: 1e4
    });
    withMemory = false;
  }
  if (r === null || r.code !== 0) return null;
  const byPid = /* @__PURE__ */ new Map();
  for (const line of r.stdout.split("\n")) {
    const parts = line.split(",").map((x) => x.trim());
    if (parts.length < 1) continue;
    const pid = Number(parts[0]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const usedRaw = Number(parts[1]);
    const used = withMemory && Number.isFinite(usedRaw) ? usedRaw : null;
    if (!byPid.has(pid)) {
      byPid.set(pid, used);
      continue;
    }
    const prev = byPid.get(pid);
    byPid.set(pid, prev === null || used === null ? null : (prev ?? 0) + used);
  }
  return [...byPid.entries()].map(([pid, usedMb]) => ({ pid, usedMb }));
}
async function gpuProcessPids() {
  const apps = await gpuComputeApps();
  if (apps === null) return null;
  return new Set(apps.map((a) => a.pid));
}
var init_detect = __esm({
  "src/core/gpu/detect.mts"() {
    "use strict";
    init_exec();
  }
});

// src/core/gpu/lease.mts
import { chmodSync, existsSync as existsSync8, rmSync as rmSync6 } from "fs";
import { homedir } from "os";
import { dirname as dirname4, join as join7 } from "path";
function leasePath() {
  return join7(homedir(), ".dycli", "gpu", "lease.json");
}
function isLease(v) {
  if (typeof v !== "object" || v === null) return false;
  const o = v;
  return o.version === 1 && typeof o.task_id === "string" && typeof o.project === "string" && typeof o.created_at === "string" && Array.isArray(o.entries);
}
function inspectLease(path = leasePath()) {
  if (!existsSync8(path)) return { status: "absent", path };
  try {
    const raw = readJsonIfExists(path);
    if (raw === null) return { status: "absent", path };
    if (!isLease(raw)) return { status: "corrupt", path, message: "\u79DF\u7EA6\u5B57\u6BB5\u4E0D\u5B8C\u6574" };
    return { status: "ok", path, lease: raw };
  } catch (e) {
    return { status: "corrupt", path, message: e instanceof Error ? e.message : String(e) };
  }
}
function writeLease(lease, path = leasePath()) {
  ensureDir(dirname4(path));
  writeJsonAtomic(path, lease);
  try {
    chmodSync(path, 384);
  } catch {
  }
}
function newLease(taskId, project) {
  return { version: 1, task_id: taskId, project, created_at: nowIso(), entries: [] };
}
function clearLease(path = leasePath()) {
  if (existsSync8(path)) {
    rmSync6(path, { force: true });
  }
}
var init_lease = __esm({
  "src/core/gpu/lease.mts"() {
    "use strict";
    init_fs();
  }
});

// src/core/gpu/targets.mts
var GPU_PROVIDER_IDS, GPU_PROCESS_TARGETS, GPU_CONTAINER_TARGETS, PROTECTED_COMMS;
var init_targets = __esm({
  "src/core/gpu/targets.mts"() {
    "use strict";
    GPU_PROVIDER_IDS = ["ollama", "lmstudio", "xinference"];
    GPU_PROCESS_TARGETS = [
      { id: "vllm", pattern: /(^|\s|\/)(vllm|api_server)(\s|$)/i },
      { id: "tgi", pattern: /text-generation-launcher/i },
      { id: "llama.cpp", pattern: /(^|\s|\/)llama-server(\s|$)/i },
      { id: "sglang", pattern: /sglang(\.launch_server)?/i }
    ];
    GPU_CONTAINER_TARGETS = [
      { id: "ollama", kind: "provider", pattern: /\bollama\b/i },
      { id: "lmstudio", kind: "provider", pattern: /\blm[-_ ]?studio\b/i },
      { id: "xinference", kind: "provider", pattern: /\bxinference\b/i },
      { id: "vllm", kind: "provider", pattern: /\bvllm\b/i },
      { id: "tgi", kind: "process", pattern: /\btext-generation-(?:launcher|inference)\b/i },
      { id: "llama.cpp", kind: "process", pattern: /\bllama[-_.]?(?:server|cpp)\b/i },
      { id: "sglang", kind: "process", pattern: /\bsglang\b/i }
    ];
    PROTECTED_COMMS = /* @__PURE__ */ new Set([
      "systemd",
      "init",
      "launchd",
      "sshd",
      "Xorg",
      "Xwayland",
      "gnome-shell",
      "kwin_wayland",
      "kwin_x11",
      "plasmashell",
      "WindowServer",
      "dock",
      "Finder",
      "containerd",
      "containerd-shim",
      "containerd-shim-runc-v2",
      "dockerd",
      "kubelet",
      "k3s",
      "runc",
      "crun",
      "conmon",
      "pause"
    ]);
  }
});

// src/core/gpu/cri.mts
import { existsSync as existsSync9 } from "fs";
async function crictlAvailable() {
  if (crictlChecked !== null) return crictlChecked;
  const r = await tryExecCapture("crictl", ["--version"], { timeoutMs: 5e3 });
  crictlChecked = r !== null && r.code === 0;
  return crictlChecked;
}
function crictlArgs(endpoint, args) {
  return endpoint !== void 0 ? ["--runtime-endpoint", endpoint, ...args] : args;
}
function availableCriEndpoints() {
  return CRI_ENDPOINTS.filter((ep) => existsSync9(ep.replace(/^unix:\/\//, "")));
}
function crictlEndpointCandidates(recorded) {
  const out = recorded !== void 0 ? [recorded, void 0] : [void 0];
  for (const ep of availableCriEndpoints()) {
    if (!out.includes(ep)) out.push(ep);
  }
  return out;
}
function availableContainerdSockets() {
  return CONTAINERD_SOCKETS.filter((p) => existsSync9(p));
}
function isEndpointError(stderr) {
  return /connect|connection|no such file|refused|socket|failed to connect|code = Unavailable/i.test(
    stderr
  );
}
var CRI_ENDPOINTS, CONTAINERD_SOCKETS, CONTAINERD_NAMESPACES, crictlChecked;
var init_cri = __esm({
  "src/core/gpu/cri.mts"() {
    "use strict";
    init_exec();
    CRI_ENDPOINTS = [
      "unix:///run/containerd/containerd.sock",
      "unix:///var/run/containerd/containerd.sock",
      "unix:///run/k3s/containerd/containerd.sock",
      "unix:///var/run/k3s/containerd/containerd.sock",
      "unix:///run/crio/crio.sock",
      "unix:///var/run/crio/crio.sock",
      "unix:///var/run/cri-dockerd.sock",
      "unix:///var/snap/microk8s/common/run/containerd.sock"
    ];
    CONTAINERD_SOCKETS = [
      "/run/containerd/containerd.sock",
      "/var/run/containerd/containerd.sock",
      "/run/k3s/containerd/containerd.sock",
      "/var/run/k3s/containerd/containerd.sock",
      "/var/snap/microk8s/common/run/containerd.sock"
    ];
    CONTAINERD_NAMESPACES = ["k8s.io", "default", "moby"];
    crictlChecked = null;
  }
});

// src/core/gpu/containers.mts
import { readFileSync as readFileSync6 } from "fs";
function containerIdFromCgroup(cgroup) {
  const kubernetes = /kubepods(?:[\/.]|$)/i.test(cgroup);
  const patterns = [
    { re: /(?:^|[\/-])cri-containerd-([0-9a-f]{64})(?:\.scope)?/i, runtime: "crictl" },
    { re: /(?:^|[\/-])crio-([0-9a-f]{64})(?:\.scope)?/i, runtime: "crictl" },
    { re: /(?:^|[\/-])docker-([0-9a-f]{64})(?:\.scope)?/i, runtime: "docker" },
    { re: /(?:^|[\/])docker\/([0-9a-f]{64})(?:[\/]|$)/i, runtime: "docker" },
    { re: /(?:^|[\/-])libpod-([0-9a-f]{64})(?:\.scope)?/i, runtime: "podman" },
    { re: /(?:^|[\/])libpod\/([0-9a-f]{64})(?:[\/]|$)/i, runtime: "podman" },
    { re: /(?:^|[\/-])containerd-([0-9a-f]{64})(?:\.scope)?/i, runtime: "crictl" },
    { re: /(?:^|[\/])containerd\/([0-9a-f]{64})(?:[\/]|$)/i, runtime: "crictl" }
  ];
  for (const p of patterns) {
    const m = p.re.exec(cgroup);
    if (m?.[1] !== void 0) {
      return { id: m[1].toLowerCase(), runtime: p.runtime, kubernetes };
    }
  }
  if (kubernetes) {
    const m = /([0-9a-f]{64})(?:\.scope)?(?:[\/]|$)/i.exec(cgroup);
    if (m?.[1] !== void 0) {
      return { id: m[1].toLowerCase(), runtime: "crictl", kubernetes };
    }
  }
  return null;
}
function readContainerInfo(pid) {
  if (process.platform !== "linux") return null;
  try {
    return containerIdFromCgroup(readFileSync6(`/proc/${pid}/cgroup`, "utf8"));
  } catch {
    return null;
  }
}
function asObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? v : null;
}
function stringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string");
}
function commandArray(v) {
  if (typeof v === "string") return [v];
  return stringArray(v);
}
function readProcessCmdline(pid) {
  try {
    return readFileSync6(`/proc/${pid}/cmdline`, "utf8").split("\0").filter((x) => x !== "");
  } catch {
    return [];
  }
}
function readParentPid(pid) {
  try {
    const stat = readFileSync6(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    if (close < 0) return null;
    const rest = stat.slice(close + 2).split(/\s+/);
    const ppid = Number(rest[1]);
    return Number.isInteger(ppid) && ppid > 0 ? ppid : null;
  } catch {
    return null;
  }
}
function readAncestorCmdlines(pid) {
  const out = [];
  let cur = readParentPid(pid);
  for (let i = 0; i < 64 && cur !== null && cur > 1; i++) {
    const args = readProcessCmdline(cur);
    if (args.length > 0) out.push(...args);
    cur = readParentPid(cur);
  }
  return out;
}
function parsePortBindings(networkSettings, hostConfig) {
  const out = [];
  const ports = asObject(networkSettings?.Ports);
  if (ports !== null) {
    for (const [key, value] of Object.entries(ports)) {
      const m = /^(\d+)\/tcp$/i.exec(key);
      if (m?.[1] === void 0) continue;
      const containerPort = Number(m[1]);
      if (!Number.isInteger(containerPort)) continue;
      for (const binding of Array.isArray(value) ? value : []) {
        const o = asObject(binding);
        const hostPort = Number(o?.HostPort);
        if (Number.isInteger(hostPort) && hostPort > 0) out.push({ containerPort, hostPort });
      }
    }
  }
  const bindings = asObject(hostConfig?.PortBindings);
  if (bindings !== null) {
    for (const [key, value] of Object.entries(bindings)) {
      const m = /^(\d+)\/tcp$/i.exec(key);
      if (m?.[1] === void 0) continue;
      const containerPort = Number(m[1]);
      if (!Number.isInteger(containerPort)) continue;
      for (const binding of Array.isArray(value) ? value : []) {
        const o = asObject(binding);
        const hostPort = Number(o?.HostPort);
        if (Number.isInteger(hostPort) && hostPort > 0) out.push({ containerPort, hostPort });
      }
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return out.filter((b) => {
    const key = `${b.containerPort}:${b.hostPort}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function parseDockerInspect(raw, runtime) {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const o = asObject(first);
  if (o === null) return null;
  const idRaw = typeof o.Id === "string" ? o.Id : typeof o.ID === "string" ? o.ID : "";
  if (!/^[0-9a-f]{64}$/i.test(idRaw)) return null;
  const state = asObject(o.State);
  const config = asObject(o.Config);
  const hostConfig = asObject(o.HostConfig);
  const networkSettings = asObject(o.NetworkSettings);
  const name = typeof o.Name === "string" ? o.Name.replace(/^\//, "") : "";
  const image = typeof config?.Image === "string" ? config.Image : typeof o.Image === "string" ? o.Image : "";
  const command = [
    ...commandArray(config?.Entrypoint),
    ...commandArray(config?.Cmd),
    typeof o.Path === "string" ? o.Path : "",
    ...stringArray(o.Args)
  ].filter((x) => x !== "");
  const pidRaw = state?.Pid;
  const hostPid = typeof pidRaw === "number" && Number.isInteger(pidRaw) && pidRaw > 0 ? pidRaw : null;
  const running = state?.Running === true;
  const networkModeRaw = hostConfig?.NetworkMode ?? networkSettings?.NetworkMode;
  const networkMode = typeof networkModeRaw === "string" ? networkModeRaw : void 0;
  const portBindings = parsePortBindings(networkSettings, hostConfig);
  return {
    runtime,
    id: idRaw.toLowerCase(),
    name,
    image,
    command,
    running,
    hostPid,
    ...portBindings.length > 0 ? { portBindings } : {},
    ...networkMode !== void 0 ? { networkMode } : {}
  };
}
function parseCrictlInspect(raw) {
  const o = asObject(raw);
  const status = asObject(o?.status);
  if (status === null) return null;
  const idRaw = typeof status.id === "string" ? status.id : "";
  if (!/^[0-9a-f]{64}$/i.test(idRaw)) return null;
  const metadata = asObject(status.metadata);
  const name = typeof metadata?.name === "string" ? metadata.name : "";
  const imageObj = asObject(status.image);
  const image = typeof imageObj?.image === "string" ? imageObj.image : typeof status.imageName === "string" ? status.imageName : typeof status.imageRef === "string" ? status.imageRef : "";
  const state = typeof status.state === "string" ? status.state : "";
  const running = state.toLowerCase().includes("running");
  const pidRaw = status.pid;
  const hostPid = typeof pidRaw === "number" && Number.isInteger(pidRaw) && pidRaw > 0 ? pidRaw : null;
  const infoConfig = asObject(asObject(o?.info)?.config);
  const command = [
    ...commandArray(infoConfig?.command),
    ...commandArray(infoConfig?.args)
  ].filter((x) => x !== "");
  return { runtime: "crictl", id: idRaw.toLowerCase(), name, image, command, running, hostPid };
}
function matchContainerTarget(text) {
  return GPU_CONTAINER_TARGETS.find((r) => r.pattern.test(text));
}
function isProviderTargetId(id) {
  return id === "ollama" || id === "lmstudio" || id === "xinference" || id === "vllm";
}
async function inspectWith(runtime, id, crictlEndpoint) {
  if (runtime === "crictl") {
    if (!await crictlAvailable()) return null;
    for (const ep of crictlEndpointCandidates(crictlEndpoint)) {
      const r2 = await tryExecCapture("crictl", crictlArgs(ep, ["inspect", id]), {
        timeoutMs: 1e4
      });
      if (r2 === null || r2.code !== 0) continue;
      try {
        const info = parseCrictlInspect(JSON.parse(r2.stdout));
        if (info !== null) {
          return ep !== void 0 ? { ...info, crictlEndpoint: ep } : info;
        }
      } catch {
      }
    }
    return null;
  }
  if (runtime === "nerdctl") {
    for (const ns of [void 0, ...CONTAINERD_NAMESPACES]) {
      const args = ns !== void 0 ? ["--namespace", ns, "inspect", id] : ["inspect", id];
      const r2 = await tryExecCapture("nerdctl", args, { timeoutMs: 1e4 });
      if (r2 === null || r2.code !== 0) continue;
      try {
        const info = parseDockerInspect(JSON.parse(r2.stdout), "nerdctl");
        if (info !== null) {
          return ns !== void 0 ? { ...info, ctrNamespace: ns } : info;
        }
      } catch {
      }
    }
    return null;
  }
  if (runtime === "ctr") {
    return null;
  }
  const r = await tryExecCapture(runtime, ["inspect", id], { timeoutMs: 1e4 });
  if (r === null || r.code !== 0) return null;
  try {
    return parseDockerInspect(JSON.parse(r.stdout), runtime);
  } catch {
    return null;
  }
}
async function inspectContainer(id, hint, crictlEndpoint) {
  const order = [hint];
  for (const r of ["docker", "podman", "crictl", "nerdctl"]) {
    if (!order.includes(r)) order.push(r);
  }
  for (const runtime of order) {
    const info = await inspectWith(
      runtime,
      id,
      runtime === "crictl" ? crictlEndpoint : void 0
    );
    if (info === null) continue;
    if (info.id !== id.toLowerCase()) continue;
    if (info.hostPid !== null) {
      const local = readContainerInfo(info.hostPid);
      if (local !== null && local.id !== info.id) continue;
    }
    return info;
  }
  return null;
}
function providerPort(provider) {
  if (provider === "ollama") return 11434;
  if (provider === "lmstudio") return 1234;
  if (provider === "vllm") return 8e3;
  return 9997;
}
function mappedHostPort(info, containerPort) {
  for (const b of info.portBindings ?? []) {
    if (b.containerPort === containerPort) return b.hostPort;
  }
  return void 0;
}
function execChannel(runtime, info, kubernetes) {
  const namespace = info.ctrNamespace ?? (kubernetes ? "k8s.io" : runtime === "docker" ? "moby" : void 0);
  return {
    kind: "exec",
    runtime,
    container_id: info.id,
    ...info.name !== "" ? { container_name: info.name } : {},
    ...info.crictlEndpoint !== void 0 ? { crictl_endpoint: info.crictlEndpoint } : {},
    ...namespace !== void 0 ? { ctr_namespace: namespace } : {}
  };
}
function channelsForProvider(provider, info, pid, kubernetes) {
  const port = providerPort(provider);
  const base = `http://127.0.0.1:${port}`;
  const host = [];
  const mapped = mappedHostPort(info, port);
  if (mapped !== void 0) host.push({ kind: "host", base_url: `http://127.0.0.1:${mapped}` });
  else if (info.networkMode === "host") host.push({ kind: "host", base_url: base });
  const netns = [
    { kind: "netns", pid: info.hostPid ?? pid, base_url: base, container_id: info.id }
  ];
  const exec = [];
  const seenRuntime = /* @__PURE__ */ new Set();
  const addExec = (runtime) => {
    if (seenRuntime.has(runtime)) return;
    seenRuntime.add(runtime);
    exec.push(execChannel(runtime, info, kubernetes));
  };
  addExec(info.runtime);
  if (kubernetes || info.runtime === "crictl" || info.runtime === "nerdctl" || info.runtime === "docker") {
    addExec("crictl");
    addExec("ctr");
    addExec("nerdctl");
  }
  if (provider === "lmstudio") return [...exec, ...host, ...netns];
  return [...host, ...netns, ...exec];
}
function unsupportedProcessMessage(target) {
  if (target.id === "llama.cpp") {
    return "\u5BB9\u5668\u5185 llama.cpp server \u672A\u81EA\u52A8\u5904\u7406\uFF08\u4E0D\u4F1A\u505C\u6B62\u5BB9\u5668\uFF09\uFF1Brouter \u6A21\u5F0F\u53EF\u4F7F\u7528 /models/unload";
  }
  if (target.id === "sglang") {
    return "\u5BB9\u5668\u5185 SGLang \u672A\u81EA\u52A8\u5904\u7406\uFF08\u4E0D\u4F1A\u505C\u6B62\u5BB9\u5668\uFF09\uFF1B\u53EF\u7528 --enable-memory-saver + release_memory_occupation";
  }
  return "\u5BB9\u5668\u5185 TGI \u6CA1\u6709\u6807\u51C6\u6A21\u578B\u5378\u8F7D API\uFF1B\u672A\u5904\u7406\uFF08\u4E0D\u4F1A\u505C\u6B62\u5BB9\u5668\uFF09";
}
async function findContainerServices(opts) {
  const services = [];
  const issues = [];
  const seenIssues = /* @__PURE__ */ new Set();
  const seenServices = /* @__PURE__ */ new Set();
  const inspected = /* @__PURE__ */ new Map();
  for (const app of opts.apps) {
    const cg = readContainerInfo(app.pid);
    if (cg === null) continue;
    let info = inspected.get(cg.id);
    if (info === void 0) {
      info = await inspectContainer(cg.id, cg.runtime);
      inspected.set(cg.id, info);
    }
    const procArgs = readProcessCmdline(app.pid);
    if (info === null) {
      info = {
        runtime: cg.runtime,
        id: cg.id,
        name: "",
        image: "",
        // 自身 + 祖先进程命令行：识别被包装/多进程服务
        command: [...procArgs, ...readAncestorCmdlines(app.pid)],
        running: true,
        hostPid: app.pid
      };
    }
    if (!info.running) continue;
    const rule = matchContainerTarget(
      [info.image, info.name, ...info.command, ...procArgs].join(" ")
    );
    if (rule === void 0) continue;
    if (rule.kind === "process") {
      const message = `\u5BB9\u5668 ${info.name !== "" ? info.name : info.id.slice(0, 12)}\uFF1A${unsupportedProcessMessage(rule)}`;
      if (!seenIssues.has(message)) {
        seenIssues.add(message);
        issues.push(message);
      }
      continue;
    }
    if (!isProviderTargetId(rule.id)) continue;
    const key = `${info.id}:${rule.id}`;
    if (seenServices.has(key)) continue;
    seenServices.add(key);
    const channels = channelsForProvider(rule.id, info, app.pid, cg.kubernetes);
    if (channels.length === 0) {
      const message = `\u5BB9\u5668 ${info.name !== "" ? info.name : info.id.slice(0, 12)} \u5185\u7684 ${rule.id} \u5360\u7528 GPU\uFF0C\u4F46\u6CA1\u6709\u53EF\u7528\u7684\u8BBF\u95EE\u901A\u9053\uFF1B\u672A\u5378\u8F7D\uFF08\u5BB9\u5668\u4FDD\u6301\u8FD0\u884C\uFF09`;
      if (!seenIssues.has(message)) {
        seenIssues.add(message);
        issues.push(message);
      }
      continue;
    }
    services.push({
      target: rule,
      provider: rule.id,
      pid: app.pid,
      usedMb: app.usedMb,
      info,
      channels
    });
  }
  return { services, issues };
}
var init_containers = __esm({
  "src/core/gpu/containers.mts"() {
    "use strict";
    init_exec();
    init_cri();
    init_targets();
  }
});

// src/core/gpu/channel.mts
async function fetchDirect(baseUrl, req) {
  try {
    const headers = {};
    let body;
    if (req.body !== void 0) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(req.body);
    }
    const timeoutMs = req.timeoutMs ?? 1e4;
    const res = await fetchWithTimeout(
      `${baseUrl}${req.path}`,
      {
        method: req.method ?? "GET",
        headers,
        ...body !== void 0 ? { body } : {}
      },
      timeoutMs
    );
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch {
    return null;
  }
}
async function fetchViaNetns(pid, baseUrl, req) {
  const timeoutMs = req.timeoutMs ?? 1e4;
  const headers = {};
  let body;
  if (req.body !== void 0) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(req.body);
  }
  const payload = JSON.stringify({
    url: `${baseUrl}${req.path}`,
    method: req.method ?? "GET",
    headers,
    body,
    timeout_ms: timeoutMs
  });
  const r = await tryExecCapture(
    "nsenter",
    ["-t", String(pid), "-n", process.execPath, "-e", NETNS_SCRIPT, payload],
    { timeoutMs: timeoutMs + 3e3 }
  );
  if (r === null || r.code !== 0) return null;
  try {
    const parsed = JSON.parse(r.stdout);
    if (typeof parsed.status !== "number" || typeof parsed.text !== "string") return null;
    return {
      ok: parsed.status >= 200 && parsed.status < 300,
      status: parsed.status,
      text: parsed.text
    };
  } catch {
    return null;
  }
}
async function channelFetch(channel, req) {
  if (channel.kind === "host") return fetchDirect(channel.base_url, req);
  if (channel.kind === "netns") {
    let pid = channel.pid;
    if (channel.container_id !== void 0) {
      let cg = readContainerInfo(pid);
      if (cg === null || cg.id !== channel.container_id) {
        const info = await inspectContainer(channel.container_id, "docker");
        if (info === null || info.hostPid === null) return null;
        pid = info.hostPid;
        cg = readContainerInfo(pid);
        if (cg === null || cg.id !== channel.container_id) return null;
      }
    }
    return fetchViaNetns(pid, channel.base_url, req);
  }
  return null;
}
var NETNS_SCRIPT;
var init_channel = __esm({
  "src/core/gpu/channel.mts"() {
    "use strict";
    init_exec();
    init_net();
    init_containers();
    NETNS_SCRIPT = [
      "const r = JSON.parse(process.argv[1]);",
      "const ac = new AbortController();",
      "const timer = setTimeout(() => ac.abort(), r.timeout_ms);",
      "timer.unref();",
      "fetch(r.url, { method: r.method, headers: r.headers, body: r.body, signal: ac.signal })",
      "  .then(async (res) => {",
      "    clearTimeout(timer);",
      "    process.stdout.write(JSON.stringify({ status: res.status, text: await res.text() }));",
      "  })",
      "  .catch((e) => {",
      "    clearTimeout(timer);",
      "    process.stderr.write(String(e));",
      "    process.exit(1);",
      "  });"
    ].join("\n");
  }
});

// src/core/gpu/container-exec.mts
async function crictlExec(channel, args, timeoutMs) {
  if (!await crictlAvailable()) return null;
  let last = null;
  for (const ep of crictlEndpointCandidates(channel.crictl_endpoint)) {
    const r = await tryExecCapture(
      "crictl",
      crictlArgs(ep, ["exec", channel.container_id, ...args]),
      { timeoutMs }
    );
    if (r === null) continue;
    if (r.code === 0) return r;
    if (!isEndpointError(r.stderr)) return r;
    last = r;
  }
  return last;
}
async function ctrExec(channel, args, timeoutMs) {
  const addresses = channel.ctr_address !== void 0 ? [channel.ctr_address] : (() => {
    const found = availableContainerdSockets();
    return found.length > 0 ? found : [void 0];
  })();
  const namespaces = channel.ctr_namespace !== void 0 ? [channel.ctr_namespace] : CONTAINERD_NAMESPACES;
  let last = null;
  for (const address of addresses) {
    for (const namespace of namespaces) {
      const execId = `dycli-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const prefix = ["--namespace", namespace, ...address !== void 0 ? ["--address", address] : []];
      const r = await tryExecCapture(
        "ctr",
        [
          ...prefix,
          "task",
          "exec",
          "--exec-id",
          execId,
          channel.container_id,
          ...args
        ],
        { timeoutMs }
      );
      if (r === null) continue;
      if (r.code === 0) return r;
      if (!isEndpointError(r.stderr)) return r;
      last = r;
    }
  }
  return last;
}
async function nerdctlExec(channel, args, timeoutMs) {
  const namespaces = channel.ctr_namespace !== void 0 ? [channel.ctr_namespace] : CONTAINERD_NAMESPACES;
  let last = null;
  for (const namespace of namespaces) {
    const r = await tryExecCapture(
      "nerdctl",
      ["--namespace", namespace, "exec", channel.container_id, ...args],
      { timeoutMs }
    );
    if (r === null) continue;
    if (r.code === 0) return r;
    if (!isEndpointError(r.stderr)) return r;
    last = r;
  }
  return last;
}
async function containerExec(channel, args, timeoutMs) {
  if (channel.runtime === "docker" || channel.runtime === "podman") {
    return tryExecCapture(channel.runtime, ["exec", channel.container_id, ...args], { timeoutMs });
  }
  if (channel.runtime === "crictl") return crictlExec(channel, args, timeoutMs);
  if (channel.runtime === "ctr") return ctrExec(channel, args, timeoutMs);
  return nerdctlExec(channel, args, timeoutMs);
}
var init_container_exec = __esm({
  "src/core/gpu/container-exec.mts"() {
    "use strict";
    init_exec();
    init_cri();
  }
});

// src/core/gpu/providers/ollama.mts
var ollama_exports = {};
__export(ollama_exports, {
  HOST_CHANNEL: () => HOST_CHANNEL,
  detect: () => detect,
  load: () => load,
  unload: () => unload
});
function parsePs(raw) {
  const data = typeof raw === "object" && raw !== null ? raw : {};
  if (!Array.isArray(data.models)) return [];
  const names = [];
  for (const m of data.models) {
    if (typeof m !== "object" || m === null) continue;
    const o = m;
    const name = typeof o.name === "string" ? o.name : typeof o.model === "string" ? o.model : "";
    if (name === "") continue;
    if (typeof o.size_vram === "number" && o.size_vram <= 0) continue;
    names.push(name);
  }
  return names;
}
async function detectHttp(channel) {
  const res = await channelFetch(channel, { path: "/api/ps", timeoutMs: 2e3 });
  if (res === null || !res.ok) return null;
  try {
    return parsePs(JSON.parse(res.text));
  } catch {
    return null;
  }
}
async function detectExec(channel) {
  const r = await containerExec(channel, ["ollama", "ps"], 1e4);
  if (r === null || r.code !== 0) return null;
  const names = [];
  for (const rawLine of r.stdout.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || /^NAME\b/i.test(line) || /^No models/i.test(line)) continue;
    const name = line.split(/\s+/)[0];
    if (name !== void 0 && name !== "") names.push(name);
  }
  return names;
}
async function detect(channel) {
  if (channel.kind === "exec") return detectExec(channel);
  return detectHttp(channel);
}
async function unload(channel, models) {
  const ok = [];
  const errors = [];
  for (const model of models) {
    if (channel.kind === "exec") {
      const r = await containerExec(channel, ["ollama", "stop", model], 2e4);
      if (r !== null && r.code === 0) ok.push(model);
      else {
        errors.push(
          `ollama:${model} \u5378\u8F7D\u5931\u8D25\uFF08${r === null ? "\u5BB9\u5668\u5185 ollama \u4E0D\u53EF\u7528" : r.stderr.trim().slice(0, 200)}\uFF09`
        );
      }
      continue;
    }
    const res = await channelFetch(channel, {
      path: "/api/generate",
      method: "POST",
      body: { model, keep_alive: 0, stream: false },
      timeoutMs: 15e3
    });
    if (res === null) errors.push(`ollama:${model} \u5378\u8F7D\u5931\u8D25\uFF08\u901A\u9053\u4E0D\u53EF\u8FBE\uFF09`);
    else if (!res.ok) errors.push(`ollama:${model} \u5378\u8F7D\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`);
    else ok.push(model);
  }
  return { ok, errors };
}
async function load(channel, models) {
  const restored = [];
  const errors = [];
  for (const model of models) {
    if (channel.kind === "exec") {
      const r = await containerExec(
        channel,
        ["ollama", "run", model, "--keepalive", "5m", ""],
        12e4
      );
      if (r !== null && r.code === 0) restored.push(model);
      else {
        errors.push(
          `ollama:${model} \u91CD\u8F7D\u5931\u8D25\uFF08${r === null ? "\u5BB9\u5668\u5185 ollama \u4E0D\u53EF\u7528" : r.stderr.trim().slice(0, 200)}\uFF09`
        );
      }
      continue;
    }
    const res = await channelFetch(channel, {
      path: "/api/generate",
      method: "POST",
      body: { model, prompt: "", stream: false, keep_alive: "5m" },
      timeoutMs: 6e4
    });
    if (res === null) errors.push(`ollama:${model} \u91CD\u8F7D\u5931\u8D25\uFF08\u901A\u9053\u4E0D\u53EF\u8FBE\uFF09`);
    else if (!res.ok) errors.push(`ollama:${model} \u91CD\u8F7D\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`);
    else restored.push(model);
  }
  return { restored, errors };
}
var BASE, HOST_CHANNEL;
var init_ollama = __esm({
  "src/core/gpu/providers/ollama.mts"() {
    "use strict";
    init_channel();
    init_container_exec();
    BASE = "http://127.0.0.1:11434";
    HOST_CHANNEL = { kind: "host", base_url: BASE };
  }
});

// src/core/gpu/providers/lmstudio.mts
var lmstudio_exports = {};
__export(lmstudio_exports, {
  HOST_CHANNEL: () => HOST_CHANNEL2,
  detect: () => detect2,
  load: () => load2,
  unload: () => unload2
});
function extractModels(raw) {
  const arr = Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null && Array.isArray(raw.models) ? raw.models : null;
  if (arr === null) return [];
  const out = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const o = item;
    const id = typeof o.identifier === "string" && o.identifier || typeof o.modelKey === "string" && o.modelKey || typeof o.model === "string" && o.model || typeof o.path === "string" && o.path || "";
    if (id !== "") out.push(id);
  }
  return out;
}
function hostArgs(baseUrl, args) {
  return baseUrl === BASE2 ? args : [...args, "--host", baseUrl];
}
async function detect2(channel) {
  if (channel.kind === "exec") {
    const r2 = await containerExec(channel, ["lms", "ps", "--json"], 1e4);
    if (r2 === null || r2.code !== 0) return null;
    try {
      return extractModels(JSON.parse(r2.stdout));
    } catch {
      return null;
    }
  }
  if (channel.kind === "netns") return null;
  const r = await tryExecCapture("lms", hostArgs(channel.base_url, ["ps", "--json"]), {
    timeoutMs: 1e4
  });
  if (r === null || r.code !== 0) return null;
  try {
    return extractModels(JSON.parse(r.stdout));
  } catch {
    return null;
  }
}
async function unload2(channel, models) {
  const ok = [];
  const errors = [];
  for (const model of models) {
    const r = channel.kind === "exec" ? await containerExec(channel, ["lms", "unload", model], 3e4) : channel.kind === "host" ? await tryExecCapture("lms", hostArgs(channel.base_url, ["unload", model]), {
      timeoutMs: 3e4
    }) : null;
    if (r !== null && r.code === 0) ok.push(model);
    else {
      errors.push(
        `lmstudio:${model} \u5378\u8F7D\u5931\u8D25\uFF08${r === null ? "lms \u4E0D\u53EF\u7528\u6216\u901A\u9053\u4E0D\u652F\u6301" : r.stderr.trim().slice(0, 200)}\uFF09`
      );
    }
  }
  return { ok, errors };
}
async function load2(channel, models) {
  const restored = [];
  const errors = [];
  for (const model of models) {
    const r = channel.kind === "exec" ? await containerExec(channel, ["lms", "load", model], 13e4) : channel.kind === "host" ? await tryExecCapture("lms", hostArgs(channel.base_url, ["load", model]), {
      timeoutMs: 13e4
    }) : null;
    if (r !== null && r.code === 0) restored.push(model);
    else {
      errors.push(
        `lmstudio:${model} \u91CD\u8F7D\u5931\u8D25\uFF08${r === null ? "lms \u4E0D\u53EF\u7528\u6216\u901A\u9053\u4E0D\u652F\u6301" : r.stderr.trim().slice(0, 200)}\uFF09`
      );
    }
  }
  return { restored, errors };
}
var BASE2, HOST_CHANNEL2;
var init_lmstudio = __esm({
  "src/core/gpu/providers/lmstudio.mts"() {
    "use strict";
    init_exec();
    init_container_exec();
    BASE2 = "http://127.0.0.1:1234";
    HOST_CHANNEL2 = { kind: "host", base_url: BASE2 };
  }
});

// src/core/gpu/providers/xinference.mts
var xinference_exports = {};
__export(xinference_exports, {
  HOST_CHANNEL: () => HOST_CHANNEL3,
  detect: () => detect3,
  load: () => load3,
  unload: () => unload3
});
function parseModels(raw) {
  const arr = Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null && Array.isArray(raw.data) ? raw.data : [];
  const out = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const o = item;
    const id = typeof o.id === "string" ? o.id : "";
    const name = typeof o.model_name === "string" ? o.model_name : id;
    if (id !== "") out.push(id);
    else if (name !== "") out.push(name);
  }
  return out;
}
async function runPython(channel, code, args, timeoutMs) {
  let last = null;
  for (const python of ["python3", "python"]) {
    const r = await containerExec(channel, [python, "-c", code, ...args], timeoutMs);
    if (r === null) continue;
    if (r.code === 0) return r;
    if (r.code === 127 || /not found|No such file|executable file not found/i.test(r.stderr)) {
      last = r;
      continue;
    }
    return r;
  }
  return last;
}
async function detect3(channel) {
  if (channel.kind === "exec") {
    const r = await runPython(channel, PY_DETECT, [BASE3], 1e4);
    if (r === null || r.code !== 0) return null;
    try {
      return parseModels(JSON.parse(r.stdout));
    } catch {
      return null;
    }
  }
  const res = await channelFetch(channel, { path: "/v1/models", timeoutMs: 2e3 });
  if (res === null || !res.ok) return null;
  try {
    return parseModels(JSON.parse(res.text));
  } catch {
    return null;
  }
}
async function unload3(channel, models) {
  const ok = [];
  const errors = [];
  for (const id of models) {
    if (channel.kind === "exec") {
      const r = await runPython(channel, PY_DELETE, [BASE3, id], 4e4);
      if (r !== null && r.code === 0) ok.push(id);
      else {
        errors.push(
          `xinference:${id} \u5378\u8F7D\u5931\u8D25\uFF08${r === null ? "\u5BB9\u5668\u5185 Python \u4E0D\u53EF\u7528" : r.stderr.trim().slice(0, 200)}\uFF09`
        );
      }
      continue;
    }
    const res = await channelFetch(channel, {
      path: `/v1/models/${encodeURIComponent(id)}`,
      method: "DELETE",
      timeoutMs: 3e4
    });
    if (res === null) errors.push(`xinference:${id} \u5378\u8F7D\u5931\u8D25\uFF08\u901A\u9053\u4E0D\u53EF\u8FBE\uFF09`);
    else if (!res.ok) errors.push(`xinference:${id} \u5378\u8F7D\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`);
    else ok.push(id);
  }
  return { ok, errors };
}
async function load3(channel, models) {
  const restored = [];
  const errors = [];
  for (const id of models) {
    if (channel.kind === "exec") {
      const r = await runPython(channel, PY_CREATE, [BASE3, id], 13e4);
      if (r !== null && r.code === 0) restored.push(id);
      else {
        errors.push(
          `xinference:${id} \u91CD\u8F7D\u5931\u8D25\uFF08${r === null ? "\u5BB9\u5668\u5185 Python \u4E0D\u53EF\u7528" : r.stderr.trim().slice(0, 200)}\uFF09`
        );
      }
      continue;
    }
    const res = await channelFetch(channel, {
      path: "/v1/models",
      method: "POST",
      body: { model_name: id, model_type: "LLM" },
      timeoutMs: 12e4
    });
    if (res === null) errors.push(`xinference:${id} \u91CD\u8F7D\u5931\u8D25\uFF08\u901A\u9053\u4E0D\u53EF\u8FBE\uFF09`);
    else if (!res.ok) errors.push(`xinference:${id} \u91CD\u8F7D\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`);
    else restored.push(id);
  }
  return { restored, errors };
}
var BASE3, HOST_CHANNEL3, PY_DETECT, PY_DELETE, PY_CREATE;
var init_xinference = __esm({
  "src/core/gpu/providers/xinference.mts"() {
    "use strict";
    init_channel();
    init_container_exec();
    BASE3 = "http://127.0.0.1:9997";
    HOST_CHANNEL3 = { kind: "host", base_url: BASE3 };
    PY_DETECT = [
      "import sys, urllib.request",
      "base = sys.argv[1]",
      "with urllib.request.urlopen(base + '/v1/models', timeout=3) as r:",
      "    sys.stdout.write(r.read().decode())"
    ].join("\n");
    PY_DELETE = [
      "import sys, urllib.parse, urllib.request",
      "base, model_id = sys.argv[1], sys.argv[2]",
      "url = base + '/v1/models/' + urllib.parse.quote(model_id, safe='')",
      "req = urllib.request.Request(url, method='DELETE')",
      "with urllib.request.urlopen(req, timeout=30) as r:",
      "    sys.stdout.write(r.read().decode())"
    ].join("\n");
    PY_CREATE = [
      "import json, sys, urllib.request",
      "base, model_id = sys.argv[1], sys.argv[2]",
      "data = json.dumps({'model_name': model_id, 'model_type': 'LLM'}).encode()",
      "req = urllib.request.Request(base + '/v1/models', data=data, method='POST', headers={'Content-Type': 'application/json'})",
      "with urllib.request.urlopen(req, timeout=120) as r:",
      "    sys.stdout.write(r.read().decode())"
    ].join("\n");
  }
});

// src/core/gpu/providers/vllm.mts
var vllm_exports = {};
__export(vllm_exports, {
  HOST_CHANNEL: () => HOST_CHANNEL4,
  detect: () => detect4,
  load: () => load4,
  unload: () => unload4
});
function parseSleeping(text) {
  const raw = text.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  try {
    const data = JSON.parse(text);
    if (typeof data === "boolean") return data;
    if (typeof data === "object" && data !== null) {
      const o = data;
      if (typeof o.is_sleeping === "boolean") return o.is_sleeping;
      if (typeof o.sleeping === "boolean") return o.sleeping;
    }
  } catch {
  }
  return null;
}
async function runPython2(channel, args, timeoutMs) {
  let last = null;
  for (const python of ["python3", "python"]) {
    const r = await containerExec(channel, [python, "-c", PY_HTTP, ...args], timeoutMs);
    if (r === null) continue;
    if (r.code === 0) return r;
    if (r.code === 127 || /not found|No such file|executable file not found/i.test(r.stderr)) {
      last = r;
      continue;
    }
    return r;
  }
  return last;
}
async function pythonHttp(channel, method, path, body, timeoutMs) {
  const bodyArg = body !== void 0 ? JSON.stringify(body) : "";
  const r = await runPython2(channel, [method, `${BASE4}${path}`, bodyArg], timeoutMs + 5e3);
  if (r === null || r.code !== 0) return null;
  const nl = r.stdout.indexOf("\n");
  const statusLine = nl >= 0 ? r.stdout.slice(0, nl) : r.stdout;
  const text = nl >= 0 ? r.stdout.slice(nl + 1) : "";
  const status = Number(statusLine.trim());
  if (!Number.isFinite(status)) return null;
  return { status, text };
}
async function detect4(channel) {
  if (channel.kind === "exec") {
    const res2 = await pythonHttp(channel, "GET", "/is_sleeping", void 0, 5e3);
    if (res2 === null || res2.status === 404 || res2.status === 400) return null;
    if (res2.status < 200 || res2.status >= 300) return null;
    const sleeping2 = parseSleeping(res2.text);
    if (sleeping2 === null) return null;
    return sleeping2 ? [] : ["sleep"];
  }
  const res = await channelFetch(channel, { path: "/is_sleeping", timeoutMs: 3e3 });
  if (res === null || res.status === 404 || res.status === 400) return null;
  if (!res.ok) return null;
  const sleeping = parseSleeping(res.text);
  if (sleeping === null) return null;
  return sleeping ? [] : ["sleep"];
}
async function unload4(channel, models) {
  if (models.length === 0) return { ok: [], errors: [] };
  if (channel.kind === "exec") {
    const res2 = await pythonHttp(channel, "POST", "/sleep?level=1", {}, 3e4);
    if (res2 !== null && res2.status >= 200 && res2.status < 300) return { ok: models, errors: [] };
    return {
      ok: [],
      errors: [
        `vllm \u5378\u8F7D\u5931\u8D25\uFF08${res2 === null ? "\u5BB9\u5668\u5185 Python \u4E0D\u53EF\u7528" : `HTTP ${res2.status}\uFF1B\u9700 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1`}\uFF09`
      ]
    };
  }
  const res = await channelFetch(channel, {
    path: "/sleep?level=1",
    method: "POST",
    body: {},
    timeoutMs: 3e4
  });
  if (res !== null && res.ok) return { ok: models, errors: [] };
  return {
    ok: [],
    errors: [
      `vllm \u5378\u8F7D\u5931\u8D25\uFF08${res === null ? "\u901A\u9053\u4E0D\u53EF\u8FBE" : `HTTP ${res.status}\uFF1B\u9700 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1`}\uFF09`
    ]
  };
}
async function load4(channel, models) {
  if (models.length === 0) return { restored: [], errors: [] };
  if (channel.kind === "exec") {
    const res2 = await pythonHttp(channel, "POST", "/wake_up", {}, 12e4);
    if (res2 !== null && res2.status >= 200 && res2.status < 300) return { restored: models, errors: [] };
    return {
      restored: [],
      errors: [
        `vllm \u6062\u590D\u5931\u8D25\uFF08${res2 === null ? "\u5BB9\u5668\u5185 Python \u4E0D\u53EF\u7528" : `HTTP ${res2.status}`}\uFF09`
      ]
    };
  }
  const res = await channelFetch(channel, {
    path: "/wake_up",
    method: "POST",
    body: {},
    timeoutMs: 12e4
  });
  if (res !== null && res.ok) return { restored: models, errors: [] };
  return {
    restored: [],
    errors: [`vllm \u6062\u590D\u5931\u8D25\uFF08${res === null ? "\u901A\u9053\u4E0D\u53EF\u8FBE" : `HTTP ${res.status}`}\uFF09`]
  };
}
var BASE4, HOST_CHANNEL4, PY_HTTP;
var init_vllm = __esm({
  "src/core/gpu/providers/vllm.mts"() {
    "use strict";
    init_channel();
    init_container_exec();
    BASE4 = "http://127.0.0.1:8000";
    HOST_CHANNEL4 = { kind: "host", base_url: BASE4 };
    PY_HTTP = [
      "import sys, urllib.request, urllib.error",
      "method, url, body = sys.argv[1], sys.argv[2], sys.argv[3]",
      "data = body.encode() if body else None",
      "req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})",
      "try:",
      "    with urllib.request.urlopen(req, timeout=5) as r:",
      "        print(r.status)",
      "        sys.stdout.write(r.read().decode())",
      "except urllib.error.HTTPError as e:",
      "    print(e.code)",
      "    sys.stdout.write(e.read().decode())",
      "except Exception as e:",
      "    sys.stderr.write(str(e))",
      "    sys.exit(1)"
    ].join("\n");
  }
});

// src/core/gpu/providers/process.mts
import { readFileSync as readFileSync7, readlinkSync } from "fs";
import { spawn as spawn3 } from "child_process";
async function listProcesses() {
  const r = await tryExecCapture("ps", ["-eo", "pid=,uid=,comm=,args="], { timeoutMs: 1e4 });
  if (r === null || r.code !== 0) return [];
  const out = [];
  for (const line of r.stdout.split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/.exec(line);
    if (m === null) continue;
    const pid = Number(m[1]);
    const uid = Number(m[2]);
    const comm = m[3] ?? "";
    const args = m[4] ?? "";
    if (!Number.isFinite(pid) || pid <= 0) continue;
    out.push({ pid, uid, comm, args });
  }
  return out;
}
async function ancestorPids() {
  const out = /* @__PURE__ */ new Set();
  let pid = process.ppid;
  for (let i = 0; i < 64 && pid > 1; i++) {
    out.add(pid);
    const r = await tryExecCapture("ps", ["-o", "ppid=", "-p", String(pid)], { timeoutMs: 3e3 });
    if (r === null || r.code !== 0) break;
    const ppid = Number(r.stdout.trim());
    if (!Number.isFinite(ppid) || ppid <= 1) break;
    pid = ppid;
  }
  return out;
}
function cmdlineOf(info) {
  if (process.platform === "linux") {
    try {
      const parts = readFileSync7(`/proc/${info.pid}/cmdline`, "utf8").split("\0").filter((x) => x !== "");
      if (parts.length > 0) return parts;
    } catch {
    }
  }
  return info.args.split(/\s+/).filter((x) => x !== "");
}
function cwdOf(pid) {
  try {
    return readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return null;
  }
}
function hasForeignRoot(pid) {
  try {
    return readlinkSync(`/proc/${pid}/root`) !== "/";
  } catch {
    return true;
  }
}
async function findTargetProcesses(opts = {}) {
  const uid = typeof process.getuid === "function" ? process.getuid() : -1;
  if (uid < 0) return [];
  const gpuPids = opts.gpuPids ?? await gpuProcessPids();
  if (gpuPids === null || gpuPids.size === 0) return [];
  const ancestors = await ancestorPids();
  const procs = await listProcesses();
  const hits = [];
  for (const p of procs) {
    if (p.uid !== uid) continue;
    if (!gpuPids.has(p.pid)) continue;
    if (p.pid === 1 || p.pid === process.pid || ancestors.has(p.pid)) continue;
    if (PROTECTED_COMMS.has(p.comm)) continue;
    if (readContainerInfo(p.pid) !== null) continue;
    if (hasForeignRoot(p.pid)) continue;
    const rule = GPU_PROCESS_TARGETS.find((r) => r.pattern.test(p.comm) || r.pattern.test(p.args));
    if (rule === void 0) continue;
    const cmdline = cmdlineOf(p);
    if (cmdline.length === 0) continue;
    hits.push({ target: rule.id, pid: p.pid, cmdline, cwd: cwdOf(p.pid), started_at: nowIso() });
  }
  return hits;
}
async function waitExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await sleep(200);
  }
  return false;
}
async function evictProcesses(targets) {
  const evicted = [];
  const errors = [];
  for (const t of targets) {
    try {
      process.kill(t.pid, "SIGTERM");
      if (!await waitExit(t.pid, 5e3)) {
        process.kill(t.pid, "SIGKILL");
        if (!await waitExit(t.pid, 2e3)) {
          errors.push(`${t.target}(pid ${t.pid}) \u672A\u80FD\u9000\u51FA`);
          continue;
        }
      }
      evicted.push(t);
    } catch (e) {
      errors.push(`${t.target}(pid ${t.pid}) \u9A71\u9010\u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { evicted, errors };
}
async function restartProcesses(records) {
  const restored = [];
  const errors = [];
  for (const r of records) {
    const bin = r.cmdline[0];
    if (bin === void 0) {
      errors.push(`${r.target}: \u7F3A\u5C11 argv`);
      continue;
    }
    try {
      const child = spawn3(bin, r.cmdline.slice(1), {
        cwd: r.cwd ?? void 0,
        detached: true,
        stdio: "ignore",
        env: process.env
      });
      await new Promise((resolvePromise, rejectPromise) => {
        child.once("spawn", () => resolvePromise());
        child.once("error", (e) => rejectPromise(e));
      });
      child.unref();
      restored.push(`${r.target}:pid${r.pid}`);
    } catch (e) {
      errors.push(`${r.target}: \u91CD\u542F\u5931\u8D25\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`);
    }
  }
  return { restored, errors };
}
var init_process = __esm({
  "src/core/gpu/providers/process.mts"() {
    "use strict";
    init_exec();
    init_fs();
    init_net();
    init_targets();
    init_detect();
    init_containers();
  }
});

// src/core/gpu/takeover.mts
var takeover_exports = {};
__export(takeover_exports, {
  restoreLease: () => restoreLease,
  restoreLeaseIfAny: () => restoreLeaseIfAny,
  takeoverEnabled: () => takeoverEnabled,
  takeoverGpu: () => takeoverGpu
});
function takeoverEnabled(project) {
  return project.gpu?.takeover === true;
}
async function takeoverGpu(opts) {
  if (!takeoverEnabled(opts.project)) {
    return {
      enabled: false,
      record: { takeover: false, evicted: [], restored: [], errors: [] },
      issues: []
    };
  }
  const snapshot2 = await gpuSnapshot();
  if (!snapshot2.supported) {
    return {
      enabled: false,
      record: { takeover: false, evicted: [], restored: [], errors: [] },
      issues: [
        {
          code: "gpu_unsupported",
          message: `GPU \u63A5\u7BA1\u4E0D\u53EF\u7528\uFF08${snapshot2.reason ?? "\u672A\u77E5\u539F\u56E0"}\uFF09\uFF1B\u4EFB\u52A1\u7EE7\u7EED\uFF0C\u672A\u9A71\u9010\u4EFB\u4F55\u8FDB\u7A0B`
        }
      ]
    };
  }
  const before = totalVram(snapshot2);
  const entries = [];
  const lease = newLease(opts.taskId, opts.projectRoot);
  writeLease(lease);
  const issues = [];
  const evicted = [];
  for (const id of GPU_PROVIDER_IDS) {
    const adapter = PROVIDERS[id];
    const channel = HOST_CHANNELS[id];
    const models = await adapter.detect(channel);
    if (models === null || models.length === 0) continue;
    opts.log(`GPU \u63A5\u7BA1\uFF1A\u5378\u8F7D ${id} \u6A21\u578B ${models.join(", ")}`);
    const result = await adapter.unload(channel, models);
    if (result.ok.length > 0) {
      entries.push({ kind: "provider", provider: id, models: result.ok, channel });
      lease.entries.push({ kind: "provider", provider: id, models: result.ok, channel });
      writeLease(lease);
      evicted.push({ kind: "provider", provider: id, models: result.ok, via: "host" });
    }
    for (const e of result.errors) {
      issues.push({ code: "gpu_takeover_failed", message: e });
    }
  }
  if (entries.length > 0) await sleep(500);
  const apps = await gpuComputeApps();
  const gpuPids = apps !== null ? new Set(apps.map((a) => a.pid)) : /* @__PURE__ */ new Set();
  if (apps === null) {
    issues.push({
      code: "gpu_takeover_failed",
      message: "nvidia-smi \u65E0\u6CD5\u8BFB\u53D6\u8BA1\u7B97\u8FDB\u7A0B\uFF0C\u8DF3\u8FC7\u5BB9\u5668/\u8FDB\u7A0B\u63A5\u7BA1"
    });
  }
  const discovery = await findContainerServices({ apps: apps ?? [] });
  for (const issue of discovery.issues) {
    issues.push({ code: "gpu_takeover_failed", message: issue });
  }
  for (const service of discovery.services) {
    const adapter = PROVIDERS[service.provider];
    let accessed = false;
    for (const channel of service.channels) {
      const models = await adapter.detect(channel);
      if (models === null) continue;
      accessed = true;
      if (models.length === 0) break;
      const name = service.info.name !== "" ? service.info.name : service.info.id.slice(0, 12);
      opts.log(
        `GPU \u63A5\u7BA1\uFF1A\u5378\u8F7D\u5BB9\u5668\u5185 ${service.provider} \u6A21\u578B ${models.join(", ")}\uFF08${name}\uFF0C${channel.kind} \u901A\u9053\uFF09`
      );
      const result = await adapter.unload(channel, models);
      if (result.ok.length > 0) {
        const fallbacks = service.channels.filter((c) => c !== channel);
        const providerEntry = {
          kind: "provider",
          provider: service.provider,
          models: result.ok,
          channel,
          ...fallbacks.length > 0 ? { fallbacks } : {}
        };
        entries.push(providerEntry);
        lease.entries.push(providerEntry);
        writeLease(lease);
        evicted.push({
          kind: "provider",
          provider: service.provider,
          models: result.ok,
          via: channel.kind,
          container: name
        });
      }
      for (const e of result.errors) {
        issues.push({ code: "gpu_takeover_failed", message: e });
      }
      break;
    }
    if (!accessed) {
      const name = service.info.name !== "" ? service.info.name : service.info.id.slice(0, 12);
      const why = service.provider === "vllm" ? "\u672A\u542F\u7528 sleep mode\uFF08\u9700\u8981 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1\uFF09" : "\u65E0\u6CD5\u8BBF\u95EE\uFF08host/netns/exec \u5747\u4E0D\u53EF\u7528\uFF09";
      issues.push({
        code: "gpu_takeover_failed",
        message: `\u5BB9\u5668\u5185 ${service.provider} ${why}\uFF1B\u672A\u5378\u8F7D\uFF0C\u5BB9\u5668\u4FDD\u6301\u8FD0\u884C\uFF08${name}\uFF09`
      });
    }
  }
  const targets = await findTargetProcesses({ gpuPids });
  if (targets.length > 0) {
    opts.log(`GPU \u63A5\u7BA1\uFF1A\u9A71\u9010\u88F8\u673A\u8FDB\u7A0B ${targets.map((t) => `${t.target}(pid ${t.pid})`).join(", ")}`);
  }
  const killed = await evictProcesses(targets);
  for (const t of killed.evicted) {
    entries.push({ kind: "process", process: t });
    lease.entries.push({ kind: "process", process: t });
    evicted.push({ kind: "process", target: t.target, pid: t.pid });
  }
  if (killed.evicted.length > 0) writeLease(lease);
  for (const e of killed.errors) {
    issues.push({ code: "gpu_takeover_failed", message: e });
  }
  if (entries.length === 0) clearLease();
  const afterSnapshot = await gpuSnapshot();
  const after = afterSnapshot.supported ? totalVram(afterSnapshot) : null;
  return {
    enabled: true,
    record: {
      takeover: true,
      before: { used_mb: before.usedMb, free_mb: before.freeMb },
      evicted,
      ...after !== null ? { after: { used_mb: after.usedMb, free_mb: after.freeMb } } : {},
      restored: [],
      errors: issues.map((i) => ({ code: i.code, message: i.message }))
    },
    issues
  };
}
async function restoreLease(lease, log) {
  const restored = [];
  const errors = [];
  for (const entry of lease.entries) {
    if (entry.kind !== "provider") continue;
    if (!Array.isArray(entry.models)) {
      errors.push({ code: "gpu_restore_failed", message: "GPU \u79DF\u7EA6\u4E2D\u7684\u6A21\u578B\u8BB0\u5F55\u65E0\u6548\uFF1B\u8DF3\u8FC7" });
      continue;
    }
    const adapter = PROVIDERS[entry.provider];
    if (adapter === void 0) {
      errors.push({
        code: "gpu_restore_failed",
        message: `GPU \u79DF\u7EA6\u4E2D\u7684 provider ${String(entry.provider)} \u672A\u77E5\uFF1B\u8DF3\u8FC7`
      });
      continue;
    }
    const primary = entry.channel ?? HOST_CHANNELS[entry.provider];
    const candidates = [
      primary,
      ...Array.isArray(entry.fallbacks) ? entry.fallbacks : []
    ];
    let channel = null;
    let current = null;
    for (const c of candidates) {
      const det = await adapter.detect(c);
      if (det !== null) {
        channel = c;
        current = det;
        break;
      }
    }
    if (channel === null) {
      channel = primary;
      current = null;
    }
    const missing = current === null ? entry.models : entry.models.filter((m) => !current.includes(m));
    if (missing.length === 0) {
      restored.push(`${entry.provider}:\u5DF2\u52A0\u8F7D\uFF08\u8DF3\u8FC7\uFF09`);
      continue;
    }
    optsLog(
      log,
      `GPU \u6062\u590D\uFF1A\u91CD\u8F7D ${entry.provider} \u6A21\u578B ${missing.join(", ")}\uFF08${channel.kind} \u901A\u9053\uFF09`
    );
    const r2 = await adapter.load(channel, missing);
    for (const m of r2.restored) restored.push(`${entry.provider}:${m}`);
    for (const e of r2.errors) errors.push({ code: "gpu_restore_failed", message: e });
  }
  const procs = lease.entries.filter(
    (e) => e.kind === "process"
  );
  if (procs.length > 0) {
    optsLog(
      log,
      `GPU \u6062\u590D\uFF1A\u91CD\u542F\u88F8\u673A\u8FDB\u7A0B ${procs.map((p) => `${p.process.target}(pid ${p.process.pid})`).join(", ")}`
    );
  }
  const r = await restartProcesses(procs.map((p) => p.process));
  restored.push(...r.restored);
  for (const e of r.errors) errors.push({ code: "gpu_restore_failed", message: e });
  if (errors.length === 0) clearLease();
  return { restored, errors };
}
async function restoreLeaseIfAny(log = () => {
}) {
  const cur = inspectLease();
  if (cur.status === "absent") return { restored: [], errors: [] };
  if (cur.status === "corrupt") {
    throw new DaoyanCliError({
      code: "gpu_lease_corrupt",
      message: `GPU \u79DF\u7EA6\u635F\u574F\uFF08${cur.path}\uFF09\uFF1A${cur.message}\u3002\u786E\u8BA4\u6CA1\u6709\u4EFB\u52A1\u5728\u8DD1\u540E\u624B\u52A8\u5904\u7406`
    });
  }
  log(`\u53D1\u73B0\u65E7 GPU \u79DF\u7EA6\uFF08task ${cur.lease.task_id}\uFF09\uFF0C\u5148\u6062\u590D\u518D\u5F00\u59CB\u65B0\u4EFB\u52A1`);
  return restoreLease(cur.lease, log);
}
function optsLog(log, msg) {
  log(msg);
}
var PROVIDERS, HOST_CHANNELS;
var init_takeover = __esm({
  "src/core/gpu/takeover.mts"() {
    "use strict";
    init_errors();
    init_net();
    init_detect();
    init_lease();
    init_targets();
    init_ollama();
    init_lmstudio();
    init_xinference();
    init_vllm();
    init_process();
    init_containers();
    PROVIDERS = {
      ollama: ollama_exports,
      lmstudio: lmstudio_exports,
      xinference: xinference_exports,
      vllm: vllm_exports
    };
    HOST_CHANNELS = {
      ollama: HOST_CHANNEL,
      lmstudio: HOST_CHANNEL2,
      xinference: HOST_CHANNEL3,
      vllm: HOST_CHANNEL4
    };
  }
});

// src/core/engine/local-session.mts
var local_session_exports = {};
__export(local_session_exports, {
  LocalSession: () => LocalSession,
  enginePidFile: () => enginePidFile,
  pidAlive: () => pidAlive,
  readEnginePid: () => readEnginePid,
  stopResidualEngine: () => stopResidualEngine
});
import { closeSync, existsSync as existsSync10, openSync, readFileSync as readFileSync8, readSync, rmSync as rmSync7, statSync, unlinkSync, writeFileSync as writeFileSync3 } from "fs";
import { spawn as spawn4 } from "child_process";
import { join as join8 } from "path";
function enginePidFile(root) {
  return join8(root, LOG_DIR, ENGINE_PID_FILE);
}
function readEnginePid(root) {
  const file = enginePidFile(root);
  if (!existsSync10(file)) return null;
  try {
    const text = readFileSync8(file, "utf8").trim();
    if (/^\d+$/.test(text)) {
      return { pid: Number(text), port: 0, comfyui_dir: "", task_id: "", started_at: "" };
    }
    const raw = readJsonIfExists(file);
    return raw !== null && typeof raw.pid === "number" ? raw : null;
  } catch {
    return null;
  }
}
function writeEnginePid(root, rec) {
  ensureDir(join8(root, LOG_DIR));
  writeFileSync3(enginePidFile(root), JSON.stringify(rec, null, 2) + "\n", { mode: 384 });
}
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
async function verifyOwnEngine(rec) {
  if (rec.pid <= 0) return false;
  const r = await tryExecCapture("ps", ["-p", String(rec.pid), "-o", "args="], { timeoutMs: 3e3 });
  if (r === null || r.code !== 0) return false;
  const cmd = r.stdout.trim();
  if (!cmd.includes("main.py")) return false;
  if (rec.comfyui_dir !== "" && !cmd.includes(rec.comfyui_dir)) {
    if (rec.port <= 0 || !cmd.includes(String(rec.port))) return false;
  }
  return true;
}
async function stopPid(pid, log) {
  if (!pidAlive(pid)) return true;
  log(`\u505C\u6B62\u5F15\u64CE\u8FDB\u7A0B pid=${pid}\uFF08SIGTERM\uFF09...`);
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return true;
    }
  }
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!pidAlive(pid)) return true;
    await sleep(300);
  }
  log(`\u5F15\u64CE\u672A\u5728 ${STOP_TIMEOUT_MS / 1e3}s \u5185\u9000\u51FA\uFF0CSIGKILL`);
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
    }
  }
  await sleep(500);
  return !pidAlive(pid);
}
async function stopResidualEngine(root, log) {
  const rec = readEnginePid(root);
  if (rec === null) return;
  if (!pidAlive(rec.pid)) {
    unlinkSync(enginePidFile(root));
    return;
  }
  if (!await verifyOwnEngine(rec)) {
    log(`PID ${rec.pid} \u4E0D\u5C5E\u4E8E\u672C\u9879\u76EE ComfyUI\uFF1B\u5220\u9664\u8FC7\u671F PID \u6587\u4EF6\uFF0C\u4E0D kill`);
    rmSync7(enginePidFile(root), { force: true });
    return;
  }
  if (rec.port > 0) {
    try {
      await new ComfyClient(`http://127.0.0.1:${rec.port}`).free();
    } catch {
    }
  }
  await stopPid(rec.pid, log);
  rmSync7(enginePidFile(root), { force: true });
}
function tailFile(file, lines) {
  if (!existsSync10(file)) return "(\u6587\u4EF6\u4E0D\u5B58\u5728)";
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return "(\u4E0D\u53EF\u8BFB)";
  }
  const window = Math.min(size, lines * 400 + 65536);
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync(file, "r");
    readSync(fd, buf, 0, window, size - window);
    closeSync(fd);
  } catch {
    return "(\u4E0D\u53EF\u8BFB)";
  }
  return buf.toString("utf8").split(/[\r\n]+/).filter((l) => l !== "").slice(-lines).join("\n");
}
var READY_TIMEOUT_MS, READY_INTERVAL_MS, STOP_TIMEOUT_MS, LocalSession;
var init_local_session = __esm({
  "src/core/engine/local-session.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_net();
    init_exec();
    init_client();
    init_catalog();
    init_types();
    init_takeover();
    READY_TIMEOUT_MS = 18e4;
    READY_INTERVAL_MS = 1e3;
    STOP_TIMEOUT_MS = 15e3;
    LocalSession = class {
      /**
       * 共用 HTTP 客户端。
       */
      client;
      // 创建参数
      opts;
      // 就绪信息
      infoState;
      // 上一次接管记录
      gpuRecord;
      // 接管警告
      gpuIssues = [];
      /**
       * 构造会话（不启动引擎）。
       */
      constructor(opts) {
        this.opts = opts;
        if (opts.machine.engine.mode !== "local") {
          throw new DaoyanCliError({ code: "config_invalid", message: "LocalSession \u9700\u8981 local machine \u914D\u7F6E" });
        }
        const port = opts.machine.engine.port;
        this.client = new ComfyClient(`http://127.0.0.1:${port}`);
        this.infoState = {
          mode: "local",
          url: `http://127.0.0.1:${port}`,
          comfyui_version: null,
          pid: null,
          ready_ms: null
        };
      }
      /**
       * 当前会话信息。
       */
      info() {
        return { ...this.infoState };
      }
      /**
       * 进程健康。
       */
      health() {
        const pid = this.infoState.pid;
        if (pid === null) return "unknown";
        return pidAlive(pid) ? "alive" : "dead";
      }
      /**
       * 确保 local 引擎就绪（回收残留 → 恢复租约 → GPU 接管 → spawn → 等 /system_stats）。
       */
      async ensureReady(log, signal) {
        if (this.opts.machine.engine.mode !== "local") return;
        const isAborted = () => signal !== void 0 && signal.aborted;
        if (isAborted()) throw new Error("cancelled");
        const eng = this.opts.machine.engine;
        await stopResidualEngine(this.opts.root, log);
        if (!this.opts.metadataOnly) {
          try {
            const restored = await restoreLeaseIfAny(log);
            for (const e of restored.errors) {
              log(`GPU \u6062\u590D\u5931\u8D25\uFF1A${e.message}`);
            }
          } catch (e) {
            if (e instanceof DaoyanCliError && e.code === "gpu_lease_corrupt") throw e;
            log(`GPU \u79DF\u7EA6\u6062\u590D\u5F02\u5E38\uFF1A${e instanceof Error ? e.message : String(e)}`);
          }
        }
        if (!this.opts.metadataOnly && takeoverEnabled(this.opts.project)) {
          const outcome = await takeoverGpu({
            project: this.opts.project,
            taskId: this.opts.taskId,
            projectRoot: this.opts.root,
            log
          });
          this.gpuRecord = outcome.record;
          this.gpuIssues = outcome.issues;
          for (const issue of outcome.issues) log(issue.message);
        }
        const started = Date.now();
        const comfyDir = this.comfyDir();
        const venvPython = join8(this.venvDir(), "bin", "python");
        if (!existsSync10(venvPython)) {
          throw new DaoyanCliError({
            code: "engine_start_failed",
            message: `venv \u4E0D\u5B58\u5728\uFF1A${venvPython}\u3002\u8FD0\u884C daoyan init --mode=local \u90E8\u7F72\u5F15\u64CE`
          });
        }
        if (!existsSync10(join8(comfyDir, "main.py"))) {
          throw new DaoyanCliError({
            code: "engine_start_failed",
            message: `ComfyUI \u76EE\u5F55\u65E0\u6548\uFF1A${comfyDir}\uFF08\u7F3A\u5C11 main.py\uFF09\u3002\u8FD0\u884C daoyan init --mode=local`
          });
        }
        if (await portInUse(eng.port)) {
          throw new DaoyanCliError({
            code: "engine_start_failed",
            message: `\u7AEF\u53E3 ${eng.port} \u5DF2\u88AB\u5176\u4ED6\u8FDB\u7A0B\u5360\u7528\uFF08\u4E0D\u662F\u672C\u9879\u76EE\u521A\u56DE\u6536\u7684\u5F15\u64CE\uFF09\uFF1B\u8BF7\u91CA\u653E\u7AEF\u53E3\u6216\u4FEE\u6539 machine.json`
          });
        }
        const logDir = join8(this.opts.root, LOG_DIR);
        ensureDir(logDir);
        const logFile = join8(logDir, `engine-${this.opts.taskId}.log`);
        const fd = openSync(logFile, "a");
        const modelsConfig = this.modelsConfigPath();
        const args = ["-u", "main.py", "--port", String(eng.port)];
        if (modelsConfig !== null) args.push("--extra-model-paths-config", modelsConfig);
        args.push(...eng.launch_extra ?? []);
        log(`\u542F\u52A8 local \u5F15\u64CE\uFF1A${venvPython} ${args.join(" ")}`);
        let spawnError = null;
        const child = spawn4(venvPython, args, {
          cwd: comfyDir,
          detached: true,
          stdio: ["ignore", fd, fd],
          env: process.env
        });
        child.on("error", (e) => {
          spawnError = e.message;
        });
        child.unref();
        if (child.pid === void 0) {
          closeSync(fd);
          throw new DaoyanCliError({ code: "engine_start_failed", message: `\u65E0\u6CD5 spawn \u5F15\u64CE\uFF1A${spawnError ?? "unknown"}` });
        }
        this.infoState = { ...this.infoState, pid: child.pid };
        try {
          writeEnginePid(this.opts.root, {
            pid: child.pid,
            port: eng.port,
            comfyui_dir: comfyDir,
            task_id: this.opts.taskId,
            started_at: nowIso()
          });
        } catch (e) {
          await stopPid(child.pid, log);
          throw new DaoyanCliError({
            code: "engine_start_failed",
            message: `\u65E0\u6CD5\u5199 logs/engine.pid\uFF1A${e instanceof Error ? e.message : String(e)}`
          });
        }
        log(`\u5F15\u64CE\u8FDB\u7A0B pid=${child.pid}\uFF0C\u65E5\u5FD7 ${LOG_DIR}/engine-${this.opts.taskId}.log\uFF0C\u7B49\u5F85\u5C31\u7EEA...`);
        const deadline = Date.now() + READY_TIMEOUT_MS;
        while (Date.now() < deadline) {
          if (isAborted()) throw new Error("cancelled");
          if (spawnError !== null) {
            throw new DaoyanCliError({
              code: "engine_start_failed",
              message: `\u5F15\u64CE\u542F\u52A8\u5931\u8D25\uFF1A${spawnError}`
            });
          }
          if (await probeComfy(this.client.base, 3e3)) {
            let version = null;
            try {
              version = comfyVersionOf(await this.client.systemStats(1e4));
            } catch {
              version = null;
            }
            this.infoState = {
              ...this.infoState,
              comfyui_version: version,
              ready_ms: Date.now() - started
            };
            log(`\u5F15\u64CE\u5C31\u7EEA\uFF08${Date.now() - started}ms\uFF0CComfyUI ${version ?? "unknown"}\uFF09`);
            return;
          }
          if (!pidAlive(child.pid) && Date.now() - started > 1e4) {
            throw new DaoyanCliError({
              code: "engine_start_failed",
              message: `\u5F15\u64CE\u8FDB\u7A0B\u63D0\u524D\u9000\u51FA\u3002\u65E5\u5FD7\u5C3E\uFF08${LOG_DIR}/engine-${this.opts.taskId}.log\uFF09\uFF1A
${tailFile(logFile, 8)}`
            });
          }
          await sleep(READY_INTERVAL_MS);
        }
        throw new DaoyanCliError({
          code: "engine_start_failed",
          message: `\u5F15\u64CE ${READY_TIMEOUT_MS / 1e3}s \u5185\u672A\u5C31\u7EEA\uFF1B\u67E5\u770B ${LOG_DIR}/engine-${this.opts.taskId}.log
${tailFile(logFile, 8)}`
        });
      }
      /**
       * 任务结束清理。
       */
      async release(inputs, log) {
        const cleanup = {
          interrupt: "not_needed",
          free: "not_needed",
          stop: "not_needed",
          scratch: "not_needed",
          gpu_restore: "not_needed"
        };
        const errors = [];
        if (inputs.interrupt) {
          try {
            await this.client.interrupt();
            cleanup.interrupt = "ok";
          } catch {
            cleanup.interrupt = "failed";
          }
        }
        if (inputs.submitted) {
          try {
            await this.client.free();
            cleanup.free = "ok";
          } catch (e) {
            cleanup.free = "failed";
            errors.push({ code: "cleanup_failed", message: `free \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}` });
          }
        }
        const pid = this.infoState.pid;
        if (pid !== null) {
          const stopped = await stopPid(pid, log);
          cleanup.stop = stopped ? "ok" : "failed";
          if (stopped) rmSync7(enginePidFile(this.opts.root), { force: true });
          else errors.push({ code: "engine_stop_failed", message: `\u5F15\u64CE\u8FDB\u7A0B pid=${pid} \u672A\u80FD\u9000\u51FA` });
        }
        if (inputs.uploaded.length > 0 || inputs.scratch_outputs.length > 0) {
          cleanup.scratch = this.cleanupScratch(inputs);
        }
        let restored = [];
        if (this.opts.metadataOnly) {
          cleanup.gpu_restore = "not_needed";
        } else {
          try {
            const r = await restoreLeaseIfAny(log);
            restored = r.restored;
            for (const e of r.errors) errors.push({ code: e.code, message: e.message });
            if (r.restored.length > 0 || r.errors.length === 0) cleanup.gpu_restore = "ok";
            if (r.errors.length > 0) cleanup.gpu_restore = "failed";
          } catch (e) {
            cleanup.gpu_restore = "failed";
            errors.push({
              code: "gpu_restore_failed",
              message: e instanceof Error ? e.message : String(e)
            });
          }
        }
        return {
          cleanup,
          restored,
          errors,
          ...this.gpuRecord !== void 0 ? { gpu: this.gpuRecord } : {}
        };
      }
      /**
       * ComfyUI 目录：machine.json 显式路径优先，否则约定 engine/ComfyUI。
       */
      comfyDir() {
        const configured = this.opts.machine.engine.mode === "local" ? this.opts.machine.engine.comfyui_dir : void 0;
        if (configured !== void 0 && configured !== "") {
          return configured.startsWith("/") ? configured : join8(this.opts.root, configured);
        }
        return join8(this.opts.root, "engine", "ComfyUI");
      }
      /**
       * venv 目录：machine.json 显式路径优先，否则约定 engine/.venv。
       */
      venvDir() {
        const configured = this.opts.machine.engine.mode === "local" ? this.opts.machine.engine.venv_dir : void 0;
        if (configured !== void 0 && configured !== "") {
          return configured.startsWith("/") ? configured : join8(this.opts.root, configured);
        }
        return join8(this.opts.root, "engine", ".venv");
      }
      /**
       * extra_model_paths 配置路径（machine.models_config 优先）。
       */
      modelsConfigPath() {
        if (this.opts.machine.engine.mode !== "local") return null;
        const explicit = this.opts.machine.engine.models_config;
        if (explicit !== void 0 && explicit !== null && explicit !== "") return explicit;
        const auto = join8(this.opts.root, EXTRA_MODELS_FILE);
        return existsSync10(auto) ? auto : null;
      }
      /**
       * 清理本次 run 的 scratch 文件（local 拥有引擎文件系统）。
       */
      cleanupScratch(inputs) {
        if (this.opts.machine.engine.mode !== "local") return "not_needed";
        try {
          const comfyDir = this.comfyDir();
          for (const name of inputs.uploaded) {
            rmSync7(join8(comfyDir, "input", name), { force: true });
          }
          for (const out of inputs.scratch_outputs) {
            rmSync7(join8(comfyDir, "output", out.subfolder, out.filename), { force: true });
          }
          return "ok";
        } catch {
          return "kept";
        }
      }
    };
  }
});

// src/core/machine/lock.mts
import { closeSync as closeSync2, existsSync as existsSync11, openSync as openSync2, readFileSync as readFileSync9, rmSync as rmSync8, unlinkSync as unlinkSync2, writeFileSync as writeFileSync4 } from "fs";
import { homedir as homedir2 } from "os";
import { dirname as dirname5, join as join9 } from "path";
function machineLockPath() {
  return join9(homedir2(), ".dycli", "machine.lock");
}
function pidAlive2(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
function inspectMachineLock(path = machineLockPath()) {
  if (!existsSync11(path)) return { status: "absent", path };
  let raw;
  try {
    raw = JSON.parse(readFileSync9(path, "utf8"));
  } catch (e) {
    return {
      status: "corrupt",
      path,
      message: e instanceof Error ? e.message : String(e)
    };
  }
  if (!isLockRecord(raw)) {
    return { status: "corrupt", path, message: "\u9501\u5B57\u6BB5\u4E0D\u5B8C\u6574\u6216\u7C7B\u578B\u975E\u6CD5" };
  }
  return { status: "ok", path, record: raw };
}
function isLockRecord(v) {
  if (typeof v !== "object" || v === null) return false;
  const o = v;
  return typeof o.token === "string" && (o.kind === "generation" || o.kind === "metadata") && typeof o.task_id === "string" && typeof o.project === "string" && (o.mode === "local" || o.mode === "remote") && typeof o.command === "string" && typeof o.pid === "number" && typeof o.started_at === "string";
}
function writeLock(path, record) {
  ensureDir(dirname5(path));
  writeFileSync4(path, JSON.stringify(record, null, 2) + "\n", { mode: 384 });
}
function machineBusyError(owner) {
  return new DaoyanCliError({
    code: "machine_busy",
    message: `\u540C\u4E00\u8BBE\u5907\u5DF2\u6709${owner.kind === "metadata" ? "\u64CD\u4F5C" : "\u4EFB\u52A1"}\u5728\u8FDB\u884C\uFF1A${owner.command}\uFF08task ${owner.task_id}\uFF0Cpid ${owner.pid}\uFF0Cmode ${owner.mode}\uFF0C\u59CB\u4E8E ${owner.started_at}\uFF09`,
    retryAfterMs: 5e3,
    taskId: owner.task_id,
    details: {
      owner: {
        task_id: owner.task_id,
        pid: owner.pid,
        project: owner.project,
        mode: owner.mode,
        command: owner.command,
        kind: owner.kind,
        started_at: owner.started_at
      },
      retry_after_ms: 5e3
    },
    nextActions: [`status --task ${owner.task_id}`, `run cancel ${owner.task_id}`]
  });
}
async function acquireMachineLock(opts) {
  const path = opts.path ?? machineLockPath();
  const token = randomSuffix(16);
  const record = {
    token,
    kind: opts.kind ?? "generation",
    task_id: opts.taskId,
    project: opts.project,
    mode: opts.mode,
    command: opts.command,
    pid: opts.pid ?? process.pid,
    started_at: nowIso()
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      ensureDir(dirname5(path));
      const fd = openSync2(path, "wx", 384);
      try {
        writeFileSync4(fd, JSON.stringify(record, null, 2) + "\n");
      } finally {
        closeSync2(fd);
      }
      return handleFor(path, record);
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    const cur = inspectMachineLock(path);
    if (cur.status === "corrupt") {
      throw new DaoyanCliError({
        code: "machine_lock_corrupt",
        message: `\u673A\u5668\u9501\u635F\u574F\uFF08${path}\uFF09\uFF1A${cur.message}\u3002\u786E\u8BA4\u6CA1\u6709\u4EFB\u52A1\u5728\u8DD1\u540E\u5220\u9664\u8BE5\u6587\u4EF6`,
        details: { path }
      });
    }
    if (cur.status === "absent") continue;
    if (pidAlive2(cur.record.pid)) throw machineBusyError(cur.record);
    await recoverStaleLock(cur.record, path);
  }
  throw new DaoyanCliError({
    code: "machine_busy",
    message: "\u673A\u5668\u9501\u7ADE\u4E89\u5931\u8D25\uFF08\u91CD\u8BD5\u4E24\u6B21\u4ECD\u88AB\u5360\u7528\uFF09",
    details: { path }
  });
}
function attachMachineLock(opts) {
  const path = opts.path ?? machineLockPath();
  const cur = inspectMachineLock(path);
  if (cur.status === "absent") {
    throw new DaoyanCliError({
      code: "worker_start_failed",
      message: "machine lock \u4E0D\u5B58\u5728\uFF08CLI \u9884\u7559\u5DF2\u88AB\u91CA\u653E\uFF09",
      details: { path }
    });
  }
  if (cur.status === "corrupt") {
    throw new DaoyanCliError({
      code: "machine_lock_corrupt",
      message: `\u673A\u5668\u9501\u635F\u574F\uFF08${path}\uFF09\uFF1A${cur.message}`
    });
  }
  if (cur.record.task_id !== opts.taskId || cur.record.token !== opts.token) {
    throw new DaoyanCliError({
      code: "machine_busy",
      message: "machine lock \u5DF2\u88AB\u5176\u4ED6 task \u6301\u6709\uFF0Cworker \u62D2\u7EDD\u63A5\u7BA1",
      details: { expected_task: opts.taskId, actual_task: cur.record.task_id }
    });
  }
  const record = { ...cur.record, pid: opts.pid ?? process.pid };
  writeLock(path, record);
  return handleFor(path, record);
}
async function recoverStaleLock(record, path = machineLockPath()) {
  try {
    if (record.kind === "generation" && existsSync11(join9(record.project, "project.json"))) {
      const store = await Promise.resolve().then(() => (init_store(), store_exports));
      const task = store.readTask(record.project, record.task_id);
      if (task !== null && (task.status === "queued" || task.status === "running")) {
        store.updateTask(record.project, record.task_id, {
          status: "interrupted",
          finished_at: nowIso(),
          error: {
            code: "worker_crashed",
            message: `worker\uFF08pid ${record.pid}\uFF09\u5DF2\u9000\u51FA\uFF1B\u4EFB\u52A1\u88AB\u6807\u8BB0\u4E3A interrupted`
          },
          next_actions: [`logs --task ${record.task_id} --json`, "status --json"]
        });
      }
    }
  } catch {
  }
  try {
    if (record.mode === "local" && existsSync11(join9(record.project, "project.json"))) {
      const local = await Promise.resolve().then(() => (init_local_session(), local_session_exports));
      await local.stopResidualEngine(record.project, () => {
      });
    }
  } catch {
  }
  try {
    const takeover = await Promise.resolve().then(() => (init_takeover(), takeover_exports));
    await takeover.restoreLeaseIfAny(() => {
    });
  } catch {
  }
  rmSync8(path, { force: true });
}
function handleFor(path, initial) {
  let record = initial;
  return {
    path,
    get record() {
      return record;
    },
    handoff(pid) {
      const cur = inspectMachineLock(path);
      if (cur.status !== "ok" || cur.record.token !== record.token) {
        throw new DaoyanCliError({
          code: "machine_lock_corrupt",
          message: "machine lock handoff \u5931\u8D25\uFF1A\u4EE4\u724C\u4E0D\u5339\u914D\uFF08\u9501\u88AB\u5176\u4ED6\u8FDB\u7A0B\u66FF\u6362\uFF09",
          details: { path }
        });
      }
      record = { ...record, pid };
      writeLock(path, record);
    },
    release() {
      const cur = inspectMachineLock(path);
      if (cur.status === "ok" && cur.record.token === record.token) {
        try {
          unlinkSync2(path);
        } catch {
        }
      }
    }
  };
}
var init_lock = __esm({
  "src/core/machine/lock.mts"() {
    "use strict";
    init_errors();
    init_fs();
  }
});

// src/commands/init.mts
import { basename, isAbsolute as isAbsolute2, join as join10, resolve as resolve2 } from "path";
import { existsSync as existsSync12, statSync as statSync2 } from "fs";
function parseArgs(args) {
  const flags = { noSkill: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === void 0) break;
    const { name, inline } = splitInlineFlag(a);
    if (name === "--no-skill") {
      flags.noSkill = true;
      continue;
    }
    if (name === "--mode") {
      const { value, skip } = takeValue(args, i, inline, "--mode");
      if (value !== "local" && value !== "remote") {
        usageError(`--mode \u4EC5\u63A5\u53D7 local / remote\uFF08\u6536\u5230 ${value}\uFF09`);
      }
      flags.mode = value;
      i += skip;
      continue;
    }
    if (name === "--modelpath") {
      const { value, skip } = takeValue(args, i, inline, "--modelpath");
      flags.modelpath = value;
      i += skip;
      continue;
    }
    if (name === "--url") {
      const { value, skip } = takeValue(args, i, inline, "--url");
      flags.url = value;
      i += skip;
      continue;
    }
    if (name === "--version") {
      const { value, skip } = takeValue(args, i, inline, "--version");
      flags.version = value;
      i += skip;
      continue;
    }
    if (name === "--mirror") {
      const { value, skip } = takeValue(args, i, inline, "--mirror");
      flags.mirror = value;
      i += skip;
      continue;
    }
    if (name.startsWith("-")) usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
    usageError(`init \u4E0D\u63A5\u6536\u4F4D\u7F6E\u53C2\u6570\uFF08\u6536\u5230 ${name}\uFF09\uFF1B\u8BF7\u5728\u76EE\u6807\u76EE\u5F55\u5185\u76F4\u63A5\u8FD0\u884C daoyan init --mode=...`);
  }
  if (flags.mode === void 0) {
    usageError("init \u5FC5\u987B\u663E\u5F0F\u6307\u5B9A --mode=local|remote");
  }
  if (flags.mode === "local") {
    if (flags.url !== void 0) usageError("local \u6A21\u5F0F\u4E0D\u63A5\u53D7 --url\uFF08\u8FDC\u7AEF\u8FDE\u63A5\u8BF7\u7528 --mode=remote\uFF09");
  } else {
    if (flags.url === void 0 || flags.url === "") usageError("remote \u6A21\u5F0F\u5FC5\u987B\u63D0\u4F9B --url <http(s)://...>");
    if (flags.modelpath !== void 0) usageError("remote \u6A21\u5F0F\u4E0D\u63A5\u53D7 --modelpath\uFF08\u6A21\u578B\u7531\u8FDC\u7AEF\u7BA1\u7406\uFF09");
    if (flags.version !== void 0) usageError("remote \u6A21\u5F0F\u4E0D\u63A5\u53D7 --version\uFF08\u8FDC\u7AEF\u5F15\u64CE\u7248\u672C\u7531\u5916\u90E8\u7BA1\u7406\uFF09");
    if (flags.mirror !== void 0) usageError("remote \u6A21\u5F0F\u4E0D\u63A5\u53D7 --mirror\uFF08\u4E0D\u90E8\u7F72\u5F15\u64CE\uFF09");
  }
  return flags;
}
function resolveModelPath(raw) {
  const abs = isAbsolute2(raw) ? raw : resolve2(process.cwd(), raw);
  if (!existsSync12(abs) || !statSync2(abs).isDirectory()) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `--modelpath \u5FC5\u987B\u662F\u5DF2\u5B58\u5728\u7684\u76EE\u5F55\uFF08\u6536\u5230 ${raw}\uFF09`
    });
  }
  return abs;
}
async function runInit(ctx2, args) {
  const flags = parseArgs(args);
  const root = process.cwd();
  const parent = findProject(root);
  if (parent !== null && resolve2(parent.root) !== resolve2(root)) {
    throw new DaoyanCliError({
      code: "usage",
      message: `\u5F53\u524D\u76EE\u5F55\u4F4D\u4E8E\u5DF2\u6709\u9879\u76EE\u5185\uFF1A${parent.root}\u3002\u8BF7\u5728\u9879\u76EE\u6839\u8FD0\u884C init\uFF0C\u6216\u6362\u4E00\u4E2A\u7A7A\u76EE\u5F55`,
      exit: 2
    });
  }
  const existingProject = readProjectAt(root);
  let project;
  let projectCreated = false;
  if (existingProject === null) {
    say(`\u5728 ${root} \u521B\u5EFA\u65B0\u9879\u76EE\uFF08v2 \u9AA8\u67B6\uFF09`);
    scaffoldProject(root, basename(root));
    project = readProjectAt(root);
    projectCreated = true;
  } else {
    project = existingProject;
    say(`\u590D\u7528\u5DF2\u6709 project.json\uFF08\u4E0D\u8986\u76D6\u5171\u4EAB\u6587\u4EF6\uFF09\uFF1A${root}`);
  }
  const previous = loadMachineIfExists(root);
  const machineId = previous?.machine_id ?? defaultMachineId();
  let lock = null;
  let installed = false;
  let comfyVersion = null;
  let port = null;
  try {
    if (flags.mode === "local") {
      lock = await acquireMachineLock({
        taskId: `metadata-init-${process.pid}`,
        project: root,
        mode: "local",
        command: "init --mode=local",
        kind: "metadata"
      });
      const prevLocal = previous?.engine.mode === "local" ? previous.engine : null;
      const modelpath = flags.modelpath !== void 0 ? resolveModelPath(flags.modelpath) : prevLocal?.modelpath;
      const version = flags.version ?? project.comfyui?.version ?? await latestComfyTag();
      if (projectCreated || flags.version !== void 0) {
        project = {
          ...project,
          comfyui: { ...project.comfyui ?? {}, version }
        };
        const { writeJsonAtomic: writeJsonAtomic2 } = await Promise.resolve().then(() => (init_fs(), fs_exports));
        writeJsonAtomic2(resolve2(root, "project.json"), project);
      }
      const prevComfyAbs = prevLocal?.comfyui_dir !== void 0 ? isAbsolute2(prevLocal.comfyui_dir) ? prevLocal.comfyui_dir : resolve2(root, prevLocal.comfyui_dir) : null;
      const reuseCustomEngine = flags.version === void 0 && prevLocal?.comfyui_dir !== void 0 && prevLocal.comfyui_dir !== "engine/ComfyUI" && prevComfyAbs !== null && existsSync12(join10(prevComfyAbs, "main.py"));
      if (reuseCustomEngine) {
        say(`\u590D\u7528 engine use \u9009\u5B9A\u7684\u5F15\u64CE\u76EE\u5F55\uFF1A${prevLocal?.comfyui_dir}`);
        comfyVersion = prevLocal?.comfyui_version ?? version;
      } else {
        say(`\u90E8\u7F72\u9879\u76EE\u4E13\u5C5E ComfyUI ${version} ...`);
        const deployed = await deployLocalEngine({
          root,
          project,
          version,
          ...flags.mirror !== void 0 ? { mirror: flags.mirror } : {},
          log: say
        });
        installed = deployed.installed;
        comfyVersion = version;
      }
      port = await allocatePort(prevLocal?.port);
      const modelsConfig = writeExtraModelPaths(root, modelpath);
      if (modelsConfig !== null) say(`\u5916\u90E8\u6A21\u578B\u76EE\u5F55\uFF1A${modelpath}\uFF08${modelsConfig}\uFF09`);
      const engine = {
        mode: "local",
        ...modelpath !== void 0 ? { modelpath } : {},
        models_config: flags.modelpath !== void 0 ? null : prevLocal?.models_config ?? null,
        port,
        launch_extra: prevLocal?.launch_extra ?? [],
        comfyui_version: flags.version ?? prevLocal?.comfyui_version ?? version,
        comfyui_dir: flags.version !== void 0 ? "engine/ComfyUI" : prevLocal?.comfyui_dir ?? "engine/ComfyUI",
        venv_dir: flags.version !== void 0 ? "engine/.venv" : prevLocal?.venv_dir ?? "engine/.venv"
      };
      const machine = {
        machine_id: machineId,
        engine,
        ...previous?.overrides !== void 0 ? { overrides: previous.overrides } : {}
      };
      saveMachine(root, machine);
      say(`\u672C\u673A\u914D\u7F6E\u5DF2\u5199\u5165 .dycli/machine.json\uFF08port ${port}\uFF09`);
    } else {
      const url = flags.url;
      if (!isHttpUrl(url)) usageError(`--url \u5FC5\u987B\u662F http(s) URL\uFF08\u6536\u5230 ${url}\uFF09`);
      const machine = {
        machine_id: machineId,
        engine: {
          mode: "remote",
          url,
          free_after_task: previous?.engine.mode === "remote" ? previous.engine.free_after_task ?? "when_idle" : "when_idle"
        },
        ...previous?.overrides !== void 0 ? { overrides: previous.overrides } : {}
      };
      saveMachine(root, machine);
      say(`remote \u6A21\u5F0F\uFF1A${url}\uFF08\u4E0D\u90E8\u7F72\u3001\u4E0D\u542F\u52A8\u8FDC\u7AEF\u5F15\u64CE\uFF09`);
    }
  } finally {
    lock?.release();
  }
  let skill = null;
  if (!flags.noSkill) {
    const { COMMANDS: COMMANDS2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
    skill = writeSkill(root, VERSION, COMMANDS2);
    say(`Agent Skill \u5DF2\u751F\u6210\uFF1A.agents/skills/daoyan/\uFF08${skill.files} \u4E2A\u6587\u4EF6\uFF09\uFF0C\u5E76\u66F4\u65B0 AGENTS.md`);
  }
  const data = {
    root,
    mode: flags.mode,
    project_created: projectCreated,
    engine_installed: installed,
    comfyui_version: comfyVersion,
    port,
    url: flags.mode === "remote" ? flags.url ?? null : null,
    modelpath: flags.mode === "local" ? flags.modelpath ?? null : null,
    skill: skill === null ? null : { path: ".agents/skills/daoyan/", files: skill.files, hash: skill.hash },
    next_actions: flags.mode === "local" ? [
      "workflow nodes --refresh --json",
      "workflow import <api.json> --name t2v",
      "workflow validate t2v --json",
      "run t2v --json"
    ] : ["workflow nodes --refresh --json", "run <workflow> --json"]
  };
  if (ctx2.json) {
    emitData(data);
    return;
  }
  say("\u4E0B\u4E00\u6B65\uFF1A");
  say("  1. daoyan workflow nodes --refresh\uFF08\u62C9\u53D6\u8282\u70B9\u76EE\u5F55\uFF09");
  say("  2. daoyan workflow import <ComfyUI API JSON> --name t2v");
  say("  3. daoyan workflow validate t2v");
  say("  4. daoyan run t2v --label shot:01 --json");
}
var init_init = __esm({
  "src/commands/init.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_args();
    init_fs();
    init_config();
    init_init_flow();
    init_lock();
    init_version();
    init_skill();
  }
});

// src/core/workflow/graph.mts
function isLink(v) {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "number" && Number.isInteger(v[1]) && v[1] >= 0;
}
function parseGraph(raw) {
  const issues = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      graph: {},
      issues: [
        {
          path: "$",
          code: "graph_invalid",
          severity: "error",
          message: "\u5DE5\u4F5C\u6D41\u9876\u5C42\u5FC5\u987B\u662F\u5BF9\u8C61\uFF08nodeId -> { class_type, inputs }\uFF09",
          hint: "\u4F7F\u7528 ComfyUI \u7684 Save (API Format) \u5BFC\u51FA\uFF0C\u6216 workflow new \u521B\u5EFA\u7A7A\u56FE\u3002"
        }
      ]
    };
  }
  const graph = {};
  for (const [nodeId, nodeRaw] of Object.entries(raw)) {
    const path = nodeId;
    if (nodeId.trim() === "") {
      issues.push({
        path: "$",
        code: "graph_node_id_invalid",
        severity: "error",
        message: "\u8282\u70B9 ID \u4E0D\u80FD\u4E3A\u7A7A",
        hint: '\u8282\u70B9 ID \u4F7F\u7528\u975E\u7A7A\u5B57\u7B26\u4E32\uFF08\u5982 "4"\uFF09\u3002'
      });
      continue;
    }
    if (typeof nodeRaw !== "object" || nodeRaw === null || Array.isArray(nodeRaw)) {
      issues.push({
        path,
        code: "graph_node_invalid",
        severity: "error",
        message: "\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61 { class_type, inputs }",
        hint: "\u68C0\u67E5\u8BE5\u8282\u70B9\u7ED3\u6784\u3002"
      });
      continue;
    }
    const node = nodeRaw;
    if (typeof node.class_type !== "string" || node.class_type.trim() === "") {
      issues.push({
        path: `${path}.class_type`,
        code: "graph_node_class_missing",
        severity: "error",
        message: "\u7F3A\u5C11 class_type",
        hint: "\u586B\u5199 ComfyUI \u8282\u70B9\u7C7B\u540D\uFF08\u7528 workflow nodes \u67E5\u8BE2\uFF09\u3002"
      });
      continue;
    }
    if (node.inputs !== void 0 && (typeof node.inputs !== "object" || node.inputs === null || Array.isArray(node.inputs))) {
      issues.push({
        path: `${path}.inputs`,
        code: "graph_node_inputs_invalid",
        severity: "error",
        message: "inputs \u5FC5\u987B\u662F\u5BF9\u8C61",
        hint: 'inputs \u5F62\u5982 { "text": "a cat" }\u3002'
      });
      continue;
    }
    graph[nodeId] = {
      class_type: node.class_type,
      inputs: node.inputs ?? {}
    };
  }
  for (const [nodeId, node] of Object.entries(graph)) {
    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (!isLink(value)) continue;
      const source = graph[value[0]];
      if (source === void 0) {
        issues.push({
          path: `${nodeId}.inputs.${inputName}`,
          code: "graph_link_source_missing",
          severity: "error",
          message: `\u8FDE\u7EBF\u6E90\u8282\u70B9 ${value[0]} \u4E0D\u5B58\u5728`,
          hint: "\u4FEE\u6B63\u8FDE\u7EBF\uFF0C\u6216\u5220\u9664\u8BE5\u8F93\u5165\u540E\u91CD\u65B0\u8FDE\u63A5\u3002"
        });
      }
      if (!Number.isInteger(value[1]) || value[1] < 0) {
        issues.push({
          path: `${nodeId}.inputs.${inputName}`,
          code: "graph_link_output_invalid",
          severity: "error",
          message: `\u8FDE\u7EBF\u8F93\u51FA\u7D22\u5F15\u975E\u6CD5\uFF1A${String(value[1])}`,
          hint: "\u8F93\u51FA\u7D22\u5F15\u4ECE 0 \u5F00\u59CB\uFF0C\u4F7F\u7528\u6574\u6570\u3002"
        });
      }
    }
  }
  return { graph, issues };
}
function hasGraphErrors(issues) {
  return issues.some((i) => i.severity === "error");
}
function graphSha256(graph) {
  return sha256(stableStringify(graph));
}
function cloneGraph(graph) {
  return JSON.parse(JSON.stringify(graph));
}
function graphStats(graph) {
  let links = 0;
  for (const node of Object.values(graph)) {
    for (const v of Object.values(node.inputs)) {
      if (isLink(v)) links++;
    }
  }
  return { nodes: Object.keys(graph).length, links };
}
function nodeSummaries(graph) {
  return Object.entries(graph).map(([id, n]) => ({ id, class_type: n.class_type, inputs: Object.keys(n.inputs).length })).sort((a, b) => a.id.localeCompare(b.id, void 0, { numeric: true }));
}
function referencesTo(graph, nodeId) {
  const refs = [];
  for (const [id, node] of Object.entries(graph)) {
    for (const [input, value] of Object.entries(node.inputs)) {
      if (isLink(value) && value[0] === nodeId) refs.push({ node: id, input });
    }
  }
  return refs;
}
var init_graph = __esm({
  "src/core/workflow/graph.mts"() {
    "use strict";
    init_fs();
  }
});

// src/core/workflow/load.mts
import { existsSync as existsSync13, readFileSync as readFileSync10 } from "fs";
import { dirname as dirname6, join as join11 } from "path";
function workflowError(message, details) {
  throw new DaoyanCliError({ code: "workflow_invalid", message, details });
}
function loadGraphFile(abs, rel) {
  if (!existsSync13(abs)) {
    workflowError(`workflow \u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${rel}`, { path: rel });
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync10(abs, "utf8"));
  } catch (e) {
    workflowError(`${rel} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`, { path: rel });
  }
  const parsed = parseGraph(raw);
  if (hasGraphErrors(parsed.issues)) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: `${rel} \u7ED3\u6784\u975E\u6CD5`,
      details: { path: rel, issues: parsed.issues }
    });
  }
  return { abs, rel, graph: parsed.graph, sha256: graphSha256(parsed.graph) };
}
function saveGraphFile(abs, graph) {
  writeFileAtomic(abs, JSON.stringify(graph, null, 2) + "\n");
}
function bindingsPathOf(workflowAbs) {
  return workflowAbs.endsWith(".json") ? workflowAbs.slice(0, -".json".length) + BINDINGS_SUFFIX : workflowAbs + BINDINGS_SUFFIX;
}
function loadBindings(workflowAbs) {
  const file = bindingsPathOf(workflowAbs);
  if (!existsSync13(file)) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync10(file, "utf8"));
  } catch (e) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`,
      details: { path: file }
    });
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: `${file} \u5FC5\u987B\u662F\u5BF9\u8C61\uFF1A{ "<logical>": "<nodeId>.<input>" }`
    });
  }
  for (const [logical, target] of Object.entries(raw)) {
    if (typeof target !== "string" || !/^[^.]+\.\S+$/.test(target)) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `${file} \u7684 "${logical}" \u5FC5\u987B\u662F "nodeId.input"\uFF08\u6536\u5230 ${JSON.stringify(target)}\uFF09`
      });
    }
  }
  return raw;
}
function validateBindings(graph, bindings, path = "bindings") {
  if (bindings === null) return [];
  const issues = [];
  const seen = /* @__PURE__ */ new Map();
  for (const [logical, target] of Object.entries(bindings)) {
    const dot = target.indexOf(".");
    const nodeId = target.slice(0, dot);
    const input = target.slice(dot + 1);
    const node = graph[nodeId];
    if (node === void 0) {
      issues.push({
        path: `${path}.${logical}`,
        code: "binding_node_missing",
        severity: "error",
        message: `binding "${logical}" \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8282\u70B9 ${nodeId}`,
        hint: `\u5F53\u524D\u8282\u70B9\uFF1A${Object.keys(graph).sort().join(", ") || "\uFF08\u7A7A\u56FE\uFF09"}`
      });
      continue;
    }
    if (input === "") {
      issues.push({
        path: `${path}.${logical}`,
        code: "binding_input_invalid",
        severity: "error",
        message: `binding "${logical}" \u7F3A\u5C11\u8F93\u5165\u540D`,
        hint: "\u683C\u5F0F\uFF1AnodeId.input"
      });
      continue;
    }
    if (seen.has(target)) {
      issues.push({
        path: `${path}.${logical}`,
        code: "binding_duplicate",
        severity: "warning",
        message: `"${logical}" \u4E0E "${seen.get(target)}" \u6307\u5411\u540C\u4E00\u8F93\u5165 ${target}`,
        hint: "\u540E\u5199\u5165\u7684\u903B\u8F91\u503C\u4F1A\u8986\u76D6\u524D\u4E00\u4E2A\u3002"
      });
    } else {
      seen.set(target, logical);
    }
  }
  return issues;
}
function splitNodeInput(key) {
  const dot = key.indexOf(".");
  if (dot <= 0 || dot === key.length - 1) {
    workflowError(`\u975E\u6CD5\u8F93\u5165\u952E "${key}"\uFF08\u5E94\u4E3A nodeId.input\uFF09`, { key });
  }
  return { node: key.slice(0, dot), input: key.slice(dot + 1) };
}
function applyMachineOverrides(graph, machine, workflowRel) {
  const work = cloneGraph(graph);
  const applied = {};
  const issues = [];
  const overrides = machine?.overrides?.[workflowRel];
  if (overrides === void 0) return { graph: work, applied, issues };
  for (const [key, value] of Object.entries(overrides)) {
    const { node, input } = splitNodeInput(key);
    const target = work[node];
    if (target === void 0) {
      issues.push({
        path: `${workflowRel}:${key}`,
        code: "override_node_missing",
        severity: "error",
        message: `machine overrides \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8282\u70B9 ${node}`,
        hint: "\u4FEE\u6B63 .dycli/machine.json \u7684 overrides\u3002"
      });
      continue;
    }
    target.inputs[input] = value;
    applied[key] = value;
  }
  return { graph: work, applied, issues };
}
function applyLogicalValues(graph, bindings, values) {
  const work = cloneGraph(graph);
  const applied = {};
  const unmapped = [];
  const issues = [];
  for (const [logical, value] of Object.entries(values)) {
    if (value === void 0) continue;
    const target = bindings?.[logical];
    if (target === void 0) {
      unmapped.push(logical);
      continue;
    }
    const { node, input } = splitNodeInput(target);
    const dest = work[node];
    if (dest === void 0) {
      issues.push({
        path: `bindings.${logical}`,
        code: "binding_node_missing",
        severity: "error",
        message: `binding "${logical}" \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8282\u70B9 ${node}`,
        hint: "\u4FEE\u6B63 bindings \u6587\u4EF6\u3002"
      });
      continue;
    }
    dest.inputs[input] = value;
    applied[logical] = value;
  }
  return { graph: work, applied, unmapped, issues };
}
function bindingTargets(bindings) {
  return new Set(Object.values(bindings ?? {}));
}
function validateGraphWithCatalog(graph, catalog, provided = /* @__PURE__ */ new Set()) {
  const issues = [];
  for (const [nodeId, node] of Object.entries(graph)) {
    const def = extractNodeDef(catalog.raw, node.class_type);
    if (def === null) {
      issues.push({
        path: nodeId,
        code: "node_missing",
        severity: "error",
        message: `\u5F15\u64CE\u7F3A\u5C11\u8282\u70B9\u7C7B ${node.class_type}`,
        hint: "\u5B89\u88C5\u5BF9\u5E94 custom node\uFF0C\u6216\u628A\u8BE5\u8282\u70B9\u66FF\u6362\u4E3A\u5DF2\u6709\u8282\u70B9\u3002"
      });
      continue;
    }
    for (const input of def.inputs) {
      const injected = provided.has(`${nodeId}.${input.name}`);
      const value = node.inputs[input.name];
      if (input.required && value === void 0 && !injected) {
        issues.push({
          path: `${nodeId}.inputs.${input.name}`,
          code: "graph_required_input_missing",
          severity: "error",
          message: `${node.class_type}.${input.name} \u662F\u5FC5\u586B\u8F93\u5165\u4F46\u672A\u8BBE\u7F6E`,
          hint: "\u7528 workflow set / apply \u8865\u4E0A\u8BE5\u8F93\u5165\uFF0C\u6216\u8FDE\u63A5\u4E0A\u6E38\u8282\u70B9\u3002"
        });
        continue;
      }
      if (!injected && input.options !== void 0 && typeof value === "string" && isLoaderInput(input.name) && !input.options.includes(value)) {
        issues.push({
          path: `${nodeId}.inputs.${input.name}`,
          code: "model_not_found",
          severity: "error",
          message: `${node.class_type}.${input.name} = "${value}" \u4E0D\u5728\u5F15\u64CE\u53EF\u89C1\u7684\u6A21\u578B\u5217\u8868\u4E2D`,
          hint: `\u53EF\u7528\u503C\uFF08\u524D 8 \u4E2A\uFF09\uFF1A${input.options.slice(0, 8).join(", ")}\uFF1B\u68C0\u67E5 modelpath / \u6587\u4EF6\u540D\u3002`
        });
      }
    }
  }
  return issues;
}
function isLoaderInput(name) {
  return /(^|_)(ckpt|unet|clip|vae|lora|controlnet|upscale|style_model|gligen|photomaker)_name$/.test(name);
}
function throwOnErrors(issues, fallbackMessage) {
  const first = issues.find((i) => i.severity === "error");
  if (first === void 0) return;
  throw new DaoyanCliError({
    code: first.code === "node_missing" || first.code === "model_not_found" ? first.code : "workflow_invalid",
    message: `${fallbackMessage}\uFF1A${first.message}`,
    details: { issues }
  });
}
var init_load = __esm({
  "src/core/workflow/load.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
    init_graph();
    init_catalog();
  }
});

// src/commands/validate.mts
import { existsSync as existsSync14, readFileSync as readFileSync11, readdirSync as readdirSync3 } from "fs";
import { isAbsolute as isAbsolute3, join as join12 } from "path";
function fromGraphIssue(prefix, i) {
  return {
    path: `${prefix}:${i.path}`,
    code: i.code,
    severity: i.severity,
    message: i.message,
    hint: i.hint
  };
}
function validateWorkflows(root, machine, issues) {
  const dir = join12(root, WORKFLOWS_DIR);
  if (!existsSync14(dir)) {
    issues.push({
      path: WORKFLOWS_DIR,
      code: "workflows_dir_missing",
      severity: "warning",
      message: "workflows/ \u76EE\u5F55\u4E0D\u5B58\u5728",
      hint: "daoyan workflow new <name> \u521B\u5EFA\u7B2C\u4E00\u4E2A\u5DE5\u4F5C\u6D41\u3002"
    });
    return;
  }
  const files = readdirSync3(dir).filter((f) => f.endsWith(".json") && !f.endsWith(BINDINGS_SUFFIX));
  if (files.length === 0) {
    issues.push({
      path: WORKFLOWS_DIR,
      code: "workflows_empty",
      severity: "warning",
      message: "workflows/ \u4E0B\u6CA1\u6709\u5DE5\u4F5C\u6D41",
      hint: "daoyan workflow new <name> \u6216 workflow import <api.json> --name <name>\u3002"
    });
  }
  const catalog = readCatalog(root);
  for (const f of files) {
    const rel = `${WORKFLOWS_DIR}/${f}`;
    const abs = join12(dir, f);
    let raw;
    try {
      raw = JSON.parse(readFileSync11(abs, "utf8"));
    } catch (e) {
      issues.push({
        path: rel,
        code: "graph_json_invalid",
        severity: "error",
        message: `\u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`,
        hint: "\u4FEE\u6B63 JSON \u8BED\u6CD5\u3002"
      });
      continue;
    }
    const parsed = parseGraph(raw);
    for (const i of parsed.issues) issues.push(fromGraphIssue(rel, i));
    let bindings = null;
    try {
      bindings = loadBindings(abs);
      for (const i of validateBindings(parsed.graph, bindings, `${rel}.bindings`)) {
        issues.push(fromGraphIssue(rel, i));
      }
    } catch (e) {
      issues.push({
        path: bindingsPathOf(abs).slice(root.length + 1),
        code: "bindings_invalid",
        severity: "error",
        message: e instanceof Error ? e.message : String(e),
        hint: 'bindings \u5FC5\u987B\u662F { "logical": "nodeId.input" }\u3002'
      });
    }
    if (machine !== null) {
      const over = applyMachineOverrides(parsed.graph, machine, rel);
      for (const i of over.issues) issues.push(fromGraphIssue(rel, i));
    }
    if (catalog !== null && !hasGraphErrors(parsed.issues)) {
      for (const i of validateGraphWithCatalog(parsed.graph, catalog, bindingTargets(bindings))) {
        issues.push(fromGraphIssue(rel, i));
      }
    }
  }
}
function validateShots(root, shots, issues) {
  if (shots === null) {
    issues.push({
      path: "shots.json",
      code: "shots_missing",
      severity: "warning",
      message: "\u6CA1\u6709 shots.json\uFF08\u5355 run \u6A21\u5F0F\u53EF\u5FFD\u7565\uFF09",
      hint: "\u9700\u8981 shot/batch \u65F6\u521B\u5EFA shots.json\u3002"
    });
    return;
  }
  if (!Number.isFinite(shots.meta.width) || shots.meta.width <= 0) {
    issues.push({
      path: "shots.meta.width",
      code: "shots_width_invalid",
      severity: "error",
      message: "meta.width \u5FC5\u987B\u662F\u6B63\u6570",
      hint: "\u586B\u5199\u751F\u6210\u5BBD\u5EA6\u3002"
    });
  } else if (shots.meta.width % DIM_MULTIPLE !== 0) {
    issues.push({
      path: "shots.meta.width",
      code: "shots_width_not_aligned",
      severity: "warning",
      message: `meta.width=${shots.meta.width} \u4E0D\u662F 32 \u7684\u500D\u6570`,
      hint: "\u67D0\u4E9B\u6A21\u578B\u4F1A\u5BF9\u9F50\u5230 32/64\uFF0C\u5EFA\u8BAE\u4E3B\u52A8\u5BF9\u9F50\u3002"
    });
  }
  if (!Number.isFinite(shots.meta.height) || shots.meta.height <= 0) {
    issues.push({
      path: "shots.meta.height",
      code: "shots_height_invalid",
      severity: "error",
      message: "meta.height \u5FC5\u987B\u662F\u6B63\u6570",
      hint: "\u586B\u5199\u751F\u6210\u9AD8\u5EA6\u3002"
    });
  } else if (shots.meta.height % DIM_MULTIPLE !== 0) {
    issues.push({
      path: "shots.meta.height",
      code: "shots_height_not_aligned",
      severity: "warning",
      message: `meta.height=${shots.meta.height} \u4E0D\u662F 32 \u7684\u500D\u6570`,
      hint: "\u5EFA\u8BAE\u5BF9\u9F50\u5230 32 \u7684\u500D\u6570\u3002"
    });
  }
  if (shots.shots.length === 0) {
    issues.push({
      path: "shots.shots",
      code: "shots_empty",
      severity: "error",
      message: "\u5206\u955C\u8868\u4E3A\u7A7A",
      hint: "\u6DFB\u52A0\u81F3\u5C11\u4E00\u4E2A\u955C\u5934\u3002"
    });
  }
  const seenId = /* @__PURE__ */ new Set();
  const seenSeed = /* @__PURE__ */ new Set();
  const byId = new Map(shots.shots.map((s) => [s.id, s]));
  for (const s of shots.shots) {
    const tag = `shots.${s.id}`;
    if (seenId.has(s.id)) {
      issues.push({
        path: tag,
        code: "shot_id_duplicate",
        severity: "error",
        message: `\u955C\u53F7 ${s.id} \u91CD\u590D`,
        hint: "\u955C\u53F7\u5FC5\u987B\u552F\u4E00\u3002"
      });
    }
    seenId.add(s.id);
    if (typeof s.seed !== "number") {
      issues.push({
        path: tag,
        code: "shot_seed_invalid",
        severity: "error",
        message: "\u7F3A\u5C11\u6570\u503C seed",
        hint: "\u4E3A\u6BCF\u4E2A\u955C\u5934\u8BBE\u7F6E seed\u3002"
      });
    } else if (seenSeed.has(String(s.seed))) {
      issues.push({
        path: tag,
        code: "shot_seed_duplicate",
        severity: "warning",
        message: `seed ${s.seed} \u4E0E\u5176\u4ED6\u955C\u5934\u91CD\u590D`,
        hint: "\u91CD\u590D seed \u53EF\u80FD\u4EA7\u751F\u76F8\u4F3C\u7ED3\u679C\uFF08\u5E76\u975E\u9519\u8BEF\uFF09\u3002"
      });
    }
    if (typeof s.seed === "number") seenSeed.add(String(s.seed));
    if (typeof s.prompt !== "string" || s.prompt.trim() === "") {
      issues.push({
        path: tag,
        code: "shot_prompt_empty",
        severity: "error",
        message: "prompt \u4E3A\u7A7A",
        hint: "\u586B\u5199\u955C\u5934\u63D0\u793A\u8BCD\u3002"
      });
    }
    const len = s.length ?? shots.defaults.length;
    if (typeof len === "number" && len % FRAME_GRID_STEP !== FRAME_GRID_OFFSET) {
      issues.push({
        path: tag,
        code: "shot_length_not_aligned",
        severity: "warning",
        message: `length ${len} \u4E0D\u7B26\u5408 17k+5 \u5E27\u7F51\u683C`,
        hint: "\u5F15\u64CE\u53EF\u80FD\u9759\u9ED8\u5BF9\u9F50\uFF1B\u5EFA\u8BAE\u4F7F\u7528 17k+5\u3002"
      });
    }
    const ref = s.workflow ?? shots.workflow ?? null;
    if (ref !== null) {
      const wf = resolveWorkflowRef(root, ref);
      if (!existsSync14(wf.abs)) {
        issues.push({
          path: tag,
          code: "shot_workflow_missing",
          severity: "error",
          message: `workflow \u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${wf.rel}`,
          hint: "\u5148\u521B\u5EFA/\u5BFC\u5165\u8BE5 workflow\u3002"
        });
      } else if (!existsSync14(bindingsPathOf(wf.abs))) {
        issues.push({
          path: tag,
          code: "shot_bindings_missing",
          severity: "warning",
          message: `workflow \u7F3A\u5C11 bindings\uFF1A${wf.rel.replace(/\.json$/, ".bindings.json")}`,
          hint: "shot/batch \u9700\u8981 bindings \u6CE8\u5165 prompt/seed\u3002"
        });
      }
    }
  }
  for (const s of shots.shots) {
    const ff = s.first_frame;
    if (ff === void 0) continue;
    const tag = `shots.${s.id}.first_frame`;
    if (typeof ff === "string") {
      const rel = shots.meta.anchors[ff];
      if (rel === void 0) {
        issues.push({
          path: tag,
          code: "anchor_missing_key",
          severity: "error",
          message: `\u951A\u70B9 key "${ff}" \u4E0D\u5728 meta.anchors`,
          hint: "\u5728 meta.anchors \u767B\u8BB0\u6216\u6539\u7528\u5B58\u5728\u7684 key\u3002"
        });
      } else if (!existsSync14(join12(root, rel))) {
        issues.push({
          path: tag,
          code: "anchor_file_missing",
          severity: "error",
          message: `\u951A\u70B9\u56FE\u7247\u4E0D\u5B58\u5728\uFF1A${rel}`,
          hint: "\u653E\u5165\u951A\u70B9\u6587\u4EF6\uFF0C\u6216\u4FEE\u6B63 meta.anchors \u8DEF\u5F84\u3002"
        });
      }
    } else if (typeof ff === "object" && typeof ff.relay === "string") {
      if (!byId.has(ff.relay)) {
        issues.push({
          path: tag,
          code: "relay_upstream_missing",
          severity: "error",
          message: `\u63A5\u529B\u4E0A\u6E38 ${ff.relay} \u4E0D\u5B58\u5728`,
          hint: "\u4FEE\u6B63 relay \u955C\u53F7\u3002"
        });
      }
    } else {
      issues.push({
        path: tag,
        code: "first_frame_invalid",
        severity: "error",
        message: 'first_frame \u975E\u6CD5\uFF08\u5E94\u4E3A\u951A\u70B9\u5B57\u7B26\u4E32\u6216 {"relay":"id"}\uFF09',
        hint: "\u4FEE\u6B63 first_frame\u3002"
      });
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
        issues.push({
          path: `shots.${s.id}`,
          code: "relay_cycle",
          severity: "error",
          message: `\u63A5\u529B\u94FE\u6210\u73AF\uFF08\u7ECF\u8FC7 ${next.id}\uFF09`,
          hint: "\u6253\u65AD\u63A5\u529B\u73AF\u3002"
        });
        break;
      }
      seen.add(next.id);
      cur = next;
    }
  }
}
function validateMachine(root, machine, issues) {
  if (machine === null) {
    issues.push({
      path: ".dycli/machine.json",
      code: "machine_missing",
      severity: "error",
      message: "\u672C\u673A\u5C1A\u672A\u521D\u59CB\u5316",
      hint: "\u8FD0\u884C daoyan init --mode=local|remote\u3002"
    });
    return;
  }
  if (machine.engine.mode !== "local") return;
  const comfyDir = machine.engine.comfyui_dir !== void 0 ? isAbsolute3(machine.engine.comfyui_dir) ? machine.engine.comfyui_dir : join12(root, machine.engine.comfyui_dir) : join12(root, "engine", "ComfyUI");
  if (!existsSync14(join12(comfyDir, "main.py"))) {
    issues.push({
      path: ".dycli/machine.json",
      code: "engine_not_installed",
      severity: "warning",
      message: `ComfyUI \u672A\u5B89\u88C5\uFF1A${comfyDir}`,
      hint: "\u8FD0\u884C daoyan init --mode=local \u90E8\u7F72\u5F15\u64CE\u3002"
    });
  }
  if (machine.engine.modelpath !== void 0 && !existsSync14(machine.engine.modelpath)) {
    issues.push({
      path: ".dycli/machine.json",
      code: "modelpath_missing",
      severity: "warning",
      message: `\u6A21\u578B\u76EE\u5F55\u4E0D\u5B58\u5728\uFF1A${machine.engine.modelpath}`,
      hint: "\u91CD\u65B0 init --modelpath\uFF0C\u6216\u6302\u8F7D\u8BE5\u76EE\u5F55\u3002"
    });
  }
  if (machine.engine.models_config !== null && machine.engine.models_config !== void 0 && !existsSync14(machine.engine.models_config)) {
    issues.push({
      path: ".dycli/machine.json",
      code: "models_config_missing",
      severity: "warning",
      message: `models_config \u4E0D\u5B58\u5728\uFF1A${machine.engine.models_config}`,
      hint: "\u4FEE\u6B63\u8DEF\u5F84\u6216\u8BBE\u4E3A null \u4F7F\u7528\u81EA\u52A8\u751F\u6210\u914D\u7F6E\u3002"
    });
  }
}
async function runValidate(ctx2) {
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachineIfExists(root);
  const shots = loadShotsIfExists(root);
  const issues = [];
  if (project.default_workflow !== void 0) {
    const wf = resolveWorkflowRef(root, project.default_workflow);
    if (!existsSync14(wf.abs)) {
      issues.push({
        path: "project.default_workflow",
        code: "default_workflow_missing",
        severity: "warning",
        message: `default_workflow \u4E0D\u5B58\u5728\uFF1A${wf.rel}`,
        hint: "\u521B\u5EFA\u8BE5 workflow\uFF0C\u6216\u4FEE\u6539 project.json\u3002"
      });
    }
  }
  validateMachine(root, machine, issues);
  validateWorkflows(root, machine, issues);
  validateShots(root, shots, issues);
  const lock = inspectMachineLock();
  if (lock.status === "corrupt") {
    issues.push({
      path: "~/.dycli/machine.lock",
      code: "machine_lock_corrupt",
      severity: "warning",
      message: "\u673A\u5668\u9501\u6587\u4EF6\u635F\u574F",
      hint: "\u786E\u8BA4\u6CA1\u6709\u4EFB\u52A1\u5728\u8DD1\u540E\u5220\u9664 ~/.dycli/machine.lock\u3002"
    });
  }
  const { COMMANDS: COMMANDS2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
  const skill = skillState(root, VERSION, COMMANDS2);
  if (!skill.present) {
    issues.push({
      path: ".agents/skills/daoyan",
      code: "skill_missing",
      severity: "warning",
      message: "\u9879\u76EE\u5185 Agent Skill \u4E0D\u5B58\u5728",
      hint: "daoyan skill update\uFF08\u6216 init \u65F6\u4E0D\u8981 --no-skill\uFF09\u3002"
    });
  } else if (skill.stale) {
    issues.push({
      path: ".agents/skills/daoyan",
      code: "skill_stale",
      severity: "warning",
      message: "\u9879\u76EE\u5185 Agent Skill \u4E0E\u5F53\u524D CLI \u4E0D\u4E00\u81F4",
      hint: "daoyan skill update\u3002"
    });
  }
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  if (!ctx2.json) {
    for (const i of errors) say(`\u2717 [${i.path}] ${i.message}`);
    for (const i of warnings) say(`! [${i.path}] ${i.message}`);
    say(errors.length === 0 ? `\u6821\u9A8C\u901A\u8FC7\uFF08${warnings.length} \u6761\u8B66\u544A\uFF09` : `\u6821\u9A8C\u5931\u8D25\uFF1A${errors.length} \u9879\u9519\u8BEF`);
  }
  if (errors.length > 0) {
    throw new DaoyanCliError({
      code: "validation_failed",
      message: `\u9879\u76EE\u6821\u9A8C\u672A\u901A\u8FC7\uFF08${errors.length} \u9879\u9519\u8BEF\uFF09`,
      details: { issues }
    });
  }
  if (ctx2.json) {
    emitData({ ok: true, issues });
  }
  return 0;
}
var DIM_MULTIPLE, FRAME_GRID_STEP, FRAME_GRID_OFFSET;
var init_validate = __esm({
  "src/commands/validate.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_config();
    init_types();
    init_graph();
    init_load();
    init_catalog();
    init_skill();
    init_lock();
    init_version();
    DIM_MULTIPLE = 32;
    FRAME_GRID_STEP = 17;
    FRAME_GRID_OFFSET = 5;
  }
});

// src/core/media/ffmpeg.mts
import { spawn as spawn5 } from "child_process";
function run(argv) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn5(argv[0] ?? "", argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
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
var init_ffmpeg = __esm({
  "src/core/media/ffmpeg.mts"() {
    "use strict";
    init_errors();
  }
});

// src/core/run/store.mts
import { copyFileSync, existsSync as existsSync15, readdirSync as readdirSync4, readFileSync as readFileSync12, renameSync as renameSync3, writeFileSync as writeFileSync5 } from "fs";
import { basename as basename2, join as join13 } from "path";
function newRunId(machineId) {
  return makeId(machineId);
}
function runDir(root, runId) {
  return join13(root, RUNS_DIR, runId);
}
function createRunDir(root, runId) {
  const dir = runDir(root, runId);
  ensureDir(join13(dir, INPUTS_DIR));
  ensureDir(join13(dir, "outputs"));
  return dir;
}
function writeWorkflowSnapshot(root, runId, graph) {
  writeJsonAtomic(join13(runDir(root, runId), RUN_WORKFLOW_FILE), graph);
}
function writeInputsSnapshot(root, runId, inputs, files) {
  writeJsonAtomic(join13(runDir(root, runId), RUN_INPUTS_FILE), { inputs, files });
}
function copyRunInput(root, runId, source, desiredName) {
  if (!existsSync15(source)) {
    throw new DaoyanCliError({ code: "config_invalid", message: `\u8F93\u5165\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${source}` });
  }
  const name = basename2(desiredName ?? source).replace(/[^A-Za-z0-9._-]/g, "_");
  const dir = join13(runDir(root, runId), INPUTS_DIR);
  ensureDir(dir);
  const dest = join13(dir, name);
  copyFileSync(source, dest);
  const bytes = new Uint8Array(readFileSync12(dest));
  return { name, sha256: sha256(bytes), bytes: bytes.byteLength };
}
function writeRunOutput(root, runId, filename, bytes) {
  const safe = basename2(filename).replace(/[^A-Za-z0-9._-]/g, "_") || "output.bin";
  const dir = join13(runDir(root, runId), "outputs");
  ensureDir(dir);
  let name = safe;
  for (let i = 1; existsSync15(join13(dir, name)); i++) {
    const dot = safe.lastIndexOf(".");
    name = dot > 0 ? `${safe.slice(0, dot)}_${i}${safe.slice(dot)}` : `${safe}_${i}`;
  }
  writeFileAtomicBytes(join13(dir, name), bytes);
  return { name, path: `outputs/${name}`, sha256: sha256(bytes), bytes: bytes.byteLength };
}
function writeFileAtomicBytes(file, bytes) {
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync5(tmp, bytes);
  renameSync3(tmp, file);
}
function writeRun(root, record) {
  writeJsonAtomic(join13(runDir(root, record.run_id), RUN_FILE), record);
}
function readRun(root, runId) {
  return readJsonIfExists(join13(root, RUNS_DIR, runId, RUN_FILE));
}
function requireRun(root, runId) {
  const rec = readRun(root, runId);
  if (rec === null) {
    throw new DaoyanCliError({ code: "run_not_found", message: `\u672A\u627E\u5230 run ${runId}` });
  }
  return rec;
}
function listRuns(root) {
  const dir = join13(root, RUNS_DIR);
  if (!existsSync15(dir)) return [];
  const out = [];
  for (const ent of readdirSync4(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const rec = readRun(root, ent.name);
    if (rec !== null) out.push(rec);
  }
  return out.sort(
    (a, b) => b.started_at.localeCompare(a.started_at) || b.run_id.localeCompare(a.run_id)
  );
}
function latestSucceededRun(root, label) {
  const hits = listRuns(root).filter((r) => r.label === label && r.status === "succeeded");
  return hits[0] ?? null;
}
function latestRunByLabel(root, label) {
  return listRuns(root).filter((r) => r.label === label)[0] ?? null;
}
function runOutputAbs(root, record, output) {
  return join13(runDir(root, record.run_id), output.path);
}
var init_store2 = __esm({
  "src/core/run/store.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
  }
});

// src/core/task/plans.mts
import { existsSync as existsSync16, mkdirSync as mkdirSync3, statSync as statSync3 } from "fs";
import { basename as basename3, join as join14 } from "path";
function splitTarget(target) {
  const dot = target.indexOf(".");
  return { node: target.slice(0, dot), input: target.slice(dot + 1) };
}
function extOf(p) {
  const b = basename3(p);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i) : ".png";
}
function ensureBindingsValid(graph, bindings, workflowRel) {
  const issues = validateBindings(graph, bindings, `${workflowRel}.bindings`);
  const first = issues.find((i) => i.severity === "error");
  if (first !== void 0) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: `${workflowRel} \u7684 bindings \u975E\u6CD5\uFF1A${first.message}`,
      details: { issues }
    });
  }
}
function planSingleRun(opts) {
  const ref = resolveWorkflowRef(opts.root, opts.workflowRef);
  const loaded = loadGraphFile(ref.abs, ref.rel);
  const bindings = loadBindings(ref.abs);
  ensureBindingsValid(loaded.graph, bindings, loaded.rel);
  const over = applyMachineOverrides(loaded.graph, opts.machine, loaded.rel);
  const overError = over.issues.find((i) => i.severity === "error");
  if (overError !== void 0) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: overError.message,
      details: { issues: over.issues }
    });
  }
  const applied = applyLogicalValues(over.graph, bindings, opts.sets);
  let graph = applied.graph;
  const inputs = {};
  const overrides = { ...over.applied };
  const warnings = [];
  for (const [key, value] of Object.entries(opts.sets)) {
    if (!applied.unmapped.includes(key)) {
      inputs[key] = value;
      const target = bindings?.[key];
      if (target !== void 0) overrides[target] = value;
      continue;
    }
    const dot = key.indexOf(".");
    const nodeId = dot > 0 ? key.slice(0, dot) : "";
    const node = nodeId === "" ? void 0 : graph[nodeId];
    if (node === void 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `--set \u7684\u952E "${key}" \u65E2\u4E0D\u662F bindings \u903B\u8F91\u540D\uFF0C\u4E5F\u4E0D\u662F\u5DF2\u6709\u8282\u70B9\u8F93\u5165`,
        details: { logical_inputs: Object.keys(bindings ?? {}), nodes: Object.keys(graph).sort() }
      });
    }
    node.inputs[key.slice(dot + 1)] = value;
    inputs[key] = value;
    overrides[key] = value;
  }
  const setError = applied.issues.find((i) => i.severity === "error");
  if (setError !== void 0) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: setError.message,
      details: { issues: applied.issues }
    });
  }
  return {
    label: opts.label ?? opts.workflowRef,
    workflowAbs: ref.abs,
    workflowRel: ref.rel,
    graph,
    inputs,
    overrides,
    uploads: [],
    warnings,
    shotId: null
  };
}
function shotLogicalValues(shots, shot, stepsOverride) {
  const d = shots.defaults;
  const prefix = shots.style_prefix ?? "";
  const values = {
    prompt: prefix !== "" ? `${prefix}\u3002${shot.prompt}` : shot.prompt,
    seed: shot.seed,
    width: shot.width ?? shots.meta.width,
    height: shot.height ?? shots.meta.height
  };
  const optional = [
    ["negative", d.negative],
    ["steps", stepsOverride ?? shot.steps ?? d.steps],
    ["cfg", shot.cfg ?? d.cfg],
    ["length", shot.length ?? d.length],
    ["sampler_name", d.sampler_name],
    ["scheduler", d.scheduler],
    ["shift_video", d.shift_video],
    ["shift_audio", d.shift_audio],
    ["filename_prefix", `${shot.id}${shot.slug !== void 0 ? `_${shot.slug}` : ""}`]
  ];
  for (const [key, value] of optional) {
    if (value !== void 0) values[key] = value;
  }
  for (const [key, value] of Object.entries(shot.params ?? {})) values[key] = value;
  return values;
}
function pickRelaySource(root, upstreamId) {
  const rec = latestSucceededRun(root, `shot:${upstreamId}`);
  if (rec === null) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `\u63A5\u529B\u4E0A\u6E38\u955C ${upstreamId} \u8FD8\u6CA1\u6709\u6210\u529F run\uFF1B\u5148\u62CD\u4E0A\u6E38\uFF1Adaoyan shot ${upstreamId} --wait`
    });
  }
  const video = rec.outputs.find((o) => /\.(mp4|webm|mkv|mov|gif)$/i.test(o.name));
  const chosen = video ?? rec.outputs[0];
  if (chosen === void 0) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `\u63A5\u529B\u4E0A\u6E38\u955C ${upstreamId} \u7684 run ${rec.run_id} \u6CA1\u6709\u4EA7\u7269`
    });
  }
  const abs = runOutputAbs(root, rec, chosen);
  if (!existsSync16(abs)) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `\u63A5\u529B\u4E0A\u6E38\u4EA7\u7269\u4E0D\u5728\u5DE5\u4F5C\u533A\uFF08\u53EF\u80FD\u672A git lfs pull\uFF09\uFF1A${rec.run_id}/${chosen.path}`,
      details: { run_id: rec.run_id, path: chosen.path }
    });
  }
  return abs;
}
function firstFrameUpload(opts) {
  if (opts.shot.first_frame === void 0) return { upload: null, descriptor: void 0 };
  const target = opts.bindings?.first_frame;
  if (target === void 0) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: `\u955C ${opts.shot.id} \u9700\u8981\u9996\u5E27\uFF0C\u4F46 bindings \u7F3A\u5C11 "first_frame" \u6620\u5C04`,
      details: { bindings: opts.bindings }
    });
  }
  const ff = opts.shot.first_frame;
  if (typeof ff === "string") {
    const rel = opts.shots.meta.anchors[ff];
    if (rel === void 0) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `\u955C ${opts.shot.id} \u7684\u951A\u70B9 key "${ff}" \u4E0D\u5728 shots.json meta.anchors`
      });
    }
    const src = join14(opts.root, rel);
    if (!existsSync16(src)) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `\u951A\u70B9\u56FE\u7247\u4E0D\u5B58\u5728\uFF1A${rel}`,
        details: { key: ff, path: rel }
      });
    }
    const ext = extOf(src);
    return {
      upload: {
        logical: "first_frame",
        source: src,
        desiredName: `anchor_${ff}_${opts.shot.id}${ext}`,
        target: splitTarget(target)
      },
      descriptor: `anchor:${ff}`
    };
  }
  const upstream = opts.shots.shots.find((s) => s.id === ff.relay);
  if (upstream === void 0) {
    throw new DaoyanCliError({
      code: "relay_upstream_missing",
      message: `\u955C ${opts.shot.id} \u63A5\u529B\u7684\u4E0A\u6E38\u955C\u53F7 ${ff.relay} \u4E0D\u5B58\u5728\u4E8E\u5206\u955C\u8868`
    });
  }
  const sourceClip = pickRelaySource(opts.root, upstream.id);
  const relayDir = join14(opts.root, RELAY_DIR);
  mkdirSync3(relayDir, { recursive: true });
  const cache = join14(relayDir, `relay_${upstream.id}_to_${opts.shot.id}.png`);
  let needExtract = true;
  if (existsSync16(cache)) {
    try {
      needExtract = statSync3(cache).mtimeMs < statSync3(sourceClip).mtimeMs;
    } catch {
      needExtract = true;
    }
  }
  if (needExtract) {
    return {
      upload: {
        logical: "first_frame",
        source: `__RELAY_EXTRACT__:${sourceClip}=>${cache}`,
        desiredName: `relay_${upstream.id}_${opts.shot.id}.png`,
        target: splitTarget(target)
      },
      descriptor: `relay:${upstream.id}`
    };
  }
  return {
    upload: {
      logical: "first_frame",
      source: cache,
      desiredName: `relay_${upstream.id}_${opts.shot.id}.png`,
      target: splitTarget(target)
    },
    descriptor: `relay:${upstream.id}`
  };
}
async function planShotRuns(opts) {
  const targets = opts.shotIds === void 0 ? opts.shots.shots : opts.shotIds.map((id) => {
    const s = opts.shots.shots.find((x) => x.id === id);
    if (s === void 0) {
      throw new DaoyanCliError({
        code: "usage",
        message: `\u672A\u77E5\u955C\u53F7 ${id}\uFF1B\u53EF\u7528\uFF1A${opts.shots.shots.map((x) => x.id).join(" ")}`,
        exit: 2
      });
    }
    return s;
  });
  if (targets.length === 0) {
    throw new DaoyanCliError({ code: "config_invalid", message: "shots.json \u6CA1\u6709\u955C\u5934" });
  }
  const plans = [];
  const skipped = [];
  for (const shot of targets) {
    if (!opts.force) {
      const existing = latestRunByLabel(opts.root, `shot:${shot.id}`);
      if (existing !== null && existing.status === "succeeded") {
        skipped.push(shot.id);
        opts.log(`\u955C ${shot.id} \u5DF2\u6709\u6210\u529F run ${existing.run_id}\uFF0C\u8DF3\u8FC7\uFF08retake \u5F3A\u5236\u91CD\u62CD\uFF09`);
        continue;
      }
    }
    const ref = shot.workflow ?? opts.shots.workflow ?? opts.project.default_workflow ?? (() => {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `\u955C ${shot.id} \u6CA1\u6709\u53EF\u7528 workflow\uFF1A\u8BBE\u7F6E project.json \u7684 default_workflow\u3001shots.json \u7684 workflow\uFF0C\u6216\u5355\u955C workflow`
      });
    })();
    const wf = resolveWorkflowRef(opts.root, ref);
    const loaded = loadGraphFile(wf.abs, wf.rel);
    const bindings = loadBindings(wf.abs);
    if (bindings === null) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `shot \u9700\u8981 bindings \u6587\u4EF6\uFF1A${wf.rel.replace(/\.json$/, ".bindings.json")}`,
        details: { workflow: wf.rel }
      });
    }
    ensureBindingsValid(loaded.graph, bindings, wf.rel);
    for (const required of ["prompt", "seed"]) {
      if (bindings[required] === void 0) {
        throw new DaoyanCliError({
          code: "workflow_invalid",
          message: `bindings \u7F3A\u5C11 "${required}" \u6620\u5C04\uFF1Bshot recipe \u65E0\u6CD5\u6CE8\u5165\u8BE5\u503C`,
          details: { workflow: wf.rel }
        });
      }
    }
    const over = applyMachineOverrides(loaded.graph, opts.machine, wf.rel);
    const overError = over.issues.find((i) => i.severity === "error");
    if (overError !== void 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: overError.message,
        details: { issues: over.issues }
      });
    }
    const values = shotLogicalValues(opts.shots, shot, opts.stepsOverride);
    const ff = firstFrameUpload({ root: opts.root, shots: opts.shots, shot, bindings });
    const applied = applyLogicalValues(over.graph, bindings, values);
    const applyError = applied.issues.find((i) => i.severity === "error");
    if (applyError !== void 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: applyError.message,
        details: { issues: applied.issues }
      });
    }
    const plan = {
      label: `shot:${shot.id}`,
      workflowAbs: wf.abs,
      workflowRel: wf.rel,
      graph: applied.graph,
      inputs: { ...applied.applied, ...ff.descriptor !== void 0 ? { first_frame: ff.descriptor } : {} },
      overrides: over.applied,
      uploads: ff.upload !== null ? [ff.upload] : [],
      warnings: applied.unmapped.map((k) => ({
        code: "binding_not_found",
        message: `\u903B\u8F91\u8F93\u5165 "${k}" \u6CA1\u6709 binding\uFF0C\u5DF2\u5FFD\u7565`
      })),
      shotId: shot.id
    };
    for (const up of plan.uploads) {
      if (up.source.startsWith("__RELAY_EXTRACT__:")) {
        const spec = up.source.slice("__RELAY_EXTRACT__:".length);
        const arrow = spec.indexOf("=>");
        const from = spec.slice(0, arrow);
        const to = spec.slice(arrow + 2);
        opts.log(`\u955C ${shot.id}\uFF1A\u62BD\u53D6\u4E0A\u6E38\u5C3E\u5E27 \u2192 ${RELAY_DIR}/`);
        await extractLastFrame(from, to);
        up.source = to;
      }
    }
    plans.push(plan);
  }
  return { plans, skipped };
}
var init_plans = __esm({
  "src/core/task/plans.mts"() {
    "use strict";
    init_errors();
    init_types();
    init_config();
    init_ffmpeg();
    init_store2();
    init_load();
  }
});

// src/shared/signals.mts
function onSignal(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}
function installSignalHandlers() {
  const dispatch = (signal) => {
    if (handlers.size === 0) {
      process.exit(130);
      return;
    }
    for (const fn of handlers) {
      try {
        fn(signal);
      } catch {
      }
    }
  };
  process.on("SIGINT", () => dispatch("SIGINT"));
  process.on("SIGTERM", () => dispatch("SIGTERM"));
}
var handlers;
var init_signals = __esm({
  "src/shared/signals.mts"() {
    "use strict";
    handlers = /* @__PURE__ */ new Set();
  }
});

// src/core/task/events.mts
import { existsSync as existsSync17, readFileSync as readFileSync13 } from "fs";
import { join as join15 } from "path";
import { appendFileSync as appendFileSync2 } from "fs";
function eventsPath(taskDir2) {
  return join15(taskDir2, EVENTS_FILE);
}
function readEvents(taskDir2, fromSeq = 0) {
  const file = eventsPath(taskDir2);
  if (!existsSync17(file)) return [];
  const out = [];
  for (const line of readFileSync13(file, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      const ev = JSON.parse(line);
      if (typeof ev.seq === "number" && typeof ev.type === "string" && ev.seq > fromSeq) out.push(ev);
    } catch {
    }
  }
  return out;
}
function lastSeq(taskDir2) {
  const evs = readEvents(taskDir2);
  return evs.length === 0 ? 0 : evs[evs.length - 1]?.seq ?? 0;
}
function appendEvent(taskDir2, type, data = {}) {
  ensureDir(taskDir2);
  const seq = lastSeq(taskDir2) + 1;
  const ev = { seq, ts: nowIso(), type, data };
  appendFileSync2(eventsPath(taskDir2), JSON.stringify(ev) + "\n");
  return ev;
}
var init_events = __esm({
  "src/core/task/events.mts"() {
    "use strict";
    init_fs();
    init_types();
  }
});

// src/core/engine/remote-session.mts
var remote_session_exports = {};
__export(remote_session_exports, {
  RemoteSession: () => RemoteSession
});
var RemoteSession;
var init_remote_session = __esm({
  "src/core/engine/remote-session.mts"() {
    "use strict";
    init_errors();
    init_net();
    init_client();
    init_catalog();
    RemoteSession = class {
      /**
       * 共用 HTTP 客户端。
       */
      client;
      // 释放策略
      freeStrategy;
      // 会话信息
      infoState;
      /**
       * 构造会话。
       */
      constructor(url, freeStrategy) {
        const base = url.replace(/\/+$/, "");
        this.client = new ComfyClient(base);
        this.freeStrategy = freeStrategy;
        this.infoState = {
          mode: "remote",
          url: base,
          comfyui_version: null,
          pid: null,
          ready_ms: null
        };
      }
      /**
       * 当前会话信息。
       */
      info() {
        return { ...this.infoState };
      }
      /**
       * remote 不管理进程，健康状态未知。
       */
      health() {
        return "unknown";
      }
      /**
       * 探测可达性并检查队列；忙则 engine_busy，不提交。
       */
      async ensureReady(log, signal) {
        const isAborted = () => signal !== void 0 && signal.aborted;
        if (isAborted()) throw new Error("cancelled");
        let stats = null;
        for (let i = 0; i < 2; i++) {
          if (isAborted()) throw new Error("cancelled");
          try {
            stats = await this.client.systemStats(1e4);
            break;
          } catch (e) {
            if (i === 1) {
              throw new DaoyanCliError({
                code: "engine_unreachable",
                message: `\u8FDC\u7AEF\u5F15\u64CE\u4E0D\u53EF\u8FBE\uFF08${this.infoState.url}\uFF09\uFF1A${e instanceof Error ? e.message : String(e)}`
              });
            }
            await sleep(1e3);
          }
        }
        let queue;
        try {
          queue = await this.client.queue();
        } catch (e) {
          throw new DaoyanCliError({
            code: "engine_unreachable",
            message: `\u8FDC\u7AEF\u5F15\u64CE\u961F\u5217\u4E0D\u53EF\u8BFB\uFF1A${e instanceof Error ? e.message : String(e)}`
          });
        }
        const busy = queue.queue_running.length + queue.queue_pending.length;
        if (busy > 0) {
          throw new DaoyanCliError({
            code: "engine_busy",
            message: `\u8FDC\u7AEF\u961F\u5217\u5DF2\u6709 ${busy} \u4E2A\u4EFB\u52A1\uFF08\u6267\u884C\u4E2D ${queue.queue_running.length} / \u7B49\u5F85 ${queue.queue_pending.length}\uFF09\uFF1B\u4E0D\u63D0\u4EA4`,
            details: { running: queue.queue_running.length, pending: queue.queue_pending.length }
          });
        }
        const version = comfyVersionOf(stats);
        this.infoState = { ...this.infoState, comfyui_version: version };
        log(`remote \u5F15\u64CE\u5C31\u7EEA\uFF1A${this.infoState.url}\uFF08ComfyUI ${version ?? "unknown"}\uFF0C\u961F\u5217\u7A7A\u95F2\uFF09`);
      }
      /**
       * 任务结束：按 free_after_task 策略卸载模型；不碰进程。
       */
      async release(inputs, log) {
        const cleanup = {
          interrupt: "not_needed",
          free: "not_needed",
          stop: "not_needed",
          scratch: "not_needed",
          gpu_restore: "not_needed"
        };
        if (!inputs.submitted) {
          return { cleanup, restored: [], errors: [] };
        }
        if (inputs.interrupt) {
          try {
            await this.client.interrupt();
            cleanup.interrupt = "ok";
          } catch (e) {
            cleanup.interrupt = "failed";
            log(`remote /interrupt \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`);
          }
        }
        if (this.freeStrategy === "never") {
          cleanup.free = "skipped";
          log("remote \u91CA\u653E\u7B56\u7565 never\uFF1A\u8DF3\u8FC7 /free");
          return { cleanup, restored: [], errors: [] };
        }
        if (this.freeStrategy === "when_idle") {
          const idle = await this.client.queueIdle();
          if (idle !== true) {
            cleanup.free = idle === false ? "skipped" : "skipped";
            log(idle === false ? "remote \u961F\u5217\u4ECD\u6709\u4EFB\u52A1\uFF1A\u8DF3\u8FC7 /free" : "remote \u961F\u5217\u4E0D\u53EF\u8BFB\uFF1A\u8DF3\u8FC7 /free");
            return { cleanup, restored: [], errors: [] };
          }
        }
        try {
          await this.client.free();
          cleanup.free = "ok";
        } catch (e) {
          cleanup.free = "failed";
          log(`remote /free \u5931\u8D25\uFF08\u4E0D\u5F71\u54CD\u4EFB\u52A1\u72B6\u6001\uFF09\uFF1A${e instanceof Error ? e.message : String(e)}`);
        }
        return { cleanup, restored: [], errors: [] };
      }
    };
  }
});

// src/core/engine/session.mts
async function createEngineSession(opts) {
  if (opts.engineUrlOverride !== void 0) {
    const { RemoteSession: RemoteSession2 } = await Promise.resolve().then(() => (init_remote_session(), remote_session_exports));
    return new RemoteSession2(opts.engineUrlOverride, "when_idle");
  }
  if (opts.machine.engine.mode === "remote") {
    const { RemoteSession: RemoteSession2 } = await Promise.resolve().then(() => (init_remote_session(), remote_session_exports));
    return new RemoteSession2(
      opts.machine.engine.url,
      opts.machine.engine.free_after_task ?? "when_idle"
    );
  }
  const { LocalSession: LocalSession2 } = await Promise.resolve().then(() => (init_local_session(), local_session_exports));
  return new LocalSession2(opts);
}
var init_session = __esm({
  "src/core/engine/session.mts"() {
    "use strict";
  }
});

// src/core/workflow/preflight.mts
async function fetchCatalog(root, client, log) {
  let stats = null;
  try {
    stats = await client.systemStats(3e4);
  } catch {
    stats = null;
  }
  let raw;
  try {
    raw = await client.objectInfo(12e4);
  } catch (e) {
    throw new DaoyanCliError({
      code: "engine_unreachable",
      message: `\u9884\u68C0\u5931\u8D25\uFF1A\u65E0\u6CD5\u8BFB\u53D6 /object_info\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`
    });
  }
  const version = comfyVersionOf(stats);
  const catalog = buildCatalog(raw, version);
  writeCatalog(root, catalog);
  log(`\u9884\u68C0\uFF1A\u8282\u70B9\u76EE\u5F55 ${Object.keys(raw).length} \u4E2A\u8282\u70B9\uFF08ComfyUI ${version ?? "unknown"}\uFF09`);
  return { catalog, comfyuiVersion: version, systemStats: stats };
}
async function runPreflight(root, client, graph, log) {
  const fetched = await fetchCatalog(root, client, log);
  const issues = validateGraphWithCatalog(graph, fetched.catalog);
  return { ...fetched, issues };
}
var init_preflight = __esm({
  "src/core/workflow/preflight.mts"() {
    "use strict";
    init_errors();
    init_catalog();
    init_load();
  }
});

// src/core/run/executor.mts
import { existsSync as existsSync18, readFileSync as readFileSync14, statSync as statSync4, openSync as openSync3, readSync as readSync2, closeSync as closeSync3 } from "fs";
import { basename as basename4, join as join16 } from "path";
function collectOutputItems(outputs) {
  const out = [];
  for (const nodeOutputs of Object.values(outputs)) {
    for (const key of ["videos", "gifs", "images"]) {
      const arr = nodeOutputs[key];
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (typeof item !== "object" || item === null) continue;
        const o = item;
        if (typeof o.filename !== "string" || o.filename === "") continue;
        out.push({
          filename: o.filename,
          subfolder: typeof o.subfolder === "string" ? o.subfolder : "",
          type: typeof o.type === "string" ? o.type : "output"
        });
      }
    }
  }
  return out;
}
function readTailText(file, lines) {
  if (!existsSync18(file)) return "";
  let size = 0;
  try {
    size = statSync4(file).size;
  } catch {
    return "";
  }
  const window = Math.min(size, lines * 400 + 65536);
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync3(file, "r");
    readSync2(fd, buf, 0, window, size - window);
    closeSync3(fd);
  } catch {
    return "";
  }
  return buf.toString("utf8").split(/[\r\n]+/).filter((l) => l !== "").slice(-lines).join("\n");
}
function detectOom(entry, root, taskId) {
  const statusText = JSON.stringify(entry.status?.messages ?? []);
  if (/out of memory|OutOfMemory|CUDA error|allocation on device|\bOOM\b/i.test(statusText)) return true;
  const logText = readTailText(join16(root, LOG_DIR, `engine-${taskId}.log`), 30);
  return /out of memory|OutOfMemory|CUDA error: out of memory|allocation on device|\bOOM\b/i.test(logText);
}
function sanitizeMessage(message, root) {
  const prefixes = [`${root}/`, `${root}\\`, root];
  let out = message;
  for (const p of prefixes) out = out.split(p).join("");
  return out;
}
function sanitizeDetails(value, root) {
  if (typeof value === "string") return sanitizeMessage(value, root);
  if (Array.isArray(value)) return value.map((v) => sanitizeDetails(v, root));
  if (value !== null && typeof value === "object") {
    const src = value;
    const out = {};
    for (const [k, v] of Object.entries(src)) {
      out[sanitizeMessage(k, root)] = sanitizeDetails(v, root);
    }
    return out;
  }
  return value;
}
function writeFailedRun(opts) {
  const info = opts.session.info();
  const rec = {
    run_id: opts.runId,
    task_id: opts.taskId,
    machine_id: opts.machineId,
    request_id: opts.requestId,
    label: opts.plan.label,
    workflow: { path: opts.plan.workflowRel, sha256: graphSha256(opts.plan.graph) },
    inputs: opts.plan.inputs,
    overrides: opts.plan.overrides,
    engine: {
      mode: info.mode,
      comfyui_version: info.comfyui_version,
      url: info.url,
      pid: info.pid,
      ready_ms: info.ready_ms,
      cleanup: null
    },
    status: opts.status,
    prompt_id: opts.promptId,
    started_at: opts.startedAt,
    finished_at: nowIso(),
    outputs: [],
    error: opts.error
  };
  writeRun(opts.root, rec);
  return rec;
}
async function executeRun(opts) {
  const startedAt = nowIso();
  const startedMs = Date.now();
  createRunDir(opts.root, opts.runId);
  const graph = JSON.parse(JSON.stringify(opts.plan.graph));
  const files = [];
  let submitted = false;
  let promptId = null;
  try {
    if (Object.keys(graph).length === 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `workflow ${opts.plan.workflowRel} \u662F\u7A7A\u56FE\uFF1B\u5148\u7528 workflow apply/set \u6DFB\u52A0\u8282\u70B9`
      });
    }
    for (const up of opts.plan.uploads) {
      opts.event("upload_started", { run_id: opts.runId, logical: up.logical });
      const bytes = new Uint8Array(readFileSync14(up.source));
      files.push(copyRunInput(opts.root, opts.runId, up.source, up.desiredName));
      const engineName = `dycli_${opts.runId}_${basename4(up.desiredName).replace(/[^A-Za-z0-9._-]/g, "_")}`;
      const name = await opts.session.client.uploadImage(engineName, bytes, true);
      opts.accumulator.uploaded.push(name);
      const target = graph[up.target.node];
      if (target === void 0) {
        throw new DaoyanCliError({
          code: "workflow_invalid",
          message: `first_frame \u7ED1\u5B9A\u6307\u5411\u4E0D\u5B58\u5728\u7684\u8282\u70B9 ${up.target.node}`
        });
      }
      target.inputs[up.target.input] = name;
      opts.event("upload_finished", { run_id: opts.runId, logical: up.logical, name });
    }
    writeWorkflowSnapshot(opts.root, opts.runId, graph);
    writeInputsSnapshot(opts.root, opts.runId, opts.plan.inputs, files);
    if (opts.catalog === void 0) {
      const pf = await runPreflight(opts.root, opts.session.client, graph, opts.log);
      throwOnErrors(pf.issues, "\u9884\u68C0\u5931\u8D25");
    } else {
      throwOnErrors(validateGraphWithCatalog(graph, opts.catalog), "\u9884\u68C0\u5931\u8D25");
    }
    opts.event("run_started", { run_id: opts.runId, label: opts.plan.label });
    const receipt = await opts.session.client.submit(graph, `daoyan-${opts.runId}`);
    if (receipt.node_errors !== void 0 && Object.keys(receipt.node_errors).length > 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: "\u5F15\u64CE\u62D2\u7EDD workflow\uFF08node_errors\uFF09",
        details: { node_errors: receipt.node_errors }
      });
    }
    promptId = receipt.prompt_id;
    submitted = true;
    opts.accumulator.submitted = true;
    opts.event("submitted", { run_id: opts.runId, prompt_id: promptId });
    opts.log(`run ${opts.runId} \u5DF2\u63D0\u4EA4\uFF08prompt ${promptId.slice(0, 8)}\u2026\uFF09`);
    const deadline = startedMs + opts.timeoutMs;
    let lastBeat = Date.now();
    for (; ; ) {
      if (opts.signal.aborted) {
        opts.accumulator.interruptNeeded = true;
        throw new RunCancelledError();
      }
      if (Date.now() > deadline) {
        opts.accumulator.interruptNeeded = true;
        throw new DaoyanCliError({
          code: "run_timeout",
          message: `run ${opts.runId} \u7B49\u5F85\u8D85\u65F6\uFF08${Math.round(opts.timeoutMs / 6e4)} \u5206\u949F\uFF09`,
          details: { prompt_id: promptId }
        });
      }
      if (opts.session.health() === "dead") {
        opts.accumulator.interruptNeeded = false;
        throw new DaoyanCliError({
          code: "engine_crashed",
          message: "\u5F15\u64CE\u8FDB\u7A0B\u5728\u6267\u884C\u4E2D\u9000\u51FA",
          details: { prompt_id: promptId }
        });
      }
      let entry;
      try {
        const hist = await opts.session.client.history(promptId);
        entry = hist[promptId];
      } catch {
        entry = void 0;
      }
      if (entry !== void 0) {
        const statusStr = entry.status?.status_str;
        if (statusStr === "error" || statusStr === "cancelled") {
          const oom = detectOom(entry, opts.root, opts.taskId);
          if (oom) opts.accumulator.interruptNeeded = true;
          throw new DaoyanCliError({
            code: oom ? "engine_oom" : "run_failed",
            message: oom ? "\u663E\u5B58\u4E0D\u8DB3\uFF08OOM\uFF09\uFF1A\u5F15\u64CE\u6267\u884C\u5931\u8D25" : `\u5F15\u64CE\u6267\u884C\u5931\u8D25\uFF08status=${statusStr}\uFF09`,
            details: {
              prompt_id: promptId,
              status: entry.status ?? {}
            }
          });
        }
        const outputs = entry.outputs ?? {};
        if ((entry.status?.completed ?? false) || Object.keys(outputs).length > 0) {
          const items = collectOutputItems(outputs);
          if (items.length === 0) {
            throw new DaoyanCliError({
              code: "run_failed",
              message: "\u5F15\u64CE\u6807\u8BB0\u5B8C\u6210\u4F46\u6CA1\u6709\u8F93\u51FA\u6587\u4EF6",
              details: { prompt_id: promptId }
            });
          }
          const downloaded = [];
          for (const item of items) {
            if (item.type !== "output") continue;
            try {
              const res = await opts.session.client.view(item);
              const rec2 = writeRunOutput(opts.root, opts.runId, item.filename, res.bytes);
              downloaded.push(rec2);
              opts.accumulator.scratchOutputs.push({
                filename: item.filename,
                subfolder: item.subfolder
              });
            } catch (e) {
              throw new DaoyanCliError({
                code: "artifact_download_failed",
                message: `\u4EA7\u7269\u4E0B\u8F7D\u5931\u8D25 ${item.filename}\uFF1A${e instanceof Error ? e.message : String(e)}`,
                details: { prompt_id: promptId, filename: item.filename }
              });
            }
          }
          if (downloaded.length === 0) {
            throw new DaoyanCliError({
              code: "run_failed",
              message: "\u4EA7\u7269\u5168\u90E8\u4E0D\u662F output \u7C7B\u578B\uFF08\u4E34\u65F6\u8F93\u51FA\uFF09\uFF0C\u6CA1\u6709\u53EF\u843D\u4F4D\u6587\u4EF6",
              details: { prompt_id: promptId }
            });
          }
          const info = opts.session.info();
          const rec = {
            run_id: opts.runId,
            task_id: opts.taskId,
            machine_id: opts.machineId,
            request_id: opts.requestId,
            label: opts.plan.label,
            workflow: { path: opts.plan.workflowRel, sha256: graphSha256(graph) },
            inputs: opts.plan.inputs,
            overrides: opts.plan.overrides,
            engine: {
              mode: info.mode,
              comfyui_version: info.comfyui_version,
              url: info.url,
              pid: info.pid,
              ready_ms: info.ready_ms,
              cleanup: null
            },
            status: "succeeded",
            prompt_id: promptId,
            started_at: startedAt,
            finished_at: nowIso(),
            outputs: downloaded,
            error: null
          };
          writeRun(opts.root, rec);
          opts.event("run_succeeded", {
            run_id: opts.runId,
            outputs: downloaded.map((o) => o.path)
          });
          opts.log(`run ${opts.runId} \u5B8C\u6210\uFF1A${downloaded.map((o) => o.path).join(", ")}`);
          return rec;
        }
      }
      if (Date.now() - lastBeat >= HEARTBEAT_MS) {
        opts.log(`run ${opts.runId} \u8FDB\u884C\u4E2D... \u5DF2 ${Math.round((Date.now() - startedMs) / 6e4)} \u5206\u949F`);
        opts.event("progress", { run_id: opts.runId, elapsed_ms: Date.now() - startedMs });
        lastBeat = Date.now();
      }
      try {
        await sleep(POLL_INTERVAL_MS, opts.signal);
      } catch {
      }
    }
  } catch (e) {
    if (e instanceof RunCancelledError) {
      writeFailedRun({
        root: opts.root,
        runId: opts.runId,
        taskId: opts.taskId,
        machineId: opts.machineId,
        requestId: opts.requestId,
        plan: opts.plan,
        session: opts.session,
        startedAt,
        promptId,
        status: "cancelled",
        error: null
      });
      throw e;
    }
    const err = isDaoyanCliError(e) ? e : asCliError(e, submitted ? "run_failed" : "workflow_invalid");
    writeFailedRun({
      root: opts.root,
      runId: opts.runId,
      taskId: opts.taskId,
      machineId: opts.machineId,
      requestId: opts.requestId,
      plan: opts.plan,
      session: opts.session,
      startedAt,
      promptId,
      status: "failed",
      error: {
        code: err.code,
        message: sanitizeMessage(err.message, opts.root),
        ...err.details !== void 0 ? { details: sanitizeDetails(err.details, opts.root) } : {}
      }
    });
    throw new DaoyanCliError({
      code: err.code,
      message: err.message,
      details: err.details,
      taskId: opts.taskId,
      runId: opts.runId
    });
  }
}
function patchRunCleanup(opts) {
  let first = true;
  for (const runId of opts.runIds) {
    const file = join16(opts.root, "runs", runId, "run.json");
    if (!existsSync18(file)) continue;
    try {
      const rec = JSON.parse(readFileSync14(file, "utf8"));
      rec.engine.cleanup = opts.cleanup;
      if (opts.gpu !== void 0) {
        const gpu = { ...opts.gpu, restored: opts.restored };
        if (first) rec.gpu = gpu;
        first = false;
      }
      writeRun(opts.root, rec);
    } catch {
    }
  }
}
var POLL_INTERVAL_MS, HEARTBEAT_MS, RunCancelledError;
var init_executor = __esm({
  "src/core/run/executor.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_net();
    init_client();
    init_types();
    init_store2();
    init_preflight();
    init_load();
    init_graph();
    POLL_INTERVAL_MS = 1e3;
    HEARTBEAT_MS = 6e4;
    RunCancelledError = class extends Error {
      /**
       * 固定错误名。
       */
      constructor() {
        super("task cancelled");
        this.name = "RunCancelledError";
      }
    };
  }
});

// src/core/task/worker.mts
import { existsSync as existsSync19, readdirSync as readdirSync5 } from "fs";
import { basename as basename5, dirname as dirname7, join as join17, resolve as resolve3 } from "path";
function isFatalRunError(code) {
  return code === "engine_oom" || code === "engine_crashed" || code === "engine_unreachable" || code === "engine_busy" || code === "engine_start_failed" || code === "engine_stop_failed" || code === "gpu_lease_corrupt" || code === "machine_busy" || code === "machine_lock_corrupt" || code === "worker_start_failed";
}
function shotTargets(root, shots, task) {
  const o = task.options;
  const ids = o.shots === void 0 ? shots.shots.map((s) => s.id) : o.shots.map((id) => {
    if (!shots.shots.some((s) => s.id === id)) {
      throw new DaoyanCliError({
        code: "usage",
        message: `\u672A\u77E5\u955C\u53F7 ${id}\uFF1B\u53EF\u7528\uFF1A${shots.shots.map((s) => s.id).join(" ")}`,
        exit: 2
      });
    }
    return id;
  });
  const force = o.force === true;
  const execute = [];
  const skipped = [];
  for (const id of ids) {
    if (!force && latestSucceededRun(root, `shot:${id}`) !== null) skipped.push(id);
    else execute.push(id);
  }
  return { execute, skipped };
}
function aggregateFailure(kind, failures, completed) {
  if (failures.length === 0) {
    return { code: "run_failed", message: "\u4EFB\u52A1\u5931\u8D25", details: {} };
  }
  if (kind === "run" && failures.length === 1) {
    const f = failures[0];
    return {
      code: f.code,
      message: f.message,
      details: { run_id: f.run_id }
    };
  }
  return {
    code: kind === "run" ? "run_failed" : "shot_failed",
    message: `\u5B8C\u6210 ${completed} \u4E2A run\uFF0C\u5931\u8D25 ${failures.length} \u4E2A`,
    details: { failures, completed }
  };
}
async function runWorker(opts) {
  const taskDir2 = resolve3(opts.taskDir);
  const root = dirname7(dirname7(taskDir2));
  const taskId = basename5(taskDir2);
  let task = requireTask(root, taskId);
  if (isTerminalStatus(task.status)) return 0;
  let lock = null;
  let session = null;
  const controller = new AbortController();
  let cancelled = false;
  const requestCancel2 = () => {
    if (cancelled) return;
    cancelled = true;
    appendEvent(taskDir2, "cancel_requested", { pid: process.pid });
    controller.abort(new Error("cancel requested"));
  };
  const onWorkerSignal = () => requestCancel2();
  const offSignal = onSignal(onWorkerSignal);
  const cancelTimer = setInterval(() => {
    try {
      if (isCancelRequested(root, taskId)) requestCancel2();
    } catch {
    }
  }, 1e3);
  const accumulator = {
    submitted: false,
    uploaded: [],
    scratchOutputs: [],
    interruptNeeded: false
  };
  const failures = [];
  let completed = 0;
  const runIds = [];
  try {
    lock = attachMachineLock({
      taskId,
      token: opts.token,
      ...opts.lockPath !== void 0 ? { path: opts.lockPath } : {}
    });
    appendEvent(taskDir2, "worker_started", { pid: process.pid });
    appendEvent(taskDir2, "machine_lock_acquired", { pid: process.pid });
    task = updateTask(root, taskId, {
      status: "running",
      started_at: nowIso(),
      worker: { pid: process.pid, started_at: nowIso() },
      next_actions: nextActionsFor(taskId, "running")
    });
    const project = readProjectAt(root);
    if (project === null) {
      throw new DaoyanCliError({ code: "project_not_found", message: `\u9879\u76EE\u6839\u7F3A\u5C11 project.json\uFF1A${root}` });
    }
    const machine = loadMachine(root);
    if (task.mode !== machine.engine.mode && task.options.engine_url === void 0) {
      warn(`task \u521B\u5EFA\u65F6\u7684 mode=${task.mode} \u4E0E machine.json \u5F53\u524D mode=${machine.engine.mode} \u4E0D\u4E00\u81F4\uFF1B\u4EE5 machine.json \u4E3A\u51C6`);
    }
    say(`task ${taskId}\uFF08${task.kind}\uFF09\u5F00\u59CB\uFF0Cmode=${machine.engine.mode}`);
    const timeoutMs = task.options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    let runPlan = null;
    let shotsFile = null;
    let shotQueue = [];
    let skippedShots = [];
    if (task.kind === "run") {
      const o = task.options;
      if (o.workflow === void 0 || o.workflow === "") {
        throw new DaoyanCliError({ code: "usage", message: "run task \u7F3A\u5C11 workflow", exit: 2 });
      }
      runPlan = planSingleRun({
        root,
        project,
        machine,
        workflowRef: o.workflow,
        sets: o.sets ?? {},
        ...o.label !== void 0 ? { label: o.label } : {}
      });
    } else {
      shotsFile = loadShotsFile(root);
      const targets = shotTargets(root, shotsFile, task);
      shotQueue = targets.execute;
      skippedShots = targets.skipped;
      for (const id of skippedShots) appendEvent(taskDir2, "run_skipped", { shot_id: id });
      if (shotQueue.length === 0) {
        say("\u6CA1\u6709\u9700\u8981\u6267\u884C\u7684 run\uFF08\u5168\u90E8\u5DF2\u6709\u6210\u529F\u4EA7\u7269\uFF09");
        appendEvent(taskDir2, "finished", { status: "succeeded", skipped: skippedShots });
        finishTask(root, taskId, "succeeded");
        return 0;
      }
    }
    appendEvent(taskDir2, "engine_starting", { mode: machine.engine.mode });
    session = await createEngineSession({
      root,
      project,
      machine,
      taskId,
      ...task.options.engine_url !== void 0 ? { engineUrlOverride: task.options.engine_url } : {}
    });
    await session.ensureReady(say, controller.signal);
    if (controller.signal.aborted) throw new RunCancelledError();
    const info = session.info();
    appendEvent(taskDir2, "engine_ready", {
      mode: info.mode,
      url: info.url,
      comfyui_version: info.comfyui_version,
      pid: info.pid,
      ready_ms: info.ready_ms
    });
    const fetched = await fetchCatalog(root, session.client, say);
    if (controller.signal.aborted) throw new RunCancelledError();
    const executeOne = async (plan) => {
      if (controller.signal.aborted) throw new RunCancelledError();
      if (Date.now() > deadline) {
        throw new DaoyanCliError({
          code: "run_timeout",
          message: `task \u7B49\u5F85\u8D85\u65F6\uFF08${Math.round(timeoutMs / 6e4)} \u5206\u949F\uFF09`
        });
      }
      const runId = newRunId(machine.machine_id);
      appendTaskRun(root, taskId, runId);
      runIds.push(runId);
      for (const w of plan.warnings) {
        appendEvent(taskDir2, "run_warning", { run_id: runId, code: w.code, message: w.message });
      }
      say(`\u6267\u884C run ${runId}${plan.label !== null ? `\uFF08${plan.label}\uFF09` : ""}`);
      try {
        await executeRun({
          root,
          project,
          machine,
          session,
          plan,
          runId,
          taskId,
          machineId: machine.machine_id,
          requestId: task.request_id,
          timeoutMs: Math.max(1e3, deadline - Date.now()),
          signal: controller.signal,
          accumulator,
          catalog: fetched.catalog,
          log: say,
          event: (type, data) => appendEvent(taskDir2, type, data)
        });
        completed++;
      } catch (e) {
        if (e instanceof RunCancelledError) throw e;
        const err = isDaoyanCliError(e) ? e : asCliError(e, "run_failed");
        failures.push({
          run_id: runId,
          code: err.code,
          message: sanitizeMessage(err.message, root)
        });
        appendEvent(taskDir2, "run_failed", {
          run_id: runId,
          code: err.code,
          message: sanitizeMessage(err.message, root)
        });
        if (isFatalRunError(err.code)) throw err;
        say(`run ${runId} \u5931\u8D25[${err.code}]\uFF1A${err.message}`);
      }
    };
    if (runPlan !== null) {
      await executeOne(runPlan);
    } else {
      for (const id of shotQueue) {
        if (controller.signal.aborted) throw new RunCancelledError();
        if (Date.now() > deadline) {
          throw new DaoyanCliError({
            code: "run_timeout",
            message: `task \u7B49\u5F85\u8D85\u65F6\uFF08${Math.round(timeoutMs / 6e4)} \u5206\u949F\uFF09`
          });
        }
        let plan;
        try {
          const planned = await planShotRuns({
            root,
            project,
            machine,
            shots: shotsFile,
            shotIds: [id],
            force: true,
            ...task.options.steps !== void 0 ? { stepsOverride: task.options.steps } : {},
            log: say
          });
          const first = planned.plans[0];
          if (first === void 0) {
            appendEvent(taskDir2, "run_skipped", { shot_id: id });
            continue;
          }
          plan = first;
        } catch (e) {
          const err = isDaoyanCliError(e) ? e : asCliError(e, "shot_failed");
          failures.push({ run_id: "", code: err.code, message: sanitizeMessage(err.message, root) });
          appendEvent(taskDir2, "run_failed", {
            shot_id: id,
            run_id: null,
            code: err.code,
            message: sanitizeMessage(err.message, root)
          });
          if (isFatalRunError(err.code)) throw err;
          say(`\u955C ${id} \u8BA1\u5212\u5931\u8D25[${err.code}]\uFF1A${err.message}`);
          continue;
        }
        await executeOne(plan);
      }
    }
    appendEvent(taskDir2, "cleanup_started", {});
    const rel = await session.release(
      {
        submitted: accumulator.submitted,
        interrupt: accumulator.interruptNeeded || controller.signal.aborted,
        uploaded: accumulator.uploaded,
        scratch_outputs: accumulator.scratchOutputs
      },
      say
    );
    patchRunCleanup({
      root,
      runIds,
      cleanup: rel.cleanup,
      ...rel.gpu !== void 0 ? { gpu: rel.gpu } : {},
      restored: rel.restored
    });
    appendEvent(taskDir2, "cleanup_finished", {
      cleanup: rel.cleanup,
      restored: rel.restored,
      errors: rel.errors
    });
    if (cancelled) {
      appendEvent(taskDir2, "finished", { status: "cancelled", completed });
      finishTask(root, taskId, "cancelled", null);
      say("task \u5DF2\u53D6\u6D88\uFF0Ccleanup \u5B8C\u6210");
      return 130;
    }
    if (failures.length > 0) {
      const agg = aggregateFailure(task.kind, failures, completed);
      appendEvent(taskDir2, "finished", { status: "failed", code: agg.code, completed, failures });
      finishTask(root, taskId, "failed", {
        code: agg.code,
        message: sanitizeMessage(agg.message, root),
        details: {
          ...agg.details,
          ...rel.errors.length > 0 ? { cleanup: rel.errors } : {}
        }
      });
      say(`task \u5931\u8D25\uFF1A\u5B8C\u6210 ${completed}\uFF0C\u5931\u8D25 ${failures.length}`);
      return 1;
    }
    appendEvent(taskDir2, "finished", { status: "succeeded", completed, runs: runIds });
    finishTask(root, taskId, "succeeded", null);
    say(`task \u5B8C\u6210\uFF1A${completed} \u4E2A run`);
    return 0;
  } catch (e) {
    if (e instanceof RunCancelledError || cancelled) {
      if (session !== null) {
        try {
          const rel = await session.release(
            {
              submitted: accumulator.submitted,
              interrupt: true,
              uploaded: accumulator.uploaded,
              scratch_outputs: accumulator.scratchOutputs
            },
            say
          );
          patchRunCleanup({
            root,
            runIds,
            cleanup: rel.cleanup,
            ...rel.gpu !== void 0 ? { gpu: rel.gpu } : {},
            restored: rel.restored
          });
          appendEvent(taskDir2, "cleanup_finished", {
            cleanup: rel.cleanup,
            restored: rel.restored,
            errors: rel.errors
          });
        } catch (cleanupError) {
          warn(`\u53D6\u6D88\u6E05\u7406\u5931\u8D25\uFF1A${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
      }
      appendEvent(taskDir2, "finished", { status: "cancelled", completed });
      finishTask(root, taskId, "cancelled", null);
      return 130;
    }
    const err = isDaoyanCliError(e) ? e : asCliError(e, "worker_crashed");
    let cleanupErrors = [];
    if (session !== null) {
      appendEvent(taskDir2, "cleanup_started", {});
      try {
        const rel = await session.release(
          {
            submitted: accumulator.submitted,
            interrupt: accumulator.interruptNeeded,
            uploaded: accumulator.uploaded,
            scratch_outputs: accumulator.scratchOutputs
          },
          say
        );
        patchRunCleanup({
          root,
          runIds,
          cleanup: rel.cleanup,
          ...rel.gpu !== void 0 ? { gpu: rel.gpu } : {},
          restored: rel.restored
        });
        cleanupErrors = rel.errors;
        appendEvent(taskDir2, "cleanup_finished", {
          cleanup: rel.cleanup,
          restored: rel.restored,
          errors: rel.errors
        });
      } catch (cleanupError) {
        warn(`\u5931\u8D25\u6E05\u7406\u5F02\u5E38\uFF1A${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        appendEvent(taskDir2, "cleanup_finished", {
          cleanup: null,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        });
      }
    }
    const message = sanitizeMessage(err.message, root);
    appendEvent(taskDir2, "finished", { status: "failed", code: err.code, message });
    const errorDetails = err.details !== void 0 ? sanitizeDetails(err.details, root) : {};
    if (cleanupErrors.length > 0) errorDetails.cleanup = sanitizeDetails(cleanupErrors, root);
    finishTask(root, taskId, "failed", {
      code: err.code,
      message,
      ...Object.keys(errorDetails).length > 0 ? { details: errorDetails } : {}
    });
    warn(`task ${taskId} \u5931\u8D25[${err.code}]\uFF1A${message}`);
    return 1;
  } finally {
    clearInterval(cancelTimer);
    offSignal();
    lock?.release();
  }
}
function workerLogPath(root, taskId) {
  return join17(root, LOG_DIR, `worker-${taskId}.log`);
}
var DEFAULT_TIMEOUT_MS;
var init_worker = __esm({
  "src/core/task/worker.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_log();
    init_signals();
    init_config();
    init_types();
    init_lock();
    init_store();
    init_events();
    init_plans();
    init_session();
    init_preflight();
    init_executor();
    init_store2();
    DEFAULT_TIMEOUT_MS = 3 * 60 * 60 * 1e3;
  }
});

// src/core/task/create.mts
import { closeSync as closeSync4, openSync as openSync4, readFileSync as readFileSync15 } from "fs";
import { spawn as spawn6 } from "child_process";
import { join as join18 } from "path";
function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function createAndStartTask(opts) {
  if (opts.requestId !== void 0 && opts.requestId !== "") {
    const existing = findTaskByRequestId(opts.root, opts.requestId);
    if (existing !== null) return { task: existing, deduplicated: true };
  }
  const mode = opts.options.engine_url !== void 0 ? "remote" : opts.machine.engine.mode;
  const taskId = newTaskId(opts.machine.machine_id);
  const record = makeTaskRecord({
    taskId,
    kind: opts.kind,
    machineId: opts.machine.machine_id,
    requestId: opts.requestId !== void 0 && opts.requestId !== "" ? opts.requestId : null,
    mode,
    command: opts.command,
    options: opts.options
  });
  let lock;
  try {
    lock = await acquireMachineLock({
      taskId,
      project: opts.root,
      mode,
      command: opts.command,
      kind: "generation"
    });
  } catch (e) {
    if (opts.requestId !== void 0 && opts.requestId !== "" && e instanceof DaoyanCliError && e.code === "machine_busy") {
      const existing = findTaskByRequestId(opts.root, opts.requestId);
      if (existing !== null) return { task: existing, deduplicated: true };
    }
    throw e;
  }
  try {
    createTask(opts.root, record);
    appendEvent(taskDir(opts.root, taskId), "queued", {
      kind: record.kind,
      command: record.command
    });
    const entry = process.argv[1];
    if (entry === void 0 || entry === "") {
      throw new DaoyanCliError({
        code: "worker_start_failed",
        message: "\u65E0\u6CD5\u5B9A\u4F4D CLI \u5165\u53E3\uFF08process.argv[1] \u4E3A\u7A7A\uFF09"
      });
    }
    const logFile = workerLogPath(opts.root, taskId);
    ensureDir(join18(opts.root, LOG_DIR));
    const fd = openSync4(logFile, "a");
    const child = spawn6(process.execPath, [entry, "__worker"], {
      cwd: opts.root,
      detached: true,
      stdio: ["ignore", fd, fd],
      env: {
        ...process.env,
        DYCLI_TASK_DIR: taskDir(opts.root, taskId),
        DYCLI_LOCK_TOKEN: lock.record.token
      }
    });
    closeSync4(fd);
    await new Promise((resolvePromise, rejectPromise) => {
      child.once("spawn", () => resolvePromise());
      child.once("error", (e) => rejectPromise(e));
    });
    if (child.pid === void 0) {
      throw new DaoyanCliError({ code: "worker_start_failed", message: "worker \u672A\u83B7\u5F97 pid" });
    }
    lock.handoff(child.pid);
    child.unref();
    const baseline = readTask(opts.root, taskId) ?? record;
    return {
      task: {
        ...baseline,
        worker: { pid: child.pid, started_at: nowIso() },
        next_actions: [
          `status --task ${taskId} --wait`,
          `logs --task ${taskId} -f`,
          `run cancel ${taskId}`
        ]
      },
      deduplicated: false
    };
  } catch (e) {
    const err = e instanceof DaoyanCliError ? e : null;
    try {
      const cur = readTask(opts.root, taskId);
      if (cur !== null && !isTerminalStatus(cur.status)) {
        const rawMessage = err?.message ?? (e instanceof Error ? e.message : String(e));
        finishTask(opts.root, taskId, "failed", {
          code: "worker_start_failed",
          message: rawMessage.split(`${opts.root}/`).join("").split(opts.root).join("")
        });
      }
    } catch {
    }
    lock.release();
    if (err !== null) throw err;
    throw new DaoyanCliError({
      code: "worker_start_failed",
      message: `worker \u542F\u52A8\u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
}
function taskRuns(root, task) {
  const out = [];
  for (const id of task.runs) {
    try {
      const raw = JSON.parse(readFileSync15(join18(root, "runs", id, RUN_FILE), "utf8"));
      out.push(raw);
    } catch {
    }
  }
  return out;
}
async function waitForTask(opts) {
  let interrupted = false;
  const localMachine = loadMachineIfExists(opts.root);
  const off = onSignal(() => {
    interrupted = true;
  });
  const deadline = opts.timeoutMs !== void 0 ? Date.now() + opts.timeoutMs : void 0;
  try {
    for (; ; ) {
      const task = readTask(opts.root, opts.taskId);
      if (task === null) {
        throw new DaoyanCliError({ code: "task_not_found", message: `\u672A\u627E\u5230 task ${opts.taskId}` });
      }
      opts.onTick?.(task);
      if (localMachine !== null && task.machine_id !== localMachine.machine_id) {
        return { task, runs: taskRuns(opts.root, task), interrupted: false, timedOut: false, foreign: true };
      }
      if (isTerminalStatus(task.status)) {
        return { task, runs: taskRuns(opts.root, task), interrupted: false, timedOut: false };
      }
      if (task.status === "running" || task.status === "queued") {
        const lock = inspectMachineLock();
        const lockPid = lock.status === "ok" && lock.record.task_id === task.task_id ? lock.record.pid : null;
        const workerPid = task.worker?.pid ?? lockPid;
        const orphanedQueued = task.status === "queued" && workerPid === null && Date.now() - Date.parse(task.created_at) > 5e3;
        if (workerPid !== null && !pidAlive2(workerPid) || orphanedQueued) {
          if (lock.status === "ok" && lock.record.task_id === task.task_id) {
            await recoverStaleLock(lock.record, lock.path);
          } else {
            finishTask(opts.root, task.task_id, "interrupted", {
              code: "worker_crashed",
              message: workerPid !== null ? `worker\uFF08pid ${workerPid}\uFF09\u5DF2\u9000\u51FA\uFF1B\u4EFB\u52A1\u6807\u8BB0\u4E3A interrupted` : "\u4EFB\u52A1\u672A\u542F\u52A8 worker\uFF1B\u6807\u8BB0\u4E3A interrupted"
            });
          }
          const cur = readTask(opts.root, opts.taskId) ?? task;
          return { task: cur, runs: taskRuns(opts.root, cur), interrupted: false, timedOut: false };
        }
      }
      if (interrupted) {
        return { task, runs: taskRuns(opts.root, task), interrupted: true, timedOut: false };
      }
      if (deadline !== void 0 && Date.now() > deadline) {
        return { task, runs: taskRuns(opts.root, task), interrupted: false, timedOut: true };
      }
      await sleepMs(opts.pollMs ?? 500);
    }
  } finally {
    off();
  }
}
function taskExitCode(task) {
  if (task.status === "succeeded") return 0;
  if (task.status === "cancelled") return 130;
  return 1;
}
async function isWorkerProcess(pid) {
  const r = await tryExecCapture("ps", ["-p", String(pid), "-o", "args="], { timeoutMs: 3e3 });
  return r !== null && r.code === 0 && r.stdout.includes("__worker");
}
async function cancelTask(root, taskId) {
  const task = readTask(root, taskId);
  if (task === null) {
    throw new DaoyanCliError({ code: "task_not_found", message: `\u672A\u627E\u5230 task ${taskId}` });
  }
  if (isTerminalStatus(task.status)) return task;
  const localMachine = loadMachineIfExists(root);
  if (localMachine !== null && task.machine_id !== localMachine.machine_id) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `task ${taskId} \u5C5E\u4E8E\u673A\u5668 ${task.machine_id}\uFF0C\u4E0D\u80FD\u5728\u672C\u673A\u53D6\u6D88`,
      details: { task_machine: task.machine_id, local_machine: localMachine.machine_id },
      hint: `\u5728 ${task.machine_id} \u4E0A\u8FD0\u884C daoyan run cancel ${taskId}\u3002`
    });
  }
  requestCancel(root, taskId);
  const lock = inspectMachineLock();
  const lockPid = lock.status === "ok" && lock.record.task_id === taskId ? lock.record.pid : 0;
  const pid = task.worker?.pid ?? lockPid;
  const reportedWorker = task.worker !== null && task.worker.pid === pid;
  const verified = !reportedWorker || await isWorkerProcess(pid);
  if (pid > 0 && pidAlive2(pid) && verified) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
    }
    const deadline = Date.now() + 15e3;
    while (Date.now() < deadline) {
      const cur2 = readTask(root, taskId);
      if (cur2 !== null && isTerminalStatus(cur2.status)) return cur2;
      await sleep(500);
    }
    return readTask(root, taskId) ?? task;
  }
  if (lock.status === "ok" && lock.record.task_id === taskId) {
    await recoverStaleLock(lock.record, lock.path);
  }
  const cur = readTask(root, taskId);
  if (cur !== null && !isTerminalStatus(cur.status)) {
    return finishTask(root, taskId, "interrupted", {
      code: "worker_crashed",
      message: `worker\uFF08pid ${pid}\uFF09\u5DF2\u9000\u51FA\uFF1B\u4EFB\u52A1\u6807\u8BB0\u4E3A interrupted`
    });
  }
  return cur ?? task;
}
var init_create = __esm({
  "src/core/task/create.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_exec();
    init_signals();
    init_net();
    init_types();
    init_store2();
    init_config();
    init_lock();
    init_store();
    init_events();
    init_worker();
  }
});

// src/core/run/summary.mts
import { existsSync as existsSync20 } from "fs";
import { join as join19 } from "path";
function outputSummaries(root, rec) {
  return rec.outputs.map((o) => {
    const abs = join19(runDir(root, rec.run_id), o.path);
    return {
      name: o.name,
      path: `runs/${rec.run_id}/${o.path}`,
      abs_path: abs,
      sha256: o.sha256,
      bytes: o.bytes,
      present: existsSync20(abs)
    };
  });
}
function runSummary(root, rec) {
  return {
    run_id: rec.run_id,
    task_id: rec.task_id,
    machine_id: rec.machine_id,
    label: rec.label,
    status: rec.status,
    workflow: rec.workflow,
    prompt_id: rec.prompt_id,
    engine: rec.engine,
    ...rec.gpu !== void 0 ? { gpu: rec.gpu } : {},
    started_at: rec.started_at,
    finished_at: rec.finished_at,
    outputs: outputSummaries(root, rec),
    error: rec.error
  };
}
var init_summary = __esm({
  "src/core/run/summary.mts"() {
    "use strict";
    init_store2();
  }
});

// src/commands/run.mts
function parseRunArgs(args) {
  const pos = [];
  const sets = {};
  const out = { workflow: "", sets, wait: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name === "--set") {
      const v = takeValue(args, i, inline, "--set");
      const eq = v.value.indexOf("=");
      if (eq <= 0) usageError(`--set \u9700\u8981 key=value\uFF08\u6536\u5230 ${v.value}\uFF09`);
      sets[v.value.slice(0, eq)] = parseJsonValue(v.value.slice(eq + 1));
      i += v.skip;
      continue;
    }
    if (name === "--label") {
      const v = takeValue(args, i, inline, "--label");
      out.label = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--engine") {
      const v = takeValue(args, i, inline, "--engine");
      if (!isHttpUrl(v.value)) usageError(`--engine \u5FC5\u987B\u662F http(s) URL\uFF08\u6536\u5230 ${v.value}\uFF09`);
      out.engineUrl = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--request-id") {
      const v = takeValue(args, i, inline, "--request-id");
      out.requestId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--wait") {
      out.wait = true;
      continue;
    }
    if (name === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (name === "--timeout") {
      const v = takeValue(args, i, inline, "--timeout");
      const n = Number(v.value);
      if (!Number.isFinite(n) || n <= 0) usageError("--timeout \u9700\u8981\u6B63\u6570\uFF08\u5C0F\u65F6\uFF09");
      out.timeoutHours = n;
      i += v.skip;
      continue;
    }
    if (name.startsWith("-")) usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
    pos.push(name);
  }
  if (pos.length === 0) usageError("\u7F3A\u5C11 workflow\uFF1Adaoyan run <workflow.json|name>");
  if (pos.length > 1) usageError(`run \u53EA\u63A5\u53D7\u4E00\u4E2A workflow\uFF08\u6536\u5230 ${pos.join(" ")}\uFF09`);
  out.workflow = pos[0];
  return out;
}
function runWaitData(root, task, runs, extra = {}) {
  return {
    ...taskSummary(task),
    state: task.status,
    runs_detail: runs.map((r) => runSummary(root, r)),
    ...extra
  };
}
async function runRun(ctx2, args) {
  if (args[0] === "cancel") return runCancel(ctx2, args.slice(1));
  const flags = parseRunArgs(args);
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachine(root);
  if (flags.dryRun) {
    const plan = planSingleRun({
      root,
      project,
      machine,
      workflowRef: flags.workflow,
      sets: flags.sets,
      ...flags.label !== void 0 ? { label: flags.label } : {}
    });
    const ref = resolveWorkflowRef(root, flags.workflow);
    const data2 = {
      mode: flags.engineUrl !== void 0 ? "remote" : machine.engine.mode,
      workflow: ref.rel,
      graph_sha256: graphSha256(plan.graph),
      inputs: plan.inputs,
      overrides: plan.overrides,
      uploads: plan.uploads.map((u) => ({ logical: u.logical, desired_name: u.desiredName })),
      gpu_takeover: machine.engine.mode === "local" && project.gpu?.takeover === true && flags.engineUrl === void 0,
      engine: flags.engineUrl !== void 0 ? { mode: "remote", url: flags.engineUrl } : machine.engine.mode === "local" ? { mode: "local", port: machine.engine.port } : { mode: "remote", url: machine.engine.url },
      warnings: plan.warnings
    };
    if (ctx2.json) {
      emitData(data2);
      return 0;
    }
    say(`dry-run\uFF1A${ref.rel}\uFF08${data2.mode}\uFF0C${data2.graph_sha256.slice(0, 12)}\u2026\uFF09`);
    say(`inputs\uFF1A${JSON.stringify(plan.inputs)}`);
    return 0;
  }
  const created = await createAndStartTask({
    root,
    project,
    machine,
    kind: "run",
    command: `run ${flags.workflow}`,
    ...flags.requestId !== void 0 ? { requestId: flags.requestId } : {},
    options: {
      workflow: flags.workflow,
      sets: flags.sets,
      ...flags.label !== void 0 ? { label: flags.label } : {},
      ...flags.timeoutHours !== void 0 ? { timeout_ms: Math.round(flags.timeoutHours * 36e5) } : {},
      ...flags.engineUrl !== void 0 ? { engine_url: flags.engineUrl } : {}
    }
  });
  if (!flags.wait) {
    const data2 = {
      ...taskSummary(created.task),
      state: created.task.status,
      deduplicated: created.deduplicated
    };
    if (ctx2.json) {
      emitData(data2);
      return 0;
    }
    say(`task ${created.task.task_id} \u5DF2\u521B\u5EFA\uFF08${created.task.status}\uFF09`);
    say(`\u67E5\u770B\uFF1Adaoyan status --task ${created.task.task_id} --wait`);
    say(`\u53D6\u6D88\uFF1Adaoyan run cancel ${created.task.task_id}`);
    return 0;
  }
  let lastStatus = "";
  const waited = await waitForTask({
    root,
    taskId: created.task.task_id,
    onTick: (task) => {
      if (task.status !== lastStatus) {
        lastStatus = task.status;
        if (!ctx2.json) say(`task ${task.task_id}\uFF1A${task.status}`);
      }
    }
  });
  const data = runWaitData(root, waited.task, waited.runs, {
    interrupted: waited.interrupted,
    timed_out: waited.timedOut,
    foreign: waited.foreign === true,
    deduplicated: created.deduplicated
  });
  if (ctx2.json) {
    emitData(data);
  } else if (waited.foreign === true) {
    say(`task ${waited.task.task_id} \u5C5E\u4E8E\u673A\u5668 ${waited.task.machine_id}\uFF1B\u672C\u673A\u53EA\u8FD4\u56DE\u5FEB\u7167\uFF0C\u4E0D\u7B49\u5F85`);
  } else if (waited.interrupted) {
    say(`\u5DF2\u505C\u6B62\u7B49\u5F85\uFF1Btask ${waited.task.task_id} \u4ECD\u5728\u8FD0\u884C\uFF08\u53D6\u6D88\u7528 daoyan run cancel ${waited.task.task_id}\uFF09`);
  } else if (waited.timedOut) {
    say(`\u7B49\u5F85\u8D85\u65F6\uFF1Btask ${waited.task.task_id} \u5F53\u524D\u72B6\u6001 ${waited.task.status}`);
  } else {
    say(`task ${waited.task.task_id}\uFF1A${waited.task.status}`);
    for (const r of waited.runs) {
      for (const o of r.outputs) say(`  ${r.run_id} \u2192 runs/${r.run_id}/${o.path}`);
    }
    if (waited.task.error !== null) say(`\u9519\u8BEF\uFF1A${waited.task.error.code} ${waited.task.error.message}`);
  }
  if (waited.foreign === true) return 0;
  if (waited.interrupted) return 130;
  if (waited.timedOut) return 0;
  return taskExitCode(waited.task);
}
async function runCancel(ctx2, args) {
  const taskId = args[0];
  if (taskId === void 0 || taskId === "" || taskId.startsWith("-")) {
    usageError("\u7528\u6CD5\uFF1Adaoyan run cancel <task_id>");
  }
  const { root } = requireProject(ctx2);
  const task = await cancelTask(root, taskId);
  const runs = taskRuns(root, task);
  if (ctx2.json) {
    emitData({
      ...runWaitData(root, task, runs),
      cancel_requested: true
    });
  } else {
    say(`task ${task.task_id}\uFF1A${task.status}`);
    if (task.status === "running" || task.status === "queued") {
      say("\u53D6\u6D88\u8BF7\u6C42\u5DF2\u53D1\u9001\uFF1B\u67E5\u770B\uFF1Adaoyan status --task " + task.task_id);
    }
  }
  return 0;
}
async function enqueueRunTask(opts) {
  const created = await createAndStartTask({
    root: opts.root,
    project: opts.project,
    machine: opts.machine,
    kind: opts.kind,
    command: opts.command,
    ...opts.requestId !== void 0 ? { requestId: opts.requestId } : {},
    options: opts.options
  });
  if (!opts.wait) {
    const data2 = {
      ...taskSummary(created.task),
      state: created.task.status,
      deduplicated: created.deduplicated
    };
    if (opts.ctx.json) {
      emitData(data2);
      return 0;
    }
    say(`task ${created.task.task_id} \u5DF2\u521B\u5EFA\uFF08${created.task.status}\uFF09`);
    say(`\u67E5\u770B\uFF1Adaoyan status --task ${created.task.task_id} --wait`);
    return 0;
  }
  let lastStatus = "";
  const waited = await waitForTask({
    root: opts.root,
    taskId: created.task.task_id,
    onTick: (task) => {
      if (task.status !== lastStatus) {
        lastStatus = task.status;
        if (!opts.ctx.json) say(`task ${task.task_id}\uFF1A${task.status}`);
      }
    }
  });
  const data = runWaitData(opts.root, waited.task, waited.runs, {
    interrupted: waited.interrupted,
    timed_out: waited.timedOut,
    foreign: waited.foreign === true,
    deduplicated: created.deduplicated
  });
  if (opts.ctx.json) emitData(data);
  else if (waited.foreign === true) {
    say(`task ${waited.task.task_id} \u5C5E\u4E8E\u673A\u5668 ${waited.task.machine_id}\uFF1B\u672C\u673A\u53EA\u8FD4\u56DE\u5FEB\u7167`);
  } else if (!waited.interrupted) {
    say(`task ${waited.task.task_id}\uFF1A${waited.task.status}`);
    if (waited.task.error !== null) say(`\u9519\u8BEF\uFF1A${waited.task.error.code} ${waited.task.error.message}`);
  }
  if (waited.foreign === true) return 0;
  if (waited.interrupted) return 130;
  return taskExitCode(waited.task);
}
var init_run = __esm({
  "src/commands/run.mts"() {
    "use strict";
    init_json();
    init_log();
    init_args();
    init_fs();
    init_config();
    init_plans();
    init_create();
    init_store();
    init_summary();
    init_graph();
  }
});

// src/commands/shot.mts
function parseShotArgs(args, presetForce) {
  const out = { ids: [], wait: false, force: presetForce };
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name === "--steps") {
      const v = takeValue(args, i, inline, "--steps");
      out.steps = Number(v.value);
      if (!Number.isInteger(out.steps) || out.steps <= 0) usageError("--steps \u9700\u8981\u6B63\u6574\u6570");
      i += v.skip;
      continue;
    }
    if (name === "--timeout") {
      const v = takeValue(args, i, inline, "--timeout");
      out.timeoutHours = Number(v.value);
      if (!Number.isFinite(out.timeoutHours) || out.timeoutHours <= 0) usageError("--timeout \u9700\u8981\u6B63\u6570\uFF08\u5C0F\u65F6\uFF09");
      i += v.skip;
      continue;
    }
    if (name === "--request-id") {
      const v = takeValue(args, i, inline, "--request-id");
      out.requestId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--wait") {
      out.wait = true;
      continue;
    }
    if (name === "--force") {
      out.force = true;
      continue;
    }
    if (name === "--no-evict" || name === "--no-up") {
      usageError(`${name} \u5DF2\u5220\u9664\uFF1A\u5F15\u64CE\u751F\u547D\u5468\u671F\u7531 task worker \u7BA1\u7406\uFF0CGPU \u63A5\u7BA1\u7531 project.json \u7684 gpu.takeover \u63A7\u5236`);
    }
    if (name.startsWith("-")) usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
    out.ids.push(name);
  }
  if (out.ids.length === 0) usageError("\u7F3A\u5C11\u955C\u53F7\uFF0C\u5982 daoyan shot 01 02");
  return out;
}
async function runShot(ctx2, args, presetForce = false) {
  const flags = parseShotArgs(args, presetForce);
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachine(root);
  const shots = loadShotsFile(root);
  for (const id of flags.ids) {
    if (!shots.shots.some((s) => s.id === id)) {
      throw new DaoyanCliError({
        code: "usage",
        message: `\u672A\u77E5\u955C\u53F7 ${id}\uFF1B\u53EF\u7528\uFF1A${shots.shots.map((s) => s.id).join(" ")}`,
        exit: 2
      });
    }
  }
  return enqueueRunTask({
    ctx: ctx2,
    root,
    project,
    machine,
    command: `${presetForce ? "retake" : "shot"} ${flags.ids.join(" ")}`,
    kind: presetForce ? "retake" : "shot",
    ...flags.requestId !== void 0 ? { requestId: flags.requestId } : {},
    options: {
      shots: flags.ids,
      force: flags.force,
      ...flags.steps !== void 0 ? { steps: flags.steps } : {},
      ...flags.timeoutHours !== void 0 ? { timeout_ms: Math.round(flags.timeoutHours * 36e5) } : {}
    },
    wait: flags.wait
  });
}
async function runBatch(ctx2, args) {
  let timeoutHours;
  let requestId;
  let wait = false;
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name === "--timeout") {
      const v = takeValue(args, i, inline, "--timeout");
      timeoutHours = Number(v.value);
      if (!Number.isFinite(timeoutHours) || timeoutHours <= 0) usageError("--timeout \u9700\u8981\u6B63\u6570\uFF08\u5C0F\u65F6\uFF09");
      i += v.skip;
      continue;
    }
    if (name === "--request-id") {
      const v = takeValue(args, i, inline, "--request-id");
      requestId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--wait") {
      wait = true;
      continue;
    }
    if (name === "--no-evict" || name === "--no-up") {
      usageError(`${name} \u5DF2\u5220\u9664\uFF1A\u751F\u547D\u5468\u671F\u7531 worker \u7BA1\u7406`);
    }
    usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
  }
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachine(root);
  const shots = loadShotsFile(root);
  if (shots.shots.length === 0) throw new DaoyanCliError({ code: "config_invalid", message: "shots.json \u6CA1\u6709\u955C\u5934" });
  return enqueueRunTask({
    ctx: ctx2,
    root,
    project,
    machine,
    command: "batch",
    kind: "batch",
    ...requestId !== void 0 ? { requestId } : {},
    options: {
      force: false,
      ...timeoutHours !== void 0 ? { timeout_ms: Math.round(timeoutHours * 36e5) } : {}
    },
    wait
  });
}
var init_shot = __esm({
  "src/commands/shot.mts"() {
    "use strict";
    init_errors();
    init_args();
    init_config();
    init_run();
  }
});

// src/commands/wrap.mts
import { existsSync as existsSync21, mkdirSync as mkdirSync4, writeFileSync as writeFileSync6 } from "fs";
import { join as join20 } from "path";
function pickVideoAt(root, rec) {
  const chosen = rec.outputs.find((o) => /\.(mp4|webm|mkv|mov|gif)$/i.test(o.name)) ?? rec.outputs[0];
  if (chosen === void 0) return null;
  return { path: chosen.path, abs: runOutputAbs(root, rec, chosen) };
}
async function runWrap(ctx2, args) {
  const explicit = /* @__PURE__ */ new Map();
  for (let i = 0; i < args.length; i++) {
    const { name, inline } = splitInlineFlag(args[i] ?? "");
    if (name === "--select") {
      const v = takeValue(args, i, inline, "--select");
      const eq = v.value.indexOf("=");
      if (eq <= 0) usageError(`--select \u9700\u8981 <\u955C\u53F7>=<run_id>\uFF08\u6536\u5230 ${v.value}\uFF09`);
      explicit.set(v.value.slice(0, eq), v.value.slice(eq + 1));
      i += v.skip;
      continue;
    }
    usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
  }
  const { root } = requireProject(ctx2);
  const shots = loadShotsFile(root);
  const clips = [];
  const missing = [];
  for (const shot of shots.shots) {
    const explicitId = explicit.get(shot.id);
    let rec;
    if (explicitId !== void 0) {
      rec = requireRun(root, explicitId);
      if (rec.status !== "succeeded") {
        throw new DaoyanCliError({
          code: "wrap_failed",
          message: `--select ${shot.id}=${explicitId} \u7684 run \u4E0D\u662F succeeded\uFF08${rec.status}\uFF09`
        });
      }
    } else {
      rec = latestSucceededRun(root, `shot:${shot.id}`);
    }
    if (rec === null) {
      missing.push(shot.id);
      continue;
    }
    const pick = pickVideoAt(root, rec);
    if (pick === null || !existsSync21(pick.abs)) {
      missing.push(shot.id);
      continue;
    }
    clips.push({ shot: shot.id, run_id: rec.run_id, artifact: pick.path, abs: pick.abs });
  }
  if (clips.length < 2) {
    throw new DaoyanCliError({
      code: "wrap_failed",
      message: `\u53EF\u7528\u4E8E\u5408\u7247\u7684\u955C\u5934\u4E0D\u8DB3 2 \u6BB5\uFF08\u5F53\u524D ${clips.length}/${shots.shots.length}\uFF1B\u7F3A ${missing.join(" ") || "\u65E0"}\uFF09`,
      details: { clips, missing }
    });
  }
  const finalDir = join20(root, FINAL_DIR);
  mkdirSync4(finalDir, { recursive: true });
  const ts2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.(\d{3})Z$/, "$1");
  const outName = `cut-${ts2}.mp4`;
  const outPath = join20(finalDir, outName);
  const manifestName = `cut-${ts2}.json`;
  const manifestPath = join20(finalDir, manifestName);
  const listFile = join20(root, CONCAT_LIST_FILE);
  writeFileSync6(
    listFile,
    clips.map((c) => `file '${c.abs.replace(/'/g, "'\\''")}'`).join("\n") + "\n"
  );
  say(`\u5408\u7247 ${clips.length} \u6BB5 \u2192 final/${outName}\uFF08libx264 / crf18 / faststart\uFF09...`);
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
      message: `ffmpeg \u9000\u51FA\u7801 ${r.code}\uFF1A${r.stderr.slice(-500)}`,
      details: { clips }
    });
  }
  const manifest = {
    cut: outName,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    clips: clips.map((c) => ({
      shot: c.shot,
      run_id: c.run_id,
      artifact: c.artifact
    })),
    missing,
    ffmpeg: { codec: "libx264", crf: 18, pix_fmt: "yuv420p", faststart: true }
  };
  writeFileSync6(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  const data = {
    output: `${FINAL_DIR}/${outName}`,
    abs_path: outPath,
    manifest: `${FINAL_DIR}/${manifestName}`,
    sha256: sha256File(outPath),
    clips: clips.map((c) => ({ shot: c.shot, run_id: c.run_id, artifact: c.artifact })),
    missing
  };
  if (ctx2.json) {
    emitData(data);
    return 0;
  }
  if (missing.length > 0) say(`\u6CE8\u610F\uFF1A${missing.length} \u955C\u672A\u5B8C\u6210\u672A\u7EB3\u5165\uFF08${missing.join(" ")}\uFF09`);
  say(`\u5408\u7247\u5B8C\u6210\uFF1Afinal/${outName}`);
  say(`\u6E05\u5355\uFF1Afinal/${manifestName}`);
  return 0;
}
var init_wrap = __esm({
  "src/commands/wrap.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_args();
    init_fs();
    init_exec();
    init_config();
    init_types();
    init_store2();
  }
});

// src/commands/logs.mts
import { closeSync as closeSync5, existsSync as existsSync22, openSync as openSync5, readSync as readSync3, readdirSync as readdirSync6, statSync as statSync5 } from "fs";
import { join as join21 } from "path";
function parseArgs2(args) {
  const out = { follow: false, n: 100, src: "all" };
  for (let i = 0; i < args.length; i++) {
    const { name, inline } = splitInlineFlag(args[i] ?? "");
    if (name === "-f" || name === "--follow") {
      out.follow = true;
      continue;
    }
    if (name === "-n") {
      const v = takeValue(args, i, inline, "-n");
      if (!/^\d+$/.test(v.value)) usageError("-n \u9700\u8981\u884C\u6570");
      out.n = Number(v.value);
      i += v.skip;
      continue;
    }
    if (name === "--task") {
      const v = takeValue(args, i, inline, "--task");
      out.taskId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--run") {
      const v = takeValue(args, i, inline, "--run");
      out.runId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--src") {
      const v = takeValue(args, i, inline, "--src");
      if (v.value !== "daoyan-cli" && v.value !== "engine" && v.value !== "worker" && v.value !== "all") {
        usageError(`--src \u4EC5\u63A5\u53D7 daoyan-cli|engine|worker|all\uFF08\u6536\u5230 ${v.value}\uFF09`);
      }
      out.src = v.value;
      i += v.skip;
      continue;
    }
    usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
  }
  if (out.taskId !== void 0 && out.runId !== void 0) usageError("--task \u4E0E --run \u53EA\u80FD\u4E8C\u9009\u4E00");
  return out;
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
  if (!existsSync22(file)) return [];
  let size = 0;
  try {
    size = statSync5(file).size;
  } catch {
    return [];
  }
  const window = Math.min(size, n * 400 + 65536);
  const buf = Buffer.alloc(window);
  try {
    const fd = openSync5(file, "r");
    readSync3(fd, buf, 0, window, size - window);
    closeSync5(fd);
  } catch {
    return [];
  }
  return cleanLines(buf.toString("utf8").replace(/\ufffd/g, "")).slice(-n);
}
function fileSources(root, src) {
  const dir = join21(root, LOG_DIR);
  const engines = existsSync22(dir) ? readdirSync6(dir).filter((f) => /^engine-.*\.log$/.test(f)).sort().reverse() : [];
  const workers = existsSync22(dir) ? readdirSync6(dir).filter((f) => /^worker-.*\.log$/.test(f)).sort().reverse() : [];
  const all = [
    ...workers[0] !== void 0 ? [{ name: "worker", file: join21(dir, workers[0]) }] : [],
    ...engines[0] !== void 0 ? [{ name: "engine", file: join21(dir, engines[0]) }] : [],
    { name: "daoyan-cli", file: join21(dir, "daoyan-cli.log") }
  ];
  if (src === "all") return all;
  return all.filter((s) => s.name === src);
}
function renderEvent(ev) {
  return `[${ev.ts}] ${ev.type} ${JSON.stringify(ev.data)}`;
}
function printEvents(ctx2, events, stream) {
  if (ctx2.json) {
    if (stream) {
      for (const ev of events) {
        process.stdout.write(
          JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data: { event: ev } }) + "\n"
        );
      }
    } else {
      emitData({ events });
    }
    return;
  }
  for (const ev of events) process.stdout.write(renderEvent(ev) + "\n");
}
async function taskEvents(ctx2, root, taskId, flags) {
  const task = readTask(root, taskId);
  if (task === null) {
    throw new DaoyanCliError({ code: "task_not_found", message: `\u672A\u627E\u5230 task ${taskId}` });
  }
  const dir = taskDir(root, taskId);
  const localMachine = loadMachineIfExists(root);
  const foreign = localMachine !== null && task.machine_id !== localMachine.machine_id;
  let events = readEvents(dir);
  if (flags.runId !== void 0) {
    events = events.filter((e) => e.data.run_id === flags.runId);
  }
  events = events.slice(-flags.n);
  if (!flags.follow || foreign) {
    if (ctx2.json) emitData({ task_id: taskId, events, foreign });
    else {
      for (const ev of events) process.stdout.write(renderEvent(ev) + "\n");
      if (events.length === 0) process.stdout.write("\uFF08\u6682\u65E0\u4E8B\u4EF6\uFF09\n");
      if (foreign) process.stdout.write(`\uFF08task \u5C5E\u4E8E\u673A\u5668 ${task.machine_id}\uFF1B\u672C\u673A\u4E0D\u8DDF\u968F\uFF09
`);
    }
    return 0;
  }
  printEvents(ctx2, events, true);
  let seen = events.length > 0 ? events[events.length - 1]?.seq ?? 0 : 0;
  let stop = false;
  const off = onSignal(() => {
    stop = true;
  });
  try {
    for (; ; ) {
      await new Promise((r) => setTimeout(r, 500));
      const next = readEvents(dir, seen);
      if (next.length > 0) {
        printEvents(ctx2, next, true);
        seen = next[next.length - 1]?.seq ?? seen;
      }
      const cur = readTask(root, taskId);
      if (cur !== null && isTerminalStatus(cur.status)) {
        const tail = readEvents(dir, seen);
        if (tail.length > 0) printEvents(ctx2, tail, true);
        if (!ctx2.json) process.stdout.write(`\uFF08task ${taskId} ${cur.status}\uFF09
`);
        return 0;
      }
      if (stop) return 130;
    }
  } finally {
    off();
  }
}
async function runLogs(ctx2, args) {
  const flags = parseArgs2(args);
  const { root } = requireProject(ctx2);
  if (flags.taskId !== void 0) {
    return taskEvents(ctx2, root, flags.taskId, flags);
  }
  if (flags.runId !== void 0) {
    const run2 = readRun(root, flags.runId);
    const taskId = run2?.task_id ?? listTasks(root).find((t) => t.runs.includes(flags.runId))?.task_id;
    if (taskId === void 0) {
      throw new DaoyanCliError({
        code: "run_not_found",
        message: `\u672A\u627E\u5230 run ${flags.runId} \u7684\u6240\u5C5E task`
      });
    }
    return taskEvents(ctx2, root, taskId, flags);
  }
  const sources = fileSources(root, flags.src);
  const existing = sources.filter((s) => existsSync22(s.file));
  if (existing.length === 0) {
    if (ctx2.json) {
      emitData({ sources: {}, note: "\u6682\u65E0\u65E5\u5FD7\u6587\u4EF6\uFF1B\u8FD0\u884C\u4EFB\u52A1\u540E\u53EF\u7528 logs --task <id>" });
      return 0;
    }
    process.stdout.write("\u6682\u65E0\u65E5\u5FD7\u6587\u4EF6\u3002\u8FD0\u884C\u4EFB\u52A1\u540E\u53EF\u7528\uFF1Adaoyan logs --task <task_id>\n");
    return 0;
  }
  if (!flags.follow) {
    const data = {};
    for (const s of existing) {
      const lines = readTail(s.file, flags.n);
      data[s.name] = lines;
      if (!ctx2.json) for (const l of lines) process.stdout.write(`${l}
`);
    }
    if (ctx2.json) emitData({ sources: data });
    return 0;
  }
  const offsets = /* @__PURE__ */ new Map();
  for (const s of existing) {
    for (const l of readTail(s.file, flags.n)) process.stdout.write(`${l}
`);
    offsets.set(s.file, statSync5(s.file).size);
  }
  let stop = false;
  const off = onSignal(() => {
    stop = true;
  });
  try {
    while (!stop) {
      await new Promise((r) => setTimeout(r, 500));
      for (const s of existing) {
        if (!existsSync22(s.file)) continue;
        let size = 0;
        try {
          size = statSync5(s.file).size;
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
          const fd = openSync5(s.file, "r");
          readSync3(fd, chunk, 0, size - prev, prev);
          closeSync5(fd);
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
    return 130;
  } finally {
    off();
  }
}
var ANSI_RE, TQDM_RE;
var init_logs = __esm({
  "src/commands/logs.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_args();
    init_config();
    init_types();
    init_store();
    init_events();
    init_store();
    init_store2();
    init_store();
    init_signals();
    ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
    TQDM_RE = /^\s*\d+%.{0,40}\|\s*(\d+)\/(\d+) \[/;
  }
});

// src/commands/status.mts
import { existsSync as existsSync23 } from "fs";
import { join as join22 } from "path";
function parseArgs3(args) {
  const out = { wait: false };
  for (let i = 0; i < args.length; i++) {
    const { name, inline } = splitInlineFlag(args[i] ?? "");
    if (name === "--task") {
      const v = takeValue(args, i, inline, "--task");
      out.taskId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--run") {
      const v = takeValue(args, i, inline, "--run");
      out.runId = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--wait") {
      out.wait = true;
      continue;
    }
    if (name === "--timeout") {
      const v = takeValue(args, i, inline, "--timeout");
      out.timeoutSec = Number(v.value);
      if (!Number.isFinite(out.timeoutSec) || out.timeoutSec <= 0) usageError("--timeout \u9700\u8981\u6B63\u6570\uFF08\u79D2\uFF09");
      i += v.skip;
      continue;
    }
    usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
  }
  if (out.taskId !== void 0 && out.runId !== void 0) usageError("--task \u4E0E --run \u53EA\u80FD\u4E8C\u9009\u4E00");
  return out;
}
async function probeEngine(root, machine) {
  if (machine.engine.mode === "remote") {
    const url2 = machine.engine.url;
    const up2 = await probeComfy(url2, 3e3);
    const queue2 = up2 ? await safeQueue(new ComfyClient(url2)) : null;
    return { mode: "remote", url: url2, up: up2, pid: null, queue: queue2 };
  }
  const pidRec = readEnginePid(root);
  const pid = pidRec !== null && pidAlive(pidRec.pid) ? pidRec.pid : null;
  const url = `http://127.0.0.1:${machine.engine.port}`;
  const up = await probeComfy(url, 3e3);
  const queue = up ? await safeQueue(new ComfyClient(url)) : null;
  return {
    mode: "local",
    url,
    up,
    pid,
    queue,
    log: pid !== null ? `logs/engine-${pidRec?.task_id ?? "*"}.log` : null
  };
}
async function safeQueue(client) {
  try {
    const q = await client.queue();
    return { running: q.queue_running.length, pending: q.queue_pending.length };
  } catch {
    return null;
  }
}
function shotProgress(root, shots) {
  if (shots === null) return [];
  return shots.shots.map((s) => {
    const rec = latestSucceededRun(root, `shot:${s.id}`);
    const present = rec !== null && rec.outputs.some((o) => existsSync23(join22(root, RUNS_DIR, rec.run_id, o.path)));
    return {
      id: s.id,
      slug: s.slug ?? null,
      done: rec !== null,
      latest_run: rec?.run_id ?? null,
      artifact_present: present
    };
  });
}
async function snapshot(root, project, machine, shots) {
  const engine = await probeEngine(root, machine);
  const lock = inspectMachineLock();
  const tasks = listTasks(root);
  const active = tasks.filter(
    (t) => !isTerminalStatus(t.status) && t.machine_id === machine.machine_id
  );
  const synced = tasks.filter(
    (t) => !isTerminalStatus(t.status) && t.machine_id !== machine.machine_id
  );
  const gpu = await gpuSnapshot();
  const lease = inspectLease();
  const { COMMANDS: COMMANDS2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
  const skill = skillState(root, VERSION, COMMANDS2);
  const shot = shotProgress(root, shots);
  return {
    project: { name: project.name, version: project.version },
    mode: machine.engine.mode,
    machine_id: machine.machine_id,
    machine: {
      id: machine.machine_id,
      engine: machine.engine.mode === "local" ? {
        mode: "local",
        port: machine.engine.port,
        modelpath: machine.engine.modelpath ?? null,
        models_config: machine.engine.models_config ?? null,
        launch_extra: machine.engine.launch_extra ?? [],
        comfyui_version: machine.engine.comfyui_version ?? null,
        comfyui_dir: machine.engine.comfyui_dir ?? "engine/ComfyUI",
        venv_dir: machine.engine.venv_dir ?? "engine/.venv"
      } : {
        mode: "remote",
        url: machine.engine.url,
        free_after_task: machine.engine.free_after_task ?? "when_idle"
      },
      override_workflows: Object.keys(machine.overrides ?? {})
    },
    engine,
    machine_lock: lock.status === "ok" ? {
      status: pidAlive(lock.record.pid) ? "held" : "stale",
      owner_alive: pidAlive(lock.record.pid),
      owner: {
        task_id: lock.record.task_id,
        pid: lock.record.pid,
        mode: lock.record.mode,
        command: lock.record.command,
        kind: lock.record.kind,
        started_at: lock.record.started_at
      }
    } : { status: lock.status },
    active_task: active[0] !== void 0 ? taskSummary(active[0]) : null,
    active_tasks: active.map(taskSummary),
    synced_running_tasks: synced.map(taskSummary),
    recent_tasks: tasks.slice(0, 10).map(taskSummary),
    gpu: {
      supported: gpu.supported,
      ...gpu.reason !== void 0 ? { reason: gpu.reason } : {},
      devices: gpu.devices,
      lease: lease.status === "ok" ? {
        status: "held",
        task_id: lease.lease.task_id,
        entries: lease.lease.entries.length,
        created_at: lease.lease.created_at
      } : { status: lease.status }
    },
    skill: {
      present: skill.present,
      version: skill.version,
      generated_at: skill.generated_at,
      stale: skill.stale,
      path: skill.path
    },
    shots: shot,
    next_actions: active.length > 0 ? [`status --task ${active[0]?.task_id} --wait`, `run cancel ${active[0]?.task_id}`] : ["workflow nodes --refresh --json", "run <workflow> --json"]
  };
}
async function runStatus(ctx2, args) {
  const flags = parseArgs3(args);
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachine(root);
  const shots = loadShotsIfExists(root);
  if (flags.taskId !== void 0) {
    let task = readTask(root, flags.taskId);
    if (task === null) {
      throw new DaoyanCliError({ code: "task_not_found", message: `\u672A\u627E\u5230 task ${flags.taskId}` });
    }
    let interrupted = false;
    let timedOut = false;
    let foreign = false;
    if (flags.wait && !isTerminalStatus(task.status)) {
      const waited = await waitForTask({
        root,
        taskId: flags.taskId,
        ...flags.timeoutSec !== void 0 ? { timeoutMs: flags.timeoutSec * 1e3 } : {}
      });
      task = waited.task;
      interrupted = waited.interrupted;
      timedOut = waited.timedOut;
      foreign = waited.foreign === true;
    }
    const runs = taskRuns(root, task);
    const events = readEvents(taskDir(root, task.task_id)).slice(-20);
    const data2 = {
      ...taskSummary(task),
      state: task.status,
      options: task.options,
      runs_detail: runs.map((r) => runSummary(root, r)),
      events,
      interrupted,
      timed_out: timedOut,
      foreign
    };
    if (ctx2.json) {
      emitData(data2);
    } else {
      say(`task ${task.task_id} \xB7 ${task.kind} \xB7 ${task.status}\uFF08${task.mode}\uFF0Cmachine ${task.machine_id}\uFF09`);
      if (task.error !== null) say(`\u9519\u8BEF\uFF1A${task.error.code} ${task.error.message}`);
      for (const r of runs) {
        say(`  ${r.run_id} ${r.label ?? ""} ${r.status}`);
        for (const o of r.outputs) say(`    \u2192 runs/${r.run_id}/${o.path}`);
      }
      for (const e of events) say(`  [${e.ts}] ${e.type} ${JSON.stringify(e.data)}`);
      if (foreign) say(`task \u5C5E\u4E8E\u673A\u5668 ${task.machine_id}\uFF1B\u672C\u673A\u53EA\u8FD4\u56DE\u5FEB\u7167`);
      else if (interrupted) say("\u5DF2\u505C\u6B62\u7B49\u5F85\uFF1Btask \u4ECD\u5728\u8FD0\u884C\uFF08run cancel \u624D\u4F1A\u53D6\u6D88\uFF09");
    }
    if (foreign) return 0;
    if (interrupted) return 130;
    if (timedOut) return 0;
    return flags.wait ? taskExitCode(task) : 0;
  }
  if (flags.runId !== void 0) {
    let run2 = readRun(root, flags.runId);
    if (run2 === null) {
      const owner = listTasks(root).find((t) => t.runs.includes(flags.runId));
      if (owner === void 0 || !flags.wait) {
        throw new DaoyanCliError({ code: "run_not_found", message: `\u672A\u627E\u5230 run ${flags.runId}` });
      }
      const waited = await waitForTask({
        root,
        taskId: owner.task_id,
        ...flags.timeoutSec !== void 0 ? { timeoutMs: flags.timeoutSec * 1e3 } : {}
      });
      run2 = readRun(root, flags.runId);
      if (run2 === null) {
        throw new DaoyanCliError({
          code: "run_not_found",
          message: `task ${waited.task.task_id} \u5DF2\u7ED3\u675F\uFF08${waited.task.status}\uFF09\uFF0C\u4F46\u6CA1\u6709 run ${flags.runId}`,
          details: { task: taskSummary(waited.task) }
        });
      }
    }
    const data2 = runSummary(root, run2);
    if (ctx2.json) emitData(data2);
    else {
      say(`run ${run2.run_id} \xB7 ${run2.label ?? ""} \xB7 ${run2.status}`);
      say(`workflow\uFF1A${run2.workflow.path}\uFF08${run2.workflow.sha256.slice(0, 12)}\u2026\uFF09`);
      for (const o of run2.outputs) say(`  \u2192 runs/${run2.run_id}/${o.path}`);
      if (run2.error !== null) say(`\u9519\u8BEF\uFF1A${run2.error.code} ${run2.error.message}`);
      if (run2.engine.cleanup !== null) say(`cleanup\uFF1A${JSON.stringify(run2.engine.cleanup)}`);
    }
    return flags.wait ? run2.status === "succeeded" ? 0 : 1 : 0;
  }
  const data = await snapshot(root, project, machine, shots);
  if (ctx2.json) {
    emitData(data);
    return 0;
  }
  say(`\u9879\u76EE ${project.name} \xB7 ${machine.engine.mode} \u6A21\u5F0F \xB7 machine ${machine.machine_id}`);
  const eng = data.engine;
  say(
    `\u5F15\u64CE\uFF1A${eng.up === true ? "\u53EF\u8FBE" : "\u4E0D\u53EF\u8FBE"}\uFF08${String(eng.url)}${eng.pid !== null ? `\uFF0Cpid ${String(eng.pid)}` : ""}\uFF09`
  );
  const q = eng.queue;
  if (q !== null) say(`\u961F\u5217\uFF1A\u6267\u884C\u4E2D ${q.running} / \u7B49\u5F85 ${q.pending}`);
  const lockData = data.machine_lock;
  if (lockData.status === "held") {
    const owner = lockData.owner;
    say(`\u673A\u5668\u9501\uFF1A${String(owner.command)}\uFF08task ${String(owner.task_id)}\uFF0Cpid ${String(owner.pid)}\uFF09`);
  } else if (lockData.status === "stale") {
    say("\u673A\u5668\u9501\uFF1A\u9648\u65E7\uFF08owner \u5DF2\u9000\u51FA\uFF0C\u4E0B\u4E00\u6B21\u4EFB\u52A1\u4F1A\u56DE\u6536\uFF09");
  } else {
    say(`\u673A\u5668\u9501\uFF1A${lockData.status === "corrupt" ? "\u635F\u574F" : "\u7A7A\u95F2"}`);
  }
  const activeTask = data.active_task;
  say(activeTask === null ? "\u672C\u673A\u4EFB\u52A1\uFF1A\u7A7A\u95F2" : `\u672C\u673A\u4EFB\u52A1\uFF1A${String(activeTask.command)}\uFF08${String(activeTask.status)}\uFF09`);
  const synced = data.synced_running_tasks;
  if (synced.length > 0) say(`\u5176\u4ED6\u673A\u5668\u4EFB\u52A1\uFF08Git \u540C\u6B65\uFF09\uFF1A${synced.length} \u4E2A\u8FD0\u884C\u4E2D`);
  const gpu = data.gpu;
  const devices = gpu.devices;
  if (gpu.supported === true && devices[0] !== void 0) {
    say(`GPU\uFF1A${devices[0].usedMb}MiB / ${devices[0].totalMb}MiB`);
  } else {
    say(`GPU\uFF1A${String(gpu.reason ?? "\u4E0D\u53EF\u7528")}`);
  }
  const skill = data.skill;
  if (skill.present !== true) say("Skill\uFF1A\u7F3A\u5931\uFF08daoyan skill update\uFF09");
  else if (skill.stale === true) say("Skill\uFF1A\u9700\u8981\u66F4\u65B0\uFF08daoyan skill update\uFF09");
  else say("Skill\uFF1A\u5DF2\u5C31\u7EEA");
  const shotsData = data.shots;
  if (shotsData.length > 0) {
    const done = shotsData.filter((s) => s.done === true).length;
    say(`\u955C\u5934\u8FDB\u5EA6\uFF1A${done}/${shotsData.length}`);
    for (const s of shotsData) say(`  ${s.done === true ? "\u2705" : "\u2B1C"} ${String(s.id)} ${String(s.slug ?? "")}`);
  }
  return 0;
}
var init_status = __esm({
  "src/commands/status.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_args();
    init_config();
    init_types();
    init_client();
    init_local_session();
    init_lock();
    init_store2();
    init_summary();
    init_store();
    init_events();
    init_store();
    init_create();
    init_detect();
    init_lease();
    init_skill();
    init_version();
  }
});

// src/commands/engine.mts
import { existsSync as existsSync24, readdirSync as readdirSync7 } from "fs";
import { isAbsolute as isAbsolute4, join as join23, relative, resolve as resolve4 } from "path";
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
  const dir = join23(root, "engine", "versions");
  try {
    return readdirSync7(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}
function currentDirs(root, engine) {
  const anchor = (p, fallback) => {
    if (p === void 0 || p === "") return join23(root, fallback);
    return isAbsolute4(p) ? p : join23(root, p);
  };
  return {
    comfyDir: anchor(engine.comfyui_dir, join23("engine", "ComfyUI")),
    venvDir: anchor(engine.venv_dir, join23("engine", ".venv"))
  };
}
function portablePath(root, abs) {
  const rel = relative(root, abs);
  return rel === "" || rel.startsWith("..") || isAbsolute4(rel) ? abs : rel.split("\\").join("/");
}
async function runEngine(ctx2, args) {
  const sub = args[0];
  if (sub === void 0) {
    throw new DaoyanCliError({
      code: "usage",
      message: "\u7528\u6CD5\uFF1Adaoyan engine <ls|install|use> ...",
      exit: 2
    });
  }
  const rest = args.slice(1);
  if (sub === "ls") {
    const remote = await comfyTags(15);
    const found = projectFromContext(ctx2);
    let local = [];
    let current = null;
    if (found !== null) {
      local = localVersions(found.root);
      const machine2 = loadMachineIfExists(found.root);
      if (machine2 !== null && machine2.engine.mode === "local") {
        const dirs = currentDirs(found.root, machine2.engine);
        current = {
          mode: "local",
          comfyui_dir: portablePath(found.root, dirs.comfyDir),
          venv_dir: portablePath(found.root, dirs.venvDir),
          installed: existsSync24(join23(dirs.comfyDir, "main.py")),
          version: machine2.engine.comfyui_version ?? found.config.comfyui?.version ?? null
        };
      } else if (machine2 !== null && machine2.engine.mode === "remote") {
        current = { mode: "remote", url: machine2.engine.url };
      }
    }
    if (ctx2.json) {
      emitData({ local, remote, current });
      return 0;
    }
    say("\u672C\u5730\u7248\u672C\uFF08engine/versions/\uFF09\uFF1A");
    for (const v of local) say(`  ${v}`);
    if (local.length === 0) say("  \uFF08\u65E0\uFF09");
    if (current !== null) {
      if (current.mode === "local") {
        say(`\u5F53\u524D\u5F15\u64CE\uFF1A${String(current.comfyui_dir)}${current.installed === true ? "" : "\uFF08\u672A\u5B89\u88C5\uFF09"}`);
        say(`\u7248\u672C\uFF1A${String(current.version ?? "unknown")}`);
      } else {
        say(`\u5F53\u524D\u6A21\u5F0F\uFF1Aremote\uFF08${String(current.url)}\uFF09`);
      }
    }
    say("GitHub \u53EF\u7528\u7248\u672C\uFF08\u524D 15\uFF09\uFF1A");
    for (const v of remote) say(`  ${v}`);
    if (remote.length === 0) say("  \uFF08GitHub \u4E0D\u53EF\u8FBE\uFF0C\u4EC5\u663E\u793A\u672C\u5730\uFF09");
    return 0;
  }
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachine(root);
  if (machine.engine.mode !== "local") {
    throw new DaoyanCliError({
      code: "usage",
      message: "remote \u6A21\u5F0F\u4E0D\u7BA1\u7406\u5F15\u64CE\u5B89\u88C5/\u5207\u6362\uFF08engine.mode=remote\uFF09",
      exit: 2
    });
  }
  if (sub === "install") {
    const tag = rest[0];
    if (tag === void 0 || tag === "") usageError("\u7528\u6CD5\uFF1Adaoyan engine install <\u7248\u672C tag>");
    const lock = await acquireMachineLock({
      taskId: `metadata-engine-install-${process.pid}`,
      project: root,
      mode: "local",
      command: `engine install ${tag}`,
      kind: "metadata"
    });
    try {
      const base = join23(root, "engine", "versions", tag);
      if (existsSync24(join23(base, "ComfyUI", "main.py")) && existsSync24(join23(base, ".venv", "bin", "python"))) {
        say(`\u7248\u672C ${tag} \u5DF2\u5B89\u88C5\uFF1A${portablePath(root, base)}`);
      } else {
        say(`\u5B89\u88C5 ComfyUI ${tag} \u2192 engine/versions/${tag} ...`);
        await installEngineAt({ root, baseDir: base, version: tag, project, log: say });
      }
      if (ctx2.json) {
        emitData({
          installed: tag,
          dir: portablePath(root, base),
          next_actions: [`engine use ${tag}`]
        });
        return 0;
      }
      say(`\u5207\u6362\uFF1Adaoyan engine use ${tag}`);
      return 0;
    } finally {
      lock.release();
    }
  }
  if (sub === "use") {
    const target = rest[0];
    if (target === void 0 || target === "") usageError("\u7528\u6CD5\uFF1Adaoyan engine use <\u7248\u672C tag|\u8DEF\u5F84>");
    const lock = await acquireMachineLock({
      taskId: `metadata-engine-use-${process.pid}`,
      project: root,
      mode: "local",
      command: `engine use ${target}`,
      kind: "metadata"
    });
    try {
      const asPath = resolve4(root, target);
      let comfyDir;
      let venvDir;
      let version;
      if (existsSync24(join23(asPath, "main.py"))) {
        comfyDir = asPath;
        venvDir = join23(asPath, ".venv");
        if (!existsSync24(join23(venvDir, "bin", "python"))) {
          throw new DaoyanCliError({
            code: "config_invalid",
            message: `\u8DEF\u5F84\u4E0B\u7F3A\u5C11 venv\uFF1A${join23(venvDir, "bin", "python")}`
          });
        }
      } else {
        const base = join23(root, "engine", "versions", target);
        comfyDir = join23(base, "ComfyUI");
        venvDir = join23(base, ".venv");
        if (!existsSync24(join23(comfyDir, "main.py"))) {
          throw new DaoyanCliError({
            code: "provision_failed",
            message: `\u672A\u627E\u5230\u7248\u672C ${target}\uFF08${portablePath(root, comfyDir)}\uFF09\u3002\u5148\u5B89\u88C5\uFF1Adaoyan engine install ${target}`
          });
        }
        if (!existsSync24(join23(venvDir, "bin", "python"))) {
          throw new DaoyanCliError({
            code: "provision_failed",
            message: `\u7248\u672C ${target} \u7F3A\u5C11 venv\uFF1A${portablePath(root, venvDir)}`
          });
        }
        version = target;
      }
      const engine = {
        ...machine.engine,
        comfyui_dir: portablePath(root, comfyDir),
        venv_dir: portablePath(root, venvDir),
        ...version !== void 0 ? { comfyui_version: version } : {}
      };
      saveMachine(root, { ...machine, engine });
      if (ctx2.json) {
        emitData({
          mode: "local",
          comfyui_dir: engine.comfyui_dir,
          venv_dir: engine.venv_dir,
          version: engine.comfyui_version ?? null
        });
        return 0;
      }
      say(`\u5DF2\u5207\u6362\u5F15\u64CE\uFF1A${String(engine.comfyui_dir)}\uFF08venv ${String(engine.venv_dir)}\uFF09`);
      return 0;
    } finally {
      lock.release();
    }
  }
  throw new DaoyanCliError({
    code: "usage",
    message: `\u672A\u77E5\u5B50\u547D\u4EE4 ${sub}\uFF08\u53EF\u7528\uFF1Als / install / use\uFF09`,
    exit: 2
  });
}
var init_engine = __esm({
  "src/commands/engine.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_args();
    init_config();
    init_init_flow();
    init_lock();
  }
});

// src/core/workflow/ops.mts
function opError(index, message, details = {}) {
  throw new DaoyanCliError({
    code: "workflow_invalid",
    message: `ops[${index}]: ${message}`,
    details: { op_index: index, ...details }
  });
}
function nodeOf(graph, nodeId, index, label) {
  if (typeof nodeId !== "string" || nodeId === "") opError(index, `${label} \u5FC5\u987B\u662F\u8282\u70B9 ID \u5B57\u7B26\u4E32`);
  const node = graph[nodeId];
  if (node === void 0) {
    opError(index, `\u8282\u70B9 ${nodeId} \u4E0D\u5B58\u5728`, {
      hint: `\u5F53\u524D\u8282\u70B9\uFF1A${Object.keys(graph).sort().join(", ") || "\uFF08\u7A7A\u56FE\uFF09"}`
    });
  }
  return node;
}
function inputNameOf(input, index) {
  if (typeof input !== "string" || input === "") opError(index, "input \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
  return input;
}
function checkInputValue(def, input, value, index, warnings) {
  if (def === null) return;
  const spec = def.inputs.find((i) => i.name === input);
  if (spec === void 0) {
    warnings.push({
      code: "node_input_unknown",
      message: `${def.class_type} \u7684\u8F93\u5165 "${input}" \u4E0D\u5728 /object_info \u4E2D\uFF1BComfyUI \u5C06\u6700\u7EC8\u88C1\u51B3`,
      path: `ops[${index}]`
    });
    return;
  }
  if (spec.options !== void 0 && typeof value === "string" && !spec.options.includes(value)) {
    warnings.push({
      code: "input_value_not_in_options",
      message: `${def.class_type}.${input} = "${value}" \u4E0D\u5728\u679A\u4E3E\u4E2D\uFF08${spec.options.slice(0, 8).join(", ")}\u2026\uFF09`,
      path: `ops[${index}]`
    });
  }
  if (spec.types.includes("INT") && (typeof value !== "number" || !Number.isInteger(value))) {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} \u671F\u671B INT\uFF08\u6536\u5230 ${JSON.stringify(value)}\uFF09`,
      path: `ops[${index}]`
    });
  } else if (spec.types.includes("FLOAT") && typeof value !== "number") {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} \u671F\u671B FLOAT\uFF08\u6536\u5230 ${JSON.stringify(value)}\uFF09`,
      path: `ops[${index}]`
    });
  } else if (spec.types.includes("BOOLEAN") && typeof value !== "boolean") {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} \u671F\u671B BOOLEAN\uFF08\u6536\u5230 ${JSON.stringify(value)}\uFF09`,
      path: `ops[${index}]`
    });
  } else if (spec.types.includes("STRING") && typeof value !== "string") {
    warnings.push({
      code: "input_type_mismatch",
      message: `${def.class_type}.${input} \u671F\u671B STRING\uFF08\u6536\u5230 ${JSON.stringify(value)}\uFF09`,
      path: `ops[${index}]`
    });
  }
}
function defOf(catalog, classType) {
  return catalog === null ? null : extractNodeDef(catalog.raw, classType);
}
function assignNodeId(graph) {
  const used = new Set(
    Object.keys(graph).filter((k) => /^\d+$/.test(k)).map((k) => Number(k))
  );
  for (let i = 1; ; i++) {
    if (!used.has(i)) return String(i);
  }
}
function applyOps(graph, ops, catalog = null) {
  let work = cloneGraph(graph);
  const assignedIds = [];
  const removedLinks = [];
  const warnings = [];
  const changed = /* @__PURE__ */ new Set();
  for (let index = 0; index < ops.length; index++) {
    const op = ops[index];
    if (op === void 0) continue;
    switch (op.op) {
      case "add_node": {
        if (typeof op.class_type !== "string" || op.class_type === "") {
          opError(index, "class_type \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
        }
        const id = op.id !== void 0 && op.id !== "" ? op.id : assignNodeId(work);
        if (work[id] !== void 0) opError(index, `\u8282\u70B9 ${id} \u5DF2\u5B58\u5728`);
        work[id] = { class_type: op.class_type, inputs: {} };
        if (op.id === void 0 || op.id === "") assignedIds.push({ id, class_type: op.class_type });
        changed.add(id);
        if (catalog !== null && defOf(catalog, op.class_type) === null) {
          warnings.push({
            code: "node_class_unknown",
            message: `\u8282\u70B9\u7C7B ${op.class_type} \u4E0D\u5728\u8282\u70B9\u76EE\u5F55\u4E2D\uFF1B\u5B89\u88C5\u5BF9\u5E94 custom node \u540E\u518D\u6267\u884C`,
            path: `ops[${index}]`
          });
        }
        break;
      }
      case "set_input": {
        const node = nodeOf(work, op.node, index, "node");
        const input = inputNameOf(op.input, index);
        if (op.value === void 0) opError(index, "\u7F3A\u5C11 value");
        node.inputs[input] = op.value;
        changed.add(op.node);
        checkInputValue(defOf(catalog, node.class_type), input, op.value, index, warnings);
        break;
      }
      case "connect": {
        if (typeof op.from !== "object" || op.from === null) opError(index, "\u7F3A\u5C11 from");
        if (typeof op.to !== "object" || op.to === null) opError(index, "\u7F3A\u5C11 to");
        if (typeof op.from.output !== "number" || !Number.isInteger(op.from.output) || op.from.output < 0) {
          opError(index, "from.output \u5FC5\u987B\u662F\u975E\u8D1F\u6574\u6570");
        }
        const from = nodeOf(work, op.from.node, index, "from.node");
        const to = nodeOf(work, op.to.node, index, "to.node");
        const input = inputNameOf(op.to.input, index);
        const fromDef = defOf(catalog, from.class_type);
        if (fromDef !== null && op.from.output >= fromDef.outputs.length) {
          warnings.push({
            code: "output_index_unknown",
            message: `${from.class_type} \u53EA\u6709 ${fromDef.outputs.length} \u4E2A\u8F93\u51FA\uFF08\u7D22\u5F15\u4ECE 0 \u5F00\u59CB\uFF09`,
            path: `ops[${index}]`
          });
        }
        const prev = to.inputs[input];
        if (isLink(prev)) {
          removedLinks.push({ from_node: prev[0], output: prev[1], to_node: op.to.node, input });
          warnings.push({
            code: "connection_replaced",
            message: `${op.to.node}.${input} \u539F\u6709\u8FDE\u7EBF [${prev[0]}, ${prev[1]}] \u5DF2\u88AB\u66FF\u6362`,
            path: `ops[${index}]`
          });
        }
        to.inputs[input] = [op.from.node, op.from.output];
        changed.add(op.to.node);
        break;
      }
      case "disconnect": {
        const node = nodeOf(work, op.node, index, "node");
        const input = inputNameOf(op.input, index);
        const cur = node.inputs[input];
        if (cur === void 0) {
          warnings.push({
            code: "disconnect_noop",
            message: `${op.node}.${input} \u6CA1\u6709\u503C`,
            path: `ops[${index}]`
          });
          break;
        }
        if (!isLink(cur)) {
          warnings.push({
            code: "disconnect_not_link",
            message: `${op.node}.${input} \u662F\u5B57\u9762\u91CF\u800C\u975E\u8FDE\u7EBF\uFF1B\u672A\u5220\u9664`,
            path: `ops[${index}]`
          });
          break;
        }
        removedLinks.push({ from_node: cur[0], output: cur[1], to_node: op.node, input });
        delete node.inputs[input];
        changed.add(op.node);
        break;
      }
      case "remove_node": {
        nodeOf(work, op.node, index, "node");
        const refs = referencesTo(work, op.node);
        if (refs.length > 0 && op.force !== true) {
          opError(
            index,
            `\u8282\u70B9 ${op.node} \u4ECD\u88AB ${refs.length} \u5904\u5F15\u7528\uFF1B\u8BBE\u7F6E force:true \u540C\u65F6\u5220\u9664\u5173\u8054\u8FDE\u7EBF`,
            { references: refs }
          );
        }
        if (op.force === true) {
          for (const ref of refs) {
            const holder = work[ref.node];
            const value = holder?.inputs[ref.input];
            if (isLink(value)) {
              removedLinks.push({ from_node: value[0], output: value[1], to_node: ref.node, input: ref.input });
            }
            if (holder !== void 0) {
              delete holder.inputs[ref.input];
              changed.add(ref.node);
            }
          }
        }
        delete work[op.node];
        changed.add(op.node);
        break;
      }
      case "replace_graph": {
        const parsed = parseGraph(op.graph);
        if (hasGraphErrors(parsed.issues)) {
          opError(index, "replace_graph \u7684\u56FE\u7ED3\u6784\u975E\u6CD5", { issues: parsed.issues });
        }
        work = cloneGraph(parsed.graph);
        for (const id of Object.keys(work)) changed.add(id);
        break;
      }
      default: {
        opError(index, `\u672A\u77E5 op ${String(op.op)}`);
      }
    }
  }
  const finalParsed = parseGraph(work);
  if (hasGraphErrors(finalParsed.issues)) {
    throw new DaoyanCliError({
      code: "workflow_invalid",
      message: "\u56FE\u64CD\u4F5C\u540E\u7ED3\u6784\u975E\u6CD5\uFF08\u5DF2\u56DE\u6EDA\uFF0C\u6587\u4EF6\u672A\u4FEE\u6539\uFF09",
      details: { issues: finalParsed.issues }
    });
  }
  return {
    graph: finalParsed.graph,
    applied: ops.length,
    assigned_ids: assignedIds,
    removed_links: removedLinks,
    warnings,
    changed_nodes: [...changed].sort((a, b) => a.localeCompare(b, void 0, { numeric: true })),
    graph_sha256: graphSha256(finalParsed.graph)
  };
}
function parseOpsPayload(raw) {
  const arr = Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null && Array.isArray(raw.ops) ? raw.ops : null;
  if (arr === null) {
    throw new DaoyanCliError({
      code: "usage",
      message: 'ops \u6587\u4EF6\u5FC5\u987B\u662F\u6570\u7EC4\u6216 { "ops": [...] }',
      exit: 2
    });
  }
  return arr.map((item, i) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      opError(i, "op \u5FC5\u987B\u662F\u5BF9\u8C61");
    }
    const o = item;
    if (typeof o.op !== "string") opError(i, "\u7F3A\u5C11 op \u5B57\u6BB5");
    return o;
  });
}
var init_ops = __esm({
  "src/core/workflow/ops.mts"() {
    "use strict";
    init_errors();
    init_graph();
    init_catalog();
  }
});

// src/commands/workflow.mts
import { existsSync as existsSync25, readFileSync as readFileSync16, readdirSync as readdirSync8 } from "fs";
import { basename as basename6, join as join24, resolve as resolve5 } from "path";
function readStdin() {
  try {
    return readFileSync16(0, "utf8");
  } catch (e) {
    throw new DaoyanCliError({
      code: "usage",
      message: `\u8BFB\u53D6 stdin \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`,
      exit: 2
    });
  }
}
async function ensureCatalog(opts) {
  const cached = readCatalog(opts.root);
  if (cached !== null && !opts.refresh) return cached;
  if (opts.machine.engine.mode === "remote") {
    const client = new ComfyClient(opts.machine.engine.url);
    try {
      const stats = await client.systemStats(15e3);
      const raw = await client.objectInfo(12e4);
      const catalog = buildCatalog(raw, comfyVersionOf(stats));
      writeCatalog(opts.root, catalog);
      opts.log(`\u8282\u70B9\u76EE\u5F55\u5DF2\u5237\u65B0\uFF1A${catalogSize(catalog)} \u4E2A\u8282\u70B9\uFF08remote\uFF09`);
      return catalog;
    } catch (e) {
      throw new DaoyanCliError({
        code: "engine_unreachable",
        message: `\u65E0\u6CD5\u4ECE remote \u5F15\u64CE\u8BFB\u53D6 /object_info\uFF1A${e instanceof Error ? e.message : String(e)}`
      });
    }
  }
  if (!opts.refresh) {
    if (cached !== null) return cached;
    throw new DaoyanCliError({
      code: "config_invalid",
      message: "\u672C\u5730\u8282\u70B9\u76EE\u5F55\u7F13\u5B58\u7F3A\u5931\u3002\u8FD0\u884C daoyan workflow nodes --refresh \u542F\u52A8\u4E00\u6B21 metadata session\uFF08\u4E0D\u52A0\u8F7D\u6A21\u578B\uFF09",
      hint: "workflow nodes --refresh --json"
    });
  }
  let lock = null;
  try {
    lock = await acquireMachineLock({
      taskId: `metadata-catalog-${process.pid}`,
      project: opts.root,
      mode: "local",
      command: "workflow nodes --refresh",
      kind: "metadata"
    });
    const session = await createEngineSession({
      root: opts.root,
      project: opts.project,
      machine: opts.machine,
      taskId: `metadata-catalog-${process.pid}`,
      metadataOnly: true
    });
    try {
      await session.ensureReady(opts.log);
      const stats = await session.client.systemStats(15e3);
      const raw = await session.client.objectInfo(12e4);
      const catalog = buildCatalog(raw, comfyVersionOf(stats));
      writeCatalog(opts.root, catalog);
      opts.log(`\u8282\u70B9\u76EE\u5F55\u5DF2\u5237\u65B0\uFF1A${catalogSize(catalog)} \u4E2A\u8282\u70B9\uFF08local metadata session\uFF09`);
      return catalog;
    } finally {
      await session.release(
        { submitted: false, interrupt: false, uploaded: [], scratch_outputs: [] },
        opts.log
      );
    }
  } finally {
    lock?.release();
  }
}
function readOpsFile(path) {
  const text = path === "-" ? readStdin() : readFileSync16(path, "utf8");
  try {
    return parseOpsPayload(JSON.parse(text));
  } catch (e) {
    if (e instanceof DaoyanCliError) throw e;
    throw new DaoyanCliError({
      code: "usage",
      message: `ops JSON \u89E3\u6790\u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`,
      exit: 2
    });
  }
}
function isEmptyPlaceholder(abs) {
  if (!existsSync25(abs)) return false;
  try {
    const parsed = parseGraph(JSON.parse(readFileSync16(abs, "utf8")));
    return !hasGraphErrors(parsed.issues) && Object.keys(parsed.graph).length === 0;
  } catch {
    return false;
  }
}
async function runWorkflow(ctx2, args) {
  const sub = args[0];
  if (sub === void 0) {
    throw new DaoyanCliError({
      code: "usage",
      message: "\u7528\u6CD5\uFF1Adaoyan workflow <new|import|list|show|nodes|node|apply|set|validate> ...",
      exit: 2
    });
  }
  const rest = args.slice(1);
  if (sub === "new") {
    const name = requiredPositional(rest[0], "workflow \u540D\u79F0");
    if (!/^[A-Za-z0-9._-]+$/.test(name)) usageError(`workflow \u540D\u79F0\u53EA\u5141\u8BB8\u5B57\u6BCD\u6570\u5B57 . _ -\uFF08\u6536\u5230 ${name}\uFF09`);
    const { root } = requireProject(ctx2);
    const target = resolveWorkflowRef(root, name);
    const replaced = isEmptyPlaceholder(target.abs);
    if (existsSync25(target.abs) && !replaced) {
      throw new DaoyanCliError({ code: "usage", message: `workflow ${name} \u5DF2\u5B58\u5728\uFF1A${target.rel}`, exit: 2 });
    }
    ensureDir(join24(root, WORKFLOWS_DIR));
    saveGraphFile(target.abs, {});
    if (ctx2.json) emitData({ name, path: target.rel, replaced_placeholder: replaced, graph_sha256: graphSha256({}) });
    else say(replaced ? `\u5DF2\u91CD\u7F6E\u7A7A\u56FE\uFF1A${target.rel}` : `\u5DF2\u521B\u5EFA ${target.rel}\uFF08\u7A7A\u56FE\uFF09`);
    return;
  }
  if (sub === "import") {
    const source = requiredPositional(rest[0], "\u5F85\u5BFC\u5165\u7684 API JSON \u8DEF\u5F84");
    let name;
    for (let i = 1; i < rest.length; i++) {
      const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
      if (flag === "--name") {
        const v = takeValue(rest, i, inline, "--name");
        name = v.value;
        i += v.skip;
      } else if (flag.startsWith("-")) usageError(`\u672A\u77E5\u53C2\u6570 ${flag}`);
      else usageError(`\u591A\u4F59\u7684\u4F4D\u7F6E\u53C2\u6570 ${flag}`);
    }
    if (name === void 0) usageError("workflow import \u9700\u8981 --name <name>");
    const { root } = requireProject(ctx2);
    const target = resolveWorkflowRef(root, name);
    const replaced = isEmptyPlaceholder(target.abs);
    if (existsSync25(target.abs) && !replaced) {
      throw new DaoyanCliError({ code: "usage", message: `workflow ${name} \u5DF2\u5B58\u5728`, exit: 2 });
    }
    const loaded = loadGraphFile(resolve5(process.cwd(), source), basename6(source));
    saveGraphFile(target.abs, loaded.graph);
    if (ctx2.json) emitData({ name, path: target.rel, replaced_placeholder: replaced, graph_sha256: loaded.sha256 });
    else say(`\u5DF2\u5BFC\u5165 ${target.rel}`);
    return;
  }
  if (sub === "list") {
    const { root } = requireProject(ctx2);
    const dir = join24(root, WORKFLOWS_DIR);
    const items = existsSync25(dir) ? readdirSync8(dir).filter((f) => f.endsWith(".json") && !f.endsWith(BINDINGS_SUFFIX)).sort().map((f) => {
      const abs = join24(dir, f);
      try {
        const parsed = parseGraph(JSON.parse(readFileSync16(abs, "utf8")));
        const stats = graphStats(parsed.graph);
        return {
          name: f.slice(0, -".json".length),
          path: `${WORKFLOWS_DIR}/${f}`,
          nodes: stats.nodes,
          links: stats.links,
          valid: !hasGraphErrors(parsed.issues)
        };
      } catch {
        return { name: f.slice(0, -".json".length), path: `${WORKFLOWS_DIR}/${f}`, nodes: 0, links: 0, valid: false };
      }
    }) : [];
    if (ctx2.json) {
      emitData({ workflows: items });
      return;
    }
    for (const it of items) say(`${it.valid ? "\u2705" : "\u2717"} ${it.path}\uFF08${it.nodes} \u8282\u70B9 / ${it.links} \u8FDE\u7EBF\uFF09`);
    if (items.length === 0) say("\uFF08workflows/ \u4E0B\u6682\u65E0 workflow\uFF09");
    return;
  }
  if (sub === "show") {
    const name = requiredPositional(rest[0], "workflow \u540D\u79F0");
    let full = false;
    let nodeId;
    for (let i = 1; i < rest.length; i++) {
      const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
      if (flag === "--full") {
        full = true;
      } else if (flag === "--node") {
        const v = takeValue(rest, i, inline, "--node");
        nodeId = v.value;
        i += v.skip;
      } else if (flag.startsWith("-")) usageError(`\u672A\u77E5\u53C2\u6570 ${flag}`);
      else usageError(`\u591A\u4F59\u7684\u4F4D\u7F6E\u53C2\u6570 ${flag}`);
    }
    const { root } = requireProject(ctx2);
    const ref = resolveWorkflowRef(root, name);
    const loaded = loadGraphFile(ref.abs, ref.rel);
    const stats = graphStats(loaded.graph);
    if (nodeId !== void 0) {
      const node = loaded.graph[nodeId];
      if (node === void 0) throw new DaoyanCliError({ code: "workflow_invalid", message: `\u8282\u70B9 ${nodeId} \u4E0D\u5B58\u5728` });
      const data2 = { name, node: { id: nodeId, class_type: node.class_type, inputs: node.inputs } };
      if (ctx2.json) emitData(data2);
      else process.stdout.write(JSON.stringify(data2.node, null, 2) + "\n");
      return;
    }
    const data = {
      name,
      path: ref.rel,
      nodes: stats.nodes,
      links: stats.links,
      graph_sha256: loaded.sha256,
      bindings: existsSync25(bindingsPathOf(ref.abs)) ? bindingsPathOf(ref.abs).slice(root.length + 1) : null,
      ...full ? { graph: loaded.graph } : { node_list: nodeSummaries(loaded.graph) }
    };
    if (ctx2.json) {
      emitData(data);
      return;
    }
    say(`${ref.rel} \xB7 ${stats.nodes} \u8282\u70B9 / ${stats.links} \u8FDE\u7EBF \xB7 ${loaded.sha256.slice(0, 12)}\u2026`);
    for (const n of nodeSummaries(loaded.graph)) say(`  ${n.id} ${n.class_type}\uFF08${n.inputs} \u8F93\u5165\uFF09`);
    return;
  }
  if (sub === "nodes") {
    let filter;
    let refresh = false;
    let limit = 100;
    let cursor = 0;
    let fields;
    for (let i = 0; i < rest.length; i++) {
      const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
      if (flag === "--filter") {
        const v = takeValue(rest, i, inline, "--filter");
        filter = v.value;
        i += v.skip;
      } else if (flag === "--refresh") {
        refresh = true;
      } else if (flag === "--limit") {
        const v = takeValue(rest, i, inline, "--limit");
        limit = Number(v.value);
        if (!Number.isInteger(limit) || limit <= 0) usageError("--limit \u9700\u8981\u6B63\u6574\u6570");
        i += v.skip;
      } else if (flag === "--cursor") {
        const v = takeValue(rest, i, inline, "--cursor");
        cursor = Number(v.value);
        if (!Number.isInteger(cursor) || cursor < 0) usageError("--cursor \u9700\u8981\u975E\u8D1F\u6574\u6570");
        i += v.skip;
      } else if (flag === "--fields") {
        const v = takeValue(rest, i, inline, "--fields");
        fields = v.value.split(",").map((s) => s.trim()).filter((s) => s !== "");
        i += v.skip;
      } else usageError(`\u672A\u77E5\u53C2\u6570 ${flag}`);
    }
    const { root, config } = requireProject(ctx2);
    const machine = loadMachine(root);
    const catalog = await ensureCatalog({ root, project: config, machine, refresh, log: say });
    const result = listNodes(catalog, {
      ...filter !== void 0 ? { filter } : {},
      limit,
      cursor,
      ...fields !== void 0 ? { fields } : {}
    });
    if (ctx2.json) {
      emitData({
        ...result,
        fingerprint: catalog.fingerprint,
        generated_at: catalog.generated_at
      });
      return;
    }
    for (const n of result.nodes) say(`${String(n.name)}  ${String(n.display_name ?? "")}  ${String(n.category ?? "")}`.trim());
    if (result.next_cursor !== null) say(`\u2026 \u4E0B\u4E00\u9875\uFF1A--cursor ${result.next_cursor}`);
    return;
  }
  if (sub === "node") {
    const classType = requiredPositional(rest[0], "\u8282\u70B9\u7C7B\u540D");
    const { root, config } = requireProject(ctx2);
    const machine = loadMachine(root);
    const catalog = await ensureCatalog({ root, project: config, machine, refresh: false, log: say });
    const def = extractNodeDef(catalog.raw, classType);
    if (def === null) {
      throw new DaoyanCliError({
        code: "node_missing",
        message: `\u8282\u70B9\u76EE\u5F55\u4E2D\u6CA1\u6709 ${classType}`,
        hint: "workflow nodes --filter <\u6587\u672C> \u67E5\u627E\u53EF\u7528\u8282\u70B9\uFF1B\u5FC5\u8981\u65F6\u5B89\u88C5 custom node \u540E --refresh"
      });
    }
    if (ctx2.json) {
      emitData({ node: def, fingerprint: catalog.fingerprint });
      return;
    }
    say(`${def.class_type}\uFF08${def.display_name}\uFF0C${def.category}\uFF09`);
    for (const i of def.inputs) {
      say(`  ${i.required ? "*" : "-"} ${i.name}: ${i.types.join("|")}${i.options !== void 0 ? ` [${i.options.slice(0, 6).join(", ")}\u2026]` : ""}`);
    }
    say(`\u8F93\u51FA\uFF1A${def.outputs.map((t, idx) => `${idx}:${t}`).join(" ")}`);
    return;
  }
  if (sub === "apply") {
    const name = requiredPositional(rest[0], "workflow \u540D\u79F0");
    let opsPath;
    for (let i = 1; i < rest.length; i++) {
      const { name: flag, inline } = splitInlineFlag(rest[i] ?? "");
      if (flag === "--ops") {
        const v = takeValue(rest, i, inline, "--ops");
        opsPath = v.value;
        i += v.skip;
      } else usageError(`\u672A\u77E5\u53C2\u6570 ${flag}`);
    }
    if (opsPath === void 0) usageError("workflow apply \u9700\u8981 --ops <file|->");
    const { root } = requireProject(ctx2);
    const ref = resolveWorkflowRef(root, name);
    const loaded = loadGraphFile(ref.abs, ref.rel);
    const catalog = readCatalog(root);
    const ops = readOpsFile(opsPath);
    const result = applyOps(loaded.graph, ops, catalog);
    saveGraphFile(ref.abs, result.graph);
    if (ctx2.json) {
      emitData({
        workflow: name,
        path: ref.rel,
        applied: result.applied,
        assigned_ids: result.assigned_ids,
        changed_nodes: result.changed_nodes,
        removed_links: result.removed_links,
        warnings: result.warnings,
        graph_sha256: result.graph_sha256
      });
      return;
    }
    say(`\u5E94\u7528 ${result.applied} \u4E2A op\uFF1A${ref.rel}\uFF08${result.graph_sha256.slice(0, 12)}\u2026\uFF09`);
    for (const w of result.warnings) say(`! ${w.message}`);
    return;
  }
  if (sub === "set") {
    const name = requiredPositional(rest[0], "workflow \u540D\u79F0");
    const key = requiredPositional(rest[1], "\u8F93\u5165\u952E\uFF08nodeId.input\uFF09");
    const rawValue = requiredPositional(rest[2], "\u503C");
    const dot = key.indexOf(".");
    if (dot <= 0 || dot === key.length - 1) usageError(`workflow set \u7684\u952E\u5FC5\u987B\u662F nodeId.input\uFF08\u6536\u5230 ${key}\uFF09`);
    const { root } = requireProject(ctx2);
    const ref = resolveWorkflowRef(root, name);
    const loaded = loadGraphFile(ref.abs, ref.rel);
    const catalog = readCatalog(root);
    const value = parseJsonValue(rawValue);
    const result = applyOps(
      loaded.graph,
      [{ op: "set_input", node: key.slice(0, dot), input: key.slice(dot + 1), value }],
      catalog
    );
    saveGraphFile(ref.abs, result.graph);
    if (ctx2.json) {
      emitData({
        workflow: name,
        set: key,
        value,
        changed_nodes: result.changed_nodes,
        warnings: result.warnings,
        graph_sha256: result.graph_sha256
      });
      return;
    }
    say(`\u5DF2\u8BBE\u7F6E ${name} ${key} = ${JSON.stringify(value)}`);
    for (const w of result.warnings) say(`! ${w.message}`);
    return;
  }
  if (sub === "validate") {
    const name = requiredPositional(rest[0], "workflow \u540D\u79F0");
    const { root } = requireProject(ctx2);
    const ref = resolveWorkflowRef(root, name);
    let raw;
    try {
      raw = JSON.parse(readFileSync16(ref.abs, "utf8"));
    } catch (e) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `${ref.rel} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`,
        details: {
          issues: [
            {
              path: ref.rel,
              code: "graph_json_invalid",
              severity: "error",
              message: e instanceof Error ? e.message : String(e),
              hint: "\u4FEE\u6B63 JSON \u8BED\u6CD5\u3002"
            }
          ]
        }
      });
    }
    const parsed = parseGraph(raw);
    const bindings = loadBindings(ref.abs);
    const issues = [...parsed.issues, ...validateBindings(parsed.graph, bindings, `${ref.rel}.bindings`)];
    const machine = loadMachineIfExists(root);
    if (machine !== null) {
      const over = applyMachineOverrides(parsed.graph, machine, ref.rel);
      issues.push(...over.issues);
    }
    const catalog = readCatalog(root);
    if (catalog !== null) {
      issues.push(...validateGraphWithCatalog(parsed.graph, catalog, bindingTargets(bindings)));
    }
    const errors = issues.filter((i) => i.severity === "error");
    if (ctx2.json) {
      if (errors.length > 0) {
        throw new DaoyanCliError({
          code: "workflow_invalid",
          message: `${ref.rel} \u6821\u9A8C\u672A\u901A\u8FC7\uFF08${errors.length} \u9879\u9519\u8BEF\uFF09`,
          details: { issues }
        });
      }
      emitData({ workflow: name, path: ref.rel, ok: true, issues });
      return;
    }
    for (const i of issues) say(`${i.severity === "error" ? "\u2717" : "!"} [${i.path}] ${i.message}`);
    if (errors.length > 0) {
      throw new DaoyanCliError({
        code: "workflow_invalid",
        message: `${ref.rel} \u6821\u9A8C\u672A\u901A\u8FC7\uFF08${errors.length} \u9879\u9519\u8BEF\uFF09`,
        details: { issues }
      });
    }
    say(`\u6821\u9A8C\u901A\u8FC7\uFF1A${ref.rel}${issues.length > 0 ? `\uFF08${issues.length} \u6761\u8B66\u544A\uFF09` : ""}`);
    return;
  }
  throw new DaoyanCliError({
    code: "usage",
    message: `\u672A\u77E5 workflow \u5B50\u547D\u4EE4 ${sub}\uFF08\u53EF\u7528\uFF1Anew/import/list/show/nodes/node/apply/set/validate\uFF09`,
    exit: 2
  });
}
var init_workflow = __esm({
  "src/commands/workflow.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_args();
    init_fs();
    init_config();
    init_types();
    init_catalog();
    init_graph();
    init_load();
    init_ops();
    init_client();
    init_session();
    init_lock();
  }
});

// src/commands/skill.mts
async function runSkill(ctx2, args) {
  const sub = args[0] ?? "update";
  if (sub !== "update") {
    throw new DaoyanCliError({
      code: "usage",
      message: "\u7528\u6CD5\uFF1Adaoyan skill update",
      exit: 2
    });
  }
  const { root } = requireProject(ctx2);
  const { COMMANDS: COMMANDS2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
  const result = writeSkill(root, VERSION, COMMANDS2);
  const state = skillState(root, VERSION, COMMANDS2);
  if (ctx2.json) {
    emitData({
      path: ".agents/skills/daoyan/",
      files: result.files,
      hash: result.hash,
      stale: state.stale,
      agents_md: "AGENTS.md"
    });
    return;
  }
  say(`Skill \u5DF2\u66F4\u65B0\uFF1A.agents/skills/daoyan/\uFF08${result.files} \u4E2A\u6587\u4EF6\uFF09`);
  say("AGENTS.md \u7BA1\u7406\u5757\u5DF2\u540C\u6B65\uFF08\u672A\u8986\u76D6\u5176\u4ED6\u5185\u5BB9\uFF09");
}
var init_skill2 = __esm({
  "src/commands/skill.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_config();
    init_skill();
    init_version();
  }
});

// src/commands/registry.mts
var registry_exports = {};
__export(registry_exports, {
  COMMANDS: () => COMMANDS,
  findCommand: () => findCommand
});
function findCommand(name, args) {
  if (args.length > 0) {
    const sub = COMMANDS.find((c) => c.name === `${name} ${args[0]}`);
    if (sub) return { meta: sub, rest: args.slice(1) };
  }
  const main2 = COMMANDS.find((c) => c.name === name);
  return main2 ? { meta: main2, rest: [...args] } : null;
}
var TASK_START_SHAPE, TASK_WAIT_SHAPE, COMMANDS;
var init_registry = __esm({
  "src/commands/registry.mts"() {
    "use strict";
    init_version();
    init_help();
    init_update();
    init_init();
    init_validate();
    init_shot();
    init_wrap();
    init_logs();
    init_status();
    init_engine();
    init_workflow();
    init_run();
    init_skill2();
    TASK_START_SHAPE = {
      task_id: "string",
      state: "queued|running|succeeded|failed|cancelled|interrupted",
      runs: "string[]",
      events_path: "tasks/<task_id>/events.jsonl",
      next_actions: "string[]",
      deduplicated: "boolean"
    };
    TASK_WAIT_SHAPE = {
      ...TASK_START_SHAPE,
      runs_detail: "object[]",
      interrupted: "boolean",
      timed_out: "boolean"
    };
    COMMANDS = [
      // ---- 项目 ----
      {
        name: "init",
        group: "project",
        summary: "\u5728\u5F53\u524D\u76EE\u5F55\u7ACB\u9879\uFF1Alocal \u90E8\u7F72\u9879\u76EE\u4E13\u5C5E ComfyUI\uFF0Cremote \u7ED1\u5B9A\u5916\u90E8\u670D\u52A1",
        usage: "daoyan init --mode=local [--modelpath <\u8DEF\u5F84>] [--version <tag>] [--mirror <\u955C\u50CF>] [--no-skill]\ndaoyan init --mode=remote --url <url> [--no-skill]",
        flags: [
          { name: "--mode", type: "local|remote", required: true, enum: ["local", "remote"], description: "\u6267\u884C\u6A21\u5F0F\uFF08\u5FC5\u586B\uFF0C\u65E0\u9ED8\u8BA4\u503C\uFF09" },
          { name: "--modelpath", type: "path", description: "local\uFF1A\u5916\u90E8\u6A21\u578B\u6839\u76EE\u5F55\uFF08\u5DF2\u5B58\u5728\uFF09" },
          { name: "--url", type: "url", description: "remote\uFF1A\u5916\u90E8 ComfyUI base URL\uFF08\u5FC5\u586B\uFF09" },
          { name: "--version", type: "tag", description: "local\uFF1AComfyUI \u7248\u672C tag" },
          { name: "--mirror", type: "url", description: "local\uFF1Apip \u955C\u50CF\u6E90" },
          { name: "--no-skill", type: "boolean", default: false, description: "\u4E0D\u751F\u6210 .agents/skills/daoyan \u4E0E AGENTS.md" }
        ],
        examples: [
          "daoyan init --mode=local --modelpath /data/models",
          "daoyan init --mode=remote --url http://gpu-box:8188"
        ],
        implemented: true,
        jsonShape: { root: "string", mode: "local|remote", project_created: "boolean", engine_installed: "boolean", port: "number|null", skill: "object|null" },
        run: (ctx2, args) => runInit(ctx2, args)
      },
      {
        name: "validate",
        group: "project",
        summary: "\u9879\u76EE\u7EA7\u79BB\u7EBF\u6821\u9A8C\uFF08\u914D\u7F6E/workflows/bindings/overrides/shots/\u5F15\u64CE\u76EE\u5F55/Skill\uFF09",
        usage: "daoyan validate [--json]",
        implemented: true,
        jsonShape: { ok: "boolean", issues: "Array<{path,code,severity,message,hint}>" },
        run: (ctx2) => runValidate(ctx2)
      },
      {
        name: "skill update",
        group: "project",
        summary: "\u91CD\u65B0\u751F\u6210\u9879\u76EE\u5185 Agent Skill \u4E0E AGENTS.md \u7BA1\u7406\u5757",
        usage: "daoyan skill update [--json]",
        implemented: true,
        jsonShape: { path: "string", files: "number", hash: "string" },
        run: (ctx2, args) => runSkill(ctx2, args)
      },
      // ---- 工作流 ----
      {
        name: "workflow new",
        group: "workflow",
        summary: "\u521B\u5EFA\u7A7A\u5DE5\u4F5C\u6D41\uFF08{ }\uFF0C\u540E\u7EED\u7528 apply/set \u7F16\u8F91\uFF09",
        usage: "daoyan workflow new <name> [--json]",
        args: [{ name: "name", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D\uFF08\u5B57\u6BCD\u6570\u5B57 . _ -\uFF09" }],
        implemented: true,
        run: (ctx2, args) => runWorkflow(ctx2, ["new", ...args])
      },
      {
        name: "workflow import",
        group: "workflow",
        summary: "\u5BFC\u5165 ComfyUI API JSON\uFF08\u4E0D\u91CD\u547D\u540D\u8282\u70B9\uFF09",
        usage: "daoyan workflow import <api.json> --name <name> [--json]",
        args: [{ name: "api.json", type: "path", required: true, description: "ComfyUI Save (API Format) \u5BFC\u51FA\u7684 JSON" }],
        flags: [{ name: "--name", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D" }],
        examples: ["daoyan workflow import ./from-comfyui.json --name t2v --json"],
        implemented: true,
        run: (ctx2, args) => runWorkflow(ctx2, ["import", ...args])
      },
      {
        name: "workflow list",
        group: "workflow",
        summary: "\u5217\u51FA workflows/ \u4E0B\u7684\u56FE\uFF08\u8282\u70B9/\u8FDE\u7EBF/\u5408\u6CD5\u6027\uFF09",
        usage: "daoyan workflow list [--json]",
        implemented: true,
        run: (ctx2) => runWorkflow(ctx2, ["list"])
      },
      {
        name: "workflow show",
        group: "workflow",
        summary: "\u67E5\u770B\u5DE5\u4F5C\u6D41\u6458\u8981\u6216\u5B8C\u6574\u56FE / \u5355\u8282\u70B9",
        usage: "daoyan workflow show <name> [--full] [--node <id>] [--json]",
        args: [{ name: "name", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D\u6216\u8DEF\u5F84" }],
        flags: [
          { name: "--full", type: "boolean", description: "\u8F93\u51FA\u5B8C\u6574\u56FE" },
          { name: "--node", type: "string", description: "\u53EA\u770B\u67D0\u4E2A\u8282\u70B9" }
        ],
        implemented: true,
        run: (ctx2, args) => runWorkflow(ctx2, ["show", ...args])
      },
      {
        name: "workflow nodes",
        group: "workflow",
        summary: "\u67E5\u8BE2\u8282\u70B9\u76EE\u5F55\uFF08\u9ED8\u8BA4\u7F13\u5B58\uFF1B--refresh \u62C9\u53D6 /object_info\uFF09",
        usage: "daoyan workflow nodes [--filter <\u6587\u672C>] [--refresh] [--limit N] [--cursor <c>] [--fields <list>] [--json]",
        flags: [
          { name: "--filter", type: "text", description: "\u6309\u7C7B\u540D/\u5C55\u793A\u540D/\u5206\u7C7B\u8FC7\u6EE4" },
          { name: "--refresh", type: "boolean", description: "\u91CD\u65B0\u62C9\u53D6\uFF1Blocal \u542F\u52A8 metadata session\uFF08\u4E0D\u52A0\u8F7D\u6A21\u578B\uFF09" },
          { name: "--limit", type: "integer", default: 100, description: "\u6BCF\u9875\u6570\u91CF\uFF08\u6700\u5927 1000\uFF09" },
          { name: "--cursor", type: "integer", default: 0, description: "\u5206\u9875\u6E38\u6807" },
          { name: "--fields", type: "list", description: "\u9017\u53F7\u5206\u9694\u5B57\u6BB5\uFF0C\u5982 name,category" }
        ],
        examples: ["daoyan workflow nodes --filter KSampler --json", "daoyan workflow nodes --refresh --json"],
        implemented: true,
        jsonShape: { nodes: "object[]", total: "number", next_cursor: "string|null", fingerprint: "object" },
        run: (ctx2, args) => runWorkflow(ctx2, ["nodes", ...args])
      },
      {
        name: "workflow node",
        group: "workflow",
        summary: "\u67E5\u770B\u5355\u4E2A\u8282\u70B9\u7C7B\u7684\u8F93\u5165/\u8F93\u51FA\u5B9A\u4E49",
        usage: "daoyan workflow node <class_type> [--json]",
        args: [{ name: "class_type", type: "string", required: true, description: "\u8282\u70B9\u7C7B\u540D" }],
        examples: ["daoyan workflow node KSampler --json"],
        implemented: true,
        run: (ctx2, args) => runWorkflow(ctx2, ["node", ...args])
      },
      {
        name: "workflow apply",
        group: "workflow",
        summary: "\u6279\u91CF\u56FE\u64CD\u4F5C\uFF08\u5168\u91CF\u6821\u9A8C\u540E\u539F\u5B50\u5199\u76D8\uFF09",
        usage: "daoyan workflow apply <name> --ops <ops.json|-> [--json]",
        args: [{ name: "name", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D\u6216\u8DEF\u5F84" }],
        flags: [{ name: "--ops", type: "path|-", required: true, description: "ops JSON \u6587\u4EF6\uFF1B- \u8868\u793A stdin" }],
        examples: ["daoyan workflow apply t2v --ops ./ops.json --json"],
        implemented: true,
        jsonShape: { applied: "number", assigned_ids: "object[]", changed_nodes: "string[]", removed_links: "object[]", warnings: "object[]", graph_sha256: "string" },
        run: (ctx2, args) => runWorkflow(ctx2, ["apply", ...args])
      },
      {
        name: "workflow set",
        group: "workflow",
        summary: "\u5355\u70B9\u8BBE\u7F6E\u8282\u70B9\u8F93\u5165\uFF08\u503C\u6309 JSON \u89E3\u6790\uFF09",
        usage: "daoyan workflow set <name> <nodeId>.<input> <value> [--json]",
        args: [
          { name: "name", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D\u6216\u8DEF\u5F84" },
          { name: "nodeId.input", type: "string", required: true, description: "\u76EE\u6807\u8F93\u5165" },
          { name: "value", type: "string", required: true, description: "JSON \u5B57\u9762\u91CF\u6216\u5B57\u7B26\u4E32" }
        ],
        examples: ["daoyan workflow set t2v 7.seed 42", 'daoyan workflow set t2v 6.text "a dog"'],
        implemented: true,
        run: (ctx2, args) => runWorkflow(ctx2, ["set", ...args])
      },
      {
        name: "workflow validate",
        group: "workflow",
        summary: "\u5355\u56FE\u79BB\u7EBF\u6821\u9A8C\uFF08\u7ED3\u6784/bindings/overrides/\u7F13\u5B58\u76EE\u5F55\uFF09",
        usage: "daoyan workflow validate <name> [--json]",
        args: [{ name: "name", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D\u6216\u8DEF\u5F84" }],
        implemented: true,
        jsonShape: { workflow: "string", ok: "boolean", issues: "Array<{path,code,severity,message,hint}>" },
        run: (ctx2, args) => runWorkflow(ctx2, ["validate", ...args])
      },
      // ---- 生产 ----
      {
        name: "run",
        group: "production",
        summary: "\u6267\u884C\u4E00\u4E2A workflow\uFF08\u9ED8\u8BA4\u5F02\u6B65 task\uFF1B--wait \u624D\u963B\u585E\uFF09",
        usage: "daoyan run <workflow.json|name> [--set nodeId.input=value ...] [--label <label>]\n                  [--engine <url>] [--request-id <id>] [--wait] [--dry-run]\n                  [--timeout <\u5C0F\u65F6>] [--json]",
        args: [{ name: "workflow", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D\u6216\u9879\u76EE\u5185\u76F8\u5BF9\u8DEF\u5F84" }],
        flags: [
          { name: "--set", type: "key=value", description: "\u8986\u76D6\u8282\u70B9\u8F93\u5165\u6216 bindings \u903B\u8F91\u540D\uFF08\u53EF\u91CD\u590D\uFF09" },
          { name: "--label", type: "string", description: "run label\uFF08\u5982 shot:01\uFF09" },
          { name: "--engine", type: "url", description: "\u5355\u6B21 remote \u8986\u76D6 URL" },
          { name: "--request-id", type: "string", description: "\u5E42\u7B49\u952E\uFF1B\u91CD\u590D\u8C03\u7528\u8FD4\u56DE\u540C\u4E00 task" },
          { name: "--wait", type: "boolean", description: "\u524D\u53F0\u7B49\u5F85\u5230\u7EC8\u6001\uFF08SIGINT \u53EA\u505C\u6B62\u7B49\u5F85\uFF09" },
          { name: "--dry-run", type: "boolean", description: "\u53EA\u8F93\u51FA\u89E3\u6790\u540E\u7684\u8BA1\u5212\uFF0C\u4E0D\u5360\u9501\u3001\u4E0D\u6267\u884C" },
          { name: "--timeout", type: "number", description: "\u4EFB\u52A1\u7B49\u5F85\u4E0A\u9650\uFF08\u5C0F\u65F6\uFF0C\u9ED8\u8BA4 3\uFF09" }
        ],
        examples: [
          "daoyan run t2v --set seed=42 --label shot:01 --request-id shot-01 --json",
          "daoyan run workflows/t2v.json --set 7.steps=20 --wait --json"
        ],
        implemented: true,
        jsonShape: TASK_START_SHAPE,
        run: (ctx2, args) => runRun(ctx2, args)
      },
      {
        name: "run cancel",
        group: "production",
        summary: "\u53D6\u6D88\u4E00\u4E2A task\uFF08worker \u6267\u884C interrupt\u2192free\u2192stop\u2192restore\uFF09",
        usage: "daoyan run cancel <task_id> [--json]",
        args: [{ name: "task_id", type: "string", required: true, description: "\u4EFB\u52A1 id" }],
        implemented: true,
        run: (ctx2, args) => runCancel(ctx2, args)
      },
      {
        name: "shot",
        group: "production",
        summary: "\u62CD\u6444\u6307\u5B9A\u955C\u5934\uFF08\u4E00\u4E2A task \u591A\u4E2A run\uFF1B\u9ED8\u8BA4\u5F02\u6B65\uFF09",
        usage: "daoyan shot <\u955C\u53F7...> [--steps N] [--request-id <id>] [--wait] [--timeout <\u5C0F\u65F6>] [--json]",
        args: [{ name: "\u955C\u53F7", type: "string", required: true, variadic: true, description: "shots.json \u4E2D\u7684\u955C\u5934 id" }],
        flags: [
          { name: "--steps", type: "integer", description: "\u8986\u76D6\u91C7\u6837\u6B65\u6570" },
          { name: "--request-id", type: "string", description: "\u5E42\u7B49\u952E" },
          { name: "--wait", type: "boolean", description: "\u524D\u53F0\u7B49\u5F85\u5230\u7EC8\u6001" },
          { name: "--timeout", type: "number", description: "\u4EFB\u52A1\u7B49\u5F85\u4E0A\u9650\uFF08\u5C0F\u65F6\uFF09" }
        ],
        implemented: true,
        jsonShape: TASK_START_SHAPE,
        run: (ctx2, args) => runShot(ctx2, args)
      },
      {
        name: "retake",
        group: "production",
        summary: "\u5F3A\u5236\u91CD\u62CD\u6307\u5B9A\u955C\u5934\uFF08\u5FFD\u7565\u5DF2\u6709\u6210\u529F run\uFF09",
        usage: "daoyan retake <\u955C\u53F7...> [--steps N] [--request-id <id>] [--wait] [--json]",
        args: [{ name: "\u955C\u53F7", type: "string", required: true, variadic: true, description: "shots.json \u4E2D\u7684\u955C\u5934 id" }],
        implemented: true,
        jsonShape: TASK_START_SHAPE,
        run: (ctx2, args) => runShot(ctx2, args, true)
      },
      {
        name: "batch",
        group: "production",
        summary: "\u8FDE\u62CD\u5168\u90E8\u672A\u5B8C\u6210\u955C\u5934\uFF08\u5DF2\u6709\u6210\u529F run \u8DF3\u8FC7\uFF1B\u9ED8\u8BA4\u5F02\u6B65\uFF09",
        usage: "daoyan batch [--request-id <id>] [--wait] [--timeout <\u5C0F\u65F6>] [--json]",
        flags: [
          { name: "--request-id", type: "string", description: "\u5E42\u7B49\u952E" },
          { name: "--wait", type: "boolean", description: "\u524D\u53F0\u7B49\u5F85\u5230\u7EC8\u6001" },
          { name: "--timeout", type: "number", description: "\u4EFB\u52A1\u7B49\u5F85\u4E0A\u9650\uFF08\u5C0F\u65F6\uFF09" }
        ],
        implemented: true,
        jsonShape: TASK_START_SHAPE,
        run: (ctx2, args) => runBatch(ctx2, args)
      },
      {
        name: "wrap",
        group: "production",
        summary: "\u4ECE runs \u9009\u6BB5\u5408\u7247\uFF0C\u5199 final/cut-*.mp4 \u4E0E\u6E05\u5355\uFF08\u4E0D\u5360\u673A\u5668\u9501\uFF09",
        usage: "daoyan wrap [--select <\u955C\u53F7>=<run_id> ...] [--json]",
        flags: [{ name: "--select", type: "\u955C\u53F7=run_id", description: "\u663E\u5F0F\u6307\u5B9A\u67D0\u955C\u4F7F\u7528\u7684 run\uFF08\u53EF\u91CD\u590D\uFF09" }],
        implemented: true,
        jsonShape: { output: "string", manifest: "string", clips: "object[]", missing: "string[]" },
        run: (ctx2, args) => runWrap(ctx2, args)
      },
      // ---- 运维 ----
      {
        name: "status",
        group: "ops",
        summary: "\u88AB\u52A8\u72B6\u6001\u5FEB\u7167\uFF1B--task/--run \u67E5\u770B\u4EFB\u52A1\u4E0E\u8FD0\u884C\u8BE6\u60C5",
        usage: "daoyan status [--json]\ndaoyan status --task <task_id> [--wait] [--timeout <\u79D2>] [--json]\ndaoyan status --run <run_id> [--wait] [--timeout <\u79D2>] [--json]",
        flags: [
          { name: "--task", type: "string", description: "\u67E5\u770B\u4EFB\u52A1" },
          { name: "--run", type: "string", description: "\u67E5\u770B\u5355 run" },
          { name: "--wait", type: "boolean", description: "\u7B49\u5F85\u5230\u7EC8\u6001\uFF08SIGINT \u53EA\u505C\u6B62\u7B49\u5F85\uFF09" },
          { name: "--timeout", type: "number", description: "\u7B49\u5F85\u4E0A\u9650\uFF08\u79D2\uFF09" }
        ],
        examples: ["daoyan status --json", "daoyan status --task t_xxx --wait --json"],
        implemented: true,
        jsonShape: {
          mode: "local|remote",
          engine: "object",
          machine_lock: "object",
          active_task: "object|null",
          synced_running_tasks: "object[]",
          recent_tasks: "object[]",
          gpu: "object",
          skill: "object",
          shots: "object[]"
        },
        run: (ctx2, args) => runStatus(ctx2, args)
      },
      {
        name: "logs",
        group: "ops",
        summary: "\u7ED3\u6784\u5316\u4E8B\u4EF6\u6D41\uFF08--task/--run\uFF09\u6216\u5F15\u64CE/worker \u6587\u672C\u65E5\u5FD7",
        usage: "daoyan logs [-f] [-n N] [--task <task_id> | --run <run_id>] [--json]\ndaoyan logs [-f] [-n N] [--src daoyan-cli|engine|worker|all]",
        flags: [
          { name: "-f", type: "boolean", description: "\u8DDF\u968F\u5230\u7EC8\u6001/\u6301\u7EED\u8F93\u51FA" },
          { name: "-n", type: "integer", default: 100, description: "\u5C3E\u90E8\u6761\u6570" },
          { name: "--task", type: "string", description: "\u4EFB\u52A1\u4E8B\u4EF6\u6D41" },
          { name: "--run", type: "string", description: "\u5355 run \u4E8B\u4EF6" },
          { name: "--src", type: "engine|worker|daoyan-cli|all", enum: ["engine", "worker", "daoyan-cli", "all"], description: "\u6587\u4EF6\u65E5\u5FD7\u6570\u636E\u6E90" }
        ],
        implemented: true,
        run: (ctx2, args) => runLogs(ctx2, args)
      },
      // ---- 引擎 ----
      {
        name: "engine ls",
        group: "engine",
        summary: "\u5217\u51FA\u5F53\u524D\u5F15\u64CE\u3001\u672C\u5730\u7248\u672C\u76EE\u5F55\u4E0E GitHub tags",
        usage: "daoyan engine ls [--json]",
        implemented: true,
        run: (ctx2) => runEngine(ctx2, ["ls"])
      },
      {
        name: "engine install",
        group: "engine",
        summary: "\u5B89\u88C5\u6307\u5B9A ComfyUI \u7248\u672C\u5230 engine/versions/<tag>",
        usage: "daoyan engine install <\u7248\u672C tag> [--json]",
        args: [{ name: "tag", type: "string", required: true, description: "ComfyUI tag" }],
        implemented: true,
        run: (ctx2, args) => runEngine(ctx2, ["install", ...args])
      },
      {
        name: "engine use",
        group: "engine",
        summary: "\u5207\u6362\u672C\u673A\u4F7F\u7528\u7684 ComfyUI \u7248\u672C/\u8DEF\u5F84",
        usage: "daoyan engine use <\u7248\u672C tag|\u8DEF\u5F84> [--json]",
        args: [{ name: "tag|path", type: "string", required: true, description: "\u5DF2\u5B89\u88C5\u7248\u672C tag \u6216\u5305\u542B main.py \u7684\u76EE\u5F55" }],
        implemented: true,
        run: (ctx2, args) => runEngine(ctx2, ["use", ...args])
      },
      // ---- 元 ----
      {
        name: "help",
        group: "meta",
        summary: "\u5E2E\u52A9\u4E0E\u673A\u5668\u81EA\u63CF\u8FF0\uFF08--json \u8F93\u51FA\u547D\u4EE4/\u53C2\u6570/Schema/\u9519\u8BEF\u76EE\u5F55\uFF09",
        usage: "daoyan help [\u547D\u4EE4] [--json]",
        implemented: true,
        run: (ctx2, args) => runHelp(ctx2, args, COMMANDS, VERSION)
      },
      {
        name: "update",
        group: "meta",
        summary: "\u81EA\u5347\u7EA7\uFF08\u68C0\u6D4B GitHub \u6700\u65B0 tag\uFF1B--check \u4EC5\u68C0\u6D4B\uFF09",
        usage: "daoyan update [--check]",
        flags: [{ name: "--check", type: "boolean", description: "\u53EA\u68C0\u6D4B\u4E0D\u5B89\u88C5" }],
        implemented: true,
        run: (ctx2, args) => runUpdate(ctx2, args)
      }
    ];
  }
});

// src/cli.mts
init_registry();
init_errors();
init_json();
init_help();

// src/shared/context.mts
function defaultJsonMode(isTTY, env) {
  if (env.DYCLI_OUTPUT === "json") return true;
  if (env.DYCLI_OUTPUT === "text") return false;
  return !isTTY;
}

// src/cli.mts
init_log();
init_version();
init_signals();
init_worker();
async function main(ctx2, argv) {
  const rest = [];
  let sawCommand = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === void 0) break;
    if (a === "--json") {
      ctx2.json = true;
      setLogJsonMode(true);
      continue;
    }
    if (a === "--no-json") {
      ctx2.json = false;
      setLogJsonMode(false);
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
      runHelp(ctx2, [], COMMANDS, VERSION);
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
  setLogJsonMode(ctx2.json);
  if (name === void 0) {
    runHelp(ctx2, [], COMMANDS, VERSION);
    return 0;
  }
  if (name === "__worker") {
    const taskDir2 = process.env.DYCLI_TASK_DIR;
    const token = process.env.DYCLI_LOCK_TOKEN;
    if (taskDir2 === void 0 || taskDir2 === "" || token === void 0 || token === "") {
      throw new DaoyanCliError({
        code: "worker_start_failed",
        message: "__worker \u7F3A\u5C11 DYCLI_TASK_DIR / DYCLI_LOCK_TOKEN"
      });
    }
    return runWorker({ taskDir: taskDir2, token });
  }
  if (name === "help") {
    runHelp(ctx2, cmdArgs, COMMANDS, VERSION);
    return 0;
  }
  const found = findCommand(name, cmdArgs);
  if (found === null) {
    throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5\u547D\u4EE4 ${name}\uFF1Bdaoyan help \u67E5\u770B\u5168\u90E8`, exit: 2 });
  }
  const code = await found.meta.run(ctx2, found.rest);
  return typeof code === "number" ? code : 0;
}
var ctx = {
  json: defaultJsonMode(Boolean(process.stdout.isTTY), process.env),
  noColor: false
};
installSignalHandlers();
try {
  process.exitCode = await main(ctx, process.argv.slice(2));
} catch (e) {
  if (e instanceof DaoyanCliError) {
    if (ctx.json) emitError(e);
    else {
      process.stderr.write(`ERROR[${e.code}] ${e.message}
`);
      if (e.hint !== "") process.stderr.write(`hint: ${e.hint}
`);
      if (e.nextActions !== void 0) process.stderr.write(`next: ${e.nextActions.join(" | ")}
`);
    }
    process.exitCode = e.exit;
  } else {
    process.stderr.write(`FATAL ${e instanceof Error ? e.stack ?? e.message : String(e)}
`);
    process.exitCode = 1;
  }
}
//# sourceMappingURL=cli.mjs.map