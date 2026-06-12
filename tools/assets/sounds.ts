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

export const buildSeLaunch = (): Float32Array =>
  mix(sweep("sine", 220, 880, 0.55, 0.22), decayNoise(0.3, 0.08, 31));

export const buildSeBurst = (): Float32Array =>
  mix(decayNoise(0.8, 0.85, 41), tone("sine", 64, 0.35, 0.5, 0.002, 0.25));

export const buildSeHit = (): Float32Array =>
  concat(
    tone("square", noteFreq("C5"), 0.08, 0.28),
    tone("square", noteFreq("E5"), 0.08, 0.28),
    tone("square", noteFreq("G5"), 0.14, 0.28),
  );

export const buildSeMiss = (): Float32Array =>
  concat(tone("square", noteFreq("E4"), 0.12, 0.22), tone("square", noteFreq("C4"), 0.2, 0.22));

export const buildSeBuy = (): Float32Array =>
  concat(tone("square", noteFreq("B5"), 0.06, 0.24), tone("square", noteFreq("E6"), 0.12, 0.24));
