import { describe, expect, it } from "vitest";
import { type GameAction, applyAction } from "./actions";
import { initialGameState } from "./state";
import type { GameState } from "./types";

/** 状態だけ欲しいときのショートハンド */
const apply = (s: GameState, a: GameAction): GameState => applyAction(s, a).state;

const dialogAt = (stallId: "takoyaki" | "juice" | "kingyo"): GameState => ({
  ...initialGameState,
  mode: { kind: "dialog", stallId },
});

describe("applyAction: close-dialog", () => {
  it("dialog モードなら walk に戻る", () => {
    const s = apply(dialogAt("takoyaki"), { kind: "close-dialog" });
    expect(s.mode).toEqual({ kind: "walk" });
  });

  it("walk モードでは何も起きない", () => {
    const s = apply(initialGameState, { kind: "close-dialog" });
    expect(s).toBe(initialGameState);
  });
});

describe("applyAction: eat（食べるだけ。持ち物もお金もない）", () => {
  it("その屋台にある品物なら item-eaten イベントが出て、閉じて手に持つ", () => {
    const r = applyAction(dialogAt("juice"), { kind: "eat", item: "ramune" });
    expect(r.state.mode).toEqual({ kind: "walk" }); // 食べたら閉じて walk に戻る
    expect(r.state.heldItem).toBe("ramune"); // 手に持って歩く
    expect(r.events).toEqual([{ kind: "item-eaten" }]);
  });

  it("別の品を食べると手持ちが差し替わる", () => {
    const first = applyAction(dialogAt("juice"), { kind: "eat", item: "juice" }).state;
    const second = applyAction(
      { ...first, mode: { kind: "dialog", stallId: "juice" } },
      { kind: "eat", item: "ramune" },
    ).state;
    expect(second.heldItem).toBe("ramune");
  });

  it("その屋台にない品物は食べられない", () => {
    const before = dialogAt("takoyaki");
    const r = applyAction(before, { kind: "eat", item: "ringoame" });
    expect(r.state).toBe(before);
    expect(r.events).toEqual([]);
  });

  it("walk モードでは食べられない", () => {
    const r = applyAction(initialGameState, { kind: "eat", item: "takoyaki" });
    expect(r.state).toBe(initialGameState);
    expect(r.events).toEqual([]);
  });

  it("ミニゲーム屋台のダイアログでは eat は無効", () => {
    const before = dialogAt("kingyo");
    const r = applyAction(before, { kind: "eat", item: "takoyaki" });
    expect(r.state).toBe(before);
    expect(r.events).toEqual([]);
  });
});

describe("applyAction: ミニゲーム", () => {
  it("ミニゲーム屋台のダイアログから start-minigame で開始", () => {
    const s = apply(dialogAt("kingyo"), { kind: "start-minigame" });
    expect(s.mode.kind).toBe("minigame");
    if (s.mode.kind === "minigame") expect(s.mode.game.id).toBe("kingyo");
  });

  it("売買屋台のダイアログでは start-minigame は無効", () => {
    const before = dialogAt("takoyaki");
    expect(apply(before, { kind: "start-minigame" })).toBe(before);
  });

  const kingyoAt = (cursor: number, poiLeft = 3, caught = 0): GameState => ({
    ...initialGameState,
    mode: {
      kind: "minigame",
      game: {
        id: "kingyo",
        cursor,
        cursorY: 0.5,
        fish: [{ x: 0.5, y: 0.5, vx: 0.1, vy: 0, phase: 0, alive: true }],
        poiLeft,
        caught,
      },
    },
  });

  it("カーソル付近の金魚で決定すると当たり、hit イベントが出る", () => {
    const r = applyAction(kingyoAt(0.5), { kind: "minigame-commit", rng: () => 0 });
    expect(r.events).toEqual([{ kind: "minigame-hit" }]);
  });

  it("外したら miss イベント", () => {
    const r = applyAction(kingyoAt(0.05), { kind: "minigame-commit", rng: () => 0 });
    expect(r.events).toEqual([{ kind: "minigame-miss" }]);
  });

  it("終了後の決定は無音（イベントなし）", () => {
    const done = kingyoAt(0.5, 0, 1);
    const r = applyAction(done, { kind: "minigame-commit", rng: () => 0 });
    expect(r.state).toBe(done);
    expect(r.events).toEqual([]);
  });

  it("くじ引きの決定で運勢が出る。吉系は hit イベント", () => {
    const inKuji: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kuji", count: 9, cursor: 0.5 } },
    };
    const r = applyAction(inKuji, { kind: "minigame-commit", rng: () => 0 });
    expect(r.events).toEqual([{ kind: "minigame-hit" }]);
    if (r.state.mode.kind === "minigame" && r.state.mode.game.id === "kuji") {
      expect(r.state.mode.game.result).toBe("大吉");
    }
  });

  it("exit-minigame で walk に戻り、勝っていれば景品を手に持つ", () => {
    const s = apply(kingyoAt(0.5, 0, 2), { kind: "exit-minigame" });
    expect(s.mode).toEqual({ kind: "walk" });
    expect(s.heldItem).toBe("goldfish");
  });

  it("負けた退出では手持ちは変わらない", () => {
    const lostKingyo: GameState = { ...kingyoAt(0.5, 0, 0), heldItem: "takoyaki" };
    const s = apply(lostKingyo, { kind: "exit-minigame" });
    expect(s.heldItem).toBe("takoyaki");
  });

  it("retry-minigame で同じゲームが最初から", () => {
    const s = apply(kingyoAt(0.7, 0, 2), { kind: "retry-minigame" });
    if (s.mode.kind === "minigame" && s.mode.game.id === "kingyo") {
      expect(s.mode.game.poiLeft).toBeGreaterThan(0);
      expect(s.mode.game.caught).toBe(0);
    } else {
      throw new Error("minigame モードのはず");
    }
  });
});
