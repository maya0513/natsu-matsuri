import { applyAction, applyPress } from "./actions";
import { INTERACT_RADIUS } from "./constants";
import { stepFireworks } from "./fireworks";
import { isFinished, stepMinigame } from "./minigames";
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

  // キーボードだけで完結できるよう、各モードの「決定」を interact に集約する
  // （品物・くじ札の選択だけは数字キーで UI から dispatch される）
  if (working.mode.kind === "walk") {
    // walk 中に interact したら最寄りの屋台を調べる
    if (intent.interact) {
      const stall = nearestStall(player.pos, INTERACT_RADIUS);
      if (stall) working = { ...working, mode: { kind: "dialog", stallId: stall.id } };
    }
  } else if (working.mode.kind === "dialog") {
    // 受付ダイアログ: interact でミニゲーム屋台なら開始（食べ物屋台では何もしない）
    if (intent.interact) {
      const r = applyAction(working, { kind: "start-minigame" });
      working = r.state;
      events.push(...r.events);
    }
  } else if (working.mode.kind === "minigame") {
    // ミニゲーム: 時間経過でマーカーが動く。interact は状況により再挑戦/玉引き/押すになる
    working = {
      ...working,
      mode: { kind: "minigame", game: stepMinigame(working.mode.game, dt) },
    };
    if (intent.interact) {
      const game = working.mode.game;
      const r = isFinished(game)
        ? applyAction(working, { kind: "retry-minigame" })
        : game.id === "bingo"
          ? applyAction(working, { kind: "draw-ball", rng })
          : applyPress(working); // press 系。くじ/千本引きは no-op（選択は数字キー）
      working = r.state;
      events.push(...r.events);
    }
  }

  // 花火はモードに関わらず周期で上がり続ける
  const fw = stepFireworks(working.fireworks, time, rng);

  return {
    state: { ...working, fireworks: fw.state },
    events: [...events, ...fw.events],
  };
};
