/**
 * Pure economy maths — fees, crate rolls, day keys. Unit-tested, no side effects.
 * Fees scale with LEARNING quality (correctness, efficiency, mastery), never time spent.
 */
import { createRng, type Grade, type Locale, type ScoreBreakdown } from '@core';
import { FEE_HE } from './strings';
import {
  CATALOG, COIN_RANGE, CONTENT_ODDS, CRATES, DAILY_FULL_RATE, HINT_POINTS, HINT_TOKENS, PERFECT_BONUS, PITY_LIMIT,
  RARITY_ORDER, UNNECESSARY_TEST_POINTS, type CatalogItem, type CrateKind, type Rarity,
} from './catalog';

/* ── Case fee ─────────────────────────────────────────────────────────── */

export const GRADE_MULT: Record<Grade, number> = { S: 1.5, A: 1.2, B: 1, C: 0.85, D: 0.5, F: 0.3 };

export interface FeeLine {
  id: 'consult' | 'grade' | 'momentum' | 'perfect' | 'late';
  label: string;
  amount: number;
}

export interface FeeInput {
  score: Pick<ScoreBreakdown, 'total' | 'max' | 'grade' | 'perfect' | 'diagnosisCorrect' | 'parts'> & Partial<Pick<ScoreBreakdown, 'unnecessaryTests'>>;
  /** Case difficulty 1..5 (unknown → 3). */
  difficulty?: number;
  /** Correct diagnoses in a row BEFORE this case. */
  priorStreak?: number;
  /** Hints covered by consult notes this case (their score cost is waived for the fee). */
  coveredHints?: number;
  /** Case fees already earned today. */
  earnedToday?: number;
  /** Language of the fee line labels (default English). */
  locale?: Locale;
}

export interface FeeResult {
  total: number;
  lines: FeeLine[];
  /** 0..1 quality ratio used (after hint cover). */
  quality: number;
  momentumMult: number;
}

export const momentumMultiplier = (priorStreak: number) => 1 + Math.min(Math.max(0, priorStreak), 10) * 0.05;

export function caseFee(input: FeeInput): FeeResult {
  const { score } = input;
  const he = input.locale === 'he';
  const difficulty = clampInt(input.difficulty ?? 3, 1, 5);
  const max = Math.max(1, score.max);
  const eff = score.parts.find((p) => p.id === 'efficiency');
  // A consult note only gives back what its hint actually cost: never the points
  // lost to unnecessary tests (a wasteful work-up stays a wasteful work-up).
  const wasted = (score.unnecessaryTests?.length ?? 0) * UNNECESSARY_TEST_POINTS;
  const restored = eff ? Math.min((input.coveredHints ?? 0) * HINT_POINTS, Math.max(0, eff.max - wasted - eff.points)) : 0;
  const ratio = Math.min(1, Math.max(0, (score.total + restored) / max));
  const base = 30 + 10 * difficulty;
  // Accuracy is rewarded steeply: an 95% case pays ~2.5x a 55% case.
  const quality = Math.pow(ratio, 1.6);
  const gm = GRADE_MULT[score.grade] ?? 1;
  const consult = Math.max(1, Math.round(base * quality * Math.min(gm, 1)));
  const lines: FeeLine[] = [{ id: 'consult', label: he ? FEE_HE.consult(difficulty) : `Base fee · difficulty ${difficulty}`, amount: consult }];
  if (gm > 1) lines.push({ id: 'grade', label: he ? FEE_HE.grade(score.grade) : `Grade ${score.grade} bonus`, amount: Math.round(base * quality * (gm - 1)) });
  const momentumMult = score.diagnosisCorrect ? momentumMultiplier(input.priorStreak ?? 0) : 1;
  if (momentumMult > 1) {
    const sub = lines.reduce((s, l) => s + l.amount, 0);
    lines.push({ id: 'momentum', label: he ? FEE_HE.momentum(momentumMult.toFixed(2)) : `Momentum ×${momentumMult.toFixed(2)}`, amount: Math.round(sub * (momentumMult - 1)) });
  }
  if (score.perfect) lines.push({ id: 'perfect', label: he ? FEE_HE.perfect : 'Flawless work-up', amount: PERFECT_BONUS });
  let total = lines.reduce((s, l) => s + l.amount, 0);
  const late = lateShiftAdjust(total, input.earnedToday ?? 0);
  if (late < 0) {
    lines.push({ id: 'late', label: he ? FEE_HE.late : 'Late-shift rate (½ fee)', amount: late });
    total += late;
  }
  return { total, lines, quality: ratio, momentumMult };
}

/** Negative adjustment for the part of a fee above today's full-rate allowance. */
export function lateShiftAdjust(fee: number, earnedToday: number, cap = DAILY_FULL_RATE): number {
  const over = Math.max(0, earnedToday + fee - Math.max(cap, earnedToday));
  const cut = Math.floor(Math.min(over, fee) / 2);
  return cut > 0 ? -cut : 0;
}

/** Arcade practice pays a little for technique, capped per day. */
export function practiceFee(accuracy: number, earnedToday: number, cap: number): number {
  const raw = Math.round(Math.min(1, Math.max(0, accuracy)) * 12);
  return Math.max(0, Math.min(raw, cap - earnedToday));
}

/* ── Supply crates ────────────────────────────────────────────────────── */

export type CrateContent =
  | { type: 'coins'; amount: number; converted?: string }
  | { type: 'hints'; amount: number }
  | { type: 'cosmetic'; itemId: string };

export interface CrateDrop {
  rarity: Rarity;
  content: CrateContent;
  /** Pity counter after this crate. */
  pity: number;
  /** True when the pity guarantee kicked in. */
  guaranteed: boolean;
}

/** Roll a crate. Deterministic for a given (seed, kind, pity, owned). */
export function rollCrate(seed: number, kind: CrateKind, pity: number, owned: readonly string[]): CrateDrop {
  const rng = createRng(seed >>> 0);
  const odds = CRATES[kind].odds;
  const guaranteed = pity >= PITY_LIMIT - 1;
  const pool = guaranteed ? (['epic', 'legendary'] as Rarity[]) : RARITY_ORDER;
  const rarity = weighted(rng.next(), pool.map((r) => [r, odds[r]] as const));
  const nextPity = rarity === 'epic' || rarity === 'legendary' ? 0 : pity + 1;
  const contentRoll = weighted(rng.next(), Object.entries(CONTENT_ODDS) as [keyof typeof CONTENT_ODDS, number][]);
  const coins = (r: Rarity, mult = 1) => Math.round(rng.int(COIN_RANGE[r][0], COIN_RANGE[r][1]) * mult);
  let content: CrateContent;
  if (contentRoll === 'cosmetic') {
    const candidates = CATALOG.filter((i) => i.rarity === rarity && i.price > 0 && !owned.includes(i.id));
    if (candidates.length) content = { type: 'cosmetic', itemId: rng.pick(candidates).id };
    else content = { type: 'coins', amount: coins(rarity, 1.25), converted: 'You own every piece of this rarity — paid out in lumens instead.' };
  } else if (contentRoll === 'hints') {
    content = { type: 'hints', amount: HINT_TOKENS[rarity] };
  } else {
    content = { type: 'coins', amount: coins(rarity) };
  }
  return { rarity, content, pity: nextPity, guaranteed };
}

function weighted<T>(u: number, entries: readonly (readonly [T, number])[]): T {
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  let x = u * sum;
  for (const [v, w] of entries) {
    if (x < w) return v;
    x -= w;
  }
  return entries[entries.length - 1]![0];
}

/** Published odds for a crate: rarity % (normalised, rounded to 1 dp). */
export function publishedOdds(kind: CrateKind): { rarity: Rarity; pct: number }[] {
  const o = CRATES[kind].odds;
  const sum = RARITY_ORDER.reduce((s, r) => s + o[r], 0);
  return RARITY_ORDER.map((r) => ({ rarity: r, pct: Math.round((o[r] / sum) * 1000) / 10 }));
}

/* ── Misc ─────────────────────────────────────────────────────────────── */

/** Local calendar day, e.g. "2026-11-24". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function canAfford(balance: number, item: CatalogItem): boolean {
  return balance >= item.price;
}

export function formatCoins(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function clampInt(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));
}
