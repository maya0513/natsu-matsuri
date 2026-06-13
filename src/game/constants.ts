// ゲームバランス・ワールド定義の定数

/** プレイヤー移動速度（unit/秒） */
export const PLAYER_SPEED = 4;

/** 歩行可能範囲。蛇行する参道（台地）＋石段で下りる左の河川敷まで歩ける。minX は川の手前 */
export const MAP_BOUNDS = {
  minX: -11,
  maxX: 13,
  minY: -20,
  maxY: 20,
} as const;

/** 最初の花火が上がる時刻（ゲーム開始からの秒） */
export const FIREWORKS_FIRST_LAUNCH = 5;

/** 花火の打ち上げ間隔（秒） */
export const FIREWORKS_INTERVAL = 12;

/** 屋台を調べられる距離（unit） */
export const INTERACT_RADIUS = 2.2;
