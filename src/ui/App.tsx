// UI 層のルート: HUD・話しかけプロンプト・ダイアログ・ミニゲーム・持ち物画面
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { GameAction } from "../game/actions";
import { isTouchDevice } from "../input/touch";
import { InventoryPanel } from "./InventoryPanel";
import { MinigamePanel } from "./MinigamePanel";
import { ShopDialog } from "./ShopDialog";
import { dialogStallSig, minigameSig, nearbyStallSig } from "./bridge";

type Props = {
  readonly dispatch: (action: GameAction) => void;
  readonly toggleMute: () => boolean;
};

const touch = isTouchDevice();

export const App = ({ dispatch, toggleMute }: Props) => {
  const showInventory = useSignal(false);
  const muted = useSignal(false);
  const showHint = useSignal(touch);
  const dialogStall = dialogStallSig.value;
  const minigame = minigameSig.value;
  const nearby = nearbyStallSig.value;

  // タッチ操作のヒントは数秒で自動的に消す
  useEffect(() => {
    if (!touch) return;
    const id = setTimeout(() => {
      showHint.value = false;
    }, 6000);
    return () => clearTimeout(id);
  }, [showHint]);

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
        <button
          type="button"
          class="rounded-full border border-slate-500/50 bg-slate-950/80 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
          title={muted.value ? "音を出す" : "ミュート"}
          onClick={() => {
            muted.value = toggleMute();
          }}
        >
          {muted.value ? "🔇" : "🔊"}
        </button>
      </div>

      {/* 操作ヒント（タッチ時のみ、開始数秒だけ） */}
      {touch && showHint.value && !dialogStall && !minigame && (
        <div class="absolute inset-x-0 top-16 mx-auto w-fit rounded bg-slate-950/80 px-4 py-2 text-center text-sm text-slate-100">
          左下のスティックで移動 ／ 🏮 ボタンで話しかける
        </div>
      )}

      {/* 話しかけプロンプト */}
      {!dialogStall && !minigame && nearby && (
        <div class="absolute inset-x-0 bottom-10 mx-auto w-fit rounded bg-slate-950/80 px-4 py-2 text-sm text-slate-100">
          {touch ? (
            <>🏮 ボタンで「{nearby.name}」に話しかける</>
          ) : (
            <>
              <kbd class="rounded bg-slate-700 px-1.5">E</kbd> で「{nearby.name}」に話しかける
            </>
          )}
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
