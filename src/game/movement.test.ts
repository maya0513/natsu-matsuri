import { describe, expect, it } from "vitest";
import { MAP_BOUNDS, PLAYER_SPEED, WORLD } from "./constants";
import { movePlayer } from "./movement";
import type { Player } from "./types";

const at = (x: number, y: number): Player => ({
  pos: { x, y },
  facing: "down",
  moving: false,
});

describe("movePlayer", () => {
  it("入力ゼロなら位置は変わらず moving=false", () => {
    const p = movePlayer(at(0, 0), { x: 0, y: 0 }, 0.1);
    expect(p.pos).toEqual({ x: 0, y: 0 });
    expect(p.moving).toBe(false);
  });

  it("右入力で速度 × dt だけ移動し、facing が right になる", () => {
    const p = movePlayer(at(0, 0), { x: 1, y: 0 }, 0.5);
    expect(p.pos.x).toBeCloseTo(PLAYER_SPEED * 0.5);
    expect(p.pos.y).toBeCloseTo(0);
    expect(p.facing).toBe("right");
    expect(p.moving).toBe(true);
  });

  it("斜め入力でも速度は PLAYER_SPEED を超えない（正規化）", () => {
    const p = movePlayer(at(0, 0), { x: 1, y: 1 }, 1);
    const dist = Math.hypot(p.pos.x, p.pos.y);
    expect(dist).toBeCloseTo(PLAYER_SPEED);
  });

  it("入力の長さが 1 未満ならアナログ移動（タッチスティックの倒し量）", () => {
    const p = movePlayer(at(0, 0), { x: 0.5, y: 0 }, 1);
    expect(p.pos.x).toBeCloseTo(PLAYER_SPEED * 0.5);
  });

  it("縦横同時入力では縦が優先で facing が決まる", () => {
    const p = movePlayer(at(0, 0), { x: 0.5, y: -0.8 }, 0.1);
    expect(p.facing).toBe("up");
  });

  it("マップ境界でクランプされる", () => {
    const p = movePlayer(at(MAP_BOUNDS.maxX, 0), { x: 1, y: 0 }, 10);
    expect(p.pos.x).toBe(MAP_BOUNDS.maxX);
  });

  it("石段の外では擁壁に阻まれ台地から河川敷へ抜けられない", () => {
    const wallY = WORLD.stairZ1 + 5; // 石段の z 範囲外
    const p = movePlayer(at(WORLD.plateauX, wallY), { x: -1, y: 0 }, 10);
    expect(p.pos.x).toBe(WORLD.plateauX); // 台地の縁で止まる
  });

  it("石段の z 範囲内なら台地から河川敷へ下りられる", () => {
    const stairY = (WORLD.stairZ0 + WORLD.stairZ1) / 2;
    const p = movePlayer(at(WORLD.plateauX, stairY), { x: -1, y: 0 }, 10);
    expect(p.pos.x).toBeLessThan(WORLD.bankX); // 河川敷側まで抜ける
  });
});
