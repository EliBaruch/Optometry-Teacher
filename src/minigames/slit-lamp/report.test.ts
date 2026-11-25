import { describe, expect, it } from 'vitest';
import { buildFindings } from '@core';
import { fluoReport, report, tbutOf } from './report';

const find = (rows: ReturnType<typeof report>, label: string, eye: 'OD' | 'OS') => rows.find((r) => r.label === label && r.eye === eye)!;

describe('slit-lamp report', () => {
  it('lists seven lines per eye, all normal for a healthy young eye', () => {
    const rows = report(buildFindings(30));
    expect(rows).toHaveLength(14);
    expect(rows.every((r) => r.flag === 'normal')).toBe(true);
    expect(find(rows, 'Van Herick', 'OD').value).toMatch(/Grade 4/);
    expect(find(rows, 'AC cells / flare', 'OS').value).toBe('Deep and quiet');
  });
  it('flags acute angle closure as critical', () => {
    const f = buildFindings(68, { anterior: { OD: { conjunctiva: ['ciliary-flush'], cornea: ['edema'], anteriorChamber: { depth: 'shallow', vanHerick: 1, cells: 0.5, flare: 1 } } } });
    const rows = report(f);
    expect(find(rows, 'Van Herick', 'OD').flag).toBe('critical');
    expect(find(rows, 'Van Herick', 'OD').value).toMatch(/closure possible/);
    expect(find(rows, 'Cornea', 'OD').value).toBe('Corneal oedema');
    expect(find(rows, 'Conjunctiva', 'OD').value).toBe('Ciliary flush');
    expect(find(rows, 'Van Herick', 'OS').flag).toBe('normal');
  });
  it('grades uveitis by the SUN scale', () => {
    const f = buildFindings(34, { anterior: { OS: { cornea: ['keratic-precipitates'], iris: ['posterior-synechiae'], anteriorChamber: { cells: 3, flare: 2, hypopyon: true } } } });
    const r = find(report(f), 'AC cells / flare', 'OS');
    expect(r.value).toBe('Cells 3+, flare 2+, hypopyon');
    expect(r.flag).toBe('critical');
    expect(find(report(f), 'Iris', 'OS').value).toBe('Posterior synechiae');
    expect(find(report(f), 'Cornea', 'OS').flag).toBe('abnormal');
  });
  it('treats mild nuclear sclerosis as normal ageing and grade 3 as abnormal', () => {
    expect(find(report(buildFindings(70)), 'Lens', 'OD').flag).toBe('normal');
    const f = buildFindings(70, { anterior: { OD: { lens: ['cortical-cataract'], lensGrade: 3 } } });
    const r = find(report(f), 'Lens', 'OD');
    expect(r.value).toBe('Cortical cataract gr 3');
    expect(r.flag).toBe('abnormal');
    expect(find(report(buildFindings(70, { anterior: { OD: { lens: ['iol'], lensGrade: 0 } } })), 'Lens', 'OD').value).toMatch(/IOL/);
  });
  it('treats a dendrite or ulcer as critical', () => {
    const f = buildFindings(40, { anterior: { OD: { cornea: ['dendrite'] }, OS: { cornea: ['ulcer'] } } });
    expect(find(report(f), 'Cornea', 'OD').flag).toBe('critical');
    expect(find(report(f), 'Cornea', 'OS').flag).toBe('critical');
  });
});

describe('fluorescein report', () => {
  it('reports pattern and TBUT per eye', () => {
    const f = buildFindings(40, { anterior: { OD: { fluorescein: 'dendritic', tbutSec: 7 }, OS: { fluorescein: 'inferior-punctate', tbutSec: 4.5 } } });
    const rows = fluoReport(f);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ label: 'Fluorescein', eye: 'OD', flag: 'critical' });
    expect(rows[1]).toMatchObject({ label: 'TBUT', eye: 'OD', value: '7 s (reduced)', flag: 'abnormal' });
    expect(rows[2]).toMatchObject({ eye: 'OS', flag: 'abnormal' });
  });
  it('a healthy eye shows no stain and a normal TBUT', () => {
    const rows = fluoReport(buildFindings(30));
    expect(rows[0]).toMatchObject({ value: 'No staining', flag: 'normal' });
    expect(rows[1]).toMatchObject({ value: '12 s', flag: 'normal' });
    expect(tbutOf(buildFindings(30).anterior.OD)).toBe(12);
  });
});
