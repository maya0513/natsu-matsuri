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

/** 命中判定の窓（カーソル位置と対象の許容差）。金魚・射的は縦横の 2D */
export const HIT_WINDOW = {
  yoyo: 0.13,
  kingyoX: 0.15,
  kingyoY: 0.17,
  shatekiX: 0.13,
  shatekiY: 0.32,
} as const;

/** モグラの穴の横位置 */
export const MOGURA_HOLES = [0.15, 0.38, 0.62, 0.85] as const;
/** モグラが出ている/隠れている秒数（ゆっくりめの周期） */
const MOGURA_UP = 1.5;
const MOGURA_DOWN = 1.3;
/** たたかれて×目で固まる秒数（この間は出たまま動かず判定外、その後引っ込む） */
const MOGURA_STUN = 0.45;
/** ハンマーの命中窓 */
const MOGURA_WINDOW = 0.14;

/** 金魚の数とポイの回数 */
const KINGYO_COUNT = 5;
const KINGYO_POI = 2;
/** 金魚が泳ぐ範囲（水面 0..1 の内側） */
const SWIM_MIN = 0.1;
const SWIM_MAX = 0.9;

/** ヨーヨーのデザイン（色）数と初期数 */
export const YOYO_KINDS = 5;
const YOYO_COUNT = 6;

/** 射的の的配置（x, 段の高さ y）。下段 3・上段 2 */
const SHATEKI_LAYOUT: readonly { readonly x: number; readonly y: number }[] = [
  { x: 0.2, y: 0.2 },
  { x: 0.5, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.32, y: 0.8 },
  { x: 0.68, y: 0.8 },
];

/** 水風船の上下揺れの速さ（rad/秒） */
const BOB_SPEED = 1.6;

/** ビンゴ: 実物の紙を模した 5×5・中央フリー。各マス・玉とも 1〜100 のランダム */
export const BINGO_SIZE = 5;
export const BINGO_CELLS = BINGO_SIZE * BINGO_SIZE; // 25
export const BINGO_CENTER = 12; // 中央（FREE）
export const BINGO_NUM_MAX = 100; // 数字は 1〜100
/** 玉を引ける回数の上限（これを超えると終了） */
export const BINGO_DRAWS = 18;
/** 引いた玉がカードの数字（未マーク）になりやすさ（festival 用に当たりやすく） */
const BINGO_HIT_BIAS = 0.7;
/** 中央フリーのマス値（描画用の番兵） */
export const BINGO_FREE = -1;

/** 5×5 の当たりライン（行 5 + 列 5 + 対角 2 = 12 本） */
const buildBingoLines = (): readonly (readonly number[])[] => {
  const lines: number[][] = [];
  for (let r = 0; r < BINGO_SIZE; r++) {
    lines.push(Array.from({ length: BINGO_SIZE }, (_, c) => r * BINGO_SIZE + c));
  }
  for (let c = 0; c < BINGO_SIZE; c++) {
    lines.push(Array.from({ length: BINGO_SIZE }, (_, r) => r * BINGO_SIZE + c));
  }
  lines.push(Array.from({ length: BINGO_SIZE }, (_, i) => i * BINGO_SIZE + i));
  lines.push(Array.from({ length: BINGO_SIZE }, (_, i) => i * BINGO_SIZE + (BINGO_SIZE - 1 - i)));
  return lines;
};
const BINGO_LINES = buildBingoLines();

/** 千本引きの当たり判定 */
const senbikiResult = (r: number): "大当たり" | "当たり" | "はずれ" =>
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

export const initMinigame = (id: MinigameId, rng: Rng = Math.random): MinigameState => {
  switch (id) {
    case "kuji":
      return { id: "kuji", count: 9, cursor: 0.5 };
    case "yoyo":
      return {
        id: "yoyo",
        cursor: 0.5,
        // デザイン・大きさ・配置をすべて別々のランダムに
        balloons: Array.from({ length: YOYO_COUNT }, () => ({
          x: 0.1 + rng() * 0.8,
          baseY: rng(),
          phase: rng() * Math.PI * 2,
          kind: Math.floor(rng() * YOYO_KINDS),
          size: 0.6 + rng() * 0.5,
          alive: true,
        })),
        // ヨーヨーは 1 つ釣れたら終わり（成功で終了）。ここは「外せる回数」の上限
        triesLeft: 3,
        caught: 0,
      };
    case "kingyo":
      return {
        id: "kingyo",
        cursor: 0.5,
        cursorY: 0.5,
        // 5 匹を不規則な位置・向きで（毎秒の揺らぎで不規則に泳ぐ）
        fish: Array.from({ length: KINGYO_COUNT }, () => {
          const angle = rng() * Math.PI * 2;
          const speed = 0.1 + rng() * 0.12;
          return {
            x: SWIM_MIN + rng() * (SWIM_MAX - SWIM_MIN),
            y: SWIM_MIN + rng() * (SWIM_MAX - SWIM_MIN),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            phase: rng() * Math.PI * 2,
            alive: true,
          };
        }),
        poiLeft: KINGYO_POI,
        caught: 0,
      };
    case "shateki":
      return {
        id: "shateki",
        cursor: 0.5,
        cursorY: 0.2, // 最初は下段を狙う
        shotsLeft: 6,
        targets: SHATEKI_LAYOUT.map((t) => ({ x: t.x, y: t.y, alive: true })),
        hits: 0,
      };
    case "senbiki":
      // 紐は少なめ（何が起きたか分かりやすく）
      return { id: "senbiki", count: 6, cursor: 0.5 };
    case "mogura":
      return {
        id: "mogura",
        cursor: 0.5,
        moles: MOGURA_HOLES.map((x, i) => ({
          x,
          up: i % 2 === 0,
          timer: MOGURA_UP * (0.4 + 0.3 * i),
          stunned: 0,
        })),
        triesLeft: 12,
        hits: 0,
      };
    case "bingo": {
      // 各マスに 1〜100 のユニークなランダム数字。中央はフリー（最初から印）
      const used = new Set<number>();
      const card = Array.from({ length: BINGO_CELLS }, (_, i) => {
        if (i === BINGO_CENTER) return BINGO_FREE;
        let n = 1 + Math.floor(rng() * BINGO_NUM_MAX);
        while (used.has(n)) n = 1 + Math.floor(rng() * BINGO_NUM_MAX);
        used.add(n);
        return n;
      });
      const marked = Array.from({ length: BINGO_CELLS }, (_, i) => i === BINGO_CENTER);
      return { id: "bingo", card, marked, drawn: [], bingo: false };
    }
  }
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** ←→ 入力でカーソルを動かす */
const moveCursor = (cursor: number, dt: number, moveX: number): number =>
  clamp01(cursor + moveX * CURSOR_SPEED * dt);

/** 金魚を 1 ステップ泳がせる。進行方向を毎フレーム少しずつ揺らして不規則に泳ぐ */
const swimFish = (f: Fish, dt: number): Fish => {
  const phase = f.phase + dt;
  const turn = (Math.sin(phase * 2.7) + 0.6 * Math.sin(phase * 1.3 + 1.7)) * 1.6 * dt;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  let vx = f.vx * c - f.vy * s;
  let vy = f.vx * s + f.vy * c;
  let x = f.x + vx * dt;
  let y = f.y + vy * dt;
  if (x < SWIM_MIN) {
    x = SWIM_MIN;
    vx = Math.abs(vx);
  } else if (x > SWIM_MAX) {
    x = SWIM_MAX;
    vx = -Math.abs(vx);
  }
  if (y < SWIM_MIN) {
    y = SWIM_MIN;
    vy = Math.abs(vy);
  } else if (y > SWIM_MAX) {
    y = SWIM_MAX;
    vy = -Math.abs(vy);
  }
  return { ...f, x, y, vx, vy, phase };
};

/** モグラの出没を 1 ステップ進める。たたかれた（stunned>0）間は固まり、0 で引っ込む */
const stepMole = (mole: Mole, dt: number): Mole => {
  if (mole.stunned > 0) {
    const stunned = mole.stunned - dt;
    if (stunned <= 0) return { ...mole, stunned: 0, up: false, timer: MOGURA_DOWN };
    return { ...mole, stunned };
  }
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
export const stepMinigame = (
  state: MinigameState,
  dt: number,
  moveX = 0,
  moveY = 0,
): MinigameState => {
  switch (state.id) {
    case "kuji":
    case "senbiki": {
      if (moveX === 0 || state.picked !== undefined) return state;
      return { ...state, cursor: moveCursor(state.cursor, dt, moveX) };
    }
    case "shateki": {
      if (moveX === 0 && moveY === 0) return state;
      // 画面の上（move.y は負）を上段（cursorY 大）へ
      return {
        ...state,
        cursor: moveCursor(state.cursor, dt, moveX),
        cursorY: moveCursor(state.cursorY, dt, -moveY),
      };
    }
    case "yoyo": {
      const balloons = state.balloons.map((b) =>
        b.alive ? { ...b, phase: b.phase + BOB_SPEED * dt } : b,
      );
      return { ...state, cursor: moveCursor(state.cursor, dt, moveX), balloons };
    }
    case "kingyo": {
      const fish = state.fish.map((f) => (f.alive ? swimFish(f, dt) : f));
      return {
        ...state,
        cursor: moveCursor(state.cursor, dt, moveX),
        cursorY: moveCursor(state.cursorY, dt, -moveY),
        fish,
      };
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

/** 2D（縦横）でカーソルに最も近い対象 index。窓は縦横で別。なければ -1 */
const nearestIndex2D = (
  cx: number,
  cy: number,
  xw: number,
  yw: number,
  items: readonly { readonly x: number; readonly y: number }[],
  eligible: (i: number) => boolean,
): number => {
  let best = -1;
  let bestD = Number.POSITIVE_INFINITY;
  items.forEach((it, i) => {
    if (!eligible(i)) return;
    const dx = Math.abs(cx - it.x) / xw;
    const dy = Math.abs(cy - it.y) / yw;
    if (dx <= 1 && dy <= 1) {
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        best = i;
        bestD = d;
      }
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

/**
 * ビンゴ: 玉を 1 つ引く（1〜100、重複なし）。同じ数字のマスに印が付く。1 ライン揃えば bingo。
 * 1 枚カードでも勝てるよう、玉はカードの未マーク数字に当たりやすく寄せる（festival 向け）。
 */
export const drawBall = (state: BingoState, rng: Rng): BingoState => {
  if (state.bingo || state.drawn.length >= BINGO_DRAWS) return state;
  const drawnSet = new Set(state.drawn);
  const unmarkedCard = state.card.filter((n, i) => n >= 0 && !state.marked[i]);
  const remaining: number[] = [];
  for (let n = 1; n <= BINGO_NUM_MAX; n++) if (!drawnSet.has(n)) remaining.push(n);
  if (remaining.length === 0) return state;

  let ball: number;
  if (rng() < BINGO_HIT_BIAS && unmarkedCard.length > 0) {
    ball = unmarkedCard[Math.floor(rng() * unmarkedCard.length)] ?? unmarkedCard[0] ?? 0;
  } else {
    // ハズレ玉はカードに無い数字を優先（無ければ残り全体から）
    const decoys = remaining.filter((n) => !state.card.includes(n));
    const pool = decoys.length > 0 ? decoys : remaining;
    ball = pool[Math.floor(rng() * pool.length)] ?? pool[0] ?? 0;
  }
  const marked = state.card.map((n, i) => state.marked[i] || n === ball);
  const bingo = BINGO_LINES.some((line) => line.every((i) => marked[i]));
  return { ...state, drawn: [...state.drawn, ball], marked, bingo, lastBall: ball };
};

/**
 * クリック/タッチで対象を直接指定したとき、その対象にカーソルを合わせる。
 * これにより以降の判定ロジックを十字キー時とそのまま共有できる（操作併存）。
 */
const snapCursor = (state: MinigameState, target: number): MinigameState => {
  switch (state.id) {
    case "kuji":
    case "senbiki":
      return { ...state, cursor: (target + 0.5) / state.count };
    case "yoyo":
      return { ...state, cursor: state.balloons[target]?.x ?? state.cursor };
    case "kingyo": {
      const f = state.fish[target];
      return f ? { ...state, cursor: f.x, cursorY: f.y } : state;
    }
    case "shateki": {
      const t = state.targets[target];
      return t ? { ...state, cursor: t.x, cursorY: t.y } : state;
    }
    case "mogura":
      return { ...state, cursor: state.moles[target]?.x ?? state.cursor };
    case "bingo":
      return state; // ビンゴは対象指定なし（玉を引くだけ）
  }
};

/**
 * 「決定」操作。ゲーム別にカーソル位置の対象へ作用する。
 * rng は抽選系（kuji/senbiki/bingo）でのみ使う。
 * target を渡すと、その対象にカーソルをスナップしてから判定する（クリック/タッチ用）。
 */
export const commitMinigame = (
  input: MinigameState,
  rng: Rng,
  target?: number,
): MinigamePress => {
  const state = target === undefined ? input : snapCursor(input, target);
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
      const idx = nearestIndex2D(
        state.cursor,
        state.cursorY,
        HIT_WINDOW.kingyoX,
        HIT_WINDOW.kingyoY,
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
      const idx = nearestIndex2D(
        state.cursor,
        state.cursorY,
        HIT_WINDOW.shatekiX,
        HIT_WINDOW.shatekiY,
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
      // 出ていて、まだ叩かれていない（stunned 0）モグラだけ叩ける
      const idx = nearestIndex(
        state.cursor,
        MOGURA_WINDOW,
        state.moles,
        (i) => (state.moles[i]?.up ?? false) && (state.moles[i]?.stunned ?? 0) <= 0,
      );
      const hit = idx >= 0;
      // 叩いたモグラは目を×にして固まり（stunned）、その後引っ込む
      const moles = state.moles.map((m, i) =>
        i === idx ? { ...m, stunned: MOGURA_STUN } : m,
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
      // 1 つ釣れたら終わり。外し切る（triesLeft 0）か全部消えても終了
      return state.caught >= 1 || state.triesLeft === 0 || state.balloons.every((b) => !b.alive);
    case "kingyo":
      return state.poiLeft === 0 || state.fish.every((f) => !f.alive);
    case "shateki":
      return state.shotsLeft === 0 || state.targets.every((t) => !t.alive);
    case "senbiki":
      return state.picked !== undefined;
    case "mogura":
      return state.triesLeft === 0;
    case "bingo":
      // ビンゴになるか、玉を引ける回数を使い切ったら終了
      return state.bingo || state.drawn.length >= BINGO_DRAWS;
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
