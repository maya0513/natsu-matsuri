// ゲームバランス・ワールド定義の定数

/** プレイヤー移動速度（unit/秒） */
export const PLAYER_SPEED = 4;

/** 歩行可能範囲。広い台地（祭り会場）＋一か所の階段で下りる左の河川敷。minX は川の手前 */
export const MAP_BOUNDS = {
  minX: -24,
  maxX: 42,
  minY: -34,
  maxY: 34,
} as const;

/**
 * ワールドの高低差レイアウト（描画の地形ジオメトリと、移動の当たり判定で共有する契約）。
 * 河川敷（x<bankX, 低）／主会場の台地（x>=plateauX, 基準0）／北へ立ち上がる社の丘 の多層構造。
 * 台地と河川敷は境界帯(bankX..plateauX)で段差になる。石段(z∈[stairZ0,stairZ1])はなだらかな下り、
 * それ以外の境界帯は急斜面の崖だが、どちらも歩いて下りられる（＝崖から落下できる。擁壁は無い）。
 * 通行を阻む唯一の壁は「川」（RIVER 参照）。社の丘・やぐらの盛り土もなだらかで、どこでも歩いて登れる。
 */
export const WORLD = {
  /** 台地の左端（これ以上右は会場） */
  plateauX: -6,
  /** 河川敷の右端（これ以上左は河川敷の平地） */
  bankX: -10,
  /** 河川敷の高さ（台地より低い） */
  bankY: -2,
  /** 石段の段数 */
  stairSteps: 8,
  /** 石段（なだらかに下りられる切り欠き）の z 範囲 */
  stairZ0: 2,
  stairZ1: 12,
  /** 社の丘: この z より南（手前）は平坦な主会場。これより北で地面が立ち上がり始める */
  hillBaseZ: -10,
  /** 社の丘: この z より北（奥）は丘の頂上＝社の高台（一定の高さ hillMaxH） */
  hillTopZ: -30,
  /** 社の丘の高さ（主会場からの立ち上がり） */
  hillMaxH: 4.5,
} as const;

/**
 * 川（蛇行する水流）の幾何。通行を阻む唯一の壁＝川の東岸より西へは入れない。
 * 中心 x は z（＝ゲーム y）に応じて正弦波で蛇行する。描画（river.ts/scene.ts）と当たり判定で共有。
 */
export const RIVER = {
  /** 蛇行の中心となる x */
  baseX: -20,
  /** 蛇行の振幅 */
  amp: 2.4,
  /** 蛇行の空間周波数（z あたり） */
  freq: 0.08,
  /** 位相 */
  phase: 0.4,
  /** 川幅の半分 */
  halfWidth: 2,
} as const;

/** その z（ゲーム y）における川の中心 x */
export const riverCenterXAt = (y: number): number =>
  RIVER.baseX + RIVER.amp * Math.sin(y * RIVER.freq + RIVER.phase);

/** その z における川の東岸 x（これより西＝水面で、プレイヤーは入れない） */
export const riverEastEdgeAt = (y: number): number => riverCenterXAt(y) + RIVER.halfWidth;

/** 最初の花火が上がる時刻（ゲーム開始からの秒） */
export const FIREWORKS_FIRST_LAUNCH = 5;

/** 花火の打ち上げ間隔（秒） */
export const FIREWORKS_INTERVAL = 12;

/** 屋台を調べられる距離（unit） */
export const INTERACT_RADIUS = 2.2;
