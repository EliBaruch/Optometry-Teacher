/**
 * Practice scenarios (clinically coherent pressures) and the recognition
 * challenge. Pure: rng in, data out.
 */
import {
  buildFindings, pickStrings, type DeepPartial, type Eye, type Locale, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { classify, type Method } from './optics';
import { fix, S } from './strings';

/** The edition's language, as set on <html> at boot (practice() has no locale parameter; English when unset). */
const editionLocale = (): Locale => (typeof document !== 'undefined' && document.documentElement.lang === 'he' ? 'he' : 'en');

/** Hebrew practice patients: the same slots as the English lists (so the seeded draw is identical), written for Israel. */
const NAMES_F_HE = ['מרים לוי', 'לוסי פרארי', 'עאלייה חאמד', 'אירינה וולקוב', 'רוזה בן־שושן', 'סיגלית אוחיון', 'פאטמה זועבי', 'נטע שפירא'];
const NAMES_M_HE = ['אברהם כץ', 'דמיטרי וולקוב', 'חמזה סעדי', 'אסף פרץ', 'יורם ברנדט', 'דני מזרחי', 'מוחמד עיסא', 'יוסף בן־דוד'];
const JOBS_HE = ['מורה בגמלאות', 'נהג מונית', 'רואה חשבון', 'אופה', 'רוקח', 'נגר', 'זמר במקהלה', 'חקלאי', 'בודק תוכנה'];
const PERSONALITY_HE: [string, string][] = [
  ['רגועה, אבל מצמצת כשהאור מתקרב.', 'רגוע, אבל מצמץ כשהאור מתקרב.'],
  ['חוששת מ״הבדיקה עם הפוף של האוויר״.', 'חושש מ״הבדיקה עם הפוף של האוויר״.'],
  ['פטפטנית, אבל יושבת בלי לזוז כשמבקשים.', 'פטפטן, אבל יושב בלי לזוז כשמבקשים.'],
  ['נוטה לסחוט את העפעפיים חזק.', 'נוטה לסחוט את העפעפיים חזק.'],
];

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

function gen(kind: PressureKind, rng: Rng, difficulty: number, locale: Locale = 'en'): Gen {
  const st = pickStrings(S, locale);
  const j = () => rng.int(-1, 1);
  switch (kind) {
    case 'normal': {
      const b = rng.int(11, 19);
      return { age: rng.int(18, 80), od: b + j(), os: b + j(), patch: {}, story: st.storyNormal };
    }
    case 'hypertension': {
      const b = rng.int(23, 29 + Math.round(3 * difficulty));
      return { age: rng.int(45, 78), od: b + rng.int(-1, 2), os: b + rng.int(-2, 1), patch: {}, story: st.storyHtn };
    }
    case 'glaucoma-asym': {
      const hi = rng.int(24, 32);
      const lo = rng.int(14, 19);
      const worse: Eye = rng.chance(0.5) ? 'OD' : 'OS';
      return { age: rng.int(50, 82), od: worse === 'OD' ? hi : lo, os: worse === 'OS' ? hi : lo, patch: {}, story: st.storyAsym(worse) };
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
        story: st.storyAngle(worse),
      };
    }
    case 'hypotony': {
      const worse: Eye = rng.chance(0.5) ? 'OD' : 'OS';
      const lo = rng.int(3, 5);
      const ok = rng.int(12, 17);
      return {
        age: rng.int(25, 70), od: worse === 'OD' ? lo : ok, os: worse === 'OS' ? lo : ok,
        patch: { anterior: { [worse]: { anteriorChamber: { cells: 2 as const, flare: 2 as const } } } } as DeepPartial<PatientFindings>,
        story: st.storyHypo(worse),
      };
    }
  }
}

export function makeScenario(rng: Rng, difficulty: number): PracticeScenario {
  const kind = pickKind(rng, difficulty);
  const locale = editionLocale();
  const g = gen(kind, rng, difficulty, locale);
  const findings = buildFindings(g.age, { ...g.patch, iop: { OD: g.od, OS: g.os } } as DeepPartial<PatientFindings>);
  const sex = rng.pick(['F', 'M'] as const);
  const he = locale === 'he';
  const personalityEn = ['Steady, but blinks when the light comes close.', 'Anxious about "the puff test".', 'Chatty, holds very still when asked.', 'Tends to squeeze the lids tightly.'];
  const patient: PatientProfile = {
    name: rng.pick(sex === 'F' ? (he ? NAMES_F_HE : NAMES_F) : (he ? NAMES_M_HE : NAMES_M)),
    age: g.age,
    sex,
    occupation: rng.pick(he ? JOBS_HE : JOBS),
    personality: he ? rng.pick(PERSONALITY_HE)[sex === 'F' ? 0 : 1] : rng.pick(personalityEn),
    avatar: { ...generateAvatar(rng, { age: g.age, sex }), glasses: 'none' },
  };
  return { patient, findings, answer: fix(locale, `OD ${g.od} · OS ${g.os} mmHg. ${g.story}`) };
}

// ───────────────────────── recognition challenge

export interface Challenge { question: string; options: string[]; correct: number; explain: string }

export function explain(findings: PatientFindings, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  const { OD, OS } = findings.iop;
  const parts: string[] = [t.exPressures(OD, OS)];
  const hi = Math.max(OD, OS);
  const c = classify(hi);
  if (c === 'crisis') parts.push(t.exCrisis);
  else if (c === 'elevated') parts.push(t.exElevated);
  else if (classify(Math.min(OD, OS)) === 'hypotony') parts.push(t.exHypotony);
  else parts.push(t.exNormal);
  if (Math.abs(OD - OS) >= 6) parts.push(t.exAsym(Math.abs(OD - OS)));
  return fix(locale, parts.join(' '));
}

export function makeChallenge(findings: PatientFindings, rng: Rng, _method: Method = 'goldmann', locale: Locale = 'en'): Challenge {
  const c = buildChallenge(findings, rng, locale);
  return { ...c, question: fix(locale, c.question), options: c.options.map((o) => fix(locale, o)) };
}

function buildChallenge(findings: PatientFindings, rng: Rng, locale: Locale): Challenge {
  const t = pickStrings(S, locale);
  const CLASS_TEXT: Record<ReturnType<typeof classify>, string> = { normal: t.classNormal, elevated: t.classElevated, crisis: t.classCrisis, hypotony: t.classHypotony };
  const { OD, OS } = findings.iop;
  const hi: Eye = OD >= OS ? 'OD' : 'OS';
  const hiV = findings.iop[hi];
  const text = explain(findings, locale);
  const kind = hiV >= 35 || classify(Math.min(OD, OS)) === 'hypotony' ? 'class' : Math.abs(OD - OS) >= 4 ? 'which' : rng.pick(['value', 'class'] as const);
  if (kind === 'which') {
    const options = [t.optOD, t.optOS, t.optEqual];
    return { question: t.qWhich, options, correct: hi === 'OD' ? 0 : 1, explain: text };
  }
  if (kind === 'value') {
    const right = `${hiV} mmHg`;
    const picks = new Set<number>();
    for (const d of rng.shuffle([-6, -3, 3, 4, 6, 8])) {
      const v = hiV + d;
      if (v >= 3 && picks.size < 3) picks.add(v);
    }
    const options = rng.shuffle([right, ...[...picks].map((v) => `${v} mmHg`)]);
    return { question: t.qValue(hi === 'OD'), options, correct: options.indexOf(right), explain: text };
  }
  const worstKey = hiV >= 35 || hiV > 21 ? classify(hiV) : classify(Math.min(OD, OS)) === 'hypotony' ? 'hypotony' : 'normal';
  const keys = ['normal', 'elevated', 'crisis', 'hypotony'] as const;
  const options = rng.shuffle(keys.map((k) => CLASS_TEXT[k]));
  return { question: t.qClass, options, correct: options.indexOf(CLASS_TEXT[worstKey]), explain: text };
}
