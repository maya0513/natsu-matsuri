// ゲームバランス・ワールド定義の定数

/** プレイヤー移動速度（unit/秒） */
export const PLAYER_SPEED = 4;

/** 歩行可能範囲。広い台地（祭り会場）＋一か所の階段で下りる左の河川敷。minX は川の手前 */
export const MAP_BOUNDS = {
  minX: -24,
  maxX: 42,
  minY: -34,
  maxY: 34,
} as const;

/**
 * ワールドの高低差レイアウト（描画の地形ジオメトリと、移動の当たり判定で共有する契約）。
 * 河川敷（x<bankX, 低）／主会場の台地（x>=plateauX, 基準0）／北へ立ち上がる社の丘 の多層構造。
 * 台地と河川敷は z∈[stairZ0,stairZ1] の一か所の石段だけでつなぐ（それ以外の境界は擁壁＝通行不可）。
 * 社の丘・やぐらの盛り土はなだらかな起伏で、どこでも歩いて登れる（壁ではない）。
 */
export const WORLD = {
  /** 台地の左端（これ以上右は会場） */
  plateauX: -6,
  /** 河川敷の右端（これ以上左は河川敷） */
  bankX: -12,
  /** 河川敷の高さ（台地より低い） */
  bankY: -2,
  /** 石段の段数 */
  stairSteps: 8,
  /** 石段（通れる切り欠き）の z 範囲。ここだけ台地⇄河川敷を行き来できる */
  stairZ0: 2,
  stairZ1: 12,
  /** 社の丘: この z より南（手前）は平坦な主会場。これより北で地面が立ち上がり始める */
  hillBaseZ: -10,
  /** 社の丘: この z より北（奥）は丘の頂上＝社の高台（一定の高さ hillMaxH） */
  hillTopZ: -30,
  /** 社の丘の高さ（主会場からの立ち上がり） */
  hillMaxH: 4.5,
} as const;

/** 最初の花火が上がる時刻（ゲーム開始からの秒） */
export const FIREWORKS_FIRST_LAUNCH = 5;

/** 花火の打ち上げ間隔（秒） */
export const FIREWORKS_INTERVAL = 12;

/** 屋台を調べられる距離（unit） */
export const INTERACT_RADIUS = 2.2;
