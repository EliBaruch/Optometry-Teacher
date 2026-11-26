import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFindings, createRng, type MiniGameContext } from '@core';
import modules from './index';
import { acuityPractice } from './practice';
import { reportAcuity, reportPinhole } from './report';

const patient = { name: 'Test Patient', age: 40, sex: 'F' as const, occupation: 'x', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } } as never;
const hasHebrew = (s: string) => /[֐-׿]/.test(s);

describe('visual-acuity Hebrew edition', () => {
  afterEach(() => { document.body.innerHTML = ''; document.documentElement.lang = ''; });
  it('chart lines stay English by default and speak Hebrew when asked', () => {
    const f = buildFindings(40, { va: { OD: { uncorrected: 0.6 }, OS: { uncorrected: 1.6 } } });
    expect(reportAcuity(f, patient)).toEqual(reportAcuity(f, patient, 'en'));
    expect(reportAcuity(f, patient)[0]!.label).toBe('VA sc');
    const he = reportAcuity(f, patient, 'he');
    expect(hasHebrew(he[0]!.label)).toBe(true);
    expect(he[1]!.value).toContain('ספירת אצבעות');
    expect(reportPinhole(f, patient)[0]!.label).toBe('PH');
    expect(hasHebrew(reportPinhole(f, patient, 'he')[0]!.value)).toBe(true);
  });
  it('mounts in Hebrew', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const ctx = {
      testId: 'visual-acuity', patient, findings: buildFindings(40), mode: 'case', difficulty: 0.5, rng: createRng('he'),
      audio: { play: vi.fn() }, fx: { burst: vi.fn(), shake: vi.fn() }, reducedMotion: true, locale: 'he',
    } as unknown as MiniGameContext;
    const cleanup = modules[0]!.mount(host, ctx, vi.fn());
    expect(host.querySelector('.va h2')?.textContent).toBe('חדות ראייה');
    cleanup();
  });
  it('practice scenarios take the edition from the document', () => {
    document.documentElement.lang = 'he';
    const s = acuityPractice(createRng('p'), 0.5);
    expect(hasHebrew(s.patient.name)).toBe(true);
    expect(hasHebrew(s.answer)).toBe(true);
    expect(modules[0]!.text?.he?.title).toBe('חדות ראייה');
  });
});
