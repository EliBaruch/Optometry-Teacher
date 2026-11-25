/** Player-facing status copy. Warm, never guilt-tripping. */
import type { FlameStatus, DailyView } from '../daily';
import type { FlameVariant } from './Flame';

export function statusLine(view: DailyView, best: number): string {
  switch (view.status) {
    case 'new':
      return 'See one patient to light your first flame.';
    case 'lit':
      return 'Lit for today.';
    case 'waiting':
      return 'One patient today keeps it glowing.';
    case 'protected':
      return view.pendingFrozen.length === 1 ? 'A freeze is keeping it warm.' : `Freezes are keeping it warm.`;
    case 'resting':
      return `Resting. Your best is ${best} ${best === 1 ? 'day' : 'days'} — one patient lights a new flame.`;
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

export const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
