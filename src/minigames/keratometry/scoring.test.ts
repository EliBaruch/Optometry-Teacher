import { describe, expect, it } from 'vitest';
import type { Keratometry } from '@core';
import { assess, assessEye, axisTolerance, PAR_MS, timeFactor } from './scoring';

const wtr: Keratometry = { k1: 43, k2: 45, axisK1: 180, mires: 'regular' };
const kc: Keratometry = { k1: 48, k2: 52, axisK1: 60, mires: 'distorted' };
const reading = (theta: number, pH: number, pV: number, mires: Keratometry['mires'] = 'regular', focusErr = 0) => ({
  ins: { focus: 0, theta, pH, pV }, focusErr, mires,
});

describe('assessEye', () => {
  it('is perfect for an exact, focused reading with the right mire grade', () => {
    const a = assessEye('OD', wtr, reading(0, 43, 45));
    expect(a.perfect).toBe(true);
    expect(a.score).toBeCloseTo(1);
    expect(a.kErr).toBe(0);
    expect(a.axisErr).toBe(0);
  });
  it('accepts the instrument rotated 90° (horizontal drum on the steep meridian)', () => {
    const a = assessEye('OD', wtr, reading(90, 45, 43));
    expect(a.perfect).toBe(true);
  });
  it('tolerates 0.125 D and 5° but not more', () => {
    expect(assessEye('OD', wtr, reading(4, 43.125, 45)).perfect).toBe(true);
    expect(assessEye('OD', wtr, reading(0, 43.25, 45)).perfect).toBe(false);
    expect(assessEye('OD', wtr, reading(8, 43, 45)).perfect).toBe(false);
  });
  it('ignores the axis of a spherical cornea', () => {
    const a = assessEye('OS', { k1: 43, k2: 43, axisK1: 180, mires: 'regular' }, reading(57, 43, 43));
    expect(a.axisErr).toBeNull();
    expect(a.perfect).toBe(true);
  });
  it('loosens the axis tolerance for low cylinder', () => {
    expect(axisTolerance(2)).toBe(5);
    expect(axisTolerance(0.75)).toBe(10);
    expect(axisTolerance(0.25)).toBe(20);
    expect(axisTolerance(0)).toBeNull();
  });
  it('penalises bad focus and a wrong mire grade', () => {
    const blurry = assessEye('OD', wtr, reading(0, 43, 45, 'regular', 0.8));
    expect(blurry.focusOk).toBe(false);
    expect(blurry.score).toBeLessThan(1);
    const missed = assessEye('OD', kc, reading(60, 48, 52, 'regular'));
    expect(missed.miresOk).toBe(false);
    expect(missed.score).toBeCloseTo(0.8);
  });
  it('allows a wider K tolerance on a distorted cornea', () => {
    expect(assessEye('OD', kc, reading(60, 48.5, 52.5, 'distorted')).perfect).toBe(true);
  });
  it('degrades smoothly with large errors', () => {
    const a = assessEye('OD', wtr, reading(45, 40, 48, 'irregular', 2));
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThan(0.3);
  });
});

describe('assess', () => {
  const truth = { OD: wtr, OS: kc };
  it('averages both eyes; an unmeasured eye scores zero', () => {
    const one = assess(truth, { OD: reading(0, 43, 45) }, 60_000);
    expect(one.accuracy).toBeCloseTo(0.5);
    expect(one.perfect).toBe(false);
    const both = assess(truth, { OD: reading(0, 43, 45), OS: reading(60, 48, 52, 'distorted') }, 60_000);
    expect(both.accuracy).toBe(1);
    expect(both.perfect).toBe(true);
  });
  it('trims a little for slow play', () => {
    expect(timeFactor(PAR_MS)).toBe(1);
    expect(timeFactor(PAR_MS * 10)).toBeCloseTo(0.85);
    const slow = assess(truth, { OD: reading(0, 43, 45), OS: reading(60, 48, 52, 'distorted') }, PAR_MS * 3);
    expect(slow.accuracy).toBeCloseTo(0.85);
    expect(slow.perfect).toBe(false);
  });
});
