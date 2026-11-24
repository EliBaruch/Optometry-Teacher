import { createRng, pickCase, type ClinicalCase, type GameServices, type ModeModule, type RunSnapshot } from '@core';
import { casesCompleted, ensureTracking } from './experience';

export const CODE_RED_LENGTH = 4;
export const CODE_RED_UNLOCK = 3;
/** Fallback clock for urgent cases that carry no timer of their own. */
export const CODE_RED_FALLBACK_SEC = 150;

/** Sight- or life-threatening presentations: explicit emergencies and same-day urgents. */
export function isCodeRed(c: ClinicalCase): boolean {
  return !!c.emergency || c.urgency === 'emergency' || c.urgency === 'urgent';
}

function pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null {
  const pool = services.registries.cases.all().filter(isCodeRed);
  const used = new Set([...run.completed, ...run.failed]);
  const fresh = pool.filter((c) => !used.has(c.id));
  // No repeats in Code Red: when the emergency board is clear, the run ends.
  if (!fresh.length) return null;
  const index = run.completed.length + run.failed.length;
  const rng = createRng(`${run.seed}|code-red|${index}`);
  const isFinale = index >= CODE_RED_LENGTH - 1;
  // Crescendo: urgent warm-ups first, the true emergency saved for the finale.
  const want = isFinale
    ? fresh.filter((c) => c.urgency === 'emergency' || !!c.emergency)
    : fresh.filter((c) => c.urgency === 'urgent' && !c.emergency);
  const tier = want.length ? want : fresh;
  // Difficulty ramps patient by patient: 1–2, 1–3, 2–4, 3–5 (nearest available if none fit).
  const centre = Math.min(5, 1 + index);
  const min = Math.max(1, centre - 1);
  const max = Math.min(5, centre + 1);
  const dist = (c: ClinicalCase) => (c.difficulty < min ? min - c.difficulty : c.difficulty > max ? c.difficulty - max : 0);
  const best = Math.min(...tier.map(dist));
  return pickCase(tier.filter((c) => dist(c) === best), rng);
}

const codeRed: ModeModule = {
  id: 'code-red',
  title: 'Code Red',
  tagline: 'Sight on the line. Spot the red flags and make the call before the clock runs out.',
  icon: '🚨',
  accent: '#ef4444',
  order: 40,
  drive: 'wrath',
  rules: {
    length: CODE_RED_LENGTH,
    // A FALLBACK for urgent cases without their own emergency timer: core's advanceRun()
    // starts each case with `kase.emergency?.timeLimitSec ?? rules.timeLimitSec`.
    timeLimitSec: CODE_RED_FALLBACK_SEC,
    scoreMultiplier: 1.5,
    hints: false,
    autoRun: true,
  },
  pickNext,
  locked(services) {
    ensureTracking(services);
    const done = casesCompleted(services);
    if (done < CODE_RED_UNLOCK) {
      const left = CODE_RED_UNLOCK - done;
      return `See ${left} more patient${left === 1 ? '' : 's'} to join the emergency rota.`;
    }
    if (!services.registries.cases.all().some(isCodeRed)) return 'The emergency board is quiet tonight. Check back soon.';
    return undefined;
  },
};

export default codeRed;
