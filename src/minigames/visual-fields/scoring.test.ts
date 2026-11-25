import { describe, expect, it } from 'vitest';
import { classifyScore, coverage, localisationScore, scoreExam, sectorOf, techniqueScore } from './scoring';
import { grid242 } from './model';

describe('technique', () => {
  it('sectors split quadrants and central/peripheral', () => {
    expect(sectorOf({ x: 3, y: 3 })).toBe(0);
    expect(sectorOf({ x: -3, y: 3 })).toBe(1);
    expect(sectorOf({ x: -3, y: -3 })).toBe(2);
    expect(sectorOf({ x: 3, y: -3 })).toBe(3);
    expect(sectorOf({ x: 21, y: 9 })).toBe(4);
  });
  it('a smart 16-point survey beats a full automated sweep on efficiency', () => {
    const smart = [
      { x: 3, y: 3 }, { x: -3, y: 3 }, { x: -3, y: -3 }, { x: 3, y: -3 },
      { x: 15, y: 9 }, { x: -15, y: 9 }, { x: -15, y: -9 }, { x: 15, y: -9 },
      { x: 9, y: 9 }, { x: 21, y: 3 }, { x: 21, y: -3 }, { x: 9, y: -9 },
    ];
    const s = techniqueScore(smart, 'temporal-hemianopia', 'OD');
    const auto = techniqueScore(grid242('OD'), 'temporal-hemianopia', 'OD');
    expect(s.coverage).toBe(1);
    expect(s.score).toBeGreaterThan(auto.score);
    expect(auto.score).toBeGreaterThan(0.6);
  });
  it('missing the defect entirely costs credit', () => {
    const nasalOnly = [{ x: -3, y: 3 }, { x: -3, y: -3 }, { x: -15, y: 9 }, { x: -15, y: -9 }, { x: -9, y: 3 }, { x: -9, y: -3 }];
    const t = techniqueScore(nasalOnly, 'temporal-hemianopia', 'OD');
    expect(t.hits).toBe(0);
    expect(t.score).toBeLessThan(0.25);
    expect(coverage(nasalOnly)).toBe(0.5);
  });
});

describe('classification & localisation', () => {
  it('exact, wrong side, related, unrelated', () => {
    expect(classifyScore({ family: 'arcuate', side: 'superior' }, { family: 'arcuate', side: 'superior' })).toBe(1);
    expect(classifyScore({ family: 'arcuate', side: 'inferior' }, { family: 'arcuate', side: 'superior' })).toBe(0.5);
    expect(classifyScore({ family: 'quadrantanopia', side: 'superior-left' }, { family: 'hemianopia', side: 'left' })).toBe(0.3);
    expect(classifyScore({ family: 'central' }, { family: 'hemianopia', side: 'left' })).toBe(0);
    expect(classifyScore(null, { family: 'full' })).toBe(0);
  });
  it('wrong hemisphere gets partial credit', () => {
    expect(localisationScore('retro-left', 'retro-right')).toBe(0.4);
    expect(localisationScore('chiasm', 'chiasm')).toBe(1);
    expect(localisationScore('chiasm', 'prechiasmal')).toBe(0);
  });
  it('accuracy combines technique, classification and localisation', () => {
    const t = { points: 14, coverage: 1, hits: 3, efficiency: 1, score: 1 };
    const perfect = scoreExam({ technique: { OD: t, OS: t }, classify: { OD: 1, OS: 1 }, localisation: 1 });
    expect(perfect.accuracy).toBe(1);
    expect(perfect.perfect).toBe(true);
    const sloppy = scoreExam({ technique: { OD: t, OS: t }, classify: { OD: 1, OS: 0 }, localisation: 0 });
    expect(sloppy.accuracy).toBeCloseTo(0.55);
    expect(sloppy.perfect).toBe(false);
  });
});
