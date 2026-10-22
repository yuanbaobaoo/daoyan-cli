/** 项目内 Agent Skill 生成器 —— 从命令 registry 生成 `.agents/skills/daoyan/`。
 *  SKILL.md 保持短（定位/铁律/闭环/索引）；细节拆到 reference/。
 *  生成版本与文档哈希写入 VERSION；`status --json` 据此判断 stale。 */
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DaoyanCliError } from "../../shared/errors.mts";
import { nowIso, sha256, writeFileAtomic } from "../../shared/fs.mts";
import { AGENTS_FILE, SKILL_DIR } from "../project/types.mts";
import {
    BINDINGS_SCHEMA,
    GRAPH_OPS_SCHEMA,
    MACHINE_SCHEMA,
    PROJECT_SCHEMA,
    RUN_SCHEMA,
    TASK_SCHEMA,
    WORKFLOW_SCHEMA,
    errorCatalog,
} from "./contract.mts";
import { upsertAgentsBlock } from "./agents-md.mts";

/**
 * Skill 里的单个参数说明。
 */
export interface SkillArg {
    /**
     * 参数名。
     */
    name: string;
    /**
     * 类型说明。
     */
    type: string;
    /**
     * 是否必填。
     */
    required?: boolean;
    /**
     * 是否可变长（如镜号列表）。
     */
    variadic?: boolean;
    /**
     * 说明。
     */
    description: string;
}

/**
 * Skill 里的单个 flag 说明。
 */
export interface SkillFlag {
    /**
     * flag 名（含 --）。
     */
    name: string;
    /**
     * 取值类型。
     */
    type: string;
    /**
     * 是否必填。
     */
    required?: boolean;
    /**
     * 枚举值。
     */
    enum?: string[];
    /**
     * 默认值。
     */
    default?: unknown;
    /**
     * 说明。
     */
    description: string;
}

/**
 * Skill 生成所需的命令文档（CommandMeta 的结构子集）。
 */
export interface SkillCommand {
    /**
     * 命令名（含子命令）。
     */
    name: string;
    /**
     * 分组。
     */
    group: string;
    /**
     * 一句话说明。
     */
    summary: string;
    /**
     * 用法字符串。
     */
    usage: string;
    /**
     * 位置参数。
     */
    args?: SkillArg[];
    /**
     * flags。
     */
    flags?: SkillFlag[];
    /**
     * 示例。
     */
    examples?: string[];
    /**
     * 是否实现。
     */
    implemented?: boolean;
}

/**
 * Skill 版本文件结构。
 */
export interface SkillVersionFile {
    /**
     * 生成器版本（CLI 版本）。
     */
    generated_by: string;
    /**
     * 生成时间。
     */
    generated_at: string;
    /**
     * 文档哈希。
     */
    hash: string;
    /**
     * 生成的文件数。
     */
    files: number;
}

/**
 * Skill 状态（status --json）。
 */
export interface SkillState {
    /**
     * Skill 目录是否存在。
     */
    present: boolean;
    /**
     * Skill 目录相对路径。
     */
    path: string;
    /**
     * 已生成版本（可空）。
     */
    version: string | null;
    /**
     * 生成时间（可空）。
     */
    generated_at: string | null;
    /**
     * 与当前 CLI 的 registry 是否不一致。
     */
    stale: boolean;
    /**
     * 缺失文件。
     */
    missing_files: string[];
    /**
     * 缺失 AGENTS.md 管理块。
     */
    agents_block: boolean;
    /**
     * 期望的文档哈希（仅 stale 诊断时给出）。
     */
    expected_hash?: string;
}

/**
 * 生成渲染文本（Markdown 列表）。
 */
function renderArgs(args: SkillArg[] | undefined): string {
    if (args === undefined || args.length === 0) return "（无）";
    return args
        .map(
            (a) =>
                `- \`${a.name}\`（${a.type}${a.required === true ? "，必填" : ""}${
                    a.variadic === true ? "，可多个" : ""
                }）：${a.description}`,
        )
        .join("\n");
}

/**
 * 渲染 flags 表格。
 */
function renderFlags(flags: SkillFlag[] | undefined): string {
    if (flags === undefined || flags.length === 0) return "（无）";
    return flags
        .map((f) => {
            // 取值约束
            const bits: string[] = [f.type];
            if (f.required === true) bits.push("必填");
            if (f.enum !== undefined) bits.push(`枚举 ${f.enum.join("|")}`);
            if (f.default !== undefined) bits.push(`默认 ${JSON.stringify(f.default)}`);
            return `- \`${f.name}\`（${bits.join("，")}）：${f.description}`;
        })
        .join("\n");
}

/**
 * 生成 SKILL.md。
 */
function skillMd(version: string, commands: readonly SkillCommand[]): string {
    // 命令索引行
    const index = commands
        .filter((c) => c.implemented !== false)
        .map((c) => `- \`${c.usage}\` — ${c.summary}`)
        .join("\n");
    return [
        "---",
        "name: daoyan",
        "description: Agent 驱动的 ComfyUI 节点编辑器与执行运行时。需要创建/修改 ComfyUI 工作流、查询节点、执行图片/视频生成、分镜（shot/batch/wrap）、查看生成任务状态时使用。所有操作通过 daoyan/dycli 命令完成，不要直接调用 ComfyUI HTTP。",
        "---",
        "",
        "# daoyan（dycli）",
        "",
        `> 生成版本：v${version}。本文件由 \`daoyan skill update\` 维护；命令细节以 \`daoyan help --json\` 为最终权威。`,
        "",
        "## 定位",
        "",
        "dycli 是**程序化 ComfyUI 节点编辑器兼执行运行时**：",
        "",
        "- 查询节点目录、增删节点、连接端口、设置参数、校验工作流；",
        "- `run` / `shot` / `batch` 执行生成，管理引擎生命周期与产物；",
        "- 工作流、任务、运行记录都在项目内，可直接进 Git。",
        "",
        "## 铁律",
        "",
        "1. **不要直接调用 ComfyUI HTTP，也不要手工启动/停止引擎**；local 引擎由 task worker 按需拉起与停止。",
        "2. **不要编辑** `engine/`、`logs/`、`.dycli/`；本机配置由 `daoyan init` 管理。",
        "3. **机器决策一律加 `--json`**；非 TTY 默认就是 JSON。",
        "4. **同一设备同一时刻只允许一个 generation task**；拿到 `machine_busy` 时查看 owner，等待或 `run cancel`，不要并发重试。",
        "5. **`run` 默认异步**：返回 `task_id` 不代表成功；用 `status --task <id> --wait` 或轮询 `status --task <id>`。",
        "6. 不确定参数时先运行 `daoyan help --json`，不要猜测。",
        "",
        "## 快速开始",
        "",
        "```bash",
        "# 新项目（当前目录）",
        "daoyan init --mode=local --modelpath /data/models",
        "# 或连接已有 ComfyUI",
        "daoyan init --mode=remote --url http://gpu-box:8188",
        "",
        "# 查节点",
        "daoyan workflow nodes --filter KSampler --json",
        "daoyan workflow node KSampler --json",
        "```",
        "",
        "> local init 会探测 NVIDIA 驱动/CUDA/compute capability，自动安装匹配的 torch（如 cu130）；**不要手工 `pip install torch`，也不要猜 cuXXX**。普通依赖默认阿里云 PyPI，失败自动回退官方 PyPI；可用 `--mirror` / `--fallback-mirror` / `--torch-index` / `--torch-cuda` / `--torch-cpu` 覆盖。",
        "",
        "## 核心闭环",
        "",
        "```text",
        "workflow nodes → workflow apply / set → workflow validate → run → status --task --wait → runs/<id>/outputs",
        "```",
        "",
        "```bash",
        "daoyan workflow new t2v",
        "daoyan workflow import ./from-comfyui.json --name t2v",
        "daoyan workflow apply t2v --ops ./ops.json --json",
        "daoyan workflow validate t2v --json",
        "daoyan run t2v --set seed=42 --label shot:01 --request-id shot-01 --json",
        "daoyan status --task <task_id> --wait --json",
        "```",
        "",
        "## 多集短剧生命周期",
        "",
        "```text",
        "story init → 全局角色/场景/音色 → 单集剧本 sync/approve → 单集 breakdown → 参考资产 → 单集 shots → 分镜工作流 → shot/batch --episode → take finalize → wrap --episode",
        "```",
        "",
        "- 全局设定集在 `story/`，跨集共享；每集数据在 `episodes/<id>/`；",
        "- 每集剧本独立 revision；剧本变更只让该集 breakdown/shots stale；",
        "- 多集项目写入 / 生产 / 单集 show 必须显式 `--episode`；只读系列概览可省略；",
        "- 参考资产必须由 AI / 用户显式指定主参考，不存在自动取第一张；",
        "- 一个镜头重拍多次后必须用 `take finalize` 指定唯一**定稿稿件**；接力与合片只认它，其余产出是附加产物；",
        "- `shot` / `batch` / `retake` 有剧情门禁；`run` 不受限，用于生成参考图或试验。",
        "",
        "完整流程、模板与恢复见 `reference/story.md`。",
        "",
        "## 异步协议（摘要）",
        "",
        "- 创建 task：`run/shot/retake/batch` 默认异步，返回 `task_id`、`status`、`events_path`、`next_actions`；",
        "- 等待：`status --task <id> --wait`；SIGINT 只停止等待，不取消 worker；",
        "- 取消：`run cancel <id>`；",
        "- 幂等：`--request-id <id>`，重试返回同一个 task；",
        "- 事件：`logs --task <id> -f --json`。",
        "",
        "## 生命周期",
        "",
        "- local：任务开始拉起项目内 ComfyUI，任务结束（成功/失败/OOM/取消）`/free` + 停止；",
        "- remote：只走 HTTP，不碰远端进程；任务结束按 `free_after_task` 策略 `/free`；",
        "- GPU 接管：`project.json` 的 `gpu.takeover=true` 时自动卸载/驱逐内置目标，任务后恢复；默认关闭。",
        "",
        "## 版本与 Git",
        "",
        "- 工作流真源：`workflows/*.json`；每次 run 快照到 `runs/<run_id>/`，不可变；",
        "- 二进制产物走 Git LFS；记录不含绝对路径；",
        "- 不提供自定义 revision/tag：用 Git。",
        "",
        "## 错误恢复",
        "",
        "- `machine_busy`：等待 owner 或取消；不要并发。",
        "- `engine_oom`：降低分辨率/帧数/步数，或开启 `gpu.takeover`。",
        "- `model_not_found` / `node_missing`：检查 `modelpath` / custom nodes，修正后重试。",
        "- `workflow_invalid`：`workflow validate <name> --json` 按 `issues[]` 修正。",
        "- `engine_unreachable`：remote 模式不会代为启动；检查 URL/网络。",
        "- `update_failed`：GitHub 直连失败时默认尝试内置加速源（`--github-proxy none` 可关闭）；仍失败时用 `--manifest` 指向可达镜像，不要手工替换安装包。",
        "- `provision_failed`：先看 `details.stage`。`ensurepip` 缺包按下一行处理；`torch` / `smoke` 表示驱动与 wheel 不匹配，按 `details.next_actions` 用 `--torch-cuda` / `--torch-index` / `--torch-cpu` 恢复，**不要自行猜测或手工安装 torch**。",
        "- `provision_failed` 且日志含 `ensurepip is not available` / `Failing command: .../.venv/bin/python3`：Ubuntu/Debian 缺少 `python3.X-venv`；安装对应包、删除半成品 `engine/.venv` 后重跑 `daoyan init`。完整步骤见 `reference/lifecycle.md`。",
        "",
        "完整错误码见 `reference/errors.md`。",
        "",
        "## 命令索引",
        "",
        index,
        "",
        "## 参考",
        "",
        "- `reference/commands.md`：全部命令、参数、flag、JSON",
        "- `reference/config.md`：project.json / machine.json / task / run 记录",
        "- `reference/workflow.md`：图模型、graph ops、bindings、节点目录",
        "- `reference/lifecycle.md`：local/remote、机器锁、GPU 接管、cleanup",
        "- `reference/errors.md`：错误码与恢复矩阵",
        "- `reference/protocol.md`：Agent 异步协议（start/poll/wait/cancel/retry）",
        "- `reference/story.md`：多集剧本、拆解、设定资产、分镜门禁与剧集生命周期",
        "- `reference/recipes.md`：shot / batch / wrap / 首帧与接力",
        "",
    ].join("\n");
}

function commandsMd(commands: readonly SkillCommand[]): string {
    // 逐命令详情
    const blocks = commands.map((c) => {
        // 示例行
        const examples =
            c.examples !== undefined && c.examples.length > 0
                ? `\n示例：\n${c.examples.map((e) => `\`\`\`bash\n${e}\n\`\`\``).join("\n")}`
                : "";
        return `## ${c.name}

${c.summary}

\`\`\`text
${c.usage}
\`\`\`

参数：
${renderArgs(c.args)}

Flags：
${renderFlags(c.flags)}
${examples}
`;
    });
    return `# 命令参考

> 生成文件。权威定义：\`daoyan help --json\`。

${blocks.join("\n---\n\n")}
`;
}

/**
 * 生成 reference/config.md。
 */
function configMd(): string {
    return `# 配置与记录

## project.json（共享，进 Git）

\`\`\`json
{
  "name": "demo",
  "version": 2,
  "default_workflow": "workflows/t2v.json",
  "gpu": { "takeover": false },
  "comfyui": {
    "version": "v0.3.40",
    "custom_nodes": [
      { "name": "ComfyUI-VideoHelperSuite", "repo": "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git", "ref": "v1.7.4" }
    ]
  }
}
\`\`\`

- 不含绝对路径、不含机器差异；
- \`gpu.takeover\` 是项目级策略，默认 false；remote 忽略。

JSON Schema：

\`\`\`json
${JSON.stringify(PROJECT_SCHEMA, null, 2)}
\`\`\`

## .dycli/machine.json（本机，gitignored）

local：

\`\`\`json
{
  "machine_id": "mac-studio",
  "engine": {
    "mode": "local",
    "modelpath": "/data/models",
    "models_config": null,
    "port": 8188,
    "launch_extra": ["--lowvram"]
  },
  "overrides": {
    "workflows/t2v.json": { "5.width": 512, "5.height": 768, "7.steps": 20 }
  }
}
\`\`\`

remote：

\`\`\`json
{
  "machine_id": "mac-studio",
  "engine": { "mode": "remote", "url": "http://gpu-box:8188", "free_after_task": "when_idle" }
}
\`\`\`

优先级：workflow 文件 < machine overrides < \`--set\`。

JSON Schema：

\`\`\`json
${JSON.stringify(MACHINE_SCHEMA, null, 2)}
\`\`\`

## tasks/<task_id>/task.json

\`\`\`json
{
  "task_id": "t_20261019T153012-mac-7f3a",
  "kind": "run",
  "machine_id": "mac-studio",
  "request_id": "agent-7f3a-001",
  "status": "queued",
  "mode": "local",
  "runs": ["r_..."],
  "worker": { "pid": 12345, "started_at": "..." },
  "created_at": "...",
  "started_at": null,
  "finished_at": null,
  "error": null,
  "next_actions": ["status --task <id> --wait"],
  "options": { "workflow": "workflows/t2v.json", "sets": { "7.seed": 1101 } }
}
\`\`\`

\`events.jsonl\` 每行一个事件：\`{seq, ts, type, data}\`。

## runs/<run_id>/run.json

- 不含绝对路径；
- \`workflow.json\` 是实际提交的图快照；
- \`inputs.json\` 记录逻辑输入与输入文件哈希；
- \`outputs/\` 是下载后的产物；
- \`engine.cleanup\` 记录 interrupt/free/stop/scratch/gpu_restore；
- \`gpu\` 仅在 local 且发生接管时出现。

JSON Schema：

\`\`\`json
${JSON.stringify(RUN_SCHEMA, null, 2)}
\`\`\`
`;
}

/**
 * 生成 reference/workflow.md。
 */
function workflowMd(): string {
    return `# 工作流编辑

## 图模型

工作流就是 ComfyUI API JSON：

\`\`\`json
{
  "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "sdxl.safetensors" } },
  "6": { "class_type": "CLIPTextEncode", "inputs": { "text": "a cat", "clip": ["4", 1] } }
}
\`\`\`

- 顶层 key 是节点 ID；
- 连线是 \`[sourceNodeId, outputIndex]\`；
- 节点 ID 一旦创建保持稳定。

JSON Schema：

\`\`\`json
${JSON.stringify(WORKFLOW_SCHEMA, null, 2)}
\`\`\`

## 节点目录

- 数据源：ComfyUI \`/object_info\`；
- 缓存：\`.dycli/node_catalog.json\`；
- \`workflow nodes\` 默认读缓存；缺失时 remote 直接拉取，local 需要 \`--refresh\`（metadata session，不加载模型，取完即停）；
- 任务预检会强制刷新缓存。

\`\`\`bash
daoyan workflow nodes --filter KSampler --limit 20 --json
daoyan workflow node KSampler --json
daoyan workflow nodes --refresh --json
\`\`\`

## graph ops

\`\`\`bash
daoyan workflow apply t2v --ops ./ops.json --json
\`\`\`

\`\`\`json
{
  "ops": [
    { "op": "add_node", "id": "4", "class_type": "CheckpointLoaderSimple" },
    { "op": "set_input", "node": "4", "input": "ckpt_name", "value": "sdxl.safetensors" },
    { "op": "add_node", "id": "6", "class_type": "CLIPTextEncode" },
    { "op": "connect", "from": { "node": "4", "output": 1 }, "to": { "node": "6", "input": "clip" } },
    { "op": "set_input", "node": "6", "input": "text", "value": "a cat" }
  ]
}
\`\`\`

语义：

- **先全量校验，再原子写盘**；失败文件不变；
- \`connect\` 覆盖已有连线时返回 warning；
- \`remove_node\` 被引用时默认拒绝，\`force:true\` 同时删除关联连线；
- 结果含 \`assigned_ids\`、\`changed_nodes\`、\`removed_links\`、\`graph_sha256\`。

JSON Schema：

\`\`\`json
${JSON.stringify(GRAPH_OPS_SCHEMA, null, 2)}
\`\`\`

## bindings

\`workflows/<name>.bindings.json\`：

\`\`\`json
{
  "prompt": "5.prompt",
  "negative": "4.text",
  "seed": "7.seed",
  "steps": "7.steps",
  "first_frame": "0.image",
  "width": "5.width",
  "height": "5.height"
}
\`\`\`

- \`run\` 不需要 bindings；\`shot/batch\` 必须有 bindings，且至少映射 \`prompt\` 与 \`seed\`；
- JSON Schema：

\`\`\`json
${JSON.stringify(BINDINGS_SCHEMA, null, 2)}
\`\`\`

## 校验

- \`workflow validate <name>\`：离线结构 + bindings + overrides +（有缓存时）节点类/枚举；
- 任务预检：\`/object_info\` 在线权威校验，缺节点 \`node_missing\`，缺模型 \`model_not_found\`。

## 导入 ComfyUI 导出

\`workflow import\` 接受 Save (API Format) 的 JSON，不重命名节点；直接可执行。
`;
}

/**
 * 生成 reference/lifecycle.md。
 */
function lifecycleMd(): string {
    return `# 引擎生命周期

## local

\`\`\`text
task start → machine lock → 回收残留引擎 → 恢复旧 GPU 租约
  → GPU 接管（gpu.takeover=true）
  → spawn ComfyUI → /system_stats 就绪
  → 预检 → 上传 → 提交 → 轮询
  → 下载产物
  → cleanup：interrupt（如需）→ /free → SIGTERM/SIGKILL → GPU 恢复 → 释放锁
\`\`\`

- 任务之外没有常驻引擎；\`status\` 不拉起引擎；
- 依赖安装默认使用阿里云 PyPI（\`https://mirrors.aliyun.com/pypi/simple/\`），失败自动回退官方 PyPI；可用 \`--mirror\` / \`--fallback-mirror\` 覆盖；
- torch 由 \`init\` 根据驱动自动选择 CUDA tag，不需要也不允许手工安装；
- 唯一例外：\`workflow nodes --refresh\` 的 metadata session（不加载模型，取完 /object_info 立即停止）。

### init 的 Python/torch 工具链

\`daoyan init --mode=local\` 与 \`daoyan engine install\` 共用同一套逻辑：

1. 检查 venv 的 \`python\` / \`pip\`；不完整则删除 \`engine/.venv\` 重建（只删 dycli 管理的 venv）；
2. 创建 venv 前检查 \`ensurepip\`，缺少时给出与 Python 版本匹配的 \`python3.X-venv\` 命令；
3. 读取 \`nvidia-smi\` 的驱动版本、CUDA 上限、compute capability（多卡取最低）；
4. 在 PyTorch index 中选择 \`cuXXX <= 驱动 CUDA\` 且存在当前 Python ABI / manylinux wheel 的最高 tag；
5. 先装 torch/torchvision，再装 requirements；custom nodes 安装后重新 \`pip check\` + 自检；
6. CUDA 自检会真实分配显存（不是只看 \`torch.cuda.is_available()\`）；
7. 全部通过后写 \`engine/.venv/.dycli-toolchain.json\`（Python、平台、ComfyUI tag、requirements 哈希、驱动、tag、torch 版本）。

复用条件（缺一不可）：venv 健康、marker 存在且 Python/平台/ComfyUI tag/requirements/custom nodes 哈希一致、\`pip check\` 通过、自检通过。否则重新安装依赖，**不会返回假成功**。

常用覆盖参数（优先级 CLI > 环境变量 > 默认值）：

| 参数 | 环境变量 | 默认 |
|---|---|---|
| \`--mirror <url>\` | \`DYCLI_PIP_MIRROR\` | 阿里云 PyPI |
| \`--fallback-mirror <url\\|none>\` | \`DYCLI_PIP_FALLBACK_MIRROR\` | 官方 PyPI |
| \`--torch-index <url>\` | \`DYCLI_TORCH_INDEX\` | \`https://download.pytorch.org/whl\` |
| \`--torch-cuda <cuXXX>\` | \`DYCLI_TORCH_CUDA\` | 自动探测 |
| \`--torch-cpu\` | \`DYCLI_TORCH_CPU=1\` | 关闭 |
| \`--no-cache\` | — | 关闭 |

失败时读取 \`provision_failed.details\`：\`stage\`（ensurepip/venv/torch/requirements/requirements_conflict/pip_check/smoke/smoke_final）、\`driver\`、\`cuda_max\`、\`compute_cap\`、\`torch_tag\`、\`attempted_tags\`、\`last_error\`、\`offending_nodes\`、\`next_actions\`。Agent 只按这些字段恢复，不要猜 torch 版本。

### init 失败：ensurepip is not available

症状（\`daoyan init --mode=local\`）：

\`\`\`text
The virtual environment was not created successfully because ensurepip is not
available.
...
Failing command: <项目>/engine/.venv/bin/python3

ERROR[provision_failed] python3 -m venv 失败（退出码 1）。Ubuntu 需 python3-venv 包
\`\`\`

原因：Ubuntu/Debian 把 \`venv\` / \`ensurepip\` 拆成独立包；\`python3 --version\` 正常，但系统 Python 没有 pip 引导模块。与 ComfyUI 版本、GPU、k3s 无关。

处理步骤：

1. 确认解释器与实际版本：

   \`\`\`bash
   which python3
   readlink -f "$(which python3)"
   python3 -c 'import sys; print(sys.executable, sys.version)'
   python3 -m ensurepip --version
   \`\`\`

2. 安装与版本匹配的 venv 包（示例为 Python 3.12；其他版本替换数字）：

   \`\`\`bash
   apt-get update
   apt-get install -y python3.12-venv
   # 或元包：apt-get install -y python3-venv
   \`\`\`

   如果 ComfyUI 依赖需要编译，再补：

   \`\`\`bash
   apt-get install -y python3.12-dev build-essential
   \`\`\`

3. 删除失败留下的半成品 venv（重要，否则 dycli 可能误判为可复用）：

   \`\`\`bash
   rm -rf <项目>/engine/.venv
   \`\`\`

4. 重新执行 init（项目骨架会复用，不会覆盖已有 \`project.json\`）：

   \`\`\`bash
   daoyan init --mode=local --modelpath /data/models
   \`\`\`

5. 验证：

   \`\`\`bash
   python3 -m ensurepip --version
   python3 -m venv /tmp/venv-test && /tmp/venv-test/bin/pip --version
   rm -rf /tmp/venv-test
   \`\`\`

特殊情况：

- **无 root / 无 sudo**：不要反复重试 init；把 \`python3.X-venv\` 安装命令交给有权限的用户。
- **\`python3\` 不是系统 Python**（pyenv / conda / \`/usr/local/bin/python3\`）：apt 包可能无效。检查 \`which python3\`；改用带 \`ensurepip\` 的解释器，或使用 \`virtualenv\` / \`uv\`。
- **仍有其他 provision 失败**：阅读完整错误日志与 \`hint\`，不要只根据退出码猜测。

## remote

- 不启动、不停止、不杀远端进程；
- 任务开始探测 URL 与队列；队列忙返回 \`engine_busy\`，不提交；
- 任务结束按 \`free_after_task\`：
  - \`always\`：立即 \`/free\`；
  - \`when_idle\`（默认）：队列空闲才 \`/free\`；
  - \`never\`：不释放。

## 机器级单任务锁

- 锁文件 \`~/.dycli/machine.lock\`，按 OS 用户隔离；
- 同一设备同一时刻只允许一个 generation task；local 与 remote 共用；
- 第二个任务立即 \`machine_busy\`，不排队；
- 锁记录 owner（task_id / pid / project / mode / command / started_at）；
- owner 已死：下一次任务自动做 stale 恢复（task → interrupted、停残留引擎、恢复 GPU 租约）。

## GPU 接管（默认关闭）

- 开关：\`project.json\` 的 \`gpu.takeover\`；
- 平台：Linux + NVIDIA；其他平台给 \`gpu_unsupported\` 警告，任务继续；
- 内置模型服务：ollama、LM Studio、xinference —— 卸载模型，保留进程，任务后重载；
- 内置进程服务：vLLM、TGI、llama.cpp server、SGLang —— SIGTERM/SIGKILL，任务后 best-effort 重启；
- 容器：通过 cgroup 识别 Docker / Podman / containerd / k8s 内的 ollama/xinference/LM Studio/vLLM；只卸载模型，不停止容器或进程；通过端口映射、nsenter 或容器内 CLI/Python 访问，不需要 kubectl；
- 容器内 vLLM 仅在启用 --enable-sleep-mode + VLLM_SERVER_DEV_MODE=1 时自动 sleep；裸机 vLLM 仍走进程接管；容器内 TGI/llama.cpp/SGLang 没有通用无停机卸载能力时只提示，不停止容器；
- 未知进程/容器永不处理；
- 租约：\`~/.dycli/gpu/lease.json\`，异常退出后下一次 local 任务先恢复；
- 恢复失败：\`gpu_restore_failed\`，租约保留重试。

## 取消与信号

- \`run cancel <task_id>\`：worker 执行 interrupt → free → stop → restore，写 \`cancelled\`；
- \`--wait\` 前台 SIGINT：只停止等待，不取消 task；
- worker 被 SIGKILL：锁/租约保留，下一次任务 stale 恢复。
`;
}

/**
 * 生成 reference/errors.md。
 */
function errorsMd(): string {
    // 错误目录行
    const rows = errorCatalog()
        .map(
            (e) =>
                `| \`${String(e.code)}\` | ${e.retryable === true ? "可重试" : "不可重试"} | ${String(
                    e.retry_after_ms ?? "-",
                )} | ${String(e.hint)} |`,
        )
        .join("\n");
    return `# 错误码

错误信封：

\`\`\`json
{
  "ok": false,
  "schema_version": 1,
  "error": {
    "code": "machine_busy",
    "message": "...",
    "retryable": true,
    "retry_after_ms": 5000,
    "hint": "...",
    "task_id": "...",
    "run_id": null,
    "next_actions": ["status --task <id>", "run cancel <id>"],
    "details": {}
  }
}
\`\`\`

| code | 重试 | retry_after_ms | hint |
|---|---|---|---|
${rows}

## 恢复矩阵

- \`machine_busy\`：等待 owner 或 \`run cancel\`；不要并发。
- \`engine_busy\`（remote）：等远端队列空闲。
- \`engine_oom\`：降分辨率/帧数/步数，或开启 GPU 接管。
- \`model_not_found\` / \`node_missing\`：修 modelpath / custom nodes。
- \`workflow_invalid\`：按 \`issues[]\` 修图或 bindings。
- \`engine_unreachable\`：remote 不代启；检查 URL/网络。
- \`provision_failed\` + \`ensurepip is not available\`：安装 \`python3.X-venv\`（如 \`python3.12-venv\`），删除半成品 \`engine/.venv\`，重跑 \`daoyan init\`；详见 \`reference/lifecycle.md\`。
- \`provision_failed\` + \`details.stage=torch|smoke\`：驱动与 CUDA wheel 不匹配；按 \`details.next_actions\` 用 \`--torch-cuda\` / \`--torch-index\` / \`--torch-cpu\`，不要手工安装 torch。
- \`provision_failed\` + \`details.stage=requirements_conflict\`：requirements 固定了不同 torch；修改 pin 或显式 \`--torch-cpu\`。
- \`worker_crashed\` / \`machine_lock_corrupt\`：下一次任务会做 stale 恢复；锁损坏需人工确认后删除。

退出码：0 成功；1 业务失败；2 用法错误；130 取消/中断。
`;
}

/**
 * 生成 reference/protocol.md。
 */
function protocolMd(): string {
    return `# Agent 异步协议

## 启动

\`\`\`bash
daoyan run t2v --set seed=42 --label shot:01 --request-id agent-001 --json
\`\`\`

返回：

\`\`\`json
{
  "ok": true,
  "schema_version": 1,
  "data": {
    "task_id": "t_...",
    "run_id": null,
    "state": "queued",
    "events_path": "tasks/t_.../events.jsonl",
    "next_actions": ["status --task t_... --wait", "logs --task t_... -f", "run cancel t_..."]
  }
}
\`\`\`

退出码 0 只代表 task 创建成功，**不代表生成成功**。

## 轮询

\`\`\`bash
daoyan status --task <task_id> --json
daoyan status --task <task_id> --wait --json
\`\`\`

- 终态：\`succeeded|failed|cancelled|interrupted\`；
- \`--wait\` 的 SIGINT 只停止等待；task 继续，用 \`run cancel\` 才取消；
- 事件流：\`daoyan logs --task <task_id> -f --json\`。

## 取消

\`\`\`bash
daoyan run cancel <task_id> --json
\`\`\`

worker 执行 interrupt → free → stop → restore，然后写终态。

## 幂等

- \`--request-id <id>\` 写入 task；同一 id 重试返回原 task；
- 已 failed/cancelled 的任务重试仍返回原结果；修复后换新 id。

## machine_busy

同一设备只允许一个 generation task：

\`\`\`json
{
  "code": "machine_busy",
  "retryable": true,
  "retry_after_ms": 5000,
  "details": { "owner": { "task_id": "...", "pid": 123, "project": "..." } },
  "next_actions": ["status --task ...", "run cancel ..."]
}
\`\`\`

处理：等待 \`retry_after_ms\` 重试，或检查 owner / 取消。

## 观测 run

\`\`\`bash
daoyan status --run <run_id> --json
daoyan logs --run <run_id> --json
\`\`\`

产物在 \`runs/<run_id>/outputs/\`；\`run.json\` 记录 workflow 哈希、inputs、engine、cleanup、error。
`;
}

/**
 * 生成 reference/recipes.md。
 */
function recipesMd(): string {
    return `# Recipe：shot / batch / wrap

## 前置

- \`shots.json\` 描述镜头；
- 每个镜头使用 \`workflow\`（单镜 / 文件级 / project.default_workflow）；
- workflow 必须有 \`<name>.bindings.json\`，至少映射 \`prompt\` 与 \`seed\`。

\`\`\`json
{
  "workflow": "t2v",
  "meta": {
    "title": "短片名",
    "synopsis": "一句话剧情简介",
    "width": 768,
    "height": 1344,
    "fps": 24,
    "anchors": { "S1": "anchors/scene.png" },
    "characters": [
      { "id": "lin", "name": "林默", "description": "调查员" }
    ],
    "scenes": [
      { "id": "city", "name": "雨夜城市", "description": "霓虹与积水" }
    ]
  },
  "defaults": { "length": 48, "steps": 30, "cfg": 4.0, "negative": "低质量" },
  "style_prefix": "电影感",
  "shots": [
    {
      "id": "01", "slug": "opening", "title": "雨夜信号",
      "summary": "林默在雨夜发现线索",
      "seed": 1101, "first_frame": "S1",
      "characters": ["lin"], "scene": "city", "length": 48,
      "prompt": "..."
    },
    {
      "id": "02", "seed": 1102, "first_frame": { "relay": "01" },
      "characters": ["lin"], "scene": "city", "prompt": "..."
    }
  ]
}
\`\`\`

- \`title\` / \`summary\` / \`characters\` / \`scene\` / \`fps\` 是展示字段，不参与执行；\`daoyan web\` 会用来生成项目档案、人物/场景和分镜页；
- 人物和场景可在镜头里用 id 或名称引用；没有登记时 web 显示“未标注”，不影响 shot/batch；
- 旧 \`shots.json\` 可以不加这些字段，完全向后兼容。

## 拍摄

\`\`\`bash
daoyan shot 01 02 --json
daoyan status --task <task_id> --wait --json
daoyan retake 02 --json
daoyan batch --json
\`\`\`

- 一个 task 包含多个 run，共用一个引擎会话、一把机器锁；
- 已有成功 run 的镜头默认跳过（retake 强制）；
- 中途 OOM / 引擎崩溃：中断整个 task；普通业务错误继续后续镜头，task 最终 failed。

## 首帧与接力

- \`first_frame\`: 锚点 key -> \`meta.anchors\` 文件；
- \`{"relay":"01"}\`: 取上游镜头**定稿稿件**的产物尾帧（\`relay_frames/\` 按来源 run 缓存）；未定稿时按 \`project.story.enforce\` 回退最新成功 run（warn/off）或阻断（strict）；
- bindings 必须有 \`first_frame\` 映射（LoadImage.image 等）；
- 上传走 \`/upload/image\`，不写引擎 input 目录。

## 镜头定稿

\`\`\`bash
daoyan take list --episode ep01 --json
daoyan take finalize 01 --run <run_id> [--output <稿件名>] [--note <文本>] --json
daoyan take revoke 01 --episode ep01 --json
\`\`\`

- 定稿写入 \`takes.json\`（story 模式在 \`episodes/<id>/\`）；\`run.json\` 保持不可变，不带定稿标记；
- 校验：run 是本镜本集的 succeeded run，稿件是该 run 的视频产物且在工作区；
- 未定稿的产出是附加产物，不进入接力与合片。

## 合片

\`\`\`bash
daoyan wrap --json
daoyan wrap --select 01=<run_id> --select 02=<run_id> --json
\`\`\`

- 选段优先级：\`--select\` > 定稿稿件 > 最新成功 run；
- 输出 \`final/cut-<timestamp>.mp4\` + \`cut-<timestamp>.json\`（\`clips[].source\` 记 finalized / latest / explicit）；
- wrap 是 CPU 后处理，不占机器锁。

## 回滚 / 复跑

\`\`\`bash
daoyan run runs/<run_id>/workflow.json --set seed=999 --wait
\`\`\`

Git 管理工作流历史；run 快照不可变，重拍不覆盖。
`;
}

/**
 * 生成 reference/story.md —— 多集短剧生命周期。
 */
function storyMd(): string {
    return [
        "# 多集短剧生命周期",
        "",
        "dycli 不写剧本、不做拆解；它负责持久化、校验、阶段门禁与执行留档。",
        "",
        "## 目录",
        "",
        "```text",
        "story/series.json                 系列元数据",
        "story/characters.json             全局角色 / 形态 / 参考资产",
        "story/scenes.json                 全局场景",
        "story/voices.json                 全局音色",
        "story/assets/**                   参考图 / 音频（LFS）",
        "episodes/<id>/episode.json        剧集元数据",
        "episodes/<id>/script.md|json      单集剧本与 revision",
        "episodes/<id>/breakdown.json      单集拆解（制作范围与允许清单）",
        "episodes/<id>/shots.json          单集分镜（AI 生成决策写回点）",
        "episodes/<id>/story-map.json      可选：剧情图谱叙事标注（标题 / 重要度 / 故事时间 / 关系）",
        "final/<id>/cut-*                  单集成片",
        "```",
        "",
        "## 硬规则",
        "",
        "1. 任何一集剧本变化后，先 `story script sync --episode <id> --file <script.md>`，再继续其它操作。",
        "2. 剧本 revision 变化后，检查该集 `story status`；stale 的拆解 / 分镜先更新。",
        "3. 未通过该集 blockers 前，不执行 `shot` / `batch` / `retake`。",
        "4. 角色 / 形态 / 场景 / 音色 ID 一旦被引用不可修改；改名只改 name。",
        "5. 全局设定集只维护一份；新造型加 form，新地点加 scene，不要按集复制。",
        "6. 新角色 / 形态 / 场景 / 音色先加入全局设定集，再写本集 breakdown，最后写 shots。",
        "7. 单集拆解与设定资产未通过前，不制作该集分镜工作流；可以先做设定图工作流并用 run 验证。",
        "8. 参考图 / 音频必须通过 `story asset add` 入库，并显式指定主参考（--set-reference 或 story asset set-reference）；不得依赖自动取第一张。",
        "9. 生成参考图用 `run`，产物用 `story asset add --from-run` 入库；不要手工复制到 story/assets。",
        "10. 多集项目 `shot` / `batch` / `take` / `wrap` / 单集写入必须带 --episode；不得假设当前集。",
        "11. 用户确认某一集剧本后才 `story script approve`；AI 不能代替用户确认。",
        "12. 不要把 A 集的 run / final 当成 B 集的。",
        "13. 做生成决策前先读 `story map show --json`：只用其中 catalog 的角色 / 形态 / 场景 / 资产 id，不得编造。",
        "14. 同一角色有多个形态或多个资产时，必须在 shots.json 中显式写 form 与 asset_slots；不要依赖默认形态或槽位顺序。",
        "15. 同一场景的连续镜头优先保持同一形态与场景参考；需要连续性时优先 relay / 首帧接力。",
        "16. 有 blocker 级 gaps 时先补资产 / 修 workflow 槽位，不要用「换一张图凑」绕过。",
        "17. `story-map.json` 只放叙事标注；生成决策（workflow / asset_slots / first_frame / prompt）只写 shots.json。",
        "18. 镜头有多条产出时必须 `take finalize` 定稿一份再拍下游接力镜头与合片；不要用 `--allow-incomplete` 拿未定稿的产出凑片。",
        "",
        "## 标准顺序",
        "",
        "```text",
        "story init",
        "→ 全局 characters / scenes / voices",
        "→ 每集 script sync → approve",
        "→ 每集 breakdown set",
        "→ story asset add（参考图 / 音频，显式 set-reference）",
        "→ 每集 shots set",
        "→ story map show（读生成上下文）→ 选择 workflow / asset_slots / first_frame / prompt → 更新 shots",
        "→ workflow + bindings + <workflow>.assets.json",
        "→ shot / retake / batch --episode",
        "→ take list → take finalize 每镜定稿 --episode",
        "→ wrap --episode",
        "```",
        "",
        "参考图生成是例外：使用 `run` 独立执行，不经过 shot 门禁；产物入库后再写本集拆解 / 分镜。",
        "",
        "## 常用命令",
        "",
        "```bash",
        "daoyan story init",
        'daoyan story episode add --id ep02 --number 2 --title "第二集" --json',
        'daoyan story script sync --episode ep01 --file ./ep01.md --summary "初稿" --source ai --json',
        "daoyan story script approve --episode ep01 --json",
        "daoyan story characters set --file ./characters.json --json",
        "daoyan story scenes set --file ./scenes.json --json",
        "daoyan story voices set --file ./voices.json --json",
        "daoyan story breakdown set --episode ep01 --file ./ep01-breakdown.json --json",
        "daoyan story asset add --owner character:lin-mo --form default --id front --from ./front.png --set-reference --json",
        "daoyan story asset add --owner scene:rain-city --id establishing --from ./city.png --set-reference --json",
        "daoyan story asset add --owner voice:lin-mo-default --id sample --from ./voice.wav --set-reference --json",
        "daoyan story shots set --episode ep01 --file ./ep01-shots.json --json",
        "daoyan story shots show --episode ep01 --json",
        "daoyan story map show --episode ep01 --json",
        "daoyan story map build --episode ep01 --json",
        "daoyan story status --episode ep01 --json",
        "daoyan shot 01 --episode ep01 --json",
        "daoyan take list --episode ep01 --json",
        "daoyan take finalize 01 --run <run_id> --episode ep01 --json",
        "daoyan wrap --episode ep01 --json",
        "```",
        "",
        "## 单集拆解模板",
        "",
        "```json",
        "{",
        '  "version": 1,',
        '  "episode_id": "ep01",',
        '  "source_revision": 1,',
        '  "source_sha256": "<script.json.sha256>",',
        '  "beats": [{ "id": "s01", "summary": "电话亭发现信" }],',
        '  "characters": [{ "id": "lin-mo", "forms": ["night"], "notes": "本集只有夜行形态" }],',
        '  "scenes": ["rain-city"],',
        '  "voices": ["lin-mo-default"],',
        '  "notes": ""',
        "}",
        "```",
        "",
        "拆解是制作范围与允许清单：只列本集确实需要的对象；分镜只能使用这里声明的角色、形态、场景、音色。",
        "",
        "## 分镜引用",
        "",
        "```json",
        "{",
        '  "id": "01",',
        '  "characters": [{ "id": "lin-mo", "form": "night" }],',
        '  "scene": "rain-city",',
        '  "dialogue": [{ "character": "lin-mo", "text": "这封信不是写给我的。", "voice": "lin-mo-default" }],',
        '  "seed": 1101,',
        '  "prompt": "雨夜电话亭，林默穿黑色雨衣，手持旧信封"',
        "}",
        "```",
        "",
        "## 工作流资产槽位",
        "",
        "`workflows/<name>.assets.json`：",
        "",
        "```json",
        "{",
        '  "version": 1,',
        '  "slots": [',
        '    { "name": "hero", "kind": "character", "asset": "reference", "target": "10.image", "required": true },',
        '    { "name": "scene", "kind": "scene", "asset": "reference", "target": "20.image", "required": true },',
        '    { "name": "voice", "kind": "voice", "asset": "reference", "target": "30.audio", "required": false }',
        "  ]",
        "}",
        "```",
        "",
        '分镜可用 asset_slots 覆盖：`"hero": "lin-mo/night@front"`（owner@asset-id）；`reference` 表示使用显式主参考。',
        "",
        "## 生成上下文（story map）",
        "",
        "`daoyan story map show --episode <id> --json` 返回 AI 做生成决策所需的上下文：",
        "",
        "- `events`：每镜时间、场景、角色与形态；",
        "- `catalog`：每个形态 / 场景 / 音色的全部资产（present / LFS / 尺寸 / 主参考）；",
        "- `generation.workflows`：可选 workflow、bindings、资产槽位要求；",
        "- `generation.events[].workflow`：当前指派与逐槽位解析；",
        "- `generation.events[].continuity`：场景 / 形态变化、relay、anchor；",
        "- `generation.events[].render`：最新 run / 产物 / 失败；",
        "- `generation.gaps`：缺参考图、缺文件、缺 workflow、槽位不可解析等。",
        "",
        "推荐闭环：",
        "",
        "```bash",
        "daoyan story map show --episode ep01 --json > context.json",
        "daoyan story shots show --episode ep01 --json > shots.current.json",
        "# AI 基于 context + current shots 产出 shots.next.json（workflow / asset_slots / first_frame / prompt）",
        "daoyan story shots set --episode ep01 --file ./shots.next.json --json",
        "daoyan story map show --episode ep01 --json",
        "daoyan shot 01 02 --episode ep01 --json",
        "```",
        "",
        "没有候选 workflow 满足时：用 `workflow nodes` / `workflow node` 查节点契约，`workflow apply` 改图，补 `.assets.json` 槽位，`workflow validate` 通过后再写回 `shot.workflow`。",
        "",
        "## 恢复",
        "",
        "- `episode_required`：多集必须补 `--episode`；先看 `story episode list`。",
        "- `story_gate_failed`：按 `details.blockers` 修；先跑 `story status --episode <id>`。",
        "- `missing_reference`：入库资产并 `story asset set-reference`；不要用别的图凑。",
        "- `story_stale`：剧本 revision 变了；重新 breakdown / shots。",
        "- `asset_not_found` / `asset_invalid`：检查 owner、asset id、LFS 拉取与文件类型。",
        "",
        "## 每次对话结束前",
        "",
        "1. 如果有剧本变更：`story script sync`；",
        "2. 如果剧本 revision 变了：检查并更新该集 breakdown / shots；",
        "3. `story status --episode <id>` 确认 blockers；",
        "4. 不要只把最新剧本留在对话上下文里。",
        "",
    ].join("\n");
}

/**
 * 生成所有 Skill 文件（不含 VERSION）。
 */
export function generateSkillFiles(version: string, commands: readonly SkillCommand[]): Map<string, string> {
    // 生成文件表
    const files = new Map<string, string>();
    files.set("SKILL.md", skillMd(version, commands));
    files.set("reference/commands.md", commandsMd(commands));
    files.set("reference/config.md", configMd());
    files.set("reference/workflow.md", workflowMd());
    files.set("reference/lifecycle.md", lifecycleMd());
    files.set("reference/errors.md", errorsMd());
    files.set("reference/protocol.md", protocolMd());
    files.set("reference/story.md", storyMd());
    files.set("reference/recipes.md", recipesMd());
    return files;
}

/**
 * 计算生成文档的稳定哈希。
 */
export function skillHash(files: Map<string, string>): string {
    // 按路径排序后拼接
    const parts = [...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([p, c]) => `${p}\n${c}`);
    return sha256(parts.join("\n\u0000\n"));
}

/**
 * Skill 目录绝对路径。
 */
export function skillDir(root: string): string {
    return join(root, SKILL_DIR);
}

/**
 * 写入 Skill 与 AGENTS.md 管理块。
 */
export function writeSkill(
    root: string,
    version: string,
    commands: readonly SkillCommand[],
): { dir: string; hash: string; files: number } {
    // 生成文件
    const files = generateSkillFiles(version, commands);
    // 文档哈希
    const hash = skillHash(files);
    // 目录
    const dir = skillDir(root);
    try {
        for (const [rel, content] of files) {
            writeFileAtomic(join(dir, rel), content);
        }
        // 清理旧 reference 文件（只限本工具生成的 .md）
        const refDir = join(dir, "reference");
        if (existsSync(refDir)) {
            for (const name of readdirSync(refDir)) {
                if (!name.endsWith(".md")) continue;
                if (!files.has(`reference/${name}`)) rmSync(join(refDir, name), { force: true });
            }
        }
        // VERSION
        const versionFile: SkillVersionFile = {
            generated_by: `daoyan v${version}`,
            generated_at: nowIso(),
            hash,
            files: files.size,
        };
        writeFileAtomic(join(dir, "VERSION"), JSON.stringify(versionFile, null, 2) + "\n");
        // AGENTS.md 管理块
        upsertAgentsBlock(join(root, AGENTS_FILE));
    } catch (e) {
        if (e instanceof DaoyanCliError) throw e;
        throw new DaoyanCliError({
            code: "skill_write_failed",
            message: `生成项目内 Skill 失败：${e instanceof Error ? e.message : String(e)}`,
        });
    }
    return { dir, hash, files: files.size };
}

/**
 * 读取 Skill 状态并判断是否 stale。
 */
export function skillState(root: string, version: string, commands: readonly SkillCommand[]): SkillState {
    // 目录
    const dir = skillDir(root);
    // 期望文档
    const expected = generateSkillFiles(version, commands);
    // 期望哈希
    const expectedHash = skillHash(expected);
    // VERSION 文件
    const versionFile = join(dir, "VERSION");
    // 缺失文件
    const missing: string[] = [];
    for (const rel of expected.keys()) {
        if (!existsSync(join(dir, rel))) missing.push(rel);
    }
    if (!existsSync(versionFile)) missing.push("VERSION");
    // AGENTS.md 管理块
    const agentsFile = join(root, AGENTS_FILE);
    const agentsOk = existsSync(agentsFile) && readFileSync(agentsFile, "utf8").includes("<!-- daoyan:skill:start -->");
    if (!existsSync(join(dir, "SKILL.md"))) {
        return {
            present: false,
            path: SKILL_DIR,
            version: null,
            generated_at: null,
            stale: true,
            missing_files: missing,
            agents_block: agentsOk,
            expected_hash: expectedHash,
        };
    }
    // 读取版本
    let generatedAt: string | null = null;
    let generatedBy: string | null = null;
    let hash: string | null = null;
    try {
        // VERSION 内容
        const raw = JSON.parse(readFileSync(versionFile, "utf8")) as Partial<SkillVersionFile>;
        generatedAt = raw.generated_at ?? null;
        generatedBy = raw.generated_by ?? null;
        hash = raw.hash ?? null;
    } catch {
        // 版本文件损坏按 stale
    }
    // 期望的版本串
    const expectedBy = `daoyan v${version}`;
    return {
        present: true,
        path: SKILL_DIR,
        version: generatedBy,
        generated_at: generatedAt,
        stale: hash !== expectedHash || generatedBy !== expectedBy || missing.length > 0 || !agentsOk,
        missing_files: missing,
        agents_block: agentsOk,
        expected_hash: expectedHash,
    };
}
