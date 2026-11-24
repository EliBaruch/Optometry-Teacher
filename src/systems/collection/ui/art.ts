/**
 * Iris card artwork: paints @render's paintIrisArt once per (seed, rarity,
 * palette, size) and caches the result as an image URL, so a wall of 57
 * cards costs one paint each, ever.
 */
import { paintIrisArt } from '@render';
import type { CardRarity } from '../model';

const cache = new Map<string, string>();
const CAP = 160;

export function artKey(seed: number, rarity: CardRarity, palette: readonly string[], px: number): string {
  return `${seed}|${rarity}|${palette.join(',')}|${px}`;
}

/** Data URL of the painted art, or '' when canvas is unavailable (tests/SSR). */
export function irisArtUrl(seed: number, rarity: CardRarity, palette: readonly string[], px: number): string {
  const key = artKey(seed, rarity, palette, px);
  const hit = cache.get(key);
  if (hit !== undefined) {
    // refresh LRU position
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  let url = '';
  try {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    paintIrisArt(ctx, px, seed, { palette: [...palette], rarity });
    url = c.toDataURL('image/jpeg', 0.9);
  } catch {
    url = '';
  }
  cache.set(key, url);
  if (cache.size > CAP) cache.delete(cache.keys().next().value as string);
  return url;
}

/** Paint directly into a live canvas (animated shimmer in the inspector). */
export function paintArtFrame(canvas: HTMLCanvasElement, seed: number, rarity: CardRarity, palette: readonly string[], t: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  paintIrisArt(ctx, canvas.width, seed, { palette: [...palette], rarity, t });
}
