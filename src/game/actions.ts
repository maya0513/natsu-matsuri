// UI 層から届く操作を状態に適用する純粋関数
import { addItem } from "./inventory";
import { priceAt } from "./items";
import type { GameState, ItemId } from "./types";

export type GameAction =
  | { readonly kind: "close-dialog" }
  | { readonly kind: "buy"; readonly item: ItemId };

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
  }
};
