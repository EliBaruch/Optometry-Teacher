import { afterEach, describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import phoropter from './index';
import { balance, compareLenses, duochrome, readChart } from './patient';
import { makeEyeModel } from './optics';
import { makeChallenge, makeScenario } from './practice';
import { report } from './report';

const hasHebrew = (s: string) => /[֐-׿]/.test(s);

describe('phoropter Hebrew edition', () => {
  afterEach(() => { document.documentElement.lang = ''; });
  it('report() stays English; the locale argument switches the chart lines', () => {
    const f = buildFindings(40, { refraction: { OD: { sphere: -2, cylinder: -0.5, axis: 180 }, OS: { sphere: -2, cylinder: 0, axis: 180 } } });
    expect(report(f)[0]!.label).toBe('Manifest Rx');
    expect(report(f, undefined, 'he')[0]!.label).toBe('רפרקציה סובייקטיבית');
    expect(phoropter.text?.he?.title).toBe('רפרקציה סובייקטיבית');
  });
  it('the patient answers "one or two?" in Hebrew', () => {
    const eye = makeEyeModel({ sphere: -2, cylinder: 0, axis: 180 }, -0.1, 4);
    const who = { rng: createRng('he'), difficulty: 0.5, locale: 'he' as const };
    const lens = { sphere: -2, cyl: 0, axis: 180 };
    const heard = [
      compareLenses(eye, { ...lens, sphere: -1 }, lens, who).text,
      duochrome(eye, lens, who).text,
      balance({ OD: eye, OS: eye }, { OD: lens, OS: { ...lens, sphere: -1 } }, who).text,
      readChart(0.1, createRng('r'), 'he').text,
    ];
    for (const t of heard) expect(hasHebrew(t)).toBe(true);
  });
  it('practice scenario and challenge speak the edition', () => {
    document.documentElement.lang = 'he';
    const s = makeScenario(createRng('x'), 0.5);
    expect(hasHebrew(s.patient.name)).toBe(true);
    const c = makeChallenge(s.findings, createRng('c'), 'he');
    expect(hasHebrew(c.question)).toBe(true);
    expect(c.options.every(hasHebrew)).toBe(true);
  });
});
