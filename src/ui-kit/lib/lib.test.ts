import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { cx } from './cx';
import { clamp, countDuration, ease, formatNumber, tweenValue } from './motion';
import { buildSchedule, totalDuration, visibleChars } from './typewriter';
import { nextInTrap } from './focus';
import { withAlpha, RARITY_COLOR, GRADE_COLOR } from './palette';
import { VARIANTS, createDrop, createMote, moteAlpha, moteCount, stepDrops, stepMotes } from './backdrop-sim';

describe('cx', () => {
  it('joins truthy parts and object keys', () => {
    expect(cx('a', false, null, undefined, 'b', { c: true, d: false })).toBe('a b c');
    expect(cx()).toBe('');
  });
});

describe('motion', () => {
  it('clamps and eases between endpoints', () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    for (const fn of Object.values(ease)) {
      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBeCloseTo(1, 5);
    }
    // back-out overshoots before settling
    expect(Math.max(...Array.from({ length: 50 }, (_, i) => ease.outBack(i / 49)))).toBeGreaterThan(1);
  });
  it('tweens monotonically from → to and lands exactly', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const v = tweenValue(100, 900, i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(tweenValue(100, 900, 1)).toBe(900);
    expect(tweenValue(100, 900, 5)).toBe(900);
    expect(tweenValue(5, -5, 1)).toBe(-5);
  });
  it('formats numbers with grouping, decimals and a true minus sign', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(-2.25, 2)).toBe('−2.25');
    expect(formatNumber(-0.001, 1)).toBe('0.0');
    expect(formatNumber(999.6)).toBe('1,000');
    expect(formatNumber(1234, 0, false)).toBe('1234');
  });
  it('scales count duration with magnitude but stays bounded', () => {
    expect(countDuration(0)).toBe(0);
    expect(countDuration(5)).toBeGreaterThanOrEqual(450);
    expect(countDuration(1e9)).toBe(1600);
    expect(countDuration(10000)).toBeGreaterThan(countDuration(10));
  });
});

describe('typewriter', () => {
  it('reveals characters over time with pauses after clause punctuation', () => {
    const text = 'Hi. Blurry, at night';
    const s = buildSchedule(text, 50);
    expect(s).toHaveLength(text.length);
    expect(visibleChars(s, 0)).toBe(0);
    expect(visibleChars(s, totalDuration(s))).toBe(text.length);
    expect(visibleChars(s, 1e9)).toBe(text.length);
    const step = 20;
    // gap after "." (index 2) is larger than a normal step
    expect(s[3]! - s[2]!).toBeGreaterThan(step * 5);
    // ordinary letters are one step apart
    expect(s[1]! - s[0]!).toBeCloseTo(step);
  });
  it('does not pause on decimal points', () => {
    const s = buildSchedule('-2.25', 50);
    expect(s[3]! - s[2]!).toBeCloseTo(20);
  });
  it('is monotonic', () => {
    const s = buildSchedule('One, two… three! Four? Five.', 40);
    for (let i = 1; i < s.length; i++) expect(s[i]!).toBeGreaterThan(s[i - 1]!);
  });
});

describe('focus trap ordering', () => {
  const a = {} as HTMLElement;
  const b = {} as HTMLElement;
  const c = {} as HTMLElement;
  const list = [a, b, c];
  it('wraps forwards and backwards at the ends only', () => {
    expect(nextInTrap(list, c, false)).toBe(a);
    expect(nextInTrap(list, a, true)).toBe(c);
    expect(nextInTrap(list, b, false)).toBeNull();
    expect(nextInTrap(list, b, true)).toBeNull();
  });
  it('enters the trap when focus is outside', () => {
    expect(nextInTrap(list, null, false)).toBe(a);
    expect(nextInTrap(list, null, true)).toBe(c);
    expect(nextInTrap([], null, false)).toBeNull();
  });
});

describe('palette', () => {
  it('converts hex to rgba', () => {
    expect(withAlpha('#ffd27a', 0.5)).toBe('rgba(255,210,122,0.5)');
    expect(withAlpha('#fff', 1)).toBe('rgba(255,255,255,1)');
    expect(withAlpha('var(--x)', 1)).toBe('var(--x)');
  });
  it('covers every rarity and grade', () => {
    expect(Object.keys(RARITY_COLOR)).toEqual(['common', 'rare', 'epic', 'legendary']);
    expect(Object.keys(GRADE_COLOR).sort()).toEqual(['A', 'B', 'C', 'D', 'F', 'S']);
  });
});

describe('backdrop simulation', () => {
  it('sizes particle counts to the canvas with sane bounds', () => {
    expect(moteCount(VARIANTS.hub, 10, 10)).toBe(6);
    expect(moteCount(VARIANTS.hub, 1440, 900)).toBeGreaterThan(20);
    expect(moteCount(VARIANTS.results, 8000, 8000)).toBe(90);
  });
  it('keeps motes within the wrapped bounds over a long run', () => {
    const rng = createRng(1);
    const rand = () => rng.next();
    const w = 800;
    const h = 600;
    const motes = Array.from({ length: 40 }, () => createMote(VARIANTS.title, w, h, rand));
    for (let i = 0; i < 2000; i++) stepMotes(motes, 1 / 30, w, h, i / 30);
    for (const m of motes) {
      expect(m.x).toBeGreaterThanOrEqual(-m.r * 2 - 1);
      expect(m.x).toBeLessThanOrEqual(w + m.r * 2 + 1);
      expect(m.y).toBeGreaterThanOrEqual(-m.r * 2 - 1);
      expect(m.y).toBeLessThanOrEqual(h + m.r * 2 + 1);
      const a = moteAlpha(m);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });
  it('is deterministic for a given seed', () => {
    const mk = () => {
      const rng = createRng('x');
      return createMote(VARIANTS.exam, 100, 100, () => rng.next());
    };
    expect(mk()).toEqual(mk());
  });
  it('recycles rain drops that slide off the bottom', () => {
    const rng = createRng(2);
    const rand = () => rng.next();
    const drops = Array.from({ length: 20 }, () => createDrop(300, 300, rand));
    for (let i = 0; i < 600; i++) stepDrops(drops, 1 / 30, 300, 300, rand);
    for (const d of drops) expect(d.y - d.len).toBeLessThanOrEqual(300 + 1);
  });
});
