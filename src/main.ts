// 配線層: 固定タイムステップのゲームループで game(純粋) と render/input/ui/audio(副作用) を繋ぐ
import { createAudio } from "./audio";
import { type GameAction, applyAction } from "./game/actions";
import { initialGameState } from "./game/state";
import type { GameEvent, GameState } from "./game/types";
import { update } from "./game/update";
import { createKeyboardInput } from "./input/keyboard";
import { combineInputs, createTouchInput, isTouchDevice } from "./input/touch";
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

const audio = createAudio();
const view = await createGameView(container, {
  onFireworkBurst: () => audio.play("burst"),
});
// タッチ操作系は preact 管理外の専用オーバーレイ（body 直下）に置く
const input = isTouchDevice()
  ? combineInputs(createKeyboardInput(), createTouchInput())
  : createKeyboardInput();

// autoplay 制限: 最初のユーザー操作で BGM を開始
const startAudioOnce = (): void => {
  audio.start();
  window.removeEventListener("pointerdown", startAudioOnce);
  window.removeEventListener("keydown", startAudioOnce);
};
window.addEventListener("pointerdown", startAudioOnce);
window.addEventListener("keydown", startAudioOnce);

// UI からの操作はキューに積み、ループの先頭で純粋に適用する
const pendingActions: GameAction[] = [];
const dispatch = (action: GameAction): void => {
  pendingActions.push(action);
};
mountUi(uiRoot, dispatch, () => audio.toggleBgm());

let state: GameState = initialGameState;

// イベント → 演出・音へのディスパッチ
const handleEvents = (events: readonly GameEvent[]): void => {
  for (const e of events) {
    switch (e.kind) {
      case "firework-launched":
        view.spawnFirework(e.seed, state.time);
        audio.play("launch");
        break;
      case "item-eaten":
        audio.play("buy");
        break;
      case "minigame-hit":
        audio.play("hit");
        break;
      case "minigame-miss":
        audio.play("miss");
        break;
    }
  }
};

let accumulator = 0;
let last = performance.now();

const loop = (now: number): void => {
  accumulator += Math.min((now - last) / 1000, MAX_FRAME_TIME);
  last = now;

  for (const action of pendingActions.splice(0)) {
    const result = applyAction(state, action);
    state = result.state;
    handleEvents(result.events);
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
  // dev ビルド限定の E2E 補助（プレイヤー位置の読み出し）。本番ビルドでは除去される
  if (import.meta.env.DEV) {
    (window as unknown as { __pos?: typeof state.player.pos }).__pos = state.player.pos;
  }
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
