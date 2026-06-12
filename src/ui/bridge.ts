// ゲーム状態 → UI signals の橋渡し。
// publish は毎フレーム呼ばれるが、値が変わったときだけ signal に書く（CLAUDE.md の制約）。
// ミニゲームのマーカー位置のような毎フレーム動く値は signal に流さず、
// render 層の canvas オーバーレイが直接描画する。
import { signal } from "@preact/signals";
import { INTERACT_RADIUS } from "../game/constants";
import { isFinished } from "../game/minigames";
import { type Stall, nearestStall } from "../game/stalls";
import type { GameState, ItemId, MinigameId, StallId } from "../game/types";

export const inventorySig = signal<readonly ItemId[]>([]);
/** 開いている売買/受付ダイアログの屋台 */
export const dialogStallSig = signal<StallId | undefined>(undefined);
/** walk 中、話しかけられる距離にいる屋台（HUD のプロンプト表示用） */
export const nearbyStallSig = signal<Stall | undefined>(undefined);

/** ミニゲームの離散ビュー（毎フレーム変わる連続値は含めない） */
export type MinigameView = {
  readonly id: MinigameId;
  readonly last?: "hit" | "miss" | ItemId;
  readonly poiLeft?: number;
  readonly caught?: number;
  readonly shotsLeft?: number;
  readonly hits?: number;
  readonly finished: boolean;
};

export const minigameSig = signal<MinigameView | undefined>(undefined);

const projectMinigame = (state: GameState): MinigameView | undefined => {
  if (state.mode.kind !== "minigame") return undefined;
  const g = state.mode.game;
  const base = { id: g.id, finished: isFinished(g) } as const;
  switch (g.id) {
    case "kuji":
      return { ...base, ...(g.last !== undefined && { last: g.last }) };
    case "yoyo":
      return { ...base, ...(g.last !== undefined && { last: g.last }) };
    case "kingyo":
      return {
        ...base,
        poiLeft: g.poiLeft,
        caught: g.caught,
        ...(g.last !== undefined && { last: g.last }),
      };
    case "shateki":
      return {
        ...base,
        shotsLeft: g.shotsLeft,
        hits: g.targets.filter((t) => !t).length,
        ...(g.last !== undefined && { last: g.last }),
      };
  }
};

const sameView = (a: MinigameView | undefined, b: MinigameView | undefined): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export const publish = (state: GameState): void => {
  if (inventorySig.peek() !== state.inventory) inventorySig.value = state.inventory;

  const dialog = state.mode.kind === "dialog" ? state.mode.stallId : undefined;
  if (dialogStallSig.peek() !== dialog) dialogStallSig.value = dialog;

  const mg = projectMinigame(state);
  if (!sameView(minigameSig.peek(), mg)) minigameSig.value = mg;

  const nearby =
    state.mode.kind === "walk" ? nearestStall(state.player.pos, INTERACT_RADIUS) : undefined;
  if (nearbyStallSig.peek()?.id !== nearby?.id) nearbyStallSig.value = nearby;
};
