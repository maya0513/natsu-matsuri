// 夜の神社周辺マップの構築。GameState に依存しない静的な配置のみ。
// 会場は広い台地、左手は一段低い河川敷で、両者は一か所の長い石段（段差ジオメトリ）だけでつながる。
// 石段以外の境界は擁壁。レイアウトの高さ定義は WORLD（game/constants）を契約として共有する。
import * as THREE from "three";
import {
  LANTERN_TEXTURE,
  SHINBOKU_TEXTURE,
  SHRINE_TEXTURE,
  STALL_SHEET,
  STONE_LANTERN_TEXTURE,
  TORII_TEXTURE,
  TREE_SHEET,
  YAGURA_TEXTURE,
} from "../assets/meta";
import { MAP_BOUNDS, WORLD } from "../game/constants";
import { STALLS } from "../game/stalls";
import { createBillboard, spriteMaterial, toUnits } from "./sprites";
import { groundHeightAt } from "./terrain";
import type { GameTextures } from "./textures";

/** 参道の幅（unit） */
const PATH_WIDTH = 3.5;
/**
 * 南から北へ: 大きな祭りの広場（屋台あり）→ 鳥居（神域の結界）→ 小さな広場（神社の敷地・屋台なし）→ 社。
 * 鳥居は祭りと神域の「境界」に立つ。鳥居の内側（y < TORII_Y）は屋台のない清浄な参道で、社の高台へ登る。
 */
const TORII_Y = -6;
const SHRINE_Y = -32;
const YAGURA_POS = { x: 26, y: 17 } as const;
/** 川（水面）の中心 x。灯籠流し（river.ts）と共有する */
export const RIVER_X = -19;

/** マップ全体を覆う奥行き（z = game y 方向） */
const DEPTH = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 20;

/**
 * 祭りの広場（鳥居より南）の参道。中央の大通り（入口 +y → 鳥居）から東のやぐら広場・西の河川敷へ枝分かれする。
 * 屋台はこの道沿いに散る。鳥居より北（神域）の参道は SACRED_PATH（屋台・提灯を置かない）。
 */
const SEGMENTS: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [[0, 31], [0, TORII_Y]], // 中央の祭り大通り（入口 → 鳥居）
  [[0, 22], [13, 22]], // 東へ枝分かれ
  [[13, 22], [13, 7]], // 東の通り（賑わいの一角）
  [[13, 15], [YAGURA_POS.x, 15]], // やぐら広場へ
  [[0, 7], [WORLD.plateauX, 7]], // 西の河川敷（石段）へ
];

/** 神域の参道。鳥居 → 社の高台へまっすぐ伸びる清浄な道（屋台・提灯なし、石灯籠が並ぶ）。 */
const SACRED_PATH: readonly [readonly [number, number], readonly [number, number]] = [
  [0, TORII_Y],
  [0, SHRINE_Y + 1],
];

/**
 * 地形に沿って起伏する水平メッシュ（細分割＋頂点変位）。地面・参道を groundHeightAt に垂らす。
 * lift は地面からのわずかな浮き（参道を地面の上に重ねるため）。
 */
const drapedSurface = (
  material: THREE.Material,
  w: number,
  d: number,
  cx: number,
  cz: number,
  lift: number,
): THREE.Mesh => {
  const segX = Math.max(1, Math.round(w / 1.5));
  const segZ = Math.max(1, Math.round(d / 1.5));
  const geo = new THREE.PlaneGeometry(w, d, segX, segZ);
  geo.rotateX(-Math.PI / 2); // XZ 平面（法線上向き）に倒す
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i) + cx;
    const wz = pos.getZ(i) + cz;
    pos.setY(i, groundHeightAt(wx, wz) + lift);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(cx, 0, cz);
  return mesh;
};

/** 台地・河川敷の地面、両者をつなぐ一か所の石段、それ以外を塞ぐ擁壁 */
const addGround = (scene: THREE.Scene, tex: GameTextures): void => {
  // 台地（祭り会場）。社の丘・やぐらの盛り土に沿って起伏する
  const platX0 = WORLD.plateauX;
  const platX1 = MAP_BOUNDS.maxX + 10;
  const platW = platX1 - platX0;
  const ground = tex.tileGround.clone();
  ground.wrapS = THREE.RepeatWrapping;
  ground.wrapT = THREE.RepeatWrapping;
  ground.repeat.set(platW, DEPTH);
  const plateau = drapedSurface(
    new THREE.MeshLambertMaterial({ map: ground }),
    platW,
    DEPTH,
    (platX0 + platX1) / 2,
    0,
    0,
  );
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

/**
 * 夜空。満天の星（上半球にばらまく Points）と、北の空に浮かぶ月（円盤＋淡いハロ）。
 * fog に消えないよう sky 要素は fog:false。背景の闇に星と月が滲み、花火の舞台になる。
 */
const addSky = (scene: THREE.Scene): void => {
  // 星: 大きなドームの上半球に決定的にばらまく
  const N = 520;
  const positions = new Float32Array(N * 3);
  const R = 78;
  for (let i = 0; i < N; i++) {
    const az = hash01(i * 2 + 1) * Math.PI * 2;
    const el = (0.04 + 0.92 * hash01(i * 2 + 2)) * (Math.PI / 2); // 地平付近〜天頂
    const cosEl = Math.cos(el);
    positions[i * 3] = R * cosEl * Math.sin(az);
    positions[i * 3 + 1] = R * Math.sin(el);
    positions[i * 3 + 2] = R * cosEl * Math.cos(az);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: "#cdd6f0",
      size: 2,
      sizeAttenuation: false,
      fog: false,
      transparent: true,
      opacity: 0.9,
    }),
  );
  scene.add(stars);

  // 月（北の空・やや左手の低め）。カメラは少し見下ろすので高すぎると画角から外れる
  const moonPos = new THREE.Vector3(-24, 26, -60);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(9, 32),
    new THREE.MeshBasicMaterial({ color: "#aab6dc", transparent: true, opacity: 0.16, fog: false }),
  );
  halo.position.copy(moonPos).setZ(moonPos.z - 0.2);
  scene.add(halo);
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(5, 40),
    new THREE.MeshBasicMaterial({ color: "#f1ecd6", fog: false }),
  );
  moon.position.copy(moonPos);
  scene.add(moon);
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
  // 水面のきらめき（淡い反射光）を、広がった川面に沿って数カ所
  for (const z of [24, 10, -4, -18, -30]) {
    const shimmer = new THREE.PointLight("#6aa6d6", 4, 18, 1.5);
    shimmer.position.set(RIVER_X + 2, WORLD.bankY + 1.2, z);
    scene.add(shimmer);
  }
};

/** 参道。祭りの道（SEGMENTS）と神域の参道（SACRED_PATH）の各セグメントにタイルを敷く */
const addPaths = (scene: THREE.Scene, tex: GameTextures): void => {
  for (const [[ax, az], [bx, bz]] of [...SEGMENTS, SACRED_PATH]) {
    // 台地の縁(plateauX)より左へは出さない（石段の上に道が張り出すのを防ぐ）
    const x0 = Math.max(Math.min(ax, bx) - PATH_WIDTH / 2, WORLD.plateauX);
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
    // 地形（丘・盛り土）に沿って垂れる参道
    const mesh = drapedSurface(new THREE.MeshLambertMaterial({ map: path }), w, d, cx, cz, 0.02);
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

/** 決定的な擬似乱数（杜のばらつき用。再生成可能性のため Math.random は使わない） */
const hash01 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * 鎮守の杜。会場を囲む外周（社の背後・東縁・対岸・入口の脇）に木のシルエットを多数立てる。
 * fog に溶けて遠景の treeline になり、広げた空間を「夜の森に囲まれた境内」として額装する。
 */
const addTrees = (scene: THREE.Scene, tex: GameTextures): void => {
  const baseW = toUnits(TREE_SHEET.frameW);
  const baseH = toUnits(TREE_SHEET.frameH);

  const treeAt = (x: number, y: number, seed: number): void => {
    const r = hash01(seed);
    const frame = r < 0.55 ? 0 : 1; // やや針葉樹多め
    const scale = 0.55 + hash01(seed + 3.3) * 0.4; // 0.55〜0.95 倍（鳥居と同程度の高さ）
    const flip = hash01(seed + 7.7) < 0.5;
    const t = tex.trees.clone();
    t.repeat.set(1 / TREE_SHEET.cols, 1);
    t.offset.set(frame / TREE_SHEET.cols, 0);
    const w = baseW * scale;
    const h = baseH * scale;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), spriteMaterial(t));
    mesh.position.set(x, groundHeightAt(x, y) + h / 2, y);
    if (flip) mesh.scale.x = -1;
    scene.add(mesh);
  };

  let seed = 1;
  // 不規則さを出すため、各帯で基準線から手前/奥にゆらぎを与える
  const jitter = (span: number): number => (hash01(seed++ * 1.7) - 0.5) * span;

  // 社の背後（北の杜）: 横に密に
  for (let x = -8; x <= 38; x += 3.2) treeAt(x, SHRINE_Y - 4 + jitter(3), seed++);
  // さらに奥に二列目（重なって深い森に）
  for (let x = -6; x <= 36; x += 4.5) treeAt(x, SHRINE_Y - 8 + jitter(2.5), seed++);

  // 東縁（台地の右端を森が縁取る）。歩行域より十分外側に置く
  for (let y = MAP_BOUNDS.maxY + 2; y >= MAP_BOUNDS.minY; y -= 3.6) {
    treeAt(MAP_BOUNDS.maxX + 7 + jitter(2.5), y + jitter(2), seed++);
  }

  // 対岸（川の西側。河川敷の高さに沿って低く並ぶ）
  for (let y = MAP_BOUNDS.maxY + 2; y >= MAP_BOUNDS.minY; y -= 3.4) {
    treeAt(MAP_BOUNDS.minX - 4 + jitter(2), y + jitter(2), seed++);
  }

  // 南縁（祭りの広場の入口側）を杜で軽く縁取る
  for (let x = -2; x <= 38; x += 4.5) treeAt(x, MAP_BOUNDS.maxY + 3 + jitter(2.5), seed++);
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

/**
 * 神域の参道の石灯籠。鳥居(TORII_Y)→社(SHRINE_Y) の清浄な参道(x=0)の両脇に対で並べ、
 * 暗い神域に暖色の光の道を作って社へ視線を導く。祭りの屋台道とは別の、まっすぐな参拝の道。
 */
const addStoneLanterns = (scene: THREE.Scene, tex: GameTextures): void => {
  const { w, h } = STONE_LANTERN_TEXTURE;
  const AXIS_OFF = 1.7; // 参道の縁（PATH_WIDTH/2≈1.75）に沿わせる
  let i = 0;
  for (let y = TORII_Y - 2; y >= SHRINE_Y + 2; y -= 5) {
    for (const s of [-1, 1] as const) {
      const x = AXIS_OFF * s;
      addStanding(scene, tex.stoneLantern, w, h, x, y);
      // 数基おきに地面を照らす暖色のともしび
      if (i % 3 === 0) {
        const light = new THREE.PointLight("#ffb85c", 4, 6, 2);
        light.position.set(x, groundHeightAt(x, y) + 1.0, y);
        scene.add(light);
      }
      i++;
    }
  }
};

/**
 * やぐらの盆踊り提灯。頂部から広場の柱へ放射状に提灯の連なり（たわみ付き）を張り、
 * 頭上に暖色の光の天蓋を作る。広場の NPC が踊り手に見える、祭りの花形。
 */
const addYaguraGarlands = (scene: THREE.Scene, tex: GameTextures): void => {
  const cx = YAGURA_POS.x;
  const cz = YAGURA_POS.y;
  const topY = groundHeightAt(cx, cz) + 4.6; // やぐらの軒下あたりに束ねる
  const R = 9;
  const POLES = 6;
  const poleMat = new THREE.MeshLambertMaterial({ color: "#54381f" });
  for (let k = 0; k < POLES; k++) {
    const a = (k / POLES) * Math.PI * 2 + 0.3;
    const px = cx + Math.cos(a) * R;
    const pz = cz + Math.sin(a) * R;
    const g = groundHeightAt(px, pz);
    const poleH = 3.2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, poleH, 6), poleMat);
    pole.position.set(px, g + poleH / 2, pz);
    scene.add(pole);

    // 頂部 → 柱頭の提灯列（中央がたわむ）
    const poleTop = g + poleH;
    const count = Math.max(4, Math.round(R * 0.9));
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const x = cx + (px - cx) * t;
      const z = cz + (pz - cz) * t;
      const yLine = topY + (poleTop - topY) * t;
      const y = yLine - Math.sin(Math.PI * t) * 1.1; // たわみ
      const lantern = createBillboard(tex.lantern, LANTERN_TEXTURE.w, LANTERN_TEXTURE.h, x, z);
      lantern.position.y = y;
      scene.add(lantern);
    }
    // 柱頭の暖色灯
    const light = new THREE.PointLight("#ff9d3c", 5, 10, 1.8);
    light.position.set(px, poleTop, pz);
    scene.add(light);
  }
};

/**
 * ご神木の聖域。神域北東の空き地に、注連縄を巻いた大樹を据え、朱の玉垣で囲い、
 * 手前に一対の石灯籠を立て、暖色の灯りで注連縄を照らす。賑わいから離れた静かな依代の場。
 */
const addShinboku = (scene: THREE.Scene, tex: GameTextures): void => {
  const cx = 34;
  const cz = -18;

  // 朱の玉垣（斜面に沿う柱の輪＋上の貫）
  const sacredRed = new THREE.MeshLambertMaterial({ color: "#b03a26" });
  const R = 3.4;
  const N = 14;
  const posts: { x: number; z: number; g: number }[] = [];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const px = cx + Math.cos(a) * R;
    const pz = cz + Math.sin(a) * R;
    const g = groundHeightAt(px, pz);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.16), sacredRed);
    post.position.set(px, g + 0.47, pz);
    scene.add(post);
    posts.push({ x: px, z: pz, g });
  }
  // 柱間の貫（地形に沿って傾く短い横木）
  for (let k = 0; k < N; k++) {
    const p0 = posts[k];
    const p1 = posts[(k + 1) % N];
    if (!p0 || !p1) continue;
    const len = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), sacredRed);
    rail.position.set((p0.x + p1.x) / 2, (p0.g + p1.g) / 2 + 0.78, (p0.z + p1.z) / 2);
    rail.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
    scene.add(rail);
  }

  // ご神木（玉垣の中に立つ）
  addStanding(scene, tex.shinboku, SHINBOKU_TEXTURE.w, SHINBOKU_TEXTURE.h, cx, cz);

  // 手前（南）に一対の石灯籠＝聖域の入口
  const { w: lw, h: lh } = STONE_LANTERN_TEXTURE;
  for (const s of [-1, 1] as const) {
    const lx = cx + s * 2.7;
    const lz = cz + 5.2;
    addStanding(scene, tex.stoneLantern, lw, lh, lx, lz);
    const ll = new THREE.PointLight("#ffb85c", 4, 6, 2);
    ll.position.set(lx, groundHeightAt(lx, lz) + 1.0, lz);
    scene.add(ll);
  }

  // 注連縄を照らす淡い暖色灯
  const light = new THREE.PointLight("#ffcaa0", 5, 11, 2);
  light.position.set(cx, groundHeightAt(cx, cz) + 2.8, cz + 1.5);
  scene.add(light);
};

export const createScene = (tex: GameTextures): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05030f");
  scene.fog = new THREE.Fog("#05030f", 30, 95);

  // 月明かり程度の環境光（Lambert の地面にだけ効く）
  scene.add(new THREE.AmbientLight("#5a5288", 0.7));

  addSky(scene);
  addGround(scene, tex);
  addRiver(scene);
  addTrees(scene, tex);
  addPaths(scene, tex);
  addStoneLanterns(scene, tex);
  addStalls(scene, tex);
  addLanterns(scene, tex);

  addStanding(scene, tex.torii, TORII_TEXTURE.w, TORII_TEXTURE.h, 0, TORII_Y);
  addStanding(scene, tex.shrine, SHRINE_TEXTURE.w, SHRINE_TEXTURE.h, 0, SHRINE_Y);
  addShinboku(scene, tex);

  // やぐら（広場の塔）。提灯の暖色光を添える
  addStanding(scene, tex.yagura, YAGURA_TEXTURE.w, YAGURA_TEXTURE.h, YAGURA_POS.x, YAGURA_POS.y);
  const yaguraLight = new THREE.PointLight("#ff9d3c", 10, 12, 1.6);
  yaguraLight.position.set(YAGURA_POS.x, groundHeightAt(YAGURA_POS.x, YAGURA_POS.y) + 3.5, YAGURA_POS.y);
  scene.add(yaguraLight);
  addYaguraGarlands(scene, tex);

  return scene;
};
