import type { DiagnosisCategory, DiagnosisId, Grade, LearningPort } from '@core';
import type { DxRecord } from './state';

/**
 * Mastery stars per diagnosis (0–3). Stars reflect *durable* memory from the
 * spaced-repetition model, not just a single good day:
 *   ★     Recognised — diagnosed correctly at least once
 *   ★★    Competent  — spaced mastery ≥ 0.35 (≈ two spaced successes) and a best grade of B or better
 *   ★★★   Mastered   — spaced mastery ≥ 0.8 (several successes over weeks) and a best grade of A or S
 * Memory fades when reviews lapse, so stars can dim; the record of the best
 * stars ever earned is kept and shown as "due for review" (never revoked).
 */
export const STAR_LABEL = ['Undiscovered', 'Recognised', 'Competent', 'Mastered'] as const;
export const COMPETENT_AT = 0.35;
export const MASTERED_AT = 0.8;

const goodAtLeast = (g: Grade | null, set: Grade[]) => !!g && set.includes(g);

export function starsFor(rec: DxRecord | undefined, mastery: number): number {
  if (!rec || rec.correct <= 0) return 0;
  const m = Number.isFinite(mastery) ? mastery : 0;
  if (m >= MASTERED_AT && goodAtLeast(rec.best, ['S', 'A'])) return 3;
  if (m >= COMPETENT_AT && goodAtLeast(rec.best, ['S', 'A', 'B'])) return 2;
  return 1;
}

export function starsOf(learning: LearningPort, rec: DxRecord | undefined, id: DiagnosisId): number {
  let m = 0;
  try {
    m = learning.mastery(id);
  } catch {
    m = 0;
  }
  return starsFor(rec, m);
}

/** Player-facing category names for the constellation map (ordered). */
export const CATEGORY_ORDER: DiagnosisCategory[] = [
  'refractive', 'binocular', 'anterior', 'cornea', 'glaucoma', 'lens', 'retina', 'neuro', 'systemic', 'normal',
];
export const CATEGORY_LABEL: Record<DiagnosisCategory, string> = {
  refractive: 'Refraction',
  binocular: 'Binocular Vision',
  anterior: 'Anterior Segment',
  cornea: 'Cornea',
  glaucoma: 'Glaucoma',
  lens: 'Lens',
  retina: 'Retina',
  neuro: 'Neuro-ophthalmology',
  systemic: 'Systemic & Vascular',
  normal: 'Healthy Eyes',
};
/** Constellation names — the star-chart motif of the observatory. */
export const CONSTELLATION_NAME: Record<DiagnosisCategory, string> = {
  refractive: 'The Lens Maker',
  binocular: 'The Twins',
  anterior: 'The Veil',
  cornea: 'The Crystal',
  glaucoma: 'The Pressure Well',
  lens: 'The Pearl',
  retina: 'The Great Web',
  neuro: 'The Messenger',
  systemic: 'The Wanderer',
  normal: 'The Clear Sky',
};
