/**
 * Chart lines for the slit-lamp and fluorescein tests. Pure.
 *
 * Norms used for flags: Van Herick grade ≥ 3 open (grade 2 = narrow, grade 1 =
 * closure possible → critical); SUN cells ≥ 0.5+ or flare ≥ 1+ = active
 * inflammation (≥ 3+ cells, hypopyon, hyphaema = critical); TBUT < 10 s = reduced.
 */
import { EYES, type AnteriorSegment, type Eye, type PatientFindings, type RevealedFinding, type StainPattern } from '@core';
import { gradeLabel, signLabel, conjPath, corneaPath, irisPath, lensPath, lidPath } from './vocab';

export type Flag = RevealedFinding['flag'];

const join = (xs: string[], none: string) => (xs.length ? xs.join(', ') : none);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const nice = (p: string | undefined) => (p ? signLabel(p) : undefined);

const CRITICAL_CORNEA = new Set(['ulcer', 'infiltrate', 'dendrite']);

export function lidSummary(a: AnteriorSegment): { text: string; flag: Flag } {
  const xs = a.lids.filter((l) => l !== 'normal').map((l) => nice(lidPath(l))).filter(Boolean) as string[];
  return { text: join(xs, 'Normal'), flag: xs.length ? 'abnormal' : 'normal' };
}
export function conjSummary(a: AnteriorSegment): { text: string; flag: Flag } {
  const xs = a.conjunctiva.filter((c) => c !== 'normal' && c !== 'preauricular-node').map((c) => nice(conjPath(c))).filter(Boolean) as string[];
  return { text: join(xs, 'White and quiet'), flag: xs.length ? 'abnormal' : 'normal' };
}
export function corneaSummary(a: AnteriorSegment): { text: string; flag: Flag } {
  const keep = a.cornea.filter((c) => c !== 'clear' && c !== 'reduced-tbut');
  const xs = keep.map((c) => nice(corneaPath(c))).filter(Boolean) as string[];
  const crit = keep.some((c) => CRITICAL_CORNEA.has(c));
  return { text: join(xs, 'Clear'), flag: crit ? 'critical' : xs.length ? 'abnormal' : 'normal' };
}
export function irisSummary(a: AnteriorSegment): { text: string; flag: Flag } {
  const xs = a.iris.filter((i) => i !== 'normal').map((i) => nice(irisPath(i))).filter(Boolean) as string[];
  return { text: join(xs, 'Normal, flat'), flag: xs.length ? 'abnormal' : 'normal' };
}
export function lensSummary(a: AnteriorSegment): { text: string; flag: Flag } {
  const keep = a.lens.filter((l) => l !== 'clear');
  if (!keep.length) return { text: 'Clear', flag: 'normal' };
  const gr = Math.round(a.lensGrade ?? 1);
  const parts = keep.map((l) => {
    const label = nice(lensPath(l)) ?? l;
    if (l === 'nuclear-sclerosis' || l === 'cortical-cataract' || l === 'posterior-subcapsular') return `${label} gr ${gr}`;
    return l === 'iol' ? 'Pseudophakia (IOL)' : label;
  });
  const benign = keep.every((l) => l === 'iol' || (l === 'nuclear-sclerosis' && gr <= 1));
  return { text: parts.join(', '), flag: benign ? 'normal' : 'abnormal' };
}
export const SUN_CELLS = (c: number) => (c === 0 ? '0' : c === 0.5 ? '0.5+' : `${c}+`);

export function acActivity(a: AnteriorSegment): { text: string; flag: Flag } {
  const ac = a.anteriorChamber;
  const extra = [ac.hypopyon ? 'hypopyon' : '', ac.hyphema ? 'hyphaema' : ''].filter(Boolean);
  const active = ac.cells > 0 || ac.flare > 0;
  const base = active ? `Cells ${SUN_CELLS(ac.cells)}, flare ${ac.flare}+` : 'Deep and quiet';
  const critical = ac.cells >= 3 || ac.hypopyon || ac.hyphema;
  return { text: [base, ...extra].join(', '), flag: critical ? 'critical' : active ? 'abnormal' : 'normal' };
}
export function vanHerickSummary(a: AnteriorSegment): { text: string; flag: Flag } {
  const ac = a.anteriorChamber;
  const desc = ac.vanHerick === 4 ? 'wide open' : ac.vanHerick === 3 ? 'open' : ac.vanHerick === 2 ? 'narrow' : 'closure possible';
  const shallow = ac.depth === 'shallow' || ac.depth === 'flat';
  const flag: Flag = ac.vanHerick === 1 || ac.depth === 'flat' ? 'critical' : ac.vanHerick === 2 || shallow ? 'abnormal' : 'normal';
  return { text: `Grade ${ac.vanHerick} (${desc})${shallow ? `, ${ac.depth} chamber` : ''}`, flag };
}

export function report(findings: PatientFindings): RevealedFinding[] {
  const out: RevealedFinding[] = [];
  for (const eye of EYES) {
    const a = findings.anterior?.[eye];
    if (!a) continue;
    const add = (label: string, r: { text: string; flag: Flag }) => out.push({ label, value: r.text, eye, flag: r.flag });
    add('Lids', lidSummary(a));
    add('Conjunctiva', conjSummary(a));
    add('Cornea', corneaSummary(a));
    add('AC cells / flare', acActivity(a));
    add('Van Herick', vanHerickSummary(a));
    add('Iris', irisSummary(a));
    add('Lens', lensSummary(a));
  }
  return out;
}

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

export function fluoReport(findings: PatientFindings): RevealedFinding[] {
  const out: RevealedFinding[] = [];
  for (const eye of EYES) {
    const a = findings.anterior?.[eye];
    if (!a) continue;
    out.push({ label: 'Fluorescein', value: STAIN_LABEL[a.fluorescein], eye, flag: STAIN_FLAG[a.fluorescein] });
    const t = tbutOf(a);
    out.push({ label: 'TBUT', value: `${Math.round(t * 10) / 10} s${t < TBUT_NORMAL ? ' (reduced)' : ''}`, eye, flag: t < TBUT_NORMAL ? 'abnormal' : 'normal' });
  }
  return out;
}

export const eyeName = (e: Eye) => (e === 'OD' ? 'right' : 'left');
export { gradeLabel, lowerFirst };
