import { describe, expect, it } from 'vitest';
import { VoiceLimiter, type VoiceHandle } from './voices';

const voice = (id: string, start: number, end: number, log: string[] = []): VoiceHandle => ({
  id, start, end, stop: () => log.push(`${id}@${start}`),
});

describe('VoiceLimiter', () => {
  it('enforces per-id cooldowns', () => {
    const l = new VoiceLimiter();
    const rule = { max: 4, cooldown: 0.05 };
    expect(l.admit('hover', 0, rule)).toEqual([]);
    expect(l.admit('hover', 0.02, rule)).toBeNull();
    expect(l.admit('hover', 0.06, rule)).toEqual([]);
    // Other ids are unaffected.
    expect(l.admit('click', 0.061, rule)).toEqual([]);
  });

  it('steals the oldest instance when an id is at its polyphony limit', () => {
    const l = new VoiceLimiter();
    const rule = { max: 2, cooldown: 0 };
    l.admit('coin', 0, rule); const a = voice('coin', 0, 5); l.register(a);
    l.admit('coin', 0.1, rule); const b = voice('coin', 0.1, 5); l.register(b);
    const steal = l.admit('coin', 0.2, rule);
    expect(steal).toEqual([a]);
    l.register(voice('coin', 0.2, 5));
    expect(l.count('coin', 0.3)).toBe(2);
  });

  it('forgets finished voices', () => {
    const l = new VoiceLimiter();
    l.register(voice('pop', 0, 0.5));
    expect(l.count('pop', 0.4)).toBe(1);
    expect(l.count('pop', 0.6)).toBe(0);
    expect(l.admit('pop', 0.6, { max: 1, cooldown: 0 })).toEqual([]);
  });

  it('respects a global voice budget', () => {
    const l = new VoiceLimiter(3);
    const a = voice('a', 0, 9); const b = voice('b', 1, 9); const c = voice('c', 2, 9);
    for (const v of [a, b, c]) { l.admit(v.id, v.start, { max: 4, cooldown: 0 }); l.register(v); }
    expect(l.admit('d', 3, { max: 4, cooldown: 0 })).toEqual([a]);
  });
});
