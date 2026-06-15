// ミニゲームのモーダルは最小限（やめる／もう一回）だけ。操作説明や結果文は出さない。
// 当たり/はずれは 3D 側の演出で伝える（文章通知は世界観に合わないため）。
// 残数などのゲーム情報はモーダルの外（MinigameStatus）に控えめに別表示する。
import type { GameAction } from "../game/actions";
import type { MinigameView } from "./bridge";

type Props = {
  readonly view: MinigameView;
  readonly dispatch: (action: GameAction) => void;
};

/** モーダル外に出す控えめな残数表示（操作説明は含めない） */
const statusText = (view: MinigameView): string | undefined => {
  if (view.id === "yoyo") return `こより ${view.triesLeft ?? 0}`;
  if (view.id === "kingyo") return `ポイ ${view.poiLeft ?? 0}／釣果 ${view.caught ?? 0}`;
  if (view.id === "shateki") return `弾 ${view.shotsLeft ?? 0}／命中 ${view.hits ?? 0}`;
  if (view.id === "mogura") return `ハンマー ${view.triesLeft ?? 0}／${view.hits ?? 0}`;
  return undefined;
};

/** ゲーム情報（残数）の別表示。画面上部の控えめなチップ */
export const MinigameStatus = ({ view }: { readonly view: MinigameView }) => {
  if (view.finished) return null;
  const status = statusText(view);
  if (!status) return null;
  return (
    <div class="absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs tracking-wide text-slate-300">
      {status}
    </div>
  );
};

export const MinigamePanel = ({ view, dispatch }: Props) => {
  // ShopDialog と揃えた淡々とした夜祭り調。
  const action =
    "rounded border border-amber-100/20 bg-slate-900/70 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-100/50";
  const cancel =
    "rounded px-4 py-2 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400/40";

  return (
    <div
      data-modal
      class="absolute inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-2 rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 shadow-lg shadow-black/40"
    >
      {view.finished && (
        <button type="button" class={action} onClick={() => dispatch({ kind: "retry-minigame" })}>
          もう一回
        </button>
      )}
      <button type="button" class={cancel} onClick={() => dispatch({ kind: "exit-minigame" })}>
        やめる
      </button>
    </div>
  );
};
