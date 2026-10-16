# 命令参考

全局参数（可出现在任意位置）：

| 参数 | 说明 |
|---|---|
| `--json` | 机器可读信封输出：`{"ok":true,"data":…}` / `{"ok":false,"error":{…}}` |
| `--project <路径>` | 指定项目目录；缺省自当前位置向上寻找 `project.json` |
| `--no-color` | 关闭彩色输出 |
| `-h, --help` | 帮助；`daoyan-cli help <命令>` 查看单命令详情 |
| `-v, --version` | 版本 |

退出码：`0` 成功 · `1` 业务失败 · `2` 用法错误 · `130` 被中断。

## 项目

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli init <名称> [--version <tag>] [--use-existing <路径>] [--remote <url>] [--mirror <镜像>]` | 立项：宿主 Python 建 `.venv` → 选 ComfyUI 版本 → clone → 装依赖 → 生成骨架 → 写 project.json（`engine.mode` 缺省 local）。`--use-existing` 接管既有安装；`--remote <url>` 远端模式直连（后续里程碑细化） | M3 |
| `daoyan-cli validate [--json]` | 项目规则全量校验：接力链闭合、锚点与素材存在、尺寸 32 倍数、帧网格对齐、seed 冲突、prompt 非空。`batch` 前自动执行 | M2 |

## 生产

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli shot <镜号...> [--steps N] [--timeout 小时] [--no-evict] [--no-up]` | 拍指定镜头：自动 up → validate → GPU 让路 → 首帧注入 → 提交 → 轮询 → 落位 → 恢复 | M1 |
| `daoyan-cli retake <镜号...>` | 重拍（`shot --force` 的正式身份） | M1 |
| `daoyan-cli batch [--no-evict] [--timeout 小时]` | 连拍全部未完成镜头，断点续跑 | M1 |
| `daoyan-cli wrap` | 杀青：ffmpeg 合片交付到 `final/`（预留转场扩展点） | M1 |

## 引擎

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli up` | 引擎就位：local 模式拉起进程（PID 文件、HTTP 就绪探测、关键节点注册验证）；remote 模式探测连通与节点注册 | M1 |
| `daoyan-cli down [--force]` | 停止引擎（local 模式；任务运行中或引擎队列非空时拒绝，`--force` 强制）。remote 模式引擎由远端管理，本命令不适用 | M1 |
| `daoyan-cli engine ls` | 列出可用 ComfyUI 版本（本地安装 + GitHub releases） | M3 |
| `daoyan-cli engine install <版本 tag>` | 安装指定版本 ComfyUI 到 engine/（外部组件，local 模式） | M3 |
| `daoyan-cli engine use <版本 tag\|路径>` | 切换项目使用的引擎版本（local 模式） | M3 |

## 运维

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli status [--json]` | 场记汇报：任务/进度/GPU/内存/已加载模型/镜头完成度 | M1 |
| `daoyan-cli logs [-f] [-n N] [--src daoyan-cli\|engine\|all]` | 日志查看，docker logs 语义；清洗 ANSI 与 tqdm 刷屏 | M1 |
| `daoyan-cli list [--json]` | 打印分镜表（镜号/首帧来源/接力关系/seed） | M1 |
| `daoyan-cli doctor [--json]` | 环境自检：local 全量（引擎目录/venv/torch/ffmpeg/模型三件套/节点注册）；remote 跳过本地文件，查连通/节点注册/模型可见性 | M1 |
| `daoyan-cli gpu status` | GPU 与容器模型占用一览 | M1 |
| `daoyan-cli gpu evict` / `gpu restore` | 手动执行/恢复 GPU 让路（通常由 shot 自动完成） | M1 |

## 元

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli discover [--json]` | agent 自描述：命令树/输出信封/退出码/错误码 | ✅ M0 |
| `daoyan-cli update` | 自升级（`npm install -g daoyan-cli@latest`；EACCES 时给出 nvm/prefix 指引） | ✅ M0 |

> 提示：`dyc` 与 `daoyan-cli` 是同一入口的两个 bin，完全等价。
> `dyc` 与数据工具 `dvc` 一字母之差，注意手滑。
