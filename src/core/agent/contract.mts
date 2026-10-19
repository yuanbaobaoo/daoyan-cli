/** Agent 契约的常量与 JSON Schema —— `help --json` 与项目内 Skill 共用。
 *  schema_version 只在破坏性变更时递增；错误码与字段保持向后兼容。 */
import { SCHEMA_VERSION } from "../../shared/json.mts";
import { ERROR_CODES, ERROR_META } from "../../shared/errors.mts";
import type { Bindings, MachineConfig, ProjectConfig, TaskRecord } from "../project/types.mts";

/**
 * AGENTS.md 管理块起始标记。
 */
export const AGENTS_BLOCK_START = "<!-- daoyan:skill:start -->";

/**
 * AGENTS.md 管理块结束标记。
 */
export const AGENTS_BLOCK_END = "<!-- daoyan:skill:end -->";

/**
 * AGENTS.md 管理块正文（幂等写入，不覆盖用户内容）。
 */
export const AGENTS_BLOCK_BODY = [
  "This project uses dycli/daoyan for ComfyUI workflows.",
  "Before creating or running workflows, read `.agents/skills/daoyan/SKILL.md`.",
  "Use `daoyan` commands with `--json`; do not edit `engine/`, `logs/`, or `.dycli/`.",
  "Only one generation task runs per machine; if you get `machine_busy`, inspect the owner and retry later.",
].join("\n");

/**
 * 机器能力声明（help --json 的 capabilities）。
 */
export function capabilities(): Record<string, unknown> {
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
      "/interrupt",
    ],
  };
}

/**
 * project.json 的 JSON Schema（共享层）。
 */
export const PROJECT_SCHEMA: Record<string, unknown> = {
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
      properties: { takeover: { type: "boolean", default: false } },
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
              ref: { type: "string" },
            },
          },
        },
      },
    },
  },
};

/**
 * .dycli/machine.json 的 JSON Schema（本机层）。
 */
export const MACHINE_SCHEMA: Record<string, unknown> = {
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
            venv_dir: { type: "string" },
          },
        },
        {
          type: "object",
          required: ["mode", "url"],
          properties: {
            mode: { const: "remote" },
            url: { type: "string", pattern: "^https?://" },
            free_after_task: { enum: ["always", "when_idle", "never"], default: "when_idle" },
          },
        },
      ],
    },
    overrides: {
      type: "object",
      additionalProperties: {
        type: "object",
        additionalProperties: true,
      },
      description: 'workflow 相对路径 -> { "nodeId.input": value }',
    },
  },
};

/**
 * 工作流图（ComfyUI API JSON）的 JSON Schema。
 */
export const WORKFLOW_SCHEMA: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "workflow (ComfyUI API JSON)",
  type: "object",
  additionalProperties: {
    type: "object",
    required: ["class_type"],
    properties: {
      class_type: { type: "string", minLength: 1 },
      inputs: { type: "object", additionalProperties: true },
    },
  },
};

/**
 * bindings 文件的 JSON Schema。
 */
export const BINDINGS_SCHEMA: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "<name>.bindings.json",
  type: "object",
  additionalProperties: { type: "string", pattern: "^[^.]+\\.\\S+$" },
  description: '逻辑输入名 -> "nodeId.input"',
};

/**
 * graph ops 的 JSON Schema（workflow apply --ops）。
 */
export const GRAPH_OPS_SCHEMA: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "workflow apply ops",
  oneOf: [
    {
      type: "object",
      required: ["ops"],
      properties: { ops: { type: "array", items: { $ref: "#/$defs/op" } } },
    },
    { type: "array", items: { $ref: "#/$defs/op" } },
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
            class_type: { type: "string" },
          },
        },
        {
          type: "object",
          required: ["op", "node", "input", "value"],
          properties: {
            op: { const: "set_input" },
            node: { type: "string" },
            input: { type: "string" },
            value: {},
          },
        },
        {
          type: "object",
          required: ["op", "from", "to"],
          properties: {
            op: { const: "connect" },
            from: {
              type: "object",
              required: ["node", "output"],
              properties: { node: { type: "string" }, output: { type: "integer", minimum: 0 } },
            },
            to: {
              type: "object",
              required: ["node", "input"],
              properties: { node: { type: "string" }, input: { type: "string" } },
            },
          },
        },
        {
          type: "object",
          required: ["op", "node", "input"],
          properties: {
            op: { const: "disconnect" },
            node: { type: "string" },
            input: { type: "string" },
          },
        },
        {
          type: "object",
          required: ["op", "node"],
          properties: {
            op: { const: "remove_node" },
            node: { type: "string" },
            force: { type: "boolean" },
          },
        },
        {
          type: "object",
          required: ["op", "graph"],
          properties: { op: { const: "replace_graph" }, graph: { type: "object" } },
        },
      ],
    },
  },
};

/**
 * task.json 的 JSON Schema（摘要）。
 */
export const TASK_SCHEMA: Record<string, unknown> = {
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
    "options",
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
      properties: { pid: { type: "integer" }, started_at: { type: "string" } },
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
        force: { type: "boolean" },
      },
    },
  },
};

/**
 * run.json 的 JSON Schema（摘要）。
 */
export const RUN_SCHEMA: Record<string, unknown> = {
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
    "error",
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
      properties: { path: { type: "string" }, sha256: { type: "string" } },
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
          bytes: { type: "integer" },
        },
      },
    },
    error: { type: ["object", "null"] },
  },
  description: "记录不含绝对路径；workflow/inputs 快照位于同目录。",
};

/**
 * 错误目录（help --json / Skill reference/errors.md）。
 */
export function errorCatalog(): Array<Record<string, unknown>> {
  return ERROR_CODES.map((code) => {
    // 默认语义
    const meta = ERROR_META[code];
    return {
      code,
      retryable: meta.retryable,
      ...(meta.retryAfterMs !== undefined ? { retry_after_ms: meta.retryAfterMs } : {}),
      hint: meta.hint,
      ...(meta.nextActions !== undefined ? { next_actions: meta.nextActions } : {}),
    };
  });
}

/**
 * 示例 project.json（文档/Skill 用）。
 */
export const EXAMPLE_PROJECT: ProjectConfig = {
  name: "demo",
  version: 2,
  default_workflow: "workflows/t2v.json",
  gpu: { takeover: false },
  comfyui: {
    version: "v0.3.40",
    custom_nodes: [
      {
        name: "ComfyUI-VideoHelperSuite",
        repo: "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git",
        ref: "v1.7.4",
      },
    ],
  },
};

/**
 * 示例 machine.json（local）。
 */
export const EXAMPLE_MACHINE_LOCAL: MachineConfig = {
  machine_id: "mac-studio",
  engine: { mode: "local", modelpath: "/data/models", port: 8188, launch_extra: [] },
  overrides: {
    "workflows/t2v.json": { "5.width": 512, "5.height": 768, "7.steps": 20 },
  },
};

/**
 * 示例 machine.json（remote）。
 */
export const EXAMPLE_MACHINE_REMOTE: MachineConfig = {
  machine_id: "mac-studio",
  engine: { mode: "remote", url: "http://gpu-box:8188", free_after_task: "when_idle" },
};

/**
 * 示例 bindings。
 */
export const EXAMPLE_BINDINGS: Bindings = {
  prompt: "5.prompt",
  negative: "4.text",
  seed: "7.seed",
  steps: "7.steps",
  first_frame: "0.image",
  width: "5.width",
  height: "5.height",
};

/**
 * 示例 task 记录。
 */
export const EXAMPLE_TASK: Partial<TaskRecord> = {
  task_id: "t_20261019T153012-mac-7f3a",
  kind: "run",
  machine_id: "mac-studio",
  request_id: "agent-7f3a-001",
  status: "queued",
  mode: "local",
  runs: [],
  worker: null,
  created_at: "2026-10-19T15:30:12.000Z",
  started_at: null,
  finished_at: null,
  error: null,
  next_actions: ["status --task <id> --wait"],
  options: { workflow: "workflows/t2v.json", sets: { "7.seed": 1101 } },
};
