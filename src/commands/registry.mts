/** 命令注册表 —— 全部命令的元信息 + run。
 *  已实现：help / update / init / validate / shot / retake / wrap / logs / status / engine ls|install|use。
 *  其余为 not_implemented 占位，交付里程碑见 docs/PLAN.md §10。 */
import { DaoyanCliError } from "../shared/errors.mts";
import type { CliContext } from "../shared/context.mts";
import type { CommandGroup } from "../shared/groups.mts";
import { VERSION } from "../shared/version.mts";
import { runHelp } from "./help.mts";
import { runUpdate } from "./update.mts";
import { runInit } from "./init.mts";
import { runValidate } from "./validate.mts";
import { runShot } from "./shot.mts";
import { runWrap } from "./wrap.mts";
import { runLogs } from "./logs.mts";
import { runStatus } from "./status.mts";
import { runEngine } from "./engine.mts";

export interface CommandMeta {
  /** 子命令用空格分隔，如 "engine install" */
  name: string;
  group: CommandGroup;
  summary: string;
  usage: string;
  detail?: string[];
  /** help 据此标注 ✅/⬜ */
  implemented?: boolean;
  run: (ctx: CliContext, args: string[]) => void | Promise<void>;
}

const planned =
  (milestone: string) =>
  (_ctx: CliContext, _args: string[]): void => {
    throw new DaoyanCliError({
      code: "not_implemented",
      message: `该命令计划在 ${milestone} 交付（docs/PLAN.md §10 里程碑）。`,
    });
  };

export const COMMANDS: CommandMeta[] = [
  // ---- 项目 ----
  {
    name: "init",
    group: "project",
    summary: "立项：本地装引擎（venv/clone）或 --remote 直连远端 ComfyUI",
    usage: "daoyan-cli init <名称> [--version <tag>] [--use-existing <路径>] [--remote <url>] [--mirror <镜像>]",
    detail: [
      "ComfyUI 是外部组件：init 只编排（clone / 装依赖），不捆绑。",
      "--use-existing 接管既有安装，跳过引擎安装步骤。",
      "--remote <url> 远端模式：不安装引擎，project.json 写 engine.mode=remote 直连。",
    ],
    implemented: true,
    run: (ctx, args) => runInit(ctx, args),
  },
  {
    name: "validate",
    group: "project",
    summary: "项目规则全量校验（接力闭合/锚点存在/尺寸 32 倍数/seed 冲突）",
    usage: "daoyan-cli validate [--json]",
    implemented: true,
    run: (ctx) => runValidate(ctx),
  },

  // ---- 生产 ----
  {
    name: "shot",
    group: "production",
    summary: "拍指定镜头（自动 up→首帧注入→提交→轮询→落位；已有产物跳过）",
    usage: "daoyan-cli shot <镜号...> [--steps N] [--timeout 小时] [--no-evict] [--no-up]",
    detail: ["--no-evict 当前为默认行为（GPU 编排未接入，参数仅为兼容保留）。"],
    implemented: true,
    run: (ctx, args) => runShot(ctx, args),
  },
  {
    name: "retake",
    group: "production",
    summary: "重拍（等价 shot --force）",
    usage: "daoyan-cli retake <镜号...>",
    implemented: true,
    run: (ctx, args) => runShot(ctx, args, true),
  },
  {
    name: "batch",
    group: "production",
    summary: "连拍全部未完成镜头（断点续跑）",
    usage: "daoyan-cli batch [--no-evict] [--timeout 小时]",
    run: planned("M1"),
  },
  {
    name: "wrap",
    group: "production",
    summary: "杀青：ffmpeg 合片交付到 final/（libx264/crf18/faststart）",
    usage: "daoyan-cli wrap",
    implemented: true,
    run: (ctx) => runWrap(ctx),
  },

  // ---- 引擎 ----
  {
    name: "up",
    group: "engine",
    summary: "引擎就位（local：拉起进程+就绪探测；shot 会自动执行）",
    usage: "daoyan-cli up",
    run: planned("M1"),
  },
  {
    name: "down",
    group: "engine",
    summary: "停止引擎（local 模式；remote 模式引擎由远端管理，本命令不适用）",
    usage: "daoyan-cli down [--force]",
    run: planned("M1"),
  },
  {
    name: "engine ls",
    group: "engine",
    summary: "列出可用 ComfyUI 版本（本地 engine/versions/ + GitHub tags）",
    usage: "daoyan-cli engine ls",
    implemented: true,
    run: (ctx, args) => runEngine(ctx, ["ls", ...args]),
  },
  {
    name: "engine install",
    group: "engine",
    summary: "安装指定版本的 ComfyUI（外部组件，local 模式）",
    usage: "daoyan-cli engine install <版本 tag>",
    implemented: true,
    run: (ctx, args) => runEngine(ctx, ["install", ...args]),
  },
  {
    name: "engine use",
    group: "engine",
    summary: "切换项目使用的 ComfyUI 版本（local 模式）",
    usage: "daoyan-cli engine use <版本 tag|路径>",
    implemented: true,
    run: (ctx, args) => runEngine(ctx, ["use", ...args]),
  },

  // ---- 运维 ----
  {
    name: "status",
    group: "ops",
    summary: "场记汇报：引擎/队列/任务锁/GPU/内存/镜头完成度",
    usage: "daoyan-cli status [--json]",
    implemented: true,
    run: (ctx) => runStatus(ctx),
  },
  {
    name: "logs",
    group: "ops",
    summary: "查看日志（docker logs 语义，-f 跟随；清洗 ANSI 与 tqdm 刷屏）",
    usage: "daoyan-cli logs [-f] [-n N] [--src daoyan-cli|engine|all]",
    implemented: true,
    run: (ctx, args) => runLogs(ctx, args),
  },
  {
    name: "list",
    group: "ops",
    summary: "打印分镜表",
    usage: "daoyan-cli list [--json]",
    run: planned("M1"),
  },
  {
    name: "doctor",
    group: "ops",
    summary: "环境自检（local：引擎/venv/模型/ffmpeg；remote：连通/节点/模型可见性）",
    usage: "daoyan-cli doctor [--json]",
    run: planned("M1"),
  },
  {
    name: "gpu status",
    group: "ops",
    summary: "GPU 与容器模型占用一览",
    usage: "daoyan-cli gpu status",
    run: planned("M1"),
  },
  {
    name: "gpu evict",
    group: "ops",
    summary: "手动弹出容器模型（通常由 shot 自动执行）",
    usage: "daoyan-cli gpu evict",
    run: planned("M1"),
  },
  {
    name: "gpu restore",
    group: "ops",
    summary: "恢复被弹出的容器模型",
    usage: "daoyan-cli gpu restore",
    run: planned("M1"),
  },

  // ---- 元 ----
  {
    name: "help",
    group: "meta",
    summary: "帮助与 agent 自描述：help [命令]；--json 输出命令树/信封/错误码",
    usage: "daoyan-cli help [命令] [--json]",
    implemented: true,
    run: (ctx, args) => runHelp(ctx, args, COMMANDS, VERSION),
  },
  {
    name: "update",
    group: "meta",
    summary: "自升级（检测 GitHub 最新 tag；--check 仅检测）",
    usage: "daoyan-cli update [--check]",
    implemented: true,
    run: (ctx, args) => runUpdate(ctx, args),
  },
];

/** 命令查找：优先子命令全名（"engine install"），再退回主命令。 */
export function findCommand(
  name: string,
  args: readonly string[],
): { meta: CommandMeta; rest: string[] } | null {
  if (args.length > 0) {
    const sub = COMMANDS.find((c) => c.name === `${name} ${args[0]}`);
    if (sub) return { meta: sub, rest: args.slice(1) };
  }
  const main = COMMANDS.find((c) => c.name === name);
  return main ? { meta: main, rest: [...args] } : null;
}
