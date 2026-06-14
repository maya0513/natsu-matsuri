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
import { MAP_BOUNDS, RIVER, WORLD, riverCenterXAt } from "../game/constants";
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
/** 中央の南北軸（鳥居・参道・社の縦ライン）の x。西の川・石段から少し離すため 0 から東へずらす */
const SACRED_X = 3;
const YAGURA_POS = { x: 26, y: 17 } as const;

/** マップ全体を覆う奥行き（z = game y 方向） */
const DEPTH = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 20;

type Pt = readonly [number, number];

/**
 * 祭りの広場（鳥居より南）の参道。歩きやすく見通しの良い形を制御点の折れ線で表す。
 * 大通りは鳥居(SACRED_X,-5.5)から x=SACRED_X の長い直線で南へ下り、最下部でのみ右へカーブして
 * 右下の初期位置(10,29)付近に至る。直線部の途中(SACRED_X,10)で横道（川階段⇄やぐら）と交差する。
 * 横道はスケッチでは直線だが、今まで通り自然に湾曲させる（東のやぐら／西の石段へそれぞれ緩い弧）。
 * 西の河川敷には道を敷かず普通の地面とする。鳥居より北（神域）の参道は SACRED_PATH（まっすぐ）。
 */
const FESTIVAL_PATHS: readonly (readonly Pt[])[] = [
  // 中央の祭り大通り（鳥居 → 長い直線 → 最下部で右カーブ → 右下の初期位置付近）
  [
    [SACRED_X, TORII_Y + 0.5],
    [SACRED_X, 6],
    [SACRED_X, 14],
    [SACRED_X, 19],
    [5, 24],
    [8, 28],
    [10, 30],
  ],
  // 横道の東半分: 交差点(SACRED_X,10) → やぐら広場へ自然に湾曲
  [
    [SACRED_X, 10],
    [12, 13],
    [20, 16],
    [YAGURA_POS.x, YAGURA_POS.y],
  ],
];

/** 横道の西半分: 交差点(SACRED_X,10) → 石段（台地の縁）へ自然に湾曲。石段で河川敷へ下りる */
const STAIR_SPUR: readonly Pt[] = [
  [SACRED_X, 10],
  [-2, 8.5],
  [WORLD.plateauX, 7],
];

/** 神域の参道。鳥居 → 社の高台へまっすぐ伸びる清浄な道（屋台・提灯なし、石灯籠が並ぶ）。 */
const SACRED_PATH: readonly Pt[] = [
  [SACRED_X, TORII_Y],
  [SACRED_X, SHRINE_Y + 1],
];

/** 提灯・湯気を吊るす祭りの道（神域のまっすぐな参道は除く） */
const LANTERN_PATHS: readonly (readonly Pt[])[] = [...FESTIVAL_PATHS, STAIR_SPUR];

/** 制御点の折れ線を Catmull-Rom 曲線でサンプリングして中心線の点列を返す */
const sampleCenterline = (pts: readonly Pt[]): { x: number; z: number }[] => {
  if (pts.length < 2) return pts.map(([x, z]) => ({ x, z }));
  const vs = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(vs, false, "catmullrom", 0.5);
  let length = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a && b) length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const n = Math.max(2, Math.round(length * 1.5));
  return curve.getPoints(n).map((p) => ({ x: p.x, z: p.z }));
};

/**
 * 中心線の点列に沿って幅 width のリボン（帯メッシュ）を張る。各頂点の高さは yOf(x,z) で決める。
 * UV は幅方向 0..width・長さ方向に累積距離をとり、タイルが歪まず連続して並ぶ。
 */
const ribbon = (
  center: readonly { x: number; z: number }[],
  width: number,
  yOf: (x: number, z: number) => number,
  material: THREE.Material,
): THREE.Mesh => {
  const half = width / 2;
  const n = center.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  let arc = 0;
  for (let i = 0; i < n; i++) {
    const p = center[i];
    const a = center[Math.max(0, i - 1)];
    const b = center[Math.min(n - 1, i + 1)];
    if (!p || !a || !b) continue;
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const nx = -tz; // 進行方向に垂直
    const nz = tx;
    if (i > 0) {
      const q = center[i - 1];
      if (q) arc += Math.hypot(p.x - q.x, p.z - q.z);
    }
    for (let s = 0; s < 2; s++) {
      const sign = s === 0 ? -1 : 1;
      const x = p.x + nx * half * sign;
      const z = p.z + nz * half * sign;
      const vi = (i * 2 + s) * 3;
      positions[vi] = x;
      positions[vi + 1] = yOf(x, z);
      positions[vi + 2] = z;
      const ui = (i * 2 + s) * 2;
      uvs[ui] = s === 0 ? 0 : width;
      uvs[ui + 1] = arc;
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const o = i * 2;
    indices.push(o, o + 1, o + 3, o, o + 3, o + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
};

/** z ごとに左右の x 輪郭で挟まれた水平な帯（河川敷の地面など）。川の蛇行に沿って端が湾曲する */
const bankStrip = (
  xLeftAt: (z: number) => number,
  xRightAt: (z: number) => number,
  z0: number,
  z1: number,
  y: number,
  material: THREE.Material,
): THREE.Mesh => {
  const n = Math.max(2, Math.round(z1 - z0));
  const positions = new Float32Array((n + 1) * 2 * 3);
  for (let i = 0; i <= n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    const vl = (i * 2) * 3;
    positions[vl] = xLeftAt(z);
    positions[vl + 1] = y;
    positions[vl + 2] = z;
    const vr = (i * 2 + 1) * 3;
    positions[vr] = xRightAt(z);
    positions[vr + 1] = y;
    positions[vr + 2] = z;
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * 2;
    indices.push(o, o + 1, o + 3, o, o + 3, o + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
};

/** 川岸の土手（縦の壁）。x 輪郭に沿って topY→botY の段差を立て、草地と水面をはっきり区切る */
const embankment = (
  xAt: (z: number) => number,
  z0: number,
  z1: number,
  topY: number,
  botY: number,
  material: THREE.Material,
): THREE.Mesh => {
  const n = Math.max(2, Math.round(z1 - z0));
  const positions = new Float32Array((n + 1) * 2 * 3);
  for (let i = 0; i <= n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    const x = xAt(z);
    const vt = (i * 2) * 3;
    positions[vt] = x;
    positions[vt + 1] = topY;
    positions[vt + 2] = z;
    const vb = (i * 2 + 1) * 3;
    positions[vb] = x;
    positions[vb + 1] = botY;
    positions[vb + 2] = z;
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * 2;
    indices.push(o, o + 1, o + 3, o, o + 3, o + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
};

/** 川の西岸 x（これより西は対岸の地面） */
const riverWestEdgeAt = (z: number): number => riverCenterXAt(z) - RIVER.halfWidth;
/** 川の東岸 x（これより東＝河川敷の歩ける地面。当たり判定 riverEastEdgeAt と一致） */
const riverEastEdgeAtZ = (z: number): number => riverCenterXAt(z) + RIVER.halfWidth;
/** 水面の高さ（河川敷より一段低く掘り下げる） */
const WATER_Y = WORLD.bankY - 0.5;

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

/** 台地・崖・河川敷の地面と、なだらかに下りる石段。通行を阻む擁壁は無い（壁は川だけ） */
const addGround = (scene: THREE.Scene, tex: GameTextures): void => {
  // 台地（祭り会場）＋境界帯の崖。社の丘・やぐらの盛り土・崖の斜面に沿って起伏する
  const platX0 = WORLD.bankX; // 崖（境界帯）も含めて地面を垂らす
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

  // 河川敷（草地・一段低い）。川の谷を残して東岸・西岸の二枚に分け、川面が草地に埋もれないようにする
  const grass = new THREE.MeshLambertMaterial({ color: "#2c4a32" });
  const zA = MAP_BOUNDS.minY - 10;
  const zB = MAP_BOUNDS.maxY + 10;
  // 東岸: 川の東岸 → 崖の根もと(bankX)。プレイヤーが歩ける河川敷
  scene.add(bankStrip(riverEastEdgeAtZ, () => WORLD.bankX, zA, zB, WORLD.bankY, grass));
  // 西岸: マップ西端 → 川の西岸（対岸の地面・到達不可の景色）
  scene.add(bankStrip(() => MAP_BOUNDS.minX - 6, riverWestEdgeAt, zA, zB, WORLD.bankY, grass));

  const stone = new THREE.MeshLambertMaterial({ color: "#5c606b" });
  const bandW = WORLD.plateauX - WORLD.bankX;
  const base = WORLD.bankY - 0.6; // 段の底（河川敷の少し下まで沈める）

  // 一か所の長い石段（段差ジオメトリ）: z∈[stairZ0,stairZ1] にだけ置く（崖の中の「下りやすい道」）
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

/**
 * 川（夜の水面）。蛇行する谷を一段低い水面で満たし、両岸に土手の壁を立てて草地と水面をはっきり区切る。
 * 水面の高さ・岸の輪郭は当たり判定（riverEastEdgeAt）と共有する契約に沿う。
 */
const addRiver = (scene: THREE.Scene): void => {
  const z0 = MAP_BOUNDS.minY - 8;
  const z1 = MAP_BOUNDS.maxY + 8;
  const n = 80;
  const center: { x: number; z: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    center.push({ x: riverCenterXAt(z), z });
  }
  // 掘り下げた水面（深い藍色に発光）
  const water = ribbon(
    center,
    RIVER.halfWidth * 2,
    () => WATER_Y,
    new THREE.MeshLambertMaterial({ color: "#123a5c", emissive: "#0b2740" }),
  );
  scene.add(water);

  // 両岸の土手（草地 bankY → 水面 WATER_Y への段差壁）。これで「歩ける岸」と「川」が一目で分かる
  const bankWall = new THREE.MeshLambertMaterial({ color: "#4a3f2c", side: THREE.DoubleSide });
  scene.add(embankment(riverEastEdgeAtZ, z0, z1, WORLD.bankY, WATER_Y, bankWall));
  scene.add(embankment(riverWestEdgeAt, z0, z1, WORLD.bankY, WATER_Y, bankWall));

  // 水面のきらめき（淡い反射光）を、蛇行する川面に沿って数カ所
  for (const z of [24, 10, -4, -18, -30]) {
    const shimmer = new THREE.PointLight("#6aa6d6", 4, 18, 1.5);
    shimmer.position.set(riverCenterXAt(z), WORLD.bankY + 1.0, z);
    scene.add(shimmer);
  }
};

/**
 * 参道。祭りの道（蛇行する大通り・東の弧・河川敷の遊歩道）・石段への連絡路・神域のまっすぐな参道を、
 * 制御点の折れ線 → Catmull-Rom 曲線 → 幅付きリボンとして地形に沿って敷く。
 */
const addPaths = (scene: THREE.Scene, tex: GameTextures): void => {
  for (const pts of [...FESTIVAL_PATHS, STAIR_SPUR, SACRED_PATH]) {
    const center = sampleCenterline(pts);
    const path = tex.tilePath.clone();
    path.wrapS = THREE.RepeatWrapping;
    path.wrapT = THREE.RepeatWrapping;
    const mesh = ribbon(
      center,
      PATH_WIDTH,
      (x, z) => groundHeightAt(x, z) + 0.02, // 地形（丘・盛り土・崖）に沿って少し浮かせる
      new THREE.MeshLambertMaterial({ map: path }),
    );
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

/** 祭りの参道沿いに提灯を吊るす（一定間隔で道の両脇に、要所に暖色の光だまり） */
const addLanterns = (scene: THREE.Scene, tex: GameTextures): void => {
  const h = toUnits(LANTERN_TEXTURE.h);
  const HANG_HEIGHT = 2.4;
  const off = PATH_WIDTH / 2 + 0.5;
  let i = 0;
  for (const pts of LANTERN_PATHS) {
    const center = sampleCenterline(pts);
    let arc = 0;
    let nextAt = 2;
    for (let k = 0; k < center.length; k++) {
      const p = center[k];
      const prev = center[k - 1];
      if (!p) continue;
      if (prev) arc += Math.hypot(p.x - prev.x, p.z - prev.z);
      if (arc < nextAt) continue;
      nextAt += 4.5;
      const a = center[Math.max(0, k - 1)];
      const b = center[Math.min(center.length - 1, k + 1)];
      if (!a || !b) continue;
      let tx = b.x - a.x;
      let tz = b.z - a.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const px = -tz; // 進行方向に垂直
      const pz = tx;
      for (const s of [-1, 1] as const) {
        const lx = p.x + px * off * s;
        const lz = p.z + pz * off * s;
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
      const x = SACRED_X + AXIS_OFF * s; // 東へずらした中央軸の両脇
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

  addStanding(scene, tex.torii, TORII_TEXTURE.w, TORII_TEXTURE.h, SACRED_X, TORII_Y);
  addStanding(scene, tex.shrine, SHRINE_TEXTURE.w, SHRINE_TEXTURE.h, SACRED_X, SHRINE_Y);
  addShinboku(scene, tex);

  // やぐら（広場の塔）。提灯の暖色光を添える
  addStanding(scene, tex.yagura, YAGURA_TEXTURE.w, YAGURA_TEXTURE.h, YAGURA_POS.x, YAGURA_POS.y);
  const yaguraLight = new THREE.PointLight("#ff9d3c", 10, 12, 1.6);
  yaguraLight.position.set(YAGURA_POS.x, groundHeightAt(YAGURA_POS.x, YAGURA_POS.y) + 3.5, YAGURA_POS.y);
  scene.add(yaguraLight);
  addYaguraGarlands(scene, tex);

  return scene;
};
