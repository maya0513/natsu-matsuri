// 手持ち食べ物のスプライトシート。10x10 で作画 → 2 倍拡大で 20x20。
// 並びは src/game/types.ts の ItemId（食べ物）と一致させる。
import { PAL } from "../palette.ts";
import { type PixelCanvas, blit, createCanvas, fillRect, setPixel } from "../pixel.ts";

export const FOOD_FRAME_W = 10;
export const FOOD_FRAME_H = 10;

export const FOOD_ORDER = ["takoyaki", "ramune", "ringoame", "wataame"] as const;

type Food = (typeof FOOD_ORDER)[number];

/** 角を透明にして丸みを出す */
const round = (c: PixelCanvas, corners: readonly (readonly [number, number])[]): void => {
  for (const [x, y] of corners) setPixel(c, x, y, 0x00000000);
};

const drawFood = (food: Food): PixelCanvas => {
  const c = createCanvas(FOOD_FRAME_W, FOOD_FRAME_H);
  switch (food) {
    case "takoyaki": {
      // 舟皿に乗ったたこ焼き 3 個
      fillRect(c, 0, 6, 10, 2, PAL.woodLight);
      setPixel(c, 0, 6, PAL.lanternGlow);
      for (const dx of [0, 3, 6]) {
        fillRect(c, dx + 1, 3, 3, 3, PAL.takoyakiBall);
        setPixel(c, dx + 1, 3, PAL.lanternGlow); // 照り
        setPixel(c, dx + 2, 4, PAL.sauceDark); // ソース
        setPixel(c, dx + 3, 3, PAL.aonori); // 青のり
      }
      break;
    }
    case "ramune": {
      // ラムネ瓶
      fillRect(c, 4, 0, 2, 1, PAL.ramuneCap); // 王冠
      fillRect(c, 4, 1, 2, 2, PAL.ramuneGlass); // 首
      fillRect(c, 3, 3, 4, 6, PAL.ramuneGlass); // 胴
      fillRect(c, 6, 3, 1, 6, PAL.ramuneCap); // 右の陰
      fillRect(c, 3, 3, 1, 5, PAL.ramuneGlassHi); // 左のハイライト
      setPixel(c, 4, 4, PAL.collar); // ビー玉
      round(c, [
        [3, 8],
        [6, 8],
      ]);
      break;
    }
    case "ringoame": {
      // 棒付きりんご飴
      fillRect(c, 4, 6, 1, 4, PAL.woodLight); // 棒
      fillRect(c, 2, 1, 6, 6, PAL.candyApple); // 飴玉
      setPixel(c, 3, 2, PAL.candyAppleHi); // 照り
      setPixel(c, 4, 2, PAL.candyAppleHi);
      round(c, [
        [2, 1],
        [7, 1],
        [2, 6],
        [7, 6],
      ]);
      break;
    }
    case "wataame": {
      // 棒付きわたあめ
      fillRect(c, 4, 6, 1, 4, PAL.woodLight); // 棒
      fillRect(c, 2, 1, 6, 5, PAL.wataamePink); // ふわふわ
      fillRect(c, 3, 1, 4, 1, PAL.wataameLight);
      setPixel(c, 3, 3, PAL.wataameLight);
      setPixel(c, 6, 2, PAL.wataameLight);
      round(c, [
        [2, 1],
        [7, 1],
        [2, 5],
        [7, 5],
      ]);
      break;
    }
  }
  return c;
};

export const drawFoodSheet = (): PixelCanvas => {
  const sheet = createCanvas(FOOD_FRAME_W * FOOD_ORDER.length, FOOD_FRAME_H);
  FOOD_ORDER.forEach((food, i) => {
    blit(sheet, drawFood(food), i * FOOD_FRAME_W, 0);
  });
  return sheet;
};
