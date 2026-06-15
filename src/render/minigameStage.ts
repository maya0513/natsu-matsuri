// ミニゲームを「屋台に入った」専用の内部空間（独立シーン＋固定カメラ）で描く。
// 世界とは別シーンなので手前の遮蔽物が一切入らない。view 側が暗転フェードで切り替える。
// 2.5D 流儀: 泳ぐ金魚・風船・景品はドット絵スプライト（ビルボード）、水槽・箱・棚などは簡単な3D。
// カメラはゲームごとに「上/斜め上から覗き込む」プリセット。GameState を読むだけで状態は変えない。
//
// 操作の併存: 各 pickable メッシュに userData.targetIndex を持たせ、pick(ndc) で
// クリック/タッチした対象 index を返す（十字キーのカーソル操作と併用できる）。
import * as THREE from "three";
import { HELD_SHEET, LANTERN_TEXTURE, MINIGAME_SHEET, STALL_SHEET } from "../assets/meta";
import { BINGO_CENTER, BINGO_SIZE, MOGURA_HOLES, lotIndexAt } from "../game/minigames";
import type {
  BingoState,
  GameState,
  KingyoState,
  KujiState,
  MinigameId,
  MinigameState,
  MoguraState,
  SenbikiState,
  ShatekiState,
  YoyoState,
} from "../game/types";
import { spriteMaterial, toUnits } from "./sprites";
import type { GameTextures } from "./textures";

/** ステージの横幅（ワールド unit）。ゲーム座標 x(0..1) をこの幅に写す */
const STAGE_W = 4;
/** ステージに並べるスプライトの一辺の既定 */
const SP = 0.9;

/** 演出の長さ（秒） */
const CATCH_DUR = 0.5; // すくった/倒した対象が消えるまで
const DIP_DUR = 0.18; // 道具（ポイ・照準・ハンマー）を振る

/** ゲーム座標 x(0..1) → ステージローカル x */
const lx = (gx: number): number => (gx - 0.5) * STAGE_W;

/** ゲームごとの「覗き込む」カメラ（pos から look を見る）。上/斜め上が基本 */
const CAMERA: Record<MinigameId, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  kuji: { pos: [0, 2.9, 2.7], look: [0, 0.2, 0], fov: 54 }, // 正方形の箱を真上気味に覗く
  kingyo: { pos: [0, 3.4, 4.7], look: [0, 0.1, 0], fov: 58 }, // 大きな水槽を見下ろす
  yoyo: { pos: [0, 3.4, 4.7], look: [0, 0.1, 0], fov: 58 }, // 大きな水槽を見下ろす
  mogura: { pos: [0, 2.4, 4.3], look: [0, 0.6, -0.1], fov: 56 }, // 盤面を斜め上から
  shateki: { pos: [0, 1.4, 5.6], look: [0, 1.2, -0.2], fov: 58 }, // 2 段の棚を正面気味に
  senbiki: { pos: [0, 1.7, 5.0], look: [0, 1.0, -0.1], fov: 56 }, // 吊り紐を正面気味に
  bingo: { pos: [0, 1.5, 5.7], look: [-0.2, 1.4, 0], fov: 52 }, // 紙を主役に＋抽選器
};

export type MinigameInterior = {
  /** 毎フレーム呼ぶ。ミニゲーム中なら内部シーンを state に同期する */
  readonly update: (state: GameState) => void;
  /** 内部空間を描画する（view が暗転で切り替えたときに呼ぶ） */
  readonly render: (renderer: THREE.WebGLRenderer) => void;
  /** クリック/タッチ位置（NDC -1..1）の対象 index。なければ undefined */
  readonly pick: (ndcX: number, ndcY: number) => number | undefined;
  readonly setAspect: (aspect: number) => void;
  readonly dispose: () => void;
};

type Parts = {
  readonly update: (g: MinigameState, time: number, dt: number) => void;
  /** クリック判定の対象（userData.targetIndex を持つ） */
  readonly picks: readonly THREE.Object3D[];
};

const lambert = (color: THREE.ColorRepresentation, opts: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

/** held.png の 1 フレームを切り出したビルボード（カメラ南向き固定なので +z 向きの板でよい） */
const heldSprite = (sheet: THREE.Texture, id: string, size = SP): THREE.Mesh => {
  const n = HELD_SHEET.order.length;
  const idx = (HELD_SHEET.order as readonly string[]).indexOf(id);
  const tex = sheet.clone();
  tex.repeat.set(1 / n, 1);
  tex.offset.set(Math.max(0, idx) / n, 0);
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), spriteMaterial(tex));
};

/** minigame.png（泳ぐ金魚・もぐら・景品）の 1 フレームを切り出したビルボード */
const mgSprite = (sheet: THREE.Texture, id: string, size = SP): THREE.Mesh => {
  const n = MINIGAME_SHEET.order.length;
  const idx = (MINIGAME_SHEET.order as readonly string[]).indexOf(id);
  const tex = sheet.clone();
  tex.repeat.set(1 / n, 1);
  tex.offset.set(Math.max(0, idx) / n, 0);
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), spriteMaterial(tex));
};

/** 道具を振る量（0..1 の山なり）。commit 直後に dip を入れる */
const dipAmount = (dip: number): number =>
  dip > 0 ? Math.sin((1 - dip / DIP_DUR) * Math.PI) : 0;

// --- 各ゲームの組み立て（group にメッシュを足し、毎フレームの update + picks を返す） ---

const FISH_FRAMES = ["fish-red", "fish-black", "fish-calico"] as const;

// 大きな水槽（画面いっぱい）。ゲーム座標 0..1 を水面の x/z にマップ
const TANK_RX = 3.1; // 横半径
const TANK_RZ = 1.9; // 奥行半径
const TANK_SURFACE = 0.64; // 金魚・浮きを置く水面の高さ（水の上端より少し上）
const tankX = (gx: number): number => (gx - 0.5) * 2 * TANK_RX * 0.84;
const tankZ = (gy: number): number => (gy - 0.5) * 2 * TANK_RZ * 0.84;
const FISH_SIZE = 0.55; // 小さめ

const buildKingyo = (group: THREE.Group, tex: GameTextures, g: KingyoState): Parts => {
  // 桶（縁＋水）。屋台いっぱいの大きな楕円の水槽。縁は低めにして水面を見せる
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(TANK_RX, TANK_RX, 0.5, 36),
    lambert("#6b4a2f"),
  );
  rim.position.set(0, 0.25, 0);
  rim.scale.z = TANK_RZ / TANK_RX;
  group.add(rim);
  // 水面はフラットな円盤（透過シリンダーの放射状アーティファクトを避ける）
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(TANK_RX * 0.93, 48),
    new THREE.MeshBasicMaterial({ color: "#2f80b0", transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.y = TANK_RZ / TANK_RX;
  water.position.set(0, 0.56, 0);
  group.add(water);

  // 金魚（複数デザインを小さめに）。少しだけ寝かせてカメラに見えるように
  const fish = g.fish.map((_, i) => {
    const m = mgSprite(tex.minigame, FISH_FRAMES[i % FISH_FRAMES.length] ?? "fish-red", FISH_SIZE);
    m.userData.targetIndex = i;
    m.rotation.x = -0.35;
    group.add(m);
    return m;
  });

  // ポイ（紙の網＋枠＋柄）
  const poi = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 24), lambert("#d8c48a"));
  ring.rotation.x = Math.PI / 2;
  const paper = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 24),
    new THREE.MeshBasicMaterial({
      color: "#f3ead2",
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  paper.rotation.x = Math.PI / 2;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), lambert("#caa874"));
  handle.position.set(0, 0.4, 0.36);
  handle.rotation.x = 0.5;
  poi.add(ring, paper, handle);
  poi.position.set(0, TANK_SURFACE + 0.12, 0);
  group.add(poi);

  let prevPoi = g.poiLeft;
  const aliveWas = g.fish.map((f) => f.alive);
  const catchAnim = g.fish.map(() => 0);
  let dip = 0;

  return {
    picks: fish,
    update: (s, _time, dt) => {
      const k = s as KingyoState;
      if (k.poiLeft !== prevPoi) {
        dip = DIP_DUR;
        prevPoi = k.poiLeft;
      }
      if (dip > 0) dip = Math.max(0, dip - dt);
      k.fish.forEach((f, i) => {
        const m = fish[i];
        if (!m) return;
        if (aliveWas[i] && !f.alive) catchAnim[i] = CATCH_DUR;
        aliveWas[i] = f.alive;
        if (f.alive) {
          m.visible = true;
          m.position.set(tankX(f.x), TANK_SURFACE, tankZ(f.y));
          m.scale.set(f.vx >= 0 ? -FISH_SIZE : FISH_SIZE, FISH_SIZE, FISH_SIZE); // 進行方向へ向く
        } else if (catchAnim[i] > 0) {
          catchAnim[i] = Math.max(0, catchAnim[i] - dt);
          const p = 1 - catchAnim[i] / CATCH_DUR;
          m.visible = true;
          m.position.set(tankX(f.x), TANK_SURFACE + p * 1.0, tankZ(f.y)); // すくい上げ
          const sc = (1 - p) * FISH_SIZE;
          m.scale.set(sc, sc, sc);
        } else {
          m.visible = false;
        }
      });
      poi.position.set(tankX(k.cursor), TANK_SURFACE + 0.12 - dipAmount(dip) * 0.4, tankZ(k.cursorY));
    },
  };
};

const buildYoyo = (group: THREE.Group, tex: GameTextures, g: YoyoState): Parts => {
  // 屋台いっぱいの大きな水槽（金魚と同じ大きさ）
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(TANK_RX, TANK_RX, 0.5, 36),
    lambert("#2a6f3a"),
  );
  rim.position.set(0, 0.3, 0);
  rim.scale.z = TANK_RZ / TANK_RX;
  group.add(rim);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(TANK_RX * 0.93, 48),
    new THREE.MeshBasicMaterial({ color: "#225f86", transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.y = TANK_RZ / TANK_RX;
  water.position.set(0, 0.5, 0);
  group.add(water);

  // 風船はデザイン（色）・大きさが別々。配置も不規則
  const sizeOf = (b: YoyoState["balloons"][number]): number => 0.5 + b.size * 0.32;
  const balloons = g.balloons.map((b, i) => {
    const m = mgSprite(tex.minigame, `yoyo-${b.kind}`, sizeOf(b));
    m.userData.targetIndex = i;
    group.add(m);
    return m;
  });
  // こより（細い柄＋先のフック）
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.1, 6), lambert("#e8e4da"));
  hook.rotation.x = 0.3;
  group.add(hook);

  let prevTries = g.triesLeft;
  const aliveWas = g.balloons.map((b) => b.alive);
  const catchAnim = g.balloons.map(() => 0);
  let dip = 0;

  return {
    picks: balloons,
    update: (s, _time, dt) => {
      const y = s as YoyoState;
      if (y.triesLeft !== prevTries) {
        dip = DIP_DUR;
        prevTries = y.triesLeft;
      }
      if (dip > 0) dip = Math.max(0, dip - dt);
      y.balloons.forEach((b, i) => {
        const m = balloons[i];
        if (!m) return;
        if (aliveWas[i] && !b.alive) catchAnim[i] = CATCH_DUR;
        aliveWas[i] = b.alive;
        const bob = Math.sin(b.phase) * 0.05;
        const fy = TANK_SURFACE + 0.1 + sizeOf(b) * 0.2 + bob; // 水面に浮かぶ
        if (b.alive) {
          m.visible = true;
          m.position.set(tankX(b.x), fy, tankZ(b.baseY));
        } else if (catchAnim[i] > 0) {
          catchAnim[i] = Math.max(0, catchAnim[i] - dt);
          const p = 1 - catchAnim[i] / CATCH_DUR;
          m.visible = true;
          m.position.set(tankX(b.x), fy + p * 1.0, tankZ(b.baseY)); // 釣り上げ
        } else {
          m.visible = false;
        }
      });
      // こよりはカーソルの真上に下りる
      hook.position.set(tankX(y.cursor), TANK_SURFACE + 0.55 - dipAmount(dip) * 0.4, tankZ(0.5));
    },
  };
};

const SHATEKI_PRIZES = ["prize-bear", "prize-ball", "prize-top", "prize-robot"] as const;
/** 段の高さ（ゲーム 0..1）→ 棚のワールド高さ */
const shelfWorldY = (ty: number): number => 0.78 + ty * 0.95;

const buildShateki = (group: THREE.Group, tex: GameTextures, g: ShatekiState): Parts => {
  // 棚（背板＋段ごとの棚板）
  const back = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 1.0, 1.7, 0.1), lambert("#3a2516"));
  back.position.set(0, 1.1, -0.35);
  group.add(back);
  for (const ty of [0.2, 0.8]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 1.0, 0.08, 0.45), lambert("#6b4a2f"));
    plank.position.set(0, shelfWorldY(ty) - 0.36, -0.18);
    group.add(plank);
  }
  // 景品（種類いろいろ）。段の高さ y に並べる
  const prizes = g.targets.map((t, i) => {
    const m = mgSprite(tex.minigame, SHATEKI_PRIZES[i % SHATEKI_PRIZES.length] ?? "prize-bear", 0.7);
    m.userData.targetIndex = i;
    m.position.set(lx(t.x), shelfWorldY(t.y), -0.12);
    group.add(m);
    return m;
  });
  // 照準
  const sight = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 8, 24), lambert("#ff5a4a"));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), lambert("#ff5a4a"));
  sight.add(ring, dot);
  sight.position.set(0, 1.0, 0.5);
  group.add(sight);

  let prevShots = g.shotsLeft;
  const aliveWas = g.targets.map((t) => t.alive);
  const fallAnim = g.targets.map(() => 0);
  let dip = 0;

  return {
    picks: prizes,
    update: (s, _time, dt) => {
      const sh = s as ShatekiState;
      if (sh.shotsLeft !== prevShots) {
        dip = DIP_DUR;
        prevShots = sh.shotsLeft;
      }
      if (dip > 0) dip = Math.max(0, dip - dt);
      sh.targets.forEach((t, i) => {
        const m = prizes[i];
        if (!m) return;
        if (aliveWas[i] && !t.alive) fallAnim[i] = CATCH_DUR;
        aliveWas[i] = t.alive;
        const wy = shelfWorldY(t.y);
        if (t.alive) {
          m.visible = true;
          m.rotation.z = 0;
          m.position.set(lx(t.x), wy, -0.12);
          m.scale.set(1, 1, 1);
        } else if (fallAnim[i] > 0) {
          fallAnim[i] = Math.max(0, fallAnim[i] - dt);
          const p = 1 - fallAnim[i] / CATCH_DUR;
          m.visible = true;
          m.rotation.z = p * 1.4; // 倒れる
          m.position.set(lx(t.x) + p * 0.2, wy - p * 0.5, -0.12);
        } else {
          m.visible = false;
        }
      });
      // 照準は縦横に動く。撃つと前へ punch
      sight.position.set(lx(sh.cursor), shelfWorldY(sh.cursorY), 0.5 + dipAmount(dip) * 0.25);
    },
  };
};

const buildMogura = (group: THREE.Group, tex: GameTextures, g: MoguraState): Parts => {
  const base = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 0.98, 0.7, 1.4), lambert("#3a2f56"));
  base.position.set(0, 0.35, 0);
  group.add(base);
  const up = MOGURA_HOLES.map((hx, i) => {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 18), lambert("#0d0a1a"));
    hole.position.set(lx(hx), 0.71, 0);
    group.add(hole);
    const mole = mgSprite(tex.minigame, "mole", 0.7);
    mole.position.set(lx(hx), 0.55, 0.05);
    mole.userData.targetIndex = i;
    mole.visible = false;
    group.add(mole);
    const hit = mgSprite(tex.minigame, "mole-hit", 0.7);
    hit.position.set(lx(hx), 0.7, 0.05);
    hit.visible = false;
    group.add(hit);
    return { mole, hit };
  });
  const hammer = heldSprite(tex.held, "mogura-prize", 1.0);
  hammer.position.set(0, 1.3, 0.3);
  group.add(hammer);

  let prevTries = g.triesLeft;
  let swing = 0;

  return {
    picks: up.map((u) => u.mole),
    update: (s, _time, dt) => {
      const m = s as MoguraState;
      if (m.triesLeft !== prevTries) {
        swing = DIP_DUR;
        prevTries = m.triesLeft;
      }
      if (swing > 0) swing = Math.max(0, swing - dt);
      m.moles.forEach((mo, i) => {
        const u = up[i];
        if (!u) return;
        const bonked = mo.stunned > 0; // たたかれて×目で固まっている
        const y = mo.up ? 0.85 : 0.5;
        u.mole.visible = mo.up && !bonked;
        u.hit.visible = mo.up && bonked; // ×目の顔
        u.mole.position.y = y;
        u.hit.position.y = y;
      });
      hammer.position.set(lx(m.cursor), 1.3 - dipAmount(swing) * 0.55, 0.3);
      hammer.rotation.z = -dipAmount(swing) * 0.9;
    },
  };
};

const KUJI_W = 2.4; // 箱の内幅（ほぼ正方形）
const KUJI_D = 2.0; // 箱の奥行

const buildKuji = (group: THREE.Group, _tex: GameTextures, g: KujiState): Parts => {
  // 木箱（ほぼ正方形・浅め。上から覗き込む）
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(KUJI_W + 0.3, 0.12, KUJI_D + 0.3),
    lambert("#2a1a0e"),
  );
  floor.position.set(0, 0.18, 0);
  group.add(floor);
  for (const [w, d, px, pz] of [
    [KUJI_W + 0.3, 0.14, 0, -(KUJI_D / 2 + 0.08)],
    [KUJI_W + 0.3, 0.14, 0, KUJI_D / 2 + 0.08],
    [0.14, KUJI_D + 0.3, -(KUJI_W / 2 + 0.08), 0],
    [0.14, KUJI_D + 0.3, KUJI_W / 2 + 0.08, 0],
  ] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), lambert("#3a2516"));
    wall.position.set(px, 0.4, pz);
    group.add(wall);
  }
  // 三角折り札を 3 列の格子に敷き詰める（横倒しの三角柱）
  const baseColor = new THREE.Color("#e8e0d0");
  const hiColor = new THREE.Color("#ffd65a");
  const cols = 3;
  const rows = Math.ceil(g.count / cols);
  const lots = Array.from({ length: g.count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.2, 0.4, 3), lambert(baseColor.clone()));
    const x = ((col + 0.5) / cols - 0.5) * KUJI_W * 0.84;
    const z = ((row + 0.5) / rows - 0.5) * KUJI_D * 0.84;
    m.position.set(x, 0.34, z);
    m.rotation.set(Math.PI / 2, 0, ((i * 41) % 7) * 0.4); // ばらつく向き
    m.userData.targetIndex = i;
    group.add(m);
    return m;
  });
  // 引いた札（持ち上がって開くおみくじ）。運勢は紙に描く（モーダルに文章を出さない）
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 192;
  const octx = cv.getContext("2d");
  const otex = new THREE.CanvasTexture(cv);
  otex.colorSpace = THREE.SRGBColorSpace;
  const opened = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.05),
    new THREE.MeshBasicMaterial({ map: otex, transparent: true, side: THREE.DoubleSide }),
  );
  opened.position.set(0, 1.0, 0.35);
  opened.visible = false;
  group.add(opened);
  let drawnFortune: string | undefined;
  /** 大吉系は赤、凶系は藍で運勢を描き分ける */
  const fortuneColor = (f: string | undefined): string =>
    f === "凶" || f === "大凶" ? "#2b3a67" : "#c4452e";
  const drawSlip = (fortune: string | undefined): void => {
    if (!octx) return;
    octx.clearRect(0, 0, 128, 192);
    // 生成り色の紙
    octx.fillStyle = "#f7efdc";
    octx.fillRect(0, 0, 128, 192);
    octx.strokeStyle = "#7a2d2d";
    octx.lineWidth = 4;
    octx.strokeRect(6, 6, 116, 180);
    // 上部の朱色の帯に「おみくじ」
    octx.fillStyle = "#7a2d2d";
    octx.fillRect(6, 6, 116, 34);
    octx.fillStyle = "#f7efdc";
    octx.font = "bold 20px serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText("御神籤", 64, 24);
    // 運勢を大きく
    octx.fillStyle = fortuneColor(fortune);
    octx.font = "bold 52px serif";
    octx.fillText(fortune ?? "", 64, 96);
    // 下に小さな飾り罫
    octx.strokeStyle = "#b8a06a";
    octx.lineWidth = 2;
    octx.beginPath();
    octx.moveTo(28, 140);
    octx.lineTo(100, 140);
    octx.stroke();
  };

  let raise = 0;

  return {
    picks: lots,
    update: (k0, _time, dt) => {
      const k = k0 as KujiState;
      if (k.picked !== undefined) {
        if (k.result !== drawnFortune) {
          drawnFortune = k.result;
          drawSlip(k.result);
          otex.needsUpdate = true;
        }
        if (raise < 1) raise = Math.min(1, raise + dt / CATCH_DUR);
        lots.forEach((m, i) => {
          m.visible = i === k.picked;
          if (i === k.picked) m.position.y = 0.34 + raise * 0.7; // 引き上げ
        });
        opened.visible = raise > 0.6;
        return;
      }
      raise = 0;
      drawnFortune = undefined;
      opened.visible = false;
      const sel = lotIndexAt(k.cursor, k.count);
      lots.forEach((m, i) => {
        m.visible = true;
        m.position.y = 0.34;
        const hot = i === sel;
        (m.material as THREE.MeshLambertMaterial).color.copy(hot ? hiColor : baseColor);
      });
    },
  };
};

const buildSenbiki = (group: THREE.Group, tex: GameTextures, g: SenbikiState): Parts => {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 0.92, 0.16, 0.3), lambert("#5a3a22"));
  bar.position.set(0, 1.75, -0.1);
  group.add(bar);
  const data = Array.from({ length: g.count }, (_, i) => {
    const x = ((i + 0.5) / g.count - 0.5) * (STAGE_W * 0.82);
    // 紐（細い円柱）。クリックは紐に当てる
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), lambert("#cbb89a"));
    str.position.set(x, 1.15, -0.1);
    str.userData.targetIndex = i;
    group.add(str);
    // 紐の先のタグ（景品引換札）
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.05), lambert("#d8c48a"));
    tag.position.set(x, 0.5, -0.1);
    group.add(tag);
    return { str, tag, x };
  });
  // 当たり景品（だるま）。引いた紐の先に出す
  const prize = heldSprite(tex.held, "senbiki-prize", 0.7);
  prize.visible = false;
  group.add(prize);

  let pull = 0;

  return {
    picks: data.map((d) => d.str),
    update: (s, _time, dt) => {
      const sb = s as SenbikiState;
      const sel = sb.picked ?? lotIndexAt(sb.cursor, sb.count);
      data.forEach((d, i) => {
        const hot = i === sel;
        (d.str.material as THREE.MeshLambertMaterial).color.set(hot ? "#ffd65a" : "#cbb89a");
        (d.tag.material as THREE.MeshLambertMaterial).color.set(hot ? "#ffe89a" : "#d8c48a");
      });
      if (sb.picked !== undefined) {
        if (pull < 1) pull = Math.min(1, pull + dt / (CATCH_DUR * 1.4));
        const d = data[sb.picked];
        const win = sb.result !== "はずれ";
        prize.visible = win;
        if (d) {
          // 当たり札を手元へ手繰り寄せる（手前・上へ）
          d.tag.position.set(d.x, 0.5 + pull * 0.5, -0.1 + pull * 0.5);
          if (win) prize.position.set(d.x, 0.5 + pull * 0.6, -0.1 + pull * 0.6);
        }
      } else {
        pull = 0;
        prize.visible = false;
        data.forEach((d) => d.tag.position.set(d.x, 0.5, -0.1));
      }
    },
  };
};

/** ビンゴ紙を CanvasTexture に描く（実物の紙風・数字は 1〜100） */
const drawBingoCard = (ctx: CanvasRenderingContext2D, b: BingoState): void => {
  const W = 288;
  ctx.clearRect(0, 0, W, W);
  // 生成り色の紙
  ctx.fillStyle = "#f4ecd6";
  ctx.fillRect(0, 0, W, W);
  ctx.strokeStyle = "#7a2d2d";
  ctx.lineWidth = 5;
  ctx.strokeRect(7, 7, W - 14, W - 14);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // 見出しの帯
  ctx.fillStyle = "#7a2d2d";
  ctx.fillRect(7, 7, W - 14, 40);
  ctx.fillStyle = "#f4ecd6";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("ビンゴ", W / 2 - 38, 28);
  // 直近に出た玉
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(b.lastBall !== undefined ? `${b.lastBall}` : "—", W / 2 + 70, 28);
  // 5×5 グリッド（紙の内側に収める）
  const cs = 44;
  const gw = cs * BINGO_SIZE;
  const left = (W - gw) / 2;
  const top = 56;
  for (let i = 0; i < b.card.length; i++) {
    const r = Math.floor(i / BINGO_SIZE);
    const c = i % BINGO_SIZE;
    const x = left + c * cs;
    const y = top + r * cs;
    ctx.strokeStyle = "#7a2d2d";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cs, cs);
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    if (i === BINGO_CENTER) {
      ctx.fillStyle = "#c4452e";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("★", cx, cy + 1);
    } else {
      ctx.fillStyle = "#2a2024";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(String(b.card[i]), cx, cy + 1);
    }
    if (b.marked[i]) {
      // 押された印（赤い丸）
      ctx.strokeStyle = "rgba(196,30,58,0.85)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};

const buildBingo = (group: THREE.Group, _tex: GameTextures, g: BingoState): Parts => {
  // 抽選器（ガラポン）を右側に
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.85, 6), lambert("#caa23a"));
  drum.position.set(1.45, 1.1, 0);
  drum.rotation.z = 0.18;
  group.add(drum);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8), lambert("#cbb89a"));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(2.1, 1.1, 0);
  group.add(handle);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.5), lambert("#5a3a22"));
  stand.position.set(1.45, 0.4, 0);
  group.add(stand);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), lambert("#fbeede"));
  ball.position.set(1.45, 0.7, 0.4);
  ball.visible = false;
  group.add(ball);

  // ビンゴ紙（CanvasTexture）。画面に収まるよう少し小さく・手前に
  const cv = document.createElement("canvas");
  cv.width = 288;
  cv.height = 288;
  const ctx = cv.getContext("2d");
  const ctex = new THREE.CanvasTexture(cv);
  ctex.colorSpace = THREE.SRGBColorSpace;
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(1.85, 1.85),
    new THREE.MeshBasicMaterial({ map: ctex, transparent: true }),
  );
  paper.position.set(-0.5, 1.62, 0.6);
  paper.rotation.set(-0.08, 0.14, 0.02);
  group.add(paper);

  let drawnKey = "";
  const redraw = (b: BingoState): void => {
    if (!ctx) return;
    drawBingoCard(ctx, b);
    ctex.needsUpdate = true;
  };
  redraw(g);

  return {
    picks: [],
    update: (s, time) => {
      const b = s as BingoState;
      drum.rotation.y = time * 1.8;
      ball.visible = b.lastBall !== undefined;
      (ball.material as THREE.MeshLambertMaterial).color.set(b.bingo ? "#ffd65a" : "#fbeede");
      const key = `${b.marked.join("")}|${b.lastBall ?? ""}`;
      if (key !== drawnKey) {
        drawnKey = key;
        redraw(b);
      }
    },
  };
};

const BUILDERS: Record<MinigameId, (group: THREE.Group, tex: GameTextures, g: MinigameState) => Parts> = {
  kingyo: (gr, t, g) => buildKingyo(gr, t, g as KingyoState),
  yoyo: (gr, t, g) => buildYoyo(gr, t, g as YoyoState),
  shateki: (gr, t, g) => buildShateki(gr, t, g as ShatekiState),
  mogura: (gr, t, g) => buildMogura(gr, t, g as MoguraState),
  kuji: (gr, t, g) => buildKuji(gr, t, g as KujiState),
  senbiki: (gr, t, g) => buildSenbiki(gr, t, g as SenbikiState),
  bingo: (gr, t, g) => buildBingo(gr, t, g as BingoState),
};

const disposeGroup = (scene: THREE.Scene, grp: THREE.Group): void => {
  grp.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const mm = m as THREE.MeshBasicMaterial;
        mm.map?.dispose();
        mm.dispose();
      }
    }
  });
  scene.remove(grp);
};

/** 背景に置く当該屋台のスプライト（板ポリ）。id を変えると別の屋台絵に差し替える */
const makeStallBackdrop = (
  sheet: THREE.Texture,
): { mesh: THREE.Mesh; setId: (id: MinigameId) => void } => {
  const n = STALL_SHEET.order.length;
  const tex = sheet.clone();
  tex.repeat.set(1 / n, 1);
  const w = toUnits(STALL_SHEET.frameW) * 1.8;
  const h = toUnits(STALL_SHEET.frameH) * 1.8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: "#8a8298" }),
  );
  mesh.position.set(0, h / 2 - 0.2, -2.2);
  return {
    mesh,
    setId: (id) => {
      const idx = STALL_SHEET.order.indexOf(id);
      tex.offset.set(Math.max(0, idx) / n, 0);
    },
  };
};

export const createMinigameInterior = (textures: GameTextures): MinigameInterior => {
  // 専用の内部シーンと固定カメラ（世界とは独立）
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07060f");
  scene.add(new THREE.AmbientLight("#8a82a8", 0.95));
  const key = new THREE.PointLight("#ffd9a0", 16, 24, 1.2);
  key.position.set(0, 3.4, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 100);
  camera.position.set(0, 1.55, 5.8);
  camera.lookAt(0, 0.85, 0);

  // 暗い奥幕＋屋台絵の背景＋脇の提灯（暖色の灯り）
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshBasicMaterial({ color: "#0b0a16" }),
  );
  wall.position.set(0, 3, -3.2);
  scene.add(wall);

  const backdrop = makeStallBackdrop(textures.stalls);
  scene.add(backdrop.mesh);

  // 木のカウンター（台の下地）
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(STAGE_W * 1.25, 0.4, 1.9),
    new THREE.MeshLambertMaterial({ color: "#4a3320" }),
  );
  counter.position.set(0, -0.2, 0.25);
  scene.add(counter);

  // 脇の提灯（雰囲気）
  for (const sx of [-3.2, 3.2]) {
    const lw = toUnits(LANTERN_TEXTURE.w) * 2;
    const lh = toUnits(LANTERN_TEXTURE.h) * 2;
    const lantern = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), spriteMaterial(textures.lantern));
    lantern.position.set(sx, 2.3, -0.6);
    scene.add(lantern);
    const glow = new THREE.PointLight("#ff9d3c", 5, 8, 1.8);
    glow.position.set(sx, 2.3, 0);
    scene.add(glow);
  }

  let group: THREE.Group | null = null;
  let parts: Parts | null = null;
  let builtId: MinigameId | null = null;
  let lastTime = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const applyCamera = (id: MinigameId): void => {
    const c = CAMERA[id];
    camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
    camera.fov = c.fov;
    camera.lookAt(c.look[0], c.look[1], c.look[2]);
    camera.updateProjectionMatrix();
  };

  const teardownGroup = (): void => {
    if (group) disposeGroup(scene, group);
    group = null;
    parts = null;
    builtId = null;
  };

  return {
    update: (state) => {
      if (state.mode.kind !== "minigame") return; // 非ミニゲーム時は最後の絵を保持（退場フェード用）
      const g = state.mode.game;
      if (builtId !== g.id) {
        teardownGroup();
        const grp = new THREE.Group();
        parts = BUILDERS[g.id](grp, textures, g);
        scene.add(grp);
        group = grp;
        builtId = g.id;
        backdrop.setId(g.id);
        applyCamera(g.id);
        lastTime = state.time;
      }
      const dt = Math.max(0, Math.min(0.1, state.time - lastTime));
      lastTime = state.time;
      parts?.update(g, state.time, dt);
    },
    render: (renderer) => {
      renderer.render(scene, camera);
    },
    pick: (ndcX, ndcY) => {
      if (!parts || parts.picks.length === 0) return undefined;
      ndc.set(ndcX, ndcY);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(parts.picks as THREE.Object3D[], false);
      for (const h of hits) {
        let vis = true;
        for (let p: THREE.Object3D | null = h.object; p; p = p.parent) {
          if (!p.visible) {
            vis = false;
            break;
          }
        }
        if (!vis) continue;
        const ti = h.object.userData.targetIndex;
        if (typeof ti === "number") return ti;
      }
      return undefined;
    },
    setAspect: (aspect) => {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    dispose: () => {
      teardownGroup();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            const mm = m as THREE.MeshBasicMaterial;
            mm.map?.dispose();
            mm.dispose();
          }
        }
      });
    },
  };
};
