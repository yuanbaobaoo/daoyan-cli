/** Python/torch 工具链纯函数测试：CUDA tag、wheel 匹配、驱动探测解析、marker 与 smoke 分类。 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    buildToolchainMarker,
    classifyCudaError,
    compareCuda,
    inferComputeCap,
    inspectTorchPlan,
    lowestComputeCap,
    markerMismatchReason,
    parseCudaTag,
    parseCudaVersion,
    parseNvidiaSmiQuery,
    parseNvidiaSmiText,
    parsePythonVersion,
    readToolchainMarker,
    resolveTorchPlan,
    selectTorchTags,
    torchPlanForTag,
    wheelHtmlMatches,
    wheelMatchesFile,
    writeToolchainMarker,
    type FetchText,
    type PythonInfo,
    type TorchPlan,
} from "../src/core/provision/toolchain.mts";
import { venvReady } from "../src/core/provision/init-flow.mts";

// 测试用 Python
const PY: PythonInfo = { version: "3.12.3", major: 3, minor: 12, patch: 3 };
// 测试用 GPU（RTX 3090 / 驱动 580 / CUDA 13.0 / compute 8.6）
const GPU = {
    driver: "580.159.03",
    cudaMax: "13.0",
    computeCap: "8.6",
    devices: [{ name: "NVIDIA GeForce RTX 3090", driver: "580.159.03", cuda: "13.0", computeCap: "8.6" }],
};
// 测试用 index 根
const INDEX = "https://index.test";
// torch cu130 wheel
const TORCH_130 = `<a href="../../../whl/cu130/torch-2.14.1%2Bcu130-cp312-cp312-manylinux_2_28_x86_64.whl">x</a>`;
// torchvision cu130 wheel
const TV_130 = `<a href="../../../whl/cu130/torchvision-0.29.1%2Bcu130-cp312-cp312-manylinux_2_28_x86_64.whl">x</a>`;

/**
 * 构造按 URL 返回固定 HTML 的抓取函数。
 */
function fakeFetch(pages: Record<string, string>): FetchText {
    return async (url: string) => {
        // 页面内容
        const html = pages[url];
        if (html === undefined) throw new Error(`404 ${url}`);
        return html;
    };
}

/**
 * 完整 index（根 + cu130 + cu129 + cu128）。
 */
function fullIndex(): Record<string, string> {
    return {
        [`${INDEX}/`]: `<a href="cu130/">cu130</a> <a href="cu129/">cu129</a> <a href="cu128/">cu128</a>`,
        [`${INDEX}/cu130/torch/`]: TORCH_130,
        [`${INDEX}/cu130/torchvision/`]: TV_130,
        [`${INDEX}/cu129/torch/`]: TORCH_130.replaceAll("cu130", "cu129"),
        [`${INDEX}/cu129/torchvision/`]: TV_130.replaceAll("cu130", "cu129"),
        [`${INDEX}/cu128/torch/`]: TORCH_130.replaceAll("cu130", "cu128"),
        [`${INDEX}/cu128/torchvision/`]: TV_130.replaceAll("cu130", "cu128"),
    };
}

test("parseCudaTag：cu118/cu130/cu92 与非法值", () => {
    assert.deepEqual(parseCudaTag("cu130")?.cuda, { major: 13, minor: 0 });
    assert.deepEqual(parseCudaTag("cu118")?.cuda, { major: 11, minor: 8 });
    assert.deepEqual(parseCudaTag("cu92")?.cuda, { major: 9, minor: 2 });
    assert.equal(parseCudaTag("cu13"), null);
    assert.equal(parseCudaTag("cuda130"), null);
    assert.equal(parseCudaTag("cu12x"), null);
    assert.equal(compareCuda({ major: 13, minor: 0 }, { major: 12, minor: 9 }) > 0, true);
});

test("parsePythonVersion / parseCudaVersion：接受命令行与 nvidia-smi 常见格式", () => {
    assert.deepEqual(parsePythonVersion("Python 3.12.3"), PY);
    assert.deepEqual(parsePythonVersion("3.10"), { version: "3.10.0", major: 3, minor: 10, patch: 0 });
    assert.equal(parsePythonVersion("no version"), null);
    assert.deepEqual(parseCudaVersion("13.0"), { major: 13, minor: 0 });
    assert.deepEqual(parseCudaVersion("12"), { major: 12, minor: 0 });
    assert.equal(parseCudaVersion("13.0.1"), null);
    assert.equal(parseCudaVersion(null), null);
});

test("selectTorchTags：按驱动 CUDA 上限过滤，并按版本降序", () => {
    // 驱动 13.0
    const v13 = selectTorchTags({
        available: ["cu118", "cu130", "cu129", "cu132", "cu134"],
        cudaMax: { major: 13, minor: 0 },
        computeCap: "8.6",
    });
    assert.deepEqual(v13.candidates, ["cu130", "cu129", "cu118"]);
    assert.equal(v13.skipped.length, 2);
    // 驱动 12.4：不得尝试 cu126+
    const v124 = selectTorchTags({
        available: ["cu130", "cu126", "cu124", "cu121"],
        cudaMax: { major: 12, minor: 4 },
        computeCap: "8.6",
    });
    assert.deepEqual(v124.candidates, ["cu124", "cu121"]);
    // 驱动 10.2：没有候选
    const old = selectTorchTags({
        available: ["cu118", "cu121"],
        cudaMax: { major: 10, minor: 2 },
        computeCap: "6.1",
    });
    assert.deepEqual(old.candidates, []);
    // Pascal（6.1）+ CUDA 13：跳过 cu13x
    const pascal = selectTorchTags({
        available: ["cu130", "cu129", "cu126"],
        cudaMax: { major: 13, minor: 0 },
        computeCap: "6.1",
    });
    assert.deepEqual(pascal.candidates, ["cu129", "cu126"]);
});

test("wheel 匹配：cp312 + manylinux/linux 才算可用", () => {
    assert.equal(
        wheelMatchesFile("torch-2.14.1%2Bcu130-cp312-cp312-manylinux_2_28_x86_64.whl", "torch", PY, "x64"),
        true,
    );
    assert.equal(wheelMatchesFile("torch-2.14.1-cp311-cp311-linux_x86_64.whl", "torch", PY, "x64"), false);
    assert.equal(wheelMatchesFile("torch-2.14.1-cp312-cp312-win_amd64.whl", "torch", PY, "x64"), false);
    assert.equal(wheelMatchesFile("torchvision-0.29.1-cp312-cp312-linux_x86_64.whl", "torchvision", PY, "x64"), true);
    assert.equal(wheelHtmlMatches(TORCH_130, "torch", PY, "x64"), true);
});

test("inspectTorchPlan：只探测驱动，不访问 index（离线复用）", async () => {
    // 自动模式：上下文不含 tag，也不需要 index
    const ctx = await inspectTorchPlan({ python: PY, platform: "linux", arch: "x64", indexRoot: INDEX, gpu: GPU });
    assert.equal(ctx.backend, "cuda");
    assert.equal(ctx.tag, null);
    assert.equal(ctx.installIndexUrl, null);
    assert.equal(ctx.gpu?.cudaMax, "13.0");
    // 强制 tag：即使没有 nvidia-smi 也保持 CUDA 后端
    const forced = await inspectTorchPlan({
        python: PY,
        platform: "linux",
        arch: "x64",
        indexRoot: INDEX,
        gpu: null,
        forcedCuda: "cu130",
    });
    assert.equal(forced.backend, "cuda");
    assert.equal(forced.tag, "cu130");
    assert.equal(forced.forced, true);
    // 无 GPU：CPU
    const cpu = await inspectTorchPlan({ python: PY, platform: "linux", arch: "x64", indexRoot: INDEX, gpu: null });
    assert.equal(cpu.backend, "cpu");
    assert.equal(cpu.cpuSource, "no-gpu");
});

test("resolveTorchPlan：自动选择 cu130，缺 cp312 时回退 cu129", async () => {
    // 正常 index
    const plan = await resolveTorchPlan({
        python: PY,
        platform: "linux",
        arch: "x64",
        indexRoot: INDEX,
        gpu: GPU,
        fetchText: fakeFetch(fullIndex()),
    });
    assert.equal(plan.backend, "cuda");
    assert.equal(plan.tag, "cu130");
    assert.deepEqual(plan.candidates, ["cu130", "cu129", "cu128"]);
    assert.equal(plan.installIndexUrl, `${INDEX}/cu130`);
    // cu130 页面只有 cp311 -> 回退 cu129
    const pages = fullIndex();
    pages[`${INDEX}/cu130/torch/`] = `<a href="torch-2.14.1%2Bcu130-cp311-cp311-manylinux_2_28_x86_64.whl">x</a>`;
    pages[`${INDEX}/cu130/torchvision/`] =
        `<a href="torchvision-0.29.1%2Bcu130-cp311-cp311-manylinux_2_28_x86_64.whl">x</a>`;
    const fallbackPlan = await resolveTorchPlan({
        python: PY,
        platform: "linux",
        arch: "x64",
        indexRoot: INDEX,
        gpu: GPU,
        fetchText: fakeFetch(pages),
    });
    assert.equal(fallbackPlan.tag, "cu129");
    assert.deepEqual(fallbackPlan.attemptedTags, ["cu130", "cu129", "cu128"]);
    assert.deepEqual(fallbackPlan.candidates, ["cu129", "cu128"]);
});

test("resolveTorchPlan：强制 tag / CPU / 无候选", async () => {
    const forced = await resolveTorchPlan({
        python: PY,
        platform: "linux",
        arch: "x64",
        indexRoot: INDEX,
        gpu: GPU,
        forcedCuda: "cu129",
        fetchText: fakeFetch(fullIndex()),
    });
    assert.equal(forced.tag, "cu129");
    assert.equal(forced.forced, true);
    assert.deepEqual(forced.candidates, ["cu129"]);
    // 强制 tag 不依赖 nvidia-smi（容器内没有 nvidia-smi 也能安装）
    const forcedNoSmi = await resolveTorchPlan({
        python: PY,
        platform: "linux",
        arch: "x64",
        indexRoot: INDEX,
        gpu: null,
        forcedCuda: "cu130",
        fetchText: fakeFetch(fullIndex()),
    });
    assert.equal(forcedNoSmi.backend, "cuda");
    assert.equal(forcedNoSmi.tag, "cu130");
    assert.equal(forcedNoSmi.gpu, null);
    // 显式 CPU
    const cpu = await resolveTorchPlan({
        python: PY,
        platform: "linux",
        arch: "x64",
        indexRoot: INDEX,
        gpu: GPU,
        forceCpu: true,
        fetchText: fakeFetch(fullIndex()),
    });
    assert.equal(cpu.backend, "cpu");
    assert.equal(cpu.cpuSource, "forced");
    assert.equal(cpu.installIndexUrl, `${INDEX}/cpu`);
    // 无候选（驱动 10.2）
    await assert.rejects(
        resolveTorchPlan({
            python: PY,
            platform: "linux",
            arch: "x64",
            indexRoot: INDEX,
            gpu: { ...GPU, cudaMax: "10.2", computeCap: "6.1" },
            fetchText: fakeFetch(fullIndex()),
        }),
        (e: unknown) => (e as { code?: string }).code === "provision_failed",
    );
    // 强制 tag 缺 wheel
    await assert.rejects(
        resolveTorchPlan({
            python: PY,
            platform: "linux",
            arch: "x64",
            indexRoot: INDEX,
            gpu: GPU,
            forcedCuda: "cu124",
            fetchText: fakeFetch(fullIndex()),
        }),
        (e: unknown) => (e as { code?: string }).code === "provision_failed",
    );
});

test("nvidia-smi 解析：结构化 CSV / 普通输出 / 架构推断", () => {
    const devices = parseNvidiaSmiQuery(
        "NVIDIA GeForce RTX 3090, 580.159.03, 8.6, 13.0\nNVIDIA GeForce RTX 3060, 580.159.03, 8.6, 13.0\n",
    );
    assert.equal(devices.length, 2);
    assert.equal(devices[0]?.computeCap, "8.6");
    assert.equal(devices[0]?.cuda, "13.0");
    const text = parseNvidiaSmiText("| NVIDIA-SMI 580.159.03  Driver Version: 580.159.03  CUDA Version: 13.0 |");
    assert.equal(text.driver, "580.159.03");
    assert.equal(text.cuda, "13.0");
    assert.equal(inferComputeCap("NVIDIA GeForce RTX 3090"), "8.6");
    assert.equal(inferComputeCap("Tesla V100-SXM2"), "7.0");
    assert.equal(inferComputeCap("NVIDIA H100 80GB HBM3"), "9.0");
    assert.equal(inferComputeCap("Some Future GPU"), null);
    assert.equal(lowestComputeCap(["8.9", null, "7.5"]), "7.5");
});

test("marker：写入/读取/失效原因", () => {
    const dir = mkdtempSync(join(tmpdir(), "dycli-toolchain-"));
    try {
        // 计划
        const plan: TorchPlan = {
            backend: "cuda",
            cpuSource: null,
            tag: "cu130",
            indexRoot: INDEX,
            installIndexUrl: `${INDEX}/cu130`,
            python: PY,
            platform: "linux-x64",
            arch: "x64",
            gpu: GPU,
            candidates: ["cu130"],
            attemptedTags: ["cu130"],
            forced: false,
        };
        // smoke 结果
        const smoke = {
            ok: true,
            torch: "2.14.1+cu130",
            torchvision: "0.29.1",
            torchCuda: "13.0",
            available: true,
            device: "NVIDIA GeForce RTX 3090",
            error: null,
            errorClass: null,
        };
        // 写 marker
        const marker = buildToolchainMarker({
            plan,
            smoke,
            comfyuiTag: "v0.42.1",
            requirementsSha256: "a".repeat(64),
            customNodesSha256: "b".repeat(64),
        });
        writeToolchainMarker(dir, marker);
        const read = readToolchainMarker(dir);
        assert.equal(read?.torch_tag, "cu130");
        assert.equal(read?.torch_backend, "cuda");
        // 复用期望
        const expected = {
            python: PY.version,
            platform: "linux-x64",
            comfyuiTag: "v0.42.1",
            requirementsSha256: "a".repeat(64),
            customNodesSha256: "b".repeat(64),
            plan,
        };
        assert.equal(markerMismatchReason(marker, expected), null);
        assert.match(
            markerMismatchReason(marker, { ...expected, requirementsSha256: "c".repeat(64) }) ?? "",
            /requirements/,
        );
        // 驱动降级到 12.4 -> marker cu130 不再兼容
        const downgraded = { ...plan, gpu: { ...GPU, cudaMax: "12.4" } };
        assert.match(markerMismatchReason(marker, { ...expected, plan: downgraded }) ?? "", /CUDA/);
        // 切换 tag 计划
        const other = torchPlanForTag(plan, "cu129");
        assert.equal(other.installIndexUrl, `${INDEX}/cu129`);
        // 显式 tag + 无 nvidia-smi：只要 marker tag 一致即可复用（兼容性由 smoke 兜底）
        const forcedPlan = { ...plan, forced: true, gpu: null };
        const forcedMarker = buildToolchainMarker({
            plan: forcedPlan,
            smoke,
            comfyuiTag: "v0.42.1",
            requirementsSha256: "a".repeat(64),
            customNodesSha256: "b".repeat(64),
        });
        assert.equal(markerMismatchReason(forcedMarker, { ...expected, plan: forcedPlan }), null);
        assert.match(
            markerMismatchReason(forcedMarker, { ...expected, plan: { ...forcedPlan, tag: "cu129" } }) ?? "",
            /tag/,
        );
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("marker：CPU 模式复用不要求 CUDA 信息", () => {
    // CPU 计划
    const plan: TorchPlan = {
        backend: "cpu",
        cpuSource: "no-gpu",
        tag: null,
        indexRoot: INDEX,
        installIndexUrl: null,
        python: PY,
        platform: "linux-x64",
        arch: "x64",
        gpu: null,
        candidates: [],
        attemptedTags: [],
        forced: false,
    };
    // CPU smoke
    const smoke = {
        ok: true,
        torch: "2.14.1+cpu",
        torchvision: "0.29.1",
        torchCuda: null,
        available: null,
        device: null,
        error: null,
        errorClass: null,
    };
    // marker
    const marker = buildToolchainMarker({
        plan,
        smoke,
        comfyuiTag: "v0.42.1",
        requirementsSha256: "a".repeat(64),
        customNodesSha256: "b".repeat(64),
    });
    assert.equal(
        markerMismatchReason(marker, {
            python: PY.version,
            platform: plan.platform,
            comfyuiTag: "v0.42.1",
            requirementsSha256: "a".repeat(64),
            customNodesSha256: "b".repeat(64),
            plan,
        }),
        null,
    );
});

test("venv 健康检查：只有 python、没有可用 pip 时不可复用", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dycli-venv-"));
    try {
        mkdirSync(join(dir, "bin"), { recursive: true });
        // 假 python：任何调用都失败
        const python = join(dir, "bin", "python");
        writeFileSync(python, "#!/bin/sh\nexit 1\n");
        chmodSync(python, 0o755);
        assert.equal(await venvReady(dir), false);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("smoke 错误分类", () => {
    assert.equal(classifyCudaError("CUDA driver version is insufficient for CUDA runtime version"), "driver");
    assert.equal(classifyCudaError("torch.cuda.is_available() == False"), "driver");
    assert.equal(classifyCudaError("no kernel image is available for execution on the device"), "kernel");
    assert.equal(classifyCudaError("invalid device function"), "device_function");
    assert.equal(classifyCudaError("CUDA out of memory"), "oom");
    assert.equal(classifyCudaError("something else"), "unknown");
});
