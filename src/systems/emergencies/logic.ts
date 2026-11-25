/**
 * Code Red — pure logic (no DOM, no services). Unit-tested in logic.test.ts.
 *  - clock maths for the countdown & heartbeat,
 *  - outcome classification and learning-scaled rewards,
 *  - the deterministic weekly Grand Rounds pick,
 *  - persisted stats reducer.
 */
import { URGENCIES, createRng, pickStrings, type Locale, type ClinicalCase, type ScoreBreakdown, type ScorePart, type Urgency } from '@core';
import { S } from './strings';

// ── Clock ────────────────────────────────────────────────────────────────

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Seconds left on an emergency clock (never negative). */
export function remainingSec(startedAt: number, limitSec: number, now: number): number {
  return Math.max(0, limitSec - Math.max(0, now - startedAt) / 1000);
}

/** "2:00", "0:47"; under 10 s shows tenths: "9.4". */
export function formatClock(sec: number): string {
  const s = Math.max(0, sec);
  if (s < 10) return (Math.floor(s * 10) / 10).toFixed(1);
  const whole = Math.ceil(s);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Always minutes:seconds, e.g. "0:07", "1:42" (for elapsed times). */
export function formatMSS(sec: number): string {
  const whole = Math.max(0, Math.round(sec));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Short human duration for stats: "48s", "1m 52s". */
export function formatDuration(sec: number, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return t.durSec(s);
  return t.durMinSec(Math.floor(s / 60), String(s % 60).padStart(2, '0'));
}

/** 0 = calm, 1 = clock exhausted. */
export function intensity(remaining: number, limit: number): number {
  return limit > 0 ? clamp01(1 - remaining / limit) : 1;
}

/** Heart rate of the soundtrack: a resting 66 bpm climbing to ~150, then racing in the final 10 s. */
export function heartbeatBpm(remaining: number, limit: number): number {
  if (remaining <= 10) return 150 + (10 - Math.max(0, remaining)) * 2;
  return 66 + 84 * Math.pow(intensity(remaining, limit), 1.4);
}

export function heartbeatIntervalMs(remaining: number, limit: number): number {
  return Math.round(60000 / heartbeatBpm(remaining, limit));
}

export type ClockPhase = 'calm' | 'tense' | 'critical' | 'final';

export function clockPhase(remaining: number, limit: number): ClockPhase {
  if (remaining <= 10) return 'final';
  const f = limit > 0 ? remaining / limit : 0;
  if (f <= 0.25) return 'critical';
  if (f <= 0.55) return 'tense';
  return 'calm';
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i]! - v) * clamp01(t)).toString(16).padStart(2, '0')).join('');
}

/** Ring colour: candle gold → amber → Code Red crimson as the clock drains. */
export function clockColor(remaining: number, limit: number): string {
  const f = limit > 0 ? clamp01(remaining / limit) : 0;
  if (remaining <= 10) return '#f43f5e';
  if (f > 0.55) return mix('#ffd27a', '#fb923c', (1 - f) / 0.45);
  return mix('#fb923c', '#ef4444', (0.55 - f) / 0.3);
}

// ── Outcomes & rewards ───────────────────────────────────────────────────

/**
 * How an emergency resolved, judged on both axes an optometrist is graded on:
 *  - saved:          right diagnosis, right urgency;
 *  - over-triaged:   right diagnosis, referred faster than needed (safe, over-cautious);
 *  - under-triaged:  right diagnosis, referred slower than the condition allows;
 *  - referred:       wrong diagnosis, but sent on at least as fast as needed (patient safe);
 *  - missed:         wrong diagnosis and sent on too slowly;
 *  - timeout:        no decision before the clock ran out.
 */
export type Outcome = 'saved' | 'over-triaged' | 'under-triaged' | 'referred' | 'missed' | 'timeout';

const rank = (u: Urgency) => URGENCIES.indexOf(u);

/**
 * Classify a decision. `chosen` is the urgency the player picked and `required`
 * the case's own urgency; without them we can only tell right from wrong, so a
 * wrong urgency is assumed to be too slow (the unsafe direction).
 */
export function classify(
  score: Pick<ScoreBreakdown, 'diagnosisCorrect' | 'urgencyCorrect'>,
  chosen?: Urgency,
  required?: Urgency,
): Outcome {
  const dir = chosen && required ? Math.sign(rank(chosen) - rank(required)) : score.urgencyCorrect ? 0 : -1;
  if (score.diagnosisCorrect) return dir === 0 ? 'saved' : dir > 0 ? 'over-triaged' : 'under-triaged';
  return dir >= 0 ? 'referred' : 'missed';
}

/** The patient was sent on in time (whatever the label on the referral). */
export const patientSafe = (o: Outcome) => o === 'saved' || o === 'over-triaged' || o === 'referred';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RescueReward {
  coins: number;
  xp: number;
  rarity: Rarity;
  /** 0..1 — score.total / score.max (the overall grade signal) */
  quality: number;
  /** 0..1 — how thorough the work-up was: essential tests, key history, test technique, efficiency */
  mastery: number;
  /** 0..1 — share of the clock left when the call was made */
  timeLeft: number;
  /** 0..1 — how much of the decisiveness bonus the work-up unlocked */
  decisive: number;
  /** Earlier saves of this same case this week (each halves the bonus) */
  repeats: number;
  /** The right answer, but reached without the work-up that proves it */
  thin: boolean;
  /** Grand Rounds weekly bonus (0 when not applicable) */
  grandCoins: number;
  grandXp: number;
}

const part = (score: ScoreBreakdown, id: ScorePart['id']) => score.parts.find((p) => p.id === id);

/**
 * 0..1 work-up mastery: the share of essential tests, key history questions and
 * test technique actually earned, trimmed by wasted tests / hints. Diagnosis,
 * urgency and speed are excluded on purpose — a blind guess that happens to be
 * right scores 0 here.
 */
export function workupMastery(score: ScoreBreakdown): number {
  const rigour = (['workup', 'history', 'skill'] as const).map((id) => part(score, id)).filter((p): p is ScorePart => !!p);
  if (!rigour.length) {
    // No breakdown available: only the share of the grade beyond diagnosis + triage + speed counts.
    return score.max > 0 ? clamp01((score.total / score.max - 0.7) / 0.3) : 0;
  }
  const got = rigour.reduce((s, p) => s + p.points, 0);
  const max = rigour.reduce((s, p) => s + p.max, 0);
  const eff = part(score, 'efficiency');
  const effK = eff && eff.max > 0 ? clamp01(eff.points / eff.max) : 1;
  return clamp01((max > 0 ? got / max : 0) * (0.8 + 0.2 * effK));
}

/** Below this mastery a save is "thin": correct, but unproven. */
export const THIN_MASTERY = 0.45;

/**
 * Bonus for a sight saved. Driven by work-up mastery (never time spent). The
 * decisiveness term only opens up once the work-up is genuinely thorough, so a
 * fast blind guess earns little, and repeat saves of the same case in one week
 * halve each time (no farming a known answer).
 */
export function rescueReward(score: ScoreBreakdown, elapsedSec: number, limitSec: number, grandRounds: boolean, repeats = 0): RescueReward {
  const quality = score.max > 0 ? clamp01(score.total / score.max) : 0;
  const mastery = workupMastery(score);
  const timeLeft = limitSec > 0 ? clamp01(1 - elapsedSec / limitSec) : 0;
  const decisive = clamp01((mastery - 0.6) / 0.3);
  const k = Math.pow(0.5, Math.max(0, repeats));
  const coins = Math.round((15 + 65 * mastery + 20 * timeLeft * decisive) * k);
  const xp = Math.round((25 + 95 * mastery + 30 * timeLeft * decisive) * k);
  const thin = mastery < THIN_MASTERY;
  const rarity: Rarity = score.perfect ? 'legendary' : mastery >= 0.8 ? 'epic' : !thin ? 'rare' : 'common';
  const grand = grandRounds ? grandRoundsBonus(mastery) : { coins: 0, xp: 0 };
  return { coins, xp, rarity, quality, mastery, timeLeft, decisive, repeats, thin, grandCoins: grand.coins, grandXp: grand.xp };
}

/** Weekly Grand Rounds bonus: a quarter for any save, the rest earned by work-up mastery. */
export function grandRoundsBonus(mastery: number): { coins: number; xp: number } {
  const k = 0.25 + 0.75 * clamp01(mastery);
  return { coins: Math.round(150 * k), xp: Math.round(250 * k) };
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  emergency: 'Emergency',
  urgent: 'Urgent',
  soon: 'Soon',
  routine: 'Routine',
};

/** First sentence-ish of a teaching line, kept toast-sized. */
export function clip(text: string, max = 150): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(' — '));
  return (stop > 60 ? cut.slice(0, stop) : cut.slice(0, cut.lastIndexOf(' '))) + '…';
}

/** The red flag to teach after a miss: case red flags first, then teaching points. */
export function keyRedFlag(kase: Pick<ClinicalCase, 'redFlags' | 'teachingPoints'> | undefined): string | undefined {
  return kase?.redFlags?.[0] ?? kase?.teachingPoints?.[0];
}

export interface TeachingContext {
  /** Correct diagnosis name */
  dxName: string;
  /** The urgency the case requires */
  urgency: Urgency;
  /** Key red flag to remember */
  flag?: string;
  /** The diagnosis the player chose (for 'referred' / 'missed') */
  chosenDxName?: string;
}

/** Sober teaching line after any emergency that was not a clean save. */
export function teachingMessage(outcome: Exclude<Outcome, 'saved'>, c: TeachingContext, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  const { dxName, urgency, flag, chosenDxName } = c;
  const tail = flag ? t.tail(clip(flag)) : '';
  const not = chosenDxName && chosenDxName !== dxName ? t.notDx(chosenDxName) : '';
  switch (outcome) {
    case 'over-triaged':
      return t.msgOver(dxName, t.enoughLine[urgency]);
    case 'under-triaged':
      return t.msgUnder(dxName, t.urgencyLine[urgency], tail);
    case 'referred':
      return t.msgReferred(dxName, not, tail);
    case 'timeout':
      return t.msgTimeout(dxName, t.urgencyLine[urgency], tail);
    case 'missed':
      return t.msgMissed(dxName, not, t.urgencyLine[urgency], tail);
  }
}

/** A short nudge after a thin save: name the essential tests that would have proven it. */
export function confirmLine(missedTests: readonly string[], locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  if (!missedTests.length) return t.confirmNone;
  const list = missedTests.length > 1 ? `${missedTests.slice(0, -1).join(', ')}${t.and(missedTests[missedTests.length - 1]!)}${missedTests[missedTests.length - 1]}` : missedTests[0];
  return t.confirmSome(list!);
}

// ── Weeks & Grand Rounds ─────────────────────────────────────────────────

const DAY = 86400000;
const WEEK = 7 * DAY;

/*
 * Grand Rounds weeks run on UTC so every player, in every time zone, sees the
 * same featured case at the same moment (Monday 00:00 UTC rotation).
 */

/** UTC Monday 00:00 of the week containing `ms`. */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
}

/** ISO-8601 week key (UTC), e.g. "2026-W48". */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3));
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Thursday = Date.UTC(year, 0, 4 - ((jan4.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((thursday.getTime() - week1Thursday) / WEEK);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** ms until the next Grand Rounds rotation (next Monday 00:00 UTC). */
export function msUntilNextWeek(ms: number): number {
  return Math.max(0, weekStart(ms) + WEEK - ms);
}

export function formatRotation(ms: number, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return t.rotDH(Math.floor(h / 24), h % 24);
  if (h >= 1) return t.rotHM(h, Math.floor((ms % 3600000) / 60000));
  return t.rotM(Math.max(1, Math.ceil(ms / 60000)));
}

/** Cases eligible for Grand Rounds: true emergencies that carry their own clock. */
export function grandRoundsPool(cases: readonly ClinicalCase[]): ClinicalCase[] {
  return cases.filter((c) => (c.emergency?.timeLimitSec ?? 0) > 0).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Whole weeks since Monday 1 Jan 2024 (UTC). */
export function weekIndex(ms: number): number {
  return Math.round((weekStart(ms) - Date.UTC(2024, 0, 1)) / WEEK);
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** A seeded "shuffle bag" of pool positions for one cycle of n weeks. */
function bag(cycle: number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const rng = createRng(`lumen|grand-rounds|${cycle}`);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * Deterministic weekly feature case — the same for every player. Every timed
 * emergency is featured once per cycle (shuffle bag) and never two weeks running.
 */
export function grandRoundsCase(cases: readonly ClinicalCase[], now: number): ClinicalCase | undefined {
  const pool = grandRoundsPool(cases);
  const n = pool.length;
  if (!n) return undefined;
  const w = weekIndex(now);
  if (n < 3) return pool[mod(w, n)];
  const cycle = Math.floor(w / n);
  const order = bag(cycle, n);
  // Seam between cycles: don't repeat last cycle's final case (only positions 0/1 move, so the
  // previous bag's last entry is never affected by its own fix).
  if (order[0] === bag(cycle - 1, n)[n - 1]) [order[0], order[1]] = [order[1]!, order[0]!];
  return pool[order[mod(w, n)]!];
}

// ── Persisted stats ──────────────────────────────────────────────────────

export interface RecentRun {
  caseId: string;
  outcome: Outcome;
  sec: number;
  at: number;
}

export interface EmergencyStats {
  attempts: number;
  saved: number;
  /** Right diagnosis, referred faster than needed (safe) */
  overTriaged: number;
  /** Right diagnosis, referred too slowly */
  underTriaged: number;
  /** Wrong diagnosis, but sent on in time */
  referred: number;
  missed: number;
  timeouts: number;
  /** Sum of seconds-to-decision over saves (for the average) */
  totalSaveSec: number;
  fastestSaveSec: number | null;
  /** Diagnosis id → number of saves */
  savedBy: Record<string, number>;
  /** Consecutive saves (resets quietly; never shown as a loss) */
  run: number;
  bestRun: number;
  grandRounds: { week: string; claimed: boolean };
  grandRoundsTotal: number;
  /** Saves per case this week (diminishing returns on replaying a known case) */
  weekSaves: { week: string; byCase: Record<string, number> };
  recent: RecentRun[];
  achievements: string[];
}

export const STATS_VERSION = 2;

export const INITIAL_STATS: EmergencyStats = {
  attempts: 0, saved: 0, overTriaged: 0, underTriaged: 0, referred: 0, missed: 0, timeouts: 0,
  totalSaveSec: 0, fastestSaveSec: null, savedBy: {}, run: 0, bestRun: 0,
  grandRounds: { week: '', claimed: false }, grandRoundsTotal: 0, weekSaves: { week: '', byCase: {} }, recent: [], achievements: [],
};

/** Upgrade any older save (v1 had no over-triage / referred / weekly counts) without losing progress. */
export function migrateStats(old: unknown): EmergencyStats {
  if (!old || typeof old !== 'object') return INITIAL_STATS;
  const o = old as Partial<EmergencyStats>;
  return {
    ...INITIAL_STATS,
    ...o,
    savedBy: { ...(o.savedBy ?? {}) },
    grandRounds: o.grandRounds ?? INITIAL_STATS.grandRounds,
    weekSaves: o.weekSaves ?? INITIAL_STATS.weekSaves,
    recent: Array.isArray(o.recent) ? o.recent : [],
    achievements: Array.isArray(o.achievements) ? o.achievements : [],
  };
}

export interface RecordInput {
  caseId: string;
  diagnosisId: string;
  outcome: Outcome;
  sec: number;
  at: number;
  /** Week key of `at` (for the weekly repeat counter); defaults to weekKey(at) */
  week?: string;
  /** This save completed the current week's Grand Rounds */
  grandRoundsWeek?: string;
}

/** How many times this case was already saved this week. */
export function priorSavesThisWeek(s: EmergencyStats, caseId: string, week: string): number {
  return s.weekSaves.week === week ? (s.weekSaves.byCase[caseId] ?? 0) : 0;
}

const COUNTER: Partial<Record<Outcome, keyof EmergencyStats>> = {
  'over-triaged': 'overTriaged', 'under-triaged': 'underTriaged', referred: 'referred', missed: 'missed', timeout: 'timeouts',
};

export function recordOutcome(s: EmergencyStats, r: RecordInput): EmergencyStats {
  const saved = r.outcome === 'saved';
  // A save extends the run; an over-cautious (but safe, correct) call holds it; anything else quietly resets it.
  const run = saved ? s.run + 1 : r.outcome === 'over-triaged' ? s.run : 0;
  const week = r.week ?? weekKey(r.at);
  const counter = COUNTER[r.outcome];
  const next: EmergencyStats = {
    ...s,
    attempts: s.attempts + 1,
    saved: s.saved + (saved ? 1 : 0),
    totalSaveSec: s.totalSaveSec + (saved ? r.sec : 0),
    fastestSaveSec: saved ? (s.fastestSaveSec === null ? r.sec : Math.min(s.fastestSaveSec, r.sec)) : s.fastestSaveSec,
    savedBy: saved ? { ...s.savedBy, [r.diagnosisId]: (s.savedBy[r.diagnosisId] ?? 0) + 1 } : s.savedBy,
    run,
    bestRun: Math.max(s.bestRun, run),
    recent: [{ caseId: r.caseId, outcome: r.outcome, sec: Math.round(r.sec), at: r.at }, ...s.recent].slice(0, 8),
  };
  if (counter) (next as unknown as Record<string, number>)[counter] = ((s[counter] as number | undefined) ?? 0) + 1;
  if (saved) {
    const byCase = s.weekSaves.week === week ? s.weekSaves.byCase : {};
    next.weekSaves = { week, byCase: { ...byCase, [r.caseId]: (byCase[r.caseId] ?? 0) + 1 } };
  }
  if (saved && r.grandRoundsWeek) {
    next.grandRounds = { week: r.grandRoundsWeek, claimed: true };
    next.grandRoundsTotal = s.grandRoundsTotal + 1;
  }
  return next;
}

export function averageSaveSec(s: EmergencyStats): number | null {
  return s.saved > 0 ? s.totalSaveSec / s.saved : null;
}

export function grandRoundsClaimed(s: EmergencyStats, week: string): boolean {
  return s.grandRounds.week === week && s.grandRounds.claimed;
}

// ── Milestones ───────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface MilestoneRule extends Milestone {
  test(s: EmergencyStats, ctx: { reward?: RescueReward; score?: ScoreBreakdown }): boolean;
}

const MILESTONES: MilestoneRule[] = [
  { id: 'emergencies:first-save', title: 'First Sight Saved', description: 'Recognised an emergency and triaged it correctly.', icon: 'heart', test: (s) => s.saved >= 1 },
  { id: 'emergencies:steady-hands', title: 'Steady Hands', description: 'Five emergencies diagnosed and triaged correctly.', icon: 'lightning', test: (s) => s.saved >= 5 },
  { id: 'emergencies:on-call', title: 'On-Call Veteran', description: 'Fifteen sights saved.', icon: 'trophy', test: (s) => s.saved >= 15 },
  { id: 'emergencies:polymath', title: 'Red-Flag Polymath', description: 'Saved five different kinds of emergency.', icon: 'star', test: (s) => Object.keys(s.savedBy).length >= 5 },
  { id: 'emergencies:hat-trick', title: 'Three in a Row', description: 'Three consecutive emergencies saved.', icon: 'flame', test: (s) => s.run >= 3 },
  {
    id: 'emergencies:cool-head', title: 'Cool Head', description: 'A complete, flawless emergency work-up with half the clock to spare.', icon: 'clock',
    test: (_s, c) => !!c.score?.perfect && (c.reward?.timeLeft ?? 0) >= 0.5,
  },
  { id: 'emergencies:grand-rounds', title: 'Grand Rounds Presenter', description: 'Solved a weekly Grand Rounds case.', icon: 'crown', test: (s) => s.grandRoundsTotal >= 1 },
];

/** Milestones newly earned by `s` that are not yet in `s.achievements`. */
export function newMilestones(s: EmergencyStats, ctx: { reward?: RescueReward; score?: ScoreBreakdown } = {}, locale: Locale = 'en'): Milestone[] {
  const tx = pickStrings(S, locale).milestones;
  return MILESTONES.filter((m) => !s.achievements.includes(m.id) && m.test(s, ctx)).map(({ id, title, description, icon }) => ({ id, title: tx[id]?.title ?? title, description: tx[id]?.description ?? description, icon }));
}
