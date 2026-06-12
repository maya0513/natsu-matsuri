// 配線層: 固定タイムステップのゲームループで game(純粋) と render/input(副作用) を繋ぐ
import { initialGameState } from "./game/state";
import type { GameEvent, GameState } from "./game/types";
import { update } from "./game/update";
import { createKeyboardInput } from "./input/keyboard";
import { createGameView } from "./render/view";
import "./style.css";

const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25; // タブ復帰時のスパイラル防止

const container = document.querySelector<HTMLElement>("#game");
if (!container) throw new Error("#game が見つからない");

const view = createGameView(container);
const input = createKeyboardInput();

// M5 で音・花火演出のディスパッチ先になる
const handleEvents = (events: readonly GameEvent[]): void => {
  for (const e of events) {
    if (e.kind === "firework-launched") {
      console.debug("firework!", e.seed);
    }
  }
};

let state: GameState = initialGameState;
let accumulator = 0;
let last = performance.now();

const loop = (now: number): void => {
  accumulator += Math.min((now - last) / 1000, MAX_FRAME_TIME);
  last = now;

  const intent = input.poll();
  while (accumulator >= FIXED_DT) {
    const result = update(state, intent, FIXED_DT, Math.random);
    state = result.state;
    handleEvents(result.events);
    accumulator -= FIXED_DT;
  }

  view.render(state);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
