/**
 * Geometric model of the visual field — pure.
 *
 * Coordinates are in degrees of visual angle, as the PATIENT sees the world and
 * as a perimetry printout is plotted: +x = the patient's right, +y = superior.
 * For OD the temporal field is on the right (+x); for OS it is on the left.
 *
 * Every FieldDefect value maps to a depth map 0..1 (0 = normal sensitivity,
 * 1 = absolute loss). The physiological blind spot (optic disc, ~15° temporal,
 * just below the horizontal meridian) is modelled separately so that every eye
 * has one, and an "enlarged blind spot" simply grows it.
 */
import type { Eye, FieldDefect } from '@core';

export interface FieldPoint {
  x: number;
  y: number;
}

/** Field radius drawn on the bowl / printout (30-2 extent). */
export const FIELD_RADIUS = 30;

/** Physiological blind spot: centre 15° temporal, 1.5° below; ~5.5° wide x 7.5° tall. */
export const BLIND_SPOT = { t: 15, y: -1.5, rx: 2.75, ry: 3.75 } as const;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Smooth 0→1 ramp between a and b. */
export function smooth(v: number, a: number, b: number): number {
  const u = clamp01((v - a) / (b - a));
  return u * u * (3 - 2 * u);
}

/** Temporal coordinate: positive = temporal field for this eye. */
export function temporalOf(eye: Eye, x: number): number {
  return eye === 'OD' ? x : -x;
}

export const pointKey = (p: FieldPoint) => `${p.x},${p.y}`;

const OFFSETS = [-27, -21, -15, -9, -3, 3, 9, 15, 21, 27];

/** Humphrey 30-2: 76 points on a 6° grid offset 3° from the meridians, within 30°. */
export const GRID_30_2: readonly FieldPoint[] = (() => {
  const out: FieldPoint[] = [];
  for (const y of [...OFFSETS].reverse()) {
    for (const x of OFFSETS) {
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      // 30-2 drops the four corners of each quadrant beyond ~30°.
      if (ax === 27 && ay >= 15) continue;
      if (ay === 27 && ax >= 15) continue;
      if (ax === 21 && ay === 21) continue;
      out.push({ x, y });
    }
  }
  return out;
})();

/**
 * Humphrey 24-2 for an eye: the central 54 points of the 30-2, plus the two
 * nasal points at 27° either side of the horizontal meridian (nasal step).
 */
export function grid242(eye: Eye): FieldPoint[] {
  const nasalX = eye === 'OD' ? -27 : 27;
  return GRID_30_2.filter((p) => {
    const ax = Math.abs(p.x);
    const ay = Math.abs(p.y);
    if (ax === 27) return p.x === nasalX && ay === 3;
    if (ay === 27) return false;
    if (ay === 21) return ax <= 9;
    if (ay === 15) return ax <= 15;
    return ax <= 21;
  });
}

/** Nearest 30-2 location to an arbitrary field position (or null if outside the bowl). */
export function snapToGrid(x: number, y: number, maxDist = 4.6): FieldPoint | null {
  let best: FieldPoint | null = null;
  let bd = Infinity;
  for (const p of GRID_30_2) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best && bd <= maxDist ? best : null;
}

/** Depth of the blind spot (physiological or enlarged) at a point. */
export function blindSpotDepth(eye: Eye, x: number, y: number, enlarged = false): number {
  const t = temporalOf(eye, x);
  const sx = enlarged ? 2.4 : 1;
  const sy = enlarged ? 1.9 : 1;
  const e = Math.hypot((t - BLIND_SPOT.t) / (BLIND_SPOT.rx * sx), (y - BLIND_SPOT.y) / (BLIND_SPOT.ry * sy));
  return enlarged ? 1 - smooth(e, 0.8, 1.15) : 1 - smooth(e, 0.85, 1.05);
}

/** Gentle wobble so retinal "curtains" don't look ruler-straight. */
const wobble = (u: number) => 2.2 * Math.sin(u * 0.13 + 1.1) + 0.8 * Math.sin(u * 0.31 + 0.4);

/** Arcuate (Bjerrum) nerve-fibre-bundle band in one hemifield. sign = +1 superior, -1 inferior. */
function arcuate(t: number, y: number, sign: 1 | -1): number {
  const yy = y * sign;
  const r = Math.hypot(t, y);
  const inner = 8.5;
  const outer = 20 + 8 * smooth(-t, 0, 15); // fans out nasally to the periphery
  const band = smooth(r, inner - 1, inner + 1.5) * (1 - smooth(r, outer - 1.5, outer + 1));
  // Respects the horizontal meridian (sharp), arches from the blind spot, never temporal to it.
  return 0.96 * band * smooth(yy, 0, 1.4) * (1 - smooth(t, 15, 19));
}

/**
 * Depth of the pathological defect (0..1) at (x, y) for this eye, NOT including the
 * physiological blind spot. Laterality: temporal/nasal are relative to the eye;
 * left/right are absolute (the patient's left/right).
 */
export function defectDepth(defect: FieldDefect, eye: Eye, x: number, y: number): number {
  const t = temporalOf(eye, x);
  const r = Math.hypot(x, y);
  switch (defect) {
    case 'full':
      return 0;
    case 'constricted':
      return 0.97 * smooth(r, 10, 16);
    case 'central-scotoma':
      return 0.95 * (1 - smooth(r, 6, 10));
    case 'cecocentral-scotoma': {
      const e = Math.hypot((t - 7.5) / 13, (y + 1) / 7);
      return 0.95 * (1 - smooth(e, 0.75, 1.1));
    }
    case 'enlarged-blind-spot':
      return Math.max(0, blindSpotDepth(eye, x, y, true) - blindSpotDepth(eye, x, y));
    case 'superior-arcuate':
      return arcuate(t, y, 1);
    case 'inferior-arcuate':
      return arcuate(t, y, -1);
    case 'nasal-step':
      // Superior nasal step: a relative step above the nasal horizontal meridian.
      return 0.5 * smooth(-t, 12, 17) * smooth(y, 0, 1.2) * (1 - smooth(y, 9, 13));
    case 'superior-altitudinal':
      return 0.96 * smooth(y, 0, 1.5);
    case 'inferior-altitudinal':
      return 0.96 * smooth(-y, 0, 1.5);
    case 'temporal-hemianopia':
      return 0.98 * smooth(t, 0, 1.2);
    case 'nasal-hemianopia':
      return 0.98 * smooth(-t, 0, 1.2);
    case 'left-hemianopia':
      return 0.98 * smooth(-x, 0, 1.2);
    case 'right-hemianopia':
      return 0.98 * smooth(x, 0, 1.2);
    case 'left-superior-quadrantanopia':
      return 0.97 * smooth(-x, 0, 1.2) * smooth(y, 0, 1.2);
    case 'right-superior-quadrantanopia':
      return 0.97 * smooth(x, 0, 1.2) * smooth(y, 0, 1.2);
    case 'left-inferior-quadrantanopia':
      return 0.97 * smooth(-x, 0, 1.2) * smooth(-y, 0, 1.2);
    case 'right-inferior-quadrantanopia':
      return 0.97 * smooth(x, 0, 1.2) * smooth(-y, 0, 1.2);
    case 'curtain-superior':
      return 0.97 * smooth(y - (8 + wobble(x)), -1.5, 1.5);
    case 'curtain-inferior':
      return 0.97 * smooth(-y - (8 + wobble(x)), -1.5, 1.5);
    case 'curtain-temporal':
      return 0.97 * smooth(t - (10 + wobble(y)), -1.5, 1.5);
    case 'curtain-nasal':
      return 0.97 * smooth(-t - (10 + wobble(y)), -1.5, 1.5);
    case 'temporal-island': {
      const island = smooth(t, 16, 20) * (1 - smooth(Math.abs(y), 16, 22));
      return 0.98 * (1 - island);
    }
    default:
      return 0;
  }
}

/** Total loss at a point: pathology combined with the blind spot. */
export function lossAt(defect: FieldDefect, eye: Eye, x: number, y: number): number {
  return Math.max(defectDepth(defect, eye, x, y), blindSpotDepth(eye, x, y));
}

/**
 * Age-normal threshold sensitivity (dB) for a Goldmann III white stimulus: the
 * "hill of vision" — ~33 dB near fixation, falling ~0.27 dB/degree, slightly lower
 * superiorly (lid/brow), and ~0.07 dB/year after 20.
 */
export function normalSensitivity(x: number, y: number, age: number): number {
  const r = Math.hypot(x, y);
  const ageLoss = Math.max(0, age - 20) * 0.07;
  return 33.5 - 0.27 * r - 0.04 * Math.max(0, y) - ageLoss;
}

/** True threshold (dB) at a point; values ≤ 0 mean not seen even at the brightest stimulus. */
export function trueThreshold(defect: FieldDefect, eye: Eye, x: number, y: number, age: number): number {
  const n = normalSensitivity(x, y, age);
  const d = lossAt(defect, eye, x, y);
  return n * (1 - d) - (d > 0.9 ? 4 : 0);
}
