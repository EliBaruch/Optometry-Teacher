import type { ClinicalCase, DiagnosisId, Urgency } from './case';
import { URGENCIES } from './case';
import type { MiniGameResult, TestId } from './minigame';

export interface ScoreInput {
  kase: ClinicalCase;
  diagnosisId: DiagnosisId;
  urgency: Urgency;
  testsDone: Partial<Record<TestId, MiniGameResult>>;
  askedQuestions: string[];
  elapsedSec: number;
  hintsUsed: number;
}

export interface ScorePart {
  id: 'diagnosis' | 'urgency' | 'workup' | 'efficiency' | 'history' | 'skill' | 'speed';
  label: string;
  points: number;
  max: number;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreBreakdown {
  total: number;
  max: number;
  grade: Grade;
  perfect: boolean;
  diagnosisCorrect: boolean;
  urgencyCorrect: boolean;
  correctDiagnosisId: DiagnosisId;
  chosenDiagnosisId: DiagnosisId;
  parts: ScorePart[];
  essentialMissed: TestId[];
  unnecessaryTests: TestId[];
  keyQuestionsAsked: number;
  keyQuestionsTotal: number;
  skillAvg: number;
  elapsedSec: number;
  parSec: number;
}

/** Par time grows with difficulty; emergencies use their own clock. */
export function parTimeSec(kase: ClinicalCase): number {
  return kase.emergency?.timeLimitSec ? Math.round(kase.emergency.timeLimitSec * 0.6) : 60 + kase.difficulty * 30;
}

export function gradeFor(ratio: number, diagnosisCorrect: boolean): Grade {
  if (!diagnosisCorrect) return ratio >= 0.35 ? 'D' : 'F';
  if (ratio >= 0.93) return 'S';
  if (ratio >= 0.8) return 'A';
  if (ratio >= 0.65) return 'B';
  if (ratio >= 0.5) return 'C';
  return 'D';
}

/** Pure scoring function — the single source of truth for case grading. */
export function scoreCase(input: ScoreInput): ScoreBreakdown {
  const { kase } = input;
  const done = Object.keys(input.testsDone) as TestId[];
  const diagnosisCorrect = input.diagnosisId === kase.diagnosis;
  const uDist = Math.abs(URGENCIES.indexOf(input.urgency) - URGENCIES.indexOf(kase.urgency));
  const urgencyCorrect = uDist === 0;

  const essentialMissed = kase.essentialTests.filter((t) => !done.includes(t));
  const relevant = new Set<TestId>([...kase.essentialTests, ...kase.helpfulTests]);
  const unnecessaryTests = done.filter((t) => !relevant.has(t));

  const keyQs = kase.history.filter((h) => h.relevance === 'key');
  const keyAsked = keyQs.filter((h) => input.askedQuestions.includes(h.id)).length;

  const results = Object.values(input.testsDone).filter(Boolean) as MiniGameResult[];
  const skillAvg = results.length ? results.reduce((s, r) => s + (r.autoRun ? r.accuracy * 0.5 : r.accuracy), 0) / results.length : 0;

  const par = parTimeSec(kase);
  const speedRatio = Math.max(0, Math.min(1, (par * 2 - input.elapsedSec) / par));

  const parts: ScorePart[] = [
    { id: 'diagnosis', label: 'Diagnosis', points: diagnosisCorrect ? 500 : 0, max: 500 },
    { id: 'urgency', label: 'Triage urgency', points: uDist === 0 ? 200 : uDist === 1 ? 80 : 0, max: 200 },
    {
      id: 'workup',
      label: 'Essential work-up',
      points: kase.essentialTests.length ? Math.round(150 * (1 - essentialMissed.length / kase.essentialTests.length)) : 150,
      max: 150,
    },
    { id: 'efficiency', label: 'Efficiency', points: Math.max(0, 100 - unnecessaryTests.length * 25 - input.hintsUsed * 20), max: 100 },
    { id: 'history', label: 'History taking', points: keyQs.length ? Math.round((100 * keyAsked) / keyQs.length) : 100, max: 100 },
    { id: 'skill', label: 'Test technique', points: Math.round(150 * skillAvg), max: 150 },
    { id: 'speed', label: 'Speed', points: diagnosisCorrect ? Math.round(100 * speedRatio) : 0, max: 100 },
  ];
  const total = parts.reduce((s, p) => s + p.points, 0);
  const max = parts.reduce((s, p) => s + p.max, 0);
  const grade = gradeFor(total / max, diagnosisCorrect);
  return {
    total,
    max,
    grade,
    perfect: diagnosisCorrect && urgencyCorrect && essentialMissed.length === 0 && unnecessaryTests.length === 0 && grade === 'S',
    diagnosisCorrect,
    urgencyCorrect,
    correctDiagnosisId: kase.diagnosis,
    chosenDiagnosisId: input.diagnosisId,
    parts,
    essentialMissed,
    unnecessaryTests,
    keyQuestionsAsked: keyAsked,
    keyQuestionsTotal: keyQs.length,
    skillAvg,
    elapsedSec: input.elapsedSec,
    parSec: par,
  };
}

/** SM-2 style quality from a case outcome, for the learning module. */
export function learningQuality(s: ScoreBreakdown): number {
  if (!s.diagnosisCorrect) return s.grade === 'D' ? 1 : 0;
  if (s.grade === 'S') return 5;
  if (s.grade === 'A') return 4;
  return 3;
}
