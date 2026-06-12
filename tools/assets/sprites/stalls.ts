// 屋台のスプライトシート。48x40 で作画 → 2 倍拡大で 96x80
import { PAL } from "../palette.ts";
import { type PixelCanvas, blit, createCanvas, fillRect, setPixel } from "../pixel.ts";

export const STALL_FRAME_W = 48;
export const STALL_FRAME_H = 40;

/** シート内の並び。src/game/types.ts の StallId と一致させる */
export const STALL_ORDER = ["takoyaki", "ringoame", "kingyo", "shateki", "yoyo", "kuji"] as const;

type StallKind = (typeof STALL_ORDER)[number];

/** 看板アイコン（10x10）。屋台ごとの個性はここに出す */
const drawIcon = (c: PixelCanvas, kind: StallKind, ox: number, oy: number): void => {
  switch (kind) {
    case "takoyaki": {
      // 舟に乗ったたこ焼き 3 個
      fillRect(c, ox + 1, oy + 6, 8, 2, PAL.woodLight);
      for (const dx of [1, 4, 7]) {
        fillRect(c, ox + dx, oy + 3, 2, 3, PAL.takoyakiBall);
        setPixel(c, ox + dx, oy + 3, PAL.lanternGlow); // 照り
      }
      break;
    }
    case "ringoame": {
      // 棒付きりんご飴
      fillRect(c, ox + 4, oy + 6, 1, 4, PAL.woodLight);
      fillRect(c, ox + 2, oy + 1, 5, 5, PAL.candyApple);
      setPixel(c, ox + 3, oy + 2, 0xff8aa0ff); // 飴のハイライト
      break;
    }
    case "kingyo": {
      // 水槽と金魚
      fillRect(c, ox, oy + 3, 10, 6, PAL.water);
      fillRect(c, ox + 1, oy + 3, 8, 1, PAL.waterHi);
      fillRect(c, ox + 3, oy + 5, 3, 2, PAL.goldfish);
      setPixel(c, ox + 6, oy + 5, PAL.goldfish); // 尾びれ
      break;
    }
    case "shateki": {
      // 的（同心円）
      fillRect(c, ox + 2, oy + 1, 6, 6, PAL.target);
      fillRect(c, ox + 3, oy + 2, 4, 4, PAL.targetRed);
      fillRect(c, ox + 4, oy + 3, 2, 2, PAL.target);
      fillRect(c, ox + 4, oy + 8, 2, 2, PAL.wood); // 台
      break;
    }
    case "yoyo": {
      // 水風船 3 色
      fillRect(c, ox + 1, oy + 2, 3, 3, PAL.balloonRed);
      fillRect(c, ox + 5, oy + 1, 3, 3, PAL.balloonBlue);
      fillRect(c, ox + 3, oy + 5, 3, 3, PAL.balloonYellow);
      break;
    }
    case "kuji": {
      // くじ箱と星
      fillRect(c, ox + 1, oy + 3, 8, 6, PAL.kujiBox);
      setPixel(c, ox + 4, oy + 4, PAL.lanternGlow);
      setPixel(c, ox + 5, oy + 4, PAL.lanternGlow);
      setPixel(c, ox + 3, oy + 5, PAL.lanternGlow);
      setPixel(c, ox + 6, oy + 5, PAL.lanternGlow);
      setPixel(c, ox + 4, oy + 6, PAL.lanternGlow);
      setPixel(c, ox + 5, oy + 6, PAL.lanternGlow);
      break;
    }
  }
};

/** 1 軒分の屋台を描く */
const drawStall = (kind: StallKind): PixelCanvas => {
  const c = createCanvas(STALL_FRAME_W, STALL_FRAME_H);

  // 屋根（紅白テント）。下端は波形に切る
  for (let x = 0; x < STALL_FRAME_W; x++) {
    const stripe = Math.floor(x / 6) % 2 === 0 ? PAL.awningRed : PAL.awningWhite;
    const bottom = x % 6 < 3 ? 11 : 10; // 波形
    for (let y = 0; y <= bottom; y++) setPixel(c, x, y, stripe);
  }
  // 屋根の影
  fillRect(c, 0, 12, STALL_FRAME_W, 1, PAL.roofDark);

  // 柱
  fillRect(c, 2, 12, 3, 24, PAL.wood);
  fillRect(c, 43, 12, 3, 24, PAL.wood);
  fillRect(c, 3, 12, 1, 24, PAL.woodLight);

  // カウンター
  fillRect(c, 4, 26, 40, 3, PAL.woodLight);
  fillRect(c, 4, 29, 40, 10, PAL.woodDark);
  // 前掛けの暖簾風ライン
  for (let x = 8; x < 44; x += 8) fillRect(c, x, 30, 1, 8, PAL.roofDark);

  // 軒先の提灯（左右）
  for (const lx of [8, 36]) {
    fillRect(c, lx, 14, 4, 1, PAL.lanternCap);
    fillRect(c, lx, 15, 4, 5, PAL.lanternBody);
    fillRect(c, lx + 1, 16, 2, 3, PAL.lanternGlow);
    fillRect(c, lx, 20, 4, 1, PAL.lanternCap);
  }

  // 看板アイコン（中央上）
  drawIcon(c, kind, 19, 14);

  return c;
};

export const drawStallSheet = (): PixelCanvas => {
  const sheet = createCanvas(STALL_FRAME_W * STALL_ORDER.length, STALL_FRAME_H);
  STALL_ORDER.forEach((kind, i) => {
    blit(sheet, drawStall(kind), i * STALL_FRAME_W, 0);
  });
  return sheet;
};
