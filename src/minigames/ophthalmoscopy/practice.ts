/**
 * Practice scenarios + the end-of-practice recognition challenge — pure.
 * `classify()` maps any set of findings back to a named fundus picture, so the
 * challenge works for generated scenarios and for real cases alike.
 */
import {
  buildFindings, EYES, otherEye,
  type DeepPartial, type Eye, type Locale, type PatientFindings, type PatientProfile, type PracticeScenario, type Rng,
} from '@core';
import { generateAvatar } from '@render';
import { isSwollen } from './model';
import { summarise } from './report';
import { fix, strs } from './strings';

/** The edition's language, as set on <html> at boot (practice() has no locale parameter; English when unset). */
const editionLocale = (): Locale => (typeof document !== 'undefined' && document.documentElement.lang === 'he' ? 'he' : 'en');

export type PictureKey =
  | 'healthy' | 'glaucoma' | 'dr' | 'pdr' | 'htn' | 'papilloedema' | 'dry-amd' | 'wet-amd' | 'crao' | 'brao' | 'crvo'
  | 'rd' | 'atrophy' | 'myopic' | 'pvd' | 'vh' | 'cataract' | 'macular-hole' | 'nevus';

interface Picture {
  key: PictureKey;
  name: string;
  /** what gives it away, and what to do */
  teach: string;
  /** the answers people confuse it with */
  confuse: PictureKey[];
}

export const PICTURES: Record<PictureKey, Picture> = {
  'healthy': { key: 'healthy', name: 'Healthy fundus', teach: 'Pink disc with a small central cup (C/D about 0.3), sharp margins, artery:vein 2:3, a bright foveal reflex and a flat attached periphery. Normal is the hardest picture to call confidently: know it well.', confuse: ['cataract', 'myopic', 'glaucoma'] },
  'glaucoma': { key: 'glaucoma', name: 'Glaucomatous cupping', teach: 'A large vertical cup (0.7 or more) with a rim that breaks the ISNT rule — usually inferior or superior thinning — and perhaps a splinter disc haemorrhage. Check IOP, fields and OCT; an asymmetry of 0.2 or more between eyes is suspicious.', confuse: ['atrophy', 'healthy', 'papilloedema'] },
  'dr': { key: 'dr', name: 'Diabetic retinopathy (non-proliferative)', teach: 'Microaneurysms and dot-blot haemorrhages scattered in the posterior pole, with hard exudate and sometimes cotton-wool spots. Venous beading or IRMA signals severe disease (the 4-2-1 rule). Look hard at the macula for oedema.', confuse: ['htn', 'pdr', 'crvo'] },
  'pdr': { key: 'pdr', name: 'Proliferative diabetic retinopathy', teach: 'New vessels on the disc or elsewhere, with pre-retinal or vitreous haemorrhage. This is sight-threatening: same-week retina referral for laser or anti-VEGF.', confuse: ['dr', 'vh', 'crvo'] },
  'htn': { key: 'htn', name: 'Hypertensive retinopathy', teach: 'Narrowed arterioles with copper wiring and AV nicking; flame haemorrhages, cotton-wool spots and exudate at higher grades, and disc swelling in malignant hypertension. Check blood pressure today.', confuse: ['dr', 'papilloedema', 'crvo'] },
  'papilloedema': { key: 'papilloedema', name: 'Papilloedema', teach: 'Bilateral swollen, hyperaemic discs with blurred margins, a filled-in cup, dilated veins and peripapillary flames. Raised intracranial pressure until proven otherwise: same-day neuro-imaging.', confuse: ['htn', 'crvo', 'glaucoma'] },
  'dry-amd': { key: 'dry-amd', name: 'Dry AMD (drusen)', teach: 'Yellow-white drusen at the macula with pigment change and, when advanced, geographic atrophy. Amsler grid at home; AREDS supplements for intermediate disease; watch for conversion to wet.', confuse: ['wet-amd', 'macular-hole', 'nevus'] },
  'wet-amd': { key: 'wet-amd', name: 'Wet AMD (neovascular)', teach: 'Sub-retinal blood or fluid and exudate at the macula on a background of drusen. Urgent retina referral for anti-VEGF: the sooner treated, the more vision is kept.', confuse: ['dry-amd', 'macular-hole', 'dr'] },
  'crao': { key: 'crao', name: 'Central retinal artery occlusion', teach: 'Milky white posterior pole with a cherry-red fovea and thread-thin, boxcar arterioles. An ocular stroke: emergency referral and a stroke work-up.', confuse: ['brao', 'rd', 'crvo'] },
  'brao': { key: 'brao', name: 'Branch retinal artery occlusion (embolic)', teach: 'A bright plaque at an arteriolar bifurcation with sectoral retinal whitening. Look for the embolic source — carotids and heart — the same day.', confuse: ['crao', 'rd', 'dr'] },
  'crvo': { key: 'crvo', name: 'Central retinal vein occlusion', teach: '“Blood and thunder”: dilated tortuous veins with haemorrhages in all four quadrants, cotton-wool spots and disc swelling. Look for hypertension, diabetes and glaucoma; watch for neovascular complications.', confuse: ['dr', 'htn', 'papilloedema'] },
  'rd': { key: 'rd', name: 'Retinal detachment', teach: 'Grey, billowing retina with folds and often a horseshoe tear; pigment dust in the vitreous (Shafer’s sign) is a clue. Macula-on detachments are an emergency: the macula-off outcome depends on speed.', confuse: ['brao', 'vh', 'pvd'] },
  'atrophy': { key: 'atrophy', name: 'Optic atrophy', teach: 'A pale disc with a small cup and reduced vessels: the end result of optic nerve damage such as old optic neuritis or compression. Look for an RAPD, red desaturation and field loss.', confuse: ['glaucoma', 'healthy', 'papilloedema'] },
  'myopic': { key: 'myopic', name: 'Myopic fundus with lattice', teach: 'A tigroid background (visible choroid), a tilted disc with a temporal crescent and peripheral lattice. Myopes carry a higher risk of tears and detachment: give detachment warning symptoms.', confuse: ['healthy', 'rd', 'nevus'] },
  'pvd': { key: 'pvd', name: 'Posterior vitreous detachment', teach: 'A translucent ring (Weiss ring) floating in front of the disc after the vitreous peels away. Usually benign, but a new shower of floaters needs a dilated peripheral check for a retinal tear.', confuse: ['vh', 'rd', 'healthy'] },
  'vh': { key: 'vh', name: 'Vitreous haemorrhage', teach: 'A red haze hides fundus detail and the red reflex is poor. Common causes are proliferative diabetic retinopathy, retinal tears and vein occlusion: B-scan if the view is lost.', confuse: ['pdr', 'rd', 'cataract'] },
  'cataract': { key: 'cataract', name: 'Cataract (hazy media)', teach: 'The red reflex is dull and the fundus view is hazy even though the retina behind is healthy. Dilate, change the dial, and do not blame the retina for a lens problem.', confuse: ['vh', 'healthy', 'myopic'] },
  'macular-hole': { key: 'macular-hole', name: 'Macular hole / epiretinal membrane', teach: 'A round punched-out defect at the fovea, or a cellophane sheen with striae. Distortion and reduced central vision; OCT confirms and surgery can restore function.', confuse: ['wet-amd', 'dry-amd', 'dr'] },
  'nevus': { key: 'nevus', name: 'Choroidal naevus', teach: 'A flat, slate-grey, well-defined lesion under the retina. Document size and colour; thickness above 2 mm, orange pigment, fluid or growth point to melanoma — photograph and monitor.', confuse: ['myopic', 'dry-amd', 'healthy'] },
};

/** A picture's name and teaching line in the edition's language. */
export function pictureText(key: PictureKey, locale: Locale = 'en'): { name: string; teach: string } {
  return strs(locale).pictures[key];
}

/** Pick the named picture the findings best match. */
export function classify(f: PatientFindings): PictureKey {
  const posts = EYES.map((e) => f.posterior[e]);
  const any = (fn: (p: (typeof posts)[number]) => boolean) => posts.some(fn);
  const has = (t: string) => any((p) => p.lesions.some((l) => l.type === t));
  if (any((p) => !!p.detachment?.zones.length)) return 'rd';
  if (any((p) => p.vitreous === 'hemorrhage')) return 'vh';
  if (any((p) => !!p.vessels.segmentation) || has('cherry-red-spot')) return 'crao';
  if (has('hollenhorst-plaque')) return 'brao';
  if (any((p) => p.vessels.avNicking || p.vessels.copperWiring)) return 'htn';
  if (EYES.every((e) => isSwollen(f.posterior[e].disc))) return 'papilloedema';
  if (any((p) => p.vessels.venousDilation) && (has('flame-hemorrhage') || has('dot-blot-hemorrhage'))) return 'crvo';
  if (has('neovascularization') || has('preretinal-hemorrhage')) return 'pdr';
  if (has('microaneurysm') || has('dot-blot-hemorrhage') || has('venous-beading')) return 'dr';
  if (has('subretinal-hemorrhage')) return 'wet-amd';
  if (has('macular-hole') || has('epiretinal-membrane')) return 'macular-hole';
  if (has('drusen-large') || has('geographic-atrophy')) return 'dry-amd';
  if (has('nevus')) return 'nevus';
  if (any((p) => p.vitreous === 'weiss-ring')) return 'pvd';
  if (any((p) => p.disc.color === 'pale' || p.disc.color === 'pale-sectoral')) return 'atrophy';
  if (any((p) => p.disc.cdr >= 0.65 || (p.disc.rimThinning ?? 'none') !== 'none')) return 'glaucoma';
  if (has('lattice') || any((p) => p.fundusTone === 'tigroid')) return 'myopic';
  if (EYES.some((e) => f.redReflex[e] === 'dull' || f.redReflex[e] === 'asymmetric')) return 'cataract';
  return 'healthy';
}

// ───────────────────────── generators

type Patch = DeepPartial<PatientFindings>;
const f2 = (rng: Rng, a: number, b: number) => Math.round(rng.float(a, b) * 20) / 20;

interface Arch {
  key: PictureKey;
  age: [number, number];
  weight: (d: number) => number;
  build: (rng: Rng, d: number, eye: Eye) => Patch;
}

const both = (p: object) => ({ OD: p, OS: p });
const post = (eye: Eye, p: object, fellow?: object) => ({ posterior: { [eye]: p, ...(fellow ? { [otherEye(eye)]: fellow } : {}) } }) as unknown as Patch;

const ARCHES: Arch[] = [
  { key: 'healthy', age: [18, 70], weight: (d) => 0.5 * (1 - d) + 0.1, build: (rng) => ({ posterior: { OD: { disc: { cdr: f2(rng, 0.15, 0.5) } }, OS: { disc: { cdr: f2(rng, 0.15, 0.5) } } } }) as unknown as Patch },
  {
    key: 'glaucoma', age: [52, 84], weight: () => 0.5,
    build: (rng, d, eye) => {
      const inf = rng.chance(0.7);
      const lesions = rng.chance(0.35 + 0.2 * d) ? [{ type: 'disc-hemorrhage', zone: 'disc', density: 1 }] : [];
      return {
        ...post(eye, { disc: { cdr: f2(rng, 0.75, 0.9), rimThinning: inf ? 'inferior' : 'superior' }, lesions }, { disc: { cdr: f2(rng, 0.4, 0.6) } }),
        iop: { [eye]: rng.int(25, 34) },
        fields: { [eye]: inf ? 'superior-arcuate' : 'inferior-arcuate' },
      } as unknown as Patch;
    },
  },
  {
    key: 'dr', age: [38, 72], weight: () => 0.55,
    build: (rng, d, eye) => {
      const lesions = [
        { type: 'microaneurysm', zone: 'diffuse', density: 2 + Math.round(2 * d) },
        { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 2 + Math.round(2 * d) },
        { type: 'hard-exudate', zone: rng.pick(['macula', 'inferotemporal', 'superotemporal'] as const), density: 2 },
        ...(d > 0.35 ? [{ type: 'cotton-wool-spot', zone: 'superotemporal', density: 2 }] : []),
        ...(d > 0.65 ? [{ type: 'venous-beading', zone: 'inferotemporal', density: 2 }, { type: 'irma', zone: 'superotemporal', density: 2 }] : []),
      ];
      return { ...post(eye, { lesions }, rng.chance(0.5) ? { lesions: lesions.slice(0, 2).map((l) => ({ ...l, density: 1 })) } : undefined), va: { [eye]: { uncorrected: 0.2, bestCorrected: 0.2 } } } as unknown as Patch;
    },
  },
  {
    key: 'pdr', age: [30, 66], weight: (d) => 0.1 + 0.4 * d,
    build: (rng, _d, eye) => {
      const nvd = rng.chance(0.5);
      const lesions = [
        { type: 'neovascularization', zone: nvd ? 'disc' : 'superotemporal', density: 3 },
        { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 3 },
        { type: 'microaneurysm', zone: 'diffuse', density: 3 },
        { type: 'preretinal-hemorrhage', zone: 'inferotemporal', density: 2 },
        ...(rng.chance(0.5) ? [{ type: 'laser-scars', zone: 'diffuse', density: 3 }] : []),
      ];
      return post(eye, { lesions });
    },
  },
  {
    key: 'htn', age: [45, 78], weight: () => 0.4,
    build: (rng, d) => {
      const g4 = rng.chance(0.25 + 0.35 * d);
      const p = {
        vessels: { avRatio: f2(rng, 0.35, 0.5), avNicking: true, copperWiring: rng.chance(0.7), tortuosity: 'normal', venousDilation: false },
        ...(g4 ? { disc: { margins: 'blurred', edema: true, color: 'hyperemic' } } : {}),
        lesions: [
          { type: 'flame-hemorrhage', zone: 'diffuse', density: 2 },
          { type: 'cotton-wool-spot', zone: 'diffuse', density: 2 },
          ...(g4 ? [{ type: 'hard-exudate', zone: 'macula', density: 3 }] : [{ type: 'hard-exudate', zone: 'superotemporal', density: 1 }]),
        ],
      };
      return { posterior: both(p) } as unknown as Patch;
    },
  },
  {
    key: 'papilloedema', age: [14, 48], weight: (d) => 0.2 + 0.2 * d,
    build: () => ({ posterior: both({
      disc: { margins: 'elevated', edema: true, color: 'hyperemic', svp: false, cdr: 0.1 },
      vessels: { venousDilation: true, tortuosity: 'increased' },
      lesions: [{ type: 'flame-hemorrhage', zone: 'disc', density: 2 }, { type: 'cotton-wool-spot', zone: 'disc', density: 1 }],
    }) }) as unknown as Patch,
  },
  {
    key: 'dry-amd', age: [66, 90], weight: () => 0.4,
    build: (_rng, d) => ({ posterior: both({
      lesions: [
        { type: 'drusen-large', zone: 'macula', density: 3 }, { type: 'drusen-small', zone: 'macula', density: 3 },
        ...(d > 0.4 ? [{ type: 'pigment-clumping', zone: 'macula', density: 1 }] : []),
        ...(d > 0.7 ? [{ type: 'geographic-atrophy', zone: 'macula', density: 2 }] : []),
      ],
    }) }) as unknown as Patch,
  },
  {
    key: 'wet-amd', age: [68, 90], weight: (d) => 0.15 + 0.25 * d,
    build: (_rng, _d, eye) => post(
      eye,
      { lesions: [{ type: 'subretinal-hemorrhage', zone: 'macula', density: 2 }, { type: 'drusen-large', zone: 'macula', density: 2 }, { type: 'macular-edema', zone: 'macula', density: 2 }] },
      { lesions: [{ type: 'drusen-large', zone: 'macula', density: 2 }] },
    ),
  },
  {
    key: 'crao', age: [55, 85], weight: (d) => 0.05 + 0.3 * d,
    build: (_rng, _d, eye) => post(eye, {
      vessels: { avRatio: 0.35, segmentation: true },
      lesions: [{ type: 'retinal-whitening', zone: 'diffuse', density: 4 }, { type: 'cherry-red-spot', zone: 'macula', density: 1 }],
    }),
  },
  {
    key: 'brao', age: [55, 85], weight: (d) => 0.05 + 0.3 * d,
    build: (rng, _d, eye) => post(eye, {
      lesions: [{ type: 'hollenhorst-plaque', zone: rng.pick(['superotemporal', 'inferotemporal'] as const), density: 1 }, { type: 'retinal-whitening', zone: 'superotemporal', density: 2 }],
    }),
  },
  {
    key: 'crvo', age: [50, 82], weight: (d) => 0.1 + 0.3 * d,
    build: (_rng, _d, eye) => post(eye, {
      disc: { margins: 'blurred' },
      vessels: { venousDilation: true, tortuosity: 'increased' },
      lesions: [
        { type: 'flame-hemorrhage', zone: 'diffuse', density: 5 }, { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 4 },
        { type: 'cotton-wool-spot', zone: 'diffuse', density: 3 }, { type: 'macular-edema', zone: 'macula', density: 3 },
      ],
    }),
  },
  {
    key: 'rd', age: [28, 78], weight: (d) => 0.1 + 0.3 * d,
    build: (rng, d, eye) => {
      const zones = rng.pick([['superotemporal', 'superonasal'], ['inferotemporal', 'inferonasal'], ['superotemporal'], ['inferonasal', 'inferotemporal']] as const);
      return post(eye, {
        detachment: { zones: [...zones], maculaOff: rng.chance(0.4 + 0.2 * d) },
        lesions: [{ type: 'retinal-tear', zone: zones[0], density: 1 }],
        vitreous: rng.chance(0.5) ? 'pigment-shafer' : 'clear',
      });
    },
  },
  {
    key: 'atrophy', age: [20, 70], weight: () => 0.25,
    build: (rng, _d, eye) => ({
      ...post(eye, { disc: { color: rng.chance(0.65) ? 'pale' : 'pale-sectoral', cdr: f2(rng, 0.3, 0.5), svp: false } }),
      pupils: { rapd: eye, rapdGrade: 2 },
    }) as unknown as Patch,
  },
  {
    key: 'myopic', age: [18, 55], weight: () => 0.25,
    build: (rng, _d) => ({
      refraction: { OD: { sphere: -7, cylinder: -0.5, axis: 90 }, OS: { sphere: -7.5, cylinder: -0.5, axis: 90 } },
      posterior: both({ fundusTone: 'tigroid', disc: { cdr: f2(rng, 0.3, 0.5) }, lesions: [{ type: 'lattice', zone: 'periphery', density: 2 }] }),
    }) as unknown as Patch,
  },
  { key: 'pvd', age: [50, 78], weight: () => 0.2, build: (_rng, _d, eye) => post(eye, { vitreous: 'weiss-ring', fundusTone: 'light' }) },
  {
    key: 'vh', age: [35, 72], weight: (d) => 0.05 + 0.25 * d,
    build: (_rng, _d, eye) => ({
      ...post(eye, { vitreous: 'hemorrhage', lesions: [{ type: 'neovascularization', zone: 'disc', density: 3 }] }),
      redReflex: { [eye]: 'dull' },
    }) as unknown as Patch,
  },
  {
    key: 'cataract', age: [62, 90], weight: (d) => 0.3 * (1 - d) + 0.05,
    build: (rng, _d, eye) => ({
      redReflex: { [eye]: 'dull', [otherEye(eye)]: rng.chance(0.5) ? 'dull' : 'normal' },
      anterior: { [eye]: { lens: ['cortical-cataract'], lensGrade: 3 } },
    }) as unknown as Patch,
  },
  {
    key: 'macular-hole', age: [58, 82], weight: () => 0.15,
    build: (rng, _d, eye) => post(eye, { lesions: [rng.chance(0.55) ? { type: 'macular-hole', zone: 'macula', density: 3 } : { type: 'epiretinal-membrane', zone: 'macula', density: 3 }] }),
  },
  { key: 'nevus', age: [30, 78], weight: (d) => 0.1 + 0.2 * d, build: (rng, _d, eye) => post(eye, { fundusTone: rng.chance(0.4) ? 'dark' : 'medium', lesions: [{ type: 'nevus', zone: rng.pick(['inferotemporal', 'superotemporal', 'superonasal'] as const), density: 2 }] }) },
];

/** Hebrew practice patients: the same slots as the English lists (so the seeded draw is identical), written for Israel. */
const NAMES_F_HE = ['רבקה אזולאי', 'תמר שפירא', 'נסרין חוריה', 'אלנה קוגן', 'רוזה מזרחי', 'שירה בן־עמי', 'אמל חלבי', 'לינוי אביטן', 'ג׳ולייט סלומון', 'פאטמה דאהר'];
const NAMES_M_HE = ['יעקב לביא', 'אריק גולדשטיין', 'סלים זועבי', 'רביד כהן', 'אבנר הרשקוביץ', 'יובל פרידמן', 'עומר אבו־עטא', 'אלי דהן', 'ויקטור בלוך', 'מוסא נאצר'];
/** [feminine, masculine] */
const JOBS_HE: [string, string][] = [
  ['מורה בגמלאות', 'מורה בגמלאות'], ['שענית', 'שען'], ['רואת חשבון', 'רואה חשבון'], ['מוכרת פרחים', 'מוכר פרחים'], ['טייסת', 'טייס'],
  ['מתרגמת', 'מתרגם'], ['אדריכלית', 'אדריכל'], ['אופה', 'אופה'], ['כנרת', 'כנר'], ['חקלאית', 'חקלאי'],
];

const FIRST_F = ['Margot', 'Ines', 'Priya', 'Hannah', 'Rosa', 'Yuki', 'Amara', 'Lena', 'Odile', 'Farah'];
const FIRST_M = ['Arthur', 'Tomas', 'Kofi', 'Ravi', 'Henrik', 'Mateo', 'Jun', 'Elias', 'Omar', 'Felix'];
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Haddad', 'Tanaka', 'Reyes', 'Novak', 'Brennan', 'Sato', 'Varga', 'Whitcombe', 'Achebe'];
const JOBS = ['retired teacher', 'watchmaker', 'accountant', 'florist', 'pilot', 'translator', 'architect', 'baker', 'violinist', 'gardener'];

function pickWeighted(rng: Rng, d: number): Arch {
  const total = ARCHES.reduce((s, a) => s + a.weight(d), 0);
  let x = rng.next() * total;
  for (const a of ARCHES) {
    x -= a.weight(d);
    if (x <= 0) return a;
  }
  return ARCHES[ARCHES.length - 1]!;
}

export function practiceScenario(rng: Rng, difficulty: number): PracticeScenario {
  const locale = editionLocale();
  const d = Math.max(0, Math.min(1, Number.isFinite(difficulty) ? difficulty : 0.5));
  const arch = pickWeighted(rng, d);
  const age = rng.int(arch.age[0], arch.age[1]);
  const sex = rng.chance(0.5) ? 'F' : 'M';
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const findings = buildFindings(age, arch.build(rng, d, eye));
  const he = locale === 'he';
  // The same draws happen in both editions, so a seed gives the same clinical picture either way.
  const first = rng.pick(sex === 'F' ? (he ? NAMES_F_HE : FIRST_F) : (he ? NAMES_M_HE : FIRST_M));
  const last = rng.pick(LAST);
  const job = he ? rng.pick(JOBS_HE)[sex === 'F' ? 0 : 1] : rng.pick(JOBS);
  const patient: PatientProfile = {
    name: he ? first : `${first} ${last}`,
    age, sex,
    occupation: job,
    avatar: generateAvatar(rng, { age, sex }),
  };
  const key = classify(findings);
  const pic = pictureText(key, locale);
  const chart = EYES.map((e) => `${e}: ${summarise(findings, e, locale)}`).join(' · ');
  return { patient, findings, answer: fix(locale, `${pic.name}. ${chart}. ${pic.teach}`) };
}

// ───────────────────────── recognition challenge

export interface ChallengeOption {
  id: string;
  label: string;
  correct: boolean;
}

export interface Challenge {
  question: string;
  options: ChallengeOption[];
  explanation: string;
  key: PictureKey;
}

export function buildChallenge(findings: PatientFindings, rng: Rng, locale: Locale = 'en'): Challenge {
  const key = classify(findings);
  const pic = pictureText(key, locale);
  const names = new Set<PictureKey>([key]);
  for (const k of rng.shuffle(PICTURES[key].confuse)) if (names.size < 4) names.add(k);
  for (const k of rng.shuffle(Object.keys(PICTURES) as PictureKey[])) if (names.size < 4) names.add(k);
  const options = rng.shuffle([...names]).map((k, i) => ({ id: `opt${i}`, label: fix(locale, pictureText(k, locale).name), correct: k === key }));
  return {
    key,
    question: strs(locale).quizQuestion,
    options,
    explanation: fix(locale, `${pic.name}. ${pic.teach}`),
  };
}
