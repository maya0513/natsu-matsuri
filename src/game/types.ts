// ★コントラクト層: ゲーム状態・入力・イベントの型を厳密に定義する。
// 実装層（update/movement/economy/...）はこの契約に従って再生成可能に保つ。

/** 地面平面上の 2D 座標。three.js 側では x → x, y → z にマップする */
export type Vec2 = {
  readonly x: number;
  readonly y: number;
};

export type Direction = "up" | "down" | "left" | "right";

/** 屋台の識別子（売買2種 + ミニゲーム4種） */
export type StallId = "takoyaki" | "ringoame" | "kingyo" | "shateki" | "yoyo" | "kuji";

/** 持ち物になり得るアイテム */
export type ItemId =
  | "takoyaki"
  | "ramune"
  | "ringoame"
  | "wataame"
  | "goldfish"
  | "yoyo-balloon"
  | "kuji-prize-small"
  | "kuji-prize-big"
  | "shateki-prize";

/** ミニゲームの種類 */
export type MinigameId = "kingyo" | "shateki" | "yoyo" | "kuji";

// --- ミニゲーム状態（すべて純粋に更新される） ---

/** くじ引き: ボタンで引くだけ。last は直前の結果表示用 */
export type KujiState = {
  readonly id: "kuji";
  readonly last?: ItemId;
};

/** ヨーヨー釣り: 0..1 を往復するマーカーを中央で止める */
export type YoyoState = {
  readonly id: "yoyo";
  readonly t: number;
  readonly dir: 1 | -1;
  readonly last?: "hit" | "miss";
};

/** 金魚すくい: 泳ぐ金魚を狙う。ポイは 3 回で破れる */
export type KingyoState = {
  readonly id: "kingyo";
  readonly fishX: number;
  readonly dir: 1 | -1;
  readonly poiLeft: number;
  readonly caught: number;
  readonly last?: "hit" | "miss";
};

/** 射的: 流れる照準で 3 つの的を狙う。弾は 3 発 */
export type ShatekiState = {
  readonly id: "shateki";
  readonly aimX: number;
  readonly dir: 1 | -1;
  readonly shotsLeft: number;
  /** 的が立っているか（3 つ） */
  readonly targets: readonly [boolean, boolean, boolean];
  readonly last?: "hit" | "miss";
};

export type MinigameState = KujiState | YoyoState | KingyoState | ShatekiState;

/** ゲーム全体のモード（判別共用体） */
export type Mode =
  | { readonly kind: "walk" }
  | { readonly kind: "dialog"; readonly stallId: StallId }
  | { readonly kind: "minigame"; readonly game: MinigameState };

export type Player = {
  readonly pos: Vec2;
  readonly facing: Direction;
  readonly moving: boolean;
};

/** 花火スケジューラの状態 */
export type FireworksState = {
  /** 次の打ち上げ時刻（ゲーム経過秒） */
  readonly nextLaunchAt: number;
};

export type GameState = {
  /** ゲーム経過秒 */
  readonly time: number;
  readonly player: Player;
  /**
   * 持ち物。お金の概念はない（価格表示は雰囲気のための飾りで、
   * 買う・遊ぶの選択にコストは発生しない）
   */
  readonly inventory: readonly ItemId[];
  readonly mode: Mode;
  readonly fireworks: FireworksState;
};

/** 1 フレーム分の抽象入力。デバイス差は input 層で吸収済みであること */
export type Intent = {
  /** 移動方向。長さは 0〜1（input 層で正規化済みを期待するが、ロジック側でも 1 にクランプする） */
  readonly move: Vec2;
  /** このステップで「調べる/決定」が押されたか */
  readonly interact: boolean;
};

/** update が外界（描画・音）へ通知するイベント */
export type GameEvent = {
  readonly kind: "firework-launched";
  /** 演出のバリエーション用シード（0〜1） */
  readonly seed: number;
};

/** 固定タイムステップ 1 回分の更新結果 */
export type UpdateResult = {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
};

/** 失敗し得る純粋操作の結果 */
export type Result<T, E extends string = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** 乱数は注入する（テストの決定性のため） */
export type Rng = () => number;
