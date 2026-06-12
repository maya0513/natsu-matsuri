// ゲーム状態 → UI signals の橋渡し。
// publish は毎フレーム呼ばれるが、値が変わったときだけ signal に書く（CLAUDE.md の制約）
import { signal } from "@preact/signals";
import { INTERACT_RADIUS } from "../game/constants";
import { type Stall, nearestStall } from "../game/stalls";
import type { GameState, ItemId, Mode } from "../game/types";

export const inventorySig = signal<readonly ItemId[]>([]);
export const modeSig = signal<Mode>({ kind: "walk" });
/** walk 中、話しかけられる距離にいる屋台（HUD のプロンプト表示用） */
export const nearbyStallSig = signal<Stall | undefined>(undefined);

export const publish = (state: GameState): void => {
  if (inventorySig.peek() !== state.inventory) inventorySig.value = state.inventory;
  if (modeSig.peek() !== state.mode) modeSig.value = state.mode;

  const nearby =
    state.mode.kind === "walk" ? nearestStall(state.player.pos, INTERACT_RADIUS) : undefined;
  if (nearbyStallSig.peek()?.id !== nearby?.id) nearbyStallSig.value = nearby;
};
