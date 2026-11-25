import { describe, expect, it } from 'vitest';
import { effectiveOpacity, visibleFraction } from './visibility';

describe('visibility helpers', () => {
  it('multiplies opacity down the ancestor chain and clamps junk', () => {
    expect(effectiveOpacity([1, 1, 1])).toBe(1);
    expect(effectiveOpacity([1, 0.5, 0.5])).toBeCloseTo(0.25);
    expect(effectiveOpacity([1, 0])).toBe(0);
    expect(effectiveOpacity([Number.NaN, 2, 0.8])).toBeCloseTo(0.8);
  });
  it('measures how much of a rect is inside the viewport', () => {
    expect(visibleFraction(100, 300, 800)).toBe(1);
    expect(visibleFraction(700, 900, 800)).toBeCloseTo(0.5);
    expect(visibleFraction(900, 1100, 800)).toBe(0);
    expect(visibleFraction(-100, 100, 800)).toBeCloseTo(0.5);
    expect(visibleFraction(10, 10, 800)).toBe(0);
  });
});
