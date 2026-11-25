import { describe, expect, it } from 'vitest';
import { URGENCIES } from '@core';
import { S } from './strings';
import { chartValueHe, isolateLtr, localizeFinding } from './chartHe';
import { CONFIDENCE_LIST, HISTORY_ORDER } from './logic';

describe('exam strings', () => {
  it('has Hebrew for every urgency, confidence and history category', () => {
    for (const u of URGENCIES) expect(S.he.urgency[u].label).toBeTruthy();
    for (const c of CONFIDENCE_LIST) expect(S.he.confidence[c].label).toBeTruthy();
    for (const h of HISTORY_ORDER) expect(S.he.historyLabel[h]).toBeTruthy();
  });
  it('agrees the patient age wording with the patient sex in Hebrew', () => {
    expect(S.he.patientMeta(61, 'F', 'אופה')).toBe('בת 61  ·  אופה');
    expect(S.he.patientMeta(61, 'M', '')).toBe('בן 61');
    expect(S.en.patientMeta(61, 'F', 'Baker')).toBe('61 yrs  ·  Female  ·  Baker');
  });
  it('agrees Hebrew counts with one item', () => {
    expect(S.he.dockAsked(1)).toBe('שאלה אחת');
    expect(S.he.dockAsked(3)).toBe('3 שאלות');
    expect(S.he.dockTests(1)).toBe('בדיקה אחת');
    expect(S.he.dockFindings(1)).toBe('ממצא אחד');
    expect(S.he.toolAria('פינהול', 1, false)).toContain('דקה אחת');
  });
});

describe('Hebrew chart wording', () => {
  it('leaves English rows untouched', () => {
    expect(localizeFinding({ label: 'VA sc', value: '20/80 (6/24) · logMAR 0.60' }, 'en')).toEqual({ label: 'VA sc', value: '20/80 (6/24) · logMAR 0.60' });
  });
  it('re-expresses labels and common values', () => {
    expect(localizeFinding({ label: 'Ret reflex', value: 'Normal — crisp, even reflex' }, 'he')).toEqual({ label: 'רפלקס ברטינוסקופיה', value: 'תקין: רפלקס חד ואחיד' });
    expect(chartValueHe('30Δ constant L exotropia with 8Δ R hyper')).toBe('30Δ אקזוטרופיה קבועה בעין שמאל עם 8Δ היפר ימין');
    expect(chartValueHe('3.0 mm, greater in the light (larger pupil OD)')).toBe('3.0 מ״מ, גדולה יותר באור (האישון הגדול: OD)');
    expect(chartValueHe('+2.75 −0.50 × 090')).toBe('+2.75 −0.50 × 090');
  });
  it('isolates numbers inside Hebrew sentences', () => {
    expect(isolateLtr('20/32 (6/9.5) · משתפרת מ־20/80')).toBe('\u206620/32 (6/9.5)\u2069 · משתפרת מ־\u206620/80\u2069');
    expect(isolateLtr('+2.75 −0.50 × 090')).toBe('+2.75 −0.50 × 090');
  });
  it('falls back to the original text for unknown findings', () => {
    expect(localizeFinding({ label: 'Mystery', value: 'Unknown thing' }, 'he')).toEqual({ label: 'Mystery', value: 'Unknown thing' });
  });
});

describe('Hebrew chart wording, editor round 3', () => {
  it('uses the guide terminology', () => {
    expect(localizeFinding({ label: 'PH', value: 'x' }, 'he').label).toBe('חדות עם חריר');
    expect(localizeFinding({ label: 'Cover test (near)', value: 'x' }, 'he').label).toBe('מבחן כיסוי, קרוב');
    expect(localizeFinding({ label: 'Endpoint', value: 'x' }, 'he').label).toBe('נקודת הניטרול');
    expect(localizeFinding({ label: 'Cup:disc', value: 'x' }, 'he').label).toBe('יחס C/D');
    expect(chartValueHe('Inferior altitudinal — respects the horizontal meridian')).toBe('פגם אלטיטודינלי תחתון: נעצר בקו האמצע האופקי');
    expect(chartValueHe('Pre-chiasmal — OS: retina — detachment in the opposite part of the fundus')).not.toMatch(/:.*:/);
  });
  it('uses singular count forms', () => {
    expect(S.he.trayCount(1, 5)).toBe('בוצעה בדיקה אחת מתוך 5');
    expect(S.he.historyCount(1, 9)).toBe('נשאלה שאלה אחת מתוך 9');
  });
});
