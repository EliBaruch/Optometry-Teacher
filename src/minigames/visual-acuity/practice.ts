/**
 * Arcade scenarios: clinically coherent patients whose acuity, refraction and
 * pathology agree (a myope fogs at distance but pinholes to 20/25; macular
 * degeneration does not pinhole; a pre-schooler gets LEA symbols…).
 */
import {
  buildFindings, type AmslerFinding, type ColorVision, type CorneaSign, type DeepPartial, type Eye, type FieldDefect, type Keratometry,
  type LensSign, type PatientFindings, type PatientProfile, type PracticeScenario, type RedReflex, type RetinalLesion, type RetinoscopyReflex, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { formatFeet, formatMetric } from './notation';
import { pinholeLogmar } from './optics';
import { pinholeVerdict } from './report';

/** Uncorrected blur (dioptric blur strength) → logMAR, from clinical defocus tables. */
const DEFOCUS_TABLE: [number, number][] = [
  [0, 0], [0.25, 0.1], [0.5, 0.25], [0.75, 0.4], [1, 0.5], [1.5, 0.7], [2, 0.9], [2.5, 1.0], [3, 1.15], [4, 1.3], [6, 1.5], [10, 1.7],
];

export function defocusLogmar(blurD: number): number {
  const b = Math.abs(blurD);
  for (let i = 1; i < DEFOCUS_TABLE.length; i++) {
    const [d1, v1] = DEFOCUS_TABLE[i]!;
    const [d0, v0] = DEFOCUS_TABLE[i - 1]!;
    if (b <= d1) return v0 + ((b - d0) / (d1 - d0)) * (v1 - v0);
  }
  return DEFOCUS_TABLE[DEFOCUS_TABLE.length - 1]![1];
}

/** Thibos blur strength after the patient's sustainable accommodation. */
export function blurStrength(sphere: number, cylinder: number, amplitude: number): number {
  let m = sphere + cylinder / 2;
  if (m > 0) m = Math.max(0, m - amplitude * 0.67);
  return Math.sqrt(m * m + (cylinder / 2) ** 2);
}

/** Refractive and pathological MARs add: VA sc = log10(MAR_bc + MAR_ref − 1). */
export function combineLogmar(bestCorrected: number, refractive: number): number {
  const v = Math.log10(Math.pow(10, bestCorrected) + Math.pow(10, refractive) - 1);
  return Math.round(v * 10) / 10;
}

const q = (v: number) => Math.round(v * 4) / 4;
const r1 = (v: number) => Math.round(v * 10) / 10;

const FIRST = {
  F: ['Amara', 'Ines', 'Mei', 'Sofia', 'Priya', 'Hana', 'Zainab', 'Lucia', 'Noor', 'Freya', 'Imani', 'Yara'],
  M: ['Mateo', 'Kenji', 'Tariq', 'Oskar', 'Rafael', 'Kwame', 'Arjun', 'Elias', 'Dmitri', 'Malik', 'Theo', 'Joon'],
};
const LAST = ['Okafor', 'Lindqvist', 'Haddad', 'Moreau', 'Tanaka', 'Silva', 'Novak', 'Mensah', 'Iyer', 'Kowalski', 'Ruiz', 'Byrne', 'Achebe', 'Park'];
const JOBS_ADULT = ['Night-bus driver', 'Pastry chef', 'Court stenographer', 'Lighthouse keeper', 'Data analyst', 'Violin restorer', 'Forklift operator', 'Archivist', 'Nurse', 'Tattoo artist', 'Air-traffic assistant', 'Beekeeper'];
const JOBS_OLD = ['Retired watchmaker', 'Retired teacher', 'Allotment champion', 'Crossword setter', 'Retired sea captain', 'Choir librarian'];

function makePatient(rng: Rng, age: number): PatientProfile {
  const sex = rng.chance(0.5) ? 'F' : 'M';
  const occupation = age < 5 ? 'Pre-schooler, crayon expert' : age < 18 ? `Year ${Math.max(1, age - 4)} student` : age >= 66 ? rng.pick(JOBS_OLD) : rng.pick(JOBS_ADULT);
  return {
    name: `${rng.pick(FIRST[sex])} ${rng.pick(LAST)}`,
    age, sex, occupation,
    avatar: generateAvatar(rng, { age, sex }),
  };
}

export type Archetype =
  | 'normal' | 'myopia' | 'hyperopia' | 'astigmatism' | 'amblyopia' | 'preschool'
  | 'cataract' | 'amd' | 'optic-neuritis' | 'keratoconus';

interface Built {
  age: number;
  patch: DeepPartial<PatientFindings>;
  story: string;
}

type Va = { uncorrected: number; bestCorrected: number; pinhole?: number };

function refractiveEye(rng: Rng, sphere: number, cylinder: number, axis: number, amp: number, bc = -0.1): { rx: { sphere: number; cylinder: number; axis: number }; va: Va } {
  const sc = combineLogmar(bc, defocusLogmar(blurStrength(sphere, cylinder, amp)));
  void rng;
  return { rx: { sphere: q(sphere), cylinder: q(cylinder), axis }, va: { uncorrected: Math.max(bc, sc), bestCorrected: bc } };
}

/** `{ OD: v }` or `{ OS: v }` — a one-eye patch. */
function at<T>(eye: Eye, v: T): { OD?: T; OS?: T } {
  return eye === 'OD' ? { OD: v } : { OS: v };
}

/** Distinct values for a chosen eye and its fellow. */
function pair<T>(eye: Eye, mine: T, fellow: T): { OD: T; OS: T } {
  return eye === 'OD' ? { OD: mine, OS: fellow } : { OD: fellow, OS: mine };
}

const amplitudeFor = (age: number) => Math.max(0.5, 18.5 - 0.3 * age);

function build(rng: Rng, kind: Archetype): Built {
  switch (kind) {
    case 'normal': {
      const age = rng.int(18, 58);
      const v = rng.pick([-0.1, 0, 0]);
      return { age, patch: { va: { OD: { uncorrected: v, bestCorrected: -0.1 }, OS: { uncorrected: rng.pick([v, 0]), bestCorrected: -0.1 } } }, story: 'healthy eyes — no refractive blur' };
    }
    case 'myopia': {
      const age = rng.int(10, 38);
      const amp = amplitudeFor(age);
      const s = q(-rng.float(0.75, 4.5));
      const od = refractiveEye(rng, s, q(-rng.float(0, 0.75)), rng.pick([180, 175, 5, 90]), amp);
      const os = refractiveEye(rng, q(s + rng.float(-0.75, 0.75)), q(-rng.float(0, 0.75)), rng.pick([180, 170, 10]), amp);
      return { age, patch: { refraction: { OD: od.rx, OS: os.rx }, va: { OD: od.va, OS: os.va }, posterior: s < -4 ? { OD: { fundusTone: 'tigroid' }, OS: { fundusTone: 'tigroid' } } : undefined }, story: 'myopia — distance blur that a pinhole clears' };
    }
    case 'hyperopia': {
      const age = rng.int(52, 74);
      const amp = amplitudeFor(age);
      const s = q(rng.float(1.25, 3.25));
      const od = refractiveEye(rng, s, q(-rng.float(0, 0.5)), 90, amp, 0);
      const os = refractiveEye(rng, q(s + rng.float(-0.5, 0.5)), q(-rng.float(0, 0.5)), 90, amp, 0);
      return { age, patch: { refraction: { OD: { ...od.rx, add: 2.25 }, OS: { ...os.rx, add: 2.25 } }, va: { OD: od.va, OS: os.va } }, story: 'latent hyperopia unmasked as accommodation fades' };
    }
    case 'astigmatism': {
      const age = rng.int(16, 48);
      const amp = amplitudeFor(age);
      const c = q(-rng.float(1.25, 3.0));
      const axis = rng.pick([180, 90, 45, 135, 15, 165]);
      const s = q(rng.float(-0.5, 0.25));
      const od = refractiveEye(rng, s, c, axis, amp);
      const os = refractiveEye(rng, s, q(c + rng.float(-0.5, 0.5)), axis === 45 ? 135 : axis === 135 ? 45 : axis, amp);
      return { age, patch: { refraction: { OD: od.rx, OS: os.rx }, va: { OD: od.va, OS: os.va } }, story: 'regular astigmatism — the blur smears along one meridian' };
    }
    case 'amblyopia': {
      const age = rng.int(6, 10);
      const amp = amplitudeFor(age);
      const bad: Eye = rng.pick(['OD', 'OS'] as const);
      const bc = r1(rng.float(0.3, 0.6));
      const s = q(rng.float(3.5, 5.5));
      const amb = refractiveEye(rng, s, q(-rng.float(0, 1)), 180, amp * 0.5, bc);
      const good = refractiveEye(rng, q(rng.float(0, 0.75)), 0, 180, amp, 0);
      return {
        age,
        patch: { refraction: pair(bad, amb.rx, good.rx), va: pair<Va>(bad, { ...amb.va, uncorrected: Math.max(amb.va.uncorrected, bc + 0.2) }, good.va) },
        story: `anisometropic amblyopia ${bad} — the pinhole helps only partly`,
      };
    }
    case 'preschool': {
      const age = rng.int(3, 4);
      const v = rng.pick([0.2, 0.3]);
      return { age, patch: { refraction: { OD: { sphere: 1.5, cylinder: 0, axis: 180 }, OS: { sphere: 1.5, cylinder: 0, axis: 180 } }, va: { OD: { uncorrected: v, bestCorrected: v }, OS: { uncorrected: v, bestCorrected: v } } }, story: 'normal for age — pre-schoolers are not yet 20/20' };
    }
    case 'cataract': {
      const age = rng.int(66, 86);
      const eye: Eye = rng.pick(['OD', 'OS'] as const);
      const grade = rng.int(2, 4);
      const bc = r1(0.1 + grade * 0.12 + rng.float(0, 0.15));
      const shift = q(-rng.float(0.5, 1.5));
      const va = { uncorrected: combineLogmar(bc, defocusLogmar(Math.abs(shift))), bestCorrected: bc };
      const psc = grade >= 3 && rng.chance(0.4);
      return {
        age,
        patch: {
          refraction: at(eye, { sphere: shift, cylinder: -0.5, axis: 90, add: 2.5 }),
          va: at(eye, { ...va, pinhole: r1(Math.max(bc, va.uncorrected - 0.1)) }),
          anterior: at(eye, { lens: (psc ? ['nuclear-sclerosis', 'posterior-subcapsular'] : ['nuclear-sclerosis', 'cortical-cataract']) as LensSign[], lensGrade: grade }),
          redReflex: at<RedReflex>(eye, 'dull'),
        },
        story: `cataract ${eye} — a cloudy lens is not refractive blur, so the pinhole barely helps`,
      };
    }
    case 'amd': {
      const age = rng.int(72, 89);
      const eye: Eye = rng.pick(['OD', 'OS'] as const);
      const wet = rng.chance(0.5);
      const bc = r1(rng.float(0.5, 1.1));
      return {
        age,
        patch: {
          refraction: { OD: { sphere: 0.75, cylinder: -0.5, axis: 90, add: 2.5 }, OS: { sphere: 0.75, cylinder: -0.5, axis: 90, add: 2.5 } },
          va: at(eye, { uncorrected: r1(bc + 0.1), bestCorrected: bc, pinhole: r1(bc + 0.1) }),
          amsler: at<AmslerFinding>(eye, wet ? { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 } : { result: 'central-scotoma', center: { x: 0, y: 0 }, radius: 2 }),
          posterior: at(eye, { lesions: (wet ? [{ type: 'subretinal-hemorrhage', zone: 'macula', density: 2 }, { type: 'drusen-large', zone: 'macula', density: 3 }] : [{ type: 'geographic-atrophy', zone: 'macula', density: 3 }, { type: 'drusen-large', zone: 'macula', density: 4 }]) as RetinalLesion[] }),
        },
        story: `${wet ? 'wet' : 'dry'} macular degeneration ${eye} — macular blur does not pinhole`,
      };
    }
    case 'optic-neuritis': {
      const age = rng.int(20, 40);
      const eye: Eye = rng.pick(['OD', 'OS'] as const);
      const bc = r1(rng.float(0.5, 1.1));
      return {
        age,
        patch: {
          va: at(eye, { uncorrected: bc, bestCorrected: bc, pinhole: bc }),
          pupils: { rapd: eye, rapdGrade: 2 },
          colorVision: at<ColorVision>(eye, { type: 'acquired-red-green', severity: 'moderate', redDesaturation: true }),
          fields: at<FieldDefect>(eye, 'central-scotoma'),
          motility: { painOnMovement: true },
        },
        story: `optic neuritis ${eye} — a nerve problem: no pinhole improvement`,
      };
    }
    case 'keratoconus': {
      const age = rng.int(16, 29);
      const eye: Eye = rng.pick(['OD', 'OS'] as const);
      const sc = r1(rng.float(0.8, 1.2));
      return {
        age,
        patch: {
          refraction: at(eye, { sphere: q(-rng.float(1.5, 3)), cylinder: q(-rng.float(3, 5)), axis: rng.pick([30, 45, 60, 150]) }),
          va: at(eye, { uncorrected: sc, bestCorrected: r1(rng.float(0.2, 0.3)), pinhole: r1(rng.float(0.1, 0.3)) }),
          keratometry: at<Keratometry>(eye, { k1: 47.5, k2: 52.25, axisK1: 45, mires: 'distorted' }),
          retinoscopyReflex: at<RetinoscopyReflex>(eye, 'scissors'),
          anterior: at(eye, { cornea: ['cone-thinning', 'vogt-striae'] as CorneaSign[] }),
        },
        story: `keratoconus ${eye} — irregular astigmatism: glasses fall short, but the pinhole helps`,
      };
    }
  }
}

const VA_POOL: { k: Archetype; w: (d: number) => number }[] = [
  { k: 'normal', w: (d) => 1.2 - d * 0.6 },
  { k: 'myopia', w: () => 1.4 },
  { k: 'hyperopia', w: () => 0.7 },
  { k: 'astigmatism', w: (d) => 0.6 + d * 0.6 },
  { k: 'amblyopia', w: (d) => 0.4 + d * 0.8 },
  { k: 'preschool', w: (d) => 0.3 + d * 0.5 },
  { k: 'cataract', w: () => 0.8 },
  { k: 'amd', w: (d) => 0.4 + d * 0.6 },
  { k: 'optic-neuritis', w: (d) => 0.2 + d * 0.6 },
  { k: 'keratoconus', w: (d) => d * 0.6 },
];

const PH_POOL: { k: Archetype; w: (d: number) => number }[] = [
  { k: 'myopia', w: () => 1.2 },
  { k: 'astigmatism', w: () => 0.8 },
  { k: 'hyperopia', w: () => 0.6 },
  { k: 'cataract', w: () => 1 },
  { k: 'amd', w: () => 1 },
  { k: 'optic-neuritis', w: (d) => 0.4 + d * 0.6 },
  { k: 'amblyopia', w: (d) => 0.2 + d * 0.6 },
  { k: 'keratoconus', w: (d) => 0.2 + d * 0.6 },
  { k: 'normal', w: (d) => 0.3 - d * 0.2 },
];

export function pickArchetype(rng: Rng, difficulty: number, pool: 'va' | 'ph'): Archetype {
  const list = pool === 'va' ? VA_POOL : PH_POOL;
  const ws = list.map((x) => Math.max(0.01, x.w(difficulty)));
  let r = rng.next() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= ws[i]!;
    if (r <= 0) return list[i]!.k;
  }
  return list[0]!.k;
}

export function buildScenario(rng: Rng, kind: Archetype): { patient: PatientProfile; findings: PatientFindings; story: string } {
  const b = build(rng, kind);
  const findings = buildFindings(b.age, b.patch);
  return { patient: makePatient(rng, b.age), findings, story: b.story };
}

const fmt = (v: number) => `${formatFeet(v)} (${formatMetric(v)})`;

export function acuityPractice(rng: Rng, difficulty: number): PracticeScenario {
  const s = buildScenario(rng, pickArchetype(rng, difficulty, 'va'));
  const f = s.findings;
  return { patient: s.patient, findings: f, answer: `VA sc OD ${fmt(f.va.OD.uncorrected)}, OS ${fmt(f.va.OS.uncorrected)} — ${s.story}.` };
}

export function pinholePractice(rng: Rng, difficulty: number): PracticeScenario {
  const s = buildScenario(rng, pickArchetype(rng, difficulty, 'ph'));
  const f = s.findings;
  const part = (e: Eye) => `${e} ${fmt(f.va[e].uncorrected)} → PH ${fmt(pinholeLogmar(f, e))} (${pinholeVerdict(f, e) === 'improves' ? 'improves' : 'NI'})`;
  return { patient: s.patient, findings: f, answer: `${part('OD')}; ${part('OS')} — ${s.story}.` };
}
