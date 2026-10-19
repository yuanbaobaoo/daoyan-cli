# daoyan-cli 总方案（v0.1）

> 设计基线：[REFACTOR.md](REFACTOR.md)。本文是 v0.1 实施后的架构摘要；两者冲突时以 REFACTOR.md 与代码为准。

## 1. 定位

dycli 是**面向 AI Agent 的程序化 ComfyUI 节点编辑器兼执行运行时**：

- Agent 通过 `workflow` 命令族查询节点、编辑图、校验；
- dycli 负责 local 引擎生命周期、远程 HTTP 访问、任务调度、GPU 接管、产物与版本留档；
- 不实现图形 canvas；节点编辑是核心能力。

## 2. 核心模型

```text
task（可调度执行单元，异步）
  └── run × N（每个 run = 一次 workflow 提交，不可变快照）
        └── outputs（runs/<run_id>/outputs）
```

- `run`：一个 task，一个 run；
- `shot 01 02` / `batch`：一个 task，多个 run，串行复用一次引擎会话；
- 同一设备同一时刻只允许一个 generation task（`~/.dycli/machine.lock`，local/remote 共用）。

## 3. 两种模式

| 维度 | local | remote |
|---|---|---|
| 引擎 | 项目内 `engine/`，init 部署 | 外部服务 |
| 启动 | task 开始 spawn | 不启动 |
| 停止 | task 结束 SIGTERM/SIGKILL | 不停止 |
| 释放 | 始终 `/free` + 停止 | 按 `free_after_task` 策略 `/free` |
| GPU 接管 | `project.json.gpu.takeover` 生效 | 忽略 |
| 访问 | HTTP | HTTP（完全相同） |

唯一例外：`workflow nodes --refresh` 在 local 会启动 metadata session（不加载模型、取完 `/object_info` 立即停止），也占机器锁。

## 4. 关键决策

1. **任务级引擎生命周期**：没有常驻引擎，没有 `up/down`。
2. **异步 task worker**：detached worker 持有机器锁，负责启动、执行、cleanup、释放；CLI 默认只返回 `task_id`。
3. **机器级单任务**：第二个任务 `machine_busy`，不排队；worker 崩溃由下一次任务 stale 恢复。
4. **幂等**：`--request-id` 返回已有 task。
5. **默认 JSON**：非 TTY 输出信封；人类文本只是渲染层；`help --json` 是机器契约。
6. **项目内 Skill**：`init` 生成 `.agents/skills/daoyan/` + `AGENTS.md` 管理块。
7. **Git 即版本系统**：工作流/记录可 diff；run 快照不可变；二进制走 LFS。
8. **GPU 接管只碰内置目标**：用户只配置一个布尔开关。

## 5. 数据与目录

```text
project.json                 共享（name/version/default_workflow/gpu.takeover/comfyui pin）
workflows/*.json             共享（ComfyUI API JSON）
workflows/*.bindings.json    共享（逻辑输入 -> nodeId.input，shot recipe 用）
shots.json                   共享（recipe）
tasks/<task_id>/             共享（task.json + events.jsonl）
runs/<run_id>/               共享（run.json/workflow.json/inputs.json/inputs/outputs）
final/                       共享（cut-*.mp4 + manifest）
.agents/skills/daoyan/       共享（Agent Skill）
AGENTS.md                    共享（管理块）
.dycli/machine.json          本机（模式/模型路径/端口/覆盖）
engine/ logs/                本机
```

## 6. 命令树

```text
init / validate / skill update
workflow new|import|list|show|nodes|node|apply|set|validate
run / run cancel / shot / retake / batch / wrap
status / logs
engine ls|install|use
help / update
```

详见 [COMMANDS.md](COMMANDS.md)。

## 7. 里程碑状态

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M1 基础层 | 配置 v2、图模型/ops/catalog、run store、mock server | ✅ v0.1 |
| M2 引擎会话 | local/remote session、machine lock、task worker、GPU 租约/接管 | ✅ v0.1（真实 GPU 接管待 Linux 验收） |
| M3 命令层 | init/workflow/run/shot/batch/wrap/status/logs/skill、Agent 契约 | ✅ v0.1 |
| M4 可移植 | 真实 ComfyUI/GPU E2E、跨机器实操、文档 | 🚧 文档已重写；真实环境验收待执行 |

## 8. 非目标

- 图形化 canvas；
- 任务队列/并行执行；
- 驱逐内置目标之外的进程；
- 用户级 Skill 安装；
- 旧项目迁移与像素级跨机器复现。
