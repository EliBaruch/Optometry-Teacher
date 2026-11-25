import { describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import { ETDRS, SNELLEN } from './charts';
import { pinholeExpected } from './report';
import { scoreRecord } from './scoring';
import { buildRecord, ladderRead, recordFull, LADDER_MIN, levelName, logKey, openFor, openKey, recordNotation, type LevelLog } from './session';

const log = (entries: [number, boolean, number, number][]): LevelLog =>
  new Map(entries.map(([lvl, passed, nCorrect, n]) => [lvl, { passed, nCorrect, n }]));

describe('session keys', () => {
  it('names viewing conditions', () => {
    expect(openKey({ OD: true, OS: true })).toBe('OU');
    expect(openKey({ OD: false, OS: true })).toBe('OS');
    expect(openKey({ OD: false, OS: false })).toBe('none');
    expect(logKey({ OD: true, OS: false }, 'etdrs', true)).toBe('OD|etdrs|ph');
    expect(openFor('OD')).toEqual({ OD: true, OS: false });
    expect(openFor('OU')).toEqual({ OD: true, OS: true });
  });
});

describe('buildRecord', () => {
  it('knows whether the line was read and the line below failed', () => {
    const l = log([[6, true, 5, 5], [7, true, 4, 5], [8, false, 2, 5]]);
    const r = buildRecord('OD', 'etdrs', 7, { OD: true, OS: false }, l, ETDRS.length);
    expect(r).toMatchObject({ read: true, belowChecked: true, level: 7 });
    expect(buildRecord('OD', 'etdrs', 6, { OD: true, OS: false }, l, ETDRS.length).belowChecked).toBe(false);
    expect(buildRecord('OD', 'etdrs', 8, { OD: true, OS: false }, l, ETDRS.length).read).toBe(false);
  });
  it('treats the bottom line as self-confirming', () => {
    const last = ETDRS.length - 1;
    const r = buildRecord('OS', 'etdrs', last, { OD: false, OS: true }, log([[last, true, 5, 5]]), ETDRS.length);
    expect(r.belowChecked).toBe(true);
  });
  it('proves NLP with a failed light test', () => {
    const r = buildRecord('OD', 'snellen', LADDER_MIN, { OD: true, OS: false }, log([[LADDER_MIN + 1, false, 0, 1]]), SNELLEN.length);
    expect(r.read).toBe(true);
    expect(buildRecord('OD', 'snellen', LADDER_MIN, { OD: true, OS: false }, undefined, SNELLEN.length).read).toBe(false);
  });
  it('feeds the scorer: an exact, proven, monocular threshold scores 1', () => {
    const idx = ETDRS.findIndex((x) => x.logmar === 0.3);
    const r = buildRecord('OD', 'etdrs', idx, { OD: true, OS: false }, log([[idx, true, 5, 5], [idx + 1, false, 1, 5]]), ETDRS.length);
    expect(scoreRecord(r, 0.3, ETDRS).score).toBe(1);
  });
});

describe('recordNotation', () => {
  const idx = SNELLEN.findIndex((x) => x.feet === 40);
  it('writes misses on the threshold line as −k', () => {
    expect(recordNotation(SNELLEN, idx, log([[idx, true, 5, 6]]))).toBe('20/40 −1');
  });
  it('writes letters read on the next line as +k', () => {
    expect(recordNotation(SNELLEN, idx, log([[idx, true, 6, 6], [idx + 1, false, 2, 6]]))).toBe('20/40 +2');
  });
  it('plain line, metric, and the ladder', () => {
    expect(recordNotation(SNELLEN, idx, log([[idx, true, 6, 6]]))).toBe('20/40');
    expect(recordNotation(SNELLEN, idx, undefined, true)).toBe('6/12');
    expect(recordNotation(SNELLEN, -1, undefined)).toBe('CF');
    expect(recordNotation(SNELLEN, -3, undefined)).toBe('LP');
    expect(levelName(SNELLEN, -2)).toBe('Hand motion');
    expect(levelName(SNELLEN, idx)).toBe('20/40 line');
  });
});

describe('recordFull', () => {
  it('adds the metric fraction, and logMAR on the ETDRS chart', () => {
    const i = SNELLEN.findIndex((x) => x.feet === 40);
    expect(recordFull(SNELLEN, i, log([[i, true, 5, 6]]), 'snellen')).toBe('20/40 −1 (6/12 −1)');
    const e = ETDRS.findIndex((x) => x.logmar === 0.3);
    expect(recordFull(ETDRS, e, undefined, 'etdrs')).toBe('20/40 (6/12) · logMAR 0.30');
    expect(recordFull(ETDRS, -2, undefined, 'etdrs')).toBe('HM');
  });
});

describe('ladderRead', () => {
  const rng = () => createRng(5);
  it('counts fingers only when acuity allows', () => {
    const cf = ladderRead(-1, 1.9, rng());
    expect(cf.passed).toBe(true);
    expect(cf.fingers).toBeGreaterThanOrEqual(1);
    expect(cf.text).toMatch(/fingers/);
    expect(ladderRead(-1, 2.3, rng()).passed).toBe(false);
  });
  it('hand motion, light, and the NLP inversion', () => {
    expect(ladderRead(-2, 2.3, rng()).passed).toBe(true);
    expect(ladderRead(-2, 2.7, rng()).passed).toBe(false);
    expect(ladderRead(-3, 2.7, rng()).passed).toBe(true);
    expect(ladderRead(-3, 3.0, rng()).passed).toBe(false);
    expect(ladderRead(LADDER_MIN, 3.0, rng()).passed).toBe(true);
    expect(ladderRead(LADDER_MIN, 2.7, rng()).passed).toBe(false);
  });
  it('a chart-reading eye passes every ladder step', () => {
    expect(ladderRead(-1, 0.2, rng()).passed).toBe(true);
    expect(ladderRead(-3, 0.2, rng()).passed).toBe(true);
  });
  it('both eyes covered sees nothing', () => {
    expect(ladderRead(-1, null, rng()).passed).toBe(false);
  });
});

describe('pinholeExpected', () => {
  it('not needed / improves / no improvement', () => {
    const f = buildFindings(50, {
      va: { OD: { uncorrected: 0.0 }, OS: { uncorrected: 0.8, bestCorrected: 0.0, pinhole: 0.1 } },
    });
    expect(pinholeExpected(f, 'OD')).toBe('not-needed');
    expect(pinholeExpected(f, 'OS')).toBe('improves');
    const amd = buildFindings(80, { va: { OD: { uncorrected: 0.8, bestCorrected: 0.7, pinhole: 0.8 } } });
    expect(pinholeExpected(amd, 'OD')).toBe('no-improvement');
  });
});
