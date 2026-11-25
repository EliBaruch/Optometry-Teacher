import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFindings, createServices, type ClinicalCase, type GameServices, type RewardGrant } from '@core';
import { startEngine, type SavedInfo, type Stage } from './engine';
import { grandRoundsCase } from './logic';
import { isInstalled, statsSlot } from './state';
import system from './index';

const avatar = { skin: 1 as const, hair: 'short' as const, hairColor: '#000', irisColor: '#333', outfit: '#555' };
const mk = (id: string, diagnosis: string, timer?: number): ClinicalCase => ({
  id, difficulty: 4, tags: [], chiefComplaint: 'Sudden loss of vision', history: [], findings: buildFindings(70),
  essentialTests: [], helpfulTests: [], diagnosis, differentials: ['pvd'], urgency: 'emergency', management: '',
  teachingPoints: ['Teach'], redFlags: ['Sudden painless monocular loss with a cherry-red spot.'],
  patient: { name: 'Ada', age: 70, sex: 'F', avatar }, ...(timer ? { emergency: { timeLimitSec: timer } } : {}),
});

function setup() {
  let now = 1_800_000_000_000;
  const audio = { play: vi.fn(), music: vi.fn(), unlock: vi.fn(), setVolumes: vi.fn() };
  const fx = { shake: vi.fn(), flash: vi.fn(), burst: vi.fn(), floatText: vi.fn(), hitstop: vi.fn(), vignette: vi.fn() };
  const services = createServices({ now: () => now, audio, fx });
  services.registries.cases.register(mk('crao-1', 'crao', 120));
  services.registries.cases.register(mk('gca-1', 'giant-cell-arteritis', 120));
  services.registries.cases.register(mk('rd-1', 'retinal-detachment', 120));
  services.registries.cases.register(mk('plain', 'pvd'));
  // A timed case whose required urgency is only 'urgent' (like microbial keratitis).
  services.registries.cases.register({ ...mk('mk-1', 'microbial-keratitis', 150), urgency: 'urgent', essentialTests: ['slit-lamp', 'fluorescein'] });
  const stage: Stage & { calls: string[]; savedInfo: SavedInfo[] } = {
    calls: [],
    savedInfo: [],
    arrival() { this.calls.push('arrival'); },
    saved(info) { this.calls.push('saved'); this.savedInfo.push(info); },
    dismissArrival() { this.calls.push('dismiss'); },
    destroy() { this.calls.push('destroy'); },
  };
  const events: { name: string; payload: unknown }[] = [];
  services.bus.onAny((name, payload) => events.push({ name, payload }));
  const stop = startEngine(services, { stage, reducedMotion: () => false });
  return { services, audio, fx, stage, events, stop, advance: (ms: number) => { now += ms; vi.advanceTimersByTime(ms); }, setNow: (ms: number) => (now = ms), getNow: () => now };
}

const named = (events: { name: string; payload: unknown }[], n: string) => events.filter((e) => e.name === n).map((e) => e.payload);
const nonGrand = (s: GameServices) => s.registries.cases.all().find((c) => c.emergency && c.id !== grandRoundsCase(s.registries.cases.all(), s.clock.now())?.id)!;
const grand = (s: GameServices) => grandRoundsCase(s.registries.cases.all(), s.clock.now())!;

describe('Code Red engine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays silent for non-emergency cases', () => {
    const t = setup();
    t.services.session.start(t.services.registries.cases.require('plain'), 'shift');
    t.advance(5000);
    expect(t.audio.play).not.toHaveBeenCalled();
    expect(t.stage.calls).toEqual([]);
    t.stop();
  });

  it('sounds the klaxon, then a heartbeat that speeds up, and stops on submit', () => {
    const t = setup();
    const kase = nonGrand(t.services);
    t.services.session.start(kase, 'code-red');
    expect(t.audio.play).toHaveBeenCalledWith('alarm', expect.anything());
    expect(t.stage.calls).toEqual(['arrival']);
    expect(t.fx.vignette).toHaveBeenCalled();
    const beatsIn = (ms: number) => {
      const before = t.audio.play.mock.calls.filter((c) => c[0] === 'heartbeat').length;
      t.advance(ms);
      return t.audio.play.mock.calls.filter((c) => c[0] === 'heartbeat').length - before;
    };
    const early = beatsIn(10_000);
    t.advance(85_000);
    const late = beatsIn(10_000);
    expect(early).toBeGreaterThan(5);
    expect(late).toBeGreaterThan(early);
    t.services.session.submit('pvd', 'routine');
    expect(t.stage.calls).toContain('dismiss');
    const after = beatsIn(5000);
    expect(after).toBe(0);
    t.stop();
  });

  it('celebrates a correct emergency call with learning-scaled rewards collected by the session', () => {
    const t = setup();
    const kase = nonGrand(t.services);
    t.services.session.start(kase, 'code-red');
    t.advance(30_000);
    t.services.session.submit(kase.diagnosis, 'emergency');
    const rewards = t.services.session.state.get()!.rewards as RewardGrant[];
    expect(rewards.map((r) => r.label)).toEqual(['Sight saved', 'Emergency XP']);
    expect(rewards.every((r) => r.source === 'emergencies')).toBe(true);
    expect(named(t.events, 'currency:grant')).toHaveLength(1);
    expect(named(t.events, 'xp:grant')).toHaveLength(1);
    expect(t.fx.hitstop).toHaveBeenCalled();
    t.advance(500);
    expect(t.fx.flash).toHaveBeenCalled();
    expect(t.stage.calls).toContain('saved');
    const s = statsSlot(t.services).get();
    expect(s.saved).toBe(1);
    expect(s.fastestSaveSec).toBeCloseTo(30, 0);
    expect(named(t.events, 'achievement:unlocked').map((a) => (a as { id: string }).id)).toContain('emergencies:first-save');
    t.stop();
  });

  it('teaches the red flag (no reward, no penalty) after under-triage', () => {
    const t = setup();
    const kase = nonGrand(t.services);
    t.services.session.start(kase, 'code-red');
    t.advance(20_000);
    t.services.session.submit(kase.diagnosis, 'soon');
    const toasts = named(t.events, 'toast') as { message: string; tone: string }[];
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.message).toMatch(/same-hour emergency referral.*cherry-red spot/);
    expect(toasts[0]!.tone).toBe('info');
    expect(named(t.events, 'reward:granted')).toHaveLength(0);
    expect(named(t.events, 'currency:grant')).toHaveLength(0);
    expect(statsSlot(t.services).get().underTriaged).toBe(1);
    t.stop();
  });

  it('treats an emergency referral for an urgent case as safe over-triage, not a miss', () => {
    const t = setup();
    const mk = t.services.registries.cases.require('mk-1');
    t.services.session.start(mk, 'code-red');
    t.advance(20_000);
    t.services.session.submit(mk.diagnosis, 'emergency');
    const toasts = named(t.events, 'toast') as { message: string }[];
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.message).toMatch(/Safe and correct.*if over-cautious — same-day review is enough/);
    expect(toasts[0]!.message).not.toMatch(/Red flag/);
    const s = statsSlot(t.services).get();
    expect(s.overTriaged).toBe(1);
    expect(s.underTriaged).toBe(0);
    t.stop();
  });

  it('teaches the diagnosis (not "slipped past") when the referral was right but the diagnosis wrong', () => {
    const t = setup();
    const kase = nonGrand(t.services);
    t.services.session.start(kase, 'code-red');
    t.advance(20_000);
    t.services.session.submit('pvd', 'emergency');
    const toasts = named(t.events, 'toast') as { message: string }[];
    expect(toasts[0]!.message).toMatch(/^You sent them on in time — but this was .*, not pvd\./);
    expect(statsSlot(t.services).get().referred).toBe(1);
    expect(named(t.events, 'reward:granted')).toHaveLength(0);
    t.stop();
  });

  it('pays a blind guess little, names the missing tests, and halves repeat saves', () => {
    const t = setup();
    const kase = { ...nonGrand(t.services), essentialTests: ['pupils', 'ophthalmoscopy'] as const };
    t.services.registries.cases.register({ ...kase, id: 'thin-1', essentialTests: [...kase.essentialTests] });
    const thin = t.services.registries.cases.require('thin-1');
    const coins = () => (named(t.events, 'currency:grant') as { amount: number }[]).map((g) => g.amount);
    t.services.session.start(thin, 'code-red');
    t.advance(1000);
    t.services.session.submit(thin.diagnosis, 'emergency');
    t.advance(500);
    expect(t.fx.hitstop).not.toHaveBeenCalled(); // quieter finale for an unproven save
    expect(t.stage.savedInfo[0]!.reward.thin).toBe(true);
    expect(t.stage.savedInfo[0]!.note).toBe('Right call — next time confirm it with Pupils and Ophthalmoscopy.');
    t.services.session.start(thin, 'code-red');
    t.advance(1000);
    t.services.session.submit(thin.diagnosis, 'emergency');
    const [first, second] = coins();
    expect(first).toBeLessThan(35); // a thorough work-up of the same case pays ~80+
    expect(second).toBe(Math.round(first! / 2));
    t.stop();
  });

  it('records a timeout but ignores walking away', () => {
    const t = setup();
    const kase = nonGrand(t.services);
    t.services.session.start(kase, 'code-red');
    t.advance(121_000);
    t.services.session.fail('timeout');
    expect(statsSlot(t.services).get().timeouts).toBe(1);
    t.services.session.start(kase, 'code-red');
    t.services.session.fail('abandoned');
    expect(statsSlot(t.services).get().attempts).toBe(1);
    t.stop();
  });

  it('pays the Grand Rounds bonus once per week', () => {
    const t = setup();
    const g = grand(t.services);
    for (let i = 0; i < 2; i++) {
      t.services.session.start(g, 'single');
      t.advance(15_000);
      t.services.session.submit(g.diagnosis, 'emergency');
      t.advance(4000);
    }
    const labels = (named(t.events, 'reward:granted') as RewardGrant[]).map((r) => r.label);
    expect(labels.filter((l) => l === 'Grand Rounds')).toHaveLength(1);
    expect(labels.filter((l) => l === 'Sight saved')).toHaveLength(2);
    expect(statsSlot(t.services).get().grandRoundsTotal).toBe(1);
    t.stop();
  });

  it('silences the heartbeat when the session is cleared and cleans up on uninstall', () => {
    const t = setup();
    t.services.session.start(nonGrand(t.services), 'code-red');
    t.advance(3000);
    t.services.session.clear();
    const n = t.audio.play.mock.calls.length;
    t.advance(10_000);
    expect(t.audio.play.mock.calls.length).toBe(n);
    t.stop();
    expect(t.stage.calls).toContain('destroy');
    t.services.session.start(nonGrand(t.services), 'code-red');
    t.advance(3000);
    expect(t.audio.play.mock.calls.length).toBe(n);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('system module', () => {
  it('is idempotent and registers its widgets once', () => {
    const services = createServices();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const u1 = system.install(services);
    const u2 = system.install(services);
    const ids = services.registries.hud.all().map((w) => w.id).sort();
    expect(ids).toEqual(['emergencies:countdown', 'emergencies:debrief', 'emergencies:grand-rounds', 'emergencies:record']);
    expect(warn).not.toHaveBeenCalled();
    expect(isInstalled(services)).toBe(true);
    u2(); // the no-op handle from the second install leaves the first one live
    expect(isInstalled(services)).toBe(true);
    u1();
    expect(isInstalled(services)).toBe(false); // widgets render nothing after uninstall
    const u3 = system.install(services); // and a fresh install works again
    expect(isInstalled(services)).toBe(true);
    u3();
    expect(system.name).toBe('Code Red');
    warn.mockRestore();
  });
});
