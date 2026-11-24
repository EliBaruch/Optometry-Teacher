/**
 * Pure SM-2-style scheduling maths. No I/O, no clock: every function takes
 * `now` explicitly so the scheduler is fully deterministic under test.
 *
 * Tweaks to classic SM-2 for a game where the same diagnosis can come up
 * several times in one evening:
 *  - Early successes (reviewed well before the card is due) don't advance the
 *    interval — you can't cram your way to mastery; spacing is what counts.
 *  - A lapse (quality < 3) schedules a short relearning step (minutes, not a
 *    day), so a missed diagnosis resurfaces in the same sitting.
 *  - A "confusion" (the player picked this diagnosis for someone else's case)
 *    is a soft lapse: ease dips, the interval halves and the card comes due
 *    soon — but earned repetitions aren't wiped out.
 */

export const MINUTE = 60_000;
export const DAY = 86_400_000;

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
/** Relearning step after a lapse. */
export const LAPSE_DELAY_MS = 10 * MINUTE;
/** A confused-with diagnosis comes back for a second look this soon. */
export const CONFUSION_DELAY_MS = 30 * MINUTE;
/** Successes up to this long before the due date still count as on-time. */
export const MAX_EARLY_TOLERANCE_MS = 12 * 60 * MINUTE;

export interface Card {
  /** SM-2 easiness factor, >= 1.3 */
  ease: number;
  /** Current inter-repetition interval in days (0 = relearning) */
  intervalDays: number;
  /** Consecutive successful, properly spaced reviews */
  reps: number;
  /** Epoch ms when the card is next due */
  due: number;
  /** Times the diagnosis was missed */
  lapses: number;
  /** Times this diagnosis was wrongly chosen for another case */
  confusions: number;
  /** Last quality recorded (0..5), or null if only ever confused */
  lastQuality: number | null;
  /** Times a case with this diagnosis was completed */
  seen: number;
  /** Epoch ms of the last review (or confusion) */
  lastReviewed: number;
}

export function newCard(now: number): Card {
  return {
    ease: DEFAULT_EASE, intervalDays: 0, reps: 0, due: now, lapses: 0, confusions: 0,
    lastQuality: null, seen: 0, lastReviewed: now,
  };
}

export function clampQuality(q: number): number {
  if (!Number.isFinite(q)) return 0;
  return Math.max(0, Math.min(5, Math.round(q)));
}

/** Classic SM-2 easiness update. */
export function nextEase(ease: number, q: number): number {
  const d = 5 - q;
  return Math.max(MIN_EASE, +(ease + (0.1 - d * (0.08 + d * 0.02))).toFixed(4));
}

function earlyTolerance(c: Card): number {
  return Math.min(MAX_EARLY_TOLERANCE_MS, c.intervalDays * DAY * 0.2);
}

/** True when a success at `now` counts as a properly spaced review. */
export function isOnTime(c: Card, now: number): boolean {
  return c.reps === 0 && c.intervalDays === 0 && c.lapses === 0
    ? true // brand-new card: the first encounter always counts
    : now >= c.due - earlyTolerance(c);
}

/** Apply one review with quality 0..5; returns a new card. */
export function review(card: Card, quality: number, now: number): Card {
  const q = clampQuality(quality);
  const c: Card = { ...card, seen: card.seen + 1, lastQuality: q, lastReviewed: now };

  if (q < 3) {
    c.ease = nextEase(card.ease, q);
    c.reps = 0;
    c.intervalDays = 0;
    c.lapses = card.lapses + 1;
    c.due = now + LAPSE_DELAY_MS;
    return c;
  }

  if (!isOnTime(card, now)) {
    // Early success: a little ease credit, no schedule progress.
    c.ease = Math.max(card.ease, nextEase(card.ease, q) - 0.05);
    return c;
  }

  c.ease = nextEase(card.ease, q);
  c.reps = card.reps + 1;
  if (c.reps === 1) c.intervalDays = 1;
  else if (c.reps === 2) c.intervalDays = 6;
  else c.intervalDays = Math.max(card.intervalDays + 1, Math.round(card.intervalDays * c.ease));
  c.due = now + c.intervalDays * DAY;
  return c;
}

/** Soft lapse for a diagnosis the player chose in place of the right one. */
export function confuse(card: Card, now: number): Card {
  return {
    ...card,
    ease: Math.max(MIN_EASE, +(card.ease - 0.15).toFixed(4)),
    reps: Math.max(0, card.reps - 1),
    intervalDays: Math.floor(card.intervalDays / 2),
    confusions: card.confusions + 1,
    due: Math.min(card.due, now + CONFUSION_DELAY_MS),
    lastReviewed: now,
  };
}

/** Repetitions needed (with growing spacing) before mastery can reach 1. */
export const MASTERY_REPS = 4;
/** Interval (days) at which the spacing component saturates. */
export const MASTERY_INTERVAL_DAYS = 21;
const EASE_CEIL = 2.8;

/**
 * 0..1 mastery estimate: a blend of consecutive spaced successes, the length of
 * the interval earned, and ease — scaled down when the card is overdue (memory
 * fades). Reaches 1 only after ~4 successful reviews spaced over weeks.
 */
export function masteryOf(c: Card | undefined, now: number): number {
  if (!c || c.seen === 0) return 0;
  const r = Math.min(1, c.reps / MASTERY_REPS);
  const i = Math.min(1, c.intervalDays / MASTERY_INTERVAL_DAYS);
  const e = Math.max(0, Math.min(1, (c.ease - MIN_EASE) / (EASE_CEIL - MIN_EASE)));
  const stability = Math.max(1, c.intervalDays) * DAY;
  const overdue = Math.max(0, now - c.due);
  const recency = 0.5 + 0.5 * Math.pow(0.5, overdue / stability);
  const m = (0.45 * r + 0.3 * i + 0.25 * e) * recency;
  return Math.max(0, Math.min(1, +m.toFixed(4)));
}

/** Coerce anything loaded from storage into a valid card (or null). */
export function sanitizeCard(raw: unknown, now: number): Card | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const num = (k: string, d: number, min = 0) => {
    const v = o[k];
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, v) : d;
  };
  const lq = o.lastQuality;
  return {
    ease: Math.max(MIN_EASE, num('ease', DEFAULT_EASE, MIN_EASE)),
    intervalDays: num('intervalDays', 0),
    reps: Math.floor(num('reps', 0)),
    due: num('due', now),
    lapses: Math.floor(num('lapses', 0)),
    confusions: Math.floor(num('confusions', 0)),
    lastQuality: typeof lq === 'number' && Number.isFinite(lq) ? clampQuality(lq) : null,
    seen: Math.floor(num('seen', 0)),
    lastReviewed: num('lastReviewed', now),
  };
}
