/** 最小 PNG 编码 —— 给局部重绘生成矩形遮罩，避免引入图像库依赖。
 *  只支持 8-bit 灰度（遮罩足够），输出标准 PNG。 */
import { deflateSync } from "node:zlib";

// PNG 签名
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// 色彩类型：灰度
const COLOR_TYPE_GRAY = 0;

/**
 * CRC32 查表（PNG chunk 校验）。
 */
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

/**
 * 计算 CRC32。
 */
function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

/**
 * 组装一个 PNG chunk。
 */
function chunk(type: string, data: Buffer): Buffer {
    // 类型 + 数据
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    // 长度 + 类型 + 数据 + CRC
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
}

/**
 * 编码 8-bit 灰度 PNG。
 */
export function encodeGrayPng(width: number, height: number, pixels: Uint8Array): Uint8Array {
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
        throw new Error("PNG 尺寸必须是正整数");
    }
    if (pixels.byteLength !== width * height) {
        throw new Error(`灰度像素数量不符：${pixels.byteLength} != ${width * height}`);
    }
    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = COLOR_TYPE_GRAY;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    // 扫描线（每行前加 filter=0）
    const raw = Buffer.alloc((width + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (width + 1)] = 0;
        Buffer.from(pixels.buffer, pixels.byteOffset + y * width, width).copy(raw, y * (width + 1) + 1);
    }
    return new Uint8Array(
        Buffer.concat([
            PNG_SIGNATURE,
            chunk("IHDR", ihdr),
            chunk("IDAT", deflateSync(raw)),
            chunk("IEND", Buffer.alloc(0)),
        ]),
    );
}

/**
 * 矩形遮罩（白=重绘，黑=保留）。
 */
export function boxMaskPng(
    width: number,
    height: number,
    box: { x: number; y: number; width: number; height: number },
): Uint8Array {
    // 裁剪到画布
    const x0 = Math.max(0, Math.min(width, Math.round(box.x)));
    const y0 = Math.max(0, Math.min(height, Math.round(box.y)));
    const x1 = Math.max(0, Math.min(width, Math.round(box.x + box.width)));
    const y1 = Math.max(0, Math.min(height, Math.round(box.y + box.height)));
    // 遮罩像素
    const pixels = new Uint8Array(width * height);
    for (let y = y0; y < y1; y++) {
        pixels.fill(255, y * width + x0, y * width + x1);
    }
    return encodeGrayPng(width, height, pixels);
}
