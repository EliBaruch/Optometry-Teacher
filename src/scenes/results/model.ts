import {
  TEST_CATALOG, URGENCIES,
  type CaseSession, type ClinicalCase, type Confidence, type Diagnosis, type DiagnosisId, type HistoryCategory,
  type RevealedFinding, type ScoreBreakdown, type TestId, type Urgency,
} from '@core';

/**
 * Pure view-model for the results scene: everything the player should learn
 * from this case, derived from the case, the session and the codex.
 */

export type VerdictKind = 'correct' | 'wrong' | 'timeout' | 'abandoned';
export type ConfidenceNote = 'confidently-wrong' | 'lucky' | 'calibrated' | null;

export interface TestRef {
  id: TestId;
  name: string;
  blurb: string;
}

export interface MissedQuestion {
  id: string;
  category: HistoryCategory;
  q: string;
  a: string;
}

export interface UrgencyReview {
  correct: Urgency;
  chosen?: Urgency;
  /** chosen − correct on the routine→emergency scale (negative = under-triaged) */
  delta: number;
  meaning: string;
  advice: string;
}

export interface KeyFinding {
  label: string;
  value: string;
  eye?: string;
  flag: RevealedFinding['flag'];
  /** 'chart' = the player found it; 'textbook' = from the codex because the chart was too thin */
  source: 'chart' | 'textbook';
}

export interface ReviewModel {
  verdict: VerdictKind;
  kase: ClinicalCase;
  correctId: DiagnosisId;
  correctName: string;
  correctDx?: Diagnosis;
  chosenId?: DiagnosisId;
  chosenName?: string;
  score?: ScoreBreakdown;
  confidence?: Confidence;
  confidenceNote: ConfidenceNote;
  urgency: UrgencyReview;
  missedTests: TestRef[];
  unnecessaryTests: TestRef[];
  unaskedKey: MissedQuestion[];
  clinchers: KeyFinding[];
  /** Nothing essential skipped, no key question unasked, no wasted tests. */
  cleanWorkup: boolean;
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  routine: 'Routine',
  soon: 'Soon',
  urgent: 'Urgent',
  emergency: 'Emergency',
};

export const URGENCY_MEANING: Record<Urgency, string> = {
  routine: 'Book a normal appointment, weeks to months away.',
  soon: 'See within a few days.',
  urgent: 'Same day, within 24 hours.',
  emergency: 'Immediately: sight- or life-threatening. Emergency department or on-call specialist now.',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  guessing: 'Guessing',
  'fairly-sure': 'Fairly sure',
  certain: 'Certain',
};

/** "acute-angle-closure" → "Acute angle closure" (fallback when the codex lacks an entry). */
export function prettyId(id: string): string {
  const s = id.replace(/[-_]+/g, ' ').trim();
  return s ? s[0]!.toUpperCase() + s.slice(1) : id;
}

export function testRef(id: TestId): TestRef {
  const t = TEST_CATALOG[id];
  return { id, name: t?.name ?? prettyId(id), blurb: t?.blurb ?? '' };
}

export function reviewUrgency(correct: Urgency, chosen?: Urgency): UrgencyReview {
  const delta = chosen ? URGENCIES.indexOf(chosen) - URGENCIES.indexOf(correct) : 0;
  let advice: string;
  if (!chosen) advice = `This patient needed ${URGENCY_LABEL[correct].toLowerCase()} care.`;
  else if (delta === 0) advice = 'Spot on: the right patient, seen at the right time.';
  else if (delta < 0)
    advice =
      delta <= -2
        ? 'Under-triaged by a long way. This is the dangerous direction: when in doubt, escalate.'
        : 'One step too relaxed. Under-triage is the dangerous direction: when in doubt, escalate.';
  else
    advice =
      delta >= 2
        ? 'Over-triaged by a long way. Safe for this patient, but it costs an emergency slot someone else may need.'
        : 'One step too cautious. Safer than the reverse, but over-referral clogs urgent services.';
  return { correct, chosen, delta, meaning: URGENCY_MEANING[correct], advice };
}

export function confidenceNote(verdict: VerdictKind, confidence?: Confidence): ConfidenceNote {
  if (!confidence) return null;
  if (verdict === 'wrong' && confidence === 'certain') return 'confidently-wrong';
  if (verdict === 'correct' && confidence === 'guessing') return 'lucky';
  if (verdict === 'correct' && confidence === 'certain') return 'calibrated';
  return null;
}

const STOP = new Set([
  'the', 'and', 'with', 'for', 'from', 'that', 'this', 'into', 'over', 'than', 'then', 'when', 'often', 'may',
  'are', 'not', 'but', 'its', 'one', 'two', 'both', 'eye', 'eyes', 'right', 'left', 'very', 'more', 'less',
]);

export function words(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 3 && !STOP.has(w)) out.add(w);
  return out;
}

const FLAG_WEIGHT: Record<RevealedFinding['flag'], number> = { critical: 6, abnormal: 4, normal: 0 };

/**
 * The two chart findings that most discriminate this diagnosis: severity first,
 * then overlap with the codex key findings / teaching text, then whether an
 * essential test produced it. Falls back to the codex when the chart is thin.
 */
export function pickClinchers(
  kase: ClinicalCase,
  session: Pick<CaseSession, 'chart' | 'testsDone'> | null,
  dx: Diagnosis | undefined,
  n = 2,
): KeyFinding[] {
  const vocab = words([...(dx?.keyFindings ?? []), ...kase.teachingPoints, dx?.name ?? ''].join(' '));
  const fromEssential = new Set<string>();
  for (const t of kase.essentialTests) {
    for (const f of session?.testsDone[t]?.findings ?? []) fromEssential.add(`${f.label}|${f.eye ?? ''}`);
  }
  const scored = (session?.chart ?? [])
    .map((f, i) => {
      let s = FLAG_WEIGHT[f.flag];
      for (const w of words(`${f.label} ${f.value}`)) if (vocab.has(w)) s += 1.5;
      if (fromEssential.has(`${f.label}|${f.eye ?? ''}`)) s += 1;
      return { f, s, i };
    })
    .filter((x) => x.f.flag !== 'normal' || x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i);

  const out: KeyFinding[] = [];
  const seen = new Set<string>();
  for (const { f } of scored) {
    if (out.length >= n) break;
    if (seen.has(f.label)) continue; // one line per finding type (OD/OS duplicates)
    seen.add(f.label);
    out.push({ label: f.label, value: f.value, eye: f.eye, flag: f.flag, source: 'chart' });
  }
  for (const k of dx?.keyFindings ?? []) {
    if (out.length >= n) break;
    out.push({ label: k, value: '', flag: 'abnormal', source: 'textbook' });
  }
  return out;
}

export interface ReviewInput {
  kase: ClinicalCase;
  session: CaseSession | null;
  diagnosis: (id: DiagnosisId) => Diagnosis | undefined;
  /** Route param says the clock ran out (session may already be gone). */
  timeout?: boolean;
}

export function buildReview({ kase, session, diagnosis, timeout }: ReviewInput): ReviewModel {
  const sub = session?.caseId === kase.id ? session.submitted : undefined;
  const sess = session?.caseId === kase.id ? session : null;
  const failed = sess?.failed ?? (timeout ? 'timeout' : undefined);

  const verdict: VerdictKind = sub
    ? sub.score.diagnosisCorrect ? 'correct' : 'wrong'
    : failed === 'abandoned' ? 'abandoned' : 'timeout';

  const correctDx = diagnosis(kase.diagnosis);
  const chosenId = sub?.diagnosisId;
  const chosenDx = chosenId ? diagnosis(chosenId) : undefined;

  const done = new Set(Object.keys(sess?.testsDone ?? {}) as TestId[]);
  const missedIds = sub?.score.essentialMissed ?? kase.essentialTests.filter((t) => !done.has(t));
  const relevant = new Set<TestId>([...kase.essentialTests, ...kase.helpfulTests]);
  const unnecessaryIds = sub?.score.unnecessaryTests ?? [...done].filter((t) => !relevant.has(t));
  const asked = new Set(sess?.askedQuestions ?? []);
  const unaskedKey = kase.history
    .filter((h) => h.relevance === 'key' && !asked.has(h.id))
    .map((h) => ({ id: h.id, category: h.category, q: h.q, a: h.a }));

  const missedTests = missedIds.map(testRef);
  const unnecessaryTests = unnecessaryIds.map(testRef);

  return {
    verdict,
    kase,
    correctId: kase.diagnosis,
    correctName: correctDx?.name ?? prettyId(kase.diagnosis),
    correctDx,
    chosenId,
    chosenName: chosenId ? chosenDx?.name ?? prettyId(chosenId) : undefined,
    score: sub?.score,
    confidence: sub?.confidence,
    confidenceNote: confidenceNote(verdict, sub?.confidence),
    urgency: reviewUrgency(kase.urgency, sub?.urgency),
    missedTests,
    unnecessaryTests,
    unaskedKey,
    clinchers: pickClinchers(kase, sess, correctDx),
    cleanWorkup: !missedTests.length && !unnecessaryTests.length && !unaskedKey.length,
  };
}

/** mm:ss for elapsed / par readouts. */
export function clockText(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
