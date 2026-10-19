# JS / TS 编码规范

> 供本仓库的 AI 代理与协作者遵守。
>
> **本项目适配说明**：daoyan-cli 的 TS / JS / MTS 统一 **4 空格缩进**（强制；由 `.prettierrc.json`
> 与 `npm run format:check` 保证）。其余规则全部适用；Vue 相关部分当前项目无前端，供未来参考。

## 0. 通用约定

- 回复与代码注释使用**中文**，变量命名用**英文**
- 最外层独立函数用 `function` 声明，禁止 `const fn = () => {}`；函数内部回调一律用箭头函数（forEach / map / filter / .catch / setTimeout / 生命周期钩子）
- Promise 一律 `async/await` + `try/catch`，禁止 `.then/.catch` 链

## 1. 缩进（4 空格，强制）

- TS / JS / MTS / Vue / CSS 统一 **4 空格**，禁止 2 空格或 Tab；
- 编辑器与格式化工具统一 `tabWidth: 4`，仓库配置见 `.prettierrc.json`；
- 提交前必须运行 `npm run format:check`；自动修复运行 `npm run format`；
- 生成文件（`dist/`、`package-lock.json`）按工具输出保留；模板字符串/文档示例内部的内容不按代码缩进处理。

## 2. 注释风格

| 目标 | 格式 | 要求 |
|------|------|------|
| const / let 变量 | `//` 单行注释 | **所有** const/let 都必须加（含 `useRoute()`、`ref()`、`computed()` 等调用结果） |
| function 声明 | `/** */` JSDoc | `/**` 后必须换行 |
| watch / onMounted 等钩子 | `/** */` 多行 | `/**` 后必须换行 |
| enum 枚举成员 | `//` 或 `/** */` 多行 | 禁止 `/** 中文 */` 单行形式 |

禁止：

- `/** 摄像机列表 */` 用于 const → 必须用 `//`
- `/** 获取列表 */` 单行 JSDoc → `/**` 后必须换行

## 3. 声明与空行

- 单行声明的 const/let 之间**不空行**；多行声明（对象/类型字面量）之间**必须空行**

```typescript
// 单行声明，不空行
const containerRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

// 多行声明，必须空行
const props = defineProps<{
    cameraData?: CameraData | null;
}>();

// 多行声明，必须空行
const emit = defineEmits<{
    (e: "click-camera", camera: CameraData): void;
}>();
```

## 4. `<script setup>` 代码组织顺序（Vue，强制）

```
① import 语句
② const / let / ref / reactive / computed 声明
③ defineProps / defineEmits
④ 生命周期钩子（onMounted、onBeforeUnmount 等）
⑤ defineExpose（如有）
⑥ watch 监听器
⑦ function 声明
```

## 5. watch 写法

```typescript
// ✓ 正确：紧凑写法
watch(() => props.src, () => {
    initPlayer();
});

// ✗ 禁止：拆成多行参数
watch(
    () => props.src,
    () => { initPlayer(); }
);
```

## 6. Composable 规范（Vue）

- 统一对象访问：`const alarmSse = useCameraAlarmSse()`，**禁止解构**
- SSE 用 `fetchEventSource`，禁止原生 `EventSource`；onmessage 按 `event.event` 过滤事件类型

## 7. 常量

- 魔法字符串/数字抽为 `const` 常量（大写 + 下划线，如 `POLL_INTERVAL_MS`）
- 公用常量放公共类型/常量目录；**同一语义只允许一处声明**，其他地方引用
- 写入前自查：新增字面量前先 grep 是否已有同值常量，发现重复立即收敛

## 8. 后端 Long 与前端类型对齐（TS）

后端 `Long`（雪花 ID、时间戳）序列化为字符串后，前端对应字段类型**必须声明为 `string`**（不是 `number`），如 `taskId`、`cameraId`、`alarmId`；收到字符串后可直接拼 URL、做相等比较。

## 9. Vue 模板规范（Element-UI 项目，来源项目特有）

**el-tag 格式**——禁止紧凑一行式 / 属性不对齐：

```vue
<!-- ✓ 属性对齐，内容换行对齐 -->
<el-tag v-for="t in item.type" :key="t" size="small">
    {{ algorithmTypeMap[t] || t }}
</el-tag>
```

**单位规范**——禁止直接写 `px`，统一 `p2r()` 转换（模板 `p2r(4)`；JS `HTMLElementUtil.p2r(14)`）

**模板内样式**——禁止模板内写带单位的 style；仅允许改颜色等简单样式，带单位的样式放 `<style>` 内定义

## 10. 通用工程约束

- 优先最小改动；不影响已有功能；不修改无关文件；修改前说明影响范围
- 使用已有工具类/公共库，禁止重复造轮子；保持与当前模块风格一致
- 提交前至少运行：`npm run format:check`、`npm run typecheck`、`npm test`
