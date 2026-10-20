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
    VERSION = "0.1.0";
  }
});

// src/shared/groups.mts
var GROUP_LABEL;
var init_groups = __esm({
  "src/shared/groups.mts"() {
    "use strict";
    GROUP_LABEL = {
      project: "\u9879\u76EE",
      story: "\u5267\u672C\u4E0E\u8BBE\u5B9A",
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
      "web_start_failed",
      // 剧本 / 设定集
      "story_not_found",
      "episode_not_found",
      "episode_required",
      "story_conflict",
      "story_invalid",
      "story_stale",
      "story_gate_failed",
      "asset_not_found",
      "asset_invalid",
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
      provision_failed: {
        retryable: true,
        hint: "\u6309 details.stage\uFF08ensurepip/venv/torch/requirements/pip_check/smoke\uFF09\u5B9A\u4F4D\uFF1B\u4E0D\u8981\u624B\u5DE5\u731C torch \u7248\u672C\uFF0C\u7528 --torch-index / --torch-cuda / --torch-cpu\u3002"
      },
      artifact_download_failed: {
        retryable: true,
        hint: "\u5F15\u64CE\u4EA7\u7269\u4ECD\u5728 scratch \u4E2D\uFF1B\u68C0\u67E5 /view \u53EF\u8FBE\u6027\u540E\u91CD\u8BD5\uFF0C\u6216\u624B\u52A8\u53D6\u56DE\u3002"
      },
      web_start_failed: {
        retryable: false,
        hint: "\u68C0\u67E5\u76D1\u542C\u5730\u5740\u4E0E\u7AEF\u53E3\u5360\u7528\uFF1B\u7AEF\u53E3\u51B2\u7A81\u65F6\u7701\u7565 --port \u8BA9\u7CFB\u7EDF\u5206\u914D\uFF0C\u6216\u6539\u7528 --port <n>\u3002"
      },
      story_not_found: {
        retryable: false,
        hint: "\u5148\u8FD0\u884C daoyan story init \u542F\u7528\u591A\u96C6\u5267\u672C\u4E0E\u8BBE\u5B9A\u96C6\u3002",
        nextActions: ["story init"]
      },
      episode_not_found: {
        retryable: false,
        hint: "\u7528 story episode list \u67E5\u770B\u53EF\u7528\u5267\u96C6\uFF0C\u6216\u5148 story episode add\u3002",
        nextActions: ["story episode list --json"]
      },
      episode_required: {
        retryable: false,
        hint: "\u591A\u96C6\u9879\u76EE\u5FC5\u987B\u7528 --episode <id> \u6307\u5B9A\u76EE\u6807\u96C6\uFF1B\u5355\u96C6\u9879\u76EE\u53EF\u7701\u7565\u3002",
        nextActions: ["story status --json", "story episode list --json"]
      },
      story_conflict: {
        retryable: true,
        retryAfterMs: 0,
        hint: "\u6587\u4EF6\u5DF2\u88AB\u5176\u5B83\u4FEE\u6539\uFF1B\u91CD\u65B0\u8BFB\u53D6\u6700\u65B0\u5185\u5BB9\u540E\u91CD\u8BD5\u3002"
      },
      story_invalid: {
        retryable: false,
        hint: "\u6309 details.issues / details.references \u4FEE\u6B63\u5267\u672C\u3001\u8BBE\u5B9A\u96C6\u3001\u62C6\u89E3\u6216\u5206\u955C\u540E\u91CD\u8BD5\u3002"
      },
      story_stale: {
        retryable: false,
        hint: "\u8BE5\u96C6\u62C6\u89E3\u6216\u5206\u955C\u57FA\u4E8E\u65E7\u5267\u672C\uFF1B\u91CD\u65B0\u62C6\u89E3 / \u66F4\u65B0\u5206\u955C\uFF0C\u6216\u663E\u5F0F\u5141\u8BB8 stale\u3002"
      },
      story_gate_failed: {
        retryable: false,
        hint: "\u6309 details.blockers \u4FEE\u590D\u5267\u672C\u3001\u62C6\u89E3\u3001\u8D44\u4EA7\u6216\u5DE5\u4F5C\u6D41\u540E\u518D\u62CD\u6444\u3002",
        nextActions: ["story status --episode <id> --json"]
      },
      asset_not_found: {
        retryable: false,
        hint: "\u68C0\u67E5 owner / asset id / run \u4EA7\u7269\u540D\uFF1B\u7528 story asset list \u67E5\u770B\u5DF2\u6709\u8D44\u4EA7\u3002"
      },
      asset_invalid: {
        retryable: false,
        hint: "\u68C0\u67E5\u6587\u4EF6\u7C7B\u578B\u3001\u5927\u5C0F\u3001\u8DEF\u5F84\u4E0E\u54C8\u5E0C\uFF1B\u91CD\u65B0\u751F\u6210\u6216\u8F6C\u6362\u683C\u5F0F\u540E\u91CD\u8BD5\u3002"
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
  process.stdout.write(JSON.stringify({ ok: false, schema_version: SCHEMA_VERSION, error }) + "\n");
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
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
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
var PROJECT_FILE, SHOTS_FILE, STORY_DIR, STORY_SERIES_FILE, STORY_CHARACTERS_FILE, STORY_SCENES_FILE, STORY_VOICES_FILE, STORY_ASSETS_DIR, EPISODES_DIR, EPISODE_META_FILE, SCRIPT_TEXT_FILE, SCRIPT_FILE, BREAKDOWN_FILE, WORKFLOWS_DIR, BINDINGS_SUFFIX, INPUTS_DIR, TASKS_DIR, RUNS_DIR, FINAL_DIR, SKILL_DIR, AGENTS_FILE, MACHINE_FILE, CATALOG_FILE, EXTRA_MODELS_FILE, LOG_DIR, ENGINE_PID_FILE, TASK_FILE, EVENTS_FILE, RUN_FILE, RUN_WORKFLOW_FILE, RUN_INPUTS_FILE, CANCEL_FILE, CONCAT_LIST_FILE, RELAY_DIR;
var init_types = __esm({
  "src/core/project/types.mts"() {
    "use strict";
    PROJECT_FILE = "project.json";
    SHOTS_FILE = "shots.json";
    STORY_DIR = "story";
    STORY_SERIES_FILE = "story/series.json";
    STORY_CHARACTERS_FILE = "story/characters.json";
    STORY_SCENES_FILE = "story/scenes.json";
    STORY_VOICES_FILE = "story/voices.json";
    STORY_ASSETS_DIR = "story/assets";
    EPISODES_DIR = "episodes";
    EPISODE_META_FILE = "episode.json";
    SCRIPT_TEXT_FILE = "script.md";
    SCRIPT_FILE = "script.json";
    BREAKDOWN_FILE = "breakdown.json";
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
  if (o.story !== void 0) {
    if (typeof o.story !== "object" || o.story === null) return false;
    const s = o.story;
    if (s.enforce !== void 0 && s.enforce !== "strict" && s.enforce !== "warn" && s.enforce !== "off") {
      return false;
    }
  }
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
    story_lifecycle: "multi-episode",
    web_ui: "read-only",
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
      "Only one generation task runs per machine; if you get `machine_busy`, inspect the owner and retry later.",
      "For multi-episode projects, use `daoyan story` commands and pass `--episode <id>` to shot/batch/wrap; check `story status` before generation."
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
        story: {
          type: "object",
          additionalProperties: false,
          properties: {
            enforce: { enum: ["strict", "warn", "off"], default: "strict" }
          }
        },
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
      required: ["task_id", "kind", "machine_id", "status", "mode", "runs", "created_at", "next_actions", "options"],
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
    "> local init \u4F1A\u63A2\u6D4B NVIDIA \u9A71\u52A8/CUDA/compute capability\uFF0C\u81EA\u52A8\u5B89\u88C5\u5339\u914D\u7684 torch\uFF08\u5982 cu130\uFF09\uFF1B**\u4E0D\u8981\u624B\u5DE5 `pip install torch`\uFF0C\u4E5F\u4E0D\u8981\u731C cuXXX**\u3002\u666E\u901A\u4F9D\u8D56\u9ED8\u8BA4\u963F\u91CC\u4E91 PyPI\uFF0C\u5931\u8D25\u81EA\u52A8\u56DE\u9000\u5B98\u65B9 PyPI\uFF1B\u53EF\u7528 `--mirror` / `--fallback-mirror` / `--torch-index` / `--torch-cuda` / `--torch-cpu` \u8986\u76D6\u3002",
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
    "## \u591A\u96C6\u77ED\u5267\u751F\u547D\u5468\u671F",
    "",
    "```text",
    "story init \u2192 \u5168\u5C40\u89D2\u8272/\u573A\u666F/\u97F3\u8272 \u2192 \u5355\u96C6\u5267\u672C sync/approve \u2192 \u5355\u96C6 breakdown \u2192 \u53C2\u8003\u8D44\u4EA7 \u2192 \u5355\u96C6 shots \u2192 \u5206\u955C\u5DE5\u4F5C\u6D41 \u2192 shot/batch --episode \u2192 wrap --episode",
    "```",
    "",
    "- \u5168\u5C40\u8BBE\u5B9A\u96C6\u5728 `story/`\uFF0C\u8DE8\u96C6\u5171\u4EAB\uFF1B\u6BCF\u96C6\u6570\u636E\u5728 `episodes/<id>/`\uFF1B",
    "- \u6BCF\u96C6\u5267\u672C\u72EC\u7ACB revision\uFF1B\u5267\u672C\u53D8\u66F4\u53EA\u8BA9\u8BE5\u96C6 breakdown/shots stale\uFF1B",
    "- \u591A\u96C6\u9879\u76EE\u5199\u5165 / \u751F\u4EA7 / \u5355\u96C6 show \u5FC5\u987B\u663E\u5F0F `--episode`\uFF1B\u53EA\u8BFB\u7CFB\u5217\u6982\u89C8\u53EF\u7701\u7565\uFF1B",
    "- \u53C2\u8003\u8D44\u4EA7\u5FC5\u987B\u7531 AI / \u7528\u6237\u663E\u5F0F\u6307\u5B9A\u4E3B\u53C2\u8003\uFF0C\u4E0D\u5B58\u5728\u81EA\u52A8\u53D6\u7B2C\u4E00\u5F20\uFF1B",
    "- `shot` / `batch` / `retake` \u6709\u5267\u60C5\u95E8\u7981\uFF1B`run` \u4E0D\u53D7\u9650\uFF0C\u7528\u4E8E\u751F\u6210\u53C2\u8003\u56FE\u6216\u8BD5\u9A8C\u3002",
    "",
    "\u5B8C\u6574\u6D41\u7A0B\u3001\u6A21\u677F\u4E0E\u6062\u590D\u89C1 `reference/story.md`\u3002",
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
    "- `update_failed`\uFF1AGitHub \u76F4\u8FDE\u5931\u8D25\u65F6\u9ED8\u8BA4\u5C1D\u8BD5\u5185\u7F6E\u52A0\u901F\u6E90\uFF08`--github-proxy none` \u53EF\u5173\u95ED\uFF09\uFF1B\u4ECD\u5931\u8D25\u65F6\u7528 `--manifest` \u6307\u5411\u53EF\u8FBE\u955C\u50CF\uFF0C\u4E0D\u8981\u624B\u5DE5\u66FF\u6362\u5B89\u88C5\u5305\u3002",
    "- `provision_failed`\uFF1A\u5148\u770B `details.stage`\u3002`ensurepip` \u7F3A\u5305\u6309\u4E0B\u4E00\u884C\u5904\u7406\uFF1B`torch` / `smoke` \u8868\u793A\u9A71\u52A8\u4E0E wheel \u4E0D\u5339\u914D\uFF0C\u6309 `details.next_actions` \u7528 `--torch-cuda` / `--torch-index` / `--torch-cpu` \u6062\u590D\uFF0C**\u4E0D\u8981\u81EA\u884C\u731C\u6D4B\u6216\u624B\u5DE5\u5B89\u88C5 torch**\u3002",
    "- `provision_failed` \u4E14\u65E5\u5FD7\u542B `ensurepip is not available` / `Failing command: .../.venv/bin/python3`\uFF1AUbuntu/Debian \u7F3A\u5C11 `python3.X-venv`\uFF1B\u5B89\u88C5\u5BF9\u5E94\u5305\u3001\u5220\u9664\u534A\u6210\u54C1 `engine/.venv` \u540E\u91CD\u8DD1 `daoyan init`\u3002\u5B8C\u6574\u6B65\u9AA4\u89C1 `reference/lifecycle.md`\u3002",
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
    "- `reference/story.md`\uFF1A\u591A\u96C6\u5267\u672C\u3001\u62C6\u89E3\u3001\u8BBE\u5B9A\u8D44\u4EA7\u3001\u5206\u955C\u95E8\u7981\u4E0E\u5267\u96C6\u751F\u547D\u5468\u671F",
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
- \u4F9D\u8D56\u5B89\u88C5\u9ED8\u8BA4\u4F7F\u7528\u963F\u91CC\u4E91 PyPI\uFF08\`https://mirrors.aliyun.com/pypi/simple/\`\uFF09\uFF0C\u5931\u8D25\u81EA\u52A8\u56DE\u9000\u5B98\u65B9 PyPI\uFF1B\u53EF\u7528 \`--mirror\` / \`--fallback-mirror\` \u8986\u76D6\uFF1B
- torch \u7531 \`init\` \u6839\u636E\u9A71\u52A8\u81EA\u52A8\u9009\u62E9 CUDA tag\uFF0C\u4E0D\u9700\u8981\u4E5F\u4E0D\u5141\u8BB8\u624B\u5DE5\u5B89\u88C5\uFF1B
- \u552F\u4E00\u4F8B\u5916\uFF1A\`workflow nodes --refresh\` \u7684 metadata session\uFF08\u4E0D\u52A0\u8F7D\u6A21\u578B\uFF0C\u53D6\u5B8C /object_info \u7ACB\u5373\u505C\u6B62\uFF09\u3002

### init \u7684 Python/torch \u5DE5\u5177\u94FE

\`daoyan init --mode=local\` \u4E0E \`daoyan engine install\` \u5171\u7528\u540C\u4E00\u5957\u903B\u8F91\uFF1A

1. \u68C0\u67E5 venv \u7684 \`python\` / \`pip\`\uFF1B\u4E0D\u5B8C\u6574\u5219\u5220\u9664 \`engine/.venv\` \u91CD\u5EFA\uFF08\u53EA\u5220 dycli \u7BA1\u7406\u7684 venv\uFF09\uFF1B
2. \u521B\u5EFA venv \u524D\u68C0\u67E5 \`ensurepip\`\uFF0C\u7F3A\u5C11\u65F6\u7ED9\u51FA\u4E0E Python \u7248\u672C\u5339\u914D\u7684 \`python3.X-venv\` \u547D\u4EE4\uFF1B
3. \u8BFB\u53D6 \`nvidia-smi\` \u7684\u9A71\u52A8\u7248\u672C\u3001CUDA \u4E0A\u9650\u3001compute capability\uFF08\u591A\u5361\u53D6\u6700\u4F4E\uFF09\uFF1B
4. \u5728 PyTorch index \u4E2D\u9009\u62E9 \`cuXXX <= \u9A71\u52A8 CUDA\` \u4E14\u5B58\u5728\u5F53\u524D Python ABI / manylinux wheel \u7684\u6700\u9AD8 tag\uFF1B
5. \u5148\u88C5 torch/torchvision\uFF0C\u518D\u88C5 requirements\uFF1Bcustom nodes \u5B89\u88C5\u540E\u91CD\u65B0 \`pip check\` + \u81EA\u68C0\uFF1B
6. CUDA \u81EA\u68C0\u4F1A\u771F\u5B9E\u5206\u914D\u663E\u5B58\uFF08\u4E0D\u662F\u53EA\u770B \`torch.cuda.is_available()\`\uFF09\uFF1B
7. \u5168\u90E8\u901A\u8FC7\u540E\u5199 \`engine/.venv/.dycli-toolchain.json\`\uFF08Python\u3001\u5E73\u53F0\u3001ComfyUI tag\u3001requirements \u54C8\u5E0C\u3001\u9A71\u52A8\u3001tag\u3001torch \u7248\u672C\uFF09\u3002

\u590D\u7528\u6761\u4EF6\uFF08\u7F3A\u4E00\u4E0D\u53EF\uFF09\uFF1Avenv \u5065\u5EB7\u3001marker \u5B58\u5728\u4E14 Python/\u5E73\u53F0/ComfyUI tag/requirements/custom nodes \u54C8\u5E0C\u4E00\u81F4\u3001\`pip check\` \u901A\u8FC7\u3001\u81EA\u68C0\u901A\u8FC7\u3002\u5426\u5219\u91CD\u65B0\u5B89\u88C5\u4F9D\u8D56\uFF0C**\u4E0D\u4F1A\u8FD4\u56DE\u5047\u6210\u529F**\u3002

\u5E38\u7528\u8986\u76D6\u53C2\u6570\uFF08\u4F18\u5148\u7EA7 CLI > \u73AF\u5883\u53D8\u91CF > \u9ED8\u8BA4\u503C\uFF09\uFF1A

| \u53C2\u6570 | \u73AF\u5883\u53D8\u91CF | \u9ED8\u8BA4 |
|---|---|---|
| \`--mirror <url>\` | \`DYCLI_PIP_MIRROR\` | \u963F\u91CC\u4E91 PyPI |
| \`--fallback-mirror <url\\|none>\` | \`DYCLI_PIP_FALLBACK_MIRROR\` | \u5B98\u65B9 PyPI |
| \`--torch-index <url>\` | \`DYCLI_TORCH_INDEX\` | \`https://download.pytorch.org/whl\` |
| \`--torch-cuda <cuXXX>\` | \`DYCLI_TORCH_CUDA\` | \u81EA\u52A8\u63A2\u6D4B |
| \`--torch-cpu\` | \`DYCLI_TORCH_CPU=1\` | \u5173\u95ED |
| \`--no-cache\` | \u2014 | \u5173\u95ED |

\u5931\u8D25\u65F6\u8BFB\u53D6 \`provision_failed.details\`\uFF1A\`stage\`\uFF08ensurepip/venv/torch/requirements/requirements_conflict/pip_check/smoke/smoke_final\uFF09\u3001\`driver\`\u3001\`cuda_max\`\u3001\`compute_cap\`\u3001\`torch_tag\`\u3001\`attempted_tags\`\u3001\`last_error\`\u3001\`offending_nodes\`\u3001\`next_actions\`\u3002Agent \u53EA\u6309\u8FD9\u4E9B\u5B57\u6BB5\u6062\u590D\uFF0C\u4E0D\u8981\u731C torch \u7248\u672C\u3002

### init \u5931\u8D25\uFF1Aensurepip is not available

\u75C7\u72B6\uFF08\`daoyan init --mode=local\`\uFF09\uFF1A

\`\`\`text
The virtual environment was not created successfully because ensurepip is not
available.
...
Failing command: <\u9879\u76EE>/engine/.venv/bin/python3

ERROR[provision_failed] python3 -m venv \u5931\u8D25\uFF08\u9000\u51FA\u7801 1\uFF09\u3002Ubuntu \u9700 python3-venv \u5305
\`\`\`

\u539F\u56E0\uFF1AUbuntu/Debian \u628A \`venv\` / \`ensurepip\` \u62C6\u6210\u72EC\u7ACB\u5305\uFF1B\`python3 --version\` \u6B63\u5E38\uFF0C\u4F46\u7CFB\u7EDF Python \u6CA1\u6709 pip \u5F15\u5BFC\u6A21\u5757\u3002\u4E0E ComfyUI \u7248\u672C\u3001GPU\u3001k3s \u65E0\u5173\u3002

\u5904\u7406\u6B65\u9AA4\uFF1A

1. \u786E\u8BA4\u89E3\u91CA\u5668\u4E0E\u5B9E\u9645\u7248\u672C\uFF1A

   \`\`\`bash
   which python3
   readlink -f "$(which python3)"
   python3 -c 'import sys; print(sys.executable, sys.version)'
   python3 -m ensurepip --version
   \`\`\`

2. \u5B89\u88C5\u4E0E\u7248\u672C\u5339\u914D\u7684 venv \u5305\uFF08\u793A\u4F8B\u4E3A Python 3.12\uFF1B\u5176\u4ED6\u7248\u672C\u66FF\u6362\u6570\u5B57\uFF09\uFF1A

   \`\`\`bash
   apt-get update
   apt-get install -y python3.12-venv
   # \u6216\u5143\u5305\uFF1Aapt-get install -y python3-venv
   \`\`\`

   \u5982\u679C ComfyUI \u4F9D\u8D56\u9700\u8981\u7F16\u8BD1\uFF0C\u518D\u8865\uFF1A

   \`\`\`bash
   apt-get install -y python3.12-dev build-essential
   \`\`\`

3. \u5220\u9664\u5931\u8D25\u7559\u4E0B\u7684\u534A\u6210\u54C1 venv\uFF08\u91CD\u8981\uFF0C\u5426\u5219 dycli \u53EF\u80FD\u8BEF\u5224\u4E3A\u53EF\u590D\u7528\uFF09\uFF1A

   \`\`\`bash
   rm -rf <\u9879\u76EE>/engine/.venv
   \`\`\`

4. \u91CD\u65B0\u6267\u884C init\uFF08\u9879\u76EE\u9AA8\u67B6\u4F1A\u590D\u7528\uFF0C\u4E0D\u4F1A\u8986\u76D6\u5DF2\u6709 \`project.json\`\uFF09\uFF1A

   \`\`\`bash
   daoyan init --mode=local --modelpath /data/models
   \`\`\`

5. \u9A8C\u8BC1\uFF1A

   \`\`\`bash
   python3 -m ensurepip --version
   python3 -m venv /tmp/venv-test && /tmp/venv-test/bin/pip --version
   rm -rf /tmp/venv-test
   \`\`\`

\u7279\u6B8A\u60C5\u51B5\uFF1A

- **\u65E0 root / \u65E0 sudo**\uFF1A\u4E0D\u8981\u53CD\u590D\u91CD\u8BD5 init\uFF1B\u628A \`python3.X-venv\` \u5B89\u88C5\u547D\u4EE4\u4EA4\u7ED9\u6709\u6743\u9650\u7684\u7528\u6237\u3002
- **\`python3\` \u4E0D\u662F\u7CFB\u7EDF Python**\uFF08pyenv / conda / \`/usr/local/bin/python3\`\uFF09\uFF1Aapt \u5305\u53EF\u80FD\u65E0\u6548\u3002\u68C0\u67E5 \`which python3\`\uFF1B\u6539\u7528\u5E26 \`ensurepip\` \u7684\u89E3\u91CA\u5668\uFF0C\u6216\u4F7F\u7528 \`virtualenv\` / \`uv\`\u3002
- **\u4ECD\u6709\u5176\u4ED6 provision \u5931\u8D25**\uFF1A\u9605\u8BFB\u5B8C\u6574\u9519\u8BEF\u65E5\u5FD7\u4E0E \`hint\`\uFF0C\u4E0D\u8981\u53EA\u6839\u636E\u9000\u51FA\u7801\u731C\u6D4B\u3002

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
- \`provision_failed\` + \`ensurepip is not available\`\uFF1A\u5B89\u88C5 \`python3.X-venv\`\uFF08\u5982 \`python3.12-venv\`\uFF09\uFF0C\u5220\u9664\u534A\u6210\u54C1 \`engine/.venv\`\uFF0C\u91CD\u8DD1 \`daoyan init\`\uFF1B\u8BE6\u89C1 \`reference/lifecycle.md\`\u3002
- \`provision_failed\` + \`details.stage=torch|smoke\`\uFF1A\u9A71\u52A8\u4E0E CUDA wheel \u4E0D\u5339\u914D\uFF1B\u6309 \`details.next_actions\` \u7528 \`--torch-cuda\` / \`--torch-index\` / \`--torch-cpu\`\uFF0C\u4E0D\u8981\u624B\u5DE5\u5B89\u88C5 torch\u3002
- \`provision_failed\` + \`details.stage=requirements_conflict\`\uFF1Arequirements \u56FA\u5B9A\u4E86\u4E0D\u540C torch\uFF1B\u4FEE\u6539 pin \u6216\u663E\u5F0F \`--torch-cpu\`\u3002
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
  "meta": {
    "title": "\u77ED\u7247\u540D",
    "synopsis": "\u4E00\u53E5\u8BDD\u5267\u60C5\u7B80\u4ECB",
    "width": 768,
    "height": 1344,
    "fps": 24,
    "anchors": { "S1": "anchors/scene.png" },
    "characters": [
      { "id": "lin", "name": "\u6797\u9ED8", "description": "\u8C03\u67E5\u5458" }
    ],
    "scenes": [
      { "id": "city", "name": "\u96E8\u591C\u57CE\u5E02", "description": "\u9713\u8679\u4E0E\u79EF\u6C34" }
    ]
  },
  "defaults": { "length": 48, "steps": 30, "cfg": 4.0, "negative": "\u4F4E\u8D28\u91CF" },
  "style_prefix": "\u7535\u5F71\u611F",
  "shots": [
    {
      "id": "01", "slug": "opening", "title": "\u96E8\u591C\u4FE1\u53F7",
      "summary": "\u6797\u9ED8\u5728\u96E8\u591C\u53D1\u73B0\u7EBF\u7D22",
      "seed": 1101, "first_frame": "S1",
      "characters": ["lin"], "scene": "city", "length": 48,
      "prompt": "..."
    },
    {
      "id": "02", "seed": 1102, "first_frame": { "relay": "01" },
      "characters": ["lin"], "scene": "city", "prompt": "..."
    }
  ]
}
\`\`\`

- \`title\` / \`summary\` / \`characters\` / \`scene\` / \`fps\` \u662F\u5C55\u793A\u5B57\u6BB5\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C\uFF1B\`daoyan web\` \u4F1A\u7528\u6765\u751F\u6210\u9879\u76EE\u6863\u6848\u3001\u4EBA\u7269/\u573A\u666F\u548C\u5206\u955C\u9875\uFF1B
- \u4EBA\u7269\u548C\u573A\u666F\u53EF\u5728\u955C\u5934\u91CC\u7528 id \u6216\u540D\u79F0\u5F15\u7528\uFF1B\u6CA1\u6709\u767B\u8BB0\u65F6 web \u663E\u793A\u201C\u672A\u6807\u6CE8\u201D\uFF0C\u4E0D\u5F71\u54CD shot/batch\uFF1B
- \u65E7 \`shots.json\` \u53EF\u4EE5\u4E0D\u52A0\u8FD9\u4E9B\u5B57\u6BB5\uFF0C\u5B8C\u5168\u5411\u540E\u517C\u5BB9\u3002

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
function storyMd() {
  return [
    "# \u591A\u96C6\u77ED\u5267\u751F\u547D\u5468\u671F",
    "",
    "dycli \u4E0D\u5199\u5267\u672C\u3001\u4E0D\u505A\u62C6\u89E3\uFF1B\u5B83\u8D1F\u8D23\u6301\u4E45\u5316\u3001\u6821\u9A8C\u3001\u9636\u6BB5\u95E8\u7981\u4E0E\u6267\u884C\u7559\u6863\u3002",
    "",
    "## \u76EE\u5F55",
    "",
    "```text",
    "story/series.json                 \u7CFB\u5217\u5143\u6570\u636E",
    "story/characters.json             \u5168\u5C40\u89D2\u8272 / \u5F62\u6001 / \u53C2\u8003\u8D44\u4EA7",
    "story/scenes.json                 \u5168\u5C40\u573A\u666F",
    "story/voices.json                 \u5168\u5C40\u97F3\u8272",
    "story/assets/**                   \u53C2\u8003\u56FE / \u97F3\u9891\uFF08LFS\uFF09",
    "episodes/<id>/episode.json        \u5267\u96C6\u5143\u6570\u636E",
    "episodes/<id>/script.md|json      \u5355\u96C6\u5267\u672C\u4E0E revision",
    "episodes/<id>/breakdown.json      \u5355\u96C6\u62C6\u89E3\uFF08\u5236\u4F5C\u8303\u56F4\u4E0E\u5141\u8BB8\u6E05\u5355\uFF09",
    "episodes/<id>/shots.json          \u5355\u96C6\u5206\u955C",
    "final/<id>/cut-*                  \u5355\u96C6\u6210\u7247",
    "```",
    "",
    "## \u786C\u89C4\u5219",
    "",
    "1. \u4EFB\u4F55\u4E00\u96C6\u5267\u672C\u53D8\u5316\u540E\uFF0C\u5148 `story script sync --episode <id> --file <script.md>`\uFF0C\u518D\u7EE7\u7EED\u5176\u5B83\u64CD\u4F5C\u3002",
    "2. \u5267\u672C revision \u53D8\u5316\u540E\uFF0C\u68C0\u67E5\u8BE5\u96C6 `story status`\uFF1Bstale \u7684\u62C6\u89E3 / \u5206\u955C\u5148\u66F4\u65B0\u3002",
    "3. \u672A\u901A\u8FC7\u8BE5\u96C6 blockers \u524D\uFF0C\u4E0D\u6267\u884C `shot` / `batch` / `retake`\u3002",
    "4. \u89D2\u8272 / \u5F62\u6001 / \u573A\u666F / \u97F3\u8272 ID \u4E00\u65E6\u88AB\u5F15\u7528\u4E0D\u53EF\u4FEE\u6539\uFF1B\u6539\u540D\u53EA\u6539 name\u3002",
    "5. \u5168\u5C40\u8BBE\u5B9A\u96C6\u53EA\u7EF4\u62A4\u4E00\u4EFD\uFF1B\u65B0\u9020\u578B\u52A0 form\uFF0C\u65B0\u5730\u70B9\u52A0 scene\uFF0C\u4E0D\u8981\u6309\u96C6\u590D\u5236\u3002",
    "6. \u65B0\u89D2\u8272 / \u5F62\u6001 / \u573A\u666F / \u97F3\u8272\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\uFF0C\u518D\u5199\u672C\u96C6 breakdown\uFF0C\u6700\u540E\u5199 shots\u3002",
    "7. \u5355\u96C6\u62C6\u89E3\u4E0E\u8BBE\u5B9A\u8D44\u4EA7\u672A\u901A\u8FC7\u524D\uFF0C\u4E0D\u5236\u4F5C\u8BE5\u96C6\u5206\u955C\u5DE5\u4F5C\u6D41\uFF1B\u53EF\u4EE5\u5148\u505A\u8BBE\u5B9A\u56FE\u5DE5\u4F5C\u6D41\u5E76\u7528 run \u9A8C\u8BC1\u3002",
    "8. \u53C2\u8003\u56FE / \u97F3\u9891\u5FC5\u987B\u901A\u8FC7 `story asset add` \u5165\u5E93\uFF0C\u5E76\u663E\u5F0F\u6307\u5B9A\u4E3B\u53C2\u8003\uFF08--set-reference \u6216 story asset set-reference\uFF09\uFF1B\u4E0D\u5F97\u4F9D\u8D56\u81EA\u52A8\u53D6\u7B2C\u4E00\u5F20\u3002",
    "9. \u751F\u6210\u53C2\u8003\u56FE\u7528 `run`\uFF0C\u4EA7\u7269\u7528 `story asset add --from-run` \u5165\u5E93\uFF1B\u4E0D\u8981\u624B\u5DE5\u590D\u5236\u5230 story/assets\u3002",
    "10. \u591A\u96C6\u9879\u76EE `shot` / `batch` / `wrap` / \u5355\u96C6\u5199\u5165\u5FC5\u987B\u5E26 --episode\uFF1B\u4E0D\u5F97\u5047\u8BBE\u5F53\u524D\u96C6\u3002",
    "11. \u7528\u6237\u786E\u8BA4\u67D0\u4E00\u96C6\u5267\u672C\u540E\u624D `story script approve`\uFF1BAI \u4E0D\u80FD\u4EE3\u66FF\u7528\u6237\u786E\u8BA4\u3002",
    "12. \u4E0D\u8981\u628A A \u96C6\u7684 run / final \u5F53\u6210 B \u96C6\u7684\u3002",
    "",
    "## \u6807\u51C6\u987A\u5E8F",
    "",
    "```text",
    "story init",
    "\u2192 \u5168\u5C40 characters / scenes / voices",
    "\u2192 \u6BCF\u96C6 script sync \u2192 approve",
    "\u2192 \u6BCF\u96C6 breakdown set",
    "\u2192 story asset add\uFF08\u53C2\u8003\u56FE / \u97F3\u9891\uFF0C\u663E\u5F0F set-reference\uFF09",
    "\u2192 \u6BCF\u96C6 shots set",
    "\u2192 workflow + bindings + <workflow>.assets.json",
    "\u2192 shot / retake / batch --episode",
    "\u2192 wrap --episode",
    "```",
    "",
    "\u53C2\u8003\u56FE\u751F\u6210\u662F\u4F8B\u5916\uFF1A\u4F7F\u7528 `run` \u72EC\u7ACB\u6267\u884C\uFF0C\u4E0D\u7ECF\u8FC7 shot \u95E8\u7981\uFF1B\u4EA7\u7269\u5165\u5E93\u540E\u518D\u5199\u672C\u96C6\u62C6\u89E3 / \u5206\u955C\u3002",
    "",
    "## \u5E38\u7528\u547D\u4EE4",
    "",
    "```bash",
    "daoyan story init",
    'daoyan story episode add --id ep02 --number 2 --title "\u7B2C\u4E8C\u96C6" --json',
    'daoyan story script sync --episode ep01 --file ./ep01.md --summary "\u521D\u7A3F" --source ai --json',
    "daoyan story script approve --episode ep01 --json",
    "daoyan story characters set --file ./characters.json --json",
    "daoyan story scenes set --file ./scenes.json --json",
    "daoyan story voices set --file ./voices.json --json",
    "daoyan story breakdown set --episode ep01 --file ./ep01-breakdown.json --json",
    "daoyan story asset add --owner character:lin-mo --form default --id front --from ./front.png --set-reference --json",
    "daoyan story asset add --owner scene:rain-city --id establishing --from ./city.png --set-reference --json",
    "daoyan story asset add --owner voice:lin-mo-default --id sample --from ./voice.wav --set-reference --json",
    "daoyan story shots set --episode ep01 --file ./ep01-shots.json --json",
    "daoyan story status --episode ep01 --json",
    "daoyan shot 01 --episode ep01 --json",
    "daoyan wrap --episode ep01 --json",
    "```",
    "",
    "## \u5355\u96C6\u62C6\u89E3\u6A21\u677F",
    "",
    "```json",
    "{",
    '  "version": 1,',
    '  "episode_id": "ep01",',
    '  "source_revision": 1,',
    '  "source_sha256": "<script.json.sha256>",',
    '  "beats": [{ "id": "s01", "summary": "\u7535\u8BDD\u4EAD\u53D1\u73B0\u4FE1" }],',
    '  "characters": [{ "id": "lin-mo", "forms": ["night"], "notes": "\u672C\u96C6\u53EA\u6709\u591C\u884C\u5F62\u6001" }],',
    '  "scenes": ["rain-city"],',
    '  "voices": ["lin-mo-default"],',
    '  "notes": ""',
    "}",
    "```",
    "",
    "\u62C6\u89E3\u662F\u5236\u4F5C\u8303\u56F4\u4E0E\u5141\u8BB8\u6E05\u5355\uFF1A\u53EA\u5217\u672C\u96C6\u786E\u5B9E\u9700\u8981\u7684\u5BF9\u8C61\uFF1B\u5206\u955C\u53EA\u80FD\u4F7F\u7528\u8FD9\u91CC\u58F0\u660E\u7684\u89D2\u8272\u3001\u5F62\u6001\u3001\u573A\u666F\u3001\u97F3\u8272\u3002",
    "",
    "## \u5206\u955C\u5F15\u7528",
    "",
    "```json",
    "{",
    '  "id": "01",',
    '  "characters": [{ "id": "lin-mo", "form": "night" }],',
    '  "scene": "rain-city",',
    '  "dialogue": [{ "character": "lin-mo", "text": "\u8FD9\u5C01\u4FE1\u4E0D\u662F\u5199\u7ED9\u6211\u7684\u3002", "voice": "lin-mo-default" }],',
    '  "seed": 1101,',
    '  "prompt": "\u96E8\u591C\u7535\u8BDD\u4EAD\uFF0C\u6797\u9ED8\u7A7F\u9ED1\u8272\u96E8\u8863\uFF0C\u624B\u6301\u65E7\u4FE1\u5C01"',
    "}",
    "```",
    "",
    "## \u5DE5\u4F5C\u6D41\u8D44\u4EA7\u69FD\u4F4D",
    "",
    "`workflows/<name>.assets.json`\uFF1A",
    "",
    "```json",
    "{",
    '  "version": 1,',
    '  "slots": [',
    '    { "name": "hero", "kind": "character", "asset": "reference", "target": "10.image", "required": true },',
    '    { "name": "scene", "kind": "scene", "asset": "reference", "target": "20.image", "required": true },',
    '    { "name": "voice", "kind": "voice", "asset": "reference", "target": "30.audio", "required": false }',
    "  ]",
    "}",
    "```",
    "",
    '\u5206\u955C\u53EF\u7528 asset_slots \u8986\u76D6\uFF1A`"hero": "lin-mo/night@front"`\uFF08owner@asset-id\uFF09\uFF1B`reference` \u8868\u793A\u4F7F\u7528\u663E\u5F0F\u4E3B\u53C2\u8003\u3002',
    "",
    "## \u6062\u590D",
    "",
    "- `episode_required`\uFF1A\u591A\u96C6\u5FC5\u987B\u8865 `--episode`\uFF1B\u5148\u770B `story episode list`\u3002",
    "- `story_gate_failed`\uFF1A\u6309 `details.blockers` \u4FEE\uFF1B\u5148\u8DD1 `story status --episode <id>`\u3002",
    "- `missing_reference`\uFF1A\u5165\u5E93\u8D44\u4EA7\u5E76 `story asset set-reference`\uFF1B\u4E0D\u8981\u7528\u522B\u7684\u56FE\u51D1\u3002",
    "- `story_stale`\uFF1A\u5267\u672C revision \u53D8\u4E86\uFF1B\u91CD\u65B0 breakdown / shots\u3002",
    "- `asset_not_found` / `asset_invalid`\uFF1A\u68C0\u67E5 owner\u3001asset id\u3001LFS \u62C9\u53D6\u4E0E\u6587\u4EF6\u7C7B\u578B\u3002",
    "",
    "## \u6BCF\u6B21\u5BF9\u8BDD\u7ED3\u675F\u524D",
    "",
    "1. \u5982\u679C\u6709\u5267\u672C\u53D8\u66F4\uFF1A`story script sync`\uFF1B",
    "2. \u5982\u679C\u5267\u672C revision \u53D8\u4E86\uFF1A\u68C0\u67E5\u5E76\u66F4\u65B0\u8BE5\u96C6 breakdown / shots\uFF1B",
    "3. `story status --episode <id>` \u786E\u8BA4 blockers\uFF1B",
    "4. \u4E0D\u8981\u53EA\u628A\u6700\u65B0\u5267\u672C\u7559\u5728\u5BF9\u8BDD\u4E0A\u4E0B\u6587\u91CC\u3002",
    ""
  ].join("\n");
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
  files.set("reference/story.md", storyMd());
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
      lines.push(
        `  ${a.name} (${a.type}${a.required === true ? "\uFF0C\u5FC5\u586B" : ""}${a.variadic === true ? "\uFF0C\u53EF\u591A\u4E2A" : ""}) \u2014 ${a.description}`
      );
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

// src/shared/exec.mts
import { spawn } from "child_process";
function execCapture(cmd, args, opts = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env !== void 0 ? { ...process.env, ...opts.env } : void 0,
      stdio: ["ignore", "pipe", "pipe"]
    });
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
function execStream(cmd, args, opts = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const limit = opts.tailBytes ?? 8e3;
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env !== void 0 ? { ...process.env, ...opts.env } : void 0,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let outTail = "";
    let errTail = "";
    const timer = opts.timeoutMs !== void 0 ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs) : void 0;
    child.stdout.on("data", (d) => {
      process.stdout.write(d);
      outTail = appendTail(outTail, d.toString(), limit);
    });
    child.stderr.on("data", (d) => {
      process.stderr.write(d);
      errTail = appendTail(errTail, d.toString(), limit);
    });
    child.on("error", (e) => {
      if (timer !== void 0) clearTimeout(timer);
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `\u65E0\u6CD5\u542F\u52A8 ${cmd}\uFF1A${e.message}` })
      );
    });
    child.on("close", (code) => {
      if (timer !== void 0) clearTimeout(timer);
      resolvePromise({ code: code ?? -1, stdout: outTail, stderr: errTail });
    });
  });
}
function appendTail(current, chunk, limit) {
  const next = current + chunk;
  return next.length > limit ? next.slice(-limit) : next;
}
function execInherit(cmd, args, opts = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env !== void 0 ? { ...process.env, ...opts.env } : void 0,
      stdio: "inherit"
    });
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
import { chmodSync, existsSync as existsSync5, mkdtempSync, readFileSync as readFileSync5, rmSync as rmSync3, statSync, writeFileSync as writeFileSync2 } from "fs";
import { homedir, tmpdir } from "os";
import { basename, dirname as dirname4, isAbsolute as isAbsolute2, join as join3, resolve as resolve2 } from "path";
import { spawn as spawn2 } from "child_process";
function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v);
  return m !== null ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function newer(a, b) {
  return a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
}
function nonEmpty(v) {
  if (v === void 0) return void 0;
  const t = v.trim();
  return t === "" ? void 0 : t;
}
function expandHome(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join3(homedir(), p.slice(2));
  return p;
}
function updateConfigPath() {
  return join3(homedir(), ".dycli", "update.json");
}
function readUpdateConfig() {
  const path = updateConfigPath();
  if (!existsSync5(path)) return {};
  let raw;
  try {
    raw = JSON.parse(readFileSync5(path, "utf8"));
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `\u66F4\u65B0\u914D\u7F6E\u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${path}\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`
    });
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new DaoyanCliError({ code: "config_invalid", message: `\u66F4\u65B0\u914D\u7F6E\u5FC5\u987B\u662F JSON \u5BF9\u8C61\uFF1A${path}` });
  }
  const o = raw;
  if (o.manifest !== void 0 && typeof o.manifest !== "string") {
    throw new DaoyanCliError({ code: "config_invalid", message: `\u66F4\u65B0\u914D\u7F6E manifest \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\uFF1A${path}` });
  }
  if (o.proxy !== void 0 && typeof o.proxy !== "string") {
    throw new DaoyanCliError({ code: "config_invalid", message: `\u66F4\u65B0\u914D\u7F6E proxy \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\uFF1A${path}` });
  }
  const manifest = typeof o.manifest === "string" ? nonEmpty(o.manifest) : void 0;
  const proxy = typeof o.proxy === "string" ? nonEmpty(o.proxy) : void 0;
  return {
    ...manifest !== void 0 ? { manifest } : {},
    ...proxy !== void 0 ? { proxy } : {}
  };
}
function saveUpdateConfig(config) {
  const path = updateConfigPath();
  writeJsonAtomic(path, {
    ...config.manifest !== void 0 ? { manifest: config.manifest } : {},
    ...config.proxy !== void 0 ? { proxy: config.proxy } : {}
  });
  try {
    chmodSync(path, 384);
  } catch {
  }
}
function normalizeProxy(raw) {
  const value = raw.trim();
  if (value === "") usageError("proxy \u4E0D\u80FD\u4E3A\u7A7A");
  const u = (() => {
    try {
      return new URL(value);
    } catch {
      usageError(`proxy \u4E0D\u662F\u5408\u6CD5 URL\uFF1A${value}`);
    }
  })();
  if (!["http:", "https:", "socks5:", "socks5h:"].includes(u.protocol)) {
    usageError(`proxy \u4EC5\u652F\u6301 http/https/socks5/socks5h\uFF08\u6536\u5230 ${u.protocol}\uFF09`);
  }
  if (u.hostname === "") usageError("proxy \u7F3A\u5C11\u4E3B\u673A\u540D");
  return value;
}
function redactProxy(proxy) {
  try {
    const u = new URL(proxy);
    if (u.username === "" && u.password === "") return proxy;
    u.username = "***";
    u.password = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "***";
  }
}
function redactUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.username === "" && u.password === "") return raw;
    u.username = "***";
    u.password = "";
    return u.toString();
  } catch {
    return raw;
  }
}
function isGithubUrl(raw) {
  try {
    const u = new URL(raw);
    return u.hostname === "github.com" || u.hostname === "www.github.com";
  } catch {
    return false;
  }
}
function githubMirrorUrl(base, url) {
  return `${base.replace(/\/+$/, "")}/${url}`;
}
function parseGithubProxyList(raw) {
  const normalized = raw.trim();
  if (normalized.toLowerCase() === DISABLE_GITHUB_PROXY) return [];
  const out = [];
  for (const part of normalized.split(",")) {
    const value = part.trim().replace(/\/+$/, "");
    if (value === "") continue;
    if (!isHttpUrl(value)) usageError(`--github-proxy \u5FC5\u987B\u662F http(s) URL\uFF08\u6536\u5230 ${value}\uFF09`);
    if (!out.includes(value)) out.push(value);
  }
  if (out.length === 0) usageError("--github-proxy \u9700\u8981\u81F3\u5C11\u4E00\u4E2A http(s) URL\uFF0C\u6216\u4F7F\u7528 none \u5173\u95ED");
  return out;
}
function resolveGithubProxies(flags, env, httpProxy) {
  const raw = nonEmpty(flags.githubProxy) ?? nonEmpty(env.DYCLI_UPDATE_GITHUB_PROXY);
  if (raw !== void 0) return parseGithubProxyList(raw);
  if (httpProxy !== void 0) return [];
  return [...DEFAULT_GITHUB_PROXIES];
}
function sameUpdateManifest(a, b) {
  const va = a.version.replace(/^v/i, "");
  const vb = b.version.replace(/^v/i, "");
  return va === vb && a.tgz === b.tgz && (a.sha256 ?? null) === (b.sha256 ?? null);
}
function proxyEnv(proxy) {
  return {
    HTTPS_PROXY: proxy,
    HTTP_PROXY: proxy,
    ALL_PROXY: proxy,
    https_proxy: proxy,
    http_proxy: proxy,
    all_proxy: proxy
  };
}
function safeCurlDetail(stderr, url, proxy) {
  let out = stderr.replaceAll(url, redactUrl(url));
  if (proxy !== void 0) out = out.replaceAll(proxy, redactProxy(proxy));
  return (out.trim().split("\n")[0] ?? "").slice(0, 200);
}
async function fetchText(url, proxy, timeoutMs, headers = {}) {
  if (proxy !== void 0) {
    const args = ["-fsSL", "--connect-timeout", "8", "--max-time", String(Math.ceil(timeoutMs / 1e3))];
    for (const [k, v] of Object.entries(headers)) args.push("-H", `${k}: ${v}`);
    args.push(url);
    const r = await tryExecCapture("curl", args, {
      timeoutMs: timeoutMs + 5e3,
      env: proxyEnv(proxy)
    });
    if (r === null) {
      throw new DaoyanCliError({
        code: "external_tool_missing",
        message: "\u914D\u7F6E\u4EE3\u7406\u540E\u66F4\u65B0\u9700\u8981 curl\uFF1B\u8BF7\u5B89\u88C5 curl\uFF0C\u6216\u6539\u7528\u672C\u5730 --from \u6587\u4EF6"
      });
    }
    if (r.code !== 0) {
      throw new DaoyanCliError({
        code: "update_failed",
        message: `\u8BF7\u6C42\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08curl \u9000\u51FA\u7801 ${r.code}\uFF09`,
        retryable: true,
        hint: safeCurlDetail(r.stderr, url, proxy)
      });
    }
    return r.stdout.replace(/^\uFEFF/, "");
  }
  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u8BF7\u6C42\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`,
      retryable: true
    });
  }
  if (!res.ok) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u8BF7\u6C42\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08HTTP ${res.status}\uFF09`,
      retryable: true
    });
  }
  return (await res.text()).replace(/^\uFEFF/, "");
}
async function downloadToFile(url, dest, proxy, timeoutMs) {
  if (proxy !== void 0) {
    const r = await tryExecCapture(
      "curl",
      [
        "-fsSL",
        "--connect-timeout",
        "8",
        "--max-time",
        String(Math.ceil(timeoutMs / 1e3)),
        "--max-filesize",
        String(MAX_DOWNLOAD_BYTES),
        "-o",
        dest,
        url
      ],
      { timeoutMs: timeoutMs + 5e3, env: proxyEnv(proxy) }
    );
    if (r === null) {
      throw new DaoyanCliError({
        code: "external_tool_missing",
        message: "\u914D\u7F6E\u4EE3\u7406\u540E\u66F4\u65B0\u9700\u8981 curl\uFF1B\u8BF7\u5B89\u88C5 curl\uFF0C\u6216\u6539\u7528\u672C\u5730 --from \u6587\u4EF6"
      });
    }
    if (r.code !== 0) {
      throw new DaoyanCliError({
        code: "update_failed",
        message: `\u4E0B\u8F7D\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08curl \u9000\u51FA\u7801 ${r.code}\uFF09`,
        retryable: true,
        hint: safeCurlDetail(r.stderr, url, proxy)
      });
    }
    return;
  }
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u4E0B\u8F7D\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`,
      retryable: true
    });
  }
  if (!res.ok) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u4E0B\u8F7D\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08HTTP ${res.status}\uFF09`,
      retryable: true
    });
  }
  const len = Number(res.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_DOWNLOAD_BYTES) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `tgz \u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650\uFF08${len} bytes\uFF09`
    });
  }
  writeFileSync2(dest, Buffer.from(await res.arrayBuffer()));
}
async function probeDownloadUrl(url) {
  let res;
  try {
    res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": "daoyan-cli-update" },
      signal: AbortSignal.timeout(DIRECT_PROBE_TIMEOUT_MS)
    });
  } catch (e) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u76F4\u8FDE\u63A2\u6D4B\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`,
      retryable: true
    });
  }
  if (!res.ok && res.status !== 405) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u76F4\u8FDE\u63A2\u6D4B\u5931\u8D25\uFF1A${redactUrl(url)}\uFF08HTTP ${res.status}\uFF09`,
      retryable: true
    });
  }
}
function parseUpdateManifest(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new DaoyanCliError({ code: "update_failed", message: "\u66F4\u65B0\u6E05\u5355\u5FC5\u987B\u662F JSON \u5BF9\u8C61" });
  }
  const o = raw;
  if (o.schema_version !== void 0 && o.schema_version !== 1) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u4E0D\u652F\u6301\u7684\u66F4\u65B0\u6E05\u5355 schema_version\uFF1A${String(o.schema_version)}`
    });
  }
  const versionRaw = typeof o.version === "string" ? o.version.trim() : "";
  if (parseSemver(versionRaw) === null) {
    throw new DaoyanCliError({ code: "update_failed", message: "\u66F4\u65B0\u6E05\u5355\u7F3A\u5C11\u5408\u6CD5 version\uFF08X.Y.Z\uFF09" });
  }
  const tagRaw = typeof o.tag === "string" && o.tag.trim() !== "" ? o.tag.trim() : `v${versionRaw.replace(/^v/i, "")}`;
  const tgzRaw = typeof o.tgz === "string" && o.tgz.trim() !== "" ? o.tgz.trim() : typeof o.asset === "string" ? o.asset.trim() : "";
  if (tgzRaw === "") {
    throw new DaoyanCliError({ code: "update_failed", message: "\u66F4\u65B0\u6E05\u5355\u7F3A\u5C11 tgz" });
  }
  const shaRaw = typeof o.sha256 === "string" ? o.sha256.trim().toLowerCase() : void 0;
  if (shaRaw !== void 0 && !/^[0-9a-f]{64}$/.test(shaRaw)) {
    throw new DaoyanCliError({ code: "update_failed", message: "\u66F4\u65B0\u6E05\u5355 sha256 \u5FC5\u987B\u662F 64 \u4F4D\u5341\u516D\u8FDB\u5236" });
  }
  return {
    schema_version: 1,
    version: versionRaw,
    tag: tagRaw,
    tgz: tgzRaw,
    ...shaRaw !== void 0 ? { sha256: shaRaw } : {}
  };
}
function resolveTgz(source, tgz) {
  if (isHttpUrl(tgz)) return { location: tgz, remote: true };
  if (isHttpUrl(source)) {
    let u;
    try {
      u = new URL(tgz, source);
    } catch {
      throw new DaoyanCliError({ code: "update_failed", message: "\u65E0\u6CD5\u89E3\u6790\u6E05\u5355\u4E2D\u7684 tgz \u5730\u5740" });
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new DaoyanCliError({ code: "update_failed", message: "\u8FDC\u7A0B\u6E05\u5355\u53EA\u5141\u8BB8 http(s) tgz" });
    }
    return { location: u.toString(), remote: true };
  }
  return {
    location: isAbsolute2(tgz) ? tgz : resolve2(dirname4(resolve2(source)), tgz),
    remote: false
  };
}
function parseManifestText(text, label) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u66F4\u65B0\u6E05\u5355\u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${label}\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`
    });
  }
  return parseUpdateManifest(raw);
}
async function loadManifest(source, proxy, githubProxies) {
  const remote = isHttpUrl(source);
  const normalized = remote ? source : resolve2(expandHome(source));
  if (!remote) {
    let st;
    try {
      st = statSync(normalized);
    } catch {
      throw new DaoyanCliError({ code: "update_failed", message: `\u66F4\u65B0\u6E05\u5355\u4E0D\u5B58\u5728\uFF1A${normalized}` });
    }
    if (!st.isFile()) {
      throw new DaoyanCliError({ code: "update_failed", message: `\u66F4\u65B0\u6E05\u5355\u4E0D\u662F\u6587\u4EF6\uFF1A${normalized}` });
    }
    return {
      manifest: parseManifestText(readFileSync5(normalized, "utf8"), normalized),
      source: normalized,
      via_proxy: null
    };
  }
  let directError = null;
  try {
    const text = await fetchText(normalized, proxy, 15e3);
    return { manifest: parseManifestText(text, redactUrl(normalized)), source: normalized, via_proxy: null };
  } catch (e) {
    directError = e;
  }
  if (githubProxies.length === 0 || !isGithubUrl(normalized)) throw directError;
  const results = [];
  const errors = [];
  for (const base of githubProxies) {
    try {
      const text = await fetchText(githubMirrorUrl(base, normalized), proxy, MIRROR_MANIFEST_TIMEOUT_MS);
      results.push({ manifest: parseManifestText(text, redactUrl(base)), via: base });
    } catch (e) {
      errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (results.length === 0) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `\u76F4\u8FDE\u4E0E GitHub \u52A0\u901F\u6E90\u5747\u4E0D\u53EF\u7528\uFF1A${redactUrl(normalized)}`,
      retryable: true,
      hint: "\u53EF\u7528 --github-proxy <url> \u6307\u5B9A\u53EF\u8FBE\u52A0\u901F\u6E90\uFF0C\u6216\u7528 --manifest \u6307\u5411\u955C\u50CF\u6E05\u5355",
      details: {
        direct_error: directError instanceof Error ? directError.message : String(directError),
        mirror_errors: errors
      }
    });
  }
  const first = results[0];
  for (const other of results.slice(1)) {
    if (!sameUpdateManifest(first.manifest, other.manifest)) {
      throw new DaoyanCliError({
        code: "update_failed",
        message: "\u591A\u4E2A GitHub \u52A0\u901F\u6E90\u8FD4\u56DE\u7684\u6E05\u5355\u4E0D\u4E00\u81F4\uFF0C\u5DF2\u62D2\u7EDD\u5B89\u88C5",
        hint: "\u7528 --github-proxy \u6307\u5B9A\u53EF\u4FE1\u52A0\u901F\u6E90\uFF0C\u6216\u7528 --manifest \u6307\u5411\u5B98\u65B9\u955C\u50CF",
        details: {
          mirror_mismatch: true,
          mirrors: results.map((r) => r.via),
          versions: results.map((r) => r.manifest.version)
        }
      });
    }
  }
  return { manifest: first.manifest, source: normalized, via_proxy: first.via };
}
async function latestTag(proxy) {
  try {
    const text = await fetchText(GITHUB_TAGS_API, proxy, 15e3, {
      "user-agent": "daoyan-cli-update",
      accept: "application/vnd.github+json"
    });
    const tags = JSON.parse(text);
    if (!Array.isArray(tags)) return { tag: null, note: "GitHub tags \u54CD\u5E94\u683C\u5F0F\u5F02\u5E38" };
    let best = null;
    for (const t of tags) {
      if (typeof t !== "object" || t === null) continue;
      const name = t.name;
      if (typeof name !== "string") continue;
      const v = parseSemver(name);
      if (v === null) continue;
      if (best === null || newer(v, best.v)) best = { tag: name, v };
    }
    return best === null ? { tag: null, note: "\u4ED3\u5E93\u5C1A\u65E0\u8BED\u4E49\u5316 tag\uFF08vX.Y.Z\uFF09" } : { tag: best.tag, note: "" };
  } catch (e) {
    return { tag: null, note: e instanceof Error ? e.message : String(e) };
  }
}
function spawnCapture(cmd, args, opts = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn2(cmd, args, {
      cwd: opts.cwd,
      env: opts.env !== void 0 ? { ...process.env, ...opts.env } : void 0,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let out = "";
    let errTail = "";
    child.stdout?.on("data", (d) => {
      out += d.toString();
    });
    child.stderr?.on("data", (d) => {
      process.stderr.write(d);
      const next = errTail + d.toString();
      errTail = next.length > 8e3 ? next.slice(-8e3) : next;
    });
    child.on(
      "error",
      (e) => rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `\u65E0\u6CD5\u542F\u52A8 ${cmd}\uFF1A${e.message}` })
      )
    );
    child.on("close", (code) => resolvePromise({ code: code ?? -1, stdout: out, stderr: errTail }));
  });
}
function parseUpdateFlags(args) {
  const out = { check: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === void 0) break;
    const { name, inline } = splitInlineFlag(a);
    if (name === "--check") {
      if (inline !== void 0) usageError("--check \u4E0D\u63A5\u53D7\u53C2\u6570");
      out.check = true;
      continue;
    }
    if (name === "--manifest") {
      const v = takeValue(args, i, inline, "--manifest");
      out.manifest = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--from") {
      const v = takeValue(args, i, inline, "--from");
      out.from = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--sha256") {
      const v = takeValue(args, i, inline, "--sha256");
      const sha = v.value.trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(sha)) usageError("--sha256 \u9700\u8981 64 \u4F4D\u5341\u516D\u8FDB\u5236");
      out.sha256 = sha;
      i += v.skip;
      continue;
    }
    if (name === "--github-proxy") {
      const v = takeValue(args, i, inline, "--github-proxy");
      out.githubProxy = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--proxy") {
      const v = takeValue(args, i, inline, "--proxy");
      out.proxy = normalizeProxy(v.value);
      i += v.skip;
      continue;
    }
    if (name.startsWith("-")) usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
    usageError(`update \u4E0D\u63A5\u53D7\u4F4D\u7F6E\u53C2\u6570\uFF1A${a}`);
  }
  if (out.from !== void 0 && out.manifest !== void 0) {
    usageError("--from \u4E0E --manifest \u4E0D\u80FD\u540C\u65F6\u4F7F\u7528");
  }
  if (out.check && out.from !== void 0) {
    usageError("--check \u4E0D\u80FD\u4E0E --from \u4E00\u8D77\u4F7F\u7528");
  }
  if (out.sha256 !== void 0 && out.from === void 0) {
    usageError("--sha256 \u53EA\u80FD\u4E0E --from \u4E00\u8D77\u4F7F\u7528");
  }
  return out;
}
function resolveUpdateSource(flags, env, config) {
  const envProxyRaw = nonEmpty(env.DYCLI_UPDATE_PROXY);
  const envProxy = envProxyRaw !== void 0 ? normalizeProxy(envProxyRaw) : void 0;
  const standardProxy = nonEmpty(env.HTTPS_PROXY) ?? nonEmpty(env.https_proxy) ?? nonEmpty(env.ALL_PROXY) ?? nonEmpty(env.all_proxy);
  const proxy = flags.proxy ?? envProxy ?? config.proxy ?? standardProxy;
  const proxyField = proxy !== void 0 ? { proxy } : {};
  if (flags.from !== void 0) {
    return {
      kind: "from",
      from: flags.from,
      ...flags.sha256 !== void 0 ? { sha256: flags.sha256 } : {},
      ...proxyField
    };
  }
  if (flags.manifest !== void 0) return { kind: "manifest", manifest: flags.manifest, ...proxyField };
  const envFrom = nonEmpty(env.DYCLI_UPDATE_FROM);
  if (envFrom !== void 0) {
    const envShaRaw = nonEmpty(env.DYCLI_UPDATE_SHA256);
    const envSha = envShaRaw !== void 0 ? envShaRaw.toLowerCase() : void 0;
    if (envSha !== void 0 && !/^[0-9a-f]{64}$/.test(envSha)) {
      throw new DaoyanCliError({
        code: "config_invalid",
        message: "DYCLI_UPDATE_SHA256 \u9700\u8981 64 \u4F4D\u5341\u516D\u8FDB\u5236"
      });
    }
    return {
      kind: "from",
      from: envFrom,
      ...envSha !== void 0 ? { sha256: envSha } : {},
      ...proxyField
    };
  }
  const envManifest = nonEmpty(env.DYCLI_UPDATE_MANIFEST);
  if (envManifest !== void 0) return { kind: "manifest", manifest: envManifest, ...proxyField };
  if (config.manifest !== void 0) return { kind: "manifest", manifest: config.manifest, ...proxyField };
  return { kind: "manifest", manifest: DEFAULT_UPDATE_MANIFEST, fallbackToGithub: true, ...proxyField };
}
async function installTgz(tgzPath) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = await spawnCapture(npm, ["install", "-g", "--ignore-scripts", "--no-audit", "--no-fund", tgzPath]);
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: `npm install -g \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r.code}\uFF09`,
      hint: "EACCES \u65F6\u8003\u8651 nvm \u6216\u81EA\u5B9A\u4E49 npm prefix",
      details: { exit: r.code }
    });
  }
}
function tgzName(location, fallback) {
  try {
    const u = new URL(location);
    const raw = decodeURIComponent(u.pathname.split("/").pop() ?? "");
    const name = basename(raw);
    return /\.(tgz|tar\.gz)$/i.test(name) ? name : fallback;
  } catch {
    const name = basename(location);
    return /\.(tgz|tar\.gz)$/i.test(name) ? name : fallback;
  }
}
async function materializeTgz(resolved, sha2562, proxy, version, tmp, githubProxies, skipDirect = false) {
  if (!resolved.remote) {
    const localPath = resolve2(expandHome(resolved.location));
    let st;
    try {
      st = statSync(localPath);
    } catch {
      throw new DaoyanCliError({ code: "update_failed", message: `tgz \u4E0D\u5B58\u5728\uFF1A${localPath}` });
    }
    if (!st.isFile()) throw new DaoyanCliError({ code: "update_failed", message: `tgz \u4E0D\u662F\u6587\u4EF6\uFF1A${localPath}` });
    if (sha2562 !== void 0) {
      const actual = sha256File(localPath);
      if (actual !== sha2562) {
        throw new DaoyanCliError({
          code: "update_failed",
          message: `SHA-256 \u6821\u9A8C\u5931\u8D25\uFF08\u671F\u671B ${sha2562} / \u5B9E\u9645 ${actual}\uFF09`,
          hint: "\u786E\u8BA4\u4E0B\u8F7D\u6E90\u4E0E\u6E05\u5355\u662F\u5426\u5BF9\u5E94\u540C\u4E00\u7248\u672C"
        });
      }
    }
    return { path: localPath, via_proxy: null };
  }
  const fallback = `daoyan-cli-${version.replace(/^v/i, "")}.tgz`;
  const path = join3(tmp, tgzName(resolved.location, fallback));
  const candidates = [];
  if (!skipDirect) candidates.push({ url: resolved.location, via: null });
  if (githubProxies.length > 0 && isGithubUrl(resolved.location)) {
    for (const base of githubProxies) {
      candidates.push({ url: githubMirrorUrl(base, resolved.location), via: base });
    }
  }
  const errors = [];
  if (candidates.length === 0) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: "\u6CA1\u6709\u53EF\u7528\u7684 tgz \u4E0B\u8F7D\u5730\u5740",
      hint: "\u68C0\u67E5 --github-proxy / \u66F4\u65B0\u6E05\u5355\u914D\u7F6E"
    });
  }
  for (const candidate of candidates) {
    try {
      if (candidate.via === null && proxy === void 0) {
        await probeDownloadUrl(candidate.url);
      }
      rmSync3(path, { force: true });
      await downloadToFile(candidate.url, path, proxy, 12e4);
      if (sha2562 !== void 0) {
        const actual = sha256File(path);
        if (actual !== sha2562) {
          throw new DaoyanCliError({
            code: "update_failed",
            message: `SHA-256 \u6821\u9A8C\u5931\u8D25\uFF08\u671F\u671B ${sha2562} / \u5B9E\u9645 ${actual}\uFF09`
          });
        }
      }
      return { path, via_proxy: candidate.via };
    } catch (e) {
      errors.push(`${candidate.via ?? "\u76F4\u8FDE"}: ${e instanceof Error ? e.message : String(e)}`);
      rmSync3(path, { force: true });
    }
  }
  throw new DaoyanCliError({
    code: "update_failed",
    message: `\u4E0B\u8F7D tgz \u5931\u8D25\uFF08\u5DF2\u5C1D\u8BD5 ${candidates.length} \u4E2A\u5730\u5740\uFF09`,
    retryable: true,
    hint: "\u53EF\u7528 --github-proxy <url> \u6307\u5B9A\u52A0\u901F\u6E90\uFF0C\u6216\u7528 --from \u6307\u5B9A\u672C\u5730/\u5176\u4ED6\u6765\u6E90\u7684 tgz",
    details: { errors, sha256: sha2562 }
  });
}
async function updateFromManifest(ctx2, source, checkOnly, githubProxies) {
  let loaded;
  try {
    loaded = await loadManifest(source.manifest, source.proxy, githubProxies);
  } catch (e) {
    const note = e instanceof Error ? e.message : String(e);
    const mismatch = e instanceof DaoyanCliError && typeof e.details === "object" && e.details !== null ? e.details.mirror_mismatch === true : false;
    if (!checkOnly && source.fallbackToGithub === true && !mismatch) {
      if (!ctx2.json) say(`\u9ED8\u8BA4\u66F4\u65B0\u6E90\u4E0D\u53EF\u8FBE\uFF08${note}\uFF09\uFF0C\u56DE\u9000 GitHub tags \u5B89\u88C5 ...`);
      await updateFromGitHub(ctx2, checkOnly, source.proxy);
      return;
    }
    if (checkOnly && mismatch) throw e;
    if (!checkOnly) throw e;
    if (ctx2.json) {
      emitData({
        current: `v${VERSION}`,
        latest: null,
        updateAvailable: false,
        source: "manifest",
        manifest: isHttpUrl(source.manifest) ? redactUrl(source.manifest) : source.manifest,
        via_proxy: null,
        note,
        ...source.proxy !== void 0 ? { proxy: redactProxy(source.proxy) } : {}
      });
      return;
    }
    say(`\u5F53\u524D v${VERSION}\uFF1B\u65E0\u6CD5\u8BFB\u53D6\u66F4\u65B0\u6E90\uFF08${note}\uFF09`);
    return;
  }
  let viaProxy = loaded.via_proxy;
  if (viaProxy !== null && !ctx2.json) {
    say(`GitHub \u76F4\u8FDE\u5931\u8D25\uFF0C\u672C\u6B21\u6E05\u5355\u6765\u81EA\u52A0\u901F\u6E90 ${viaProxy}`);
  }
  const currentStr = `v${VERSION}`;
  const currentV = parseSemver(VERSION);
  const latestV = parseSemver(loaded.manifest.version);
  const hasUpdate = currentV !== null && latestV !== null && newer(latestV, currentV);
  const manifestLabel = isHttpUrl(loaded.source) ? redactUrl(loaded.source) : loaded.source;
  const proxyField = source.proxy !== void 0 ? { proxy: redactProxy(source.proxy) } : {};
  if (checkOnly || !hasUpdate) {
    if (ctx2.json) {
      emitData({
        current: currentStr,
        latest: loaded.manifest.tag,
        updateAvailable: hasUpdate,
        source: "manifest",
        manifest: manifestLabel,
        via_proxy: viaProxy,
        ...proxyField
      });
      return;
    }
    if (hasUpdate) say(`\u6709\u65B0\u7248\u672C ${loaded.manifest.tag}\uFF08\u5F53\u524D ${currentStr}\uFF09\u3002\u8FD0\u884C daoyan update \u5347\u7EA7`);
    else say(`\u5DF2\u662F\u6700\u65B0\uFF08\u5F53\u524D ${currentStr}\uFF0C\u66F4\u65B0\u6E90\u6700\u65B0 ${loaded.manifest.tag}\uFF09`);
    return;
  }
  const resolved = resolveTgz(loaded.source, loaded.manifest.tgz);
  if (resolved.remote && loaded.manifest.sha256 === void 0) {
    throw new DaoyanCliError({
      code: "update_failed",
      message: "\u66F4\u65B0\u6E05\u5355\u7F3A\u5C11 sha256\uFF1B\u8FDC\u7A0B tgz \u5FC5\u987B\u6821\u9A8C",
      hint: "\u5728 latest.json \u4E2D\u52A0\u5165 sha256\uFF0C\u6216\u4F7F\u7528 daoyan update --from \u672C\u5730\u6587\u4EF6"
    });
  }
  say(`\u68C0\u6D4B\u5230\u65B0\u7248\u672C ${loaded.manifest.tag}\uFF08\u5F53\u524D ${currentStr}\uFF09\uFF0C\u5F00\u59CB\u81EA\u5347\u7EA7...`);
  const tmp = mkdtempSync(join3(tmpdir(), "daoyan-cli-update-"));
  try {
    const tgz = await materializeTgz(
      resolved,
      loaded.manifest.sha256,
      source.proxy,
      loaded.manifest.version,
      tmp,
      githubProxies,
      loaded.via_proxy !== null
    );
    if (tgz.via_proxy !== null) {
      viaProxy = tgz.via_proxy;
      if (!ctx2.json) say(`tgz \u4E0B\u8F7D\u8D70\u52A0\u901F\u6E90 ${tgz.via_proxy}`);
    }
    await installTgz(tgz.path);
    say(`\u5347\u7EA7\u5B8C\u6210\uFF1A${loaded.manifest.tag}\u3002\u9A8C\u8BC1\uFF1Adaoyan --version`);
    if (ctx2.json) {
      emitData({
        updated: loaded.manifest.tag,
        previous: currentStr,
        source: "manifest",
        manifest: manifestLabel,
        via_proxy: viaProxy,
        ...proxyField
      });
    }
  } finally {
    rmSync3(tmp, { recursive: true, force: true });
  }
}
async function updateFromTgz(ctx2, source, githubProxies) {
  const remote = isHttpUrl(source.from);
  if (remote && source.sha256 === void 0) {
    throw new DaoyanCliError({
      code: "usage",
      message: "\u8FDC\u7A0B --from \u9700\u8981 --sha256",
      hint: "\u4ECE\u53D1\u5E03\u9875\u7684 SHA256SUMS \u83B7\u53D6\u6821\u9A8C\u503C\uFF1B\u672C\u5730 tgz \u53EF\u7701\u7565",
      exit: 2
    });
  }
  const location = remote ? source.from : resolve2(expandHome(source.from));
  say(`\u4ECE ${remote ? redactUrl(location) : location} \u5B89\u88C5...`);
  const tmp = mkdtempSync(join3(tmpdir(), "daoyan-cli-update-"));
  try {
    const tgz = await materializeTgz(
      { location, remote },
      source.sha256,
      source.proxy,
      VERSION,
      tmp,
      githubProxies
    );
    if (tgz.via_proxy !== null) {
      if (!ctx2.json) say(`tgz \u4E0B\u8F7D\u8D70\u52A0\u901F\u6E90 ${tgz.via_proxy}`);
    }
    await installTgz(tgz.path);
    say("\u5B89\u88C5\u5B8C\u6210\u3002\u9A8C\u8BC1\uFF1Adaoyan --version");
    if (ctx2.json) {
      emitData({
        installed: true,
        source: "from",
        file: remote ? redactUrl(location) : location,
        via_proxy: tgz.via_proxy
      });
    }
  } finally {
    rmSync3(tmp, { recursive: true, force: true });
  }
}
async function updateFromGitHub(ctx2, checkOnly, proxy) {
  const { tag, note } = await latestTag(proxy);
  const current = parseSemver(VERSION);
  const currentStr = `v${VERSION}`;
  const proxyField = proxy !== void 0 ? { proxy: redactProxy(proxy) } : {};
  if (tag === null) {
    if (ctx2.json) {
      emitData({ current: currentStr, latest: null, note, source: "github", ...proxyField });
      return;
    }
    say(`\u5F53\u524D ${currentStr}\uFF1B\u65E0\u6CD5\u786E\u5B9A\u6700\u65B0\u7248\uFF08${note}\uFF09`);
    return;
  }
  const latestV = parseSemver(tag);
  const hasUpdate = current !== null && latestV !== null && newer(latestV, current);
  if (checkOnly || !hasUpdate) {
    if (ctx2.json) {
      emitData({ current: currentStr, latest: tag, updateAvailable: hasUpdate, source: "github", ...proxyField });
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
    const pack = await spawnCapture(npm, ["pack", "--silent", `git+${REPO_URL}#${tag}`], {
      cwd: tmp,
      ...proxy !== void 0 ? { env: proxyEnv(proxy) } : {}
    });
    if (pack.code !== 0) {
      const sshFallback = /permission denied|publickey|ssh/i.test(pack.stderr);
      throw new DaoyanCliError({
        code: "update_failed",
        message: `npm pack \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${pack.code}\uFF09${sshFallback ? "\uFF1Anpm \u53EF\u80FD\u5728 HTTPS \u5931\u8D25\u540E\u56DE\u9000 SSH" : ""}`,
        hint: sshFallback ? `\u6539\u7528 Release \u6E05\u5355\u7ED5\u8FC7 npm git\uFF1Adaoyan update --manifest ${DEFAULT_UPDATE_MANIFEST}` : "\u53EF\u6539\u7528 daoyan update --manifest \u6216 --from \u6307\u5B9A\u955C\u50CF",
        details: { exit: pack.code, last_error: pack.stderr.trim().slice(-4e3) }
      });
    }
    const tgz = pack.stdout.trim().split("\n").filter((l) => l !== "").pop();
    if (tgz === void 0) {
      throw new DaoyanCliError({ code: "update_failed", message: "npm pack \u672A\u4EA7\u51FA tarball" });
    }
    await installTgz(join3(tmp, tgz));
    say(`\u5347\u7EA7\u5B8C\u6210\uFF1A${tag}\u3002\u9A8C\u8BC1\uFF1Adaoyan --version`);
    if (ctx2.json) emitData({ updated: tag, previous: currentStr, source: "github", ...proxyField });
  } finally {
    rmSync3(tmp, { recursive: true, force: true });
  }
}
function runProxyCommand(ctx2, args) {
  const config = readUpdateConfig();
  if (args.length === 0) {
    const proxy2 = config.proxy ?? null;
    if (ctx2.json) {
      emitData({ proxy: proxy2 !== null ? redactProxy(proxy2) : null, path: updateConfigPath() });
      return;
    }
    say(proxy2 !== null ? `\u66F4\u65B0\u4EE3\u7406\uFF1A${redactProxy(proxy2)}` : "\u66F4\u65B0\u4EE3\u7406\uFF1A\u672A\u8BBE\u7F6E");
    return;
  }
  if (args.length === 1 && args[0] === "--unset") {
    delete config.proxy;
    saveUpdateConfig(config);
    if (ctx2.json) {
      emitData({ proxy: null, path: updateConfigPath() });
      return;
    }
    say("\u66F4\u65B0\u4EE3\u7406\u5DF2\u6E05\u9664");
    return;
  }
  if (args.length !== 1) usageError("\u7528\u6CD5\uFF1Adaoyan update proxy [<url>|--unset]");
  const proxy = normalizeProxy(args[0] ?? "");
  config.proxy = proxy;
  saveUpdateConfig(config);
  if (ctx2.json) {
    emitData({ proxy: redactProxy(proxy), path: updateConfigPath() });
    return;
  }
  say(`\u66F4\u65B0\u4EE3\u7406\u5DF2\u8BBE\u7F6E\uFF1A${redactProxy(proxy)}`);
}
function runSourceCommand(ctx2, args) {
  const config = readUpdateConfig();
  if (args.length === 0) {
    const manifest2 = config.manifest ?? null;
    if (ctx2.json) {
      emitData({ manifest: manifest2 !== null ? redactUrl(manifest2) : null, path: updateConfigPath() });
      return;
    }
    say(
      manifest2 !== null ? `\u66F4\u65B0\u6E90\uFF1A${redactUrl(manifest2)}` : `\u66F4\u65B0\u6E90\uFF1A\u9ED8\u8BA4 Release \u6E05\u5355\uFF08${DEFAULT_UPDATE_MANIFEST}\uFF09`
    );
    return;
  }
  if (args.length === 1 && args[0] === "--unset") {
    delete config.manifest;
    saveUpdateConfig(config);
    if (ctx2.json) {
      emitData({ manifest: null, path: updateConfigPath() });
      return;
    }
    say("\u66F4\u65B0\u6E90\u5DF2\u6062\u590D\u4E3A\u9ED8\u8BA4 Release \u6E05\u5355");
    return;
  }
  if (args.length !== 1) usageError("\u7528\u6CD5\uFF1Adaoyan update source [<manifest>|--unset]");
  const raw = args[0] ?? "";
  const manifest = isHttpUrl(raw) ? raw : resolve2(expandHome(raw));
  if (!isHttpUrl(manifest)) {
    let st;
    try {
      st = statSync(manifest);
    } catch {
      usageError(`\u66F4\u65B0\u6E05\u5355\u4E0D\u5B58\u5728\uFF1A${manifest}`);
    }
    if (!st.isFile()) usageError(`\u66F4\u65B0\u6E05\u5355\u4E0D\u662F\u6587\u4EF6\uFF1A${manifest}`);
  }
  config.manifest = manifest;
  saveUpdateConfig(config);
  if (ctx2.json) {
    emitData({ manifest: redactUrl(manifest), path: updateConfigPath() });
    return;
  }
  say(`\u66F4\u65B0\u6E90\u5DF2\u8BBE\u7F6E\uFF1A${redactUrl(manifest)}`);
}
async function runUpdate(ctx2, args) {
  if (args[0] === "proxy") {
    runProxyCommand(ctx2, args.slice(1));
    return;
  }
  if (args[0] === "source") {
    runSourceCommand(ctx2, args.slice(1));
    return;
  }
  const flags = parseUpdateFlags(args);
  const config = readUpdateConfig();
  const source = resolveUpdateSource(flags, process.env, config);
  const githubProxies = resolveGithubProxies(flags, process.env, source.proxy);
  if (flags.check && source.kind === "from") {
    usageError("--check \u4E0D\u80FD\u4E0E --from / DYCLI_UPDATE_FROM \u4E00\u8D77\u4F7F\u7528");
  }
  if (source.kind === "from") {
    await updateFromTgz(ctx2, source, githubProxies);
    return;
  }
  if (source.kind === "manifest") {
    await updateFromManifest(ctx2, source, flags.check, githubProxies);
    return;
  }
  await updateFromGitHub(ctx2, flags.check, source.proxy);
}
var REPO_URL, GITHUB_TAGS_API, DEFAULT_UPDATE_MANIFEST, DEFAULT_GITHUB_PROXIES, DISABLE_GITHUB_PROXY, MIRROR_MANIFEST_TIMEOUT_MS, DIRECT_PROBE_TIMEOUT_MS, MAX_DOWNLOAD_BYTES;
var init_update = __esm({
  "src/commands/update.mts"() {
    "use strict";
    init_args();
    init_errors();
    init_exec();
    init_fs();
    init_json();
    init_log();
    init_version();
    REPO_URL = "https://github.com/yuanbaobaoo/daoyan-cli.git";
    GITHUB_TAGS_API = "https://api.github.com/repos/yuanbaobaoo/daoyan-cli/tags";
    DEFAULT_UPDATE_MANIFEST = "https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/latest.json";
    DEFAULT_GITHUB_PROXIES = ["https://gh-proxy.com", "https://gh.llkk.cc"];
    DISABLE_GITHUB_PROXY = "none";
    MIRROR_MANIFEST_TIMEOUT_MS = 15e3;
    DIRECT_PROBE_TIMEOUT_MS = 1e4;
    MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
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

// src/core/provision/toolchain.mts
import { existsSync as existsSync6, readFileSync as readFileSync6 } from "fs";
import { join as join4 } from "path";
function parsePythonVersion(raw) {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(raw.trim());
  if (m === null) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = m[3] !== void 0 ? Number(m[3]) : 0;
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;
  return { version: `${major}.${minor}.${patch}`, major, minor, patch };
}
function parseCudaVersion(raw) {
  if (raw === null || raw === void 0) return null;
  const m = /^(\d+)(?:\.(\d+))?$/.exec(raw.trim());
  if (m === null) return null;
  const major = Number(m[1]);
  const minor = m[2] !== void 0 ? Number(m[2]) : 0;
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return { major, minor };
}
function parseCudaTag(tag) {
  const m = /^cu(\d{2,4})$/i.exec(tag.trim());
  if (m === null) return null;
  const digits = m[1];
  const minor = Number(digits.slice(-1));
  const major = Number(digits.slice(0, -1));
  if (!Number.isFinite(major) || !Number.isFinite(minor) || major < 7) return null;
  return { tag: `cu${digits}`, cuda: { major, minor } };
}
function formatCudaVersion(v) {
  return `${v.major}.${v.minor}`;
}
function compareCuda(a, b) {
  return a.major !== b.major ? a.major - b.major : a.minor - b.minor;
}
function parseComputeCap(raw) {
  if (raw === null || raw === void 0) return null;
  const m = /^(\d+)\.(\d+)$/.exec(raw.trim());
  if (m === null) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return major + minor / 10;
}
function tagSupportsArch(tag, computeCap) {
  const cc = parseComputeCap(computeCap);
  if (cc === null) return true;
  return !(tag.cuda.major >= 13 && cc < CUDA13_MIN_COMPUTE);
}
function selectTorchTags(input) {
  const candidates = [];
  const skipped = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of input.available) {
    const parsed = parseCudaTag(raw);
    if (parsed === null) {
      skipped.push({ tag: raw, reason: "\u4E0D\u662F\u5408\u6CD5\u7684 cuXXX tag" });
      continue;
    }
    if (seen.has(parsed.tag)) continue;
    seen.add(parsed.tag);
    if (compareCuda(parsed.cuda, input.cudaMax) > 0) {
      skipped.push({
        tag: parsed.tag,
        reason: `\u9700\u8981 CUDA ${formatCudaVersion(parsed.cuda)}\uFF0C\u9A71\u52A8\u6700\u9AD8 ${formatCudaVersion(input.cudaMax)}`
      });
      continue;
    }
    if (!tagSupportsArch(parsed, input.computeCap)) {
      skipped.push({
        tag: parsed.tag,
        reason: `CUDA ${parsed.cuda.major} \u4E0D\u652F\u6301 compute capability ${input.computeCap ?? "\u672A\u77E5"}`
      });
      continue;
    }
    candidates.push(parsed.tag);
  }
  candidates.sort((a, b) => {
    const left = parseCudaTag(a);
    const right = parseCudaTag(b);
    if (left === null || right === null) return 0;
    return compareCuda(right.cuda, left.cuda);
  });
  return { candidates, skipped };
}
function extractWheelFiles(html) {
  const out = [];
  const re = /href\s*=\s*["']([^"']+\.whl)(?:#[^"']*)?["']/gi;
  let m = re.exec(html);
  while (m !== null) {
    const href = m[1];
    try {
      out.push(decodeURIComponent(href));
    } catch {
      out.push(href);
    }
    m = re.exec(html);
  }
  return out;
}
function wheelMatchesFile(file, kind, python, arch) {
  const base = (file.split("/").pop() ?? file).toLowerCase();
  const token = arch === "x64" ? "x86_64" : arch === "arm64" ? "aarch64" : arch.toLowerCase();
  if (!base.startsWith(`${kind}-`)) return false;
  if (!base.includes(`-cp${python.major}${python.minor}-`)) return false;
  return new RegExp(`(?:manylinux[^/]*|linux)_${token}\\.whl$`).test(base);
}
function wheelHtmlMatches(html, kind, python, arch) {
  const files = extractWheelFiles(html);
  return files.some((f) => wheelMatchesFile(f, kind, python, arch));
}
function proxyFromEnv() {
  return process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.ALL_PROXY ?? process.env.all_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy;
}
function proxyEnv2(proxy) {
  return {
    HTTPS_PROXY: proxy,
    HTTP_PROXY: proxy,
    ALL_PROXY: proxy,
    https_proxy: proxy,
    http_proxy: proxy,
    all_proxy: proxy
  };
}
async function fetchTextViaCurl(url, proxy) {
  const seconds = String(Math.ceil(INDEX_TIMEOUT_MS / 1e3));
  const r = await tryExecCapture(
    "curl",
    ["-fsSL", "--max-time", seconds, "-H", "user-agent: daoyan-cli-toolchain", url],
    { timeoutMs: INDEX_TIMEOUT_MS + 5e3, env: proxyEnv2(proxy) }
  );
  if (r === null) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: "\u68C0\u6D4B\u5230\u4EE3\u7406\u73AF\u5883\u53D8\u91CF\uFF0C\u4F46\u7F3A\u5C11 curl\uFF1B\u5B89\u88C5 curl \u6216\u53D6\u6D88\u4EE3\u7406\u540E\u91CD\u8BD5",
      details: { stage: "index", url }
    });
  }
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `\u65E0\u6CD5\u8BBF\u95EE ${url}\uFF08curl \u9000\u51FA\u7801 ${r.code}\uFF09`,
      details: { stage: "index", url, last_error: r.stderr.trim().slice(-2e3) }
    });
  }
  if (r.stdout.length > INDEX_MAX_BYTES) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `wheel index \u54CD\u5E94\u8FC7\u5927\uFF08${r.stdout.length} bytes\uFF09\uFF1A${url}`,
      details: { stage: "index", url }
    });
  }
  return r.stdout;
}
async function fetchTextWithTimeout(url) {
  const proxy = proxyFromEnv();
  if (proxy !== void 0) return fetchTextViaCurl(url, proxy);
  let res;
  try {
    res = await fetch(url, {
      headers: { "user-agent": "daoyan-cli-toolchain", accept: "text/html" },
      signal: AbortSignal.timeout(INDEX_TIMEOUT_MS)
    });
  } catch (e) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `\u65E0\u6CD5\u8BBF\u95EE ${url}\uFF08${e instanceof Error ? e.message : String(e)}\uFF09`,
      details: { stage: "index", url }
    });
  }
  if (!res.ok) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `\u65E0\u6CD5\u8BBF\u95EE ${url}\uFF08HTTP ${res.status}\uFF09`,
      details: { stage: "index", url, status: res.status }
    });
  }
  const text = await res.text();
  if (text.length > INDEX_MAX_BYTES) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `wheel index \u54CD\u5E94\u8FC7\u5927\uFF08${text.length} bytes\uFF09\uFF1A${url}`,
      details: { stage: "index", url }
    });
  }
  return text;
}
async function discoverCudaTags(indexRoot, fetchText2 = fetchTextWithTimeout) {
  const root = indexRoot.replace(/\/+$/, "");
  let html;
  try {
    html = await fetchText2(`${root}/`);
  } catch (e) {
    return { tags: [], error: e instanceof Error ? e.message : String(e) };
  }
  const found = /* @__PURE__ */ new Set();
  const re = /\bcu\d{2,4}\b/gi;
  let m = re.exec(html);
  while (m !== null) {
    const parsed = parseCudaTag(m[0]);
    if (parsed !== null) found.add(parsed.tag);
    m = re.exec(html);
  }
  return { tags: [...found], error: null };
}
async function checkTagWheels(tag, python, arch, indexRoot, fetchText2 = fetchTextWithTimeout) {
  const root = indexRoot.replace(/\/+$/, "");
  const missing = [];
  let error = null;
  for (const kind of ["torch", "torchvision"]) {
    const url = `${root}/${tag}/${kind}/`;
    try {
      const html = await fetchText2(url);
      if (!wheelHtmlMatches(html, kind, python, arch)) missing.push(kind);
    } catch (e) {
      missing.push(kind);
      error = e instanceof Error ? e.message : String(e);
    }
  }
  return { tag, ok: missing.length === 0, missing, error };
}
function parseNvidiaSmiQuery(stdout) {
  const devices = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const fields = trimmed.split(",").map((f) => f.trim());
    if (fields.length < 2) continue;
    const name = fields[0];
    const driver = fields[1];
    const computeRaw = fields[2] !== void 0 && fields[2] !== "[N/A]" ? fields[2] : null;
    const cudaRaw = fields[3] !== void 0 && fields[3] !== "[N/A]" ? fields[3] : null;
    devices.push({
      name: name === "" ? "NVIDIA GPU" : name,
      driver,
      cuda: cudaRaw !== null && parseCudaVersion(cudaRaw) !== null ? cudaRaw : null,
      computeCap: computeRaw !== null && parseComputeCap(computeRaw) !== null ? computeRaw : null
    });
  }
  return devices;
}
function parseNvidiaSmiText(stdout) {
  const driver = /Driver Version:\s*([\d.]+)/.exec(stdout);
  const cuda = /CUDA Version:\s*([\d.]+)/.exec(stdout);
  return { driver: driver !== null ? driver[1] : null, cuda: cuda !== null ? cuda[1] : null };
}
function inferComputeCap(name) {
  const n = name.toUpperCase();
  const table = [
    { re: /H100|H200|H800|B100|B200|GB200/, cap: "9.0" },
    { re: /RTX\s*50/, cap: "12.0" },
    { re: /RTX\s*40|L40|L4\b/, cap: "8.9" },
    { re: /A100|A30\b/, cap: "8.0" },
    { re: /A10\b|A40|A6000|A5000|RTX\s*30/, cap: "8.6" },
    { re: /RTX\s*20|T4\b|GTX\s*16/, cap: "7.5" },
    { re: /V100/, cap: "7.0" },
    { re: /P100/, cap: "6.0" },
    { re: /P40|P4\b|P6\b|GTX\s*10/, cap: "6.1" },
    { re: /M40|M60/, cap: "5.2" }
  ];
  for (const row of table) {
    if (row.re.test(n)) return row.cap;
  }
  return null;
}
function lowestComputeCap(values) {
  let best = null;
  let bestText = null;
  for (const raw of values) {
    const cc = parseComputeCap(raw);
    if (cc === null) continue;
    if (best === null || cc < best) {
      best = cc;
      bestText = raw;
    }
  }
  return bestText;
}
async function probeNvidiaGpu() {
  const full = await tryExecCapture(
    "nvidia-smi",
    [`--query-gpu=${NVIDIA_QUERY_FIELDS}`, "--format=csv,noheader,nounits"],
    { timeoutMs: PROBE_TIMEOUT_MS }
  );
  let sawCommand = full !== null;
  let devices = full !== null && full.code === 0 ? parseNvidiaSmiQuery(full.stdout) : [];
  if (devices.length === 0) {
    const basic = await tryExecCapture(
      "nvidia-smi",
      [`--query-gpu=${NVIDIA_QUERY_BASIC}`, "--format=csv,noheader,nounits"],
      { timeoutMs: PROBE_TIMEOUT_MS }
    );
    sawCommand = sawCommand || basic !== null;
    devices = basic !== null && basic.code === 0 ? parseNvidiaSmiQuery(basic.stdout) : [];
  }
  const raw = await tryExecCapture("nvidia-smi", [], { timeoutMs: PROBE_TIMEOUT_MS });
  sawCommand = sawCommand || raw !== null;
  const rawInfo = raw !== null && raw.code === 0 ? parseNvidiaSmiText(raw.stdout) : { driver: null, cuda: null };
  if (devices.length === 0) {
    if (rawInfo.driver === null && rawInfo.cuda === null) {
      return sawCommand ? { driver: "unknown", cudaMax: null, computeCap: null, devices: [] } : null;
    }
    return { driver: rawInfo.driver ?? "unknown", cudaMax: rawInfo.cuda, computeCap: null, devices: [] };
  }
  const cudaMax = devices.find((d) => d.cuda !== null)?.cuda ?? rawInfo.cuda;
  const normalized = devices.map((d) => ({
    ...d,
    cuda: d.cuda ?? rawInfo.cuda,
    computeCap: d.computeCap ?? inferComputeCap(d.name)
  }));
  const driver = normalized.find((d) => d.driver !== "")?.driver ?? rawInfo.driver ?? "unknown";
  const computeCap = lowestComputeCap(normalized.map((d) => d.computeCap));
  return { driver, cudaMax, computeCap, devices: normalized };
}
async function inspectTorchPlan(opts) {
  const platform = opts.platform ?? process.platform;
  const arch = opts.arch ?? process.arch;
  const platformLabel = `${platform}-${arch}`;
  const indexRoot = (opts.indexRoot ?? DEFAULT_TORCH_INDEX).replace(/\/+$/, "");
  if (opts.forceCpu === true) {
    return {
      backend: "cpu",
      cpuSource: "forced",
      tag: null,
      indexRoot,
      installIndexUrl: platform === "linux" ? `${indexRoot}/cpu` : null,
      python: opts.python,
      platform: platformLabel,
      arch,
      gpu: null,
      candidates: [],
      attemptedTags: [],
      forced: false
    };
  }
  if (platform !== "linux") {
    return {
      backend: "cpu",
      cpuSource: "platform",
      tag: null,
      indexRoot,
      installIndexUrl: null,
      python: opts.python,
      platform: platformLabel,
      arch,
      gpu: null,
      candidates: [],
      attemptedTags: [],
      forced: false
    };
  }
  const gpu = opts.gpu !== void 0 ? opts.gpu : await probeNvidiaGpu();
  if (opts.forcedCuda !== null && opts.forcedCuda !== void 0 && opts.forcedCuda !== "") {
    const parsed = parseCudaTag(opts.forcedCuda);
    if (parsed === null) {
      throw new DaoyanCliError({
        code: "provision_failed",
        message: `--torch-cuda \u4E0D\u662F\u5408\u6CD5 tag\uFF1A${opts.forcedCuda}\uFF08\u793A\u4F8B cu130\uFF09`,
        details: { stage: "select", tag: opts.forcedCuda }
      });
    }
    return {
      backend: "cuda",
      cpuSource: null,
      tag: parsed.tag,
      indexRoot,
      installIndexUrl: null,
      python: opts.python,
      platform: platformLabel,
      arch,
      gpu,
      candidates: [],
      attemptedTags: [],
      forced: true
    };
  }
  if (gpu === null) {
    return {
      backend: "cpu",
      cpuSource: "no-gpu",
      tag: null,
      indexRoot,
      installIndexUrl: null,
      python: opts.python,
      platform: platformLabel,
      arch,
      gpu: null,
      candidates: [],
      attemptedTags: [],
      forced: false
    };
  }
  return {
    backend: "cuda",
    cpuSource: null,
    tag: null,
    indexRoot,
    installIndexUrl: null,
    python: opts.python,
    platform: platformLabel,
    arch,
    gpu,
    candidates: [],
    attemptedTags: [],
    forced: false
  };
}
async function resolveTorchPlan(opts) {
  const context = await inspectTorchPlan(opts);
  const fetchText2 = opts.fetchText ?? fetchTextWithTimeout;
  if (context.backend === "cpu") return context;
  if (context.forced && context.tag !== null) {
    const check = await checkTagWheels(context.tag, opts.python, context.arch, context.indexRoot, fetchText2);
    if (!check.ok) {
      throw new DaoyanCliError({
        code: "provision_failed",
        message: `\u6307\u5B9A\u7684 ${context.tag} \u6CA1\u6709\u5339\u914D Python ${opts.python.version} / ${context.platform} \u7684 wheel`,
        hint: "\u68C0\u67E5 --torch-index \u662F\u5426\u5305\u542B\u8BE5 tag\uFF0C\u6216\u6539\u7528\u81EA\u52A8\u9009\u62E9",
        details: {
          stage: "select",
          tag: context.tag,
          missing: check.missing,
          python: opts.python.version,
          platform: context.platform,
          torch_index: context.indexRoot,
          last_error: check.error
        }
      });
    }
    return {
      ...context,
      installIndexUrl: `${context.indexRoot}/${context.tag}`,
      candidates: [context.tag],
      attemptedTags: [context.tag]
    };
  }
  const gpu = context.gpu;
  if (gpu === null) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: "\u5DE5\u5177\u94FE\u4E0A\u4E0B\u6587\u7F3A\u5C11 GPU \u4FE1\u606F",
      details: { stage: "probe" }
    });
  }
  const cudaMax = parseCudaVersion(gpu.cudaMax);
  if (cudaMax === null) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `\u65E0\u6CD5\u4ECE\u9A71\u52A8 ${gpu.driver} \u83B7\u53D6 CUDA \u7248\u672C\uFF0C\u65E0\u6CD5\u9009\u62E9 torch wheel`,
      hint: "\u7528 --torch-cuda cuXXX \u663E\u5F0F\u6307\u5B9A\uFF0C\u6216\u5347\u7EA7 NVIDIA \u9A71\u52A8\u540E\u91CD\u8BD5",
      details: {
        stage: "probe",
        driver: gpu.driver,
        compute_cap: gpu.computeCap,
        python: opts.python.version,
        platform: context.platform,
        next_actions: [
          "daoyan init --mode=local --torch-cuda cu124 ...",
          "\u5347\u7EA7 NVIDIA \u9A71\u52A8\u540E\u91CD\u8BD5",
          "daoyan init --mode=local --torch-cpu ..."
        ]
      }
    });
  }
  const discovery = await discoverCudaTags(context.indexRoot, fetchText2);
  const pool = discovery.tags.length > 0 ? discovery.tags : FALLBACK_CUDA_TAGS;
  const selection = selectTorchTags({ available: pool, cudaMax, computeCap: gpu.computeCap });
  if (selection.candidates.length === 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `\u9A71\u52A8 ${gpu.driver}\uFF08CUDA ${formatCudaVersion(cudaMax)}\uFF09\u6CA1\u6709\u53EF\u7528\u7684 CUDA torch tag`,
      hint: "\u7528 --torch-cuda \u663E\u5F0F\u6307\u5B9A\uFF0C\u6216\u5347\u7EA7\u9A71\u52A8\u540E\u91CD\u8BD5",
      details: {
        stage: "select",
        driver: gpu.driver,
        cuda_max: formatCudaVersion(cudaMax),
        compute_cap: gpu.computeCap,
        python: opts.python.version,
        platform: context.platform,
        skipped: selection.skipped,
        torch_index: context.indexRoot,
        index_error: discovery.error,
        next_actions: [
          "daoyan init --mode=local --torch-cuda cu118 ...",
          "\u5347\u7EA7 NVIDIA \u9A71\u52A8\u540E\u91CD\u8BD5",
          "daoyan init --mode=local --torch-cpu ..."
        ]
      }
    });
  }
  const verified = [];
  const attempted = [];
  let lastCheck = null;
  for (const tag2 of selection.candidates.slice(0, MAX_CANDIDATE_CHECKS)) {
    attempted.push(tag2);
    const check = await checkTagWheels(tag2, opts.python, context.arch, context.indexRoot, fetchText2);
    lastCheck = check;
    if (check.ok) {
      verified.push(tag2);
    } else {
      opts.log?.(
        `\u8DF3\u8FC7 ${tag2}\uFF1A\u7F3A\u5C11 ${check.missing.join(" / ")} \u7684 ${opts.python.version}/${context.platform} wheel`
      );
    }
  }
  if (verified.length === 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `\u65E0\u6CD5\u627E\u5230\u4E0E\u9A71\u52A8 ${gpu.driver} / Python ${opts.python.version} \u5339\u914D\u7684 torch wheel`,
      hint: "\u53EF\u6307\u5B9A --torch-index \u955C\u50CF\uFF0C\u6216\u6539\u7528 --torch-cpu\uFF1B\u8BE6\u89C1 details.attempted_tags",
      details: {
        stage: "select",
        driver: gpu.driver,
        cuda_max: formatCudaVersion(cudaMax),
        compute_cap: gpu.computeCap,
        python: opts.python.version,
        platform: context.platform,
        attempted_tags: attempted,
        missing: lastCheck?.missing ?? [],
        torch_index: context.indexRoot,
        index_error: discovery.error,
        last_error: lastCheck?.error ?? null,
        next_actions: [
          "daoyan init --mode=local --torch-index <\u955C\u50CF> ...",
          "daoyan init --mode=local --torch-cuda cu124 ...",
          "\u5347\u7EA7 NVIDIA \u9A71\u52A8\u540E\u91CD\u8BD5",
          "daoyan init --mode=local --torch-cpu ..."
        ]
      }
    });
  }
  const tag = verified[0];
  return {
    ...context,
    tag,
    installIndexUrl: `${context.indexRoot}/${tag}`,
    candidates: verified,
    attemptedTags: attempted
  };
}
function torchPlanForTag(plan, tag) {
  if (plan.tag === tag) return plan;
  return { ...plan, tag, installIndexUrl: `${plan.indexRoot}/${tag}` };
}
function asOptionalString(v) {
  return typeof v === "string" && v !== "" ? v : null;
}
function readToolchainMarker(venvDir) {
  const file = join4(venvDir, TOOLCHAIN_MARKER_FILE);
  if (!existsSync6(file)) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync6(file, "utf8"));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const o = raw;
  if (o.schema_version !== TOOLCHAIN_MARKER_SCHEMA) return null;
  if (o.torch_backend !== "cuda" && o.torch_backend !== "cpu") return null;
  const required = [
    "installed_at",
    "python",
    "platform",
    "comfyui_tag",
    "requirements_sha256",
    "custom_nodes_sha256",
    "torch"
  ];
  for (const key of required) {
    if (typeof o[key] !== "string") return null;
  }
  return {
    schema_version: TOOLCHAIN_MARKER_SCHEMA,
    installed_at: o.installed_at,
    python: o.python,
    platform: o.platform,
    comfyui_tag: o.comfyui_tag,
    requirements_sha256: o.requirements_sha256,
    custom_nodes_sha256: o.custom_nodes_sha256,
    driver: asOptionalString(o.driver),
    cuda_max: asOptionalString(o.cuda_max),
    compute_cap: asOptionalString(o.compute_cap),
    torch_backend: o.torch_backend,
    torch_tag: asOptionalString(o.torch_tag),
    torch_index: asOptionalString(o.torch_index),
    torch: asOptionalString(o.torch),
    torchvision: asOptionalString(o.torchvision)
  };
}
function writeToolchainMarker(venvDir, marker) {
  writeJsonAtomic(join4(venvDir, TOOLCHAIN_MARKER_FILE), marker);
}
function buildToolchainMarker(input) {
  const plan = input.plan;
  return {
    schema_version: TOOLCHAIN_MARKER_SCHEMA,
    installed_at: nowIso(),
    python: plan.python.version,
    platform: plan.platform,
    comfyui_tag: input.comfyuiTag,
    requirements_sha256: input.requirementsSha256,
    custom_nodes_sha256: input.customNodesSha256,
    driver: plan.gpu?.driver ?? null,
    cuda_max: plan.gpu?.cudaMax ?? null,
    compute_cap: plan.gpu?.computeCap ?? null,
    torch_backend: plan.backend,
    torch_tag: plan.backend === "cuda" ? plan.tag : null,
    torch_index: plan.backend === "cuda" ? plan.indexRoot : null,
    torch: input.smoke.torch,
    torchvision: input.smoke.torchvision
  };
}
function markerMismatchReason(marker, expected) {
  if (marker.schema_version !== TOOLCHAIN_MARKER_SCHEMA) return "\u5DE5\u5177\u94FE\u6807\u8BB0 schema \u5DF2\u53D8\u5316";
  if (marker.python !== expected.python) return `Python \u5DF2\u53D8\u5316\uFF08${marker.python} \u2192 ${expected.python}\uFF09`;
  if (marker.platform !== expected.platform) return `\u5E73\u53F0\u5DF2\u53D8\u5316\uFF08${marker.platform} \u2192 ${expected.platform}\uFF09`;
  if (marker.comfyui_tag !== expected.comfyuiTag) {
    return `ComfyUI \u7248\u672C\u5DF2\u53D8\u5316\uFF08${marker.comfyui_tag} \u2192 ${expected.comfyuiTag}\uFF09`;
  }
  if (marker.requirements_sha256 !== expected.requirementsSha256) return "requirements.txt \u5DF2\u53D8\u5316";
  if (marker.custom_nodes_sha256 !== expected.customNodesSha256) return "custom nodes \u914D\u7F6E\u5DF2\u53D8\u5316";
  if (marker.torch_backend !== expected.plan.backend) {
    return `torch \u540E\u7AEF\u5DF2\u53D8\u5316\uFF08${marker.torch_backend} \u2192 ${expected.plan.backend}\uFF09`;
  }
  if (expected.plan.backend === "cuda") {
    const markerTag = marker.torch_tag !== null ? parseCudaTag(marker.torch_tag) : null;
    if (markerTag === null) return "\u5DE5\u5177\u94FE\u6807\u8BB0\u7F3A\u5C11 CUDA tag";
    if (expected.plan.forced) {
      if (marker.torch_tag !== expected.plan.tag) {
        return `\u663E\u5F0F\u6307\u5B9A\u7684 CUDA tag \u5DF2\u53D8\u5316\uFF08${marker.torch_tag} \u2192 ${expected.plan.tag}\uFF09`;
      }
    } else {
      const cudaMax = parseCudaVersion(expected.plan.gpu?.cudaMax ?? null);
      if (cudaMax === null) return "\u65E0\u6CD5\u786E\u8BA4\u5F53\u524D\u9A71\u52A8\u7684 CUDA \u7248\u672C";
      if (compareCuda(markerTag.cuda, cudaMax) > 0) {
        return `torch tag ${marker.torch_tag} \u9700\u8981 CUDA ${formatCudaVersion(markerTag.cuda)}\uFF0C\u9A71\u52A8\u4EC5\u652F\u6301 ${formatCudaVersion(cudaMax)}`;
      }
      if (!tagSupportsArch(markerTag, expected.plan.gpu?.computeCap ?? null)) {
        return `torch tag ${marker.torch_tag} \u4E0E\u5F53\u524D compute capability ${expected.plan.gpu?.computeCap ?? "\u672A\u77E5"} \u4E0D\u517C\u5BB9`;
      }
    }
  }
  if (marker.torch === null) return "\u5DE5\u5177\u94FE\u6807\u8BB0\u7F3A\u5C11 torch \u7248\u672C";
  return null;
}
async function runPipCheck(venvDir) {
  const pip = join4(venvDir, "bin", "pip");
  const r = await execCapture(pip, ["check"], { timeoutMs: PIP_CHECK_TIMEOUT_MS });
  const output2 = `${r.stdout}${r.stderr}`.trim().slice(-4e3);
  return { ok: r.code === 0, output: output2 };
}
function buildSmokeScript(backend) {
  if (backend === "cpu") {
    return [
      "import json",
      'info = {"ok": False, "torch": None, "torchvision": None, "torch_cuda": None, "available": None, "device": None, "error": None}',
      "try:",
      "    import torch",
      '    info["torch"] = torch.__version__',
      '    info["torch_cuda"] = torch.version.cuda',
      "    try:",
      "        import torchvision",
      '        info["torchvision"] = torchvision.__version__',
      "    except Exception as e:",
      '        info["torchvision_error"] = str(e)',
      '    info["ok"] = True',
      "except Exception as e:",
      '    info["error"] = str(e)',
      'print("DYCLI_SMOKE " + json.dumps(info))'
    ].join("\n");
  }
  return [
    "import json",
    'info = {"ok": False, "torch": None, "torchvision": None, "torch_cuda": None, "available": None, "device": None, "error": None}',
    "try:",
    "    import torch",
    '    info["torch"] = torch.__version__',
    '    info["torch_cuda"] = torch.version.cuda',
    "    try:",
    "        import torchvision",
    '        info["torchvision"] = torchvision.__version__',
    "    except Exception as e:",
    '        info["torchvision_error"] = str(e)',
    '    info["available"] = bool(torch.cuda.is_available())',
    '    if not info["available"]:',
    '        raise RuntimeError("torch.cuda.is_available() == False")',
    '    x = torch.zeros(1, device="cuda")',
    "    x.add_(1)",
    "    torch.cuda.synchronize()",
    '    info["device"] = torch.cuda.get_device_name(0)',
    '    info["ok"] = True',
    "except Exception as e:",
    '    info["error"] = str(e)',
    'print("DYCLI_SMOKE " + json.dumps(info))'
  ].join("\n");
}
function classifyCudaError(text) {
  const lower = text.toLowerCase();
  if (lower.includes("driver version is insufficient")) return "driver";
  if (lower.includes("is_available() == false")) return "driver";
  if (lower.includes("no cuda gpus are available") || lower.includes("no cuda-capable device")) return "driver";
  if (lower.includes("no kernel image is available")) return "kernel";
  if (lower.includes("invalid device function")) return "device_function";
  if (lower.includes("out of memory")) return "oom";
  return "unknown";
}
async function runSmokeTest(venvDir, backend) {
  const python = join4(venvDir, "bin", "python");
  const r = await execCapture(python, ["-c", buildSmokeScript(backend)], { timeoutMs: SMOKE_TIMEOUT_MS });
  const line = r.stdout.split("\n").map((l) => l.trim()).find((l) => l.startsWith(SMOKE_PREFIX));
  if (line === void 0) {
    return {
      ok: false,
      torch: null,
      torchvision: null,
      torchCuda: null,
      available: null,
      device: null,
      error: (r.stderr || r.stdout).trim().slice(-2e3) || `python \u9000\u51FA\u7801 ${r.code}`,
      errorClass: backend === "cuda" ? classifyCudaError(r.stderr) : "unknown"
    };
  }
  let raw;
  try {
    raw = JSON.parse(line.slice(SMOKE_PREFIX.length));
  } catch {
    return {
      ok: false,
      torch: null,
      torchvision: null,
      torchCuda: null,
      available: null,
      device: null,
      error: `smoke test \u8F93\u51FA\u4E0D\u662F JSON\uFF1A${line.slice(0, 300)}`,
      errorClass: "unknown"
    };
  }
  const o = typeof raw === "object" && raw !== null ? raw : {};
  const error = asOptionalString(o.error);
  const ok = o.ok === true;
  return {
    ok,
    torch: asOptionalString(o.torch),
    torchvision: asOptionalString(o.torchvision),
    torchCuda: asOptionalString(o.torch_cuda),
    available: typeof o.available === "boolean" ? o.available : null,
    device: asOptionalString(o.device),
    error,
    errorClass: ok ? null : backend === "cuda" ? classifyCudaError(error ?? "") : "unknown"
  };
}
var DEFAULT_TORCH_INDEX, FALLBACK_CUDA_TAGS, TOOLCHAIN_MARKER_FILE, TOOLCHAIN_MARKER_SCHEMA, MAX_CANDIDATE_CHECKS, CUDA13_MIN_COMPUTE, INDEX_TIMEOUT_MS, PROBE_TIMEOUT_MS, SMOKE_TIMEOUT_MS, PIP_CHECK_TIMEOUT_MS, SMOKE_PREFIX, INDEX_MAX_BYTES, NVIDIA_QUERY_FIELDS, NVIDIA_QUERY_BASIC;
var init_toolchain = __esm({
  "src/core/provision/toolchain.mts"() {
    "use strict";
    init_errors();
    init_exec();
    init_fs();
    DEFAULT_TORCH_INDEX = "https://download.pytorch.org/whl";
    FALLBACK_CUDA_TAGS = ["cu130", "cu129", "cu128", "cu126", "cu124", "cu121", "cu118"];
    TOOLCHAIN_MARKER_FILE = ".dycli-toolchain.json";
    TOOLCHAIN_MARKER_SCHEMA = 1;
    MAX_CANDIDATE_CHECKS = 3;
    CUDA13_MIN_COMPUTE = 7.5;
    INDEX_TIMEOUT_MS = 2e4;
    PROBE_TIMEOUT_MS = 2e4;
    SMOKE_TIMEOUT_MS = 18e4;
    PIP_CHECK_TIMEOUT_MS = 12e4;
    SMOKE_PREFIX = "DYCLI_SMOKE ";
    INDEX_MAX_BYTES = 8 * 1024 * 1024;
    NVIDIA_QUERY_FIELDS = "name,driver_version,compute_cap,cuda_version";
    NVIDIA_QUERY_BASIC = "name,driver_version";
  }
});

// src/core/provision/options.mts
function nonEmpty2(raw) {
  if (raw === void 0) return void 0;
  const value = raw.trim();
  return value === "" ? void 0 : value;
}
function normalizeIndexUrl(raw, label, stripSlash = false) {
  const value = raw.trim();
  if (value === "") usageError(`${label} \u4E0D\u80FD\u4E3A\u7A7A`);
  if (!isHttpUrl(value)) usageError(`${label} \u5FC5\u987B\u662F http(s) URL\uFF08\u6536\u5230 ${value}\uFF09`);
  return stripSlash ? value.replace(/\/+$/, "") : value;
}
function trimSlash(url) {
  return url.replace(/\/+$/, "");
}
function isTruthy(raw) {
  if (raw === void 0) return false;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}
function resolveToolchainOptions(cli, env = process.env) {
  const mirrorRaw = cli?.mirror ?? nonEmpty2(env.DYCLI_PIP_MIRROR) ?? DEFAULT_PIP_MIRROR;
  const mirror = normalizeIndexUrl(mirrorRaw, "--mirror");
  const fallbackRaw = cli?.fallbackMirror ?? nonEmpty2(env.DYCLI_PIP_FALLBACK_MIRROR) ?? DEFAULT_PIP_FALLBACK_MIRROR;
  let fallbackMirror = null;
  if (fallbackRaw.trim().toLowerCase() !== DISABLE_VALUE) {
    const fallback = normalizeIndexUrl(fallbackRaw, "--fallback-mirror");
    fallbackMirror = trimSlash(fallback) === trimSlash(mirror) ? null : fallback;
  }
  const torchIndex = normalizeIndexUrl(
    cli?.torchIndex ?? nonEmpty2(env.DYCLI_TORCH_INDEX) ?? DEFAULT_TORCH_INDEX,
    "--torch-index",
    true
  );
  const torchCudaRaw = cli?.torchCuda ?? nonEmpty2(env.DYCLI_TORCH_CUDA);
  const torchCuda = torchCudaRaw !== void 0 && torchCudaRaw.toLowerCase() !== DISABLE_VALUE ? torchCudaRaw.toLowerCase() : null;
  if (torchCuda !== null && parseCudaTag(torchCuda) === null) {
    usageError(`--torch-cuda \u9700\u8981\u5F62\u5982 cu130 \u7684 tag\uFF08\u6536\u5230 ${torchCuda}\uFF09`);
  }
  const torchCpu = cli?.torchCpu === true || isTruthy(nonEmpty2(env.DYCLI_TORCH_CPU));
  if (torchCpu && torchCuda !== null) {
    usageError("--torch-cpu \u4E0E --torch-cuda / DYCLI_TORCH_CUDA \u4E0D\u80FD\u540C\u65F6\u4F7F\u7528");
  }
  return {
    mirror,
    fallbackMirror,
    torchIndex,
    torchCuda,
    torchCpu,
    noCache: cli?.noCache === true
  };
}
function hasToolchainOptions(opts) {
  return Object.values(opts).some((v) => v !== void 0 && v !== false);
}
function applyToolchainFlag(target, name, args, index, inline) {
  if (name === "--torch-cpu") {
    if (inline !== void 0) usageError("--torch-cpu \u4E0D\u63A5\u53D7\u53C2\u6570");
    target.torchCpu = true;
    return { handled: true, skip: 0 };
  }
  if (name === "--no-cache") {
    if (inline !== void 0) usageError("--no-cache \u4E0D\u63A5\u53D7\u53C2\u6570");
    target.noCache = true;
    return { handled: true, skip: 0 };
  }
  const key = VALUE_FLAGS[name];
  if (key === void 0) return { handled: false, skip: 0 };
  const { value, skip } = takeValue(args, index, inline, name);
  target[key] = value;
  return { handled: true, skip };
}
var DEFAULT_PIP_MIRROR, DEFAULT_PIP_FALLBACK_MIRROR, DISABLE_VALUE, VALUE_FLAGS;
var init_options = __esm({
  "src/core/provision/options.mts"() {
    "use strict";
    init_args();
    init_fs();
    init_toolchain();
    DEFAULT_PIP_MIRROR = "https://mirrors.aliyun.com/pypi/simple/";
    DEFAULT_PIP_FALLBACK_MIRROR = "https://pypi.org/simple/";
    DISABLE_VALUE = "none";
    VALUE_FLAGS = {
      "--mirror": "mirror",
      "--fallback-mirror": "fallbackMirror",
      "--torch-index": "torchIndex",
      "--torch-cuda": "torchCuda"
    };
  }
});

// src/core/provision/init-flow.mts
import { existsSync as existsSync7, readFileSync as readFileSync7, readdirSync as readdirSync2, renameSync as renameSync2, rmSync as rmSync4, writeFileSync as writeFileSync3 } from "fs";
import { join as join5 } from "path";
function pipIndexArgs(mirror) {
  const index = mirror !== void 0 && mirror.trim() !== "" ? mirror.trim() : DEFAULT_PIP_MIRROR;
  return ["--index-url", index];
}
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
    ensureDir(join5(root, d));
  }
  const projectFile = join5(root, PROJECT_FILE);
  if (!existsSync7(projectFile)) {
    writeFileAtomically(projectFile, JSON.stringify(projectTemplate(name), null, 2) + "\n");
    created.push(PROJECT_FILE);
  }
  const shotsFile = join5(root, SHOTS_FILE);
  if (!existsSync7(shotsFile)) {
    writeFileAtomically(shotsFile, JSON.stringify(shotsTemplate(), null, 2) + "\n");
    created.push(SHOTS_FILE);
  }
  const wf = join5(root, WORKFLOWS_DIR, "t2v.json");
  if (!existsSync7(wf)) {
    writeFileAtomically(wf, "{}\n");
    created.push(`${WORKFLOWS_DIR}/t2v.json`);
  }
  const ignore = join5(root, ".gitignore");
  if (!existsSync7(ignore)) {
    writeFileAtomically(
      ignore,
      ["engine/", "logs/", ".dycli/", "relay_frames/", "concat_list.txt", "*.log", ".DS_Store", ""].join("\n")
    );
    created.push(".gitignore");
  }
  const attrs = join5(root, ".gitattributes");
  if (!existsSync7(attrs)) {
    writeFileAtomically(
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
  const info = parsePythonVersion(r.stdout);
  if (info === null) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: `\u65E0\u6CD5\u89E3\u6790 python3 \u7248\u672C\uFF1A${r.stdout.trim()}`
    });
  }
  if (info.major < 3 || info.major === 3 && info.minor < 10) {
    throw new DaoyanCliError({
      code: "external_tool_missing",
      message: `python3 \u7248\u672C\u8FC7\u4F4E\uFF08${r.stdout.trim()}\uFF0C\u8981\u6C42 \u2265${MIN_PYTHON}\uFF09`
    });
  }
  log(`python3 \u5C31\u7EEA\uFF1A${r.stdout.trim()}`);
  return info;
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
async function ensurepipPreflight(system, venvDir) {
  const r = await execCapture("python3", ["-c", "import ensurepip"], { timeoutMs: 2e4 });
  if (r.code === 0) return;
  const aptPackage = `python${system.major}.${system.minor}-venv`;
  const platformHint = process.platform === "linux" ? `Ubuntu/Debian \u8BF7\u5B89\u88C5\uFF1Aapt-get install -y ${aptPackage}\uFF08\u6216\u5143\u5305 python3-venv\uFF09` : process.platform === "darwin" ? "macOS \u8BF7\u6267\u884C\uFF1Abrew install python" : `\u8BF7\u5B89\u88C5\u5E26 ensurepip \u7684 Python ${system.major}.${system.minor}`;
  const nextActions = process.platform === "darwin" ? ["brew install python", "rm -rf engine/.venv", "daoyan init --mode=local"] : [`apt-get install -y ${aptPackage}`, "rm -rf engine/.venv", "daoyan init --mode=local"];
  throw new DaoyanCliError({
    code: "provision_failed",
    message: `\u5F53\u524D Python ${system.version} \u7F3A\u5C11 ensurepip\uFF0C\u65E0\u6CD5\u521B\u5EFA\u5E26 pip \u7684 venv\u3002
${platformHint}
\u5B89\u88C5\u540E\u5220\u9664 engine/.venv\uFF0C\u518D\u91CD\u8DD1 daoyan init\u3002`,
    hint: "dycli \u4E0D\u81EA\u52A8\u6267\u884C apt\uFF08\u53EF\u80FD\u89E6\u53D1\u7CFB\u7EDF\u670D\u52A1\u91CD\u542F\uFF09\uFF1B\u5B89\u88C5 venv \u5305\u540E\u91CD\u8BD5\u3002",
    details: {
      stage: "ensurepip",
      python: system.version,
      venv_dir: venvDir,
      last_error: (r.stderr || r.stdout).trim().slice(-2e3),
      ...process.platform === "linux" ? { apt_packages: [aptPackage, "python3-venv"] } : { brew_package: "python" },
      next_actions: nextActions
    },
    nextActions
  });
}
async function venvPythonInfo(venvDir) {
  const python = join5(venvDir, "bin", "python");
  if (!existsSync7(python)) return null;
  const r = await execCapture(python, ["-c", "import sys; print('%d.%d.%d' % sys.version_info[:3])"], {
    timeoutMs: 15e3
  });
  if (r.code !== 0) return null;
  return parsePythonVersion(r.stdout);
}
async function venvReady(venvDir) {
  const info = await venvPythonInfo(venvDir);
  if (info === null) return false;
  if (!existsSync7(join5(venvDir, "bin", "pip"))) return false;
  const r = await execCapture(join5(venvDir, "bin", "python"), ["-m", "pip", "--version"], { timeoutMs: 6e4 });
  return r.code === 0;
}
async function createVenv(root, venvDir, log) {
  if (existsSync7(join5(venvDir, "bin", "python"))) {
    const existing = await venvPythonInfo(venvDir);
    let pipOk = false;
    if (existing !== null) {
      const pip = await execCapture(join5(venvDir, "bin", "python"), ["-m", "pip", "--version"], {
        timeoutMs: 6e4
      });
      pipOk = pip.code === 0 && existsSync7(join5(venvDir, "bin", "pip"));
    }
    if (existing !== null && pipOk) {
      log(`\u590D\u7528\u5DF2\u6709 venv\uFF1A${venvDir}\uFF08Python ${existing.version}\uFF09`);
      return existing;
    }
    log(`\u68C0\u6D4B\u5230\u4E0D\u5B8C\u6574\u7684 venv\uFF08\u7F3A\u5C11\u53EF\u7528 pip\uFF09\uFF0C\u5220\u9664\u540E\u91CD\u5EFA\uFF1A${venvDir}`);
    rmSync4(venvDir, { recursive: true, force: true });
  }
  const system = await detectPython(log);
  await ensurepipPreflight(system, venvDir);
  log(`\u521B\u5EFA\u865A\u62DF\u73AF\u5883 ${venvDir} ...`);
  const r = await execCapture("python3", ["-m", "venv", venvDir], {
    cwd: root,
    timeoutMs: VENV_TIMEOUT_MS
  });
  if (r.code !== 0) {
    rmSync4(venvDir, { recursive: true, force: true });
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `python3 -m venv \u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r.code}\uFF09\u3002Ubuntu \u9700 python3-venv \u5305`,
      details: {
        stage: "venv",
        python: system.version,
        venv_dir: venvDir,
        last_error: (r.stderr || r.stdout).trim().slice(-2e3)
      }
    });
  }
  const info = await venvPythonInfo(venvDir);
  if (info === null || !existsSync7(join5(venvDir, "bin", "pip"))) {
    rmSync4(venvDir, { recursive: true, force: true });
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `venv \u521B\u5EFA\u5B8C\u6210\u4F46\u7F3A\u5C11 python/pip\uFF1A${venvDir}`,
      details: { stage: "venv", python: system.version, venv_dir: venvDir }
    });
  }
  log(`venv \u5C31\u7EEA\uFF1APython ${info.version}`);
  return info;
}
async function cloneRepo(root, repo, target, ref, log) {
  if (existsSync7(join5(target, ".git"))) {
    log(`\u590D\u7528\u5DF2\u6709\u4ED3\u5E93\uFF1A${target}`);
    return;
  }
  if (existsSync7(target)) {
    if (readdirSync2(target).length === 0) {
      rmSync4(target, { recursive: true, force: true });
    } else {
      log(`\u76EE\u5F55\u5DF2\u5B58\u5728\u4E14\u4E0D\u662F git \u68C0\u51FA\uFF0C\u4FDD\u7559\u73B0\u6709\u5185\u5BB9\uFF1A${target}`);
      return;
    }
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
async function runPipAttempt(opts) {
  const pip = join5(opts.venvDir, "bin", "pip");
  const args = [
    "install",
    ...opts.packageArgs,
    ...pipIndexArgs(opts.indexUrl),
    "--retries",
    PIP_RETRIES,
    "--timeout",
    PIP_TIMEOUT_SECONDS,
    ...opts.noCache ? ["--no-cache-dir"] : [],
    ...opts.extraArgs ?? []
  ];
  return execStream(pip, args, { cwd: opts.root, timeoutMs: PIP_INSTALL_TIMEOUT_MS });
}
async function pipInstallWithFallback(opts) {
  const mirrors = [opts.options.mirror];
  if (opts.options.fallbackMirror !== null) mirrors.push(opts.options.fallbackMirror);
  let last = null;
  let lastMirror = opts.options.mirror;
  for (let i = 0; i < mirrors.length; i++) {
    const mirror = mirrors[i];
    opts.log(`${opts.label}\uFF1A\u4F7F\u7528${i === 0 ? "\u4E3B\u6E90" : " fallback \u6E90"} ${mirror} ...`);
    const r = await runPipAttempt({
      root: opts.root,
      venvDir: opts.venvDir,
      packageArgs: opts.packageArgs,
      indexUrl: mirror,
      noCache: opts.options.noCache
    });
    if (r.code === 0) return mirror;
    last = r;
    lastMirror = mirror;
    if (i < mirrors.length - 1) {
      opts.log(`${opts.label} \u4E3B\u6E90\u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r.code}\uFF09\uFF0C\u56DE\u9000 ${mirrors[i + 1]} \u91CD\u8BD5 ...`);
    }
  }
  throw new DaoyanCliError({
    code: "provision_failed",
    message: `${opts.label}\u5B89\u88C5\u5931\u8D25\uFF08\u9000\u51FA\u7801 ${last !== null ? last.code : -1}\uFF0C\u6700\u540E\u4F7F\u7528\u7684\u6E90 ${lastMirror}\uFF09`,
    hint: "\u5DF2\u5C1D\u8BD5\u4E3B\u6E90\u4E0E fallback\uFF1B\u53EF\u7528 --mirror / --fallback-mirror \u6307\u5B9A\u53EF\u8FBE\u955C\u50CF\uFF0C\u6216\u52A0 --no-cache \u91CD\u8BD5",
    details: {
      stage: opts.stage,
      mirrors,
      exit_code: last !== null ? last.code : -1,
      last_error: last !== null ? last.stderr.trim().slice(-4e3) : null
    }
  });
}
async function pipInstall(root, venvDir, options, log, requirements) {
  const req = requirements ?? join5(root, "engine", "ComfyUI", "requirements.txt");
  if (!existsSync7(req)) {
    throw new DaoyanCliError({ code: "provision_failed", message: `\u7F3A\u5C11 ${req}\uFF08clone \u672A\u5B8C\u6210\uFF1F\uFF09` });
  }
  log(`\u5B89\u88C5 ComfyUI \u4F9D\u8D56\uFF08pip install -r ${req}\uFF0C\u53EF\u80FD\u9700\u8981\u4E0B\u8F7D torch\uFF0C\u8017\u65F6\u8F83\u957F\uFF09...`);
  const used = await pipInstallWithFallback({
    root,
    venvDir,
    packageArgs: ["-r", req],
    options,
    log,
    label: "ComfyUI \u4F9D\u8D56",
    stage: "requirements"
  });
  log(`ComfyUI \u4F9D\u8D56\u5B89\u88C5\u5B8C\u6210\uFF08\u6E90\uFF1A${used}\uFF09`);
  return used;
}
async function installCustomNodes(root, venvDir, nodes, options, log, comfyDir = join5(root, "engine", "ComfyUI")) {
  if (nodes.length === 0) return;
  const base = join5(comfyDir, "custom_nodes");
  ensureDir(base);
  for (const node of nodes) {
    const target = join5(base, node.name);
    await cloneRepo(root, node.repo, target, node.ref, log);
    const req = join5(target, "requirements.txt");
    if (existsSync7(req)) {
      log(`\u5B89\u88C5 ${node.name} \u4F9D\u8D56...`);
      const used = await pipInstallWithFallback({
        root,
        venvDir,
        packageArgs: ["-r", req],
        options,
        log,
        label: `custom node ${node.name} \u4F9D\u8D56`,
        stage: `custom_node:${node.name}`
      });
      log(`${node.name} \u4F9D\u8D56\u5B89\u88C5\u5B8C\u6210\uFF08\u6E90\uFF1A${used}\uFF09`);
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
function customNodesHash(nodes, comfyDir) {
  return sha256(
    JSON.stringify(
      nodes.map((n) => {
        const dir = join5(comfyDir, "custom_nodes", n.name);
        const req = join5(dir, "requirements.txt");
        return {
          name: n.name,
          repo: n.repo,
          ref: n.ref ?? null,
          present: existsSync7(dir),
          requirements_sha256: existsSync7(req) ? sha256File(req) : null
        };
      })
    )
  );
}
async function pipShowVersion(venvDir, pkg) {
  const r = await execCapture(join5(venvDir, "bin", "pip"), ["show", pkg], { timeoutMs: 6e4 });
  if (r.code !== 0) return null;
  const m = /^Version:\s*(.+)$/m.exec(r.stdout);
  return m !== null ? m[1].trim() : null;
}
function torchPinsInFile(file) {
  const out = [];
  for (const line of readFileSync7(file, "utf8").split("\n")) {
    const trimmed = (line.split("#")[0] ?? "").trim();
    const m = /^(torch|torchvision)\s*==\s*([^\s;]+)/.exec(trimmed);
    if (m !== null) {
      out.push({ package: m[1], version: m[2] });
    }
  }
  return out;
}
async function assertRequirementsCompatible(reqFile, venvDir, plan) {
  if (plan.backend === "cpu" && plan.cpuSource !== "forced") return;
  const pins = torchPinsInFile(reqFile);
  if (pins.length === 0) return;
  const conflicts = [];
  for (const pin of pins) {
    const installed = await pipShowVersion(venvDir, pin.package);
    if (installed === null) continue;
    const installedBase = installed.split("+")[0] ?? installed;
    const pinBase = pin.version.split("+")[0] ?? pin.version;
    if (installedBase !== pinBase) conflicts.push({ package: pin.package, pin: pin.version, installed });
  }
  if (conflicts.length === 0) return;
  throw new DaoyanCliError({
    code: "provision_failed",
    message: "requirements.txt \u56FA\u5B9A\u4E86\u4E0E\u6240\u9009 CUDA torch \u4E0D\u4E00\u81F4\u7684\u7248\u672C\uFF0C\u5DF2\u505C\u6B62\u4EE5\u907F\u514D\u8986\u76D6",
    hint: "\u4FEE\u6539 requirements.txt \u7684 torch/torchvision pin\uFF0C\u6216\u4F7F\u7528 --torch-cpu \u663E\u5F0F\u5B89\u88C5 CPU \u7248",
    details: {
      stage: "requirements_conflict",
      torch_tag: plan.tag,
      torch_index: plan.indexRoot,
      conflicts
    }
  });
}
async function installTorch(opts) {
  if (opts.plan.installIndexUrl === null) {
    opts.log("\u4F7F\u7528\u5E73\u53F0\u9ED8\u8BA4 torch\uFF08\u4E0D\u9884\u88C5\u72EC\u7ACB wheel\uFF09");
    return;
  }
  const label = opts.plan.backend === "cuda" ? `torch\uFF08${opts.plan.tag}\uFF09` : "torch\uFF08CPU\uFF09";
  opts.log(`\u5B89\u88C5 ${label}\uFF1Aindex ${opts.plan.installIndexUrl}${opts.forceReinstall ? "\uFF08\u5F3A\u5236\u91CD\u88C5\uFF09" : ""} ...`);
  const r = await runPipAttempt({
    root: opts.root,
    venvDir: opts.venvDir,
    packageArgs: ["torch", "torchvision"],
    indexUrl: opts.plan.installIndexUrl,
    ...opts.forceReinstall ? { extraArgs: ["--force-reinstall"] } : {},
    noCache: opts.options.noCache
  });
  if (r.code !== 0) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `${label} \u5B89\u88C5\u5931\u8D25\uFF08\u9000\u51FA\u7801 ${r.code}\uFF09`,
      hint: "\u68C0\u67E5 --torch-index \u662F\u5426\u53EF\u8FBE\uFF0C\u6216\u6539\u7528 --torch-cpu\uFF1B\u4E5F\u53EF\u662F\u9A71\u52A8\u4E0E wheel \u4E0D\u5339\u914D",
      details: {
        stage: "torch",
        driver: opts.plan.gpu?.driver ?? null,
        cuda_max: opts.plan.gpu?.cudaMax ?? null,
        compute_cap: opts.plan.gpu?.computeCap ?? null,
        python: opts.plan.python.version,
        platform: opts.plan.platform,
        torch_tag: opts.plan.tag,
        torch_index: opts.plan.installIndexUrl,
        last_error: r.stderr.trim().slice(-4e3),
        next_actions: [
          "daoyan init --mode=local --torch-index <\u955C\u50CF> ...",
          "\u5347\u7EA7 NVIDIA \u9A71\u52A8\u540E\u91CD\u8BD5",
          "daoyan init --mode=local --torch-cpu ..."
        ]
      }
    });
  }
}
function smokeFailureError(plan, smoke, opts) {
  return new DaoyanCliError({
    code: "provision_failed",
    message: `torch \u5B89\u88C5\u540E\u81EA\u68C0\u5931\u8D25\uFF1A${smoke.error ?? "\u672A\u77E5\u9519\u8BEF"}`,
    hint: "\u6309 details \u5224\u65AD\u662F\u9A71\u52A8/CUDA \u4E0D\u5339\u914D\u8FD8\u662F custom node \u8986\u76D6\u4E86 torch\uFF1B\u4E0D\u8981\u624B\u5DE5\u731C\u7248\u672C",
    details: {
      stage: opts.stage,
      driver: plan.gpu?.driver ?? null,
      cuda_max: plan.gpu?.cudaMax ?? null,
      compute_cap: plan.gpu?.computeCap ?? null,
      python: plan.python.version,
      platform: plan.platform,
      torch_tag: plan.tag,
      torch: smoke.torch,
      torch_cuda: smoke.torchCuda,
      torchvision: smoke.torchvision,
      available: smoke.available,
      error_class: smoke.errorClass,
      attempted_tags: opts.attemptedTags,
      offending_nodes: opts.offendingNodes ?? [],
      next_actions: [
        "daoyan init --mode=local --torch-cuda cu124 ...",
        "daoyan init --mode=local --torch-index <\u955C\u50CF> ...",
        "\u5347\u7EA7 NVIDIA \u9A71\u52A8\u540E\u91CD\u8BD5",
        "daoyan init --mode=local --torch-cpu ..."
      ]
    }
  });
}
async function installTorchAndVerify(opts) {
  if (opts.plan.backend === "cpu" && opts.plan.cpuSource !== "forced") {
    opts.log("\u672A\u68C0\u6D4B\u5230 NVIDIA GPU\uFF1A\u8DF3\u8FC7 torch \u9884\u5B89\u88C5\uFF0C\u7531 requirements \u5B89\u88C5\u5E73\u53F0\u9ED8\u8BA4\u7248\u672C");
    return { plan: opts.plan, smoke: null };
  }
  if (opts.plan.backend === "cpu") {
    await installTorch({ ...opts, forceReinstall: false });
    const smoke = await runSmokeTest(opts.venvDir, "cpu");
    if (!smoke.ok) throw smokeFailureError(opts.plan, smoke, { stage: "smoke", attemptedTags: [] });
    return { plan: opts.plan, smoke };
  }
  for (let i = 0; i < opts.plan.candidates.length; i++) {
    const tag = opts.plan.candidates[i];
    const plan = torchPlanForTag(opts.plan, tag);
    await installTorch({ ...opts, plan, forceReinstall: i > 0 });
    const smoke = await runSmokeTest(opts.venvDir, "cuda");
    if (smoke.ok) return { plan, smoke };
    const retryable = smoke.errorClass === "driver" || smoke.errorClass === "kernel" || smoke.errorClass === "device_function";
    if (!retryable || i === opts.plan.candidates.length - 1) {
      throw smokeFailureError(plan, smoke, {
        stage: "smoke",
        attemptedTags: opts.plan.candidates.slice(0, i + 1)
      });
    }
    opts.log(`CUDA \u81EA\u68C0\u5931\u8D25\uFF08${smoke.errorClass}\uFF09\uFF0C\u6539\u7528\u66F4\u4F4E tag ${opts.plan.candidates[i + 1]} \u91CD\u8BD5\u4E00\u6B21 ...`);
  }
  throw smokeFailureError(
    opts.plan,
    {
      ok: false,
      torch: null,
      torchvision: null,
      torchCuda: null,
      available: null,
      device: null,
      error: "\u6CA1\u6709\u53EF\u7528\u7684 CUDA \u5019\u9009 tag",
      errorClass: "unknown"
    },
    { stage: "smoke", attemptedTags: opts.plan.candidates }
  );
}
function offendingNodes(nodes, comfyDir, installedTorch) {
  if (installedTorch === null) return [];
  const installedBase = installedTorch.split("+")[0] ?? installedTorch;
  const out = [];
  for (const node of nodes) {
    const req = join5(comfyDir, "custom_nodes", node.name, "requirements.txt");
    if (!existsSync7(req)) continue;
    const conflicts = torchPinsInFile(req).some(
      (p) => p.package === "torch" && (p.version.split("+")[0] ?? p.version) !== installedBase
    );
    if (conflicts) out.push(node.name);
  }
  return out;
}
function logToolchainPlan(plan, log) {
  if (plan.backend === "cuda") {
    log(
      `\u5DE5\u5177\u94FE\uFF1A\u9A71\u52A8 ${plan.gpu?.driver ?? "unknown"}\uFF0CCUDA \u2264 ${plan.gpu?.cudaMax ?? "unknown"}\uFF0Ccompute ${plan.gpu?.computeCap ?? "unknown"}${plan.tag !== null ? ` \u2192 ${plan.tag}` : ""}`
    );
    return;
  }
  const reason = plan.cpuSource === "forced" ? "\u663E\u5F0F --torch-cpu" : plan.cpuSource === "platform" ? "\u975E Linux \u5E73\u53F0" : "\u672A\u68C0\u6D4B\u5230 NVIDIA GPU";
  log(`\u5DE5\u5177\u94FE\uFF1ACPU \u6A21\u5F0F\uFF08${reason}\uFF09`);
}
function summarizeToolchain(marker, reused) {
  return {
    python: marker.python,
    platform: marker.platform,
    driver: marker.driver,
    cuda_max: marker.cuda_max,
    compute_cap: marker.compute_cap,
    torch_backend: marker.torch_backend,
    torch_tag: marker.torch_tag,
    torch: marker.torch,
    torchvision: marker.torchvision,
    reused
  };
}
async function provisionEngine(opts) {
  const venvDir = join5(opts.baseDir, ".venv");
  const comfyDir = join5(opts.baseDir, "ComfyUI");
  await cloneRepo(opts.root, COMFY_REPO, comfyDir, opts.version, opts.log);
  let switched = false;
  if (existsSync7(join5(comfyDir, ".git"))) {
    switched = await checkoutComfyVersion(comfyDir, opts.version, opts.log);
  } else if (!existsSync7(join5(comfyDir, "main.py"))) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: `ComfyUI \u76EE\u5F55\u65E0\u6548\uFF1A${comfyDir}\uFF08\u7F3A\u5C11 main.py\uFF09`
    });
  } else {
    opts.log("ComfyUI \u76EE\u5F55\u4E0D\u662F git \u68C0\u51FA\uFF0C\u8DF3\u8FC7\u7248\u672C\u5207\u6362\uFF08\u53EF\u7528 engine use \u6307\u5411\u5176\u4ED6\u76EE\u5F55\uFF09");
  }
  const reqFile = join5(comfyDir, "requirements.txt");
  if (!existsSync7(reqFile)) {
    throw new DaoyanCliError({ code: "provision_failed", message: `\u7F3A\u5C11 ${reqFile}\uFF08clone \u672A\u5B8C\u6210\uFF1F\uFF09` });
  }
  const requirementsSha = sha256File(reqFile);
  const nodes = opts.project.comfyui?.custom_nodes ?? [];
  const nodesSha = customNodesHash(nodes, comfyDir);
  const options = resolveToolchainOptions(opts.toolchain);
  const healthy = await venvReady(venvDir);
  let python;
  if (healthy) {
    const info = await venvPythonInfo(venvDir);
    if (info === null) {
      throw new DaoyanCliError({ code: "provision_failed", message: `\u65E0\u6CD5\u8BFB\u53D6 venv Python\uFF1A${venvDir}` });
    }
    python = info;
    opts.log(`\u590D\u7528\u5DF2\u6709 venv\uFF1A${venvDir}\uFF08Python ${python.version}\uFF09`);
  } else {
    python = await createVenv(opts.root, venvDir, opts.log);
  }
  const context = await inspectTorchPlan({
    python,
    forceCpu: options.torchCpu,
    forcedCuda: options.torchCuda,
    indexRoot: options.torchIndex
  });
  logToolchainPlan(context, opts.log);
  const existingMarker = readToolchainMarker(venvDir);
  let mismatch = null;
  if (switched) mismatch = "ComfyUI \u7248\u672C\u5DF2\u5207\u6362";
  else if (!healthy) mismatch = "venv \u5DF2\u91CD\u5EFA";
  else if (existingMarker === null) mismatch = "\u7F3A\u5C11\u5DE5\u5177\u94FE\u6807\u8BB0";
  else {
    mismatch = markerMismatchReason(existingMarker, {
      python: python.version,
      platform: context.platform,
      comfyuiTag: opts.version,
      requirementsSha256: requirementsSha,
      customNodesSha256: nodesSha,
      plan: context
    });
  }
  if (mismatch === null && existingMarker !== null) {
    const check = await runPipCheck(venvDir);
    if (!check.ok) {
      mismatch = `pip check \u5931\u8D25\uFF1A${check.output}`;
    } else {
      const smoke = await runSmokeTest(venvDir, context.backend);
      if (!smoke.ok) {
        mismatch = `\u81EA\u68C0\u5931\u8D25\uFF1A${smoke.error ?? "\u672A\u77E5\u9519\u8BEF"}`;
      } else if (smoke.torch !== existingMarker.torch || smoke.torchvision !== existingMarker.torchvision) {
        mismatch = `torch \u7248\u672C\u5DF2\u53D8\u5316\uFF08marker ${existingMarker.torch ?? "unknown"} \u2192 \u5B9E\u9645 ${smoke.torch ?? "unknown"}\uFF09`;
      } else {
        opts.log("\u5F15\u64CE\u5DF2\u5B89\u88C5\uFF08\u5DE5\u5177\u94FE\u6821\u9A8C\u901A\u8FC7\uFF09\uFF0C\u590D\u7528\u73B0\u6709\u76EE\u5F55");
        return { installed: false, marker: existingMarker, summary: summarizeToolchain(existingMarker, true) };
      }
    }
  }
  if (mismatch !== null) opts.log(`\u91CD\u65B0\u5B89\u88C5\u4F9D\u8D56\uFF1A${mismatch}`);
  const plan = await resolveTorchPlan({
    python,
    forceCpu: options.torchCpu,
    forcedCuda: options.torchCuda,
    indexRoot: options.torchIndex,
    log: opts.log
  });
  if (plan.tag !== null && plan.tag !== context.tag) {
    opts.log(`\u5DE5\u5177\u94FE\uFF1A\u9009\u62E9 ${plan.tag}\uFF08\u5019\u9009 ${plan.candidates.join(" / ")}\uFF09`);
  }
  rmSync4(join5(venvDir, TOOLCHAIN_MARKER_FILE), { force: true });
  const torchResult = await installTorchAndVerify({
    root: opts.root,
    venvDir,
    plan,
    options,
    log: opts.log
  });
  await assertRequirementsCompatible(reqFile, venvDir, torchResult.plan);
  await pipInstall(opts.root, venvDir, options, opts.log, reqFile);
  await installCustomNodes(opts.root, venvDir, nodes, options, opts.log, comfyDir);
  const finalCheck = await runPipCheck(venvDir);
  if (!finalCheck.ok) {
    throw new DaoyanCliError({
      code: "provision_failed",
      message: "\u4F9D\u8D56\u4E00\u81F4\u6027\u68C0\u67E5\u5931\u8D25\uFF08pip check\uFF09",
      hint: "\u6309 details.output \u4FEE\u590D\u51B2\u7A81\u7684\u5305\uFF1Bcustom node \u53EF\u80FD\u56FA\u5B9A\u4E86\u4E0D\u517C\u5BB9\u7248\u672C",
      details: {
        stage: "pip_check",
        output: finalCheck.output,
        custom_nodes: nodes.map((n) => n.name)
      }
    });
  }
  const finalSmoke = await runSmokeTest(venvDir, torchResult.plan.backend);
  if (!finalSmoke.ok) {
    const installedTorch = await pipShowVersion(venvDir, "torch");
    throw smokeFailureError(torchResult.plan, finalSmoke, {
      stage: "smoke_final",
      attemptedTags: torchResult.plan.candidates,
      offendingNodes: offendingNodes(nodes, comfyDir, installedTorch)
    });
  }
  const finalNodesSha = customNodesHash(nodes, comfyDir);
  const marker = buildToolchainMarker({
    plan: torchResult.plan,
    smoke: finalSmoke,
    comfyuiTag: opts.version,
    requirementsSha256: requirementsSha,
    customNodesSha256: finalNodesSha
  });
  writeToolchainMarker(venvDir, marker);
  return { installed: true, marker, summary: summarizeToolchain(marker, false) };
}
async function deployLocalEngine(opts) {
  const result = await provisionEngine({
    root: opts.root,
    baseDir: join5(opts.root, "engine"),
    version: opts.version,
    project: opts.project,
    ...opts.toolchain !== void 0 ? { toolchain: opts.toolchain } : {},
    log: opts.log
  });
  return { installed: result.installed, version: opts.version, toolchain: result.summary };
}
async function installEngineAt(opts) {
  const result = await provisionEngine({
    root: opts.root,
    baseDir: opts.baseDir,
    version: opts.version,
    project: opts.project,
    ...opts.toolchain !== void 0 ? { toolchain: opts.toolchain } : {},
    log: opts.log
  });
  return {
    comfyDir: join5(opts.baseDir, "ComfyUI"),
    venvDir: join5(opts.baseDir, ".venv"),
    toolchain: result.summary
  };
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
  const file = join5(root, EXTRA_MODELS_FILE);
  ensureDir(join5(root, ".dycli"));
  writeFileAtomically(file, yaml);
  return file;
}
function writeFileAtomically(file, content) {
  const tmp = `${file}.tmp`;
  writeFileSync3(tmp, content);
  renameSync2(tmp, file);
}
async function allocatePort(existing) {
  if (existing !== void 0 && existing > 0) return existing;
  return freePort("127.0.0.1");
}
var COMFY_REPO, COMFY_TAGS_API, MIN_PYTHON, VENV_TIMEOUT_MS, PIP_INSTALL_TIMEOUT_MS, PIP_RETRIES, PIP_TIMEOUT_SECONDS;
var init_init_flow = __esm({
  "src/core/provision/init-flow.mts"() {
    "use strict";
    init_errors();
    init_exec();
    init_fs();
    init_net();
    init_types();
    init_options();
    init_toolchain();
    init_options();
    COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git";
    COMFY_TAGS_API = "https://api.github.com/repos/comfyanonymous/ComfyUI/tags";
    MIN_PYTHON = "3.10";
    VENV_TIMEOUT_MS = 18e4;
    PIP_INSTALL_TIMEOUT_MS = 36e5;
    PIP_RETRIES = "5";
    PIP_TIMEOUT_SECONDS = "60";
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
import { existsSync as existsSync8, readdirSync as readdirSync3, rmSync as rmSync5 } from "fs";
import { join as join6 } from "path";
function newTaskId(machineId) {
  return `t_${makeId(machineId)}`;
}
function taskDir(root, taskId) {
  return join6(root, TASKS_DIR, taskId);
}
function taskFile(root, taskId) {
  return join6(taskDir(root, taskId), TASK_FILE);
}
function createTask(root, record) {
  const dir = taskDir(root, record.task_id);
  if (existsSync8(join6(dir, TASK_FILE))) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `task ${record.task_id} \u5DF2\u5B58\u5728\uFF08id \u51B2\u7A81\uFF0C\u8BF7\u91CD\u8BD5\uFF09`
    });
  }
  ensureDir(dir);
  writeJsonAtomic(join6(dir, TASK_FILE), record);
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
  const dir = join6(root, TASKS_DIR);
  if (!existsSync8(dir)) return [];
  const out = [];
  for (const ent of readdirSync3(dir, { withFileTypes: true })) {
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
  writeJsonAtomic(join6(taskDir(root, taskId), CANCEL_FILE), {
    requested_at: nowIso(),
    by_pid: process.pid
  });
}
function isCancelRequested(root, taskId) {
  return existsSync8(join6(taskDir(root, taskId), CANCEL_FILE));
}
function clearCancelRequest(root, taskId) {
  const file = join6(taskDir(root, taskId), CANCEL_FILE);
  if (existsSync8(file)) {
    rmSync5(file, { force: true });
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
    episode_id: init.episodeId ?? null,
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
    episode_id: rec.episode_id ?? null,
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
        const res = await fetchWithTimeout(this.url("/upload/image"), { method: "POST", body: form }, 6e4);
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
import { existsSync as existsSync9, rmSync as rmSync6 } from "fs";
import { join as join7 } from "path";
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
  const file = join7(root, CATALOG_FILE);
  if (!existsSync9(file)) return null;
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
  writeJsonAtomic(join7(root, CATALOG_FILE), catalog);
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
function totalVram(snapshot) {
  return snapshot.devices.reduce(
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
import { chmodSync as chmodSync2, existsSync as existsSync10, rmSync as rmSync7 } from "fs";
import { homedir as homedir2 } from "os";
import { dirname as dirname5, join as join8 } from "path";
function leasePath() {
  return join8(homedir2(), ".dycli", "gpu", "lease.json");
}
function isLease(v) {
  if (typeof v !== "object" || v === null) return false;
  const o = v;
  return o.version === 1 && typeof o.task_id === "string" && typeof o.project === "string" && typeof o.created_at === "string" && Array.isArray(o.entries);
}
function inspectLease(path = leasePath()) {
  if (!existsSync10(path)) return { status: "absent", path };
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
  ensureDir(dirname5(path));
  writeJsonAtomic(path, lease);
  try {
    chmodSync2(path, 384);
  } catch {
  }
}
function newLease(taskId, project) {
  return { version: 1, task_id: taskId, project, created_at: nowIso(), entries: [] };
}
function clearLease(path = leasePath()) {
  if (existsSync10(path)) {
    rmSync7(path, { force: true });
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
import { existsSync as existsSync11 } from "fs";
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
  return CRI_ENDPOINTS.filter((ep) => existsSync11(ep.replace(/^unix:\/\//, "")));
}
function crictlEndpointCandidates(recorded) {
  const out = recorded !== void 0 ? [recorded, void 0] : [void 0];
  for (const ep of availableCriEndpoints()) {
    if (!out.includes(ep)) out.push(ep);
  }
  return out;
}
function availableContainerdSockets() {
  return CONTAINERD_SOCKETS.filter((p) => existsSync11(p));
}
function isEndpointError(stderr) {
  return /connect|connection|no such file|refused|socket|failed to connect|code = Unavailable/i.test(stderr);
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
import { readFileSync as readFileSync8 } from "fs";
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
    return containerIdFromCgroup(readFileSync8(`/proc/${pid}/cgroup`, "utf8"));
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
    return readFileSync8(`/proc/${pid}/cmdline`, "utf8").split("\0").filter((x) => x !== "");
  } catch {
    return [];
  }
}
function readParentPid(pid) {
  try {
    const stat = readFileSync8(`/proc/${pid}/stat`, "utf8");
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
  const command = [...commandArray(infoConfig?.command), ...commandArray(infoConfig?.args)].filter((x) => x !== "");
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
    const info = await inspectWith(runtime, id, runtime === "crictl" ? crictlEndpoint : void 0);
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
    const rule = matchContainerTarget([info.image, info.name, ...info.command, ...procArgs].join(" "));
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
    const r = await tryExecCapture("crictl", crictlArgs(ep, ["exec", channel.container_id, ...args]), {
      timeoutMs
    });
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
        [...prefix, "task", "exec", "--exec-id", execId, channel.container_id, ...args],
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
    const r = await tryExecCapture("nerdctl", ["--namespace", namespace, "exec", channel.container_id, ...args], {
      timeoutMs
    });
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
      const r = await containerExec(channel, ["ollama", "run", model, "--keepalive", "5m", ""], 12e4);
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
      errors: [`vllm \u6062\u590D\u5931\u8D25\uFF08${res2 === null ? "\u5BB9\u5668\u5185 Python \u4E0D\u53EF\u7528" : `HTTP ${res2.status}`}\uFF09`]
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
import { readFileSync as readFileSync9, readlinkSync } from "fs";
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
      const parts = readFileSync9(`/proc/${info.pid}/cmdline`, "utf8").split("\0").filter((x) => x !== "");
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
  const snapshot = await gpuSnapshot();
  if (!snapshot.supported) {
    return {
      enabled: false,
      record: { takeover: false, evicted: [], restored: [], errors: [] },
      issues: [
        {
          code: "gpu_unsupported",
          message: `GPU \u63A5\u7BA1\u4E0D\u53EF\u7528\uFF08${snapshot.reason ?? "\u672A\u77E5\u539F\u56E0"}\uFF09\uFF1B\u4EFB\u52A1\u7EE7\u7EED\uFF0C\u672A\u9A71\u9010\u4EFB\u4F55\u8FDB\u7A0B`
        }
      ]
    };
  }
  const before = totalVram(snapshot);
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
  for (const issue2 of discovery.issues) {
    issues.push({ code: "gpu_takeover_failed", message: issue2 });
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
    const candidates = [primary, ...Array.isArray(entry.fallbacks) ? entry.fallbacks : []];
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
    optsLog(log, `GPU \u6062\u590D\uFF1A\u91CD\u8F7D ${entry.provider} \u6A21\u578B ${missing.join(", ")}\uFF08${channel.kind} \u901A\u9053\uFF09`);
    const r2 = await adapter.load(channel, missing);
    for (const m of r2.restored) restored.push(`${entry.provider}:${m}`);
    for (const e of r2.errors) errors.push({ code: "gpu_restore_failed", message: e });
  }
  const procs = lease.entries.filter((e) => e.kind === "process");
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
import {
  closeSync,
  existsSync as existsSync12,
  openSync,
  readFileSync as readFileSync10,
  readSync,
  rmSync as rmSync8,
  statSync as statSync2,
  unlinkSync,
  writeFileSync as writeFileSync4
} from "fs";
import { spawn as spawn4 } from "child_process";
import { join as join9 } from "path";
function enginePidFile(root) {
  return join9(root, LOG_DIR, ENGINE_PID_FILE);
}
function readEnginePid(root) {
  const file = enginePidFile(root);
  if (!existsSync12(file)) return null;
  try {
    const text = readFileSync10(file, "utf8").trim();
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
  ensureDir(join9(root, LOG_DIR));
  writeFileSync4(enginePidFile(root), JSON.stringify(rec, null, 2) + "\n", { mode: 384 });
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
    rmSync8(enginePidFile(root), { force: true });
    return;
  }
  if (rec.port > 0) {
    try {
      await new ComfyClient(`http://127.0.0.1:${rec.port}`).free();
    } catch {
    }
  }
  await stopPid(rec.pid, log);
  rmSync8(enginePidFile(root), { force: true });
}
function tailFile(file, lines) {
  if (!existsSync12(file)) return "(\u6587\u4EF6\u4E0D\u5B58\u5728)";
  let size = 0;
  try {
    size = statSync2(file).size;
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
          for (const issue2 of outcome.issues) log(issue2.message);
        }
        const started = Date.now();
        const comfyDir = this.comfyDir();
        const venvPython = join9(this.venvDir(), "bin", "python");
        if (!existsSync12(venvPython)) {
          throw new DaoyanCliError({
            code: "engine_start_failed",
            message: `venv \u4E0D\u5B58\u5728\uFF1A${venvPython}\u3002\u8FD0\u884C daoyan init --mode=local \u90E8\u7F72\u5F15\u64CE`
          });
        }
        if (!existsSync12(join9(comfyDir, "main.py"))) {
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
        const logDir = join9(this.opts.root, LOG_DIR);
        ensureDir(logDir);
        const logFile = join9(logDir, `engine-${this.opts.taskId}.log`);
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
          throw new DaoyanCliError({
            code: "engine_start_failed",
            message: `\u65E0\u6CD5 spawn \u5F15\u64CE\uFF1A${spawnError ?? "unknown"}`
          });
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
            errors.push({
              code: "cleanup_failed",
              message: `free \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`
            });
          }
        }
        const pid = this.infoState.pid;
        if (pid !== null) {
          const stopped = await stopPid(pid, log);
          cleanup.stop = stopped ? "ok" : "failed";
          if (stopped) rmSync8(enginePidFile(this.opts.root), { force: true });
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
          return configured.startsWith("/") ? configured : join9(this.opts.root, configured);
        }
        return join9(this.opts.root, "engine", "ComfyUI");
      }
      /**
       * venv 目录：machine.json 显式路径优先，否则约定 engine/.venv。
       */
      venvDir() {
        const configured = this.opts.machine.engine.mode === "local" ? this.opts.machine.engine.venv_dir : void 0;
        if (configured !== void 0 && configured !== "") {
          return configured.startsWith("/") ? configured : join9(this.opts.root, configured);
        }
        return join9(this.opts.root, "engine", ".venv");
      }
      /**
       * extra_model_paths 配置路径（machine.models_config 优先）。
       */
      modelsConfigPath() {
        if (this.opts.machine.engine.mode !== "local") return null;
        const explicit = this.opts.machine.engine.models_config;
        if (explicit !== void 0 && explicit !== null && explicit !== "") return explicit;
        const auto = join9(this.opts.root, EXTRA_MODELS_FILE);
        return existsSync12(auto) ? auto : null;
      }
      /**
       * 清理本次 run 的 scratch 文件（local 拥有引擎文件系统）。
       */
      cleanupScratch(inputs) {
        if (this.opts.machine.engine.mode !== "local") return "not_needed";
        try {
          const comfyDir = this.comfyDir();
          for (const name of inputs.uploaded) {
            rmSync8(join9(comfyDir, "input", name), { force: true });
          }
          for (const out of inputs.scratch_outputs) {
            rmSync8(join9(comfyDir, "output", out.subfolder, out.filename), { force: true });
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
import { closeSync as closeSync2, existsSync as existsSync13, openSync as openSync2, readFileSync as readFileSync11, rmSync as rmSync9, unlinkSync as unlinkSync2, writeFileSync as writeFileSync5 } from "fs";
import { homedir as homedir3 } from "os";
import { dirname as dirname6, join as join10 } from "path";
function machineLockPath() {
  return join10(homedir3(), ".dycli", "machine.lock");
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
  if (!existsSync13(path)) return { status: "absent", path };
  let raw;
  try {
    raw = JSON.parse(readFileSync11(path, "utf8"));
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
  ensureDir(dirname6(path));
  writeFileSync5(path, JSON.stringify(record, null, 2) + "\n", { mode: 384 });
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
      ensureDir(dirname6(path));
      const fd = openSync2(path, "wx", 384);
      try {
        writeFileSync5(fd, JSON.stringify(record, null, 2) + "\n");
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
    if (record.kind === "generation" && existsSync13(join10(record.project, "project.json"))) {
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
    if (record.mode === "local" && existsSync13(join10(record.project, "project.json"))) {
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
  rmSync9(path, { force: true });
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
import { basename as basename2, isAbsolute as isAbsolute3, join as join11, resolve as resolve3 } from "path";
import { existsSync as existsSync14, statSync as statSync3 } from "fs";
function parseArgs(args) {
  const flags = { noSkill: false, toolchain: {} };
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
    const toolchainFlag = applyToolchainFlag(flags.toolchain, name, args, i, inline);
    if (toolchainFlag.handled) {
      i += toolchainFlag.skip;
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
    resolveToolchainOptions(flags.toolchain);
  } else {
    if (flags.url === void 0 || flags.url === "") usageError("remote \u6A21\u5F0F\u5FC5\u987B\u63D0\u4F9B --url <http(s)://...>");
    if (flags.modelpath !== void 0) usageError("remote \u6A21\u5F0F\u4E0D\u63A5\u53D7 --modelpath\uFF08\u6A21\u578B\u7531\u8FDC\u7AEF\u7BA1\u7406\uFF09");
    if (flags.version !== void 0) usageError("remote \u6A21\u5F0F\u4E0D\u63A5\u53D7 --version\uFF08\u8FDC\u7AEF\u5F15\u64CE\u7248\u672C\u7531\u5916\u90E8\u7BA1\u7406\uFF09");
    if (hasToolchainOptions(flags.toolchain)) {
      usageError("remote \u6A21\u5F0F\u4E0D\u63A5\u53D7\u4F9D\u8D56\u5B89\u88C5\u53C2\u6570\uFF08\u4E0D\u90E8\u7F72\u5F15\u64CE\uFF09");
    }
  }
  return flags;
}
function resolveModelPath(raw) {
  const abs = isAbsolute3(raw) ? raw : resolve3(process.cwd(), raw);
  if (!existsSync14(abs) || !statSync3(abs).isDirectory()) {
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
  if (parent !== null && resolve3(parent.root) !== resolve3(root)) {
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
    scaffoldProject(root, basename2(root));
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
  let toolchain = null;
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
        writeJsonAtomic2(resolve3(root, "project.json"), project);
      }
      const prevComfyAbs = prevLocal?.comfyui_dir !== void 0 ? isAbsolute3(prevLocal.comfyui_dir) ? prevLocal.comfyui_dir : resolve3(root, prevLocal.comfyui_dir) : null;
      const reuseCustomEngine = flags.version === void 0 && prevLocal?.comfyui_dir !== void 0 && prevLocal.comfyui_dir !== "engine/ComfyUI" && prevComfyAbs !== null && existsSync14(join11(prevComfyAbs, "main.py"));
      if (reuseCustomEngine) {
        say(`\u590D\u7528 engine use \u9009\u5B9A\u7684\u5F15\u64CE\u76EE\u5F55\uFF1A${prevLocal?.comfyui_dir}`);
        comfyVersion = prevLocal?.comfyui_version ?? version;
      } else {
        say(`\u90E8\u7F72\u9879\u76EE\u4E13\u5C5E ComfyUI ${version} ...`);
        const deployed = await deployLocalEngine({
          root,
          project,
          version,
          toolchain: flags.toolchain,
          log: say
        });
        installed = deployed.installed;
        comfyVersion = version;
        toolchain = deployed.toolchain;
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
    toolchain,
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
    init_options();
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
import { existsSync as existsSync15, readFileSync as readFileSync12 } from "fs";
import { dirname as dirname7, join as join12 } from "path";
function workflowError(message, details) {
  throw new DaoyanCliError({ code: "workflow_invalid", message, details });
}
function loadGraphFile(abs, rel) {
  if (!existsSync15(abs)) {
    workflowError(`workflow \u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${rel}`, { path: rel });
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync12(abs, "utf8"));
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
  if (!existsSync15(file)) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync12(file, "utf8"));
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

// src/core/story/paths.mts
import { existsSync as existsSync16, readdirSync as readdirSync4 } from "fs";
import { join as join13 } from "path";
function seriesPath(root) {
  return join13(root, STORY_SERIES_FILE);
}
function charactersPath(root) {
  return join13(root, STORY_CHARACTERS_FILE);
}
function scenesPath(root) {
  return join13(root, STORY_SCENES_FILE);
}
function voicesPath(root) {
  return join13(root, STORY_VOICES_FILE);
}
function episodesRoot(root) {
  return join13(root, EPISODES_DIR);
}
function episodeDir(root, episodeId) {
  return join13(root, EPISODES_DIR, episodeId);
}
function storyEnabled(root) {
  return existsSync16(seriesPath(root));
}
function readSeries(root) {
  const file = seriesPath(root);
  if (!existsSync16(file)) return null;
  return readJson(file);
}
function readEpisodeMeta(root, episodeId) {
  if (!STORY_ID_RE.test(episodeId)) return null;
  const file = join13(episodeDir(root, episodeId), EPISODE_META_FILE);
  if (!existsSync16(file)) return null;
  return readJson(file);
}
function listEpisodeMetas(root) {
  const dir = episodesRoot(root);
  if (!existsSync16(dir)) return [];
  const out = [];
  for (const entry of readdirSync4(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!STORY_ID_RE.test(entry.name)) continue;
    try {
      const meta = readEpisodeMeta(root, entry.name);
      if (meta !== null && meta.id === entry.name) out.push(meta);
    } catch {
    }
  }
  return out.sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));
}
function legacyContext(root) {
  return {
    episode_id: null,
    legacy: true,
    dir: root,
    rel_dir: "",
    shots_path: join13(root, SHOTS_FILE),
    final_dir: join13(root, FINAL_DIR),
    final_rel: FINAL_DIR,
    label_prefix: "shot:",
    script_meta_path: null,
    script_text_path: null,
    breakdown_path: null,
    episode_meta_path: null
  };
}
function storyContext(root, meta) {
  const dir = episodeDir(root, meta.id);
  const relDir = `${EPISODES_DIR}/${meta.id}`;
  const finalRel = `${FINAL_DIR}/${meta.id}`;
  return {
    episode_id: meta.id,
    legacy: false,
    dir,
    rel_dir: relDir,
    shots_path: join13(dir, SHOTS_FILE),
    final_dir: join13(root, finalRel),
    final_rel: finalRel,
    label_prefix: `ep:${meta.id}:shot:`,
    script_meta_path: join13(dir, SCRIPT_FILE),
    script_text_path: join13(dir, SCRIPT_TEXT_FILE),
    breakdown_path: join13(dir, BREAKDOWN_FILE),
    episode_meta_path: join13(dir, EPISODE_META_FILE)
  };
}
function resolveEpisodeContext(root, episodeId) {
  if (!storyEnabled(root)) {
    if (episodeId !== void 0 && episodeId !== "") {
      throw new DaoyanCliError({
        code: "story_not_found",
        message: "\u5F53\u524D\u9879\u76EE\u672A\u542F\u7528 story \u6A21\u5F0F\uFF0C\u4E0D\u80FD\u4F7F\u7528 --episode",
        details: { episode_id: episodeId },
        hint: "\u5148\u8FD0\u884C daoyan story init\u3002"
      });
    }
    return legacyContext(root);
  }
  const metas = listEpisodeMetas(root);
  if (metas.length === 0) {
    throw new DaoyanCliError({
      code: "story_invalid",
      message: "story \u6A21\u5F0F\u5DF2\u542F\u7528\uFF0C\u4F46 episodes/ \u4E0B\u6CA1\u6709\u6709\u6548\u5267\u96C6",
      hint: "\u8FD0\u884C daoyan story episode add --id ep01 --number 1 --title <\u6807\u9898>\u3002"
    });
  }
  if (episodeId !== void 0 && episodeId !== "") {
    const target = metas.find((m) => m.id === episodeId);
    if (target === void 0) {
      throw new DaoyanCliError({
        code: "episode_not_found",
        message: `\u672A\u627E\u5230\u5267\u96C6 ${episodeId}`,
        details: { episode_id: episodeId, episodes: metas.map((m) => m.id) }
      });
    }
    return storyContext(root, target);
  }
  if (metas.length > 1) {
    throw new DaoyanCliError({
      code: "episode_required",
      message: `\u5F53\u524D\u9879\u76EE\u6709 ${metas.length} \u96C6\uFF0C\u8BF7\u7528 --episode <id> \u6307\u5B9A\u5267\u96C6`,
      details: { episodes: metas.map((m) => m.id) }
    });
  }
  return storyContext(root, metas[0]);
}
var STORY_ID_RE, REFERENCE_ASSET_RESERVED;
var init_paths = __esm({
  "src/core/story/paths.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
    STORY_ID_RE = /^[a-z][a-z0-9-]{1,63}$/;
    REFERENCE_ASSET_RESERVED = "reference";
  }
});

// src/core/story/store.mts
import { existsSync as existsSync17, readFileSync as readFileSync13 } from "fs";
import { join as join14 } from "path";
function emptyCharactersFile() {
  return { version: 1, updated_at: nowIso(), characters: [] };
}
function emptyScenesFile() {
  return { version: 1, updated_at: nowIso(), scenes: [] };
}
function emptyVoicesFile() {
  return { version: 1, updated_at: nowIso(), voices: [] };
}
function emptyScriptMeta() {
  return {
    version: 1,
    revision: EMPTY_REVISION,
    sha256: "",
    status: "draft",
    source: "ai",
    synced_by: "agent",
    synced_at: "",
    approved_at: null,
    changelog: []
  };
}
function emptyBreakdown(episodeId) {
  return {
    version: 1,
    episode_id: episodeId,
    source_revision: EMPTY_REVISION,
    source_sha256: "",
    beats: [],
    characters: [],
    scenes: [],
    voices: [],
    notes: ""
  };
}
function emptyShots(episodeId) {
  return {
    workflow: "t2v",
    meta: {
      episode_id: episodeId,
      title: "",
      synopsis: "",
      script_revision: EMPTY_REVISION,
      script_sha256: "",
      width: 768,
      height: 1344,
      fps: 24,
      anchors: {}
    },
    defaults: {
      length: 48,
      steps: 30,
      cfg: 4,
      negative: "\u4F4E\u8D28\u91CF\uFF0C\u6A21\u7CCA\uFF0C\u566A\u70B9\uFF0C\u53D8\u5F62\uFF0C\u6C34\u5370"
    },
    style_prefix: "",
    shots: []
  };
}
function loadCharacters(root) {
  return readJsonIfExists(charactersPath(root)) ?? emptyCharactersFile();
}
function loadScenes(root) {
  return readJsonIfExists(scenesPath(root)) ?? emptyScenesFile();
}
function loadVoices(root) {
  return readJsonIfExists(voicesPath(root)) ?? emptyVoicesFile();
}
function loadScriptMeta(root, episodeId) {
  const file = join14(episodeDir(root, episodeId), SCRIPT_FILE);
  const raw = readJsonIfExists(file);
  return raw ?? emptyScriptMeta();
}
function loadScriptText(root, episodeId) {
  const file = join14(episodeDir(root, episodeId), SCRIPT_TEXT_FILE);
  if (!existsSync17(file)) return "";
  return readFileSync13(file, "utf8");
}
function loadBreakdown(root, episodeId) {
  return readJsonIfExists(join14(episodeDir(root, episodeId), BREAKDOWN_FILE));
}
function loadEpisodeShots(root, episodeId) {
  return readJsonIfExists(join14(episodeDir(root, episodeId), SHOTS_FILE));
}
function saveCharacters(root, doc) {
  writeJsonAtomic(charactersPath(root), { ...doc, version: 1, updated_at: nowIso() });
}
function saveScenes(root, doc) {
  writeJsonAtomic(scenesPath(root), { ...doc, version: 1, updated_at: nowIso() });
}
function saveVoices(root, doc) {
  writeJsonAtomic(voicesPath(root), { ...doc, version: 1, updated_at: nowIso() });
}
function saveScriptMeta(root, episodeId, meta) {
  writeJsonAtomic(join14(episodeDir(root, episodeId), SCRIPT_FILE), meta);
}
function saveBreakdown(root, episodeId, doc) {
  writeJsonAtomic(join14(episodeDir(root, episodeId), BREAKDOWN_FILE), doc);
}
function saveEpisodeShots(root, episodeId, shots) {
  writeJsonAtomic(join14(episodeDir(root, episodeId), SHOTS_FILE), shots);
}
function normalizeScriptText(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function appendStoryLfsRules(root) {
  const file = join14(root, ".gitattributes");
  const current = existsSync17(file) ? readFileSync13(file, "utf8") : "";
  const required = [
    "story/assets/**        filter=lfs diff=lfs merge=lfs -text",
    "episodes/**/anchors/** filter=lfs diff=lfs merge=lfs -text"
  ];
  const lines = current.split("\n").filter((line) => line !== "");
  const missing = required.filter((rule) => !lines.some((line) => line.trim() === rule.trim()));
  if (missing.length === 0) return false;
  const next = [...lines, ...missing].join("\n") + "\n";
  writeFileAtomic(file, next);
  return true;
}
function initStory(root, projectName) {
  const created = [];
  for (const dir of [
    STORY_DIR,
    STORY_ASSETS_DIR,
    join14(STORY_ASSETS_DIR, "characters"),
    join14(STORY_ASSETS_DIR, "scenes"),
    join14(STORY_ASSETS_DIR, "voices"),
    EPISODES_DIR,
    LOG_DIR,
    WORKFLOWS_DIR
  ]) {
    ensureDir(join14(root, dir));
  }
  if (!existsSync17(seriesPath(root))) {
    const now = nowIso();
    const series = {
      version: 1,
      title: projectName,
      created_at: now,
      updated_at: now
    };
    writeJsonAtomic(seriesPath(root), series);
    created.push("story/series.json");
  }
  if (!existsSync17(charactersPath(root))) {
    writeJsonAtomic(charactersPath(root), emptyCharactersFile());
    created.push("story/characters.json");
  }
  if (!existsSync17(scenesPath(root))) {
    writeJsonAtomic(scenesPath(root), emptyScenesFile());
    created.push("story/scenes.json");
  }
  if (!existsSync17(voicesPath(root))) {
    writeJsonAtomic(voicesPath(root), emptyVoicesFile());
    created.push("story/voices.json");
  }
  if (appendStoryLfsRules(root)) created.push(".gitattributes");
  if (listEpisodeMetas(root).length === 0) {
    const series = readSeries(root);
    const title = series?.title !== void 0 && series.title !== "" ? series.title : "\u7B2C 1 \u96C6";
    addEpisode(root, { id: "ep01", number: 1, title });
    created.push("episodes/ep01");
  }
  for (const meta of listEpisodeMetas(root)) {
    const dir = episodeDir(root, meta.id);
    if (!existsSync17(join14(dir, SCRIPT_FILE))) {
      writeJsonAtomic(join14(dir, SCRIPT_FILE), emptyScriptMeta());
      created.push(`episodes/${meta.id}/script.json`);
    }
    if (!existsSync17(join14(dir, BREAKDOWN_FILE))) {
      writeJsonAtomic(join14(dir, BREAKDOWN_FILE), emptyBreakdown(meta.id));
      created.push(`episodes/${meta.id}/breakdown.json`);
    }
    if (!existsSync17(join14(dir, SHOTS_FILE))) {
      writeJsonAtomic(join14(dir, SHOTS_FILE), emptyShots(meta.id));
      created.push(`episodes/${meta.id}/shots.json`);
    }
  }
  return { created };
}
function addEpisode(root, init) {
  if (!STORY_ID_RE.test(init.id)) {
    throw new DaoyanCliError({
      code: "story_invalid",
      message: `\u5267\u96C6 id \u975E\u6CD5\uFF1A${init.id}`,
      hint: "\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD / \u6570\u5B57 / -\uFF0C\u4F8B\u5982 ep02\u3002"
    });
  }
  if (!Number.isInteger(init.number) || init.number <= 0) {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u96C6 number \u5FC5\u987B\u662F\u6B63\u6574\u6570" });
  }
  if (init.title.trim() === "") {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u96C6\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A" });
  }
  const metas = listEpisodeMetas(root);
  if (metas.some((m) => m.id === init.id)) {
    throw new DaoyanCliError({ code: "story_invalid", message: `\u5267\u96C6 ${init.id} \u5DF2\u5B58\u5728` });
  }
  if (metas.some((m) => m.number === init.number)) {
    throw new DaoyanCliError({ code: "story_invalid", message: `\u96C6\u6570 ${init.number} \u5DF2\u88AB\u5360\u7528` });
  }
  const dir = episodeDir(root, init.id);
  ensureDir(dir);
  const now = nowIso();
  const meta = {
    version: 1,
    id: init.id,
    number: init.number,
    title: init.title.trim(),
    ...init.summary !== void 0 && init.summary !== "" ? { summary: init.summary } : {},
    created_at: now,
    updated_at: now
  };
  if (!existsSync17(join14(dir, EPISODE_META_FILE))) writeJsonAtomic(join14(dir, EPISODE_META_FILE), meta);
  if (!existsSync17(join14(dir, SCRIPT_FILE))) writeJsonAtomic(join14(dir, SCRIPT_FILE), emptyScriptMeta());
  if (!existsSync17(join14(dir, BREAKDOWN_FILE))) writeJsonAtomic(join14(dir, BREAKDOWN_FILE), emptyBreakdown(init.id));
  if (!existsSync17(join14(dir, SHOTS_FILE))) writeJsonAtomic(join14(dir, SHOTS_FILE), emptyShots(init.id));
  ensureDir(join14(root, LOG_DIR));
  return meta;
}
function updateEpisode(root, episodeId, patch) {
  const cur = readEpisodeMeta(root, episodeId);
  if (cur === null) {
    throw new DaoyanCliError({ code: "episode_not_found", message: `\u672A\u627E\u5230\u5267\u96C6 ${episodeId}` });
  }
  const metas = listEpisodeMetas(root);
  if (patch.number !== void 0) {
    if (!Number.isInteger(patch.number) || patch.number <= 0) {
      throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u96C6 number \u5FC5\u987B\u662F\u6B63\u6574\u6570" });
    }
    if (metas.some((m) => m.id !== episodeId && m.number === patch.number)) {
      throw new DaoyanCliError({ code: "story_invalid", message: `\u96C6\u6570 ${patch.number} \u5DF2\u88AB\u5360\u7528` });
    }
  }
  if (patch.title !== void 0 && patch.title.trim() === "") {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u96C6\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A" });
  }
  const next = {
    ...cur,
    ...patch.number !== void 0 ? { number: patch.number } : {},
    ...patch.title !== void 0 ? { title: patch.title.trim() } : {},
    ...patch.summary !== void 0 ? { summary: patch.summary } : {},
    updated_at: nowIso()
  };
  writeJsonAtomic(join14(episodeDir(root, episodeId), EPISODE_META_FILE), next);
  return next;
}
function syncScript(opts) {
  if (readEpisodeMeta(opts.root, opts.episodeId) === null) {
    throw new DaoyanCliError({ code: "episode_not_found", message: `\u672A\u627E\u5230\u5267\u96C6 ${opts.episodeId}` });
  }
  const text = normalizeScriptText(opts.text);
  if (text.trim() === "") {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u672C\u6B63\u6587\u4E3A\u7A7A" });
  }
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > MAX_SCRIPT_BYTES) {
    throw new DaoyanCliError({
      code: "story_invalid",
      message: `\u5267\u672C\u8D85\u8FC7 ${MAX_SCRIPT_BYTES} \u5B57\u8282\u4E0A\u9650`,
      details: { bytes, limit: MAX_SCRIPT_BYTES }
    });
  }
  const cur = loadScriptMeta(opts.root, opts.episodeId);
  if (opts.baseRevision !== void 0 && cur.revision !== opts.baseRevision) {
    throw new DaoyanCliError({
      code: "story_conflict",
      message: `\u5267\u672C revision \u5DF2\u53D8\u4E3A ${cur.revision}\uFF08\u671F\u671B ${opts.baseRevision}\uFF09`,
      details: { current: cur.revision, expected: opts.baseRevision }
    });
  }
  const hash = sha256(text);
  if (cur.revision > 0 && cur.sha256 === hash) {
    return { meta: cur, changed: false };
  }
  const revision = cur.revision + 1;
  const entry = {
    revision,
    at: nowIso(),
    source: opts.source,
    summary: opts.summary.trim() === "" ? "\u540C\u6B65\u5267\u672C" : opts.summary.trim()
  };
  const meta = {
    version: 1,
    revision,
    sha256: hash,
    status: "draft",
    source: opts.source,
    synced_by: opts.syncedBy ?? "agent",
    synced_at: entry.at,
    approved_at: null,
    changelog: [...cur.changelog, entry].slice(-SCRIPT_CHANGELOG_LIMIT)
  };
  writeFileAtomic(join14(episodeDir(opts.root, opts.episodeId), SCRIPT_TEXT_FILE), text);
  saveScriptMeta(opts.root, opts.episodeId, meta);
  return { meta, changed: true };
}
function approveScript(root, episodeId) {
  const cur = loadScriptMeta(root, episodeId);
  if (cur.revision <= 0) {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u672C\u5C1A\u672A\u540C\u6B65\uFF0C\u4E0D\u80FD\u786E\u8BA4" });
  }
  const textFile = join14(episodeDir(root, episodeId), SCRIPT_TEXT_FILE);
  if (!existsSync17(textFile)) {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u672C\u6B63\u6587\u4E0D\u5B58\u5728\uFF0C\u4E0D\u80FD\u786E\u8BA4" });
  }
  if (cur.status === "approved") return cur;
  const next = { ...cur, status: "approved", approved_at: nowIso() };
  saveScriptMeta(root, episodeId, next);
  return next;
}
var MAX_SCRIPT_BYTES, SCRIPT_CHANGELOG_LIMIT, EMPTY_REVISION;
var init_store2 = __esm({
  "src/core/story/store.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
    init_paths();
    MAX_SCRIPT_BYTES = 2 * 1024 * 1024;
    SCRIPT_CHANGELOG_LIMIT = 20;
    EMPTY_REVISION = 0;
  }
});

// src/core/run/store.mts
import { copyFileSync, existsSync as existsSync18, readdirSync as readdirSync5, readFileSync as readFileSync14, renameSync as renameSync3, writeFileSync as writeFileSync6 } from "fs";
import { basename as basename3, join as join15 } from "path";
function newRunId(machineId) {
  return makeId(machineId);
}
function runDir(root, runId) {
  return join15(root, RUNS_DIR, runId);
}
function createRunDir(root, runId) {
  const dir = runDir(root, runId);
  ensureDir(join15(dir, INPUTS_DIR));
  ensureDir(join15(dir, "outputs"));
  return dir;
}
function writeWorkflowSnapshot(root, runId, graph) {
  writeJsonAtomic(join15(runDir(root, runId), RUN_WORKFLOW_FILE), graph);
}
function writeInputsSnapshot(root, runId, inputs, files) {
  writeJsonAtomic(join15(runDir(root, runId), RUN_INPUTS_FILE), { inputs, files });
}
function copyRunInput(root, runId, source, desiredName) {
  if (!existsSync18(source)) {
    throw new DaoyanCliError({ code: "config_invalid", message: `\u8F93\u5165\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${source}` });
  }
  const name = basename3(desiredName ?? source).replace(/[^A-Za-z0-9._-]/g, "_");
  const dir = join15(runDir(root, runId), INPUTS_DIR);
  ensureDir(dir);
  const dest = join15(dir, name);
  copyFileSync(source, dest);
  const bytes = new Uint8Array(readFileSync14(dest));
  return { name, sha256: sha256(bytes), bytes: bytes.byteLength };
}
function writeRunOutput(root, runId, filename, bytes) {
  const safe = basename3(filename).replace(/[^A-Za-z0-9._-]/g, "_") || "output.bin";
  const dir = join15(runDir(root, runId), "outputs");
  ensureDir(dir);
  let name = safe;
  for (let i = 1; existsSync18(join15(dir, name)); i++) {
    const dot = safe.lastIndexOf(".");
    name = dot > 0 ? `${safe.slice(0, dot)}_${i}${safe.slice(dot)}` : `${safe}_${i}`;
  }
  writeFileAtomicBytes(join15(dir, name), bytes);
  return { name, path: `outputs/${name}`, sha256: sha256(bytes), bytes: bytes.byteLength };
}
function writeFileAtomicBytes(file, bytes) {
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync6(tmp, bytes);
  renameSync3(tmp, file);
}
function writeRun(root, record) {
  writeJsonAtomic(join15(runDir(root, record.run_id), RUN_FILE), record);
}
function readRun(root, runId) {
  return readJsonIfExists(join15(root, RUNS_DIR, runId, RUN_FILE));
}
function requireRun(root, runId) {
  const rec = readRun(root, runId);
  if (rec === null) {
    throw new DaoyanCliError({ code: "run_not_found", message: `\u672A\u627E\u5230 run ${runId}` });
  }
  return rec;
}
function listRuns(root) {
  const dir = join15(root, RUNS_DIR);
  if (!existsSync18(dir)) return [];
  const out = [];
  for (const ent of readdirSync5(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const rec = readRun(root, ent.name);
    if (rec !== null) out.push(rec);
  }
  return out.sort((a, b) => b.started_at.localeCompare(a.started_at) || b.run_id.localeCompare(a.run_id));
}
function latestSucceededRun(root, label) {
  const hits = listRuns(root).filter((r) => r.label === label && r.status === "succeeded");
  return hits[0] ?? null;
}
function latestRunByLabel(root, label) {
  return listRuns(root).filter((r) => r.label === label)[0] ?? null;
}
function runOutputAbs(root, record, output2) {
  return join15(runDir(root, record.run_id), output2.path);
}
var init_store3 = __esm({
  "src/core/run/store.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_types();
  }
});

// src/core/story/assets.mts
import { existsSync as existsSync19, readFileSync as readFileSync15, renameSync as renameSync4, rmSync as rmSync10, statSync as statSync4, writeFileSync as writeFileSync7 } from "fs";
import { dirname as dirname8, isAbsolute as isAbsolute4, join as join16 } from "path";
function parseAssetOwner(owner, form) {
  const colon = owner.indexOf(":");
  if (colon <= 0 || colon === owner.length - 1) {
    throw new DaoyanCliError({
      code: "usage",
      message: `--owner \u9700\u8981 <character|scene|voice>:<id>\uFF08\u6536\u5230 ${owner}\uFF09`,
      exit: 2
    });
  }
  const kind = owner.slice(0, colon);
  const id = owner.slice(colon + 1);
  if (kind !== "character" && kind !== "scene" && kind !== "voice") {
    throw new DaoyanCliError({ code: "usage", message: `\u672A\u77E5 owner \u7C7B\u578B ${kind}`, exit: 2 });
  }
  if (!STORY_ID_RE.test(id)) {
    throw new DaoyanCliError({ code: "story_invalid", message: `owner id \u975E\u6CD5\uFF1A${id}` });
  }
  if (kind === "character") {
    if (form === void 0 || form === "") {
      throw new DaoyanCliError({ code: "usage", message: "\u89D2\u8272\u8D44\u4EA7\u9700\u8981 --form <form-id>", exit: 2 });
    }
    if (!STORY_ID_RE.test(form)) {
      throw new DaoyanCliError({ code: "story_invalid", message: `\u5F62\u6001 id \u975E\u6CD5\uFF1A${form}` });
    }
    return { kind, id, form };
  }
  return { kind, id, form: null };
}
function magicBytes(bytes) {
  return bytes.slice(0, Math.min(bytes.byteLength, MAGIC_READ_BYTES));
}
function ascii(bytes, start, end) {
  return Buffer.from(bytes.slice(start, end)).toString("ascii");
}
function detectAssetType(bytes) {
  const head = magicBytes(bytes);
  if (head.length >= 8 && head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71) {
    return { content_type: "image/png", ext: "png" };
  }
  if (head.length >= 3 && head[0] === 255 && head[1] === 216 && head[2] === 255) {
    return { content_type: "image/jpeg", ext: "jpg" };
  }
  if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") {
    return { content_type: "image/webp", ext: "webp" };
  }
  if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WAVE") {
    return { content_type: "audio/wav", ext: "wav" };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === "fLaC") {
    return { content_type: "audio/flac", ext: "flac" };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === "OggS") {
    return { content_type: "audio/ogg", ext: "ogg" };
  }
  if (head.length >= 3 && ascii(head, 0, 3) === "ID3") {
    return { content_type: "audio/mpeg", ext: "mp3" };
  }
  if (head.length >= 2 && head[0] === 255 && (head[1] === 251 || head[1] === 243 || head[1] === 242)) {
    return { content_type: "audio/mpeg", ext: "mp3" };
  }
  return null;
}
function isLfsPointerFile(file) {
  try {
    if (statSync4(file).size > 1024) return false;
    return readFileSync15(file, "utf8").startsWith(LFS_POINTER_PREFIX);
  } catch {
    return false;
  }
}
function writeBytesAtomic(file, bytes) {
  ensureDir(dirname8(file));
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync7(tmp, bytes);
  renameSync4(tmp, file);
}
function readSource(path) {
  if (!existsSync19(path)) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u6E90\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${path}` });
  }
  if (isLfsPointerFile(path)) {
    throw new DaoyanCliError({
      code: "asset_invalid",
      message: `\u6E90\u6587\u4EF6\u662F Git LFS pointer\uFF1A${path}`,
      hint: "\u5148\u8FD0\u884C git lfs pull\u3002"
    });
  }
  const size = statSync4(path).size;
  if (size > MAX_ASSET_BYTES) {
    throw new DaoyanCliError({
      code: "asset_invalid",
      message: `\u8D44\u4EA7\u8D85\u8FC7 ${MAX_ASSET_BYTES} \u5B57\u8282\u4E0A\u9650`,
      details: { bytes: size, limit: MAX_ASSET_BYTES }
    });
  }
  return new Uint8Array(readFileSync15(path));
}
function assetRelPath(owner, assetId, ext) {
  if (owner.kind === "character" && owner.form !== null) {
    return `${STORY_ASSETS_DIR}/characters/${owner.id}/${owner.form}/${assetId}.${ext}`;
  }
  if (owner.kind === "scene") return `${STORY_ASSETS_DIR}/scenes/${owner.id}/${assetId}.${ext}`;
  return `${STORY_ASSETS_DIR}/voices/${owner.id}/${assetId}.${ext}`;
}
function findCharacterForm(doc, characterId, formId) {
  const character = doc.characters.find((c) => c.id === characterId);
  if (character === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u672A\u627E\u5230\u89D2\u8272 ${characterId}` });
  }
  const form = character.forms.find((f) => f.id === formId);
  if (form === void 0) {
    throw new DaoyanCliError({
      code: "asset_not_found",
      message: `\u89D2\u8272 ${characterId} \u6CA1\u6709\u5F62\u6001 ${formId}`
    });
  }
  return { character, form };
}
function findScene(doc, sceneId) {
  const scene = doc.scenes.find((s) => s.id === sceneId);
  if (scene === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u672A\u627E\u5230\u573A\u666F ${sceneId}` });
  }
  return scene;
}
function findVoice(doc, voiceId) {
  const voice = doc.voices.find((v) => v.id === voiceId);
  if (voice === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u672A\u627E\u5230\u97F3\u8272 ${voiceId}` });
  }
  return voice;
}
function sourceFromRun(root, runId, outputName) {
  const run2 = requireRun(root, runId);
  const output2 = run2.outputs.find((o) => o.name === outputName);
  if (output2 === void 0) {
    throw new DaoyanCliError({
      code: "asset_not_found",
      message: `run ${runId} \u6CA1\u6709\u4EA7\u7269 ${outputName}`,
      details: { outputs: run2.outputs.map((o) => o.name) }
    });
  }
  const source = runOutputAbs(root, run2, output2);
  if (!existsSync19(source)) {
    throw new DaoyanCliError({
      code: "asset_not_found",
      message: `run \u4EA7\u7269\u4E0D\u5728\u5DE5\u4F5C\u533A\uFF08\u53EF\u80FD\u672A git lfs pull\uFF09\uFF1A${runId}/${output2.path}`
    });
  }
  return {
    source,
    sourceRun: run2.run_id,
    sourceOutput: output2.name,
    sourceEpisodeId: run2.episode_id ?? null
  };
}
function addAsset(opts) {
  if (!STORY_ID_RE.test(opts.assetId)) {
    throw new DaoyanCliError({ code: "story_invalid", message: `\u8D44\u4EA7 id \u975E\u6CD5\uFF1A${opts.assetId}` });
  }
  if (opts.assetId === REFERENCE_ASSET_RESERVED) {
    throw new DaoyanCliError({
      code: "story_invalid",
      message: `\u8D44\u4EA7 id "${REFERENCE_ASSET_RESERVED}" \u662F\u5DE5\u4F5C\u6D41\u69FD\u4F4D\u4FDD\u7559\u5B57`
    });
  }
  let source;
  let sourceRun = null;
  let sourceOutput = null;
  let sourceEpisodeId = null;
  if (opts.fromRun !== void 0 && opts.fromRun !== "") {
    if (opts.output === void 0 || opts.output === "") {
      throw new DaoyanCliError({ code: "usage", message: "--from-run \u9700\u8981 --output <\u4EA7\u7269\u540D>", exit: 2 });
    }
    const runSource = sourceFromRun(opts.root, opts.fromRun, opts.output);
    source = runSource.source;
    sourceRun = runSource.sourceRun;
    sourceOutput = runSource.sourceOutput;
    sourceEpisodeId = runSource.sourceEpisodeId;
  } else if (opts.from !== void 0 && opts.from !== "") {
    source = isAbsolute4(opts.from) ? opts.from : join16(opts.root, opts.from);
  } else {
    throw new DaoyanCliError({
      code: "usage",
      message: "\u9700\u8981 --from <\u6587\u4EF6> \u6216 --from-run <run_id> --output <name>",
      exit: 2
    });
  }
  const bytes = readSource(source);
  const type = detectAssetType(bytes);
  if (type === null) {
    throw new DaoyanCliError({
      code: "asset_invalid",
      message: `\u65E0\u6CD5\u8BC6\u522B\u7684\u8D44\u4EA7\u7C7B\u578B\uFF1A${source}`,
      hint: "\u652F\u6301 PNG / JPEG / WebP / WAV / MP3 / FLAC / OGG\u3002"
    });
  }
  const rel = assetRelPath(opts.owner, opts.assetId, type.ext);
  const abs = join16(opts.root, rel);
  const asset = {
    id: opts.assetId,
    ...opts.role !== void 0 && opts.role !== "" ? { role: opts.role } : {},
    path: rel,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
    content_type: type.content_type,
    source_run: sourceRun,
    source_output: sourceOutput,
    source_episode_id: sourceEpisodeId,
    created_at: nowIso()
  };
  if (existsSync19(abs) && !opts.replace) {
    throw new DaoyanCliError({
      code: "asset_invalid",
      message: `\u8D44\u4EA7\u5DF2\u5B58\u5728\uFF1A${rel}`,
      hint: "\u4F7F\u7528 --replace \u8986\u76D6\uFF0C\u6216\u6362\u4E00\u4E2A --id\u3002"
    });
  }
  writeBytesAtomic(abs, bytes);
  if (opts.owner.kind === "character") {
    const doc2 = loadCharacters(opts.root);
    const { form } = findCharacterForm(doc2, opts.owner.id, opts.owner.form ?? "");
    upsertAsset(form.assets, asset, opts.replace);
    if (opts.setReference) form.reference_asset = asset.id;
    saveCharacters(opts.root, doc2);
    return {
      asset,
      reference_set: opts.setReference,
      warning: form.reference_asset === void 0 || form.reference_asset === null || form.reference_asset === "" ? "\u5C1A\u672A\u6307\u5B9A reference_asset\uFF1B\u7528 story asset set-reference \u9009\u62E9\u4E3B\u53C2\u8003" : null
    };
  }
  if (opts.owner.kind === "scene") {
    const doc2 = loadScenes(opts.root);
    const scene = findScene(doc2, opts.owner.id);
    upsertAsset(scene.assets, asset, opts.replace);
    if (opts.setReference) scene.reference_asset = asset.id;
    saveScenes(opts.root, doc2);
    return {
      asset,
      reference_set: opts.setReference,
      warning: scene.reference_asset === void 0 || scene.reference_asset === null || scene.reference_asset === "" ? "\u5C1A\u672A\u6307\u5B9A reference_asset\uFF1B\u7528 story asset set-reference \u9009\u62E9\u4E3B\u53C2\u8003" : null
    };
  }
  const doc = loadVoices(opts.root);
  const voice = findVoice(doc, opts.owner.id);
  upsertAsset(voice.assets, asset, opts.replace);
  if (opts.setReference) voice.reference_asset = asset.id;
  saveVoices(opts.root, doc);
  return {
    asset,
    reference_set: opts.setReference,
    warning: voice.mode === "reference" && (voice.reference_asset === void 0 || voice.reference_asset === null || voice.reference_asset === "") ? "\u97F3\u8272\u5C1A\u672A\u6307\u5B9A reference_asset\uFF1B\u7528 story asset set-reference \u9009\u62E9\u53C2\u8003\u97F3\u9891" : null
  };
}
function upsertAsset(list, asset, replace) {
  const index = list.findIndex((a) => a.id === asset.id);
  if (index >= 0) {
    if (!replace) {
      throw new DaoyanCliError({ code: "asset_invalid", message: `\u8D44\u4EA7 ${asset.id} \u5DF2\u5B58\u5728` });
    }
    list[index] = asset;
    return;
  }
  list.push(asset);
}
function setReferenceAsset(root, owner, assetId) {
  let asset;
  if (owner.kind === "character") {
    const doc2 = loadCharacters(root);
    const { form } = findCharacterForm(doc2, owner.id, owner.form ?? "");
    asset = form.assets.find((a) => a.id === assetId);
    if (asset === void 0) {
      throw new DaoyanCliError({ code: "asset_not_found", message: `\u89D2\u8272\u5F62\u6001\u6CA1\u6709\u8D44\u4EA7 ${assetId}` });
    }
    form.reference_asset = assetId;
    saveCharacters(root, doc2);
    return asset;
  }
  if (owner.kind === "scene") {
    const doc2 = loadScenes(root);
    const scene = findScene(doc2, owner.id);
    asset = scene.assets.find((a) => a.id === assetId);
    if (asset === void 0) {
      throw new DaoyanCliError({ code: "asset_not_found", message: `\u573A\u666F\u6CA1\u6709\u8D44\u4EA7 ${assetId}` });
    }
    scene.reference_asset = assetId;
    saveScenes(root, doc2);
    return asset;
  }
  const doc = loadVoices(root);
  const voice = findVoice(doc, owner.id);
  asset = voice.assets.find((a) => a.id === assetId);
  if (asset === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u97F3\u8272\u6CA1\u6709\u8D44\u4EA7 ${assetId}` });
  }
  voice.reference_asset = assetId;
  saveVoices(root, doc);
  return asset;
}
function removeAsset(root, owner, assetId, force) {
  if (owner.kind === "character") {
    const doc2 = loadCharacters(root);
    const { form } = findCharacterForm(doc2, owner.id, owner.form ?? "");
    const removed2 = removeFromList(root, form.assets, form, assetId, force);
    saveCharacters(root, doc2);
    return removed2;
  }
  if (owner.kind === "scene") {
    const doc2 = loadScenes(root);
    const scene = findScene(doc2, owner.id);
    const removed2 = removeFromList(root, scene.assets, scene, assetId, force);
    saveScenes(root, doc2);
    return removed2;
  }
  const doc = loadVoices(root);
  const voice = findVoice(doc, owner.id);
  const removed = removeFromList(root, voice.assets, voice, assetId, force);
  saveVoices(root, doc);
  return removed;
}
function removeFromList(root, list, holder, assetId, force) {
  const asset = list.find((a) => a.id === assetId);
  if (asset === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u672A\u627E\u5230\u8D44\u4EA7 ${assetId}` });
  }
  if (holder.reference_asset === assetId && !force) {
    throw new DaoyanCliError({
      code: "story_invalid",
      message: `\u8D44\u4EA7 ${assetId} \u662F\u5F53\u524D\u4E3B\u53C2\u8003\uFF0C\u4E0D\u80FD\u76F4\u63A5\u5220\u9664`,
      hint: "\u5148\u7528 story asset set-reference \u6307\u5411\u53E6\u4E00\u8D44\u4EA7\uFF0C\u6216 --force \u5220\u9664\u5E76\u63A5\u53D7 missing_reference\u3002"
    });
  }
  const abs = join16(root, asset.path);
  if (existsSync19(abs)) rmSync10(abs, { force: true });
  const index = list.findIndex((a) => a.id === assetId);
  if (index >= 0) list.splice(index, 1);
  if (holder.reference_asset === assetId) holder.reference_asset = null;
  return asset;
}
function listAssets(root) {
  const out = [];
  const characters = loadCharacters(root);
  for (const character of characters.characters) {
    for (const form of character.forms) {
      for (const asset of form.assets) {
        out.push({
          owner_kind: "character",
          owner_id: character.id,
          owner_name: character.name,
          form_id: form.id,
          reference: form.reference_asset === asset.id,
          asset
        });
      }
    }
  }
  const scenes = loadScenes(root);
  for (const scene of scenes.scenes) {
    for (const asset of scene.assets) {
      out.push({
        owner_kind: "scene",
        owner_id: scene.id,
        owner_name: scene.name,
        form_id: null,
        reference: scene.reference_asset === asset.id,
        asset
      });
    }
  }
  const voices = loadVoices(root);
  for (const voice of voices.voices) {
    for (const asset of voice.assets) {
      out.push({
        owner_kind: "voice",
        owner_id: voice.id,
        owner_name: voice.name,
        form_id: null,
        reference: voice.reference_asset === asset.id,
        asset
      });
    }
  }
  return out;
}
var MAX_ASSET_BYTES, LFS_POINTER_PREFIX, MAGIC_READ_BYTES;
var init_assets = __esm({
  "src/core/story/assets.mts"() {
    "use strict";
    init_errors();
    init_fs();
    init_store3();
    init_types();
    init_paths();
    init_store2();
    MAX_ASSET_BYTES = 200 * 1024 * 1024;
    LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec/v1";
    MAGIC_READ_BYTES = 64;
  }
});

// src/core/story/workflow-assets.mts
import { existsSync as existsSync20, readFileSync as readFileSync16 } from "fs";
import { basename as basename5, join as join17 } from "path";
function workflowAssetsPath(workflowAbs) {
  return workflowAbs.replace(/\.json$/i, ".assets.json");
}
function loadWorkflowAssets(workflowAbs) {
  const file = workflowAssetsPath(workflowAbs);
  if (!existsSync20(file)) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync16(file, "utf8"));
  } catch (e) {
    throw new DaoyanCliError({
      code: "story_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
  return parseWorkflowAssets(raw, file);
}
function parseWorkflowAssets(raw, label) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u5FC5\u987B\u662F JSON \u5BF9\u8C61` });
  }
  const record = raw;
  if (record.version !== 1) {
    throw new DaoyanCliError({ code: "story_invalid", message: `${label} version \u5FC5\u987B\u4E3A 1` });
  }
  if (!Array.isArray(record.slots)) {
    throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u7F3A\u5C11 slots \u6570\u7EC4` });
  }
  const seen = /* @__PURE__ */ new Set();
  const slots = [];
  for (const item of record.slots) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u7684 slot \u5FC5\u987B\u662F\u5BF9\u8C61` });
    }
    const slot = item;
    const name = typeof slot.name === "string" ? slot.name.trim() : "";
    if (name === "") throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u7684 slot.name \u4E3A\u7A7A` });
    if (seen.has(name)) {
      throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u7684 slot \u540D\u91CD\u590D\uFF1A${name}` });
    }
    seen.add(name);
    const kind = slot.kind;
    if (kind !== "character" && kind !== "scene" && kind !== "voice") {
      throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u7684 slot ${name} kind \u975E\u6CD5` });
    }
    const asset = typeof slot.asset === "string" ? slot.asset.trim() : "";
    if (asset === "") {
      throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u7684 slot ${name} \u7F3A\u5C11 asset` });
    }
    const target = typeof slot.target === "string" ? slot.target.trim() : "";
    if (target === "" || !target.includes(".")) {
      throw new DaoyanCliError({
        code: "story_invalid",
        message: `${label} \u7684 slot ${name} target \u5FC5\u987B\u662F nodeId.input`
      });
    }
    if (slot.required !== void 0 && typeof slot.required !== "boolean") {
      throw new DaoyanCliError({
        code: "story_invalid",
        message: `${label} \u7684 slot ${name} required \u5FC5\u987B\u662F boolean`
      });
    }
    slots.push({
      name,
      kind,
      asset,
      target,
      ...slot.required !== void 0 ? { required: slot.required } : {}
    });
  }
  return { version: 1, slots };
}
function splitTarget(target) {
  const dot = target.indexOf(".");
  return { node: target.slice(0, dot), input: target.slice(dot + 1) };
}
function extOf(path) {
  const name = basename5(path);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot) : "";
}
function parseCastRef(value) {
  if (typeof value === "string") {
    const slash = value.indexOf("/");
    if (slash > 0) return { id: value.slice(0, slash), form: value.slice(slash + 1) };
    return { id: value, form: null };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value;
  const id = typeof record.id === "string" && record.id.trim() !== "" ? record.id.trim() : null;
  if (id === null) return null;
  const form = typeof record.form === "string" && record.form.trim() !== "" ? record.form.trim() : null;
  return { id, form };
}
function parseSceneRef(value) {
  if (typeof value === "string") return value.trim() === "" ? null : value.trim();
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value;
  return typeof record.id === "string" && record.id.trim() !== "" ? record.id.trim() : null;
}
function parseSlotMapping(value) {
  const at = value.lastIndexOf("@");
  if (at > 0 && at < value.length - 1) {
    return { owner: value.slice(0, at), asset: value.slice(at + 1) };
  }
  return { owner: value, asset: null };
}
function selectAsset(assets, referenceAsset, selector, label) {
  if (selector === "reference") {
    if (referenceAsset === void 0 || referenceAsset === null || referenceAsset === "") {
      throw new DaoyanCliError({
        code: "story_gate_failed",
        message: `${label} \u6CA1\u6709\u663E\u5F0F reference_asset`,
        details: { blockers: [{ code: "missing_reference", message: `${label} \u6CA1\u6709\u663E\u5F0F\u4E3B\u53C2\u8003` }] }
      });
    }
    const asset2 = assets.find((a) => a.id === referenceAsset);
    if (asset2 === void 0) {
      throw new DaoyanCliError({
        code: "asset_not_found",
        message: `${label} \u7684 reference_asset \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8D44\u4EA7\uFF1A${referenceAsset}`
      });
    }
    return asset2;
  }
  const asset = assets.find((a) => a.id === selector);
  if (asset === void 0) {
    throw new DaoyanCliError({
      code: "asset_not_found",
      message: `${label} \u6CA1\u6709\u8D44\u4EA7 ${selector}`
    });
  }
  return asset;
}
function ensureAssetFile(root, asset, label) {
  const abs = join17(root, asset.path);
  if (!existsSync20(abs)) {
    throw new DaoyanCliError({
      code: "asset_not_found",
      message: `${label} \u7684\u8D44\u4EA7\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${asset.path}`,
      hint: "git lfs pull \u6216\u91CD\u65B0\u5165\u5E93\u3002"
    });
  }
  if (isLfsPointerFile(abs)) {
    throw new DaoyanCliError({
      code: "asset_invalid",
      message: `${label} \u7684\u8D44\u4EA7\u4ECD\u662F Git LFS pointer\uFF1A${asset.path}`,
      hint: "\u5148\u8FD0\u884C git lfs pull\u3002"
    });
  }
  return abs;
}
function resolveCharacterAsset(root, slot, owner, explicitAsset, characters, shot) {
  const parsed = parseCastRef(owner);
  if (parsed === null) {
    throw new DaoyanCliError({ code: "story_invalid", message: `\u69FD\u4F4D ${slot.name} \u7684 owner \u975E\u6CD5\uFF1A${owner}` });
  }
  const character = characters.characters.find((c) => c.id === parsed.id);
  if (character === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u69FD\u4F4D ${slot.name} \u7684\u89D2\u8272\u4E0D\u5B58\u5728\uFF1A${parsed.id}` });
  }
  const formId = parsed.form ?? character.default_form;
  const form = character.forms.find((f) => f.id === formId);
  if (form === void 0) {
    throw new DaoyanCliError({
      code: "asset_not_found",
      message: `\u69FD\u4F4D ${slot.name} \u7684\u5F62\u6001\u4E0D\u5B58\u5728\uFF1A${parsed.id}/${formId}`
    });
  }
  const selector = explicitAsset ?? slot.asset;
  const asset = selectAsset(form.assets, form.reference_asset, selector, `\u89D2\u8272 ${parsed.id}/${formId}`);
  return { slot, asset, owner: `${parsed.id}/${formId}` };
}
function resolveSceneAsset(root, slot, shot) {
  const sceneId = parseSceneRef(shot.scene);
  if (sceneId === null) {
    throw new DaoyanCliError({ code: "story_gate_failed", message: "\u955C\u5934\u7F3A\u5C11\u573A\u666F\uFF0C\u65E0\u6CD5\u89E3\u6790\u573A\u666F\u8D44\u4EA7\u69FD\u4F4D" });
  }
  const scenes = loadScenes(root);
  const scene = scenes.scenes.find((s) => s.id === sceneId);
  if (scene === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u573A\u666F\u4E0D\u5B58\u5728\uFF1A${sceneId}` });
  }
  const explicit = shot.scene_asset;
  const selector = typeof explicit === "string" && explicit !== "" ? explicit : slot.asset;
  const asset = selectAsset(scene.assets, scene.reference_asset, selector, `\u573A\u666F ${sceneId}`);
  return { slot, asset, owner: sceneId };
}
function dialogueVoices(root, shot) {
  const characters = loadCharacters(root);
  const out = [];
  for (const line of shot.dialogue ?? []) {
    let voice = line.voice;
    if (voice === void 0 || voice === "") {
      const character = characters.characters.find((c) => c.id === line.character);
      const voices = character?.voice_ids ?? [];
      if (voices.length !== 1) continue;
      voice = voices[0];
    }
    if (voice !== void 0 && voice !== "" && !out.includes(voice)) out.push(voice);
  }
  return out;
}
function resolveVoiceAsset(root, slot, owner, explicitAsset) {
  const voices = loadVoices(root);
  const voice = voices.voices.find((v) => v.id === owner);
  if (voice === void 0) {
    throw new DaoyanCliError({ code: "asset_not_found", message: `\u69FD\u4F4D ${slot.name} \u7684\u97F3\u8272\u4E0D\u5B58\u5728\uFF1A${owner}` });
  }
  const selector = explicitAsset ?? slot.asset;
  const asset = selectAsset(voice.assets, voice.reference_asset, selector, `\u97F3\u8272 ${owner}`);
  return { slot, asset, owner };
}
function resolveWorkflowAssets(opts) {
  const file = loadWorkflowAssets(opts.workflowAbs);
  if (file === null) return { uploads: [], records: [] };
  const loaded = loadGraphFile(opts.workflowAbs, opts.workflowAbs);
  for (const slot of file.slots) {
    const node = slot.target.slice(0, slot.target.indexOf("."));
    if (loaded.graph[node] === void 0) {
      throw new DaoyanCliError({
        code: "story_gate_failed",
        message: `\u8D44\u4EA7\u69FD\u4F4D ${slot.name} \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8282\u70B9 ${node}`,
        details: { blockers: [{ code: "workflow_unresolved", message: `\u69FD\u4F4D ${slot.name} \u8282\u70B9\u4E0D\u5B58\u5728` }] }
      });
    }
  }
  const characters = loadCharacters(opts.root);
  let characterIndex = 0;
  const voices = dialogueVoices(opts.root, opts.shot);
  let voiceIndex = 0;
  const uploads = [];
  const records = [];
  for (const slot of file.slots) {
    const mapping = opts.shot.asset_slots?.[slot.name];
    let resolved = null;
    if (slot.kind === "character") {
      let owner = null;
      let explicitAsset = null;
      if (mapping !== void 0 && mapping !== "") {
        const parsed = parseSlotMapping(mapping);
        owner = parsed.owner;
        explicitAsset = parsed.asset;
      } else {
        const cast = opts.shot.characters ?? [];
        const ref = cast[characterIndex];
        characterIndex++;
        const parsed = castRefOf(ref);
        if (parsed !== null) {
          const character = characters.characters.find((c) => c.id === parsed.id);
          owner = `${parsed.id}/${parsed.form ?? character?.default_form ?? ""}`;
        }
      }
      if (owner === null || owner === "") {
        if (slot.required === false) continue;
        throw new DaoyanCliError({
          code: "story_gate_failed",
          message: `\u69FD\u4F4D ${slot.name} \u6CA1\u6709\u53EF\u7528\u7684\u89D2\u8272`
        });
      }
      resolved = resolveCharacterAsset(opts.root, slot, owner, explicitAsset, characters, opts.shot);
    } else if (slot.kind === "scene") {
      resolved = resolveSceneAsset(opts.root, slot, opts.shot);
    } else {
      let owner = null;
      let explicitAsset = null;
      if (mapping !== void 0 && mapping !== "") {
        const parsed = parseSlotMapping(mapping);
        owner = parsed.owner;
        explicitAsset = parsed.asset;
      } else {
        owner = voices[voiceIndex] ?? null;
        voiceIndex++;
      }
      if (owner === null || owner === "") {
        if (slot.required === false) continue;
        throw new DaoyanCliError({
          code: "story_gate_failed",
          message: `\u69FD\u4F4D ${slot.name} \u6CA1\u6709\u53EF\u7528\u7684\u97F3\u8272`
        });
      }
      resolved = resolveVoiceAsset(opts.root, slot, owner, explicitAsset);
    }
    const abs = ensureAssetFile(opts.root, resolved.asset, `\u69FD\u4F4D ${slot.name}`);
    records.push({
      slot: slot.name,
      kind: slot.kind,
      owner: resolved.owner,
      asset_id: resolved.asset.id,
      path: resolved.asset.path,
      sha256: resolved.asset.sha256,
      bytes: resolved.asset.bytes
    });
    uploads.push({
      logical: `asset:${slot.name}`,
      source: abs,
      desiredName: `${slot.name}_${resolved.asset.id}${extOf(resolved.asset.path)}`,
      target: splitTarget(slot.target)
    });
  }
  return { uploads, records };
}
function validateWorkflowAssetsGraph(file, graph, label) {
  const issues = [];
  for (const slot of file.slots) {
    const node = slot.target.slice(0, slot.target.indexOf("."));
    if (graph[node] === void 0) {
      issues.push({
        path: `${label}:${slot.name}`,
        code: "asset_slot_node_missing",
        severity: "error",
        message: `\u8D44\u4EA7\u69FD\u4F4D ${slot.name} \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8282\u70B9 ${node}`,
        hint: "\u4FEE\u6B63 target \u6216\u5148\u6DFB\u52A0\u8282\u70B9\u3002"
      });
    }
  }
  return issues;
}
function castRefOf(value) {
  return parseCastRef(value);
}
var init_workflow_assets = __esm({
  "src/core/story/workflow-assets.mts"() {
    "use strict";
    init_errors();
    init_load();
    init_store2();
    init_assets();
  }
});

// src/core/story/validate.mts
import { existsSync as existsSync21, readFileSync as readFileSync17, readdirSync as readdirSync6 } from "fs";
import { join as join18 } from "path";
function issue(episodeId, path, code, severity, message, hint) {
  return { episode_id: episodeId, path, code, severity, message, hint };
}
function blocker(code, message, ref, shots) {
  return { code, message, ...ref !== void 0 ? { ref } : {}, ...shots !== void 0 ? { shots } : {} };
}
function recordOf(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value;
}
function stringOf(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text === "" ? null : text;
}
function validId(value) {
  return STORY_ID_RE.test(value);
}
function checkAssetFile(root, asset, episodeId, label, verifyHashes, issues) {
  if (!asset.path.startsWith(STORY_ASSET_PREFIX) || asset.path.includes("..")) {
    issues.push(
      issue(
        episodeId,
        label,
        "asset_path_invalid",
        "error",
        `\u8D44\u4EA7\u8DEF\u5F84\u4E0D\u5728 ${STORY_ASSET_PREFIX}\uFF1A${asset.path}`,
        "\u91CD\u65B0\u5165\u5E93\u8D44\u4EA7\u3002"
      )
    );
    return false;
  }
  if (!ALLOWED_ASSET_TYPES.has(asset.content_type)) {
    issues.push(
      issue(
        episodeId,
        label,
        "asset_type_invalid",
        "error",
        `\u4E0D\u652F\u6301\u7684\u8D44\u4EA7\u7C7B\u578B\uFF1A${asset.content_type}`,
        "\u4F7F\u7528 PNG / JPEG / WebP / WAV / MP3 / FLAC / OGG\u3002"
      )
    );
    return false;
  }
  const abs = join18(root, asset.path);
  if (!existsSync21(abs)) {
    issues.push(
      issue(
        episodeId,
        label,
        "asset_file_missing",
        "error",
        `\u8D44\u4EA7\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${asset.path}`,
        "\u91CD\u65B0\u5165\u5E93\uFF0C\u6216 git lfs pull\u3002"
      )
    );
    return false;
  }
  if (isLfsPointerFile(abs)) {
    issues.push(
      issue(
        episodeId,
        label,
        "asset_lfs_pointer",
        "error",
        `\u8D44\u4EA7\u4ECD\u662F Git LFS pointer\uFF1A${asset.path}`,
        "\u8FD0\u884C git lfs pull\u3002"
      )
    );
    return false;
  }
  if (verifyHashes) {
    try {
      const content = readFileSync17(abs);
      if (sha256(content) !== asset.sha256) {
        issues.push(
          issue(
            episodeId,
            label,
            "asset_hash_mismatch",
            "error",
            `\u8D44\u4EA7\u54C8\u5E0C\u4E0D\u5339\u914D\uFF1A${asset.path}`,
            "\u91CD\u65B0\u5165\u5E93\u8D44\u4EA7\u3002"
          )
        );
        return false;
      }
    } catch {
      issues.push(
        issue(
          episodeId,
          label,
          "asset_hash_read_failed",
          "warning",
          `\u65E0\u6CD5\u6821\u9A8C\u8D44\u4EA7\u54C8\u5E0C\uFF1A${asset.path}`,
          "\u68C0\u67E5\u6587\u4EF6\u6743\u9650\u3002"
        )
      );
    }
  }
  return true;
}
function validateAssets(root, assets, episodeId, label, verifyHashes, issues) {
  const seen = /* @__PURE__ */ new Set();
  for (const asset of assets) {
    const current = `${label}.assets.${asset.id}`;
    if (!validId(asset.id)) {
      issues.push(
        issue(
          episodeId,
          current,
          "asset_id_invalid",
          "error",
          `\u8D44\u4EA7 id \u975E\u6CD5\uFF1A${asset.id}`,
          "\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD / \u6570\u5B57 / -\u3002"
        )
      );
    }
    if (asset.id === "reference") {
      issues.push(
        issue(
          episodeId,
          current,
          "asset_id_reserved",
          "error",
          "\u8D44\u4EA7 id \u4E0D\u80FD\u662F\u4FDD\u7559\u5B57 reference",
          "\u6362\u4E00\u4E2A id\u3002"
        )
      );
    }
    if (seen.has(asset.id)) {
      issues.push(
        issue(
          episodeId,
          current,
          "asset_id_duplicate",
          "error",
          `\u8D44\u4EA7 id \u91CD\u590D\uFF1A${asset.id}`,
          "\u8D44\u4EA7 id \u5FC5\u987B\u552F\u4E00\u3002"
        )
      );
    }
    seen.add(asset.id);
    checkAssetFile(root, asset, episodeId, current, verifyHashes, issues);
  }
}
function validateCharacters(root, doc, voices, episodeIds, verifyHashes, issues) {
  if (doc.version !== 1) {
    issues.push(
      issue(
        null,
        "story/characters.json",
        "characters_version_invalid",
        "error",
        "characters.json version \u5FC5\u987B\u4E3A 1",
        "\u91CD\u65B0 story init \u6216\u4FEE\u6B63 version\u3002"
      )
    );
  }
  const seen = /* @__PURE__ */ new Set();
  const voiceIds = new Set(voices.voices.map((v) => v.id));
  for (const character of doc.characters) {
    const label = `story/characters.json:${character.id}`;
    if (!validId(character.id)) {
      issues.push(
        issue(
          null,
          label,
          "character_id_invalid",
          "error",
          `\u89D2\u8272 id \u975E\u6CD5\uFF1A${character.id}`,
          "\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD / \u6570\u5B57 / -\u3002"
        )
      );
    }
    if (seen.has(character.id)) {
      issues.push(
        issue(
          null,
          label,
          "character_id_duplicate",
          "error",
          `\u89D2\u8272 id \u91CD\u590D\uFF1A${character.id}`,
          "\u89D2\u8272 id \u5FC5\u987B\u552F\u4E00\u3002"
        )
      );
    }
    seen.add(character.id);
    if (stringOf(character.name) === null) {
      issues.push(issue(null, label, "character_name_missing", "error", "\u89D2\u8272 name \u4E3A\u7A7A", "\u586B\u5199\u5C55\u793A\u540D\u3002"));
    }
    if (character.introduced_in !== void 0 && !episodeIds.has(character.introduced_in)) {
      issues.push(
        issue(
          null,
          label,
          "character_introduced_in_missing",
          "error",
          `introduced_in \u6307\u5411\u4E0D\u5B58\u5728\u7684\u5267\u96C6\uFF1A${character.introduced_in}`,
          "\u4FEE\u6B63\u6216\u5220\u9664\u8BE5\u5B57\u6BB5\u3002"
        )
      );
    }
    if (!Array.isArray(character.forms) || character.forms.length === 0) {
      issues.push(issue(null, label, "forms_empty", "error", "\u89D2\u8272\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u5F62\u6001", "\u6DFB\u52A0 forms\u3002"));
      continue;
    }
    const formIds = /* @__PURE__ */ new Set();
    for (const form of character.forms) {
      const formLabel = `${label}.forms.${form.id}`;
      if (!validId(form.id)) {
        issues.push(
          issue(
            null,
            formLabel,
            "form_id_invalid",
            "error",
            `\u5F62\u6001 id \u975E\u6CD5\uFF1A${form.id}`,
            "\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD / \u6570\u5B57 / -\u3002"
          )
        );
      }
      if (formIds.has(form.id)) {
        issues.push(
          issue(
            null,
            formLabel,
            "form_id_duplicate",
            "error",
            `\u5F62\u6001 id \u91CD\u590D\uFF1A${form.id}`,
            "\u5F62\u6001 id \u5728\u89D2\u8272\u5185\u552F\u4E00\u3002"
          )
        );
      }
      formIds.add(form.id);
      validateAssets(root, form.assets ?? [], null, formLabel, verifyHashes, issues);
      if (form.reference_asset !== void 0 && form.reference_asset !== null && form.reference_asset !== "") {
        if (!form.assets.some((a) => a.id === form.reference_asset)) {
          issues.push(
            issue(
              null,
              formLabel,
              "reference_asset_missing",
              "error",
              `reference_asset \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8D44\u4EA7\uFF1A${form.reference_asset}`,
              "\u5148\u7528 story asset set-reference \u6307\u5B9A\u3002"
            )
          );
        }
      }
    }
    if (!formIds.has(character.default_form)) {
      issues.push(
        issue(
          null,
          label,
          "default_form_missing",
          "error",
          `default_form \u6307\u5411\u4E0D\u5B58\u5728\u7684\u5F62\u6001\uFF1A${character.default_form}`,
          "\u4FEE\u6B63 default_form\u3002"
        )
      );
    }
    for (const voiceId of character.voice_ids ?? []) {
      if (!voiceIds.has(voiceId)) {
        issues.push(
          issue(
            null,
            label,
            "voice_id_missing",
            "error",
            `voice_ids \u5F15\u7528\u4E0D\u5B58\u5728\u7684\u97F3\u8272\uFF1A${voiceId}`,
            "\u5148\u767B\u8BB0\u97F3\u8272\u3002"
          )
        );
      }
    }
  }
}
function validateScenes(root, doc, episodeIds, verifyHashes, issues) {
  if (doc.version !== 1) {
    issues.push(
      issue(
        null,
        "story/scenes.json",
        "scenes_version_invalid",
        "error",
        "scenes.json version \u5FC5\u987B\u4E3A 1",
        "\u4FEE\u6B63 version\u3002"
      )
    );
  }
  const seen = /* @__PURE__ */ new Set();
  for (const scene of doc.scenes) {
    const label = `story/scenes.json:${scene.id}`;
    if (!validId(scene.id)) {
      issues.push(
        issue(
          null,
          label,
          "scene_id_invalid",
          "error",
          `\u573A\u666F id \u975E\u6CD5\uFF1A${scene.id}`,
          "\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD / \u6570\u5B57 / -\u3002"
        )
      );
    }
    if (seen.has(scene.id)) {
      issues.push(
        issue(null, label, "scene_id_duplicate", "error", `\u573A\u666F id \u91CD\u590D\uFF1A${scene.id}`, "\u573A\u666F id \u5FC5\u987B\u552F\u4E00\u3002")
      );
    }
    seen.add(scene.id);
    if (stringOf(scene.name) === null) {
      issues.push(issue(null, label, "scene_name_missing", "error", "\u573A\u666F name \u4E3A\u7A7A", "\u586B\u5199\u5C55\u793A\u540D\u3002"));
    }
    if (scene.introduced_in !== void 0 && !episodeIds.has(scene.introduced_in)) {
      issues.push(
        issue(
          null,
          label,
          "scene_introduced_in_missing",
          "error",
          `introduced_in \u6307\u5411\u4E0D\u5B58\u5728\u7684\u5267\u96C6\uFF1A${scene.introduced_in}`,
          "\u4FEE\u6B63\u6216\u5220\u9664\u3002"
        )
      );
    }
    validateAssets(root, scene.assets ?? [], null, label, verifyHashes, issues);
    if (scene.reference_asset !== void 0 && scene.reference_asset !== null && scene.reference_asset !== "") {
      if (!scene.assets.some((a) => a.id === scene.reference_asset)) {
        issues.push(
          issue(
            null,
            label,
            "reference_asset_missing",
            "error",
            `reference_asset \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8D44\u4EA7\uFF1A${scene.reference_asset}`,
            "\u5148\u7528 set-reference \u6307\u5B9A\u3002"
          )
        );
      }
    }
  }
}
function validateVoices(root, doc, characters, verifyHashes, issues) {
  if (doc.version !== 1) {
    issues.push(
      issue(
        null,
        "story/voices.json",
        "voices_version_invalid",
        "error",
        "voices.json version \u5FC5\u987B\u4E3A 1",
        "\u4FEE\u6B63 version\u3002"
      )
    );
  }
  const characterIds = new Set(characters.characters.map((c) => c.id));
  const seen = /* @__PURE__ */ new Set();
  for (const voice of doc.voices) {
    const label = `story/voices.json:${voice.id}`;
    if (!validId(voice.id)) {
      issues.push(
        issue(
          null,
          label,
          "voice_id_invalid",
          "error",
          `\u97F3\u8272 id \u975E\u6CD5\uFF1A${voice.id}`,
          "\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD / \u6570\u5B57 / -\u3002"
        )
      );
    }
    if (seen.has(voice.id)) {
      issues.push(
        issue(null, label, "voice_id_duplicate", "error", `\u97F3\u8272 id \u91CD\u590D\uFF1A${voice.id}`, "\u97F3\u8272 id \u5FC5\u987B\u552F\u4E00\u3002")
      );
    }
    seen.add(voice.id);
    if (!characterIds.has(voice.character_id)) {
      issues.push(
        issue(
          null,
          label,
          "voice_character_missing",
          "error",
          `\u97F3\u8272\u6240\u5C5E\u89D2\u8272\u4E0D\u5B58\u5728\uFF1A${voice.character_id}`,
          "\u5148\u767B\u8BB0\u89D2\u8272\u3002"
        )
      );
    }
    if (voice.mode !== "reference" && voice.mode !== "text") {
      issues.push(
        issue(
          null,
          label,
          "voice_mode_invalid",
          "error",
          `\u97F3\u8272 mode \u975E\u6CD5\uFF1A${voice.mode}`,
          "\u4F7F\u7528 reference / text\u3002"
        )
      );
    }
    validateAssets(root, voice.assets ?? [], null, label, verifyHashes, issues);
    if (voice.mode === "reference" && (voice.reference_asset === void 0 || voice.reference_asset === null || voice.reference_asset === "")) {
      issues.push(
        issue(
          null,
          label,
          "voice_reference_missing",
          "warning",
          "reference \u6A21\u5F0F\u97F3\u8272\u5C1A\u672A\u6307\u5B9A\u53C2\u8003\u97F3\u9891",
          "\u5165\u5E93\u97F3\u9891\u540E story asset set-reference\u3002"
        )
      );
    } else if (voice.reference_asset !== void 0 && voice.reference_asset !== null && voice.reference_asset !== "") {
      if (!voice.assets.some((a) => a.id === voice.reference_asset)) {
        issues.push(
          issue(
            null,
            label,
            "reference_asset_missing",
            "error",
            `reference_asset \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8D44\u4EA7\uFF1A${voice.reference_asset}`,
            "\u5148\u7528 set-reference \u6307\u5B9A\u3002"
          )
        );
      }
    }
    if (voice.mode === "text" && stringOf(voice.description) === null) {
      issues.push(
        issue(
          null,
          label,
          "voice_text_description_missing",
          "warning",
          "text \u6A21\u5F0F\u97F3\u8272\u7F3A\u5C11 description",
          "\u8865\u5145\u6587\u672C\u63CF\u8FF0\u3002"
        )
      );
    }
  }
}
function episodeIdSet(root) {
  return new Set(listEpisodeMetas(root).map((e) => e.id));
}
function validateScript(root, episodeId, issues) {
  const meta = loadScriptMeta(root, episodeId);
  const label = `episodes/${episodeId}/${SCRIPT_FILE}`;
  if (meta.version !== 1) {
    issues.push(
      issue(
        episodeId,
        label,
        "script_version_invalid",
        "error",
        "script.json version \u5FC5\u987B\u4E3A 1",
        "\u4FEE\u6B63 version\u3002"
      )
    );
  }
  if (!Number.isInteger(meta.revision) || meta.revision < 0) {
    issues.push(
      issue(
        episodeId,
        label,
        "script_revision_invalid",
        "error",
        "script revision \u5FC5\u987B\u662F\u975E\u8D1F\u6574\u6570",
        "\u91CD\u65B0\u540C\u6B65\u5267\u672C\u3002"
      )
    );
  }
  if (meta.revision === 0) return;
  const text = loadScriptText(root, episodeId);
  if (text === "") {
    issues.push(
      issue(
        episodeId,
        `episodes/${episodeId}/script.md`,
        "script_text_missing",
        "error",
        "\u5267\u672C\u6B63\u6587\u7F3A\u5931",
        "\u91CD\u65B0 story script sync\u3002"
      )
    );
    return;
  }
  if (sha256(text) !== meta.sha256) {
    issues.push(
      issue(
        episodeId,
        `episodes/${episodeId}/script.md`,
        "script_hash_mismatch",
        "error",
        "\u5267\u672C\u6B63\u6587\u4E0E script.json \u54C8\u5E0C\u4E0D\u4E00\u81F4",
        "\u91CD\u65B0 story script sync\u3002"
      )
    );
  }
  if (meta.status === "approved" && meta.approved_at === null) {
    issues.push(
      issue(
        episodeId,
        label,
        "script_approved_at_missing",
        "warning",
        "approved \u72B6\u6001\u7F3A\u5C11 approved_at",
        "\u91CD\u65B0 approve\u3002"
      )
    );
  }
  if (meta.status === "draft" && meta.approved_at !== null) {
    issues.push(
      issue(
        episodeId,
        label,
        "script_draft_has_approved_at",
        "warning",
        "draft \u72B6\u6001\u4ECD\u5E26 approved_at",
        "\u91CD\u65B0 sync \u6216 approve\u3002"
      )
    );
  }
}
function checkBreakdownDoc(root, episodeId, doc, scriptRevision, scriptSha, characters, scenes, voices, issues) {
  const label = `episodes/${episodeId}/${BREAKDOWN_FILE}`;
  if (doc.version !== 1) {
    issues.push(
      issue(
        episodeId,
        label,
        "breakdown_version_invalid",
        "error",
        "breakdown version \u5FC5\u987B\u4E3A 1",
        "\u4FEE\u6B63 version\u3002"
      )
    );
  }
  if (doc.episode_id !== episodeId) {
    issues.push(
      issue(
        episodeId,
        label,
        "breakdown_episode_mismatch",
        "error",
        `episode_id=${doc.episode_id} \u4E0E\u76EE\u5F55\u4E0D\u4E00\u81F4`,
        "\u4FEE\u6B63 episode_id\u3002"
      )
    );
  }
  if (!Number.isInteger(doc.source_revision) || doc.source_revision < 0 || doc.source_revision > scriptRevision) {
    issues.push(
      issue(
        episodeId,
        label,
        "breakdown_revision_invalid",
        "error",
        `source_revision=${doc.source_revision} \u975E\u6CD5\uFF08\u5F53\u524D ${scriptRevision}\uFF09`,
        "\u91CD\u65B0\u62C6\u89E3\u3002"
      )
    );
  } else if (doc.source_revision < scriptRevision) {
    issues.push(
      issue(episodeId, label, "breakdown_stale", "warning", "\u62C6\u89E3\u57FA\u4E8E\u65E7\u5267\u672C", "\u91CD\u65B0\u62C6\u89E3\u6216\u66F4\u65B0 source_revision\u3002")
    );
  } else if (doc.source_sha256 !== scriptSha) {
    issues.push(
      issue(
        episodeId,
        label,
        "breakdown_hash_mismatch",
        "error",
        "\u62C6\u89E3 source_sha256 \u4E0E\u5F53\u524D\u5267\u672C\u4E0D\u4E00\u81F4",
        "\u91CD\u65B0\u62C6\u89E3\u3002"
      )
    );
  }
  const beatIds = /* @__PURE__ */ new Set();
  for (const beat of doc.beats ?? []) {
    if (!validId(beat.id)) {
      issues.push(
        issue(
          episodeId,
          `${label}:beats.${beat.id}`,
          "beat_id_invalid",
          "error",
          `beat id \u975E\u6CD5\uFF1A${beat.id}`,
          "\u4F7F\u7528\u5C0F\u5199\u5B57\u6BCD / \u6570\u5B57 / -\u3002"
        )
      );
    }
    if (beatIds.has(beat.id)) {
      issues.push(
        issue(
          episodeId,
          `${label}:beats.${beat.id}`,
          "beat_id_duplicate",
          "error",
          `beat id \u91CD\u590D\uFF1A${beat.id}`,
          "beat id \u5FC5\u987B\u552F\u4E00\u3002"
        )
      );
    }
    beatIds.add(beat.id);
  }
  const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
  const allowedForms = /* @__PURE__ */ new Map();
  for (const item of doc.characters) {
    const itemLabel = `${label}:characters.${item.id}`;
    const character = characterMap.get(item.id);
    if (character === void 0) {
      issues.push(
        issue(
          episodeId,
          itemLabel,
          "breakdown_character_missing",
          "error",
          `\u89D2\u8272\u4E0D\u5B58\u5728\uFF1A${item.id}`,
          "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
        )
      );
      continue;
    }
    if (!Array.isArray(item.forms) || item.forms.length === 0) {
      issues.push(
        issue(
          episodeId,
          itemLabel,
          "breakdown_forms_empty",
          "error",
          `\u89D2\u8272 ${item.id} \u6CA1\u6709\u58F0\u660E\u5F62\u6001`,
          "\u81F3\u5C11\u58F0\u660E\u4E00\u4E2A\u5F62\u6001\u3002"
        )
      );
      continue;
    }
    const forms = /* @__PURE__ */ new Set();
    for (const formId of item.forms) {
      if (!character.forms.some((f) => f.id === formId)) {
        issues.push(
          issue(
            episodeId,
            itemLabel,
            "breakdown_form_missing",
            "error",
            `\u5F62\u6001\u4E0D\u5B58\u5728\uFF1A${item.id}/${formId}`,
            "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
          )
        );
        continue;
      }
      forms.add(formId);
    }
    allowedForms.set(item.id, forms);
  }
  const sceneIds = new Set(scenes.scenes.map((s) => s.id));
  for (const sceneId of doc.scenes) {
    if (!sceneIds.has(sceneId)) {
      issues.push(
        issue(
          episodeId,
          `${label}:scenes.${sceneId}`,
          "breakdown_scene_missing",
          "error",
          `\u573A\u666F\u4E0D\u5B58\u5728\uFF1A${sceneId}`,
          "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
        )
      );
    }
  }
  const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
  for (const voiceId of doc.voices) {
    const voice = voiceMap.get(voiceId);
    if (voice === void 0) {
      issues.push(
        issue(
          episodeId,
          `${label}:voices.${voiceId}`,
          "breakdown_voice_missing",
          "error",
          `\u97F3\u8272\u4E0D\u5B58\u5728\uFF1A${voiceId}`,
          "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
        )
      );
      continue;
    }
    if (!characterMap.has(voice.character_id) || !doc.characters.some((c) => c.id === voice.character_id)) {
      issues.push(
        issue(
          episodeId,
          `${label}:voices.${voiceId}`,
          "breakdown_voice_character_missing",
          "error",
          `\u97F3\u8272\u6240\u5C5E\u89D2\u8272\u4E0D\u5728\u672C\u96C6\u62C6\u89E3\uFF1A${voice.character_id}`,
          "\u628A\u89D2\u8272\u52A0\u5165\u672C\u96C6\u62C6\u89E3\u3002"
        )
      );
    }
  }
}
function castRefOf2(value) {
  if (typeof value === "string") {
    const slash = value.indexOf("/");
    if (slash > 0) return { id: value.slice(0, slash), form: value.slice(slash + 1) };
    return { id: value, form: null };
  }
  const record = recordOf(value);
  if (record === null) return null;
  const id = stringOf(record.id);
  if (id === null) return null;
  const form = stringOf(record.form);
  return { id, form };
}
function sceneRefOf(value) {
  if (typeof value === "string") return stringOf(value);
  const record = recordOf(value);
  return record !== null ? stringOf(record.id) : null;
}
function checkEpisodeShotsDoc(root, episodeId, project, shots, breakdown, characters, scenes, voices, scriptRevision, scriptSha, issues) {
  const label = `episodes/${episodeId}/${SHOTS_FILE}`;
  if (shots.meta.episode_id !== episodeId) {
    issues.push(
      issue(
        episodeId,
        `${label}:meta.episode_id`,
        "shots_episode_mismatch",
        "error",
        `meta.episode_id=${String(shots.meta.episode_id)} \u4E0E\u76EE\u5F55\u4E0D\u4E00\u81F4`,
        "\u4FEE\u6B63 meta.episode_id\u3002"
      )
    );
  }
  const rev = shots.meta.script_revision;
  if (typeof rev !== "number" || !Number.isInteger(rev) || rev < 0) {
    issues.push(
      issue(
        episodeId,
        `${label}:meta.script_revision`,
        "shots_script_revision_invalid",
        "error",
        "meta.script_revision \u7F3A\u5931\u6216\u975E\u6CD5",
        "\u7528 story shots set \u5199\u5165\u3002"
      )
    );
  } else if (rev > scriptRevision) {
    issues.push(
      issue(
        episodeId,
        `${label}:meta.script_revision`,
        "shots_script_revision_future",
        "error",
        `meta.script_revision=${rev} \u5927\u4E8E\u5F53\u524D\u5267\u672C ${scriptRevision}`,
        "\u4FEE\u6B63 meta\u3002"
      )
    );
  } else if (rev < scriptRevision) {
    issues.push(issue(episodeId, label, "shots_stale", "warning", "\u5206\u955C\u57FA\u4E8E\u65E7\u5267\u672C", "\u66F4\u65B0\u5206\u955C\u3002"));
  } else if (shots.meta.script_sha256 !== scriptSha) {
    issues.push(
      issue(
        episodeId,
        `${label}:meta.script_sha256`,
        "shots_hash_mismatch",
        "error",
        "meta.script_sha256 \u4E0E\u5F53\u524D\u5267\u672C\u4E0D\u4E00\u81F4",
        "\u66F4\u65B0\u5206\u955C\u3002"
      )
    );
  }
  if (scriptRevision > 0 && shots.shots.length === 0) {
    issues.push(issue(episodeId, `${label}:shots`, "shots_empty", "error", "\u5206\u955C\u8868\u4E3A\u7A7A", "\u6DFB\u52A0\u81F3\u5C11\u4E00\u4E2A\u955C\u5934\u3002"));
  }
  if (!Number.isFinite(shots.meta.width) || shots.meta.width <= 0) {
    issues.push(
      issue(
        episodeId,
        `${label}:meta.width`,
        "shots_width_invalid",
        "error",
        "meta.width \u5FC5\u987B\u662F\u6B63\u6570",
        "\u586B\u5199\u751F\u6210\u5BBD\u5EA6\u3002"
      )
    );
  }
  if (!Number.isFinite(shots.meta.height) || shots.meta.height <= 0) {
    issues.push(
      issue(
        episodeId,
        `${label}:meta.height`,
        "shots_height_invalid",
        "error",
        "meta.height \u5FC5\u987B\u662F\u6B63\u6570",
        "\u586B\u5199\u751F\u6210\u9AD8\u5EA6\u3002"
      )
    );
  }
  const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
  const sceneMap = new Map(scenes.scenes.map((s) => [s.id, s]));
  const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
  const breakdownCharacters = new Map((breakdown?.characters ?? []).map((c) => [c.id, new Set(c.forms)]));
  const breakdownScenes = new Set(breakdown?.scenes ?? []);
  const breakdownVoices = new Set(breakdown?.voices ?? []);
  const beatIds = new Set((breakdown?.beats ?? []).map((b) => b.id));
  const shotIds = /* @__PURE__ */ new Set();
  for (const shot of shots.shots) {
    const shotLabel = `${label}:shots.${shot.id}`;
    if (shotIds.has(shot.id)) {
      issues.push(
        issue(episodeId, shotLabel, "shot_id_duplicate", "error", `\u955C\u53F7\u91CD\u590D\uFF1A${shot.id}`, "\u955C\u53F7\u5FC5\u987B\u552F\u4E00\u3002")
      );
    }
    shotIds.add(shot.id);
    if (typeof shot.seed !== "number") {
      issues.push(issue(episodeId, shotLabel, "shot_seed_invalid", "error", "\u7F3A\u5C11\u6570\u503C seed", "\u586B\u5199 seed\u3002"));
    }
    if (typeof shot.prompt !== "string" || shot.prompt.trim() === "") {
      issues.push(issue(episodeId, shotLabel, "shot_prompt_empty", "error", "prompt \u4E3A\u7A7A", "\u586B\u5199\u63D0\u793A\u8BCD\u3002"));
    }
    for (const ref of shot.characters ?? []) {
      const cast = castRefOf2(ref);
      if (cast === null) {
        issues.push(
          issue(
            episodeId,
            `${shotLabel}.characters`,
            "cast_invalid",
            "error",
            "\u89D2\u8272\u5F15\u7528\u975E\u6CD5",
            "\u4F7F\u7528 id \u6216 {id, form}\u3002"
          )
        );
        continue;
      }
      const character = characterMap.get(cast.id);
      if (character === void 0) {
        issues.push(
          issue(
            episodeId,
            `${shotLabel}.characters`,
            "cast_character_missing",
            "error",
            `\u89D2\u8272\u4E0D\u5B58\u5728\uFF1A${cast.id}`,
            "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
          )
        );
        continue;
      }
      const form = cast.form ?? character.default_form;
      if (!character.forms.some((f) => f.id === form)) {
        issues.push(
          issue(
            episodeId,
            `${shotLabel}.characters`,
            "cast_form_missing",
            "error",
            `\u5F62\u6001\u4E0D\u5B58\u5728\uFF1A${cast.id}/${form}`,
            "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
          )
        );
      }
      const allowed = breakdownCharacters.get(cast.id);
      if (allowed === void 0 || !allowed.has(form)) {
        issues.push(
          issue(
            episodeId,
            `${shotLabel}.characters`,
            "entity_not_in_breakdown",
            "error",
            `\u955C\u5934\u4F7F\u7528\u4E86\u672C\u96C6\u62C6\u89E3\u672A\u58F0\u660E\u7684\u89D2\u8272\u5F62\u6001\uFF1A${cast.id}/${form}`,
            "\u5148\u66F4\u65B0\u672C\u96C6\u62C6\u89E3\u3002"
          )
        );
      }
    }
    const sceneId = sceneRefOf(shot.scene);
    if (sceneId === null) {
      issues.push(
        issue(episodeId, `${shotLabel}.scene`, "scene_missing", "error", "\u573A\u666F\u4E3A\u7A7A\u6216\u975E\u6CD5", "\u586B\u5199\u573A\u666F id\u3002")
      );
    } else if (!sceneMap.has(sceneId)) {
      issues.push(
        issue(
          episodeId,
          `${shotLabel}.scene`,
          "scene_not_found",
          "error",
          `\u573A\u666F\u4E0D\u5B58\u5728\uFF1A${sceneId}`,
          "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
        )
      );
    } else if (!breakdownScenes.has(sceneId)) {
      issues.push(
        issue(
          episodeId,
          `${shotLabel}.scene`,
          "entity_not_in_breakdown",
          "error",
          `\u573A\u666F\u672A\u5728\u672C\u96C6\u62C6\u89E3\u58F0\u660E\uFF1A${sceneId}`,
          "\u5148\u66F4\u65B0\u672C\u96C6\u62C6\u89E3\u3002"
        )
      );
    }
    const sceneAsset = shot.scene_asset;
    if (typeof sceneAsset === "string" && sceneAsset !== "" && sceneId !== null) {
      const scene = sceneMap.get(sceneId);
      if (scene !== void 0 && !scene.assets.some((a) => a.id === sceneAsset)) {
        issues.push(
          issue(
            episodeId,
            `${shotLabel}.scene_asset`,
            "scene_asset_missing",
            "error",
            `\u573A\u666F\u8D44\u4EA7\u4E0D\u5B58\u5728\uFF1A${sceneId}/${sceneAsset}`,
            "\u4FEE\u6B63 scene_asset\u3002"
          )
        );
      }
    }
    for (const line of shot.dialogue ?? []) {
      const lineLabel = `${shotLabel}.dialogue.${line.character}`;
      const cast = breakdownCharacters.get(line.character);
      if (cast === void 0) {
        issues.push(
          issue(
            episodeId,
            lineLabel,
            "dialogue_character_missing",
            "error",
            `\u53F0\u8BCD\u89D2\u8272\u4E0D\u5728\u672C\u96C6\u62C6\u89E3\uFF1A${line.character}`,
            "\u5148\u66F4\u65B0\u672C\u96C6\u62C6\u89E3\u3002"
          )
        );
        continue;
      }
      const character = characterMap.get(line.character);
      if (character === void 0) continue;
      const voiceId = line.voice !== void 0 && line.voice !== "" ? line.voice : (character.voice_ids ?? [])[0];
      if (voiceId === void 0) {
        issues.push(
          issue(
            episodeId,
            lineLabel,
            "dialogue_voice_missing",
            "error",
            "\u53F0\u8BCD\u6CA1\u6709\u53EF\u7528\u97F3\u8272",
            "\u767B\u8BB0\u97F3\u8272\u5E76\u663E\u5F0F\u5F15\u7528\u3002"
          )
        );
        continue;
      }
      if ((character.voice_ids ?? []).length > 1 && (line.voice === void 0 || line.voice === "")) {
        issues.push(
          issue(
            episodeId,
            lineLabel,
            "dialogue_voice_ambiguous",
            "error",
            `\u89D2\u8272 ${line.character} \u6709\u591A\u4E2A\u97F3\u8272\uFF0C\u53F0\u8BCD\u5FC5\u987B\u663E\u5F0F voice`,
            "\u586B\u5199 dialogue.voice\u3002"
          )
        );
      }
      const voice = voiceMap.get(voiceId);
      if (voice === void 0) {
        issues.push(
          issue(
            episodeId,
            lineLabel,
            "dialogue_voice_not_found",
            "error",
            `\u97F3\u8272\u4E0D\u5B58\u5728\uFF1A${voiceId}`,
            "\u5148\u52A0\u5165\u5168\u5C40\u8BBE\u5B9A\u96C6\u3002"
          )
        );
      } else if (voice.character_id !== line.character) {
        issues.push(
          issue(
            episodeId,
            lineLabel,
            "dialogue_voice_mismatch",
            "error",
            `\u97F3\u8272 ${voiceId} \u4E0D\u5C5E\u4E8E ${line.character}`,
            "\u4FEE\u6B63 dialogue.voice\u3002"
          )
        );
      } else if (!breakdownVoices.has(voiceId)) {
        issues.push(
          issue(
            episodeId,
            lineLabel,
            "entity_not_in_breakdown",
            "error",
            `\u97F3\u8272\u672A\u5728\u672C\u96C6\u62C6\u89E3\u58F0\u660E\uFF1A${voiceId}`,
            "\u5148\u66F4\u65B0\u672C\u96C6\u62C6\u89E3\u3002"
          )
        );
      }
    }
    for (const ref of shot.script_refs ?? []) {
      if (beatIds.size > 0 && !beatIds.has(ref)) {
        issues.push(
          issue(
            episodeId,
            `${shotLabel}.script_refs`,
            "script_ref_missing",
            "error",
            `beat \u4E0D\u5B58\u5728\uFF1A${ref}`,
            "\u4FEE\u6B63 script_refs\u3002"
          )
        );
      }
    }
    for (const [slotName, mapping] of Object.entries(shot.asset_slots ?? {})) {
      if (typeof mapping !== "string" || mapping.trim() === "") {
        issues.push(
          issue(
            episodeId,
            `${shotLabel}.asset_slots.${slotName}`,
            "asset_slot_invalid",
            "error",
            "asset_slots \u7684\u503C\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32",
            "\u4F7F\u7528 owner \u6216 owner@asset\u3002"
          )
        );
        continue;
      }
      const at = mapping.lastIndexOf("@");
      const owner = at > 0 ? mapping.slice(0, at) : mapping;
      const slash = owner.indexOf("/");
      const ownerId = slash > 0 ? owner.slice(0, slash) : owner;
      const ownerForm = slash > 0 ? owner.slice(slash + 1) : null;
      const allowed = breakdownCharacters.get(ownerId);
      if (allowed !== void 0) {
        const form = ownerForm ?? characterMap.get(ownerId)?.default_form ?? null;
        if (form !== null && !allowed.has(form)) {
          issues.push(
            issue(
              episodeId,
              `${shotLabel}.asset_slots.${slotName}`,
              "entity_not_in_breakdown",
              "error",
              `\u8D44\u4EA7\u69FD\u4F4D\u5F15\u7528\u4E86\u62C6\u89E3\u672A\u58F0\u660E\u7684\u5F62\u6001\uFF1A${ownerId}/${form}`,
              "\u5148\u66F4\u65B0\u672C\u96C6\u62C6\u89E3\u3002"
            )
          );
        }
        continue;
      }
      if (breakdownVoices.has(ownerId)) continue;
      issues.push(
        issue(
          episodeId,
          `${shotLabel}.asset_slots.${slotName}`,
          "entity_not_in_breakdown",
          "error",
          `\u8D44\u4EA7\u69FD\u4F4D\u5F15\u7528\u4E86\u62C6\u89E3\u672A\u58F0\u660E\u7684\u5BF9\u8C61\uFF1A${owner}`,
          "\u5148\u66F4\u65B0\u672C\u96C6\u62C6\u89E3\uFF0C\u6216\u4FEE\u6B63 asset_slots\u3002"
        )
      );
    }
    const wfRef = shot.workflow ?? shots.workflow ?? project?.default_workflow ?? null;
    if (wfRef === null) {
      issues.push(
        issue(
          episodeId,
          shotLabel,
          "shot_workflow_missing",
          "error",
          "\u955C\u5934\u6CA1\u6709\u53EF\u7528 workflow",
          "\u8BBE\u7F6E project.default_workflow / shots.workflow / \u5355\u955C workflow\u3002"
        )
      );
    } else {
      try {
        const wf = resolveWorkflowRef(root, wfRef);
        if (!existsSync21(wf.abs)) {
          issues.push(
            issue(
              episodeId,
              shotLabel,
              "shot_workflow_missing",
              "error",
              `workflow \u4E0D\u5B58\u5728\uFF1A${wf.rel}`,
              "\u5148\u521B\u5EFA / \u5BFC\u5165 workflow\u3002"
            )
          );
        } else {
          if (!existsSync21(bindingsPathOf(wf.abs))) {
            issues.push(
              issue(
                episodeId,
                shotLabel,
                "shot_bindings_missing",
                "error",
                `workflow \u7F3A\u5C11 bindings\uFF1A${wf.rel}`,
                "shot/batch \u9700\u8981 bindings \u6CE8\u5165 prompt/seed\u3002"
              )
            );
          }
          try {
            resolveWorkflowAssets({ root, shot, workflowAbs: wf.abs });
          } catch (e) {
            issues.push(
              issue(
                episodeId,
                shotLabel,
                isDaoyanCliError(e) ? e.code : "asset_slot_invalid",
                "error",
                e instanceof Error ? e.message : String(e),
                "\u8865\u9F50\u8D44\u4EA7 / \u4E3B\u53C2\u8003\uFF0C\u6216\u4FEE\u6B63 workflow assets \u69FD\u4F4D\u3002"
              )
            );
          }
        }
      } catch {
        issues.push(
          issue(
            episodeId,
            shotLabel,
            "shot_workflow_invalid",
            "error",
            `workflow \u5F15\u7528\u975E\u6CD5\uFF1A${wfRef}`,
            "\u4FEE\u6B63 workflow \u5F15\u7528\u3002"
          )
        );
      }
    }
  }
}
function coverageBlockers(root, breakdown, characters, scenes, voices, shots) {
  if (breakdown === null) return [];
  const out = [];
  const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
  const sceneMap = new Map(scenes.scenes.map((s) => [s.id, s]));
  const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
  const shotIds = shots?.shots.map((s) => s.id) ?? [];
  for (const item of breakdown.characters) {
    const character = characterMap.get(item.id);
    if (character === void 0) continue;
    for (const formId of item.forms) {
      const form = character.forms.find((f) => f.id === formId);
      if (form === void 0) continue;
      if (!form.reference_asset) {
        out.push(
          blocker(
            "missing_reference",
            `\u89D2\u8272 ${item.id}/${formId} \u6CA1\u6709\u663E\u5F0F\u4E3B\u53C2\u8003\u56FE`,
            `character:${item.id}/form:${formId}`,
            shotIds.filter((id) => {
              const shot = shots?.shots.find((s) => s.id === id);
              return (shot?.characters ?? []).some((ref) => {
                const cast = castRefOf2(ref);
                return cast?.id === item.id && (cast.form ?? character.default_form) === formId;
              });
            })
          )
        );
        continue;
      }
      const asset = form.assets.find((a) => a.id === form.reference_asset);
      if (asset === void 0 || !usableAsset(root, asset)) {
        out.push(
          blocker(
            "missing_reference",
            `\u89D2\u8272 ${item.id}/${formId} \u7684\u4E3B\u53C2\u8003\u56FE\u4E0D\u53EF\u7528`,
            `character:${item.id}/form:${formId}`
          )
        );
      }
    }
  }
  for (const sceneId of breakdown.scenes) {
    const scene = sceneMap.get(sceneId);
    if (scene === void 0) continue;
    if (!scene.reference_asset) {
      out.push(blocker("missing_reference", `\u573A\u666F ${sceneId} \u6CA1\u6709\u663E\u5F0F\u4E3B\u53C2\u8003\u56FE`, `scene:${sceneId}`));
      continue;
    }
    const asset = scene.assets.find((a) => a.id === scene.reference_asset);
    if (asset === void 0 || !usableAsset(root, asset)) {
      out.push(blocker("missing_reference", `\u573A\u666F ${sceneId} \u7684\u4E3B\u53C2\u8003\u56FE\u4E0D\u53EF\u7528`, `scene:${sceneId}`));
    }
  }
  for (const voiceId of breakdown.voices) {
    const voice = voiceMap.get(voiceId);
    if (voice === void 0) continue;
    if (voice.mode === "text") {
      if (stringOf(voice.description) === null) {
        out.push(blocker("voice_not_ready", `\u97F3\u8272 ${voiceId} \u7F3A\u5C11\u6587\u672C\u63CF\u8FF0`, `voice:${voiceId}`));
      }
      continue;
    }
    if (!voice.reference_asset) {
      out.push(blocker("voice_not_ready", `\u97F3\u8272 ${voiceId} \u6CA1\u6709\u663E\u5F0F\u53C2\u8003\u97F3\u9891`, `voice:${voiceId}`));
      continue;
    }
    const asset = voice.assets.find((a) => a.id === voice.reference_asset);
    if (asset === void 0 || !usableAsset(root, asset)) {
      out.push(blocker("voice_not_ready", `\u97F3\u8272 ${voiceId} \u7684\u53C2\u8003\u97F3\u9891\u4E0D\u53EF\u7528`, `voice:${voiceId}`));
    }
  }
  return out;
}
function usableAsset(root, asset) {
  const abs = join18(root, asset.path);
  return existsSync21(abs) && !isLfsPointerFile(abs);
}
function breakdownAssetCount(breakdown, characters, scenes, voices) {
  if (breakdown === null) return 0;
  let count = 0;
  const characterMap = new Map(characters.characters.map((c) => [c.id, c]));
  for (const item of breakdown.characters) {
    const character = characterMap.get(item.id);
    if (character === void 0) continue;
    for (const formId of item.forms) {
      const form = character.forms.find((f) => f.id === formId);
      if (form !== void 0) count += form.assets.length;
    }
  }
  const sceneMap = new Map(scenes.scenes.map((s) => [s.id, s]));
  for (const sceneId of breakdown.scenes) count += sceneMap.get(sceneId)?.assets.length ?? 0;
  const voiceMap = new Map(voices.voices.map((v) => [v.id, v]));
  for (const voiceId of breakdown.voices) count += voiceMap.get(voiceId)?.assets.length ?? 0;
  return count;
}
function validateEpisodeFinals(root, episodeId, issues) {
  const dir = join18(root, FINAL_DIR, episodeId);
  if (!existsSync21(dir)) return;
  let entries = [];
  try {
    entries = readdirSync6(dir).filter((name) => name.endsWith(".json"));
  } catch {
    return;
  }
  for (const name of entries) {
    const manifest = readJsonIfExists(join18(dir, name));
    if (manifest === null) continue;
    const label = `${FINAL_DIR}/${episodeId}/${name}`;
    if (manifest.episode_id !== episodeId) {
      issues.push(
        issue(
          episodeId,
          label,
          "final_episode_mismatch",
          "error",
          `manifest episode_id=${String(manifest.episode_id)} \u4E0E\u76EE\u5F55\u4E0D\u4E00\u81F4`,
          "\u91CD\u65B0 wrap --episode\u3002"
        )
      );
    }
    for (const clip of manifest.clips ?? []) {
      if (typeof clip.run_id !== "string" || clip.run_id === "") continue;
      const run2 = readJsonIfExists(join18(root, "runs", clip.run_id, RUN_FILE));
      if (run2 !== null && run2.episode_id !== episodeId) {
        issues.push(
          issue(
            episodeId,
            label,
            "final_run_episode_mismatch",
            "error",
            `manifest \u5F15\u7528\u4E86\u5176\u5B83\u5267\u96C6\u7684 run ${clip.run_id}`,
            "\u91CD\u65B0\u5408\u7247\u6216\u4FEE\u6B63 manifest\u3002"
          )
        );
      }
    }
  }
}
function hasFinal(root, episodeId) {
  const dir = join18(root, FINAL_DIR, episodeId);
  if (!existsSync21(dir)) return false;
  try {
    return readdirSync6(dir).some((name) => /^cut-.*\.(mp4|webm|mov|mkv)$/i.test(name));
  } catch {
    return false;
  }
}
function computeEpisodeStoryStatus(root, episodeId, project) {
  const episodes = listEpisodeMetas(root);
  const meta = episodes.find((e) => e.id === episodeId);
  if (meta === void 0) {
    throw new Error(`episode not found: ${episodeId}`);
  }
  const script = loadScriptMeta(root, episodeId);
  const breakdown = loadBreakdown(root, episodeId);
  const shots = loadEpisodeShots(root, episodeId);
  const characters = loadCharacters(root);
  const scenes = loadScenes(root);
  const voices = loadVoices(root);
  const effectiveProject = project === void 0 ? readProjectAt(root) : project;
  const breakdownStale = breakdown !== null && breakdown.source_revision < script.revision;
  const shotsRevision = shots?.meta.script_revision;
  const shotsStale = typeof shotsRevision === "number" && shotsRevision < script.revision;
  const blockers = [];
  if (script.revision <= 0 || !existsSync21(join18(episodeDir(root, episodeId), "script.md"))) {
    blockers.push(blocker("script_missing", "\u672C\u96C6\u5267\u672C\u5C1A\u672A\u540C\u6B65"));
  } else if (script.status !== "approved") {
    blockers.push(blocker("script_draft", "\u672C\u96C6\u5267\u672C\u672A\u786E\u8BA4"));
  }
  if (breakdown === null) {
    blockers.push(blocker("breakdown_missing", "\u672C\u96C6\u62C6\u89E3\u4E0D\u5B58\u5728"));
  } else if (breakdownStale) {
    blockers.push(
      blocker(
        "breakdown_stale",
        `\u62C6\u89E3\u57FA\u4E8E script revision ${breakdown.source_revision}\uFF0C\u5F53\u524D\u4E3A ${script.revision}`
      )
    );
  }
  if (breakdown !== null) blockers.push(...coverageBlockers(root, breakdown, characters, scenes, voices, shots));
  if (shots === null) {
    blockers.push(blocker("shots_missing", "\u672C\u96C6\u5206\u955C\u4E0D\u5B58\u5728"));
  } else if (shots.shots.length === 0) {
    blockers.push(blocker("shots_missing", "\u672C\u96C6\u5206\u955C\u4E3A\u7A7A"));
  } else if (shotsStale) {
    blockers.push(
      blocker("shots_stale", `\u5206\u955C\u57FA\u4E8E script revision ${String(shotsRevision)}\uFF0C\u5F53\u524D\u4E3A ${script.revision}`)
    );
  }
  if (shots !== null) {
    for (const shot of shots.shots) {
      const wfRef = shot.workflow ?? shots.workflow ?? effectiveProject?.default_workflow ?? null;
      if (wfRef === null) {
        blockers.push(blocker("workflow_unresolved", `\u955C\u5934 ${shot.id} \u6CA1\u6709\u53EF\u7528 workflow`));
        break;
      }
      try {
        const wf = resolveWorkflowRef(root, wfRef);
        if (!existsSync21(wf.abs)) {
          blockers.push(blocker("workflow_unresolved", `\u955C\u5934 ${shot.id} \u7684 workflow \u4E0D\u5B58\u5728\uFF1A${wf.rel}`));
          break;
        }
        if (!existsSync21(bindingsPathOf(wf.abs))) {
          blockers.push(
            blocker("workflow_unresolved", `\u955C\u5934 ${shot.id} \u7684 workflow \u7F3A\u5C11 bindings\uFF1A${wf.rel}`)
          );
          break;
        }
        try {
          resolveWorkflowAssets({ root, shot, workflowAbs: wf.abs });
        } catch (e) {
          const details = isDaoyanCliError(e) ? e.details : void 0;
          const nested = details?.blockers;
          if (Array.isArray(nested) && nested.length > 0) {
            for (const item of nested) {
              const record = recordOf(item);
              if (record !== null) {
                blockers.push(
                  blocker(
                    String(record.code ?? "missing_reference"),
                    String(record.message ?? "\u8D44\u4EA7\u4E0D\u53EF\u7528"),
                    String(record.ref ?? "")
                  )
                );
              }
            }
          } else {
            blockers.push(
              blocker(
                "workflow_unresolved",
                `\u955C\u5934 ${shot.id}\uFF1A${e instanceof Error ? e.message : String(e)}`
              )
            );
          }
          break;
        }
      } catch {
        blockers.push(blocker("workflow_unresolved", `\u955C\u5934 ${shot.id} \u7684 workflow \u5F15\u7528\u975E\u6CD5\uFF1A${wfRef}`));
        break;
      }
    }
  }
  let stage = "ready";
  if (blockers.some((b) => b.code === "script_missing" || b.code === "script_draft")) stage = "script";
  else if (blockers.some((b) => b.code === "breakdown_missing" || b.code === "breakdown_stale")) stage = "breakdown";
  else if (blockers.some((b) => b.code === "missing_reference" || b.code === "voice_not_ready")) stage = "assets";
  else if (blockers.some((b) => b.code === "shots_missing" || b.code === "shots_stale")) stage = "storyboard";
  else if (blockers.some((b) => b.code === "workflow_unresolved")) stage = "workflow";
  else if (hasFinal(root, episodeId)) stage = "wrapped";
  const counts = {
    characters: breakdown?.characters.length ?? 0,
    forms: breakdown?.characters.reduce((sum, c) => sum + c.forms.length, 0) ?? 0,
    scenes: breakdown?.scenes.length ?? 0,
    voices: breakdown?.voices.length ?? 0,
    shots: shots?.shots.length ?? 0,
    assets: breakdownAssetCount(breakdown, characters, scenes, voices)
  };
  const nextActions = nextActionsForEpisode(stage, episodeId, blockers);
  return {
    enabled: true,
    episode: { id: meta.id, number: meta.number, title: meta.title },
    stage,
    script: {
      revision: script.revision,
      status: script.status,
      sha256: script.sha256,
      synced_at: script.synced_at,
      approved_at: script.approved_at
    },
    documents: {
      breakdown: {
        source_revision: breakdown?.source_revision ?? 0,
        stale: breakdownStale,
        present: breakdown !== null
      },
      shots: {
        source_revision: typeof shotsRevision === "number" ? shotsRevision : 0,
        stale: shotsStale,
        present: shots !== null
      }
    },
    counts,
    blockers,
    warnings: [],
    next_actions: nextActions
  };
}
function nextActionsForEpisode(stage, episodeId, blockers) {
  const first = blockers[0];
  if (stage === "script") {
    return first?.code === "script_draft" ? [`daoyan story script approve --episode ${episodeId} --json`] : [`daoyan story script sync --episode ${episodeId} --file <script.md> --json`];
  }
  if (stage === "breakdown") {
    return [`daoyan story breakdown set --episode ${episodeId} --file <breakdown.json> --json`];
  }
  if (stage === "assets") {
    const assetBlocker = blockers.find((b) => b.code === "missing_reference" || b.code === "voice_not_ready");
    const ref = assetBlocker?.ref ?? "";
    if (ref.startsWith("character:")) {
      const body = ref.slice("character:".length);
      const slash = body.indexOf("/form:");
      const characterId = slash >= 0 ? body.slice(0, slash) : body;
      const formId = slash >= 0 ? body.slice(slash + "/form:".length) : "<form>";
      return [
        `daoyan story asset add --owner character:${characterId} --form ${formId} --id <asset> --from <\u56FE\u7247> --set-reference --json`,
        `daoyan story status --episode ${episodeId} --json`
      ];
    }
    if (ref.startsWith("scene:")) {
      return [
        `daoyan story asset add --owner ${ref} --id <asset> --from <\u56FE\u7247> --set-reference --json`,
        `daoyan story status --episode ${episodeId} --json`
      ];
    }
    if (ref.startsWith("voice:")) {
      return [
        `daoyan story asset add --owner ${ref} --id <asset> --from <\u97F3\u9891> --set-reference --json`,
        `daoyan story status --episode ${episodeId} --json`
      ];
    }
    return ["\u8865\u9F50\u672C\u96C6\u62C6\u89E3\u58F0\u660E\u7684\u53C2\u8003\u8D44\u4EA7", `daoyan story status --episode ${episodeId} --json`];
  }
  if (stage === "storyboard") {
    return [`daoyan story shots set --episode ${episodeId} --file <shots.json> --json`];
  }
  if (stage === "workflow") {
    return [`daoyan workflow validate <name> --json`, `daoyan story status --episode ${episodeId} --json`];
  }
  return [`daoyan shot <\u955C\u53F7> --episode ${episodeId} --json`];
}
function computeSeriesStoryStatus(root, project) {
  const series = readSeries(root);
  const metas = listEpisodeMetas(root);
  const episodes = metas.map((meta) => {
    const status = computeEpisodeStoryStatus(root, meta.id, project);
    return {
      id: meta.id,
      number: meta.number,
      title: meta.title,
      stage: status.stage,
      script: { revision: status.script.revision, status: status.script.status },
      blockers: status.blockers
    };
  });
  const characters = loadCharacters(root);
  const scenes = loadScenes(root);
  const voices = loadVoices(root);
  const assets = listAssets(root);
  const shots = metas.reduce((sum, meta) => sum + (loadEpisodeShots(root, meta.id)?.shots.length ?? 0), 0);
  const ready = episodes.filter((e) => e.stage === "ready" || e.stage === "wrapped").length;
  const blocked = episodes.filter((e) => e.blockers.length > 0).length;
  return {
    enabled: true,
    series: {
      title: series?.title ?? "",
      episodes_total: metas.length,
      episodes_ready: ready,
      episodes_blocked: blocked
    },
    episodes,
    counts: {
      episodes: metas.length,
      characters: characters.characters.length,
      forms: characters.characters.reduce((sum, c) => sum + c.forms.length, 0),
      scenes: scenes.scenes.length,
      voices: voices.voices.length,
      shots,
      assets: assets.length
    },
    next_actions: episodes.filter((e) => e.blockers.length > 0).slice(0, 5).map((e) => `${e.id}: ${e.blockers[0]?.message ?? "\u9700\u8981\u5904\u7406"}`)
  };
}
function validateStory(root, episodeId, verifyHashes = false) {
  const issues = [];
  if (!storyEnabled(root)) {
    issues.push(issue(null, "story/", "story_not_found", "error", "story \u6A21\u5F0F\u672A\u542F\u7528", "\u8FD0\u884C daoyan story init\u3002"));
    return issues;
  }
  const series = readSeries(root);
  if (series === null || !existsSync21(seriesPath(root))) {
    issues.push(
      issue(null, "story/series.json", "series_missing", "error", "\u7CFB\u5217\u5143\u6570\u636E\u4E0D\u5B58\u5728", "\u91CD\u65B0 story init\u3002")
    );
  } else if (stringOf(series.title) === null) {
    issues.push(
      issue(
        null,
        "story/series.json",
        "series_title_missing",
        "error",
        "\u7CFB\u5217 title \u4E3A\u7A7A",
        "\u7528 story series set \u586B\u5199\u3002"
      )
    );
  }
  const metas = listEpisodeMetas(root);
  const episodeIds = new Set(metas.map((m) => m.id));
  const numbers = /* @__PURE__ */ new Set();
  for (const meta of metas) {
    if (numbers.has(meta.number)) {
      issues.push(
        issue(
          meta.id,
          `episodes/${meta.id}/${EPISODE_META_FILE}`,
          "episode_number_duplicate",
          "error",
          `\u96C6\u6570\u91CD\u590D\uFF1A${meta.number}`,
          "\u4FEE\u6B63 number\u3002"
        )
      );
    }
    numbers.add(meta.number);
    if (!existsSync21(join18(episodeDir(root, meta.id), EPISODE_META_FILE))) {
      issues.push(
        issue(
          meta.id,
          `episodes/${meta.id}`,
          "episode_meta_missing",
          "error",
          "episode.json \u7F3A\u5931",
          "\u91CD\u65B0 episode add\u3002"
        )
      );
    }
  }
  const characters = loadCharacters(root);
  const scenes = loadScenes(root);
  const voices = loadVoices(root);
  if (!existsSync21(charactersPath(root))) {
    issues.push(
      issue(null, "story/characters.json", "characters_missing", "error", "\u89D2\u8272\u8BBE\u5B9A\u4E0D\u5B58\u5728", "\u91CD\u65B0 story init\u3002")
    );
  }
  if (!existsSync21(scenesPath(root))) {
    issues.push(issue(null, "story/scenes.json", "scenes_missing", "error", "\u573A\u666F\u8BBE\u5B9A\u4E0D\u5B58\u5728", "\u91CD\u65B0 story init\u3002"));
  }
  if (!existsSync21(voicesPath(root))) {
    issues.push(issue(null, "story/voices.json", "voices_missing", "error", "\u97F3\u8272\u8BBE\u5B9A\u4E0D\u5B58\u5728", "\u91CD\u65B0 story init\u3002"));
  }
  validateCharacters(root, characters, voices, episodeIds, verifyHashes, issues);
  validateScenes(root, scenes, episodeIds, verifyHashes, issues);
  validateVoices(root, voices, characters, verifyHashes, issues);
  const targets = episodeId !== void 0 ? metas.filter((m) => m.id === episodeId) : metas;
  if (episodeId !== void 0 && targets.length === 0) {
    issues.push(
      issue(
        episodeId,
        `episodes/${episodeId}`,
        "episode_not_found",
        "error",
        `\u5267\u96C6\u4E0D\u5B58\u5728\uFF1A${episodeId}`,
        "\u7528 story episode list \u67E5\u770B\u3002"
      )
    );
    return issues;
  }
  for (const meta of targets) {
    validateScript(root, meta.id, issues);
    const script = loadScriptMeta(root, meta.id);
    const breakdown = loadBreakdown(root, meta.id);
    if (breakdown === null) {
      issues.push(
        issue(
          meta.id,
          `episodes/${meta.id}/${BREAKDOWN_FILE}`,
          "breakdown_missing",
          "warning",
          "\u62C6\u89E3\u4E0D\u5B58\u5728",
          "\u8FD0\u884C story breakdown set\u3002"
        )
      );
    } else {
      checkBreakdownDoc(
        root,
        meta.id,
        breakdown,
        script.revision,
        script.sha256,
        characters,
        scenes,
        voices,
        issues
      );
    }
    const shots = loadEpisodeShots(root, meta.id);
    if (shots === null) {
      issues.push(
        issue(
          meta.id,
          `episodes/${meta.id}/${SHOTS_FILE}`,
          "shots_missing",
          "warning",
          "\u5206\u955C\u4E0D\u5B58\u5728",
          "\u8FD0\u884C story shots set\u3002"
        )
      );
    } else {
      checkEpisodeShotsDoc(
        root,
        meta.id,
        readProjectAt(root),
        shots,
        breakdown,
        characters,
        scenes,
        voices,
        script.revision,
        script.sha256,
        issues
      );
    }
    for (const item of coverageBlockers(root, breakdown, characters, scenes, voices, shots)) {
      issues.push(
        issue(
          meta.id,
          `episodes/${meta.id}/${BREAKDOWN_FILE}`,
          item.code,
          "error",
          item.message,
          "\u5165\u5E93\u8D44\u4EA7\u5E76\u7528 story asset set-reference \u6307\u5B9A\u4E3B\u53C2\u8003\u3002"
        )
      );
    }
    validateEpisodeFinals(root, meta.id, issues);
  }
  return issues;
}
function checkCharactersDocForWrite(root, doc, verifyHashes = false) {
  const issues = [];
  validateCharacters(root, doc, loadVoices(root), episodeIdSet(root), verifyHashes, issues);
  return issues.map((item) => item.code === "voice_id_missing" ? { ...item, severity: "warning" } : item);
}
function checkScenesDocForWrite(root, doc, verifyHashes = false) {
  const issues = [];
  validateScenes(root, doc, episodeIdSet(root), verifyHashes, issues);
  return issues;
}
function checkVoicesDocForWrite(root, doc, verifyHashes = false) {
  const issues = [];
  validateVoices(root, doc, loadCharacters(root), verifyHashes, issues);
  return issues;
}
function checkBreakdownForWrite(root, episodeId, doc) {
  const script = loadScriptMeta(root, episodeId);
  const issues = [];
  checkBreakdownDoc(
    root,
    episodeId,
    doc,
    script.revision,
    script.sha256,
    loadCharacters(root),
    loadScenes(root),
    loadVoices(root),
    issues
  );
  return issues;
}
function checkShotsForWrite(root, episodeId, shots) {
  const script = loadScriptMeta(root, episodeId);
  const issues = [];
  checkEpisodeShotsDoc(
    root,
    episodeId,
    readProjectAt(root),
    shots,
    loadBreakdown(root, episodeId),
    loadCharacters(root),
    loadScenes(root),
    loadVoices(root),
    script.revision,
    script.sha256,
    issues
  );
  return issues;
}
var ALLOWED_ASSET_TYPES, STORY_ASSET_PREFIX;
var init_validate = __esm({
  "src/core/story/validate.mts"() {
    "use strict";
    init_config();
    init_types();
    init_load();
    init_fs();
    init_errors();
    init_workflow_assets();
    init_assets();
    init_paths();
    init_store2();
    ALLOWED_ASSET_TYPES = /* @__PURE__ */ new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "audio/wav",
      "audio/mpeg",
      "audio/flac",
      "audio/ogg"
    ]);
    STORY_ASSET_PREFIX = "story/assets/";
  }
});

// src/commands/validate.mts
import { existsSync as existsSync22, readFileSync as readFileSync18, readdirSync as readdirSync7 } from "fs";
import { isAbsolute as isAbsolute5, join as join19 } from "path";
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
  const dir = join19(root, WORKFLOWS_DIR);
  if (!existsSync22(dir)) {
    issues.push({
      path: WORKFLOWS_DIR,
      code: "workflows_dir_missing",
      severity: "warning",
      message: "workflows/ \u76EE\u5F55\u4E0D\u5B58\u5728",
      hint: "daoyan workflow new <name> \u521B\u5EFA\u7B2C\u4E00\u4E2A\u5DE5\u4F5C\u6D41\u3002"
    });
    return;
  }
  const files = readdirSync7(dir).filter((f) => f.endsWith(".json") && !f.endsWith(BINDINGS_SUFFIX));
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
    const abs = join19(dir, f);
    let raw;
    try {
      raw = JSON.parse(readFileSync18(abs, "utf8"));
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
    try {
      const assets = loadWorkflowAssets(abs);
      if (assets !== null) {
        for (const i of validateWorkflowAssetsGraph(assets, parsed.graph, `${rel}.assets`)) {
          issues.push({ ...i, path: i.path });
        }
      }
    } catch (e) {
      issues.push({
        path: `${rel}.assets`,
        code: e instanceof DaoyanCliError ? e.code : "asset_slot_invalid",
        severity: "error",
        message: e instanceof Error ? e.message : String(e),
        hint: "\u4FEE\u6B63 workflows/<name>.assets.json\u3002"
      });
    }
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
      if (!existsSync22(wf.abs)) {
        issues.push({
          path: tag,
          code: "shot_workflow_missing",
          severity: "error",
          message: `workflow \u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${wf.rel}`,
          hint: "\u5148\u521B\u5EFA/\u5BFC\u5165\u8BE5 workflow\u3002"
        });
      } else if (!existsSync22(bindingsPathOf(wf.abs))) {
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
      } else if (!existsSync22(join19(root, rel))) {
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
  const comfyDir = machine.engine.comfyui_dir !== void 0 ? isAbsolute5(machine.engine.comfyui_dir) ? machine.engine.comfyui_dir : join19(root, machine.engine.comfyui_dir) : join19(root, "engine", "ComfyUI");
  if (!existsSync22(join19(comfyDir, "main.py"))) {
    issues.push({
      path: ".dycli/machine.json",
      code: "engine_not_installed",
      severity: "warning",
      message: `ComfyUI \u672A\u5B89\u88C5\uFF1A${comfyDir}`,
      hint: "\u8FD0\u884C daoyan init --mode=local \u90E8\u7F72\u5F15\u64CE\u3002"
    });
  }
  if (machine.engine.modelpath !== void 0 && !existsSync22(machine.engine.modelpath)) {
    issues.push({
      path: ".dycli/machine.json",
      code: "modelpath_missing",
      severity: "warning",
      message: `\u6A21\u578B\u76EE\u5F55\u4E0D\u5B58\u5728\uFF1A${machine.engine.modelpath}`,
      hint: "\u91CD\u65B0 init --modelpath\uFF0C\u6216\u6302\u8F7D\u8BE5\u76EE\u5F55\u3002"
    });
  }
  if (machine.engine.models_config !== null && machine.engine.models_config !== void 0 && !existsSync22(machine.engine.models_config)) {
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
    if (!existsSync22(wf.abs)) {
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
  if (storyEnabled(root)) {
    for (const item of validateStory(root)) {
      issues.push({
        path: item.path,
        episode_id: item.episode_id,
        code: item.code,
        severity: item.severity === "error" ? "error" : "warning",
        message: item.message,
        hint: item.hint
      });
    }
  } else {
    validateShots(root, shots, issues);
  }
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
var init_validate2 = __esm({
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
    init_workflow_assets();
    init_skill();
    init_lock();
    init_version();
    init_paths();
    init_validate();
    DIM_MULTIPLE = 32;
    FRAME_GRID_STEP = 17;
    FRAME_GRID_OFFSET = 5;
  }
});

// src/core/story/production.mts
function loadContextShots(root, context) {
  if (context.legacy) return loadShotsFile(root);
  if (context.episode_id === null) {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u7F3A\u5C11 episode_id" });
  }
  const shots = loadEpisodeShots(root, context.episode_id);
  if (shots === null) {
    throw new DaoyanCliError({
      code: "story_gate_failed",
      message: `\u5267\u96C6 ${context.episode_id} \u6CA1\u6709 shots.json`,
      details: {
        episode_id: context.episode_id,
        stage: "storyboard",
        blockers: [{ code: "shots_missing", message: "\u672C\u96C6\u5206\u955C\u4E0D\u5B58\u5728" }]
      }
    });
  }
  return shots;
}
function storyEnforceOf(project) {
  return project.story?.enforce ?? "strict";
}
function checkStoryGate(root, context, project) {
  const mode = storyEnforceOf(project);
  if (context.legacy || context.episode_id === null || mode === "off") {
    return { mode, blockers: [], stage: null };
  }
  const status = computeEpisodeStoryStatus(root, context.episode_id, project);
  return { mode, blockers: status.blockers, stage: status.stage };
}
function gateError(context, blockers, stage = null) {
  return new DaoyanCliError({
    code: "story_gate_failed",
    message: `\u5267\u96C6 ${String(context.episode_id)} \u62CD\u6444\u95E8\u7981\u672A\u901A\u8FC7\uFF08${blockers.length} \u9879\u963B\u65AD\uFF09`,
    details: {
      episode_id: context.episode_id,
      stage: stage ?? "unknown",
      blockers,
      warnings: [],
      next_actions: [`daoyan story status --episode ${String(context.episode_id)} --json`]
    }
  });
}
var init_production = __esm({
  "src/core/story/production.mts"() {
    "use strict";
    init_errors();
    init_config();
    init_validate();
    init_store2();
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
  await run(["ffmpeg", "-y", "-v", "error", "-i", video, "-vf", `select=eq(n\\,${n - 1})`, "-frames:v", "1", outPng]);
}
var init_ffmpeg = __esm({
  "src/core/media/ffmpeg.mts"() {
    "use strict";
    init_errors();
  }
});

// src/core/task/plans.mts
import { existsSync as existsSync23, mkdirSync as mkdirSync4, statSync as statSync6 } from "fs";
import { basename as basename6, join as join20 } from "path";
function splitTarget2(target) {
  const dot = target.indexOf(".");
  return { node: target.slice(0, dot), input: target.slice(dot + 1) };
}
function extOf2(p) {
  const b = basename6(p);
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
function pickRelaySource(root, upstreamId, labelPrefix) {
  const rec = latestSucceededRun(root, `${labelPrefix}${upstreamId}`);
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
  if (!existsSync23(abs)) {
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
    const src = join20(opts.root, rel);
    if (!existsSync23(src)) {
      throw new DaoyanCliError({
        code: "anchor_not_found",
        message: `\u951A\u70B9\u56FE\u7247\u4E0D\u5B58\u5728\uFF1A${rel}`,
        details: { key: ff, path: rel }
      });
    }
    const ext = extOf2(src);
    return {
      upload: {
        logical: "first_frame",
        source: src,
        desiredName: `anchor_${ff}_${opts.shot.id}${ext}`,
        target: splitTarget2(target)
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
  const sourceClip = pickRelaySource(opts.root, upstream.id, opts.labelPrefix);
  const relayDir = join20(opts.root, RELAY_DIR);
  mkdirSync4(relayDir, { recursive: true });
  const cache = join20(relayDir, `relay_${upstream.id}_to_${opts.shot.id}.png`);
  let needExtract = true;
  if (existsSync23(cache)) {
    try {
      needExtract = statSync6(cache).mtimeMs < statSync6(sourceClip).mtimeMs;
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
        target: splitTarget2(target)
      },
      descriptor: `relay:${upstream.id}`
    };
  }
  return {
    upload: {
      logical: "first_frame",
      source: cache,
      desiredName: `relay_${upstream.id}_${opts.shot.id}.png`,
      target: splitTarget2(target)
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
  const labelPrefix = opts.labelPrefix ?? "shot:";
  for (const shot of targets) {
    if (!opts.force) {
      const existing = latestRunByLabel(opts.root, `${labelPrefix}${shot.id}`);
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
    const ff = firstFrameUpload({ root: opts.root, shots: opts.shots, shot, bindings, labelPrefix });
    const assetPlan = resolveWorkflowAssets({ root: opts.root, shot, workflowAbs: wf.abs });
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
      label: `${labelPrefix}${shot.id}`,
      workflowAbs: wf.abs,
      workflowRel: wf.rel,
      graph: applied.graph,
      inputs: {
        ...applied.applied,
        ...ff.descriptor !== void 0 ? { first_frame: ff.descriptor } : {},
        ...assetPlan.records.length > 0 ? { assets: assetPlan.records } : {}
      },
      overrides: over.applied,
      uploads: [...ff.upload !== null ? [ff.upload] : [], ...assetPlan.uploads],
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
    init_store3();
    init_load();
    init_workflow_assets();
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
import { existsSync as existsSync24, readFileSync as readFileSync19 } from "fs";
import { join as join21 } from "path";
import { appendFileSync as appendFileSync2 } from "fs";
function eventsPath(taskDir2) {
  return join21(taskDir2, EVENTS_FILE);
}
function readEvents(taskDir2, fromSeq = 0) {
  const file = eventsPath(taskDir2);
  if (!existsSync24(file)) return [];
  const out = [];
  for (const line of readFileSync19(file, "utf8").split("\n")) {
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
    return new RemoteSession2(opts.machine.engine.url, opts.machine.engine.free_after_task ?? "when_idle");
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
import { existsSync as existsSync25, readFileSync as readFileSync20, statSync as statSync7, openSync as openSync3, readSync as readSync2, closeSync as closeSync3 } from "fs";
import { basename as basename7, join as join22 } from "path";
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
  if (!existsSync25(file)) return "";
  let size = 0;
  try {
    size = statSync7(file).size;
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
  const logText = readTailText(join22(root, LOG_DIR, `engine-${taskId}.log`), 30);
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
    episode_id: opts.episodeId,
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
      const bytes = new Uint8Array(readFileSync20(up.source));
      files.push(copyRunInput(opts.root, opts.runId, up.source, up.desiredName));
      const engineName = `dycli_${opts.runId}_${basename7(up.desiredName).replace(/[^A-Za-z0-9._-]/g, "_")}`;
      const name = await opts.session.client.uploadImage(engineName, bytes, true);
      opts.accumulator.uploaded.push(name);
      const target = graph[up.target.node];
      if (target === void 0) {
        throw new DaoyanCliError({
          code: "workflow_invalid",
          message: `\u8D44\u4EA7\u7ED1\u5B9A ${up.logical} \u6307\u5411\u4E0D\u5B58\u5728\u7684\u8282\u70B9 ${up.target.node}`
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
            episode_id: opts.episodeId,
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
        episodeId: opts.episodeId,
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
      episodeId: opts.episodeId,
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
    const file = join22(opts.root, "runs", runId, "run.json");
    if (!existsSync25(file)) continue;
    try {
      const rec = JSON.parse(readFileSync20(file, "utf8"));
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
    init_store3();
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
import { existsSync as existsSync26, readdirSync as readdirSync8 } from "fs";
import { basename as basename8, dirname as dirname9, join as join23, resolve as resolve4 } from "path";
function isFatalRunError(code) {
  return code === "engine_oom" || code === "engine_crashed" || code === "engine_unreachable" || code === "engine_busy" || code === "engine_start_failed" || code === "engine_stop_failed" || code === "gpu_lease_corrupt" || code === "machine_busy" || code === "machine_lock_corrupt" || code === "worker_start_failed";
}
function shotTargets(root, shots, task, labelPrefix) {
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
    if (!force && latestSucceededRun(root, `${labelPrefix}${id}`) !== null) skipped.push(id);
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
  const taskDir2 = resolve4(opts.taskDir);
  const root = dirname9(dirname9(taskDir2));
  const taskId = basename8(taskDir2);
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
      warn(
        `task \u521B\u5EFA\u65F6\u7684 mode=${task.mode} \u4E0E machine.json \u5F53\u524D mode=${machine.engine.mode} \u4E0D\u4E00\u81F4\uFF1B\u4EE5 machine.json \u4E3A\u51C6`
      );
    }
    say(`task ${taskId}\uFF08${task.kind}\uFF09\u5F00\u59CB\uFF0Cmode=${machine.engine.mode}`);
    const timeoutMs = task.options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    let runPlan = null;
    let shotsFile = null;
    let shotQueue = [];
    let skippedShots = [];
    let labelPrefix = "shot:";
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
      const context = resolveEpisodeContext(root, task.episode_id ?? void 0);
      if (!context.legacy && (task.episode_id === null || task.episode_id === void 0)) {
        throw new DaoyanCliError({
          code: "story_invalid",
          message: "story \u6A21\u5F0F\u7684 shot \u4EFB\u52A1\u7F3A\u5C11 episode_id"
        });
      }
      labelPrefix = context.label_prefix;
      shotsFile = context.legacy ? loadShotsFile(root) : loadEpisodeShots(root, context.episode_id);
      if (shotsFile === null) {
        throw new DaoyanCliError({
          code: "story_invalid",
          message: `\u5267\u96C6 ${String(context.episode_id)} \u7684\u5206\u955C\u4E0D\u5B58\u5728`
        });
      }
      const targets = shotTargets(root, shotsFile, task, context.label_prefix);
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
          episodeId: task.episode_id ?? null,
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
            labelPrefix,
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
          warn(
            `\u53D6\u6D88\u6E05\u7406\u5931\u8D25\uFF1A${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
          );
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
  return join23(root, LOG_DIR, `worker-${taskId}.log`);
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
    init_paths();
    init_store2();
    init_lock();
    init_store();
    init_events();
    init_plans();
    init_session();
    init_preflight();
    init_executor();
    init_store3();
    DEFAULT_TIMEOUT_MS = 3 * 60 * 60 * 1e3;
  }
});

// src/core/task/create.mts
import { closeSync as closeSync4, openSync as openSync4, readFileSync as readFileSync21 } from "fs";
import { spawn as spawn6 } from "child_process";
import { join as join24 } from "path";
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
    episodeId: opts.episodeId ?? null,
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
      command: record.command,
      episode_id: record.episode_id ?? null
    });
    const entry = process.argv[1];
    if (entry === void 0 || entry === "") {
      throw new DaoyanCliError({
        code: "worker_start_failed",
        message: "\u65E0\u6CD5\u5B9A\u4F4D CLI \u5165\u53E3\uFF08process.argv[1] \u4E3A\u7A7A\uFF09"
      });
    }
    const logFile = workerLogPath(opts.root, taskId);
    ensureDir(join24(opts.root, LOG_DIR));
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
        next_actions: [`status --task ${taskId} --wait`, `logs --task ${taskId} -f`, `run cancel ${taskId}`]
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
      const raw = JSON.parse(readFileSync21(join24(root, "runs", id, RUN_FILE), "utf8"));
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
    init_store3();
    init_config();
    init_lock();
    init_store();
    init_events();
    init_worker();
  }
});

// src/core/run/summary.mts
import { existsSync as existsSync27 } from "fs";
import { join as join25 } from "path";
function outputSummaries(root, rec) {
  return rec.outputs.map((o) => {
    const abs = join25(runDir(root, rec.run_id), o.path);
    return {
      name: o.name,
      path: `runs/${rec.run_id}/${o.path}`,
      abs_path: abs,
      sha256: o.sha256,
      bytes: o.bytes,
      present: existsSync27(abs)
    };
  });
}
function runSummary(root, rec) {
  return {
    run_id: rec.run_id,
    task_id: rec.task_id,
    machine_id: rec.machine_id,
    episode_id: rec.episode_id ?? null,
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
    init_store3();
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
    if (name === "--episode") {
      const v = takeValue(args, i, inline, "--episode");
      out.episode = v.value;
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
  const episodeContext = flags.episode !== void 0 ? resolveEpisodeContext(root, flags.episode) : null;
  const episodeId = episodeContext?.episode_id ?? null;
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
      episode_id: episodeId,
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
    episodeId,
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
    episodeId: opts.episodeId ?? null,
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
    init_paths();
    init_plans();
    init_create();
    init_store();
    init_summary();
    init_graph();
  }
});

// src/commands/shot.mts
function parseShotArgs(args, presetForce) {
  const out = { ids: [], wait: false, force: presetForce, allowIncomplete: false };
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name === "--episode") {
      const v = takeValue(args, i, inline, "--episode");
      out.episode = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--allow-incomplete") {
      out.allowIncomplete = true;
      continue;
    }
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
  const context = resolveEpisodeContext(root, flags.episode);
  const shots = loadContextShots(root, context);
  for (const id of flags.ids) {
    if (!shots.shots.some((s) => s.id === id)) {
      throw new DaoyanCliError({
        code: "usage",
        message: `\u672A\u77E5\u955C\u53F7 ${id}\uFF1B\u53EF\u7528\uFF1A${shots.shots.map((s) => s.id).join(" ")}`,
        exit: 2
      });
    }
  }
  const gate = checkStoryGate(root, context, project);
  let warnings = [];
  let bypassed = false;
  if (gate.blockers.length > 0) {
    if (flags.allowIncomplete) {
      bypassed = true;
      warnings = gate.blockers;
    } else if (gate.mode === "strict") {
      throw gateError(context, gate.blockers, gate.stage);
    } else {
      warnings = gate.blockers;
    }
  }
  return enqueueRunTask({
    ctx: ctx2,
    root,
    project,
    machine,
    command: `${presetForce ? "retake" : "shot"} ${flags.ids.join(" ")}`,
    kind: presetForce ? "retake" : "shot",
    episodeId: context.episode_id,
    ...flags.requestId !== void 0 ? { requestId: flags.requestId } : {},
    options: {
      shots: flags.ids,
      force: flags.force,
      ...flags.steps !== void 0 ? { steps: flags.steps } : {},
      ...flags.timeoutHours !== void 0 ? { timeout_ms: Math.round(flags.timeoutHours * 36e5) } : {},
      ...bypassed ? { story_gate_bypassed: true } : {},
      ...warnings.length > 0 ? { story_gate_warnings: warnings } : {}
    },
    wait: flags.wait
  });
}
async function runBatch(ctx2, args) {
  let timeoutHours;
  let requestId;
  let wait = false;
  let episode;
  let allowIncomplete = false;
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name === "--episode") {
      const v = takeValue(args, i, inline, "--episode");
      episode = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--allow-incomplete") {
      allowIncomplete = true;
      continue;
    }
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
  const context = resolveEpisodeContext(root, episode);
  const shots = loadContextShots(root, context);
  if (shots.shots.length === 0) throw new DaoyanCliError({ code: "config_invalid", message: "shots.json \u6CA1\u6709\u955C\u5934" });
  const gate = checkStoryGate(root, context, project);
  let warnings = [];
  let bypassed = false;
  if (gate.blockers.length > 0) {
    if (allowIncomplete) {
      bypassed = true;
      warnings = gate.blockers;
    } else if (gate.mode === "strict") {
      throw gateError(context, gate.blockers, gate.stage);
    } else {
      warnings = gate.blockers;
    }
  }
  return enqueueRunTask({
    ctx: ctx2,
    root,
    project,
    machine,
    command: "batch",
    kind: "batch",
    episodeId: context.episode_id,
    ...requestId !== void 0 ? { requestId } : {},
    options: {
      force: false,
      ...timeoutHours !== void 0 ? { timeout_ms: Math.round(timeoutHours * 36e5) } : {},
      ...bypassed ? { story_gate_bypassed: true } : {},
      ...warnings.length > 0 ? { story_gate_warnings: warnings } : {}
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
    init_paths();
    init_production();
    init_run();
  }
});

// src/commands/wrap.mts
import { existsSync as existsSync28, mkdirSync as mkdirSync5, writeFileSync as writeFileSync8 } from "fs";
import { join as join26 } from "path";
function pickVideoAt(root, rec) {
  const chosen = rec.outputs.find((o) => /\.(mp4|webm|mkv|mov|gif)$/i.test(o.name)) ?? rec.outputs[0];
  if (chosen === void 0) return null;
  return { path: chosen.path, abs: runOutputAbs(root, rec, chosen) };
}
async function runWrap(ctx2, args) {
  const explicit = /* @__PURE__ */ new Map();
  let episode;
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
    if (name === "--episode") {
      const v = takeValue(args, i, inline, "--episode");
      episode = v.value;
      i += v.skip;
      continue;
    }
    usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
  }
  const { root } = requireProject(ctx2);
  const context = resolveEpisodeContext(root, episode);
  const shots = loadContextShots(root, context);
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
      if (context.episode_id !== null && rec.episode_id !== context.episode_id) {
        throw new DaoyanCliError({
          code: "wrap_failed",
          message: `--select ${shot.id}=${explicitId} \u7684 run \u5C5E\u4E8E ${String(rec.episode_id ?? "\u672A\u5F52\u5C5E")}\uFF0C\u4E0D\u662F ${context.episode_id}`
        });
      }
    } else {
      rec = latestSucceededRun(root, `${context.label_prefix}${shot.id}`);
    }
    if (rec === null) {
      missing.push(shot.id);
      continue;
    }
    const pick = pickVideoAt(root, rec);
    if (pick === null || !existsSync28(pick.abs)) {
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
  const finalDir = context.final_dir;
  mkdirSync5(finalDir, { recursive: true });
  const ts2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.(\d{3})Z$/, "$1");
  const outName = `cut-${ts2}.mp4`;
  const outPath = join26(finalDir, outName);
  const manifestName = `cut-${ts2}.json`;
  const manifestPath = join26(finalDir, manifestName);
  const listFile = join26(root, CONCAT_LIST_FILE);
  writeFileSync8(listFile, clips.map((c) => `file '${c.abs.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  say(`\u5408\u7247 ${clips.length} \u6BB5 \u2192 ${context.final_rel}/${outName}\uFF08libx264 / crf18 / faststart\uFF09...`);
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
    episode_id: context.episode_id,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    clips: clips.map((c) => ({
      shot: c.shot,
      run_id: c.run_id,
      artifact: c.artifact
    })),
    missing,
    ffmpeg: { codec: "libx264", crf: 18, pix_fmt: "yuv420p", faststart: true }
  };
  writeFileSync8(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  const data = {
    episode_id: context.episode_id,
    output: `${context.final_rel}/${outName}`,
    abs_path: outPath,
    manifest: `${context.final_rel}/${manifestName}`,
    sha256: sha256File(outPath),
    clips: clips.map((c) => ({ shot: c.shot, run_id: c.run_id, artifact: c.artifact })),
    missing
  };
  if (ctx2.json) {
    emitData(data);
    return 0;
  }
  if (missing.length > 0) say(`\u6CE8\u610F\uFF1A${missing.length} \u955C\u672A\u5B8C\u6210\u672A\u7EB3\u5165\uFF08${missing.join(" ")}\uFF09`);
  say(`\u5408\u7247\u5B8C\u6210\uFF1A${context.final_rel}/${outName}`);
  say(`\u6E05\u5355\uFF1A${context.final_rel}/${manifestName}`);
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
    init_store3();
    init_paths();
    init_production();
  }
});

// src/commands/logs.mts
import { closeSync as closeSync5, existsSync as existsSync29, openSync as openSync5, readSync as readSync3, readdirSync as readdirSync9, statSync as statSync8 } from "fs";
import { join as join27 } from "path";
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
  if (!existsSync29(file)) return [];
  let size = 0;
  try {
    size = statSync8(file).size;
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
  const dir = join27(root, LOG_DIR);
  const engines = existsSync29(dir) ? readdirSync9(dir).filter((f) => /^engine-.*\.log$/.test(f)).sort().reverse() : [];
  const workers = existsSync29(dir) ? readdirSync9(dir).filter((f) => /^worker-.*\.log$/.test(f)).sort().reverse() : [];
  const all = [
    ...workers[0] !== void 0 ? [{ name: "worker", file: join27(dir, workers[0]) }] : [],
    ...engines[0] !== void 0 ? [{ name: "engine", file: join27(dir, engines[0]) }] : [],
    { name: "daoyan-cli", file: join27(dir, "daoyan-cli.log") }
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
  const existing = sources.filter((s) => existsSync29(s.file));
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
    offsets.set(s.file, statSync8(s.file).size);
  }
  let stop = false;
  const off = onSignal(() => {
    stop = true;
  });
  try {
    while (!stop) {
      await new Promise((r) => setTimeout(r, 500));
      for (const s of existing) {
        if (!existsSync29(s.file)) continue;
        let size = 0;
        try {
          size = statSync8(s.file).size;
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
    init_store3();
    init_store();
    init_signals();
    ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
    TQDM_RE = /^\s*\d+%.{0,40}\|\s*(\d+)\/(\d+) \[/;
  }
});

// src/core/status/snapshot.mts
import { existsSync as existsSync30 } from "fs";
import { join as join28 } from "path";
async function probeEngine(root, machine, engineTimeoutMs = 3e3) {
  if (machine.engine.mode === "remote") {
    const url2 = machine.engine.url;
    const up2 = await probeComfy(url2, engineTimeoutMs);
    const queue2 = up2 ? await safeQueue(new ComfyClient(url2)) : null;
    return { mode: "remote", url: url2, up: up2, pid: null, queue: queue2 };
  }
  const pidRec = readEnginePid(root);
  const pid = pidRec !== null && pidAlive(pidRec.pid) ? pidRec.pid : null;
  const url = `http://127.0.0.1:${machine.engine.port}`;
  const up = await probeComfy(url, engineTimeoutMs);
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
function shotProgress(root, shots, labelPrefix = "shot:") {
  if (shots === null) return [];
  return shots.shots.map((s) => {
    const rec = latestSucceededRun(root, `${labelPrefix}${s.id}`);
    const present = rec !== null && rec.outputs.some((o) => existsSync30(join28(root, RUNS_DIR, rec.run_id, o.path)));
    return {
      id: s.id,
      slug: s.slug ?? null,
      done: rec !== null,
      latest_run: rec?.run_id ?? null,
      artifact_present: present
    };
  });
}
function splitActiveTasks(tasks, machine) {
  const active = tasks.filter((t) => !isTerminalStatus(t.status) && t.machine_id === machine.machine_id);
  const synced = tasks.filter((t) => !isTerminalStatus(t.status) && t.machine_id !== machine.machine_id);
  return { active, synced };
}
async function buildStatusSnapshot(root, project, machine, shots, options = {}) {
  const engine = await probeEngine(root, machine, options.engineTimeoutMs);
  const lock = inspectMachineLock();
  const tasks = listTasks(root).filter(
    (t) => options.episodeId === void 0 || options.episodeId === null || options.episodeId === "" || t.episode_id === options.episodeId
  );
  const { active, synced } = splitActiveTasks(tasks, machine);
  const gpu = await gpuSnapshot();
  const lease = inspectLease();
  const skill = skillState(root, VERSION, options.commands ?? []);
  const shot = shotProgress(root, shots, options.labelPrefix);
  const recentTasks = tasks.slice(0, 10).map(taskSummary);
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
    recent_tasks: recentTasks,
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
var init_snapshot = __esm({
  "src/core/status/snapshot.mts"() {
    "use strict";
    init_client();
    init_types();
    init_local_session();
    init_lock();
    init_store3();
    init_store();
    init_detect();
    init_lease();
    init_skill();
    init_version();
  }
});

// src/commands/status.mts
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
    if (name === "--episode") {
      const v = takeValue(args, i, inline, "--episode");
      out.episode = v.value;
      i += v.skip;
      continue;
    }
    usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
  }
  if (out.taskId !== void 0 && out.runId !== void 0) usageError("--task \u4E0E --run \u53EA\u80FD\u4E8C\u9009\u4E00");
  return out;
}
async function runStatus(ctx2, args) {
  const flags = parseArgs3(args);
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachine(root);
  let shots = loadShotsIfExists(root);
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
  const storyOn = storyEnabled(root);
  let episodeContext = null;
  let episodeStatus = null;
  let seriesStatus = null;
  if (storyOn) {
    if (flags.episode !== void 0) {
      episodeContext = resolveEpisodeContext(root, flags.episode);
      shots = loadContextShots(root, episodeContext);
      episodeStatus = computeEpisodeStoryStatus(root, flags.episode, project);
    } else {
      shots = null;
      seriesStatus = computeSeriesStoryStatus(root, project);
    }
  } else if (flags.episode !== void 0) {
    resolveEpisodeContext(root, flags.episode);
  }
  const { COMMANDS: COMMANDS2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
  const data = await buildStatusSnapshot(root, project, machine, shots, {
    commands: COMMANDS2,
    ...episodeContext !== null ? { labelPrefix: episodeContext.label_prefix, episodeId: episodeContext.episode_id } : {}
  });
  if (seriesStatus !== null) {
    data.story = seriesStatus;
    data.series = seriesStatus.series;
    data.episodes = seriesStatus.episodes;
    data.next_actions = seriesStatus.next_actions;
  }
  if (episodeStatus !== null) {
    data.story = episodeStatus;
    data.episode = episodeStatus.episode;
    data.next_actions = episodeStatus.next_actions;
  }
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
  say(
    activeTask === null ? "\u672C\u673A\u4EFB\u52A1\uFF1A\u7A7A\u95F2" : `\u672C\u673A\u4EFB\u52A1\uFF1A${String(activeTask.command)}\uFF08${String(activeTask.status)}\uFF09`
  );
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
  if (episodeStatus !== null) {
    say(
      `\u5267\u96C6 ${episodeStatus.episode.id} \u7B2C ${episodeStatus.episode.number} \u96C6\uFF1A${episodeStatus.episode.title}\uFF08${episodeStatus.stage}\uFF09`
    );
    for (const b of episodeStatus.blockers) say(`  ! [${b.code}] ${b.message}`);
    for (const a of episodeStatus.next_actions) say(`  next: ${a}`);
  } else if (seriesStatus !== null) {
    say(
      `\u7CFB\u5217 ${seriesStatus.series.title}\uFF1A${seriesStatus.series.episodes_total} \u96C6\uFF0C\u53EF\u62CD ${seriesStatus.series.episodes_ready}\uFF0C\u963B\u65AD ${seriesStatus.series.episodes_blocked}`
    );
    for (const e of seriesStatus.episodes) say(`  ${e.id} \u7B2C ${e.number} \u96C6 ${e.title}\uFF1A${e.stage}`);
  } else {
    const shotsData = data.shots;
    if (shotsData.length > 0) {
      const done = shotsData.filter((s) => s.done === true).length;
      say(`\u955C\u5934\u8FDB\u5EA6\uFF1A${done}/${shotsData.length}`);
      for (const s of shotsData)
        say(`  ${s.done === true ? "\u2705" : "\u2B1C"} ${String(s.id)} ${String(s.slug ?? "")}`);
    }
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
    init_store3();
    init_summary();
    init_store();
    init_events();
    init_store();
    init_create();
    init_snapshot();
    init_paths();
    init_production();
    init_validate();
  }
});

// src/commands/engine.mts
import { existsSync as existsSync31, readdirSync as readdirSync10 } from "fs";
import { isAbsolute as isAbsolute6, join as join29, relative, resolve as resolve5 } from "path";
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
  const dir = join29(root, "engine", "versions");
  try {
    return readdirSync10(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}
function currentDirs(root, engine) {
  const anchor = (p, fallback) => {
    if (p === void 0 || p === "") return join29(root, fallback);
    return isAbsolute6(p) ? p : join29(root, p);
  };
  return {
    comfyDir: anchor(engine.comfyui_dir, join29("engine", "ComfyUI")),
    venvDir: anchor(engine.venv_dir, join29("engine", ".venv"))
  };
}
function portablePath(root, abs) {
  const rel = relative(root, abs);
  return rel === "" || rel.startsWith("..") || isAbsolute6(rel) ? abs : rel.split("\\").join("/");
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
          installed: existsSync31(join29(dirs.comfyDir, "main.py")),
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
    let tag;
    const toolchain = {};
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i];
      if (a === void 0) break;
      const { name, inline } = splitInlineFlag(a);
      const toolchainFlag = applyToolchainFlag(toolchain, name, rest, i, inline);
      if (toolchainFlag.handled) {
        i += toolchainFlag.skip;
        continue;
      }
      if (name.startsWith("-")) usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
      if (tag !== void 0) usageError(`engine install \u53EA\u63A5\u53D7\u4E00\u4E2A\u7248\u672C tag\uFF08\u591A\u4F59\uFF1A${a}\uFF09`);
      tag = a;
    }
    if (tag === void 0 || tag === "") {
      usageError(
        "\u7528\u6CD5\uFF1Adaoyan engine install <\u7248\u672C tag> [--mirror <url>] [--fallback-mirror <url|none>] [--torch-index <url>] [--torch-cuda <cuXXX>] [--torch-cpu] [--no-cache]"
      );
    }
    resolveToolchainOptions(toolchain);
    const lock = await acquireMachineLock({
      taskId: `metadata-engine-install-${process.pid}`,
      project: root,
      mode: "local",
      command: `engine install ${tag}`,
      kind: "metadata"
    });
    try {
      const base = join29(root, "engine", "versions", tag);
      say(`\u5B89\u88C5/\u6821\u9A8C ComfyUI ${tag} \u2192 engine/versions/${tag} ...`);
      const result = await installEngineAt({
        root,
        baseDir: base,
        version: tag,
        project,
        toolchain,
        log: say
      });
      if (ctx2.json) {
        emitData({
          installed: tag,
          dir: portablePath(root, base),
          toolchain: result.toolchain,
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
      const asPath = resolve5(root, target);
      let comfyDir;
      let venvDir;
      let version;
      if (existsSync31(join29(asPath, "main.py"))) {
        comfyDir = asPath;
        venvDir = join29(asPath, ".venv");
        if (!await venvReady(venvDir)) {
          throw new DaoyanCliError({
            code: "config_invalid",
            message: `\u8DEF\u5F84\u4E0B\u7684 venv \u4E0D\u53EF\u7528\uFF08\u9700\u8981 python + pip\uFF09\uFF1A${venvDir}`
          });
        }
      } else {
        const base = join29(root, "engine", "versions", target);
        comfyDir = join29(base, "ComfyUI");
        venvDir = join29(base, ".venv");
        if (!existsSync31(join29(comfyDir, "main.py"))) {
          throw new DaoyanCliError({
            code: "provision_failed",
            message: `\u672A\u627E\u5230\u7248\u672C ${target}\uFF08${portablePath(root, comfyDir)}\uFF09\u3002\u5148\u5B89\u88C5\uFF1Adaoyan engine install ${target}`
          });
        }
        if (!await venvReady(venvDir)) {
          throw new DaoyanCliError({
            code: "provision_failed",
            message: `\u7248\u672C ${target} \u7684 venv \u4E0D\u53EF\u7528\uFF08\u9700\u8981 python + pip\uFF09\uFF1A${portablePath(root, venvDir)}\u3002\u91CD\u65B0\u5B89\u88C5\uFF1Adaoyan engine install ${target}`
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
    init_options();
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
          opError(index, `\u8282\u70B9 ${op.node} \u4ECD\u88AB ${refs.length} \u5904\u5F15\u7528\uFF1B\u8BBE\u7F6E force:true \u540C\u65F6\u5220\u9664\u5173\u8054\u8FDE\u7EBF`, {
            references: refs
          });
        }
        if (op.force === true) {
          for (const ref of refs) {
            const holder = work[ref.node];
            const value = holder?.inputs[ref.input];
            if (isLink(value)) {
              removedLinks.push({
                from_node: value[0],
                output: value[1],
                to_node: ref.node,
                input: ref.input
              });
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
import { existsSync as existsSync32, readFileSync as readFileSync22, readdirSync as readdirSync11 } from "fs";
import { basename as basename9, join as join30, resolve as resolve6 } from "path";
function readStdin() {
  try {
    return readFileSync22(0, "utf8");
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
      await session.release({ submitted: false, interrupt: false, uploaded: [], scratch_outputs: [] }, opts.log);
    }
  } finally {
    lock?.release();
  }
}
function readOpsFile(path) {
  const text = path === "-" ? readStdin() : readFileSync22(path, "utf8");
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
  if (!existsSync32(abs)) return false;
  try {
    const parsed = parseGraph(JSON.parse(readFileSync22(abs, "utf8")));
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
    if (existsSync32(target.abs) && !replaced) {
      throw new DaoyanCliError({ code: "usage", message: `workflow ${name} \u5DF2\u5B58\u5728\uFF1A${target.rel}`, exit: 2 });
    }
    ensureDir(join30(root, WORKFLOWS_DIR));
    saveGraphFile(target.abs, {});
    if (ctx2.json)
      emitData({ name, path: target.rel, replaced_placeholder: replaced, graph_sha256: graphSha256({}) });
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
    if (existsSync32(target.abs) && !replaced) {
      throw new DaoyanCliError({ code: "usage", message: `workflow ${name} \u5DF2\u5B58\u5728`, exit: 2 });
    }
    const loaded = loadGraphFile(resolve6(process.cwd(), source), basename9(source));
    saveGraphFile(target.abs, loaded.graph);
    if (ctx2.json) emitData({ name, path: target.rel, replaced_placeholder: replaced, graph_sha256: loaded.sha256 });
    else say(`\u5DF2\u5BFC\u5165 ${target.rel}`);
    return;
  }
  if (sub === "list") {
    const { root } = requireProject(ctx2);
    const dir = join30(root, WORKFLOWS_DIR);
    const items = existsSync32(dir) ? readdirSync11(dir).filter((f) => f.endsWith(".json") && !f.endsWith(BINDINGS_SUFFIX)).sort().map((f) => {
      const abs = join30(dir, f);
      try {
        const parsed = parseGraph(JSON.parse(readFileSync22(abs, "utf8")));
        const stats = graphStats(parsed.graph);
        return {
          name: f.slice(0, -".json".length),
          path: `${WORKFLOWS_DIR}/${f}`,
          nodes: stats.nodes,
          links: stats.links,
          valid: !hasGraphErrors(parsed.issues)
        };
      } catch {
        return {
          name: f.slice(0, -".json".length),
          path: `${WORKFLOWS_DIR}/${f}`,
          nodes: 0,
          links: 0,
          valid: false
        };
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
      if (node === void 0)
        throw new DaoyanCliError({ code: "workflow_invalid", message: `\u8282\u70B9 ${nodeId} \u4E0D\u5B58\u5728` });
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
      bindings: existsSync32(bindingsPathOf(ref.abs)) ? bindingsPathOf(ref.abs).slice(root.length + 1) : null,
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
    for (const n of result.nodes)
      say(`${String(n.name)}  ${String(n.display_name ?? "")}  ${String(n.category ?? "")}`.trim());
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
      say(
        `  ${i.required ? "*" : "-"} ${i.name}: ${i.types.join("|")}${i.options !== void 0 ? ` [${i.options.slice(0, 6).join(", ")}\u2026]` : ""}`
      );
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
      raw = JSON.parse(readFileSync22(ref.abs, "utf8"));
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
    try {
      const assets = loadWorkflowAssets(ref.abs);
      if (assets !== null) issues.push(...validateWorkflowAssetsGraph(assets, parsed.graph, `${ref.rel}.assets`));
    } catch (e) {
      issues.push({
        path: `${ref.rel}.assets`,
        code: e instanceof DaoyanCliError ? e.code : "asset_slot_invalid",
        severity: "error",
        message: e instanceof Error ? e.message : String(e),
        hint: "\u4FEE\u6B63 workflows/<name>.assets.json\u3002"
      });
    }
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
    init_workflow_assets();
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

// src/core/web/data.mts
import { existsSync as existsSync33, readdirSync as readdirSync12, readFileSync as readFileSync23, statSync as statSync9 } from "fs";
import { basename as basename10, join as join31, resolve as resolve7, sep as sep2 } from "path";
function extensionOf(name) {
  const dot = name.lastIndexOf(EXTENSION_SEPARATOR);
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}
function classifyArtifact(name) {
  const ext = extensionOf(name);
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (JSON_EXTENSIONS.has(ext)) return "json";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "other";
}
function isLfsPointer(file, size) {
  if (size > 1024) return false;
  try {
    return readFileSync23(file, "utf8").startsWith(LFS_POINTER_PREFIX2);
  } catch {
    return false;
  }
}
function runMediaUrl(runId, name) {
  return `${MEDIA_PREFIX}/run/${encodeURIComponent(runId)}/${encodeURIComponent(name)}`;
}
function finalMediaUrl(name, episodeId) {
  if (episodeId !== void 0 && episodeId !== "") {
    return `${MEDIA_PREFIX}/final/${encodeURIComponent(episodeId)}/${encodeURIComponent(name)}`;
  }
  return `${MEDIA_PREFIX}/final/${encodeURIComponent(name)}`;
}
function artifactOf(root, run2, output2) {
  const base = runDir(root, run2.run_id);
  const abs = resolve7(base, output2.path);
  const within = abs !== base && abs.startsWith(base + sep2);
  const present = within && existsSync33(abs);
  let bytes = output2.bytes;
  let lfsPointer = false;
  if (present) {
    try {
      const stat = statSync9(abs);
      bytes = stat.size;
      lfsPointer = isLfsPointer(abs, stat.size);
    } catch {
    }
  }
  const mediaUrl = runMediaUrl(run2.run_id, output2.name);
  return {
    run_id: run2.run_id,
    name: output2.name,
    path: output2.path,
    kind: classifyArtifact(output2.name),
    bytes,
    sha256: output2.sha256,
    present,
    lfs_pointer: lfsPointer,
    media_url: mediaUrl,
    download_url: `${mediaUrl}?download=1`
  };
}
function safeReadRun(root, runId) {
  if (basename10(runId) !== runId || runId.includes("/") || runId.includes("\\") || runId === "." || runId === "..") {
    return null;
  }
  try {
    return readJsonIfExists(join31(runDir(root, runId), RUN_FILE));
  } catch {
    return null;
  }
}
function safeListRuns(root) {
  const dir = join31(root, RUNS_DIR);
  if (!existsSync33(dir)) return [];
  const out = [];
  for (const ent of readdirSync12(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const rec = safeReadRun(root, ent.name);
    if (rec !== null) out.push(rec);
  }
  return out.sort((a, b) => b.started_at.localeCompare(a.started_at) || b.run_id.localeCompare(a.run_id));
}
function safeReadTask(root, taskId) {
  if (basename10(taskId) !== taskId || taskId.includes("/") || taskId.includes("\\") || taskId === "." || taskId === "..") {
    return null;
  }
  try {
    return readJsonIfExists(join31(taskDir(root, taskId), TASK_FILE));
  } catch {
    return null;
  }
}
function safeListTasks(root) {
  const dir = join31(root, TASKS_DIR);
  if (!existsSync33(dir)) return [];
  const out = [];
  for (const ent of readdirSync12(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const rec = safeReadTask(root, ent.name);
    if (rec !== null) out.push(rec);
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
function durationMs(startedAt, finishedAt) {
  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return end - start;
}
function promptOf(run2) {
  const value = run2.inputs.prompt;
  return typeof value === "string" ? value : null;
}
function runSummaryDto(root, run2) {
  return {
    run_id: run2.run_id,
    task_id: run2.task_id,
    machine_id: run2.machine_id,
    episode_id: run2.episode_id ?? null,
    request_id: run2.request_id,
    label: run2.label,
    status: run2.status,
    workflow: run2.workflow,
    prompt: promptOf(run2),
    prompt_id: run2.prompt_id,
    engine: run2.engine,
    ...run2.gpu !== void 0 ? { gpu: run2.gpu } : {},
    started_at: run2.started_at,
    finished_at: run2.finished_at,
    duration_ms: durationMs(run2.started_at, run2.finished_at),
    error: run2.error,
    outputs: run2.outputs.map((o) => artifactOf(root, run2, o))
  };
}
function flattenArtifacts(root, runs) {
  const out = [];
  for (const run2 of runs) {
    for (const output2 of run2.outputs) {
      out.push({
        run_id: run2.run_id,
        task_id: run2.task_id,
        machine_id: run2.machine_id,
        episode_id: run2.episode_id ?? null,
        label: run2.label,
        run_status: run2.status,
        started_at: run2.started_at,
        finished_at: run2.finished_at,
        workflow: run2.workflow.path,
        prompt: promptOf(run2),
        output: artifactOf(root, run2, output2)
      });
    }
  }
  return out;
}
function listArtifacts(root, query = {}) {
  const runs = safeListRuns(root).filter(
    (r) => query.episode === void 0 || query.episode === "" || r.episode_id === query.episode
  );
  const labels = Array.from(new Set(runs.map((r) => r.label).filter((x) => x !== null))).sort();
  const all = flattenArtifacts(root, runs);
  const kinds = Array.from(new Set(all.map((x) => x.output.kind))).sort();
  const search = (query.search ?? "").trim().toLowerCase();
  const filtered = all.filter((item) => {
    if (query.label !== void 0 && query.label !== "" && item.label !== query.label) return false;
    if (query.status !== void 0 && query.status !== "" && item.run_status !== query.status) return false;
    if (query.kind !== void 0 && query.kind !== "" && item.output.kind !== query.kind) return false;
    if (search !== "") {
      const haystack = `${item.run_id} ${item.label ?? ""} ${item.prompt ?? ""} ${item.output.name}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_ARTIFACT_LIMIT, 1), MAX_ARTIFACT_LIMIT);
  return { items: filtered.slice(0, limit), total: filtered.length, labels, kinds };
}
function getRunDetail(root, runId) {
  const run2 = safeReadRun(root, runId);
  if (run2 === null) return null;
  let inputsSnapshot = null;
  try {
    inputsSnapshot = readJsonIfExists(join31(runDir(root, run2.run_id), RUN_INPUTS_FILE));
  } catch {
    inputsSnapshot = null;
  }
  let events = [];
  try {
    events = readEvents(taskDir(root, run2.task_id)).slice(-MAX_EVENT_ROWS);
  } catch {
    events = [];
  }
  return {
    ...runSummaryDto(root, run2),
    inputs: inputsSnapshot?.inputs ?? run2.inputs,
    overrides: run2.overrides,
    input_files: inputsSnapshot?.files ?? [],
    events,
    workflow_snapshot: existsSync33(join31(runDir(root, run2.run_id), RUN_WORKFLOW_FILE))
  };
}
function listRunsView(root, episodeId) {
  return safeListRuns(root).filter((r) => episodeId === void 0 || episodeId === "" || r.episode_id === episodeId).map((r) => runSummaryDto(root, r));
}
function taskItem(rec) {
  return {
    task_id: rec.task_id,
    kind: rec.kind,
    status: rec.status,
    mode: rec.mode,
    machine_id: rec.machine_id,
    episode_id: rec.episode_id ?? null,
    request_id: rec.request_id,
    runs: rec.runs,
    command: rec.command,
    created_at: rec.created_at,
    started_at: rec.started_at,
    finished_at: rec.finished_at,
    error: rec.error,
    next_actions: rec.next_actions,
    run_count: rec.runs.length,
    active: !isTerminalStatus(rec.status)
  };
}
function listTasksView(root, episodeId) {
  const tasks = safeListTasks(root).filter(
    (t) => episodeId === void 0 || episodeId === "" || t.episode_id === episodeId
  );
  return { items: tasks.map(taskItem), total: tasks.length };
}
function getTaskDetail(root, taskId) {
  const task = safeReadTask(root, taskId);
  if (task === null) return null;
  const runs = task.runs.map((id) => safeReadRun(root, id)).filter((x) => x !== null).map((run2) => runSummaryDto(root, run2));
  let events = [];
  try {
    events = readEvents(taskDir(root, taskId)).slice(-MAX_EVENT_ROWS);
  } catch {
    events = [];
  }
  return { ...taskItem(task), runs_detail: runs, events };
}
function recordOf2(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value;
}
function stringOf2(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text === "" ? null : text;
}
function numberOf(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function firstField(record, keys) {
  if (record === null) return void 0;
  for (const key of keys) {
    const value = record[key];
    if (value !== void 0 && value !== null && value !== "") return value;
  }
  return void 0;
}
function firstString(record, keys) {
  return stringOf2(firstField(record, keys));
}
function arrayOf(value) {
  if (value === void 0 || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
function entityFromRaw(value) {
  if (typeof value === "string") {
    const name2 = stringOf2(value);
    return name2 !== null ? { id: null, name: name2, description: null, reference: null } : null;
  }
  const record = recordOf2(value);
  if (record === null) return null;
  const id = firstString(record, ENTITY_ID_KEYS);
  const name = firstString(record, ENTITY_NAME_KEYS) ?? id;
  if (name === null) return null;
  return {
    id,
    name,
    description: firstString(record, ENTITY_DESC_KEYS),
    reference: firstString(record, ENTITY_REF_KEYS)
  };
}
function entityKeyOf(entity) {
  return entity.id !== null ? `id:${entity.id}` : `name:${entity.name}`;
}
function definitionsFrom(meta, keys) {
  const raw = firstField(meta, keys);
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of arrayOf(raw)) {
    const entity = entityFromRaw(item);
    if (entity === null) continue;
    const key = entityKeyOf(entity);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entity);
  }
  return out;
}
function resolveEntities(refs, definitions) {
  const byId = /* @__PURE__ */ new Map();
  const byName = /* @__PURE__ */ new Map();
  for (const def of definitions) {
    if (def.id !== null) byId.set(def.id, def);
    byName.set(def.name, def);
  }
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of arrayOf(refs)) {
    const parsed = entityFromRaw(item);
    if (parsed === null) continue;
    const def = (parsed.id !== null ? byId.get(parsed.id) : void 0) ?? byName.get(parsed.name) ?? byId.get(parsed.name);
    const entity = {
      id: parsed.id ?? def?.id ?? null,
      name: def?.name ?? parsed.name,
      description: parsed.description ?? def?.description ?? null,
      reference: parsed.reference ?? def?.reference ?? null,
      shots: [],
      count: 0
    };
    const key = entity.id !== null ? `id:${entity.id}` : `name:${entity.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entity);
  }
  return out;
}
function seedEntities(map, definitions) {
  for (const def of definitions) {
    const key = entityKeyOf(def);
    if (map.has(key)) continue;
    map.set(key, { ...def, shots: [], count: 0 });
  }
}
function mergeEntity(map, entity, shotId) {
  const key = entity.id !== null ? `id:${entity.id}` : `name:${entity.name}`;
  const existing = map.get(key);
  if (existing === void 0) {
    map.set(key, { ...entity, shots: [shotId], count: 1 });
    return;
  }
  if (!existing.shots.includes(shotId)) existing.shots.push(shotId);
  existing.count = existing.shots.length;
  if (existing.description === null && entity.description !== null) existing.description = entity.description;
  if (existing.reference === null && entity.reference !== null) existing.reference = entity.reference;
}
function sortEntities(list) {
  return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
function latestArtifactOf(root, run2) {
  if (run2 === null || run2.outputs.length === 0) return null;
  const output2 = run2.outputs.find((o) => classifyArtifact(o.name) === "video") ?? run2.outputs[0];
  return output2 !== void 0 ? artifactOf(root, run2, output2) : null;
}
function buildShotsView(root, shots, labelPrefix = "shot:") {
  if (shots === null) return null;
  const metaRecord = shots.meta;
  const defaultsRecord = shots.defaults;
  const fps = numberOf(metaRecord.fps) ?? numberOf(defaultsRecord.fps);
  const characterDefs = definitionsFrom(metaRecord, CHARACTER_KEYS);
  const sceneDefs = definitionsFrom(metaRecord, SCENE_DEF_KEYS);
  const characterMap = /* @__PURE__ */ new Map();
  const sceneMap = /* @__PURE__ */ new Map();
  seedEntities(characterMap, characterDefs);
  seedEntities(sceneMap, sceneDefs);
  const runs = safeListRuns(root);
  const byLabel = /* @__PURE__ */ new Map();
  for (const run2 of runs) {
    if (run2.label === null) continue;
    const list = byLabel.get(run2.label) ?? [];
    list.push(run2);
    byLabel.set(run2.label, list);
  }
  const items = shots.shots.map((shot) => {
    const shotRuns = byLabel.get(`${labelPrefix}${shot.id}`) ?? [];
    const latest = shotRuns[0] ?? null;
    const latestSuccess = shotRuns.find((r) => r.status === "succeeded") ?? null;
    const record = shot;
    const params = recordOf2(shot.params);
    const characterRefs = firstField(record, CHARACTER_KEYS) ?? firstField(params, CHARACTER_KEYS);
    const sceneRef = firstField(record, SCENE_KEYS) ?? firstField(params, SCENE_KEYS);
    const shotCharacters = resolveEntities(characterRefs, characterDefs);
    const shotScene = resolveEntities(sceneRef, sceneDefs)[0] ?? null;
    for (const entity of shotCharacters) {
      entity.shots = [shot.id];
      entity.count = 1;
      mergeEntity(characterMap, entity, shot.id);
    }
    if (shotScene !== null) {
      shotScene.shots = [shot.id];
      shotScene.count = 1;
      mergeEntity(sceneMap, shotScene, shot.id);
    }
    let firstFrame = null;
    let firstFrameKind = "none";
    if (typeof shot.first_frame === "string") {
      firstFrame = shot.first_frame;
      firstFrameKind = "anchor";
    } else if (shot.first_frame !== void 0 && typeof shot.first_frame === "object") {
      firstFrame = `\u63A5\u529B ${shot.first_frame.relay}`;
      firstFrameKind = "relay";
    }
    const length = shot.length ?? shots.defaults.length ?? null;
    const durationSeconds = numberOf(shot.duration) ?? (length !== null && fps !== null && fps > 0 ? length / fps : null);
    const runViews = shotRuns.map((run2) => {
      return {
        run_id: run2.run_id,
        status: run2.status,
        started_at: run2.started_at,
        finished_at: run2.finished_at,
        duration_ms: durationMs(run2.started_at, run2.finished_at),
        error: run2.error,
        outputs: run2.outputs.map((o) => artifactOf(root, run2, o))
      };
    });
    const artifacts = shotRuns.flatMap((run2) => flattenArtifacts(root, [run2]));
    return {
      id: shot.id,
      slug: shot.slug ?? null,
      title: shot.title ?? shot.slug ?? null,
      summary: shot.summary ?? shot.description ?? firstString(record, CONTENT_KEYS) ?? shot.prompt,
      seed: shot.seed,
      prompt: shot.prompt,
      characters: shotCharacters,
      scene: shotScene,
      first_frame: firstFrame,
      first_frame_kind: firstFrameKind,
      workflow: shot.workflow ?? shots.workflow ?? null,
      done: latestSuccess !== null,
      latest_run: latest?.run_id ?? null,
      latest_status: latest?.status ?? null,
      latest_artifact: latestArtifactOf(root, latestSuccess),
      artifacts,
      runs: runViews,
      runs_count: shotRuns.length,
      succeeded_count: shotRuns.filter((r) => r.status === "succeeded").length,
      length,
      duration_seconds: durationSeconds,
      width: shot.width ?? shots.meta.width,
      height: shot.height ?? shots.meta.height,
      steps: shot.steps ?? shots.defaults.steps ?? null,
      cfg: shot.cfg ?? shots.defaults.cfg ?? null,
      notes: shot.notes ?? null,
      params: shot.params ?? null
    };
  });
  const characters = sortEntities(Array.from(characterMap.values()));
  const scenes = sortEntities(Array.from(sceneMap.values()));
  const artifactsTotal = items.reduce((sum, item) => sum + item.artifacts.length, 0);
  const totalFrames = items.reduce((sum, item) => sum + (item.length ?? 0), 0);
  const durations = items.map((item) => item.duration_seconds);
  const totalDuration = items.length > 0 && durations.every((value) => value !== null) ? durations.reduce((sum, value) => sum + (value ?? 0), 0) : null;
  return {
    title: shots.meta.title ?? null,
    synopsis: firstString(metaRecord, SYNOPSIS_KEYS),
    workflow: shots.workflow ?? null,
    style_prefix: shots.style_prefix ?? null,
    meta: shots.meta,
    defaults: shots.defaults,
    fps,
    characters,
    scenes,
    summary: {
      shots_total: items.length,
      shots_done: items.filter((item) => item.done).length,
      characters_total: characters.length,
      scenes_total: scenes.length,
      artifacts_total: artifactsTotal,
      total_frames: totalFrames,
      total_duration_seconds: totalDuration,
      resolution: `${shots.meta.width}x${shots.meta.height}`,
      fps
    },
    shots: items
  };
}
function listFinals(root, episodeId) {
  const dir = episodeId !== void 0 && episodeId !== "" ? join31(root, FINAL_DIR, episodeId) : join31(root, FINAL_DIR);
  if (!existsSync33(dir)) return [];
  const entries = readdirSync12(dir, { withFileTypes: true }).filter((e) => e.isFile());
  const referenced = /* @__PURE__ */ new Set();
  const out = [];
  for (const entry of entries) {
    if (!entry.name.endsWith(".json")) continue;
    try {
      const manifest = JSON.parse(readFileSync23(join31(dir, entry.name), "utf8"));
      const cut = typeof manifest.cut === "string" ? manifest.cut : "";
      if (cut === "" || basename10(cut) !== cut || cut.includes("/") || cut.includes("\\")) continue;
      if (!existsSync33(join31(dir, cut))) continue;
      referenced.add(cut);
      const stat = statSync9(join31(dir, cut));
      const mediaUrl = finalMediaUrl(cut, episodeId);
      const clips = Array.isArray(manifest.clips) ? manifest.clips.filter((x) => typeof x === "object" && x !== null).map((x) => ({
        shot: String(x.shot ?? ""),
        run_id: String(x.run_id ?? ""),
        artifact: String(x.artifact ?? "")
      })) : [];
      out.push({
        episode_id: episodeId !== void 0 && episodeId !== "" ? episodeId : null,
        name: cut,
        manifest: entry.name,
        media_url: mediaUrl,
        download_url: `${mediaUrl}?download=1`,
        bytes: stat.size,
        present: true,
        lfs_pointer: isLfsPointer(join31(dir, cut), stat.size),
        created_at: typeof manifest.created_at === "string" ? manifest.created_at : null,
        clips,
        missing: Array.isArray(manifest.missing) ? manifest.missing.map((x) => String(x)) : []
      });
    } catch {
    }
  }
  for (const entry of entries) {
    if (referenced.has(entry.name)) continue;
    if (!/^cut-.*\.(mp4|webm|mov|mkv)$/i.test(entry.name)) continue;
    try {
      const stat = statSync9(join31(dir, entry.name));
      const mediaUrl = finalMediaUrl(entry.name, episodeId);
      out.push({
        episode_id: episodeId !== void 0 && episodeId !== "" ? episodeId : null,
        name: entry.name,
        manifest: null,
        media_url: mediaUrl,
        download_url: `${mediaUrl}?download=1`,
        bytes: stat.size,
        present: true,
        lfs_pointer: isLfsPointer(join31(dir, entry.name), stat.size),
        created_at: null,
        clips: [],
        missing: []
      });
    } catch {
    }
  }
  return out.sort((a, b) => b.name.localeCompare(a.name));
}
function listWorkflows(root, project) {
  const dir = join31(root, WORKFLOWS_DIR);
  if (!existsSync33(dir)) return [];
  const defaultRef = (project.default_workflow ?? "").trim();
  const out = [];
  for (const entry of readdirSync12(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.endsWith(".bindings.json")) continue;
    const name = entry.name.slice(0, -".json".length);
    let graph = null;
    try {
      graph = JSON.parse(readFileSync23(join31(dir, entry.name), "utf8"));
    } catch {
      graph = null;
    }
    const nodes = graph !== null && typeof graph === "object" && !Array.isArray(graph) ? Object.keys(graph).length : 0;
    out.push({
      name,
      path: `${WORKFLOWS_DIR}/${entry.name}`,
      nodes,
      bindings: existsSync33(join31(dir, `${name}.bindings.json`)),
      default: defaultRef === name || defaultRef === `workflows/${name}` || defaultRef === `workflows/${name}.json`,
      valid: graph !== null && typeof graph === "object"
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
function buildStats(shots, runs, tasks, storyboard = null) {
  const outputCount = runs.reduce((sum, r) => sum + r.outputs.length, 0);
  const outputBytes = runs.reduce((sum, r) => sum + r.outputs.reduce((s, o) => s + o.bytes, 0), 0);
  const doneShots = storyboard?.summary.shots_done ?? (shots === null ? 0 : shots.shots.filter((s) => runs.some((r) => r.label === `shot:${s.id}` && r.status === "succeeded")).length);
  return {
    runs_total: runs.length,
    runs_succeeded: runs.filter((r) => r.status === "succeeded").length,
    runs_failed: runs.filter((r) => r.status === "failed").length,
    tasks_total: tasks.length,
    tasks_active: tasks.filter((t) => !isTerminalStatus(t.status)).length,
    outputs_total: outputCount,
    outputs_bytes: outputBytes,
    shots_total: shots?.shots.length ?? 0,
    shots_done: doneShots,
    characters_total: storyboard?.summary.characters_total ?? 0,
    scenes_total: storyboard?.summary.scenes_total ?? 0,
    total_frames: storyboard?.summary.total_frames ?? 0,
    total_duration_seconds: storyboard?.summary.total_duration_seconds ?? null
  };
}
function withStoryStats(stats, story) {
  return {
    ...stats,
    episodes_total: story.counts.episodes,
    characters_total: story.counts.characters,
    forms_total: story.counts.forms,
    scenes_total: story.counts.scenes,
    voices_total: story.counts.voices,
    shots_total: story.counts.shots,
    assets_total: story.counts.assets
  };
}
function storyOverviewFields(root, project) {
  if (!storyEnabled(root)) return null;
  const story = computeSeriesStoryStatus(root, project);
  return { story, series: story.series, episodes: story.episodes };
}
function buildSharedOverview(root, project, shots) {
  const runs = safeListRuns(root);
  const tasks = safeListTasks(root);
  const storyFields = storyOverviewFields(root, project);
  const storyboard = storyFields === null ? buildShotsView(root, shots) : null;
  const stats = buildStats(shots, runs, tasks, storyboard);
  return {
    project: { name: project.name, version: project.version },
    mode: null,
    machine_id: null,
    machine: null,
    engine: null,
    machine_lock: null,
    active_task: null,
    active_tasks: [],
    synced_running_tasks: [],
    recent_tasks: tasks.slice(0, 10).map(taskItem),
    gpu: null,
    skill: null,
    shots: storyFields === null ? shotProgress(root, shots) : [],
    storyboard,
    ...storyFields !== null ? storyFields : {},
    next_actions: storyFields !== null ? ["story status --json", "story episode list --json"] : ["init --mode=local", "init --mode=remote --url <url>"],
    stats: storyFields !== null ? withStoryStats(stats, storyFields.story) : stats,
    recent_artifacts: flattenArtifacts(root, runs).slice(0, OVERVIEW_ARTIFACT_LIMIT),
    generated_at: nowIso()
  };
}
function machineViewOf(machine) {
  if (machine === null || typeof machine !== "object") return null;
  const m = machine;
  const engine = m.engine;
  if (engine === null || typeof engine !== "object") {
    return { id: m.id, engine: null, override_workflows: m.override_workflows };
  }
  const e = engine;
  return {
    id: m.id,
    engine: e.mode === "local" ? { mode: "local", port: e.port, comfyui_version: e.comfyui_version } : { mode: "remote", free_after_task: e.free_after_task },
    override_workflows: m.override_workflows
  };
}
async function buildOverview(root, project, machine, shots, commands = []) {
  if (machine === null) return buildSharedOverview(root, project, shots);
  const storyFields = storyOverviewFields(root, project);
  const base = await buildStatusSnapshot(root, project, machine, storyFields === null ? shots : null, {
    commands,
    engineTimeoutMs: OVERVIEW_ENGINE_TIMEOUT_MS
  });
  const runs = safeListRuns(root);
  const tasks = safeListTasks(root);
  const storyboard = storyFields === null ? buildShotsView(root, shots) : null;
  const stats = buildStats(shots, runs, tasks, storyboard);
  return {
    ...base,
    machine: machineViewOf(base.machine),
    storyboard,
    ...storyFields !== null ? storyFields : {},
    next_actions: storyFields !== null ? storyFields.story.next_actions : base.next_actions,
    stats: storyFields !== null ? withStoryStats(stats, storyFields.story) : stats,
    recent_artifacts: flattenArtifacts(root, runs).slice(0, OVERVIEW_ARTIFACT_LIMIT),
    recent_tasks: tasks.slice(0, 10).map(taskItem),
    generated_at: nowIso()
  };
}
var VIDEO_EXTENSIONS, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, JSON_EXTENSIONS, TEXT_EXTENSIONS, LFS_POINTER_PREFIX2, MEDIA_PREFIX, DEFAULT_ARTIFACT_LIMIT, MAX_ARTIFACT_LIMIT, MAX_EVENT_ROWS, OVERVIEW_ENGINE_TIMEOUT_MS, OVERVIEW_ARTIFACT_LIMIT, EXTENSION_SEPARATOR, CHARACTER_KEYS, SCENE_KEYS, SCENE_DEF_KEYS, SYNOPSIS_KEYS, CONTENT_KEYS, ENTITY_ID_KEYS, ENTITY_NAME_KEYS, ENTITY_DESC_KEYS, ENTITY_REF_KEYS;
var init_data = __esm({
  "src/core/web/data.mts"() {
    "use strict";
    init_types();
    init_fs();
    init_snapshot();
    init_events();
    init_store();
    init_store3();
    init_paths();
    init_validate();
    VIDEO_EXTENSIONS = /* @__PURE__ */ new Set([".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"]);
    IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"]);
    AUDIO_EXTENSIONS = /* @__PURE__ */ new Set([".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus"]);
    JSON_EXTENSIONS = /* @__PURE__ */ new Set([".json"]);
    TEXT_EXTENSIONS = /* @__PURE__ */ new Set([".txt", ".md", ".log", ".csv", ".yaml", ".yml"]);
    LFS_POINTER_PREFIX2 = "version https://git-lfs.github.com/spec/v1";
    MEDIA_PREFIX = "/media";
    DEFAULT_ARTIFACT_LIMIT = 200;
    MAX_ARTIFACT_LIMIT = 500;
    MAX_EVENT_ROWS = 300;
    OVERVIEW_ENGINE_TIMEOUT_MS = 1500;
    OVERVIEW_ARTIFACT_LIMIT = 8;
    EXTENSION_SEPARATOR = ".";
    CHARACTER_KEYS = ["characters", "cast", "roles"];
    SCENE_KEYS = ["scene", "location", "set"];
    SCENE_DEF_KEYS = ["scenes", "locations", "sets"];
    SYNOPSIS_KEYS = ["synopsis", "summary", "description", "intro"];
    CONTENT_KEYS = ["content", "summary", "description"];
    ENTITY_ID_KEYS = ["id", "key"];
    ENTITY_NAME_KEYS = ["name", "title"];
    ENTITY_DESC_KEYS = ["description", "desc", "profile", "intro"];
    ENTITY_REF_KEYS = ["reference", "image", "ref", "portrait", "anchor"];
  }
});

// src/core/web/media.mts
import { createReadStream, existsSync as existsSync34, realpathSync, statSync as statSync10 } from "fs";
import { basename as basename11, extname, join as join32, sep as sep3 } from "path";
import { pipeline } from "stream/promises";
function contentTypeOf(name) {
  return MIME_TYPES[extname(name).toLowerCase()] ?? DEFAULT_MIME;
}
function isWithin(base, target) {
  return target === base || target.startsWith(base.endsWith(PATH_SEPARATOR) ? base : base + PATH_SEPARATOR);
}
function safeRealpath(file) {
  try {
    return realpathSync(file);
  } catch {
    return null;
  }
}
function makeTarget(abs, name, etag) {
  if (!existsSync34(abs)) return null;
  try {
    const stat = statSync10(abs);
    if (!stat.isFile()) return null;
    return {
      abs,
      name,
      bytes: stat.size,
      content_type: contentTypeOf(name),
      etag
    };
  } catch {
    return null;
  }
}
function resolveRunMedia(root, runId, name) {
  if (basename11(runId) !== runId || runId.includes("/") || runId.includes("\\") || runId === "." || runId === "..") {
    return null;
  }
  let rec = null;
  try {
    rec = readRun(root, runId);
  } catch {
    return null;
  }
  if (rec === null) return null;
  const projectRoot = safeRealpath(root);
  if (projectRoot === null) return null;
  const output2 = rec.outputs.find((o) => o.name === name);
  if (output2 === void 0) return null;
  const base = safeRealpath(join32(root, RUNS_DIR, runId));
  if (base === null || !isWithin(projectRoot, base)) return null;
  const abs = safeRealpath(join32(runDir(root, runId), output2.path));
  if (abs === null || !isWithin(base, abs)) return null;
  return makeTarget(abs, output2.name, `"${output2.sha256}"`);
}
function resolveFinalMedia(root, name) {
  const dir = join32(root, FINAL_DIR);
  const projectRoot = safeRealpath(root);
  if (projectRoot === null) return null;
  const base = safeRealpath(dir);
  if (base === null || !isWithin(projectRoot, base)) return null;
  if (basename11(name) !== name || name.includes("/") || name.includes("\\")) return null;
  const abs = safeRealpath(join32(dir, name));
  if (abs === null || !isWithin(base, abs)) return null;
  try {
    const stat = statSync10(abs);
    if (!stat.isFile()) return null;
    return makeTarget(abs, name, `"${stat.size}-${Math.floor(stat.mtimeMs)}"`);
  } catch {
    return null;
  }
}
function resolveStoryMedia(root, relPath) {
  if (relPath === "" || relPath.startsWith("/") || relPath.includes("..") || relPath.includes("\\")) return null;
  const projectRoot = safeRealpath(root);
  if (projectRoot === null) return null;
  const base = safeRealpath(join32(root, STORY_ASSETS_DIR));
  if (base === null || !isWithin(projectRoot, base)) return null;
  const abs = safeRealpath(join32(root, STORY_ASSETS_DIR, relPath));
  if (abs === null || !isWithin(base, abs)) return null;
  try {
    const stat = statSync10(abs);
    if (!stat.isFile()) return null;
    return makeTarget(abs, basename11(abs), `"${stat.size}-${Math.floor(stat.mtimeMs)}"`);
  } catch {
    return null;
  }
}
function resolveEpisodeFinalMedia(root, episodeId, name) {
  if (!STORY_ID_RE.test(episodeId)) return null;
  const dir = join32(root, FINAL_DIR, episodeId);
  const projectRoot = safeRealpath(root);
  if (projectRoot === null) return null;
  const base = safeRealpath(dir);
  if (base === null || !isWithin(projectRoot, base)) return null;
  if (basename11(name) !== name || name.includes("/") || name.includes("\\")) return null;
  const abs = safeRealpath(join32(dir, name));
  if (abs === null || !isWithin(base, abs)) return null;
  try {
    const stat = statSync10(abs);
    if (!stat.isFile()) return null;
    return makeTarget(abs, name, `"${stat.size}-${Math.floor(stat.mtimeMs)}"`);
  } catch {
    return null;
  }
}
function parseRange(header, size) {
  if (header === void 0 || header.trim() === "") return { kind: "none" };
  const value = header.trim();
  if (!value.startsWith("bytes=")) return { kind: "invalid" };
  if (value.includes(",")) return { kind: "none" };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (match === null) return { kind: "invalid" };
  const startText = match[1] ?? "";
  const endText = match[2] ?? "";
  if (startText === "" && endText === "") return { kind: "invalid" };
  if (size <= 0) return { kind: "invalid" };
  if (startText === "") {
    const suffix = Number(endText);
    if (!Number.isInteger(suffix) || suffix <= 0) return { kind: "invalid" };
    return { kind: "ok", start: Math.max(size - suffix, 0), end: size - 1 };
  }
  const start = Number(startText);
  if (!Number.isInteger(start) || start < 0 || start >= size) return { kind: "invalid" };
  if (endText === "") return { kind: "ok", start, end: size - 1 };
  const end = Number(endText);
  if (!Number.isInteger(end) || end < start) return { kind: "invalid" };
  return { kind: "ok", start, end: Math.min(end, size - 1) };
}
async function serveMedia(req, res, target, download) {
  const range = parseRange(typeof req.headers.range === "string" ? req.headers.range : void 0, target.bytes);
  if (range.kind === "invalid") {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${target.bytes}`);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Range Not Satisfiable");
    return;
  }
  const ifNoneMatch = req.headers["if-none-match"];
  if (range.kind === "none" && typeof ifNoneMatch === "string" && ifNoneMatch === target.etag) {
    res.statusCode = 304;
    res.setHeader("ETag", target.etag);
    res.end();
    return;
  }
  res.setHeader("Content-Type", target.content_type);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", `private, max-age=${MEDIA_CACHE_SECONDS}, immutable`);
  res.setHeader("ETag", target.etag);
  const filename = target.name.replace(UNSAFE_FILENAME_CHARS, "_");
  res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${filename}"`);
  if (range.kind === "none" && target.bytes === 0) {
    res.statusCode = 200;
    res.setHeader("Content-Length", "0");
    res.end();
    return;
  }
  if (range.kind === "ok") {
    const length = range.end - range.start + 1;
    res.statusCode = 206;
    res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${target.bytes}`);
    res.setHeader("Content-Length", String(length));
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    await streamFile(target.abs, res, range.start, range.end);
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Length", String(target.bytes));
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  await streamFile(target.abs, res, 0, Math.max(target.bytes - 1, 0));
}
async function streamFile(abs, res, start, end) {
  if (end < start) {
    res.end();
    return;
  }
  try {
    const stream = createReadStream(abs, { start, end });
    await pipeline(stream, res);
  } catch {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    } else {
      res.destroy();
    }
  }
}
var MIME_TYPES, DEFAULT_MIME, MEDIA_CACHE_SECONDS, PATH_SEPARATOR, UNSAFE_FILENAME_CHARS;
var init_media = __esm({
  "src/core/web/media.mts"() {
    "use strict";
    init_types();
    init_store3();
    init_paths();
    MIME_TYPES = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".mkv": "video/x-matroska",
      ".avi": "video/x-msvideo",
      ".m4v": "video/x-m4v",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".avif": "image/avif",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".flac": "audio/flac",
      ".m4a": "audio/mp4",
      ".aac": "audio/aac",
      ".ogg": "audio/ogg",
      ".opus": "audio/opus",
      ".json": "application/json; charset=utf-8",
      ".txt": "text/plain; charset=utf-8",
      ".md": "text/markdown; charset=utf-8",
      ".log": "text/plain; charset=utf-8",
      ".csv": "text/csv; charset=utf-8",
      ".yaml": "text/yaml; charset=utf-8",
      ".yml": "text/yaml; charset=utf-8"
    };
    DEFAULT_MIME = "application/octet-stream";
    MEDIA_CACHE_SECONDS = 31536e3;
    PATH_SEPARATOR = sep3;
    UNSAFE_FILENAME_CHARS = /["\\\r\n]/g;
  }
});

// src/core/web/story-data.mts
import { existsSync as existsSync35, statSync as statSync11 } from "fs";
import { join as join33 } from "path";
function storyMediaUrl(path) {
  const prefix = "story/assets/";
  const rel = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return `${STORY_MEDIA_PREFIX}/${rel.split("/").map(encodeURIComponent).join("/")}`;
}
function assetView(root, asset) {
  const abs = join33(root, asset.path);
  const present = existsSync35(abs);
  let bytes = asset.bytes;
  let lfsPointer = false;
  if (present) {
    try {
      const stat = statSync11(abs);
      bytes = stat.size;
      lfsPointer = isLfsPointerFile(abs);
    } catch {
    }
  }
  const mediaUrl = storyMediaUrl(asset.path);
  return {
    id: asset.id,
    role: asset.role ?? null,
    path: asset.path,
    kind: classifyArtifact(asset.path),
    content_type: asset.content_type,
    sha256: asset.sha256,
    bytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    source_run: asset.source_run,
    source_output: asset.source_output,
    source_episode_id: asset.source_episode_id,
    created_at: asset.created_at,
    present,
    lfs_pointer: lfsPointer,
    media_url: mediaUrl,
    download_url: `${mediaUrl}?download=1`
  };
}
function listStoryCharactersView(root) {
  const doc = loadCharacters(root);
  return doc.characters.map((character) => ({
    id: character.id,
    name: character.name,
    aliases: character.aliases ?? [],
    role: character.role ?? null,
    introduced_in: character.introduced_in ?? null,
    summary: character.summary ?? null,
    appearance: character.appearance ?? null,
    default_form: character.default_form,
    voice_ids: character.voice_ids ?? [],
    forms: character.forms.map((form) => ({
      id: form.id,
      name: form.name,
      description: form.description ?? null,
      outfit: form.outfit ?? null,
      reference_asset: form.reference_asset ?? null,
      assets: form.assets.map((asset) => assetView(root, asset))
    }))
  }));
}
function listStoryScenesView(root) {
  const doc = loadScenes(root);
  return doc.scenes.map((scene) => ({
    id: scene.id,
    name: scene.name,
    description: scene.description ?? null,
    time_of_day: scene.time_of_day ?? null,
    interior_exterior: scene.interior_exterior ?? null,
    mood: scene.mood ?? null,
    introduced_in: scene.introduced_in ?? null,
    reference_asset: scene.reference_asset ?? null,
    assets: scene.assets.map((asset) => assetView(root, asset))
  }));
}
function listStoryVoicesView(root) {
  const doc = loadVoices(root);
  return doc.voices.map((voice) => ({
    id: voice.id,
    character_id: voice.character_id,
    name: voice.name,
    mode: voice.mode,
    description: voice.description ?? null,
    sample_text: voice.sample_text ?? null,
    reference_asset: voice.reference_asset ?? null,
    assets: voice.assets.map((asset) => assetView(root, asset))
  }));
}
function listStoryAssetsView(root) {
  return listAssets(root).map((item) => ({
    owner_kind: item.owner_kind,
    owner_id: item.owner_id,
    owner_name: item.owner_name,
    form_id: item.form_id,
    reference: item.reference,
    asset: assetView(root, item.asset)
  }));
}
function buildStorySeriesView(root, project) {
  const series = readSeries(root);
  const status = computeSeriesStoryStatus(root, project);
  return { series, status, episodes: status.episodes, counts: status.counts };
}
function buildEpisodeShotsView(root, episodeId) {
  const shots = loadEpisodeShots(root, episodeId);
  if (shots === null) return null;
  const characters = loadCharacters(root);
  const characterDefs = characters.characters.map((character) => {
    const form = character.forms.find((f) => f.id === character.default_form) ?? character.forms[0];
    const asset = form?.reference_asset ? form.assets.find((a) => a.id === form.reference_asset) : void 0;
    return {
      id: character.id,
      name: character.name,
      description: character.summary ?? form?.description ?? "",
      ...asset !== void 0 ? { reference: asset.path } : {}
    };
  });
  const scenes = loadScenes(root);
  const sceneDefs = scenes.scenes.map((scene) => {
    const asset = scene.reference_asset ? scene.assets.find((a) => a.id === scene.reference_asset) : void 0;
    return {
      id: scene.id,
      name: scene.name,
      description: scene.description ?? "",
      ...asset !== void 0 ? { reference: asset.path } : {}
    };
  });
  const meta = shots.meta;
  const synthetic = {
    ...shots,
    meta: {
      ...meta,
      characters: characterDefs,
      scenes: sceneDefs
    }
  };
  return buildShotsView(root, synthetic, `ep:${episodeId}:shot:`);
}
function buildStoryEpisodeView(root, episodeId, project) {
  const meta = readEpisodeMeta(root, episodeId);
  if (meta === null) return null;
  const status = computeEpisodeStoryStatus(root, episodeId, project);
  const script = loadScriptMeta(root, episodeId);
  const content = loadScriptText(root, episodeId);
  const breakdown = loadBreakdown(root, episodeId);
  const shots = buildEpisodeShotsView(root, episodeId);
  const tasks = listTasksView(root, episodeId);
  const runs = listRunsView(root, episodeId);
  const artifacts = listArtifacts(root, { episode: episodeId, limit: 200 });
  const finals = listFinals(root, episodeId);
  const dir = episodeDir(root, episodeId);
  return {
    episode: meta,
    status,
    script: { meta: script, content },
    breakdown,
    shots,
    tasks: tasks.items,
    runs,
    artifacts: artifacts.items,
    finals,
    files: {
      script_md: existsSync35(join33(dir, "script.md")),
      script_json: existsSync35(join33(dir, "script.json")),
      breakdown: existsSync35(join33(dir, "breakdown.json")),
      shots: existsSync35(join33(dir, "shots.json"))
    },
    episodes: listEpisodeMetas(root)
  };
}
var STORY_MEDIA_PREFIX;
var init_story_data = __esm({
  "src/core/web/story-data.mts"() {
    "use strict";
    init_data();
    init_assets();
    init_paths();
    init_store2();
    init_validate();
    STORY_MEDIA_PREFIX = "/media/story";
  }
});

// src/core/web/server.mts
import { createServer as createServer2 } from "http";
function isLoopbackHost(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
}
function displayHost(host) {
  if (host === "0.0.0.0") return "127.0.0.1";
  if (host === "::" || host === "::1") return "[::1]";
  if (host.includes(":") && !host.startsWith("[")) return `[${host}]`;
  return host;
}
function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
}
function sendJson(res, status, data, headOnly = false) {
  const body = Buffer.from(JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data }), "utf8");
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", String(body.byteLength));
  if (headOnly) res.end();
  else res.end(body);
}
function sendJsonError(res, status, code, message, headOnly = false) {
  const body = Buffer.from(
    JSON.stringify({ ok: false, schema_version: SCHEMA_VERSION, error: { code, message } }),
    "utf8"
  );
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", String(body.byteLength));
  if (headOnly) res.end();
  else res.end(body);
}
function sendText(res, status, body, contentType = "text/plain; charset=utf-8", headOnly = false) {
  const payload = Buffer.from(body, "utf8");
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", String(payload.byteLength));
  if (headOnly) res.end();
  else res.end(payload);
}
function sendAsset(res, body, contentType, headOnly) {
  const payload = Buffer.from(body, "utf8");
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", `public, max-age=${ASSET_CACHE_SECONDS}`);
  res.setHeader("Content-Length", String(payload.byteLength));
  if (headOnly) res.end();
  else res.end(payload);
}
function hostAllowed(req, host, port) {
  if (!isLoopbackHost(host)) return true;
  const header = req.headers.host;
  if (typeof header !== "string" || header === "") return false;
  const allowed = /* @__PURE__ */ new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `[::1]:${port}`,
    "127.0.0.1",
    "localhost",
    "[::1]"
  ]);
  return allowed.has(header.toLowerCase());
}
function intQuery(value, fallback) {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}
function decodeSegment(value) {
  try {
    const decoded = decodeURIComponent(value);
    if (decoded === "" || decoded.includes("/") || decoded.includes("\\")) return null;
    return decoded;
  } catch {
    return null;
  }
}
async function overviewOf(ctx2, cache) {
  const now = Date.now();
  if (cache.data !== null && now - cache.at < OVERVIEW_CACHE_MS) return cache.data;
  const data = await buildOverview(ctx2.root, ctx2.project, ctx2.machine, ctx2.shots, ctx2.commands);
  cache.at = now;
  cache.data = data;
  return data;
}
async function handleRequest(req, res, ctx2, cache) {
  try {
    setSecurityHeaders(res);
    const headOnly = req.method === "HEAD";
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", ALLOWED_METHODS);
      sendJsonError(res, 405, "method_not_allowed", "\u53EA\u652F\u6301 GET / HEAD", headOnly);
      return;
    }
    if (!hostAllowed(req, ctx2.host, ctx2.port)) {
      sendJsonError(res, 403, "forbidden", "Host \u4E0D\u5728\u5141\u8BB8\u5217\u8868", headOnly);
      return;
    }
    let url;
    try {
      url = new URL(req.url ?? "/", URL_BASE);
    } catch {
      sendJsonError(res, 400, "bad_request", "URL \u975E\u6CD5", headOnly);
      return;
    }
    const pathname = url.pathname;
    if (pathname === "/" || pathname === "/index.html") {
      sendAsset(res, ctx2.assets.index_html, "text/html; charset=utf-8", headOnly);
      return;
    }
    if (pathname === "/assets/app.js") {
      sendAsset(res, ctx2.assets.app_js, "text/javascript; charset=utf-8", headOnly);
      return;
    }
    if (pathname === "/assets/style.css") {
      sendAsset(res, ctx2.assets.style_css, "text/css; charset=utf-8", headOnly);
      return;
    }
    if (pathname === "/favicon.ico") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (pathname === "/api/health") {
      sendJson(
        res,
        200,
        {
          status: "ok",
          version: VERSION,
          project: ctx2.project.name,
          mode: ctx2.machine?.engine.mode ?? null
        },
        headOnly
      );
      return;
    }
    if (pathname === "/api/overview") {
      sendJson(res, 200, await overviewOf(ctx2, cache), headOnly);
      return;
    }
    if (pathname === "/api/episodes") {
      if (!storyEnabled(ctx2.root)) {
        sendJson(res, 200, { episodes: [] }, headOnly);
        return;
      }
      const view = buildStorySeriesView(ctx2.root, ctx2.project);
      sendJson(res, 200, { episodes: view.episodes, series: view.series, status: view.status }, headOnly);
      return;
    }
    if (pathname.startsWith("/api/episodes/")) {
      if (!storyEnabled(ctx2.root)) {
        sendJsonError(res, 404, "not_found", "story \u6A21\u5F0F\u672A\u542F\u7528", headOnly);
        return;
      }
      const segments = pathname.split("/");
      const episodeId = decodeSegment(segments[3] ?? "");
      if (episodeId === null) {
        sendJsonError(res, 400, "bad_request", "\u5267\u96C6 id \u975E\u6CD5", headOnly);
        return;
      }
      const view = buildStoryEpisodeView(ctx2.root, episodeId, ctx2.project);
      if (view === null) {
        sendJsonError(res, 404, "not_found", `\u672A\u627E\u5230\u5267\u96C6 ${episodeId}`, headOnly);
        return;
      }
      const action = segments[4];
      if (action === void 0) {
        sendJson(res, 200, view, headOnly);
        return;
      }
      const fields = {
        script: view.script,
        breakdown: view.breakdown,
        shots: view.shots,
        tasks: view.tasks,
        runs: view.runs,
        artifacts: view.artifacts,
        finals: view.finals,
        status: view.status
      };
      if (!(action in fields)) {
        sendJsonError(res, 404, "not_found", "\u63A5\u53E3\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      sendJson(res, 200, fields[action], headOnly);
      return;
    }
    if (pathname === "/api/story/characters") {
      sendJson(res, 200, { items: listStoryCharactersView(ctx2.root) }, headOnly);
      return;
    }
    if (pathname === "/api/story/scenes") {
      sendJson(res, 200, { items: listStoryScenesView(ctx2.root) }, headOnly);
      return;
    }
    if (pathname === "/api/story/voices") {
      sendJson(res, 200, { items: listStoryVoicesView(ctx2.root) }, headOnly);
      return;
    }
    if (pathname === "/api/story/assets") {
      sendJson(res, 200, { items: listStoryAssetsView(ctx2.root) }, headOnly);
      return;
    }
    if (pathname === "/api/shots") {
      if (storyEnabled(ctx2.root)) {
        sendJsonError(res, 410, "use_episode_api", "story \u6A21\u5F0F\u8BF7\u4F7F\u7528 /api/episodes/<id>/shots", headOnly);
        return;
      }
      sendJson(res, 200, buildShotsView(ctx2.root, ctx2.shots), headOnly);
      return;
    }
    if (pathname === "/api/artifacts") {
      sendJson(
        res,
        200,
        listArtifacts(ctx2.root, {
          label: url.searchParams.get("label") ?? void 0,
          status: url.searchParams.get("status") ?? void 0,
          kind: url.searchParams.get("kind") ?? void 0,
          search: url.searchParams.get("search") ?? void 0,
          episode: url.searchParams.get("episode") ?? void 0,
          limit: intQuery(url.searchParams.get("limit"), 200)
        }),
        headOnly
      );
      return;
    }
    if (pathname.startsWith("/api/runs/")) {
      const segments = pathname.split("/");
      if (segments.length !== 4) {
        sendJsonError(res, 404, "not_found", "\u63A5\u53E3\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      const runId = decodeSegment(segments[3] ?? "");
      if (runId === null) {
        sendJsonError(res, 400, "bad_request", "run id \u975E\u6CD5", headOnly);
        return;
      }
      const detail = getRunDetail(ctx2.root, runId);
      if (detail === null) {
        sendJsonError(res, 404, "not_found", `\u672A\u627E\u5230 run ${runId}`, headOnly);
        return;
      }
      sendJson(res, 200, detail, headOnly);
      return;
    }
    if (pathname === "/api/tasks") {
      sendJson(res, 200, listTasksView(ctx2.root, url.searchParams.get("episode") ?? void 0), headOnly);
      return;
    }
    if (pathname.startsWith("/api/tasks/")) {
      const segments = pathname.split("/");
      if (segments.length !== 4) {
        sendJsonError(res, 404, "not_found", "\u63A5\u53E3\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      const taskId = decodeSegment(segments[3] ?? "");
      if (taskId === null) {
        sendJsonError(res, 400, "bad_request", "task id \u975E\u6CD5", headOnly);
        return;
      }
      const detail = getTaskDetail(ctx2.root, taskId);
      if (detail === null) {
        sendJsonError(res, 404, "not_found", `\u672A\u627E\u5230 task ${taskId}`, headOnly);
        return;
      }
      sendJson(res, 200, detail, headOnly);
      return;
    }
    if (pathname === "/api/finals") {
      const episode = url.searchParams.get("episode") ?? void 0;
      if (episode === void 0 && storyEnabled(ctx2.root)) {
        const items = listEpisodeMetas(ctx2.root).flatMap((meta) => listFinals(ctx2.root, meta.id));
        sendJson(res, 200, items, headOnly);
        return;
      }
      sendJson(res, 200, listFinals(ctx2.root, episode), headOnly);
      return;
    }
    if (pathname === "/api/workflows") {
      sendJson(res, 200, listWorkflows(ctx2.root, ctx2.project), headOnly);
      return;
    }
    if (pathname.startsWith(`${MEDIA_PREFIX2}/run/`)) {
      const segments = pathname.split("/");
      if (segments.length !== 5) {
        sendJsonError(res, 404, "not_found", "\u5A92\u4F53\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      const runId = decodeSegment(segments[3] ?? "");
      const name = decodeSegment(segments[4] ?? "");
      if (runId === null || name === null) {
        sendJsonError(res, 400, "bad_request", "\u5A92\u4F53\u8DEF\u5F84\u975E\u6CD5", headOnly);
        return;
      }
      const target = resolveRunMedia(ctx2.root, runId, name);
      if (target === null) {
        sendJsonError(res, 404, "not_found", "\u5A92\u4F53\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      await serveMedia(req, res, target, url.searchParams.get("download") === "1");
      return;
    }
    if (pathname.startsWith(`${MEDIA_PREFIX2}/story/`)) {
      const segments = pathname.split("/").slice(3);
      const decoded = [];
      for (const segment of segments) {
        const value = decodeSegment(segment);
        if (value === null) {
          sendJsonError(res, 400, "bad_request", "\u5A92\u4F53\u8DEF\u5F84\u975E\u6CD5", headOnly);
          return;
        }
        decoded.push(value);
      }
      const target = resolveStoryMedia(ctx2.root, decoded.join("/"));
      if (target === null) {
        sendJsonError(res, 404, "not_found", "\u5A92\u4F53\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      await serveMedia(req, res, target, url.searchParams.get("download") === "1");
      return;
    }
    if (pathname.startsWith(`${MEDIA_PREFIX2}/final/`)) {
      const segments = pathname.split("/");
      if (segments.length === 5) {
        const episodeId = decodeSegment(segments[3] ?? "");
        const name2 = decodeSegment(segments[4] ?? "");
        if (episodeId === null || name2 === null) {
          sendJsonError(res, 400, "bad_request", "\u5A92\u4F53\u8DEF\u5F84\u975E\u6CD5", headOnly);
          return;
        }
        const target2 = resolveEpisodeFinalMedia(ctx2.root, episodeId, name2);
        if (target2 === null) {
          sendJsonError(res, 404, "not_found", "\u5A92\u4F53\u4E0D\u5B58\u5728", headOnly);
          return;
        }
        await serveMedia(req, res, target2, url.searchParams.get("download") === "1");
        return;
      }
      if (segments.length !== 4) {
        sendJsonError(res, 404, "not_found", "\u5A92\u4F53\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      const name = decodeSegment(segments[3] ?? "");
      if (name === null) {
        sendJsonError(res, 400, "bad_request", "\u5A92\u4F53\u8DEF\u5F84\u975E\u6CD5", headOnly);
        return;
      }
      const target = resolveFinalMedia(ctx2.root, name);
      if (target === null) {
        sendJsonError(res, 404, "not_found", "\u5A92\u4F53\u4E0D\u5B58\u5728", headOnly);
        return;
      }
      await serveMedia(req, res, target, url.searchParams.get("download") === "1");
      return;
    }
    if (pathname.startsWith(API_PREFIX) || pathname.startsWith(MEDIA_PREFIX2)) {
      sendJsonError(res, 404, "not_found", "\u63A5\u53E3\u4E0D\u5B58\u5728", headOnly);
      return;
    }
    sendText(res, 404, "Not Found", "text/plain; charset=utf-8", headOnly);
  } catch (e) {
    process.stderr.write(`[web] ${e instanceof Error ? e.stack ?? e.message : String(e)}
`);
    if (!res.headersSent) {
      sendJsonError(res, 500, "internal_error", "\u670D\u52A1\u5185\u90E8\u9519\u8BEF", req.method === "HEAD");
    } else {
      res.destroy();
    }
  }
}
async function startWebServer(options) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? 0;
  const cache = { at: 0, data: null };
  const ctx2 = {
    root: options.root,
    project: options.project,
    machine: options.machine,
    shots: options.shots,
    commands: options.commands ?? [],
    assets: options.assets,
    host,
    port
  };
  const server = createServer2((req, res) => {
    void handleRequest(req, res, ctx2, cache);
  });
  let resolveClosed = null;
  const closed = new Promise((resolve8) => {
    resolveClosed = resolve8;
  });
  server.once("close", () => {
    resolveClosed?.();
  });
  await new Promise((resolve8, reject) => {
    const onListening = () => {
      server.off("error", onError);
      resolve8();
    };
    const onError = (e) => {
      server.off("listening", onListening);
      reject(e);
    };
    server.once("listening", onListening);
    server.once("error", onError);
    server.listen(port, host);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise((resolve8) => server.close(() => resolve8()));
    throw new Error("\u65E0\u6CD5\u83B7\u53D6 Web \u670D\u52A1\u76D1\u542C\u5730\u5740");
  }
  const actualPort = address.port;
  ctx2.port = actualPort;
  const urlHost = displayHost(host);
  const url = `http://${urlHost}:${actualPort}`;
  let closePromise = null;
  function close() {
    if (closePromise !== null) return closePromise;
    closePromise = new Promise((resolve8) => {
      if (!server.listening) {
        resolveClosed?.();
        resolve8();
        return;
      }
      server.close(() => {
        resolveClosed?.();
        resolve8();
      });
      server.closeAllConnections();
    });
    return closePromise;
  }
  return {
    url,
    host,
    port: actualPort,
    close,
    closed
  };
}
var DEFAULT_HOST, OVERVIEW_CACHE_MS, ASSET_CACHE_SECONDS, URL_BASE, ALLOWED_METHODS, API_PREFIX, MEDIA_PREFIX2, CONTENT_SECURITY_POLICY;
var init_server = __esm({
  "src/core/web/server.mts"() {
    "use strict";
    init_json();
    init_version();
    init_data();
    init_media();
    init_story_data();
    init_paths();
    DEFAULT_HOST = "127.0.0.1";
    OVERVIEW_CACHE_MS = 2e3;
    ASSET_CACHE_SECONDS = 300;
    URL_BASE = "http://127.0.0.1";
    ALLOWED_METHODS = "GET, HEAD";
    API_PREFIX = "/api";
    MEDIA_PREFIX2 = "/media";
    CONTENT_SECURITY_POLICY = [
      "default-src 'self'",
      "img-src 'self' data:",
      "media-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "font-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'"
    ].join("; ");
  }
});

// src/core/web/ui/index.html
var ui_default;
var init_ui = __esm({
  "src/core/web/ui/index.html"() {
    ui_default = '<!doctype html>\n<html lang="zh-CN">\n    <head>\n        <meta charset="utf-8" />\n        <meta name="viewport" content="width=device-width, initial-scale=1" />\n        <meta name="color-scheme" content="light dark" />\n        <title>daoyan web</title>\n        <link rel="stylesheet" href="/assets/style.css" />\n    </head>\n    <body>\n        <div id="app"></div>\n        <div id="modal" class="modal" hidden>\n            <div class="modal-backdrop" data-modal-close="1"></div>\n            <section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">\n                <header class="modal-head">\n                    <div class="modal-heading">\n                        <p class="eyebrow">\u4EA7\u51FA\u7269\u9884\u89C8</p>\n                        <h2 id="modal-title">\u9884\u89C8</h2>\n                    </div>\n                    <button id="modal-close" class="icon-button" type="button" aria-label="\u5173\u95ED">\xD7</button>\n                </header>\n                <div id="modal-content" class="modal-content"></div>\n                <footer class="modal-foot">\n                    <button id="modal-prev" class="button ghost" type="button">\u4E0A\u4E00\u4E2A</button>\n                    <span id="modal-counter" class="muted"></span>\n                    <button id="modal-next" class="button ghost" type="button">\u4E0B\u4E00\u4E2A</button>\n                </footer>\n            </section>\n        </div>\n        <div id="toast" class="toast" role="status" hidden></div>\n        <script src="/assets/app.js" defer></script>\n    </body>\n</html>\n';
  }
});

// src/core/web/ui/app.client
var app_default;
var init_app = __esm({
  "src/core/web/ui/app.client"() {
    app_default = '/* daoyan web \u5BA2\u6237\u7AEF \u2014\u2014 \u539F\u751F JS \u5355\u9875\u5E94\u7528\uFF0C\u65E0\u6784\u5EFA\u4F9D\u8D56\u3002\n * \u6240\u6709\u6570\u636E\u6765\u81EA\u540C\u6E90\u53EA\u8BFB API\uFF1BDOM \u6587\u672C\u7EDF\u4E00\u7528 textContent\uFF0C\u907F\u514D\u63D0\u793A\u8BCD\u7B49\u5B57\u6BB5\u6CE8\u5165 HTML\u3002 */\n\n// \u9875\u9762\u89C6\u56FE\nconst VIEWS = [\n    { id: "overview", label: "\u6982\u89C8", hint: "\u9879\u76EE\u4E0E\u5267\u96C6\u72B6\u6001" },\n    { id: "characters", label: "\u89D2\u8272", hint: "\u89D2\u8272\u3001\u5F62\u6001\u4E0E\u53C2\u8003\u56FE" },\n    { id: "scenes", label: "\u573A\u666F", hint: "\u573A\u666F\u4E0E\u53C2\u8003\u56FE" },\n    { id: "voices", label: "\u97F3\u8272", hint: "\u97F3\u8272\u4E0E\u53C2\u8003\u97F3\u9891" },\n    { id: "assets", label: "\u8BBE\u5B9A\u8D44\u4EA7", hint: "\u5168\u90E8\u53C2\u8003\u8D44\u4EA7" },\n    { id: "shots", label: "\u5206\u955C", hint: "\u955C\u5934\u8FDB\u5EA6\u4E0E\u63D0\u793A\u8BCD" },\n    { id: "artifacts", label: "\u4EA7\u51FA\u7269", hint: "\u64AD\u653E\u4E0E\u4E0B\u8F7D" },\n    { id: "tasks", label: "\u4EFB\u52A1", hint: "\u4EFB\u52A1\u4E0E\u4E8B\u4EF6" },\n    { id: "finals", label: "\u6210\u7247", hint: "\u5408\u7247\u7ED3\u679C" },\n    { id: "workflows", label: "\u5DE5\u4F5C\u6D41", hint: "\u56FE\u4E0E bindings" },\n];\n// \u5408\u6CD5\u89C6\u56FE\u96C6\u5408\uFF08\u5267\u96C6\u8BE6\u60C5\u7531 hash \u7684 episode/<id> \u5355\u72EC\u89E3\u6790\uFF09\nconst VIEW_IDS = new Set(VIEWS.map((view) => view.id));\n// \u9ED8\u8BA4\u89C6\u56FE\nconst DEFAULT_VIEW = "overview";\n// \u63A5\u53E3\u8DEF\u5F84\nconst API = {\n    overview: "/api/overview",\n    characters: "/api/story/characters",\n    scenes: "/api/story/scenes",\n    voices: "/api/story/voices",\n    assets: "/api/story/assets",\n    shots: "/api/shots",\n    artifacts: "/api/artifacts?limit=500",\n    tasks: "/api/tasks",\n    finals: "/api/finals",\n    workflows: "/api/workflows",\n};\n// \u5404\u89C6\u56FE\u8F6E\u8BE2\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09\nconst POLL_MS = {\n    overview: 3000,\n    characters: 10000,\n    scenes: 10000,\n    voices: 10000,\n    assets: 10000,\n    episode: 4000,\n    shots: 5000,\n    artifacts: 5000,\n    tasks: 3000,\n    finals: 8000,\n    workflows: 15000,\n};\n// \u72B6\u6001\u6587\u6848\nconst STATUS_LABEL = {\n    queued: "\u6392\u961F",\n    running: "\u8FD0\u884C\u4E2D",\n    succeeded: "\u6210\u529F",\n    failed: "\u5931\u8D25",\n    cancelled: "\u5DF2\u53D6\u6D88",\n    interrupted: "\u5DF2\u4E2D\u65AD",\n    held: "\u6301\u6709",\n    stale: "\u9648\u65E7",\n    absent: "\u7A7A\u95F2",\n    corrupt: "\u635F\u574F",\n};\n// \u4EA7\u7269\u7C7B\u578B\u6587\u6848\nconst KIND_LABEL = {\n    video: "\u89C6\u9891",\n    image: "\u56FE\u7247",\n    audio: "\u97F3\u9891",\n    json: "JSON",\n    text: "\u6587\u672C",\n    other: "\u6587\u4EF6",\n};\n// \u4EA7\u7269\u7C7B\u578B\u56FE\u6807\nconst KIND_ICON = {\n    video: "\u25B6",\n    image: "\u25A7",\n    audio: "\u266A",\n    json: "{}",\n    text: "TXT",\n    other: "\u2193",\n};\n// \u5267\u60C5\u9636\u6BB5\u6587\u6848\nconst STAGE_LABEL = {\n    script: "\u5267\u672C",\n    breakdown: "\u62C6\u89E3",\n    assets: "\u8BBE\u5B9A\u8D44\u4EA7",\n    storyboard: "\u5206\u955C",\n    workflow: "\u5DE5\u4F5C\u6D41",\n    ready: "\u53EF\u62CD\u6444",\n    wrapped: "\u5DF2\u5408\u7247",\n};\n// \u4EFB\u52A1\u7C7B\u578B\u6587\u6848\nconst TASK_KIND_LABEL = {\n    run: "\u5355\u6B21",\n    shot: "\u955C\u5934",\n    retake: "\u91CD\u62CD",\n    batch: "\u6279\u91CF",\n    metadata: "\u5143\u6570\u636E",\n};\n// \u6700\u5927\u64AD\u653E\u5217\u8868\u957F\u5EA6\nconst MAX_PLAYLIST = 200;\n// \u6587\u672C\u9884\u89C8\u4E0A\u9650\nconst TEXT_PREVIEW_LIMIT = 200_000;\n// \u4EFB\u52A1\u8BE6\u60C5\u7F13\u5B58\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF09\nconst TASK_DETAIL_CACHE_MS = 2000;\n// \u65F6\u95F4\u683C\u5F0F\u5668\nconst TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {\n    year: "numeric",\n    month: "2-digit",\n    day: "2-digit",\n    hour: "2-digit",\n    minute: "2-digit",\n    second: "2-digit",\n    hour12: false,\n});\n// \u5B57\u8282\u5355\u4F4D\nconst BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];\n// hash \u524D\u7F00\nconst HASH_PREFIX = "#/";\n// \u53EF\u64AD\u653E\u7C7B\u578B\nconst PLAYABLE_KINDS = new Set(["video", "audio"]);\n// \u53EF\u9884\u89C8\u7C7B\u578B\nconst PREVIEW_KINDS = new Set(["video", "audio", "image", "json", "text"]);\n\n// \u5E94\u7528\u6839\u8282\u70B9\nconst appRoot = document.querySelector("#app");\n// \u6A21\u6001\u6846\u6839\u8282\u70B9\nconst modalRoot = document.querySelector("#modal");\n// \u6A21\u6001\u6807\u9898\nconst modalTitle = document.querySelector("#modal-title");\n// \u6A21\u6001\u5185\u5BB9\nconst modalContent = document.querySelector("#modal-content");\n// \u6A21\u6001\u8BA1\u6570\nconst modalCounter = document.querySelector("#modal-counter");\n// \u4E0A\u4E00\u4E2A\u6309\u94AE\nconst modalPrev = document.querySelector("#modal-prev");\n// \u4E0B\u4E00\u4E2A\u6309\u94AE\nconst modalNext = document.querySelector("#modal-next");\n// \u5173\u95ED\u6309\u94AE\nconst modalClose = document.querySelector("#modal-close");\n// Toast \u6839\u8282\u70B9\nconst toastRoot = document.querySelector("#toast");\n\n// \u5F53\u524D\u89C6\u56FE\nlet currentView = DEFAULT_VIEW;\n// \u5F53\u524D\u5267\u96C6 id\nlet currentEpisodeId = null;\n// \u5F53\u524D\u89C6\u56FE\u662F\u5426\u5DF2\u6210\u529F\u52A0\u8F7D\nlet loaded = false;\n// \u4E0A\u6B21\u6E32\u67D3\u7684\u6570\u636E\u7B7E\u540D\uFF08\u907F\u514D\u8F6E\u8BE2\u91CD\u590D\u91CD\u5EFA DOM\uFF09\nlet lastSignature = "";\n// \u5F53\u524D\u8BF7\u6C42\u63A7\u5236\u5668\nlet requestController = null;\n// \u8F6E\u8BE2\u5B9A\u65F6\u5668\nlet pollTimer = null;\n// \u5F53\u524D\u4EA7\u7269\u7B5B\u9009\nlet artifactFilters = { label: "", status: "", kind: "", search: "" };\n// \u5F53\u524D\u5206\u955C\u7B5B\u9009\nlet shotFilters = { character: "", scene: "", status: "", search: "" };\n// \u5F53\u524D\u5C55\u5F00\u7684 task id\nlet openTaskId = null;\n// \u4EFB\u52A1\u8BE6\u60C5\u7F13\u5B58\nconst taskDetailCache = new Map();\n// \u64AD\u653E\u5217\u8868\nlet playerItems = [];\n// \u64AD\u653E\u7D22\u5F15\nlet playerIndex = 0;\n// Toast \u5B9A\u65F6\u5668\nlet toastTimer = null;\n// \u6700\u540E\u66F4\u65B0\u65F6\u95F4\nlet lastUpdatedAt = "";\n\n// \u4FA7\u8FB9\u5BFC\u822A\u5BB9\u5668\nlet navRoot = null;\n// \u4E3B\u5185\u5BB9\u5BB9\u5668\nlet viewRoot = null;\n// \u9879\u76EE\u540D\u5143\u7D20\nlet projectNameEl = null;\n// \u6A21\u5F0F\u5143\u7D20\nlet modeEl = null;\n// \u8FDE\u63A5\u72B6\u6001\u5143\u7D20\nlet connectionEl = null;\n// \u66F4\u65B0\u65F6\u95F4\u5143\u7D20\nlet updatedEl = null;\n\n/**\n * \u521B\u5EFA\u5143\u7D20\u5E76\u8BBE\u7F6E\u6587\u672C\u3002\n */\nfunction createElement(tag, className, text) {\n    // \u65B0\u5143\u7D20\n    const node = document.createElement(tag);\n    if (className !== undefined && className !== "") node.className = className;\n    if (text !== undefined && text !== null) node.textContent = String(text);\n    return node;\n}\n\n/**\n * \u6E05\u7A7A\u5B50\u8282\u70B9\u3002\n */\nfunction clearNode(node) {\n    while (node.firstChild !== null) node.removeChild(node.firstChild);\n}\n\n/**\n * \u683C\u5F0F\u5316\u5B57\u8282\u3002\n */\nfunction formatBytes(bytes) {\n    // \u515C\u5E95\u6570\u503C\n    const value = Number(bytes);\n    if (!Number.isFinite(value) || value <= 0) return "0 B";\n    // \u5355\u4F4D\u6307\u6570\n    let index = 0;\n    // \u5F53\u524D\u6570\u503C\n    let current = value;\n    while (current >= 1024 && index < BYTE_UNITS.length - 1) {\n        current /= 1024;\n        index += 1;\n    }\n    // \u5C0F\u6570\u4F4D\n    const digits = index === 0 ? 0 : current >= 10 ? 1 : 2;\n    return `${current.toFixed(digits)} ${BYTE_UNITS[index]}`;\n}\n\n/**\n * \u683C\u5F0F\u5316\u65F6\u95F4\u3002\n */\nfunction formatTime(iso) {\n    if (typeof iso !== "string" || iso === "") return "\u2014";\n    // \u65F6\u95F4\u5BF9\u8C61\n    const date = new Date(iso);\n    if (Number.isNaN(date.getTime())) return "\u2014";\n    return TIME_FORMATTER.format(date);\n}\n\n/**\n * \u683C\u5F0F\u5316\u8017\u65F6\u3002\n */\nfunction formatDuration(ms) {\n    // \u6BEB\u79D2\u503C\n    const value = Number(ms);\n    if (!Number.isFinite(value) || value <= 0) return "0 \u79D2";\n    if (value < 1000) return `${Math.round(value)} \u6BEB\u79D2`;\n    // \u79D2\n    const seconds = Math.round(value / 1000);\n    if (seconds < 60) return `${seconds} \u79D2`;\n    // \u5206\u949F/\u79D2\n    const minutes = Math.floor(seconds / 60);\n    // \u4F59\u6570\u79D2\n    const rest = seconds % 60;\n    return rest === 0 ? `${minutes} \u5206` : `${minutes} \u5206 ${rest} \u79D2`;\n}\n\n/**\n * \u77ED id\u3002\n */\nfunction shortId(id) {\n    if (typeof id !== "string") return "\u2014";\n    return id.length > 20 ? `${id.slice(0, 20)}\u2026` : id;\n}\n\n/**\n * \u6587\u672C\u515C\u5E95\u3002\n */\nfunction textOrDash(value) {\n    if (value === undefined || value === null || value === "") return "\u2014";\n    return String(value);\n}\n\n/**\n * \u901A\u7528\u5FBD\u6807\u3002\n */\nfunction badge(text, className) {\n    return createElement("span", `badge ${className ?? ""}`.trim(), text);\n}\n\n/**\n * \u72B6\u6001\u5FBD\u6807\u3002\n */\nfunction statusBadge(status, text) {\n    // \u72B6\u6001\u952E\n    const key = typeof status === "string" && status !== "" ? status : "queued";\n    return badge(text ?? STATUS_LABEL[key] ?? key, `status-${key}`);\n}\n\n/**\n * \u7C7B\u578B\u5FBD\u6807\u3002\n */\nfunction kindBadge(kind) {\n    // \u7C7B\u578B\u952E\n    const key = typeof kind === "string" && kind !== "" ? kind : "other";\n    return badge(KIND_LABEL[key] ?? key, `kind-${key}`);\n}\n\n/**\n * \u8FFD\u52A0\u952E\u503C\u884C\u3002\n */\nfunction appendKv(dl, key, value) {\n    dl.append(createElement("dt", "", key));\n    dl.append(createElement("dd", "", textOrDash(value)));\n}\n\n/**\n * \u4EBA\u7269 / \u573A\u666F\u53BB\u91CD\u952E\u3002\n */\nfunction entityKey(entity) {\n    return entity.id !== null && entity.id !== undefined ? `id:${entity.id}` : `name:${entity.name}`;\n}\n\n/**\n * \u683C\u5F0F\u5316\u79D2\u6570\u3002\n */\nfunction formatSeconds(seconds) {\n    // \u6570\u503C\u515C\u5E95\n    const value = Number(seconds);\n    if (!Number.isFinite(value) || value < 0) return "\u2014";\n    if (value < 60) return Number.isInteger(value) ? `${value} \u79D2` : `${value.toFixed(1)} \u79D2`;\n    // \u5206\u949F\u4E0E\u4F59\u79D2\n    const minutes = Math.floor(value / 60);\n    const rest = Math.round(value % 60);\n    return rest === 0 ? `${minutes} \u5206` : `${minutes} \u5206 ${rest} \u79D2`;\n}\n\n/**\n * \u4EBA\u7269 / \u573A\u666F chip\u3002\n */\nfunction entityChip(entity, className) {\n    // chip\n    const chip = createElement("span", `chip ${className ?? ""}`.trim(), entity.name);\n    if (entity.description) chip.title = entity.description;\n    return chip;\n}\n\n/**\n * \u4E00\u7EC4\u4EBA\u7269 / \u573A\u666F chip\u3002\n */\nfunction entityChips(entities, className) {\n    // chip \u5BB9\u5668\n    const row = createElement("div", "chip-row");\n    if (!Array.isArray(entities) || entities.length === 0) {\n        row.append(createElement("span", "muted", "\u672A\u6807\u6CE8"));\n        return row;\n    }\n    for (const entity of entities) row.append(entityChip(entity, className));\n    return row;\n}\n\n/**\n * \u5206\u955C\u72B6\u6001\u5FBD\u6807\u3002\n */\nfunction shotStatusBadge(shot) {\n    if (shot.done === true) return statusBadge("succeeded", "\u5DF2\u5B8C\u6210");\n    if (shot.latest_status === "failed") return statusBadge("failed");\n    if (shot.latest_status === "running" || shot.latest_status === "queued") {\n        return statusBadge(shot.latest_status);\n    }\n    return statusBadge("queued", "\u672A\u5B8C\u6210");\n}\n\n/**\n * \u8BF7\u6C42 JSON \u5E76\u89E3\u5305\u4FE1\u5C01\u3002\n */\nasync function requestJson(path, signal) {\n    // \u54CD\u5E94\n    const response = await fetch(path, { headers: { Accept: "application/json" }, signal });\n    // \u54CD\u5E94\u4F53\n    const payload = await response.json();\n    if (payload.ok !== true) {\n        throw new Error(payload.error !== undefined ? payload.error.message : `\u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${response.status}\uFF09`);\n    }\n    return payload.data;\n}\n\n/**\n * \u5F53\u524D\u89C6\u56FE\u8BF7\u6C42\uFF08\u53EF\u88AB\u4E0B\u4E00\u6B21\u5BFC\u822A\u4E2D\u6B62\uFF09\u3002\n */\nasync function fetchJson(path) {\n    // \u8BF7\u6C42\u63A7\u5236\u5668\n    const controller = new AbortController();\n    requestController = controller;\n    try {\n        return await requestJson(path, controller.signal);\n    } finally {\n        if (requestController === controller) requestController = null;\n    }\n}\n\n/**\n * \u6E32\u67D3\u9875\u9762\u9AA8\u67B6\u3002\n */\nfunction renderShell() {\n    appRoot.innerHTML = `\n        <div class="app-shell">\n            <aside class="sidebar">\n                <div class="brand">\n                    <div class="brand-mark"><span class="brand-dot"></span>daoyan web</div>\n                    <p class="brand-sub">\u4E34\u65F6\u53EA\u8BFB\u9879\u76EE\u67E5\u770B\u5668</p>\n                </div>\n                <nav id="nav" class="nav" aria-label="\u9875\u9762\u5BFC\u822A"></nav>\n                <div class="sidebar-foot">\n                    <code>Ctrl+C</code> \u505C\u6B62\u670D\u52A1<br />\n                    \u6570\u636E\u6765\u81EA\u5F53\u524D\u9879\u76EE\u76EE\u5F55\uFF0C\u53EA\u8BFB\u3002\n                </div>\n            </aside>\n            <main class="main">\n                <header class="topbar">\n                    <div class="topbar-left">\n                        <h1 id="project-name" class="project-name">\u9879\u76EE</h1>\n                        <span id="project-mode" class="project-mode">\u2014</span>\n                    </div>\n                    <div class="topbar-right">\n                        <span id="connection" class="connection">\n                            <span class="connection-dot"></span>\n                            <span id="connection-text">\u8FDE\u63A5\u4E2D</span>\n                        </span>\n                        <span id="updated-at" class="muted">\u2014</span>\n                    </div>\n                </header>\n                <section id="view" class="content" aria-live="polite"></section>\n            </main>\n        </div>\n    `;\n    navRoot = document.querySelector("#nav");\n    viewRoot = document.querySelector("#view");\n    projectNameEl = document.querySelector("#project-name");\n    modeEl = document.querySelector("#project-mode");\n    connectionEl = document.querySelector("#connection");\n    updatedEl = document.querySelector("#updated-at");\n}\n\n/**\n * \u6E32\u67D3\u5BFC\u822A\u3002\n */\nfunction renderNav() {\n    clearNode(navRoot);\n    for (const view of VIEWS) {\n        // \u5BFC\u822A\u6309\u94AE\n        const button = createElement("button", "nav-item");\n        button.type = "button";\n        button.dataset.view = view.id;\n        button.append(createElement("span", "nav-label", view.label));\n        button.append(createElement("span", "nav-hint", view.hint));\n        button.addEventListener("click", () => {\n            window.location.hash = `${HASH_PREFIX}${view.id}`;\n        });\n        navRoot.append(button);\n    }\n}\n\n/**\n * \u9AD8\u4EAE\u5F53\u524D\u5BFC\u822A\u3002\n */\nfunction setActiveNav() {\n    if (navRoot === null) return;\n    // \u5267\u96C6\u8BE6\u60C5\u5F52\u5C5E\u6982\u89C8\n    const activeView = currentView === "episode" ? "overview" : currentView;\n    for (const button of navRoot.querySelectorAll(".nav-item")) {\n        button.classList.toggle("active", button.dataset.view === activeView);\n    }\n}\n\n/**\n * \u66F4\u65B0\u8FDE\u63A5\u72B6\u6001\u3002\n */\nfunction setConnection(state, text) {\n    if (connectionEl === null) return;\n    connectionEl.classList.remove("ok", "error");\n    if (state === "ok") connectionEl.classList.add("ok");\n    if (state === "error") connectionEl.classList.add("error");\n    // \u72B6\u6001\u6587\u672C\n    const textEl = connectionEl.querySelector("#connection-text");\n    if (textEl !== null) textEl.textContent = text;\n}\n\n/**\n * \u52A0\u8F7D\u9876\u680F\u9879\u76EE\u4FE1\u606F\uFF08\u4E0D\u63A2\u6D4B\u5F15\u64CE\uFF09\u3002\n */\nasync function loadHeader() {\n    try {\n        // \u5065\u5EB7\u68C0\u67E5\u6570\u636E\n        const data = await requestJson("/api/health");\n        if (projectNameEl !== null && typeof data.project === "string") projectNameEl.textContent = data.project;\n        if (modeEl !== null) modeEl.textContent = data.mode === null ? "\u672A\u7ED1\u5B9A\u672C\u673A" : data.mode;\n    } catch {\n        // \u9876\u680F\u5931\u8D25\u4E0D\u5F71\u54CD\u9875\u9762\u4E3B\u4F53\n    }\n}\n\n/**\n * \u66F4\u65B0\u9876\u680F\u9879\u76EE\u4FE1\u606F\u3002\n */\nfunction updateHeader(data) {\n    if (projectNameEl !== null && data !== null && data.project !== undefined && data.project.name !== undefined) {\n        projectNameEl.textContent = data.project.name;\n    }\n    if (modeEl !== null && data !== null && data.mode !== undefined) {\n        modeEl.textContent = data.mode === null ? "\u672A\u7ED1\u5B9A\u672C\u673A" : data.mode;\n    }\n    if (updatedEl !== null) {\n        updatedEl.textContent = lastUpdatedAt === "" ? "\u2014" : `\u66F4\u65B0\u4E8E ${formatTime(lastUpdatedAt)}`;\n    }\n}\n\n/**\n * \u663E\u793A\u9519\u8BEF\u6761\u3002\n */\nfunction showError(message) {\n    if (viewRoot === null) return;\n    // \u73B0\u6709\u9519\u8BEF\u6761\n    let banner = viewRoot.querySelector(".error-banner");\n    if (banner === null) {\n        banner = createElement("div", "error-banner");\n        viewRoot.prepend(banner);\n    }\n    banner.textContent = message;\n}\n\n/**\n * \u6E05\u9664\u9519\u8BEF\u6761\u3002\n */\nfunction clearError() {\n    if (viewRoot === null) return;\n    // \u73B0\u6709\u9519\u8BEF\u6761\n    const banner = viewRoot.querySelector(".error-banner");\n    if (banner !== null) banner.remove();\n}\n\n/**\n * \u663E\u793A Toast\u3002\n */\nfunction showToast(message, isError) {\n    toastRoot.textContent = message;\n    toastRoot.classList.toggle("error", isError === true);\n    toastRoot.hidden = false;\n    if (toastTimer !== null) window.clearTimeout(toastTimer);\n    toastTimer = window.setTimeout(() => {\n        toastRoot.hidden = true;\n    }, 2600);\n}\n\n/**\n * \u7A7A\u72B6\u6001\u8282\u70B9\u3002\n */\nfunction emptyNode(title, body) {\n    // \u5BB9\u5668\n    const box = createElement("div", "empty");\n    box.append(createElement("p", "empty-title", title));\n    box.append(createElement("p", "empty-body", body));\n    return box;\n}\n\n/**\n * \u52A0\u8F7D\u72B6\u6001\u3002\n */\nfunction renderLoading() {\n    if (viewRoot === null) return;\n    clearNode(viewRoot);\n    // \u52A0\u8F7D\u5BB9\u5668\n    const box = createElement("div", "loading");\n    box.append(createElement("span", "spinner"));\n    box.append(createElement("span", "", "\u52A0\u8F7D\u4E2D\u2026"));\n    viewRoot.append(box);\n}\n\n/**\n * \u8BA1\u7B97\u7528\u4E8E\u8DF3\u8FC7\u91CD\u590D\u6E32\u67D3\u7684\u6570\u636E\u7B7E\u540D\uFF08\u5FFD\u7565\u6982\u89C8\u7684\u751F\u6210\u65F6\u95F4\uFF09\u3002\n */\nfunction signatureOf(data) {\n    if (data !== null && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "generated_at")) {\n        // \u53BB\u6389\u65F6\u95F4\u6233\u540E\u7684\u526F\u672C\n        const copy = { ...data };\n        delete copy.generated_at;\n        return JSON.stringify(copy);\n    }\n    return JSON.stringify(data);\n}\n\n/**\n * \u52A0\u8F7D\u5F53\u524D\u89C6\u56FE\u3002\n */\nasync function loadCurrent() {\n    if (requestController !== null) requestController.abort();\n    // \u76EE\u6807\u89C6\u56FE\n    const view = currentView;\n    if (!loaded) renderLoading();\n    try {\n        // \u63A5\u53E3\u6570\u636E\n        const path =\n            view === "episode" && currentEpisodeId !== null\n                ? `/api/episodes/${encodeURIComponent(currentEpisodeId)}`\n                : API[view];\n        const data = await fetchJson(path);\n        if (view !== currentView) return;\n        // \u6570\u636E\u7B7E\u540D\uFF08\u7A33\u5B9A\u9875\u9762\u4E0D\u91CD\u590D\u91CD\u5EFA DOM\uFF09\n        const signature = signatureOf(data);\n        lastUpdatedAt = new Date().toISOString();\n        updateHeader(data);\n        setConnection("ok", "\u5DF2\u8FDE\u63A5");\n        if (loaded && signature === lastSignature) return;\n        loaded = true;\n        lastSignature = signature;\n        renderView(view, data);\n    } catch (error) {\n        if (error !== null && error !== undefined && error.name === "AbortError") return;\n        setConnection("error", "\u8FDE\u63A5\u5931\u8D25");\n        if (!loaded) {\n            clearNode(viewRoot);\n            viewRoot.append(emptyNode("\u65E0\u6CD5\u52A0\u8F7D", "\u8BF7\u786E\u8BA4\u670D\u52A1\u4ECD\u5728\u8FD0\u884C\uFF0C\u6216\u5237\u65B0\u9875\u9762\u91CD\u8BD5\u3002"));\n        }\n        showError(error instanceof Error ? error.message : "\u52A0\u8F7D\u5931\u8D25");\n    }\n}\n\n/**\n * \u5207\u6362\u89C6\u56FE\u3002\n */\nfunction onHashChange() {\n    // \u539F\u59CB hash\n    const raw = window.location.hash.replace(/^#\\/?/, "");\n    // \u8DEF\u5F84\u6BB5\n    const parts = raw.split("/");\n    // \u76EE\u6807\u89C6\u56FE / \u5267\u96C6\n    let view = DEFAULT_VIEW;\n    let episodeId = null;\n    if (parts[0] === "episode" && parts[1] !== undefined && parts[1] !== "") {\n        try {\n            episodeId = decodeURIComponent(parts[1]);\n            view = "episode";\n        } catch {\n            view = DEFAULT_VIEW;\n        }\n    } else {\n        view = VIEW_IDS.has(raw) ? raw : DEFAULT_VIEW;\n    }\n    currentView = view;\n    currentEpisodeId = episodeId;\n    loaded = false;\n    lastSignature = "";\n    openTaskId = null;\n    setActiveNav();\n    renderLoading();\n    void loadCurrent();\n    schedulePoll();\n}\n\n/**\n * \u5B89\u6392\u8F6E\u8BE2\u3002\n */\nfunction schedulePoll() {\n    if (pollTimer !== null) window.clearInterval(pollTimer);\n    // \u5F53\u524D\u95F4\u9694\n    const interval = POLL_MS[currentView] ?? 5000;\n    pollTimer = window.setInterval(() => {\n        if (document.hidden) return;\n        void loadCurrent();\n    }, interval);\n}\n\n/**\n * \u5206\u53D1\u89C6\u56FE\u6E32\u67D3\u3002\n */\nfunction renderView(view, data) {\n    if (viewRoot === null) return;\n    clearNode(viewRoot);\n    if (view === "overview") renderOverview(data);\n    else if (view === "episode") renderEpisode(data);\n    else if (view === "characters") renderCharacters(data);\n    else if (view === "scenes") renderScenes(data);\n    else if (view === "voices") renderVoices(data);\n    else if (view === "assets") renderAssets(data);\n    else if (view === "shots") renderShots(data);\n    else if (view === "artifacts") renderArtifacts(data);\n    else if (view === "tasks") renderTasks(data);\n    else if (view === "finals") renderFinals(data);\n    else if (view === "workflows") renderWorkflows(data);\n    clearError();\n}\n\n/**\n * \u72B6\u6001\u5361\u7247\u3002\n */\nfunction statCard(label, value, hint) {\n    // \u5361\u7247\n    const card = createElement("div", "stat-card");\n    card.append(createElement("p", "stat-label", label));\n    card.append(createElement("p", "stat-value", value));\n    if (hint !== undefined) card.append(createElement("p", "stat-hint", hint));\n    return card;\n}\n\n/**\n * story \u6A21\u5F0F\u9690\u85CF legacy \u5206\u955C\u5165\u53E3\u3002\n */\nfunction hideLegacyShotsNav() {\n    if (navRoot === null) return;\n    // \u5206\u955C\u5BFC\u822A\n    const button = navRoot.querySelector(\'.nav-item[data-view="shots"]\');\n    if (button !== null) button.remove();\n}\n\n/**\n * \u5267\u60C5\u9636\u6BB5\u5FBD\u6807\u3002\n */\nfunction stageBadge(stage) {\n    return badge(STAGE_LABEL[stage] ?? stage, `stage-${stage}`);\n}\n\n/**\n * \u8D44\u4EA7\u7F29\u7565 / \u64AD\u653E\u8282\u70B9\u3002\n */\nfunction assetNode(asset, compact) {\n    // \u5BB9\u5668\n    const box = createElement("div", compact === true ? "asset-compact" : "asset-tile");\n    if (asset === null || asset === undefined) {\n        box.append(createElement("span", "muted", "\u65E0\u8D44\u4EA7"));\n        return box;\n    }\n    if (asset.present !== true || asset.lfs_pointer === true) {\n        box.append(createElement("span", "asset-missing", asset.lfs_pointer === true ? "LFS \u672A\u62C9\u53D6" : "\u6587\u4EF6\u7F3A\u5931"));\n        return box;\n    }\n    if (asset.kind === "image") {\n        // \u56FE\u7247\n        const img = document.createElement("img");\n        img.src = asset.media_url;\n        img.alt = asset.path;\n        img.loading = "lazy";\n        box.append(img);\n    } else if (asset.kind === "audio") {\n        // \u97F3\u9891\n        const audio = document.createElement("audio");\n        audio.controls = true;\n        audio.preload = "metadata";\n        audio.src = asset.media_url;\n        box.append(audio);\n    } else {\n        box.append(createElement("span", "preview-icon", KIND_ICON[asset.kind] ?? "\u2193"));\n    }\n    box.append(createElement("span", "asset-name mono", asset.path));\n    return box;\n}\n\n/**\n * \u7CFB\u5217\u6982\u89C8\u3002\n */\nfunction renderStorySeries(story) {\n    hideLegacyShotsNav();\n    // \u533A\u5757\u5934\n    const head = createElement("div", "section-head");\n    head.append(createElement("h3", "section-title", "\u5267\u96C6"));\n    head.append(createElement("span", "section-meta", `${story.series.episodes_total} \u96C6`));\n    viewRoot.append(head);\n    // \u5267\u96C6\u7F51\u683C\n    const grid = createElement("div", "grid");\n    for (const episode of story.episodes) {\n        // \u5361\u7247\n        const card = createElement("article", "card episode-card");\n        // \u5185\u5BB9\n        const body = createElement("div", "card-body");\n        body.append(createElement("p", "eyebrow", `\u7B2C ${episode.number} \u96C6`));\n        body.append(createElement("h3", "card-title", episode.title));\n        // \u5143\u4FE1\u606F\n        const meta = createElement("div", "card-meta");\n        meta.append(stageBadge(episode.stage));\n        meta.append(createElement("span", "", `\u5267\u672C r${episode.script.revision} \xB7 ${episode.script.status}`));\n        if (episode.blockers.length > 0) {\n            meta.append(createElement("span", "text-warn", `${episode.blockers.length} \u9879\u963B\u65AD`));\n        }\n        body.append(meta);\n        // \u963B\u65AD\u6458\u8981\n        if (episode.blockers.length > 0) {\n            const list = createElement("ul", "mini-list");\n            for (const blocker of episode.blockers.slice(0, 3)) {\n                list.append(createElement("li", "", blocker.message));\n            }\n            body.append(list);\n        }\n        // \u64CD\u4F5C\n        const actions = createElement("div", "card-actions");\n        const open = createElement("button", "button", "\u67E5\u770B\u5267\u96C6");\n        open.type = "button";\n        open.addEventListener("click", () => {\n            window.location.hash = `${HASH_PREFIX}episode/${encodeURIComponent(episode.id)}`;\n        });\n        actions.append(open);\n        body.append(actions);\n        card.append(body);\n        grid.append(card);\n    }\n    viewRoot.append(grid);\n    // \u4E0B\u4E00\u6B65\n    if (Array.isArray(story.next_actions) && story.next_actions.length > 0) {\n        const callout = createElement("div", "callout");\n        callout.append(createElement("strong", "", "\u4E0B\u4E00\u6B65"));\n        const list = createElement("ul", "mini-list");\n        for (const action of story.next_actions) list.append(createElement("li", "", action));\n        callout.append(list);\n        viewRoot.append(callout);\n    }\n}\n\n/**\n * \u5267\u96C6\u8BE6\u60C5\u3002\n */\nfunction renderEpisode(data) {\n    hideLegacyShotsNav();\n    // \u5267\u96C6 / \u72B6\u6001\n    const episode = data.episode;\n    const status = data.status;\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", `Episode ${episode.id}`));\n    headText.append(createElement("h2", "page-title", `\u7B2C ${episode.number} \u96C6 \xB7 ${episode.title}`));\n    headText.append(createElement("p", "page-subtitle", episode.summary ?? ""));\n    head.append(headText);\n    // \u8FD4\u56DE\n    const back = createElement("button", "button ghost", "\u2190 \u8FD4\u56DE\u6982\u89C8");\n    back.type = "button";\n    back.addEventListener("click", () => {\n        window.location.hash = `${HASH_PREFIX}overview`;\n    });\n    head.append(back);\n    viewRoot.append(head);\n    // \u9636\u6BB5\n    const stageRow = createElement("div", "chip-row");\n    stageRow.append(stageBadge(status.stage));\n    stageRow.append(createElement("span", "muted", `\u5267\u672C r${status.script.revision} \xB7 ${status.script.status}`));\n    stageRow.append(createElement("span", "muted", `\u62C6\u89E3 r${status.documents.breakdown.source_revision}`));\n    stageRow.append(createElement("span", "muted", `\u5206\u955C r${status.documents.shots.source_revision}`));\n    viewRoot.append(stageRow);\n    // \u963B\u65AD\n    if (status.blockers.length > 0) {\n        const callout = createElement("div", "callout warn");\n        callout.append(createElement("strong", "", `\u95E8\u7981\u963B\u65AD ${status.blockers.length} \u9879`));\n        const list = createElement("ul", "mini-list");\n        for (const blocker of status.blockers)\n            list.append(createElement("li", "", `[${blocker.code}] ${blocker.message}`));\n        callout.append(list);\n        viewRoot.append(callout);\n    }\n    // \u5267\u672C\n    const scriptHead = createElement("div", "section-head");\n    scriptHead.append(createElement("h3", "section-title", "\u5267\u672C"));\n    scriptHead.append(createElement("span", "section-meta", `r${data.script.meta.revision}`));\n    viewRoot.append(scriptHead);\n    const script = createElement(\n        "pre",\n        "script-text",\n        data.script.content === "" ? "\uFF08\u5C1A\u672A\u540C\u6B65\uFF09" : data.script.content,\n    );\n    viewRoot.append(script);\n    // \u62C6\u89E3\n    const breakdown = data.breakdown;\n    const breakdownHead = createElement("div", "section-head");\n    breakdownHead.append(createElement("h3", "section-title", "\u672C\u96C6\u62C6\u89E3"));\n    breakdownHead.append(\n        createElement("span", "section-meta", breakdown === null ? "\u7F3A\u5931" : `source r${breakdown.source_revision}`),\n    );\n    viewRoot.append(breakdownHead);\n    if (breakdown === null) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u62C6\u89E3", "\u4F7F\u7528 daoyan story breakdown set \u5199\u5165\u672C\u96C6\u89D2\u8272\u3001\u5F62\u6001\u3001\u573A\u666F\u4E0E\u97F3\u8272\u3002"));\n    } else {\n        const list = createElement("div", "layout-two");\n        // \u89D2\u8272\n        const cast = createElement("div", "panel");\n        cast.append(createElement("h4", "panel-title", "\u89D2\u8272\u4E0E\u5F62\u6001"));\n        const castList = createElement("ul", "mini-list");\n        for (const item of breakdown.characters) {\n            castList.append(createElement("li", "", `${item.id} \xB7 ${item.forms.join(" / ")}`));\n        }\n        cast.append(castList);\n        // \u573A\u666F / \u97F3\u8272 / beat\n        const other = createElement("div", "panel");\n        other.append(createElement("h4", "panel-title", "\u573A\u666F / \u97F3\u8272 / Beat"));\n        other.append(createElement("p", "", `\u573A\u666F\uFF1A${breakdown.scenes.join("\u3001") || "\u65E0"}`));\n        other.append(createElement("p", "", `\u97F3\u8272\uFF1A${breakdown.voices.join("\u3001") || "\u65E0"}`));\n        other.append(createElement("p", "", `Beat\uFF1A${(breakdown.beats ?? []).map((b) => b.id).join("\u3001") || "\u65E0"}`));\n        list.append(cast);\n        list.append(other);\n        viewRoot.append(list);\n    }\n    // \u5206\u955C\n    const shots = data.shots;\n    const shotsHead = createElement("div", "section-head");\n    shotsHead.append(createElement("h3", "section-title", "\u5206\u955C"));\n    shotsHead.append(\n        createElement("span", "section-meta", shots === null ? "\u7F3A\u5931" : `${shots.summary.shots_total} \u955C`),\n    );\n    viewRoot.append(shotsHead);\n    if (shots === null || shots.shots.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u5206\u955C", "\u4F7F\u7528 daoyan story shots set \u5199\u5165\u672C\u96C6\u5206\u955C\u3002"));\n    } else {\n        const grid = createElement("div", "shot-grid");\n        for (const shot of shots.shots) grid.append(renderShotCard(shot));\n        viewRoot.append(grid);\n    }\n    // \u4EFB\u52A1\n    const taskHead = createElement("div", "section-head");\n    taskHead.append(createElement("h3", "section-title", "\u672C\u96C6\u4EFB\u52A1"));\n    taskHead.append(createElement("span", "section-meta", `${data.tasks.length} \u4E2A`));\n    viewRoot.append(taskHead);\n    if (data.tasks.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u4EFB\u52A1", "\u62CD\u6444\u672C\u96C6\u540E\uFF0Ctask \u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002"));\n    } else {\n        const list = createElement("div", "task-list");\n        for (const task of data.tasks.slice(0, 10)) {\n            const row = createElement("div", "task-row");\n            row.append(createElement("span", "mono", task.task_id));\n            row.append(createElement("span", "", task.command));\n            row.append(statusBadge(task.status));\n            list.append(row);\n        }\n        viewRoot.append(list);\n    }\n    // \u6210\u7247\n    const finalHead = createElement("div", "section-head");\n    finalHead.append(createElement("h3", "section-title", "\u6210\u7247"));\n    finalHead.append(createElement("span", "section-meta", `${data.finals.length} \u4E2A`));\n    viewRoot.append(finalHead);\n    if (data.finals.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u6210\u7247", "\u8FD0\u884C daoyan wrap --episode <id> \u540E\u51FA\u73B0\u3002"));\n    } else {\n        const list = createElement("div", "task-list");\n        for (const item of data.finals) {\n            const row = createElement("div", "task-row");\n            row.append(createElement("span", "mono", item.name));\n            row.append(createElement("span", "", formatTime(item.created_at ?? "")));\n            const play = createElement("button", "button", "\u64AD\u653E");\n            play.type = "button";\n            play.addEventListener("click", () => {\n                openPlayer([{ title: item.name, url: item.media_url, kind: "video" }], 0);\n            });\n            row.append(play);\n            list.append(row);\n        }\n        viewRoot.append(list);\n    }\n}\n\n/**\n * \u89D2\u8272\u9875\u3002\n */\nfunction renderCharacters(data) {\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Characters"));\n    headText.append(createElement("h2", "page-title", "\u89D2\u8272\u4E0E\u5F62\u6001"));\n    headText.append(createElement("p", "page-subtitle", "\u8DE8\u96C6\u5171\u4EAB\u7684\u5168\u5C40\u8BBE\u5B9A\uFF1B\u4E3B\u53C2\u8003\u7531 AI / \u7528\u6237\u663E\u5F0F\u6307\u5B9A\u3002"));\n    head.append(headText);\n    viewRoot.append(head);\n    // \u89D2\u8272\n    const items = Array.isArray(data.items) ? data.items : [];\n    if (items.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u89D2\u8272", "\u4F7F\u7528 daoyan story characters set \u5199\u5165\u5168\u5C40\u89D2\u8272\u3002"));\n        return;\n    }\n    const grid = createElement("div", "grid");\n    for (const character of items) {\n        // \u5361\u7247\n        const card = createElement("article", "card entity-card");\n        const body = createElement("div", "card-body");\n        body.append(createElement("h3", "card-title", `${character.name} \xB7 ${character.id}`));\n        body.append(createElement("p", "muted", character.summary ?? ""));\n        for (const form of character.forms) {\n            // \u5F62\u6001\n            const block = createElement("div", "form-block");\n            block.append(createElement("h4", "form-title", `${form.name} \xB7 ${form.id}`));\n            // \u4E3B\u53C2\u8003\n            const reference = form.reference_asset\n                ? form.assets.find((asset) => asset.id === form.reference_asset)\n                : null;\n            block.append(assetNode(reference, false));\n            // \u5176\u5B83\u8D44\u4EA7\n            const more = createElement("div", "asset-row");\n            for (const asset of form.assets) {\n                if (reference !== null && asset.id === reference.id) continue;\n                more.append(assetNode(asset, true));\n            }\n            if (more.childElementCount > 0) block.append(more);\n            body.append(block);\n        }\n        card.append(body);\n        grid.append(card);\n    }\n    viewRoot.append(grid);\n}\n\n/**\n * \u573A\u666F\u9875\u3002\n */\nfunction renderScenes(data) {\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Scenes"));\n    headText.append(createElement("h2", "page-title", "\u573A\u666F"));\n    headText.append(createElement("p", "page-subtitle", "\u8DE8\u96C6\u5171\u4EAB\u7684\u573A\u666F\u53C2\u8003\u8D44\u4EA7\u3002"));\n    head.append(headText);\n    viewRoot.append(head);\n    // \u573A\u666F\n    const items = Array.isArray(data.items) ? data.items : [];\n    if (items.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u573A\u666F", "\u4F7F\u7528 daoyan story scenes set \u5199\u5165\u5168\u5C40\u573A\u666F\u3002"));\n        return;\n    }\n    const grid = createElement("div", "grid");\n    for (const scene of items) {\n        // \u5361\u7247\n        const card = createElement("article", "card entity-card");\n        const body = createElement("div", "card-body");\n        body.append(createElement("h3", "card-title", `${scene.name} \xB7 ${scene.id}`));\n        body.append(createElement("p", "muted", scene.description ?? ""));\n        const reference = scene.reference_asset\n            ? scene.assets.find((asset) => asset.id === scene.reference_asset)\n            : null;\n        body.append(assetNode(reference, false));\n        const more = createElement("div", "asset-row");\n        for (const asset of scene.assets) {\n            if (reference !== null && asset.id === reference.id) continue;\n            more.append(assetNode(asset, true));\n        }\n        if (more.childElementCount > 0) body.append(more);\n        card.append(body);\n        grid.append(card);\n    }\n    viewRoot.append(grid);\n}\n\n/**\n * \u97F3\u8272\u9875\u3002\n */\nfunction renderVoices(data) {\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Voices"));\n    headText.append(createElement("h2", "page-title", "\u97F3\u8272"));\n    headText.append(createElement("p", "page-subtitle", "\u89D2\u8272\u97F3\u8272\u6863\u6848\uFF1Breference \u6A21\u5F0F\u5FC5\u987B\u6709\u663E\u5F0F\u53C2\u8003\u97F3\u9891\u3002"));\n    head.append(headText);\n    viewRoot.append(head);\n    // \u97F3\u8272\n    const items = Array.isArray(data.items) ? data.items : [];\n    if (items.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u97F3\u8272", "\u4F7F\u7528 daoyan story voices set \u5199\u5165\u97F3\u8272\u3002"));\n        return;\n    }\n    const grid = createElement("div", "grid");\n    for (const voice of items) {\n        // \u5361\u7247\n        const card = createElement("article", "card entity-card");\n        const body = createElement("div", "card-body");\n        body.append(createElement("h3", "card-title", `${voice.name} \xB7 ${voice.id}`));\n        body.append(createElement("p", "muted", `${voice.character_id} \xB7 ${voice.mode}`));\n        body.append(createElement("p", "", voice.description ?? ""));\n        const reference = voice.reference_asset\n            ? voice.assets.find((asset) => asset.id === voice.reference_asset)\n            : null;\n        body.append(assetNode(reference, false));\n        if (voice.sample_text) body.append(createElement("blockquote", "quote", voice.sample_text));\n        card.append(body);\n        grid.append(card);\n    }\n    viewRoot.append(grid);\n}\n\n/**\n * \u8BBE\u5B9A\u8D44\u4EA7\u9875\u3002\n */\nfunction renderAssets(data) {\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Story assets"));\n    headText.append(createElement("h2", "page-title", "\u8BBE\u5B9A\u8D44\u4EA7"));\n    headText.append(createElement("p", "page-subtitle", "\u53C2\u8003\u56FE\u4E0E\u53C2\u8003\u97F3\u9891\uFF1B* \u8868\u793A\u5F53\u524D\u4E3B\u53C2\u8003\u3002"));\n    head.append(headText);\n    viewRoot.append(head);\n    // \u8D44\u4EA7\n    const items = Array.isArray(data.items) ? data.items : [];\n    if (items.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u8BBE\u5B9A\u8D44\u4EA7", "\u4F7F\u7528 daoyan story asset add \u5165\u5E93\u53C2\u8003\u56FE / \u97F3\u9891\u3002"));\n        return;\n    }\n    const grid = createElement("div", "grid");\n    for (const item of items) {\n        // \u5361\u7247\n        const card = createElement("article", "card entity-card");\n        const body = createElement("div", "card-body");\n        const owner = `${item.owner_kind}:${item.owner_id}${item.form_id !== null ? `/${item.form_id}` : ""}`;\n        body.append(createElement("h3", "card-title", `${item.reference ? "* " : ""}${item.asset.id}`));\n        body.append(createElement("p", "muted", `${owner} \xB7 ${item.owner_name}`));\n        body.append(assetNode(item.asset, false));\n        card.append(body);\n        grid.append(card);\n    }\n    viewRoot.append(grid);\n}\n\n/**\n * \u6982\u89C8\u9875\u3002\n */\nfunction renderOverview(data) {\n    // \u7EDF\u8BA1\n    const stats = data.stats ?? {};\n    // \u5206\u955C\u89C6\u56FE\n    const storyboard = data.storyboard !== undefined ? data.storyboard : null;\n    // \u7CFB\u5217\u72B6\u6001\n    const story = data.story !== undefined ? data.story : null;\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    // \u9875\u5934\u6587\u672C\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Overview"));\n    headText.append(createElement("h2", "page-title", data.project !== undefined ? data.project.name : "\u9879\u76EE\u6982\u89C8"));\n    // \u9879\u76EE\u6458\u8981\n    const subtitle = [`${data.mode ?? "\u672A\u7ED1\u5B9A\u672C\u673A"} \xB7 ${data.machine_id ?? "\u672C\u673A\u672A\u521D\u59CB\u5316"}`];\n    if (storyboard !== null && storyboard.summary !== undefined) {\n        subtitle.push(\n            `${storyboard.summary.shots_total} \u955C \xB7 ${storyboard.summary.characters_total} \u89D2\u8272 \xB7 ${storyboard.summary.scenes_total} \u573A\u666F`,\n        );\n    }\n    headText.append(createElement("p", "page-subtitle", subtitle.join(" \xB7 ")));\n    head.append(headText);\n    viewRoot.append(head);\n\n    if (data.machine === null) {\n        // \u672A\u521D\u59CB\u5316\u63D0\u793A\n        const callout = createElement("div", "callout");\n        callout.append(createElement("strong", "", "\u672C\u673A\u5C1A\u672A\u521D\u59CB\u5316\u3002"));\n        callout.append(document.createTextNode(" \u5F53\u524D\u4EC5\u5C55\u793A\u5171\u4EAB\u6570\u636E\uFF1B\u8FD0\u884C "));\n        callout.append(createElement("code", "mono", "daoyan init --mode=local|remote"));\n        callout.append(document.createTextNode(" \u7ED1\u5B9A\u672C\u673A\u540E\u5373\u53EF\u770B\u5230\u5F15\u64CE\u4E0E\u673A\u5668\u72B6\u6001\u3002"));\n        viewRoot.append(callout);\n    }\n\n    // \u7EDF\u8BA1\u7F51\u683C\n    const statsGrid = createElement("div", "stats-grid");\n    if (story !== null) {\n        statsGrid.append(\n            statCard(\n                "\u5267\u96C6",\n                `${story.series.episodes_ready ?? 0}/${story.series.episodes_total ?? 0}`,\n                "\u53EF\u62CD / \u603B\u96C6\u6570",\n            ),\n        );\n        statsGrid.append(statCard("\u89D2\u8272", stats.characters_total ?? 0, `${stats.forms_total ?? 0} \u4E2A\u5F62\u6001`));\n        statsGrid.append(statCard("\u573A\u666F", stats.scenes_total ?? 0, "\u5168\u5C40\u573A\u666F"));\n        statsGrid.append(statCard("\u97F3\u8272", stats.voices_total ?? 0, "\u5168\u5C40\u97F3\u8272"));\n        statsGrid.append(statCard("\u8BBE\u5B9A\u8D44\u4EA7", stats.assets_total ?? 0, "\u53C2\u8003\u56FE / \u97F3\u9891"));\n        statsGrid.append(statCard("\u955C\u5934", stats.shots_total ?? 0, `\u6210\u529F run ${stats.runs_succeeded ?? 0}`));\n    } else {\n        statsGrid.append(statCard("\u955C\u5934", `${stats.shots_done ?? 0}/${stats.shots_total ?? 0}`, "\u5DF2\u5B8C\u6210 / \u603B\u6570"));\n        statsGrid.append(statCard("\u4EBA\u7269", stats.characters_total ?? 0, "\u5DF2\u767B\u8BB0\u89D2\u8272"));\n        statsGrid.append(statCard("\u573A\u666F", stats.scenes_total ?? 0, "\u5DF2\u767B\u8BB0\u573A\u666F"));\n        statsGrid.append(statCard("\u4EA7\u51FA\u7269", stats.outputs_total ?? 0, formatBytes(stats.outputs_bytes ?? 0)));\n        statsGrid.append(\n            statCard(\n                "\u6210\u529F run",\n                `${stats.runs_succeeded ?? 0}/${stats.runs_total ?? 0}`,\n                `\u5931\u8D25 ${stats.runs_failed ?? 0}`,\n            ),\n        );\n        statsGrid.append(statCard("\u8FD0\u884C\u4E2D\u4EFB\u52A1", stats.tasks_active ?? 0, `\u5171 ${stats.tasks_total ?? 0} \u4E2A\u4EFB\u52A1`));\n    }\n    viewRoot.append(statsGrid);\n\n    if (story !== null) {\n        renderStorySeries(story);\n    } else if (storyboard !== null) {\n        viewRoot.append(renderProjectProfile(storyboard));\n        viewRoot.append(renderEntitySection("character", storyboard.characters));\n        viewRoot.append(renderEntitySection("scene", storyboard.scenes));\n        viewRoot.append(renderStoryboardPanel(storyboard));\n    } else {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u5206\u955C\u8BBE\u5B9A", "\u521B\u5EFA shots.json \u540E\uFF0C\u8FD9\u91CC\u4F1A\u5C55\u793A\u955C\u5934\u3001\u4EBA\u7269\u3001\u573A\u666F\u548C\u9010\u955C\u4EA7\u51FA\u3002"));\n    }\n\n    // \u4E24\u5217\u4FE1\u606F\n    const layout = createElement("div", "layout-two");\n    layout.append(renderEnginePanel(data));\n    layout.append(renderEnvironmentPanel(data));\n    viewRoot.append(layout);\n\n    // \u6700\u8FD1\u4EA7\u7269\n    const artifacts = Array.isArray(data.recent_artifacts) ? data.recent_artifacts : [];\n    // \u4EA7\u7269\u533A\u5757\u5934\n    const artifactHead = createElement("div", "section-head");\n    artifactHead.append(createElement("h3", "section-title", "\u6700\u8FD1\u4EA7\u51FA\u7269"));\n    artifactHead.append(createElement("span", "section-meta", `${artifacts.length} \u4E2A`));\n    viewRoot.append(artifactHead);\n    if (artifacts.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u4EA7\u51FA\u7269", "\u6267\u884C shot / run \u540E\uFF0C\u89C6\u9891\u4E0E\u56FE\u7247\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002"));\n    } else {\n        // \u4EA7\u7269\u7F51\u683C\n        const grid = createElement("div", "grid");\n        renderArtifactCards(grid, artifacts);\n        viewRoot.append(grid);\n    }\n\n    // \u6700\u8FD1\u4EFB\u52A1\n    const tasks = Array.isArray(data.recent_tasks) ? data.recent_tasks : [];\n    // \u4EFB\u52A1\u533A\u5757\u5934\n    const taskHead = createElement("div", "section-head");\n    taskHead.append(createElement("h3", "section-title", "\u6700\u8FD1\u4EFB\u52A1"));\n    taskHead.append(createElement("span", "section-meta", `${tasks.length} \u4E2A`));\n    viewRoot.append(taskHead);\n    if (tasks.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u4EFB\u52A1", "daoyan shot / batch \u521B\u5EFA\u7684\u4EFB\u52A1\u4F1A\u5728\u8FD9\u91CC\u51FA\u73B0\u3002"));\n    } else {\n        viewRoot.append(renderTaskList(tasks));\n    }\n}\n\n/**\n * \u9879\u76EE\u6863\u6848\u9762\u677F\u3002\n */\nfunction renderProjectProfile(storyboard) {\n    // \u9762\u677F\n    const panel = createElement("section", "panel profile-panel");\n    // \u9762\u677F\u5934\n    const head = createElement("div", "panel-head");\n    // \u6807\u9898\u5BB9\u5668\n    const titles = createElement("div");\n    titles.append(createElement("h3", "panel-title", "\u9879\u76EE\u6863\u6848"));\n    titles.append(createElement("p", "panel-sub", "\u5267\u60C5\u3001\u753B\u9762\u4E0E\u751F\u6210\u53C2\u6570"));\n    head.append(titles);\n    panel.append(head);\n\n    if (storyboard.synopsis !== null && storyboard.synopsis !== undefined) {\n        panel.append(createElement("p", "profile-synopsis", storyboard.synopsis));\n    }\n\n    // \u6458\u8981\n    const summary = storyboard.summary ?? {};\n    // \u9ED8\u8BA4\u53C2\u6570\n    const defaults = storyboard.defaults ?? {};\n    // \u952E\u503C\u5217\u8868\n    const kv = createElement("dl", "kv");\n    appendKv(kv, "\u7247\u540D", storyboard.title ?? "\u672A\u547D\u540D");\n    appendKv(kv, "\u5206\u8FA8\u7387", summary.resolution ?? "\u2014");\n    appendKv(kv, "\u5E27\u7387", summary.fps !== null && summary.fps !== undefined ? `${summary.fps} fps` : "\u672A\u8BBE\u7F6E");\n    appendKv(kv, "\u603B\u5E27\u6570", summary.total_frames ?? 0);\n    appendKv(\n        kv,\n        "\u603B\u65F6\u957F",\n        summary.total_duration_seconds !== null && summary.total_duration_seconds !== undefined\n            ? formatSeconds(summary.total_duration_seconds)\n            : "\u90E8\u5206\u955C\u5934\u672A\u77E5",\n    );\n    appendKv(kv, "\u98CE\u683C", storyboard.style_prefix ?? "\u2014");\n    appendKv(kv, "workflow", storyboard.workflow ?? "\u2014");\n    if (defaults.steps !== undefined) appendKv(kv, "\u9ED8\u8BA4 steps", defaults.steps);\n    if (defaults.cfg !== undefined) appendKv(kv, "\u9ED8\u8BA4 cfg", defaults.cfg);\n    if (defaults.negative !== undefined) appendKv(kv, "\u8D1F\u5411\u63D0\u793A\u8BCD", defaults.negative);\n    panel.append(kv);\n    return panel;\n}\n\n/**\n * \u4EBA\u7269 / \u573A\u666F\u533A\u5757\u3002\n */\nfunction renderEntitySection(kind, entities) {\n    // \u662F\u5426\u4EBA\u7269\n    const isCharacter = kind === "character";\n    // \u533A\u5757\n    const section = createElement("section", "entity-section");\n    // \u533A\u5757\u5934\n    const head = createElement("div", "section-head");\n    head.append(createElement("h3", "section-title", isCharacter ? "\u4EBA\u7269\u8BBE\u5B9A" : "\u573A\u666F\u8BBE\u5B9A"));\n    head.append(createElement("span", "section-meta", `${Array.isArray(entities) ? entities.length : 0} \u4E2A`));\n    section.append(head);\n    if (!Array.isArray(entities) || entities.length === 0) {\n        section.append(\n            emptyNode(\n                isCharacter ? "\u8FD8\u6CA1\u6709\u4EBA\u7269\u8BBE\u5B9A" : "\u8FD8\u6CA1\u6709\u573A\u666F\u8BBE\u5B9A",\n                isCharacter\n                    ? "\u5728 shots.json \u7684 meta.characters \u767B\u8BB0\u4EBA\u7269\uFF0C\u5E76\u5728\u955C\u5934\u7684 characters \u5B57\u6BB5\u5F15\u7528\u3002"\n                    : "\u5728 shots.json \u7684 meta.scenes \u767B\u8BB0\u573A\u666F\uFF0C\u5E76\u5728\u955C\u5934\u7684 scene \u5B57\u6BB5\u5F15\u7528\u3002",\n            ),\n        );\n        return section;\n    }\n    // \u5361\u7247\u7F51\u683C\n    const grid = createElement("div", "entity-grid");\n    for (const entity of entities) {\n        // \u5B9E\u4F53\u5361\u7247\n        const card = createElement("article", "entity-card");\n        // \u5361\u7247\u5934\n        const cardHead = createElement("div", "entity-head");\n        cardHead.append(createElement("h4", "entity-name", entity.name));\n        cardHead.append(\n            entity.count > 0\n                ? badge(`\u51FA\u573A ${entity.count} \u955C`, isCharacter ? "kind-image" : "kind-video")\n                : badge("\u672A\u51FA\u573A", ""),\n        );\n        card.append(cardHead);\n        if (entity.description) card.append(createElement("p", "entity-desc", entity.description));\n        if (entity.reference) card.append(createElement("p", "entity-ref mono", entity.reference));\n        // \u51FA\u573A\u955C\u53F7\n        const shots = createElement("div", "chip-row");\n        if (Array.isArray(entity.shots) && entity.shots.length > 0) {\n            for (const shotId of entity.shots) shots.append(createElement("span", "chip chip-small", `\u955C ${shotId}`));\n        } else {\n            shots.append(createElement("span", "muted", "\u6682\u65E0\u51FA\u573A\u955C\u5934"));\n        }\n        card.append(shots);\n        grid.append(card);\n    }\n    section.append(grid);\n    return section;\n}\n\n/**\n * \u5206\u955C\u4E00\u89C8\u9762\u677F\u3002\n */\nfunction renderStoryboardPanel(storyboard) {\n    // \u955C\u5934\n    const shots = Array.isArray(storyboard.shots) ? storyboard.shots : [];\n    // \u533A\u5757\n    const section = createElement("section", "storyboard-section");\n    // \u533A\u5757\u5934\n    const head = createElement("div", "section-head");\n    head.append(createElement("h3", "section-title", "\u5206\u955C\u4E00\u89C8"));\n    head.append(createElement("span", "section-meta", `${shots.length} \u955C`));\n    // \u67E5\u770B\u5168\u90E8\n    const more = createElement("button", "button ghost", "\u67E5\u770B\u5206\u955C\u8BE6\u60C5");\n    more.type = "button";\n    more.addEventListener("click", () => {\n        window.location.hash = `${HASH_PREFIX}shots`;\n    });\n    head.append(more);\n    section.append(head);\n    if (shots.length === 0) {\n        section.append(emptyNode("\u8FD8\u6CA1\u6709\u955C\u5934", "\u5728 shots.json \u7684 shots \u6570\u7EC4\u91CC\u6DFB\u52A0\u955C\u5934\u3002"));\n        return section;\n    }\n    // \u5206\u955C\u5217\u8868\n    const list = createElement("div", "storyboard-list");\n    // \u8868\u5934\n    const header = createElement("div", "storyboard-row storyboard-header");\n    for (const label of ["\u955C\u53F7", "\u5185\u5BB9", "\u573A\u666F", "\u4EBA\u7269", "\u4EA7\u51FA"]) header.append(createElement("span", "", label));\n    list.append(header);\n    for (const shot of shots) {\n        // \u6570\u636E\u884C\n        const row = createElement("div", "storyboard-row");\n        // \u955C\u53F7\n        const idCell = createElement("div", "storyboard-id-cell");\n        idCell.append(createElement("span", "storyboard-id", shot.id));\n        idCell.append(shotStatusBadge(shot));\n        row.append(idCell);\n        // \u5185\u5BB9\n        const content = createElement("div", "storyboard-content");\n        content.append(createElement("div", "storyboard-title", shot.title ?? shot.slug ?? `\u955C\u5934 ${shot.id}`));\n        content.append(createElement("p", "storyboard-summary", shot.summary));\n        row.append(content);\n        // \u573A\u666F\n        row.append(\n            shot.scene !== null && shot.scene !== undefined\n                ? entityChip(shot.scene, "chip-scene")\n                : createElement("span", "muted", "\u2014"),\n        );\n        // \u4EBA\u7269\n        const cast = createElement("div", "chip-row");\n        if (Array.isArray(shot.characters) && shot.characters.length > 0) {\n            for (const character of shot.characters) cast.append(entityChip(character, "chip-character"));\n        } else {\n            cast.append(createElement("span", "muted", "\u2014"));\n        }\n        row.append(cast);\n        // \u4EA7\u51FA\n        const artifacts = Array.isArray(shot.artifacts) ? shot.artifacts : [];\n        const artifactCell = createElement("div", "storyboard-artifacts");\n        artifactCell.append(createElement("span", "muted", `${artifacts.length} \u4E2A`));\n        // \u53EF\u64AD\u653E\u4EA7\u7269\n        const playable = artifacts.find(\n            (item) =>\n                item.output.present === true && item.output.lfs_pointer !== true && PREVIEW_KINDS.has(item.output.kind),\n        );\n        if (playable !== undefined) {\n            // \u64AD\u653E\u6309\u94AE\n            const play = createElement("button", "button ghost", "\u64AD\u653E");\n            play.type = "button";\n            play.addEventListener("click", () => openArtifact(playable, artifacts));\n            artifactCell.append(play);\n        }\n        row.append(artifactCell);\n        list.append(row);\n    }\n    section.append(list);\n    return section;\n}\n\n/**\n * \u5F15\u64CE\u9762\u677F\u3002\n */\nfunction renderEnginePanel(data) {\n    // \u9762\u677F\n    const panel = createElement("section", "panel");\n    // \u9762\u677F\u5934\n    const head = createElement("div", "panel-head");\n    // \u6807\u9898\u5BB9\u5668\n    const titles = createElement("div");\n    titles.append(createElement("h3", "panel-title", "\u5F15\u64CE"));\n    titles.append(createElement("p", "panel-sub", data.engine === null ? "\u672A\u7ED1\u5B9A\u672C\u673A" : data.engine.mode));\n    head.append(titles);\n    if (data.engine !== null) {\n        head.append(data.engine.up === true ? badge("\u53EF\u8FBE", "status-succeeded") : badge("\u4E0D\u53EF\u8FBE", "status-failed"));\n    }\n    panel.append(head);\n    if (data.engine === null) {\n        panel.append(createElement("p", "muted", "\u8FD0\u884C init \u7ED1\u5B9A\u672C\u673A\u540E\u663E\u793A\u5F15\u64CE\u72B6\u6001\u3002"));\n        return panel;\n    }\n    // \u952E\u503C\u5217\u8868\n    const kv = createElement("dl", "kv");\n    appendKv(kv, "\u5730\u5740", data.engine.url);\n    appendKv(kv, "PID", data.engine.pid);\n    if (data.engine.queue !== null && data.engine.queue !== undefined) {\n        appendKv(kv, "\u961F\u5217", `\u6267\u884C\u4E2D ${data.engine.queue.running} / \u7B49\u5F85 ${data.engine.queue.pending}`);\n    }\n    appendKv(kv, "\u6A21\u5F0F", data.mode);\n    panel.append(kv);\n    return panel;\n}\n\n/**\n * \u673A\u5668 / GPU / Skill \u9762\u677F\u3002\n */\nfunction renderEnvironmentPanel(data) {\n    // \u9762\u677F\n    const panel = createElement("section", "panel");\n    // \u9762\u677F\u5934\n    const head = createElement("div", "panel-head");\n    // \u6807\u9898\u5BB9\u5668\n    const titles = createElement("div");\n    titles.append(createElement("h3", "panel-title", "\u673A\u5668\u4E0E\u8FD0\u884C\u73AF\u5883"));\n    titles.append(createElement("p", "panel-sub", data.machine_id ?? "\u672C\u673A\u672A\u521D\u59CB\u5316"));\n    head.append(titles);\n    panel.append(head);\n\n    // \u952E\u503C\u5217\u8868\n    const kv = createElement("dl", "kv");\n    // \u673A\u5668\u9501\u72B6\u6001\n    const lock = data.machine_lock;\n    if (lock === null || lock === undefined) {\n        appendKv(kv, "\u673A\u5668\u9501", "\u2014");\n    } else if (lock.status === "held" && lock.owner !== undefined) {\n        appendKv(kv, "\u673A\u5668\u9501", `${lock.owner.command}\uFF08task ${lock.owner.task_id}\uFF0Cpid ${lock.owner.pid}\uFF09`);\n    } else {\n        appendKv(kv, "\u673A\u5668\u9501", STATUS_LABEL[lock.status] ?? lock.status);\n    }\n\n    // GPU \u72B6\u6001\n    const gpu = data.gpu;\n    if (gpu === null || gpu === undefined) {\n        appendKv(kv, "GPU", "\u2014");\n    } else if (gpu.supported === true && Array.isArray(gpu.devices) && gpu.devices.length > 0) {\n        appendKv(kv, "GPU", `${gpu.devices[0].usedMb} MiB / ${gpu.devices[0].totalMb} MiB`);\n    } else {\n        appendKv(kv, "GPU", gpu.reason ?? "\u4E0D\u53EF\u7528");\n    }\n\n    // Skill \u72B6\u6001\n    const skill = data.skill;\n    if (skill === null || skill === undefined) {\n        appendKv(kv, "Skill", "\u2014");\n    } else if (skill.present !== true) {\n        appendKv(kv, "Skill", "\u7F3A\u5931\uFF08\u8FD0\u884C daoyan skill update\uFF09");\n    } else {\n        appendKv(kv, "Skill", skill.stale === true ? "\u9700\u8981\u66F4\u65B0" : "\u5DF2\u5C31\u7EEA");\n    }\n    panel.append(kv);\n\n    // \u4E0B\u4E00\u6B65\u52A8\u4F5C\n    const actions = Array.isArray(data.next_actions) ? data.next_actions : [];\n    if (actions.length > 0) {\n        // \u4E0B\u4E00\u6B65\n        const next = createElement("div", "card-actions");\n        for (const action of actions) next.append(createElement("code", "mono", action));\n        panel.append(next);\n    }\n    return panel;\n}\n\n/**\n * \u5206\u955C\u9875\u3002\n */\nfunction renderShots(data) {\n    if (data === null) {\n        // \u9875\u5934\n        const head = createElement("div", "view-head");\n        head.append(createElement("h2", "page-title", "\u5206\u955C"));\n        viewRoot.append(head);\n        viewRoot.append(emptyNode("\u672A\u914D\u7F6E shots.json", "\u5728\u9879\u76EE\u6839\u521B\u5EFA shots.json \u540E\u5237\u65B0\u3002"));\n        return;\n    }\n    // \u9875\u9762\u6807\u9898\n    const title = data.title !== null && data.title !== undefined ? data.title : "\u5206\u955C";\n    // \u7EDF\u8BA1\n    const stats = data.summary ?? {};\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    // \u9875\u5934\u6587\u672C\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Storyboard"));\n    headText.append(createElement("h2", "page-title", title));\n    // \u9875\u5934\u526F\u6807\u9898\n    const subtitle = [];\n    if (data.style_prefix) subtitle.push(`\u98CE\u683C ${data.style_prefix}`);\n    if (data.workflow) subtitle.push(`workflow ${data.workflow}`);\n    if (stats.resolution) subtitle.push(stats.resolution);\n    if (stats.fps) subtitle.push(`${stats.fps} fps`);\n    headText.append(createElement("p", "page-subtitle", subtitle.join(" \xB7 ") || "\u6309\u955C\u5934\u67E5\u770B\u5185\u5BB9\u3001\u4EBA\u7269\u3001\u573A\u666F\u4E0E\u4EA7\u51FA"));\n    head.append(headText);\n    viewRoot.append(head);\n\n    if (data.synopsis !== null && data.synopsis !== undefined) {\n        viewRoot.append(createElement("p", "profile-synopsis", data.synopsis));\n    }\n\n    // \u7EDF\u8BA1\u5361\u7247\n    const statsGrid = createElement("div", "stats-grid");\n    statsGrid.append(statCard("\u955C\u5934", `${stats.shots_done ?? 0}/${stats.shots_total ?? 0}`, "\u5DF2\u5B8C\u6210 / \u603B\u6570"));\n    statsGrid.append(statCard("\u4EBA\u7269", stats.characters_total ?? 0, "\u5168\u7247\u89D2\u8272"));\n    statsGrid.append(statCard("\u573A\u666F", stats.scenes_total ?? 0, "\u5168\u7247\u573A\u666F"));\n    statsGrid.append(\n        statCard(\n            "\u4EA7\u51FA\u7269",\n            stats.artifacts_total ?? 0,\n            `${stats.total_frames ?? 0} \u5E27 \xB7 ${\n                stats.total_duration_seconds !== null && stats.total_duration_seconds !== undefined\n                    ? formatSeconds(stats.total_duration_seconds)\n                    : "\u90E8\u5206\u955C\u5934\u672A\u77E5"\n            }`,\n        ),\n    );\n    viewRoot.append(statsGrid);\n\n    // \u955C\u5934\u5217\u8868\n    const shots = Array.isArray(data.shots) ? data.shots : [];\n    if (shots.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u955C\u5934", "\u5728 shots.json \u7684 shots \u6570\u7EC4\u91CC\u6DFB\u52A0\u955C\u5934\u3002"));\n        return;\n    }\n\n    // \u4EBA\u7269\u7B5B\u9009\u503C -> \u540D\u79F0\n    const characterOptions = {};\n    for (const entity of Array.isArray(data.characters) ? data.characters : []) {\n        characterOptions[entityKey(entity)] = entity.name;\n    }\n    // \u573A\u666F\u7B5B\u9009\u503C -> \u540D\u79F0\n    const sceneOptions = {};\n    for (const entity of Array.isArray(data.scenes) ? data.scenes : []) {\n        sceneOptions[entityKey(entity)] = entity.name;\n    }\n    // \u72B6\u6001\u6587\u6848\n    const statusLabels = { done: "\u5DF2\u5B8C\u6210", pending: "\u672A\u5B8C\u6210", failed: "\u5931\u8D25", running: "\u8FD0\u884C\u4E2D" };\n\n    // \u7B5B\u9009\u680F\n    const filters = createElement("div", "filter-bar");\n    filters.append(\n        buildSelect(\n            "\u4EBA\u7269",\n            Object.keys(characterOptions),\n            shotFilters.character,\n            (value) => {\n                shotFilters.character = value;\n                refresh();\n            },\n            "\u5168\u90E8\u4EBA\u7269",\n            characterOptions,\n        ),\n    );\n    filters.append(\n        buildSelect(\n            "\u573A\u666F",\n            Object.keys(sceneOptions),\n            shotFilters.scene,\n            (value) => {\n                shotFilters.scene = value;\n                refresh();\n            },\n            "\u5168\u90E8\u573A\u666F",\n            sceneOptions,\n        ),\n    );\n    filters.append(\n        buildSelect(\n            "\u72B6\u6001",\n            ["done", "pending", "failed", "running"],\n            shotFilters.status,\n            (value) => {\n                shotFilters.status = value;\n                refresh();\n            },\n            "\u5168\u90E8\u72B6\u6001",\n            statusLabels,\n        ),\n    );\n    // \u641C\u7D22\u6846\n    const search = createElement("input", "input search");\n    search.type = "search";\n    search.placeholder = "\u641C\u7D22\u955C\u53F7 / \u5185\u5BB9 / \u4EBA\u7269 / \u573A\u666F";\n    search.value = shotFilters.search;\n    search.addEventListener("input", () => {\n        shotFilters.search = search.value;\n        refresh();\n    });\n    filters.append(search);\n    viewRoot.append(filters);\n\n    // \u7ED3\u679C\u5934\n    const listHead = createElement("div", "section-head");\n    listHead.append(createElement("h3", "section-title", "\u5206\u955C\u5217\u8868"));\n    // \u7ED3\u679C\u6458\u8981\n    const resultMeta = createElement("span", "section-meta", "");\n    listHead.append(resultMeta);\n    viewRoot.append(listHead);\n\n    // \u955C\u5934\u7F51\u683C\n    const grid = createElement("div", "grid shot-grid");\n    viewRoot.append(grid);\n\n    /**\n     * \u6309\u7B5B\u9009\u6761\u4EF6\u5237\u65B0\u955C\u5934\u5361\u7247\u3002\n     */\n    function refresh() {\n        // \u8FC7\u6EE4\u7ED3\u679C\n        const filtered = filterShots(shots);\n        resultMeta.textContent = `\u663E\u793A ${filtered.length} / ${shots.length}`;\n        clearNode(grid);\n        if (filtered.length === 0) {\n            grid.append(emptyNode("\u6CA1\u6709\u5339\u914D\u7684\u955C\u5934", "\u8C03\u6574\u4EBA\u7269\u3001\u573A\u666F\u3001\u72B6\u6001\u6216\u641C\u7D22\u6761\u4EF6\u3002"));\n            return;\n        }\n        for (const shot of filtered) grid.append(renderShotCard(shot));\n    }\n\n    refresh();\n}\n\n/**\n * \u6309\u5F53\u524D\u7B5B\u9009\u6761\u4EF6\u8FC7\u6EE4\u955C\u5934\u3002\n */\nfunction filterShots(shots) {\n    // \u641C\u7D22\u8BCD\n    const search = shotFilters.search.trim().toLowerCase();\n    return shots.filter((shot) => {\n        if (\n            shotFilters.character !== "" &&\n            !(\n                Array.isArray(shot.characters) &&\n                shot.characters.some((entity) => entityKey(entity) === shotFilters.character)\n            )\n        ) {\n            return false;\n        }\n        if (\n            shotFilters.scene !== "" &&\n            (shot.scene === null || shot.scene === undefined || entityKey(shot.scene) !== shotFilters.scene)\n        ) {\n            return false;\n        }\n        if (shotFilters.status === "done" && shot.done !== true) return false;\n        if (shotFilters.status === "pending" && shot.done === true) return false;\n        if (shotFilters.status === "failed" && shot.latest_status !== "failed") return false;\n        if (shotFilters.status === "running" && shot.latest_status !== "running" && shot.latest_status !== "queued") {\n            return false;\n        }\n        if (search !== "") {\n            // \u641C\u7D22\u6587\u672C\n            const haystack = `${shot.id} ${shot.title ?? ""} ${shot.slug ?? ""} ${shot.summary} ${shot.prompt} ${(\n                shot.characters ?? []\n            )\n                .map((entity) => entity.name)\n                .join(" ")} ${shot.scene !== null && shot.scene !== undefined ? shot.scene.name : ""}`.toLowerCase();\n            if (!haystack.includes(search)) return false;\n        }\n        return true;\n    });\n}\n\n/**\n * \u5355\u4E2A\u5206\u955C\u5361\u7247\u3002\n */\nfunction renderShotCard(shot) {\n    // \u5361\u7247\n    const card = createElement("article", "card shot-card shot-card-rich");\n    // \u5361\u7247\u5934\n    const cardHead = createElement("div", "shot-head");\n    // \u6807\u9898\u5BB9\u5668\n    const titles = createElement("div", "shot-title");\n    titles.append(createElement("span", "shot-id", shot.id));\n    titles.append(createElement("span", "shot-title-text", shot.title ?? shot.slug ?? `\u955C\u5934 ${shot.id}`));\n    if (shot.slug && shot.title) titles.append(createElement("span", "shot-slug", shot.slug));\n    cardHead.append(titles);\n    // \u72B6\u6001\u4E0E\u573A\u666F\n    const headBadges = createElement("div", "chip-row");\n    headBadges.append(shotStatusBadge(shot));\n    if (shot.scene !== null && shot.scene !== undefined) headBadges.append(entityChip(shot.scene, "chip-scene"));\n    cardHead.append(headBadges);\n    card.append(cardHead);\n\n    // \u5185\u5BB9\u6458\u8981\n    const summary = createElement("p", "shot-summary", shot.summary);\n    card.append(summary);\n\n    // \u4EBA\u7269\n    const cast = createElement("div", "shot-line");\n    cast.append(createElement("span", "shot-line-label", "\u4EBA\u7269"));\n    cast.append(entityChips(shot.characters, "chip-character"));\n    card.append(cast);\n\n    // \u5236\u4F5C\u53C2\u6570\n    const meta = createElement("div", "shot-meta-grid");\n    meta.append(createElement("span", "", `seed ${shot.seed}`));\n    meta.append(createElement("span", "", shot.length !== null ? `${shot.length} \u5E27` : "\u5E27\u6570\u672A\u77E5"));\n    meta.append(\n        createElement("span", "", shot.duration_seconds !== null ? formatSeconds(shot.duration_seconds) : "\u65F6\u957F\u672A\u77E5"),\n    );\n    meta.append(createElement("span", "", `${shot.width}x${shot.height}`));\n    meta.append(createElement("span", "", shot.steps !== null ? `steps ${shot.steps}` : "steps \u9ED8\u8BA4"));\n    meta.append(createElement("span", "", shot.cfg !== null ? `cfg ${shot.cfg}` : "cfg \u9ED8\u8BA4"));\n    meta.append(createElement("span", "", `\u9996\u5E27 ${shot.first_frame ?? "\u65E0"}`));\n    meta.append(createElement("span", "", shot.workflow ?? "\u9ED8\u8BA4 workflow"));\n    meta.append(createElement("span", "", `${shot.runs_count} run / ${shot.succeeded_count} \u6210\u529F`));\n    card.append(meta);\n\n    // \u5B8C\u6574\u63D0\u793A\u8BCD\n    const promptDetails = createElement("details", "shot-prompt");\n    promptDetails.append(createElement("summary", "", "\u5B8C\u6574\u63D0\u793A\u8BCD"));\n    promptDetails.append(createElement("p", "", shot.prompt));\n    card.append(promptDetails);\n\n    if (shot.notes) card.append(createElement("p", "shot-notes", `\u5907\u6CE8\uFF1A${shot.notes}`));\n\n    // \u4EA7\u7269\u533A\u5757\n    const artifacts = Array.isArray(shot.artifacts) ? shot.artifacts : [];\n    const artifactHead = createElement("div", "shot-section-head");\n    artifactHead.append(createElement("h4", "", `\u4EA7\u51FA\u7269\uFF08${artifacts.length}\uFF09`));\n    artifactHead.append(createElement("span", "muted", `${shot.runs_count} run / ${shot.succeeded_count} \u6210\u529F`));\n    card.append(artifactHead);\n    if (artifacts.length === 0) {\n        card.append(createElement("p", "muted", "\u8FD8\u6CA1\u6709\u4EA7\u51FA\u7269\u3002"));\n    } else {\n        // \u4EA7\u7269\u5217\u8868\n        const list = createElement("div", "artifact-list");\n        for (const item of artifacts) list.append(renderShotArtifactRow(item, artifacts));\n        card.append(list);\n    }\n\n    card.append(renderShotRunHistory(shot));\n    return card;\n}\n\n/**\n * \u5206\u955C\u4EA7\u7269\u7684\u5355\u884C\u5C55\u793A\u3002\n */\nfunction renderShotArtifactRow(item, all) {\n    // \u4EA7\u7269\n    const output = item.output;\n    // \u884C\n    const row = createElement("div", "artifact-row");\n    // \u7F29\u7565\u56FE\n    const thumb = createElement("div", "artifact-thumb");\n    // \u662F\u5426\u53EF\u7528\n    const available = output.present === true && output.lfs_pointer !== true;\n    if (available && output.kind === "video") {\n        // \u89C6\u9891\u9996\u5E27\n        const video = document.createElement("video");\n        video.src = `${output.media_url}#t=0.1`;\n        video.muted = true;\n        video.playsInline = true;\n        video.preload = "metadata";\n        thumb.append(video);\n    } else if (available && output.kind === "image") {\n        // \u56FE\u7247\u7F29\u7565\u56FE\n        const image = document.createElement("img");\n        image.src = output.media_url;\n        image.alt = output.name;\n        image.loading = "lazy";\n        thumb.append(image);\n    } else {\n        thumb.append(createElement("span", "artifact-thumb-icon", KIND_ICON[output.kind] ?? "\u2193"));\n    }\n    if (!output.present) thumb.append(createElement("span", "artifact-thumb-note", "\u7F3A\u5931"));\n    else if (output.lfs_pointer) thumb.append(createElement("span", "artifact-thumb-note", "LFS"));\n    row.append(thumb);\n\n    // \u4FE1\u606F\n    const info = createElement("div", "artifact-info");\n    info.append(createElement("div", "artifact-name", output.name));\n    // \u5143\u4FE1\u606F\n    const meta = createElement("div", "artifact-meta");\n    meta.append(kindBadge(output.kind));\n    meta.append(statusBadge(item.run_status));\n    meta.append(createElement("span", "", shortId(item.run_id)));\n    meta.append(createElement("span", "", formatTime(item.started_at)));\n    meta.append(createElement("span", "", formatBytes(output.bytes)));\n    info.append(meta);\n    row.append(info);\n\n    // \u64CD\u4F5C\n    const actions = createElement("div", "artifact-row-actions");\n    if (available && PREVIEW_KINDS.has(output.kind)) {\n        // \u9884\u89C8\u6309\u94AE\n        const preview = createElement("button", "button ghost", output.kind === "video" ? "\u64AD\u653E" : "\u67E5\u770B");\n        preview.type = "button";\n        preview.addEventListener("click", () => openArtifact(item, all));\n        actions.append(preview);\n    }\n    // \u4E0B\u8F7D\u94FE\u63A5\n    const download = createElement("a", "button ghost", "\u4E0B\u8F7D");\n    download.href = output.download_url;\n    actions.append(download);\n    row.append(actions);\n    return row;\n}\n\n/**\n * \u5386\u53F2 run \u6298\u53E0\u533A\u3002\n */\nfunction renderShotRunHistory(shot) {\n    // run \u5217\u8868\n    const runs = Array.isArray(shot.runs) ? shot.runs : [];\n    // \u6298\u53E0\u533A\n    const details = createElement("details", "shot-runs");\n    details.append(createElement("summary", "", `\u5386\u53F2 run\uFF08${runs.length}\uFF09`));\n    if (runs.length === 0) {\n        details.append(createElement("p", "muted", "\u8FD8\u6CA1\u6709 run\u3002"));\n        return details;\n    }\n    // \u5217\u8868\n    const list = createElement("ul", "run-list");\n    for (const run of runs) {\n        // run \u884C\n        const item = createElement("li", "run-item");\n        // \u4E3B\u4FE1\u606F\n        const main = createElement("div", "run-main");\n        main.append(statusBadge(run.status));\n        main.append(createElement("code", "mono", shortId(run.run_id)));\n        main.append(createElement("span", "", `${run.outputs.length} \u4E2A\u4EA7\u7269`));\n        main.append(\n            createElement("span", "muted", `${formatDuration(run.duration_ms)} \xB7 ${formatTime(run.started_at)}`),\n        );\n        item.append(main);\n        list.append(item);\n    }\n    details.append(list);\n    return details;\n}\n\n/**\n * \u4EA7\u51FA\u7269\u9875\u3002\n */\nfunction renderArtifacts(data) {\n    // \u5168\u90E8\u6761\u76EE\n    const items = Array.isArray(data.items) ? data.items : [];\n    // label \u5019\u9009\n    const labels = Array.isArray(data.labels) ? data.labels : [];\n    // \u7C7B\u578B\u5019\u9009\n    const kinds = Array.isArray(data.kinds) ? data.kinds : [];\n    // \u603B\u6570\n    const total = Number(data.total ?? items.length);\n\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    // \u9875\u5934\u6587\u672C\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Artifacts"));\n    headText.append(createElement("h2", "page-title", "\u4EA7\u51FA\u7269"));\n    headText.append(createElement("p", "page-subtitle", "\u70B9\u51FB\u89C6\u9891\u6216\u56FE\u7247\u9884\u89C8\uFF1B\u652F\u6301\u62D6\u52A8\u8FDB\u5EA6\u6761\u64AD\u653E\u3002"));\n    head.append(headText);\n    viewRoot.append(head);\n\n    // \u7B5B\u9009\u680F\n    const filters = createElement("div", "filter-bar");\n    filters.append(\n        buildSelect(\n            "\u955C\u5934",\n            labels,\n            artifactFilters.label,\n            (value) => {\n                artifactFilters.label = value;\n                refresh();\n            },\n            "\u5168\u90E8\u955C\u5934",\n        ),\n    );\n    filters.append(\n        buildSelect(\n            "\u72B6\u6001",\n            ["queued", "running", "succeeded", "failed", "cancelled", "interrupted"],\n            artifactFilters.status,\n            (value) => {\n                artifactFilters.status = value;\n                refresh();\n            },\n            "\u5168\u90E8\u72B6\u6001",\n            STATUS_LABEL,\n        ),\n    );\n    filters.append(\n        buildSelect(\n            "\u7C7B\u578B",\n            kinds,\n            artifactFilters.kind,\n            (value) => {\n                artifactFilters.kind = value;\n                refresh();\n            },\n            "\u5168\u90E8\u7C7B\u578B",\n            KIND_LABEL,\n        ),\n    );\n    // \u641C\u7D22\u6846\n    const search = createElement("input", "input search");\n    search.type = "search";\n    search.placeholder = "\u641C\u7D22 run / label / prompt / \u6587\u4EF6\u540D";\n    search.value = artifactFilters.search;\n    search.addEventListener("input", () => {\n        artifactFilters.search = search.value;\n        refresh();\n    });\n    filters.append(search);\n    viewRoot.append(filters);\n\n    // \u7ED3\u679C\u6458\u8981\n    const summaryHead = createElement("div", "section-head");\n    summaryHead.append(createElement("h3", "section-title", "\u5168\u90E8\u4EA7\u51FA\u7269"));\n    // \u6458\u8981\n    const summary = createElement("span", "section-meta", "");\n    summaryHead.append(summary);\n    viewRoot.append(summaryHead);\n\n    // \u7F51\u683C\n    const grid = createElement("div", "grid");\n    viewRoot.append(grid);\n\n    /**\n     * \u6309\u5F53\u524D\u7B5B\u9009\u5237\u65B0\u7F51\u683C\u3002\n     */\n    function refresh() {\n        // \u8FC7\u6EE4\u7ED3\u679C\n        const filtered = filterArtifacts(items);\n        summary.textContent = `\u663E\u793A ${filtered.length} / ${total}`;\n        clearNode(grid);\n        if (filtered.length === 0) {\n            grid.append(emptyNode("\u6CA1\u6709\u5339\u914D\u7684\u4EA7\u51FA\u7269", "\u8C03\u6574\u7B5B\u9009\u6761\u4EF6\u6216\u5148\u6267\u884C\u751F\u6210\u4EFB\u52A1\u3002"));\n            return;\n        }\n        renderArtifactCards(grid, filtered);\n    }\n\n    refresh();\n}\n\n/**\n * \u6784\u9020\u4E0B\u62C9\u7B5B\u9009\u3002\n */\nfunction buildSelect(label, options, value, onChange, allLabel, labels) {\n    // \u5B57\u6BB5\u5BB9\u5668\n    const field = createElement("label", "field");\n    field.append(createElement("span", "field-label", label));\n    // \u4E0B\u62C9\u6846\n    const select = createElement("select", "select");\n    select.append(new Option(allLabel, ""));\n    for (const option of options) {\n        // \u9009\u9879\u6587\u6848\n        const text = labels !== undefined ? (labels[option] ?? option) : option;\n        select.append(new Option(text, option));\n    }\n    select.value = value;\n    select.addEventListener("change", () => onChange(select.value));\n    field.append(select);\n    return field;\n}\n\n/**\n * \u6309\u7B5B\u9009\u6761\u4EF6\u8FC7\u6EE4\u4EA7\u7269\u3002\n */\nfunction filterArtifacts(items) {\n    // \u641C\u7D22\u8BCD\n    const search = artifactFilters.search.trim().toLowerCase();\n    return items.filter((item) => {\n        if (artifactFilters.label !== "" && item.label !== artifactFilters.label) return false;\n        if (artifactFilters.status !== "" && item.run_status !== artifactFilters.status) return false;\n        if (artifactFilters.kind !== "" && item.output.kind !== artifactFilters.kind) return false;\n        if (search !== "") {\n            // \u641C\u7D22\u6587\u672C\n            const haystack =\n                `${item.run_id} ${item.label ?? ""} ${item.prompt ?? ""} ${item.output.name}`.toLowerCase();\n            if (!haystack.includes(search)) return false;\n        }\n        return true;\n    });\n}\n\n/**\n * \u6E32\u67D3\u4EA7\u7269\u5361\u7247\u5217\u8868\u3002\n */\nfunction renderArtifactCards(container, items) {\n    for (const item of items) container.append(renderArtifactCard(item, items));\n}\n\n/**\n * \u5355\u4E2A\u4EA7\u7269\u5361\u7247\u3002\n */\nfunction renderArtifactCard(item, items) {\n    // \u4EA7\u7269\n    const output = item.output;\n    // \u5361\u7247\n    const card = createElement("article", "card artifact-card");\n    // \u9884\u89C8\u533A\n    const preview = createElement("div", "artifact-preview");\n    // \u662F\u5426\u53EF\u9884\u89C8\n    const available = output.present === true && output.lfs_pointer !== true;\n    if (available && (output.kind === "video" || output.kind === "image")) {\n        if (output.kind === "video") {\n            // \u89C6\u9891\u9996\u5E27\n            const video = document.createElement("video");\n            video.src = `${output.media_url}#t=0.1`;\n            video.muted = true;\n            video.playsInline = true;\n            video.preload = "metadata";\n            preview.append(video);\n        } else {\n            // \u56FE\u7247\u7F29\u7565\u56FE\n            const image = document.createElement("img");\n            image.src = output.media_url;\n            image.alt = output.name;\n            image.loading = "lazy";\n            preview.append(image);\n        }\n    } else {\n        preview.append(createElement("span", "preview-icon", KIND_ICON[output.kind] ?? "\u2193"));\n    }\n    if (!output.present) preview.append(createElement("span", "preview-note", "\u6587\u4EF6\u7F3A\u5931"));\n    else if (output.lfs_pointer) preview.append(createElement("span", "preview-note", "LFS \u672A\u62C9\u53D6"));\n    if (available && PREVIEW_KINDS.has(output.kind)) {\n        // \u64AD\u653E/\u9884\u89C8\u6309\u94AE\n        const open = createElement("button", "play-button", output.kind === "video" ? "\u25B6" : "\u2315");\n        open.type = "button";\n        open.title = output.kind === "video" ? "\u64AD\u653E" : "\u9884\u89C8";\n        open.addEventListener("click", (event) => {\n            event.stopPropagation();\n            openArtifact(item, items);\n        });\n        preview.append(open);\n    }\n    card.append(preview);\n\n    // \u5361\u7247\u5185\u5BB9\n    const body = createElement("div", "card-body");\n    // \u6807\u9898\u884C\n    const titleRow = createElement("div", "card-meta");\n    titleRow.append(createElement("h3", "card-title", output.name));\n    titleRow.append(kindBadge(output.kind));\n    body.append(titleRow);\n\n    // \u5143\u4FE1\u606F\n    const meta = createElement("div", "card-meta");\n    meta.append(createElement("span", "", item.label ?? shortId(item.run_id)));\n    meta.append(createElement("span", "", formatTime(item.started_at)));\n    meta.append(createElement("span", "", formatBytes(output.bytes)));\n    body.append(meta);\n\n    // \u64CD\u4F5C\u533A\n    const actions = createElement("div", "card-actions");\n    if (available && PREVIEW_KINDS.has(output.kind)) {\n        // \u6253\u5F00\u6309\u94AE\n        const open = createElement(\n            "button",\n            "button",\n            output.kind === "video" ? "\u64AD\u653E" : output.kind === "image" ? "\u67E5\u770B" : "\u9884\u89C8",\n        );\n        open.type = "button";\n        open.addEventListener("click", () => openArtifact(item, items));\n        actions.append(open);\n    }\n    // \u4E0B\u8F7D\u94FE\u63A5\n    const download = createElement("a", "button ghost", "\u4E0B\u8F7D");\n    download.href = output.download_url;\n    actions.append(download);\n    body.append(actions);\n    card.append(body);\n    return card;\n}\n\n/**\n * \u6253\u5F00\u4EA7\u7269\u3002\n */\nfunction openArtifact(item, list) {\n    // \u4EA7\u7269\n    const output = item.output;\n    if (output.present !== true) {\n        showToast("\u6587\u4EF6\u4E0D\u5B58\u5728\uFF0C\u53EF\u80FD\u5C1A\u672A\u4ECE Git LFS \u62C9\u53D6", true);\n        return;\n    }\n    if (output.lfs_pointer === true) {\n        showToast("\u8FD9\u662F Git LFS pointer\uFF0C\u8BF7\u5148\u6267\u884C git lfs pull", true);\n        return;\n    }\n    if (output.kind === "video" || output.kind === "audio") {\n        // \u53EF\u64AD\u653E\u6761\u76EE\n        const playable = playableItems(list ?? [item]);\n        // \u5F53\u524D\u7D22\u5F15\n        const index = playable.findIndex((entry) => entry.url === output.media_url);\n        openPlayer(playable, Math.max(index, 0));\n        return;\n    }\n    if (output.kind === "image") {\n        openImage(item);\n        return;\n    }\n    if (output.kind === "json" || output.kind === "text") {\n        void openText(item);\n        return;\n    }\n    window.location.href = output.download_url;\n}\n\n/**\n * \u53EF\u64AD\u653E\u5217\u8868\u3002\n */\nfunction playableItems(items) {\n    // \u7ED3\u679C\n    const out = [];\n    for (const item of items) {\n        // \u4EA7\u7269\n        const output = item.output;\n        if (output === undefined || output.present !== true || output.lfs_pointer === true) continue;\n        if (!PLAYABLE_KINDS.has(output.kind)) continue;\n        out.push({\n            title: `${item.label ?? item.run_id} \xB7 ${output.name}`,\n            url: output.media_url,\n            kind: output.kind,\n        });\n    }\n    return out;\n}\n\n/**\n * \u4EFB\u52A1\u9875\u3002\n */\nfunction renderTasks(data) {\n    // \u4EFB\u52A1\u5217\u8868\n    const tasks = Array.isArray(data.items) ? data.items : [];\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    // \u9875\u5934\u6587\u672C\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Tasks"));\n    headText.append(createElement("h2", "page-title", "\u4EFB\u52A1"));\n    headText.append(\n        createElement("p", "page-subtitle", `\u5171 ${data.total ?? tasks.length} \u4E2A\u4EFB\u52A1\uFF1B\u70B9\u51FB\u8BE6\u60C5\u67E5\u770B run \u4E0E\u4E8B\u4EF6\u3002`),\n    );\n    head.append(headText);\n    viewRoot.append(head);\n    if (tasks.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u4EFB\u52A1", "daoyan run / shot / batch \u521B\u5EFA\u7684\u4EFB\u52A1\u4F1A\u5728\u8FD9\u91CC\u51FA\u73B0\u3002"));\n        return;\n    }\n    viewRoot.append(renderTaskList(tasks));\n}\n\n/**\n * \u6E32\u67D3\u4EFB\u52A1\u5217\u8868\u3002\n */\nfunction renderTaskList(tasks) {\n    // \u5BB9\u5668\n    const list = createElement("div", "task-list");\n    for (const task of tasks) {\n        // \u4EFB\u52A1\u5361\u7247\n        const card = renderTaskCard(task);\n        list.append(card);\n        if (openTaskId === task.task_id) {\n            // \u8BE6\u60C5\u5BB9\u5668\n            const detail = card.querySelector(".task-detail");\n            void loadTaskDetail(task.task_id, detail);\n        }\n    }\n    return list;\n}\n\n/**\n * \u5355\u4E2A\u4EFB\u52A1\u5361\u7247\u3002\n */\nfunction renderTaskCard(task) {\n    // \u5361\u7247\n    const card = createElement("article", "task-card");\n    // \u5934\u90E8\n    const head = createElement("div", "task-head");\n    // \u6807\u9898\u533A\n    const title = createElement("div", "task-title");\n    title.append(statusBadge(task.status));\n    title.append(createElement("h3", "task-command", task.command));\n    title.append(badge(TASK_KIND_LABEL[task.kind] ?? task.kind, ""));\n    head.append(title);\n\n    // \u8BE6\u60C5\u6309\u94AE\n    const toggle = createElement("button", "button ghost task-toggle", openTaskId === task.task_id ? "\u6536\u8D77" : "\u8BE6\u60C5");\n    toggle.type = "button";\n    head.append(toggle);\n    card.append(head);\n\n    // \u5143\u4FE1\u606F\n    const meta = createElement("div", "task-meta");\n    meta.append(createElement("span", "", `task ${shortId(task.task_id)}`));\n    meta.append(createElement("span", "", `machine ${task.machine_id}`));\n    meta.append(createElement("span", "", `${task.run_count ?? 0} run`));\n    meta.append(createElement("span", "", formatTime(task.created_at)));\n    if (task.error !== null && task.error !== undefined) {\n        meta.append(createElement("span", "", `${task.error.code}: ${task.error.message}`));\n    }\n    card.append(meta);\n\n    // \u8BE6\u60C5\u5BB9\u5668\n    const detail = createElement("div", "task-detail");\n    detail.hidden = openTaskId !== task.task_id;\n    card.append(detail);\n    toggle.addEventListener("click", () => {\n        if (openTaskId === task.task_id) {\n            openTaskId = null;\n            detail.hidden = true;\n            toggle.textContent = "\u8BE6\u60C5";\n            return;\n        }\n        openTaskId = task.task_id;\n        for (const other of viewRoot.querySelectorAll(".task-detail")) other.hidden = true;\n        for (const button of viewRoot.querySelectorAll(".task-toggle")) button.textContent = "\u8BE6\u60C5";\n        detail.hidden = false;\n        toggle.textContent = "\u6536\u8D77";\n        void loadTaskDetail(task.task_id, detail);\n    });\n    return card;\n}\n\n/**\n * \u52A0\u8F7D\u4EFB\u52A1\u8BE6\u60C5\u3002\n */\nasync function loadTaskDetail(taskId, container) {\n    if (container === null) return;\n    container.hidden = false;\n    container.textContent = "\u52A0\u8F7D\u4E2D\u2026";\n    // \u7F13\u5B58\u9879\n    const cached = taskDetailCache.get(taskId);\n    if (cached !== undefined && Date.now() - cached.at < TASK_DETAIL_CACHE_MS) {\n        renderTaskDetail(container, cached.data);\n        return;\n    }\n    try {\n        // \u8BE6\u60C5\u6570\u636E\n        const data = await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`);\n        taskDetailCache.set(taskId, { at: Date.now(), data });\n        renderTaskDetail(container, data);\n    } catch (error) {\n        container.textContent = `\u52A0\u8F7D\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`;\n    }\n}\n\n/**\n * \u6E32\u67D3\u4EFB\u52A1\u8BE6\u60C5\u3002\n */\nfunction renderTaskDetail(container, data) {\n    clearNode(container);\n    // run \u5217\u8868\n    const runs = Array.isArray(data.runs_detail) ? data.runs_detail : [];\n    container.append(createElement("h4", "", `Runs\uFF08${runs.length}\uFF09`));\n    if (runs.length === 0) {\n        container.append(createElement("p", "muted", "\u8FD8\u6CA1\u6709 run\u3002"));\n    } else {\n        // run \u5217\u8868\u8282\u70B9\n        const list = createElement("ul", "run-list");\n        for (const run of runs) {\n            // run \u884C\n            const item = createElement("li", "run-item");\n            // run \u4E3B\u4FE1\u606F\n            const main = createElement("div", "run-main");\n            main.append(statusBadge(run.status));\n            main.append(createElement("code", "mono", shortId(run.run_id)));\n            main.append(createElement("span", "", run.label ?? "\u65E0 label"));\n            main.append(\n                createElement("span", "muted", `${run.outputs.length} \u4E2A\u4EA7\u7269 \xB7 ${formatDuration(run.duration_ms)}`),\n            );\n            item.append(main);\n\n            // run \u64CD\u4F5C\n            const actions = createElement("div", "card-actions");\n            // \u9996\u4E2A\u4EA7\u7269\n            const firstOutput = run.outputs[0];\n            if (\n                firstOutput !== undefined &&\n                firstOutput.present === true &&\n                firstOutput.lfs_pointer !== true &&\n                PREVIEW_KINDS.has(firstOutput.kind)\n            ) {\n                // \u9884\u89C8\u6309\u94AE\n                const preview = createElement("button", "button ghost", "\u9884\u89C8");\n                preview.type = "button";\n                preview.addEventListener("click", () => {\n                    openArtifact(artifactItemFromRun(run, firstOutput));\n                });\n                actions.append(preview);\n            }\n            item.append(actions);\n            list.append(item);\n        }\n        container.append(list);\n    }\n\n    // \u4E8B\u4EF6\n    const events = Array.isArray(data.events) ? data.events : [];\n    container.append(createElement("h4", "", `\u4E8B\u4EF6\uFF08${events.length}\uFF09`));\n    if (events.length === 0) {\n        container.append(createElement("p", "muted", "\u6682\u65E0\u4E8B\u4EF6\u3002"));\n        return;\n    }\n    // \u4E8B\u4EF6\u5217\u8868\n    const eventList = createElement("ul", "events");\n    for (const event of events) {\n        // \u4E8B\u4EF6\u884C\n        const item = createElement("li", "event");\n        item.append(createElement("span", "event-time", event.ts.slice(11, 19)));\n        item.append(createElement("span", "event-type", event.type));\n        // \u4E8B\u4EF6\u6570\u636E\u6587\u672C\n        const dataText = JSON.stringify(event.data ?? {});\n        item.append(\n            createElement("span", "event-data", dataText.length > 220 ? `${dataText.slice(0, 220)}\u2026` : dataText),\n        );\n        eventList.append(item);\n    }\n    container.append(eventList);\n}\n\n/**\n * \u7528 run \u4FE1\u606F\u6784\u9020\u4EA7\u7269\u6761\u76EE\u3002\n */\nfunction artifactItemFromRun(run, output) {\n    return {\n        run_id: run.run_id,\n        task_id: run.task_id,\n        machine_id: run.machine_id,\n        label: run.label,\n        run_status: run.status,\n        started_at: run.started_at,\n        finished_at: run.finished_at,\n        workflow: run.workflow.path,\n        prompt: run.prompt,\n        output,\n    };\n}\n\n/**\n * \u6210\u7247\u9875\u3002\n */\nfunction renderFinals(data) {\n    // \u6210\u7247\u5217\u8868\n    const items = Array.isArray(data) ? data : [];\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    // \u9875\u5934\u6587\u672C\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Final cuts"));\n    headText.append(createElement("h2", "page-title", "\u6210\u7247"));\n    headText.append(createElement("p", "page-subtitle", "daoyan wrap \u751F\u6210\u7684 final/cut-* \u6587\u4EF6\u3002"));\n    head.append(headText);\n    viewRoot.append(head);\n    if (items.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u6210\u7247", "\u5B8C\u6210\u81F3\u5C11\u4E24\u4E2A\u955C\u5934\u540E\u8FD0\u884C daoyan wrap\u3002"));\n        return;\n    }\n    // \u7F51\u683C\n    const grid = createElement("div", "grid");\n    for (const item of items) {\n        // \u5361\u7247\n        const card = createElement("article", "card final-card");\n        // \u9884\u89C8\u533A\n        const preview = createElement("div", "artifact-preview");\n        if (item.present === true && item.lfs_pointer !== true) {\n            // \u89C6\u9891\u9996\u5E27\n            const video = document.createElement("video");\n            video.src = `${item.media_url}#t=0.1`;\n            video.muted = true;\n            video.playsInline = true;\n            video.preload = "metadata";\n            preview.append(video);\n            // \u64AD\u653E\u6309\u94AE\n            const play = createElement("button", "play-button", "\u25B6");\n            play.type = "button";\n            play.title = "\u64AD\u653E\u6210\u7247";\n            play.addEventListener("click", () => {\n                openPlayer([{ title: item.name, url: item.media_url, kind: "video" }], 0);\n            });\n            preview.append(play);\n        } else {\n            preview.append(createElement("span", "preview-icon", "\u25B6"));\n            preview.append(\n                createElement("span", "preview-note", item.lfs_pointer === true ? "LFS \u672A\u62C9\u53D6" : "\u6587\u4EF6\u7F3A\u5931"),\n            );\n        }\n        card.append(preview);\n\n        // \u5361\u7247\u5185\u5BB9\n        const body = createElement("div", "card-body");\n        body.append(createElement("h3", "card-title", item.name));\n        // \u5143\u4FE1\u606F\n        const meta = createElement("div", "card-meta");\n        meta.append(createElement("span", "", item.created_at !== null ? formatTime(item.created_at) : "\u65E0 manifest"));\n        meta.append(createElement("span", "", formatBytes(item.bytes)));\n        meta.append(createElement("span", "", `${item.clips.length} \u6BB5`));\n        if (item.missing.length > 0) meta.append(createElement("span", "", `\u7F3A ${item.missing.length} \u955C`));\n        body.append(meta);\n\n        // \u64CD\u4F5C\u533A\n        const actions = createElement("div", "card-actions");\n        if (item.present === true && item.lfs_pointer !== true) {\n            // \u64AD\u653E\u6309\u94AE\n            const play = createElement("button", "button", "\u64AD\u653E");\n            play.type = "button";\n            play.addEventListener("click", () => {\n                openPlayer([{ title: item.name, url: item.media_url, kind: "video" }], 0);\n            });\n            actions.append(play);\n        }\n        // \u4E0B\u8F7D\u94FE\u63A5\n        const download = createElement("a", "button ghost", "\u4E0B\u8F7D");\n        download.href = item.download_url;\n        actions.append(download);\n        body.append(actions);\n        card.append(body);\n        grid.append(card);\n    }\n    viewRoot.append(grid);\n}\n\n/**\n * \u5DE5\u4F5C\u6D41\u9875\u3002\n */\nfunction renderWorkflows(data) {\n    // \u5DE5\u4F5C\u6D41\u5217\u8868\n    const items = Array.isArray(data) ? data : [];\n    // \u9875\u5934\n    const head = createElement("div", "view-head");\n    // \u9875\u5934\u6587\u672C\n    const headText = createElement("div");\n    headText.append(createElement("p", "eyebrow", "Workflows"));\n    headText.append(createElement("h2", "page-title", "\u5DE5\u4F5C\u6D41"));\n    headText.append(createElement("p", "page-subtitle", "workflows/ \u4E0B\u7684 ComfyUI API \u56FE\u4E0E bindings\u3002"));\n    head.append(headText);\n    viewRoot.append(head);\n    if (items.length === 0) {\n        viewRoot.append(emptyNode("\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u6D41", "\u8FD0\u884C daoyan workflow new / import \u521B\u5EFA\u5DE5\u4F5C\u6D41\u3002"));\n        return;\n    }\n    // \u8868\u683C\n    const list = createElement("div", "table-list");\n    // \u8868\u5934\n    const header = createElement("div", "table-row header");\n    for (const label of ["\u5DE5\u4F5C\u6D41", "\u8282\u70B9", "bindings", "\u9ED8\u8BA4", "\u72B6\u6001"]) header.append(createElement("span", "", label));\n    list.append(header);\n    for (const item of items) {\n        // \u6570\u636E\u884C\n        const row = createElement("div", "table-row");\n        // \u540D\u79F0\u533A\n        const name = createElement("div");\n        name.append(createElement("div", "workflow-name", item.name));\n        name.append(createElement("div", "muted mono", item.path));\n        row.append(name);\n        row.append(createElement("span", "", item.nodes));\n        row.append(createElement("span", "", item.bindings ? "\u6709" : "\u65E0"));\n        row.append(createElement("span", "", item.default ? "\u662F" : "\u2014"));\n        row.append(createElement("span", "", item.valid ? "\u53EF\u89E3\u6790" : "JSON \u635F\u574F"));\n        list.append(row);\n    }\n    viewRoot.append(list);\n}\n\n/**\n * \u6253\u5F00\u64AD\u653E\u5668\u3002\n */\nfunction openPlayer(items, index) {\n    if (items.length === 0) {\n        showToast("\u6CA1\u6709\u53EF\u64AD\u653E\u7684\u4EA7\u7269", true);\n        return;\n    }\n    playerItems = items.slice(0, MAX_PLAYLIST);\n    playerIndex = Math.max(0, Math.min(index, playerItems.length - 1));\n    renderPlayerItem();\n}\n\n/**\n * \u6E32\u67D3\u5F53\u524D\u64AD\u653E\u9879\u3002\n */\nfunction renderPlayerItem() {\n    // \u5F53\u524D\u9879\n    const item = playerItems[playerIndex];\n    if (item === undefined) {\n        closeModal();\n        return;\n    }\n    // \u5A92\u4F53\u5143\u7D20\n    const media = document.createElement(item.kind === "video" ? "video" : "audio");\n    media.controls = true;\n    media.autoplay = true;\n    media.playsInline = true;\n    media.src = item.url;\n    setModal(item.title, media, `${playerIndex + 1} / ${playerItems.length}`);\n    modalPrev.disabled = playerIndex <= 0;\n    modalNext.disabled = playerIndex >= playerItems.length - 1;\n}\n\n/**\n * \u6253\u5F00\u56FE\u7247\u3002\n */\nfunction openImage(item) {\n    // \u56FE\u7247\u5143\u7D20\n    const image = document.createElement("img");\n    image.src = item.output.media_url;\n    image.alt = item.output.name;\n    setModal(item.output.name, image, "\u56FE\u7247");\n    modalPrev.disabled = true;\n    modalNext.disabled = true;\n}\n\n/**\n * \u6253\u5F00\u6587\u672C\u9884\u89C8\u3002\n */\nasync function openText(item) {\n    // \u9884\u89C8\u8282\u70B9\n    const pre = createElement("pre", "", "\u52A0\u8F7D\u4E2D\u2026");\n    setModal(item.output.name, pre, "\u6587\u672C\u9884\u89C8");\n    modalPrev.disabled = true;\n    modalNext.disabled = true;\n    try {\n        // \u6587\u672C\u54CD\u5E94\n        const response = await fetch(item.output.media_url);\n        if (!response.ok) throw new Error(`HTTP ${response.status}`);\n        // \u539F\u59CB\u6587\u672C\n        const raw = await response.text();\n        // \u5C55\u793A\u6587\u672C\n        let text = raw;\n        if (item.output.kind === "json") {\n            try {\n                text = JSON.stringify(JSON.parse(raw), null, 2);\n            } catch {\n                text = raw;\n            }\n        }\n        pre.textContent =\n            text.length > TEXT_PREVIEW_LIMIT\n                ? `${text.slice(0, TEXT_PREVIEW_LIMIT)}\\n\\n\u2026\uFF08\u5DF2\u622A\u65AD\uFF0C\u5B8C\u6574\u5185\u5BB9\u8BF7\u4E0B\u8F7D\uFF09`\n                : text;\n    } catch (error) {\n        pre.textContent = `\u8BFB\u53D6\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`;\n    }\n}\n\n/**\n * \u8BBE\u7F6E\u6A21\u6001\u6846\u5185\u5BB9\u3002\n */\nfunction setModal(title, content, counter) {\n    modalTitle.textContent = title;\n    clearNode(modalContent);\n    modalContent.append(content);\n    modalCounter.textContent = counter ?? "";\n    modalRoot.hidden = false;\n}\n\n/**\n * \u5173\u95ED\u6A21\u6001\u6846\u3002\n */\nfunction closeModal() {\n    modalRoot.hidden = true;\n    clearNode(modalContent);\n    modalTitle.textContent = "\u9884\u89C8";\n    modalCounter.textContent = "";\n    playerItems = [];\n    playerIndex = 0;\n}\n\n/**\n * \u4E0A\u4E00\u4E2A\u64AD\u653E\u9879\u3002\n */\nfunction modalPrevStep() {\n    if (playerItems.length === 0 || playerIndex <= 0) return;\n    playerIndex -= 1;\n    renderPlayerItem();\n}\n\n/**\n * \u4E0B\u4E00\u4E2A\u64AD\u653E\u9879\u3002\n */\nfunction modalNextStep() {\n    if (playerItems.length === 0 || playerIndex >= playerItems.length - 1) return;\n    playerIndex += 1;\n    renderPlayerItem();\n}\n\n/**\n * \u952E\u76D8\u64CD\u4F5C\u3002\n */\nfunction handleKeydown(event) {\n    if (modalRoot.hidden) return;\n    if (event.key === "Escape") closeModal();\n    else if (event.key === "ArrowLeft") modalPrevStep();\n    else if (event.key === "ArrowRight") modalNextStep();\n}\n\n/**\n * \u542F\u52A8\u5E94\u7528\u3002\n */\nfunction start() {\n    renderShell();\n    renderNav();\n    setActiveNav();\n    modalClose.addEventListener("click", closeModal);\n    modalPrev.addEventListener("click", modalPrevStep);\n    modalNext.addEventListener("click", modalNextStep);\n    // \u906E\u7F69\u5C42\n    const backdrop = document.querySelector(".modal-backdrop");\n    if (backdrop !== null) backdrop.addEventListener("click", closeModal);\n    window.addEventListener("hashchange", onHashChange);\n    window.addEventListener("keydown", handleKeydown);\n    document.addEventListener("visibilitychange", () => {\n        if (!document.hidden) void loadCurrent();\n    });\n    void loadHeader();\n    onHashChange();\n}\n\nstart();\n';
  }
});

// src/core/web/ui/style.css
var style_default;
var init_style = __esm({
  "src/core/web/ui/style.css"() {
    style_default = '/* daoyan web \u2014\u2014 \u53EA\u8BFB\u9879\u76EE\u67E5\u770B\u5668\uFF1B\u539F\u751F CSS\uFF0C\u65E0\u5916\u90E8\u4F9D\u8D56\u3002 */\n:root {\n    color-scheme: light dark;\n    --bg: #f4f5f7;\n    --bg-elevated: #ffffff;\n    --bg-soft: #eceef2;\n    --panel: #ffffff;\n    --panel-strong: #ffffff;\n    --border: #d9dde4;\n    --border-strong: #c3c9d3;\n    --text: #1c2027;\n    --text-soft: #5c6470;\n    --text-muted: #8a919c;\n    --accent: #2f6fed;\n    --accent-soft: #e8f0ff;\n    --green: #16845b;\n    --green-soft: #e4f6ee;\n    --amber: #a56700;\n    --amber-soft: #fff2d9;\n    --red: #b42318;\n    --red-soft: #fde8e6;\n    --violet: #6b4fd8;\n    --violet-soft: #eee9ff;\n    --shadow: 0 10px 30px rgba(20, 28, 44, 0.08);\n    --radius: 14px;\n    --radius-sm: 10px;\n    --sidebar-width: 232px;\n}\n\n@media (prefers-color-scheme: dark) {\n    :root {\n        --bg: #101318;\n        --bg-elevated: #161a21;\n        --bg-soft: #1d222b;\n        --panel: #161a21;\n        --panel-strong: #1b2029;\n        --border: #2a303a;\n        --border-strong: #3a424f;\n        --text: #eef1f6;\n        --text-soft: #b3bac6;\n        --text-muted: #808895;\n        --accent: #7aa2ff;\n        --accent-soft: #1c2a4a;\n        --green: #5bd3a0;\n        --green-soft: #143329;\n        --amber: #f0b44c;\n        --amber-soft: #392b13;\n        --red: #ff8f86;\n        --red-soft: #3a1b1b;\n        --violet: #b19cff;\n        --violet-soft: #2a2148;\n        --shadow: 0 14px 40px rgba(0, 0, 0, 0.35);\n    }\n}\n\n* {\n    box-sizing: border-box;\n}\n\n[hidden] {\n    display: none !important;\n}\n\nhtml,\nbody {\n    margin: 0;\n    min-height: 100%;\n}\n\nbody {\n    background: var(--bg);\n    color: var(--text);\n    font-family:\n        -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;\n    font-size: 14px;\n    line-height: 1.55;\n    -webkit-font-smoothing: antialiased;\n}\n\nbutton,\ninput,\nselect {\n    font: inherit;\n    color: inherit;\n}\n\na {\n    color: var(--accent);\n    text-decoration: none;\n}\n\na:hover {\n    text-decoration: underline;\n}\n\n.app-shell {\n    display: grid;\n    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);\n    min-height: 100vh;\n}\n\n.sidebar {\n    position: sticky;\n    top: 0;\n    display: flex;\n    flex-direction: column;\n    gap: 22px;\n    height: 100vh;\n    padding: 24px 16px 18px;\n    border-right: 1px solid var(--border);\n    background: var(--bg-elevated);\n}\n\n.brand {\n    padding: 0 8px;\n}\n\n.brand-mark {\n    display: inline-flex;\n    align-items: center;\n    gap: 8px;\n    font-size: 17px;\n    font-weight: 700;\n    letter-spacing: 0.01em;\n}\n\n.brand-dot {\n    display: inline-block;\n    width: 10px;\n    height: 10px;\n    border-radius: 50%;\n    background: var(--accent);\n    box-shadow: 0 0 0 4px var(--accent-soft);\n}\n\n.brand-sub {\n    margin: 6px 0 0;\n    color: var(--text-muted);\n    font-size: 12px;\n}\n\n.nav {\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n}\n\n.nav-item {\n    display: flex;\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 1px;\n    width: 100%;\n    padding: 9px 10px;\n    border: 0;\n    border-radius: 9px;\n    background: transparent;\n    cursor: pointer;\n    text-align: left;\n}\n\n.nav-item:hover {\n    background: var(--bg-soft);\n}\n\n.nav-item.active {\n    background: var(--accent-soft);\n    color: var(--accent);\n}\n\n.nav-label {\n    font-weight: 600;\n}\n\n.nav-hint {\n    color: var(--text-muted);\n    font-size: 11px;\n}\n\n.nav-item.active .nav-hint {\n    color: color-mix(in srgb, var(--accent) 72%, var(--text-muted));\n}\n\n.sidebar-foot {\n    margin-top: auto;\n    padding: 12px 10px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    color: var(--text-muted);\n    font-size: 11px;\n    line-height: 1.5;\n}\n\n.sidebar-foot code {\n    color: var(--text-soft);\n    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n    font-size: 11px;\n}\n\n.main {\n    min-width: 0;\n}\n\n.topbar {\n    position: sticky;\n    top: 0;\n    z-index: 10;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 16px;\n    padding: 16px 28px;\n    border-bottom: 1px solid var(--border);\n    background: color-mix(in srgb, var(--bg) 88%, transparent);\n    backdrop-filter: blur(12px);\n}\n\n.topbar-left {\n    display: flex;\n    align-items: baseline;\n    gap: 12px;\n    min-width: 0;\n}\n\n.project-name {\n    margin: 0;\n    overflow: hidden;\n    font-size: 16px;\n    font-weight: 700;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.project-mode {\n    flex: none;\n    padding: 2px 8px;\n    border: 1px solid var(--border);\n    border-radius: 99px;\n    color: var(--text-soft);\n    font-size: 11px;\n}\n\n.topbar-right {\n    display: flex;\n    align-items: center;\n    gap: 14px;\n    color: var(--text-muted);\n    font-size: 12px;\n}\n\n.connection {\n    display: inline-flex;\n    align-items: center;\n    gap: 6px;\n}\n\n.connection-dot {\n    width: 7px;\n    height: 7px;\n    border-radius: 50%;\n    background: var(--text-muted);\n}\n\n.connection.ok .connection-dot {\n    background: var(--green);\n    box-shadow: 0 0 0 3px var(--green-soft);\n}\n\n.connection.error .connection-dot {\n    background: var(--red);\n    box-shadow: 0 0 0 3px var(--red-soft);\n}\n\n.content {\n    max-width: 1280px;\n    margin: 0 auto;\n    padding: 28px;\n}\n\n.view-head {\n    display: flex;\n    align-items: flex-end;\n    justify-content: space-between;\n    gap: 20px;\n    margin-bottom: 22px;\n}\n\n.eyebrow {\n    margin: 0 0 4px;\n    color: var(--text-muted);\n    font-size: 11px;\n    font-weight: 600;\n    letter-spacing: 0.08em;\n    text-transform: uppercase;\n}\n\n.page-title {\n    margin: 0;\n    font-size: 26px;\n    letter-spacing: -0.02em;\n}\n\n.page-subtitle {\n    margin: 6px 0 0;\n    color: var(--text-soft);\n    font-size: 13px;\n}\n\n.stats-grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));\n    gap: 12px;\n    margin-bottom: 20px;\n}\n\n.stat-card {\n    padding: 16px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius);\n    background: var(--panel);\n}\n\n.stat-label {\n    margin: 0;\n    color: var(--text-muted);\n    font-size: 12px;\n}\n\n.stat-value {\n    margin: 6px 0 0;\n    font-size: 24px;\n    font-weight: 700;\n    letter-spacing: -0.02em;\n}\n\n.stat-hint {\n    margin: 4px 0 0;\n    color: var(--text-muted);\n    font-size: 11px;\n}\n\n.layout-two {\n    display: grid;\n    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);\n    gap: 16px;\n    margin-bottom: 20px;\n}\n\n.panel {\n    padding: 18px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius);\n    background: var(--panel);\n}\n\n.panel-head {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n    margin-bottom: 12px;\n}\n\n.panel-title {\n    margin: 0;\n    font-size: 15px;\n    font-weight: 700;\n}\n\n.panel-sub {\n    margin: 2px 0 0;\n    color: var(--text-muted);\n    font-size: 12px;\n}\n\n.kv {\n    display: grid;\n    grid-template-columns: 92px minmax(0, 1fr);\n    gap: 7px 12px;\n    margin: 0;\n    font-size: 13px;\n}\n\n.kv dt {\n    color: var(--text-muted);\n}\n\n.kv dd {\n    margin: 0;\n    overflow-wrap: anywhere;\n}\n\n.badge {\n    display: inline-flex;\n    align-items: center;\n    gap: 5px;\n    padding: 2px 8px;\n    border-radius: 99px;\n    background: var(--bg-soft);\n    color: var(--text-soft);\n    font-size: 11px;\n    font-weight: 600;\n    white-space: nowrap;\n}\n\n.badge.status-succeeded {\n    background: var(--green-soft);\n    color: var(--green);\n}\n\n.badge.status-running {\n    background: var(--accent-soft);\n    color: var(--accent);\n}\n\n.badge.status-queued {\n    background: var(--amber-soft);\n    color: var(--amber);\n}\n\n.badge.status-failed {\n    background: var(--red-soft);\n    color: var(--red);\n}\n\n.badge.status-cancelled,\n.badge.status-interrupted {\n    background: var(--violet-soft);\n    color: var(--violet);\n}\n\n.badge.kind-video {\n    background: var(--violet-soft);\n    color: var(--violet);\n}\n\n.badge.kind-image {\n    background: var(--green-soft);\n    color: var(--green);\n}\n\n.badge.kind-audio {\n    background: var(--amber-soft);\n    color: var(--amber);\n}\n\n.badge.kind-json,\n.badge.kind-text {\n    background: var(--accent-soft);\n    color: var(--accent);\n}\n\n.muted {\n    color: var(--text-muted);\n}\n\n.mono {\n    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n    font-size: 12px;\n}\n\n.section-head {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n    margin: 24px 0 12px;\n}\n\n.section-title {\n    margin: 0;\n    font-size: 16px;\n    font-weight: 700;\n}\n\n.section-meta {\n    color: var(--text-muted);\n    font-size: 12px;\n}\n\n.grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));\n    gap: 14px;\n}\n\n.card {\n    overflow: hidden;\n    border: 1px solid var(--border);\n    border-radius: var(--radius);\n    background: var(--panel);\n}\n\n.card-body {\n    padding: 13px 14px 14px;\n}\n\n.card-title {\n    margin: 0;\n    overflow: hidden;\n    font-size: 14px;\n    font-weight: 700;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.card-meta {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 6px 10px;\n    margin-top: 7px;\n    color: var(--text-muted);\n    font-size: 11px;\n}\n\n.card-actions {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 8px;\n    margin-top: 12px;\n}\n\n.artifact-card {\n    display: flex;\n    flex-direction: column;\n}\n\n.artifact-preview {\n    position: relative;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    aspect-ratio: 16 / 10;\n    overflow: hidden;\n    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--bg-soft)), var(--bg-soft));\n}\n\n.artifact-preview video,\n.artifact-preview img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.artifact-preview .preview-icon {\n    font-size: 38px;\n    opacity: 0.65;\n}\n\n.artifact-preview .preview-note {\n    position: absolute;\n    inset: auto 8px 8px;\n    padding: 4px 8px;\n    border-radius: 8px;\n    background: rgba(0, 0, 0, 0.62);\n    color: #fff;\n    font-size: 11px;\n    text-align: center;\n}\n\n.play-button {\n    position: absolute;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    width: 46px;\n    height: 46px;\n    border: 0;\n    border-radius: 50%;\n    background: rgba(0, 0, 0, 0.62);\n    color: #fff;\n    cursor: pointer;\n    font-size: 18px;\n}\n\n.play-button:hover {\n    background: var(--accent);\n}\n\n.button {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: 6px;\n    padding: 6px 11px;\n    border: 1px solid var(--border-strong);\n    border-radius: 8px;\n    background: var(--panel-strong);\n    cursor: pointer;\n    font-size: 12px;\n    font-weight: 600;\n}\n\n.button:hover {\n    border-color: var(--accent);\n    color: var(--accent);\n}\n\n.button.primary {\n    border-color: var(--accent);\n    background: var(--accent);\n    color: #fff;\n}\n\n.button.primary:hover {\n    color: #fff;\n    filter: brightness(1.06);\n}\n\n.button.ghost {\n    border-color: transparent;\n    background: transparent;\n    color: var(--text-soft);\n}\n\n.button:disabled {\n    cursor: not-allowed;\n    opacity: 0.4;\n}\n\n.icon-button {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    width: 34px;\n    height: 34px;\n    border: 1px solid var(--border);\n    border-radius: 9px;\n    background: transparent;\n    cursor: pointer;\n    font-size: 20px;\n    line-height: 1;\n}\n\n.filter-bar {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 10px;\n    margin-bottom: 16px;\n    padding: 12px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius);\n    background: var(--panel);\n}\n\n.field {\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n}\n\n.field-label {\n    color: var(--text-muted);\n    font-size: 11px;\n    font-weight: 600;\n}\n\n.input,\n.select {\n    min-width: 140px;\n    padding: 7px 9px;\n    border: 1px solid var(--border);\n    border-radius: 8px;\n    background: var(--bg-elevated);\n    font-size: 12px;\n}\n\n.input:focus,\n.select:focus {\n    border-color: var(--accent);\n    outline: 2px solid var(--accent-soft);\n}\n\n.input.search {\n    min-width: 210px;\n}\n\n.shot-card {\n    display: flex;\n    flex-direction: column;\n    gap: 10px;\n    padding: 14px;\n}\n\n.shot-title {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: baseline;\n    gap: 8px;\n    min-width: 0;\n}\n\n.shot-head {\n    display: flex;\n    align-items: flex-start;\n    justify-content: space-between;\n    gap: 10px;\n}\n\n.shot-id {\n    font-size: 18px;\n    font-weight: 800;\n    letter-spacing: -0.02em;\n}\n\n.shot-slug {\n    color: var(--text-muted);\n    font-size: 12px;\n}\n\n.prompt {\n    display: -webkit-box;\n    overflow: hidden;\n    margin: 0;\n    color: var(--text-soft);\n    font-size: 12px;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: 3;\n}\n\n.meta-row {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px 12px;\n    color: var(--text-muted);\n    font-size: 11px;\n}\n\n.task-list {\n    display: flex;\n    flex-direction: column;\n    gap: 10px;\n}\n\n.task-card {\n    padding: 14px 16px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius);\n    background: var(--panel);\n}\n\n.task-head {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n}\n\n.task-title {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 8px;\n    min-width: 0;\n}\n\n.task-command {\n    margin: 0;\n    font-size: 14px;\n    font-weight: 700;\n}\n\n.task-meta {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px 12px;\n    margin-top: 7px;\n    color: var(--text-muted);\n    font-size: 11px;\n}\n\n.task-detail {\n    margin-top: 14px;\n    padding-top: 14px;\n    border-top: 1px dashed var(--border);\n}\n\n.task-detail h4 {\n    margin: 0 0 8px;\n    font-size: 13px;\n}\n\n.run-list {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    margin: 0;\n    padding: 0;\n    list-style: none;\n}\n\n.run-item {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    padding: 8px 10px;\n    border-radius: 8px;\n    background: var(--bg-soft);\n    font-size: 12px;\n}\n\n.run-main {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 8px;\n    min-width: 0;\n}\n\n.events {\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    max-height: 320px;\n    margin: 0;\n    padding: 0;\n    overflow: auto;\n    list-style: none;\n}\n\n.event {\n    display: grid;\n    grid-template-columns: 48px 132px minmax(0, 1fr);\n    gap: 8px;\n    padding: 4px 6px;\n    border-radius: 6px;\n    color: var(--text-soft);\n    font-size: 11px;\n}\n\n.event:nth-child(odd) {\n    background: var(--bg-soft);\n}\n\n.event-time {\n    color: var(--text-muted);\n}\n\n.event-type {\n    font-weight: 600;\n}\n\n.event-data {\n    overflow: hidden;\n    color: var(--text-muted);\n    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.table-list {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n}\n\n.table-row {\n    display: grid;\n    grid-template-columns: minmax(150px, 1.4fr) 80px 80px 90px minmax(0, 1fr);\n    gap: 10px;\n    align-items: center;\n    padding: 11px 14px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    background: var(--panel);\n    font-size: 12px;\n}\n\n.table-row.header {\n    border-color: transparent;\n    background: transparent;\n    color: var(--text-muted);\n    font-size: 11px;\n    font-weight: 600;\n}\n\n.workflow-name {\n    font-weight: 700;\n}\n\n.final-card .artifact-preview {\n    aspect-ratio: 16 / 9;\n}\n\n.empty {\n    padding: 42px 20px;\n    border: 1px dashed var(--border-strong);\n    border-radius: var(--radius);\n    background: var(--panel);\n    color: var(--text-muted);\n    text-align: center;\n}\n\n.empty-title {\n    margin: 0 0 5px;\n    color: var(--text-soft);\n    font-size: 15px;\n    font-weight: 700;\n}\n\n.empty-body {\n    margin: 0;\n    font-size: 12px;\n}\n\n.loading {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 10px;\n    padding: 60px 20px;\n    color: var(--text-muted);\n    font-size: 13px;\n}\n\n.spinner {\n    width: 18px;\n    height: 18px;\n    border: 2px solid var(--border);\n    border-top-color: var(--accent);\n    border-radius: 50%;\n    animation: spin 0.8s linear infinite;\n}\n\n@keyframes spin {\n    to {\n        transform: rotate(360deg);\n    }\n}\n\n.error-banner {\n    margin-bottom: 16px;\n    padding: 10px 13px;\n    border: 1px solid color-mix(in srgb, var(--red) 35%, var(--border));\n    border-radius: var(--radius-sm);\n    background: var(--red-soft);\n    color: var(--red);\n    font-size: 12px;\n}\n\n.callout {\n    margin-bottom: 18px;\n    padding: 13px 15px;\n    border: 1px solid var(--border);\n    border-left: 3px solid var(--amber);\n    border-radius: var(--radius-sm);\n    background: var(--amber-soft);\n    color: var(--text-soft);\n    font-size: 12px;\n}\n\n.callout strong {\n    color: var(--text);\n}\n\n.modal {\n    position: fixed;\n    inset: 0;\n    z-index: 50;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 24px;\n}\n\n.modal-backdrop {\n    position: absolute;\n    inset: 0;\n    background: rgba(7, 10, 16, 0.72);\n    backdrop-filter: blur(4px);\n}\n\n.modal-panel {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    width: min(100%, 980px);\n    max-height: calc(100vh - 48px);\n    overflow: hidden;\n    border: 1px solid var(--border-strong);\n    border-radius: 18px;\n    background: var(--panel-strong);\n    box-shadow: var(--shadow);\n}\n\n.modal-head {\n    display: flex;\n    align-items: flex-start;\n    justify-content: space-between;\n    gap: 16px;\n    padding: 16px 18px;\n    border-bottom: 1px solid var(--border);\n}\n\n.modal-heading h2 {\n    margin: 0;\n    overflow: hidden;\n    font-size: 17px;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.modal-content {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-height: 220px;\n    padding: 16px;\n    overflow: auto;\n    background: #05070a;\n}\n\n.modal-content video,\n.modal-content audio {\n    width: 100%;\n    max-height: calc(100vh - 260px);\n    border-radius: 10px;\n}\n\n.modal-content audio {\n    max-width: 620px;\n}\n\n.modal-content img {\n    max-width: 100%;\n    max-height: calc(100vh - 250px);\n    border-radius: 10px;\n    object-fit: contain;\n}\n\n.modal-content pre {\n    width: 100%;\n    max-height: calc(100vh - 260px);\n    margin: 0;\n    padding: 16px;\n    overflow: auto;\n    border-radius: 10px;\n    background: #0d1117;\n    color: #d6deeb;\n    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n    font-size: 12px;\n    line-height: 1.6;\n    white-space: pre-wrap;\n}\n\n.modal-foot {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n    padding: 10px 16px;\n    border-top: 1px solid var(--border);\n}\n\n.toast {\n    position: fixed;\n    right: 24px;\n    bottom: 24px;\n    z-index: 60;\n    max-width: 360px;\n    padding: 10px 14px;\n    border: 1px solid var(--border-strong);\n    border-radius: 10px;\n    background: var(--panel-strong);\n    box-shadow: var(--shadow);\n    font-size: 12px;\n}\n\n.toast.error {\n    border-color: color-mix(in srgb, var(--red) 45%, var(--border));\n    color: var(--red);\n}\n\n.profile-panel {\n    margin-bottom: 20px;\n}\n\n.profile-synopsis {\n    margin: 0 0 14px;\n    padding: 12px 14px;\n    border-left: 3px solid var(--accent);\n    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;\n    background: var(--accent-soft);\n    color: var(--text-soft);\n    font-size: 13px;\n    line-height: 1.65;\n}\n\n.entity-section {\n    margin-bottom: 8px;\n}\n\n.entity-grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));\n    gap: 12px;\n}\n\n.entity-card {\n    padding: 14px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius);\n    background: var(--panel);\n}\n\n.entity-head {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n}\n\n.entity-name {\n    margin: 0;\n    font-size: 15px;\n    font-weight: 700;\n}\n\n.entity-desc {\n    margin: 8px 0 0;\n    color: var(--text-soft);\n    font-size: 12px;\n    line-height: 1.6;\n}\n\n.entity-ref {\n    margin: 6px 0 0;\n    color: var(--text-muted);\n    font-size: 11px;\n}\n\n.chip-row {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 6px;\n}\n\n.chip {\n    display: inline-flex;\n    align-items: center;\n    padding: 3px 8px;\n    border: 1px solid var(--border);\n    border-radius: 99px;\n    background: var(--bg-soft);\n    color: var(--text-soft);\n    font-size: 11px;\n    white-space: nowrap;\n}\n\n.chip-small {\n    padding: 2px 7px;\n    font-size: 10px;\n}\n\n.chip-character {\n    border-color: color-mix(in srgb, var(--green) 30%, var(--border));\n    background: var(--green-soft);\n    color: var(--green);\n}\n\n.chip-scene {\n    border-color: color-mix(in srgb, var(--violet) 30%, var(--border));\n    background: var(--violet-soft);\n    color: var(--violet);\n}\n\n.storyboard-section {\n    margin-top: 8px;\n}\n\n.storyboard-list {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n}\n\n.storyboard-row {\n    display: grid;\n    grid-template-columns: 96px minmax(220px, 1.8fr) 120px minmax(140px, 1fr) 110px;\n    gap: 12px;\n    align-items: center;\n    padding: 12px 14px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    background: var(--panel);\n    font-size: 12px;\n}\n\n.storyboard-header {\n    padding-top: 0;\n    padding-bottom: 4px;\n    border-color: transparent;\n    background: transparent;\n    color: var(--text-muted);\n    font-size: 11px;\n    font-weight: 600;\n}\n\n.storyboard-id-cell {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 6px;\n}\n\n.storyboard-id {\n    font-size: 16px;\n    font-weight: 800;\n    letter-spacing: -0.02em;\n}\n\n.storyboard-content {\n    min-width: 0;\n}\n\n.storyboard-title {\n    overflow: hidden;\n    font-weight: 700;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.storyboard-summary {\n    display: -webkit-box;\n    overflow: hidden;\n    margin: 3px 0 0;\n    color: var(--text-muted);\n    font-size: 11px;\n    -webkit-box-orient: vertical;\n    -webkit-line-clamp: 2;\n}\n\n.storyboard-artifacts {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 6px;\n}\n\n.shot-grid {\n    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));\n}\n\n.shot-card-rich {\n    gap: 12px;\n}\n\n.shot-title-text {\n    overflow: hidden;\n    font-size: 15px;\n    font-weight: 700;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.shot-summary {\n    margin: 0;\n    color: var(--text-soft);\n    font-size: 13px;\n    line-height: 1.7;\n}\n\n.shot-line {\n    display: flex;\n    align-items: flex-start;\n    gap: 10px;\n}\n\n.shot-line-label {\n    flex: none;\n    padding-top: 3px;\n    color: var(--text-muted);\n    font-size: 11px;\n    font-weight: 600;\n}\n\n.shot-meta-grid {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px 12px;\n    padding: 10px 12px;\n    border-radius: var(--radius-sm);\n    background: var(--bg-soft);\n    color: var(--text-muted);\n    font-size: 11px;\n}\n\n.shot-prompt,\n.shot-runs {\n    border-top: 1px dashed var(--border);\n    padding-top: 10px;\n}\n\n.shot-prompt summary,\n.shot-runs summary {\n    color: var(--text-soft);\n    cursor: pointer;\n    font-size: 12px;\n    font-weight: 600;\n}\n\n.shot-prompt p {\n    margin: 8px 0 0;\n    color: var(--text-soft);\n    font-size: 12px;\n    line-height: 1.7;\n    white-space: pre-wrap;\n}\n\n.shot-notes {\n    margin: 0;\n    color: var(--text-muted);\n    font-size: 12px;\n}\n\n.shot-section-head {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n    margin-top: 4px;\n}\n\n.shot-section-head h4 {\n    margin: 0;\n    font-size: 13px;\n}\n\n.artifact-list {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n}\n\n.artifact-row {\n    display: grid;\n    grid-template-columns: 84px minmax(0, 1fr) auto;\n    gap: 10px;\n    align-items: center;\n    padding: 8px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    background: var(--bg-elevated);\n}\n\n.artifact-thumb {\n    position: relative;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    width: 84px;\n    height: 56px;\n    overflow: hidden;\n    border-radius: 7px;\n    background: var(--bg-soft);\n}\n\n.artifact-thumb video,\n.artifact-thumb img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.artifact-thumb-icon {\n    font-size: 22px;\n    opacity: 0.7;\n}\n\n.artifact-thumb-note {\n    position: absolute;\n    inset: auto 3px 3px;\n    padding: 1px 4px;\n    border-radius: 4px;\n    background: rgba(0, 0, 0, 0.65);\n    color: #fff;\n    font-size: 9px;\n    text-align: center;\n}\n\n.artifact-info {\n    min-width: 0;\n}\n\n.artifact-name {\n    overflow: hidden;\n    font-size: 12px;\n    font-weight: 700;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.artifact-meta {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 5px 8px;\n    margin-top: 4px;\n    color: var(--text-muted);\n    font-size: 10px;\n}\n\n.artifact-row-actions {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 4px;\n}\n\n@media (max-width: 980px) {\n    .app-shell {\n        grid-template-columns: 1fr;\n    }\n\n    .sidebar {\n        position: static;\n        display: block;\n        height: auto;\n        padding: 16px;\n        border-right: 0;\n        border-bottom: 1px solid var(--border);\n    }\n\n    .brand-sub,\n    .sidebar-foot {\n        display: none;\n    }\n\n    .nav {\n        flex-direction: row;\n        flex-wrap: wrap;\n        margin-top: 12px;\n    }\n\n    .nav-item {\n        width: auto;\n        padding: 7px 10px;\n    }\n\n    .nav-hint {\n        display: none;\n    }\n\n    .topbar {\n        padding: 12px 18px;\n    }\n\n    .content {\n        padding: 18px;\n    }\n\n    .stats-grid {\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n    }\n\n    .layout-two {\n        grid-template-columns: 1fr;\n    }\n\n    .shot-grid {\n        grid-template-columns: 1fr;\n    }\n\n    .storyboard-row {\n        grid-template-columns: 1fr;\n        gap: 6px;\n    }\n\n    .storyboard-header {\n        display: none;\n    }\n\n    .artifact-row {\n        grid-template-columns: 72px minmax(0, 1fr);\n    }\n\n    .artifact-row-actions {\n        grid-column: 1 / -1;\n        justify-content: flex-end;\n    }\n\n    .table-row {\n        grid-template-columns: minmax(0, 1fr) 70px 70px;\n    }\n\n    .table-row.header span:nth-child(n + 3) {\n        display: none;\n    }\n}\n\n@media (max-width: 560px) {\n    .stats-grid {\n        grid-template-columns: 1fr;\n    }\n\n    .grid {\n        grid-template-columns: 1fr;\n    }\n\n    .entity-grid {\n        grid-template-columns: 1fr;\n    }\n\n    .artifact-row {\n        grid-template-columns: 64px minmax(0, 1fr);\n    }\n\n    .artifact-thumb {\n        width: 64px;\n        height: 46px;\n    }\n\n    .view-head {\n        align-items: flex-start;\n        flex-direction: column;\n    }\n\n    .modal {\n        padding: 8px;\n    }\n\n    .modal-panel {\n        max-height: calc(100vh - 16px);\n        border-radius: 12px;\n    }\n\n    .event {\n        grid-template-columns: 38px 100px minmax(0, 1fr);\n    }\n}\n\n/* ---- story / episode ---- */\n.episode-card {\n    min-height: 100%;\n}\n\n.script-text {\n    margin: 0 0 18px;\n    padding: 16px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    background: var(--panel);\n    color: var(--text);\n    font-family: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;\n    font-size: 12.5px;\n    line-height: 1.7;\n    white-space: pre-wrap;\n    word-break: break-word;\n    max-height: 460px;\n    overflow: auto;\n}\n\n.form-block {\n    margin-top: 14px;\n    padding-top: 12px;\n    border-top: 1px solid var(--border);\n}\n\n.form-title {\n    margin: 0 0 8px;\n    font-size: 13px;\n    color: var(--text-soft);\n}\n\n.asset-tile,\n.asset-compact {\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    min-width: 0;\n}\n\n.asset-tile img,\n.asset-compact img {\n    width: 100%;\n    max-height: 220px;\n    object-fit: contain;\n    border-radius: var(--radius-sm);\n    background: var(--bg-soft);\n    border: 1px solid var(--border);\n}\n\n.asset-compact img {\n    max-height: 96px;\n}\n\n.asset-tile audio,\n.asset-compact audio {\n    width: 100%;\n}\n\n.asset-name {\n    font-size: 10.5px;\n    color: var(--text-muted);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.asset-missing {\n    display: inline-flex;\n    align-items: center;\n    min-height: 64px;\n    padding: 10px 12px;\n    border: 1px dashed var(--border-strong);\n    border-radius: var(--radius-sm);\n    color: var(--text-muted);\n    font-size: 12px;\n    background: var(--bg-soft);\n}\n\n.asset-row {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));\n    gap: 8px;\n    margin-top: 8px;\n}\n\n.mini-list {\n    margin: 8px 0 0;\n    padding-left: 18px;\n    color: var(--text-soft);\n    font-size: 12.5px;\n    line-height: 1.65;\n}\n\n.text-warn {\n    color: var(--amber);\n}\n\n.callout.warn {\n    border-color: var(--amber);\n    background: var(--amber-soft);\n}\n\n.task-list {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    margin-bottom: 18px;\n}\n\n.task-row {\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    padding: 10px 12px;\n    border: 1px solid var(--border);\n    border-radius: var(--radius-sm);\n    background: var(--panel);\n    font-size: 12.5px;\n}\n\n.task-row > span:nth-child(2) {\n    flex: 1;\n    min-width: 0;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    color: var(--text-soft);\n}\n\n.quote {\n    margin: 10px 0 0;\n    padding: 8px 12px;\n    border-left: 3px solid var(--violet);\n    background: var(--violet-soft);\n    color: var(--text-soft);\n    font-size: 12.5px;\n    line-height: 1.6;\n}\n\n.badge.stage-script,\n.badge.stage-breakdown {\n    background: var(--amber-soft);\n    color: var(--amber);\n}\n\n.badge.stage-assets,\n.badge.stage-storyboard,\n.badge.stage-workflow {\n    background: var(--violet-soft);\n    color: var(--violet);\n}\n\n.badge.stage-ready,\n.badge.stage-wrapped {\n    background: var(--green-soft);\n    color: var(--green);\n}\n';
  }
});

// src/commands/web.mts
import { spawn as spawn7 } from "child_process";
function parseArgs4(args) {
  const out = { open: false };
  for (let i = 0; i < args.length; i++) {
    const { name, inline } = splitInlineFlag(args[i] ?? "");
    if (name === "--host") {
      const v = takeValue(args, i, inline, "--host");
      out.host = v.value;
      i += v.skip;
      continue;
    }
    if (name === "--port") {
      const v = takeValue(args, i, inline, "--port");
      const port = Number(v.value);
      if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
        usageError(`--port \u9700\u8981 0-${MAX_PORT} \u7684\u6574\u6570\uFF080 \u8868\u793A\u7CFB\u7EDF\u5206\u914D\uFF09`);
      }
      out.port = port;
      i += v.skip;
      continue;
    }
    if (name === "--open") {
      out.open = true;
      continue;
    }
    usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
  }
  return out;
}
function openBrowser(url) {
  let command = "xdg-open";
  let args = [url];
  if (process.platform === "darwin") command = "open";
  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  }
  try {
    const child = spawn7(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {
      warn(`\u65E0\u6CD5\u81EA\u52A8\u6253\u5F00\u6D4F\u89C8\u5668\uFF08${command}\uFF09\uFF1B\u8BF7\u624B\u52A8\u8BBF\u95EE ${url}`);
    });
    child.unref();
    return true;
  } catch (e) {
    warn(`\u65E0\u6CD5\u81EA\u52A8\u6253\u5F00\u6D4F\u89C8\u5668\uFF1A${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
function isLoopbackHost2(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
}
async function runWeb(ctx2, args) {
  const flags = parseArgs4(args);
  const { root, config: project } = requireProject(ctx2);
  const machine = loadMachineIfExists(root);
  const shots = loadShotsIfExists(root);
  const { COMMANDS: COMMANDS2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
  const host = flags.host ?? DEFAULT_HOST2;
  if (!isLoopbackHost2(host)) {
    warn(`\u76D1\u542C ${host}\uFF1A\u5C40\u57DF\u7F51\u5185\u53EF\u8BBF\u95EE\u9879\u76EE\u4EA7\u51FA\u7269\uFF0C\u8BF7\u786E\u8BA4\u7F51\u7EDC\u73AF\u5883\u53EF\u4FE1`);
  }
  let handle;
  try {
    handle = await startWebServer({
      root,
      project,
      machine,
      shots,
      commands: COMMANDS2,
      assets: { index_html: ui_default, app_js: app_default, style_css: style_default },
      host,
      port: flags.port ?? DEFAULT_PORT
    });
  } catch (e) {
    throw new DaoyanCliError({
      code: "web_start_failed",
      message: `\u65E0\u6CD5\u542F\u52A8 Web \u670D\u52A1\uFF1A${e instanceof Error ? e.message : String(e)}`,
      hint: START_FAILED_HINT
    });
  }
  if (ctx2.json) {
    emitData({
      url: handle.url,
      host: handle.host,
      port: handle.port,
      project: project.name,
      mode: machine?.engine.mode ?? null
    });
  } else {
    say(`daoyan web \xB7 ${project.name} \xB7 ${machine?.engine.mode ?? "\u672A\u7ED1\u5B9A\u672C\u673A"}`);
    say(`  ${handle.url}`);
    say("  Ctrl+C \u505C\u6B62");
  }
  if (flags.open) openBrowser(handle.url);
  async function shutdown() {
    try {
      await handle.close();
    } catch (e) {
      warn(`\u5173\u95ED Web \u670D\u52A1\u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const offSignal = onSignal(() => {
    void shutdown();
  });
  await handle.closed;
  offSignal();
  if (!ctx2.json) say("\u5DF2\u505C\u6B62");
  return 0;
}
var DEFAULT_HOST2, DEFAULT_PORT, MAX_PORT, START_FAILED_HINT;
var init_web = __esm({
  "src/commands/web.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_args();
    init_config();
    init_signals();
    init_server();
    init_ui();
    init_app();
    init_style();
    DEFAULT_HOST2 = "127.0.0.1";
    DEFAULT_PORT = 0;
    MAX_PORT = 65535;
    START_FAILED_HINT = "\u68C0\u67E5\u76D1\u542C\u5730\u5740\u4E0E\u7AEF\u53E3\u5360\u7528\uFF1B\u7AEF\u53E3\u51B2\u7A81\u65F6\u7701\u7565 --port \u8BA9\u7CFB\u7EDF\u5206\u914D\uFF0C\u6216\u6539\u7528 --port <n>\u3002";
  }
});

// src/commands/story.mts
import { existsSync as existsSync36, readFileSync as readFileSync24 } from "fs";
import { join as join34 } from "path";
function parseFlags(args, spec) {
  const out = { positionals: [], values: {} };
  for (let i = 0; i < args.length; i++) {
    const raw = args[i] ?? "";
    const { name, inline } = splitInlineFlag(raw);
    if (name.startsWith("-")) {
      const kind = spec[name];
      if (kind === void 0) usageError(`\u672A\u77E5\u53C2\u6570 ${name}`);
      if (kind === "boolean") {
        if (inline !== void 0) usageError(`${name} \u4E0D\u63A5\u53D7\u503C`);
        out.values[name] = true;
        continue;
      }
      const v = takeValue(args, i, inline, name);
      out.values[name] = v.value;
      i += v.skip;
      continue;
    }
    out.positionals.push(name);
  }
  return out;
}
function strFlag(parsed, name) {
  const value = parsed.values[name];
  return typeof value === "string" ? value : void 0;
}
function boolFlag(parsed, name) {
  return parsed.values[name] === true;
}
function readTextInput(file, label) {
  if (file === void 0 || file === "") usageError(`\u9700\u8981 ${label}`);
  try {
    return readFileSync24(file === "-" ? 0 : file, "utf8");
  } catch (e) {
    throw new DaoyanCliError({
      code: "config_invalid",
      message: `\u8BFB\u53D6 ${file} \u5931\u8D25\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
}
function readJsonInput(file, label) {
  const text = readTextInput(file, label);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new DaoyanCliError({
      code: "story_invalid",
      message: `${file} \u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${e instanceof Error ? e.message : String(e)}`
    });
  }
}
function requireRecord(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DaoyanCliError({ code: "story_invalid", message: `${label} \u5FC5\u987B\u662F JSON \u5BF9\u8C61` });
  }
  return value;
}
function output(ctx2, data, lines) {
  if (ctx2.json) {
    emitData(data);
    return;
  }
  for (const line of lines) say(line);
}
function throwIssues(issues, label) {
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length === 0) return;
  throw new DaoyanCliError({
    code: "story_invalid",
    message: `${label} \u6821\u9A8C\u5931\u8D25\uFF08${errors.length} \u9879\u9519\u8BEF\uFF09`,
    details: { issues }
  });
}
async function storyInit(ctx2, args) {
  const parsed = parseFlags(args, { "--json": "boolean" });
  if (parsed.positionals.length > 0) usageError(`story init \u4E0D\u63A5\u53D7\u53C2\u6570\uFF1A${parsed.positionals.join(" ")}`);
  const { root, config } = requireProject(ctx2);
  const result = initStory(root, config.name);
  output(ctx2, { ...result, episodes: listEpisodeMetas(root).map((e) => e.id) }, [
    `story \u5DF2\u5C31\u7EEA\uFF1A${result.created.length} \u4E2A\u65B0\u6587\u4EF6 / \u76EE\u5F55`,
    `\u5267\u96C6\uFF1A${listEpisodeMetas(root).map((e) => `${e.id} ${e.title}`).join("\uFF0C")}`,
    "\u4E0B\u4E00\u6B65\uFF1Astory script sync --episode ep01 --file <script.md>"
  ]);
  return 0;
}
async function storySeries(ctx2, args) {
  const [action, ...rest] = args;
  const { root, config } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  if (action === "show") {
    const series = readSeries(root);
    output(ctx2, { series }, [`\u7CFB\u5217\uFF1A${series?.title ?? ""}`, series?.synopsis ?? ""]);
    return 0;
  }
  if (action === "set") {
    const parsed = parseFlags(rest, { "--title": "string", "--synopsis": "string", "--genre": "string" });
    if (parsed.positionals.length > 0)
      usageError(`story series set \u4E0D\u63A5\u53D7\u4F4D\u7F6E\u53C2\u6570\uFF1A${parsed.positionals.join(" ")}`);
    const cur = readSeries(root) ?? {
      version: 1,
      title: config.name,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    const next = {
      ...cur,
      ...strFlag(parsed, "--title") !== void 0 ? { title: strFlag(parsed, "--title") } : {},
      ...strFlag(parsed, "--synopsis") !== void 0 ? { synopsis: strFlag(parsed, "--synopsis") } : {},
      ...strFlag(parsed, "--genre") !== void 0 ? { genre: strFlag(parsed, "--genre") } : {},
      updated_at: nowIso()
    };
    if (next.title.trim() === "") throw new DaoyanCliError({ code: "story_invalid", message: "\u7CFB\u5217\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A" });
    writeJsonAtomic(seriesPath(root), next);
    output(ctx2, { series: next }, [`\u7CFB\u5217\u5DF2\u66F4\u65B0\uFF1A${next.title}`]);
    return 0;
  }
  usageError("\u7528\u6CD5\uFF1Adaoyan story series show|set");
}
async function storyEpisode(ctx2, args) {
  const [action, ...rest] = args;
  const { root } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  if (action === "add") {
    const parsed = parseFlags(rest, {
      "--id": "string",
      "--number": "string",
      "--title": "string",
      "--summary": "string"
    });
    const id = strFlag(parsed, "--id");
    const numberText = strFlag(parsed, "--number");
    const title = strFlag(parsed, "--title");
    if (id === void 0 || numberText === void 0 || title === void 0) {
      usageError("usage: story episode add --id <id> --number <n> --title <title>");
    }
    const number = Number(numberText);
    const meta = addEpisode(root, {
      id,
      number,
      title,
      ...strFlag(parsed, "--summary") !== void 0 ? { summary: strFlag(parsed, "--summary") } : {}
    });
    output(ctx2, { episode: meta }, [`\u5DF2\u65B0\u589E\u5267\u96C6 ${meta.id}\uFF08\u7B2C ${meta.number} \u96C6\uFF09\uFF1A${meta.title}`]);
    return 0;
  }
  if (action === "list") {
    const metas = listEpisodeMetas(root);
    output(
      ctx2,
      { episodes: metas },
      metas.map((m) => `${m.id}  \u7B2C ${m.number} \u96C6  ${m.title}`)
    );
    return 0;
  }
  if (action === "show") {
    const id = rest.find((x) => !x.startsWith("-"));
    if (id === void 0) usageError("usage: story episode show <episode-id>");
    const meta = readEpisodeMeta(root, id);
    if (meta === null) {
      throw new DaoyanCliError({ code: "episode_not_found", message: `\u672A\u627E\u5230\u5267\u96C6 ${id}` });
    }
    const dir = episodeDir(root, id);
    output(
      ctx2,
      {
        episode: meta,
        files: {
          script_md: existsSync36(join34(dir, "script.md")),
          script_json: existsSync36(join34(dir, "script.json")),
          breakdown: existsSync36(join34(dir, "breakdown.json")),
          shots: existsSync36(join34(dir, "shots.json"))
        }
      },
      [`${meta.id}  \u7B2C ${meta.number} \u96C6  ${meta.title}`, meta.summary ?? ""]
    );
    return 0;
  }
  if (action === "set") {
    const id = rest.find((x) => !x.startsWith("-"));
    if (id === void 0)
      usageError("usage: story episode set <episode-id> [--number N] [--title T] [--summary S]");
    const parsed = parseFlags(
      rest.filter((x) => x !== id),
      { "--number": "string", "--title": "string", "--summary": "string" }
    );
    const numberText = strFlag(parsed, "--number");
    const meta = updateEpisode(root, id, {
      ...numberText !== void 0 ? { number: Number(numberText) } : {},
      ...strFlag(parsed, "--title") !== void 0 ? { title: strFlag(parsed, "--title") } : {},
      ...strFlag(parsed, "--summary") !== void 0 ? { summary: strFlag(parsed, "--summary") } : {}
    });
    output(ctx2, { episode: meta }, [`\u5267\u96C6\u5DF2\u66F4\u65B0\uFF1A${meta.id} \u7B2C ${meta.number} \u96C6 ${meta.title}`]);
    return 0;
  }
  usageError("\u7528\u6CD5\uFF1Adaoyan story episode add|list|show|set");
}
async function storyScript(ctx2, args) {
  const [action, ...rest] = args;
  const { root } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  if (action === "sync") {
    const parsed = parseFlags(rest, {
      "--episode": "string",
      "--file": "string",
      "--summary": "string",
      "--source": "string",
      "--base-revision": "string",
      "--synced-by": "string"
    });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    if (context.legacy || context.episode_id === null) {
      throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
    }
    const source = strFlag(parsed, "--source") ?? "ai";
    if (source !== "ai" && source !== "user" && source !== "import") {
      usageError("--source \u5FC5\u987B\u662F ai|user|import");
    }
    const text = readTextInput(strFlag(parsed, "--file"), "--file <script.md|->");
    const baseText = strFlag(parsed, "--base-revision");
    if (baseText !== void 0 && (!Number.isInteger(Number(baseText)) || Number(baseText) < 0)) {
      usageError("--base-revision \u9700\u8981\u975E\u8D1F\u6574\u6570");
    }
    const result = syncScript({
      root,
      episodeId: context.episode_id,
      text,
      source,
      summary: strFlag(parsed, "--summary") ?? "\u540C\u6B65\u5267\u672C",
      ...strFlag(parsed, "--synced-by") !== void 0 ? { syncedBy: strFlag(parsed, "--synced-by") } : {},
      ...baseText !== void 0 ? { baseRevision: Number(baseText) } : {}
    });
    const stale = ["breakdown", "shots"].filter(
      (name) => existsSync36(join34(context.dir, name === "breakdown" ? "breakdown.json" : "shots.json"))
    );
    output(
      ctx2,
      {
        episode_id: context.episode_id,
        changed: result.changed,
        revision: result.meta.revision,
        sha256: result.meta.sha256,
        status: result.meta.status,
        stale_documents: stale,
        next_actions: [
          `daoyan story breakdown set --episode ${context.episode_id} --file <breakdown.json> --json`
        ]
      },
      [
        `\u5267\u672C ${context.episode_id} revision ${result.meta.revision}\uFF08${result.changed ? "\u5DF2\u66F4\u65B0" : "\u65E0\u53D8\u5316"}\uFF09`,
        result.changed ? `\u4E0B\u4E00\u6B65\uFF1Astory breakdown set --episode ${context.episode_id} --file <breakdown.json>` : ""
      ].filter((x) => x !== "")
    );
    return 0;
  }
  if (action === "show") {
    const parsed = parseFlags(rest, { "--episode": "string", "--raw": "boolean" });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    if (context.legacy || context.episode_id === null) {
      throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
    }
    const meta = loadScriptMeta(root, context.episode_id);
    const content = loadScriptText(root, context.episode_id);
    if (boolFlag(parsed, "--raw")) {
      process.stdout.write(content);
      return 0;
    }
    output(ctx2, { episode_id: context.episode_id, meta, content }, [
      `\u5267\u672C ${context.episode_id} revision ${meta.revision}\uFF08${meta.status}\uFF09`,
      content
    ]);
    return 0;
  }
  if (action === "approve") {
    const parsed = parseFlags(rest, { "--episode": "string" });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    if (context.legacy || context.episode_id === null) {
      throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
    }
    const meta = approveScript(root, context.episode_id);
    output(ctx2, { episode_id: context.episode_id, meta }, [
      `\u5267\u672C ${context.episode_id} revision ${meta.revision} \u5DF2\u786E\u8BA4`
    ]);
    return 0;
  }
  usageError("\u7528\u6CD5\uFF1Adaoyan story script sync|show|approve");
}
async function storyBreakdown(ctx2, args) {
  const [action, ...rest] = args;
  const { root } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  if (action === "set") {
    const parsed = parseFlags(rest, {
      "--episode": "string",
      "--file": "string",
      "--source-revision": "string",
      "--base-sha256": "string"
    });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    if (context.legacy || context.episode_id === null) {
      throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
    }
    const script = loadScriptMeta(root, context.episode_id);
    if (script.revision <= 0) {
      throw new DaoyanCliError({
        code: "story_invalid",
        message: "\u5267\u672C\u5C1A\u672A\u540C\u6B65\uFF0C\u4E0D\u80FD\u5199\u62C6\u89E3",
        hint: `\u5148 story script sync --episode ${context.episode_id}\u3002`
      });
    }
    const baseSha = strFlag(parsed, "--base-sha256");
    if (baseSha !== void 0 && existsSync36(context.breakdown_path ?? "")) {
      if (sha256File(context.breakdown_path) !== baseSha) {
        throw new DaoyanCliError({ code: "story_conflict", message: "breakdown \u5DF2\u88AB\u5176\u5B83\u4FEE\u6539" });
      }
    }
    const raw = requireRecord(readJsonInput(strFlag(parsed, "--file"), "--file <breakdown.json|->"), "breakdown");
    const sourceText = strFlag(parsed, "--source-revision");
    const sourceRevision = sourceText !== void 0 ? Number(sourceText) : script.revision;
    if (!Number.isInteger(sourceRevision) || sourceRevision < 0 || sourceRevision > script.revision) {
      usageError("--source-revision \u5FC5\u987B\u662F 0..\u5F53\u524D\u5267\u672C revision \u7684\u6574\u6570");
    }
    const doc = {
      ...raw,
      version: 1,
      episode_id: context.episode_id,
      source_revision: sourceRevision,
      source_sha256: sourceRevision === script.revision ? script.sha256 : typeof raw.source_sha256 === "string" ? raw.source_sha256 : "",
      characters: Array.isArray(raw.characters) ? raw.characters : [],
      scenes: Array.isArray(raw.scenes) ? raw.scenes : [],
      voices: Array.isArray(raw.voices) ? raw.voices : []
    };
    const issues = checkBreakdownForWrite(root, context.episode_id, doc);
    throwIssues(issues, "breakdown");
    saveBreakdown(root, context.episode_id, doc);
    output(ctx2, { episode_id: context.episode_id, breakdown: doc }, [
      `\u62C6\u89E3\u5DF2\u5199\u5165 ${context.episode_id}\uFF08source revision ${doc.source_revision}\uFF09`,
      `\u89D2\u8272 ${doc.characters.length} / \u573A\u666F ${doc.scenes.length} / \u97F3\u8272 ${doc.voices.length}`,
      `\u4E0B\u4E00\u6B65\uFF1Adaoyan story asset add / story shots set --episode ${context.episode_id}`
    ]);
    return 0;
  }
  if (action === "show") {
    const parsed = parseFlags(rest, { "--episode": "string" });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
    if (context.legacy || context.episode_id === null) {
      throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
    }
    const doc = loadBreakdown(root, context.episode_id);
    if (doc === null) {
      throw new DaoyanCliError({ code: "story_invalid", message: "\u62C6\u89E3\u4E0D\u5B58\u5728" });
    }
    output(ctx2, { episode_id: context.episode_id, breakdown: doc }, [
      `\u62C6\u89E3 ${context.episode_id}\uFF1Asource revision ${doc.source_revision}`,
      `\u89D2\u8272 ${doc.characters.length} / \u573A\u666F ${doc.scenes.length} / \u97F3\u8272 ${doc.voices.length}`
    ]);
    return 0;
  }
  usageError("\u7528\u6CD5\uFF1Adaoyan story breakdown set|show");
}
async function storyGlobal(ctx2, kind, args) {
  const [action, ...rest] = args;
  const { root } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  if (action === "show") {
    const parsed = parseFlags(rest, { "--id": "string" });
    if (kind === "characters") {
      const doc2 = loadCharacters(root);
      const items2 = strFlag(parsed, "--id") !== void 0 ? doc2.characters.filter((c) => c.id === strFlag(parsed, "--id")) : doc2.characters;
      output(
        ctx2,
        { characters: items2 },
        items2.map((c) => `${c.id}  ${c.name}  ${c.forms.length} \u5F62\u6001`)
      );
      return 0;
    }
    if (kind === "scenes") {
      const doc2 = loadScenes(root);
      const items2 = strFlag(parsed, "--id") !== void 0 ? doc2.scenes.filter((s) => s.id === strFlag(parsed, "--id")) : doc2.scenes;
      output(
        ctx2,
        { scenes: items2 },
        items2.map((s) => `${s.id}  ${s.name}`)
      );
      return 0;
    }
    const doc = loadVoices(root);
    const items = strFlag(parsed, "--id") !== void 0 ? doc.voices.filter((v) => v.id === strFlag(parsed, "--id")) : doc.voices;
    output(
      ctx2,
      { voices: items },
      items.map((v) => `${v.id}  ${v.name}  ${v.mode}`)
    );
    return 0;
  }
  if (action === "set") {
    const parsed = parseFlags(rest, { "--file": "string", "--base-sha256": "string" });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const target = kind === "characters" ? join34(root, "story/characters.json") : kind === "scenes" ? join34(root, "story/scenes.json") : join34(root, "story/voices.json");
    const baseSha = strFlag(parsed, "--base-sha256");
    if (baseSha !== void 0 && existsSync36(target) && sha256File(target) !== baseSha) {
      throw new DaoyanCliError({ code: "story_conflict", message: `${kind} \u5DF2\u88AB\u5176\u5B83\u4FEE\u6539` });
    }
    const raw = requireRecord(readJsonInput(strFlag(parsed, "--file"), "--file <json|->"), kind);
    if (kind === "characters") {
      const doc2 = {
        ...raw,
        version: 1,
        updated_at: nowIso(),
        characters: Array.isArray(raw.characters) ? raw.characters : []
      };
      throwIssues(checkCharactersDocForWrite(root, doc2), "characters");
      saveCharacters(root, doc2);
      output(ctx2, { characters: doc2.characters }, [`\u89D2\u8272\u8BBE\u5B9A\u5DF2\u5199\u5165\uFF1A${doc2.characters.length} \u4E2A\u89D2\u8272`]);
      return 0;
    }
    if (kind === "scenes") {
      const doc2 = {
        ...raw,
        version: 1,
        updated_at: nowIso(),
        scenes: Array.isArray(raw.scenes) ? raw.scenes : []
      };
      throwIssues(checkScenesDocForWrite(root, doc2), "scenes");
      saveScenes(root, doc2);
      output(ctx2, { scenes: doc2.scenes }, [`\u573A\u666F\u8BBE\u5B9A\u5DF2\u5199\u5165\uFF1A${doc2.scenes.length} \u4E2A\u573A\u666F`]);
      return 0;
    }
    const doc = {
      ...raw,
      version: 1,
      updated_at: nowIso(),
      voices: Array.isArray(raw.voices) ? raw.voices : []
    };
    throwIssues(checkVoicesDocForWrite(root, doc), "voices");
    saveVoices(root, doc);
    output(ctx2, { voices: doc.voices }, [`\u97F3\u8272\u8BBE\u5B9A\u5DF2\u5199\u5165\uFF1A${doc.voices.length} \u4E2A\u97F3\u8272`]);
    return 0;
  }
  usageError(`\u7528\u6CD5\uFF1Adaoyan story ${kind} set|show`);
}
async function storyAsset(ctx2, args) {
  const [action, ...rest] = args;
  const { root } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  if (action === "add") {
    const parsed = parseFlags(rest, {
      "--owner": "string",
      "--form": "string",
      "--id": "string",
      "--role": "string",
      "--from": "string",
      "--from-run": "string",
      "--output": "string",
      "--set-reference": "boolean",
      "--replace": "boolean"
    });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const ownerText = strFlag(parsed, "--owner");
    const id = strFlag(parsed, "--id");
    if (ownerText === void 0 || id === void 0) usageError("\u9700\u8981 --owner \u4E0E --id");
    const owner = parseAssetOwner(ownerText, strFlag(parsed, "--form"));
    const result = addAsset({
      root,
      owner,
      assetId: id,
      ...strFlag(parsed, "--role") !== void 0 ? { role: strFlag(parsed, "--role") } : {},
      ...strFlag(parsed, "--from") !== void 0 ? { from: strFlag(parsed, "--from") } : {},
      ...strFlag(parsed, "--from-run") !== void 0 ? { fromRun: strFlag(parsed, "--from-run") } : {},
      ...strFlag(parsed, "--output") !== void 0 ? { output: strFlag(parsed, "--output") } : {},
      setReference: boolFlag(parsed, "--set-reference"),
      replace: boolFlag(parsed, "--replace")
    });
    output(
      ctx2,
      {
        asset: result.asset,
        reference_set: result.reference_set,
        warning: result.warning,
        next_actions: result.warning !== null ? ["story asset set-reference --owner <owner> --id <asset> --json"] : []
      },
      [
        `\u8D44\u4EA7\u5DF2\u5165\u5E93\uFF1A${result.asset.path}`,
        result.reference_set ? "\u5DF2\u8BBE\u4E3A\u4E3B\u53C2\u8003" : "\u672A\u8BBE\u4E3A\u4E3B\u53C2\u8003\uFF08\u7528 set-reference \u663E\u5F0F\u6307\u5B9A\uFF09",
        result.warning ?? ""
      ].filter((x) => x !== "")
    );
    return 0;
  }
  if (action === "set-reference") {
    const parsed = parseFlags(rest, {
      "--owner": "string",
      "--form": "string",
      "--id": "string"
    });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const ownerText = strFlag(parsed, "--owner");
    const id = strFlag(parsed, "--id");
    if (ownerText === void 0 || id === void 0) usageError("\u9700\u8981 --owner \u4E0E --id");
    const owner = parseAssetOwner(ownerText, strFlag(parsed, "--form"));
    const asset = setReferenceAsset(root, owner, id);
    output(ctx2, { asset, reference_set: true }, [`\u4E3B\u53C2\u8003\u5DF2\u8BBE\u7F6E\uFF1A${asset.path}`]);
    return 0;
  }
  if (action === "remove") {
    const parsed = parseFlags(rest, {
      "--owner": "string",
      "--form": "string",
      "--id": "string",
      "--force": "boolean"
    });
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const ownerText = strFlag(parsed, "--owner");
    const id = strFlag(parsed, "--id");
    if (ownerText === void 0 || id === void 0) usageError("\u9700\u8981 --owner \u4E0E --id");
    const owner = parseAssetOwner(ownerText, strFlag(parsed, "--form"));
    const asset = removeAsset(root, owner, id, boolFlag(parsed, "--force"));
    output(ctx2, { removed: asset }, [`\u8D44\u4EA7\u5DF2\u5220\u9664\uFF1A${asset.path}`]);
    return 0;
  }
  if (action === "list") {
    const parsed = parseFlags(rest, {});
    if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
    const assets = listAssets(root);
    output(
      ctx2,
      { assets, total: assets.length },
      assets.map(
        (a) => `${a.reference ? "*" : " "} ${a.owner_kind}:${a.owner_id}${a.form_id !== null ? `/${a.form_id}` : ""}  ${a.asset.id}  ${a.asset.path}`
      )
    );
    return 0;
  }
  usageError("\u7528\u6CD5\uFF1Adaoyan story asset add|set-reference|remove|list");
}
async function storyShots(ctx2, args) {
  const [action, ...rest] = args;
  if (action !== "set") usageError("\u7528\u6CD5\uFF1Adaoyan story shots set --episode <id> --file <shots.json>");
  const { root } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  const parsed = parseFlags(rest, {
    "--episode": "string",
    "--file": "string",
    "--source-revision": "string",
    "--base-sha256": "string"
  });
  if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
  const context = resolveEpisodeContext(root, strFlag(parsed, "--episode"));
  if (context.legacy || context.episode_id === null) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  const script = loadScriptMeta(root, context.episode_id);
  if (script.revision <= 0) {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u5267\u672C\u5C1A\u672A\u540C\u6B65\uFF0C\u4E0D\u80FD\u5199\u5206\u955C" });
  }
  if (loadBreakdown(root, context.episode_id) === null) {
    throw new DaoyanCliError({ code: "story_invalid", message: "\u62C6\u89E3\u4E0D\u5B58\u5728\uFF0C\u4E0D\u80FD\u5199\u5206\u955C" });
  }
  const baseSha = strFlag(parsed, "--base-sha256");
  if (baseSha !== void 0 && existsSync36(context.shots_path) && sha256File(context.shots_path) !== baseSha) {
    throw new DaoyanCliError({ code: "story_conflict", message: "shots.json \u5DF2\u88AB\u5176\u5B83\u4FEE\u6539" });
  }
  const raw = requireRecord(readJsonInput(strFlag(parsed, "--file"), "--file <shots.json|->"), "shots");
  const meta = requireRecord(raw.meta, "shots.meta");
  const sourceText = strFlag(parsed, "--source-revision");
  const sourceRevision = sourceText !== void 0 ? Number(sourceText) : script.revision;
  if (!Number.isInteger(sourceRevision) || sourceRevision < 0 || sourceRevision > script.revision) {
    usageError("--source-revision \u5FC5\u987B\u662F 0..\u5F53\u524D\u5267\u672C revision \u7684\u6574\u6570");
  }
  const shots = {
    ...raw,
    meta: {
      ...meta,
      episode_id: context.episode_id,
      script_revision: sourceRevision,
      script_sha256: sourceRevision === script.revision ? script.sha256 : typeof meta.script_sha256 === "string" ? meta.script_sha256 : ""
    },
    shots: Array.isArray(raw.shots) ? raw.shots : []
  };
  const issues = checkShotsForWrite(root, context.episode_id, shots);
  throwIssues(issues, "shots");
  saveEpisodeShots(root, context.episode_id, shots);
  output(ctx2, { episode_id: context.episode_id, shots: shots.shots.length, script_revision: sourceRevision }, [
    `\u5206\u955C\u5DF2\u5199\u5165 ${context.episode_id}\uFF1A${shots.shots.length} \u955C\uFF08script revision ${sourceRevision}\uFF09`,
    `\u4E0B\u4E00\u6B65\uFF1Adaoyan status --episode ${context.episode_id} --json`
  ]);
  return 0;
}
async function storyStatus(ctx2, args) {
  const parsed = parseFlags(args, { "--episode": "string" });
  if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
  const { root, config } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  const episode = strFlag(parsed, "--episode");
  if (episode !== void 0) {
    if (readEpisodeMeta(root, episode) === null) {
      throw new DaoyanCliError({ code: "episode_not_found", message: `\u672A\u627E\u5230\u5267\u96C6 ${episode}` });
    }
    const status2 = computeEpisodeStoryStatus(root, episode, config);
    output(ctx2, status2, [
      `${status2.episode.id} \u7B2C ${status2.episode.number} \u96C6 ${status2.episode.title}\uFF1A${status2.stage}`,
      `\u5267\u672C revision ${status2.script.revision}\uFF08${status2.script.status}\uFF09`,
      `blockers\uFF1A${status2.blockers.length}`,
      ...status2.blockers.map((b) => `  - [${b.code}] ${b.message}`),
      ...status2.next_actions.map((a) => `next: ${a}`)
    ]);
    return 0;
  }
  const status = computeSeriesStoryStatus(root, config);
  output(ctx2, status, [
    `\u7CFB\u5217 ${status.series.title}\uFF1A${status.series.episodes_total} \u96C6\uFF0C\u53EF\u62CD ${status.series.episodes_ready}\uFF0C\u963B\u65AD ${status.series.episodes_blocked}`,
    ...status.episodes.map((e) => `  ${e.id} \u7B2C ${e.number} \u96C6 ${e.title}\uFF1A${e.stage}`)
  ]);
  return 0;
}
async function storyValidate(ctx2, args) {
  const parsed = parseFlags(args, { "--episode": "string", "--verify-hashes": "boolean" });
  if (parsed.positionals.length > 0) usageError(`\u672A\u77E5\u53C2\u6570 ${parsed.positionals.join(" ")}`);
  const { root } = requireProject(ctx2);
  if (!storyEnabled(root)) {
    throw new DaoyanCliError({ code: "story_not_found", message: "story \u6A21\u5F0F\u672A\u542F\u7528" });
  }
  const issues = validateStory(root, strFlag(parsed, "--episode"), boolFlag(parsed, "--verify-hashes"));
  const errors = issues.filter((i) => i.severity === "error");
  if (!ctx2.json) {
    for (const i of issues)
      say(`${i.severity === "error" ? "\u2717" : i.severity === "warning" ? "!" : "\xB7"} [${i.path}] ${i.message}`);
    say(
      errors.length === 0 ? `story \u6821\u9A8C\u901A\u8FC7\uFF08${issues.length} \u6761\u63D0\u793A\uFF09` : `story \u6821\u9A8C\u5931\u8D25\uFF1A${errors.length} \u9879\u9519\u8BEF`
    );
  }
  if (errors.length > 0) {
    throw new DaoyanCliError({
      code: "validation_failed",
      message: `story \u6821\u9A8C\u672A\u901A\u8FC7\uFF08${errors.length} \u9879\u9519\u8BEF\uFF09`,
      details: { issues }
    });
  }
  if (ctx2.json) emitData({ ok: true, issues });
  return 0;
}
async function runStory(ctx2, args) {
  const [sub, ...rest] = args;
  if (sub === "init") return storyInit(ctx2, rest);
  if (sub === "series") return storySeries(ctx2, rest);
  if (sub === "episode") return storyEpisode(ctx2, rest);
  if (sub === "script") return storyScript(ctx2, rest);
  if (sub === "breakdown") return storyBreakdown(ctx2, rest);
  if (sub === "characters") return storyGlobal(ctx2, "characters", rest);
  if (sub === "scenes") return storyGlobal(ctx2, "scenes", rest);
  if (sub === "voices") return storyGlobal(ctx2, "voices", rest);
  if (sub === "asset") return storyAsset(ctx2, rest);
  if (sub === "shots") return storyShots(ctx2, rest);
  if (sub === "status") return storyStatus(ctx2, rest);
  if (sub === "validate") return storyValidate(ctx2, rest);
  usageError(
    "\u7528\u6CD5\uFF1Adaoyan story init|series|episode|script|breakdown|characters|scenes|voices|asset|shots|status|validate"
  );
}
var init_story = __esm({
  "src/commands/story.mts"() {
    "use strict";
    init_errors();
    init_json();
    init_log();
    init_args();
    init_fs();
    init_config();
    init_paths();
    init_store2();
    init_validate();
    init_assets();
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
    init_validate2();
    init_shot();
    init_wrap();
    init_logs();
    init_status();
    init_engine();
    init_workflow();
    init_run();
    init_skill2();
    init_web();
    init_story();
    TASK_START_SHAPE = {
      task_id: "string",
      episode_id: "string|null",
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
        usage: "daoyan init --mode=local [--modelpath <\u8DEF\u5F84>] [--version <tag>] [--mirror <\u955C\u50CF>] [--fallback-mirror <\u955C\u50CF|none>] [--torch-index <url>] [--torch-cuda <cuXXX>] [--torch-cpu] [--no-cache] [--no-skill]\ndaoyan init --mode=remote --url <url> [--no-skill]",
        flags: [
          {
            name: "--mode",
            type: "local|remote",
            required: true,
            enum: ["local", "remote"],
            description: "\u6267\u884C\u6A21\u5F0F\uFF08\u5FC5\u586B\uFF0C\u65E0\u9ED8\u8BA4\u503C\uFF09"
          },
          { name: "--modelpath", type: "path", description: "local\uFF1A\u5916\u90E8\u6A21\u578B\u6839\u76EE\u5F55\uFF08\u5DF2\u5B58\u5728\uFF09" },
          { name: "--url", type: "url", description: "remote\uFF1A\u5916\u90E8 ComfyUI base URL\uFF08\u5FC5\u586B\uFF09" },
          { name: "--version", type: "tag", description: "local\uFF1AComfyUI \u7248\u672C tag" },
          {
            name: "--mirror",
            type: "url",
            description: "local\uFF1Apip \u4E3B\u6E90\uFF08\u9ED8\u8BA4\u963F\u91CC\u4E91 PyPI\uFF09"
          },
          {
            name: "--fallback-mirror",
            type: "url|none",
            description: "local\uFF1Apip fallback\uFF08\u9ED8\u8BA4\u5B98\u65B9 PyPI\uFF1Bnone \u5173\u95ED\uFF09"
          },
          {
            name: "--torch-index",
            type: "url",
            description: "local\uFF1APyTorch wheel index \u6839\uFF08\u9ED8\u8BA4 https://download.pytorch.org/whl\uFF09"
          },
          {
            name: "--torch-cuda",
            type: "tag",
            description: "local\uFF1A\u5F3A\u5236 cuXXX\uFF0C\u8DF3\u8FC7\u9A71\u52A8\u63A2\u6D4B"
          },
          {
            name: "--torch-cpu",
            type: "boolean",
            default: false,
            description: "local\uFF1A\u663E\u5F0F\u5B89\u88C5 CPU \u7248 torch"
          },
          {
            name: "--no-cache",
            type: "boolean",
            default: false,
            description: "local\uFF1Apip \u7981\u7528 cache"
          },
          {
            name: "--no-skill",
            type: "boolean",
            default: false,
            description: "\u4E0D\u751F\u6210 .agents/skills/daoyan \u4E0E AGENTS.md"
          }
        ],
        examples: [
          "daoyan init --mode=local --modelpath /data/models",
          "daoyan init --mode=local --torch-cpu",
          "daoyan init --mode=local --torch-cuda cu124 --torch-index https://mirror.example.com/pytorch/whl",
          "daoyan init --mode=remote --url http://gpu-box:8188"
        ],
        implemented: true,
        jsonShape: {
          root: "string",
          mode: "local|remote",
          project_created: "boolean",
          engine_installed: "boolean",
          toolchain: "object|null",
          port: "number|null",
          skill: "object|null"
        },
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
      // ---- 剧本与设定 ----
      {
        name: "story init",
        group: "story",
        summary: "\u542F\u7528\u591A\u96C6\u77ED\u5267\u6A21\u5F0F\uFF1A\u521B\u5EFA story/\u3001episodes/ep01\u3001\u8D44\u4EA7\u76EE\u5F55\u4E0E LFS \u89C4\u5219",
        usage: "daoyan story init [--json]",
        implemented: true,
        jsonShape: { created: "string[]", episodes: "string[]" },
        run: (ctx2, args) => runStory(ctx2, ["init", ...args])
      },
      {
        name: "story series",
        group: "story",
        summary: "\u67E5\u770B / \u4FEE\u6539\u7CFB\u5217\u6807\u9898\u3001\u7B80\u4ECB\u4E0E\u7C7B\u578B",
        usage: "daoyan story series show|set [--title <t>] [--synopsis <s>] [--genre <g>] [--json]",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["series", ...args])
      },
      {
        name: "story episode",
        group: "story",
        summary: "\u65B0\u589E / \u5217\u51FA / \u67E5\u770B / \u4FEE\u6539\u5267\u96C6\uFF08id \u4E0D\u53EF\u53D8\uFF0Cnumber \u5168\u7CFB\u5217\u552F\u4E00\uFF09",
        usage: "daoyan story episode add --id <id> --number <n> --title <t> [--summary <s>] [--json]\ndaoyan story episode list|show|set ...",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["episode", ...args])
      },
      {
        name: "story script",
        group: "story",
        summary: "\u540C\u6B65 / \u67E5\u770B / \u786E\u8BA4\u67D0\u4E00\u96C6\u5267\u672C\uFF08\u72EC\u7ACB revision\uFF09",
        usage: "daoyan story script sync --episode <id> --file <script.md|-> [--summary <s>] [--source ai|user|import] [--json]\ndaoyan story script show --episode <id> [--raw] [--json]\ndaoyan story script approve --episode <id> [--json]",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["script", ...args])
      },
      {
        name: "story breakdown",
        group: "story",
        summary: "\u5199\u5165 / \u67E5\u770B\u5355\u96C6\u62C6\u89E3\uFF08\u672C\u96C6\u89D2\u8272\u3001\u5F62\u6001\u3001\u573A\u666F\u3001\u97F3\u8272\u5141\u8BB8\u6E05\u5355\uFF09",
        usage: "daoyan story breakdown set|show --episode <id> [--file <breakdown.json|->] [--json]",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["breakdown", ...args])
      },
      {
        name: "story characters",
        group: "story",
        summary: "\u5199\u5165 / \u67E5\u770B\u5168\u5C40\u89D2\u8272\u4E0E\u5F62\u6001",
        usage: "daoyan story characters set|show [--file <characters.json|->] [--id <id>] [--json]",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["characters", ...args])
      },
      {
        name: "story scenes",
        group: "story",
        summary: "\u5199\u5165 / \u67E5\u770B\u5168\u5C40\u573A\u666F",
        usage: "daoyan story scenes set|show [--file <scenes.json|->] [--id <id>] [--json]",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["scenes", ...args])
      },
      {
        name: "story voices",
        group: "story",
        summary: "\u5199\u5165 / \u67E5\u770B\u5168\u5C40\u97F3\u8272",
        usage: "daoyan story voices set|show [--file <voices.json|->] [--id <id>] [--json]",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["voices", ...args])
      },
      {
        name: "story asset",
        group: "story",
        summary: "\u53C2\u8003\u56FE / \u53C2\u8003\u97F3\u9891\u5165\u5E93\u3001\u663E\u5F0F\u6307\u5B9A\u4E3B\u53C2\u8003\u3001\u5220\u9664\u4E0E\u5217\u8868",
        usage: "daoyan story asset add --owner <character:id|scene:id|voice:id> [--form <form>] --id <asset> (--from <file>|--from-run <run> --output <name>) [--set-reference] [--json]\ndaoyan story asset set-reference|remove|list ...",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["asset", ...args])
      },
      {
        name: "story shots",
        group: "story",
        summary: "\u6821\u9A8C\u5E76\u5199\u5165\u67D0\u4E00\u96C6 shots.json\uFF08\u8BB0\u5F55\u5267\u672C revision\uFF09",
        usage: "daoyan story shots set --episode <id> --file <shots.json|-> [--json]",
        implemented: true,
        run: (ctx2, args) => runStory(ctx2, ["shots", ...args])
      },
      {
        name: "story status",
        group: "story",
        summary: "\u7CFB\u5217\u6982\u89C8\uFF1B--episode \u67E5\u770B\u5355\u96C6\u9636\u6BB5\u3001stale\u3001blockers \u4E0E next_actions",
        usage: "daoyan story status [--episode <id>] [--json]",
        implemented: true,
        jsonShape: { enabled: "boolean", stage: "string", blockers: "object[]", episodes: "object[]" },
        run: (ctx2, args) => runStory(ctx2, ["status", ...args])
      },
      {
        name: "story validate",
        group: "story",
        summary: "\u5B8C\u6574\u6821\u9A8C\u5267\u672C\u3001\u8BBE\u5B9A\u96C6\u3001\u62C6\u89E3\u3001\u5206\u955C\u3001\u8D44\u4EA7\u4E0E\u5F15\u7528",
        usage: "daoyan story validate [--episode <id>] [--verify-hashes] [--json]",
        implemented: true,
        jsonShape: { ok: "boolean", issues: "object[]" },
        run: (ctx2, args) => runStory(ctx2, ["validate", ...args])
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
        args: [
          { name: "api.json", type: "path", required: true, description: "ComfyUI Save (API Format) \u5BFC\u51FA\u7684 JSON" }
        ],
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
        jsonShape: {
          applied: "number",
          assigned_ids: "object[]",
          changed_nodes: "string[]",
          removed_links: "object[]",
          warnings: "object[]",
          graph_sha256: "string"
        },
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
        usage: "daoyan run <workflow.json|name> [--set nodeId.input=value ...] [--label <label>] [--episode <id>]\n                  [--engine <url>] [--request-id <id>] [--wait] [--dry-run]\n                  [--timeout <\u5C0F\u65F6>] [--json]",
        args: [{ name: "workflow", type: "string", required: true, description: "\u5DE5\u4F5C\u6D41\u77ED\u540D\u6216\u9879\u76EE\u5185\u76F8\u5BF9\u8DEF\u5F84" }],
        flags: [
          { name: "--set", type: "key=value", description: "\u8986\u76D6\u8282\u70B9\u8F93\u5165\u6216 bindings \u903B\u8F91\u540D\uFF08\u53EF\u91CD\u590D\uFF09" },
          { name: "--label", type: "string", description: "run label\uFF08\u5982 shot:01\uFF09" },
          { name: "--episode", type: "string", description: "\u53EF\u9009\uFF1A\u628A run \u5F52\u5C5E\u5230\u67D0\u96C6\uFF08\u4E0D\u53C2\u4E0E\u5267\u60C5\u95E8\u7981\uFF09" },
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
        usage: "daoyan shot <\u955C\u53F7...> [--episode <id>] [--steps N] [--request-id <id>] [--allow-incomplete]\n                  [--wait] [--timeout <\u5C0F\u65F6>] [--json]",
        args: [
          {
            name: "\u955C\u53F7",
            type: "string",
            required: true,
            variadic: true,
            description: "\u5267\u96C6 shots.json \u4E2D\u7684\u955C\u5934 id"
          }
        ],
        flags: [
          { name: "--episode", type: "string", description: "\u591A\u96C6\u9879\u76EE\u5FC5\u586B\uFF1B\u5355\u96C6\u53EF\u7701\u7565" },
          { name: "--allow-incomplete", type: "boolean", description: "\u663E\u5F0F\u7ED5\u8FC7\u5267\u60C5\u95E8\u7981\uFF08\u5199\u5165 task \u8BB0\u5F55\uFF09" },
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
        usage: "daoyan retake <\u955C\u53F7...> [--episode <id>] [--steps N] [--request-id <id>] [--allow-incomplete]\n                   [--wait] [--timeout <\u5C0F\u65F6>] [--json]",
        args: [
          {
            name: "\u955C\u53F7",
            type: "string",
            required: true,
            variadic: true,
            description: "\u5267\u96C6 shots.json \u4E2D\u7684\u955C\u5934 id"
          }
        ],
        flags: [
          { name: "--episode", type: "string", description: "\u591A\u96C6\u9879\u76EE\u5FC5\u586B\uFF1B\u5355\u96C6\u53EF\u7701\u7565" },
          { name: "--allow-incomplete", type: "boolean", description: "\u663E\u5F0F\u7ED5\u8FC7\u5267\u60C5\u95E8\u7981" },
          { name: "--steps", type: "integer", description: "\u8986\u76D6\u91C7\u6837\u6B65\u6570" },
          { name: "--request-id", type: "string", description: "\u5E42\u7B49\u952E" },
          { name: "--wait", type: "boolean", description: "\u524D\u53F0\u7B49\u5F85\u5230\u7EC8\u6001" }
        ],
        implemented: true,
        jsonShape: TASK_START_SHAPE,
        run: (ctx2, args) => runShot(ctx2, args, true)
      },
      {
        name: "batch",
        group: "production",
        summary: "\u8FDE\u62CD\u5168\u90E8\u672A\u5B8C\u6210\u955C\u5934\uFF08\u5DF2\u6709\u6210\u529F run \u8DF3\u8FC7\uFF1B\u9ED8\u8BA4\u5F02\u6B65\uFF09",
        usage: "daoyan batch [--episode <id>] [--request-id <id>] [--allow-incomplete] [--wait]\n             [--timeout <\u5C0F\u65F6>] [--json]",
        flags: [
          { name: "--episode", type: "string", description: "\u591A\u96C6\u9879\u76EE\u5FC5\u586B\uFF1B\u5355\u96C6\u53EF\u7701\u7565" },
          { name: "--allow-incomplete", type: "boolean", description: "\u663E\u5F0F\u7ED5\u8FC7\u5267\u60C5\u95E8\u7981" },
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
        summary: "\u6309\u96C6\u4ECE runs \u9009\u6BB5\u5408\u7247\uFF0C\u5199 final/<episode>/cut-*.mp4 \u4E0E\u6E05\u5355\uFF08\u4E0D\u5360\u673A\u5668\u9501\uFF09",
        usage: "daoyan wrap [--episode <id>] [--select <\u955C\u53F7>=<run_id> ...] [--json]",
        flags: [
          { name: "--episode", type: "string", description: "\u591A\u96C6\u9879\u76EE\u5FC5\u586B\uFF1B\u5355\u96C6\u53EF\u7701\u7565" },
          { name: "--select", type: "\u955C\u53F7=run_id", description: "\u663E\u5F0F\u6307\u5B9A\u67D0\u955C\u4F7F\u7528\u7684 run\uFF08\u53EF\u91CD\u590D\uFF09" }
        ],
        implemented: true,
        jsonShape: {
          episode_id: "string|null",
          output: "string",
          manifest: "string",
          clips: "object[]",
          missing: "string[]"
        },
        run: (ctx2, args) => runWrap(ctx2, args)
      },
      // ---- 运维 ----
      {
        name: "status",
        group: "ops",
        summary: "\u88AB\u52A8\u72B6\u6001\u5FEB\u7167\uFF1B--task/--run \u67E5\u770B\u4EFB\u52A1\u4E0E\u8FD0\u884C\u8BE6\u60C5",
        usage: "daoyan status [--episode <id>] [--json]\ndaoyan status --task <task_id> [--wait] [--timeout <\u79D2>] [--json]\ndaoyan status --run <run_id> [--wait] [--timeout <\u79D2>] [--json]",
        flags: [
          { name: "--episode", type: "string", description: "story \u6A21\u5F0F\uFF1A\u67E5\u770B\u5355\u96C6\uFF1B\u7701\u7565 = \u7CFB\u5217\u6982\u89C8" },
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
          {
            name: "--src",
            type: "engine|worker|daoyan-cli|all",
            enum: ["engine", "worker", "daoyan-cli", "all"],
            description: "\u6587\u4EF6\u65E5\u5FD7\u6570\u636E\u6E90"
          }
        ],
        implemented: true,
        run: (ctx2, args) => runLogs(ctx2, args)
      },
      {
        name: "web",
        group: "ops",
        summary: "\u542F\u52A8\u4E34\u65F6\u53EA\u8BFB Web UI\uFF0C\u67E5\u770B\u9879\u76EE\u3001\u5206\u955C\u3001\u4EFB\u52A1\u4E0E\u4EA7\u51FA\u7269\uFF08Ctrl+C \u505C\u6B62\uFF09",
        usage: "daoyan web [--port <n>] [--host <addr>] [--open] [--json]",
        flags: [
          {
            name: "--port",
            type: "integer",
            default: 0,
            description: "\u76D1\u542C\u7AEF\u53E3\uFF1B0 \u8868\u793A\u7531\u7CFB\u7EDF\u5206\u914D\u53EF\u7528\u7AEF\u53E3"
          },
          {
            name: "--host",
            type: "string",
            default: "127.0.0.1",
            description: "\u76D1\u542C\u5730\u5740\uFF1B\u9ED8\u8BA4\u4EC5\u672C\u673A\u8BBF\u95EE"
          },
          {
            name: "--open",
            type: "boolean",
            default: false,
            description: "\u542F\u52A8\u540E\u5C1D\u8BD5\u7528\u7CFB\u7EDF\u9ED8\u8BA4\u6D4F\u89C8\u5668\u6253\u5F00"
          }
        ],
        examples: ["daoyan web", "daoyan web --port 8080 --open", "daoyan web --json"],
        detail: [
          "\u53EA\u8BFB\u67E5\u770B\u5668\uFF1B\u4E0D\u542F\u52A8 ComfyUI\u3001\u4E0D\u5360 machine lock\u3001\u4E0D\u5199\u9879\u76EE\u6587\u4EF6\u3002",
          "\u652F\u6301\u9879\u76EE\u6982\u89C8\u3001\u5206\u955C\u3001\u4EFB\u52A1\u3001\u5DE5\u4F5C\u6D41\u3001run \u4EA7\u51FA\u7269\u4E0E final \u6210\u7247\uFF1B\u89C6\u9891\u652F\u6301\u62D6\u52A8\u8FDB\u5EA6\u3002",
          "--json \u8F93\u51FA\u4E00\u6B21\u542F\u52A8\u4FE1\u5C01\u540E\u7EE7\u7EED\u9A7B\u7559\uFF1BCtrl+C / SIGTERM \u4F18\u96C5\u5173\u95ED\u3002"
        ],
        implemented: true,
        jsonShape: {
          url: "string",
          host: "string",
          port: "number",
          project: "string",
          mode: "local|remote|null"
        },
        run: (ctx2, args) => runWeb(ctx2, args)
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
        usage: "daoyan engine install <\u7248\u672C tag> [--mirror <url>] [--fallback-mirror <url|none>] [--torch-index <url>] [--torch-cuda <cuXXX>] [--torch-cpu] [--no-cache] [--json]",
        args: [{ name: "tag", type: "string", required: true, description: "ComfyUI tag" }],
        flags: [
          {
            name: "--mirror",
            type: "url",
            description: "pip \u4E3B\u6E90\uFF08\u9ED8\u8BA4\u963F\u91CC\u4E91 PyPI\uFF09"
          },
          {
            name: "--fallback-mirror",
            type: "url|none",
            description: "pip fallback\uFF08\u9ED8\u8BA4\u5B98\u65B9 PyPI\uFF1Bnone \u5173\u95ED\uFF09"
          },
          {
            name: "--torch-index",
            type: "url",
            description: "PyTorch wheel index \u6839\uFF08\u9ED8\u8BA4\u5B98\u65B9 index\uFF09"
          },
          {
            name: "--torch-cuda",
            type: "tag",
            description: "\u5F3A\u5236 cuXXX\uFF0C\u8DF3\u8FC7\u9A71\u52A8\u63A2\u6D4B"
          },
          {
            name: "--torch-cpu",
            type: "boolean",
            default: false,
            description: "\u663E\u5F0F\u5B89\u88C5 CPU \u7248 torch"
          },
          {
            name: "--no-cache",
            type: "boolean",
            default: false,
            description: "pip \u7981\u7528 cache"
          }
        ],
        implemented: true,
        jsonShape: {
          installed: "string",
          dir: "string",
          toolchain: "object",
          next_actions: "string[]"
        },
        run: (ctx2, args) => runEngine(ctx2, ["install", ...args])
      },
      {
        name: "engine use",
        group: "engine",
        summary: "\u5207\u6362\u672C\u673A\u4F7F\u7528\u7684 ComfyUI \u7248\u672C/\u8DEF\u5F84",
        usage: "daoyan engine use <\u7248\u672C tag|\u8DEF\u5F84> [--json]",
        args: [
          { name: "tag|path", type: "string", required: true, description: "\u5DF2\u5B89\u88C5\u7248\u672C tag \u6216\u5305\u542B main.py \u7684\u76EE\u5F55" }
        ],
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
        summary: "\u81EA\u5347\u7EA7\uFF08\u9ED8\u8BA4 GitHub Release latest.json\uFF1B\u76F4\u8FDE\u5931\u8D25\u81EA\u52A8\u5C1D\u8BD5\u5185\u7F6E\u52A0\u901F\u6E90\uFF09",
        usage: "daoyan update [--check] [--manifest <url|\u8DEF\u5F84>] [--from <\u8DEF\u5F84|URL>] [--sha256 <hex>] [--proxy <url>] [--github-proxy <url[,url]|none>]",
        flags: [
          { name: "--check", type: "boolean", description: "\u53EA\u68C0\u6D4B\u4E0D\u5B89\u88C5" },
          { name: "--manifest", type: "string", description: "\u81EA\u5B9A\u4E49 latest.json\uFF08URL \u6216\u672C\u5730\u8DEF\u5F84\uFF09" },
          { name: "--from", type: "string", description: "\u76F4\u63A5\u5B89\u88C5\u6307\u5B9A tgz\uFF08\u672C\u5730\u8DEF\u5F84\u6216 http(s) URL\uFF09" },
          { name: "--sha256", type: "string", description: "--from \u7684 SHA-256 \u6821\u9A8C\u503C\uFF08\u8FDC\u7A0B\u5FC5\u586B\uFF09" },
          { name: "--proxy", type: "string", description: "\u672C\u6B21\u66F4\u65B0\u4F7F\u7528\u7684 http/https/socks5 \u4EE3\u7406" },
          {
            name: "--github-proxy",
            type: "url[,url]|none",
            description: "GitHub \u52A0\u901F\u6E90\uFF08\u9ED8\u8BA4\u4E3A\u5185\u7F6E\u5217\u8868\uFF1Bnone \u5173\u95ED\uFF1B\u4EC5\u5728\u76F4\u8FDE\u5931\u8D25\u65F6\u4F7F\u7528\uFF09"
          }
        ],
        examples: [
          "daoyan update --check",
          "daoyan update source https://mirror.example.com/daoyan/latest.json",
          "daoyan update --manifest ./latest.json",
          "daoyan update --from ./daoyan-cli-0.0.4.tgz",
          "daoyan update proxy http://127.0.0.1:7890",
          "daoyan update --github-proxy none"
        ],
        implemented: true,
        jsonShape: {
          current: "string",
          latest: "string|null",
          updateAvailable: "boolean",
          source: "github|manifest|from",
          manifest: "string|null",
          via_proxy: "string|null",
          note: "string|null"
        },
        run: (ctx2, args) => runUpdate(ctx2, args)
      },
      {
        name: "update proxy",
        group: "meta",
        summary: "\u67E5\u770B/\u8BBE\u7F6E/\u6E05\u9664\u81EA\u66F4\u65B0\u4EE3\u7406\uFF08~/.dycli/update.json\uFF09",
        usage: "daoyan update proxy [<url>|--unset]",
        args: [
          {
            name: "url",
            type: "string",
            required: false,
            description: "http/https/socks5/socks5h \u4EE3\u7406\u5730\u5740\uFF1B\u7701\u7565\u65F6\u663E\u793A\u5F53\u524D\u503C"
          }
        ],
        flags: [{ name: "--unset", type: "boolean", description: "\u6E05\u9664\u5DF2\u4FDD\u5B58\u7684\u4EE3\u7406" }],
        examples: [
          "daoyan update proxy http://127.0.0.1:7890",
          "daoyan update proxy --unset",
          "daoyan update proxy --json"
        ],
        implemented: true,
        jsonShape: { proxy: "string|null", path: "string" },
        run: (ctx2, args) => runUpdate(ctx2, ["proxy", ...args])
      },
      {
        name: "update source",
        group: "meta",
        summary: "\u67E5\u770B/\u8BBE\u7F6E/\u6E05\u9664\u81EA\u66F4\u65B0\u6E90\uFF08latest.json URL \u6216\u672C\u5730\u8DEF\u5F84\uFF09",
        usage: "daoyan update source [<manifest>|--unset]",
        args: [
          {
            name: "manifest",
            type: "string",
            required: false,
            description: "latest.json \u7684 http(s) URL \u6216\u672C\u5730\u8DEF\u5F84\uFF1B\u7701\u7565\u65F6\u663E\u793A\u5F53\u524D\u503C"
          }
        ],
        flags: [{ name: "--unset", type: "boolean", description: "\u6062\u590D\u9ED8\u8BA4 Release \u6E05\u5355\u6E90" }],
        examples: [
          "daoyan update source https://mirror.example.com/daoyan/latest.json",
          "daoyan update source /data/mirror/daoyan/latest.json",
          "daoyan update source --unset"
        ],
        implemented: true,
        jsonShape: { manifest: "string|null", path: "string" },
        run: (ctx2, args) => runUpdate(ctx2, ["source", ...args])
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