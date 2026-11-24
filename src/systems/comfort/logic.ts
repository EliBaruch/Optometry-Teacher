/**
 * Lounge (system id 'comfort') — pure, deterministic rules.
 * Nothing in here touches the DOM, the bus or the clock: every function takes
 * the current time and returns a new state, so it is trivially testable.
 *
 * Guardrails baked in (see docs/ENGAGEMENT_DESIGN.md):
 *  - Missing a day never resets the gift calendar; it simply waits for you.
 *  - Clinic earnings are capped (8h) so there is no reason to "check in" often,
 *    and their rate is set by how well you treat patients, never by time played.
 *  - The welcome back is warm and guilt-free; no loss is ever applied.
 */
import { dayKey } from '@core';

export const SLOT = 'sys:comfort';
export const SLOT_VERSION = 1;

const HOUR = 3_600_000;
const MINUTE = 60_000;
export const DAY = 24 * HOUR;

/** Earnings stop accruing after this long away. */
export const EARN_CAP_HOURS = 8;
/** Shortest absence that counts as "away" (no modal for a quick tab switch). */
export const MIN_AWAY_MS = 20 * MINUTE;
/** Absence that triggers the comeback bonus. */
export const COMEBACK_AFTER_MS = 3 * DAY;
/** The comeback bonus can be given at most once per this window. */
export const COMEBACK_COOLDOWN_MS = 7 * DAY;
export const COMEBACK_COINS = 150;
/** Coins per hour while away: base + bonus × clinical skill (0..1). */
export const RATE_BASE = 4;
export const RATE_SKILL = 11;
/** How many recent cases feed the skill estimate. */
export const SKILL_WINDOW = 12;
/** After this many patients in one day the lounge suggests a rest. */
export const REST_AFTER_CASES = 12;

export type GiftRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface GiftDay {
  /** 1..7 */
  day: number;
  coins: number;
  /** Mystery satchel: an extra coin bundle whose size is a published rarity roll. */
  satchel: boolean;
  label: string;
}

/** The 7-day escalating calendar. It cycles; it never resets. */
export const GIFT_CALENDAR: readonly GiftDay[] = [
  { day: 1, coins: 20, satchel: false, label: 'Fresh coffee' },
  { day: 2, coins: 30, satchel: false, label: 'Warm scarf' },
  { day: 3, coins: 40, satchel: true, label: 'Supply satchel' },
  { day: 4, coins: 50, satchel: false, label: 'Brass lens cloth' },
  { day: 5, coins: 60, satchel: false, label: 'Velvet case' },
  { day: 6, coins: 75, satchel: false, label: 'Candle tin' },
  { day: 7, coins: 120, satchel: true, label: 'Grand satchel' },
];

/** Satchel bonus coins per rarity. */
export const SATCHEL_BONUS: Record<GiftRarity, number> = { common: 25, rare: 60, epic: 120, legendary: 250 };

export interface WelcomeNote {
  awayMs: number;
  /** Coins in the jar at the moment of return (whole coins). */
  coins: number;
  comebackCoins: number;
  at: number;
}

export interface ComfortState {
  /** Last time the player was seen with the game in front of them. */
  lastSeenAt: number | null;
  /** Uncollected clinic earnings (fractional coins). */
  jar: number;
  /** Recent case quality, 0..1 (score total / max). Feeds the earnings rate. */
  recent: number[];
  gift: {
    /** dayKey of the last claim */
    lastClaimDay: string | null;
    /** index (0..6) of the next calendar day to claim */
    next: number;
    totalClaims: number;
  };
  comebackAt: number | null;
  welcome: WelcomeNote | null;
  /** dayKey of the last completed Daily Rounds (fallback when the mode cannot tell us). */
  dailyDoneDay: string | null;
  /** Patients seen today (for the "good stopping point" note). */
  today: { day: string | null; cases: number };
  quiet: boolean;
  lifetime: { earned: number; gifts: number };
}

export const INITIAL: ComfortState = {
  lastSeenAt: null,
  jar: 0,
  recent: [],
  gift: { lastClaimDay: null, next: 0, totalClaims: 0 },
  comebackAt: null,
  welcome: null,
  dailyDoneDay: null,
  today: { day: null, cases: 0 },
  quiet: false,
  lifetime: { earned: 0, gifts: 0 },
};

/** Defensive normalisation of whatever came out of storage. */
export function sanitize(s: Partial<ComfortState> | null | undefined): ComfortState {
  const v = { ...INITIAL, ...(s ?? {}) };
  const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  return {
    lastSeenAt: v.lastSeenAt == null ? null : num(v.lastSeenAt, 0) || null,
    jar: Math.max(0, num(v.jar, 0)),
    recent: Array.isArray(v.recent) ? v.recent.filter((x) => typeof x === 'number' && x >= 0 && x <= 1).slice(-SKILL_WINDOW) : [],
    gift: {
      lastClaimDay: typeof v.gift?.lastClaimDay === 'string' ? v.gift.lastClaimDay : null,
      next: Math.min(6, Math.max(0, Math.floor(num(v.gift?.next, 0)))),
      totalClaims: Math.max(0, Math.floor(num(v.gift?.totalClaims, 0))),
    },
    comebackAt: v.comebackAt == null ? null : num(v.comebackAt, 0) || null,
    welcome: v.welcome && typeof v.welcome === 'object' ? v.welcome : null,
    dailyDoneDay: typeof v.dailyDoneDay === 'string' ? v.dailyDoneDay : null,
    today: { day: typeof v.today?.day === 'string' ? v.today.day : null, cases: Math.max(0, num(v.today?.cases, 0)) },
    quiet: !!v.quiet,
    lifetime: { earned: Math.max(0, num(v.lifetime?.earned, 0)), gifts: Math.max(0, num(v.lifetime?.gifts, 0)) },
  };
}

// ── Skill → earnings rate ────────────────────────────────────────────────

/** 0..1 — mean quality of recent cases (0 before any case). */
export function skillOf(s: Pick<ComfortState, 'recent'>): number {
  if (!s.recent.length) return 0;
  return s.recent.reduce((a, b) => a + b, 0) / s.recent.length;
}

/** Coins per hour the clinic earns while you are away. */
export function ratePerHour(s: Pick<ComfortState, 'recent'>): number {
  return RATE_BASE + RATE_SKILL * skillOf(s);
}

/** Maximum the jar can hold (the 8-hour cap at the current rate). */
export function jarCapacity(s: Pick<ComfortState, 'recent'>): number {
  return ratePerHour(s) * EARN_CAP_HOURS;
}

/**
 * Record a finished case. Quality is the share of available points earned,
 * so the rate rewards diagnosis, triage, work-up, history and technique.
 */
export function recordCase(s: ComfortState, total: number, max: number, now: number): ComfortState {
  const q = max > 0 ? Math.max(0, Math.min(1, total / max)) : 0;
  const day = dayKey(now);
  const today = s.today.day === day ? { day, cases: s.today.cases + 1 } : { day, cases: 1 };
  return { ...s, recent: [...s.recent, q].slice(-SKILL_WINDOW), today };
}

export function casesToday(s: ComfortState, now: number): number {
  return s.today.day === dayKey(now) ? s.today.cases : 0;
}

// ── Away earnings & comeback ─────────────────────────────────────────────

/** Coins earned for an absence (already capped at EARN_CAP_HOURS). */
export function earningsFor(s: Pick<ComfortState, 'recent'>, awayMs: number): number {
  if (!(awayMs > 0)) return 0;
  const hours = Math.min(awayMs, EARN_CAP_HOURS * HOUR) / HOUR;
  return ratePerHour(s) * hours;
}

/**
 * Evaluate a return to the clinic. Adds the absence's earnings to the jar
 * (never above capacity), decides on the comeback bonus, and prepares the
 * welcome note when the absence was long enough to deserve one.
 * A clock that moved backwards simply re-anchors `lastSeenAt`.
 */
export function arrive(s: ComfortState, now: number): ComfortState {
  const seen = s.lastSeenAt;
  if (seen == null || now <= seen) return { ...s, lastSeenAt: now };
  const away = now - seen;
  if (away < MIN_AWAY_MS) return { ...s, lastSeenAt: now };
  const cap = jarCapacity(s);
  const jar = Math.min(cap, s.jar + earningsFor(s, away));
  const comebackDue = away >= COMEBACK_AFTER_MS && (s.comebackAt == null || now - s.comebackAt >= COMEBACK_COOLDOWN_MS);
  const coins = Math.floor(jar);
  const prev = s.welcome;
  const welcome: WelcomeNote | null =
    coins >= 1 || comebackDue || prev
      ? {
          awayMs: away,
          coins,
          // an un-dismissed comeback stays on the note
          comebackCoins: comebackDue ? COMEBACK_COINS : prev?.comebackCoins ?? 0,
          at: now,
        }
      : null;
  return { ...s, lastSeenAt: now, jar, welcome, comebackAt: comebackDue ? now : s.comebackAt };
}

/** Collect the whole coins in the jar (+ any comeback bonus on the note). */
export function collect(s: ComfortState): { state: ComfortState; coins: number; comeback: number } {
  const coins = Math.floor(s.jar);
  const comeback = s.welcome?.comebackCoins ?? 0;
  return {
    state: { ...s, jar: s.jar - coins, welcome: null, lifetime: { ...s.lifetime, earned: s.lifetime.earned + coins + comeback } },
    coins,
    comeback,
  };
}

/** Close the welcome note without collecting: the coins stay safe in the jar. */
export function dismissWelcome(s: ComfortState): ComfortState {
  if (!s.welcome) return s;
  // A comeback bonus is a gift, not a test: it moves into the jar rather than vanishing.
  return { ...s, welcome: null, jar: s.jar + (s.welcome.comebackCoins || 0) };
}

// ── Daily gift ───────────────────────────────────────────────────────────

export function giftReady(s: ComfortState, now: number): boolean {
  return s.gift.lastClaimDay !== dayKey(now);
}

export function nextGift(s: ComfortState): GiftDay {
  return GIFT_CALENDAR[s.gift.next] ?? GIFT_CALENDAR[0]!;
}

/** Published satchel odds; better recent case quality shifts weight to rarer tiers. */
export function satchelOdds(skill: number, grand: boolean): Record<GiftRarity, number> {
  const k = Math.max(0, Math.min(1, skill));
  const w = grand
    ? { common: 40 - 15 * k, rare: 35, epic: 18 + 8 * k, legendary: 7 + 7 * k }
    : { common: 62 - 20 * k, rare: 28 + 8 * k, epic: 8 + 9 * k, legendary: 2 + 3 * k };
  const sum = w.common + w.rare + w.epic + w.legendary;
  return { common: w.common / sum, rare: w.rare / sum, epic: w.epic / sum, legendary: w.legendary / sum };
}

export function rollRarity(odds: Record<GiftRarity, number>, roll: number): GiftRarity {
  let acc = 0;
  for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
    acc += odds[r];
    if (roll < acc) return r;
  }
  return 'legendary';
}

export interface GiftResult {
  day: GiftDay;
  coins: number;
  satchel: { rarity: GiftRarity; coins: number } | null;
  total: number;
}

/**
 * Claim today's gift. `roll` is a 0..1 random number (seeded by the caller).
 * Returns null when today's gift was already opened.
 */
export function claimGift(s: ComfortState, now: number, roll: number): { state: ComfortState; result: GiftResult } | null {
  if (!giftReady(s, now)) return null;
  const day = nextGift(s);
  const satchel = day.satchel
    ? (() => {
        const rarity = rollRarity(satchelOdds(skillOf(s), day.day === 7), roll);
        return { rarity, coins: SATCHEL_BONUS[rarity] };
      })()
    : null;
  const total = day.coins + (satchel?.coins ?? 0);
  return {
    state: {
      ...s,
      gift: { lastClaimDay: dayKey(now), next: (s.gift.next + 1) % GIFT_CALENDAR.length, totalClaims: s.gift.totalClaims + 1 },
      lifetime: { ...s.lifetime, gifts: s.lifetime.gifts + 1 },
    },
    result: { day, coins: day.coins, satchel, total },
  };
}

/** ms until the next local midnight (when the next gift unlocks). */
export function msUntilTomorrow(now: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
  return Math.max(0, next - now);
}

// ── Formatting helpers (player-facing) ───────────────────────────────────

export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / MINUTE));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 48) {
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.floor(h / 24)} days`;
}

/** Warm, guilt-free greeting line for a return. */
export function welcomeLine(awayMs: number, hourOfDay: number): string {
  if (awayMs >= COMEBACK_AFTER_MS) return 'The lamps are lit and your chair is warm. It is lovely to have you back.';
  if (hourOfDay < 5 || hourOfDay >= 22) return 'A quiet night at Lumen. The rain kept the waiting room company.';
  if (hourOfDay < 12) return 'Morning light on the brass. Your technicians kept the clinic humming.';
  if (hourOfDay < 18) return 'An easy afternoon. The clinic ran smoothly while you were out.';
  return 'Evening at the observatory. Your team saved you a seat by the window.';
}
