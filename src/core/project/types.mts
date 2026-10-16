/** 项目数据模型 —— shots.json 字段语义（v1 格式）；
 *  project.json 集中声明环境配置。完整文档见 docs/DATA-MODEL.md。 */

// —— 项目布局常量：文件名 / 目录名（全仓唯一声明处，其余位置一律引用） ——
// 项目配置文件名（自 cwd 向上寻找的锚点）
export const PROJECT_FILE = "project.json";
// 分镜表文件名
export const SHOTS_FILE = "shots.json";
// 日志与运行产物目录（任务流日志 / 引擎日志 / 任务锁 / 引擎 PID 均在其下）
export const LOG_DIR = "logs";
// 任务流日志文件名（位于 LOG_DIR）
export const TOOL_LOG_FILE = "daoyan-cli.log";
// 引擎日志文件名（位于 LOG_DIR）
export const ENGINE_LOG_FILE = "engine.log";
// 引擎 PID 文件名（位于 LOG_DIR）
export const ENGINE_PID_FILE = "engine.pid";
// 任务锁文件名（位于 LOG_DIR）
export const TASK_LOCK_FILE = "task.lock";
// 每镜产物快照目录（manifest 落盘位置，断点归因依据）
export const MANIFESTS_DIR = "manifests";

/**
 * first_frame 三形态：锚点 key / 接力 / 纯 T2V
 */
export type FirstFrame = string | { relay: string } | undefined;

/**
 * 分镜表中的单个镜头。
 */
export interface ShotSpec {
  /**
   * 镜号（如 "01"；产物文件名与日志均以它标识）。
   */
  id: string;
  /**
   * 镜头短名（参与产物文件名，如 01_开篇）。
   */
  slug: string;
  /**
   * 随机种子（generate 时写入 workflow，保证可复现）。
   */
  seed: number;
  /**
   * 正向提示词（与 style_prefix 拼接后送入引擎）。
   */
  prompt: string;
  /**
   * 首帧来源（缺省 = 纯文生 T2V）。
   */
  first_frame?: FirstFrame;
  /**
   * 采样步数（缺省取 defaults.steps）。
   */
  steps?: number;
  /**
   * 引导强度（缺省取 defaults.cfg）。
   */
  cfg?: number;
  /**
   * 帧数（缺省取 defaults.length；应为 17k+5）。
   */
  length?: number;
}

/**
 * 分镜表元信息（尺寸 / 锚点等全片级参数）。
 */
export interface ShotsMeta {
  /**
   * 片名（可选，仅展示用）。
   */
  title?: string;
  /**
   * 生成宽度（必须为 32 的倍数）。
   */
  width: number;
  /**
   * 生成高度（必须为 32 的倍数）。
   */
  height: number;
  /**
   * 每镜默认帧数（可选，镜头可各自覆盖）。
   */
  length_per_shot?: number;
  /**
   * 锚点 key -> 相对项目根的图片路径
   */
  anchors: Record<string, string>;
  /**
   * 允许扩展字段（向后兼容的预留位）。
   */
  [k: string]: unknown;
}

/**
 * 全片默认参数（镜头未覆盖时生效）。
 */
export interface ShotsDefaults {
  /**
   * 默认帧数。
   */
  length: number;
  /**
   * 默认采样步数。
   */
  steps: number;
  /**
   * 默认引导强度。
   */
  cfg: number;
  /**
   * 采样器名称（写入 workflow 的 7_sample 节点）。
   */
  sampler_name: string;
  /**
   * 调度器名称（写入 workflow 的 7_sample 节点）。
   */
  scheduler: string;
  /**
   * 视频偏移量（写入 6_shift 节点）。
   */
  shift_video: number;
  /**
   * 音频偏移量（写入 6_shift 节点）。
   */
  shift_audio: number;
  /**
   * 默认负向提示词。
   */
  negative: string;
}

/**
 * 分镜表文件（shots.json）的完整结构。
 */
export interface ShotsFile {
  /**
   * 全片级元信息。
   */
  meta: ShotsMeta;
  /**
   * 全片默认生成参数。
   */
  defaults: ShotsDefaults;
  /**
   * 风格前缀（与每镜 prompt 拼接）。
   */
  style_prefix: string;
  /**
   * 镜头列表（顺序即合片顺序）。
   */
  shots: ShotSpec[];
}

/** ComfyUI（外部组件）的接入模式（配置缺省时按 local 加载，由 config.mts 注入）：
 *  - local  = 本机托管：ComfyUI 仓库与 venv 在本机，up/down 管理其进程生命周期；
 *  - remote = 远端连接：引擎已在别处运行（另一台机器 / 容器 / 反代之后），只连接、不托管。
 *             （既定设计，细节随后续里程碑细化） */
export type EngineMode = "local" | "remote";

/**
 * 两种模式共有的引擎连接信息。
 */
export interface EngineConn {
  /** 完整 base URL（可含 https 与路径前缀，如反代后的 https://host/comfyui）；
   *  设置时优先于 host/port；remote 模式推荐使用。 */
  url?: string;
  /**
   * 引擎 HTTP 地址（local 默认 127.0.0.1）
   */
  host: string;
  /**
   * 引擎 HTTP 端口（默认 8188）
   */
  port: number;
}

/**
 * local 模式引擎：daoyan-cli 托管进程（spawn + PID 文件 + 就绪探测）。
 */
export interface LocalEngine extends EngineConn {
  /**
   * 接入模式判别标签（固定 local）。
   */
  mode: "local";
  /**
   * ComfyUI 仓库路径
   */
  comfyui_dir: string;
  /**
   * Python 虚拟环境路径（init 产物或既有 env/）
   */
  venv_dir: string;
  /**
   * init 选择的 ComfyUI 版本 tag
   */
  version?: string;
  /**
   * clone 源；默认官方仓库，可指镜像 / 内网 fork
   */
  repo_url?: string;
  /**
   * 透传 main.py 的额外参数（--listen 等）
   */
  launch_extra?: string[];
  /**
   * 以 root 运行 CLI 时，引擎降权到该用户
   */
  run_user?: string;
}

/**
 * remote 模式引擎：进程由远端管理，本 CLI 只通过 HTTP/WS 连接。
 */
export interface RemoteEngine extends EngineConn {
  /**
   * 接入模式判别标签（固定 remote）。
   */
  mode: "remote";
}

/**
 * 引擎配置的联合类型（按 mode 判别 local / remote）。
 */
export type EngineRef = LocalEngine | RemoteEngine;

/**
 * 模型三件套与共享模型库引用。
 */
export interface ModelsRef {
  /**
   * 三件套文件名，位于 shared_models_dir 对应子目录（doctor 的校验口径）
   */
  unet: string;
  /**
   * 文本编码器文件名。
   */
  clip: string;
  /**
   * VAE 文件名。
   */
  vae: string;
  /**
   * 共享模型库根（extra_model_paths.yaml 指向的目录）
   */
  shared_models_dir?: string;
}

/**
 * GPU 编排配置（生成让路策略）。
 */
export interface GpuOrchestration {
  /**
   * 生成前弹出 / 任务后恢复的容器目标；空数组 = 不编排
   */
  evict_targets: Array<"ollama" | "xinference">;
}

/**
 * project.json 的完整结构（项目根配置，validate / pipeline 的输入）。
 */
export interface ProjectConfig {
  /**
   * 项目名（init 时确定，仅展示用）。
   */
  name: string;
  /**
   * project.json schema 版本
   */
  version: number;
  /**
   * 引擎内输出子目录前缀，形如 "<slug>/"
   */
  output_prefix: string;
  /**
   * workflow.api.json 相对路径
   */
  workflow: string;
  /**
   * 引擎接入配置（local / remote 二选一）。
   */
  engine: EngineRef;
  /**
   * 模型三件套引用。
   */
  models: ModelsRef;
  /**
   * GPU 编排配置。
   */
  gpu: GpuOrchestration;
  /**
   * doctor / validate 校验必须注册的工作流节点类名
   */
  node_checks?: string[];
}
