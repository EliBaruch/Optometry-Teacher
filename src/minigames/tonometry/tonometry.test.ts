import { describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import { apparentOffset, classify, dyeBias, endpointOf, flagFor, icareMean, icareShot, pulse, pulseAmp } from './optics';
import { assess, endpointScore, scoreEye } from './scoring';
import { buildReport, report } from './report';
import { makeChallenge, makeScenario } from './practice';

describe('optics', () => {
  it('mires touch at the true IOP, overlap above, apart below', () => {
    expect(endpointOf(apparentOffset(18, 18, 0, 0))).toBe('touch');
    expect(endpointOf(apparentOffset(24, 18, 0, 0))).toBe('overlap');
    expect(endpointOf(apparentOffset(12, 18, 0, 0))).toBe('apart');
  });
  it('dye bias: thick under-reads, thin over-reads, none in band', () => {
    expect(dyeBias(0.5)).toBe(0);
    expect(dyeBias(0.95)).toBeLessThan(-3);
    expect(dyeBias(0.05)).toBeGreaterThan(3);
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
