// BGM（祭囃子チップチューン）と SE の合成定義
import { concat, decayNoise, mix, noteFreq, silence, sweep, tone } from "./synth.ts";

/** 8 分音符の長さ（テンポ 132） */
const EIGHTH = 60 / 132 / 2;

/** 音名列（null は休符）をメロディにする */
const melody = (notes: readonly (string | null)[], vol: number, wave: "square" | "triangle") =>
  concat(
    ...notes.map((n) => (n ? tone(wave, noteFreq(n), EIGHTH, vol, 0.004, 0.03) : silence(EIGHTH))),
  );

/** 太鼓: ドン（低い sine + ノイズ） */
const don = mix(tone("sine", 68, 0.16, 0.55, 0.002, 0.1), decayNoise(0.08, 0.25, 11));
/** 鉦: チキ（短い高音ノイズ） */
const chiki = decayNoise(0.05, 0.16, 23);

/** 1 小節分の太鼓パターン（ドン・チキ・ドン・チキチキ） */
const drumBar = (): Float32Array => {
  const beat = EIGHTH * 2;
  const place = (s: Float32Array, at: number, total: Float32Array): void => {
    for (let i = 0; i < s.length && at + i < total.length; i++) {
      total[at + i] = (total[at + i] ?? 0) + (s[i] ?? 0);
    }
  };
  const total = silence(beat * 4);
  const sr = 22050;
  place(don, 0, total);
  place(chiki, Math.floor(beat * 1 * sr), total);
  place(don, Math.floor(beat * 2 * sr), total);
  place(chiki, Math.floor(beat * 3 * sr), total);
  place(chiki, Math.floor(beat * 3.5 * sr), total);
  return total;
};

/** 祭囃子風 BGM（ヨナ抜き音階の笛 + 太鼓）。ループ前提 */
export const buildBgm = (): Float32Array => {
  // 8 小節 × 8 分音符 8 個
  const fue: readonly (string | null)[] = [
    // A
    "A4",
    "C5",
    "D5",
    "E5",
    "D5",
    "C5",
    "A4",
    "G4",
    "A4",
    "C5",
    "D5",
    "E5",
    "G5",
    "E5",
    "D5",
    "C5",
    // B
    "D5",
    "E5",
    "D5",
    "C5",
    "A4",
    "G4",
    "A4",
    null,
    "A4",
    "A4",
    "C5",
    "D5",
    "C5",
    "A4",
    "G4",
    null,
    // A'
    "E5",
    "E5",
    "D5",
    "C5",
    "D5",
    "E5",
    "G5",
    "E5",
    "D5",
    "C5",
    "A4",
    "C5",
    "D5",
    "C5",
    "A4",
    "G4",
    // 締め
    "A4",
    "C5",
    "D5",
    "E5",
    "D5",
    "C5",
    "D5",
    null,
    "A4",
    null,
    "A4",
    null,
    "A4",
    null,
    null,
    null,
  ];
  const fueTrack = melody(fue, 0.16, "square");
  // 同じ旋律をオクターブ下の三角波で薄く重ねて厚みを出す
  const subTrack = melody(
    fue.map((n) => (n ? `${n.slice(0, -1)}${Number(n.at(-1)) - 1}` : null)),
    0.05,
    "triangle",
  );

  const bars = fue.length / 8;
  const drums = concat(...Array.from({ length: bars }, () => drumBar()));

  return mix(fueTrack, subTrack, drums);
};

// SE は「静かで淡々とした夜祭り」に合わせ、音量控えめ・柔らかい音色（三角波/正弦）で作る。

export const buildSeLaunch = (): Float32Array =>
  // 遠くで上がる、ごく控えめなヒュー
  mix(sweep("sine", 300, 720, 0.5, 0.1), decayNoise(0.22, 0.025, 31));

export const buildSeBurst = (): Float32Array =>
  // 遠くの花火の柔らかいドーン（低音 + ふわっとした余韻）
  mix(
    tone("sine", 70, 0.5, 0.22, 0.005, 0.42),
    tone("sine", 112, 0.4, 0.1, 0.005, 0.36),
    decayNoise(0.55, 0.1, 41),
  );

export const buildSeHit = (): Float32Array =>
  // 柔らかな上昇チャイム
  concat(
    tone("triangle", noteFreq("E5"), 0.1, 0.16, 0.01, 0.08),
    tone("triangle", noteFreq("A5"), 0.18, 0.16, 0.01, 0.12),
  );

export const buildSeMiss = (): Float32Array =>
  // 静かな下降
  concat(
    tone("triangle", noteFreq("D4"), 0.12, 0.13, 0.01, 0.08),
    tone("triangle", noteFreq("A3"), 0.2, 0.13, 0.01, 0.12),
  );

export const buildSeBuy = (): Float32Array =>
  // 控えめな確認音
  concat(
    tone("triangle", noteFreq("A4"), 0.08, 0.15, 0.01, 0.06),
    tone("triangle", noteFreq("D5"), 0.14, 0.15, 0.01, 0.1),
  );
