/**
 * Chart lines for the slit-lamp and fluorescein tests. Pure.
 *
 * Norms used for flags: Van Herick grade ≥ 3 open (grade 2 = narrow, grade 1 =
 * closure possible → critical); SUN cells ≥ 0.5+ or flare ≥ 1+ = active
 * inflammation (≥ 3+ cells, hypopyon, hyphaema = critical); TBUT < 10 s = reduced.
 */
import { EYES, isolateLtrRuns, type AnteriorSegment, type Eye, type Locale, type PatientFindings, type RevealedFinding, type StainPattern } from '@core';
import { STAIN_HE } from './he';
import { slT } from './strings';
import { gradeLabel, signLabel, conjPath, corneaPath, irisPath, lensPath, lidPath } from './vocab';

export type Flag = RevealedFinding['flag'];

const join = (xs: string[], none: string) => (xs.length ? xs.join(', ') : none);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const nice = (p: string | undefined, locale: Locale) => (p ? signLabel(p, locale) : undefined);

const CRITICAL_CORNEA = new Set(['ulcer', 'infiltrate', 'dendrite']);

export function lidSummary(a: AnteriorSegment, locale: Locale = 'en'): { text: string; flag: Flag } {
  const xs = a.lids.filter((l) => l !== 'normal').map((l) => nice(lidPath(l), locale)).filter(Boolean) as string[];
  return { text: join(xs, slT(locale).rep.normal), flag: xs.length ? 'abnormal' : 'normal' };
}
export function conjSummary(a: AnteriorSegment, locale: Locale = 'en'): { text: string; flag: Flag } {
  const xs = a.conjunctiva.filter((c) => c !== 'normal' && c !== 'preauricular-node').map((c) => nice(conjPath(c), locale)).filter(Boolean) as string[];
  return { text: join(xs, slT(locale).rep.whiteQuiet), flag: xs.length ? 'abnormal' : 'normal' };
}
export function corneaSummary(a: AnteriorSegment, locale: Locale = 'en'): { text: string; flag: Flag } {
  const keep = a.cornea.filter((c) => c !== 'clear' && c !== 'reduced-tbut');
  const xs = keep.map((c) => nice(corneaPath(c), locale)).filter(Boolean) as string[];
  const crit = keep.some((c) => CRITICAL_CORNEA.has(c));
  return { text: join(xs, slT(locale).rep.clear), flag: crit ? 'critical' : xs.length ? 'abnormal' : 'normal' };
}
export function irisSummary(a: AnteriorSegment, locale: Locale = 'en'): { text: string; flag: Flag } {
  const xs = a.iris.filter((i) => i !== 'normal').map((i) => nice(irisPath(i), locale)).filter(Boolean) as string[];
  return { text: join(xs, slT(locale).rep.normalFlat), flag: xs.length ? 'abnormal' : 'normal' };
}
export function lensSummary(a: AnteriorSegment, locale: Locale = 'en'): { text: string; flag: Flag } {
  const t = slT(locale).rep;
  const keep = a.lens.filter((l) => l !== 'clear');
  if (!keep.length) return { text: t.clear, flag: 'normal' };
  const gr = Math.round(a.lensGrade ?? 1);
  const parts = keep.map((l) => {
    const label = nice(lensPath(l), locale) ?? l;
    if (l === 'nuclear-sclerosis' || l === 'cortical-cataract' || l === 'posterior-subcapsular') return `${label} ${t.gr(gr)}`;
    return l === 'iol' ? t.pseudophakia : label;
  });
  const benign = keep.every((l) => l === 'iol' || (l === 'nuclear-sclerosis' && gr <= 1));
  return { text: parts.join(', '), flag: benign ? 'normal' : 'abnormal' };
}
export const SUN_CELLS = (c: number) => (c === 0 ? '0' : c === 0.5 ? '0.5+' : `${c}+`);

export function acActivity(a: AnteriorSegment, locale: Locale = 'en'): { text: string; flag: Flag } {
  const t = slT(locale).rep;
  const ac = a.anteriorChamber;
  const extra = [ac.hypopyon ? t.hypopyon : '', ac.hyphema ? t.hyphaema : ''].filter(Boolean);
  const active = ac.cells > 0 || ac.flare > 0;
  const base = active ? t.acActive(SUN_CELLS(ac.cells), ac.flare) : t.deepQuiet;
  const critical = ac.cells >= 3 || ac.hypopyon || ac.hyphema;
  return { text: [base, ...extra].join(', '), flag: critical ? 'critical' : active ? 'abnormal' : 'normal' };
}
export function vanHerickSummary(a: AnteriorSegment, locale: Locale = 'en'): { text: string; flag: Flag } {
  const t = slT(locale).rep;
  const ac = a.anteriorChamber;
  const desc = t.vhDesc[ac.vanHerick] ?? '';
  const shallow = ac.depth === 'shallow' || ac.depth === 'flat';
  const flag: Flag = ac.vanHerick === 1 || ac.depth === 'flat' ? 'critical' : ac.vanHerick === 2 || shallow ? 'abnormal' : 'normal';
  const depth = shallow ? (locale === 'he' ? (ac.depth === 'flat' ? 'שטוחה' : 'רדודה') : ac.depth) : null;
  return { text: t.vhLine(ac.vanHerick, desc, depth), flag };
}

/** The chart lines for the slit lamp, in the edition's language (`report` keeps the English edition). */
export function reportFor(findings: PatientFindings, locale: Locale = 'en'): RevealedFinding[] {
  const t = slT(locale).rep;
  const fix = (v: string) => (locale === 'he' ? isolateLtrRuns(v) : v);
  const out: RevealedFinding[] = [];
  for (const eye of EYES) {
    const a = findings.anterior?.[eye];
    if (!a) continue;
    const add = (label: string, r: { text: string; flag: Flag }) => out.push({ label, value: fix(r.text), eye, flag: r.flag });
    add(t.lids, lidSummary(a, locale));
    add(t.conj, conjSummary(a, locale));
    add(t.cornea, corneaSummary(a, locale));
    add(t.ac, acActivity(a, locale));
    add(t.vh, vanHerickSummary(a, locale));
    add(t.iris, irisSummary(a, locale));
    add(t.lens, lensSummary(a, locale));
  }
  return out;
}
export const report = (findings: PatientFindings): RevealedFinding[] => reportFor(findings, 'en');

// ───────────────────────── fluorescein

export const STAIN_LABEL: Record<StainPattern, string> = {
  none: 'No staining',
  'inferior-punctate': 'Inferior punctate staining',
  'diffuse-punctate': 'Diffuse punctate staining',
  'linear-abrasion': 'Epithelial defect (abrasion)',
  dendritic: 'Dendritic ulcer with end bulbs',
  'round-ulcer': 'Round ulcer, dense stain',
  'vertical-linear-scratches': 'Vertical linear scratches',
  interpalpebral: 'Interpalpebral staining',
  focal: 'Focal stain around a foreign body',
};

/** Short names for pickers. */
export const STAIN_SHORT: Record<StainPattern, string> = {
  none: 'None', 'inferior-punctate': 'Inferior punctate', 'diffuse-punctate': 'Diffuse punctate',
  'linear-abrasion': 'Abrasion', dendritic: 'Dendrite', 'round-ulcer': 'Round ulcer',
  'vertical-linear-scratches': 'Vertical scratches', interpalpebral: 'Interpalpebral', focal: 'Focal (foreign body)',
};

/** Compact names for the picker cards. */
export const STAIN_CARD: Record<StainPattern, string> = {
  none: 'None', 'inferior-punctate': 'Inferior', 'diffuse-punctate': 'Diffuse', interpalpebral: 'Band',
  'linear-abrasion': 'Abrasion', dendritic: 'Dendrite', 'round-ulcer': 'Ulcer', 'vertical-linear-scratches': 'Scratches', focal: 'Focal',
};

export const STAIN_MEANING: Record<StainPattern, string> = {
  none: 'An intact epithelium takes up no dye — the surface is healthy.',
  'inferior-punctate': 'Fine dots in the lower third: dry eye, exposure (lagophthalmos), blepharitis or drop toxicity.',
  'diffuse-punctate': 'Scattered dots over the whole cornea: viral (adenoviral) keratoconjunctivitis, toxic keratopathy.',
  'linear-abrasion': 'A sharp-edged patch of bare epithelium: corneal abrasion — ask about trauma, then check under the lid.',
  dendritic: 'Branching ulcer with terminal bulbs: herpes simplex keratitis. Treat with antivirals; never steroid alone.',
  'round-ulcer': 'A round, dense stromal ulcer that stains: microbial keratitis — scrape, culture, intensive drops, same-day care.',
  'vertical-linear-scratches': 'Parallel vertical lines on the upper cornea: a foreign body trapped under the upper lid. Evert the lid.',
  interpalpebral: 'A band across the exposed cornea: dry eye, exposure, contact-lens wear.',
  focal: 'A small round stain around a speck: embedded foreign body (look for a rust ring).',
};

export const STAIN_FLAG: Record<StainPattern, Flag> = {
  none: 'normal', 'inferior-punctate': 'abnormal', 'diffuse-punctate': 'abnormal', 'linear-abrasion': 'abnormal',
  dendritic: 'critical', 'round-ulcer': 'critical', 'vertical-linear-scratches': 'abnormal', interpalpebral: 'abnormal', focal: 'abnormal',
};

export const TBUT_NORMAL = 10;
export const tbutOf = (a: AnteriorSegment): number => a.tbutSec ?? 12;

export type StainText = { label: string; short: string; card: string; meaning: string };
/** Names and explanation of a stain pattern in the edition's language. */
export const stainText = (p: StainPattern, locale: Locale = 'en'): StainText =>
  locale === 'he' ? STAIN_HE[p] : { label: STAIN_LABEL[p], short: STAIN_SHORT[p], card: STAIN_CARD[p], meaning: STAIN_MEANING[p] };

export function fluoReportFor(findings: PatientFindings, locale: Locale = 'en'): RevealedFinding[] {
  const t = slT(locale).rep;
  const out: RevealedFinding[] = [];
  for (const eye of EYES) {
    const a = findings.anterior?.[eye];
    if (!a) continue;
    out.push({ label: t.fluorescein, value: stainText(a.fluorescein, locale).label, eye, flag: STAIN_FLAG[a.fluorescein] });
    const s = tbutOf(a);
    const v = t.tbutValue(Math.round(s * 10) / 10, s < TBUT_NORMAL);
    out.push({ label: t.tbut, value: locale === 'he' ? isolateLtrRuns(v) : v, eye, flag: s < TBUT_NORMAL ? 'abnormal' : 'normal' });
  }
  return out;
}
export const fluoReport = (findings: PatientFindings): RevealedFinding[] => fluoReportFor(findings, 'en');

export const eyeName = (e: Eye) => (e === 'OD' ? 'right' : 'left');
export { gradeLabel, lowerFirst };
