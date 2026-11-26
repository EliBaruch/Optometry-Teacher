import { createRng, pickCase, type ClinicalCase, type GameServices, type ModeModule, type RunSnapshot } from '@core';
import { ensureTracking, experience } from './experience';

export const SHIFT_LENGTH = 5;

/**
 * Difficulty window [lo, hi] for a shift, from player experience
 * (≈ cases completed). The very first shift is gentle: difficulty 1–2.
 */
export function shiftWindow(xp: number): [number, number] {
  if (xp < 3) return [1, 2];
  if (xp < 8) return [1, 3];
  if (xp < 16) return [2, 4];
  if (xp < 30) return [2, 5];
  return [3, 5];
}

/** Within a shift, patients ramp from the low end of the window to the top. */
export function slotRange(lo: number, hi: number, index: number, length = SHIFT_LENGTH): { min: number; max: number } {
  const t = length <= 1 ? 1 : Math.min(1, index / (length - 1));
  const target = lo + Math.round((hi - lo) * t);
  return { min: Math.max(lo, target - 1), max: target };
}

function pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null {
  const reg = services.registries.cases;
  const pool = reg.all();
  if (!pool.length) return null;
  const index = run.completed.length + run.failed.length;
  const [lo, hi] = shiftWindow(experience(services));
  const { min, max } = slotRange(lo, hi, index);
  const rng = createRng(`${run.seed}|shift|${index}`);
  const used = new Set([...run.completed, ...run.failed]);

  const fresh = pool.filter((c) => !used.has(c.id));
  // Pool exhausted: the contract allows a repeat rather than an empty shift.
  if (!fresh.length) return pickCase(pool, rng, { minDifficulty: min, maxDifficulty: max });

  // Interleaving: avoid a second patient with the same diagnosis in one shift.
  const usedDx = new Set([...used].map((id) => reg.get(id)?.diagnosis).filter(Boolean));
  const varied = fresh.filter((c) => !usedDx.has(c.diagnosis));
  // Mid-shift, a diagnosis that is due for review gets priority (spaced retrieval).
  const prefer = index === 2 ? services.learning.due(5) : undefined;
  const candidates = nearestDifficulty(varied.length ? varied : fresh, min, max);
  return pickCase(candidates, rng, { minDifficulty: min, maxDifficulty: max, prefer });
}

/**
 * Cases inside [min, max]; if none, those closest to the window — so a small
 * pool degrades gracefully (a 3 rather than a 5 when a 1–2 was wanted).
 */
export function nearestDifficulty(cases: readonly ClinicalCase[], min: number, max: number): ClinicalCase[] {
  const dist = (c: ClinicalCase) => (c.difficulty < min ? min - c.difficulty : c.difficulty > max ? c.difficulty - max : 0);
  const best = Math.min(...cases.map(dist));
  return cases.filter((c) => dist(c) === best);
}

const shift: ModeModule = {
  id: 'shift',
  title: 'Clinic Shift',
  tagline: 'Five patients, one bright clinic day. Every chart tells a story.',
  text: { he: { title: 'משמרת במרפאה', tagline: 'חמישה מטופלים, יום אחד במרפאה. מאחורי כל תיק מסתתר סיפור.' } },
  icon: 'eye',
  accent: '#2257f0',
  order: 10,
  // Design note (internal): the craft of a well-run clinic — visible competence growing shift by shift.
  rules: { length: SHIFT_LENGTH, scoreMultiplier: 1, hints: true, autoRun: true },
  pickNext,
  locked(services) {
    ensureTracking(services);
    return undefined;
  },
};

export default shift;
