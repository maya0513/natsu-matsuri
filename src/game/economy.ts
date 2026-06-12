import type { GameState, ItemId, Result } from "./types";

/** 購入。所持金が足りなければ失敗し、状態は変えない */
export const buy = (
  state: GameState,
  item: ItemId,
  price: number,
): Result<GameState, "insufficient-funds"> => {
  if (state.money < price) return { ok: false, error: "insufficient-funds" };
  return {
    ok: true,
    value: {
      ...state,
      money: state.money - price,
      inventory: [...state.inventory, item],
    },
  };
};
