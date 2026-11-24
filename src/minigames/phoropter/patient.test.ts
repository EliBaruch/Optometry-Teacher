import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { makeEyeModel } from './optics';
import { balance, compareJcc, compareLenses, duochrome, readChart } from './patient';

const who = (seed = 1, difficulty = 0) => ({ rng: createRng(seed), difficulty });
const eye = (s: number, c = 0, a = 180, amp = 8, best = -0.1) => makeEyeModel({ sphere: s, cylinder: c, axis: a }, best, amp);
const L = (sphere: number, cyl = 0, axis = 180) => ({ sphere, cyl, axis });

describe('patient answers', () => {
  it('prefers the lens closer to the true Rx when fogged', () => {
    const e = eye(-2);
    const votes = Array.from({ length: 30 }, (_, i) => compareLenses(e, L(-1), L(-1.25), who(i)).choice);
    expect(votes.filter((v) => v === 'two').length).toBeGreaterThan(25);
  });
  it('says "same, smaller and darker" for over-minus in a young eye', () => {
    const a = compareLenses(eye(-2), L(-2), L(-2.5), who(3));
    expect(a.choice).toBe('same');
    expect(a.text).toMatch(/smaller and darker/);
  });
  it('JCC axis answer follows the red dot toward the true axis', () => {
    const e = eye(0, -2, 100);
    const votes = Array.from({ length: 20 }, (_, i) => compareJcc(e, L(0, -2, 85), 'axis', who(i)).choice);
    expect(votes.filter((v) => v === 'one').length).toBeGreaterThan(17);
  });
  it('JCC answers "same" at the endpoint most of the time', () => {
    const e = eye(-1, -1, 180);
    const votes = Array.from({ length: 30 }, (_, i) => compareJcc(e, L(-1, -1, 180), 'axis', who(i)).choice);
    expect(votes.filter((v) => v === 'same').length).toBeGreaterThan(20);
  });
  it('duochrome follows RAM-GAP and refuses when VA is poor', () => {
    expect(duochrome(eye(-2), L(-1.5), who()).answer).toBe('red');
    expect(duochrome(eye(-2), L(-2.5), who()).answer).toBe('green');
    expect(duochrome(eye(-2), L(-2), who()).answer).toBe('equal');
    expect(duochrome(eye(-2, 0, 180, 8, 0.5), L(-2), who()).answer).toBe('unreliable');
  });
  it('balance: base-up OD puts the right eye on the bottom', () => {
    const eyes = { OD: eye(-2), OS: eye(-2) };
    const r = balance(eyes, { OD: L(-1.25), OS: L(-1) }, who());
    expect(r.answer).toBe('bottom');
  });
  it('reads the chart near threshold', () => {
    expect(readChart(0, createRng(2)).denom).toBe(20);
    expect(readChart(1.5, createRng(2)).denom).toBeNull();
  });
});
