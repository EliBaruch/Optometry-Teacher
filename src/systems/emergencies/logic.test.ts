import { describe, expect, it } from 'vitest';
import { buildFindings, scoreCase, type ClinicalCase, type MiniGameResult, type ScoreBreakdown, type TestId } from '@core';
import {
  INITIAL_STATS, averageSaveSec, classify, clip, clockColor, clockPhase, confirmLine, formatClock, formatDuration, formatRotation,
  grandRoundsBonus, grandRoundsCase, grandRoundsClaimed, grandRoundsPool, heartbeatBpm, heartbeatIntervalMs, migrateStats,
  msUntilNextWeek, newMilestones, patientSafe, priorSavesThisWeek, recordOutcome, remainingSec, rescueReward, teachingMessage,
  weekKey, weekStart, workupMastery,
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
    expect(clockColor(120, 120)).toBe('#2257f0');
    expect(clockColor(30, 120)).toBe('#e11d48');
    expect(clockColor(5, 120)).toBe('#e11d48');
  });
});

describe('outcomes', () => {
  it('classifies by both diagnosis and the direction of the triage error', () => {
    expect(classify(score(), 'emergency', 'emergency')).toBe('saved');
    // Microbial keratitis is 'urgent': an emergency referral is safe, just over-cautious.
    expect(classify(score({ urgencyCorrect: false }), 'emergency', 'urgent')).toBe('over-triaged');
    expect(classify(score({ urgencyCorrect: false }), 'soon', 'emergency')).toBe('under-triaged');
    // Wrong diagnosis but the right (or faster) referral: the patient was still sent on in time.
    expect(classify(score({ diagnosisCorrect: false }), 'emergency', 'emergency')).toBe('referred');
    expect(classify(score({ diagnosisCorrect: false, urgencyCorrect: false }), 'emergency', 'urgent')).toBe('referred');
    expect(classify(score({ diagnosisCorrect: false, urgencyCorrect: false }), 'routine', 'emergency')).toBe('missed');
  });
  it('falls back to right/wrong (assuming the unsafe direction) without the chosen urgency', () => {
    expect(classify(score())).toBe('saved');
    expect(classify(score({ urgencyCorrect: false }))).toBe('under-triaged');
    expect(classify(score({ diagnosisCorrect: false }))).toBe('referred');
    expect(classify(score({ diagnosisCorrect: false, urgencyCorrect: false }))).toBe('missed');
  });
  it('knows which outcomes kept the patient safe', () => {
    expect(['saved', 'over-triaged', 'referred'].every((o) => patientSafe(o as never))).toBe(true);
    expect(['under-triaged', 'missed', 'timeout'].some((o) => patientSafe(o as never))).toBe(false);
  });
});

describe('rewards follow learning, not luck or time', () => {
  const emergencyCase: ClinicalCase = {
    ...kase('crao-x', 120), urgency: 'emergency', essentialTests: ['visual-acuity', 'pupils', 'ophthalmoscopy'], helpfulTests: ['amsler'],
    history: [
      { id: 'onset', category: 'symptoms', q: 'When?', a: 'Sudden', relevance: 'key' },
      { id: 'pain', category: 'symptoms', q: 'Pain?', a: 'None', relevance: 'key' },
      { id: 'jaw', category: 'symptoms', q: 'Jaw pain?', a: 'No', relevance: 'key' },
    ],
  };
  const test = (testId: TestId, accuracy = 0.9): MiniGameResult => ({ testId, accuracy, timeMs: 8000, findings: [] });
  const blind = scoreCase({ kase: emergencyCase, diagnosisId: 'crao', urgency: 'emergency', testsDone: {}, askedQuestions: [], elapsedSec: 1, hintsUsed: 0 });
  const full = scoreCase({
    kase: emergencyCase, diagnosisId: 'crao', urgency: 'emergency',
    testsDone: { 'visual-acuity': test('visual-acuity'), pupils: test('pupils'), ophthalmoscopy: test('ophthalmoscopy') },
    askedQuestions: ['onset', 'pain', 'jaw'], elapsedSec: 60, hintsUsed: 0,
  });

  it('measures work-up mastery from tests, history and technique only', () => {
    expect(blind.total / blind.max).toBeGreaterThan(0.65); // core grade still looks decent…
    expect(workupMastery(blind)).toBe(0); // …but nothing was proven
    expect(workupMastery(full)).toBeGreaterThan(0.9);
  });

  it('a no-work-up instant save earns clearly less than a complete work-up', () => {
    const guess = rescueReward(blind, 1, 120, false);
    const proper = rescueReward(full, 60, 120, false);
    expect(guess.thin).toBe(true);
    expect(guess.rarity).toBe('common');
    expect(guess.decisive).toBe(0); // speed bonus locked without a work-up
    expect(proper.coins).toBeGreaterThanOrEqual(guess.coins * 4);
    expect(proper.xp).toBeGreaterThanOrEqual(guess.xp * 3);
    expect(proper.thin).toBe(false);
    expect(['epic', 'legendary']).toContain(proper.rarity);
  });

  it('rewards decisiveness only on top of a thorough work-up, never time spent', () => {
    const fast = rescueReward(full, 20, 120, false);
    const slow = rescueReward(full, 110, 120, false);
    expect(fast.coins).toBeGreaterThan(slow.coins);
    expect(rescueReward(blind, 1, 120, false).coins).toBe(rescueReward(blind, 100, 120, false).coins);
  });

  it('halves the bonus for each repeat save of the same case in a week', () => {
    const first = rescueReward(full, 60, 120, false, 0);
    const second = rescueReward(full, 60, 120, false, 1);
    const third = rescueReward(full, 60, 120, false, 2);
    expect(second.coins).toBe(Math.round(first.coins / 2));
    expect(third.coins).toBeLessThanOrEqual(Math.ceil(first.coins / 4));
  });

  it('scales the Grand Rounds bonus with mastery', () => {
    expect(rescueReward(full, 10, 120, true).grandCoins).toBeGreaterThan(rescueReward(blind, 10, 120, true).grandCoins);
    expect(grandRoundsBonus(1)).toEqual({ coins: 150, xp: 250 });
    expect(grandRoundsBonus(0)).toEqual({ coins: 38, xp: 63 });
    expect(rescueReward(full, 10, 120, false).grandCoins).toBe(0);
  });

  it('keeps a legendary finale for a perfect case', () => {
    expect(rescueReward({ ...full, perfect: true }, 10, 120, false).rarity).toBe('legendary');
  });
});

describe('teaching copy', () => {
  it('writes sober, outcome-specific lines', () => {
    expect(teachingMessage('under-triaged', { dxName: 'Central retinal artery occlusion', urgency: 'emergency', flag: 'Sudden painless loss' })).toBe(
      'Right call on Central retinal artery occlusion — but it needs a same-hour emergency referral. Red flag to remember: Sudden painless loss',
    );
    expect(teachingMessage('over-triaged', { dxName: 'Microbial keratitis', urgency: 'urgent' })).toBe(
      'Safe and correct on Microbial keratitis, if over-cautious — same-day review is enough.',
    );
    expect(teachingMessage('referred', { dxName: 'GCA', urgency: 'emergency', chosenDxName: 'NAION', flag: 'Jaw claudication' })).toBe(
      'You sent them on in time — but this was GCA, not NAION. Red flag to remember: Jaw claudication',
    );
    expect(teachingMessage('missed', { dxName: 'GCA', urgency: 'emergency' })).toBe('This was GCA, and it needs a same-hour emergency referral.');
    expect(teachingMessage('timeout', { dxName: 'retinal detachment', urgency: 'urgent', flag: 'New shower of floaters with a curtain' })).toBe(
      'The clock ran out on this retinal detachment case — it needs to be seen the same day. Red flag to remember: New shower of floaters with a curtain',
    );
    expect(confirmLine(['Pupils', 'Ophthalmoscopy'])).toBe('Right call — next time confirm it with Pupils and Ophthalmoscopy.');
    expect(clip('a'.repeat(40) + '. ' + 'b'.repeat(200), 150).endsWith('…')).toBe(true);
  });
});

describe('weeks & Grand Rounds', () => {
  const mon = Date.UTC(2026, 10, 23); // Monday 23 Nov 2026, 00:00 UTC
  it('keys weeks the ISO way', () => {
    expect(weekKey(mon)).toBe('2026-W48');
    expect(weekKey(mon + 6 * 86400000 + 3600000)).toBe('2026-W48'); // Sunday
    expect(weekKey(mon + 7 * 86400000)).toBe('2026-W49');
    expect(weekKey(Date.UTC(2027, 0, 1))).toBe('2026-W53');
    expect(weekKey(mon - 1)).toBe('2026-W47'); // rotation is at Monday 00:00 UTC for everyone
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
  it('counts each outcome in its own column; over-cautious calls hold the run', () => {
    let s = recordOutcome(INITIAL_STATS, { caseId: 'a', diagnosisId: 'crao', outcome: 'saved', sec: 30, at: 1 });
    s = recordOutcome(s, { caseId: 'b', diagnosisId: 'mk', outcome: 'over-triaged', sec: 30, at: 2 });
    expect(s.run).toBe(1);
    s = recordOutcome(s, { caseId: 'c', diagnosisId: 'gca', outcome: 'referred', sec: 30, at: 3 });
    expect(s).toMatchObject({ saved: 1, overTriaged: 1, referred: 1, underTriaged: 0, missed: 0, run: 0, attempts: 3 });
  });
  it('tracks repeat saves per case within the week only', () => {
    const w = '2026-W48';
    let s = recordOutcome(INITIAL_STATS, { caseId: 'a', diagnosisId: 'crao', outcome: 'saved', sec: 30, at: 1, week: w });
    s = recordOutcome(s, { caseId: 'a', diagnosisId: 'crao', outcome: 'saved', sec: 30, at: 2, week: w });
    expect(priorSavesThisWeek(s, 'a', w)).toBe(2);
    expect(priorSavesThisWeek(s, 'b', w)).toBe(0);
    expect(priorSavesThisWeek(s, 'a', '2026-W49')).toBe(0);
    s = recordOutcome(s, { caseId: 'a', diagnosisId: 'crao', outcome: 'saved', sec: 30, at: 3, week: '2026-W49' });
    expect(priorSavesThisWeek(s, 'a', '2026-W49')).toBe(1);
  });
  it('migrates a v1 save without losing progress', () => {
    const v1 = { attempts: 4, saved: 3, underTriaged: 1, missed: 0, timeouts: 0, savedBy: { crao: 3 }, achievements: ['emergencies:first-save'], recent: [] };
    const m = migrateStats(v1);
    expect(m).toMatchObject({ attempts: 4, saved: 3, overTriaged: 0, referred: 0, savedBy: { crao: 3 } });
    expect(m.weekSaves).toEqual({ week: '', byCase: {} });
    expect(migrateStats(null)).toEqual(INITIAL_STATS);
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
