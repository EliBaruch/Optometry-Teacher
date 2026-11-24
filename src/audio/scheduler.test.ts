import { describe, expect, it } from 'vitest';
import { StepClock, stepDuration } from './scheduler';

describe('StepClock', () => {
  const quarter16 = stepDuration(120, 4); // 0.125 s per 16th

  it('returns nothing until started', () => {
    expect(new StepClock(quarter16).due(10)).toEqual([]);
  });

  it('schedules exactly the steps inside the lookahead window, once each', () => {
    const c = new StepClock(quarter16, { lookahead: 0.3 });
    c.start(1);
    expect(c.due(0.5)).toEqual([]);
    const a = c.due(1);
    expect(a.map((d) => d.step)).toEqual([0, 1, 2]);
    expect(a.map((d) => d.time)).toEqual([1, 1.125, 1.25]);
    // Calling again at the same time yields nothing new (no double triggers).
    expect(c.due(1)).toEqual([]);
    const b = c.due(1.25);
    expect(b.map((d) => d.step)).toEqual([3, 4]);
  });

  it('keeps contiguous timing across many wake-ups regardless of timer jitter', () => {
    const c = new StepClock(quarter16, { lookahead: 0.1 });
    c.start(0);
    const all: number[] = [];
    let now = 0;
    for (let i = 0; i < 400; i++) {
      now += 0.02 + (i % 7) * 0.004; // jittery wake-ups
      for (const d of c.due(now)) all.push(d.time);
    }
    for (let i = 1; i < all.length; i++) expect(all[i]! - all[i - 1]!).toBeCloseTo(0.125, 9);
  });

  it('skips ahead (instead of bursting) after falling far behind, preserving the step count', () => {
    const c = new StepClock(quarter16, { lookahead: 0.1, maxLag: 0.2 });
    c.start(0);
    c.due(0);
    const late = c.due(10);
    expect(late.length).toBeLessThanOrEqual(2);
    expect(late[0]!.time).toBeGreaterThanOrEqual(10);
    // Step index stays aligned with wall time so bars don't drift.
    expect(late[0]!.step).toBe(Math.round(late[0]!.time / 0.125));
  });

  it('applies swing without moving the beat', () => {
    const d = stepDuration(60, 4, 0.2);
    expect(d(0)).toBeCloseTo(0.3);
    expect(d(1)).toBeCloseTo(0.2);
    expect(d(0) + d(1) + d(2) + d(3)).toBeCloseTo(1);
  });

  it('guards against bad durations and caps work per call', () => {
    const c = new StepClock(() => Number.NaN, { lookahead: 10, maxPerCall: 16 });
    c.start(0);
    expect(c.due(0).length).toBe(16);
  });
});
