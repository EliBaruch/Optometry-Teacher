import { describe, expect, it } from 'vitest';
import { buildFindings, createRng, type Deviation, type Eye } from '@core';
import { turnToGaze, CoverSim, baseMatches, describe as desc, resolve, residual, truthOf, type Prism } from './model';
import { report, flagFor, pattern } from './report';
import { scoreCall, totalScore, prismCredit, techniqueScore } from './scoring';
import { makeChallenge, makeScenario } from './practice';

const sim = (dev: Deviation, seed = 1) => new CoverSim(resolve(dev), createRng(seed), 0.3);
const run = (s: CoverSim, sec: number) => { for (let i = 0; i < Math.round(sec * 100); i++) s.step(0.01); };
const cover = (s: CoverSim, c: Eye | null) => { s.setRawCover(c); };

describe('truth + wording', () => {
  it('resolves direction and magnitude', () => {
    expect(resolve({ horizontal: 12, vertical: 0, type: 'tropia', deviatingEye: 'OS' })).toMatchObject({ kind: 'tropia', dir: 'eso', mag: 12, eye: 'OS' });
    expect(resolve({ horizontal: -6, vertical: 0, type: 'phoria' })).toMatchObject({ kind: 'phoria', dir: 'exo', mag: 6 });
    expect(resolve({ horizontal: 0, vertical: -5, type: 'tropia', deviatingEye: 'OS' })).toMatchObject({ dir: 'hyperL' });
    expect(resolve({ horizontal: 0, vertical: 0, type: 'ortho' }).kind).toBe('ortho');
  });
  it('describes in chart wording', () => {
    expect(desc(resolve({ horizontal: 12, vertical: 0, type: 'tropia', deviatingEye: 'OS' }))).toBe('12Δ constant L esotropia');
    expect(desc(resolve({ horizontal: -4, vertical: 0, type: 'phoria' }))).toBe('4Δ exophoria');
    expect(desc(resolve({ horizontal: -25, vertical: 0, type: 'intermittent-tropia', deviatingEye: 'OD' }))).toBe('25Δ intermittent R exotropia');
    expect(desc(resolve({ horizontal: 0, vertical: 6, type: 'tropia', deviatingEye: 'OD' }))).toBe('6Δ constant R hypertropia');
    expect(desc(resolve({ horizontal: 3, vertical: 0, type: 'phoria' }))).toBe('3Δ esophoria');
  });
});

describe('prism', () => {
  it('neutralises with the right base', () => {
    const bo: Prism = { mag: 12, base: 'BO', eye: 'OD' };
    expect(residual(12, 0, bo).h).toBe(0);
    expect(residual(-12, 0, { ...bo, base: 'BI' }).h).toBe(0);
    expect(residual(0, 6, { mag: 6, base: 'BD', eye: 'OD' }).v).toBe(0);
    expect(residual(0, 6, { mag: 6, base: 'BU', eye: 'OS' }).v).toBe(0);
    expect(baseMatches('eso', bo)).toBe(true);
    expect(baseMatches('exo', bo)).toBe(false);
    expect(baseMatches('hyperL', { base: 'BD', eye: 'OS' })).toBe(true);
  });
});

describe('simulator', () => {
  it('esotropia: covering the fixing eye makes the deviated eye move OUT to fixate', () => {
    const s = sim({ horizontal: 16, vertical: 0, type: 'tropia', deviatingEye: 'OS' });
    expect(s.pos.OS.h).toBeCloseTo(16); // resting eso
    expect(s.pos.OD.h).toBe(0);
    cover(s, 'OD');
    run(s, 0.1);
    run(s, 1);
    expect(s.pos.OS.h).toBeCloseTo(0, 1);
    expect(s.lastMove).toMatchObject({ eye: 'OS' });
    expect(s.lastMove!.dh).toBeLessThan(0); // eso -> less eso = outward
  });
  it('exotropia moves IN, hypertropia moves DOWN', () => {
    const x = sim({ horizontal: -14, vertical: 0, type: 'tropia', deviatingEye: 'OD' });
    cover(x, 'OS'); run(x, 1);
    expect(x.lastMove!.dh).toBeGreaterThan(0); // exo -> toward 0 = inward
    const h = sim({ horizontal: 0, vertical: 8, type: 'tropia', deviatingEye: 'OD' });
    cover(h, 'OS'); run(h, 1);
    expect(h.lastMove!.dv).toBeLessThan(0); // up -> 0 = down
  });
  it('phoria: no movement of the uncovered eye; covered eye recovers on uncover', () => {
    const s = sim({ horizontal: 8, vertical: 0, type: 'phoria' });
    cover(s, 'OD'); run(s, 1);
    expect(s.lastMove).toBeNull(); // the other eye never moved
    expect(s.pos.OS.h).toBe(0);
    expect(s.pos.OD.h).toBeCloseTo(8, 1); // drifted in behind the cover
    cover(s, null); run(s, 0.3);
    expect(s.cover).toBeNull();
    run(s, 1.2);
    expect(s.pos.OD.h).toBeCloseTo(0, 1);
  });
  it('alternate cover shows total deviation, and has no phantom uncover', () => {
    const s = sim({ horizontal: -10, vertical: 0, type: 'phoria' });
    cover(s, 'OD'); run(s, 1);
    cover(s, null); run(s, 0.05); cover(s, 'OS'); run(s, 1);
    expect(s.stats.uncovered.OD).toBe(0);
    expect(s.stats.alt).toBe(1);
    expect(s.pos.OD.h).toBeCloseTo(0, 1); // refixated
    expect(s.pos.OS.h).toBeCloseTo(-10, 1);
  });
  it('prism neutralises the alternate-cover movement and overshoot reverses it', () => {
    const s = sim({ horizontal: 10, vertical: 0, type: 'phoria' });
    s.setPrism({ mag: 10, base: 'BO', eye: 'OS' });
    cover(s, 'OD'); run(s, 1);
    expect(Math.abs(s.pos.OD.h)).toBeLessThan(0.1);
    expect(s.stats.neutralised).toBe(true);
    s.setPrism({ mag: 16, base: 'BO', eye: 'OS' });
    run(s, 1);
    expect(s.pos.OD.h).toBeCloseTo(-6, 1); // reversed
    expect(s.stats.overshot).toBe(true);
  });
  it('wrong base makes it worse', () => {
    const s = sim({ horizontal: 10, vertical: 0, type: 'phoria' });
    s.setPrism({ mag: 6, base: 'BI', eye: 'OS' });
    cover(s, 'OD'); run(s, 1);
    expect(s.pos.OD.h).toBeCloseTo(16, 1);
    expect(s.stats.neutralised).toBe(false);
  });
  it('intermittent tropia: control breaks after occlusion then recovers', () => {
    const s = sim({ horizontal: -20, vertical: 0, type: 'intermittent-tropia', deviatingEye: 'OD' });
    expect(s.pos.OD.h).toBe(0);
    cover(s, 'OD'); run(s, 1.5);
    cover(s, null); run(s, 0.7);
    expect(Math.abs(s.pos.OD.h)).toBeGreaterThan(10); // manifest
    run(s, 4);
    expect(Math.abs(s.pos.OD.h)).toBeLessThan(0.5); // regained fusion
  });
  it('alternating tropia keeps fixation with the last eye', () => {
    const s = sim({ horizontal: 20, vertical: 0, type: 'tropia', deviatingEye: 'alternating' });
    cover(s, 'OD'); run(s, 1);
    cover(s, null); run(s, 1);
    expect(s.fix).toBe('OS');
    expect(s.pos.OD.h).toBeCloseTo(20, 1);
  });
});

describe('report', () => {
  it('flags normal, abnormal, critical', () => {
    const f = buildFindings(30);
    const r = report(f);
    expect(r[0]).toMatchObject({ label: 'Cover test (distance)', value: 'Orthophoria (no deviation)', flag: 'normal' });
    expect(r[1]).toMatchObject({ label: 'Cover test (near)', value: '2Δ exophoria', flag: 'normal' });
    const e = buildFindings(5, { motility: { distance: { horizontal: 12, vertical: 0, type: 'tropia', deviatingEye: 'OS' } } });
    expect(report(e)[0]).toMatchObject({ value: '12Δ constant L esotropia', eye: 'OS', flag: 'abnormal' });
    expect(flagFor({ horizontal: 12, vertical: 0, type: 'tropia', deviatingEye: 'OS' }, 'distance', 'horizontal')).toBe('critical');
    expect(flagFor({ horizontal: -12, vertical: 0, type: 'phoria' }, 'distance', 'none')).toBe('abnormal');
    expect(flagFor({ horizontal: -12, vertical: 0, type: 'phoria' }, 'near', 'none')).toBe('abnormal');
    expect(flagFor({ horizontal: -6, vertical: 0, type: 'phoria' }, 'near', 'none')).toBe('normal');
  });
  it('names distance/near patterns', () => {
    expect(pattern(resolve({ horizontal: 8, vertical: 0, type: 'tropia', deviatingEye: 'OD' }), resolve({ horizontal: 25, vertical: 0, type: 'tropia', deviatingEye: 'OD' }))).toMatch(/convergence excess/);
    expect(pattern(resolve({ horizontal: -2, vertical: 0, type: 'phoria' }), resolve({ horizontal: -16, vertical: 0, type: 'phoria' }))).toMatch(/convergence insufficiency/);
    expect(pattern(resolve({ horizontal: -3, vertical: 0, type: 'phoria' }), resolve({ horizontal: -5, vertical: 0, type: 'phoria' }))).toBeNull();
  });
});

describe('scoring', () => {
  const truth = resolve({ horizontal: 12, vertical: 0, type: 'tropia', deviatingEye: 'OS' });
  const good = { kind: 'tropia' as const, dir: 'eso' as const, eye: 'OS' as const, prism: { mag: 12, base: 'BO' as const, eye: 'OS' as const } };
  it('perfect call', () => { expect(scoreCall(truth, good)).toMatchObject({ score: 1, perfect: true }); });
  it('wrong base or eye costs points', () => {
    expect(scoreCall(truth, { ...good, prism: { ...good.prism, base: 'BI' } }).score).toBeLessThan(0.7);
    expect(scoreCall(truth, { ...good, eye: 'OD' }).score).toBeCloseTo(0.85);
    expect(scoreCall(truth, { ...good, kind: 'intermittent' }).score).toBeCloseTo(0.82);
  });
  it('prism tolerance', () => { expect(prismCredit(2)).toBe(1); expect(prismCredit(6)).toBe(0.5); expect(prismCredit(12)).toBe(0); });
  it('untested target costs a quarter, not half', () => {
    const stats = (() => { const s = sim({ horizontal: 12, vertical: 0, type: 'tropia', deviatingEye: 'OS' }); return s.stats; })();
    const one = totalScore([truth, truth], [good, null], [{ ...stats, held: { OD: 1, OS: 1 }, uncovered: { OD: 1, OS: 0 }, alt: 3, prismUsed: true, neutralised: true }, null]);
    expect(one.accuracy).toBeGreaterThan(0.7);
    expect(one.perfect).toBe(false);
    expect(techniqueScore(null, truth)).toBe(0);
  });
});

describe('practice', () => {
  it('generates coherent scenarios across seeds and difficulties', () => {
    const kinds = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const rng = createRng(seed);
      const sc = makeScenario(rng, (seed % 10) / 10);
      const t = truthOf(sc.findings, 'distance');
      kinds.add(`${t.kind}-${t.dir}`);
      expect(sc.answer.length).toBeGreaterThan(10);
      expect(sc.patient.avatar).toBeTruthy();
      const rep = report(sc.findings);
      expect(rep.length).toBeGreaterThanOrEqual(2);
      const ch = makeChallenge(sc.findings, createRng(seed));
      expect(ch.options).toHaveLength(4);
      expect(new Set(ch.options).size).toBe(4);
      expect(ch.correct).toBeGreaterThanOrEqual(0);
      expect(ch.options[ch.correct]).toBeTruthy();
    }
    expect(kinds.size).toBeGreaterThan(5);
  });
  it('contains no forbidden words', () => {
    const txt = JSON.stringify([...Array(30)].map((_, i) => { const sc = makeScenario(createRng(i), 0.5); return [sc.answer, makeChallenge(sc.findings, createRng(i))]; }));
    expect(txt).not.toMatch(/\b(sin|sins|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i);
  });
});

describe('rest position shows a tropia without any cover', () => {
  it('constant distance tropia is already deviated at rest (sixth-nerve esotropia, OS)', () => {
    const s = sim({ horizontal: 20, vertical: 0, type: 'tropia', deviatingEye: 'OS' });
    expect(s.pos.OS.h).toBeCloseTo(20);
    expect(s.pos.OD.h).toBe(0);
    expect(Math.abs(turnToGaze('OS', s.pos.OS.h, 0).x)).toBeGreaterThan(0.05);
    expect(turnToGaze('OD', s.pos.OD.h, 0).x).toBe(0);
  });
});
