import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { catchTrial, makeResponder, screenPoint, seeingProbability, thresholdStaircase } from './patient';

describe('frequency of seeing', () => {
  it('is ~50% at threshold and saturates either side', () => {
    const r = { falsePos: 0, falseNeg: 0, slope: 1 };
    expect(seeingProbability(25, 25, r)).toBeCloseTo(0.5);
    expect(seeingProbability(25, 15, r)).toBeGreaterThan(0.99);
    expect(seeingProbability(25, 35, r)).toBeLessThan(0.01);
  });
});

describe('4-2 staircase', () => {
  it('lands near the true threshold in a normal location', () => {
    const rng = createRng(7);
    const r = makeResponder('full', 'OD', 40, 0);
    const errs: number[] = [];
    for (let i = 0; i < 40; i++) {
      const { result, flashes } = thresholdStaircase(r, { x: 9, y: 3 }, rng);
      expect(flashes.length).toBeGreaterThanOrEqual(2);
      expect(flashes.length).toBeLessThanOrEqual(10);
      errs.push(Math.abs((result.db ?? -5) - 29.6));
    }
    const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
    expect(mean).toBeLessThan(3);
  });
  it('reports <0 dB (null) in an absolute defect, quickly', () => {
    const rng = createRng(3);
    const r = makeResponder('temporal-hemianopia', 'OD', 50, 0);
    let absolute = 0;
    for (let i = 0; i < 30; i++) {
      const { result, flashes } = thresholdStaircase(r, { x: 9, y: 3 }, rng);
      if (result.db === null) absolute++;
      expect(flashes.length).toBeLessThanOrEqual(10);
    }
    expect(absolute).toBeGreaterThan(24);
  });
  it('finds the blind spot', () => {
    const rng = createRng(11);
    const r = makeResponder('full', 'OD', 30, 0);
    const { result } = thresholdStaircase(r, { x: 15, y: -3 }, rng);
    expect(result.db === null || result.db < 10).toBe(true);
  });
});

describe('screening', () => {
  it('a bright screen misses a shallow relative defect that a near-threshold screen catches', () => {
    const rng = createRng(5);
    const r = makeResponder('nasal-step', 'OD', 50, 0);
    let brightSeen = 0;
    let dimSeen = 0;
    for (let i = 0; i < 40; i++) {
      if (screenPoint(r, { x: -21, y: 3 }, 16, rng).result.seen) brightSeen++;
      if (screenPoint(r, { x: -21, y: 3 }, 4, rng).result.seen) dimSeen++;
    }
    expect(brightSeen).toBeGreaterThan(dimSeen);
    expect(dimSeen).toBeLessThan(10);
  });
  it('catch trials target the blind spot on the temporal side', () => {
    const rng = createRng(1);
    expect(catchTrial(makeResponder('full', 'OD', 40, 0), rng).x).toBeGreaterThan(0);
    expect(catchTrial(makeResponder('full', 'OS', 40, 0), rng).x).toBeLessThan(0);
  });
});
