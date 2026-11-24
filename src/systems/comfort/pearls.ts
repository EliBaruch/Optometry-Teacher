import { createRng, type Diagnosis, type LearningPort } from '@core';

export interface Pearl {
  diagnosisId: string;
  diagnosisName: string;
  text: string;
  /** Why this pearl was chosen (shown as a small tag). */
  reason: 'review' | 'seen' | 'discover';
}

/**
 * Tips of the day: one clinical pearl per diagnosis, ordered so the lounge
 * gently re-exposes what the player most needs (spaced repetition): first
 * diagnoses due for review, then ones already met, then new ground.
 * Deterministic per day so the "tip of the day" is stable across visits.
 */
export function pearlsFor(diagnoses: readonly Diagnosis[], learning: LearningPort, day: string, limit = 24): Pearl[] {
  const rng = createRng(`lounge-pearls:${day}`);
  const sorted = [...diagnoses].filter((d) => d.pearls?.length).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let due: string[] = [];
  try {
    due = learning.due(limit);
  } catch {
    due = [];
  }
  const dueSet = new Set(due);
  const seen = (id: string) => {
    try {
      return learning.seen(id);
    } catch {
      return false;
    }
  };
  const pick = (d: Diagnosis, reason: Pearl['reason']): Pearl => ({
    diagnosisId: d.id,
    diagnosisName: d.name,
    text: d.pearls[Math.floor(rng.next() * d.pearls.length)] ?? d.pearls[0]!,
    reason,
  });
  const review = due.map((id) => sorted.find((d) => d.id === id)).filter((d): d is Diagnosis => !!d).map((d) => pick(d, 'review'));
  const met = rng.shuffle(sorted.filter((d) => !dueSet.has(d.id) && seen(d.id))).map((d) => pick(d, 'seen'));
  const fresh = rng.shuffle(sorted.filter((d) => !dueSet.has(d.id) && !seen(d.id))).map((d) => pick(d, 'discover'));
  // Interleave known and new so the list never feels like homework.
  const mixed: Pearl[] = [];
  for (let i = 0; i < Math.max(met.length, fresh.length); i++) {
    if (fresh[i]) mixed.push(fresh[i]!);
    if (met[i]) mixed.push(met[i]!);
  }
  return [...review, ...mixed].slice(0, limit);
}
