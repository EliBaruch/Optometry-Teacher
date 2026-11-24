import { describe, expect, it } from 'vitest';
import { ALL_TESTS, URGENCIES, type ClinicalCase, type Eye } from '@core';

/** Mirror of docs/GAME_DESIGN.md §8 (tests/content.test.ts is the authority; importing it would re-run its suites). */
const CANONICAL_DIAGNOSES = [
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

/**
 * tests/content.test.ts eagerly globs every file under src/content/cases (including this one) before
 * filtering, which would register these suites a second time inside the content gate. Only run them
 * when this file is the test file vitest is actually executing.
 */
const RUN_HERE = /retina-emergency\.test\.ts$/.test(expect.getState().testPath ?? '');

const mods = import.meta.glob<{ default: ClinicalCase }>(['./*.ts', '!./*.test.ts'], { eager: true });
const cases = Object.values(mods).map((m) => m.default);
const byDx = (dx: string) => cases.find((c) => c.diagnosis === dx)!;
const PLAYER_FORBIDDEN = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

describe.runIf(RUN_HERE)('retina & emergency case group', () => {
  it('covers all 14 assigned diagnoses exactly once', () => {
    const want = ['npdr', 'pdr', 'diabetic-macular-edema', 'hypertensive-retinopathy', 'dry-amd', 'wet-amd', 'retinal-detachment',
      'pvd', 'retinal-tear', 'crao', 'crvo', 'brvo', 'central-serous', 'healthy-eyes'];
    expect(cases.map((c) => c.diagnosis).sort()).toEqual([...want].sort());
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it('keeps graded urgency and management wording in agreement', () => {
    expect(byDx('wet-amd').urgency).toBe('urgent');
    expect(byDx('wet-amd').management).not.toMatch(/within days\)|ideally within days/i);
    const htn = byDx('hypertensive-retinopathy');
    expect(htn.teachingPoints.join(' ')).toMatch(/not required/i);
    // 'soon' = see within days: management must not promise only a multi-week window.
    for (const c of cases.filter((x) => x.urgency === 'soon')) {
      expect(c.management, c.id).not.toMatch(/within (a couple of|1\s*[-–]\s*2|two|few) weeks/i);
    }
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s satisfies the content contract', (_id, c) => {
    expect(CANONICAL_DIAGNOSES).toContain(c.diagnosis);
    expect(c.differentials.length).toBeGreaterThanOrEqual(3);
    expect(c.differentials.length).toBeLessThanOrEqual(5);
    expect(c.differentials).not.toContain(c.diagnosis);
    for (const d of c.differentials) expect(CANONICAL_DIAGNOSES).toContain(d);
    expect(new Set(c.differentials).size).toBe(c.differentials.length);
    for (const t of [...c.essentialTests, ...c.helpfulTests]) expect(ALL_TESTS).toContain(t);
    expect(c.essentialTests.filter((t) => c.helpfulTests.includes(t))).toEqual([]);
    expect(c.history.length).toBeGreaterThanOrEqual(6);
    expect(c.history.length).toBeLessThanOrEqual(10);
    expect(c.history.some((h) => h.relevance === 'key')).toBe(true);
    expect(new Set(c.history.map((h) => h.id)).size).toBe(c.history.length);
    expect(URGENCIES).toContain(c.urgency);
    expect(c.teachingPoints.length).toBeGreaterThanOrEqual(3);
    expect(c.teachingPoints.length).toBeLessThanOrEqual(5);
    expect(c.sources?.length ?? 0).toBeGreaterThanOrEqual(1);
    if (c.emergency) {
      expect(c.urgency).toBe('emergency');
      expect(c.emergency.timeLimitSec).toBeGreaterThanOrEqual(90);
      expect(c.emergency.timeLimitSec).toBeLessThanOrEqual(180);
    }
    for (const eye of ['OD', 'OS'] as Eye[]) {
      const f = c.findings;
      expect(f.va[eye].bestCorrected).toBeLessThanOrEqual(f.va[eye].uncorrected + 1e-9);
      expect(f.refraction[eye].cylinder).toBeLessThanOrEqual(0);
      expect(f.refraction[eye].axis).toBeGreaterThanOrEqual(1);
      expect(f.refraction[eye].axis).toBeLessThanOrEqual(180);
      expect(Number.isInteger(f.refraction[eye].sphere * 4)).toBe(true);
      // Uncorrected VA must match the refraction: myopic blur costs roughly 0.3+ logMAR per dioptre
      // on top of BCVA, and beyond ~-4.5 D the 40 cm near target sits well past the far point.
      const r = f.refraction[eye];
      const se = r.sphere + r.cylinder / 2;
      if (se <= -0.75) {
        expect(f.va[eye].uncorrected - f.va[eye].bestCorrected, `${c.id} ${eye} myopic blur`).toBeGreaterThanOrEqual(Math.min(1.5, 0.3 * -se) - 0.05);
      }
      if (se <= -4.5) expect(f.va[eye].nearUncorrected ?? 0, `${c.id} ${eye} near VA past the far point`).toBeGreaterThanOrEqual(0.8);
      // Near VA must never silently inherit buildFindings' healthy default (0.0) in a pathological eye:
      // macular disease, media opacity or detachment blurs 40 cm as much as 6 m.
      const post = f.posterior[eye];
      const pathological =
        post.lesions.some((l) => l.zone === 'macula') ||
        post.vitreous === 'hemorrhage' ||
        post.detachment !== undefined ||
        f.va[eye].bestCorrected >= 0.2;
      if (pathological) {
        // buildFindings back-fills 0.0, so the numeric floor below is what catches an inherited default.
        expect(f.va[eye].nearUncorrected, `${c.id} ${eye} near VA must be set`).toBeDefined();
        expect(f.va[eye].nearUncorrected!, `${c.id} ${eye} near VA vs BCVA`).toBeGreaterThanOrEqual(f.va[eye].bestCorrected - 0.1);
      }
      for (const l of f.posterior[eye].lesions) {
        expect(l.density).toBeGreaterThanOrEqual(1);
        expect(l.density).toBeLessThanOrEqual(5);
      }
    }
    const visible = JSON.stringify({ cc: c.chiefComplaint, h: c.history, tp: c.teachingPoints, m: c.management, p: c.patient, t: c.triageNote, r: c.redFlags, tags: c.tags });
    expect(visible).not.toMatch(PLAYER_FORBIDDEN);
  });

  it('has at least three timed emergencies including macula-on RD and CRAO', () => {
    const timed = cases.filter((c) => c.emergency);
    expect(timed.length).toBeGreaterThanOrEqual(3);
    expect(byDx('retinal-detachment').emergency).toBeDefined();
    expect(byDx('retinal-detachment').findings.posterior.OS.detachment?.maculaOff).toBe(false);
    expect(byDx('crao').emergency).toBeDefined();
  });

  it('spreads difficulty 1..5 and patient age from childhood to the 90s', () => {
    expect(new Set(cases.map((c) => c.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
    const ages = cases.map((c) => c.patient.age);
    expect(Math.min(...ages)).toBeLessThan(18);
    expect(Math.max(...ages)).toBeGreaterThanOrEqual(90);
  });

  it('keeps hallmark signs clinically consistent', () => {
    const crao = byDx('crao').findings;
    expect(crao.pupils.rapd).toBe('OD');
    expect(crao.fields.OD).toBe('temporal-island'); // CF acuity without cilioretinal sparing: only a temporal island remains
    expect(crao.posterior.OD.lesions.map((l) => l.type)).toEqual(expect.arrayContaining(['cherry-red-spot', 'retinal-whitening']));
    expect(crao.posterior.OS.lesions).toEqual([]);

    const crvo = byDx('crvo').findings;
    expect(crvo.posterior.OD.vessels.venousDilation).toBe(true);
    expect(crvo.posterior.OS.vessels.venousDilation).toBe(false);
    expect(crvo.pupils.rapd).toBe('none'); // non-ischaemic

    const htn = byDx('hypertensive-retinopathy').findings;
    for (const eye of ['OD', 'OS'] as Eye[]) {
      expect(htn.posterior[eye].disc.edema).toBe(true);
      expect(htn.posterior[eye].vessels.avNicking).toBe(true);
    }

    const pvd = byDx('pvd').findings;
    expect(pvd.posterior.OD.vitreous).toBe('weiss-ring');
    expect(pvd.posterior.OD.lesions.some((l) => l.type === 'retinal-tear')).toBe(false);
    expect(pvd.fields.OD).toBe('full');

    const tear = byDx('retinal-tear').findings;
    expect(tear.posterior.OD.vitreous).toBe('pigment-shafer');
    expect(tear.posterior.OD.detachment).toBeUndefined();

    // superior detachment -> inferior field curtain
    const rd = byDx('retinal-detachment').findings;
    expect(rd.posterior.OS.detachment?.zones.every((z) => z.startsWith('super'))).toBe(true);
    expect(rd.fields.OS).toBe('curtain-inferior');
    expect(rd.pupils.rapd).toBe('OS');

    const csc = byDx('central-serous').findings;
    expect(csc.refraction.OS.sphere).toBeGreaterThan(csc.refraction.OD.sphere); // hyperopic shift
    expect(csc.pupils.rapd).toBe('none');

    const wet = byDx('wet-amd').findings;
    expect(wet.amsler.OS.result).toBe('metamorphopsia');
    expect(wet.posterior.OS.lesions.some((l) => l.type === 'subretinal-hemorrhage')).toBe(true);

    const pdr = byDx('pdr').findings;
    expect(pdr.posterior.OS.lesions.some((l) => l.type === 'neovascularization' && l.zone === 'disc')).toBe(true);

    const healthy = byDx('healthy-eyes').findings;
    for (const eye of ['OD', 'OS'] as Eye[]) {
      expect(healthy.posterior[eye].lesions).toEqual([]);
      expect(healthy.posterior[eye].vitreous).toBe('clear');
      expect(healthy.fields[eye]).toBe('full');
    }
  });
});
