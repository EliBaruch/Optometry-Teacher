/**
 * Practice scenarios (clinically coherent pressures) and the recognition
 * challenge. Pure: rng in, data out.
 */
import {
  buildFindings, type DeepPartial, type Eye, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { classify, type Method } from './optics';

export type PressureKind = 'normal' | 'hypertension' | 'glaucoma-asym' | 'angle-closure' | 'hypotony';

const NAMES_F = ['Margit Hoffmann', 'Lucia Ferrari', 'Aaliyah Brooks', 'Ingrid Nilsen', 'Mei Tanaka', 'Rosa Delgado', 'Fatima Zahra', 'Ewa Kowal'];
const NAMES_M = ['Walter Pryce', 'Dmitri Volkov', 'Hamza Qureshi', 'Luis Ortega', 'Tobias Brandt', 'Kofi Asante', 'Arvind Nair', 'Henrik Moller'];
const JOBS = ['Retired teacher', 'Taxi driver', 'Accountant', 'Baker', 'Pharmacist', 'Carpenter', 'Choir singer', 'Farmer', 'Software tester'];

export function pickKind(rng: Rng, difficulty: number): PressureKind {
  const d = Math.max(0, Math.min(1, difficulty));
  const w: [PressureKind, number][] = [
    ['normal', 1.2 - 0.6 * d],
    ['hypertension', 0.7],
    ['glaucoma-asym', 0.5 + 0.5 * d],
    ['angle-closure', 0.2 + 0.7 * d],
    ['hypotony', 0.2 + 0.3 * d],
  ];
  const total = w.reduce((s, [, x]) => s + x, 0);
  let r = rng.next() * total;
  for (const [k, x] of w) {
    r -= x;
    if (r <= 0) return k;
  }
  return 'normal';
}

interface Gen { age: number; od: number; os: number; patch: DeepPartial<PatientFindings>; story: string }

function gen(kind: PressureKind, rng: Rng, difficulty: number): Gen {
  const j = () => rng.int(-1, 1);
  switch (kind) {
    case 'normal': {
      const b = rng.int(11, 19);
      return { age: rng.int(18, 80), od: b + j(), os: b + j(), patch: {}, story: 'Normal pressures, near-symmetric.' };
    }
    case 'hypertension': {
      const b = rng.int(23, 29 + Math.round(3 * difficulty));
      return { age: rng.int(45, 78), od: b + rng.int(-1, 2), os: b + rng.int(-2, 1), patch: {}, story: 'Both eyes above 21 mmHg without damage yet: ocular hypertension.' };
    }
    case 'glaucoma-asym': {
      const hi = rng.int(24, 32);
      const lo = rng.int(14, 19);
      const worse: Eye = rng.chance(0.5) ? 'OD' : 'OS';
      return { age: rng.int(50, 82), od: worse === 'OD' ? hi : lo, os: worse === 'OS' ? hi : lo, patch: {}, story: `Asymmetric pressure, ${worse} markedly higher: glaucoma suspect.` };
    }
    case 'angle-closure': {
      const worse: Eye = rng.chance(0.5) ? 'OD' : 'OS';
      const hi = rng.int(42, 62 + Math.round(8 * difficulty));
      const lo = rng.int(13, 18);
      const bad = {
        cornea: ['edema' as const],
        conjunctiva: ['ciliary-flush' as const],
        anteriorChamber: { depth: 'shallow' as const, vanHerick: 1 as const, cells: 0 as const, flare: 0 as const },
      };
      return {
        age: rng.int(55, 80),
        od: worse === 'OD' ? hi : lo,
        os: worse === 'OS' ? hi : lo,
        patch: { anterior: { [worse]: bad }, external: { redEye: [worse] } } as DeepPartial<PatientFindings>,
        story: `Acute angle closure in ${worse}: very high pressure, oedematous cornea, shallow chamber.`,
      };
    }
    case 'hypotony': {
      const worse: Eye = rng.chance(0.5) ? 'OD' : 'OS';
      const lo = rng.int(3, 5);
      const ok = rng.int(12, 17);
      return {
        age: rng.int(25, 70), od: worse === 'OD' ? lo : ok, os: worse === 'OS' ? lo : ok,
        patch: { anterior: { [worse]: { anteriorChamber: { cells: 2 as const, flare: 2 as const } } } } as DeepPartial<PatientFindings>,
        story: `Hypotony in ${worse} (below 6 mmHg), often from inflammation or a leak.`,
      };
    }
  }
}

export function makeScenario(rng: Rng, difficulty: number): PracticeScenario {
  const kind = pickKind(rng, difficulty);
  const g = gen(kind, rng, difficulty);
  const findings = buildFindings(g.age, { ...g.patch, iop: { OD: g.od, OS: g.os } } as DeepPartial<PatientFindings>);
  const sex = rng.pick(['F', 'M'] as const);
  const patient: PatientProfile = {
    name: rng.pick(sex === 'F' ? NAMES_F : NAMES_M),
    age: g.age,
    sex,
    occupation: rng.pick(JOBS),
    personality: rng.pick(['Steady, but blinks when the light comes close.', 'Anxious about "the puff test".', 'Chatty, holds very still when asked.', 'Tends to squeeze the lids tightly.']),
    avatar: { ...generateAvatar(rng, { age: g.age, sex }), glasses: 'none' },
  };
  return { patient, findings, answer: `OD ${g.od} · OS ${g.os} mmHg. ${g.story}` };
}

// ───────────────────────── recognition challenge

export interface Challenge { question: string; options: string[]; correct: number; explain: string }

const CLASS_TEXT: Record<ReturnType<typeof classify>, string> = {
  normal: 'Normal (about 10-21 mmHg)',
  elevated: 'Raised (22-34 mmHg): ocular hypertension / glaucoma risk',
  crisis: 'Dangerously high (35 mmHg or more): urgent',
  hypotony: 'Low (under 6 mmHg): hypotony',
};

export function explain(findings: PatientFindings): string {
  const { OD, OS } = findings.iop;
  const parts: string[] = [`OD ${OD} mmHg, OS ${OS} mmHg.`];
  const hi = Math.max(OD, OS);
  const c = classify(hi);
  if (c === 'crisis') parts.push('35 mmHg or more is an emergency: with a cloudy cornea and a shallow chamber think acute angle closure, and refer the same day.');
  else if (c === 'elevated') parts.push('Above 21 mmHg is raised. One reading is not a diagnosis: correct for corneal thickness, check discs, fields and angles, and repeat on another day.');
  else if (classify(Math.min(OD, OS)) === 'hypotony') parts.push('Below 6 mmHg is hypotony: look for a wound leak, uveitis or ciliary-body shutdown.');
  else parts.push('Within 10-21 mmHg is normal; the average is about 15.5 mmHg.');
  if (Math.abs(OD - OS) >= 6) parts.push(`A difference of ${Math.abs(OD - OS)} mmHg between the eyes is abnormal and raises glaucoma suspicion in the higher eye.`);
  return parts.join(' ');
}

export function makeChallenge(findings: PatientFindings, rng: Rng, _method: Method = 'goldmann'): Challenge {
  const { OD, OS } = findings.iop;
  const hi: Eye = OD >= OS ? 'OD' : 'OS';
  const hiV = findings.iop[hi];
  const text = explain(findings);
  const kind = hiV >= 35 || classify(Math.min(OD, OS)) === 'hypotony' ? 'class' : Math.abs(OD - OS) >= 4 ? 'which' : rng.pick(['value', 'class'] as const);
  if (kind === 'which') {
    const options = ['OD (right eye)', 'OS (left eye)', 'Equal'];
    return { question: 'Which eye has the higher pressure?', options, correct: hi === 'OD' ? 0 : 1, explain: text };
  }
  if (kind === 'value') {
    const right = `${hiV} mmHg`;
    const picks = new Set<number>();
    for (const d of rng.shuffle([-6, -3, 3, 4, 6, 8])) {
      const v = hiV + d;
      if (v >= 3 && picks.size < 3) picks.add(v);
    }
    const options = rng.shuffle([right, ...[...picks].map((v) => `${v} mmHg`)]);
    return { question: `What is the pressure in the ${hi === 'OD' ? 'right (OD)' : 'left (OS)'} eye?`, options, correct: options.indexOf(right), explain: text };
  }
  const worstKey = hiV >= 35 || hiV > 21 ? classify(hiV) : classify(Math.min(OD, OS)) === 'hypotony' ? 'hypotony' : 'normal';
  const keys = ['normal', 'elevated', 'crisis', 'hypotony'] as const;
  const options = rng.shuffle(keys.map((k) => CLASS_TEXT[k]));
  return { question: 'How would you classify these pressures?', options, correct: options.indexOf(CLASS_TEXT[worstKey]), explain: text };
}
