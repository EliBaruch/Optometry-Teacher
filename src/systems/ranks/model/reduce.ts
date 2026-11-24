import type { DiagnosisId, MiniGameResult, PatientFindings, ScoreBreakdown, TestId } from '@core';
import { betterGrade, emptyDx, type RanksState } from './state';
import { xpForCase, type CaseXp } from './xp';

/** Everything the Career needs to know about a finished case. */
export interface CaseInput {
  caseId: string;
  modeId: string;
  score: ScoreBreakdown;
  difficulty: number;
  emergency: boolean;
  rare: boolean;
  confidence?: 'guessing' | 'fairly-sure' | 'certain';
  now: number;
}

export const REVIEW_MODE = 'review';

/** Pure: fold a completed case into the Career state. */
export function applyCase(s: RanksState, c: CaseInput): { next: RanksState; gain: CaseXp } {
  const { score } = c;
  const ok = score.diagnosisCorrect;
  const dxId = score.correctDiagnosisId;
  const rec = s.dx[dxId] ?? emptyDx();
  const firstCorrect = ok && rec.correct === 0;
  const comeback = ok && rec.correct === 0 && rec.missed > 0;
  const gain = xpForCase(score, {
    difficulty: c.difficulty,
    emergency: c.emergency,
    firstCorrect,
    review: c.modeId === REVIEW_MODE,
    confidence: c.confidence,
  });

  const correctStreak = ok ? s.correctStreak + 1 : 0;
  const perfectStreak = score.perfect ? s.perfectStreak + 1 : 0;
  const triaged = ok && score.urgencyCorrect && !s.triaged.includes(dxId) ? [...s.triaged, dxId] : s.triaged;
  const inc = (b: boolean) => (b ? 1 : 0);

  const next: RanksState = {
    ...s,
    xp: s.xp + gain.total,
    cases: s.cases + 1,
    correct: s.correct + inc(ok),
    perfect: s.perfect + inc(score.perfect),
    sGrades: s.sGrades + inc(ok && score.grade === 'S'),
    urgencyCorrect: s.urgencyCorrect + inc(score.urgencyCorrect),
    correctStreak,
    bestCorrectStreak: Math.max(s.bestCorrectStreak, correctStreak),
    perfectStreak,
    bestPerfectStreak: Math.max(s.bestPerfectStreak, perfectStreak),
    comebacks: s.comebacks + inc(comeback),
    fullHistory: s.fullHistory + inc(score.keyQuestionsTotal > 0 && score.keyQuestionsAsked >= score.keyQuestionsTotal),
    lean: s.lean + inc(ok && score.essentialMissed.length === 0 && score.unnecessaryTests.length === 0),
    swift: s.swift + inc(ok && score.grade === 'S' && score.elapsedSec <= score.parSec),
    certainCorrect: s.certainCorrect + inc(ok && c.confidence === 'certain'),
    reviewCorrect: s.reviewCorrect + inc(ok && c.modeId === REVIEW_MODE),
    rareCorrect: s.rareCorrect + inc(ok && c.rare),
    triaged,
    dx: {
      ...s.dx,
      [dxId]: {
        ...rec,
        seen: rec.seen + 1,
        correct: rec.correct + inc(ok),
        missed: rec.missed + inc(!ok),
        perfect: rec.perfect + inc(score.perfect),
        best: ok ? betterGrade(rec.best, score.grade) : rec.best,
      },
    },
    lastGain: { caseId: c.caseId, fromXp: s.xp, toXp: s.xp + gain.total, lines: gain.lines, at: c.now },
  };
  return { next, gain };
}

/** A timed-out case breaks the streaks (no XP is ever taken away). */
export function applyFailure(s: RanksState): RanksState {
  if (!s.correctStreak && !s.perfectStreak) return s;
  return { ...s, correctStreak: 0, perfectStreak: 0 };
}

/** Did a fundus exam have anything to find? */
export function fundusHasLesions(f: PatientFindings | undefined): boolean {
  if (!f?.posterior) return false;
  return (['OD', 'OS'] as const).some((e) => {
    const p = f.posterior[e];
    return !!p && ((p.lesions?.length ?? 0) > 0 || !!p.detachment);
  });
}

export function hasRapd(f: PatientFindings | undefined): boolean {
  return !!f?.pupils && f.pupils.rapd !== 'none';
}

/** A test counts as flawless when the mini-game says so (or ≥ 95% accuracy). */
export function isFlawless(r: MiniGameResult): boolean {
  return !r.autoRun && (r.perfect === true || r.accuracy >= 0.95);
}

/** Pure: record a test the player performed (case or practice). Auto-run by the tech doesn't count. */
export function applyTest(
  s: RanksState,
  r: MiniGameResult,
  opts: { practice: boolean; findings?: PatientFindings },
): RanksState {
  if (r.autoRun) return s;
  const id: TestId = r.testId;
  const flawless = isFlawless(r);
  const prev = s.tests[id] ?? { done: 0, perfect: 0 };
  const caseFindings = opts.practice ? undefined : opts.findings;
  return {
    ...s,
    practice: s.practice + (opts.practice ? 1 : 0),
    tests: { ...s.tests, [id]: { done: prev.done + 1, perfect: prev.perfect + (flawless ? 1 : 0) } },
    eagleEye: s.eagleEye + (flawless && id === 'ophthalmoscopy' && fundusHasLesions(caseFindings) ? 1 : 0),
    rapdCaught: s.rapdCaught + (flawless && id === 'pupils' && hasRapd(caseFindings) ? 1 : 0),
  };
}

export function applyRunEnded(s: RanksState, modeId: string, casesSeen: number): RanksState {
  if (casesSeen <= 0) return s;
  return { ...s, runs: { ...s.runs, [modeId]: (s.runs[modeId] ?? 0) + 1 } };
}

/** Pure: XP from another module (`xp:grant`). Appends to the last case's gain if it is still on screen. */
export function applyGrant(s: RanksState, amount: number, reason: string, activeCaseId: string | null): RanksState {
  if (amount <= 0) return s;
  const xp = s.xp + amount;
  const lg = s.lastGain;
  const lastGain =
    lg && activeCaseId && lg.caseId === activeCaseId
      ? { ...lg, toXp: lg.toXp + amount, lines: [...lg.lines, { id: 'bonus' as const, label: reason || 'Bonus', xp: amount }] }
      : lg;
  return { ...s, xp, lastGain };
}

export function setBestStars(s: RanksState, id: DiagnosisId, stars: number): RanksState {
  const rec = s.dx[id];
  if (!rec || stars <= rec.bestStars) return s;
  return { ...s, dx: { ...s.dx, [id]: { ...rec, bestStars: stars } } };
}
