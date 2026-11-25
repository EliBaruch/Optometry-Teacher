/**
 * Pure league logic: persisted state shape, per-case points (driven by learning quality),
 * standings, overtakes and the weekly reset. No services, no DOM — fully unit-tested.
 */
import type { ScoreBreakdown } from '@core';
import { ROSTER, type Rival, type RivalId } from './roster';
import type { RivalCaseResult } from './sim';
import { boardPointsAt, dayKey, isoWeekStart, sampleTimes, weekEnd, weekKey, weekStart } from './week';

export const PLAYER_ID = 'you';
export type EntrantId = RivalId | typeof PLAYER_ID;

/** Full-credit patients per day; beyond this the board still counts, at a gentler rate. */
export const DAILY_FULL_CREDIT = 8;
export const LATE_CREDIT = 0.4;

export interface Comparison {
  caseId: string;
  at: number;
  player: {
    total: number;
    max: number;
    grade: ScoreBreakdown['grade'];
    timeSec: number;
    diagnosisCorrect: boolean;
    /** What the player called it (older saves may lack it). */
    chosenDiagnosisId?: string;
  };
  points: number;
  rivals: RivalCaseResult[];
}

export interface WeekSummary {
  weekKey: string;
  rank: number;
  field: number;
  points: number;
  cases: number;
  delivered: boolean;
}

/** Board progress during one shift/run, for the run summary. */
export interface RunTally {
  modeId: string;
  startedAt: number;
  points: number;
  cases: number;
  /** Patients where the player out-scored every colleague. */
  best: number;
  /** Colleagues passed on the board during the run (most recent last, unique). */
  passed: RivalId[];
  rankBefore: number;
}

export interface RivalsState {
  weekKey: string;
  joinedAt: number;
  /** Adapts colleagues' pace to the player's level (bounded). */
  scale: number;
  points: number;
  cases: number;
  correct: number;
  /** Cumulative points after each case this week, for the sparkline. */
  log: { t: number; p: number }[];
  day: string;
  dayCases: number;
  h2h: Partial<Record<RivalId, { w: number; l: number }>>;
  /** Last rank the player was shown (for "you slipped to #3" nudges). */
  lastRank: number;
  trend: { dir: 'up' | 'down'; at: number } | null;
  lastNudgeAt: number;
  last: Comparison | null;
  lastWeek: WeekSummary | null;
  bestRank: number | null;
  weeksPlayed: number;
  achievements: string[];
  run: RunTally | null;
}

export const STATE_VERSION = 1;

export function initialState(now: number): RivalsState {
  return {
    weekKey: weekKey(now),
    joinedAt: now,
    scale: 0.55,
    points: 0,
    cases: 0,
    correct: 0,
    log: [],
    day: dayKey(now),
    dayCases: 0,
    h2h: {},
    lastRank: 0,
    trend: null,
    lastNudgeAt: 0,
    last: null,
    lastWeek: null,
    bestRank: null,
    weeksPlayed: 0,
    achievements: [],
    run: null,
  };
}

/**
 * League points for one case — learning quality only:
 * overall score ratio, plus bonuses for the right diagnosis, the right urgency,
 * a complete essential work-up and a perfect case. Time spent never adds points.
 */
export function basePoints(s: ScoreBreakdown): number {
  const ratio = s.max > 0 ? Math.max(0, Math.min(1, s.total / s.max)) : 0;
  let p = Math.round(100 * ratio);
  if (s.diagnosisCorrect) p += 20;
  if (s.urgencyCorrect) p += 10;
  if (s.essentialMissed.length === 0) p += 10;
  if (s.perfect) p += 20;
  return p;
}

/** Points after the gentle daily taper (index = patients already completed today). */
export function casePoints(s: ScoreBreakdown, casesToday: number): number {
  const base = basePoints(s);
  return casesToday < DAILY_FULL_CREDIT ? base : Math.round(base * LATE_CREDIT);
}

export interface Standing {
  id: EntrantId;
  points: number;
  rank: number;
  rival?: Rival;
}

/** Board at time `now`. Ties go to the player (kindness over pedantry). */
export function standings(state: RivalsState, now: number, roster: readonly Rival[] = ROSTER): Standing[] {
  const rows: Standing[] = roster.map((r) => ({ id: r.id, points: boardPointsAt(r, now, state.scale, state.joinedAt), rank: 0, rival: r }));
  rows.push({ id: PLAYER_ID, points: state.points, rank: 0 });
  rows.sort((a, b) => b.points - a.points || (a.id === PLAYER_ID ? -1 : b.id === PLAYER_ID ? 1 : 0));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export function playerRank(rows: Standing[]): number {
  return rows.find((r) => r.id === PLAYER_ID)?.rank ?? rows.length;
}

/** The entrant directly above the player (undefined when the player leads). */
export function nextAbove(rows: Standing[]): Standing | undefined {
  const i = rows.findIndex((r) => r.id === PLAYER_ID);
  return i > 0 ? rows[i - 1] : undefined;
}

/** Rivals that were ahead before and are now behind the player. */
export function overtaken(before: Standing[], after: Standing[]): Rival[] {
  const pb = before.find((r) => r.id === PLAYER_ID)!;
  const pa = after.find((r) => r.id === PLAYER_ID)!;
  const out: Rival[] = [];
  for (const row of before) {
    if (!row.rival || row.rank >= pb.rank) continue;
    const now = after.find((r) => r.id === row.id)!;
    if (now.rank > pa.rank) out.push(row.rival);
  }
  return out.sort((a, b) => b.weeklyTarget - a.weeklyTarget);
}

/** Next week's field strength: follows the player's level, smoothly and within bounds. */
export function nextScale(prev: RivalsState): number {
  if (prev.cases === 0) return Math.max(0.45, prev.scale * 0.85);
  const target = Math.min(2.2, Math.max(0.45, prev.points / 2300));
  return Math.round((prev.scale * 0.5 + target * 0.5) * 1000) / 1000;
}

/** Division name for the current field strength. */
export function divisionName(scale: number): string {
  if (scale < 0.75) return 'Lantern Division';
  if (scale < 1.05) return 'Prism Division';
  return 'Aurora Division';
}

/**
 * Close the old week if the calendar moved FORWARD into a later week. Returns the same object
 * when nothing changed. A clock that moves backwards (timezone change, corrected clock) never
 * wipes or re-archives a week. The final board is taken at the old week's end.
 */
export function rollWeek(state: RivalsState, now: number, roster: readonly Rival[] = ROSTER): RivalsState {
  if (weekStart(now) <= isoWeekStart(state.weekKey)) return state;
  const wk = weekKey(now);
  let lastWeek: WeekSummary | null = null;
  let bestRank = state.bestRank;
  let weeksPlayed = state.weeksPlayed;
  if (state.cases > 0) {
    const endT = weekEnd(isoWeekStart(state.weekKey)) - 1;
    const rows = standings(state, endT, roster);
    const rank = playerRank(rows);
    lastWeek = { weekKey: state.weekKey, rank, field: rows.length, points: state.points, cases: state.cases, delivered: false };
    bestRank = bestRank === null ? rank : Math.min(bestRank, rank);
    weeksPlayed += 1;
  }
  return {
    ...state,
    weekKey: wk,
    scale: nextScale(state),
    points: 0,
    cases: 0,
    correct: 0,
    log: [],
    day: dayKey(now),
    dayCases: 0,
    h2h: {},
    lastRank: 0,
    trend: null,
    last: state.last,
    lastWeek: lastWeek ?? state.lastWeek,
    bestRank,
    weeksPlayed,
  };
}

/** Coins for the closing board (small, learning-driven since points are). Zero for very light weeks. */
export function weekReward(w: WeekSummary): number {
  if (w.cases < 3) return 0;
  if (w.rank === 1) return 150;
  if (w.rank <= 3) return 80;
  return 40;
}

/** Apply a finished case. Pure: returns the new state plus what changed. */
export function applyCase(
  state: RivalsState,
  now: number,
  caseId: string,
  score: ScoreBreakdown,
  rivals: RivalCaseResult[],
  roster: readonly Rival[] = ROSTER,
  modeId?: string,
): { state: RivalsState; points: number; before: Standing[]; after: Standing[]; passed: Rival[]; bestOnCase: boolean } {
  let s = rollWeek(state, now, roster);
  const today = dayKey(now);
  const casesToday = s.day === today ? s.dayCases : 0;
  const before = standings(s, now, roster);
  const pts = casePoints(score, casesToday);

  const h2h = { ...s.h2h };
  for (const r of rivals) {
    const cur = h2h[r.rivalId] ?? { w: 0, l: 0 };
    if (score.total > r.total) h2h[r.rivalId] = { ...cur, w: cur.w + 1 };
    else if (score.total < r.total) h2h[r.rivalId] = { ...cur, l: cur.l + 1 };
  }

  s = {
    ...s,
    points: s.points + pts,
    cases: s.cases + 1,
    correct: s.correct + (score.diagnosisCorrect ? 1 : 0),
    log: [...s.log, { t: now, p: s.points + pts }].slice(-200),
    day: today,
    dayCases: casesToday + 1,
    h2h,
    last: {
      caseId,
      at: now,
      player: {
        total: score.total,
        max: score.max,
        grade: score.grade,
        timeSec: score.elapsedSec,
        diagnosisCorrect: score.diagnosisCorrect,
        chosenDiagnosisId: score.chosenDiagnosisId,
      },
      points: pts,
      rivals,
    },
  };
  const after = standings(s, now, roster);
  const passed = overtaken(before, after);
  const rank = playerRank(after);
  const bestOnCase = rivals.length > 0 && score.diagnosisCorrect && rivals.every((r) => score.total > r.total);
  let run = s.run;
  if (run && modeId && run.modeId === modeId) {
    const ids = passed.map((r) => r.id);
    run = {
      ...run,
      points: run.points + pts,
      cases: run.cases + 1,
      best: run.best + (bestOnCase ? 1 : 0),
      passed: [...run.passed.filter((id) => !ids.includes(id)), ...ids],
    };
  }
  s = {
    ...s,
    lastRank: rank,
    trend: passed.length ? { dir: 'up', at: now } : s.trend,
    run,
  };
  return { state: s, points: pts, before, after, passed, bestOnCase };
}

/** A shift/run begins: start a fresh tally (the board itself carries on). */
export function startRun(state: RivalsState, now: number, modeId: string, roster: readonly Rival[] = ROSTER): RivalsState {
  const s = rollWeek(state, now, roster);
  return { ...s, run: { modeId, startedAt: now, points: 0, cases: 0, best: 0, passed: [], rankBefore: s.cases ? playerRank(standings(s, now, roster)) : 0 } };
}

/**
 * Has a colleague moved ahead since the player last looked? Returns who (for a gentle nudge),
 * at most once per `cooldownMs`, and only once the player has joined the week's race.
 */
export function checkSlipped(
  state: RivalsState,
  now: number,
  cooldownMs = 4 * 3_600_000,
  roster: readonly Rival[] = ROSTER,
): { state: RivalsState; passedBy?: Standing; gap?: number } {
  if (state.cases === 0) return { state };
  const rows = standings(state, now, roster);
  const rank = playerRank(rows);
  if (state.lastRank === 0 || rank <= state.lastRank) {
    return rank === state.lastRank ? { state } : { state: { ...state, lastRank: rank } };
  }
  const next = { ...state, lastRank: rank, trend: { dir: 'down' as const, at: now } };
  if (now - state.lastNudgeAt < cooldownMs) return { state: next };
  const above = nextAbove(rows);
  return {
    state: { ...next, lastNudgeAt: now },
    passedBy: above,
    gap: above ? above.points - state.points : undefined,
  };
}

export interface BoardSeries {
  id: EntrantId;
  color: string;
  points: { t: number; p: number }[];
}

/** Everyone's points through the week so far (player's line steps up at each finished case). */
export function boardSeries(state: RivalsState, now: number, roster: readonly Rival[] = ROSTER, samples = 42): BoardSeries[] {
  const times = sampleTimes(now, samples);
  const out: BoardSeries[] = roster.map((r) => ({
    id: r.id,
    color: r.color,
    points: times.map((t) => ({ t, p: boardPointsAt(r, t, state.scale, state.joinedAt) })),
  }));
  const you: { t: number; p: number }[] = [{ t: weekStart(now), p: 0 }];
  for (const e of state.log) if (e.t <= now) you.push({ t: e.t, p: e.p });
  you.push({ t: now, p: state.points });
  out.push({ id: PLAYER_ID, color: '#ffd27a', points: you });
  return out;
}
