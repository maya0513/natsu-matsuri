// ミニゲームを「屋台に入った」専用の内部空間（独立シーン＋固定カメラ）で描く。
// 世界とは別シーンなので手前の遮蔽物が一切入らない。view 側が暗転フェードで切り替える。
// 2.5D 流儀: 金魚・風船・景品は held.png のドット絵スプライト（ビルボード）、
// 水槽・箱・棚・ポイ等の道具は簡単な3Dジオメトリ。GameState を読むだけで状態は変えない。
import * as THREE from "three";
import { HELD_SHEET, LANTERN_TEXTURE, STALL_SHEET } from "../assets/meta";
import { MOGURA_HOLES, lotIndexAt } from "../game/minigames";
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
/** ステージに並べるスプライトの一辺（held フレームは正方 20px だが、寄りでも見える大きさに） */
const SP = 0.9;

/** ゲーム座標 x(0..1) → ステージローカル x */
const lx = (gx: number): number => (gx - 0.5) * STAGE_W;

export type MinigameInterior = {
  /** 毎フレーム呼ぶ。ミニゲーム中なら内部シーンを state に同期する */
  readonly update: (state: GameState) => void;
  /** 内部空間を描画する（view が暗転で切り替えたときに呼ぶ） */
  readonly render: (renderer: THREE.WebGLRenderer) => void;
  readonly setAspect: (aspect: number) => void;
  readonly dispose: () => void;
};

type Parts = { readonly update: (g: MinigameState, time: number) => void };

/** held.png の 1 フレームを切り出したビルボード（カメラは南向き固定なので +z 向きの板で十分） */
const heldSprite = (sheet: THREE.Texture, id: string, size = SP): THREE.Mesh => {
  const n = HELD_SHEET.order.length;
  const idx = HELD_SHEET.order.indexOf(id);
  const tex = sheet.clone();
  tex.repeat.set(1 / n, 1);
  tex.offset.set(Math.max(0, idx) / n, 0);
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), spriteMaterial(tex));
};

const lambert = (color: THREE.ColorRepresentation, opts: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

// --- 各ゲームの組み立て（group にメッシュを足し、毎フレームの update を返す） ---

const buildKingyo = (group: THREE.Group, tex: GameTextures, g: KingyoState): Parts => {
  // 水槽（縁＋水）
  const rim = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 0.99, 1.0, 1.5), lambert("#5a7a8c"));
  rim.position.set(0, 0.5, 0);
  group.add(rim);
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(STAGE_W * 0.92, 0.9, 1.36),
    new THREE.MeshLambertMaterial({ color: "#2f80b0", transparent: true, opacity: 0.85 }),
  );
  water.position.set(0, 0.52, 0);
  group.add(water);
  // 金魚
  const fish = g.fish.map(() => {
    const m = heldSprite(tex.held, "goldfish", 1.0);
    group.add(m);
    return m;
  });
  // ポイ（リング＋柄）
  const poi = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.04, 8, 16),
    lambert("#d8c48a"),
  );
  ring.rotation.x = Math.PI / 2;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), lambert("#caa874"));
  handle.position.set(0, 0.35, 0);
  poi.add(ring, handle);
  poi.position.set(0, 1.0, 0.3);
  group.add(poi);

  return {
    update: (s) => {
      const k = s as KingyoState;
      k.fish.forEach((f, i) => {
        const m = fish[i];
        if (!m) return;
        m.visible = f.alive;
        m.position.set(lx(f.x), 0.7, (f.y - 0.5) * 1.0);
      });
      poi.position.x = lx(k.cursor);
    },
  };
};

const buildYoyo = (group: THREE.Group, tex: GameTextures, g: YoyoState): Parts => {
  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(STAGE_W * 0.98, 0.5, 1.4),
    new THREE.MeshLambertMaterial({ color: "#225f86", transparent: true, opacity: 0.6 }),
  );
  pool.position.set(0, 0.25, 0);
  group.add(pool);
  const balloons = g.balloons.map(() => {
    const m = heldSprite(tex.held, "yoyo-balloon", 0.7);
    group.add(m);
    return m;
  });
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), lambert("#e8e4da"));
  hook.position.set(0, 1.2, 0.2);
  group.add(hook);

  return {
    update: (s) => {
      const y = s as YoyoState;
      y.balloons.forEach((b, i) => {
        const m = balloons[i];
        if (!m) return;
        m.visible = b.alive;
        m.position.set(lx(b.x), 0.55 + b.baseY * 0.25 + Math.sin(b.phase) * 0.12, 0);
      });
      hook.position.x = lx(y.cursor);
    },
  };
};

const buildShateki = (group: THREE.Group, tex: GameTextures, g: ShatekiState): Parts => {
  for (const sy of [0.55, 1.15]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 0.98, 0.08, 0.5), lambert("#6b4a2f"));
    plank.position.set(0, sy, -0.2);
    group.add(plank);
  }
  const prizes = g.targets.map(() => {
    const m = heldSprite(tex.held, "shateki-prize", 0.7);
    group.add(m);
    return m;
  });
  // 照準（輪）
  const sight = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), lambert("#ffd27a"));
  sight.position.set(0, 1.0, 0.4);
  group.add(sight);

  return {
    update: (s) => {
      const sh = s as ShatekiState;
      sh.targets.forEach((t, i) => {
        const m = prizes[i];
        if (!m) return;
        m.visible = t.alive;
        m.position.set(lx(t.x), 0.95, -0.2);
      });
      sight.position.x = lx(sh.cursor);
    },
  };
};

const buildMogura = (group: THREE.Group, tex: GameTextures, _g: MoguraState): Parts => {
  const base = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 0.98, 0.7, 1.3), lambert("#3a2f56"));
  base.position.set(0, 0.35, 0);
  group.add(base);
  const moles = MOGURA_HOLES.map((hx) => {
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14),
      lambert("#0d0a1a"),
    );
    hole.position.set(lx(hx), 0.71, 0);
    group.add(hole);
    const mole = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.44), lambert("#7a5436"));
    mole.position.set(lx(hx), 0.3, 0);
    group.add(mole);
    return mole;
  });
  const hammer = heldSprite(tex.held, "mogura-prize", 1.0);
  hammer.position.set(0, 1.25, 0.3);
  group.add(hammer);

  return {
    update: (s) => {
      const m = s as MoguraState;
      m.moles.forEach((mo, i) => {
        const mesh = moles[i];
        if (!mesh) return;
        mesh.visible = mo.up;
        mesh.position.y = mo.up ? 0.85 : 0.3;
      });
      hammer.position.x = lx(m.cursor);
    },
  };
};

const buildKuji = (group: THREE.Group, _tex: GameTextures, g: KujiState): Parts => {
  // 木箱
  const box = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 0.85, 0.7, 1.1), lambert("#3a2516"));
  box.position.set(0, 0.35, 0);
  group.add(box);
  // 三角折り札（三角錐で「折り札」を表現）
  const baseColor = new THREE.Color("#d8403a");
  const hiColor = new THREE.Color("#ff6a5a");
  const lots = Array.from({ length: g.count }, (_, i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 3), lambert(baseColor.clone()));
    const x = ((i + 0.5) / g.count - 0.5) * (STAGE_W * 0.82);
    m.position.set(x, 0.95, (((i * 37) % 5) - 2) * 0.07);
    m.rotation.y = (i % 3) * 0.4;
    group.add(m);
    return m;
  });
  // 引いた札の開封表現（白い紙）
  const opened = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 1.0),
    new THREE.MeshBasicMaterial({ color: "#fbeede", side: THREE.DoubleSide }),
  );
  opened.position.set(0, 1.2, 0.4);
  opened.visible = false;
  group.add(opened);

  return {
    update: (s) => {
      const k = s as KujiState;
      if (k.picked !== undefined) {
        for (const m of lots) m.visible = false;
        opened.visible = true;
        return;
      }
      opened.visible = false;
      const sel = lotIndexAt(k.cursor, k.count);
      lots.forEach((m, i) => {
        m.visible = true;
        const hot = i === sel;
        (m.material as THREE.MeshLambertMaterial).color.copy(hot ? hiColor : baseColor);
        const sc = hot ? 1.3 : 1;
        m.scale.set(sc, sc, sc);
      });
    },
  };
};

const buildSenbiki = (group: THREE.Group, tex: GameTextures, g: SenbikiState): Parts => {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(STAGE_W * 0.92, 0.18, 0.3), lambert("#5a3a22"));
  bar.position.set(0, 1.6, -0.1);
  group.add(bar);
  const strings = Array.from({ length: g.count }, (_, i) => {
    const x = ((i + 0.5) / g.count - 0.5) * (STAGE_W * 0.86);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6), lambert("#cbb89a"));
    s.position.set(x, 1.0, -0.1);
    group.add(s);
    // 紐の先の景品タグ（多数ぶら下がる雰囲気）
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), lambert("#9a8a6a"));
    tag.position.set(x, 0.46, -0.1);
    group.add(tag);
    return s;
  });
  const prize = heldSprite(tex.held, "senbiki-prize", 0.6);
  prize.visible = false;
  group.add(prize);

  return {
    update: (s) => {
      const sb = s as SenbikiState;
      const sel = sb.picked ?? lotIndexAt(sb.cursor, sb.count);
      strings.forEach((str, i) => {
        const hot = i === sel;
        (str.material as THREE.MeshLambertMaterial).color.set(hot ? "#ffd65a" : "#cbb89a");
        str.scale.set(hot ? 2 : 1, 1, hot ? 2 : 1);
      });
      if (sb.picked !== undefined) {
        const str = strings[sb.picked];
        prize.visible = sb.result !== "はずれ";
        if (str) prize.position.set(str.position.x, 0.5, -0.1);
      } else {
        prize.visible = false;
      }
    },
  };
};

const buildBingo = (group: THREE.Group, _tex: GameTextures, _g: BingoState): Parts => {
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 6), lambert("#caa23a"));
  drum.position.set(0, 1.2, 0);
  drum.rotation.z = 0.18;
  group.add(drum);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), lambert("#cbb89a"));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.85, 1.2, 0);
  group.add(handle);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.6), lambert("#5a3a22"));
  stand.position.set(0, 0.25, 0);
  group.add(stand);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), lambert("#fbeede"));
  ball.position.set(0, 0.6, 0.45);
  ball.visible = false;
  group.add(ball);

  return {
    update: (s, time) => {
      const b = s as BingoState;
      drum.rotation.y = time * 1.2;
      ball.visible = b.lastBall !== undefined;
      (ball.material as THREE.MeshLambertMaterial).color.set(b.bingo ? "#ffd65a" : "#fbeede");
    },
  };
};

const BUILDERS: Record<
  MinigameId,
  (group: THREE.Group, tex: GameTextures, g: MinigameState) => Parts
> = {
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
const makeStallBackdrop = (sheet: THREE.Texture): { mesh: THREE.Mesh; setId: (id: MinigameId) => void } => {
  const n = STALL_SHEET.order.length;
  const tex = sheet.clone();
  tex.repeat.set(1 / n, 1);
  const w = toUnits(STALL_SHEET.frameW) * 1.8;
  const h = toUnits(STALL_SHEET.frameH) * 1.8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: "#8a8298" }),
  );
  mesh.position.set(0, h / 2 - 0.2, -1.8);
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
  scene.add(new THREE.AmbientLight("#8a82a8", 0.9));
  const key = new THREE.PointLight("#ffd9a0", 16, 24, 1.2);
  key.position.set(0, 3.4, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.set(0, 1.55, 5.8);
  camera.lookAt(0, 0.85, 0);

  // 暗い奥幕＋屋台絵の背景＋脇の提灯（暖色の灯り）
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 12),
    new THREE.MeshBasicMaterial({ color: "#0b0a16" }),
  );
  wall.position.set(0, 3, -3);
  scene.add(wall);

  const backdrop = makeStallBackdrop(textures.stalls);
  scene.add(backdrop.mesh);

  // 木のカウンター（台の下地）
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(STAGE_W * 1.1, 0.4, 1.8),
    new THREE.MeshLambertMaterial({ color: "#4a3320" }),
  );
  counter.position.set(0, -0.2, 0.2);
  scene.add(counter);

  // 脇の提灯（雰囲気）
  for (const sx of [-3.1, 3.1]) {
    const lw = toUnits(LANTERN_TEXTURE.w) * 2;
    const lh = toUnits(LANTERN_TEXTURE.h) * 2;
    const lantern = new THREE.Mesh(
      new THREE.PlaneGeometry(lw, lh),
      spriteMaterial(textures.lantern),
    );
    lantern.position.set(sx, 2.2, -0.6);
    scene.add(lantern);
    const glow = new THREE.PointLight("#ff9d3c", 5, 8, 1.8);
    glow.position.set(sx, 2.2, 0);
    scene.add(glow);
  }

  let group: THREE.Group | null = null;
  let parts: Parts | null = null;
  let builtId: MinigameId | null = null;

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
      }
      parts?.update(g, state.time);
    },
    render: (renderer) => {
      renderer.render(scene, camera);
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
