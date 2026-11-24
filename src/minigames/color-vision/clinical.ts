/**
 * Pure clinical logic: plate scoring, interpretation, chart lines and the
 * player's technique score. No DOM.
 */
import type { ColorVision, Eye, PatientFindings, PatientProfile, RevealedFinding } from '@core';
import { BOOKLET, RED_GREEN_KINDS, canonicalPlates, deficit, respond, type EyeVision, type Plate, type PlateKind } from './plates';

export type CvClass = 'normal' | 'protan' | 'deutan' | 'tritan' | 'acquired';
export type CvEye = Eye | 'OU';

export interface Interpretation {
  type: CvClass;
  /** affected eye(s); null when normal */
  eye: CvEye | null;
}

const EYES: Eye[] = ['OD', 'OS'];

export function eyeVision(f: PatientFindings, eye: Eye): EyeVision {
  return { cv: f.colorVision[eye], va: f.va[eye].bestCorrected };
}

export function isAbnormal(cv: ColorVision): boolean {
  return cv.type !== 'normal' && cv.severity !== 'none';
}

function classOf(cv: ColorVision): CvClass {
  if (!isAbnormal(cv)) return 'normal';
  if (cv.type === 'acquired-red-green' || cv.type === 'acquired-blue-yellow') return 'acquired';
  return cv.type;
}

/** The correct interpretation for the findings (what the player should conclude). */
export function interpret(f: PatientFindings): Interpretation {
  const od = classOf(f.colorVision.OD);
  const os = classOf(f.colorVision.OS);
  const desat = EYES.filter((e) => f.colorVision[e].redDesaturation);
  if (od === 'normal' && os === 'normal') {
    // red desaturation alone is still an acquired (optic nerve) colour sign
    if (desat.length) return { type: 'acquired', eye: desat.length === 2 ? 'OU' : desat[0]! };
    return { type: 'normal', eye: null };
  }
  if (od === 'acquired' || os === 'acquired') {
    const eyes = EYES.filter((e) => classOf(f.colorVision[e]) === 'acquired');
    return { type: 'acquired', eye: eyes.length === 2 ? 'OU' : eyes[0]! };
  }
  if (od !== 'normal' && os !== 'normal') return { type: od, eye: 'OU' };
  return { type: od !== 'normal' ? od : os, eye: od !== 'normal' ? 'OD' : 'OS' };
}

export interface EyeScore {
  correct: number;
  total: number;
  /** red-green screening plates correct / total */
  rgCorrect: number;
  rgTotal: number;
  tritanCorrect: number;
  tritanTotal: number;
  /** demo plate not read: acuity too poor to test */
  unable: boolean;
}

export function scoreEye(plates: readonly Plate[], vision: EyeVision): EyeScore {
  const s: EyeScore = { correct: 0, total: 0, rgCorrect: 0, rgTotal: 0, tritanCorrect: 0, tritanTotal: 0, unable: false };
  for (const p of plates) {
    const r = respond(p, vision);
    if (p.kind === 'demo') {
      s.unable = !r.correct;
      continue;
    }
    s.total++;
    if (r.correct) s.correct++;
    if (RED_GREEN_KINDS.includes(p.kind)) {
      s.rgTotal++;
      if (r.correct) s.rgCorrect++;
    } else if (p.kind === 'tritan') {
      s.tritanTotal++;
      if (r.correct) s.tritanCorrect++;
    }
  }
  return s;
}

/** Red-cap saturation as % of normal reported by the patient for this eye. */
export function redSaturationPct(cv: ColorVision): number {
  if (!cv.redDesaturation) return 100;
  switch (cv.severity) {
    case 'mild': return 70;
    case 'moderate': return 45;
    case 'severe': return 25;
    default: return 60;
  }
}

const SEVERITY_WORD: Record<ColorVision['severity'], string> = { none: '', mild: 'mild', moderate: 'moderate', severe: 'severe' };

function describe(cv: ColorVision): string {
  const sev = SEVERITY_WORD[cv.severity];
  switch (cv.type) {
    case 'protan': return `Protan defect${sev ? `, ${sev}` : ''} (congenital red-green)`;
    case 'deutan': return `Deutan defect${sev ? `, ${sev}` : ''} (congenital red-green)`;
    case 'tritan': return `Tritan defect${sev ? `, ${sev}` : ''} (blue-yellow)`;
    case 'acquired-red-green': return `Acquired red-green defect${sev ? `, ${sev}` : ''}`;
    case 'acquired-blue-yellow': return `Acquired blue-yellow defect${sev ? `, ${sev}` : ''}`;
    default: return 'Normal trichromat';
  }
}

function flagFor(cv: ColorVision): RevealedFinding['flag'] {
  if (!isAbnormal(cv)) return cv.redDesaturation ? 'critical' : 'normal';
  if (cv.type === 'acquired-red-green' || cv.redDesaturation) return 'critical';
  return 'abnormal';
}

/** Chart lines for the colour-vision test. Pure. */
export function report(f: PatientFindings, _patient?: PatientProfile): RevealedFinding[] {
  const plates = canonicalPlates();
  const out: RevealedFinding[] = [];
  for (const eye of EYES) {
    const v = eyeVision(f, eye);
    const s = scoreEye(plates, v);
    const flag = flagFor(v.cv);
    out.push({
      label: 'Colour plates',
      value: s.unable ? 'Unable — demo plate not seen' : `${s.correct}/${s.total} (R-G ${s.rgCorrect}/${s.rgTotal}, B-Y ${s.tritanCorrect}/${s.tritanTotal})`,
      eye,
      flag: s.unable ? 'critical' : s.correct === s.total ? 'normal' : flag === 'normal' ? 'abnormal' : flag,
    });
  }
  const desat = EYES.filter((e) => f.colorVision[e].redDesaturation);
  for (const eye of desat) {
    const other: Eye = eye === 'OD' ? 'OS' : 'OD';
    const pct = redSaturationPct(f.colorVision[eye]);
    out.push({ label: 'Red desaturation', value: `Red cap ≈ ${pct}% vs ${other}`, eye, flag: 'critical' });
  }
  const interp = interpret(f);
  const cvOd = f.colorVision.OD;
  const cvOs = f.colorVision.OS;
  let value: string;
  if (interp.type === 'normal') value = 'Normal colour vision';
  else if (interp.eye === 'OU') {
    value = describe(isAbnormal(cvOd) ? cvOd : cvOs);
    if (interp.type !== 'acquired') value += ', both eyes';
  } else {
    const e = interp.eye as Eye;
    value = isAbnormal(f.colorVision[e]) ? describe(f.colorVision[e]) : 'Acquired loss (red desaturation)';
  }
  const flag: RevealedFinding['flag'] =
    interp.type === 'normal' ? 'normal'
    : EYES.some((e) => flagFor(f.colorVision[e]) === 'critical') ? 'critical'
    : 'abnormal';
  out.push({ label: 'Colour vision', value, eye: interp.eye ?? 'OU', flag });
  return out;
}

// ───────────────────────────────────────────────────────── technique scoring

export interface SessionLog {
  /** plate indices shown to each eye (after the patient answered) */
  shown: Record<Eye, number[]>;
  /** red-cap comparison done for both eyes */
  redCapDone: boolean;
  /** player's red-saturation match (0..100) if made */
  redCapMatch?: number;
  answer: Interpretation;
  timeMs: number;
}

const COVER_KINDS: readonly PlateKind[][] = [['demo'], ['transform', 'vanish', 'path', 'hidden'], ['classify'], ['tritan']];

/** 0..1 completeness of the plates shown to one eye. */
export function eyeCoverage(shown: readonly number[], unable: boolean): number {
  const kinds = shown.map((i) => BOOKLET[i]?.kind).filter(Boolean) as PlateKind[];
  if (unable) return kinds.includes('demo') ? 1 : 0;
  let hit = 0;
  COVER_KINDS.forEach((group, gi) => {
    const n = kinds.filter((k) => group.includes(k)).length;
    hit += gi === 1 ? Math.min(1, n / 3) : n > 0 ? 1 : 0;
  });
  return hit / COVER_KINDS.length;
}

export function typeCredit(truth: CvClass, given: CvClass): number {
  if (truth === given) return 1;
  if ((truth === 'protan' && given === 'deutan') || (truth === 'deutan' && given === 'protan')) return 0.5;
  return 0;
}

export function eyeCredit(truth: Interpretation, given: Interpretation): number {
  if (truth.type === 'normal') return given.type === 'normal' ? 1 : 0;
  return truth.eye === given.eye ? 1 : 0;
}

export interface Score {
  accuracy: number;
  perfect: boolean;
  parts: { type: number; eye: number; coverage: number; redCap: number; time: number };
}

export function needsRedCap(f: PatientFindings): boolean {
  return EYES.some((e) => f.colorVision[e].redDesaturation || classOf(f.colorVision[e]) === 'acquired');
}

export function scoreSession(f: PatientFindings, log: SessionLog): Score {
  const truth = interpret(f);
  const plates = canonicalPlates();
  const type = typeCredit(truth.type, log.answer.type);
  const eye = eyeCredit(truth, log.answer);
  const coverage = (eyeCoverage(log.shown.OD, scoreEye(plates, eyeVision(f, 'OD')).unable) + eyeCoverage(log.shown.OS, scoreEye(plates, eyeVision(f, 'OS')).unable)) / 2;
  let redCap = 1;
  if (needsRedCap(f)) {
    if (!log.redCapDone) redCap = 0;
    else if (log.redCapMatch !== undefined) {
      const target = Math.min(...EYES.map((e) => redSaturationPct(f.colorVision[e])));
      redCap = Math.max(0.5, 1 - Math.abs(log.redCapMatch - target) / 40);
    } else redCap = 0.6;
  }
  const secs = log.timeMs / 1000;
  const time = Math.max(0, Math.min(1, 1 - (secs - 100) / 200));
  const accuracy = Math.max(0, Math.min(1, 0.42 * type + 0.15 * eye + 0.28 * coverage + 0.1 * redCap + 0.05 * time));
  return { accuracy, perfect: type === 1 && eye === 1 && coverage >= 0.999 && redCap >= 0.9, parts: { type, eye, coverage, redCap, time } };
}
