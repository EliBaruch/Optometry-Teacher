/**
 * Scoring — pure.
 *  technique   : did the probes cover the field (8 sectors: 4 quadrants x central/peripheral),
 *                land inside the defect, and do so economically? (an automated
 *                full-grid sweep covers everything but costs efficiency)
 *  classify    : per-eye pattern (family + side)
 *  localisation: binocular call of where the lesion sits
 */
import type { Eye, FieldDefect } from '@core';
import { blindSpotDepth, defectDepth, type FieldPoint } from './model';
import { FAMILY_SIDES, samePattern, type Family, type Localisation, type Pattern } from './interpret';

export const IDEAL_POINTS = 28;
export const MIN_POINTS = 6;

/** Sector 0..7: quadrant (0 sup-right, 1 sup-left, 2 inf-left, 3 inf-right) + 4 if beyond 12°. */
export function sectorOf(p: FieldPoint): number {
  const q = p.y > 0 ? (p.x > 0 ? 0 : 1) : p.x > 0 ? 3 : 2;
  return q + (Math.hypot(p.x, p.y) > 12 ? 4 : 0);
}

export function coverage(points: readonly FieldPoint[]): number {
  const s = new Set(points.map(sectorOf));
  return s.size / 8;
}

/** Tested points that fell inside the pathological defect. */
export function defectHits(points: readonly FieldPoint[], defect: FieldDefect, eye: Eye): number {
  return points.filter((p) => {
    const d = defectDepth(defect, eye, p.x, p.y);
    if (defect === 'enlarged-blind-spot') return d + blindSpotDepth(eye, p.x, p.y) >= 0.5 && d > 0.15;
    return d >= (defect === 'nasal-step' ? 0.35 : 0.5);
  }).length;
}

export function efficiency(n: number): number {
  return n <= IDEAL_POINTS ? 1 : Math.max(0.45, IDEAL_POINTS / n);
}

export interface TechniqueScore {
  points: number;
  coverage: number;
  hits: number;
  efficiency: number;
  score: number;
}

export function techniqueScore(points: readonly FieldPoint[], defect: FieldDefect, eye: Eye): TechniqueScore {
  const n = points.length;
  const cov = coverage(points);
  const hits = defectHits(points, defect, eye);
  const need = defect === 'full' ? 0 : 2;
  const hitScore = need ? Math.min(1, hits / need) : 1;
  const eff = efficiency(n);
  const enough = Math.min(1, n / MIN_POINTS);
  const score = cov * (0.4 + 0.6 * hitScore) * (0.55 + 0.45 * eff) * enough;
  return { points: n, coverage: cov, hits, efficiency: eff, score };
}

const RELATED: [Family, Family][] = [
  ['arcuate', 'nasal-step'],
  ['central', 'cecocentral'],
  ['cecocentral', 'blind-spot'],
  ['hemianopia', 'quadrantanopia'],
  ['altitudinal', 'curtain'],
  ['altitudinal', 'arcuate'],
  ['constricted', 'island'],
];

/** 1 exact · 0.5 right family wrong side · 0.3 a near neighbour (same side if sided) · 0 otherwise. */
export function classifyScore(pick: Pattern | null, truth: Pattern): number {
  if (!pick) return 0;
  if (samePattern(pick, truth)) return 1;
  if (pick.family === truth.family) return FAMILY_SIDES[truth.family].length ? 0.5 : 1;
  const related = RELATED.some(([a, b]) => (a === pick.family && b === truth.family) || (b === pick.family && a === truth.family));
  if (!related) return 0;
  if (pick.side && truth.side) {
    const share = pick.side.split('-').some((s) => truth.side!.includes(s));
    return share ? 0.3 : 0.1;
  }
  return 0.3;
}

export function localisationScore(pick: Localisation | null, truth: Localisation): number {
  if (!pick) return 0;
  if (pick === truth) return 1;
  // Right idea (retrochiasmal), wrong hemisphere: the classic laterality slip.
  if (pick.startsWith('retro') && truth.startsWith('retro')) return 0.4;
  return 0;
}

export interface ExamScore {
  technique: number;
  classify: number;
  localisation: number;
  accuracy: number;
  perfect: boolean;
}

export function scoreExam(input: {
  technique: Record<Eye, TechniqueScore>;
  classify: Record<Eye, number>;
  localisation: number;
}): ExamScore {
  const technique = (input.technique.OD.score + input.technique.OS.score) / 2;
  const classify = (input.classify.OD + input.classify.OS) / 2;
  const accuracy = Math.max(0, Math.min(1, 0.3 * technique + 0.5 * classify + 0.2 * input.localisation));
  const perfect = classify === 1 && input.localisation === 1 && input.technique.OD.score >= 0.9 && input.technique.OS.score >= 0.9;
  return { technique, classify, localisation: input.localisation, accuracy, perfect };
}
