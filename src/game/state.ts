import { INITIAL_MONEY } from "./constants";
import { initialFireworks } from "./fireworks";
import type { GameState } from "./types";

/** ゲーム開始時の状態（セーブなし方針のため毎回ここから） */
export const initialGameState: GameState = {
  time: 0,
  player: {
    pos: { x: 0, y: 18 }, // 参道の入り口（鳥居側）からスタート
    facing: "up",
    moving: false,
  },
  money: INITIAL_MONEY,
  inventory: [],
  mode: { kind: "walk" },
  fireworks: initialFireworks,
};
