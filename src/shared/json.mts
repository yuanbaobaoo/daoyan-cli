/** --json 信封输出：成功 {"ok":true,"data":…}；失败 {"ok":false,"error":{code,message,details?}}。
 *  信封形状是公开契约，登记于 daoyan-cli discover 与 docs/PLAN.md。 */
import type { DaoyanCliError } from "./errors.mts";

export function emitData(data: unknown): void {
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
}

export function emitError(err: DaoyanCliError): void {
  const error: Record<string, unknown> = { code: err.code, message: err.message };
  if (err.details !== undefined) error.details = err.details;
  process.stdout.write(JSON.stringify({ ok: false, error }) + "\n");
}
