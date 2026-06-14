// ★アセットのコントラクト層: 生成スクリプト（tools/assets）と描画層の共有メタ情報。
// 寸法は拡大後（実 PNG）のピクセル数。tools 側の作画解像度 × SCALE と一致すること。

/** 作画解像度から実 PNG への拡大率 */
export const ASSET_SCALE = 2;

/** 1 ワールド unit が何ピクセルに相当するか（キャラ 32px 基準 → 1 unit） */
export const PX_PER_UNIT = 32;

export const PLAYER_SHEET = {
  url: "/assets/player.png",
  frameW: 32,
  frameH: 48,
  cols: 3, // idle / walk1 / walk2
  rows: 4, // down / up / left / right
  rowOf: { down: 0, up: 1, left: 2, right: 3 },
} as const;

export const STALL_SHEET = {
  url: "/assets/stalls.png",
  frameW: 96,
  frameH: 80,
  order: [
    "takoyaki",
    "ringoame",
    "kingyo",
    "shateki",
    "yoyo",
    "kuji",
    "yakisoba",
    "potato",
    "frank",
    "taiyaki",
    "chocobanana",
    "crepe",
    "kakigori",
    "juice",
    "senbiki",
    "mogura",
    "bingo",
  ],
} as const;

/**
 * 参拝客 NPC シート。行 = (浴衣バリエーション × 向き)、列 = フレーム。
 * 行 index = variant * facings + facing（facing: 0=down 手前向き, 1=up 奥向き）。
 */
export const NPC_SHEET = {
  url: "/assets/npc.png",
  frameW: 32, // 16 作画 × ASSET_SCALE
  frameH: 48, // 24 作画 × ASSET_SCALE
  cols: 3, // idle / walk1 / walk2
  variants: 4,
  facings: 2,
} as const;

/** 手持ち品シート（食べ物＋景品）。order は CarriedId と一致 */
export const HELD_SHEET = {
  url: "/assets/held.png",
  frameW: 20,
  frameH: 20,
  order: [
    "takoyaki",
    "ramune",
    "ringoame",
    "wataame",
    "goldfish",
    "yoyo-balloon",
    "shateki-prize",
    "omamori",
    "yakisoba",
    "potato",
    "frank",
    "taiyaki",
    "chocobanana",
    "crepe",
    "kakigori",
    "juice",
    "senbiki-prize",
    "mogura-prize",
    "bingo-prize",
    "yakisoba_shio",
    "crepe_ichigo",
    "crepe_tuna",
    "kakigori_blue",
    "kakigori_melon",
    "juice_grape",
    "juice_cola",
  ],
} as const;

export const TORII_TEXTURE = { url: "/assets/torii.png", w: 160, h: 160 } as const;
export const SHRINE_TEXTURE = { url: "/assets/shrine.png", w: 208, h: 144 } as const;
export const YAGURA_TEXTURE = { url: "/assets/yagura.png", w: 112, h: 160 } as const;
export const LANTERN_TEXTURE = { url: "/assets/lantern.png", w: 16, h: 24 } as const;

/** 参道の石灯籠（春日灯籠風） */
export const STONE_LANTERN_TEXTURE = { url: "/assets/stone-lantern.png", w: 32, h: 60 } as const;

/** 幽霊（お化け）。半透明で描く */
export const GHOST_TEXTURE = { url: "/assets/ghost.png", w: 32, h: 48 } as const;

/** ご神木（注連縄を巻いた大樹） */
export const SHINBOKU_TEXTURE = { url: "/assets/shinboku.png", w: 176, h: 224 } as const;

/** 鎮守の杜の木スプライトシート（針葉樹 / 広葉樹の 2 フレーム横並び） */
export const TREE_SHEET = {
  url: "/assets/trees.png",
  frameW: 96, // 48 作画 × ASSET_SCALE
  frameH: 192, // 96 作画 × ASSET_SCALE
  cols: 2,
} as const;

export const PATH_TILE_TEXTURE = { url: "/assets/tile-path.png", size: 32 } as const;
export const GROUND_TILE_TEXTURE = { url: "/assets/tile-ground.png", size: 32 } as const;

/** 生成 WAV（BGM・SE）。tools/assets/sounds.ts と対応 */
export const AUDIO = {
  bgm: "/assets/bgm.wav",
  launch: "/assets/se-launch.wav",
  burst: "/assets/se-burst.wav",
  hit: "/assets/se-hit.wav",
  miss: "/assets/se-miss.wav",
  buy: "/assets/se-buy.wav",
} as const;

export type SeName = Exclude<keyof typeof AUDIO, "bgm">;
