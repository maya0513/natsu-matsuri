// 夜の神社周辺マップの構築。GameState に依存しない静的な配置のみ。
// 会場は広い台地、左手は一段低い河川敷で、両者は一か所の長い石段（段差ジオメトリ）だけでつながる。
// 石段以外の境界は擁壁。レイアウトの高さ定義は WORLD（game/constants）を契約として共有する。
import * as THREE from "three";
import {
  LANTERN_TEXTURE,
  SHRINE_TEXTURE,
  STALL_SHEET,
  TORII_TEXTURE,
  YAGURA_TEXTURE,
} from "../assets/meta";
import { MAP_BOUNDS, WORLD } from "../game/constants";
import { STALLS } from "../game/stalls";
import { createBillboard, spriteMaterial, toUnits } from "./sprites";
import { groundHeightAt } from "./terrain";
import type { GameTextures } from "./textures";

/** 参道の幅（unit） */
const PATH_WIDTH = 3.5;
/** 鳥居（入口）・神社・やぐらの位置 */
const TORII_Y = 20;
const SHRINE_Y = -19;
const YAGURA_POS = { x: 19, y: 9 } as const;
/** 川（水面）の中心 x */
const RIVER_X = -19;

/** マップ全体を覆う奥行き（z = game y 方向） */
const DEPTH = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 20;

/**
 * 蛇行する参道の折れ線。入口(手前 +y)→社(奥 -y)へ曲がりながら伸び、
 * y≈4（石段の z 範囲内）で西へ枝分かれして河川敷の石段へ向かう。屋台はこの道の脇に散る。
 */
const SEGMENTS: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [[0, 20], [0, 13]],
  [[0, 13], [7, 13]],
  [[7, 13], [7, 4]],
  [[7, 9], [16, 9]], // やぐら広場へ
  [[7, 4], [WORLD.plateauX, 4]], // 河川敷（石段）へ
  [[7, 4], [7, -8]],
  [[7, -8], [0, -8]],
  [[0, -8], [0, SHRINE_Y + 1]],
];

/** 台地・河川敷の地面、両者をつなぐ一か所の石段、それ以外を塞ぐ擁壁 */
const addGround = (scene: THREE.Scene, tex: GameTextures): void => {
  // 台地（祭り会場）
  const platX0 = WORLD.plateauX;
  const platX1 = MAP_BOUNDS.maxX + 10;
  const platW = platX1 - platX0;
  const ground = tex.tileGround.clone();
  ground.wrapS = THREE.RepeatWrapping;
  ground.wrapT = THREE.RepeatWrapping;
  ground.repeat.set(platW, DEPTH);
  const plateau = new THREE.Mesh(
    new THREE.PlaneGeometry(platW, DEPTH),
    new THREE.MeshLambertMaterial({ map: ground }),
  );
  plateau.rotation.x = -Math.PI / 2;
  plateau.position.set((platX0 + platX1) / 2, 0, 0);
  scene.add(plateau);

  // 河川敷（草地・一段低い）
  const bankX0 = MAP_BOUNDS.minX - 6;
  const bankX1 = WORLD.bankX;
  const bank = new THREE.Mesh(
    new THREE.PlaneGeometry(bankX1 - bankX0, DEPTH),
    new THREE.MeshLambertMaterial({ color: "#2c4a32" }),
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.set((bankX0 + bankX1) / 2, WORLD.bankY, 0);
  scene.add(bank);

  const stone = new THREE.MeshLambertMaterial({ color: "#5c606b" });
  const wallMat = new THREE.MeshLambertMaterial({ color: "#3c4048" });
  const bandW = WORLD.plateauX - WORLD.bankX;
  const bandCx = (WORLD.plateauX + WORLD.bankX) / 2;
  const base = WORLD.bankY - 0.6; // 段・壁の底（河川敷の少し下まで沈める）

  // 一か所の長い石段（段差ジオメトリ）: z∈[stairZ0,stairZ1] にだけ置く
  const stepW = bandW / WORLD.stairSteps;
  const stairLen = WORLD.stairZ1 - WORLD.stairZ0;
  const stairCz = (WORLD.stairZ0 + WORLD.stairZ1) / 2;
  for (let k = 1; k <= WORLD.stairSteps; k++) {
    const treadH = (WORLD.bankY * k) / WORLD.stairSteps;
    const xRight = WORLD.plateauX - (k - 1) * stepW;
    const height = treadH - base;
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, height, stairLen), stone);
    step.position.set(xRight - stepW / 2, (treadH + base) / 2, stairCz);
    scene.add(step);
  }

  // 擁壁: 石段の z 範囲を除いた境界帯を塞ぐ（台地縁の石垣）
  const wallSegs: readonly (readonly [number, number])[] = [
    [MAP_BOUNDS.minY - 10, WORLD.stairZ0],
    [WORLD.stairZ1, MAP_BOUNDS.maxY + 10],
  ];
  for (const [z0, z1] of wallSegs) {
    const len = z1 - z0;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(bandW, -base, len), wallMat);
    wall.position.set(bandCx, base / 2, (z0 + z1) / 2);
    scene.add(wall);
  }
};

/** 川（夜の水面）。河川敷の高さに合わせて低く置く */
const addRiver = (scene: THREE.Scene): void => {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(8, DEPTH),
    new THREE.MeshLambertMaterial({ color: "#16314a", emissive: "#0c2236" }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(RIVER_X, WORLD.bankY - 0.05, 0);
  scene.add(water);
  // 水面のきらめき（淡い反射光）を数カ所
  for (const z of [12, -2, -16]) {
    const shimmer = new THREE.PointLight("#6aa6d6", 4, 18, 1.5);
    shimmer.position.set(RIVER_X + 2, WORLD.bankY + 1.2, z);
    scene.add(shimmer);
  }
};

/** 参道（蛇行）。折れ線の各セグメントにタイルを敷く */
const addPaths = (scene: THREE.Scene, tex: GameTextures): void => {
  for (const [[ax, az], [bx, bz]] of SEGMENTS) {
    const x0 = Math.min(ax, bx) - PATH_WIDTH / 2;
    const x1 = Math.max(ax, bx) + PATH_WIDTH / 2;
    const z0 = Math.min(az, bz) - PATH_WIDTH / 2;
    const z1 = Math.max(az, bz) + PATH_WIDTH / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const path = tex.tilePath.clone();
    path.wrapS = THREE.RepeatWrapping;
    path.wrapT = THREE.RepeatWrapping;
    path.repeat.set(w, d);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ map: path }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, groundHeightAt(cx, cz) + 0.011, cz);
    scene.add(mesh);
  }
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
    mesh.position.set(stall.pos.x, groundHeightAt(stall.pos.x, stall.pos.y) + h / 2, stall.pos.y);
    scene.add(mesh);
  }
};

/** 参道沿いに提灯を吊るす（曲がり角ごとに暖色の光だまり） */
const addLanterns = (scene: THREE.Scene, tex: GameTextures): void => {
  const h = toUnits(LANTERN_TEXTURE.h);
  const HANG_HEIGHT = 2.4;
  const off = PATH_WIDTH / 2 + 0.5;
  let i = 0;
  for (const [[ax, az], [bx, bz]] of SEGMENTS) {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.001) continue;
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    const px = -uz; // 進行方向に垂直
    const pz = ux;
    for (let dpos = 2; dpos < len; dpos += 4.5) {
      const cx = ax + ux * dpos;
      const cz = az + uz * dpos;
      for (const s of [-1, 1] as const) {
        const lx = cx + px * off * s;
        const lz = cz + pz * off * s;
        const lantern = createBillboard(tex.lantern, LANTERN_TEXTURE.w, LANTERN_TEXTURE.h, lx, lz);
        lantern.position.y = groundHeightAt(lx, lz) + HANG_HEIGHT + h / 2;
        scene.add(lantern);
        if (i % 5 === 0) {
          const light = new THREE.PointLight("#ff9d3c", 6, 9, 1.8);
          light.position.set(lx, groundHeightAt(lx, lz) + HANG_HEIGHT, lz);
          scene.add(light);
        }
        i++;
      }
    }
  }
};

/** 高さ補正つきで billboard を立てる */
const addStanding = (
  scene: THREE.Scene,
  map: THREE.Texture,
  w: number,
  h: number,
  x: number,
  y: number,
): void => {
  const mesh = createBillboard(map, w, h, x, y);
  mesh.position.y += groundHeightAt(x, y);
  scene.add(mesh);
};

export const createScene = (tex: GameTextures): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05030f");
  scene.fog = new THREE.Fog("#05030f", 34, 90);

  // 月明かり程度の環境光（Lambert の地面にだけ効く）
  scene.add(new THREE.AmbientLight("#5a5288", 0.7));

  addGround(scene, tex);
  addRiver(scene);
  addPaths(scene, tex);
  addStalls(scene, tex);
  addLanterns(scene, tex);

  addStanding(scene, tex.torii, TORII_TEXTURE.w, TORII_TEXTURE.h, 0, TORII_Y);
  addStanding(scene, tex.shrine, SHRINE_TEXTURE.w, SHRINE_TEXTURE.h, 0, SHRINE_Y);

  // やぐら（広場の塔）。提灯の暖色光を添える
  addStanding(scene, tex.yagura, YAGURA_TEXTURE.w, YAGURA_TEXTURE.h, YAGURA_POS.x, YAGURA_POS.y);
  const yaguraLight = new THREE.PointLight("#ff9d3c", 10, 12, 1.6);
  yaguraLight.position.set(YAGURA_POS.x, 3.5, YAGURA_POS.y);
  scene.add(yaguraLight);

  return scene;
};
