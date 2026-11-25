import { describe, expect, it } from 'vitest';
import { createRng, EYES } from '@core';
import { makeChallenge, makeScenario, pickKind, pickWd, uncorrectedLogMAR } from './practice';
import { report, trueRx } from './report';
import { ametropia, reflexGeo, wdPower } from './optics';

describe('retinoscopy practice', () => {
  it('generates coherent, varied scenarios at every difficulty', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 160; i++) {
      const d = (i % 5) / 4;
      const sc = makeScenario(createRng(`ret-${i}`), d);
      expect(sc.patient.name.length).toBeGreaterThan(2);
      for (const e of EYES) {
        const rx = trueRx(sc.findings, e);
        expect(rx.cylinder).toBeLessThanOrEqual(0);
        expect(rx.axis).toBeGreaterThanOrEqual(1);
        expect(rx.axis).toBeLessThanOrEqual(180);
        seen.add(sc.findings.retinoscopyReflex[e]);
      }
      expect(report(sc.findings, sc.patient).length).toBeGreaterThanOrEqual(4);
      expect(sc.answer).toContain('net Rx');
    }
    expect([...seen].sort()).toEqual(['absent', 'dull', 'normal', 'scissors']);
  });
  it('is deterministic for a seed', () => {
    expect(makeScenario(createRng(7), 0.5).answer).toBe(makeScenario(createRng(7), 0.5).answer);
  });
  it('low difficulty is mostly simple spheres at 67 cm', () => {
    let abn = 0;
    for (let i = 0; i < 100; i++) {
      const rng = createRng(`lo-${i}`);
      expect(pickWd(rng, 0.1, 'practice')).toBe(67);
      if (['scissors', 'dull', 'absent'].some((r) => EYES.some((e) => makeScenario(createRng(`lo-${i}`), 0).findings.retinoscopyReflex[e] === r))) abn++;
    }
    expect(abn).toBeLessThan(20);
    expect(pickKind(createRng(1), 0)).toBeTruthy();
  });
  it('case mode always uses 67 cm', () => {
    for (let i = 0; i < 20; i++) expect(pickWd(createRng(i), 1, 'case')).toBe(67);
  });
  it('maps refractive error to a believable uncorrected acuity', () => {
    expect(uncorrectedLogMAR({ sphere: 0, cylinder: 0, axis: 180 })).toBeLessThanOrEqual(0.1);
    expect(uncorrectedLogMAR({ sphere: -4, cylinder: 0, axis: 180 })).toBeGreaterThan(0.7);
  });
  it('challenges have exactly one right option and an explanation', () => {
    for (let i = 0; i < 120; i++) {
      const sc = makeScenario(createRng(`ch-${i}`), (i % 5) / 4);
      const c = makeChallenge(sc.findings, [50, 67, 100][i % 3]!, createRng(`c-${i}`));
      expect(c.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(c.options).size).toBe(c.options.length);
      expect(c.correct).toBeGreaterThanOrEqual(0);
      expect(c.explain.length).toBeGreaterThan(20);
    }
  });
  it('the motion answer agrees with the optics', () => {
    const sc = makeScenario(createRng('mot'), 0);
    const rx = trueRx(sc.findings, 'OD');
    const e = ametropia(rx, 0, wdPower(67));
    expect(['with', 'against', 'neutral', 'skew']).toContain(reflexGeo(e.e1, e.e2, rx.axis, rx.axis).motion);
  });
});
