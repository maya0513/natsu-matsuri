import * as THREE from "three";
import { MAP_BOUNDS } from "../game/constants";

/** 夜の神社周辺の基本シーン。M2 で生成アセット（鳥居・屋台・提灯）が並ぶ */
export const createScene = (): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05030f");
  scene.fog = new THREE.Fog("#05030f", 30, 80);

  const width = MAP_BOUNDS.maxX - MAP_BOUNDS.minX + 20;
  const depth = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 20;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ color: "#16112a" }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // 参道（仮）: 明るめの帯。M2 で石畳テクスチャに置き換える
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4, depth),
    new THREE.MeshBasicMaterial({ color: "#241b3d" }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);

  return scene;
};
