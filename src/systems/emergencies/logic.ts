/**
 * Code Red — pure logic (no DOM, no services). Unit-tested in logic.test.ts.
 *  - clock maths for the countdown & heartbeat,
 *  - outcome classification and learning-scaled rewards,
 *  - the deterministic weekly Grand Rounds pick,
 *  - persisted stats reducer.
 */
import { hashString, type ClinicalCase, type ScoreBreakdown, type Urgency } from '@core';

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

/** Short human duration for stats: "48s", "1m 52s". */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
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

export type Outcome = 'saved' | 'under-triaged' | 'missed' | 'timeout';

export function classify(score: Pick<ScoreBreakdown, 'diagnosisCorrect' | 'urgencyCorrect'>): Outcome {
  if (score.diagnosisCorrect && score.urgencyCorrect) return 'saved';
  if (score.diagnosisCorrect) return 'under-triaged';
  return 'missed';
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RescueReward {
  coins: number;
  xp: number;
  rarity: Rarity;
  /** 0..1 — score.total / score.max (the learning signal) */
  quality: number;
  /** 0..1 — share of the clock left when the call was made */
  timeLeft: number;
  /** Grand Rounds weekly bonus (0 when not applicable) */
  grandCoins: number;
  grandXp: number;
}

/**
 * Bonus for a sight saved. Scales with the quality of the work-up (the whole
 * score breakdown: diagnosis, triage, essential tests, efficiency, history,
 * technique) and with decisiveness — never with time spent playing.
 */
export function rescueReward(score: ScoreBreakdown, elapsedSec: number, limitSec: number, grandRounds: boolean): RescueReward {
  const quality = score.max > 0 ? clamp01(score.total / score.max) : 0;
  const timeLeft = limitSec > 0 ? clamp01(1 - elapsedSec / limitSec) : 0;
  const coins = Math.round(25 + 55 * quality + 20 * timeLeft);
  const xp = Math.round(40 + 80 * quality + 30 * timeLeft);
  const rarity: Rarity = score.perfect ? 'legendary' : quality >= 0.8 ? 'epic' : 'rare';
  const k = 0.5 + 0.5 * quality;
  return {
    coins, xp, rarity, quality, timeLeft,
    grandCoins: grandRounds ? Math.round(150 * k) : 0,
    grandXp: grandRounds ? Math.round(250 * k) : 0,
  };
}

const URGENCY_LINE: Record<Urgency, string> = {
  emergency: 'it needs a same-hour emergency referral',
  urgent: 'it needs to be seen the same day',
  soon: 'it needs review within days',
  routine: 'routine follow-up is enough',
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

/** Sober teaching toast after a missed / under-triaged / timed-out emergency. */
export function teachingMessage(outcome: Exclude<Outcome, 'saved'>, dxName: string, urgency: Urgency, flag?: string): string {
  const tail = flag ? ` Red flag to remember: ${clip(flag)}` : '';
  if (outcome === 'under-triaged') return `Right call on ${dxName} — but ${URGENCY_LINE[urgency]}.${tail}`;
  if (outcome === 'timeout') return `The clock ran out on this ${dxName} case.${tail}`;
  return `This was ${dxName}.${tail}`;
}

// ── Weeks & Grand Rounds ─────────────────────────────────────────────────

const DAY = 86400000;

/** Local Monday 00:00 of the week containing `ms`. */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return monday.getTime();
}

/** ISO-8601 week key in local time, e.g. "2026-W48". */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const year = thursday.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const week1Thursday = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7) + 3);
  const week = 1 + Math.round((thursday.getTime() - week1Thursday.getTime()) / (7 * DAY));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** ms until the next Grand Rounds rotation (next local Monday 00:00). */
export function msUntilNextWeek(ms: number): number {
  const start = new Date(weekStart(ms));
  const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return Math.max(0, next.getTime() - ms);
}

export function formatRotation(ms: number): string {
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h >= 1) return `${h}h ${Math.floor((ms % 3600000) / 60000)}m`;
  return `${Math.max(1, Math.ceil(ms / 60000))}m`;
}

/** Cases eligible for Grand Rounds: true emergencies that carry their own clock. */
export function grandRoundsPool(cases: readonly ClinicalCase[]): ClinicalCase[] {
  return cases.filter((c) => (c.emergency?.timeLimitSec ?? 0) > 0).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function pickIndex(week: string, n: number): number {
  return hashString(`lumen|grand-rounds|${week}`) % n;
}

/** Deterministic weekly feature case — the same for every player, never the same two weeks running. */
export function grandRoundsCase(cases: readonly ClinicalCase[], now: number): ClinicalCase | undefined {
  const pool = grandRoundsPool(cases);
  if (!pool.length) return undefined;
  let i = pickIndex(weekKey(now), pool.length);
  if (pool.length > 1 && i === pickIndex(weekKey(now - 7 * DAY), pool.length)) i = (i + 1) % pool.length;
  return pool[i];
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
  underTriaged: number;
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
  recent: RecentRun[];
  achievements: string[];
}

export const STATS_VERSION = 1;

export const INITIAL_STATS: EmergencyStats = {
  attempts: 0, saved: 0, underTriaged: 0, missed: 0, timeouts: 0,
  totalSaveSec: 0, fastestSaveSec: null, savedBy: {}, run: 0, bestRun: 0,
  grandRounds: { week: '', claimed: false }, grandRoundsTotal: 0, recent: [], achievements: [],
};

export interface RecordInput {
  caseId: string;
  diagnosisId: string;
  outcome: Outcome;
  sec: number;
  at: number;
  /** This save completed the current week's Grand Rounds */
  grandRoundsWeek?: string;
}

export function recordOutcome(s: EmergencyStats, r: RecordInput): EmergencyStats {
  const saved = r.outcome === 'saved';
  const run = saved ? s.run + 1 : 0;
  const next: EmergencyStats = {
    ...s,
    attempts: s.attempts + 1,
    saved: s.saved + (saved ? 1 : 0),
    underTriaged: s.underTriaged + (r.outcome === 'under-triaged' ? 1 : 0),
    missed: s.missed + (r.outcome === 'missed' ? 1 : 0),
    timeouts: s.timeouts + (r.outcome === 'timeout' ? 1 : 0),
    totalSaveSec: s.totalSaveSec + (saved ? r.sec : 0),
    fastestSaveSec: saved ? (s.fastestSaveSec === null ? r.sec : Math.min(s.fastestSaveSec, r.sec)) : s.fastestSaveSec,
    savedBy: saved ? { ...s.savedBy, [r.diagnosisId]: (s.savedBy[r.diagnosisId] ?? 0) + 1 } : s.savedBy,
    run,
    bestRun: Math.max(s.bestRun, run),
    recent: [{ caseId: r.caseId, outcome: r.outcome, sec: Math.round(r.sec), at: r.at }, ...s.recent].slice(0, 8),
  };
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
export function newMilestones(s: EmergencyStats, ctx: { reward?: RescueReward; score?: ScoreBreakdown } = {}): Milestone[] {
  return MILESTONES.filter((m) => !s.achievements.includes(m.id) && m.test(s, ctx)).map(({ id, title, description, icon }) => ({ id, title, description, icon }));
}
