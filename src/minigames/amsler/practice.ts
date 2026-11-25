/**
 * Practice scenarios + the end-of-practice recognition challenge — pure.
 */
import {
  buildFindings, EYES, otherEye,
  type AmslerFinding, type DeepPartial, type Eye, type PatientFindings, type PatientProfile,
  type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { classOf, directionOf, normalizeAmsler } from './geometry';
import { describeAmsler, locationOf, type FieldLocation } from './report';

const EYE_WORD: Record<Eye, string> = { OD: 'right eye (OD)', OS: 'left eye (OS)' };

const FIRST_F = ['Margot', 'Ines', 'Priya', 'Hannah', 'Rosa', 'Yuki', 'Amara', 'Lena', 'Odile', 'Farah'];
const FIRST_M = ['Arthur', 'Tomas', 'Kofi', 'Ravi', 'Henrik', 'Mateo', 'Jun', 'Elias', 'Omar', 'Felix'];
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Haddad', 'Tanaka', 'Reyes', 'Novak', 'Brennan', 'Sato', 'Varga', 'Whitcombe', 'Achebe'];
const JOBS = ['retired teacher', 'watchmaker', 'accountant', 'florist', 'pilot', 'translator', 'architect', 'baker', 'violinist', 'gardener'];

interface Archetype {
  key: string;
  /** shown in the answer key */
  cause: string;
  age: [number, number];
  sex: () => 'F' | 'M';
  weight: (d: number) => number;
  build: (rng: Rng, d: number, eye: Eye, age: number) => DeepPartial<PatientFindings>;
}

const r1 = (rng: Rng, a: number, b: number) => Math.round(rng.float(a, b) * 2) / 2;

/** Offset centre, more eccentric with difficulty, kept on the grid. */
function offCentre(rng: Rng, min: number, max: number, radius: number) {
  const ang = rng.float(0, Math.PI * 2);
  const d = rng.float(min, max);
  const lim = Math.max(0, 9.5 - radius);
  return {
    x: Math.max(-lim, Math.min(lim, Math.round(Math.cos(ang) * d))),
    y: Math.max(-lim, Math.min(lim, Math.round(Math.sin(ang) * d))),
  };
}

function va(affected: number): { uncorrected: number; bestCorrected: number; pinhole: number } {
  return { uncorrected: affected, bestCorrected: affected, pinhole: affected };
}

const ARCHETYPES: Archetype[] = [
  {
    key: 'healthy',
    cause: 'healthy maculae — straight lines, all four corners seen in each eye',
    age: [45, 78],
    sex: () => 'F',
    weight: (d) => 0.3 * (1 - d) + 0.06,
    build: () => ({}),
  },
  {
    key: 'wet-amd',
    cause: 'new metamorphopsia from choroidal neovascularisation (wet AMD) — urgent same-week retina referral',
    age: [66, 89],
    sex: () => 'F',
    weight: () => 0.22,
    build: (rng, d, eye, age) => {
      const radius = r1(rng, 3.5 - 1.8 * d, 5 - 2 * d);
      const fellow = otherEye(eye);
      const fellowGA = rng.chance(0.25 + 0.4 * d);
      return {
        amsler: {
          [eye]: { result: 'metamorphopsia', center: offCentre(rng, 0, 1 + 2 * d, radius), radius },
          [fellow]: fellowGA
            ? { result: 'paracentral-scotoma', center: offCentre(rng, 2.5, 4, 1.5), radius: 1.5 }
            : { result: 'normal' },
        },
        va: { [eye]: va(r1(rng, 0.4, 0.8)), [fellow]: va(fellowGA ? 0.2 : 0.1) },
        posterior: {
          [eye]: { lesions: [
            { type: 'subretinal-hemorrhage', zone: 'macula', density: 2 },
            { type: 'macular-edema', zone: 'macula', density: 3 },
            { type: 'drusen-large', zone: 'macula', density: 2 },
          ] },
          [fellow]: { lesions: fellowGA
            ? [{ type: 'geographic-atrophy', zone: 'macula', density: 2 }, { type: 'drusen-large', zone: 'macula', density: 3 }]
            : [{ type: 'drusen-large', zone: 'macula', density: 2 }] },
        },
        refraction: { OD: { add: age >= 55 ? 2.5 : 2 }, OS: { add: age >= 55 ? 2.5 : 2 } },
      } as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'ga',
    cause: 'geographic atrophy (dry AMD) — a paracentral scotoma that spares fixation; monitor and protect the fellow eye',
    age: [70, 90],
    sex: () => 'M',
    weight: (d) => 0.12 + 0.08 * d,
    build: (rng, d, eye) => {
      const radius = r1(rng, 2.5 - d, 3 - d);
      const bilateral = rng.chance(0.2 + 0.5 * d);
      const fellow = otherEye(eye);
      return {
        amsler: {
          [eye]: { result: 'paracentral-scotoma', center: offCentre(rng, 2.5 + radius * 0.5, 4 + d * 2, radius), radius },
          ...(bilateral ? { [fellow]: { result: 'paracentral-scotoma', center: offCentre(rng, 3, 5, 1.5), radius: 1.5 } } : {}),
        },
        va: { [eye]: va(r1(rng, 0.2, 0.4)) },
        posterior: {
          [eye]: { lesions: [{ type: 'geographic-atrophy', zone: 'macula', density: 3 }, { type: 'drusen-large', zone: 'macula', density: 2 }] },
          [fellow]: { lesions: [{ type: bilateral ? 'geographic-atrophy' : 'drusen-large', zone: 'macula', density: 2 }] },
        },
      } as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'csc',
    cause: 'central serous chorioretinopathy — distortion with micropsia over a serous bubble; ask about steroids and stress',
    age: [28, 50],
    sex: () => 'M',
    weight: () => 0.14,
    build: (rng, d, eye) => {
      const radius = r1(rng, 3 - d, 4 - d);
      return {
        amsler: { [eye]: { result: 'metamorphopsia', center: offCentre(rng, 0, 1 + 2 * d, radius), radius } },
        va: { [eye]: { uncorrected: 0.3, bestCorrected: 0.2, pinhole: 0.2 } },
        refraction: { [eye]: { sphere: 0.75 } },
        posterior: { [eye]: { detachment: { zones: ['macula'], maculaOff: true, kind: 'serous' } } },
      } as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'erm',
    cause: 'epiretinal membrane — slowly progressive distortion as the contracting membrane wrinkles and crowds the macula (objects can look larger: macropsia); routine retina opinion',
    age: [58, 82],
    sex: () => 'F',
    weight: (d) => 0.08 + 0.08 * d,
    build: (rng, d, eye) => {
      const radius = r1(rng, 2, 3);
      return {
        amsler: { [eye]: { result: 'metamorphopsia', center: offCentre(rng, 1.5, 2.5 + 2 * d, radius), radius } },
        va: { [eye]: va(0.2) },
        posterior: { [eye]: { lesions: [{ type: 'epiretinal-membrane', zone: 'macula', density: 2 }] } },
      } as DeepPartial<PatientFindings>;
    },
  },
  {
    key: 'hole',
    cause: 'full-thickness macular hole — a small central scotoma right at fixation; refer to retina soon',
    age: [60, 80],
    sex: () => 'F',
    weight: (d) => 0.06 + 0.08 * d,
    build: (rng, _d, eye) => ({
      amsler: { [eye]: { result: 'central-scotoma', center: { x: 0, y: 0 }, radius: r1(rng, 1, 1.5) } },
      va: { [eye]: va(r1(rng, 0.6, 1.0)) },
      posterior: { [eye]: { lesions: [{ type: 'macular-hole', zone: 'macula', density: 2 }] } },
    }) as DeepPartial<PatientFindings>,
  },
  {
    key: 'optic-neuritis',
    cause: 'optic neuritis — a central scotoma with red desaturation and an RAPD; urgent neuro-ophthalmic work-up',
    age: [20, 42],
    sex: () => 'F',
    weight: () => 0.1,
    build: (rng, d, eye) => ({
      amsler: { [eye]: { result: 'central-scotoma', center: { x: 0, y: 0 }, radius: r1(rng, 5 - 2 * d, 6 - 2 * d) } },
      va: { [eye]: va(r1(rng, 0.5, 1.0)) },
      pupils: { rapd: eye, rapdGrade: 2 },
      colorVision: { [eye]: { type: 'acquired-red-green', severity: 'moderate', redDesaturation: true } },
      fields: { [eye]: 'central-scotoma' },
      motility: { painOnMovement: true },
    }) as DeepPartial<PatientFindings>,
  },
  {
    key: 'dme',
    cause: 'diabetic macular oedema — thickened, fluid-filled macula bends the lines; refer for anti-VEGF assessment',
    age: [45, 72],
    sex: () => 'M',
    weight: (d) => 0.1 + 0.05 * d,
    build: (rng, d, eye) => {
      const radius = r1(rng, 2.5 - d, 4 - d);
      return {
        amsler: { [eye]: { result: 'metamorphopsia', center: offCentre(rng, 0.5, 2 + 2 * d, radius), radius } },
        va: { [eye]: va(0.3) },
        posterior: {
          [eye]: { lesions: [
            { type: 'macular-edema', zone: 'macula', density: 3 },
            { type: 'hard-exudate', zone: 'macula', density: 2 },
            { type: 'microaneurysm', zone: 'macula', density: 3 },
            { type: 'dot-blot-hemorrhage', zone: 'superotemporal', density: 2 },
          ] },
        },
      } as DeepPartial<PatientFindings>;
    },
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

export function practiceScenario(rng: Rng, difficulty: number): PracticeScenario {
  const d = Math.max(0, Math.min(1, Number.isFinite(difficulty) ? difficulty : 0.5));
  const arch = pickWeighted(rng, d);
  const age = rng.int(arch.age[0], arch.age[1]);
  const sex = rng.chance(0.7) ? arch.sex() : arch.sex() === 'F' ? 'M' : 'F';
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const findings = buildFindings(age, arch.build(rng, d, eye, age));
  const first = rng.pick(sex === 'F' ? FIRST_F : FIRST_M);
  const patient: PatientProfile = {
    name: `${first} ${rng.pick(LAST)}`,
    age,
    sex,
    occupation: rng.pick(JOBS),
    avatar: generateAvatar(rng, { age, sex }),
  };
  const chart = EYES.map((e) => `${e}: ${describeAmsler(findings.amsler[e], e)}`).join(' · ');
  return { patient, findings, answer: `${chart}. Likely cause: ${arch.cause}.` };
}

// ───────────────────────── recognition challenge

export interface ChallengeOption {
  id: string;
  label: string;
  correct: boolean;
}

export interface Challenge {
  eye: Eye;
  question: string;
  options: ChallengeOption[];
  explanation: string;
}

const KIND_WORD = { metamorphopsia: 'Wavy lines', scotoma: 'Missing patch' } as const;

const MIRROR: Record<FieldLocation, FieldLocation> = {
  central: 'central', superior: 'superior', inferior: 'inferior',
  temporal: 'nasal', nasal: 'temporal',
  superotemporal: 'superonasal', superonasal: 'superotemporal',
  inferotemporal: 'inferonasal', inferonasal: 'inferotemporal',
};
const VFLIP: Record<FieldLocation, FieldLocation> = {
  central: 'central', superior: 'inferior', inferior: 'superior', temporal: 'temporal', nasal: 'nasal',
  superotemporal: 'inferotemporal', inferotemporal: 'superotemporal',
  superonasal: 'inferonasal', inferonasal: 'superonasal',
};

function optLabel(kind: 'normal' | 'metamorphopsia' | 'scotoma', loc?: FieldLocation): string {
  if (kind === 'normal') return 'Normal grid — straight and complete';
  return `${KIND_WORD[kind]} — ${loc}`;
}

/** Choose the eye worth asking about: the abnormal one (largest defect), else OD. */
export function challengeEye(findings: PatientFindings): Eye {
  const abn = EYES.filter((e) => findings.amsler[e].result !== 'normal');
  if (!abn.length) return 'OD';
  return abn.sort((a, b) => normalizeAmsler(findings.amsler[b]).radius - normalizeAmsler(findings.amsler[a]).radius)[0]!;
}

const TEACH = {
  normal: 'A healthy macula maps a perfectly straight, complete grid with all four corners visible. Teach the patient to check each eye weekly at reading distance with their near glasses on.',
  metamorphopsia: 'Wavy or bent lines mean the photoreceptors themselves have been displaced — by fluid, blood or a membrane under or on the macula. New distortion in anyone over 50 is neovascular AMD until proven otherwise: same-week retina referral.',
  scotoma: 'A missing or grey patch is a scotoma — that part of the retina (or optic nerve) is not responding at all. Central loss with red desaturation points to the optic nerve; a patch that spares fixation in an older patient suggests geographic atrophy.',
} as const;

export function buildChallenge(findings: PatientFindings, rng: Rng): Challenge {
  const eye = challengeEye(findings);
  const f: AmslerFinding = findings.amsler[eye];
  const kind = classOf(f);
  const opts: { label: string; correct: boolean }[] = [];
  if (kind === 'normal') {
    opts.push({ label: optLabel('normal'), correct: true });
    opts.push({ label: optLabel('metamorphopsia', 'central'), correct: false });
    opts.push({ label: optLabel('scotoma', 'central'), correct: false });
    opts.push({ label: optLabel('scotoma', rng.pick(['superotemporal', 'inferonasal'] as const)), correct: false });
  } else {
    const loc = locationOf(f, eye);
    const other = kind === 'metamorphopsia' ? 'scotoma' : 'metamorphopsia';
    const mirror: FieldLocation = loc === 'central' ? rng.pick(['superotemporal', 'inferonasal'] as const) : MIRROR[loc];
    const seen = new Set<string>();
    const add = (label: string, correct: boolean) => {
      if (seen.has(label) || opts.length >= 4) return;
      seen.add(label);
      opts.push({ label, correct });
    };
    add(optLabel(kind, loc), true);
    // The classic error: mirroring temporal/nasal between the two eyes.
    add(optLabel(kind, mirror), false);
    add(optLabel(other, loc), false);
    const fillers: FieldLocation[] = [VFLIP[loc], 'central', 'temporal', 'inferonasal'];
    for (const l of fillers) add(optLabel(kind, l), false);
    if (opts.length < 4) add(optLabel('normal'), false);
  }
  const options = rng.shuffle(opts).map((o, i) => ({ id: `opt${i}`, ...o }));
  const sideNote = eye === 'OD'
    ? 'For the right eye, the patient’s right side of the card is the temporal field.'
    : 'For the left eye, the patient’s left side of the card is the temporal field.';
  const answer = kind === 'normal' ? 'a normal grid' : describeAmsler(f, eye).toLowerCase();
  return {
    eye,
    question: `How should the ${EYE_WORD[eye]} grid be charted?`,
    options,
    explanation: `${EYE_WORD[eye][0]!.toUpperCase()}${EYE_WORD[eye].slice(1)}: ${answer}. ${TEACH[kind]} ${kind === 'normal' ? '' : sideNote}`.trim(),
  };
}

// ───────────────────────── the patient's own words

/** The patient's own words for where it is — same classifier as the chart's field location. */
export function plainWhere(f: AmslerFinding): string {
  const d = directionOf(f);
  if (d.central) return 'right around the dot';
  const v = d.v > 0 ? 'above' : d.v < 0 ? 'below' : '';
  const h = d.h > 0 ? 'to the right' : d.h < 0 ? 'to the left' : '';
  if (v && h) return `${v} and ${h} of the dot`;
  if (v) return `just ${v} the dot`;
  return `just ${h} of the dot`;
}

/** What the patient says while fixating the dot with this eye. */
export function patientSays(f: AmslerFinding): string {
  if (f.result === 'normal') return 'The lines all look straight, and I can see all four corners of the square.';
  const n = normalizeAmsler(f);
  const where = plainWhere(f);
  if (f.result === 'metamorphopsia') {
    return n.radius >= 5
      ? `A big area ${where === 'right around the dot' ? 'around the dot' : where} looks warped — the lines bow and wobble, like old window glass.`
      : `The lines go wavy ${where} — like looking through rippled glass. The squares there look out of shape.`;
  }
  if (n.radius >= 8) return 'It’s nearly all dark. I can only just make out the edges of the card.';
  if (f.result === 'central-scotoma') return 'There’s a grey smudge right where the dot should be — I can’t actually see the dot.';
  return `I can see the dot, but there’s a faded, missing patch ${where}.`;
}
