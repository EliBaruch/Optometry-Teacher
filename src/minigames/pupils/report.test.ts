import { describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import { report } from './report';
import { anisocoria, lagEye, PupilSim, profiles } from './model';
import { makeScenario, makeChallenge } from './practice';
import { assess, emptyMeasures, sizeScore, swingScore } from './scoring';

const step = (sim: PupilSim, s: number, inp: Parameters<PupilSim['step']>[1]) => { for (let i = 0; i < s * 60; i++) sim.step(1 / 60, inp); };
const dark = { room: 'dim' as const, cov: { OD: 0, OS: 0 }, near: false };
const onOD = { room: 'dim' as const, cov: { OD: 1, OS: 0 }, near: false };
const onOS = { room: 'dim' as const, cov: { OD: 0, OS: 1 }, near: false };

describe('report', () => {
  it('normal pupils', () => {
    const r = report(buildFindings(30));
    expect(r.every((l) => l.flag === 'normal')).toBe(true);
    expect(r.find((l) => l.label.startsWith('RAPD'))!.value).toBe('Absent');
  });
  it('RAPD is critical and located', () => {
    const r = report(buildFindings(50, { pupils: { rapd: 'OS', rapdGrade: 3 } }));
    const l = r.find((x) => x.label.startsWith('RAPD'))!;
    expect(l).toMatchObject({ eye: 'OS', flag: 'critical' });
    expect(l.value).toContain('3+');
  });
  it('flags a fixed dilated pupil beside a brisk one as critical', () => {
    const f = buildFindings(50, { pupils: { sizeLightMm: { OD: 7 }, sizeDarkMm: { OD: 7 }, reactivity: { OD: 'fixed' } } });
    expect(report(f).find((l) => l.label === 'Light reaction' && l.eye === 'OD')!.flag).toBe('critical');
    expect(anisocoria(f).pattern).toBe('greater-light');
  });
});

describe('model', () => {
  it('healthy pupils constrict to light and redilate in the dark', () => {
    const f = buildFindings(30);
    const sim = new PupilSim(profiles(f));
    step(sim, 3, dark);
    expect(sim.size.OD).toBeCloseTo(6, 0);
    step(sim, 3, onOD);
    expect(sim.size.OD).toBeLessThan(3.4);
    expect(sim.size.OS).toBeLessThan(3.4); // consensual
    step(sim, 6, dark);
    expect(sim.size.OS).toBeGreaterThan(5.5);
  });
  it('swinging onto an RAPD eye makes both pupils dilate', () => {
    const f = buildFindings(40, { pupils: { rapd: 'OD', rapdGrade: 3 } });
    const sim = new PupilSim(profiles(f));
    step(sim, 3, onOS);
    const before = sim.size.OD;
    step(sim, 2.5, onOD);
    expect(sim.size.OD).toBeGreaterThan(before + 1);
    expect(sim.size.OS).toBeGreaterThan(before + 1);
    step(sim, 2.5, onOS);
    expect(sim.size.OD).toBeLessThan(before + 0.5);
  });
  it('no dilation when swinging across a normal pair', () => {
    const sim = new PupilSim(profiles(buildFindings(40)));
    step(sim, 3, onOS);
    let max = 0;
    for (let i = 0; i < 90; i++) { sim.step(1 / 60, i < 12 ? dark : onOD); max = Math.max(max, sim.size.OD); }
    expect(max).toBeLessThan(3.6);
  });
  it('Horner dilation lag: anisocoria larger at 5 s than 15 s', () => {
    const f = buildFindings(40, {
      pupils: { sizeLightMm: { OD: 3, OS: 2.3 }, sizeDarkMm: { OD: 6, OS: 4.2 } }, external: { ptosis: ['OS'] },
    });
    expect(lagEye(f)).toBe('OS');
    const sim = new PupilSim(profiles(f));
    step(sim, 4, { room: 'bright', cov: { OD: 0, OS: 0 }, near: false });
    step(sim, 5, dark);
    const a5 = sim.size.OD - sim.size.OS;
    step(sim, 10, dark);
    const a15 = sim.size.OD - sim.size.OS;
    expect(a5).toBeGreaterThan(a15);
    expect(a15).toBeGreaterThan(1.4);
  });
  it('light-near dissociation: tonic pupil constricts to near slowly', () => {
    const f = buildFindings(40, { pupils: { sizeLightMm: { OD: 6 }, sizeDarkMm: { OD: 6.4 }, reactivity: { OD: 'tonic' }, nearResponse: 'light-near-dissociation' } });
    const sim = new PupilSim(profiles(f));
    step(sim, 2, onOD);
    expect(sim.size.OD).toBeGreaterThan(5.5);
    step(sim, 2, { ...dark, near: true });
    expect(sim.size.OD).toBeGreaterThan(4);
    step(sim, 12, { ...dark, near: true });
    expect(sim.size.OD).toBeLessThan(3.2);
  });
});

describe('scoring', () => {
  it('scores', () => {
    expect(sizeScore(0.1)).toBe(1);
    expect(sizeScore(2)).toBe(0);
    expect(swingScore({ from: 'OD', to: 'OS', dwell: 3, transit: 0.4 })).toBe(1);
    expect(swingScore({ from: 'OD', to: 'OS', dwell: 0.5, transit: 0.4 })).toBe(0);
    const f = buildFindings(30);
    const a = assess(f, {
      measures: { light: { OD: { mm: 3, settled: true }, OS: { mm: 3, settled: true } }, dark: { OD: { mm: 6, settled: true }, OS: { mm: 6, settled: true } } },
      swings: [0, 1, 2].map(() => ({ from: 'OD' as const, to: 'OS' as const, dwell: 2.5, transit: 0.5 })),
      nearSeconds: 3, call: { side: 'none', grade: null }, timeMs: 80000,
    });
    expect(a.perfect).toBe(true);
    expect(assess(f, { measures: emptyMeasures(), swings: [], nearSeconds: 0, call: { side: null, grade: null }, timeMs: 1000 }).accuracy).toBeLessThan(0.1);
  });
});

describe('practice', () => {
  it('generates coherent scenarios and challenges', () => {
    const rng = createRng(5);
    for (let i = 0; i < 80; i++) {
      const s = makeScenario(rng, (i % 10) / 10);
      const c = makeChallenge(s.findings, rng);
      expect(c.options.length).toBeGreaterThanOrEqual(2);
      expect(c.correct).toBeGreaterThanOrEqual(0);
      expect(c.correct).toBeLessThan(c.options.length);
      expect(s.answer.length).toBeGreaterThan(10);
      expect(report(s.findings).length).toBeGreaterThan(8);
    }
  });
});
