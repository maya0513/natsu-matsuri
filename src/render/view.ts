// three.js 副作用層の組み立て。GameState を読んで描画するだけで、状態には書き込まない
import * as THREE from "three";
import type { GameState } from "../game/types";
import { createCamera, followPlayer } from "./camera";
import { createScene } from "./scene";
import { createPlayerSprite } from "./sprites";
import { loadGameTextures } from "./textures";

export type GameView = {
  readonly render: (state: GameState) => void;
  readonly dispose: () => void;
};

export const createGameView = async (container: HTMLElement): Promise<GameView> => {
  const textures = await loadGameTextures();

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = createScene(textures);
  const camera = createCamera(window.innerWidth / window.innerHeight);
  const player = createPlayerSprite(textures.player);
  scene.add(player.mesh);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  return {
    render: (state) => {
      player.sync(state.player, state.time);
      followPlayer(camera, state.player.pos);
      renderer.render(scene, camera);
    },
    dispose: () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
};
