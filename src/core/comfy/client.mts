/** ComfyUI（外部组件）HTTP 契约的极薄客户端。
 *  - REST：/system_stats /object_info /queue /prompt /history/{id} /upload/image
 *  - WS 实时进度（/ws?clientId=）在 M2 接入；当前进度走日志解析兜底（M1, obs 模块）。
 *  local / remote 两种接入模式共用本客户端（base URL 由 engineBaseUrl 决定）。
 *  不可达时方法抛异常；queueRunningLen() 不可达时返回 null（视作无任务）。 */
export interface PromptReceipt {
  prompt_id: string;
  number?: number;
  node_errors?: Record<string, unknown>;
}

export interface HistoryStatus {
  completed?: boolean;
  status_str?: string;
  messages?: unknown[];
}

export interface HistoryEntry {
  outputs?: Record<string, Record<string, unknown>>;
  status?: HistoryStatus;
}

export interface QueueSnapshot {
  queue_running: unknown[];
  queue_pending: unknown[];
}

export class ComfyClient {
  readonly base: string;

  constructor(base: string) {
    this.base = base;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`);
    if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  systemStats(): Promise<unknown> {
    return this.get("/system_stats");
  }

  objectInfo(): Promise<Record<string, unknown>> {
    return this.get("/object_info");
  }

  queue(): Promise<QueueSnapshot> {
    return this.get("/queue");
  }

  /** 引擎执行中任务数；不可达返回 null。 */
  async queueRunningLen(): Promise<number | null> {
    try {
      return (await this.queue()).queue_running.length;
    } catch {
      return null;
    }
  }

  history(promptId: string): Promise<Record<string, HistoryEntry>> {
    return this.get(`/history/${promptId}`);
  }

  async submit(workflow: Record<string, unknown>, clientId = "daoyan-cli"): Promise<PromptReceipt> {
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
    const form = new FormData();
    form.append("image", new Blob([bytes]), filename);
    form.append("overwrite", String(overwrite));
    const res = await fetch(`${this.base}/upload/image`, { method: "POST", body: form });
    if (!res.ok) {
      throw new Error(`POST /upload/image -> HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const data = (await res.json()) as { name?: string };
    return data.name ?? filename;
  }
}

/** 引擎连接信息（EngineConn 的结构子集）。 */
export interface EngineConnLike {
  url?: string;
  host: string;
  port: number;
}

/** 引擎 base URL：url 优先（可含 https / 路径前缀），否则由 host/port 拼出。 */
export function engineBaseUrl(engine: EngineConnLike): string {
  return engine.url ?? `http://${engine.host}:${engine.port}`;
}

/** 由 project.json 的 engine 配置构造客户端——local / remote 两种模式同构。 */
export function clientFromEngine(engine: EngineConnLike): ComfyClient {
  return new ComfyClient(engineBaseUrl(engine));
}
