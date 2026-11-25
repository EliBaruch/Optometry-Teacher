/** First-run micro-tutorial copy and its "seen" flag (per test). */
import { pickStrings, type Locale } from '@core';
import type { TutorialStep } from './Overlays';
import { S } from './strings';

export type Variant = 'acuity' | 'pinhole';

const key = (v: Variant) => `lumen:${v === 'acuity' ? 'visual-acuity' : 'pinhole'}:tutorial-seen`;

export function tutorialSeen(v: Variant): boolean {
  try {
    return localStorage.getItem(key(v)) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen(v: Variant): void {
  try {
    localStorage.setItem(key(v), '1');
  } catch {
    /* private mode: the tutorial simply shows again next time */
  }
}

const ICONS: Record<Variant, TutorialStep['icon'][]> = {
  acuity: ['eye', 'chart', 'target'],
  pinhole: ['pinhole', 'chart', 'check'],
};

/** Tutorial steps for the edition: icons are shared, copy comes from the string table. */
export function stepsFor(v: Variant, locale: Locale = 'en'): TutorialStep[] {
  return pickStrings(S, locale).steps[v].map((s, i) => ({ icon: ICONS[v][i]!, title: s.title, body: s.body }));
}

export const STEPS: Record<Variant, TutorialStep[]> = { acuity: stepsFor('acuity'), pinhole: stepsFor('pinhole') };
