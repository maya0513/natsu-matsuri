// 配線層: 固定タイムステップのゲームループで game(純粋) と render/input/ui(副作用) を繋ぐ
import { type GameAction, applyAction } from "./game/actions";
import { initialGameState } from "./game/state";
import type { GameEvent, GameState } from "./game/types";
import { update } from "./game/update";
import { createKeyboardInput } from "./input/keyboard";
import { createGameView } from "./render/view";
import { publish } from "./ui/bridge";
import { mountUi } from "./ui/mount";
import "./style.css";

const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25; // タブ復帰時のスパイラル防止

const container = document.querySelector<HTMLElement>("#game");
if (!container) throw new Error("#game が見つからない");

const uiRoot = document.querySelector<HTMLElement>("#ui");
if (!uiRoot) throw new Error("#ui が見つからない");

const view = await createGameView(container);
const input = createKeyboardInput();

// UI からの操作はキューに積み、ループの先頭で純粋に適用する
const pendingActions: GameAction[] = [];
const dispatch = (action: GameAction): void => {
  pendingActions.push(action);
};
mountUi(uiRoot, dispatch);

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

  for (const action of pendingActions.splice(0)) {
    state = applyAction(state, action);
  }

  const intent = input.poll();
  while (accumulator >= FIXED_DT) {
    const result = update(state, intent, FIXED_DT, Math.random);
    state = result.state;
    handleEvents(result.events);
    accumulator -= FIXED_DT;
  }

  view.render(state);
  publish(state);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
