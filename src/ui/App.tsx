// UI 層のルート: HUD・話しかけプロンプト・ダイアログ・持ち物画面
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { GameAction } from "../game/actions";
import { ShopDialog } from "./ShopDialog";
import { InventoryPanel } from "./InventoryPanel";
import { modeSig, nearbyStallSig } from "./bridge";

type Props = {
  readonly dispatch: (action: GameAction) => void;
};

export const App = ({ dispatch }: Props) => {
  const showInventory = useSignal(false);
  const mode = modeSig.value;
  const nearby = nearbyStallSig.value;

  // Esc でダイアログ/持ち物を閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showInventory.peek()) showInventory.value = false;
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
      {mode.kind === "walk" && nearby && (
        <div class="absolute inset-x-0 bottom-10 mx-auto w-fit rounded bg-slate-950/80 px-4 py-2 text-sm text-slate-100">
          <kbd class="rounded bg-slate-700 px-1.5">E</kbd> で「{nearby.name}」に話しかける
        </div>
      )}

      {mode.kind === "dialog" && <ShopDialog stallId={mode.stallId} dispatch={dispatch} />}
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
