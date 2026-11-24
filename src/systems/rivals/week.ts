/**
 * Calendar maths for the weekly board (local time, ISO weeks starting Monday)
 * and the deterministic growth curve of each colleague's weekly points.
 */
import { createRng } from '@core';
import type { Rival } from './roster';

export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

/** Local midnight of the Monday that starts the week containing `t`. */
export function weekStart(t: number): number {
  const d = new Date(t);
  const dow = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).getTime();
}

/** Local midnight that ends the week (next Monday 00:00). */
export function weekEnd(t: number): number {
  const s = new Date(weekStart(t));
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7).getTime();
}

/** ISO-8601 week key, e.g. "2026-W48". */
export function weekKey(t: number): string {
  const d = new Date(t);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - dow); // Thursday decides the ISO year
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Week number for display ("Week 48"). */
export function weekNumber(key: string): number {
  return Number(key.split('-W')[1] ?? 0);
}

/** Local calendar day key, e.g. "2026-11-24". */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 0..1 position in the week (local, DST-safe enough for a game board). */
export function weekProgress(t: number): number {
  const s = weekStart(t);
  const e = weekEnd(t);
  return Math.min(1, Math.max(0, (t - s) / (e - s)));
}

/** "3d 4h" / "5h 12m" / "8m" until the board resets. */
export function timeLeftLabel(t: number): string {
  const ms = Math.max(0, weekEnd(t) - t);
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

/** Colleagues work 07:00–23:00; fraction of a day's work done by `hour` (smooth). */
function dayFraction(hour: number): number {
  const x = Math.min(1, Math.max(0, (hour - 7) / 16));
  return x * x * (3 - 2 * x);
}

/** Seeded per-week daily activity weights (Mon..Sun) for a colleague. */
export function dailyWeights(rival: Rival, wk: string): number[] {
  const rng = createRng(`rivals:${rival.id}:${wk}`);
  return rival.weekRhythm.map((w) => Math.max(0, w * rng.float(0.7, 1.3)));
}

/**
 * A colleague's league points at time `t` within the week `wk` (monotonic, integer).
 * `scale` adapts the field to the player's level so the board stays a close race.
 */
export function rivalPointsAt(rival: Rival, t: number, scale: number): number {
  const wk = weekKey(t);
  const weights = dailyWeights(rival, wk);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const start = weekStart(t);
  const d = new Date(t);
  const dayIdx = Math.min(6, Math.max(0, Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start) / DAY_MS + 0.01)));
  let done = 0;
  for (let i = 0; i < dayIdx; i++) done += weights[i]!;
  const hour = d.getHours() + d.getMinutes() / 60;
  done += weights[dayIdx]! * dayFraction(hour);
  return Math.floor(rival.weeklyTarget * scale * (done / total));
}

/**
 * A colleague's points as seen on the board. In the week the player first joined, colleagues only
 * count what they earned after the player arrived, so a mid-week start is still a fair race.
 */
export function boardPointsAt(rival: Rival, t: number, scale: number, joinedAt: number): number {
  const p = rivalPointsAt(rival, t, scale);
  if (weekKey(joinedAt) !== weekKey(t)) return p;
  if (t <= joinedAt) return 0;
  return Math.max(0, p - rivalPointsAt(rival, joinedAt, scale));
}

/** Evenly spaced sample times from week start up to `now` (inclusive), for sparklines. */
export function sampleTimes(now: number, samples = 28): number[] {
  const s = weekStart(now);
  const step = WEEK_MS / samples;
  const out: number[] = [];
  for (let t = s; t < now; t += step) out.push(t);
  out.push(now);
  return out;
}
