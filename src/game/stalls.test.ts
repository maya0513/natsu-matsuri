import { describe, expect, it } from "vitest";
import { MAP_BOUNDS } from "./constants";
import { STALLS, nearestStall } from "./stalls";

describe("STALLS 配置", () => {
  it("全屋台が一意の id を持つ", () => {
    expect(new Set(STALLS.map((s) => s.id)).size).toBe(STALLS.length);
  });

  it("全屋台がマップ境界内にある", () => {
    for (const s of STALLS) {
      expect(s.pos.x).toBeGreaterThanOrEqual(MAP_BOUNDS.minX);
      expect(s.pos.x).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
      expect(s.pos.y).toBeGreaterThanOrEqual(MAP_BOUNDS.minY);
      expect(s.pos.y).toBeLessThanOrEqual(MAP_BOUNDS.maxY);
    }
  });
});

describe("nearestStall", () => {
  const kingyo = STALLS.find((s) => s.id === "kingyo");
  if (!kingyo) throw new Error("kingyo がない");

  it("範囲内なら最寄りの屋台を返す", () => {
    const found = nearestStall({ x: kingyo.pos.x + 1, y: kingyo.pos.y }, 2);
    expect(found?.id).toBe("kingyo");
  });

  it("範囲外なら undefined", () => {
    expect(nearestStall({ x: 0, y: 100 }, 2)).toBeUndefined();
  });

  it("複数候補があれば最も近いものを返す", () => {
    // 2 屋台の中間より kingyo 寄りの点
    const found = nearestStall({ x: kingyo.pos.x * 0.6, y: kingyo.pos.y }, 100);
    expect(found?.id).toBe(kingyo.id);
  });
});
