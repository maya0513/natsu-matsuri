// ミニゲームの「動く部分」を描く 2D canvas オーバーレイ。
// 毎フレーム変わる連続値（マーカー位置）は signal を通さず、ここが直接描く。
import { HIT_WINDOW } from "../game/minigames";
import type { GameState, KingyoState, MoguraState, ShatekiState, YoyoState } from "../game/types";

/** 作画解像度（CSS で 4 倍に拡大表示） */
const W = 96;
const H = 40;
const SCALE = 4;

/** x(0..1) → canvas 座標 */
const cx = (x: number): number => 8 + x * (W - 16);

export type MinigameOverlay = {
  readonly draw: (state: GameState) => void;
  readonly dispose: () => void;
};

const BALLOON_COLORS = ["#e85d6a", "#5b8fe8", "#e8c04a"] as const;

const drawYoyo = (ctx: CanvasRenderingContext2D, g: YoyoState): void => {
  // 水槽
  ctx.fillStyle = "#2e6e9e";
  ctx.fillRect(4, 20, W - 8, 16);
  ctx.fillStyle = "#5ba3cf";
  ctx.fillRect(4, 20, W - 8, 3);
  // 水風船（上下に揺れる。掬うと消える）
  g.balloons.forEach((b, i) => {
    if (!b.alive) return;
    const x = cx(b.x);
    const y = 27 + Math.sin(b.phase) * 4;
    ctx.fillStyle = BALLOON_COLORS[i % BALLOON_COLORS.length] ?? "#e85d6a";
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 2, y - 2, 1, 1); // 照り
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y - 6);
    ctx.stroke();
  });
  // フック（左右にスイープ）＋こより
  const hx = cx(g.hookX);
  ctx.strokeStyle = "#e8e4da";
  ctx.beginPath();
  ctx.moveTo(hx, 2);
  ctx.lineTo(hx, 14);
  ctx.arc(hx - 2, 14, 2, 0, Math.PI);
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
  const x = cx(g.fishX);
  ctx.fillStyle = "#e85d3a";
  ctx.fillRect(x - 4, 22, 8, 4);
  ctx.fillRect(x + (g.dir === 1 ? -7 : 5), 21, 3, 6); // 尾びれ
  ctx.fillStyle = "#1a1226";
  ctx.fillRect(x + (g.dir === 1 ? 2 : -3), 23, 1, 1); // 目
};

const drawShateki = (ctx: CanvasRenderingContext2D, g: ShatekiState): void => {
  // 棚
  ctx.fillStyle = "#6b4a2f";
  ctx.fillRect(4, 30, W - 8, 4);
  g.targets.forEach((t) => {
    const x = cx(t.x);
    if (!t.alive) {
      // 倒れた的
      ctx.fillStyle = "#55504e";
      ctx.fillRect(x - 6, 28, 12, 3);
      return;
    }
    if (t.up) {
      // 立っている的（支柱 + 同心円）
      ctx.fillStyle = "#8a6038";
      ctx.fillRect(x - 1, 22, 2, 8);
      ctx.fillStyle = "#e8e4da";
      ctx.fillRect(x - 6, 10, 12, 12);
      ctx.fillStyle = "#c4452e";
      ctx.fillRect(x - 4, 12, 8, 8);
      ctx.fillStyle = "#e8e4da";
      ctx.fillRect(x - 2, 14, 4, 4);
    } else {
      // 伏せて出番待ち
      ctx.fillStyle = "#3a3450";
      ctx.fillRect(x - 5, 28, 10, 2);
    }
  });
  // 照準（左右にスイープ）
  const ax = cx(g.aimX);
  ctx.strokeStyle = "#ffd27a";
  ctx.beginPath();
  ctx.moveTo(ax, 6);
  ctx.lineTo(ax, 34);
  ctx.moveTo(ax - 4, 20);
  ctx.lineTo(ax + 4, 20);
  ctx.stroke();
};

const drawMogura = (ctx: CanvasRenderingContext2D, g: MoguraState): void => {
  // 地面
  ctx.fillStyle = "#241b3d";
  ctx.fillRect(4, 18, W - 8, 18);
  g.moles.forEach((m) => {
    const x = cx(m.x);
    // 穴
    ctx.fillStyle = "#0d0a1a";
    ctx.fillRect(x - 6, 26, 12, 6);
    if (m.up) {
      // モグラ（顔を出している）
      ctx.fillStyle = "#6b4a2f";
      ctx.fillRect(x - 5, 18, 10, 10);
      ctx.fillStyle = "#8a6038";
      ctx.fillRect(x - 3, 20, 6, 4); // 鼻面
      ctx.fillStyle = "#1a1226";
      ctx.fillRect(x - 3, 21, 1, 1); // 目
      ctx.fillRect(x + 2, 21, 1, 1);
    }
  });
  // ハンマー（左右にスイープ）
  const hx = cx(g.hammerX);
  ctx.fillStyle = "#8a6038";
  ctx.fillRect(hx - 1, 6, 2, 10); // 柄
  ctx.fillStyle = "#c4452e";
  ctx.fillRect(hx - 4, 2, 8, 5); // 頭
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
      // くじ引き・千本引き・ビンゴは DOM の UI なのでオーバーレイなし
      const id = state.mode.kind === "minigame" ? state.mode.game.id : undefined;
      const visible = id === "yoyo" || id === "kingyo" || id === "shateki" || id === "mogura";
      canvas.style.display = visible ? "block" : "none";
      if (!visible || !ctx || state.mode.kind !== "minigame") return;

      ctx.clearRect(0, 0, W, H);
      const g = state.mode.game;
      if (g.id === "yoyo") drawYoyo(ctx, g);
      else if (g.id === "kingyo") drawKingyo(ctx, g);
      else if (g.id === "shateki") drawShateki(ctx, g);
      else if (g.id === "mogura") drawMogura(ctx, g);
    },
    dispose: () => {
      canvas.remove();
    },
  };
};
