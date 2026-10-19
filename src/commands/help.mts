/** help —— 帮助与机器自描述：
 *  - daoyan help            人类可读总览
 *  - daoyan help <命令>     单命令详情（参数/flags/示例）
 *  - daoyan help --json     完整 Agent 契约：命令、参数、Schema、错误目录、Skill 状态。
 *  与 Skill 生成器共用 registry，避免手写漂移。 */
import { GROUP_LABEL, type CommandGroup } from "../shared/groups.mts";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import type { CliContext } from "../shared/context.mts";
import { findProject } from "../core/project/config.mts";
import { skillState } from "../core/agent/skill.mts";
import {
  BINDINGS_SCHEMA,
  GRAPH_OPS_SCHEMA,
  MACHINE_SCHEMA,
  PROJECT_SCHEMA,
  RUN_SCHEMA,
  TASK_SCHEMA,
  WORKFLOW_SCHEMA,
  capabilities,
  errorCatalog,
} from "../core/agent/contract.mts";
import type { CommandMeta } from "./registry.mts";

/**
 * help --json 的完整自描述文档。
 */
export interface AgentDoc {
  /**
   * 可执行入口名。
   */
  name: string;
  /**
   * CLI 版本。
   */
  version: string;
  /**
   * 一句话定位。
   */
  tagline: string;
  /**
   * 信封 schema 版本。
   */
  schema_version: number;
  /**
   * 能力声明。
   */
  capabilities: Record<string, unknown>;
  /**
   * 模式差异。
   */
  modes: {
    /**
     * local：项目内托管引擎。
     */
    local: string;
    /**
     * remote：外部引擎，只走 HTTP。
     */
    remote: string;
  };
  /**
   * 全部命令（含参数/flags/示例/JSON 形状）。
   */
  commands: Array<Record<string, unknown>>;
  /**
   * 成功 / 失败信封示例。
   */
  output_envelope: { success: unknown; failure: unknown };
  /**
   * 退出码。
   */
  exit_codes: Record<string, string>;
  /**
   * 错误目录（含 retryable / hint / next_actions）。
   */
  errors: Array<Record<string, unknown>>;
  /**
   * JSON Schema。
   */
  schemas: Record<string, unknown>;
  /**
   * 项目内 Skill 状态（无项目时为 null）。
   */
  skill: Record<string, unknown> | null;
}

/**
 * 构造 Agent 自描述文档。
 */
export function buildAgentDoc(
  version: string,
  commands: readonly CommandMeta[],
  root: string | null = null,
): AgentDoc {
  // Skill 状态（项目内）
  let skill: Record<string, unknown> | null = null;
  if (root !== null) {
    try {
      const state = skillState(root, version, commands);
      skill = {
        path: state.path,
        present: state.present,
        version: state.version,
        stale: state.stale,
        agents_block: state.agents_block,
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
      local: "项目专属 ComfyUI；task 开始拉起，结束 /free + 停止；可开启 GPU 接管",
      remote: "外部 ComfyUI；只走 HTTP，不启动/停止/杀进程；任务结束按策略 /free",
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
      ...(c.jsonShape !== undefined ? { output: c.jsonShape } : {}),
    })),
    output_envelope: {
      success: { ok: true, schema_version: 1, data: "…" },
      failure: {
        ok: false,
        schema_version: 1,
        error: {
          code: "machine_busy",
          message: "another task is running",
          retryable: true,
          retry_after_ms: 5000,
          hint: "…",
          task_id: "t_…",
          run_id: null,
          next_actions: ["status --task <id>", "run cancel <id>"],
          details: {},
        },
      },
    },
    exit_codes: {
      "0": "成功 / task 已创建（默认异步不代表生成成功）",
      "1": "业务失败 / task 失败",
      "2": "用法错误",
      "130": "取消或前台等待被 SIGINT 中断",
    },
    errors: errorCatalog(),
    schemas: {
      project: PROJECT_SCHEMA,
      machine: MACHINE_SCHEMA,
      workflow: WORKFLOW_SCHEMA,
      bindings: BINDINGS_SCHEMA,
      graph_ops: GRAPH_OPS_SCHEMA,
      task: TASK_SCHEMA,
      run: RUN_SCHEMA,
    },
    skill,
  };
}

/**
 * 打印人类可读总览。
 */
export function printMainHelp(commands: readonly CommandMeta[], version: string): void {
  // 输出行
  const lines: string[] = [
    "daoyan —— Agent 驱动的 ComfyUI 节点编辑器 + 执行运行时（dycli 等价）",
    "",
    "用法: daoyan [全局参数] <命令> [参数...]",
    "",
    "全局参数:",
    "  --json            机器可读信封（非 TTY 默认开启）",
    "  --no-json         强制人类文本",
    "  --project <路径>   指定项目目录（默认向上寻找 project.json）",
    "  --no-color        关闭彩色输出",
    "  -h, --help        帮助；daoyan help <命令>",
    "  -v, --version     版本",
    "",
    "核心约定:",
    "  - generation task 默认异步；用 status --task <id> --wait 等终态",
    "  - 同一设备同一时刻只允许一个 task；忙时返回 machine_busy",
    "  - local 引擎只在任务期间存在；remote 只走 HTTP",
    "",
  ];
  for (const g of Object.keys(GROUP_LABEL) as CommandGroup[]) {
    // 组内已实现命令
    const groupCommands = commands.filter((x) => x.group === g && x.implemented !== false);
    if (groupCommands.length === 0) continue;
    lines.push(`${GROUP_LABEL[g]}:`);
    for (const c of groupCommands) {
      lines.push(`  ${c.usage.split("\n")[0]}`);
      lines.push(`    ${c.summary}`);
    }
    lines.push("");
  }
  lines.push(`daoyan v${version} · 机器契约: daoyan help --json`);
  process.stdout.write(lines.join("\n") + "\n");
}

/**
 * 打印单命令详情。
 */
export function printCommandHelp(meta: CommandMeta): void {
  // 输出行
  const lines: string[] = [meta.usage, `  ${meta.summary}`];
  if (meta.args !== undefined && meta.args.length > 0) {
    lines.push("", "参数:");
    for (const a of meta.args) {
      lines.push(`  ${a.name} (${a.type}${a.required === true ? "，必填" : ""}${a.variadic === true ? "，可多个" : ""}) — ${a.description}`);
    }
  }
  if (meta.flags !== undefined && meta.flags.length > 0) {
    lines.push("", "Flags:");
    for (const f of meta.flags) {
      // 约束
      const bits = [f.type];
      if (f.required === true) bits.push("必填");
      if (f.enum !== undefined) bits.push(f.enum.join("|"));
      if (f.default !== undefined) bits.push(`默认 ${JSON.stringify(f.default)}`);
      lines.push(`  ${f.name} (${bits.join("，")}) — ${f.description}`);
    }
  }
  if (meta.examples !== undefined && meta.examples.length > 0) {
    lines.push("", "示例:");
    for (const e of meta.examples) lines.push(`  ${e}`);
  }
  if (meta.detail !== undefined) {
    lines.push("", "说明:");
    for (const d of meta.detail) lines.push(`  ${d}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

/**
 * help 命令入口。
 */
export function runHelp(
  ctx: CliContext,
  args: string[],
  commands: readonly CommandMeta[],
  version: string,
): void {
  // 目标命令名（忽略 - 开头参数）
  const target = args.filter((a) => !a.startsWith("-")).join(" ");
  // 项目根（Skill 状态）
  let root: string | null = null;
  try {
    root = findProject(ctx.projectPath ?? process.cwd())?.root ?? null;
  } catch {
    root = null;
  }

  if (target === "") {
    if (ctx.json) {
      emitData(buildAgentDoc(version, commands, root));
      return;
    }
    printMainHelp(commands, version);
    return;
  }

  // 命中命令
  const hit = commands.find((c) => c.name === target);
  if (hit === undefined) {
    throw new DaoyanCliError({
      code: "usage",
      message: `未知命令 ${target}；daoyan help 查看全部`,
      exit: 2,
    });
  }
  if (ctx.json) {
    emitData({
      name: hit.name,
      group: hit.group,
      summary: hit.summary,
      usage: hit.usage,
      implemented: hit.implemented ?? false,
      args: hit.args ?? [],
      flags: hit.flags ?? [],
      examples: hit.examples ?? [],
      ...(hit.jsonShape !== undefined ? { output: hit.jsonShape } : {}),
      detail: hit.detail ?? [],
    });
    return;
  }
  printCommandHelp(hit);
}
