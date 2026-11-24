import { createRng, pickCase, type ClinicalCase, type GameServices, type ModeModule, type RunSnapshot } from '@core';

export const REVIEW_LENGTH = 4;
export const REVIEW_UNLOCK_SEEN = 2;

/**
 * Second Opinion: spaced-repetition review.
 *  1. Diagnoses due in the LearningPort (most overdue first), one case each.
 *  2. Otherwise the least-mastered diagnoses the player has already met.
 *  3. Otherwise anything unseen in this run.
 * Never repeats a case within a run; ends early when nothing fresh is left.
 */
function pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null {
  const reg = services.registries.cases;
  const used = new Set([...run.completed, ...run.failed]);
  const fresh = reg.all().filter((c) => !used.has(c.id));
  if (!fresh.length) return null;
  const index = run.completed.length + run.failed.length;
  const rng = createRng(`${run.seed}|review|${index}`);
  const usedDx = new Set([...used].map((id) => reg.get(id)?.diagnosis).filter(Boolean));
  const available = new Set(fresh.map((c) => c.diagnosis));

  const due = services.learning.due().filter((d) => !usedDx.has(d) && available.has(d));
  if (due.length) return pickCase(fresh.filter((c) => c.diagnosis === due[0]), rng);

  const ranked = [...available]
    .filter((d) => !usedDx.has(d))
    .map((d) => ({ d, m: services.learning.mastery(d) }))
    .sort((a, b) => a.m - b.m || (a.d < b.d ? -1 : 1));
  const met = ranked.filter((r) => r.m > 0);
  const target = (met.length ? met : ranked)[0]?.d;
  if (target) return pickCase(fresh.filter((c) => c.diagnosis === target), rng);
  return pickCase(fresh, rng);
}

const review: ModeModule = {
  id: 'review',
  title: 'Second Opinion',
  tagline: 'Familiar faces return: the diagnoses that once slipped past you, right when memory starts to fade.',
  icon: '🔍',
  accent: '#a78bfa',
  order: 50,
  drive: 'sloth',
  rules: { length: REVIEW_LENGTH, scoreMultiplier: 1, hints: true, autoRun: true },
  pickNext,
  locked(services) {
    const seen = services.learning.stats().seen;
    if (seen < REVIEW_UNLOCK_SEEN) {
      const left = REVIEW_UNLOCK_SEEN - seen;
      return `Diagnose ${left} more ${left === 1 ? 'condition' : 'different conditions'} and they’ll be back for a second look.`;
    }
    return undefined;
  },
};

export default review;
