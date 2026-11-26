/**
 * Acuity notation: logMAR <-> Snellen (20/x feet, 6/x metres), the low-vision
 * ladder (CF / HM / LP / NLP) and the normal / abnormal / critical flags.
 * Pure — no DOM.
 */
import { pickStrings, type Locale, type RevealedFinding } from '@core';
import { S } from './strings';

/** Standard logMAR-step Snellen denominators (feet), 20/10 .. 20/400. */
export const FEET_LINES = [10, 12.5, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400] as const;

/** Metric equivalents of every feet denominator used anywhere in the game. */
const METRIC: Record<string, string> = {
  '10': '6/3', '12.5': '6/3.8', '15': '6/4.5', '16': '6/4.8', '20': '6/6', '25': '6/7.5', '30': '6/9',
  '32': '6/9.5', '40': '6/12', '50': '6/15', '60': '6/18', '63': '6/19', '70': '6/21', '80': '6/24',
  '100': '6/30', '125': '6/38', '160': '6/48', '200': '6/60', '250': '6/75', '320': '6/95', '400': '6/120',
};

export type LowVision = 'CF' | 'HM' | 'LP' | 'NLP';

/**
 * Off-chart ladder, best to worst. `logmar` is the conventional numeric
 * substitute used for analysis; `upTo` is the worst true logMAR that still
 * achieves the level.
 */
export const LOW_VISION: readonly { code: LowVision; name: string; logmar: number; upTo: number }[] = [
  { code: 'CF', name: 'Counts fingers', logmar: 1.9, upTo: 2.15 },
  { code: 'HM', name: 'Hand motion', logmar: 2.3, upTo: 2.55 },
  { code: 'LP', name: 'Light perception', logmar: 2.7, upTo: 2.95 },
  { code: 'NLP', name: 'No light perception', logmar: 3.0, upTo: Infinity },
];

/** Worse than this the 20/400 optotype can't be read from the lane. */
export const OFF_CHART_LOGMAR = 1.35;

/** Low-vision level for a true logMAR, or null when a chart line is still readable. */
export function lowVisionLevel(logmar: number): LowVision | null {
  if (logmar < OFF_CHART_LOGMAR) return null;
  return (LOW_VISION.find((l) => logmar <= l.upTo) ?? LOW_VISION[LOW_VISION.length - 1]!).code;
}

/** Can the patient achieve this ladder level? (CF is easier than HM is easier than LP…) */
export function achievesLevel(logmar: number, level: LowVision): boolean {
  const l = LOW_VISION.find((x) => x.code === level)!;
  return logmar <= l.upTo;
}

/** Nearest standard feet denominator (log-space). */
export function snellenFeet(logmar: number): number {
  const raw = Math.log10(20 * Math.pow(10, logmar));
  let best: number = FEET_LINES[0];
  for (const d of FEET_LINES) if (Math.abs(Math.log10(d) - raw) < Math.abs(Math.log10(best) - raw)) best = d;
  return best;
}

export function metricFor(feet: number): string {
  return METRIC[String(feet)] ?? `6/${Math.round(((feet * 6) / 20) * 10) / 10}`;
}

export function formatFeet(logmar: number): string {
  return lowVisionLevel(logmar) ?? `20/${snellenFeet(logmar)}`;
}

export function formatMetric(logmar: number): string {
  return lowVisionLevel(logmar) ?? metricFor(snellenFeet(logmar));
}

/** "0.30", "−0.10", "0.00" — two decimals, true minus sign. */
export function formatLogmar2(logmar: number): string {
  const v = Math.round(logmar * 100) / 100;
  return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
}

/** Chart value: "20/40 (6/12) · logMAR 0.30", or "CF (counts fingers)". */
export function chartValue(logmar: number, locale: Locale = 'en'): string {
  const lv = lowVisionLevel(logmar);
  if (lv) return `${lv} (${pickStrings(S, locale).lowVisionShort[lv]})`;
  const feet = snellenFeet(logmar);
  return `20/${feet} (${metricFor(feet)}) · logMAR ${formatLogmar2(logmar)}`;
}

/** Upper limit of normal monocular distance VA by age (logMAR). */
export function normalLimit(age: number): number {
  if (age < 4) return 0.4; // 3-year-olds: 20/50 passes
  return 0.3; // 20/40
}

const EPS = 1e-6;

/** abnormal when worse than the age norm (20/40 from age 4), critical at 20/200 or worse. */
export function acuityFlag(logmar: number, age: number): RevealedFinding['flag'] {
  if (logmar >= 1.0 - EPS) return 'critical';
  if (logmar > normalLimit(age) + EPS) return 'abnormal';
  return 'normal';
}

/** A two-line interocular difference matters in children (amblyopia risk). */
export function interocularConcern(od: number, os: number, age: number): boolean {
  return age < 10 && Math.abs(od - os) >= 0.2 - EPS;
}
