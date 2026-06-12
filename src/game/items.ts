// アイテムカタログと屋台の品揃え（コントラクト層の一部）
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
  goldfish: { name: "金魚", emoji: "🐟" },
  "yoyo-balloon": { name: "ヨーヨー", emoji: "🎈" },
  "kuji-prize-small": { name: "くじの景品（小）", emoji: "🎁" },
  "kuji-prize-big": { name: "くじの景品（大）", emoji: "🧸" },
  "shateki-prize": { name: "射的の景品", emoji: "🏆" },
};

export type Goods = {
  readonly item: ItemId;
  readonly price: number;
};

/** 売買屋台の品揃え。ミニゲーム屋台はここに載らない */
export const SHOP_GOODS: Partial<Record<StallId, readonly Goods[]>> = {
  takoyaki: [
    { item: "takoyaki", price: 500 },
    { item: "ramune", price: 200 },
  ],
  ringoame: [
    { item: "ringoame", price: 400 },
    { item: "wataame", price: 300 },
  ],
};

/** 指定屋台でのアイテム価格。売っていなければ undefined */
export const priceAt = (stall: StallId, item: ItemId): number | undefined =>
  SHOP_GOODS[stall]?.find((g) => g.item === item)?.price;
