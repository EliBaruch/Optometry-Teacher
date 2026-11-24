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

/** The true abnormal region as a mask (disc clipped to the grid). Empty for a normal grid. */
export function trueRegionMask(f: AmslerFinding): Mask {
  const m = createMask();
  if (f.result === 'normal') return m;
  const n = normalizeAmsler(f);
  paintDisc(m, n.center.x, n.center.y, n.radius, 1);
  return m;
}

// ───────────────────────── perception model (what the patient sees)

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Metamorphopsia displacement for a grid point, in degrees.
 * A Gaussian envelope centred on the lesion pulls lines toward its centre
 * (photoreceptor crowding/stretching over fluid or a membrane) and adds a
 * gentle ripple so straight lines read as wavy. Strength 0..1.
 */
export function warpOffset(x: number, y: number, f: AmslerFinding, strength: number): { dx: number; dy: number } {
  if (f.result !== 'metamorphopsia' || strength <= 0) return { dx: 0, dy: 0 };
  const n = normalizeAmsler(f);
  const ex = x - n.center.x;
  const ey = y - n.center.y;
  const d = Math.hypot(ex, ey);
  const r = n.radius;
  const sigma = r * 0.62;
  const env = Math.exp(-(d * d) / (2 * sigma * sigma)) * (1 - smooth(r * 0.95, r * 1.25, d));
  if (env < 1e-4) return { dx: 0, dy: 0 };
  const ux = d > 1e-6 ? ex / d : 0;
  const uy = d > 1e-6 ? ey / d : 0;
  // radial pinch (strongest mid-lesion, zero at the very centre)
  const pinch = -Math.min(1.1, 0.32 * r) * env * Math.sin(Math.min(Math.PI, (d / r) * Math.PI));
  // slow, smooth undulation -> lines read as bowed and wavy rather than jittery
  const wave = 0.34 * Math.min(1.5, 0.4 + r * 0.16) * env;
  const wx = Math.sin(y * 1.15 + x * 0.35 + 0.6) * wave;
  const wy = Math.sin(x * 1.15 - y * 0.3 + 1.9) * wave;
  return { dx: strength * (ux * pinch + wx), dy: strength * (uy * pinch + wy) };
}

/** Edge irregularity of a scotoma (multiplier on radius) so it looks organic, not a CAD circle. */
export function scotomaEdge(theta: number, seed = 0): number {
  return 1 + 0.07 * Math.sin(3 * theta + seed) + 0.04 * Math.sin(5 * theta + seed * 1.7);
}

/** How "missing" the grid is at (x, y): 0 = intact, 1 = fully absent. */
export function scotomaDensity(x: number, y: number, f: AmslerFinding): number {
  if (f.result !== 'central-scotoma' && f.result !== 'paracentral-scotoma') return 0;
  const n = normalizeAmsler(f);
  const ex = x - n.center.x;
  const ey = y - n.center.y;
  const d = Math.hypot(ex, ey);
  const r = n.radius * scotomaEdge(Math.atan2(ey, ex));
  return 1 - smooth(r * 0.72, r * 1.12, d);
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
