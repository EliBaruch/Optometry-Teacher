/**
 * Deterministic simulation of how each colleague handled a given patient.
 * Same rival + same case → same result, every time (so "Dr. Mori did this in 1:12" is stable).
 *
 * Clinical rules (see clinical.ts):
 * - A skipped test only leads to a wrong diagnosis when that test genuinely separates the
 *   diagnosis from the mimic (curated). Otherwise the colleague still gets it right, with an
 *   incomplete work-up, and the lesson says what that test would have shown.
 * - Every wrong diagnosis carries a lesson: what they called it, what it was, and the finding
 *   that separates the two.
 */
import {
  ALL_TESTS, TEST_CATALOG, URGENCIES, createRng, gradeFor, parTimeSec, scoreCase,
  type ClinicalCase, type Diagnosis, type DiagnosisId, type Grade, type Locale, type MiniGameResult, type Rng, type TestId, type Urgency,
} from '@core';
import { CONTRASTS, canSkipAndStillDiagnose, contrastsFor, findingsNoun, separatingLesson, skipLesson, skipPhrase, testNameInline, urgencyLesson } from './clinical';
import { URGENCY_BOOKED, URGENCY_NEEDED, type ResultSlipKind, type Rival } from './roster';
import { URGENCY_BOOKED_HE, URGENCY_NEEDED_HE, rivalText, text } from './strings';

export interface RivalSlip {
  kind: ResultSlipKind;
  /** What happened, in one line. */
  text: string;
  /** The teaching point. */
  lesson: string;
}

export interface RivalCaseResult {
  rivalId: Rival['id'];
  total: number;
  max: number;
  grade: Grade;
  timeSec: number;
  diagnosisCorrect: boolean;
  urgencyCorrect: boolean;
  chosenDiagnosisId: DiagnosisId;
  /** Tests in the order the colleague ran them. */
  tests: TestId[];
  slip?: RivalSlip;
}

export interface SimContext {
  diagnosisName(id: DiagnosisId): string;
  /** Optional registry lookup (key findings, aka, typical urgency) for richer lessons. */
  diagnosis?(id: DiagnosisId): Diagnosis | undefined;
  /** Edition language for the generated sentences (default English). */
  locale?: Locale;
}

const testName = (t: TestId) => TEST_CATALOG[t]?.name ?? t;

/** "acute-angle-closure" → "Acute Angle Closure" (fallback when the diagnosis registry is empty). */
export function humanizeId(id: string): string {
  return id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ');
}


function fakeResult(testId: TestId, accuracy: number): MiniGameResult {
  return { testId, accuracy: Math.max(0.05, Math.min(1, accuracy)), timeMs: 0, findings: [] };
}

/** Sensible clinical order: acuity → refraction → binocular/neuro → anterior → pressure → posterior. */
const ORDER: TestId[] = [
  'visual-acuity', 'pinhole', 'retinoscopy', 'phoropter', 'keratometry', 'pupils', 'cover-test', 'motility',
  'convergence', 'color-vision', 'amsler', 'visual-fields', 'slit-lamp', 'fluorescein', 'tonometry', 'ophthalmoscopy',
];
export function inClinicalOrder(tests: Iterable<TestId>): TestId[] {
  const set = new Set(tests);
  return ORDER.filter((t) => set.has(t));
}

/** Chance that the colleague makes their signature slip on this case. */
export function slipChance(rival: Rival, difficulty: number): number {
  return Math.min(0.85, rival.slipRate * (0.55 + 0.15 * difficulty));
}

/**
 * A plausible wrong diagnosis given the tests actually done: a curated mimic, never one that a
 * test already run rules out (nobody calls uveitis with a pressure of 56 mmHg in hand). For
 * diagnoses without curated contrasts, one of the closest listed differentials.
 */
function pickMimic(kase: ClinicalCase, rng: Rng, done: Set<TestId>): DiagnosisId | null {
  if (CONTRASTS[kase.diagnosis]) {
    const pool = contrastsFor(kase).filter((c) => !(c.skip && done.has(c.test))).map((c) => c.mimic);
    return pool.length ? rng.pick(pool) : null;
  }
  const pool = kase.differentials.filter((d) => d !== kase.diagnosis).slice(0, 2);
  return pool.length ? rng.pick(pool) : null;
}

/** What urgency a clinician books for the diagnosis they believe in. */
function urgencyFor(dx: DiagnosisId, kase: ClinicalCase, ctx: SimContext): Urgency {
  return ctx.diagnosis?.(dx)?.typicalUrgency ?? kase.urgency;
}

interface Draft {
  tests: Set<TestId>;
  diagnosisId: DiagnosisId;
  urgency: Urgency;
  slip?: RivalSlip;
  timeFactor: number;
}

/** The colleague's signature slip, if it applies to this case. */
function signatureSlip(rival: Rival, kase: ClinicalCase, ctx: SimContext, rng: Rng, d: Draft): void {
  const dxName = ctx.diagnosisName;
  const loc = ctx.locale ?? 'en';
  const tx = text(loc);
  const f = rival.avatar.sex === 'F';
  const needed = (u: Urgency) => (loc === 'he' ? URGENCY_NEEDED_HE : URGENCY_NEEDED)[u];
  const booked = (u: Urgency) => (loc === 'he' ? URGENCY_BOOKED_HE : URGENCY_BOOKED)[u];
  switch (rival.slip) {
    case 'skips-basics':
    case 'rushes-posterior': {
      const inPlan = rival.skipPrefs.filter((t) => d.tests.has(t));
      // A skip that genuinely misleads (curated: the skipped test is what separates the two).
      const misleading = contrastsFor(kase, loc).find((c) => c.skip && inPlan.includes(c.test));
      if (misleading && rng.chance(0.8)) {
        d.tests.delete(misleading.test);
        d.diagnosisId = misleading.mimic;
        d.urgency = urgencyFor(misleading.mimic, kase, ctx);
        d.slip = {
          kind: rival.slip,
          text: tx.simSkipMisled(skipPhrase(misleading.test, loc), dxName(misleading.mimic), dxName(kase.diagnosis), f),
          lesson: misleading.finding,
        };
        d.timeFactor = 0.85;
        return;
      }
      // Otherwise skip a test that does not decide the diagnosis: right answer, incomplete work-up.
      const safe = inPlan.filter((t) => kase.essentialTests.includes(t) && canSkipAndStillDiagnose(kase, t));
      if (safe.length) {
        const t = rng.pick(safe);
        d.tests.delete(t);
        d.slip = { kind: rival.slip, text: tx.simSkipSafe(skipPhrase(t, loc), f), lesson: skipLesson(kase, t, loc) };
        d.timeFactor = 0.85;
      }
      return;
    }
    case 'over-tests': {
      const relevant = new Set<TestId>([...kase.essentialTests, ...kase.helpfulTests]);
      const extras = rng.shuffle(ALL_TESTS.filter((t) => !relevant.has(t))).slice(0, rng.int(1, 3));
      if (extras.length) {
        extras.forEach((t) => d.tests.add(t));
        d.slip = {
          kind: 'over-tests',
          text: tx.simOverText(tx.listJoin(extras.map((t) => testNameInline(t, loc))), f),
          lesson: tx.simOverLesson,
        };
        d.timeFactor = 1.3;
      }
      return;
    }
    case 'under-triages': {
      const idx = URGENCIES.indexOf(kase.urgency);
      if (idx >= 1) {
        d.urgency = URGENCIES[idx - 1]!;
        d.slip = {
          kind: 'under-triages',
          text: tx.simUnderText(booked(d.urgency), needed(kase.urgency)),
          lesson: urgencyLesson(kase, dxName(kase.diagnosis), needed(kase.urgency), loc),
        };
      }
      return;
    }
    case 'anchors': {
      const mimic = pickMimic(kase, rng, d.tests);
      if (!mimic) return;
      const sep = separatingLesson(kase, mimic, ctx);
      d.diagnosisId = mimic;
      d.urgency = urgencyFor(mimic, kase, ctx);
      const talked = sep.test && d.tests.has(sep.test) ? tx.simTalked(findingsNoun(sep.test, loc), f) : '';
      d.slip = {
        kind: 'anchors',
        text: tx.simAnchorText(dxName(mimic), talked, dxName(kase.diagnosis), f),
        lesson: sep.finding,
      };
      return;
    }
  }
}

/** Simulate one colleague on one real case. */
export function simulateRival(rival: Rival, kase: ClinicalCase, ctx: SimContext): RivalCaseResult {
  const rng = createRng(`rivals:case:${rival.id}:${kase.id}`);
  const dxName = ctx.diagnosisName;
  const loc = ctx.locale ?? 'en';
  const tx = text(loc);
  const f = rival.avatar.sex === 'F';
  const difficulty = kase.difficulty;

  // Baseline plan: every essential test, some helpful ones (by thoroughness).
  const d: Draft = { tests: new Set<TestId>(kase.essentialTests), diagnosisId: kase.diagnosis, urgency: kase.urgency, timeFactor: 1 };
  for (const t of kase.helpfulTests) if (rng.chance(0.3 + rival.thoroughness * 0.6)) d.tests.add(t);

  // Rolls are always drawn in the same order so results stay stable per case.
  const rollSlip = rng.chance(slipChance(rival, difficulty));
  const rollMiss = rng.chance(Math.max(0, (1 - rival.accuracy) * (difficulty / 3) * 0.6));
  const rollForget = rng.chance(rival.forgets);
  const rollTriage = rng.chance(rival.triageError * (0.7 + 0.1 * difficulty));
  const rollStray = rng.chance(rival.strayTest);

  if (rollSlip) signatureSlip(rival, kase, ctx, rng, d);

  // An honest misread on a hard case (never without a lesson).
  if (!d.slip && rollMiss) {
    const mimic = pickMimic(kase, rng, d.tests);
    if (mimic) {
      const sep = separatingLesson(kase, mimic, ctx);
      d.diagnosisId = mimic;
      d.urgency = urgencyFor(mimic, kase, ctx);
      d.slip = { kind: 'misread', text: tx.simMisread(dxName(mimic), dxName(kase.diagnosis), f), lesson: sep.finding };
    }
  }

  // Forgot an essential test that doesn't decide the diagnosis.
  if (!d.slip && rollForget) {
    const safe = kase.essentialTests.filter((t) => d.tests.has(t) && canSkipAndStillDiagnose(kase, t));
    if (safe.length) {
      const t = rng.pick(safe);
      d.tests.delete(t);
      d.slip = { kind: 'forgot-test', text: tx.simForgot(skipPhrase(t, loc), f), lesson: skipLesson(kase, t, loc) };
    }
  }

  // Booked the right diagnosis one notch off (can stack with a work-up slip, never with a wrong call).
  if (rollTriage && d.diagnosisId === kase.diagnosis && d.urgency === kase.urgency) {
    const idx = URGENCIES.indexOf(kase.urgency);
    const canDown = idx > 0;
    const canUp = idx < URGENCIES.length - 1;
    const want = rival.triageBias === 'either' ? (rng.chance(0.5) ? 'under' : 'over') : rival.triageBias;
    const down = want === 'under' ? canDown : !canUp;
    const u = URGENCIES[down ? idx - 1 : idx + 1]!;
    d.urgency = u;
    const B = loc === 'he' ? URGENCY_BOOKED_HE : URGENCY_BOOKED;
    const N = loc === 'he' ? URGENCY_NEEDED_HE : URGENCY_NEEDED;
    const bookedText = down ? tx.simBookedDown(B[u], N[kase.urgency]) : tx.simBookedUp(B[u], B[kase.urgency]);
    const lesson = down ? urgencyLesson(kase, dxName(kase.diagnosis), N[kase.urgency], loc) : tx.simOverTriage;
    d.slip = d.slip
      ? { ...d.slip, text: tx.simAlso(d.slip.text, bookedText) }
      : { kind: 'mistriaged', text: tx.simRightBut(bookedText), lesson };
  }

  // Everyone occasionally orders one test the case didn't need.
  if (rollStray && d.slip?.kind !== 'over-tests') {
    const relevant = new Set<TestId>([...kase.essentialTests, ...kase.helpfulTests]);
    const spare = ALL_TESTS.filter((t) => !relevant.has(t) && !d.tests.has(t));
    if (spare.length) d.tests.add(rng.pick(spare));
  }

  const form = rng.float(-rival.spread, rival.spread);
  const testsDone: Partial<Record<TestId, MiniGameResult>> = {};
  for (const t of d.tests) testsDone[t] = fakeResult(t, rival.technique + form + rng.float(-0.05, 0.05));
  const keyQs = kase.history.filter((h) => h.relevance === 'key');
  const coverage = Math.max(0, Math.min(1, rival.history + rng.float(-0.15, 0.15)));
  const asked = keyQs.filter(() => rng.chance(coverage)).map((h) => h.id);
  const par = parTimeSec(kase);
  const timeSec = Math.max(15, Math.round((par * rng.float(0.7, 1.15) * d.timeFactor) / rival.speed));

  const score = scoreCase({ kase, diagnosisId: d.diagnosisId, urgency: d.urgency, testsDone, askedQuestions: asked, elapsedSec: timeSec, hintsUsed: 0 });
  return {
    rivalId: rival.id,
    total: score.total,
    max: score.max,
    grade: score.grade,
    timeSec,
    diagnosisCorrect: score.diagnosisCorrect,
    urgencyCorrect: score.urgencyCorrect,
    chosenDiagnosisId: d.diagnosisId,
    tests: inClinicalOrder(d.tests),
    slip: d.slip,
  };
}

/** Fallback when the case isn't in the registry (removed content pack): a plausible score from the profile. */
export function simulateRivalGeneric(rival: Rival, caseId: string, max = 1300): RivalCaseResult {
  const rng = createRng(`rivals:case:${rival.id}:${caseId}`);
  const correct = rng.chance(rival.accuracy);
  const ratio = correct ? Math.min(0.98, 0.5 + rival.technique * 0.4 + rng.float(-0.1, 0.08)) : rng.float(0.25, 0.45);
  const total = Math.round(max * ratio);
  return {
    rivalId: rival.id,
    total,
    max,
    grade: gradeFor(ratio, correct),
    timeSec: Math.round(rng.float(70, 160) / rival.speed),
    diagnosisCorrect: correct,
    urgencyCorrect: correct,
    chosenDiagnosisId: '',
    tests: rng.shuffle(rival.signature).slice(0, 2),
  };
}

/** One quip for the results panel, chosen deterministically. */
export function pickQuip(rival: Rival, r: RivalCaseResult, playerTotal: number, caseId: string, locale: Locale = 'en'): string {
  const rng = createRng(`rivals:quip:${rival.id}:${caseId}`);
  const quips = rivalText(rival, locale).quips;
  if (r.slip?.kind === rival.slip || !r.diagnosisCorrect) return rng.pick(quips.slipped);
  return rng.pick(r.total > playerTotal ? quips.ahead : quips.behind);
}

/** "1:12" */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export { testName };
