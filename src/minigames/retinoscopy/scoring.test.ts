import { describe, expect, it } from 'vitest';
import { buildFindings } from '@core';
import { assess, assessEye, type EyeEntry } from './scoring';

const f = buildFindings(30, { refraction: { OD: { sphere: -2, cylinder: -1, axis: 90 }, OS: { sphere: 1, cylinder: 0, axis: 180 } } });
const entry = (over: Partial<EyeEntry>): EyeEntry => ({ net: { sphere: -2, cylinder: -1, axis: 90 }, noReflex: false, reflex: 'normal', wdUsed: 1.5, m1: { phi: 90, gross: -0.5 }, m2: { phi: 0, gross: -1.5 }, ...over });

describe('retinoscopy scoring', () => {
  it('an exact net Rx with the right working distance is perfect', () => {
    const a = assessEye('OD', f, 1.5, entry({}));
    expect(a.err).toBe(0);
    expect(a.acc).toBe(1);
    expect(a.perfect).toBe(true);
    expect(a.axisErr).toBe(0);
  });
  it('forgetting the working distance is flagged and costs accuracy', () => {
    const a = assessEye('OD', f, 1.5, entry({ wdUsed: 0, net: { sphere: -0.5, cylinder: -1, axis: 90 } }));
    expect(a.forgotWd).toBe(true);
    expect(a.wdOk).toBe(false);
    expect(a.perfect).toBe(false);
    expect(a.acc).toBeLessThan(0.6);
  });
  it('a wrong reflex description costs a little', () => {
    const a = assessEye('OD', f, 1.5, entry({ reflex: 'dull' }));
    expect(a.reflexOk).toBe(false);
    expect(a.acc).toBeCloseTo(0.88, 5);
  });
  it('a missing eye scores zero and caps the total', () => {
    const r = assess(f, 1.5, { OD: entry({}), OS: null }, 20000, false);
    expect(r.eyes.OS.state).toBe('skipped');
    expect(r.accuracy).toBeCloseTo(0.5, 2);
    expect(r.perfect).toBe(false);
  });
  it('both eyes right is perfect unless the motion guide was leaned on', () => {
    const os = entry({ net: { sphere: 1, cylinder: 0, axis: 180 }, m1: { phi: 180, gross: 2.5 }, m2: { phi: 90, gross: 2.5 } });
    expect(assess(f, 1.5, { OD: entry({}), OS: os }, 30000, false).perfect).toBe(true);
    expect(assess(f, 1.5, { OD: entry({}), OS: os }, 30000, true).perfect).toBe(false);
  });
  it('slow play loses at most 8%', () => {
    const os = entry({ net: { sphere: 1, cylinder: 0, axis: 180 } });
    expect(assess(f, 1.5, { OD: entry({}), OS: os }, 900000, false).accuracy).toBeGreaterThanOrEqual(0.92);
  });
  it('an absent reflex is correctly called "no reflex" and punishes an invented Rx', () => {
    const fa = buildFindings(60, { retinoscopyReflex: { OD: 'absent' } });
    expect(assessEye('OD', fa, 1.5, entry({ net: null, noReflex: true, reflex: 'absent' })).acc).toBe(1);
    expect(assessEye('OD', fa, 1.5, entry({})).acc).toBeLessThan(0.2);
    expect(assessEye('OS', f, 1.5, entry({ net: null, noReflex: true, reflex: 'absent' })).acc).toBeLessThan(0.2);
  });
  it('irregular (scissors) reflexes get slack on the endpoint', () => {
    const fk = buildFindings(25, { refraction: { OD: { sphere: -2, cylinder: -1, axis: 90 } }, retinoscopyReflex: { OD: 'scissors' } });
    const a = assessEye('OD', fk, 1.5, entry({ reflex: 'scissors', net: { sphere: -2.25, cylinder: -1, axis: 90 } }));
    expect(a.acc).toBeGreaterThan(0.99);
  });
});
