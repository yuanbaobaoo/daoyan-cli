/** 文件与哈希小工具 —— 原子写、JSON 读写、sha256、时间戳与 slug。
 *  所有持久化记录都走这里，保证 run/task 元数据确定性、可 diff。 */
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, sep } from "node:path";
import { DaoyanCliError, type ErrCode } from "./errors.mts";

/**
 * 原子写文件：先写同目录临时文件再 rename，避免半成品。
 */
export function writeFileAtomic(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  // 同目录临时文件（rename 在同一文件系统内原子）
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  try {
    writeFileSync(tmp, content);
    renameSync(tmp, file);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

/**
 * 原子写 JSON（2 空格缩进 + 末尾换行，便于 Git diff）。
 */
export function writeJsonAtomic(file: string, value: unknown): void {
  writeFileAtomic(file, JSON.stringify(value, null, 2) + "\n");
}

/**
 * 读取并解析 JSON；失败抛指定错误码。
 */
export function readJson<T>(file: string, code: ErrCode = "config_invalid"): T {
  if (!existsSync(file)) {
    throw new DaoyanCliError({ code, message: `文件不存在：${file}` });
  }
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (e) {
    throw new DaoyanCliError({
      code,
      message: `${file} 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

/**
 * 读取 JSON；文件不存在返回 null。
 */
export function readJsonIfExists<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  return readJson<T>(file);
}

/**
 * 字符串 sha256（十六进制）。
 */
export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * 文件 sha256（十六进制）。
 */
export function sha256File(file: string): string {
  return sha256(readFileSync(file));
}

/**
 * 短哈希（8 位），用于 id 与展示。
 */
export function shortHash(data: string, len = 4): string {
  return sha256(data).slice(0, len);
}

/**
 * 稳定 JSON 序列化：对象 key 递归排序，用于计算 graph_sha256。
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

/**
 * 递归排序对象 key（数组保持顺序）。
 */
function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    // 输入对象的宽松视图
    const o = value as Record<string, unknown>;
    // 已排序的输出对象
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) out[k] = sortValue(o[k]);
    return out;
  }
  return value;
}

/**
 * 把任意字符串变成适合文件名/id 的 slug。
 */
export function slugify(input: string, fallback = "machine"): string {
  // 仅保留字母数字与 -_
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s === "" ? fallback : s.slice(0, 24);
}

/**
 * 生成 id 时间戳：YYYYMMDDTHHmmss（UTC）。
 */
export function idTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "");
}

/**
 * 生成随机短后缀（4 位十六进制）。
 */
export function randomSuffix(len = 4): string {
  return randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}

/**
 * 当前 ISO 时间。
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 生成 run/task id 的公共时间戳部分。
 */
export function makeId(machineId: string, date = new Date()): string {
  return `${idTimestamp(date)}-${slugify(machineId)}-${randomSuffix(4)}`;
}

/**
 * 项目内相对路径（unix 分隔符），拒绝绝对路径写入记录。
 */
export function toPosixRelative(root: string, file: string): string {
  // resolve 后的相对路径
  let rel = file;
  if (file.startsWith(root + sep) || file === root) rel = file.slice(root.length + 1);
  return rel.split(sep).join("/");
}

/**
 * 确保目录存在。
 */
export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/**
 * 判断字符串是否像 URL。
 */
export function isHttpUrl(v: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(v);
}
