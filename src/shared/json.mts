/** --json 信封输出：成功 {"ok":true,"schema_version":1,"data":…}；
 *  失败 {"ok":false,"schema_version":1,"error":{code,message,retryable,…}}。
 *  信封形状是公开契约，登记于 daoyan help --json 与 docs/PLAN.md。 */
import type { DaoyanCliError } from "./errors.mts";

/**
 * 信封 schema 版本；只在破坏性变更时递增。
 */
export const SCHEMA_VERSION = 1;

/**
 * 输出成功信封：{ok:true, schema_version, data}。
 */
export function emitData(data: unknown): void {
  process.stdout.write(JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data }) + "\n");
}

/**
 * 输出失败信封：错误字段完整包含 Agent 恢复所需信息。
 */
export function emitError(err: DaoyanCliError): void {
  // 信封内层的错误对象
  const error: Record<string, unknown> = {
    code: err.code,
    message: err.message,
    retryable: err.retryable,
  };
  if (err.retryAfterMs !== undefined) error.retry_after_ms = err.retryAfterMs;
  if (err.hint !== "") error.hint = err.hint;
  if (err.taskId !== undefined) error.task_id = err.taskId;
  if (err.runId !== undefined) error.run_id = err.runId;
  if (err.nextActions !== undefined) error.next_actions = err.nextActions;
  if (err.details !== undefined) error.details = err.details;
  process.stdout.write(
    JSON.stringify({ ok: false, schema_version: SCHEMA_VERSION, error }) + "\n",
  );
}
