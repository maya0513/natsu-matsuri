// 屋台の配置と検索。参道（y 軸）の両脇に並ぶ
import type { StallId, Vec2 } from "./types";

export type StallKind = "shop" | "minigame";

export type Stall = {
  readonly id: StallId;
  readonly name: string;
  readonly kind: StallKind;
  readonly pos: Vec2;
  /** スプライトの向き（参道中央を向く）。+1 なら右向き配置 */
  readonly side: -1 | 1;
};

/** 参道: y=18(鳥居側入口) → y=-14(神社)。屋台は x=±5 に並ぶ */
export const STALLS: readonly Stall[] = [
  { id: "takoyaki", name: "たこ焼き", kind: "shop", pos: { x: -5, y: 6 }, side: -1 },
  { id: "ringoame", name: "りんご飴", kind: "shop", pos: { x: 5, y: 6 }, side: 1 },
  { id: "kingyo", name: "金魚すくい", kind: "minigame", pos: { x: -5, y: 0 }, side: -1 },
  { id: "yoyo", name: "ヨーヨー釣り", kind: "minigame", pos: { x: 5, y: 0 }, side: 1 },
  { id: "shateki", name: "射的", kind: "minigame", pos: { x: -5, y: -6 }, side: -1 },
  { id: "kuji", name: "くじ引き", kind: "minigame", pos: { x: 5, y: -6 }, side: 1 },
];

const distSq = (a: Vec2, b: Vec2): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** radius 以内で最も近い屋台。なければ undefined */
export const nearestStall = (pos: Vec2, radius: number): Stall | undefined => {
  let best: Stall | undefined;
  let bestD = radius * radius;
  for (const s of STALLS) {
    const d = distSq(pos, s.pos);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
};
