import { applyPress } from "./actions";
import { INTERACT_RADIUS } from "./constants";
import { stepFireworks } from "./fireworks";
import { stepMinigame } from "./minigames";
import { movePlayer } from "./movement";
import { nearestStall } from "./stalls";
import type { GameEvent, GameState, Intent, Rng, UpdateResult } from "./types";

/**
 * 固定タイムステップ 1 回分の純粋な状態更新。
 * 乱数は注入され、同じ入力からは常に同じ結果が得られる。
 */
export const update = (state: GameState, intent: Intent, dt: number, rng: Rng): UpdateResult => {
  const time = state.time + dt;

  // 移動は walk モードのみ。dialog/minigame 中は固定
  const player =
    state.mode.kind === "walk" ? movePlayer(state.player, intent.move, dt) : state.player;

  let working: GameState = { ...state, time, player };
  const events: GameEvent[] = [];

  if (working.mode.kind === "walk" && intent.interact) {
    // walk 中に interact したら最寄りの屋台に話しかける
    const stall = nearestStall(player.pos, INTERACT_RADIUS);
    if (stall) working = { ...working, mode: { kind: "dialog", stallId: stall.id } };
  } else if (working.mode.kind === "minigame") {
    // ミニゲーム: 時間経過でマーカーが動き、interact が「押す」になる
    working = {
      ...working,
      mode: { kind: "minigame", game: stepMinigame(working.mode.game, dt) },
    };
    if (intent.interact) {
      const pressed = applyPress(working, rng);
      working = pressed.state;
      events.push(...pressed.events);
    }
  }

  // 花火はモードに関わらず周期で上がり続ける
  const fw = stepFireworks(working.fireworks, time, rng);

  return {
    state: { ...working, fireworks: fw.state },
    events: [...events, ...fw.events],
  };
};
