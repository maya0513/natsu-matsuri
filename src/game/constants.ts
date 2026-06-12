// ゲームバランス・ワールド定義の定数

/** プレイヤー移動速度（unit/秒） */
export const PLAYER_SPEED = 4;

/** 歩行可能範囲。参道が y 軸方向（奥が神社）に伸びる縦長マップ */
export const MAP_BOUNDS = {
  minX: -10,
  maxX: 10,
  minY: -20,
  maxY: 20,
} as const;

/** 最初の花火が上がる時刻（ゲーム開始からの秒） */
export const FIREWORKS_FIRST_LAUNCH = 5;

/** 花火の打ち上げ間隔（秒） */
export const FIREWORKS_INTERVAL = 12;

/** 屋台に話しかけられる距離（unit） */
export const INTERACT_RADIUS = 2.2;

/** ミニゲームの料金表示（円/回）。雰囲気のための飾りで、実際には消費しない */
export const MINIGAME_FEE = 300;
