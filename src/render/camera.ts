import * as THREE from "three";
import type { Vec2 } from "../game/types";

/** プレイヤーからのカメラオフセット（やや低めに引き、空が入る角度に） */
const OFFSET = new THREE.Vector3(0, 7.5, 12);

/** 注視点をプレイヤーより高くして、カメラを上向きに（上空の花火が画面に入る） */
const LOOK_HEIGHT = 3.5;

export const createCamera = (aspect: number): THREE.PerspectiveCamera =>
  new THREE.PerspectiveCamera(58, aspect, 0.1, 300);

/** プレイヤー位置（ゲーム座標: x→x, y→z）にカメラを追従させる */
export const followPlayer = (camera: THREE.PerspectiveCamera, pos: Vec2): void => {
  camera.position.set(pos.x + OFFSET.x, OFFSET.y, pos.y + OFFSET.z);
  camera.lookAt(pos.x, LOOK_HEIGHT, pos.y);
};
