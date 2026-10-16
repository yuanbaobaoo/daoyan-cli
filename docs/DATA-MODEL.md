# 数据模型

分镜表（shots.json）沿用生产验证过的 v1 格式，既有项目零成本迁移；`project.json` 为新增，
集中声明全部环境配置。模板见 `templates/`。

## 项目目录布局

```
my-drama/
├── project.json        # 项目配置（新增）
├── shots.json          # 分镜表（v1 格式）
├── workflow.api.json   # ComfyUI API 格式工作流模板
├── anchors/            # 锚点图（角色卡 / 场景图）
├── assets/             # 其他素材
├── engine/             # init 产物（--use-existing 时指向既有路径）
│   ├── ComfyUI/
│   └── .venv/
├── logs/               # daoyan-cli.log / engine.log / gen_<镜>_<ts>.log /
│                       # task.lock / gpu_state.json
├── relay_frames/       # 接力抽帧缓存（按 mtime 失效）
├── manifests/          # <镜号>.manifest.json
└── final/              # wrap 交付物
```

## project.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 项目名 |
| `version` | number | 配置 schema 版本，当前 `1` |
| `output_prefix` | string | 引擎内输出子目录前缀，形如 `"<slug>/"` |
| `workflow` | string | workflow.api.json 相对路径 |
| `engine.mode` | `"local" \| "remote"` | 可选，**缺省 `local`**。local = 本机托管引擎进程；remote = 连接已在别处运行的 ComfyUI（既定设计，细节随后续里程碑细化） |
| `engine.url?` | string | 完整 base URL（可含 https 与路径前缀，如反代后的 `https://host/comfyui`）；设置时优先于 host/port，remote 模式推荐 |
| `engine.host` / `engine.port` | string / number | 引擎 HTTP 地址（local 默认 `127.0.0.1:8188`） |
| `engine.comfyui_dir` | string | ComfyUI 仓库路径（**local 必填**；remote 不适用） |
| `engine.venv_dir` | string | Python 虚拟环境路径（**local 必填**；remote 不适用） |
| `engine.version?` | string | init 选择的 ComfyUI 版本 tag（local） |
| `engine.repo_url?` | string | clone 源，默认官方仓库；可指镜像 / 内网 fork（local） |
| `engine.launch_extra?` | string[] | 透传 `main.py` 的参数（如 `["--listen","0.0.0.0"]`，local） |
| `engine.run_user?` | string | 以 root 运行 CLI 时，引擎降权到该用户（local） |
| `models.unet` / `models.clip` / `models.vae` | string | 模型三件套文件名（相对 `shared_models_dir` 的子目录） |
| `models.shared_models_dir?` | string | 共享模型库根（`extra_model_paths.yaml` 指向的目录；remote 模式下仅作 doctor 的模型清单参考） |
| `gpu.evict_targets` | array | GPU 让路目标：`"ollama"` / `"xinference"`；空数组 = 不编排（remote 模式通常置空——GPU 在远端） |
| `node_checks?` | string[] | doctor/validate 校验必须注册的节点类名 |

路径规则：**相对路径一律相对项目根解析**（加载时由 `core/project/config.mts` 绝对化）。

### 引擎接入模式

`engine.mode` 缺省按 **local** 加载（加载器自动注入），首版实现聚焦 local；
remote 为既定设计，语义矩阵如下，实现细节（上传 / 断点判定 / 进度）随后续里程碑细化。

```jsonc
// local（默认形态）：引擎在本机，daoyan-cli 托管进程生命周期
"engine": { "mode": "local", "comfyui_dir": "engine/ComfyUI", "venv_dir": "engine/.venv",
            "host": "127.0.0.1", "port": 8188 }

// remote：引擎在别处运行（另一台机器 / 容器 / 反代之后），只连接、不托管
"engine": { "mode": "remote", "url": "https://gpu-box.lan/comfyui" }
// 或     "engine": { "mode": "remote", "host": "gpu-box.lan", "port": 8189 }
```

| | local | remote |
|---|---|---|
| 生命周期（`up` / `down` / `engine install/use`） | daoyan-cli 托管：spawn + PID 文件 + 就绪探测 | 不适用：进程由远端管理；`up` 退化为连通性与节点注册探测，`down` / `engine install/use` 提示不适用 |
| 连接方式 | `http://host:port` | `engine.url` 优先（支持 https / 反代路径前缀），否则 `host:port` |
| 首帧注入（锚点 / 接力帧） | 直接复制进引擎 `input/` 目录 | 经 `POST /upload/image` 上传（`ComfyClient.uploadImage`） |
| 断点续跑判定 | 扫描引擎 `output/` 目录 | 引擎侧文件系统不可见，改用 `manifests/` 与 `/history` 判定 |
| doctor | 全量（venv / torch / 模型文件 / ffmpeg / 节点注册） | 跳过本地文件检查：连通性 + 节点注册 + 模型可见性（`/object_info`） |
| 生成命令（`shot/batch/retake/wrap`） | 完整支持 | 完整支持（wrap 从远端拉取产物后本地合片） |

## shots.json（v1）

```
{
  "meta": {
    "title": "...", "width": 768, "height": 1344, "length_per_shot": 241,
    "anchors": { "S1": "anchors/scene-court.png", "C1": "anchors/char-01.png" }
  },
  "defaults": {
    "length": 241, "steps": 30, "cfg": 4.0,
    "sampler_name": "euler", "scheduler": "simple",
    "shift_video": 12.0, "shift_audio": 3.0, "negative": "..."
  },
  "style_prefix": "写实电影感，电影级打光",
  "shots": [
    { "id": "01", "slug": "faguan_fazhui", "seed": 1101,
      "first_frame": "S1", "prompt": "……" },
    { "id": "02", "slug": "...", "seed": 1102,
      "first_frame": { "relay": "01" }, "prompt": "……" }
  ]
}
```

### first_frame 三形态

| 形态 | 语义 | 执行动作 |
|---|---|---|
| `"S1"`（字符串） | 锚点 key，`meta.anchors` 中必须存在 | 从 `anchors/` 复制进引擎 input |
| `{"relay": "01"}` | 接力：取上游镜号尾帧 | ffmpeg 抽上游成片尾帧到 `relay_frames/`（mtime 缓存）再入 input |
| 缺省 | 纯 T2V | 不注入首帧 |

上游成片缺失 → `relay_upstream_missing`（validate 阶段即应拦截，而非生成时）。

### 约束（validate 校验项）

- `width` / `height` 为 32 的倍数；
- 帧数按所用模型的帧网格对齐（如 MiniMax H3 为 17k+5：…226、243…）；
- 接力链闭合：每条 `relay` 的上游存在，且不构成环；
- seed 在全表内不冲突；`prompt` 非空。

## workflow.api.json 与节点命名约定

工作流为 ComfyUI **API 格式**（ComfyUI 内 File → Export (API) 导出后按下表重命名节点）：

| 节点键 | 角色 |
|---|---|
| `1_unet` / `2_clip` / `3_vae` | 三个 Loader（模型名来自 project.json） |
| `4_negative` | 负向提示词（text 被 defaults.negative 覆盖） |
| `5_cond` | 主条件节点（prompt/width/height/length/first_frame 注入点） |
| `6_shift` | SigmaShift（shift_video / shift_audio） |
| `7_sample` | KSampler（seed/steps/cfg/sampler/scheduler） |
| `9_save` | 保存（filename_prefix 被 output_prefix+镜号 覆盖） |
| `0_load` | LoadImage（存在首帧时动态插入） |

> `templates/workflow.api.template.json` 仅为结构示意；实际项目以引擎导出为准按约定重命名。

## manifest（每镜，M2）

```
manifests/01.json
{
  "shot": "01", "prompt_id": "…",
  "shots_hash": "…", "workflow_hash": "…",        // 输入快照的哈希
  "seed": 1101, "steps": 30,
  "models": { "unet": "…", "clip": "…", "vae": "…" },
  "engine": { "comfyui_version": "0.36.0", "torch": "2.8.0+cu126" },
  "started": "…", "seconds": 1650,
  "output": "engine/ComfyUI/output/mydrama/01_xxx.mp4"
}
```

用途：返工归因、A/B 重跑（「同配置再来一条」）、成片可追溯。
