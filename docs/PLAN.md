# daoyan-cli 总方案

> 剧本进，成片出。You prepare the story. The director shoots it.
> 本文件是总方案与架构的唯一事实来源；命令 / 数据 / 错误码的细则见同目录另三份规范。

## 0. 定案摘要

| 项 | 决定 |
|---|---|
| 名称 | 包名 `daoyan-cli`（npm，与仓库名一致；不设别名包），双 bin：`daoyan-cli` / `dyc` |
| 双 bin | `daoyan-cli` + `dyc`（同一入口 `dist/cli.mjs`，`dyc` 为短命令） |
| 语言 | TypeScript，**运行时零第三方依赖**；Node ≥ 22 LTS |
| 分发 | npm；`daoyan-cli update` 自升级（spawn `npm i -g daoyan-cli@latest`） |
| 定位 | 构建在 ComfyUI 之上的 **agent-native 生产编排 CLI**：分镜表进，成片出。短剧 / 长剧皆宜——凡是能拆成分镜表的内容，都是一条可重入的生产线 |
| ComfyUI | **外部组件**（与 ffmpeg、nvidia-smi、k3s 同级），init 纯编排：宿主 Python 建 `.venv` → 选版本 → GitHub 拉取 → 装依赖；体内零 Python |
| 差异化 | ComfyUI 生态现有形态是交互式画布 / Web 工作台；daoyan-cli 提供 headless、可脚本化、可断点续跑的产线形态，并为 AI Agent 提供机器可读的自描述接口 |

## 1. 架构分层

```
┌────────────────────────────────────────────────┐
│ 项目层（用户的规则文件，Git 管理）                │
│  project.json · shots.json · anchors/          │
│  workflow.api.json · assets/ · manifests/       │
├────────────────────────────────────────────────┤
│ daoyan-cli 编排层（TypeScript，体内零 Python）   │
│  规则校验 · 引擎供应 · GPU 编排 · 生成调度        │
│  接力链 · 单任务锁 · 状态/日志 · 合片 · manifest │
├────────────────────────────────────────────────┤
│ 外部组件层（spawn / HTTP 编排，全部可替换）       │
│  ComfyUI(.venv) · ffmpeg · nvidia-smi          │
│  k3s crictl · ollama/xinference(HTTP) · git    │
└────────────────────────────────────────────────┘
```

总原则：**编排而非重造**。推理、转码、显存管理等重活全部发生在外部组件里；
daoyan-cli 只负责计划、调度、校验、观测。ComfyUI 与 ffmpeg、nvidia-smi、k3s 同级——
`init` 通过宿主机 Python 创建 `.venv`、从 GitHub 拉取所选版本，纯脚本编排，体内零 Python。

## 2. 外部组件与接口

| 组件 | 接口方式 | 说明 |
|---|---|---|
| ComfyUI | HTTP（`/prompt` `/history` `/queue` `/object_info` `/system_stats` `/upload/image`）+ WS（M2） | 引擎本体，支持两种接入模式：local 由 `up/down` spawn `venv/bin/python main.py` 托管；remote 只连接不托管（url 可含 https / 反代路径前缀） |
| ffmpeg / ffprobe | spawn | 接力抽帧、wrap 合片 |
| nvidia-smi | spawn | 显存/利用率/进程占用 |
| k3s crictl | spawn（需 root） | Pod IP 发现（ollama / xinference） |
| ollama / xinference | HTTP | GPU 编排：模型卸载与回载 |
| git / GitHub API | spawn / HTTP | `init` 与 `engine install` 的版本拉取 |

## 3. 仓库结构

```
daoyan-cli/
├── package.json            # name: daoyan-cli, bin: { daoyan-cli, dyc }
├── tsconfig.json / tsup.config.mts
├── src/
│   ├── cli.mts             # 入口：参数解析(--json/--project)、命令分发、帮助
│   ├── commands/           # 命令注册表（help/update/init/validate/shot/wrap/logs/status/engine 已实现）
│   ├── core/
│   │   ├── comfy/          # 引擎 REST 客户端（/prompt /history /queue /object_info /system_stats）
│   │   │                   # + WS 进度订阅（M2）+ 引擎生命周期(up/down/PID/就绪探测，M1)
│   │   ├── provision/      # init 编排：python 检测/venv/版本选择/clone/装依赖
│   │   ├── gpu/            # evict/restore、nvidia-smi 解析、k3s Pod 发现
│   │   ├── pipeline/       # 首帧解析(锚点/接力)、workflow 填充、提交轮询、
│   │   │                   # 断点续跑、manifest 落盘
│   │   ├── project/        # 项目发现、project.json/shots.json 读写、模板
│   │   ├── lock/           # 单任务锁(pid 探活/陈旧锁清理)
│   │   ├── obs/            # 状态采集(/proc、GPU、队列)、日志清洗(ANSI/tqdm)
│   │   └── media/          # ffmpeg 抽帧、wrap 合片
│   └── shared/
│       ├── errors.mts      # 结构化错误码体系
│       ├── json.mts        # --json 信封输出 {ok,data} / {ok,error{code,message,details}}
│       └── log.mts         # 日志（stdout + 可挂载 sink）
├── templates/              # init 生成的项目模板(shots.json 模板/工作流模板)
└── docs/                   # 方案与规范（本文件 / COMMANDS / DATA-MODEL / ERROR-CODES）
```

构建：tsup 打包为单文件 `dist/cli.mjs`（ESM）。engines 字段 `"node": ">=22"`。

## 4. 模块地图（src/）

| 模块 | 职责 | 里程碑 |
|---|---|---|
| `cli.mts` | 参数解析、命令分发、帮助；零依赖手写 | M0 ✅ |
| `commands/registry.mts` | 全部命令的元信息与占位实现 | M0 ✅ |
| `commands/help.mts` | 帮助与 agent 自描述（替代早期 discover） | ✅ |
| `commands/update.mts` | npm 自升级 | M0 ✅ |
| `core/project/` | project.json / shots.json 类型与加载（向上寻找） | M0 ✅ |
| `core/comfy/client.mts` | 引擎 REST 客户端 | M0 ✅ |
| `core/lock/task-lock.mts` | 单任务锁（pid 探活） | M0 ✅ |
| `core/media/ffmpeg.mts` | 抽帧 + wrap 合片 | M0 ✅ / M1 |
| `core/provision/` | init 编排计划与执行器 | M3 |
| `core/gpu/` | evict / restore | M1 |
| `core/pipeline/` | 首帧解析、生成调度 | M1 |
| `core/obs/` | 状态采集、日志清洗 | M1 |

## 5. 横切约定

- **输出信封**（`--json`）：成功 `{"ok":true,"data":…}`；失败 `{"ok":false,"error":{"code","message","details?"}}`。
- **退出码**：0 成功；1 业务失败；2 用法错误；130 被中断。
- **错误码**：稳定字符串枚举，全量登记于 [ERROR-CODES.md](ERROR-CODES.md) 与 `daoyan-cli help --json`。
- **依赖政策**：运行时零第三方依赖；开发依赖仅 typescript / tsup / @types/node。
  新增运行时依赖需要充分理由（目前唯一预期候选：若 M2 采纳 `ws` 而不用 Node 内置 WebSocket）。
- **路径约定**：project.json 中的相对路径一律相对项目根解析（`core/project/config.mts` 负责）。
- **模板解析**：打包后 templates 位于包内 `templates/`（package.json `files` 已包含），
  以 `dist/cli.mjs` 的 `import.meta.url` 向上定位。

## 6. 命令树（完整）

| 命令 | 说明 |
|---|---|
| `daoyan-cli init <name>` | 立项（详见 §8 编排流程）；`--use-existing <path>` 接管既有本地安装；`--remote <url>` 远端模式直连 |
| `daoyan-cli validate` | 项目规则全量校验（接力链闭合/锚点存在/尺寸 32 倍数/seed 冲突/prompt 非空） |
| `daoyan-cli up` / `down [--force]` | 引擎启停（local：PID 文件、就绪探测、节点注册验证、任务运行时拒停；remote：up 为连通/节点探测，down 不适用） |
| `daoyan-cli shot <ids...>` | 拍指定镜头；`--steps N` `--timeout H` `--no-evict` `--no-up` |
| `daoyan-cli retake <ids...>` | `shot --force` 的别名（重拍） |
| `daoyan-cli batch` | 连拍全部未完成镜头（断点续跑） |
| `daoyan-cli status [--json]` | 任务/进度/GPU/内存/模型/镜头完成度 |
| `daoyan-cli logs [-f] [-n N] [--src daoyan-cli\|engine\|all]` | docker logs 语义 |
| `daoyan-cli list [--json]` | 分镜表 |
| `daoyan-cli doctor` | 环境自检（引擎/节点/模型/显存/ffmpeg） |
| `daoyan-cli wrap` | 杀青合片 → `final/`（预留转场扩展点） |
| `daoyan-cli update` | 自升级（检测 npm prefix 权限，EACCES 给指引） |
| `daoyan-cli help [命令] [--json]` | 帮助与 agent 自描述：命令树/schema/错误码/退出码约定（替代早期 discover） |
| `daoyan-cli engine ls/install <ver>/use <ver>` | ComfyUI 外部组件的版本管理 |
| `daoyan-cli gpu status [/ evict / restore]` | GPU 编排可见化（运维用） |

全局参数：`--project <path>`（默认 cwd 向上发现 project.json）、`--json`、`--no-color`。
退出码：0 成功 / 1 业务失败 / 2 用法错误 / 130 中断。

## 7. 数据模型

数据格式是项目与 CLI 之间的契约，完整定义见 [DATA-MODEL.md](DATA-MODEL.md)：

- `project.json` —— 环境与配置的集中声明（引擎路径 / venv / 模型三件套 / 默认参数 /
  GPU 编排目标 / 输出前缀）；
- `shots.json` —— 分镜表 v1（锚点 / 接力 / 纯文生三种首帧形态）；
- `workflow.api.json` —— ComfyUI API 格式模板，按节点命名约定填充；
- `manifests/` —— 每镜可复现快照（输入哈希 / seed / 模型 / 耗时 / 产物路径）。

## 8. `init` 编排流程（ComfyUI = 外部组件）

```
1. 检测宿主机 python3（≥3.10；找不到则报错并给安装指引，绝不捆绑 Python）
2. python3 -m venv engine/.venv
3. 版本选择：GitHub API 列 ComfyUI releases/tags → 交互选择（或 --version 0.36.0）
4. git clone --branch <tag> --depth 1 <comfyui-repo> engine/ComfyUI
   （仓库地址可在 project.json 覆盖 → 支持镜像/内网 fork）
5. .venv/bin/pip install -r engine/ComfyUI/requirements.txt
   + torch 轮子：按 nvidia-smi CUDA 版本选 cu126/cu128/cpu 源（--mirror 可配）
6. 生成项目骨架：shots.json 模板 / anchors/ / workflow.api.json 模板
7. 写 project.json（记录引擎路径、版本、模型引用）
8. 提示 daoyan-cli doctor 收尾自检
```

`--use-existing <path>`：跳过 1–5，仅写配置 + 骨架对齐（接管既有 ComfyUI 安装）。
`--remote <url>`：远端模式——引擎已在别处运行，跳过 1–5 且不落任何本地引擎文件，
project.json 写 `engine.mode = "remote"`。
全程 spawn 数组传参 + 显式 `env`（根治 shell 引号与环境变量继承的坑）。

## 9. 核心机制

1. **引擎双模式**：`engine.mode = local | remote`，**缺省 local**（语义矩阵见 [DATA-MODEL.md](DATA-MODEL.md)）。local 托管进程生命周期；remote 只连接不托管——首帧注入走 `/upload/image`，断点续跑依据 `manifests/` 与 `/history` 而非本地 `output/` 扫描（remote 的实现细节随后续里程碑细化）。
2. **单任务锁**：`logs/task.lock`（pid/命令/镜号/prompt_id/时间）+ `process.kill(pid,0)` 探活；陈旧锁自动清理；引擎队列有任务时拒绝并行提交。
3. **GPU 编排**：evict = crictl 找 Pod IP → ollama/xinference HTTP 卸载模型 → `gpu_state.json` 存档；restore 在 finally 中执行（含预热回载）。需 root，非 root 时警告降级（`--no-evict`）。remote 模式下 GPU 在远端，通常置空 `evict_targets`。
4. **首帧/接力**：锚点 key → 复制进引擎 input；relay → ffmpeg 抽上游尾帧（mtime 缓存）；上游缺片时开机前即报 `relay_upstream_missing`。
5. **进度**：优先 WS `/ws?clientId=` 订阅进度事件；引擎旧版本/WS 不可用时降级为引擎日志 tqdm 解析 + mtime 外推（生产验证过的兜底逻辑；remote 模式无本地日志，仅 WS）。
6. **断点续跑**：按输出前缀找产物，存在即跳过；`retake` 强制重拍。
7. **错误码**：每类错误一个稳定 code（`anchor_not_found` / `relay_upstream_missing` / `engine_not_ready` / `gpu_evict_failed` / `shot_timeout` / `lock_held` …），`--json` 下输出 `{code, message, details}`；全部错误码登记进 `help --json`。
8. **manifest**：每镜完成即落盘，返工归因与 A/B 重跑有据可查。

## 10. 里程碑

| 阶段 | 内容 | 验收 |
|---|---|---|
| M0 骨架 | TS 工程/命令注册/--json 框架/错误码框架/npm 占位包 | `daoyan-cli --help` 可安装可用 |
| M1 核心对齐 | 引擎生命周期/锁/shot/batch/接力锚点/GPU 编排/status/logs/wrap | `init --use-existing` 接管既有 ComfyUI 项目后，`validate → status → shot → wrap` 全流程跑通且 `--json` 可用 |
| M2 规则层 | validate/manifest/WS 进度/remote 模式细化 | `help --json` 驱动 agent 完成一次盲操作 |
| M3 项目化 | init 全流程（venv/版本选择/clone）/模板/多项目 | 新机器空目录 → 新项目跑通一镜 |
| M4 开源打磨 | 文档/completion/e2e/发布流程 | 对外发布 1.0 |

## 11. 风险与对策

| 风险 | 对策 |
|---|---|
| 服务器未装 Node | 先装 Node 22 LTS（NodeSource/nvm） |
| `dyc` 与 `dvc` 一字母之差 | README 注明；无实际冲突 |
| 100Mbps 拉 torch 轮子慢 | `--mirror` 支持国内源；`git clone --depth 1` |
| 旧引擎无 WS 进度 | 日志外推兜底（生产已验证） |
| 全局 npm 安装权限 | update 时检测 EACCES 并给 nvm/prefix 指引 |
| 品牌风险 | `daoyan-cli`/`dyc` 已排查（npm/PyPI/本机/品牌）双干净；无"导演"同名知名产品 |
| shots.json 人为写坏 | validate 前置 + schema 校验，错误在开机前暴露 |
