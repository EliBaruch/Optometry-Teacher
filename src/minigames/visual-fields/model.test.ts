import { describe, expect, it } from 'vitest';
import type { FieldDefect } from '@core';
import { blindSpotDepth, defectDepth, GRID_30_2, grid242, lossAt, normalSensitivity, snapToGrid, trueThreshold } from './model';

const ALL: FieldDefect[] = [
  'full', 'constricted', 'central-scotoma', 'cecocentral-scotoma', 'enlarged-blind-spot',
  'superior-arcuate', 'inferior-arcuate', 'nasal-step', 'superior-altitudinal', 'inferior-altitudinal',
  'temporal-hemianopia', 'nasal-hemianopia', 'left-hemianopia', 'right-hemianopia',
  'left-superior-quadrantanopia', 'right-superior-quadrantanopia', 'left-inferior-quadrantanopia', 'right-inferior-quadrantanopia',
  'curtain-superior', 'curtain-inferior', 'curtain-temporal', 'curtain-nasal', 'temporal-island',
];

describe('test grids', () => {
  it('30-2 has 76 points and 24-2 has 54', () => {
    expect(GRID_30_2.length).toBe(76);
    expect(grid242('OD').length).toBe(54);
    expect(grid242('OS').length).toBe(54);
  });
  it('24-2 nasal points sit on the nasal side of each eye', () => {
    expect(grid242('OD').filter((p) => Math.abs(p.x) === 27).every((p) => p.x === -27)).toBe(true);
    expect(grid242('OS').filter((p) => Math.abs(p.x) === 27).every((p) => p.x === 27)).toBe(true);
  });
  it('snaps to the nearest grid location and rejects points outside the bowl', () => {
    expect(snapToGrid(2, 4)).toEqual({ x: 3, y: 3 });
    expect(snapToGrid(40, 40)).toBeNull();
  });
});

describe('blind spot', () => {
  it('is temporal in each eye, 15° from fixation', () => {
    expect(blindSpotDepth('OD', 15, -1.5)).toBeGreaterThan(0.95);
    expect(blindSpotDepth('OD', -15, -1.5)).toBe(0);
    expect(blindSpotDepth('OS', -15, -1.5)).toBeGreaterThan(0.95);
    expect(blindSpotDepth('OS', 15, -1.5)).toBe(0);
  });
  it('the enlarged blind spot is bigger than the physiological one', () => {
    expect(blindSpotDepth('OD', 21, -3)).toBe(0);
    expect(blindSpotDepth('OD', 20, -1.5, true)).toBeGreaterThan(0.5);
    expect(defectDepth('enlarged-blind-spot', 'OD', 15, -1.5)).toBe(0); // the core is physiological
  });
  it('every eye has a blind spot even when the field is full', () => {
    expect(lossAt('full', 'OD', 15, -1.5)).toBeGreaterThan(0.9);
    expect(lossAt('full', 'OD', 3, 3)).toBe(0);
  });
});

describe('defect geometry', () => {
  it('every defect is within 0..1 everywhere', () => {
    for (const d of ALL) for (const p of GRID_30_2) {
      const v = defectDepth(d, 'OD', p.x, p.y);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it('arcuate respects the horizontal meridian and spares fixation', () => {
    expect(defectDepth('superior-arcuate', 'OD', -9, 9)).toBeGreaterThan(0.8);
    expect(defectDepth('superior-arcuate', 'OD', -9, -9)).toBe(0);
    expect(defectDepth('superior-arcuate', 'OD', 3, 3)).toBe(0);
    expect(defectDepth('inferior-arcuate', 'OS', 9, -9)).toBeGreaterThan(0.8);
    // never temporal to the blind spot
    expect(defectDepth('superior-arcuate', 'OD', 27, 3)).toBe(0);
  });
  it('nasal step is nasal: left side in OD, right side in OS', () => {
    expect(defectDepth('nasal-step', 'OD', -21, 3)).toBeGreaterThan(0.45);
    expect(defectDepth('nasal-step', 'OD', 21, 3)).toBe(0);
    expect(defectDepth('nasal-step', 'OS', 21, 3)).toBeGreaterThan(0.45);
  });
  it('temporal hemianopia flips with the eye; left hemianopia does not', () => {
    expect(defectDepth('temporal-hemianopia', 'OD', 9, 3)).toBeGreaterThan(0.9);
    expect(defectDepth('temporal-hemianopia', 'OD', -9, 3)).toBe(0);
    expect(defectDepth('temporal-hemianopia', 'OS', -9, 3)).toBeGreaterThan(0.9);
    expect(defectDepth('left-hemianopia', 'OD', -9, 3)).toBeGreaterThan(0.9);
    expect(defectDepth('left-hemianopia', 'OS', -9, 3)).toBeGreaterThan(0.9);
    expect(defectDepth('left-hemianopia', 'OS', 9, 3)).toBe(0);
  });
  it('quadrantanopia takes exactly one quadrant', () => {
    expect(defectDepth('right-superior-quadrantanopia', 'OD', 9, 9)).toBeGreaterThan(0.9);
    expect(defectDepth('right-superior-quadrantanopia', 'OD', 9, -9)).toBe(0);
    expect(defectDepth('right-superior-quadrantanopia', 'OD', -9, 9)).toBe(0);
  });
  it('altitudinal respects the horizontal meridian', () => {
    expect(defectDepth('inferior-altitudinal', 'OD', -21, -3)).toBeGreaterThan(0.9);
    expect(defectDepth('inferior-altitudinal', 'OD', -21, 3)).toBe(0);
  });
  it('central and cecocentral involve fixation; cecocentral reaches the blind spot', () => {
    expect(defectDepth('central-scotoma', 'OD', 3, 3)).toBeGreaterThan(0.9);
    expect(defectDepth('central-scotoma', 'OD', 15, -3)).toBe(0);
    expect(defectDepth('cecocentral-scotoma', 'OD', 3, -3)).toBeGreaterThan(0.9);
    expect(defectDepth('cecocentral-scotoma', 'OD', 15, -3)).toBeGreaterThan(0.9);
    expect(defectDepth('cecocentral-scotoma', 'OD', -15, -3)).toBe(0);
  });
  it('curtains spare fixation; curtain-temporal is on the temporal side', () => {
    for (const c of ['curtain-superior', 'curtain-inferior', 'curtain-temporal', 'curtain-nasal'] as const) {
      expect(defectDepth(c, 'OD', 3, 3)).toBe(0);
    }
    expect(defectDepth('curtain-inferior', 'OD', 3, -21)).toBeGreaterThan(0.9);
    expect(defectDepth('curtain-temporal', 'OS', -21, 3)).toBeGreaterThan(0.9);
    expect(defectDepth('curtain-temporal', 'OS', 21, 3)).toBe(0);
  });
  it('constriction loses the periphery; temporal island keeps only temporal periphery', () => {
    expect(defectDepth('constricted', 'OD', 3, 3)).toBe(0);
    expect(defectDepth('constricted', 'OD', 21, 9)).toBeGreaterThan(0.9);
    expect(defectDepth('temporal-island', 'OD', 3, 3)).toBeGreaterThan(0.9);
    expect(defectDepth('temporal-island', 'OD', 27, 3)).toBeLessThan(0.1);
    expect(defectDepth('temporal-island', 'OS', -27, 3)).toBeLessThan(0.1);
  });
});

describe('hill of vision', () => {
  it('falls with eccentricity and age', () => {
    expect(normalSensitivity(3, 3, 30)).toBeGreaterThan(normalSensitivity(27, 3, 30));
    expect(normalSensitivity(3, 3, 30)).toBeGreaterThan(normalSensitivity(3, 3, 75));
    expect(normalSensitivity(3, 3, 30)).toBeGreaterThan(30);
  });
  it('an absolute defect has a threshold below 0 dB', () => {
    expect(trueThreshold('temporal-hemianopia', 'OD', 9, 3, 50)).toBeLessThan(0);
    expect(trueThreshold('full', 'OD', 9, 3, 50)).toBeGreaterThan(25);
  });
});
