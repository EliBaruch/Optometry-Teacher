/**
 * Minimal colour maths shared by the FX layer and the avatar painter.
 * Accepts #rgb, #rrggbb, #rrggbbaa and rgb()/rgba(); anything else falls back
 * to a neutral grey so painting never throws.
 */
export type RGB = [number, number, number];

const cache = new Map<string, RGB>();

export function parseColor(input: string): RGB {
  const hit = cache.get(input);
  if (hit) return hit;
  let out: RGB = [128, 128, 128];
  const s = input.trim().toLowerCase();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (h.length === 3 || h.length === 4) {
      out = [parseInt(h[0]! + h[0]!, 16), parseInt(h[1]! + h[1]!, 16), parseInt(h[2]! + h[2]!, 16)];
    } else if (h.length === 6 || h.length === 8) {
      out = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
  } else {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1]!.split(/[\s,/]+/).filter(Boolean).map((p) => parseFloat(p));
      if (parts.length >= 3) out = [parts[0]!, parts[1]!, parts[2]!];
    }
  }
  if (out.some((v) => Number.isNaN(v))) out = [128, 128, 128];
  cache.set(input, out);
  return out;
}

const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');

export function toHex([r, g, b]: RGB): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** Linear mix of two colours, t=0 -> a, t=1 -> b. Returns #rrggbb. */
export function mix(a: string, b: string, t: number): string {
  const A = parseColor(a);
  const B = parseColor(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** amount > 0 lightens toward white, < 0 darkens toward black. */
export function shade(c: string, amount: number): string {
  return amount >= 0 ? mix(c, '#ffffff', amount) : mix(c, '#000000', -amount);
}

export function rgba(c: string, alpha: number): string {
  const [r, g, b] = parseColor(c);
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
}

/** Relative luminance 0..1 (sRGB approximation, good enough for art decisions). */
export function luminance(c: string): number {
  const [r, g, b] = parseColor(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
