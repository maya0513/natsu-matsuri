// 花火の演出（render 層）。打ち上げ → 破裂パーティクル + PointLight フラッシュ
import * as THREE from "three";

/** 打ち上げ（上昇）にかかる秒数 */
const ROCKET_DUR = 1.1;
/** 破裂してから消えるまでの秒数 */
const BURST_DUR = 2.4;
/** 破裂の粒の数 */
const PARTICLE_COUNT = 96;
/** 重力 */
const GRAVITY = -2.2;

type Burst = {
  readonly points: THREE.Points;
  readonly material: THREE.PointsMaterial;
  readonly light: THREE.PointLight;
  readonly velocities: Float32Array;
  readonly center: THREE.Vector3;
  readonly burstAt: number;
};

type Rocket = {
  readonly mesh: THREE.Mesh;
  readonly from: THREE.Vector3;
  readonly to: THREE.Vector3;
  readonly seed: number;
  readonly launchedAt: number;
};

/** seed から決定的な乱数列を作る */
const seededRng = (seed: number): (() => number) => {
  let s = Math.floor(seed * 0xffffffff) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
};

export type FireworksRenderer = {
  /** firework-launched イベント受信時に呼ぶ */
  readonly spawn: (seed: number, now: number) => void;
  /** 毎フレーム呼ぶ */
  readonly update: (now: number) => void;
};

export const createFireworksRenderer = (
  scene: THREE.Scene,
  onBurst?: () => void,
): FireworksRenderer => {
  const rockets: Rocket[] = [];
  const bursts: Burst[] = [];

  const explode = (rocket: Rocket, now: number): void => {
    const rng = seededRng(rocket.seed);
    const color = new THREE.Color().setHSL(rng(), 0.85, 0.65);

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 球面上にランダムな速度を与える
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const speed = 2.5 + rng() * 2.5;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      positions[i * 3] = rocket.to.x;
      positions[i * 3 + 1] = rocket.to.y;
      positions[i * 3 + 2] = rocket.to.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.45,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const light = new THREE.PointLight(color, 60, 60, 1.6);
    light.position.copy(rocket.to);
    scene.add(light);

    bursts.push({ points, material, light, velocities, center: rocket.to, burstAt: now });
    onBurst?.();
  };

  return {
    spawn: (seed, now) => {
      const rng = seededRng(seed + 0.123);
      const x = -12 + rng() * 24;
      const z = -22 - rng() * 6; // 神社の奥の空（やや手前で見やすく）
      const peak = 10 + rng() * 4;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 4, 4),
        new THREE.MeshBasicMaterial({ color: "#ffd27a" }),
      );
      scene.add(mesh);
      rockets.push({
        mesh,
        from: new THREE.Vector3(x, 0, z),
        to: new THREE.Vector3(x, peak, z),
        seed,
        launchedAt: now,
      });
    },

    update: (now) => {
      // 上昇中のロケット
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        if (!r) continue;
        const t = (now - r.launchedAt) / ROCKET_DUR;
        if (t >= 1) {
          scene.remove(r.mesh);
          r.mesh.geometry.dispose();
          (r.mesh.material as THREE.Material).dispose();
          rockets.splice(i, 1);
          explode(r, now);
          continue;
        }
        // ease-out で減速しながら上昇
        const k = 1 - (1 - t) ** 2;
        r.mesh.position.lerpVectors(r.from, r.to, k);
      }

      // 破裂後のパーティクル
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        if (!b) continue;
        const t = now - b.burstAt;
        if (t >= BURST_DUR) {
          scene.remove(b.points);
          scene.remove(b.light);
          b.points.geometry.dispose();
          b.material.dispose();
          bursts.splice(i, 1);
          continue;
        }
        const pos = b.points.geometry.getAttribute("position");
        for (let p = 0; p < PARTICLE_COUNT; p++) {
          pos.setXYZ(
            p,
            b.center.x + (b.velocities[p * 3] ?? 0) * t,
            b.center.y + (b.velocities[p * 3 + 1] ?? 0) * t + 0.5 * GRAVITY * t * t,
            b.center.z + (b.velocities[p * 3 + 2] ?? 0) * t,
          );
        }
        pos.needsUpdate = true;
        const fade = 1 - t / BURST_DUR;
        b.material.opacity = fade;
        b.light.intensity = 60 * fade ** 2;
      }
    },
  };
};
