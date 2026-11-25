/**
 * Iris card artwork: paints @render's paintIrisArt once per (seed, rarity,
 * palette, accent, size) and caches the result as an image URL, so a wall of 57
 * cards costs one paint each, ever. Wall thumbnails are painted lazily in small
 * time slices, so opening the Gallery never stalls the main thread.
 *
 * The iris itself is painted only from the patient's iris palette; the wing's
 * jewel accent is laid over the backdrop afterwards (outside the iris), from a
 * per-card direction, so every card in a wing shares a light but not a look.
 */
import { useEffect, useState } from 'preact/hooks';
import { paintIrisArt } from '@render';
import type { CardRarity } from '../model';

const cache = new Map<string, string>();
const CAP = 160;

export interface ArtSpec {
  seed: number;
  rarity: CardRarity;
  palette: readonly string[];
  /** Wing accent for the backdrop light (never painted into the iris). */
  accent: string;
}

export function artKey(a: ArtSpec, px: number): string {
  return `${a.seed}|${a.rarity}|${a.palette.join(',')}|${a.accent}|${px}`;
}

const TAU = Math.PI * 2;

function rgbOf(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return Number.isNaN(n) ? [244, 114, 182] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Direction (degrees) the wing light falls from, varied per card. */
export function lightAngle(seed: number): number {
  return (((seed >>> 0) * 2654435761) >>> 0) % 360;
}

/** Wing light: a coloured spotlight over the backdrop, clipped away from the iris. */
function paintWingLight(ctx: CanvasRenderingContext2D, size: number, a: ArtSpec): void {
  const [r, g, b] = rgbOf(a.accent);
  const c = size / 2;
  const R = size * 0.34;
  const ang = (lightAngle(a.seed) * Math.PI) / 180;
  const lx = c + Math.cos(ang) * size * 0.46;
  const ly = c + Math.sin(ang) * size * 0.46;
  const strength = a.rarity === 'common' ? 0.3 : a.rarity === 'rare' ? 0.36 : 0.42;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.arc(c, c, R * 1.02, 0, TAU);
  ctx.clip('evenodd');
  ctx.globalCompositeOperation = 'screen';
  const key = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * 0.78);
  key.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  key.addColorStop(0.42, `rgba(${r},${g},${b},${strength * 0.32})`);
  key.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, size, size);
  // a thin accent rim-light hugging the iris on the lit side
  const rim = ctx.createRadialGradient(c, c, R * 1.02, c, c, R * 1.32);
  rim.addColorStop(0, `rgba(${r},${g},${b},${strength * 0.7})`);
  rim.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.arc(c, c, R * 1.4, ang - 1.1, ang + 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paintCard(ctx: CanvasRenderingContext2D, px: number, a: ArtSpec): void {
  paintIrisArt(ctx, px, a.seed, { palette: [...a.palette], rarity: a.rarity });
  paintWingLight(ctx, px, a);
}

/** Cached art for a key, refreshing its LRU position; undefined when not painted yet. */
function cached(key: string): string | undefined {
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

/** Data URL of the painted art, or '' when canvas is unavailable (tests/SSR). */
export function irisArtUrl(a: ArtSpec, px: number): string {
  const key = artKey(a, px);
  const hit = cached(key);
  if (hit !== undefined) return hit;
  let url = '';
  try {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    paintCard(ctx, px, a);
    url = c.toDataURL('image/jpeg', 0.9);
  } catch {
    url = '';
  }
  cache.set(key, url);
  if (cache.size > CAP) cache.delete(cache.keys().next().value as string);
  return url;
}

// ── lazy paint queue ───────────────────────────────────────────────────────
interface Job {
  run(): void;
}
const queue: Job[] = [];
let timer: ReturnType<typeof setTimeout> | 0 = 0;
/** Main-thread budget per slice for painting thumbnails (then yield to input & rendering). */
const SLICE_BUDGET_MS = 10;

function pump(): void {
  timer = 0;
  const start = performance.now();
  // Always make progress (one job), then keep going while inside the budget.
  do {
    queue.shift()?.run();
  } while (queue.length && performance.now() - start < SLICE_BUDGET_MS);
  if (queue.length) timer = setTimeout(pump, 4);
}

function enqueue(job: Job): () => void {
  queue.push(job);
  if (!timer) timer = setTimeout(pump, 0);
  return () => {
    const i = queue.indexOf(job);
    if (i >= 0) queue.splice(i, 1);
  };
}

/**
 * Art URL for a card. `eager` paints synchronously (hero cards that must be
 * ready on first frame); otherwise a cache miss returns '' and the art fades
 * in a frame or two later.
 */
export function useIrisArt(a: ArtSpec, px: number, eager = false): string {
  const key = artKey(a, px);
  const [url, setUrl] = useState(() => (eager ? irisArtUrl(a, px) : cached(key) ?? ''));
  useEffect(() => {
    const hit = cached(key);
    if (hit !== undefined) {
      setUrl(hit);
      return;
    }
    if (eager || typeof document === 'undefined') {
      setUrl(irisArtUrl(a, px));
      return;
    }
    setUrl('');
    return enqueue({ run: () => setUrl(irisArtUrl(a, px)) });
  }, [key]);
  return url;
}
