/** init 编排契约 —— ComfyUI 是外部组件，init 只做脚本化编排（docs/PLAN.md §5）：
 *  1 检测宿主 python3(≥3.10) → 2 python3 -m venv engine/.venv → 3 GitHub API 列版本供选择
 *  → 4 git clone --branch <tag> --depth 1 → 5 venv pip 装依赖 + 按 CUDA 选 torch 轮子源(--mirror 可配)
 *  → 6 生成项目骨架(templates/) → 7 写 project.json → 8 提示 doctor 收尾。
 *  --use-existing <path>：跳过 1–5，仅对齐配置与骨架（接管既有安装）。执行器在 M3 落地。 */
import { DaoyanCliError } from "../../shared/errors.mts";

export interface ProvisionOptions {
  name: string;
  /** 缺省交互选择；CI/脚本可固定，如 "0.36.0" / "latest" / "nightly" */
  comfyVersion?: string;
  /** 接管既有安装的路径（既有项目迁移路径） */
  useExisting?: string;
  /** pip / git 镜像（应对受限网络） */
  mirror?: string;
}

export type ProvisionStep =
  | { id: "detect-python"; minVersion: string }
  | { id: "create-venv"; venvDir: string }
  | { id: "pick-version"; version: string }
  | { id: "clone-comfyui"; repoUrl: string; ref: string }
  | { id: "install-deps"; requirements: string; torchIndex?: string }
  | { id: "scaffold-project" }
  | { id: "write-config" }
  | { id: "doctor-hint" };

/** 纯数据：生成执行计划（无副作用），供 init 预览与测试。 */
export function planProvision(opts: ProvisionOptions): ProvisionStep[] {
  if (opts.useExisting) {
    return [{ id: "scaffold-project" }, { id: "write-config" }, { id: "doctor-hint" }];
  }
  const version = opts.comfyVersion ?? "latest";
  return [
    { id: "detect-python", minVersion: "3.10" },
    { id: "create-venv", venvDir: "engine/.venv" },
    { id: "pick-version", version },
    { id: "clone-comfyui", repoUrl: "https://github.com/comfyanonymous/ComfyUI.git", ref: version },
    {
      id: "install-deps",
      requirements: "engine/ComfyUI/requirements.txt",
      ...(opts.mirror !== undefined ? { torchIndex: opts.mirror } : {}),
    },
    { id: "scaffold-project" },
    { id: "write-config" },
    { id: "doctor-hint" },
  ];
}

/** 真实执行器（M3）：逐步 spawn，失败即停并给出下一步指引。 */
export async function runProvision(_opts: ProvisionOptions): Promise<never> {
  throw new DaoyanCliError({
    code: "not_implemented",
    message: "init 执行器在 M3 交付；计划生成见 planProvision()，流程文档见 docs/PLAN.md §5。",
  });
}
