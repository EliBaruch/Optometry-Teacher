/** SVG path helpers (pure string builders). */
import { CX, type Geo } from './geometry';

export type Pt = readonly [number, number];

export const f = (n: number) => (Math.round(n * 100) / 100).toString();
export const P = (x: number, y: number) => `${f(x)},${f(y)}`;

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
export function smooth(pts: readonly Pt[], closed = false, tension = 1): string {
  const n = pts.length;
  if (n < 2) return '';
  const get = (i: number): Pt => (closed ? pts[(i + n) % n]! : pts[Math.max(0, Math.min(n - 1, i))]!);
  let d = `M${P(pts[0]![0], pts[0]![1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const k = tension / 6;
    const c1x = p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += `C${P(c1x, c1y)} ${P(c2x, c2y)} ${P(p2[0], p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/**
 * A tapered ribbon along a centre-line of [x, y, width] samples — used for
 * brows, hair strands and creases so strokes look hand-inked.
 */
export function ribbon(samples: readonly (readonly [number, number, number])[]): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < samples.length; i++) {
    const [x, y, w] = samples[i]!;
    const a = samples[Math.max(0, i - 1)]!;
    const b = samples[Math.min(samples.length - 1, i + 1)]!;
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    left.push([x + (nx * w) / 2, y + (ny * w) / 2]);
    right.push([x - (nx * w) / 2, y - (ny * w) / 2]);
  }
  return smooth([...left, ...right.reverse()], true);
}

/** Sample a quadratic Bézier into ribbon samples with a width profile. */
export function quadRibbon(p0: Pt, c: Pt, p2: Pt, width: (t: number) => number, steps = 8): string {
  const s: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    s.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1], width(t)]);
  }
  return ribbon(s);
}

/** Head silhouette (cranium + cheeks + jaw + chin), symmetric. */
export function headPath(g: Geo, inflate = 0, dx = 0, dy = 0): string {
  const W = g.headW + inflate;
  const C = g.cheekW + inflate;
  const J = g.jawW + inflate;
  const T = g.headTop - inflate;
  const Y = g.chinY + inflate * 0.6;
  const cw = g.chinW + inflate * 0.5;
  const E = g.eyeY;
  const pts: Pt[] = [];
  // right half, top -> chin
  const right: [number, number][] = [
    [CX, T],
    [CX + W * 0.62, T + 4],
    [CX + W * 0.95, T + (E - T) * 0.42],
    [CX + W, E - 6],
    [CX + C, E + 10],
    [CX + J + 3, Y - 26],
    [CX + J - 3, Y - 14],
    [CX + cw + 4, Y - 3],
    [CX, Y],
  ];
  for (const p of right) pts.push(p);
  for (let i = right.length - 2; i >= 1; i--) pts.push([2 * CX - right[i]![0], right[i]![1]]);
  return smooth(dx || dy ? pts.map(([x, y]) => [x + dx, y + dy] as Pt) : pts, true, 1);
}
