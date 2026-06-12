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
