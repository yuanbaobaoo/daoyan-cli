/** 项目被动状态快照 —— status 命令与 web 只读视图共用。
 *  - 只读探测，不启动/停止引擎，不占 machine lock；
 *  - 引擎探测超时可配置，避免 Web 轮询被不可达服务拖慢；
 *  - 输出结构保持 status --json 的既有契约。 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ComfyClient, probeComfy } from "../comfy/client.mts";
import {
    RUNS_DIR,
    isTerminalStatus,
    type MachineConfig,
    type ProjectConfig,
    type ShotsFile,
    type TaskRecord,
} from "../project/types.mts";
import { pidAlive, readEnginePid } from "../engine/local-session.mts";
import { inspectMachineLock } from "../machine/lock.mts";
import { latestSucceededRun } from "../run/store.mts";
import { listTasks, taskSummary } from "../task/store.mts";
import { gpuSnapshot } from "../gpu/detect.mts";
import { inspectLease } from "../gpu/lease.mts";
import { skillState, type SkillCommand } from "../agent/skill.mts";
import { VERSION } from "../../shared/version.mts";

/**
 * 状态快照选项。
 */
export interface StatusSnapshotOptions {
    /**
     * 引擎探测超时（毫秒）。
     */
    engineTimeoutMs?: number;
    /**
     * 当前命令注册表；用于判断项目内 Skill 是否 stale。
     */
    commands?: readonly SkillCommand[];
}

/**
 * 探测引擎（只读，不启动）。
 */
export async function probeEngine(
    root: string,
    machine: MachineConfig,
    engineTimeoutMs = 3_000,
): Promise<Record<string, unknown>> {
    if (machine.engine.mode === "remote") {
        // remote URL
        const url = machine.engine.url;
        // 可达性
        const up = await probeComfy(url, engineTimeoutMs);
        // 队列快照
        const queue = up ? await safeQueue(new ComfyClient(url)) : null;
        return { mode: "remote", url, up, pid: null, queue };
    }
    // local PID 文件
    const pidRec = readEnginePid(root);
    // 存活 PID
    const pid = pidRec !== null && pidAlive(pidRec.pid) ? pidRec.pid : null;
    // local URL
    const url = `http://127.0.0.1:${machine.engine.port}`;
    // 可达性
    const up = await probeComfy(url, engineTimeoutMs);
    // 队列快照
    const queue = up ? await safeQueue(new ComfyClient(url)) : null;
    return {
        mode: "local",
        url,
        up,
        pid,
        queue,
        log: pid !== null ? `logs/engine-${pidRec?.task_id ?? "*"}.log` : null,
    };
}

/**
 * 队列快照（失败返回 null）。
 */
async function safeQueue(client: ComfyClient): Promise<Record<string, number> | null> {
    try {
        // 引擎队列
        const q = await client.queue();
        return { running: q.queue_running.length, pending: q.queue_pending.length };
    } catch {
        return null;
    }
}

/**
 * 镜头进度（从 runs 推导）。
 */
export function shotProgress(root: string, shots: ShotsFile | null): Array<Record<string, unknown>> {
    if (shots === null) return [];
    return shots.shots.map((s) => {
        // 最新成功 run
        const rec = latestSucceededRun(root, `shot:${s.id}`);
        // 第一个产物是否存在
        const present = rec !== null && rec.outputs.some((o) => existsSync(join(root, RUNS_DIR, rec.run_id, o.path)));
        return {
            id: s.id,
            slug: s.slug ?? null,
            done: rec !== null,
            latest_run: rec?.run_id ?? null,
            artifact_present: present,
        };
    });
}

/**
 * 本机 active task 与其他机器同步来的运行中任务。
 */
function splitActiveTasks(
    tasks: TaskRecord[],
    machine: MachineConfig,
): {
    active: TaskRecord[];
    synced: TaskRecord[];
} {
    // 本机 active task
    const active = tasks.filter((t) => !isTerminalStatus(t.status) && t.machine_id === machine.machine_id);
    // 其他机器同步来的运行中任务
    const synced = tasks.filter((t) => !isTerminalStatus(t.status) && t.machine_id !== machine.machine_id);
    return { active, synced };
}

/**
 * 默认状态快照。
 */
export async function buildStatusSnapshot(
    root: string,
    project: ProjectConfig,
    machine: MachineConfig,
    shots: ShotsFile | null,
    options: StatusSnapshotOptions = {},
): Promise<Record<string, unknown>> {
    // 引擎探测
    const engine = await probeEngine(root, machine, options.engineTimeoutMs);
    // 机器锁
    const lock = inspectMachineLock();
    // 全部任务
    const tasks = listTasks(root);
    // 本机 / 其他机器任务
    const { active, synced } = splitActiveTasks(tasks, machine);
    // GPU
    const gpu = await gpuSnapshot();
    // GPU 租约
    const lease = inspectLease();
    // Skill 状态
    const skill = skillState(root, VERSION, options.commands ?? []);
    // 镜头进度
    const shot = shotProgress(root, shots);
    // 最近任务列表
    const recentTasks = tasks.slice(0, 10).map(taskSummary);
    return {
        project: { name: project.name, version: project.version },
        mode: machine.engine.mode,
        machine_id: machine.machine_id,
        machine: {
            id: machine.machine_id,
            engine:
                machine.engine.mode === "local"
                    ? {
                          mode: "local",
                          port: machine.engine.port,
                          modelpath: machine.engine.modelpath ?? null,
                          models_config: machine.engine.models_config ?? null,
                          launch_extra: machine.engine.launch_extra ?? [],
                          comfyui_version: machine.engine.comfyui_version ?? null,
                          comfyui_dir: machine.engine.comfyui_dir ?? "engine/ComfyUI",
                          venv_dir: machine.engine.venv_dir ?? "engine/.venv",
                      }
                    : {
                          mode: "remote",
                          url: machine.engine.url,
                          free_after_task: machine.engine.free_after_task ?? "when_idle",
                      },
            override_workflows: Object.keys(machine.overrides ?? {}),
        },
        engine,
        machine_lock:
            lock.status === "ok"
                ? {
                      status: pidAlive(lock.record.pid) ? "held" : "stale",
                      owner_alive: pidAlive(lock.record.pid),
                      owner: {
                          task_id: lock.record.task_id,
                          pid: lock.record.pid,
                          mode: lock.record.mode,
                          command: lock.record.command,
                          kind: lock.record.kind,
                          started_at: lock.record.started_at,
                      },
                  }
                : { status: lock.status },
        active_task: active[0] !== undefined ? taskSummary(active[0]) : null,
        active_tasks: active.map(taskSummary),
        synced_running_tasks: synced.map(taskSummary),
        recent_tasks: recentTasks,
        gpu: {
            supported: gpu.supported,
            ...(gpu.reason !== undefined ? { reason: gpu.reason } : {}),
            devices: gpu.devices,
            lease:
                lease.status === "ok"
                    ? {
                          status: "held",
                          task_id: lease.lease.task_id,
                          entries: lease.lease.entries.length,
                          created_at: lease.lease.created_at,
                      }
                    : { status: lease.status },
        },
        skill: {
            present: skill.present,
            version: skill.version,
            generated_at: skill.generated_at,
            stale: skill.stale,
            path: skill.path,
        },
        shots: shot,
        next_actions:
            active.length > 0
                ? [`status --task ${active[0]?.task_id} --wait`, `run cancel ${active[0]?.task_id}`]
                : ["workflow nodes --refresh --json", "run <workflow> --json"],
    };
}
