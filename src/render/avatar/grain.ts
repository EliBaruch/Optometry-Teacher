/** A tiny tiling film-grain bitmap (generated once, cached) for print-like texture. */
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
      const v = 128 + (r.next() - 0.5) * 255;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const url = cv.toDataURL('image/png');
    cached = url.startsWith('data:image/png') ? url : null;
  } catch {
    cached = null;
  }
  return cached;
}
