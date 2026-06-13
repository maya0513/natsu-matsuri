// 夜の神社周辺マップの構築。GameState に依存しない静的な配置のみ
import * as THREE from "three";
import {
  LANTERN_TEXTURE,
  SHRINE_TEXTURE,
  STAIRS_TEXTURE,
  STALL_SHEET,
  TORII_TEXTURE,
  YAGURA_TEXTURE,
} from "../assets/meta";
import { MAP_BOUNDS } from "../game/constants";
import { STALLS } from "../game/stalls";
import { createBillboard, spriteMaterial, toUnits } from "./sprites";
import type { GameTextures } from "./textures";

/** 参道の幅（unit）。tile-path がこの帯に敷かれる */
const PATH_WIDTH = 5;
/** 鳥居・神社の位置 */
const TORII_Y = 14;
const SHRINE_Y = -17;
/** 中央広場（東西の横道）の y 位置 */
const PLAZA_Y = 0;
/** 河川敷（左側の川）の中心 x */
const RIVER_X = -10.5;

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

  // 縦の参道
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

  // 中央広場（東西の横道）。参道と十字に交わって道を複雑にする
  const plazaLen = MAP_BOUNDS.maxX - RIVER_X; // 河川敷〜右の広場まで
  const plaza = tex.tilePath.clone();
  plaza.wrapS = THREE.RepeatWrapping;
  plaza.wrapT = THREE.RepeatWrapping;
  plaza.repeat.set(plazaLen, PATH_WIDTH + 1);
  const plazaMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(plazaLen, PATH_WIDTH + 1),
    new THREE.MeshLambertMaterial({ map: plaza }),
  );
  plazaMesh.rotation.x = -Math.PI / 2;
  plazaMesh.position.set((RIVER_X + MAP_BOUNDS.maxX) / 2, 0.012, PLAZA_Y);
  scene.add(plazaMesh);
};

/** 河川敷: 左端を流れる川と、その手前の草地 */
const addRiver = (scene: THREE.Scene): void => {
  const depth = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 20;
  // 草地（土手）
  const bank = new THREE.Mesh(
    new THREE.PlaneGeometry(3, depth),
    new THREE.MeshLambertMaterial({ color: "#2c4a32" }),
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(RIVER_X + 2.5, 0.008, 0);
  scene.add(bank);

  // 川（夜の水面）
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(5, depth),
    new THREE.MeshLambertMaterial({ color: "#16314a", emissive: "#0c2236" }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(RIVER_X, 0.006, 0);
  scene.add(water);
  // 水面のきらめき（淡い反射光）
  const shimmer = new THREE.PointLight("#6aa6d6", 4, 16, 1.5);
  shimmer.position.set(RIVER_X, 1.2, 2);
  scene.add(shimmer);
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
  addRiver(scene);
  addStalls(scene, tex);
  addLanterns(scene, tex);

  scene.add(createBillboard(tex.torii, TORII_TEXTURE.w, TORII_TEXTURE.h, 0, TORII_Y));
  scene.add(createBillboard(tex.shrine, SHRINE_TEXTURE.w, SHRINE_TEXTURE.h, 0, SHRINE_Y));

  // 神社へ上る石段（拝殿の手前）
  scene.add(createBillboard(tex.stairs, STAIRS_TEXTURE.w, STAIRS_TEXTURE.h, 0, SHRINE_Y + 3.5));

  // 中央広場のやぐら（右手の広場に立つ）。提灯の暖色光を添える
  const yagura = createBillboard(tex.yagura, YAGURA_TEXTURE.w, YAGURA_TEXTURE.h, 8, PLAZA_Y);
  scene.add(yagura);
  const yaguraLight = new THREE.PointLight("#ff9d3c", 10, 12, 1.6);
  yaguraLight.position.set(8, 3.5, PLAZA_Y);
  scene.add(yaguraLight);

  return scene;
};
