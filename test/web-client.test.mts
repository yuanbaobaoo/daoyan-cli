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
    ]) {
        assert.match(source, new RegExp(`function ${name}\\(`));
    }
    // 旧接口不再被引用
    assert.equal(source.includes("/api/shots"), false);
});
