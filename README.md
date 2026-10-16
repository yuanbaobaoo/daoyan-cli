# daoyan-cli（导演）

构建在 ComfyUI 之上的生产编排 CLI，面向 AI Agent 与自动化流水线：剧本进，成片出。

> 🚧 **开发中（M0 骨架阶段）**：目前仅 `discover` 与 `update` 可用，其余命令尚未实现
> （执行会报 `not_implemented` 并指向计划交付的里程碑）。核心能力按里程碑推进，
> 计划见 [docs/PLAN.md](docs/PLAN.md)。

## 安装

要求 Node ≥ 22 LTS（含 npm）与 git。

```bash
# 方式一：curl 一键脚本（直接从 GitHub 安装）
curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash

# 方式二：npm 直装 GitHub 仓库
npm i -g git+https://github.com/yuanbaobaoo/daoyan-cli.git

# 方式三：npm registry（包发布后可用）
npm i -g daoyan-cli
```

指定版本安装（接受 git tag / 分支 / commit）：

```bash
DAYOAN_REF=v0.1.0 curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash
```

## 升级

```bash
# GitHub 直装用户：重跑安装命令（即取最新 master；可配合 DAYOAN_REF 固定版本）
curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash

# npm registry 安装用户：
daoyan-cli update
```

## 命令

全局参数：`--json`（机器可读输出信封）· `--project <路径>` · `--no-color` · `-h/--help` · `-v/--version`。
`dyc` 是 `daoyan-cli` 的短命令，完全等价。

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli discover [--json]` | agent 自描述：命令树 / 输出信封 / 错误码 / 退出码 | ✅ 可用 |
| `daoyan-cli update` | 自升级（npm registry 安装的用户） | ✅ 可用 |
| `daoyan-cli init <名称>` | 立项：本地装引擎（local，缺省）或 `--remote <url>` 直连远端 ComfyUI | ⬜ M3 |
| `daoyan-cli validate [--json]` | 项目规则全量校验（接力链 / 锚点 / 尺寸 / seed） | ⬜ M2 |
| `daoyan-cli shot <镜号...>` / `retake` | 拍摄 / 重拍镜头 | ⬜ M1 |
| `daoyan-cli batch` | 连拍全部未完成镜头（断点续跑） | ⬜ M1 |
| `daoyan-cli wrap` | 合片交付到 `final/` | ⬜ M1 |
| `daoyan-cli up` / `down [--force]` | 引擎启停（local 模式托管进程；remote 模式只连接） | ⬜ M1 |
| `daoyan-cli engine ls / install / use` | ComfyUI 版本管理（local 模式） | ⬜ M3 |
| `daoyan-cli status [--json]` | 任务 / 进度 / GPU / 内存 / 镜头完成度 | ⬜ M1 |
| `daoyan-cli logs [-f] [-n N]` | 日志查看（docker logs 语义） | ⬜ M1 |
| `daoyan-cli list [--json]` | 打印分镜表 | ⬜ M1 |
| `daoyan-cli doctor [--json]` | 环境自检 | ⬜ M1 |
| `daoyan-cli gpu status / evict / restore` | GPU 编排（容器模型让路 / 恢复） | ⬜ M1 |

未实现的命令执行时报 `not_implemented`（`--json` 模式输出同义错误信封）。
命令与数据格式规范见 [docs/COMMANDS.md](docs/COMMANDS.md) 与 [docs/DATA-MODEL.md](docs/DATA-MODEL.md)。
