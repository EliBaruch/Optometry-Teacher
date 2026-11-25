/**
 * How well the player performed keratometry. Pure.
 * Gold standard (research notes): |ΔK| ≤ 0.12 D and axis within 5°. The axis
 * is only meaningful when there is enough cylinder to define it, and irregular
 * corneas cannot be fused exactly, so tolerances widen accordingly.
 */
import { EYES, type Eye, type Keratometry, type PerEye } from '@core';
import { axisDiff, clamp01, FOCUS, MIRE_GRADES, normalizeK, readingOf, type Instrument, type KReading, type MireGrade } from './optics';

export interface EyeReading {
  ins: Instrument;
  focusErr: number;
  mires: MireGrade;
}

export interface EyeAssessment {
  eye: Eye;
  reading: KReading;
  truth: Keratometry;
  kErr: number;
  /** null when the cornea is too spherical for an axis to mean anything */
  axisErr: number | null;
  axisTol: number | null;
  focusOk: boolean;
  miresOk: boolean;
  score: number;
  perfect: boolean;
}

export interface Assessment {
  eyes: Partial<Record<Eye, EyeAssessment>>;
  accuracy: number;
  perfect: boolean;
}

export const K_TOL = 0.125;

export function axisTolerance(cyl: number): number | null {
  if (cyl >= 1) return 5;
  if (cyl >= 0.5) return 10;
  if (cyl >= 0.25) return 20;
  return null;
}

export function kTolerance(mires: MireGrade): number {
  return mires === 'regular' ? K_TOL : mires === 'irregular' ? 0.375 : 0.75;
}

export function assessEye(eye: Eye, truthRaw: Keratometry, r: EyeReading): EyeAssessment {
  const truth = normalizeK(truthRaw);
  const reading = readingOf(r.ins);
  const kErr = Math.max(Math.abs(reading.k1 - truth.k1), Math.abs(reading.k2 - truth.k2));
  const kTol = kTolerance(truth.mires);
  const axisTol = axisTolerance(truth.k2 - truth.k1);
  const axisErr = axisTol === null ? null : axisDiff(reading.axisK1, truth.axisK1);
  const focusOk = Math.abs(r.focusErr) <= FOCUS.tolerance + 1e-9;
  const miresOk = r.mires === truth.mires;
  const kScore = clamp01(1 - Math.max(0, kErr - kTol) / 1);
  const axisScore = axisErr === null || axisTol === null ? 1 : clamp01(1 - Math.max(0, axisErr - axisTol) / 25);
  const focusScore = focusOk ? 1 : clamp01(1 - (Math.abs(r.focusErr) - FOCUS.tolerance) / 0.6);
  const gap = Math.abs(MIRE_GRADES.indexOf(r.mires) - MIRE_GRADES.indexOf(truth.mires));
  const miresScore = gap === 0 ? 1 : gap === 1 ? 0.4 : 0;
  const score = 0.45 * kScore + 0.25 * axisScore + 0.1 * focusScore + 0.2 * miresScore;
  const perfect = kErr <= kTol + 1e-9 && (axisErr === null || axisErr <= (axisTol ?? 0)) && focusOk && miresOk;
  return { eye, reading, truth, kErr, axisErr, axisTol, focusOk, miresOk, score, perfect };
}

/** Par time for both eyes; slower play trims at most 15 %. */
export const PAR_MS = 150_000;
export function timeFactor(ms: number): number {
  if (ms <= PAR_MS) return 1;
  return 1 - 0.15 * clamp01((ms - PAR_MS) / (2 * PAR_MS));
}

export function assess(truth: PerEye<Keratometry>, readings: Partial<Record<Eye, EyeReading>>, timeMs: number): Assessment {
  const eyes: Partial<Record<Eye, EyeAssessment>> = {};
  let sum = 0;
  let allPerfect = true;
  for (const e of EYES) {
    const r = readings[e];
    if (!r) {
      allPerfect = false;
      continue;
    }
    const a = assessEye(e, truth[e], r);
    eyes[e] = a;
    sum += a.score;
    if (!a.perfect) allPerfect = false;
  }
  const accuracy = Math.round(clamp01((sum / EYES.length) * timeFactor(timeMs)) * 1000) / 1000;
  return { eyes, accuracy, perfect: allPerfect && timeMs <= 2 * PAR_MS };
}
