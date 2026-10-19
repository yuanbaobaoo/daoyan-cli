# dycli 重构方案：Agent 驱动的节点编辑器 + 任务级引擎生命周期

> 状态：v0.1.0 已实施（M1–M3 完成；真实 ComfyUI/GPU 验收属于 M4）
> 适用版本：v0.1.0
> 本文是重构设计基线；`PLAN.md`、`COMMANDS.md`、`DATA-MODEL.md`、`ERROR-CODES.md`、`AGENT-SKILL.md` 已同步。
> **不兼容 v0.0.x 项目，不提供迁移。** 新项目直接按本文的结构初始化。

---

## 0. 摘要

dycli 是给 AI Agent 使用的**程序化 ComfyUI 节点编辑器兼执行运行时**：Agent 通过 dycli 查询节点、编辑图、校验并提交；dycli 负责引擎生命周期、产物与版本留档。它不实现图形 canvas，但**节点编辑是核心能力，不是可选功能**。

| 项 | 决定 |
|---|---|
| 两种模式 | `local`（dycli 托管项目专属 ComfyUI）、`remote`（外部 ComfyUI，只走 HTTP） |
| 模式选择 | **`init` 必须显式指定 `--mode=local|remote`，没有默认值** |
| 初始化位置 | **`init` 在当前目录工作，不携带项目名**；新项目用目录名，已有项目直接绑定本机 |
| 引擎启动时机 | 只在任务执行时启动；`init` / `validate` / `status` / `logs` 都不启动。唯一例外是 `workflow nodes --refresh` 的 metadata session（不加载模型，取完即停） |
| 引擎停止时机 | 任务结束（成功、失败、OOM、中断）立即 `/free` + 停止；remote 只 `/free`，不碰进程 |
| 模型加载 | 由 ComfyUI 在执行 prompt 时加载；dycli 不预加载，metadata session 也不加载模型 |
| 显存不足 | 直接 `engine_oom` 失败，不重试、不降级；立即释放模型并停止 local 引擎 |
| GPU 接管 | **`project.json` 里一个 `gpu.takeover` 布尔开关**；local 任务前自动接管内置目标，任务后恢复；remote 忽略 |
| 访问方式 | local / remote 都使用 HTTP：`/system_stats`、`/object_info`、`/upload/image`、`/prompt`、`/history`、`/queue`、`/view`、`/free`、`/interrupt` |
| 节点编辑 | dycli 提供节点目录、图操作、校验；Agent 通过 `workflow apply` 的 ops JSON 产出工作流，不依赖图形界面 |
| Agent Skill | `init` 生成项目内 `.agents/skills/daoyan/`，并默认写入 `AGENTS.md` 管理块；用户级安装后续再做 |
| 版本管理 | 工作流、shots、runs 元数据进 Git；二进制产物走 Git LFS 或外部存储 |
| 命令净变化 | **+`workflow` 命令族 + 异步 `run`（含 `run cancel`）+ `skill update`**；删除 `up/down`、`doctor`、`list`、`gpu *`；其余保留 |
| 执行模型 | **异步 task**：`run` 默认返回 `task_id`；`--wait` 才阻塞到 cleanup |
| 机器级单任务 | **同一设备同一时刻只允许一个 generation task 执行；local 和 remote 一样**；忙则 `machine_busy` |
| 幂等 | `run --request-id <id>`；重试返回已有 task，不重复提交 |
| 状态与事件 | `status --task/--run`；`tasks/<id>/events.jsonl`；`logs --json` |
| 机器契约 | `help --json` / `status --json` / 错误信封包含 schema、retryable、next_actions |
| 任务边界 | task 是执行单元，可含一个或多个 run；`shot/batch` 多 run，串行执行 |

核心原则：

1. **机器级单任务**：同一台设备上，generation task 全局串行；local 和 remote 都受同一把机器锁约束。
2. **引擎生命周期绑定 task**：local 引擎不是常驻服务，task 开始拉起，task 结束停止。
3. **local / remote 只有生命周期差异**：提交、轮询、上传、下载、释放全部共用同一套 HTTP 客户端。
4. **版本管理不另造系统**：Git 管理工作流和共享文件；dycli 每次执行生成不可变 `runs/<run_id>/` 快照。
5. **Agent 驱动**：节点编辑、异步 task、`--json` 契约、`status` 状态快照和错误 `next_actions` 都以 Agent 为首要消费者。
6. **接口少而稳**：命令族以 `workflow`（编辑）和 `run`（执行）为两个核心入口；版本管理不增加命令。

---

## 1. 术语表

| 术语 | 定义 |
|---|---|
| **local 模式** | dycli 在项目内拥有并管理一个专属 ComfyUI：`engine/` + venv + 固定版本 + custom nodes。任务开始拉起，任务结束停止。 |
| **remote 模式** | ComfyUI 由外部提供（另一台机器 / 容器 / 反代之后）。dycli 只通过 HTTP 访问，不部署、不启动、不停止、不杀进程。 |
| **任务（task）** | 一次可调度的执行单元，落在 `tasks/<task_id>/`；可包含一个或多个 run。`run` 是单 run task，`shot/batch` 是多 run task。 |
| **运行（run）** | 一次工作流执行记录，落在 `runs/<run_id>/`，不可变。 |
| **task worker** | 持有机器锁、执行 task、管理引擎/GPU 生命周期与 cleanup 的 detached 进程。 |
| **machine task lock** | `~/.dycli/machine.lock`，同一设备同一时刻只允许一个 generation task；local/remote 共用。 |
| **events.jsonl** | task 级结构化事件流，供 Agent 轮询/跟随，不需要解析引擎文本日志。 |
| **request id** | `run --request-id` 的幂等键；重试返回已有 task，避免重复提交。 |
| **工作流（workflow）** | ComfyUI API 格式 JSON，放在 `workflows/`，是唯一真源。 |
| **节点编辑（graph editing）** | dycli 以结构化方式增删节点、连接端口、设置参数、校验图；不提供图形 canvas。 |
| **节点目录（node catalog）** | 从 `/object_info` 获取的节点类定义，缓存在 `.dycli/node_catalog.json`，供 Agent 查询。 |
| **图操作（graph ops）** | 一批 JSON 编辑指令（`add_node` / `set_input` / `connect` / `disconnect` / `remove_node`），由 `workflow apply` 原子执行。 |
| **metadata session** | 仅为 `workflow nodes --refresh` 启动的短生命周期 local 引擎：不加载模型、取完 `/object_info` 立即停止。 |
| **Agent Skill** | 由 `init` 生成的 `.agents/skills/daoyan/`，包含 SKILL.md 与 reference；供项目内 AI Agent 读取。 |
| **AGENTS.md 管理块** | `AGENTS.md` 中由 dycli 维护的标记区块，提示 Agent 读取项目内 Skill；不覆盖用户内容。 |
| **GPU 接管（GPU takeover）** | `project.json` 的 `gpu.takeover=true` 时，local 任务开始前自动回收内置目标占用的显存，任务结束恢复。 |
| **GPU 租约（GPU lease）** | 记录被卸载/驱逐对象与恢复信息；任务异常退出后，下次任务据此恢复。 |
| **provider** | ollama / LM Studio / xinference 等已知服务适配器，优先用其 API 卸载与重载模型。 |
| **内置目标（built-in targets）** | 写死在 dycli 代码里的可接管程序列表；用户不配置白名单。 |
| **bindings** | 可选文件 `workflows/<name>.bindings.json`，把 `prompt` / `seed` / `first_frame` 等逻辑输入映射到 `nodeId.input`，供 `shot` recipe 使用。 |
| **预检（preflight）** | 任务启动后、提交前，通过 `/object_info` 检查节点类、模型文件、队列状态。 |
| **释放（free）** | 调用 `POST /free {unload_models:true, free_memory:true}` 卸载 ComfyUI 缓存模型。 |
| **cleanup** | 任务结束的收尾：interrupt（如需）→ free → 成功时下载产物 → 停止 local 引擎 → 恢复 GPU 接管 → 清理临时目录。 |
| **scratch 目录** | 引擎自己的 input/output/temp 临时目录；产物下载到 `runs/` 后清理。 |
| **残留引擎（stale engine）** | PID 文件存在但当前没有活动任务锁的 local 引擎。下一次任务开始时回收。 |
| **机器配置（machine profile）** | `.dycli/machine.json`，gitignored，保存本机的 modelpath、端口、启动参数、远程 URL、覆盖项。 |
| **共享层** | 进 Git 的文件：`project.json`、`workflows/`、`inputs/`、`runs/`、`final/`、`.gitattributes`。 |
| **本机层** | 不进 Git：`.dycli/`、`engine/`、`logs/`、生成的 `extra_model_paths.yaml`。 |
| **版本管理** | Git 管理工作流和共享文件；dycli 每次执行生成不可变 `runs/<id>/` 快照。不造 revision/tag 系统。 |

> 早期讨论里的 “managed / external” 不再作为正式术语，代码与文档统一用 **local / remote**。

---

## 2. local / remote 模式矩阵

| 维度 | local | remote |
|---|---|---|
| 配置 | `engine.mode="local"`，`modelpath`、`port`、`launch_extra` | `engine.mode="remote"`，`url`、`free_after_task` |
| 执行模型 | 异步 task worker；`run` 默认返回 task_id | 同左 |
| 机器级串行 | **`~/.dycli/machine.lock` 全局唯一；忙则 `machine_busy`** | **同一把锁；remote 也不会并发执行** |
| 初始化 | `init --mode=local [--modelpath <路径>]` | `init --mode=remote --url <url>` |
| ComfyUI 来源 | 项目 `engine/`，固定版本 | 用户已有服务 |
| 部署 | `init` 建 venv、clone、装 torch、装 custom nodes | 不部署 |
| 启动 | 任务开始 spawn | 不启动 |
| 停止 | 任务结束 SIGTERM → SIGKILL | 不停止 |
| 空闲状态 | 没有 ComfyUI 进程 | 由外部决定 |
| GPU 接管 | `project.json` 的 `gpu.takeover=true` 时生效；内置目标自动识别 | 忽略，只 `/free` |
| HTTP | localhost | 用户 URL，支持 https / 反代前缀 |
| 节点目录 / 编辑 | 编辑离线；目录默认读缓存，`--refresh` 启动 metadata session | 编辑离线；目录可直接 `GET /object_info` |
| 输入 | `/upload/image` | `/upload/image` |
| 产物 | `/view` 下载 | `/view` 下载 |
| 模型加载 | 执行 prompt 时由 ComfyUI 加载 | 同左 |
| 成功收尾 | `/free` → 下载产物 → 停止进程 | `/free`（队列空闲策略）→ 下载产物 |
| OOM | `/interrupt`（如仍在执行）→ `/free` → 停止 → `engine_oom` | `/interrupt` → `/free`（按策略）→ `engine_oom` |
| 空闲时 status | “未运行 / 任务中 / 残留” | 探测 up/down/queue |
| logs | `logs/engine-<run>.log` 可用 | 没有本地引擎日志 |
| engine 命令 | `ls/install/use` 可用 | 不适用 |
| 失败模式 | 启动失败、停止失败、清理失败 | 不可达、队列忙、释放跳过 |
| 配置位置 | `.dycli/machine.json` | `.dycli/machine.json` |

**共同点：** 访问方法完全一致；只有进程生命周期不同。

---

## 3. 目标与非目标

### 3.1 目标

1. local 模式开箱即用：用户只提供 Python + 模型目录，`init --mode=local` 部署项目专属 ComfyUI。
2. remote 模式完整可用：`init --mode=remote --url` 绑定外部服务，任务执行、产物下载、模型释放全部走 HTTP。
3. 任务级生命周期：启动 → 预检 → 执行 → 释放 → 停止，异常路径也保证清理。
4. local 可选 GPU 接管：`project.json` 的 `gpu.takeover=true` 时，任务前自动接管内置目标，任务结束恢复，避免显存被其他服务长期占用。
5. 工作流与产物可版本化：工作流是 Git 文件；每次执行有不可变快照；产物按 run 保存，不覆盖。
6. 跨机器同步：同一仓库在不同架构/配置的机器上继续工作，机器差异留在 `machine.json`。
7. Agent 驱动的节点编辑：Agent 可以查询节点目录、增删节点、连接端口、设置参数并校验，不依赖 ComfyUI 图形界面。
8. 项目内 Agent Skill：`init` 生成完整的 `.agents/skills/daoyan/` 与 `AGENTS.md` 管理块，Agent 克隆项目后即可按 Skill 操作。
9. 异步 task + 机器级单任务：`run` 默认返回 task_id；同一设备 local/remote 同一时刻只执行一个 generation task；`--request-id` 保证重试幂等。
10. 机器契约：`help --json`、`status --json`、错误信封包含 schema、`retryable`、`next_actions`，Agent 不需要解析人类文本。
11. Agent 接口少而稳：`--json` 信封、稳定错误码、`workflow`（编辑）+ `run`（执行）两个核心入口。

### 3.2 非目标

- 不做图形化 canvas UI（不重写 ComfyUI 前端）；dycli 提供的是 Agent 驱动的结构化节点图编辑能力，这是核心能力。
- 不做工作流 revision/tag 数据库，Git 就是版本系统。
- **不做任务队列/并行执行**：同一设备同一时刻只允许一个 generation task；第二个任务直接 `machine_busy`，由 Agent 重试或等待。
- 默认不驱逐任何 GPU 占用；只有显式开启 `gpu.takeover` 才接管。
- remote 模式不管理远端 GPU 进程，只调用远端 ComfyUI 的 `/free`。
- 不驱逐内置目标之外的进程；未知进程不动，显存不足则任务失败。
- 不保证被驱逐的任意进程能 100% 恢复运行状态；已知服务用 API 卸载/重载，generic 进程只做 best-effort 重启。
- 不在任务执行时自动安装 custom nodes；安装属于 `init` / 环境准备。
- 不保证跨 GPU/架构 bit-exact 复现；只保证输入、参数、工作流、环境可追溯。
- 本轮不做用户级 Skill 安装（`~/.claude/skills`、`~/.zcode/skills` 等），只生成项目内 `.agents`。
- 不兼容旧项目，不提供旧数据迁移。

---

## 4. 目录与配置

### 4.1 仓库布局

```
repo/
├── project.json              # 共享：ComfyUI 版本、custom nodes、默认 workflow
├── workflows/
│   ├── t2v.json              # 共享：ComfyUI API JSON
│   └── t2v.bindings.json     # 可选：逻辑输入 -> 节点输入
├── shots.json                # 共享：视频 recipe
├── inputs/                   # 共享：原始素材（LFS）
├── tasks/<task_id>/          # 共享：一次可调度执行
│   ├── task.json             #   状态/request_id/run_ids/worker/cleanup
│   └── events.jsonl          #   结构化事件流
├── runs/<run_id>/            # 共享：每次执行的结果记录
│   ├── run.json
│   ├── workflow.json
│   ├── inputs.json
│   ├── inputs/
│   └── outputs/
├── final/                    # 共享：cut 结果 + manifest（LFS）
├── .agents/
│   └── skills/daoyan/        # 共享：项目内 Agent Skill（提交）
│       ├── SKILL.md
│       ├── VERSION
│       └── reference/
├── AGENTS.md                 # 共享：带 dycli 管理块
├── .gitattributes
├── .gitignore
├── .dycli/
│   └── machine.json          # 本机：不提交
├── engine/                   # 本机：ComfyUI + venv（忽略）
└── logs/                     # 本机（忽略）
```

### 4.2 project.json（共享，不含绝对路径）

```json
{
  "name": "demo",
  "version": 2,
  "default_workflow": "workflows/t2v.json",
  "gpu": {
    "takeover": false
  },
  "comfyui": {
    "version": "v0.3.40",
    "custom_nodes": [
      {
        "name": "ComfyUI-VideoHelperSuite",
        "repo": "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git",
        "ref": "v1.7.4"
      }
    ]
  }
}
```

`gpu.takeover`：

- 项目级布尔开关，默认 `false`；
- `true` 时，local 任务开始前自动回收内置目标占用的显存，任务结束恢复；
- remote 模式忽略；
- **不需要配置 provider、阈值、进程白名单**；内置目标列表由 dycli 代码维护，用户无感；
- `init` 生成项目骨架时写入 `false`，需要时由用户 / Agent 改为 `true`。

不再包含：

- `models.unet / clip / vae`（模型文件名以 workflow 的 loader 输入为准）
- `output_prefix`（产物命名由 run 目录与 workflow 决定）
- `gpu.evict_targets`（改为项目级 `gpu.takeover` 布尔开关）
- `node_checks`（由 `comfyui.custom_nodes` + 预检替代）

### 4.3 .dycli/machine.json（本机，gitignored）

local：

```json
{
  "machine_id": "mac-studio",
  "engine": {
    "mode": "local",
    "modelpath": "/data/models",
    "models_config": null,
    "port": 8188,
    "launch_extra": ["--lowvram"]
  },
  "overrides": {
    "workflows/t2v.json": {
      "5.width": 512,
      "5.height": 768,
      "7.steps": 20,
      "1.unet_name": "minimax_h3_fp8.safetensors"
    }
  }
}
```

remote：

```json
{
  "machine_id": "mac-studio",
  "engine": {
    "mode": "remote",
    "url": "http://gpu-box:8188",
    "free_after_task": "when_idle"
  }
}
```

字段说明：

| 字段 | 适用 | 说明 |
|---|---|---|
| `machine_id` | 两者 | 本机标签，默认 hostname；写入 task/run 记录，用于区分其他机器同步过来的运行 |
| `engine.mode` | 两者 | `local` / `remote` |
| `engine.modelpath` | local | 外部模型根目录；生成 `extra_model_paths.yaml`；省略时使用 `engine/ComfyUI/models` |
| `engine.models_config` | local | 可选，自定义 `extra_model_paths.yaml` 路径；设置后忽略自动生成 |
| `engine.port` | local | 项目专属端口；`init` 分配空闲端口 |
| `engine.launch_extra` | local | 透传 ComfyUI 参数，如 `--lowvram`、`--reserve-vram` |
| `engine.url` | remote | 外部 ComfyUI base URL |
| `engine.free_after_task` | remote | `always` / `when_idle` / `never`，默认 `when_idle` |
| `overrides` | local/remote | 本机节点输入覆盖，按 workflow 文件路径索引 |

`free_after_task`：

- `always`：任务结束就 `/free`，适合专用远程服务器；
- `when_idle`：队列没有其他任务时才 `/free`，适合共享服务器；
- `never`：不主动释放，由外部管理。

local 模式固定成功/失败后都 free + stop，不提供关闭选项。

`machine.json` 不包含 GPU 接管配置；GPU 接管是项目级策略，放在 `project.json` 的 `gpu.takeover`。

### 4.4 workflows 与 bindings

`workflows/t2v.json` 是原样的 ComfyUI API JSON，不需要重命名节点。

`workflows/t2v.bindings.json` 可选，供 `shot` recipe 使用：

```json
{
  "prompt": "5.prompt",
  "negative": "4.text",
  "seed": "7.seed",
  "steps": "7.steps",
  "first_frame": "0.image",
  "width": "5.width",
  "height": "5.height"
}
```

规则：

- `run` 不需要 bindings，直接执行完整 API JSON，可用 `--set nodeId.input=value` 覆盖；
- 有 bindings 时，`run` / `shot` 也可以用逻辑名，如 `--set seed=1101`；
- `shot` 通过 bindings 填充，不再硬编码任何节点键；
- 删除当前代码里的 `REQUIRED_WF_KEYS`。

### 4.5 工作流图编辑（Agent 驱动的节点编辑器）

dycli 不实现图形化 canvas，但必须提供**程序化节点编辑能力**。Agent 的工作方式：

1. 查询节点目录，知道有哪些节点、输入输出是什么；
2. 通过 graph ops 增删节点、连接端口、设置参数；
3. 校验图；
4. 交给 `run` 执行。

#### 图模型

工作流文件就是 ComfyUI API JSON，不做包装：

```json
{
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": { "ckpt_name": "sdxl.safetensors" }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "a cat",
      "clip": ["4", 1]
    }
  }
}
```

规则：

- 顶层 key 是节点 ID（字符串）；
- 每个节点是 `{ class_type, inputs }`；
- 连线是 `[sourceNodeId, outputIndex]`；
- 节点 ID 一旦创建保持稳定，不做自动重排；
- `add_node` 不指定 ID 时由 dycli 分配，并在结果里返回；
- 文件与 ComfyUI API 导出格式完全兼容，可以直接 `workflow import`。

#### 节点目录

数据源是引擎的 `/object_info`。dycli 提供：

```bash
daoyan workflow nodes [--filter <文本>] [--json]
daoyan workflow node <class_type> [--json]
```

- `workflow nodes` 默认读 `.dycli/node_catalog.json` 缓存，返回紧凑的节点类名列表；支持 `--limit` / `--cursor` / `--fields`；
- 缓存缺失时：remote 直接 `GET /object_info` 并写缓存；local 提示使用 `--refresh`，不自动启动引擎；
- `workflow node` 返回单节点的输入（required/optional、类型、默认值、枚举值）和输出；
- `--refresh` 重新拉取：
  - remote：直接 `GET /object_info`；
  - local：启动一个 **metadata session**（不加载模型，取完立即停止，见 §5.6）；
- 任务预检会刷新缓存，因此跑过一次任务后，后续离线编辑可以直接用缓存；
- 缓存记录引擎指纹（ComfyUI 版本 + custom nodes + object_info 哈希），指纹变化时提示刷新。

节点目录是**机器相关**的：不同机器装了不同 custom nodes，目录不同。workflow 文件本身仍可跨机器共享，任务预检负责发现缺失节点。

#### 图操作

Agent 的主要编辑接口是一条命令 + 一批 JSON 操作：

```bash
daoyan workflow apply <name> --ops <ops.json|-> [--json]
```

ops 示例：

```json
{
  "ops": [
    { "op": "add_node", "id": "4", "class_type": "CheckpointLoaderSimple" },
    { "op": "set_input", "node": "4", "input": "ckpt_name", "value": "sdxl.safetensors" },
    { "op": "add_node", "id": "6", "class_type": "CLIPTextEncode" },
    { "op": "connect", "from": { "node": "4", "output": 1 }, "to": { "node": "6", "input": "clip" } },
    { "op": "set_input", "node": "6", "input": "text", "value": "a cat" }
  ]
}
```

支持的 op：

| op | 参数 | 语义 |
|---|---|---|
| `add_node` | `id?`, `class_type` | 新增节点；无 id 时自动分配 |
| `set_input` | `node`, `input`, `value` | 设置字面量输入；有目录时校验枚举/类型 |
| `connect` | `from{node,output}`, `to{node,input}` | 建立连线；目标已有连线时替换并返回 warning |
| `disconnect` | `node`, `input` | 删除某输入的连线 |
| `remove_node` | `node`, `force?` | 删除节点；被引用时默认拒绝，`force` 删除关联连线 |
| `replace_graph` | `graph` | 整图替换（导入/重置用） |

执行语义：

- **先全量校验，再原子写盘**：任何一条 op 失败，整个文件不变；
- `add_node` 自动分配 ID 时，返回结果里包含新 ID；
- `connect` 校验源节点、输出索引、目标输入存在；类型不匹配给 warning，不阻塞（ComfyUI 最终裁决）；
- `set_input` 在节点目录可用时校验枚举值和值类型；必填输入的完整性由 `workflow validate` 检查，避免阻断分步编辑；
- `remove_node` 被其他节点引用时默认失败，避免产生断链；
- 结果返回 `applied`、`warnings`、`assigned_ids`、`graph_sha256`、`changed_nodes`、`removed_links`，方便 Agent 继续操作。

快速单点修改用：

```bash
daoyan workflow set <name> <nodeId>.<input> <value> [--json]
```

例如：

```bash
daoyan workflow set t2v 6.text "a dog"
daoyan workflow set t2v 7.seed 42
```

#### 创建、导入、查看

```bash
daoyan workflow new <name>                  # 创建空图
daoyan workflow import <api.json> --name <name>
daoyan workflow list [--json]
daoyan workflow show <name> [--full] [--json]        # 摘要；--full 输出完整图
daoyan workflow validate <name> [--json]
```

- `workflow new` 只创建 `workflows/<name>.json` 空对象 `{}`；
- `workflow import` 接受 ComfyUI API 导出，不做节点重命名；
- `workflow show` 默认输出节点数、连线数、节点类摘要；`--full` 输出完整 JSON；
- `workflow validate` 离线校验：JSON 结构、节点 ID、连线目标、必填输入、bindings、machine overrides；有节点目录缓存时同时校验节点类和枚举值。输出 `issues[]`：`{path, code, severity, message, hint}`；在线权威校验在任务预检执行。

#### Agent 编辑闭环

```bash
# 1. 找节点
daoyan workflow nodes --filter KSampler --json
daoyan workflow node KSampler --json

# 2. 创建 / 导入
daoyan workflow new t2v
# 或 daoyan workflow import ./from-comfyui.json --name t2v

# 3. 批量编辑
daoyan workflow apply t2v --ops ./ops.json --json

# 4. 校验
daoyan workflow validate t2v --json

# 5. 执行
daoyan run t2v --set seed=42 --label shot:01 --json
```

#### 版本与并发

- 每次 `apply` / `set` 都是原子写盘，不产生半成品文件；
- 不提供 `workflow save`：文件写盘即保存，Git 负责版本历史；
- 每次 `run` 会把实际提交的图快照到 `runs/<id>/workflow.json`，编辑不影响正在执行的任务；
- 跨机器编辑冲突由 Git 处理；后续可增加 `--expect-sha` 做乐观并发控制。

### 4.6 task 与 run 记录

`tasks/<task_id>/task.json`：

```json
{
  "task_id": "t_20261019T153012-mac-7f3a",
  "kind": "run",
  "machine_id": "mac-studio",
  "request_id": "agent-7f3a-001",
  "status": "queued|running|succeeded|failed|cancelled|interrupted",
  "mode": "local",
  "runs": ["r_..."],
  "worker": { "pid": 12345, "started_at": "..." },
  "created_at": "...",
  "started_at": "...",
  "finished_at": "...",
  "error": null,
  "next_actions": ["status --task <id> --wait"]
}
```

`tasks/<task_id>/events.jsonl` 每行一个事件：

```json
{"seq":1,"ts":"...","type":"queued","data":{}}
{"seq":2,"ts":"...","type":"machine_lock_acquired","data":{"pid":12345}}
{"seq":3,"ts":"...","type":"engine_started","data":{"pid":12346}}
{"seq":4,"ts":"...","type":"submitted","data":{"prompt_id":"..."}}
{"seq":5,"ts":"...","type":"cleanup_finished","data":{"free":"ok","stop":"ok"}}
```

`runs/<run_id>/run.json`：

```json
{
  "run_id": "20261019T153012-mac-7f3a",
  "task_id": "t_20261019T153012-mac-7f3a",
  "machine_id": "mac-studio",
  "request_id": "agent-7f3a-001",
  "label": "shot:01",
  "workflow": {
    "path": "workflows/t2v.json",
    "sha256": "..."
  },
  "inputs": {
    "prompt": "...",
    "seed": 1101
  },
  "overrides": {
    "7.steps": 20
  },
  "engine": {
    "mode": "local",
    "comfyui_version": "0.3.40",
    "port": 8188,
    "pid": 12345,
    "ready_ms": 8123,
    "cleanup": {
      "interrupt": "not_needed",
      "free": "ok",
      "stop": "ok"
    }
  },
  "gpu": {
    "takeover": true,
    "before": { "used_mb": 12000, "free_mb": 12000 },
    "evicted": [
      { "kind": "provider", "provider": "ollama", "models": ["llama3"] }
    ],
    "after": { "free_mb": 23000 },
    "restored": ["ollama:llama3"],
    "errors": []
  },
  "status": "succeeded",
  "prompt_id": "...",
  "started_at": "...",
  "finished_at": "...",
  "outputs": [
    {
      "name": "01.mp4",
      "path": "outputs/01.mp4",
      "sha256": "...",
      "bytes": 123
    }
  ],
  "error": null
}
```

约束：

- 不写绝对路径；
- 不提交临时文件；
- 产物下载成功后再删除引擎 scratch；
- 失败 run 同样落盘，保留错误和 cleanup 结果；
- `gpu` 段仅在 local 且发生接管的 run 中出现；remote 不写。

### 4.7 Git 约定

`.gitignore`：

```
engine/
logs/
.dycli/
relay_frames/
concat_list.txt
*.log
.DS_Store
```

机器任务锁在 `~/.dycli/machine.lock`；GPU 租约在 `~/.dycli/gpu/lease.json`。两者都不进仓库。

`.gitattributes`：

```
runs/**/outputs/** filter=lfs diff=lfs merge=lfs -text
runs/**/inputs/**  filter=lfs diff=lfs merge=lfs -text
inputs/**          filter=lfs diff=lfs merge=lfs -text
final/**           filter=lfs diff=lfs merge=lfs -text
```

dycli 不执行 `git commit`；只写确定性 JSON，提交由用户 / Agent 决定。

### 4.8 Agent Skill（项目内）

`init` 默认生成项目内 Agent Skill；**本轮不做用户级安装**（`~/.claude/skills`、`~/.zcode/skills` 等后续再加）。

#### 目录

```
.agents/skills/daoyan/
├── SKILL.md                 # 短：定位、铁律、闭环、索引
├── VERSION                  # 生成版本与文档哈希
└── reference/
    ├── commands.md          # 所有命令 / 参数 / flag / JSON / 示例
    ├── config.md            # project.json / machine.json / runs
    ├── workflow.md          # 图模型 / graph ops / bindings / node catalog
    ├── lifecycle.md         # local / remote / GPU 接管 / cleanup
    ├── errors.md            # 错误码、恢复矩阵、退出码
    ├── protocol.md          # Agent 异步协议：start/poll/wait/cancel/retry
    └── recipes.md           # shot / batch / wrap / 端到端示例
```

- 全部进 Git，跨机器 clone 后 Agent 直接可见；
- `init` 默认生成；`--no-skill` 可跳过；
- `AGENTS.md` 同步写入管理块；
- 生成文件带版本与哈希头，提示 Agent 以 `daoyan help --json` 为最终权威。

#### AGENTS.md 管理块

`init` / `skill update` 只维护带标记的区块，不覆盖用户内容：

```md
<!-- daoyan:skill:start -->
This project uses dycli/daoyan for ComfyUI workflows.
Before creating or running workflows, read `.agents/skills/daoyan/SKILL.md`.
Use `daoyan` commands with `--json`; do not edit `engine/`, `logs/`, or `.dycli/`.
Only one generation task runs per machine; if you get `machine_busy`, inspect the owner and retry later.
<!-- daoyan:skill:end -->
```

规则：

- `AGENTS.md` 不存在则创建；
- 已存在则替换已有标记块；没有标记时追加块；保留其余段落；
- 重复执行是幂等的，不产生重复块；
- `--no-skill` 时既不生成 `.agents`，也不写管理块。

#### SKILL.md 内容大纲

1. **frontmatter**：`name: daoyan` + 触发描述（ComfyUI workflow、图片/视频生成、分镜、dycli）。
2. **定位**：Agent 驱动的节点编辑器 + local/remote 执行运行时。
3. **铁律**：
   - 不直接调 ComfyUI HTTP，不手工启动/停止引擎；
   - 不编辑 `engine/`、`logs/`、`.dycli/`；
   - 机器决策一律 `--json`；
   - 不确定命令时先 `daoyan help --json`。
4. **快速开始**：`init --mode=local|remote`、`workflow new/import`。
5. **核心闭环**：`workflow nodes → apply → validate → run → status --task --wait → artifacts`；默认异步，不要假设 `run` 会阻塞。
6. **节点编辑**：graph ops、bindings、machine overrides。
7. **生命周期**：local 按需启动/停止、remote 只 HTTP、GPU 接管自动；同一设备同一时刻只允许一个 generation task。
8. **版本与 Git**：workflow/runs 进 Git，二进制走 LFS。
9. **错误恢复矩阵**：`engine_oom`、`machine_busy`、`model_not_found`、`node_missing`、`workflow_invalid` 等。
10. **参考索引**：指向 `reference/*.md`，其中 `protocol.md` 是 Agent 的异步操作协议。

#### 生成机制

- 扩展 `CommandMeta`：`args`、`flags`、`examples`、`jsonShape`；
- `help --json` 与 Skill 生成器共用同一份 registry，避免手写漂移；
- `init` 从当前安装版本生成；`daoyan skill update` 重新生成；
- `status --json` 增加 `skill` 段：`present`、`version`、`stale`；人类模式对 stale 给 warning；
- CI 快照测试生成结果；生成文件头记录 `generated_by` 与文档哈希；
- Skill 明确要求 Agent 在执行前运行 `daoyan help --json`，防止项目内 Skill 稍旧导致误用。

#### 本轮不做

- 用户级 Skill 安装；
- npm postinstall / install.sh 自动修改 Agent 目录；
- `~/.claude`、`~/.zcode`、`~/.agents` 等用户目录写入。
- 后续如需扩展，新增 target adapter 即可，不影响项目内 Skill。

### 4.9 机器契约（Agent 优先）

JSON 是主契约；人类可读文本只是渲染层。

- 非 TTY 默认输出 JSON；TTY 默认人类文本；`--json` / `DYCLI_OUTPUT=json` 始终可强制；
- 成功信封：
  ```json
  { "ok": true, "schema_version": 1, "data": {} }
  ```
- 失败信封：
  ```json
  {
    "ok": false,
    "schema_version": 1,
    "error": {
      "code": "machine_busy",
      "message": "...",
      "retryable": true,
      "retry_after_ms": 5000,
      "hint": "...",
      "task_id": "...",
      "run_id": null,
      "next_actions": ["status --task <id>", "run cancel <id>"],
      "details": {}
    }
  }
  ```
- `help --json` 必须提供：
  - `schema_version`、`capabilities`、`modes`；
  - 每个命令的 `args` / `flags`（类型、必填、枚举、默认值）/ `output` schema / 示例；
  - 错误目录（含 `retryable`、`hint`）；
  - workflow ops、project.json、machine.json 的 JSON Schema；
  - Skill 版本与路径。
- `status --json` 是唯一状态快照：`mode`、effective config、engine state、machine lock owner、`active_task`（仅本机）、`synced_running_tasks`（其他机器）、recent tasks、queue、GPU lease、Skill stale、artifact presence、`next_actions`。
- `workflow apply --json` 返回 `graph_sha256`、`changed_nodes`、`removed_links`、`warnings`。
- `workflow validate --json` 返回 `issues[]`：`{path, code, severity, message, hint}`。
- `workflow nodes` 默认只返回简洁类名列表；支持 `--limit` / `--cursor` / `--fields`；详情用 `workflow node <class>`。
- `schema_version` 只在破坏性变更时递增；错误码保持稳定，新增字段向后兼容。

---

## 5. 引擎生命周期

### 5.1 local 状态机

```
idle
  └─ task start → machine task lock → 回收残留引擎 → 恢复旧 GPU 租约
       → GPU 接管（可选）→ starting → ready
                                           │
                                     preflight/upload/submit
                                           │
                                       running
                                      /       \
                                succeeded     failed/OOM/interrupt
                                      \       /
                                       freeing
                                          │
                                       stopping
                                          │
                                  GPU 恢复 → 释放 machine task lock
                                          │
                                         idle
```

启动步骤：

1. 获取 machine task lock（全局唯一，local/remote 共用）；
2. 检查 PID / 端口，回收残留引擎；
3. 如果存在上一轮残留 GPU 租约，先恢复；
4. `project.json` 的 `gpu.takeover=true` 时执行显存接管；
5. spawn `venv/bin/python -u main.py --port <port> --extra-model-paths-config <yaml> [launch_extra]`；
6. 日志写 `logs/engine-<run_id>.log`，PID 写 `logs/engine.pid`；
7. 轮询 `/system_stats`，默认 180s 超时；
8. 就绪后进入预检。

停止步骤：

1. 如任务仍未结束，调用 `/interrupt`；
2. 调用 `/free`（短超时，失败不阻塞停止）；
3. SIGTERM 进程组，等待退出；
4. 超时 SIGKILL；
5. 校验端口释放；
6. 删除 PID 文件；
7. 清理 scratch input/output；
8. 按 GPU 租约恢复被卸载/驱逐的模型与进程；
9. 释放 machine task lock。

失败处理：

- 启动失败：记录 `engine_start_failed` + 日志尾；确保没有孤儿进程；恢复 GPU 租约；
- 就绪超时：SIGTERM → SIGKILL；恢复 GPU 租约；
- 停止失败：记录 `engine_stop_failed`，保留 PID 与日志路径；仍尝试恢复 GPU 租约；
- GPU 接管单项失败：记录 `gpu_takeover_failed`，继续处理其他内置目标；最终是否 OOM 由引擎决定；cleanup 仍执行恢复；
- 端口被未知进程占用：直接失败，不 kill。

### 5.2 remote 状态机

```
unreachable ↔ ready → running → freeing/跳过 → ready
```

- 不启动、不停止、不杀进程。
- 任务开始时探测 URL；队列有执行中/等待中任务 → `engine_busy`，不提交。
- 释放策略：
  - `always`：任务结束就 `/free`；
  - `when_idle`（默认）：队列空闲才 `/free`，否则记录 `skipped_busy`；
  - `never`：不释放。
- 释放失败只记录，不影响任务状态。

### 5.3 任务边界

- task 是可调度执行单元；一个 task 包含一个或多个 run；
- `run`：一个 task，一个 run；
- `shot 01 02` / `batch`：一个 task，多个 run，由同一个 worker 串行执行，共用一次引擎会话和一把 machine lock；
- task 默认异步；`--wait` 才阻塞；
- 中途 OOM / 引擎崩溃 / 不可达：中断整个 task，剩余 run 不执行，立即 cleanup；
- 普通业务错误（锚点缺失、workflow 校验失败）：记录后继续该 task 内的其他 run，task 结束统一 cleanup；
- 需要每镜独立重启，就拆成多个 task。

### 5.4 信号与取消

**worker 收到取消 / SIGTERM：**

1. 停止轮询；
2. 若已提交 prompt，调用 `/interrupt`；
3. `/free`；
4. local 停止进程；
5. local 按 GPU 租约恢复被卸载/驱逐对象；
6. 写 task `cancelled` 终态；
7. 释放 machine task lock。

**前台 `--wait` 收到 SIGINT：**

- 停止等待，打印 `task_id` 与 `status --task <id>` 提示；
- **不自动取消 worker**；要取消必须显式 `run cancel <task_id>`；
- 退出 130。

**worker SIGKILL / 崩溃：**

- 无法清理；machine lock 与 GPU 租约保留；
- 下一次 task 获取锁前执行 stale 恢复（见 §5.8）。

`cleanup_failed` 保留原始错误，不吞掉。

### 5.5 残留引擎回收

任务开始时，如果 local PID 文件存在：

| 情况 | 处理 |
|---|---|
| 进程不存在 | 删除 PID 文件 |
| 进程存在 + 有活动 machine lock | `machine_busy`，拒绝启动第二个 task |
| 进程存在 + 无活动 machine lock | 判定为残留：`/free` → SIGTERM → SIGKILL → 删除 PID |
| PID 不属于本项目 ComfyUI | 报错，不 kill |

### 5.6 metadata session（仅 workflow 节点目录刷新）

`workflow nodes --refresh` 在 local 模式下需要读取 `/object_info`，但这不是一次生成任务。

生命周期：

```
acquire machine task lock
回收残留 → spawn → 等 /system_stats
GET /object_info
写 .dycli/node_catalog.json
停止引擎（SIGTERM → SIGKILL）
release machine task lock
```

规则：

- **不提交 prompt，不加载模型**；
- 不需要 `/free`；停止进程即可释放；
- 不做 GPU 接管；metadata session 不驱逐任何进程；
- machine lock 被其他 task 持有：优先使用缓存，否则返回 `machine_busy`；
- 如果当前有生成 task 在跑，不启动第二个引擎：使用缓存，或返回 `machine_busy`；
- remote 模式没有 metadata session：直接 `GET /object_info`，不碰进程；
- 这是“任务之外启动 ComfyUI”的唯一显式例外。如果要求严格零启动，只能使用已有缓存；第一次任务预检会自动刷新缓存。

### 5.7 local GPU 接管与恢复

配置只有一个开关，放在 `project.json`：

```json
"gpu": { "takeover": true }
```

- 默认 `false`；
- 只在 local 任务生效；remote 忽略；
- **不需要配置 provider、端口、阈值、进程白名单**；内置目标由 dycli 代码维护。

#### 内置目标（写死在代码）

| 类别 | 目标 | 行为 |
|---|---|---|
| 模型服务 | ollama、LM Studio、xinference | API 卸载模型，保留进程；任务后重载 |
| 进程服务 | vLLM、TGI、llama.cpp server、SGLang | 记录 cmdline/cwd/env，SIGTERM → SIGKILL；任务后重启 |
| 其他 | 未知进程 | 不接管 |

- 列表是 `GPU_TAKEOVER_TARGETS` 常量，随 dycli 版本维护；用户不配置；
- 模型服务通过各自 API/CLI 卸载与重载（ollama `/api/ps`、LM Studio `lms`、xinference `/v1/models`）；使用默认端口自动探测，不需要用户配置；
- 模型服务优先，进程服务其次；
- 只处理当前用户、非关键进程；永不驱逐 PID 1、dycli 自身及祖先、显示管理器、sshd/systemd、内核线程、其他用户进程；
- 容器内 `nvidia-smi` 可能看到宿主机 PID；进程服务重启是 best-effort。

#### 平台

- 首选 Linux + NVIDIA；macOS / AMD / Windows 报 `gpu_unsupported` warning，任务继续但不接管；
- remote 不接管远端 GPU，只 `/free`。

#### 流程

1. machine task lock（worker 已持有）；
2. 回收残留引擎，恢复旧租约；
3. `project.json.gpu.takeover=true` 时读取 `nvidia-smi` 并探测内置目标；
4. 写 GPU 租约；
5. 模型服务卸载模型（保留进程）；
6. 进程服务按内置匹配规则 kill，记录重启信息；
7. 启动引擎、提交任务；
8. cleanup：free + 停止引擎 → 恢复模型/进程 → 释放 GPU 锁。

规则：

- 不设显存阈值；接管后仍不足，由 ComfyUI 实际加载决定，OOM 时按 `engine_oom` 清理；
- 未知进程不动；OOM 详情里列出占显存进程，方便用户处理；
- 单个内置目标失败记 `gpu_takeover_failed`，继续处理其他目标；
- machine task lock 被占用 → `machine_busy`；陈旧锁按 worker PID 探活清理。

#### 恢复

- 模型服务：按租约重载模型；
- 进程服务：按记录的 cmdline/cwd/env 重启，best-effort；
- 恢复失败：`gpu_restore_failed`，租约保留，下次任务重试；
- `SIGKILL` / 崩溃：租约保留；下一次 local 任务先恢复旧租约；
- 锁与租约位置：`~/.dycli/machine.lock`、`~/.dycli/gpu/lease.json`，不进仓库；
- 简单实现：先恢复旧租约，再按新任务计划接管；后续可合并计划，避免重复加载。

#### 安全边界

- 默认关闭；
- 只操作内置目标，未知进程永不 kill；
- 所有动作写日志与 `run.json`；
- 不记录环境变量等可能含密钥的内容；
- 部分接管失败时继续执行，最终以 `engine_oom` 或成功结束；恢复仍执行；
- metadata session 不触发接管；
- `status --json` 展示 lock / 租约 / 最近一次接管与恢复结果；不新增 `gpu` 命令。

### 5.8 异步 task worker 与机器级单任务锁

#### 硬约束

**同一台设备同一时刻只允许一个 generation task 执行；local 和 remote 一样。**

- 锁文件：`~/.dycli/machine.lock`；
- 锁记录：`task_id`、项目路径、`mode`、`command`、worker PID、`started_at`、token；
- 第二个 task 直接返回 `machine_busy`，**不排队**；
- `machine_busy` 必须携带当前 owner 信息与 `retry_after_ms`，Agent 可据此等待或取消；
- generation task 包括 `run`、`shot`、`retake`、`batch`；
- `wrap` 是 CPU 后处理，不占 GPU，不参与机器锁；`validate` / `status` / `logs` 也不参与；
- 机器锁是**本机锁**：不同设备可以各自跑一个 task；task/run 记录带 `machine_id`，`status` 区分本机 active 与 Git 同步过来的其他机器任务；
- 机器锁按 OS 用户隔离；同一台机器的不同 OS 用户需要系统级锁，本轮不做。

#### 异步执行模型

`run` / `shot` / `retake` / `batch` 默认异步：

```text
CLI:
  检查 request_id → 命中已有 task → 直接返回该 task
  检查 machine.lock
  已被占用 → machine_busy
  空闲 → 原子创建锁预留 → 创建 task.json（queued）→ spawn worker → 返回 task_id
worker:
  接管锁 owner → 读取 task → 执行/清理 → 写 events.jsonl → 释放锁
```

- `--wait`：CLI 留在前台，tail `events.jsonl`，直到 task 终态；退出码映射 task 结果；
- 默认不带 `--wait`：CLI 退出码 `0` 只表示 task 已成功创建/启动，**不代表任务成功**；最终结果看 `status --task`；
- `status --task <id> --wait` 的退出码映射 task 结果；等待超时返回当前状态；
- 默认不带 `--wait`，Agent 可以继续做别的事；
- worker 是 detached 进程，不需要常驻 daemon；
- spawn 失败：task 标记 failed、释放锁预留、返回 `worker_start_failed`；
- worker 负责引擎启动、GPU 接管、提交、轮询、产物下载、cleanup、锁释放；
- 前台创建 task 后立即返回 `task_id`、初始 `status`、`events_path`、`next_actions`；
- `shot` / `batch` 是包含多个 run 的 task，由同一个 worker 串行执行，始终只占一把机器锁。

#### 幂等

- `run --request-id <id>`：写入 `task.json`；
- 同一 `request_id` 已有 task 时，直接返回原 task，不重复提交；
- 如果原 task 已 failed/cancelled，重试默认返回原结果；修复后应使用新的 request id；
- `shot` / `batch` 同样支持 `--request-id`。

#### 查询与取消

- `status --task <task_id> [--wait] [--timeout <秒>] [--json]`：task 状态、run 列表、cleanup、next_actions；
- `status --run <run_id> [--wait] [--timeout <秒>] [--json]`：单 run 详情；
- `logs --task <task_id> [-f] [--json]`：结构化事件流；
- `logs --run <run_id> [-f] [--json]`：单 run 事件/日志；
- `run cancel <task_id>`：向 worker 发取消；worker 执行 interrupt → free → stop → restore，然后写终态；
- worker 已死：将 task 标记 `interrupted`，执行 stale 恢复，不等待；
- `--wait` 只等待，不自动取消；超时后返回当前状态。

#### 陈旧 worker / 锁恢复

新 task 在获取锁之前：

1. 读取 `machine.lock`；
2. owner PID 存活 → `machine_busy`；
3. owner PID 不存在 → 视为 stale：
   - 若 task 目录可访问，将 task 标记为 `interrupted`；
   - 按锁记录停止残留 local 引擎（如存在）；
   - 恢复 `~/.dycli/gpu/lease.json`；
   - 删除锁；
4. 锁文件损坏 → `machine_lock_corrupt`，要求人工清理，不盲目接管。

#### remote 同样串行

remote 任务没有本地 GPU，但仍然占用 `machine.lock`。因此同一台设备上的 local 与 remote 任务也不会并发；这满足“同一设备只允许一个任务”的底线。

#### metadata session

`workflow nodes --refresh` 在 local 模式会启动一个不加载模型的引擎，也必须获取 `machine.lock`：

- 锁被占用：优先用缓存，否则返回 `machine_busy`；
- 取完 `/object_info` 立即停止并释放锁；
- 不参与 generation task 的队列/幂等。

---

## 6. 执行流程

### 6.1 主流程

```
CLI:
  检查 machine.lock
  忙 → machine_busy（带 owner / retry_after_ms）
  空闲 → 创建 task.json（queued）+ 锁预留 → spawn worker → 返回 task_id
worker:
  acquire/handoff machine task lock
  if local:
    回收残留引擎
    恢复旧 GPU 租约（如有）
    GPU 接管（`project.json.gpu.takeover=true` 时）
    spawn → 等 /system_stats
  if remote:
    probe → queue check（忙则 engine_busy）
  preflight /object_info（节点类 + loader 模型值）
  upload inputs (/upload/image)
  submit (/prompt)
  poll /history（WS 进度可选）
  if 已提交 prompt:
    /interrupt（如仍未结束）
    判定终态（成功 / 失败 / OOM）
    /free（local 始终；remote 按策略）
    if 成功：下载产物 (/view) → runs/<id>/outputs
  cleanup:
    local: SIGTERM → SIGKILL
    清理 scratch input/output
    local: 按 GPU 租约恢复被卸载/驱逐对象
  release machine task lock
  写 task.json / events.jsonl / run.json
```

### 6.2 关键规则

1. **未提交 prompt 不 `/free`**：preflight / 上传 / node_errors 阶段没有加载模型，只停止 local 引擎。
2. **OOM**：从 `/history` error 或引擎日志识别；立即 `/interrupt`（如需要）→ `/free` → 停止 → `engine_oom`。
3. **成功**：生成完成先 `/free`，再 `/view` 下载产物，最后停止 local 进程。
4. **产物下载失败**：不删除引擎 scratch；记录 `artifact_download_failed`；local 仍停止，保留路径供人工恢复。
5. **模型加载**：由 ComfyUI 执行 prompt 时完成；dycli 不预加载，也不在 `init` 时加载。
6. **HTTP 统一**：local 也不直接读 `engine/output`、写 `engine/input`。
7. **节点编辑默认离线**：`workflow` 系列命令读写文件与本地缓存，不启动引擎；只有 `workflow nodes --refresh` 会启动一个不加载模型的 metadata session。
8. **GPU 接管只在 local**：任务开始前执行，任务结束（成功/失败/OOM/中断）后恢复；remote 只 `/free`，不碰远端进程。
9. **接管失败不中止**：单个内置目标失败记录 `gpu_takeover_failed`，继续其他目标；最终 OOM 归 `engine_oom`；cleanup 仍恢复已接管对象。
10. **metadata session 不接管 GPU**：只读节点目录，不加载模型，不驱逐任何进程。
11. **同一设备只允许一个 generation task**：`~/.dycli/machine.lock` 全局唯一；local/remote 一样；第二个任务直接 `machine_busy`，不排队。
12. **默认异步**：`run` / `shot` / `retake` / `batch` 返回 `task_id`；`--wait` 才阻塞；worker 负责生命周期与 cleanup。
13. **幂等**：`--request-id` 命中已有 task 时返回原 task，不重复提交。
14. **取消**：`run cancel <task_id>` 触发 interrupt → free → stop → restore；`--wait` 不自动取消。

### 6.3 预检内容

- 每个节点的 `class_type` 是否存在于 `/object_info`；
- loader 类输入（`unet_name`、`ckpt_name`、`clip_name`、`vae_name`、`lora_name` 等）的值是否在枚举里；
- 图内引用 `[nodeId, outputIndex]` 是否有效；
- remote：队列是否空闲；
- 记录 `/system_stats` 的 VRAM 快照；
- 刷新 `.dycli/node_catalog.json`（任务预检是节点目录的权威来源）；
- 不尝试精确预测显存是否足够——以 ComfyUI 实际加载结果为准。

### 6.4 多镜头任务

- 引擎会话在第一个镜头前建立，最后一个镜头结束后统一释放；
- 某个镜头 OOM / 引擎崩溃 / 不可达：立即中断整个任务，已完成 run 保留，剩余镜头不执行；
- 普通业务错误：记录后继续；
- `batch` 跳过已有成功 run 的镜头；
- 需要严格每镜独立生命周期，拆分命令调用。

---

## 7. 命令设计

### 7.1 重构后的命令树

```
daoyan help [命令] [--json]
daoyan update [--check]

daoyan init --mode=local [--modelpath <路径>] [--version <tag>] [--mirror <镜像>] [--no-skill]
daoyan init --mode=remote --url <url> [--no-skill]

daoyan validate [--json]

daoyan skill update [--json]

daoyan workflow new <name>
daoyan workflow import <api.json> --name <name>
daoyan workflow list [--json]
daoyan workflow show <name> [--full] [--node <id>] [--json]
daoyan workflow nodes [--filter <文本>] [--refresh] [--limit N] [--cursor <c>] [--fields <list>] [--json]
daoyan workflow node <class_type> [--json]
daoyan workflow apply <name> --ops <ops.json|-> [--json]
daoyan workflow set <name> <nodeId>.<input> <value> [--json]
daoyan workflow validate <name> [--json]

daoyan run <workflow.json|name> [--set nodeId.input=value ...]
                           [--label <label>] [--engine <url>]
                           [--request-id <id>] [--wait] [--dry-run]
                           [--timeout <小时>] [--json]
daoyan run cancel <task_id> [--json]

daoyan shot <镜号...> [--steps N] [--request-id <id>] [--wait] [--timeout <小时>] [--json]
daoyan retake <镜号...> [--request-id <id>] [--wait] [--json]
daoyan batch [--request-id <id>] [--wait] [--timeout <小时>] [--json]
daoyan wrap [--select <镜号>=<run_id> ...] [--json]

daoyan status [--json]
daoyan status --task <task_id> [--wait] [--timeout <秒>] [--json]
daoyan status --run <run_id> [--wait] [--timeout <秒>] [--json]
daoyan logs [-f] [-n N] [--src daoyan-cli|engine|all]
            [--task <task_id> | --run <run_id>] [--json]

daoyan engine ls
daoyan engine install <版本 tag>
daoyan engine use <版本 tag|路径>
```

全局参数保持不变：`--json`、`--project <路径>`、`--no-color`、`-h/--help`、`-v/--version`。非 TTY 默认 JSON；人类文本只是渲染层（见 §4.9）。

`init` 语义：

- 必须在项目目录下运行，**不接收项目名**；
- `--mode` 必填，取值 `local` / `remote`，没有默认值；
- `local`：可选 `--modelpath`；省略时使用 `engine/ComfyUI/models`；
- `remote`：必须提供 `--url`，只接受 `http://` / `https://`；
- `--modelpath` 必须是已存在的目录，否则 `config_invalid`；
- 目录中没有 `project.json`：按当前目录名创建新项目骨架；已有 `project.json`：只绑定/更新本机 `.dycli/machine.json`，不覆盖共享文件；
- local 只部署，不启动引擎；remote 不部署；
- 可重复运行 `init` 更新本机配置；
- 默认生成 `.agents/skills/daoyan/` 并写入/更新 `AGENTS.md` 管理块；`--no-skill` 跳过；
- local 的 `init` / `engine install` / `engine use` 在 machine lock 被占用时拒绝（`machine_busy`），避免改动正在使用的引擎；
- `--version` / `--mirror` 仅 local 可用；与模式不匹配的参数直接 usage error。

`skill update`：

- 在项目内重新生成 `.agents/skills/daoyan/` 与 `AGENTS.md` 管理块；
- 不启动引擎、不修改工作流、不执行 Git；
- 项目外运行报 `project_not_found`。

`workflow` 命令族里，**只有 `apply` 和 `set` 会改图**；`new/import` 创建文件，其余（`list/show/nodes/node/validate`）只读或校验。Agent 批量编辑优先用 `apply`，单点修改用 `set`。

校验命令的分工：

- `daoyan validate`：项目级校验，覆盖 shots / anchors / relay、所有 workflow 的结构与 bindings、machine overrides、local 模型文件扫描；
- `daoyan workflow validate <name>`：单张图校验，适合 Agent 编辑后立即检查。

### 7.2 命令变化总表

| 命令 | 变化 | local | remote |
|---|---|---|---|
| `init` | 重定义 | 当前目录；`--mode=local [--modelpath]`；生成 Skill/AGENTS.md；不启动 | `--mode=remote --url <url>`；不部署 |
| `skill update` | **新增** | 项目内重新生成 `.agents` 与 `AGENTS.md` | 同左 |
| `workflow ...` | **新增命令族** | 默认离线编辑；`nodes --refresh` 启动 metadata session | `nodes` 直接 GET `/object_info` |
| `validate` | 改语义 | 离线结构 + 模型文件扫描 | 离线结构 |
| `run <workflow>` | **新增（异步）** | 返回 task_id；machine lock；`--wait` 才阻塞 | 同左；remote 也占 machine lock |
| `run cancel` | **新增** | 取消当前 task，触发 cleanup | 同左 |
| `shot` / `retake` | 改造（异步） | 一个 task 多 run；machine lock | 同左 |
| `batch` | 实现（异步） | 一个 task 多 run；machine lock | 同左 |
| `wrap` | 改造 | CPU 后处理，不占 machine lock | 同左 |
| `status` | 改造 | 被动；支持 `--task` / `--run` / `--wait` | 同左 |
| `logs` | 改造 | 支持 `--task` / `--run` / `--json`；事件流 | 同左 |
| `engine ls/install/use` | 保留 | 可用 | 不适用 |
| `up` / `down` | **删除** | 生命周期内嵌 | 无 |
| `doctor` | **删除** | 并入 validate + preflight | 同左 |
| `list` | **删除** | 并入 `status --json` | 同左 |
| `gpu status/evict/restore` | **删除** | 改为 `project.json` 的 `gpu.takeover`，无独立命令 | 不适用 |
| `help` / `update` | 保留 | — | — |

### 7.3 典型用法

> `run` / `shot` / `batch` 默认异步，返回 `task_id`；加 `--wait` 才在前台等待。下面示例用 `--wait` 表示同步完成。

local：

```bash
daoyan init --mode=local --modelpath /data/models
daoyan run workflows/t2v.json --set 7.seed=1101 --label shot:01 --request-id shot-01 --wait
daoyan status --json
```

异步写法：

```bash
daoyan run workflows/t2v.json --set 7.seed=1101 --label shot:01 --request-id shot-01 --json
# 返回 task_id 后
daoyan status --task <task_id> --wait --json
```

新机器：

```bash
git clone <repo> && cd demo && git lfs pull
daoyan init --mode=local --modelpath /Users/me/models
daoyan run workflows/t2v.json --set 7.seed=1102 --label shot:02 --wait
```

remote：

```bash
daoyan init --mode=remote --url http://gpu-box:8188
# 或单次覆盖
daoyan run workflows/t2v.json --engine http://gpu-box:8188 --label shot:03 --wait
```

### 7.4 节点编辑用法（Agent）

```bash
# 1. 查节点定义
daoyan workflow nodes --filter KSampler --json
daoyan workflow node KSampler --json

# 2. 创建或导入
daoyan workflow new t2v
# 或：daoyan workflow import ./from-comfyui.json --name t2v

# 3. 批量改图（推荐）
daoyan workflow apply t2v --ops ./ops.json --json

# 4. 快速改单个参数
daoyan workflow set t2v 6.text "a dog"

# 5. 校验
daoyan workflow validate t2v --json

# 6. 执行
daoyan run t2v --set seed=42 --label shot:01 --json
```

`workflow apply` 的 ops 文件示例：

```json
{
  "ops": [
    { "op": "add_node", "id": "4", "class_type": "CheckpointLoaderSimple" },
    { "op": "set_input", "node": "4", "input": "ckpt_name", "value": "sdxl.safetensors" },
    { "op": "add_node", "id": "6", "class_type": "CLIPTextEncode" },
    { "op": "connect", "from": { "node": "4", "output": 1 }, "to": { "node": "6", "input": "clip" } },
    { "op": "set_input", "node": "6", "input": "text", "value": "a cat" }
  ]
}
```

要点：

- `workflow apply` 是全量校验后原子写盘，失败不会留下半张图；
- 节点 ID 由 Agent 指定或 dycli 分配；
- 节点目录缓存缺失时，`workflow nodes --refresh` 取一次；之后离线可用；
- 不提供 `workflow save`：写盘即保存，Git 负责版本；
- Agent 也可以直接写完整 API JSON，然后用 `workflow validate` / `run` 校验并执行；
- `workflow set` 与 `run --set` 的值按 JSON 解析：`42` → number，`true` → boolean，`[1,2]` → array，解析失败按字符串处理。

### 7.5 run 参数

```
daoyan run <workflow.json|name>
  [--set nodeId.input=value ...]
  [--label shot:01]
  [--engine <url>]        # 单次 remote
  [--request-id <id>]     # 幂等键
  [--wait]                # 前台等待到终态
  [--dry-run]             # 只出计划，不执行
  [--timeout <小时>]
  [--json]

daoyan run cancel <task_id> [--json]
```

- 工作流就是文件路径或 `workflows/<name>.json` 的短名，不引入 registry；
- `--set` 支持 `nodeId.input`；有 bindings 时也支持逻辑名；
- **默认异步**：返回 `task_id`、`run_id`、`state=queued`、`events_path`、`next_actions`；
- `--wait` 才在前台等待到终态，退出码映射 task 结果；
- `--request-id` 命中已有 task 时直接返回原 task，不重复提交；
- `--dry-run` 不占 machine lock、不启动引擎，返回解析后的 graph 哈希、inputs、mode、GPU 接管计划、将上传文件、预期产物；
- 已有其他 generation task 时直接返回 `machine_busy`，不排队；
- task 结束后 `--json` 返回 `outputs`、`cleanup`、`error`、`task_id`、`run_id`；产物包含相对路径与运行时物化绝对路径。

### 7.6 删除命令的理由

| 命令 | 删除理由 | 替代 |
|---|---|---|
| `up` | `run` / `shot` / `batch` 已自动确保引擎就绪 | 无 |
| `down` | 任务结束自动 `/free` + 停止；残留由下一次任务回收 | 无 |
| `doctor` | `validate` 覆盖离线检查；在线检查在任务预检 | `validate` + preflight |
| `list` | `status --json` 已包含镜头与 runs | `status --json` |
| `gpu evict/restore/status` | 改为 `project.json` 的 `gpu.takeover` 布尔开关，local 任务自动接管/恢复 | `project.json`，无独立命令 |

---

## 8. 版本管理与跨机器

### 8.1 工作流版本

- 真源：`workflows/*.json`，进 Git；
- 每次 run 把实际提交的图快照到 `runs/<id>/workflow.json`，并在 `run.json` 记录哈希；
- 回滚/复跑：`daoyan run runs/<id>/workflow.json`；
- 不提供 `wf save/tag/diff` 命令；分支、tag、diff 交给 Git。

### 8.2 产物版本

- 每个 run 的 `outputs/` 独立存在，重拍不覆盖；
- `status --json` 汇总 runs；
- `wrap` 默认按 label 选最新成功 run，可用 `--select 01=<run_id>` 明确指定；
- 最终合片写 `final/cut-<timestamp>.mp4` + `cut-<timestamp>.json`，记录选中的 run / artifact；
- `status` 检测产物缺失 / LFS 未拉取，提示 `git lfs pull`。

### 8.3 跨机器

- 共享层：`project.json`、`workflows/`、`shots.json`、`inputs/`、`runs/`、`final/`；
- 本机层：`.dycli/machine.json`、`engine/`、`logs/`；
- 机器差异：
  - 显存：`overrides` 调分辨率 / 步数；
  - 模型文件名：`overrides` 重映射 loader 输入；
  - 启动参数：`launch_extra`，如 `--lowvram`；
  - ComfyUI 版本：默认用 `project.json` 的 pin，必要时在 machine.json 覆盖；
- 优先级：workflow < machine overrides < `--set`；
- run 快照记录最终解析后的图，本机覆盖完全可追溯；
- 二进制产物用 Git LFS 或外部存储；元数据始终可读、可 diff；
- 跨机器不保证像素级一致；run.json 记录平台、GPU、torch、ComfyUI 版本。

### 8.4 跨机器工作流

机器 A：

```bash
daoyan init --mode=local --modelpath /data/models
daoyan run workflows/t2v.json --label shot:01 --request-id shot-01 --wait
git add -A && git commit -m "shot 01" && git push
```

机器 B：

```bash
git clone <repo> && cd demo && git lfs pull
daoyan init --mode=local --modelpath /mnt/models
daoyan status --json          # 看到 shot:01 已完成
daoyan run workflows/t2v.json --label shot:02 --request-id shot-02 --wait
```

### 8.5 确定性边界

- 同一 seed 在不同 GPU / torch / ComfyUI 版本上不保证像素级一致；
- 版本管理保证：输入、参数、工作流、环境可追溯；
- 若需要更严格的复现，需要固定硬件、驱动、torch 与 ComfyUI 版本，不在本方案承诺范围内。

---

## 9. 代码重构

### 9.1 新增文件

| 文件 | 职责 |
|---|---|
| `src/core/engine/session.mts` | `EngineSession` 接口 + 工厂：`ensureReady` / `markSubmitted` / `release` |
| `src/core/engine/local-session.mts` | local spawn、就绪探测、PID、残留回收、SIGTERM/SIGKILL、scratch 清理 |
| `src/core/engine/remote-session.mts` | remote probe、queue 检查、free 策略；不碰进程 |
| `src/core/run/store.mts` | run id、目录创建、原子写、run.json、查询 |
| `src/core/task/store.mts` | task id、task.json、request_id 索引、run 列表、状态迁移 |
| `src/core/task/worker.mts` | detached worker：机器锁、引擎/GPU 生命周期、执行、cleanup、事件 |
| `src/core/task/events.mts` | `events.jsonl` 追加写、tail、结构化事件类型 |
| `src/core/machine/lock.mts` | `~/.dycli/machine.lock`：原子获取、owner、handoff、stale 检测、释放 |
| `src/core/agent/contract.mts` | 统一 JSON 契约：schema_version、错误字段、output schema、next_actions |
| `src/core/run/executor.mts` | preflight、上传、提交、轮询、OOM 分类、下载、GPU 接管/恢复编排、cleanup |
| `src/core/gpu/detect.mts` | 平台能力探测、nvidia-smi 解析、GPU/进程快照 |
| `src/core/gpu/lease.mts` | GPU 租约读写、陈旧租约恢复（不负责任务锁） |
| `src/core/gpu/takeover.mts` | 读取 `gpu.takeover` 开关，按内置目标执行接管/恢复 |
| `src/core/gpu/targets.mts` | `GPU_TAKEOVER_TARGETS` 内置目标常量（provider + 进程服务） |
| `src/core/gpu/providers/ollama.mts` | ollama `/api/ps` 卸载/重载 |
| `src/core/gpu/providers/lmstudio.mts` | LM Studio `lms` / HTTP 适配 |
| `src/core/gpu/providers/xinference.mts` | xinference `/v1/models` 卸载/重载 |
| `src/core/gpu/providers/process.mts` | 内置进程服务驱逐、cmdline/cwd/env 捕获与重启 |
| `src/core/workflow/graph.mts` | 图模型：节点 ID、连线编码、加载/保存、结构校验 |
| `src/core/workflow/ops.mts` | graph ops：add/set/connect/disconnect/remove，全量校验后原子应用 |
| `src/core/workflow/catalog.mts` | `/object_info` 获取、缓存、指纹、节点查询 |
| `src/core/workflow/load.mts` | API JSON 加载、bindings、overrides |
| `src/core/workflow/preflight.mts` | `/object_info` 节点/模型检查 |
| `src/core/agent/skill.mts` | 从命令 registry / AgentDoc 生成 `SKILL.md` 与 `reference/*.md` |
| `src/core/agent/agents-md.mts` | `AGENTS.md` 管理块读写、幂等更新、保留用户内容 |
| `src/commands/skill.mts` | `skill update` 命令 |
| `src/commands/workflow.mts` | `workflow` 命令族 |
| `src/commands/run.mts` | `run` 命令 |
| `test/mock-comfy.mts` | 假 ComfyUI HTTP server |

### 9.2 修改文件

| 文件 | 改动 |
|---|---|
| `src/core/comfy/client.mts` | 增加 `free()`、`view/download()`、`interrupt()` |
| `src/core/comfy/lifecycle.mts` | 拆到 local-session；删除 persistent ensureEngine 语义 |
| `src/core/pipeline/generate.mts` | 改用 executor；删除 `engineOutputDir`、`ensureInputCopy`、`findClip` |
| `src/commands/shot.mts` | 异步 task；一个 task 多 run；`--wait` / `--request-id`；删除 `--no-evict`、`--no-up` |
| `src/commands/wrap.mts` | 从 runs 选段；写 cut manifest；CPU 后处理，不占 machine lock |
| `src/commands/status.mts` | 被动快照；`--task` / `--run` / `--wait`；mode/GPU/Skill/lock 信息 |
| `src/commands/validate.mts` | 删除 `REQUIRED_WF_KEYS`；校验 workflow + bindings + machine overrides；local 扫描模型目录 |
| `src/commands/init.mts` | `--mode` 必填；local `--modelpath`、remote `--url`；当前目录初始化；生成 `.agents/skills/daoyan/` 与 `AGENTS.md` 管理块；只部署不启动 |
| `src/core/provision/init-flow.mts` | modelpath / extra_model_paths、torch/CUDA、custom nodes、端口分配 |
| `src/core/gpu/orchestrate.mts` | 拆分为 detect/lease/takeover/providers；删除旧 stub 语义 |
| `src/commands/registry.mts` | 增加 `workflow`、`run`、`run cancel`、`skill update`；删除 up/down/doctor/list/gpu；实现 batch |
| `src/core/project/types.mts` | v2 配置、machine 配置、task/run 类型；删除模型三件套 |
| `src/shared/errors.mts` | 新错误码（含 `machine_busy` / `skill_write_failed` 等）与 retryable 元数据 |
| `src/cli.mts` | 异步启动 worker、`--wait` tail、前台 SIGINT 语义、cleanup 后再退出 |
| `src/commands/help.mts` | AgentDoc 增加 args/flags/examples/jsonShape/output schema/error retryability，供 `help --json` 与 Skill 生成共用 |
| `src/commands/logs.mts` | `--task` / `--run` / `--json`；事件流与引擎文本日志分离 |
| `src/core/obs/collect.mts` | status 快照：config/lock/engine/active task/queue/GPU/skill |

### 9.3 删除 / 废弃

- `engineOutputDir`、`engineInputDir`、`ensureInputCopy`、`findClip` 的 mtime 扫描；
- `REQUIRED_WF_KEYS` 和固定节点命名约定；
- `manifests/` 写入（新执行只写 `runs/`）；
- `gpu/orchestrate.mts` 的旧 k3s/crictl Pod 发现 + `evict_targets` 语义（由 detect/lease/takeover/providers 替代；不再依赖 k3s/crictl）；
- `up` / `down` 占位命令；
- `--no-evict`、`--no-up` 参数。

### 9.4 测试

使用 `node:test` + 假 ComfyUI HTTP server，覆盖：

- local 成功：启动 → 预检 → 提交 → `/free` → 停止；
- local OOM：`/interrupt` → `/free` → 停止 → `engine_oom`；
- preflight 失败：不调用 `/free`，local 仍停止；
- SIGINT：清理完成，退出 130；
- remote 成功：不启动/停止进程，按策略 `/free`；
- remote 队列忙：`engine_busy`，不提交、不 `/free`；
- 残留引擎回收；
- run store 原子写与不可变快照；
- bindings 与 machine overrides 的优先级；
- GPU takeover：provider 卸载/重载、内置进程服务驱逐/重启、machine lock、陈旧租约恢复、平台不支持降级；
- graph ops：add/set/connect/remove、ID 分配、断链拒绝、原子写；
- node catalog 缓存、指纹变化、`--refresh` metadata session；
- Agent Skill：生成结果与 registry 快照一致；`AGENTS.md` 管理块幂等且保留用户内容；`--no-skill` 不写文件；stale 检测；
- 异步 task：默认返回 task_id；`--wait` tail 到终态；`--request-id` 幂等；`run cancel` 清理；
- 机器级单任务：两个 project 并发 local/remote 都只有一个 task 执行，另一个 `machine_busy`；
- worker 崩溃 / stale machine lock：下一次任务恢复旧 task、引擎和 GPU 租约；
- `events.jsonl` 追加/tail；`status --task/--run` 快照；
- 错误信封的 `retryable` / `retry_after_ms` / `next_actions`；
- `help --json` 的 args/flags/output/error schema 快照；
- `status --json` 快照：lock owner、active task、recent tasks、GPU lease、Skill；
- 产物下载与缺失检测。

真实 ComfyUI E2E 作为 M4 的验收项，不进入单元测试。

---

## 10. 错误码

新增：

| code | 场景 |
|---|---|
| `engine_oom` | 模型加载/采样显存不足 |
| `engine_start_failed` | local 启动失败/就绪超时 |
| `engine_stop_failed` | local 停止失败 |
| `engine_unreachable` | remote 不可达 |
| `engine_busy` | remote 队列已有任务 |
| `engine_crashed` | 引擎进程异常退出 |
| `cleanup_failed` | free/stop/清理失败（附加在原始错误 details） |
| `model_not_found` | 预检/离线扫描缺模型 |
| `node_missing` | `/object_info` 缺节点类 |
| `workflow_invalid` | 图结构/引用/bindings 非法 |
| `artifact_download_failed` | `/view` 下载失败 |
| `run_failed` | 通用执行失败 |
| `run_timeout` | 任务超时 |
| `gpu_unsupported` | 当前平台不支持 GPU 接管（如 macOS / 无 nvidia-smi） |
| `machine_busy` | 同一设备已有 generation task 在跑；携带 owner / retry_after_ms |
| `machine_lock_corrupt` | `~/.dycli/machine.lock` 损坏，无法安全恢复 |
| `task_not_found` | `status --task` / `run cancel` 找不到 task |
| `run_not_found` | `status --run` 找不到 run |
| `worker_start_failed` | detached worker 启动失败 |
| `worker_crashed` | worker 异常退出；task 标记 interrupted |
| `gpu_takeover_failed` | 某个内置目标的卸载/驱逐/重启失败（非致命） |
| `gpu_restore_failed` | 任务后恢复模型/进程失败（租约保留） |
| `gpu_lease_corrupt` | GPU 租约文件损坏或无法解析 |
| `skill_write_failed` | 生成 `.agents/skills/daoyan/` 或更新 `AGENTS.md` 管理块失败 |

错误信封统一包含：

```json
{
  "ok": false,
  "schema_version": 1,
  "error": {
    "code": "machine_busy",
    "message": "another task is running",
    "retryable": true,
    "retry_after_ms": 5000,
    "hint": "...",
    "task_id": "...",
    "next_actions": ["status --task <id>", "run cancel <id>"],
    "details": {}
  }
}
```

`retryable` 分类：

- 立即重试：`machine_busy`、`engine_busy`；
- 修改配置后重试：`engine_oom`、`model_not_found`、`node_missing`；
- 终止：`workflow_invalid`、`usage`、`config_invalid`。

`cleanup_failed` 永远作为附加信息，不覆盖主错误。

---

## 11. 里程碑与验收

### M1 基础层

内容：

- 类型 / 配置拆分：`project.json` v2 + `.dycli/machine.json`；
- 图模型、graph ops、node catalog、bindings、machine overrides；
- `ComfyClient` 增加 `/free`、`/view`、`/interrupt`；
- run store、workflow loader；
- 假 ComfyUI HTTP server。

验收：

- mock server 下能创建 workflow、通过 ops 添加/连接/设参、校验并生成 run 目录；
- 任一 op 失败时文件不变（原子性）；
- 节点目录缓存与指纹刷新可用；
- `run.json` 不含绝对路径。

### M2 引擎会话与 task worker

内容：

- `EngineSession` 接口；
- local session：启动、就绪、PID、残留回收、停止、scratch 清理；
- remote session：probe、queue 检查、free 策略；
- `~/.dycli/machine.lock`：原子获取、owner、handoff、stale 恢复；
- detached task worker、`task.json`、`events.jsonl`；
- GPU 租约、takeover/restore、provider 适配与内置进程服务；
- OOM 分类、取消/信号处理。

验收：

- local 成功：task 前无进程，task 中有进程，结束后 `/free` + 进程退出；
- local OOM：`/interrupt` + `/free` + 停止 + `engine_oom`；
- preflight 失败：不调用 `/free`，local 仍停止；
- 前台 `--wait` SIGINT：停止等待但 task 继续；`run cancel` 才取消；
- remote：全程不启动/停止进程，按策略 `/free`；
- 平台不支持 GPU 接管时 `gpu_unsupported` warning，task 继续；
- **两个 project 并发 local/remote：只有一个 task 执行，另一个 `machine_busy`**；
- worker 崩溃后，下一次 task 恢复 stale lock / 引擎 / GPU 租约；
- GPU 接管（mock）：ollama/LM Studio/xinference 卸载并恢复；内置进程服务驱逐并重启。

### M3 命令层

内容：

- `init --mode=local [--modelpath]` / `init --mode=remote --url`；
- `init` 生成 `.agents/skills/daoyan/` 与 `AGENTS.md` 管理块；`--no-skill` 跳过；
- `skill update` 重新生成项目内 Skill；
- `workflow` 命令族（new/import/list/show/nodes/node/apply/set/validate）；
- `run`：默认异步、`--wait`、`--request-id`、`--dry-run`、`run cancel`；
- `shot` / `retake` / `batch`：异步 task，`--wait` / `--request-id`；
- `status --task/--run`、`logs --task/--run`、`validate`、`wrap`；
- 删除 `up` / `down` / `doctor` / `list` / `gpu *`。

验收：

- 缺少 `--mode` 或模式参数不匹配时 usage error；
- `init` 后存在 `.agents/skills/daoyan/SKILL.md`、`reference/*`、`AGENTS.md` 管理块；
- `--no-skill` 时两者都不生成；
- Agent 可以读取项目内 Skill，按 `workflow nodes → apply → validate → run` 完成一次生成；
- `skill update` 幂等，`AGENTS.md` 用户内容不被覆盖；
- Agent 可以只用 `workflow` 命令从零创建、校验一个工作流，再 `run` 执行；
- `run` 默认返回 task_id；`--wait` 可拿终态；`--request-id` 重试返回同一 task；
- **同一设备并发 local/remote 任务只有一个执行，另一个 `machine_busy` 并带 owner**；
- `status --task/--run` 与 `logs --task/--run --json` 可独立观测；
- local / remote 端到端都能生成并落 `runs/<id>/outputs`；
- `shot 01 02` 一个 task、多个 run、共用一次引擎会话，最后统一释放；
- remote 队列忙时 `engine_busy`，不提交、不 `/free`；
- `status` 不拉起引擎；`validate` 离线可用；
- `wrap` 从 runs 选段并写 cut manifest。

### M4 可移植与工程化

内容：

- `modelpath` / `extra_model_paths` / torch / custom nodes；
- machine overrides；
- Git LFS 约定；
- 真实引擎与真实 GPU 接管 E2E；
- 文档重写：`PLAN.md`、`COMMANDS.md`、`DATA-MODEL.md`、`ERROR-CODES.md`、`AGENT-SKILL.md`。

验收：

- 双机场景：A 机 `init --mode=local` 生成并 push，B 机 clone + `init --mode=local` + 继续生成；
- B 机显存小，machine.json overrides 降分辨率，A 机不受影响；
- 真实 ComfyUI 上 local 成功与 OOM 清理均可复现；
- 真实 NVIDIA 机器上开启 takeover：ollama/LM Studio/xinference 模型卸载并在任务后恢复；内置进程服务驱逐并重启；
- 文档与命令一致，`help --json` 反映新命令树。

---

## 12. 风险与待决

| 风险 | 处理 |
|---|---|
| 节点目录缓存过期 / custom nodes 变化 | 缓存记录引擎指纹；`workflow nodes --refresh` 重取；任务预检强制刷新 |
| 图类型校验不完整 | 有目录时做基础类型/枚举校验，只给 warning；最终以 ComfyUI 为准 |
| metadata session 在任务外启动引擎 | 仅 `workflow nodes --refresh` 显式触发；不加载模型、取完即停；严格零启动时只用缓存 |
| 跨机器/并发编辑冲突 | `workflow apply` 原子写；Git 合并；run 快照隔离；后续可加 `--expect-sha` |
| 删除节点产生断链 | `remove_node` 默认拒绝被引用节点，`force` 才删除关联连线 |
| 节点 ID 漂移 | 已创建节点 ID 保持稳定；`add_node` 自动分配只用于新节点，不重排旧节点 |
| OOM 识别不统一 | `/history` error + 引擎日志尾双通道；未知错误归 `run_failed` |
| remote `/free` 影响别人 | 默认 `when_idle`；专用服务器设 `always`；记录跳过原因 |
| LFS 配额 / 仓库膨胀 | 元数据必进 Git；二进制走 LFS；后续可换外部 artifact store |
| custom nodes 跨架构不可用 | 项目 pin repo+ref；`init` 安装；preflight 报缺节点，不自动装 |
| **同一设备并发任务** | `~/.dycli/machine.lock` 全局唯一；local/remote 都一样；第二个任务 `machine_busy`，不排队 |
| **worker / 锁 handoff 失败** | 前台预留锁、worker 接管 owner；spawn 失败立即释放；stale lock 由下一次 task 恢复 |
| **worker 崩溃** | task 标记 interrupted；machine lock / GPU lease / 残留引擎由下一次 task 恢复；不自动重跑 |
| **长任务超时** | 默认异步返回 task_id；`--wait` 才阻塞；Agent 用 `status --wait` 或轮询 |
| **重试重复提交** | `--request-id` 幂等；同一 key 返回已有 task |
| **无队列/背压** | 第二个任务立即 `machine_busy`；Agent 根据 owner/retry_after 重试，不排队 |
| **机器锁按 OS 用户隔离** | 同一 OS 用户生效；不同用户需要系统级锁，本轮不做 |
| **跨机器同步的任务状态** | task/run 带 `machine_id`；`status` 只把本机任务视为 active，其他机器任务放 `synced_running_tasks` |
| generic 驱逐不可完全逆 | 默认关闭；只动内置目标；只做 best-effort 重启；进程状态不保证恢复 |
| provider API/CLI 版本差异 | capability probe；优先 HTTP/CLI 可用路径；失败记 `gpu_takeover_failed`，恢复已接管部分 |
| systemd/Docker 管理的进程难恢复 | 优先用 provider API；generic 仅用于直接进程，文档说明限制 |
| GPU 接管平台限制 | 首版 Linux + NVIDIA；macOS/AMD/Windows 给 `gpu_unsupported` warning，继续任务 |
| GPU 租约残留 | 机器级租约；下一次 local 任务先恢复旧租约 |
| 误杀关键进程 | 永不驱逐 PID 1、自身祖先、显示管理器、sshd/systemd、内核线程、其他用户；默认只处理当前用户 |
| 内置目标列表可能漏掉新程序 | 未知进程不动；OOM 详情列出占用进程；升级 dycli 扩展 `GPU_TAKEOVER_TARGETS` |
| 内置进程服务重启失败 | 记录 `gpu_takeover_failed` / `gpu_restore_failed`；租约保留重试；文档说明 best-effort |
| Skill 与 CLI 漂移 | Skill 由 registry 生成，带版本/哈希；`skill update` 刷新；Skill 要求 Agent 以 `help --json` 为权威 |
| `AGENTS.md` 覆盖用户内容 | 只维护 `daoyan:skill` 标记块；无标记不写；重复执行幂等 |
| 部分 Agent 不读 `.agents` | 同时写 `AGENTS.md` 管理块；用户级安装后续再做 |
| Skill 文档过长 | SKILL.md 保持短；详细内容拆到 `reference/` 按需加载 |
| 生成文件进入 Git 后过期 | `status --json` 输出 Skill stale；`dycli update` 后提示 `skill update` |
| ComfyUI scratch 目录参数差异 | 优先 `--output-directory` 等参数；不支持则下载后清理默认目录 |
| 跨机器结果不一致 | 记录环境信息；明确只保证可追溯，不保证像素一致 |
| Windows 进程控制差异 | 本轮以 macOS/Linux 为主；Windows 后续单独处理 |

**本轮默认决策**

1. remote `free_after_task` 默认 `when_idle`；专用服务器改 `always`。
2. 不提供应急 `engine stop`；异常残留由下一次任务回收。
3. `run` / `shot` / `retake` / `batch` 默认异步；`--wait` 才阻塞。
4. 同一设备同一时刻只允许一个 generation task；local/remote 共用 `machine.lock`；第二个任务 `machine_busy`，不排队。
5. 多 run task（`shot/batch`）由一个 worker 串行执行，共用一次引擎会话。
6. `--request-id` 幂等；重试返回已有 task。
7. `--wait` 的 SIGINT 只停止等待，不取消 task；取消必须 `run cancel`。
8. GPU 接管默认关闭；开启后只操作代码内置目标，用户不需要配置白名单或阈值。
9. `init` 必须显式指定 `--mode`；在项目目录运行，不接收项目名。
10. `init` 默认生成项目内 `.agents/skills/daoyan/` 与 `AGENTS.md` 管理块；`--no-skill` 跳过。
11. 本轮不做用户级 Skill 安装；后续再扩展 target adapter。
12. 不兼容旧项目，不提供迁移。

---

## 13. 实施后的文档更新清单

| 文件 | 更新内容 |
|---|---|
| `README.md` | 定位改为“Agent 驱动的节点编辑器 + 执行运行时”；补充 `workflow` 编辑闭环、异步 task、机器级单任务、项目内 Agent Skill、GPU 接管 |
| `docs/PLAN.md` | 用本文替换总方案；删除 up/down/doctor/list/gpu 规划；加入节点编辑、异步 task worker、machine lock、GPU 接管、Agent Skill |
| `docs/COMMANDS.md` | 重写命令树：`init --mode`、`skill update`、`workflow` 命令族、异步 `run` / `run cancel`、`status --task/--run`、`logs --task/--run` |
| `docs/DATA-MODEL.md` | project.json v2（含 gpu.takeover）、machine.json、workflow 图模型、graph ops、node catalog、tasks、events.jsonl、runs、`.agents`/`AGENTS.md` |
| `docs/ERROR-CODES.md` | 新增 `engine_*` / `run_*` / `gpu_*` / `machine_busy` / `worker_*` / `skill_write_failed`，以及 retryable 分类 |
| `docs/AGENT-SKILL.md` | 新增：项目内 Skill 的目录、生成、版本、AGENTS.md 管理块、Agent 异步协议 |
| `src/commands/help.mts` | 自描述反映 `workflow`、`skill update`、异步 `run`、`status --task`、新命令树与完整 JSON schema |
