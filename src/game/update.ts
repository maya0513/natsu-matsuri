import { INTERACT_RADIUS } from "./constants";
import { stepFireworks } from "./fireworks";
import { movePlayer } from "./movement";
import { nearestStall } from "./stalls";
import type { GameState, Intent, Mode, Rng, UpdateResult } from "./types";

/**
 * 固定タイムステップ 1 回分の純粋な状態更新。
 * 乱数は注入され、同じ入力からは常に同じ結果が得られる。
 */
export const update = (state: GameState, intent: Intent, dt: number, rng: Rng): UpdateResult => {
  const time = state.time + dt;

  // 移動は walk モードのみ。dialog/minigame 中は固定
  const player =
    state.mode.kind === "walk" ? movePlayer(state.player, intent.move, dt) : state.player;

  // walk 中に interact したら最寄りの屋台に話しかける
  let mode: Mode = state.mode;
  if (state.mode.kind === "walk" && intent.interact) {
    const stall = nearestStall(player.pos, INTERACT_RADIUS);
    if (stall) mode = { kind: "dialog", stallId: stall.id };
  }

  // 花火はモードに関わらず周期で上がり続ける
  const fw = stepFireworks(state.fireworks, time, rng);

  return {
    state: { ...state, time, player, mode, fireworks: fw.state },
    events: fw.events,
  };
};
