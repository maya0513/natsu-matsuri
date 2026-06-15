// 全アセットの再生成エントリポイント: `just gen-assets`
// 作画解像度 → ASSET_SCALE 倍に拡大 → public/assets/*.png
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_SCALE } from "../../src/assets/meta.ts";
import { encodePng } from "./png.ts";
import { type PixelCanvas, upscale } from "./pixel.ts";
import { drawHeldItemsSheet } from "./sprites/heldItems.ts";
import { drawMinigameSheet } from "./sprites/minigame.ts";
import { drawNpcSheet } from "./sprites/npc.ts";
import { drawPlayerSheet } from "./sprites/player.ts";
import { drawStallSheet } from "./sprites/stalls.ts";
import {
  drawGhost,
  drawLantern,
  drawShinboku,
  drawShrine,
  drawStoneLantern,
  drawTorii,
  drawTreesSheet,
  drawYagura,
} from "./sprites/structures.ts";
import { drawGroundTile, drawPathTile } from "./sprites/tiles.ts";
import {
  buildBgm,
  buildSeBurst,
  buildSeBuy,
  buildSeHit,
  buildSeLaunch,
  buildSeMiss,
} from "./sounds.ts";
import { SAMPLE_RATE } from "./synth.ts";
import { encodeWav } from "./wav.ts";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../../public/assets");

const write = (name: string, canvas: PixelCanvas): void => {
  const scaled = upscale(canvas, ASSET_SCALE);
  writeFileSync(join(outDir, name), encodePng(scaled.width, scaled.height, scaled.data));
  console.log(`✓ ${name} (${scaled.width}x${scaled.height})`);
};

const writeWav = (name: string, samples: Float32Array): void => {
  writeFileSync(join(outDir, name), encodeWav(SAMPLE_RATE, samples));
  console.log(`✓ ${name} (${(samples.length / SAMPLE_RATE).toFixed(1)}s)`);
};

mkdirSync(outDir, { recursive: true });
write("player.png", drawPlayerSheet());
write("npc.png", drawNpcSheet());
write("stalls.png", drawStallSheet());
write("held.png", drawHeldItemsSheet());
write("minigame.png", drawMinigameSheet());
write("torii.png", drawTorii());
write("shrine.png", drawShrine());
write("yagura.png", drawYagura());
write("lantern.png", drawLantern());
write("stone-lantern.png", drawStoneLantern());
write("ghost.png", drawGhost());
write("shinboku.png", drawShinboku());
write("trees.png", drawTreesSheet());
write("tile-path.png", drawPathTile());
write("tile-ground.png", drawGroundTile());
writeWav("bgm.wav", buildBgm());
writeWav("se-launch.wav", buildSeLaunch());
writeWav("se-burst.wav", buildSeBurst());
writeWav("se-hit.wav", buildSeHit());
writeWav("se-miss.wav", buildSeMiss());
writeWav("se-buy.wav", buildSeBuy());
console.log("全アセット生成完了");
