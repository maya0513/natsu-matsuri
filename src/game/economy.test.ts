import { describe, expect, it } from "vitest";
import { buy } from "./economy";
import { initialGameState } from "./state";

describe("buy", () => {
  it("所持金が足りれば減額され、アイテムが持ち物に追加される", () => {
    const s = { ...initialGameState, money: 500 };
    const r = buy(s, "takoyaki", 300);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.money).toBe(200);
      expect(r.value.inventory).toEqual(["takoyaki"]);
    }
  });

  it("所持金不足なら insufficient-funds で状態は変わらない", () => {
    const s = { ...initialGameState, money: 100 };
    const r = buy(s, "takoyaki", 300);
    expect(r).toEqual({ ok: false, error: "insufficient-funds" });
  });

  it("ちょうどの金額なら買える（残高 0）", () => {
    const s = { ...initialGameState, money: 300 };
    const r = buy(s, "ringoame", 300);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.money).toBe(0);
  });

  it("同じアイテムを複数回買うと持ち物に重複して入る", () => {
    const s = { ...initialGameState, money: 1000 };
    const r1 = buy(s, "takoyaki", 300);
    if (!r1.ok) throw new Error("unreachable");
    const r2 = buy(r1.value, "takoyaki", 300);
    expect(r2.ok && r2.value.inventory).toEqual(["takoyaki", "takoyaki"]);
  });
});
