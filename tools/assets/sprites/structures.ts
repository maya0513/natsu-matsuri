// 鳥居・神社・提灯。作画解像度はすべて 2 倍拡大前
import { PAL } from "../palette.ts";
import { type PixelCanvas, createCanvas, fillRect, setPixel } from "../pixel.ts";

export const TORII_W = 80;
export const TORII_H = 80;

/** 鳥居（明神鳥居風） */
export const drawTorii = (): PixelCanvas => {
  const c = createCanvas(TORII_W, TORII_H);

  // 笠木（最上部の反り）
  fillRect(c, 0, 8, 80, 6, PAL.vermillion);
  fillRect(c, 0, 6, 6, 2, PAL.vermillion); // 左端の反り上がり
  fillRect(c, 74, 6, 6, 2, PAL.vermillion);
  fillRect(c, 0, 13, 80, 1, PAL.vermillionDark);
  // 島木
  fillRect(c, 4, 14, 72, 4, PAL.vermillionDark);

  // 貫（ぬき）
  fillRect(c, 2, 30, 76, 5, PAL.vermillion);
  fillRect(c, 2, 34, 76, 1, PAL.vermillionDark);
  // 額束
  fillRect(c, 36, 18, 8, 12, PAL.vermillionDark);
  fillRect(c, 37, 19, 6, 9, PAL.lanternGlow); // 額（発光気味）

  // 柱（内転び: わずかに内側へ）
  fillRect(c, 10, 14, 7, 66, PAL.vermillion);
  fillRect(c, 63, 14, 7, 66, PAL.vermillion);
  fillRect(c, 10, 14, 2, 66, PAL.vermillionDark); // 陰
  fillRect(c, 63, 14, 2, 66, PAL.vermillionDark);
  // 根巻き
  fillRect(c, 9, 74, 9, 6, PAL.roofDark);
  fillRect(c, 62, 74, 9, 6, PAL.roofDark);

  return c;
};

export const SHRINE_W = 96;
export const SHRINE_H = 64;

/** 神社の拝殿（正面）。夜のシルエット + 暖色の御簾 */
export const drawShrine = (): PixelCanvas => {
  const c = createCanvas(SHRINE_W, SHRINE_H);

  // 入母屋屋根（台形シルエット）
  for (let y = 0; y < 18; y++) {
    const inset = Math.max(0, 14 - y);
    fillRect(c, inset, y + 2, SHRINE_W - inset * 2, 1, y < 4 ? PAL.roofLight : PAL.roofDark);
  }
  // 千木風の飾り
  fillRect(c, 44, 0, 2, 4, PAL.roofLight);
  fillRect(c, 50, 0, 2, 4, PAL.roofLight);
  // 軒先
  fillRect(c, 0, 20, SHRINE_W, 2, PAL.roofLight);

  // 社殿本体
  fillRect(c, 8, 22, 80, 30, PAL.woodDark);
  // 柱
  for (const x of [8, 28, 48, 68, 84]) fillRect(c, x, 22, 4, 30, PAL.wood);
  // 入口（暖色に発光）
  fillRect(c, 38, 26, 20, 26, PAL.warmWindow);
  fillRect(c, 40, 28, 16, 24, PAL.lanternGlow);
  fillRect(c, 47, 26, 2, 26, PAL.woodDark); // 御簾の中桟
  // 賽銭箱
  fillRect(c, 40, 46, 16, 6, PAL.wood);
  fillRect(c, 41, 47, 14, 1, PAL.woodDark);

  // 石段
  fillRect(c, 30, 52, 36, 4, PAL.stoneLight);
  fillRect(c, 26, 56, 44, 4, PAL.stoneDark);
  fillRect(c, 22, 60, 52, 4, PAL.stoneLight);

  return c;
};

export const YAGURA_W = 56;
export const YAGURA_H = 80;

/** 祭りやぐら（櫓）: 紅白幕・太鼓・提灯を備えた中央の塔 */
export const drawYagura = (): PixelCanvas => {
  const c = createCanvas(YAGURA_W, YAGURA_H);
  const cxL = 8;
  const cxR = YAGURA_W - 12;

  // 4 本柱（下から上へ）
  for (const x of [cxL, cxR]) {
    fillRect(c, x, 18, 4, 60, PAL.wood);
    fillRect(c, x, 18, 1, 60, PAL.woodLight);
  }
  // 筋交い（X 字のブレース）を 2 段
  const brace = (y0: number, y1: number): void => {
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / (y1 - y0);
      setPixel(c, Math.round(cxL + 4 + (cxR - cxL - 4) * t), y, PAL.woodDark);
      setPixel(c, Math.round(cxR - (cxR - cxL - 4) * t), y, PAL.woodDark);
    }
  };
  brace(40, 76);
  brace(40, 58);

  // 中段の床
  fillRect(c, 4, 36, YAGURA_W - 8, 4, PAL.woodLight);
  fillRect(c, 4, 39, YAGURA_W - 8, 1, PAL.woodDark);

  // 上段の高欄に紅白幕（縦縞）
  for (let x = 6; x < YAGURA_W - 6; x++) {
    const red = Math.floor((x - 6) / 5) % 2 === 0;
    fillRect(c, x, 22, 1, 12, red ? PAL.awningRed : PAL.awningWhite);
  }
  fillRect(c, 4, 34, YAGURA_W - 8, 2, PAL.woodDark);

  // 屋根（入母屋風の台形）
  for (let y = 0; y < 12; y++) {
    const inset = Math.max(0, 8 - y);
    fillRect(c, inset, y + 2, YAGURA_W - inset * 2, 1, y < 3 ? PAL.roofLight : PAL.roofDark);
  }
  fillRect(c, 0, 14, YAGURA_W, 2, PAL.roofLight); // 軒先

  // 太鼓（上段中央）
  const dx = YAGURA_W / 2 - 5;
  fillRect(c, dx, 24, 10, 8, PAL.vermillion);
  fillRect(c, dx + 1, 25, 8, 6, PAL.vermillionDark);
  fillRect(c, dx, 24, 10, 1, PAL.woodLight); // 胴の縁
  fillRect(c, dx, 31, 10, 1, PAL.woodLight);

  // 軒の提灯（左右）
  for (const lx of [4, YAGURA_W - 8]) {
    fillRect(c, lx, 16, 4, 1, PAL.lanternCap);
    fillRect(c, lx, 17, 4, 5, PAL.lanternBody);
    fillRect(c, lx + 1, 18, 2, 3, PAL.lanternGlow);
  }
  return c;
};

export const STAIRS_W = 64;
export const STAIRS_H = 40;

/** 石段（神社へ上る階段）。正面から見た段々 */
export const drawStairs = (): PixelCanvas => {
  const c = createCanvas(STAIRS_W, STAIRS_H);
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const inset = i * 5; // 上の段ほど狭い
    const y = STAIRS_H - (i + 1) * 7;
    fillRect(c, inset, y, STAIRS_W - inset * 2, 5, PAL.stoneLight);
    fillRect(c, inset, y + 5, STAIRS_W - inset * 2, 2, PAL.stoneDark);
  }
  return c;
};

export const LANTERN_W = 8;
export const LANTERN_H = 12;

/** 提灯 1 個。発光はテクスチャ + 実 PointLight の併用 */
export const drawLantern = (): PixelCanvas => {
  const c = createCanvas(LANTERN_W, LANTERN_H);
  fillRect(c, 2, 0, 4, 1, PAL.lanternCap);
  fillRect(c, 1, 1, 6, 9, PAL.lanternBody);
  fillRect(c, 2, 2, 4, 7, PAL.lanternGlow);
  // 骨のリブ
  for (let y = 2; y < 9; y += 2) setPixel(c, 4, y, PAL.lanternRib);
  fillRect(c, 2, 10, 4, 1, PAL.lanternCap);
  setPixel(c, 4, 11, PAL.lanternCap); // 房
  return c;
};
