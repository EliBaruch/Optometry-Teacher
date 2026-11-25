/**
 * Card palettes for @render's paintIrisArt. Every stromal colour comes from the
 * patient's own iris hue family (a brown iris always paints brown), with
 * per-card variation in hue, lightness and pattern so two cards in the same
 * wing never look alike. Only Epic and Legendary cards gain a single exotic
 * gem tone, kept as a minority sector. The wing's accent is NOT painted into
 * the iris: it belongs to the card chrome and the art backdrop (see ui/art.ts).
 */
import { createRng } from '@core';
import type { CardRarity } from './model';

export interface HSL { h: number; s: number; l: number }

export function hexToHsl(hex: string): HSL {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (!/^[0-9a-f]{6}$/i.test(h.slice(0, 6)) || Number.isNaN(n)) return { h: 210, s: 0.3, l: 0.4 };
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue: number;
  if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return { h: hue * 60, s, l };
}

export function hslToHex({ h, s, l }: HSL): string {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = Math.max(0, Math.min(1, s));
  const ll = Math.max(0, Math.min(1, l));
  const f = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  if (ss === 0) return '#' + to(ll).repeat(3);
  return '#' + to(f(hh + 1 / 3)) + to(f(hh)) + to(f(hh - 1 / 3));
}

const tune = (c: HSL, d: Partial<HSL>): HSL => ({ h: c.h + (d.h ?? 0), s: d.s ?? c.s, l: d.l ?? c.l });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Signed shortest distance between two hues, in degrees (-180..180]. */
export function hueDelta(a: number, b: number): number {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** The hue family of an iris colour; near-grey irises read as blue-grey. */
export function irisHue(irisColor: string): number {
  const c = hexToHsl(irisColor);
  return c.s < 0.06 ? 205 : c.h;
}

/** Exotic gem tones for Epic/Legendary cards (one per card, chosen by seed). */
export const EXOTIC_GEMS: readonly string[] = ['#5b8cff', '#34d399', '#b07cff', '#2ee6e6', '#ff7ab8', '#ffcf5a', '#7dd3fc'];

/** Max hue drift of any family colour from the iris hue (tests hold the painter to ±35°). */
export const FAMILY_SPREAD = 32;

/** How the iris is lit: an amber-bright heart, a deep heart, or an even wash. */
export type IrisCharacter = 'sunburst' | 'deep' | 'even';
const CHARACTERS: readonly IrisCharacter[] = ['sunburst', 'deep', 'even'];

export interface CardPaletteInfo {
  /** [inner (pupillary zone), mid (stroma), outer (periphery), fleck, ...extras] */
  colors: string[];
  character: IrisCharacter;
  /** Index into colors of the exotic gem, or -1. */
  exotic: number;
}

/**
 * Deterministic palette for (irisColor, rarity, seed), laid out the way
 * paintIris reads it: [inner, mid, outer, fleck, ...sector extras].
 */
export function cardPaletteInfo(irisColor: string, rarity: CardRarity, seed = 0): CardPaletteInfo {
  const src = hexToHsl(irisColor);
  const h = irisHue(irisColor);
  const rng = createRng(((seed >>> 0) ^ 0x1215c0de) >>> 0);
  const spin = rng.float(-10, 10);
  const character = CHARACTERS[rng.int(0, CHARACTERS.length - 1)]!;
  const dark = src.l < 0.24;
  // Lift dark irises enough to read as rich brown/hazel on a midnight card, never into orange.
  const mid: HSL = dark
    ? { h: h + spin, s: clamp(src.s * rng.float(0.95, 1.3), 0.36, 0.64), l: rng.float(0.27, 0.4) }
    : { h: h + spin, s: clamp(Math.max(src.s, 0.2) * rng.float(1, 1.35), 0.26, 0.72), l: clamp(src.l * rng.float(1.02, 1.28), 0.34, 0.6) };
  const inner =
    character === 'sunburst'
      ? tune(mid, { h: rng.float(6, 16), s: clamp(mid.s + 0.12, 0, 0.82), l: clamp(mid.l + rng.float(0.12, 0.2), 0, 0.66) })
      : character === 'deep'
        ? tune(mid, { h: rng.float(-8, 2), l: clamp(mid.l - rng.float(0.08, 0.13), 0.14, 1) })
        : tune(mid, { h: rng.float(-4, 6), l: clamp(mid.l + rng.float(0.03, 0.08), 0, 0.64) });
  const outer = tune(mid, { h: rng.float(-14, -4), s: clamp(mid.s + 0.08, 0, 0.8), l: clamp(mid.l * rng.float(0.42, 0.58), 0.1, 0.26) });
  const fleck = tune(mid, { h: rng.float(-14, 20), s: rng.float(0.55, 0.75), l: rng.float(0.6, 0.72) });
  const colors = [inner, mid, outer, fleck].map(hslToHex);
  let exotic = -1;
  if (rarity === 'rare') {
    // a second in-family sheen sector (copper on brown, steel on blue)
    colors.push(hslToHex(tune(mid, { h: rng.float(-18, 18), s: clamp(mid.s + 0.18, 0, 0.85), l: rng.float(0.5, 0.6) })));
  } else if (rarity === 'epic' || rarity === 'legendary') {
    const far = EXOTIC_GEMS.filter((g) => Math.abs(hueDelta(hexToHsl(g).h, h)) > 60);
    const pool = far.length ? far : EXOTIC_GEMS;
    const gem = hexToHsl(pool[rng.int(0, pool.length - 1)]!);
    colors.push(hslToHex(rarity === 'legendary' ? tune(gem, { l: clamp(gem.l + 0.08, 0, 0.8) }) : gem));
    exotic = colors.length - 1;
  }
  return { colors, character, exotic };
}

/** Palette for paintIrisArt (see cardPaletteInfo). */
export function cardPalette(irisColor: string, rarity: CardRarity, seed = 0): string[] {
  return cardPaletteInfo(irisColor, rarity, seed).colors;
}
