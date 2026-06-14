// 参拝客（喋らない NPC）の群れ。GameState は変更せず、描画専用に state.time だけ読んで動かす。
// 屋台前・やぐら広場・参道・河川敷に佇み、ゆるい体重移動（フレーム切替）で「生きている祭り」を演出する。
import * as THREE from "three";
import { NPC_SHEET } from "../assets/meta";
import { spriteMaterial, toUnits } from "./sprites";
import { groundHeightAt } from "./terrain";
import type { GameTextures } from "./textures";

/** 1 人の NPC の配置 [x, y, variant(0..3), facing(0=手前,1=奥), flip] */
type Spawn = readonly [number, number, number, 0 | 1, boolean];

const ROWS = NPC_SHEET.variants * NPC_SHEET.facings;

/**
 * 群衆の配置。屋台の客（後ろ姿=奥向き）、こちらを向いて歩く人、広場や川辺で佇む人を散らす。
 * 歩行域とおおむね重ならない縁・屋台脇に置き、プレイヤーの通行は妨げない。
 */
const SPAWNS: readonly Spawn[] = [
  // 屋台の前で品定めする客（屋台の手前＝南に立ち、奥＝屋台を向く後ろ姿）。新しい屋台位置に合わせる
  [-0.4, 3.8, 0, 1, false], // 焼きそば
  [-0.3, 13.0, 2, 1, true], // たこ焼き
  [6.5, 8.4, 1, 1, false], // クレープ
  [-0.7, 17.2, 3, 1, false], // フランク
  [0.3, 22.9, 0, 1, true], // りんご飴
  [8.2, 23.8, 2, 1, false], // チョコバナナ
  [14.2, 18.8, 1, 1, false], // かき氷
  [22.5, 21.2, 3, 1, true], // ジュース
  // やぐら広場の人だかり（盆踊りを囲む。向き混在）
  [24.0, 20.0, 0, 0, false],
  [28.5, 18.5, 1, 0, true],
  [27.0, 13.5, 2, 1, false],
  [22.0, 14.0, 3, 0, false],
  // 大通り（直線部）をそぞろ歩く人（道の中央は空け、路肩に寄せる）
  [0.7, 6.5, 1, 0, false],
  [5.3, 16.0, 3, 0, true],
  [3.0, 25.2, 0, 0, false],
  // 神域の参道を進む参拝者（中央を空け、石灯籠ラインのすぐ外・行間に立つ）
  [1.2, -15.5, 2, 1, false],
  [4.8, -20.5, 0, 1, true],
  // 河川敷で花火を待つ人（川の東岸。北の空を向く＝奥向き）
  [-12.5, 17.0, 1, 1, false],
  [-13.0, 8.0, 2, 1, true],
  [-12.5, -8.0, 3, 1, false],
  [-13.0, 0.0, 0, 1, true],
];

type Npc = {
  readonly tex: THREE.Texture;
  readonly mesh: THREE.Mesh;
  readonly row: number;
  readonly phase: number;
  readonly baseY: number;
};

export type Crowd = {
  /** 毎フレーム state.time を渡して佇まいを更新する */
  readonly update: (time: number) => void;
};

export const createCrowd = (scene: THREE.Scene, textures: GameTextures): Crowd => {
  const w = toUnits(NPC_SHEET.frameW);
  const h = toUnits(NPC_SHEET.frameH);
  const npcs: Npc[] = [];

  SPAWNS.forEach(([x, y, variant, facing, flip], i) => {
    const tex = textures.npc.clone();
    tex.repeat.set(1 / NPC_SHEET.cols, 1 / ROWS);
    const row = variant * NPC_SHEET.facings + facing;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), spriteMaterial(tex));
    if (flip) mesh.scale.x = -1;
    const baseY = groundHeightAt(x, y) + h / 2;
    mesh.position.set(x, baseY, y);
    scene.add(mesh);
    npcs.push({ tex, mesh, row, phase: i * 1.7, baseY });
  });

  const setFrame = (n: Npc, col: number): void => {
    n.tex.offset.set(col / NPC_SHEET.cols, 1 - (n.row + 1) / ROWS);
  };
  for (const n of npcs) setFrame(n, 0);

  return {
    update: (time) => {
      for (const n of npcs) {
        // ゆっくりした体重移動（左右の足へ）と微かな上下動で立ち姿に生気を与える
        const sway = Math.sin(time * 1.3 + n.phase);
        const col = sway > 0.65 ? 1 : sway < -0.65 ? 2 : 0;
        setFrame(n, col);
        n.mesh.position.y = n.baseY + Math.sin(time * 1.6 + n.phase) * 0.015;
      }
    },
  };
};
