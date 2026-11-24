import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServices, memoryStorage, type EventName, type GameServices, type Grade, type ScoreBreakdown } from '@core';
import economy from './index';
import { economyFor } from './store';

function score(grade: Grade, correct = true, perfect = false): ScoreBreakdown {
  const total = { S: 1250, A: 1080, B: 900, C: 700, D: 400, F: 150 }[grade];
  return {
    total, max: 1300, grade, perfect, diagnosisCorrect: correct, urgencyCorrect: true,
    correctDiagnosisId: 'poag', chosenDiagnosisId: correct ? 'poag' : 'cataract',
    parts: [{ id: 'efficiency', label: 'Efficiency', points: 80, max: 100 }],
    essentialMissed: [], unnecessaryTests: [], keyQuestionsAsked: 1, keyQuestionsTotal: 1, skillAvg: 1, elapsedSec: 60, parSec: 120,
  };
}

function setup(seed = 'test') {
  const services = createServices({ seed, now: () => new Date(2026, 10, 24, 10).getTime() });
  const log: { e: EventName; p: any }[] = [];
  services.bus.onAny((e, p) => log.push({ e, p }));
  const uninstall = economy.install(services);
  return { services, log, uninstall, store: economyFor(services) };
}

const complete = (s: GameServices, grade: Grade, correct = true, id = 'c1') =>
  s.bus.emit('case:completed', { caseId: id, modeId: 'shift', score: score(grade, correct) });

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe('economy system', () => {
  it('pays a fee on case:completed and announces it', () => {
    const { services, log, store, uninstall } = setup();
    cleanup = uninstall;
    complete(services, 'A');
    expect(store.balance).toBeGreaterThan(0);
    const changed = log.find((l) => l.e === 'currency:changed');
    expect(changed?.p).toEqual({ balance: store.balance, delta: store.balance });
    expect(log.some((l) => l.e === 'reward:granted' && l.p.source === 'economy' && l.p.label === 'Consultation fee')).toBe(true);
    expect(store.lastCase.get()?.fee.total).toBe(store.balance);
  });

  it('awards a crate for an S grade and on momentum milestones', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    complete(services, 'S', true, 'a');
    expect(store.state.get().crates.map((c) => c.kind)).toEqual(['case']);
    complete(services, 'B', true, 'b');
    complete(services, 'B', true, 'c');
    expect(store.state.get().crates.map((c) => c.kind)).toEqual(['case', 'momentum']);
  });

  it('a wrong diagnosis resets momentum but never takes coins away', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    complete(services, 'B');
    complete(services, 'B');
    const before = store.balance;
    complete(services, 'F', false);
    expect(store.balance).toBeGreaterThanOrEqual(before);
    complete(services, 'B');
    expect(store.state.get().crates.some((c) => c.kind === 'momentum')).toBe(false);
  });

  it('handles currency:grant from other systems, ignoring junk', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    services.bus.emit('currency:grant', { amount: 50, reason: 'Daily gift' });
    services.bus.emit('currency:grant', { amount: -999, reason: 'nope' });
    services.bus.emit('currency:grant', { amount: Number.NaN, reason: 'nope' });
    expect(store.balance).toBe(50);
  });

  it('promotion crates only for real rank-ups', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    services.bus.emit('rank:changed', { level: 1, title: 'Student' });
    services.bus.emit('rank:changed', { level: 2, title: 'Intern' });
    services.bus.emit('rank:changed', { level: 2, title: 'Intern' });
    expect(store.state.get().crates.map((c) => c.kind)).toEqual(['promotion']);
  });

  it('opens crates deterministically and applies contents', () => {
    const a = setup('same');
    const b = setup('same');
    for (const x of [a, b]) {
      for (let i = 0; i < 6; i++) x.services.bus.emit('rank:changed', { level: i + 2, title: 'R' });
    }
    const resA = [...Array(6)].map(() => a.store.openCrate()!.drop);
    const resB = [...Array(6)].map(() => b.store.openCrate()!.drop);
    expect(resA).toEqual(resB);
    expect(a.store.state.get().crates).toHaveLength(0);
    expect(a.store.state.get().cratesOpened).toBe(6);
    a.uninstall();
    b.uninstall();
  });

  it('buys and equips cosmetics; refuses when short of funds', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    expect(store.buy('moonstone')).toBe('funds');
    services.bus.emit('currency:grant', { amount: 500, reason: 't' });
    expect(store.buy('moonstone')).toBe('ok');
    expect(store.buy('moonstone')).toBe('owned');
    expect(store.balance).toBe(50);
    expect(store.equip('moonstone')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('moonstone');
    expect(store.equip('aurora')).toBe(false);
    uninstall();
    cleanup = null;
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('consult notes are spent on hints and raise the fee', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    store.state.update((s) => ({ ...s, hintTokens: 1 }));
    services.bus.emit('case:started', { caseId: 'h', modeId: 'shift', emergency: false });
    services.bus.emit('hint:used', { caseId: 'h' });
    services.bus.emit('hint:used', { caseId: 'h' });
    expect(store.state.get().hintTokens).toBe(0);
    complete(services, 'A', true, 'h');
    expect(store.lastCase.get()?.coveredHints).toBe(1);
  });

  it('install is idempotent and uninstall unsubscribes everything', () => {
    const services = createServices();
    const u1 = economy.install(services);
    const u2 = economy.install(services);
    expect(services.registries.hud.all().filter((w) => w.system === 'economy').length).toBeGreaterThan(0);
    const hudCount = services.registries.hud.all().length;
    services.bus.emit('currency:grant', { amount: 10, reason: 'x' });
    expect(economyFor(services).balance).toBe(10); // not double-paid
    u1();
    u1();
    services.bus.emit('currency:grant', { amount: 10, reason: 'x' });
    expect(economyFor(services).balance).toBe(20); // still installed once
    u2();
    services.bus.emit('currency:grant', { amount: 10, reason: 'x' });
    expect(economyFor(services).balance).toBe(20);
    expect(services.registries.hud.all().length).toBe(hudCount);
  });

  it('persists across a reload of the same storage', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const s1 = createServices({ storage });
    const u = economy.install(s1);
    s1.bus.emit('currency:grant', { amount: 77, reason: 't' });
    vi.advanceTimersByTime(500);
    u();
    const s2 = createServices({ storage });
    const u2 = economy.install(s2);
    expect(economyFor(s2).balance).toBe(77);
    u2();
    vi.useRealTimers();
  });
});
