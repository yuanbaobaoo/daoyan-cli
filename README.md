# daoyan（dycli）

## 安装

### 环境要求

| 依赖 | 要求 | 用途 |
|---|---|---|
| Node.js | >= 22 | 运行 CLI |
| npm | 随 Node 安装 | 全局安装与 `daoyan update` |
| Git | 任意稳定版本 | `init` 初始化仓库、部署 ComfyUI、安装器 git 回退 |
| Python | >= 3.10，含 ensurepip | 仅 `init --mode=local` / `engine install` 需要 |
| ffmpeg / ffprobe | 任意稳定版本 | 仅接力抽帧与 `wrap` 合片需要 |

安装脚本会在下载前检查 Node、npm、Git，缺失时直接失败并给出对应平台的安装命令。

### macOS / Linux

```bash
curl -fsSL https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.sh | bash
```

### Windows

```powershell
irm https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.ps1 | iex
```

需要传环境变量或排查问题时，可下载后执行：

```powershell
$url = "https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.ps1"
$file = Join-Path $env:TEMP "install-daoyan.ps1"
Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file
powershell -NoProfile -ExecutionPolicy Bypass -File $file
```

### 指定版本 / 离线安装

```bash
npm install -g --ignore-scripts ./daoyan-cli-<version>.tgz
```

手动安装不会执行安装器的环境检查，Node、npm、Git 仍需自行满足。

### 安装器环境变量

| 变量 | 说明 |
|---|---|
| `DAYOAN_REF` | git 回退源使用的 tag / 分支 / commit，默认 `master` |
| `DAYOAN_REPO` | 自建 git 镜像地址 |
| `DAYOAN_MANIFEST_URL` | 自定义 `latest.json`；显式设为空则走 git 源 |
| `DAYOAN_TGZ_URL` | 直接安装指定 tgz（URL 或本地路径） |
| `DAYOAN_SHA256` | tgz 的 SHA-256；远程 tgz 必填 |
| `DAYOAN_PROXY` | 下载与 npm 使用的代理 |

### 验证安装

```bash
daoyan --version
dycli --version
```

`daoyan` 与 `dycli` 等价。

## 命令

### 项目

- `daoyan init --mode=local [--modelpath <路径>] [--version <tag>] [--mirror <镜像>] [--fallback-mirror <镜像|none>] [--torch-index <url>] [--torch-cuda <cuXXX>] [--torch-cpu] [--no-cache] [--no-skill] [--no-git]` — 在当前目录立项并部署项目专属 ComfyUI。
- `daoyan init --mode=remote --url <url> [--no-skill] [--no-git]` — 在当前目录立项并绑定外部 ComfyUI。
- `daoyan validate [--json]` — 项目级离线校验（配置 / workflows / bindings / overrides / shots / 引擎目录 / Skill）。
- `daoyan skill update [--json]` — 重新生成项目内 Agent Skill 与 `AGENTS.md` 管理块。

`init` 默认维护 `.gitignore` 受管块并初始化 Git 仓库；位于父级仓库内时跳过嵌套初始化，不自动 commit。`--no-git` 只跳过仓库初始化。

### 剧本与设定

- `daoyan story init [--json]` — 启用多集短剧模式，创建 `story/`、`episodes/ep01`、资产目录与 LFS 规则。
- `daoyan story series show|set [--title <t>] [--synopsis <s>] [--genre <g>] [--json]` — 查看 / 修改系列标题、简介与类型。
- `daoyan story episode add --id <id> --number <n> --title <t> [--summary <s>] [--json]` — 新增剧集。
- `daoyan story episode list|show|set ...` — 列出 / 查看 / 修改剧集（id 不可变，number 全系列唯一）。
- `daoyan story script sync --episode <id> --file <script.md|-> [--summary <s>] [--source ai|user|import] [--json]` — 同步某一集剧本，生成独立 revision。
- `daoyan story script show --episode <id> [--raw] [--json]` — 查看某一集剧本。
- `daoyan story script approve --episode <id> [--json]` — 确认某一集剧本。
- `daoyan story breakdown set|show --episode <id> [--file <breakdown.json|->] [--json]` — 写入 / 查看单集拆解（本集角色、形态、场景、音色允许清单）。
- `daoyan story characters set|show [--file <characters.json|->] [--id <id>] [--json]` — 写入 / 查看全局角色与形态。
- `daoyan story scenes set|show [--file <scenes.json|->] [--id <id>] [--json]` — 写入 / 查看全局场景。
- `daoyan story voices set|show [--file <voices.json|->] [--id <id>] [--json]` — 写入 / 查看全局音色。
- `daoyan story asset add --owner <character:id|scene:id|voice:id> [--form <form>] --id <asset> (--from <file>|--from-run <run> --output <name>) [--set-reference] [--json]` — 参考图 / 参考音频入库并记录来源。
- `daoyan story asset set-reference|remove|list ...` — 指定主参考、删除与列出参考资产。
- `daoyan story shots show --episode <id> [--json]` — 读取某一集完整 `shots.json`（供 AI 修改后写回）。
- `daoyan story shots set --episode <id> --file <shots.json|-> [--json]` — 校验并写入某一集 `shots.json`，记录剧本 revision。
- `daoyan story map show --episode <id> [--raw] [--json]` — 查看生成上下文（角色 / 形态 / 场景 / 资产 / workflow 候选 / 槽位 / 连续性 / 缺口）与拓扑 / 时序数据。
- `daoyan story map build|set|clear --episode <id> ...` — 生成标注骨架、写入叙事标注或清除标注。
- `daoyan story status [--episode <id>] [--json]` — 系列概览；指定剧集时查看阶段、stale、blockers 与 next_actions。
- `daoyan story validate [--episode <id>] [--verify-hashes] [--json]` — 完整校验剧本、设定集、拆解、分镜、资产与引用。

### 工作流

- `daoyan workflow new <name> [--json]` — 创建空工作流（`{}`，后续用 `apply` / `set` 编辑）。
- `daoyan workflow import <api.json> --name <name> [--json]` — 导入 ComfyUI API JSON（不重命名节点）。
- `daoyan workflow list [--json]` — 列出 `workflows/` 下的图（节点 / 连线 / 合法性）。
- `daoyan workflow show <name> [--full] [--node <id>] [--json]` — 查看工作流摘要、完整图或单节点。
- `daoyan workflow nodes [--filter <文本>] [--refresh] [--limit N] [--cursor <c>] [--fields <list>] [--json]` — 查询节点目录（默认缓存；`--refresh` 拉取 `/object_info`）。
- `daoyan workflow node <class_type> [--json]` — 查看单个节点类的输入 / 输出定义。
- `daoyan workflow apply <name> --ops <ops.json|-> [--json]` — 批量图操作（全量校验后原子写盘）。
- `daoyan workflow set <name> <nodeId>.<input> <value> [--json]` — 单点设置节点输入（值按 JSON 解析）。
- `daoyan workflow validate <name> [--json]` — 单图离线校验（结构 / bindings / overrides / 缓存目录）。

### 生产

- `daoyan run <workflow.json|name> [--set nodeId.input=value ...] [--label <label>] [--episode <id>] [--engine <url>] [--request-id <id>] [--wait] [--dry-run] [--timeout <小时>] [--json]` — 执行一个 workflow（默认异步 task；`--wait` 才阻塞）。
- `daoyan run cancel <task_id> [--json]` — 取消一个 task（worker 执行 interrupt → free → stop → restore）。
- `daoyan run reassign <run_id> --episode <id> [--shot <镜号>] [--json]` — 把 story 化之前未归属的 run 迁到某集某镜，之后才能定稿与合片。
- `daoyan shot <镜号...> [--episode <id>] [--steps N] [--request-id <id>] [--allow-incomplete] [--wait] [--timeout <小时>] [--json]` — 拍摄指定镜头（一个 task 多个 run；默认异步）。
- `daoyan retake <镜号...> [--episode <id>] [--steps N] [--request-id <id>] [--allow-incomplete] [--wait] [--timeout <小时>] [--json]` — 强制重拍指定镜头（忽略已有成功 run）。
- `daoyan batch [--episode <id>] [--request-id <id>] [--allow-incomplete] [--wait] [--timeout <小时>] [--json]` — 连拍全部未完成镜头（已有成功 run 跳过；默认异步）。
- `daoyan take list [镜号...] [--episode <id>] [--json]` — 列出各镜头的候选稿件与定稿状态。
- `daoyan take finalize <镜号> --run <run_id> [--output <稿件名>] [--note <文本>] [--source ai|user] [--episode <id>] [--json]` — 把某条产出定为该镜头的定稿稿件；下游接力与合片只用它。
- `daoyan take revoke <镜号> [--episode <id>] [--json]` — 撤销该镜头的定稿。
- `daoyan wrap [--episode <id>] [--select <镜号>=<run_id> ...] [--allow-incomplete] [--json]` — 按集用定稿稿件合片，写 `final/<episode>/cut-*.mp4` 与清单。

### 运维

- `daoyan status [--episode <id>] [--json]` — 被动状态快照。
- `daoyan status --task <task_id> [--wait] [--timeout <秒>] [--json]` — 查看任务详情，可等待终态。
- `daoyan status --run <run_id> [--wait] [--timeout <秒>] [--json]` — 查看单 run 详情，可等待终态。
- `daoyan logs [-f] [-n N] [--task <task_id> | --run <run_id>] [--json]` — 结构化事件流。
- `daoyan logs [-f] [-n N] [--src daoyan-cli|engine|worker|all]` — 引擎 / worker 文本日志。
- `daoyan web [--port <n>] [--host <addr>] [--open] [--json]` — 启动 Web UI 查看项目、分镜、任务与产出物；可确认剧本、生成 / 重新生成镜头，并定稿 / 撤销镜头稿件。

### 引擎

- `daoyan engine ls [--json]` — 列出当前引擎、本地版本目录与 GitHub tags。
- `daoyan engine install <版本 tag> [--mirror <url>] [--fallback-mirror <url|none>] [--torch-index <url>] [--torch-cuda <cuXXX>] [--torch-cpu] [--no-cache] [--json]` — 安装指定 ComfyUI 版本到 `engine/versions/<tag>`。
- `daoyan engine use <版本 tag|路径> [--json]` — 切换本机使用的 ComfyUI 版本或路径。

### 元

- `daoyan help [命令] [--json]` — 帮助与机器自描述（`--json` 输出命令 / 参数 / Schema / 错误目录）。
- `daoyan update [--check] [--manifest <url|路径>] [--from <路径|URL>] [--sha256 <hex>] [--proxy <url>] [--github-proxy <url[,url]|none>]` — 自升级（默认 GitHub Release `latest.json`；直连失败自动尝试内置加速源）。
- `daoyan update proxy [<url>|--unset]` — 查看 / 设置 / 清除自更新代理（`~/.dycli/update.json`）。
- `daoyan update source [<manifest>|--unset]` — 查看 / 设置 / 清除自更新源。
