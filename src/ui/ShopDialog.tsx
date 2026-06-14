// 屋台のダイアログ + ミニゲーム屋台の受付（お金・持ち物の概念はない）
import type { GameAction } from "../game/actions";
import { ITEM_INFO, SHOP_MENU } from "../game/items";
import { STALLS } from "../game/stalls";
import type { StallId } from "../game/types";

type Props = {
  readonly stallId: StallId;
  readonly dispatch: (action: GameAction) => void;
};

export const ShopDialog = ({ stallId, dispatch }: Props) => {
  const stall = STALLS.find((s) => s.id === stallId);
  if (!stall) return null;
  const menu = SHOP_MENU[stallId];

  // 夜祭りの静けさに合わせた淡々とした配色。発光や強い差し色は避け、暗い半透明の地に細い縁取り。
  const action =
    "w-full rounded border border-amber-100/20 bg-slate-900/70 px-4 py-2 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-100/50";
  const cancel =
    "w-full rounded px-4 py-2 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400/40";

  return (
    <div
      data-modal
      class="absolute inset-x-0 bottom-6 mx-auto w-[min(20rem,86vw)] rounded-md border border-white/10 bg-slate-950/85 p-4 text-center text-slate-100 shadow-lg shadow-black/40"
    >
      <h2 class="mb-3 text-base font-medium tracking-wide text-slate-200">{stall.name}</h2>

      {/* 品目とボタンを分けず、「◯◯を買う／あそぶ」と「やめる」を縦に並べる（スマホでも崩れない） */}
      <div class="flex flex-col gap-2">
        {menu ? (
          menu.map((item) => (
            <button
              key={item}
              type="button"
              class={action}
              onClick={() => dispatch({ kind: "eat", item })}
            >
              {ITEM_INFO[item].name}を買う
            </button>
          ))
        ) : (
          <button type="button" class={action} onClick={() => dispatch({ kind: "start-minigame" })}>
            あそぶ
          </button>
        )}
        <button type="button" class={cancel} onClick={() => dispatch({ kind: "close-dialog" })}>
          やめる
        </button>
      </div>
    </div>
  );
};
