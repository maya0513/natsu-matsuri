import { describe, expect, it } from "vitest";
import { getPixel } from "../pixel.ts";
import { FOOD_FRAME_H, FOOD_FRAME_W, FOOD_ORDER, drawFoodSheet } from "./food.ts";

const frameHasPixels = (
  sheet: ReturnType<typeof drawFoodSheet>,
  col: number,
): boolean => {
  for (let y = 0; y < FOOD_FRAME_H; y++) {
    for (let x = 0; x < FOOD_FRAME_W; x++) {
      if ((getPixel(sheet, col * FOOD_FRAME_W + x, y) & 0xff) !== 0) return true;
    }
  }
  return false;
};

describe("drawFoodSheet", () => {
  const sheet = drawFoodSheet();

  it("シートの寸法 = フレーム × 食べ物数", () => {
    expect(sheet.width).toBe(FOOD_FRAME_W * FOOD_ORDER.length);
    expect(sheet.height).toBe(FOOD_FRAME_H);
  });

  it("全フレームに不透明ピクセルがある", () => {
    FOOD_ORDER.forEach((food, col) => {
      expect(frameHasPixels(sheet, col), food).toBe(true);
    });
  });
});
