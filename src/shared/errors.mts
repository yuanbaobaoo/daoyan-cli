/** 结构化错误码 —— 全部登记项见 docs/ERROR-CODES.md 与 `daoyan help --json`。
 *  约定：code 一旦发布即冻结，只能新增不能改义（下游 agent 依赖它做分支决策）。
 *  每个错误码带默认 retryable / hint / retry_after_ms，进入统一错误信封。 */

/**
 * 错误码登记表（顺序即文档展示顺序）。
 */
export const ERROR_CODES = [
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
  "wrap_failed",
] as const satisfies readonly string[];

/**
 * 合法错误码的联合类型（由 ERROR_CODES 推导，二者永远同步）。
 */
export type ErrCode = (typeof ERROR_CODES)[number];

/**
 * 错误码的默认机器语义。
 */
export interface ErrorMeta {
  /**
   * 是否可以通过重试解决（默认 false）。
   */
  retryable: boolean;
  /**
   * 建议的重试间隔（毫秒；仅 retryable 时有意义）。
   */
  retryAfterMs?: number;
  /**
   * 面向 Agent 的恢复建议。
   */
  hint: string;
  /**
   * 建议的后续动作（命令级，不含具体 id）。
   */
  nextActions?: string[];
}

/**
 * 错误码 -> 默认机器语义；命令层可覆盖 hint / next_actions。
 */
export const ERROR_META: Record<ErrCode, ErrorMeta> = {
  usage: { retryable: false, hint: "运行 daoyan help --json 查看正确用法。" },
  not_implemented: { retryable: false, hint: "该能力尚未交付；查看 docs/REFACTOR.md 的里程碑。" },
  project_not_found: {
    retryable: false,
    hint: "在项目目录内运行，或用 --project 指定项目根；新项目执行 daoyan init --mode=local|remote。",
    nextActions: ["init --mode=local", "init --mode=remote --url <url>"],
  },
  config_invalid: { retryable: false, hint: "修正 project.json / .dycli/machine.json 后重试。" },
  validation_failed: { retryable: false, hint: "按 details.issues 修正后重试。" },
  workflow_invalid: { retryable: false, hint: "用 workflow validate 定位问题；修正图或 bindings 后重试。" },
  skill_write_failed: { retryable: false, hint: "检查项目目录写权限；修复后重新运行 daoyan skill update。" },
  external_tool_missing: { retryable: false, hint: "安装缺失的外部工具（python3 / git / ffmpeg 等）后重试。" },
  update_failed: { retryable: true, hint: "检查网络与 npm 权限后重试。" },
  provision_failed: { retryable: true, hint: "检查网络、磁盘与 Python 环境；可用 --mirror 切换 pip 源。" },
  artifact_download_failed: {
    retryable: true,
    hint: "引擎产物仍在 scratch 中；检查 /view 可达性后重试，或手动取回。",
  },

  engine_not_ready: { retryable: true, retryAfterMs: 5_000, hint: "确认引擎可达后再执行任务。" },
  engine_start_failed: {
    retryable: false,
    hint: "查看 logs/engine-*.log 与 daoyan engine ls；修复引擎安装后重新执行任务。",
  },
  engine_stop_failed: { retryable: true, retryAfterMs: 10_000, hint: "残留进程会在下一次任务开始时回收。" },
  engine_unreachable: {
    retryable: true,
    retryAfterMs: 10_000,
    hint: "remote 模式不会启动远端引擎；确认 URL / 网络 / 服务状态后重试。",
  },
  engine_busy: {
    retryable: true,
    retryAfterMs: 10_000,
    hint: "远端队列已有任务；等队列空闲后重试，或改用专用实例。",
  },
  engine_crashed: { retryable: true, hint: "引擎进程异常退出；查看 logs/engine-*.log 后重试。" },
  engine_oom: {
    retryable: true,
    hint: "显存不足：降低分辨率 / 帧数 / 步数，开启 gpu.takeover，或换更大显存机器后重试。",
    nextActions: ["status --json", "workflow set <name> <node>.<input> <value>"],
  },
  cleanup_failed: { retryable: false, hint: "主错误优先；cleanup 详情见 details.cleanup。残留由下一次任务回收。" },

  machine_busy: {
    retryable: true,
    retryAfterMs: 5_000,
    hint: "同一设备同一时刻只允许一个 generation task；等待 owner 结束后重试，或先取消它。",
    nextActions: ["status --json", "status --task <task_id>", "run cancel <task_id>"],
  },
  machine_lock_corrupt: {
    retryable: false,
    hint: "machine.lock 损坏；确认没有任务在跑后手动删除 ~/.dycli/machine.lock。",
  },
  task_not_found: { retryable: false, hint: "检查 task_id；用 status --json 查看最近任务。" },
  run_not_found: { retryable: false, hint: "检查 run_id；用 status --json 查看最近运行。" },
  worker_start_failed: { retryable: true, hint: "检查项目目录写权限与 Node 可执行文件后重试。" },
  worker_crashed: {
    retryable: true,
    hint: "task 已标记 interrupted；下一次任务会自动回收残留引擎/锁/GPU 租约。",
  },

  run_failed: { retryable: false, hint: "查看 status --task 的 error 与 logs --task 后修正。" },
  run_timeout: { retryable: true, hint: "任务超时；提高 --timeout 或缩小任务后重试。" },
  shot_failed: { retryable: false, hint: "查看该镜的 run 记录与日志后修正。" },
  shot_timeout: { retryable: true, hint: "提高 --timeout 或缩小任务后重试。" },
  anchor_not_found: { retryable: false, hint: "检查 shots.json 的 meta.anchors 与文件是否存在。" },
  relay_upstream_missing: { retryable: false, hint: "先完成上游镜头的成功 run，再拍接力镜头。" },
  model_not_found: {
    retryable: false,
    hint: "workflow 的 loader 输入值与 /object_info 枚举不匹配；检查 modelpath / 文件名。",
  },
  node_missing: {
    retryable: false,
    hint: "引擎缺少 workflow 使用的节点类；安装对应 custom node 或改用已有节点。",
  },

  gpu_unsupported: {
    retryable: false,
    hint: "当前平台不支持 GPU 接管（需要 Linux + NVIDIA）；任务继续，不会驱逐任何进程。",
  },
  gpu_takeover_failed: {
    retryable: false,
    hint: "部分内置目标卸载/驱逐失败；任务继续，最终可能 OOM。详见 run.json 的 gpu.errors。",
  },
  gpu_restore_failed: {
    retryable: true,
    hint: "恢复被接管的模型/进程失败；租约保留，下一次 local 任务会重试。",
  },
  gpu_lease_corrupt: {
    retryable: false,
    hint: "GPU 租约损坏；确认没有任务在跑后手动处理 ~/.dycli/gpu/lease.json。",
  },

  wrap_failed: { retryable: false, hint: "检查是否有足够的成功 run 与 ffmpeg 安装。" },
};

/**
 * DaoyanCliError 的构造参数。
 */
export interface DaoyanCliErrorInit {
  /**
   * 稳定的错误码（ErrCode 之一）。
   */
  code: ErrCode;
  /**
   * 人类可读的错误说明（面向用户与 Agent）。
   */
  message: string;
  /**
   * 结构化补充信息（进入错误信封的 error.details）。
   */
  details?: Record<string, unknown>;
  /**
   * 进程退出码；usage=2，业务错误默认 1。
   */
  exit?: number;
  /**
   * 覆盖错误码默认的 retryable。
   */
  retryable?: boolean;
  /**
   * 覆盖建议重试间隔。
   */
  retryAfterMs?: number;
  /**
   * 覆盖默认 hint。
   */
  hint?: string;
  /**
   * 覆盖默认 next_actions。
   */
  nextActions?: string[];
  /**
   * 关联的 task id（若有）。
   */
  taskId?: string;
  /**
   * 关联的 run id（若有）。
   */
  runId?: string;
}

/**
 * 结构化错误：所有业务失败都以它抛出，由 CLI 入口统一转成信封 / 退出码。
 */
export class DaoyanCliError extends Error {
  /**
   * 稳定的错误码。
   */
  readonly code: ErrCode;
  /**
   * 结构化补充信息（可空）。
   */
  readonly details?: Record<string, unknown>;
  /**
   * 进程退出码。
   */
  readonly exit: number;
  /**
   * 是否可通过重试解决。
   */
  readonly retryable: boolean;
  /**
   * 建议重试间隔（毫秒）。
   */
  readonly retryAfterMs?: number;
  /**
   * Agent 恢复建议。
   */
  readonly hint: string;
  /**
   * 建议的后续动作。
   */
  readonly nextActions?: string[];
  /**
   * 关联 task id。
   */
  readonly taskId?: string;
  /**
   * 关联 run id。
   */
  readonly runId?: string;

  /**
   * 创建错误实例（message 由 Error 基类承载）。
   */
  constructor(init: DaoyanCliErrorInit) {
    super(init.message);
    this.name = "DaoyanCliError";
    this.code = init.code;
    this.details = init.details;
    this.exit = init.exit ?? 1;
    // 错误码默认语义 + 调用方覆盖
    const meta = ERROR_META[init.code];
    this.retryable = init.retryable ?? meta.retryable;
    this.retryAfterMs = init.retryAfterMs ?? meta.retryAfterMs;
    this.hint = init.hint ?? meta.hint;
    this.nextActions = init.nextActions ?? meta.nextActions;
    this.taskId = init.taskId;
    this.runId = init.runId;
  }
}

/**
 * 类型守卫：判断未知异常是否为 DaoyanCliError。
 */
export function isDaoyanCliError(e: unknown): e is DaoyanCliError {
  return e instanceof DaoyanCliError;
}

/**
 * 把任意异常归一成 DaoyanCliError（保留原始 message）。
 */
export function asCliError(e: unknown, fallback: ErrCode = "run_failed"): DaoyanCliError {
  if (isDaoyanCliError(e)) return e;
  return new DaoyanCliError({
    code: fallback,
    message: e instanceof Error ? e.message : String(e),
  });
}

/**
 * 用法错误（exit 2）：参数缺失 / 未识别。
 */
export function usage(message: string, details?: Record<string, unknown>): never {
  throw new DaoyanCliError({ code: "usage", message, exit: 2, details });
}
