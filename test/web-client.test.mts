/** Web 客户端静态检查 —— 防止 .client 被误删函数或引用已移除的 API。 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 客户端源码
const source = readFileSync(new URL("../src/core/web/ui/app.client", import.meta.url), "utf8");

test("web 客户端：语法与关键函数存在", () => {
    // 语法
    assert.doesNotThrow(() => new Function(source));
    // 关键函数（分镜参考图 / 提示词 / 生成 / 剧集页）
    for (const name of [
        "renderShotReferences",
        "renderShotRef",
        "renderPromptText",
        "requestShotGeneration",
        "renderEpisodes",
        "renderEpisode",
        "renderImages",
        "requestImageGenerate",
        "openImageMaskEditor",
        "optimizeImagePrompt",
    ]) {
        assert.match(source, new RegExp(`function ${name}\\(`));
    }
    // 旧接口不再被引用
    assert.equal(source.includes("/api/shots"), false);
    // 未配置 LLM 时优化按钮仍可用，走 Agent 上下文面板
    assert.match(source, /未配置本机 LLM：返回 Agent 改写上下文/);
    assert.match(source, /draft\.mode === "agent"/);
    // 纯图片模式禁用音频勾选（core 强制关闭），侧栏不留 slogan
    assert.match(source, /纯图片模式不生成音频，音频由 core 强制关闭。/);
    assert.match(source, /audioInput\.disabled = stills/);
    assert.equal(source.includes("AI 创作操作台"), false);
});
