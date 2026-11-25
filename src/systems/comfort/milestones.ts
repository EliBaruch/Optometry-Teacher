import { pickStrings, type Locale } from '@core';
import { S } from './strings';

/**
 * Tiered calendar milestones. Each id is stable, so a trophy wall shows one
 * entry per tier instead of a new copy every week.
 */
export interface Milestone {
  id: string;
  title: string;
  description: string;
}

const TIERS: readonly { weeks: number; id: string; title: string; description: string }[] = [
  { weeks: 1, id: 'lounge-week', title: 'A Week of Evenings', description: 'Opened all seven gifts on the Lounge calendar.' },
  { weeks: 4, id: 'lounge-month', title: 'A Month of Evenings', description: 'Completed the Lounge gift calendar four times.' },
  { weeks: 13, id: 'lounge-season', title: 'A Season by the Window', description: 'Completed the Lounge gift calendar thirteen times.' },
  { weeks: 52, id: 'lounge-year', title: 'A Year of Lamplight', description: 'Completed the Lounge gift calendar fifty-two times.' },
];

/** The milestone reached when the `weeks`-th calendar is completed (null between tiers). */
export function weekMilestone(weeks: number, locale: Locale = 'en'): Milestone | null {
  const t = TIERS.find((x) => x.weeks === weeks);
  const tx = t && pickStrings(S, locale).milestones[t.id];
  return t ? { id: t.id, title: tx?.title ?? t.title, description: tx?.description ?? t.description } : null;
}
