/**
 * Tiny smooth 1-D value noise in [-1, 1]. Used for organic camera shake and
 * ember wander. Deterministic for a given input; no allocations per call.
 */
function lattice(i: number): number {
  // Integer hash -> [-1, 1]
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * f * (f * (f * 6 - 15) + 10); // quintic fade
  const a = lattice(i);
  const b = lattice(i + 1);
  return a + (b - a) * u;
}

/** Fractal (2 octaves) noise — a little richer, still within [-1, 1]. */
export function fbm1(x: number): number {
  return (noise1(x) * 0.7 + noise1(x * 2.13 + 17.7) * 0.3);
}
