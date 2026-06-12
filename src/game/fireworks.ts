import { FIREWORKS_FIRST_LAUNCH, FIREWORKS_INTERVAL } from "./constants";
import type { FireworksState, GameEvent, Rng } from "./types";

export const initialFireworks: FireworksState = {
  nextLaunchAt: FIREWORKS_FIRST_LAUNCH,
};

/**
 * 現在時刻 time までに打ち上げ予定だった花火をすべて発火する。
 * 時間が大きく飛んでも取りこぼさない（while でキャッチアップ）。
 */
export const stepFireworks = (
  state: FireworksState,
  time: number,
  rng: Rng,
): { state: FireworksState; events: readonly GameEvent[] } => {
  if (time < state.nextLaunchAt) return { state, events: [] };

  const events: GameEvent[] = [];
  let nextLaunchAt = state.nextLaunchAt;
  while (time >= nextLaunchAt) {
    events.push({ kind: "firework-launched", seed: rng() });
    nextLaunchAt += FIREWORKS_INTERVAL;
  }
  return { state: { nextLaunchAt }, events };
};
