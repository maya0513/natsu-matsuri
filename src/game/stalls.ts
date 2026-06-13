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

/**
 * 屋台は蛇行する参道沿いに不規則にクラスタ配置し、一部は石段を下りた河川敷（川沿い）に並ぶ。
 * 入口(手前 y≈18) → 社(奥 y≈-17)。台地は全面歩けるので、各屋台は道のそばに散らしてある。
 * side はスプライトが道の中央側を向くよう設定（左に置くなら +1=右向き）。
 */
export const STALLS: readonly Stall[] = [
  // 入口まわりの食べ物
  { id: "yakisoba", name: "焼きそば", kind: "shop", pos: { x: -2.3, y: 15 }, side: 1 },
  { id: "potato", name: "ポテト", kind: "shop", pos: { x: 2.3, y: 16 }, side: -1 },
  { id: "takoyaki", name: "たこ焼き", kind: "shop", pos: { x: 2.6, y: 12.5 }, side: -1 },
  // 右手の坂・やぐら広場まわり
  { id: "ringoame", name: "りんご飴", kind: "shop", pos: { x: 6.2, y: 11 }, side: -1 },
  { id: "frank", name: "フランクフルト", kind: "shop", pos: { x: 10.5, y: 8 }, side: -1 },
  { id: "kakigori", name: "かき氷", kind: "shop", pos: { x: 6.8, y: 4.5 }, side: -1 },
  { id: "crepe", name: "クレープ", kind: "shop", pos: { x: 3, y: 6 }, side: -1 },
  { id: "juice", name: "ジュース", kind: "shop", pos: { x: 3, y: 1 }, side: -1 },
  // 奥の横丁（食べ物＋遊び）
  { id: "taiyaki", name: "たい焼き", kind: "shop", pos: { x: -3.8, y: 1.5 }, side: 1 },
  { id: "chocobanana", name: "チョコバナナ", kind: "shop", pos: { x: 0.2, y: -8 }, side: -1 },
  { id: "shateki", name: "射的", kind: "minigame", pos: { x: -4, y: -5 }, side: 1 },
  { id: "mogura", name: "モグラたたき", kind: "minigame", pos: { x: 0.3, y: -5 }, side: -1 },
  { id: "bingo", name: "ビンゴ", kind: "minigame", pos: { x: 5.2, y: -8 }, side: -1 },
  { id: "senbiki", name: "千本引き", kind: "minigame", pos: { x: 5.2, y: -12 }, side: -1 },
  // 河川敷（川沿い）の遊び — 花火を見る会場
  { id: "kingyo", name: "金魚すくい", kind: "minigame", pos: { x: -9.5, y: 6 }, side: 1 },
  { id: "yoyo", name: "ヨーヨー釣り", kind: "minigame", pos: { x: -9.5, y: 1 }, side: 1 },
  { id: "kuji", name: "くじ引き", kind: "minigame", pos: { x: -9.5, y: -4 }, side: 1 },
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
