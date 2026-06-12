import { stepFireworks } from "./fireworks";
import { movePlayer } from "./movement";
import type { GameState, Intent, Rng, UpdateResult } from "./types";

/**
 * 固定タイムステップ 1 回分の純粋な状態更新。
 * 乱数は注入され、同じ入力からは常に同じ結果が得られる。
 */
export const update = (state: GameState, intent: Intent, dt: number, rng: Rng): UpdateResult => {
  const time = state.time + dt;

  // 移動は walk モードのみ。dialog/minigame 中は固定
  const player =
    state.mode.kind === "walk" ? movePlayer(state.player, intent.move, dt) : state.player;

  // 花火はモードに関わらず周期で上がり続ける
  const fw = stepFireworks(state.fireworks, time, rng);

  return {
    state: { ...state, time, player, fireworks: fw.state },
    events: fw.events,
  };
};
