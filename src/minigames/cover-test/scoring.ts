/** How well the player examined and measured. Pure. */
import { baseMatches, type CoverStats, type Dir, type Kind, type Prism, type Truth } from './model';

export interface Call {
  kind: Kind;
  dir: Dir;
  eye?: 'OD' | 'OS' | 'alternating';
  prism: Prism | null;
}

export interface CallScore {
  kindOk: boolean;
  dirOk: boolean;
  eyeOk: boolean;
  prismErr: number;
  baseOk: boolean;
  score: number;
  perfect: boolean;
}

/** Phoria vs ortho and tropia vs intermittent are the clinically close confusions. */
function kindCredit(t: Kind, p: Kind): number {
  if (t === p) return 1;
  const near = (a: Kind, b: Kind) => (a === 'phoria' && b === 'ortho') || (a === 'tropia' && b === 'intermittent') || (a === 'intermittent' && b === 'phoria');
  return near(t, p) || near(p, t) ? 0.4 : 0;
}

export function prismCredit(err: number): number {
  const e = Math.abs(err);
  if (e <= 2) return 1;
  return Math.max(0, 1 - (e - 2) / 8);
}

export function scoreCall(truth: Truth, call: Call | null): CallScore {
  if (!call) return { kindOk: false, dirOk: false, eyeOk: false, prismErr: truth.mag, baseOk: false, score: 0, perfect: false };
  const kc = kindCredit(truth.kind, call.kind);
  const kindOk = truth.kind === call.kind;
  const dirOk = truth.dir === call.dir;
  const needsEye = truth.kind === 'tropia' || truth.kind === 'intermittent';
  const eyeOk = needsEye ? call.eye === truth.eye : true;
  const prismMag = call.prism?.mag ?? 0;
  const prismErr = prismMag - truth.mag;
  const baseOk = truth.kind === 'ortho' ? prismMag === 0 : !!call.prism && baseMatches(truth.dir, call.prism);
  const pr = truth.kind === 'ortho' ? (prismMag <= 1 ? 1 : 0) : baseOk ? prismCredit(prismErr) : 0;
  const score = 0.3 * kc + 0.2 * (dirOk ? 1 : 0) + 0.15 * (eyeOk ? 1 : 0) + 0.35 * pr;
  return { kindOk, dirOk, eyeOk, prismErr, baseOk, score, perfect: kindOk && dirOk && eyeOk && baseOk && Math.abs(prismErr) <= 1 };
}

/** Technique: both eyes covered and uncovered, alternate cover performed, prism used and neutralised. */
export function techniqueScore(s: CoverStats | null, truth: Truth): number {
  if (!s) return 0;
  const covers = (s.held.OD ? 0.2 : 0) + (s.held.OS ? 0.2 : 0);
  const unc = s.uncovered.OD || s.uncovered.OS ? 0.2 : 0;
  const alt = s.alt >= 2 ? 0.2 : s.alt === 1 ? 0.1 : 0;
  const prism = truth.kind === 'ortho' ? 0.2 : s.neutralised ? (s.overshot ? 0.2 : 0.15) : s.prismUsed ? 0.08 : 0;
  return Math.min(1, covers + unc + alt + prism);
}

export interface TotalScore { accuracy: number; perfect: boolean }

export function totalScore(truths: Truth[], calls: (Call | null)[], stats: (CoverStats | null)[]): TotalScore {
  let call = 0;
  let tech = 0;
  let tested = 0;
  let perfect = true;
  for (let i = 0; i < truths.length; i++) {
    if (!calls[i]) continue;
    tested++;
    const cs = scoreCall(truths[i]!, calls[i] ?? null);
    call += cs.score;
    tech += techniqueScore(stats[i] ?? null, truths[i]!);
    if (!cs.perfect) perfect = false;
  }
  if (tested === 0) return { accuracy: 0, perfect: false };
  // an untested distance/near costs a quarter of the score, not half
  const coverage = tested / truths.length;
  const raw = 0.82 * (call / tested) + 0.18 * (tech / tested);
  const accuracy = Math.max(0, Math.min(1, raw * (0.75 + 0.25 * coverage)));
  return { accuracy, perfect: perfect && coverage === 1 && accuracy >= 0.95 };
}
