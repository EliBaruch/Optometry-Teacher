/**
 * Colour + noise maths for the portrait painter. Deliberately self-contained
 * (no imports from render/fx) so either library can be swapped on its own.
 */
type RGB = [number, number, number];
const cache = new Map<string, RGB>();

function parse(input: string): RGB {
  const hit = cache.get(input);
  if (hit) return hit;
  let out: RGB = [128, 128, 128];
  const h = input.trim().toLowerCase().replace(/^#/, '');
  if (/^[0-9a-f]{3,4}$/.test(h)) out = [0, 1, 2].map((i) => parseInt(h[i]! + h[i]!, 16)) as RGB;
  else if (/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(h)) out = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
  cache.set(input, out);
  return out;
}

const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');

/** Linear mix, t=0 -> a, t=1 -> b. Returns #rrggbb. */
export function mix(a: string, b: string, t: number): string {
  const A = parse(a);
  const B = parse(b);
  return `#${hex2(A[0] + (B[0] - A[0]) * t)}${hex2(A[1] + (B[1] - A[1]) * t)}${hex2(A[2] + (B[2] - A[2]) * t)}`;
}

/** amount > 0 lightens toward white, < 0 darkens toward black. */
export function shade(c: string, amount: number): string {
  return amount >= 0 ? mix(c, '#ffffff', amount) : mix(c, '#000000', -amount);
}

/** Relative luminance 0..1 (sRGB approximation). */
export function luminance(c: string): number {
  const [r, g, b] = parse(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function lattice(i: number): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  const a = lattice(i);
  return a + (lattice(i + 1) - a) * u;
}

/** Smooth 2-octave value noise in [-1, 1] for idle sway. */
export function fbm1(x: number): number {
  return noise1(x) * 0.7 + noise1(x * 2.13 + 17.7) * 0.3;
}
