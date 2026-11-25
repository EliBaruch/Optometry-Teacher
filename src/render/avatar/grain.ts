/** A tiny tiling film-grain bitmap (alpha speckle) (generated once, cached) for print-like texture. */
import { createRng } from '@core';

let cached: string | null | undefined;

export function grainDataUrl(): string | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    if (typeof document === 'undefined') return cached;
    const size = 96;
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const g = cv.getContext('2d');
    if (!g) return cached;
    const img = g.createImageData(size, size);
    const r = createRng(0x6a1e);
    for (let i = 0; i < size * size; i++) {
      // light/dark speckle carried in alpha, so it needs no blend mode
      const v = r.next() - 0.5;
      const c = v > 0 ? 255 : 0;
      img.data[i * 4] = c;
      img.data[i * 4 + 1] = c;
      img.data[i * 4 + 2] = c;
      img.data[i * 4 + 3] = Math.round(Math.abs(v) * 2 * (v > 0 ? 70 : 110));
    }
    g.putImageData(img, 0, 0);
    const url = cv.toDataURL('image/png');
    cached = url.startsWith('data:image/png') ? url : null;
  } catch {
    cached = null;
  }
  return cached;
}
