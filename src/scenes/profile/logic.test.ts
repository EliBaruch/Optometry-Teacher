import { describe, expect, it } from 'vitest';
import type { Diagnosis } from '@core';
import { categoryStats, cleanName, crestPalette, crestTier, greeting, initials, strongestWeakest } from './logic';

const dx = (id: string, category: Diagnosis['category']) => ({ id, category }) as Diagnosis;

describe('profile logic', () => {
  it('tiers the crest by mastered count', () => {
    expect(crestTier(0).rarity).toBe('common');
    expect(crestTier(0).next?.remaining).toBe(5);
    expect(crestTier(5).rarity).toBe('rare');
    expect(crestTier(29).rarity).toBe('epic');
    expect(crestTier(40).rarity).toBe('legendary');
    expect(crestTier(40).next).toBeNull();
  });

  it('formats names', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('Doctor')).toBe('D');
    expect(initials('   ')).toBe('Dr');
    expect(cleanName('  a   b ')).toBe('a b');
    expect(cleanName('')).toBe('Doctor');
    expect(crestPalette(7)).toHaveLength(4);
    expect(greeting(3)).toMatch(/midnight/);
    expect(greeting(20)).toBe('Good evening');
  });

  it('aggregates category stats', () => {
    const list = [dx('a', 'retina'), dx('b', 'retina'), dx('c', 'refractive'), dx('d', 'neuro')];
    const seen = (id: string) => id !== 'b' && id !== 'd';
    const mastery = (id: string) => ({ a: 0.9, c: 0.3 })[id] ?? 0;
    const stats = categoryStats(list, seen, mastery);
    expect(stats.map((s) => s.category)).toEqual(['refractive', 'retina', 'neuro']);
    const retina = stats.find((s) => s.category === 'retina')!;
    expect(retina).toMatchObject({ total: 2, seen: 1, mastered: 1 });
    expect(retina.mastery).toBeCloseTo(0.45);
    const sw = strongestWeakest(stats);
    expect(sw.strongest?.category).toBe('retina');
    expect(sw.weakest?.category).toBe('refractive');
    expect(strongestWeakest([]).strongest).toBeNull();
  });
});
