// UI 層のルート: HUD・調べるプロンプト・ダイアログ・ミニゲーム
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { GameAction } from "../game/actions";
import { isTouchDevice } from "../input/touch";
import { MinigamePanel } from "./MinigamePanel";
import { ShopDialog } from "./ShopDialog";
import { dialogStallSig, minigameSig, nearbyStallSig } from "./bridge";

type Props = {
  readonly dispatch: (action: GameAction) => void;
  /** すべての音（BGM + SE）のオン/オフを切り替える。@returns 切替後にオンか */
  readonly toggleSound: () => boolean;
};

const touch = isTouchDevice();

export const App = ({ dispatch, toggleSound }: Props) => {
  const soundOn = useSignal(false); // 音は既定で無効
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

  // Esc でミニゲーム → ダイアログの順に閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (minigameSig.peek()) dispatch({ kind: "exit-minigame" });
      else dispatch({ kind: "close-dialog" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <div class="font-sans select-none">
      {/* HUD */}
      <div class="absolute top-3 left-3 flex items-center gap-3">
        <button
          type="button"
          class="rounded-full border border-slate-500/50 bg-slate-950/80 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
          title={soundOn.value ? "音を消す" : "音を出す"}
          onClick={() => {
            soundOn.value = toggleSound();
          }}
        >
          {soundOn.value ? "🔊" : "🔇"}
        </button>
      </div>

      {/* 操作ヒント（タッチ時のみ、開始数秒だけ） */}
      {touch && showHint.value && !dialogStall && !minigame && (
        <div class="absolute inset-x-0 top-16 mx-auto w-fit rounded bg-slate-950/80 px-4 py-2 text-center text-sm text-slate-100">
          左下のスティックで移動／🏮 で屋台へ
        </div>
      )}

      {/* 屋台へ向かうプロンプト */}
      {!dialogStall && !minigame && nearby && (
        <div class="absolute inset-x-0 bottom-10 mx-auto w-fit rounded bg-slate-950/80 px-4 py-2 text-sm text-slate-100">
          {touch ? (
            <>🏮：{nearby.name}屋台へ</>
          ) : (
            <>
              <kbd class="rounded bg-slate-700 px-1.5">E</kbd>：{nearby.name}屋台へ
            </>
          )}
        </div>
      )}

      {dialogStall && <ShopDialog stallId={dialogStall} dispatch={dispatch} />}
      {minigame && <MinigamePanel view={minigame} dispatch={dispatch} />}
    </div>
  );
};
