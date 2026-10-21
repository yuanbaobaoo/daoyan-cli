# daoyan-cli 安装与 Git 初始化改造方案

> 状态：已批准（按本方案实施）
> 范围：安装脚本（macOS/Linux + Windows）、`init` 的 Git 行为、README 重写
> 关联文档：[COMMANDS.md](COMMANDS.md)、[DATA-MODEL.md](DATA-MODEL.md)、[ERROR-CODES.md](ERROR-CODES.md)

## 1. 目标

1. **Git 纳入安装期强校验**：`install.sh` 与新增的 `install.ps1` 在下载任何产物之前检查 Node、npm、Git，缺失即失败。
2. **Windows 原生安装脚本**：新增 `install.ps1`，能力与 `install.sh` 对齐，并随 GitHub Release 一起分发。
3. **`init` 自动初始化 Git 仓库**：每次 `init` 幂等地创建/复用 Git 仓库，并维护受管 `.gitignore`。
4. **重写 README**：只保留「安装方法」与「命令说明」两部分，不写特性、架构、开发、License 等内容。
5. **保持既有原则**：不自动 `git commit`；不修改 `project.json` v2 结构；不自动安装系统级依赖。

### 非目标

- 不把 Python、ffmpeg 纳入安装期强校验（它们是命令级依赖，见第 2 节）。
- 不改引擎部署、任务调度、GPU 接管等运行时逻辑。
- 不新增 `doctor` / 环境诊断命令（可作为后续独立迭代）。
- 不在安装脚本里执行 `apt` / `brew` / `winget` 等系统包安装。

## 2. 依赖策略

| 依赖 | 安装期 | 需要它的场景 | 缺失行为 |
|---|---|---|---|
| Node >= 22 | **强校验** | 安装、所有命令 | 安装失败，给出 nvm / brew / winget 命令 |
| npm | **强校验** | `npm install -g`、`daoyan update` | 安装失败，提示 Node 安装不完整 |
| Git | **强校验** | `init`、`engine install`、update 的 git 回退 | 安装失败，给出 git 安装地址与平台命令 |
| Python >= 3.10 + ensurepip | 不校验 | `init --mode=local`、`engine install` | `init local` 前置检查失败；remote 不受影响 |
| 系统 pip | 不需要 | — | venv 自带 pip，只检查 `ensurepip` |
| ffmpeg / ffprobe | 不校验 | `shot` 接力抽帧、`wrap` 合片 | 用到时由现有 `external_tool_missing` 报错 |
| curl | 不校验 | 走代理的下载/更新；Windows 脚本可选加速 | 用到时惰性报错 |
| nvidia-smi | 不校验 | local GPU 探测 | 自动降级为 CPU 模式 |

### 决策说明

- **Git 为什么强校验**：本次要求 Git 成为硬依赖；同时 `init` 现在默认要建 Git 仓库、local 模式要 clone ComfyUI、custom nodes 与版本切换都依赖 Git。安装时就失败，比等到部署中途才报错更清晰。
- **Python 为什么不强校验**：`init --mode=remote` 完全不需要 Python。远程 GPU 用户不应因为本机没有 Python 而装不上 CLI。Python 的检查放在 `init local` 前置检查里，且在任何文件落盘之前。
- **只校验 Git 是否存在**，不设最低版本；当前使用的 `clone/fetch/checkout` 都是长期稳定命令。输出实际版本便于排障。
- 手动 `npm install -g <tgz>` 会绕过安装脚本的检查；README 的安装章节会明确「Node/npm/Git 仍是前置条件」。

## 3. 安装脚本

### 3.1 两个脚本的共同契约

检查顺序固定，全部在任何下载动作之前：

```text
node >= 22  →  npm  →  git  →  选择安装源（manifest / tgz / git）→ 下载 → SHA-256 → npm install -g → PATH 检查 → 版本验证
```

支持相同的环境变量：

| 变量 | 说明 |
|---|---|
| `DAYOAN_REF` | git 回退源使用的 tag / 分支 / commit，默认 `master` |
| `DAYOAN_REPO` | 自建 git 镜像地址 |
| `DAYOAN_MANIFEST_URL` | 自定义 `latest.json`；显式设为空则走 git 源 |
| `DAYOAN_TGZ_URL` | 直接安装指定 tgz（URL 或本地路径） |
| `DAYOAN_SHA256` | 覆盖/补充 tgz 的 SHA-256 |
| `DAYOAN_PROXY` | 下载与 npm 使用的代理 |

共同行为：

- 远程 tgz **必须**有 SHA-256（manifest 或 `DAYOAN_SHA256`），本地 tgz 允许跳过但给出 WARN。
- 安装命令统一为 `npm install -g --ignore-scripts --no-audit --no-fund <tgz>`。
- 安装后检查全局 bin 是否在 PATH；不在则输出 `npm prefix -g` 与手动添加方法。
- 最后执行 `<全局 bin>/dycli --version`，失败视为安装失败。
- 不在脚本内自动修改 shell 配置、不自动 `sudo`、不自动装系统包。

### 3.2 `install.sh` 改造

当前 [install.sh](../install.sh) 已硬校验 Node 与 npm，Git 只在 git 回退路径检查。改动：

1. 文件头「要求」改为：`node >= 22、npm、git`。
2. 在 npm 检查之后增加 Git 强校验（与 Node/npm 同级，早于下载）：

   ```bash
   command -v git >/dev/null 2>&1 \
     || die "未找到 git（dycli 必需）。安装：https://git-scm.com/downloads（macOS: brew install git；Ubuntu/Debian: apt-get install -y git）"
   ```

3. 环境检查通过后打印一行版本摘要，例如：

   ```text
   node v24.18.0 / npm 11.6.0 / git 2.45.0
   ```

4. 现有 manifest → tgz → git 回退流程保持不变。
5. 末尾验证继续使用 `dycli --version`。

不新增 Python 检查；本地部署的 Python 校验由 `init` 负责。

### 3.3 新增 `install.ps1`（Windows）

#### 入口形式

README 主推：

```powershell
irm https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.ps1 | iex
```

同时提供下载后执行（需要传环境变量或排查问题时）：

```powershell
$url = "https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.ps1"
$file = Join-Path $env:TEMP "install-daoyan.ps1"
Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file
powershell -NoProfile -ExecutionPolicy Bypass -File $file
```

为了让 `irm | iex` 不关闭用户当前 PowerShell，脚本内部**不使用 `exit`**，致命错误统一用 `throw`；以 `-File` 运行时 `throw` 仍会返回非零退出码。

#### 兼容性

- `#Requires -Version 5.1`，同时兼容 Windows PowerShell 5.1 与 PowerShell 7+。
- 不使用 `?.`、`??`、三元运算符等 PowerShell 7 专属语法。
- 设置 `$ErrorActionPreference = "Stop"`，并显式启用 TLS 1.2（Windows PowerShell 5.1 需要）。
- 下载优先使用 `curl.exe`（Windows 10 1803+ 自带，支持 http/https/socks5 代理）；不存在时回退 `Invoke-WebRequest -UseBasicParsing`（仅 http/https 代理，socks5 给出提示）。
- npm 优先解析为 `npm.cmd`，避免执行策略拦截 `npm.ps1`：

  ```powershell
  $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
  if ($null -eq $npm) { $npm = Get-Command npm }
  ```

- 全局 shim 为 `dycli.cmd` / `daoyan.cmd`，PATH 检查与版本验证都走绝对路径，避免当前会话 PATH 未刷新。

#### 流程

```text
检查 PowerShell 版本
→ 设置 TLS 1.2 / ErrorActionPreference
→ 检查 node（>=22）、npm、git（缺失即 throw）
→ 解析 DAYOAN_* 环境变量
→ manifest / tgz / git 回退（与 install.sh 等价）
→ 下载到临时目录 → Get-FileHash 校验 SHA-256
→ npm install -g --ignore-scripts --no-audit --no-fund <tgz>
→ 检查 <npm prefix -g>\dycli.cmd → --version
→ finally 删除临时目录
```

#### 错误提示（Windows）

| 缺失项 | 提示 |
|---|---|
| Node | `winget install --id OpenJS.NodeJS.LTS -e`，或安装 nvm-windows / fnm |
| npm | 提示 Node 安装不完整，建议用官方安装包或 nvm-windows 重装 |
| Git | `winget install --id Git.Git -e`，或 https://git-scm.com/download/win |
| PATH | 显示 `npm prefix -g`，通常是 `%APPDATA%\npm`，加入用户 PATH 后重开终端 |

### 3.4 Release 工作流

修改 [.github/workflows/release.yml](../.github/workflows/release.yml)：

1. `softprops/action-gh-release` 的 `files` 增加 `install.ps1`，使 Release 同时提供：

   - `install.sh`
   - `install.ps1`
   - `daoyan-cli-*.tgz`
   - `latest.json`
   - `SHA256SUMS`

2. 建议新增安装脚本冒烟测试（可在 `release.yml` 增加 job，或新增 `install-smoke.yml`）：

   - Ubuntu：`npm ci && npm run build && npm pack`，用本地 tgz + `DAYOAN_SHA256` 跑 `bash install.sh`。
   - Windows：同样的 tgz，用 `pwsh -NoProfile -File install.ps1` 跑通，验证 `npm.cmd` 解析、`Get-FileHash` 与 `dycli.cmd` PATH 检查。
   - 触发条件包含 `install.sh`、`install.ps1`、workflow 自身与 `package.json` 的变更。

## 4. `init` 自动初始化 Git 仓库

### 4.1 执行顺序

```text
解析参数（新增 --no-git）
→ 项目定位 / 已有 project.json 判断
→ 创建或复用项目骨架
→ ensureGitignore（受管块，幂等）
→ ensureGitRepo（git init，幂等）
→ 引擎部署 / 机器配置 / Skill
```

Git 层放在部署之前，失败可以在长时间 pip 安装前暴露。`init --mode=local` 的部署失败不会留下「未建 Git 仓库」的半成品。

### 4.2 `ensureGitRepo` 规则

使用 `git -C <root> rev-parse --show-toplevel` 判断，而不是只看 `.git` 是否存在：

| 场景 | 行为 | 结果状态 |
|---|---|---|
| 目录本身是 Git 工作区根 | 跳过 | `existing` |
| 位于父级 Git 仓库内 | **不嵌套初始化**，提示当前仓库根 | `inside_parent` |
| 不是任何仓库 | 执行 `git init` | `initialized` |
| 当前目录是 `$HOME` 或 `/` | 跳过并警告 | `skipped` |
| git 缺失 | 报 `external_tool_missing`（`--no-git` 可跳过） | 失败 |
| `git init` 执行失败 | 报 `provision_failed` | 失败 |

细节：

- 不传 `-b` / `--initial-branch`，尊重用户的 `init.defaultBranch`。
- 只执行 `git init`，**不 add、不 commit**，与 `DATA-MODEL.md` 的 Git 约定一致。
- 新增 `--no-git`：只跳过 `ensureGitRepo`；`.gitignore` 仍然维护。用于 monorepo 子目录或由用户自行管理仓库的场景。
- 返回分支名（`git symbolic-ref --short HEAD`），供 JSON 输出。
- 因为安装期已强校验 Git，`init` 发现 Git 缺失视为环境损坏，默认失败；`--no-git` 是唯一逃生口。

### 4.3 `.gitignore` 受管块

现有 [init-flow.mts](../src/core/provision/init-flow.mts) 的 `.gitignore` 只在文件不存在时写入，老项目永远拿不到新规则。改为与 `AGENTS.md` 相同的受管块模式：

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

合并规则：

- 文件不存在：写入整块，状态 `created`。
- 已有文件含标记块：原地替换块内容，保留块外所有用户内容，状态 `updated`。
- 已有文件无标记块：追加到文件末尾，状态 `updated`。
- 内容已一致：不写盘，状态 `unchanged`。
- 块追加在末尾；用户如需重新跟踪块内规则，可在块后再写 `!pattern` 或用 `git add -f`。

**不能忽略的目录**：`runs/`、`tasks/`、`inputs/`、`final/` 是共享产物，继续交给 `.gitattributes` 的 LFS 规则管理，不能加入 `.gitignore`。

### 4.4 `init` 输出变化

JSON 增加：

```json
"git": {
  "repo": "initialized|existing|inside_parent|skipped|disabled|failed",
  "branch": "main|null",
  "top_level": "/abs/path|null",
  "gitignore": "created|updated|unchanged"
}
```

人类可读输出增加一行，例如：

```text
Git 仓库已初始化（main），.gitignore 已更新
```

`--no-git` 时输出 `repo: "disabled"`，不视为错误。

### 4.5 `init --mode=local` 前置检查

安装期不硬校验 Python，因此把 `init local` 的前置检查提前到创建骨架之前：

- `git` 可执行（同时服务于 `ensureGitRepo` 与后续 clone）。
- `python3 >= 3.10`。
- `python3 -c "import ensurepip"` 成功。

缺失项合并为一个 `external_tool_missing` 错误，`details.missing[]` 与 `next_actions[]` 给出平台安装命令；`engine install` 复用同一检查。remote 模式只做 Git 检查（`--no-git` 可跳过）。

## 5. README 重写

README 只保留两个一级章节，不写其他内容（不写特性、架构、数据模型、开发、贡献、License 等）。

### 5.1 结构

```text
# daoyan（dycli）

## 安装
### 环境要求
### macOS / Linux
### Windows
### 指定版本 / 离线安装
### 安装器环境变量
### 验证安装

## 命令
### 项目
### 剧本与设定
### 工作流
### 生产
### 运维
### 引擎
### 元
```

### 5.2 安装章节内容

环境要求表格：Node >= 22、npm、Git 为安装必需；Python >= 3.10（仅 local）、ffmpeg/ffprobe（仅抽帧/合片）为命令级依赖。

macOS / Linux：

```bash
curl -fsSL https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.ps1 | iex
```

指定版本 / 离线安装：

```bash
npm install -g --ignore-scripts ./daoyan-cli-<version>.tgz
```

说明手动安装仍需满足 Node/npm/Git；官方安装脚本会在安装前检查。

安装器环境变量用一个小表列出第 3.1 节的六个 `DAYOAN_*` 变量。

验证安装：

```bash
daoyan --version
dycli --version
```

说明 `daoyan` 与 `dycli` 等价。

### 5.3 命令章节内容

按 CLI 的七个分组列出全部 40 个命令。格式统一为：

```text
- `daoyan <完整用法>` — <一句话说明>
```

用法直接取自 `src/commands/registry.mts` 的 `usage` 字段，避免 README 与 `help --json` 漂移。

| 分组 | 命令 |
|---|---|
| 项目 | `init`、`validate`、`skill update` |
| 剧本与设定 | `story init`、`story series`、`story episode`、`story script`、`story breakdown`、`story characters`、`story scenes`、`story voices`、`story asset`、`story shots`、`story status`、`story validate` |
| 工作流 | `workflow new`、`workflow import`、`workflow list`、`workflow show`、`workflow nodes`、`workflow node`、`workflow apply`、`workflow set`、`workflow validate` |
| 生产 | `run`、`run cancel`、`shot`、`retake`、`batch`、`wrap` |
| 运维 | `status`、`logs`、`web` |
| 引擎 | `engine ls`、`engine install`、`engine use` |
| 元 | `help`、`update`、`update proxy`、`update source` |

README 中 `init` 的用法需要加入 `--no-git`，并说明：默认自动初始化 Git 仓库；在父仓库内会跳过嵌套初始化；不自动 commit。

## 6. 代码改动清单

| 文件 | 改动 |
|---|---|
| `src/core/project/git.mts`（新增） | `ensureGitRepo`、`ensureGitignore`、`upsertGitignoreContent`、受管块常量与默认规则 |
| `src/core/project/types.mts` | 增加 `.gitignore` 文件常量（如需要，保持路径常量唯一声明） |
| `src/core/provision/init-flow.mts` | 删除内联 `.gitignore` 列表，改为调用 `ensureGitignore` |
| `src/commands/init.mts` | 解析 `--no-git`；调用 Git 两步；新增 local 前置检查；输出 `git` 字段 |
| `src/commands/engine.mts` | `engine install` 复用 local 前置检查 |
| `src/commands/registry.mts` | `init` 的 usage/flags/jsonShape 增加 `--no-git` 与 `git` |
| `install.sh` | 增加 Git 强校验与版本摘要；更新文件头要求 |
| `install.ps1`（新增） | Windows 安装脚本，能力对齐 `install.sh` |
| `.github/workflows/release.yml` | Release 附件加入 `install.ps1`；建议增加双平台安装冒烟 job |
| `README.md` | 按第 5 节重写，仅保留安装与命令 |
| `docs/COMMANDS.md` | `init` 增加 `--no-git` 与自动 Git 行为说明 |
| `docs/DATA-MODEL.md` | 更新「Git 约定」：自动 `git init`、受管 `.gitignore`、不自动 commit |
| `test/git-init.test.mts`（新增） | Git 初始化与 `.gitignore` 合并测试 |
| `test/readme.test.mts`（新增，建议） | 校验 README 覆盖 registry 中全部命令，防止文档漂移 |

## 7. 测试与验收

### 7.1 自动化测试

**Git / `.gitignore`**

- 空目录：`ensureGitRepo` 返回 `initialized`，`.git` 存在；二次调用返回 `existing`。
- 父仓库内的子目录：返回 `inside_parent`，子目录不产生 `.git`。
- `$HOME` / 根目录：返回 `skipped`，不执行 `git init`。
- `ensureGitignore` 三种状态：`created` / `updated` / `unchanged`。
- 用户已有内容保留，重复执行不重复追加块，块内容可被刷新。
- `git check-ignore` 验证：`engine/ComfyUI/main.py`、`engine/.venv/bin/python`、`.dycli/machine.json`、`logs/x.log` 被忽略；`runs/x/run.json` 不被忽略。
- `--no-git`：不创建 `.git`，但 `.gitignore` 仍生成。

**安装脚本**

- `install.sh` 在 PATH 中屏蔽 git 时，应在下载前失败并输出 Git 提示。
- Ubuntu CI：构建 tgz，使用本地 tgz + SHA 跑通 `install.sh`。
- Windows CI：同样的 tgz 跑通 `install.ps1`，验证 `npm.cmd`、`Get-FileHash`、`dycli.cmd` 检测。
- 远程 tgz 缺少 SHA-256 时两个脚本都必须失败。
- `DAYOAN_TGZ_URL` 指向本地文件时可跳过 SHA（给出 WARN）。

**README**

- 建议的 `readme.test.mts`：从 `COMMANDS` 读取全部命令名，断言 README 中包含 `daoyan <name>`；防止新增命令后 README 漏写。

**项目既有检查**

```bash
npm run format:check
npm run typecheck
npm test
```

### 7.2 手工验收

1. 全新 Linux/macOS 环境（无 Git）：`install.sh` 立即失败并给出安装命令。
2. 全新 Windows 环境（无 Git）：`install.ps1` 立即失败并给出 winget 命令。
3. 有 Git 的环境：两个脚本均安装成功，`daoyan --version` 正常。
4. 空目录执行 `daoyan init --mode=remote --url http://127.0.0.1:8188 --no-skill`：生成 `.git` 与 `.gitignore`。
5. 再次执行同一命令：Git 状态为 `existing`，`.gitignore` 为 `unchanged`。
6. 在已有父仓库的子目录执行 `init`：不产生嵌套 `.git`，输出 `inside_parent`。
7. `daoyan init --no-git ...`：不产生 `.git`，`.gitignore` 仍存在。
8. `git status` 中看不到 `engine/`、`.dycli/`、`logs/`、`.venv/`、`__pycache__/`；`runs/` 仍可被跟踪。

## 8. 风险与兼容性

| 风险 | 处理 |
|---|---|
| Git 强校验会拦住「只连远端」的用户 | 这是本次明确要求；README 明确前置条件；手动 npm 安装可绕过但需自行满足 |
| 已有项目重跑 `init` 会新增 `.gitignore` 受管块 | 保留块外内容，幂等；文档说明可手动删除后不再维护 |
| 父仓库内用户确实想要嵌套仓库 | 默认不嵌套；可手动 `git init`，或使用 `--no-git` 后自行初始化 |
| Windows PowerShell 5.1 执行策略 / TLS | 用 `npm.cmd`、显式 TLS 1.2、`throw` 代替 `exit`、`curl.exe` 优先 |
| Windows socks5 代理 | `curl.exe` 可用时支持；仅 `Invoke-WebRequest` 时提示只支持 http/https |
| README 与 registry 漂移 | 建议增加 `readme.test.mts`，命令元数据仍以 registry 为唯一来源 |
| 自动 Git 初始化误伤 `$HOME` | 对 `$HOME` 与 `/` 做保护性跳过并警告 |

## 9. 实施顺序

1. 新增 `src/core/project/git.mts`，接入 `init`，补 `test/git-init.test.mts`。
2. `init local` 前置检查（Git / Python / ensurepip）与 `engine install` 复用。
3. `install.sh` 增加 Git 强校验。
4. 新增 `install.ps1`，更新 Release 附件与双平台冒烟测试。
5. 重写 README，增加 `test/readme.test.mts`。
6. 更新 `COMMANDS.md`、`DATA-MODEL.md`。
7. 运行 `format:check`、`typecheck`、`test`，完成第 7.2 节手工验收。

## 10. 验收清单

- [ ] `install.sh` 在无 Git 环境安装失败，错误信息包含平台安装命令
- [ ] `install.ps1` 在 Windows 上完成安装并能执行 `dycli --version`
- [ ] Release 同时包含 `install.sh`、`install.ps1`、tgz、`latest.json`、`SHA256SUMS`
- [ ] `init` 在空目录创建 `.git` 与受管 `.gitignore`
- [ ] 已有项目重跑 `init` 只补齐/更新受管块，不覆盖用户内容
- [ ] 父仓库内不创建嵌套仓库，`$HOME` / `/` 不初始化
- [ ] `--no-git` 行为符合定义
- [ ] `runs/`、`tasks/`、`inputs/`、`final/` 未被错误忽略
- [ ] README 只包含安装方法与命令说明
- [ ] README 覆盖全部 40 个命令
- [ ] `npm run format:check && npm run typecheck && npm test` 全部通过

## 11. 待确认

1. 是否接受 `init` 在 Git 缺失时默认失败（`--no-git` 例外）？
2. Windows 安装入口是否以 `irm ... | iex` 为主推、下载后执行为备选？
3. README 是否只保留本方案的「安装 + 命令」两个一级章节，不加入任何项目简介？
