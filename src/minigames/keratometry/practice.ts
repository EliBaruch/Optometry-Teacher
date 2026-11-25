/**
 * Practice scenarios (clinically coherent corneas) and the end-of-practice
 * recognition challenge. Pure: rng in, data out.
 */
import {
  buildFindings, EYES, type DeepPartial, type Eye, type Keratometry, type PatientFindings, type PatientProfile,
  type PerEye, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { cornealCyl, fmtK, fmtReading, normalizeK, ORIENTATION_SHORT, orientation, quarter, wrapAxis } from './optics';

export type CorneaKind = 'normal' | 'regular' | 'oblique' | 'keratoconus';

const NAMES_F = ['Amara Okafor', 'Lena Fischer', 'Priya Raman', 'Sofia Marquez', 'Hana Sato', 'Noor Haddad', 'Chloé Martin', 'Ines Duarte'];
const NAMES_M = ['Theo Laurent', 'Kwame Mensah', 'Arjun Mehta', 'Mateo Rossi', 'Yusuf Demir', 'Owen Gallagher', 'Kenji Mori', 'Samir Aziz'];
const JOBS = ['Contact-lens wearer', 'Graphic designer', 'Bus driver', 'Violinist', 'Barista', 'Engineering student', 'Pilot', 'Librarian', 'Gamer', 'Nurse'];

/** Weighted pick of the cornea type: pathology and oblique axes grow with difficulty. */
export function pickKind(rng: Rng, difficulty: number): CorneaKind {
  const d = Math.max(0, Math.min(1, difficulty));
  const w: [CorneaKind, number][] = [
    ['normal', 1.1 - 0.6 * d],
    ['regular', 1.0],
    ['oblique', 0.3 + 0.6 * d],
    ['keratoconus', 0.3 + 0.8 * d],
  ];
  const total = w.reduce((s, [, x]) => s + x, 0);
  let r = rng.next() * total;
  for (const [k, x] of w) {
    r -= x;
    if (r <= 0) return k;
  }
  return 'regular';
}

const snap5 = (a: number) => wrapAxis(Math.round(a / 5) * 5);
/** Enantiomorphism: the fellow eye tends to mirror the axis about 90°. */
const mirror = (a: number, rng: Rng) => snap5(180 - a + rng.int(-2, 2) * 5);

interface Gen {
  age: number;
  k: PerEye<Keratometry>;
}

function genCornea(kind: CorneaKind, rng: Rng, difficulty: number): Gen {
  const base = quarter(rng.float(41.5, 45.25));
  const make = (k1: number, cyl: number, axis: number, mires: Keratometry['mires']): Keratometry => ({
    k1: quarter(k1), k2: quarter(k1 + cyl), axisK1: snap5(axis), mires,
  });
  switch (kind) {
    case 'normal': {
      const age = rng.int(18, 78);
      // young corneas are with-the-rule; with age they drift against-the-rule
      const atr = age >= 60 && rng.chance(0.7);
      const cyl = quarter(rng.float(0, 0.75));
      const ax = atr ? 90 + rng.int(-3, 3) * 5 : 180 + rng.int(-3, 3) * 5;
      const od = make(base, cyl, ax, 'regular');
      const os = make(base + rng.pick([-0.25, 0, 0, 0.25]), quarter(cyl + rng.pick([-0.25, 0, 0.25])), mirror(ax, rng), 'regular');
      return { age, k: { OD: od, OS: { ...os, k2: Math.max(os.k1, os.k2) } } };
    }
    case 'regular': {
      const age = rng.int(12, 82);
      const atr = age >= 55 ? rng.chance(0.65) : rng.chance(0.15);
      const cyl = quarter(rng.float(1, 2.5 + 1.5 * difficulty));
      const ax = atr ? 90 + rng.int(-3, 3) * 5 : 180 + rng.int(-3, 3) * 5;
      return {
        age,
        k: {
          OD: make(base - cyl / 3, cyl, ax, 'regular'),
          OS: make(base - cyl / 3 + rng.pick([-0.25, 0, 0.25]), quarter(cyl + rng.pick([-0.5, -0.25, 0, 0.25])), mirror(ax, rng), 'regular'),
        },
      };
    }
    case 'oblique': {
      const age = rng.int(10, 70);
      const cyl = quarter(rng.float(1, 3 + difficulty));
      const ax = rng.chance(0.5) ? rng.int(30, 60) : rng.int(120, 150);
      return {
        age,
        k: {
          OD: make(base - cyl / 3, cyl, ax, 'regular'),
          OS: make(base - cyl / 3, quarter(cyl + rng.pick([-0.25, 0, 0.25])), mirror(ax, rng), 'regular'),
        },
      };
    }
    case 'keratoconus': {
      // asymmetric, progressive in teens–30s; inferior cone → oblique, irregular steepening
      const age = rng.int(15, 34);
      const worse: Eye = rng.chance(0.5) ? 'OD' : 'OS';
      const kSteep = quarter(rng.float(49, 52 + 4 * difficulty));
      const cylBad = quarter(rng.float(3, 5 + 2 * difficulty));
      const mild = rng.chance(0.35 + 0.4 * difficulty);
      const kMild = mild ? quarter(rng.float(46.5, 48.75)) : quarter(rng.float(44, 46));
      const cylMild = quarter(mild ? rng.float(1.25, 2.75) : rng.float(0.5, 1.25));
      const bad = make(kSteep - cylBad, cylBad, rng.int(15, 165), 'distorted');
      const fellow = make(kMild - cylMild, cylMild, rng.int(10, 170), mild ? 'irregular' : 'regular');
      return { age, k: worse === 'OD' ? { OD: bad, OS: fellow } : { OD: fellow, OS: bad } };
    }
  }
}

/** Refraction & acuity consistent with the cornea (Javal-ish: corneal cyl ≈ refractive cyl). */
function coherentPatch(kind: CorneaKind, g: Gen, rng: Rng): DeepPartial<PatientFindings> {
  const sph = kind === 'keratoconus' ? quarter(rng.float(-6, -1)) : quarter(rng.float(-4, 2));
  const patch: DeepPartial<PatientFindings> = { keratometry: g.k, refraction: {}, va: {}, anterior: {}, retinoscopyReflex: {} };
  for (const e of EYES) {
    const k = normalizeK(g.k[e]);
    const cyl = cornealCyl(k);
    const irregular = k.mires !== 'regular';
    const rxCyl = cyl >= 0.5 ? -quarter(cyl * (irregular ? 1.1 : 1)) : 0;
    const sphere = quarter(sph + (irregular ? -1 : 0) + rng.pick([-0.25, 0, 0.25]));
    const se = sphere + rxCyl / 2;
    const ucva = Math.min(1.3, Math.round((Math.abs(se) * 0.32 + Math.abs(rxCyl) * 0.12) * 10) / 10);
    const bcva = k.mires === 'distorted' ? 0.3 + rng.int(0, 2) * 0.1 : k.mires === 'irregular' ? 0.1 : -0.1;
    patch.refraction![e] = { sphere, cylinder: rxCyl, axis: rxCyl ? k.axisK1 : 180 };
    patch.va![e] = { uncorrected: Math.max(bcva, ucva), bestCorrected: bcva, pinhole: Math.max(bcva - 0.1, Math.min(ucva, 0.2)) };
    if (irregular) {
      patch.retinoscopyReflex![e] = 'scissors';
      patch.anterior![e] = { cornea: k.mires === 'distorted' ? ['cone-thinning', 'vogt-striae', 'fleischer-ring'] : ['fleischer-ring'] };
    }
  }
  return patch;
}

export function describeKind(k: Keratometry): string {
  const n = normalizeK(k);
  if (n.mires !== 'regular') return 'Irregular cornea — suspect keratoconus';
  if (cornealCyl(n) < 1) return 'Normal, near-spherical cornea';
  const o = orientation(n.axisK1);
  return o === 'with-the-rule' ? 'Regular with-the-rule astigmatism' : o === 'against-the-rule' ? 'Regular against-the-rule astigmatism' : 'Regular oblique astigmatism';
}

export function makeScenario(rng: Rng, difficulty: number): PracticeScenario {
  const kind = pickKind(rng, difficulty);
  const g = genCornea(kind, rng, difficulty);
  const findings = buildFindings(g.age, coherentPatch(kind, g, rng));
  const sex = rng.chance(0.5) ? 'F' : 'M';
  const patient: PatientProfile = {
    name: rng.pick(sex === 'F' ? NAMES_F : NAMES_M),
    age: g.age,
    sex,
    occupation: rng.pick(JOBS),
    personality: rng.pick(['Steady fixation, very cooperative.', 'Blinks a lot under the light.', 'Curious about the glowing rings.', 'A little nervous, chin keeps drifting.']),
    avatar: { ...generateAvatar(rng, { age: g.age, sex }), glasses: 'none' },
  };
  const line = (e: Eye) => `${e} ${fmtReading(normalizeK(g.k[e]))} (${describeKind(g.k[e]).toLowerCase()})`;
  return { patient, findings, answer: `${line('OD')} · ${line('OS')}` };
}

// ───────────────────────── recognition challenge

export interface Challenge {
  eye: Eye;
  question: string;
  options: string[];
  correct: number;
  explain: string;
}

const DESCRIPTIONS = [
  'Normal, near-spherical cornea',
  'Regular with-the-rule astigmatism',
  'Regular against-the-rule astigmatism',
  'Regular oblique astigmatism',
  'Irregular cornea — suspect keratoconus',
];

export function explainEye(eye: Eye, raw: Keratometry): string {
  const k = normalizeK(raw);
  const cyl = cornealCyl(k);
  const steepAx = wrapAxis(k.axisK1 + 90);
  const base = `${eye}: K1 ${fmtK(k.k1)} D @ ${k.axisK1}°, K2 ${fmtK(k.k2)} D @ ${steepAx}°. Corneal cylinder is simply K2 − K1 = ${cyl.toFixed(2)} D`;
  if (k.mires !== 'regular') {
    return `${base}. Mires that wobble and refuse to superimpose mean irregular astigmatism${k.k2 > 47 ? `, and a steep K of ${fmtK(k.k2)} D (above 47 D) adds weight` : ''} — refer for corneal topography/tomography to confirm keratoconus and watch for progression (cross-linking).`;
  }
  if (cyl < 1) return `${base} — physiological. Young corneas are usually slightly steeper vertically (with-the-rule).`;
  const o = orientation(k.axisK1);
  const why = o === 'with-the-rule'
    ? 'the vertical meridian is steepest (with-the-rule, minus-cyl axis near 180).'
    : o === 'against-the-rule'
      ? 'the horizontal meridian is steepest (against-the-rule, common after 60).'
      : 'the principal meridians sit between 30–60° / 120–150°, so it is oblique.';
  return `${base} (−${cyl.toFixed(2)} × ${String(k.axisK1).padStart(3, '0')}); ${why} Round, crisp mires say the cornea is regular, so spectacles or toric lenses will correct it.`;
}

export function makeChallenge(findings: PatientFindings, rng: Rng): Challenge {
  const ks = findings.keratometry;
  const abnormal = EYES.find((e) => ks[e].mires !== 'regular');
  const eye: Eye = abnormal ?? (cornealCyl(ks.OD) >= cornealCyl(ks.OS) ? 'OD' : 'OS');
  const k = normalizeK(ks[eye]);
  const cyl = cornealCyl(k);
  const kind = abnormal ? 'describe' : rng.pick(['describe', 'amount'] as const);
  if (kind === 'describe') {
    const right = describeKind(k);
    const others = rng.shuffle(DESCRIPTIONS.filter((d) => d !== right)).slice(0, 3);
    const options = rng.shuffle([right, ...others]);
    return { eye, question: `Which best describes the ${eye} cornea?`, options, correct: options.indexOf(right), explain: explainEye(eye, k) };
  }
  const o = ORIENTATION_SHORT[orientation(k.axisK1)];
  const fmt = (c: number, ori: string) => (c < 0.125 ? 'None — spherical' : `${c.toFixed(2)} D ${ori}`);
  const right = fmt(cyl, o);
  const flip = o === 'WTR' ? 'ATR' : o === 'ATR' ? 'WTR' : 'WTR';
  const pool = [fmt(cyl, flip), fmt(cyl + 1, o), fmt(Math.max(0, cyl - 0.75), o), fmt(cyl + 0.5, flip), fmt(cyl + 1.5, o)];
  const distract = [...new Set(pool.filter((p) => p !== right))].slice(0, 3);
  const options = rng.shuffle([right, ...distract]);
  return { eye, question: `How much corneal astigmatism does ${eye} have?`, options, correct: options.indexOf(right), explain: explainEye(eye, k) };
}
