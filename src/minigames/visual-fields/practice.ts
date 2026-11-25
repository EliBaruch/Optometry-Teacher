/**
 * Practice scenarios — pure. Clinically coherent patients whose fields (and the
 * supporting findings: discs, pupils, acuity) fit one cause. Harder difficulty
 * favours subtler patterns (quadrantanopias, nasal steps, cecocentral loss).
 */
import {
  buildFindings, otherEye,
  type DeepPartial, type Eye, type FieldDefect, type PatientFindings, type PatientProfile,
  type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { describeEye, localise, LOCALISATION_LABEL, patternOf, type Localisation } from './interpret';

const FIRST_F = ['Celeste', 'Noor', 'Ingrid', 'Mei', 'Ada', 'Lucia', 'Zara', 'Freya', 'Esme', 'Rania'];
const FIRST_M = ['Bruno', 'Idris', 'Kenji', 'Silas', 'Anders', 'Tobias', 'Dev', 'Mikhail', 'Rafael', 'Hugo'];
const LAST = ['Halloran', 'Ferreira', 'Kowalski', 'Nakamura', 'Osei', 'Lindgren', 'Barros', 'Quint', 'Mbeki', 'Vance', 'Ashdown'];
const JOBS = ['lorry driver', 'cartographer', 'harpist', 'bus driver', 'librarian', 'electrician', 'chef', 'astronomer', 'retired surveyor', 'dentist'];

interface Archetype {
  key: string;
  cause: string;
  age: [number, number];
  sex?: 'F' | 'M';
  weight: (d: number) => number;
  build: (rng: Rng, d: number, eye: Eye) => DeepPartial<PatientFindings>;
}

const fields = (od: FieldDefect, os: FieldDefect) => ({ fields: { OD: od, OS: os } });

const ARCHETYPES: Archetype[] = [
  {
    key: 'healthy',
    cause: 'healthy visual pathways — only the physiological blind spot, 15° temporal in each eye',
    age: [22, 70],
    weight: (d) => 0.16 * (1 - d) + 0.04,
    build: () => ({}),
  },
  {
    key: 'poag',
    cause: 'primary open-angle glaucoma — arcuate nerve-fibre-bundle loss opposite the thinned rim',
    age: [55, 82],
    weight: () => 0.16,
    build: (rng, d, eye) => {
      const sup = rng.chance(0.65); // inferior rim goes first -> superior field
      const fellow: FieldDefect = rng.chance(0.3 + 0.4 * d) ? 'nasal-step' : 'full';
      const f: Record<Eye, FieldDefect> = { OD: 'full', OS: 'full' };
      f[eye] = sup ? 'superior-arcuate' : 'inferior-arcuate';
      f[otherEye(eye)] = fellow;
      return {
        ...fields(f.OD, f.OS),
        iop: { [eye]: rng.int(25, 31), [otherEye(eye)]: rng.int(20, 24) },
        posterior: {
          [eye]: { disc: { cdr: 0.8, rimThinning: sup ? 'inferior' : 'superior' } },
          [otherEye(eye)]: { disc: { cdr: fellow === 'full' ? 0.5 : 0.65 } },
        },
      } as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'pituitary',
    cause: 'pituitary macroadenoma compressing the chiasm from below — the crossing nasal fibres (temporal fields) go first, superiorly',
    age: [35, 68],
    weight: () => 0.14,
    build: (rng, d) => {
      const early = rng.chance(0.25 + 0.5 * d);
      return {
        ...(early
          ? fields('right-superior-quadrantanopia', 'left-superior-quadrantanopia')
          : fields('temporal-hemianopia', 'temporal-hemianopia')),
        posterior: { OD: { disc: { color: early ? 'pink' : 'pale' } }, OS: { disc: { color: early ? 'pink' : 'pale' } } },
      } as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'stroke',
    cause: 'posterior cerebral artery stroke — a homonymous hemianopia on the side opposite the lesion',
    age: [58, 86],
    weight: () => 0.14,
    build: (rng, d) => {
      const side = rng.chance(0.5) ? 'left' : 'right';
      const quad = rng.chance(0.15 + 0.5 * d);
      if (!quad) return fields(`${side}-hemianopia`, `${side}-hemianopia`) as DeepPartial<PatientFindings>;
      const upper = rng.chance(0.5);
      const q = `${side}-${upper ? 'superior' : 'inferior'}-quadrantanopia` as FieldDefect;
      return fields(q, q) as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'optic-neuritis',
    cause: 'demyelinating optic neuritis — a central scotoma with an RAPD and red desaturation in that eye',
    age: [19, 42],
    sex: 'F',
    weight: () => 0.1,
    build: (rng, _d, eye) => ({
      fields: { [eye]: 'central-scotoma' },
      va: { [eye]: { uncorrected: 0.7, bestCorrected: 0.7, pinhole: 0.7 } },
      pupils: { rapd: eye, rapdGrade: rng.pick([2, 3] as const) },
      colorVision: { [eye]: { type: 'acquired-red-green', severity: 'moderate', redDesaturation: true } },
      motility: { painOnMovement: true },
    }) as DeepPartial<PatientFindings>,
  },
  {
    key: 'toxic',
    cause: 'bilateral toxic / nutritional optic neuropathy — symmetrical cecocentral scotomas through the papillomacular bundle',
    age: [30, 64],
    sex: 'M',
    weight: (d) => 0.03 + 0.08 * d,
    build: () => ({
      ...fields('cecocentral-scotoma', 'cecocentral-scotoma'),
      va: { OD: { uncorrected: 0.8, bestCorrected: 0.8, pinhole: 0.8 }, OS: { uncorrected: 0.8, bestCorrected: 0.8, pinhole: 0.8 } },
      colorVision: { OD: { type: 'acquired-red-green', severity: 'moderate' }, OS: { type: 'acquired-red-green', severity: 'moderate' } },
      posterior: { OD: { disc: { color: 'pale-sectoral' } }, OS: { disc: { color: 'pale-sectoral' } } },
    }) as DeepPartial<PatientFindings>,
  },
  {
    key: 'papilloedema',
    cause: 'papilloedema from raised intracranial pressure — swollen discs enlarge both blind spots; acuity is usually preserved',
    age: [20, 40],
    sex: 'F',
    weight: () => 0.1,
    build: () => ({
      ...fields('enlarged-blind-spot', 'enlarged-blind-spot'),
      posterior: {
        OD: { disc: { margins: 'elevated', edema: true, svp: false, color: 'hyperemic' } },
        OS: { disc: { margins: 'elevated', edema: true, svp: false, color: 'hyperemic' } },
      },
    }) as DeepPartial<PatientFindings>,
  },
  {
    key: 'aion',
    cause: 'anterior ischaemic optic neuropathy — an altitudinal defect (usually inferior); in anyone over 50, exclude giant cell arteritis today',
    age: [58, 84],
    weight: () => 0.09,
    build: (rng, _d, eye) => ({
      fields: { [eye]: rng.chance(0.75) ? 'inferior-altitudinal' : 'superior-altitudinal' },
      va: { [eye]: { uncorrected: 0.5, bestCorrected: 0.5, pinhole: 0.5 } },
      pupils: { rapd: eye, rapdGrade: 2 },
      posterior: { [eye]: { disc: { edema: true, margins: 'blurred', color: 'pale' } } },
    }) as DeepPartial<PatientFindings>,
  },
  {
    key: 'rd',
    cause: 'rhegmatogenous retinal detachment — the field loss sits OPPOSITE the detached retina and creeps toward fixation',
    age: [45, 72],
    weight: () => 0.08,
    build: (rng, _d, eye) => {
      const from = rng.pick(['superior', 'inferior', 'temporal', 'nasal'] as const);
      // A detachment of the superior retina blocks the inferior field, etc.
      const field: FieldDefect = `curtain-${({ superior: 'inferior', inferior: 'superior', temporal: 'nasal', nasal: 'temporal' } as const)[from]}`;
      const zone = from === 'superior' ? 'superotemporal' : from === 'inferior' ? 'inferotemporal' : from === 'temporal' ? 'superotemporal' : 'superonasal';
      return {
        fields: { [eye]: field },
        refraction: { [eye]: { sphere: -6 }, [otherEye(eye)]: { sphere: -5.5 } },
        pupils: { rapd: eye, rapdGrade: 1 },
        posterior: { [eye]: { vitreous: 'pigment-shafer', detachment: { zones: [zone], maculaOff: false }, lesions: [{ type: 'retinal-tear', zone, density: 2 }] } },
      } as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'crao',
    cause: 'central retinal artery occlusion — sudden near-total loss with a temporal island; an eye stroke, treat as an emergency',
    age: [62, 86],
    weight: (d) => 0.04 + 0.05 * d,
    build: (_rng, _d, eye) => ({
      fields: { [eye]: 'temporal-island' },
      va: { [eye]: { uncorrected: 1.9, bestCorrected: 1.9, pinhole: 1.9 } },
      pupils: { rapd: eye, rapdGrade: 4 },
      posterior: { [eye]: { lesions: [{ type: 'retinal-whitening', zone: 'diffuse', density: 4 }, { type: 'cherry-red-spot', zone: 'macula', density: 2 }], vessels: { segmentation: true } } },
    }) as DeepPartial<PatientFindings>,
  },
  {
    key: 'rp',
    cause: 'retinitis pigmentosa — rod loss constricts both fields to a tunnel; night blindness came first',
    age: [24, 55],
    weight: (d) => 0.04 + 0.05 * d,
    build: () => ({
      ...fields('constricted', 'constricted'),
      posterior: {
        OD: { lesions: [{ type: 'pigment-clumping', zone: 'periphery', density: 4 }], disc: { color: 'pale' } },
        OS: { lesions: [{ type: 'pigment-clumping', zone: 'periphery', density: 4 }], disc: { color: 'pale' } },
      },
    }) as DeepPartial<PatientFindings>,
  },
];

function pickWeighted(rng: Rng, d: number): Archetype {
  const total = ARCHETYPES.reduce((s, a) => s + a.weight(d), 0);
  let x = rng.next() * total;
  for (const a of ARCHETYPES) {
    x -= a.weight(d);
    if (x <= 0) return a;
  }
  return ARCHETYPES[ARCHETYPES.length - 1]!;
}

export const ARCHETYPE_KEYS = ARCHETYPES.map((a) => a.key);

export function practiceScenario(rng: Rng, difficulty: number, forceKey?: string): PracticeScenario {
  const d = Math.max(0, Math.min(1, Number.isFinite(difficulty) ? difficulty : 0.5));
  const arch = (forceKey && ARCHETYPES.find((a) => a.key === forceKey)) || pickWeighted(rng, d);
  const age = rng.int(arch.age[0], arch.age[1]);
  const sex: 'F' | 'M' = arch.sex ? (rng.chance(0.75) ? arch.sex : arch.sex === 'F' ? 'M' : 'F') : rng.chance(0.5) ? 'F' : 'M';
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const findings = buildFindings(age, arch.build(rng, d, eye));
  const patient: PatientProfile = {
    name: `${rng.pick(sex === 'F' ? FIRST_F : FIRST_M)} ${rng.pick(LAST)}`,
    age,
    sex,
    occupation: rng.pick(JOBS),
    avatar: generateAvatar(rng, { age, sex }),
  };
  const od = findings.fields.OD;
  const os = findings.fields.OS;
  const loc = localise(patternOf(od, 'OD'), patternOf(os, 'OS'));
  return {
    patient,
    findings,
    answer: `OD: ${describeEye(od, 'OD')} · OS: ${describeEye(os, 'OS')}. Lesion: ${LOCALISATION_LABEL[loc]}. Likely cause: ${arch.cause}.`,
  };
}

/** Teaching explanation for the localisation challenge. */
export const LOCALISATION_TEACH: Record<Localisation, string> = {
  none: 'Both fields are full: the only hole is the physiological blind spot, 15° temporal and just below the horizontal — where the optic disc has no photoreceptors.',
  prechiasmal:
    'A defect confined to one eye’s own anatomy — an arc from the blind spot, a central hole, an altitudinal half or a curtain — lies in front of the chiasm: retina or optic nerve. Arcuate and altitudinal defects respect the HORIZONTAL meridian because retinal nerve fibres never cross the horizontal raphe.',
  chiasm:
    'Temporal halves lost in both eyes means the crossing nasal fibres are hit where they decussate — the chiasm. From below (pituitary) the superotemporal quadrants go first. Image the sella urgently.',
  'retro-right':
    'The same (left) half missing in both eyes, respecting the VERTICAL meridian, means the lesion is behind the chiasm on the right: optic tract, radiations or occipital cortex. Superior quadrants = temporal lobe (Meyer’s loop); inferior = parietal.',
  'retro-left':
    'The same (right) half missing in both eyes, respecting the VERTICAL meridian, means the lesion is behind the chiasm on the left: optic tract, radiations or occipital cortex. Superior quadrants = temporal lobe (Meyer’s loop); inferior = parietal.',
};
