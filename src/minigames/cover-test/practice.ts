/** Practice scenarios (clinically coherent deviations) and the recognition challenge. Pure. */
import {
  buildFindings, type DeepPartial, type Deviation, type Eye, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { describe, kindLabel, resolve, type Dir, type Kind, type Truth } from './model';
import { pattern } from './report';
import { explain } from './teach';

export type ScenarioKind =
  | 'normal' | 'exophoria' | 'esophoria' | 'convergence-insufficiency' | 'esotropia' | 'accommodative-esotropia'
  | 'intermittent-exotropia' | 'exotropia' | 'fourth-nerve' | 'sixth-nerve';

const NAMES_F = ['Margit Hoffmann', 'Lucia Ferrari', 'Aaliyah Brooks', 'Ingrid Nilsen', 'Mei Tanaka', 'Rosa Delgado', 'Fatima Zahra', 'Ewa Kowal'];
const NAMES_M = ['Walter Pryce', 'Dmitri Volkov', 'Hamza Qureshi', 'Luis Ortega', 'Tobias Brandt', 'Kofi Asante', 'Arvind Nair', 'Henrik Moller'];
const JOBS = ['Student', 'Taxi driver', 'Accountant', 'Baker', 'Pharmacist', 'Carpenter', 'Choir singer', 'Librarian', 'Software tester'];

export function pickKind(rng: Rng, difficulty: number): ScenarioKind {
  const d = Math.max(0, Math.min(1, difficulty));
  const w: [ScenarioKind, number][] = [
    ['normal', 0.9 - 0.5 * d],
    ['exophoria', 0.8], ['esophoria', 0.5 + 0.3 * d],
    ['convergence-insufficiency', 0.3 + 0.5 * d],
    ['esotropia', 1.0 - 0.4 * d], ['exotropia', 0.7],
    ['accommodative-esotropia', 0.3 + 0.5 * d],
    ['intermittent-exotropia', 0.5 + 0.7 * d],
    ['fourth-nerve', 0.3 + 0.6 * d], ['sixth-nerve', 0.3 + 0.6 * d],
  ];
  const total = w.reduce((s, [, x]) => s + x, 0);
  let r = rng.next() * total;
  for (const [k, x] of w) { r -= x; if (r <= 0) return k; }
  return 'normal';
}

interface Gen { age: number; distance: Deviation; near: Deviation; extra: DeepPartial<PatientFindings['motility']>; story: string }
const eyeOf = (rng: Rng): Eye => (rng.chance(0.5) ? 'OD' : 'OS');

function gen(kind: ScenarioKind, rng: Rng, d: number): Gen {
  const small = (lo: number, hi: number) => Math.max(1, Math.round(rng.float(lo, hi) * (1 - 0.35 * d)));
  switch (kind) {
    case 'normal':
      return { age: rng.int(18, 60), distance: { horizontal: rng.pick([0, 0, -1]), vertical: 0, type: 'ortho' }, near: { horizontal: -rng.int(1, 5), vertical: 0, type: 'phoria' }, extra: {}, story: 'Normal alignment: no tropia; a small physiological exophoria at near.' };
    case 'exophoria':
      return { age: rng.int(16, 55), distance: { horizontal: -rng.int(4, 8), vertical: 0, type: 'phoria' }, near: { horizontal: -rng.int(8, 14), vertical: 0, type: 'phoria' }, extra: {}, story: 'Exophoria, larger at near: well-controlled latent deviation.' };
    case 'esophoria':
      return { age: rng.int(10, 50), distance: { horizontal: rng.int(2, 5), vertical: 0, type: 'phoria' }, near: { horizontal: rng.int(3, 8), vertical: 0, type: 'phoria' }, extra: {}, story: 'Esophoria: the covered eye drifts in and recovers outward on uncover.' };
    case 'convergence-insufficiency':
      return { age: rng.int(12, 35), distance: { horizontal: -rng.int(1, 3), vertical: 0, type: 'phoria' }, near: { horizontal: -rng.int(14, 22), vertical: 0, type: 'phoria' }, extra: { npcCm: rng.int(10, 16) }, story: 'Convergence insufficiency: near exophoria much larger than distance, remote near point.' };
    case 'esotropia': {
      const eye = eyeOf(rng);
      const m = rng.int(12, 35);
      return { age: rng.int(3, 40), distance: { horizontal: m, vertical: 0, type: 'tropia', deviatingEye: eye }, near: { horizontal: m + rng.int(-3, 3), vertical: 0, type: 'tropia', deviatingEye: eye }, extra: {}, story: `Constant esotropia of the ${eye === 'OD' ? 'right' : 'left'} eye.` };
    }
    case 'accommodative-esotropia': {
      const eye = eyeOf(rng);
      const dm = rng.int(6, 10);
      return { age: rng.int(3, 9), distance: { horizontal: dm, vertical: 0, type: 'tropia', deviatingEye: eye }, near: { horizontal: dm + rng.int(12, 20), vertical: 0, type: 'tropia', deviatingEye: eye }, extra: {}, story: 'Esotropia larger at near: convergence-excess pattern, typical of accommodative esotropia.' };
    }
    case 'intermittent-exotropia': {
      const eye = rng.chance(0.25) ? 'alternating' : eyeOf(rng);
      const m = small(18, 32);
      return { age: rng.int(5, 40), distance: { horizontal: -m, vertical: 0, type: 'intermittent-tropia', deviatingEye: eye }, near: { horizontal: -Math.max(2, m - rng.int(10, 15)), vertical: 0, type: 'phoria' }, extra: {}, story: 'Intermittent exotropia, worse at distance (divergence-excess pattern); controlled at near.' };
    }
    case 'exotropia': {
      const eye = eyeOf(rng);
      const m = rng.int(18, 40);
      return { age: rng.int(6, 70), distance: { horizontal: -m, vertical: 0, type: 'tropia', deviatingEye: eye }, near: { horizontal: -(m - rng.int(0, 6)), vertical: 0, type: 'tropia', deviatingEye: eye }, extra: {}, story: `Constant exotropia of the ${eye === 'OD' ? 'right' : 'left'} eye.` };
    }
    case 'fourth-nerve': {
      const eye = eyeOf(rng);
      const m = small(5, 14);
      const v = eye === 'OD' ? m : -m;
      return {
        age: rng.int(25, 70),
        distance: { horizontal: 0, vertical: v, type: 'tropia', deviatingEye: eye },
        near: { horizontal: 0, vertical: v, type: 'tropia', deviatingEye: eye },
        extra: { diplopia: 'vertical', headPosture: eye === 'OD' ? 'tilt-left' : 'tilt-right' },
        story: `${eye === 'OD' ? 'Right' : 'Left'} hypertropia from a superior oblique (fourth nerve) palsy; the head tilts away from the higher eye.`,
      };
    }
    case 'sixth-nerve': {
      const eye = eyeOf(rng);
      const m = small(12, 25);
      return {
        age: rng.int(40, 75),
        distance: { horizontal: m, vertical: 0, type: 'tropia', deviatingEye: eye },
        near: { horizontal: Math.max(3, m - rng.int(8, 14)), vertical: 0, type: 'tropia', deviatingEye: eye },
        extra: { diplopia: 'horizontal', headPosture: eye === 'OD' ? 'turn-right' : 'turn-left' },
        story: `${eye === 'OD' ? 'Right' : 'Left'} abducens palsy: esotropia worse at distance, face turned toward the weak eye.`,
      };
    }
  }
}

export function makeScenario(rng: Rng, difficulty: number): PracticeScenario {
  const kind = pickKind(rng, difficulty);
  const g = gen(kind, rng, difficulty);
  const findings = buildFindings(g.age, { motility: { distance: g.distance, near: g.near, ...g.extra } } as DeepPartial<PatientFindings>);
  const sex = rng.pick(['F', 'M'] as const);
  const patient: PatientProfile = {
    name: rng.pick(sex === 'F' ? NAMES_F : NAMES_M), age: g.age, sex, occupation: rng.pick(JOBS),
    personality: rng.pick(['Looks right where you point.', 'Slightly nervous, loses the target when tired.', 'Easy-going, follows the light.', 'Squints when the room is bright.']),
    avatar: { ...generateAvatar(rng, { age: g.age, sex }), glasses: 'none' },
  };
  const d = resolve(g.distance);
  const n = resolve(g.near);
  const pat = pattern(d, n);
  return { patient, findings, answer: `Distance: ${describe(d)}. Near: ${describe(n)}.${pat ? ` ${pat}.` : ''} ${g.story}` };
}

// ───────────────────────── recognition challenge
export interface Challenge { question: string; options: string[]; correct: number; explain: string }

const DIRS: Dir[] = ['eso', 'exo', 'hyperR', 'hyperL'];
const lab = (k: Kind, dir: Dir, eye?: Eye | 'alternating') => (k === 'ortho' ? 'Orthophoria (no movement)' : kindLabel(k, dir, eye));

export function makeChallenge(findings: PatientFindings, rng: Rng): Challenge {
  const d = resolve(findings.motility.distance);
  const n = resolve(findings.motility.near);
  const useNear = d.kind === 'ortho' && n.kind !== 'ortho';
  const t: Truth = useNear ? n : d;
  const right = lab(t.kind, t.dir, t.eye);
  const pool = new Set<string>();
  const eyes: (Eye | 'alternating')[] = ['OD', 'OS'];
  const kinds: Kind[] = ['phoria', 'tropia', 'intermittent'];
  const add = (s: string) => { if (s !== right) pool.add(s); };
  if (t.kind === 'ortho') {
    for (const dir of DIRS) add(lab('phoria', dir));
    add(lab('tropia', 'exo', 'OD'));
    add(lab('intermittent', 'eso', 'OS'));
  } else {
    for (const dir of DIRS.filter((x) => x !== t.dir)) add(lab(t.kind, dir, t.kind === 'phoria' ? undefined : t.eye));
    for (const k of kinds.filter((x) => x !== t.kind)) add(lab(k, t.dir, k === 'phoria' ? undefined : (t.eye ?? 'OS')));
    if (t.kind !== 'phoria' && t.eye && t.eye !== 'alternating') add(lab(t.kind, t.dir, eyes.find((e) => e !== t.eye)));
    add(lab('ortho', 'none'));
  }
  const list = rng.shuffle([...pool]);
  // prefer near-miss distractors first (they are inserted first); keep three
  const near3 = [...pool].slice(0, 3);
  const opts = rng.shuffle([right, ...(near3.length >= 3 ? near3 : list.slice(0, 3))]);
  const label = useNear ? 'near (33 cm)' : 'distance (6 m)';
  return {
    question: `Which best describes this patient's ${label} alignment?`,
    options: opts,
    correct: opts.indexOf(right),
    explain: `${describe(t)}. ${explain(t)}`,
  };
}
