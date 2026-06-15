// three.js 副作用層の組み立て。GameState を読んで描画するだけで、状態には書き込まない
import * as THREE from "three";
import type { GameState } from "../game/types";
import { createCamera, followPlayer } from "./camera";
import { createCrowd } from "./crowd";
import { createFireflies } from "./fireflies";
import { createFireworksRenderer } from "./fireworks";
import { createMinigameInterior } from "./minigameStage";
import { createRiverLanterns } from "./river";
import { createScene } from "./scene";
import { createSpirits } from "./spirits";
import { createStallSmoke } from "./stallSmoke";
import { createHeldItemSprite, createPlayerSprite } from "./sprites";
import { groundHeightAt } from "./terrain";
import { loadGameTextures } from "./textures";

export type GameView = {
  readonly render: (state: GameState) => void;
  /** firework-launched イベント受信時に呼ぶ */
  readonly spawnFirework: (seed: number, time: number) => void;
  /** 画面座標（clientX/Y）でミニゲーム内部空間の対象を拾う。なければ undefined */
  readonly pickAt: (clientX: number, clientY: number) => number | undefined;
  readonly dispose: () => void;
};

export type GameViewOptions = {
  /** 花火が破裂した瞬間のコールバック（SE 用） */
  readonly onFireworkBurst?: () => void;
};

/** 屋台に入る/出る暗転フェードの所要秒 */
const FADE_DUR = 0.45;
type Phase = "world" | "toGame" | "game" | "toWorld";

export const createGameView = async (
  container: HTMLElement,
  options: GameViewOptions = {},
): Promise<GameView> => {
  const textures = await loadGameTextures();

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  // 世界と内部空間を手動で切り替えて描くので自動クリアは切る（毎フレーム先頭で clear）
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);

  const scene = createScene(textures);
  const camera = createCamera(window.innerWidth / window.innerHeight);
  const player = createPlayerSprite(textures.player);
  scene.add(player.mesh);
  const heldItem = createHeldItemSprite(textures.held);
  scene.add(heldItem.mesh);
  const interior = createMinigameInterior(textures);
  interior.setAspect(window.innerWidth / window.innerHeight);
  const fireworks = createFireworksRenderer(scene, options.onFireworkBurst);
  const crowd = createCrowd(scene, textures);
  const riverLanterns = createRiverLanterns(scene);
  const spirits = createSpirits(scene, textures);
  const stallSmoke = createStallSmoke(scene);
  const fireflies = createFireflies(scene);

  // プレイヤー追従の淡い暖色ライト（提灯に照らされて夜道を歩く存在感）
  const playerLight = new THREE.PointLight("#ffcf8a", 7, 7, 1.6);
  scene.add(playerLight);

  // 屋台への出入りを表す暗幕（夜色）。opacity を毎フレーム設定する
  const fade = document.createElement("div");
  fade.style.cssText = [
    "position: absolute",
    "inset: 0",
    "background: #05030f",
    "opacity: 0",
    "pointer-events: none",
  ].join(";");
  container.appendChild(fade);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    interior.setAspect(window.innerWidth / window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  // 暗転フェードの状態機械
  let phase: Phase = "world";
  let phaseStart = 0;

  return {
    render: (state) => {
      player.sync(state.player, state.time);
      heldItem.sync(state.player, state.heldItem, state.time);
      followPlayer(camera, state.player.pos);
      playerLight.position.set(
        state.player.pos.x,
        groundHeightAt(state.player.pos.x, state.player.pos.y) + 1.6,
        state.player.pos.y,
      );
      crowd.update(state.time);
      riverLanterns.update(state.time);
      spirits.update(state.time);
      stallSmoke.update(state.time);
      fireflies.update(state.time);
      fireworks.update(state.time);
      interior.update(state);

      // フェード遷移: 世界 ⇄ 屋台内部
      const inMinigame = state.mode.kind === "minigame";
      if (phase === "world" && inMinigame) {
        phase = "toGame";
        phaseStart = state.time;
      } else if (phase === "game" && !inMinigame) {
        phase = "toWorld";
        phaseStart = state.time;
      }
      const p = Math.min((state.time - phaseStart) / FADE_DUR, 1);
      if (phase === "toGame" && p >= 1) phase = "game";
      else if (phase === "toWorld" && p >= 1) phase = "world";

      // 前半は元シーン、後半は遷移先シーンを描く（暗転のピークで切替）
      const showInterior =
        phase === "game" ||
        (phase === "toGame" && p >= 0.5) ||
        (phase === "toWorld" && p < 0.5);
      const opacity =
        phase === "toGame" || phase === "toWorld" ? 1 - Math.abs(1 - 2 * p) : 0;
      fade.style.opacity = String(opacity);

      renderer.clear();
      if (showInterior) interior.render(renderer);
      else renderer.render(scene, camera);
    },
    spawnFirework: (seed, time) => {
      fireworks.spawn(seed, time);
    },
    pickAt: (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      return interior.pick(x, y);
    },
    dispose: () => {
      window.removeEventListener("resize", onResize);
      interior.dispose();
      fade.remove();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
};
