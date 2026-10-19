/** 依赖安装参数测试：默认值、CLI/环境变量优先级、fallback 关闭、互斥校验。 */
import test from "node:test";
import assert from "node:assert/strict";
import {
    DEFAULT_PIP_FALLBACK_MIRROR,
    DEFAULT_PIP_MIRROR,
    applyToolchainFlag,
    hasToolchainOptions,
    resolveToolchainOptions,
    type ToolchainOptions,
} from "../src/core/provision/options.mts";
import { DEFAULT_TORCH_INDEX } from "../src/core/provision/toolchain.mts";

/**
 * 捕获错误码。
 */
function errorCode(fn: () => unknown): string | undefined {
    try {
        fn();
        return undefined;
    } catch (e) {
        return (e as { code?: string }).code;
    }
}

test("默认值：阿里云主源 + 官方 fallback + 官方 PyTorch index", () => {
    const opts = resolveToolchainOptions(undefined, {});
    assert.equal(opts.mirror, DEFAULT_PIP_MIRROR);
    assert.equal(opts.fallbackMirror, DEFAULT_PIP_FALLBACK_MIRROR);
    assert.equal(opts.torchIndex, DEFAULT_TORCH_INDEX);
    assert.equal(opts.torchCuda, null);
    assert.equal(opts.torchCpu, false);
    assert.equal(opts.noCache, false);
});

test("优先级：CLI > 环境变量 > 默认值", () => {
    // 环境变量
    const env = resolveToolchainOptions(undefined, {
        DYCLI_PIP_MIRROR: "https://env.example.com/simple/",
        DYCLI_PIP_FALLBACK_MIRROR: "https://fallback.example.com/simple/",
        DYCLI_TORCH_INDEX: "https://torch.example.com/whl/",
        DYCLI_TORCH_CUDA: "CU129",
    });
    assert.equal(env.mirror, "https://env.example.com/simple/");
    assert.equal(env.fallbackMirror, "https://fallback.example.com/simple/");
    assert.equal(env.torchIndex, "https://torch.example.com/whl");
    assert.equal(env.torchCuda, "cu129");
    // CLI 覆盖环境变量
    const cli = resolveToolchainOptions(
        { mirror: "https://cli.example.com/simple/", torchCpu: true, noCache: true },
        { DYCLI_PIP_MIRROR: "https://env.example.com/simple/" },
    );
    assert.equal(cli.mirror, "https://cli.example.com/simple/");
    assert.equal(cli.torchCpu, true);
    assert.equal(cli.noCache, true);
});

test("fallback：none 关闭，与主源相同也关闭", () => {
    const none = resolveToolchainOptions({ fallbackMirror: "none" }, {});
    assert.equal(none.fallbackMirror, null);
    const same = resolveToolchainOptions(
        { mirror: "https://pypi.org/simple/", fallbackMirror: "https://pypi.org/simple/" },
        {},
    );
    assert.equal(same.fallbackMirror, null);
});

test("非法 URL / CUDA tag / 互斥参数返回 usage", () => {
    assert.equal(
        errorCode(() => resolveToolchainOptions({ mirror: "ftp://x" }, {})),
        "usage",
    );
    assert.equal(
        errorCode(() => resolveToolchainOptions({ fallbackMirror: "not-url" }, {})),
        "usage",
    );
    assert.equal(
        errorCode(() => resolveToolchainOptions({ torchIndex: "file:///tmp" }, {})),
        "usage",
    );
    assert.equal(
        errorCode(() => resolveToolchainOptions({ torchCuda: "cuda130" }, {})),
        "usage",
    );
    assert.equal(
        errorCode(() => resolveToolchainOptions({ torchCpu: true, torchCuda: "cu130" }, {})),
        "usage",
    );
    assert.equal(
        errorCode(() => resolveToolchainOptions(undefined, { DYCLI_TORCH_CPU: "1", DYCLI_TORCH_CUDA: "cu130" })),
        "usage",
    );
});

test("applyToolchainFlag：取值/开关/跳过参数", () => {
    // 目标参数
    const target: ToolchainOptions = {};
    // --mirror
    assert.deepEqual(applyToolchainFlag(target, "--mirror", ["--mirror", "https://m/simple/"], 0, undefined), {
        handled: true,
        skip: 1,
    });
    assert.equal(target.mirror, "https://m/simple/");
    // 内联
    assert.deepEqual(applyToolchainFlag(target, "--torch-cuda", [], 0, "cu124"), { handled: true, skip: 0 });
    assert.equal(target.torchCuda, "cu124");
    // 开关
    assert.deepEqual(applyToolchainFlag(target, "--torch-cpu", [], 0, undefined), { handled: true, skip: 0 });
    assert.equal(target.torchCpu, true);
    // 未识别
    assert.deepEqual(applyToolchainFlag(target, "--version", [], 0, undefined), { handled: false, skip: 0 });
    // 开关不接受内联值
    assert.equal(
        errorCode(() => applyToolchainFlag(target, "--no-cache", [], 0, "yes")),
        "usage",
    );
    // 是否显式设置
    assert.equal(hasToolchainOptions({}), false);
    assert.equal(hasToolchainOptions({ torchCpu: false }), false);
    assert.equal(hasToolchainOptions({ torchCpu: true }), true);
    assert.equal(hasToolchainOptions({ mirror: "" }), true);
});
