// 夜の神社周辺マップの構築。GameState に依存しない静的な配置のみ。
// 会場は一段高い台地、左手は一段低い河川敷で、間を本物の石段（段差ジオメトリ）でつなぐ。
import * as THREE from "three";
import {
  LANTERN_TEXTURE,
  SHRINE_TEXTURE,
  STALL_SHEET,
  TORII_TEXTURE,
  YAGURA_TEXTURE,
} from "../assets/meta";
import { MAP_BOUNDS } from "../game/constants";
import { STALLS } from "../game/stalls";
import { createBillboard, spriteMaterial, toUnits } from "./sprites";
import { BANK_Y, STAIR_BOT_X, STAIR_STEPS, STAIR_TOP_X, groundHeightAt } from "./terrain";
import type { GameTextures } from "./textures";

/** 参道の幅（unit） */
const PATH_WIDTH = 3.5;
/** 鳥居（入口）・神社の位置 */
const TORII_Y = 18;
const SHRINE_Y = -17;
/** やぐらの位置（右手の広場） */
const YAGURA_POS = { x: 8, y: 8 } as const;
/** 川（水面）の中心 x */
const RIVER_X = -13;

/** マップ全体を覆う奥行き（z = game y 方向） */
const DEPTH = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 20;

/**
 * 蛇行する参道の折れ線。入口(手前 +y)→社(奥 -y)へ曲がりながら伸び、
 * 途中で西へ枝分かれして石段（河川敷）へ向かう。屋台はこの道沿いに散る。
 */
const SEGMENTS: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [[0, 19], [0, 12]],
  [[0, 12], [5, 12]],
  [[5, 12], [5, 3]],
  [[5, 8], [YAGURA_POS.x, 8]], // やぐら広場へ
  [[5, 3], [-2, 3]],
  [[-2, 3], [STAIR_TOP_X, 3]], // 河川敷（石段）へ
  [[-2, 3], [-2, -8]],
  [[-2, -8], [3, -8]],
  [[3, -8], [3, -15]],
  [[3, -15], [0, -15]],
];

/** 台地・河川敷の地面と、両者をつなぐ石段 */
const addGround = (scene: THREE.Scene, tex: GameTextures): void => {
  // 台地（祭り会場）: 石段の右端から右いっぱい
  const platX0 = STAIR_TOP_X;
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

  // 河川敷（草地）: 石段の左端から左いっぱい、一段低い
  const bankX0 = MAP_BOUNDS.minX - 6;
  const bankX1 = STAIR_BOT_X;
  const bank = new THREE.Mesh(
    new THREE.PlaneGeometry(bankX1 - bankX0, DEPTH),
    new THREE.MeshLambertMaterial({ color: "#2c4a32" }),
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.set((bankX0 + bankX1) / 2, BANK_Y, 0);
  scene.add(bank);

  // 本物の石段（段差ジオメトリ）: 台地から河川敷へ段々に下りる
  const stepW = (STAIR_TOP_X - STAIR_BOT_X) / STAIR_STEPS;
  const stone = new THREE.MeshLambertMaterial({ color: "#5c606b" });
  const base = BANK_Y - 0.4; // 各段の底（河川敷の少し下まで沈める）
  for (let k = 1; k <= STAIR_STEPS; k++) {
    const treadH = (BANK_Y * k) / STAIR_STEPS;
    const xRight = STAIR_TOP_X - (k - 1) * stepW;
    const height = treadH - base;
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, height, DEPTH), stone);
    step.position.set(xRight - stepW / 2, (treadH + base) / 2, 0);
    scene.add(step);
  }
};

/** 川（夜の水面）。河川敷の高さに合わせて低く置く */
const addRiver = (scene: THREE.Scene): void => {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(6, DEPTH),
    new THREE.MeshLambertMaterial({ color: "#16314a", emissive: "#0c2236" }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(RIVER_X, BANK_Y - 0.05, 0);
  scene.add(water);
  // 水面のきらめき（淡い反射光）を数カ所
  for (const z of [10, -6]) {
    const shimmer = new THREE.PointLight("#6aa6d6", 4, 16, 1.5);
    shimmer.position.set(RIVER_X + 1.5, BANK_Y + 1.2, z);
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
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ map: path }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x0 + x1) / 2, groundHeightAt((x0 + x1) / 2) + 0.011, (z0 + z1) / 2);
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
    mesh.position.set(stall.pos.x, groundHeightAt(stall.pos.x) + h / 2, stall.pos.y);
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
    for (let dpos = 2; dpos < len; dpos += 4) {
      const cx = ax + ux * dpos;
      const cz = az + uz * dpos;
      for (const s of [-1, 1] as const) {
        const lx = cx + px * off * s;
        const lz = cz + pz * off * s;
        const lantern = createBillboard(tex.lantern, LANTERN_TEXTURE.w, LANTERN_TEXTURE.h, lx, lz);
        lantern.position.y = groundHeightAt(lx) + HANG_HEIGHT + h / 2;
        scene.add(lantern);
        if (i % 5 === 0) {
          const light = new THREE.PointLight("#ff9d3c", 6, 9, 1.8);
          light.position.set(lx, groundHeightAt(lx) + HANG_HEIGHT, lz);
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
  mesh.position.y += groundHeightAt(x);
  scene.add(mesh);
};

export const createScene = (tex: GameTextures): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05030f");
  scene.fog = new THREE.Fog("#05030f", 30, 80);

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
