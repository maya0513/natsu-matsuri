// 夜の神社周辺マップの構築。GameState に依存しない静的な配置のみ
import * as THREE from "three";
import { LANTERN_TEXTURE, SHRINE_TEXTURE, STALL_SHEET, TORII_TEXTURE } from "../assets/meta";
import { MAP_BOUNDS } from "../game/constants";
import { STALLS } from "../game/stalls";
import { createBillboard, spriteMaterial, toUnits } from "./sprites";
import type { GameTextures } from "./textures";

/** 参道の幅（unit）。tile-path がこの帯に敷かれる */
const PATH_WIDTH = 5;
/** 鳥居・神社の位置 */
const TORII_Y = 14;
const SHRINE_Y = -17;

const addGround = (scene: THREE.Scene, tex: GameTextures): void => {
  const width = MAP_BOUNDS.maxX - MAP_BOUNDS.minX + 20;
  const depth = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 20;

  const ground = tex.tileGround.clone();
  ground.wrapS = THREE.RepeatWrapping;
  ground.wrapT = THREE.RepeatWrapping;
  ground.repeat.set(width, depth); // 1 タイル = 1 unit

  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshLambertMaterial({ map: ground }),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  scene.add(groundMesh);

  const path = tex.tilePath.clone();
  path.wrapS = THREE.RepeatWrapping;
  path.wrapT = THREE.RepeatWrapping;
  path.repeat.set(PATH_WIDTH, depth);

  const pathMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PATH_WIDTH, depth),
    new THREE.MeshLambertMaterial({ map: path }),
  );
  pathMesh.rotation.x = -Math.PI / 2;
  pathMesh.position.y = 0.01;
  scene.add(pathMesh);
};

const addStalls = (scene: THREE.Scene, tex: GameTextures): void => {
  const cols = STALL_SHEET.order.length;
  const w = toUnits(STALL_SHEET.frameW);
  const h = toUnits(STALL_SHEET.frameH);
  for (const stall of STALLS) {
    const idx = STALL_SHEET.order.indexOf(stall.id);
    const t = tex.stalls.clone();
    t.repeat.set(1 / cols, 1);
    t.offset.set(idx / cols, 0);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), spriteMaterial(t));
    mesh.position.set(stall.pos.x, h / 2, stall.pos.y);
    scene.add(mesh);
  }
};

const addLanterns = (scene: THREE.Scene, tex: GameTextures): void => {
  const h = toUnits(LANTERN_TEXTURE.h);
  const HANG_HEIGHT = 2.4;
  let i = 0;
  for (let y = TORII_Y - 2; y >= SHRINE_Y + 4; y -= 4) {
    for (const x of [-PATH_WIDTH / 2 - 0.4, PATH_WIDTH / 2 + 0.4]) {
      const lantern = createBillboard(tex.lantern, LANTERN_TEXTURE.w, LANTERN_TEXTURE.h, x, y);
      lantern.position.y = HANG_HEIGHT + h / 2;
      scene.add(lantern);
      // PointLight は重いので 1 列おき・片側のみ
      if (i % 4 === 0) {
        const light = new THREE.PointLight("#ff9d3c", 6, 9, 1.8);
        light.position.set(x, HANG_HEIGHT, y);
        scene.add(light);
      }
      i++;
    }
  }
};

export const createScene = (tex: GameTextures): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05030f");
  scene.fog = new THREE.Fog("#05030f", 30, 80);

  // 月明かり程度の環境光（Lambert の地面にだけ効く）
  scene.add(new THREE.AmbientLight("#5a5288", 0.7));

  addGround(scene, tex);
  addStalls(scene, tex);
  addLanterns(scene, tex);

  scene.add(createBillboard(tex.torii, TORII_TEXTURE.w, TORII_TEXTURE.h, 0, TORII_Y));
  scene.add(createBillboard(tex.shrine, SHRINE_TEXTURE.w, SHRINE_TEXTURE.h, 0, SHRINE_Y));

  return scene;
};
