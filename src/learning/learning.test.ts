import { describe, expect, it } from 'vitest';
import {
  buildFindings, createSaveService, createServices, memoryStorage, nullLearning, scoreCase,
  type ClinicalCase, type LearningPort,
} from '@core';
import { attachLearning, createLearning, isLumenLearning } from './index';
import {
  DAY, DEFAULT_EASE, LAPSE_DELAY_MS, MIN_EASE, MINUTE, confuse, masteryOf, newCard, nextEase, review,
} from './sm2';

function clock(start = Date.UTC(2026, 0, 1, 12)) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; }, set: (ms: number) => { t = ms; } };
}

function setup() {
  const c = clock();
  const storage = memoryStorage();
  const save = createSaveService(storage, 0);
  const learning = createLearning(save, c.now);
  return { c, storage, save, learning };
}

describe('sm2 maths', () => {
  it('follows the classic SM-2 ease update', () => {
    expect(nextEase(2.5, 5)).toBeCloseTo(2.6);
    expect(nextEase(2.5, 4)).toBeCloseTo(2.5);
    expect(nextEase(2.5, 3)).toBeCloseTo(2.36);
    expect(nextEase(1.3, 0)).toBe(MIN_EASE);
  });

  it('grows intervals 1 → 6 → ~ease× when reviews are on time', () => {
    const c = clock();
    let card = review(newCard(c.now()), 4, c.now());
    expect(card.intervalDays).toBe(1);
    c.advance(DAY);
    card = review(card, 4, c.now());
    expect(card.intervalDays).toBe(6);
    c.advance(6 * DAY);
    card = review(card, 4, c.now());
    expect(card.intervalDays).toBe(15);
    expect(card.reps).toBe(3);
    expect(card.due).toBe(c.now() + 15 * DAY);
  });

  it('does not advance on early (crammed) successes', () => {
    const c = clock();
    let card = review(newCard(c.now()), 5, c.now());
    c.advance(5 * MINUTE);
    const again = review(card, 5, c.now());
    expect(again.reps).toBe(1);
    expect(again.intervalDays).toBe(1);
    expect(again.seen).toBe(2);
    card = again;
  });

  it('lapses reset repetitions and come back within minutes', () => {
    const c = clock();
    let card = review(newCard(c.now()), 5, c.now());
    c.advance(DAY);
    card = review(card, 1, c.now());
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(1);
    expect(card.due).toBe(c.now() + LAPSE_DELAY_MS);
    expect(card.ease).toBeLessThan(DEFAULT_EASE);
  });

  it('confusion is a softer lapse than a miss', () => {
    const c = clock();
    let card = newCard(c.now());
    for (const d of [0, 1, 6, 15]) { c.advance(d * DAY); card = review(card, 5, c.now()); }
    const conf = confuse(card, c.now());
    expect(conf.reps).toBe(card.reps - 1);
    expect(conf.intervalDays).toBe(Math.floor(card.intervalDays / 2));
    expect(conf.due).toBeLessThanOrEqual(c.now() + 30 * MINUTE);
    expect(conf.confusions).toBe(1);
  });

  it('mastery is 0 for unseen and only reaches ~1 after several spaced successes', () => {
    const c = clock();
    expect(masteryOf(undefined, c.now())).toBe(0);
    let card = newCard(c.now());
    const ms: number[] = [];
    for (let i = 0; i < 4; i++) {
      c.set(card.due);
      card = review(card, 5, c.now());
      ms.push(masteryOf(card, c.now()));
    }
    expect(card.reps).toBe(4);
    for (let i = 1; i < ms.length; i++) expect(ms[i]!).toBeGreaterThan(ms[i - 1]!);
    expect(ms[0]!).toBeLessThan(0.5);
    expect(ms[2]!).toBeLessThan(0.9);
    expect(ms[3]!).toBeGreaterThanOrEqual(0.95);
  });

  it('mastery fades when long overdue but never collapses to zero', () => {
    const c = clock();
    let card = newCard(c.now());
    for (let i = 0; i < 4; i++) { c.set(card.due); card = review(card, 5, c.now()); }
    const fresh = masteryOf(card, c.now());
    c.advance(400 * DAY);
    const stale = masteryOf(card, c.now());
    expect(stale).toBeLessThan(fresh);
    expect(stale).toBeGreaterThan(fresh * 0.45);
  });
});

describe('createLearning', () => {
  it('records, schedules and reports stats', () => {
    const { c, learning } = setup();
    learning.record('myopia', 5);
    learning.record('poag', 1);
    expect(learning.stats()).toEqual({ seen: 2, mastered: 0, due: 0 });
    c.advance(11 * MINUTE);
    expect(learning.due()).toEqual(['poag']);
    c.advance(DAY);
    expect(learning.due()).toEqual(['poag', 'myopia']); // poag is more overdue
    expect(learning.due(1)).toEqual(['poag']);
    expect(learning.stats().due).toBe(2);
  });

  it('orders due() most overdue first', () => {
    const { c, learning } = setup();
    learning.record('a', 4); // due +1d
    c.advance(2 * 60 * MINUTE);
    learning.record('b', 4); // due +1d+2h
    c.advance(3 * DAY);
    expect(learning.due()).toEqual(['a', 'b']);
  });

  it('counts a diagnosis as mastered only after spaced successes', () => {
    const { c, learning } = setup();
    for (let i = 0; i < 4; i++) {
      c.set(learning.card('cataract')?.due ?? c.now());
      learning.record('cataract', 4);
      learning.record('cataract', 4); // same-day repeat must not inflate mastery
    }
    expect(learning.card('cataract')?.reps).toBe(4);
    expect(learning.mastery('cataract')).toBeGreaterThanOrEqual(0.8);
    expect(learning.stats().mastered).toBe(1);
    expect(learning.mastery('never-seen')).toBe(0);
  });

  it('cramming one evening does not master a diagnosis', () => {
    const { c, learning } = setup();
    for (let i = 0; i < 20; i++) { learning.record('dry-eye', 5); c.advance(5 * MINUTE); }
    expect(learning.mastery('dry-eye')).toBeLessThan(0.5);
    expect(learning.card('dry-eye')?.seen).toBe(20);
  });

  it('persists to the "learning" save slot and reloads', () => {
    const { c, storage, learning } = setup();
    learning.record('keratoconus', 4);
    const reloaded = createLearning(createSaveService(storage, 0), c.now);
    expect(reloaded.card('keratoconus')?.reps).toBe(1);
    expect(reloaded.stats().seen).toBe(1);
    expect(storage.keys()).toContain('lumen:learning');
  });

  it('repairs malformed saved cards', () => {
    const storage = memoryStorage();
    storage.setItem('lumen:learning', JSON.stringify({ v: 1, data: { cards: { x: { ease: 'nope', reps: -3 }, y: 7 } } }));
    const l = createLearning(createSaveService(storage, 0), () => 1000);
    expect(l.card('x')?.ease).toBe(DEFAULT_EASE);
    expect(l.card('x')?.reps).toBe(0);
    expect(l.card('y')).toBeUndefined();
  });

  it('confuse() creates a due-soon card without counting it as seen', () => {
    const { c, learning } = setup();
    learning.confuse('anterior-uveitis');
    expect(learning.stats().seen).toBe(0);
    expect(learning.due()).toEqual([]);
    c.advance(31 * MINUTE);
    expect(learning.due()).toEqual(['anterior-uveitis']);
  });

  it('clamps silly qualities', () => {
    const { learning } = setup();
    learning.record('a', 99);
    learning.record('b', Number.NaN);
    expect(learning.card('a')?.lastQuality).toBe(5);
    expect(learning.card('b')?.lastQuality).toBe(0);
  });

  it('is feature-detectable', () => {
    expect(isLumenLearning(setup().learning)).toBe(true);
    expect(isLumenLearning(nullLearning)).toBe(false);
  });
});

const kase: ClinicalCase = {
  id: 'aac-1', difficulty: 3, tags: [], chiefComplaint: 'Halos and pain',
  patient: { name: 'T', age: 64, sex: 'F', avatar: { skin: 2, hair: 'bob', hairColor: '#999', irisColor: '#553', outfit: '#345' } },
  history: [{ id: 'h1', category: 'symptoms', q: 'Halos?', a: 'Yes', relevance: 'key' }],
  findings: buildFindings(64, { iop: { OD: 52 } }),
  essentialTests: ['tonometry'], helpfulTests: [],
  diagnosis: 'acute-angle-closure', differentials: ['anterior-uveitis'], urgency: 'emergency',
  management: 'Refer', teachingPoints: [], emergency: { timeLimitSec: 120 },
};

describe('attachLearning', () => {
  function wired() {
    const c = clock();
    const services = createServices({ now: c.now });
    services.learning = createLearning(services.save, c.now);
    services.registries.cases.register(kase);
    const reviewed: { diagnosisId: string; quality: number }[] = [];
    services.bus.on('learning:reviewed', (p) => reviewed.push(p));
    const off = attachLearning(services);
    return { c, services, reviewed, off };
  }

  it('records the correct diagnosis with learningQuality and emits learning:reviewed', () => {
    const { services, reviewed } = wired();
    services.session.start(kase, 'shift');
    services.session.ask('h1');
    services.session.recordTest({ testId: 'tonometry', accuracy: 1, timeMs: 1, findings: [] });
    services.session.submit('acute-angle-closure', 'emergency');
    expect(reviewed).toEqual([{ diagnosisId: 'acute-angle-closure', quality: 5 }]);
    expect(services.learning.stats().seen).toBe(1);
  });

  it('a wrong pick lapses the real diagnosis and soft-lapses the confused one', () => {
    const { c, services, reviewed } = wired();
    services.session.start(kase, 'shift');
    services.session.submit('anterior-uveitis', 'urgent');
    expect(reviewed[0]!.diagnosisId).toBe('acute-angle-closure');
    expect(reviewed[0]!.quality).toBeLessThan(3);
    const l = services.learning;
    if (!isLumenLearning(l)) throw new Error('expected lumen learning');
    expect(l.card('acute-angle-closure')?.lapses).toBe(1);
    expect(l.card('anterior-uveitis')?.confusions).toBe(1);
    c.advance(31 * MINUTE);
    expect(l.due()).toEqual(expect.arrayContaining(['acute-angle-closure', 'anterior-uveitis']));
  });

  it('falls back to a small-lapse record() for foreign adapters', () => {
    const { services } = wired();
    const calls: [string, number][] = [];
    const spy: LearningPort = { ...nullLearning, record: (id, q) => void calls.push([id, q]) };
    services.learning = spy;
    const score = scoreCase({ kase, diagnosisId: 'anterior-uveitis', urgency: 'routine', testsDone: {}, askedQuestions: [], elapsedSec: 5, hintsUsed: 0 });
    services.bus.emit('case:completed', { caseId: kase.id, modeId: 'shift', score });
    expect(calls).toEqual([['acute-angle-closure', 0], ['anterior-uveitis', 2]]);
  });

  it('treats a timeout as a lapse but ignores abandoned cases', () => {
    const { services, reviewed } = wired();
    services.bus.emit('case:failed', { caseId: kase.id, modeId: 'code-red', reason: 'abandoned' });
    expect(reviewed).toEqual([]);
    services.bus.emit('case:failed', { caseId: kase.id, modeId: 'code-red', reason: 'timeout' });
    expect(reviewed).toEqual([{ diagnosisId: 'acute-angle-closure', quality: 1 }]);
  });

  it('uninstall stops listening', () => {
    const { services, reviewed, off } = wired();
    off();
    services.session.start(kase, 'shift');
    services.session.submit('acute-angle-closure', 'emergency');
    expect(reviewed).toEqual([]);
  });
});
