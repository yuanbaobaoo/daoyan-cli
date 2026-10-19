/** update 自定义源/代理单元测试：manifest、路径解析、代理、参数优先级。 */
import test from "node:test";
import assert from "node:assert/strict";
import {
    DEFAULT_GITHUB_PROXIES,
    DEFAULT_UPDATE_MANIFEST,
    githubMirrorUrl,
    isGithubUrl,
    normalizeProxy,
    parseGithubProxyList,
    parseUpdateFlags,
    parseUpdateManifest,
    redactProxy,
    resolveGithubProxies,
    resolveTgz,
    resolveUpdateSource,
    sameUpdateManifest,
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
        "--github-proxy",
        "https://gh-proxy.com",
    ]);
    assert.equal(flags.check, true);
    assert.equal(flags.manifest, "https://mirror.example.com/latest.json");
    assert.equal(flags.proxy, "http://127.0.0.1:7890");
    assert.equal(flags.githubProxy, "https://gh-proxy.com");

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

test("源优先级：CLI > 环境变量 > 配置 > 默认 Release 清单，代理同样按优先级", () => {
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
        assert.equal(cli.fallbackToGithub, undefined);
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
    if (cfg.kind === "manifest") {
        assert.equal(cfg.manifest, config.manifest);
        assert.equal(cfg.fallbackToGithub, undefined);
    }

    // 无 CLI / 环境变量 / 配置时：默认 Release 清单，并允许回退 git
    const fallback = resolveUpdateSource({ check: false }, { HTTPS_PROXY: "http://env-proxy:7890" }, {});
    assert.equal(fallback.kind, "manifest");
    if (fallback.kind === "manifest") {
        assert.equal(fallback.manifest, DEFAULT_UPDATE_MANIFEST);
        assert.equal(fallback.fallbackToGithub, true);
        assert.equal(fallback.proxy, "http://env-proxy:7890");
    }
});

test("GitHub 加速源：默认列表、none 关闭、自定义与 HTTP 代理", () => {
    // 无显式配置：启用内置列表
    assert.deepEqual(resolveGithubProxies({ check: false }, {}, undefined), [...DEFAULT_GITHUB_PROXIES]);
    // 配置 HTTP 代理：默认不叠加第三方加速源
    assert.deepEqual(resolveGithubProxies({ check: false }, {}, "http://127.0.0.1:7890"), []);
    // none 关闭（CLI / 环境变量）
    assert.deepEqual(resolveGithubProxies({ check: false, githubProxy: "none" }, {}, undefined), []);
    assert.deepEqual(resolveGithubProxies({ check: false }, { DYCLI_UPDATE_GITHUB_PROXY: "none" }, undefined), []);
    // 自定义列表：逗号分隔、去重、去末尾斜杠；显式值可与 HTTP 代理共存
    assert.deepEqual(
        resolveGithubProxies(
            { check: false, githubProxy: "https://a.example/ , https://b.example,https://a.example" },
            {},
            "http://127.0.0.1:7890",
        ),
        ["https://a.example", "https://b.example"],
    );
    // 环境变量
    assert.deepEqual(
        resolveGithubProxies({ check: false }, { DYCLI_UPDATE_GITHUB_PROXY: "https://env.example/" }, undefined),
        ["https://env.example"],
    );
    // 非法值
    assert.equal(
        errorCode(() => parseGithubProxyList("ftp://x")),
        "usage",
    );
    assert.equal(
        errorCode(() => parseGithubProxyList(" , ")),
        "usage",
    );
});

test("加速源 URL 与清单一致性", () => {
    assert.equal(
        githubMirrorUrl("https://gh-proxy.com/", "https://github.com/a/b"),
        "https://gh-proxy.com/https://github.com/a/b",
    );
    assert.equal(isGithubUrl("https://github.com/a/b"), true);
    assert.equal(isGithubUrl("https://api.github.com/a/b"), false);
    assert.equal(isGithubUrl("https://gh-proxy.com/https://github.com/a/b"), false);
    assert.equal(isGithubUrl("not-a-url"), false);
    // 相同版本：忽略 v 前缀与 sha 大小写
    const a = parseUpdateManifest({ version: "0.0.6", tgz: "a.tgz", sha256: SHA });
    const b = parseUpdateManifest({ version: "v0.0.6", tgz: "a.tgz", sha256: SHA.toUpperCase() });
    assert.equal(sameUpdateManifest(a, b), true);
    // 版本或 tgz 不同
    assert.equal(sameUpdateManifest(a, { ...a, version: "0.0.7" }), false);
    assert.equal(sameUpdateManifest(a, { ...a, tgz: "b.tgz" }), false);
    // sha 不同
    assert.equal(sameUpdateManifest(a, { ...a, sha256: "b".repeat(64) }), false);
});
