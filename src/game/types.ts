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

/** 屋台で食べられる品物 */
export type ItemId = "takoyaki" | "ramune" | "ringoame" | "wataame";

/** ミニゲームで勝ち取って持ち帰る景品 */
export type PrizeId = "goldfish" | "yoyo-balloon" | "shateki-prize" | "omamori";

/** 手に持って歩けるもの（食べ物 or 景品） */
export type CarriedId = ItemId | PrizeId;

/** ミニゲームの種類 */
export type MinigameId = "kingyo" | "shateki" | "yoyo" | "kuji";

/** おみくじの運勢（大吉〜大凶） */
export type Fortune = "大吉" | "中吉" | "小吉" | "吉" | "末吉" | "凶" | "大凶";

// --- ミニゲーム状態（すべて純粋に更新される） ---

/** くじ引き（おみくじ）: 箱から伏せ札を 1 枚選ぶと運勢が出る */
export type KujiState = {
  readonly id: "kuji";
  /** 箱に並ぶ伏せ札の枚数 */
  readonly count: number;
  /** 選んだ札の番号（未選択は undefined） */
  readonly picked?: number;
  /** 出た運勢 */
  readonly result?: Fortune;
};

/** ヨーヨー釣り: 上下に揺れる水風船を、左右に流れるフックで掬う */
export type Balloon = {
  readonly x: number;
  /** 上下揺れの位相 */
  readonly phase: number;
  readonly alive: boolean;
};
export type YoyoState = {
  readonly id: "yoyo";
  /** フックの位置 0..1 */
  readonly hookX: number;
  readonly dir: 1 | -1;
  readonly balloons: readonly Balloon[];
  /** こよりの残り強度（掬える残り回数） */
  readonly triesLeft: number;
  readonly caught: number;
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

/** 射的: 流れる照準で、出没（ポップアップ）する的を狙う */
export type Target = {
  readonly x: number;
  /** いま立っている（撃てる）か */
  readonly up: boolean;
  /** 次の出没切り替えまでの残り秒 */
  readonly timer: number;
  /** まだ倒されていないか */
  readonly alive: boolean;
};
export type ShatekiState = {
  readonly id: "shateki";
  readonly aimX: number;
  readonly dir: 1 | -1;
  readonly shotsLeft: number;
  readonly targets: readonly Target[];
  readonly hits: number;
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
  /** いま手に持って歩いているもの（食べ物 or 景品。直近に手にした 1 つで上書きされる） */
  readonly heldItem?: CarriedId;
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

/** update / applyAction が外界（描画・音）へ通知するイベント */
export type GameEvent =
  | {
      readonly kind: "firework-launched";
      /** 演出のバリエーション用シード（0〜1） */
      readonly seed: number;
    }
  | { readonly kind: "item-eaten" }
  | { readonly kind: "minigame-hit" }
  | { readonly kind: "minigame-miss" };

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
