import { describe, expect, it } from 'vitest';
import { buildFindings, createServices, type ClinicalCase, type GameServices, type RunSnapshot, type TestId } from '@core';
import rush, { quickness, rushCap, rushComboMultiplier } from './index';

const BANNED = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth|confess\w*|holy)\b/i;
const findings = buildFindings(40);
const mk = (id: string, difficulty: ClinicalCase['difficulty'], essentialTests: TestId[] = []): ClinicalCase => ({
  id, difficulty, diagnosis: id, tags: [], chiefComplaint: '…', history: [], findings, essentialTests, helpfulTests: [],
  differentials: [], urgency: 'routine', management: '', teachingPoints: [],
  patient: { name: id, age: 40, sex: 'X', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
});
const snap = (completed: string[] = [], failed: string[] = [], combo = 0, seed = 's'): RunSnapshot =>
  ({ modeId: 'rush', completed, failed, totalScore: 0, lives: 3, combo, seed });
function svc(cases: ClinicalCase[]): GameServices {
  const s = createServices();
  cases.forEach((c) => s.registries.cases.register(c));
  return s;
}
const quick = [0, 1, 2, 3, 4, 5].map((i) => mk(`quick${i}`, 1, ['visual-acuity']));
const slow = [0, 1, 2, 3].map((i) => mk(`slow${i}`, 1, ['phoropter', 'slit-lamp', 'ophthalmoscopy', 'visual-fields']));

describe('rush mode', () => {
  it('is endless with three lives and neutral copy', () => {
    expect(rush.rules.length).toBe('endless');
    expect(rush.rules.lives).toBe(3);
    expect(rush.rules.scoreMultiplier).toBe(1);
    expect(`${rush.title} ${rush.tagline}`).not.toMatch(BANNED);
  });

  it('returns null with an empty pool', () => {
    expect(rush.pickNext(svc([]), snap())).toBeNull();
  });

  it('prefers quick patients', () => {
    expect(quickness(quick[0]!)).toBeLessThan(quickness(slow[0]!));
    const s = svc([...quick, ...slow]);
    for (let i = 0; i < 30; i++) {
      expect(rush.pickNext(s, snap([], [], 0, `seed${i}`))!.id).toMatch(/^quick/);
    }
  });

  it('mixes in harder patients as the streak grows', () => {
    const pool = [1, 2, 3, 4, 5].flatMap((d) => [0, 1, 2].map((i) => mk(`d${d}-${i}`, d as ClinicalCase['difficulty'])));
    const s = svc(pool);
    for (let i = 0; i < 20; i++) expect(rush.pickNext(s, snap([], [], 0, `x${i}`))!.difficulty).toBeLessThanOrEqual(2);
    expect(rushCap(snap([], [], 9))).toBe(5);
  });

  it('runs past any fixed length and ends when the third life is lost', () => {
    const s = svc([...quick, ...slow]);
    s.run.start(rush, 'endless');
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const k = s.run.next()!;
      seen.push(k.id);
      s.run.report(k.id, { diagnosisCorrect: true, total: 500 } as never);
    }
    // all 10 cases served before anything repeats
    expect(new Set(seen.slice(0, 10)).size).toBe(10);
    for (let i = 0; i < 3; i++) s.run.report(s.run.next()!.id, { diagnosisCorrect: false, total: 0 } as never);
    expect(s.run.next()).toBeNull();
  });

  it('refills the waiting room without repeating the patient who just left', () => {
    const s = svc([mk('a', 1), mk('b', 1)]);
    for (let i = 0; i < 10; i++) expect(rush.pickNext(s, snap(['a', 'b'], [], 0, `r${i}`))!.id).toBe('a');
  });

  it('documents a capped combo multiplier', () => {
    expect(rushComboMultiplier(0)).toBe(1);
    expect(rushComboMultiplier(5)).toBeCloseTo(1.5);
    expect(rushComboMultiplier(50)).toBeCloseTo(2);
    expect(rushComboMultiplier(-3)).toBe(1);
  });
});
