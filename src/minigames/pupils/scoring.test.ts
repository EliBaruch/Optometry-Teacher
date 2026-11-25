import { describe, expect, it } from 'vitest';
import { buildFindings, type PatientFindings } from '@core';
import {
  assess, callScore, emptyMeasures, goodSwings, sizeScore, swingScore, truthCall,
  type Measures, type Swing, type Tech,
} from './scoring';

const good = (n: number): Swing[] => Array.from({ length: n }, (_, i) => ({ from: i % 2 ? 'OS' : 'OD', to: i % 2 ? 'OD' : 'OS', dwell: 2.6, transit: 0.5 }));
const exact = (f: PatientFindings): Measures => ({
  light: { OD: { mm: f.pupils.sizeLightMm.OD, settled: true }, OS: { mm: f.pupils.sizeLightMm.OS, settled: true } },
  dark: { OD: { mm: f.pupils.sizeDarkMm.OD, settled: true }, OS: { mm: f.pupils.sizeDarkMm.OS, settled: true } },
});
const full = (f: PatientFindings, over: Partial<Tech> = {}): Tech => ({ measures: exact(f), swings: good(4), nearSeconds: 3, call: truthCall(f), timeMs: 90000, ...over });

const horner = buildFindings(40, { pupils: { sizeLightMm: { OD: 3, OS: 2.3 }, sizeDarkMm: { OD: 6, OS: 4.2 } }, external: { ptosis: ['OS'] } });
const adie = buildFindings(45, { pupils: { sizeLightMm: { OD: 6 }, sizeDarkMm: { OD: 6.4 }, reactivity: { OD: 'tonic' }, nearResponse: 'light-near-dissociation' } });
const rapd = buildFindings(55, { pupils: { rapd: 'OS', rapdGrade: 3 } });

describe('truthCall / callScore', () => {
  it('reads the true call', () => {
    expect(truthCall(buildFindings(30))).toEqual({ side: 'none', grade: null });
    expect(truthCall(rapd)).toEqual({ side: 'OS', grade: 3 });
  });
  it('scores side first, then grade', () => {
    expect(callScore({ side: null, grade: null }, rapd)).toBe(0);
    expect(callScore({ side: 'OD', grade: 3 }, rapd)).toBe(0);
    expect(callScore({ side: 'none', grade: null }, rapd)).toBe(0);
    expect(callScore({ side: 'OS', grade: null }, rapd)).toBe(0.7);
    expect(callScore({ side: 'OS', grade: 3 }, rapd)).toBe(1);
    expect(callScore({ side: 'OS', grade: 2 }, rapd)).toBe(0.85);
    expect(callScore({ side: 'OS', grade: 1 }, rapd)).toBe(0.65);
    expect(callScore({ side: 'none', grade: null }, buildFindings(30))).toBe(1);
    expect(callScore({ side: 'OD', grade: 2 }, buildFindings(30))).toBe(0);
  });
});

describe('component scores', () => {
  it('sizeScore tolerates 0.3 mm and fails at 1.2 mm', () => {
    expect(sizeScore(0)).toBe(1);
    expect(sizeScore(0.3)).toBe(1);
    expect(sizeScore(0.75)).toBeCloseTo(0.5, 5);
    expect(sizeScore(1.2)).toBe(0);
  });
  it('swingScore needs ~2 s dwell and a brisk transit', () => {
    expect(swingScore({ from: 'OD', to: 'OS', dwell: 2, transit: 1 })).toBe(1);
    expect(swingScore({ from: 'OD', to: 'OS', dwell: 1.6, transit: 1 })).toBeCloseTo(0.5, 5);
    expect(swingScore({ from: 'OD', to: 'OS', dwell: 1.2, transit: 1 })).toBe(0);
    expect(swingScore({ from: 'OD', to: 'OS', dwell: 3, transit: 2.5 })).toBeCloseTo(0.7, 5);
  });
  it('goodSwings counts holds of 2 s or more', () => {
    expect(goodSwings([...good(2), { from: 'OD', to: 'OS', dwell: 1.9, transit: 0.3 }])).toBe(2);
  });
});

describe('assess', () => {
  it.each([['RAPD', rapd], ['Horner-type', horner], ['Adie', adie], ['normal', buildFindings(30)]] as const)('flawless technique on a %s case is perfect', (_n, f) => {
    const a = assess(f, full(f));
    expect(a.accuracy).toBeGreaterThan(0.97);
    expect(a.perfect).toBe(true);
    expect(a.tasksDone).toBe(5);
    expect(a.sizeErrors).toHaveLength(4);
  });
  it('measuring the wrong sizes in a Horner case lowers the sizes score', () => {
    const wrong: Measures = { light: exact(horner).light, dark: { OD: { mm: 6, settled: true }, OS: { mm: 6, settled: true } } };
    const a = assess(horner, full(horner, { measures: wrong }));
    expect(a.parts.sizes).toBeLessThan(0.8);
    expect(a.perfect).toBe(false);
    expect(a.sizeErrors.find((s) => s.cond === 'dark' && s.eye === 'OS')!.err).toBeCloseTo(1.8, 5);
  });
  it('a wrong RAPD call blocks perfect even with perfect technique', () => {
    const a = assess(rapd, full(rapd, { call: { side: 'OD', grade: 3 } }));
    expect(a.parts.call).toBe(0);
    expect(a.perfect).toBe(false);
    expect(a.accuracy).toBeLessThan(0.8);
  });
  it('too few good swings blocks perfect', () => {
    const a = assess(rapd, full(rapd, { swings: good(2) }));
    expect(a.perfect).toBe(false);
    expect(a.parts.swing).toBeCloseTo(2 / 3, 5);
  });
  it('short holds score lower than long ones', () => {
    const short = good(3).map((s) => ({ ...s, dwell: 1.4 }));
    expect(assess(rapd, full(rapd, { swings: short })).parts.swing).toBeLessThan(0.4);
  });
  it('near test time scales the near part', () => {
    expect(assess(rapd, full(rapd, { nearSeconds: 1 })).parts.near).toBe(0.5);
    expect(assess(rapd, full(rapd, { nearSeconds: 9 })).parts.near).toBe(1);
  });
  it('slow exams lose at most the 5% time share', () => {
    const a = assess(rapd, full(rapd, { timeMs: 400000 }));
    expect(a.parts.time).toBe(0);
    expect(a.accuracy).toBeGreaterThan(0.9);
  });
  it('an empty exam scores near zero and is never perfect', () => {
    const a = assess(rapd, { measures: emptyMeasures(), swings: [], nearSeconds: 0, call: { side: null, grade: null }, timeMs: 1000 });
    expect(a.accuracy).toBeLessThan(0.1);
    expect(a.perfect).toBe(false);
    expect(a.tasksDone).toBe(0);
    expect(a.sizeErrors.every((s) => s.mm === null)).toBe(true);
  });
  it('accuracy always stays within 0..1', () => {
    const a = assess(rapd, full(rapd, { nearSeconds: 99, timeMs: 0 }));
    expect(a.accuracy).toBeLessThanOrEqual(1);
    expect(a.accuracy).toBeGreaterThanOrEqual(0);
  });
});
