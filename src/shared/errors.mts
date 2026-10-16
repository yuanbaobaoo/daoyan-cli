/** daoyan-cli 结构化错误码 —— 全部登记项见 docs/ERROR-CODES.md 与 `daoyan-cli help --json`。
 *  约定：code 一旦发布即冻结，只能新增不能改义（下游 agent 依赖它做分支决策）。 */
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

export type ErrCode = (typeof ERROR_CODES)[number];

export interface DaoyanCliErrorInit {
  code: ErrCode;
  message: string;
  details?: Record<string, unknown>;
  /** 进程退出码；usage=2，业务错误默认 1 */
  exit?: number;
}

export class DaoyanCliError extends Error {
  readonly code: ErrCode;
  readonly details?: Record<string, unknown>;
  readonly exit: number;

  constructor(init: DaoyanCliErrorInit) {
    super(init.message);
    this.name = "DaoyanCliError";
    this.code = init.code;
    this.details = init.details;
    this.exit = init.exit ?? 1;
  }
}

export function isDaoyanCliError(e: unknown): e is DaoyanCliError {
  return e instanceof DaoyanCliError;
}

/** 用法错误（exit 2）：参数缺失 / 未识别。 */
export function usage(message: string, details?: Record<string, unknown>): never {
  throw new DaoyanCliError({ code: "usage", message, exit: 2, details });
}
