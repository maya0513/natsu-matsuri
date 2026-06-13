// 手に持って歩くもの（食べ物＋景品）のスプライトシート。
// 10x10 で作画 → 2 倍拡大で 20x20。並びは src/game/types.ts の CarriedId と一致させる。
import { PAL } from "../palette.ts";
import { type PixelCanvas, blit, createCanvas, fillRect, setPixel } from "../pixel.ts";

export const HELD_FRAME_W = 10;
export const HELD_FRAME_H = 10;

/** CarriedId（食べ物4＋景品4）と同じ並び */
export const HELD_ORDER = [
  "takoyaki",
  "ramune",
  "ringoame",
  "wataame",
  "goldfish",
  "yoyo-balloon",
  "shateki-prize",
  "omamori",
] as const;

type Held = (typeof HELD_ORDER)[number];

/** 角を透明にして丸みを出す */
const round = (c: PixelCanvas, corners: readonly (readonly [number, number])[]): void => {
  for (const [x, y] of corners) setPixel(c, x, y, 0x00000000);
};

const drawHeld = (held: Held): PixelCanvas => {
  const c = createCanvas(HELD_FRAME_W, HELD_FRAME_H);
  switch (held) {
    case "takoyaki": {
      // 舟皿に乗ったたこ焼き 3 個
      fillRect(c, 0, 6, 10, 2, PAL.woodLight);
      setPixel(c, 0, 6, PAL.lanternGlow);
      for (const dx of [0, 3, 6]) {
        fillRect(c, dx + 1, 3, 3, 3, PAL.takoyakiBall);
        setPixel(c, dx + 1, 3, PAL.lanternGlow);
        setPixel(c, dx + 2, 4, PAL.sauceDark);
        setPixel(c, dx + 3, 3, PAL.aonori);
      }
      break;
    }
    case "ramune": {
      // ラムネ瓶
      fillRect(c, 4, 0, 2, 1, PAL.ramuneCap);
      fillRect(c, 4, 1, 2, 2, PAL.ramuneGlass);
      fillRect(c, 3, 3, 4, 6, PAL.ramuneGlass);
      fillRect(c, 6, 3, 1, 6, PAL.ramuneCap);
      fillRect(c, 3, 3, 1, 5, PAL.ramuneGlassHi);
      setPixel(c, 4, 4, PAL.collar);
      round(c, [
        [3, 8],
        [6, 8],
      ]);
      break;
    }
    case "ringoame": {
      // 棒付きりんご飴
      fillRect(c, 4, 6, 1, 4, PAL.woodLight);
      fillRect(c, 2, 1, 6, 6, PAL.candyApple);
      setPixel(c, 3, 2, PAL.candyAppleHi);
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
      fillRect(c, 4, 6, 1, 4, PAL.woodLight);
      fillRect(c, 2, 1, 6, 5, PAL.wataamePink);
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
    case "goldfish": {
      // 水の入った袋に金魚
      fillRect(c, 2, 2, 6, 7, PAL.ramuneGlass); // 水
      fillRect(c, 2, 2, 1, 5, PAL.ramuneGlassHi); // 左ハイライト
      fillRect(c, 3, 0, 4, 2, PAL.collar); // 結んだ口
      setPixel(c, 4, 0, PAL.candyApple); // 結び目
      setPixel(c, 5, 0, PAL.candyApple);
      fillRect(c, 4, 4, 3, 2, PAL.goldfish); // 金魚の体
      setPixel(c, 3, 4, PAL.goldfish); // 尾
      setPixel(c, 3, 5, PAL.goldfish);
      setPixel(c, 6, 4, PAL.eye); // 目
      round(c, [
        [2, 2],
        [7, 2],
        [2, 8],
        [7, 8],
      ]);
      break;
    }
    case "yoyo-balloon": {
      // 水風船（ヨーヨー）
      fillRect(c, 2, 3, 6, 6, PAL.balloonRed);
      setPixel(c, 3, 4, PAL.wataameLight); // 照り
      setPixel(c, 4, 4, PAL.wataameLight);
      // ゴム輪
      setPixel(c, 4, 1, PAL.obi);
      setPixel(c, 5, 1, PAL.obi);
      setPixel(c, 4, 2, PAL.obi);
      setPixel(c, 5, 2, PAL.obi);
      round(c, [
        [2, 3],
        [7, 3],
        [2, 8],
        [7, 8],
      ]);
      break;
    }
    case "shateki-prize": {
      // リボン付きの景品箱
      fillRect(c, 2, 4, 6, 5, PAL.kujiBox); // 箱
      fillRect(c, 1, 3, 8, 2, PAL.kujiBox); // ふた
      round(c, [
        [1, 3],
        [8, 3],
      ]);
      fillRect(c, 4, 3, 2, 6, PAL.obi); // 縦リボン
      setPixel(c, 4, 2, PAL.obi); // 結び
      setPixel(c, 5, 2, PAL.obi);
      setPixel(c, 3, 2, PAL.obiShade);
      setPixel(c, 6, 2, PAL.obiShade);
      break;
    }
    case "omamori": {
      // お守り袋
      fillRect(c, 3, 2, 4, 7, PAL.vermillion); // 本体
      fillRect(c, 3, 2, 1, 7, PAL.vermillionDark); // 陰
      fillRect(c, 4, 2, 2, 1, PAL.obi); // 上縁（金）
      fillRect(c, 4, 4, 1, 4, PAL.obi); // 中央の金筋
      setPixel(c, 4, 0, PAL.obi); // 紐
      setPixel(c, 5, 0, PAL.obi);
      setPixel(c, 4, 1, PAL.obiShade);
      setPixel(c, 5, 1, PAL.obiShade);
      round(c, [
        [3, 2],
        [6, 2],
        [3, 8],
        [6, 8],
      ]);
      break;
    }
  }
  return c;
};

export const drawHeldItemsSheet = (): PixelCanvas => {
  const sheet = createCanvas(HELD_FRAME_W * HELD_ORDER.length, HELD_FRAME_H);
  HELD_ORDER.forEach((held, i) => {
    blit(sheet, drawHeld(held), i * HELD_FRAME_W, 0);
  });
  return sheet;
};
