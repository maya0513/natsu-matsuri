import { describe, expect, it } from "vitest";
import { getPixel } from "../pixel.ts";
import { STALL_FRAME_H, STALL_FRAME_W, STALL_ORDER, drawStallSheet } from "./stalls.ts";

describe("drawStallSheet", () => {
  const sheet = drawStallSheet();

  it("シート寸法 = フレーム幅 × 屋台数", () => {
    expect(sheet.width).toBe(STALL_FRAME_W * STALL_ORDER.length);
    expect(sheet.height).toBe(STALL_FRAME_H);
  });

  it("屋台の並びは StallId 6 種", () => {
    expect(STALL_ORDER).toEqual(["takoyaki", "ringoame", "kingyo", "shateki", "yoyo", "kuji"]);
  });

  it("各屋台のセルは互いに異なる絵（看板アイコンで区別）", () => {
    const cell = (i: number): string => {
      const px: number[] = [];
      for (let y = 0; y < STALL_FRAME_H; y++) {
        for (let x = 0; x < STALL_FRAME_W; x++) {
          px.push(getPixel(sheet, i * STALL_FRAME_W + x, y));
        }
      }
      return px.join(",");
    };
    const cells = STALL_ORDER.map((_, i) => cell(i));
    expect(new Set(cells).size).toBe(STALL_ORDER.length);
  });
});
