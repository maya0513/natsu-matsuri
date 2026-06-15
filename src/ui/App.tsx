// UI 層のルート: HUD・調べるプロンプト・ダイアログ・ミニゲーム
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { GameAction } from "../game/actions";
import { SHOP_MENU } from "../game/items";
import { MinigamePanel, MinigameStatus } from "./MinigamePanel";
import { ShopDialog } from "./ShopDialog";
import { dialogStallSig, minigameSig, nearbyStallSig } from "./bridge";

type Props = {
  readonly dispatch: (action: GameAction) => void;
  /** すべての音（BGM + SE）のオン/オフを切り替える。@returns 切替後にオンか */
  readonly toggleSound: () => boolean;
};

/** 開いているモーダル内のボタン一覧（選択肢） */
const modalButtons = (): HTMLButtonElement[] => {
  const panel = document.querySelector("[data-modal]");
  return panel ? Array.from(panel.querySelectorAll("button")) : [];
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

  // 決定キー（Enter/Space/E）とモーダル内の選択肢移動（←→）。
  // ミニゲーム中は ←→ をカーソル操作（移動入力）に譲り、フォーカス移動はしない。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const btns = modalButtons();
      if (btns.length === 0) return;

      // 決定: ミニゲーム進行中は常に commit（引く/すくう/撃つ）。やめるボタンに
      // フォーカスがあっても誤って退出しないよう、進行中は commit を優先する。
      // 進行中でなければ（売買ダイアログ／結果画面）フォーカス中のボタンを押す。
      if (e.key === "Enter" || e.key === " " || e.code === "Space" || e.code === "KeyE") {
        const mg = minigameSig.peek();
        if (mg && !mg.finished) {
          e.preventDefault();
          dispatch({ kind: "minigame-commit", rng: Math.random });
          return;
        }
        const el = document.activeElement;
        if (el instanceof HTMLButtonElement && el.closest("[data-modal]")) {
          e.preventDefault();
          el.click();
        }
        return;
      }

      // ミニゲーム中は矢印で照準/カーソルを動かす（ゲームロジックが移動入力を消費）
      if (minigameSig.peek()) return;

      const dir =
        e.key === "ArrowRight" || e.key === "ArrowDown"
          ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp"
            ? -1
            : 0;
      if (dir === 0) return;
      e.preventDefault();
      const cur = btns.indexOf(document.activeElement as HTMLButtonElement);
      const next = cur < 0 ? (dir > 0 ? 0 : btns.length - 1) : (cur + dir + btns.length) % btns.length;
      btns[next]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  // 数字キーで売買屋台の品物を直接選ぶ（ショートカット）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      const dlg = dialogStallSig.peek();
      if (!dlg) return;
      const item = SHOP_MENU[dlg]?.[n - 1];
      if (item) dispatch({ kind: "eat", item });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  // モーダルが開いた / 選択肢の構成が変わったら先頭の選択肢に自動フォーカス。
  // ミニゲーム進行中は自動フォーカスしない（←→ はカーソル、Enter は commit に使うため）。
  const focusKey = dialogStall ?? (minigame?.finished ? `${minigame.id}|done` : "");
  useEffect(() => {
    if (!focusKey) return;
    modalButtons()[0]?.focus();
  }, [focusKey]);

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
      {minigame && <MinigameStatus view={minigame} />}
      {minigame && <MinigamePanel view={minigame} dispatch={dispatch} />}
    </div>
  );
};
