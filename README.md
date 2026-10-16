# daoyan-cli

构建在 ComfyUI 之上的生产编排 CLI，面向 AI Agent 与自动化流水线。

> 🚧 **开发中**：核心命令已可用（见下表 ✅），其余按里程碑推进，计划见 [docs/PLAN.md](docs/PLAN.md)。
> 未实现的命令执行时报 `not_implemented`。GPU 编排与 remote 模式的生成链路尚未接入。

## 安装

要求 Node ≥ 22 LTS（含 npm）与 git。

```bash
# 方式一：curl 一键脚本（直接从 GitHub 安装）
curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash

# 方式二：npm 直装 GitHub 仓库（等价于脚本内部的两步：npm pack 源码后安装 tgz）
npm i -g git+https://github.com/yuanbaobaoo/daoyan-cli.git

# 方式三：npm registry（包发布后可用）
npm i -g daoyan-cli
```

指定版本安装（接受 git tag / 分支 / commit）：

```bash
DAYOAN_REF=v0.2.0 curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash
```

## 升级

```bash
# 检测新版本（GitHub tags，仅检测不安装）
daoyan update --check

# 升级到 GitHub 最新 tag（自动完成，无需 npm registry）
daoyan update

# 或重跑安装脚本（效果等同 update）
curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash
```

发版流程：推送 `v*` tag 触发 GitHub Actions 自动构建并创建 Release（`.github/workflows/release.yml`）。

## 命令

全局参数：`--json`（机器可读输出信封）· `--project <路径>` · `--no-color` · `-h/--help` · `-v/--version`。
`dycli` 是 `daoyan` 的短命令，完全等价。

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan help [命令] [--json]` | 帮助；`--json` 输出 agent 自描述（命令树 / 信封 / 错误码 / 退出码） | ✅ 可用 |
| `daoyan update [--check]` | 自升级 / 检测 GitHub 最新 tag | ✅ 可用 |
| `daoyan init <名称>` | 立项：本地装引擎（venv/clone/依赖）或 `--use-existing <路径>` 接管既有安装或 `--remote <url>` 直连远端 | ✅ 可用 |
| `daoyan validate [--json]` | 项目规则全量校验（接力链 / 锚点 / 尺寸 / seed / workflow 节点约定） | ✅ 可用 |
| `daoyan shot <镜号...>` / `retake` | 拍摄 / 重拍（自动拉起引擎、首帧注入、15s 轮询、断点续跑、manifest） | ✅ 可用 |
| `daoyan wrap` | 合片交付到 `final/`（ffmpeg concat，libx264/crf18/faststart） | ✅ 可用 |
| `daoyan logs [-f] [-n N]` | 日志查看（docker logs 语义，清洗 ANSI/tqdm） | ✅ 可用 |
| `daoyan status [--json]` | 引擎 / 队列 / 任务锁 / GPU / 内存 / 镜头完成度 | ✅ 可用 |
| `daoyan engine ls / install / use` | ComfyUI 版本管理（本地 engine/versions/ + GitHub tags） | ✅ 可用 |
| `daoyan batch` | 连拍全部未完成镜头 | ⬜ 计划中 |
| `daoyan up` / `down` | 引擎独立启停（shot 已内置自动拉起） | ⬜ 计划中 |
| `daoyan list [--json]` | 打印分镜表 | ⬜ 计划中 |

命令与数据格式规范见 [docs/COMMANDS.md](docs/COMMANDS.md) 与 [docs/DATA-MODEL.md](docs/DATA-MODEL.md)。
