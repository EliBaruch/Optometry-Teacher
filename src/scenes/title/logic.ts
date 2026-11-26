/** Pure helpers for the title scene (gaze, pupil light reflex, blink). */

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Map a pointer position to a gaze vector (-1..1) relative to the eye centre. */
export function gazeFromPointer(
  px: number, py: number, cx: number, cy: number, reach: number, max = { x: 0.62, y: 0.4 },
): { x: number; y: number } {
  const dx = (px - cx) / Math.max(1, reach);
  const dy = (py - cy) / Math.max(1, reach);
  const len = Math.hypot(dx, dy);
  const k = len > 1 ? 1 / len : 1; // soft ceiling: never beyond the unit disc
  // ease so small movements still read
  const ease = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 0.8);
  return { x: clamp(ease(dx * k), -1, 1) * max.x, y: clamp(ease(dy * k), -1, 1) * max.y };
}

/** Exponential smoothing independent of frame rate. */
export function damp(cur: number, target: number, rate: number, dt: number): number {
  return target + (cur - target) * Math.exp(-rate * dt);
}

/** Light-sweep position 0..1 through a repeating cycle; -1 while idle between sweeps. */
export function sweepPhase(t: number, period = 7, active = 2.6, offset = 1.2): number {
  const m = (((t - offset) % period) + period) % period;
  return m < active ? m / active : -1;
}

/** 0..1 amount the beam illuminates the pupil (bell curve around the centre of the sweep). */
export function beamIllumination(phase: number): number {
  if (phase < 0) return 0;
  const d = (phase - 0.5) / 0.2;
  return Math.exp(-d * d);
}

/** Direct light reflex: bright light constricts (≈2.6 mm), dim room rests wide (≈5.4 mm). */
export function pupilForLight(illum: number, restMm = 5.4, minMm = 2.6): number {
  return restMm + (minMm - restMm) * clamp(illum, 0, 1);
}

/** Blink lid aperture at progress u (0..1): fast close, slower open. */
export function blinkAperture(u: number): number {
  if (u <= 0 || u >= 1) return 1;
  return u < 0.38 ? 1 - Math.sin((u / 0.38) * (Math.PI / 2)) : Math.sin(((u - 0.38) / 0.62) * (Math.PI / 2));
}

import type { Locale } from '@core';

export const INTRO_CARDS = [
  {
    icon: 'eye' as const,
    eyebrow: 'Welcome to Lumen',
    title: 'You are the new optometrist',
    body: 'A bright, modern clinic with a full schedule. Patients arrive with blurred, red, haloed or double vision, and you are the one who works out why.',
  },
  {
    icon: 'book' as const,
    eyebrow: 'How a consult works',
    title: 'History, tests, diagnosis',
    body: 'Ask the right questions. Run real clinical tests, each a small game that writes to the chart. Then name the diagnosis and decide how urgently they must be seen: routine, soon, urgent or emergency.',
    steps: ['History', 'Tests', 'Diagnosis', 'Urgency'],
  },
  {
    icon: 'trophy' as const,
    eyebrow: 'What you can earn',
    title: 'Rank, coins and rare irises',
    body: 'Sharp, safe calls earn grades, stars and coins. Climb the career ladder, outshine your rivals and collect jewel-like irises for your gallery.',
  },
];

export type IntroCard = { icon: 'eye' | 'book' | 'trophy'; eyebrow: string; title: string; body: string; steps?: string[] };

/** Hebrew edition: written fresh, not carried over sentence by sentence. */
export const INTRO_CARDS_HE: IntroCard[] = [
  {
    icon: 'eye',
    eyebrow: 'ברוכים הבאים ללומן',
    title: 'אתם האופטומטריסטים החדשים',
    body: 'מרפאה מודרנית ובהירה עם יומן מלא. מטופלים מגיעים עם ראייה מטושטשת, עיניים אדומות, הילות או ראייה כפולה, ואתם הולכים לפענח למה.',
  },
  {
    icon: 'book',
    eyebrow: 'ככה נראית בדיקה',
    title: 'אנמנזה, בדיקות, אבחנה',
    body: 'שואלים את השאלות הנכונות. עושים בדיקות קליניות אמיתיות, וכל אחת מהן היא משחק קטן שנרשם בתיק. בסוף מגיעים לאבחנה וקובעים כמה דחוף לראות את המטופל: שגרתי, בקרוב, דחוף או חירום.',
    steps: ['אנמנזה', 'בדיקות', 'אבחנה', 'דחיפות'],
  },
  {
    icon: 'trophy',
    eyebrow: 'מה יוצא לכם מזה',
    title: 'דרגות, מטבעות וקשתיות נדירות',
    body: 'החלטות חדות ובטוחות מזכות בציונים, בכוכבים ובמטבעות. מטפסים בסולם הקריירה, עוקפים את המתחרים ואוספים לגלריה קשתיות יקרות כמו אבני חן.',
  },
];

export const introCards = (locale: Locale): IntroCard[] => (locale === 'he' ? INTRO_CARDS_HE : INTRO_CARDS);
