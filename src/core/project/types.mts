/** 项目数据模型 —— shots.json 字段语义（v1 格式）；
 *  project.json 集中声明环境配置。完整文档见 docs/DATA-MODEL.md。 */

export const PROJECT_FILE = "project.json";
export const SHOTS_FILE = "shots.json";

/** first_frame 三形态：锚点 key / 接力 / 纯 T2V */
export type FirstFrame = string | { relay: string } | undefined;

export interface ShotSpec {
  id: string;
  slug: string;
  seed: number;
  prompt: string;
  first_frame?: FirstFrame;
  steps?: number;
  cfg?: number;
  length?: number;
}

export interface ShotsMeta {
  title?: string;
  width: number;
  height: number;
  length_per_shot?: number;
  /** 锚点 key -> 相对项目根的图片路径 */
  anchors: Record<string, string>;
  [k: string]: unknown;
}

export interface ShotsDefaults {
  length: number;
  steps: number;
  cfg: number;
  sampler_name: string;
  scheduler: string;
  shift_video: number;
  shift_audio: number;
  negative: string;
}

export interface ShotsFile {
  meta: ShotsMeta;
  defaults: ShotsDefaults;
  style_prefix: string;
  shots: ShotSpec[];
}

/** ComfyUI（外部组件）的接入模式（配置缺省时按 local 加载，由 config.mts 注入）：
 *  - local  = 本机托管：ComfyUI 仓库与 venv 在本机，up/down 管理其进程生命周期；
 *  - remote = 远端连接：引擎已在别处运行（另一台机器 / 容器 / 反代之后），只连接、不托管。
 *             （既定设计，细节随后续里程碑细化） */
export type EngineMode = "local" | "remote";

/** 两种模式共有的引擎连接信息。 */
export interface EngineConn {
  /** 完整 base URL（可含 https 与路径前缀，如反代后的 https://host/comfyui）；
   *  设置时优先于 host/port；remote 模式推荐使用。 */
  url?: string;
  /** 引擎 HTTP 地址（local 默认 127.0.0.1） */
  host: string;
  /** 引擎 HTTP 端口（默认 8188） */
  port: number;
}

/** local 模式引擎：daoyan-cli 托管进程（spawn + PID 文件 + 就绪探测）。 */
export interface LocalEngine extends EngineConn {
  mode: "local";
  /** ComfyUI 仓库路径 */
  comfyui_dir: string;
  /** Python 虚拟环境路径（init 产物或既有 env/） */
  venv_dir: string;
  /** init 选择的 ComfyUI 版本 tag */
  version?: string;
  /** clone 源；默认官方仓库，可指镜像 / 内网 fork */
  repo_url?: string;
  /** 透传 main.py 的额外参数（--listen 等） */
  launch_extra?: string[];
  /** 以 root 运行 CLI 时，引擎降权到该用户 */
  run_user?: string;
}

/** remote 模式引擎：进程由远端管理，本 CLI 只通过 HTTP/WS 连接。 */
export interface RemoteEngine extends EngineConn {
  mode: "remote";
}

export type EngineRef = LocalEngine | RemoteEngine;

export interface ModelsRef {
  /** 三件套文件名，位于 shared_models_dir 对应子目录（doctor 的校验口径） */
  unet: string;
  clip: string;
  vae: string;
  /** 共享模型库根（extra_model_paths.yaml 指向的目录） */
  shared_models_dir?: string;
}

export interface GpuOrchestration {
  /** 生成前弹出 / 任务后恢复的容器目标；空数组 = 不编排 */
  evict_targets: Array<"ollama" | "xinference">;
}

export interface ProjectConfig {
  name: string;
  /** project.json schema 版本 */
  version: number;
  /** 引擎内输出子目录前缀，形如 "<slug>/" */
  output_prefix: string;
  /** workflow.api.json 相对路径 */
  workflow: string;
  engine: EngineRef;
  models: ModelsRef;
  gpu: GpuOrchestration;
  /** doctor / validate 校验必须注册的工作流节点类名 */
  node_checks?: string[];
}
