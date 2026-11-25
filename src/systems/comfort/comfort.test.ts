import { describe, expect, it } from 'vitest';
import {
  createServices, dayKey, memoryStorage, type Diagnosis, type GameEvents, type GameServices, type ModeModule,
  type ScoreBreakdown, type StorageAdapter,
} from '@core';
import comfort, { comfortOf } from './index';
import { pearlsFor } from './pearls';
import { SLOT } from './logic';

const H = 3_600_000;

function setup(opts: { now?: number; storage?: StorageAdapter } = {}) {
  let now = opts.now ?? new Date(2026, 10, 24, 20, 0, 0).getTime();
  const services = createServices({ now: () => now, storage: opts.storage });
  const events: { name: keyof GameEvents; payload: unknown }[] = [];
  services.bus.onAny((name, payload) => events.push({ name, payload }));
  return { services, events, tick: (ms: number) => (now += ms), at: () => now };
}

function score(total: number, max = 1300): ScoreBreakdown {
  return {
    total, max, grade: 'A', perfect: false, diagnosisCorrect: true, urgencyCorrect: true, correctDiagnosisId: 'x', chosenDiagnosisId: 'x',
    parts: [], essentialMissed: [], unnecessaryTests: [], keyQuestionsAsked: 0, keyQuestionsTotal: 0, skillAvg: 1, elapsedSec: 60, parSec: 90,
  };
}

function mode(id: string, order: number, locked?: () => string | undefined): ModeModule {
  return {
    id, title: id.toUpperCase(), tagline: '', icon: '', accent: '#fff', order, rules: { length: 1 },
    pickNext: () => null, locked: locked ? () => locked() : undefined,
  };
}

describe('Lounge system install', () => {
  it('registers its banner, scene and hub tile with neutral names', () => {
    const { services } = setup();
    const off = comfort.install(services);
    expect(comfort.id).toBe('comfort');
    expect(comfort.name).toBe('Lounge');
    expect(services.registries.scenes.has('lounge')).toBe(true);
    expect(services.registries.hub.get('lounge')?.title).toBe('Lounge');
    expect(services.registries.hud.all().some((w) => w.slot === 'hub-banner' && w.system === 'comfort')).toBe(true);
    off();
  });

  it('is idempotent and fully detaches on uninstall', () => {
    const { services } = setup();
    const off1 = comfort.install(services);
    const off2 = comfort.install(services);
    off2();
    expect(comfortOf(services)).not.toBeNull();
    off1();
    expect(comfortOf(services)).toBeNull();
    // after uninstall, case events no longer change state
    const st = services.save.slot<{ recent: number[] }>(SLOT, { recent: [] });
    const before = st.get().recent.length;
    services.bus.emit('case:completed', { caseId: 'c', modeId: 'shift', score: score(1300) });
    expect(st.get().recent.length).toBe(before);
  });

  it('learns team skill from completed cases', () => {
    const { services } = setup();
    const off = comfort.install(services);
    services.bus.emit('case:completed', { caseId: 'c', modeId: 'shift', score: score(1300) });
    services.bus.emit('case:completed', { caseId: 'c', modeId: 'shift', score: score(650) });
    expect(comfortOf(services)!.state.get().recent).toEqual([1, 0.5]);
    off();
  });

  it('pays the daily gift through currency:grant and announces it', () => {
    const { services, events, tick } = setup();
    const off = comfort.install(services);
    const ctl = comfortOf(services)!;
    const r = ctl.openGift();
    expect(r?.coins).toBe(20);
    expect(ctl.openGift()).toBeNull();
    expect(events.filter((e) => e.name === 'currency:grant').map((e) => (e.payload as { amount: number }).amount)).toEqual([20]);
    const reward = events.find((e) => e.name === 'reward:granted')!.payload as { source: string; label: string };
    expect(reward.source).toBe('comfort');
    tick(24 * H);
    expect(ctl.openGift()?.day.day).toBe(2);
    off();
  });

  it('marks completed calendars with one stable, tiered milestone each', () => {
    const { services, events, tick } = setup();
    const off = comfort.install(services);
    const ctl = comfortOf(services)!;
    for (let d = 0; d < 28; d++) {
      ctl.openGift();
      tick(24 * H);
    }
    const ids = events.filter((e) => e.name === 'achievement:unlocked').map((e) => (e.payload as { id: string }).id);
    expect(ids).toEqual(['lounge-week', 'lounge-month']);
    const satchel = events
      .filter((e) => e.name === 'reward:granted')
      .map((e) => (e.payload as { label: string }).label)
      .find((l) => /satchel/i.test(l))!;
    expect(satchel).toMatch(/^[A-Z][a-z]+ (grand )?satchel$/);
    off();
  });

  it('welcomes the player back with earnings computed from saved timestamps', () => {
    const storage = memoryStorage();
    const a = setup({ storage });
    const offA = comfort.install(a.services);
    a.services.bus.emit('case:completed', { caseId: 'c', modeId: 'shift', score: score(1300) });
    comfortOf(a.services)!.beat();
    offA();
    // flush the debounced save
    return new Promise<void>((resolve) => setTimeout(resolve, 300)).then(() => {
      const b = setup({ storage, now: a.at() + 5 * H });
      const offB = comfort.install(b.services);
      const ctl = comfortOf(b.services)!;
      const w = ctl.state.get().welcome;
      expect(w).not.toBeNull();
      expect(w!.coins).toBe(Math.floor(5 * 15));
      const paid = ctl.collectEarnings();
      expect(paid).toBe(75);
      expect(b.events.some((e) => e.name === 'currency:grant' && (e.payload as { amount: number }).amount === 75)).toBe(true);
      expect(ctl.state.get().welcome).toBeNull();
      offB();
    });
  });

  it('plans Continue: daily first, then shift, else first open mode', () => {
    const { services } = setup();
    const off = comfort.install(services);
    const ctl = comfortOf(services)!;
    expect(ctl.plan()).toBeNull();
    let dailyLocked: string | undefined;
    services.registries.modes.register(mode('rush', 30));
    expect(ctl.plan()?.modeId).toBe('rush');
    services.registries.modes.register(mode('shift', 10));
    services.registries.modes.register(mode('daily', 20, () => dailyLocked));
    expect(ctl.plan()?.modeId).toBe('daily');
    dailyLocked = 'done today';
    expect(ctl.plan()?.modeId).toBe('shift');
    dailyLocked = undefined;
    services.bus.emit('mode:ended', { modeId: 'daily', casesCompleted: 3, totalScore: 3000 });
    expect(ctl.state.get().dailyDoneDay).toBe(dayKey(services.clock.now()));
    expect(ctl.plan()?.modeId).toBe('shift');
    off();
  });

  it('offers to return to the patient mid-run', () => {
    const { services } = setup();
    const off = comfort.install(services);
    const shift = mode('shift', 10);
    services.registries.modes.register(shift);
    services.registries.cases.register({ id: 'k1', difficulty: 1, tags: [], patient: {} as never, chiefComplaint: '', history: [], findings: {} as never, essentialTests: [], helpfulTests: [], diagnosis: 'myopia', differentials: [], urgency: 'routine', management: '', teachingPoints: [] });
    services.run.start(shift, 'seed');
    services.session.start(services.registries.cases.require('k1'), 'shift');
    const plan = comfortOf(services)!.plan();
    expect(plan).toMatchObject({ kind: 'exam', caseId: 'k1' });
    comfortOf(services)!.resume();
    expect(services.router.current.get()).toMatchObject({ id: 'exam', params: { caseId: 'k1' } });
    off();
  });
});

describe('pearls', () => {
  const dx = (id: string, pearls: string[]): Diagnosis => ({
    id, name: id.toUpperCase(), category: 'retina', summary: '', keyFindings: [], typicalUrgency: 'routine', pearls, rarity: 'common',
  });
  const services = (): GameServices => setup().services;

  it('puts diagnoses due for review first and is stable per day', () => {
    const s = services();
    s.learning = { ...s.learning, due: () => ['b'], seen: (id) => id === 'c' };
    const list = [dx('a', ['pa']), dx('b', ['pb']), dx('c', ['pc']), dx('d', [])];
    const p1 = pearlsFor(list, s.learning, '2026-11-24');
    expect(p1[0]).toMatchObject({ diagnosisId: 'b', reason: 'review', text: 'pb' });
    expect(p1.map((p) => p.diagnosisId)).not.toContain('d');
    expect(pearlsFor(list, s.learning, '2026-11-24')).toEqual(p1);
    expect(p1.find((p) => p.diagnosisId === 'c')?.reason).toBe('seen');
  });
});

const SOURCES = import.meta.glob<string>(['./ui/*.{ts,tsx,css}', './logic.ts', './controller.ts', './resume.ts', './pearls.ts', './index.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('player-facing text', () => {
  it('never mentions the internal design lens', () => {
    const banned = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath)\b/i;
    const files = Object.entries(SOURCES);
    expect(files.length).toBeGreaterThan(10);
    for (const [file, raw] of files) {
      // the SystemModule contract's internal `drive` field is the one allowed mention
      const src = raw.replace(/Math\.sin\(/g, '').replace(/drive: 'sloth'/g, '');
      expect(banned.test(src), file).toBe(false);
      if (!file.endsWith('index.tsx')) expect(/\bsloth\b/i.test(src), file).toBe(false);
    }
  });
});
