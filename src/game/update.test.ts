import { describe, expect, it } from "vitest";
import { FIREWORKS_FIRST_LAUNCH, PLAYER_SPEED } from "./constants";
import { initialGameState } from "./state";
import type { GameState, Intent, Rng } from "./types";
import { update } from "./update";

const idle: Intent = { move: { x: 0, y: 0 }, interact: false };
const rng: Rng = () => 0.5;

const run = (state: GameState, intent: Intent, dt: number) => update(state, intent, dt, rng);

describe("update（固定タイムステップ統合）", () => {
  it("経過時間が dt ずつ積算される", () => {
    const { state } = run(initialGameState, idle, 1 / 60);
    expect(state.time).toBeCloseTo(1 / 60);
  });

  it("walk モードでは移動入力が反映される", () => {
    const intent: Intent = { move: { x: 1, y: 0 }, interact: false };
    const { state } = run(initialGameState, intent, 0.5);
    expect(state.player.pos.x).toBeCloseTo(initialGameState.player.pos.x + PLAYER_SPEED * 0.5);
  });

  it("dialog モード中は移動しない", () => {
    const inDialog: GameState = {
      ...initialGameState,
      mode: { kind: "dialog", stallId: "takoyaki" },
    };
    const intent: Intent = { move: { x: 1, y: 0 }, interact: false };
    const { state } = run(inDialog, intent, 0.5);
    expect(state.player.pos).toEqual(initialGameState.player.pos);
  });

  it("花火の打ち上げ時刻を跨ぐとイベントが届く", () => {
    const before: GameState = {
      ...initialGameState,
      time: FIREWORKS_FIRST_LAUNCH - 0.01,
    };
    const { events } = run(before, idle, 0.02);
    expect(events).toEqual([{ kind: "firework-launched", seed: 0.5 }]);
  });

  it("モードに関わらず花火は上がり続ける（dialog 中でも）", () => {
    const before: GameState = {
      ...initialGameState,
      time: FIREWORKS_FIRST_LAUNCH - 0.01,
      mode: { kind: "dialog", stallId: "takoyaki" },
    };
    const { events } = run(before, idle, 0.02);
    expect(events).toHaveLength(1);
  });

  it("屋台の近くで interact すると dialog モードになる", () => {
    const nearTakoyaki: GameState = {
      ...initialGameState,
      player: { ...initialGameState.player, pos: { x: -4, y: 10 } },
    };
    const { state } = run(nearTakoyaki, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    expect(state.mode).toEqual({ kind: "dialog", stallId: "takoyaki" });
  });

  it("屋台から遠い場所で interact しても何も起きない", () => {
    const { state } = run(initialGameState, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    expect(state.mode).toEqual({ kind: "walk" });
  });

  it("ダイアログ中の interact では遷移しない（操作は UI 層が処理）", () => {
    for (const stallId of ["takoyaki", "yakisoba", "kingyo"] as const) {
      const inDialog: GameState = {
        ...initialGameState,
        mode: { kind: "dialog", stallId },
      };
      const { state } = run(inDialog, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
      expect(state.mode).toEqual({ kind: "dialog", stallId });
    }
  });

  it("minigame モードではマーカーが時間で進む", () => {
    const s: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kingyo", fishX: 0, dir: 1, poiLeft: 3, caught: 0 } },
    };
    const { state } = run(s, idle, 0.1);
    expect(state.mode.kind).toBe("minigame");
    if (state.mode.kind === "minigame" && state.mode.game.id === "kingyo") {
      expect(state.mode.game.fishX).toBeGreaterThan(0);
    }
  });

  it("minigame モード中の interact ではコアは押さない（UI が処理）", () => {
    const s: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 3, caught: 0 } },
    };
    const { state, events } = run(s, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    expect(events).toEqual([]);
    if (state.mode.kind === "minigame" && state.mode.game.id === "kingyo") {
      expect(state.mode.game.caught).toBe(0);
    }
  });

  it("minigame モード中は移動しない", () => {
    const s: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kuji" } },
    };
    const { state } = run(s, { move: { x: 1, y: 0 }, interact: false }, 0.5);
    expect(state.player.pos).toEqual(initialGameState.player.pos);
  });

  it("状態は不変（入力の state オブジェクトを破壊しない）", () => {
    const frozen = Object.freeze(structuredClone(initialGameState));
    const intent: Intent = { move: { x: 1, y: 1 }, interact: false };
    expect(() => run(frozen as GameState, intent, 0.1)).not.toThrow();
  });
});
