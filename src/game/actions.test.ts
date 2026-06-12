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
