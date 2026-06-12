// UI 層から届く操作を状態に適用する純粋関数
import { addItem } from "./inventory";
import { priceAt } from "./items";
import { initMinigame, pressMinigame } from "./minigames";
import { STALLS } from "./stalls";
import type { GameEvent, GameState, ItemId, Rng } from "./types";

export type GameAction =
  | { readonly kind: "close-dialog" }
  | { readonly kind: "buy"; readonly item: ItemId }
  | { readonly kind: "start-minigame" }
  | { readonly kind: "minigame-press"; readonly rng: Rng }
  | { readonly kind: "retry-minigame" }
  | { readonly kind: "exit-minigame" };

export type ActionResult = {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
};

const noEvents = (state: GameState): ActionResult => ({ state, events: [] });

/** ミニゲームの press 結果を状態 + イベントへ反映する（update 側と共用） */
export const applyPress = (state: GameState, rng: Rng): ActionResult => {
  if (state.mode.kind !== "minigame") return noEvents(state);
  const before = state.mode.game;
  const pressed = pressMinigame(before, rng);
  if (pressed.state === before) return noEvents(state); // 終了後など、何も起きない press

  let next: GameState = { ...state, mode: { kind: "minigame", game: pressed.state } };
  for (const prize of pressed.prizes) next = addItem(next, prize);
  return {
    state: next,
    events: [{ kind: pressed.prizes.length > 0 ? "minigame-hit" : "minigame-miss" }],
  };
};

export const applyAction = (state: GameState, action: GameAction): ActionResult => {
  switch (action.kind) {
    case "close-dialog": {
      if (state.mode.kind !== "dialog") return noEvents(state);
      return noEvents({ ...state, mode: { kind: "walk" } });
    }
    case "buy": {
      // お金の概念はない。その屋台で売っているものなら持ち物に入るだけ
      if (state.mode.kind !== "dialog") return noEvents(state);
      if (priceAt(state.mode.stallId, action.item) === undefined) return noEvents(state);
      return { state: addItem(state, action.item), events: [{ kind: "item-bought" }] };
    }
    case "start-minigame": {
      if (state.mode.kind !== "dialog") return noEvents(state);
      const stallId = state.mode.stallId;
      const stall = STALLS.find((s) => s.id === stallId);
      if (stall?.kind !== "minigame") return noEvents(state);
      // StallId のうちミニゲーム屋台は MinigameId と一致する
      if (
        stallId !== "kingyo" &&
        stallId !== "shateki" &&
        stallId !== "yoyo" &&
        stallId !== "kuji"
      ) {
        return noEvents(state);
      }
      return noEvents({ ...state, mode: { kind: "minigame", game: initMinigame(stallId) } });
    }
    case "minigame-press": {
      return applyPress(state, action.rng);
    }
    case "retry-minigame": {
      if (state.mode.kind !== "minigame") return noEvents(state);
      return noEvents({
        ...state,
        mode: { kind: "minigame", game: initMinigame(state.mode.game.id) },
      });
    }
    case "exit-minigame": {
      if (state.mode.kind !== "minigame") return noEvents(state);
      return noEvents({ ...state, mode: { kind: "walk" } });
    }
  }
};
