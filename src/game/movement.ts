import { MAP_BOUNDS, PLAYER_SPEED } from "./constants";
import type { Direction, Player, Vec2 } from "./types";

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

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
  return {
    pos: {
      x: clamp(player.pos.x + m.x * PLAYER_SPEED * dt, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
      y: clamp(player.pos.y + m.y * PLAYER_SPEED * dt, MAP_BOUNDS.minY, MAP_BOUNDS.maxY),
    },
    facing: directionOf(m, player.facing),
    moving: true,
  };
};
