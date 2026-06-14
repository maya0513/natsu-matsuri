// お化け: 人魂（青白い霊火）と幽霊。賑わいの外縁（杜の縁・対岸・暗い隅）にそっと潜ませ、
// 永遠の夜の境界感を出す。描画専用で state.time だけ読む。祭りの灯りの中心には置かない。
import * as THREE from "three";
import { GHOST_TEXTURE } from "../assets/meta";
import { toUnits } from "./sprites";
import { groundHeightAt } from "./terrain";
import type { GameTextures } from "./textures";

/** 人魂の出現位置（暗い外縁）。[x, z] */
const HITODAMA: readonly (readonly [number, number])[] = [
  [10, -34], // 社の背後の杜
  [-2, -36],
  [22, -32],
  [-20, 26], // 対岸・川上
  [-22, -14], // 対岸・川下
  [-18, 6],
  [38, -6], // 東の杜の縁
  [34, 28],
  [37, -20], // ご神木のまわり（依代に宿る気配）
  [31, -16],
];

/** 幽霊の出現位置（より控えめに）。[x, z, flip] */
const GHOSTS: readonly (readonly [number, number, boolean])[] = [
  [6, -35, false], // 社裏の杜
  [-21, 16, true], // 対岸の暗がり
  [33, 20, false], // 東の杜の縁
];

type Hitodama = {
  readonly group: THREE.Group;
  readonly light: THREE.PointLight;
  readonly x: number;
  readonly z: number;
  readonly baseY: number;
  readonly phase: number;
};

type Ghost = {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshBasicMaterial;
  readonly x: number;
  readonly z: number;
  readonly baseY: number;
  readonly phase: number;
};

export type Spirits = {
  readonly update: (time: number) => void;
};

export const createSpirits = (scene: THREE.Scene, textures: GameTextures): Spirits => {
  const hitodama: Hitodama[] = [];
  const ghosts: Ghost[] = [];

  // --- 人魂（青白い発光球＋淡い光）---
  const coreGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const haloGeo = new THREE.SphereGeometry(0.42, 8, 8);
  HITODAMA.forEach(([x, z], i) => {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({ color: "#dcefff", fog: false }),
    );
    const halo = new THREE.Mesh(
      haloGeo,
      new THREE.MeshBasicMaterial({
        color: "#7fb6ff",
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    group.add(core, halo);
    const baseY = groundHeightAt(x, z) + 1.6;
    group.position.set(x, baseY, z);
    scene.add(group);
    const light = new THREE.PointLight("#6aa0ff", 3, 7, 2);
    light.position.set(x, baseY, z);
    scene.add(light);
    hitodama.push({ group, light, x, z, baseY, phase: i * 1.9 });
  });

  // --- 幽霊（半透明スプライト）---
  const gw = toUnits(GHOST_TEXTURE.w);
  const gh = toUnits(GHOST_TEXTURE.h);
  GHOSTS.forEach(([x, z, flip], i) => {
    const material = new THREE.MeshBasicMaterial({
      map: textures.ghost,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), material);
    if (flip) mesh.scale.x = -1;
    const baseY = groundHeightAt(x, z) + gh / 2 + 0.4; // 少し浮く
    mesh.position.set(x, baseY, z);
    scene.add(mesh);
    ghosts.push({ mesh, material, x, z, baseY, phase: i * 2.3 });
  });

  return {
    update: (time) => {
      for (const h of hitodama) {
        // ゆらゆらと漂う（横揺れ＋上下＋明滅）
        const dx = Math.sin(time * 0.7 + h.phase) * 1.2;
        const dz = Math.cos(time * 0.5 + h.phase * 1.3) * 1.0;
        const dy = Math.sin(time * 1.1 + h.phase) * 0.5;
        h.group.position.set(h.x + dx, h.baseY + dy, h.z + dz);
        h.light.position.copy(h.group.position);
        const flicker = 0.7 + 0.3 * Math.sin(time * 3 + h.phase);
        h.light.intensity = 3 * flicker;
      }
      for (const g of ghosts) {
        // ほのかに浮き沈みし、明滅して現れたり薄れたり
        g.mesh.position.y = g.baseY + Math.sin(time * 0.8 + g.phase) * 0.25;
        g.material.opacity = 0.32 + 0.22 * (0.5 + 0.5 * Math.sin(time * 0.6 + g.phase));
      }
    },
  };
};
