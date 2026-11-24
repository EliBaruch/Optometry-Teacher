import { dayKey, type EventBus, type GameServices } from '@core';

/** Persisted in save slot 'mode:daily': today's round, so it can be played once for score. */
export interface DailySave {
  /** Day key of the round being / last played. */
  day: string;
  /** Patients seen in that day's round (completed or timed out). */
  played: number;
  /** True once a round with at least one patient has ended that day. */
  done: boolean;
  /** Best total score that day. */
  best: number;
  /** Consecutive days with a finished round (ends if a day is skipped). */
  streak: number;
  /** Day key of the last finished round (for the streak). */
  lastDoneDay?: string;
}

export const DAILY_SLOT = 'mode:daily';
const EMPTY: DailySave = { day: '', played: 0, done: false, best: 0, streak: 0 };
const tracked = new WeakSet<EventBus>();

function slot(services: GameServices) {
  return services.save.slot<DailySave>(DAILY_SLOT, EMPTY, { version: 1 });
}

/** The day before `key` ("2026-11-24" → "2026-11-23"), computed in UTC on the key itself. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = Date.UTC(y!, (m ?? 1) - 1, d ?? 1) - 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Lazily follow daily rounds on the bus (modes have no install hook; the hub
 * calls locked() and a run calls pickNext() first, so tracking is live before
 * any daily patient is seen). Idempotent per bus.
 */
export function ensureDailyTracking(services: GameServices): void {
  if (tracked.has(services.bus)) return;
  tracked.add(services.bus);
  const s = slot(services);
  const today = () => dayKey(services.clock.now());
  const touch = (v: DailySave): DailySave => (v.day === today() ? v : { ...v, day: today(), played: 0, done: false, best: 0 });
  services.bus.on('mode:started', ({ modeId }) => {
    if (modeId === 'daily') s.update(touch);
  });
  const seenPatient = ({ modeId }: { modeId: string }) => {
    if (modeId === 'daily') s.update((v) => ({ ...touch(v), played: touch(v).played + 1 }));
  };
  services.bus.on('case:completed', seenPatient);
  services.bus.on('case:failed', (p) => {
    if (p.reason === 'timeout') seenPatient(p);
  });
  services.bus.on('mode:ended', ({ modeId, totalScore }) => {
    if (modeId !== 'daily') return;
    s.update((v) => {
      if (v.played <= 0 || v.done) return v.played > 0 ? { ...v, best: Math.max(v.best, totalScore) } : v;
      const streak = v.streak > 0 && v.lastDoneDay === previousDay(v.day) ? v.streak + 1 : 1;
      return { ...v, done: true, best: Math.max(v.best, totalScore), streak, lastDoneDay: v.day };
    });
  });
}

export interface DailyRecord {
  /** Today's round has been played for score. */
  doneToday: boolean;
  /** Best score today (0 when not yet played). */
  bestToday: number;
  /** Consecutive days of finished rounds that is still alive (today or yesterday). */
  streak: number;
}

export function dailyRecord(services: GameServices): DailyRecord {
  ensureDailyTracking(services);
  const v = slot(services).get();
  const today = dayKey(services.clock.now());
  const isToday = v.day === today;
  const alive = v.lastDoneDay === today || v.lastDoneDay === previousDay(today);
  return { doneToday: isToday && v.done, bestToday: isToday ? v.best : 0, streak: alive ? v.streak : 0 };
}
