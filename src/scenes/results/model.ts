import {
  TEST_CATALOG, URGENCIES, pickStrings, testText, type Locale,
  type CaseSession, type ClinicalCase, type Confidence, type Diagnosis, type DiagnosisId, type HistoryCategory,
  type Eye, type PatientFindings, type RevealedFinding, type ScoreBreakdown, type TestId, type Urgency,
} from '@core';
import { S } from './strings';

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

export const URGENCY_LABEL: Record<Urgency, string> = S.en.urgency;
export const URGENCY_MEANING: Record<Urgency, string> = S.en.urgencyMeaning;
export const CONFIDENCE_LABEL: Record<Confidence, string> = S.en.confidence;

/** "acute-angle-closure" → "Acute angle closure" (fallback when the codex lacks an entry). */
export function prettyId(id: string): string {
  const s = id.replace(/[-_]+/g, ' ').trim();
  return s ? s[0]!.toUpperCase() + s.slice(1) : id;
}

export function testRef(id: TestId, locale: Locale = 'en'): TestRef {
  const t = TEST_CATALOG[id];
  if (locale !== 'en' && t) return { id, ...testText(id, locale) };
  return { id, name: t?.name ?? prettyId(id), blurb: t?.blurb ?? '' };
}

export function reviewUrgency(correct: Urgency, chosen?: Urgency, locale: Locale = 'en'): UrgencyReview {
  const t = pickStrings(S, locale);
  const delta = chosen ? URGENCIES.indexOf(chosen) - URGENCIES.indexOf(correct) : 0;
  let advice: string;
  if (!chosen) advice = t.adviceNoChoice(t.urgency[correct]);
  else if (delta === 0) advice = t.adviceExact;
  else if (delta < 0) advice = delta <= -2 ? t.adviceUnderFar : t.adviceUnder;
  else advice = delta >= 2 ? t.adviceOverFar : t.adviceOver;
  return { correct, chosen, delta, meaning: t.urgencyMeaning[correct], advice };
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
  locale: Locale = 'en',
): KeyFinding[] {
  const vocab = words([...(dx?.keyFindings ?? []), ...kase.teachingPoints, dx?.name ?? ''].join(' '));
  const key = (f: Pick<RevealedFinding, 'label' | 'eye'>) => `${f.label}|${f.eye ?? ''}`;
  const fromEssential = new Set<string>();
  for (const t of kase.essentialTests) {
    for (const f of session?.testsDone[t]?.findings ?? []) fromEssential.add(key(f));
  }
  // A finding that only an off-target test produced can't have clinched this diagnosis
  // (e.g. a colour-vision result on a keratitis case), however abnormal it looks.
  const relevant = new Set<TestId>([...kase.essentialTests, ...kase.helpfulTests]);
  const fromRelevant = new Set<string>();
  const fromOffTarget = new Set<string>();
  for (const [t, r] of Object.entries(session?.testsDone ?? {}) as [TestId, { findings: RevealedFinding[] } | undefined][]) {
    for (const f of r?.findings ?? []) (relevant.has(t) ? fromRelevant : fromOffTarget).add(key(f));
  }
  // Chart labels come from the exam engine; where they have no Hebrew yet, the localized codex
  // key findings carry the reflection instead of a stray English line.
  const readable = (f: Pick<RevealedFinding, 'label' | 'value'>) => locale === 'en' || /[\u0590-\u05FF]/.test(`${f.label}${f.value}`);
  const scored = (session?.chart ?? [])
    .filter((f) => readable(f))
    .filter((f) => !(fromOffTarget.has(key(f)) && !fromRelevant.has(key(f))))
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
  const covered = words(out.map((o) => o.label).join(' '));
  for (const k of dx?.keyFindings ?? []) {
    if (out.length >= n) break;
    if ([...words(k)].some((w) => covered.has(w))) continue; // the chart already shows this one
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
  locale?: Locale;
}

export function buildReview({ kase, session, diagnosis, timeout, locale = 'en' }: ReviewInput): ReviewModel {
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

  const missedTests = missedIds.map((t) => testRef(t, locale));
  const unnecessaryTests = unnecessaryIds.map((t) => testRef(t, locale));

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
    urgency: reviewUrgency(kase.urgency, sub?.urgency, locale),
    missedTests,
    unnecessaryTests,
    unaskedKey,
    clinchers: pickClinchers(kase, sess, correctDx, 2, locale),
    cleanWorkup: !missedTests.length && !unnecessaryTests.length && !unaskedKey.length,
  };
}

/** mm:ss for elapsed / par readouts. */
export function clockText(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The eye to portrait on the verdict card: the red one, else the one with worse best-corrected acuity. */
export function affectedEye(f: PatientFindings): Eye {
  const red = f.external?.redEye;
  if (red?.length === 1) return red[0]!;
  const od = f.va.OD.bestCorrected;
  const os = f.va.OS.bestCorrected;
  return os > od + 0.05 ? 'OS' : 'OD';
}
