// 床タイル（16x16 作画 → 32x32）。シームレスに並ぶこと
import { PAL } from "../palette.ts";
import { type PixelCanvas, createCanvas, fillRect, setPixel } from "../pixel.ts";

export const TILE_SIZE = 16;

/** 決定的な疑似乱数（タイルの再生成可能性のため Math.random は使わない） */
const hash = (x: number, y: number, seed: number): number => {
  let h = (x * 374761393 + y * 668265263 + seed * 0x9e3779b9) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
};

/** 参道の石畳タイル */
export const drawPathTile = (): PixelCanvas => {
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  fillRect(c, 0, 0, TILE_SIZE, TILE_SIZE, PAL.stoneGap);
  // 2 段ずらしの石組み（8x4 の石）
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : 4;
    for (let col = -1; col < 3; col++) {
      const sx = col * 8 + offset;
      const sy = row * 4;
      const tone = hash(col + 7, row, 1) > 0.5 ? PAL.stoneLight : PAL.stoneDark;
      fillRect(c, sx + 1, sy + 1, 6, 2, tone);
    }
  }
  return c;
};

/** 境内の地面タイル（踏み固められた土） */
export const drawGroundTile = (): PixelCanvas => {
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  fillRect(c, 0, 0, TILE_SIZE, TILE_SIZE, PAL.groundDark);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const r = hash(x, y, 2);
      if (r > 0.93) setPixel(c, x, y, PAL.groundLight);
      else if (r < 0.04) setPixel(c, x, y, PAL.stoneGap);
    }
  }
  return c;
};
