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

  it("複数品の食べ物屋台のダイアログでは interact で遷移しない（選択は数字キー）", () => {
    // たこ焼き屋は たこ焼き＋ラムネ の 2 品
    const inDialog: GameState = {
      ...initialGameState,
      mode: { kind: "dialog", stallId: "takoyaki" },
    };
    const { state } = run(inDialog, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    expect(state.mode).toEqual({ kind: "dialog", stallId: "takoyaki" });
  });

  it("単品の食べ物屋台のダイアログでは interact でその品を買う", () => {
    // 焼きそば屋は 1 品なので E で買える
    const inDialog: GameState = {
      ...initialGameState,
      mode: { kind: "dialog", stallId: "yakisoba" },
    };
    const { state, events } = run(inDialog, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    expect(state.mode).toEqual({ kind: "walk" });
    expect(state.heldItem).toBe("yakisoba");
    expect(events).toEqual([{ kind: "item-eaten" }]);
  });

  it("ミニゲーム屋台のダイアログでは interact でゲームが始まる", () => {
    const inDialog: GameState = {
      ...initialGameState,
      mode: { kind: "dialog", stallId: "kingyo" },
    };
    const { state } = run(inDialog, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    expect(state.mode.kind).toBe("minigame");
    if (state.mode.kind === "minigame") expect(state.mode.game.id).toBe("kingyo");
  });

  it("ミニゲーム終了後の interact で再挑戦になる（ポイ復活）", () => {
    const done: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 0, caught: 2 } },
    };
    const { state } = run(done, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    if (state.mode.kind === "minigame" && state.mode.game.id === "kingyo") {
      expect(state.mode.game.poiLeft).toBeGreaterThan(0);
      expect(state.mode.game.caught).toBe(0);
    }
  });

  it("ビンゴは interact で玉を引く", () => {
    const s: GameState = {
      ...initialGameState,
      mode: {
        kind: "minigame",
        game: { id: "bingo", card: [1, 2, 3, 4, 5, 6, 7, 8, 9], marked: Array(9).fill(false), drawn: [], bingo: false },
      },
    };
    const { state } = run(s, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    if (state.mode.kind === "minigame" && state.mode.game.id === "bingo") {
      expect(state.mode.game.drawn.length).toBe(1);
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

  it("minigame モードで interact すると press 扱いになり hit イベントが出る", () => {
    const s: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 3, caught: 0 } },
    };
    const { state, events } = run(s, { move: { x: 0, y: 0 }, interact: true }, 1 / 60);
    expect(events).toEqual([{ kind: "minigame-hit" }]);
    if (state.mode.kind === "minigame" && state.mode.game.id === "kingyo") {
      expect(state.mode.game.caught).toBe(1);
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
