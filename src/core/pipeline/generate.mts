/** 生成管线契约 —— 首帧/接力规则：
 *  first_frame = "S1"        → 从 anchors/ 复制到引擎 input；
 *              = {"relay":"02"} → ffmpeg 抽上游尾帧到 relay_frames/（mtime 缓存）再入 input；
 *              = 缺省          → 纯 T2V。
 *  上游成片缺失 → relay_upstream_missing（validate 阶段即应拦截）。
 *  调度序列：提交 /prompt → 轮询 /history（15s）→ 产物落位 → manifest 落盘。
 *  实现在 M1（docs/PLAN.md §6.3–6.5）。 */
import { DaoyanCliError } from "../../shared/errors.mts";
import type { ProjectConfig, ShotSpec, ShotsFile } from "../project/types.mts";

export interface ResolvedFirstFrame {
  kind: "anchor" | "relay" | "t2v";
  /** 注入引擎 input 的文件名（kind=t2v 时缺省） */
  inputName?: string;
  /** 来源说明（锚点 key 或上游镜号） */
  source?: string;
}

export function resolveFirstFrame(
  _shot: ShotSpec,
  _shots: ShotsFile,
  _cfg: ProjectConfig,
): Promise<ResolvedFirstFrame> {
  return Promise.reject(
    new DaoyanCliError({ code: "not_implemented", message: "首帧解析在 M1 交付（docs/PLAN.md §6.3）。" }),
  );
}

export interface GenerateResult {
  shotId: string;
  /** 产物绝对路径 */
  output: string;
  seconds: number;
}

export function generateShot(
  _shot: ShotSpec,
  _shots: ShotsFile,
  _cfg: ProjectConfig,
): Promise<GenerateResult> {
  return Promise.reject(
    new DaoyanCliError({
      code: "not_implemented",
      message: "生成调度在 M1 交付（提交/轮询/落位/manifest，docs/PLAN.md §6）。",
    }),
  );
}
