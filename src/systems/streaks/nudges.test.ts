import { describe, expect, it } from 'vitest';
import { freshCombo } from './combo';
import { INITIAL_DAILY, viewDaily, type DailyState } from './daily';
import { nudges, type NudgeInput } from './nudges';

const today = '2026-03-10';
const daily: DailyState = { ...INITIAL_DAILY, current: 6, best: 6, lastDay: today, played: [today], today: { day: today, cases: 3 } };
const base = (over: Partial<NudgeInput> = {}): NudgeInput => ({
  combo: { ...freshCombo('rush'), count: 4, best: 4 }, outcome: 'built', prevCount: 3, runActive: true, runTotal: 4000, runBest: 4120,
  modeTitle: 'Rush Hour', caseScore: 1100, prevCaseBest: 1300, daily, view: viewDaily(daily, today), ...over,
});

describe('nudges', () => {
  it('offers "one more" for the next combo tier and the near-miss on your best run', () => {
    const list = nudges(base(), 5);
    expect(list[0]).toMatchObject({ id: 'combo-next', lead: 'One more' });
    expect(list[0].text).toContain('×3');
    expect(list.find((n) => n.id === 'pace')).toMatchObject({ lead: '120 points', text: 'from your best Rush Hour' });
  });
  it('celebrates passing your best and ignores far-off bests', () => {
    expect(nudges(base({ runTotal: 5000 }), 5).find((n) => n.id === 'pace')?.text).toBe('past your best Rush Hour');
    expect(nudges(base({ runTotal: 500, runBest: 9000 }), 5).find((n) => n.id === 'pace')).toBeUndefined();
  });
  it('mentions a banked combo kindly after a reset', () => {
    const list = nudges(base({ combo: { ...freshCombo('rush'), count: 0, best: 4 }, outcome: 'reset', prevCount: 4 }));
    expect(list[0]).toMatchObject({ id: 'combo-banked', lead: '4 in a row' });
  });
  it('switches to a stopping cue after a long day', () => {
    const tired = { ...daily, today: { day: today, cases: 14 } };
    const list = nudges(base({ daily: tired, view: viewDaily(tired, today) }));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('pause');
  });
  it('flags the next milestone and freeze progress', () => {
    const d = { ...daily, freezeProgress: 4 };
    const ids = nudges(base({ daily: d, view: viewDaily(d, today), runActive: false, combo: freshCombo('rush'), caseScore: null }), 5).map((n) => n.id);
    expect(ids).toContain('freeze');
    expect(ids).toContain('milestone');
  });
});
