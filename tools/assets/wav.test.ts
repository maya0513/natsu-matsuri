import { describe, expect, it } from "vitest";
import { encodeWav } from "./wav.ts";

const ascii = (bytes: Uint8Array, off: number, len: number): string =>
  String.fromCharCode(...bytes.subarray(off, off + len));

describe("encodeWav", () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const wav = encodeWav(22050, samples);
  const view = new DataView(wav.buffer, wav.byteOffset);

  it("RIFF/WAVE ヘッダを持つ", () => {
    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(ascii(wav, 8, 4)).toBe("WAVE");
    expect(ascii(wav, 12, 4)).toBe("fmt ");
    expect(ascii(wav, 36, 4)).toBe("data");
  });

  it("PCM16 モノラル・指定サンプルレート", () => {
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint16(34, true)).toBe(16); // bit depth
  });

  it("データ長 = サンプル数 × 2 バイト", () => {
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
    expect(wav.length).toBe(44 + samples.length * 2);
  });

  it("±1 が 16bit 範囲にクリップされて入る", () => {
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(Math.round(0.5 * 32767));
    expect(view.getInt16(50, true)).toBe(32767);
    expect(view.getInt16(52, true)).toBe(-32767);
  });

  it("範囲外の値はクリップされる", () => {
    const over = encodeWav(22050, new Float32Array([2, -2]));
    const v = new DataView(over.buffer, over.byteOffset);
    expect(v.getInt16(44, true)).toBe(32767);
    expect(v.getInt16(46, true)).toBe(-32767);
  });
});
