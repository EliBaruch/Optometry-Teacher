import { describe, expect, it } from 'vitest';
import { buildFindings, createServices, dayKey, type ClinicalCase, type GameServices, type RunSnapshot } from '@core';
import daily, { dailyCaseIds, dailyCases, dailyRecord, runDay } from './index';
import { previousDay } from './attempts';

const BANNED = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth|confess\w*|holy)\b/i;
const findings = buildFindings(40);
const mk = (id: string, difficulty: ClinicalCase['difficulty'], diagnosis = id): ClinicalCase => ({
  id, difficulty, diagnosis, tags: [], chiefComplaint: '…', history: [], findings, essentialTests: [], helpfulTests: [],
  differentials: [], urgency: 'routine', management: '', teachingPoints: [],
  patient: { name: id, age: 40, sex: 'X', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
});
const pool = Array.from({ length: 20 }, (_, i) => mk(`case-${String(i).padStart(2, '0')}`, ((i % 5) + 1) as ClinicalCase['difficulty']));
const NOV_24 = new Date(2026, 10, 24, 9).getTime();
const snap = (completed: string[] = [], failed: string[] = [], seed = `daily:${NOV_24}`): RunSnapshot =>
  ({ modeId: 'daily', completed, failed, totalScore: 0, lives: null, combo: 0, seed });
function svc(cases: readonly ClinicalCase[], now = NOV_24): GameServices {
  const s = createServices({ now: () => now });
  cases.forEach((c) => s.registries.cases.register(c));
  return s;
}

describe('daily mode', () => {
  it('has neutral copy and 3 patients', () => {
    expect(daily.rules.length).toBe(3);
    expect(`${daily.title} ${daily.tagline}`).not.toMatch(BANNED);
    expect(daily.drive).toBeUndefined(); // no internal design labels ship to the client
  });

  it('is the same for everyone on the same day, whatever the registry order', () => {
    const a = dailyCaseIds(svc(pool));
    const b = dailyCaseIds(svc([...pool].reverse(), NOV_24 + 3 * 3600_000));
    expect(a).toHaveLength(3);
    expect(a).toEqual(b);
  });

  it('changes from day to day', () => {
    const days = Array.from({ length: 7 }, (_, d) => dailyCaseIds(svc(pool, NOV_24 + d * 86_400_000)).join());
    expect(new Set(days).size).toBeGreaterThan(4);
  });

  it('serves a warm-up, a middle and a stretch with distinct diagnoses, easiest first', () => {
    const list = dailyCases(pool, '2026-11-24');
    const d = list.map((c) => c.difficulty);
    expect(d[0]!).toBeLessThanOrEqual(2);
    expect(d[2]!).toBeGreaterThanOrEqual(3);
    expect([...d].sort()).toEqual(d);
    expect(new Set(list.map((c) => c.diagnosis)).size).toBe(3);
  });

  it('pickNext returns the day’s cases in order, then null', () => {
    const s = svc(pool);
    const ids = dailyCaseIds(s);
    expect(daily.pickNext(s, snap())?.id).toBe(ids[0]);
    expect(daily.pickNext(s, snap([ids[0]!]))?.id).toBe(ids[1]);
    expect(daily.pickNext(s, snap([ids[0]!], [ids[1]!]))?.id).toBe(ids[2]);
    expect(daily.pickNext(s, snap([ids[0]!, ids[2]!], [ids[1]!]))).toBeNull();
  });

  it('keeps the round’s patients when it straddles midnight', () => {
    const s = svc(pool, NOV_24 + 86_400_000);
    expect(runDay(s, { seed: `daily:${NOV_24}` })).toBe(dayKey(NOV_24));
    expect(runDay(s, { seed: '2026-01-02' })).toBe('2026-01-02');
    expect(runDay(s, { seed: 'whatever' })).toBe(dayKey(NOV_24 + 86_400_000));
    expect(daily.pickNext(s, snap())?.id).toBe(dailyCaseIds(svc(pool))[0]);
  });

  it('copes with tiny and empty pools', () => {
    const tiny = [mk('a', 1, 'x'), mk('b', 4, 'x')];
    expect(dailyCases(tiny, '2026-11-24').map((c) => c.id).sort()).toEqual(['a', 'b']);
    const s = svc(tiny);
    expect(daily.pickNext(s, snap(['a', 'b']))).toBeNull();
    expect(daily.pickNext(svc([]), snap())).toBeNull();
    expect(daily.locked!(svc([]))).toBeTruthy();
    expect(daily.locked!(s)).toBeUndefined();
  });

  it('locks after one scored round per day, tracks the best score and a daily streak', () => {
    let now = NOV_24;
    const s = createServices({ now: () => now });
    pool.forEach((c) => s.registries.cases.register(c));
    s.registries.modes.register(daily);
    const playRound = (score: number) => {
      expect(daily.locked!(s)).toBeUndefined();
      s.run.start(daily, `daily:${now}`);
      for (let k = s.run.next(); k; k = s.run.next()) {
        s.bus.emit('case:completed', { caseId: k.id, modeId: 'daily', score: {} as never });
        s.run.report(k.id, { diagnosisCorrect: true, total: score / 3 } as never);
      }
      s.run.end();
    };

    playRound(900);
    const reason = daily.locked!(s)!;
    expect(reason).toMatch(/done/);
    expect(reason).toMatch(/midnight/);
    expect(reason).not.toMatch(BANNED);
    expect(dailyRecord(s)).toMatchObject({ doneToday: true, bestToday: 900, streak: 1 });

    now += 86_400_000; // next day: open again, streak continues
    expect(dailyRecord(s)).toMatchObject({ doneToday: false, bestToday: 0, streak: 1 });
    playRound(600);
    expect(dailyRecord(s).streak).toBe(2);
    expect(daily.locked!(s)).toMatch(/2 days running/);

    now += 3 * 86_400_000; // skipped days: streak lapses
    expect(dailyRecord(s).streak).toBe(0);
  });

  it('does not lock for a round abandoned before any patient, or for other modes', () => {
    const s = svc(pool);
    s.run.start(daily, `daily:${NOV_24}`);
    daily.locked!(s);
    s.run.end();
    s.bus.emit('case:completed', { caseId: 'x', modeId: 'shift', score: {} as never });
    s.bus.emit('mode:ended', { modeId: 'shift', casesCompleted: 1, totalScore: 10 });
    expect(daily.locked!(s)).toBeUndefined();
  });

  it('steps day keys back across month and year ends', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
});
