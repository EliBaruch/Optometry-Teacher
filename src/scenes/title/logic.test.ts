import { describe, expect, it } from 'vitest';
import { beamIllumination, blinkAperture, damp, gazeFromPointer, pupilForLight, sweepPhase } from './logic';

describe('title logic', () => {
  it('centres gaze at the eye and bounds it far away', () => {
    expect(gazeFromPointer(100, 100, 100, 100, 300)).toEqual({ x: 0, y: 0 });
    const g = gazeFromPointer(99999, -99999, 0, 0, 300);
    expect(g.x).toBeGreaterThan(0);
    expect(g.y).toBeLessThan(0);
    expect(Math.hypot(g.x, g.y)).toBeLessThanOrEqual(0.62 + 1e-9);
  });
  it('damps toward the target without overshoot', () => {
    const v = damp(0, 1, 8, 0.1);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
    expect(damp(0, 1, 8, 100)).toBeCloseTo(1);
  });
  it('sweeps periodically and idles between', () => {
    expect(sweepPhase(0)).toBe(-1);
    expect(sweepPhase(1.2 + 1.3)).toBeCloseTo(0.5);
    expect(sweepPhase(1.2 + 7 + 1.3)).toBeCloseTo(0.5);
    expect(sweepPhase(6)).toBe(-1);
  });
  it('constricts the pupil under the beam', () => {
    expect(beamIllumination(-1)).toBe(0);
    expect(beamIllumination(0.5)).toBe(1);
    expect(pupilForLight(1)).toBeLessThan(pupilForLight(0));
  });
  it('blinks closed then fully open', () => {
    expect(blinkAperture(0)).toBe(1);
    expect(blinkAperture(0.38)).toBeCloseTo(0);
    expect(blinkAperture(0.999)).toBeGreaterThan(0.95);
  });
});
