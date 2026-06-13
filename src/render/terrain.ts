// 地形の高低差プロファイル（描画層のみの関心）。
// ゲームロジックは XZ 距離・境界しか見ないので、ここで導出した高さは描画でのみ加算する。
// 高さは x の断面だけで決まる: 右＝祭り会場の台地、左＝一段低い河川敷、間を石段でつなぐ。

/** 祭り会場（台地）の高さ */
export const PLATEAU_Y = 0;
/** 河川敷の高さ（台地より一段低い） */
export const BANK_Y = -1.6;
/** 石段帯の右端（これ以上右は台地） */
export const STAIR_TOP_X = -6;
/** 石段帯の左端（これ以上左は河川敷） */
export const STAIR_BOT_X = -8;
/** 石段の段数 */
export const STAIR_STEPS = 4;

/**
 * x 位置の地面の高さを返す純粋関数。
 * - x >= STAIR_TOP_X: 台地（0）
 * - x <  STAIR_BOT_X: 河川敷（BANK_Y）
 * - その間: 台地から河川敷へ段々に降下する石段
 */
export const groundHeightAt = (x: number): number => {
  if (x >= STAIR_TOP_X) return PLATEAU_Y;
  if (x < STAIR_BOT_X) return BANK_Y;
  // 石段帯: 右(=0)から左(=STAIR_STEPS)へ進むほど下の段になる
  const t = (STAIR_TOP_X - x) / (STAIR_TOP_X - STAIR_BOT_X); // (0, 1]
  const step = Math.ceil(t * STAIR_STEPS); // 1..STAIR_STEPS
  return (BANK_Y * step) / STAIR_STEPS;
};
