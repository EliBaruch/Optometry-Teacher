import type { DiagnosisId, GameServices, Grade, Signal, TestId } from '@core';
import type { XpLine } from './xp';

export const SLOT = 'sys:ranks';
export const SLOT_VERSION = 1;

export interface DxRecord {
  /** Times this diagnosis was the answer to a completed case. */
  seen: number;
  correct: number;
  /** Times it was the answer and the player missed it. */
  missed: number;
  perfect: number;
  best: Grade | null;
  /** Highest mastery stars ever shown — current < best means "fading, due for review". */
  bestStars: number;
}

export interface TestRecord {
  done: number;
  perfect: number;
}

export interface LastGain {
  caseId: string;
  fromXp: number;
  toXp: number;
  lines: XpLine[];
  at: number;
}

export interface RanksState {
  xp: number;
  cases: number;
  correct: number;
  perfect: number;
  sGrades: number;
  urgencyCorrect: number;
  correctStreak: number;
  bestCorrectStreak: number;
  perfectStreak: number;
  bestPerfectStreak: number;
  /** Correct diagnoses of something previously missed. */
  comebacks: number;
  /** All key history questions asked. */
  fullHistory: number;
  /** Correct, no essential test missed, no unnecessary test. */
  lean: number;
  /** S grade inside par time. */
  swift: number;
  certainCorrect: number;
  reviewCorrect: number;
  rareCorrect: number;
  /** Perfect ophthalmoscopy on a fundus with lesions. */
  eagleEye: number;
  /** Clean swinging-flashlight test on a patient with an RAPD. */
  rapdCaught: number;
  practice: number;
  dx: Record<DiagnosisId, DxRecord>;
  /** Diagnoses both diagnosed and triaged correctly at least once. */
  triaged: DiagnosisId[];
  tests: Partial<Record<TestId, TestRecord>>;
  /** Runs finished per mode id (with at least one patient seen). */
  runs: Record<string, number>;
  /** Achievement id -> unlock time (ms). */
  achievements: Record<string, number>;
  /** Unlocked but not yet viewed on the trophy wall. */
  unseen: string[];
  lastGain: LastGain | null;
}

export const initialState = (): RanksState => ({
  xp: 0, cases: 0, correct: 0, perfect: 0, sGrades: 0, urgencyCorrect: 0,
  correctStreak: 0, bestCorrectStreak: 0, perfectStreak: 0, bestPerfectStreak: 0,
  comebacks: 0, fullHistory: 0, lean: 0, swift: 0, certainCorrect: 0, reviewCorrect: 0, rareCorrect: 0,
  eagleEye: 0, rapdCaught: 0, practice: 0,
  dx: {}, triaged: [], tests: {}, runs: {}, achievements: {}, unseen: [], lastGain: null,
});

export const emptyDx = (): DxRecord => ({ seen: 0, correct: 0, missed: 0, perfect: 0, best: null, bestStars: 0 });

const GRADE_ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D', 'F'];
/** The better of two grades (null = none yet). */
export function betterGrade(a: Grade | null, b: Grade | null): Grade | null {
  if (!a) return b;
  if (!b) return a;
  return GRADE_ORDER.indexOf(a) <= GRADE_ORDER.indexOf(b) ? a : b;
}

/** The persisted Career slice (same signal for every caller on these services). */
export function ranksSlot(services: GameServices): Signal<RanksState> {
  return services.save.slot<RanksState>(SLOT, initialState(), { version: SLOT_VERSION });
}
