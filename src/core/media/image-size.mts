/** 读取图片尺寸 —— 只解析 PNG / JPEG / WebP 头，不引入图像库。 */

/**
 * 图片尺寸。
 */
export interface ImageSize {
    /**
     * 宽度。
     */
    width: number;
    /**
     * 高度。
     */
    height: number;
}

/**
 * ASCII 片段。
 */
function ascii(bytes: Uint8Array, start: number, end: number): string {
    return Buffer.from(bytes.slice(start, end)).toString("ascii");
}

/**
 * PNG 尺寸（IHDR）。
 */
function pngSize(bytes: Uint8Array): ImageSize | null {
    if (bytes.length < 24) return null;
    if (bytes[0] !== 0x89 || ascii(bytes, 1, 4) !== "PNG") return null;
    return {
        width: (bytes[16] ?? 0) * 0x1000000 + (bytes[17] ?? 0) * 0x10000 + (bytes[18] ?? 0) * 0x100 + (bytes[19] ?? 0),
        height: (bytes[20] ?? 0) * 0x1000000 + (bytes[21] ?? 0) * 0x10000 + (bytes[22] ?? 0) * 0x100 + (bytes[23] ?? 0),
    };
}

/**
 * JPEG 尺寸（SOF 段）。
 */
function jpegSize(bytes: Uint8Array): ImageSize | null {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            offset++;
            continue;
        }
        // 标记
        const marker = bytes[offset + 1] ?? 0;
        // 无长度的标记
        if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
            offset += 2;
            continue;
        }
        // 段长度
        const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
        if (length < 2) return null;
        // SOF0-3 / 5-7 / 9-11 / 13-15
        const isSof =
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf);
        if (isSof) {
            return {
                height: ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0),
                width: ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0),
            };
        }
        offset += 2 + length;
    }
    return null;
}

/**
 * WebP 尺寸（VP8X / VP8 / VP8L）。
 */
function webpSize(bytes: Uint8Array): ImageSize | null {
    if (bytes.length < 30) return null;
    if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") return null;
    // chunk 类型
    const kind = ascii(bytes, 12, 16);
    if (kind === "VP8X") {
        return {
            width: 1 + ((bytes[24] ?? 0) | ((bytes[25] ?? 0) << 8) | ((bytes[26] ?? 0) << 16)),
            height: 1 + ((bytes[27] ?? 0) | ((bytes[28] ?? 0) << 8) | ((bytes[29] ?? 0) << 16)),
        };
    }
    if (kind === "VP8 ") {
        // 起始码
        if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
        return {
            width: ((bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8)) & 0x3fff,
            height: ((bytes[28] ?? 0) | ((bytes[29] ?? 0) << 8)) & 0x3fff,
        };
    }
    if (kind === "VP8L") {
        if (bytes[20] !== 0x2f) return null;
        // 位流
        const bits = (bytes[21] ?? 0) | ((bytes[22] ?? 0) << 8) | ((bytes[23] ?? 0) << 16) | ((bytes[24] ?? 0) << 24);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
}

/**
 * 读取图片尺寸；不支持的格式返回 null。
 */
export function imageSizeOf(bytes: Uint8Array): ImageSize | null {
    return pngSize(bytes) ?? jpegSize(bytes) ?? webpSize(bytes);
}
