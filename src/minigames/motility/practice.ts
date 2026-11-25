/** Practice scenarios and recognition challenges for both instruments. Pure. */
import {
  buildFindings, expectedAmplitude, type DeepPartial, type Eye, type Gaze, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { ADD_GAZE, ABD_GAZE, IO_GAZE, SO_GAZE, classifyMotility, hofstetter, type MotilityPattern } from './model';

const NAMES_F = ['Margit Hoffmann', 'Lucia Ferrari', 'Aaliyah Brooks', 'Ingrid Nilsen', 'Mei Tanaka', 'Rosa Delgado', 'Fatima Zahra', 'Ewa Kowal'];
const NAMES_M = ['Walter Pryce', 'Dmitri Volkov', 'Hamza Qureshi', 'Luis Ortega', 'Tobias Brandt', 'Kofi Asante', 'Arvind Nair', 'Henrik Moller'];
const JOBS = ['Student', 'Taxi driver', 'Accountant', 'Baker', 'Pharmacist', 'Carpenter', 'Choir singer', 'Librarian', 'Software tester'];

function patientFor(rng: Rng, age: number): PatientProfile {
  const sex = rng.pick(['F', 'M'] as const);
  return {
    name: rng.pick(sex === 'F' ? NAMES_F : NAMES_M), age, sex, occupation: rng.pick(JOBS),
    personality: rng.pick(['Follows the light carefully.', 'A little anxious, keeps looking at your hand.', 'Easy-going and cooperative.']),
    avatar: { ...generateAvatar(rng, { age, sex }), glasses: 'none' },
  };
}

// ───────────────────────── motility
export type MotKind = 'normal' | 'cn6' | 'cn4' | 'cn3' | 'restrictive' | 'pain';
function pickMotKind(rng: Rng, d: number): MotKind {
  const w: [MotKind, number][] = [['normal', 0.9 - 0.5 * d], ['cn6', 1], ['cn4', 0.5 + 0.7 * d], ['cn3', 0.5 + 0.5 * d], ['restrictive', 0.2 + 0.6 * d], ['pain', 0.6]];
  const total = w.reduce((s, [, x]) => s + x, 0);
  let r = rng.next() * total;
  for (const [k, x] of w) { r -= x; if (r <= 0) return k; }
  return 'normal';
}

export function motilityScenario(rng: Rng, difficulty: number, forced?: MotKind): PracticeScenario {
  const d = Math.max(0, Math.min(1, difficulty));
  const kind = forced ?? pickMotKind(rng, d);
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const sev = (lo: number, hi: number) => Math.max(1, Math.round(rng.float(lo, hi) - 0.8 * d));
  let age = rng.int(20, 70);
  let motility: DeepPartial<PatientFindings['motility']> = {};
  let patch: DeepPartial<PatientFindings> = {};
  switch (kind) {
    case 'cn6': {
      age = rng.int(40, 75);
      const s = sev(2, 4);
      const ab = ABD_GAZE[eye];
      const v: Partial<Record<Gaze, Partial<Record<Eye, number>>>> = { [ab]: { [eye]: -s } };
      const diag = (ab === 'right' ? ['upRight', 'downRight'] : ['upLeft', 'downLeft']) as Gaze[];
      for (const g of diag) v[g] = { [eye]: -Math.max(1, s - 1) };
      motility = { versions: v, distance: { horizontal: 6 * s, vertical: 0, type: 'tropia', deviatingEye: eye }, near: { horizontal: 3 * s, vertical: 0, type: 'tropia', deviatingEye: eye }, diplopia: 'horizontal', headPosture: eye === 'OD' ? 'turn-right' : 'turn-left' };
      break;
    }
    case 'cn4': {
      age = rng.int(20, 60);
      const s = sev(2, 3);
      const sign = eye === 'OD' ? 1 : -1; // + = right hyper
      motility = {
        versions: { [SO_GAZE[eye]]: { [eye]: -s }, [IO_GAZE[eye]]: { [eye]: s }, [ADD_GAZE[eye]]: { [eye]: 1 } },
        distance: { horizontal: 0, vertical: sign * 2 * s, type: 'tropia', deviatingEye: eye }, near: { horizontal: 0, vertical: sign * 3 * s, type: 'tropia', deviatingEye: eye },
        diplopia: 'vertical', headPosture: eye === 'OD' ? 'tilt-left' : 'tilt-right',
      };
      break;
    }
    case 'cn3': {
      age = rng.int(45, 78);
      const v: Partial<Record<Gaze, Partial<Record<Eye, number>>>> = {};
      const adductGaze = ADD_GAZE[eye];
      for (const g of ['up', 'upLeft', 'upRight', 'down', 'downLeft', 'downRight', adductGaze] as Gaze[]) v[g] = { [eye]: -(g === adductGaze || g.startsWith('up') ? 4 : 2) };
      motility = { versions: v, distance: { horizontal: -30, vertical: eye === 'OD' ? -8 : 8, type: 'tropia', deviatingEye: eye }, near: { horizontal: -30, vertical: eye === 'OD' ? -8 : 8, type: 'tropia', deviatingEye: eye }, diplopia: 'oblique', npcCm: 25 };
      patch = {
        anterior: { [eye]: { lids: ['ptosis'] } }, external: { ptosis: [eye] },
        pupils: { sizeLightMm: { [eye]: 7 }, reactivity: { [eye]: 'fixed' } },
      } as DeepPartial<PatientFindings>;
      break;
    }
    case 'restrictive': {
      age = rng.int(30, 62);
      const v: Partial<Record<Gaze, Partial<Record<Eye, number>>>> = { up: { [eye]: -3 }, upLeft: { [eye]: -2 }, upRight: { [eye]: -2 } };
      motility = { versions: v, distance: { horizontal: 0, vertical: eye === 'OD' ? -6 : 6, type: 'tropia', deviatingEye: eye }, near: { horizontal: 0, vertical: eye === 'OD' ? -6 : 6, type: 'tropia', deviatingEye: eye }, diplopia: 'vertical' };
      break;
    }
    case 'pain':
      age = rng.int(18, 45);
      motility = { painOnMovement: true };
      break;
    case 'normal':
      if (d > 0.5 && rng.chance(0.4)) motility = { nystagmus: false };
      break;
  }
  const findings = buildFindings(age, { ...patch, motility } as DeepPartial<PatientFindings>);
  const pat = classifyMotility(findings);
  return { patient: patientFor(rng, age), findings, answer: `${pat.label.replace(/^./, (c) => c.toUpperCase())}. ${motilityTeach(pat)}` };
}

export function motilityTeach(p: MotilityPattern): string {
  switch (p.id) {
    case 'cn6': return `The ${p.eye} cannot abduct: lateral rectus weakness. The esotropia and horizontal double vision are worst on gaze toward the weak side and at distance; the face often turns toward the palsied side to keep the eyes aligned.`;
    case 'cn4': return `The ${p.eye} is higher and fails to depress when adducted (superior oblique), so the inferior oblique over-acts. Vertical double vision is worst looking down and in, as when reading; patients tilt the head away from the hypertropic eye.`;
    case 'cn3': return `Down-and-out eye with ptosis: adduction, elevation and depression are lost (MR, SR, IR, IO) while the lateral rectus and superior oblique still act. A dilated, fixed pupil suggests compression (aneurysm): same-day emergency.`;
    case 'restrictive': return `Elevation fails in every upgaze position: the eye is tethered, not paralysed. Think thyroid eye disease (tight inferior rectus) or an orbital floor fracture; a forced duction test would be positive.`;
    case 'pain': return `Ductions are full but eye movement hurts: retrobulbar optic neuritis (the optic nerve sheath tugs on the inflamed nerve). Check colour vision, pupils (RAPD) and fields.`;
    default: return `Smooth, full and equal versions in all nine positions: no under- or over-action, no diplopia.`;
  }
}

export interface Challenge { question: string; options: string[]; correct: number; explain: string }

const shuffle = <T,>(rng: Rng, a: T[]) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rng.int(0, i); [r[i], r[j]] = [r[j]!, r[i]!]; } return r; };

export function motilityChallenge(f: PatientFindings, rng: Rng): Challenge {
  const pat = classifyMotility(f);
  const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
  const pool: MotilityPattern[] = [
    { id: 'normal', chart: '', label: 'full motility (no palsy)' },
    { id: 'cn6', eye: 'OD', chart: '', label: 'right abducens (CN VI) palsy' }, { id: 'cn6', eye: 'OS', chart: '', label: 'left abducens (CN VI) palsy' },
    { id: 'cn4', eye: 'OD', chart: '', label: 'right trochlear (CN IV) palsy' }, { id: 'cn4', eye: 'OS', chart: '', label: 'left trochlear (CN IV) palsy' },
    { id: 'cn3', eye: 'OD', chart: '', label: 'right oculomotor (CN III) palsy' }, { id: 'cn3', eye: 'OS', chart: '', label: 'left oculomotor (CN III) palsy' },
    { id: 'restrictive', eye: 'OD', chart: '', label: 'right restrictive elevation deficit (e.g. thyroid eye disease or orbital floor)' },
    { id: 'restrictive', eye: 'OS', chart: '', label: 'left restrictive elevation deficit (e.g. thyroid eye disease or orbital floor)' },
    { id: 'pain', chart: '', label: 'full movements with pain on eye movement (optic neuritis pattern)' },
  ];
  const wrong = shuffle(rng, pool.filter((p) => p.label !== pat.label));
  // prefer plausible look-alikes: same family, opposite eye, then others
  wrong.sort((a, b) => Number(b.id === pat.id || b.eye === pat.eye) - Number(a.id === pat.id || a.eye === pat.eye));
  const opts = shuffle(rng, [pat, ...wrong.slice(0, 3)]);
  return { question: 'What best explains these eye movements?', options: opts.map((o) => cap(o.label)), correct: opts.indexOf(pat), explain: motilityTeach(pat) };
}

// ───────────────────────── convergence
export type ConvKind = 'normal' | 'ci' | 'ai' | 'both';
export function classifyConvergence(f: PatientFindings, age: number): ConvKind {
  const receded = f.motility.npcCm > 10;
  const h = hofstetter(age);
  const low = age < 50 && (f.accommodation.amplitudeD.OD < h.min - 0.5 || f.accommodation.amplitudeD.OS < h.min - 0.5);
  return receded && low ? 'both' : receded ? 'ci' : low ? 'ai' : 'normal';
}

export function convergenceScenario(rng: Rng, difficulty: number, forced?: ConvKind): PracticeScenario {
  const d = Math.max(0, Math.min(1, difficulty));
  const kind: ConvKind = forced ?? rng.pick<ConvKind>(d > 0.5 ? ['normal', 'ci', 'ci', 'ai', 'both'] : ['normal', 'normal', 'ci', 'ai']);
  const age = kind === 'normal' ? rng.int(14, 62) : kind === 'ci' ? rng.int(12, 38) : rng.int(10, 34);
  const amp = (e: number) => Math.max(0.5, expectedAmplitude(age) + e);
  let patch: DeepPartial<PatientFindings>;
  switch (kind) {
    case 'ci': {
      const b = rng.int(11, 18);
      patch = { motility: { npcCm: b, near: { horizontal: -rng.int(12, 20), vertical: 0, type: 'phoria' } } };
      break;
    }
    case 'ai': {
      const a = Math.max(1.5, Math.round(hofstetter(age).min * rng.float(0.35, 0.6) * 4) / 4);
      patch = { motility: { npcCm: rng.int(4, 6) }, accommodation: { amplitudeD: { OD: a, OS: a + rng.pick([0, 0, 0.25]) }, facilityCpm: 3 } };
      break;
    }
    case 'both': {
      const a = Math.max(1.5, Math.round(hofstetter(age).min * rng.float(0.35, 0.6) * 4) / 4);
      patch = { motility: { npcCm: rng.int(12, 24) }, accommodation: { amplitudeD: { OD: a, OS: a }, facilityCpm: 2 } };
      break;
    }
    default:
      patch = { motility: { npcCm: rng.int(3, 6) }, accommodation: { amplitudeD: { OD: amp(rng.pick([-0.5, 0, 0.5])), OS: amp(rng.pick([-0.5, 0, 0.5])) } } };
  }
  const findings = buildFindings(age, patch);
  return { patient: patientFor(rng, age), findings, answer: `${CONV_LABEL[classifyConvergence(findings, age)]} ${CONV_TEACH[kind]}` };
}

const CONV_LABEL: Record<ConvKind, string> = {
  normal: 'Normal near point of convergence and age-appropriate accommodation.',
  ci: 'Receded near point of convergence (convergence insufficiency pattern).',
  ai: 'Reduced accommodative amplitude for age (accommodative insufficiency).',
  both: 'Receded NPC together with reduced accommodation.',
};
const CONV_TEACH: Record<ConvKind, string> = {
  normal: 'Break at 6 cm or closer, recovery within about 7 cm, and an amplitude close to Hofstetter (18.5 − 0.3 × age).',
  ci: 'Break beyond 10 cm with a recovery further out; usually exophoria greater at near. Treat with vergence therapy and consider near prism.',
  ai: 'Amplitude well under the Hofstetter minimum (15 − 0.25 × age) with a normal NPC. Check refraction, medication, and general health before calling it idiopathic.',
  both: 'Both systems are weak: in a young patient consider head injury, medication, mononucleosis or neurological disease, and look for a pupil or motility sign.',
};

export function convergenceChallenge(f: PatientFindings, age: number, rng: Rng): Challenge {
  const kind = classifyConvergence(f, age);
  const kinds: ConvKind[] = ['normal', 'ci', 'ai', 'both'];
  const opts = shuffle(rng, kinds);
  return { question: 'Which statement best fits these two measurements?', options: opts.map((k) => CONV_LABEL[k]), correct: opts.indexOf(kind), explain: CONV_TEACH[kind] };
}
