import { initialFireworks } from "./fireworks";
import type { GameState } from "./types";

/** ゲーム開始時の状態（セーブなし方針のため毎回ここから） */
export const initialGameState: GameState = {
  time: 0,
  player: {
    pos: { x: 0, y: 31 }, // 祭りの広場の入口（南）からスタート。北へ進むと鳥居→神社の敷地→社
    facing: "up",
    moving: false,
  },
  mode: { kind: "walk" },
  fireworks: initialFireworks,
};
