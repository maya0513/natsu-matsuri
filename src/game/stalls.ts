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
// 並びはわざと不規則に散らし、蛇行する参道（大通り・東の弧・河川敷の遊歩道）の帯には重ねない。
// 位置は蛇行する参道の実曲線（Catmull-Rom）に対し、道の帯と footprint が重ならない垂直オフセットで算出。
// 屋台同士の間隔はわざと不規則（最寄りでも約 4 unit 以上）に取り、密集させず広々と散らす。
export const STALLS: readonly Stall[] = [
  // 大通り（鳥居からの長い直線＋最下部の右カーブ）沿い。直線部の両脇に左右段違い・不規則間隔で散らす
  { id: "potato", name: "ポテト", kind: "shop", pos: { x: 6.3, y: -1.2 }, side: 1 },
  { id: "yakisoba", name: "焼きそば", kind: "shop", pos: { x: -0.4, y: 2.5 }, side: -1 },
  { id: "crepe", name: "クレープ", kind: "shop", pos: { x: 6.5, y: 7.1 }, side: 1 },
  { id: "takoyaki", name: "たこ焼き", kind: "shop", pos: { x: -0.3, y: 11.7 }, side: -1 },
  { id: "frank", name: "フランクフルト", kind: "shop", pos: { x: -0.7, y: 15.9 }, side: -1 },
  { id: "ringoame", name: "りんご飴", kind: "shop", pos: { x: 0.3, y: 21.6 }, side: -1 },
  { id: "chocobanana", name: "チョコバナナ", kind: "shop", pos: { x: 8.2, y: 22.5 }, side: 1 },
  { id: "taiyaki", name: "たい焼き", kind: "shop", pos: { x: 4.3, y: 28.7 }, side: 1 },
  { id: "senbiki", name: "千本引き", kind: "minigame", pos: { x: 10.9, y: 26.2 }, side: 1 },
  // 横道（やぐらへ向かう東半分）沿い。手前側に偏らないよう bingo は奥（北）側に置く
  { id: "shateki", name: "射的", kind: "minigame", pos: { x: 9.6, y: 15.7 }, side: 1 },
  { id: "kakigori", name: "かき氷", kind: "shop", pos: { x: 14.2, y: 17.5 }, side: 1 },
  { id: "bingo", name: "ビンゴ", kind: "minigame", pos: { x: 20.2, y: 12.5 }, side: -1 },
  { id: "juice", name: "ジュース", kind: "shop", pos: { x: 22.5, y: 19.9 }, side: 1 },
  { id: "mogura", name: "モグラたたき", kind: "minigame", pos: { x: 29.5, y: 17 }, side: -1 },
  // 河川敷（川沿い・西）の遊び — 花火を見る会場。崖や石段を下りた先、川の東岸の普通の地面に並ぶ
  { id: "kingyo", name: "金魚すくい", kind: "minigame", pos: { x: -13.5, y: 13 }, side: 1 },
  { id: "yoyo", name: "ヨーヨー釣り", kind: "minigame", pos: { x: -14.5, y: 3.5 }, side: 1 },
  { id: "kuji", name: "くじ引き", kind: "minigame", pos: { x: -13, y: -5.5 }, side: 1 },
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
