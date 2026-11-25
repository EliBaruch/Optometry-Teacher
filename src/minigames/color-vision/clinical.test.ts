import { describe, expect, it } from 'vitest';
import { buildFindings, createRng, type PatientFindings } from '@core';
import { eyeCoverage, interpret, needsRedCap, redSaturationPct, report, scoreSession, typeCredit, type SessionLog } from './clinical';
import { BOOKLET } from './plates';
import { practiceScenario } from './practice';
import mod from './index';

const deutan = buildFindings(8, { colorVision: { OD: { type: 'deutan', severity: 'moderate' }, OS: { type: 'deutan', severity: 'moderate' } } });
const neuritis = buildFindings(29, {
  va: { OS: { uncorrected: 0.7, bestCorrected: 0.7 } },
  colorVision: { OS: { type: 'acquired-red-green', severity: 'moderate', redDesaturation: true } },
});
const normal = buildFindings(40);
const tritan = buildFindings(30, { colorVision: { OD: { type: 'tritan', severity: 'severe' }, OS: { type: 'tritan', severity: 'severe' } } });
const crao = buildFindings(70, {
  va: { OD: { uncorrected: 1.9, bestCorrected: 1.9 } },
  colorVision: { OD: { type: 'acquired-red-green', severity: 'severe' } },
});

const ALL = BOOKLET.map((_, i) => i);
const log = (answer: SessionLog['answer'], extra: Partial<SessionLog> = {}): SessionLog => ({
  shown: { OD: ALL, OS: ALL }, redCapDone: false, answer, timeMs: 60_000, ...extra,
});

describe('interpret', () => {
  it('classifies congenital, acquired and normal', () => {
    expect(interpret(normal)).toEqual({ type: 'normal', eye: null });
    expect(interpret(deutan)).toEqual({ type: 'deutan', eye: 'OU' });
    expect(interpret(tritan)).toEqual({ type: 'tritan', eye: 'OU' });
    expect(interpret(neuritis)).toEqual({ type: 'acquired', eye: 'OS' });
    expect(interpret(crao)).toEqual({ type: 'acquired', eye: 'OD' });
  });
  it('treats isolated red desaturation as an acquired sign', () => {
    const f = buildFindings(30, { colorVision: { OD: { type: 'normal', severity: 'none', redDesaturation: true } } });
    expect(interpret(f)).toEqual({ type: 'acquired', eye: 'OD' });
  });
});

describe('report', () => {
  it('writes a clean normal chart', () => {
    const lines = report(normal);
    expect(lines.filter((l) => l.label === 'Colour plates').map((l) => [l.eye, l.value, l.flag])).toEqual([
      ['OD', '10/10 (R-G 8/8, B-Y 2/2)', 'normal'],
      ['OS', '10/10 (R-G 8/8, B-Y 2/2)', 'normal'],
    ]);
    expect(lines.at(-1)).toEqual({ label: 'Colour vision', value: 'Normal colour vision', eye: 'OU', flag: 'normal' });
  });

  it('flags a congenital deutan as abnormal in both eyes', () => {
    const lines = report(deutan);
    const plates = lines.filter((l) => l.label === 'Colour plates');
    expect(plates.every((l) => l.flag === 'abnormal' && l.value.startsWith('2/10'))).toBe(true);
    expect(lines.at(-1)).toMatchObject({ value: 'Deutan defect, moderate (congenital red-green), both eyes', eye: 'OU', flag: 'abnormal' });
  });

  it('flags acquired red-green loss with red desaturation as critical in the affected eye', () => {
    const lines = report(neuritis);
    expect(lines.find((l) => l.label === 'Colour plates' && l.eye === 'OD')!.flag).toBe('normal');
    expect(lines.find((l) => l.label === 'Colour plates' && l.eye === 'OS')!.flag).toBe('critical');
    expect(lines.find((l) => l.label === 'Red desaturation')).toEqual({ label: 'Red desaturation', value: 'Red cap ≈ 45% of OD saturation', eye: 'OS', flag: 'critical' });
    expect(lines.at(-1)).toMatchObject({ value: 'Acquired red-green defect, moderate', eye: 'OS', flag: 'critical' });
  });

  it('reports a tritan as B-Y failures only', () => {
    expect(report(tritan)[0]!.value).toBe('8/10 (R-G 8/8, B-Y 0/2)');
  });

  it('records when acuity is too poor to read the plates', () => {
    expect(report(crao)[0]).toMatchObject({ eye: 'OD', value: 'Unable — demo plate not seen', flag: 'critical' });
  });

  it('module.report is the pure report', () => {
    expect(mod.report(deutan, { name: 'x', age: 8, sex: 'M', avatar: { skin: 1, hair: 'short', hairColor: '#000', irisColor: '#000', outfit: '#000' } })).toEqual(report(deutan));
  });

  it('never uses forbidden words or the brand name in chart text', () => {
    for (const f of [normal, deutan, neuritis, tritan, crao]) {
      for (const l of report(f)) expect(`${l.label} ${l.value}`).not.toMatch(/ishihara|sin\b|deadly|vice/i);
    }
  });
});

describe('technique scoring', () => {
  it('a complete, correct exam is perfect', () => {
    const s = scoreSession(deutan, log({ type: 'deutan', eye: 'OU' }));
    expect(s.perfect).toBe(true);
    expect(s.accuracy).toBeGreaterThan(0.98);
  });

  it('protan/deutan confusion earns half type credit', () => {
    expect(typeCredit('deutan', 'protan')).toBe(0.5);
    expect(typeCredit('acquired', 'deutan')).toBe(0);
  });

  it('acquired loss requires the red-cap comparison', () => {
    expect(needsRedCap(neuritis)).toBe(true);
    expect(needsRedCap(deutan)).toBe(false);
    const without = scoreSession(neuritis, log({ type: 'acquired', eye: 'OS' }));
    const withCap = scoreSession(neuritis, log({ type: 'acquired', eye: 'OS' }, { redCapDone: true, redCapMatch: 45 }));
    expect(withCap.accuracy).toBeGreaterThan(without.accuracy);
    expect(withCap.perfect).toBe(true);
    expect(without.perfect).toBe(false);
  });

  it('testing only one eye halves coverage', () => {
    const s = scoreSession(deutan, log({ type: 'deutan', eye: 'OU' }, { shown: { OD: ALL, OS: [] } }));
    expect(s.parts.coverage).toBeCloseTo(0.5);
    expect(eyeCoverage([0, 1, 2], false)).toBeCloseTo((1 + 2 / 3) / 4);
  });

  it('wrong eye for an acquired defect loses eye credit', () => {
    expect(scoreSession(neuritis, log({ type: 'acquired', eye: 'OD' })).parts.eye).toBe(0);
  });

  it('red saturation scales with severity', () => {
    expect(redSaturationPct({ type: 'normal', severity: 'none' })).toBe(100);
    expect(redSaturationPct({ type: 'acquired-red-green', severity: 'severe', redDesaturation: true })).toBe(25);
  });
});

describe('practice scenarios', () => {
  it('are coherent across difficulties', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 160; i++) {
      const d = (i % 5) / 4;
      const s = practiceScenario(createRng(i), d);
      const f: PatientFindings = s.findings;
      const t = interpret(f);
      seen.add(t.type);
      expect(s.answer.length).toBeGreaterThan(5);
      expect(s.patient.avatar).toBeTruthy();
      if (t.type === 'protan' || t.type === 'deutan' || t.type === 'tritan') {
        expect(f.colorVision.OD).toEqual(f.colorVision.OS); // congenital = symmetric
        expect(t.eye).toBe('OU');
      }
      if (t.type === 'acquired') {
        expect(t.eye === 'OD' || t.eye === 'OS').toBe(true);
        if (f.colorVision[t.eye as 'OD'].type === 'acquired-red-green') expect(f.pupils.rapd).toBe(t.eye);
      }
    }
    expect([...seen].sort()).toEqual(['acquired', 'deutan', 'normal', 'protan', 'tritan']);
  });

  it('module.practice produces a scenario', () => {
    const s = mod.practice!(createRng(5), 0.5);
    expect(s.findings.colorVision).toBeTruthy();
  });
});
