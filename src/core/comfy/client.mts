/** ComfyUI HTTP 契约的极薄客户端。
 *  - REST：/system_stats /object_info /queue /history/{id} /prompt /upload/image
 *          /view /free /interrupt
 *  local / remote 两种模式共用本客户端；只有进程生命周期不同（见 engine/*）。
 *  网络错误以普通 Error 抛出，由 executor / session 归一到结构化错误码。 */
import { fetchWithTimeout } from "../../shared/net.mts";

/**
 * /prompt 的受理回执。
 */
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
 * /view 下载结果。
 */
export interface ViewResult {
  /**
   * 文件字节。
   */
  bytes: Uint8Array;
  /**
   * Content-Type（可空）。
   */
  contentType: string | null;
}

/**
 * system_stats 的宽松视图（只取本 CLI 需要的字段）。
 */
export interface SystemStatsLike {
  /**
   * 系统段。
   */
  system?: Record<string, unknown>;
  /**
   * 设备段。
   */
  devices?: unknown[];
  /**
   * 其他字段原样保留。
   */
  [k: string]: unknown;
}

/**
 * ComfyUI REST 客户端（薄封装，只覆盖本 CLI 用到的端点）。
 */
export class ComfyClient {
  /**
   * 引擎 base URL（如 http://127.0.0.1:8188，可含路径前缀）。
   */
  readonly base: string;
  /**
   * 单请求默认超时（毫秒）。
   */
  readonly timeoutMs: number;

  /**
   * 以 base URL 构造客户端。
   */
  constructor(base: string, timeoutMs = 15_000) {
    this.base = base.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
  }

  /**
   * 拼接带路径前缀的 URL。
   */
  private url(path: string, query?: Record<string, string>): string {
    // 带查询串的 URL
    const u = new URL(`${this.base}${path}`);
    if (query !== undefined) {
      for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    }
    return u.toString();
  }

  /**
   * GET JSON；非 2xx 抛 Error。
   */
  private async getJson<T>(path: string, timeoutMs = this.timeoutMs): Promise<T> {
    // 原始响应
    const res = await fetchWithTimeout(this.url(path), { headers: { accept: "application/json" } }, timeoutMs);
    if (!res.ok) {
      throw new Error(`GET ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  /**
   * POST JSON；非 2xx 抛 Error。
   */
  private async postJson<T>(
    path: string,
    body: unknown,
    timeoutMs = this.timeoutMs,
  ): Promise<T> {
    // 原始响应
    const res = await fetchWithTimeout(
      this.url(path),
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
    if (!res.ok) {
      throw new Error(`POST ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    // 部分端点返回空 body
    const text = await res.text();
    return (text === "" ? {} : JSON.parse(text)) as T;
  }

  /**
   * 引擎系统状态（显存 / 版本 / 设备）。
   */
  systemStats(timeoutMs = this.timeoutMs): Promise<SystemStatsLike> {
    return this.getJson<SystemStatsLike>("/system_stats", timeoutMs);
  }

  /**
   * 节点定义表。
   */
  objectInfo(timeoutMs = 60_000): Promise<Record<string, unknown>> {
    return this.getJson<Record<string, unknown>>("/object_info", timeoutMs);
  }

  /**
   * 队列快照（执行中 / 等待中）。
   */
  queue(): Promise<QueueSnapshot> {
    return this.getJson<QueueSnapshot>("/queue");
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
   * 队列是否空闲（执行中 + 等待中均为 0）；不可达返回 null。
   */
  async queueIdle(): Promise<boolean | null> {
    try {
      // 队列快照
      const q = await this.queue();
      return q.queue_running.length + q.queue_pending.length === 0;
    } catch {
      return null;
    }
  }

  /**
   * 查询单次执行的 history（按 prompt id）。
   */
  history(promptId: string): Promise<Record<string, HistoryEntry>> {
    return this.getJson(`/history/${encodeURIComponent(promptId)}`);
  }

  /**
   * 提交 workflow（API 格式）并返回受理回执。
   */
  submit(workflow: Record<string, unknown>, clientId = "daoyan-cli"): Promise<PromptReceipt> {
    return this.postJson<PromptReceipt>("/prompt", { prompt: workflow, client_id: clientId }, 60_000);
  }

  /**
   * 上传图片到引擎 input，返回引擎侧文件名。
   */
  async uploadImage(filename: string, bytes: Uint8Array, overwrite = true): Promise<string> {
    // multipart 表单
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(bytes)]), filename);
    form.append("overwrite", String(overwrite));
    // 上传响应
    const res = await fetchWithTimeout(
      this.url("/upload/image"),
      { method: "POST", body: form },
      60_000,
    );
    if (!res.ok) {
      throw new Error(`POST /upload/image -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    // 引擎回传的落位信息
    const data = (await res.json()) as { name?: string; subfolder?: string };
    const name = data.name ?? filename;
    return data.subfolder !== undefined && data.subfolder !== "" ? `${data.subfolder}/${name}` : name;
  }

  /**
   * 卸载模型并释放显存（POST /free）。
   */
  async free(): Promise<void> {
    await this.postJson("/free", { unload_models: true, free_memory: true }, 10_000);
  }

  /**
   * 中断当前执行（POST /interrupt）。
   */
  async interrupt(): Promise<void> {
    await this.postJson("/interrupt", {}, 10_000);
  }

  /**
   * 下载产物（GET /view）。
   */
  async view(params: {
    filename: string;
    subfolder?: string;
    type?: string;
  }): Promise<ViewResult> {
    // 查询参数
    const query: Record<string, string> = { filename: params.filename, type: params.type ?? "output" };
    if (params.subfolder !== undefined && params.subfolder !== "") query.subfolder = params.subfolder;
    // 原始响应
    const res = await fetchWithTimeout(this.url("/view", query), {}, 120_000);
    if (!res.ok) {
      throw new Error(`GET /view -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    // 字节内容
    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, contentType: res.headers.get("content-type") };
  }
}

/**
 * 引擎连接信息（machine.json 的结构子集）。
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
 * 由连接信息构造客户端。
 */
export function clientFromEngine(engine: EngineConnLike): ComfyClient {
  return new ComfyClient(engineBaseUrl(engine));
}

/**
 * 单次 REST 连通性探测（不抛出）。
 */
export async function probeComfy(base: string, timeoutMs = 5_000): Promise<boolean> {
  try {
    await new ComfyClient(base, timeoutMs).systemStats(timeoutMs);
    return true;
  } catch {
    return false;
  }
}
