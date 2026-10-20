# 短剧生命周期需求文档（多集版）

> 状态：草案（第 9 条待确认，其余已确认）  
> 版本：v0.3  
> 日期：2026-10-20  
> 适用：daoyan-cli v0.0.7+  
> 相关文档：[PLAN.md](PLAN.md)、[DATA-MODEL.md](DATA-MODEL.md)、[COMMANDS.md](COMMANDS.md)、[AGENT-SKILL.md](AGENT-SKILL.md)、[WEB.md](WEB.md)  
> v0.3 变更：确认第 14 节 1–8、10–13、15–16；第 9 条补充 `--episode` 策略对比；第 14 条改为「参考资产由 AI / 用户显式指定」。

## 0. 一句话理解

dycli 不负责写剧本、不做创作判断，而是把一部多集短剧的生产从「系列设定 → 单集剧本 → 单集拆解 → 设定资产 → 分镜 → 分镜工作流 → 拍摄 → 成片」变成一套**可持久化、可校验、可被 AI Agent 执行**的标准流程：

- **AI / 用户负责内容**：系列设定、每集剧本、角色、场景、形态、音色、参考图、分镜、工作流、审美判断；
- **dycli 负责真源与契约**：系列/剧集数据、版本、校验、依赖解析、阶段门禁、执行留档、只读展示。

### 0.1 关键决策（先看这 10 条）

1. **一个项目 = 一部多集短剧（系列）**；`episodes/<episode-id>/` 下每集有独立剧本、拆解、分镜与制作记录。
2. **`story/` 是系列级全局设定集**：角色、场景、音色、参考资产跨集共享，不按集复制。
3. **每集剧本独立 revision / 审批**；第 2 集改剧本不会让第 1 集 stale。
4. **每集有一份 `breakdown.json`**：声明本集使用的角色、形态、场景、音色；分镜只能引用这份清单内的对象。
5. **角色形态跨集演进**：新造型加一个 `form`，不新建角色；新地点加一个 `scene`，不复制场景体系。
6. **参考图 / 音频统一入库，主参考由 AI / 用户显式指定**：`story asset add` 复制、计算哈希、记录来源 run，走 Git LFS；dycli 不会自动拿第一张图当主参考。
7. **多集项目中，写入 / 生产 / 单集 show 命令必须带 `--episode`**（`script sync`、`breakdown set`、`shots set`、`shot`、`retake`、`batch`、`wrap`、`script show`、`breakdown show`）；系列概览类只读可省略；`run` 不受剧情门禁限制，`--episode` 只是可选归属标记。
8. **`runs/`、`tasks/` 保持根目录扁平存储**，记录增加 `episode_id`；不移动现有目录，避免破坏旧项目和跨集查询。
9. **成片按集隔离**：`final/<episode-id>/cut-*`；不合集、不混 run。
10. **Web 是只读的系列/剧集浏览器**：系列概览、剧集切换、全局设定、单集剧本/拆解/分镜/成片。

### 0.2 决策状态（对应第 14 节）

- **已确认**：1–8、10–13、15–16。
- **待确认**：9（`--episode` 是否强制显式）；7.2.2 给出详细对比与推荐，本文按推荐 A 编写。
- **已修正**：14（参考资产改为必须由 AI / 用户显式指定，取消自动取第一张）。

### 0.3 v0.3 具体变化

- 第 9 条：新增 7.2.1「哪些命令需要 `--episode`」和 7.2.2「策略对比」，当前按推荐 A 编写。
- 第 14 条：移除「第一张可用图」逻辑；新增 `story asset set-reference` / `--set-reference`；没有 `reference_asset` 就是 `missing_reference`。
- 工作流资产槽位从 `asset_role` 改为 `asset: "reference" | "<asset-id>"`；分镜映射支持 `owner@asset-id`。
- 新增/更新对应验收场景：未显式指定主参考、删除主参考、显式选择具体资产。

## 1. 背景与问题

dycli 当前已经具备：

- ComfyUI 工作流编辑、校验与执行；
- `run` / `shot` / `retake` / `batch` / `wrap` 生产链路；
- `runs/<id>/outputs` 不可变产物与 Git LFS 约定；
- `shots.json` 的分镜 recipe；
- `daoyan web` 只读项目查看器；
- 项目内 Agent Skill 生成机制。

距离「管理整个短剧生命周期」还缺少：

1. **没有多集模型**：现有项目只有一份根目录 `shots.json`，无法表达第 1 集、第 2 集各自的剧本与分镜；
2. **剧本没有真源**：外部 AI 与用户沟通后的最新剧本没有落盘，dycli 不知道当前剧本内容；
3. **角色 / 场景只是展示字段**：`shots.json` 里的 `meta.characters` / `meta.scenes` 不构成可校验的系列设定集；
4. **没有角色形态**：同一角色的不同服装、年龄、伤妆、变身等形态无法表达；
5. **没有音色档案**：角色音色、参考音频、台词与音色的关联不存在；
6. **没有设定资产**：角色 / 场景参考图没有统一的入库、哈希、来源与引用规则；
7. **没有单集拆解**：谁在本集出现、用哪个形态、哪些场景和音色，无法在分镜前固定；
8. **没有阶段门禁**：AI 可以在角色、场景、参考图都没确定时直接拍摄；
9. **工作流无法消费设定资产**：当前只支持 `first_frame` 单图上传，不能把多个角色参考图、场景图、音色参考音频注入工作流；
10. **剧本变更不会传播**：没有 revision / stale 机制，无法知道某一集的拆解和分镜是否基于旧剧本；
11. **成片与运行记录没有剧集归属**：无法可靠地按集筛选任务、run、final。

## 2. 目标

### 2.1 业务目标

建立一条 AI Agent 和用户都能遵循的多集标准生产流程：

```text
系列立项
  → 全局设定集（角色 / 场景 / 音色 / 参考资产）
  → 单集剧本入库
  → 单集拆解（角色形态 / 场景 / 音色 / beat）
  → 该集设定资产补全
  → 该集分镜
  → 该集分镜工作流
  → 拍摄 / 审片 / 重拍
  → 该集成片
  → 下一集
```

每一集的产物落在 `episodes/<episode-id>/`，全局设定和资产落在 `story/`，生产记录按 `episode_id` 归属。

### 2.2 成功标准

- 新项目可以从空目录开始，仅依赖 Skill 和 CLI 完成「系列立项 → 添加多集 → 第 1 集第一个镜头」全流程；
- 每一集有独立剧本 revision、哈希、同步时间、确认状态和变更摘要；
- 角色、场景、音色、形态、参考图均有稳定 ID，跨集复用；
- 每集拆解明确本集使用的角色 / 形态 / 场景 / 音色，分镜只能使用拆解内的对象；
- 某一集剧本变更后，只有该集的拆解和分镜被标记 stale，其它集不受影响；
- 分镜引用不存在的角色 / 形态 / 场景 / 音色，或缺少参考资产时，在拍摄前被明确阻断；
- 工作流可以确定性地消费角色参考图、场景参考图和音色参考音频；
- 任务、run、final 都带 `episode_id`，可按集筛选、合片和展示；
- 旧项目（没有 `story/`）完全不受影响；
- Web 可以只读查看系列概览、剧集列表、单集剧本/拆解/分镜/成片、全局设定与资产。

## 3. 职责边界

| 能力 | AI Agent | 用户 | dycli |
|---|---|---|---|
| 系列设定 / 分集规划 | 负责 | 可确认 | 只存储、校验引用 |
| 单集剧本创作 / 修改 | 负责 | 可提供、确认 | 只存储、版本化，不生成 |
| 单集拆解（角色形态 / 场景 / 音色 / beat） | 负责 | 可确认、调整 | 只校验结构、引用与完整性 |
| 全局角色 / 场景 / 音色设计 | 负责 | 可确认 | 存储档案，不生成 |
| 参考图 / 音色生成 | 编排工作流 | 可确认 | 执行工作流、收录产物，不评判质量 |
| 单集分镜设计 | 负责 | 可确认 | 校验引用、时长、工作流绑定 |
| 工作流制作 | 负责 | 可参与 | 提供节点编辑 / 校验 / 资产槽位契约 |
| 拍摄 / 重拍 / 合片 | 发起命令 | 决策 | 执行、按集留档、报告状态 |
| 阶段推进 | 按 Skill 规则 | 可批准 | 计算阶段、阻断不合规操作 |
| 项目展示 | 可读取 | 浏览 | `daoyan web` 只读展示 |

### 3.1 dycli 明确不做

- 不调用 LLM 写剧本、改剧本、做拆解；
- 不自动识别剧本中的人物和场景；
- 不生成图片、音频、视频（由 ComfyUI 工作流完成，dycli 只负责执行与收录）；
- 不做图像修图、抠图、换装、语音克隆算法；
- 不做审美评分、自动选片、自动审片；
- 不自动做跨集连续性判断（服装进度、时间线、伏笔回收）；
- 不做云端数据库、多人实时协作、自动 Git 提交。

### 3.2 「最新剧本」的边界

dycli 无法观察外部 AI 与用户之间的对话，因此：

- 「最新剧本」= **该集最后一次成功同步到 dycli 的 revision**；
- Skill 必须把「任何剧本内容变化后立即同步」列为硬规则；
- `story status --episode <id>` 和 Web 必须展示该集的 `synced_at`、`revision`、`status`；
- 每集的拆解和分镜必须记录其 `source_revision`，用于判断是否基于旧剧本；
- 不同集的 revision 相互独立，不能用一个全局剧本 revision 代替。

## 4. 概念模型

| 概念 | 作用域 | 说明 |
|---|---|---|
| 系列（series） | 整个项目 | 一部多集短剧；`project.json` + `story/series.json` |
| 剧集（episode） | 单集 | `episodes/<episode-id>/`，有独立剧本、拆解、分镜、成片 |
| 全局设定集（bible） | 系列 | `story/characters.json`、`scenes.json`、`voices.json`、`assets/` |
| 单集拆解（breakdown） | 单集 | 本集使用的角色/形态/场景/音色/beat 清单 |
| 单集分镜（shots） | 单集 | `episodes/<id>/shots.json`，执行 recipe |
| 资产（asset） | 系列 | 参考图、参考音频；可被任意集使用 |
| 单集制作上下文 | 单集 | `episode_id` + `episodes/<id>/` + `final/<id>/` + label 前缀 |
| 老项目（legacy） | 项目 | 没有 `story/`，继续使用根 `shots.json`、根 `final/`，行为不变 |

### 4.1 为什么设定集是系列级，而拆解是单集级

- 角色、场景、音色是**跨集资产**：第 1 集出现的林默，第 5 集还会出现；不能每集复制一份导致 ID 漂移。
- 每集拆解是**单集创作决策**：第 1 集用林默的夜行形态，第 2 集可能用日常形态；拆解负责声明「本集用哪些」。
- 分镜是**单集执行 recipe**：只引用本集拆解允许的角色/形态/场景/音色。
- 因此：
  - 新角色 / 新形态 / 新场景 → 先更新全局设定集；
  - 本集用哪些 → 写本集 `breakdown.json`；
  - 具体怎么拍 → 写本集 `shots.json`。

## 5. 生命周期与阶段

### 5.1 标准顺序

```text
┌──────────────────────────────────────────────┐
│ 0. 系列立项                                   │
│    story init → story episode add × N         │
└───────────────────┬──────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│ 1. 全局设定集（可跨集增量维护）                │
│    characters / scenes / voices / assets      │
└───────────────────┬──────────────────────────┘
                    ▼
       ┌──────────── 每一集循环 ────────────┐
       │                                    │
       │  2. 单集剧本入库                   │
       │     story script sync --episode    │
       │                ▼                   │
       │  3. 单集拆解                       │
       │     story breakdown set            │
       │                ▼                   │
       │  4. 该集设定资产补全                │
       │     run → story asset add          │
       │                ▼                   │
       │  5. 单集分镜                       │
       │     story shots set                │
       │                ▼                   │
       │  6. 单集分镜工作流                 │
       │     workflow + bindings + assets   │
       │                ▼                   │
       │  7. 拍摄 / 重拍                    │
       │     shot / retake / batch          │
       │                ▼                   │
       │  8. 该集成片                       │
       │     wrap --episode                 │
       │                                    │
       └────────────────────────────────────┘
```

关键点：

- **第 4 步的参考图生成使用 `run`**，因为此时还没有合法分镜；`run` 不受剧情门禁限制；
- **第 6 步才是「分镜工作流」**：它消费第 4 步的角色 / 场景 / 音色资产；在这之前制作的工作流只能是设定图工作流或试验工作流；
- **第 7 步 `shot` / `batch` 受门禁保护**：设定不完整、分镜引用失效、剧本未确认时拒绝执行；
- `retake` 同样受门禁保护，但允许对已有成功 run 的镜头强制重拍；
- `wrap` 只做后处理，不占机器锁，但必须按集选择 run 并写入 `final/<episode-id>/`；
- 下一集可以复用全局设定集和资产，不需要重复做角色/场景。

### 5.2 单集阶段定义

`story status --episode <id>` 计算并返回以下阶段之一：

| stage | 含义 | 进入条件 |
|---|---|---|
| `script` | 剧本阶段 | 没有剧本、revision 0，或剧本未确认 |
| `breakdown` | 拆解阶段 | 剧本已确认，但 `breakdown.json` 缺失或基于旧剧本 |
| `assets` | 设定资产阶段 | 拆解完整，但拆解声明的形态 / 场景 / 音色未就绪（缺显式 `reference_asset`、参考音频或文本描述） |
| `storyboard` | 分镜阶段 | 资产完整，但 `shots.json` 缺失、非法或基于旧剧本 |
| `workflow` | 工作流阶段 | 分镜完整，但工作流 / bindings / 资产槽位未就绪 |
| `ready` | 可拍摄 | 所有硬性条件满足 |
| `wrapped` | 已合片 | 存在有效 `final/<episode-id>/cut-*` |

阶段是**计算值**，不是手工状态；删除资产、修改剧本或更新拆解会自然回退阶段。

### 5.3 系列状态

`story status`（不带 `--episode`）返回系列概览：

- 总集数、可拍摄集数、被阻断集数；
- 每集的 `stage`、剧本 revision / 状态、blockers 数量；
- 全局角色 / 形态 / 场景 / 音色 / 资产计数；
- 建议的下一步（例如「ep02 缺 2 张参考图」）。

系列本身没有一个强行聚合的 stage；**阶段是单集的属性**。需要单集详情时使用 `story status --episode <id>`。

### 5.4 门禁总原则

- **强校验发生在生成入口**：`shot` / `batch` / `retake`；
- **弱提示发生在编辑入口**：`workflow validate`、`story validate`；
- **`run` 永不因剧情数据不完整被阻断**：它是生成设定图、做试验、恢复生产的逃生通道；
- **`wrap` 只警告不阻断**：允许先合片检查，再补问题；
- 门禁失败必须返回结构化 `blockers[]`、`episode` 和 `next_actions[]`，不能只返回一句错误；
- 门禁失败不得创建 task、不得占机器锁、不得启动引擎。

## 6. 数据模型

### 6.1 目录布局

```text
project.json                       # 共享：项目配置 v2
story/                             # 共享：系列级全局设定集
├── series.json                    # 系列标题 / 简介 / 类型
├── characters.json                # 角色、形态、音色关联
├── scenes.json                    # 场景与参考资产
├── voices.json                    # 音色档案
└── assets/
    ├── characters/
    │   └── <character-id>/<form-id>/<asset-id>.<ext>
    ├── scenes/
    │   └── <scene-id>/<asset-id>.<ext>
    └── voices/
        └── <voice-id>/<asset-id>.<ext>

episodes/                          # 共享：分集
├── ep01/
│   ├── episode.json               # 本集元数据：id / number / title
│   ├── script.md                  # 最新剧本正文
│   ├── script.json                # 剧本 revision / hash / 状态
│   ├── breakdown.json             # 本集角色/形态/场景/音色/beat 清单
│   └── shots.json                 # 本集分镜 recipe
└── ep02/...

workflows/<name>.json              # 共享：ComfyUI API JSON
workflows/<name>.bindings.json     # 共享：标量逻辑输入映射
workflows/<name>.assets.json       # 共享：可选，资产槽位映射
runs/<run_id>/...                  # 共享：run 记录与产物；run.json 带 episode_id
tasks/<task_id>/...                # 共享：task 记录；task.json 带 episode_id
final/<episode-id>/cut-*.mp4|json  # 共享：按集成片
final/cut-*.mp4|json               # 兼容：legacy 项目根成片
```

规则：

- `story/` 与 `episodes/` 是共享层，进 Git；
- 参考图、参考音频走 Git LFS；
- 所有路径必须是项目内相对路径（POSIX 分隔符），不写绝对路径；
- `story init` 为已有项目补齐 `.gitattributes` 的 LFS 规则（保留用户已有内容）；
- `init` 不自动创建 `story/`；需要短剧生命周期的项目显式执行 `story init`，避免旧项目被意外纳入门禁；
- `story init` 默认创建 `episodes/ep01/`（title 默认取项目名或「第 1 集」），单集项目可直接用；多集用 `story episode add` 追加。

### 6.2 系列元数据

#### `story/series.json`

```json
{
  "version": 1,
  "title": "雾中来信",
  "synopsis": "一名调查员追查失踪者留下的信，逐步揭开城市的秘密。",
  "genre": "悬疑",
  "created_at": "2026-10-20T09:00:00.000Z",
  "updated_at": "2026-10-20T09:00:00.000Z"
}
```

- `title` 必填；`synopsis` / `genre` 可选；
- 不存放分集列表；分集由 `episodes/*/episode.json` 扫描并按 `number` 排序；
- 不存放执行参数；每集的 `shots.json` 自行携带 `style_prefix` / defaults；
- `story series show` / `story series set` 管理。

### 6.3 剧集元数据

#### `episodes/ep01/episode.json`

```json
{
  "version": 1,
  "id": "ep01",
  "number": 1,
  "title": "雨夜来信",
  "summary": "林默在雨夜电话亭收到一封不该存在的信。",
  "created_at": "2026-10-20T09:00:00.000Z",
  "updated_at": "2026-10-20T09:05:00.000Z"
}
```

规则：

- `id` 目录名一致，正则 `^[a-z][a-z0-9-]{1,63}$`，创建后不可修改；
- `number` 是正整数，全系列唯一，决定播放/展示顺序；
- `title` 必填；`summary` 可选；
- `episode set` 可以改 `number` / `title` / `summary`，不能改 `id`；
- 不提供删除命令；删除剧集是破坏性操作，首期非目标。

### 6.4 单集剧本

#### `episodes/ep01/script.md`

- UTF-8 文本；
- 同步时统一换行符为 `\n`、去掉 BOM；
- 最大 2 MiB；
- 内容由 AI / 用户提供，dycli 不解析语义。

#### `episodes/ep01/script.json`

```json
{
  "version": 1,
  "revision": 3,
  "sha256": "9f2c…",
  "status": "approved",
  "source": "ai",
  "synced_by": "agent",
  "synced_at": "2026-10-20T09:30:00.000Z",
  "approved_at": "2026-10-20T09:35:00.000Z",
  "changelog": [
    {
      "revision": 3,
      "at": "2026-10-20T09:30:00.000Z",
      "source": "ai",
      "summary": "补强第三场冲突，调整结尾反转"
    }
  ]
}
```

字段要求：

| 字段 | 说明 |
|---|---|
| `revision` | 从 1 开始，仅在该集正文哈希变化时递增 |
| `sha256` | 归一化后 `script.md` 字节的 SHA-256 |
| `status` | `draft` / `approved`；正文变化自动回退为 `draft` |
| `source` | `ai` / `user` / `import` |
| `synced_at` | 该集最后一次成功同步时间 |
| `approved_at` | 当前 revision 的确认时间；未确认为 `null` |
| `changelog` | 该集最近 20 条变更摘要；完整历史交给 Git |

同步规则：

- 内容未变化：不递增 revision，不写文件，返回 `changed: false`；
- 内容变化：revision + 1，更新哈希、时间、来源、变更摘要，`status` 重置为 `draft`，`approved_at` 置为 `null`；
- 同步是幂等的；
- 支持 `--base-revision <n>` 乐观并发：当前 revision 不匹配时返回 `story_conflict`；
- 剧本变更**不会自动删除**任何设定；只会让该集的 `breakdown.json` 与 `shots.json` stale；
- 其它集的 revision 和 stale 状态不受影响。

### 6.5 单集拆解

#### `episodes/ep01/breakdown.json`

```json
{
  "version": 1,
  "episode_id": "ep01",
  "source_revision": 3,
  "source_sha256": "9f2c…",
  "beats": [
    {
      "id": "S01",
      "summary": "林默在雨夜电话亭发现信",
      "script_refs": ["第三场"]
    },
    {
      "id": "S02",
      "summary": "林默追踪寄信人",
      "script_refs": ["第四场"]
    }
  ],
  "characters": [
    {
      "id": "lin-mo",
      "forms": ["night"],
      "notes": "本集只有夜行形态"
    },
    {
      "id": "lan",
      "forms": ["default"],
      "notes": "本集首次登场"
    }
  ],
  "scenes": ["rain-city", "observatory"],
  "voices": ["lin-mo-default", "lan-default"],
  "notes": "本集不使用林默的日常形态。"
}
```

要求：

- `episode_id` 必须与目录名一致；
- `source_revision` / `source_sha256` 记录拆解基于哪一版剧本；
- `characters[].id` 必须存在于全局 `story/characters.json`；
- `characters[].forms` 必须非空，且每个形态都存在于该角色的 `forms[]`；
- `scenes[]` 必须存在于全局 `story/scenes.json`；
- `voices[]` 必须存在于全局 `story/voices.json`，且其 `character_id` 必须在本集 `characters[]` 中；
- `beats` 可选；提供时 `id` 在集内唯一，分镜的 `script_refs` 必须引用这些 ID；
- 拆解是**单集制作范围与允许清单**：只列本集确实需要的角色 / 形态 / 场景 / 音色；本集分镜只能使用这里声明的对象；
- 全局设定集中可以有本集不使用的角色 / 形态 / 场景 / 音色，不影响本集；不要把它们复制进本集拆解；
- 剧集首次出现的新角色 / 新形态 / 新场景，必须先加入全局设定集，再写入本集拆解。

### 6.6 全局角色与形态

#### `story/characters.json`

```json
{
  "version": 1,
  "updated_at": "2026-10-20T10:20:00.000Z",
  "characters": [
    {
      "id": "lin-mo",
      "name": "林默",
      "aliases": ["林队"],
      "role": "protagonist",
      "introduced_in": "ep01",
      "summary": "28 岁调查员，克制、执拗。",
      "appearance": "短发，深色风衣，左眉有一道旧疤。",
      "default_form": "default",
      "forms": [
        {
          "id": "default",
          "name": "日常形态",
          "description": "深色风衣，随身携带旧相机。",
          "reference_asset": "front",
          "assets": [
            {
              "id": "front",
              "role": "front",
              "path": "story/assets/characters/lin-mo/default/front.png",
              "sha256": "4a1b…",
              "bytes": 183920,
              "content_type": "image/png",
              "width": 1024,
              "height": 1536,
              "source_run": "r_20261020T093000-mac-7f3a",
              "source_output": "front.png",
              "source_episode_id": "ep01",
              "created_at": "2026-10-20T09:40:00.000Z"
            }
          ]
        },
        {
          "id": "night",
          "name": "夜行形态",
          "description": "黑色雨衣，左手缠绷带。",
          "reference_asset": "front",
          "assets": []
        }
      ],
      "voice_ids": ["lin-mo-default"],
      "notes": "第三场之后情绪转冷，表演参考 notes/lin-mo.md。"
    }
  ]
}
```

要求：

- `id` 是系列级稳定标识，一旦被任何集的拆解或分镜引用不可修改；
- `name` 是展示名，可修改；
- `aliases` 用于剧本检索和人工对照，不参与执行；
- `introduced_in` 可选，若填写必须指向存在的剧集；
- `forms` 至少一个；`default_form` 必须指向存在的形态；
- 形态 ID 在角色内唯一；
- 每个**被剧集拆解使用的**形态必须由 AI / 用户显式指定 `reference_asset`，且该资产文件可用；仅上传其它资产不算就绪；未使用的形态可以先作为草稿；
- `reference_asset` 指向该形态的主参考图；被使用时未指定即视为 `missing_reference`，**不会**自动取 `assets` 第一张；
- 一个形态可以有多个资产；只有 `reference_asset` 是默认参考，其它资产必须在分镜或工作流中显式引用；
- `voice_ids` 引用 `voices.json`，可以为空（无声角色）；
- 全局 doc 不记录 `source_revision`：角色可以跨集渐进演进；剧集是否使用某个形态由该集拆解决定。

「形态」指**视觉状态**，例如：

- 日常 / 战损 / 夜行 / 童年 / 礼服 / 变身；
- 同一形态可以有多个角度或表情参考图（`front`、`side`、`full_body`、`expression`）；
- 形态不是动画关键帧，也不是表情包集合；
- 新造型加形态，不新建角色；第 5 集的战损造型也是同一个 `lin-mo` 的一个 form。

### 6.7 全局场景

#### `story/scenes.json`

```json
{
  "version": 1,
  "updated_at": "2026-10-20T10:00:00.000Z",
  "scenes": [
    {
      "id": "rain-city",
      "name": "雨夜城市",
      "description": "霓虹、积水、高架桥下的旧电话亭。",
      "time_of_day": "night",
      "interior_exterior": "exterior",
      "mood": "压抑、潮湿",
      "introduced_in": "ep01",
      "reference_asset": "establishing",
      "assets": [
        {
          "id": "establishing",
          "role": "establishing",
          "path": "story/assets/scenes/rain-city/establishing.png",
          "sha256": "b7e0…",
          "bytes": 221004,
          "content_type": "image/png",
          "width": 1536,
          "height": 864,
          "source_run": null,
          "source_output": null,
          "source_episode_id": null,
          "created_at": "2026-10-20T10:00:00.000Z"
        }
      ],
      "notes": "同一地点的白天状态另建场景 rain-city-day。"
    }
  ]
}
```

要求：

- 场景 ID 全局唯一且稳定；
- 被剧集拆解使用的场景必须由 AI / 用户显式指定 `reference_asset`，且文件可用；未指定时视为 `missing_reference`，不会自动取第一张；未使用的场景可以先作为草稿；
- 允许同一场景有多个参考资产（establishing / wide / detail / day / night）；
- 分镜可选 `scene_asset` 显式指定使用哪个场景资产；未指定时使用已指定的 `reference_asset`；
- 不同时间 / 天气 / 装修状态默认拆成不同场景 ID，避免隐式变体；
- 第 3 集新增场景时，先加入全局场景表，再写入第 3 集拆解。

### 6.8 全局音色

#### `story/voices.json`

```json
{
  "version": 1,
  "updated_at": "2026-10-20T10:10:00.000Z",
  "voices": [
    {
      "id": "lin-mo-default",
      "character_id": "lin-mo",
      "name": "林默·常态",
      "mode": "reference",
      "description": "低沉、克制，句尾略哑。",
      "sample_text": "这封信不是写给我的。",
      "reference_asset": "sample",
      "assets": [
        {
          "id": "sample",
          "role": "reference_audio",
          "path": "story/assets/voices/lin-mo-default/sample.wav",
          "sha256": "c92d…",
          "bytes": 480044,
          "content_type": "audio/wav",
          "source_run": null,
          "source_output": null,
          "source_episode_id": null,
          "created_at": "2026-10-20T10:10:00.000Z"
        }
      ],
      "engine_hint": "音色克隆参数由 TTS 工作流负责，不写入 dycli。"
    }
  ]
}
```

要求：

- `id` 全局唯一且稳定；
- `character_id` 必须指向存在的角色；
- 一个角色可以有多个音色（常态 / 旁白 / 回忆）；
- `mode: "reference"` 且被剧集拆解使用时，必须由 AI / 用户显式指定 `reference_asset`，且参考音频文件可用；未被使用时可以先作为草稿；
- `mode: "text"` 时允许只有 `description`，用于纯文本音色描述的工作流；
- 台词通过 `voice` 字段显式引用音色；角色只有一个音色时可以省略，有多个音色时省略视为 `story_invalid`；
- dycli 不保存语音克隆模型参数，只保存可复现的参考音频与文本描述。

### 6.9 资产

#### 资产路径

```text
story/assets/characters/<character-id>/<form-id>/<asset-id>.<ext>
story/assets/scenes/<scene-id>/<asset-id>.<ext>
story/assets/voices/<voice-id>/<asset-id>.<ext>
```

#### 资产记录

每个资产至少包含：

```json
{
  "id": "front",
  "role": "front",
  "path": "story/assets/characters/lin-mo/default/front.png",
  "sha256": "4a1b…",
  "bytes": 183920,
  "content_type": "image/png",
  "width": 1024,
  "height": 1536,
  "source_run": "r_...",
  "source_output": "front.png",
  "source_episode_id": "ep01",
  "created_at": "2026-10-20T09:40:00.000Z"
}
```

规则：

- 资产是**系列级**的，可被任意集使用；
- 资产 ID 在 owner 内唯一，且不能使用保留字 `reference`（工作流槽位用它表示主参考）；
- `path` 必须位于 `story/assets/` 下，且与 owner / form / 文件名一致；
- `sha256` 与 `bytes` 由 dycli 在入库时计算，不由 Agent 填写；
- `source_run` / `source_output` / `source_episode_id` 记录来源，允许为 `null`（用户手工提供）；
- 资产入库后独立于 run 存在：即使原 run 被删除或清理，资产仍可用；
- 推荐角色资产 role：`front` / `three_quarter` / `side` / `back` / `full_body` / `expression` / `outfit` / `other`；
- 推荐场景资产 role：`establishing` / `wide` / `detail` / `day` / `night` / `other`；
- 推荐音色资产 role：`reference_audio` / `sample`。

### 6.10 单集分镜

#### `episodes/ep01/shots.json`

```json
{
  "workflow": "t2v",
  "meta": {
    "episode_id": "ep01",
    "title": "第 1 集 · 雨夜来信",
    "synopsis": "调查员林默在雨夜收到失踪者的信。",
    "script_revision": 3,
    "script_sha256": "9f2c…",
    "fps": 24,
    "width": 768,
    "height": 1344,
    "anchors": {}
  },
  "defaults": {
    "length": 48,
    "steps": 30,
    "cfg": 4,
    "negative": "低质量"
  },
  "style_prefix": "电影感，冷色调，35mm",
  "shots": [
    {
      "id": "01",
      "title": "雨夜来信",
      "summary": "林默在电话亭里发现一封信。",
      "script_refs": ["S01"],
      "characters": [
        { "id": "lin-mo", "form": "night" }
      ],
      "scene": "rain-city",
      "scene_asset": "establishing",
      "dialogue": [
        {
          "character": "lin-mo",
          "text": "这封信不是写给我的。",
          "voice": "lin-mo-default",
          "emotion": "压低声音"
        }
      ],
      "seed": 1101,
      "length": 48,
      "prompt": "雨夜，电话亭，林默穿黑色雨衣，手持旧信封，霓虹倒影。"
    }
  ]
}
```

要求：

- `meta.episode_id` 必须与目录名一致；
- `meta.script_revision` / `meta.script_sha256` 在 story 模式下必填；
- `characters` 支持：
  - 字符串：`"lin-mo"` = 使用该角色的 `default_form`；
  - 字符串带形态：`"lin-mo/night"`；
  - 对象：`{ "id": "lin-mo", "form": "night" }`；
  - 对象形式是 story 模式的推荐写法；
- `characters` 中的角色和形态必须在本集 `breakdown.json` 的允许清单内；
- `scene` 使用场景 ID；必须在拆解 `scenes[]` 内；`scene_asset` 可选；
- `dialogue[].character` 必须在拆解 `characters[]` 内；允许不在 `characters` 中（画外音）；
- `dialogue[].voice` 必须在拆解 `voices[]` 内，且属于该角色；角色只有一个音色时可以省略，有多个音色时省略视为 `story_invalid`；
- `script_refs` 引用拆解 `beats[].id`（如果拆解提供了 beats）；
- 旧字段 `meta.characters` / `meta.scenes` 保留兼容，但在 story 模式下以全局设定集 + 本集拆解为准；
- 分镜中不得重复定义角色 / 场景的完整设定；只允许引用 ID；
- 工作流引用是项目根相对路径或短名，跨集共享；
- `first_frame` 的 `relay` 仍引用本集镜头 ID；`meta.anchors` 的值仍按项目根相对路径解析，建议放在 `episodes/<id>/anchors/` 或 `story/assets/`。

### 6.11 生产记录与剧集归属

#### task / run 增加 `episode_id`

`tasks/<task_id>/task.json` 与 `runs/<run_id>/run.json` 新增：

```json
{
  "episode_id": "ep01"
}
```

规则：

- `episode_id` 可以是 `null`：legacy 项目或系列级 run（参考图、测试、TTS 试验）；
- 旧记录没有该字段时按 `null` 读取，不需要迁移；
- 系列概览可把 `episode_id=null` 的 task/run 显示为「未归属」；`--episode` 过滤不包含它们；
- `shot` / `retake` / `batch` 自动写入当前集；
- `run --episode <id>` 可选，用于把参考图 / 试验 / 音频 run 标记到某集；不带则 `null`；
- `status --task` / `status --run` 输出中显示 `episode_id`；
- `status --episode <id>` 只返回该集的 active/recent task 与 run；
- `logs` 不强制按集过滤，但事件中可带 `episode_id`。

#### label 约定

| 模式 | label |
|---|---|
| legacy 单集 | `shot:<shot-id>` |
| 多集 | `ep:<episode-id>:shot:<shot-id>` |
| 手工 run | 用户自定义；要与某集关联时加 `--episode` |

`wrap` 按 `episode_id` + label 前缀选择默认 run；手工 run 可用 `--select` 显式指定。

#### final

```text
final/<episode-id>/cut-<timestamp>.mp4
final/<episode-id>/cut-<timestamp>.json
```

- `wrap --episode ep01` 写入 `final/ep01/`；
- manifest 必须包含 `episode_id`、选中的 shot / run / artifact；
- legacy 项目继续写 `final/cut-*`；
- 不提供系列总合片；每集独立成片，系列总合成是后续能力。

### 6.12 标识、路径与状态规则

**ID 规则**

- 剧集、角色、场景、形态、音色、资产 ID 均适用：`^[a-z][a-z0-9-]{1,63}$`；
- 剧集 `number` 是正整数，全系列唯一；
- 中文名只放 `name` / `title`，ID 使用拼音 / 英文短名；
- ID 一旦被引用不可修改；改名只改 `name` / `title`；
- 删除被引用实体必须被拒绝，并列出引用位置（剧集 + 文件 + 镜头）。

**路径规则**

- 共享记录只写项目内相对路径；
- 路径必须是 POSIX 分隔符；
- 禁止 `..`、绝对路径、符号链接逃逸；
- 资产文件必须真实存在于项目内，哈希匹配；
- `episodes/<id>/` 目录名必须与 `episode.json.id` 一致。

**状态规则**

- 每集剧本有 `draft` / `approved`；
- 全局设定集没有 `source_revision`，也不因某一集剧本变化而 stale；
- 每集拆解和分镜有 `source_revision`，只对该集剧本负责；
- 资产没有独立审核状态；`reference_asset` 由 AI / 用户显式指向，即视为采用；
- 需要否定某张图时，替换 `reference_asset` 或删除资产，不引入额外的 rejected 状态。

**版本规则**

- Git 是完整历史系统；
- dycli 只维护每集当前 revision、哈希和最近变更摘要；
- 不复制整份剧本历史到 `story/versions/`，避免与 Git 重复；
- 全局设定集有 `updated_at`，但不做自动跨集 stale；是否重做由 AI / 用户判断。

## 7. 命令与 Skill 契约

Skill 是流程说明书，真正的写入通过 `story` 命令完成：命令负责全量校验、原子写、哈希、来源记录与审计。Agent 不应绕过命令直接手改 canonical JSON；如果确实直接编辑文件，必须保证 `story validate` 通过，dycli 只以最终文件内容为准。

### 7.1 命令族

新增 `story` 分组（帮助中显示为「剧本与设定」）：

| 命令 | 作用域 | 作用 |
|---|---|---|
| `story init` | 系列 | 创建 `story/`、`episodes/ep01/`、资产目录、LFS 规则 |
| `story series show` | 系列 | 查看系列标题 / 简介 / 类型 |
| `story series set` | 系列 | 修改系列标题 / 简介 / 类型 |
| `story episode add` | 系列 | 新增一集（id / number / title） |
| `story episode list` | 系列 | 按 number 列出剧集 |
| `story episode show` | 系列 | 查看单集元数据与文件状态 |
| `story episode set` | 系列 | 修改 number / title / summary（id 不变） |
| `story characters set/show` | 系列 | 写入 / 查看全局角色与形态 |
| `story scenes set/show` | 系列 | 写入 / 查看全局场景 |
| `story voices set/show` | 系列 | 写入 / 查看全局音色 |
| `story asset add/remove/list/set-reference` | 系列 | 资产入库 / 删除 / 列表 / 显式指定主参考 |
| `story script sync/show/approve` | 单集 | 同步 / 查看 / 确认该集剧本 |
| `story breakdown set/show` | 单集 | 写入 / 查看该集拆解 |
| `story shots set` | 单集 | 校验并写入该集 `shots.json` |
| `story status` | 系列 / 单集 | 系列概览；`--episode` 查看单集阶段与 blockers |
| `story validate` | 系列 / 单集 | 全量或单集深度校验 |

生产命令增加 `--episode`：

| 命令 | 行为 |
|---|---|
| `shot <id...> --episode <id>` | 拍摄该集镜头 |
| `retake <id...> --episode <id>` | 强制重拍该集镜头 |
| `batch --episode <id>` | 连拍该集未完成镜头 |
| `wrap --episode <id>` | 合成本集成片 |
| `run ... [--episode <id>]` | 可选标记归属；不参与剧情门禁 |
| `status [--episode <id>]` | 系列概览或单集状态 |
| `web` | 系列 / 剧集只读浏览 |

### 7.2 剧集解析规则

所有单集命令必须先解析「剧集上下文」：

| 项目状态 | 行为 |
|---|---|
| 没有 `story/`（legacy） | 使用根 `shots.json`、根 `final/`；`episode_id = null`；不接受 `--episode` |
| 有 `story/` 且只有 1 集 | `--episode` 可省略；自动使用该集 |
| 有 `story/` 且 ≥2 集 | `--episode` 必填；缺失返回 `episode_required`，并列出可用集 |
| `--episode` 指向不存在的集 | 返回 `episode_not_found` |

剧集上下文包含：

- `episode_id`；
- `episodes/<id>/` 目录；
- `shots.json` 路径；
- `final/<id>/` 目录；
- label 前缀（`ep:<id>:shot:`）；
- 剧本 / 拆解路径。

实现要求：所有单集命令通过统一的 episode context 解析，不允许在各命令里散落拼接路径。

#### 7.2.1 哪些命令需要 `--episode`

| 类别 | 命令 | 多集项目 | 单集项目 | legacy |
|---|---|---|---|---|
| 写入单集 | `story script sync` / `breakdown set` / `shots set` | **必填** | 可省略 | 不适用 |
| 生产单集 | `shot` / `retake` / `batch` / `wrap` | **必填** | 可省略 | 不需要 |
| 只读系列概览 | `story status` / `status` / `story validate` | 可省略（省略 = 系列概览 / 全量） | 可省略 | 不需要 |
| 只读单集 | `script show` / `breakdown show` | **必填** | 可省略 | 不适用 |
| 全局 | `series` / `episode` / `characters` / `scenes` / `voices` / `asset` | 不需要；传了报用法错误 | 不需要 | 不需要 |
| 低层执行 | `run` | **可选**，只作为归属标记 | 可选 | 不需要 |
| 浏览 | `web` | 不需要；页面内切换 | 不需要 | 不需要 |

规则：

- 多集项目中，写入 / 生产单集但未传 `--episode`：**在写文件、创建 task、占机器锁之前**返回 `episode_required`；
- 系列概览类只读命令省略 `--episode` 是安全的：返回系列概览或全量校验，不会写任何集；
- 展示单集内容的 `script show` / `breakdown show` 在多集时仍要求 `--episode`（否则无法知道展示哪一集）；
- `run` 不强制：参考图 / 试验 / TTS 可以是系列级（`episode_id = null`）；要与某集关联时传 `--episode`；
- 单集项目省略 `--episode` 没有歧义，自动使用唯一一集；
- 无论显式还是自动解析，命令输出都必须回显解析后的 `episode_id`，task/run 记录同步写入；
- 当项目从 1 集增加到 2 集时，写入 / 生产命令会开始要求 `--episode`，此前可以省略；这是**失败关闭**，不会静默改到某一集；
- legacy 项目没有剧集概念，不接受 `--episode`。

#### 7.2.2 第 9 条：`--episode` 策略对比（为什么推荐显式）

第 9 条不是简单的“加不加参数”，而是**当命令没有指定剧集时，dycli 应该怎么办**。可选策略：

| 策略 | 行为 |
|---|---|
| **A. 显式优先（推荐）** | 多集时写入 / 生产 / 单集 show 必须传 `--episode`；系列概览类只读可省略；单集可省略；legacy 不需要 |
| B. 当前目录推断 | 若 cwd 在 `episodes/ep02/` 内，自动用 ep02；否则要求传 |
| C. 持久“当前集” | `story episode use ep02` 写入本机状态；后续命令省略时用 ep02 |
| D. 一律强制 | 即使只有一集，也要求 `--episode` |
| E. 自动选最近 / 下一集 | 省略时自动选最近操作或下一个未完成的集 |

| 维度 | A 显式 | B cwd | C 持久当前集 | D 一律强制 | E 自动选 |
|---|---|---|---|---|---|
| 写错集风险 | **低** | 中（目录切换 / 脚本 cd） | 高（忘记切换） | 低 | 高（状态漂移） |
| AI Agent 适配 | **高**（参数在命令里） | 中（依赖 cwd） | 低（隐藏状态） | 高 | 低 |
| 人类便利 | 中 | 高（在集目录内） | 高 | 低 | 高 |
| 可复现 / 审计 | **高** | 中 | 低 | 高 | 低 |
| 多集并行 | **高** | 高 | 低（全局状态冲突） | 高 | 低 |
| 实现成本 | **低** | 中 | 中（状态文件 + 失效） | 低 | 中 |

具体区别：

- **A 显式**：每条命令都能在日志、Shell 历史、Agent transcript 里看到目标集。忘传的代价是 `episode_required`（便宜、无副作用）；写错集的代价是浪费 GPU、污染 run/final（昂贵）。
- **B cwd 推断**：人进入 `episodes/ep02/` 时很顺手，但 AI Agent 通常从项目根执行，脚本可能 `cd`，IDE/CI 的 cwd 也不同；一旦 cwd 与意图不符，`shot 01` 会静默打到另一集。可以支持，但不适合作为默认。
- **C 持久当前集**：`story episode use ep02` 看起来方便，但它是隐藏状态：用户/AI 忘了切换、两个 Agent 并行、或者先看 ep01 再执行 `wrap`，都可能把操作打到错误的集。若未来要做，必须让每个生产命令回显“将操作 ep02”并要求确认；首期不建议。
- **D 一律强制**：最一致，但单集项目没有歧义，强制只会增加噪音；收益接近于零。
- **E 自动选最近 / 下一集**：状态会随操作变化，`batch` / `wrap` 可能选中用户没预期的集；不可复现，直接排除。

**推荐 A**：

- 写入 / 生产命令（`script sync`、`breakdown set`、`shots set`、`shot`、`retake`、`batch`、`wrap`）多集时强制 `--episode`；
- 系列概览类只读命令可以省略，用于查看整个系列 / 全量校验；
- 单集可省略，legacy 不需要；
- `run` 可选标记，保持参考图 / 试验的系列级能力；
- 不引入 cwd 推断，也不引入持久“当前集”状态；
- 代价是命令更啰嗦，由 `story status` 的 `next_actions` 直接给出带 `--episode` 的完整命令来抵消。

### 7.3 系列与剧集管理

```bash
# 初始化系列（默认创建 ep01）
daoyan story init

# 增加第 2 集
daoyan story episode add --id ep02 --number 2 --title "失踪者" --summary "林默开始追踪寄信人。" --json

# 查看 / 修改
daoyan story episode list --json
daoyan story episode show ep02 --json
daoyan story episode set ep02 --title "失踪者（修订）" --json

# 系列元数据
daoyan story series show --json
daoyan story series set --title "雾中来信" --synopsis "…" --json
```

规则：

- `episode add` 创建 `episodes/<id>/` 骨架：`episode.json`、`script.json`（revision 0）、`breakdown.json`（空模板）、`shots.json`（空模板）；空骨架必须能被 `story validate` 接受（revision 0 视为未开始，不产生 error）；
- `episode add` 校验 id 格式、id 唯一、number 唯一；
- `episode set` 不能改 id；改动 number 时同样校验全系列唯一；
- 不提供 `episode remove`；删除剧集首期非目标；
- `story init` 必须在已有 `project.json` 的项目内执行，否则 `project_not_found`；
- `story init` 幂等：只补缺失文件 / 目录，不覆盖已有数据；
- `story init` 默认创建 `ep01`，避免单集项目还要额外加一集；
- `story init` 不改动根目录已有的 `shots.json` / `runs/` / `tasks/` / `final/`；story 模式下根 `shots.json` 被视为 legacy 并被忽略（init 会生成示例模板，因此不因此报错）。

### 7.4 剧本同步

```bash
# 第 2 集
daoyan story script sync --episode ep02 --file ./ep02.md --summary "第二稿" --source ai --json

# stdin
cat ep02.md | daoyan story script sync --episode ep02 --file - --summary "按用户反馈调整第二场" --json

# 乐观并发
daoyan story script sync --episode ep02 --file ./ep02.md --base-revision 2 --json

# 用户确认后
daoyan story script approve --episode ep02 --json

# 只有一集时可省略 --episode
daoyan story script sync --file ./ep01.md --summary "初稿" --json
```

返回示例：

```json
{
  "episode_id": "ep02",
  "changed": true,
  "revision": 3,
  "sha256": "9f2c…",
  "status": "draft",
  "stale_documents": ["breakdown", "shots"],
  "next_actions": [
    "重新拆解本集角色、场景、音色",
    "daoyan story breakdown set --episode ep02 --file ./ep02-breakdown.json --json"
  ]
}
```

规则：

- `--file -` 表示 stdin；
- 空内容拒绝同步（`story_invalid`）；
- 内容变化自动把该集 `status` 置为 `draft`；
- `approve` 只能确认该集当前 revision，写入 `status=approved` 与 `approved_at`；revision 为 0 或 `script.md` 不存在时拒绝；
- 同步成功后不自动改拆解 / 分镜，只返回该集 stale 文档列表；
- 其它集的 stale 状态不变；
- Agent 必须在同步后检查 `story status --episode <id>`。

### 7.5 单集拆解

```bash
daoyan story breakdown set --episode ep02 --file ./ep02-breakdown.json --json
daoyan story breakdown show --episode ep02 --json
```

规则：

- 整份替换；
- 要求该集剧本已同步（revision > 0）；否则拒绝并提示先 `story script sync`；
- 默认 `source_revision` 取该集当前剧本 revision；
- 允许 `--source-revision <n>` 显式声明基于旧剧本生成，由 `status` 标记 stale；
- 写入前全量校验：
  - 角色 / 形态 / 场景 / 音色必须在全局设定集中存在；
  - `episode_id` 必须匹配；
  - `beats[].id` 唯一；
- 失败时原文件不变；
- 拆解中的 `characters[].forms` 是本集制作范围与允许的形态清单；分镜使用未列出的形态会被拒绝；
- 拆解应只列本集确实需要的角色 / 形态 / 场景 / 音色；分镜可以只使用其中一部分，但未列出的对象不能使用。

### 7.6 全局设定集写入

```bash
daoyan story characters set --file ./characters.json --json
daoyan story scenes set --file ./scenes.json --json
daoyan story voices set --file ./voices.json --json

daoyan story characters show --json
daoyan story characters show --id lin-mo --json
daoyan story scenes show --json
daoyan story voices show --json
```

规则：

- 整份替换，不做隐式字段合并；Agent 必须先 `show` 读取完整文档，再提交完整替换，避免误删未引用的对象；
- 写入前全量校验结构、ID 唯一、引用存在；
- 允许先写入尚未指定 `reference_asset` 的形态 / 场景 / 音色草稿；写入本身不失败，但 `story status` / 门禁会因 `missing_reference` / `voice_not_ready` 阻断使用；
- 跨文件引用（角色 `voice_ids`、音色 `character_id`）必须能解析；如一次新增角色 + 音色，按「角色（可先不带 voice_ids）→ 音色 → 角色补 voice_ids」顺序写，或分两次写；
- 删除被任何剧集的拆解或分镜引用的角色 / 形态 / 场景 / 音色时，返回 `story_invalid`，并在 `details.references[]` 列出剧集与位置；
- 支持 `--base-sha256 <hash>` 防止覆盖他人修改；
- 原子写、2 空格缩进、末尾换行；
- 资产入库会更新对应 owner doc 的 `updated_at`，不需要手工改。

### 7.7 资产入库、主参考与删除

```bash
# 角色参考图；--set-reference 表示这是 AI/用户选定的主参考
daoyan story asset add \
  --owner character:lin-mo \
  --form night \
  --id front \
  --role front \
  --from /tmp/lin-mo-night.png \
  --set-reference \
  --json

# 场景参考图
daoyan story asset add \
  --owner scene:rain-city \
  --id establishing \
  --role establishing \
  --from /tmp/rain-city.png \
  --set-reference \
  --json

# 从 run 产物入库（run 可以是系列级或某集的）
daoyan story asset add \
  --owner character:lin-mo \
  --form default \
  --id front \
  --role front \
  --from-run r_20261020T093000-mac-7f3a \
  --output front.png \
  --set-reference \
  --json

# 音色参考音频
daoyan story asset add \
  --owner voice:lin-mo-default \
  --id sample \
  --role reference_audio \
  --from /tmp/lin-mo.wav \
  --set-reference \
  --json

# 不重新上传，只切换主参考
daoyan story asset set-reference \
  --owner character:lin-mo \
  --form night \
  --id front \
  --json

# 删除（不能删仍被 reference_asset 引用的资产）
daoyan story asset remove \
  --owner character:lin-mo \
  --form default \
  --id side \
  --json
```

规则：

- `--from` 支持项目内相对路径、绝对路径（外部临时文件）；入库时复制到规范路径；
- `--from-run` 从 `runs/<run_id>/run.json` 的 `outputs[]` 中按文件名查找，走现有 realpath 白名单；
- `--role` 只是资产描述（front / side / establishing 等），不参与自动选择；
- 自动计算 `sha256`、`bytes`、`content_type`，图片额外读取 `width` / `height`；
- 如果来源 run 有 `episode_id`，写入资产记录的 `source_episode_id`；
- 不覆盖已有资产 ID；需要替换时显式 `--replace`；
- 支持内容类型：
  - 图片：PNG / JPEG / WebP；
  - 音频：WAV / MP3 / FLAC / OGG；
- 单文件上限 200 MiB；
- 拒绝符号链接、路径逃逸、无法识别的文件魔数；
- 源文件是 Git LFS 指针时拒绝，提示先 `git lfs pull`；
- **`story asset add` 不会自动设置 `reference_asset`**；只有显式传入 `--set-reference` 才把本资产设为主参考；
- `story asset set-reference` 用于单独指定 / 切换主参考，不重新上传文件；它必须校验目标资产存在于该 owner 下；
- 对需要主参考的 owner（形态 / 场景 / `mode=reference` 音色），如果入库后仍没有 `reference_asset`，命令成功但返回 `missing_reference` 或 `voice_not_ready` 警告与 `next_actions`；`story status` / 门禁会阻断使用；
- 删除资产时，如果它是 `reference_asset`，必须先用 `story asset set-reference` 指向替代资产，或 `--force`；`--force` 会把 `reference_asset` 置空，不会自动回退到其它资产，从而变成 `missing_reference`；
- 删除资产不影响其它集的引用检查：资产是全局的，任何集引用都算引用；
- 返回资产记录与可用的 `next_actions`。

### 7.8 单集分镜写入

```bash
daoyan story shots set --episode ep02 --file ./ep02-shots.json --json
```

规则：

- 整份替换；
- 要求该集剧本已同步（revision > 0）且拆解存在；
- 默认 `meta.script_revision` 取该集当前剧本 revision；
- 允许 `--source-revision <n>` 显式声明基于旧剧本生成（写入 `meta.script_revision`）；
- 写入前全量校验：
  - `meta.episode_id` 匹配；
  - 角色 / 形态 / 场景 / 音色在本集拆解允许清单内；
  - `script_refs` 如果拆解有 beats，必须引用存在的 beat；
  - 工作流存在、bindings 合法、资产槽位可解析（不启动引擎）；
- 失败时原文件不变；
- 支持 `--base-sha256`。

### 7.9 状态与校验

```bash
# 系列概览
daoyan story status --json

# 单集详情
daoyan story status --episode ep02 --json

# 全量校验
daoyan story validate --json

# 单集校验
daoyan story validate --episode ep02 --json

# 逐文件校验哈希
daoyan story validate --verify-hashes --json
```

系列概览返回示例：

```json
{
  "enabled": true,
  "series": {
    "title": "雾中来信",
    "episodes_total": 3,
    "episodes_ready": 1,
    "episodes_blocked": 2
  },
  "episodes": [
    {
      "id": "ep01",
      "number": 1,
      "title": "雨夜来信",
      "stage": "ready",
      "script": { "revision": 3, "status": "approved" },
      "blockers": []
    },
    {
      "id": "ep02",
      "number": 2,
      "title": "失踪者",
      "stage": "script",
      "script": { "revision": 1, "status": "draft" },
      "blockers": [
        { "code": "script_draft", "message": "剧本未确认" }
      ]
    }
  ],
  "counts": {
    "episodes": 3,
    "characters": 4,
    "forms": 8,
    "scenes": 5,
    "voices": 4,
    "shots": 48,
    "assets": 23
  },
  "next_actions": [
    "ep02: 确认剧本后 daoyan story script approve --episode ep02",
    "ep02: 拆解完成后补齐本集参考资产"
  ]
}
```

单集详情返回示例：

```json
{
  "enabled": true,
  "episode": {
    "id": "ep02",
    "number": 2,
    "title": "失踪者"
  },
  "stage": "assets",
  "script": {
    "revision": 1,
    "status": "approved",
    "sha256": "9f2c…",
    "synced_at": "2026-10-20T11:00:00.000Z",
    "approved_at": "2026-10-20T11:05:00.000Z"
  },
  "documents": {
    "breakdown": { "source_revision": 1, "stale": false },
    "shots": { "source_revision": 1, "stale": false }
  },
  "counts": {
    "characters": 2,
    "forms": 3,
    "scenes": 1,
    "voices": 2,
    "shots": 18,
    "assets": 4
  },
  "blockers": [
    {
      "code": "missing_reference",
      "ref": "character:lin-mo/form:night",
      "message": "角色形态没有显式指定主参考图（reference_asset）",
      "shots": ["02", "05"]
    }
  ],
  "warnings": [],
  "next_actions": [
    "daoyan story asset add --owner character:lin-mo --form night --id front --role front --from <图片>"
  ]
}
```

`story validate` 返回与 `validate` 一致的 `issues[]`，每条必须带 `episode_id`（全局问题为 `null`）：

```json
{
  "ok": false,
  "issues": [
    {
      "episode_id": "ep02",
      "path": "episodes/ep02/shots.json",
      "code": "entity_not_in_breakdown",
      "severity": "error",
      "message": "镜头 02 使用了本集拆解未声明的形态 lin-mo/default",
      "hint": "在第 2 集 breakdown 中声明该形态，或修正分镜引用"
    }
  ]
}
```

`story status` 是轻量只读：只读元数据与引用，检查资产路径是否存在，但不重新计算全部哈希；`story validate --verify-hashes` 才逐文件校验哈希。

`story status` 只看剧情数据；`status` 是项目总状态（含机器 / 任务 / 锁），story 模式下也返回 `series` / `episodes`。story 模式下根 `shots.json` 不再作为 `status.shots` 返回；`status --episode <id>` 返回该集分镜、任务、run 与单集 blockers；`status --task` / `--run` 输出 `episode_id`。legacy 项目行为不变。

项目级 `daoyan validate` 在 story 模式下必须包含 `story validate` 的检查（可等价调用），legacy 项目不执行剧情检查。

### 7.10 Skill 契约

`daoyan skill update` 生成的 Skill 必须新增 `reference/story.md`，并在 `SKILL.md` 顶部加入「多集短剧生命周期」摘要。

硬规则（必须出现在 SKILL.md）：

1. **任何一集剧本内容变化后，先 `story script sync --episode <id>`，再继续其它操作**；不得只在对话上下文中保留最新剧本。
2. **剧本 revision 变化后，必须检查该集 `story status`**；该集 stale 的拆解 / 分镜必须先更新或明确确认。
3. **未通过该集 `story status` 的 blockers 前，不得执行该集 `shot` / `batch` / `retake`**。
4. **角色、形态、场景、音色 ID 一旦被引用不可修改**；改名只改 `name`。
5. **全局设定集只维护一份**；不要为每一集复制角色 / 场景 / 音色。新造型加 `form`，新地点加 `scene`。
6. **新角色 / 形态 / 场景 / 音色先加入全局设定集，再写本集 `breakdown.json`，最后写 `shots.json`**；分镜只能使用拆解声明的对象。
7. **单集拆解与设定资产未通过前，不制作该集分镜工作流**；可以先做设定图工作流并用 `run` 验证。
8. **参考图 / 音频必须通过 `story asset add` 入库，并显式指定主参考**（`--set-reference` 或 `story asset set-reference`）；不得依赖自动取第一张，也不得在分镜里直接写临时路径或绝对路径。
9. **生成参考图用 `run`，产物用 `story asset add --from-run` 入库**；不要手工复制文件到 `story/assets/`。
10. **多集项目执行 `shot` / `batch` / `wrap` 必须带 `--episode`**；不得假设当前集。
11. **用户确认某一集剧本后才调用该集 `story script approve`**；AI 不能自行代表用户确认。
12. **不要把 A 集的 run / final 当成 B 集的**；label、`episode_id`、`final/<id>/` 必须一致。

`reference/story.md` 必须包含：

- 系列 / 剧集 / 全局设定集 / 单集拆解的关系；
- 多集生命周期状态机与每阶段准入条件；
- 角色 / 场景 / 音色 / 拆解 / 分镜的完整模板；
- 从剧本变更到重新拆解的操作顺序；
- 参考图生成与入库的闭环示例；
- 每轮对话结束前的剧本同步检查清单，以及下次开工先读 `story status` / 最新剧本的顺序；
- 多集 `--episode` 用法与 `episode_required` 的处理；
- 常见 blockers 的恢复方法；
- `story status --json` 的 `next_actions` 使用方式。

### 7.11 错误码

新增错误码（写入 `errors.mts` 与 `docs/ERROR-CODES.md`）：

| code | 场景 | retryable | 建议恢复 |
|---|---|---|---|
| `story_not_found` | 项目未执行 `story init` | 否 | `daoyan story init` |
| `episode_not_found` | `--episode` 指向不存在的集 | 否 | `story episode list` 查看可用集 |
| `episode_required` | 多集项目未传 `--episode` | 否 | 补 `--episode <id>` |
| `story_conflict` | `--base-revision` / `--base-sha256` 不匹配 | 是 | 重新读取最新文件后重试 |
| `story_invalid` | 结构、引用、ID、删除冲突 | 否 | 按 `issues[]` / `details.references[]` 修正 |
| `story_stale` | 单集拆解/分镜基于旧剧本 | 否 | 更新该集拆解/分镜，或显式允许 stale |
| `story_gate_failed` | 拍摄前门禁未通过 | 否 | 按 `blockers[]` 修复 |
| `asset_not_found` | owner / 资产 / run 产物不存在 | 否 | 检查 ID、run 与输出名 |
| `asset_invalid` | 类型、大小、路径、哈希不合法 | 否 | 重新生成或转换格式后重试 |

`episode_required` 的 `details` 必须包含可用剧集：

```json
{
  "episodes": ["ep01", "ep02", "ep03"]
}
```

`story_gate_failed` 的 `details` 必须包含：

```json
{
  "episode_id": "ep02",
  "stage": "assets",
  "blockers": [],
  "warnings": [],
  "next_actions": []
}
```

## 8. 校验与门禁规则

### 8.1 系列级结构校验

- `story/series.json` 可解析、`title` 非空；
- `episodes/*/episode.json`：
  - `id` 与目录名一致；
  - id 唯一、number 唯一且为正整数；
  - title 非空；
- 每个剧集目录包含 `script.json` / `breakdown.json` / `shots.json`（允许 revision 0 / 空模板）；
- 全局设定集：
  - JSON 可解析、必填字段存在、类型正确；
  - 角色 / 场景 / 音色 ID 全局唯一；
  - 角色形态 ID 在角色内唯一；
  - `introduced_in` 若存在，必须指向存在的剧集；
- 资产路径规范、文件存在、哈希与记录一致（`--verify-hashes`）；
- story 模式下根目录 `shots.json` 被忽略；不要求删除，也不因此报错（init 会生成示例模板）。

### 8.2 单集结构校验

- `script.json` 的 `revision`、`sha256`、`status` 自洽；
- `breakdown.json`：
  - `episode_id` 匹配；
  - `source_revision` / `source_sha256` 与剧本记录自洽；
  - `characters[].forms` 非空且存在；
  - `scenes[]` / `voices[]` 存在；
  - `beats[].id` 集内唯一；
- `shots.json`：
  - `meta.episode_id` 匹配；
  - `meta.script_revision` / `script_sha256` 与剧本自洽；
  - 镜头 ID 集内唯一；
  - `characters` / `scene` / `dialogue` 引用在拆解允许清单内；
  - `script_refs` 引用存在的 beat（如果拆解有 beats）；
  - 工作流 / bindings 可解析；
- `final/<episode-id>/cut-*.json`（若存在）：
  - `episode_id` 与目录一致；
  - 选中的 run 属于该集；
  - 选中的 shot 属于该集分镜。

### 8.3 引用完整性

| 引用方 | 被引用 | 规则 |
|---|---|---|
| `characters[].voice_ids[]` | `voices[].id` | 必须存在 |
| `voices[].character_id` | `characters[].id` | 必须存在 |
| `characters[].default_form` | `forms[].id` | 必须存在 |
| `characters[].forms[].reference_asset` | 本形态 `assets[].id` | 若存在必须有效；被任何拆解使用时不能为空 |
| `scenes[].reference_asset` | 本场景 `assets[].id` | 若存在必须有效；被任何拆解使用时不能为空 |
| `voices[].reference_asset` | 本音色 `assets[].id` | 若存在必须有效；`mode=reference` 且被任何拆解使用时不能为空 |
| `breakdown.characters[].id` | 全局角色 | 必须存在 |
| `breakdown.characters[].forms[]` | 角色形态 | 必须存在 |
| `breakdown.scenes[]` | 全局场景 | 必须存在 |
| `breakdown.voices[]` | 全局音色 + 本集角色 | 必须存在，且音色的 `character_id` 在本集 `characters[]` 中 |
| `shots.characters[]` | 本集拆解 | 角色 + 形态必须在允许清单 |
| `shots.scene` / `scene_asset` | 本集拆解 / 场景资产 | 必须存在 |
| `shots.dialogue[].character` | 本集拆解 | 必须存在 |
| `shots.dialogue[].voice` | 本集拆解 | 必须存在且属于该角色 |
| `shots.script_refs[]` | 本集 beats | 有 beats 时必须存在 |
| `assets.source_episode_id` | 剧集 | 可为 `null`；非空时必须存在 |

删除规则：

- 删除角色：若被任何剧集的拆解或分镜引用，拒绝；
- 删除形态：若被任何剧集的拆解或分镜引用，拒绝；
- 删除场景：若被任何剧集的拆解或分镜引用，拒绝；
- 删除音色：若被任何剧集的拆解或台词引用，拒绝；
- 删除资产：若被任何 `reference_asset` 引用，拒绝；先 `story asset set-reference` 改指向，或 `--force` 删除并接受 `missing_reference`；
- 删除剧集：首期不提供命令；
- 错误必须列出剧集 ID、文件与镜头 ID。

### 8.4 资产覆盖率

拍摄某一集前，检查本集拆解声明的数据：

- 拆解声明的每个角色形态必须显式指定 `reference_asset`，且该资产文件可用；仅有其它资产不算就绪；
- 拆解声明的每个场景必须显式指定 `reference_asset` 且文件可用；分镜若指定 `scene_asset`，该资产也必须存在；
- 拆解声明的每个音色：
  - 音色存在；
  - `mode=reference` 时必须显式指定 `reference_asset`，且参考音频可用；
  - `mode=text` 时有非空 `description`；
- 分镜可以只使用拆解的一部分；未在拆解中声明的对象不能出现在分镜里；
- 资产文件是 LFS 指针（未拉取）时视为不可用，门禁阻断并提示 `git lfs pull`；
- 资产是全局的，某一集补图后其它集如果使用同一形态也会受益；不会自动使其它集 ready，需各自检查。

### 8.5 stale 规则

- 每集 `script.json.revision` 是该集的唯一基准；
- 该集 `breakdown.json.source_revision` 小于当前 revision → 该集拆解 stale；
- 该集 `shots.json.meta.script_revision` 小于当前 revision → 该集分镜 stale；
- 该集 `script.status = draft` → 该集剧本未确认；
- **stale 是单集属性**：ep02 剧本变化不影响 ep01；
- 全局设定集的 `updated_at` 变化不自动让任何集 stale；这是有意设计：角色可以跨集演进，是否重做由 AI / 用户判断；
- strict 模式下，单集 stale 与未确认都会阻断该集 `shot` / `batch` / `retake`；
- `run` 不受影响。

### 8.6 门禁行为

`project.json` 可选：

```json
{
  "story": {
    "enforce": "strict"
  }
}
```

| 值 | 行为 |
|---|---|
| `strict`（默认） | 任一 blocker 阻断该集 `shot` / `batch` / `retake` |
| `warn` | 继续执行，把 blockers 写入 task 记录与事件流 |
| `off` | 不执行剧情门禁 |

无论配置如何：

- `run` 永远不阻断；
- `story validate` 始终报告全部问题；
- `wrap` 只警告不阻断；
- 门禁失败不得创建 task、不得占机器锁、不得启动引擎；
- 门禁错误必须带 `episode_id`；
- `shot` / `batch` / `retake` 的 `--allow-incomplete` 仅作为显式逃生口，使用时必须在 task 记录中标记 `story_gate_bypassed: true`，并在事件流写入警告。

### 8.7 单集阶段计算

按顺序判断，命中第一个未完成项：

1. 无剧本或 revision 0 → `script`；
2. 剧本未 approved → `script`；
3. 拆解缺失或 stale → `breakdown`；
4. 拆解声明的形态 / 场景 / 音色未就绪（缺参考图 / 音频 / 描述）→ `assets`；
5. `shots.json` 缺失、非法或 stale → `storyboard`；
6. 工作流 / bindings / assets 槽位不可解析 → `workflow`；
7. 存在有效 `final/<episode-id>/cut-*` → `wrapped`；
8. 否则 → `ready`。

### 8.8 系列概览计算

- 扫描 `episodes/*/episode.json`，按 `number` 排序；
- 对每一集计算单集 stage 与 blockers；
- `episodes_ready` = stage 为 `ready` 或 `wrapped` 的集数；
- `episodes_blocked` = blockers 非空的集数；
- 全局 counts 取系列设定集 + 所有集分镜；
- 系列概览不返回单一 stage；需要单集 stage 用 `--episode`。

### 8.9 blocker code 约定

`story status` 的 `blockers[]`、`story_gate_failed.details.blockers[]` 统一使用以下 code：

| code | 含义 | 典型修复 |
|---|---|---|
| `script_missing` | 该集没有剧本或 revision 0 | `story script sync --episode <id>` |
| `script_draft` | 剧本未确认 | 用户确认后 `story script approve` |
| `breakdown_missing` | 该集拆解缺失 | `story breakdown set` |
| `breakdown_stale` | 拆解基于旧剧本 | 重新拆解或确认 |
| `missing_reference` | 拆解声明的形态 / 场景没有显式 `reference_asset` | `story asset add --set-reference` 或 `story asset set-reference` |
| `voice_not_ready` | 音色缺参考音频或文本描述 | 补音频 / 描述 |
| `shots_missing` | 该集分镜缺失 | `story shots set` |
| `shots_stale` | 分镜基于旧剧本 | 更新分镜 |
| `workflow_unresolved` | 工作流 / bindings / 资产槽位不可解析 | 修工作流或分镜绑定 |
| `asset_in_use` | 删除资产 / 实体时仍被引用 | 先解除引用 |
| `bible_invalid` | 全局设定集内部引用错误 | `story validate` 后修正 |

`story validate` 的 issue code 可以更细（例如 `entity_not_in_breakdown`），但 blockers 面向“下一步做什么”，必须能映射到上表或明确的 `next_actions`。

## 9. 工作流资产绑定

### 9.1 现状

当前执行层只支持：

- `first_frame`：单张锚点图或接力尾帧；
- 标量 bindings：`prompt`、`seed`、`steps` 等。

无法表达：

- 多个角色参考图；
- 角色形态切换；
- 场景参考图；
- 音色参考音频；
- 资产来源与哈希的 run 级留档。

### 9.2 目标契约

新增可选文件 `workflows/<name>.assets.json`：

```json
{
  "version": 1,
  "slots": [
    {
      "name": "hero",
      "kind": "character",
      "asset": "reference",
      "target": "10.image",
      "required": true
    },
    {
      "name": "partner",
      "kind": "character",
      "asset": "reference",
      "target": "11.image",
      "required": false
    },
    {
      "name": "scene",
      "kind": "scene",
      "asset": "reference",
      "target": "20.image",
      "required": true
    },
    {
      "name": "voice_hero",
      "kind": "voice",
      "asset": "reference",
      "target": "30.audio",
      "required": false
    }
  ]
}
```

分镜可通过 `asset_slots` 显式映射：

```json
{
  "id": "01",
  "characters": [
    { "id": "lin-mo", "form": "night" },
    { "id": "lan", "form": "default" }
  ],
  "scene": "rain-city",
  "asset_slots": {
    "hero": "lin-mo/night@front",
    "partner": "lan/default",
    "voice_hero": "lin-mo-default"
  }
}
```

解析规则：

- 每个槽位的 `asset` 必填：
  - `"reference"`：使用 owner 的 `reference_asset`（AI / 用户已显式指定）；
  - 具体 asset id：使用该 owner 下的指定资产；
  - 找不到指定资产时直接报错，**不回退**到其它资产；
- `character` 槽位：
  - 有 `asset_slots[slot]`：使用显式角色/形态；该角色/形态必须在本集拆解允许清单内；
  - 映射可写成 `"lin-mo/night"`（用 slot.asset）或 `"lin-mo/night@front"`（显式覆盖 asset id）；
  - 否则按槽位声明顺序映射到 `shot.characters` 的顺序；
  - 槽位多于角色时，`required=true` 报错，`required=false` 跳过；
- `scene` 槽位：使用 `shot.scene`；`shot.scene_asset` 显式指定时优先，否则按 slot.asset 取场景参考；不允许用 `asset_slots` 换成别的场景；
- `voice` 槽位：
  - 有 `asset_slots[slot]`：使用显式音色；该音色必须在本集拆解 `voices[]` 内；
  - 映射可写成 `"lin-mo-default"`（用 slot.asset）或 `"lin-mo-default@sample"`（显式覆盖参考音频）；
  - 否则按槽位声明顺序映射到 `shot.dialogue` 中出现的音色顺序；
  - 同一音色只解析一次；
- `reference` 解析到的 `reference_asset` 为空时，返回 `missing_reference`；具体 asset id 不存在时返回 `asset_not_found`；
- 解析结果必须确定、可复现：同一 `episodes/<id>/shots.json` + `story/` 必须得到同一资产顺序；
- `workflow validate` 必须校验 `.assets.json` 的结构、slot 名唯一、`asset` 为 `"reference"` 或合法 asset id、target 节点/输入存在，但不在没有剧集上下文时解析具体镜头资产。

### 9.3 执行与留档

- 图片与音频资产通过引擎上传接口进入 ComfyUI；
- 资产上传后，对应节点的输入被替换为引擎侧文件名；
- `run.json.inputs` 或 `runs/<run_id>/inputs.json` 必须记录：

```json
{
  "assets": [
    {
      "slot": "hero",
      "kind": "character",
      "owner": "lin-mo/night",
      "asset_id": "front",
      "path": "story/assets/characters/lin-mo/night/front.png",
      "sha256": "4a1b…",
      "bytes": 183920
    }
  ]
}
```

- 资产解析或上传失败时，整个 task 在预检阶段失败，不提交引擎；
- 缺失资产返回 `story_gate_failed` 或 `asset_not_found`，并指出 episode / slot / shot / 期望路径；
- 同一资产在多个镜头、多个剧集复用时不重复计算哈希；上传是否复用由执行层优化，不影响记录；
- `run.json.episode_id` 记录该 run 归属的剧集；系列级参考图 run 可以为 `null`。

### 9.4 兼容

- 没有 `.assets.json` 的工作流行为不变；
- 纯 T2V 工作流可以继续只使用 `prompt` / `seed`；
- `first_frame` 保留现有语义，可与资产槽位共存；
- 旧 `shots.json` 不带 `asset_slots` 时，只有声明了槽位的工作流才触发解析；
- 工作流仍然共享在根 `workflows/`；多集可以复用同一工作流，不建议为每集复制一份。

## 10. Web UI 要求

`daoyan web` 继续只读，不新增写操作。

### 10.1 页面

1. **系列概览**
   - 系列标题 / 简介；
   - 剧集卡片：编号、标题、stage、剧本 revision / 状态、blockers 数量；
   - 全局统计：角色 / 形态 / 场景 / 音色 / 分镜 / 资产；
   - 全局 blockers 与 next_actions。

2. **剧集**
   - 剧集切换器 / 剧集列表；
   - 单集页签：剧本 / 拆解 / 分镜 / 任务 / 成片；
   - 剧本：渲染 `script.md`，显示 revision、status、synced_at、approved_at、changelog；
   - 拆解：角色 + 形态（允许清单）、场景、音色、beats；
   - 分镜：每镜引用的角色/形态、场景、台词与音色；参考资产缩略图；历史 run 与产物播放；
   - 成片：`final/<episode-id>/` 列表与播放。

3. **设定集**
   - 角色：参考图、形态切换、每个形态的资产列表、出现的剧集；
   - 场景：参考图、时间/内外景/氛围、出现的剧集；
   - 音色：试听参考音频、关联角色、模式、出现的剧集。

4. **资产**
   - 按 owner 聚合，显示路径、哈希、来源 run / 来源剧集；
   - 缺失 / LFS 指针未拉取时显示明确状态。

5. **工作流**
   - 共享 `workflows/` 列表、bindings / assets 声明；
   - 被哪些剧集 / 镜头使用；
   - 保留现有工作流查看能力。

### 10.2 API

新增：

```text
GET /api/episodes
GET /api/episodes/:id
GET /api/episodes/:id/script
GET /api/episodes/:id/breakdown
GET /api/episodes/:id/shots
GET /api/episodes/:id/tasks
GET /api/episodes/:id/runs
GET /api/episodes/:id/finals
GET /api/story/characters
GET /api/story/scenes
GET /api/story/voices
GET /api/story/assets
```

保留：

```text
GET /api/health
GET /api/overview              # 系列概览（story 模式）或旧项目概览（legacy）
GET /api/shots                 # legacy；story 模式可返回 410 或空列表并提示
GET /api/finals                # legacy；story 模式返回系列汇总
GET /api/runs/:id
GET /api/tasks
GET /api/tasks/:id
GET /api/artifacts                 # 支持 ?episode=<id> 过滤
GET /api/workflows                 # 共享工作流
GET /media/run/:runId/:name
GET /media/final/:episode/:name
GET /media/final/:name         # legacy
GET /media/story/:owner/:path
```

要求：

- story 模式下 `/api/shots` 不再返回根 `shots.json`；应返回空或明确提示使用 `/api/episodes/:id/shots`；
- `/api/overview` 在 story 模式下返回系列 + 分集摘要；
- 所有 DTO 不含绝对路径；
- 媒体接口支持 Range / HEAD；
- LFS 指针文件不得当作真实媒体返回，应显示“资产未拉取”。

### 10.3 路由与安全

- 前端 hash 路由建议：
  - `#/overview`
  - `#/episode/ep01/shots`
  - `#/episode/ep01/script`
  - `#/characters`
  - `#/scenes`
  - `#/voices`
  - `#/assets`
- `episode` 路径段必须校验 ID 正则，不允许 `..`；
- `/media/final/:episode/:name` 只允许 `final/<episode>/` 白名单；
- `/media/story/:owner/:path` 只允许 `story/assets/` 白名单；
- 继续使用 loopback 默认、Host 校验、CSP、nosniff、no-referrer、DENY；
- Markdown 渲染必须转义原始 HTML，禁止 `<script>` 执行。

## 11. 非功能需求

### 11.1 原子性与一致性

- 所有写命令先全量校验，再原子写盘；
- 失败时原文件不变；
- 每集剧本 revision 与哈希必须同时更新；
- 剧集创建（`episode add`）要么完整创建骨架，要么不留下半成品；
- 资产文件先复制到临时文件，校验哈希后再 rename；
- 不使用数据库，不引入常驻服务。

### 11.2 幂等与并发

- 每集剧本同步同内容幂等；
- `asset add` 相同内容 + 相同 owner/ID 默认拒绝覆盖；
- 支持 `--base-revision`（剧本）和 `--base-sha256`（设定集 / 分镜 / 拆解）防覆盖；
- 不假设多 Agent 并发安全；写冲突以 revision / 哈希检查为准；
- 不同集的写操作互不影响；全局设定集写入是系列级操作；
- 多集不改变机器级单任务锁：不同集也不能并发拍摄，仍受 `machine_busy` 约束。

### 11.3 确定性

- JSON 2 空格缩进 + 末尾换行；
- 剧集按 `number` 排序；数组顺序有业务含义，不得排序；
- 资产解析顺序确定；
- 同一输入产生相同 `run.inputs.assets`；
- 记录不含时间以外的随机字段；时间字段不影响哈希。

### 11.4 安全

- 资产路径 realpath containment；
- 拒绝符号链接、`..`、绝对路径写入共享记录；
- 按魔数校验图片 / 音频类型，不只看扩展名；
- 单文件大小限制；
- Web 只读、loopback 默认、Host 校验、CSP、Markdown 转义；
- 资产入库来源可以是外部绝对路径，但入库后只记录相对路径；
- 剧集 ID / 文件路径不得用于目录穿越。

### 11.5 兼容性

- 没有 `story/` 的项目行为完全不变：
  - 根 `shots.json`；
  - 根 `runs/` / `tasks/` / `final/`；
  - `shot` / `batch` / `wrap` 不需要 `--episode`；
  - `episode_id = null`；
- `story init` 显式启用 story 模式；
- story 模式下根 `shots.json` 被忽略，不要求迁移或删除；
- `shots.json` 新字段全部可选（story 模式除外）；
- `meta.characters` / `meta.scenes` 继续可读；
- 旧 `workflows/*.bindings.json` 不变；
- `run` 不新增必填参数；
- 旧 task/run 记录没有 `episode_id` 时按 `null` 读取；
- 不要求迁移旧项目；需要时由 Agent 手工补齐 story。

### 11.6 性能

- `story status` 在 50 集、每集 100 镜头、100 角色、1000 资产规模下 2 秒内返回；
- 默认不重算全部资产哈希；
- `--verify-hashes` 才做全量 I/O；
- 系列概览只读 `episode.json` / `script.json` / `breakdown.json` / `shots.json` 元数据，不加载完整产物；
- Web 分页 / 限流沿用现有策略；
- `runs/` / `tasks/` 扁平存储，按 `episode_id` 过滤；不要求为每集建目录。

### 11.7 Git / LFS

`.gitattributes` 新增：

```text
story/assets/**        filter=lfs diff=lfs merge=lfs -text
episodes/**/anchors/** filter=lfs diff=lfs merge=lfs -text
```

- 参考图、音频、分集首帧图进 LFS；legacy 根 `anchors/` 保持原状，需要时由用户自行执行 LFS 迁移；
- `story/*.json`、`episodes/**/*.json`、`episodes/**/script.md` 普通文本进 Git；
- 不自动 `git commit`；
- 不在共享记录中写机器路径。

## 12. 验收场景

### A. 系列立项与多集

1. `daoyan init` + `daoyan story init`；
2. 默认存在 `episodes/ep01/`；
3. `story episode add --id ep02 --number 2 --title "失踪者"`；
4. `story episode list` 按 number 返回 ep01、ep02；
5. 重复 number 或缺 id 被拒绝。

### B. 第 1 集全流程

1. `story script sync --episode ep01`；
2. `story script approve --episode ep01`；
3. 全局 `characters set` / `scenes set` / `voices set`；
4. `story breakdown set --episode ep01`；
5. `story asset add` 为使用的形态 / 场景 / 音色入库；
6. `story shots set --episode ep01`；
7. `story status --episode ep01` 返回 `stage=ready`；
8. `shot 01 --episode ep01` 成功创建 task，task/run 带 `episode_id=ep01`。

### C. 第 2 集复用全局设定

1. ep02 使用 ep01 已登记的角色 `lin-mo`；
2. 新增夜行形态 `lin-mo/night`，加入全局角色；
3. 不为 ep02 复制一个新角色；
4. ep02 breakdown 只声明 `lin-mo/night`；
5. ep02 分镜使用 `lin-mo/night` 正常通过；
6. ep01 的默认形态和分镜不受影响。

### D. 单集剧本变更隔离

1. ep01、ep02 都已 ready；
2. 同步 ep02 剧本 revision + 1；
3. `story status --episode ep02` 显示 `stage=breakdown`，`breakdown` / `shots` stale；
4. `story status --episode ep01` 仍为 `ready`，无 stale；
5. `shot 01 --episode ep02` 返回 `story_gate_failed`；
6. `shot 01 --episode ep01` 正常；
7. 更新 ep02 拆解和分镜后恢复。

### E. 拆解允许清单

1. ep02 拆解只声明 `lin-mo/night`；
2. ep02 分镜使用 `lin-mo/default`；
3. `story validate --episode ep02` 返回 `entity_not_in_breakdown`；
4. `story shots set` 拒绝写入；
5. 在拆解中加入 `default` 后通过。

### F. 资产按集隔离检查

1. ep02 使用 `lin-mo/night`，该形态没有显式指定参考图；
2. `story status --episode ep02` 的 `stage=assets`，blocker 指向 `lin-mo/night` 与相关镜头；
3. `story status --episode ep01` 不受影响；
4. 给 `lin-mo/night` 入库参考图并显式 `--set-reference` 后，ep02 恢复；
5. 只入库参考图但未指定 `reference_asset` 时，仍保持 `missing_reference`（不自动取第一张）；
6. ep01 不因为该资产新增而重新计算 ready。

### G. 共享资产与删除保护

1. `lin-mo/default/front` 被 ep01 和 ep02 同时使用；
2. 删除该资产被拒绝，`details.references[]` 同时列出 ep01 和 ep02；
3. 删除仍被 `reference_asset` 引用的资产被拒绝；
4. 替换 `reference_asset` 后可删除旧资产；
5. 一个形态只有 `side` 资产、没有 `reference_asset` 时，门禁仍报 `missing_reference`；
6. `story asset set-reference` 指向 `side` 后才就绪；
7. `--force` 删除当前 reference 后，门禁回到 `missing_reference`，不会自动选另一张；
8. 删除资产不影响其它 owner。

### H. 多集缺省与错误

1. 项目有 ep01、ep02；
2. `daoyan shot 01` 未传 `--episode`；
3. 返回 `episode_required`，`details.episodes` 包含 ep01、ep02；
4. `daoyan shot 01 --episode ep02` 正常；
5. `daoyan shot 01 --episode ep99` 返回 `episode_not_found`；
6. `daoyan story status` 不带 `--episode` 正常返回系列概览，不报 `episode_required`；
7. `daoyan story script sync --file ...` 不带 `--episode` 被 `episode_required` 拒绝（多集时写入命令必须显式）；
8. `daoyan run t2v --set seed=1` 不带 `--episode` 正常执行，`episode_id=null`。

### I. run / task / final 归属

1. `shot 01 --episode ep02` 创建的 task/run 带 `episode_id=ep02`；
2. `run t2v --episode ep02 --label ref` 带 `episode_id=ep02`；
3. 系列级参考图 run 不带 `--episode`，`episode_id=null`；
4. `wrap --episode ep02` 只选 ep02 的 run，写 `final/ep02/`；
5. `final/ep01/` 不被修改；
6. manifest 包含 `episode_id`。

### J. 资产从 run 入库

1. 用 `run` 执行角色设定图工作流；
2. `story asset add --from-run <run_id> --output <name>`；
3. 资产被复制到 `story/assets/`；
4. 记录 `source_run`、`source_episode_id`、`sha256`、`bytes`；
5. 删除原 run（模拟清理）后资产仍存在且可被 Web 播放。

### K. 旧项目兼容

1. 没有 `story/` 的旧项目；
2. `shot` / `batch` / `wrap` 行为与升级前一致，不需要 `--episode`；
3. 根 `shots.json` 没有 `script_revision` 不报错；
4. 旧 task/run 没有 `episode_id` 不报错；
5. `validate` 不新增阻断项。

### L. Web 与安全

1. Web 显示系列概览、ep01/ep02 卡片与 stage；
2. 切换到 ep02 后显示该集剧本、拆解、分镜、成片；
3. 设定集页面显示角色形态、参考图、出现剧集；
4. 音频可播放，图片可查看；
5. 访问 `story/assets` 之外的路径返回 404；
6. 共享 JSON 与 API 不出现绝对路径；
7. 剧本中的 `<script>` 不被执行；
8. LFS 指针文件显示“未拉取”，不返回乱码媒体。

## 13. 非目标

- 剧本生成、改写、续写、语法检查；
- 自动 NLP 拆解；
- 图像 / 音频 / 视频生成算法；
- 自动选角、自动分镜、自动运镜建议；
- 图像编辑、抠图、换装、表情迁移；
- 语音克隆模型管理与训练；
- 自动审片、审美评分、爆款预测；
- 自动跨集连续性检查（服装进度、时间线、伏笔回收）；
- 系列总合片 / 整季导出；
- 剧集删除 / 合并 / 拆分；
- 每集独立的工作流分支管理；
- 多系列项目库 / 跨项目资产库；
- 多人实时协作、云端同步；
- Web 端编辑剧情数据；
- 自动 Git 提交；
- 旧项目自动迁移。

## 14. 决策确认与待确认

| # | 决策 | 状态 |
|---|---|---|
| 1 | 一个项目 = 一部多集短剧（系列）；不是多个系列共用一个项目 | **已确认** |
| 2 | 每集剧本用 Markdown；docx / pdf / txt 由用户或 Agent 转成 Markdown 后同步 | **已确认** |
| 3 | 全局设定集共享：角色 / 场景 / 音色 / 资产不按集复制；新造型加形态，新地点加场景 | **已确认** |
| 4 | 每集拆解是制作范围与允许清单：只列本集需要的角色、形态、场景、音色；分镜只能使用拆解内的对象 | **已确认** |
| 5 | 「形态」是视觉状态（服装、年龄、伤妆、变身），不是动画关键帧 | **已确认** |
| 6 | 「音色」是角色音色档案，至少包含参考音频或文本描述；克隆参数由工作流负责 | **已确认** |
| 7 | 剧本确认是协议行为：AI 在用户明确确认后调用该集 `story script approve`；dycli 只能记录，不能证明用户同意 | **已确认** |
| 8 | strict 门禁默认开启；如果希望“先拍后补”，可在 `project.json` 设 `story.enforce=warn` | **已确认** |
| 9 | 多集项目写入 / 生产 / 单集 show 命令必须显式 `--episode`；单集可省略；legacy 不使用 | **待确认**：推荐 A，详细对比见 7.2.2；本文按 A 编写 |
| 10 | runs / tasks 保持根目录扁平存储，通过 `episode_id` 归属；不按集建目录；后续可加迁移工具 | **已确认** |
| 11 | final 按集分目录：`final/<episode-id>/`；系列总合片后续再做 | **已确认** |
| 12 | 全局设定集变更不自动使任何集 stale；是否重做由 AI / 用户判断；后续可加 bible revision | **已确认** |
| 13 | 工作流资产槽位是建议契约；v0.3 的 `asset` 取 `reference` 或具体 asset id；实施前结合真实 ComfyUI 节点确认 | **已确认（方向）** |
| 14 | 被使用的参考资产必须由 AI / 用户显式指定；被使用时无 `reference_asset` 即 `missing_reference`；不再自动取第一张图 | **已修正** |
| 15 | 首期不提供剧集删除；删除剧集是破坏性操作，需要单独设计 | **已确认** |
| 16 | `story init` 是显式操作；`init` 不自动改变旧项目的行为 | **已确认** |

> 第 9 条的“区别”不是参数多写几个字，而是**省略时是否允许 dycli 猜目标集**。当前推荐 A（显式），理由见 7.2.2：写错集的成本远高于 `episode_required` 的失败成本；不引入 cwd 推断和持久“当前集”状态。

## 15. 建议分期

### P0：系列模型与真源

- `story init` / `series show/set` / `episode add/list/show/set`；
- 每集 `script sync/show/approve`；
- 每集 `breakdown set/show`；
- 全局 `characters/scenes/voices set/show`；
- `story asset add/remove/list/set-reference`；
- 每集 `shots set`；
- `story status` 系列概览 / 单集详情；
- `story validate` 全量 / 单集；
- `shot` / `batch` / `retake` `--episode` 与门禁；
- task/run `episode_id`、label、按集 final；
- Skill 新增 `reference/story.md` 与多集硬规则；
- Web 系列概览 + 剧集切换 + 剧本/拆解/分镜/设定基础展示；
- LFS 规则与测试。

### P1：工作流消费设定资产

- `workflows/<name>.assets.json` 槽位；
- 多角色图 / 场景图 / 音色参考音频上传；
- `run.inputs.assets` 留档；
- 参考图生成 → 入库闭环示例；
- Web 资产页、音色试听、角色出现剧集；
- 多集共享资产的完整测试。

### P2：音频与高级能力

- 台词 / TTS 产物与视频合片；
- `wrap` 保留 / 混合音轨；
- 系列总合片 / 整季导出；
- 跨集连续性检查（服装、时间线、角色状态）；
- 剧集删除 / 合并 / 拆分；
- 旧项目 story 迁移工具；
- 全局 bible revision / 审批状态。

## 16. 与现状的差距

| 能力 | 现状 | 本需求 |
|---|---|---|
| 多集 | 单份根 `shots.json` | `episodes/<id>/`，每集独立 |
| 系列元数据 | 无 | `story/series.json` |
| 剧本 | 不存在 | 每集 `script.md` + revision / 审批 |
| 全局角色 / 场景 | `shots.meta` 展示字段 | 独立设定集 + 稳定 ID |
| 形态 | 无 | 角色内 `forms[]`，跨集共享 |
| 音色 | 无 | `voices.json` + 参考音频 |
| 单集拆解 | 无 | 每集 `breakdown.json` 允许清单 |
| 参考资产 | 仅 `meta.anchors` / `first_frame` | `story/assets` + 哈希 + 来源 |
| 资产来源 | 无记录 | `source_run` / `source_output` / `source_episode_id` |
| 剧本变更 | 无感知 | 单集 stale 检测 + 门禁 |
| 分镜引用 | 字符串 / 对象，仅展示 | 校验到拆解 / 形态 / 场景 / 音色 |
| 工作流资产 | 单张 `first_frame` | 多图 / 音频槽位 |
| 任务 / run | 无剧集归属 | `episode_id` + label |
| 成片 | 根 `final/cut-*` | `final/<episode-id>/cut-*` |
| Skill | 通用 workflow / shot | 多集生命周期 + 硬规则 |
| Web | 单项目分镜 / 任务 / 产物 | 系列 / 剧集 / 设定 / 阶段 |
| 门禁 | 无 | 单集 strict 阶段门禁 |

## 17. 术语

| 术语 | 含义 |
|---|---|
| 系列（series） | 一部多集短剧；整个 dycli 项目 |
| 剧集（episode） | 系列中的一集；`episodes/<id>/` |
| 全局设定集（bible） | `story/*.json`，跨集共享的角色/场景/音色/资产 |
| 单集拆解（breakdown） | 本集允许使用的角色、形态、场景、音色、beat 清单 |
| 剧本（script） | 某一集的最新故事正文，`episodes/<id>/script.md` |
| revision | 单集剧本内容版本号，内容变化才递增 |
| 形态（form） | 角色的视觉状态，如日常 / 夜行 / 战损 |
| 音色（voice） | 角色声音档案，含参考音频或文本描述 |
| 资产（asset） | 参考图、参考音频等可被工作流消费的文件 |
| 资产槽位（asset slot） | 工作流声明的逻辑输入，由分镜解析为具体资产 |
| 分镜（shot） | 某集 `shots.json` 中的单个镜头 recipe |
| stale | 某集拆解/分镜基于旧版剧本，需要重新确认或更新 |
| 门禁（gate） | 拍摄前对单集剧本、拆解、资产、分镜的强制校验 |
| 设定图工作流 | 用于生成角色/场景参考图的工作流，可用 `run` 独立执行 |
| 分镜工作流 | 消费角色/场景/音色资产，生成镜头画面的工作流 |
| legacy | 没有 `story/` 的旧项目；继续使用根 `shots.json`，行为不变 |
