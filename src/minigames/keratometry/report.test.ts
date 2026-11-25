import { describe, expect, it } from 'vitest';
import { buildFindings, type Keratometry } from '@core';
import { report } from './report';

const withK = (OD: Keratometry, OS: Keratometry) => buildFindings(30, { keratometry: { OD, OS } });

describe('report', () => {
  it('writes K readings, corneal astigmatism and mires for each eye of a normal exam', () => {
    const lines = report(buildFindings(40));
    expect(lines).toHaveLength(6);
    expect(lines.map((l) => l.eye)).toEqual(['OD', 'OD', 'OD', 'OS', 'OS', 'OS']);
    expect(lines[0]).toEqual({ label: 'K1 / K2', value: '43.25 @ 180 / 43.75 @ 090', eye: 'OD', flag: 'normal' });
    expect(lines[1]).toEqual({ label: 'Corneal astigmatism', value: '0.50 D WTR (−0.50 × 180)', eye: 'OD', flag: 'normal' });
    expect(lines[2]!.value).toMatch(/^Regular/);
    expect(lines.every((l) => l.flag === 'normal')).toBe(true);
  });

  it('flags a steep K above 47 D and irregular mires (keratoconus)', () => {
    const lines = report(withK(
      { k1: 45.5, k2: 47.25, axisK1: 30, mires: 'irregular' },
      { k1: 47, k2: 51.5, axisK1: 40, mires: 'distorted' },
    ));
    const od = lines.filter((l) => l.eye === 'OD');
    const os = lines.filter((l) => l.eye === 'OS');
    expect(od[0]).toMatchObject({ value: '45.50 @ 030 / 47.25 @ 120', flag: 'abnormal' });
    expect(od[1]).toMatchObject({ value: '1.75 D WTR (−1.75 × 030)', flag: 'normal' });
    expect(od[2]).toMatchObject({ flag: 'abnormal' });
    expect(os[0]).toMatchObject({ value: '47.00 @ 040 / 51.50 @ 130', flag: 'abnormal' });
    expect(os[1]).toMatchObject({ value: '4.50 D oblique (−4.50 × 040)', flag: 'abnormal' });
    expect(os[2]!.value).toMatch(/^Distorted/);
  });

  it('flags steep K even with regular mires, and a very flat cornea', () => {
    const lines = report(withK(
      { k1: 46.5, k2: 47.5, axisK1: 180, mires: 'regular' },
      { k1: 39.5, k2: 40, axisK1: 180, mires: 'regular' },
    ));
    expect(lines[0]!.flag).toBe('abnormal');
    expect(lines[3]!.flag).toBe('abnormal');
    expect(lines[2]!.flag).toBe('normal');
  });

  it('normalises swapped K1/K2 so K1 is always the flat meridian', () => {
    const lines = report(withK({ k1: 44.5, k2: 43, axisK1: 90, mires: 'regular' }, { k1: 43, k2: 43, axisK1: 180, mires: 'regular' }));
    expect(lines[0]!.value).toBe('43.00 @ 180 / 44.50 @ 090');
    expect(lines[1]!.value).toBe('1.50 D WTR (−1.50 × 180)');
    expect(lines[4]!.value).toBe('Spherical');
  });

  it('is pure', () => {
    const f = buildFindings(50);
    expect(report(f)).toEqual(report(f));
  });

  it('never uses forbidden player-facing words', () => {
    const text = JSON.stringify(report(buildFindings(30)));
    expect(text).not.toMatch(/\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i);
  });
});
