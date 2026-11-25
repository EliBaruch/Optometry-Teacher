import { describe, expect, it } from 'vitest';
import type { Keratometry } from '@core';
import {
  axisDiff, eighth, fusedH, fusedV, layout, meridianPower, mireRadius, normalizeK, orientation, quarter, radiusMm,
  readingOf, torsion, travel, wrapAxis, irregularity, fmtCornealCyl, fmtReading,
} from './optics';

const wtr: Keratometry = { k1: 43, k2: 45, axisK1: 180, mires: 'regular' };
const obl: Keratometry = { k1: 42.5, k2: 44.5, axisK1: 35, mires: 'regular' };

describe('angles', () => {
  it('wraps axes to 1..180', () => {
    expect(wrapAxis(0)).toBe(180);
    expect(wrapAxis(180)).toBe(180);
    expect(wrapAxis(190)).toBe(10);
    expect(wrapAxis(-5)).toBe(175);
    expect(wrapAxis(270)).toBe(90);
  });
  it('measures the shortest axis difference', () => {
    expect(axisDiff(5, 175)).toBe(10);
    expect(axisDiff(90, 90)).toBe(0);
    expect(axisDiff(180, 90)).toBe(90);
  });
  it('rounds to clinical and drum steps', () => {
    expect(quarter(43.13)).toBe(43.25);
    expect(eighth(43.06)).toBe(43);
    expect(eighth(43.07)).toBe(43.125);
  });
});

describe('corneal power matrix', () => {
  it('measures K1 along the flat meridian and K2 90° away', () => {
    expect(meridianPower(wtr, 180)).toBeCloseTo(43);
    expect(meridianPower(wtr, 90)).toBeCloseTo(45);
    expect(meridianPower(obl, 35)).toBeCloseTo(42.5);
    expect(meridianPower(obl, 125)).toBeCloseTo(44.5);
  });
  it('gives intermediate powers off-meridian (P = K1cos² + K2sin²)', () => {
    expect(meridianPower(wtr, 45)).toBeCloseTo(44);
  });
  it('has zero torsion only on a principal meridian', () => {
    expect(torsion(wtr, 180)).toBeCloseTo(0);
    expect(torsion(wtr, 90)).toBeCloseTo(0);
    expect(Math.abs(torsion(wtr, 45))).toBeCloseTo(1); // (K2-K1)/2
    expect(Math.abs(torsion(obl, 50))).toBeGreaterThan(0.4);
    expect(torsion({ ...wtr, k2: 43 }, 40)).toBeCloseTo(0); // a sphere has no principal meridian
  });
  it('converts power to radius with the keratometric index 1.3375', () => {
    expect(radiusMm(43.25)).toBeCloseTo(7.803, 2);
    expect(radiusMm(45)).toBeCloseTo(7.5, 3);
  });
  it('normalises so K1 is the flat meridian', () => {
    expect(normalizeK({ k1: 45, k2: 43, axisK1: 90, mires: 'regular' })).toEqual({ k1: 43, k2: 45, axisK1: 180, mires: 'regular' });
  });
  it('images a toric cornea as an ellipse, smaller along the steep meridian', () => {
    expect(mireRadius(wtr, 90)).toBeLessThan(mireRadius(wtr, 180));
    expect(mireRadius({ ...wtr, k2: 43 }, 37)).toBeCloseTo(mireRadius({ ...wtr, k2: 43 }, 122));
  });
  it('irregularity is zero for a regular cornea and grows with grade', () => {
    expect(irregularity('regular', 5, 1)).toBe(0);
    const max = (g: 'irregular' | 'distorted') => Math.max(...Array.from({ length: 64 }, (_, i) => Math.abs(irregularity(g, 5, (i / 64) * Math.PI * 2))));
    expect(max('distorted')).toBeGreaterThan(max('irregular'));
  });
});

describe('mire layout', () => {
  const ins = (theta: number, pH: number, pV: number) => ({ focus: 0, theta, pH, pV });
  it('fuses both sign pairs only at the true K on a principal meridian, in focus', () => {
    const l = layout(wtr, ins(0, 43, 45), 0);
    expect(fusedH(l)).toBe(true);
    expect(fusedV(l)).toBe(true);
    expect(l.doubling.x).toBeCloseTo(0);
    expect(l.blur).toBe(0);
  });
  it('also fuses with the instrument turned 90° (drums swap K1/K2)', () => {
    const l = layout(wtr, ins(90, 45, 43), 0);
    expect(fusedH(l) && fusedV(l)).toBe(true);
  });
  it('separates the plus signs when the drum is off by a quarter dioptre', () => {
    expect(fusedH(layout(wtr, ins(0, 43.25, 45), 0))).toBe(false);
    expect(Math.abs(layout(wtr, ins(0, 43.25, 45), 0).gapH)).toBeGreaterThan(0.03);
  });
  it('breaks the plus-sign bars when off-axis on an astigmatic cornea', () => {
    const l = layout(obl, ins(50, meridianPower(obl, 50), meridianPower(obl, 140)), 0);
    expect(Math.abs(l.gapH)).toBeLessThan(1e-9);
    expect(Math.abs(l.skewH)).toBeGreaterThan(0.03);
    expect(fusedH(l)).toBe(false);
  });
  it('doubles and blurs the reference image when out of focus', () => {
    const l = layout(wtr, ins(0, 43, 45), 1);
    expect(Math.hypot(l.doubling.x, l.doubling.y)).toBeGreaterThan(0.05);
    expect(l.blur).toBeGreaterThan(0);
  });
  it('an irregular cornea never fuses perfectly everywhere', () => {
    const kc: Keratometry = { k1: 48, k2: 52, axisK1: 60, mires: 'distorted' };
    const angles = [60, 61, 59, 150];
    const any = angles.some((t) => {
      const l = layout(kc, ins(t, meridianPower(kc, t), meridianPower(kc, t + 90)), 0, 4242);
      return fusedH(l) && fusedV(l);
    });
    expect(any).toBe(false);
  });
  it('travel saturates', () => {
    expect(travel(0)).toBe(0);
    expect(Math.abs(travel(20))).toBeLessThanOrEqual(0.5);
    expect(travel(-1)).toBeLessThan(0);
  });
});

describe('readings & formatting', () => {
  it('reads flat K @ axis from the drums whichever drum is flatter', () => {
    expect(readingOf({ theta: 0, pH: 43, pV: 45 })).toEqual({ k1: 43, k2: 45, axisK1: 180 });
    expect(readingOf({ theta: 30, pH: 46, pV: 44 })).toEqual({ k1: 44, k2: 46, axisK1: 120 });
  });
  it('classifies orientation by the flat meridian', () => {
    expect(orientation(180)).toBe('with-the-rule');
    expect(orientation(10)).toBe('with-the-rule');
    expect(orientation(90)).toBe('against-the-rule');
    expect(orientation(45)).toBe('oblique');
  });
  it('formats K and minus-cylinder corneal astigmatism', () => {
    expect(fmtReading({ k1: 43, k2: 45, axisK1: 180 })).toBe('43.00 @ 180 / 45.00 @ 090');
    expect(fmtCornealCyl({ k1: 43, k2: 45, axisK1: 180 })).toBe('2.00 D WTR (−2.00 × 180)');
    expect(fmtCornealCyl({ k1: 43.5, k2: 43.5, axisK1: 180 })).toBe('Spherical');
    expect(fmtCornealCyl({ k1: 42, k2: 43.25, axisK1: 95 })).toBe('1.25 D ATR (−1.25 × 095)');
  });
});
