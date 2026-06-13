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

  const single = menu?.length === 1;

  return (
    <div class="absolute inset-x-0 bottom-6 mx-auto w-[min(28rem,90vw)] rounded-lg border-2 border-amber-400/60 bg-slate-950/90 p-4 text-center text-slate-100 shadow-[0_0_24px_rgba(255,157,60,0.25)]">
      <h2 class="mb-2 text-lg font-bold text-amber-300">{stall.name}</h2>

      {menu ? (
        <>
          <ul class="mb-3 space-y-1">
            {menu.map((item, i) => (
              <li key={item}>
                {!single && <span class="mr-1 text-slate-400">{i + 1}.</span>}
                {ITEM_INFO[item].emoji} {ITEM_INFO[item].name}
              </li>
            ))}
          </ul>
          {/* 買う / やめる を横並び（ミニゲーム屋台と同じ並び） */}
          <div class="flex flex-wrap items-center justify-center gap-3">
            {menu.map((item, i) => (
              <button
                key={item}
                type="button"
                class="rounded bg-amber-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-amber-400"
                onClick={() => dispatch({ kind: "eat", item })}
              >
                {single ? "買う（E）" : `${ITEM_INFO[item].name}を買う（${i + 1}）`}
              </button>
            ))}
            <button
              type="button"
              class="rounded px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
              onClick={() => dispatch({ kind: "close-dialog" })}
            >
              やめる (Esc)
            </button>
          </div>
        </>
      ) : (
        <div class="flex items-center justify-center gap-3">
          <button
            type="button"
            class="rounded bg-rose-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-rose-400"
            onClick={() => dispatch({ kind: "start-minigame" })}
          >
            あそぶ（E）
          </button>
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
            onClick={() => dispatch({ kind: "close-dialog" })}
          >
            やめる (Esc)
          </button>
        </div>
      )}
    </div>
  );
};
