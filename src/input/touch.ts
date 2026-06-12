// タッチ入力: 仮想スティック（左下）+ アクションボタン（右下）。
// タッチデバイス（pointer: coarse）でのみ表示される
import type { Intent, Vec2 } from "../game/types";
import type { InputSource } from "./keyboard";

const STICK_SIZE = 112;
const KNOB_SIZE = 48;
const RADIUS = (STICK_SIZE - KNOB_SIZE) / 2;

export const isTouchDevice = (): boolean =>
  window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

export const createTouchInput = (container: HTMLElement): InputSource => {
  let move: Vec2 = { x: 0, y: 0 };
  let interactQueued = false;

  // --- 仮想スティック ---
  const base = document.createElement("div");
  base.style.cssText = [
    "position: absolute",
    "left: 24px",
    "bottom: 24px",
    `width: ${STICK_SIZE}px`,
    `height: ${STICK_SIZE}px`,
    "border-radius: 50%",
    "background: rgba(15, 23, 42, 0.55)",
    "border: 2px solid rgba(148, 163, 184, 0.4)",
    "touch-action: none",
  ].join(";");

  const knob = document.createElement("div");
  knob.style.cssText = [
    "position: absolute",
    `left: ${RADIUS}px`,
    `top: ${RADIUS}px`,
    `width: ${KNOB_SIZE}px`,
    `height: ${KNOB_SIZE}px`,
    "border-radius: 50%",
    "background: rgba(148, 163, 184, 0.7)",
    "pointer-events: none",
  ].join(";");
  base.appendChild(knob);

  let activePointer: number | undefined;

  const setKnob = (dx: number, dy: number): void => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const onPointerDown = (e: PointerEvent): void => {
    activePointer = e.pointerId;
    base.setPointerCapture(e.pointerId);
    onPointerMove(e);
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob(dx, dy);
    move = { x: dx / RADIUS, y: dy / RADIUS };
  };
  const onPointerEnd = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    activePointer = undefined;
    setKnob(0, 0);
    move = { x: 0, y: 0 };
  };

  base.addEventListener("pointerdown", onPointerDown);
  base.addEventListener("pointermove", onPointerMove);
  base.addEventListener("pointerup", onPointerEnd);
  base.addEventListener("pointercancel", onPointerEnd);

  // --- アクションボタン ---
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "🏮";
  button.style.cssText = [
    "position: absolute",
    "right: 28px",
    "bottom: 32px",
    "width: 72px",
    "height: 72px",
    "border-radius: 50%",
    "background: rgba(225, 29, 72, 0.55)",
    "border: 2px solid rgba(251, 191, 36, 0.5)",
    "font-size: 28px",
    "touch-action: manipulation",
  ].join(";");
  const onAction = (e: Event): void => {
    e.preventDefault();
    interactQueued = true;
  };
  button.addEventListener("pointerdown", onAction);

  container.appendChild(base);
  container.appendChild(button);

  return {
    poll: (): Intent => {
      const interact = interactQueued;
      interactQueued = false;
      return { move, interact };
    },
    dispose: () => {
      base.remove();
      button.remove();
    },
  };
};

/** 複数の入力ソースを合成する（move は加算、interact は OR） */
export const combineInputs = (...sources: InputSource[]): InputSource => ({
  poll: () => {
    let x = 0;
    let y = 0;
    let interact = false;
    for (const s of sources) {
      const i = s.poll();
      x += i.move.x;
      y += i.move.y;
      interact ||= i.interact;
    }
    return { move: { x, y }, interact };
  },
  dispose: () => {
    for (const s of sources) s.dispose();
  },
});
