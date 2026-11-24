import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { equalPowerCurve, makeImpulse } from './curves';

describe('curves', () => {
  it('builds a decaying stereo impulse of the right length', () => {
    const rng = createRng(1);
    const ir = makeImpulse(8000, { seconds: 2, rnd: () => rng.next() });
    expect(ir).toHaveLength(2);
    expect(ir[0]!.length).toBe(16000);
    const energy = (d: Float32Array, a: number, b: number) => {
      let e = 0;
      for (let i = a; i < b; i++) e += d[i]! * d[i]!;
      return e;
    };
    const d = ir[0]!;
    expect(energy(d, 0, 1600)).toBeGreaterThan(energy(d, 14400, 16000) * 20);
    expect(Math.max(...Array.from(d, Math.abs))).toBeLessThanOrEqual(0.6 + 1e-6);
    for (const x of d) expect(Number.isFinite(x)).toBe(true);
    // Channels are decorrelated (stereo width).
    expect(ir[0]!.slice(400, 800)).not.toEqual(ir[1]!.slice(400, 800));
  });

  it('equal-power curve hits its endpoints and keeps power constant in a crossfade', () => {
    const up = equalPowerCurve(0, 1, 33);
    const down = equalPowerCurve(1, 0, 33);
    expect(up[0]).toBe(0);
    expect(up[32]).toBe(1);
    expect(down[0]).toBe(1);
    for (let i = 0; i < 33; i++) expect(up[i]! ** 2 + down[i]! ** 2).toBeCloseTo(1, 5);
  });
});
