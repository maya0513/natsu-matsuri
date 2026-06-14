// 食べ物屋台の湯気と火の粉。各 shop 屋台から湯気が立ち上り、鉄板の火の粉がはぜる。
// 描画専用で state.time だけ読む。レトロなドット絵調に合わせ、角ばった粒で表現。
import * as THREE from "three";
import { STALLS } from "../game/stalls";
import { groundHeightAt } from "./terrain";

const SHOPS = STALLS.filter((s) => s.kind === "shop");

const STEAM_PER = 6;
const STEAM_RISE = 2.4; // 湯気が立ち上る高さ
const STEAM_COUNTER_Y = 2.0; // 屋根の上あたり
const EMBER_PER = 4;
const EMBER_RISE = 1.3;
const EMBER_COUNTER_Y = 1.1; // 鉄板のあたり

/** 決定的な擬似乱数 */
const rand = (n: number): number => {
  const s = Math.sin(n * 53.17 + 11.7) * 43758.5453;
  return s - Math.floor(s);
};

type Particle = {
  readonly bx: number;
  readonly bz: number;
  readonly off: number;
  readonly speed: number;
  readonly sway: number;
};

type Field = {
  readonly parts: readonly Particle[];
  readonly positions: Float32Array;
  readonly geo: THREE.BufferGeometry;
  readonly rise: number;
  readonly counterY: number;
};

const buildField = (per: number, rise: number, counterY: number): Field => {
  const parts: Particle[] = [];
  SHOPS.forEach((s, si) => {
    for (let i = 0; i < per; i++) {
      const seed = si * 17 + i * 3 + 1;
      parts.push({
        bx: s.pos.x + (rand(seed) - 0.5) * 1.4,
        bz: s.pos.y + 0.4 + (rand(seed + 1) - 0.5) * 0.8, // 客側（手前）寄りの鉄板
        off: rand(seed + 2) * rise,
        speed: 0.45 + rand(seed + 3) * 0.5,
        sway: rand(seed + 4) * Math.PI * 2,
      });
    }
  });
  const positions = new Float32Array(parts.length * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return { parts, positions, geo, rise, counterY };
};

const stepField = (field: Field, time: number): void => {
  field.parts.forEach((p, i) => {
    const climb = (p.off + time * p.speed) % field.rise; // 0..rise を繰り返し立ち上る
    const baseY = groundHeightAt(p.bx, p.bz) + field.counterY; // 地形の起伏に追従
    field.positions[i * 3] = p.bx + Math.sin(time * 0.8 + p.sway) * 0.12 * climb;
    field.positions[i * 3 + 1] = baseY + climb;
    field.positions[i * 3 + 2] = p.bz;
  });
  field.geo.attributes.position.needsUpdate = true;
};

export type StallSmoke = {
  readonly update: (time: number) => void;
};

export const createStallSmoke = (scene: THREE.Scene): StallSmoke => {
  // 湯気: 屋根の上あたりから淡く立ち上る
  const steam = buildField(STEAM_PER, STEAM_RISE, STEAM_COUNTER_Y);
  scene.add(
    new THREE.Points(
      steam.geo,
      new THREE.PointsMaterial({
        color: "#b6bccc",
        size: 0.62,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    ),
  );

  // 火の粉: 鉄板のあたりで暖色にはぜる
  const ember = buildField(EMBER_PER, EMBER_RISE, EMBER_COUNTER_Y);
  const emberMat = new THREE.PointsMaterial({
    color: "#ffae55",
    size: 0.2,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  scene.add(new THREE.Points(ember.geo, emberMat));

  return {
    update: (time) => {
      stepField(steam, time);
      stepField(ember, time);
      emberMat.opacity = 0.6 + 0.35 * Math.sin(time * 7); // 火の粉の明滅
    },
  };
};
