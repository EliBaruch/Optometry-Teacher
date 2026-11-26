/**
 * In-run combo: consecutive correct diagnoses build a multiplier ×1 → ×1.5 → ×2 → ×3.
 * Pure functions, no side effects. The bonus is paid in XP and scales with the case's
 * score ratio, so a sloppy-but-correct case earns little; time spent earns nothing.
 */
import type { ScoreBreakdown } from '@core';

export type TierKey = 'steady' | 'kindled' | 'blazing' | 'white-hot';

export interface ComboTier {
  key: TierKey;
  /** Correct diagnoses in a row needed to reach this tier. */
  min: number;
  mult: number;
  /** Player-facing name */
  name: string;
  color: string;
}

export const TIERS: readonly ComboTier[] = [
  { key: 'steady', min: 0, mult: 1, name: 'Steady hands', color: '#94a3b8' },
  { key: 'kindled', min: 2, mult: 1.5, name: 'Kindled', color: '#fb923c' },
  { key: 'blazing', min: 3, mult: 2, name: 'Blazing', color: '#f97316' },
  { key: 'white-hot', min: 5, mult: 3, name: 'White-hot', color: '#ef4444' },
];

/** Base XP a perfect case earns per +1 of multiplier. ×3 on a 95% case ≈ +76 XP. */
export const COMBO_XP = 40;

export function tierFor(count: number): ComboTier {
  let t = TIERS[0];
  for (const tier of TIERS) if (count >= tier.min) t = tier;
  return t;
}

export function tierIndex(count: number): number {
  return TIERS.indexOf(tierFor(count));
}

/** The next tier and how many more correct diagnoses reach it (null at the top). */
export function nextTier(count: number): { tier: ComboTier; need: number } | null {
  const next = TIERS.find((t) => t.min > count);
  return next ? { tier: next, need: next.min - count } : null;
}

export function formatMult(mult: number): string {
  return `×${Number.isInteger(mult) ? mult : mult.toFixed(1)}`;
}

export interface ComboState {
  /** Mode of the run this combo belongs to (null = no run yet). */
  modeId: string | null;
  /** Consecutive correct diagnoses right now. */
  count: number;
  /** Best count reached in this run. */
  best: number;
  /** The once-per-run "combo saved" grace has been spent. */
  graceUsed: boolean;
  /** Patients seen in this run (completed + failed). */
  cases: number;
}

export const EMPTY_COMBO: ComboState = { modeId: null, count: 0, best: 0, graceUsed: false, cases: 0 };

export function freshCombo(modeId: string | null): ComboState {
  return { ...EMPTY_COMBO, modeId };
}

export type ComboOutcome = 'built' | 'saved' | 'reset';

export interface ComboStep {
  combo: ComboState;
  outcome: ComboOutcome;
  prevCount: number;
  tier: ComboTier;
  prevTier: ComboTier;
  /** A new multiplier tier was reached on this case. */
  tierUp: boolean;
  /** XP paid for the multiplier (0 below ×1.5 or when the call was wrong). */
  bonusXp: number;
}

type CaseScore = Pick<ScoreBreakdown, 'diagnosisCorrect' | 'urgencyCorrect' | 'essentialMissed' | 'total' | 'max'>;

/**
 * Grace rule ("combo saved"), once per run: a wrong diagnosis after a real combo (≥ 2)
 * keeps the combo — without growing it — when the clinician still ran every essential
 * test AND triaged the urgency correctly. Safe, thorough practice is what we protect.
 */
export function graceEligible(combo: ComboState, s: Pick<ScoreBreakdown, 'urgencyCorrect' | 'essentialMissed'>): boolean {
  return graceReady(combo) && s.urgencyCorrect && s.essentialMissed.length === 0;
}

/** The safety net is armed: a real combo is running and the grace is unspent. */
export function graceReady(combo: ComboState): boolean {
  return !combo.graceUsed && combo.count >= 2;
}

export function comboBonusXp(count: number, s: Pick<ScoreBreakdown, 'total' | 'max'>): number {
  const mult = tierFor(count).mult;
  if (mult <= 1) return 0;
  const ratio = s.max > 0 ? Math.max(0, Math.min(1, s.total / s.max)) : 0;
  return Math.round(COMBO_XP * ratio * (mult - 1));
}

export function applyCase(prev: ComboState, modeId: string, s: CaseScore): ComboStep {
  const base = prev.modeId === modeId ? prev : freshCombo(modeId);
  const prevTier = tierFor(base.count);
  const cases = base.cases + 1;
  if (s.diagnosisCorrect) {
    const count = base.count + 1;
    const tier = tierFor(count);
    return {
      combo: { ...base, count, best: Math.max(base.best, count), cases },
      outcome: 'built',
      prevCount: base.count,
      tier,
      prevTier,
      tierUp: tier !== prevTier && tier.mult > 1,
      bonusXp: comboBonusXp(count, s),
    };
  }
  if (graceEligible(base, s)) {
    return {
      combo: { ...base, graceUsed: true, cases },
      outcome: 'saved',
      prevCount: base.count,
      tier: prevTier,
      prevTier,
      tierUp: false,
      bonusXp: 0,
    };
  }
  return {
    combo: { ...base, count: 0, cases },
    outcome: 'reset',
    prevCount: base.count,
    tier: TIERS[0],
    prevTier,
    tierUp: false,
    bonusXp: 0,
  };
}

/** A patient left without a diagnosis (timeout / abandoned): the combo ends, nothing else is lost. */
export function applyFailure(prev: ComboState, modeId: string): ComboStep {
  const base = prev.modeId === modeId ? prev : freshCombo(modeId);
  const prevTier = tierFor(base.count);
  return {
    combo: { ...base, count: 0, cases: base.cases + 1 },
    outcome: 'reset',
    prevCount: base.count,
    tier: TIERS[0],
    prevTier,
    tierUp: false,
    bonusXp: 0,
  };
}
