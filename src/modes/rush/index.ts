import { createRng, pickCase, TEST_CATALOG, type ClinicalCase, type GameServices, type ModeModule, type RunSnapshot } from '@core';

export const RUSH_LIVES = 3;

/**
 * Combo multiplier for Rush Hour. RunController already tracks `run.combo`
 * (consecutive correct diagnoses, reset to 0 on a miss) and applies
 * `rules.comboMultiplier` — RunController.report multiplies each correct case's score by
 * rushComboMultiplier(combo before this case): ×1.0 at no streak, +0.1 per patient in the
 * streak, capped at ×2.0 (10 in a row).
 */
export function rushComboMultiplier(combo: number): number {
  return 1 + 0.1 * Math.max(0, Math.min(10, Math.floor(combo)));
}

/** Clinic minutes the essential work-up costs: lower = a quicker patient. */
export function quickness(c: ClinicalCase): number {
  const tests = c.essentialTests.reduce((s, t) => s + (TEST_CATALOG[t]?.minutes ?? 2), 0);
  const keyQs = c.history.filter((h) => h.relevance === 'key').length;
  return tests + keyQs + c.difficulty;
}

/** Hardest difficulty on offer grows with the streak and the patients seen. */
export function rushCap(run: RunSnapshot): number {
  return Math.min(5, 2 + Math.floor(run.combo / 3) + Math.floor(run.completed.length / 6));
}

function pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null {
  const pool = services.registries.cases.all();
  if (!pool.length) return null;
  const index = run.completed.length + run.failed.length;
  const rng = createRng(`${run.seed}|rush|${index}`);
  const used = new Set([...run.completed, ...run.failed]);
  const fresh = pool.filter((c) => !used.has(c.id));

  if (!fresh.length) {
    // Endless: once every patient has been seen the waiting room refills, drawing
    // from the patients seen least recently (never the one who just left).
    // (RunSnapshot keeps completed/failed separately, so "recent" = the tail of each.)
    const k = Math.max(1, Math.floor(pool.length / 2));
    const recent = new Set([...run.completed.slice(-k), ...run.failed.slice(-k)]);
    const rested = pool.filter((c) => !recent.has(c.id));
    return pickCase(rested.length ? rested : pool, rng);
  }

  const cap = rushCap(run);
  const inRange = fresh.filter((c) => c.difficulty <= cap);
  const tier = inRange.length ? inRange : fresh;
  // Prefer quick patients: draw from the fastest ~60% of the tier.
  const sorted = [...tier].sort((a, b) => quickness(a) - quickness(b) || a.id.localeCompare(b.id));
  const fastest = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.6)));
  return rng.pick(fastest);
}

const rush: ModeModule = {
  id: 'rush',
  title: 'Rush Hour',
  tagline: 'The waiting room never empties. Keep the streak alive — three slips and the doors close.',
  icon: '⚡',
  accent: '#fb923c',
  order: 30,
  // Design note (internal): 'one more patient' momentum — the streak multiplier is the pull.
  rules: { length: 'endless', lives: RUSH_LIVES, scoreMultiplier: 1, hints: false, autoRun: true, comboMultiplier: rushComboMultiplier },
  pickNext,
};

export default rush;
