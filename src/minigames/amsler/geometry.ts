/**
 * Amsler grid geometry — pure, framework-free.
 *
 * Coordinates are in DEGREES of visual angle on the 10 cm card held at ~33 cm,
 * where each 5 mm square subtends 1°. The grid spans x, y ∈ [-10, 10],
 * centre (0,0) = fixation dot, x+ = patient's right as seen on the card,
 * y+ = up (superior) — the same convention as core AmslerFinding.
 */
import type { AmslerFinding } from '@core';

export const GRID_SQUARES = 20;
export const HALF_DEG = 10;
/** Mask resolution: cells per side (0.25° each). */
export const MASK_N = 80;
export const CELL_DEG = (HALF_DEG * 2) / MASK_N;

export type Mask = Uint8Array;
export type AmslerClass = 'normal' | 'metamorphopsia' | 'scotoma';

export function createMask(): Mask {
  return new Uint8Array(MASK_N * MASK_N);
}

/** Centre of mask cell (col i, row j from the top) in degrees. */
export function cellCenter(i: number, j: number): { x: number; y: number } {
  return { x: -HALF_DEG + (i + 0.5) * CELL_DEG, y: HALF_DEG - (j + 0.5) * CELL_DEG };
}

/** Fill (value=1) or erase (value=0) a disc of radius r° at (cx, cy)°. Returns true when any cell changed. */
export function paintDisc(mask: Mask, cx: number, cy: number, r: number, value: 0 | 1): boolean {
  let changed = false;
  const i0 = Math.max(0, Math.floor((cx - r + HALF_DEG) / CELL_DEG));
  const i1 = Math.min(MASK_N - 1, Math.ceil((cx + r + HALF_DEG) / CELL_DEG));
  const j0 = Math.max(0, Math.floor((HALF_DEG - (cy + r)) / CELL_DEG));
  const j1 = Math.min(MASK_N - 1, Math.ceil((HALF_DEG - (cy - r)) / CELL_DEG));
  const r2 = r * r;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const c = cellCenter(i, j);
      const dx = c.x - cx;
      const dy = c.y - cy;
      if (dx * dx + dy * dy <= r2) {
        const k = j * MASK_N + i;
        if (mask[k] !== value) {
          mask[k] = value;
          changed = true;
        }
      }
    }
  }
  return changed;
}

/** Paint a stroke from a→b as overlapping dabs (so fast drags leave no gaps). */
export function paintStroke(mask: Mask, ax: number, ay: number, bx: number, by: number, r: number, value: 0 | 1): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(d / Math.max(0.1, r * 0.35)));
  let changed = false;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    if (paintDisc(mask, ax + (bx - ax) * t, ay + (by - ay) * t, r, value)) changed = true;
  }
  return changed;
}

export function maskCount(mask: Mask): number {
  let n = 0;
  for (let k = 0; k < mask.length; k++) n += mask[k]!;
  return n;
}

/** Fraction of the whole grid that is marked, 0..1. */
export function maskArea(mask: Mask): number {
  return maskCount(mask) / mask.length;
}

/** Intersection-over-union of two masks. Two empty masks agree perfectly (1). */
export function iou(a: Mask, b: Mask): number {
  let inter = 0;
  let uni = 0;
  for (let k = 0; k < a.length; k++) {
    const x = a[k]!;
    const y = b[k]!;
    if (x && y) inter++;
    if (x || y) uni++;
  }
  return uni === 0 ? 1 : inter / uni;
}

/** Defaults for optional centre/radius so every abnormal finding has a concrete region. */
export interface NormalizedAmsler {
  result: AmslerFinding['result'];
  center: { x: number; y: number };
  radius: number;
}

export function normalizeAmsler(f: AmslerFinding): NormalizedAmsler {
  if (f.result === 'normal') return { result: 'normal', center: { x: 0, y: 0 }, radius: 0 };
  const fallbackCenter = f.result === 'paracentral-scotoma' ? { x: 3, y: 0 } : { x: 0, y: 0 };
  const fallbackR = f.result === 'paracentral-scotoma' ? 2 : 3;
  const c = f.center ?? fallbackCenter;
  const r = f.radius ?? fallbackR;
  return {
    result: f.result,
    center: { x: clampDeg(c.x), y: clampDeg(c.y) },
    radius: Math.max(0.5, Math.min(14, r)),
  };
}

function clampDeg(v: number): number {
  return Math.max(-HALF_DEG, Math.min(HALF_DEG, Number.isFinite(v) ? v : 0));
}

export function classOf(f: AmslerFinding): AmslerClass {
  if (f.result === 'normal') return 'normal';
  return f.result === 'metamorphopsia' ? 'metamorphopsia' : 'scotoma';
}

/** Seed of the organic scotoma outline — shared by the renderer and the truth mask. */
export const SCOTOMA_SEED = 0.7;

/** Edge irregularity of a scotoma (multiplier on radius) so it looks organic, not a CAD circle. */
export function scotomaEdge(theta: number, seed = SCOTOMA_SEED): number {
  return 1 + 0.07 * Math.sin(3 * theta + seed) + 0.04 * Math.sin(5 * theta + seed * 1.7);
}

/** Radius of the region boundary at angle θ (y up): organic for a scotoma, a disc for metamorphopsia. */
export function regionRadiusAt(f: AmslerFinding, theta: number): number {
  const n = normalizeAmsler(f);
  if (n.result === 'normal') return 0;
  return classOf(f) === 'scotoma' ? n.radius * scotomaEdge(theta) : n.radius;
}

/**
 * The true abnormal region as a mask, clipped to the grid. It follows exactly
 * the outline the patient's perception is rendered with (the 50% line of the
 * feathered scotoma; the disc where distortion is visible), so faithfully
 * tracing what is shown scores well. Empty for a normal grid.
 */
export function trueRegionMask(f: AmslerFinding): Mask {
  const m = createMask();
  if (f.result === 'normal') return m;
  const n = normalizeAmsler(f);
  for (let j = 0; j < MASK_N; j++) {
    for (let i = 0; i < MASK_N; i++) {
      const c = cellCenter(i, j);
      const ex = c.x - n.center.x;
      const ey = c.y - n.center.y;
      if (Math.hypot(ex, ey) <= regionRadiusAt(f, Math.atan2(ey, ex))) m[j * MASK_N + i] = 1;
    }
  }
  return m;
}

// ───────────────────────── where a defect lies (shared by chart + patient's words)

export interface Direction {
  /** involves fixation / within ~1° of it */
  central: boolean;
  /** +1 above fixation, -1 below, 0 on the horizontal meridian */
  v: -1 | 0 | 1;
  /** +1 patient's right of fixation, -1 left, 0 on the vertical meridian */
  h: -1 | 0 | 1;
}

/** One classifier for "where is it": the chart's field location and the patient's words both use it. */
export function directionOf(f: AmslerFinding): Direction {
  const n = normalizeAmsler(f);
  const { x, y } = n.center;
  if (Math.hypot(x, y) <= Math.max(1, n.radius * 0.45)) return { central: true, v: 0, h: 0 };
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const v = ay >= Math.max(0.75, ax * 0.4) ? (y > 0 ? 1 : -1) : 0;
  const h = ax >= Math.max(0.75, ay * 0.4) ? (x > 0 ? 1 : -1) : 0;
  return { central: v === 0 && h === 0, v, h };
}

// ───────────────────────── perception model (what the patient sees)

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Radial pinch gain: the radial map d → d·(1 − A·env) keeps slope ≥ ~1 − A, so it never folds. */
const PINCH = 0.46;
/** Max slope the ripple may add (amplitude × spatial frequency). */
const RIPPLE_SLOPE = 0.22;

/**
 * Metamorphopsia displacement for a grid point, in degrees.
 *
 * A smooth Gaussian envelope centred on the lesion pulls the lines toward its
 * centre (photoreceptors spread apart over fluid → the image is drawn in,
 * micropsia) and a gentle ripple, whose wavelength scales with the lesion,
 * makes straight lines read as wavy. The field is built to stay a smooth,
 * one-to-one warp at full strength for every lesion size (no folds, no
 * starburst knots): the radial gain is capped and the ripple's slope is
 * bounded. Strength 0..1.
 */
export function warpOffset(x: number, y: number, f: AmslerFinding, strength: number): { dx: number; dy: number } {
  if (f.result !== 'metamorphopsia' || strength <= 0) return { dx: 0, dy: 0 };
  const n = normalizeAmsler(f);
  const ex = x - n.center.x;
  const ey = y - n.center.y;
  const r = n.radius;
  const d2 = ex * ex + ey * ey;
  const sigma = r * 0.55;
  const d = Math.sqrt(d2);
  const env = Math.exp(-d2 / (2 * sigma * sigma)) * (1 - smooth(r * 1.15, r * 1.9, d));
  if (env < 1e-4) return { dx: 0, dy: 0 };
  // radial pinch toward the lesion centre (zero at the centre, peaks near 0.55r)
  const pinch = -PINCH * env;
  // undulation: about one and a half waves across the lesion, slope-bounded
  const k = Math.min(2.2, 4.4 / r);
  const amp = (RIPPLE_SLOPE / k) * env;
  const wx = Math.sin(k * ey + 0.3 * k * ex + 0.6) * amp;
  const wy = Math.sin(k * ex - 0.25 * k * ey + 1.9) * amp;
  return { dx: strength * (ex * pinch + wx), dy: strength * (ey * pinch + wy) };
}

/** How "missing" the grid is at (x, y): 0 = intact, 1 = fully absent (feathered around the organic edge). */
export function scotomaDensity(x: number, y: number, f: AmslerFinding): number {
  if (f.result !== 'central-scotoma' && f.result !== 'paracentral-scotoma') return 0;
  const n = normalizeAmsler(f);
  const ex = x - n.center.x;
  const ey = y - n.center.y;
  const d = Math.hypot(ex, ey);
  const r = regionRadiusAt(f, Math.atan2(ey, ex));
  const feather = Math.min(r * 0.2, 0.9);
  return 1 - smooth(r - feather, r + feather, d);
}

// ───────────────────────── scoring

export interface EyeScoreInput {
  truth: AmslerFinding;
  marked: Mask;
  chosen: AmslerClass | null;
}

export interface EyeScore {
  score: number;
  classOk: boolean;
  /** IoU vs the true region (null for a truly normal grid). */
  iou: number | null;
  /** 0..1 region component */
  region: number;
  /** marked fraction of the grid */
  area: number;
}

/** IoU at or above this counts as a perfect map (research target ≥ 0.8; brush edges cost a little). */
export const PERFECT_IOU = 0.75;

export function scoreEye({ truth, marked, chosen }: EyeScoreInput): EyeScore {
  const cls = classOf(truth);
  const classOk = chosen === cls;
  const area = maskArea(marked);
  if (cls === 'normal') {
    // A clean grid should stay clean: stray marks are false positives.
    const region = area < 0.004 ? 1 : Math.max(0, 1 - area * 10);
    return { score: 0.45 * (classOk ? 1 : 0) + 0.55 * region, classOk, iou: null, region, area };
  }
  const i = iou(marked, trueRegionMask(truth));
  const region = Math.max(0, Math.min(1, i / PERFECT_IOU));
  return { score: 0.45 * (classOk ? 1 : 0) + 0.55 * region, classOk, iou: i, region, area };
}

/** Combine per-eye scores with a gentle time factor (Amsler is a 1-minute test). */
export function scoreExam(eyes: EyeScore[], timeMs: number): { accuracy: number; perfect: boolean } {
  if (!eyes.length) return { accuracy: 0, perfect: false };
  const mean = eyes.reduce((s, e) => s + e.score, 0) / eyes.length;
  const sec = timeMs / 1000;
  const timeFactor = sec <= 120 ? 1 : Math.max(0.85, 1 - (sec - 120) / 600);
  const accuracy = Math.max(0, Math.min(1, mean * timeFactor));
  const perfect = eyes.every((e) => e.classOk && e.region >= 0.999) && timeFactor === 1;
  return { accuracy, perfect };
}

// ───────────────────────── contour of the marked map (for a smooth outline)

export type Loop = { x: number; y: number }[];

/**
 * Marching squares over the mask (sampled at cell centres, zero-padded) →
 * closed loops in DEGREES. Outer boundaries and holes both come out as loops;
 * fill them with the even-odd rule.
 */
export function maskContours(mask: Mask): Loop[] {
  const N = MASK_N;
  const v = (i: number, j: number) => (i < 0 || j < 0 || i >= N || j >= N ? 0 : mask[j * N + i]!);
  // Points are kept in doubled sample-index space so every midpoint is an integer key.
  const W = 2 * (N + 2) + 4;
  const key = (x2: number, y2: number) => (y2 + 2) * W + (x2 + 2);
  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  };
  for (let j = -1; j < N; j++) {
    for (let i = -1; i < N; i++) {
      const c = (v(i, j) << 3) | (v(i + 1, j) << 2) | (v(i + 1, j + 1) << 1) | v(i, j + 1);
      if (c === 0 || c === 15) continue;
      const T = key(2 * i + 1, 2 * j);
      const R = key(2 * i + 2, 2 * j + 1);
      const B = key(2 * i + 1, 2 * j + 2);
      const L = key(2 * i, 2 * j + 1);
      switch (c) {
        case 1: case 14: link(L, B); break;
        case 2: case 13: link(B, R); break;
        case 3: case 12: link(L, R); break;
        case 4: case 11: link(T, R); break;
        case 6: case 9: link(T, B); break;
        case 7: case 8: link(T, L); break;
        case 5: link(T, R); link(L, B); break; // saddle: keep the two corners apart
        case 10: link(T, L); link(B, R); break;
      }
    }
  }
  const seen = new Set<number>();
  const loops: Loop[] = [];
  const toDeg = (k: number) => {
    const x2 = (k % W) - 2;
    const y2 = Math.floor(k / W) - 2;
    return { x: -HALF_DEG + (x2 / 2 + 0.5) * CELL_DEG, y: HALF_DEG - (y2 / 2 + 0.5) * CELL_DEG };
  };
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop: Loop = [];
    let prev = -1;
    let cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push(toDeg(cur));
      const nb = adj.get(cur)!;
      const next = nb[0] !== prev ? nb[0]! : nb[1] ?? nb[0]!;
      prev = cur;
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/** Chaikin corner-cutting on a closed loop — turns the 45° staircase into a smooth curve. */
export function smoothLoop(loop: Loop, iterations = 2): Loop {
  let pts = loop;
  for (let it = 0; it < iterations; it++) {
    const out: Loop = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k]!;
      const b = pts[(k + 1) % pts.length]!;
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    pts = out;
  }
  return pts;
}

/** Signed shoelace area of a loop in deg² (sign depends on winding). */
export function loopArea(loop: Loop): number {
  let s = 0;
  for (let k = 0; k < loop.length; k++) {
    const a = loop[k]!;
    const b = loop[(k + 1) % loop.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}
