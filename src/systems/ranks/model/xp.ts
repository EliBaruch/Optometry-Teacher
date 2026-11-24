import type { Grade, ScoreBreakdown } from '@core';

/**
 * Case XP. Every line rewards *learning quality* — correctness, a complete and
 * parsimonious work-up, correct triage, calibrated confidence, spaced review —
 * never time spent. A missed diagnosis still earns a small "lesson" share of
 * what the work-up was worth (no punitive loss), but far less than a correct one.
 */
export interface CaseXpContext {
  /** Case difficulty 1..5 (harder cases = desirable difficulty = more XP). */
  difficulty: number;
  /** Emergency case (timer, or emergency urgency). */
  emergency: boolean;
  /** First time this diagnosis has ever been made correctly. */
  firstCorrect: boolean;
  /** Played in the spaced-repetition mode (Second Opinion). */
  review: boolean;
  confidence?: 'guessing' | 'fairly-sure' | 'certain';
}

export type XpLineId = 'performance' | 'grade' | 'difficulty' | 'first' | 'perfect' | 'triage' | 'calibrated' | 'review' | 'lesson' | 'bonus';

export interface XpLine {
  id: XpLineId;
  label: string;
  xp: number;
}

export interface CaseXp {
  total: number;
  lines: XpLine[];
}

export const BASE_XP = 120;
export const GRADE_BONUS: Record<Grade, number> = { S: 40, A: 20, B: 10, C: 0, D: 0, F: 0 };
export const FIRST_CORRECT_BONUS = 50;
export const PERFECT_BONUS = 50;
export const TRIAGE_BONUS = 30;
export const CALIBRATED_BONUS = 15;
export const REVIEW_RATE = 0.25;
/** A missed diagnosis keeps this share of its work-up XP ("lesson logged"). */
export const MISS_RATE = 0.35;
export const MIN_CASE_XP = 10;

export function difficultyMultiplier(difficulty: number): number {
  const d = Math.max(1, Math.min(5, Math.round(difficulty || 1)));
  return 0.85 + 0.15 * d;
}

export function xpForCase(score: ScoreBreakdown, ctx: CaseXpContext): CaseXp {
  const ratio = score.max > 0 ? Math.max(0, Math.min(1, score.total / score.max)) : 0;
  const lines: XpLine[] = [];
  const push = (id: XpLineId, label: string, xp: number) => {
    const v = Math.round(xp);
    if (v !== 0) lines.push({ id, label, xp: v });
  };
  const sum = () => lines.reduce((s, l) => s + l.xp, 0);

  if (!score.diagnosisCorrect) {
    const lesson = Math.max(MIN_CASE_XP, BASE_XP * ratio * MISS_RATE * difficultyMultiplier(ctx.difficulty));
    push('lesson', 'Lesson logged', lesson);
    return { total: sum(), lines };
  }

  push('performance', 'Case performance', BASE_XP * ratio);
  push('grade', `${score.grade} grade`, GRADE_BONUS[score.grade]);
  const mult = difficultyMultiplier(ctx.difficulty);
  if (mult !== 1) push('difficulty', `Difficulty ×${mult.toFixed(2).replace(/0$/, '')}`, sum() * (mult - 1));
  if (ctx.firstCorrect) push('first', 'New diagnosis', FIRST_CORRECT_BONUS);
  if (score.perfect) push('perfect', 'Perfect work-up', PERFECT_BONUS);
  if (ctx.emergency && score.urgencyCorrect) push('triage', 'Emergency triaged', TRIAGE_BONUS);
  if (ctx.confidence === 'certain') push('calibrated', 'Called it with confidence', CALIBRATED_BONUS);
  if (ctx.review) push('review', 'Spaced review', sum() * REVIEW_RATE);

  return { total: Math.max(MIN_CASE_XP, sum()), lines };
}

/** Sanitise an `xp:grant` amount from another module. */
export function clampGrant(amount: unknown): number {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? Math.round(amount) : 0;
  return Math.max(0, Math.min(1000, n));
}
