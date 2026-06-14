// 夜祭りパレット: 夜の闇 + 発光（提灯・花火）に全振りしたレトロ調
// 色は 0xRRGGBBAA

export const PAL = {
  // 環境
  night: 0x05030fff,
  groundDark: 0x16112aff,
  groundLight: 0x241b3dff,
  stoneDark: 0x2c2547ff,
  stoneLight: 0x3d3460ff,
  stoneGap: 0x1a1430ff,

  // キャラ
  hair: 0x231a38ff,
  hairHi: 0x40305eff,
  skin: 0xe8b88aff,
  skinShade: 0xc99668ff,
  eye: 0x1a1226ff,
  yukata: 0x2e3f7aff,
  yukataShade: 0x22305eff,
  yukataDot: 0x7fc4e8ff,
  obi: 0xe8c04aff,
  obiShade: 0xc09a32ff,
  collar: 0xe8e4daff,
  kanzashi: 0xf06292ff,
  geta: 0x6b4a2fff,

  // 神社の意匠
  shimenawa: 0xb89a5aff, // 注連縄（藁）
  shimenawaShade: 0x8a7038ff,
  shide: 0xf2efe6ff, // 紙垂（白い稲妻形の紙）

  // お化け（幽霊）。青白く透けるシルエット
  ghostBody: 0xdbe6f4ff,
  ghostShade: 0x9fb2cfff,
  ghostEye: 0x2a2640ff,

  // NPC（参拝客）の浴衣バリエーション。夜に沈む中間色＋差し色の帯
  npcPink: 0xb05a78ff,
  npcPinkShade: 0x854059ff,
  npcPinkDot: 0xf0c4d6ff,
  npcGreen: 0x4a7a54ff,
  npcGreenShade: 0x355c3eff,
  npcGreenDot: 0xc4e2c6ff,
  npcPlum: 0x5a4a8aff,
  npcPlumShade: 0x40335eff,
  npcPlumDot: 0xc6bcecff,
  npcGray: 0x556070ff,
  npcGrayShade: 0x3c4552ff,
  npcGrayDot: 0xc8d2dcff,

  // 鎮守の杜（夜の木々のシルエット）
  treeDark: 0x0b1410ff, // 葉の陰（ほぼ闇）
  treeMid: 0x14241aff, // 葉の本体（沈んだ深緑）
  treeEdge: 0x2c3f4eff, // 月明かりの淡いリム（上端の縁）
  treeTrunk: 0x18120cff, // 幹（夜の黒褐色）

  // 木・構造物
  wood: 0x6b4a2fff,
  woodLight: 0x8a6038ff,
  woodDark: 0x54381fff,
  vermillion: 0xc4452eff,
  vermillionDark: 0x8a2f1fff,
  roofDark: 0x2a2438ff,
  roofLight: 0x3c3450ff,

  // 発光
  lanternGlow: 0xffd27aff,
  lanternBody: 0xff9d3cff,
  lanternRib: 0xd97b22ff,
  lanternCap: 0x3a2418ff,
  warmWindow: 0xffb85cff,

  // 屋台テント
  awningRed: 0xc4452eff,
  awningWhite: 0xe8e4daff,

  // 小物
  water: 0x2e6e9eff,
  waterHi: 0x5ba3cfff,
  goldfish: 0xe85d3aff,
  balloonRed: 0xe85d6aff,
  balloonBlue: 0x5b8fe8ff,
  balloonYellow: 0xe8c04aff,
  target: 0xe8e4daff,
  targetRed: 0xc4452eff,
  candyApple: 0xc41e3aff,
  candyAppleHi: 0xff8aa0ff,
  takoyakiBall: 0xb5763cff,
  kujiBox: 0x8a4a8aff,

  // 食べ物（手持ち用）
  sauceDark: 0x5a3a22ff,
  aonori: 0x4a7a3cff,
  ramuneGlass: 0x8fd0e8ff,
  ramuneGlassHi: 0xcdeefaff,
  ramuneCap: 0x4a8fb5ff,
  wataamePink: 0xf2a0c8ff,
  wataameLight: 0xfbd0e6ff,
} as const;
