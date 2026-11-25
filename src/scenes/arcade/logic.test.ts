import { describe, expect, it } from 'vitest';
import type { MiniGameModule, MiniGameResult } from '@core';
import { ARCADE_INITIAL, accuracyWord, plural, upcoming, difficultyById, formatSeconds, medalFor, migrateArcade, practicable, practiceScore, recordResult } from './logic';

const res = (accuracy: number, perfect = false): MiniGameResult => ({ testId: 'tonometry', accuracy, timeMs: 1000, findings: [], perfect });
const mg = (id: string, title: string, practice = true) => ({ id, title, ...(practice ? { practice: () => ({}) } : {}) }) as unknown as MiniGameModule;

describe('arcade logic', () => {
  it('filters and orders practicable games by exam flow', () => {
    const list = practicable([mg('tonometry', 'Tonometry'), mg('visual-acuity', 'VA'), mg('pupils', 'Pupils', false), mg('phoropter', 'Phoropter')]);
    expect(list.map((m) => m.id)).toEqual(['visual-acuity', 'phoropter', 'tonometry']);
  });

  it('scores with difficulty multipliers and perfect bonus', () => {
    expect(practiceScore(res(0.8), difficultyById('easy'))).toBe(800);
    expect(practiceScore(res(1, true), difficultyById('expert'))).toBe(2300);
    expect(practiceScore(res(NaN), difficultyById('clinical'))).toBe(0);
    expect(practiceScore(res(2), difficultyById('easy'))).toBe(1000);
    expect(difficultyById('nope').id).toBe('clinical');
  });

  it('records bests per game and difficulty', () => {
    const a = recordResult(ARCADE_INITIAL, 'tonometry', difficultyById('easy'), res(0.6), 1);
    expect(a.isBest).toBe(true);
    expect(a.firstPlay).toBe(true);
    expect(a.save.games.tonometry).toMatchObject({ plays: 1, best: 600, bestAccuracy: 0.6 });
    const b = recordResult(a.save, 'tonometry', difficultyById('easy'), res(0.4), 2);
    expect(b.isBest).toBe(false);
    expect(b.firstPlay).toBe(false);
    expect(b.previousBest).toBe(600);
    expect(b.save.games.tonometry).toMatchObject({ plays: 2, best: 600, lastAccuracy: 0.4, lastPlayed: 2 });
    const c = recordResult(b.save, 'tonometry', difficultyById('expert'), res(0.5), 3);
    expect(c.isBest).toBe(true);
    expect(c.save.games.tonometry!.bestByDifficulty).toEqual({ easy: 600, expert: 1000 });
    expect(ARCADE_INITIAL.games).toEqual({});
  });

  it('logs a zero-score first attempt without calling it a best', () => {
    const z = recordResult(ARCADE_INITIAL, 'amsler', difficultyById('clinical'), res(0), 5);
    expect(z.firstPlay).toBe(true);
    expect(z.isBest).toBe(false);
    expect(z.save.games.amsler).toMatchObject({ plays: 1, best: 0 });
  });

  it('awards medals and words', () => {
    expect(medalFor(0.95)).toBe('gold');
    expect(medalFor(0.8)).toBe('silver');
    expect(medalFor(0.5)).toBe('bronze');
    expect(medalFor(0.2)).toBeNull();
    expect(accuracyWord(1)).toBe('Flawless');
    expect(accuracyWord(0.1)).toBe('Keep practising');
  });

  it('formats time and migrates saves', () => {
    expect(formatSeconds(12345)).toBe('12.3s');
    expect(formatSeconds(75000)).toBe('1m 15s');
    expect(migrateArcade(null)).toEqual(ARCADE_INITIAL);
    expect(migrateArcade({ difficulty: 'expert', games: { a: 1 } }).difficulty).toBe('expert');
  });

  it('lists catalogue tests without a practice game, in exam order', () => {
    const list = upcoming([mg('tonometry', 'Tonometry'), mg('pupils', 'Pupils', false)]);
    expect(list.some((t) => t.id === 'tonometry')).toBe(false);
    expect(list.find((t) => t.id === 'pupils')).toEqual({ id: 'pupils', clinicOnly: true });
    expect(list.find((t) => t.id === 'amsler')).toEqual({ id: 'amsler', clinicOnly: false });
    expect(list[0]!.id).toBe('visual-acuity');
    expect(list.length).toBe(15);
  });

  it('pluralises', () => {
    expect(plural(1, 'run')).toBe('run');
    expect(plural(0, 'run')).toBe('runs');
    expect(plural(2, 'diagnosis', 'diagnoses')).toBe('diagnoses');
  });
});
