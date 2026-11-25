import { describe, expect, it } from 'vitest';
import { buildFindings } from '@core';
import { anisocoria, coverage, lagEye, profiles, PupilSim, response, trueSize, type SimInput } from './model';

const run = (sim: PupilSim, s: number, inp: SimInput) => { for (let i = 0; i < s * 60; i++) sim.step(1 / 60, inp); };
const dark: SimInput = { room: 'dim', cov: { OD: 0, OS: 0 }, near: false };
const onOD: SimInput = { room: 'dim', cov: { OD: 1, OS: 0 }, near: false };
const onOS: SimInput = { room: 'dim', cov: { OD: 0, OS: 1 }, near: false };
const bright: SimInput = { room: 'bright', cov: { OD: 0, OS: 0 }, near: false };

/** Seconds after swinging onto the RAPD eye until its (and the consensual) pupil has dilated by 0.5 mm. */
function dilationOnset(grade: 1 | 2 | 3 | 4): number | null {
  const sim = new PupilSim(profiles(buildFindings(40, { pupils: { rapd: 'OD', rapdGrade: grade } })));
  run(sim, 4, onOS);
  const base = sim.size.OD;
  for (let i = 1; i <= 6 * 60; i++) { sim.step(1 / 60, onOD); if (sim.size.OD > base + 0.5) return i / 60; }
  return null;
}

describe('RAPD dynamics by grade', () => {
  it.each([1, 2, 3, 4] as const)('grade %i dilates both pupils when the light swings onto the affected eye', (g) => {
    const sim = new PupilSim(profiles(buildFindings(40, { pupils: { rapd: 'OD', rapdGrade: g } })));
    run(sim, 4, onOS);
    const before = { ...sim.size };
    run(sim, 8, onOD);
    expect(sim.size.OD).toBeGreaterThan(before.OD + 0.25);
    expect(sim.size.OS).toBeGreaterThan(before.OS + 0.25); // consensual
  });
  it('higher grades dilate sooner; 3+ and 4+ are near-immediate, 1+ is delayed', () => {
    const t = ([1, 2, 3, 4] as const).map(dilationOnset);
    expect(t.every((x) => x !== null)).toBe(true);
    const [t1, t2, t3, t4] = t as number[];
    expect(t1!).toBeGreaterThan(t2!);
    expect(t2!).toBeGreaterThan(t3!);
    expect(t3!).toBeGreaterThanOrEqual(t4! - 0.3);
    expect(t4!).toBeLessThan(1.2);
    expect(t1!).toBeGreaterThan(0.6);
  });
  it('swinging back to the healthy eye re-constricts both', () => {
    const sim = new PupilSim(profiles(buildFindings(40, { pupils: { rapd: 'OS', rapdGrade: 3 } })));
    run(sim, 3, onOD);
    const constricted = sim.size.OS;
    run(sim, 3, onOS);
    expect(sim.size.OS).toBeGreaterThan(constricted + 1);
    run(sim, 3, onOD);
    expect(sim.size.OS).toBeLessThan(constricted + 0.5);
  });
  it('a healthy pair never dilates on a brisk swing', () => {
    const sim = new PupilSim(profiles(buildFindings(40)));
    run(sim, 3, onOD);
    const base = sim.size.OS;
    let max = 0;
    for (let i = 0; i < 60; i++) { sim.step(1 / 60, i < 15 ? dark : onOS); max = Math.max(max, sim.size.OS - base); }
    expect(max).toBeLessThan(0.6);
  });
  it('pupils do not respond for the first ~0.2 s (latency)', () => {
    const sim = new PupilSim(profiles(buildFindings(30)));
    run(sim, 2, dark);
    const d0 = sim.size.OD;
    run(sim, 0.15, onOD);
    expect(Math.abs(sim.size.OD - d0)).toBeLessThan(0.05);
    run(sim, 0.6, onOD);
    expect(sim.size.OD).toBeLessThan(d0 - 0.5);
  });
});

describe('abnormal pupils', () => {
  const horner = buildFindings(40, { pupils: { sizeLightMm: { OD: 3, OS: 2.3 }, sizeDarkMm: { OD: 6, OS: 4.2 } }, external: { ptosis: ['OS'] } });
  it('Horner-type: smaller pupil lags in the dark, so anisocoria is larger at 5 s than 15 s', () => {
    expect(lagEye(horner)).toBe('OS');
    const sim = new PupilSim(profiles(horner));
    run(sim, 4, bright);
    run(sim, 5, dark);
    const a5 = sim.size.OD - sim.size.OS;
    run(sim, 10, dark);
    const a15 = sim.size.OD - sim.size.OS;
    expect(a5).toBeGreaterThan(a15);
    expect(a5).toBeGreaterThan(1.5);
    expect(a15).toBeGreaterThan(1.3); // still anisocoric in the dark
  });
  it('Horner-type: anisocoria is smaller in the light', () => {
    const sim = new PupilSim(profiles(horner));
    run(sim, 6, bright);
    expect(Math.abs(sim.size.OD - sim.size.OS)).toBeLessThan(1);
  });
  it('lagEye is null for physiologic anisocoria and for normal pupils', () => {
    expect(lagEye(buildFindings(40))).toBeNull();
    expect(lagEye(buildFindings(40, { pupils: { sizeLightMm: { OD: 3.8, OS: 3 }, sizeDarkMm: { OD: 6.8, OS: 6 } } }))).toBeNull();
  });
  const adie = buildFindings(45, { pupils: { sizeLightMm: { OD: 6 }, sizeDarkMm: { OD: 6.4 }, reactivity: { OD: 'tonic' }, nearResponse: 'light-near-dissociation' } });
  it('Adie: weak light reaction, and a slow redilation after near (tonic)', () => {
    const sim = new PupilSim(profiles(adie));
    run(sim, 10, onOD);
    expect(sim.size.OD).toBeGreaterThan(5.5); // large in the light
    expect(sim.size.OS).toBeLessThan(3.5); // the normal fellow eye is brisk
    run(sim, 16, { ...dark, near: true });
    expect(sim.size.OD).toBeLessThan(3.4);
    run(sim, 3, dark);
    expect(sim.size.OD).toBeLessThan(4.6); // still redilating slowly
    run(sim, 40, dark);
    expect(sim.size.OD).toBeGreaterThan(5.5);
  });
  it('Adie: near effort constricts the tonic pupil slowly but fully', () => {
    const sim = new PupilSim(profiles(adie));
    run(sim, 2, { ...dark, near: true });
    expect(sim.size.OD).toBeGreaterThan(4);
    run(sim, 14, { ...dark, near: true });
    expect(sim.size.OD).toBeLessThan(3.3);
  });
  it('fixed pupil follows its true size: no constriction to light, none to near', () => {
    const f = buildFindings(50, { pupils: { sizeLightMm: { OD: 7 }, sizeDarkMm: { OD: 7.5 }, reactivity: { OD: 'fixed' } } });
    const sim = new PupilSim(profiles(f));
    run(sim, 3, dark);
    run(sim, 8, onOS);
    expect(sim.size.OD).toBeGreaterThan(6.5);
    const sim2 = new PupilSim(profiles(f));
    run(sim2, 8, { ...dark, near: true });
    expect(sim2.size.OD).toBeGreaterThan(7);
    expect(sim2.size.OS).toBeLessThan(3.6); // the healthy eye does constrict to near
  });
  it('light-near dissociation: poor light reaction but a brisk near response', () => {
    const f = buildFindings(50, { pupils: { sizeLightMm: { OD: 5, OS: 5 }, sizeDarkMm: { OD: 6, OS: 6 }, reactivity: { OD: 'fixed', OS: 'fixed' }, nearResponse: 'light-near-dissociation' } });
    const sim = new PupilSim(profiles(f));
    run(sim, 4, { ...dark, near: true });
    expect(sim.size.OD).toBeLessThan(3.5);
  });
});

describe('helpers', () => {
  it('response is monotonic and bounded', () => {
    let p = -1;
    for (let d = 0; d <= 1; d += 0.1) { const r = response(d); expect(r).toBeGreaterThanOrEqual(p); p = r; }
    expect(response(0)).toBe(0);
    expect(response(2)).toBe(1);
  });
  it('coverage falls smoothly from 1 to 0', () => {
    expect(coverage(5, 10, 20)).toBe(1);
    expect(coverage(40, 10, 20)).toBe(0);
    expect(coverage(20, 10, 20)).toBeGreaterThan(0.3);
    expect(coverage(20, 10, 20)).toBeLessThan(0.7);
  });
  it('trueSize reads findings', () => {
    const f = buildFindings(30, { pupils: { sizeLightMm: { OD: 2.7 }, sizeDarkMm: { OS: 5.1 } } });
    expect(trueSize(f, 'OD', 'light')).toBe(2.7);
    expect(trueSize(f, 'OS', 'dark')).toBe(5.1);
  });
  it('anisocoria patterns', () => {
    expect(anisocoria(buildFindings(30)).pattern).toBe('none');
    expect(anisocoria(buildFindings(30, { pupils: { sizeLightMm: { OD: 3.5 }, sizeDarkMm: { OD: 6.5 } } })).pattern).toBe('physiologic');
    expect(anisocoria(buildFindings(30, { pupils: { sizeDarkMm: { OS: 3.8 } } })).pattern).toBe('greater-dark');
    expect(anisocoria(buildFindings(30, { pupils: { sizeLightMm: { OD: 6 } } })).pattern).toBe('greater-light');
  });
});
