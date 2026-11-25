import { describe, expect, it } from 'vitest';
import { clampCentre, HUB_R, layoutPetals, overlaps, petalRects, petalSpec } from './radialLayout';

describe('radial wheel layout', () => {
  for (const stageW of [360, 375, 520, 960]) {
    const spec = petalSpec(stageW);
    for (let n = 1; n <= 8; n++) {
      it(`n=${n} at ${stageW}px: no petal overlaps another or the hub`, () => {
        const l = layoutPetals(n, spec);
        const rs = petalRects(l, spec);
        for (let i = 0; i < rs.length; i++) {
          for (let j = i + 1; j < rs.length; j++) expect(overlaps(rs[i]!, rs[j]!)).toBe(false);
          expect(overlaps(rs[i]!, { x: -HUB_R, y: -HUB_R, w: HUB_R * 2, h: HUB_R * 2 })).toBe(false);
        }
      });
    }
  }

  it('touch targets are at least 44px tall', () => {
    expect(petalSpec(375).h).toBeGreaterThanOrEqual(44);
    expect(petalSpec(960).h).toBeGreaterThanOrEqual(44);
  });

  it('the wheel for 8 petals fits a phone-width stage and a short stage after clamping', () => {
    const spec = petalSpec(375);
    const l = layoutPetals(8, spec);
    expect(l.halfW * 2 + 16).toBeLessThanOrEqual(375);
    for (const tap of [0, 5, 190, 370, 375]) {
      const cx = clampCentre(tap, l.halfW, 375);
      expect(cx - l.halfW).toBeGreaterThanOrEqual(0);
      expect(cx + l.halfW).toBeLessThanOrEqual(375);
    }
    for (const tap of [0, 200, 460]) {
      const cy = clampCentre(tap, l.halfH, 460);
      expect(cy - l.halfH).toBeGreaterThanOrEqual(0);
      expect(cy + l.halfH).toBeLessThanOrEqual(460);
    }
  });

  it('squeezes the pitch on a short stage without overlapping', () => {
    const spec = petalSpec(960);
    const l = layoutPetals(8, spec, 200);
    const rs = petalRects(l, spec);
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) expect(overlaps(rs[i]!, rs[j]!)).toBe(false);
  });
});
