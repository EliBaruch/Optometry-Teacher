import { describe, expect, it } from 'vitest';
import { isolateLtrRuns } from './i18n';

const L = '⁦', P = '⁩';
describe('isolateLtrRuns', () => {
  it('isolates signed measurements and units inside Hebrew', () => {
    expect(isolateLtrRuns('קוצר ראייה גבוה (−6.00 D ומעלה)')).toBe(`קוצר ראייה גבוה (${L}−6.00 D${P} ומעלה)`);
    expect(isolateLtrRuns('מזנק ל-40–80 mmHg')).toBe(`מזנק ל-${L}40–80 mmHg${P}`);
  });
  it('keeps brackets outside the isolate so they mirror as a pair', () => {
    expect(isolateLtrRuns('ניוון סורגי (lattice) בבדיקה')).toBe(`ניוון סורגי (${L}lattice${P}) בבדיקה`);
  });
  it('keeps a trailing grade plus with its number ("3+", "1-2+")', () => {
    expect(isolateLtrRuns('דרגה 3+: אישון')).toBe(`דרגה ${L}3+${P}: אישון`);
    expect(isolateLtrRuns('ב-1-2+ בלבד')).toBe(`ב-${L}1-2+${P} בלבד`);
  });
  it('leaves English and already-isolated text untouched', () => {
    expect(isolateLtrRuns('IOP 48 mmHg')).toBe('IOP 48 mmHg');
    const done = `לחץ ${L}48 mmHg${P}`;
    expect(isolateLtrRuns(done)).toBe(done);
  });
});
