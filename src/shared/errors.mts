// daoyan-cli 结构化错误码 —— 全部登记项见 docs/ERROR-CODES.md 与 `daoyan help --json`。
// 约定：code 一旦发布即冻结，只能新增不能改义（下游 agent 依赖它做分支决策）。
export const ERROR_CODES = [
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
  "wrap_failed",
] as const satisfies readonly string[];

/**
 * 合法错误码的联合类型（由 ERROR_CODES 推导，二者永远同步）。
 */
export type ErrCode = (typeof ERROR_CODES)[number];

/**
 * DaoyanCliError 的构造参数。
 */
export interface DaoyanCliErrorInit {
  /**
   * 稳定的错误码（ErrCode 之一）。
   */
  code: ErrCode;
  /**
   * 人类可读的错误说明（面向用户与 agent）。
   */
  message: string;
  /**
   * 结构化补充信息（进入 --json 信封的 error.details）。
   */
  details?: Record<string, unknown>;
  /**
   * 进程退出码；usage=2，业务错误默认 1
   */
  exit?: number;
}

/**
 * 结构化错误：所有业务失败都以它抛出，由 cli 入口统一转成信封 / 退出码。
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
   * 创建错误实例（message 由 Error 基类承载）。
   */
  constructor(init: DaoyanCliErrorInit) {
    super(init.message);
    this.name = "DaoyanCliError";
    this.code = init.code;
    this.details = init.details;
    this.exit = init.exit ?? 1;
  }
}

/**
 * 类型守卫：判断未知异常是否为 DaoyanCliError。
 */
export function isDaoyanCliError(e: unknown): e is DaoyanCliError {
  return e instanceof DaoyanCliError;
}

/**
 * 用法错误（exit 2）：参数缺失 / 未识别。
 */
export function usage(message: string, details?: Record<string, unknown>): never {
  throw new DaoyanCliError({ code: "usage", message, exit: 2, details });
}
