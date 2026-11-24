import { describe, expect, it } from 'vitest';
import { buildFindings, createServices, nullLearning, type ClinicalCase, type GameServices, type RunSnapshot } from '@core';
import shift, { nearestDifficulty, shiftWindow, slotRange } from './index';
import { SHIFT_SLOT } from './experience';

const BANNED = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth|confess\w*|holy)\b/i;
const findings = buildFindings(40);
const mk = (id: string, difficulty: ClinicalCase['difficulty'], diagnosis = id): ClinicalCase => ({
  id, difficulty, diagnosis, tags: [], chiefComplaint: '…', history: [], findings, essentialTests: [], helpfulTests: [],
  differentials: [], urgency: 'routine', management: '', teachingPoints: [],
  patient: { name: id, age: 40, sex: 'X', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
});
const snap = (completed: string[] = [], failed: string[] = [], seed = 's'): RunSnapshot =>
  ({ modeId: 'shift', completed, failed, totalScore: 0, lives: null, combo: 0, seed });

function svc(cases: ClinicalCase[], seen = 0): GameServices {
  const s = createServices();
  s.learning = { ...nullLearning, stats: () => ({ seen, mastered: 0, due: 0 }) };
  cases.forEach((c) => s.registries.cases.register(c));
  return s;
}
const ladder = () => [1, 2, 3, 4, 5].flatMap((d) => [0, 1, 2].map((i) => mk(`d${d}-${i}`, d as ClinicalCase['difficulty'])));

/** Play a whole run through the core RunController, every diagnosis correct. */
function playRun(s: GameServices, seed = 'run') {
  s.run.start(shift, seed);
  const picked: ClinicalCase[] = [];
  for (let k = s.run.next(); k; k = s.run.next()) {
    picked.push(k);
    s.run.report(k.id, { diagnosisCorrect: true, total: 900 } as never);
  }
  s.run.end();
  return picked;
}

describe('shift mode', () => {
  it('has player-facing copy without any internal-lens vocabulary', () => {
    expect(shift.title).toBe('Clinic Shift');
    expect(`${shift.title} ${shift.tagline}`).not.toMatch(BANNED);
    expect(shift.rules.length).toBe(5);
  });

  it('returns null when there are no cases', () => {
    expect(shift.pickNext(svc([]), snap())).toBeNull();
  });

  it('starts a first-ever shift gently (difficulty 1–2) and ramps within the shift', () => {
    const picked = playRun(svc(ladder()));
    expect(picked).toHaveLength(5);
    expect(picked.every((c) => c.difficulty <= 2)).toBe(true);
    expect(picked[0]!.difficulty).toBe(1);
  });

  it('gets harder with experience', () => {
    const picked = playRun(svc(ladder(), 40));
    expect(picked.every((c) => c.difficulty >= 3)).toBe(true);
    expect(picked[4]!.difficulty).toBeGreaterThanOrEqual(4);
  });

  it('never repeats a case while unseen ones remain, and varies diagnoses', () => {
    const cases = ladder();
    for (const seed of ['a', 'b', 'c', 'd']) {
      const picked = playRun(svc(cases, 10), seed);
      expect(new Set(picked.map((c) => c.id)).size).toBe(5);
    }
    const s = svc([mk('x1', 1, 'myopia'), mk('x2', 1, 'myopia'), mk('y1', 1, 'dry-eye')]);
    const next = shift.pickNext(s, snap(['x1']));
    expect(next?.id).toBe('y1');
  });

  it('skips cases already failed in this run too', () => {
    const s = svc([mk('a', 1), mk('b', 1)]);
    expect(shift.pickNext(s, snap([], ['a']))?.id).toBe('b');
  });

  it('falls back to the nearest difficulty when the window is empty', () => {
    const s = svc([mk('a', 1), mk('b', 3), mk('c', 5)]);
    expect(shift.pickNext(s, snap(['a']))?.id).toBe('b');
    expect(nearestDifficulty([mk('x', 4), mk('y', 5)], 1, 2).map((c) => c.id)).toEqual(['x']);
  });

  it('allows a repeat only once the whole pool is exhausted', () => {
    const s = svc([mk('a', 1), mk('b', 1)]);
    expect(shift.pickNext(s, snap(['a', 'b']))).not.toBeNull();
  });

  it('is deterministic for a given run seed', () => {
    const s = svc(ladder(), 10);
    expect(shift.pickNext(s, snap([], [], 'q'))?.id).toBe(shift.pickNext(s, snap([], [], 'q'))?.id);
  });

  it('mid-shift, prefers a diagnosis that is due for review', () => {
    const s = svc(ladder());
    s.learning = { ...s.learning, due: () => ['d2-1'] };
    expect(shift.pickNext(s, snap(['d1-0', 'd1-1']))?.id).toBe('d2-1');
  });

  it('counts completed cases in its own save slot once consulted', () => {
    const s = svc([]);
    expect(shift.locked?.(s)).toBeUndefined();
    s.bus.emit('case:completed', { caseId: 'a', modeId: 'rush', score: {} as never });
    s.bus.emit('case:completed', { caseId: 'b', modeId: 'rush', score: {} as never });
    expect(s.save.slot(SHIFT_SLOT, { casesCompleted: 0 }).get().casesCompleted).toBe(2);
    shift.locked?.(s); // idempotent: no double subscription
    s.bus.emit('case:completed', { caseId: 'c', modeId: 'rush', score: {} as never });
    expect(s.save.slot(SHIFT_SLOT, { casesCompleted: 0 }).get().casesCompleted).toBe(3);
  });
});

describe('shift difficulty helpers', () => {
  it('windows widen with experience', () => {
    expect(shiftWindow(0)).toEqual([1, 2]);
    expect(shiftWindow(5)).toEqual([1, 3]);
    expect(shiftWindow(10)).toEqual([2, 4]);
    expect(shiftWindow(20)).toEqual([2, 5]);
    expect(shiftWindow(99)).toEqual([3, 5]);
  });
  it('ramps patient by patient', () => {
    expect(slotRange(1, 2, 0)).toEqual({ min: 1, max: 1 });
    expect(slotRange(1, 2, 4)).toEqual({ min: 1, max: 2 });
    expect(slotRange(2, 5, 4)).toEqual({ min: 4, max: 5 });
  });
});
