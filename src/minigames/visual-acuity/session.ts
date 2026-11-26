/**
 * Exam-session bookkeeping (pure): which readings were taken with which eyes
 * open, building an AcuityRecord from them, Snellen "−2 / +1" notation and
 * the off-chart ladder responses (count fingers → hand motion → light).
 */
import { pickStrings, type Locale, type Rng } from '@core';
import { levelLabel, type ChartKind, type ChartLine } from './charts';
import { achievesLevel, LOW_VISION } from './notation';
import type { OpenEyes } from './optics';
import type { Mood } from './reader';
import type { AcuityRecord, Slot } from './scoring';
import { S } from './strings';

/** The lowest dial position: NLP. Chart lines are 0..n-1, the ladder −1 (CF) … −4 (NLP). */
export const LADDER_MIN = -4;

export interface LogEntry {
  passed: boolean;
  nCorrect: number;
  n: number;
}

/** Readings for one viewing condition, by dial level. */
export type LevelLog = Map<number, LogEntry>;

export function openKey(o: OpenEyes): 'OU' | 'OD' | 'OS' | 'none' {
  if (o.OD && o.OS) return 'OU';
  if (o.OD) return 'OD';
  if (o.OS) return 'OS';
  return 'none';
}

/** One log per (eyes open, chart, pinhole) — a reading only counts for the exact condition it was taken in. */
export function logKey(open: OpenEyes, chart: ChartKind, pinhole: boolean): string {
  return `${openKey(open)}|${chart}|${pinhole ? 'ph' : 'sc'}`;
}

/** The eyes that should be open while testing a slot. */
export function openFor(slot: Slot): OpenEyes {
  return slot === 'OU' ? { OD: true, OS: true } : slot === 'OD' ? { OD: true, OS: false } : { OD: false, OS: true };
}

export function buildRecord(slot: Slot, chart: ChartKind, level: number, open: OpenEyes, log: LevelLog | undefined, nLines: number): AcuityRecord {
  const here = log?.get(level);
  const below = log?.get(level + 1);
  let read = !!here?.passed;
  let belowChecked = level >= nLines - 1 || (!!below && !below.passed);
  if (level === LADDER_MIN) {
    // NLP is "proven" by a failed light test, whichever ladder step it was asked at.
    const lp = log?.get(LADDER_MIN + 1);
    read = !!here?.passed || (!!lp && !lp.passed);
    belowChecked = read;
  }
  return { slot, chart, level, open: { ...open }, read, belowChecked };
}

/** Clinical notation for a recorded level: "20/40 −1", "20/40 +2", "CF". */
export function recordNotation(lines: readonly ChartLine[], level: number, log: LevelLog | undefined, metric = false): string {
  const lab = levelLabel(lines, level);
  const base = metric ? lab.metric : lab.feet;
  if (level < 0) return base;
  const here = log?.get(level);
  const next = log?.get(level + 1);
  const misses = here ? here.n - here.nCorrect : 0;
  if (here?.passed && misses > 0) return `${base} −${misses}`;
  if (next && !next.passed && next.nCorrect > 0) return `${base} +${next.nCorrect}`;
  return base;
}

/** Full chart entry: "20/40 −1 (6/12 −1)" on Snellen, "20/40 (6/12) · logMAR 0.30" on ETDRS, "CF" off-chart. */
export function recordFull(lines: readonly ChartLine[], level: number, log: LevelLog | undefined, chart: ChartKind): string {
  const feet = recordNotation(lines, level, log);
  if (level < 0) return feet;
  const metric = recordNotation(lines, level, log, true);
  return chart === 'etdrs' ? `${feet} (${metric}) · logMAR ${levelLabel(lines, level).logmar}` : `${feet} (${metric})`;
}

/** Human name of a dial level, e.g. "20/40 line" or "Counts fingers". */
export function levelName(lines: readonly ChartLine[], level: number, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  if (level >= 0) return t.lineName(lines[level]!.label);
  return t.lowVision[LOW_VISION[-1 - level]!.code];
}

export interface LadderReading {
  passed: boolean;
  mood: Mood;
  text: string;
  /** Fingers the examiner held up (CF only) */
  fingers?: number;
}

/**
 * The patient's answer to the off-chart tests. `trueLogmar` null = both eyes covered.
 * Level −1 CF, −2 HM, −3 LP; at −4 (NLP) the light test is repeated and
 * `passed` means "no light seen" (the NLP record is correct).
 */
export function ladderRead(level: number, trueLogmar: number | null, rng: Rng, locale: Locale = 'en'): LadderReading {
  const t = pickStrings(S, locale);
  if (trueLogmar === null) return { passed: false, mood: 'lost', text: t.ladderDark };
  if (level === -1) {
    const fingers = rng.int(1, 5);
    if (achievesLevel(trueLogmar, 'CF')) {
      return { passed: true, mood: trueLogmar > 1.6 ? 'hesitant' : 'confident', text: t.fingersSaid(t.fingerWords[fingers]!, fingers), fingers };
    }
    const sees = achievesLevel(trueLogmar, 'HM');
    return { passed: false, mood: 'struggling', fingers, text: sees ? t.cfSeesHand : t.cfNothing };
  }
  if (level === -2) {
    if (achievesLevel(trueLogmar, 'HM')) return { passed: true, mood: 'hesitant', text: t.hmYes };
    return { passed: false, mood: 'lost', text: t.hmNo };
  }
  const seesLight = achievesLevel(trueLogmar, 'LP');
  const text = seesLight ? (rng.chance(0.5) ? t.lpYes[0]! : t.lpYes[1]!) : t.lpNo;
  if (level === LADDER_MIN) return { passed: !seesLight, mood: seesLight ? 'hesitant' : 'lost', text };
  return { passed: seesLight, mood: seesLight ? 'hesitant' : 'lost', text };
}
