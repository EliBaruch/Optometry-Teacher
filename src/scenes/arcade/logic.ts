/** Pure helpers for the Practice Arcade (unit-tested). */
import { TEST_CATALOG, type MiniGameModule, type MiniGameResult, type TestCategory, type TestId } from '@core';

export type DifficultyId = 'easy' | 'clinical' | 'expert';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  /** MiniGameContext.difficulty (0..1) */
  value: number;
  /** Score multiplier */
  mult: number;
  blurb: string;
  accent: string;
}

export const DIFFICULTIES: readonly Difficulty[] = [
  { id: 'easy', label: 'Easy', value: 0.2, mult: 1, blurb: 'Clear-cut findings and generous tolerances.', accent: '#5eead4' },
  { id: 'clinical', label: 'Clinical', value: 0.55, mult: 1.5, blurb: 'Real-world patients: subtle signs, normal tolerances.', accent: '#ffd27a' },
  { id: 'expert', label: 'Expert', value: 0.9, mult: 2, blurb: 'Borderline findings, tight tolerances, no mercy.', accent: '#f43f5e' },
];

export function difficultyById(id: string | undefined): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]!;
}

export const CATEGORY_ACCENT: Record<TestCategory, string> = {
  acuity: '#ffd27a',
  refraction: '#a78bfa',
  binocular: '#f472b6',
  neuro: '#c084fc',
  anterior: '#38bdf8',
  posterior: '#fb923c',
  pressure: '#4ade80',
};

export const CATEGORY_LABEL: Record<TestCategory, string> = {
  acuity: 'Acuity',
  refraction: 'Refraction',
  binocular: 'Binocular',
  neuro: 'Neuro',
  anterior: 'Anterior segment',
  posterior: 'Posterior segment',
  pressure: 'Pressure',
};

const CATEGORY_ORDER: TestCategory[] = ['acuity', 'refraction', 'binocular', 'neuro', 'anterior', 'pressure', 'posterior'];

/** Only mini-games that offer practice(), in clinical exam order. */
export function practicable(list: readonly MiniGameModule[]): MiniGameModule[] {
  const ids = Object.keys(TEST_CATALOG);
  const rank = (m: MiniGameModule) => {
    const info = TEST_CATALOG[m.id];
    return info ? CATEGORY_ORDER.indexOf(info.category) * 100 + ids.indexOf(m.id) : 9999;
  };
  return list.filter((m) => typeof m.practice === 'function').sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

/**
 * Catalogue tests with no practicable mini-game yet, in exam order — shown as
 * "being calibrated" placeholders so the cabinet never looks empty or broken.
 * `clinicOnly` marks tests whose mini-game exists but offers no practice mode.
 */
export function upcoming(installed: readonly MiniGameModule[]): { id: TestId; clinicOnly: boolean }[] {
  const playable = new Set(practicable(installed).map((m) => m.id));
  const registered = new Set(installed.map((m) => m.id));
  const ids = Object.keys(TEST_CATALOG) as TestId[];
  return ids
    .filter((id) => !playable.has(id))
    .sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(TEST_CATALOG[a].category);
      const cb = CATEGORY_ORDER.indexOf(TEST_CATALOG[b].category);
      return ca - cb || ids.indexOf(a) - ids.indexOf(b);
    })
    .map((id) => ({ id, clinicOnly: registered.has(id) }));
}

/** "1 instrument", "3 instruments" */
export function plural(n: number, word: string, many = `${word}s`): string {
  return n === 1 ? word : many;
}

export function practiceScore(result: Pick<MiniGameResult, 'accuracy' | 'perfect'>, diff: Difficulty): number {
  const acc = Number.isFinite(result.accuracy) ? Math.max(0, Math.min(1, result.accuracy)) : 0;
  return Math.round(acc * 1000 * diff.mult + (result.perfect ? 150 * diff.mult : 0));
}

export interface GameRecord {
  plays: number;
  best: number;
  bestAccuracy: number;
  bestByDifficulty: Partial<Record<DifficultyId, number>>;
  lastAccuracy: number;
  lastPlayed: number;
}

export interface ArcadeSave {
  difficulty: DifficultyId;
  games: Record<string, GameRecord>;
}

export const ARCADE_INITIAL: ArcadeSave = { difficulty: 'clinical', games: {} };

export interface RecordOutcome {
  save: ArcadeSave;
  score: number;
  previousBest: number;
  isBest: boolean;
  /** True on the very first logged run of this instrument (any difficulty). */
  firstPlay: boolean;
}

export function recordResult(save: ArcadeSave, testId: string, diff: Difficulty, result: MiniGameResult, now: number): RecordOutcome {
  const score = practiceScore(result, diff);
  const prev: GameRecord = save.games[testId] ?? { plays: 0, best: 0, bestAccuracy: 0, bestByDifficulty: {}, lastAccuracy: 0, lastPlayed: 0 };
  const acc = Math.max(0, Math.min(1, Number.isFinite(result.accuracy) ? result.accuracy : 0));
  const prevDiffBest = prev.bestByDifficulty[diff.id] ?? 0;
  const next: GameRecord = {
    plays: prev.plays + 1,
    best: Math.max(prev.best, score),
    bestAccuracy: Math.max(prev.bestAccuracy, acc),
    bestByDifficulty: { ...prev.bestByDifficulty, [diff.id]: Math.max(prevDiffBest, score) },
    lastAccuracy: acc,
    lastPlayed: now,
  };
  return {
    save: { ...save, games: { ...save.games, [testId]: next } },
    score,
    previousBest: prev.best,
    isBest: score > prev.best,
    firstPlay: prev.plays === 0,
  };
}

export type Medal = 'gold' | 'silver' | 'bronze';
export function medalFor(bestAccuracy: number): Medal | null {
  if (bestAccuracy >= 0.9) return 'gold';
  if (bestAccuracy >= 0.75) return 'silver';
  if (bestAccuracy >= 0.5) return 'bronze';
  return null;
}

export const MEDAL_COLOR: Record<Medal, string> = { gold: '#ffd27a', silver: '#d8dee9', bronze: '#d08a4f' };

export function accuracyWord(acc: number): string {
  if (acc >= 0.97) return 'Flawless';
  if (acc >= 0.85) return 'Excellent';
  if (acc >= 0.7) return 'Good work';
  if (acc >= 0.5) return 'Getting there';
  return 'Keep practising';
}

export function formatSeconds(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;
}

/** Sanitise a stored save (older / hand-edited data). */
export function migrateArcade(old: unknown): ArcadeSave {
  const o = (old && typeof old === 'object' ? old : {}) as Partial<ArcadeSave>;
  return {
    difficulty: difficultyById(o.difficulty).id,
    games: o.games && typeof o.games === 'object' ? o.games : {},
  };
}
