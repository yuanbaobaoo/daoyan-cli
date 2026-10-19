# daoyan-cli（dycli）

**Agent 驱动的 ComfyUI 节点编辑器 + 执行运行时。** 剧本进，成片出；但真正的第一公民是 AI Agent。

dycli 把 ComfyUI 包装成一套机器契约：

- **节点编辑**：`workflow` 命令族查询节点目录、增删节点、连接端口、设置参数、校验图；
- **执行运行时**：`run` / `shot` / `batch` 以异步 task 执行，自动管理 local 引擎生命周期、GPU 接管与产物落盘；
- **版本管理**：工作流、任务、run 快照全部是可进 Git 的 JSON；二进制产物走 Git LFS；
- **Agent 契约**：非 TTY 默认 JSON 信封、稳定错误码、`retryable` / `next_actions`、`help --json` 自描述、项目内 Agent Skill。

> 设计基线：[docs/REFACTOR.md](docs/REFACTOR.md)。命令参考：[docs/COMMANDS.md](docs/COMMANDS.md)。

## 安装

要求 Node ≥ 22（含 npm）与 git；local 模式另需 Python ≥ 3.10。

```bash
# 一键脚本（直接从 GitHub 安装）
curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash

# 或 npm 直装 GitHub 仓库
npm i -g git+https://github.com/yuanbaobaoo/daoyan-cli.git
```

`daoyan` 与 `dycli` 完全等价。升级：`daoyan update`。

## 快速开始

### local：项目专属 ComfyUI

```bash
mkdir demo && cd demo
daoyan init --mode=local --modelpath /data/models

# Agent 编辑闭环
daoyan workflow nodes --refresh --json
daoyan workflow new t2v
daoyan workflow apply t2v --ops ./ops.json --json
daoyan workflow validate t2v --json

# 执行（默认异步）
daoyan run t2v --label shot:01 --request-id shot-01 --json
daoyan status --task <task_id> --wait --json
```

local 引擎**只在任务期间存在**：任务开始拉起 ComfyUI，结束（成功/失败/OOM/取消）立即 `/free` 并停止进程。`init` 只部署，不启动。

### remote：连接已有 ComfyUI

```bash
daoyan init --mode=remote --url http://gpu-box:8188
daoyan run t2v --label shot:01 --json
```

remote 模式只走 HTTP（`/system_stats`、`/object_info`、`/upload/image`、`/prompt`、`/history`、`/view`、`/free`、`/interrupt`），**永不启动/停止/杀远端进程**；任务结束按 `free_after_task` 策略卸载模型。

## 核心约定

### 同一设备，同一时刻，只允许一个 generation task

`~/.dycli/machine.lock` 是全局机器锁，local 与 remote 共用：

- 第二个任务立即返回 `machine_busy`（带 owner、`retry_after_ms`、`next_actions`），不排队；
- worker 崩溃后，下一次任务自动做 stale 恢复（标记 `interrupted`、回收残留引擎、恢复 GPU 租约）；
- `wrap` 是 CPU 后处理，不占锁。

### 异步 task

`run` / `shot` / `retake` / `batch` 默认返回 `task_id`；退出码 0 只代表任务已创建：

```bash
daoyan run t2v --json                    # → task_id
daoyan status --task <id> --wait --json  # 等终态
daoyan logs --task <id> -f --json        # 事件流
daoyan run cancel <id>                   # 取消（interrupt → free → stop → restore）
```

`--request-id` 保证幂等：重试返回同一个 task。`--wait` 的 SIGINT 只停止等待，不会取消任务。

### GPU 接管（可选）

`project.json` 里一个开关：

```json
{ "gpu": { "takeover": true } }
```

local 任务开始前自动卸载/驱逐代码内置的目标，任务后恢复：

- 模型服务：ollama、LM Studio、xinference —— 卸载模型，保留进程；
- 进程服务：vLLM、TGI、llama.cpp server、SGLang —— SIGTERM/SIGKILL，任务后 best-effort 重启；
- 未知进程永不处理；默认关闭；Linux + NVIDIA 生效，其他平台 `gpu_unsupported` 警告后继续。

### 版本管理

- 工作流真源：`workflows/*.json`；Git 就是版本系统；
- 每次执行生成不可变 `runs/<run_id>/`（`run.json`、`workflow.json`、`inputs.json`、`inputs/`、`outputs/`）；
- 产物走 Git LFS；记录不含绝对路径；
- `wrap` 按镜头选最新成功 run，写 `final/cut-<timestamp>.mp4` + 清单。

### 项目内 Agent Skill

`init` 默认生成 `.agents/skills/daoyan/`（SKILL.md + reference/*）并写入 `AGENTS.md` 管理块；`--no-skill` 可跳过。Skill 由命令 registry 生成，`daoyan skill update` 刷新，`status --json` 报告 stale。

## 项目布局

```text
demo/
├── project.json              # 共享：ComfyUI pin / custom nodes / gpu.takeover
├── workflows/                # 共享：API JSON + *.bindings.json
├── shots.json                # 共享：shot/batch recipe
├── tasks/<task_id>/          # 共享：task.json + events.jsonl
├── runs/<run_id>/            # 共享：不可变 run 快照与产物
├── final/                    # 共享：合片（LFS）
├── .agents/skills/daoyan/    # 共享：项目内 Agent Skill
├── AGENTS.md                 # 共享：带 daoyan 管理块
├── .dycli/machine.json       # 本机：模式/模型路径/端口/覆盖（不提交）
├── engine/                   # 本机：ComfyUI + venv（不提交）
└── logs/                     # 本机（不提交）
```

## 命令一览

```text
init / validate / skill update
workflow new|import|list|show|nodes|node|apply|set|validate
run / run cancel / shot / retake / batch / wrap
status / logs
engine ls|install|use
help / update
```

完整参数、flags、JSON 形状与示例见 [docs/COMMANDS.md](docs/COMMANDS.md)；机器契约见 `daoyan help --json`。

## 文档

- [docs/COMMANDS.md](docs/COMMANDS.md) —— 命令与异步协议
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md) —— 配置、图、task、run 数据模型
- [docs/ERROR-CODES.md](docs/ERROR-CODES.md) —— 错误码与恢复矩阵
- [docs/AGENT-SKILL.md](docs/AGENT-SKILL.md) —— 项目内 Skill 与 AGENTS.md
- [docs/PLAN.md](docs/PLAN.md) —— 架构总览与里程碑
- [docs/REFACTOR.md](docs/REFACTOR.md) —— 重构设计基线

## 开发

```bash
npm install
npm run typecheck
npm test          # node:test + 假 ComfyUI HTTP server
npm run build     # dist/ 随仓库分发
```

License: Apache-2.0
