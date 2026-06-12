// 依存ゼロの最小 WAV エンコーダ（PCM16 モノラル）

/** Float32 サンプル列（-1..1）を WAV バイナリにエンコードする */
export const encodeWav = (sampleRate: number, samples: Float32Array): Uint8Array => {
  const dataLen = samples.length * 2;
  const out = new Uint8Array(44 + dataLen);
  const view = new DataView(out.buffer);

  const writeAscii = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) out[off + i] = s.charCodeAt(i);
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt チャンクサイズ
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // モノラル
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bit depth
  writeAscii(36, "data");
  view.setUint32(40, dataLen, true);

  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, Math.round(v * 32767), true);
  }
  return out;
};
