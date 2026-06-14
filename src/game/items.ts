// アイテムカタログと屋台の品揃え（コントラクト層の一部）。
// お金・価格の概念はない。屋台では品物を「食べる」だけ。
import type { ItemId, StallId } from "./types";

export type ItemInfo = {
  readonly name: string;
  /** UI 表示用の絵文字（ドット絵アイコンは将来差し替え可） */
  readonly emoji: string;
  /** その場で焼く・揚げる等の加熱調理品（湯気・火の粉が立つ）。屋台の煙演出の判定に使う */
  readonly hot?: boolean;
};

export const ITEM_INFO: Record<ItemId, ItemInfo> = {
  takoyaki: { name: "たこ焼き", emoji: "🐙", hot: true },
  ramune: { name: "ラムネ", emoji: "🥤" },
  ringoame: { name: "りんご飴", emoji: "🍎" },
  wataame: { name: "わたあめ", emoji: "🍬" },
  yakisoba: { name: "焼きそば", emoji: "🍜", hot: true },
  potato: { name: "ポテト", emoji: "🍟", hot: true },
  frank: { name: "フランクフルト", emoji: "🌭", hot: true },
  taiyaki: { name: "たい焼き", emoji: "🐟", hot: true },
  chocobanana: { name: "チョコバナナ", emoji: "🍌" },
  crepe: { name: "クレープ", emoji: "🥞" },
  kakigori: { name: "かき氷", emoji: "🍧" },
  juice: { name: "ジュース", emoji: "🧃" },
};

/** 売買屋台の品揃え。ミニゲーム屋台はここに載らない */
export const SHOP_MENU: Partial<Record<StallId, readonly ItemId[]>> = {
  takoyaki: ["takoyaki"],
  ringoame: ["ringoame", "wataame"], // 甘味屋台（りんご飴・わたあめ）
  yakisoba: ["yakisoba"],
  potato: ["potato"],
  frank: ["frank"],
  taiyaki: ["taiyaki"],
  chocobanana: ["chocobanana"],
  crepe: ["crepe"],
  kakigori: ["kakigori"],
  juice: ["juice", "ramune"], // 飲み物屋台（ジュース・ラムネ）
};

/** 指定屋台にその品物があるか */
export const isOnMenu = (stall: StallId, item: ItemId): boolean =>
  SHOP_MENU[stall]?.includes(item) ?? false;

/** その屋台が加熱調理の品を売っているか（＝煙・湯気がふさわしいか）。ミニゲーム屋台は常に false */
export const stallHasHotFood = (stall: StallId): boolean =>
  (SHOP_MENU[stall] ?? []).some((item) => ITEM_INFO[item].hot === true);
