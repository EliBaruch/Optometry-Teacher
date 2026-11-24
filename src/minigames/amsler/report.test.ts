import { describe, expect, it } from 'vitest';
import { buildFindings, type PatientProfile } from '@core';
import { describeAmsler, extentDeg, flagOf, locationOf, report } from './report';

const patient: PatientProfile = {
  name: 'Test', age: 77, sex: 'M',
  avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' },
};

describe('locationOf', () => {
  it('central when at or near fixation', () => {
    expect(locationOf({ result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 }, 'OD')).toBe('central');
    expect(locationOf({ result: 'metamorphopsia', center: { x: 1, y: 0 }, radius: 4 }, 'OS')).toBe('central');
  });

  it('temporal/nasal flip between eyes (x+ = patient right)', () => {
    const f = { result: 'paracentral-scotoma' as const, center: { x: 4, y: 0 }, radius: 1.5 };
    expect(locationOf(f, 'OD')).toBe('temporal');
    expect(locationOf(f, 'OS')).toBe('nasal');
  });

  it('combines superior/inferior with temporal/nasal', () => {
    const f = { result: 'paracentral-scotoma' as const, center: { x: -4, y: 4 }, radius: 1.5 };
    expect(locationOf(f, 'OD')).toBe('superonasal');
    expect(locationOf(f, 'OS')).toBe('superotemporal');
    expect(locationOf({ ...f, center: { x: 4, y: -4 } }, 'OD')).toBe('inferotemporal');
    expect(locationOf({ ...f, center: { x: 0, y: -5 } }, 'OD')).toBe('inferior');
  });
});

describe('describeAmsler / flag', () => {
  it('normal', () => {
    expect(describeAmsler({ result: 'normal' }, 'OD')).toMatch(/^Normal/);
    expect(flagOf({ result: 'normal' })).toBe('normal');
  });

  it('metamorphopsia with extent in degrees (1 square = 1°)', () => {
    const f = { result: 'metamorphopsia' as const, center: { x: 0, y: 0 }, radius: 4 };
    expect(extentDeg(f)).toBe(8);
    expect(describeAmsler(f, 'OS')).toBe('Metamorphopsia — central, 8° across');
    expect(flagOf(f)).toBe('abnormal');
  });

  it('paracentral scotoma names its field location', () => {
    expect(describeAmsler({ result: 'paracentral-scotoma', center: { x: 2, y: 0 }, radius: 2 }, 'OD'))
      .toBe('Paracentral scotoma — temporal, 4° across');
  });

  it('dense loss of the whole grid is critical', () => {
    const f = { result: 'central-scotoma' as const, center: { x: 0, y: 0 }, radius: 10 };
    expect(describeAmsler(f, 'OD')).toBe('Central scotoma — whole grid');
    expect(flagOf(f)).toBe('critical');
    expect(flagOf({ result: 'central-scotoma', center: { x: 0, y: 0 }, radius: 3 })).toBe('abnormal');
  });
});

describe('report', () => {
  it('returns one Amsler line per eye, OD first', () => {
    const f = buildFindings(77, { amsler: { OS: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 4 } } });
    const r = report(f, patient);
    expect(r).toEqual([
      { label: 'Amsler', value: 'Normal — lines straight, no missing areas', eye: 'OD', flag: 'normal' },
      { label: 'Amsler', value: 'Metamorphopsia — central, 8° across', eye: 'OS', flag: 'abnormal' },
    ]);
  });

  it('is pure (does not mutate findings)', () => {
    const f = buildFindings(60, { amsler: { OD: { result: 'central-scotoma' } } });
    const snap = JSON.stringify(f);
    report(f, patient);
    expect(JSON.stringify(f)).toBe(snap);
  });
});
