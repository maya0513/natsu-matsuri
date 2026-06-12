import { describe, expect, it } from "vitest";
import { FIREWORKS_FIRST_LAUNCH, FIREWORKS_INTERVAL } from "./constants";
import { initialFireworks, stepFireworks } from "./fireworks";
import type { Rng } from "./types";

const rng: Rng = () => 0.5;

describe("花火スケジューラ", () => {
  it("初期状態の次回打ち上げは FIREWORKS_FIRST_LAUNCH", () => {
    expect(initialFireworks.nextLaunchAt).toBe(FIREWORKS_FIRST_LAUNCH);
  });

  it("打ち上げ時刻前は何も起きない", () => {
    const { state, events } = stepFireworks(initialFireworks, FIREWORKS_FIRST_LAUNCH - 0.01, rng);
    expect(events).toHaveLength(0);
    expect(state).toBe(initialFireworks);
  });

  it("打ち上げ時刻を過ぎるとイベントが 1 回発火し、次回が interval 後に設定される", () => {
    const { state, events } = stepFireworks(initialFireworks, FIREWORKS_FIRST_LAUNCH + 0.01, rng);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ kind: "firework-launched", seed: 0.5 });
    expect(state.nextLaunchAt).toBe(FIREWORKS_FIRST_LAUNCH + FIREWORKS_INTERVAL);
  });

  it("大きく時間が飛んでも取りこぼさず複数発火する", () => {
    const t = FIREWORKS_FIRST_LAUNCH + FIREWORKS_INTERVAL * 2 + 0.01;
    const { state, events } = stepFireworks(initialFireworks, t, rng);
    expect(events).toHaveLength(3);
    expect(state.nextLaunchAt).toBeGreaterThan(t);
  });

  it("seed は注入された乱数から取られる", () => {
    let n = 0;
    const seq: Rng = () => [0.1, 0.9][n++ % 2]!;
    const t = FIREWORKS_FIRST_LAUNCH + FIREWORKS_INTERVAL + 0.01;
    const { events } = stepFireworks(initialFireworks, t, seq);
    expect(events.map((e) => e.seed)).toEqual([0.1, 0.9]);
  });
});
