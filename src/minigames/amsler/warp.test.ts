import { describe, expect, it } from 'vitest';
import type { AmslerFinding } from '@core';
import {
  directionOf, maskCount, regionRadiusAt, scotomaDensity, trueRegionMask, warpOffset, CELL_DEG,
} from './geometry';

const RADII = [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8];
const meta = (r: number, cx = 0, cy = 0): AmslerFinding => ({ result: 'metamorphopsia', center: { x: cx, y: cy }, radius: r });

describe('metamorphopsia warp never folds', () => {
  it('the warped radial coordinate strictly increases along every ray (r 0.5–8°, strength 1)', () => {
    for (const r of RADII) {
      const f = meta(r, 1, -2);
      for (let a = 0; a < 24; a++) {
        const th = (a / 24) * Math.PI * 2;
        const ux = Math.cos(th);
        const uy = Math.sin(th);
        let prev = -Infinity;
        let minStep = Infinity;
        for (let t = 0; t <= r * 2.5; t += r / 80) {
          const x = 1 + ux * t;
          const y = -2 + uy * t;
          const o = warpOffset(x, y, f, 1);
          const radial = (x + o.dx - 1) * ux + (y + o.dy + 2) * uy;
          minStep = Math.min(minStep, radial - prev);
          prev = radial;
        }
        expect(minStep, `r=${r} θ=${th.toFixed(2)}`).toBeGreaterThan(0);
      }
    }
  });

  it('the local Jacobian stays well-conditioned (no knots, no starbursts)', () => {
    const h = 1e-3;
    for (const r of RADII) {
      const f = meta(r);
      let minDet = Infinity;
      for (let x = -r * 2; x <= r * 2; x += r / 25) {
        for (let y = -r * 2; y <= r * 2; y += r / 25) {
          const o = warpOffset(x, y, f, 1);
          const ox = warpOffset(x + h, y, f, 1);
          const oy = warpOffset(x, y + h, f, 1);
          const a = 1 + (ox.dx - o.dx) / h;
          const b = (oy.dx - o.dx) / h;
          const c = (ox.dy - o.dy) / h;
          const d = 1 + (oy.dy - o.dy) / h;
          minDet = Math.min(minDet, a * d - b * c);
        }
      }
      expect(minDet, `r=${r}`).toBeGreaterThan(0.25);
    }
  });

  it('is still clearly visible for small and large lesions', () => {
    for (const r of [1, 3, 6]) {
      let peak = 0;
      for (let t = 0; t <= r * 1.2; t += r / 40) {
        const o = warpOffset(t * 0.8, t * 0.6, meta(r), 1);
        peak = Math.max(peak, Math.hypot(o.dx, o.dy));
      }
      expect(peak, `r=${r}`).toBeGreaterThan(Math.min(0.15, 0.1 * r));
    }
  });
});

describe('truth region matches what is rendered', () => {
  it('scotoma truth follows the organic edge and its 50% density line', () => {
    const f: AmslerFinding = { result: 'paracentral-scotoma', center: { x: -3, y: 2 }, radius: 3 };
    for (let a = 0; a < 16; a++) {
      const th = (a / 16) * Math.PI * 2;
      const R = regionRadiusAt(f, th);
      expect(R).toBeGreaterThan(3 * 0.85);
      expect(R).toBeLessThan(3 * 1.15);
      const inX = -3 + Math.cos(th) * (R - 0.4);
      const inY = 2 + Math.sin(th) * (R - 0.4);
      expect(scotomaDensity(inX, inY, f)).toBeGreaterThan(0.5);
      const outX = -3 + Math.cos(th) * (R + 0.4);
      const outY = 2 + Math.sin(th) * (R + 0.4);
      expect(scotomaDensity(outX, outY, f)).toBeLessThan(0.5);
    }
    const area = maskCount(trueRegionMask(f)) * CELL_DEG ** 2;
    expect(area).toBeGreaterThan(Math.PI * 9 * 0.9);
    expect(area).toBeLessThan(Math.PI * 9 * 1.1);
  });
});

describe('directionOf', () => {
  it('agrees with plain directions and treats near-fixation as central', () => {
    expect(directionOf({ result: 'paracentral-scotoma', center: { x: 0.5, y: 0.3 }, radius: 2 }).central).toBe(true);
    expect(directionOf({ result: 'paracentral-scotoma', center: { x: 4, y: 3 }, radius: 1 })).toEqual({ central: false, v: 1, h: 1 });
    // y small relative to x -> purely horizontal
    expect(directionOf({ result: 'paracentral-scotoma', center: { x: -5, y: 1 }, radius: 1 })).toEqual({ central: false, v: 0, h: -1 });
    expect(directionOf({ result: 'paracentral-scotoma', center: { x: 0, y: -4 }, radius: 1 })).toEqual({ central: false, v: -1, h: 0 });
  });
});
