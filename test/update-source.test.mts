/** update 自定义源/代理单元测试：manifest、路径解析、代理、参数优先级。 */
import test from "node:test";
import assert from "node:assert/strict";
import {
    normalizeProxy,
    parseUpdateFlags,
    parseUpdateManifest,
    redactProxy,
    resolveTgz,
    resolveUpdateSource,
} from "../src/commands/update.mts";

// 固定 SHA
const SHA = "a".repeat(64);

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

test("manifest：解析相对 tgz、默认 tag、sha256", () => {
    const m = parseUpdateManifest({
        schema_version: 1,
        version: "0.0.4",
        tgz: "v0.0.4/daoyan-cli-0.0.4.tgz",
        sha256: SHA.toUpperCase(),
    });
    assert.equal(m.version, "0.0.4");
    assert.equal(m.tag, "v0.0.4");
    assert.equal(m.tgz, "v0.0.4/daoyan-cli-0.0.4.tgz");
    assert.equal(m.sha256, SHA);
});

test("manifest：拒绝非法 version / tgz / sha256 / schema", () => {
    assert.equal(
        errorCode(() => parseUpdateManifest({ version: "x", tgz: "a.tgz" })),
        "update_failed",
    );
    assert.equal(
        errorCode(() => parseUpdateManifest({ version: "0.0.4" })),
        "update_failed",
    );
    assert.equal(
        errorCode(() => parseUpdateManifest({ version: "0.0.4", tgz: "a.tgz", sha256: "bad" })),
        "update_failed",
    );
    assert.equal(
        errorCode(() => parseUpdateManifest({ schema_version: 2, version: "0.0.4", tgz: "a.tgz" })),
        "update_failed",
    );
});

test("tgz 路径：远程相对 URL / 本地相对路径 / 拒绝 file 协议", () => {
    const remote = resolveTgz("https://mirror.example.com/daoyan/latest.json", "v0.0.4/app.tgz");
    assert.equal(remote.remote, true);
    assert.equal(remote.location, "https://mirror.example.com/daoyan/v0.0.4/app.tgz");

    const absolute = resolveTgz("https://mirror.example.com/daoyan/latest.json", "https://cdn.example.com/app.tgz");
    assert.equal(absolute.remote, true);
    assert.equal(absolute.location, "https://cdn.example.com/app.tgz");

    const local = resolveTgz("/data/mirror/daoyan/latest.json", "v0.0.4/app.tgz");
    assert.equal(local.remote, false);
    assert.match(local.location, /\/data\/mirror\/daoyan\/v0\.0\.4\/app\.tgz$/);

    assert.equal(
        errorCode(() => resolveTgz("https://mirror.example.com/daoyan/latest.json", "file:///etc/passwd")),
        "update_failed",
    );
});

test("代理：校验协议、隐藏凭据", () => {
    assert.equal(normalizeProxy("http://127.0.0.1:7890"), "http://127.0.0.1:7890");
    assert.equal(normalizeProxy("socks5h://127.0.0.1:1080"), "socks5h://127.0.0.1:1080");
    assert.equal(
        errorCode(() => normalizeProxy("ftp://127.0.0.1:21")),
        "usage",
    );
    assert.equal(
        errorCode(() => normalizeProxy("not-a-url")),
        "usage",
    );
    assert.equal(redactProxy("http://user:pass@127.0.0.1:7890"), "http://***@127.0.0.1:7890");
    assert.equal(redactProxy("http://127.0.0.1:7890"), "http://127.0.0.1:7890");
});

test("flags：解析、内联值、冲突校验", () => {
    const flags = parseUpdateFlags([
        "--check",
        "--manifest=https://mirror.example.com/latest.json",
        "--proxy",
        "http://127.0.0.1:7890",
    ]);
    assert.equal(flags.check, true);
    assert.equal(flags.manifest, "https://mirror.example.com/latest.json");
    assert.equal(flags.proxy, "http://127.0.0.1:7890");

    assert.equal(
        errorCode(() => parseUpdateFlags(["--from", "a.tgz", "--manifest", "b"])),
        "usage",
    );
    assert.equal(
        errorCode(() => parseUpdateFlags(["--check", "--from", "a.tgz"])),
        "usage",
    );
    assert.equal(
        errorCode(() => parseUpdateFlags(["--sha256", SHA])),
        "usage",
    );
    assert.equal(
        errorCode(() => parseUpdateFlags(["--unknown"])),
        "usage",
    );
});

test("源优先级：CLI > 环境变量 > 配置 > GitHub，代理同样按优先级", () => {
    const config = { manifest: "/data/mirror/latest.json", proxy: "http://config-proxy:7890" };

    const cli = resolveUpdateSource(
        { check: false, manifest: "https://cli.example.com/latest.json" },
        { DYCLI_UPDATE_MANIFEST: "https://env.example.com/latest.json" },
        config,
    );
    assert.equal(cli.kind, "manifest");
    if (cli.kind === "manifest") {
        assert.equal(cli.manifest, "https://cli.example.com/latest.json");
        assert.equal(cli.proxy, "http://config-proxy:7890");
    }

    const env = resolveUpdateSource(
        { check: false },
        {
            DYCLI_UPDATE_MANIFEST: "https://env.example.com/latest.json",
            DYCLI_UPDATE_PROXY: "socks5h://env-proxy:1080",
        },
        config,
    );
    assert.equal(env.kind, "manifest");
    if (env.kind === "manifest") {
        assert.equal(env.manifest, "https://env.example.com/latest.json");
        assert.equal(env.proxy, "socks5h://env-proxy:1080");
    }

    const from = resolveUpdateSource(
        { check: false },
        {
            DYCLI_UPDATE_FROM: "https://env.example.com/app.tgz",
            DYCLI_UPDATE_SHA256: SHA,
            DYCLI_UPDATE_MANIFEST: "https://env.example.com/latest.json",
        },
        config,
    );
    assert.equal(from.kind, "from");
    if (from.kind === "from") {
        assert.equal(from.from, "https://env.example.com/app.tgz");
        assert.equal(from.sha256, SHA);
    }

    const cfg = resolveUpdateSource({ check: false }, {}, config);
    assert.equal(cfg.kind, "manifest");
    if (cfg.kind === "manifest") assert.equal(cfg.manifest, config.manifest);

    const github = resolveUpdateSource({ check: false }, { HTTPS_PROXY: "http://env-proxy:7890" }, {});
    assert.equal(github.kind, "github");
    assert.equal(github.proxy, "http://env-proxy:7890");
});
