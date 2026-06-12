// ミニゲーム共通の入口。
// stepMinigame: 時間経過（マーカーの発振など）/ pressMinigame: 「押す」操作
import type { ItemId, MinigameId, MinigameState, Rng } from "../types";

/** 成功判定の窓（中央 0.5 からの距離） */
export const HIT_WINDOW = {
  yoyo: 0.18,
  kingyo: 0.15,
  shateki: 0.12,
} as const;

/** マーカーの速さ（往復/秒換算の係数） */
const SPEED = {
  yoyo: 1.2,
  kingyo: 0.8,
  shateki: 1.0,
} as const;

/** 射的の的の位置 */
export const SHATEKI_TARGETS = [0.2, 0.5, 0.8] as const;

export type MinigamePress = {
  readonly state: MinigameState;
  readonly prizes: readonly ItemId[];
};

export const initMinigame = (id: MinigameId): MinigameState => {
  switch (id) {
    case "kuji":
      return { id: "kuji" };
    case "yoyo":
      return { id: "yoyo", t: 0, dir: 1 };
    case "kingyo":
      return { id: "kingyo", fishX: 0, dir: 1, poiLeft: 3, caught: 0 };
    case "shateki":
      return { id: "shateki", aimX: 0, dir: 1, shotsLeft: 3, targets: [true, true, true] };
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

export const stepMinigame = (state: MinigameState, dt: number): MinigameState => {
  switch (state.id) {
    case "kuji":
      return state;
    case "yoyo": {
      const p = pingPong(state.t, state.dir, SPEED.yoyo, dt);
      return { ...state, t: p.t, dir: p.dir };
    }
    case "kingyo": {
      if (state.poiLeft === 0) return state;
      const p = pingPong(state.fishX, state.dir, SPEED.kingyo, dt);
      return { ...state, fishX: p.t, dir: p.dir };
    }
    case "shateki": {
      if (state.shotsLeft === 0) return state;
      const p = pingPong(state.aimX, state.dir, SPEED.shateki, dt);
      return { ...state, aimX: p.t, dir: p.dir };
    }
  }
};

export const pressMinigame = (state: MinigameState, rng: Rng): MinigamePress => {
  switch (state.id) {
    case "kuji": {
      const prize: ItemId = rng() < 0.75 ? "kuji-prize-small" : "kuji-prize-big";
      return { state: { ...state, last: prize }, prizes: [prize] };
    }
    case "yoyo": {
      const hit = Math.abs(state.t - 0.5) <= HIT_WINDOW.yoyo;
      return {
        state: { ...state, last: hit ? "hit" : "miss" },
        prizes: hit ? ["yoyo-balloon"] : [],
      };
    }
    case "kingyo": {
      if (state.poiLeft === 0) return { state, prizes: [] };
      const hit = Math.abs(state.fishX - 0.5) <= HIT_WINDOW.kingyo;
      return {
        state: {
          ...state,
          poiLeft: state.poiLeft - 1,
          caught: state.caught + (hit ? 1 : 0),
          last: hit ? "hit" : "miss",
        },
        prizes: hit ? ["goldfish"] : [],
      };
    }
    case "shateki": {
      if (state.shotsLeft === 0) return { state, prizes: [] };
      const hitIndex = SHATEKI_TARGETS.findIndex(
        (tx, i) => state.targets[i] && Math.abs(state.aimX - tx) <= HIT_WINDOW.shateki,
      );
      const targets = state.targets.map((alive, i) => (i === hitIndex ? false : alive)) as [
        boolean,
        boolean,
        boolean,
      ];
      return {
        state: {
          ...state,
          shotsLeft: state.shotsLeft - 1,
          targets,
          last: hitIndex >= 0 ? "hit" : "miss",
        },
        prizes: hitIndex >= 0 ? ["shateki-prize"] : [],
      };
    }
  }
};

/** これ以上操作できない（結果画面を出すべき）状態か */
export const isFinished = (state: MinigameState): boolean => {
  switch (state.id) {
    case "kuji":
      return false;
    case "yoyo":
      return false;
    case "kingyo":
      return state.poiLeft === 0;
    case "shateki":
      return state.shotsLeft === 0 || state.targets.every((t) => !t);
  }
};
