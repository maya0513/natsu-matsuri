import { describe, expect, it } from "vitest";
import { getPixel } from "../pixel.ts";
import { HELD_FRAME_H, HELD_FRAME_W, HELD_ORDER, drawHeldItemsSheet } from "./heldItems.ts";

const frameHasPixels = (sheet: ReturnType<typeof drawHeldItemsSheet>, col: number): boolean => {
  for (let y = 0; y < HELD_FRAME_H; y++) {
    for (let x = 0; x < HELD_FRAME_W; x++) {
      if ((getPixel(sheet, col * HELD_FRAME_W + x, y) & 0xff) !== 0) return true;
    }
  }
  return false;
};

describe("drawHeldItemsSheet", () => {
  const sheet = drawHeldItemsSheet();

  it("シートの寸法 = フレーム × 品数", () => {
    expect(sheet.width).toBe(HELD_FRAME_W * HELD_ORDER.length);
    expect(sheet.height).toBe(HELD_FRAME_H);
  });

  it("全フレームに不透明ピクセルがある", () => {
    HELD_ORDER.forEach((held, col) => {
      expect(frameHasPixels(sheet, col), held).toBe(true);
    });
  });
});
