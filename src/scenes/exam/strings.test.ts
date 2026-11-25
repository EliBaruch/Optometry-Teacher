import { describe, expect, it } from 'vitest';
import { URGENCIES } from '@core';
import { S } from './strings';
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
});
