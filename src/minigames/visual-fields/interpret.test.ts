import { describe, expect, it } from 'vitest';
import { buildFindings, type FieldDefect } from '@core';
import { defectOf, describeEye, FAMILIES, FAMILY_SIDES, localise, patternOf, samePattern } from './interpret';
import { report } from './report';

const P = { name: 'T', age: 60, sex: 'F' as const, avatar: { skin: 2 as const, hair: 'short' as const, hairColor: '#000', irisColor: '#333', outfit: '#444' } };
const loc = (od: FieldDefect, os: FieldDefect) => localise(patternOf(od, 'OD'), patternOf(os, 'OS'));

describe('canonical patterns', () => {
  it('temporal hemianopia is right in OD and left in OS', () => {
    expect(patternOf('temporal-hemianopia', 'OD')).toEqual({ family: 'hemianopia', side: 'right' });
    expect(patternOf('temporal-hemianopia', 'OS')).toEqual({ family: 'hemianopia', side: 'left' });
    expect(samePattern(patternOf('temporal-hemianopia', 'OS'), patternOf('left-hemianopia', 'OS'))).toBe(true);
  });
  it('defectOf round-trips every family/side', () => {
    for (const eye of ['OD', 'OS'] as const) {
      for (const family of FAMILIES) {
        const sides = FAMILY_SIDES[family].length ? FAMILY_SIDES[family] : [undefined];
        for (const side of sides) {
          const p = side ? { family, side } : { family };
          expect(samePattern(patternOf(defectOf(p, eye), eye), p)).toBe(true);
        }
      }
    }
  });
});

describe('localisation', () => {
  it('bitemporal = chiasm', () => {
    expect(loc('temporal-hemianopia', 'temporal-hemianopia')).toBe('chiasm');
    expect(loc('right-superior-quadrantanopia', 'left-superior-quadrantanopia')).toBe('chiasm');
  });
  it('homonymous = retrochiasmal on the opposite side', () => {
    expect(loc('left-hemianopia', 'left-hemianopia')).toBe('retro-right');
    expect(loc('right-hemianopia', 'right-hemianopia')).toBe('retro-left');
    expect(loc('nasal-hemianopia', 'temporal-hemianopia')).toBe('retro-right'); // OD nasal = left, OS temporal = left
    expect(loc('left-superior-quadrantanopia', 'left-superior-quadrantanopia')).toBe('retro-right');
  });
  it('monocular patterns are pre-chiasmal; full fields are none', () => {
    expect(loc('superior-arcuate', 'full')).toBe('prechiasmal');
    expect(loc('enlarged-blind-spot', 'enlarged-blind-spot')).toBe('prechiasmal');
    expect(loc('full', 'temporal-island')).toBe('prechiasmal');
    expect(loc('full', 'full')).toBe('none');
  });
  it('a lone temporal hemianopia is junctional (chiasm)', () => {
    expect(loc('temporal-hemianopia', 'full')).toBe('chiasm');
  });
});

describe('report', () => {
  it('describes each eye and localises the lesion', () => {
    const f = buildFindings(50, { fields: { OD: 'temporal-hemianopia', OS: 'temporal-hemianopia' } });
    const r = report(f, P);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ label: 'Visual field', eye: 'OD', flag: 'critical' });
    expect(r[0]!.value).toContain('temporal');
    expect(r[1]!.value).toContain('Left (temporal)');
    expect(r[2]).toMatchObject({ label: 'Field localisation', eye: 'OU', flag: 'critical' });
    expect(r[2]!.value).toContain('Chiasm');
    expect(r[2]!.value).toContain('bitemporal hemianopia');
  });
  it('full fields are normal', () => {
    const r = report(buildFindings(30), P);
    expect(r.every((l) => l.flag === 'normal')).toBe(true);
    expect(r[0]!.value).toMatch(/Full/);
  });
  it('glaucoma: abnormal, pre-chiasmal with a nerve-fibre hint', () => {
    const r = report(buildFindings(66, { fields: { OD: 'superior-arcuate' } }), P);
    expect(r[0]).toMatchObject({ flag: 'abnormal', value: 'Superior arcuate — respects the horizontal meridian' });
    expect(r[1]!.flag).toBe('normal');
    expect(r[2]!.value).toMatch(/Pre-chiasmal — OD: nerve fibre layer/);
  });
  it('homonymous quadrantanopia points to the lobe', () => {
    const r = report(buildFindings(70, { fields: { OD: 'left-superior-quadrantanopia', OS: 'left-superior-quadrantanopia' } }), P);
    expect(r[2]!.value).toContain('Right retrochiasmal');
    expect(r[2]!.value).toContain('Meyer');
    expect(r[0]!.value).toContain('superonasal');
    expect(r[1]!.value).toContain('superotemporal');
  });
  it('bilateral enlarged blind spots flag disc swelling', () => {
    const r = report(buildFindings(28, { fields: { OD: 'enlarged-blind-spot', OS: 'enlarged-blind-spot' } }), P);
    expect(r[2]).toMatchObject({ flag: 'critical' });
    expect(r[2]!.value).toContain('papilloedema');
  });
  it('a curtain is critical and spares fixation', () => {
    const r = report(buildFindings(58, { fields: { OS: 'curtain-inferior' } }), P);
    expect(r[1]).toMatchObject({ flag: 'critical', value: 'Inferior peripheral loss — fixation spared' });
  });
  it('never uses words players must not see', () => {
    const all: FieldDefect[] = ['full', 'constricted', 'central-scotoma', 'temporal-island', 'nasal-step'];
    for (const d of all) expect(describeEye(d, 'OD')).not.toMatch(/sin|deadly|vice/i);
  });
});
