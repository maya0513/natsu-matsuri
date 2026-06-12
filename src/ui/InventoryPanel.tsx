// 持ち物画面（アイテムごとの個数表示）
import { ITEM_INFO } from "../game/items";
import type { ItemId } from "../game/types";
import { inventorySig } from "./bridge";

type Props = {
  readonly onClose: () => void;
};

export const InventoryPanel = ({ onClose }: Props) => {
  const counts = new Map<ItemId, number>();
  for (const item of inventorySig.value) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return (
    <div class="absolute inset-0 flex items-center justify-center bg-black/60">
      <div class="w-[min(24rem,90vw)] rounded-lg border-2 border-sky-400/60 bg-slate-950/95 p-4 text-slate-100">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-bold text-sky-300">もちもの</h2>
          <button
            type="button"
            class="rounded px-2 py-1 text-sm text-slate-400 hover:bg-slate-800"
            onClick={onClose}
          >
            とじる
          </button>
        </div>
        {counts.size === 0 ? (
          <p class="text-sm text-slate-400">まだ何も持っていない。屋台を回ってみよう</p>
        ) : (
          <ul class="grid grid-cols-2 gap-2">
            {[...counts].map(([item, n]) => (
              <li key={item} class="rounded bg-slate-800/80 px-3 py-2 text-sm">
                {ITEM_INFO[item].emoji} {ITEM_INFO[item].name} ×{n}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
