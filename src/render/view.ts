// three.js 副作用層の組み立て。GameState を読んで描画するだけで、状態には書き込まない
import * as THREE from "three";
import type { GameState } from "../game/types";
import { createCamera, followPlayer } from "./camera";
import { createCrowd } from "./crowd";
import { createFireflies } from "./fireflies";
import { createFireworksRenderer } from "./fireworks";
import { createMinigameOverlay } from "./minigameOverlay";
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
  readonly dispose: () => void;
};

export type GameViewOptions = {
  /** 花火が破裂した瞬間のコールバック（SE 用） */
  readonly onFireworkBurst?: () => void;
};

export const createGameView = async (
  container: HTMLElement,
  options: GameViewOptions = {},
): Promise<GameView> => {
  const textures = await loadGameTextures();

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = createScene(textures);
  const camera = createCamera(window.innerWidth / window.innerHeight);
  const player = createPlayerSprite(textures.player);
  scene.add(player.mesh);
  const heldItem = createHeldItemSprite(textures.held);
  scene.add(heldItem.mesh);
  const overlay = createMinigameOverlay(container);
  const fireworks = createFireworksRenderer(scene, options.onFireworkBurst);
  const crowd = createCrowd(scene, textures);
  const riverLanterns = createRiverLanterns(scene);
  const spirits = createSpirits(scene, textures);
  const stallSmoke = createStallSmoke(scene);
  const fireflies = createFireflies(scene);

  // プレイヤー追従の淡い暖色ライト（提灯に照らされて夜道を歩く存在感）
  const playerLight = new THREE.PointLight("#ffcf8a", 7, 7, 1.6);
  scene.add(playerLight);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

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
      renderer.render(scene, camera);
      overlay.draw(state);
    },
    spawnFirework: (seed, time) => {
      fireworks.spawn(seed, time);
    },
    dispose: () => {
      window.removeEventListener("resize", onResize);
      overlay.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
};
