import { describe, expect, it } from 'vitest';
import { buildWings, byOrder, clockAngles, greetingFor, rulesSummary } from './logic';

describe('hub logic', () => {
  it('summarises rules', () => {
    expect(rulesSummary({ length: 5 })).toEqual(['5 patients']);
    expect(rulesSummary({ length: 1 })).toEqual(['1 patient']);
    expect(rulesSummary({ length: 'endless', lives: 3, timeLimitSec: 90, scoreMultiplier: 1.5, hints: false }))
      .toEqual(['Endless', '3 lives', '90 s each', '×1.5 score', 'No hints']);
  });
  it('sorts by order then id', () => {
    expect(byOrder([{ id: 'b', order: 1 }, { id: 'a', order: 1 }, { id: 'c', order: 0 }]).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('greets by hour', () => {
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(20)).toBe('Good evening');
  });
  it('clock angles', () => {
    const a = clockAngles(new Date(2020, 0, 1, 3, 0, 30));
    expect(a.second).toBe(180);
    expect(a.hour).toBeCloseTo(90.25);
  });
  it('builds wings, hiding missing scenes and adding core tiles', () => {
    const w = buildWings(
      [{ id: 'x', title: 'X', subtitle: '', icon: 'star', accent: '#fff', order: 1, sceneId: 'career' }, { id: 'y', title: 'Y', subtitle: '', icon: 'star', accent: '#fff', order: 0, sceneId: 'nope' }],
      (id) => id === 'career' || id === 'codex',
      { badge: () => 'NEW', locked: () => undefined },
    );
    expect(w.map((t) => t.key)).toEqual(['x', 'core-codex']);
    expect(w[0]!.badge).toBe('NEW');
  });
});

import { pickSitters, splitModes } from './logic';
describe('hub logic 2', () => {
  it('splits locked from playable modes', () => {
    const r = splitModes([{ id: 'b', order: 2 }, { id: 'a', order: 1 }], (m) => (m.id === 'b' ? 'later' : undefined));
    expect(r.playable.map((m) => m.id)).toEqual(['a']);
    expect(r.soon[0]).toMatchObject({ reason: 'later' });
  });
  it('picks distinct sitters', () => {
    const s = pickSitters(12345, 3);
    expect(new Set(s.map((x) => x.seed)).size).toBe(3);
  });
});
