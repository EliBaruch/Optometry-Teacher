/** Player-facing status copy. Warm, never guilt-tripping. */
import type { FlameStatus, DailyView } from '../daily';
import type { FlameVariant } from './Flame';
import type { S } from '../strings';

type T = typeof S.en;

export function statusLine(view: DailyView, best: number, t: T): string {
  switch (view.status) {
    case 'new':
      return t.statusNew;
    case 'lit':
      return t.statusLit;
    case 'waiting':
      return t.statusWaiting;
    case 'protected':
      return view.pendingFrozen.length === 1 ? t.statusProtectedOne : t.statusProtectedMany;
    case 'resting':
      return t.statusResting(best);
  }
}

export function flameVariant(status: FlameStatus): FlameVariant {
  if (status === 'protected') return 'ice';
  if (status === 'new' || status === 'resting') return 'ember';
  return 'fire';
}

/** Flame intensity for a daily streak length. */
export function dailyIntensity(streak: number): number {
  return streak >= 30 ? 3 : streak >= 14 ? 2 : streak >= 3 ? 1 : 0;
}

export const days = (n: number, t: T) => t.days(n);
