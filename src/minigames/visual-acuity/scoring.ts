/**
 * Technique scoring. A record is judged on: the right eye occluded, how many
 * chart steps it sits from the true threshold line, whether the patient was
 * actually asked to read that line, and whether the next line down was tried
 * (the threshold is only proven by a failed line beneath it). Pure.
 */
import type { Eye } from '@core';
import { expectedLevel, type ChartKind, type ChartLine } from './charts';
import type { OpenEyes } from './optics';

export type Slot = Eye | 'OU';

export interface AcuityRecord {
  slot: Slot;
  chart: ChartKind;
  /** chart line index (0 = top), or the off-chart ladder (−1 CF … −4 NLP) */
  level: number;
  /** Eyes open when the reading was recorded */
  open: OpenEyes;
  /** The patient read this level (passed) with the same eyes open */
  read: boolean;
  /** The next smaller line was tried and failed, or this is the bottom line */
  belowChecked: boolean;
}

export interface RecordScore {
  slot: Slot;
  expected: number;
  steps: number;
  occlusionOk: boolean;
  score: number;
  notes: string[];
}

const STEP_SCORE = [1, 0.55, 0.2];

export function stepScore(steps: number): number {
  return STEP_SCORE[steps] ?? 0;
}

export function occlusionCorrect(slot: Slot, open: OpenEyes): boolean {
  if (slot === 'OU') return open.OD && open.OS;
  return slot === 'OD' ? open.OD && !open.OS : open.OS && !open.OD;
}

export function scoreRecord(rec: AcuityRecord, trueLogmar: number, lines: readonly ChartLine[]): RecordScore {
  const expected = expectedLevel(lines, trueLogmar);
  const steps = Math.abs(rec.level - expected);
  const notes: string[] = [];
  let score = stepScore(steps);
  if (steps === 0) notes.push('Exact threshold line.');
  else notes.push(`${steps} step${steps > 1 ? 's' : ''} ${rec.level > expected ? 'better' : 'worse'} than the true threshold.`);

  const occlusionOk = occlusionCorrect(rec.slot, rec.open);
  if (!occlusionOk && rec.slot !== 'OU') {
    const tested = rec.slot as Eye;
    const fellow: Eye = tested === 'OD' ? 'OS' : 'OD';
    if (!rec.open[tested]) {
      score *= 0.25;
      notes.push(`${tested} was covered — that reading belonged to the other eye.`);
    } else if (rec.open[fellow]) {
      score *= 0.45;
      notes.push(`${fellow} was not occluded, so the reading was binocular.`);
    }
  }
  if (!rec.read) {
    score -= 0.15;
    notes.push('Recorded a line the patient was never seen to pass.');
  }
  if (!rec.belowChecked && steps === 0 && rec.level >= 0) {
    score -= 0.05;
    notes.push('Tip: confirm the threshold by trying the next line down.');
  }
  return { slot: rec.slot, expected, steps, occlusionOk, score: Math.max(0, Math.min(1, score)), notes };
}

/** 1 up to 90 s, easing down to 0.85 by 5 minutes. */
export function timeFactor(ms: number): number {
  const s = ms / 1000;
  if (s <= 90) return 1;
  return Math.max(0.85, 1 - ((s - 90) / 210) * 0.15);
}

export function combineAcuity(scores: RecordScore[], required: Slot[], timeMs: number, records: AcuityRecord[]): { accuracy: number; perfect: boolean } {
  const per = required.map((slot) => scores.find((s) => s.slot === slot)?.score ?? 0);
  const mean = per.reduce((a, b) => a + b, 0) / Math.max(1, per.length);
  const accuracy = Math.max(0, Math.min(1, mean * timeFactor(timeMs)));
  const perfect = required.every((slot) => {
    const s = scores.find((x) => x.slot === slot);
    const r = records.find((x) => x.slot === slot);
    return !!s && !!r && s.steps === 0 && s.occlusionOk && r.read && (r.belowChecked || r.level < 0);
  });
  return { accuracy, perfect: perfect && timeMs < 240_000 };
}

export interface PinholeEyeResult {
  eye: Eye;
  verdictCorrect: boolean;
  /** null when no PH line was recorded */
  steps: number | null;
}

/** Verdict carries 60 %, the PH line 40 %. */
export function scorePinhole(results: PinholeEyeResult[], timeMs: number): { accuracy: number; perfect: boolean } {
  const per = results.map((r) => (r.verdictCorrect ? 0.6 : 0) + (r.steps === null ? 0 : 0.4 * stepScore(r.steps)));
  const mean = per.reduce((a, b) => a + b, 0) / Math.max(1, per.length);
  return {
    accuracy: Math.max(0, Math.min(1, mean * timeFactor(timeMs))),
    perfect: results.length > 0 && results.every((r) => r.verdictCorrect && r.steps === 0),
  };
}
