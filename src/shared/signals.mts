/** 前台信号处理 —— 命令可以注册 SIGINT/SIGTERM 处理器；
 *  没有注册者时按 Ctrl-C 约定退出 130。
 *  `--wait` 只停止等待；`run cancel` 才会取消 worker。 */
type Handler = (signal: NodeJS.Signals) => void;

// 已注册的前台信号处理器
const handlers = new Set<Handler>();

/**
 * 注册前台信号处理器，返回注销函数。
 */
export function onSignal(fn: Handler): () => void {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

/**
 * 安装全局信号入口（cli.mts 调用一次）。
 */
export function installSignalHandlers(): void {
  // SIGINT/SIGTERM 统一分发；有处理器时交给命令自行决定退出时机
  const dispatch = (signal: NodeJS.Signals): void => {
    if (handlers.size === 0) {
      process.exit(130);
      return;
    }
    for (const fn of handlers) {
      try {
        fn(signal);
      } catch {
        // 处理器异常不阻塞其他处理器
      }
    }
  };
  process.on("SIGINT", () => dispatch("SIGINT"));
  process.on("SIGTERM", () => dispatch("SIGTERM"));
}
