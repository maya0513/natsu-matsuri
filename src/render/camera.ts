import * as THREE from "three";
import type { Vec2 } from "../game/types";

/** プレイヤーからのカメラオフセット（斜め見下ろし。花火＝空が見える角度） */
const OFFSET = new THREE.Vector3(0, 9, 11);

/** 注視点はプレイヤーのやや上（地面ばかり映さない） */
const LOOK_HEIGHT = 1.5;

export const createCamera = (aspect: number): THREE.PerspectiveCamera =>
  new THREE.PerspectiveCamera(50, aspect, 0.1, 300);

/** プレイヤー位置（ゲーム座標: x→x, y→z）にカメラを追従させる */
export const followPlayer = (camera: THREE.PerspectiveCamera, pos: Vec2): void => {
  camera.position.set(pos.x + OFFSET.x, OFFSET.y, pos.y + OFFSET.z);
  camera.lookAt(pos.x, LOOK_HEIGHT, pos.y);
};
