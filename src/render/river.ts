// 灯籠流し。河川敷の川面に紙灯籠を浮かべ、下流へゆっくり流す（描画専用、state.time だけ読む）。
// 花火鑑賞会場の川辺に、この祭りの抒情と静けさを添える。
import * as THREE from "three";
import { MAP_BOUNDS, WORLD, riverCenterXAt } from "../game/constants";

const COUNT = 18;
/** 川の流れ方向の全長（z）。端まで流れたら反対端へ回り込む */
const SPAN = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 8;

/** 決定的な擬似乱数 */
const rand = (n: number): number => {
  const s = Math.sin(n * 91.37 + 7.13) * 43758.5453;
  return s - Math.floor(s);
};

type Float = {
  readonly mesh: THREE.Mesh;
  /** 川の中心からの横ずれ（蛇行に追従するため毎フレーム中心 x に足す） */
  readonly lateral: number;
  readonly speed: number;
  readonly off: number;
  readonly baseY: number;
  readonly phase: number;
};

export type RiverLanterns = {
  readonly update: (time: number) => void;
};

export const createRiverLanterns = (scene: THREE.Scene): RiverLanterns => {
  const floats: Float[] = [];
  // 小さな箱（灯籠の火袋）＋発光。加算合成で水面にぽうっと滲む
  const body = new THREE.BoxGeometry(0.34, 0.4, 0.34);
  const glow = new THREE.PlaneGeometry(1.1, 1.1);
  // 掘り下げた水面（scene の WATER_Y = bankY - 0.5）の上に浮かべる
  const baseY = WORLD.bankY - 0.5 + 0.22;

  for (let i = 0; i < COUNT; i++) {
    const warm = i % 3 === 0 ? "#ffcf8a" : "#ff9d3c";
    const mesh = new THREE.Mesh(
      body,
      new THREE.MeshBasicMaterial({ color: warm }),
    );
    // 火袋のまわりの淡いにじみ（水面に伏せて置く）
    const halo = new THREE.Mesh(
      glow,
      new THREE.MeshBasicMaterial({
        color: warm,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.18;
    mesh.add(halo);

    scene.add(mesh);
    floats.push({
      mesh,
      lateral: (rand(i + 1) - 0.5) * 3, // 川幅（半幅 2）の内側にばらける
      speed: 0.5 + rand(i + 11) * 0.55, // ゆっくり流れる
      off: rand(i + 23) * SPAN,
      baseY,
      phase: rand(i + 31) * Math.PI * 2,
    });
  }

  return {
    update: (time) => {
      for (const f of floats) {
        // 下流（−z→+z, 手前）へ流れ、端で回り込む。蛇行する川の中心に横ずれを足して水面に乗せる
        const z = MAP_BOUNDS.minY - 4 + ((f.off + f.speed * time) % SPAN);
        const x = riverCenterXAt(z) + f.lateral;
        f.mesh.position.set(x, f.baseY + Math.sin(time * 1.3 + f.phase) * 0.04, z);
      }
    },
  };
};
