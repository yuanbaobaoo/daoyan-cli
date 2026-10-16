/** ComfyUI（外部组件）HTTP 契约的极薄客户端。
 *  - REST：/system_stats /object_info /queue /prompt /history/{id} /upload/image
 *  - WS 实时进度（/ws?clientId=）在 M2 接入；当前进度走日志解析兜底（M1, obs 模块）。
 *  local / remote 两种接入模式共用本客户端（base URL 由 engineBaseUrl 决定）。
 *  不可达时方法抛异常；queueRunningLen() 不可达时返回 null（视作无任务）。 */
export interface PromptReceipt {
  /**
   * 引擎分配的 prompt id（后续轮询 /history/{id} 用）。
   */
  prompt_id: string;
  /**
   * 引擎队列序号（可空，仅展示用）。
   */
  number?: number;
  /**
   * 节点校验错误（非空即提交被拒）。
   */
  node_errors?: Record<string, unknown>;
}

/**
 * 单次执行的终态摘要。
 */
export interface HistoryStatus {
  /**
   * 是否已完成。
   */
  completed?: boolean;
  /**
   * 终态字符串：success / error / cancelled。
   */
  status_str?: string;
  /**
   * 引擎执行过程消息（原样透传）。
   */
  messages?: unknown[];
}

/**
 * /history/{id} 的单条执行记录。
 */
export interface HistoryEntry {
  /**
   * 各节点产物（节点 id -> 产物结构）。
   */
  outputs?: Record<string, Record<string, unknown>>;
  /**
   * 执行终态摘要。
   */
  status?: HistoryStatus;
}

/**
 * /queue 的队列快照。
 */
export interface QueueSnapshot {
  /**
   * 执行中的任务条目。
   */
  queue_running: unknown[];
  /**
   * 排队等待的任务条目。
   */
  queue_pending: unknown[];
}

/**
 * ComfyUI REST 客户端（薄封装，只覆盖本 CLI 用到的端点）。
 */
export class ComfyClient {
  /**
   * 引擎 base URL（如 http://127.0.0.1:8188）。
   */
  readonly base: string;

  /**
   * 以 base URL 构造客户端。
   */
  constructor(base: string) {
    this.base = base;
  }

  /**
   * GET 请求并解析 JSON；非 2xx 抛普通 Error。
   */
  private async get<T>(path: string): Promise<T> {
    // 原始响应
    const res = await fetch(`${this.base}${path}`);
    if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  /**
   * 引擎系统状态（显存 / 设备等）。
   */
  systemStats(): Promise<unknown> {
    return this.get("/system_stats");
  }

  /**
   * 节点定义表（doctor 校验节点注册用）。
   */
  objectInfo(): Promise<Record<string, unknown>> {
    return this.get("/object_info");
  }

  /**
   * 队列快照（执行中 / 等待中）。
   */
  queue(): Promise<QueueSnapshot> {
    return this.get("/queue");
  }

  /**
   * 引擎执行中任务数；不可达返回 null。
   */
  async queueRunningLen(): Promise<number | null> {
    try {
      return (await this.queue()).queue_running.length;
    } catch {
      return null;
    }
  }

  /**
   * 查询单次执行的 history（按 prompt id）。
   */
  history(promptId: string): Promise<Record<string, HistoryEntry>> {
    return this.get(`/history/${promptId}`);
  }

  /**
   * 提交 workflow（API 格式）并返回受理回执。
   */
  async submit(workflow: Record<string, unknown>, clientId = "daoyan-cli"): Promise<PromptReceipt> {
    // 提交响应
    const res = await fetch(`${this.base}/prompt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });
    if (!res.ok) {
      throw new Error(`POST /prompt -> HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    return (await res.json()) as PromptReceipt;
  }

  /** 上传首帧图片到引擎 input（remote 模式的必经之路；local 模式也可统一走它）。
   *  返回引擎侧文件名，填入 LoadImage 节点的 image 输入。 */
  async uploadImage(filename: string, bytes: Uint8Array, overwrite = true): Promise<string> {
    // multipart 表单（引擎 input 端点约定）
    const form = new FormData();
    form.append("image", new Blob([bytes]), filename);
    form.append("overwrite", String(overwrite));
    // 上传响应
    const res = await fetch(`${this.base}/upload/image`, { method: "POST", body: form });
    if (!res.ok) {
      throw new Error(`POST /upload/image -> HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    // 引擎回传的落位信息
    const data = (await res.json()) as { name?: string };
    return data.name ?? filename;
  }
}

/**
 * 引擎连接信息（EngineConn 的结构子集）。
 */
export interface EngineConnLike {
  /**
   * 完整 base URL（设置时优先于 host/port）。
   */
  url?: string;
  /**
   * 引擎 HTTP 地址。
   */
  host: string;
  /**
   * 引擎 HTTP 端口。
   */
  port: number;
}

/**
 * 引擎 base URL：url 优先（可含 https / 路径前缀），否则由 host/port 拼出。
 */
export function engineBaseUrl(engine: EngineConnLike): string {
  return engine.url ?? `http://${engine.host}:${engine.port}`;
}

/**
 * 由 project.json 的 engine 配置构造客户端——local / remote 两种模式同构。
 */
export function clientFromEngine(engine: EngineConnLike): ComfyClient {
  return new ComfyClient(engineBaseUrl(engine));
}
