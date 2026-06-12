// UI 層のマウントエントリ（main.ts から呼ばれる）
import { render } from "preact";
import type { GameAction } from "../game/actions";
import { App } from "./App";

export const mountUi = (root: HTMLElement, dispatch: (action: GameAction) => void): void => {
  render(<App dispatch={dispatch} />, root);
};
