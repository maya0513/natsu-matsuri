// UI 層から届く操作を状態に適用する純粋関数
import { isOnMenu } from "./items";
import { commitMinigame, initMinigame, prizeOf } from "./minigames";
import { STALLS } from "./stalls";
import type { GameEvent, GameState, ItemId, MinigameId, Rng } from "./types";

export type GameAction =
  | { readonly kind: "close-dialog" }
  | { readonly kind: "eat"; readonly item: ItemId }
  | { readonly kind: "start-minigame" }
  /** ミニゲームの「決定」。カーソル位置の対象に作用する（引く/すくう/撃つ/叩く/玉引き） */
  | { readonly kind: "minigame-commit"; readonly rng: Rng }
  | { readonly kind: "retry-minigame" }
  | { readonly kind: "exit-minigame" };

const MINIGAME_IDS: ReadonlySet<MinigameId> = new Set([
  "kingyo",
  "shateki",
  "yoyo",
  "kuji",
  "senbiki",
  "mogura",
  "bingo",
]);

const isMinigameId = (id: string): id is MinigameId => MINIGAME_IDS.has(id as MinigameId);

export type ActionResult = {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
};

const noEvents = (state: GameState): ActionResult => ({ state, events: [] });

/** ミニゲームの「決定」結果を状態 + イベントへ反映する */
export const applyCommit = (state: GameState, rng: Rng): ActionResult => {
  if (state.mode.kind !== "minigame") return noEvents(state);
  const before = state.mode.game;
  const committed = commitMinigame(before, rng);
  if (committed.state === before) return noEvents(state); // 終了後など、何も起きない決定

  return {
    state: { ...state, mode: { kind: "minigame", game: committed.state } },
    events: [{ kind: committed.hit ? "minigame-hit" : "minigame-miss" }],
  };
};

export const applyAction = (state: GameState, action: GameAction): ActionResult => {
  switch (action.kind) {
    case "close-dialog": {
      if (state.mode.kind !== "dialog") return noEvents(state);
      return noEvents({ ...state, mode: { kind: "walk" } });
    }
    case "eat": {
      // 食べるだけ。お金はかからない。その屋台にある品物のみ。
      // 食べたらダイアログを閉じて walk に戻り、その品を手に持って歩く
      if (state.mode.kind !== "dialog") return noEvents(state);
      if (!isOnMenu(state.mode.stallId, action.item)) return noEvents(state);
      return {
        state: { ...state, mode: { kind: "walk" }, heldItem: action.item },
        events: [{ kind: "item-eaten" }],
      };
    }
    case "start-minigame": {
      if (state.mode.kind !== "dialog") return noEvents(state);
      const stallId = state.mode.stallId;
      const stall = STALLS.find((s) => s.id === stallId);
      if (stall?.kind !== "minigame") return noEvents(state);
      // StallId のうちミニゲーム屋台は MinigameId と一致する
      if (!isMinigameId(stallId)) return noEvents(state);
      return noEvents({ ...state, mode: { kind: "minigame", game: initMinigame(stallId) } });
    }
    case "minigame-commit": {
      return applyCommit(state, action.rng);
    }
    case "retry-minigame": {
      if (state.mode.kind !== "minigame") return noEvents(state);
      return noEvents({
        ...state,
        mode: { kind: "minigame", game: initMinigame(state.mode.game.id) },
      });
    }
    case "exit-minigame": {
      // 退出して walk に戻る。勝っていれば景品を手に持って歩く
      if (state.mode.kind !== "minigame") return noEvents(state);
      const prize = prizeOf(state.mode.game);
      const walk: GameState = { ...state, mode: { kind: "walk" } };
      return noEvents(prize ? { ...walk, heldItem: prize } : walk);
    }
  }
};
