// ミニゲーム屋台の小物スプライト（手持ち held.png より大きい 16px 作画 → 32px）。
// 泳ぐ金魚（複数デザイン）・モグラのおもちゃ・射的の景品など、寄りで見えるものを凝った絵で。
// 手持ち（持ち帰る袋・景品）は held.png 側。こちらは屋台内に置く live なオブジェクト用。
import { PAL } from "../palette.ts";
import { type PixelCanvas, blit, createCanvas, fillRect, setPixel } from "../pixel.ts";

export const MG_FRAME = 16;

/** 並びは src/assets/meta.ts の MINIGAME_SHEET.order と一致させる */
export const MINIGAME_ORDER = [
  "fish-red", // 和金（赤）
  "fish-black", // 出目金（黒・出目）
  "fish-calico", // 三色（白地に赤斑）
  "mole", // もぐら（出ている顔）
  "mole-hit", // 叩かれたもぐら（目が×）
  "prize-bear", // 景品: くまのぬいぐるみ
  "prize-ball", // 景品: スーパーボール
  "prize-top", // 景品: こま
  "prize-robot", // 景品: ロボット
  "yoyo-0", // ヨーヨー（赤）
  "yoyo-1", // ヨーヨー（青）
  "yoyo-2", // ヨーヨー（緑）
  "yoyo-3", // ヨーヨー（黄）
  "yoyo-4", // ヨーヨー（紫）
] as const;

type Mg = (typeof MINIGAME_ORDER)[number];

const EYE = PAL.eye;
const BLACK = 0x241a30ff;
const BLACK_HI = 0x3a3050ff;

/** 横向きの金魚（頭が左・尾が右）。body=胴、hi=腹の照り、fin=ひれ/尾 */
const drawFish = (c: PixelCanvas, body: number, hi: number, fin: number, demekin = false): void => {
  // 尾びれ（右）
  fillRect(c, 12, 4, 2, 3, fin);
  fillRect(c, 12, 9, 2, 3, fin);
  fillRect(c, 11, 6, 2, 4, fin);
  // 胴
  fillRect(c, 4, 6, 8, 4, body);
  fillRect(c, 5, 5, 5, 1, body);
  fillRect(c, 5, 10, 5, 1, body);
  fillRect(c, 3, 7, 1, 2, body); // 鼻先
  // 背びれ
  setPixel(c, 7, 4, fin);
  setPixel(c, 8, 4, fin);
  // 腹びれ
  setPixel(c, 7, 11, fin);
  // 腹の照り
  fillRect(c, 5, 8, 5, 1, hi);
  // 目
  if (demekin) {
    // 出目（左右に飛び出す）
    fillRect(c, 4, 6, 2, 2, BLACK_HI);
    setPixel(c, 4, 7, EYE);
  } else {
    setPixel(c, 5, 7, EYE);
  }
  // エラ線
  setPixel(c, 7, 7, hi);
};

const drawMole = (c: PixelCanvas, hit: boolean): void => {
  const fur = 0x8a6a44ff;
  const furDark = 0x6b4f30ff;
  const snout = 0xc9a878ff;
  // 体（丸み）
  fillRect(c, 4, 5, 8, 9, fur);
  fillRect(c, 5, 4, 6, 1, fur);
  fillRect(c, 4, 5, 1, 6, furDark); // 左陰
  // 角を落として丸く
  setPixel(c, 4, 4, 0x00000000);
  setPixel(c, 11, 4, 0x00000000);
  setPixel(c, 4, 13, 0x00000000);
  setPixel(c, 11, 13, 0x00000000);
  // 手（両脇）
  fillRect(c, 3, 10, 1, 2, snout);
  fillRect(c, 12, 10, 1, 2, snout);
  // 鼻面
  fillRect(c, 6, 9, 4, 3, snout);
  fillRect(c, 7, 11, 2, 1, 0xd86a6aff); // 鼻
  // 目
  if (hit) {
    // ×目（やられ）
    setPixel(c, 6, 7, EYE);
    setPixel(c, 7, 8, EYE);
    setPixel(c, 6, 8, EYE);
    setPixel(c, 7, 7, EYE);
    setPixel(c, 9, 7, EYE);
    setPixel(c, 10, 8, EYE);
    setPixel(c, 9, 8, EYE);
    setPixel(c, 10, 7, EYE);
  } else {
    fillRect(c, 6, 7, 1, 2, EYE);
    fillRect(c, 9, 7, 1, 2, EYE);
    setPixel(c, 6, 7, 0xffffffff);
    setPixel(c, 9, 7, 0xffffffff);
  }
};

const drawPrize = (c: PixelCanvas, kind: Mg): void => {
  switch (kind) {
    case "prize-bear": {
      const fur = 0xb98a52ff;
      const furDark = 0x8a6238ff;
      fillRect(c, 5, 6, 6, 6, fur); // 体
      fillRect(c, 5, 2, 6, 4, fur); // 頭
      setPixel(c, 4, 2, furDark); // 耳
      setPixel(c, 11, 2, furDark);
      setPixel(c, 4, 1, fur);
      setPixel(c, 11, 1, fur);
      fillRect(c, 6, 4, 4, 2, 0xe8d8b8ff); // 口元
      setPixel(c, 6, 3, EYE);
      setPixel(c, 9, 3, EYE);
      setPixel(c, 7, 4, EYE);
      fillRect(c, 4, 7, 1, 3, furDark); // 腕
      fillRect(c, 11, 7, 1, 3, furDark);
      break;
    }
    case "prize-ball": {
      // スーパーボール（同心の差し色）
      fillRect(c, 4, 4, 8, 8, PAL.balloonBlue);
      fillRect(c, 5, 5, 6, 6, PAL.balloonYellow);
      fillRect(c, 6, 6, 4, 4, PAL.candyApple);
      setPixel(c, 6, 6, 0xffffffff); // 照り
      setPixel(c, 4, 4, 0x00000000);
      setPixel(c, 11, 4, 0x00000000);
      setPixel(c, 4, 11, 0x00000000);
      setPixel(c, 11, 11, 0x00000000);
      break;
    }
    case "prize-top": {
      // こま（独楽）
      fillRect(c, 4, 4, 8, 3, PAL.vermillion);
      fillRect(c, 5, 7, 6, 2, PAL.balloonYellow);
      fillRect(c, 6, 9, 4, 2, PAL.vermillionDark);
      fillRect(c, 7, 11, 2, 2, PAL.woodLight); // 軸
      setPixel(c, 7, 4, 0xffffffff);
      break;
    }
    case "prize-robot": {
      // ロボット
      fillRect(c, 5, 2, 6, 4, 0x9aa6b8ff); // 頭
      setPixel(c, 6, 3, PAL.waterHi); // 目
      setPixel(c, 9, 3, PAL.waterHi);
      setPixel(c, 7, 1, PAL.candyApple); // アンテナ
      fillRect(c, 4, 6, 8, 6, 0x6b7686ff); // 胴
      fillRect(c, 6, 7, 4, 2, PAL.lanternGlow); // 胸ランプ
      fillRect(c, 3, 7, 1, 3, 0x9aa6b8ff); // 腕
      fillRect(c, 12, 7, 1, 3, 0x9aa6b8ff);
      break;
    }
    default:
      break;
  }
};

/** 水風船（ヨーヨー）: 上に輪ゴム、丸い水風船、照り。色違い */
const YOYO_COLORS: readonly (readonly [number, number])[] = [
  [0xe85d6aff, 0xffb0b8ff], // 赤
  [0x5b8fe8ff, 0xbcd6ffff], // 青
  [0x55c46aff, 0xc0f0c8ff], // 緑
  [0xe8c04aff, 0xfff0b0ff], // 黄
  [0x9a6ad8ff, 0xd8c0f8ff], // 紫
];
const drawYoyo = (c: PixelCanvas, idx: number): void => {
  const [body, hi] = YOYO_COLORS[idx] ?? YOYO_COLORS[0] ?? [0xe85d6aff, 0xffb0b8ff];
  // 輪ゴムの持ち手
  setPixel(c, 7, 0, PAL.collar);
  setPixel(c, 8, 0, PAL.collar);
  setPixel(c, 7, 1, PAL.collar);
  setPixel(c, 8, 1, PAL.collar);
  // 風船本体（丸）
  fillRect(c, 4, 4, 8, 9, body);
  fillRect(c, 5, 3, 6, 1, body);
  fillRect(c, 5, 13, 6, 1, body);
  setPixel(c, 4, 4, 0x00000000);
  setPixel(c, 11, 4, 0x00000000);
  setPixel(c, 4, 12, 0x00000000);
  setPixel(c, 11, 12, 0x00000000);
  // 照り
  fillRect(c, 5, 5, 2, 2, hi);
  setPixel(c, 6, 7, hi);
};

const drawMinigameFrame = (id: Mg): PixelCanvas => {
  const c = createCanvas(MG_FRAME, MG_FRAME);
  if (id.startsWith("yoyo-")) {
    drawYoyo(c, Number(id.slice(5)));
    return c;
  }
  switch (id) {
    case "fish-red":
      drawFish(c, PAL.goldfish, 0xffb89aff, PAL.candyApple);
      break;
    case "fish-black":
      drawFish(c, BLACK, BLACK_HI, 0x1a1226ff, true);
      break;
    case "fish-calico":
      drawFish(c, PAL.collar, 0xffffffff, PAL.goldfish);
      // 赤斑
      setPixel(c, 6, 6, PAL.candyApple);
      setPixel(c, 9, 7, PAL.candyApple);
      setPixel(c, 8, 9, PAL.candyApple);
      break;
    case "mole":
      drawMole(c, false);
      break;
    case "mole-hit":
      drawMole(c, true);
      break;
    default:
      drawPrize(c, id);
      break;
  }
  return c;
};

export const drawMinigameSheet = (): PixelCanvas => {
  const sheet = createCanvas(MG_FRAME * MINIGAME_ORDER.length, MG_FRAME);
  MINIGAME_ORDER.forEach((id, i) => {
    blit(sheet, drawMinigameFrame(id), i * MG_FRAME, 0);
  });
  return sheet;
};
