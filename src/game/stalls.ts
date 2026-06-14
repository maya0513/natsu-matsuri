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
// すべての屋台は鳥居(y≈-6)より南の「祭りの広場」に置く。鳥居の内側（神社の敷地）には屋台を置かない。
// 並びはわざと不規則に散らし、参道（中央大通り・東の通り・やぐら枝・西の石段道）の帯には重ねない。
export const STALLS: readonly Stall[] = [
  // 中央大通りの西側（x 負）— 位置を不揃いに
  { id: "yakisoba", name: "焼きそば", kind: "shop", pos: { x: -5.2, y: 28.4 }, side: 1 },
  { id: "takoyaki", name: "たこ焼き", kind: "shop", pos: { x: -4.4, y: 19.5 }, side: 1 },
  { id: "ringoame", name: "りんご飴", kind: "shop", pos: { x: -5.6, y: 12.8 }, side: 1 },
  { id: "taiyaki", name: "たい焼き", kind: "shop", pos: { x: -5, y: 3.5 }, side: 1 },
  { id: "bingo", name: "ビンゴ", kind: "minigame", pos: { x: -5, y: -1.5 }, side: 1 },
  // 中央大通りの東側（x 正）— 西側と段違いに
  { id: "potato", name: "ポテト", kind: "shop", pos: { x: 4.6, y: 30 }, side: -1 },
  { id: "crepe", name: "クレープ", kind: "shop", pos: { x: 5.4, y: 25.8 }, side: -1 },
  { id: "frank", name: "フランクフルト", kind: "shop", pos: { x: 4.3, y: 17 }, side: -1 },
  { id: "chocobanana", name: "チョコバナナ", kind: "shop", pos: { x: 5.6, y: 10 }, side: -1 },
  { id: "senbiki", name: "千本引き", kind: "minigame", pos: { x: 4.4, y: -2 }, side: -1 },
  // 東のやぐら広場まわり（道の帯を避けて散らす）
  { id: "shateki", name: "射的", kind: "minigame", pos: { x: 9, y: 19 }, side: -1 },
  { id: "kakigori", name: "かき氷", kind: "shop", pos: { x: 17.5, y: 20.5 }, side: -1 },
  { id: "juice", name: "ジュース", kind: "shop", pos: { x: 20, y: 11 }, side: -1 },
  { id: "mogura", name: "モグラたたき", kind: "minigame", pos: { x: 30, y: 19 }, side: -1 },
  // 河川敷（川沿い・西）の遊び — 花火を見る会場。石段を下りた先
  { id: "kingyo", name: "金魚すくい", kind: "minigame", pos: { x: -14, y: 13 }, side: 1 },
  { id: "yoyo", name: "ヨーヨー釣り", kind: "minigame", pos: { x: -12.8, y: 5.5 }, side: 1 },
  { id: "kuji", name: "くじ引き", kind: "minigame", pos: { x: -14.2, y: -3 }, side: 1 },
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
