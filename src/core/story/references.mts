/** Story 设定引用扫描 —— 删除角色 / 场景资产前判断是否仍被分镜使用。
 *  - 角色：shots[].characters[]（字符串或带 id 的对象）；
 *  - 场景：shots[].scene / location / set；
 *  - 资产：shot.asset_slots 的 owner@asset 显式映射、场景 scene_asset。 */
import type { ShotSpec } from "../project/types.mts";
import { listEpisodeMetas } from "./paths.mts";
import { loadEpisodeShots } from "./store.mts";

/**
 * 引用解析结果。
 */
export interface EntityReferenceUsage {
    /**
     * 角色 / 场景被任意分镜使用。
     */
    entity: boolean;
    /**
     * 这张具体资产被分镜槽位显式绑定。
     */
    asset: boolean;
}

/**
 * 从引用值取 id。
 */
function refId(value: unknown): string | null {
    if (typeof value === "string") return value.trim() === "" ? null : value.trim();
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    // 对象视图
    const record = value as Record<string, unknown>;
    return typeof record.id === "string" && record.id.trim() !== "" ? record.id.trim() : null;
}

/**
 * 镜头是否引用了该角色 / 场景。
 */
function shotUsesEntity(shot: ShotSpec, kind: "character" | "scene", id: string): boolean {
    if (kind === "character") {
        const cast = Array.isArray(shot.characters) ? shot.characters : [];
        return cast.some((ref) => refId(ref) === id);
    }
    // 场景别名
    const record = shot as unknown as Record<string, unknown>;
    return [record.scene, record.location, record.set].some((ref) => refId(ref) === id);
}

/**
 * 镜头是否用 owner@asset 显式绑定了该资产。
 */
function shotBindsAsset(
    shot: ShotSpec,
    kind: "character" | "scene",
    id: string,
    assetId: string,
    form: string | undefined,
): boolean {
    if (kind === "scene") {
        // 场景单资产映射
        const explicit = (shot as unknown as Record<string, unknown>).scene_asset;
        if (explicit === assetId && refId((shot as unknown as Record<string, unknown>).scene) === id) return true;
    }
    // 槽位映射
    for (const value of Object.values(shot.asset_slots ?? {})) {
        if (typeof value !== "string") continue;
        // 最后一个 @ 分隔 owner 与资产
        const at = value.lastIndexOf("@");
        if (at <= 0 || at >= value.length - 1) continue;
        if (value.slice(at + 1) !== assetId) continue;
        // owner：角色为 <id>/<form>，场景为 <id>
        const owner = value.slice(0, at);
        if (kind === "scene") {
            if (owner === id) return true;
            continue;
        }
        // 角色 owner 可省略形态（按默认形态解析）
        const [ownerId, ownerForm] = owner.split("/");
        if (ownerId !== id) continue;
        if (ownerForm !== undefined && ownerForm !== "" && form !== undefined && ownerForm !== form) continue;
        return true;
    }
    return false;
}

/**
 * 扫描全部剧集分镜，返回该资产的使用情况。
 */
export function entityReferenceUsage(
    root: string,
    kind: "character" | "scene",
    id: string,
    assetId: string,
    form?: string,
): EntityReferenceUsage {
    // 使用情况
    let entity = false;
    // 资产绑定
    let asset = false;
    for (const meta of listEpisodeMetas(root)) {
        // 分镜文件
        const shots = loadEpisodeShots(root, meta.id);
        if (shots === null) continue;
        for (const shot of shots.shots) {
            if (!entity && shotUsesEntity(shot, kind, id)) entity = true;
            if (!asset && shotBindsAsset(shot, kind, id, assetId, form)) asset = true;
            if (entity && asset) return { entity, asset };
        }
    }
    return { entity, asset };
}
