# Web 查看器（v0.1）

`daoyan web` 在项目内启动一个临时的本地 HTTP 服务，用浏览器查看项目状态、分镜、任务、工作流、run 产出物与 final 成片。

它提供三类写操作：**确认剧本**、**生成 / 重新生成镜头**、**镜头定稿**：

- 页面本身不启动 ComfyUI；生成操作会创建异步 task，由 detached worker 执行；
- 剧集页可「确认剧本」；分镜卡可「生成 / 重新生成」；分镜页每条视频稿件可「定稿 / 撤销定稿」；
- 默认监听 `0.0.0.0`（局域网可访问），端口由系统分配；仅本机访问请传 `--host 127.0.0.1`；
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
| `--host <addr>` | `0.0.0.0` | 监听地址；默认监听全部网卡，页面数据可能被局域网访问；仅本机访问传 `127.0.0.1` |
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

### 项目模式（single / series）

所有项目都使用 story 布局；`project.json.production.mode` 决定页面形态：

- `single`：单视频，直接展示唯一视频；隐藏剧集列表与剧情图谱；
- `series`：多集，展示系列、剧集与剧情图谱。

左侧底部「项目管理」可切换模式与音频开关。`series → single` 仅当项目只有一集。

| 页面 | 内容 |
|---|---|
| 概览 | 项目统计、引擎与机器运行环境、最近产出与任务（不再展示视频/剧集） |
| 剧集 | series：分集列表，点击卡片进入详情；single：直接展示唯一视频详情（含剧本、拆解、分镜；隐藏剧情图谱） |
| 剧集详情 | 单集剧本、拆解、分镜、本集任务与成片；series 含剧情图谱；hash 路由 `#/episode/<id>`。分镜产出物默认只展示 1 条，其余「查看全部」弹窗；提示词默认展开并截断 5 行，超出显示「显示全部」 |
| 项目管理 | 视频模式（single / series）、音频开关；保存后热更新导航与页面 |
| 角色 | 全局角色、形态、主参考图与其它资产；可删除单张图（被分镜引用时至少保留一张，删主参考会自动切换） |
| 场景 | 全局场景与参考图；删除规则同角色 |
| 音色 | 音频开启时显示；关闭后隐藏 |
| 设定资产 | 全部参考图 / 音频，`*` 标记当前主参考 |
| 成片 | 选剧集、勾选本集已定稿镜头，按分镜顺序合成新成片；播放 / 下载已有 `final/cut-*` |
| 分镜 / 产出物 / 任务 / 工作流 | 继续提供跨集或全局视图 |

story API：

```text
GET /api/episodes                     剧集列表
GET /api/episodes/:id                 单集完整视图（含 map）
GET /api/episodes/:id/{script,breakdown,shots,map,tasks,runs,artifacts,finals}
GET /api/story/{characters,scenes,voices,assets}
GET /api/project                   项目设置（mode / audio / 剧集）
POST /api/project/settings         修改 mode / audio
POST /api/story/reference          设置角色形态主参考
POST /api/story/assets/remove      删除角色 / 场景参考图（被引用时拒绝删空）
POST /api/runs/outputs/remove      删除 run 产出视频（定稿引用自动撤销）
GET /api/finals/candidates?episode=<id>  本集可合片的定稿镜头
POST /api/finals/merge             勾选镜头合片（body `{episode_id, shots[]}`）
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

### 实时更新

服务运行期间持续扫描 `project.json` / `shots.json` / `story/` / `episodes/` / `workflows/` / `final/` 及 run / task 记录的时间戳，无需重启：

- 变更通过 `GET /api/events`（SSE）推送 `revision` 事件，页面收到后热更新当前视图与顶栏；
- `GET /api/revision` 返回当前版本号，供 SSE 不可用时轮询兜底；
- 每个 API 请求都会重读磁盘上的 project / machine / shots，避免启动快照；
- 参考图等媒体改为 `Cache-Control: private, no-cache` + ETag，同名文件替换后立即重新校验；
- 任务进度：任务卡展示当前阶段、运行时长（每秒走动）与事件数；`tasks/*/events.jsonl` 追加事件会触发 SSE，展开详情自动跟随最新事件。

旧 `/api/shots`、根 `final/` 与 legacy 项目结构已移除。

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
| GET | `/api/overview` | 概览数据（2 秒内存缓存，引擎探测超时 1.5 秒）；含 story 字段 |
| GET | `/api/episodes` | 剧集列表 |
| GET | `/api/episodes/:id` | 单集完整视图；含 `map` 剧情图谱与生成上下文 |
| GET | `/api/episodes/:id/map` | 剧情图谱 + 生成上下文（workflow 候选 / 槽位 / 连续性 / 渲染状态 / 缺口） |
| GET | `/api/episodes/:id/{script,breakdown,shots,tasks,runs,artifacts,finals}` | 单集子资源 |
| GET | `/api/story/{characters,scenes,voices,assets}` | 全局设定与资产 |
| GET | `/api/artifacts?limit=&label=&status=&kind=&search=` | 扁平化产物列表 |
| GET | `/api/runs/:run_id` | run 详情、inputs、outputs、task 事件 |
| GET | `/api/tasks` | 任务列表 |
| GET | `/api/tasks/:task_id` | 任务详情、run 摘要、事件 |
| GET | `/api/finals` | 成片列表与 manifest |
| GET | `/api/finals/candidates?episode=` | 本集镜头与定稿可用性（合片面板） |
| POST | `/api/finals/merge` | 勾选定稿镜头合片；body `{episode_id, shots[]}` |
| POST | `/api/story/reference` | 设置角色形态主参考；body `{character_id, form, asset_id}` |
| POST | `/api/story/assets/remove` | 删除角色 / 场景参考图；body `{owner_kind, owner_id, form?, asset_id}` |
| POST | `/api/runs/outputs/remove` | 删除 run 产出视频；body `{run_id, output}` |
| GET | `/api/workflows` | 工作流列表 |
| GET/HEAD | `/media/run/:run_id/:name` | run 产出物流 |
| GET/HEAD | `/media/final/:episode/:name` | 成片流 |
| POST | `/api/takes/finalize` | 镜头定稿；body `{shot_id, run_id, output?, note?, episode_id?}` |
| POST | `/api/takes/revoke` | 撤销定稿；body `{shot_id, episode_id?}` |
| POST | `/api/script/approve` | 确认剧本；body `{episode_id}` |
| POST | `/api/episodes/:id/shots/:shot_id/generate` | 生成 / 重拍镜头；body `{regenerate?: boolean}` |
| GET | `/api/events` | SSE 项目变更推送（`ready` / `revision`） |
| GET | `/api/revision` | 当前项目版本号 |

接受 `GET` / `HEAD` / `POST`，`Allow: GET, HEAD, POST`；POST 只用于上面的写接口，其他路径返回 `405`。

写接口的约束：

- 必须 `Content-Type: application/json`（跨源预检失败即被拒），请求体上限 64 KiB；
- 带 `Origin` / `Referer` 时必须与请求 `Host` 同源；
- 只接受白名单字段，稿件一律从 `run.json` 的 `outputs[]` 反查，**不接受任何文件路径**；
- 定稿校验与 CLI `take finalize` 同源；镜头生成会校验镜号、本机配置与剧情门禁，然后创建异步 task；
- 失败按 `400/404/409` 返回错误信封与 `hint`。

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

- 默认绑定 `0.0.0.0`，局域网内可访问项目数据与操作接口；仅本机访问请显式传 `--host 127.0.0.1`，并确认网络环境可信。
- 媒体 URL 不能直接映射文件系统路径：必须先命中 `run.json` 的 `outputs[]` 或 `final/` 目录；
- 解析后的 `realpath` 必须仍在允许目录内，阻止符号链接逃逸；
- loopback 监听时校验 `Host` 头，降低 DNS rebinding 风险；
- 不开放 CORS；写接口（定稿 / 确认剧本 / 镜头生成）均要求 JSON 内容类型 + 同源 `Origin`；
- 响应带 `Content-Security-Policy`、`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`；
- API 不返回绝对路径；异常只写 stderr，不回传堆栈。

## 5. 数据与限制

- 读取 `project.json`、`.dycli/machine.json`、`shots.json`、`workflows/`、`tasks/`、`runs/`、`final/`、`takes.json`；
- 写操作只有：定稿台账、确认剧本、单个镜头的生成 / 重拍 task；
- 单个损坏的 `run.json` / `task.json` / manifest 会被跳过，不会拖垮列表；
- 文件缺失或 Git LFS pointer 会在页面标记，并提示 `git lfs pull`；
- 项目源文件与任务事件通过 SSE 实时推送，前端同时保留 2–15 秒轮询兜底；
- 不提供网页触发 `batch` / `run cancel`；这些操作仍走 CLI。

## 6. 故障排查

| 现象 | 处理 |
|---|---|
| `web_start_failed` | 指定端口被占用；省略 `--port` 让系统分配，或换端口 |
| 页面显示“连接失败” | 确认 CLI 进程仍在运行；查看 stderr |
| 视频显示“文件缺失” | 检查 `runs/<id>/outputs/` 是否存在 |
| 视频显示“LFS 未拉取” | 运行 `git lfs pull` |
| 页面是旧版本 | 重启 `daoyan web`；浏览器强制刷新 |
