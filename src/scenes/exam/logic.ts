import {
  createRng, pickStrings, TEST_CATALOG, testText, URGENCIES,
  type ClinicalCase, type Confidence, type Diagnosis, type DiagnosisCategory, type HistoryCategory, type HistoryQuestion, type Locale,
  type MiniGameModule, type MiniGameResult, type ModeModule, type RevealedFinding, type RunSnapshot, type TestCategory, type TestId, type Urgency,
} from '@core';
import type { AvatarExpression } from '@render';
import type { IconName } from '@ui-kit';
import { S } from './strings';

/* ── History ─────────────────────────────────────────────────────────────── */

export const HISTORY_ORDER: readonly HistoryCategory[] = ['onset', 'symptoms', 'ocular-history', 'medical', 'medications', 'family', 'social'];

export const HISTORY_LABEL: Record<HistoryCategory, string> = S.en.historyLabel;

export interface HistoryGroup {
  category: HistoryCategory;
  label: string;
  questions: HistoryQuestion[];
}

/**
 * Question chips grouped by category. Within a category the order is a stable
 * shuffle (per case) so authoring order can never leak which questions matter.
 */
export function groupHistory(kase: ClinicalCase, locale: Locale = 'en'): HistoryGroup[] {
  const labels = pickStrings(S, locale).historyLabel;
  const rng = createRng(`history:${kase.id}`);
  return HISTORY_ORDER.map((category) => ({
    category,
    label: labels[category],
    questions: rng.fork(category).shuffle(kase.history.filter((h) => h.category === category)),
  })).filter((g) => g.questions.length > 0);
}

/* ── Instruments ─────────────────────────────────────────────────────────── */

const CATEGORY_ORDER: readonly TestCategory[] = ['acuity', 'refraction', 'binocular', 'neuro', 'anterior', 'posterior', 'pressure'];
const CATALOG_INDEX = new Map(Object.keys(TEST_CATALOG).map((id, i) => [id, i] as const));

/** One tool per registered mini-game that maps to a catalogued test, ordered by test category. */
export function orderInstruments(minigames: readonly MiniGameModule[]): MiniGameModule[] {
  return minigames
    .filter((m) => m && m.id in TEST_CATALOG)
    .sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(TEST_CATALOG[a.id].category);
      const cb = CATEGORY_ORDER.indexOf(TEST_CATALOG[b.id].category);
      return ca - cb || (CATALOG_INDEX.get(a.id) ?? 0) - (CATALOG_INDEX.get(b.id) ?? 0);
    });
}

export function testName(id: TestId, mg?: MiniGameModule, locale: Locale = 'en'): string {
  if (locale !== 'en' && TEST_CATALOG[id]) return testText(id, locale).name;
  return TEST_CATALOG[id]?.name ?? mg?.title ?? id;
}

/** Result produced when the technician runs a test (half skill credit, instant). */
export function techResult(mg: MiniGameModule, kase: ClinicalCase): MiniGameResult {
  return { testId: mg.id, accuracy: 0.5, timeMs: 0, findings: mg.report(kase.findings, kase.patient), autoRun: true };
}

/** Is the technician allowed in this mode? (No mode / unknown mode = yes.) */
export function techAllowed(mode: ModeModule | undefined): boolean {
  return mode?.rules.autoRun !== false;
}

/* ── Patient ─────────────────────────────────────────────────────────────── */

export function expressionFor(kase: ClinicalCase, relieved: boolean): AvatarExpression {
  if (relieved) return 'relieved';
  const ext = kase.findings.external;
  if (kase.tags.includes('painful') || ext?.photophobia) return 'pain';
  if (ext?.squinting) return 'squint';
  return 'worried';
}

/* ── Chart ───────────────────────────────────────────────────────────────── */

export const chartKey = (f: RevealedFinding): string => `${f.label}|${f.eye ?? ''}`;

export interface ChartGroup {
  testId: TestId;
  result: MiniGameResult;
  rows: RevealedFinding[];
}

/** Chart rows grouped by the test that last wrote them (in the order the tests were first done). */
export function groupChart(chart: readonly RevealedFinding[], testsDone: Partial<Record<TestId, MiniGameResult>>): ChartGroup[] {
  const ids = Object.keys(testsDone) as TestId[];
  const groups = new Map<TestId, ChartGroup>();
  for (const id of ids) groups.set(id, { testId: id, result: testsDone[id]!, rows: [] });
  const orphans: RevealedFinding[] = [];
  for (const row of chart) {
    const k = chartKey(row);
    let owner: TestId | undefined;
    for (let i = ids.length - 1; i >= 0; i--) {
      if (testsDone[ids[i]!]!.findings.some((f) => chartKey(f) === k)) {
        owner = ids[i];
        break;
      }
    }
    if (owner) groups.get(owner)!.rows.push(row);
    else orphans.push(row);
  }
  const out = [...groups.values()].filter((g) => g.rows.length > 0);
  if (orphans.length) out.push({ testId: 'visual-acuity', result: { testId: 'visual-acuity', accuracy: 1, timeMs: 0, findings: orphans }, rows: orphans });
  return out;
}

export function chartSummary(chart: readonly RevealedFinding[]): { abnormal: number; critical: number } {
  let abnormal = 0;
  let critical = 0;
  for (const f of chart) {
    if (f.flag === 'abnormal') abnormal++;
    else if (f.flag === 'critical') critical++;
  }
  return { abnormal, critical };
}

/* ── Hints ───────────────────────────────────────────────────────────────── */

export interface Hint {
  id: string;
  text: string;
}

export interface HintInput {
  kase: ClinicalCase;
  testsDone: Partial<Record<TestId, MiniGameResult>>;
  asked: readonly string[];
  /** Tests that can actually be run (a mini-game is registered). */
  available: ReadonlySet<TestId>;
  /** Hint ids already given in this case */
  given: readonly string[];
  locale?: Locale;
}

/** The next helpful nudge, most valuable first; null when nothing is left to say. */
export function nextHint({ kase, testsDone, asked, available, given, locale = 'en' }: HintInput): Hint | null {
  const t = pickStrings(S, locale);
  const candidates: Hint[] = [];
  for (const test of kase.essentialTests) {
    if (testsDone[test] || !available.has(test)) continue;
    candidates.push({ id: `test:${test}`, text: t.nudgeTest(testName(test, undefined, locale)) });
  }
  const seenCats = new Set<HistoryCategory>();
  for (const q of kase.history) {
    if (q.relevance !== 'key' || asked.includes(q.id) || seenCats.has(q.category)) continue;
    seenCats.add(q.category);
    candidates.push({ id: `ask:${q.category}`, text: t.nudgeAsk(q.category, t.historyLabel[q.category]) });
  }
  for (const test of kase.helpfulTests) {
    if (testsDone[test] || !available.has(test)) continue;
    candidates.push({ id: `help:${test}`, text: t.nudgeHelp(testName(test, undefined, locale)) });
  }
  const next = candidates.find((c) => !given.includes(c.id));
  if (next) return next;
  if (!given.includes('final')) return { id: 'final', text: t.nudgeFinal };
  return null;
}

/* ── Timing ──────────────────────────────────────────────────────────────── */

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 0 (plenty of time) .. 1 (out of time) — drives the Code Red vignette. Only the last 40% builds pressure. */
export function timePressure(elapsedSec: number, limitSec: number | undefined): number {
  if (!limitSec || limitSec <= 0) return 0;
  const used = Math.min(1, Math.max(0, elapsedSec / limitSec));
  return Math.min(1, Math.max(0, (used - 0.6) / 0.4));
}

export interface RunProgress {
  index: number;
  total: number | null;
}

export function runProgress(run: RunSnapshot | null, mode: ModeModule | undefined): RunProgress | null {
  if (!run) return null;
  const len = mode?.rules.length;
  const index = run.completed.length + run.failed.length + 1;
  return { index, total: typeof len === 'number' ? len : null };
}

/* ── Working differential ────────────────────────────────────────────────── */

export const MAX_SUSPECTS = 4;

export function pinSuspect(list: readonly string[], id: string): string[] {
  if (list.includes(id) || list.length >= MAX_SUSPECTS) return [...list];
  return [...list, id];
}

export function unpinSuspect(list: readonly string[], id: string): string[] {
  return list.filter((x) => x !== id);
}

export function moveSuspect(list: readonly string[], from: number, dir: -1 | 1): string[] {
  const to = from + dir;
  const out = [...list];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length) return out;
  [out[from], out[to]] = [out[to]!, out[from]!];
  return out;
}

export function searchDiagnoses(all: readonly Diagnosis[], query: string, locale: Locale = 'en'): Diagnosis[] {
  const cats = pickStrings(S, locale).category;
  const q = query.trim().toLowerCase();
  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name, locale));
  if (!q) return sorted;
  const terms = q.split(/\s+/);
  return sorted.filter((d) => {
    const hay = [d.name, ...(d.aka ?? []), cats[d.category] ?? d.category].join(' ').toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/* ── Diagnosis board ─────────────────────────────────────────────────────── */

/** The answer and its differentials in a deterministic, case-specific shuffled order. */
export function boardOrder(kase: ClinicalCase): string[] {
  const ids = [...new Set([kase.diagnosis, ...kase.differentials])];
  return createRng(`board:${kase.id}`).shuffle(ids);
}

export const prettifyId = (id: string): string => id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const CATEGORY_INFO: Record<DiagnosisCategory, { label: string; icon: IconName }> = {
  refractive: { label: 'Refractive', icon: 'visual-acuity' },
  binocular: { label: 'Binocular vision', icon: 'cover-test' },
  anterior: { label: 'Anterior segment', icon: 'slit-lamp' },
  cornea: { label: 'Cornea', icon: 'fluorescein' },
  glaucoma: { label: 'Glaucoma', icon: 'tonometry' },
  lens: { label: 'Lens', icon: 'retinoscopy' },
  retina: { label: 'Retina', icon: 'ophthalmoscopy' },
  neuro: { label: 'Neuro-ophthalmic', icon: 'pupils' },
  systemic: { label: 'Systemic', icon: 'heart' },
  normal: { label: 'Healthy', icon: 'check' },
};

export const URGENCY_INFO: Record<Urgency, { label: string; blurb: string; detail: string; color: string; level: number }> = {
  routine: { label: 'Routine', blurb: 'Book a regular visit', detail: 'No danger to sight. A normal appointment in the coming weeks or months is fine.', color: 'var(--lm-vivid-green)', level: 1 },
  soon: { label: 'Soon', blurb: 'Within a few days', detail: 'Needs attention, but a short wait is safe. See the patient again or refer within days.', color: 'var(--lm-vivid-blue)', level: 2 },
  urgent: { label: 'Urgent', blurb: 'Same day', detail: 'Could threaten vision if it waits. Treat or refer today, within 24 hours.', color: 'var(--lm-vivid-orange)', level: 3 },
  emergency: { label: 'Emergency', blurb: 'Immediately', detail: 'Sight- or life-threatening. Send to the emergency department or on-call specialist right now.', color: 'var(--lm-vivid-red)', level: 4 },
};

export const URGENCY_LIST: readonly Urgency[] = URGENCIES;

export const CONFIDENCE_INFO: Record<Confidence, { label: string; blurb: string; level: number }> = {
  guessing: { label: 'Guessing', blurb: 'It is a hunch', level: 1 },
  'fairly-sure': { label: 'Fairly sure', blurb: 'Evidence leans this way', level: 2 },
  certain: { label: 'Certain', blurb: 'I would stake my licence', level: 3 },
};

export const CONFIDENCE_LIST: readonly Confidence[] = ['guessing', 'fairly-sure', 'certain'];
