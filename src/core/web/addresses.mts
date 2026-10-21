/** Web 监听地址推导 —— 把监听 host / 端口 / 网卡信息转换成可访问 URL 列表。
 *  - 默认只返回 local；通配监听时追加全部非 internal 网卡地址；
 *  - 监听 0.0.0.0 不列 IPv6（实际连不上）；监听 :: 才列 IPv6；
 *  - 过滤 fe80::/10 链路本地地址，避免输出不可直接访问的 URL。 */
import { networkInterfaces as osNetworkInterfaces, type NetworkInterfaceInfo } from "node:os";

/**
 * 可访问地址集合。
 */
export interface AccessUrls {
    /**
     * 本机地址。
     */
    local: string[];
    /**
     * 局域网 / 其它网卡地址。
     */
    network: string[];
}

/**
 * 地址推导参数。
 */
export interface AccessUrlOptions {
    /**
     * 监听地址（可带 IPv6 方括号）。
     */
    host: string;
    /**
     * 实际监听端口。
     */
    port: number;
    /**
     * 实际监听协议族。
     */
    family: "IPv4" | "IPv6";
    /**
     * 网卡快照；缺省读取系统网卡（测试可注入）。
     */
    interfaces?: NodeJS.Dict<NetworkInterfaceInfo[]>;
}

// IPv4 通配监听地址
const WILDCARD_IPV4 = "0.0.0.0";
// IPv6 通配监听地址
const WILDCARD_IPV6 = "::";
// 本机名
const LOCALHOST = "localhost";
// IPv4 回环地址
const LOOPBACK_IPV4 = "127.0.0.1";
// IPv6 回环地址
const LOOPBACK_IPV6 = "::1";
// fe80::/10 前缀掩码
const LINK_LOCAL_IPV6_MASK = 0xffc0;
// fe80::/10 前缀值
const LINK_LOCAL_IPV6_PREFIX = 0xfe80;

/**
 * 规范化监听地址：去空白与 IPv6 方括号。
 */
export function normalizeHost(host: string): string {
    // 去空白
    const trimmed = host.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed.slice(1, -1);
    return trimmed;
}

/**
 * 判断是否 loopback 监听地址。
 */
export function isLoopbackHost(host: string): boolean {
    // 规范化地址
    const normalized = normalizeHost(host).toLowerCase();
    return normalized === LOCALHOST || normalized === LOOPBACK_IPV4 || normalized === LOOPBACK_IPV6;
}

/**
 * 判断是否 IPv4 / IPv6 通配监听地址。
 */
function isWildcardHost(host: string): boolean {
    return host === WILDCARD_IPV4 || host === WILDCARD_IPV6;
}

/**
 * 判断是否 fe80::/10 链路本地 IPv6 地址。
 */
function isLinkLocalIpv6(address: string): boolean {
    // 首段
    const first = Number.parseInt(address.split(":")[0] ?? "", 16);
    if (!Number.isFinite(first)) return false;
    return (first & LINK_LOCAL_IPV6_MASK) === LINK_LOCAL_IPV6_PREFIX;
}

/**
 * 组装浏览器访问地址。
 */
function toUrl(host: string, port: number): string {
    return host.includes(":") ? `http://[${host}]:${port}` : `http://${host}:${port}`;
}

/**
 * 追加去重后的地址。
 */
function pushUnique(list: string[], url: string): void {
    if (!list.includes(url)) list.push(url);
}

/**
 * 推导本机与局域网访问地址。
 */
export function buildAccessUrls(options: AccessUrlOptions): AccessUrls {
    // 规范化监听地址
    const host = normalizeHost(options.host);
    // 监听端口
    const port = options.port;
    // 本机地址
    let localHost: string;
    if (host === WILDCARD_IPV4) localHost = LOOPBACK_IPV4;
    else if (host === WILDCARD_IPV6) localHost = LOOPBACK_IPV6;
    else localHost = host;
    // 本机地址列表
    const local = [toUrl(localHost, port)];
    // 非通配的具体地址：只展示用户指定的那一条
    if (!isWildcardHost(host)) {
        if (isLoopbackHost(host)) return { local, network: [] };
        return { local: [], network: [toUrl(host, port)] };
    }
    // 网卡快照
    const interfaces = options.interfaces ?? osNetworkInterfaces();
    // IPv4 地址
    const ipv4: string[] = [];
    // IPv6 地址
    const ipv6: string[] = [];
    for (const list of Object.values(interfaces)) {
        if (list === undefined) continue;
        for (const info of list) {
            if (info.internal) continue;
            if (info.family === "IPv4") {
                pushUnique(ipv4, toUrl(info.address, port));
                continue;
            }
            // 监听 0.0.0.0 只列 IPv4；监听 :: 才列 IPv6
            if (host === WILDCARD_IPV4) continue;
            if (isLinkLocalIpv6(info.address)) continue;
            pushUnique(ipv6, toUrl(info.address, port));
        }
    }
    // 网络地址（IPv4 优先，IPv6 在后）
    const network = [...ipv4, ...ipv6];
    return { local, network };
}
