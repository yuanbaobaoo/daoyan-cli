/** GPU 内置接管目标 —— 写死在代码里，用户不需要配置白名单。
 *  模型服务优先（API 卸载/重载，保留进程）；进程服务其次（SIGTERM/SIGKILL + best-effort 重启）。
 *  未知进程永不处理。 */
import type { ProcessTargetRecord } from "./providers/process.mts";

/**
 * 模型服务适配器标识（内置）。
 */
export type ProviderId = "ollama" | "lmstudio" | "xinference";

/**
 * 进程服务匹配规则（内置）。
 */
export interface ProcessTargetRule {
  /**
   * 目标标识。
   */
  id: string;
  /**
   * 匹配命令行的正则（大小写不敏感）。
   */
  pattern: RegExp;
}

/**
 * 内置模型服务列表（默认端口自动探测，无需用户配置）。
 */
export const GPU_PROVIDER_IDS: ProviderId[] = ["ollama", "lmstudio", "xinference"];

/**
 * 内置进程服务列表（vLLM / TGI / llama.cpp server / SGLang）。
 */
export const GPU_PROCESS_TARGETS: ProcessTargetRule[] = [
  { id: "vllm", pattern: /(^|\s|\/)(vllm|api_server)(\s|$)/i },
  { id: "tgi", pattern: /text-generation-launcher/i },
  { id: "llama.cpp", pattern: /(^|\s|\/)llama-server(\s|$)/i },
  { id: "sglang", pattern: /sglang(\.launch_server)?/i },
];

/**
 * 需要保护的进程名（无论如何不杀）。
 */
export const PROTECTED_COMMS = new Set([
  "systemd",
  "init",
  "launchd",
  "sshd",
  "Xorg",
  "Xwayland",
  "gnome-shell",
  "kwin_wayland",
  "kwin_x11",
  "plasmashell",
  "WindowServer",
  "dock",
  "Finder",
  "containerd",
  "dockerd",
  "kubelet",
]);

/**
 * GPU 租约里的目标条目（provider 或 process）。
 */
export type GpuLeaseEntry =
  | {
      /**
       * 模型服务。
       */
      kind: "provider";
      /**
       * 服务标识。
       */
      provider: ProviderId;
      /**
       * 被卸载的模型名。
       */
      models: string[];
    }
  | {
      /**
       * 进程服务。
       */
      kind: "process";
      /**
       * 进程快照（重启所需）。
       */
      process: ProcessTargetRecord;
    };
