/**
 * Card palettes: the patient's real iris colour is the base (lifted so dark
 * brown irises still glow like amber), the Gallery wing's jewel tone is the
 * accent, and rarer cards gain more exotic hue-shifted companions.
 */
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

/**
 * Palette for paintIrisArt: [iris base, wing accent, deep shade, ...exotics].
 * Deterministic for (irisColor, accent, rarity).
 */
export function cardPalette(irisColor: string, accent: string, rarity: CardRarity): string[] {
  const iris = hexToHsl(irisColor);
  // Lift dark irises into luminous jewel tones while keeping their hue identity.
  const base = tune(iris, { s: Math.max(0.42, Math.min(0.85, iris.s * 1.15)), l: Math.max(0.42, Math.min(0.62, iris.l * 1.4)) });
  const acc = hexToHsl(accent);
  const deep = tune(base, { h: -12, s: Math.min(1, base.s + 0.1), l: 0.16 });
  const out = [hslToHex(base), hslToHex(tune(acc, { l: Math.min(0.66, Math.max(0.5, acc.l)) })), hslToHex(deep)];
  if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') out.push(hslToHex(tune(base, { h: 35, l: 0.68, s: 0.75 })));
  if (rarity === 'epic' || rarity === 'legendary') out.push(hslToHex(tune(acc, { h: 150, l: 0.62, s: 0.8 })));
  if (rarity === 'legendary') out.push('#fff3c4');
  return out;
}
