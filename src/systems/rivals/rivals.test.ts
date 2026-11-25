import { describe, expect, it } from 'vitest';
import { createServices, scoreCase, type ClinicalCase, type GameEvents, type ScoreBreakdown } from '@core';
import rivals from './index';
import { rivalsFor } from './controller';
import {
  DAILY_FULL_CREDIT, PLAYER_ID, applyCase, basePoints, boardSeries, casePoints, checkSlipped, initialState, nextScale, overtaken,
  playerRank, rollWeek, standings, startRun, weekReward,
} from './league';
import { RIVAL_BY_ID, ROSTER } from './roster';
import { formatTime, humanizeId, inClinicalOrder, pickQuip, simulateRival, simulateRivalGeneric } from './sim';
import { boardPointsAt, dayKey, isoWeekStart, rivalPointsAt, timeLeftLabel, weekEnd, weekKey, weekStart } from './week';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
// Tuesday 24 Nov 2026 is in ISO week 48 (Mon 23 Nov – Sun 29 Nov).
const TUE = at(2026, 11, 24, 15);

const KASE: ClinicalCase = {
  id: 'test-aac',
  difficulty: 4,
  tags: [],
  patient: { name: 'Test', age: 66, sex: 'F', avatar: { skin: 1, hair: 'bob', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
  chiefComplaint: 'Red painful eye',
  history: [
    { id: 'halos', category: 'symptoms', q: 'Halos?', a: 'Yes', relevance: 'key' },
    { id: 'nausea', category: 'symptoms', q: 'Nausea?', a: 'Yes', relevance: 'key' },
    { id: 'pets', category: 'social', q: 'Pets?', a: 'A cat', relevance: 'neutral' },
  ],
  findings: {} as ClinicalCase['findings'],
  essentialTests: ['tonometry', 'slit-lamp', 'pupils'],
  helpfulTests: ['visual-acuity', 'ophthalmoscopy'],
  diagnosis: 'acute-angle-closure',
  differentials: ['anterior-uveitis', 'microbial-keratitis', 'bacterial-conjunctivitis'],
  urgency: 'emergency',
  management: '',
  teachingPoints: [],
};

function score(correct = true, total = 1100): ScoreBreakdown {
  return {
    total, max: 1300, grade: correct ? 'A' : 'D', perfect: false, diagnosisCorrect: correct, urgencyCorrect: correct,
    correctDiagnosisId: 'x', chosenDiagnosisId: correct ? 'x' : 'y', parts: [], essentialMissed: correct ? [] : ['tonometry'],
    unnecessaryTests: [], keyQuestionsAsked: 1, keyQuestionsTotal: 2, skillAvg: 0.8, elapsedSec: 90, parSec: 120,
  };
}

const BANNED = /\b(sins?|deadly|vices?|pride|greed|envy|envious|gluttony|lust|wrath|sloth)\b/i;

describe('week maths', () => {
  it('keys ISO weeks and finds Monday midnight', () => {
    expect(weekKey(TUE)).toBe('2026-W48');
    expect(weekKey(at(2026, 11, 29, 23, 59))).toBe('2026-W48');
    expect(weekKey(at(2026, 11, 30, 0, 1))).toBe('2026-W49');
    expect(weekKey(at(2027, 1, 1))).toBe('2026-W53');
    expect(weekStart(TUE)).toBe(at(2026, 11, 23, 0));
    expect(weekEnd(TUE)).toBe(at(2026, 11, 30, 0));
    expect(dayKey(TUE)).toBe('2026-11-24');
    expect(timeLeftLabel(at(2026, 11, 29, 21, 30))).toBe('2h 30m');
  });

  it('maps a week key back to its Monday (inverse of weekKey), across year boundaries', () => {
    for (let t = at(2025, 12, 20); t < at(2027, 1, 20); t += 0.37 * 86_400_000) {
      expect(isoWeekStart(weekKey(t))).toBe(weekStart(t));
    }
    expect(isoWeekStart('nonsense')).toBe(-Infinity);
  });

  it('grows colleagues monotonically from zero to their weekly target', () => {
    for (const r of ROSTER) {
      let prev = -1;
      for (let t = weekStart(TUE); t < weekEnd(TUE); t += 3_600_000) {
        const p = rivalPointsAt(r, t, 1);
        expect(p).toBeGreaterThanOrEqual(prev);
        prev = p;
      }
      expect(rivalPointsAt(r, weekStart(TUE) + 1, 1)).toBe(0);
      expect(rivalPointsAt(r, weekEnd(TUE) - 1, 1)).toBeGreaterThanOrEqual(Math.floor(r.weeklyTarget * 0.99));
      expect(rivalPointsAt(r, weekEnd(TUE) - 1, 1)).toBeLessThanOrEqual(r.weeklyTarget);
    }
  });

  it('only counts colleagues’ points after the player joined, in the joining week', () => {
    const vex = RIVAL_BY_ID.vex;
    const joined = at(2026, 11, 26, 9);
    expect(boardPointsAt(vex, at(2026, 11, 26, 8), 1, joined)).toBe(0);
    expect(boardPointsAt(vex, at(2026, 11, 27, 20), 1, joined)).toBe(rivalPointsAt(vex, at(2026, 11, 27, 20), 1) - rivalPointsAt(vex, joined, 1));
    // A later week counts in full.
    expect(boardPointsAt(vex, at(2026, 12, 2, 20), 1, joined)).toBe(rivalPointsAt(vex, at(2026, 12, 2, 20), 1));
  });
});

describe('points', () => {
  it('scale with learning quality, not time', () => {
    const great = score(true, 1250);
    const wrong = score(false, 400);
    expect(basePoints(great)).toBeGreaterThan(basePoints(wrong));
    expect(basePoints(wrong)).toBeGreaterThan(0); // never punitive
    expect(basePoints({ ...great, perfect: true })).toBe(basePoints(great) + 20);
    expect(basePoints({ ...great, elapsedSec: 999 })).toBe(basePoints(great));
  });

  it('taper gently after the daily full-credit patients', () => {
    const s = score();
    expect(casePoints(s, DAILY_FULL_CREDIT - 1)).toBe(basePoints(s));
    expect(casePoints(s, DAILY_FULL_CREDIT)).toBeLessThan(basePoints(s));
    expect(casePoints(s, DAILY_FULL_CREDIT)).toBeGreaterThan(0);
  });
});

describe('simulation', () => {
  const ctx = { diagnosisName: (id: string) => humanizeId(id) };

  it('is deterministic per colleague and case', () => {
    for (const r of ROSTER) expect(simulateRival(r, KASE, ctx)).toEqual(simulateRival(r, KASE, ctx));
    expect(simulateRivalGeneric(RIVAL_BY_ID.mori, 'x')).toEqual(simulateRivalGeneric(RIVAL_BY_ID.mori, 'x'));
  });

  it('only lets a skipped test mislead when that test separates the diagnosis from the mimic', () => {
    let misled = 0;
    for (let i = 0; i < 80; i++) {
      const kase = { ...KASE, id: `aac-${i}` };
      const r = simulateRival(RIVAL_BY_ID.vex, kase, ctx);
      if (!r.diagnosisCorrect) {
        misled++;
        // Tonometry is what separates angle closure from uveitis; nothing else may be blamed.
        expect(r.tests).not.toContain('tonometry');
        expect(r.chosenDiagnosisId).toBe('anterior-uveitis');
        expect(r.slip?.text).toBe('Skipped the pressure check, called it Anterior Uveitis and missed the Acute Angle Closure.');
        expect(r.slip?.lesson).toMatch(/pressure separates them/i);
      } else {
        expect(r.tests).toEqual(expect.arrayContaining(['tonometry', 'slit-lamp', 'pupils']));
      }
    }
    expect(misled).toBeGreaterThan(5);
    expect(misled).toBeLessThan(60);
  });

  it('under-triage keeps the diagnosis but drops the urgency one notch', () => {
    const slips = Array.from({ length: 60 }, (_, i) => simulateRival(RIVAL_BY_ID.reyes, { ...KASE, id: `u-${i}` }, ctx)).filter((r) => r.slip?.kind === 'under-triages');
    expect(slips.length).toBeGreaterThan(0);
    for (const r of slips) {
      expect(r.diagnosisCorrect).toBe(true);
      expect(r.urgencyCorrect).toBe(false);
      expect(r.slip!.text).toBe('Right diagnosis, but booked it as a same-day urgent visit. This patient needed immediate emergency care.');
      expect(r.slip!.lesson).toBe('Urgency is part of the diagnosis: Acute Angle Closure needs immediate emergency care.');
    }
  });

  it('runs tests in a sensible clinical order and scores with the core scorer', () => {
    const r = simulateRival(RIVAL_BY_ID.okafor, KASE, ctx);
    expect(r.tests.indexOf('pupils')).toBeLessThan(r.tests.indexOf('slit-lamp'));
    expect(r.tests.indexOf('slit-lamp')).toBeLessThan(r.tests.indexOf('tonometry'));
    expect(r.max).toBe(scoreCase({ kase: KASE, diagnosisId: KASE.diagnosis, urgency: 'emergency', testsDone: {}, askedQuestions: [], elapsedSec: 1, hintsUsed: 0 }).max);
    expect(formatTime(72)).toBe('1:12');
  });

  it('orders any test set the way a clinician would (acuity first, fundus last)', () => {
    expect(inClinicalOrder(['ophthalmoscopy', 'tonometry', 'visual-acuity', 'slit-lamp'])).toEqual(['visual-acuity', 'slit-lamp', 'tonometry', 'ophthalmoscopy']);
    expect(inClinicalOrder([])).toEqual([]);
  });

  it('player-facing copy stays clinic-themed', () => {
    for (const r of ROSTER) {
      const text = [r.name, r.title, r.tagline, r.bio, r.signatureLabel, r.slipLabel, r.slipLesson, ...r.quips.ahead, ...r.quips.behind, ...r.quips.slipped];
      for (const t of text) expect(t).not.toMatch(BANNED);
    }
    for (let i = 0; i < 40; i++) {
      for (const rv of ROSTER) {
        const r = simulateRival(rv, { ...KASE, id: `c-${i}` }, ctx);
        if (r.slip) expect(`${r.slip.text} ${r.slip.lesson}`).not.toMatch(BANNED);
        expect(pickQuip(rv, r, 900, `c-${i}`)).not.toMatch(BANNED);
      }
    }
  });
});

describe('league', () => {
  it('ranks the player and detects overtakes', () => {
    let s = { ...initialState(at(2026, 11, 16)), weekKey: '2026-W48', joinedAt: at(2026, 11, 16), scale: 1 };
    const before = standings(s, TUE);
    expect(playerRank(before)).toBe(ROSTER.length + 1);
    s = { ...s, points: 1500 };
    const after = standings(s, TUE);
    const passed = overtaken(before, after);
    expect(passed.length).toBeGreaterThan(0);
    expect(after.find((r) => r.id === PLAYER_ID)!.rank).toBeLessThan(ROSTER.length + 1);
  });

  it('gives ties to the player', () => {
    const s = { ...initialState(TUE), points: 0 };
    expect(playerRank(standings(s, TUE))).toBe(1); // everyone on 0 right after joining
  });

  it('applyCase updates points, head-to-head and the comparison', () => {
    const s0 = initialState(at(2026, 11, 23, 8));
    const sims = ROSTER.map((r) => simulateRivalGeneric(r, 'k1'));
    const res = applyCase(s0, TUE, 'k1', score(true, 1290), sims);
    expect(res.points).toBe(basePoints(score(true, 1290)));
    expect(res.state.cases).toBe(1);
    expect(res.state.last?.caseId).toBe('k1');
    const wins = Object.values(res.state.h2h).reduce((n, h) => n + (h?.w ?? 0), 0);
    expect(wins).toBe(sims.filter((r) => r.total < 1290).length);
    expect(res.state.log.at(-1)).toEqual({ t: TUE, p: res.points });
    expect(res.state.last?.player.chosenDiagnosisId).toBe('x');
  });

  it('rolls the week, archiving the final place and adapting the field', () => {
    let s = initialState(at(2026, 11, 23, 8));
    s = applyCase(s, TUE, 'k1', score(), []).state;
    const next = rollWeek(s, at(2026, 12, 1, 10));
    expect(next.weekKey).toBe('2026-W49');
    expect(next.points).toBe(0);
    expect(next.lastWeek).toMatchObject({ weekKey: '2026-W48', cases: 1, delivered: false });
    expect(next.weeksPlayed).toBe(1);
    expect(rollWeek(next, at(2026, 12, 2))).toBe(next);
    // Field strength follows the player, within bounds; quiet weeks ease it down.
    expect(nextScale({ ...s, points: 99999 })).toBeLessThanOrEqual(2.2);
    expect(nextScale({ ...s, cases: 0 })).toBeLessThan(s.scale);
    expect(weekReward({ weekKey: 'x', rank: 1, field: 6, points: 1, cases: 5, delivered: false })).toBeGreaterThan(0);
    expect(weekReward({ weekKey: 'x', rank: 1, field: 6, points: 1, cases: 1, delivered: false })).toBe(0);
  });

  it('never rolls backwards: a clock moved back keeps the current week intact', () => {
    let s = initialState(at(2026, 11, 23, 8));
    s = applyCase(s, TUE, 'k1', score(), []).state;
    const next = rollWeek(s, at(2026, 12, 1, 10)); // forward into W49
    const w49 = applyCase(next, at(2026, 12, 1, 11), 'k2', score(), []).state;
    // Clock corrected / timezone change back into W48 (and much further back): nothing changes.
    expect(rollWeek(w49, at(2026, 11, 29, 23))).toBe(w49);
    expect(rollWeek(w49, at(2026, 1, 5))).toBe(w49);
    // A case finished while the clock is behind still counts for the stored week.
    const back = applyCase(w49, at(2026, 11, 29, 23), 'k3', score(), []).state;
    expect(back.weekKey).toBe('2026-W49');
    expect(back.cases).toBe(2);
    expect(back.scale).toBe(w49.scale);
    expect(back.lastWeek?.weekKey).toBe('2026-W48');
  });

  it('archives the final board at the end of the stored week, even after a long gap', () => {
    let s = initialState(at(2026, 11, 23, 8));
    s = applyCase(s, TUE, 'k1', score(true, 1290), []).state;
    const later = rollWeek(s, at(2027, 2, 3));
    expect(later.weekKey).toBe(weekKey(at(2027, 2, 3)));
    expect(later.lastWeek?.weekKey).toBe('2026-W48');
    expect(later.points).toBe(0);
  });

  it('keeps a run tally for the shift (points, best work-ups, colleagues passed)', () => {
    let s = { ...initialState(at(2026, 11, 16)), weekKey: '2026-W48', joinedAt: at(2026, 11, 16), scale: 1 };
    s = startRun(s, TUE, 'shift');
    expect(s.run).toMatchObject({ modeId: 'shift', points: 0, cases: 0, rankBefore: 0 });
    const weak = ROSTER.map((r) => ({ ...simulateRivalGeneric(r, 'k1'), total: 100 }));
    const res = applyCase(s, TUE, 'k1', score(true, 1290), weak, ROSTER, 'shift');
    expect(res.state.run).toMatchObject({ points: res.points, cases: 1, best: 1 });
    expect(res.state.run!.passed).toEqual(res.passed.map((r) => r.id));
    // A case from another mode does not touch the tally.
    const other = applyCase(res.state, TUE + 1000, 'k2', score(), [], ROSTER, 'practice');
    expect(other.state.run!.cases).toBe(1);
  });

  it('nudges gently when a colleague edges ahead, with a cooldown', () => {
    const t0 = at(2026, 11, 23, 9);
    let s = { ...initialState(at(2026, 11, 16)), weekKey: '2026-W48', joinedAt: at(2026, 11, 16), scale: 1 };
    s = applyCase(s, t0, 'k1', score(true, 1300), []).state;
    expect(s.lastRank).toBe(1);
    const later = at(2026, 11, 26, 20);
    const r = checkSlipped(s, later);
    expect(r.passedBy?.rival).toBeDefined();
    expect(r.gap).toBeGreaterThan(0);
    expect(r.state.trend?.dir).toBe('down');
    const again = checkSlipped({ ...r.state, lastRank: 1 }, later + 60_000);
    expect(again.passedBy).toBeUndefined();
  });

  it('builds a series per entrant ending at now', () => {
    const s = applyCase(initialState(at(2026, 11, 23, 8)), TUE, 'k1', score(), []).state;
    const series = boardSeries(s, TUE + 1000);
    expect(series).toHaveLength(ROSTER.length + 1);
    for (const x of series) expect(x.points.at(-1)!.t).toBe(TUE + 1000);
  });
});

describe('system install', () => {
  it('registers UI, reacts to case:completed and cleans up', () => {
    const now = { t: TUE };
    const services = createServices({ now: () => now.t });
    const events: { name: string; payload: unknown }[] = [];
    services.bus.onAny((name, payload) => events.push({ name, payload }));
    const uninstall = rivals.install(services);
    expect(services.registries.hud.has('rivals:standing')).toBe(true);
    expect(services.registries.hud.has('rivals:results')).toBe(true);
    expect(services.registries.hud.has('rivals:hub')).toBe(true);
    expect(services.registries.scenes.has('rivals')).toBe(true);
    expect(services.registries.hub.get('rivals')?.sceneId).toBe('rivals');

    const sc = scoreCase({ kase: KASE, diagnosisId: KASE.diagnosis, urgency: 'emergency', testsDone: {}, askedQuestions: ['halos', 'nausea'], elapsedSec: 80, hintsUsed: 0 });
    services.bus.emit('case:completed', { caseId: 'unknown-case', modeId: 'shift', score: sc });
    const rewards = events.filter((e) => e.name === 'reward:granted').map((e) => e.payload as GameEvents['reward:granted']);
    expect(rewards[0]).toMatchObject({ source: 'rivals', label: 'Colleagues board' });
    expect(rivalsFor(services).state.get().cases).toBe(1);
    expect(rivalsFor(services).state.get().last?.rivals).toHaveLength(ROSTER.length);

    // Idempotent: a second install doesn't double-count.
    const uninstall2 = rivals.install(services);
    services.bus.emit('case:completed', { caseId: 'unknown-case-2', modeId: 'shift', score: sc });
    expect(rivalsFor(services).state.get().cases).toBe(2);

    uninstall();
    uninstall2();
    services.bus.emit('case:completed', { caseId: 'unknown-case-3', modeId: 'shift', score: sc });
    expect(rivalsFor(services).state.get().cases).toBe(2);
    for (const e of events) expect(JSON.stringify(e.payload)).not.toMatch(BANNED);
  });

  it('closes a finished week with a single, kind summary', () => {
    const now = { t: TUE };
    const services = createServices({ now: () => now.t });
    const toasts: string[] = [];
    const grants: number[] = [];
    services.bus.on('toast', (t) => toasts.push(t.message));
    services.bus.on('currency:grant', (g) => grants.push(g.amount));
    const uninstall = rivals.install(services);
    const sc = score(true, 1250);
    for (let i = 0; i < 4; i++) services.bus.emit('case:completed', { caseId: `x${i}`, modeId: 'shift', score: sc });
    now.t = at(2026, 12, 1, 10);
    services.bus.emit('scene:changed', { id: 'hub', params: {} });
    services.bus.emit('scene:changed', { id: 'hub', params: {} });
    const summary = toasts.filter((t) => t.startsWith("Last week's board"));
    expect(summary).toHaveLength(1);
    expect(grants).toHaveLength(1);
    expect(rivalsFor(services).state.get().weekKey).toBe('2026-W49');
    uninstall();
  });
});
