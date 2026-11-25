import { describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import { classifyMotility, convTruth, ConvSim, convergenceDeg, eyeGazeAt, misalignment, multiplierGrid, recoveryFor, trueGrid } from './model';
import { motilityScenario, convergenceScenario, classifyConvergence, motilityChallenge, convergenceChallenge } from './practice';
import { reportConvergence, reportMotility } from './report';
import { GAZE_IDS } from './model';
import { gradingScore, convergenceAccuracy, missedDeficitShare, motilityAccuracy } from './scoring';

describe('motility model', () => {
  it('normal findings give full equal gaze and no misalignment', () => {
    const f = buildFindings(30);
    const od = eyeGazeAt(multiplierGrid(f, 'OD'), 1, 0), os = eyeGazeAt(multiplierGrid(f, 'OS'), 1, 0);
    expect(od).toEqual(os);
    expect(misalignment(od, os).kind).toBeNull();
  });
  it('a CN6 abduction deficit shortens the abducting eye and makes horizontal diplopia', () => {
    const f = buildFindings(60, { motility: { versions: { left: { OS: -3 } } } });
    const od = eyeGazeAt(multiplierGrid(f, 'OD'), 1, 0), os = eyeGazeAt(multiplierGrid(f, 'OS'), 1, 0);
    expect(Math.abs(os.x)).toBeLessThan(Math.abs(od.x) * 0.6);
    expect(misalignment(od, os).kind).toBe('horizontal');
    // straight ahead is aligned: incomitant
    expect(misalignment(eyeGazeAt(multiplierGrid(f, 'OD'), 0, 0), eyeGazeAt(multiplierGrid(f, 'OS'), 0, 0)).kind).toBeNull();
  });
  it('overaction overshoots', () => {
    const f = buildFindings(30, { motility: { versions: { upLeft: { OD: 3 } } } });
    expect(Math.abs(eyeGazeAt(multiplierGrid(f, 'OD'), 1, -1).y)).toBeGreaterThan(Math.abs(eyeGazeAt(multiplierGrid(f, 'OS'), 1, -1).y));
  });
  it('practice scenarios classify back to their kind', () => {
    for (const k of ['normal', 'cn6', 'cn4', 'cn3', 'restrictive', 'pain'] as const) {
      for (let i = 0; i < 6; i++) {
        const s = motilityScenario(createRng(`m${k}${i}`), 0.5, k);
        expect(classifyMotility(s.findings).id).toBe(k);
      }
    }
  });
  it('random scenarios are coherent and the challenge contains the answer once', () => {
    for (let i = 0; i < 30; i++) {
      const rng = createRng(i);
      const s = motilityScenario(rng, i / 30);
      const c = motilityChallenge(s.findings, rng);
      expect(new Set(c.options).size).toBe(4);
      expect(c.options[c.correct]!.toLowerCase()).toContain(classifyMotility(s.findings).label.split(' ')[0]!);
    }
  });
});

describe('motility report', () => {
  it('normal', () => expect(reportMotility(buildFindings(30))[0]).toMatchObject({ label: 'Versions', flag: 'normal' }));
  it('CN6 case lines', () => {
    const f = buildFindings(64, { motility: { versions: { left: { OS: -3 } }, diplopia: 'horizontal', headPosture: 'turn-left' } });
    const r = reportMotility(f);
    expect(r.find((x) => x.label === 'Versions')).toMatchObject({ eye: 'OS', value: 'L −3', flag: 'abnormal' });
    expect(r.some((x) => x.label === 'Pattern' && x.value.startsWith('Abduction deficit OS'))).toBe(true);
    expect(r.some((x) => x.label === 'Diplopia')).toBe(true);
    expect(trueGrid(f).OS.left).toBe(-3);
  });
  it('pain on movement', () => {
    expect(reportMotility(buildFindings(30, { motility: { painOnMovement: true } })).some((x) => x.label === 'Pain on eye movement')).toBe(true);
  });
});

describe('convergence', () => {
  it('geometry', () => { expect(convergenceDeg(5)).toBeGreaterThan(30); expect(convergenceDeg(40)).toBeLessThan(5); });
  it('sim breaks and recovers with hysteresis', () => {
    const f = buildFindings(25, { motility: { npcCm: 12 } });
    const s = new ConvSim(convTruth(f, createRng(1), 0));
    expect(s.step(16, 20)).toBe('fused');
    expect(s.step(16, 11)).toBe('broken');
    expect(s.step(16, 14)).toBe('broken');
    expect(s.step(16, recoveryFor(12) + 0.1)).toBe('fused');
  });
  it('report flags receded NPC and low amplitude', () => {
    const f = buildFindings(25, { motility: { npcCm: 14 }, accommodation: { amplitudeD: { OD: 4, OS: 4 } } });
    const r = reportConvergence(f, { age: 25 } as never);
    expect(r[0]).toMatchObject({ label: 'NPC break', flag: 'abnormal' });
    expect(r.filter((x) => x.label === 'Accommodative amplitude').every((x) => x.flag === 'abnormal')).toBe(true);
    expect(reportConvergence(buildFindings(30), { age: 30 } as never).every((x) => x.flag === 'normal')).toBe(true);
  });
  it('scenarios classify as intended', () => {
    for (const k of ['normal', 'ci', 'ai', 'both'] as const) for (let i = 0; i < 8; i++) {
      const s = convergenceScenario(createRng(`c${k}${i}`), 0.6, k);
      expect(classifyConvergence(s.findings, s.patient.age)).toBe(k);
      const c = convergenceChallenge(s.findings, s.patient.age, createRng(i));
      expect(c.options).toHaveLength(4);
    }
  });
});

describe('scoring', () => {
  it('perfect grading is 1 and all-zero fails an abnormal case', () => {
    const f = buildFindings(50, { motility: { versions: { right: { OD: -3 } } } });
    const t = trueGrid(f);
    expect(gradingScore(t, t)).toBe(1);
    expect(gradingScore(trueGrid(buildFindings(50)), t)).toBeLessThan(0.8);
    expect(motilityAccuracy({ grading: 1, visited: 9, seconds: 30 })).toBeCloseTo(1);
  });
  it('convergence accuracy', () => {
    expect(convergenceAccuracy({ breakErr: 0, recoveryErr: 0, breakCm: 6, recoveryCm: 7.5, ampErrD: [0, 0], fastShare: 0, trials: 1 })).toBeCloseTo(1);
    expect(convergenceAccuracy({ breakErr: 8, recoveryErr: null, breakCm: 6, recoveryCm: 7.5, ampErrD: [], fastShare: 1, trials: 3 })).toBeLessThan(0.1);
  });
});

describe('missed deficits', () => {
  it('caps technique when an abnormal eye is graded as normal', () => {
    const truth = { OD: Object.fromEntries(GAZE_IDS.map((g) => [g, 0])), OS: Object.fromEntries(GAZE_IDS.map((g) => [g, 0])) } as unknown as Parameters<typeof missedDeficitShare>[1];
    (truth.OS as Record<string, number>)[GAZE_IDS[0]!] = -3;
    (truth.OS as Record<string, number>)[GAZE_IDS[1]!] = -2;
    const allZero = { OD: { ...truth.OD }, OS: Object.fromEntries(GAZE_IDS.map((g) => [g, 0])) } as typeof truth;
    expect(missedDeficitShare(allZero, truth)).toBe(1);
    expect(motilityAccuracy({ grading: 0.9, visited: 9, seconds: 30, missedShare: 1 })).toBeLessThanOrEqual(0.5);
    expect(missedDeficitShare(truth, truth)).toBe(0);
  });
});
