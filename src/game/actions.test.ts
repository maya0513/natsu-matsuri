import { describe, expect, it } from "vitest";
import { applyAction } from "./actions";
import { initialGameState } from "./state";
import type { GameState } from "./types";

const dialogAt = (stallId: "takoyaki" | "kingyo"): GameState => ({
  ...initialGameState,
  mode: { kind: "dialog", stallId },
});

describe("applyAction: close-dialog", () => {
  it("dialog モードなら walk に戻る", () => {
    const s = applyAction(dialogAt("takoyaki"), { kind: "close-dialog" });
    expect(s.mode).toEqual({ kind: "walk" });
  });

  it("walk モードでは何も起きない", () => {
    const s = applyAction(initialGameState, { kind: "close-dialog" });
    expect(s).toBe(initialGameState);
  });
});

describe("applyAction: buy（お金は消費しない）", () => {
  it("売っている屋台のダイアログ中なら持ち物に入る", () => {
    const s = applyAction(dialogAt("takoyaki"), { kind: "buy", item: "takoyaki" });
    expect(s.inventory).toEqual(["takoyaki"]);
    expect(s.mode.kind).toBe("dialog"); // 買ってもダイアログは開いたまま
  });

  it("何度でも買える（コストなし）", () => {
    let s = dialogAt("takoyaki");
    for (let i = 0; i < 5; i++) s = applyAction(s, { kind: "buy", item: "ramune" });
    expect(s.inventory).toHaveLength(5);
  });

  it("その屋台で売っていないものは買えない", () => {
    const before = dialogAt("takoyaki");
    const s = applyAction(before, { kind: "buy", item: "ringoame" });
    expect(s).toBe(before);
  });

  it("walk モードでは買えない", () => {
    const s = applyAction(initialGameState, { kind: "buy", item: "takoyaki" });
    expect(s).toBe(initialGameState);
  });

  it("ミニゲーム屋台のダイアログでは buy は無効", () => {
    const s = applyAction(dialogAt("kingyo"), { kind: "buy", item: "goldfish" });
    expect(s.inventory).toEqual([]);
  });
});

describe("applyAction: ミニゲーム", () => {
  it("ミニゲーム屋台のダイアログから start-minigame で開始", () => {
    const s = applyAction(dialogAt("kingyo"), { kind: "start-minigame" });
    expect(s.mode.kind).toBe("minigame");
    if (s.mode.kind === "minigame") expect(s.mode.game.id).toBe("kingyo");
  });

  it("売買屋台のダイアログでは start-minigame は無効", () => {
    const before = dialogAt("takoyaki");
    expect(applyAction(before, { kind: "start-minigame" })).toBe(before);
  });

  it("minigame-press で押す操作（くじを引く）が動き、景品が持ち物へ", () => {
    const inKuji: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kuji" } },
    };
    const s = applyAction(inKuji, { kind: "minigame-press", rng: () => 0.9 });
    expect(s.inventory).toEqual(["kuji-prize-big"]);
  });

  it("exit-minigame で walk に戻る", () => {
    const inKuji: GameState = {
      ...initialGameState,
      mode: { kind: "minigame", game: { id: "kuji" } },
    };
    const s = applyAction(inKuji, { kind: "exit-minigame" });
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
    const s = applyAction(worn, { kind: "retry-minigame" });
    if (s.mode.kind === "minigame" && s.mode.game.id === "kingyo") {
      expect(s.mode.game.poiLeft).toBe(3);
      expect(s.mode.game.caught).toBe(0);
    } else {
      throw new Error("minigame モードのはず");
    }
  });
});
