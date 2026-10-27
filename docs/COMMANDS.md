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
daoyan init --mode=local [--production single|series] [--modelpath <路径>] [--version <tag>] \
    [--mirror <镜像>] [--fallback-mirror <镜像|none>] [--torch-index <url>] [--torch-cuda <cuXXX>] [--torch-cpu] [--no-cache] [--no-skill] [--no-git]
daoyan init --mode=remote --url <url> [--production single|series] [--no-skill] [--no-git]
```

- `--mode` 必填；在当前目录工作，不接收项目名；`--production` 默认 `single`，可选 `series`；
- 默认维护 `.gitignore` 受管块并初始化 Git 仓库；位于父级仓库内时跳过嵌套初始化，不自动 commit；`--no-git` 只跳过仓库初始化；
- local 在创建骨架前检查 git / python3 >= 3.10 / ensurepip，缺失时明确报错，不留下半成品；
- local 部署 `engine/`（venv + ComfyUI + custom nodes）并生成 `extra_model_paths.yaml`；只部署不启动；
- init 自动探测 NVIDIA 驱动 / CUDA 上限 / compute capability，安装匹配的 torch（如 cu130），再装 requirements；不要手工安装 torch；
- pip 依赖默认使用阿里云 PyPI（`https://mirrors.aliyun.com/pypi/simple/`），失败自动回退官方 PyPI；`--mirror` / `--fallback-mirror` 可覆盖（`none` 关闭 fallback）；
- `--torch-index` 指定 PyTorch wheel index；`--torch-cuda` 强制 tag；`--torch-cpu` 显式 CPU 模式；
- 成功安装后写 `engine/.venv/.dycli-toolchain.json`；复用时要求 marker、`pip check` 与 CUDA 自检全部通过，否则重新安装；
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

## 剧本与设定（story）

story 布局：所有项目都使用 `story/` + `episodes/<id>/`。`production.mode=single` 只能一集，`series` 可多集。

```bash
daoyan story series show|set [--title <t>] [--synopsis <s>] [--genre <g>]

daoyan story episode add --id ep02 --number 2 --title "第二集" [--summary <s>]
daoyan story episode list|show|set|remove ...

daoyan story script sync --episode <id> --file <script.md|-> [--summary <s>] [--source ai|user|import]
daoyan story script show --episode <id> [--raw]
daoyan story script approve --episode <id>

daoyan story breakdown set --episode <id> --file <breakdown.json|->
daoyan story breakdown show --episode <id>

daoyan story characters set --file <characters.json|->
daoyan story scenes set --file <scenes.json|->
daoyan story voices set --file <voices.json|->

daoyan story asset add --owner <character:id|scene:id|voice:id> [--form <form>] --id <asset> \
    (--from <file>|--from-run <run> --output <name>) [--set-reference] [--replace]
daoyan story asset set-reference --owner <owner> [--form <form>] --id <asset>
daoyan story asset remove --owner <owner> [--form <form>] --id <asset> [--force]
daoyan story asset list
```

参考图删除规则：

- 删除当前主参考会自动改用剩余第一张；
- 角色 / 场景被任意剧集分镜引用时，至少保留一张图，不允许删空（`--force` 也不放行）；
- 资产被 `shots.json` 的 `asset_slots` / `scene_asset` 显式绑定时，需要 `--force` 才能删除。

daoyan story shots show --episode <id>
daoyan story shots set --episode <id> --file <shots.json|->

daoyan story map show --episode <id> [--raw]
daoyan story map build --episode <id> [--force]
daoyan story map set --episode <id> --file <story-map.json|-> [--source ai|user|import] [--base-sha256 <hash>]
daoyan story map clear --episode <id>

daoyan story status [--episode <id>]
daoyan story validate [--episode <id>] [--verify-hashes]
```

规则：

- 每集剧本独立 `revision` / 审批；剧本变化只让该集 `breakdown` / `shots` stale；
- 拆解是单集制作范围与允许清单；分镜只能使用拆解声明的角色 / 形态 / 场景 / 音色；
- 参考图 / 音频必须显式指定主参考（`--set-reference` 或 `asset set-reference`），不会自动取第一张；
- `production.audio=false` 时音色命令返回 `feature_disabled`，语音槽位会被忽略；
- `production.mode=single` 禁止 `story episode add`；多集切单视频前需先删到一集；
- 多集项目 `script sync` / `breakdown set` / `shots set` / `script show` / `breakdown show` / `shot` / `retake` / `batch` / `wrap` 必须带 `--episode`；单集可省略；legacy 不接受；
- `story status` 输出 stage / blockers / next_actions；`shot` / `batch` / `retake` 在 strict 模式按 blockers 阻断；
- `run` 不受剧情门禁限制，可用 `--episode` 只做归属标记；
- 工作流资产槽位见 `workflows/<name>.assets.json`，slot 的 `asset` 取 `reference` 或具体 asset id。
- `story map show --json` 是 AI 生成决策的主契约：返回每镜的角色 / 形态 / 场景 / 参考资产、workflow 候选、槽位解析、连续性、渲染状态与缺口；`story shots show --json` 用于读取完整分镜后修改。
- `story-map.json` 只保存叙事标注（标题 / 重要度 / 故事时间 / 关系）；结构事实始终以 `shots.json` 为准，不写入标注文件。

### story map

```bash
daoyan story map show --episode <id> [--raw] [--json]
daoyan story map build --episode <id> [--force] [--json]
daoyan story map set --episode <id> --file <story-map.json|-> [--source ai|user|import] [--base-sha256 <hash>] [--json]
daoyan story map clear --episode <id> [--json]
```

- `show`：输出合并后的剧情图谱与生成上下文；`--raw` 只输出标注文件；
- `build`：按当前 `shots.json` 生成标注骨架，保留已有叙事字段；
- `set`：校验并写入叙事标注；未知 `shot_id` / 未知关系端点会报 `story_invalid`；
- `clear`：删除标注文件，回到纯自动推导；
- 标注事件字段：`shot_id`、`title`、`summary`、`importance`（`major|normal|minor`）、`story_time`、`note`；关系字段：`from`、`to`、`kind`、`label`、`note`。

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
  [--label <label>] [--episode <id>] [--engine <url>] [--request-id <id>]
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

### run reassign

```bash
daoyan run reassign <run_id> --episode <id> [--shot <镜号>] [--source ai|user]
```

把 story 化之前（或手工 `run` 产出）的**未归属** run 挂到某一集的某个镜头：改写 `run.json` 的 `episode_id` 与 `label`，并写 `reassigned` 审计段。

- 镜号省略时从原 label `shot:<n>` 推导；label 是自定义值时必须给 `--shot`；
- 只处理 `episode_id` 为空的 run；已归属其它集的返回 `run_assigned`；归属完全一致时是幂等空操作；
- 目标镜号必须存在于该集 `shots.json`；
- `run.json` 默认不可变，这是显式例外之一（另一个是 `run output remove` 移除产物条目）；`task.json` 是历史执行记录，不改写（会在 `warnings` 里说明）；
- 迁移后该 run 才能被 `take finalize` 选为该镜定稿稿件，也会出现在该集分镜页；若根目录 `takes.json` 曾引用它，会提示需在新集重新定稿。

### run output remove

```bash
daoyan run output remove <run_id> <output>
```

删除 run 的单个产物文件（`runs/<id>/outputs/<output>`），并同步从 `run.json` 的 `outputs` 移除该条：

- 被 `takes.json` 定稿引用的产物会先自动撤销定稿，返回 `revoked_shots`；
- run 目录与其它产物保留；`task.json` 不改写；
- 产物不存在返回 `asset_not_found`。

### shot / retake / batch

```bash
daoyan shot <镜号...> [--episode <id>] [--steps N] [--request-id <id>] [--allow-incomplete] [--wait] [--timeout <小时>]
daoyan retake <镜号...> [--episode <id>] [--steps N] [--request-id <id>] [--allow-incomplete] [--wait]
daoyan batch [--episode <id>] [--request-id <id>] [--allow-incomplete] [--wait] [--timeout <小时>]
```

- story 模式：多集必须显式 `--episode`；单集可省略；`shot/batch/retake` 先过剧情门禁；
- 一个 task 多个 run，共享一次引擎会话与一把机器锁；
- 已有成功 run 的镜头跳过；`retake` 强制；
- 需要 `workflows/<name>.bindings.json`（至少映射 `prompt`、`seed`）；
- 首帧：锚点 key（`meta.anchors`）或 `{"relay":"01"}`（自动抽上游镜头**定稿稿件**的尾帧；未定稿时按 `story.enforce` 回退或阻断）；
- 中途 OOM / 引擎崩溃 / 不可达：中断整个 task；普通业务错误继续后续镜头，最终 task `failed`。

### take（镜头定稿）

```bash
daoyan take list [镜号...] [--episode <id>]
daoyan take finalize <镜号> --run <run_id> [--output <稿件名>] [--note <文本>] [--source ai|user] [--episode <id>]
daoyan take revoke <镜号> [--episode <id>]
```

- 一个镜头重拍多次后，用 `take finalize` 把其中一条视频产物定为该镜头的**定稿稿件**；其余产出只是附加产物；
- 定稿写入 `takes.json`（story 模式在 `episodes/<id>/`），run 记录保持不可变；
- 校验：run 必须是本镜本集的 `succeeded` run，稿件必须是该 run 的视频产物且在工作区（`take_invalid`）；
- 定稿稿件是两个下游的唯一来源：接力首帧的上游尾帧、`wrap` 的合片片段；
- `take list` 给出每镜候选稿件、定稿标记与 `take_pending` / `take_stale` 状态。

### wrap

```bash
daoyan wrap [--episode <id>] [--shots <镜号,...>] [--select <镜号>=<run_id> ...] [--allow-incomplete]
```

按镜头顺序选**定稿稿件**（`--select` 可临时改选，不落台账），ffmpeg concat 到 `final/<episode>/cut-<timestamp>.mp4`（legacy 为 `final/cut-*`），并写 manifest。不占 machine lock。

- 选段优先级：`--select` > 定稿稿件 > 最新成功 run；
- `--shots` 只合指定镜号（仍按 shots.json 顺序），且要求每镜都有可用定稿稿件；缺稿返回 `take_pending`；
- `project.story.enforce=strict` 时，有产出但未定稿的镜头阻断合片（`take_pending`）；`--allow-incomplete` 或 `warn` / `off` 回退最新成功 run 并记 warning；
- 清单 `clips[].source` 记录每段来源：`finalized` / `latest` / `explicit`。

## 运维

### status

```bash
daoyan status [--episode <id>] [--json]
daoyan status --task <id> [--wait] [--timeout <秒>] [--json]
daoyan status --run <id> [--wait] [--timeout <秒>] [--json]
```

默认快照（不启动引擎）：mode、引擎探测、queue、machine lock owner、active task（本机）、`synced_running_tasks`（其他机器）、最近任务、GPU/租约、Skill stale、镜头进度。story 模式额外返回 `series` / `episodes`；`--episode` 返回单集 status / blockers / shots。

### logs

```bash
daoyan logs [-f] [-n N] [--task <id> | --run <id>] [--json]
daoyan logs [-f] [-n N] [--src daoyan-cli|engine|worker|all]
```

任务模式读 `tasks/<id>/events.jsonl`；文件模式读 `logs/` 下最新 engine/worker/工具日志。`-f` 跟随到 task 终态。

### web

```bash
daoyan web [--port <n>] [--host <addr>] [--open] [--json]
```

启动 Web UI（默认 `0.0.0.0` + 系统随机端口，局域网可访问；仅本机访问传 `--host 127.0.0.1`），查看项目档案、分镜、人物/场景、任务、工作流、run 产出物与 final 成片；视频支持拖动进度。

- story 模式：系列概览、剧集切换、单集剧本/拆解/分镜/成片、全局角色/场景/音色/资产；
- legacy 模式：镜头/人物/场景/产出统计、剧情简介与分镜一览；
- 分镜页展示每镜内容、人物、场景、生成参数、全部历史产物与 run 历史，并支持筛选；定稿稿件置顶并标记；
- 不启动引擎、不占 machine lock、不触发任何生成；唯一的写能力是镜头定稿（`POST /api/takes/finalize|revoke`，只写 `takes.json`），分镜页每条视频稿件可点「定稿 / 撤销定稿」；
- `Ctrl+C` / `SIGTERM` 优雅关闭；`--json` 输出一次启动信封后继续驻留；
- `.dycli/machine.json` 缺失时仍可查看共享数据；
- 媒体仅从 `run.outputs`、`final/` 与 `story/assets/` 白名单读取，支持 HTTP Range；
- 详细 API/安全说明见 [WEB.md](WEB.md)。

## 引擎

```bash
daoyan engine ls
daoyan engine install <tag> [--mirror <url>] [--fallback-mirror <url|none>] \
    [--torch-index <url>] [--torch-cuda <cuXXX>] [--torch-cpu] [--no-cache]
daoyan engine use <tag|路径>
```

- local 专属；`install` 安装到 `engine/versions/<tag>/`，`use` 更新本机 machine 配置；
- `install` 与 init 共用工具链逻辑：先按驱动安装 torch，再装 requirements；默认阿里云 PyPI，失败回退官方；
- `install` 复用时同样要求 marker + `pip check` + 自检通过；
- 两个命令都持 machine lock，忙时 `machine_busy`。

## 元

```bash
daoyan help [命令] [--json]
daoyan update [--check] [--manifest <url|路径>] [--from <路径|URL>] [--sha256 <hex>] \
    [--proxy <url>] [--github-proxy <url[,url]|none>]
daoyan update source [<latest.json|url>|--unset]
daoyan update proxy [<url>|--unset]
```

- 默认源：GitHub Release `latest.json`（`https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/latest.json`）+ 预构建 tgz，校验 SHA-256 后安装；
- **直连 GitHub 失败时自动尝试内置加速源**（`https://gh-proxy.com`、`https://gh.llkk.cc`），只对 `github.com` URL 生效；成功后会提示 `via_proxy`；
- 清单直连失败时会从多个加速源读取，并要求 `version/tgz/sha256` 完全一致才继续；tgz 无论来自直连还是加速源都必须通过 SHA-256；
- 已配置 HTTP 代理（`--proxy` / `DYCLI_UPDATE_PROXY` / 标准代理环境变量）时，默认不再叠加第三方加速源；
- `--github-proxy <url[,url]>` 指定加速源；`--github-proxy none` 或 `DYCLI_UPDATE_GITHUB_PROXY=none` 关闭；
- 默认清单不可达时回退 GitHub tags + `npm pack git+…`（旧版本兼容路径）；npm 若从 HTTPS 静默回退 SSH，错误中会提示改用 manifest；
- 自定义源：`latest.json` + 预构建 tgz；显式配置的清单不可达时不会回退 GitHub（避免绕过用户选择）；
- `update source` / `update proxy` 持久化到 `~/.dycli/update.json`（0600）；
- 一次性覆盖：`--manifest`、`--from`、`--sha256`、`--proxy`、`--github-proxy`；
- 环境变量：`DYCLI_UPDATE_MANIFEST` / `DYCLI_UPDATE_FROM` / `DYCLI_UPDATE_SHA256` / `DYCLI_UPDATE_PROXY` / `DYCLI_UPDATE_GITHUB_PROXY`；
- 未配置 dycli 代理时也兼容标准 `HTTPS_PROXY` / `ALL_PROXY`；
- 远程 `--from` 必须提供 `--sha256`；远程 manifest 的 tgz 必须有 `sha256`；
- 自定义 manifest 不可达时不会回退 GitHub（避免绕过用户选择）：`--check` 返回 `note`，安装时报 `update_failed`；
- 配置代理时下载走 `curl`（Node fetch 默认不读代理环境变量）。

`latest.json`：

```json
{
  "schema_version": 1,
  "version": "0.0.4",
  "tag": "v0.0.4",
  "tgz": "daoyan-cli-0.0.4.tgz",
  "sha256": "<64 hex>"
}
```

`help --json` 包含：capabilities、modes、命令 args/flags/examples/output、错误目录（retryable/hint）、project/machine/workflow/bindings/graph_ops/task/run 的 JSON Schema、项目 Skill 状态。
