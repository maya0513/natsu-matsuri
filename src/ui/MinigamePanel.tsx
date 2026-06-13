// ミニゲームの操作 UI（離散情報のみ。動くマーカーは render 層のオーバーレイが描く）
import type { GameAction } from "../game/actions";
import { STALLS } from "../game/stalls";
import type { MinigameId, PrizeId } from "../game/types";
import type { MinigameView } from "./bridge";

type Props = {
  readonly view: MinigameView;
  readonly dispatch: (action: GameAction) => void;
};

const PRESS_LABEL: Record<MinigameId, string> = {
  kuji: "引く",
  yoyo: "すくう",
  kingyo: "ポイですくう",
  shateki: "撃つ",
};

const PRIZE_NAME: Record<PrizeId, string> = {
  goldfish: "金魚",
  "yoyo-balloon": "ヨーヨー",
  "shateki-prize": "景品",
  omamori: "お守り",
};

const statusText = (view: MinigameView): string | undefined => {
  if (view.id === "yoyo") return `こより 残り${view.triesLeft} ／ ${view.caught}個`;
  if (view.id === "kingyo") return `ポイ 残り${view.poiLeft} ／ ${view.caught}匹`;
  if (view.id === "shateki") return `弾 残り${view.shotsLeft} ／ ${view.hits}個命中`;
  return undefined;
};

const resultText = (view: MinigameView): string | undefined => {
  if (view.id === "kuji") return view.result; // 運勢（大吉〜大凶）
  if (view.last === "hit") return "当たり";
  if (view.last === "miss") return "はずれ";
  return undefined;
};

export const MinigamePanel = ({ view, dispatch }: Props) => {
  const stall = STALLS.find((s) => s.id === view.id);
  const status = statusText(view);
  const result = resultText(view);
  // くじ引きの選択フェーズ（伏せ札を並べて選ばせる）
  const picking = view.id === "kuji" && !view.finished;

  return (
    <div class="absolute inset-x-0 bottom-6 mx-auto w-[min(26rem,90vw)] rounded-lg border-2 border-rose-400/60 bg-slate-950/90 p-4 text-center text-slate-100">
      <div class="mb-1 flex items-center justify-between">
        <h2 class="text-lg font-bold text-rose-300">{stall?.name}</h2>
        {status && <span class="text-sm text-slate-300">{status}</span>}
      </div>

      {result && <p class="mb-2 text-xl font-bold text-amber-300">{result}</p>}
      {view.finished && view.prize && (
        <p class="mb-2 text-sm text-emerald-300">{PRIZE_NAME[view.prize]}を持って帰る</p>
      )}

      {picking ? (
        <div class="space-y-2">
          <p class="text-sm text-slate-300">箱から 1 枚引く</p>
          <div class="flex flex-wrap justify-center gap-2">
            {Array.from({ length: view.count ?? 0 }, (_, i) => (
              <button
                key={i}
                type="button"
                class="h-10 w-8 rounded bg-amber-500/80 font-bold text-slate-950 hover:bg-amber-400"
                onClick={() => dispatch({ kind: "pick-lot", index: i, rng: Math.random })}
              >
                ？
              </button>
            ))}
          </div>
          <button
            type="button"
            class="text-sm text-slate-400 hover:underline"
            onClick={() => dispatch({ kind: "exit-minigame" })}
          >
            やめる (Esc)
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
};
