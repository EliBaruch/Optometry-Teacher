import type { ScoreBreakdown } from '@core';

/** Test fixture: a correct, A-grade ScoreBreakdown with overrides. */
export function score(p: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    total: 1100, max: 1300, grade: 'A', perfect: false, diagnosisCorrect: true, urgencyCorrect: true,
    correctDiagnosisId: 'poag', chosenDiagnosisId: 'poag', parts: [], essentialMissed: [], unnecessaryTests: [],
    keyQuestionsAsked: 2, keyQuestionsTotal: 3, skillAvg: 0.8, elapsedSec: 100, parSec: 120, ...p,
  };
}
