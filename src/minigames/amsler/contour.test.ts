import { describe, expect, it } from 'vitest';
import { createMask, loopArea, maskContours, paintDisc, smoothLoop } from './geometry';

describe('maskContours', () => {
  it('returns nothing for an empty map', () => {
    expect(maskContours(createMask())).toEqual([]);
  });

  it('traces one closed loop around a disc with about the right area', () => {
    const m = createMask();
    paintDisc(m, 2, -1, 3, 1);
    const loops = maskContours(m);
    expect(loops).toHaveLength(1);
    const a = Math.abs(loopArea(smoothLoop(loops[0]!)));
    expect(a).toBeGreaterThan(Math.PI * 9 * 0.85);
    expect(a).toBeLessThan(Math.PI * 9 * 1.1);
    // centred where it was painted
    const cx = loops[0]!.reduce((s, p) => s + p.x, 0) / loops[0]!.length;
    const cy = loops[0]!.reduce((s, p) => s + p.y, 0) / loops[0]!.length;
    expect(cx).toBeCloseTo(2, 0);
    expect(cy).toBeCloseTo(-1, 0);
  });

  it('separates two islands and finds a ring hole', () => {
    const two = createMask();
    paintDisc(two, -6, 0, 1.5, 1);
    paintDisc(two, 6, 0, 1.5, 1);
    expect(maskContours(two)).toHaveLength(2);

    const ring = createMask();
    paintDisc(ring, 0, 0, 5, 1);
    paintDisc(ring, 0, 0, 2.5, 0);
    expect(maskContours(ring)).toHaveLength(2);
  });

  it('closes loops along the grid edge', () => {
    const m = createMask();
    paintDisc(m, 10, 10, 3, 1);
    const loops = maskContours(m);
    expect(loops).toHaveLength(1);
    for (const p of loops[0]!) {
      expect(p.x).toBeLessThanOrEqual(10.2);
      expect(p.y).toBeLessThanOrEqual(10.2);
    }
  });
});
