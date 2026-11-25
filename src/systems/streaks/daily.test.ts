import { describe, expect, it } from 'vitest';
import {
  FREEZE_EVERY, FREEZE_MAX, INITIAL_DAILY, earnFreeze, milestoneAt, nextMilestone, progressMend, sanitizeDaily, touchDay, viewDaily,
  type DailyState,
} from './daily';
import { addDays, calendarWeeks, daysBetween, weekdayMon } from './days';

const D0 = '2026-03-02'; // a Monday
const play = (d: DailyState, day: string) => touchDay(d, day).daily;
function streakOf(n: number): DailyState {
  let d = INITIAL_DAILY;
  for (let i = 0; i < n; i++) d = play(d, addDays(D0, i));
  return d;
}

describe('day maths', () => {
  it('handles month ends and DST weekends', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekdayMon(D0)).toBe(0);
  });
  it('builds a Monday-first calendar ending this week', () => {
    const weeks = calendarWeeks('2026-03-12', 5);
    expect(weeks).toHaveLength(5);
    expect(weeks[4]).toContain('2026-03-12');
    expect(weekdayMon(weeks[0][0])).toBe(0);
  });
});

describe('touchDay', () => {
  it('starts, continues and ignores repeat plays on the same day', () => {
    const a = touchDay(INITIAL_DAILY, D0);
    expect(a.outcome).toBe('started');
    expect(a.daily.current).toBe(1);
    const b = touchDay(a.daily, D0);
    expect(b.outcome).toBe('same');
    expect(b.daily.current).toBe(1);
    expect(b.daily.today.cases).toBe(2);
    const c = touchDay(b.daily, addDays(D0, 1));
    expect(c.outcome).toBe('continued');
    expect(c.daily.current).toBe(2);
    expect(c.daily.today.cases).toBe(1);
  });

  it('auto-uses banked freezes for missed days', () => {
    const d = { ...streakOf(4), freezes: 2 };
    const r = touchDay(d, addDays(D0, 3 + 3)); // missed two days
    expect(r.outcome).toBe('frozen');
    expect(r.usedFreezes).toBe(2);
    expect(r.daily.freezes).toBe(0);
    expect(r.daily.current).toBe(5);
    expect(r.daily.frozen).toEqual([addDays(D0, 4), addDays(D0, 5)]);
  });

  it('breaks gently: day 1 again, best kept, a rekindle offered', () => {
    const d = streakOf(6);
    const r = touchDay(d, addDays(D0, 10));
    expect(r.outcome).toBe('broken');
    expect(r.lostStreak).toBe(6);
    expect(r.daily.current).toBe(1);
    expect(r.daily.best).toBe(6);
    expect(r.daily.mend).toMatchObject({ lost: 6, deadline: addDays(D0, 11), progress: 0 });
  });

  it('pays milestones once per streak, with a freeze at 7 days', () => {
    let d = INITIAL_DAILY;
    const paid: number[] = [];
    for (let i = 0; i < 31; i++) {
      const r = touchDay(d, addDays(D0, i));
      d = r.daily;
      paid.push(...r.milestones.map((m) => m.days));
    }
    expect(paid).toEqual([3, 7, 14, 30]);
    expect(d.freezes).toBe(FREEZE_MAX);
  });

  it('keeps going beyond 30 days', () => {
    expect(milestoneAt(60)?.days).toBe(60);
    expect(milestoneAt(45)).toBeNull();
    expect(nextMilestone(30).days).toBe(60);
    expect(nextMilestone(5).days).toBe(7);
  });
});

describe('rekindle', () => {
  it('restores the lost streak after two correct diagnoses before the deadline', () => {
    const broken = touchDay(streakOf(9), addDays(D0, 12)).daily;
    const day = addDays(D0, 12);
    const one = progressMend(broken, day, true, false);
    expect(one.mended).toBe(false);
    const two = progressMend(one.daily, day, true, false);
    expect(two.mended).toBe(true);
    expect(two.daily.current).toBe(10);
    expect(two.daily.mend).toBeNull();
    // 3 and 7 were already paid in the original streak
    expect(two.milestones.map((m) => m.days)).toEqual([]);
  });
  it('a review case counts double; wrong calls do not count; expired offers lapse', () => {
    const broken = touchDay(streakOf(5), addDays(D0, 9)).daily;
    expect(progressMend(broken, addDays(D0, 9), false, true).daily.mend?.progress).toBe(0);
    expect(progressMend(broken, addDays(D0, 9), true, true).mended).toBe(true);
    expect(progressMend(broken, addDays(D0, 11), true, true).daily.mend).toBeNull();
  });
});

describe('freezes', () => {
  it('banks one per five solid cases, capped', () => {
    let d = INITIAL_DAILY;
    let earned = 0;
    for (let i = 0; i < FREEZE_EVERY * 4; i++) {
      const r = earnFreeze(d, true);
      d = r.daily;
      if (r.earned) earned++;
    }
    expect(earned).toBe(FREEZE_MAX);
    expect(earnFreeze(INITIAL_DAILY, false).daily).toBe(INITIAL_DAILY);
  });
});

describe('viewDaily', () => {
  it('describes the flame without ever going negative', () => {
    expect(viewDaily(INITIAL_DAILY, D0).status).toBe('new');
    const d = streakOf(3);
    const last = addDays(D0, 2);
    expect(viewDaily(d, last)).toMatchObject({ status: 'lit', streak: 3 });
    expect(viewDaily(d, addDays(last, 1))).toMatchObject({ status: 'waiting', streak: 3 });
    expect(viewDaily({ ...d, freezes: 1 }, addDays(last, 2))).toMatchObject({ status: 'protected', pendingFrozen: [addDays(last, 1)] });
    expect(viewDaily(d, addDays(last, 2))).toMatchObject({ status: 'resting', streak: 0, resting: 3 });
  });
});

describe('sanitizeDaily', () => {
  it('repairs corrupt saves', () => {
    const s = sanitizeDaily({ current: -4, best: 'x', played: ['nope', D0], freezes: 99, mend: { deadline: 5 } });
    expect(s.current).toBe(0);
    expect(s.played).toEqual([D0]);
    expect(s.freezes).toBe(FREEZE_MAX);
    expect(s.mend).toBeNull();
    expect(sanitizeDaily(null)).toEqual(INITIAL_DAILY);
  });
});
