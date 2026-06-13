// ゲームバランス・ワールド定義の定数

/** プレイヤー移動速度（unit/秒） */
export const PLAYER_SPEED = 4;

/** 歩行可能範囲。広い台地（祭り会場）＋一か所の階段で下りる左の河川敷。minX は川の手前 */
export const MAP_BOUNDS = {
  minX: -16,
  maxX: 22,
  minY: -22,
  maxY: 22,
} as const;

/**
 * ワールドの高低差レイアウト（描画の地形ジオメトリと、移動の当たり判定で共有する契約）。
 * 台地（x>=plateauX, 高さ0）と河川敷（x<bankX, 高さbankY）を、
 * z∈[stairZ0,stairZ1] の一か所だけに置いた長い石段でつなぐ。それ以外の境界は擁壁（通行不可）。
 */
export const WORLD = {
  /** 台地の左端（これ以上右は高さ0の会場） */
  plateauX: -5,
  /** 河川敷の右端（これ以上左は河川敷） */
  bankX: -10,
  /** 河川敷の高さ（台地より低い） */
  bankY: -2,
  /** 石段の段数 */
  stairSteps: 7,
  /** 石段（通れる切り欠き）の z 範囲。ここだけ台地⇄河川敷を行き来できる */
  stairZ0: 0,
  stairZ1: 7,
} as const;

/** 最初の花火が上がる時刻（ゲーム開始からの秒） */
export const FIREWORKS_FIRST_LAUNCH = 5;

/** 花火の打ち上げ間隔（秒） */
export const FIREWORKS_INTERVAL = 12;

/** 屋台を調べられる距離（unit） */
export const INTERACT_RADIUS = 2.2;
