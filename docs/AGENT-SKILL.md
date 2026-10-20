# 项目内 Agent Skill

dycli 的一等公民是 AI Agent。`init` 会在项目内生成一套自描述 Skill，clone 仓库的 Agent 不需要额外安装即可上手。

## 1. 目录

```text
.agents/skills/daoyan/
├── SKILL.md                 # 短：定位、铁律、核心闭环、命令索引
├── VERSION                  # 生成版本 + 文档哈希
└── reference/
    ├── commands.md          # 全部命令/参数/flags/示例
    ├── config.md            # project.json / machine.json / task / run
    ├── workflow.md          # 图模型 / graph ops / bindings / 节点目录
    ├── lifecycle.md         # local/remote / 机器锁 / GPU 接管 / cleanup
    ├── errors.md            # 错误码与恢复矩阵
    ├── protocol.md          # 异步协议：start/poll/wait/cancel/retry
    ├── story.md             # 多集剧本 / 拆解 / 设定资产 / 门禁
    └── recipes.md           # shot / batch / wrap / 首帧与接力
```

全部进 Git；`init --no-skill` 可跳过生成。

## 2. 生成机制

- 命令文档来自 `src/commands/registry.mts` 的同一份元数据（`args` / `flags` / `examples` / `jsonShape`）；
- `daoyan init` 与 `daoyan skill update` 调用同一个生成器；
- `VERSION` 记录 `generated_by`、`generated_at`、文档哈希与文件数；
- 生成是幂等的：内容不变时重复执行结果一致；
- Skill 要求 Agent 以 `daoyan help --json` 为最终权威，避免项目内 Skill 稍旧导致误用。

## 3. AGENTS.md 管理块

`init` / `skill update` 只维护带标记的区块：

```md
<!-- daoyan:skill:start -->
This project uses dycli/daoyan for ComfyUI workflows.
Before creating or running workflows, read `.agents/skills/daoyan/SKILL.md`.
Use `daoyan` commands with `--json`; do not edit `engine/`, `logs/`, or `.dycli/`.
Only one generation task runs per machine; if you get `machine_busy`, inspect the owner and retry later.
For multi-episode projects, use `daoyan story` commands and pass `--episode <id>` to shot/batch/wrap; check `story status` before generation.
<!-- daoyan:skill:end -->
```

规则：

- 文件不存在则创建；
- 有标记则替换标记块；
- 无标记则追加，保留用户内容；
- 重复执行不产生重复块；
- `--no-skill` 时既不生成 Skill，也不写管理块。

## 4. 版本与 stale

`VERSION` 示例：

```json
{
  "generated_by": "daoyan v0.1.0",
  "generated_at": "2026-10-19T15:30:12.000Z",
  "hash": "…",
  "files": 8
}
```

- `status --json` 的 `skill` 段：`present` / `version` / `stale` / `path`；
- `validate` 对缺失或 stale 给出 warning；
- CLI 升级后运行 `daoyan skill update`。

## 5. Agent 异步协议（Skill 摘要）

```text
workflow nodes → workflow apply/set → workflow validate
  → run（默认异步，返回 task_id）
  → status --task <id> --wait / logs --task <id> -f
  → runs/<id>/outputs
```

关键规则：

- 非 TTY 默认 JSON，Agent 不需要额外 flag；
- `run` 退出码 0 只代表 task 已创建；
- 同一设备只允许一个 generation task；`machine_busy` 带 owner 与 `retry_after_ms`；
- `--request-id` 幂等；
- `--wait` 的 SIGINT 只停止等待；取消用 `run cancel`。

## 6. 本轮不做

- 用户级 Skill 安装（`~/.claude/skills`、`~/.zcode/skills` 等）；
- npm postinstall 修改 Agent 目录；
- 写入项目外路径。

后续如需扩展，新增 target adapter 即可，不影响项目内 Skill。
