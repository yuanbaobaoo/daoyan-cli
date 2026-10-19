/** GPU 容器模型卸载单元测试：cgroup、inspect、目标匹配、host/netns/exec 通道。 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    containerIdFromCgroup,
    matchContainerTarget,
    parseCrictlInspect,
    parseDockerInspect,
} from "../src/core/gpu/containers.mts";
import { channelFetch } from "../src/core/gpu/channel.mts";
import { containerExec } from "../src/core/gpu/container-exec.mts";
import * as ollama from "../src/core/gpu/providers/ollama.mts";
import * as vllm from "../src/core/gpu/providers/vllm.mts";
import type { ProviderChannel } from "../src/core/gpu/targets.mts";

// 固定容器 ID
const ID = "a".repeat(64);

/**
 * 启动一个临时 HTTP 服务。
 */
async function withHttpServer(
    handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void,
    fn: (port: number) => Promise<void>,
): Promise<void> {
    const server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (addr === null || typeof addr === "string") throw new Error("无法获取测试端口");
    try {
        await fn(addr.port);
    } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
}

/**
 * 读取请求 body。
 */
async function readBody(req: import("node:http").IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8");
}

test("cgroup：识别 docker / podman / containerd CRI / CRI-O / k8s", () => {
    assert.deepEqual(containerIdFromCgroup(`0::/system.slice/docker-${ID}.scope`), {
        id: ID,
        runtime: "docker",
        kubernetes: false,
    });
    assert.deepEqual(containerIdFromCgroup(`12:devices:/docker/${ID}`), {
        id: ID,
        runtime: "docker",
        kubernetes: false,
    });
    assert.deepEqual(
        containerIdFromCgroup(
            `0::/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod1234.slice/cri-containerd-${ID}.scope`,
        ),
        { id: ID, runtime: "crictl", kubernetes: true },
    );
    assert.deepEqual(
        containerIdFromCgroup(
            `0::/kubepods.slice/kubepods-besteffort.slice/kubepods-besteffort-pod1234.slice/crio-${ID}.scope`,
        ),
        { id: ID, runtime: "crictl", kubernetes: true },
    );
    // k8s cgroupfs 驱动：容器 ID 没有运行时前缀
    assert.deepEqual(containerIdFromCgroup(`11:devices:/kubepods/burstable/pod1234/${ID}`), {
        id: ID,
        runtime: "crictl",
        kubernetes: true,
    });
    assert.deepEqual(
        containerIdFromCgroup(`0::/user.slice/user-1000.slice/user@1000.service/user.slice/libpod-${ID}.scope`),
        { id: ID, runtime: "podman", kubernetes: false },
    );
    // 非容器
    assert.equal(containerIdFromCgroup("0::/user.slice/user-1000.slice/session-1.scope"), null);
});

test("docker inspect：解析名称、镜像、命令、宿主 PID、网络与端口映射", () => {
    const info = parseDockerInspect(
        [
            {
                Id: ID,
                Name: "/ollama",
                State: { Running: true, Pid: 4321 },
                Config: {
                    Image: "ollama/ollama:latest",
                    Entrypoint: ["/bin/ollama"],
                    Cmd: ["serve"],
                    Labels: {},
                },
                HostConfig: { NetworkMode: "bridge" },
                NetworkSettings: {
                    Ports: { "11434/tcp": [{ HostIp: "0.0.0.0", HostPort: "11435" }] },
                },
                Path: "/bin/ollama",
                Args: ["serve"],
            },
        ],
        "docker",
    );
    assert.ok(info);
    assert.equal(info.id, ID);
    assert.equal(info.name, "ollama");
    assert.equal(info.image, "ollama/ollama:latest");
    assert.equal(info.running, true);
    assert.equal(info.hostPid, 4321);
    assert.equal(info.networkMode, "bridge");
    assert.deepEqual(info.portBindings, [{ containerPort: 11434, hostPort: 11435 }]);
    assert.deepEqual(info.command, ["/bin/ollama", "serve", "/bin/ollama", "serve"]);
});

test("crictl inspect：解析 k8s 容器命令与运行状态", () => {
    const info = parseCrictlInspect({
        status: {
            id: ID,
            metadata: { name: "vllm" },
            state: "CONTAINER_RUNNING",
            image: { image: "vllm/vllm-openai:latest" },
            pid: 8765,
        },
        info: {
            config: {
                command: ["python3"],
                args: ["-m", "vllm.entrypoints.openai.api_server"],
                env: ["SECRET=should-not-be-read"],
            },
        },
    });
    assert.ok(info);
    assert.equal(info.name, "vllm");
    assert.equal(info.image, "vllm/vllm-openai:latest");
    assert.equal(info.running, true);
    assert.equal(info.hostPid, 8765);
    assert.deepEqual(info.command, ["python3", "-m", "vllm.entrypoints.openai.api_server"]);
});

test("容器目标匹配：内置服务命中，未知镜像不命中", () => {
    assert.equal(matchContainerTarget("ollama/ollama:latest ollama serve")?.id, "ollama");
    assert.equal(matchContainerTarget("lmstudio")?.id, "lmstudio");
    assert.equal(matchContainerTarget("xprobe/xinference:latest")?.id, "xinference");
    assert.equal(matchContainerTarget("vllm/vllm-openai:latest")?.id, "vllm");
    assert.equal(matchContainerTarget("ghcr.io/huggingface/text-generation-inference:3.0")?.id, "tgi");
    assert.equal(matchContainerTarget("ghcr.io/ggerganov/llama.cpp:server")?.id, "llama.cpp");
    assert.equal(matchContainerTarget("lmsysorg/sglang:latest")?.id, "sglang");
    assert.equal(matchContainerTarget("nginx:latest redis"), undefined);
});

test("host 通道：ollama 只卸载/重载模型，不停止服务", async () => {
    // /api/generate 收到的 body
    const bodies: Array<Record<string, unknown>> = [];
    await withHttpServer(
        (req, res) => {
            if (req.method === "GET" && req.url === "/api/ps") {
                res.end(JSON.stringify({ models: [{ name: "llama3", size_vram: 1024 }] }));
                return;
            }
            if (req.method === "POST" && req.url === "/api/generate") {
                // 异步读取 body 后再响应（async/await，不用 .then）
                void (async () => {
                    try {
                        const text = await readBody(req);
                        bodies.push(JSON.parse(text) as Record<string, unknown>);
                        res.end("{}");
                    } catch (e) {
                        res.statusCode = 500;
                        res.end(String(e));
                    }
                })();
                return;
            }
            res.statusCode = 404;
            res.end("{}");
        },
        async (port) => {
            const channel: ProviderChannel = {
                kind: "host",
                base_url: `http://127.0.0.1:${port}`,
            };
            assert.deepEqual(await ollama.detect(channel), ["llama3"]);
            assert.deepEqual(await ollama.unload(channel, ["llama3"]), {
                ok: ["llama3"],
                errors: [],
            });
            assert.deepEqual(await ollama.load(channel, ["llama3"]), {
                restored: ["llama3"],
                errors: [],
            });
            assert.equal(bodies[0]?.keep_alive, 0);
            assert.equal(bodies[0]?.stream, false);
            assert.equal(bodies[1]?.prompt, "");
            assert.equal(bodies[1]?.keep_alive, "5m");
        },
    );
});

test("host 通道：vLLM sleep mode 只休眠/唤醒，不停止服务", async () => {
    // 请求序列
    const requests: string[] = [];
    await withHttpServer(
        (req, res) => {
            requests.push(`${req.method ?? ""} ${req.url ?? ""}`);
            if (req.method === "GET" && req.url === "/is_sleeping") {
                res.end(JSON.stringify({ is_sleeping: false }));
                return;
            }
            if (req.method === "POST" && req.url === "/sleep?level=1") {
                res.end("{}");
                return;
            }
            if (req.method === "POST" && req.url === "/wake_up") {
                res.end("{}");
                return;
            }
            res.statusCode = 404;
            res.end("{}");
        },
        async (port) => {
            const channel: ProviderChannel = {
                kind: "host",
                base_url: `http://127.0.0.1:${port}`,
            };
            assert.deepEqual(await vllm.detect(channel), ["sleep"]);
            assert.deepEqual(await vllm.unload(channel, ["sleep"]), {
                ok: ["sleep"],
                errors: [],
            });
            assert.deepEqual(await vllm.load(channel, ["sleep"]), {
                restored: ["sleep"],
                errors: [],
            });
            assert.deepEqual(requests, ["GET /is_sleeping", "POST /sleep?level=1", "POST /wake_up"]);
        },
    );
});

test("netns 通道：nsenter 进入容器网络后仍可调用本地 API（不需要 kubectl）", async () => {
    // 假 nsenter：跳过 -t/-n 参数，直接执行后面的 node
    const dir = mkdtempSync(join(tmpdir(), "dycli-nsenter-"));
    writeFileSync(
        join(dir, "nsenter"),
        `#!/bin/sh
shift 3
exec "$@"
`,
        { mode: 0o755 },
    );
    const oldPath = process.env.PATH ?? "";
    process.env.PATH = `${dir}:${oldPath}`;
    try {
        await withHttpServer(
            (req, res) => {
                if (req.method === "GET" && req.url === "/api/ps") {
                    res.end(JSON.stringify({ models: [{ name: "container-model", size_vram: 2048 }] }));
                    return;
                }
                res.statusCode = 404;
                res.end("{}");
            },
            async (port) => {
                const channel: ProviderChannel = {
                    kind: "netns",
                    pid: process.pid,
                    base_url: `http://127.0.0.1:${port}`,
                };
                const res = await channelFetch(channel, { path: "/api/ps", timeoutMs: 3_000 });
                assert.ok(res);
                assert.equal(res.status, 200);
                assert.match(res.text, /container-model/);
            },
        );
    } finally {
        process.env.PATH = oldPath;
        rmSync(dir, { recursive: true, force: true });
    }
});

test("exec 通道：docker exec 参数正确（不停止容器）", async () => {
    // 假 docker：记录参数并成功
    const dir = mkdtempSync(join(tmpdir(), "dycli-docker-"));
    const logPath = join(dir, "calls.log");
    writeFileSync(
        join(dir, "docker"),
        `#!/bin/sh
echo "$@" >> "${logPath}"
exit 0
`,
        { mode: 0o755 },
    );
    const oldPath = process.env.PATH ?? "";
    process.env.PATH = `${dir}:${oldPath}`;
    try {
        const channel: ProviderChannel = {
            kind: "exec",
            runtime: "docker",
            container_id: ID,
            container_name: "ollama",
        };
        const r = await containerExec(channel, ["lms", "unload", "model-a"], 5_000);
        assert.ok(r);
        assert.equal(r.code, 0);
        const calls = readFileSync(logPath, "utf8");
        assert.match(calls, new RegExp(`exec ${ID} lms unload model-a`));
    } finally {
        process.env.PATH = oldPath;
        rmSync(dir, { recursive: true, force: true });
    }
});
