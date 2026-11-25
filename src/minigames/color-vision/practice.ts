/** Arcade scenarios: clinically coherent colour-vision patients, harder with difficulty. */
import { buildFindings, type ColorVision, type DeepPartial, type Eye, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng } from '@core';
import { generateAvatar } from '@render';
import { reportFor } from './clinical';

/** Practice scenarios are generated before mount (no ctx), so read the edition from the page. */
const docLocale = (): 'en' | 'he' => {
  try { return document.documentElement.lang === 'he' ? 'he' : 'en'; } catch { return 'en'; }
};

type Kind = 'normal' | 'deutan' | 'protan' | 'tritan' | 'acquired-rg' | 'acquired-by' | 'desat-only';

const NAMES_F = ['Amara Osei', 'Lena Fischer', 'Priya Raman', 'Sofia Marquez', 'Hana Sato', 'Chloe Martin', 'Noor Haddad', 'Ingrid Lund'];
const NAMES_M = ['Kwame Mensah', 'Tom Becker', 'Arjun Mehta', 'Diego Alvarez', 'Kenji Mori', 'Liam O’Brien', 'Yusuf Kaya', 'Mateo Rossi'];
const NAMES_X = ['Alex Rivera', 'Sam Okafor', 'Robin Ashby', 'Jordan Lee'];

const NAMES_F_HE = ['אסתר אופיר', 'רחל פישר', 'פריאל מזרחי', 'סיגל מרקוביץ׳', 'הילה סבן', 'שלומית מרטין', 'נור חדאד', 'אורית לוי'];
const NAMES_M_HE = ['קוואמי כהן', 'תומר בקר', 'אבי מזרחי', 'דייגו אלבז', 'קובי מורי', 'ליאם אברהם', 'יוסוף קאיה', 'מתי רוזן'];
const NAMES_X_HE = ['אלכס רבינוביץ׳', 'סמי חורי', 'רובין אשכנזי', 'יובל לי'];

/** [masculine, feminine] — picked by the patient's sex. */
const JOBS_HE: Record<Kind, [string, string][]> = {
  normal: [['מעצב גרפי', 'מעצבת גרפית'], ['מועמד לקורס טיס', 'מועמדת לקורס טיס'], ['מורה', 'מורה'], ['מוכר פרחים', 'מוכרת פרחים'], ['סטודנט', 'סטודנטית']],
  deutan: [['חשמלאי מתלמד', 'חשמלאית מתלמדת'], ['סטודנט', 'סטודנטית'], ['טבח', 'טבחית'], ['מועמד למשטרה', 'מועמדת למשטרה'], ['גנן', 'גננת']],
  protan: [['מועמד לנהיגת רכבת', 'מועמדת לנהיגת רכבת'], ['סטודנט', 'סטודנטית'], ['צייר', 'ציירת'], ['מהנדס תוכנה', 'מהנדסת תוכנה'], ['קצב', 'קצבית']],
  tritan: [['אדריכל', 'אדריכלית'], ['רואה חשבון', 'רואת חשבון'], ['קונה טקסטיל', 'קונת טקסטיל'], ['סטודנט', 'סטודנטית']],
  'acquired-rg': [['רץ מרתון', 'רצת מרתון'], ['אח', 'אחות'], ['בריסטה', 'בריסטה'], ['דוקטורנט', 'דוקטורנטית'], ['חובש', 'חובשת']],
  'acquired-by': [['מייסד סטארט-אפ', 'מייסדת סטארט-אפ'], ['סוחר בבורסה', 'סוחרת בבורסה'], ['בקר תעופה', 'בקרית תעופה'], ['עורך דין', 'עורכת דין']],
  'desat-only': [['מורה ליוגה', 'מורה ליוגה'], ['עיתונאי', 'עיתונאית'], ['פיזיותרפיסט', 'פיזיותרפיסטית']],
};

const JOBS: Record<Kind, string[]> = {
  normal: ['Graphic designer', 'Pilot applicant', 'Teacher', 'Florist', 'Student'],
  deutan: ['Electrician apprentice', 'Student', 'Chef', 'Police applicant', 'Gardener'],
  protan: ['Train driver applicant', 'Student', 'Painter', 'Software engineer', 'Butcher'],
  tritan: ['Architect', 'Accountant', 'Textile buyer', 'Student'],
  'acquired-rg': ['Marathon runner', 'Nurse', 'Barista', 'PhD student', 'Paramedic'],
  'acquired-by': ['Start-up founder', 'Trader', 'Air-traffic controller', 'Lawyer'],
  'desat-only': ['Yoga teacher', 'Journalist', 'Physiotherapist'],
};

function weighted<T>(rng: Rng, table: readonly (readonly [T, number])[]): T {
  const total = table.reduce((a, [, w]) => a + Math.max(0, w), 0);
  let r = rng.next() * total;
  for (const [v, w] of table) {
    r -= Math.max(0, w);
    if (r < 0) return v;
  }
  return table[table.length - 1]![0];
}

function severity(rng: Rng, d: number): ColorVision['severity'] {
  return weighted(rng, [['mild', 0.25 + 0.7 * d], ['moderate', 1], ['severe', 1.05 - 0.6 * d]] as const);
}

export function practiceScenario(rng: Rng, difficulty: number): PracticeScenario {
  const d = Math.max(0, Math.min(1, difficulty));
  const kind = weighted<Kind>(rng, [
    ['normal', 1.2 - 0.5 * d],
    ['deutan', 1.5],
    ['protan', 1.0],
    ['tritan', 0.15 + 0.5 * d],
    ['acquired-rg', 0.5 + 0.6 * d],
    ['acquired-by', 0.1 + 0.6 * d],
    ['desat-only', d > 0.6 ? 0.45 : 0],
  ]);
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  let age = rng.int(9, 62);
  let sex: PatientProfile['sex'] = rng.chance(0.48) ? 'F' : rng.chance(0.92) ? 'M' : 'X';
  let patch: DeepPartial<PatientFindings> = {};

  switch (kind) {
    case 'deutan':
    case 'protan': {
      // X-linked recessive: ~8% of males, ~0.5% of females
      sex = rng.chance(0.9) ? 'M' : 'F';
      const cv: ColorVision = { type: kind, severity: severity(rng, d), redDesaturation: false };
      patch = { colorVision: { OD: cv, OS: { ...cv } } };
      break;
    }
    case 'tritan': {
      const cv: ColorVision = { type: 'tritan', severity: rng.chance(0.5) ? 'moderate' : 'severe', redDesaturation: false };
      patch = { colorVision: { OD: cv, OS: { ...cv } } };
      break;
    }
    case 'acquired-rg': {
      // demyelinating optic neuritis pattern: young adult, female predominance, monocular
      age = rng.int(19, 44);
      sex = rng.chance(0.72) ? 'F' : 'M';
      const sev = severity(rng, d);
      const va = sev === 'mild' ? rng.pick([0.2, 0.3]) : sev === 'moderate' ? rng.pick([0.4, 0.5, 0.6]) : rng.pick([0.7, 0.8]);
      patch = {
        colorVision: { [eye]: { type: 'acquired-red-green', severity: sev, redDesaturation: true } },
        va: { [eye]: { uncorrected: va, bestCorrected: va, pinhole: va, nearUncorrected: va } },
        pupils: { rapd: eye, rapdGrade: sev === 'mild' ? 1 : sev === 'moderate' ? 2 : 3 },
        motility: { painOnMovement: true },
        fields: { [eye]: 'central-scotoma' },
      } as DeepPartial<PatientFindings>;
      break;
    }
    case 'acquired-by': {
      // central serous pattern: outer retina -> blue-yellow loss (Köllner's rule)
      age = rng.int(30, 52);
      sex = rng.chance(0.8) ? 'M' : 'F';
      const sev: ColorVision['severity'] = rng.chance(0.4 + 0.4 * d) ? 'mild' : 'moderate';
      const va = rng.pick([0.2, 0.3]);
      patch = {
        colorVision: { [eye]: { type: 'acquired-blue-yellow', severity: sev, redDesaturation: false } },
        va: { [eye]: { uncorrected: va, bestCorrected: va, pinhole: va, nearUncorrected: va + 0.1 } },
        amsler: { [eye]: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 } },
      } as DeepPartial<PatientFindings>;
      break;
    }
    case 'desat-only': {
      age = rng.int(22, 48);
      patch = {
        colorVision: { [eye]: { type: 'normal', severity: 'none', redDesaturation: true } },
        pupils: { rapd: eye, rapdGrade: 1 },
      } as DeepPartial<PatientFindings>;
      break;
    }
    case 'normal':
      break;
  }

  const findings = buildFindings(age, patch);
  const he = docLocale() === 'he';
  const name = rng.pick(he ? (sex === 'F' ? NAMES_F_HE : sex === 'M' ? NAMES_M_HE : NAMES_X_HE) : (sex === 'F' ? NAMES_F : sex === 'M' ? NAMES_M : NAMES_X));
  const avatar = generateAvatar(rng, { age, sex });
  const patient: PatientProfile = {
    name, age, sex, occupation: he ? rng.pick(JOBS_HE[kind])[sex === 'F' ? 1 : 0]! : rng.pick(JOBS[kind]),
    personality: he ? (sex === 'F' ? (kind === 'normal' ? 'באה לבדיקת צבעים שגרתית.' : 'סקרנית לדעת איך צבעים נראים לכולם.') : (kind === 'normal' ? 'בא לבדיקת צבעים שגרתית.' : 'סקרן לדעת איך צבעים נראים לכולם.')) : kind === 'normal' ? 'Here for a routine colour check.' : 'Curious how colours look to everyone else.',
    avatar,
  };
  const line = reportFor(findings, patient, he ? 'he' : 'en').find((l) => l.label === (he ? 'ראיית צבעים' : 'Colour vision'));
  const answer = line ? (line.eye && line.eye !== 'OU' ? `${line.value} — ${line.eye}` : line.value) : he ? 'ראיית צבעים תקינה' : 'Normal colour vision';
  return { patient, findings, answer };
}
