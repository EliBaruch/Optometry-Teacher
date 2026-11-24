/**
 * Small colour + canvas helpers shared by the eye and fundus painters.
 * Pure functions (no DOM) except makeCanvas().
 */

export type RGB = [number, number, number];

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('');
}

export function rgba(c: RGB | string, a = 1): string {
  const [r, g, b] = typeof c === 'string' ? hexToRgb(c) : c;
  return `rgba(${clamp255(r)},${clamp255(g)},${clamp255(b)},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function mix(a: RGB | string, b: RGB | string, t: number): RGB {
  const A = typeof a === 'string' ? hexToRgb(a) : a;
  const B = typeof b === 'string' ? hexToRgb(b) : b;
  return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
}

/** Multiply brightness (f < 1 darker, f > 1 lighter, clamped). */
export function shade(c: RGB | string, f: number): RGB {
  const C = typeof c === 'string' ? hexToRgb(c) : c;
  return f >= 1 ? mix(C, [255, 255, 255], Math.min(1, f - 1)) : [C[0] * f, C[1] * f, C[2] * f];
}

/** Relative luminance 0..1 (sRGB approx). */
export function luminance(c: RGB | string): number {
  const [r, g, b] = typeof c === 'string' ? hexToRgb(c) : c;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Saturate/desaturate around the grey of equal luminance. */
export function saturate(c: RGB | string, f: number): RGB {
  const C = typeof c === 'string' ? hexToRgb(c) : c;
  const l = luminance(C) * 255;
  return [l + (C[0] - l) * f, l + (C[1] - l) * f, l + (C[2] - l) * f];
}

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Create an offscreen canvas (DOM canvas preferred). Returns null outside a browser. */
export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D } | null {
  const W = Math.max(1, Math.ceil(w));
  const H = Math.max(1, Math.ceil(h));
  try {
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      if (ctx && typeof ctx.fillRect === 'function') return { canvas: c, ctx };
    }
    if (typeof OffscreenCanvas !== 'undefined') {
      const c = new OffscreenCanvas(W, H);
      const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D | null;
      if (ctx) return { canvas: c, ctx };
    }
  } catch {
    /* no canvas support (tests) */
  }
  return null;
}

/** A tiny deterministic value-noise in 2D for organic wobble (no allocation). */
export function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

/** Fractal value noise, ~0..1. */
export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let amp = 0.5;
  let f = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * f, y * f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

const grainCache = new Map<number, CanvasPattern | null>();

/** Screen-space film grain pattern (cached per alpha bucket). */
export function grainPattern(ctx: CanvasRenderingContext2D, strength = 0.06): CanvasPattern | null {
  const key = Math.round(strength * 100);
  if (grainCache.has(key)) return grainCache.get(key)!;
  const tile = makeCanvas(128, 128);
  let pat: CanvasPattern | null = null;
  if (tile && typeof tile.ctx.createImageData === 'function') {
    const img = tile.ctx.createImageData(128, 128);
    let s = 12345;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const v = (s >>> 16) & 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = Math.round(255 * strength);
    }
    tile.ctx.putImageData(img, 0, 0);
    try {
      pat = ctx.createPattern(tile.canvas as CanvasImageSource, 'repeat');
    } catch {
      pat = null;
    }
  }
  grainCache.set(key, pat);
  return pat;
}

/** Path helper: closed smooth curve through points (Catmull-Rom → Bezier). */
export function smoothClosedPath(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>): void {
  const n = pts.length;
  if (n < 3) return;
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  ctx.closePath();
}

/** Open smooth curve through points. */
export function smoothOpenPath(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>, move = true): void {
  const n = pts.length;
  if (n < 2) return;
  if (move) ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(n - 1, i + 2)]!;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
}
