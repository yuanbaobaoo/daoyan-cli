/** graph ops 单元测试：增删连接、ID 分配、断链拒绝、失败不修改原图。 */
import test from "node:test";
import assert from "node:assert/strict";
import { applyOps } from "../src/core/workflow/ops.mts";
import type { WorkflowGraph } from "../src/core/workflow/graph.mts";
import { buildCatalog } from "../src/core/workflow/catalog.mts";
import { bindingTargets, validateGraphWithCatalog } from "../src/core/workflow/load.mts";
import { MOCK_OBJECT_INFO } from "./mock-comfy.mts";

// 节点目录
const catalog = buildCatalog(MOCK_OBJECT_INFO, "mock-1.0");

test("add_node 自动分配 ID，set_input 校验枚举", () => {
    // 空图
    const graph: WorkflowGraph = {};
    // 应用操作
    const result = applyOps(
        graph,
        [
            { op: "add_node", class_type: "MockLoader" },
            { op: "set_input", node: "1", input: "ckpt_name", value: "a.safetensors" },
            { op: "add_node", class_type: "MockSampler" },
            { op: "set_input", node: "2", input: "seed", value: 42 },
            { op: "add_node", class_type: "MockSave" },
            { op: "set_input", node: "3", input: "filename_prefix", value: "out" },
        ],
        catalog,
    );
    assert.equal(Object.keys(result.graph).length, 3);
    assert.deepEqual(result.assigned_ids, [
        { id: "1", class_type: "MockLoader" },
        { id: "2", class_type: "MockSampler" },
        { id: "3", class_type: "MockSave" },
    ]);
    assert.equal(result.graph["2"]?.inputs.seed, 42);
    assert.equal(result.warnings.length, 0);
});

test("connect 建立连线，覆盖时返回 warning 与 removed_links", () => {
    // 三节点图
    const graph: WorkflowGraph = {
        "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
        "2": { class_type: "MockSampler", inputs: { seed: 1, steps: 20 } },
        "3": { class_type: "MockSave", inputs: { filename_prefix: "out", image: ["2", 0] } },
    };
    const result = applyOps(
        graph,
        [
            { op: "connect", from: { node: "1", output: 0 }, to: { node: "2", input: "model" } },
            { op: "connect", from: { node: "2", output: 0 }, to: { node: "3", input: "image" } },
        ],
        catalog,
    );
    assert.deepEqual(result.graph["2"]?.inputs.model, ["1", 0]);
    assert.deepEqual(result.graph["3"]?.inputs.image, ["2", 0]);
    assert.equal(result.removed_links.length, 1);
    assert.equal(result.warnings[0]?.code, "connection_replaced");
    // 原图未被修改
    assert.deepEqual(graph["3"]?.inputs.image, ["2", 0]);
});

test("remove_node 被引用时拒绝，force 时删除关联连线", () => {
    const graph: WorkflowGraph = {
        "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
        "2": { class_type: "MockSampler", inputs: { seed: 1, steps: 20, model: ["1", 0] } },
    };
    assert.throws(
        () => applyOps(graph, [{ op: "remove_node", node: "1" }], catalog),
        (e: unknown) => (e as { code?: string }).code === "workflow_invalid",
    );
    const result = applyOps(graph, [{ op: "remove_node", node: "1", force: true }], catalog);
    assert.equal(result.graph["1"], undefined);
    assert.equal(result.graph["2"]?.inputs.model, undefined);
    assert.equal(result.removed_links.length, 1);
});

test("任一 op 失败时原图不变（原子性）", () => {
    const graph: WorkflowGraph = {
        "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
    };
    assert.throws(
        () =>
            applyOps(
                graph,
                [
                    { op: "add_node", id: "2", class_type: "MockSampler" },
                    { op: "connect", from: { node: "9", output: 0 }, to: { node: "2", input: "model" } },
                ],
                catalog,
            ),
        (e: unknown) => (e as { code?: string }).code === "workflow_invalid",
    );
    assert.deepEqual(Object.keys(graph), ["1"]);
});

test("set_input 枚举不匹配只给 warning（ComfyUI 最终裁决）", () => {
    const graph: WorkflowGraph = {
        "1": { class_type: "MockLoader", inputs: {} },
    };
    const result = applyOps(
        graph,
        [{ op: "set_input", node: "1", input: "ckpt_name", value: "missing.safetensors" }],
        catalog,
    );
    assert.equal(result.graph["1"]?.inputs.ckpt_name, "missing.safetensors");
    assert.equal(result.warnings[0]?.code, "input_value_not_in_options");
});

test("validate 不把 bindings 注入的必填输入判为缺失", () => {
    // seed 缺失，但 bindings 会注入
    const graph: WorkflowGraph = {
        "1": { class_type: "MockLoader", inputs: { ckpt_name: "a.safetensors" } },
        "2": { class_type: "MockSampler", inputs: { steps: 20 } },
    };
    const without = validateGraphWithCatalog(graph, catalog);
    assert.equal(
        without.some((i) => i.code === "graph_required_input_missing"),
        true,
    );
    const bindings = { seed: "2.seed" };
    const withBindings = validateGraphWithCatalog(graph, catalog, bindingTargets(bindings));
    assert.equal(
        withBindings.some((i) => i.code === "graph_required_input_missing"),
        false,
    );
});
