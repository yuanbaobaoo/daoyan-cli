# 命令参考（v0.1）

> 机器可读权威：`daoyan help --json`。非 TTY 默认输出 JSON 信封；`--no-json` 强制人类文本。

## 全局参数

| 参数 | 说明 |
|---|---|
| `--json` | 输出 `{ok,schema_version,data}` / 失败信封 |
| `--no-json` | 强制人类文本（覆盖非 TTY 默认） |
| `--project <路径>` | 指定项目目录（默认自 cwd 向上寻找 `project.json`） |
| `--no-color` | 关闭颜色 |
| `-h/--help` | 总览或 `daoyan help <命令>` |
| `-v/--version` | 版本 |

环境变量：`DYCLI_OUTPUT=json|text` 可覆盖默认输出模式。

## 退出码

| code | 含义 |
|---|---|
| 0 | 成功；异步 task 仅表示**已创建** |
| 1 | 业务失败 / task 失败 |
| 2 | 用法错误 |
| 130 | 取消，或 `--wait` 被 SIGINT 中断 |

## 异步协议

`run` / `shot` / `retake` / `batch` 默认异步：

```bash
daoyan run t2v --json
# → {task_id, state:"queued", runs:[], events_path, next_actions, ...}

daoyan status --task <task_id> --wait --json
daoyan logs --task <task_id> -f --json
daoyan run cancel <task_id> --json
```

- 同一设备只允许一个 generation task；忙时 `machine_busy`（含 owner / `retry_after_ms`）；
- `--request-id <id>` 幂等；
- `--wait` 的 SIGINT 只停止等待，不取消任务；
- `--wait` 结束失败时仍返回 task 数据（`state` / `error` / `runs_detail`），退出码为 1；取消为 130；
- 终态：`succeeded|failed|cancelled|interrupted`。

## 项目

### init

```bash
daoyan init --mode=local [--modelpath <路径>] [--version <tag>] [--mirror <镜像>] [--no-skill]
daoyan init --mode=remote --url <url> [--no-skill]
```

- `--mode` 必填；在当前目录工作，不接收项目名；
- local 部署 `engine/`（venv + ComfyUI + custom nodes）并生成 `extra_model_paths.yaml`；只部署不启动；
- 已有 `project.json`：不覆盖共享文件，只更新本机 `.dycli/machine.json`；
- 默认生成 `.agents/skills/daoyan/` 与 `AGENTS.md` 管理块；
- local 的部署期间持有 machine lock。

### validate

```bash
daoyan validate --json
```

离线校验 project/machine、workflows、bindings、machine overrides、shots（锚点/接力/seed/尺寸）、引擎目录、Skill stale。输出 `issues[]: {path,code,severity,message,hint}`。

### skill update

```bash
daoyan skill update --json
```

按当前 registry 重新生成项目内 Skill 与 `AGENTS.md` 管理块；幂等，不覆盖用户内容。

## 工作流

```bash
daoyan workflow new <name>
daoyan workflow import <api.json> --name <name>
daoyan workflow list
daoyan workflow show <name> [--full] [--node <id>]
daoyan workflow nodes [--filter <文本>] [--refresh] [--limit N] [--cursor <c>] [--fields <list>]
daoyan workflow node <class_type>
daoyan workflow apply <name> --ops <ops.json|->
daoyan workflow set <name> <nodeId>.<input> <value>
daoyan workflow validate <name>
```

- `nodes` 默认读 `.dycli/node_catalog.json`；缺失时 remote 自动拉取，local 需要 `--refresh`；
- `new` / `import` 可覆盖 `init` 生成的空图占位（`{}`），非空图不会被覆盖；
- `--refresh` 在 local 启动 metadata session（不加载模型、取完即停），占 machine lock；
- `apply` 支持 `add_node / set_input / connect / disconnect / remove_node / replace_graph`，先全量校验再原子写盘；
- 值按 JSON 解析：`42` → number，`true` → boolean，`[1,2]` → array，失败按字符串；
- 不提供 `workflow save`：写盘即保存，Git 负责版本。

## 执行

### run

```bash
daoyan run <workflow.json|name>
  [--set nodeId.input=value | --set logical=value ...]
  [--label <label>] [--engine <url>] [--request-id <id>]
  [--wait] [--dry-run] [--timeout <小时>]
```

- 默认异步；`--wait` 等待终态并映射退出码；
- `--set` 优先 `nodeId.input`，有 bindings 时也可用逻辑名；
- `--engine` 单次 remote 覆盖（仍占本机 machine lock）；
- `--dry-run` 不占锁、不启动引擎，输出图哈希/inputs/overrides/上传计划；
- `--request-id` 幂等。

### run cancel

```bash
daoyan run cancel <task_id>
```

worker 执行 `/interrupt` → `/free` → local 停止 → GPU 恢复，写 `cancelled`；worker 已死则 stale 恢复并标记 `interrupted`。

### shot / retake / batch

```bash
daoyan shot <镜号...> [--steps N] [--request-id <id>] [--wait] [--timeout <小时>]
daoyan retake <镜号...> [--steps N] [--request-id <id>] [--wait]
daoyan batch [--request-id <id>] [--wait] [--timeout <小时>]
```

- 一个 task 多个 run，共享一次引擎会话与一把机器锁；
- 已有成功 run 的镜头跳过；`retake` 强制；
- 需要 `workflows/<name>.bindings.json`（至少映射 `prompt`、`seed`）；
- 首帧：锚点 key（`meta.anchors`）或 `{"relay":"01"}`（自动抽上游成功 run 的尾帧）；
- 中途 OOM / 引擎崩溃 / 不可达：中断整个 task；普通业务错误继续后续镜头，最终 task `failed`。

### wrap

```bash
daoyan wrap [--select <镜号>=<run_id> ...]
```

按镜头顺序选最新成功 run（或显式 `--select`），ffmpeg concat 到 `final/cut-<timestamp>.mp4`，并写 `cut-<timestamp>.json` 清单。不占 machine lock。

## 运维

### status

```bash
daoyan status [--json]
daoyan status --task <id> [--wait] [--timeout <秒>] [--json]
daoyan status --run <id> [--wait] [--timeout <秒>] [--json]
```

默认快照（不启动引擎）：mode、引擎探测、queue、machine lock owner、active task（本机）、`synced_running_tasks`（其他机器）、最近任务、GPU/租约、Skill stale、镜头进度。

### logs

```bash
daoyan logs [-f] [-n N] [--task <id> | --run <id>] [--json]
daoyan logs [-f] [-n N] [--src daoyan-cli|engine|worker|all]
```

任务模式读 `tasks/<id>/events.jsonl`；文件模式读 `logs/` 下最新 engine/worker/工具日志。`-f` 跟随到 task 终态。

## 引擎

```bash
daoyan engine ls
daoyan engine install <tag>
daoyan engine use <tag|路径>
```

- local 专属；`install` 安装到 `engine/versions/<tag>/`，`use` 更新本机 machine 配置；
- 两个命令都持 machine lock，忙时 `machine_busy`。

## 元

```bash
daoyan help [命令] [--json]
daoyan update [--check]
```

`help --json` 包含：capabilities、modes、命令 args/flags/examples/output、错误目录（retryable/hint）、project/machine/workflow/bindings/graph_ops/task/run 的 JSON Schema、项目 Skill 状态。
