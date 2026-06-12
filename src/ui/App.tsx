// UI 層のルート: HUD・話しかけプロンプト・ダイアログ・ミニゲーム・持ち物画面
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { GameAction } from "../game/actions";
import { InventoryPanel } from "./InventoryPanel";
import { MinigamePanel } from "./MinigamePanel";
import { ShopDialog } from "./ShopDialog";
import { dialogStallSig, minigameSig, nearbyStallSig } from "./bridge";

type Props = {
  readonly dispatch: (action: GameAction) => void;
};

export const App = ({ dispatch }: Props) => {
  const showInventory = useSignal(false);
  const dialogStall = dialogStallSig.value;
  const minigame = minigameSig.value;
  const nearby = nearbyStallSig.value;

  // Esc で持ち物 → ミニゲーム → ダイアログの順に閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showInventory.peek()) showInventory.value = false;
      else if (minigameSig.peek()) dispatch({ kind: "exit-minigame" });
      else dispatch({ kind: "close-dialog" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, showInventory]);

  return (
    <div class="font-sans select-none">
      {/* HUD */}
      <div class="absolute top-3 left-3 flex items-center gap-3">
        <button
          type="button"
          class="rounded-full border border-sky-400/50 bg-slate-950/80 px-4 py-1.5 text-sky-300 hover:bg-slate-800"
          onClick={() => {
            showInventory.value = !showInventory.peek();
          }}
        >
          もちもの
        </button>
      </div>

      {/* 話しかけプロンプト */}
      {!dialogStall && !minigame && nearby && (
        <div class="absolute inset-x-0 bottom-10 mx-auto w-fit rounded bg-slate-950/80 px-4 py-2 text-sm text-slate-100">
          <kbd class="rounded bg-slate-700 px-1.5">E</kbd> で「{nearby.name}」に話しかける
        </div>
      )}

      {dialogStall && <ShopDialog stallId={dialogStall} dispatch={dispatch} />}
      {minigame && <MinigamePanel view={minigame} dispatch={dispatch} />}
      {showInventory.value && (
        <InventoryPanel
          onClose={() => {
            showInventory.value = false;
          }}
        />
      )}
    </div>
  );
};
