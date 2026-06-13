// ミニゲームの操作 UI（離散情報のみ。動くマーカーは render 層のオーバーレイが描く）
import type { GameAction } from "../game/actions";
import { STALLS } from "../game/stalls";
import type { MinigameView } from "./bridge";

type Props = {
  readonly view: MinigameView;
  readonly dispatch: (action: GameAction) => void;
};

const PRESS_LABEL: Record<MinigameView["id"], string> = {
  kuji: "くじを引く",
  yoyo: "こよりを上げる",
  kingyo: "ポイですくう",
  shateki: "撃つ",
};

const resultText = (view: MinigameView): string | undefined => {
  if (view.last === "hit") return "当たり";
  if (view.last === "miss") return "はずれ";
  return undefined;
};

export const MinigamePanel = ({ view, dispatch }: Props) => {
  const stall = STALLS.find((s) => s.id === view.id);
  const status =
    view.id === "kingyo"
      ? `ポイ 残り${view.poiLeft} ／ ${view.caught}匹`
      : view.id === "shateki"
        ? `弾 残り${view.shotsLeft} ／ ${view.hits}個命中`
        : undefined;

  return (
    <div class="absolute inset-x-0 bottom-6 mx-auto w-[min(26rem,90vw)] rounded-lg border-2 border-rose-400/60 bg-slate-950/90 p-4 text-center text-slate-100">
      <div class="mb-1 flex items-center justify-between">
        <h2 class="text-lg font-bold text-rose-300">{stall?.name}</h2>
        {status && <span class="text-sm text-slate-300">{status}</span>}
      </div>

      {resultText(view) && <p class="mb-2 text-amber-300">{resultText(view)}</p>}

      <div class="flex items-center justify-center gap-3">
        {view.finished ? (
          <button
            type="button"
            class="rounded bg-rose-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-rose-400"
            onClick={() => dispatch({ kind: "retry-minigame" })}
          >
            もう一回
          </button>
        ) : (
          <button
            type="button"
            class="rounded bg-rose-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-rose-400"
            onClick={() => dispatch({ kind: "minigame-press" })}
          >
            {PRESS_LABEL[view.id]}（E でも可）
          </button>
        )}
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
          onClick={() => dispatch({ kind: "exit-minigame" })}
        >
          やめる (Esc)
        </button>
      </div>
    </div>
  );
};
