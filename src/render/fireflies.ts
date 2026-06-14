// 蛍。鎮守の杜の縁や河川敷に淡い黄緑の光が低く舞い、ひとつずつ明滅する。
// 冷たい人魂・暖かい提灯に続く第三の光として、闇に沈んだ外縁に生命の気配を添える。
// 単一の Points を頂点カラーで個別に明滅させる（描画専用、state.time だけ読む）。
import * as THREE from "three";
import { groundHeightAt } from "./terrain";

/** 蛍が湧く帯（暗い外縁）。[中心x, 中心z, ばらつき半径, 数] */
const ZONES: readonly (readonly [number, number, number, number])[] = [
  [-20, 16, 6, 7], // 対岸・川上の草むら
  [-21, -10, 6, 7], // 対岸・川下
  [-15, 2, 4, 5], // 川辺
  [12, -33, 7, 6], // 社の背後の杜
  [38, 2, 6, 6], // 東の杜の縁
  [36, -22, 6, 5], // 東奥の杜
];

const BASE = new THREE.Color("#c6f06a"); // 淡い黄緑

type Firefly = {
  readonly hx: number;
  readonly hz: number;
  readonly hy: number;
  readonly phase: number;
  readonly wander: number;
};

export type Fireflies = {
  readonly update: (time: number) => void;
};

/** 決定的な擬似乱数 */
const rand = (n: number): number => {
  const s = Math.sin(n * 67.31 + 5.7) * 43758.5453;
  return s - Math.floor(s);
};

export const createFireflies = (scene: THREE.Scene): Fireflies => {
  const flies: Firefly[] = [];
  let seed = 1;
  for (const [cx, cz, r, count] of ZONES) {
    for (let i = 0; i < count; i++) {
      const ang = rand(seed++) * Math.PI * 2;
      const rad = Math.sqrt(rand(seed++)) * r;
      const hx = cx + Math.cos(ang) * rad;
      const hz = cz + Math.sin(ang) * rad;
      flies.push({
        hx,
        hz,
        hy: groundHeightAt(hx, hz) + 0.6 + rand(seed++) * 1.4,
        phase: rand(seed++) * Math.PI * 2,
        wander: 0.4 + rand(seed++) * 0.5,
      });
    }
  }

  const n = flies.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    }),
  );
  scene.add(points);

  return {
    update: (time) => {
      for (let i = 0; i < n; i++) {
        const f = flies[i];
        if (!f) continue;
        // ふわふわと宛もなく漂う
        positions[i * 3] = f.hx + Math.sin(time * f.wander + f.phase) * 1.4;
        positions[i * 3 + 1] = f.hy + Math.sin(time * 0.9 + f.phase * 1.7) * 0.5;
        positions[i * 3 + 2] = f.hz + Math.cos(time * f.wander * 0.8 + f.phase) * 1.4;
        // ひとつずつ明滅（消えている時間が長めの非対称パルス）
        const pulse = Math.sin(time * 2.0 + f.phase * 3);
        const glow = Math.max(0, pulse) ** 2;
        colors[i * 3] = BASE.r * glow;
        colors[i * 3 + 1] = BASE.g * glow;
        colors[i * 3 + 2] = BASE.b * glow;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
};
