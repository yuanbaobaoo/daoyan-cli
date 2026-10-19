/** 命令注册表 —— help --json、项目内 Skill 与命令分发共用同一份元数据。
 *  已实现：init / validate / skill update / workflow * / run（异步）/ run cancel /
 *  shot / retake / batch / wrap / status / logs / engine * / help / update。 */
import type { CliContext } from "../shared/context.mts";
import type { CommandGroup } from "../shared/groups.mts";
import { VERSION } from "../shared/version.mts";
import { runHelp } from "./help.mts";
import { runUpdate } from "./update.mts";
import { runInit } from "./init.mts";
import { runValidate } from "./validate.mts";
import { runShot, runBatch } from "./shot.mts";
import { runWrap } from "./wrap.mts";
import { runLogs } from "./logs.mts";
import { runStatus } from "./status.mts";
import { runEngine } from "./engine.mts";
import { runWorkflow } from "./workflow.mts";
import { runRun, runCancel } from "./run.mts";
import { runSkill } from "./skill.mts";

/**
 * 位置参数说明。
 */
export interface CommandArg {
  /**
   * 参数名。
   */
  name: string;
  /**
   * 类型说明。
   */
  type: string;
  /**
   * 是否必填。
   */
  required?: boolean;
  /**
   * 是否可多个。
   */
  variadic?: boolean;
  /**
   * 说明。
   */
  description: string;
}

/**
 * flag 说明。
 */
export interface CommandFlag {
  /**
   * flag 名（含 --）。
   */
  name: string;
  /**
   * 取值类型。
   */
  type: string;
  /**
   * 是否必填。
   */
  required?: boolean;
  /**
   * 枚举值。
   */
  enum?: string[];
  /**
   * 默认值。
   */
  default?: unknown;
  /**
   * 说明。
   */
  description: string;
}

/**
 * 单个命令的注册信息。
 */
export interface CommandMeta {
  /**
   * 子命令用空格分隔，如 "engine install"。
   */
  name: string;
  /**
   * 所属分组。
   */
  group: CommandGroup;
  /**
   * 一句话说明。
   */
  summary: string;
  /**
   * 用法字符串。
   */
  usage: string;
  /**
   * 位置参数。
   */
  args?: CommandArg[];
  /**
   * flags。
   */
  flags?: CommandFlag[];
  /**
   * 示例。
   */
  examples?: string[];
  /**
   * 单命令帮助的补充说明。
   */
  detail?: string[];
  /**
   * 是否已实现。
   */
  implemented?: boolean;
  /**
   * 该命令的 JSON data 形状（help --json）。
   */
  jsonShape?: unknown;
  /**
   * 命令实现；可返回进程退出码。
   */
  run: (ctx: CliContext, args: string[]) => void | number | Promise<void | number>;
}

/**
 * 任务创建返回形状（run/shot/batch 共用）。
 */
const TASK_START_SHAPE = {
  task_id: "string",
  state: "queued|running|succeeded|failed|cancelled|interrupted",
  runs: "string[]",
  events_path: "tasks/<task_id>/events.jsonl",
  next_actions: "string[]",
  deduplicated: "boolean",
};

// 任务结果形状（--wait）
const TASK_WAIT_SHAPE = {
  ...TASK_START_SHAPE,
  runs_detail: "object[]",
  interrupted: "boolean",
  timed_out: "boolean",
};

/**
 * 全部命令（注册顺序即 help 顺序；`__worker` 为内部命令，不在此表）。
 */
export const COMMANDS: CommandMeta[] = [
  // ---- 项目 ----
  {
    name: "init",
    group: "project",
    summary: "在当前目录立项：local 部署项目专属 ComfyUI，remote 绑定外部服务",
    usage:
      "daoyan init --mode=local [--modelpath <路径>] [--version <tag>] [--mirror <镜像>] [--no-skill]\n" +
      "daoyan init --mode=remote --url <url> [--no-skill]",
    flags: [
      { name: "--mode", type: "local|remote", required: true, enum: ["local", "remote"], description: "执行模式（必填，无默认值）" },
      { name: "--modelpath", type: "path", description: "local：外部模型根目录（已存在）" },
      { name: "--url", type: "url", description: "remote：外部 ComfyUI base URL（必填）" },
      { name: "--version", type: "tag", description: "local：ComfyUI 版本 tag" },
      { name: "--mirror", type: "url", description: "local：pip 源（默认阿里云 PyPI；可传 https://pypi.org/simple/ 覆盖）" },
      { name: "--no-skill", type: "boolean", default: false, description: "不生成 .agents/skills/daoyan 与 AGENTS.md" },
    ],
    examples: [
      "daoyan init --mode=local --modelpath /data/models",
      "daoyan init --mode=remote --url http://gpu-box:8188",
    ],
    implemented: true,
    jsonShape: { root: "string", mode: "local|remote", project_created: "boolean", engine_installed: "boolean", port: "number|null", skill: "object|null" },
    run: (ctx, args) => runInit(ctx, args),
  },
  {
    name: "validate",
    group: "project",
    summary: "项目级离线校验（配置/workflows/bindings/overrides/shots/引擎目录/Skill）",
    usage: "daoyan validate [--json]",
    implemented: true,
    jsonShape: { ok: "boolean", issues: "Array<{path,code,severity,message,hint}>" },
    run: (ctx) => runValidate(ctx),
  },
  {
    name: "skill update",
    group: "project",
    summary: "重新生成项目内 Agent Skill 与 AGENTS.md 管理块",
    usage: "daoyan skill update [--json]",
    implemented: true,
    jsonShape: { path: "string", files: "number", hash: "string" },
    run: (ctx, args) => runSkill(ctx, args),
  },

  // ---- 工作流 ----
  {
    name: "workflow new",
    group: "workflow",
    summary: "创建空工作流（{ }，后续用 apply/set 编辑）",
    usage: "daoyan workflow new <name> [--json]",
    args: [{ name: "name", type: "string", required: true, description: "工作流短名（字母数字 . _ -）" }],
    implemented: true,
    run: (ctx, args) => runWorkflow(ctx, ["new", ...args]),
  },
  {
    name: "workflow import",
    group: "workflow",
    summary: "导入 ComfyUI API JSON（不重命名节点）",
    usage: "daoyan workflow import <api.json> --name <name> [--json]",
    args: [{ name: "api.json", type: "path", required: true, description: "ComfyUI Save (API Format) 导出的 JSON" }],
    flags: [{ name: "--name", type: "string", required: true, description: "工作流短名" }],
    examples: ["daoyan workflow import ./from-comfyui.json --name t2v --json"],
    implemented: true,
    run: (ctx, args) => runWorkflow(ctx, ["import", ...args]),
  },
  {
    name: "workflow list",
    group: "workflow",
    summary: "列出 workflows/ 下的图（节点/连线/合法性）",
    usage: "daoyan workflow list [--json]",
    implemented: true,
    run: (ctx) => runWorkflow(ctx, ["list"]),
  },
  {
    name: "workflow show",
    group: "workflow",
    summary: "查看工作流摘要或完整图 / 单节点",
    usage: "daoyan workflow show <name> [--full] [--node <id>] [--json]",
    args: [{ name: "name", type: "string", required: true, description: "工作流短名或路径" }],
    flags: [
      { name: "--full", type: "boolean", description: "输出完整图" },
      { name: "--node", type: "string", description: "只看某个节点" },
    ],
    implemented: true,
    run: (ctx, args) => runWorkflow(ctx, ["show", ...args]),
  },
  {
    name: "workflow nodes",
    group: "workflow",
    summary: "查询节点目录（默认缓存；--refresh 拉取 /object_info）",
    usage: "daoyan workflow nodes [--filter <文本>] [--refresh] [--limit N] [--cursor <c>] [--fields <list>] [--json]",
    flags: [
      { name: "--filter", type: "text", description: "按类名/展示名/分类过滤" },
      { name: "--refresh", type: "boolean", description: "重新拉取；local 启动 metadata session（不加载模型）" },
      { name: "--limit", type: "integer", default: 100, description: "每页数量（最大 1000）" },
      { name: "--cursor", type: "integer", default: 0, description: "分页游标" },
      { name: "--fields", type: "list", description: "逗号分隔字段，如 name,category" },
    ],
    examples: ["daoyan workflow nodes --filter KSampler --json", "daoyan workflow nodes --refresh --json"],
    implemented: true,
    jsonShape: { nodes: "object[]", total: "number", next_cursor: "string|null", fingerprint: "object" },
    run: (ctx, args) => runWorkflow(ctx, ["nodes", ...args]),
  },
  {
    name: "workflow node",
    group: "workflow",
    summary: "查看单个节点类的输入/输出定义",
    usage: "daoyan workflow node <class_type> [--json]",
    args: [{ name: "class_type", type: "string", required: true, description: "节点类名" }],
    examples: ["daoyan workflow node KSampler --json"],
    implemented: true,
    run: (ctx, args) => runWorkflow(ctx, ["node", ...args]),
  },
  {
    name: "workflow apply",
    group: "workflow",
    summary: "批量图操作（全量校验后原子写盘）",
    usage: "daoyan workflow apply <name> --ops <ops.json|-> [--json]",
    args: [{ name: "name", type: "string", required: true, description: "工作流短名或路径" }],
    flags: [{ name: "--ops", type: "path|-", required: true, description: "ops JSON 文件；- 表示 stdin" }],
    examples: ["daoyan workflow apply t2v --ops ./ops.json --json"],
    implemented: true,
    jsonShape: { applied: "number", assigned_ids: "object[]", changed_nodes: "string[]", removed_links: "object[]", warnings: "object[]", graph_sha256: "string" },
    run: (ctx, args) => runWorkflow(ctx, ["apply", ...args]),
  },
  {
    name: "workflow set",
    group: "workflow",
    summary: "单点设置节点输入（值按 JSON 解析）",
    usage: "daoyan workflow set <name> <nodeId>.<input> <value> [--json]",
    args: [
      { name: "name", type: "string", required: true, description: "工作流短名或路径" },
      { name: "nodeId.input", type: "string", required: true, description: "目标输入" },
      { name: "value", type: "string", required: true, description: "JSON 字面量或字符串" },
    ],
    examples: ["daoyan workflow set t2v 7.seed 42", 'daoyan workflow set t2v 6.text "a dog"'],
    implemented: true,
    run: (ctx, args) => runWorkflow(ctx, ["set", ...args]),
  },
  {
    name: "workflow validate",
    group: "workflow",
    summary: "单图离线校验（结构/bindings/overrides/缓存目录）",
    usage: "daoyan workflow validate <name> [--json]",
    args: [{ name: "name", type: "string", required: true, description: "工作流短名或路径" }],
    implemented: true,
    jsonShape: { workflow: "string", ok: "boolean", issues: "Array<{path,code,severity,message,hint}>" },
    run: (ctx, args) => runWorkflow(ctx, ["validate", ...args]),
  },

  // ---- 生产 ----
  {
    name: "run",
    group: "production",
    summary: "执行一个 workflow（默认异步 task；--wait 才阻塞）",
    usage:
      "daoyan run <workflow.json|name> [--set nodeId.input=value ...] [--label <label>]\n" +
      "                  [--engine <url>] [--request-id <id>] [--wait] [--dry-run]\n" +
      "                  [--timeout <小时>] [--json]",
    args: [{ name: "workflow", type: "string", required: true, description: "工作流短名或项目内相对路径" }],
    flags: [
      { name: "--set", type: "key=value", description: "覆盖节点输入或 bindings 逻辑名（可重复）" },
      { name: "--label", type: "string", description: "run label（如 shot:01）" },
      { name: "--engine", type: "url", description: "单次 remote 覆盖 URL" },
      { name: "--request-id", type: "string", description: "幂等键；重复调用返回同一 task" },
      { name: "--wait", type: "boolean", description: "前台等待到终态（SIGINT 只停止等待）" },
      { name: "--dry-run", type: "boolean", description: "只输出解析后的计划，不占锁、不执行" },
      { name: "--timeout", type: "number", description: "任务等待上限（小时，默认 3）" },
    ],
    examples: [
      "daoyan run t2v --set seed=42 --label shot:01 --request-id shot-01 --json",
      "daoyan run workflows/t2v.json --set 7.steps=20 --wait --json",
    ],
    implemented: true,
    jsonShape: TASK_START_SHAPE,
    run: (ctx, args) => runRun(ctx, args),
  },
  {
    name: "run cancel",
    group: "production",
    summary: "取消一个 task（worker 执行 interrupt→free→stop→restore）",
    usage: "daoyan run cancel <task_id> [--json]",
    args: [{ name: "task_id", type: "string", required: true, description: "任务 id" }],
    implemented: true,
    run: (ctx, args) => runCancel(ctx, args),
  },
  {
    name: "shot",
    group: "production",
    summary: "拍摄指定镜头（一个 task 多个 run；默认异步）",
    usage: "daoyan shot <镜号...> [--steps N] [--request-id <id>] [--wait] [--timeout <小时>] [--json]",
    args: [{ name: "镜号", type: "string", required: true, variadic: true, description: "shots.json 中的镜头 id" }],
    flags: [
      { name: "--steps", type: "integer", description: "覆盖采样步数" },
      { name: "--request-id", type: "string", description: "幂等键" },
      { name: "--wait", type: "boolean", description: "前台等待到终态" },
      { name: "--timeout", type: "number", description: "任务等待上限（小时）" },
    ],
    implemented: true,
    jsonShape: TASK_START_SHAPE,
    run: (ctx, args) => runShot(ctx, args),
  },
  {
    name: "retake",
    group: "production",
    summary: "强制重拍指定镜头（忽略已有成功 run）",
    usage: "daoyan retake <镜号...> [--steps N] [--request-id <id>] [--wait] [--json]",
    args: [{ name: "镜号", type: "string", required: true, variadic: true, description: "shots.json 中的镜头 id" }],
    implemented: true,
    jsonShape: TASK_START_SHAPE,
    run: (ctx, args) => runShot(ctx, args, true),
  },
  {
    name: "batch",
    group: "production",
    summary: "连拍全部未完成镜头（已有成功 run 跳过；默认异步）",
    usage: "daoyan batch [--request-id <id>] [--wait] [--timeout <小时>] [--json]",
    flags: [
      { name: "--request-id", type: "string", description: "幂等键" },
      { name: "--wait", type: "boolean", description: "前台等待到终态" },
      { name: "--timeout", type: "number", description: "任务等待上限（小时）" },
    ],
    implemented: true,
    jsonShape: TASK_START_SHAPE,
    run: (ctx, args) => runBatch(ctx, args),
  },
  {
    name: "wrap",
    group: "production",
    summary: "从 runs 选段合片，写 final/cut-*.mp4 与清单（不占机器锁）",
    usage: "daoyan wrap [--select <镜号>=<run_id> ...] [--json]",
    flags: [{ name: "--select", type: "镜号=run_id", description: "显式指定某镜使用的 run（可重复）" }],
    implemented: true,
    jsonShape: { output: "string", manifest: "string", clips: "object[]", missing: "string[]" },
    run: (ctx, args) => runWrap(ctx, args),
  },

  // ---- 运维 ----
  {
    name: "status",
    group: "ops",
    summary: "被动状态快照；--task/--run 查看任务与运行详情",
    usage:
      "daoyan status [--json]\n" +
      "daoyan status --task <task_id> [--wait] [--timeout <秒>] [--json]\n" +
      "daoyan status --run <run_id> [--wait] [--timeout <秒>] [--json]",
    flags: [
      { name: "--task", type: "string", description: "查看任务" },
      { name: "--run", type: "string", description: "查看单 run" },
      { name: "--wait", type: "boolean", description: "等待到终态（SIGINT 只停止等待）" },
      { name: "--timeout", type: "number", description: "等待上限（秒）" },
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
      shots: "object[]",
    },
    run: (ctx, args) => runStatus(ctx, args),
  },
  {
    name: "logs",
    group: "ops",
    summary: "结构化事件流（--task/--run）或引擎/worker 文本日志",
    usage:
      "daoyan logs [-f] [-n N] [--task <task_id> | --run <run_id>] [--json]\n" +
      "daoyan logs [-f] [-n N] [--src daoyan-cli|engine|worker|all]",
    flags: [
      { name: "-f", type: "boolean", description: "跟随到终态/持续输出" },
      { name: "-n", type: "integer", default: 100, description: "尾部条数" },
      { name: "--task", type: "string", description: "任务事件流" },
      { name: "--run", type: "string", description: "单 run 事件" },
      { name: "--src", type: "engine|worker|daoyan-cli|all", enum: ["engine", "worker", "daoyan-cli", "all"], description: "文件日志数据源" },
    ],
    implemented: true,
    run: (ctx, args) => runLogs(ctx, args),
  },

  // ---- 引擎 ----
  {
    name: "engine ls",
    group: "engine",
    summary: "列出当前引擎、本地版本目录与 GitHub tags",
    usage: "daoyan engine ls [--json]",
    implemented: true,
    run: (ctx) => runEngine(ctx, ["ls"]),
  },
  {
    name: "engine install",
    group: "engine",
    summary: "安装指定 ComfyUI 版本到 engine/versions/<tag>",
    usage: "daoyan engine install <版本 tag> [--mirror <url>] [--json]",
    args: [{ name: "tag", type: "string", required: true, description: "ComfyUI tag" }],
    flags: [
      {
        name: "--mirror",
        type: "url",
        description: "pip 源（默认阿里云 PyPI；可传 https://pypi.org/simple/ 覆盖）",
      },
    ],
    implemented: true,
    run: (ctx, args) => runEngine(ctx, ["install", ...args]),
  },
  {
    name: "engine use",
    group: "engine",
    summary: "切换本机使用的 ComfyUI 版本/路径",
    usage: "daoyan engine use <版本 tag|路径> [--json]",
    args: [{ name: "tag|path", type: "string", required: true, description: "已安装版本 tag 或包含 main.py 的目录" }],
    implemented: true,
    run: (ctx, args) => runEngine(ctx, ["use", ...args]),
  },

  // ---- 元 ----
  {
    name: "help",
    group: "meta",
    summary: "帮助与机器自描述（--json 输出命令/参数/Schema/错误目录）",
    usage: "daoyan help [命令] [--json]",
    implemented: true,
    run: (ctx, args) => runHelp(ctx, args, COMMANDS, VERSION),
  },
  {
    name: "update",
    group: "meta",
    summary: "自升级（默认 GitHub；支持自定义 manifest / tgz / 代理）",
    usage:
      "daoyan update [--check] [--manifest <url|路径>] [--from <路径|URL>] [--sha256 <hex>] [--proxy <url>]",
    flags: [
      { name: "--check", type: "boolean", description: "只检测不安装" },
      { name: "--manifest", type: "string", description: "自定义 latest.json（URL 或本地路径）" },
      { name: "--from", type: "string", description: "直接安装指定 tgz（本地路径或 http(s) URL）" },
      { name: "--sha256", type: "string", description: "--from 的 SHA-256 校验值（远程必填）" },
      { name: "--proxy", type: "string", description: "本次更新使用的 http/https/socks5 代理" },
    ],
    examples: [
      "daoyan update --check",
      "daoyan update source https://mirror.example.com/daoyan/latest.json",
      "daoyan update --manifest ./latest.json",
      "daoyan update --from ./daoyan-cli-0.0.4.tgz",
      "daoyan update proxy http://127.0.0.1:7890",
    ],
    implemented: true,
    jsonShape: {
      current: "string",
      latest: "string|null",
      updateAvailable: "boolean",
      source: "github|manifest|from",
      manifest: "string|null",
      note: "string|null",
    },
    run: (ctx, args) => runUpdate(ctx, args),
  },
  {
    name: "update proxy",
    group: "meta",
    summary: "查看/设置/清除自更新代理（~/.dycli/update.json）",
    usage: "daoyan update proxy [<url>|--unset]",
    args: [
      {
        name: "url",
        type: "string",
        required: false,
        description: "http/https/socks5/socks5h 代理地址；省略时显示当前值",
      },
    ],
    flags: [{ name: "--unset", type: "boolean", description: "清除已保存的代理" }],
    examples: [
      "daoyan update proxy http://127.0.0.1:7890",
      "daoyan update proxy --unset",
      "daoyan update proxy --json",
    ],
    implemented: true,
    jsonShape: { proxy: "string|null", path: "string" },
    run: (ctx, args) => runUpdate(ctx, ["proxy", ...args]),
  },
  {
    name: "update source",
    group: "meta",
    summary: "查看/设置/清除自更新源（latest.json URL 或本地路径）",
    usage: "daoyan update source [<manifest>|--unset]",
    args: [
      {
        name: "manifest",
        type: "string",
        required: false,
        description: "latest.json 的 http(s) URL 或本地路径；省略时显示当前值",
      },
    ],
    flags: [{ name: "--unset", type: "boolean", description: "恢复默认 GitHub 源" }],
    examples: [
      "daoyan update source https://mirror.example.com/daoyan/latest.json",
      "daoyan update source /data/mirror/daoyan/latest.json",
      "daoyan update source --unset",
    ],
    implemented: true,
    jsonShape: { manifest: "string|null", path: "string" },
    run: (ctx, args) => runUpdate(ctx, ["source", ...args]),
  },
];

/**
 * 命令查找：优先子命令全名（"engine install"），再退回主命令。
 */
export function findCommand(
  name: string,
  args: readonly string[],
): { meta: CommandMeta; rest: string[] } | null {
  if (args.length > 0) {
    // 子命令全名
    const sub = COMMANDS.find((c) => c.name === `${name} ${args[0]}`);
    if (sub) return { meta: sub, rest: args.slice(1) };
  }
  const main = COMMANDS.find((c) => c.name === name);
  return main ? { meta: main, rest: [...args] } : null;
}
