/** Persisted slice `sys:streaks` and personal bests per mode ("you versus past you"). */
import { INITIAL_DAILY, sanitizeDaily, type DailyState } from './daily';

export const SYSTEM_ID = 'streaks';
export const ACCENT = '#fb923c';
export const SLOT = 'sys:streaks';
export const SLOT_VERSION = 1;

export interface ModeBest {
  /** Best finished-run score in this mode. */
  run: number;
  /** Patients seen in that best run. */
  runCases: number;
  /** Best single-patient score in this mode. */
  caseScore: number;
  /** Longest combo in this mode. */
  combo: number;
}

export const EMPTY_BEST: ModeBest = { run: 0, runCases: 0, caseScore: 0, combo: 0 };

export interface StreaksState {
  daily: DailyState;
  bests: Record<string, ModeBest>;
  /** Longest combo ever, any mode. */
  bestCombo: number;
}

export const INITIAL: StreaksState = { daily: INITIAL_DAILY, bests: {}, bestCombo: 0 };

export function bestFor(s: StreaksState, modeId: string): ModeBest {
  return s.bests[modeId] ?? EMPTY_BEST;
}

export function withBest(s: StreaksState, modeId: string, patch: Partial<ModeBest>): StreaksState {
  const prev = bestFor(s, modeId);
  const next: ModeBest = {
    run: Math.max(prev.run, patch.run ?? 0),
    runCases: patch.run !== undefined && patch.run > prev.run ? patch.runCases ?? prev.runCases : prev.runCases,
    caseScore: Math.max(prev.caseScore, patch.caseScore ?? 0),
    combo: Math.max(prev.combo, patch.combo ?? 0),
  };
  if (next.run === prev.run && next.caseScore === prev.caseScore && next.combo === prev.combo) return s;
  return { ...s, bests: { ...s.bests, [modeId]: next } };
}

export function sanitize(raw: unknown): StreaksState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<StreaksState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const bests: Record<string, ModeBest> = {};
  if (r.bests && typeof r.bests === 'object') {
    for (const [k, v] of Object.entries(r.bests)) {
      if (!v || typeof v !== 'object') continue;
      const b = v as Partial<ModeBest>;
      bests[k] = { run: num(b.run), runCases: num(b.runCases), caseScore: num(b.caseScore), combo: num(b.combo) };
    }
  }
  return { daily: sanitizeDaily(r.daily), bests, bestCombo: num(r.bestCombo) };
}
