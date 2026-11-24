/**
 * Chart definitions: a projector Snellen chart (1 → 8 optotypes per line,
 * 20/400 .. 20/10) and an ETDRS / logMAR chart (5 optotypes per line, 0.1 log
 * steps, 1.0 .. −0.3). Optotypes: Sloan letters, tumbling E, LEA symbols.
 */
import { createRng, hashString } from '@core';
import { LOW_VISION, lowVisionLevel, metricFor, formatLogmar2, type LowVision } from './notation';

export type ChartKind = 'snellen' | 'etdrs';
export type Optotype = 'letters' | 'tumbling-e' | 'lea';

export interface ChartLine {
  logmar: number;
  feet: number;
  /** "20/40" */
  label: string;
  /** "6/12" */
  metric: string;
  count: number;
}

const snellenLine = (feet: number, count: number): ChartLine => ({
  feet, count, label: `20/${feet}`, metric: metricFor(feet), logmar: Math.round(Math.log10(feet / 20) * 1000) / 1000,
});

/** Largest → smallest (index 0 is the big top letter). */
export const SNELLEN: readonly ChartLine[] = [
  snellenLine(400, 1), snellenLine(200, 2), snellenLine(100, 3), snellenLine(80, 4), snellenLine(70, 4),
  snellenLine(60, 5), snellenLine(50, 5), snellenLine(40, 6), snellenLine(30, 6), snellenLine(25, 7),
  snellenLine(20, 8), snellenLine(15, 8), snellenLine(10, 8),
];

const ETDRS_FEET = [200, 160, 125, 100, 80, 63, 50, 40, 32, 25, 20, 16, 12.5, 10];
export const ETDRS: readonly ChartLine[] = ETDRS_FEET.map((feet, i) => ({
  feet, count: 5, logmar: Math.round((1.0 - i * 0.1) * 10) / 10, label: `20/${feet}`, metric: metricFor(feet),
}));

export function chartLines(kind: ChartKind): readonly ChartLine[] {
  return kind === 'snellen' ? SNELLEN : ETDRS;
}

export const SLOAN = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;
export const E_DIRS = ['right', 'up', 'left', 'down'] as const;
export const LEA = ['apple', 'house', 'circle', 'square'] as const;

export function symbolSet(o: Optotype): readonly string[] {
  return o === 'letters' ? SLOAN : o === 'tumbling-e' ? E_DIRS : LEA;
}

/** Deterministic optotypes for a line — no symbol repeats its neighbour. */
export function lineSymbols(kind: ChartKind, optotype: Optotype, index: number, seed: number): string[] {
  const set = symbolSet(optotype);
  const line = chartLines(kind)[index];
  if (!line) return [];
  const rng = createRng((seed ^ hashString(`${kind}:${optotype}:${index}`)) >>> 0);
  const out: string[] = [];
  let pool = rng.shuffle(set);
  for (let i = 0; i < line.count; i++) {
    if (pool.length === 0) pool = rng.shuffle(set);
    let pick = pool.shift()!;
    if (pick === out[out.length - 1] && pool.length) {
      pool.push(pick);
      pick = pool.shift()!;
    }
    out.push(pick);
  }
  return out;
}

/** Age-appropriate optotype: LEA symbols for pre-schoolers, tumbling E for early readers. */
export function defaultOptotype(age: number): Optotype {
  if (age < 5) return 'lea';
  if (age < 7) return 'tumbling-e';
  return 'letters';
}

/** Can this patient name the optotype at all? */
export function canUseOptotype(age: number, o: Optotype): boolean {
  if (o === 'letters') return age >= 6;
  if (o === 'tumbling-e') return age >= 4;
  return age >= 2;
}

/** Tolerance so a true 0.48 reads the 20/60 (0.477) line. */
export const LINE_TOLERANCE = 0.025;

/**
 * Index of the smallest line the patient reads (more than half correct), or
 * -1 when even the top line is beyond them.
 */
export function expectedLineIndex(lines: readonly ChartLine[], trueLogmar: number): number {
  let idx = -1;
  lines.forEach((l, i) => {
    if (l.logmar >= trueLogmar - LINE_TOLERANCE) idx = i;
  });
  return idx;
}

/**
 * A single ordinal scale for recording: chart lines are 0..n-1 (bigger index =
 * better acuity); the off-chart ladder continues below 0 (CF −1 … NLP −4).
 */
export function ladderLevelIndex(code: LowVision): number {
  return -1 - LOW_VISION.findIndex((l) => l.code === code);
}

export function expectedLevel(lines: readonly ChartLine[], trueLogmar: number): number {
  const i = expectedLineIndex(lines, trueLogmar);
  if (i >= 0) return i;
  return ladderLevelIndex(lowVisionLevel(Math.max(trueLogmar, 1.36)) ?? 'CF');
}

export function levelLabel(lines: readonly ChartLine[], level: number): { feet: string; metric: string; logmar: string; value: number } {
  if (level >= 0) {
    const l = lines[level]!;
    return { feet: l.label, metric: l.metric, logmar: formatLogmar2(l.logmar), value: l.logmar };
  }
  const lv = LOW_VISION[-1 - level]!;
  return { feet: lv.code, metric: lv.code, logmar: lv.logmar.toFixed(1), value: lv.logmar };
}
