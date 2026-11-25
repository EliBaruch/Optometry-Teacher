/**
 * Practice scenarios (clinically coherent refractive states + reflex quality) and the
 * recognition challenge shown after practice. Pure: rng in, data out.
 */
import {
  buildFindings, EYES, type DeepPartial, type Eye, type PatientFindings, type PatientProfile, type PerEye,
  type PracticeScenario, type RetinoscopyReflex, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { ametropia, fmtRx, fmtSigned, principalMeridians, quarter, reflexGeo, sphericalEquivalent, wdPower, wrapAxis, WD_CM, type Rx } from './optics';
import { REFLEX_SHORT, trueRx } from './report';

export type Kind =
  | 'emmetrope' | 'myope' | 'hyperope' | 'wtr' | 'atr' | 'oblique' | 'mixed' | 'keratoconus' | 'cataract' | 'dense-opacity';

const NAMES_F = ['Amara Okafor', 'Lena Fischer', 'Priya Raman', 'Sofia Marquez', 'Hana Sato', 'Noor Haddad', 'Chloé Martin', 'Ines Duarte'];
const NAMES_M = ['Theo Laurent', 'Kwame Mensah', 'Arjun Mehta', 'Mateo Rossi', 'Yusuf Demir', 'Owen Gallagher', 'Kenji Mori', 'Samir Aziz'];
const JOBS = ['Student', 'Graphic designer', 'Bus driver', 'Violinist', 'Barista', 'Engineer', 'Pilot', 'Librarian', 'Nurse', 'Gardener'];

export function pickKind(rng: Rng, difficulty: number): Kind {
  const d = Math.max(0, Math.min(1, difficulty));
  const w: [Kind, number][] = [
    ['emmetrope', 0.5 - 0.35 * d],
    ['myope', 1.3 - 0.4 * d],
    ['hyperope', 1.0 - 0.2 * d],
    ['wtr', 0.8],
    ['atr', 0.25 + 0.3 * d],
    ['oblique', 0.1 + 0.8 * d],
    ['mixed', 0.05 + 0.5 * d],
    ['keratoconus', 0.05 + 0.55 * d],
    ['cataract', 0.05 + 0.5 * d],
    ['dense-opacity', 0.02 + 0.3 * d],
  ];
  const total = w.reduce((s, [, x]) => s + x, 0);
  let r = rng.next() * total;
  for (const [k, x] of w) {
    r -= x;
    if (r <= 0) return k;
  }
  return 'myope';
}

const snap5 = (a: number) => wrapAxis(Math.round(a / 5) * 5);
const mirror = (a: number, rng: Rng) => snap5(180 - a + rng.int(-1, 1) * 5);
const rx = (sphere: number, cylinder: number, axis: number): Rx => ({ sphere: quarter(sphere), cylinder: quarter(cylinder), axis: snap5(axis) });

/** Typical uncorrected logMAR for a refractive state (rough, pinhole-reversible blur). */
export function uncorrectedLogMAR(r: Rx): number {
  const se = Math.abs(sphericalEquivalent(r));
  return Math.round(Math.max(-0.1, Math.min(1.3, 0.05 + 0.22 * se + 0.12 * Math.abs(r.cylinder))) * 10) / 10;
}

interface Gen {
  age: number;
  rx: PerEye<Rx>;
  reflex: PerEye<RetinoscopyReflex>;
  patch: DeepPartial<PatientFindings>;
  label: string;
}

function gen(kind: Kind, rng: Rng, d: number): Gen {
  const young = () => rng.int(8, 42);
  const reflex = (od: RetinoscopyReflex = 'normal', os: RetinoscopyReflex = 'normal'): PerEye<RetinoscopyReflex> => ({ OD: od, OS: os });
  const fellow = (s: number, spread = 0.5) => s + rng.pick([-1, -0.5, 0, 0, 0.5, 1]) * spread;
  switch (kind) {
    case 'emmetrope': {
      const o = rx(rng.pick([0, 0, 0.25, -0.25]), rng.pick([0, 0, -0.25]), 180);
      return { age: young(), rx: { OD: o, OS: rx(o.sphere + rng.pick([0, 0.25, -0.25]), 0, 180) }, reflex: reflex(), patch: {}, label: 'Emmetropia' };
    }
    case 'myope': {
      const s = -rng.float(0.75, 2.5 + 5 * d);
      return { age: young(), rx: { OD: rx(s, rng.pick([0, 0, -0.25, -0.5]), rng.pick([180, 90, 175])), OS: rx(fellow(s), 0, 180) }, reflex: reflex(), patch: {}, label: 'Myopia' };
    }
    case 'hyperope': {
      const s = rng.float(0.75, 1.75 + 3 * d);
      return { age: rng.int(6, 55), rx: { OD: rx(s, rng.pick([0, 0, -0.25, -0.5]), rng.pick([180, 90])), OS: rx(fellow(s), 0, 180) }, reflex: reflex(), patch: {}, label: 'Hyperopia' };
    }
    case 'wtr': case 'atr': case 'oblique': {
      const ax = kind === 'wtr' ? 180 + rng.int(-2, 2) * 5 : kind === 'atr' ? 90 + rng.int(-2, 2) * 5 : rng.pick([45, 135]) + rng.int(-2, 2) * 5;
      const s = rng.float(-4, 2.5);
      const c = -rng.float(0.75, 1.75 + 2 * d);
      const od = rx(s, c, ax);
      const os = rx(fellow(s), c + rng.pick([0, 0.25, -0.25]), kind === 'oblique' ? mirror(ax, rng) : ax + rng.int(-1, 1) * 5);
      return { age: kind === 'atr' ? rng.int(55, 80) : young() + 6, rx: { OD: od, OS: os }, reflex: reflex(), patch: {}, label: kind === 'wtr' ? 'With-the-rule astigmatism' : kind === 'atr' ? 'Against-the-rule astigmatism' : 'Oblique astigmatism' };
    }
    case 'mixed': {
      const c = -rng.float(2.5, 4);
      const od = rx(-c * rng.float(0.35, 0.65), c, rng.pick([180, 90, 45, 135]) + rng.int(-1, 1) * 5);
      return { age: young() + 10, rx: { OD: od, OS: rx(od.sphere + rng.pick([-0.25, 0, 0.25]), od.cylinder, mirror(od.axis, rng)) }, reflex: reflex(), patch: {}, label: 'Mixed astigmatism' };
    }
    case 'keratoconus': {
      const od = rx(-rng.float(2, 6), -rng.float(2.5, 5), rng.pick([60, 75, 100, 120, 135]));
      const both = rng.chance(0.55);
      const os = both ? rx(od.sphere + rng.pick([0.5, -0.5, 0]), od.cylinder * rng.float(0.5, 0.9), mirror(od.axis, rng)) : rx(rng.pick([-0.5, -0.75, -1]), -0.5, 180);
      return {
        age: rng.int(16, 34), rx: { OD: od, OS: os }, reflex: reflex('scissors', both ? 'scissors' : 'normal'),
        patch: { keratometry: { OD: { k1: 46.5, k2: 52, axisK1: od.axis, mires: 'irregular' }, ...(both ? { OS: { k1: 45.75, k2: 50.5, axisK1: os.axis, mires: 'irregular' as const } } : {}) } },
        label: 'Keratoconus (scissoring reflex)',
      };
    }
    case 'cataract': {
      const age = rng.int(62, 84);
      const s = -rng.float(1.5, 4.5);
      const od = rx(s, -rng.pick([0, 0.5, 0.75]), 90);
      const both = rng.chance(0.5);
      const lens = { lens: ['nuclear-sclerosis' as const], lensGrade: rng.pick([2, 3]) };
      return {
        age, rx: { OD: od, OS: rx(fellow(s, 0.5), -0.5, 90) }, reflex: reflex('dull', both ? 'dull' : 'normal'),
        patch: { anterior: { OD: lens, ...(both ? { OS: lens } : {}) }, redReflex: { OD: 'dull', ...(both ? { OS: 'dull' as const } : {}) }, va: { OD: { bestCorrected: 0.5 } } },
        label: 'Nuclear cataract (dull reflex)',
      };
    }
    default: {
      const age = rng.int(55, 82);
      const od = rx(rng.float(-1, 1.5), 0, 180);
      return {
        age, rx: { OD: od, OS: rx(rng.float(-1.5, 1), -0.5, 90) }, reflex: reflex('absent', 'normal'),
        patch: {
          anterior: { OD: { lens: ['cortical-cataract'], lensGrade: 4 } }, redReflex: { OD: 'absent' },
          va: { OD: { uncorrected: 2, bestCorrected: 2, pinhole: 2 } },
        },
        label: 'Dense media opacity (no reflex)',
      };
    }
  }
}

export function makeScenario(rng: Rng, difficulty: number): PracticeScenario {
  const kind = pickKind(rng, difficulty);
  const g = gen(kind, rng, difficulty);
  const patch: DeepPartial<PatientFindings> = {
    ...g.patch,
    refraction: { OD: g.rx.OD, OS: g.rx.OS },
    retinoscopyReflex: g.reflex,
  };
  const va = (g.patch as { va?: Record<string, { uncorrected?: number } | undefined> }).va;
  patch.va = {
    OD: { uncorrected: va?.OD?.uncorrected ?? uncorrectedLogMAR(g.rx.OD), ...(g.patch.va?.OD ?? {}) },
    OS: { uncorrected: va?.OS?.uncorrected ?? uncorrectedLogMAR(g.rx.OS), ...(g.patch.va?.OS ?? {}) },
  };
  const findings = buildFindings(g.age, patch);
  const sex = rng.chance(0.5) ? 'F' : 'M';
  const patient: PatientProfile = {
    name: rng.pick(sex === 'F' ? NAMES_F : NAMES_M),
    age: g.age,
    sex,
    occupation: rng.pick(JOBS),
    personality: rng.pick(['Sits very still.', 'Keeps glancing at the light.', 'Chatty and curious.', 'A little anxious about the bright streak.']),
    avatar: { ...generateAvatar(rng, { age: g.age, sex }), glasses: 'none' },
  };
  const line = (e: Eye) => (g.reflex[e] === 'absent' ? `${e} no reflex` : `${e} ${fmtRx(g.rx[e])}`);
  return { patient, findings, answer: `${g.label}: ${line("OD")} \u00b7 ${line("OS")} (net Rx)` };
}

/** Working distance for a mini-game run (case mode is always the classic 67 cm). */
export function pickWd(rng: Rng, difficulty: number, mode: 'case' | 'practice'): number {
  if (mode === 'case' || difficulty <= 0.35) return 67;
  return rng.pick([...WD_CM, 67]);
}

// ───────────────────────── recognition challenge

export interface Challenge {
  eye: Eye;
  question: string;
  options: string[];
  correct: number;
  explain: string;
}

const MEANING: Record<RetinoscopyReflex, string> = {
  normal: 'Normal — a clean, evenly moving reflex',
  scissors: 'Irregular corneal surface — think keratoconus',
  dull: 'Media opacity — cataract or corneal haze',
  irregular: 'Irregular astigmatism — corneal scar or distortion',
  absent: 'Dense media opacity — e.g. vitreous haemorrhage, dense cataract or corneal scar',
};

export function explainNet(eye: Eye, truth: Rx, wd: number, wdCm: number): string {
  const p = principalMeridians(truth);
  const g1 = p.pA + wd;
  const g2 = p.pB + wd;
  const gross = Math.abs(truth.cylinder) < 0.125
    ? `Neutrality came at ${fmtSigned(g1)} D gross.`
    : `Neutrality came at ${fmtSigned(g1)} D along ${Math.round(p.phiA) || 180}° and ${fmtSigned(g2)} D along ${Math.round(p.phiB) || 180}° (gross).`;
  return `${eye}: ${gross} Subtract the working-distance lens (${wdCm} cm = +${wd.toFixed(2)} D) from each meridian and write it in minus-cylinder form: ${fmtRx(truth)}. Forgetting the subtraction leaves the Rx ${wd.toFixed(2)} D too plus.`;
}

export function makeChallenge(findings: PatientFindings, wdCm: number, rng: Rng): Challenge {
  const wd = wdPower(wdCm);
  const abn = EYES.find((e) => (findings.retinoscopyReflex?.[e] ?? 'normal') !== 'normal');
  const measurable = EYES.filter((e) => (findings.retinoscopyReflex?.[e] ?? 'normal') !== 'absent');
  const kind = abn && rng.chance(0.8) ? 'quality' : rng.pick(['motion', 'net', 'net'] as const);

  if (kind === 'quality' && abn) {
    const truth = findings.retinoscopyReflex[abn];
    const right = MEANING[truth];
    const others = rng.shuffle((Object.keys(MEANING) as RetinoscopyReflex[]).filter((k) => k !== truth && k !== 'irregular').map((k) => MEANING[k])).slice(0, 3);
    const options = rng.shuffle([right, ...others]);
    const why: Record<string, string> = {
      scissors: 'Two bands that open and close like scissor blades mean the corneal surface has different powers across the pupil — the classic sign of keratoconus. Confirm with keratometry/topography.',
      dull: 'A dim, hazy reflex that still moves means light is being scattered by a media opacity (cataract, corneal haze). Neutrality is still findable, just harder.',
      irregular: 'A broken, shifting reflex with no clean neutral point means irregular astigmatism — look for a corneal scar or distortion.',
      absent: 'No red reflex at all means the light cannot reach the retina — a dense opacity such as vitreous haemorrhage, a mature cataract or a corneal scar. This needs a proper work-up.',
    };
    return { eye: abn, question: `The ${abn} reflex looked ${REFLEX_SHORT[truth].toLowerCase()}. What does it point to?`, options, correct: options.indexOf(right), explain: `${why[truth] ?? ''}` };
  }

  const eye = measurable.length ? (rng.pick(measurable) as Eye) : 'OD';
  const truth = trueRx(findings, eye);
  if (kind === 'motion') {
    const e = ametropia(truth, 0, wd);
    const g = reflexGeo(e.e1, e.e2, truth.axis, truth.axis);
    const right = g.motion === 'against' ? 'AGAINST motion' : g.motion === 'with' ? 'WITH motion' : 'No motion — neutral';
    const options = ['WITH motion', 'AGAINST motion', 'No motion — neutral'];
    const whyMotion = g.motion === 'against'
      ? `The eye is more myopic than the +${wd.toFixed(2)} D working-distance vergence, so its far point lies between you and the patient and the reflex runs against the streak: add minus (SPAM).`
      : g.motion === 'with'
        ? `Hyperopia, emmetropia and myopia of less than ${wd.toFixed(2)} D all give with motion at ${wdCm} cm because the far point lies behind you: add plus until it neutralises.`
        : `At exactly ${wd.toFixed(2)} D of myopia the far point sits at the retinoscope — the reflex fills the pupil.`;
    return {
      eye,
      question: `Plano lens, ${wdCm} cm. Along the ${Math.abs(truth.cylinder) < 0.125 ? '' : 'sphere '}meridian of the ${eye} (${fmtSigned(truth.sphere)} D), what does the reflex do?`,
      options, correct: options.indexOf(right), explain: whyMotion,
    };
  }
  const right = fmtRx(truth);
  const gross: Rx = { ...truth, sphere: truth.sphere + wd };
  const cand = [
    fmtRx(gross),
    fmtRx({ ...truth, sphere: truth.sphere - wd }),
    Math.abs(truth.cylinder) >= 0.5 ? fmtRx({ ...truth, axis: wrapAxis(truth.axis + 90) }) : fmtRx({ ...truth, sphere: truth.sphere + 0.5 }),
    fmtRx({ ...truth, sphere: truth.sphere + 0.75 }),
  ].filter((c) => c !== right);
  const options = rng.shuffle([right, ...[...new Set(cand)].slice(0, 3)]);
  return { eye, question: `What is the net Rx of the ${eye}?`, options, correct: options.indexOf(right), explain: explainNet(eye, truth, wd, wdCm) };
}
