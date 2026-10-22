# 数据模型（v0.1）

> 原则：共享记录不含绝对路径；本机路径只出现在 `.dycli/machine.json`。

## 1. 目录布局

```text
project.json                 # 共享：项目配置 v2
workflows/<name>.json        # 共享：ComfyUI API JSON
workflows/<name>.bindings.json
shots.json                   # 共享：shot/batch recipe
takes.json                   # 共享：镜头定稿台账（legacy 项目在根目录）
tasks/<task_id>/task.json    # 共享：任务状态
tasks/<task_id>/events.jsonl # 共享：结构化事件
runs/<run_id>/run.json       # 共享：不可变运行记录
runs/<run_id>/workflow.json  # 共享：实际提交的图快照
runs/<run_id>/inputs.json    # 共享：逻辑输入 + 输入文件哈希
runs/<run_id>/inputs/        # 共享：输入副本（LFS）
runs/<run_id>/outputs/       # 共享：引擎产物（LFS）
final/cut-*.mp4|.json        # 共享：合片
.agents/skills/daoyan/       # 共享：Agent Skill
AGENTS.md                    # 共享：daoyan 管理块
.dycli/machine.json          # 本机（gitignored）
.dycli/node_catalog.json     # 本机：节点目录缓存
.dycli/extra_model_paths.yaml
engine/                      # 本机：ComfyUI + venv
logs/                        # 本机
relay_frames/                # 本机：接力尾帧缓存
```

## 1.1 story 模式（多集）

`daoyan story init` 启用后，项目增加：

```text
story/series.json                 系列标题 / 简介 / 类型
story/characters.json             全局角色、形态、音色关联
story/scenes.json                 全局场景
story/voices.json                 全局音色
story/assets/**                   参考图 / 音频（LFS）
episodes/<id>/episode.json        剧集元数据（id / number / title）
episodes/<id>/script.md|json      单集剧本与 revision / 审批
episodes/<id>/breakdown.json      单集拆解（制作范围与允许清单）
episodes/<id>/shots.json          单集分镜
episodes/<id>/takes.json          单集定稿台账（每镜至多一份定稿稿件）
episodes/<id>/story-map.json      可选：剧情图谱叙事标注（标题 / 重要度 / 故事时间 / 关系）
final/<episode-id>/cut-*          单集成片
```

- 角色 / 场景 / 音色 / 资产是系列级，跨集共享；新形态加 `form`，新地点加 `scene`；
- `breakdown.json` 的 `characters[].forms` / `scenes[]` / `voices[]` 是本集允许清单；
- 分镜引用拆解内的对象；`characters` 支持 `"id"`、`"id/form"`、`{id,form}`；
- 每个被使用的形态 / 场景 / 音色必须有显式 `reference_asset`；不存在自动取第一张；
- 每集 `script.json.revision` 独立；`breakdown.source_revision` / `shots.meta.script_revision` 用于 stale 检测；
- task/run 增加 `episode_id`（legacy / 系列级为 null）；多集 label 为 `ep:<id>:shot:<shot-id>`；
- `run` 可选 `--episode` 归属；`shot` / `batch` / `retake` / `wrap` 多集必须显式；
- 完整需求和契约见 [REQUIREMENTS.md](REQUIREMENTS.md)。

#### story-map.json（可选叙事标注）

`episodes/<id>/story-map.json` 只保存叙事信息；时间、场景、角色、形态、资产、workflow 槽位与 run 状态都由 dycli 实时推导，**不写入该文件**。

```json
{
  "version": 1,
  "episode_id": "ep01",
  "author": "ai",
  "updated_at": "2026-10-21T12:00:00.000Z",
  "source": {
    "script_revision": 3,
    "script_sha256": "<sha256>",
    "breakdown_sha256": "<sha256>",
    "shots_sha256": "<sha256>"
  },
  "events": [
    {
      "shot_id": "03",
      "title": "徽章上的编号",
      "summary": "林默在积水里捡到徽章。",
      "importance": "major",
      "story_time": "第一夜 21:40",
      "note": ""
    }
  ],
  "relations": [
    { "from": "lin-mo", "to": "a-lan", "kind": "ally", "label": "旧识" }
  ],
  "notes": ""
}
```

- `events[].shot_id` 必须存在于本集 `shots.json`；允许只标注部分镜头；
- `importance` 取 `major` / `normal` / `minor`；未标注时由 dycli 推导（场景切换为 major、空镜为 minor）；
- `relations[].from` / `to` 必须是全局角色 id，不能自引用；
- 结构字段（`at_seconds` / `scene_id` / `characters` 等）不写入该文件；需要修改结构时改 `shots.json`；
- 写入统一走 `daoyan story map set`，读取合并走 `daoyan story map show`；Web 只读。

#### takes.json（镜头定稿台账）

一个镜头会因重拍产生多条视频，其中只有一份进入工作流。`takes.json` 只记录**决定**：某镜选定哪条 run 的哪个稿件；候选清单永远从 `runs/` 实时推导，不双写。

```json
{
  "version": 1,
  "episode_id": "ep01",
  "updated_at": "2026-10-22T12:00:00.000Z",
  "shots": [
    {
      "shot_id": "03",
      "finalized": {
        "run_id": "20261022T113012-mac-7f3a",
        "output": "03_badge.mp4",
        "sha256": "<sha256>",
        "note": "雨势与走位都对",
        "source": "user",
        "finalized_at": "2026-10-22T11:40:00.000Z"
      },
      "history": [
        { "action": "finalize", "run_id": "20261022T113012-mac-7f3a", "output": "03_badge.mp4", "source": "user", "at": "..." },
        { "action": "replace", "run_id": "20261022T115004-mac-91b2", "output": "03_badge_v2.mp4", "source": "ai", "at": "..." }
      ]
    }
  ]
}
```

- 一镜至多一份 `finalized`；未定稿的产出只是附加产物，不进入下游；`finalized: null` 表示已撤销；
- `source` 取 `ai`（CLI/Agent）或 `user`（人工、Web）；`history` 每镜保留最近 10 条；
- `sha256` 是定稿时产物内容的快照，用于审计与漂移检测；选稿不做内容重算，只做存在性校验；
- 写入只走 `daoyan take finalize|revoke`（以及 `dycli web --allow-write` 的定稿接口），不手工编辑；
- **消费点**：接力首帧抽上游定稿稿件的尾帧（`plans.mts`）、合片按定稿稿件选段（`wrap`）、状态与图谱以定稿稿件为准；
- 回退策略按 `project.story.enforce`：`strict` = 有产出但未定稿的镜头阻断接力与合片（`take_pending`，可用 `--allow-incomplete` 绕过）；`warn` / `off` = 回退最新成功 run 并记 warning；
- 定稿记录指向的 run 被删除、状态非 succeeded、稿件改名或产物不在工作区时判为失效（`take_stale`），按上面的回退策略处理，需重新定稿；
- 不含绝对路径；legacy 项目落在根目录 `takes.json`，`episode_id` 为 `null`。

## 2. project.json（共享）

```json
{
  "name": "demo",
  "version": 2,
  "default_workflow": "workflows/t2v.json",
  "gpu": { "takeover": false },
  "comfyui": {
    "version": "v0.3.40",
    "custom_nodes": [
      { "name": "ComfyUI-VideoHelperSuite", "repo": "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git", "ref": "v1.7.4" }
    ]
  }
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 项目名（init 用目录名） |
| `version` | 是 | 固定 `2` |
| `default_workflow` | 否 | shot recipe 的兜底 workflow |
| `story.enforce` | 否 | story 门禁策略：`strict`（默认）/ `warn` / `off` |
| `gpu.takeover` | 否 | 项目级 GPU 接管开关，默认 false |
| `comfyui.version` | 否 | local 部署/切换的 ComfyUI pin |
| `comfyui.custom_nodes` | 否 | 安装到 `engine/ComfyUI/custom_nodes/` |

不包含：模型三件套、输出前缀、GPU 白名单/阈值、节点检查列表。

## 3. .dycli/machine.json（本机）

local：

```json
{
  "machine_id": "mac-studio",
  "engine": {
    "mode": "local",
    "modelpath": "/data/models",
    "models_config": null,
    "port": 8188,
    "launch_extra": ["--lowvram"],
    "comfyui_version": "v0.3.40",
    "comfyui_dir": "engine/ComfyUI",
    "venv_dir": "engine/.venv"
  },
  "overrides": {
    "workflows/t2v.json": { "5.width": 512, "5.height": 768, "7.steps": 20 }
  }
}
```

remote：

```json
{
  "machine_id": "mac-studio",
  "engine": { "mode": "remote", "url": "http://gpu-box:8188", "free_after_task": "when_idle" }
}
```

- `free_after_task`：`always` / `when_idle`（默认）/ `never`；
- `overrides` 按 workflow 相对路径索引，值形如 `"nodeId.input": value`；
- 优先级：workflow 文件 < machine overrides < `--set`；
- `comfyui_dir` / `venv_dir` 可省略，默认 `engine/ComfyUI` / `engine/.venv`。

## 4. 工作流图

ComfyUI API JSON，不包装：

```json
{
  "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "sdxl.safetensors" } },
  "6": { "class_type": "CLIPTextEncode", "inputs": { "text": "a cat", "clip": ["4", 1] } }
}
```

- 顶层 key = 节点 ID；
- 连线 = `[sourceNodeId, outputIndex]`；
- 节点 ID 创建后保持稳定；
- `workflow apply` 全量校验后原子写盘。

### bindings

`workflows/<name>.bindings.json`：

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

shot/batch 必须有 bindings，至少映射 `prompt` 与 `seed`；`run` 不强制。

### 节点目录缓存

`.dycli/node_catalog.json`：

```json
{
  "generated_at": "...",
  "fingerprint": { "object_info_sha256": "...", "comfyui_version": "0.3.40" },
  "raw": { "KSampler": { "input": {}, "output": [] } }
}
```

任务预检会刷新；离线编辑读缓存。

## 5. shots.json（recipe）

```json
{
  "workflow": "t2v",
  "meta": {
    "title": "星河短片",
    "synopsis": "调查员林默在雨夜追踪一段来自云层之上的信号。",
    "width": 768,
    "height": 1344,
    "fps": 24,
    "anchors": { "S1": "anchors/city.png" },
    "characters": [
      { "id": "lin", "name": "林默", "description": "28 岁调查员", "reference": "anchors/lin.png" },
      { "id": "lan", "name": "阿岚", "description": "飞行员" }
    ],
    "scenes": [
      { "id": "city", "name": "雨夜城市", "description": "霓虹、积水与高架桥", "reference": "anchors/city.png" },
      { "id": "observatory", "name": "山顶天文台", "description": "废弃圆顶与射电望远镜" }
    ]
  },
  "defaults": {
    "length": 241, "steps": 30, "cfg": 4.0,
    "sampler_name": "euler", "scheduler": "simple",
    "shift_video": 12.0, "shift_audio": 3.0,
    "negative": "低质量"
  },
  "style_prefix": "电影感",
  "shots": [
    {
      "id": "01", "slug": "opening", "title": "雨夜信号",
      "summary": "林默在雨夜发现线索",
      "seed": 1101, "first_frame": "S1",
      "characters": ["lin"], "scene": "city", "length": 48,
      "prompt": "..."
    },
    {
      "id": "02", "seed": 1102, "first_frame": { "relay": "01" },
      "characters": ["lin", "lan"], "scene": "city", "length": 72,
      "prompt": "..."
    }
  ]
}
```

- workflow 选择：单镜 `workflow` > 文件级 `workflow` > `project.default_workflow`；
- 逻辑值（prompt/seed/width/height/...）通过 bindings 注入；镜头可覆盖 `steps/cfg/length/width/height`，`params` 可追加逻辑输入；
- 首帧：锚点 key 或接力（取上游镜头**定稿稿件**的尾帧；未定稿时按 `project.story.enforce` 回退最新成功 run 或阻断）；
- `meta.characters` / `meta.scenes` 是可选的故事设定，仅用于展示与复用，不注入 workflow；
- 人物/场景可以是字符串或对象；对象支持 `id`、`name`、`description`、`reference`（项目内相对路径）；
- 镜头用 `characters: ["lin"]` / `scene: "city"` 引用 id 或名称；也支持 `cast` / `roles` 与 `location` 别名；
- `title` / `summary` 用于展示，缺省回退到 `slug` 与 `prompt`；
- `meta.fps` + 镜头 `length` 可推导时长；镜头也可用 `duration`（秒）显式覆盖；
- 以上字段都是向后兼容的可选项，旧 `shots.json` 不受影响；`daoyan web` 会读取并展示这些信息；
- story 模式下分镜位于 `episodes/<id>/shots.json`，并增加 `meta.episode_id` / `meta.script_revision` / `meta.script_sha256`；
- story 分镜的 `characters` 使用 `{id, form}`；`dialogue[]` 引用音色；`script_refs[]` 引用拆解 beats；`asset_slots` 可显式映射工作流资产槽位。

## 6. task

`tasks/<task_id>/task.json`：

```json
{
  "task_id": "t_20261019T153012-mac-7f3a",
  "kind": "run|shot|retake|batch",
  "machine_id": "mac-studio",
  "request_id": "agent-7f3a-001",
  "status": "queued|running|succeeded|failed|cancelled|interrupted",
  "mode": "local",
  "command": "run t2v",
  "runs": ["r_..."],
  "worker": { "pid": 12345, "started_at": "..." },
  "created_at": "...",
  "started_at": "...",
  "finished_at": "...",
  "error": null,
  "next_actions": ["status --task <id> --wait"],
  "options": {
    "workflow": "t2v",
    "sets": { "7.seed": 1101 },
    "label": "shot:01",
    "shots": ["01"],
    "steps": 30,
    "timeout_ms": 10800000,
    "engine_url": null,
    "force": false
  }
}
```

story 模式额外字段：`episode_id`（legacy / 系列级为 `null`）。多集 label 为 `ep:<episode-id>:shot:<shot-id>`。

`tasks/<task_id>/events.jsonl` 每行：

```json
{"seq":1,"ts":"...","type":"queued","data":{}}
{"seq":2,"ts":"...","type":"machine_lock_acquired","data":{"pid":12345}}
{"seq":3,"ts":"...","type":"engine_started","data":{"pid":12346}}
{"seq":4,"ts":"...","type":"submitted","data":{"prompt_id":"..."}}
{"seq":5,"ts":"...","type":"cleanup_finished","data":{"cleanup":{},"restored":[],"errors":[]}}
```

## 7. run

`runs/<run_id>/run.json`：

```json
{
  "run_id": "20261019T153012-mac-7f3a",
  "task_id": "t_20261019T153012-mac-7f3a",
  "machine_id": "mac-studio",
  "request_id": "agent-7f3a-001",
  "label": "shot:01",
  "workflow": { "path": "workflows/t2v.json", "sha256": "..." },
  "inputs": { "prompt": "...", "seed": 1101 },
  "overrides": { "7.steps": 20 },
  "engine": {
    "mode": "local",
    "comfyui_version": "0.3.40",
    "url": "http://127.0.0.1:8188",
    "pid": 12345,
    "ready_ms": 8123,
    "cleanup": {
      "interrupt": "not_needed",
      "free": "ok",
      "stop": "ok",
      "scratch": "ok",
      "gpu_restore": "ok"
    }
  },
  "gpu": {
    "takeover": true,
    "before": { "used_mb": 12000, "free_mb": 12000 },
    "evicted": [{ "kind": "provider", "provider": "ollama", "models": ["llama3"] }],
    "after": { "used_mb": 1000, "free_mb": 23000 },
    "restored": ["ollama:llama3"],
    "errors": []
  },
  "status": "succeeded",
  "prompt_id": "...",
  "started_at": "...",
  "finished_at": "...",
  "outputs": [
    { "name": "01.mp4", "path": "outputs/01.mp4", "sha256": "...", "bytes": 123 }
  ],
  "error": null
}
```

约束：

- story 模式额外字段 `episode_id`；label 使用 `ep:<episode-id>:shot:<shot-id>`；
- `inputs.assets` 记录工作流资产槽位实际使用的资产（slot / owner / path / sha256 / bytes）；
- 不含绝对路径；
- `workflow.json` 是上传/覆盖后、实际提交的图；
- `inputs.json` 记录逻辑输入与输入文件哈希；
- 失败/取消的 run 同样落盘；
- run 记录不可变，**不带定稿标记**；某条产出是否进入工作流只记录在 `takes.json`；
- `gpu` 仅在 local 尝试接管时出现（平台不支持时 `takeover:false` 并继续任务）。

## 8. 机器锁与 GPU 租约（本机，不在仓库）

- `~/.dycli/machine.lock`：`token/kind/task_id/project/mode/command/pid/started_at`；原子创建，owner PID 探活；损坏需人工处理。
- `~/.dycli/gpu/lease.json`：`version/task_id/project/created_at/entries[]`；条目只有两类：
  - `provider`：服务 id（ollama / lmstudio / xinference / vllm）+ 被卸载的模型名 + 可选 `channel`（主通道）与 `fallbacks[]`（备用通道）；通道类型为 host / netns / exec（含容器 ID 与运行时），恢复时依次尝试；
  - `process`：裸机进程目标 id + cmdline + cwd（不含环境变量）；
  - 容器不会被停止，因此没有容器恢复条目；全部恢复成功后删除。

## 9. Git 约定

- `init` 默认执行 `git init`（幂等）：已在仓库根目录时不重复初始化；位于父级仓库内时跳过嵌套初始化；`$HOME` 与文件系统根目录不自动建仓；`--no-git` 可跳过仓库初始化。
- 不自动 `git add` / `git commit`；提交由用户 / Agent 决定。
- `.gitignore` 由受管块维护：块内规则随 `init` 更新，块外用户内容保留。

```text
# daoyan:gitignore:start
# 本块由 daoyan 维护，下次 init 会重写；自定义规则请写在块外

# Python / 缓存
.venv/
venv/
__pycache__/
*.py[cod]
*.egg-info/
.pytest_cache/
.mypy_cache/
.ruff_cache/

# ComfyUI 引擎（engine/ 覆盖默认本体、venv、custom nodes）
engine/
ComfyUI/

# daoyan 本机状态 / 运行缓存
.dycli/
logs/
relay_frames/
concat_list.txt
*.log

# 临时 / 系统文件
*.tmp
*.temp
*.swp
*~
.DS_Store
Thumbs.db
desktop.ini

# daoyan:gitignore:end
```

`runs/`、`tasks/`、`inputs/`、`final/` 不进入 `.gitignore`；这些共享产物按下面的 `.gitattributes` 走 LFS。

`.gitattributes`：

```text
runs/**/outputs/** filter=lfs diff=lfs merge=lfs -text
runs/**/inputs/**  filter=lfs diff=lfs merge=lfs -text
inputs/**          filter=lfs diff=lfs merge=lfs -text
final/**           filter=lfs diff=lfs merge=lfs -text
```
