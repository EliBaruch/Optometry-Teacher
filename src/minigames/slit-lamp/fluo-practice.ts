/** Fluorescein practice scenarios and challenge questions. Pure. */
import {
  buildFindings, EYES, isolateLtrRuns, type AnteriorSegment, type DeepPartial, type Eye, type Locale, type PatientFindings, type PracticeScenario, type Rng, type StainPattern,
} from '@core';
import { STAIN_HE } from './he';
import { makePatient } from './people';
import type { Question } from './practice';
import { STAIN_LABEL, stainText, tbutOf, TBUT_NORMAL } from './report';
import { docLocale, slT } from './strings';

interface Gen { age: number; stain: StainPattern; eye: Eye; patch: DeepPartial<AnteriorSegment>; both?: boolean; tbut: number }

export const FLUO_DX: Record<StainPattern, string> = {
  none: 'Healthy, intact epithelium',
  'inferior-punctate': 'Dry eye / exposure keratopathy',
  'diffuse-punctate': 'Viral keratoconjunctivitis or toxic keratopathy',
  'linear-abrasion': 'Corneal abrasion',
  dendritic: 'Herpes simplex keratitis',
  'round-ulcer': 'Microbial keratitis (corneal ulcer)',
  'vertical-linear-scratches': 'Foreign body under the upper lid',
  interpalpebral: 'Exposure or contact-lens related dry eye',
  focal: 'Embedded corneal foreign body',
};

/** The condition a stain pattern points to, in the edition's language. */
export const fluoDx = (p: StainPattern, locale: Locale = 'en'): string => (locale === 'he' ? STAIN_HE[p].dx : FLUO_DX[p]);

function gen(stain: StainPattern, rng: Rng, d: number): Gen {
  const eye: Eye = rng.chance(0.5) ? 'OD' : 'OS';
  const tb = (lo: number, hi: number) => Math.round(rng.float(lo, hi) * 2) / 2;
  switch (stain) {
    case 'none': return { age: rng.int(18, 60), stain, eye, patch: { fluorescein: 'none' }, both: true, tbut: tb(11, 20) };
    case 'inferior-punctate': return { age: rng.int(35, 80), stain, eye, both: true, tbut: tb(2.5, 6), patch: { cornea: ['punctate-keratitis'], fluorescein: stain, lids: d > 0.4 ? ['meibomian-dysfunction'] : ['normal'] } };
    case 'interpalpebral': return { age: rng.int(30, 75), stain, eye, both: true, tbut: tb(3, 7), patch: { cornea: ['punctate-keratitis'], fluorescein: stain } };
    case 'diffuse-punctate': return { age: rng.int(20, 55), stain, eye, both: true, tbut: tb(7, 12), patch: { cornea: ['punctate-keratitis'], fluorescein: stain, conjunctiva: ['diffuse-injection', 'follicles', 'discharge-watery'] } };
    case 'linear-abrasion': return { age: rng.int(18, 55), stain, eye, tbut: tb(8, 14), patch: { cornea: ['abrasion'], fluorescein: stain, conjunctiva: ['diffuse-injection'] } };
    case 'dendritic': return { age: rng.int(25, 70), stain, eye, tbut: tb(8, 13), patch: { cornea: ['dendrite'], fluorescein: stain, conjunctiva: ['diffuse-injection'], cornealSensation: 'reduced' } };
    case 'round-ulcer': return { age: rng.int(18, 50), stain, eye, tbut: tb(5, 10), patch: { cornea: ['ulcer'], fluorescein: stain, conjunctiva: ['ciliary-flush'], anteriorChamber: { cells: 1, flare: 1 } } };
    case 'vertical-linear-scratches': return { age: rng.int(20, 55), stain, eye, tbut: tb(8, 14), patch: { cornea: ['abrasion'], fluorescein: stain, conjunctiva: ['diffuse-injection'] } };
    case 'focal': return { age: rng.int(22, 50), stain, eye, tbut: tb(9, 15), patch: { cornea: ['foreign-body', 'rust-ring'], fluorescein: stain, conjunctiva: ['diffuse-injection'] } };
  }
}

const EASY: StainPattern[] = ['none', 'linear-abrasion', 'dendritic', 'inferior-punctate', 'focal'];
const HARD: StainPattern[] = ['diffuse-punctate', 'interpalpebral', 'vertical-linear-scratches', 'round-ulcer', 'inferior-punctate'];

export function makeFluoScenario(rng: Rng, difficulty: number): PracticeScenario {
  const stain = rng.pick(rng.chance(0.62 - 0.4 * Math.max(0, Math.min(1, difficulty))) ? EASY : HARD);
  const g = gen(stain, rng, difficulty);
  const anterior: DeepPartial<PatientFindings['anterior']> = {};
  const fellow = (): DeepPartial<AnteriorSegment> => ({ tbutSec: g.tbut + (rng.chance(0.5) ? 0.5 : -0.5) });
  for (const e of EYES) {
    if (g.both) anterior[e] = { ...g.patch, tbutSec: g.tbut + (e === 'OS' ? 0.5 : 0) };
    else anterior[e] = e === g.eye ? { ...g.patch, tbutSec: g.tbut } : fellow();
  }
  const findings = buildFindings(g.age, { anterior });
  const locale = docLocale();
  const t = slT(locale).q;
  const where = g.both ? t.both : g.eye;
  const answer = t.fluoAnswer(stainText(stain, locale).label, where, fluoDx(stain, locale), g.tbut);
  return {
    patient: makePatient(rng, g.age, locale),
    findings,
    answer: locale === 'he' ? isolateLtrRuns(answer) : answer,
  };
}

export function makeFluoChallenge(f: PatientFindings, rng: Rng, locale: Locale = 'en'): Question[] {
  const t = slT(locale).q;
  const fix = (v: string) => (locale === 'he' ? isolateLtrRuns(v) : v);
  const eye = EYES.find((e) => f.anterior[e].fluorescein !== 'none') ?? 'OD';
  const truth = f.anterior[eye].fluorescein;
  const pool = (Object.keys(STAIN_LABEL) as StainPattern[]).filter((p) => p !== truth);
  const near: StainPattern[] = truth === 'dendritic' ? ['round-ulcer', 'linear-abrasion'] : truth === 'inferior-punctate' ? ['diffuse-punctate', 'interpalpebral'] : truth === 'linear-abrasion' ? ['vertical-linear-scratches', 'focal'] : [];
  const dis = [...near, ...rng.shuffle(pool)].filter((p, i, a) => a.indexOf(p) === i && p !== truth).slice(0, 3);
  const opts = rng.shuffle([truth, ...dis]);
  const q1: Question = {
    prompt: truth === 'none' ? t.stainNone : t.stainPrompt(eye),
    options: opts.map((p) => stainText(p, locale).label),
    correct: opts.indexOf(truth),
    explain: `${stainText(truth, locale).label}. ${stainText(truth, locale).meaning}`,
  };
  const dxs = [...new Set(Object.values(FLUO_DX))];
  const right = FLUO_DX[truth];
  const dxOpts = rng.shuffle([right, ...rng.shuffle(dxs.filter((x) => x !== right)).slice(0, 3)]);
  const q2: Question = {
    prompt: t.dxPrompt,
    options: dxOpts.map((x) => (locale === 'he' ? STAIN_HE[(Object.keys(FLUO_DX) as StainPattern[]).find((k) => FLUO_DX[k] === x)!].dx : x)),
    correct: dxOpts.indexOf(right),
    explain: `${fluoDx(truth, locale)}. ${stainText(truth, locale).meaning}`,
  };
  const tb = tbutOf(f.anterior[eye]);
  const q3: Question = {
    prompt: t.tbutPrompt(Math.round(tb)),
    options: t.tbutOptions,
    correct: tb >= TBUT_NORMAL ? 0 : tb < 2 ? 3 : 2,
    explain: tb >= TBUT_NORMAL ? t.tbutNormal : t.tbutLow,
  };
  const qs = truth === 'none' ? [q1, q3] : [q1, q2];
  return qs.map((q) => ({ ...q, prompt: fix(q.prompt), options: q.options.map(fix), explain: fix(q.explain) }));
}

export const shortName = (p: StainPattern, locale: Locale = 'en') => stainText(p, locale).short;
