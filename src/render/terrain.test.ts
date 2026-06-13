import { describe, expect, it } from "vitest";
import { WORLD } from "../game/constants";
import { groundHeightAt } from "./terrain";

const midZ = (WORLD.stairZ0 + WORLD.stairZ1) / 2;
const midX = (WORLD.plateauX + WORLD.bankX) / 2;

describe("groundHeightAt（地形の高低差プロファイル）", () => {
  it("台地（石段より右）は高さ 0", () => {
    expect(groundHeightAt(WORLD.plateauX, midZ)).toBe(0);
    expect(groundHeightAt(0, midZ)).toBe(0);
    expect(groundHeightAt(20, 0)).toBe(0);
  });

  it("河川敷（石段より左）は一段低い bankY", () => {
    expect(groundHeightAt(WORLD.bankX - 0.001, midZ)).toBe(WORLD.bankY);
    expect(groundHeightAt(-15, -10)).toBe(WORLD.bankY);
  });

  it("石段の z 範囲内では台地から河川敷へ単調に降下する", () => {
    let prev = groundHeightAt(WORLD.plateauX + 1, midZ);
    for (let x = WORLD.plateauX; x >= WORLD.bankX - 1; x -= 0.1) {
      const h = groundHeightAt(x, midZ);
      expect(h).toBeLessThanOrEqual(prev + 1e-9);
      prev = h;
    }
  });

  it("石段帯の途中（z 範囲内）は 0 と bankY の間", () => {
    const h = groundHeightAt(midX, midZ);
    expect(h).toBeLessThan(0);
    expect(h).toBeGreaterThan(WORLD.bankY);
  });

  it("石段の z 範囲外（擁壁）では境界帯でも降下しない", () => {
    expect(groundHeightAt(midX, WORLD.stairZ1 + 5)).toBe(0);
    expect(groundHeightAt(midX, WORLD.stairZ0 - 5)).toBe(0);
  });
});
