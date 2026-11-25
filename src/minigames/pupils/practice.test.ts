import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { anisocoria, lagEye } from './model';
import { makeChallenge, makeScenario, pickKind, PUPIL_KINDS, type PupilKind } from './practice';
import { report } from './report';
import { truthCall } from './scoring';

const BAD = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

describe('makeScenario: every kind is clinically coherent', () => {
  const make = (k: PupilKind, seed = 1) => makeScenario(createRng(seed), 0.5, k);
  it('normal: equal, no RAPD', () => {
    const f = make('normal').findings;
    expect(anisocoria(f).pattern).toBe('none');
    expect(f.pupils.rapd).toBe('none');
  });
  it('physiologic: same anisocoria light and dark, brisk, no ptosis', () => {
    for (let s = 1; s < 12; s++) {
      const f = make('physiologic', s).findings;
      const a = anisocoria(f);
      expect(a.pattern).toBe('physiologic');
      expect(Math.abs(a.light - a.dark)).toBeLessThan(0.3);
      expect(f.pupils.reactivity).toEqual({ OD: 'brisk', OS: 'brisk' });
      expect(f.external?.ptosis ?? []).toHaveLength(0);
    }
  });
  it('rapd: grade 1..4 on one side, equal pupils', () => {
    const grades = new Set<number>();
    for (let s = 1; s < 60; s++) {
      const f = make('rapd', s).findings;
      expect(['OD', 'OS']).toContain(f.pupils.rapd);
      expect(f.pupils.rapdGrade).toBeGreaterThanOrEqual(1);
      expect(f.pupils.rapdGrade).toBeLessThanOrEqual(4);
      expect(anisocoria(f).pattern).toBe('none');
      grades.add(f.pupils.rapdGrade!);
    }
    expect(grades.size).toBe(4);
  });
  it('horner: small pupil worse in the dark, ptosis on the same side, dilation lag', () => {
    for (let s = 1; s < 12; s++) {
      const f = make('horner', s).findings;
      const a = anisocoria(f);
      expect(a.pattern).toBe('greater-dark');
      expect(a.dark).toBeGreaterThan(a.light);
      expect(f.external?.ptosis).toContain(a.smaller);
      expect(lagEye(f)).toBe(a.smaller);
    }
  });
  it('adie: large tonic pupil worse in the light, with light-near dissociation', () => {
    for (let s = 1; s < 12; s++) {
      const f = make('adie', s).findings;
      const a = anisocoria(f);
      expect(a.pattern).toBe('greater-light');
      expect(f.pupils.reactivity[a.larger!]).toBe('tonic');
      expect(f.pupils.nearResponse).toBe('light-near-dissociation');
    }
  });
  it('cn3: large fixed pupil with ptosis', () => {
    const f = make('cn3').findings;
    const a = anisocoria(f);
    expect(a.pattern).toBe('greater-light');
    expect(f.pupils.reactivity[a.larger!]).toBe('fixed');
    expect(f.external?.ptosis).toContain(a.larger);
  });
  it('pharm: large fixed pupil without ptosis', () => {
    const f = make('pharm').findings;
    const a = anisocoria(f);
    expect(f.pupils.reactivity[a.larger!]).toBe('fixed');
    expect(f.external?.ptosis ?? []).toHaveLength(0);
  });
  it('lnd: poor light reaction in both eyes but near response preserved', () => {
    for (let s = 1; s < 10; s++) {
      const f = make('lnd', s).findings;
      expect(f.pupils.nearResponse).toBe('light-near-dissociation');
      expect(f.pupils.reactivity.OD).toBe('sluggish');
    }
  });
  it('all kinds produce a patient, a teaching answer, a chart, and no forbidden words', () => {
    for (const k of PUPIL_KINDS) {
      const sc = make(k);
      expect(sc.patient.name.length).toBeGreaterThan(3);
      expect(sc.answer.length).toBeGreaterThan(30);
      const text = JSON.stringify([sc.answer, report(sc.findings, sc.patient), makeChallenge(sc.findings, createRng(3))]);
      expect(text).not.toMatch(BAD);
    }
  });
  it('is deterministic for a seed', () => {
    expect(JSON.stringify(makeScenario(createRng(9), 0.4))).toBe(JSON.stringify(makeScenario(createRng(9), 0.4)));
  });
});

describe('difficulty weighting', () => {
  const share = (d: number, k: PupilKind) => {
    const rng = createRng(77);
    let n = 0;
    for (let i = 0; i < 3000; i++) if (pickKind(rng, d) === k) n++;
    return n / 3000;
  };
  it('easy runs lean normal, hard runs lean towards subtle patterns', () => {
    expect(share(0, 'normal')).toBeGreaterThan(share(1, 'normal') * 1.5);
    expect(share(1, 'horner')).toBeGreaterThan(share(0, 'horner'));
    expect(share(1, 'adie')).toBeGreaterThan(share(0, 'adie'));
    expect(share(1, 'cn3')).toBeGreaterThan(share(0, 'cn3'));
  });
  it('every kind remains reachable at both extremes', () => {
    for (const d of [0, 1]) for (const k of PUPIL_KINDS) expect(share(d, k)).toBeGreaterThan(0.01);
  });
  it('clamps out-of-range difficulty', () => {
    const rng = createRng(1);
    expect(PUPIL_KINDS).toContain(pickKind(rng, -3));
    expect(PUPIL_KINDS).toContain(pickKind(rng, 9));
  });
});

describe('makeChallenge', () => {
  it('RAPD cases ask which side; the keyed answer matches the truth', () => {
    for (let s = 1; s < 20; s++) {
      const sc = makeScenario(createRng(s), 0.5, 'rapd');
      const c = makeChallenge(sc.findings, createRng(s));
      expect(c.question).toMatch(/swinging/i);
      const t = truthCall(sc.findings).side;
      expect(c.options[c.correct]).toContain(t === 'OD' ? 'right' : 'left');
      expect(c.explain).toMatch(/dilated/);
    }
  });
  it('normal pupils: the answer is "No RAPD"', () => {
    const sc = makeScenario(createRng(2), 0.5, 'normal');
    const c = makeChallenge(sc.findings, createRng(2));
    expect(c.options[c.correct]).toBe('No RAPD');
  });
  it('Horner asks for the smaller pupil; Adie/CN3 ask for the larger', () => {
    for (let s = 1; s < 10; s++) {
      const h = makeScenario(createRng(s), 0.5, 'horner');
      const a = anisocoria(h.findings);
      const ch = makeChallenge(h.findings, createRng(s));
      expect(ch.question).toMatch(/dark/);
      expect(ch.options[ch.correct]).toContain(a.smaller === 'OD' ? 'Right' : 'Left');
      const ad = makeScenario(createRng(s), 0.5, 'adie');
      const aa = anisocoria(ad.findings);
      const ca = makeChallenge(ad.findings, createRng(s));
      expect(ca.question).toMatch(/light/);
      expect(ca.options[ca.correct]).toContain(aa.larger === 'OD' ? 'Right' : 'Left');
    }
  });
  it('light-near dissociation question is offered for symmetric poor reactors', () => {
    const sc = makeScenario(createRng(4), 0.5, 'lnd');
    const c = makeChallenge(sc.findings, createRng(4));
    expect(c.options[c.correct]).toBe('Light-near dissociation');
  });
  it('is always well-formed', () => {
    const rng = createRng(11);
    for (let i = 0; i < 100; i++) {
      const c = makeChallenge(makeScenario(rng, (i % 10) / 10).findings, rng);
      expect(new Set(c.options).size).toBe(c.options.length);
      expect(c.correct).toBeGreaterThanOrEqual(0);
      expect(c.correct).toBeLessThan(c.options.length);
      expect(c.explain.length).toBeGreaterThan(20);
    }
  });
});
