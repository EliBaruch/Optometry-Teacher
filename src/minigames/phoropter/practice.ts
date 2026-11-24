/**
 * Practice scenarios, the autorefractor starting point and the end-of-practice
 * recognition challenge. Pure (rng in, data out).
 */
import {
  buildFindings, expectedAmplitude, formatRx, typicalAdd,
  type Eye, type LensSign, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { blurLoss, effectiveResidual, makeEyeModel, quarter, wrapAxis, type Lens } from './optics';

// ───────────────────────── classification (teaching vocabulary)

export type Orientation = 'with-the-rule' | 'against-the-rule' | 'oblique';

/** Minus-cyl axis 180±30 = with-the-rule; 90±30 = against-the-rule; otherwise oblique. */
export function orientation(axis: number): Orientation {
  const a = wrapAxis(axis);
  if (a <= 30 || a >= 150) return 'with-the-rule';
  if (a >= 60 && a <= 120) return 'against-the-rule';
  return 'oblique';
}

export function classify(l: Lens): string {
  const s = l.sphere;
  const p = l.sphere + l.cyl; // the other principal meridian
  if (Math.abs(l.cyl) < 0.5) {
    const se = s + l.cyl / 2;
    if (se <= -0.5) return 'Myopia';
    if (se >= 0.5) return 'Hyperopia';
    return 'Emmetropia';
  }
  const eps = 0.125;
  let kind: string;
  if (s < -eps && p < -eps) kind = 'Compound myopic astigmatism';
  else if (s > eps && p > eps) kind = 'Compound hyperopic astigmatism';
  else if (Math.abs(s) <= eps && p < -eps) kind = 'Simple myopic astigmatism';
  else if (Math.abs(p) <= eps && s > eps) kind = 'Simple hyperopic astigmatism';
  else kind = 'Mixed astigmatism';
  return `${kind}, ${orientation(l.axis)}`;
}

export const CLASS_LABELS = [
  'Myopia', 'Hyperopia', 'Emmetropia',
  'Compound myopic astigmatism', 'Compound hyperopic astigmatism', 'Simple myopic astigmatism',
  'Simple hyperopic astigmatism', 'Mixed astigmatism',
] as const;

export function explainClass(l: Lens): string {
  const c = classify(l);
  const s = l.sphere;
  const p = l.sphere + l.cyl;
  if (Math.abs(l.cyl) < 0.5) {
    if (c === 'Myopia') return 'Minus sphere: light focuses in front of the retina, so a minus lens pushes it back.';
    if (c === 'Hyperopia') return 'Plus sphere: the focus falls behind the retina; young eyes hide some of it by accommodating, so fog first.';
    return 'Within ±0.50 D of plano with little cylinder: no clinically significant refractive error.';
  }
  const fmt = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
  const o = orientation(l.axis);
  const ori = o === 'with-the-rule'
    ? 'Minus-cyl axis near 180: the vertical meridian is steeper (with-the-rule).'
    : o === 'against-the-rule'
      ? 'Minus-cyl axis near 90: the horizontal meridian is steeper (against-the-rule).'
      : 'Axis between 30–60° or 120–150°: oblique astigmatism.';
  return `Principal meridians ${fmt(s)} D and ${fmt(p)} D. ${ori}`;
}

// ───────────────────────── recognition challenge

export interface Challenge {
  eye: Eye;
  question: string;
  options: string[];
  correct: number;
  explain: string;
}

export function makeChallenge(findings: PatientFindings, rng: Rng): Challenge {
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const rx = findings.refraction[eye];
  const lens: Lens = { sphere: rx.sphere, cyl: rx.cylinder, axis: rx.axis };
  const right = classify(lens);
  const pool = new Set<string>();
  const ori = ['with-the-rule', 'against-the-rule', 'oblique'];
  for (const base of CLASS_LABELS) {
    if (base.includes('astigmatism')) pool.add(`${base}, ${rng.pick(ori)}`);
    else pool.add(base);
  }
  // A close distractor: same type, other orientation.
  if (right.includes(',')) {
    const [kind] = right.split(', ');
    const other = ori.filter((o) => !right.endsWith(o));
    pool.add(`${kind}, ${rng.pick(other)}`);
  }
  pool.delete(right);
  const distract = rng.shuffle([...pool]).slice(0, 3);
  const options = rng.shuffle([right, ...distract]);
  return {
    eye,
    question: `Your ${eye} endpoint is ${formatRx({ sphere: rx.sphere, cylinder: rx.cylinder, axis: rx.axis })}. How would you classify it?`,
    options,
    correct: options.indexOf(right),
    explain: explainClass(lens),
  };
}

// ───────────────────────── autorefractor starting point

/**
 * A believable autorefraction: off by up to ~1 D in sphere and a quarter or two
 * in cylinder, axis off by up to 20° — more with difficulty. Young eyes often
 * read too minus on an autorefractor (proximal/instrument accommodation).
 */
export function autorefraction(rx: Lens, age: number, difficulty: number, rng: Rng): Lens {
  const d = Math.max(0, Math.min(1, difficulty));
  const step = () => rng.int(-1, 1) * 0.25;
  let sphere = rx.sphere + step() + (rng.chance(0.3 + 0.5 * d) ? rng.pick([-0.5, 0.5, 0.75, -0.75]) * (0.5 + d) : 0);
  if (age < 35 && rng.chance(0.5)) sphere -= rng.pick([0.25, 0.5, 0.75]);
  let cyl = rx.cyl + (rng.chance(0.4 + 0.4 * d) ? rng.pick([-0.25, 0.25, -0.5, 0.5]) : 0);
  cyl = Math.min(0, cyl);
  const axisErr = Math.abs(rx.cyl) >= 0.5 ? Math.round((3 + 17 * d) * (rng.next() * 2 - 1)) : rng.int(-30, 30);
  return { sphere: quarter(sphere), cyl: quarter(cyl), axis: cyl === 0 ? 180 : wrapAxis(rx.axis + axisErr) };
}

// ───────────────────────── scenario generator

const NAMES_F = ['Amara Okafor', 'Lucía Ferrer', 'Hana Sato', 'Priya Raman', 'Ingrid Holm', 'Noor Haddad', 'Chloé Martin', 'Tamsin Reed', 'Mei Lin', 'Zuri Mensah'];
const NAMES_M = ['Tomás Silva', 'Kwame Asante', 'Arjun Mehta', 'Lars Eriksen', 'Daniel Cohen', 'Yusuf Kaya', 'Felix Wagner', 'Kenji Mori', 'Omar Farouk', 'Leo Novak'];
const JOBS = ['Architect', 'Bus driver', 'Violinist', 'Data analyst', 'Pastry chef', 'Student', 'Pilot trainee', 'Librarian', 'Surveyor', 'Jeweller', 'Nurse', 'Game designer'];

type Archetype = 'emmetrope' | 'myope' | 'hyperope' | 'wtr' | 'atr' | 'oblique' | 'mixed' | 'presbyope' | 'aniso' | 'reduced';

function pickArchetype(rng: Rng, d: number): Archetype {
  const easy: Archetype[] = ['emmetrope', 'myope', 'myope', 'hyperope', 'wtr', 'presbyope'];
  const mid: Archetype[] = ['myope', 'hyperope', 'wtr', 'atr', 'presbyope', 'aniso'];
  const hard: Archetype[] = ['oblique', 'mixed', 'atr', 'aniso', 'reduced', 'hyperope'];
  return rng.pick(d < 0.34 ? easy : d < 0.67 ? [...easy, ...mid] : [...mid, ...hard]);
}

const q = (lo: number, hi: number, rng: Rng) => quarter(rng.float(lo, hi));

function rxFor(arch: Archetype, rng: Rng, d: number): { OD: Lens; OS: Lens } {
  const near = (l: Lens): Lens => ({
    sphere: quarter(l.sphere + rng.int(-1, 1) * 0.25),
    cyl: Math.min(0, quarter(l.cyl + rng.int(-1, 1) * 0.25)),
    axis: wrapAxis(l.axis + rng.int(-8, 8)),
  });
  let od: Lens;
  switch (arch) {
    case 'emmetrope': od = { sphere: q(-0.25, 0.5, rng), cyl: q(-0.5, 0, rng), axis: rng.int(170, 190) }; break;
    case 'myope': od = { sphere: q(-0.75, -2 - 4 * d, rng), cyl: q(-0.5, 0, rng), axis: rng.int(165, 195) }; break;
    case 'hyperope': od = { sphere: q(0.75, 1.5 + 2.5 * d, rng), cyl: q(-0.5, 0, rng), axis: rng.int(170, 190) }; break;
    case 'wtr': od = { sphere: q(-2.5, 0.75, rng), cyl: q(-0.75, -1.5 - 1.5 * d, rng), axis: rng.int(165, 195) }; break;
    case 'atr': od = { sphere: q(-1.5, 1, rng), cyl: q(-0.75, -2.25, rng), axis: rng.int(75, 105) }; break;
    case 'oblique': od = { sphere: q(-2, 0.5, rng), cyl: q(-0.75, -2.5, rng), axis: rng.pick([rng.int(35, 55), rng.int(125, 145)]) }; break;
    case 'mixed': { const c = q(-1.75, -3, rng); od = { sphere: q(0.5, Math.max(0.5, -c - 0.75), rng), cyl: c, axis: rng.int(1, 180) }; break; }
    case 'presbyope': od = { sphere: q(-1.5, 2, rng), cyl: q(-1, 0, rng), axis: rng.int(1, 180) }; break;
    case 'aniso': {
      od = { sphere: q(-1, 1.5, rng), cyl: q(-0.75, 0, rng), axis: rng.int(1, 180) };
      const os = { sphere: quarter(od.sphere + rng.pick([-1, 1]) * rng.float(1.5, 3)), cyl: q(-1.25, 0, rng), axis: rng.int(1, 180) };
      return fix({ OD: od, OS: os }, rng);
    }
    case 'reduced': od = { sphere: q(-3, 2, rng), cyl: q(-0.5, -1.5, rng), axis: rng.int(1, 180) }; break;
  }
  return fix({ OD: od, OS: near(od) }, rng);
}

function fix(p: { OD: Lens; OS: Lens }, rng: Rng): { OD: Lens; OS: Lens } {
  const f = (l: Lens): Lens => {
    const cyl = Math.min(0, quarter(l.cyl));
    return { sphere: quarter(l.sphere), cyl, axis: cyl === 0 ? 180 : wrapAxis(l.axis) };
  };
  const out = { OD: f(p.OD), OS: f(p.OS) };
  // mirror symmetry is common: oblique axes tend to be mirror images (enantiomorphism)
  if (rng.chance(0.4) && out.OS.cyl !== 0) out.OS.axis = wrapAxis(180 - out.OD.axis);
  return out;
}

function ageFor(arch: Archetype, rng: Rng): number {
  switch (arch) {
    case 'presbyope': return rng.int(45, 68);
    case 'reduced': return rng.int(62, 82);
    case 'hyperope': return rng.pick([rng.int(9, 30), rng.int(38, 60)]);
    case 'myope': return rng.int(10, 40);
    default: return rng.int(16, 58);
  }
}

export function makeScenario(rng: Rng, difficulty: number): PracticeScenario {
  const d = Math.max(0, Math.min(1, difficulty));
  const arch = pickArchetype(rng, d);
  const age = ageFor(arch, rng);
  const rx = rxFor(arch, rng, d);
  const sex = rng.pick(['F', 'M'] as const);
  const add = typicalAdd(age);
  const amp = expectedAmplitude(age);

  const best: Record<Eye, number> = { OD: rng.pick([-0.1, -0.1, 0]), OS: rng.pick([-0.1, -0.1, 0]) };
  let lens: LensSign[] = age >= 60 ? ['nuclear-sclerosis'] : ['clear'];
  let lensGrade = age >= 60 ? 1 : 0;
  if (arch === 'reduced') {
    const worse: Eye = rng.chance(0.5) ? 'OD' : 'OS';
    best[worse] = rng.pick([0.3, 0.4, 0.5]);
    best[worse === 'OD' ? 'OS' : 'OD'] = rng.pick([0.1, 0]);
    lens = ['nuclear-sclerosis'];
    lensGrade = 3;
  }

  const va = {} as Record<Eye, { uncorrected: number; bestCorrected: number; pinhole: number; nearUncorrected: number }>;
  for (const eye of ['OD', 'OS'] as const) {
    const m = makeEyeModel({ sphere: rx[eye].sphere, cylinder: rx[eye].cyl, axis: rx[eye].axis }, best[eye], amp);
    const unc = Math.min(1.7, Math.round((best[eye] + blurLoss(effectiveResidual(m, { sphere: 0, cyl: 0, axis: 180 }).B)) * 10) / 10);
    va[eye] = {
      uncorrected: Math.max(best[eye], unc),
      bestCorrected: best[eye],
      pinhole: Math.min(unc, Math.max(best[eye], 0.1)),
      nearUncorrected: add > 0 ? Math.min(0.8, add * 0.3) : 0,
    };
  }

  const findings = buildFindings(age, {
    va,
    refraction: {
      OD: { sphere: rx.OD.sphere, cylinder: rx.OD.cyl, axis: rx.OD.axis, add: add || undefined },
      OS: { sphere: rx.OS.sphere, cylinder: rx.OS.cyl, axis: rx.OS.axis, add: add || undefined },
    },
    keratometry: {
      OD: { k1: 43.25, k2: quarter(43.25 + Math.abs(rx.OD.cyl) * 0.8), axisK1: rx.OD.axis, mires: 'regular' },
      OS: { k1: 43.25, k2: quarter(43.25 + Math.abs(rx.OS.cyl) * 0.8), axisK1: rx.OS.axis, mires: 'regular' },
    },
    anterior: {
      OD: { lens, lensGrade },
      OS: { lens, lensGrade },
    },
    external: { squinting: Math.max(va.OD.uncorrected, va.OS.uncorrected) >= 0.5 },
  });

  const name = rng.pick(sex === 'F' ? NAMES_F : NAMES_M);
  const patient: PatientProfile = {
    name, age, sex, occupation: rng.pick(JOBS),
    personality: rng.pick(['Chatty and eager to help.', 'Careful, a little anxious about "wrong answers".', 'Dry humour, quick answers.', 'Patient and precise.']),
    avatar: generateAvatar(rng, { age, sex }),
  };

  const fmt = (e: Eye) => formatRx({ sphere: rx[e].sphere, cylinder: rx[e].cyl, axis: rx[e].axis });
  const addTxt = add ? ` · Add +${add.toFixed(2)}` : '';
  return { patient, findings, answer: `OD ${fmt('OD')} · OS ${fmt('OS')}${addTxt}` };
}
