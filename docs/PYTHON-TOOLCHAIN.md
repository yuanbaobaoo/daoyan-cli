# Python 依赖与 GPU 工具链方案

> 状态：已实施（P0 / P1 / P2，2026-10-19）
> 来源：`xe-k3s-worker-gpu-node` 环境恢复记录（Ubuntu 24.04 / RTX 3090 / 驱动 580.159.03 / CUDA 13.0 / Python 3.12.3）
> 目标：把 Python 依赖、CUDA 版本、torch 版本的选择从 AI/人工经验收回到 dycli 代码，做到**可探测、可复现、可恢复**。

## 1. 背景

恢复记录中最终可用的组合是：

```text
驱动：580.159.03
CUDA Version：13.0
GPU：RTX 3090（compute capability 8.6）
Python：3.12.3
torch：2.14.1+cu130
ComfyUI：v0.42.1
```

这个组合本身是匹配的，但过程暴露了多个问题：

1. `raw.githubusercontent.com` 被阻断，`install.sh` 引导失败；
2. `dycli update` 走 `npm pack git+…`，npm 在 HTTPS 失败后静默回退 SSH，最终报 `Permission denied (publickey)`；
3. 系统 Python 缺少 `ensurepip`，`python3 -m venv` 创建半成品后失败；
4. pip 被中断后，第二次 `init` 只根据 `venv/bin/python` + `ComfyUI/main.py` 判断“引擎已安装”，返回**假成功**；
5. torch 的 CUDA 版本完全由镜像默认 wheel 决定，AI 只能事后手动 `pip install`、换源、验证 CUDA；
6. 镜像覆盖不完整：USTC 缺 `comfyui-workflow-templates-media-assets-02==0.1.17`，阿里云某些 CDN 节点速度很慢。

本文只讨论这些问题如何由 dycli 统一解决，不修改 ComfyUI 本身。

## 2. 目标与非目标

### 2.1 目标

- `init --mode=local` 根据宿主机驱动、CUDA 能力、GPU 架构和 Python ABI 自动选择 torch 的 CUDA wheel。
- 安装结果必须经过真实 CUDA smoke test，不能只看 `pip install` 退出码。
- `init` 幂等：中断、失败、半成品目录不能产生“假成功”。
- 镜像可配置、可回退；默认阿里云 PyPI，缺包/失败时能自动使用 fallback。
- 错误输出结构化，Agent 能根据 `details` 做确定性恢复，而不是猜 torch 版本。
- `install.sh` / `update` 默认走 GitHub Release 的 `latest.json` + tgz，避免 npm 的 git/SSH 回退。
- 不自动执行 apt、不自动升级驱动、不停止未知 GPU 进程。

### 2.2 非目标

- 支持 AMD / Intel / Apple GPU 的自动 CUDA 选择（macOS 继续走平台默认 torch）。
- 自动修复 NVIDIA 驱动或安装系统包。
- 为所有历史 GPU 维护完整的“torch 版本 × 架构”静态矩阵。
- 接管未知 ComfyUI 进程。

## 3. 现状与代码落点

| 文件 | 当前职责 | 需要变化 |
|---|---|---|
| `src/core/provision/init-flow.mts` | `detectPython` / `createVenv` / `pipInstall` / `installCustomNodes` / `deployLocalEngine` | 增加工具链探测、torch 预安装、marker、venv 清理、fallback |
| `src/commands/init.mts` | 解析 `--mirror`，调用 `deployLocalEngine` | 增加 `--torch-index` / `--fallback-mirror` 等参数 |
| `src/commands/engine.mts` | `engine install` 调用 `installEngineAt` | 复用同一套工具链逻辑和参数 |
| `install.sh` | 默认 `npm pack git+…` | 默认 Release manifest/tgz，增加 install.sh Release 资产 |
| `src/commands/update.mts` | 默认 GitHub API + `npm pack git+…` | 默认 `latest.json`，GitHub API/git 作为旧版兜底 |
| `.github/workflows/release.yml` | 上传 tgz / latest.json / SHA256SUMS | 增加 `install.sh` 资产 |
| `src/core/agent/skill.mts` | 项目内 Skill | 增加工具链排障，明确“Agent 不选 torch” |

当前默认 pip 源已改为阿里云；本方案在此基础上继续扩展 fallback 和 torch CUDA index。

## 4. 核心设计

### 4.1 init 就绪判定与 toolchain marker

#### 4.1.1 marker 位置

```text
<project>/engine/.venv/.dycli-toolchain.json
```

marker 放在 venv 内：删除或重建 venv 时自动失效；`engine/` 已在 `.gitignore` 中，不会进仓库。

#### 4.1.2 marker 内容

```json
{
    "schema_version": 1,
    "installed_at": "2026-10-19T15:50:00.000Z",
    "python": "3.12.3",
    "platform": "linux-x64",
    "comfyui_tag": "v0.42.1",
    "requirements_sha256": "<sha256>",
    "driver": "580.159.03",
    "cuda_max": "13.0",
    "compute_cap": "8.6",
    "torch_backend": "cuda",
    "torch_tag": "cu130",
    "torch_index": "https://download.pytorch.org/whl",
    "torch": "2.14.1+cu130",
    "torchvision": "0.29.1"
}
```

CPU / macOS 情况：

```json
{
    "torch_backend": "cpu",
    "torch": "2.9.1",
    "torch_tag": null,
    "torch_index": null
}
```

#### 4.1.3 复用条件

`deployLocalEngine` 的 `already` 不能只看 `venv/bin/python` + `ComfyUI/main.py`，必须全部满足：

1. `venv/bin/python` 存在；
2. `venv/bin/pip --version` 成功；
3. marker 存在且可解析；
4. `marker.python`、`marker.platform`、`marker.comfyui_tag`、`marker.requirements_sha256` 与当前一致；
5. `marker.torch_tag` 与当前探测到的驱动兼容（`torch_tag_cuda <= cuda_max`）；
6. `pip check` 通过；
7. CUDA smoke test 通过（CPU 模式跳过 CUDA 部分）。

任一项失败：**重新执行依赖安装**，不能直接返回成功。

#### 4.1.4 写入时机

- 在 venv 创建、torch 安装、requirements 安装、custom nodes 安装全部成功之后；
- `pip check` 和 smoke test 通过之后再写；
- 任何一步失败或被中断，不写 marker；
- 旧 marker 在开始重装前删除。

#### 4.1.5 venv 生命周期

`createVenv`：

1. 如果 `venv/bin/python` 存在，继续执行 `venv/bin/python -m pip --version`；
2. pip 不可用：视为损坏 venv，删除 `engine/.venv` 后重建；
3. `python3 -m venv` 失败：删除半成品 `engine/.venv`，抛出带 apt 提示的 `provision_failed`；
4. venv 创建成功后立即检查 `bin/python` 与 `bin/pip`。

> 删除范围只限 dycli 管理的 `engine/.venv`，不删除 ComfyUI、模型或用户文件。

### 4.2 ensurepip 预检

在创建 venv 之前执行：

```bash
python3 -c 'import ensurepip'
```

失败时输出：

```text
当前 Python 3.12.3 缺少 ensurepip，无法创建带 pip 的 venv。
Ubuntu/Debian 请安装：apt-get install -y python3.12-venv
安装后删除 engine/.venv，再重跑 daoyan init。
```

包名从 `python3 --version` 推导：`3.12.3 -> python3.12-venv`；同时给出 `python3-venv` 元包作为备选。

不在 dycli 内自动执行 apt：恢复记录显示 apt 可能触发 `k3s-agent` 重启，这属于系统变更，应由用户确认。

### 4.3 GPU / 驱动探测

只在 Linux 上启用 CUDA 选择；macOS / 无 NVIDIA 走平台默认 torch。

#### 4.3.1 查询命令

优先使用结构化查询：

```bash
nvidia-smi --query-gpu=name,driver_version,compute_cap,cuda_version \
    --format=csv,noheader,nounits
```

不同驱动版本支持的字段不同，必须有回退：

1. `compute_cap` 不支持：单独查询或在已知 GPU 名称表中映射；
2. `cuda_version` 不支持：解析 `nvidia-smi` 输出头部的 `CUDA Version: X.Y`；
3. 两者都拿不到：返回结构化错误，要求用户传 `--torch-cuda` 覆盖，不能猜。

#### 4.3.2 多 GPU

取所有 GPU 中**最低的 compute capability** 作为兼容性依据；驱动版本是主机级，取唯一值。

#### 4.3.3 无 GPU

- Linux 无 NVIDIA：安装默认 torch（通常 CPU），warning `gpu_unsupported`；
- macOS：默认 torch，使用 MPS（ComfyUI 自身处理）；
- marker 记录 `torch_backend: "cpu"`，后续不要求 CUDA smoke test。

### 4.4 CUDA tag 选择

#### 4.4.1 发现 tag

从 PyTorch wheel index 根解析：

```text
https://download.pytorch.org/whl/
```

匹配 `cu\d+`，解析为 `(major, minor)`：

```text
cu118 -> 11.8
cu121 -> 12.1
cu126 -> 12.6
cu129 -> 12.9
cu130 -> 13.0
cu132 -> 13.2
cu134 -> 13.4
```

如果 index 不可达，使用内置兜底列表：

```text
cu130, cu129, cu128, cu126, cu124, cu121, cu118
```

#### 4.4.2 过滤与排序

```text
tag_cuda <= driver_cuda_max
按 tag_cuda 从高到低排序
```

示例：驱动 CUDA 13.0：

```text
候选：cu130, cu129, cu128, cu126, cu124, cu121, cu118
排除：cu132, cu134
```

驱动 CUDA 12.4：候选从 `cu124` 开始向下，`cu126/cu128/cu130` 全部排除。

#### 4.4.3 架构护栏

CUDA 13 不再支持 Maxwell / Pascal / Volta 等老架构，不能只看驱动版本。建议加保守规则：

```text
cuda_major >= 13 且 compute_cap < 7.5 -> 跳过所有 cu13x tag
```

最终仍以安装后的 smoke test 为准；架构表只用于减少无意义的大 wheel 下载。

#### 4.4.4 Python ABI / 平台检查

对每个候选 tag，检查 index 中是否存在：

- torch wheel：`cp<major><minor>` 与当前 Python 匹配；
- Linux x86_64：匹配 `manylinux*_x86_64` 或 `linux_x86_64`；
- torchvision wheel：同 tag 下存在匹配 Python/平台的 wheel。

不要只检查 `linux_x86_64`：PyTorch 现在大量使用 `manylinux_2_28_x86_64`。

找不到可用 wheel 时继续下一个 tag；全部失败则抛出 `provision_failed`，details 中列出尝试过的 tag。

### 4.5 torch / torchvision 安装顺序

#### 4.5.1 先装 torch，再装其余依赖

```bash
<venv>/bin/pip install torch torchvision \
    --index-url <torch_index>/<tag>
```

- torch 和 torchvision 必须同一条命令、同一个 index 安装，让 pip 解析匹配版本；
- 不在代码里写死 `torch==2.14.1`；由 index + Python/平台 + 驱动决定；
- 安装完成后读取实际版本写 marker。

#### 4.5.2 再装 ComfyUI 依赖

```bash
<venv>/bin/pip install -r requirements.txt \
    --index-url <pypi_mirror> \
    --retries 5 --timeout 60
```

ComfyUI v0.42.1 的 requirements 中 `torch` / `torchvision` 没有版本 pin，预装后不会被替换。

如果未来 requirements 出现 torch pin：

- 检测并报告冲突；
- 不静默覆盖已选好的 CUDA torch；
- details 中给出 requirements 中的 pin 和当前 torch 版本，让用户决定是否覆盖 requirements。

#### 4.5.3 custom nodes 后再次验证

custom node 可能安装自己的 requirements，甚至把 torch 换成 CPU 版。因此：

1. 所有 custom nodes 安装完成后重新执行 `pip check`；
2. 重新执行 CUDA smoke test；
3. 如果 torch 版本变化，更新 marker；
4. 如果 CUDA 不可用，报 `provision_failed`，details 中记录 custom node 名称和 `pip show torch`。

### 4.6 CUDA smoke test

`torch.cuda.is_available()` 不够，必须真实分配一次 GPU：

```python
import torch

print("torch", torch.__version__)
print("torch cuda", torch.version.cuda)
print("available", torch.cuda.is_available())
assert torch.cuda.is_available(), "torch.cuda.is_available() == False"

x = torch.zeros(1, device="cuda")
x.add_(1)
torch.cuda.synchronize()
print("device", torch.cuda.get_device_name(0))
```

失败时识别并报告这些错误：

```text
CUDA driver version is insufficient for CUDA runtime version
no kernel image is available for execution on the device
invalid device function
```

处理策略：

1. 如果还有更低 CUDA tag，重装一次（只重试一次，避免反复下载数 GB）；
2. 否则抛出结构化 `provision_failed`，包含 driver / cuda_max / compute_cap / torch_tag / torch 版本；
3. 不自动降级到 CPU torch 后继续，除非用户显式传 `--torch-cpu`。

### 4.7 镜像策略

#### 4.7.1 PyPI（普通依赖）

默认：

```text
primary: https://mirrors.aliyun.com/pypi/simple/
fallback: https://pypi.org/simple/
```

规则：

1. 优先 primary；
2. primary 失败（网络、缺包、CDN 卡住）时用 fallback 重试；
3. 保留 pip cache，重试不重复下载；
4. `--retries 5 --timeout 60`；
5. 记录最终使用的镜像。

不用 USTC 作为默认源：恢复记录显示它速度快但缺包；用户可以通过 `--mirror https://mirrors.ustc.edu.cn/pypi/simple/` 指定。

建议新增 `--fallback-mirror`，默认官方 PyPI；也允许 `--fallback-mirror none` 关闭。

#### 4.7.2 PyTorch CUDA wheel

默认：

```text
https://download.pytorch.org/whl
```

可用镜像（需要验证 index 结构）：

```text
https://mirror.sjtu.edu.cn/pytorch-wheels
https://mirrors.nju.edu.cn/pytorch/whl
```

规则：

1. `--torch-index` / `DYCLI_TORCH_INDEX` 显式指定优先；
2. 默认官方；官方不可达时可按配置尝试镜像；
3. 镜像必须存在 `<base>/<tag>/torch/` 与 `<base>/<tag>/torchvision/`；
4. 不使用任意第三方 GitHub 代理作为默认 PyTorch 源；
5. marker 记录最终使用的 `torch_index`。

> 阿里云 `pytorch-wheels` 页面不是标准 PEP 503 index，不能直接作为 `--index-url` 使用；不要把它写进自动 fallback。

### 4.8 CLI / 配置 / 环境变量

建议新增（命名可调整）：

| 参数 | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| `--mirror <url>` | `DYCLI_PIP_MIRROR` | 阿里云 PyPI | 普通依赖主源 |
| `--fallback-mirror <url>` | `DYCLI_PIP_FALLBACK_MIRROR` | 官方 PyPI | 普通依赖 fallback；传 `none` 关闭 |
| `--torch-index <url>` | `DYCLI_TORCH_INDEX` | `https://download.pytorch.org/whl` | CUDA wheel index 根 |
| `--torch-cuda <tag>` | `DYCLI_TORCH_CUDA` | 自动 | 强制 cuXXX，跳过探测 |
| `--torch-cpu` | `DYCLI_TORCH_CPU=1` | off | 显式 CPU 模式 |
| `--no-cache` | — | off | 给 pip 加 `--no-cache-dir` |

优先级：CLI > 环境变量 > 默认值。

`init` 和 `engine install` 使用同一套工具链逻辑与参数。

### 4.9 结构化错误

继续使用 `provision_failed`，不新增错误码；通过 `details` 区分阶段：

```json
{
    "code": "provision_failed",
    "message": "无法安装与驱动匹配的 CUDA torch",
    "retryable": true,
    "hint": "驱动 580.159.03 支持 CUDA 13.0；已尝试 cu130/cu129/cu128。可指定 --torch-index 或升级驱动。",
    "details": {
        "stage": "torch",
        "python": "3.12.3",
        "platform": "linux-x64",
        "driver": "580.159.03",
        "cuda_max": "13.0",
        "compute_cap": "8.6",
        "attempted_tags": ["cu130", "cu129", "cu128"],
        "torch_index": "https://download.pytorch.org/whl",
        "torch_version": null,
        "last_error": "...",
        "next_actions": [
            "daoyan init --mode=local --torch-index <mirror> ...",
            "升级 NVIDIA 驱动后重试",
            "daoyan init --mode=local --torch-cpu ..."
        ]
    }
}
```

Agent 只根据这些字段做恢复，不自行猜 torch 版本。

### 4.10 install.sh / update 默认走 Release manifest

恢复记录中 `raw.githubusercontent.com` 与 npm SSH 回退是独立的两个问题，建议一起修：

1. `release.yml` 额外上传 `install.sh` 作为 Release 资产；
2. 用户引导改为：

   ```bash
   curl -fsSL https://github.com/<repo>/releases/latest/download/install.sh -o install.sh
   bash install.sh
   ```

   `github.com` 可访问而 `raw.githubusercontent.com` 不可访问时，这条路径仍然可用。

3. `install.sh` 默认 `DAYOAN_MANIFEST_URL=https://github.com/<repo>/releases/latest/download/latest.json`；manifest 不可用时再回退 git；
4. `update` 默认源改为同一个 `latest.json`；GitHub API + `npm pack git+…` 只作为旧版本兜底；
5. update 失败时识别 `Permission denied (publickey)`，提示 npm 的 HTTPS→SSH 回退，并推荐 manifest 源。

这样新用户不需要手动执行 `dycli update source …`。

### 4.11 Skill / 文档

Skill 需要明确告诉 Agent：

- 不要手工 `pip install torch`，不要猜测 CUDA tag；
- `init` 会探测驱动并安装匹配的 torch；
- 失败时读取 `provision_failed.details`，按 `next_actions` 处理；
- 镜像缺包/速度慢时使用 `--mirror` / `--fallback-mirror`；
- 不要为了绕过依赖问题停止 k3s/docker 容器或修改系统 Python。

## 5. 数据与文件变化

新增：

```text
src/core/provision/toolchain.mts      # nvidia-smi 解析、CUDA tag 选择、index 探测、smoke test
engine/.venv/.dycli-toolchain.json    # 运行时生成，不进 Git
```

修改：

```text
src/core/provision/init-flow.mts      # createVenv / pipInstall / deployLocalEngine / installCustomNodes
src/commands/init.mts                 # 参数
src/commands/engine.mts               # 复用工具链
src/core/agent/skill.mts              # 排障说明
.github/workflows/release.yml        # install.sh 资产
install.sh                            # 默认 manifest
src/commands/update.mts               # 默认 manifest
docs/                                 # 本方案与命令文档
```

不修改 `project.json` / `machine.json`：工具链是引擎/机器本地状态，不是项目共享配置。

## 6. 测试计划

### 6.1 纯函数单测

- `parseCudaTag("cu130") -> [13, 0]`，`cu118 -> [11, 8]`，非法 tag 返回 null；
- `selectTorchTag(driver_cuda, python, platform, index)`：
    - 驱动 13.0 / Python 3.12 / RTX 3090 -> cu130；
    - 驱动 12.4 -> cu124；
    - 驱动 11.8 -> cu118；
    - 驱动 10.2 -> 无候选；
    - cu130 wheel 缺 cp312 -> 回退 cu129/cu128；
    - compute_cap 7.0 + 驱动 13.0 -> 跳过 cu13x。
- marker 校验：版本/哈希/驱动变化时失效；
- venv 判定：只有 python 没有 pip -> 重建；
- 镜像 fallback：primary 抛缺包 -> fallback 成功；
- CUDA smoke test 错误分类。

### 6.2 集成 / 手工验收

| 场景 | 期望 |
|---|---|
| RTX 3090 / 驱动 580 / CUDA 13.0 | 选 cu130，torch CUDA 可用 |
| 驱动 12.4 | 选 cu124，不尝试 cu126+ |
| Pascal / Volta + CUDA 13 | 跳过 cu13x 或 smoke test 失败并给出明确错误 |
| 无 NVIDIA | 安装默认 torch，warning，不阻塞 init |
| 阿里云慢/失败 | fallback 官方 PyPI |
| USTC 缺包 | fallback 补包 |
| pip 中途 Ctrl+C | 不写 marker；下次 init 重跑 |
| venv 只有 pip + ComfyUI 源码 | 不返回“已安装”，重跑依赖 |
| custom node 改坏 torch | 最终 smoke test 失败并指出 node |
| raw 被阻断 | Release install.sh 可用 |
| npm SSH 回退 | 默认 manifest 不触发；旧路径给出可读提示 |

## 7. 实施顺序

### P0：先消除“假成功”

1. `createVenv` 检查 `bin/pip`，失败清理半成品；
2. `deployLocalEngine` 的 `already` 增加 marker + `pip check`；
3. marker 只在完整成功后写入；
4. ensurepip 预检与准确 apt 提示。

验收：中断 pip 后再次 init，必须重新安装依赖；venv 只有 pip 时不能返回成功。

### P1：驱动感知的 torch 工具链

1. `nvidia-smi` 解析（driver / CUDA max / compute cap）；
2. CUDA tag 发现、过滤、wheel 可用性检查；
3. 先装 torch/torchvision，再装 requirements；
4. CUDA smoke test；
5. marker 记录 toolchain；
6. `init` / `engine install` 参数与错误 details。

验收：RTX 3090 / 驱动 580 自动选 cu130；驱动 12.4 自动选 cu124；错误输出可直接指导 Agent。

### P2：镜像与分发优化

1. 普通依赖 primary/fallback 两段式重试；
2. `--torch-index` 与 PyTorch 镜像支持；
3. install.sh 作为 Release 资产；
4. update/install.sh 默认 Release manifest；
5. custom node 后二次验证；
6. GPU 占用提示（可选）。

## 8. 风险与取舍

- **PyTorch 镜像滞后**：SJTU/NJU 等镜像可能只有较旧 torch；marker 记录实际版本，必要时用官方 index。
- **第三方镜像可信度**：默认官方 PyTorch index；镜像只在显式配置或内置受控 fallback 中使用。
- **老 GPU 架构**：CUDA 13 不支持 Maxwell/Pascal/Volta；compute capability 护栏 + smoke test 双保险，不保证所有老卡都能自动选到可用 torch。
- **多 GPU 混合架构**：按最低 compute capability 选择，可能牺牲新卡性能；可通过 `--torch-cuda` 显式覆盖。
- **网络速度**：大 wheel 下载可能很慢；一次重试策略避免反复下载数 GB。
- **不自动 apt / 不自动升级驱动**：保持系统变更由用户控制，避免 k3s-agent 等被意外重启。

## 9. 预期结果

完成后，用户在目标服务器上只需要：

```bash
cd /data/comfyui/150w
daoyan init --mode=local --modelpath=/data/comfyui/models/
```

dycli 自动完成：

1. 检查 Python / ensurepip / venv；
2. 读取 driver 580.159.03、CUDA 13.0、compute capability 8.6；
3. 选择 cu130；
4. 安装匹配的 torch/torchvision；
5. 用阿里云安装其余依赖，缺包时 fallback；
6. 执行 `pip check` 与真实 CUDA smoke test；
7. 写入 toolchain marker；
8. 返回结构化结果。

AI 不再需要手动判断“应该装哪个 torch / 换哪个镜像 / 是否算安装成功”。

---

本轮已按 P0/P1/P2 实施；代码落点见 `src/core/provision/toolchain.mts`（探测/选择/marker/smoke）、`options.mts`（参数优先级）与 `init-flow.mts`（venv/torch/依赖编排）。
