// 鳥居・神社・提灯・鎮守の杜。作画解像度はすべて 2 倍拡大前
import { PAL } from "../palette.ts";
import { type PixelCanvas, createCanvas, fillRect, setPixel } from "../pixel.ts";

/** 楕円を 1 行ずつ塗る（横半径 rx・縦半径 ry、中心 cx,cy） */
const fillEllipse = (
  c: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
): void => {
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const dy = (y - cy) / ry;
    const hw = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    fillRect(c, Math.round(cx - hw), y, Math.round(hw * 2), 1, color);
  }
};

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

export const SHRINE_W = 104;
export const SHRINE_H = 72;

/** 2px 厚の直線（ドット） */
const line2 = (c: PixelCanvas, x0: number, y0: number, x1: number, y1: number, color: number): void => {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    setPixel(c, x, y, color);
    setPixel(c, x + 1, y, color);
  }
};

/**
 * 神社の拝殿（正面）。大きな切妻屋根に千木・鰹木、破風と懸魚、朱の柱と白壁、
 * 暖色に灯る御扉、注連縄＋紙垂、階段と賽銭箱。夜の社らしい荘厳な正面。
 */
export const drawShrine = (): PixelCanvas => {
  const c = createCanvas(SHRINE_W, SHRINE_H);
  const cx = SHRINE_W / 2; // 52
  const bodyY0 = 33;
  const bodyY1 = 60;

  // ===== 社殿本体（屋根を後から上に重ねる）=====
  fillRect(c, 12, bodyY0, 80, bodyY1 - bodyY0, PAL.woodDark);
  // 朱の柱
  for (const x of [13, 28, 75, 90]) {
    fillRect(c, x, bodyY0, 5, bodyY1 - bodyY0, PAL.vermillion);
    fillRect(c, x, bodyY0, 1, bodyY1 - bodyY0, PAL.vermillionDark); // 陰
  }
  // 白壁（柱の間）
  fillRect(c, 33, bodyY0 + 3, 15, bodyY1 - bodyY0 - 6, PAL.collar);
  fillRect(c, 56, bodyY0 + 3, 15, bodyY1 - bodyY0 - 6, PAL.collar);
  // 中央の御扉（暖色に発光）
  fillRect(c, cx - 8, bodyY0 + 1, 16, bodyY1 - bodyY0 - 2, PAL.warmWindow);
  fillRect(c, cx - 6, bodyY0 + 3, 12, bodyY1 - bodyY0 - 6, PAL.lanternGlow);
  fillRect(c, cx - 1, bodyY0 + 1, 2, bodyY1 - bodyY0 - 2, PAL.vermillionDark); // 観音開きの合わせ目
  // 縁・高欄（前面の手すり）
  fillRect(c, 10, bodyY0 - 1, 84, 2, PAL.wood);
  for (let x = 12; x < 94; x += 6) setPixel(c, x, bodyY0 + 1, PAL.woodDark); // 親柱
  fillRect(c, 12, bodyY1 - 2, 80, 1, PAL.woodDark); // 床の陰

  // ===== 階段（向拝の下、末広がり）=====
  for (let s = 0; s < 5; s++) {
    const y = bodyY1 + s;
    const w = 22 + s * 4;
    fillRect(c, Math.round(cx - w / 2), y, w, 1, s % 2 === 0 ? PAL.stoneLight : PAL.stoneDark);
  }
  // 賽銭箱
  fillRect(c, cx - 9, bodyY1 + 5, 18, 6, PAL.woodDark);
  fillRect(c, cx - 8, bodyY1 + 6, 16, 1, PAL.wood);
  for (let x = cx - 7; x < cx + 8; x += 3) fillRect(c, x, bodyY1 + 7, 1, 3, PAL.wood); // 格子

  // ===== 大きな切妻屋根 =====
  const apexY = 9;
  const eaveY = 33;
  for (let y = apexY; y <= eaveY; y++) {
    const t = (y - apexY) / (eaveY - apexY);
    const hw = Math.round(3 + t * 45); // 棟は細く、軒で大きく広がる
    fillRect(c, cx - hw, y, hw * 2, 1, t < 0.45 ? PAL.roofLight : PAL.roofDark);
    // 破風（妻側の傾斜板）
    fillRect(c, cx - hw - 1, y, 2, 1, PAL.woodLight);
    fillRect(c, cx + hw - 1, y, 2, 1, PAL.woodLight);
  }
  // 深い軒先と反り
  fillRect(c, 2, eaveY, 100, 3, PAL.roofDark);
  fillRect(c, 0, eaveY + 3, SHRINE_W, 1, PAL.roofLight);
  fillRect(c, 0, eaveY + 1, 5, 2, PAL.roofLight); // 左の反り上がり
  fillRect(c, SHRINE_W - 5, eaveY + 1, 5, 2, PAL.roofLight);
  fillRect(c, cx - 5, apexY, 10, 1, PAL.roofLight); // 棟

  // 懸魚（破風の飾り）
  fillRect(c, cx - 2, 15, 4, 5, PAL.woodLight);
  setPixel(c, cx, 18, PAL.obi);

  // 千木（交差して棟上に突き出す）
  line2(c, cx - 8, 0, cx + 1, 11, PAL.woodLight);
  line2(c, cx + 7, 0, cx - 2, 11, PAL.woodLight);
  // 鰹木（棟の上の横木 3 本）
  for (let k = 0; k < 3; k++) {
    fillRect(c, cx - 3, 3 + k * 3, 6, 2, PAL.obi);
    fillRect(c, cx - 3, 4 + k * 3, 6, 1, PAL.obiShade);
  }

  // ===== 注連縄 ＋ 紙垂（御扉の上）=====
  const ropeY = bodyY0 + 1;
  fillRect(c, cx - 14, ropeY, 28, 2, PAL.shimenawa);
  fillRect(c, cx - 14, ropeY + 1, 28, 1, PAL.shimenawaShade);
  for (const sx of [cx - 10, cx, cx + 10]) {
    setPixel(c, sx, ropeY + 2, PAL.shide);
    fillRect(c, sx - 1, ropeY + 3, 2, 1, PAL.shide);
    setPixel(c, sx + 1, ropeY + 4, PAL.shide);
    fillRect(c, sx - 1, ropeY + 5, 2, 1, PAL.shide);
  }

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

export const SHINBOKU_W = 88;
export const SHINBOKU_H = 112;

/**
 * ご神木。注連縄を巻いた、横に大きく枝を張った古木。
 * 森の木（細い円錐/小さな丸）とは別物の、板根のある太い幹＋非対称に広がる樹冠で「依代」の風格を出す。
 */
export const drawShinboku = (): PixelCanvas => {
  const c = createCanvas(SHINBOKU_W, SHINBOKU_H);
  const cx = SHINBOKU_W / 2; // 44

  // 幹（太い）と板根
  fillRect(c, 36, 62, 16, 48, PAL.treeTrunk);
  fillRect(c, 29, 102, 9, 10, PAL.treeTrunk); // 左板根
  fillRect(c, 50, 102, 9, 10, PAL.treeTrunk); // 右板根
  fillRect(c, 33, 106, 6, 6, PAL.treeTrunk);
  fillRect(c, 49, 106, 6, 6, PAL.treeTrunk);
  fillRect(c, 36, 62, 2, 48, PAL.treeEdge); // 月明かりの当たる左肌
  for (const bx of [41, 46]) fillRect(c, bx, 64, 1, 44, PAL.woodDark); // 木肌の縦筋

  // 太い枝（左右へ大きく張り出す）
  line2(c, cx, 70, 16, 42, PAL.treeTrunk);
  line2(c, cx, 66, 70, 40, PAL.treeTrunk);
  line2(c, cx, 64, cx, 30, PAL.treeTrunk);

  // 横長・非対称に広がる古木の樹冠（複数ローブ）
  const lobes: readonly (readonly [number, number, number, number])[] = [
    [20, 42, 20, 18],
    [44, 36, 27, 23],
    [68, 42, 20, 18],
    [32, 28, 17, 15],
    [58, 28, 17, 15],
    [44, 18, 21, 13],
  ];
  for (const [x, y, rx, ry] of lobes) fillEllipse(c, x - 1, y - 1, rx + 1, ry + 1, PAL.treeEdge); // 月明かりのリム
  for (const [x, y, rx, ry] of lobes) fillEllipse(c, x, y, rx, ry, PAL.treeMid); // 本体
  fillEllipse(c, 54, 52, 26, 17, PAL.treeDark); // 下方の陰
  fillEllipse(c, 30, 52, 18, 13, PAL.treeDark);
  fillEllipse(c, 44, 48, 22, 13, PAL.treeDark);

  // 注連縄＋紙垂（太く、房は長め）
  const ropeY = 80;
  fillRect(c, 30, ropeY, 28, 4, PAL.shimenawa);
  fillRect(c, 30, ropeY + 3, 28, 1, PAL.shimenawaShade);
  for (const sx of [36, 44, 52]) {
    setPixel(c, sx, ropeY + 4, PAL.shide);
    fillRect(c, sx - 1, ropeY + 5, 2, 1, PAL.shide);
    setPixel(c, sx + 1, ropeY + 6, PAL.shide);
    fillRect(c, sx - 1, ropeY + 7, 2, 1, PAL.shide);
    setPixel(c, sx, ropeY + 8, PAL.shide);
  }
  return c;
};

export const GHOST_W = 16;
export const GHOST_H = 24;

/** 幽霊（お化け）。三角頭巾・丸い顔・裾がゆらぐ尾。青白く半透明に描く（透過は描画側の材質で） */
export const drawGhost = (): PixelCanvas => {
  const c = createCanvas(GHOST_W, GHOST_H);
  // 三角頭巾
  fillRect(c, 7, 1, 2, 1, PAL.ghostBody);
  fillRect(c, 6, 2, 4, 1, PAL.ghostBody);
  // 頭
  fillEllipse(c, 8, 7, 5, 5, PAL.ghostBody);
  // 胴（裾に向かってゆらぐ尾）
  for (let y = 10; y < 22; y++) {
    const t = (y - 10) / 12;
    const hw = 5 - t * 1.5;
    // 裾の波打ち
    const wob = y >= 19 ? Math.round(Math.sin(y * 1.9) * 1.2) : 0;
    fillRect(c, Math.round(8 - hw) + wob, y, Math.round(hw * 2), 1, PAL.ghostBody);
  }
  // 陰（右側）
  for (let y = 8; y < 20; y++) setPixel(c, 11, y, PAL.ghostShade);
  // 目とうらめしい口
  setPixel(c, 6, 7, PAL.ghostEye);
  setPixel(c, 10, 7, PAL.ghostEye);
  setPixel(c, 8, 9, PAL.ghostShade);
  // だらりと垂らした手
  setPixel(c, 3, 12, PAL.ghostBody);
  setPixel(c, 13, 12, PAL.ghostBody);
  setPixel(c, 3, 13, PAL.ghostShade);
  setPixel(c, 13, 13, PAL.ghostShade);
  return c;
};

export const STONE_LANTERN_W = 16;
export const STONE_LANTERN_H = 30;

/** 石灯籠（春日灯籠風）。火袋に火が灯り、発光は実 PointLight を併用 */
export const drawStoneLantern = (): PixelCanvas => {
  const c = createCanvas(STONE_LANTERN_W, STONE_LANTERN_H);
  // 宝珠（頂部）
  fillRect(c, 6, 0, 4, 2, PAL.stoneLight);
  // 笠（屋根）。上段 → 軒先で広がる
  fillRect(c, 3, 2, 10, 2, PAL.stoneLight);
  fillRect(c, 1, 4, 14, 2, PAL.stoneLight);
  fillRect(c, 0, 6, 16, 2, PAL.stoneDark); // 軒の陰
  // 火袋（火が灯る箱）
  fillRect(c, 4, 8, 8, 8, PAL.stoneDark);
  fillRect(c, 6, 9, 4, 6, PAL.lanternGlow); // 窓の光
  fillRect(c, 5, 8, 1, 8, PAL.stoneLight); // 火袋の柱
  fillRect(c, 10, 8, 1, 8, PAL.stoneLight);
  // 中台
  fillRect(c, 3, 16, 10, 2, PAL.stoneLight);
  fillRect(c, 3, 17, 10, 1, PAL.stoneDark);
  // 竿（柱）
  fillRect(c, 6, 18, 4, 7, PAL.stoneDark);
  fillRect(c, 6, 18, 1, 7, PAL.stoneLight); // 左のハイライト
  // 基礎
  fillRect(c, 2, 25, 12, 3, PAL.stoneLight);
  fillRect(c, 1, 28, 14, 2, PAL.stoneDark);
  return c;
};

// 鎮守の杜: 夜の木々のシルエット。1 枚のシートに 2 種（針葉樹 / 広葉樹）を並べる。
// 外周をこのシルエットで額装すると、fog に溶けて遠景の treeline になる。
export const TREE_FRAME_W = 48;
export const TREE_FRAME_H = 96;
export const TREE_COUNT = 2;

/** 針葉樹（杉）: 段重ねの三角の葉と細い幹 */
const drawConifer = (c: PixelCanvas, ox: number): void => {
  const cx = ox + TREE_FRAME_W / 2;
  // 幹
  fillRect(c, cx - 2, 80, 4, 16, PAL.treeTrunk);
  // 葉の段（上＝細く尖り、下＝広がる）を 4 段重ねる
  const layers: readonly [number, number, number, number][] = [
    [6, 30, 3, 13],
    [22, 50, 8, 18],
    [40, 66, 13, 22],
    [56, 84, 17, 24],
  ];
  for (const [yTop, yBot, wTop, wBot] of layers) {
    for (let y = yTop; y < yBot; y++) {
      const t = (y - yTop) / (yBot - yTop);
      const hw = Math.round(wTop + (wBot - wTop) * t);
      // 本体（下ほど暗い陰）
      const body = y > yBot - 6 ? PAL.treeDark : PAL.treeMid;
      fillRect(c, cx - hw, y, hw * 2, 1, body);
      // 月明かりの淡いリム（左上の縁 1px）
      setPixel(c, cx - hw, y, PAL.treeEdge);
    }
  }
};

/** 広葉樹: 丸い樹冠と幹。月明かりのリムと右下の陰 */
const drawBroadleaf = (c: PixelCanvas, ox: number): void => {
  const cx = ox + TREE_FRAME_W / 2;
  fillRect(c, cx - 2, 64, 5, 32, PAL.treeTrunk);
  fillEllipse(c, cx - 1, 34, 23, 31, PAL.treeEdge); // リムの土台
  fillEllipse(c, cx, 36, 22, 30, PAL.treeMid); // 本体（左上に 1px リムが残る）
  fillEllipse(c, cx + 4, 44, 16, 22, PAL.treeDark); // 右下の陰
};

/** 鎮守の杜スプライトシート（針葉樹 / 広葉樹） */
export const drawTreesSheet = (): PixelCanvas => {
  const c = createCanvas(TREE_FRAME_W * TREE_COUNT, TREE_FRAME_H);
  drawConifer(c, 0);
  drawBroadleaf(c, TREE_FRAME_W);
  return c;
};
