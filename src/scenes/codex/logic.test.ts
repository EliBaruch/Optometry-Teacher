import { describe, expect, it } from 'vitest';
import type { ClinicalCase, Diagnosis } from '@core';
import { casesFor, confusedWith, groupDiagnoses, masteryTier, matchesQuery, neighbour, referenceLabel, safeUrl, silhouette } from './logic';

const dx = (id: string, name: string, category: Diagnosis['category'], extra: Partial<Diagnosis> = {}): Diagnosis => ({
  id, name, category, summary: '', keyFindings: [], typicalUrgency: 'routine', pearls: [], rarity: 'common', ...extra,
});
const kase = (id: string, diagnosis: string, differentials: string[]) => ({ id, diagnosis, differentials }) as unknown as ClinicalCase;

const LIST = [
  dx('wet-amd', 'Wet AMD', 'retina', { aka: ['Neovascular AMD'] }),
  dx('crao', 'Central Retinal Artery Occlusion', 'retina', { keyFindings: ['Cherry-red spot'] }),
  dx('myopia', 'Myopia', 'refractive'),
  dx('cn3-palsy', 'Third Nerve Palsy', 'neuro'),
];

describe('codex logic', () => {
  it('groups in canonical category order, sorted by name', () => {
    const g = groupDiagnoses(LIST);
    expect(g.map((x) => x.category)).toEqual(['refractive', 'retina', 'neuro']);
    expect(g[1]!.items.map((d) => d.id)).toEqual(['crao', 'wet-amd']);
  });

  it('filters by category and query (aliases, findings, accents)', () => {
    expect(groupDiagnoses(LIST, { category: 'neuro' })).toHaveLength(1);
    expect(matchesQuery(LIST[0]!, 'neovascular')).toBe(true);
    expect(matchesQuery(LIST[1]!, 'cherry red')).toBe(true);
    expect(matchesQuery(LIST[1]!, 'chérry')).toBe(true);
    expect(matchesQuery(LIST[2]!, 'glaucoma')).toBe(false);
    expect(groupDiagnoses(LIST, { query: 'zzz' })).toEqual([]);
  });

  it('labels and sanitises references', () => {
    expect(referenceLabel('https://eyewiki.aao.org/X')).toBe('EyeWiki');
    expect(referenceLabel('https://www.ncbi.nlm.nih.gov/books/NBK1/')).toBe('StatPearls');
    expect(referenceLabel('https://www.example.org/a')).toBe('example.org');
    expect(referenceLabel('not a url')).toBe('Reference');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('https://eyewiki.aao.org/X')).toBe('https://eyewiki.aao.org/X');
    expect(safeUrl(undefined)).toBeNull();
  });

  it('finds cases and confusions', () => {
    const cases = [kase('a', 'crao', ['crvo', 'giant-cell-arteritis']), kase('b', 'crvo', ['crao', 'brvo']), kase('c', 'crao', ['crvo'])];
    expect(casesFor(cases, 'crao').map((c) => c.id)).toEqual(['a', 'c']);
    expect(confusedWith(cases, 'crao')).toEqual(['crvo', 'giant-cell-arteritis']);
  });

  it('tiers mastery, silhouettes and neighbours', () => {
    expect(masteryTier(0.9, false)).toBe('Unstudied');
    expect(masteryTier(0.1, true)).toBe('Novice');
    expect(masteryTier(0.85, true)).toBe('Mastered');
    expect(silhouette('Central Retinal  Artery')).toEqual([7, 7, 6]);
    expect(neighbour(['a', 'b', 'c'], 'c', 1)).toBe('a');
    expect(neighbour(['a', 'b', 'c'], 'a', -1)).toBe('c');
    expect(neighbour(['a'], 'a', 1)).toBeNull();
  });
});
