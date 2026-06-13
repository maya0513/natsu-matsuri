// アイテムカタログと屋台の品揃え（コントラクト層の一部）。
// お金・価格の概念はない。屋台では品物を「食べる」だけ。
import type { ItemId, StallId } from "./types";

export type ItemInfo = {
  readonly name: string;
  /** UI 表示用の絵文字（ドット絵アイコンは将来差し替え可） */
  readonly emoji: string;
};

export const ITEM_INFO: Record<ItemId, ItemInfo> = {
  takoyaki: { name: "たこ焼き", emoji: "🐙" },
  ramune: { name: "ラムネ", emoji: "🥤" },
  ringoame: { name: "りんご飴", emoji: "🍎" },
  wataame: { name: "わたあめ", emoji: "🍬" },
  yakisoba: { name: "焼きそば", emoji: "🍜" },
  potato: { name: "ポテト", emoji: "🍟" },
  frank: { name: "フランクフルト", emoji: "🌭" },
  taiyaki: { name: "たい焼き", emoji: "🐟" },
  chocobanana: { name: "チョコバナナ", emoji: "🍌" },
  crepe: { name: "クレープ", emoji: "🥞" },
  kakigori: { name: "かき氷", emoji: "🍧" },
  juice: { name: "ジュース", emoji: "🧃" },
};

/** 売買屋台の品揃え。ミニゲーム屋台はここに載らない */
export const SHOP_MENU: Partial<Record<StallId, readonly ItemId[]>> = {
  takoyaki: ["takoyaki", "ramune"],
  ringoame: ["ringoame", "wataame"],
  yakisoba: ["yakisoba"],
  potato: ["potato"],
  frank: ["frank"],
  taiyaki: ["taiyaki"],
  chocobanana: ["chocobanana"],
  crepe: ["crepe"],
  kakigori: ["kakigori"],
  juice: ["juice"],
};

/** 指定屋台にその品物があるか */
export const isOnMenu = (stall: StallId, item: ItemId): boolean =>
  SHOP_MENU[stall]?.includes(item) ?? false;
