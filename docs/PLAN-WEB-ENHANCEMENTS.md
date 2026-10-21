# Web 端增强方案：角色卡预览、访问地址展示、每集剧情图谱与生成上下文

> 状态：方案待评审
> 日期：2026-10-21
> 修订：按「资产最终服务于 AI 生成决策」重排优先级；R3 从「做可视化」改为「先生成上下文，再把拓扑 / 时序作为视图」
> 范围：`dycli web` 的三项增强，以及支撑「AI 决定 ComfyUI 工作流」的生成上下文数据层 / CLI / API；一次性设计、分阶段实施
> 关联：[WEB.md](WEB.md)、[COMMANDS.md](COMMANDS.md)、[DATA-MODEL.md](DATA-MODEL.md)、[REQUIREMENTS.md §10](REQUIREMENTS.md)

**目录**

- [0. 需求摘要与核心目的](#0-需求摘要)
- [1. 现状与根因](#1-现状与根因)
- [2. 总体设计](#2-总体设计)
- [3. R1：角色卡图片点击预览](#3-r1角色卡图片点击预览)
- [4. R2：`--host` 展示全部可访问地址](#4-r2--host-展示全部可访问地址)
- [5. R3：每集剧情图谱与生成上下文](#5-r3每集剧情图谱与生成上下文)
- [6. 实施阶段](#6-实施阶段)
- [7. 文件改动清单](#7-文件改动清单)
- [8. 测试与验收](#8-测试与验收)
- [9. 风险与备选方案](#9-风险与备选方案)
- [10. 已确定的默认取舍](#10-已确定的默认取舍)

## 0. 需求摘要

| 编号 | 需求 | 目标 |
|---|---|---|
| R1 | 角色卡图片无法预览 | 角色 / 场景 / 音色 / 设定资产页的参考图点击后打开灯箱 |
| R2 | `web --host` 只展示 `127.0.0.1` | 像 Vite 一样列出 Local 与全部可访问的 Network 地址 |
| R3 | 看不到角色、场景关系 | 每集提供**生成上下文**（角色 / 形态 / 场景 / 参考资产 / workflow 候选 / 槽位 / 缺口 / 连续性），以及它的拓扑图与时序图视图 |

三项改动共享同一套前端资源与 Web 服务，建议作为同一个 Web 增强版本交付。R1、R2 独立且改动小，可先落地；R3 是核心功能，但它的核心不是「画图」，而是**把资产解析成 AI 可直接消费的生成上下文**。

### 0.1 核心目的对齐

这套资产体系的最终链路不是「看图」，而是：

```text
全局资产（角色 / 形态 / 场景 / 音色 / 参考图）
  + 单集结构（剧本 / 拆解 / 分镜）
        │  dycli 解析
        ▼
生成上下文：每个镜头可用的角色形态、参考资产、场景、音色、
           工作流候选、槽位映射、连续性约束与缺口
        │  AI 决策
        ▼
shots.json 中的 workflow / asset_slots / first_frame / prompt
        │  shot / batch 执行
        ▼
run 产物与失败反馈
        │
        └──→ 回到生成上下文，支持重拍与质量迭代
```

因此本方案的优先级是：

| 优先级 | 内容 | 服务于 |
|---|---|---|
| P0 | dycli 把资产解析成 AI 可直接消费的生成上下文（资产、槽位、workflow 候选、缺口、连续性） | AI 决定 ComfyUI 工作流 |
| P0 | AI 决策写回 `shots.json`，执行前能预检、执行后能看到结果 | 视频生成质量 |
| P1 | 拓扑图 / 时序图 / 叙事标注 | 用户维护与理解全局信息 |
| P2 | 故事时间、关系标签、装饰性交互 | 人的阅读体验 |

拓扑图与时序图是生成上下文的**人类可读投影**，不是独立的数据产品。若两者冲突，以生成上下文和 `shots.json` 为准。

**本次方案的核心校验**：

1. 每个镜头的角色、形态、场景是否解析到了**具体的参考资产**，而不只是名字？
2. AI 是否能看到**有哪些 workflow 可用、每个 workflow 需要哪些资产槽位、当前镜头缺什么**？
3. AI 做完 workflow / 槽位 / 首帧 / prompt 决策后，是否通过 `shots.json` 写回并被执行层严格校验？
4. 生成结果（run 状态、产物、失败）是否回填到同一份上下文，支持重拍与质量迭代？
5. 拓扑图与时序图是否只是上述数据的视图，而不是另造一套需要维护的数据？

如果某条改动不能回答其中至少一条，它就不属于本方案的核心范围。

## 1. 现状与根因

### 1.1 R1：角色卡图片不可预览

- 角色卡、场景卡、音色卡、设定资产页统一通过 `assetNode()` 渲染（`src/core/web/ui/app.client:707`）。
- 图片分支只创建 `<img>`，没有绑定点击事件；页面已有的模态预览 `openImage()` / `setModal()`（`src/core/web/ui/app.client:2514`、`:2560`）只接给了「产出物」卡片。
- `/media/story/...` 已能正常返回参考图，问题完全在前端。

### 1.2 R2：`--host` 只展示一个地址

- `startWebServer()` 只计算单个 `url`，`displayHost()` 把 `0.0.0.0` 直接映射成 `127.0.0.1`（`src/core/web/server.mts:210`）。
- `runWeb()` 只打印 `handle.url`（`src/commands/web.mts:158`），没有枚举 `os.networkInterfaces()`，所以多网卡、局域网地址全部缺失。

### 1.3 R3：缺少关系 / 时序视图，更缺少 AI 可消费的生成上下文

表面问题是「看不到角色、场景关系」，但真正的缺口在更下面一层：

- 现有剧集页只有剧本、拆解、分镜、任务、成片等文本 / 卡片区块（`src/core/web/ui/app.client:801`），没有把「时间、角色、形态、场景」关联起来。
- 拆解 `breakdown.json` 只提供本集允许的角色 / 形态 / 场景清单；分镜 `shots.json` 才有逐镜的出场角色、形态、场景、时长。
- 现有 Web 分镜 DTO 的 `resolveEntities()` 只保留 `id / name / description / reference`，**不保留 `form`**（`src/core/web/data.mts:1275`）。形态信息不能从 `/api/episodes/:id` 的 `shots` 直接拿。
- **资产没有按镜头解析成可执行上下文**：AI 需要自己读 `characters.json` / `scenes.json` / `breakdown.json` / `shots.json` / `workflows/*.assets.json`，再手工推断「这个镜头该用哪个形态的哪张参考图、哪个场景资产、哪个 workflow、哪个 slot」。这正是最影响生成质量、也最容易出错的一步。
- **缺少非抛错的预检能力**：`resolveWorkflowAssets()`（`src/core/story/workflow-assets.mts:389`）遇到缺失资产会直接抛错，无法在规划阶段告诉 AI「这个 workflow 缺什么、换一个能不能跑」。
- **缺少连续性与渲染反馈**：同一场景的相邻镜头是否换形态、是否用首帧接力、上一镜是否已生成 / 失败，这些直接影响视频一致性，但没有集中暴露。

因此 R3 要解决的不是「加一个图」，而是：**把资产、分镜、工作流槽位、连续性与 run 结果聚合成一份 AI 可消费、执行层可复用的生成上下文，并给人类一个同源的可视化视图。**

## 2. 总体设计

### 2.1 三项改动定位

| 改动 | 层 | 是否改数据文件 | 是否改 API |
|---|---|---|---|
| R1 图片预览 | 前端 | 否 | 否 |
| R2 地址展示 | CLI + Web 服务 | 否 | 启动信封新增字段 |
| R3 剧情图谱 + 生成上下文 | 数据模型 + 资产解析 + CLI + API + 前端 | 可选新增 `story-map.json`（仅叙事标注） | 新增只读接口与字段 |

### 2.2 R3 数据所有权：事实自动推导，决策写回分镜，叙事可选标注

R3 的数据拆成四层，这是本方案最关键的决策：

| 层 | 内容 | 来源 | 是否允许人工修改 |
|---|---|---|---|
| 事实层 | 事件时间 / 时长 / 顺序、出场角色与形态、场景、参考资产、工作流目录、槽位要求、连续性、run 状态 | dycli 从全局设定集 / `breakdown.json` / `shots.json` / `workflows/` / `runs/` 实时推导 | 否 |
| 决策层 | 每个镜头的 `workflow`、`asset_slots`、`first_frame`、`prompt`、`seed`、`steps` 等 | AI / 用户写入 `shots.json`，经 `story shots set` 校验 | 是 |
| 叙事层 | 事件标题 / 摘要、重要度、故事时间、角色关系标签、备注 | AI / 用户写入可选的 `story-map.json` | 是，经 `story map set` 校验 |
| 展示层 | 拓扑节点 / 边、时间轴、缺口面板、筛选与布局 | Web 服务与前端从上面三层计算 | 否 |

关键原则：

1. **事实层不落盘成第二份数据**：每次从 `shots.json` / `breakdown.json` / 全局设定 / `workflows/` / `runs/` 重新推导，分镜改了上下文立即跟着变。
2. **AI 的生成决策只写回 `shots.json`**：不新增 `generation-plan.json` 之类会与执行分叉的计划文件。执行层读到的就是 AI 写下的决策。
3. **dycli 不替 AI 选 workflow**：它提供候选、槽位要求、缺口与预检结果；选择权在 AI / 用户，dycli 负责严格校验。
4. **叙事标注是可选增强**：没有 `story-map.json` 时，生成上下文和拓扑 / 时序仍然完整可用。
5. **开箱即用、可回退**：删除标注文件只影响叙事字段，不影响生成上下文与生产数据。

dycli **不内置、不调用 LLM**。项目定位是 agent-native：外部 Agent 读生成上下文、做决策、写回 `shots.json`。dycli 负责把资产解析成事实、把约束暴露成缺口、把决策校验成可执行计划。

### 2.3 前端约束

- 前端资源内嵌在 `dist/cli.mjs`，不依赖 CDN、外部静态目录或外部图库。
- 拓扑图用原生 SVG 手写渲染，时序图用原生 DOM + CSS；不引入 force-graph / d3 / mermaid。
- 所有文本继续用 `textContent` / SVG `<text>`，避免注入。
- 不改 CSP；同源图片与内联 SVG 均在现有策略内。

### 2.4 AI 生成决策闭环

R3 的主线不是「看图」，而是下面这个闭环。拓扑图 / 时序图只是闭环中数据的可视化：

```text
story map show --episode <id> --json
  ├─ map.events[]：每镜时间 / 场景 / 角色 / 形态
  ├─ map.catalog：每个形态 / 场景 / 音色的全部参考资产（present / LFS / 尺寸 / 主参考）
  ├─ map.generation.workflows[]：可用 workflow、bindings、资产槽位要求
  ├─ map.generation.events[].workflow：当前指派与槽位解析
  ├─ map.generation.events[].continuity：场景 / 形态变化、relay、anchor
  ├─ map.generation.events[].render：最新 run / 产物 / 失败
  └─ map.generation.gaps[]：缺参考图、缺文件、缺 workflow、槽位不可解析……
        │
        ▼
AI 决策（外部 Agent）
  - 为每镜选择 workflow（T2V / I2V / 首帧接力 / 多参考……）
  - 选择具体参考资产，决定 asset_slots 映射
  - 决定 first_frame（anchor / relay / none）
  - 基于形态 / 场景描述、事件摘要与 beat 重写 prompt、steps
        │
        ▼
story shots show --episode <id> --json   ← 读取当前完整分镜 recipe
        │  AI 在完整 recipe 上修改，保留 meta / defaults / 未涉及字段
        ▼
story shots set --episode <id> --file <shots.next.json>
        │  dycli 校验 workflow / bindings / 资产槽位 / relay / 门禁
        ▼
story map show --episode <id> --json      ← 复查 gaps 是否清零
        │
        ▼
shot / batch --episode <id>               → run 产物 → render 状态回填

若现有候选都不满足：
  AI 用 workflow new / import / apply / set 调整图
  → 更新 workflows/<name>.assets.json 声明资产槽位
  → workflow validate
  → 写回 shot.workflow
  → 重新 story map show 复查
```

完整 workflow 图与节点契约仍通过现有 `workflow show --json` / `workflow nodes` / `workflow node <class_type>` 获取；需要新增节点时，先用 `workflow nodes` / `workflow node` 查节点契约，再用 `workflow apply` 编辑图。`generation.workflows[]` 只给候选摘要（bindings、槽位、节点类名），避免在剧集响应里内嵌整张图。

AI 读取当前完整分镜 recipe 使用 `story shots show --episode <id> --json`；它同时给出 `meta` / `defaults` / `style_prefix`，供 AI 决定 prompt 与参数档位。在该文件基础上修改后再 `story shots set`，避免丢失未涉及字段。`story map show` 负责「资产与生成约束」，`story shots show` 负责「当前 recipe」，两者配合完成一次决策闭环。

**AI 决策对应的数据与写回位置**

| AI 需要判断的事 | 上下文里看什么 | 决策写回 |
|---|---|---|
| 用哪个 workflow | `generation.workflows[]` 的 bindings、`asset_slots`、`node_classes`、`candidate_workflows[].fit` | `shot.workflow` |
| 现有 workflow 不满足怎么办 | `workflow show --json` 看完整图；`generation.workflows[].unusable_reasons` 看缺口 | 用 `workflow new|import|apply|set` 改图，补 `.assets.json`，`workflow validate` 后再写 `shot.workflow` |
| 用哪张参考图 / 哪个资产 | `catalog.*.forms[].assets[]` + `generation.events[].cast[].asset_ids[]` | 角色 / 音色：`shot.asset_slots`；场景：`shot.scene_asset` |
| 要不要首帧接力 | `continuity.relay_from` / `relay_targets`、上游是否有成功产物 | `shot.first_frame` |
| 同场景是否保持一致 | `continuity.same_scene_as_prev`、`form_changes` | 保持或调整 `character.form` / `scene` |
| prompt 写什么 | 形态描述、场景描述、beat、事件摘要、风格前缀 | `shot.prompt` |
| 质量档位 | `importance`、事件重要度、可用 workflow 能力 | `shot.steps` / `shot.params` |
| 是否需要重拍 | `generation.events[].render.latest_status`、失败原因、最新产物 | `retake` / 重新 `shots set` |
| 缺什么才能生成 | `generation.gaps[].hint` | `story asset add` / `set-reference` / `workflow` 修正 |

**质量决策信号**

| 信号 | 上下文 | 对生成质量的影响 |
|---|---|---|
| 事件重要度 | `importance` / 场景切换 | major 升 steps 或选更强 workflow；minor 降档控制成本 |
| 场景连续性 | `continuity.same_scene_as_prev` | 同场景保持同一场景参考与形态，减少画面跳变 |
| 镜头连续性 | `continuity.relay_from` / `relay_targets` | 优先首帧接力，保持运动与构图连续 |
| 形态一致性 | `continuity.form_changes` | 非叙事需要不换形态；换形态时切换对应参考资产 |
| 资产质量 | `AssetRef.width` / `height` / `present` / `lfs_pointer` | 优先可用且分辨率合适的主参考；LFS 未拉取先修复 |
| 渲染反馈 | `generation.events[].render` | 失败先修 workflow / 资产；成功但质量差可 `retake` |

**给 AI 的硬规则（写入 Skill）**

1. 只能从 `catalog` 里选择角色、形态、场景和资产 id，不得编造。
2. 当同一角色有多个形态或多个资产时，必须显式写 `form` 与 `asset_slots`，不要依赖默认形态或槽位顺序猜测。
3. 同一场景的连续镜头优先保持同一形态与场景参考；换形态必须有叙事理由。
4. 需要镜头连续性时，优先使用 `relay` 或首帧接力，而不是重新文生。
5. 关键事件（`importance = major`）可以使用更高 steps 或更强 workflow；过场事件可以降档。
6. 有 blocker 级 `gaps` 时先补资产 / 修映射，不要用「换一张图凑」的方式绕过。
7. 没有候选 workflow 满足时，先修改 workflow 图或 `.assets.json` 槽位并 `workflow validate`，不要把不适配的 workflow 硬塞给镜头。
8. AI 不把生成决策写进 `story-map.json`；生成决策只写 `shots.json`，标注文件只放叙事字段。

**示例：镜头 03 的一次完整决策**

- 上下文：
  - `cast`：`lin-mo/night`，主参考 `front`，另有 `side`；
  - `scene`：`rain-city`，主参考 `establishing`；
  - `workflows`：`i2v`（需要 character 槽位 `hero`，可选 scene 槽位）、`t2v`（无资产槽位）；
  - `continuity.relay_from = "02"`，镜头 02 已有成功产物；
  - `render`：镜头 03 尚未生成。
- AI 决策：
  - `shot.workflow = "i2v"`；
  - `shot.asset_slots = { "hero": "lin-mo/night@front", "scene": "rain-city@establishing" }`；
  - `shot.first_frame = { "relay": "02" }`；
  - `shot.prompt` 补入「黑色雨衣、夜行装、积水倒影」；
  - `shot.steps = 24`（关键事件升档）。
- 写回后 `story map show`：
  - `generation.events[03].workflow.slots` 明确指向 `front.png` 与 `establishing.png`；
  - `gaps` 为空，`ready = true`；
  - `shot` 执行时上传的资产与上述槽位完全一致；
  - 执行完成后 `render.latest_status / latest_outputs` 回填，AI 可据此决定是否重拍。

## 3. R1：角色卡图片点击预览

### 3.1 前端改动

**提取通用图片预览入口**（`src/core/web/ui/app.client`）：

```js
function openImageUrl(url, title) {
    const image = document.createElement("img");
    image.src = url;
    image.alt = title;
    setModal(title, image, "图片");
    modalPrev.disabled = true;
    modalNext.disabled = true;
}

function openImage(item) {
    openImageUrl(item.output.media_url, item.output.name);
}
```

**让 `assetNode()` 的图片可点击**：

- 图片外包一层 `<button type="button" class="asset-thumb">`，不要直接给 `<img>` 绑 click：
  - 键盘 Enter / Space 可触发；
  - `aria-label="预览 <path>"`，`title="点击预览"`；
  - 点击调用 `openImageUrl(asset.media_url, asset.path)`。
- 仅对 `present === true && lfs_pointer !== true` 的图片生效；音频继续用原生 `controls`。
- 角色、场景、音色、设定资产页全部复用 `assetNode()`，改一处即全部生效；主参考图与「其它资产」缩略图都支持。
- 剧情图谱中的角色形态缩略图复用同一个 `openImageUrl()`，不再单独实现灯箱。

**样式**（`src/core/web/ui/style.css`）：

```css
.asset-thumb {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    border-radius: var(--radius-sm);
    cursor: zoom-in;
}
.asset-thumb:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}
.asset-thumb:hover img {
    filter: brightness(1.08);
}
```

**模态框文案**：`index.html:17` 的 eyebrow 当前写死「产出物预览」，改为中性的「预览」。

### 3.2 验收

- 角色页点击主参考图、其它缩略图均可打开灯箱；
- Esc、遮罩点击、关闭按钮均可关闭；
- 键盘 Tab 聚焦图片按钮，Enter / Space 打开；
- 音频控件、产出物预览、视频播放不受影响。

## 4. R2：`--host` 展示全部可访问地址

### 4.1 新增地址推导模块

新增 `src/core/web/addresses.mts`，把地址逻辑从 server / command 中抽成可注入、可单测的纯函数：

```ts
export interface AccessUrls {
    local: string[];
    network: string[];
}

export function isLoopbackHost(host: string): boolean;

export function buildAccessUrls(options: {
    host: string;                                  // 用户监听地址
    port: number;                                  // 实际监听端口
    family: "IPv4" | "IPv6";                       // server.address() 的实际 family
    interfaces?: NodeJS.Dict<NetworkInterfaceInfo[]>;
}): AccessUrls;
```

同时收拢 `isLoopbackHost()`，删除 `src/commands/web.mts:112` 与 `src/core/web/server.mts:203` 的重复实现。

### 4.2 地址规则

| 监听 host | Local | Network |
|---|---|---|
| `127.0.0.1` | `http://127.0.0.1:<port>` | 无 |
| `localhost` | `http://localhost:<port>` | 无 |
| `::1` / `[::1]` | `http://[::1]:<port>` | 无 |
| `0.0.0.0` | `http://127.0.0.1:<port>`（保持现状） | 所有非 internal 的 IPv4 网卡地址 |
| `::` | `http://[::1]:<port>` | 非 internal 的 IPv4 + IPv6 地址（IPv6 加方括号） |
| 具体局域网 IP / 主机名 | 无 | 按用户给定的 host 输出一条 |

约束：

- `url` 字段保持现状（`0.0.0.0` 仍是 `127.0.0.1`），避免破坏已有脚本；新增地址只做增量。
- 监听 `0.0.0.0` 时不列 IPv6，因为列出的 IPv6 地址实际连不上；只有监听 `::` 才列 IPv6。
- 过滤 `internal` 网卡与 `fe80::/10` 链路本地地址；按 local → IPv4 → IPv6 稳定排序并去重。
- 监听前去掉 IPv6 方括号：用户写 `[::1]` / `[::]` 与 `::1` / `::` 等价，避免 `server.listen()` 收到带括号的地址。
- 无网络地址时只显示 Local，不报错。
- 非 loopback 监听的局域网风险提示保留。

### 4.3 Web 服务改动

- `WebServerHandle` 增加：

```ts
urls: {
    local: string[];
    network: string[];
};
```

- listen 成功后用 `server.address()` 的真实 `family` 调用 `buildAccessUrls()`，不要用请求的 host 猜协议族。
- `url` 取 `urls.local[0] ?? urls.network[0]`，保持向后兼容。
- 删除 `displayHost()`。

### 4.4 启动输出

人类可读模式：

```text
daoyan web · demo · local
  Local:   http://127.0.0.1:53217
  Network: http://192.168.1.23:53217
  Network: http://10.8.0.3:53217
  Ctrl+C 停止
```

`--json` 启动信封保留 `url`，新增 `urls`：

```json
{
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
```

`--open` 仍打开本地地址。

## 5. R3：每集剧情图谱与生成上下文

### 5.1 概念模型

**事件 = 镜头**。一个镜头天然具备时间、时长、场景、出场角色与形态，是时序图上最稳定的节点。更高层的叙事单元使用拆解里的 `beats` 表示，作为事件上的标签，不另造独立事件。

| 概念 | 来源 | 说明 |
|---|---|---|
| 事件 Event | 每集 `shots.json` 的一个镜头 | 顺序即时间顺序 |
| 时间 Time | 镜头时长累加 | 主时间轴是**屏幕时间**，不是叙事时间 |
| 故事时间 Story time | 叙事标注（可选） | 如「第一夜 21:40」，只作为事件标签 |
| 角色 Character | 全局 `story/characters.json` | 节点 |
| 形态 Form | 全局角色下的 `forms[]` | 角色节点下的形态；按形态视图时成为独立节点 |
| 场景 Scene | 全局 `story/scenes.json` | 节点 |
| 音色 Voice | 全局 `story/voices.json` | 事件台词引用；参考音频进入生成上下文 |
| 场景关系 Appears-in | 从分镜推导 | 角色 / 形态出现在哪个场景，带事件数与时长权重 |
| 共现 Co-occurrence | 从分镜推导 | 同一事件中同时出现的角色对 |
| 叙事关系 Relation | AI / 用户标注（可选） | 如「旧识」「敌对」，带标签与备注 |
| 重要度 Importance | 推导 + 可标注 | `major` / `normal` / `minor` |
| 参考资产 AssetRef | 全局设定集的 `assets[]` | 每个形态 / 场景 / 音色的具体文件、主参考、可用状态 |
| 工作流候选 Workflow candidate | `workflows/*.json` + `.bindings.json` + `.assets.json` | AI 可选的生成方案及其槽位要求 |
| 资产槽位 Asset slot | 工作流声明的 `.assets.json` | 角色 / 场景 / 音色 → 目标节点输入 |
| 连续性 Continuity | 分镜顺序推导 | 场景切换、形态变化、relay、anchor |
| 渲染状态 Render state | `runs/` | 每镜最新 run、成功产物、失败信息 |
| 缺口 Gap | 以上事实推导 | 缺参考图、缺文件、缺 workflow、槽位不可解析等可执行问题 |

时间轴采用屏幕时间的原因：dycli 产出的是视频，镜头时长与顺序是客观数据；叙事时间没有统一格式，强模型化会把简单问题复杂化。需要「第几天 / 几点」时，用 `story_time` 标签表达，不改变时间轴。

**关键点**：拓扑图 / 时序图展示的角色、形态、场景、资产、workflow、缺口，与 `story map show --json` 提供给 AI 的 `generation` 上下文来自**同一份推导结果**，不存在两套数据。

### 5.2 数据流

```text
全局资产：characters / scenes / voices / assets
单集事实：script / breakdown / shots
工作流事实：workflows/*.json / .bindings.json / .assets.json
执行事实：runs/*
        │
        ▼
dycli 事实推导
  ├─ timeline.events（时间、场景、角色、形态）
  ├─ catalog（全部参考资产与可用状态）
  ├─ generation.workflows（候选、bindings、槽位要求）
  ├─ generation.events（每镜槽位解析、连续性、渲染状态）
  └─ generation.gaps（缺资产、缺文件、缺 workflow、槽位不可解析）
        │
        ├─→ Web API / topology / timeline（人类视图）
        │
        └─→ story map show --json（AI 消费）
                    │
                    ▼
            AI 决策 → shots.json
                    │
                    ▼
             story shots set（严格校验）
                    │
                    ▼
             shot / batch → runs/*
                    │
                    └──→ 渲染状态回填生成上下文
```

可选叙事层 `episodes/<id>/story-map.json` 只影响标题、重要度、故事时间、关系标签，不参与事实层与生成上下文的推导。

### 5.3 标注文件：`episodes/<id>/story-map.json`

**该文件只保存叙事标注，不是生成上下文。** 生成上下文（workflow 候选、资产解析、缺口、连续性、run 状态）每次实时推导，不落盘，避免与分镜 / workflow / runs 不一致。

标注文件是**共享、进 Git** 的 JSON，可选。没有该文件时 Web 仍展示自动推导结果。

```json
{
  "version": 1,
  "episode_id": "ep01",
  "author": "ai",
  "updated_at": "2026-10-21T12:00:00.000Z",
  "source": {
    "script_revision": 3,
    "script_sha256": "<script.json 的 sha256>",
    "breakdown_sha256": "<breakdown.json 文件的 sha256>",
    "shots_sha256": "<shots.json 文件的 sha256>"
  },
  "events": [
    {
      "shot_id": "03",
      "title": "徽章上的编号",
      "summary": "林默在积水里捡到徽章，阿岚认出编号属于失踪的调查员。",
      "importance": "major",
      "story_time": "第一夜 21:40",
      "note": "本集第一次把两条线并到一起"
    }
  ],
  "relations": [
    {
      "from": "lin-mo",
      "to": "a-lan",
      "kind": "ally",
      "label": "旧识",
      "note": "三年前在同一案件里合作过"
    }
  ],
  "notes": "本集标注基于剧本 revision 3"
}
```

**字段所有权**

| 字段 | 归属 | `build` 行为 | `set` 行为 | 读取时 |
|---|---|---|---|---|
| `shot_id` | 关联键 | 按当前分镜枚举 | 必须存在于当前分镜，且不能重复 | 作为事件主键 |
| `title` / `summary` / `importance` / `story_time` / `note` | 叙事 | 保留 | 保存 | 覆盖推导默认值 |
| `relations[]` | 叙事 | 保留并校验 | 校验并保存 | 直接使用 |
| `source.*` / `author` / `updated_at` | 元数据 | 刷新哈希与时间；已有文件保留 `author`，无文件或 `--force` 时为 `dycli` | 刷新哈希、时间与 `author` | 用于 stale 判定 |

**重要原则**：标注文件**不含结构字段**（时间、时长、场景、角色、形态、beat 引用）。这些事实以 `shots.json` 与实时生成的上下文为准；手工改标注文件不会改变它们。要改结构，改分镜。

**合并规则**

- `build`：
  - 按当前分镜枚举 `shot_id`，生成标注骨架；
  - 按 `shot_id` 保留已有叙事字段；
  - 删除已不存在的镜头事件，并在输出中报告 `dropped_events`；
  - 新镜头只写 `shot_id`，不写任何推导值；
  - 现有文件损坏（JSON 非法 / 结构非法）时默认报错，提示使用 `--force`；
  - `--force` 丢弃全部旧标注，完全重建。
- `set`：
  - 以传入文件为准替换标注内容；
  - 只接受 `shot_id` 与叙事字段；出现结构字段时忽略并提示；
  - 允许只写部分镜头（未写镜头使用推导默认值）；
  - 未知 `shot_id` 直接报错，避免写出孤儿标注。
- `clear`：删除标注文件，Web 回到纯推导。

**stale 判定**

`source.shots_sha256` / `source.script_revision` / `source.breakdown_sha256` 任一与当前文件不一致时，标记 `origin.stale = true`。读取时事实层始终按当前分镜重算，stale 只表示「叙事标注可能基于旧分镜」；UI 显示提示，建议执行 `story map build` 刷新骨架。

### 5.4 CLI：`story map`

新增命令组，注册到 `src/commands/registry.mts`，由 `runStory()` 分发。

```bash
daoyan story map build --episode <id> [--force] [--json]
daoyan story map show  --episode <id> [--raw] [--json]
daoyan story map set   --episode <id> --file <story-map.json|-> [--source ai|user|import] [--base-sha256 <hash>] [--json]
daoyan story map clear --episode <id> [--json]
```

| 子命令 | 行为 |
|---|---|
| `build` | 按当前分镜枚举 `shot_id`，写入或刷新标注骨架；保留叙事标注；不写结构事实与 generation；没有分镜时报 `story_invalid` |
| `show` | 输出合并后的解析视图（含实时 `generation`）；`--raw` 输出磁盘上的标注文件；没有分镜时返回空事件 + warning；标注文件损坏时回退到推导并返回 warning |
| `set` | 校验并写入叙事标注；只接受叙事字段，结构字段忽略并提示；没有分镜时报 `story_invalid`；`--source` 默认 `ai`（与 `story script sync` 一致） |
| `clear` | 删除标注文件；幂等 |

**AI 主入口：`story map show --json`**

- 这是 AI 做生成决策的主契约，返回 `map.events` + `map.catalog` + `map.generation`（workflow 候选、每镜槽位解析、连续性、渲染状态、缺口）。
- `story-map.json` 与 `story map build` 不是 AI 做生成决策的前置条件；它们只用于可选的叙事标注。
- `build` 只写标注骨架（`shot_id`），**不写结构事实，也不写 `generation`**；workflow / 资产 / run 状态变化频繁，始终实时推导。
- 推荐闭环：

```bash
# 1. AI 读取生成上下文与当前完整分镜
daoyan story map show --episode ep01 --json > context.json
daoyan story shots show --episode ep01 --json > shots.current.json

# 2. AI 在完整 recipe 上选择 workflow / asset_slots / first_frame / prompt，更新分镜
daoyan story shots set --episode ep01 --file ./ep01-shots.next.json --json

# 3. 复查缺口
daoyan story map show --episode ep01 --json

# 4. 执行
daoyan shot 01 02 --episode ep01 --json
# 或 daoyan batch --episode ep01 --json

# 5. 看结果，决定重拍或换 workflow
daoyan status --episode ep01 --json
daoyan retake 03 --episode ep01 --json
```

**校验规则**

- `events[].shot_id` 必须存在于本集 `shots.json`，且不能重复；
- `importance` 只能是 `major` / `normal` / `minor`；
- `relations[].from` / `to` 必须是全局角色 id，不能自引用；`label` 非空；
- 文本长度上限：`title` 120、`summary` 500、`story_time` 80、`note` 500；
- 未知字段保留，便于前向兼容；
- 错误统一使用 `story_invalid`（`details.issues`），并发冲突使用 `story_conflict`，不新增错误码；
- 多集项目必须显式 `--episode`；单集可省略，规则与现有 story 命令一致。

**JSON 输出（示例）**

`story map show --json`：

```json
{
  "episode_id": "ep01",
  "map": {
    "origin": {
      "derived": true,
      "annotated": true,
      "author": "ai",
      "updated_at": "2026-10-21T12:00:00.000Z",
      "stale": false,
      "stale_reasons": []
    },
    "time": {
      "basis": "screen",
      "duration_seconds": 72,
      "unknown_duration_shots": []
    },
    "catalog": {},
    "events": [],
    "graph": {},
    "generation": {
      "workflows": [],
      "readiness": {},
      "events": [],
      "gaps": []
    },
    "relations": [],
    "warnings": []
  }
}
```

`generation` 的完整结构见 5.5；它是 AI 决策的核心，包含 workflow 候选、每镜槽位解析、连续性与缺口。

`story map build --json` 额外返回：

```json
{
  "episode_id": "ep01",
  "path": "episodes/ep01/story-map.json",
  "events": 12,
  "preserved_annotations": 5,
  "dropped_events": [],
  "relations": 3,
  "warnings": []
}
```

**配套读命令：`story shots show`**

```bash
daoyan story shots show --episode <id> [--json]
```

- 返回 `{ episode_id, path, shots }`，`shots` 为当前完整 `ShotsFile`；
- 不存在时报 `story_invalid`，hint 指向 `story shots set`；
- 与 `story shots set` 共用 episode context；
- 这是 AI 修改分镜前的读取入口，避免直接读文件绕过契约；
- `story shots` 命令注册的 usage 从 `set` 扩展为 `set|show`，README / COMMANDS / Skill 同步。

### 5.5 Web API

在现有剧集子资源中新增：

```text
GET /api/episodes/:id/map
```

同时把 `map` 放进 `GET /api/episodes/:id` 的响应，前端一次请求即可渲染，避免剧集页额外拉取。

**资产引用结构（AssetRef）**

下面所有完整资产引用统一使用以下 `AssetRef` 结构：

```json
{
  "id": "front",
  "role": "front",
  "path": "story/assets/characters/lin-mo/night/front.png",
  "media_url": "/media/story/characters/lin-mo/night/front.png",
  "present": true,
  "lfs_pointer": false,
  "width": 1024,
  "height": 1024,
  "content_type": "image/png"
}
```

`catalog.*.reference_asset` / `assets[]` 与 `generation.events[].workflow.slots[].asset` 使用该结构；`generation.events[].cast[]` 与 `.scene` 只引用 catalog 中的 id（`reference_asset_id` / `asset_ids`），避免同一资产在响应里重复展开。宽度 / 高度 / 字节数等字段仅在已知时出现。

**返回结构**

```json
{
  "episode_id": "ep01",
  "origin": {
    "derived": true,
    "annotated": true,
    "author": "ai",
    "updated_at": "2026-10-21T12:00:00.000Z",
    "stale": false,
    "stale_reasons": []
  },
  "time": {
    "basis": "screen",
    "duration_seconds": 72,
    "unknown_duration_shots": []
  },
  "catalog": {
    "characters": [
      {
        "id": "lin-mo",
        "name": "林默",
        "role": "protagonist",
        "default_form": "default",
        "forms": [
          {
            "id": "night",
            "name": "夜行装",
            "description": "黑色雨衣与短刀",
            "used": true,
            "event_count": 4,
            "reference_asset": {
              "id": "front",
              "role": "front",
              "path": "story/assets/characters/lin-mo/night/front.png",
              "media_url": "/media/story/characters/lin-mo/night/front.png",
              "present": true,
              "lfs_pointer": false,
              "width": 1024,
              "height": 1024,
              "content_type": "image/png"
            },
            "assets": [
              {
                "id": "front",
                "role": "front",
                "path": "story/assets/characters/lin-mo/night/front.png",
                "media_url": "/media/story/characters/lin-mo/night/front.png",
                "present": true,
                "lfs_pointer": false
              },
              {
                "id": "side",
                "role": "side",
                "path": "story/assets/characters/lin-mo/night/side.png",
                "media_url": "/media/story/characters/lin-mo/night/side.png",
                "present": true,
                "lfs_pointer": false
              }
            ]
          }
        ]
      }
    ],
    "scenes": [
      {
        "id": "rain-city",
        "name": "雨夜城市",
        "time_of_day": "night",
        "interior_exterior": "exterior",
        "reference_asset": {
          "id": "establishing",
          "role": "establishing",
          "path": "story/assets/scenes/rain-city/establishing.png",
          "media_url": "/media/story/scenes/rain-city/establishing.png",
          "present": true,
          "lfs_pointer": false,
          "width": 1280,
          "height": 720,
          "content_type": "image/png"
        },
        "assets": [
          {
            "id": "establishing",
            "role": "establishing",
            "path": "story/assets/scenes/rain-city/establishing.png",
            "media_url": "/media/story/scenes/rain-city/establishing.png",
            "present": true,
            "lfs_pointer": false
          }
        ]
      }
    ],
    "voices": [
      {
        "id": "lin-mo-default",
        "character_id": "lin-mo",
        "name": "林默音色",
        "mode": "reference",
        "description": "低沉、克制",
        "reference_asset": {
          "id": "sample",
          "role": "reference_audio",
          "path": "story/assets/voices/lin-mo-default/sample.wav",
          "media_url": "/media/story/voices/lin-mo-default/sample.wav",
          "present": true,
          "lfs_pointer": false,
          "content_type": "audio/wav"
        },
        "assets": [
          {
            "id": "sample",
            "role": "reference_audio",
            "path": "story/assets/voices/lin-mo-default/sample.wav",
            "media_url": "/media/story/voices/lin-mo-default/sample.wav",
            "present": true,
            "lfs_pointer": false
          }
        ]
      }
    ],
    "beats": [{ "id": "b2", "summary": "发现徽章" }]
  },
  "events": [
    {
      "shot_id": "03",
      "at_seconds": 18.5,
      "at_estimated": false,
      "duration_seconds": 4,
      "title": "徽章上的编号",
      "title_source": "annotation",
      "summary": "林默在积水里捡到徽章，阿岚认出编号属于失踪的调查员。",
      "importance": "major",
      "importance_source": "annotation",
      "story_time": "第一夜 21:40",
      "scene": { "id": "rain-city", "name": "雨夜城市" },
      "characters": [
        { "id": "lin-mo", "name": "林默", "form": "night", "form_name": "夜行装" },
        { "id": "a-lan", "name": "阿岚", "form": "default", "form_name": "日常" }
      ],
      "beat_ids": ["b2"],
      "beats": [{ "id": "b2", "summary": "发现徽章" }],
      "dialogue_count": 2,
      "note": "本集第一次把两条线并到一起"
    }
  ],
  "graph": {
    "characters": [
      {
        "id": "lin-mo",
        "name": "林默",
        "role": "protagonist",
        "event_count": 8,
        "duration_seconds": 24,
        "scene_ids": ["rain-city", "roof"],
        "forms": [
          { "id": "night", "name": "夜行装", "event_count": 4, "scene_ids": ["rain-city"] }
        ]
      }
    ],
    "scenes": [
      {
        "id": "rain-city",
        "name": "雨夜城市",
        "time_of_day": "night",
        "interior_exterior": "exterior",
        "event_count": 4,
        "duration_seconds": 12,
        "character_ids": ["lin-mo", "a-lan"]
      }
    ],
    "character_scene_edges": [
      {
        "character_id": "lin-mo",
        "scene_id": "rain-city",
        "event_count": 4,
        "duration_seconds": 12,
        "form_ids": ["night"],
        "event_ids": ["01", "02", "03", "04"]
      }
    ],
    "form_scene_edges": [
      {
        "character_id": "lin-mo",
        "form_id": "night",
        "scene_id": "rain-city",
        "event_count": 4,
        "duration_seconds": 12,
        "event_ids": ["01", "02", "03", "04"]
      }
    ],
    "cooccurrence_edges": [
      {
        "a": "a-lan",
        "b": "lin-mo",
        "event_count": 3,
        "event_ids": ["03", "04", "05"]
      }
    ]
  },
  "generation": {
    "workflows": [
      {
        "name": "i2v",
        "path": "workflows/i2v.json",
        "default": false,
        "valid": true,
        "has_bindings": true,
        "bindings": ["prompt", "seed", "steps"],
        "node_count": 14,
        "node_classes": ["LoadImage", "CLIPTextEncode", "KSampler", "VAEDecode"],
        "asset_slots": [
          { "name": "hero", "kind": "character", "required": true, "target": "10.image", "asset": "reference" },
          { "name": "scene", "kind": "scene", "required": false, "target": "20.image", "asset": "reference" }
        ],
        "unusable_reasons": []
      },
      {
        "name": "t2v",
        "path": "workflows/t2v.json",
        "default": true,
        "valid": true,
        "has_bindings": true,
        "bindings": ["prompt", "seed"],
        "node_count": 10,
        "node_classes": ["CLIPTextEncode", "KSampler", "VAEDecode"],
        "asset_slots": [],
        "unusable_reasons": []
      }
    ],
    "readiness": {
      "counts": { "shots": 12, "ready": 9, "blocked": 3, "rendered": 7, "failed": 1 },
      "ready_shots": ["01", "02"],
      "blocked_shots": ["03"],
      "rendered_shots": ["01", "02"],
      "failed_shots": ["04"]
    },
    "events": [
      {
        "shot_id": "03",
        "assigned_workflow": "i2v",
        "workflow_source": "shot",
        "workflow": {
          "name": "i2v",
          "path": "workflows/i2v.json",
          "valid": true,
          "has_bindings": true,
          "slots": [
            {
              "slot": "hero",
              "kind": "character",
              "required": true,
              "target": "10.image",
              "owner": "lin-mo/night",
              "mapping_source": "explicit",
              "asset": {
                "id": "front",
                "role": "front",
                "path": "story/assets/characters/lin-mo/night/front.png",
                "media_url": "/media/story/characters/lin-mo/night/front.png",
                "present": true,
                "lfs_pointer": false
              },
              "status": "ready"
            },
            {
              "slot": "scene",
              "kind": "scene",
              "required": false,
              "target": "20.image",
              "owner": "rain-city",
              "mapping_source": "scene",
              "asset": {
                "id": "establishing",
                "role": "establishing",
                "path": "story/assets/scenes/rain-city/establishing.png",
                "media_url": "/media/story/scenes/rain-city/establishing.png",
                "present": true,
                "lfs_pointer": false
              },
              "status": "ready"
            }
          ],
          "missing_slots": [],
          "gaps": []
        },
        "cast": [
          {
            "character_id": "lin-mo",
            "name": "林默",
            "form_id": "night",
            "form_name": "夜行装",
            "form_source": "explicit",
            "reference_asset_id": "front",
            "reference_present": true,
            "asset_ids": ["front", "side"]
          }
        ],
        "scene": {
          "id": "rain-city",
          "name": "雨夜城市",
          "reference_asset_id": "establishing",
          "reference_present": true,
          "asset_ids": ["establishing"]
        },
        "voices": [
          {
            "character_id": "lin-mo",
            "voice_id": "lin-mo-default",
            "mode": "reference",
            "reference_asset_id": "sample",
            "reference_present": true
          }
        ],
        "continuity": {
          "scene_changed": true,
          "same_scene_as_prev": false,
          "form_changes": [{ "character_id": "lin-mo", "from": "default", "to": "night" }],
          "relay_from": "02",
          "relay_targets": ["04"],
          "anchor": { "key": "S1", "path": "episodes/ep01/anchors/start.png", "present": true }
        },
        "render": {
          "runs_count": 2,
          "succeeded_count": 1,
          "latest_run_id": "r_20261021T103000_abcd",
          "latest_status": "succeeded",
          "latest_outputs": [
            {
              "name": "clip.mp4",
              "kind": "video",
              "media_url": "/media/run/r_20261021T103000_abcd/clip.mp4",
              "bytes": 123456
            }
          ],
          "latest_finished_at": "2026-10-21T10:30:00.000Z"
        },
        "candidate_workflows": [
          { "name": "i2v", "fit": "ready", "reasons": [] },
          { "name": "t2v", "fit": "ready", "reasons": ["不使用参考资产，角色一致性较弱"] }
        ],
        "gaps": [],
        "ready": true
      }
    ],
    "gaps": [
      {
        "code": "missing_reference",
        "severity": "blocker",
        "shot_id": "07",
        "ref": "scene:roof",
        "message": "场景 roof 没有显式主参考图",
        "hint": "daoyan story asset set-reference --owner scene:roof --id establishing --json"
      }
    ]
  },
  "relations": [
    {
      "from": "lin-mo",
      "to": "a-lan",
      "kind": "ally",
      "label": "旧识",
      "note": "三年前在同一案件里合作过"
    }
  ],
  "warnings": []
}
```

> 示例只展开镜头 03；`readiness` 与顶层 `gaps` 覆盖整集，因此数量与示例中的单条事件不对应。

**约束**

- 不返回绝对路径；所有资产引用同时给出项目相对 `path` 与同源 `media_url`（复用 `storyMediaUrl()`，避免 CLI / Web 两套拼法）。
- `generation` 是实时推导，不写入任何文件；分镜、workflow、资产或 run 变化后立即反映。
- `generation.events[].workflow` 对**当前指派的 workflow** 做完整槽位解析；`candidate_workflows[].fit` 是轻量预检，用于候选筛选，不保证执行期一定成功。最终执行仍走 `resolveWorkflowAssets()` 的严格校验。
- `generation.gaps[]` 必须带稳定的 `code`、`shot_id`、`ref` 与 `hint`，方便 AI / 用户直接定位修复命令。
- 标注文件损坏时不让整个剧集接口 500：捕获后回退到自动推导，并返回 `warnings`。
- legacy 模式没有剧集概念，不提供该接口；现有 `/api/shots` 不变。

### 5.6 Web UI

**位置**

剧集详情页（`#/episode/<id>`）在阶段 / blockers 之后、剧本之前新增「剧情图谱」区块。这样打开某一集就能先看到关系与时间线，再看文本细节。

**信息架构**

```text
生成上下文                                [拓扑图] [时序图]
12 事件 · 4 角色 · 3 场景 · 9 可生成 / 3 阻塞 · 7 已生成
来源：dycli 推导 + AI 标注（stale 时提示）

<拓扑图 或 时序图>

[筛选：林默 ×]  [只看关键事件]  [只看阻塞]
```

- 区块头显示：数据来源（dycli 推导 / AI 标注 / 用户标注）、事件数、角色数、场景数、`generation.readiness` 统计、警告数。
- 有 blocker 级 gaps 时显示「3 个镜头无法生成」的 callout，点击可筛选阻塞事件。
- 两个 Tab 使用按钮实现，`aria-selected` 同步；Tab 状态保存在模块变量里，轮询重渲染不丢。
- 进入另一集时清空筛选与 Tab 状态。
- **页面展示的生成上下文与 `story map show --json` 的 `generation` 来自同一份推导结果**；Web 只读，修复动作以 CLI hint 的形式展示。

**拓扑图**

- 节点：
  - 角色节点：主参考图（有则显示）、角色名、出场形态名、镜数；
  - 形态节点：按形态视图时展示，标签为「角色名 · 形态名」；
  - 场景节点：场景名、时间 / 内外景、出场角色数；
  - 未知引用：虚线边框 + 警告色，不阻断渲染；
  - **生成状态**：形态主参考缺失 / 文件缺失 / LFS pointer 时，节点加警告角标；场景参考缺失同理。节点详情列出该形态 / 场景的全部可用资产与 `present` 状态。
- 工具栏可选「按生成状态着色」：就绪 / 缺资产 / 缺文件三种状态，便于快速定位影响生成的节点。
- 边：
  - 角色 / 形态 → 场景：实线，粗细与事件数正相关；
  - 角色共现：虚线弧，画在角色列左侧；边数过多时只画事件数前 20 条并标注「仅显示前 20 条」；
  - 叙事关系：强调色虚线弧，带 `label` 文本；只使用两端角色都在本集出现的标注。
- 布局采用**确定性二列布局**，不做 force simulation：
  - 左列角色 / 形态，右列场景；
  - 按事件数降序、名称升序排列；
  - 节点固定宽高，行距固定；SVG `viewBox` 随节点数增高，容器横向可滚动；
  - 边用三次贝塞尔曲线，避免穿过节点。
- 交互：
  - 点击角色 / 场景节点设置筛选；
  - 再次点击或点「清除」取消筛选；
  - 筛选时无关节点与边降低透明度；
  - 点击角色节点下方出现详情条：本集使用的形态、出现场景、共现角色；点击「查看时序」切到时序 Tab 并保留筛选；
  - SVG 节点支持 Tab 聚焦、Enter / Space 触发，并提供 `<title>` 提示。
- 图例：角色 / 场景 / 边粗细 = 事件数 / 虚线 = 共现或叙事关系。

**时序图**

- 顶部比例条：
  - 每个事件一段，宽度按 `duration_seconds` 比例；时长未知时按等宽；
  - 颜色按场景区分，关键事件加顶部标记；
  - hover 显示时间、标题、场景、角色；点击滚动到对应事件行。
- 事件列表（纵向、按镜头顺序）：
  - 左侧：时间码 `00:18–00:22`（估算时加 `~`）、`story_time` 标签；
  - 中间：标题、重要度徽标（关键 / 常规 / 过场）、摘要、场景 chip、beat chips；
  - 右侧：角色 chip，显示「林默 · 夜行装」；有主参考图时显示小缩略图，点击缩略图打开灯箱；
  - **生成徽标**：当前 workflow 名（未指派显示「未指定」）、就绪 / 阻塞、最新 run 状态（未生成 / 运行中 / 成功 / 失败）；
  - 台词数、备注放在展开区；
  - 点击角色 / 场景 chip 设置筛选；
  - 「定位分镜」按钮滚动到下方对应分镜卡片（给 `renderShotCard()` 增加 `id="shot-<shotId>"`）。
- 工具栏：
  - 当前筛选 chip + 清除；
  - 「只看关键事件」开关；
  - 「只看阻塞」开关；
  - 无筛选时展示全部事件。

**事件生成上下文面板**

点击事件行展开，展示 AI 决策所需的完整信息（与 `generation.events[]` 对应）：

- 角色与形态：每个形态的主参考图、全部可用资产（缩略图、id、role、present / LFS）、尺寸；资产明细从 `catalog` 按 `asset_ids` 关联，不在每个事件里重复展开；
- 场景：场景参考资产列表与可用状态；
- 音色：台词引用的音色、参考音频状态；
- Workflow：指派来源（shot / shots / project）、workflow 名、bindings、资产槽位 → 目标节点映射、槽位解析结果；
- 连续性：场景是否切换、相邻镜头形态变化、`relay_from` / `relay_targets`、anchor 路径与存在状态；
- 渲染：run 数、成功数、最新 run / 产物 / 完成时间；失败时展示错误摘要；
- 缺口：每条 gap 的 code、message、hint（例如 `story asset set-reference --owner scene:rain-city --id establishing`）；
- 资产缺失时，面板直接给出对应 CLI 修复提示；Web 不提供写操作。
- 空态：
  - 没有分镜：提示 `daoyan story shots set --episode <id>`；
  - 有分镜但没有角色 / 场景：展示事件列表，同时提示补齐全局设定集；
  - 标注文件损坏：顶部警告条，内容回退到自动推导。

**响应式**

- 桌面：拓扑图完整二列展示；时序图比例条 + 列表并排。
- 窄屏：拓扑图容器横向滚动；时序图比例条保留，事件行改为上下堆叠；角色 chip 换行。
- 深色 / 浅色主题沿用现有 CSS 变量；场景颜色新增 `--scene-day` / `--scene-night` / `--scene-dusk` / `--scene-other`。

**视觉细节**

- 角色按 `role` 着色：protagonist / antagonist / supporting / extra；
- 场景按 `time_of_day` 着色：day / night / dusk / dawn / other；
- 重要度：`major` 使用强调色左边框，`minor` 降低透明度；
- 不引入图标字体，必要图标继续用现有文本符号。

### 5.7 推导与计算规则

**角色 / 形态解析**

`shots.json` 的角色引用兼容三种写法：

```json
{ "characters": ["lin-mo", "lin-mo/night", { "id": "a-lan", "form": "default" }] }
```

解析顺序：

1. 字符串含 `/`：拆成 `id` / `form`；
2. 对象：取 `id`（或 `name`）与 `form`；
3. 用 id、别名、name 依次匹配全局角色；
4. 未指定 `form` 时使用 `default_form`，并标记 `form_source = "default"`；角色有多个形态时额外产生 `form_ambiguous` warning；
5. `form` 不存在时回退 `default_form`，标记 `form_source = "fallback"`，并产生 warning；
6. 角色不存在时生成 `unknown` 节点（id 为空时使用 name），并产生 warning。

场景引用兼容字符串 / 对象，以及 `scene` / `location` / `set` 字段；按 id、name 匹配全局场景，未知时生成 `unknown` 场景节点并警告。角色引用同样支持 `shot.characters` 与 `shot.params.characters` 两种位置。

`shot.dialogue[]` 的说话角色只计入 `dialogue_count`，不自动加入出场角色；如果说话角色不在出场列表中，产生 warning。

**时间计算**

```text
cursor = 0
estimated = false
for event in shots:
    duration = shot.duration ?? (shot.length ?? defaults.length) / (meta.fps ?? defaults.fps)
    event.at_seconds = cursor
    event.at_estimated = estimated || duration == null
    if duration != null: cursor += duration
    else: estimated = true
```

- 全部镜头都有时长：`basis = "screen"`，时间码精确；
- 部分缺失：仍累计已知时长，缺失处 `at_estimated = true`，UI 用 `~` 标记；
- 全部缺失：`basis = "order"`，`at_seconds` 使用镜头序号，UI 显示「按镜序」而不是时间码；
- `duration_seconds` 为已知时长之和；未知镜头列入 `unknown_duration_shots`。

**重要度推导**

标注优先；无标注时：

- `major`：该事件是新场景的第一个事件（场景切换）；
- `minor`：没有角色且没有台词（纯空镜 / 过场）；
- 其余 `normal`。

UI 的「只看关键事件」只过滤 `major`。

**参考资产解析与缺口**

每个事件按出场角色 / 形态解析到具体资产：

- 形态主参考：`form.reference_asset` → `form.assets[]`；
- 形态全部资产：`id` / `role` / `path` / `media_url` / `present` / `lfs_pointer` / `width` / `height` / `content_type`；
- 场景主参考：`scene.reference_asset` → `scene.assets[]`；
- 音色：`shot.dialogue[].voice`，省略时仅当角色恰好一个音色才可推断；
- 状态：`ready` / `missing_reference` / `missing_file` / `lfs_pointer` / `unknown_owner`；
- 事件里只保留 `reference_asset_id` / `asset_ids`，完整资产明细放在 `catalog`，UI / AI 按 id 关联，避免重复展开。

缺口（gap）统一使用稳定 code，优先复用现有错误码 / blocker code：

| code | 级别 | 触发 | hint |
|---|---|---|---|
| `missing_reference` | blocker | 形态 / 场景 / 音色缺少显式 `reference_asset` | `story asset set-reference --owner <kind>:<id> --id <asset>` |
| `asset_not_found` | blocker | 资产记录指向的文件不存在 | `git lfs pull` 或重新 `story asset add` |
| `asset_invalid` | blocker | 资产仍是 Git LFS pointer | `git lfs pull` |
| `unknown_character` | blocker | 分镜引用了不存在的角色 | 修正 `shots.json` 或补全局角色 |
| `unknown_form` | warning | 形态不存在，已回退 `default_form` | 修正分镜引用或补形态 |
| `form_ambiguous` | warning | 未指定形态，角色有多个形态，已使用 `default_form` | 在分镜中显式写 `form` |
| `slot_ambiguous` | warning | 角色 / 音色槽位按出场顺序隐式匹配，且存在多个候选 | 在分镜中显式写 `asset_slots` |
| `voice_ambiguous` | warning | 台词未指定 `voice`，角色有多个音色 | 在 `dialogue[]` 中显式写 `voice` |
| `unknown_scene` | warning | 场景不存在 | 修正 `shots.json` 或补全局场景 |
| `missing_workflow` | blocker | 镜头 / 分镜 / 项目都没有可用 workflow | 设置 `project.default_workflow` 或镜头 `workflow` |
| `missing_bindings` | blocker | 工作流缺 `.bindings.json`，或缺少 `prompt` / `seed` | 补 bindings |
| `workflow_unresolved` | blocker | 资产槽位目标节点不存在 / 槽位无法解析 | 修 `.assets.json` 或分镜 `asset_slots` |
| `anchor_not_found` | blocker | `first_frame` 引用的 anchor 不存在 | 补 anchor 或改 `first_frame` |
| `relay_upstream_missing` | blocker | `first_frame.relay` 指向的镜头不存在或未完成 | 修正 relay 或先拍上游 |
| `render_failed` | warning | 最新 run 失败 | 看 run 错误，必要时 `retake` |

`ready = gaps 中没有 blocker`。warning 不阻断生成，但会出现在 UI 与 AI 上下文中。

**工作流候选与适配**

- 扫描 `workflows/*.json`（排除 `.bindings.json` / `.assets.json`），构建候选目录：
  - `name` / `path` / `default` / `valid`；
  - `has_bindings` 与 `bindings` 逻辑输入列表；
  - `asset_slots`（来自 `.assets.json`）；
  - `node_count` / `node_classes`（最多列前 20 个 class_type，供 AI 判断能力）。
- `candidate_workflows[].fit` 是轻量预检：
  - `unusable`：图非法、缺 bindings、缺 `prompt` / `seed`、必需槽位的类型 / 数量在镜头里无法满足、`asset_slots[].target` 指向的节点 / 输入不存在；
  - `needs_assets`：槽位类型满足，但必需参考资产缺失 / 文件不可用；
  - `ready`：必需槽位都能解析到可用文件。
  - `reasons[]` 给出人类可读原因。
- **当前指派的 workflow** 用完整 `planWorkflowAssets()` 解析，返回每个 slot 的 owner / asset / target / 状态 / `mapping_source`（`explicit` / `cast_order` / `dialogue_order` / `scene`）。隐式匹配且存在多个候选时产生 `slot_ambiguous` warning；只有这一条路径需要精确到资产 id。
- 为了让「预检」和「执行」严格同源，重构 `workflow-assets.mts`：

```ts
// 非抛错：返回可执行计划和缺口
export function planWorkflowAssets(opts: {...}): {
    uploads: UploadSpec[];
    records: RunAssetRecord[];
    gaps: WorkflowAssetGap[];
};

// 严格包装：执行层继续使用，遇到 blocker 抛 story_gate_failed / asset_not_found
export function resolveWorkflowAssets(opts: {...}): ResolvedWorkflowAssets;
```

`planWorkflowAssets()` 不写文件、不上传，只做解析；`resolveWorkflowAssets()` 在 `gaps` 有 blocker 时抛出与原行为一致的错误。这样地图预览不会和执行层产生两套规则。

**连续性**

- `scene_changed`：与上一事件场景不同；
- `same_scene_as_prev`：与上一事件同场景；
- `form_changes`：相邻事件中都出现的角色，形态是否变化（从 / 到）；
- `relay_from`：`shot.first_frame = { relay: "<shot>" }` 的上游镜头；
- `relay_targets`：哪些后续镜头以当前镜头为 relay 上游；
- `anchor`：`first_frame` 为字符串时解析 `shots.meta.anchors[key]`，返回 key / path / present；
- 这些字段用于 AI 决策：同场景优先保持形态与场景参考，需要连续性时优先 relay。

**渲染状态**

- 按 `ep:<episode>:shot:` label 前缀扫描 runs，按 shot id 聚合：
  - `runs_count` / `succeeded_count`；
  - `latest_run_id` / `latest_status` / `latest_finished_at`；
  - `latest_outputs`：`name` / `kind` / `media_url` / `bytes`，供 AI / UI 直接查看产物；
  - 失败时的 `latest_error` 摘要。
- 复用分镜视图已有的 run 索引，避免同一次剧集请求重复扫描 `runs/`。
- `not_rendered` 只作为信息状态，不算 blocker。

**图聚合**

- 角色级：
  - `character_scene_edges`：按 `(character_id, scene_id)` 聚合事件数、时长、形态集合；
  - `cooccurrence_edges`：同一事件内两两角色聚合，`a < b` 保证无向边唯一。
- 形态级：
  - `form_scene_edges`：按 `(character_id, form_id, scene_id)` 聚合。
- 关系标注：
  - 只保留两端都在本集出现的角色；
  - 同一对角色允许多条不同 `label`，UI 最多显示前 3 条，其余在详情条展示。

**布局**

- 左列 x = 220，右列 x = 560，节点宽 180、高 44；
- 行高 72，顶部留 32；
- 角色 / 形态节点按事件数降序，场景节点同理；
- 共现弧控制点在左列左侧 40px 处；
- SVG `width=760`、`height = 64 + max(左节点数, 右节点数) * 72`；
- 节点数超过 14 时，左列拆成两列（P1 优化；首版允许纵向滚动）。

### 5.8 与其他模块集成

**生成决策与执行层**

- `shots.json` 是 AI 生成决策的唯一写回点：`workflow` / `asset_slots` / `scene_asset` / `first_frame` / `prompt` / `seed` / `steps` / `params`。
- 新增 `story shots show --episode <id> --json` 作为完整 recipe 的读取入口；AI 在完整文件上修改，再 `story shots set`，避免丢字段。
- 不新增并行的 generation plan 文件，避免「计划」与「实际执行」分叉。
- `resolveWorkflowAssets()` 重构为 `planWorkflowAssets()` + 严格包装，地图预检与执行共用同一套槽位解析规则。
- **workflow 图本身也是 AI 可决策的对象**：候选不满足时，AI 通过 `workflow new|import|apply|set` 改图、更新 `.assets.json` 槽位、`workflow validate`，再写回 `shot.workflow`。地图只读取 `workflows/` 当前状态，不参与图编辑。
- `workflow validate` / `story validate` 继续校验 `.assets.json`、bindings、槽位目标节点、资产文件与 LFS；地图中的 `gaps` 与这些校验保持一致。
- `shot` / `batch` / `retake` 执行前仍走门禁；地图只提供上下文和预检，不改变执行语义。

**`story validate`**

- 若 `story-map.json` 存在，校验 JSON 结构、事件 `shot_id`、关系两端角色；
- 标注问题以 `warning` 级别进入现有 issues，不阻断拍摄；
- 生成相关缺口（缺参考图 / 缺文件 / 缺 workflow / 槽位不可解析）继续由现有 story 门禁报错，地图不重复造门禁。

**`story status`**

可选增强：单集状态增加 `generation: { ready, blocked, rendered, failed }` 汇总。首版可不做，避免扩大状态 DTO；Web 与 `story map show` 已能提供。

**Agent Skill**

更新 `src/core/agent/skill.mts` 的 `storyMd()`：

- 目录树增加 `episodes/<id>/story-map.json`（可选叙事标注）；
- 标准流程在 `shots set` 之前增加「读取生成上下文 → 选择 workflow / 槽位 / 首帧 / prompt」；
- 说明 `story map show --json` 的 `generation` 才是 AI 决策主入口，叙事标注只是可选增强；
- 列出 2.4 的 AI 硬规则：只选 catalog 内资产、多形态必须显式 `asset_slots`、同场景保持形态、优先 relay、关键事件可升档、有 blocker 先修复；
- 增加闭环示例：

```bash
daoyan story map show --episode ep01 --json
daoyan story shots show --episode ep01 --json > ./ep01-shots.current.json
# AI 基于 context + current shots 产出 ep01-shots.next.json
daoyan story shots set --episode ep01 --file ./ep01-shots.next.json --json
daoyan story map show --episode ep01 --json
daoyan shot 01 02 --episode ep01 --json
daoyan retake 03 --episode ep01 --json
```

- 叙事标注示例：`story map set --file - --source ai --json`。

**命令注册与 README**

- `registry.mts` 新增 `story map` 条目，`jsonShape` 明确列出 `events` / `catalog` / `generation` / `gaps`；
- README 必须包含 `daoyan story map ...`（`test/readme.test.mts` 会检查）；
- `help --json` 自动暴露新命令与 JSON shape，AI 可据此发现生成上下文契约。

### 5.9 非目标

- Web 端不提供任何写操作；生成决策与叙事标注仍然只通过 CLI 写入。
- dycli 不自动替 AI 选择 workflow，也不内置 LLM；只提供候选、约束、缺口与校验。
- 不新增 `generation-plan.json` 等并行计划文件；`shots.json` 是唯一决策来源。
- 不在 `story map` 响应里内嵌完整 workflow 图；完整图与节点定义走 `workflow show --json` / `workflow nodes` / `workflow node`。
- 不做跨集图谱；首版只针对单集。
- 不把 beat 做成独立时间事件；beat 只作为事件标签。
- 不引入 force-directed 布局或外部图库。
- 不实现叙事时间轴排序；`story_time` 只是标签。
- 不做画质打分、自动择优或自动重拍；只暴露 run 状态与产物，由 AI / 用户决策。
- 不做自动转码、视频片段裁剪或图谱导出图片。

## 6. 实施阶段

### Phase 0：两个独立小改动（R1 + R2）

- `app.client` / `style.css` / `index.html`：图片灯箱。
- `addresses.mts` + `server.mts` + `web.mts`：多地址展示与 `urls` JSON。
- 单测：地址推导；手动验证灯箱与 `--host`。

### Phase 1：生成上下文数据层（R3 核心）

- `project/types.mts`：`STORY_MAP_FILE`。
- `story/types.mts`：`StoryMapFile` / `StoryMapEvent` / `StoryMapRelation` / generation DTO。
- `story/paths.mts`：`storyMapPath()`，可选加入 `EpisodeContext.story_map_path`。
- `story/workflow-assets.mts`：拆出 `planWorkflowAssets()`（非抛错、返回 gaps），`resolveWorkflowAssets()` 改为严格包装；保证预检与执行同源。
- `story/map.mts`：事实推导、参考资产解析、workflow 候选与 fit、连续性、渲染状态、缺口、图聚合、标注合并。
- `story/assets.mts` 或共享模块：`storyMediaUrl()` 供 CLI / Web 共用，避免两套 URL 拼法。
- `run/store.mts`：如需要，增加按 episode / label 的轻量 run 索引（复用现有 `listRuns`）。
- `test/story-map.test.mts`：覆盖生成上下文、缺口、候选 fit、连续性与标注合并。

### Phase 2：CLI 与 API

- `commands/story.mts`：`story map build|show|set|clear`；`show --json` 输出完整 `generation`；新增 `story shots show`。
- `commands/registry.mts`：命令元数据；`story shots` usage 扩展为 `set|show`。
- `core/web/story-data.mts`：`buildStoryMapView()`，接入生成上下文与媒体 URL。
- `core/web/server.mts`：剧集响应加入 `map`，新增子资源路由。
- `test/story-web.test.mts`：接口、generation 字段与媒体 URL 断言。

### Phase 3：Web UI

- `app.client`：`renderStoryMap()`、拓扑 SVG、时序列表、生成徽标、事件上下文面板、筛选与 Tab 状态。
- `style.css`：图谱与时间线样式、生成状态色、场景颜色、响应式。
- `index.html`：如需新的容器节点（优先由 JS 动态创建，不改骨架）。
- 手动浏览器验证：桌面 / 窄屏 / 深色 / 浅色 / 空态 / 标注损坏 / 缺资产 / workflow 预检。

### Phase 4：文档、Skill 与收尾

- `docs/WEB.md`、`docs/COMMANDS.md`、`docs/DATA-MODEL.md`、`docs/REQUIREMENTS.md`、`docs/PLAN.md`。
- `README.md`：新增 `story map` 命令行。
- `src/core/agent/skill.mts`：更新 story 参考文档。
- `npm run typecheck` / `npm test` / `npm run format:check`。

## 7. 文件改动清单

| 文件 | 改动 |
|---|---|
| `src/core/web/ui/app.client` | 图片灯箱复用；图谱 / 时序渲染；Tab 与筛选状态 |
| `src/core/web/ui/style.css` | `.asset-thumb`；拓扑 / 时序 / 图例 / 空态 / 响应式 |
| `src/core/web/ui/index.html` | 模态框 eyebrow 改为「预览」 |
| `src/core/web/addresses.mts` | 新增 `buildAccessUrls()` 与 loopback 判定 |
| `src/core/web/server.mts` | `WebServerHandle.urls`；按真实 family 枚举地址 |
| `src/commands/web.mts` | 打印 Local / Network；JSON 增加 `urls` |
| `src/core/project/types.mts` | `STORY_MAP_FILE` 常量 |
| `src/core/story/types.mts` | `StoryMapFile` / 事件 / 关系类型 |
| `src/core/story/paths.mts` | `storyMapPath()`；剧集上下文路径 |
| `src/core/story/workflow-assets.mts` | 拆出非抛错 `planWorkflowAssets()`；严格包装保留原执行语义 |
| `src/core/story/map.mts` | 新增：事实推导、资产解析、workflow 候选 / fit、连续性、渲染状态、缺口、图聚合、标注合并 |
| `src/core/story/assets.mts` | 可选：抽出共享 `storyMediaUrl()` |
| `src/core/story/validate.mts` | `story validate` 纳入图谱标注检查 |
| `src/core/run/store.mts` | 可选：按 episode / label 的 run 索引 |
| `src/commands/story.mts` | `story map` 子命令分发；新增 `story shots show`；`show --json` 输出 generation |
| `src/commands/registry.mts` | `story map` 命令元数据；`story shots` 增加 `show` |
| `src/core/web/story-data.mts` | 剧集响应加入 `map` 与 generation；补充媒体 URL |
| `src/core/web/server.mts` | `/api/episodes/:id/map` 子资源 |
| `src/core/agent/skill.mts` | AI 生成决策闭环、硬规则与 map 命令示例 |
| `test/web-addresses.test.mts` | 新增地址推导单测 |
| `test/story-map.test.mts` | 新增生成上下文 / 缺口 / 候选 fit / 连续性 / 标注单测 |
| `test/story-web.test.mts` | 剧集图谱接口断言 |
| `test/readme.test.mts` | 自动覆盖新命令（需同步 README） |
| `docs/WEB.md` | 页面、接口、数据来源说明 |
| `docs/COMMANDS.md` | `story map` 命令参考 |
| `docs/DATA-MODEL.md` | `story-map.json` 文件与字段 |
| `docs/REQUIREMENTS.md` | §10 Web UI 增加剧情图谱要求 |
| `docs/PLAN.md` | 目录与命令树补充 |
| `README.md` | 新增 `daoyan story map ...` 与 `daoyan story shots show ...` |

## 8. 测试与验收

### 8.1 自动化测试

**地址推导**

- `127.0.0.1` / `localhost` / `::1` 只返回 local；
- `0.0.0.0` 返回 local + 非 internal IPv4，不返回 IPv6；
- `::` 返回 local + IPv4 + 非 link-local IPv6；
- 具体 IP / 主机名返回单条 network；
- 去重与排序稳定。

**剧情图谱推导**

- 字符串 / `id/form` / 对象三种角色引用都能解析出形态；
- 未指定形态回退 `default_form`，多形态角色产生 `form_ambiguous` warning；未知形态 / 角色产生 warning；
- `scene` / `location` 两种场景字段都能解析；
- 时长 `duration` 与 `length/fps` 两种来源；缺失时长产生 `at_estimated`；
- 全部时长缺失时 `basis = "order"`；
- 场景切换 / 空镜的重要度推导；
- 角色-场景边、形态-场景边、共现边的计数与时长；
- 标注覆盖标题 / 摘要 / 重要度 / 故事时间；
- 未知 `shot_id` 标注在读取时忽略并警告，在 `set` 时报错；
- `build` 按当前分镜枚举 `shot_id`、保留叙事字段、删除已移除镜头，不写结构事实；
- `set` 只接受叙事字段，结构字段被忽略并提示；
- `story validate` 能报告标注问题。

**CLI 配套**

- `story shots show --episode <id> --json` 返回完整 `ShotsFile`（含 `meta` / `defaults` / `workflow`）；
- 分镜缺失时返回 `story_invalid` 与可执行 hint；
- `show` → 修改 → `set` 的 round-trip 不丢 `meta` / `defaults` / 未修改字段。

**生成上下文**

- 每个出场形态 / 场景都能解析到主参考与全部资产；
- 缺少 `reference_asset`、文件不存在、LFS pointer 分别产生正确的 blocker gap；
- 音色引用解析；多音色且省略 `voice` 时产生 warning；
- workflow 目录构建：bindings、asset_slots、node_classes、default / valid；
- `candidate_workflows[].fit` 的 `ready` / `needs_assets` / `unusable` 判定；
- 当前指派 workflow 的每个 slot 解析到 owner / asset / target / `mapping_source`；多候选隐式匹配产生 `slot_ambiguous` warning；
- `planWorkflowAssets()` 与 `resolveWorkflowAssets()` 的预检 / 执行同源：同一 fixture 下，预检无 gap 时严格解析成功，有 blocker 时严格解析抛出同 code 的错误；
- 连续性：场景切换、形态变化、relay_from / relay_targets、anchor 存在性；
- 渲染状态：按 episode label 前缀聚合 run，最新状态 / 成功数 / 产物；
- `readiness` 统计与 `gaps` 一致；
- 无分镜 / 无 workflow / 无角色时输出稳定的空态与 warning，不抛 500。

**Web 接口**

- `/api/episodes/:id/map` 返回 200，字段完整；
- 剧集响应包含 `map` 与 `generation`；
- 不泄露项目绝对路径；
- 标注文件损坏时回退到推导且返回 warning；
- 资产 `path` 与 `media_url` 同时存在，URL 指向 `/media/story/...`；
- `generation.gaps[]` 的 code / hint 与现有门禁错误保持一致。

### 8.2 手动验收

1. 启动 `daoyan web --host 0.0.0.0`，终端显示 Local 与全部局域网地址；用另一台设备访问 Network 地址成功。
2. 角色页点击主参考图和其他缩略图，灯箱正常打开、关闭、键盘操作正常。
3. 打开任意一集：
   - 区块头显示事件数、角色数、场景数、`ready / blocked / rendered` 统计；
   - 拓扑图显示角色（或形态）与场景节点，边粗细可区分；缺参考图 / 缺文件的节点有警告角标；
   - 切换到「按形态」后，同一角色的不同形态分别出现；
   - 点击节点筛选，时序 Tab 只显示相关事件；
   - 时序图显示时间码、故事时间、场景、角色与形态，以及 workflow、就绪、渲染状态徽标；
   - 点击「定位分镜」能滚动到下方镜头卡片；
   - 展开事件能看到角色形态的全部资产、场景资产、workflow 槽位映射、连续性与缺口 hint；
   - 没有 `story-map.json` 时显示「dycli 推导」；
   - 执行 `story map set` 后刷新页面，标题 / 重要度 / 关系标签生效；
   - 修改分镜后刷新，事实层 / 生成上下文自动更新；叙事标注按 `shot_id` 保留，孤儿标注显示 warning。
4. **生成闭环验收（核心）**：
   - 构造一个有两个角色、两个形态、两个场景、两个 workflow 的剧集；
   - `story map show --json` 能列出 workflow 候选、每个镜头的槽位解析与缺口；
   - 故意移除场景主参考：`generation.gaps` 出现对应 blocker，UI 显示阻塞；
   - 执行 `story asset set-reference` 后，gap 清零，对应 workflow 变为 ready；
   - 先用 `story shots show --json` 读取完整 recipe，AI / 手工在完整文件上选择 workflow、`asset_slots`、`first_frame` 后，`story shots set` 通过；
   - 构造一个候选都不适配的镜头，AI 用 `workflow apply` 增/改一个参考图输入节点并补 `.assets.json` 槽位，`workflow validate` 通过后可被地图识别为 ready；
   - `shot` 执行时上传的资产与 `generation.events[].workflow.slots` 一致；
   - 执行后 `render` 状态回填，UI 显示成功 / 失败与产物。
5. 空态：无分镜、无角色、无场景、标注损坏、无 workflow 均有明确提示，不出现前端报错。
6. 窄屏（约 390px）下拓扑图可横向滚动，时序行不溢出。
7. 深色 / 浅色主题下文字与边有足够对比度。

### 8.3 验收标准

- R1：所有 story 参考图可点击预览，键盘可操作。
- R2：`--host 0.0.0.0` / `::` 展示全部可达地址；`--json` 新增 `urls` 且 `url` 兼容不变。
- R3：
  - `story map show --json` 为每镜提供角色 / 形态 / 场景 / 参考资产 / workflow 候选 / 槽位 / 连续性 / 渲染状态 / 缺口；
  - AI 能据此在 `shots.json` 中做出 workflow / `asset_slots` / `first_frame` / prompt 决策，执行层使用同一套槽位解析；
  - 每集都有拓扑图与时序图，正确展示时间、角色、形态、场景、生成状态；
  - 无标注文件也能用；AI / 用户标注可写入并生效。
- 无新增运行时依赖；`typecheck`、`test`、`format:check` 全绿。

## 9. 风险与备选方案

| 风险 | 影响 | 应对 |
|---|---|---|
| 地图预检与执行层规则分叉 | AI 以为能跑，执行时失败 | 抽取 `planWorkflowAssets()`，预检与 `resolveWorkflowAssets()` 共用同一套槽位解析；加同源测试 |
| 候选 workflow 的 `fit` 预检过重 | 剧集请求变慢 | 候选只用 bindings / 槽位类型 / 参考可用性做轻量判断；只有当前指派 workflow 做完整槽位解析 |
| AI 选错 workflow 或资产 | 生成质量差 / 执行失败 | 上下文给出候选、槽位要求、缺口与 hint；`story shots set` 严格校验；执行前门禁 |
| 多形态 / 多资产选择歧义 | 槽位按顺序取错图 | 上下文列出全部资产；Skill 硬规则要求多形态 / 多资产必须显式 `asset_slots` |
| 上下文 / 图谱数据量过大 | 页面与 JSON 变重 | 单集镜头数有限；工作流候选只给静态摘要，完整图仍走 `workflow show` |
| 屏幕时间不等于叙事时间 | 用户想看「第几天几点」 | 用 `story_time` 标签表达；时间轴仍按视频时长，避免伪造数据 |
| 镜头级事件粒度太细 | 时序图事件过多 | 用重要度过滤、beat 标签、比例条总览；后续可加按 beat 折叠 |
| 二列拓扑在角色很多时可读性下降 | 节点拥挤 | 首版纵向滚动；超过 14 个左节点拆两列（P1） |
| AI 标注与分镜漂移 | 叙事字段对不上新分镜 | 事实层每次重算；孤儿 `shot_id` 警告；stale 提示；`build` 合并保留叙事字段 |
| 标注文件损坏导致页面失败 | 剧集页不可用 | Web 层捕获并回退到推导；`story validate` 报告 warning |
| 多网卡 / VPN 地址过多 | 输出嘈杂 | 按 local → IPv4 → IPv6 排序，过滤 internal 与 link-local；保留全部可达地址 |
| IPv6 在不支持的系统上监听失败 | `--host ::` 启动失败 | 保持现有 `web_start_failed` 提示；不自动降级，避免静默改变语义 |

**备选方案（不采用）**

- **只做可视化，不提供生成上下文**：偏离核心目的；图谱好看但不能帮助 AI 选 workflow，等于没有解决生成质量问题。
- **把完整图谱 / 生成快照存进 `story-map.json` 并在读取时直接使用**：分镜、workflow、资产、run 变化后容易过期；上下文必须实时推导。
- **新增 `generation-plan.json` 作为 AI 决策文件**：会与 `shots.json` 分叉；执行层必须以 `shots.json` 为唯一决策来源。
- **让 dycli 调用 LLM 自动选 workflow / 生成标注**：引入网络、模型与提示词依赖，违背 agent-native 与离线可用的定位；外部 Agent 通过 CLI 写入更可控。
- **引入 d3 / mermaid 渲染拓扑**：与前端资源内嵌、零外部依赖的约束冲突。
- **用 force-directed 布局**：结果不确定、节点重叠难控制；二列布局更符合「角色 / 场景关系」的阅读方式。

## 10. 已确定的默认取舍

1. **`story map show --json` 是 AI 生成决策的主契约**；拓扑图 / 时序图是同一份生成上下文的人类视图。
2. **`shots.json` 是 AI 决策的唯一写回点**：workflow / asset_slots / first_frame / prompt / steps；不新增并行计划文件。
3. **dycli 只提供候选、约束、缺口与校验，不自动替 AI 选 workflow，不内置 LLM。**
4. 事实层（资产、槽位、连续性、run 状态）实时推导；叙事层（标题 / 重要度 / 故事时间 / 关系）由 AI / 用户可选标注。
5. 剧情图谱放在剧集详情页顶部（阶段 / blockers 之后、剧本之前），不新增一级导航。
6. 事件粒度 = 镜头；beat 只做标签，不做独立事件。
7. 主时间轴 = 屏幕时间；`story_time` 是可选叙事标签。
8. 拓扑默认按角色聚合，提供「按形态」切换；默认二列布局，不做力导向。
9. `story-map.json` 可选；没有文件时 Web 与 `story map show` 仍提供完整生成上下文。
10. `--json` 的地址结构采用 Vite 风格的 `urls.local` / `urls.network`，`url` 保留兼容。

## 11. 实施记录（2026-10-21）

本轮已按方案落地：

- **R1**：`assetNode()` 图片改为可聚焦按钮，复用 `openImageUrl()` 灯箱；角色 / 场景 / 音色 / 资产页与图谱缩略图生效。
- **R2**：新增 `core/web/addresses.mts`，`web --host 0.0.0.0` / `::` 输出全部 Local / Network 地址；`--json` 增加 `urls`。
- **R3 数据层**：新增 `core/story/map.mts`，实时推导事件、目录、参考资产、workflow 候选 / 槽位 / 缺口、连续性、渲染状态、图谱与叙事标注合并。
- **R3 执行层**：`workflow-assets.mts` 拆出非抛错 `planWorkflowAssets()`，`resolveWorkflowAssets()` 保留严格语义，预检与执行同源。
- **R3 CLI/API**：新增 `story map build|show|set|clear` 与 `story shots show`；`/api/episodes/:id` 与 `/api/episodes/:id/map` 返回 `map` / `generation`。
- **R3 Web UI**：剧集页新增「剧情图谱」区块，含拓扑图（按角色 / 按形态）、时序图（时间码 / 故事时间 / workflow / 就绪 / 渲染状态）、筛选、生成上下文详情；窄屏验证通过。
- **文档与 Skill**：README、WEB、COMMANDS、DATA-MODEL、REQUIREMENTS、PLAN 与 `storyMd()` 已同步。

实现取舍：

- `story-map.json` 只保存叙事标注；结构事实与 `generation` 全部实时推导，不落盘。
- `story map build` 只生成标注骨架，不写结构快照。
- 完整 workflow 图仍通过 `workflow show|nodes|node` 获取，剧集响应只给候选摘要。
- `graph` / `catalog` 中资产统一使用 `AssetRef`；`cast` / `scene` 通过 `asset_ids` 引用目录，避免重复展开。
