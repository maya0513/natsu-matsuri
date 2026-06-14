// 参拝客（喋らない NPC）のスプライトシート。
// 主人公と同じ作画関数 drawFrame を流用し、浴衣・帯の配色だけ差し替えてバリエーションを作る。
// 行 = (浴衣バリエーション × 向き)、列 = アニメフレーム（idle / 左足 / 右足）。
import { PAL } from "../palette.ts";
import { type PixelCanvas, blit, createCanvas } from "../pixel.ts";
import {
  type Facing,
  type FigureColors,
  PLAYER_FRAME_H,
  PLAYER_FRAME_W,
  drawFrame,
} from "./player.ts";

export const NPC_FRAME_W = PLAYER_FRAME_W;
export const NPC_FRAME_H = PLAYER_FRAME_H;
export const NPC_COLS = 3;

/** 浴衣バリエーション（撫子・萌葱・藤・鼠）。帯は対比色 */
const VARIANTS: readonly FigureColors[] = [
  {
    yukata: PAL.npcPink,
    yukataShade: PAL.npcPinkShade,
    yukataDot: PAL.npcPinkDot,
    obi: PAL.obi,
    obiShade: PAL.obiShade,
  },
  {
    yukata: PAL.npcGreen,
    yukataShade: PAL.npcGreenShade,
    yukataDot: PAL.npcGreenDot,
    obi: PAL.npcPink,
    obiShade: PAL.npcPinkShade,
  },
  {
    yukata: PAL.npcPlum,
    yukataShade: PAL.npcPlumShade,
    yukataDot: PAL.npcPlumDot,
    obi: PAL.obi,
    obiShade: PAL.obiShade,
  },
  {
    yukata: PAL.npcGray,
    yukataShade: PAL.npcGrayShade,
    yukataDot: PAL.npcGrayDot,
    obi: PAL.npcPlum,
    obiShade: PAL.npcPlumShade,
  },
];

/** 向きは手前向き(down)と奥向き(up)の 2 種。屋台に向く後ろ姿と、こちらを向く正面 */
const FACINGS: readonly Facing[] = ["down", "up"];

export const NPC_VARIANTS = VARIANTS.length;
export const NPC_FACINGS = FACINGS.length;

/** 参拝客スプライトシート */
export const drawNpcSheet = (): PixelCanvas => {
  const rows = NPC_VARIANTS * NPC_FACINGS;
  const sheet = createCanvas(NPC_FRAME_W * NPC_COLS, NPC_FRAME_H * rows);
  VARIANTS.forEach((colors, v) => {
    FACINGS.forEach((facing, fi) => {
      const row = v * NPC_FACINGS + fi;
      for (let col = 0; col < NPC_COLS; col++) {
        blit(sheet, drawFrame(facing, col, colors), col * NPC_FRAME_W, row * NPC_FRAME_H);
      }
    });
  });
  return sheet;
};
