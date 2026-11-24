import { describe, expect, it } from 'vitest';
import type { Diagnosis } from '@core';
import { URGENCIES } from '@core';
import refractive from './refractive';
import binocular from './binocular';
import lidsConjunctiva from './lids-conjunctiva';
import cornea from './cornea';
import uveaGlaucoma from './uvea-glaucoma';
import lens from './lens';
import retina from './retina';
import neuro from './neuro';
import normal from './normal';

/** Mirrors docs/GAME_DESIGN.md §8, grouped as the Codex files are. */
const EXPECTED: Record<string, { list: Diagnosis[]; ids: string[] }> = {
  refractive: { list: refractive, ids: ['myopia', 'hyperopia', 'astigmatism', 'presbyopia', 'anisometropia', 'amblyopia'] },
  binocular: {
    list: binocular,
    ids: ['convergence-insufficiency', 'accommodative-esotropia', 'intermittent-exotropia', 'cn6-palsy', 'cn4-palsy', 'cn3-palsy'],
  },
  lidsConjunctiva: {
    list: lidsConjunctiva,
    ids: [
      'dry-eye', 'blepharitis', 'chalazion', 'hordeolum', 'bacterial-conjunctivitis', 'viral-conjunctivitis',
      'allergic-conjunctivitis', 'subconjunctival-hemorrhage', 'pinguecula', 'pterygium', 'episcleritis',
    ],
  },
  cornea: {
    list: cornea,
    ids: ['corneal-abrasion', 'corneal-foreign-body', 'hsv-keratitis', 'microbial-keratitis', 'keratoconus', 'herpes-zoster-ophthalmicus'],
  },
  uveaGlaucoma: {
    list: uveaGlaucoma,
    ids: ['anterior-uveitis', 'acute-angle-closure', 'poag', 'ocular-hypertension', 'normal-tension-glaucoma'],
  },
  lens: { list: lens, ids: ['cataract'] },
  retina: {
    list: retina,
    ids: [
      'npdr', 'pdr', 'diabetic-macular-edema', 'hypertensive-retinopathy', 'dry-amd', 'wet-amd', 'retinal-detachment', 'pvd',
      'retinal-tear', 'crao', 'crvo', 'brvo', 'central-serous',
    ],
  },
  neuro: {
    list: neuro,
    ids: [
      'papilledema', 'optic-neuritis', 'giant-cell-arteritis', 'horner-syndrome', 'adie-pupil', 'pituitary-adenoma',
      'homonymous-hemianopia', 'congenital-color-deficiency',
    ],
  },
  normal: { list: normal, ids: ['healthy-eyes'] },
};

const all = Object.values(EXPECTED).flatMap((g) => g.list);

/** Player-facing text must stay clinic-themed: no moral or religious framing. */
const FORBIDDEN = /\b(sins?|sinful|deadly|vices?|pride|greed|envy|gluttony|lust|wrath|sloth|confess\w*|holy|divine)\b/i;

/** Sight- or life-threatening conditions must never be triaged as routine. */
const MUST_BE_EMERGENCY = ['acute-angle-closure', 'retinal-detachment', 'crao', 'giant-cell-arteritis', 'cn3-palsy'];

describe('diagnosis codex', () => {
  it('each file holds exactly its canonical ids, in order', () => {
    for (const [group, { list, ids }] of Object.entries(EXPECTED)) {
      expect(list.map((d) => d.id), group).toEqual(ids);
    }
  });

  it('covers every canonical id exactly once (57 entries)', () => {
    const ids = all.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(57);
  });

  it('every entry is rich and well-formed', () => {
    for (const d of all) {
      expect(d.name.trim(), d.id).not.toBe('');
      expect(d.summary.split(/(?<=[.!?])\s+/).length, `${d.id} summary sentences`).toBeGreaterThanOrEqual(2);
      expect(d.keyFindings.length, `${d.id} keyFindings`).toBeGreaterThanOrEqual(3);
      expect(d.keyFindings.length, `${d.id} keyFindings`).toBeLessThanOrEqual(6);
      expect(d.pearls.length, `${d.id} pearls`).toBeGreaterThanOrEqual(2);
      expect(d.pearls.length, `${d.id} pearls`).toBeLessThanOrEqual(4);
      expect(URGENCIES, d.id).toContain(d.typicalUrgency);
      expect(['common', 'uncommon', 'rare'], d.id).toContain(d.rarity);
      expect(d.reference, `${d.id} reference`).toMatch(/^https:\/\/(eyewiki\.aao\.org|www\.ncbi\.nlm\.nih\.gov\/books|medlineplus\.gov|www\.aao\.org)\//);
      for (const s of [...d.keyFindings, ...d.pearls, ...(d.aka ?? [])]) expect(s.trim(), d.id).not.toBe('');
    }
  });

  it('player-facing text never uses moral or religious framing', () => {
    for (const d of all) expect(JSON.stringify(d), d.id).not.toMatch(FORBIDDEN);
  });

  it('time-critical conditions are triaged as emergencies', () => {
    for (const id of MUST_BE_EMERGENCY) expect(all.find((d) => d.id === id)?.typicalUrgency, id).toBe('emergency');
  });

  it('categories match their Codex wing', () => {
    const allowed: Record<string, string[]> = {
      refractive: ['refractive'],
      binocular: ['binocular'],
      lidsConjunctiva: ['anterior'],
      cornea: ['cornea'],
      uveaGlaucoma: ['anterior', 'glaucoma'],
      lens: ['lens'],
      retina: ['retina', 'systemic'],
      neuro: ['neuro', 'systemic'],
      normal: ['normal'],
    };
    for (const [group, { list }] of Object.entries(EXPECTED)) {
      for (const d of list) expect(allowed[group], `${group}:${d.id}`).toContain(d.category);
    }
  });
});
