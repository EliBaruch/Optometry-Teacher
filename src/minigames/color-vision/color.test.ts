import { describe, expect, it } from 'vitest';
import { dichromatLms, hexToLinear, lmsToRgb, offsetLms, opponentDistance, rgbToLms, simulate, toLinear, toSrgb, type Vec3 } from './color';

describe('colour science', () => {
  it('round-trips linear RGB through LMS', () => {
    const c: Vec3 = [0.3, 0.5, 0.2];
    const back = lmsToRgb(rgbToLms(c));
    back.forEach((v, i) => expect(v).toBeCloseTo(c[i]!, 6));
  });

  it('round-trips sRGB transfer', () => {
    for (const v of [0, 0.02, 0.2, 0.5, 0.9, 1]) expect(toSrgb(toLinear(v))).toBeCloseTo(v, 6);
  });

  it('parses hex colours', () => {
    expect(hexToLinear('#ffffff')).toEqual([1, 1, 1]);
    expect(hexToLinear('#000')).toEqual([0, 0, 0]);
  });

  it('collapses colours that differ only in the missing cone', () => {
    const base = rgbToLms(hexToLinear('#c49a5a'));
    const cases: [Vec3, 'protan' | 'deutan' | 'tritan'][] = [
      [[0.2, 0, 0], 'protan'],
      [[0, -0.2, 0], 'deutan'],
      [[0, 0, 0.4], 'tritan'],
    ];
    for (const [d, axis] of cases) {
      const a = dichromatLms(base, axis);
      const b = dichromatLms(rgbToLms(offsetLms(base, d)), axis);
      a.forEach((v, i) => expect(b[i]).toBeCloseTo(v, 6));
    }
  });

  it('leaves colours alone at severity 0 and changes them at severity 1', () => {
    const red: Vec3 = [0.8, 0.05, 0.05];
    expect(simulate(red, 'protan', 0)).toEqual(red);
    expect(opponentDistance(simulate(red, 'protan', 1), red)).toBeGreaterThan(0.5);
  });

  it('keeps neutral greys roughly neutral for dichromats', () => {
    const grey: Vec3 = [0.4, 0.4, 0.4];
    for (const axis of ['protan', 'deutan', 'tritan'] as const) {
      expect(opponentDistance(simulate(grey, axis, 1), grey)).toBeLessThan(0.12);
    }
  });
});
