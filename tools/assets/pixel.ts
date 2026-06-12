// ドット絵作画用のピクセルキャンバス。色は 0xRRGGBBAA
export type PixelCanvas = {
  readonly width: number;
  readonly height: number;
  /** 行優先 RGBA */
  readonly data: Uint8Array;
};

export const createCanvas = (width: number, height: number): PixelCanvas => ({
  width,
  height,
  data: new Uint8Array(width * height * 4),
});

export const setPixel = (c: PixelCanvas, x: number, y: number, color: number): void => {
  if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
  const i = (y * c.width + x) * 4;
  c.data[i] = (color >>> 24) & 0xff;
  c.data[i + 1] = (color >>> 16) & 0xff;
  c.data[i + 2] = (color >>> 8) & 0xff;
  c.data[i + 3] = color & 0xff;
};

export const getPixel = (c: PixelCanvas, x: number, y: number): number => {
  const i = (y * c.width + x) * 4;
  return (
    (((c.data[i] ?? 0) << 24) |
      ((c.data[i + 1] ?? 0) << 16) |
      ((c.data[i + 2] ?? 0) << 8) |
      (c.data[i + 3] ?? 0)) >>>
    0
  );
};

export const fillRect = (
  c: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void => {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(c, x + dx, y + dy, color);
    }
  }
};

/** 左右反転した新しいキャンバスを返す */
export const mirrorX = (c: PixelCanvas): PixelCanvas => {
  const m = createCanvas(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      setPixel(m, c.width - 1 - x, y, getPixel(c, x, y));
    }
  }
  return m;
};

/** src を dst の (ox, oy) に重ねる。src の透明ピクセル（alpha 0）は書かない */
export const blit = (dst: PixelCanvas, src: PixelCanvas, ox: number, oy: number): void => {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const color = getPixel(src, x, y);
      if ((color & 0xff) !== 0) setPixel(dst, ox + x, oy + y, color);
    }
  }
};

/** ニアレストネイバーで整数倍拡大した新しいキャンバスを返す */
export const upscale = (c: PixelCanvas, factor: number): PixelCanvas => {
  const u = createCanvas(c.width * factor, c.height * factor);
  for (let y = 0; y < u.height; y++) {
    for (let x = 0; x < u.width; x++) {
      setPixel(u, x, y, getPixel(c, Math.floor(x / factor), Math.floor(y / factor)));
    }
  }
  return u;
};
