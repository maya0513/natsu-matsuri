import { describe, expect, it } from "vitest";
import { type GameAction, applyAction } from "./actions";
import { initialGameState } from "./state";
import type { GameState } from "./types";

/** 状態だけ欲しいときのショートハンド */
const apply = (s: GameState, a: GameAction): GameState => applyAction(s, a).state;

const dialogAt = (stallId: "takoyaki" | "kingyo"): GameState => ({
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

describe("applyAction: buy（お金は消費しない）", () => {
  it("売っている屋台のダイアログ中なら持ち物に入り、購入イベントが出る", () => {
    const r = applyAction(dialogAt("takoyaki"), { kind: "buy", item: "takoyaki" });
    expect(r.state.inventory).toEqual(["takoyaki"]);
    expect(r.state.mode.kind).toBe("dialog"); // 買ってもダイアログは開いたまま
    expect(r.events).toEqual([{ kind: "item-bought" }]);
  });

  it("何度でも買える（コストなし）", () => {
    let s = dialogAt("takoyaki");
    for (let i = 0; i < 5; i++) s = apply(s, { kind: "buy", item: "ramune" });
    expect(s.inventory).toHaveLength(5);
  });

  it("その屋台で売っていないものは買えない", () => {
    const before = dialogAt("takoyaki");
    const r = applyAction(before, { kind: "buy", item: "ringoame" });
    expect(r.state).toBe(before);
    expect(r.events).toEqual([]);
  });

  it("walk モードでは買えない", () => {
    const s = apply(initialGameState, { kind: "buy", item: "takoyaki" });
    expect(s).toBe(initialGameState);
  });

  it("ミニゲーム屋台のダイアログでは buy は無効", () => {
    const s = apply(dialogAt("kingyo"), { kind: "buy", item: "goldfish" });
    expect(s.inventory).toEqual([]);
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

  it("minigame-press で景品が持ち物に入り、hit イベントが出る", () => {
    const inKuji: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kuji" } },
    };
    const r = applyAction(inKuji, { kind: "minigame-press", rng: () => 0.9 });
    expect(r.state.inventory).toEqual(["kuji-prize-big"]);
    expect(r.events).toEqual([{ kind: "minigame-hit" }]);
  });

  it("外したら miss イベント", () => {
    const inYoyo: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "yoyo", t: 0.05, dir: 1 } },
    };
    const r = applyAction(inYoyo, { kind: "minigame-press", rng: () => 0 });
    expect(r.state.inventory).toEqual([]);
    expect(r.events).toEqual([{ kind: "minigame-miss" }]);
  });

  it("終了後の press は無音（イベントなし）", () => {
    const done: GameState = {
      ...initialGameState,
      mode: {
        kind: "minigame",
        game: { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 0, caught: 1 },
      },
    };
    const r = applyAction(done, { kind: "minigame-press", rng: () => 0 });
    expect(r.state).toBe(done);
    expect(r.events).toEqual([]);
  });

  it("exit-minigame で walk に戻る", () => {
    const inKuji: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kuji" } },
    };
    const s = apply(inKuji, { kind: "exit-minigame" });
    expect(s.mode).toEqual({ kind: "walk" });
  });

  it("retry-minigame で同じゲームが最初から", () => {
    const worn: GameState = {
      ...initialGameState,
      mode: {
        kind: "minigame",
        game: { id: "kingyo", fishX: 0.7, dir: 1, poiLeft: 0, caught: 2 },
      },
    };
    const s = apply(worn, { kind: "retry-minigame" });
    if (s.mode.kind === "minigame" && s.mode.game.id === "kingyo") {
      expect(s.mode.game.poiLeft).toBe(3);
      expect(s.mode.game.caught).toBe(0);
    } else {
      throw new Error("minigame モードのはず");
    }
  });
});
