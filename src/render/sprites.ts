// スプライト（板ポリ）の生成と GameState からの同期
import * as THREE from "three";
import { PLAYER_SHEET, PX_PER_UNIT } from "../assets/meta";
import type { Player } from "../game/types";

/** ピクセル寸法 → ワールド unit */
export const toUnits = (px: number): number => px / PX_PER_UNIT;

/** 半透明ソート問題を避ける共通設定（透明は alphaTest で切る） */
export const spriteMaterial = (map: THREE.Texture): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });

export type PlayerSprite = {
  readonly mesh: THREE.Mesh;
  /** GameState のプレイヤーを反映（位置・向き・歩行アニメ） */
  readonly sync: (player: Player, time: number) => void;
};

/** 歩行サイクル: walk1 → idle → walk2 → idle（8fps） */
const WALK_CYCLE = [1, 0, 2, 0] as const;
const WALK_FPS = 8;

export const createPlayerSprite = (sheet: THREE.Texture): PlayerSprite => {
  const w = toUnits(PLAYER_SHEET.frameW);
  const h = toUnits(PLAYER_SHEET.frameH);

  // フレーム切替はテクスチャの offset/repeat で行うため専有クローンを持つ
  const tex = sheet.clone();
  tex.repeat.set(1 / PLAYER_SHEET.cols, 1 / PLAYER_SHEET.rows);

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), spriteMaterial(tex));

  const setFrame = (col: number, row: number): void => {
    tex.offset.set(col / PLAYER_SHEET.cols, 1 - (row + 1) / PLAYER_SHEET.rows);
  };
  setFrame(0, PLAYER_SHEET.rowOf.down);

  return {
    mesh,
    sync: (player, time) => {
      mesh.position.set(player.pos.x, h / 2, player.pos.y);
      const col = player.moving
        ? (WALK_CYCLE[Math.floor(time * WALK_FPS) % WALK_CYCLE.length] ?? 0)
        : 0;
      setFrame(col, PLAYER_SHEET.rowOf[player.facing]);
    },
  };
};

/** 静的な板ポリ（鳥居・神社・提灯など）。中心が (x, 高さ/2, y) に立つ */
export const createBillboard = (
  map: THREE.Texture,
  pxW: number,
  pxH: number,
  x: number,
  y: number,
): THREE.Mesh => {
  const w = toUnits(pxW);
  const h = toUnits(pxH);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), spriteMaterial(map));
  mesh.position.set(x, h / 2, y);
  return mesh;
};
