import { describe, expect, it } from "vitest";
import { WORLD } from "../game/constants";
import { MOUND, groundHeightAt } from "./terrain";

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

  it("石段の z 範囲外（崖）でも境界帯は河川敷へ降下する＝歩いて下りられる", () => {
    const north = groundHeightAt(midX, WORLD.stairZ1 + 5);
    const south = groundHeightAt(midX, WORLD.stairZ0 - 5);
    for (const h of [north, south]) {
      expect(h).toBeLessThan(0);
      expect(h).toBeGreaterThan(WORLD.bankY);
    }
  });

  it("崖（石段の外）は台地の縁から河川敷へ単調に降下する", () => {
    const z = WORLD.stairZ1 + 5;
    let prev = groundHeightAt(WORLD.plateauX, z);
    for (let x = WORLD.plateauX; x >= WORLD.bankX; x -= 0.1) {
      const h = groundHeightAt(x, z);
      expect(h).toBeLessThanOrEqual(prev + 1e-9);
      prev = h;
    }
    expect(groundHeightAt(WORLD.bankX, z)).toBeCloseTo(WORLD.bankY);
  });
});

describe("社の丘（北へ向かう立ち上がり）", () => {
  const onAxis = (z: number): number => groundHeightAt(0, z);

  it("丘の手前（hillBaseZ より南）は平坦な主会場（0）", () => {
    expect(onAxis(WORLD.hillBaseZ)).toBe(0);
    expect(onAxis(WORLD.hillBaseZ + 5)).toBe(0);
  });

  it("丘の頂上（hillTopZ より北）は一定の高さ hillMaxH", () => {
    expect(onAxis(WORLD.hillTopZ)).toBeCloseTo(WORLD.hillMaxH);
    expect(onAxis(WORLD.hillTopZ - 3)).toBeCloseTo(WORLD.hillMaxH);
  });

  it("丘の斜面では北へ進むほど単調に高くなる", () => {
    let prev = onAxis(WORLD.hillBaseZ);
    for (let z = WORLD.hillBaseZ; z >= WORLD.hillTopZ; z -= 0.5) {
      const h = onAxis(z);
      expect(h).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = h;
    }
  });

  it("社の高台はプレイヤーの最奥（minY）でも登り切れている", () => {
    expect(groundHeightAt(0, -32)).toBeCloseTo(WORLD.hillMaxH);
  });
});

describe("やぐら広場の盛り土", () => {
  it("盛り土の中心は周囲より高い", () => {
    const center = groundHeightAt(MOUND.x, MOUND.z);
    const outside = groundHeightAt(MOUND.x, MOUND.z + MOUND.r + 2);
    expect(center).toBeGreaterThan(outside);
    expect(center).toBeCloseTo(MOUND.h, 1);
  });

  it("盛り土の縁の外では寄与しない", () => {
    expect(groundHeightAt(MOUND.x + MOUND.r + 0.5, MOUND.z)).toBe(0);
  });
});
