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
  yakisoba: { name: "ソース焼きそば", emoji: "🍜", hot: true },
  yakisoba_shio: { name: "塩焼きそば", emoji: "🍜", hot: true },
  potato: { name: "ポテト", emoji: "🍟", hot: true },
  frank: { name: "フランクフルト", emoji: "🌭", hot: true },
  taiyaki: { name: "たい焼き", emoji: "🐟", hot: true },
  chocobanana: { name: "チョコバナナ", emoji: "🍌" },
  crepe: { name: "チョコバナナクレープ", emoji: "🍫" },
  crepe_ichigo: { name: "いちご生クリーム", emoji: "🍓" },
  crepe_tuna: { name: "ツナマヨ", emoji: "🐟" },
  kakigori: { name: "いちご", emoji: "🍓" },
  kakigori_blue: { name: "ブルーハワイ", emoji: "🌊" },
  kakigori_melon: { name: "メロン", emoji: "🍈" },
  juice: { name: "オレンジ", emoji: "🍊" },
  juice_grape: { name: "ぶどう", emoji: "🍇" },
  juice_cola: { name: "コーラ", emoji: "🥤" },
};

/** 売買屋台の品揃え。ミニゲーム屋台はここに載らない */
export const SHOP_MENU: Partial<Record<StallId, readonly ItemId[]>> = {
  takoyaki: ["takoyaki"],
  ringoame: ["ringoame", "wataame"], // 甘味屋台（りんご飴・わたあめ）
  yakisoba: ["yakisoba", "yakisoba_shio"], // ソース／塩
  potato: ["potato"],
  frank: ["frank"],
  taiyaki: ["taiyaki"],
  chocobanana: ["chocobanana"],
  crepe: ["crepe", "crepe_ichigo", "crepe_tuna"], // 定番3種
  kakigori: ["kakigori", "kakigori_blue", "kakigori_melon"], // いちご・ブルーハワイ・メロン
  juice: ["juice", "juice_grape", "juice_cola", "ramune"], // オレンジ・ぶどう・コーラ・ラムネ
};

/** 指定屋台にその品物があるか */
export const isOnMenu = (stall: StallId, item: ItemId): boolean =>
  SHOP_MENU[stall]?.includes(item) ?? false;

/** その屋台が加熱調理の品を売っているか（＝煙・湯気がふさわしいか）。ミニゲーム屋台は常に false */
export const stallHasHotFood = (stall: StallId): boolean =>
  (SHOP_MENU[stall] ?? []).some((item) => ITEM_INFO[item].hot === true);
