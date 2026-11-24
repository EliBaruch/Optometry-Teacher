import { describe, expect, it } from 'vitest';
import { buildFindings, createRng, type PatientProfile } from '@core';
import { ETDRS, SNELLEN, expectedLevel, expectedLineIndex, lineSymbols, defaultOptotype, canUseOptotype } from './charts';
import { acuityFlag, chartValue, formatFeet, formatMetric, formatLogmar2, lowVisionLevel, snellenFeet } from './notation';
import { binocularLogmar, defocusShape, effectiveLogmar, eyeBlur, pinholeImproves, pinholeLogmar, viewBlur } from './optics';
import { readLine } from './reader';
import { reportAcuity, reportPinhole } from './report';
import { combineAcuity, scorePinhole, scoreRecord, timeFactor, type AcuityRecord } from './scoring';
import { acuityPractice, blurStrength, buildScenario, combineLogmar, defocusLogmar, pinholePractice, type Archetype } from './practice';

const patient = (age = 40): PatientProfile => ({
  name: 'Test', age, sex: 'F',
  avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' },
});

describe('notation', () => {
  it('converts logMAR to Snellen feet and metres', () => {
    expect(formatFeet(0)).toBe('20/20');
    expect(formatFeet(0.3)).toBe('20/40');
    expect(formatFeet(1)).toBe('20/200');
    expect(formatFeet(1.1)).toBe('20/250');
    expect(formatFeet(-0.1)).toBe('20/16');
    expect(formatMetric(0.3)).toBe('6/12');
    expect(formatMetric(1.0)).toBe('6/60');
    expect(snellenFeet(0.6)).toBe(80);
  });
  it('uses the low-vision ladder beyond the chart', () => {
    expect(lowVisionLevel(1.3)).toBeNull();
    expect(lowVisionLevel(1.9)).toBe('CF');
    expect(lowVisionLevel(2.3)).toBe('HM');
    expect(lowVisionLevel(2.7)).toBe('LP');
    expect(lowVisionLevel(3.5)).toBe('NLP');
    expect(chartValue(1.9)).toMatch(/^CF/);
  });
  it('formats logMAR with a true minus sign', () => {
    expect(formatLogmar2(-0.1)).toBe('−0.10');
    expect(formatLogmar2(0.3)).toBe('0.30');
    expect(chartValue(0.3)).toBe('20/40 (6/12) · logMAR 0.30');
  });
  it('flags abnormal worse than 20/40 and critical at 20/200 or worse', () => {
    expect(acuityFlag(0.3, 40)).toBe('normal');
    expect(acuityFlag(0.4, 40)).toBe('abnormal');
    expect(acuityFlag(0.9, 40)).toBe('abnormal');
    expect(acuityFlag(1.0, 40)).toBe('critical');
    expect(acuityFlag(1.9, 40)).toBe('critical');
    expect(acuityFlag(0.4, 3)).toBe('normal'); // 20/50 passes at age 3
  });
});

describe('charts', () => {
  it('Snellen lines run 20/400 → 20/10 with 1 → 8 optotypes', () => {
    expect(SNELLEN[0]!.label).toBe('20/400');
    expect(SNELLEN[0]!.count).toBe(1);
    expect(SNELLEN.at(-1)!.label).toBe('20/10');
    expect(SNELLEN.find((l) => l.feet === 40)!.metric).toBe('6/12');
  });
  it('ETDRS has 5 letters per 0.1 logMAR line', () => {
    expect(ETDRS).toHaveLength(14);
    expect(ETDRS.every((l) => l.count === 5)).toBe(true);
    expect(ETDRS[0]!.logmar).toBe(1);
    expect(ETDRS.at(-1)!.logmar).toBe(-0.3);
  });
  it('finds the threshold line with a small rounding tolerance', () => {
    expect(SNELLEN[expectedLineIndex(SNELLEN, 0.48)]!.label).toBe('20/60');
    expect(SNELLEN[expectedLineIndex(SNELLEN, 0.5)]!.label).toBe('20/60');
    expect(SNELLEN[expectedLineIndex(SNELLEN, 0.9)]!.label).toBe('20/200');
    expect(ETDRS[expectedLineIndex(ETDRS, 0.3)]!.logmar).toBe(0.3);
    expect(expectedLineIndex(ETDRS, 1.2)).toBe(-1);
    expect(expectedLevel(ETDRS, 1.9)).toBe(-1); // CF
    expect(expectedLevel(ETDRS, 2.3)).toBe(-2); // HM
  });
  it('makes deterministic lines with no adjacent repeats', () => {
    const a = lineSymbols('etdrs', 'letters', 5, 42);
    expect(a).toEqual(lineSymbols('etdrs', 'letters', 5, 42));
    expect(a).toHaveLength(5);
    for (let i = 1; i < a.length; i++) expect(a[i]).not.toBe(a[i - 1]);
    const s = lineSymbols('snellen', 'letters', 10, 7);
    expect(s).toHaveLength(8);
  });
  it('picks age-appropriate optotypes', () => {
    expect(defaultOptotype(3)).toBe('lea');
    expect(defaultOptotype(5)).toBe('tumbling-e');
    expect(defaultOptotype(30)).toBe('letters');
    expect(canUseOptotype(3, 'letters')).toBe(false);
  });
});

describe('reader', () => {
  const run = (t: number, index: number, seed: number, lines = ETDRS, difficulty = 0.5) =>
    readLine({ lines, index, symbols: lineSymbols(lines === ETDRS ? 'etdrs' : 'snellen', 'letters', index, seed), trueLogmar: t, optotype: 'letters', age: 40, knowsOptotype: true, difficulty, rng: createRng(seed) });

  it('passes every line at or above threshold and fails the next one down', () => {
    for (let seed = 1; seed < 200; seed++) {
      const t = [0, 0.3, 0.5, 0.7, 1.0][seed % 5]!;
      const exp = expectedLineIndex(ETDRS, t);
      for (let i = 0; i <= exp; i++) expect(run(t, i, seed).passed).toBe(true);
      if (exp + 1 < ETDRS.length) expect(run(t, exp + 1, seed, ETDRS, 1).passed).toBe(false);
    }
  });
  it('makes characteristic errors near threshold on the Snellen chart too', () => {
    let misses = 0;
    for (let seed = 1; seed < 100; seed++) {
      const exp = expectedLineIndex(SNELLEN, 0.3);
      const r = run(0.3, exp, seed, SNELLEN, 1);
      expect(r.passed).toBe(true);
      misses += r.correct.filter((c) => !c).length;
      const below = run(0.3, exp + 1, seed, SNELLEN, 1);
      expect(below.passed).toBe(false);
    }
    expect(misses).toBeGreaterThan(0);
  });
  it('wrong answers really are wrong', () => {
    const r = run(0.3, expectedLineIndex(ETDRS, 0.3) + 1, 3);
    r.said.forEach((s, i) => expect(s === lineSymbols('etdrs', 'letters', expectedLineIndex(ETDRS, 0.3) + 1, 3)[i]).toBe(r.correct[i]));
  });
  it('handles covered eyes and unknown optotypes', () => {
    const dark = readLine({ lines: ETDRS, index: 0, symbols: ['C'], trueLogmar: null, optotype: 'letters', age: 40, knowsOptotype: true, difficulty: 0, rng: createRng(1) });
    expect(dark.kind).toBe('dark');
    const kid = readLine({ lines: ETDRS, index: 0, symbols: ['C'], trueLogmar: 0, optotype: 'letters', age: 3, knowsOptotype: false, difficulty: 0, rng: createRng(1) });
    expect(kid.kind).toBe('unknown-optotype');
    expect(kid.passed).toBe(false);
  });
});

describe('optics', () => {
  it('blurs a myope, keeps a normal eye sharp', () => {
    const f = buildFindings(30, { va: { OD: { uncorrected: 0.9, bestCorrected: -0.1 } }, refraction: { OD: { sphere: -2, cylinder: 0, axis: 180 } } });
    expect(eyeBlur(f, 'OD').major).toBeGreaterThan(3);
    expect(eyeBlur(f, 'OS').major).toBe(0);
  });
  it('astigmatism blurs directionally, mirrored into the patient view', () => {
    const wtr = defocusShape({ sphere: 0, cylinder: -2, axis: 180 }, 0);
    expect(wtr.major).toBeGreaterThan(wtr.minor * 2);
    expect(wtr.angle).toBe(90); // −2.00 × 180: vertical meridian defocused → vertical smear
    const oblique = defocusShape({ sphere: 0, cylinder: -2, axis: 45 }, 0);
    expect(oblique.angle).toBe(45); // error at 135 (examiner) → 45° as the patient sees it
    const sph = defocusShape({ sphere: -2, cylinder: 0, axis: 180 }, 0);
    expect(sph.major).toBeCloseTo(sph.minor);
  });
  it('pinhole clears refractive blur but not pathology', () => {
    const myope = buildFindings(25, { va: { OD: { uncorrected: 1.0, bestCorrected: -0.1, pinhole: undefined } } });
    delete (myope.va.OD as { pinhole?: number }).pinhole;
    expect(pinholeLogmar(myope, 'OD')).toBeLessThan(0.35);
    expect(pinholeImproves(myope, 'OD')).toBe(true);
    expect(eyeBlur(myope, 'OD', true).major).toBeLessThan(eyeBlur(myope, 'OD').major / 4);
    const amd = buildFindings(80, { va: { OD: { uncorrected: 0.8, bestCorrected: 0.7, pinhole: 0.8 } } });
    expect(pinholeImproves(amd, 'OD')).toBe(false);
    expect(eyeBlur(amd, 'OD', true).major).toBeGreaterThan(1);
  });
  it('binocular viewing follows the better eye', () => {
    const f = buildFindings(30, { va: { OD: { uncorrected: 0.8 }, OS: { uncorrected: 0 } } });
    expect(effectiveLogmar(f, { OD: true, OS: true })).toBe(0);
    expect(effectiveLogmar(f, { OD: true, OS: false })).toBe(0.8);
    expect(effectiveLogmar(f, { OD: false, OS: false })).toBeNull();
    expect(binocularLogmar(0.1, 0.1)).toBeCloseTo(0.06);
    expect(viewBlur(f, { OD: false, OS: false }).dark).toBe(true);
  });
});

describe('report', () => {
  it('writes VA sc per eye with flags', () => {
    const f = buildFindings(40, { va: { OD: { uncorrected: 0.6 }, OS: { uncorrected: 1.0 } } });
    const r = reportAcuity(f, patient());
    expect(r).toEqual([
      { label: 'VA sc', value: '20/80 (6/24) · logMAR 0.60', eye: 'OD', flag: 'abnormal' },
      { label: 'VA sc', value: '20/200 (6/60) · logMAR 1.00', eye: 'OS', flag: 'critical' },
    ]);
  });
  it('flags a 2-line interocular difference in a child', () => {
    const f = buildFindings(6, { va: { OD: { uncorrected: 0 }, OS: { uncorrected: 0.3 } } });
    expect(reportAcuity(f, patient(6)).map((x) => x.flag)).toEqual(['normal', 'abnormal']);
  });
  it('writes PH improves / NI / not needed', () => {
    const f = buildFindings(70, { va: { OD: { uncorrected: 0.7, pinhole: 0.1 }, OS: { uncorrected: 0.0 } } });
    const amd = buildFindings(80, { va: { OD: { uncorrected: 0.8, pinhole: 0.8 } } });
    const r = reportPinhole(f, patient(70));
    expect(r[0]).toEqual({ label: 'PH', value: '20/25 (6/7.5) · improves from 20/100', eye: 'OD', flag: 'normal' });
    expect(r[1]!.value).toMatch(/^not needed/);
    expect(reportPinhole(amd, patient(80))[0]).toEqual({ label: 'PH', value: 'NI · 20/125 (6/38)', eye: 'OD', flag: 'abnormal' });
  });
});

describe('scoring', () => {
  const rec = (o: Partial<AcuityRecord>): AcuityRecord => ({ slot: 'OD', chart: 'etdrs', level: 7, open: { OD: true, OS: false }, read: true, belowChecked: true, ...o });
  it('rewards the exact line with correct occlusion', () => {
    const s = scoreRecord(rec({}), 0.3, ETDRS);
    expect(s.steps).toBe(0);
    expect(s.score).toBe(1);
  });
  it('penalises one-line misses and missing occlusion', () => {
    expect(scoreRecord(rec({ level: 6 }), 0.3, ETDRS).score).toBeCloseTo(0.55);
    expect(scoreRecord(rec({ open: { OD: true, OS: true } }), 0.3, ETDRS).score).toBeCloseTo(0.45);
    expect(scoreRecord(rec({ open: { OD: false, OS: true } }), 0.3, ETDRS).score).toBeCloseTo(0.25);
    expect(scoreRecord(rec({ read: false }), 0.3, ETDRS).score).toBeCloseTo(0.85);
  });
  it('combines eyes, time and perfection', () => {
    const od = rec({});
    const os = rec({ slot: 'OS', open: { OD: false, OS: true } });
    const scores = [scoreRecord(od, 0.3, ETDRS), scoreRecord(os, 0.3, ETDRS)];
    const c = combineAcuity(scores, ['OD', 'OS'], 30_000, [od, os]);
    expect(c.accuracy).toBe(1);
    expect(c.perfect).toBe(true);
    expect(combineAcuity(scores.slice(0, 1), ['OD', 'OS'], 30_000, [od]).accuracy).toBe(0.5);
    expect(timeFactor(400_000)).toBe(0.85);
  });
  it('scores pinhole verdicts and lines', () => {
    expect(scorePinhole([{ eye: 'OD', verdictCorrect: true, steps: 0 }], 10_000)).toEqual({ accuracy: 1, perfect: true });
    expect(scorePinhole([{ eye: 'OD', verdictCorrect: false, steps: null }], 10_000).accuracy).toBe(0);
  });
});

describe('practice', () => {
  it('maps defocus to acuity sensibly', () => {
    expect(defocusLogmar(0)).toBe(0);
    expect(defocusLogmar(1)).toBeCloseTo(0.5);
    expect(defocusLogmar(2)).toBeCloseTo(0.9);
    expect(blurStrength(2, 0, 10)).toBe(0); // a young hyperope accommodates it away
    expect(blurStrength(-1, 0, 10)).toBe(1);
    expect(combineLogmar(-0.1, 0)).toBeCloseTo(-0.1);
  });
  const kinds: Archetype[] = ['normal', 'myopia', 'hyperopia', 'astigmatism', 'amblyopia', 'preschool', 'cataract', 'amd', 'optic-neuritis', 'keratoconus'];
  it('builds coherent scenarios for every archetype', () => {
    for (const k of kinds) {
      for (let seed = 0; seed < 25; seed++) {
        const s = buildScenario(createRng(seed * 31 + k.length), k);
        for (const e of ['OD', 'OS'] as const) {
          const va = s.findings.va[e];
          expect(va.uncorrected).toBeGreaterThanOrEqual(va.bestCorrected - 1e-9);
          expect(pinholeLogmar(s.findings, e)).toBeLessThanOrEqual(va.uncorrected + 1e-9);
        }
        if (k === 'myopia') expect(s.findings.refraction.OD.sphere).toBeLessThan(0);
        if (k === 'amd' || k === 'optic-neuritis') expect(pinholeImproves(s.findings, 'OD') && pinholeImproves(s.findings, 'OS')).toBe(false);
        if (k === 'preschool') expect(s.patient.age).toBeLessThan(5);
      }
    }
  });
  it('practice() returns a patient, findings and an answer', () => {
    for (let i = 0; i < 30; i++) {
      const a = acuityPractice(createRng(i), i / 30);
      expect(a.answer).toMatch(/VA sc OD/);
      const p = pinholePractice(createRng(i + 100), i / 30);
      expect(p.answer).toMatch(/PH/);
      expect(p.patient.avatar).toBeTruthy();
    }
  });
});
