import { describe, expect, it } from 'vitest';
import { buildFindings } from '@core';
import { report } from './report';

describe('report()', () => {
  it('charts minus-cyl Rx and BCVA per eye, normal when fully correctable', () => {
    const f = buildFindings(30, {
      refraction: { OD: { sphere: -2.25, cylinder: -0.5, axis: 180 }, OS: { sphere: -2, cylinder: 0, axis: 180 } },
    });
    const r = report(f);
    expect(r).toContainEqual({ label: 'Manifest Rx', value: '−2.25 −0.50 × 180', eye: 'OD', flag: 'normal' });
    expect(r).toContainEqual({ label: 'Manifest Rx', value: '−2.00 DS', eye: 'OS', flag: 'normal' });
    expect(r).toContainEqual({ label: 'BCVA', value: '20/16', eye: 'OD', flag: 'normal' });
    expect(r.some((x) => x.label === 'Add')).toBe(false);
    expect(r.some((x) => x.label === 'Anisometropia')).toBe(false);
  });
  it('transposes plus-cyl input', () => {
    const f = buildFindings(30, { refraction: { OD: { sphere: -1, cylinder: 1, axis: 90 } } });
    expect(report(f).find((x) => x.eye === 'OD' && x.label === 'Manifest Rx')?.value).toBe('pl −1.00 × 180');
  });
  it('flags reduced BCVA as abnormal on both the Rx and BCVA lines', () => {
    const f = buildFindings(70, { va: { OS: { bestCorrected: 0.5 } } });
    const os = report(f).filter((x) => x.eye === 'OS');
    expect(os.every((x) => x.flag === 'abnormal')).toBe(true);
    expect(os.find((x) => x.label === 'BCVA')?.value).toBe('20/63');
  });
  it('adds the near Add for presbyopes (OU when equal)', () => {
    const f = buildFindings(58);
    expect(report(f)).toContainEqual({ label: 'Add', value: '+2.50', eye: 'OU', flag: 'normal' });
  });
  it('lists unequal adds per eye', () => {
    const f = buildFindings(50, { refraction: { OD: { add: 2 }, OS: { add: 1.5 } } });
    expect(report(f).filter((x) => x.label === 'Add').map((x) => x.eye)).toEqual(['OD', 'OS']);
  });
  it('flags anisometropia ≥ 1.00 D SE', () => {
    const f = buildFindings(25, { refraction: { OD: { sphere: 0.5, cylinder: 0, axis: 180 }, OS: { sphere: 3, cylinder: -0.5, axis: 90 } } });
    expect(report(f)).toContainEqual({ label: 'Anisometropia', value: 'ΔSE 2.25 D', eye: 'OU', flag: 'abnormal' });
  });
  it('notes a poorly defined endpoint for irregular astigmatism', () => {
    const f = buildFindings(22, { retinoscopyReflex: { OS: 'scissors' }, keratometry: { OS: { mires: 'distorted' } } });
    const r = report(f);
    expect(r).toContainEqual({ label: 'Endpoint', value: 'Poorly defined — irregular astigmatism', eye: 'OS', flag: 'abnormal' });
    expect(r.some((x) => x.label === 'Endpoint' && x.eye === 'OD')).toBe(false);
  });
  it('is pure', () => {
    const f = buildFindings(40);
    expect(report(f)).toEqual(report(f));
  });
});
