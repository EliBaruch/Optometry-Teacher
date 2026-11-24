import { describe, expect, it } from 'vitest';
import { beginRun, buildFindings, createServices, nullLearning, type ClinicalCase, type GameServices, type RunSnapshot, type Urgency } from '@core';
import codeRed, { CODE_RED_FALLBACK_SEC, finaleCase, isCodeRed, isTrueEmergency } from './index';

const BANNED = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth|confess\w*|holy)\b/i;
const findings = buildFindings(60);
const mk = (id: string, urgency: Urgency, difficulty: ClinicalCase['difficulty'] = 2, timer?: number): ClinicalCase => ({
  id, difficulty, urgency, diagnosis: id, tags: [], chiefComplaint: '…', history: [], findings, essentialTests: [], helpfulTests: [],
  differentials: [], management: '', teachingPoints: [], ...(timer ? { emergency: { timeLimitSec: timer } } : {}),
  patient: { name: id, age: 60, sex: 'X', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
});
const snap = (completed: string[] = [], failed: string[] = [], seed = 's'): RunSnapshot =>
  ({ modeId: 'code-red', completed, failed, totalScore: 0, lives: null, combo: 0, seed });
function svc(cases: ClinicalCase[], seen = 0): GameServices {
  const s = createServices();
  s.learning = { ...nullLearning, stats: () => ({ seen, mastered: 0, due: 0 }) };
  cases.forEach((c) => s.registries.cases.register(c));
  return s;
}
const board = [
  mk('crao', 'emergency', 3, 120), mk('rd', 'emergency', 3, 150), mk('aac', 'emergency', 4, 120),
  mk('ulcer', 'urgent', 2), mk('uveitis', 'urgent', 2), mk('optic-neuritis', 'urgent', 3),
  mk('myopia', 'routine', 1), mk('dry-eye', 'soon', 1),
];

describe('code-red mode', () => {
  it('has neutral copy, 4 patients and a fallback timer', () => {
    expect(`${codeRed.title} ${codeRed.tagline}`).not.toMatch(BANNED);
    expect(codeRed.rules.length).toBe(4);
    expect(codeRed.rules.timeLimitSec).toBe(CODE_RED_FALLBACK_SEC);
  });

  it('classifies emergencies and same-day urgents', () => {
    expect(board.filter(isCodeRed).map((c) => c.id)).toEqual(['crao', 'rd', 'aac', 'ulcer', 'uveitis', 'optic-neuritis']);
  });

  it('is locked with a friendly reason until 3 patients are completed', () => {
    const s = svc(board);
    const reason = codeRed.locked!(s)!;
    expect(reason).toMatch(/3 more patients/);
    expect(reason).not.toMatch(BANNED);
    s.bus.emit('case:completed', { caseId: 'a', modeId: 'shift', score: {} as never });
    s.bus.emit('case:completed', { caseId: 'b', modeId: 'shift', score: {} as never });
    expect(codeRed.locked!(s)).toMatch(/1 more patient /);
    s.bus.emit('case:completed', { caseId: 'c', modeId: 'shift', score: {} as never });
    expect(codeRed.locked!(s)).toBeUndefined();
  });

  it('also unlocks from learning stats (cases played before tracking began)', () => {
    expect(codeRed.locked!(svc(board, 3))).toBeUndefined();
  });

  it('stays locked when no emergency cases exist', () => {
    expect(codeRed.locked!(svc([mk('myopia', 'routine')], 5))).toMatch(/quiet/);
  });

  it('only serves emergencies, never repeats, and saves a true emergency for the finale', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const s = svc(board, 5);
      s.run.start(codeRed, seed);
      const picked: ClinicalCase[] = [];
      for (let k = s.run.next(); k; k = s.run.next()) {
        picked.push(k);
        s.run.report(k.id, { diagnosisCorrect: true, total: 800 } as never);
      }
      expect(picked).toHaveLength(4);
      expect(picked.every(isCodeRed)).toBe(true);
      expect(new Set(picked.map((c) => c.id)).size).toBe(4);
      expect(picked[3]!.urgency).toBe('emergency');
      expect(picked[0]!.urgency).toBe('urgent');
    }
  });

  function play(cases: ClinicalCase[], seed: string): ClinicalCase[] {
    const s = svc(cases, 5);
    s.run.start(codeRed, seed);
    const picked: ClinicalCase[] = [];
    for (let k = s.run.next(); k; k = s.run.next()) {
      picked.push(k);
      s.run.report(k.id, { diagnosisCorrect: true, total: 800 } as never);
    }
    return picked;
  }

  it('fills at least 3 of 4 slots with true emergencies whenever 3+ exist', () => {
    const many = [
      ...board,
      mk('gca', 'emergency', 4, 120), mk('cn3', 'emergency', 3, 120), mk('keratitis', 'urgent', 4, 150),
      mk('stroke', 'emergency', 4, 150), mk('horner', 'emergency', 5, 150), mk('pvd', 'urgent', 2), mk('wet-amd', 'urgent', 3),
    ];
    for (let i = 0; i < 40; i++) {
      const picked = play(many, `seed-${i}`);
      expect(picked).toHaveLength(4);
      // 9 true emergencies on the board: no urgent warm-up needed at all.
      expect(picked.every(isTrueEmergency)).toBe(true);
      expect(picked[3]!.id).toBe('horner'); // the hardest emergency is the finale
      const small = play(board, `seed-${i}`);
      expect(small.filter(isTrueEmergency).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('counts a case with its own emergency timer as a true emergency', () => {
    const k = mk('keratitis', 'urgent', 4, 150);
    expect(isTrueEmergency(k)).toBe(true);
    expect(isTrueEmergency(mk('pvd', 'urgent', 2))).toBe(false);
  });

  it('uses urgent cases only as filler once the emergencies run out', () => {
    const two = [mk('crao', 'emergency', 3, 120), mk('aac', 'emergency', 4, 120), mk('ulcer', 'urgent', 2), mk('pvd', 'urgent', 2), mk('cn6', 'urgent', 3)];
    for (const seed of ['a', 'b', 'c', 'd']) {
      const picked = play(two, seed);
      expect(picked).toHaveLength(4);
      expect(picked.filter(isTrueEmergency)).toHaveLength(2);
      expect(picked[3]!.id).toBe('aac');
    }
  });

  it('picks a stable finale even when several share the top difficulty', () => {
    const tied = [mk('a', 'emergency', 4, 120), mk('b', 'emergency', 4, 120), mk('c', 'emergency', 4, 120)];
    const f = finaleCase(tied, 'seed')!;
    expect(finaleCase(tied.filter((c) => c === f || c.id !== tied.find((x) => x !== f)!.id), 'seed')).toBe(f);
  });

  it('carries no internal design label', () => {
    expect(codeRed.drive).toBeUndefined();
  });

  it('ends early (null) when the emergency board is clear, and with no cases', () => {
    const s = svc(board, 5);
    expect(codeRed.pickNext(s, snap(['crao', 'rd', 'aac'], ['ulcer', 'uveitis', 'optic-neuritis']))).toBeNull();
    expect(codeRed.pickNext(svc([]), snap())).toBeNull();
  });

  it('keeps a case’s own timer and uses the fallback only when it has none (core flow)', () => {
    const s = svc([mk('ulcer', 'urgent', 1)], 5);
    s.registries.modes.register(codeRed);
    expect(beginRun(s, 'code-red')).toBe(true);
    expect(s.session.state.get()?.timeLimitSec).toBe(CODE_RED_FALLBACK_SEC);

    const s2 = svc([mk('crao', 'emergency', 1, 90)], 5);
    s2.registries.modes.register(codeRed);
    beginRun(s2, 'code-red');
    expect(s2.session.state.get()?.timeLimitSec).toBe(90);
  });
});
