import type { Eye } from '@core';
import { ANATOMY, type EyeState } from './types';

/** +1 when the nasal side of this eye is on the viewer's right (OD seen face-to-face). */
export const nasalSign = (eye: Eye): 1 | -1 => (eye === 'OD' ? 1 : -1);

export interface EyeGeometry {
  pxmm: number;
  cx: number;
  cy: number;
  /** Centre of the cornea/iris on screen (moves with gaze). */
  ix: number;
  iy: number;
  /** Iris radius (px) and per-axis foreshortening from rotation. */
  irisR: number;
  foreX: number;
  foreY: number;
  pupilR: number;
  /** Hirschberg reflex absolute position (px) or null. */
  reflex: { x: number; y: number } | null;
  /** Globe displacement (px) for things fixed on the globe (conjunctival vessels). */
  globeDx: number;
  globeDy: number;
  nasal: 1 | -1;
  /** Fissure polygon (px): upper lid lateral→medial then lower lid medial→lateral. */
  upper: [number, number][];
  lower: [number, number][];
  medialCanthus: [number, number];
  lateralCanthus: [number, number];
}

const deg = Math.PI / 180;

/** Screen-plane rotation sines from a −1..1 gaze. */
export function gazeSines(g: { x: number; y: number }): { sx: number; sy: number } {
  const ax = Math.max(-1, Math.min(1, g.x)) * ANATOMY.maxGazeDeg * deg;
  const ay = Math.max(-1, Math.min(1, g.y)) * ANATOMY.maxGazeDeg * deg;
  return { sx: Math.sin(ax), sy: Math.sin(ay) };
}

/**
 * Hirschberg reflex relative to the pupil centre (mm, image coords) for a light
 * held straight ahead. The reflex sits over the centre of corneal curvature
 * (≈5.7 mm from the centre of rotation) while the pupil swings on a ≈10 mm arm,
 * so a rotation θ decentres the reflex by ≈4.3·sin θ mm (≈22Δ per mm) opposite
 * to the turn, plus a small positive angle kappa (nasal).
 */
export function autoReflexMm(eye: Eye, gaze: { x: number; y: number }): { x: number; y: number } {
  const { sx, sy } = gazeSines(gaze);
  const k = ANATOMY.kappaNasalMm * nasalSign(eye);
  return { x: (ANATOMY.reflexArm - ANATOMY.pupilArm) * sx + k, y: (ANATOMY.reflexArm - ANATOMY.pupilArm) * sy };
}

/** Prism dioptres represented by a reflex decentration (Hirschberg ≈ 22Δ/mm). */
export const HIRSCHBERG_PD_PER_MM = 22;

/** Gaze value (−1..1, image x) that turns an eye by `prism` Δ; + = toward the viewer's right. */
export function prismToGaze(prism: number): number {
  const ang = Math.atan(prism / 100) / deg;
  return ang / ANATOMY.maxGazeDeg;
}

export function eyeGeometry(w: number, h: number, s: EyeState): EyeGeometry {
  const pxmm = Math.min(w / 34, h / 17.5);
  const cx = w / 2;
  const cy = h / 2 + pxmm * 0.2;
  const nasal = nasalSign(s.eye);
  const { sx, sy } = gazeSines(s.gaze);
  const ix = cx + ANATOMY.pupilArm * sx * pxmm;
  const iy = cy + ANATOMY.pupilArm * sy * pxmm;
  const irisR = (ANATOMY.corneaDiameter / 2) * pxmm;
  const foreX = Math.sqrt(1 - sx * sx * 0.55);
  const foreY = Math.sqrt(1 - sy * sy * 0.55);
  const pupilR = (Math.max(1, Math.min(9.5, s.pupilMm)) / 2) * pxmm;
  let reflex: EyeGeometry['reflex'] = null;
  if (s.reflex !== null) {
    const r = s.reflex ?? autoReflexMm(s.eye, s.gaze);
    reflex = { x: ix + r.x * pxmm, y: iy + r.y * pxmm };
  }

  // Lids — mm in eye-centred coordinates, then scaled.
  const a = Math.max(0, Math.min(1.15, s.lidAperture));
  const swell = s.lidSwelling ?? 0;
  const medial: [number, number] = [nasal * 14.2, 0.9];
  const lateral: [number, number] = [-nasal * 15.2, -0.6];
  const lowerPeakY = 5.5 - swell * 0.6;
  const upperPeakY = lowerPeakY - 0.8 - (lowerPeakY - 0.8 - (-4.55 + swell * 0.8)) * a;
  // the upper lid peaks slightly nasal; lower lid lowest point slightly temporal
  const upperPeakX = nasal * 1.6;
  const lowerPeakX = -nasal * 1.4;
  const N = 26;
  const curve = (peakX: number, peakY: number, expo: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const x = lateral[0] + ((medial[0] - lateral[0]) * i) / N;
      const span = (x - peakX) / ((x - peakX) * nasal > 0 ? medial[0] - peakX : peakX - lateral[0]);
      const d = Math.min(1, Math.abs(span));
      const f = Math.pow(1 - d * d, expo);
      const baseY = lateral[1] + ((medial[1] - lateral[1]) * (x - lateral[0])) / (medial[0] - lateral[0]);
      pts.push([x, baseY + (peakY - baseY) * f]);
    }
    return pts;
  };
  const toPx = (p: [number, number]): [number, number] => [cx + p[0] * pxmm, cy + p[1] * pxmm];
  const upper = curve(upperPeakX, upperPeakY, 0.62).map(toPx);
  const lower = curve(lowerPeakX, lowerPeakY, 0.8).map(toPx).reverse();
  return {
    pxmm, cx, cy, ix, iy, irisR, foreX, foreY, pupilR, reflex,
    globeDx: ix - cx, globeDy: iy - cy, nasal,
    upper, lower, medialCanthus: toPx(medial), lateralCanthus: toPx(lateral),
  };
}

/** y of the upper lid margin at screen x (px), by interpolation. */
export function lidYAt(pts: [number, number][], x: number): number {
  let best = pts[0]!;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const lo = Math.min(a[0], b[0]);
    const hi = Math.max(a[0], b[0]);
    if (x >= lo && x <= hi) {
      const t = hi === lo ? 0 : (x - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
    if (Math.abs(a[0] - x) < Math.abs(best[0] - x)) best = a;
  }
  return best[1];
}
