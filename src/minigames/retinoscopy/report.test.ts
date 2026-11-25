import { describe, expect, it } from 'vitest';
import { buildFindings } from '@core';
import { report } from './report';

const P = {} as never;

describe('retinoscopy report', () => {
  it('normal eyes read plano and normal', () => {
    const r = report(buildFindings(30), P);
    const ret = r.filter((x) => x.label === 'Ret');
    expect(ret).toHaveLength(2);
    expect(ret[0]).toMatchObject({ value: 'Plano', eye: 'OD', flag: 'normal' });
    expect(r.filter((x) => x.label === 'Ret reflex').every((x) => x.flag === 'normal')).toBe(true);
    expect(r.some((x) => x.label === 'Ret anisometropia')).toBe(false);
  });
  it('writes minus-cyl Rx, flags it, and notes anisometropia', () => {
    const f = buildFindings(25, {
      refraction: { OD: { sphere: -4, cylinder: -1.25, axis: 80 }, OS: { sphere: -1, cylinder: 0, axis: 180 } },
    });
    const r = report(f, P);
    expect(r.find((x) => x.label === 'Ret' && x.eye === 'OD')).toMatchObject({ value: '−4.00 −1.25 × 080', flag: 'abnormal' });
    expect(r.find((x) => x.label === 'Ret anisometropia')).toMatchObject({ eye: 'OU', flag: 'abnormal' });
  });
  it('transposes plus-cylinder input', () => {
    const f = buildFindings(25, { refraction: { OD: { sphere: -2, cylinder: 1, axis: 10 } } });
    expect(report(f, P).find((x) => x.label === 'Ret' && x.eye === 'OD')!.value).toBe('−1.00 −1.00 × 100');
  });
  it('flags scissors reflex as abnormal and an absent reflex as critical', () => {
    const f = buildFindings(30, { retinoscopyReflex: { OD: 'scissors', OS: 'absent' } });
    const r = report(f, P);
    expect(r.find((x) => x.label === 'Ret reflex' && x.eye === 'OD')).toMatchObject({ flag: 'abnormal' });
    expect(r.find((x) => x.label === 'Ret reflex' && x.eye === 'OS')).toMatchObject({ flag: 'critical' });
    expect(r.find((x) => x.label === 'Ret' && x.eye === 'OS')).toMatchObject({ flag: 'critical' });
  });
});
