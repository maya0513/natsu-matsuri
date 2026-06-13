// ミニゲーム共通の入口。
// stepMinigame: 時間経過（マーカーの発振など）/ pressMinigame: 「押す」操作
// pickLot: くじ引き（おみくじ）の選択 / prizeOf: 退出時に持ち帰る景品
import type {
  Balloon,
  Fortune,
  KujiState,
  MinigameId,
  MinigameState,
  PrizeId,
  Rng,
  Target,
} from "../types";

/** 命中判定の窓（マーカー位置と対象 x の許容差） */
export const HIT_WINDOW = {
  yoyo: 0.12,
  kingyo: 0.15,
  shateki: 0.1,
} as const;

/** マーカー（フック / 金魚 / 照準）の速さ（往復/秒換算の係数） */
const SPEED = {
  yoyo: 0.9,
  kingyo: 0.8,
  shateki: 1.0,
} as const;

/** 水風船・的の横位置 */
export const YOYO_POS = [0.2, 0.5, 0.8] as const;
export const SHATEKI_TARGETS = [0.2, 0.5, 0.8] as const;

/** 水風船の上下揺れの速さ（rad/秒） */
const BOB_SPEED = 2.2;
/** 射的の的が立つ/伏せる秒数 */
const SHATEKI_UP = 1.1;
const SHATEKI_DOWN = 0.7;

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
  /** この press が当たりだったか（結果表示・効果音用） */
  readonly hit: boolean;
};

export const initMinigame = (id: MinigameId): MinigameState => {
  switch (id) {
    case "kuji":
      return { id: "kuji", count: 7 };
    case "yoyo":
      return {
        id: "yoyo",
        hookX: 0,
        dir: 1,
        balloons: YOYO_POS.map((x, i) => ({ x, phase: i * 1.3, alive: true })),
        triesLeft: 4,
        caught: 0,
      };
    case "kingyo":
      return { id: "kingyo", fishX: 0, dir: 1, poiLeft: 3, caught: 0 };
    case "shateki":
      return {
        id: "shateki",
        aimX: 0,
        dir: 1,
        shotsLeft: 6,
        targets: SHATEKI_TARGETS.map((x, i) => ({
          x,
          up: i % 2 === 0,
          timer: SHATEKI_UP * (0.5 + 0.25 * i),
          alive: true,
        })),
        hits: 0,
      };
  }
};

/** 0..1 をピンポン往復させる */
const pingPong = (
  t: number,
  dir: 1 | -1,
  speed: number,
  dt: number,
): { t: number; dir: 1 | -1 } => {
  let nt = t + dir * speed * dt;
  let nd = dir;
  if (nt > 1) {
    nt = 2 - nt;
    nd = -1;
  } else if (nt < 0) {
    nt = -nt;
    nd = 1;
  }
  return { t: nt, dir: nd };
};

/** 的の出没（ポップアップ）を 1 ステップ進める */
const stepTarget = (target: Target, dt: number): Target => {
  if (!target.alive) return target;
  let timer = target.timer - dt;
  let up = target.up;
  if (timer <= 0) {
    up = !up;
    timer += up ? SHATEKI_UP : SHATEKI_DOWN;
  }
  return { ...target, up, timer };
};

export const stepMinigame = (state: MinigameState, dt: number): MinigameState => {
  switch (state.id) {
    case "kuji":
      return state;
    case "yoyo": {
      const p = pingPong(state.hookX, state.dir, SPEED.yoyo, dt);
      const balloons = state.balloons.map((b) =>
        b.alive ? { ...b, phase: b.phase + BOB_SPEED * dt } : b,
      );
      return { ...state, hookX: p.t, dir: p.dir, balloons };
    }
    case "kingyo": {
      if (state.poiLeft === 0) return state;
      const p = pingPong(state.fishX, state.dir, SPEED.kingyo, dt);
      return { ...state, fishX: p.t, dir: p.dir };
    }
    case "shateki": {
      if (state.shotsLeft === 0) return state;
      const p = pingPong(state.aimX, state.dir, SPEED.shateki, dt);
      return { ...state, aimX: p.t, dir: p.dir, targets: state.targets.map((t) => stepTarget(t, dt)) };
    }
  }
};

/** 掬える/撃てる対象のうち、マーカーに最も近い index。なければ -1 */
const nearestIndex = (
  markerX: number,
  window: number,
  items: readonly { readonly x: number }[],
  eligible: (i: number) => boolean,
): number => {
  let best = -1;
  let bestD = window;
  items.forEach((it, i) => {
    if (!eligible(i)) return;
    const d = Math.abs(markerX - it.x);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
};

export const pressMinigame = (state: MinigameState): MinigamePress => {
  switch (state.id) {
    case "kuji":
      // くじ引きは選択（pickLot）で操作する。press は何もしない
      return { state, hit: false };
    case "yoyo": {
      if (state.triesLeft === 0) return { state, hit: false };
      const idx = nearestIndex(
        state.hookX,
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
      if (state.poiLeft === 0) return { state, hit: false };
      const hit = Math.abs(state.fishX - 0.5) <= HIT_WINDOW.kingyo;
      return {
        state: {
          ...state,
          poiLeft: state.poiLeft - 1,
          caught: state.caught + (hit ? 1 : 0),
          last: hit ? "hit" : "miss",
        },
        hit,
      };
    }
    case "shateki": {
      if (state.shotsLeft === 0) return { state, hit: false };
      const idx = nearestIndex(
        state.aimX,
        HIT_WINDOW.shateki,
        state.targets,
        (i) => (state.targets[i]?.alive ?? false) && (state.targets[i]?.up ?? false),
      );
      const hit = idx >= 0;
      const targets = state.targets.map((t, i) =>
        i === idx ? { ...t, alive: false, up: false } : t,
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
  }
};

/** くじ引き: index の伏せ札を選んで運勢を確定する（選択済みなら何もしない） */
export const pickLot = (state: KujiState, index: number, rng: Rng): KujiState => {
  if (state.picked !== undefined) return state;
  return { ...state, picked: index, result: fortuneFromRng(rng()) };
};

/** これ以上操作できない（結果画面を出すべき）状態か */
export const isFinished = (state: MinigameState): boolean => {
  switch (state.id) {
    case "kuji":
      return state.picked !== undefined;
    case "yoyo":
      return state.triesLeft === 0 || state.balloons.every((b) => !b.alive);
    case "kingyo":
      return state.poiLeft === 0;
    case "shateki":
      return state.shotsLeft === 0 || state.targets.every((t) => !t.alive);
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
  }
};
