/**
 * Content gate: every case and diagnosis must satisfy the clinical contract.
 * All content authors run this: npx vitest run tests/content.test.ts
 */
import { describe, expect, it } from 'vitest';
import { ALL_TESTS, type ClinicalCase, type Diagnosis, URGENCIES } from '../src/core';

type Mod = { default?: unknown };
const load = <T>(glob: Record<string, Mod>): { file: string; item: T }[] =>
  Object.entries(glob)
    .filter(([f]) => !f.includes('.test.'))
    .flatMap(([file, m]) => (m.default === undefined ? [] : (Array.isArray(m.default) ? m.default : [m.default]).map((item) => ({ file, item: item as T }))));

const diagnoses = load<Diagnosis>(import.meta.glob(['../src/content/diagnoses/**/*.ts', '!**/*.test.ts'], { eager: true }));
const cases = load<ClinicalCase>(import.meta.glob(['../src/content/cases/**/*.ts', '!**/*.test.ts'], { eager: true }));

/** Canonical ids from docs/GAME_DESIGN.md §8 */
export const CANONICAL_DIAGNOSES = [
  'myopia', 'hyperopia', 'astigmatism', 'presbyopia', 'anisometropia', 'amblyopia',
  'convergence-insufficiency', 'accommodative-esotropia', 'intermittent-exotropia', 'cn6-palsy', 'cn4-palsy', 'cn3-palsy',
  'dry-eye', 'blepharitis', 'chalazion', 'hordeolum', 'bacterial-conjunctivitis', 'viral-conjunctivitis', 'allergic-conjunctivitis',
  'subconjunctival-hemorrhage', 'pinguecula', 'pterygium', 'episcleritis',
  'corneal-abrasion', 'corneal-foreign-body', 'hsv-keratitis', 'microbial-keratitis', 'keratoconus', 'herpes-zoster-ophthalmicus',
  'anterior-uveitis', 'acute-angle-closure', 'poag', 'ocular-hypertension', 'normal-tension-glaucoma',
  'cataract',
  'npdr', 'pdr', 'diabetic-macular-edema', 'hypertensive-retinopathy', 'dry-amd', 'wet-amd', 'retinal-detachment', 'pvd',
  'retinal-tear', 'crao', 'crvo', 'brvo', 'central-serous',
  'papilledema', 'optic-neuritis', 'giant-cell-arteritis', 'horner-syndrome', 'adie-pupil', 'pituitary-adenoma',
  'homonymous-hemianopia', 'congenital-color-deficiency',
  'healthy-eyes',
];

const SIN_WORDS = /\b(sins?|deadly|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

describe('diagnoses', () => {
  it('ids are unique and canonical', () => {
    const ids = diagnoses.map((d) => d.item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(CANONICAL_DIAGNOSES, `unknown diagnosis id ${id}`).toContain(id);
  });
  it.runIf(diagnoses.length > 0)('every diagnosis is complete', () => {
    for (const { file, item: d } of diagnoses) {
      const where = `${file}:${d.id}`;
      expect(d.name, where).toBeTruthy();
      expect(d.summary.length, where).toBeGreaterThan(40);
      expect(d.keyFindings.length, where).toBeGreaterThanOrEqual(2);
      expect(d.pearls.length, where).toBeGreaterThanOrEqual(1);
      expect(URGENCIES, where).toContain(d.typicalUrgency);
      expect(JSON.stringify(d), `${where} player-facing text must not use sin language`).not.toMatch(SIN_WORDS);
    }
  });
});

describe('cases', () => {
  const dxIds = new Set(diagnoses.map((d) => d.item.id));
  it('ids are unique', () => {
    const ids = cases.map((c) => c.item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it.runIf(cases.length > 0)('every case satisfies the clinical contract', () => {
    for (const { file, item: c } of cases) {
      const w = `${file}:${c.id}`;
      expect(CANONICAL_DIAGNOSES, `${w} diagnosis`).toContain(c.diagnosis);
      if (dxIds.size) expect(dxIds.has(c.diagnosis), `${w} diagnosis ${c.diagnosis} has no Diagnosis entry yet`).toBe(true);
      expect(c.differentials.length, `${w} differentials`).toBeGreaterThanOrEqual(3);
      expect(c.differentials, `${w} differentials must not include the answer`).not.toContain(c.diagnosis);
      for (const d of c.differentials) expect(CANONICAL_DIAGNOSES, `${w} differential ${d}`).toContain(d);
      expect(new Set(c.differentials).size, `${w} duplicate differentials`).toBe(c.differentials.length);
      for (const t of [...c.essentialTests, ...c.helpfulTests]) expect(ALL_TESTS, `${w} test ${t}`).toContain(t);
      expect(c.essentialTests.length, `${w} essential tests`).toBeGreaterThanOrEqual(1);
      expect(c.history.length, `${w} history`).toBeGreaterThanOrEqual(4);
      expect(c.history.some((h) => h.relevance === 'key'), `${w} needs a key history question`).toBe(true);
      expect(new Set(c.history.map((h) => h.id)).size, `${w} duplicate history ids`).toBe(c.history.length);
      expect(URGENCIES, w).toContain(c.urgency);
      expect(c.teachingPoints.length, `${w} teaching points`).toBeGreaterThanOrEqual(2);
      expect(c.patient.age, w).toBeGreaterThan(0);
      expect([0, 1, 2, 3, 4, 5], `${w} skin`).toContain(c.patient.avatar.skin);
      const f = c.findings;
      for (const eye of ['OD', 'OS'] as const) {
        expect(f.posterior[eye].disc.cdr, `${w} cdr`).toBeGreaterThanOrEqual(0.05);
        expect(f.posterior[eye].disc.cdr, `${w} cdr`).toBeLessThanOrEqual(0.95);
        expect(f.iop[eye], `${w} iop`).toBeGreaterThanOrEqual(0);
        expect(f.iop[eye], `${w} iop`).toBeLessThanOrEqual(80);
        expect(f.refraction[eye].cylinder, `${w} minus-cyl`).toBeLessThanOrEqual(0);
        expect(f.refraction[eye].axis, `${w} axis`).toBeGreaterThanOrEqual(1);
        expect(f.refraction[eye].axis, `${w} axis`).toBeLessThanOrEqual(180);
        expect(f.va[eye].bestCorrected, `${w} BCVA <= UCVA`).toBeLessThanOrEqual(f.va[eye].uncorrected + 1e-9);
      }
      if (c.emergency) expect(['urgent', 'emergency'], `${w} emergency timer needs urgent urgency`).toContain(c.urgency);
      const visible = JSON.stringify({ cc: c.chiefComplaint, h: c.history, tp: c.teachingPoints, m: c.management, p: c.patient, t: c.triageNote });
      expect(visible, `${w} player-facing text must not use sin language`).not.toMatch(SIN_WORDS);
    }
  });
});
