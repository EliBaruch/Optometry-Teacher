/**
 * The Career ladder: seven ranks, three tiers each (the final rank keeps
 * counting tiers forever), on a smooth, gently steepening XP curve.
 * Pure and unit-tested — no services, no DOM.
 */

import type { Locale } from '@core';
import { RANK_HE, tierNumeral } from '../strings';

export interface RankDef {
  id: string;
  title: string;
  /** Short motto shown on the ladder / ceremony. */
  motto: string;
  /** Jewel colour of the crest. */
  color: string;
  /** Second crest colour (gradient highlight). */
  color2: string;
}

export const RANKS: readonly RankDef[] = [
  { id: 'student', title: 'Student', motto: 'Every expert began with a blurry chart.', color: '#c08457', color2: '#f3c99a' },
  { id: 'intern', title: 'Intern', motto: 'The white coat fits. Mostly.', color: '#b8c4d6', color2: '#f1f5fb' },
  { id: 'resident', title: 'Resident', motto: 'You trust your findings now.', color: '#5eead4', color2: '#d6fff6' },
  { id: 'associate', title: 'Associate', motto: 'Patients ask for you by name.', color: '#38bdf8', color2: '#d4f1ff' },
  { id: 'senior', title: 'Senior', motto: 'Colleagues bring you their hardest cases.', color: '#a78bfa', color2: '#efe8ff' },
  { id: 'director', title: 'Clinic Director', motto: 'The whole clinic runs on your call.', color: '#f59e0b', color2: '#fde68a' },
  { id: 'legend', title: 'Living Legend', motto: 'Your pearls are taught in lecture halls.', color: '#f472b6', color2: '#ffe3f3' },
];

export const TIERS_PER_RANK = 3;
/** Index of the first Living Legend level. */
export const LEGEND_LEVEL = (RANKS.length - 1) * TIERS_PER_RANK;
/** XP per tier once a Living Legend (the curve stops steepening). */
export const LEGEND_TIER_XP = 4500;

const round5 = (n: number) => Math.round(n / 5) * 5;

/** XP needed to go from level index `i` to `i + 1`. */
export function xpToNext(i: number): number {
  if (i >= LEGEND_LEVEL) return LEGEND_TIER_XP;
  return round5(80 + 55 * Math.pow(Math.max(0, i), 1.5));
}

const CUMULATIVE: number[] = [0];
for (let i = 0; i < LEGEND_LEVEL; i++) CUMULATIVE.push(CUMULATIVE[i]! + xpToNext(i));

/** Total XP at which level index `i` starts. */
export function xpAtLevel(i: number): number {
  if (i <= 0) return 0;
  if (i <= LEGEND_LEVEL) return CUMULATIVE[i]!;
  return CUMULATIVE[LEGEND_LEVEL]! + (i - LEGEND_LEVEL) * LEGEND_TIER_XP;
}

/** Level index (0-based) reached with `xp` total experience. */
export function levelForXp(xp: number): number {
  const x = Math.max(0, Math.floor(xp || 0));
  const legendAt = CUMULATIVE[LEGEND_LEVEL]!;
  if (x >= legendAt) return LEGEND_LEVEL + Math.floor((x - legendAt) / LEGEND_TIER_XP);
  let i = 0;
  while (i < LEGEND_LEVEL && CUMULATIVE[i + 1]! <= x) i++;
  return i;
}

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
export function roman(n: number): string {
  let v = Math.max(1, Math.floor(n));
  let out = '';
  for (const [k, s] of ROMAN) while (v >= k) { out += s; v -= k; }
  return out;
}

export function rankIndexOf(level: number): number {
  return Math.min(RANKS.length - 1, Math.floor(Math.max(0, level) / TIERS_PER_RANK));
}

/** 1-based tier within the rank (unbounded for Living Legend). */
export function tierOf(level: number): number {
  const l = Math.max(0, level);
  return l >= LEGEND_LEVEL ? l - LEGEND_LEVEL + 1 : (l % TIERS_PER_RANK) + 1;
}

/** A rank with its title and motto in the edition's language. */
export function localRank(r: RankDef, locale: Locale = 'en'): RankDef {
  const he = locale === 'he' ? RANK_HE[r.id] : undefined;
  return he ? { ...r, ...he } : r;
}

/** Tier numeral: "II" in English, "ב׳" in Hebrew. */
export function tierLabel(t: number, locale: Locale = 'en'): string {
  return tierNumeral(t, locale, roman(t));
}

/** "Resident II"; the first Living Legend tier is just "Living Legend". */
export function titleOf(level: number, locale: Locale = 'en'): string {
  const r = localRank(RANKS[rankIndexOf(level)]!, locale);
  const t = tierOf(level);
  if (r.id === 'legend' && t === 1) return r.title;
  return `${r.title} ${tierLabel(t, locale)}`;
}

export interface LevelInfo {
  /** 0-based level index */
  level: number;
  /** 1-based player-facing level number */
  number: number;
  rankIndex: number;
  rank: RankDef;
  tier: number;
  title: string;
  xp: number;
  levelStartXp: number;
  levelEndXp: number;
  /** XP earned inside the current level */
  into: number;
  /** XP the current level spans */
  span: number;
  /** 0..1 progress through the current level */
  progress: number;
  toNext: number;
  nextTitle: string;
  /** The next *rank* (not tier) and the XP still needed for it; null for Living Legend. */
  nextRank: RankDef | null;
  toNextRank: number;
}

export function levelInfo(xp: number, locale: Locale = 'en'): LevelInfo {
  const x = Math.max(0, Math.floor(xp || 0));
  const level = levelForXp(x);
  const start = xpAtLevel(level);
  const end = xpAtLevel(level + 1);
  const rankIndex = rankIndexOf(level);
  const nextRank = rankIndex < RANKS.length - 1 ? localRank(RANKS[rankIndex + 1]!, locale) : null;
  return {
    level,
    number: level + 1,
    rankIndex,
    rank: localRank(RANKS[rankIndex]!, locale),
    tier: tierOf(level),
    title: titleOf(level, locale),
    xp: x,
    levelStartXp: start,
    levelEndXp: end,
    into: x - start,
    span: end - start,
    progress: (x - start) / (end - start),
    toNext: end - x,
    nextTitle: titleOf(level + 1, locale),
    nextRank,
    toNextRank: nextRank ? xpAtLevel((rankIndex + 1) * TIERS_PER_RANK) - x : 0,
  };
}
