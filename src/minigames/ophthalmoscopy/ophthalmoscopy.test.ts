import { describe, expect, it } from 'vitest';
import { buildFindings, createRng, EYES, type DeepPartial, type PatientFindings } from '@core';
import { PICTURES, buildChallenge, classify, practiceScenario } from './practice';
import { report } from './report';
import {
  avBucket, cdrScore, discScore, effectiveCdr, focusBlur, focusNeeded, matchTag, scoreEye, scoreExam, scoreTags, seedFor, tolerance, truthFor,
  type EyeWork, type Tag,
} from './model';

const patient = { name: 'Test', age: 60, sex: 'F' as const, avatar: {} as never };
const withPost = (p: DeepPartial<PatientFindings['posterior']['OD']>, eye: 'OD' | 'OS' = 'OD') =>
  buildFindings(60, { posterior: { [eye]: p } } as DeepPartial<PatientFindings>);

describe('report()', () => {
  it('charts a normal exam with no abnormal flags', () => {
    const lines = report(buildFindings(40), patient);
    expect(lines.every((l) => l.flag === 'normal')).toBe(true);
    expect(lines.filter((l) => l.eye === 'OD').map((l) => l.label)).toEqual(['Red reflex', 'Cup:disc', 'Disc', 'Vessels', 'Macula', 'Periphery']);
  });
  it('flags glaucoma cupping and rim thinning', () => {
    const f = withPost({ disc: { cdr: 0.85, rimThinning: 'inferior' } });
    const cup = report(f, patient).find((l) => l.label === 'Cup:disc' && l.eye === 'OD')!;
    expect(cup.value).toContain('0.85');
    expect(cup.value).toContain('inferior rim thinning');
    expect(cup.flag).toBe('abnormal');
  });
  it('flags papilloedema as critical and the detachment line', () => {
    const f = withPost({ disc: { edema: true, margins: 'elevated', color: 'hyperemic', cdr: 0.1 } });
    expect(report(f, patient).find((l) => l.label === 'Disc' && l.eye === 'OD')!.flag).toBe('critical');
    const rd = withPost({ detachment: { zones: ['superotemporal'], maculaOff: true }, lesions: [{ type: 'retinal-tear', zone: 'superotemporal', density: 1 }] });
    const det = report(rd, patient).find((l) => l.label === 'Detachment')!;
    expect(det.flag).toBe('critical');
    expect(det.value).toContain('macula-off');
    expect(report(rd, patient).find((l) => l.label === 'Macula')!.flag).toBe('critical');
  });
  it('reports vessels and red reflex', () => {
    const f = buildFindings(60, { redReflex: { OS: 'leukocoria' }, posterior: { OD: { vessels: { avRatio: 0.45, avNicking: true, copperWiring: true } } } } as DeepPartial<PatientFindings>);
    const lines = report(f, patient);
    expect(lines.find((l) => l.label === 'Red reflex' && l.eye === 'OS')!.flag).toBe('critical');
    const v = lines.find((l) => l.label === 'Vessels' && l.eye === 'OD')!;
    expect(v.value).toContain('1:2');
    expect(v.value).toContain('copper wiring');
  });
  it('flags cup asymmetry of 0.2 or more in both eyes', () => {
    const f = buildFindings(60, { posterior: { OD: { disc: { cdr: 0.3 } }, OS: { disc: { cdr: 0.55 } } } } as DeepPartial<PatientFindings>);
    const cups = report(f, patient).filter((l) => l.label === 'Cup:disc');
    expect(cups.every((c) => c.flag === 'abnormal')).toBe(true);
  });
});

describe('scoring', () => {
  const f = withPost({
    lesions: [
      { type: 'cotton-wool-spot', zone: 'superotemporal', density: 2 },
      { type: 'hard-exudate', zone: 'inferotemporal', density: 2 },
    ],
  });
  const truth = truthFor(f, 'OD', seedFor('Test', 'OD'));
  const tol = tolerance(400, 1);
  const at = (kind: Tag['kind'], source: number): Tag => {
    const m = truth.map.lesions.find((x) => x.source === source)!;
    return { id: source, kind, x: m.x, y: m.y };
  };
  it('extracts one truth item per lesion entry plus a healthy-macula item', () => {
    expect(truth.items.map((i) => i.kind).sort()).toEqual(['cotton-wool-spot', 'hard-exudate', 'macula-ok']);
  });
  it('matches correct tags and rejects wrong types / empty space', () => {
    expect(matchTag(truth, at('cotton-wool-spot', 0), tol).quality).toBe(1);
    expect(matchTag(truth, at('hard-exudate', 0), tol).reason).toBe('wrong-type');
    expect(matchTag(truth, { kind: 'hard-exudate', x: 0.03, y: 0.03 }, tol).reason).toBe('empty');
  });
  it('gives perfect precision/recall for complete, correct tagging', () => {
    const m = truth.map.macula;
    const tags = [at('cotton-wool-spot', 0), at('hard-exudate', 1), { id: 9, kind: 'macula-ok' as const, x: m.x, y: m.y }];
    const s = scoreTags(truth, tags, tol);
    expect(s.recall).toBe(1);
    expect(s.precision).toBe(1);
    expect(s.missed).toHaveLength(0);
  });
  it('penalises false tags and ignores duplicates', () => {
    const s = scoreTags(truth, [at('cotton-wool-spot', 0), at('cotton-wool-spot', 0), { id: 5, kind: 'lattice', x: 0.04, y: 0.04 }], tol);
    expect(s.duplicates).toBe(1);
    expect(s.falseTags).toBe(1);
    expect(s.precision).toBeCloseTo(0.5);
    expect(s.recall).toBeCloseTo(1 / 3);
    expect(s.missed.length).toBe(2);
  });
  it('scores a macula-ok tag as false when the macula is abnormal', () => {
    const ab = truthFor(withPost({ lesions: [{ type: 'macular-hole', zone: 'macula', density: 3 }] }), 'OD', 5);
    expect(matchTag(ab, { kind: 'macula-ok', x: ab.map.fovea.x, y: ab.map.fovea.y }, 0.01).reason).toBe('macula-abnormal');
  });
  it('detachment tags use the detached region', () => {
    const rd = truthFor(withPost({ detachment: { zones: ['superotemporal', 'superonasal'], maculaOff: false } }), 'OD', 3);
    expect(rd.items.some((i) => i.kind === 'retinal-detachment')).toBe(true);
    expect(matchTag(rd, { kind: 'retinal-detachment', x: 0.5, y: 0.1 }, 0.01).quality).toBe(1);
    expect(matchTag(rd, { kind: 'retinal-detachment', x: 0.5, y: 0.8 }, 0.01).quality).toBe(0);
  });
  it('CDR scoring: gold within 0.05, nothing at 0.25 off', () => {
    expect(cdrScore(0.55, 0.6)).toBe(1);
    expect(cdrScore(0.3, 0.6)).toBe(0);
    expect(cdrScore(0.5, 0.6)).toBeCloseTo(0.75);
  });
  it('disc & exam scoring behave sensibly', () => {
    const truthDisc = { cdr: 0.8, color: 'pink' as const, margins: 'sharp' as const, rim: 'inferior' as const };
    expect(discScore(truthDisc, truthDisc).score).toBe(1);
    expect(discScore(null, truthDisc).score).toBe(0);
    const empty: EyeWork = { reflex: null, disc: null, vessels: null, vitreous: null, tags: [], misfires: 0 };
    const s0 = scoreEye(truth, empty, tol);
    expect(s0.complete).toBe(false);
    expect(scoreExam([s0], 1000).accuracy).toBeLessThan(0.3);
    const full: EyeWork = {
      reflex: 'normal', disc: { cdr: 0.3, color: 'pink', margins: 'sharp', rim: 'none' },
      vessels: { bucket: 'normal', nicking: false, copper: false, venous: false, segmentation: false }, vitreous: 'clear',
      tags: [at('cotton-wool-spot', 0), at('hard-exudate', 1), { id: 9, kind: 'macula-ok', x: truth.map.macula.x, y: truth.map.macula.y }], misfires: 0,
    };
    const s1 = scoreEye(truth, full, tol);
    expect(s1.total).toBeGreaterThan(0.97);
    expect(scoreExam([s1, s1], 1000).perfect).toBe(true);
    expect(scoreExam([s1, s1], 900_000).accuracy).toBeLessThan(scoreExam([s1, s1], 1000).accuracy);
  });
  it('helpers', () => {
    expect(avBucket(0.67)).toBe('normal');
    expect(avBucket(0.5)).toBe('narrow');
    expect(avBucket(0.3)).toBe('severe');
    expect(effectiveCdr({ cdr: 0.6, color: 'pink', margins: 'sharp', edema: true })).toBe(0.12);
    expect(focusNeeded(buildFindings(30, { refraction: { OD: { sphere: -4, cylinder: -1, axis: 90 } } }), 'OD')).toBe(-4);
    expect(focusBlur(-4, -4)).toBe(0);
    expect(focusBlur(0, -4)).toBeGreaterThan(3);
  });
});

describe('practice', () => {
  it('generates scenarios that classify back to their picture and chart cleanly', () => {
    for (let s = 1; s <= 150; s++) {
      const rng = createRng(s);
      const d = (s % 5) / 4;
      const sc = practiceScenario(rng, d);
      const key = classify(sc.findings);
      expect(PICTURES[key]).toBeTruthy();
      expect(sc.answer.length).toBeGreaterThan(40);
      const lines = report(sc.findings, sc.patient);
      expect(lines.length).toBeGreaterThanOrEqual(10);
      for (const e of EYES) expect(truthFor(sc.findings, e, seedFor(sc.patient.name, e)).items.length).toBeGreaterThan(0);
    }
  });
  it('covers many distinct pictures', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 400; s++) seen.add(classify(practiceScenario(createRng(s), (s % 5) / 4).findings));
    expect(seen.size).toBeGreaterThanOrEqual(15);
  });
  it('classify recognises canonical pictures', () => {
    expect(classify(buildFindings(40))).toBe('healthy');
    expect(classify(withPost({ disc: { cdr: 0.85, rimThinning: 'inferior' } }))).toBe('glaucoma');
    expect(classify(withPost({ vessels: { segmentation: true, avRatio: 0.35 }, lesions: [{ type: 'cherry-red-spot', zone: 'macula', density: 1 }] }))).toBe('crao');
  });
  it('builds a 4-option challenge with exactly one correct answer, no forbidden words', () => {
    for (let s = 1; s <= 40; s++) {
      const sc = practiceScenario(createRng(s), 0.5);
      const c = buildChallenge(sc.findings, createRng(s));
      expect(c.options).toHaveLength(4);
      expect(c.options.filter((o) => o.correct)).toHaveLength(1);
      const txt = JSON.stringify([c, sc.answer, report(sc.findings, sc.patient)]).toLowerCase();
      expect(txt).not.toMatch(/\bsins?\b|deadly|\bvice\b|\bpride\b|\bgreed\b|\benvy\b|gluttony|\blust\b|\bwrath\b|\bsloth\b/);
    }
  });
});
