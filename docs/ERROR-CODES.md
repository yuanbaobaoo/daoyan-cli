# 错误码（v0.1）

## 信封

成功：

```json
{ "ok": true, "schema_version": 1, "data": {} }
```

失败：

```json
{
  "ok": false,
  "schema_version": 1,
  "error": {
    "code": "machine_busy",
    "message": "another task is running",
    "retryable": true,
    "retry_after_ms": 5000,
    "hint": "...",
    "task_id": "t_...",
    "run_id": null,
    "next_actions": ["status --task <id>", "run cancel <id>"],
    "details": {}
  }
}
```

`code` 一旦发布即冻结；新增字段向后兼容。`schema_version` 只在破坏性变更时递增。

## 错误目录

| code | retryable | retry_after_ms | 场景 / hint |
|---|---|---|---|
| `usage` | 否 | — | 参数缺失/未知；`daoyan help --json` |
| `not_implemented` | 否 | — | 保留占位 |
| `project_not_found` | 否 | — | 无 `project.json`；在项目内运行或 `--project` |
| `config_invalid` | 否 | — | project/machine/shots/缓存结构非法 |
| `validation_failed` | 否 | — | `validate` 有 error；看 `details.issues` |
| `workflow_invalid` | 否 | — | 图/bindings/引用非法；`workflow validate` |
| `skill_write_failed` | 否 | — | 生成 `.agents` 或 `AGENTS.md` 失败 |
| `external_tool_missing` | 否 | — | python3/git/ffmpeg 等缺失 |
| `update_failed` | 是 | — | 自升级失败 |
| `provision_failed` | 是 | — | 引擎部署失败；看 `details.stage`（ensurepip/venv/torch/requirements/pip_check/smoke），不要手工猜 torch |
| `artifact_download_failed` | 是 | — | `/view` 下载失败；引擎 scratch 保留 |
| `web_start_failed` | 否 | — | Web 服务监听失败；检查端口占用与 `--host`，省略 `--port` 让系统分配 |
| `story_not_found` | 否 | — | 未启用 story 模式；`daoyan story init` |
| `episode_not_found` | 否 | — | 剧集不存在；`story episode list` |
| `episode_required` | 否 | — | 多集项目缺少 `--episode`；`details.episodes` 列出可用集 |
| `story_conflict` | 是 | 0 | `--base-revision` / `--base-sha256` 不匹配；重新读取后重试 |
| `story_invalid` | 否 | — | 剧本/设定集/拆解/分镜/剧情图谱结构或引用错误；看 `details.issues` / `details.references` |
| `story_stale` | 否 | — | 单集拆解/分镜基于旧剧本；重新拆解或更新分镜 |
| `story_gate_failed` | 否 | — | 拍摄门禁未通过；看 `details.blockers` / `details.stage` |
| `asset_not_found` | 否 | — | owner / 资产 / run 产物不存在 |
| `asset_invalid` | 否 | — | 资产类型、大小、路径、哈希或 LFS 状态不合法 |
| `engine_not_ready` | 是 | 5000 | 引擎未就绪 |
| `engine_start_failed` | 否 | — | local 启动失败/就绪超时；看 `logs/engine-*.log` |
| `engine_stop_failed` | 是 | 10000 | local 停止失败；下次任务回收 |
| `engine_unreachable` | 是 | 10000 | remote 不可达；不代启 |
| `engine_busy` | 是 | 10000 | remote 队列忙；不提交、不 `/free` |
| `engine_crashed` | 是 | — | local 引擎执行中退出 |
| `engine_oom` | 是 | — | 显存不足；降分辨率/帧数，或开启 `gpu.takeover` |
| `cleanup_failed` | 否 | — | 附加在原始错误 `details.cleanup`；不覆盖主错误 |
| `machine_busy` | 是 | 5000 | 同设备已有 generation task；看 owner，等待或取消 |
| `machine_lock_corrupt` | 否 | — | 锁损坏；确认无任务后删除 `~/.dycli/machine.lock` |
| `task_not_found` | 否 | — | task id 不存在 |
| `run_not_found` | 否 | — | run id 不存在 |
| `run_assigned` | 否 | — | run 已归属某集，`run reassign` 只迁移未归属的 run |
| `worker_start_failed` | 是 | — | detached worker 启动失败 |
| `worker_crashed` | 是 | — | worker 退出；task `interrupted`，下次任务 stale 恢复 |
| `run_failed` | 否 | — | 通用执行失败 |
| `run_timeout` | 是 | — | 任务超时；提高 `--timeout` |
| `shot_failed` | 否 | — | 镜头失败（多 run task 汇总） |
| `shot_timeout` | 是 | — | 镜头超时 |
| `anchor_not_found` | 否 | — | 锚点 key/文件不存在 |
| `relay_upstream_missing` | 否 | — | 上游无成功 run/产物 |
| `take_not_found` | 否 | — | 该镜头没有定稿记录 |
| `take_invalid` | 否 | — | 定稿校验失败（非本镜/本集、非 succeeded、稿件不是视频或不在工作区） |
| `take_pending` | 否 | — | strict 门禁下镜头有产出但未定稿，阻断接力/合片 |
| `model_not_found` | 否 | — | loader 枚举不匹配；检查 modelpath/文件名 |
| `node_missing` | 否 | — | 引擎缺节点类；安装 custom node |
| `gpu_unsupported` | 否 | — | 平台不支持接管；任务继续 |
| `gpu_takeover_failed` | 否 | — | 某个内置目标（模型服务/裸机进程/容器内服务）卸载或驱逐失败；任务继续 |
| `gpu_restore_failed` | 是 | — | 恢复失败；租约保留，下次 local 任务重试 |
| `gpu_lease_corrupt` | 否 | — | 租约损坏；确认无任务后处理 `~/.dycli/gpu/lease.json` |
| `wrap_failed` | 否 | — | 片段不足/ffmpeg 失败 |

## 重试分类

- **立即重试**：`machine_busy`、`engine_busy`（按 `retry_after_ms`）；
- **修改配置后重试**：`engine_oom`、`model_not_found`、`node_missing`、`gpu_restore_failed`；
- **终止**：`workflow_invalid`、`usage`、`config_invalid`、`validation_failed`。

## 清理语义

- 未提交 prompt：不 `/free`；local 仍停止引擎；
- 提交后 OOM/取消/超时：`/interrupt` → `/free` → 停止 → GPU 恢复；
- `cleanup_failed` / cleanup errors 只作为附加信息；
- 产物下载失败时不删除引擎 scratch，保留人工恢复可能。
