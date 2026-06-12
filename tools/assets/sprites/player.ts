// 浴衣キャラのスプライトシート生成。
// 16x24 で作画し、generate.ts 側で 2 倍に拡大して 32x48（キャラ 32px 基準）にする。
import { PAL } from "../palette.ts";
import { type PixelCanvas, blit, createCanvas, fillRect, mirrorX, setPixel } from "../pixel.ts";

/** 作画解像度（拡大前） */
export const PLAYER_FRAME_W = 16;
export const PLAYER_FRAME_H = 24;
/** 列 = アニメフレーム（idle / walk1 / walk2） */
export const PLAYER_SHEET_COLS = 3;
/** 行 = 向き（down / up / left / right の順。types.ts の Direction と対応） */
export const PLAYER_SHEET_ROWS = 4;

export const PLAYER_ROW_OF_DIRECTION = { down: 0, up: 1, left: 2, right: 3 } as const;

type Facing = "down" | "up" | "side";

/** 1 フレーム分の浴衣キャラを描く */
const drawFrame = (facing: Facing, frame: number): PixelCanvas => {
  const c = createCanvas(PLAYER_FRAME_W, PLAYER_FRAME_H);
  // 歩行中は体が 1px 上下する
  const bob = frame === 1 ? 0 : frame === 2 ? 0 : 0;
  const step = frame; // 0: idle, 1: 左足前, 2: 右足前

  // --- 頭（y: 0..7） ---
  // 髪のお団子
  fillRect(c, 6, 0 + bob, 4, 2, PAL.hair);
  setPixel(c, 7, 0 + bob, PAL.hairHi);
  // 髪のベース
  fillRect(c, 4, 2 + bob, 8, 3, PAL.hair);
  fillRect(c, 5, 2 + bob, 3, 1, PAL.hairHi);
  if (facing === "down") {
    // 顔
    fillRect(c, 5, 5 + bob, 6, 3, PAL.skin);
    fillRect(c, 4, 5 + bob, 1, 3, PAL.hair); // もみあげ
    fillRect(c, 11, 5 + bob, 1, 3, PAL.hair);
    setPixel(c, 6, 6 + bob, PAL.eye);
    setPixel(c, 9, 6 + bob, PAL.eye);
    // かんざし
    setPixel(c, 11, 1 + bob, PAL.kanzashi);
    setPixel(c, 12, 2 + bob, PAL.kanzashi);
  } else if (facing === "up") {
    // 後頭部（髪のみ）
    fillRect(c, 4, 5 + bob, 8, 3, PAL.hair);
    fillRect(c, 5, 5 + bob, 2, 1, PAL.hairHi);
  } else {
    // 横顔（左向き）
    fillRect(c, 4, 5 + bob, 4, 3, PAL.skin);
    fillRect(c, 8, 5 + bob, 4, 3, PAL.hair);
    setPixel(c, 5, 6 + bob, PAL.eye);
    setPixel(c, 10, 1 + bob, PAL.kanzashi);
  }

  // --- 胴（y: 8..14） ---
  fillRect(c, 5, 8 + bob, 6, 4, PAL.yukata);
  if (facing === "down") {
    // 衿合わせ
    setPixel(c, 7, 8 + bob, PAL.collar);
    setPixel(c, 8, 8 + bob, PAL.skin);
    setPixel(c, 8, 9 + bob, PAL.collar);
    setPixel(c, 7, 9 + bob, PAL.yukataShade);
  } else if (facing === "up") {
    fillRect(c, 5, 8 + bob, 6, 1, PAL.yukataShade);
  }
  // 袖（たもと）。歩行で前後の袖が揺れる
  const sleeveSwing = step === 0 ? 0 : step === 1 ? 1 : -1;
  fillRect(c, 3, 9 + bob, 2, 4 + (facing === "side" ? 0 : sleeveSwing), PAL.yukataShade);
  fillRect(c, 11, 9 + bob, 2, 4 - (facing === "side" ? 0 : sleeveSwing), PAL.yukataShade);
  setPixel(c, 3, 13 + bob, PAL.skin); // 手元
  setPixel(c, 12, 13 + bob, PAL.skin);

  // --- 帯（y: 12..13） ---
  fillRect(c, 5, 12 + bob, 6, 2, PAL.obi);
  setPixel(c, 5, 13 + bob, PAL.obiShade);
  if (facing === "up") {
    // 帯結び（後ろ姿のリボン）
    fillRect(c, 6, 12 + bob, 4, 3, PAL.obiShade);
    fillRect(c, 7, 12 + bob, 2, 2, PAL.obi);
  }

  // --- 裾（y: 14..20）。下に向かって少し広がる ---
  fillRect(c, 5, 14 + bob, 6, 3, PAL.yukata);
  fillRect(c, 4, 17 + bob, 8, 4, PAL.yukata);
  fillRect(c, 4, 20 + bob, 8, 1, PAL.yukataShade);
  // 朝顔風の柄ドット
  for (const [dx, dy] of [
    [6, 15],
    [9, 16],
    [5, 18],
    [8, 19],
    [10, 18],
  ] as const) {
    setPixel(c, dx, dy + bob, PAL.yukataDot);
  }

  // --- 足元（y: 21..23）。下駄 + 素足、歩行で交互に出る ---
  const leftY = step === 1 ? 21 : 22;
  const rightY = step === 2 ? 21 : 22;
  if (facing === "side") {
    // 横向きは前後に並ぶ
    const frontX = step === 1 ? 5 : step === 2 ? 7 : 6;
    fillRect(c, frontX, 21, 2, 2, PAL.skin);
    fillRect(c, frontX, 23, 2, 1, PAL.geta);
    fillRect(c, 8, 22, 2, 1, PAL.skin);
    fillRect(c, 8, 23, 2, 1, PAL.geta);
  } else {
    fillRect(c, 5, leftY, 2, 23 - leftY, PAL.skin);
    fillRect(c, 5, 23, 2, 1, PAL.geta);
    fillRect(c, 9, rightY, 2, 23 - rightY, PAL.skin);
    fillRect(c, 9, 23, 2, 1, PAL.geta);
  }

  return c;
};

/** 4 方向 × 3 フレームのシートを作る。right 行は left のミラー */
export const drawPlayerSheet = (): PixelCanvas => {
  const sheet = createCanvas(
    PLAYER_FRAME_W * PLAYER_SHEET_COLS,
    PLAYER_FRAME_H * PLAYER_SHEET_ROWS,
  );
  const rows: readonly (readonly [Facing, boolean])[] = [
    ["down", false],
    ["up", false],
    ["side", false], // left
    ["side", true], // right = left のミラー
  ];
  rows.forEach(([facing, mirrored], row) => {
    for (let col = 0; col < PLAYER_SHEET_COLS; col++) {
      const frame = drawFrame(facing, col);
      blit(sheet, mirrored ? mirrorX(frame) : frame, col * PLAYER_FRAME_W, row * PLAYER_FRAME_H);
    }
  });
  return sheet;
};
