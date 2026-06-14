import { initialFireworks } from "./fireworks";
import type { GameState } from "./types";

/** ゲーム開始時の状態（セーブなし方針のため毎回ここから） */
export const initialGameState: GameState = {
  time: 0,
  player: {
    pos: { x: 10, y: 29 }, // 鳥居の右下（南東）からスタート。直線の参道を上り、最後の右カーブの先に鳥居が現れる
    facing: "up",
    moving: false,
  },
  mode: { kind: "walk" },
  fireworks: initialFireworks,
};
