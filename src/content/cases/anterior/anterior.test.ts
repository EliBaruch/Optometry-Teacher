/**
 * Clinical-consistency checks for the anterior-segment / glaucoma case group.
 * Complements tests/content.test.ts (which also needs the Diagnosis registry).
 */
import { describe, expect, it } from 'vitest';
import { ALL_TESTS, EYES, URGENCIES, type ClinicalCase, type Eye } from '@core';

const mods = import.meta.glob<{ default: ClinicalCase | ClinicalCase[] }>('./*.ts', { eager: true });
const cases: ClinicalCase[] = Object.entries(mods)
  .filter(([f]) => !f.includes('.test.'))
  .flatMap(([, m]) => (Array.isArray(m.default) ? m.default : [m.default]));
const byDx = (dx: string) => cases.find((c) => c.diagnosis === dx)!;

/**
 * Typical unaided logMAR for a given dioptric blur in an otherwise healthy eye (clinical rule of
 * thumb: -1.00 ≈ 6/15, -2.00 ≈ 6/36, -3.00 ≈ 6/90, then flattening out around 6/120–6/180).
 */
function expectedBlurLogMAR(blurD: number): number {
  return blurD <= 3.25 ? 0.4 * blurD : Math.min(1.6, 1.3 + 0.05 * (blurD - 3.25));
}
/** Dioptric blur strength of a minus-cyl Rx: √(SE² + (cyl/2)²). */
function blurStrength(sphere: number, cylinder: number): number {
  const se = sphere + cylinder / 2;
  return Math.sqrt(se * se + (cylinder / 2) ** 2);
}

const SIN_WORDS = /\b(sins?|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;
const RELIGIOUS = /\b(god|lord|church|hymn|pray|prayer|heaven|hell|christening)\b/i;

describe('anterior case group', () => {
  it('has 16 cases with unique ids and unique diagnoses', () => {
    expect(cases).toHaveLength(16);
    expect(new Set(cases.map((c) => c.id)).size).toBe(16);
    expect(new Set(cases.map((c) => c.diagnosis)).size).toBe(16);
  });

  it('spreads difficulty 1..5 and covers every urgency tier', () => {
    expect(new Set(cases.map((c) => c.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(cases.map((c) => c.urgency))).toEqual(new Set(URGENCIES));
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s is well-formed', (_id, c) => {
    expect(c.history.length).toBeGreaterThanOrEqual(6);
    expect(c.history.length).toBeLessThanOrEqual(10);
    expect(c.history.filter((h) => h.relevance === 'key').length).toBeGreaterThanOrEqual(2);
    expect(c.history.some((h) => h.relevance === 'red-herring' || h.relevance === 'neutral')).toBe(true);
    expect(c.differentials.length).toBeGreaterThanOrEqual(3);
    expect(c.differentials.length).toBeLessThanOrEqual(5);
    expect(c.teachingPoints.length).toBeGreaterThanOrEqual(3);
    expect(c.teachingPoints.length).toBeLessThanOrEqual(5);
    expect(c.sources?.length ?? 0).toBeGreaterThanOrEqual(1);
    for (const s of c.sources ?? []) expect(s).toMatch(/^https:\/\//);
    for (const t of [...c.essentialTests, ...c.helpfulTests]) expect(ALL_TESTS).toContain(t);
    expect(c.essentialTests.filter((t) => c.helpfulTests.includes(t))).toEqual([]);
    const text = JSON.stringify(c);
    expect(text).not.toMatch(SIN_WORDS);
    expect(text).not.toMatch(RELIGIOUS);
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s has internally consistent findings', (_id, c) => {
    const f = c.findings;
    for (const eye of EYES) {
      const va = f.va[eye];
      expect(va.bestCorrected).toBeLessThanOrEqual(va.uncorrected + 1e-9);
      if (va.pinhole !== undefined) expect(va.pinhole).toBeLessThanOrEqual(va.uncorrected + 1e-9);
      expect(f.refraction[eye].cylinder).toBeLessThanOrEqual(0);
      // Keratometric astigmatism should roughly track refractive cylinder.
      const k = f.keratometry[eye];
      expect(k.k2).toBeGreaterThanOrEqual(k.k1);
      const cyl = Math.abs(f.refraction[eye].cylinder);
      if (cyl >= 1) expect(Math.abs(k.k2 - k.k1 - cyl)).toBeLessThanOrEqual(0.75);
      const ac = f.anterior[eye].anteriorChamber;
      if (ac.cells > 0 || ac.flare > 0) expect(f.anterior[eye].conjunctiva.some((s) => s !== 'normal')).toBe(true);
      if (f.anterior[eye].tbutSec !== undefined && f.anterior[eye].tbutSec! < 10) {
        expect(f.anterior[eye].cornea).toContain('reduced-tbut');
      }
    }
    // Every externally red eye must have an abnormal conjunctiva on that eye.
    for (const eye of f.external?.redEye ?? []) {
      expect(f.anterior[eye].conjunctiva.some((s) => s !== 'normal'), `${eye} red but conj normal`).toBe(true);
    }
    if (c.emergency) {
      expect(['urgent', 'emergency']).toContain(c.urgency);
      expect(c.emergency.timeLimitSec).toBeGreaterThanOrEqual(90);
      expect(c.emergency.timeLimitSec).toBeLessThanOrEqual(180);
    }
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s: unaided acuity matches the myopic/astigmatic error', (_id, c) => {
    for (const eye of EYES) {
      const rx = c.findings.refraction[eye];
      const va = c.findings.va[eye];
      const se = rx.sphere + rx.cylinder / 2;
      const blur = blurStrength(rx.sphere, rx.cylinder);
      if (se > 0 || blur < 0.75) continue; // hyperopes depend on accommodation; skip trivial errors
      const refractiveOnly = expectedBlurLogMAR(blur);
      // Never better than refraction or pathology alone allows (−0.15), never worse than both stacked (+0.3).
      const floor = Math.max(va.bestCorrected, refractiveOnly) - 0.15;
      const ceiling = va.bestCorrected + refractiveOnly + 0.3;
      expect(va.uncorrected, `${eye} unaided ${va.uncorrected} vs blur ${blur.toFixed(2)} D`).toBeGreaterThanOrEqual(floor);
      expect(va.uncorrected, `${eye} unaided ${va.uncorrected} vs blur ${blur.toFixed(2)} D`).toBeLessThanOrEqual(ceiling);
    }
  });

  it('acuity rule of thumb is sane', () => {
    expect(expectedBlurLogMAR(1)).toBeCloseTo(0.4);
    expect(expectedBlurLogMAR(3)).toBeCloseTo(1.2);
    expect(expectedBlurLogMAR(6)).toBeLessThanOrEqual(1.6);
    expect(blurStrength(-1.5, -2)).toBeCloseTo(Math.sqrt(2.5 ** 2 + 1));
  });

  it('a fixed pupil is the same size in light and dark', () => {
    for (const c of cases) {
      for (const eye of EYES) {
        if (c.findings.pupils.reactivity[eye] !== 'fixed') continue;
        expect(c.findings.pupils.sizeDarkMm[eye], c.id).toBe(c.findings.pupils.sizeLightMm[eye]);
      }
    }
  });

  it('corneal foreign body: fragment visible, stains, and the intraocular check is essential', () => {
    const c = byDx('corneal-foreign-body');
    const os = c.findings.anterior.OS;
    expect(os.cornea).toContain('foreign-body');
    expect(os.fluorescein).not.toBe('none');
    expect(c.findings.anterior.OD.fluorescein).toBe('none');
    expect(c.essentialTests).toEqual(expect.arrayContaining(['fluorescein', 'ophthalmoscopy', 'slit-lamp']));
    const text = JSON.stringify(c);
    expect(text).toMatch(/grind[^.]*high-velocity/i);
    expect(text).toMatch(/Seidel/);
    expect(text).toMatch(/never MRI/i);
  });

  it('grinding is treated as high-velocity in both trauma cases', () => {
    for (const dx of ['corneal-abrasion', 'corneal-foreign-body']) {
      expect(JSON.stringify(byDx(dx)), dx).toMatch(/grind/i);
    }
  });

  it('only true time-critical cases carry a timer', () => {
    const timed = cases.filter((c) => c.emergency).map((c) => c.diagnosis).sort();
    expect(timed).toEqual(['acute-angle-closure', 'microbial-keratitis']);
  });

  it('angle closure: high IOP, fixed mid-dilated pupil, oedema, narrow fellow angle', () => {
    const f = byDx('acute-angle-closure').findings;
    expect(f.iop.OD).toBeGreaterThanOrEqual(40);
    expect(f.iop.OS).toBeLessThanOrEqual(21);
    expect(f.pupils.reactivity.OD).toBe('fixed');
    expect(f.pupils.shape?.OD).toBe('mid-dilated');
    expect(f.anterior.OD.cornea).toContain('edema');
    expect(f.anterior.OS.anteriorChamber.vanHerick).toBeLessThanOrEqual(2);
    expect(f.refraction.OS.sphere).toBeGreaterThan(0); // hyperope
    expect(byDx('acute-angle-closure').urgency).toBe('emergency');
  });

  it('uveitis: small pupil, cells/flare, KPs, low-normal IOP', () => {
    const f = byDx('anterior-uveitis').findings;
    expect(f.pupils.sizeLightMm.OD).toBeLessThan(f.pupils.sizeLightMm.OS);
    expect(f.anterior.OD.anteriorChamber.cells).toBeGreaterThanOrEqual(1);
    expect(f.anterior.OD.cornea).toContain('keratic-precipitates');
    expect(f.anterior.OD.fluorescein).toBe('none');
    expect(f.iop.OD).toBeLessThanOrEqual(f.iop.OS);
  });

  it('cataract: pinhole gives little or no gain and there is no RAPD', () => {
    const f = byDx('cataract').findings;
    for (const eye of EYES) expect(f.va[eye].pinhole).toBeGreaterThanOrEqual(f.va[eye].bestCorrected);
    expect(f.pupils.rapd).toBe('none');
  });

  it('POAG: inferior rim thinning pairs with a superior arcuate defect in the same eye', () => {
    const f = byDx('poag').findings;
    expect(f.posterior.OD.disc.rimThinning).toBe('inferior');
    expect(f.fields.OD).toBe('superior-arcuate');
    expect(f.posterior.OD.disc.cdr).toBeGreaterThanOrEqual(0.7);
    expect(f.iop.OD).toBeGreaterThan(21);
    expect(f.pupils.rapd).toBe('OD' satisfies Eye);
  });

  it('keratitis cases stain with the right pattern on the affected eye only', () => {
    const pairs: [string, Eye, string][] = [
      ['hsv-keratitis', 'OD', 'dendritic'],
      ['microbial-keratitis', 'OD', 'round-ulcer'],
      ['corneal-abrasion', 'OD', 'linear-abrasion'],
    ];
    for (const [dx, eye, pattern] of pairs) {
      const f = byDx(dx).findings;
      expect(f.anterior[eye].fluorescein, dx).toBe(pattern);
      expect(f.anterior[eye === 'OD' ? 'OS' : 'OD'].fluorescein, dx).toBe('none');
    }
  });
});
