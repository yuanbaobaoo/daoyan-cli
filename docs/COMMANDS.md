# 命令参考

全局参数（可出现在任意位置；命令名之后的其余 `-` 参数由命令自行解析）：

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
| `daoyan-cli init <名称> [--version <tag>] [--use-existing <路径>] [--remote <url>] [--mirror <镜像>]` | 立项：宿主 Python 建 `.venv` → 选 ComfyUI 版本（缺省 GitHub 最新 tag）→ clone → 装依赖 → 生成骨架 → 写 project.json。`--use-existing` 接管既有安装（识别 ComfyUI/ 与 env/、engine/.venv、.venv 布局）；`--remote <url>` 远端模式（engine.mode=remote，不装引擎） | ✅ |
| `daoyan-cli validate [--json]` | 项目规则全量校验：接力链闭合无环、锚点存在、尺寸 32 倍数、帧网格 17k+5（警告）、seed 冲突、prompt 非空、workflow 节点命名约定、引擎目录（local，警告） | ✅ |

## 生产

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli shot <镜号...> [--steps N] [--timeout 小时] [--no-evict] [--no-up]` | 拍指定镜头：任务锁 → 引擎就位（local 自动拉起；队列占用拒绝）→ 首帧注入（锚点/接力 mtime 缓存）→ 提交 → 15s 轮询 → 产物落位（含 subfolder）→ manifest。已有产物自动跳过 | ✅ |
| `daoyan-cli retake <镜号...>` | 重拍（`shot --force` 的正式身份） | ✅ |
| `daoyan-cli batch [--no-evict] [--timeout 小时]` | 连拍全部未完成镜头，断点续跑 | ⬜ M1 |
| `daoyan-cli wrap` | 杀青：按分镜表顺序 ffmpeg concat 合片（libx264/yuv420p/crf18/faststart）交付 `final/`；不足两段报 `wrap_failed` | ✅ |

## 引擎

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli up` | 引擎就位：local 拉起进程（PID 文件、就绪探测）；remote 探测连通。shot 已内置自动执行 | ⬜ M1 |
| `daoyan-cli down [--force]` | 停止引擎（local 模式；任务运行中或队列非空时拒绝，`--force` 强制）。remote 不适用 | ⬜ M1 |
| `daoyan-cli engine ls` | 列出可用 ComfyUI 版本：本地 `engine/versions/*`（标当前）+ GitHub tags（前 15） | ✅ |
| `daoyan-cli engine install <版本 tag>` | 安装指定版本到 `engine/versions/<tag>/`（clone + venv + pip） | ✅ |
| `daoyan-cli engine use <版本 tag\|路径>` | 切换 project.json 的引擎指向（tag 或含 main.py 的目录） | ✅ |

## 运维

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli status [--json]` | 场记汇报：引擎/队列/任务锁/GPU（nvidia-smi）/内存（Linux）/镜头完成度（local 扫描产物，remote 看 manifests） | ✅ |
| `daoyan-cli logs [-f] [-n N] [--src daoyan-cli\|engine\|all]` | 日志查看，docker logs 语义（-f 跟随 0.5s、截断重跟）；清洗 ANSI 与 tqdm 刷屏 | ✅ |
| `daoyan-cli list [--json]` | 打印分镜表（镜号/首帧来源/接力关系/seed） | ⬜ M1 |
| `daoyan-cli doctor [--json]` | 环境自检：local 全量（引擎目录/venv/torch/ffmpeg/模型三件套/节点注册）；remote 跳过本地文件，查连通/节点注册/模型可见性 | ⬜ M1 |
| `daoyan-cli gpu status` | GPU 与容器模型占用一览 | ⬜ M1 |
| `daoyan-cli gpu evict` / `gpu restore` | 手动执行/恢复 GPU 让路（通常由 shot 自动完成） | ⬜ M1 |

## 元

| 命令 | 说明 | 状态 |
|---|---|---|
| `daoyan-cli help [命令] [--json]` | 帮助；`--json` 输出 agent 自描述：命令树/输出信封/退出码/错误码（替代早期的 discover 命令） | ✅ |
| `daoyan-cli update [--check]` | 自升级：检测 GitHub 最新 tag（semver 比较）；`--check` 仅检测。升级走 npm pack + tgz 两步安装，不依赖 npm registry | ✅ |

> 提示：`dyc` 与 `daoyan-cli` 是同一入口的两个 bin，完全等价。
> `dyc` 与数据工具 `dvc` 一字母之差，注意手滑。
