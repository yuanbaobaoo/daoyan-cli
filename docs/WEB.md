# Web 只读查看器（v0.1）

`daoyan web` 在项目内启动一个临时的本地 HTTP 服务，用浏览器查看项目状态、分镜、任务、工作流、run 产出物与 final 成片。

它是**只读查看器**：

- 不启动 ComfyUI，不占 machine lock，不写项目文件；
- 默认只监听 `127.0.0.1`，端口由系统分配；
- `Ctrl+C` / `SIGTERM` 关闭服务；
- 前端资源内嵌在 `dist/cli.mjs`，不依赖 CDN 或外部静态目录。

## 1. 用法

```bash
cd <项目目录>
daoyan web
# 或 dycli web
```

启动后输出：

```text
daoyan web · demo · local
  Local:   http://127.0.0.1:53217
  Network: http://192.168.1.23:53217
  Ctrl+C 停止
```

`--host 0.0.0.0` 会列出全部非 internal 的 IPv4 网卡地址；`--host ::` 额外列出可达的 IPv6 地址（过滤 `fe80::/10` 链路本地地址）。

### flags

| flag | 默认 | 说明 |
|---|---|---|
| `--port <n>` | `0` | 0 表示系统分配；也可指定 1–65535 |
| `--host <addr>` | `127.0.0.1` | 监听地址；非 loopback 时页面数据可能被局域网访问；`0.0.0.0` / `::` 表示监听全部网卡 |
| `--open` | false | 启动后尝试用系统默认浏览器打开 |
| `--json` | 全局参数 | 输出一次启动信封后继续驻留 |

`--json` 示例：

```json
{
  "ok": true,
  "schema_version": 1,
  "data": {
    "url": "http://127.0.0.1:53217",
    "urls": {
      "local": ["http://127.0.0.1:53217"],
      "network": ["http://192.168.1.23:53217"]
    },
    "host": "0.0.0.0",
    "port": 53217,
    "project": "demo",
    "mode": "local"
  }
}
```

`url` 保留为「本机优先」的单个地址；`urls.local` / `urls.network` 是完整列表。

启动信封只输出一次；后续日志走 stderr。服务会一直运行，直到收到 SIGINT / SIGTERM。

如果 `.dycli/machine.json` 不存在，服务仍会启动：页面只展示共享数据（分镜、run、成片、工作流），并提示先运行 `daoyan init`。

## 2. 页面

### story 模式（多集）

`story/series.json` 存在时，Web 切换为系列 / 剧集视图：

| 页面 | 内容 |
|---|---|
| 概览 | 系列标题、剧集卡片（stage / 剧本 revision / blockers / 下一步） |
| 剧集详情 | 单集剧本、拆解、分镜、本集任务与成片；含剧情图谱（拓扑 / 时序 / 生成上下文）；hash 路由 `#/episode/<id>` |
| 角色 | 全局角色、形态、主参考图与其它资产 |
| 场景 | 全局场景与参考图 |
| 音色 | 音色档案、参考音频与试听 |
| 设定资产 | 全部参考图 / 音频，`*` 标记当前主参考 |
| 分镜 / 产出物 / 任务 / 成片 / 工作流 | 继续提供跨集或全局视图 |

story API：

```text
GET /api/episodes                     剧集列表
GET /api/episodes/:id                 单集完整视图（含 map）
GET /api/episodes/:id/{script,breakdown,shots,map,tasks,runs,artifacts,finals}
GET /api/story/{characters,scenes,voices,assets}
GET /media/story/<owner-relative-path>   参考图 / 音频
GET /media/final/<episode>/<name>        单集成片
```

### 剧情图谱与生成上下文

剧集详情页的「剧情图谱」区块有「拓扑图 / 时序图」两个视图：

- **拓扑图**：角色 / 形态与场景的关系，边宽表示出场镜头数；可切换「按角色 / 按形态」，点击节点筛选时序；
- **时序图**：按屏幕时间展示每镜的事件、场景、角色与形态、workflow、就绪状态、渲染状态；
- **生成上下文**：每镜解析到具体参考资产、workflow 资产槽位、连续性（场景 / 形态 / relay / anchor）、最新 run 与缺口；
- 缺参考图、缺文件、LFS 未拉取、缺 workflow、槽位不可解析等问题会显示为 warning / blocker，并给出 CLI 修复 hint。

数据分两层：

- **事实层**：每次从 `story/`、`episodes/<id>/breakdown.json`、`shots.json`、`workflows/`、`runs/` 实时推导，不落盘；
- **叙事层**：可选 `episodes/<id>/story-map.json`，只保存标题 / 摘要 / 重要度 / 故事时间 / 关系标签，通过 `daoyan story map set` 写入；Web 只读。

AI 通过 `daoyan story map show --episode <id> --json` 获取同一份生成上下文，决定每镜的 workflow、`asset_slots`、`first_frame` 与 prompt，再用 `daoyan story shots set` 写回。

legacy 项目继续使用原有 `/api/shots`、`/api/finals`、`/media/final/<name>`。

### legacy

| 页面 | 内容 |
|---|---|
| 概览 | 镜头/人物/场景/产出统计、剧情简介、项目档案、人物设定、场景设定、分镜一览、引擎/机器状态、最近产出与任务 |
| 分镜 | 每个镜头的标题、内容摘要、完整提示词、人物、场景、seed/帧数/时长/分辨率/采样参数、全部历史产物与 run 历史；支持按人物/场景/状态/关键词筛选 |
| 产出物 | 所有 run outputs 的扁平画廊；按镜头/状态/类型筛选，支持搜索 |
| 任务 | task 列表，展开查看 run 与 `events.jsonl` 时间线 |
| 成片 | `final/cut-*` 成片与 manifest 片段清单 |
| 工作流 | `workflows/*.json`、节点数、bindings、默认 workflow |

人物与场景来自 `shots.json` 的可选字段：

```json
{
  "meta": {
    "synopsis": "剧情简介",
    "characters": [{ "id": "lin", "name": "林默", "description": "调查员" }],
    "scenes": [{ "id": "city", "name": "雨夜城市", "description": "霓虹与积水" }]
  },
  "shots": [
    { "id": "01", "title": "雨夜信号", "summary": "林默发现线索", "characters": ["lin"], "scene": "city" }
  ]
}
```

- 人物/场景可写字符串或对象；镜头用 id 或名称引用；
- 可选 `fps` + 镜头 `length` 推导时长，也可用镜头 `duration` 显式指定；
- 没有登记人物/场景时，页面会显示“未标注”，不影响其他功能；
- 每个镜头会列出**全部历史产物**（不只是最新一条），可直接播放、下载或按 run 追溯。

视频与音频使用 HTML5 播放器；服务端支持 HTTP Range，因此可以拖动进度条。图片打开灯箱；JSON/文本提供预览；其他格式提供下载。

浏览器不支持的容器/编码（例如部分 `mkv`）会显示下载链接，v1 不做转码。

## 3. HTTP API

所有 API 返回统一信封：

```json
{ "ok": true, "schema_version": 1, "data": {} }
{ "ok": false, "schema_version": 1, "error": { "code": "not_found", "message": "..." } }
```

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查与项目名/模式 |
| GET | `/api/overview` | 概览数据（2 秒内存缓存，引擎探测超时 1.5 秒）；含 `storyboard` 项目档案 |
| GET | `/api/episodes` | story 模式剧集列表 |
| GET | `/api/episodes/:id` | 单集完整视图；含 `map` 剧情图谱与生成上下文 |
| GET | `/api/episodes/:id/map` | 剧情图谱 + 生成上下文（workflow 候选 / 槽位 / 连续性 / 渲染状态 / 缺口） |
| GET | `/api/episodes/:id/{script,breakdown,shots,tasks,runs,artifacts,finals}` | 单集子资源 |
| GET | `/api/story/{characters,scenes,voices,assets}` | 全局设定与资产 |
| GET | `/api/shots` | 分镜视图：人物/场景聚合、统计、每镜全部历史产物与 run；无 `shots.json` 时 data 为 `null` |
| GET | `/api/artifacts?limit=&label=&status=&kind=&search=` | 扁平化产物列表 |
| GET | `/api/runs/:run_id` | run 详情、inputs、outputs、task 事件 |
| GET | `/api/tasks` | 任务列表 |
| GET | `/api/tasks/:task_id` | 任务详情、run 摘要、事件 |
| GET | `/api/finals` | 成片列表与 manifest |
| GET | `/api/workflows` | 工作流列表 |
| GET/HEAD | `/media/run/:run_id/:name` | run 产出物流 |
| GET/HEAD | `/media/final/:name` | 成片流 |

只允许 `GET` / `HEAD`，其他方法返回 `405`。

### 媒体 Range

支持单区间：

```text
Range: bytes=0-
Range: bytes=100-199
Range: bytes=-500
```

- 命中返回 `206 Partial Content` + `Content-Range`；
- 非法区间返回 `416`；
- 多区间按完整文件返回 `200`；
- 响应包含 `Accept-Ranges: bytes`、`Content-Length`、`Content-Type`、`ETag`；
- `?download=1` 时使用 `Content-Disposition: attachment`。

## 4. 安全边界

- 默认绑定 `127.0.0.1`；使用 `--host 0.0.0.0` 时请确认局域网内没有不可信用户。
- 媒体 URL 不能直接映射文件系统路径：必须先命中 `run.json` 的 `outputs[]` 或 `final/` 目录；
- 解析后的 `realpath` 必须仍在允许目录内，阻止符号链接逃逸；
- loopback 监听时校验 `Host` 头，降低 DNS rebinding 风险；
- 不开放 CORS；无写接口，因此没有 CSRF 写风险；
- 响应带 `Content-Security-Policy`、`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`；
- API 不返回绝对路径；异常只写 stderr，不回传堆栈。

## 5. 数据与限制

- 只读读取 `project.json`、`.dycli/machine.json`、`shots.json`、`workflows/`、`tasks/`、`runs/`、`final/`；
- 单个损坏的 `run.json` / `task.json` / manifest 会被跳过，不会拖垮列表；
- 文件缺失或 Git LFS pointer 会在页面标记，并提示 `git lfs pull`；
- 前端轮询刷新（2–15 秒，按页面），页面隐藏时暂停；
- 不提供网页触发 `run` / `retake` / `batch` / `run cancel`；这些操作仍走 CLI。

## 6. 故障排查

| 现象 | 处理 |
|---|---|
| `web_start_failed` | 指定端口被占用；省略 `--port` 让系统分配，或换端口 |
| 页面显示“连接失败” | 确认 CLI 进程仍在运行；查看 stderr |
| 视频显示“文件缺失” | 检查 `runs/<id>/outputs/` 是否存在 |
| 视频显示“LFS 未拉取” | 运行 `git lfs pull` |
| 页面是旧版本 | 重启 `daoyan web`；浏览器强制刷新 |
