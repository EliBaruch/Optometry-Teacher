/**
 * Deterministic simulation of how each colleague handled a given patient.
 * Same rival + same case → same result, every time (so "Dr. Mori did this in 1:12" is stable).
 * When a colleague slips, the slip is a classic, teachable clinical error built from the case data.
 */
import {
  ALL_TESTS, TEST_CATALOG, URGENCIES, createRng, gradeFor, parTimeSec, scoreCase,
  type ClinicalCase, type DiagnosisId, type Grade, type MiniGameResult, type Rng, type TestId, type Urgency,
} from '@core';
import { URGENCY_PHRASE, type Rival, type SlipKind } from './roster';

export interface RivalSlip {
  kind: SlipKind;
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
}

const testName = (t: TestId) => TEST_CATALOG[t]?.name ?? t;

/** "acute-angle-closure" → "acute angle closure" (fallback when the diagnosis registry is empty). */
export function humanizeId(id: string): string {
  return id.replace(/-/g, ' ');
}

function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s;
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function fakeResult(testId: TestId, accuracy: number): MiniGameResult {
  return { testId, accuracy: Math.max(0, Math.min(1, accuracy)), timeMs: 0, findings: [] };
}

/** Sensible clinical order: acuity → refraction → binocular/neuro → anterior → pressure → posterior. */
const ORDER: TestId[] = [
  'visual-acuity', 'pinhole', 'retinoscopy', 'phoropter', 'keratometry', 'pupils', 'cover-test', 'motility',
  'convergence', 'color-vision', 'amsler', 'visual-fields', 'slit-lamp', 'fluorescein', 'tonometry', 'ophthalmoscopy',
];
function inClinicalOrder(tests: Iterable<TestId>): TestId[] {
  const set = new Set(tests);
  return ORDER.filter((t) => set.has(t));
}

/** Chance that the colleague makes their slip on this case. */
export function slipChance(rival: Rival, difficulty: number): number {
  return Math.min(0.85, rival.slipRate * (0.55 + 0.15 * difficulty));
}

/** Pick a plausible wrong diagnosis: case authors list the closest mimics first. */
function mimic(kase: ClinicalCase, rng: Rng): DiagnosisId {
  const pool = kase.differentials.slice(0, Math.min(2, kase.differentials.length));
  return pool.length ? rng.pick(pool) : kase.diagnosis;
}

/** Simulate one colleague on one real case. */
export function simulateRival(rival: Rival, kase: ClinicalCase, ctx: SimContext): RivalCaseResult {
  const rng = createRng(`rivals:case:${rival.id}:${kase.id}`);
  const dxName = (id: DiagnosisId) => lowerFirst(ctx.diagnosisName(id));
  const difficulty = kase.difficulty;

  // Baseline plan: every essential test, most helpful ones (by thoroughness).
  const tests = new Set<TestId>(kase.essentialTests);
  for (const t of kase.helpfulTests) if (rng.chance(0.35 + rival.thoroughness * 0.6)) tests.add(t);

  let diagnosisId: DiagnosisId = kase.diagnosis;
  let urgency: Urgency = kase.urgency;
  let slip: RivalSlip | undefined;
  let timeFactor = 1;

  const slips = rng.chance(slipChance(rival, difficulty));
  if (slips) {
    switch (rival.slip) {
      case 'skips-basics':
      case 'rushes-posterior': {
        const skipped = rival.skipPrefs.find((t) => kase.essentialTests.includes(t));
        if (skipped) {
          tests.delete(skipped);
          diagnosisId = mimic(kase, rng);
          slip = {
            kind: rival.slip,
            text: `Skipped ${testName(skipped).toLowerCase()}, called it ${dxName(diagnosisId)} and missed the ${dxName(kase.diagnosis)}.`,
            lesson: `${testName(skipped)} was essential for this patient.`,
          };
          timeFactor = 0.85;
        }
        break;
      }
      case 'over-tests': {
        const relevant = new Set<TestId>([...kase.essentialTests, ...kase.helpfulTests]);
        const extras = rng.shuffle(ALL_TESTS.filter((t) => !relevant.has(t))).slice(0, rng.int(1, 2));
        if (extras.length) {
          extras.forEach((t) => tests.add(t));
          slip = {
            kind: 'over-tests',
            text: `Added ${listNames(extras.map((t) => testName(t).toLowerCase()))} “to be safe” — right answer, but slower and less focused.`,
            lesson: 'Each test should answer a question you are actually asking.',
          };
          timeFactor = 1.3;
        }
        break;
      }
      case 'under-triages': {
        const idx = URGENCIES.indexOf(kase.urgency);
        if (idx >= 2) {
          urgency = URGENCIES[idx - 1]!;
          slip = {
            kind: 'under-triages',
            text: `Right diagnosis, but booked it as ${URGENCY_PHRASE[urgency]} — this patient needed ${URGENCY_PHRASE[kase.urgency]} care.`,
            lesson: 'Urgency is part of the diagnosis.',
          };
        }
        break;
      }
      case 'anchors': {
        diagnosisId = mimic(kase, rng);
        if (diagnosisId !== kase.diagnosis) {
          const decisive = kase.essentialTests[0];
          slip = {
            kind: 'anchors',
            text: `Settled on ${dxName(diagnosisId)} from the history${decisive ? ` and talked past the ${testName(decisive).toLowerCase()} findings` : ''} — it was ${dxName(kase.diagnosis)}.`,
            lesson: 'Let the findings overrule the first impression.',
          };
        }
        break;
      }
    }
  }

  // Without a slip, a small residual chance of an honest miss on hard cases.
  if (!slip && diagnosisId === kase.diagnosis) {
    const miss = Math.max(0, (1 - rival.accuracy) * (difficulty / 3) * 0.6);
    if (rng.chance(miss)) diagnosisId = mimic(kase, rng);
  }

  const testsDone: Partial<Record<TestId, MiniGameResult>> = {};
  for (const t of tests) testsDone[t] = fakeResult(t, rival.technique + rng.float(-0.08, 0.06));
  const asked = kase.history.filter((h) => h.relevance === 'key' && rng.chance(0.4 + rival.thoroughness * 0.6)).map((h) => h.id);
  const par = parTimeSec(kase);
  const timeSec = Math.max(15, Math.round((par * rng.float(0.62, 1.05) * timeFactor) / rival.speed));

  const score = scoreCase({ kase, diagnosisId, urgency, testsDone, askedQuestions: asked, elapsedSec: timeSec, hintsUsed: 0 });
  return {
    rivalId: rival.id,
    total: score.total,
    max: score.max,
    grade: score.grade,
    timeSec,
    diagnosisCorrect: score.diagnosisCorrect,
    urgencyCorrect: score.urgencyCorrect,
    chosenDiagnosisId: diagnosisId,
    tests: inClinicalOrder(tests),
    slip,
  };
}

/** Fallback when the case isn't in the registry (removed content pack): a plausible score from the profile. */
export function simulateRivalGeneric(rival: Rival, caseId: string, max = 1300): RivalCaseResult {
  const rng = createRng(`rivals:case:${rival.id}:${caseId}`);
  const correct = rng.chance(rival.accuracy);
  const ratio = correct ? Math.min(0.99, 0.55 + rival.technique * 0.3 + rng.float(-0.06, 0.12)) : rng.float(0.25, 0.45);
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
export function pickQuip(rival: Rival, r: RivalCaseResult, playerTotal: number, caseId: string): string {
  const rng = createRng(`rivals:quip:${rival.id}:${caseId}`);
  if (r.slip || !r.diagnosisCorrect) return rng.pick(rival.quips.slipped);
  return rng.pick(r.total > playerTotal ? rival.quips.ahead : rival.quips.behind);
}

/** "1:12" */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
