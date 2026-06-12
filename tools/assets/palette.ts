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
  takoyakiBall: 0xb5763cff,
  kujiBox: 0x8a4a8aff,
} as const;
