import { describe, expect, it } from "vitest";
import { SAMPLE_RATE, concat, decayNoise, mix, noteFreq, silence, sweep, tone } from "./synth.ts";

describe("synth", () => {
  it("tone は dur×sampleRate サンプルを返す", () => {
    expect(tone("square", 440, 0.5).length).toBe(Math.floor(0.5 * SAMPLE_RATE));
  });

  it("tone は音量の範囲に収まる", () => {
    const s = tone("square", 440, 0.1, 0.4);
    // Float32 の丸め誤差を許容
    for (const v of s) expect(Math.abs(v)).toBeLessThanOrEqual(0.4 + 1e-6);
  });

  it("同じ引数なら決定的（ノイズ含む）", () => {
    expect(tone("noise", 100, 0.05)).toEqual(tone("noise", 100, 0.05));
    expect(decayNoise(0.05, 0.5, 7)).toEqual(decayNoise(0.05, 0.5, 7));
  });

  it("decayNoise は末尾に向かって減衰する", () => {
    const s = decayNoise(0.2, 0.8);
    const head = Math.max(...s.slice(0, 100).map(Math.abs));
    const tail = Math.max(...s.slice(-100).map(Math.abs));
    expect(tail).toBeLessThan(head);
  });

  it("concat は長さを合算、mix は最長に揃える", () => {
    const a = silence(0.1);
    const b = silence(0.2);
    expect(concat(a, b).length).toBe(a.length + b.length);
    expect(mix(a, b).length).toBe(b.length);
  });

  it("sweep は指定時間分のサンプルを返す", () => {
    expect(sweep("sine", 200, 800, 0.3).length).toBe(Math.floor(0.3 * SAMPLE_RATE));
  });

  it("noteFreq: A4=440, C5≈523.25", () => {
    expect(noteFreq("A4")).toBeCloseTo(440);
    expect(noteFreq("C5")).toBeCloseTo(523.25, 1);
    expect(() => noteFreq("H2")).toThrow();
  });
});
