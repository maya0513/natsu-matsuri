import { describe, expect, it } from "vitest";
import { getPixel } from "../pixel.ts";
import {
  PLAYER_FRAME_H,
  PLAYER_FRAME_W,
  PLAYER_SHEET_COLS,
  PLAYER_SHEET_ROWS,
  drawPlayerSheet,
} from "./player.ts";

const frameHasPixels = (
  sheet: ReturnType<typeof drawPlayerSheet>,
  col: number,
  row: number,
): boolean => {
  for (let y = 0; y < PLAYER_FRAME_H; y++) {
    for (let x = 0; x < PLAYER_FRAME_W; x++) {
      if ((getPixel(sheet, col * PLAYER_FRAME_W + x, row * PLAYER_FRAME_H + y) & 0xff) !== 0) {
        return true;
      }
    }
  }
  return false;
};

const framePixels = (
  sheet: ReturnType<typeof drawPlayerSheet>,
  col: number,
  row: number,
): number[] => {
  const out: number[] = [];
  for (let y = 0; y < PLAYER_FRAME_H; y++) {
    for (let x = 0; x < PLAYER_FRAME_W; x++) {
      out.push(getPixel(sheet, col * PLAYER_FRAME_W + x, row * PLAYER_FRAME_H + y));
    }
  }
  return out;
};

describe("drawPlayerSheet", () => {
  const sheet = drawPlayerSheet();

  it("シートの寸法 = フレーム × 列行", () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W * PLAYER_SHEET_COLS);
    expect(sheet.height).toBe(PLAYER_FRAME_H * PLAYER_SHEET_ROWS);
  });

  it("全フレームに不透明ピクセルがある", () => {
    for (let row = 0; row < PLAYER_SHEET_ROWS; row++) {
      for (let col = 0; col < PLAYER_SHEET_COLS; col++) {
        expect(frameHasPixels(sheet, col, row), `frame(${col},${row})`).toBe(true);
      }
    }
  });

  it("歩行フレームは idle と異なる", () => {
    const idle = framePixels(sheet, 0, 0);
    const walk1 = framePixels(sheet, 1, 0);
    expect(walk1).not.toEqual(idle);
  });

  it("向きごとに絵が異なる（down と up）", () => {
    expect(framePixels(sheet, 0, 0)).not.toEqual(framePixels(sheet, 0, 1));
  });
});
