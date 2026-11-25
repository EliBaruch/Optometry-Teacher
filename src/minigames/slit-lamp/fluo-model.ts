/** Pure model of the fluorescein test: technique, pattern choice, TBUT timing and scoring. */
import { EYES, type Eye, type PatientFindings, type StainPattern } from '@core';
import { STAIN_FLAG, tbutOf } from './report';

export const PATTERNS: StainPattern[] = [
  'none', 'inferior-punctate', 'diffuse-punctate', 'interpalpebral', 'linear-abrasion', 'dendritic', 'round-ulcer', 'vertical-linear-scratches', 'focal',
];

/** Patterns that are easy to confuse — a near miss earns partial credit. */
const FAMILY: StainPattern[][] = [
  ['inferior-punctate', 'diffuse-punctate', 'interpalpebral'],
  ['linear-abrasion', 'vertical-linear-scratches', 'focal'],
  ['dendritic', 'round-ulcer'],
];

export function patternCredit(truth: StainPattern, pick: StainPattern | null): number {
  if (!pick) return 0;
  if (truth === pick) return 1;
  return FAMILY.some((f) => f.includes(truth) && f.includes(pick)) ? 0.35 : 0;
}

export interface FluoEye {
  /** seconds the dye has been on the eye while it was blinked in */
  dyed: boolean;
  blinked: boolean;
  /** seconds spent viewing under cobalt + barrier with dye on the surface */
  viewed: number;
  pattern: StainPattern | null;
  tbut: number[];
}
export const freshEye = (): FluoEye => ({ dyed: false, blinked: false, viewed: 0, pattern: null, tbut: [] });

export const VIEW_SECONDS = 2.2;
/** Reading error allowed for full credit, seconds. */
export const tbutTolerance = (truth: number) => Math.max(1.5, truth * 0.18);

export function tbutCredit(truth: number, readings: number[]): number {
  if (!readings.length) return 0;
  const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
  const e = Math.abs(mean - truth);
  const tol = tbutTolerance(truth);
  return e <= tol ? 1 : e <= tol * 2 ? 0.6 : e <= tol * 3.2 ? 0.3 : 0;
}

export function techniqueCredit(e: FluoEye): number {
  return (e.dyed ? 0.25 : 0) + (e.blinked ? 0.2 : 0) + Math.min(1, e.viewed / VIEW_SECONDS) * 0.35 + (e.tbut.length ? 0.2 : 0);
}

export interface FluoScore {
  accuracy: number;
  perfect: boolean;
  perEye: Record<Eye, { technique: number; pattern: number; tbut: number }>;
}

export function scoreFluo(f: PatientFindings, eyes: Record<Eye, FluoEye>): FluoScore {
  const perEye = {} as FluoScore['perEye'];
  let sum = 0;
  let perfect = true;
  for (const e of EYES) {
    const a = f.anterior[e];
    const technique = techniqueCredit(eyes[e]);
    const pattern = patternCredit(a.fluorescein, eyes[e].pattern);
    const tbut = tbutCredit(tbutOf(a), eyes[e].tbut);
    perEye[e] = { technique, pattern, tbut };
    sum += technique * 0.2 + pattern * 0.5 + tbut * 0.3;
    if (technique < 0.999 || pattern < 1 || tbut < 1) perfect = false;
  }
  return { accuracy: Math.max(0, Math.min(1, sum / EYES.length)), perfect, perEye };
}

export const isUrgentStain = (p: StainPattern) => STAIN_FLAG[p] === 'critical';

/** Time a fresh blink needs to spread dye over the cornea (s) and to finish (s). */
export const BLINK_SECONDS = 0.34;
export const SPREAD_SECONDS = 1.6;
