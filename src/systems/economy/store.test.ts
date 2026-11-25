import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServices, memoryStorage, type EventName, type GameServices, type Grade, type ScoreBreakdown } from '@core';
import economy from './index';
import { DAILY_FULL_RATE, DAILY_PRACTICE_CAP, MAX_UNOPENED } from './catalog';
import { activeEconomy, economyFor } from './store';

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

  it('peeking a crate changes nothing on display until the reveal commits it', () => {
    const { services, store, uninstall } = setup('pulse');
    cleanup = uninstall;
    const pulses: number[] = [];
    const changes: number[] = [];
    store.gain.subscribe((g) => g && pulses.push(g.delta));
    services.bus.on('currency:changed', (e) => changes.push(e.delta));
    let paid = 0;
    for (let i = 0; i < 12 && !paid; i++) {
      services.bus.emit('rank:changed', { level: i + 2, title: 'R' });
      const snapshot = store.state.get();
      const peek = store.peekCrate()!;
      // The theatre is shaking: wallet, shelf, receipt and pity are all untouched.
      expect(store.state.get()).toBe(snapshot);
      expect(store.balance).toBe(snapshot.balance);
      expect(store.state.get().crates.some((c) => c.id === peek.crate.id)).toBe(true);
      expect(changes).toEqual([]);
      // Reveal: the committed drop is exactly what was peeked.
      const res = store.openCrate(peek.crate.id, { deferPulse: true })!;
      expect(res.drop).toEqual(peek.drop);
      if (res.drop.content.type === 'coins') {
        paid = res.drop.content.amount;
        expect(store.balance).toBe(snapshot.balance + paid);
        expect(changes).toEqual([paid]);
      }
    }
    expect(paid).toBeGreaterThan(0);
    expect(pulses).toEqual([]); // deferPulse: the theatre fires the celebration itself
    store.pulse(paid, 'Promotion crate');
    expect(pulses).toEqual([paid]);
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
    const registrations: number[] = [];
    const offs = [services.registries.hud, services.registries.hub, services.registries.scenes].map((r) => r.onChange(() => registrations.push(1)));
    const u2 = economy.install(services);
    expect(registrations).toEqual([]); // second install registers nothing again
    expect(services.registries.hud.all().filter((w) => w.system === 'economy').map((w) => w.id).sort()).toEqual(
      ['economy:receipt', 'economy:wallet', 'economy:wardrobe'],
    );
    services.bus.emit('currency:grant', { amount: 10, reason: 'x' });
    expect(economyFor(services).balance).toBe(10); // not double-paid
    u1();
    u1();
    services.bus.emit('currency:grant', { amount: 10, reason: 'x' });
    expect(economyFor(services).balance).toBe(20); // still installed once
    u2();
    services.bus.emit('currency:grant', { amount: 10, reason: 'x' });
    expect(economyFor(services).balance).toBe(20);
    expect(activeEconomy(services)).toBeNull(); // widgets render nothing now
    offs.forEach((off) => off());
  });

  it('theme preview shows a theme and restores the equipped one', () => {
    const { store, uninstall } = setup();
    cleanup = uninstall;
    const root = document.documentElement;
    store.preview('aurora');
    expect(root.getAttribute('data-theme')).toBe('aurora');
    expect(store.state.get().equipped.theme).toBe('candlelight'); // preview never equips
    store.preview(null);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('caps practice pay per day through the bus', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    const practice = () =>
      services.bus.emit('practice:completed', { testId: 'tonometry', result: { testId: 'tonometry', accuracy: 1, timeMs: 5000, findings: [] } });
    for (let i = 0; i < 40; i++) practice();
    expect(store.balance).toBe(DAILY_PRACTICE_CAP);
    expect(store.state.get().day.practiceCoins).toBe(DAILY_PRACTICE_CAP);
  });

  it('A grades sometimes earn a lucky crate (seeded), B grades never do', () => {
    let lucky = 0;
    for (let i = 0; i < 30; i++) {
      const { services, store, uninstall } = setup(`lucky-${i}`);
      complete(services, 'A', true, 'a');
      lucky += store.state.get().crates.filter((c) => c.kind === 'case').length;
      complete(services, 'B', false, 'b');
      expect(store.state.get().crates.filter((c) => c.kind === 'case').length).toBeLessThanOrEqual(1);
      uninstall();
    }
    expect(lucky).toBeGreaterThan(0);
    expect(lucky).toBeLessThan(15); // ~20%, never every time
  });

  it('pays lumens instead of a crate when storage is full', () => {
    const { store, uninstall } = setup();
    cleanup = uninstall;
    for (let i = 0; i < MAX_UNOPENED; i++) expect(store.earnCrate('case', 'x')).not.toBeNull();
    const before = store.balance;
    expect(store.earnCrate('case', 'overflow')).toBeNull();
    expect(store.state.get().crates).toHaveLength(MAX_UNOPENED);
    expect(store.balance).toBeGreaterThan(before);
  });

  it('halves fees past the daily full rate, and shows it on the receipt', () => {
    const { services, store, uninstall } = setup();
    cleanup = uninstall;
    store.state.update((s) => ({ ...s, day: { key: '2026-11-24', caseCoins: DAILY_FULL_RATE, practiceCoins: 0 } }));
    complete(services, 'A', true, 'late');
    const fee = store.lastCase.get()!.fee;
    expect(fee.lines.some((l) => l.id === 'late')).toBe(true);
    const full = fee.lines.filter((l) => l.id !== 'late').reduce((a, l) => a + l.amount, 0);
    expect(fee.total).toBe(full - Math.floor(full / 2));
    expect(store.balance).toBe(fee.total);
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
