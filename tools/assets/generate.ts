// 全アセットの再生成エントリポイント: `just gen-assets`
// 作画解像度 → ASSET_SCALE 倍に拡大 → public/assets/*.png
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_SCALE } from "../../src/assets/meta.ts";
import { encodePng } from "./png.ts";
import { type PixelCanvas, upscale } from "./pixel.ts";
import { drawPlayerSheet } from "./sprites/player.ts";
import { drawStallSheet } from "./sprites/stalls.ts";
import { drawLantern, drawShrine, drawTorii } from "./sprites/structures.ts";
import { drawGroundTile, drawPathTile } from "./sprites/tiles.ts";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../../public/assets");

const write = (name: string, canvas: PixelCanvas): void => {
  const scaled = upscale(canvas, ASSET_SCALE);
  writeFileSync(join(outDir, name), encodePng(scaled.width, scaled.height, scaled.data));
  console.log(`✓ ${name} (${scaled.width}x${scaled.height})`);
};

mkdirSync(outDir, { recursive: true });
write("player.png", drawPlayerSheet());
write("stalls.png", drawStallSheet());
write("torii.png", drawTorii());
write("shrine.png", drawShrine());
write("lantern.png", drawLantern());
write("tile-path.png", drawPathTile());
write("tile-ground.png", drawGroundTile());
console.log("全アセット生成完了");
