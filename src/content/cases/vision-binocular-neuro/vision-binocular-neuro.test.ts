/**
 * Group gate for the vision / binocular / neuro cases: the content contract plus
 * clinical-consistency invariants (unilateral signs on the right eye, the field
 * pattern that defines each neuro lesion, and so on).
 */
import { describe, expect, it } from 'vitest';
import { ALL_TESTS, URGENCIES, type ClinicalCase, type PatientFindings } from '@core';

const mods = import.meta.glob<{ default: ClinicalCase }>(['./*.ts', '!./*.test.ts'], { eager: true });
const cases = Object.values(mods).map((m) => m.default);
const byDx = (dx: string): ClinicalCase => {
  const c = cases.find((k) => k.diagnosis === dx);
  if (!c) throw new Error(`no case for ${dx}`);
  return c;
};
const f = (dx: string): PatientFindings => byDx(dx).findings;

const SIN_WORDS = /\b(sins?|deadly|vice|vices|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

const ASSIGNED = [
  'myopia', 'hyperopia', 'presbyopia', 'amblyopia', 'convergence-insufficiency', 'accommodative-esotropia',
  'cn6-palsy', 'cn4-palsy', 'cn3-palsy', 'horner-syndrome', 'optic-neuritis', 'papilledema',
  'pituitary-adenoma', 'homonymous-hemianopia', 'giant-cell-arteritis', 'congenital-color-deficiency',
];

describe('vision-binocular-neuro cases: contract', () => {
  it('has 16 unique cases covering each assigned diagnosis once', () => {
    expect(cases).toHaveLength(16);
    expect(new Set(cases.map((c) => c.id)).size).toBe(16);
    expect(cases.map((c) => c.diagnosis).sort()).toEqual([...ASSIGNED].sort());
  });

  for (const c of cases) {
    it(`${c.id} satisfies the clinical contract`, () => {
      expect(c.differentials.length).toBeGreaterThanOrEqual(3);
      expect(c.differentials.length).toBeLessThanOrEqual(5);
      expect(c.differentials).not.toContain(c.diagnosis);
      expect(new Set(c.differentials).size).toBe(c.differentials.length);
      for (const t of [...c.essentialTests, ...c.helpfulTests]) expect(ALL_TESTS).toContain(t);
      for (const t of c.essentialTests) expect(c.helpfulTests).not.toContain(t);
      expect(c.history.length).toBeGreaterThanOrEqual(6);
      expect(c.history.length).toBeLessThanOrEqual(10);
      expect(c.history.filter((h) => h.relevance === 'key').length).toBeGreaterThanOrEqual(2);
      expect(new Set(c.history.map((h) => h.id)).size).toBe(c.history.length);
      expect(URGENCIES).toContain(c.urgency);
      expect(c.teachingPoints.length).toBeGreaterThanOrEqual(3);
      expect(c.teachingPoints.length).toBeLessThanOrEqual(5);
      expect(c.sources?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(c)).not.toMatch(SIN_WORDS);
      for (const eye of ['OD', 'OS'] as const) {
        const r = c.findings.refraction[eye];
        expect(r.cylinder).toBeLessThanOrEqual(0);
        expect(r.axis).toBeGreaterThanOrEqual(1);
        expect(r.axis).toBeLessThanOrEqual(180);
        expect(Math.abs(r.sphere * 4 - Math.round(r.sphere * 4))).toBeLessThan(1e-9);
        const va = c.findings.va[eye];
        expect(va.bestCorrected).toBeLessThanOrEqual(va.uncorrected + 1e-9);
        const cdr = c.findings.posterior[eye].disc.cdr;
        expect(cdr).toBeGreaterThanOrEqual(0.05);
        expect(cdr).toBeLessThanOrEqual(0.95);
      }
    });
  }

  it('times only true emergencies, at least three of them, within 90–180 s', () => {
    const timed = cases.filter((c) => c.emergency);
    expect(timed.length).toBeGreaterThanOrEqual(3);
    for (const c of timed) {
      expect(c.urgency).toBe('emergency');
      expect(c.emergency!.timeLimitSec).toBeGreaterThanOrEqual(90);
      expect(c.emergency!.timeLimitSec).toBeLessThanOrEqual(180);
    }
    for (const dx of ['cn3-palsy', 'giant-cell-arteritis', 'homonymous-hemianopia']) expect(byDx(dx).emergency).toBeDefined();
  });

  it('spreads difficulty and ages from toddlers to the 90s', () => {
    expect(new Set(cases.map((c) => c.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
    const ages = cases.map((c) => c.patient.age);
    expect(Math.min(...ages)).toBeLessThan(6);
    expect(Math.max(...ages)).toBeGreaterThanOrEqual(90);
  });
});

describe('vision-binocular-neuro cases: clinical consistency', () => {
  it('refractive blur improves with pinhole; amblyopia does not', () => {
    for (const dx of ['myopia']) {
      for (const eye of ['OD', 'OS'] as const) {
        const va = f(dx).va[eye];
        expect(va.pinhole!).toBeLessThan(va.uncorrected - 0.3);
      }
    }
    const amb = f('amblyopia').va.OS;
    expect(amb.pinhole).toBeGreaterThanOrEqual(amb.uncorrected);
    expect(amb.bestCorrected).toBeGreaterThan(0.2);
  });

  it('presbyope needs an add and has a low amplitude for age', () => {
    const p = f('presbyopia');
    expect(p.refraction.OD.add).toBeGreaterThan(0);
    expect(p.va.OD.nearUncorrected!).toBeGreaterThan(p.va.OD.uncorrected);
    expect(p.accommodation.amplitudeD.OD).toBeLessThan(5);
  });

  it('convergence insufficiency: exo greater at near and receded NPC', () => {
    const m = f('convergence-insufficiency').motility;
    expect(m.near.horizontal).toBeLessThanOrEqual(m.distance.horizontal - 4);
    expect(m.npcCm).toBeGreaterThanOrEqual(6);
  });

  it('accommodative esotropia: comitant eso with significant hyperopia', () => {
    const a = f('accommodative-esotropia');
    expect(a.motility.near.horizontal).toBeGreaterThan(0);
    expect(a.motility.near.horizontal).toBeGreaterThanOrEqual(a.motility.distance.horizontal);
    expect(Object.keys(a.motility.versions)).toHaveLength(0);
    expect(a.refraction.OD.sphere).toBeGreaterThanOrEqual(2);
  });

  it('CN VI: eso greater at distance with abduction deficit of the deviating eye', () => {
    const m = f('cn6-palsy').motility;
    expect(m.distance.horizontal).toBeGreaterThan(m.near.horizontal);
    expect(m.distance.deviatingEye).toBe('OS');
    expect(m.versions.left!.OS).toBeLessThan(0);
    expect(m.headPosture).toBe('turn-left');
  });

  it('CN IV: right hyper, head tilt away from the lesion', () => {
    const m = f('cn4-palsy').motility;
    expect(m.distance.vertical).toBeGreaterThan(0);
    expect(m.distance.deviatingEye).toBe('OD');
    expect(m.headPosture).toBe('tilt-left');
    expect(m.versions.downLeft!.OD).toBeLessThan(0);
  });

  it('CN III: ptosis and the larger, fixed pupil on the same eye, exotropic', () => {
    const c = f('cn3-palsy');
    expect(c.external?.ptosis).toEqual(['OS']);
    expect(c.anterior.OS.lids).toContain('ptosis');
    expect(c.pupils.sizeLightMm.OS).toBeGreaterThan(c.pupils.sizeLightMm.OD + 2);
    expect(c.pupils.reactivity.OS).toBe('fixed');
    expect(c.pupils.rapd).toBe('none');
    expect(c.motility.distance.horizontal).toBeLessThan(0);
  });

  it('Horner: smaller pupil on the ptotic side, anisocoria greater in the dark', () => {
    const h = f('horner-syndrome');
    expect(h.external?.ptosis).toEqual(['OS']);
    expect(h.pupils.sizeDarkMm.OS).toBeLessThan(h.pupils.sizeDarkMm.OD);
    const dark = h.pupils.sizeDarkMm.OD - h.pupils.sizeDarkMm.OS;
    const light = h.pupils.sizeLightMm.OD - h.pupils.sizeLightMm.OS;
    expect(dark).toBeGreaterThan(light);
    expect(h.pupils.reactivity).toEqual({ OD: 'brisk', OS: 'brisk' });
  });

  it('optic neuropathies: RAPD, red desaturation and field loss on the worse eye', () => {
    for (const [dx, eye] of [['optic-neuritis', 'OS'], ['giant-cell-arteritis', 'OD']] as const) {
      const x = f(dx);
      const other = eye === 'OD' ? 'OS' : 'OD';
      expect(x.pupils.rapd).toBe(eye);
      expect(x.va[eye].bestCorrected).toBeGreaterThan(x.va[other].bestCorrected);
      expect(x.colorVision[eye].redDesaturation).toBe(true);
      expect(x.fields[eye]).not.toBe('full');
      expect(x.fields[other]).toBe('full');
    }
    expect(f('optic-neuritis').motility.painOnMovement).toBe(true);
    const gca = f('giant-cell-arteritis');
    expect(gca.posterior.OD.disc).toMatchObject({ color: 'pale', edema: true });
    expect(gca.external?.templeTenderness).toBe(true);
    expect(byDx('giant-cell-arteritis').patient.age).toBeGreaterThanOrEqual(50);
  });

  it('papilloedema: bilateral swollen discs, normal acuity, no RAPD', () => {
    const p = f('papilledema');
    for (const eye of ['OD', 'OS'] as const) {
      expect(p.posterior[eye].disc.edema).toBe(true);
      expect(p.posterior[eye].disc.svp).toBe(false);
      expect(p.fields[eye]).toBe('enlarged-blind-spot');
      expect(p.va[eye].bestCorrected).toBeLessThanOrEqual(0);
    }
    expect(p.pupils.rapd).toBe('none');
  });

  it('chiasm vs retrochiasmal: bitemporal vs homonymous fields, normal pupils', () => {
    const pit = f('pituitary-adenoma');
    expect(pit.fields).toEqual({ OD: 'temporal-hemianopia', OS: 'temporal-hemianopia' });
    const hh = f('homonymous-hemianopia');
    expect(hh.fields.OD).toBe(hh.fields.OS);
    expect(['left-hemianopia', 'right-hemianopia']).toContain(hh.fields.OD);
    expect(hh.pupils.rapd).toBe('none');
  });

  it('congenital colour deficiency is bilateral, symmetric, red-green, with normal acuity', () => {
    const cv = f('congenital-color-deficiency');
    expect(cv.colorVision.OD).toEqual(cv.colorVision.OS);
    expect(['protan', 'deutan']).toContain(cv.colorVision.OD.type);
    expect(cv.va.OD.bestCorrected).toBeLessThanOrEqual(0);
    expect(byDx('congenital-color-deficiency').patient.sex).toBe('M');
  });
});

describe('vision-binocular-neuro cases: review regressions', () => {
  it('cites no source pages known to be missing, and no copied sources from another diagnosis', () => {
    const dead = ['eyewiki.aao.org/Homonymous_Hemianopia', 'eyewiki.aao.org/Pituitary_Apoplexy'];
    for (const c of cases) {
      for (const s of c.sources ?? []) expect(dead.some((d) => s.includes(d)), `${c.id}: ${s}`).toBe(false);
    }
    expect(byDx('hyperopia').sources?.join(' ')).not.toMatch(/esotropia/i);
  });

  it('CN IV: the lower (hypertropic eye) image is the tilted one', () => {
    expect(byDx('cn4-palsy').chiefComplaint).toMatch(/bottom one is a bit tilted/);
  });

  it('CN III: down-and-in (CN IV territory) is only mildly limited', () => {
    const v = f('cn3-palsy').motility.versions?.downRight;
    expect(v?.OS ?? 0).toBeGreaterThanOrEqual(-2);
  });

  it('myopia squints on the avatar; the latent hyperope (0.0 unaided) does not', () => {
    expect(f('myopia').external?.squinting).toBe(true);
    expect(f('hyperopia').external?.squinting ?? false).toBe(false);
  });

  it('homonymous hemianopia pearl does not credit macular sparing for preserved acuity', () => {
    const pearls = byDx('homonymous-hemianopia').teachingPoints.join(' ');
    expect(pearls).not.toMatch(/because the macula is often spared/i);
    expect(pearls).toMatch(/even when the macula is split/i);
  });

  it('presbyope amplitude is at or above the Hofstetter minimum for age', () => {
    const c = byDx('presbyopia');
    const min = 15 - 0.25 * c.patient.age;
    expect(f('presbyopia').accommodation.amplitudeD.OD).toBeGreaterThanOrEqual(min - 0.01);
  });

  it('CI reports near diplopia consistent with the complaint', () => {
    expect(f('convergence-insufficiency').motility.diplopia).toBe('horizontal');
  });

  it('Horner cites at least two sources', () => {
    expect(byDx('horner-syndrome').sources?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
