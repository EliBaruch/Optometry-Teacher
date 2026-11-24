import type { Confidence, GameServices, Grade, RunSnapshot, Signal } from '@core';

/**
 * A per-run case log owned by the results scenes. RunSnapshot only keeps ids,
 * so the results scene records each case's grade/points here (keyed by the run
 * seed) and the run summary reads it back for the patients table, combo peak
 * and personal best.
 */

export interface RunLogEntry {
  caseId: string;
  diagnosisId: string;
  grade: Grade | null;
  /** Raw case score (0..1300) */
  total: number;
  /** Points the run actually added (mode / combo multipliers applied) */
  points: number;
  correct: boolean;
  timeout: boolean;
  confidence?: Confidence;
}

export interface RunLogRun {
  seed: string;
  modeId: string;
  entries: RunLogEntry[];
}

export interface RunLogState {
  runs: RunLogRun[];
  best: Record<string, { score: number; seed: string; previous?: number }>;
}

export const RUN_LOG_KEEP = 4;
export const EMPTY_LOG: RunLogState = { runs: [], best: {} };

export function runLogSlot(services: GameServices): Signal<RunLogState> {
  return services.save.slot<RunLogState>('scene:results', EMPTY_LOG, { version: 1 });
}

/** Append (or replace, if the same case is re-reported) an entry for a run. Keeps the last few runs. */
export function appendEntry(state: RunLogState, seed: string, modeId: string, entry: RunLogEntry, keep = RUN_LOG_KEEP): RunLogState {
  const existing = state.runs.find((r) => r.seed === seed);
  const entries = existing ? [...existing.entries.filter((e) => e.caseId !== entry.caseId), entry] : [entry];
  const run: RunLogRun = { seed, modeId, entries };
  const others = state.runs.filter((r) => r.seed !== seed);
  return { ...state, runs: [...others, run].slice(-keep) };
}

export function findRun(state: RunLogState, seed: string | undefined): RunLogRun | undefined {
  return seed ? state.runs.find((r) => r.seed === seed) : undefined;
}

/** Longest streak of consecutive correct diagnoses. */
export function comboPeak(entries: readonly Pick<RunLogEntry, 'correct'>[]): number {
  let best = 0;
  let cur = 0;
  for (const e of entries) {
    cur = e.correct ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
}

/** Highest-scoring case (ties → earliest). */
export function bestCase<T extends Pick<RunLogEntry, 'total'>>(entries: readonly T[]): T | undefined {
  let best: T | undefined;
  for (const e of entries) if (!best || e.total > best.total) best = e;
  return best;
}

export function accuracy(snapshot: Pick<RunSnapshot, 'completed' | 'failed'>): number {
  const n = snapshot.completed.length + snapshot.failed.length;
  return n ? snapshot.completed.length / n : 0;
}

export interface BestResult {
  state: RunLogState;
  /** This run holds the record for its mode */
  isBest: boolean;
  /** No earlier record existed */
  first: boolean;
  previous?: number;
}

/**
 * Idempotent personal-best check: re-opening the same run's summary reports the
 * same result instead of comparing the run against itself.
 */
export function checkBest(state: RunLogState, modeId: string, seed: string, score: number): BestResult {
  const prev = state.best[modeId];
  if (prev && prev.seed === seed) return { state, isBest: true, first: prev.previous === undefined, previous: prev.previous };
  if (score <= 0) return { state, isBest: false, first: false, previous: prev?.score };
  if (!prev || score > prev.score) {
    const rec = prev ? { score, seed, previous: prev.score } : { score, seed };
    return { state: { ...state, best: { ...state.best, [modeId]: rec } }, isBest: true, first: !prev, previous: prev?.score };
  }
  return { state, isBest: false, first: false, previous: prev.score };
}
