import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { encodePng } from "./png.ts";

/** PNG チャンクを { type, data } の列にパースする検証用ヘルパー */
const parseChunks = (png: Uint8Array) => {
  const chunks: { type: string; data: Uint8Array }[] = [];
  let off = 8; // signature
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (off < png.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(...png.subarray(off + 4, off + 8));
    chunks.push({ type, data: png.subarray(off + 8, off + 8 + len) });
    off += 12 + len; // len + type + data + crc
  }
  return chunks;
};

describe("encodePng", () => {
  // 2x1 RGBA: 赤(不透明), 緑(半透明)
  const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128]);

  it("PNG シグネチャで始まる", () => {
    const png = encodePng(2, 1, rgba);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("IHDR に幅・高さ・RGBA8 が入る", () => {
    const png = encodePng(2, 1, rgba);
    const ihdr = parseChunks(png).find((c) => c.type === "IHDR");
    if (!ihdr) throw new Error("IHDR がない");
    const v = new DataView(ihdr.data.buffer, ihdr.data.byteOffset);
    expect(v.getUint32(0)).toBe(2); // width
    expect(v.getUint32(4)).toBe(1); // height
    expect(ihdr.data[8]).toBe(8); // bit depth
    expect(ihdr.data[9]).toBe(6); // color type RGBA
  });

  it("IDAT を inflate すると filter byte 0 + 元ピクセルになる", () => {
    const png = encodePng(2, 1, rgba);
    const idat = parseChunks(png).find((c) => c.type === "IDAT");
    if (!idat) throw new Error("IDAT がない");
    const raw = inflateSync(idat.data);
    expect([...raw]).toEqual([0, ...rgba]);
  });

  it("IEND で終わる", () => {
    const png = encodePng(2, 1, rgba);
    const chunks = parseChunks(png);
    expect(chunks.at(-1)?.type).toBe("IEND");
  });

  it("ピクセル数が合わないと例外", () => {
    expect(() => encodePng(2, 2, rgba)).toThrow();
  });
});
