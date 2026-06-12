import { describe, expect, it } from "vitest";
import { blit, createCanvas, fillRect, getPixel, mirrorX, setPixel, upscale } from "./pixel.ts";

describe("PixelCanvas", () => {
  it("createCanvas は全透明で初期化される", () => {
    const c = createCanvas(4, 4);
    expect(getPixel(c, 0, 0)).toBe(0x00000000);
  });

  it("setPixel/getPixel が 0xRRGGBBAA で往復する", () => {
    const c = createCanvas(4, 4);
    setPixel(c, 1, 2, 0xff8800ff);
    expect(getPixel(c, 1, 2)).toBe(0xff8800ff);
  });

  it("範囲外の setPixel は無視される（例外なし）", () => {
    const c = createCanvas(2, 2);
    expect(() => setPixel(c, -1, 5, 0xffffffff)).not.toThrow();
  });

  it("fillRect が矩形を塗る", () => {
    const c = createCanvas(4, 4);
    fillRect(c, 1, 1, 2, 2, 0x112233ff);
    expect(getPixel(c, 1, 1)).toBe(0x112233ff);
    expect(getPixel(c, 2, 2)).toBe(0x112233ff);
    expect(getPixel(c, 0, 0)).toBe(0);
    expect(getPixel(c, 3, 3)).toBe(0);
  });

  it("mirrorX が左右反転コピーを返す", () => {
    const c = createCanvas(3, 1);
    setPixel(c, 0, 0, 0xff0000ff);
    const m = mirrorX(c);
    expect(getPixel(m, 2, 0)).toBe(0xff0000ff);
    expect(getPixel(m, 0, 0)).toBe(0);
  });

  it("blit が透明ピクセルを上書きしない", () => {
    const dst = createCanvas(2, 1);
    fillRect(dst, 0, 0, 2, 1, 0x0000ffff);
    const src = createCanvas(2, 1);
    setPixel(src, 0, 0, 0xff0000ff); // (1,0) は透明のまま
    blit(dst, src, 0, 0);
    expect(getPixel(dst, 0, 0)).toBe(0xff0000ff);
    expect(getPixel(dst, 1, 0)).toBe(0x0000ffff);
  });

  it("upscale が整数倍に拡大する（ニアレスト）", () => {
    const c = createCanvas(2, 1);
    setPixel(c, 1, 0, 0xffffffff);
    const u = upscale(c, 2);
    expect(u.width).toBe(4);
    expect(u.height).toBe(2);
    expect(getPixel(u, 2, 0)).toBe(0xffffffff);
    expect(getPixel(u, 3, 1)).toBe(0xffffffff);
    expect(getPixel(u, 0, 0)).toBe(0);
  });

  it("rgba バッファが行優先 RGBA で取り出せる", () => {
    const c = createCanvas(1, 1);
    setPixel(c, 0, 0, 0x12345678);
    expect([...c.data]).toEqual([0x12, 0x34, 0x56, 0x78]);
  });
});
