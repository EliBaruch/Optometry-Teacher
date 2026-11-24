import { createRng, dayKey, type ClinicalCase, type GameServices, type ModeModule, type RunSnapshot } from '@core';

export const DAILY_LENGTH = 3;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Today's three patients — identical for every player on the same day:
 * the pool is sorted by id (registry order depends on load order), shuffled
 * with createRng(dayKey), then one warm-up (difficulty ≤ 2), one middle (2–3)
 * and one stretch (≥ 3) are drawn with distinct diagnoses, and served easiest first.
 */
export function dailyCases(pool: readonly ClinicalCase[], key: string): ClinicalCase[] {
  if (!pool.length) return [];
  const rng = createRng(key);
  const deck = rng.shuffle([...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
  const picks: ClinicalCase[] = [];
  const take = (ok: (c: ClinicalCase) => boolean) => {
    if (picks.length >= DAILY_LENGTH) return;
    const c = deck.find((x) => !picks.includes(x) && !picks.some((p) => p.diagnosis === x.diagnosis) && ok(x));
    if (c) picks.push(c);
  };
  take((c) => c.difficulty <= 2);
  take((c) => c.difficulty >= 2 && c.difficulty <= 3);
  take((c) => c.difficulty >= 3);
  while (picks.length < DAILY_LENGTH) {
    const before = picks.length;
    take(() => true);
    if (picks.length === before) {
      // Not enough distinct diagnoses: allow a shared diagnosis rather than a short round.
      const c = deck.find((x) => !picks.includes(x));
      if (!c) break;
      picks.push(c);
    }
  }
  return picks.map((c, i) => ({ c, i })).sort((a, b) => a.c.difficulty - b.c.difficulty || a.i - b.i).map(({ c }) => c);
}

/**
 * The day this run belongs to, so a round that straddles midnight keeps its
 * patients: a seed that is a day key ("2026-11-24"), or one ending in the start
 * timestamp (core's beginRun uses "daily:<ms>"); otherwise today.
 */
export function runDay(services: GameServices, run?: Pick<RunSnapshot, 'seed'>): string {
  const seed = run?.seed ?? '';
  if (DAY_KEY_RE.test(seed)) return seed;
  const ms = /:(\d{10,})$/.exec(seed)?.[1];
  return dayKey(ms ? Number(ms) : services.clock.now());
}

/** Case ids for a day (for previews, rival boards, the hub card). */
export function dailyCaseIds(services: GameServices, key = dayKey(services.clock.now())): string[] {
  return dailyCases(services.registries.cases.all(), key).map((c) => c.id);
}

function pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null {
  const used = new Set([...run.completed, ...run.failed]);
  return dailyCases(services.registries.cases.all(), runDay(services, run)).find((c) => !used.has(c.id)) ?? null;
}

const daily: ModeModule = {
  id: 'daily',
  title: 'Daily Rounds',
  tagline: 'Three patients, the same for every clinician today. Make your chart the cleanest.',
  icon: '🗓️',
  accent: '#4ade80',
  order: 20,
  drive: 'envy',
  // No hints or auto-run: everyone plays the same patients on equal terms.
  rules: { length: DAILY_LENGTH, scoreMultiplier: 1, hints: false, autoRun: false },
  pickNext,
  locked(services) {
    return services.registries.cases.all().length ? undefined : 'Today’s patients are still on their way in.';
  },
};

export default daily;
