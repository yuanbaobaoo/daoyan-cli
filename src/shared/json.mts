/** --json 信封输出：成功 {"ok":true,"data":…}；失败 {"ok":false,"error":{code,message,details?}}。
 *  信封形状是公开契约，登记于 daoyan help --json 与 docs/PLAN.md。 */
import type { DaoyanCliError } from "./errors.mts";

/**
 * 输出成功信封：{ok:true, data}。
 */
export function emitData(data: unknown): void {
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
}

/**
 * 输出失败信封：{ok:false, error:{code,message,details?}}（details 仅在存在时携带）。
 */
export function emitError(err: DaoyanCliError): void {
  // 信封内层的错误对象
  const error: Record<string, unknown> = { code: err.code, message: err.message };
  if (err.details !== undefined) error.details = err.details;
  process.stdout.write(JSON.stringify({ ok: false, error }) + "\n");
}
