import * as THREE from "three";
import type { Player } from "../game/types";

/** キャラ板ポリの足元を地面に合わせるためのオフセット */
const PLAYER_HEIGHT = 1.6;

/**
 * プレイヤーの仮スプライト（単色板ポリ）。
 * M2 で生成スプライトシート（NearestFilter + alphaTest）に置き換える。
 */
export const createPlayerSprite = (): THREE.Mesh => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, PLAYER_HEIGHT),
    new THREE.MeshBasicMaterial({ color: "#e83e8c", side: THREE.DoubleSide }),
  );
  mesh.position.y = PLAYER_HEIGHT / 2;
  return mesh;
};

/** GameState のプレイヤーをスプライトへ反映（読み取り専用） */
export const syncPlayerSprite = (mesh: THREE.Mesh, player: Player): void => {
  mesh.position.set(player.pos.x, PLAYER_HEIGHT / 2, player.pos.y);
};
