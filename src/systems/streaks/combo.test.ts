import { describe, expect, it } from 'vitest';
import { applyCase, applyFailure, comboBonusXp, formatMult, freshCombo, graceEligible, nextTier, tierFor } from './combo';

const right = { diagnosisCorrect: true, urgencyCorrect: true, essentialMissed: [], total: 1200, max: 1300 };
const wrongButSafe = { diagnosisCorrect: false, urgencyCorrect: true, essentialMissed: [], total: 600, max: 1300 };
const wrongSloppy = { diagnosisCorrect: false, urgencyCorrect: false, essentialMissed: ['tonometry' as const], total: 200, max: 1300 };

describe('combo tiers', () => {
  it('climbs x1 → x1.5 → x2 → x3', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map((n) => tierFor(n).mult)).toEqual([1, 1, 1.5, 2, 2, 3, 3]);
  });
  it('reports the next tier and the distance to it', () => {
    expect(nextTier(0)).toMatchObject({ need: 2, tier: { mult: 1.5 } });
    expect(nextTier(4)).toMatchObject({ need: 1, tier: { mult: 3 } });
    expect(nextTier(5)).toBeNull();
  });
  it('formats multipliers', () => {
    expect(formatMult(1.5)).toBe('×1.5');
    expect(formatMult(3)).toBe('×3');
  });
});

describe('applyCase', () => {
  it('builds on correct diagnoses and flags tier-ups', () => {
    let c = freshCombo('shift');
    const steps = [];
    for (let i = 0; i < 5; i++) {
      const s = applyCase(c, 'shift', right);
      steps.push(s);
      c = s.combo;
    }
    expect(c.count).toBe(5);
    expect(c.best).toBe(5);
    expect(steps.map((s) => s.tierUp)).toEqual([false, true, true, false, true]);
    expect(steps[0].bonusXp).toBe(0);
    expect(steps[4].bonusXp).toBeGreaterThan(steps[1].bonusXp);
  });

  it('saves the combo once per run for a thorough, safely triaged miss', () => {
    let c = freshCombo('rush');
    c = applyCase(c, 'rush', right).combo;
    c = applyCase(c, 'rush', right).combo;
    const saved = applyCase(c, 'rush', wrongButSafe);
    expect(saved.outcome).toBe('saved');
    expect(saved.combo.count).toBe(2);
    expect(saved.bonusXp).toBe(0);
    const second = applyCase(saved.combo, 'rush', wrongButSafe);
    expect(second.outcome).toBe('reset');
    expect(second.combo.count).toBe(0);
    expect(second.combo.best).toBe(2);
  });

  it('resets on a sloppy miss and never saves a combo of one', () => {
    const one = applyCase(freshCombo('shift'), 'shift', right).combo;
    expect(graceEligible(one, wrongButSafe)).toBe(false);
    const two = applyCase(one, 'shift', right).combo;
    expect(applyCase(two, 'shift', wrongSloppy).outcome).toBe('reset');
  });

  it('starts fresh when the mode changes', () => {
    const c = applyCase(applyCase(freshCombo('shift'), 'shift', right).combo, 'shift', right).combo;
    expect(applyCase(c, 'rush', right).combo.count).toBe(1);
  });

  it('a timeout ends the combo', () => {
    const c = applyCase(applyCase(freshCombo('shift'), 'shift', right).combo, 'shift', right).combo;
    const f = applyFailure(c, 'shift');
    expect(f.combo.count).toBe(0);
    expect(f.prevCount).toBe(2);
  });
});

describe('combo bonus scales with learning quality', () => {
  it('pays more for better work at the same multiplier, nothing at x1', () => {
    expect(comboBonusXp(1, { total: 1300, max: 1300 })).toBe(0);
    expect(comboBonusXp(5, { total: 1300, max: 1300 })).toBe(80);
    expect(comboBonusXp(5, { total: 650, max: 1300 })).toBe(40);
    expect(comboBonusXp(3, { total: 1300, max: 0 })).toBe(0);
  });
});
