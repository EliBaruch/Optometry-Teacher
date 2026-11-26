import { afterEach, describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import retinoscopy from './index';
import { makeChallenge, makeScenario } from './practice';
import { report } from './report';

const hasHebrew = (s: string) => /[֐-׿]/.test(s);

describe('retinoscopy Hebrew edition', () => {
  afterEach(() => { document.documentElement.lang = ''; });
  it('report() stays English; the locale argument switches the chart lines', () => {
    const f = buildFindings(30, { retinoscopyReflex: { OD: 'scissors', OS: 'normal' } });
    expect(report(f)[0]!.label).toBe('Ret');
    expect(report(f, undefined, 'he').map((r) => r.label).every(hasHebrew)).toBe(true);
    expect(retinoscopy.text?.he?.title).toBe('רטינוסקופיה');
  });
  it('practice scenario and challenge speak the edition', () => {
    document.documentElement.lang = 'he';
    const s = makeScenario(createRng('x'), 0.5);
    expect(hasHebrew(s.patient.name)).toBe(true);
    expect(hasHebrew(s.answer)).toBe(true);
    for (const seed of ['a', 'b', 'c', 'd']) {
      const c = makeChallenge(s.findings, 67, createRng(seed), 'he');
      expect(hasHebrew(c.question)).toBe(true);
      expect(hasHebrew(c.explain)).toBe(true);
    }
  });
});
