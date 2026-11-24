import { describe, expect, it } from 'vitest';
import {
  buildFindings, createEventBus, createRng, createSaveService, createServices, formatRx, formatSnellen,
  memoryStorage, scoreCase, type ClinicalCase,
} from './index';

const kase: ClinicalCase = {
  id: 'test-aac', difficulty: 3, tags: [], chiefComplaint: 'My eye hurts and I see halos',
  patient: { name: 'T', age: 64, sex: 'F', avatar: { skin: 2, hair: 'bob', hairColor: '#999', irisColor: '#553', outfit: '#345' } },
  history: [
    { id: 'h1', category: 'symptoms', q: 'Halos?', a: 'Yes', relevance: 'key' },
    { id: 'h2', category: 'social', q: 'Pets?', a: 'A cat', relevance: 'red-herring' },
  ],
  findings: buildFindings(64, { iop: { OD: 52 } }),
  essentialTests: ['tonometry', 'slit-lamp'], helpfulTests: ['visual-acuity'],
  diagnosis: 'acute-angle-closure', differentials: ['anterior-uveitis'], urgency: 'emergency',
  management: 'Refer', teachingPoints: [],
};

describe('core', () => {
  it('event bus isolates throwing handlers', () => {
    const bus = createEventBus();
    let got = 0;
    bus.on('toast', () => { throw new Error('boom'); });
    bus.on('toast', () => { got++; });
    bus.emit('toast', { message: 'x' });
    expect(got).toBe(1);
  });

  it('rng is deterministic', () => {
    expect(createRng('a').next()).toBe(createRng('a').next());
    expect(createRng('a').next()).not.toBe(createRng('b').next());
  });

  it('buildFindings deep-merges a sparse patch', () => {
    const f = buildFindings(64, { iop: { OD: 52 } });
    expect(f.iop.OD).toBe(52);
    expect(f.iop.OS).toBe(15);
    expect(f.refraction.OD.add).toBe(2.5);
  });

  it('formats acuity and refraction', () => {
    expect(formatSnellen(0)).toBe('20/20');
    expect(formatSnellen(1)).toBe('20/200');
    expect(formatSnellen(0.3)).toBe('20/40');
    expect(formatRx({ sphere: -2.25, cylinder: -0.75, axis: 90 })).toBe('−2.25 −0.75 × 090');
  });

  it('save slots persist and reload', () => {
    const storage = memoryStorage();
    const a = createSaveService(storage, 0);
    a.slot('x', { n: 1 }).set({ n: 5 });
    const b = createSaveService(storage, 0);
    expect(b.slot('x', { n: 1 }).get().n).toBe(5);
  });

  it('scores a perfect case highly and a wrong one low', () => {
    const base = { kase, testsDone: {
      tonometry: { testId: 'tonometry' as const, accuracy: 1, timeMs: 1000, findings: [] },
      'slit-lamp': { testId: 'slit-lamp' as const, accuracy: 1, timeMs: 1000, findings: [] },
    }, askedQuestions: ['h1'], elapsedSec: 30, hintsUsed: 0 };
    const good = scoreCase({ ...base, diagnosisId: 'acute-angle-closure', urgency: 'emergency' });
    expect(good.grade).toBe('S');
    expect(good.perfect).toBe(true);
    const bad = scoreCase({ ...base, diagnosisId: 'anterior-uveitis', urgency: 'routine' });
    expect(bad.diagnosisCorrect).toBe(false);
    expect(['D', 'F']).toContain(bad.grade);
  });

  it('case session emits lifecycle events', () => {
    const s = createServices();
    s.registries.cases.register(kase);
    const seen: string[] = [];
    s.bus.onAny((e) => seen.push(e));
    s.session.start(kase, 'shift');
    s.session.ask('h1');
    s.session.submit('acute-angle-closure', 'emergency');
    expect(seen).toEqual(['case:started', 'history:asked', 'diagnosis:submitted', 'case:completed']);
  });
});
