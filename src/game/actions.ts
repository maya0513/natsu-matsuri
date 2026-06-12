// UI 層から届く操作を状態に適用する純粋関数
import { addItem } from "./inventory";
import { priceAt } from "./items";
import { initMinigame, pressMinigame } from "./minigames";
import { STALLS } from "./stalls";
import type { GameState, ItemId, Rng } from "./types";

export type GameAction =
  | { readonly kind: "close-dialog" }
  | { readonly kind: "buy"; readonly item: ItemId }
  | { readonly kind: "start-minigame" }
  | { readonly kind: "minigame-press"; readonly rng: Rng }
  | { readonly kind: "retry-minigame" }
  | { readonly kind: "exit-minigame" };

export const applyAction = (state: GameState, action: GameAction): GameState => {
  switch (action.kind) {
    case "close-dialog": {
      if (state.mode.kind !== "dialog") return state;
      return { ...state, mode: { kind: "walk" } };
    }
    case "buy": {
      // お金の概念はない。その屋台で売っているものなら持ち物に入るだけ
      if (state.mode.kind !== "dialog") return state;
      if (priceAt(state.mode.stallId, action.item) === undefined) return state;
      return addItem(state, action.item);
    }
    case "start-minigame": {
      if (state.mode.kind !== "dialog") return state;
      const stallId = state.mode.stallId;
      const stall = STALLS.find((s) => s.id === stallId);
      if (stall?.kind !== "minigame") return state;
      // StallId のうちミニゲーム屋台は MinigameId と一致する
      if (
        stallId !== "kingyo" &&
        stallId !== "shateki" &&
        stallId !== "yoyo" &&
        stallId !== "kuji"
      ) {
        return state;
      }
      return { ...state, mode: { kind: "minigame", game: initMinigame(stallId) } };
    }
    case "minigame-press": {
      if (state.mode.kind !== "minigame") return state;
      const pressed = pressMinigame(state.mode.game, action.rng);
      let next: GameState = { ...state, mode: { kind: "minigame", game: pressed.state } };
      for (const prize of pressed.prizes) next = addItem(next, prize);
      return next;
    }
    case "retry-minigame": {
      if (state.mode.kind !== "minigame") return state;
      return { ...state, mode: { kind: "minigame", game: initMinigame(state.mode.game.id) } };
    }
    case "exit-minigame": {
      if (state.mode.kind !== "minigame") return state;
      return { ...state, mode: { kind: "walk" } };
    }
  }
};
