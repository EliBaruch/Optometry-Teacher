import { describe, expect, it } from 'vitest';
import { buildFindings, type ClinicalCase, type ScoreBreakdown } from '@core';
import {
  INITIAL_STATS, averageSaveSec, classify, clip, clockColor, clockPhase, formatClock, formatDuration, formatRotation,
  grandRoundsBonus, grandRoundsCase, grandRoundsClaimed, grandRoundsPool, heartbeatBpm, heartbeatIntervalMs,
  msUntilNextWeek, newMilestones, recordOutcome, remainingSec, rescueReward, teachingMessage, weekKey, weekStart,
} from './logic';

const score = (o: Partial<ScoreBreakdown> = {}): ScoreBreakdown => ({
  total: 900, max: 1300, grade: 'A', perfect: false, diagnosisCorrect: true, urgencyCorrect: true,
  correctDiagnosisId: 'crao', chosenDiagnosisId: 'crao', parts: [], essentialMissed: [], unnecessaryTests: [],
  keyQuestionsAsked: 3, keyQuestionsTotal: 4, skillAvg: 0.8, elapsedSec: 40, parSec: 72, ...o,
});

const kase = (id: string, timer?: number): ClinicalCase => ({
  id, difficulty: 3, tags: [], chiefComplaint: 'x', history: [], findings: buildFindings(50), essentialTests: [], helpfulTests: [],
  diagnosis: 'crao', differentials: [], urgency: timer ? 'emergency' : 'routine', management: '', teachingPoints: ['tp'],
  patient: { name: 'P', age: 50, sex: 'F', avatar: { skin: 1, hair: 'short', hairColor: '#000', irisColor: '#333', outfit: '#555' } },
  ...(timer ? { emergency: { timeLimitSec: timer } } : {}),
});

describe('clock maths', () => {
  it('counts down from the start time and never goes negative', () => {
    expect(remainingSec(1000, 120, 1000)).toBe(120);
    expect(remainingSec(1000, 120, 31000)).toBe(90);
    expect(remainingSec(1000, 120, 999999)).toBe(0);
  });
  it('formats minutes, then tenths in the final 10 seconds', () => {
    expect(formatClock(120)).toBe('2:00');
    expect(formatClock(61.2)).toBe('1:02');
    expect(formatClock(10.01)).toBe('0:11');
    expect(formatClock(9.46)).toBe('9.4');
    expect(formatClock(0)).toBe('0.0');
    expect(formatDuration(48.4)).toBe('48s');
    expect(formatDuration(112)).toBe('1m 52s');
  });
  it('heart rate climbs monotonically and races in the last 10 s', () => {
    const rates = [120, 90, 60, 30, 11, 9, 1].map((r) => heartbeatBpm(r, 120));
    for (let i = 1; i < rates.length; i++) expect(rates[i]!).toBeGreaterThan(rates[i - 1]!);
    expect(heartbeatBpm(120, 120)).toBeCloseTo(66);
    expect(heartbeatIntervalMs(0.5, 120)).toBeGreaterThanOrEqual(340); // never faster than the sfx can play
  });
  it('phases and colours shift towards crimson', () => {
    expect(clockPhase(100, 120)).toBe('calm');
    expect(clockPhase(50, 120)).toBe('tense');
    expect(clockPhase(25, 120)).toBe('critical');
    expect(clockPhase(8, 120)).toBe('final');
    expect(clockColor(120, 120)).toBe('#ffd27a');
    expect(clockColor(30, 120)).toBe('#ef4444');
    expect(clockColor(5, 120)).toBe('#f43f5e');
  });
});

describe('outcomes & rewards', () => {
  it('classifies saves, under-triage and misses', () => {
    expect(classify(score())).toBe('saved');
    expect(classify(score({ urgencyCorrect: false }))).toBe('under-triaged');
    expect(classify(score({ diagnosisCorrect: false }))).toBe('missed');
  });
  it('scales with work-up quality and decisiveness, not time spent', () => {
    const sloppy = rescueReward(score({ total: 600 }), 60, 120, false);
    const sharp = rescueReward(score({ total: 1200 }), 60, 120, false);
    const slow = rescueReward(score({ total: 1200 }), 110, 120, false);
    expect(sharp.coins).toBeGreaterThan(sloppy.coins);
    expect(sharp.xp).toBeGreaterThan(sloppy.xp);
    expect(slow.coins).toBeLessThan(sharp.coins);
    expect(sharp.grandCoins).toBe(0);
    expect(rescueReward(score({ perfect: true, total: 1300 }), 10, 120, false).rarity).toBe('legendary');
  });
  it('adds a quality-scaled Grand Rounds bonus', () => {
    const r = rescueReward(score({ total: 1300 }), 10, 120, true);
    expect(r.grandCoins).toBe(grandRoundsBonus(1).coins);
    expect(grandRoundsBonus(0)).toEqual({ coins: 75, xp: 125 });
  });
  it('writes sober teaching lines', () => {
    expect(teachingMessage('under-triaged', 'Central retinal artery occlusion', 'emergency', 'Sudden painless loss')).toBe(
      'Right call on Central retinal artery occlusion — but it needs a same-hour emergency referral. Red flag to remember: Sudden painless loss',
    );
    expect(teachingMessage('missed', 'GCA', 'emergency')).toBe('This was GCA.');
    expect(clip('a'.repeat(40) + '. ' + 'b'.repeat(200), 150).endsWith('…')).toBe(true);
  });
});

describe('weeks & Grand Rounds', () => {
  const mon = new Date(2026, 10, 23, 0, 0, 0).getTime(); // Monday 23 Nov 2026
  it('keys weeks the ISO way', () => {
    expect(weekKey(mon)).toBe('2026-W48');
    expect(weekKey(mon + 6 * 86400000 + 3600000)).toBe('2026-W48'); // Sunday
    expect(weekKey(mon + 7 * 86400000)).toBe('2026-W49');
    expect(weekKey(new Date(2027, 0, 1).getTime())).toBe('2026-W53');
    expect(weekStart(mon + 3 * 86400000 + 5000)).toBe(mon);
    expect(msUntilNextWeek(mon + 86400000)).toBe(6 * 86400000);
    expect(formatRotation(3 * 86400000 + 4 * 3600000)).toBe('3d 4h');
  });
  it('picks one timed emergency per week, deterministically and without back-to-back repeats', () => {
    const cases = [kase('c'), kase('a', 120), kase('b', 150), kase('d', 120)];
    expect(grandRoundsPool(cases).map((c) => c.id)).toEqual(['a', 'b', 'd']);
    const thisWeek = grandRoundsCase(cases, mon + 1000);
    expect(thisWeek).toBe(grandRoundsCase([...cases].reverse(), mon + 5 * 86400000));
    for (let w = 0; w < 20; w++) {
      const a = grandRoundsCase(cases, mon + w * 7 * 86400000);
      const b = grandRoundsCase(cases, mon + (w + 1) * 7 * 86400000);
      expect(a).not.toBe(b);
    }
    expect(grandRoundsCase([kase('z')], mon)).toBeUndefined();
  });
});

describe('stats', () => {
  it('records saves, averages and runs; misses never remove progress', () => {
    let s = recordOutcome(INITIAL_STATS, { caseId: 'x', diagnosisId: 'crao', outcome: 'saved', sec: 40, at: 1 });
    s = recordOutcome(s, { caseId: 'y', diagnosisId: 'gca', outcome: 'saved', sec: 60, at: 2, grandRoundsWeek: '2026-W48' });
    s = recordOutcome(s, { caseId: 'z', diagnosisId: 'crao', outcome: 'missed', sec: 90, at: 3 });
    expect(s.saved).toBe(2);
    expect(s.attempts).toBe(3);
    expect(averageSaveSec(s)).toBe(50);
    expect(s.fastestSaveSec).toBe(40);
    expect(s.bestRun).toBe(2);
    expect(s.run).toBe(0);
    expect(s.savedBy).toEqual({ crao: 1, gca: 1 });
    expect(grandRoundsClaimed(s, '2026-W48')).toBe(true);
    expect(grandRoundsClaimed(s, '2026-W49')).toBe(false);
    expect(s.recent[0]!.outcome).toBe('missed');
  });
  it('awards each milestone once', () => {
    const s = recordOutcome(INITIAL_STATS, { caseId: 'x', diagnosisId: 'crao', outcome: 'saved', sec: 40, at: 1 });
    expect(newMilestones(s).map((m) => m.id)).toEqual(['emergencies:first-save']);
    expect(newMilestones({ ...s, achievements: ['emergencies:first-save'] })).toEqual([]);
  });
  it('never uses forbidden words in milestone copy', () => {
    const s = { ...INITIAL_STATS, saved: 99, run: 9, grandRoundsTotal: 3, savedBy: { a: 1, b: 1, c: 1, d: 1, e: 1 } };
    const text = JSON.stringify(newMilestones(s, { score: score({ perfect: true }), reward: rescueReward(score({ perfect: true }), 1, 120, false) }));
    expect(text).not.toMatch(/\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i);
  });
});
