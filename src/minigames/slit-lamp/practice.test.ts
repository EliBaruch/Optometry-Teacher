import { describe, expect, it } from 'vitest';
import { createRng, EYES } from '@core';
import { makeFluoChallenge, makeFluoScenario } from './fluo-practice';
import { classify, makeSlitChallenge, makeSlitScenario, pickKind } from './practice';
import { buildSites } from './model';
import { KIND_INFO } from './teach';
import { report } from './report';
import { patternCredit, scoreFluo, tbutCredit, freshEye, techniqueCredit, tbutTolerance } from './fluo-model';

describe('slit-lamp practice scenarios', () => {
  it('are deterministic and varied', () => {
    const a = makeSlitScenario(createRng(5), 0.5);
    const b = makeSlitScenario(createRng(5), 0.5);
    expect(a.answer).toBe(b.answer);
    const kinds = new Set(Array.from({ length: 160 }, (_, i) => pickKind(createRng(i + 1), 0.5)));
    expect(kinds.size).toBeGreaterThanOrEqual(10);
  });
  it('are coherent: the classifier names what the generator built', () => {
    let mismatches = 0;
    for (let i = 1; i <= 300; i++) {
      const rng = createRng(i);
      const d = (i % 10) / 10;
      const sc = makeSlitScenario(rng, d);
      const label = KIND_INFO[classify(sc.findings)].label;
      if (!sc.answer.startsWith(label)) mismatches++;
      expect(sc.patient.name.length).toBeGreaterThan(2);
      for (const e of EYES) expect(buildSites(sc.findings, e, 7).length).toBeGreaterThan(0);
      expect(report(sc.findings).length).toBe(14);
    }
    expect(mismatches).toBe(0);
  });
  it('mixes normal and pathological eyes and gets harder', () => {
    const easy = Array.from({ length: 300 }, (_, i) => pickKind(createRng(i + 7), 0));
    const hard = Array.from({ length: 300 }, (_, i) => pickKind(createRng(i + 7), 1));
    const hardShare = (xs: string[]) => xs.filter((k) => ['keratoconus', 'narrow-angle', 'uveitis', 'viral', 'angle-closure', 'keratitis', 'dendrite'].includes(k)).length;
    expect(hardShare(hard)).toBeGreaterThan(hardShare(easy));
    expect(easy.includes('normal')).toBe(true);
  });
  it('builds well-formed challenges', () => {
    for (let i = 1; i <= 120; i++) {
      const sc = makeSlitScenario(createRng(i), (i % 10) / 10);
      const qs = makeSlitChallenge(sc.findings, createRng(i * 3));
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(q.options.length);
        expect(q.explain.length).toBeGreaterThan(10);
      }
      expect(qs[0]!.options[qs[0]!.correct]).toBe(KIND_INFO[classify(sc.findings)].label);
    }
  });
});

describe('fluorescein practice', () => {
  it('builds scenarios whose findings carry the stain and a TBUT', () => {
    const seen = new Set<string>();
    for (let i = 1; i <= 160; i++) {
      const sc = makeFluoScenario(createRng(i), (i % 10) / 10);
      for (const e of EYES) seen.add(sc.findings.anterior[e].fluorescein);
      expect(sc.findings.anterior.OD.tbutSec).toBeGreaterThan(0);
      const qs = makeFluoChallenge(sc.findings, createRng(i));
      for (const q of qs) {
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.correct).toBeLessThan(q.options.length);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });
});

describe('fluorescein scoring', () => {
  it('gives partial credit for confusable patterns', () => {
    expect(patternCredit('dendritic', 'dendritic')).toBe(1);
    expect(patternCredit('dendritic', 'round-ulcer')).toBeGreaterThan(0);
    expect(patternCredit('dendritic', 'none')).toBe(0);
    expect(patternCredit('none', null)).toBe(0);
  });
  it('accepts TBUT within tolerance and decays outside it', () => {
    expect(tbutCredit(6, [5.5, 6.4, 6])).toBe(1);
    expect(tbutCredit(6, [8.5])).toBeLessThan(1);
    expect(tbutCredit(6, [8.5])).toBeGreaterThan(0);
    expect(tbutCredit(6, [20])).toBe(0);
    expect(tbutCredit(6, [])).toBe(0);
    expect(tbutTolerance(20)).toBeGreaterThan(tbutTolerance(5));
  });
  it('scores technique and perfect runs', () => {
    const f = makeFluoScenario(createRng(3), 0.4).findings;
    const good = (e: 'OD' | 'OS') => ({ dyed: true, blinked: true, viewed: 3, pattern: f.anterior[e].fluorescein, tbut: [f.anterior[e].tbutSec ?? 12] });
    const s = scoreFluo(f, { OD: good('OD'), OS: good('OS') });
    expect(s.perfect).toBe(true);
    expect(s.accuracy).toBeCloseTo(1, 6);
    const none = scoreFluo(f, { OD: freshEye(), OS: freshEye() });
    expect(none.accuracy).toBe(0);
    expect(techniqueCredit(good('OD'))).toBeCloseTo(1, 6);
  });
});
