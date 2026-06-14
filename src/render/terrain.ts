// 地形の高低差プロファイル（描画層）。高さの定義はゲーム層 constants の WORLD を契約として共有する。
// 河川敷（左・低）／主会場の台地（基準0）／北へ立ち上がる社の丘＋やぐらの盛り土。
// 台地⇄河川敷は z∈[stairZ0,stairZ1] の一か所の石段だけでつながる。丘・盛り土はどこでも歩いて登れる。
import { WORLD } from "../game/constants";

/** やぐら広場の盛り土（緩やかな円錐状の高まり）。中心は scene の YAGURA_POS と一致させる */
export const MOUND = { x: 26, z: 17, r: 12, h: 1.4 } as const;

/** なめらかな補間（smootherstep）。0→1 を S 字で */
const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * 台地（x>=plateauX 側）の高さ。北の社へ向かう丘と、やぐら広場の盛り土を合成する。
 * いずれもなだらかで通行可能（壁ではない）。
 */
const plateauHeight = (x: number, z: number): number => {
  // 北の社へ向かって立ち上がる丘
  let h = 0;
  if (z <= WORLD.hillTopZ) {
    h = WORLD.hillMaxH;
  } else if (z < WORLD.hillBaseZ) {
    const t = (WORLD.hillBaseZ - z) / (WORLD.hillBaseZ - WORLD.hillTopZ); // 0..1
    h = WORLD.hillMaxH * smooth(t);
  }
  // やぐら広場の盛り土
  const d = Math.hypot(x - MOUND.x, z - MOUND.z);
  if (d < MOUND.r) {
    const k = 1 - d / MOUND.r;
    h += MOUND.h * k * k;
  }
  return h;
};

/**
 * (x, z) の地面の高さを返す純粋関数。
 * - x >= plateauX: 台地（丘・盛り土を含む起伏）
 * - x <  bankX: 河川敷（bankY）
 * - その間 かつ 石段の z 範囲内: 台地の縁から河川敷へ段々に降下する石段
 * - その間 かつ 石段の外: 擁壁（通行不可。プレイヤーは来ないので便宜上 0）
 */
export const groundHeightAt = (x: number, z: number): number => {
  if (x >= WORLD.plateauX) return plateauHeight(x, z);
  if (x < WORLD.bankX) return WORLD.bankY;
  if (z < WORLD.stairZ0 || z > WORLD.stairZ1) return 0; // 擁壁
  const topH = plateauHeight(WORLD.plateauX, z); // 段の最上段＝台地の縁の高さ
  const t = (WORLD.plateauX - x) / (WORLD.plateauX - WORLD.bankX); // (0, 1]
  const step = Math.ceil(t * WORLD.stairSteps); // 1..stairSteps
  return topH + (WORLD.bankY - topH) * (step / WORLD.stairSteps);
};
