import { describe, expect, it } from 'vitest';
import { buildFindings, createServices, type ClinicalCase, type GameEvents, type GameServices } from '@core';
import ranks from './index';
import { startEngine, type Moment } from './engine';
import { ranksSlot } from './model/state';
import { xpAtLevel } from './model/ladder';
import { score } from './model/fixtures';

function kase(id: string, diagnosis: string, p: Partial<ClinicalCase> = {}): ClinicalCase {
  return {
    id, difficulty: 2, tags: [], diagnosis, differentials: ['healthy-eyes'], urgency: 'routine',
    patient: { name: 'Pat', age: 50, sex: 'X', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
    chiefComplaint: '', history: [], findings: buildFindings(50), essentialTests: [], helpfulTests: [],
    management: '', teachingPoints: [], ...p,
  };
}

function setup() {
  const services = createServices();
  services.registries.diagnoses.register({ id: 'poag', name: 'Primary open-angle glaucoma', category: 'glaucoma', summary: '', keyFindings: [], typicalUrgency: 'routine', pearls: [], rarity: 'common' });
  services.registries.diagnoses.register({ id: 'crao', name: 'CRAO', category: 'retina', summary: '', keyFindings: [], typicalUrgency: 'emergency', pearls: [], rarity: 'rare' });
  services.registries.cases.register(kase('c-poag', 'poag'));
  services.registries.cases.register(kase('c-crao', 'crao', { urgency: 'emergency', emergency: { timeLimitSec: 120 }, difficulty: 4 }));
  return services;
}

function record(services: GameServices) {
  const seen: { [K in keyof GameEvents]?: GameEvents[K][] } = {};
  services.bus.onAny((e, p) => {
    ((seen as Record<string, unknown[]>)[e] ??= []).push(p);
  });
  return seen;
}

describe('ranks system', () => {
  it('declares a clinic-themed identity', () => {
    expect(ranks.id).toBe('ranks');
    expect(ranks.name).toBe('Career');
    expect(ranks.drive).toBe('pride');
  });

  it('registers its scene, hub tile and HUD widgets once (idempotent install)', () => {
    const s = setup();
    const a = ranks.install(s);
    const b = ranks.install(s);
    expect(b).toBe(a);
    expect(s.registries.scenes.has('career')).toBe(true);
    expect(s.registries.hub.get('career')?.sceneId).toBe('career');
    const slots = s.registries.hud.all().map((w) => w.slot).sort();
    expect(slots).toEqual(['hub-sidebar', 'profile', 'results-extra', 'topbar-left']);
    s.bus.emit('case:completed', { caseId: 'c-poag', modeId: 'shift', score: score() });
    expect(ranksSlot(s).get().cases).toBe(1); // handled once, not twice
    a();
  });

  it('awards XP, announces it, and unlocks trophies on a case', () => {
    const s = setup();
    const ev = record(s);
    const off = ranks.install(s);
    s.bus.emit('diagnosis:submitted', { caseId: 'c-poag', diagnosisId: 'poag', correct: true, urgency: 'routine', urgencyCorrect: true, confidence: 'certain' });
    s.bus.emit('case:completed', { caseId: 'c-poag', modeId: 'shift', score: score({ grade: 'S', perfect: true }) });
    const st = ranksSlot(s).get();
    expect(st.xp).toBeGreaterThan(200);
    expect(st.lastGain?.lines.some((l) => l.id === 'calibrated')).toBe(true);
    expect(ev['reward:granted']?.some((r) => r.source === 'ranks' && r.value === `+${st.xp} XP`)).toBe(true);
    const ids = ev['achievement:unlocked']!.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['first-light', 'gold-standard', 'flawless']));
    expect(st.unseen).toEqual(expect.arrayContaining(ids));
    expect(s.registries.hub.get('career')!.badge!(s)).toBe(`${st.unseen.length} NEW`);
    off();
  });

  it('emits rank:changed and stages a ceremony on promotion', () => {
    const s = setup();
    const ev = record(s);
    const moments: Moment[] = [];
    const eng = startEngine(s, { present: (m) => moments.push(m) });
    s.bus.emit('xp:grant', { amount: xpAtLevel(3) + 1, reason: 'Gift' });
    expect(ev['rank:changed']).toEqual([{ level: 4, title: 'Intern I' }]);
    const rank = moments.find((m) => m.kind === 'rank');
    expect(rank && rank.kind === 'rank' && rank.newRank).toBe(true);
    expect(moments.some((m) => m.kind === 'trophy' && m.def.id === 'rank-intern')).toBe(true);
    eng.stop();
  });

  it('emergency triage, comeback and pending grants', () => {
    const s = setup();
    const off = ranks.install(s);
    s.bus.emit('case:completed', { caseId: 'c-crao', modeId: 'code-red', score: score({ correctDiagnosisId: 'crao', chosenDiagnosisId: 'poag', diagnosisCorrect: false, grade: 'D' }) });
    expect(ranksSlot(s).get().dx['crao']?.missed).toBe(1);
    s.bus.emit('case:completed', { caseId: 'c-crao', modeId: 'code-red', score: score({ correctDiagnosisId: 'crao', chosenDiagnosisId: 'crao' }) });
    const st = ranksSlot(s).get();
    expect(st.comebacks).toBe(1);
    expect(st.triaged).toContain('crao');
    expect(st.achievements['sight-saver']).toBeDefined();
    expect(st.achievements['crao-triage']).toBeDefined();
    expect(st.achievements['on-call-ready']).toBeDefined();
    expect(st.lastGain?.lines.some((l) => l.id === 'triage')).toBe(true);
    off();
  });

  it('attaches xp:grant to the case on the results screen', () => {
    const s = setup();
    const off = ranks.install(s);
    const k = s.registries.cases.get('c-poag')!;
    s.session.start(k, 'shift');
    s.session.submit('poag', 'routine');
    const before = ranksSlot(s).get().lastGain!;
    s.bus.emit('xp:grant', { amount: 40, reason: 'Combo bonus' });
    const after = ranksSlot(s).get().lastGain!;
    expect(after.toXp - after.fromXp).toBe(before.toXp - before.fromXp + 40);
    expect(after.lines.at(-1)?.label).toBe('Combo bonus');
    off();
  });

  it('a grant that lands before the case handler is folded in afterwards', () => {
    const s = setup();
    const k = s.registries.cases.get('c-poag')!;
    // Another system grants XP from its own case:completed handler, registered before ours.
    s.bus.on('case:completed', () => s.bus.emit('xp:grant', { amount: 25, reason: 'Streak' }));
    const off = ranks.install(s);
    s.session.start(k, 'shift');
    s.session.submit('poag', 'routine');
    const g = ranksSlot(s).get().lastGain!;
    expect(g.lines.at(-1)).toEqual({ id: 'bonus', label: 'Streak', xp: 25 });
    expect(g.toXp - g.fromXp).toBe(g.lines.reduce((a, l) => a + l.xp, 0));
    off();
  });

  it('tests, practice and runs feed technique trophies; auto-run does not', () => {
    const s = setup();
    const off = ranks.install(s);
    s.bus.emit('test:completed', { caseId: 'c-poag', result: { testId: 'tonometry', accuracy: 1, timeMs: 1, findings: [], autoRun: true } });
    expect(ranksSlot(s).get().tests.tonometry).toBeUndefined();
    s.bus.emit('practice:completed', { testId: 'tonometry', result: { testId: 'tonometry', accuracy: 1, timeMs: 1, findings: [], perfect: true } });
    expect(ranksSlot(s).get().achievements['technique-tonometry']).toBeDefined();
    s.bus.emit('mode:ended', { modeId: 'shift', casesCompleted: 3, totalScore: 100 });
    expect(ranksSlot(s).get().achievements['full-shift']).toBeDefined();
    off();
  });

  it('uninstall unsubscribes everything', () => {
    const s = setup();
    const off = ranks.install(s);
    off();
    s.bus.emit('case:completed', { caseId: 'c-poag', modeId: 'shift', score: score() });
    s.bus.emit('xp:grant', { amount: 100, reason: 'x' });
    expect(ranksSlot(s).get().xp).toBe(0);
    // reinstall works
    const again = ranks.install(s);
    s.bus.emit('xp:grant', { amount: 100, reason: 'x' });
    expect(ranksSlot(s).get().xp).toBe(100);
    again();
  });

  it('timeouts break streaks but never take XP', () => {
    const s = setup();
    const off = ranks.install(s);
    s.bus.emit('case:completed', { caseId: 'c-poag', modeId: 'shift', score: score() });
    const xp = ranksSlot(s).get().xp;
    s.bus.emit('case:failed', { caseId: 'c-poag', modeId: 'shift', reason: 'timeout' });
    expect(ranksSlot(s).get().correctStreak).toBe(0);
    expect(ranksSlot(s).get().xp).toBe(xp);
    off();
  });
});
