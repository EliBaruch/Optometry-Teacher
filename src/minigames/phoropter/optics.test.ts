import { describe, expect, it } from 'vitest';
import {
  blurKernel, blurLoss, duochromeResiduals, effectiveResidual, fromVector, jccRedAxis, jccVector, lensFromRx,
  lensMagnification, makeEyeModel, perceivedVA, smallestLine, snellen, toVector, wrapAxis, type Lens,
} from './optics';

const eye = (s: number, c: number, a: number, amp = 0, best = -0.1) => makeEyeModel({ sphere: s, cylinder: c, axis: a }, best, amp);
const lens = (sphere: number, cyl = 0, axis = 180): Lens => ({ sphere, cyl, axis });

describe('power vectors', () => {
  it('round-trips minus-cyl prescriptions', () => {
    for (const [s, c, a] of [[-2.25, -0.75, 180], [1.5, -2, 45], [0, -1.25, 90], [-4, -0.5, 7], [3, 0, 180]] as const) {
      const back = fromVector(toVector({ sphere: s, cyl: c, axis: a }));
      expect(back.sphere).toBeCloseTo(s, 6);
      expect(back.cyl).toBeCloseTo(c, 6);
      if (c !== 0) expect(back.axis).toBeCloseTo(a, 4);
    }
  });
  it('M is the spherical equivalent and J flips sign across 90°', () => {
    const v = toVector({ sphere: -1, cyl: -2, axis: 180 });
    expect(v.M).toBe(-2);
    expect(v.J0).toBeCloseTo(1);
    expect(toVector({ sphere: -1, cyl: -2, axis: 90 }).J0).toBeCloseTo(-1);
    expect(toVector({ sphere: -1, cyl: -2, axis: 45 }).J45).toBeCloseTo(1);
  });
  it('transposes plus-cyl into minus-cyl', () => {
    expect(lensFromRx({ sphere: -1, cylinder: 1, axis: 90 })).toEqual({ sphere: 0, cyl: -1, axis: 180 });
  });
  it('wraps axes into 1..180', () => {
    expect(wrapAxis(0)).toBe(180);
    expect(wrapAxis(181)).toBe(1);
    expect(wrapAxis(-5)).toBe(175);
  });
});

describe('residual blur and accommodation', () => {
  it('full correction leaves no blur; under-correction blurs about a line per 0.25 D', () => {
    const e = eye(-2, 0, 180);
    expect(perceivedVA(e, lens(-2))).toBeCloseTo(-0.1);
    expect(perceivedVA(e, lens(-1.75))).toBeCloseTo(0);
    expect(perceivedVA(e, lens(0))).toBeCloseTo(0.7);
  });
  it('a +lens fogs a myope (more plus = more blur)', () => {
    const e = eye(-2, 0, 180, 8);
    expect(perceivedVA(e, lens(-1.25))).toBeGreaterThan(perceivedVA(e, lens(-2)) + 0.25);
  });
  it('a young eye accommodates through over-minus, a presbyope cannot', () => {
    const young = eye(-2, 0, 180, 10);
    const old = eye(-2, 0, 180, 1);
    expect(perceivedVA(young, lens(-3))).toBeCloseTo(-0.1);
    expect(perceivedVA(old, lens(-3))).toBeGreaterThan(perceivedVA(young, lens(-3)) + 0.05);
  });
  it('latent hyperopia is hidden at plano in a young eye', () => {
    const e = eye(2, 0, 180, 9);
    expect(effectiveResidual(e, lens(0)).B).toBeCloseTo(0);
    expect(effectiveResidual(e, lens(0)).acc).toBeCloseTo(2);
  });
  it('cylinder axis error leaves residual astigmatism', () => {
    const e = eye(0, -2, 90);
    const r = effectiveResidual(e, lens(0, -2, 80));
    // two −2.00 cylinders 10° apart → cross-cylinder of 2·2·sin10° ≈ 0.69 D
    expect(2 * Math.hypot(r.eff.J0, r.eff.J45)).toBeCloseTo(0.695, 2);
  });
  it('blurLoss saturates', () => {
    expect(blurLoss(10)).toBeLessThanOrEqual(1.7);
    expect(blurLoss(0.25)).toBeCloseTo(0.1);
  });
  it('calibrates to the chart uncorrected VA', () => {
    const e = makeEyeModel({ sphere: -2.25, cylinder: 0, axis: 180 }, -0.1, 8, 0.9);
    expect(perceivedVA(e, lens(0))).toBeCloseTo(0.9, 5);
  });
});

describe('Jackson cross-cylinder', () => {
  it('has zero spherical equivalent and 0.25 D of J', () => {
    const v = jccVector(30);
    expect(v.M).toBeCloseTo(0);
    expect(Math.hypot(v.J0, v.J45)).toBeCloseTo(0.25);
  });
  it('straddles the axis at ±45° in axis mode and sits on/off axis in power mode', () => {
    expect(jccRedAxis('axis', 90, 1)).toBe(135);
    expect(jccRedAxis('axis', 90, 2)).toBe(45);
    expect(jccRedAxis('power', 180, 1)).toBe(180);
    expect(jccRedAxis('power', 180, 2)).toBe(90);
  });
  it('"follow the red": the preferred flip points toward the true axis', () => {
    const e = eye(0, -1.5, 100);
    const l = lens(0, -1.5, 90);
    const v1 = perceivedVA(e, l, jccVector(jccRedAxis('axis', 90, 1))); // red at 135
    const v2 = perceivedVA(e, l, jccVector(jccRedAxis('axis', 90, 2))); // red at 45
    expect(v1).toBeLessThan(v2);
  });
  it('red on axis is preferred when the cylinder is under-corrected', () => {
    const e = eye(0.5, -1.5, 180);
    const l = lens(0.25, -1, 180);
    const v1 = perceivedVA(e, l, jccVector(jccRedAxis('power', 180, 1)));
    const v2 = perceivedVA(e, l, jccVector(jccRedAxis('power', 180, 2)));
    expect(v1).toBeLessThan(v2);
  });
});

describe('duochrome & chart', () => {
  it('under-minus → red clearer; over-minus → green clearer (RAM-GAP)', () => {
    const e = eye(-2, 0, 180, 8);
    const under = duochromeResiduals(e, lens(-1.75));
    expect(Math.abs(under.red.M)).toBeLessThan(Math.abs(under.green.M));
    const over = duochromeResiduals(e, lens(-2.5));
    expect(Math.abs(over.green.M)).toBeLessThan(Math.abs(over.red.M));
    const end = duochromeResiduals(e, lens(-2));
    expect(Math.abs(end.red.M)).toBeCloseTo(Math.abs(end.green.M));
  });
  it('minus lenses minify', () => {
    expect(lensMagnification(-4)).toBeLessThan(1);
    expect(lensMagnification(3)).toBeGreaterThan(1);
  });
  it('blur kernel is elongated along the defocused meridian', () => {
    const e = eye(0, -2, 180);
    const k = blurKernel(e, effectiveResidual(e, lens(0)).eff);
    expect(k.minor).toBeGreaterThan(k.major * 3); // all blur in the vertical meridian
    expect(k.angle).toBe(0);
  });
  it('reads chart lines', () => {
    expect(smallestLine(0)?.denom).toBe(20);
    expect(smallestLine(0.38)?.denom).toBe(50);
    expect(snellen(-0.1)).toBe('20/15');
    expect(smallestLine(1.3)).toBeNull();
  });
});
