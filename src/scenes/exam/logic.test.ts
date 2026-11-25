import { describe, expect, it } from 'vitest';
import type { ClinicalCase, Diagnosis, MiniGameModule, MiniGameResult, RevealedFinding } from '@core';
import { buildFindings } from '@core';
import {
  boardOrder, chartKey, expressionFor, fmtClock, groupChart, groupHistory, moveSuspect, nextHint, orderInstruments, pinSuspect,
  runProgress, searchDiagnoses, techResult, timePressure, unpinSuspect, MAX_SUSPECTS,
} from './logic';

const kase = {
  id: 'test-case',
  difficulty: 2,
  tags: [],
  patient: { name: 'A', age: 40, sex: 'F', avatar: { skin: 1, hair: 'short', hairColor: '#000', irisColor: '#000', outfit: '#000' } },
  chiefComplaint: 'x',
  history: [
    { id: 'a', category: 'onset', q: 'a?', a: 'a', relevance: 'key' },
    { id: 'b', category: 'onset', q: 'b?', a: 'b', relevance: 'neutral' },
    { id: 'c', category: 'medical', q: 'c?', a: 'c', relevance: 'key' },
    { id: 'd', category: 'family', q: 'd?', a: 'd', relevance: 'red-herring' },
  ],
  findings: buildFindings(40, {}),
  essentialTests: ['tonometry', 'amsler'],
  helpfulTests: ['visual-acuity'],
  diagnosis: 'dx-a',
  differentials: ['dx-b', 'dx-c', 'dx-a'],
  urgency: 'soon',
  management: '',
  teachingPoints: [],
} as unknown as ClinicalCase;

const res = (testId: MiniGameResult['testId'], findings: RevealedFinding[]): MiniGameResult => ({ testId, accuracy: 1, timeMs: 1, findings });

describe('history', () => {
  it('groups by category in a stable order and keeps every question', () => {
    const g = groupHistory(kase);
    expect(g.map((x) => x.category)).toEqual(['onset', 'medical', 'family']);
    expect(g[0]!.questions).toHaveLength(2);
    expect(groupHistory(kase)).toEqual(g);
  });
});

describe('instruments', () => {
  it('orders by test category and drops unknown ids', () => {
    const mg = (id: string) => ({ id }) as unknown as MiniGameModule;
    const out = orderInstruments([mg('tonometry'), mg('nope'), mg('visual-acuity'), mg('amsler'), mg('keratometry')]);
    expect(out.map((m) => m.id)).toEqual(['visual-acuity', 'keratometry', 'amsler', 'tonometry']);
  });
  it('tech result is half-skill and flagged auto-run', () => {
    const mg = { id: 'tonometry', report: () => [{ label: 'IOP', value: '15', flag: 'normal' }] } as unknown as MiniGameModule;
    const r = techResult(mg, kase);
    expect(r.autoRun).toBe(true);
    expect(r.accuracy).toBe(0.5);
    expect(r.findings).toHaveLength(1);
  });
});

describe('expression', () => {
  it('pain for painful cases, relieved afterwards, worried otherwise', () => {
    expect(expressionFor(kase, false)).toBe('worried');
    expect(expressionFor({ ...kase, tags: ['painful'] }, false)).toBe('pain');
    expect(expressionFor({ ...kase, tags: ['painful'] }, true)).toBe('relieved');
  });
});

describe('chart grouping', () => {
  it('attributes each row to the test that last wrote it', () => {
    const iop: RevealedFinding = { label: 'IOP', value: '15', eye: 'OD', flag: 'normal' };
    const va: RevealedFinding = { label: 'VA', value: '20/20', eye: 'OD', flag: 'normal' };
    const done = { tonometry: res('tonometry', [iop]), 'visual-acuity': res('visual-acuity', [va]) };
    const g = groupChart([iop, va], done);
    expect(g.map((x) => x.testId)).toEqual(['tonometry', 'visual-acuity']);
    expect(chartKey(iop)).toBe('IOP|OD');
  });
});

describe('hints', () => {
  const available = new Set(['tonometry', 'amsler', 'visual-acuity'] as const);
  it('starts with a missing essential test, then walks down the list', () => {
    const given: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const h = nextHint({ kase, testsDone: {}, asked: [], available, given });
      if (!h) break;
      seen.push(h.id);
      given.push(h.id);
    }
    expect(seen[0]).toBe('test:tonometry');
    expect(seen).toContain('ask:onset');
    expect(seen).toContain('ask:medical');
    expect(seen).toContain('help:visual-acuity');
    expect(seen.at(-1)).toBe('final');
  });
  it('ignores tests that cannot be run and questions already asked', () => {
    const h = nextHint({ kase, testsDone: { tonometry: res('tonometry', []) }, asked: ['a', 'c'], available: new Set(['tonometry']), given: [] });
    expect(h?.id).toBe('final');
  });
  it('never mentions the answer', () => {
    const h = nextHint({ kase, testsDone: {}, asked: [], available, given: [] });
    expect(h?.text).not.toMatch(/dx-a/);
  });
});

describe('timing', () => {
  it('formats and builds pressure only late', () => {
    expect(fmtClock(75)).toBe('1:15');
    expect(fmtClock(-3)).toBe('0:00');
    expect(timePressure(10, 100)).toBe(0);
    expect(timePressure(100, 100)).toBe(1);
    expect(timePressure(80, 100)).toBeCloseTo(0.5);
    expect(timePressure(50, undefined)).toBe(0);
  });
  it('run progress counts finished patients', () => {
    const snap = { modeId: 'shift', completed: ['a'], failed: ['b'], totalScore: 0, lives: null, combo: 0, seed: '' };
    expect(runProgress(snap, { rules: { length: 5 } } as never)).toEqual({ index: 3, total: 5 });
    expect(runProgress(snap, { rules: { length: 'endless' } } as never)).toEqual({ index: 3, total: null });
    expect(runProgress(null, undefined)).toBeNull();
  });
});

describe('suspects', () => {
  it('caps at four, dedupes, reorders and removes', () => {
    let l: string[] = [];
    for (const id of ['a', 'b', 'c', 'd', 'e', 'a']) l = pinSuspect(l, id);
    expect(l).toEqual(['a', 'b', 'c', 'd']);
    expect(l.length).toBe(MAX_SUSPECTS);
    expect(moveSuspect(l, 0, 1)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveSuspect(l, 0, -1)).toEqual(l);
    expect(unpinSuspect(l, 'b')).toEqual(['a', 'c', 'd']);
  });
  it('searches by name, alias and category', () => {
    const dx = (id: string, name: string, aka?: string[]) => ({ id, name, aka, category: 'retina' }) as Diagnosis;
    const all = [dx('1', 'Wet AMD', ['neovascular']), dx('2', 'Cataract')];
    expect(searchDiagnoses(all, 'amd').map((d) => d.id)).toEqual(['1']);
    expect(searchDiagnoses(all, 'neovasc').map((d) => d.id)).toEqual(['1']);
    expect(searchDiagnoses(all, '')).toHaveLength(2);
  });
});

describe('diagnosis board', () => {
  it('is deterministic, deduped and contains the answer', () => {
    const a = boardOrder(kase);
    expect(a).toEqual(boardOrder(kase));
    expect([...a].sort()).toEqual(['dx-a', 'dx-b', 'dx-c']);
  });
});
