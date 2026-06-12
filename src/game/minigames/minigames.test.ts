import { describe, expect, it } from "vitest";
import type { KingyoState, Rng, ShatekiState, YoyoState } from "../types";
import { HIT_WINDOW, initMinigame, isFinished, pressMinigame, stepMinigame } from "./index";

const always =
  (v: number): Rng =>
  () =>
    v;

describe("くじ引き", () => {
  it("引くと景品が出る（75% 小 / 25% 大）", () => {
    const small = pressMinigame(initMinigame("kuji"), always(0.5));
    expect(small.prizes).toEqual(["kuji-prize-small"]);
    const big = pressMinigame(initMinigame("kuji"), always(0.9));
    expect(big.prizes).toEqual(["kuji-prize-big"]);
  });

  it("何回でも引ける（終了条件なし）", () => {
    const s = pressMinigame(initMinigame("kuji"), always(0.5)).state;
    expect(isFinished(s)).toBe(false);
  });

  it("step では変化しない", () => {
    const s = initMinigame("kuji");
    expect(stepMinigame(s, 1)).toBe(s);
  });
});

describe("ヨーヨー釣り", () => {
  it("マーカーは 0..1 を往復する", () => {
    let s = initMinigame("yoyo") as YoyoState;
    for (let i = 0; i < 300; i++) {
      s = stepMinigame(s, 1 / 60) as YoyoState;
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThanOrEqual(1);
    }
  });

  it("中央付近で押すと成功してヨーヨーが貰える", () => {
    const center: YoyoState = { id: "yoyo", t: 0.5, dir: 1 };
    const r = pressMinigame(center, always(0));
    expect(r.prizes).toEqual(["yoyo-balloon"]);
    expect((r.state as YoyoState).last).toBe("hit");
  });

  it("端で押すと失敗", () => {
    const edge: YoyoState = { id: "yoyo", t: 0.95, dir: -1 };
    const r = pressMinigame(edge, always(0));
    expect(r.prizes).toEqual([]);
    expect((r.state as YoyoState).last).toBe("miss");
  });

  it("HIT_WINDOW の境界内なら成功", () => {
    const s: YoyoState = { id: "yoyo", t: 0.5 + HIT_WINDOW.yoyo - 0.001, dir: 1 };
    expect(pressMinigame(s, always(0)).prizes).toHaveLength(1);
  });
});

describe("金魚すくい", () => {
  it("初期ポイは 3 回分", () => {
    const s = initMinigame("kingyo") as KingyoState;
    expect(s.poiLeft).toBe(3);
  });

  it("金魚が中央付近のとき押すと捕獲", () => {
    const s: KingyoState = { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 3, caught: 0 };
    const r = pressMinigame(s, always(0));
    const after = r.state as KingyoState;
    expect(r.prizes).toEqual(["goldfish"]);
    expect(after.caught).toBe(1);
    expect(after.poiLeft).toBe(2);
  });

  it("外すとポイだけ減る", () => {
    const s: KingyoState = { id: "kingyo", fishX: 0.05, dir: 1, poiLeft: 3, caught: 0 };
    const r = pressMinigame(s, always(0));
    expect(r.prizes).toEqual([]);
    expect((r.state as KingyoState).poiLeft).toBe(2);
  });

  it("ポイが尽きたら終了。さらに押しても何も起きない", () => {
    const done: KingyoState = { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 0, caught: 2 };
    expect(isFinished(done)).toBe(true);
    const r = pressMinigame(done, always(0));
    expect(r.state).toBe(done);
    expect(r.prizes).toEqual([]);
  });
});

describe("射的", () => {
  const aimedAt = (x: number, shotsLeft = 3): ShatekiState => ({
    id: "shateki",
    aimX: x,
    dir: 1,
    shotsLeft,
    targets: [true, true, true],
  });

  it("的の正面で撃つと倒れて景品が出る", () => {
    // 的は 0.2 / 0.5 / 0.8 に立つ
    const r = pressMinigame(aimedAt(0.5), always(0));
    const after = r.state as ShatekiState;
    expect(r.prizes).toEqual(["shateki-prize"]);
    expect(after.targets).toEqual([true, false, true]);
    expect(after.shotsLeft).toBe(2);
  });

  it("外すと弾だけ減る", () => {
    const r = pressMinigame(aimedAt(0.35), always(0));
    expect(r.prizes).toEqual([]);
    expect((r.state as ShatekiState).shotsLeft).toBe(2);
  });

  it("倒れた的は撃てない", () => {
    const s: ShatekiState = { ...aimedAt(0.5), targets: [true, false, true] };
    const r = pressMinigame(s, always(0));
    expect(r.prizes).toEqual([]);
  });

  it("弾切れで終了", () => {
    expect(isFinished(aimedAt(0.5, 0))).toBe(true);
  });
});
