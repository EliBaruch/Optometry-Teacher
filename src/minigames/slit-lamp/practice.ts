/**
 * Practice scenarios (clinically coherent anterior segments) and the
 * end-of-practice recognition challenge for the slit lamp. Pure.
 */
import {
  buildFindings, EYES, isolateLtrRuns, type AnteriorSegment, type DeepPartial, type Eye, type Locale, type PatientFindings, type PracticeScenario, type Rng,
} from '@core';
import { makePatient } from './people';
import { docLocale, slT } from './strings';
import { KIND_INFO, kindInfo, type Kind } from './teach';
import { conjPath, corneaPath, describeSign, irisPath, lensPath, lidPath, signLabel } from './vocab';

export interface Question {
  prompt: string;
  options: string[];
  correct: number;
  explain: string;
}

type Patch = DeepPartial<PatientFindings>;
const other = (e: Eye): Eye => (e === 'OD' ? 'OS' : 'OD');
const both = (v: DeepPartial<AnteriorSegment>) => ({ OD: v, OS: v });

interface Gen { kind: Kind; age: number; patch: Patch }

function gen(kind: Kind, rng: Rng, d: number): Gen {
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const mild = d < 0.4;
  switch (kind) {
    case 'normal': {
      const age = rng.int(18, 55);
      return { kind, age, patch: {} };
    }
    case 'uveitis': {
      const cells = rng.pick(mild ? [2, 3] : [0.5, 1, 1, 2, 3]) as 0.5 | 1 | 2 | 3;
      const flare = Math.min(3, Math.max(0, Math.round(cells))) as 0 | 1 | 2 | 3;
      return {
        kind, age: rng.int(22, 55),
        patch: {
          anterior: { [eye]: {
            conjunctiva: ['ciliary-flush'],
            cornea: cells >= 1 ? ['keratic-precipitates'] : ['clear'],
            iris: cells >= 2 && rng.chance(0.5) ? ['posterior-synechiae'] : ['normal'],
            anteriorChamber: { cells, flare: Math.max(flare, cells >= 1 ? 1 : 0), hypopyon: cells >= 3 && rng.chance(0.3) },
          } },
          pupils: { sizeLightMm: { [eye]: 2.5 }, shape: { [eye]: cells >= 2 ? 'irregular' : 'round' } },
          iop: { [eye]: rng.int(8, 13) },
        },
      };
    }
    case 'angle-closure':
      return {
        kind, age: rng.int(55, 78),
        patch: {
          anterior: { [eye]: {
            conjunctiva: ['ciliary-flush'], cornea: ['edema'],
            anteriorChamber: { depth: 'shallow', vanHerick: 1, cells: 0.5, flare: 1 },
          }, [other(eye)]: { anteriorChamber: { depth: 'shallow', vanHerick: rng.pick([1, 2]) } } },
          pupils: { sizeLightMm: { [eye]: 5.5 }, sizeDarkMm: { [eye]: 6 }, reactivity: { [eye]: 'fixed' }, shape: { [eye]: 'mid-dilated' } },
          iop: { [eye]: rng.int(42, 60) },
        },
      };
    case 'narrow-angle': {
      const age = rng.int(55, 80);
      const vh = 2 as const;
      return { kind, age, patch: { anterior: both({ anteriorChamber: { vanHerick: vh, depth: 'shallow' }, lens: age > 60 ? ['nuclear-sclerosis'] : ['clear'] }) } };
    }
    case 'cataract': {
      const age = rng.int(52, 88);
      const type = rng.pick(['nuclear-sclerosis', 'nuclear-sclerosis', 'cortical-cataract', 'posterior-subcapsular'] as const);
      const grade = rng.int(2, 4);
      const eyes: Eye[] = rng.chance(0.6) ? ['OD', 'OS'] : [eye];
      const anterior: Record<string, DeepPartial<AnteriorSegment>> = {};
      for (const e of eyes) anterior[e] = { lens: [type], lensGrade: type === 'posterior-subcapsular' ? Math.min(grade, 3) : grade };
      return { kind, age: type === 'posterior-subcapsular' ? rng.int(40, 72) : age, patch: { anterior } };
    }
    case 'bacterial':
      return { kind, age: rng.int(5, 45), patch: { anterior: { [eye]: { conjunctiva: ['diffuse-injection', 'papillae', 'discharge-mucopurulent'] } }, external: { redEye: [eye] } } };
    case 'viral': {
      const eyes: Eye[] = rng.chance(0.5) ? ['OD', 'OS'] : [eye];
      const anterior: Record<string, DeepPartial<AnteriorSegment>> = {};
      for (const e of eyes) anterior[e] = { conjunctiva: ['diffuse-injection', 'follicles', 'discharge-watery', 'preauricular-node'], cornea: d > 0.5 ? ['punctate-keratitis'] : ['clear'] };
      return { kind, age: rng.int(20, 50), patch: { anterior, external: { redEye: eyes, tearing: eyes } } };
    }
    case 'allergic':
      return { kind, age: rng.int(8, 35), patch: { anterior: both({ conjunctiva: ['papillae', 'chemosis', 'discharge-stringy'] }), external: { redEye: ['OD', 'OS'] } } };
    case 'blepharitis':
      return { kind, age: rng.int(30, 75), patch: { anterior: both({ lids: rng.chance(0.5) ? ['anterior-blepharitis'] : ['meibomian-dysfunction'], conjunctiva: ['diffuse-injection'], tbutSec: 5 }) } };
    case 'lid-lump': {
      const lid = rng.pick(['chalazion', 'hordeolum'] as const);
      return { kind, age: rng.int(18, 60), patch: { anterior: { [eye]: { lids: [lid] } } } };
    }
    case 'keratitis':
      return {
        kind, age: rng.int(18, 45),
        patch: {
          anterior: { [eye]: {
            conjunctiva: ['ciliary-flush'], cornea: ['ulcer'], fluorescein: 'round-ulcer',
            anteriorChamber: { cells: rng.pick([1, 2]) as 1 | 2, flare: 1, hypopyon: rng.chance(0.4) },
          } },
          external: { redEye: [eye], photophobia: true },
        },
      };
    case 'dendrite':
      return { kind, age: rng.int(25, 70), patch: { anterior: { [eye]: { conjunctiva: ['diffuse-injection'], cornea: ['dendrite'], fluorescein: 'dendritic', cornealSensation: 'reduced' } }, external: { redEye: [eye] } } };
    case 'trauma': {
      const fb = rng.chance(0.55);
      return {
        kind, age: rng.int(20, 55),
        patch: { anterior: { [eye]: fb
          ? { conjunctiva: ['diffuse-injection'], cornea: ['foreign-body', 'rust-ring'], fluorescein: 'focal' }
          : { conjunctiva: ['diffuse-injection'], cornea: ['abrasion'], fluorescein: 'linear-abrasion' } }, external: { redEye: [eye], tearing: [eye] } },
      };
    }
    case 'degeneration': {
      const sign = rng.pick(['pterygium', 'pinguecula'] as const);
      return { kind, age: rng.int(35, 70), patch: { anterior: { [eye]: { conjunctiva: [sign] } } } };
    }
    case 'sch':
      return { kind, age: rng.int(40, 80), patch: { anterior: { [eye]: { conjunctiva: ['subconjunctival-hemorrhage'] } } } };
    case 'keratoconus': {
      const worse = eye;
      return {
        kind, age: rng.int(16, 34),
        patch: { anterior: { [worse]: { cornea: ['cone-thinning', 'fleischer-ring', 'vogt-striae'] }, [other(worse)]: { cornea: d > 0.5 ? ['fleischer-ring'] : ['clear'] } } },
      };
    }
    case 'hyphema':
      return { kind, age: rng.int(14, 40), patch: { anterior: { [eye]: { conjunctiva: ['diffuse-injection'], anteriorChamber: { hyphema: true, cells: 2, flare: 1 } } }, external: { redEye: [eye] } } };
  }
}

const EASY: Kind[] = ['normal', 'bacterial', 'sch', 'lid-lump', 'degeneration', 'cataract', 'blepharitis', 'allergic'];
const MID: Kind[] = ['uveitis', 'angle-closure', 'viral', 'keratitis', 'trauma', 'dendrite', 'hyphema', 'narrow-angle'];
const HARD: Kind[] = ['keratoconus', 'narrow-angle', 'uveitis', 'cataract', 'viral', 'normal'];

export function pickKind(rng: Rng, difficulty: number): Kind {
  const d = Math.max(0, Math.min(1, difficulty));
  const r = rng.next();
  const pool = r < 0.55 - 0.35 * d ? EASY : r < 0.9 - 0.2 * d ? MID : HARD;
  return rng.pick(pool);
}

export function makeSlitScenario(rng: Rng, difficulty: number): PracticeScenario {
  const kind = pickKind(rng, difficulty);
  const g = gen(kind, rng, difficulty);
  const findings = buildFindings(g.age, g.patch);
  const locale = docLocale();
  const patient = makePatient(rng, g.age, locale);
  const answer = `${kindInfo(kind, locale).label}. ${summaryLines(findings, locale).join(' · ')}`;
  return { patient, findings, answer: locale === 'he' ? isolateLtrRuns(answer) : answer };
}

/** One-line description of each eye's signs for the answer key. */
export function summaryLines(f: PatientFindings, locale: Locale = 'en'): string[] {
  const word = (x: string): string => {
    if (locale !== 'he') return x.replace(/-/g, ' ');
    const path = lidPath(x as never) ?? conjPath(x as never) ?? corneaPath(x as never) ?? irisPath(x as never) ?? lensPath(x as never);
    return path ? signLabel(path, locale) : x.replace(/-/g, ' ');
  };
  return EYES.map((e) => {
    const a = f.anterior[e];
    const bits: string[] = [];
    const push = (xs: string[], skip: string[]) => xs.filter((x) => !skip.includes(x)).forEach((x) => bits.push(word(x)));
    push(a.lids, ['normal']);
    push(a.conjunctiva, ['normal', 'preauricular-node']);
    push(a.cornea, ['clear', 'reduced-tbut']);
    push(a.iris, ['normal']);
    push(a.lens, ['clear']);
    const ac = a.anteriorChamber;
    bits.push(`VH ${ac.vanHerick}`);
    if (ac.cells > 0) bits.push(describeSign('chamber/cells', String(ac.cells), locale));
    if (ac.flare > 0) bits.push(describeSign('chamber/flare', String(ac.flare), locale));
    return `${e}: ${bits.join(', ')}`;
  });
}

// ───────────────────────── classification & challenge

const hasAny = (a: AnteriorSegment, ...xs: string[]) => xs.some((x) => [...a.lids, ...a.conjunctiva, ...a.cornea, ...a.iris, ...a.lens].includes(x as never));

/** Name the presentation from the findings alone. */
export function classify(f: PatientFindings): Kind {
  const A = EYES.map((e) => f.anterior[e]);
  const some = (fn: (a: AnteriorSegment) => boolean) => A.some(fn);
  if (some((a) => hasAny(a, 'dendrite'))) return 'dendrite';
  if (some((a) => hasAny(a, 'ulcer', 'infiltrate'))) return 'keratitis';
  if (some((a) => a.anteriorChamber.vanHerick === 1 && (hasAny(a, 'edema') || a.anteriorChamber.depth !== 'normal'))) return 'angle-closure';
  if (some((a) => !!a.anteriorChamber.hyphema)) return 'hyphema';
  if (some((a) => a.anteriorChamber.cells > 0 || a.anteriorChamber.flare > 0 || hasAny(a, 'keratic-precipitates'))) return 'uveitis';
  if (some((a) => hasAny(a, 'cone-thinning', 'vogt-striae', 'fleischer-ring'))) return 'keratoconus';
  if (some((a) => hasAny(a, 'abrasion', 'foreign-body', 'rust-ring'))) return 'trauma';
  if (some((a) => a.anteriorChamber.vanHerick <= 2)) return 'narrow-angle';
  if (some((a) => hasAny(a, 'cortical-cataract', 'posterior-subcapsular', 'iol') || (hasAny(a, 'nuclear-sclerosis') && (a.lensGrade ?? 0) >= 2))) return 'cataract';
  if (some((a) => hasAny(a, 'discharge-mucopurulent'))) return 'bacterial';
  if (some((a) => hasAny(a, 'follicles', 'discharge-watery'))) return 'viral';
  if (some((a) => hasAny(a, 'chemosis', 'giant-papillae', 'discharge-stringy', 'papillae'))) return 'allergic';
  if (some((a) => hasAny(a, 'chalazion', 'hordeolum'))) return 'lid-lump';
  if (some((a) => hasAny(a, 'anterior-blepharitis', 'meibomian-dysfunction'))) return 'blepharitis';
  if (some((a) => hasAny(a, 'pterygium', 'pinguecula'))) return 'degeneration';
  if (some((a) => hasAny(a, 'subconjunctival-hemorrhage'))) return 'sch';
  return 'normal';
}

const CELL_IDS = [0.5, 1, 2, 3, 4];

export function makeSlitChallenge(f: PatientFindings, rng: Rng, locale: Locale = 'en'): Question[] {
  const t = slT(locale).q;
  const kind = classify(f);
  const truth = kindInfo(kind, locale);
  const pool = (Object.keys(KIND_INFO) as Kind[]).filter((k) => k !== kind);
  const near: Partial<Record<Kind, Kind[]>> = {
    uveitis: ['angle-closure', 'keratitis', 'viral'], 'angle-closure': ['uveitis', 'keratitis', 'narrow-angle'], bacterial: ['viral', 'allergic', 'blepharitis'],
    viral: ['bacterial', 'allergic', 'uveitis'], keratitis: ['dendrite', 'trauma', 'uveitis'], dendrite: ['keratitis', 'trauma', 'viral'], cataract: ['normal', 'keratoconus', 'narrow-angle'],
  };
  const distract = [...(near[kind] ?? []), ...rng.shuffle(pool)].filter((k, i, a) => a.indexOf(k) === i && k !== kind).slice(0, 3);
  const opts = rng.shuffle([kind, ...distract]);
  const q1: Question = {
    prompt: t.describe,
    options: opts.map((k) => kindInfo(k, locale).label),
    correct: opts.indexOf(kind),
    explain: `${truth.label}. ${truth.why}`,
  };
  const qs: Question[] = [q1];

  // a measurement question
  const worstVh = EYES.reduce((w, e) => (f.anterior[e].anteriorChamber.vanHerick < f.anterior[w].anteriorChamber.vanHerick ? e : w), 'OD' as Eye);
  const vh = f.anterior[worstVh].anteriorChamber.vanHerick;
  const cellEye = EYES.find((e) => f.anterior[e].anteriorChamber.cells > 0);
  if (vh <= 2 || (!cellEye && kind === 'normal')) {
    qs.push({
      prompt: t.vhPrompt(worstVh),
      options: t.vhOptions, correct: vh - 1,
      explain: t.vhExplain(vh),
    });
  } else if (cellEye) {
    const c = f.anterior[cellEye].anteriorChamber.cells;
    qs.push({
      prompt: t.cellsPrompt(cellEye),
      options: t.cellsOptions, correct: CELL_IDS.indexOf(c),
      explain: t.cellsExplain(t.cellsOptions[CELL_IDS.indexOf(c)]!),
    });
  } else {
    const lensEye = EYES.find((e) => f.anterior[e].lens.some((l) => l !== 'clear'));
    if (lensEye) {
      const l = f.anterior[lensEye].lens.find((x) => x !== 'clear')!;
      const names = t.lensNames;
      const opts2 = rng.shuffle([names['nuclear-sclerosis']!, names['cortical-cataract']!, names['posterior-subcapsular']!, names.iol!]);
      const right = names[l] ?? names['nuclear-sclerosis']!;
      if (opts2.includes(right)) qs.push({ prompt: t.lensPrompt(lensEye), options: opts2, correct: opts2.indexOf(right), explain: t.lensExplain(right) });
    }
  }
  if (locale === 'he') {
    for (const q of qs) {
      q.prompt = isolateLtrRuns(q.prompt);
      q.options = q.options.map(isolateLtrRuns);
      q.explain = isolateLtrRuns(q.explain);
    }
  }
  return qs;
}
