import type { Rng } from '@core';

/** A dot of the plate in plate units (plate radius = 1, centre = 0,0). */
export interface Dot {
  x: number;
  y: number;
  r: number;
}

export interface PackOptions {
  /** largest dot radius */
  rMax?: number;
  /** smallest dot radius */
  rMin?: number;
  /** clearance between dots */
  gap?: number;
  /** number of size tiers, big to small */
  tiers?: number;
  /** placement attempts per tier */
  attempts?: number;
}

/**
 * Random-size circle packing inside the unit disc: big dots first, then
 * progressively smaller ones fill the gaps (greedy dart throwing with a
 * spatial hash). Produces the mosaic of a pseudo-isochromatic plate.
 */
export function packCircles(rng: Rng, opts: PackOptions = {}): Dot[] {
  const rMax = opts.rMax ?? 0.052;
  const rMin = opts.rMin ?? 0.012;
  const gap = opts.gap ?? 0.006;
  const tiers = opts.tiers ?? 7;
  const attempts = opts.attempts ?? 2600;
  const cell = 2 * rMax + gap;
  const n = Math.ceil(2 / cell) + 2;
  const grid: number[][] = Array.from({ length: n * n }, () => []);
  const dots: Dot[] = [];
  const key = (gx: number, gy: number) => gy * n + gx;
  const gi = (v: number) => Math.max(0, Math.min(n - 1, Math.floor((v + 1) / cell) + 1));

  const fits = (x: number, y: number, r: number): boolean => {
    if (Math.hypot(x, y) + r > 0.985) return false;
    const gx = gi(x);
    const gy = gi(y);
    for (let yy = gy - 1; yy <= gy + 1; yy++) {
      for (let xx = gx - 1; xx <= gx + 1; xx++) {
        if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        for (const idx of grid[key(xx, yy)]!) {
          const d = dots[idx]!;
          const min = d.r + r + gap;
          const dx = d.x - x;
          const dy = d.y - y;
          if (dx * dx + dy * dy < min * min) return false;
        }
      }
    }
    return true;
  };

  for (let t = 0; t < tiers; t++) {
    const hi = rMax * Math.pow(rMin / rMax, t / tiers);
    const lo = rMax * Math.pow(rMin / rMax, (t + 1) / tiers);
    // smaller tiers need more darts to find the remaining holes
    const tries = Math.round(attempts * (1 + t * 0.6));
    for (let i = 0; i < tries; i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = Math.sqrt(rng.next());
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      const r = lo + (hi - lo) * rng.next();
      if (!fits(x, y, r)) continue;
      dots.push({ x, y, r });
      grid[key(gi(x), gi(y))]!.push(dots.length - 1);
    }
  }
  return dots;
}

/** Fraction of the unit disc covered by dots (for tests/tuning). */
export function coverage(dots: Dot[]): number {
  let a = 0;
  for (const d of dots) a += d.r * d.r;
  return a; // (sum πr²) / π
}
