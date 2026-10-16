# 错误码

全部错误码为稳定字符串枚举（`src/shared/errors.mts`），同时登记在
`daoyan help --json` 的 `errorCodes` 字段中。`--json` 模式下失败信封为：

```json
{ "ok": false, "error": { "code": "relay_upstream_missing", "message": "…", "details": {} } }
```

| code | 默认退出码 | 触发场景 |
|---|---|---|
| `usage` | 2 | 参数缺失 / 未识别的参数或命令 |
| `not_implemented` | 1 | 命令尚未到达其里程碑（M0 占位期） |
| `project_not_found` | 1 | 向上未找到 project.json（`--project` 指错路径） |
| `config_invalid` | 1 | project.json 非法 JSON / 缺少必填字段 |
| `validation_failed` | 1 | validate 未通过（details 携带逐项结果） |
| `anchor_not_found` | 1 | first_frame 引用的锚点 key 或图片文件不存在 |
| `relay_upstream_missing` | 1 | 接力上游的成片不存在（应先拍上游） |
| `engine_not_ready` | 1 | 引擎未运行 / 就绪超时 / 关键节点未注册 |
| `engine_start_failed` | 1 | up 启动失败（details 携带日志尾） |
| `engine_busy` | 1 | 引擎队列已有执行中任务，拒绝并行提交 |
| `lock_held` | 1 | 已有任务运行中（details 携带 pid / 描述 / 开始时间） |
| `gpu_evict_failed` | 1 | 容器模型卸载失败（部分成功继续，失败累计到阈值报错） |
| `shot_failed` | 1 | 引擎返回 error / cancelled，或产物落位失败 |
| `shot_timeout` | 1 | 单镜等待超时（`--timeout`，默认 3 小时） |
| `external_tool_missing` | 1 | 外部组件缺失：python3 / git / npm / ffmpeg / k3s crictl 等 |
| `update_failed` | 1 | 自升级失败（GitHub 检测 / npm pack / npm install，含 EACCES 权限指引） |
| `provision_failed` | 1 | 引擎供应失败：venv 创建 / git clone / pip 安装 / 版本不存在 |
| `wrap_failed` | 1 | 合片失败：镜头不足 / ffmpeg 退出非零 |

## 约定

- 新增错误码必须同步三处：`errors.mts` 枚举、本文件、`help --json` 输出（自动来自枚举）。
- code 一旦发布即冻结，只能新增不能改义——下游 agent 依赖它做分支决策。
- 人类可读模式输出格式：`ERROR[code] message`（stderr）。
