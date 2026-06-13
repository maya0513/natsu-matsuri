// スプライト（板ポリ）の生成と GameState からの同期
import * as THREE from "three";
import { HELD_SHEET, PLAYER_SHEET, PX_PER_UNIT } from "../assets/meta";
import type { CarriedId, Direction, Player } from "../game/types";

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

export type HeldItemSprite = {
  readonly mesh: THREE.Mesh;
  /** 手に持つもの（食べ物 or 景品）を反映。item が無ければ非表示 */
  readonly sync: (player: Player, item: CarriedId | undefined, time: number) => void;
};

/** 浴衣キャラが手に持って歩くもの（プレイヤーの手元に追従する小さな板ポリ） */
export const createHeldItemSprite = (sheet: THREE.Texture): HeldItemSprite => {
  const w = toUnits(HELD_SHEET.frameW);
  const h = toUnits(HELD_SHEET.frameH);

  const tex = sheet.clone();
  tex.repeat.set(1 / HELD_SHEET.order.length, 1);

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), spriteMaterial(tex));
  mesh.visible = false;
  mesh.renderOrder = 1; // プレイヤーより手前に描く

  // 向きごとの手元の左右オフセット
  const handX: Record<Direction, number> = { down: 0.24, up: 0.24, left: -0.36, right: 0.36 };

  return {
    mesh,
    sync: (player, item, time) => {
      const idx = item ? HELD_SHEET.order.indexOf(item) : -1;
      if (idx < 0) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      tex.offset.set(idx / HELD_SHEET.order.length, 0);
      // 歩行中はわずかに上下して躍動感を出す
      const bob = player.moving ? Math.sin(time * 8 * Math.PI) * 0.03 : 0;
      mesh.position.set(player.pos.x + handX[player.facing], h / 2 + 0.18 + bob, player.pos.y + 0.2);
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
