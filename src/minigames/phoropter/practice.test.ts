import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { autorefraction, classify, makeChallenge, makeScenario, orientation } from './practice';
import { report } from './report';

describe('classify', () => {
  it('names refractive errors', () => {
    expect(classify({ sphere: -2, cyl: 0, axis: 180 })).toBe('Myopia');
    expect(classify({ sphere: 1.5, cyl: -0.25, axis: 180 })).toBe('Hyperopia');
    expect(classify({ sphere: -1, cyl: -1, axis: 180 })).toBe('Compound myopic astigmatism, with-the-rule');
    expect(classify({ sphere: 0, cyl: -1.5, axis: 90 })).toBe('Simple myopic astigmatism, against-the-rule');
    expect(classify({ sphere: 1, cyl: -2, axis: 45 })).toBe('Mixed astigmatism, oblique');
    expect(classify({ sphere: 2, cyl: -1, axis: 10 })).toBe('Compound hyperopic astigmatism, with-the-rule');
    expect(classify({ sphere: 1, cyl: -1, axis: 170 })).toBe('Simple hyperopic astigmatism, with-the-rule');
  });
  it('orients by minus-cyl axis', () => {
    expect(orientation(5)).toBe('with-the-rule');
    expect(orientation(100)).toBe('against-the-rule');
    expect(orientation(135)).toBe('oblique');
  });
});

describe('scenarios', () => {
  it('are clinically coherent across seeds and difficulties', () => {
    for (let i = 0; i < 60; i++) {
      const rng = createRng(i * 7 + 1);
      const s = makeScenario(rng, (i % 4) / 3);
      const f = s.findings;
      for (const eye of ['OD', 'OS'] as const) {
        const r = f.refraction[eye];
        expect(r.cylinder).toBeLessThanOrEqual(0);
        expect(r.axis).toBeGreaterThanOrEqual(1);
        expect(r.axis).toBeLessThanOrEqual(180);
        expect(Math.abs(r.sphere * 4 - Math.round(r.sphere * 4))).toBeLessThan(1e-9);
        expect(f.va[eye].uncorrected).toBeGreaterThanOrEqual(f.va[eye].bestCorrected);
      }
      if (s.patient.age >= 40) expect(f.refraction.OD.add).toBeGreaterThan(0);
      expect(s.answer).toMatch(/^OD .* · OS /);
      expect(report(f, s.patient).length).toBeGreaterThanOrEqual(4);
    }
  });
  it('is deterministic for a seed', () => {
    expect(makeScenario(createRng(9), 0.5).answer).toBe(makeScenario(createRng(9), 0.5).answer);
  });
});

describe('autorefraction & challenge', () => {
  it('stays near the truth', () => {
    for (let i = 0; i < 40; i++) {
      const a = autorefraction({ sphere: -2, cyl: -1, axis: 90 }, 40, 1, createRng(i));
      expect(Math.abs(a.sphere + 2)).toBeLessThanOrEqual(1.5);
      expect(a.cyl).toBeLessThanOrEqual(0);
    }
  });
  it('builds a 4-option question with exactly one correct answer', () => {
    const s = makeScenario(createRng(4), 0.6);
    const c = makeChallenge(s.findings, createRng(5));
    expect(c.options).toHaveLength(4);
    expect(new Set(c.options).size).toBe(4);
    const rx = s.findings.refraction[c.eye];
    expect(c.options[c.correct]).toBe(classify({ sphere: rx.sphere, cyl: rx.cylinder, axis: rx.axis }));
  });
});
