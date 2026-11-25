/**
 * Daily streak: one finished patient a day keeps the flame alive.
 * Forgiving by design — freezes are earned by solid work and used automatically,
 * a broken streak can be rekindled, and nothing is ever taken away.
 */
import type { Grade, ScoreBreakdown } from '@core';
import { addDays, daysBetween, daysStrictlyBetween, isDayKey } from './days';

export const FREEZE_MAX = 2;
/** Solid cases (correct diagnosis, grade B or better) that bank one freeze. */
export const FREEZE_EVERY = 5;
/** Correct diagnoses needed to rekindle a broken streak (a Second Opinion review counts double). */
export const MEND_NEED = 2;
/** Days (today + this many) to rekindle. */
export const MEND_WINDOW = 1;
/** Patients in one day after which the panel suggests a natural pause instead of "one more". */
export const PAUSE_AFTER = 12;
export const HISTORY_DAYS = 120;

export interface Milestone {
  days: number;
  coins: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  title: string;
  /** A freeze is added to the bank (if there is room). */
  freeze?: boolean;
  achievement?: { id: string; title: string; description: string };
}

export const MILESTONES: readonly Milestone[] = [
  { days: 3, coins: 40, rarity: 'common', title: 'Three evenings running' },
  {
    days: 7, coins: 100, rarity: 'rare', title: 'A week by lamplight', freeze: true,
    achievement: { id: 'streaks-week', title: 'A Week by Lamplight', description: 'Saw at least one patient on seven days in a row.' },
  },
  {
    days: 14, coins: 200, rarity: 'epic', title: 'A fortnight of practice',
    achievement: { id: 'streaks-fortnight', title: 'Fortnight Flame', description: 'Kept the clinic lamp lit for fourteen days.' },
  },
  {
    days: 30, coins: 500, rarity: 'legendary', title: 'A full moon of clinics', freeze: true,
    achievement: { id: 'streaks-moon', title: 'Moon of Practice', description: 'Thirty days of steady, spaced practice.' },
  },
];

/** The milestone for a day count: the table, then every 30 days after 30. */
export function milestoneAt(days: number): Milestone | null {
  const m = MILESTONES.find((x) => x.days === days);
  if (m) return m;
  if (days > 30 && days % 30 === 0) {
    return { days, coins: 500, rarity: 'legendary', title: `${days} days of practice`, freeze: true };
  }
  return null;
}

export function nextMilestone(current: number): Milestone {
  for (const m of MILESTONES) if (m.days > current) return m;
  const next = (Math.floor(current / 30) + 1) * 30;
  return milestoneAt(next)!;
}

export interface Mend {
  /** The streak length that can be rekindled. */
  lost: number;
  /** Last day (inclusive) on which the rekindle counts. */
  deadline: string;
  progress: number;
  /** Milestones already claimed in the lost streak. */
  claimed: number[];
}

export interface DailyState {
  current: number;
  best: number;
  lastDay: string | null;
  /** Days with at least one finished patient (most recent last, capped). */
  played: string[];
  /** Days a freeze covered. */
  frozen: string[];
  freezes: number;
  /** Solid cases toward the next freeze. */
  freezeProgress: number;
  /** Milestones paid in the current streak. */
  claimed: number[];
  mend: Mend | null;
  /** Patients finished today (for the natural pause cue). */
  today: { day: string | null; cases: number };
  totalDays: number;
}

export const INITIAL_DAILY: DailyState = {
  current: 0, best: 0, lastDay: null, played: [], frozen: [], freezes: 0, freezeProgress: 0,
  claimed: [], mend: null, today: { day: null, cases: 0 }, totalDays: 0,
};

export type DayOutcome = 'same' | 'started' | 'continued' | 'frozen' | 'broken';

export interface TouchResult {
  daily: DailyState;
  outcome: DayOutcome;
  /** Freezes spent on missed days. */
  usedFreezes: number;
  /** Milestones newly reached (normally zero or one). */
  milestones: Milestone[];
  /** Streak length before a break (for the gentle copy). */
  lostStreak: number;
}

const capList = (xs: string[]) => (xs.length > HISTORY_DAYS ? xs.slice(-HISTORY_DAYS) : xs);

/** Count a finished patient on `today`. */
export function touchDay(prev: DailyState, today: string): TouchResult {
  const todayCount = prev.today.day === today ? prev.today.cases + 1 : 1;
  const base: DailyState = { ...prev, today: { day: today, cases: todayCount } };
  const empty = { usedFreezes: 0, milestones: [] as Milestone[], lostStreak: 0 };

  if (prev.lastDay === today) return { daily: base, outcome: 'same', ...empty };

  let next: DailyState = { ...base, lastDay: today, played: capList([...prev.played, today]), totalDays: prev.totalDays + 1 };
  let outcome: DayOutcome;
  let usedFreezes = 0;
  let lostStreak = 0;

  const gap = prev.lastDay ? daysBetween(prev.lastDay, today) : Infinity;
  if (!prev.lastDay || prev.current <= 0) {
    next = { ...next, current: 1, claimed: [] };
    outcome = 'started';
  } else if (gap <= 1) {
    // gap < 1 only happens if the clock went backwards; treat as a continuation, never a loss.
    next = { ...next, current: prev.current + 1 };
    outcome = 'continued';
  } else {
    const missed = daysStrictlyBetween(prev.lastDay, today);
    if (missed.length <= prev.freezes) {
      usedFreezes = missed.length;
      next = { ...next, current: prev.current + 1, freezes: prev.freezes - missed.length, frozen: capList([...prev.frozen, ...missed]) };
      outcome = 'frozen';
    } else {
      lostStreak = prev.current;
      next = {
        ...next,
        current: 1,
        claimed: [],
        mend: prev.current >= 2 ? { lost: prev.current, deadline: addDays(today, MEND_WINDOW), progress: 0, claimed: prev.claimed } : null,
      };
      outcome = 'broken';
    }
  }
  next.best = Math.max(next.best, next.current);
  const reached = collectMilestones(next);
  return { daily: reached.daily, outcome, usedFreezes, milestones: reached.milestones, lostStreak };
}

/** Claim every unclaimed milestone at or below the current streak. */
export function collectMilestones(d: DailyState): { daily: DailyState; milestones: Milestone[] } {
  const milestones: Milestone[] = [];
  let freezes = d.freezes;
  const claimed = [...d.claimed];
  const candidates = [...MILESTONES.map((m) => m.days)];
  for (let n = 60; n <= d.current; n += 30) candidates.push(n);
  for (const days of candidates) {
    if (days > d.current || claimed.includes(days)) continue;
    const m = milestoneAt(days);
    if (!m) continue;
    claimed.push(days);
    milestones.push(m);
    if (m.freeze) freezes = Math.min(FREEZE_MAX, freezes + 1);
  }
  if (!milestones.length) return { daily: d, milestones };
  return { daily: { ...d, claimed, freezes }, milestones };
}

export function isSolid(s: Pick<ScoreBreakdown, 'diagnosisCorrect' | 'grade'>): boolean {
  const good: Grade[] = ['S', 'A', 'B'];
  return s.diagnosisCorrect && good.includes(s.grade);
}

/** Bank freeze progress for a solid case. Returns whether a freeze was earned. */
export function earnFreeze(d: DailyState, solid: boolean): { daily: DailyState; earned: boolean } {
  if (!solid || d.freezes >= FREEZE_MAX) return { daily: d, earned: false };
  const progress = d.freezeProgress + 1;
  if (progress >= FREEZE_EVERY) return { daily: { ...d, freezes: d.freezes + 1, freezeProgress: 0 }, earned: true };
  return { daily: { ...d, freezeProgress: progress }, earned: false };
}

export interface MendResult {
  daily: DailyState;
  mended: boolean;
  milestones: Milestone[];
}

/** Progress a rekindle with a correct diagnosis (review mode counts double). Expired mends lapse quietly. */
export function progressMend(d: DailyState, today: string, correct: boolean, review: boolean): MendResult {
  const m = d.mend;
  if (!m) return { daily: d, mended: false, milestones: [] };
  if (daysBetween(m.deadline, today) > 0) return { daily: { ...d, mend: null }, mended: false, milestones: [] };
  if (!correct) return { daily: d, mended: false, milestones: [] };
  const progress = m.progress + (review ? 2 : 1);
  if (progress < MEND_NEED) return { daily: { ...d, mend: { ...m, progress } }, mended: false, milestones: [] };
  const current = m.lost + d.current;
  const claimed = [...new Set([...m.claimed, ...d.claimed])];
  const restored = collectMilestones({ ...d, current, best: Math.max(d.best, current), claimed, mend: null });
  return { daily: restored.daily, mended: true, milestones: restored.milestones };
}

export type FlameStatus = 'new' | 'lit' | 'waiting' | 'protected' | 'resting';

export interface DailyView {
  status: FlameStatus;
  /** Streak length to display right now. */
  streak: number;
  /** Missed days a banked freeze will cover when the next patient is seen. */
  pendingFrozen: string[];
  /** Active rekindle offer (not expired). */
  mend: Mend | null;
  /** Previous streak when resting (for "your 9-day flame is resting"). */
  resting: number;
  casesToday: number;
}

export function viewDaily(d: DailyState, today: string): DailyView {
  const mend = d.mend && daysBetween(d.mend.deadline, today) <= 0 ? d.mend : null;
  const casesToday = d.today.day === today ? d.today.cases : 0;
  const base = { pendingFrozen: [] as string[], mend, resting: 0, casesToday };
  if (!d.lastDay || d.current <= 0) return { ...base, status: 'new', streak: 0 };
  const gap = daysBetween(d.lastDay, today);
  if (gap <= 0) return { ...base, status: 'lit', streak: d.current };
  if (gap === 1) return { ...base, status: 'waiting', streak: d.current };
  const missed = daysStrictlyBetween(d.lastDay, today);
  if (missed.length <= d.freezes) return { ...base, status: 'protected', streak: d.current, pendingFrozen: missed };
  return { ...base, status: 'resting', streak: 0, resting: d.current };
}

/** Defensive load of a persisted slice. */
export function sanitizeDaily(raw: unknown): DailyState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<DailyState>;
  const n = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : min;
  const days = (v: unknown) => (Array.isArray(v) ? v.filter(isDayKey).slice(-HISTORY_DAYS) : []);
  const nums = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : []);
  const mendRaw = r.mend as Partial<Mend> | null | undefined;
  const mend: Mend | null =
    mendRaw && typeof mendRaw === 'object' && isDayKey(mendRaw.deadline)
      ? { lost: n(mendRaw.lost), deadline: mendRaw.deadline, progress: n(mendRaw.progress), claimed: nums(mendRaw.claimed) }
      : null;
  const todayRaw = (r.today ?? {}) as Partial<DailyState['today']>;
  const current = n(r.current);
  return {
    current,
    best: Math.max(n(r.best), current),
    lastDay: isDayKey(r.lastDay) ? r.lastDay : null,
    played: days(r.played),
    frozen: days(r.frozen),
    freezes: n(r.freezes, 0, FREEZE_MAX),
    freezeProgress: n(r.freezeProgress, 0, FREEZE_EVERY - 1),
    claimed: nums(r.claimed),
    mend,
    today: { day: isDayKey(todayRaw.day) ? todayRaw.day : null, cases: n(todayRaw.cases) },
    totalDays: n(r.totalDays),
  };
}
