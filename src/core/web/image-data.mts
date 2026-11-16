/** Web 图片视图 —— 图片单元 / 图片库 / 操作状态 DTO。
 *  DTO 不含绝对路径；媒体只给 /media/stills 与 /media/run URL。 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { MachineConfig, ProjectConfig, TaskRecord } from "../project/types.mts";
import { listTasks } from "../task/store.mts";
import { storyMediaUrl } from "../story/assets.mts";
import { loadCharacters, loadScenes } from "../story/store.mts";
import {
    imageOpsStatus,
    loadStills,
    loadStillTakes,
    parseStillOwner,
    resolveImageSource,
    type ResolvedImageSource,
} from "../story/stills.mts";
import { stillTakeSummary } from "../story/image-takes.mts";
import { promptOptimizerStatus } from "../story/prompt-optimizer.mts";
import { mediaDownloadUrl } from "./data.mts";

/**
 * 图片库媒体地址。
 */
function stillsMediaUrl(path: string): string {
    // 相对 stills/ 的路径
    const rel = path.startsWith("stills/") ? path.slice("stills/".length) : path;
    return `/media/stills/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * 图片输入 DTO。
 */
function sourceView(root: string, raw: string | null | undefined): Record<string, unknown> | null {
    if (raw === undefined || raw === null || raw === "") return null;
    try {
        // 解析结果
        const resolved = resolveImageSource(root, raw);
        return { ...resolved, media_url: mediaUrlOf(resolved), download_url: downloadUrlOf(mediaUrlOf(resolved)) };
    } catch (e) {
        return { raw, present: false, error: e instanceof Error ? e.message : String(e), media_url: null };
    }
}

/**
 * 媒体地址。
 */
function mediaUrlOf(resolved: ResolvedImageSource): string | null {
    if (!resolved.present) return null;
    if (resolved.kind === "asset" && resolved.relative_path !== null) {
        return storyMediaUrl(resolved.relative_path, resolved.sha256);
    }
    if (resolved.kind === "ref" && resolved.relative_path !== null) {
        return stillsMediaUrl(resolved.relative_path);
    }
    if (
        (resolved.kind === "run" || resolved.kind === "still") &&
        resolved.run_id !== null &&
        resolved.output !== null
    ) {
        return `/media/run/${encodeURIComponent(resolved.run_id)}/${encodeURIComponent(resolved.output)}`;
    }
    return null;
}

/**
 * 下载地址。
 */
function downloadUrlOf(url: string | null): string | null {
    if (url === null) return null;
    return mediaDownloadUrl(url);
}

/**
 * owner 展示信息。
 */
function ownerView(
    root: string,
    owner: string | null | undefined,
    form: string | null | undefined,
): Record<string, unknown> | null {
    if (owner === undefined || owner === null || owner === "") return null;
    try {
        // 解析 owner
        const parsed = parseStillOwner(owner, form ?? undefined);
        if (parsed.kind === "character") {
            // 角色 / 形态
            const character = loadCharacters(root).characters.find((item) => item.id === parsed.id);
            const target = character?.forms.find((item) => item.id === parsed.form);
            return {
                kind: parsed.kind,
                id: parsed.id,
                form: parsed.form,
                name: character?.name ?? parsed.id,
                form_name: target?.name ?? parsed.form,
            };
        }
        // 场景
        const scene = loadScenes(root).scenes.find((item) => item.id === parsed.id);
        return { kind: parsed.kind, id: parsed.id, form: null, name: scene?.name ?? parsed.id, form_name: null };
    } catch {
        return { kind: null, id: owner, form: form ?? null, name: owner, form_name: form ?? null };
    }
}

/**
 * 图片库条目 DTO。
 */
export function listImageRefsView(root: string): unknown[] {
    // 注册表
    const doc = loadStills(root);
    return doc.refs.map((ref) => {
        // 文件状态
        const present = existsSync(join(root, ref.path));
        // 媒体地址
        const mediaUrl = present ? stillsMediaUrl(ref.path) : null;
        return {
            id: ref.id,
            role: ref.role,
            title: ref.title ?? null,
            path: ref.path,
            present,
            content_type: ref.content_type,
            sha256: ref.sha256,
            bytes: ref.bytes,
            width: ref.width ?? null,
            height: ref.height ?? null,
            created_at: ref.created_at,
            media_url: mediaUrl,
            download_url: downloadUrlOf(mediaUrl),
        };
    });
}

/**
 * 图片单元 DTO。
 */
export function listImageStillsView(root: string, active: Map<string, TaskRecord> = new Map()): unknown[] {
    // 注册表
    const doc = loadStills(root);
    return doc.stills.map((still) => {
        // 候选与定稿
        const summary = stillTakeSummary(root, still.id);
        // 运行中的图片任务
        const activeTask = active.get(still.id) ?? null;
        return {
            id: still.id,
            title: still.title ?? null,
            set: still.set ?? null,
            owner: ownerView(root, still.owner, still.form),
            episode_id: still.episode_id ?? null,
            shot_id: still.shot_id ?? null,
            prompt: still.prompt ?? "",
            negative: still.negative ?? null,
            seed: still.seed ?? null,
            width: still.width ?? null,
            height: still.height ?? null,
            workflow: still.workflow ?? null,
            source: sourceView(root, still.source),
            mask: sourceView(root, still.mask),
            slots: Object.entries(still.asset_slots ?? {}).map(([slot, value]) => ({
                slot,
                value,
                resolved: sourceView(root, `asset:${value}`),
            })),
            prompt_revisions: still.prompt_revisions ?? [],
            notes: still.notes ?? null,
            take: {
                finalized: summary.finalized,
                stale: summary.stale,
            },
            active_task:
                activeTask === null
                    ? null
                    : {
                          task_id: activeTask.task_id,
                          status: activeTask.status,
                          op: activeTask.options.op ?? null,
                          started_at: activeTask.started_at,
                      },
            candidates: summary.candidates.map((item) => {
                // 产物媒体地址
                const mediaUrl = `/media/run/${encodeURIComponent(item.run.run_id)}/${encodeURIComponent(item.output.name)}`;
                return {
                    run_id: item.run.run_id,
                    task_id: item.run.task_id,
                    op: item.run.op ?? null,
                    output: item.output.name,
                    bytes: item.output.bytes,
                    sha256: item.output.sha256,
                    selected: item.selected,
                    started_at: item.run.started_at,
                    media_url: mediaUrl,
                    download_url: downloadUrlOf(mediaUrl),
                };
            }),
        };
    });
}

/**
 * 图片视图（/api/images）。
 */
export function buildImagesView(
    root: string,
    project: ProjectConfig,
    machine: MachineConfig | null = null,
): Record<string, unknown> {
    // 注册表
    const doc = loadStills(root);
    // 运行中的图片任务
    const active = new Map<string, TaskRecord>();
    for (const task of listTasks(root)) {
        if (task.status !== "queued" && task.status !== "running") continue;
        for (const id of task.options.stills ?? []) {
            if (!active.has(id)) active.set(id, task);
        }
    }
    // 单元 / 台账
    const stills = listImageStillsView(root, active);
    const takes = loadStillTakes(root);
    // 图片集计数
    const sets = doc.sets.map((set) => ({
        ...set,
        count: doc.stills.filter((still) => still.set === set.id).length,
    }));
    // 未登记但被引用的图片集
    for (const still of doc.stills) {
        if (still.set === null || still.set === undefined) continue;
        if (sets.some((set) => set.id === still.set)) continue;
        sets.push({ id: still.set, title: still.set, count: 1 });
    }
    return {
        stills,
        sets,
        refs: listImageRefsView(root),
        ops: imageOpsStatus(root, project, machine),
        prompt_optimizer: promptOptimizerStatus(machine),
        summary: {
            stills_total: doc.stills.length,
            sets_total: sets.length,
            refs_total: doc.refs.length,
            finalized: takes.stills.filter((item) => item.finalized !== null).length,
            by_owner: {
                character: doc.stills.filter((still) => still.owner?.startsWith("character:") === true).length,
                scene: doc.stills.filter((still) => still.owner?.startsWith("scene:") === true).length,
                standalone: doc.stills.filter(
                    (still) => still.owner === null || still.owner === undefined || still.owner === "",
                ).length,
            },
            by_episode: doc.stills.filter((still) => still.episode_id !== null && still.episode_id !== undefined)
                .length,
        },
        updated_at: doc.updated_at,
    };
}
