// three.js 副作用層の組み立て。GameState を読んで描画するだけで、状態には書き込まない
import * as THREE from "three";
import type { GameState } from "../game/types";
import { createCamera, followPlayer } from "./camera";
import { createScene } from "./scene";
import { createPlayerSprite, syncPlayerSprite } from "./sprites";

export type GameView = {
  readonly render: (state: GameState) => void;
  readonly dispose: () => void;
};

export const createGameView = (container: HTMLElement): GameView => {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = createScene();
  const camera = createCamera(window.innerWidth / window.innerHeight);
  const playerSprite = createPlayerSprite();
  scene.add(playerSprite);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  return {
    render: (state) => {
      syncPlayerSprite(playerSprite, state.player);
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
