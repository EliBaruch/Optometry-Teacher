/** First-run micro-tutorial copy and its "seen" flag (per test). */
import type { TutorialStep } from './Overlays';

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

export const STEPS: Record<Variant, TutorialStep[]> = {
  acuity: [
    {
      icon: 'eye',
      title: 'One eye at a time',
      body: 'Tap the patient’s eye to cover it with the occluder (or press C). Test the right eye (OD) first with the left eye covered, then swap.',
    },
    {
      icon: 'chart',
      title: 'Point to a line',
      body: 'Turn the brass knob, scroll, or use ↑ ↓ to move down the projector chart, then ask them to read (Space). Green ticks are letters read correctly.',
    },
    {
      icon: 'target',
      title: 'Find the threshold',
      body: 'Chart the smallest line they read with more than half right (Enter) — and prove it by failing the line below. Past the top letter: count fingers, hand motion, light.',
    },
  ],
  pinhole: [
    {
      icon: 'pinhole',
      title: 'Flip to the pinhole',
      body: 'The fellow eye stays covered. Flip the occluder (P) so the tested eye looks through the pinholes: only the central rays get in, so defocus blur fades.',
    },
    {
      icon: 'chart',
      title: 'Re-measure',
      body: 'Find the smallest line read through the pinhole. Refractive blur clears; cataract, macular or optic-nerve loss does not.',
    },
    {
      icon: 'check',
      title: 'Make the call',
      body: 'Improves (≥ 2 lines) points to a refractive cause. No improvement (NI) means look for pathology. Eyes already 20/25 or better don’t need it.',
    },
  ],
};
