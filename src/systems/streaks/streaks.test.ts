import { describe, expect, it } from 'vitest';
import { createServices, dayKey, type GameServices, type RewardGrant, type ScoreBreakdown } from '@core';
import streaks, { isStreaksActive, streaksOf } from './index';
import { SLOT } from './state';

const DAY = 86_400_000;
const T0 = new Date(2026, 2, 2, 10).getTime();

function score(correct: boolean, over: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    total: correct ? 1200 : 300, max: 1300, grade: correct ? 'A' : 'F', perfect: false, diagnosisCorrect: correct, urgencyCorrect: correct,
    correctDiagnosisId: 'poag', chosenDiagnosisId: correct ? 'poag' : 'dry-eye', parts: [], essentialMissed: correct ? [] : ['tonometry'],
    unnecessaryTests: [], keyQuestionsAsked: 2, keyQuestionsTotal: 2, skillAvg: 0.8, elapsedSec: 100, parSec: 120, ...over,
  };
}

function setup() {
  let now = T0;
  const services = createServices({ now: () => now });
  const log = { rewards: [] as RewardGrant[], xp: [] as number[], coins: [] as number[], achievements: [] as string[], toasts: [] as string[] };
  services.bus.on('reward:granted', (r) => log.rewards.push(r));
  services.bus.on('xp:grant', (e) => log.xp.push(e.amount));
  services.bus.on('currency:grant', (e) => log.coins.push(e.amount));
  services.bus.on('achievement:unlocked', (e) => log.achievements.push(e.id));
  services.bus.on('toast', (e) => log.toasts.push(e.message));
  const off = streaks.install(services);
  const finish = (correct: boolean, modeId = 'shift', over: Partial<ScoreBreakdown> = {}) =>
    services.bus.emit('case:completed', { caseId: `c${Math.random()}`, modeId, score: score(correct, over) });
  return { services, log, off, finish, advance: (days: number) => (now += days * DAY) };
}

const ctlOf = (s: GameServices) => streaksOf(s)!;

describe('streaks system', () => {
  it('is a plugin with a neutral player-facing name', () => {
    expect(streaks.id).toBe('streaks');
    expect(streaks.name).toBe('Streaks');
  });

  it('builds the combo, pays quality-scaled XP and announces it', () => {
    const { services, log, finish } = setup();
    services.bus.emit('mode:started', { modeId: 'shift' });
    finish(true);
    expect(log.xp).toEqual([]);
    finish(true);
    finish(true);
    expect(ctlOf(services).combo.get().count).toBe(3);
    expect(log.xp.length).toBe(2);
    const combo = log.rewards.filter((r) => r.source === 'streaks' && r.label.startsWith('Combo'));
    expect(combo.map((r) => r.label)).toEqual(['Combo ×1.5 · 2 in a row', 'Combo ×2 · 3 in a row']);
  });

  it('grants one "combo saved" per run for a thorough, safely triaged miss', () => {
    const { services, log, finish } = setup();
    services.bus.emit('mode:started', { modeId: 'rush' });
    finish(true, 'rush');
    finish(true, 'rush');
    finish(false, 'rush', { urgencyCorrect: true, essentialMissed: [] });
    expect(ctlOf(services).combo.get().count).toBe(2);
    expect(log.rewards.some((r) => r.label.startsWith('Combo saved'))).toBe(true);
    finish(false, 'rush', { urgencyCorrect: true, essentialMissed: [] });
    expect(ctlOf(services).combo.get().count).toBe(0);
    // a new run re-arms the safety net
    services.bus.emit('mode:started', { modeId: 'rush' });
    expect(ctlOf(services).combo.get().graceUsed).toBe(false);
  });

  it('keeps a daily flame, pays milestones in lumens and never punishes a gap', () => {
    const { services, log, finish, advance } = setup();
    for (let d = 0; d < 7; d++) {
      finish(true);
      finish(true);
      if (d < 6) advance(1);
    }
    const st = ctlOf(services).state.get();
    expect(st.daily.current).toBe(7);
    expect(log.coins).toEqual([40, 100]);
    expect(log.achievements).toEqual(['streaks-week']);
    // two quiet days, freezes cover them automatically
    expect(st.daily.freezes).toBeGreaterThanOrEqual(2);
    advance(3);
    finish(true);
    expect(ctlOf(services).state.get().daily.current).toBe(8);
    expect(ctlOf(services).state.get().daily.frozen.length).toBe(2);
  });

  it('a broken streak can be rekindled', () => {
    const { services, finish, advance, log } = setup();
    for (let d = 0; d < 4; d++) {
      finish(true, 'shift', { grade: 'C' });
      advance(1);
    }
    advance(5);
    finish(false);
    expect(ctlOf(services).state.get().daily.current).toBe(1);
    expect(ctlOf(services).state.get().daily.mend?.lost).toBe(4);
    finish(true, 'review');
    expect(ctlOf(services).state.get().daily.current).toBe(5);
    expect(log.rewards.some((r) => r.label === 'Flame rekindled')).toBe(true);
  });

  it('tracks personal bests per mode and reports a new best run', () => {
    const { services, finish, log } = setup();
    services.bus.emit('mode:started', { modeId: 'rush' });
    finish(true, 'rush');
    services.bus.emit('mode:ended', { modeId: 'rush', casesCompleted: 1, totalScore: 1000 });
    expect(ctlOf(services).runEcho.get()).toMatchObject({ isNewBest: true, prevBest: 0 });
    services.bus.emit('mode:started', { modeId: 'rush' });
    finish(true, 'rush', { total: 1250 });
    expect(log.rewards.some((r) => r.label.startsWith('Personal best'))).toBe(true);
    services.bus.emit('mode:ended', { modeId: 'rush', casesCompleted: 1, totalScore: 1400 });
    expect(ctlOf(services).state.get().bests.rush).toMatchObject({ run: 1400, caseScore: 1250 });
    expect(log.toasts.some((t) => t.includes('New personal best'))).toBe(true);
  });

  it('persists to its own slot and survives a reload', () => {
    const { services, finish } = setup();
    finish(true);
    const raw = services.save.slot<{ daily: { lastDay: string } }>(SLOT, { daily: { lastDay: '' } }).get();
    expect(raw.daily.lastDay).toBe(dayKey(T0));
  });

  it('install is idempotent and uninstall unsubscribes everything', () => {
    const { services, off, finish } = setup();
    const off2 = streaks.install(services);
    finish(true);
    finish(true);
    expect(ctlOf(services).combo.get().count).toBe(2);
    off2();
    off();
    expect(isStreaksActive(services)).toBe(false);
    expect(streaksOf(services)).toBeNull();
    expect(() => finish(true)).not.toThrow();
    // widgets stay registered (no unregister in registries) but render nothing
    expect(services.registries.hud.has('streaks:flame')).toBe(true);
  });

  it('never shows internal design words to players', () => {
    const { log, finish, advance, services } = setup();
    services.bus.emit('mode:started', { modeId: 'shift' });
    for (let d = 0; d < 31; d++) {
      for (let i = 0; i < 6; i++) finish(i !== 3, 'shift', i === 3 ? { urgencyCorrect: true, essentialMissed: [] } : {});
      advance(d % 9 === 8 ? 4 : 1);
    }
    services.bus.emit('mode:ended', { modeId: 'shift', casesCompleted: 3, totalScore: 99999 });
    const text = [...log.rewards.map((r) => `${r.label} ${r.value}`), ...log.toasts, streaks.name].join(' ').toLowerCase();
    expect(text).not.toMatch(/\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/);
  });
});
