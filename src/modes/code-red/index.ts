import { createRng, pickCase, type ClinicalCase, type GameServices, type ModeModule, type RunSnapshot } from '@core';
import { casesCompleted, ensureTracking } from './experience';
import { pickStrings } from '@core';
import { S } from './strings';

export const CODE_RED_LENGTH = 4;
export const CODE_RED_UNLOCK = 3;
/** Fallback clock for urgent cases that carry no timer of their own. */
export const CODE_RED_FALLBACK_SEC = 150;

/** Sight- or life-threatening presentations: explicit emergencies and same-day urgents. */
export function isCodeRed(c: ClinicalCase): boolean {
  return isTrueEmergency(c) || c.urgency === 'urgent';
}

/** A true emergency: urgency 'emergency' or a case that carries its own emergency timer. */
export function isTrueEmergency(c: ClinicalCase): boolean {
  return !!c.emergency || c.urgency === 'emergency';
}

/** Distance of a case's difficulty from the [min, max] window (0 = inside). */
const gap = (c: ClinicalCase, min: number, max: number) =>
  c.difficulty < min ? min - c.difficulty : c.difficulty > max ? c.difficulty - max : 0;

/**
 * The emergency held back for the finale: the hardest unused one. Ties are
 * broken by a per-run hash of the id, so the choice is stable from patient 1
 * to patient 4 (removing other cases never changes which tied case wins).
 */
export function finaleCase(emergencies: readonly ClinicalCase[], seed: string): ClinicalCase | undefined {
  const top = Math.max(...emergencies.map((c) => c.difficulty));
  const hash = (c: ClinicalCase) => createRng(`${seed}|code-red|finale|${c.id}`).next();
  return emergencies
    .filter((c) => c.difficulty === top)
    .sort((a, b) => hash(a) - hash(b) || (a.id < b.id ? -1 : 1))[0];
}

/**
 * Every slot is drawn from TRUE emergencies (angle closure, RD, CRAO, GCA,
 * pupil-involving CN3, keratitis on a timer, acute stroke…):
 *  - slot 0 may be an 'urgent' warm-up, but only when there aren't enough
 *    unused emergencies to fill the whole shift;
 *  - urgent cases are otherwise only filler once the emergencies run out;
 *  - the hardest emergency is held back for the finale;
 *  - difficulty ramps patient by patient (1–2, 1–3, 2–4, 3–5; nearest if none fit).
 * No repeats: when the board is clear the run ends (null).
 */
function pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null {
  const used = new Set([...run.completed, ...run.failed]);
  const fresh = services.registries.cases.all().filter((c) => isCodeRed(c) && !used.has(c.id));
  if (!fresh.length) return null;
  const index = run.completed.length + run.failed.length;
  const rng = createRng(`${run.seed}|code-red|${index}`);
  const emergencies = fresh.filter(isTrueEmergency);
  const urgents = fresh.filter((c) => !isTrueEmergency(c));
  const slotsLeft = Math.max(1, CODE_RED_LENGTH - index);
  const isFinale = slotsLeft === 1;
  const finale = emergencies.length ? finaleCase(emergencies, run.seed) : undefined;

  if (isFinale && finale) return finale;

  let tier: ClinicalCase[];
  if (!emergencies.length) tier = urgents; // filler: the emergencies have all been seen
  else if (index === 0 && urgents.length && emergencies.length < slotsLeft) tier = urgents; // one warm-up
  else {
    // Keep the finale case in reserve while any other emergency remains.
    // (Only the finale case left? An urgent filler first, if there is one.)
    const others = emergencies.filter((c) => c !== finale);
    tier = others.length ? others : urgents.length ? urgents : emergencies;
  }

  const centre = Math.min(5, 1 + index);
  const min = Math.max(1, centre - 1);
  const max = Math.min(5, centre + 1);
  const best = Math.min(...tier.map((c) => gap(c, min, max)));
  return pickCase(tier.filter((c) => gap(c, min, max) === best), rng);
}

const codeRed: ModeModule = {
  id: 'code-red',
  title: 'Code Red',
  tagline: 'Sight on the line. Spot the red flags and make the call before the clock runs out.',
  text: { he: { title: 'קוד אדום', tagline: 'הראייה על הכף. זהו את דגלי האזהרה וקבלו החלטה לפני שהשעון נגמר.' } },
  icon: '🚨',
  accent: '#ef4444',
  order: 40,
  // Design note (internal): urgency, a heartbeat clock and a 'sight saved' finale.
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
      return pickStrings(S, services.locale).codeRedLocked(left);
    }
    if (!services.registries.cases.all().some(isCodeRed)) return pickStrings(S, services.locale).codeRedQuiet;
    return undefined;
  },
};

export default codeRed;
