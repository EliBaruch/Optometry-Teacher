import type { ClinicalCase } from './case';
import type { Rng } from './rng';

export interface PickOptions {
  /** Case ids to avoid (already seen in this run) */
  exclude?: readonly string[];
  minDifficulty?: number;
  maxDifficulty?: number;
  filter?: (c: ClinicalCase) => boolean;
  /** Prefer cases whose diagnosis is in this list (e.g. spaced-repetition due) */
  prefer?: readonly string[];
}

/**
 * Pick a case from a pool. Falls back gracefully: if the filtered pool is
 * empty, relaxes difficulty, then exclusions, so a run never dead-ends.
 */
export function pickCase(pool: readonly ClinicalCase[], rng: Rng, o: PickOptions = {}): ClinicalCase | null {
  const base = o.filter ? pool.filter(o.filter) : [...pool];
  if (!base.length) return null;
  const notSeen = base.filter((c) => !o.exclude?.includes(c.id));
  const inRange = (c: ClinicalCase) =>
    c.difficulty >= (o.minDifficulty ?? 1) && c.difficulty <= (o.maxDifficulty ?? 5);
  const tiers = [notSeen.filter(inRange), notSeen, base];
  for (const tier of tiers) {
    if (!tier.length) continue;
    const preferred = o.prefer?.length ? tier.filter((c) => o.prefer!.includes(c.diagnosis)) : [];
    return rng.pick(preferred.length ? preferred : tier);
  }
  return null;
}

/** YYYY-MM-DD in local time — the seed for daily content. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
