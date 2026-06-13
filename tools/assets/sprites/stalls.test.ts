import { describe, expect, it } from "vitest";
import { getPixel } from "../pixel.ts";
import { STALL_FRAME_H, STALL_FRAME_W, STALL_ORDER, drawStallSheet } from "./stalls.ts";

describe("drawStallSheet", () => {
  const sheet = drawStallSheet();

  it("シート寸法 = フレーム幅 × 屋台数", () => {
    expect(sheet.width).toBe(STALL_FRAME_W * STALL_ORDER.length);
    expect(sheet.height).toBe(STALL_FRAME_H);
  });

  it("既存のミニゲーム屋台の並びを先頭に保つ", () => {
    expect(STALL_ORDER.slice(0, 6)).toEqual([
      "takoyaki",
      "ringoame",
      "kingyo",
      "shateki",
      "yoyo",
      "kuji",
    ]);
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
