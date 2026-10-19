# 数据模型（v0.1）

> 原则：共享记录不含绝对路径；本机路径只出现在 `.dycli/machine.json`。

## 1. 目录布局

```text
project.json                 # 共享：项目配置 v2
workflows/<name>.json        # 共享：ComfyUI API JSON
workflows/<name>.bindings.json
shots.json                   # 共享：shot/batch recipe
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
  "meta": { "width": 768, "height": 1344, "anchors": { "S1": "anchors/scene.png" } },
  "defaults": {
    "length": 241, "steps": 30, "cfg": 4.0,
    "sampler_name": "euler", "scheduler": "simple",
    "shift_video": 12.0, "shift_audio": 3.0,
    "negative": "低质量"
  },
  "style_prefix": "电影感",
  "shots": [
    { "id": "01", "slug": "opening", "seed": 1101, "first_frame": "S1", "prompt": "..." },
    { "id": "02", "seed": 1102, "first_frame": { "relay": "01" }, "prompt": "..." }
  ]
}
```

- workflow 选择：单镜 `workflow` > 文件级 `workflow` > `project.default_workflow`；
- 逻辑值（prompt/seed/width/height/...）通过 bindings 注入；镜头可覆盖 `steps/cfg/length/width/height`，`params` 可追加逻辑输入；
- 首帧：锚点 key 或接力（取上游最新成功 run 的尾帧）。

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

- 不含绝对路径；
- `workflow.json` 是上传/覆盖后、实际提交的图；
- `inputs.json` 记录逻辑输入与输入文件哈希；
- 失败/取消的 run 同样落盘；
- `gpu` 仅在 local 尝试接管时出现（平台不支持时 `takeover:false` 并继续任务）。

## 8. 机器锁与 GPU 租约（本机，不在仓库）

- `~/.dycli/machine.lock`：`token/kind/task_id/project/mode/command/pid/started_at`；原子创建，owner PID 探活；损坏需人工处理。
- `~/.dycli/gpu/lease.json`：`version/task_id/project/created_at/entries[]`；条目只有两类：
  - `provider`：服务 id（ollama / lmstudio / xinference / vllm）+ 被卸载的模型名 + 可选 `channel`（主通道）与 `fallbacks[]`（备用通道）；通道类型为 host / netns / exec（含容器 ID 与运行时），恢复时依次尝试；
  - `process`：裸机进程目标 id + cmdline + cwd（不含环境变量）；
  - 容器不会被停止，因此没有容器恢复条目；全部恢复成功后删除。

## 9. Git 约定

`.gitignore`：

```text
engine/
logs/
.dycli/
relay_frames/
concat_list.txt
*.log
.DS_Store
```

`.gitattributes`：

```text
runs/**/outputs/** filter=lfs diff=lfs merge=lfs -text
runs/**/inputs/**  filter=lfs diff=lfs merge=lfs -text
inputs/**          filter=lfs diff=lfs merge=lfs -text
final/**           filter=lfs diff=lfs merge=lfs -text
```

dycli 不执行 `git commit`；只写确定性 JSON，提交由用户 / Agent 决定。
