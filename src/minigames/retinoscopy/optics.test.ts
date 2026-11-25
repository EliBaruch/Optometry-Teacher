import { describe, expect, it } from 'vitest';
import {
  accuracyFromError, ametropia, breakAngle, errorAlong, fmtRx, meridianPower, netFromLocks, normalizeRx, powerVector,
  principalMeridians, reflexGeo, vectorError, wdPower, type Rx,
} from './optics';

describe('working distance', () => {
  it('uses the conventional lenses', () => {
    expect(wdPower(67)).toBe(1.5);
    expect(wdPower(50)).toBe(2);
    expect(wdPower(100)).toBe(1);
  });
});

describe('meridian power', () => {
  const rx: Rx = { sphere: -1, cylinder: -2, axis: 90 };
  it('carries only the sphere along the axis and sphere+cyl across it', () => {
    expect(meridianPower(rx, 90)).toBeCloseTo(-1);
    expect(meridianPower(rx, 180)).toBeCloseTo(-3);
    expect(meridianPower(rx, 135)).toBeCloseTo(-2);
  });
  it('principal meridians', () => {
    const p = principalMeridians(rx);
    expect(p.phiA).toBe(90);
    expect(p.phiB).toBe(0);
    expect(p.pB).toBe(-3);
  });
  it('transposes plus cylinder', () => {
    expect(normalizeRx({ sphere: -3, cylinder: 2, axis: 10 })).toEqual({ sphere: -1, cylinder: -2, axis: 100 });
  });
});

describe('neutrality and motion direction', () => {
  it('emmetrope at 67 cm sees WITH motion until +1.50 is added', () => {
    const rx: Rx = { sphere: 0, cylinder: 0, axis: 180 };
    const e = ametropia(rx, 0, 1.5);
    expect(e.e1).toBeCloseTo(-1.5);
    expect(reflexGeo(e.e1, e.e2, 180, 180).motion).toBe('with');
    const n = ametropia(rx, 1.5, 1.5);
    expect(reflexGeo(n.e1, n.e2, 180, 180).motion).toBe('neutral');
    expect(reflexGeo(n.e1, n.e2, 180, 180).fill).toBe(1);
  });
  it('a -5.00 myope shows AGAINST motion with plano', () => {
    const e = ametropia({ sphere: -5, cylinder: 0, axis: 180 }, 0, 1.5);
    expect(reflexGeo(e.e1, e.e2, 180, 90).motion).toBe('against');
  });
  it('a -1.50 myope is neutral at 67 cm with no lens (far point = working distance)', () => {
    const e = ametropia({ sphere: -1.5, cylinder: 0, axis: 180 }, 0, 1.5);
    expect(Math.abs(e.e1)).toBeLessThan(1e-9);
  });
  it('a -0.50 myope still shows WITH (myopia less than the working distance)', () => {
    const e = ametropia({ sphere: -0.5, cylinder: 0, axis: 180 }, 0, 1.5);
    expect(reflexGeo(e.e1, e.e2, 180, 0).motion).toBe('with');
  });
  it('speed rises, width and brightness grow toward neutral', () => {
    const far = reflexGeo(3, 3, 180, 0);
    const mid = reflexGeo(1, 1, 180, 0);
    const near = reflexGeo(0.25, 0.25, 180, 0);
    expect(near.gain).toBeGreaterThan(mid.gain);
    expect(mid.gain).toBeGreaterThan(far.gain);
    expect(near.halfWidth).toBeGreaterThan(far.halfWidth);
    expect(near.brightness).toBeGreaterThan(far.brightness);
  });
});

describe('astigmatism cues', () => {
  const rx: Rx = { sphere: 0, cylinder: -2, axis: 90 };
  const { e1, e2 } = ametropia(rx, 1.5, 1.5); // sphere meridian neutral, other meridian -2 D too plus? e2 = 2
  it('streak on a principal meridian: no break', () => {
    expect(breakAngle(reflexGeo(e1, e2, 90, 90), 90)).toBeLessThan(0.5);
    expect(breakAngle(reflexGeo(e1, e2, 90, 180), 180)).toBeLessThan(0.5);
  });
  it('off-axis sweep: the reflex breaks away from the streak', () => {
    expect(breakAngle(reflexGeo(e1, e2, 90, 135), 135)).toBeGreaterThan(20);
  });
  it('a meridian can be neutral while the other is not', () => {
    expect(reflexGeo(e1, e2, 90, 90).fill).toBe(1);
    expect(reflexGeo(e1, e2, 90, 180).fill).toBe(0);
    expect(errorAlong(rx, 1.5, 1.5, 180)).toBeCloseTo(2);
  });
});

describe('net Rx from the power cross', () => {
  it('subtracts the working-distance lens from each meridian', () => {
    const rx: Rx = { sphere: -1, cylinder: -1.5, axis: 90 };
    const wd = 1.5;
    const g1 = -1 + wd; // meridian 90 (along the axis)
    const g2 = -2.5 + wd; // meridian 180
    const net = netFromLocks({ phi: 90, gross: g1 }, { phi: 0, gross: g2 }, wd);
    expect(net).toEqual(rx);
  });
  it('forgetting the working distance leaves the Rx 1.50 D too plus', () => {
    const net = netFromLocks({ phi: 0, gross: 1.5 }, { phi: 90, gross: 1.5 }, 0);
    expect(net.sphere).toBe(1.5);
  });
  it('collapses to a sphere when both meridians agree', () => {
    expect(netFromLocks({ phi: 0, gross: 0.5 }, { phi: 90, gross: 0.5 }, 1.5)).toEqual({ sphere: -1, cylinder: 0, axis: 180 });
  });
  it('handles a swept meridian given the other way round', () => {
    const rx: Rx = { sphere: 2, cylinder: -1, axis: 45 };
    const wd = 2;
    const m1 = { phi: 135, gross: meridianPower(rx, 135) + wd };
    const m2 = { phi: 45, gross: meridianPower(rx, 45) + wd };
    expect(netFromLocks(m1, m2, wd)).toEqual(rx);
  });
});

describe('scoring', () => {
  const t: Rx = { sphere: -2, cylinder: -1, axis: 180 };
  it('is 1 for an exact match and shrinks with error', () => {
    expect(vectorError(t, t)).toBe(0);
    expect(accuracyFromError(0)).toBe(1);
    expect(accuracyFromError(0.5)).toBeGreaterThan(0.75);
    expect(accuracyFromError(1.5)).toBeLessThan(0.25);
    expect(accuracyFromError(5)).toBe(0);
  });
  it('a 90 deg axis error costs a full cylinder in J0', () => {
    expect(vectorError(t, { ...t, axis: 90 })).toBeCloseTo(1, 5);
  });
  it('power vector of a sphere is pure M', () => {
    const v = powerVector({ sphere: -3, cylinder: 0, axis: 180 });
    expect(v.M).toBe(-3);
    expect(Math.abs(v.J0) + Math.abs(v.J45)).toBe(0);
  });
});

describe('formatting', () => {
  it('writes chart-style Rx', () => {
    expect(fmtRx({ sphere: -2.5, cylinder: -1, axis: 90 })).toBe('−2.50 −1.00 × 090');
    expect(fmtRx({ sphere: 1.25, cylinder: 0, axis: 180 })).toBe('+1.25 DS');
    expect(fmtRx({ sphere: 0, cylinder: 0, axis: 180 })).toBe('Plano');
    expect(fmtRx({ sphere: 0, cylinder: -0.75, axis: 5 })).toBe('Plano −0.75 × 005');
  });
});
