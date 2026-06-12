// チップチューン風シンセ（純粋関数）。サンプルレートは引数で渡す
export const SAMPLE_RATE = 22050;

export type Wave = "square" | "triangle" | "sine" | "noise";

/** 決定的ノイズ用の軽量 PRNG */
const makeRng = (seed: number): (() => number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
};

/** 単音を合成する。attack/release は秒 */
export const tone = (
  wave: Wave,
  freq: number,
  dur: number,
  volume = 0.5,
  attack = 0.005,
  release = 0.05,
  sampleRate = SAMPLE_RATE,
): Float32Array => {
  const n = Math.floor(dur * sampleRate);
  const out = new Float32Array(n);
  const rng = makeRng(Math.floor(freq * 1000) + 7);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const phase = (t * freq) % 1;
    let v: number;
    switch (wave) {
      case "square":
        v = phase < 0.5 ? 1 : -1;
        break;
      case "triangle":
        v = 4 * Math.abs(phase - 0.5) - 1;
        break;
      case "sine":
        v = Math.sin(2 * Math.PI * phase);
        break;
      case "noise":
        v = rng() * 2 - 1;
        break;
    }
    // エンベロープ
    const env = Math.min(1, t / attack, (dur - t) / release);
    out[i] = v * volume * Math.max(0, env);
  }
  return out;
};

/** 周波数が時間でスイープする音（花火の打ち上げなど） */
export const sweep = (
  wave: Wave,
  fromFreq: number,
  toFreq: number,
  dur: number,
  volume = 0.5,
  sampleRate = SAMPLE_RATE,
): Float32Array => {
  const n = Math.floor(dur * sampleRate);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const freq = fromFreq + (toFreq - fromFreq) * t;
    phase += freq / sampleRate;
    const p = phase % 1;
    const v = wave === "sine" ? Math.sin(2 * Math.PI * p) : p < 0.5 ? 1 : -1;
    const env = Math.min(1, i / (0.01 * sampleRate), (n - i) / (0.1 * sampleRate));
    out[i] = v * volume * Math.max(0, env);
  }
  return out;
};

/** 減衰ノイズ（破裂音・太鼓） */
export const decayNoise = (
  dur: number,
  volume = 0.5,
  seed = 1,
  sampleRate = SAMPLE_RATE,
): Float32Array => {
  const n = Math.floor(dur * sampleRate);
  const out = new Float32Array(n);
  const rng = makeRng(seed);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    // 1 次ローパスで「ドン」寄りに
    const raw = rng() * 2 - 1;
    prev = prev * 0.7 + raw * 0.3;
    out[i] = prev * volume * (1 - t) ** 2;
  }
  return out;
};

/** 無音 */
export const silence = (dur: number, sampleRate = SAMPLE_RATE): Float32Array =>
  new Float32Array(Math.floor(dur * sampleRate));

/** 直列結合 */
export const concat = (...parts: Float32Array[]): Float32Array => {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
};

/** 重ね合わせ（長い方に合わせる） */
export const mix = (...parts: Float32Array[]): Float32Array => {
  const total = Math.max(...parts.map((p) => p.length));
  const out = new Float32Array(total);
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) out[i] = (out[i] ?? 0) + (p[i] ?? 0);
  }
  return out;
};

/** 音名 → 周波数（A4=440）。"C5" "D#4" 形式 */
export const noteFreq = (name: string): number => {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) throw new Error(`不正な音名: ${name}`);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const semitone = (base[m[1] ?? "A"] ?? 9) + (m[2] === "#" ? 1 : 0);
  const octave = Number(m[3]);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
};
