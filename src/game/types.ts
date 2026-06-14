// ★コントラクト層: ゲーム状態・入力・イベントの型を厳密に定義する。
// 実装層（update/movement/economy/...）はこの契約に従って再生成可能に保つ。

/** 地面平面上の 2D 座標。three.js 側では x → x, y → z にマップする */
export type Vec2 = {
  readonly x: number;
  readonly y: number;
};

export type Direction = "up" | "down" | "left" | "right";

/** 屋台の識別子（食べ物屋台 + ミニゲーム屋台） */
export type StallId =
  | "takoyaki"
  | "ringoame"
  | "yakisoba"
  | "potato"
  | "frank"
  | "taiyaki"
  | "chocobanana"
  | "crepe"
  | "kakigori"
  | "juice"
  | "kingyo"
  | "shateki"
  | "yoyo"
  | "kuji"
  | "senbiki"
  | "mogura"
  | "bingo";

/** 屋台で食べられる品物 */
export type ItemId =
  | "takoyaki"
  | "ramune"
  | "ringoame"
  | "wataame"
  | "yakisoba" // ソース焼きそば
  | "yakisoba_shio" // 塩焼きそば
  | "potato"
  | "frank"
  | "taiyaki"
  | "chocobanana"
  | "crepe" // チョコバナナクレープ
  | "crepe_ichigo" // いちご生クリーム
  | "crepe_tuna" // ツナマヨ
  | "kakigori" // いちご
  | "kakigori_blue" // ブルーハワイ
  | "kakigori_melon" // メロン
  | "juice" // オレンジ
  | "juice_grape" // ぶどう
  | "juice_cola"; // コーラ

/** ミニゲームで勝ち取って持ち帰る景品 */
export type PrizeId =
  | "goldfish"
  | "yoyo-balloon"
  | "shateki-prize"
  | "omamori"
  | "senbiki-prize"
  | "mogura-prize"
  | "bingo-prize";

/** 手に持って歩けるもの（食べ物 or 景品） */
export type CarriedId = ItemId | PrizeId;

/** ミニゲームの種類 */
export type MinigameId =
  | "kingyo"
  | "shateki"
  | "yoyo"
  | "kuji"
  | "senbiki"
  | "mogura"
  | "bingo";

/** おみくじの運勢（大吉〜大凶） */
export type Fortune = "大吉" | "中吉" | "小吉" | "吉" | "末吉" | "凶" | "大凶";

// --- ミニゲーム状態（すべて純粋に更新される） ---
// 操作モデルは全ゲーム共通: プレイヤーが cursor(0..1) を左右に動かし、決定で commit する。
// 自動往復（メトロノーム）は廃止。対象（泳ぐ金魚・揺れる風船・出るモグラ）は動くが、
// 強制的なタイミング合わせはない。

/** くじ引き（おみくじ）: 箱の伏せ札をカーソルで選び、引くと運勢が出る */
export type KujiState = {
  readonly id: "kuji";
  /** 箱に並ぶ伏せ札の枚数 */
  readonly count: number;
  /** 選択カーソル 0..1（最も近い札がハイライトされる） */
  readonly cursor: number;
  /** 引いた札の番号（未選択は undefined） */
  readonly picked?: number;
  /** 出た運勢 */
  readonly result?: Fortune;
};

/** ヨーヨー釣り: 上下に揺れる水風船を、自分で動かすこよりで狙って掬う */
export type Balloon = {
  readonly x: number;
  /** 浮きの基準高さ 0..1（描画用） */
  readonly baseY: number;
  /** 上下揺れの位相 */
  readonly phase: number;
  readonly alive: boolean;
};
export type YoyoState = {
  readonly id: "yoyo";
  /** こよりの横位置 0..1 */
  readonly cursor: number;
  readonly balloons: readonly Balloon[];
  /** こよりの残り強度（掬える残り回数） */
  readonly triesLeft: number;
  readonly caught: number;
  readonly last?: "hit" | "miss";
};

/** 金魚すくい: 泳ぐ金魚を、自分で動かすポイで狙って掬う。ポイは数回で破れる */
export type Fish = {
  readonly x: number;
  /** 泳ぐ深さ 0..1（描画用） */
  readonly y: number;
  readonly dir: 1 | -1;
  readonly speed: number;
  readonly alive: boolean;
};
export type KingyoState = {
  readonly id: "kingyo";
  /** ポイの横位置 0..1 */
  readonly cursor: number;
  readonly fish: readonly Fish[];
  readonly poiLeft: number;
  readonly caught: number;
  readonly last?: "hit" | "miss";
};

/** 射的: 照準を自分で動かし、棚に並ぶ景品を撃ち落とす */
export type Target = {
  readonly x: number;
  /** まだ倒されていないか */
  readonly alive: boolean;
};
export type ShatekiState = {
  readonly id: "shateki";
  /** 照準の横位置 0..1 */
  readonly cursor: number;
  readonly shotsLeft: number;
  readonly targets: readonly Target[];
  readonly hits: number;
  readonly last?: "hit" | "miss";
};

/** 千本引き: 紐をカーソルで選んで引くと景品の当たり/はずれが出る */
export type SenbikiState = {
  readonly id: "senbiki";
  readonly count: number;
  readonly cursor: number;
  readonly picked?: number;
  readonly result?: "大当たり" | "当たり" | "はずれ";
};

/** モグラたたき: 穴から出るモグラを、自分で動かすハンマーで叩く（反応ゲーム） */
export type Mole = {
  readonly x: number;
  readonly up: boolean;
  readonly timer: number;
};
export type MoguraState = {
  readonly id: "mogura";
  /** ハンマーの横位置 0..1 */
  readonly cursor: number;
  readonly moles: readonly Mole[];
  readonly triesLeft: number;
  readonly hits: number;
  readonly last?: "hit" | "miss";
};

/** ビンゴ: 3x3 のカード。引いた玉がカードにあれば印、1 列揃えばビンゴ */
export type BingoState = {
  readonly id: "bingo";
  readonly card: readonly number[]; // 9 マス
  readonly marked: readonly boolean[]; // 9 マス
  readonly drawn: readonly number[];
  readonly lastBall?: number;
  readonly bingo: boolean;
};

export type MinigameState =
  | KujiState
  | YoyoState
  | KingyoState
  | ShatekiState
  | SenbikiState
  | MoguraState
  | BingoState;

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
