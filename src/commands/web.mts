/** web —— 启动 Web UI，查看项目状态、分镜、任务与产出物，并可定稿镜头。
 *  - 默认 127.0.0.1 + 系统分配端口；Ctrl+C / SIGTERM 优雅关闭；
 *  - 默认不启动引擎、不占 machine lock；可确认剧本、创建镜头生成任务与定稿；
 *  - --json 输出一次启动信封后继续驻留，后续日志走 stderr。 */
import { spawn } from "node:child_process";
import { DaoyanCliError } from "../shared/errors.mts";
import { emitData } from "../shared/json.mts";
import { say, warn } from "../shared/log.mts";
import type { CliContext } from "../shared/context.mts";
import { splitInlineFlag, takeValue, usageError } from "../shared/args.mts";
import { loadMachineIfExists, loadShotsIfExists, requireProject } from "../core/project/config.mts";
import { onSignal } from "../shared/signals.mts";
import { startWebServer } from "../core/web/server.mts";
import { isLoopbackHost } from "../core/web/addresses.mts";
import indexHtml from "../core/web/ui/index.html";
import appJs from "../core/web/ui/app.client";
import styleCss from "../core/web/ui/style.css";

/**
 * web 参数。
 */
interface WebFlags {
    /**
     * 监听地址。
     */
    host?: string;
    /**
     * 监听端口；0 表示随机。
     */
    port?: number;
    /**
     * 是否自动打开浏览器。
     */
    open: boolean;
}

// 默认监听地址
const DEFAULT_HOST = "127.0.0.1";
// 默认端口（系统分配）
const DEFAULT_PORT = 0;
// 端口上限
const MAX_PORT = 65_535;
// 启动失败提示
const START_FAILED_HINT = "检查监听地址与端口占用；端口冲突时省略 --port 让系统分配，或改用 --port <n>。";

/**
 * 解析 web 参数。
 */
function parseArgs(args: string[]): WebFlags {
    // 解析结果
    const out: WebFlags = { open: false };
    for (let i = 0; i < args.length; i++) {
        // 当前参数
        const { name, inline } = splitInlineFlag(args[i] ?? "");
        if (name === "--host") {
            // 监听地址
            const v = takeValue(args, i, inline, "--host");
            out.host = v.value;
            i += v.skip;
            continue;
        }
        if (name === "--port") {
            // 端口文本
            const v = takeValue(args, i, inline, "--port");
            // 端口数值
            const port = Number(v.value);
            if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
                usageError(`--port 需要 0-${MAX_PORT} 的整数（0 表示系统分配）`);
            }
            out.port = port;
            i += v.skip;
            continue;
        }
        if (name === "--open") {
            out.open = true;
            continue;
        }
        usageError(`未知参数 ${name}`);
    }
    return out;
}

/**
 * 尝试打开系统默认浏览器。
 */
function openBrowser(url: string): boolean {
    // 打开命令
    let command = "xdg-open";
    // 命令参数
    let args = [url];
    if (process.platform === "darwin") command = "open";
    if (process.platform === "win32") {
        command = "cmd";
        args = ["/c", "start", "", url];
    }
    try {
        // 浏览器子进程
        const child = spawn(command, args, { detached: true, stdio: "ignore" });
        child.on("error", () => {
            warn(`无法自动打开浏览器（${command}）；请手动访问 ${url}`);
        });
        child.unref();
        return true;
    } catch (e) {
        warn(`无法自动打开浏览器：${e instanceof Error ? e.message : String(e)}`);
        return false;
    }
}

/**
 * web 命令入口。
 */
export async function runWeb(ctx: CliContext, args: string[]): Promise<number> {
    // 参数
    const flags = parseArgs(args);
    // 项目根与配置
    const { root, config: project } = requireProject(ctx);
    // 本机配置（缺失时只读展示共享数据）
    const machine = loadMachineIfExists(root);
    // 分镜
    const shots = loadShotsIfExists(root);
    // 当前命令注册表（Skill stale 判定）
    const { COMMANDS } = await import("./registry.mts");
    // 实际监听地址
    const host = flags.host ?? DEFAULT_HOST;
    if (!isLoopbackHost(host)) {
        warn(`监听 ${host}：局域网内可访问项目产出物，请确认网络环境可信`);
    }

    // 服务句柄
    let handle: Awaited<ReturnType<typeof startWebServer>>;
    try {
        handle = await startWebServer({
            root,
            project,
            machine,
            shots,
            commands: COMMANDS,
            assets: { index_html: indexHtml, app_js: appJs, style_css: styleCss },
            host,
            port: flags.port ?? DEFAULT_PORT,
        });
    } catch (e) {
        throw new DaoyanCliError({
            code: "web_start_failed",
            message: `无法启动 Web 服务：${e instanceof Error ? e.message : String(e)}`,
            hint: START_FAILED_HINT,
        });
    }

    // 启动输出
    if (ctx.json) {
        emitData({
            url: handle.url,
            urls: handle.urls,
            host: handle.host,
            port: handle.port,
            project: project.name,
            mode: machine?.engine.mode ?? null,
        });
    } else {
        say(`daoyan web · ${project.name} · ${machine?.engine.mode ?? "未绑定本机"}`);
        for (const url of handle.urls.local) say(`  Local:   ${url}`);
        for (const url of handle.urls.network) say(`  Network: ${url}`);
        say("  分镜页可直接定稿镜头稿件；不启动引擎、不占机器锁、不触发任何生成");
        say("  Ctrl+C 停止");
    }
    // 自动打开
    if (flags.open) openBrowser(handle.url);

    /**
     * 关闭服务。
     */
    async function shutdown(): Promise<void> {
        try {
            await handle.close();
        } catch (e) {
            warn(`关闭 Web 服务失败：${e instanceof Error ? e.message : String(e)}`);
        }
    }

    // 信号注销函数
    const offSignal = onSignal(() => {
        void shutdown();
    });
    // 等待服务关闭
    await handle.closed;
    offSignal();
    if (!ctx.json) say("已停止");
    return 0;
}
