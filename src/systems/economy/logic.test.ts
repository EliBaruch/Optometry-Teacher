import { describe, expect, it } from 'vitest';
import type { Grade, ScoreBreakdown } from '@core';
import { CATALOG, CRATES, PITY_LIMIT, RARITY_ORDER, isMomentumMilestone } from './catalog';
import { caseFee, dayKey, lateShiftAdjust, momentumMultiplier, practiceFee, publishedOdds, rollCrate } from './logic';

function score(total: number, grade: Grade, opts: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    total, max: 1300, grade, perfect: false, diagnosisCorrect: grade !== 'F' && grade !== 'D',
    urgencyCorrect: true, correctDiagnosisId: 'cataract', chosenDiagnosisId: 'cataract',
    parts: [{ id: 'efficiency', label: 'Efficiency', points: 60, max: 100 }],
    essentialMissed: [], unnecessaryTests: [], keyQuestionsAsked: 0, keyQuestionsTotal: 0, skillAvg: 1, elapsedSec: 60, parSec: 120,
    ...opts,
  };
}

describe('caseFee', () => {
  it('pays far more for accurate work than sloppy work', () => {
    const s = caseFee({ score: score(1240, 'S'), difficulty: 3 }).total;
    const c = caseFee({ score: score(700, 'C'), difficulty: 3 }).total;
    const f = caseFee({ score: score(200, 'F', { diagnosisCorrect: false }), difficulty: 3 }).total;
    expect(s).toBeGreaterThan(c * 2.5);
    expect(c).toBeGreaterThan(f);
    expect(f).toBeGreaterThanOrEqual(1);
  });

  it('lines always sum to the total', () => {
    const r = caseFee({ score: score(1250, 'S', { perfect: true }), difficulty: 5, priorStreak: 4, earnedToday: 2450 });
    expect(r.lines.reduce((a, l) => a + l.amount, 0)).toBe(r.total);
    expect(r.lines.map((l) => l.id)).toEqual(['consult', 'grade', 'momentum', 'perfect', 'late']);
  });

  it('scales with difficulty, not with time', () => {
    const easy = caseFee({ score: score(1100, 'A'), difficulty: 1 }).total;
    const hard = caseFee({ score: score(1100, 'A'), difficulty: 5 }).total;
    expect(hard).toBeGreaterThan(easy);
    const slow = caseFee({ score: score(1100, 'A', { elapsedSec: 900 }), difficulty: 3 }).total;
    const fast = caseFee({ score: score(1100, 'A', { elapsedSec: 30 }), difficulty: 3 }).total;
    expect(slow).toBe(fast);
  });

  it('momentum only applies to correct diagnoses and is capped', () => {
    expect(momentumMultiplier(0)).toBe(1);
    expect(momentumMultiplier(50)).toBe(1.5);
    const wrong = caseFee({ score: score(400, 'D', { diagnosisCorrect: false }), priorStreak: 9 });
    expect(wrong.momentumMult).toBe(1);
  });

  it('consult notes waive the efficiency cost of covered hints (never above max)', () => {
    const base = caseFee({ score: score(1000, 'A') }).total;
    const covered = caseFee({ score: score(1000, 'A'), coveredHints: 1 }).total;
    const many = caseFee({ score: score(1000, 'A'), coveredHints: 10 }).total;
    expect(covered).toBeGreaterThan(base);
    expect(many).toBe(caseFee({ score: score(1040, 'A') }).total);
  });
});

describe('daily rates', () => {
  it('halves only the portion above the full-rate allowance', () => {
    expect(lateShiftAdjust(100, 0)).toBe(0);
    expect(lateShiftAdjust(200, 2400)).toBe(-50);
    expect(lateShiftAdjust(200, 3000)).toBe(-100);
  });
  it('practice pay is capped per day', () => {
    expect(practiceFee(1, 0, 200)).toBe(12);
    expect(practiceFee(1, 195, 200)).toBe(5);
    expect(practiceFee(1, 200, 200)).toBe(0);
    expect(practiceFee(-3, 0, 200)).toBe(0);
  });
});

describe('rollCrate', () => {
  it('is deterministic for a seed', () => {
    expect(rollCrate(1234, 'case', 0, [])).toEqual(rollCrate(1234, 'case', 0, []));
  });

  it('roughly matches the published odds', () => {
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const n = 20000;
    for (let i = 1; i <= n; i++) counts[rollCrate(i * 7919, 'momentum', 0, []).rarity]++;
    for (const r of RARITY_ORDER) expect(counts[r] / n).toBeCloseTo(CRATES.momentum.odds[r] / 100, 1);
  });

  it('pity guarantees epic or better', () => {
    for (let i = 1; i < 300; i++) {
      const d = rollCrate(i, 'case', PITY_LIMIT - 1, []);
      expect(['epic', 'legendary']).toContain(d.rarity);
      expect(d.guaranteed).toBe(true);
      expect(d.pity).toBe(0);
    }
  });

  it('never drops an owned cosmetic (converts to coins instead)', () => {
    const all = CATALOG.map((i) => i.id);
    for (let i = 1; i < 500; i++) {
      const d = rollCrate(i, 'promotion', 0, all);
      expect(d.content.type).not.toBe('cosmetic');
    }
  });

  it('published odds sum to 100%', () => {
    for (const k of Object.keys(CRATES) as (keyof typeof CRATES)[]) {
      expect(publishedOdds(k).reduce((s, o) => s + o.pct, 0)).toBeCloseTo(100, 5);
    }
  });
});

describe('misc', () => {
  it('momentum milestones', () => {
    expect([1, 2, 3, 4, 5, 6, 10, 12, 15, 20].filter(isMomentumMilestone)).toEqual([3, 5, 10, 15, 20]);
  });
  it('dayKey is a local date', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });
});
