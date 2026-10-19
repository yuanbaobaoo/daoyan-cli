/** GPU 内置接管目标 —— 写死在代码里，用户不需要配置白名单。
 *  模型服务优先（API/CLI 卸载/重载，保留进程）；
 *  裸机进程服务其次（SIGTERM/SIGKILL + best-effort 重启）；容器内进程服务从不停止。
 *  未知进程/容器永不处理。 */
import type { ProcessTargetRecord } from "./providers/process.mts";

/**
 * 模型服务适配器标识（内置）。
 */
export type ProviderId = "ollama" | "lmstudio" | "xinference" | "vllm";

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
 * 内置宿主机模型服务列表（默认端口自动探测，无需用户配置）。
 * vLLM 的 sleep 只在容器服务发现中启用，避免与裸机进程接管重叠。
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
 * 容器内可接管的目标标识。
 */
export type ContainerTargetId = ProviderId | "tgi" | "llama.cpp" | "sglang";

/**
 * 容器内目标匹配规则：镜像名 / 容器名 / 启动命令任一命中即可。
 * 只用于已经占用 GPU 的容器；未知容器永不处理。
 */
export interface ContainerTargetRule {
    /**
     * 目标标识。
     */
    id: ContainerTargetId;
    /**
     * 接管策略：模型服务（可 API/CLI 卸载）或进程服务（无通用卸载 API，只提示，不停止容器）。
     */
    kind: "provider" | "process";
    /**
     * 匹配正则（大小写不敏感）。
     */
    pattern: RegExp;
}

/**
 * 内置容器目标（Docker / Podman / containerd / CRI-O / k8s 共用）。
 */
export const GPU_CONTAINER_TARGETS: ContainerTargetRule[] = [
    { id: "ollama", kind: "provider", pattern: /\bollama\b/i },
    { id: "lmstudio", kind: "provider", pattern: /\blm[-_ ]?studio\b/i },
    { id: "xinference", kind: "provider", pattern: /\bxinference\b/i },
    { id: "vllm", kind: "provider", pattern: /\bvllm\b/i },
    { id: "tgi", kind: "process", pattern: /\btext-generation-(?:launcher|inference)\b/i },
    { id: "llama.cpp", kind: "process", pattern: /\bllama[-_.]?(?:server|cpp)\b/i },
    { id: "sglang", kind: "process", pattern: /\bsglang\b/i },
];

/**
 * 容器运行时类型（执行卸载命令的方式不同）。
 */
export type ContainerRuntimeKind = "docker" | "podman" | "crictl" | "ctr" | "nerdctl";

/**
 * 模型服务的访问通道。
 * - host：宿主机上的默认端口 / Docker 端口映射；
 * - netns：进入容器网络命名空间后用本机 Node 调 127.0.0.1（不需要 kubectl）；
 * - exec：在容器内执行服务自带的 CLI / Python（不需要 kubectl）。
 *
 * 只用于“卸载/重载模型”，不用于停止容器或进程。
 */
export type ProviderChannel =
    | {
          /**
           * 宿主机 HTTP。
           */
          kind: "host";
          /**
           * 基础 URL（不含尾部斜杠）。
           */
          base_url: string;
      }
    | {
          /**
           * 容器网络命名空间 HTTP（nsenter）。
           */
          kind: "netns";
          /**
           * 容器内进程的宿主 PID（用于 nsenter）。
           */
          pid: number;
          /**
           * 容器内 localhost 基础 URL。
           */
          base_url: string;
          /**
           * 容器 ID（恢复前校验 PID 未被复用）。
           */
          container_id?: string;
      }
    | {
          /**
           * 容器内执行。
           */
          kind: "exec";
          /**
           * 容器运行时。
           */
          runtime: ContainerRuntimeKind;
          /**
           * 容器 ID。
           */
          container_id: string;
          /**
           * 容器名（仅日志）。
           */
          container_name?: string;
          /**
           * crictl 运行时端点（如有）。
           */
          crictl_endpoint?: string;
          /**
           * ctr / nerdctl 命名空间（如有）。
           */
          ctr_namespace?: string;
          /**
           * ctr 的 containerd socket 地址（如有）。
           */
          ctr_address?: string;
      };

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
    "containerd-shim",
    "containerd-shim-runc-v2",
    "dockerd",
    "kubelet",
    "k3s",
    "runc",
    "crun",
    "conmon",
    "pause",
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
          /**
           * 访问通道（旧租约可能没有，按宿主机默认端口恢复）。
           */
          channel?: ProviderChannel;
          /**
           * 备用通道（主通道在任务期间失效时依次尝试，如容器 PID 退出/运行时变化）。
           */
          fallbacks?: ProviderChannel[];
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
