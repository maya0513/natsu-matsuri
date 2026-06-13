import { MAP_BOUNDS, PLAYER_SPEED, WORLD } from "./constants";
import type { Direction, Player, Vec2 } from "./types";

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/**
 * 擁壁の当たり判定。台地(x>=plateauX)と河川敷(x<=bankX)の境界帯は、
 * 石段の z 範囲(stairZ0..stairZ1)以外では通れない。境界帯に入ろうとしたら来た側へ押し戻す。
 */
const resolveWall = (prevX: number, x: number, y: number): number => {
  if (y >= WORLD.stairZ0 && y <= WORLD.stairZ1) return x; // 石段は自由に通れる
  // 石段の外では台地⇔河川敷の往来を禁止し、来た面に留める（大ステップでのすり抜けも防ぐ）
  if (prevX >= WORLD.plateauX) return Math.max(x, WORLD.plateauX);
  if (prevX <= WORLD.bankX) return Math.min(x, WORLD.bankX);
  const mid = (WORLD.plateauX + WORLD.bankX) / 2;
  return prevX > mid ? WORLD.plateauX : WORLD.bankX;
};

/** 入力ベクトルの長さを 1 以下に制限（斜め入力の速度超過防止） */
const limitToUnit = (v: Vec2): Vec2 => {
  const len = Math.hypot(v.x, v.y);
  return len > 1 ? { x: v.x / len, y: v.y / len } : v;
};

/** 移動ベクトルから向きを決める。縦横同時は縦優先 */
const directionOf = (v: Vec2, fallback: Direction): Direction => {
  if (v.x === 0 && v.y === 0) return fallback;
  if (Math.abs(v.y) >= Math.abs(v.x)) return v.y < 0 ? "up" : "down";
  return v.x < 0 ? "left" : "right";
};

/** プレイヤーを 1 ステップ分移動させる純粋関数 */
export const movePlayer = (player: Player, move: Vec2, dt: number): Player => {
  const m = limitToUnit(move);
  if (m.x === 0 && m.y === 0) {
    return player.moving ? { ...player, moving: false } : player;
  }
  const x = clamp(player.pos.x + m.x * PLAYER_SPEED * dt, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
  const y = clamp(player.pos.y + m.y * PLAYER_SPEED * dt, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
  return {
    pos: { x: resolveWall(player.pos.x, x, y), y },
    facing: directionOf(m, player.facing),
    moving: true,
  };
};
