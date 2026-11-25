/** Practice scenarios (clinically coherent pupil pictures) and the recognition challenge. */
import {
  buildFindings, isolateLtrRuns, pickStrings, type DeepPartial, type Eye, type Locale, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { anisocoria } from './model';
import { P } from './strings';

export type PupilKind = 'normal' | 'physiologic' | 'rapd' | 'horner' | 'adie' | 'cn3' | 'pharm' | 'lnd';

const NAMES_F = ['Margit Hoffmann', 'Lucia Ferrari', 'Aaliyah Brooks', 'Ingrid Nilsen', 'Mei Tanaka', 'Rosa Delgado', 'Fatima Zahra', 'Ewa Kowal'];
const NAMES_M = ['Walter Pryce', 'Dmitri Volkov', 'Hamza Qureshi', 'Luis Ortega', 'Tobias Brandt', 'Kofi Asante', 'Arvind Nair', 'Henrik Moller'];
const JOBS = ['Retired teacher', 'Taxi driver', 'Accountant', 'Baker', 'Pharmacist', 'Carpenter', 'Choir singer', 'Farmer', 'Software tester'];
const other = (e: Eye): Eye => (e === 'OD' ? 'OS' : 'OD');

export function pickKind(rng: Rng, difficulty: number): PupilKind {
  const d = Math.max(0, Math.min(1, difficulty));
  const w: [PupilKind, number][] = [
    ['normal', 1.1 - 0.7 * d], ['physiologic', 0.5], ['rapd', 1.3], ['horner', 0.5 + 0.5 * d],
    ['adie', 0.4 + 0.5 * d], ['cn3', 0.3 + 0.5 * d], ['pharm', 0.2 + 0.2 * d], ['lnd', 0.2 + 0.4 * d],
  ];
  let r = rng.next() * w.reduce((s, [, x]) => s + x, 0);
  for (const [k, x] of w) { r -= x; if (r <= 0) return k; }
  return 'normal';
}

const dim = (age: number) => (age > 60 ? 5 : 6);
const lit = (age: number) => (age > 60 ? 2.5 : 3);

interface Gen { age: number; patch: DeepPartial<PatientFindings>; story: string }

function gen(kind: PupilKind, rng: Rng, difficulty: number): Gen {
  const age = kind === 'normal' || kind === 'physiologic' ? rng.int(18, 80) : rng.int(30, 78);
  const L = lit(age) + rng.pick([-0.5, 0, 0, 0.5]);
  const D = dim(age) + rng.pick([-0.5, 0, 0.5]);
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const ok = other(eye);
  const brisk = { OD: 'brisk', OS: 'brisk' } as const;
  switch (kind) {
    case 'normal':
      return { age, patch: { pupils: { sizeLightMm: { OD: L, OS: L }, sizeDarkMm: { OD: D, OS: D } } }, story: 'Equal, round, briskly reactive pupils: no RAPD, normal near response.' };
    case 'physiologic': {
      const a = rng.pick([0.5, 0.8, 1.0]);
      return {
        age, story: `Physiologic anisocoria: about ${a} mm, the same in light and dark, brisk reactions and no ptosis.`,
        patch: { pupils: { sizeLightMm: { [eye]: L + a, [ok]: L }, sizeDarkMm: { [eye]: D + a, [ok]: D } } } as DeepPartial<PatientFindings>,
      };
    }
    case 'rapd': {
      const grade = (difficulty > 0.6 ? rng.pick([1, 1, 2, 3, 4]) : rng.pick([2, 2, 3, 3, 4, 1])) as 1 | 2 | 3 | 4;
      const sev = grade >= 3 ? { reactivity: { ...brisk }, } : {};
      return {
        age, story: `RAPD ${eye} grade ${grade}+: the pupils are equal and brisk, but when the light swings onto the ${eye} both pupils dilate (optic nerve or extensive retinal disease in that eye).`,
        patch: { pupils: { sizeLightMm: { OD: L, OS: L }, sizeDarkMm: { OD: D, OS: D }, rapd: eye, rapdGrade: grade, ...sev } } as DeepPartial<PatientFindings>,
      };
    }
    case 'horner': {
      const smallL = L - rng.pick([0.5, 0.7]);
      const smallD = D - rng.pick([1.4, 1.8, 2.0]);
      return {
        age, story: `Horner-type picture: ${eye} is the smaller pupil and anisocoria is greater in the dark, with a mild ptosis and dilation lag on that side (sympathetic lesion).`,
        patch: {
          pupils: { sizeLightMm: { [eye]: smallL, [ok]: L }, sizeDarkMm: { [eye]: smallD, [ok]: D } },
          external: { ptosis: [eye] },
        } as DeepPartial<PatientFindings>,
      };
    }
    case 'adie': {
      const big = L + rng.pick([2.0, 2.5, 3.0]);
      return {
        age, story: `Adie tonic pupil ${eye}: larger in the light, slow and segmental to light, constricts slowly to near and redilates very slowly (light-near dissociation).`,
        patch: {
          pupils: {
            sizeLightMm: { [eye]: big, [ok]: L }, sizeDarkMm: { [eye]: big + 0.4, [ok]: D },
            reactivity: { [eye]: 'tonic', [ok]: 'brisk' }, nearResponse: 'light-near-dissociation', shape: { [eye]: 'irregular' },
          },
        } as DeepPartial<PatientFindings>,
      };
    }
    case 'cn3':
      return {
        age, story: `Third-nerve palsy ${eye}: a dilated, non-reactive pupil with ptosis, no near response. Urgent imaging for a compressive cause such as an aneurysm.`,
        patch: {
          pupils: {
            sizeLightMm: { [eye]: 7, [ok]: L }, sizeDarkMm: { [eye]: 7.5, [ok]: D },
            reactivity: { [eye]: 'fixed', [ok]: 'brisk' }, shape: { [eye]: 'round' },
          },
          external: { ptosis: [eye] },
        } as DeepPartial<PatientFindings>,
      };
    case 'pharm':
      return {
        age, story: `Pharmacologic mydriasis ${eye}: very large (7-8 mm) round fixed pupil, no ptosis, normal eye movements. A fresh dilating drop or exposure to an anticholinergic.`,
        patch: {
          pupils: { sizeLightMm: { [eye]: 8, [ok]: L }, sizeDarkMm: { [eye]: 8, [ok]: D }, reactivity: { [eye]: 'fixed', [ok]: 'brisk' } },
        } as DeepPartial<PatientFindings>,
      };
    case 'lnd': {
      const ar = rng.chance(0.5);
      return ar
        ? {
          age, story: 'Argyll Robertson-type pupils: small, irregular, both eyes, poor to light yet brisk to near (light-near dissociation). Think neurosyphilis and test serology.',
          patch: {
            pupils: {
              sizeLightMm: { OD: 2, OS: 2 }, sizeDarkMm: { OD: 2.5, OS: 2.5 }, reactivity: { OD: 'sluggish', OS: 'sluggish' },
              nearResponse: 'light-near-dissociation', shape: { OD: 'irregular', OS: 'irregular' },
            },
          } as DeepPartial<PatientFindings>,
        }
        : {
          age, story: 'Dorsal midbrain (Parinaud) pattern: mid-dilated pupils that react poorly to light but constrict to near (light-near dissociation).',
          patch: {
            pupils: {
              sizeLightMm: { OD: 5, OS: 5 }, sizeDarkMm: { OD: 6, OS: 6 }, reactivity: { OD: 'sluggish', OS: 'sluggish' }, nearResponse: 'light-near-dissociation',
            },
          } as DeepPartial<PatientFindings>,
        };
    }
  }
}

export const PUPIL_KINDS: PupilKind[] = ['normal', 'physiologic', 'rapd', 'horner', 'adie', 'cn3', 'pharm', 'lnd'];

export function makeScenario(rng: Rng, difficulty: number, forceKind?: PupilKind): PracticeScenario {
  const kind = forceKind ?? pickKind(rng, difficulty);
  const g = gen(kind, rng, difficulty);
  const findings = buildFindings(g.age, g.patch);
  const sex = rng.pick(['F', 'M'] as const);
  const patient: PatientProfile = {
    name: rng.pick(sex === 'F' ? NAMES_F : NAMES_M),
    age: g.age, sex, occupation: rng.pick(JOBS),
    personality: rng.pick(['Looks straight ahead and tries not to blink.', 'Squints when the light comes close.', 'Chatty, but holds still when asked.', 'A little anxious about the bright light.']),
    avatar: { ...generateAvatar(rng, { age: g.age, sex }), glasses: 'none' },
  };
  return { patient, findings, answer: g.story };
}

// ───────────────────────── recognition challenge
export interface Challenge { question: string; options: string[]; correct: number; explain: string }

export function explain(f: PatientFindings, locale: Locale = 'en'): string {
  const p = f.pupils;
  const an = anisocoria(f);
  const t = pickStrings(P, locale);
  const parts: string[] = [];
  if (p.rapd !== 'none') parts.push(t.rapdYes(p.rapd, p.rapdGrade ?? 2));
  else parts.push(t.rapdNo);
  if (an.pattern === 'physiologic') parts.push(t.physio);
  if (an.pattern === 'greater-dark') parts.push(t.greaterDark(an.smaller ?? ''));
  if (an.pattern === 'greater-light') parts.push(t.greaterLight(an.larger ?? '', p.reactivity[an.larger!] === 'tonic' ? t.tonic : ptosisHint(f, t)));
  if (p.nearResponse === 'light-near-dissociation') parts.push(t.lnd);
  const out = parts.join(' ');
  return locale === 'he' ? isolateLtrRuns(out) : out;
}

const ptosisHint = (f: PatientFindings, t: { cn3: string; pharm: string }) => (f.external?.ptosis?.length ? t.cn3 : t.pharm);

export function makeChallenge(f: PatientFindings, rng: Rng, locale: Locale = 'en'): Challenge {
  const p = f.pupils;
  const an = anisocoria(f);
  const t = pickStrings(P, locale);
  const text = explain(f, locale);
  const shuffle = <T,>(opts: T[], correctIdx: number) => {
    const order = rng.shuffle(opts.map((_, i) => i));
    return { options: order.map((i) => opts[i]!) as T[], correct: order.indexOf(correctIdx) };
  };
  if (p.rapd !== 'none' || (an.pattern === 'none' && p.nearResponse === 'normal') || an.pattern === 'physiologic') {
    const opts = [t.optNone, t.optOD, t.optOS];
    const s = shuffle(opts, p.rapd === 'none' ? 0 : p.rapd === 'OD' ? 1 : 2);
    return { question: t.qSwing, ...s, explain: text };
  }
  if (an.pattern === 'greater-dark') {
    const s = shuffle([t.pRight, t.pLeft, t.pNeither], an.smaller === 'OD' ? 0 : 1);
    return { question: t.qDark, ...s, explain: text };
  }
  if (an.pattern === 'greater-light') {
    const s = shuffle([t.pRight, t.pLeft, t.pNeither], an.larger === 'OD' ? 0 : 1);
    return { question: t.qLight, ...s, explain: text };
  }
  const s = shuffle([t.oLnd, t.oRapd, t.oPhysio, t.oHippus], 0);
  return { question: t.qLnd, ...s, explain: text };
}
