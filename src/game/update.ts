import { INTERACT_RADIUS } from "./constants";
import { stepFireworks } from "./fireworks";
import { pressMinigame, stepMinigame } from "./minigames";
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
  let inventory = state.inventory;
  if (state.mode.kind === "walk" && intent.interact) {
    const stall = nearestStall(player.pos, INTERACT_RADIUS);
    if (stall) mode = { kind: "dialog", stallId: stall.id };
  } else if (state.mode.kind === "minigame") {
    // ミニゲーム: 時間経過でマーカーが動き、interact が「押す」になる
    let game = stepMinigame(state.mode.game, dt);
    if (intent.interact) {
      const pressed = pressMinigame(game, rng);
      game = pressed.state;
      for (const prize of pressed.prizes) {
        inventory = [...inventory, prize];
      }
    }
    mode = { kind: "minigame", game };
  }

  // 花火はモードに関わらず周期で上がり続ける
  const fw = stepFireworks(state.fireworks, time, rng);

  return {
    state: { ...state, time, player, mode, inventory, fireworks: fw.state },
    events: fw.events,
  };
};
