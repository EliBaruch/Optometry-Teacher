import { describe, expect, it } from 'vitest';
import { assess, efficiency, emptyProtocol, eyeScore, protocolScore, rxError } from './scoring';

const L = (sphere: number, cyl = 0, axis = 180) => ({ sphere, cyl, axis });

describe('rxError', () => {
  it('is exact within a quarter dioptre', () => {
    expect(rxError(L(-2, -0.5, 180), L(-2, -0.5, 180)).exact).toBe(true);
    expect(rxError(L(-2.25, -0.5, 180), L(-2, -0.5, 180)).exact).toBe(false);
  });
  it('measures cylinder as a vector (axis errors count)', () => {
    const e = rxError(L(0, -2, 80), L(0, -2, 90));
    expect(e.dCyl).toBeCloseTo(0.695, 2);
    expect(e.dM).toBeCloseTo(0);
  });
  it('signs over-minus negative', () => {
    expect(rxError(L(-2.5), L(-2)).dM).toBeCloseTo(-0.5);
  });
});

describe('eyeScore', () => {
  it('is 1 when exact and falls with error, over-minus costing more', () => {
    expect(eyeScore(rxError(L(-2), L(-2)))).toBe(1);
    const under = eyeScore(rxError(L(-1.5), L(-2)));
    const over = eyeScore(rxError(L(-2.5), L(-2)));
    expect(under).toBeLessThan(1);
    expect(over).toBeLessThan(under);
    expect(eyeScore(rxError(L(3), L(-3)))).toBe(0);
  });
});

describe('protocol & efficiency', () => {
  it('requires fog, JCC when there is cylinder, duochrome when VA allows', () => {
    const p = { ...emptyProtocol(), fogged: true, asks: 5, jccAxisFlips: 2, jccPowerFlips: 2, duochrome: true };
    expect(protocolScore(p, { trueCyl: 1, best: 0 })).toBe(1);
    expect(protocolScore({ ...p, jccAxisFlips: 0, jccPowerFlips: 0 }, { trueCyl: 0, best: 0 })).toBe(1);
    expect(protocolScore({ ...p, fogged: false }, { trueCyl: 0, best: 0 })).toBeCloseTo(2 / 3);
    expect(protocolScore({ ...p, duochrome: false }, { trueCyl: 0, best: 0.5 })).toBe(1);
  });
  it('efficiency decays after many steps', () => {
    expect(efficiency(20)).toBe(1);
    expect(efficiency(120)).toBeLessThan(1);
    expect(efficiency(1000)).toBe(0.4);
  });
});

describe('assess', () => {
  it('perfect only when both eyes exact and protocol complete', () => {
    const proto = { ...emptyProtocol(), fogged: true, asks: 6, duochrome: true, jccAxisFlips: 1, jccPowerFlips: 1 };
    const truth = { OD: L(-2, -0.75, 180), OS: L(-1.5) };
    const ctx = { OD: { trueCyl: 0.75, best: -0.1 }, OS: { trueCyl: 0, best: -0.1 } };
    const a = assess(truth, truth, { OD: proto, OS: proto }, ctx, false);
    expect(a.perfect).toBe(true);
    expect(a.accuracy).toBeGreaterThan(0.95);
    const b = assess({ OD: L(-3, -0.75, 180), OS: L(-1.5) }, truth, { OD: proto, OS: proto }, ctx, false);
    expect(b.perfect).toBe(false);
    expect(b.accuracy).toBeLessThan(a.accuracy);
  });
  it('does not reward copying an unverified starting point', () => {
    const truth = { OD: L(-2, -0.75, 180), OS: L(-1.5) };
    const ctx = { OD: { trueCyl: 0.75, best: -0.1 }, OS: { trueCyl: 0, best: -0.1 } };
    const idle = emptyProtocol();
    const a = assess(truth, truth, { OD: idle, OS: idle }, ctx, false);
    expect(a.accuracy).toBeLessThan(0.5);
    expect(a.perfect).toBe(false);
  });
});
