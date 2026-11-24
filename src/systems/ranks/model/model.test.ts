import { describe, expect, it } from 'vitest';
import { LEGEND_LEVEL, LEGEND_TIER_XP, RANKS, levelForXp, levelInfo, roman, titleOf, xpAtLevel, xpToNext } from './ladder';
import { xpForCase, clampGrant, difficultyMultiplier, MIN_CASE_XP } from './xp';
import { starsFor } from './mastery';
import { ACHIEVEMENTS, newlyUnlocked, type AchievementEnv } from './achievements';
import { applyCase, applyFailure, applyGrant, applyTest, fundusHasLesions } from './reduce';
import { betterGrade, emptyDx, initialState } from './state';
import { buildFindings } from '@core';
import { score } from './fixtures';

const ctx = { difficulty: 1, emergency: false, firstCorrect: false, review: false };

describe('ladder', () => {
  it('is monotonic and smooth', () => {
    for (let i = 1; i < LEGEND_LEVEL + 3; i++) {
      expect(xpAtLevel(i)).toBeGreaterThan(xpAtLevel(i - 1));
      if (i < LEGEND_LEVEL) expect(xpToNext(i)).toBeGreaterThanOrEqual(xpToNext(i - 1));
    }
  });
  it('levelForXp inverts xpAtLevel', () => {
    for (let i = 0; i < LEGEND_LEVEL + 5; i++) {
      expect(levelForXp(xpAtLevel(i))).toBe(i);
      if (i > 0) expect(levelForXp(xpAtLevel(i) - 1)).toBe(i - 1);
    }
    expect(levelForXp(-5)).toBe(0);
    expect(levelForXp(NaN)).toBe(0);
  });
  it('titles every rank with tiers and keeps counting legends', () => {
    expect(titleOf(0)).toBe('Student I');
    expect(titleOf(4)).toBe('Intern II');
    expect(titleOf(17)).toBe('Clinic Director III');
    expect(titleOf(LEGEND_LEVEL)).toBe('Living Legend');
    expect(titleOf(LEGEND_LEVEL + 3)).toBe('Living Legend IV');
    expect(RANKS.map((r) => r.title)).toEqual(['Student', 'Intern', 'Resident', 'Associate', 'Senior', 'Clinic Director', 'Living Legend']);
    expect(roman(14)).toBe('XIV');
  });
  it('first promotion comes after a few good cases; Living Legend takes hundreds', () => {
    expect(xpAtLevel(3)).toBeGreaterThan(300);
    expect(xpAtLevel(3)).toBeLessThan(700);
    expect(xpAtLevel(LEGEND_LEVEL)).toBeGreaterThan(25000);
    expect(xpAtLevel(LEGEND_LEVEL + 1) - xpAtLevel(LEGEND_LEVEL)).toBe(LEGEND_TIER_XP);
  });
  it('levelInfo reports progress and the next rank', () => {
    const i = levelInfo(xpAtLevel(4) + 10);
    expect(i.title).toBe('Intern II');
    expect(i.number).toBe(5);
    expect(i.into).toBe(10);
    expect(i.progress).toBeCloseTo(10 / i.span);
    expect(i.nextRank?.title).toBe('Resident');
    expect(i.toNextRank).toBe(xpAtLevel(6) - i.xp);
    expect(levelInfo(xpAtLevel(LEGEND_LEVEL)).nextRank).toBeNull();
  });
});

describe('case XP', () => {
  it('scales with score quality, not time', () => {
    const lo = xpForCase(score({ total: 700, grade: 'C' }), ctx).total;
    const hi = xpForCase(score({ total: 1250, grade: 'S' }), ctx).total;
    expect(hi).toBeGreaterThan(lo);
    expect(xpForCase(score({ elapsedSec: 10 }), ctx).total).toBe(xpForCase(score({ elapsedSec: 900 }), ctx).total);
  });
  it('rewards perfection, first diagnoses, triage, calibration and spaced review', () => {
    const base = xpForCase(score(), ctx).total;
    expect(xpForCase(score({ perfect: true, grade: 'S' }), ctx).total).toBeGreaterThan(base + 50);
    expect(xpForCase(score(), { ...ctx, firstCorrect: true }).total).toBe(base + 50);
    expect(xpForCase(score(), { ...ctx, emergency: true }).total).toBe(base + 30);
    expect(xpForCase(score({ urgencyCorrect: false }), { ...ctx, emergency: true }).total).toBe(base);
    expect(xpForCase(score(), { ...ctx, confidence: 'certain' }).total).toBe(base + 15);
    expect(xpForCase(score(), { ...ctx, review: true }).total).toBeGreaterThan(base);
  });
  it('harder cases are worth more', () => {
    expect(difficultyMultiplier(1)).toBe(1);
    expect(xpForCase(score(), { ...ctx, difficulty: 5 }).total).toBeGreaterThan(xpForCase(score(), ctx).total);
  });
  it('a miss still logs a small lesson, never negative', () => {
    const r = xpForCase(score({ diagnosisCorrect: false, grade: 'D', total: 500 }), { ...ctx, confidence: 'certain', firstCorrect: true });
    expect(r.lines.map((l) => l.id)).toEqual(['lesson']);
    expect(r.total).toBeGreaterThanOrEqual(MIN_CASE_XP);
    expect(r.total).toBeLessThan(xpForCase(score(), ctx).total / 2);
    expect(xpForCase(score({ diagnosisCorrect: false, grade: 'F', total: 0 }), ctx).total).toBe(MIN_CASE_XP);
  });
  it('lines add up to the total', () => {
    const r = xpForCase(score({ perfect: true, grade: 'S', total: 1290 }), { difficulty: 4, emergency: true, firstCorrect: true, review: true, confidence: 'certain' });
    expect(r.lines.reduce((s, l) => s + l.xp, 0)).toBe(r.total);
  });
  it('clamps foreign grants', () => {
    expect(clampGrant(-5)).toBe(0);
    expect(clampGrant(1e9)).toBe(1000);
    expect(clampGrant('x')).toBe(0);
    expect(clampGrant(12.6)).toBe(13);
  });
});

describe('mastery stars', () => {
  it('needs correct diagnoses and spaced mastery', () => {
    expect(starsFor(undefined, 1)).toBe(0);
    expect(starsFor({ ...emptyDx(), correct: 1, best: 'S' }, 0.1)).toBe(1);
    expect(starsFor({ ...emptyDx(), correct: 2, best: 'B' }, 0.4)).toBe(2);
    expect(starsFor({ ...emptyDx(), correct: 2, best: 'C' }, 0.9)).toBe(1);
    expect(starsFor({ ...emptyDx(), correct: 4, best: 'A' }, 0.85)).toBe(3);
    expect(starsFor({ ...emptyDx(), correct: 4, best: 'B' }, 0.85)).toBe(2);
  });
  it('betterGrade', () => {
    expect(betterGrade(null, 'B')).toBe('B');
    expect(betterGrade('A', 'S')).toBe('S');
    expect(betterGrade('A', 'C')).toBe('A');
  });
});

describe('reducers', () => {
  const input = { caseId: 'c1', modeId: 'shift', difficulty: 2, emergency: false, rare: false, now: 1 };
  it('folds a correct case', () => {
    const { next, gain } = applyCase(initialState(), { ...input, score: score({ grade: 'S', perfect: true, keyQuestionsAsked: 3 }), confidence: 'certain' });
    expect(next.xp).toBe(gain.total);
    expect(next.correct).toBe(1);
    expect(next.perfect).toBe(1);
    expect(next.sGrades).toBe(1);
    expect(next.fullHistory).toBe(1);
    expect(next.lean).toBe(1);
    expect(next.swift).toBe(1);
    expect(next.certainCorrect).toBe(1);
    expect(next.triaged).toEqual(['poag']);
    expect(next.dx['poag']).toMatchObject({ seen: 1, correct: 1, best: 'S' });
    expect(gain.lines.some((l) => l.id === 'first')).toBe(true);
    expect(next.lastGain).toMatchObject({ caseId: 'c1', fromXp: 0, toXp: gain.total });
  });
  it('tracks misses, comebacks and streaks', () => {
    let s = applyCase(initialState(), { ...input, score: score() }).next;
    s = applyCase(s, { ...input, score: score({ correctDiagnosisId: 'crao', diagnosisCorrect: false, grade: 'D' }) }).next;
    expect(s.correctStreak).toBe(0);
    expect(s.bestCorrectStreak).toBe(1);
    expect(s.dx['crao']).toMatchObject({ missed: 1, correct: 0, best: null });
    s = applyCase(s, { ...input, score: score({ correctDiagnosisId: 'crao' }) }).next;
    expect(s.comebacks).toBe(1);
    expect(applyFailure(s).correctStreak).toBe(0);
    expect(applyFailure(s).xp).toBe(s.xp);
  });
  it('counts tests performed (not auto-run), eagle eye and RAPD', () => {
    const f = buildFindings(60);
    const withLesions = { ...f, posterior: { ...f.posterior, OD: { ...f.posterior.OD, lesions: [{ type: 'drusen-large' as const, zone: 'macula' as const, density: 3 }] } } };
    expect(fundusHasLesions(f)).toBe(false);
    expect(fundusHasLesions(withLesions)).toBe(true);
    let s = applyTest(initialState(), { testId: 'ophthalmoscopy', accuracy: 1, timeMs: 1, findings: [], perfect: true }, { practice: false, findings: withLesions });
    expect(s.eagleEye).toBe(1);
    expect(s.tests.ophthalmoscopy).toEqual({ done: 1, perfect: 1 });
    s = applyTest(s, { testId: 'tonometry', accuracy: 1, timeMs: 1, findings: [], autoRun: true }, { practice: false });
    expect(s.tests.tonometry).toBeUndefined();
    s = applyTest(s, { testId: 'ophthalmoscopy', accuracy: 1, timeMs: 1, findings: [], perfect: true }, { practice: true, findings: withLesions });
    expect(s.eagleEye).toBe(1);
    expect(s.practice).toBe(1);
  });
  it('grants append to the case on screen', () => {
    const s = applyCase(initialState(), { ...input, score: score() }).next;
    const g = applyGrant(s, 40, 'Streak bonus', 'c1');
    expect(g.xp).toBe(s.xp + 40);
    expect(g.lastGain?.toXp).toBe(s.xp + 40);
    expect(g.lastGain?.lines.at(-1)).toEqual({ id: 'bonus', label: 'Streak bonus', xp: 40 });
    expect(applyGrant(s, 40, 'x', null).lastGain).toBe(s.lastGain);
  });
});

describe('achievements', () => {
  const env: AchievementEnv = {
    diagnoses: [
      { id: 'poag', name: 'POAG', category: 'glaucoma', summary: '', keyFindings: [], typicalUrgency: 'routine', pearls: [], rarity: 'common' },
      { id: 'acute-angle-closure', name: 'AAC', category: 'glaucoma', summary: '', keyFindings: [], typicalUrgency: 'emergency', pearls: [], rarity: 'uncommon' },
    ],
    emergencyDiagnoses: ['acute-angle-closure'],
    availableTests: ['tonometry'],
    stars: () => 0,
    level: 0,
  };
  it('has 30+ uniquely named trophies with clinic-themed copy', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const banned = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth|holy|sacred|heaven|hell|divine)\b/i;
    for (const a of ACHIEVEMENTS) {
      expect(a.title + ' ' + a.description).not.toMatch(banned);
    }
  });
  it('unlocks from state', () => {
    let s = initialState();
    expect(newlyUnlocked(s, env)).toEqual([]);
    s = applyCase(s, { caseId: 'a', modeId: 'shift', difficulty: 2, emergency: true, rare: false, now: 0, score: score({ correctDiagnosisId: 'acute-angle-closure', grade: 'S' }) }).next;
    const ids = newlyUnlocked(s, env).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['first-light', 'gold-standard', 'sight-saver', 'on-call-ready', 'pressure-point']));
    expect(ids).not.toContain('crest-glaucoma');
    s = applyCase(s, { caseId: 'b', modeId: 'shift', difficulty: 2, emergency: false, rare: false, now: 0, score: score() }).next;
    expect(newlyUnlocked(s, env).map((a) => a.id)).toContain('crest-glaucoma');
  });
  it('content-dependent trophies stay locked when there is nothing to earn', () => {
    const empty = { ...env, diagnoses: [], emergencyDiagnoses: [], availableTests: [] };
    const ids = newlyUnlocked(initialState(), empty).map((a) => a.id);
    expect(ids).toEqual([]);
  });
  it('rank trophies follow the ladder', () => {
    const ids = newlyUnlocked(initialState(), { ...env, level: 6 }).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['rank-intern', 'rank-resident']));
    expect(ids).not.toContain('rank-associate');
  });
});
