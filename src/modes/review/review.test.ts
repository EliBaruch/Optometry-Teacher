import { describe, expect, it } from 'vitest';
import { buildFindings, createServices, nullLearning, type ClinicalCase, type GameServices, type LearningPort, type RunSnapshot } from '@core';
import review from './index';

const BANNED = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth|confess\w*|holy)\b/i;
const findings = buildFindings(40);
const mk = (id: string, diagnosis: string, difficulty: ClinicalCase['difficulty'] = 2): ClinicalCase => ({
  id, difficulty, diagnosis, tags: [], chiefComplaint: '…', history: [], findings, essentialTests: [], helpfulTests: [],
  differentials: [], urgency: 'routine', management: '', teachingPoints: [],
  patient: { name: id, age: 40, sex: 'X', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
});
const snap = (completed: string[] = [], failed: string[] = [], seed = 's'): RunSnapshot =>
  ({ modeId: 'review', completed, failed, totalScore: 0, lives: null, combo: 0, seed });

function fakeLearning(o: { due?: string[]; mastery?: Record<string, number>; seen?: number } = {}): LearningPort {
  const m = o.mastery ?? {};
  return {
    ...nullLearning,
    due: (limit) => (o.due ?? []).slice(0, limit ?? Infinity),
    mastery: (id) => m[id] ?? 0,
    seen: (id) => id in m || (o.due ?? []).includes(id),
    stats: () => ({ seen: o.seen ?? Object.keys(m).length, mastered: 0, due: o.due?.length ?? 0 }),
  };
}
function svc(cases: ClinicalCase[], learning: LearningPort): GameServices {
  const s = createServices();
  s.learning = learning;
  cases.forEach((c) => s.registries.cases.register(c));
  return s;
}
const pool = [
  mk('poag-1', 'poag'), mk('poag-2', 'poag'), mk('aac-1', 'acute-angle-closure'), mk('uv-1', 'anterior-uveitis'),
  mk('myo-1', 'myopia'), mk('dry-1', 'dry-eye'), mk('cat-1', 'cataract'),
];

describe('review mode', () => {
  it('has neutral copy and 4 patients', () => {
    expect(review.title).toBe('Second Opinion');
    expect(review.rules.length).toBe(4);
    expect(`${review.title} ${review.tagline}`).not.toMatch(BANNED);
  });

  it('is locked until two diagnoses have been met', () => {
    const r0 = review.locked!(svc(pool, fakeLearning({ seen: 0 })))!;
    expect(r0).toMatch(/2 more different conditions/);
    expect(r0).not.toMatch(BANNED);
    expect(review.locked!(svc(pool, fakeLearning({ seen: 1 })))).toMatch(/1 more condition/);
    expect(review.locked!(svc(pool, fakeLearning({ seen: 2 })))).toBeUndefined();
  });

  it('serves due diagnoses most-overdue first, one case per diagnosis', () => {
    const s = svc(pool, fakeLearning({ due: ['acute-angle-closure', 'poag', 'anterior-uveitis'], mastery: { myopia: 0.9 } }));
    s.run.start(review, 'seed');
    const picked: ClinicalCase[] = [];
    for (let k = s.run.next(); k; k = s.run.next()) {
      picked.push(k);
      s.run.report(k.id, { diagnosisCorrect: true, total: 600 } as never);
    }
    expect(picked.map((c) => c.diagnosis).slice(0, 3)).toEqual(['acute-angle-closure', 'poag', 'anterior-uveitis']);
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((c) => c.id)).size).toBe(4);
    // nothing else due: the 4th is the least-mastered diagnosis already met
    expect(picked[3]!.diagnosis).toBe('myopia');
  });

  it('with nothing due, picks the least-mastered diagnoses the player has met', () => {
    const s = svc(pool, fakeLearning({ mastery: { cataract: 0.7, 'dry-eye': 0.2, myopia: 0.5 } }));
    expect(review.pickNext(s, snap())?.diagnosis).toBe('dry-eye');
    expect(review.pickNext(s, snap(['dry-1']))?.diagnosis).toBe('myopia');
  });

  it('never repeats a case, and ends when the pool is exhausted or empty', () => {
    const s = svc([mk('a', 'x'), mk('b', 'y')], fakeLearning({ due: ['x', 'y'] }));
    expect(review.pickNext(s, snap(['a']))?.id).toBe('b');
    expect(review.pickNext(s, snap(['a'], ['b']))).toBeNull();
    expect(review.pickNext(svc([], fakeLearning()), snap())).toBeNull();
  });

  it('skips a due diagnosis with no unused case left', () => {
    const s = svc(pool, fakeLearning({ due: ['anterior-uveitis', 'poag'] }));
    expect(review.pickNext(s, snap(['uv-1']))?.diagnosis).toBe('poag');
  });
});
