// キーボード → 抽象 Intent への変換。タッチ入力は M6 でここに並ぶ
import type { Intent, Vec2 } from "../game/types";

export type InputSource = {
  /** このフレームの Intent を取り出す。interact の押下エッジは消費される */
  readonly poll: () => Intent;
  readonly dispose: () => void;
};

const MOVE_KEYS: Record<string, Vec2> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const INTERACT_KEYS = new Set(["KeyE", "Enter", "Space"]);

export const createKeyboardInput = (target: Window = window): InputSource => {
  const pressed = new Set<string>();
  let interactQueued = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (INTERACT_KEYS.has(e.code)) interactQueued = true;
    if (e.code in MOVE_KEYS) pressed.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    pressed.delete(e.code);
  };
  const onBlur = () => {
    pressed.clear();
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);

  return {
    poll: () => {
      let x = 0;
      let y = 0;
      for (const code of pressed) {
        const v = MOVE_KEYS[code];
        if (v) {
          x += v.x;
          y += v.y;
        }
      }
      const interact = interactQueued;
      interactQueued = false;
      // 長さの正規化はロジック側（movePlayer）が保証する
      return { move: { x: Math.sign(x), y: Math.sign(y) }, interact };
    },
    dispose: () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
    },
  };
};
