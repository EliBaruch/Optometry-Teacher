import { describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import { mireWidth, apparentOffset, classify, dyeBias, endpointOf, flagFor, icareMean, icareShot, pulse, pulseAmp } from './optics';
import { assess, endpointScore, scoreEye } from './scoring';
import { buildReport, clockTime, report } from './report';
import { makeChallenge, makeScenario } from './practice';

describe('optics', () => {
  it('mires touch at the true IOP, overlap above, apart below', () => {
    expect(endpointOf(apparentOffset(18, 18, 0, 0))).toBe('touch');
    expect(endpointOf(apparentOffset(24, 18, 0, 0))).toBe('overlap');
    expect(endpointOf(apparentOffset(12, 18, 0, 0))).toBe('apart');
  });
  it('dye bias: thick mires over-read, thin mires under-read, none in band', () => {
    expect(dyeBias(0.5)).toBe(0);
    expect(dyeBias(0.95)).toBeGreaterThan(3);
    expect(dyeBias(0.05)).toBeLessThan(-3);
  });
  it('pulse is bounded and amplitude scales sensibly', () => {
    for (let t = 0; t < 5; t += 0.05) expect(Math.abs(pulse(t, 2))).toBeLessThanOrEqual(2.01);
    expect(pulseAmp(60, 0)).toBeGreaterThan(pulseAmp(10, 0));
    expect(pulseAmp(90, 1)).toBeLessThan(4);
  });
  it('flags and classes', () => {
    expect(flagFor(15)).toBe('normal');
    expect(flagFor(22)).toBe('abnormal');
    expect(flagFor(35)).toBe('critical');
    expect(flagFor(4)).toBe('abnormal');
    expect(classify(21)).toBe('normal');
  });
  it('iCare rejects decentred shots and averages the rest', () => {
    expect(icareShot(15, 0.6, 0).accepted).toBe(false);
    expect(icareMean([icareShot(15, 0, 0), icareShot(15, 0, 0)])).toBe(15);
    expect(icareMean([icareShot(15, 0.9, 0)])).toBeNull();
  });
});

describe('mire thickness', () => {
  it('good band is fine, thick dye is clearly fatter', () => {
    expect(mireWidth(0.5)).toBeLessThan(0.11);
    expect(mireWidth(0.64)).toBeLessThan(0.16);
    expect(mireWidth(0.95)).toBeGreaterThan(0.25);
    expect(mireWidth(0.05)).toBeLessThan(mireWidth(0.5));
  });
});

describe('scoring', () => {
  const base = { eye: 'OD' as const, method: 'goldmann' as const, truth: 18, centreErr: 0.05, dye: 0.5, contactS: 8 };
  it('endpoint tolerances', () => {
    expect(endpointScore(1)).toBe(1);
    expect(endpointScore(-2)).toBe(0.85);
    expect(endpointScore(12)).toBe(0);
  });
  it('flawless technique is perfect; big error is not', () => {
    expect(scoreEye({ ...base, reading: 18 }).perfect).toBe(true);
    expect(scoreEye({ ...base, reading: 25 }).score).toBeLessThan(0.45);
  });
  it('requires both eyes for full marks', () => {
    const od = { ...base, reading: 18 };
    const os = { ...base, eye: 'OS' as const, reading: 19 };
    expect(assess({ OD: od, OS: os }, 60_000)).toMatchObject({ perfect: true });
    expect(assess({ OD: od }, 60_000).accuracy).toBeLessThan(0.75);
  });
});

describe('report', () => {
  it('reports IOP per eye with flags', () => {
    const f = buildFindings(60, { iop: { OD: 48, OS: 16 } });
    const lines = report(f, {} as never);
    expect(lines[0]).toEqual({ label: 'IOP', value: '48 mmHg', eye: 'OD', flag: 'critical' });
    expect(lines[1]).toEqual({ label: 'IOP', value: '16 mmHg', eye: 'OS', flag: 'normal' });
    expect(lines.find((l) => l.label === 'IOP asymmetry')).toMatchObject({ value: '32 mmHg (OD higher)', flag: 'abnormal' });
  });
  it('normal eyes have no asymmetry line and carry the method', () => {
    const lines = buildReport(buildFindings(30), 'icare');
    expect(lines.map((l) => l.label)).toEqual(['IOP', 'IOP', 'IOP method']);
    expect(lines[2]!.value).toBe('iCare rebound');
    expect(lines.every((l) => l.flag === 'normal')).toBe(true);
  });
});

describe('report method and time', () => {
  it('module report honours method and time', () => {
    const f = buildFindings(30);
    const lines = report(f, undefined, { method: 'icare', time: '09:05' });
    expect(lines.find((l) => l.label === 'IOP method')!.value).toBe('iCare rebound');
    expect(lines.find((l) => l.label === 'IOP time')).toMatchObject({ value: '09:05', eye: 'OU' });
    expect(report(f, undefined).find((l) => l.label === 'IOP method')!.value).toBe('Goldmann applanation');
  });
  it('buildReport adds the time line and clockTime formats', () => {
    expect(buildReport(buildFindings(30), 'goldmann', '14:30').map((l) => l.label)).toContain('IOP time');
    expect(clockTime(new Date(2024, 0, 1, 7, 4))).toBe('07:04');
  });
});

describe('practice', () => {
  it('generates coherent varied scenarios and valid challenges', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const rng = createRng(i);
      const s = makeScenario(rng, (i % 10) / 10);
      const { OD, OS } = s.findings.iop;
      expect(OD).toBeGreaterThan(0);
      expect(OS).toBeGreaterThan(0);
      kinds.add(Math.max(OD, OS) >= 35 ? 'crisis' : Math.min(OD, OS) < 6 ? 'low' : Math.max(OD, OS) > 21 ? 'high' : 'norm');
      const c = makeChallenge(s.findings, rng);
      expect(c.options.length).toBeGreaterThanOrEqual(3);
      expect(c.correct).toBeGreaterThanOrEqual(0);
      expect(new Set(c.options).size).toBe(c.options.length);
    }
    expect(kinds.size).toBe(4);
  });
});

describe('mount / cleanup', () => {
  it('renders into the host, never calls done on its own, and cleanup empties the host', async () => {
    const { default: mod } = await import('./index');
    const rng = createRng(7);
    const sc = makeScenario(rng, 0.4);
    const host = document.createElement('div');
    document.body.appendChild(host);
    let calls = 0;
    const audio = { play() {}, music() {}, unlock() {}, setVolumes() {} };
    const fx = { shake() {}, flash() {}, burst() {}, floatText() {}, hitstop() {}, vignette() {} };
    const cleanup = mod.mount(host, { patient: sc.patient, findings: sc.findings, mode: 'practice', difficulty: 0.4, rng, audio, fx, reducedMotion: true } as never, () => { calls++; });
    await new Promise((r) => setTimeout(r, 30));
    expect(host.querySelector('.tn-root')).not.toBeNull();
    expect(calls).toBe(0);
    cleanup();
    expect(host.childElementCount).toBe(0);
    expect(host.classList.contains('tn-host')).toBe(false);
    expect(calls).toBe(0);
    host.remove();
  });
});
