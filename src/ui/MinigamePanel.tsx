// ミニゲームの操作 UI（離散情報のみ。動くシーンは render 層のオーバーレイが描く）。
// 操作は全ゲーム共通: ←→ で狙い、決定で commit。ここは枠・残数・結果・ボタンだけを持つ。
import type { GameAction } from "../game/actions";
import { STALLS } from "../game/stalls";
import type { MinigameId, PrizeId } from "../game/types";
import type { MinigameView } from "./bridge";

type Props = {
  readonly view: MinigameView;
  readonly dispatch: (action: GameAction) => void;
};

/** 「決定」ボタンの文言（ゲームごとの動作名） */
const COMMIT_LABEL: Record<MinigameId, string> = {
  kuji: "引く",
  senbiki: "引く",
  yoyo: "すくう",
  kingyo: "すくう",
  shateki: "撃つ",
  mogura: "たたく",
  bingo: "玉を引く",
};

/** 操作ヒント（狙う系か選ぶ系か） */
const HINT: Record<MinigameId, string> = {
  kuji: "← → で札を選ぶ",
  senbiki: "← → で紐を選ぶ",
  yoyo: "← → でこよりを動かす",
  kingyo: "← → でポイを動かす",
  shateki: "← → で狙う",
  mogura: "← → でハンマーを動かす",
  bingo: "Enter で玉を引く",
};

const PRIZE_NAME: Record<PrizeId, string> = {
  goldfish: "金魚",
  "yoyo-balloon": "ヨーヨー",
  "shateki-prize": "景品",
  omamori: "お守り",
  "senbiki-prize": "景品",
  "mogura-prize": "景品",
  "bingo-prize": "景品",
};

const statusText = (view: MinigameView): string | undefined => {
  if (view.id === "yoyo") return `こより 残り${view.triesLeft} ／ ${view.caught}個`;
  if (view.id === "kingyo") return `ポイ 残り${view.poiLeft} ／ ${view.caught}匹`;
  if (view.id === "shateki") return `弾 残り${view.shotsLeft} ／ ${view.hits}個命中`;
  if (view.id === "mogura") return `ハンマー 残り${view.triesLeft} ／ ${view.hits}匹`;
  return undefined;
};

const resultText = (view: MinigameView): string | undefined => {
  if (view.id === "kuji") return view.result; // 運勢（大吉〜大凶）
  if (view.id === "senbiki") return view.senbikiResult; // 大当たり/当たり/はずれ
  if (view.id === "bingo") return view.bingo ? "ビンゴ！" : undefined;
  if (view.last === "hit") return "当たり";
  if (view.last === "miss") return "はずれ";
  return undefined;
};

export const MinigamePanel = ({ view, dispatch }: Props) => {
  const stall = STALLS.find((s) => s.id === view.id);
  const status = statusText(view);
  const result = resultText(view);
  const isBingo = view.id === "bingo";

  // ShopDialog と揃えた淡々とした夜祭り調。発光や強い差し色は避ける。
  const action =
    "rounded border border-amber-100/20 bg-slate-900/70 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-100/50";
  const cancel =
    "rounded px-4 py-2 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400/40";

  return (
    <div
      data-modal
      class="absolute inset-x-0 bottom-6 mx-auto w-[min(22rem,88vw)] rounded-md border border-white/10 bg-slate-950/85 p-4 text-center text-slate-100 shadow-lg shadow-black/40"
    >
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-base font-medium tracking-wide text-slate-200">{stall?.name}</h2>
        {status && <span class="text-xs text-slate-400">{status}</span>}
      </div>

      {result && <p class="mb-2 text-lg font-medium text-amber-200/90">{result}</p>}
      {view.finished && view.prize && (
        <p class="mb-2 text-xs text-emerald-300/80">{PRIZE_NAME[view.prize]}を持って帰る</p>
      )}

      {/* ビンゴはカードを DOM で表示（マス目の印） */}
      {isBingo && (
        <div class="mb-3 mx-auto grid w-fit grid-cols-3 gap-1">
          {(view.card ?? []).map((n, i) => (
            <span
              key={i}
              class={`flex h-7 w-7 items-center justify-center rounded text-sm ${
                view.marked?.[i]
                  ? "bg-amber-200/80 text-slate-950"
                  : "bg-slate-800/80 text-slate-400"
              }`}
            >
              {n}
            </span>
          ))}
        </div>
      )}

      <div class="flex items-center justify-center gap-2">
        {view.finished ? (
          <button type="button" class={action} onClick={() => dispatch({ kind: "retry-minigame" })}>
            もう一回
          </button>
        ) : (
          <button
            type="button"
            class={action}
            onClick={() => dispatch({ kind: "minigame-commit", rng: Math.random })}
          >
            {COMMIT_LABEL[view.id]}
          </button>
        )}
        <button type="button" class={cancel} onClick={() => dispatch({ kind: "exit-minigame" })}>
          やめる
        </button>
      </div>

      <p class="mt-3 text-xs text-slate-500">
        {view.finished ? "Enter でもう一回 ／ Esc でやめる" : `${HINT[view.id]} ／ Enter で決定`}
      </p>
    </div>
  );
};
