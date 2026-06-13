// 地形の高低差プロファイル（描画層）。高さの定義はゲーム層 constants の WORLD を契約として共有する。
// 右＝祭り会場の台地、左＝一段低い河川敷。両者は z∈[stairZ0,stairZ1] の一か所の石段だけでつながる。
import { WORLD } from "../game/constants";

/**
 * (x, z) の地面の高さを返す純粋関数。
 * - x >= plateauX: 台地（0）
 * - x <  bankX: 河川敷（bankY）
 * - その間 かつ 石段の z 範囲内: 段々に降下する石段
 * - その間 かつ 石段の外: 擁壁（通行不可。プレイヤーは来ないので便宜上 0）
 */
export const groundHeightAt = (x: number, z: number): number => {
  if (x >= WORLD.plateauX) return 0;
  if (x < WORLD.bankX) return WORLD.bankY;
  if (z < WORLD.stairZ0 || z > WORLD.stairZ1) return 0; // 擁壁
  const t = (WORLD.plateauX - x) / (WORLD.plateauX - WORLD.bankX); // (0, 1]
  const step = Math.ceil(t * WORLD.stairSteps); // 1..stairSteps
  return (WORLD.bankY * step) / WORLD.stairSteps;
};
