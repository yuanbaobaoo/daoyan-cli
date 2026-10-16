# daoyan-cli（导演）

> 剧本进，成片出。You prepare the story. The director shoots it.

**daoyan-cli** 是构建在 [ComfyUI](https://github.com/comfyanonymous/ComfyUI) 之上的生产编排 CLI，
为 AI Agent 与自动化流水线而生：你按固定规则整理好剧本、分镜表和素材，
剩下的全部交给它——引擎供应、GPU 编排、逐镜生成、接力控制、断点续跑、合片交付。
短剧、长剧皆宜：凡是能拆成分镜表的内容，在它眼里都是一条可重入的生产线。

## 安装

要求 Node ≥ 22 LTS（含 npm）与 git。

```bash
# 方式一：curl 一键脚本（直接从 GitHub 安装）
curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash

# 方式二：npm 直装 GitHub 仓库（脚本背后就是这一条）
npm i -g git+https://github.com/yuanbaobaoo/daoyan-cli.git

# 方式三：npm registry（包发布后可用）
npm i -g daoyan-cli
```

指定版本安装：`DAYOAN_REF=v0.1.0 curl -fsSL …/install.sh | bash`（接受 git tag / 分支 / commit）。
升级：重跑安装命令即可；已从 npm registry 安装的用户可 `daoyan-cli update`。

## 快速上手

```bash
daoyan-cli init 我的剧        # 立项：建 .venv、选版本、拉取 ComfyUI、生成项目骨架
daoyan-cli validate           # 开机前校验：分镜表 / 接力链 / 锚点素材全量核对
daoyan-cli up                 # 引擎就位
dyc shot 01                   # 开拍！（dyc 是 daoyan-cli 的短命令，完全等价）
dyc batch                     # 连拍（断点续跑，完成的镜头自动跳过）
dyc status --json             # 场记汇报（机器可读）
dyc wrap                      # 杀青：合片交付到 final/
```

## 它是什么：ComfyUI 的生产化拓展

一句话：**ComfyUI 负责生成，daoyan-cli 负责生产。**

ComfyUI 本身是交互式的节点画布，一次跑一张图；daoyan-cli 在其上补齐工程化的一层，
把「画布操作」变成「产线运营」——不重造任何生成能力，只做编排：

- **引擎供应（双模式，默认 local）**：`engine.mode = "local"`（缺省）时，`init` 调用宿主机 Python
  创建 `.venv`、从 GitHub 拉取指定版本的 ComfyUI 并装好依赖，`up/down` 托管引擎进程；
  `engine.mode = "remote"` 时直连已在别处运行的 ComfyUI（支持 https / 反代 URL），零安装、只调度
  （既定设计，细节随后续版本细化）。
  ComfyUI 始终是**外部组件**——只编排、不包含，随时可换版本、可替换。
- **GPU 编排**：生成前自动让路（卸载共享显卡上的容器模型），任务结束自动恢复，单卡跑多职。
- **镜头生产**：锚点首帧注入 + 组内尾帧接力，保证角色与空间连续性；单任务锁防并行冲突。
- **可靠性**：断点续跑、逐镜日志、进度可观测（人类可读与 `--json` 双形态）、每镜产出可复现 manifest。
- **自升级**：`daoyan-cli update` 一条命令更新自己。

## 面向 AI Agent

Agent 不需要读源码，就能驱动整条产线：

- **`daoyan-cli discover --json`**：自描述文档——命令树 / 参数 / 输出信封 / 退出码 / 全部错误码；
- **全命令 `--json`**：稳定信封 `{"ok":true,"data":…}` / `{"ok":false,"error":{code,message,details}}`；
- **错误码冻结**：`code` 一旦发布只增不改，Agent 可放心据此做分支决策；
- **headless**：零交互、零 Web UI，天然适合服务器、CI 与 Agent 工作流。

## 设计原则

1. **CLI-first，headless** —— 没有网页、没有画布；终端与脚本是一等公民。
2. **编排而非重造** —— ComfyUI、ffmpeg、nvidia-smi、k3s 全部是外部工具，daoyan-cli 用 TypeScript
   编排它们，体内零 Python、零运行时第三方依赖。
3. **规则即契约** —— 项目就是一组约定格式的文件（分镜表 / 素材目录 / 工作流模板），
   `validate` 让错误在开机前暴露，而不是拍完四小时之后。
4. **agent-native** —— 机器可读是一等公民：自描述、信封、稳定错误码。

## 开发

要求 Node ≥ 22 LTS（本仓库为 M0 骨架，测试尚未引入）。

```bash
npm install        # 安装开发依赖（typescript / tsup / @types/node）
npm run typecheck  # 类型检查
npm run build      # 打包 -> dist/cli.mjs
node dist/cli.mjs --help
```

### 目录导览

```
docs/        方案与规范：PLAN（总方案+架构）/ COMMANDS / DATA-MODEL / ERROR-CODES
templates/   init 生成的项目模板（project.json / shots.json / workflow.api.json）
src/
  cli.mts            入口：参数解析、分发、帮助
  commands/          命令注册表 + 已实现命令（discover / update）
  core/              领域模块：project / comfy / lock / provision / gpu / pipeline / obs / media
  shared/            错误码、--json 信封、日志、版本等横切设施
```

### 发布注意

- 分发以 GitHub 直装为主：`install.sh` / `npm i -g git+https://github.com/yuanbaobaoo/daoyan-cli.git`；
  npm registry 发布待账号 2FA 就绪后补充（包名 `daoyan-cli` 已确认未被占用）；
- 包名与仓库名统一为 `daoyan-cli`，不设别名包；
- 注意 `dyc` 与数据工具 `dvc` 一字母之差，README 与文档已注明。

## 状态

🚧 M0（骨架）完成：项目结构、命令框架、`--json` 信封、错误码体系、文档。
核心能力（引擎生命周期 / GPU 编排 / 生成管线）按 [docs/PLAN.md](docs/PLAN.md) 里程碑 M1–M4 交付。
