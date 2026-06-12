// 持ち物の操作
import type { GameState, ItemId } from "./types";

/** アイテムを持ち物に追加する（同一アイテムの重複可） */
export const addItem = (state: GameState, item: ItemId): GameState => ({
  ...state,
  inventory: [...state.inventory, item],
});
