import { describe, expect, it } from "vitest";
import { ITEM_INFO, stallHasHotFood } from "./items";
import type { ItemId } from "./types";

describe("stallHasHotFood（煙がふさわしい屋台の判定）", () => {
  it("加熱調理品（焼き・揚げ）の屋台は煙を出す", () => {
    for (const id of ["takoyaki", "yakisoba", "potato", "frank", "taiyaki"] as const) {
      expect(stallHasHotFood(id)).toBe(true);
    }
  });

  it("冷たい/非加熱の品（甘味・氷・飲み物）の屋台は煙を出さない", () => {
    for (const id of ["ringoame", "chocobanana", "crepe", "kakigori", "juice"] as const) {
      expect(stallHasHotFood(id)).toBe(false);
    }
  });

  it("ミニゲーム屋台（品物を売らない）は煙を出さない", () => {
    for (const id of ["kingyo", "yoyo", "kuji", "shateki", "bingo", "mogura", "senbiki"] as const) {
      expect(stallHasHotFood(id)).toBe(false);
    }
  });

  it("hot フラグが立つのは加熱調理品だけ", () => {
    const hot = (Object.keys(ITEM_INFO) as ItemId[]).filter((id) => ITEM_INFO[id].hot);
    expect(new Set(hot)).toEqual(new Set(["takoyaki", "yakisoba", "potato", "frank", "taiyaki"]));
  });
});
