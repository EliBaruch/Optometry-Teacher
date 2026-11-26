import { describe, expect, it } from 'vitest';
import { CONTRASTS } from './clinical';
import { CONTRASTS_HE } from './clinical.he';
import { ROSTER } from './roster';
import { rivalText } from './strings';

describe('Rivals Hebrew edition', () => {
  it('has a Hebrew lesson for every curated contrast', () => {
    const missing: string[] = [];
    for (const [dx, list] of Object.entries(CONTRASTS)) {
      for (const c of list) if (!CONTRASTS_HE[`${dx}>${c.mimic}`]) missing.push(`${dx}>${c.mimic}`);
    }
    expect(missing).toEqual([]);
    expect(Object.keys(CONTRASTS_HE).filter((k) => !Object.entries(CONTRASTS).some(([dx, l]) => l.some((c) => `${dx}>${c.mimic}` === k)))).toEqual([]);
  });

  it('keeps {iop} placeholders in step with English', () => {
    for (const [dx, list] of Object.entries(CONTRASTS)) {
      for (const c of list) expect(CONTRASTS_HE[`${dx}>${c.mimic}`]!.includes('{iop}')).toBe(c.finding.includes('{iop}'));
    }
  });

  it('writes every colleague natively in Hebrew', () => {
    for (const r of ROSTER) {
      const t = rivalText(r, 'he');
      expect(t.name).toMatch(/[֐-׿]/);
      expect(t.quips.ahead.length).toBe(r.quips.ahead.length);
      expect(t.quips.behind.length).toBe(r.quips.behind.length);
      expect(t.quips.slipped.length).toBe(r.quips.slipped.length);
    }
  });
});
