// ミニゲームの「動く部分」を描く 2D canvas オーバーレイ。
// 毎フレーム変わる連続値（マーカー位置）は signal を通さず、ここが直接描く。
import { HIT_WINDOW, SHATEKI_TARGETS } from "../game/minigames";
import type { GameState, KingyoState, ShatekiState, YoyoState } from "../game/types";

/** 作画解像度（CSS で 4 倍に拡大表示） */
const W = 96;
const H = 40;
const SCALE = 4;

export type MinigameOverlay = {
  readonly draw: (state: GameState) => void;
  readonly dispose: () => void;
};

const drawYoyo = (ctx: CanvasRenderingContext2D, g: YoyoState): void => {
  // 水槽
  ctx.fillStyle = "#2e6e9e";
  ctx.fillRect(4, 18, W - 8, 18);
  ctx.fillStyle = "#5ba3cf";
  ctx.fillRect(4, 18, W - 8, 3);
  // 成功ゾーン
  const zw = HIT_WINDOW.yoyo * 2 * (W - 16);
  ctx.fillStyle = "rgba(255, 210, 122, 0.5)";
  ctx.fillRect(W / 2 - zw / 2, 16, zw, 22);
  // ヨーヨー（マーカー）
  const x = 8 + g.t * (W - 16);
  ctx.fillStyle = "#e85d6a";
  ctx.fillRect(x - 3, 24, 6, 6);
  ctx.fillStyle = "#ffd27a";
  ctx.fillRect(x - 1, 24, 2, 6);
  // こより
  ctx.strokeStyle = "#e8e4da";
  ctx.beginPath();
  ctx.moveTo(x, 24);
  ctx.lineTo(x, 4);
  ctx.stroke();
};

const drawKingyo = (ctx: CanvasRenderingContext2D, g: KingyoState): void => {
  // 水槽
  ctx.fillStyle = "#2e6e9e";
  ctx.fillRect(4, 12, W - 8, 24);
  ctx.fillStyle = "#5ba3cf";
  ctx.fillRect(4, 12, W - 8, 3);
  // 成功ゾーン
  const zw = HIT_WINDOW.kingyo * 2 * (W - 16);
  ctx.fillStyle = "rgba(255, 210, 122, 0.45)";
  ctx.fillRect(W / 2 - zw / 2, 12, zw, 24);
  // 金魚
  const x = 8 + g.fishX * (W - 16);
  ctx.fillStyle = "#e85d3a";
  ctx.fillRect(x - 4, 22, 8, 4);
  // 尾びれ（進行方向の逆）
  ctx.fillRect(x + (g.dir === 1 ? -7 : 5), 21, 3, 6);
  ctx.fillStyle = "#1a1226";
  ctx.fillRect(x + (g.dir === 1 ? 2 : -3), 23, 1, 1); // 目
};

const drawShateki = (ctx: CanvasRenderingContext2D, g: ShatekiState): void => {
  // 棚
  ctx.fillStyle = "#6b4a2f";
  ctx.fillRect(4, 28, W - 8, 4);
  // 的
  SHATEKI_TARGETS.forEach((tx, i) => {
    const x = 8 + tx * (W - 16);
    if (g.targets[i]) {
      ctx.fillStyle = "#e8e4da";
      ctx.fillRect(x - 6, 14, 12, 14);
      ctx.fillStyle = "#c4452e";
      ctx.fillRect(x - 4, 16, 8, 8);
      ctx.fillStyle = "#e8e4da";
      ctx.fillRect(x - 2, 18, 4, 4);
    } else {
      ctx.fillStyle = "#55504e";
      ctx.fillRect(x - 6, 26, 12, 3);
    }
  });
  // 照準
  const ax = 8 + g.aimX * (W - 16);
  ctx.strokeStyle = "#ffd27a";
  ctx.beginPath();
  ctx.moveTo(ax, 8);
  ctx.lineTo(ax, 36);
  ctx.moveTo(ax - 4, 22);
  ctx.lineTo(ax + 4, 22);
  ctx.stroke();
};

export const createMinigameOverlay = (container: HTMLElement): MinigameOverlay => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = [
    "position: absolute",
    "left: 50%",
    "bottom: 160px",
    `width: ${W * SCALE}px`,
    `height: ${H * SCALE}px`,
    "transform: translateX(-50%)",
    "image-rendering: pixelated",
    "display: none",
    "pointer-events: none",
  ].join(";");
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  return {
    draw: (state) => {
      const visible = state.mode.kind === "minigame" && state.mode.game.id !== "kuji";
      canvas.style.display = visible ? "block" : "none";
      if (!visible || !ctx || state.mode.kind !== "minigame") return;

      ctx.clearRect(0, 0, W, H);
      const g = state.mode.game;
      if (g.id === "yoyo") drawYoyo(ctx, g);
      else if (g.id === "kingyo") drawKingyo(ctx, g);
      else if (g.id === "shateki") drawShateki(ctx, g);
    },
    dispose: () => {
      canvas.remove();
    },
  };
};
