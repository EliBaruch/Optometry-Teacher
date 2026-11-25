/** Accuracy scoring for both instruments. Pure. */
import { GAZE_IDS, EYES, type Grid } from './model';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Value of one graded cell: exact 1, one grade off 0.6, two off 0.25. */
export const cellScore = (mine: number, truth: number) => [1, 0.6, 0.25][Math.abs(mine - truth)] ?? 0;

/** Weighted grading accuracy. Truly abnormal cells weigh x4 so "all zeros" cannot win an abnormal case. */
export function gradingScore(mine: Grid, truth: Grid): number {
  let num = 0, den = 0;
  for (const e of EYES) for (const g of GAZE_IDS) {
    const w = truth[e][g] !== 0 || mine[e][g] !== 0 ? 4 : 1;
    num += w * cellScore(mine[e][g], truth[e][g]);
    den += w;
  }
  return den ? num / den : 1;
}

/** Share (0..1) of truly abnormal cells the player graded as normal (a missed deficit). */
export function missedDeficitShare(mine: Grid, truth: Grid): number {
  let abnormal = 0, missed = 0;
  for (const e of EYES) for (const g of GAZE_IDS) {
    if (truth[e][g] === 0) continue;
    abnormal++;
    if (mine[e][g] === 0) missed++;
  }
  return abnormal ? missed / abnormal : 0;
}

export interface MotilityScoreIn { grading: number; visited: number; seconds: number; missedShare?: number }
/**
 * Technique: grading 70%, completeness of the 9-position sweep 25%, a light pace term 5%.
 * Missing a real deficit is clinically the worst error, so it caps technique: missing every
 * abnormal cell caps at 50%, missing half caps at 75%.
 */
export function motilityAccuracy(s: MotilityScoreIn): number {
  const completeness = clamp01(s.visited / 9);
  const pace = clamp01(1 - Math.max(0, s.seconds - 60) / 120);
  const raw = clamp01(0.7 * s.grading + 0.25 * completeness + 0.05 * pace);
  const cap = 1 - 0.5 * clamp01(s.missedShare ?? 0);
  return Math.min(raw, cap);
}

/** 1 at zero error, 0 at twice the tolerance. */
export const toleranceScore = (err: number, tol: number) => clamp01(1 - Math.abs(err) / (2 * tol));

export interface ConvScoreIn {
  breakErr: number | null; recoveryErr: number | null; breakCm: number; recoveryCm: number;
  ampErrD: (number | null)[]; fastShare: number; trials: number;
}
export function convergenceAccuracy(s: ConvScoreIn): number {
  const tolB = Math.max(1, 0.2 * s.breakCm), tolR = Math.max(1.2, 0.2 * s.recoveryCm);
  const b = s.breakErr == null ? 0 : toleranceScore(s.breakErr, tolB);
  const r = s.recoveryErr == null ? 0 : toleranceScore(s.recoveryErr, tolR);
  const amp = s.ampErrD.length ? s.ampErrD.reduce<number>((a, e) => a + (e == null ? 0 : toleranceScore(e, 1.25)), 0) / s.ampErrD.length : 0;
  const pace = clamp01(1 - 2 * s.fastShare);
  const retry = clamp01(1 - 0.15 * Math.max(0, s.trials - 1));
  return clamp01((0.38 * b + 0.2 * r + 0.3 * amp + 0.12 * pace) * (0.85 + 0.15 * retry));
}
