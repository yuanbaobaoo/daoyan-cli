/** Web 可访问地址推导测试：loopback、通配监听、网卡过滤与去重。 */
import test from "node:test";
import assert from "node:assert/strict";
import type { NetworkInterfaceInfo } from "node:os";
import { buildAccessUrls, isLoopbackHost, normalizeHost } from "../src/core/web/addresses.mts";

/**
 * 构造 IPv4 网卡信息。
 */
function ipv4(address: string, internal = false): NetworkInterfaceInfo {
    return {
        address,
        netmask: "255.255.255.0",
        family: "IPv4",
        mac: "00:00:00:00:00:00",
        internal,
        cidr: null,
    };
}

/**
 * 构造 IPv6 网卡信息。
 */
function ipv6(address: string, internal = false): NetworkInterfaceInfo {
    return {
        address,
        netmask: "ffff:ffff:ffff:ffff::",
        family: "IPv6",
        mac: "00:00:00:00:00:00",
        internal,
        cidr: null,
        scopeid: 0,
    };
}

/**
 * 测试网卡快照。
 */
function interfaces(): NodeJS.Dict<NetworkInterfaceInfo[]> {
    return {
        lo0: [ipv4("127.0.0.1", true), ipv6("::1", true)],
        en0: [ipv4("192.168.1.23"), ipv6("fe80::1"), ipv6("2001:db8::1")],
        utun0: [ipv4("10.8.0.3")],
    };
}

test("web addresses：loopback 只返回本机地址", () => {
    // 127.0.0.1
    const loopback = buildAccessUrls({ host: "127.0.0.1", port: 1234, family: "IPv4" });
    assert.deepEqual(loopback, { local: ["http://127.0.0.1:1234"], network: [] });
    // localhost
    const localhost = buildAccessUrls({ host: "localhost", port: 1234, family: "IPv4" });
    assert.deepEqual(localhost, { local: ["http://localhost:1234"], network: [] });
    // IPv6 回环（带方括号）
    const ipv6Loopback = buildAccessUrls({ host: "[::1]", port: 1234, family: "IPv6" });
    assert.deepEqual(ipv6Loopback, { local: ["http://[::1]:1234"], network: [] });
});

test("web addresses：0.0.0.0 列全部 IPv4，不列 IPv6", () => {
    // 推导结果
    const urls = buildAccessUrls({ host: "0.0.0.0", port: 1234, family: "IPv4", interfaces: interfaces() });
    assert.deepEqual(urls.local, ["http://127.0.0.1:1234"]);
    assert.deepEqual(urls.network, ["http://192.168.1.23:1234", "http://10.8.0.3:1234"]);
});

test("web addresses：:: 列 IPv4 与可达 IPv6，过滤 link-local", () => {
    // 推导结果
    const urls = buildAccessUrls({ host: "::", port: 1234, family: "IPv6", interfaces: interfaces() });
    assert.deepEqual(urls.local, ["http://[::1]:1234"]);
    assert.deepEqual(urls.network, ["http://192.168.1.23:1234", "http://10.8.0.3:1234", "http://[2001:db8::1]:1234"]);
});

test("web addresses：具体非 loopback 地址只返回该地址", () => {
    const urls = buildAccessUrls({ host: "192.168.1.23", port: 1234, family: "IPv4", interfaces: interfaces() });
    assert.deepEqual(urls, { local: [], network: ["http://192.168.1.23:1234"] });
});

test("web addresses：网络地址去重", () => {
    // 重复网卡
    const duplicated: NodeJS.Dict<NetworkInterfaceInfo[]> = {
        en0: [ipv4("192.168.1.23")],
        en1: [ipv4("192.168.1.23")],
    };
    const urls = buildAccessUrls({ host: "0.0.0.0", port: 1234, family: "IPv4", interfaces: duplicated });
    assert.deepEqual(urls.network, ["http://192.168.1.23:1234"]);
});

test("web addresses：host 规范化与 loopback 判定", () => {
    assert.equal(normalizeHost("[::1]"), "::1");
    assert.equal(normalizeHost("  127.0.0.1  "), "127.0.0.1");
    assert.equal(isLoopbackHost("localhost"), true);
    assert.equal(isLoopbackHost("[::1]"), true);
    assert.equal(isLoopbackHost("0.0.0.0"), false);
});
