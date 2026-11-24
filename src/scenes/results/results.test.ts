import { describe, expect, it } from 'vitest';
import {
  buildFindings, scoreCase,
  type CaseSession, type ClinicalCase, type Diagnosis, type MiniGameResult, type TestId,
} from '@core';
import { beats, reached } from './choreo';
import {
  affectedEye, buildReview, clockText, confidenceNote, pickClinchers, prettyId, reviewUrgency,
} from './model';
import { EMPTY_LOG, accuracy, appendEntry, bestCase, checkBest, comboPeak, findRun, type RunLogEntry } from './run-log';

const kase: ClinicalCase = {
  id: 'aac-test',
  difficulty: 3,
  tags: [],
  patient: { name: 'Ada', age: 64, sex: 'F', avatar: { skin: 1, hair: 'bob', hairColor: '#333', irisColor: '#456', outfit: '#222' } },
  chiefComplaint: 'Halos and a pounding headache.',
  history: [
    { id: 'halos', category: 'symptoms', q: 'Any halos?', a: 'Rainbow rings round the lights.', relevance: 'key' },
    { id: 'nausea', category: 'symptoms', q: 'Nausea?', a: 'I was sick twice.', relevance: 'key' },
    { id: 'fhx', category: 'family', q: 'Family history?', a: 'Not that I know.', relevance: 'red-herring' },
  ],
  findings: buildFindings(64, { iop: { OD: 56, OS: 16 }, external: { redEye: ['OD'] } }),
  essentialTests: ['tonometry', 'slit-lamp'],
  helpfulTests: ['pupils'],
  diagnosis: 'acute-angle-closure',
  differentials: ['anterior-uveitis', 'viral-conjunctivitis'],
  urgency: 'emergency',
  management: 'Same-day emergency referral.',
  teachingPoints: ['A mid-dilated fixed pupil with high pressure is angle closure.'],
};

const dx: Diagnosis = {
  id: 'acute-angle-closure',
  name: 'Acute Angle Closure',
  category: 'glaucoma',
  summary: 'The iris blocks the drainage angle.',
  keyFindings: ['Very high IOP (often 40–80 mmHg)', 'Mid-dilated, poorly reactive pupil', 'Corneal oedema'],
  typicalUrgency: 'emergency',
  pearls: ['Check the other eye.'],
  rarity: 'common',
};
const diagnosis = (id: string) => (id === dx.id ? dx : undefined);

function result(testId: TestId, findings: MiniGameResult['findings']): MiniGameResult {
  return { testId, accuracy: 0.9, timeMs: 1000, findings };
}

function session(over: Partial<CaseSession> = {}): CaseSession {
  return {
    caseId: kase.id, modeId: 'shift', startedAt: 1000, askedQuestions: ['halos', 'fhx'], testsDone: {}, chart: [],
    hintsUsed: 0, clinicMinutes: 0, rewards: [], ...over,
  };
}

describe('model', () => {
  it('prettifies ids and clocks', () => {
    expect(prettyId('acute-angle-closure')).toBe('Acute angle closure');
    expect(clockText(125.4)).toBe('2:05');
    expect(clockText(-3)).toBe('0:00');
  });

  it('explains triage direction (under-triage is flagged as dangerous)', () => {
    expect(reviewUrgency('emergency', 'emergency').delta).toBe(0);
    const under = reviewUrgency('emergency', 'soon');
    expect(under.delta).toBe(-2);
    expect(under.advice).toMatch(/dangerous/);
    const over = reviewUrgency('routine', 'soon');
    expect(over.delta).toBe(1);
    expect(over.advice).toMatch(/cautious/);
    expect(reviewUrgency('urgent').chosen).toBeUndefined();
  });

  it('flags confidence notes', () => {
    expect(confidenceNote('wrong', 'certain')).toBe('confidently-wrong');
    expect(confidenceNote('correct', 'guessing')).toBe('lucky');
    expect(confidenceNote('correct', 'certain')).toBe('calibrated');
    expect(confidenceNote('wrong', 'guessing')).toBeNull();
    expect(confidenceNote('correct')).toBeNull();
  });

  it('builds a wrong-answer review with what was missed', () => {
    const testsDone = { tonometry: result('tonometry', []), 'color-vision': result('color-vision', []) };
    const score = scoreCase({ kase, diagnosisId: 'anterior-uveitis', urgency: 'urgent', testsDone, askedQuestions: ['halos'], elapsedSec: 60, hintsUsed: 0 });
    const s = session({ testsDone, submitted: { diagnosisId: 'anterior-uveitis', urgency: 'urgent', score, confidence: 'certain' } });
    const r = buildReview({ kase, session: s, diagnosis });
    expect(r.verdict).toBe('wrong');
    expect(r.correctName).toBe('Acute Angle Closure');
    expect(r.chosenName).toBe('Anterior uveitis'); // codex lacks it → prettified id
    expect(r.confidenceNote).toBe('confidently-wrong');
    expect(r.missedTests.map((t) => t.id)).toEqual(['slit-lamp']);
    expect(r.missedTests[0]!.name).toBe('Slit Lamp');
    expect(r.unnecessaryTests.map((t) => t.id)).toEqual(['color-vision']);
    expect(r.unaskedKey.map((q) => q.id)).toEqual(['nausea']);
    expect(r.unaskedKey[0]!.a).toBe('I was sick twice.');
    expect(r.urgency.delta).toBe(-1);
    expect(r.cleanWorkup).toBe(false);
  });

  it('builds a timeout review without a score', () => {
    const r = buildReview({ kase, session: session({ failed: 'timeout' }), diagnosis });
    expect(r.verdict).toBe('timeout');
    expect(r.score).toBeUndefined();
    expect(r.missedTests.map((t) => t.id)).toEqual(['tonometry', 'slit-lamp']);
    // session gone (e.g. cleared) but the route says timeout
    expect(buildReview({ kase, session: null, diagnosis, timeout: true }).verdict).toBe('timeout');
    // a stale session for another case is ignored
    expect(buildReview({ kase, session: { ...session(), caseId: 'other' }, diagnosis, timeout: true }).unaskedKey).toHaveLength(2);
  });

  it('picks discriminating findings: severity, codex overlap, one per label', () => {
    const chart = [
      { label: 'VA sc', value: '20/20', eye: 'OS' as const, flag: 'normal' as const },
      { label: 'Pupil', value: 'mid-dilated, sluggish', eye: 'OD' as const, flag: 'abnormal' as const },
      { label: 'IOP', value: '56 mmHg', eye: 'OD' as const, flag: 'critical' as const },
      { label: 'IOP', value: '16 mmHg', eye: 'OS' as const, flag: 'normal' as const },
      { label: 'Lids', value: 'mild ptosis', eye: 'OD' as const, flag: 'abnormal' as const },
    ];
    const testsDone = { tonometry: result('tonometry', [chart[2]!, chart[3]!]) };
    const picks = pickClinchers(kase, { chart, testsDone }, dx);
    expect(picks.map((p) => `${p.label} ${p.eye}`)).toEqual(['IOP OD', 'Pupil OD']);
    expect(picks.every((p) => p.source === 'chart')).toBe(true);
  });

  it('falls back to codex key findings when the chart is thin', () => {
    const picks = pickClinchers(kase, { chart: [], testsDone: {} }, dx);
    expect(picks).toHaveLength(2);
    expect(picks[0]!.source).toBe('textbook');
    expect(picks[0]!.label).toMatch(/IOP/);
    expect(pickClinchers(kase, null, undefined)).toEqual([]);
  });

  it('portraits the red eye, else the worse-seeing eye', () => {
    expect(affectedEye(kase.findings)).toBe('OD');
    const f = buildFindings(40, { va: { OS: { uncorrected: 1, bestCorrected: 0.8 } } });
    expect(affectedEye(f)).toBe('OS');
    expect(affectedEye(buildFindings(40))).toBe('OD');
  });
});

describe('run log', () => {
  const e = (caseId: string, correct: boolean, total = 800): RunLogEntry => ({
    caseId, diagnosisId: 'x', grade: correct ? 'A' : 'D', total, points: total, correct, timeout: false,
  });

  it('appends per run, replaces re-reported cases and keeps the last runs', () => {
    let s = appendEntry(EMPTY_LOG, 'r1', 'shift', e('a', true));
    s = appendEntry(s, 'r1', 'shift', e('b', false));
    s = appendEntry(s, 'r1', 'shift', e('b', true));
    expect(findRun(s, 'r1')!.entries.map((x) => `${x.caseId}${x.correct}`)).toEqual(['atrue', 'btrue']);
    for (let i = 2; i < 8; i++) s = appendEntry(s, `r${i}`, 'shift', e('a', true), 3);
    expect(s.runs.map((r) => r.seed)).toEqual(['r5', 'r6', 'r7']);
    expect(findRun(s, undefined)).toBeUndefined();
  });

  it('computes combo peak, best case and accuracy', () => {
    const list = [e('a', true), e('b', true), e('c', false), e('d', true, 1200), e('e', true), e('f', true)];
    expect(comboPeak(list)).toBe(3);
    expect(comboPeak([])).toBe(0);
    expect(bestCase(list)!.caseId).toBe('d');
    expect(bestCase([])).toBeUndefined();
    expect(accuracy({ completed: ['a', 'b', 'c'], failed: ['d'] })).toBe(0.75);
    expect(accuracy({ completed: [], failed: [] })).toBe(0);
  });

  it('personal best is idempotent per run', () => {
    const first = checkBest(EMPTY_LOG, 'shift', 'r1', 3000);
    expect(first).toMatchObject({ isBest: true, first: true });
    const again = checkBest(first.state, 'shift', 'r1', 3000);
    expect(again).toMatchObject({ isBest: true, first: true });
    expect(again.state).toBe(first.state);
    const lower = checkBest(first.state, 'shift', 'r2', 2000);
    expect(lower).toMatchObject({ isBest: false, previous: 3000 });
    const higher = checkBest(first.state, 'shift', 'r3', 4000);
    expect(higher).toMatchObject({ isBest: true, first: false, previous: 3000 });
    expect(checkBest(higher.state, 'shift', 'r3', 4000)).toMatchObject({ isBest: true, first: false, previous: 3000 });
    expect(checkBest(EMPTY_LOG, 'rush', 'r9', 0).isBest).toBe(false);
  });
});

describe('choreography', () => {
  it('orders beats and collapses under reduced motion', () => {
    const b = beats(7, false);
    expect(b.flip).toBeLessThan(b.verdict);
    expect(b.verdict).toBeLessThan(b.stamp);
    expect(b.stamp).toBeLessThan(b.ledger);
    expect(b.total).toBe(b.ledger + 7 * b.partStep + 200);
    expect(b.rewards).toBeGreaterThan(b.total);
    expect(b.settled).toBeGreaterThan(b.rewards);
    const r = beats(7, true);
    expect(Object.values(r).every((v) => v === 0)).toBe(true);
    expect(reached(b, b.stamp).has('stamp')).toBe(true);
    expect(reached(b, b.stamp).has('ledger')).toBe(false);
  });
});
