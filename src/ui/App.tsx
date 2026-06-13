// UI 層のルート: HUD・調べるプロンプト・ダイアログ・ミニゲーム
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { GameAction } from "../game/actions";
import { SHOP_MENU } from "../game/items";
import { MinigamePanel } from "./MinigamePanel";
import { ShopDialog } from "./ShopDialog";
import { dialogStallSig, minigameSig, nearbyStallSig } from "./bridge";

type Props = {
  readonly dispatch: (action: GameAction) => void;
  /** すべての音（BGM + SE）のオン/オフを切り替える。@returns 切替後にオンか */
  readonly toggleSound: () => boolean;
};

export const App = ({ dispatch, toggleSound }: Props) => {
  const soundOn = useSignal(false); // 音は既定で無効
  const dialogStall = dialogStallSig.value;
  const minigame = minigameSig.value;
  const nearby = nearbyStallSig.value;

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

  // 数字キーで品物・くじ札を選ぶ（キーボードだけで全操作できるように）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      const idx = n - 1;
      const dlg = dialogStallSig.peek();
      if (dlg) {
        const item = SHOP_MENU[dlg]?.[idx];
        if (item) dispatch({ kind: "eat", item });
        return;
      }
      const mg = minigameSig.peek();
      if (mg && !mg.finished && (mg.id === "kuji" || mg.id === "senbiki") && idx < (mg.count ?? 0)) {
        dispatch(
          mg.id === "kuji"
            ? { kind: "pick-lot", index: idx, rng: Math.random }
            : { kind: "pull-string", index: idx, rng: Math.random },
        );
      }
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

      {/* 屋台へ向かうプロンプト（キーボード操作） */}
      {!dialogStall && !minigame && nearby && (
        <div class="absolute inset-x-0 bottom-10 mx-auto w-fit rounded bg-slate-950/80 px-4 py-2 text-sm text-slate-100">
          <kbd class="rounded bg-slate-700 px-1.5">E</kbd>：{nearby.name}屋台へ
        </div>
      )}

      {dialogStall && <ShopDialog stallId={dialogStall} dispatch={dispatch} />}
      {minigame && <MinigamePanel view={minigame} dispatch={dispatch} />}
    </div>
  );
};
