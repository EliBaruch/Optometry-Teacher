import { describe, expect, it } from 'vitest';
import { createRng, EYES, type Keratometry } from '@core';
import { describeKind, explainEye, makeChallenge, makeScenario, pickKind } from './practice';
import { normalizeK } from './optics';

describe('makeScenario', () => {
  it('generates clinically coherent corneas across difficulties', () => {
    for (let i = 0; i < 300; i++) {
      const rng = createRng(1000 + i);
      const s = makeScenario(rng, (i % 5) / 4);
      for (const e of EYES) {
        const k = s.findings.keratometry[e];
        expect(k.k1).toBeLessThanOrEqual(k.k2);
        expect(k.k1).toBeGreaterThanOrEqual(38);
        expect(k.k2).toBeLessThanOrEqual(62);
        expect(k.axisK1).toBeGreaterThanOrEqual(1);
        expect(k.axisK1).toBeLessThanOrEqual(180);
        expect(k.k1 * 4).toBe(Math.round(k.k1 * 4));
        const rx = s.findings.refraction[e];
        expect(rx.cylinder).toBeLessThanOrEqual(0);
        if (k.mires === 'distorted') {
          expect(k.k2).toBeGreaterThan(47);
          expect(s.findings.retinoscopyReflex[e]).toBe('scissors');
          expect(s.findings.anterior[e].cornea).toContain('vogt-striae');
          expect(s.findings.va[e].bestCorrected).toBeGreaterThan(0);
        }
      }
      expect(s.patient.age).toBeGreaterThan(5);
      expect(s.answer).toContain('OD');
      expect(s.patient.avatar.glasses).toBe('none');
    }
  });
  it('is deterministic for a seed', () => {
    expect(makeScenario(createRng(7), 0.5)).toEqual(makeScenario(createRng(7), 0.5));
  });
  it('mixes normal and pathological, with more keratoconus when harder', () => {
    const count = (d: number) => {
      const rng = createRng(99);
      let kc = 0;
      for (let i = 0; i < 2000; i++) if (pickKind(rng, d) === 'keratoconus') kc++;
      return kc;
    };
    expect(count(0)).toBeGreaterThan(50);
    expect(count(1)).toBeGreaterThan(count(0) * 2);
  });
});

describe('challenge', () => {
  it('asks about the keratoconic eye when there is one', () => {
    const f = makeKcFindings();
    const c = makeChallenge(f, createRng(3));
    expect(c.eye).toBe('OS');
    expect(c.options[c.correct]).toBe('Irregular cornea — suspect keratoconus');
    expect(c.explain).toMatch(/topography/);
  });
  it('always has 4 unique options including the correct one', () => {
    for (let i = 0; i < 200; i++) {
      const s = makeScenario(createRng(i), 0.6);
      const c = makeChallenge(s.findings, createRng(i + 1));
      expect(new Set(c.options).size).toBe(c.options.length);
      expect(c.options.length).toBeGreaterThanOrEqual(3);
      expect(c.correct).toBeGreaterThanOrEqual(0);
      expect(c.question).not.toMatch(/\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i);
    }
  });
  it('describes regular corneas by orientation', () => {
    const k = (axisK1: number, cyl: number): Keratometry => ({ k1: 43, k2: 43 + cyl, axisK1, mires: 'regular' });
    expect(describeKind(k(180, 2))).toBe('Regular with-the-rule astigmatism');
    expect(describeKind(k(90, 2))).toBe('Regular against-the-rule astigmatism');
    expect(describeKind(k(45, 2))).toBe('Regular oblique astigmatism');
    expect(describeKind(k(180, 0.5))).toBe('Normal, near-spherical cornea');
    expect(explainEye('OD', k(180, 1.5))).toMatch(/K2 − K1 = 1.50 D/);
  });
});

function makeKcFindings() {
  for (let i = 0; i < 500; i++) {
    const s = makeScenario(createRng(i), 1);
    const os = normalizeK(s.findings.keratometry.OS);
    if (os.mires === 'distorted' && s.findings.keratometry.OD.mires === 'regular') return s.findings;
  }
  throw new Error('no keratoconus scenario found');
}
