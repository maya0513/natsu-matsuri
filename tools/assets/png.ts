// 依存ゼロの最小 PNG エンコーダ（RGBA8・無圧縮フィルタ）
import { deflateSync } from "node:zlib";

const SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** PNG 仕様の CRC32（IEEE 802.3 多項式） */
const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
};

/** 行優先 RGBA バッファを PNG バイナリにエンコードする */
export const encodePng = (width: number, height: number, rgba: Uint8Array): Uint8Array => {
  if (rgba.length !== width * height * 4) {
    throw new Error(
      `ピクセル数不一致: ${width}x${height}x4 = ${width * height * 4} 必要だが ${rgba.length}`,
    );
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  // [10..12] compression/filter/interlace = 0

  // 各スキャンラインの先頭に filter byte 0 を付ける
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }

  const parts = [
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(deflateSync(raw))),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
};
