import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { KIND_HE, LABEL_HE, PEARL_HE, STAIN_HE } from './he';
import { makeFluoChallenge } from './fluo-practice';
import { makeSlitChallenge, makeSlitScenario } from './practice';
import { fluoReportFor, report, reportFor, STAIN_LABEL } from './report';
import { KIND_INFO, PEARL } from './teach';
import { MENU, type MenuNode } from './vocab';

const paths = (ns: MenuNode[]): string[] => ns.flatMap((n) => [n.path, ...(n.children ? paths(n.children) : [])]);

describe('Hebrew slit-lamp tables', () => {
  it('cover every menu node, pearl, kind and stain pattern', () => {
    for (const p of paths(MENU)) expect(LABEL_HE[p], p).toBeTruthy();
    for (const k of Object.keys(PEARL)) expect(PEARL_HE[k], k).toBeTruthy();
    for (const k of Object.keys(KIND_INFO)) expect(KIND_HE[k], k).toBeTruthy();
    for (const k of Object.keys(STAIN_LABEL)) expect(STAIN_HE[k as keyof typeof STAIN_HE], k).toBeTruthy();
  });
  it('writes the chart in Hebrew and leaves the English chart alone', () => {
    const sc = makeSlitScenario(createRng(11), 0.6);
    const en = report(sc.findings);
    const he = reportFor(sc.findings, 'he');
    expect(he.length).toBe(en.length);
    expect(he.filter((l) => l.label !== 'Van Herick').every((l) => /[\u0590-\u05FF]/.test(l.label))).toBe(true);
    expect(reportFor(sc.findings, 'en')).toEqual(en);
    expect(fluoReportFor(sc.findings, 'he')[0]!.label).toBe('פלואורסצאין');
  });
  it('builds Hebrew challenges with the same shape as English', () => {
    for (let i = 1; i <= 40; i++) {
      const sc = makeSlitScenario(createRng(i), 0.5);
      const a = makeSlitChallenge(sc.findings, createRng(i), 'en');
      const b = makeSlitChallenge(sc.findings, createRng(i), 'he');
      expect(b.map((q) => q.correct)).toEqual(a.map((q) => q.correct));
      const fa = makeFluoChallenge(sc.findings, createRng(i), 'en');
      const fb = makeFluoChallenge(sc.findings, createRng(i), 'he');
      expect(fb.map((q) => q.correct)).toEqual(fa.map((q) => q.correct));
    }
  });
});
