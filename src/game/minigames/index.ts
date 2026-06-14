// ミニゲーム共通の入口。
// 操作モデルは全ゲーム共通: プレイヤーが cursor(0..1) を左右に動かし、決定で commit する。
// stepMinigame: 時間経過（カーソル移動・環境モーション）/ commitMinigame: 「決定」操作
// prizeOf: 退出時に持ち帰る景品
import type {
  Balloon,
  BingoState,
  Fish,
  Fortune,
  KingyoState,
  KujiState,
  MinigameId,
  MinigameState,
  Mole,
  PrizeId,
  Rng,
  SenbikiState,
  Target,
} from "../types";

/** カーソルが 0..1 を横断する速さ（/秒）。←→ 押下中に適用 */
const CURSOR_SPEED = 1.1;

/** 命中判定の窓（カーソル位置と対象 x の許容差） */
export const HIT_WINDOW = {
  yoyo: 0.1,
  kingyo: 0.12,
  shateki: 0.08,
} as const;

/** モグラの穴の横位置 */
export const MOGURA_HOLES = [0.15, 0.38, 0.62, 0.85] as const;
/** モグラが出ている/隠れている秒数 */
const MOGURA_UP = 0.8;
const MOGURA_DOWN = 0.6;
/** ハンマーの命中窓 */
const MOGURA_WINDOW = 0.12;

/** 水風船・的・金魚の初期横位置 */
export const YOYO_POS = [0.18, 0.4, 0.6, 0.82] as const;
export const SHATEKI_TARGETS = [0.18, 0.4, 0.6, 0.82] as const;
/** 金魚の初期配置（x, 深さ y, 向き, 速さ） */
const KINGYO_FISH: readonly Omit<Fish, "alive">[] = [
  { x: 0.22, y: 0.35, dir: 1, speed: 0.18 },
  { x: 0.52, y: 0.6, dir: -1, speed: 0.23 },
  { x: 0.74, y: 0.45, dir: 1, speed: 0.16 },
  { x: 0.4, y: 0.78, dir: -1, speed: 0.2 },
];

/** 水風船の上下揺れの速さ（rad/秒） */
const BOB_SPEED = 2.0;

/** ビンゴ: 玉の最大値と 3x3 の列 */
const BINGO_BALLS = 12;
const BINGO_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** 千本引きの当たり判定 */
const senbikiResult = (r: number): SenbikiState["result"] =>
  r < 0.08 ? "大当たり" : r < 0.5 ? "当たり" : "はずれ";

/** おみくじの確率（累積しきい値, rng < 値で確定） */
const FORTUNE_TABLE: readonly (readonly [number, Fortune])[] = [
  [0.1, "大吉"],
  [0.25, "中吉"],
  [0.45, "小吉"],
  [0.67, "吉"],
  [0.82, "末吉"],
  [0.95, "凶"],
  [1.0, "大凶"],
];

/** 吉系（お守りを持ち帰れる運勢） */
const GOOD_FORTUNES = new Set<Fortune>(["大吉", "中吉", "小吉", "吉", "末吉"]);

export const fortuneFromRng = (r: number): Fortune => {
  for (const [threshold, fortune] of FORTUNE_TABLE) {
    if (r < threshold) return fortune;
  }
  return "大凶";
};

export type MinigamePress = {
  readonly state: MinigameState;
  /** この決定が当たりだったか（結果表示・効果音用） */
  readonly hit: boolean;
};

export const initMinigame = (id: MinigameId): MinigameState => {
  switch (id) {
    case "kuji":
      return { id: "kuji", count: 9, cursor: 0.5 };
    case "yoyo":
      return {
        id: "yoyo",
        cursor: 0.5,
        balloons: YOYO_POS.map((x, i) => ({
          x,
          baseY: 0.4 + 0.12 * (i % 2),
          phase: i * 1.3,
          alive: true,
        })),
        triesLeft: 5,
        caught: 0,
      };
    case "kingyo":
      return {
        id: "kingyo",
        cursor: 0.5,
        fish: KINGYO_FISH.map((f) => ({ ...f, alive: true })),
        poiLeft: 4,
        caught: 0,
      };
    case "shateki":
      return {
        id: "shateki",
        cursor: 0.5,
        shotsLeft: 6,
        targets: SHATEKI_TARGETS.map((x) => ({ x, alive: true })),
        hits: 0,
      };
    case "senbiki":
      return { id: "senbiki", count: 12, cursor: 0.5 };
    case "mogura":
      return {
        id: "mogura",
        cursor: 0.5,
        moles: MOGURA_HOLES.map((x, i) => ({
          x,
          up: i % 2 === 0,
          timer: MOGURA_UP * (0.4 + 0.3 * i),
        })),
        triesLeft: 12,
        hits: 0,
      };
    case "bingo":
      return {
        id: "bingo",
        card: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        marked: Array.from({ length: 9 }, () => false),
        drawn: [],
        bingo: false,
      };
  }
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** ←→ 入力でカーソルを動かす */
const moveCursor = (cursor: number, dt: number, moveX: number): number =>
  clamp01(cursor + moveX * CURSOR_SPEED * dt);

/** 金魚を 1 ステップ泳がせる（端で反転） */
const swimFish = (f: Fish, dt: number): Fish => {
  let x = f.x + f.dir * f.speed * dt;
  let dir = f.dir;
  if (x > 0.95) {
    x = 0.95;
    dir = -1;
  } else if (x < 0.05) {
    x = 0.05;
    dir = 1;
  }
  return { ...f, x, dir };
};

/** モグラの出没（叩かれても時間でまた出る）を 1 ステップ進める */
const stepMole = (mole: Mole, dt: number): Mole => {
  let timer = mole.timer - dt;
  let up = mole.up;
  if (timer <= 0) {
    up = !up;
    timer += up ? MOGURA_UP : MOGURA_DOWN;
  }
  return { ...mole, up, timer };
};

/**
 * 時間経過の更新。moveX（←→ 入力）でカーソルを動かし、対象の環境モーションを進める。
 * 抽選系（kuji/senbiki）と射的は環境モーションがないので、入力がなければ同一参照を返す。
 */
export const stepMinigame = (state: MinigameState, dt: number, moveX = 0): MinigameState => {
  switch (state.id) {
    case "kuji":
    case "senbiki": {
      if (moveX === 0 || state.picked !== undefined) return state;
      return { ...state, cursor: moveCursor(state.cursor, dt, moveX) };
    }
    case "shateki": {
      if (moveX === 0) return state;
      return { ...state, cursor: moveCursor(state.cursor, dt, moveX) };
    }
    case "yoyo": {
      const balloons = state.balloons.map((b) =>
        b.alive ? { ...b, phase: b.phase + BOB_SPEED * dt } : b,
      );
      return { ...state, cursor: moveCursor(state.cursor, dt, moveX), balloons };
    }
    case "kingyo": {
      const fish = state.fish.map((f) => (f.alive ? swimFish(f, dt) : f));
      return { ...state, cursor: moveCursor(state.cursor, dt, moveX), fish };
    }
    case "mogura": {
      const moles = state.moles.map((m) => stepMole(m, dt));
      return { ...state, cursor: moveCursor(state.cursor, dt, moveX), moles };
    }
    case "bingo":
      return state;
  }
};

/** 掬える/撃てる対象のうち、カーソルに最も近い index。なければ -1 */
const nearestIndex = (
  cursor: number,
  window: number,
  items: readonly { readonly x: number }[],
  eligible: (i: number) => boolean,
): number => {
  let best = -1;
  let bestD = window;
  items.forEach((it, i) => {
    if (!eligible(i)) return;
    const d = Math.abs(cursor - it.x);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
};

/** カーソル位置から、count 枚の札のうち選択中の index を求める（均等配置の最近傍） */
export const lotIndexAt = (cursor: number, count: number): number =>
  Math.max(0, Math.min(count - 1, Math.round(cursor * count - 0.5)));

/** くじ引き: カーソル位置の札を開いて運勢を確定（選択済みなら何もしない） */
export const pickLot = (state: KujiState, rng: Rng): KujiState => {
  if (state.picked !== undefined) return state;
  return { ...state, picked: lotIndexAt(state.cursor, state.count), result: fortuneFromRng(rng()) };
};

/** 千本引き: カーソル位置の紐を引いて当たり/はずれを確定（選択済みなら何もしない） */
export const pullString = (state: SenbikiState, rng: Rng): SenbikiState => {
  if (state.picked !== undefined) return state;
  return { ...state, picked: lotIndexAt(state.cursor, state.count), result: senbikiResult(rng()) };
};

/** ビンゴ: 玉を 1 つ引いてカードに印を付ける。揃えば bingo になる */
export const drawBall = (state: BingoState, rng: Rng): BingoState => {
  if (state.bingo) return state;
  const remaining: number[] = [];
  for (let n = 1; n <= BINGO_BALLS; n++) if (!state.drawn.includes(n)) remaining.push(n);
  if (remaining.length === 0) return state;
  const ball = remaining[Math.floor(rng() * remaining.length)] ?? remaining[0] ?? 0;
  const marked = state.card.map((n, i) => state.marked[i] || n === ball);
  const bingo = BINGO_LINES.some((line) => line.every((i) => marked[i]));
  return { ...state, drawn: [...state.drawn, ball], marked, bingo, lastBall: ball };
};

/**
 * 「決定」操作。ゲーム別にカーソル位置の対象へ作用する。
 * rng は抽選系（kuji/senbiki/bingo）でのみ使う。
 */
export const commitMinigame = (state: MinigameState, rng: Rng): MinigamePress => {
  switch (state.id) {
    case "kuji": {
      const next = pickLot(state, rng);
      if (next === state) return { state, hit: false };
      return { state: next, hit: next.result !== undefined && GOOD_FORTUNES.has(next.result) };
    }
    case "senbiki": {
      const next = pullString(state, rng);
      if (next === state) return { state, hit: false };
      return { state: next, hit: next.result !== undefined && next.result !== "はずれ" };
    }
    case "bingo": {
      const next = drawBall(state, rng);
      if (next === state) return { state, hit: false };
      const newMark = next.marked.some((m, i) => m && !state.marked[i]);
      return { state: next, hit: newMark };
    }
    case "yoyo": {
      if (isFinished(state)) return { state, hit: false };
      const idx = nearestIndex(
        state.cursor,
        HIT_WINDOW.yoyo,
        state.balloons,
        (i) => state.balloons[i]?.alive ?? false,
      );
      const hit = idx >= 0;
      const balloons = state.balloons.map((b, i) =>
        i === idx ? { ...b, alive: false } : b,
      ) as readonly Balloon[];
      return {
        state: {
          ...state,
          balloons,
          triesLeft: state.triesLeft - 1,
          caught: state.caught + (hit ? 1 : 0),
          last: hit ? "hit" : "miss",
        },
        hit,
      };
    }
    case "kingyo": {
      if (isFinished(state)) return { state, hit: false };
      const idx = nearestIndex(
        state.cursor,
        HIT_WINDOW.kingyo,
        state.fish,
        (i) => state.fish[i]?.alive ?? false,
      );
      const hit = idx >= 0;
      const fish = state.fish.map((f, i) =>
        i === idx ? { ...f, alive: false } : f,
      ) as readonly Fish[];
      return {
        state: {
          ...state,
          fish,
          poiLeft: state.poiLeft - 1,
          caught: state.caught + (hit ? 1 : 0),
          last: hit ? "hit" : "miss",
        },
        hit,
      };
    }
    case "shateki": {
      if (isFinished(state)) return { state, hit: false };
      const idx = nearestIndex(
        state.cursor,
        HIT_WINDOW.shateki,
        state.targets,
        (i) => state.targets[i]?.alive ?? false,
      );
      const hit = idx >= 0;
      const targets = state.targets.map((t, i) =>
        i === idx ? { ...t, alive: false } : t,
      ) as readonly Target[];
      return {
        state: {
          ...state,
          targets,
          shotsLeft: state.shotsLeft - 1,
          hits: state.hits + (hit ? 1 : 0),
          last: hit ? "hit" : "miss",
        },
        hit,
      };
    }
    case "mogura": {
      if (isFinished(state)) return { state, hit: false };
      const idx = nearestIndex(
        state.cursor,
        MOGURA_WINDOW,
        state.moles,
        (i) => state.moles[i]?.up ?? false,
      );
      const hit = idx >= 0;
      // 叩いたモグラは引っ込む（時間でまた出てくる）
      const moles = state.moles.map((m, i) =>
        i === idx ? { ...m, up: false, timer: MOGURA_DOWN } : m,
      ) as readonly Mole[];
      return {
        state: {
          ...state,
          moles,
          triesLeft: state.triesLeft - 1,
          hits: state.hits + (hit ? 1 : 0),
          last: hit ? "hit" : "miss",
        },
        hit,
      };
    }
  }
};

/** これ以上操作できない（結果画面を出すべき）状態か */
export const isFinished = (state: MinigameState): boolean => {
  switch (state.id) {
    case "kuji":
      return state.picked !== undefined;
    case "yoyo":
      return state.triesLeft === 0 || state.balloons.every((b) => !b.alive);
    case "kingyo":
      return state.poiLeft === 0 || state.fish.every((f) => !f.alive);
    case "shateki":
      return state.shotsLeft === 0 || state.targets.every((t) => !t.alive);
    case "senbiki":
      return state.picked !== undefined;
    case "mogura":
      return state.triesLeft === 0;
    case "bingo":
      return state.bingo || state.drawn.length >= 9;
  }
};

/** 退出時に持ち帰る景品。勝っていなければ undefined */
export const prizeOf = (state: MinigameState): PrizeId | undefined => {
  switch (state.id) {
    case "kuji":
      return state.result && GOOD_FORTUNES.has(state.result) ? "omamori" : undefined;
    case "yoyo":
      return state.caught >= 1 ? "yoyo-balloon" : undefined;
    case "kingyo":
      return state.caught >= 1 ? "goldfish" : undefined;
    case "shateki":
      return state.hits >= 1 ? "shateki-prize" : undefined;
    case "senbiki":
      return state.result && state.result !== "はずれ" ? "senbiki-prize" : undefined;
    case "mogura":
      return state.hits >= 2 ? "mogura-prize" : undefined;
    case "bingo":
      return state.bingo ? "bingo-prize" : undefined;
  }
};
