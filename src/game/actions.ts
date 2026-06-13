// UI 層から届く操作を状態に適用する純粋関数
import { isOnMenu } from "./items";
import { initMinigame, pickLot, pressMinigame, prizeOf } from "./minigames";
import { STALLS } from "./stalls";
import type { GameEvent, GameState, ItemId, Rng } from "./types";

export type GameAction =
  | { readonly kind: "close-dialog" }
  | { readonly kind: "eat"; readonly item: ItemId }
  | { readonly kind: "start-minigame" }
  | { readonly kind: "minigame-press" }
  | { readonly kind: "pick-lot"; readonly index: number; readonly rng: Rng }
  | { readonly kind: "retry-minigame" }
  | { readonly kind: "exit-minigame" };

export type ActionResult = {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
};

const noEvents = (state: GameState): ActionResult => ({ state, events: [] });

/** ミニゲームの press 結果を状態 + イベントへ反映する（update 側と共用） */
export const applyPress = (state: GameState): ActionResult => {
  if (state.mode.kind !== "minigame") return noEvents(state);
  const before = state.mode.game;
  const pressed = pressMinigame(before);
  if (pressed.state === before) return noEvents(state); // 終了後など、何も起きない press

  return {
    state: { ...state, mode: { kind: "minigame", game: pressed.state } },
    events: [{ kind: pressed.hit ? "minigame-hit" : "minigame-miss" }],
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
      return applyPress(state);
    }
    case "pick-lot": {
      // くじ引き（おみくじ）: 伏せ札を選ぶと運勢が確定する
      if (state.mode.kind !== "minigame" || state.mode.game.id !== "kuji") return noEvents(state);
      const picked = pickLot(state.mode.game, action.index, action.rng);
      if (picked === state.mode.game) return noEvents(state); // 選択済みなど
      const good = prizeOf(picked) !== undefined;
      return {
        state: { ...state, mode: { kind: "minigame", game: picked } },
        events: [{ kind: good ? "minigame-hit" : "minigame-miss" }],
      };
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
